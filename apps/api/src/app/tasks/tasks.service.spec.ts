import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TasksService, CreateTaskDto, UpdateTaskDto } from './tasks.service';
import { Task, TaskStatus, TaskPriority, Organization } from '@task-manager/data';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let organizationRepository: jest.Mocked<Repository<Organization>>;

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

  beforeEach(async () => {
    const mockTaskRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      softRemove: jest.fn(),
      restore: jest.fn(),
    };

    const mockOrgRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrgRepo,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    organizationRepository = module.get(getRepositoryToken(Organization));
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        organizationId: 'org-uuid-1',
      };

      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      taskRepository.create.mockReturnValue(mockTask);
      taskRepository.save.mockResolvedValue(mockTask);

      const result = await service.create(createDto, 'user-uuid-1');

      expect(result).toEqual(mockTask);
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.organizationId },
      });
      expect(taskRepository.create).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        organizationId: 'non-existent-org',
      };

      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-uuid-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should assign the creating user as assignee by default', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        organizationId: 'org-uuid-1',
      };
      const createdById = 'user-uuid-creator';

      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      taskRepository.create.mockReturnValue(mockTask);
      taskRepository.save.mockResolvedValue(mockTask);

      await service.create(createDto, createdById);

      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: createdById,
        })
      );
    });
  });

  describe('findById', () => {
    it('should return a task when found', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.findById('task-uuid-1');

      expect(result).toEqual(mockTask);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
      });
    });

    it('should return null when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByOrganization', () => {
    it('should return tasks for organization', async () => {
      const tasks = [mockTask];
      taskRepository.find.mockResolvedValue(tasks);

      const result = await service.findByOrganization('org-uuid-1');

      expect(result).toEqual(tasks);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-uuid-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('update', () => {
    it('should update a task successfully', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Title',
        status: TaskStatus.IN_PROGRESS,
      };

      const updatedTask = { ...mockTask, ...updateDto };
      taskRepository.findOne.mockResolvedValue(mockTask);
      taskRepository.save.mockResolvedValue(updatedTask);

      const result = await service.update('task-uuid-1', updateDto);

      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should only update status when only status is provided', async () => {
      const updateDto: UpdateTaskDto = {
        status: TaskStatus.DONE,
      };

      taskRepository.findOne.mockResolvedValue({ ...mockTask });
      taskRepository.save.mockImplementation((task) =>
        Promise.resolve(task as Task)
      );

      const result = await service.update('task-uuid-1', updateDto);

      expect(result.status).toBe(TaskStatus.DONE);
      expect(result.title).toBe(mockTask.title); // unchanged
    });
  });

  describe('delete', () => {
    it('should delete a task successfully', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask);
      taskRepository.remove.mockResolvedValue(mockTask);

      await service.delete('task-uuid-1');

      expect(taskRepository.remove).toHaveBeenCalledWith(mockTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
