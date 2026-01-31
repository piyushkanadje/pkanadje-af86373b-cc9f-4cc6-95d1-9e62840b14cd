import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { ITask, TaskStatus, TaskPriority } from '@task-manager/data';
import { OrganizationService } from './organization.service';

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly API_URL = '/api/tasks';
  private readonly organizationService = inject(OrganizationService);

  // Signals for reactive state management
  private readonly _tasks = signal<ITask[]>([]);
  private readonly _selectedTask = signal<ITask | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly tasks = this._tasks.asReadonly();
  readonly selectedTask = this._selectedTask.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals for filtered views
  readonly todoTasks = computed(() =>
    this._tasks().filter((t) => t.status === TaskStatus.TODO)
  );

  readonly inProgressTasks = computed(() =>
    this._tasks().filter((t) => t.status === TaskStatus.IN_PROGRESS)
  );

  readonly doneTasks = computed(() =>
    this._tasks().filter((t) => t.status === TaskStatus.DONE)
  );

  readonly taskCount = computed(() => this._tasks().length);

  private readonly http = inject(HttpClient);

  /**
   * Load all tasks for the current organization
   */
  loadTasks(): void {
    const orgId = this.organizationService.currentOrg()?.id;
    if (!orgId) {
      this._tasks.set([]);
      return;
    }

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

    return this.http.patch<ITask>(`${this.API_URL}/${id}`, dto).pipe(
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
}
