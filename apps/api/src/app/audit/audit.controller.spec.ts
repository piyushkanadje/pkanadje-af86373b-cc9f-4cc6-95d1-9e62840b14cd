import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService, PaginatedAuditLogs } from './audit.service';
import { JwtAuthGuard, OrgRolesGuard } from '@task-manager/auth';
import { AuditLog, User } from '@task-manager/data';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: jest.Mocked<AuditService>;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockAuditLog: AuditLog = {
    id: 'audit-uuid-1',
    userId: 'user-uuid-1',
    user: mockUser as User,
    action: 'CREATE',
    resource: 'Task',
    organizationId: 'org-uuid-1',
    details: { title: 'New Task' },
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const mockAuditService = {
      create: jest.fn(),
      findByOrg: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: mockAuditService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByOrganization', () => {
    it('should return paginated audit logs', async () => {
      const paginatedResponse: PaginatedAuditLogs = {
        data: [mockAuditLog],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      auditService.findByOrg.mockResolvedValue(paginatedResponse);

      const result = await controller.findByOrganization('org-uuid-1', 1, 10);

      expect(result).toEqual(paginatedResponse);
      expect(auditService.findByOrg).toHaveBeenCalledWith('org-uuid-1', 1, 10);
    });

    it('should use default pagination values if not provided', async () => {
      const paginatedResponse: PaginatedAuditLogs = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      auditService.findByOrg.mockResolvedValue(paginatedResponse);

      await controller.findByOrganization('org-uuid-1');

      expect(auditService.findByOrg).toHaveBeenCalledWith(
        'org-uuid-1',
        undefined,
        undefined
      );
    });

    it('should handle custom page and limit values', async () => {
      const paginatedResponse: PaginatedAuditLogs = {
        data: [],
        total: 50,
        page: 3,
        limit: 20,
        totalPages: 3,
      };

      auditService.findByOrg.mockResolvedValue(paginatedResponse);

      const result = await controller.findByOrganization('org-uuid-1', 3, 20);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(auditService.findByOrg).toHaveBeenCalledWith('org-uuid-1', 3, 20);
    });

    it('should return empty data array when no logs exist', async () => {
      const emptyResponse: PaginatedAuditLogs = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      auditService.findByOrg.mockResolvedValue(emptyResponse);

      const result = await controller.findByOrganization('org-uuid-1');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
