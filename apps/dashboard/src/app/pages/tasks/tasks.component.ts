import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AuthService,
  TaskService,
  OrganizationService,
  CreateTaskDto,
} from '../../core/services';
import { TaskStatus, TaskPriority, ITask } from '@task-manager/data';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly taskService = inject(TaskService);
  readonly organizationService = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  readonly TaskStatus = TaskStatus;
  readonly TaskPriority = TaskPriority;

  showCreateModal = signal(false);
  editingTask = signal<ITask | null>(null);

  taskForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    status: [TaskStatus.TODO],
    priority: [TaskPriority.MEDIUM],
  });

  ngOnInit(): void {
    this.taskService.loadTasks();
  }

  editTask(task: ITask): void {
    this.editingTask.set(task);
    this.taskForm.patchValue({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
    });
    this.showCreateModal.set(true);
  }

  closeModal(): void {
    this.showCreateModal.set(false);
    this.editingTask.set(null);
    this.taskForm.reset({
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid) return;

    const formValue = this.taskForm.value;
    const currentTask = this.editingTask();

    if (currentTask) {
      this.taskService
        .updateTask(currentTask.id, formValue)
        .subscribe({
          next: () => this.closeModal(),
        });
    } else {
      const dto: CreateTaskDto = {
        title: formValue.title,
        description: formValue.description || undefined,
        status: formValue.status,
        priority: formValue.priority,
      };

      this.taskService.createTask(dto).subscribe({
        next: () => this.closeModal(),
      });
    }
  }

  deleteTask(): void {
    const task = this.editingTask();
    if (!task) return;

    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(task.id).subscribe({
        next: () => this.closeModal(),
      });
    }
  }

  getPriorityClass(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.LOW:
        return 'bg-gray-100 text-gray-800';
      case TaskPriority.MEDIUM:
        return 'bg-blue-100 text-blue-800';
      case TaskPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case TaskPriority.URGENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
