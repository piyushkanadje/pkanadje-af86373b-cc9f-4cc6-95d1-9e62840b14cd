import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrganizationsService } from './organizations.service';
import {
  Organization,
  UserOrganization,
  OrganizationRole,
} from '@task-manager/data';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<Repository<Organization>>;
  let userOrgRepository: jest.Mocked<Repository<UserOrganization>>;

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

  const mockUserOrg: UserOrganization = {
    id: 'user-org-uuid-1',
    userId: 'user-uuid-1',
    organizationId: 'org-uuid-1',
    role: OrganizationRole.OWNER,
    joinedAt: new Date(),
    user: null as any,
    organization: mockOrganization,
  };

  beforeEach(async () => {
    const mockOrgRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    const mockUserOrgRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrgRepo,
        },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: mockUserOrgRepo,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationRepository = module.get(getRepositoryToken(Organization));
    userOrgRepository = module.get(getRepositoryToken(UserOrganization));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an organization and make the creator OWNER', async () => {
      const dto = { name: 'New Organization' };
      const userId = 'user-uuid-1';

      organizationRepository.create.mockReturnValue(mockOrganization);
      organizationRepository.save.mockResolvedValue(mockOrganization);
      userOrgRepository.create.mockReturnValue(mockUserOrg);
      userOrgRepository.save.mockResolvedValue(mockUserOrg);

      const result = await service.create(dto, userId);

      expect(result).toEqual(mockOrganization);
      expect(organizationRepository.create).toHaveBeenCalledWith({
        name: 'New Organization',
        parentId: null,
      });
      expect(userOrgRepository.create).toHaveBeenCalledWith({
        userId,
        organizationId: mockOrganization.id,
        role: OrganizationRole.OWNER,
      });
    });

    it('should create a sub-organization if parentId is provided', async () => {
      const parentOrg = { ...mockOrganization, id: 'parent-org-uuid' };
      const dto = { name: 'Sub Organization', parentId: 'parent-org-uuid' };
      const userId = 'user-uuid-1';

      organizationRepository.findOne.mockResolvedValue(parentOrg);
      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        role: OrganizationRole.OWNER,
      });
      organizationRepository.create.mockReturnValue({
        ...mockOrganization,
        parentId: 'parent-org-uuid',
      });
      organizationRepository.save.mockResolvedValue({
        ...mockOrganization,
        parentId: 'parent-org-uuid',
      });
      userOrgRepository.create.mockReturnValue(mockUserOrg);
      userOrgRepository.save.mockResolvedValue(mockUserOrg);

      const result = await service.create(dto, userId);

      expect(result.parentId).toBe('parent-org-uuid');
    });

    it('should throw NotFoundException if parent organization not found', async () => {
      const dto = { name: 'Sub Organization', parentId: 'non-existent-parent' };
      const userId = 'user-uuid-1';

      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto, userId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if user is not a member of parent org', async () => {
      const parentOrg = { ...mockOrganization, id: 'parent-org-uuid' };
      const dto = { name: 'Sub Organization', parentId: 'parent-org-uuid' };
      const userId = 'user-uuid-1';

      organizationRepository.findOne.mockResolvedValue(parentOrg);
      userOrgRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto, userId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if user is VIEWER in parent org', async () => {
      const parentOrg = { ...mockOrganization, id: 'parent-org-uuid' };
      const dto = { name: 'Sub Organization', parentId: 'parent-org-uuid' };
      const userId = 'user-uuid-1';

      organizationRepository.findOne.mockResolvedValue(parentOrg);
      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        role: OrganizationRole.VIEWER,
      });

      await expect(service.create(dto, userId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('findAllForUser', () => {
    it('should return all organizations for a user', async () => {
      const memberships = [
        { ...mockUserOrg, organization: mockOrganization },
        {
          ...mockUserOrg,
          id: 'user-org-uuid-2',
          organization: { ...mockOrganization, id: 'org-uuid-2', name: 'Org 2' },
        },
      ];

      userOrgRepository.find.mockResolvedValue(memberships);

      const result = await service.findAllForUser('user-uuid-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Organization');
      expect(result[1].name).toBe('Org 2');
    });

    it('should return empty array if user has no organizations', async () => {
      userOrgRepository.find.mockResolvedValue([]);

      const result = await service.findAllForUser('user-uuid-1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return organization if user is a member', async () => {
      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        organization: mockOrganization,
      });

      const result = await service.findOne('org-uuid-1', 'user-uuid-1');

      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException if user is not a member', async () => {
      userOrgRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('org-uuid-1', 'user-uuid-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update organization name for OWNER', async () => {
      const dto = { name: 'Updated Name' };
      const updatedOrg = { ...mockOrganization, name: 'Updated Name' };

      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        organization: mockOrganization,
        role: OrganizationRole.OWNER,
      });
      organizationRepository.save.mockResolvedValue(updatedOrg);

      const result = await service.update('org-uuid-1', dto, 'user-uuid-1');

      expect(result.name).toBe('Updated Name');
    });

    it('should update organization name for ADMIN', async () => {
      const dto = { name: 'Updated Name' };
      const updatedOrg = { ...mockOrganization, name: 'Updated Name' };

      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        organization: mockOrganization,
        role: OrganizationRole.ADMIN,
      });
      organizationRepository.save.mockResolvedValue(updatedOrg);

      const result = await service.update('org-uuid-1', dto, 'user-uuid-1');

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if user is not a member', async () => {
      userOrgRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('org-uuid-1', { name: 'New Name' }, 'user-uuid-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is VIEWER', async () => {
      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        organization: mockOrganization,
        role: OrganizationRole.VIEWER,
      });

      await expect(
        service.update('org-uuid-1', { name: 'New Name' }, 'user-uuid-1')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete organization for OWNER', async () => {
      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        organization: { ...mockOrganization, children: [] },
        role: OrganizationRole.OWNER,
      });
      organizationRepository.remove.mockResolvedValue(mockOrganization);

      await expect(
        service.delete('org-uuid-1', 'user-uuid-1')
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if user is not a member', async () => {
      userOrgRepository.findOne.mockResolvedValue(null);

      await expect(
        service.delete('org-uuid-1', 'user-uuid-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not OWNER', async () => {
      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        organization: mockOrganization,
        role: OrganizationRole.ADMIN,
      });

      await expect(
        service.delete('org-uuid-1', 'user-uuid-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if organization has children', async () => {
      userOrgRepository.findOne.mockResolvedValue({
        ...mockUserOrg,
        organization: {
          ...mockOrganization,
          children: [{ id: 'child-org-uuid' }],
        },
        role: OrganizationRole.OWNER,
      });

      await expect(
        service.delete('org-uuid-1', 'user-uuid-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMembers', () => {
    it('should return all members of an organization', async () => {
      const members = [
        {
          ...mockUserOrg,
          user: { id: 'user-1', email: 'user1@test.com', firstName: 'User', lastName: 'One' },
        },
        {
          ...mockUserOrg,
          id: 'user-org-2',
          userId: 'user-2',
          role: OrganizationRole.ADMIN,
          user: { id: 'user-2', email: 'user2@test.com', firstName: 'User', lastName: 'Two' },
        },
      ];

      userOrgRepository.find.mockResolvedValue(members);

      const result = await service.getMembers('org-uuid-1');

      expect(result).toHaveLength(2);
    });
  });
});
