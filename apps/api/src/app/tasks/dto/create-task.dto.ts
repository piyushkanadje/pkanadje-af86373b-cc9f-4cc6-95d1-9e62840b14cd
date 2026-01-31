import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@task-manager/data';

export class CreateTaskDto {
  @ApiProperty({
    description: 'The title of the task',
    example: 'Fix server bug',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the task',
    example: 'Investigate and fix the memory leak in the authentication service',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The UUID of the organization this task belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({
    description: 'The UUID of the user assigned to this task',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'The current status of the task',
    enum: TaskStatus,
    example: TaskStatus.TODO,
    default: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
