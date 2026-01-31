import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskOrgGuard } from './guards/task-org.guard';
import {
  JwtAuthGuard,
  OrgRolesGuard,
  OrgRoles,
} from '@task-manager/auth';
import { OrganizationRole, Task } from '@task-manager/data';
import { AuditInterceptor } from '../audit/audit.interceptor';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  organizationId?: string;
  userOrgRole?: OrganizationRole;
}

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
@UseInterceptors(AuditInterceptor)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have Admin role' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.tasksService.create(createTaskDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.VIEWER)
  @ApiOperation({ summary: 'Get all tasks for an organization' })
  @ApiQuery({ name: 'organizationId', description: 'Organization UUID', required: true })
  @ApiResponse({ status: 200, description: 'List of tasks retrieved successfully', type: [Task] })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have access to this organization' })
  async findAll(@Query('organizationId') organizationId: string) {
    return this.tasksService.findByOrganization(organizationId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, TaskOrgGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.VIEWER)
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Viewers can only update task status' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: AuthenticatedRequest
  ) {
    if (req.userOrgRole === OrganizationRole.VIEWER) {
      // Fields that viewers are allowed to update
      const allowedKeys = ['status'];
      // Fields injected by guards (not user input)
      const systemKeys = ['organizationId'];

      const updateKeys = Object.keys(updateTaskDto).filter(
        (k) =>
          updateTaskDto[k as keyof UpdateTaskDto] !== undefined &&
          !systemKeys.includes(k)
      );

      if (updateKeys.some((k) => !allowedKeys.includes(k))) {
        throw new ForbiddenException('Viewers can only update task status');
      }
    }

    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TaskOrgGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have Admin role' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(@Param('id') id: string) {
    await this.tasksService.delete(id);
    return { message: 'Task deleted successfully' };
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, TaskOrgGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task restored successfully', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have Admin role' })
  @ApiResponse({ status: 404, description: 'Task not found or not deleted' })
  async restore(@Param('id') id: string) {
    const task = await this.tasksService.restoreTask(id);
    return { message: 'Task restored successfully', task };
  }

  @Get('deleted')
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Get all soft-deleted tasks for an organization' })
  @ApiQuery({ name: 'organizationId', description: 'Organization UUID', required: true })
  @ApiResponse({ status: 200, description: 'List of deleted tasks retrieved successfully', type: [Task] })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have Admin role' })
  async findDeleted(@Query('organizationId') organizationId: string) {
    return this.tasksService.findDeleted(organizationId);
  }
}
