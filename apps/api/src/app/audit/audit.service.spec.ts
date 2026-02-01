import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService, PaginatedAuditLogs } from './audit.service';
import { AuditLog, User } from '@task-manager/data';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;

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
    const mockAuditLogRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const dto = {
        userId: 'user-uuid-1',
        action: 'CREATE',
        resource: 'Task',
        organizationId: 'org-uuid-1',
        details: { title: 'New Task' },
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.create(dto);

      expect(result).toEqual(mockAuditLog);
      expect(auditLogRepository.create).toHaveBeenCalledWith({
        userId: dto.userId,
        action: dto.action,
        resource: dto.resource,
        organizationId: dto.organizationId,
        details: dto.details,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should create audit log without optional fields', async () => {
      const dto = {
        userId: 'user-uuid-1',
        action: 'LOGIN',
        resource: 'Auth',
      };

      const auditLogWithoutOptional = {
        ...mockAuditLog,
        organizationId: null,
        details: null,
      };

      auditLogRepository.create.mockReturnValue(auditLogWithoutOptional);
      auditLogRepository.save.mockResolvedValue(auditLogWithoutOptional);

      const result = await service.create(dto);

      expect(result.organizationId).toBeNull();
      expect(result.details).toBeNull();
    });
  });

  describe('findByOrg', () => {
    it('should return paginated audit logs for an organization', async () => {
      const auditLogs = [
        mockAuditLog,
        { ...mockAuditLog, id: 'audit-uuid-2', action: 'UPDATE' },
        { ...mockAuditLog, id: 'audit-uuid-3', action: 'DELETE' },
      ];

      auditLogRepository.findAndCount.mockResolvedValue([auditLogs, 3]);

      const result = await service.findByOrg('org-uuid-1', 1, 10);

      expect(result).toEqual<PaginatedAuditLogs>({
        data: auditLogs,
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: 'org-uuid-1' },
        order: { timestamp: 'DESC' },
        relations: ['user'],
        skip: 0,
        take: 10,
      });
    });

    it('should return correct pagination for multiple pages', async () => {
      const auditLogs = Array.from({ length: 10 }, (_, i) => ({
        ...mockAuditLog,
        id: `audit-uuid-${i}`,
      }));

      auditLogRepository.findAndCount.mockResolvedValue([auditLogs, 25]);

      const result = await service.findByOrg('org-uuid-1', 2, 10);

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should use default pagination values', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findByOrg('org-uuid-1');

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });

    it('should return empty array if no logs found', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findByOrg('org-uuid-1');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly for edge cases', async () => {
      // 15 total items with limit of 10 = 2 pages
      auditLogRepository.findAndCount.mockResolvedValue([[], 15]);

      const result = await service.findByOrg('org-uuid-1', 1, 10);

      expect(result.totalPages).toBe(2);
    });

    it('should handle page 3 with correct skip value', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[], 30]);

      await service.findByOrg('org-uuid-1', 3, 10);

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10 = 20
          take: 10,
        })
      );
    });
  });
});
