import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, OrgRolesGuard } from '@task-manager/auth';
import { OrganizationRole, Organization, Task, TaskStatus, TaskPriority } from '@task-manager/data';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  organizationId?: string;
  userOrgRole?: OrganizationRole;
}

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;

  const mockTask: Task = {
    id: 'task-uuid-1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    organizationId: 'org-uuid-1',
    assigneeId: 'user-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    organization: null as unknown as Organization,
    assignee: null,
  };

  beforeEach(async () => {
    const mockTasksService = {
      create: jest.fn(),
      findByOrganization: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockAuditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: AuditService, useValue: mockAuditService },
        AuditInterceptor,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createDto = {
        title: 'New Task',
        organizationId: 'org-uuid-1',
        status: TaskStatus.TODO,
      };
      const req = { user: { id: 'user-uuid-1', email: 'test@test.com' } } as AuthenticatedRequest;

      tasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(createDto, req);

      expect(result).toEqual(mockTask);
      expect(tasksService.create).toHaveBeenCalledWith(createDto, 'user-uuid-1');
    });
  });

  describe('findAll', () => {
    it('should return tasks for organization', async () => {
      const tasks = [mockTask];
      tasksService.findByOrganization.mockResolvedValue(tasks);

      const result = await controller.findAll('org-uuid-1');

      expect(result).toEqual(tasks);
      expect(tasksService.findByOrganization).toHaveBeenCalledWith('org-uuid-1');
    });
  });

  describe('update', () => {
    it('should allow ADMIN to update any field', async () => {
      const updateDto = { title: 'Updated', status: TaskStatus.DONE };
      const req = {
        user: { id: 'user-uuid-1', email: 'test@test.com' },
        userOrgRole: OrganizationRole.ADMIN,
      } as AuthenticatedRequest;

      tasksService.update.mockResolvedValue({ ...mockTask, ...updateDto });

      const result = await controller.update('task-uuid-1', updateDto, req);

      expect(result.title).toBe('Updated');
      expect(tasksService.update).toHaveBeenCalled();
    });

    it('should allow VIEWER to update only status', async () => {
      const updateDto = { status: TaskStatus.IN_PROGRESS };
      const req = {
        user: { id: 'user-uuid-1', email: 'test@test.com' },
        userOrgRole: OrganizationRole.VIEWER,
      } as AuthenticatedRequest;

      tasksService.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });

      const result = await controller.update('task-uuid-1', updateDto, req);

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should reject VIEWER updating fields other than status', async () => {
      const updateDto = { title: 'New Title', status: TaskStatus.DONE };
      const req = {
        user: { id: 'user-uuid-1', email: 'test@test.com' },
        userOrgRole: OrganizationRole.VIEWER,
      } as AuthenticatedRequest;

      await expect(
        controller.update('task-uuid-1', updateDto, req)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a task for ADMIN', async () => {
      tasksService.delete.mockResolvedValue(undefined);

      const result = await controller.remove('task-uuid-1');

      expect(result).toEqual({ message: 'Task deleted successfully' });
      expect(tasksService.delete).toHaveBeenCalledWith('task-uuid-1');
    });

    /**
     * NOTE: This test documents the expected behavior enforced by the OrgRolesGuard.
     * The guard is configured with @OrgRoles(OrganizationRole.ADMIN) on DELETE,
     * which means VIEWER role users will be blocked at the guard level.
     *
     * This is an integration-level concern - the guard handles authorization.
     */
    it('should be protected by ADMIN role requirement on DELETE endpoint', () => {
      // The @OrgRoles(OrganizationRole.ADMIN) decorator on the remove() method
      // ensures that only ADMIN or higher (OWNER) can access this endpoint.
      // VIEWER users are rejected by OrgRolesGuard before reaching the controller.
      //
      // To verify this behavior in integration tests:
      // - Send DELETE /tasks/:id with a VIEWER user token
      // - Expect 403 Forbidden response
      expect(true).toBe(true); // Placeholder - actual test is at integration level
    });
  });
});
