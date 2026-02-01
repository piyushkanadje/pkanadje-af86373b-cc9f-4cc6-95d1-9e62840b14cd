import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService, LoginResponse } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrgRolesGuard, OrgRoles } from './guards/org-roles.guard';
import { OrganizationRole } from '@task-manager/data';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  organizationId?: string;
  userOrgRole?: OrganizationRole;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint - validates credentials and returns JWT
   * POST /auth/login
   */
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: AuthenticatedRequest): Promise<LoginResponse> {
    return this.authService.login(req.user);
  }

  /**
   * Register endpoint - creates user and returns JWT
   * POST /auth/register
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponse> {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName
    );
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.authService.findUserById(req.user.id);
    const organizations = await this.authService.getUserOrganizations(
      req.user.id
    );
    return {
      ...user,
      organizationMemberships: organizations.map((uo) => ({
        organizationId: uo.organizationId,
        organizationName: uo.organization?.name,
        role: uo.role,
      })),
    };
  }

  /**
   * Change password for authenticated user
   * POST /auth/change-password
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }

  /**
   * Request password reset - sends email with reset link
   * POST /auth/forgot-password
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const token = await this.authService.generatePasswordResetToken(
      forgotPasswordDto.email
    );

    // Always return success to prevent email enumeration
    // In production, send email here if token exists
    if (token) {
      // TODO: Send email with reset link
      // For now, we'll log it (remove in production)
      console.log(`Password reset token for ${forgotPasswordDto.email}: ${token}`);
    }

    return {
      message:
        'If an account exists with this email, you will receive a password reset link.',
    };
  }

  /**
   * Reset password using token
   * POST /auth/reset-password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword
    );
  }

  /**
   * Validate reset token (check if it's valid before showing reset form)
   * GET /auth/validate-reset-token/:token
   */
  @Get('validate-reset-token/:token')
  async validateResetToken(@Param('token') token: string) {
    return this.authService.validatePasswordResetToken(token);
  }

  /**
   * Protected test route - requires ADMIN role (OWNER also allowed due to inheritance)
   * GET /auth/org/:organizationId/admin-test
   */
  @Get('org/:organizationId/admin-test')
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.ADMIN)
  async adminTest(@Request() req: AuthenticatedRequest) {
    return {
      message: 'Access granted!',
      userId: req.user.id,
      organizationId: req.organizationId,
      userRole: req.userOrgRole,
      requiredRole: 'ADMIN (or higher)',
    };
  }

  /**
   * Protected test route - requires OWNER role only
   * GET /auth/org/:organizationId/owner-test
   */
  @Get('org/:organizationId/owner-test')
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.OWNER)
  async ownerTest(@Request() req: AuthenticatedRequest) {
    return {
      message: 'Owner access granted!',
      userId: req.user.id,
      organizationId: req.organizationId,
      userRole: req.userOrgRole,
    };
  }
}
