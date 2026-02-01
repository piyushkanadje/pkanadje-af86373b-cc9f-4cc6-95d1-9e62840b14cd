import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskCategory } from '../enums/task-category.enum';

export interface ITask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
