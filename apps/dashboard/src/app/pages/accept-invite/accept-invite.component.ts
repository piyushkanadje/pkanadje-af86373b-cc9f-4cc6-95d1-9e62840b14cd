import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InvitationStatus, OrganizationRole } from '@task-manager/data/frontend';

// Response from GET /api/invitations/token/:token
interface InvitationTokenResponse {
  id: string;
  email: string;
  token: string;
  role: OrganizationRole;
  status: InvitationStatus;
  organization: { id: string; name: string };
  invitedBy: { id: string; email: string } | null;
  expiresAt: string;
  isExpired: boolean;
}

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="text-center">
            <svg class="animate-spin mx-auto h-12 w-12 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-4 text-gray-600 dark:text-gray-400">Loading invitation details...</p>
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="text-center">
            <div class="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <h2 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Invalid Invitation</h2>
            <p class="mt-2 text-gray-600 dark:text-gray-400">{{ error() }}</p>
            <div class="mt-6">

            <a
                routerLink="/login"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Login
              </a>
            </div>
          </div>
        }

        <!-- Success State (After Registration) -->
        @if (success()) {
          <div class="text-center">
            <div class="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Welcome!</h2>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Your account has been created and you've joined <strong class="text-indigo-600">{{ invitation()?.organization?.name }}</strong>.
            </p>
            <div class="mt-6">
              <a
                routerLink="/login"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Login to Continue
              </a>
            </div>
          </div>
        }

        <!-- Registration Form -->
        @if (invitation() && !success() && !error()) {
          <div>
            <div class="text-center">
              <div class="mx-auto h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
              </div>
              <h2 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Join {{ invitation()?.organization?.name }}</h2>
              <p class="mt-2 text-gray-600 dark:text-gray-400">
                You've been invited to join as <strong class="text-indigo-600">{{ invitation()?.role }}</strong>
              </p>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-500">
                Create your account to get started
              </p>
            </div>

            <form class="mt-8 space-y-6" [formGroup]="registerForm" (ngSubmit)="onSubmit()">
              @if (submitError()) {
                <div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                  {{ submitError() }}
                </div>
              }

              <div class="space-y-4">
                <!-- Name -->
                <div>
                  <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name <span class="text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    formControlName="name"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>

                <!-- Email (readonly, from invitation) -->
                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    [value]="invitation()?.email"
                    readonly
                    class="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed sm:text-sm"
                  />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    This email is linked to your invitation
                  </p>
                </div>

                <!-- Password -->
                <div>
                  <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <div class="mt-1 relative">
                    <input
                      id="password"
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="password"
                      class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      (click)="showPassword.set(!showPassword())"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                    >
                      @if (showPassword()) {
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                      } @else {
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      }
                    </button>
                  </div>
                  @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      Password must be at least 8 characters
                    </p>
                  }
                </div>

                <!-- Confirm Password -->
                <div>
                  <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    formControlName="confirmPassword"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Repeat your password"
                  />
                  @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched) {
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      Passwords do not match
                    </p>
                  }
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  [disabled]="registerForm.invalid || isSubmitting()"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (isSubmitting()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  } @else {
                    Create Account & Join
                  }
                </button>
              </div>

              <p class="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?
                <a routerLink="/login" class="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                  Sign in instead
                </a>
              </p>
            </form>
          </div>
        }
      </div>
    </div>
  `,
})
export class AcceptInviteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  isLoading = signal(true);
  isSubmitting = signal(false);
  error = signal<string | null>(null);
  submitError = signal<string | null>(null);
  success = signal(false);
  invitation = signal<InvitationTokenResponse | null>(null);
  showPassword = signal(false);

  registerForm: FormGroup = this.fb.group(
    {
      name: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.isLoading.set(false);
      this.error.set('No invitation token provided');
      return;
    }

    // Fetch invitation details
    this.http.get<InvitationTokenResponse>(`/api/v1/invitations/token/${token}`).subscribe({
      next: (invitation) => {
        this.isLoading.set(false);
        
        // Check if invitation is valid
        if (invitation.status !== InvitationStatus.PENDING) {
          this.error.set(
            invitation.status === InvitationStatus.ACCEPTED
              ? 'This invitation has already been accepted'
              : invitation.status === InvitationStatus.EXPIRED
              ? 'This invitation has expired'
              : 'This invitation is no longer valid'
          );
          return;
        }

        // Check if expired (also check isExpired from API)
        if (invitation.isExpired || new Date(invitation.expiresAt) < new Date()) {
          this.error.set('This invitation has expired');
          return;
        }

        this.invitation.set(invitation);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.error?.message || 'Invalid or expired invitation');
      },
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    const invitation = this.invitation();
    if (!invitation) return;

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const payload: { token: string; password: string; name?: string } = {
      token: invitation.token,
      password: this.registerForm.value.password,
    };

    // Only include name if provided
    if (this.registerForm.value.name?.trim()) {
      payload.name = this.registerForm.value.name.trim();
    }

    this.http.post('/api/v1/invitations/accept', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.submitError.set(
          err.error?.message || 'Failed to create account. Please try again.'
        );
      },
    });
  }

  private passwordMatchValidator(control: FormGroup): { passwordMismatch: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password?.value !== confirmPassword?.value) {
      return { passwordMismatch: true };
    }
    return null;
  }
}
