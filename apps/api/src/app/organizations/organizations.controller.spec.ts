import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '@task-manager/auth';
import { Organization, OrganizationRole } from '@task-manager/data';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let organizationsService: jest.Mocked<OrganizationsService>;

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

  const mockRequest: AuthenticatedRequest = {
    user: { id: 'user-uuid-1', email: 'test@test.com' },
  };

  beforeEach(async () => {
    const mockOrganizationsService = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getMembers: jest.fn(),
    };

    const mockAuditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: AuditService, useValue: mockAuditService },
        AuditInterceptor,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    organizationsService = module.get(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an organization', async () => {
      const dto = { name: 'New Organization' };
      organizationsService.create.mockResolvedValue(mockOrganization);

      const result = await controller.create(dto, mockRequest);

      expect(result).toEqual({
        message: 'Organization created successfully',
        organization: mockOrganization,
      });
      expect(organizationsService.create).toHaveBeenCalledWith(
        dto,
        mockRequest.user.id
      );
    });

    it('should create a sub-organization with parentId', async () => {
      const dto = { name: 'Sub Organization', parentId: 'parent-org-uuid' };
      const subOrg = { ...mockOrganization, parentId: 'parent-org-uuid' };
      organizationsService.create.mockResolvedValue(subOrg);

      const result = await controller.create(dto, mockRequest);

      expect(result.organization.parentId).toBe('parent-org-uuid');
    });
  });

  describe('findAll', () => {
    it('should return all organizations for the user', async () => {
      const organizations = [
        mockOrganization,
        { ...mockOrganization, id: 'org-uuid-2', name: 'Org 2' },
      ];
      organizationsService.findAllForUser.mockResolvedValue(organizations);

      const result = await controller.findAll(mockRequest);

      expect(result).toHaveLength(2);
      expect(organizationsService.findAllForUser).toHaveBeenCalledWith(
        mockRequest.user.id
      );
    });

    it('should return empty array if user has no organizations', async () => {
      organizationsService.findAllForUser.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single organization', async () => {
      organizationsService.findOne.mockResolvedValue(mockOrganization);

      const result = await controller.findOne('org-uuid-1', mockRequest);

      expect(result).toEqual(mockOrganization);
      expect(organizationsService.findOne).toHaveBeenCalledWith(
        'org-uuid-1',
        mockRequest.user.id
      );
    });
  });

  describe('update', () => {
    it('should update an organization', async () => {
      const dto = { name: 'Updated Name' };
      const updatedOrg = { ...mockOrganization, name: 'Updated Name' };
      organizationsService.update.mockResolvedValue(updatedOrg);

      const result = await controller.update('org-uuid-1', dto, mockRequest);

      expect(result).toEqual({
        message: 'Organization updated successfully',
        organization: updatedOrg,
      });
      expect(organizationsService.update).toHaveBeenCalledWith(
        'org-uuid-1',
        dto,
        mockRequest.user.id
      );
    });
  });

  describe('delete', () => {
    it('should delete an organization', async () => {
      organizationsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('org-uuid-1', mockRequest);

      expect(result).toEqual({
        message: 'Organization deleted successfully',
      });
      expect(organizationsService.delete).toHaveBeenCalledWith(
        'org-uuid-1',
        mockRequest.user.id
      );
    });
  });

  describe('getMembers', () => {
    it('should return all members of an organization', async () => {
      const members = [
        {
          id: 'member-1',
          userId: 'user-1',
          role: OrganizationRole.OWNER,
          user: { id: 'user-1', email: 'owner@test.com' },
        },
        {
          id: 'member-2',
          userId: 'user-2',
          role: OrganizationRole.ADMIN,
          user: { id: 'user-2', email: 'admin@test.com' },
        },
      ];
      organizationsService.getMembers.mockResolvedValue(members);

      const result = await controller.getMembers('org-uuid-1', mockRequest);

      expect(result).toHaveLength(2);
      expect(organizationsService.getMembers).toHaveBeenCalledWith('org-uuid-1');
    });
  });
});
