import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { IUserWithOrganizations } from '@task-manager/data/frontend';

interface LoginResponse {
  access_token: string;
}

interface RegisterResponse {
  access_token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly API_URL = '/api/auth';

  // Signals for reactive state management
  private readonly _currentUser = signal<IUserWithOrganizations | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly userOrganizations = computed(
    () => this._currentUser()?.organizationMemberships ?? []
  );

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  constructor() {
    // Initialize auth state on service creation
    this.initializeAuth();
  }

  /**
   * Get the stored authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if user has a valid token stored
   */
  hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Login with email and password
   */
  login(email: string, password: string): Observable<LoginResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, { email, password })
      .pipe(
        tap((response) => {
          this.setToken(response.access_token);
          this.loadUserProfile();
        }),
        catchError((error) => {
          this._isLoading.set(false);
          this._error.set(error.error?.message || 'Login failed');
          throw error;
        })
      );
  }

  /**
   * Register a new user
   */
  register(email: string, password: string): Observable<RegisterResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<RegisterResponse>(`${this.API_URL}/register`, { email, password })
      .pipe(
        tap((response) => {
          this.setToken(response.access_token);
          this.loadUserProfile();
        }),
        catchError((error) => {
          this._isLoading.set(false);
          this._error.set(error.error?.message || 'Registration failed');
          throw error;
        })
      );
  }

  /**
   * Logout and clear auth state
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this._currentUser.set(null);
    this._error.set(null);
    this.router.navigate(['/login']);
  }

  /**
   * Load the current user's profile from the API
   */
  loadUserProfile(): void {
    if (!this.hasToken()) {
      this._isLoading.set(false);
      return;
    }

    this._isLoading.set(true);

    this.http
      .get<IUserWithOrganizations>(`${this.API_URL}/profile`)
      .pipe(
        tap((user) => {
          this._currentUser.set(user);
          this._isLoading.set(false);
        }),
        catchError(() => {
          // If profile fetch fails, token might be invalid
          this.logout();
          this._isLoading.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Initialize authentication state on app startup
   */
  private initializeAuth(): void {
    if (this.hasToken()) {
      this.loadUserProfile();
    }
  }

  /**
   * Store the authentication token
   */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }
}
