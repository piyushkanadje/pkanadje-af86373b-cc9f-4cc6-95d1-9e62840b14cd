import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InvitationsService } from './invitations.service';
import {
  User,
  Organization,
  UserOrganization,
  Invitation,
  OrganizationRole,
  InvitationStatus,
} from '@task-manager/data';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationRepository: jest.Mocked<Repository<Invitation>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let organizationRepository: jest.Mocked<Repository<Organization>>;
  let userOrgRepository: jest.Mocked<Repository<UserOrganization>>;
  // jwtService is used by the service but not directly in tests

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
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockInvitationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    const mockUserRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockOrgRepo = {
      findOne: jest.fn(),
    };

    const mockUserOrgRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: getRepositoryToken(Invitation), useValue: mockInvitationRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepo },
        { provide: getRepositoryToken(UserOrganization), useValue: mockUserOrgRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    invitationRepository = module.get(getRepositoryToken(Invitation));
    userRepository = module.get(getRepositoryToken(User));
    organizationRepository = module.get(getRepositoryToken(Organization));
    userOrgRepository = module.get(getRepositoryToken(UserOrganization));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should create an invitation for OWNER', async () => {
      const dto = {
        email: 'new@example.com',
        role: OrganizationRole.ADMIN,
        organizationId: 'org-uuid-1',
      };

      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      userRepository.findOne.mockResolvedValue(null);
      invitationRepository.findOne.mockResolvedValue(null);
      invitationRepository.create.mockReturnValue(mockInvitation);
      invitationRepository.save.mockResolvedValue(mockInvitation);

      const result = await service.createInvitation(
        dto,
        'user-uuid-1',
        OrganizationRole.OWNER
      );

      expect(result).toEqual(mockInvitation);
      expect(invitationRepository.create).toHaveBeenCalled();
    });

    it('should create an invitation for ADMIN', async () => {
      const dto = {
        email: 'new@example.com',
        role: OrganizationRole.VIEWER,
        organizationId: 'org-uuid-1',
      };

      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      userRepository.findOne.mockResolvedValue(null);
      invitationRepository.findOne.mockResolvedValue(null);
      invitationRepository.create.mockReturnValue(mockInvitation);
      invitationRepository.save.mockResolvedValue(mockInvitation);

      const result = await service.createInvitation(
        dto,
        'user-uuid-1',
        OrganizationRole.ADMIN
      );

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if VIEWER tries to invite', async () => {
      const dto = {
        email: 'new@example.com',
        role: OrganizationRole.VIEWER,
        organizationId: 'org-uuid-1',
      };

      await expect(
        service.createInvitation(dto, 'user-uuid-1', OrganizationRole.VIEWER)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if ADMIN tries to invite as OWNER', async () => {
      const dto = {
        email: 'new@example.com',
        role: OrganizationRole.OWNER,
        organizationId: 'org-uuid-1',
      };

      await expect(
        service.createInvitation(dto, 'user-uuid-1', OrganizationRole.ADMIN)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if organization not found', async () => {
      const dto = {
        email: 'new@example.com',
        role: OrganizationRole.ADMIN,
        organizationId: 'non-existent-org',
      };

      organizationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createInvitation(dto, 'user-uuid-1', OrganizationRole.OWNER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already a member', async () => {
      const dto = {
        email: 'existing@example.com',
        role: OrganizationRole.ADMIN,
        organizationId: 'org-uuid-1',
      };

      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      userRepository.findOne.mockResolvedValue(mockUser);
      userOrgRepository.findOne.mockResolvedValue({
        id: 'membership-id',
        userId: mockUser.id,
        organizationId: 'org-uuid-1',
      });

      await expect(
        service.createInvitation(dto, 'user-uuid-1', OrganizationRole.OWNER)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending invitation exists', async () => {
      const dto = {
        email: 'pending@example.com',
        role: OrganizationRole.ADMIN,
        organizationId: 'org-uuid-1',
      };

      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      userRepository.findOne.mockResolvedValue(null);
      invitationRepository.findOne.mockResolvedValue(mockInvitation);

      await expect(
        service.createInvitation(dto, 'user-uuid-1', OrganizationRole.OWNER)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and create new user', async () => {
      const dto = {
        token: 'abc123token',
        password: 'Password123!',
        name: 'New User',
      };

      const pendingInvitation = {
        ...mockInvitation,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      invitationRepository.findOne.mockResolvedValue(pendingInvitation);
      userRepository.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$hashedpassword' as never);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      userOrgRepository.create.mockReturnValue({} as any);
      userOrgRepository.save.mockResolvedValue({} as any);
      invitationRepository.save.mockResolvedValue({
        ...pendingInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      const result = await service.acceptInvitation(dto);

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException if invitation not found', async () => {
      const dto = {
        token: 'invalid-token',
        password: 'Password123!',
      };

      invitationRepository.findOne.mockResolvedValue(null);

      await expect(service.acceptInvitation(dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if invitation already accepted', async () => {
      const dto = {
        token: 'abc123token',
        password: 'Password123!',
      };

      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      await expect(service.acceptInvitation(dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if invitation expired', async () => {
      const dto = {
        token: 'abc123token',
        password: 'Password123!',
      };

      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });
      invitationRepository.save.mockResolvedValue({} as any);

      await expect(service.acceptInvitation(dto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation details', async () => {
      invitationRepository.findOne.mockResolvedValue(mockInvitation);

      const result = await service.getInvitationByToken('abc123token');

      expect(result).toBeDefined();
      expect(result.email).toBe(mockInvitation.email);
    });

    it('should throw NotFoundException if invitation not found', async () => {
      invitationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getInvitationByToken('invalid-token')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrganizationInvitations', () => {
    it('should return all invitations for an organization', async () => {
      const invitations = [
        mockInvitation,
        { ...mockInvitation, id: 'invitation-uuid-2', email: 'another@example.com' },
      ];

      invitationRepository.find.mockResolvedValue(invitations);

      const result = await service.getOrganizationInvitations('org-uuid-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke a pending invitation', async () => {
      const pendingInvitation = {
        ...mockInvitation,
        status: InvitationStatus.PENDING,
      };

      invitationRepository.findOne.mockResolvedValue(pendingInvitation);
      invitationRepository.save.mockResolvedValue({
        ...pendingInvitation,
        status: InvitationStatus.REVOKED,
      });

      await expect(
        service.revokeInvitation('invitation-uuid-1', 'user-uuid-1')
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if invitation not found', async () => {
      invitationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.revokeInvitation('invalid-id', 'user-uuid-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation is not pending', async () => {
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      await expect(
        service.revokeInvitation('invitation-uuid-1', 'user-uuid-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendInvitation', () => {
    it('should resend an expired invitation', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        status: InvitationStatus.EXPIRED,
      };

      invitationRepository.findOne.mockResolvedValue(expiredInvitation);
      invitationRepository.save.mockResolvedValue({
        ...expiredInvitation,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const result = await service.resendInvitation('invitation-uuid-1', 'user-uuid-1');

      expect(result.status).toBe(InvitationStatus.PENDING);
    });
  });
});
