import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  AuthService,
  TaskService,
  OrganizationService,
  ShortcutService,
} from '../../core/services';
import type { CreateTaskDto, SortBy } from '../../core/services';
import { TaskStatus, TaskPriority, TaskCategory, ITask, OrganizationRole } from '@task-manager/data/frontend';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DragDropModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly taskService = inject(TaskService);
  readonly organizationService = inject(OrganizationService);
  readonly shortcutService = inject(ShortcutService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly TaskStatus = TaskStatus;
  readonly TaskPriority = TaskPriority;
  readonly TaskCategory = TaskCategory;

  showCreateModal = signal(false);
  editingTask = signal<ITask | null>(null);

  // Search input binding (two-way with signal)
  searchInput = '';

  // Computed signal for role-based visibility
  readonly canCreateTasks = computed(() => {
    const currentOrg = this.organizationService.currentOrg();
    const memberships = this.authService.userOrganizations();
    
    if (!currentOrg || !memberships) return false;
    
    const membership = memberships.find(m => m.organizationId === currentOrg.id);
    // Only OWNER and ADMIN can create/edit tasks, VIEWER cannot
    return membership?.role !== OrganizationRole.VIEWER;
  });

  readonly canEditTasks = computed(() => this.canCreateTasks());

  taskForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    status: [TaskStatus.TODO],
    priority: [TaskPriority.MEDIUM],
    category: [TaskCategory.GENERAL],
  });

  ngOnInit(): void {
    this.taskService.loadTasks();
    
    // Ctrl/Cmd + N → Open New Task Modal
    this.shortcutService.newTask$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.canCreateTasks() && !this.showCreateModal()) {
          this.showCreateModal.set(true);
        }
      });
    
    // Escape → Close Modal
    this.shortcutService.escape$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.showCreateModal()) {
          this.closeModal();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  editTask(task: ITask): void {
    if (!this.canEditTasks()) return;
    
    this.editingTask.set(task);
    this.taskForm.patchValue({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      category: task.category || TaskCategory.GENERAL,
    });
    this.showCreateModal.set(true);
  }

  closeModal(): void {
    this.showCreateModal.set(false);
    this.editingTask.set(null);
    this.taskForm.reset({
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      category: TaskCategory.GENERAL,
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid || !this.canCreateTasks()) return;

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
        category: formValue.category,
      };

      this.taskService.createTask(dto).subscribe({
        next: () => this.closeModal(),
      });
    }
  }

  deleteTask(): void {
    const task = this.editingTask();
    if (!task || !this.canEditTasks()) return;

    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(task.id).subscribe({
        next: () => this.closeModal(),
      });
    }
  }

  getPriorityClass(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.LOW:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case TaskPriority.MEDIUM:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case TaskPriority.HIGH:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case TaskPriority.URGENT:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getCategoryClass(category: TaskCategory): string {
    switch (category) {
      case TaskCategory.WORK:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case TaskCategory.PERSONAL:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case TaskCategory.URGENT:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case TaskCategory.GENERAL:
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getCategoryIcon(category: TaskCategory): string {
    switch (category) {
      case TaskCategory.WORK:
        return '💼';
      case TaskCategory.PERSONAL:
        return '🏠';
      case TaskCategory.URGENT:
        return '🔥';
      case TaskCategory.GENERAL:
      default:
        return '📋';
    }
  }

  // Search handler
  onSearchChange(query: string): void {
    this.taskService.setSearchQuery(query);
  }

  // Category filter handler
  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.taskService.setSelectedCategory(value ? value as TaskCategory : null);
  }

  // Sort handler
  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as SortBy;
    this.taskService.setSortBy(value);
  }

  // Clear all filters
  clearFilters(): void {
    this.searchInput = '';
    this.taskService.clearFilters();
  }

  /**
   * Drag-and-Drop Handler
   * Handles moving tasks between Kanban columns (status change)
   */
  onDrop(event: CdkDragDrop<ITask[]>, newStatus: TaskStatus): void {
    if (!this.canEditTasks()) return;

    const task = event.item.data as ITask;
    
    // Same container - just reordering within column (no status change needed)
    if (event.previousContainer === event.container) {
      // Optional: implement reordering within the same column
      return;
    }

    // Different container - status change
    const previousTask = this.taskService.optimisticUpdateStatus(task.id, newStatus);
    
    if (!previousTask) return;

    // Make API call to persist the change
    this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
      error: () => {
        // Rollback on failure
        this.taskService.rollbackTask(previousTask);
      },
    });
  }
}
