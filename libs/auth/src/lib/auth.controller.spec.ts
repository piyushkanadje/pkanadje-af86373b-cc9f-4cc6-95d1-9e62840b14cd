import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrgRolesGuard } from './guards/org-roles.guard';
import { OrganizationRole } from '@task-manager/data';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoginResponse = {
    access_token: 'mock-jwt-token',
    user: { id: 'user-uuid-1', email: 'test@example.com' },
  };

  const mockOrganizations = [
    {
      organizationId: 'org-uuid-1',
      role: OrganizationRole.OWNER,
      organization: { id: 'org-uuid-1', name: 'Test Org' },
    },
  ];

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      findUserById: jest.fn(),
      getUserOrganizations: jest.fn(),
      changePassword: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      getUserOrganizationRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and user', async () => {
      const mockRequest = {
        user: { id: 'user-uuid-1', email: 'test@example.com' },
      } as any;

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(mockRequest);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(mockRequest.user);
    });
  });

  describe('register', () => {
    it('should create user and return access token', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      authService.register.mockResolvedValue({
        access_token: 'new-jwt-token',
        user: { id: 'new-user-id', email: 'new@example.com' },
      });

      const result = await controller.register(registerDto);

      expect(result.access_token).toBeDefined();
      expect(result.user.email).toBe('new@example.com');
      expect(authService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.firstName,
        registerDto.lastName
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile with organization memberships', async () => {
      const mockRequest = {
        user: { id: 'user-uuid-1', email: 'test@example.com' },
      } as any;

      authService.findUserById.mockResolvedValue(mockUser as any);
      authService.getUserOrganizations.mockResolvedValue(mockOrganizations as any);

      const result = await controller.getProfile(mockRequest);

      expect(result.email).toBe('test@example.com');
      expect(result.organizationMemberships).toHaveLength(1);
      expect(result.organizationMemberships[0].role).toBe(OrganizationRole.OWNER);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockRequest = {
        user: { id: 'user-uuid-1', email: 'test@example.com' },
      } as any;
      const changePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      authService.changePassword.mockResolvedValue({
        message: 'Password changed successfully',
      } as any);

      const result = await controller.changePassword(
        mockRequest,
        changePasswordDto
      );

      expect(result.message).toBe('Password changed successfully');
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockRequest.user.id,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword
      );
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset', async () => {
      const forgotPasswordDto = { email: 'test@example.com' };

      authService.forgotPassword.mockResolvedValue({
        message: 'Password reset email sent',
      } as any);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result.message).toBe('Password reset email sent');
      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const resetPasswordDto = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      };

      authService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      } as any);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result.message).toBe('Password reset successfully');
      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword
      );
    });
  });

  describe('getOrgAdminTest', () => {
    it('should return success for ADMIN role access', async () => {
      const mockRequest = {
        user: { id: 'user-uuid-1', email: 'test@example.com' },
        organizationId: 'org-uuid-1',
        userOrgRole: OrganizationRole.ADMIN,
      } as any;

      const result = await controller.getOrgAdminTest('org-uuid-1', mockRequest);

      expect(result.message).toBe('You have ADMIN access to this organization');
      expect(result.organizationId).toBe('org-uuid-1');
      expect(result.yourRole).toBe(OrganizationRole.ADMIN);
    });
  });
});
