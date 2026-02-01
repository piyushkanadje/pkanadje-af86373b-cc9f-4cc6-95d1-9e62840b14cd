import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Task, TaskStatus, TaskPriority, TaskCategory, Organization } from '@task-manager/data';

export interface CreateTaskDto {
  title: string;
  description?: string;
  organizationId: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>
  ) {}

  async create(dto: CreateTaskDto, createdById: string): Promise<Task> {
    const organization = await this.organizationRepository.findOne({
      where: { id: dto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${dto.organizationId} not found`
      );
    }

    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description || null,
      organizationId: dto.organizationId,
      assigneeId: dto.assigneeId || createdById,
      status: dto.status || TaskStatus.TODO,
      priority: dto.priority || TaskPriority.MEDIUM,
      category: dto.category || TaskCategory.GENERAL,
    });

    return this.taskRepository.save(task);
  }

  async findById(id: string): Promise<Task | null> {
    return this.taskRepository.findOne({
      where: { id },
    });
  }

  async findByOrganization(organizationId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findById(id);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (dto.title !== undefined) {
      task.title = dto.title;
    }
    if (dto.description !== undefined) {
      task.description = dto.description;
    }
    if (dto.assigneeId !== undefined) {
      task.assigneeId = dto.assigneeId;
    }
    if (dto.status !== undefined) {
      task.status = dto.status;
    }
    if (dto.priority !== undefined) {
      task.priority = dto.priority;
    }
    if (dto.category !== undefined) {
      task.category = dto.category;
    }

    return this.taskRepository.save(task);
  }

  async delete(id: string): Promise<void> {
    const task = await this.findById(id);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await this.taskRepository.softRemove(task);
  }

  /**
   * Find a task by ID including soft-deleted tasks.
   * Used by guards when resolving tasks for restore operations.
   */
  async findByIdWithDeleted(id: string): Promise<Task | null> {
    return this.taskRepository.findOne({
      where: { id },
      withDeleted: true,
    });
  }

  /**
   * Restore a soft-deleted task by ID.
   * Only accessible by Admin role.
   */
  async restoreTask(id: string): Promise<Task> {
    const task = await this.findByIdWithDeleted(id);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (!task.deletedAt) {
      throw new NotFoundException(`Task with ID ${id} is not deleted`);
    }

    await this.taskRepository.restore(id);
    return this.findById(id) as Promise<Task>;
  }

  /**
   * Find all soft-deleted tasks for a given organization.
   */
  async findDeleted(organizationId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { organizationId, deletedAt: Not(IsNull()) },
      withDeleted: true,
      order: { deletedAt: 'DESC' },
    });
  }
}
