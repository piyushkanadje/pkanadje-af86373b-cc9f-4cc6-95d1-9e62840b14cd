import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, OrgRoles, OrgRolesGuard } from '@task-manager/auth';
import { OrganizationRole } from '@task-manager/data';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('Invitations')
@Controller('invitations')
@UseInterceptors(AuditInterceptor)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an invitation',
    description: 'Invite a user to join an organization. Only OWNER and ADMIN can invite users.',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user already member or invitation pending',
  })
  async createInvitation(
    @Body() dto: CreateInvitationDto,
    @Request() req: { user: { id: string }; userOrgRole: OrganizationRole }
  ) {
    return this.invitationsService.createInvitation(
      dto,
      req.user.id,
      req.userOrgRole
    );
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an invitation',
    description:
      'Accept an invitation and register/join organization. Returns JWT token for automatic login.',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired invitation',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(dto);
  }

  @Get('token/:token')
  @ApiOperation({
    summary: 'Get invitation details by token',
    description:
      'Public endpoint to get invitation details for displaying on the invitation acceptance page.',
  })
  @ApiParam({
    name: 'token',
    description: 'Invitation token',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation details',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async getInvitationByToken(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }

  @Get('organization/:organizationId')
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all invitations for an organization',
    description: 'Only OWNER and ADMIN can view organization invitations.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invitations',
  })
  async getOrganizationInvitations(
    @Param('organizationId') organizationId: string
  ) {
    return this.invitationsService.getOrganizationInvitations(organizationId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Revoke a pending invitation',
    description: 'Only OWNER and ADMIN can revoke invitations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation revoked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Can only revoke pending invitations',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async revokeInvitation(
    @Param('id') id: string,
    @Request() req: { user: { id: string }; userOrgRole: OrganizationRole }
  ) {
    return this.invitationsService.revokeInvitation(
      id,
      req.user.id,
      req.userOrgRole
    );
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Resend an invitation',
    description:
      'Resend an invitation with a new token and extended expiration. Only OWNER and ADMIN can resend invitations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot resend accepted invitation',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async resendInvitation(
    @Param('id') id: string,
    @Request() req: { user: { id: string }; userOrgRole: OrganizationRole }
  ) {
    return this.invitationsService.resendInvitation(
      id,
      req.user.id,
      req.userOrgRole
    );
  }
}
