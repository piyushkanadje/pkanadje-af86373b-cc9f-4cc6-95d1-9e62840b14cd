import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@task-manager/data';

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
}
