import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, OrgRolesGuard } from '@task-manager/auth';
import {
  OrganizationRole,
  Invitation,
  InvitationStatus,
  Organization,
  User,
} from '@task-manager/data';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let invitationsService: jest.Mocked<InvitationsService>;

  const mockOrganization: Organization = {
    id: 'org-uuid-1',
    name: 'Test Organization',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    parent: null,
    children: [],
    members: [],
    tasks: [],
  };

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizations: [],
    createdTasks: [],
    assignedTasks: [],
  };

  const mockInvitation: Invitation = {
    id: 'invitation-uuid-1',
    email: 'invited@example.com',
    token: 'abc123token',
    role: OrganizationRole.ADMIN,
    organizationId: 'org-uuid-1',
    organization: mockOrganization,
    invitedById: 'user-uuid-1',
    invitedBy: mockUser,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockInvitationsService = {
      createInvitation: jest.fn(),
      acceptInvitation: jest.fn(),
      getInvitationByToken: jest.fn(),
      getOrganizationInvitations: jest.fn(),
      revokeInvitation: jest.fn(),
      resendInvitation: jest.fn(),
    };

    const mockAuditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        { provide: InvitationsService, useValue: mockInvitationsService },
        { provide: AuditService, useValue: mockAuditService },
        AuditInterceptor,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InvitationsController>(InvitationsController);
    invitationsService = module.get(InvitationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should create an invitation', async () => {
      const dto = {
        email: 'new@example.com',
        role: OrganizationRole.ADMIN,
        organizationId: 'org-uuid-1',
      };
      const mockRequest = {
        user: { id: 'user-uuid-1' },
        userOrgRole: OrganizationRole.OWNER,
      };

      invitationsService.createInvitation.mockResolvedValue(mockInvitation);

      const result = await controller.createInvitation(dto, mockRequest);

      expect(result).toEqual(mockInvitation);
      expect(invitationsService.createInvitation).toHaveBeenCalledWith(
        dto,
        mockRequest.user.id,
        mockRequest.userOrgRole
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept an invitation', async () => {
      const dto = {
        token: 'abc123token',
        password: 'Password123!',
        name: 'New User',
      };
      const expectedResponse = {
        access_token: 'mock-jwt-token',
        user: { id: 'user-uuid-1', email: 'invited@example.com' },
        organization: { id: 'org-uuid-1', name: 'Test Organization' },
        role: OrganizationRole.ADMIN,
      };

      invitationsService.acceptInvitation.mockResolvedValue(expectedResponse);

      const result = await controller.acceptInvitation(dto);

      expect(result).toEqual(expectedResponse);
      expect(invitationsService.acceptInvitation).toHaveBeenCalledWith(dto);
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation details by token', async () => {
      const tokenResponse = {
        email: mockInvitation.email,
        role: mockInvitation.role,
        organization: { id: mockOrganization.id, name: mockOrganization.name },
        status: InvitationStatus.PENDING,
        isExpired: false,
        expiresAt: mockInvitation.expiresAt,
        token: mockInvitation.token,
      };

      invitationsService.getInvitationByToken.mockResolvedValue(tokenResponse);

      const result = await controller.getInvitationByToken('abc123token');

      expect(result).toEqual(tokenResponse);
      expect(invitationsService.getInvitationByToken).toHaveBeenCalledWith(
        'abc123token'
      );
    });
  });

  describe('getOrganizationInvitations', () => {
    it('should return all invitations for an organization', async () => {
      const invitations = [
        mockInvitation,
        { ...mockInvitation, id: 'invitation-uuid-2', email: 'another@example.com' },
      ];

      invitationsService.getOrganizationInvitations.mockResolvedValue(
        invitations
      );

      const result = await controller.getOrganizationInvitations('org-uuid-1');

      expect(result).toHaveLength(2);
      expect(invitationsService.getOrganizationInvitations).toHaveBeenCalledWith(
        'org-uuid-1'
      );
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke an invitation', async () => {
      const mockRequest = { user: { id: 'user-uuid-1' } };
      invitationsService.revokeInvitation.mockResolvedValue(undefined);

      const result = await controller.revokeInvitation(
        'invitation-uuid-1',
        mockRequest
      );

      expect(result).toEqual({ message: 'Invitation revoked successfully' });
      expect(invitationsService.revokeInvitation).toHaveBeenCalledWith(
        'invitation-uuid-1',
        mockRequest.user.id
      );
    });
  });

  describe('resendInvitation', () => {
    it('should resend an invitation', async () => {
      const mockRequest = { user: { id: 'user-uuid-1' } };
      const updatedInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      invitationsService.resendInvitation.mockResolvedValue(updatedInvitation);

      const result = await controller.resendInvitation(
        'invitation-uuid-1',
        mockRequest
      );

      expect(result).toEqual(updatedInvitation);
      expect(invitationsService.resendInvitation).toHaveBeenCalledWith(
        'invitation-uuid-1',
        mockRequest.user.id
      );
    });
  });
});
