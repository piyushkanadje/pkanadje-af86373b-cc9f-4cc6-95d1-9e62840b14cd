import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority, TaskCategory } from '@task-manager/data';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'The updated title of the task',
    example: 'Fix server bug - URGENT',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the task',
    example: 'Memory leak fixed, now addressing performance issues',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'The UUID of the new assignee',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'The updated status of the task',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'The updated priority of the task',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'The updated category of the task',
    enum: TaskCategory,
    example: TaskCategory.WORK,
  })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  /**
   * This field is injected by TaskOrgGuard for authorization purposes.
   * It is not user-editable and will be ignored during updates.
   */
  @ApiHideProperty()
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
