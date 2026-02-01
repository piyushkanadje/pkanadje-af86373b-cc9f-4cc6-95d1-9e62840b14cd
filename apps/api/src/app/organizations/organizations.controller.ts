import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@task-manager/auth';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { AuditInterceptor } from '../audit/audit.interceptor';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@ApiTags('Organizations')
@Controller('organizations')
@UseInterceptors(AuditInterceptor)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an organization',
    description:
      'Create a new organization. The authenticated user becomes the OWNER.',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async create(
    @Body() dto: CreateOrganizationDto,
    @Request() req: AuthenticatedRequest
  ) {
    const organization = await this.organizationsService.create(
      dto,
      req.user.id
    );
    return {
      message: 'Organization created successfully',
      organization,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all organizations',
    description: 'Get all organizations the authenticated user is a member of.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of organizations',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.organizationsService.findAllForUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get organization by ID',
    description:
      'Get a single organization with its hierarchy. User must be a member.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found or user is not a member',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.organizationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update an organization',
    description: 'Update organization details. Only OWNER or ADMIN can update.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found or user is not a member',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @Request() req: AuthenticatedRequest
  ) {
    const organization = await this.organizationsService.update(
      id,
      dto,
      req.user.id
    );
    return {
      message: 'Organization updated successfully',
      organization,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete an organization',
    description:
      'Delete an organization. Only OWNER can delete. Cannot delete organizations with sub-organizations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
  })
  @ApiResponse({
    status: 204,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - organization has sub-organizations',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only OWNER can delete',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found or user is not a member',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    await this.organizationsService.remove(id, req.user.id);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get organization members',
    description:
      'Get all members of an organization. User must be a member to view.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of organization members',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found or user is not a member',
  })
  async getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    const members = await this.organizationsService.getMembers(id, req.user.id);
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user?.email,
      firstName: m.user?.firstName,
      lastName: m.user?.lastName,
      role: m.role,
      createdAt: m.createdAt,
    }));
  }
}
