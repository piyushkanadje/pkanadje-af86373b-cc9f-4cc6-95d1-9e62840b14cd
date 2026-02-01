import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { ITask, TaskStatus, TaskPriority, TaskCategory } from '@task-manager/data/frontend';
import { OrganizationService } from './organization.service';

export type SortBy = 'date' | 'priority' | 'alpha';

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  dueDate?: Date;
  assigneeId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  dueDate?: Date;
  assigneeId?: string;
}

// Priority weight for sorting (higher = more urgent)
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  [TaskPriority.LOW]: 1,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.URGENT]: 4,
};

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly API_URL = '/api/tasks';
  private readonly organizationService = inject(OrganizationService);
  private readonly http = inject(HttpClient);

  // Track loaded organization to prevent duplicate loads
  private loadedOrgId: string | null = null;

  // Signals for reactive state management
  private readonly _tasks = signal<ITask[]>([]);
  private readonly _selectedTask = signal<ITask | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Search, Filter, Sort signals
  private readonly _searchQuery = signal<string>('');
  private readonly _selectedCategory = signal<TaskCategory | null>(null);
  private readonly _sortBy = signal<SortBy>('date');

  // Public readonly signals
  readonly tasks = this._tasks.asReadonly();
  readonly selectedTask = this._selectedTask.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();
  readonly sortBy = this._sortBy.asReadonly();

  // Available categories for UI
  readonly categories = Object.values(TaskCategory);

  constructor() {
    // Effect to auto-load tasks when organization changes
    effect(() => {
      const org = this.organizationService.currentOrg();
      if (org && org.id !== this.loadedOrgId) {
        this.loadedOrgId = org.id;
        this.loadTasksInternal(org.id);
      } else if (!org) {
        this.loadedOrgId = null;
        this._tasks.set([]);
      }
    });
  }

  /**
   * CRITICAL: Computed signal that applies search, filter, and sort
   * This is the single source of truth for filtered task display
   */
  readonly filteredTasks = computed(() => {
    let tasks = [...this._tasks()];
    const query = this._searchQuery().toLowerCase().trim();
    const category = this._selectedCategory();
    const sort = this._sortBy();

    // 1. Apply search filter
    if (query) {
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // 2. Apply category filter
    if (category) {
      tasks = tasks.filter((t) => t.category === category);
    }

    // 3. Apply sorting
    tasks = this.sortTasks(tasks, sort);

    return tasks;
  });

  // Computed signals for Kanban columns (derived from filteredTasks)
  readonly todoTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === TaskStatus.TODO)
  );

  readonly inProgressTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === TaskStatus.IN_PROGRESS)
  );

  readonly doneTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === TaskStatus.DONE)
  );

  readonly taskCount = computed(() => this._tasks().length);
  readonly filteredTaskCount = computed(() => this.filteredTasks().length);

  /**
   * Sort tasks based on the selected sort option
   */
  private sortTasks(tasks: ITask[], sortBy: SortBy): ITask[] {
    switch (sortBy) {
      case 'priority':
        return tasks.sort(
          (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
        );
      case 'alpha':
        return tasks.sort((a, b) => a.title.localeCompare(b.title));
      case 'date':
      default:
        return tasks.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  /**
   * Set category filter
   */
  setSelectedCategory(category: TaskCategory | null): void {
    this._selectedCategory.set(category);
  }

  /**
   * Set sort option
   */
  setSortBy(sortBy: SortBy): void {
    this._sortBy.set(sortBy);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this._searchQuery.set('');
    this._selectedCategory.set(null);
    this._sortBy.set('date');
  }

  /**
   * Load all tasks for the current organization
   * This is now primarily called by the effect, but can be called manually to refresh
   */
  loadTasks(): void {
    const orgId = this.organizationService.currentOrg()?.id;
    if (!orgId) {
      return; // Effect will handle loading when org is ready
    }
    this.loadTasksInternal(orgId);
  }

  /**
   * Internal method to load tasks for a specific organization
   */
  private loadTasksInternal(orgId: string): void {
    this._isLoading.set(true);
    this._error.set(null);

    this.http
      .get<ITask[]>(`${this.API_URL}`, {
        params: { organizationId: orgId },
      })
      .pipe(
        tap((tasks) => {
          this._tasks.set(tasks);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._error.set(error.error?.message || 'Failed to load tasks');
          this._isLoading.set(false);
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Get a single task by ID
   */
  getTask(id: string): Observable<ITask> {
    return this.http.get<ITask>(`${this.API_URL}/${id}`).pipe(
      tap((task) => this._selectedTask.set(task)),
      catchError((error) => {
        this._error.set(error.error?.message || 'Failed to load task');
        throw error;
      })
    );
  }

  /**
   * Create a new task
   */
  createTask(dto: CreateTaskDto): Observable<ITask> {
    const orgId = this.organizationService.currentOrg()?.id;
    if (!orgId) {
      throw new Error('No organization selected');
    }

    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<ITask>(this.API_URL, { ...dto, organizationId: orgId })
      .pipe(
        tap((newTask) => {
          this._tasks.update((tasks) => [...tasks, newTask]);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._error.set(error.error?.message || 'Failed to create task');
          this._isLoading.set(false);
          throw error;
        })
      );
  }

  /**
   * Update an existing task
   */
  updateTask(id: string, dto: UpdateTaskDto): Observable<ITask> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ITask>(`${this.API_URL}/${id}`, dto).pipe(
      tap((updatedTask) => {
        this._tasks.update((tasks) =>
          tasks.map((t) => (t.id === id ? updatedTask : t))
        );
        if (this._selectedTask()?.id === id) {
          this._selectedTask.set(updatedTask);
        }
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._error.set(error.error?.message || 'Failed to update task');
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Delete a task (soft delete)
   */
  deleteTask(id: string): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        this._tasks.update((tasks) => tasks.filter((t) => t.id !== id));
        if (this._selectedTask()?.id === id) {
          this._selectedTask.set(null);
        }
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._error.set(error.error?.message || 'Failed to delete task');
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Select a task for viewing/editing
   */
  selectTask(task: ITask | null): void {
    this._selectedTask.set(task);
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Clear all tasks (e.g., when switching organizations)
   */
  clearTasks(): void {
    this._tasks.set([]);
    this._selectedTask.set(null);
  }

  /**
   * Optimistically update task status (for drag-and-drop)
   * Returns the previous task state for rollback on API failure
   */
  optimisticUpdateStatus(taskId: string, newStatus: TaskStatus): ITask | null {
    const currentTasks = this._tasks();
    const taskIndex = currentTasks.findIndex((t) => t.id === taskId);
    
    if (taskIndex === -1) return null;
    
    const previousTask = { ...currentTasks[taskIndex] };
    
    // Optimistically update the local state
    this._tasks.update((tasks) =>
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    
    return previousTask;
  }

  /**
   * Rollback a task to its previous state (on API failure)
   */
  rollbackTask(previousTask: ITask): void {
    this._tasks.update((tasks) =>
      tasks.map((t) => (t.id === previousTask.id ? previousTask : t))
    );
  }
}
