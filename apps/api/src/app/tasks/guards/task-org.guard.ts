import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { TasksService } from '../tasks.service';

@Injectable()
export class TaskOrgGuard implements CanActivate {
  constructor(private readonly tasksService: TasksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const taskId = request.params?.id;

    if (!taskId) {
      return true;
    }


    const task = await this.tasksService.findByIdWithDeleted(taskId);

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    request.body = request.body || {};
    request.body.organizationId = task.organizationId;

    request.task = task;

    return true;
  }
}
