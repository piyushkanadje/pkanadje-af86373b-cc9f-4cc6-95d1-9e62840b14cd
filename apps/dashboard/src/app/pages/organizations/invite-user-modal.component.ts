/* eslint-disable @angular-eslint/template/label-has-associated-control */
import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { OrganizationRole, IInvitation } from '@task-manager/data/frontend';
import { OrganizationService, AuthService } from '../../core/services';

@Component({
  selector: 'app-invite-user-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Invite Modal -->
    @if (!createdInvitation()) {
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <button
            type="button"
            class="fixed inset-0 transition-opacity cursor-default"
            (click)="close.emit()"
            aria-label="Close modal"
          >
            <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
          </button>

          <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <form [formGroup]="inviteForm" (ngSubmit)="onSubmit()">
              <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div class="flex items-center mb-4">
                  <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                  </div>
                  <h3 class="ml-3 text-lg font-medium text-gray-900 dark:text-white">
                    Invite User to {{ organizationName }}
                  </h3>
                </div>

                @if (errorMessage()) {
                  <div class="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                    {{ errorMessage() }}
                  </div>
                }

                <div class="space-y-4">
                  <!-- Email Input -->
                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      formControlName="email"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="user@example.com"
                    />
                    @if (inviteForm.get('email')?.invalid && inviteForm.get('email')?.touched) {
                      <p class="mt-1 text-sm text-red-600 dark:text-red-400">Please enter a valid email address</p>
                    }
                  </div>

                  <!-- Role Dropdown -->
                  <div>
                    <label for="role" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Role
                    </label>
                    <select
                      id="role"
                      formControlName="role"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      @for (role of availableRoles(); track role) {
                        <option [value]="role">{{ role }}</option>
                      }
                    </select>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      @switch (inviteForm.get('role')?.value) {
                        @case ('OWNER') {
                          Full access including organization management
                        }
                        @case ('ADMIN') {
                          Can manage tasks and invite users (except OWNER)
                        }
                        @case ('VIEWER') {
                          Read-only access to tasks
                        }
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  [disabled]="inviteForm.invalid || organizationService.isLoading()"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-base font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (organizationService.isLoading()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  } @else {
                    Send Invitation
                  }
                </button>
                <button
                  type="button"
                  (click)="close.emit()"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <!-- Success Modal with Invite Link -->
    @if (createdInvitation()) {
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <button
            type="button"
            class="fixed inset-0 transition-opacity cursor-default"
            (click)="closeSuccessModal()"
            aria-label="Close modal"
          >
            <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
          </button>

          <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
              <div class="flex items-center mb-4">
                <div class="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3 class="ml-3 text-lg font-medium text-gray-900 dark:text-white">
                  Invitation Created!
                </h3>
              </div>

              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                An invitation has been created for <strong class="text-gray-900 dark:text-white">{{ createdInvitation()?.email }}</strong>
                as <strong class="text-indigo-600 dark:text-indigo-400">{{ createdInvitation()?.role }}</strong>.
              </p>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share this invitation link:
                </label>
                <div class="flex">
                  <input
                    type="text"
                    readonl
                    [value]="inviteUrl()"
                    class="flex-1 block w-full border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm py-2 px-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                  />
                  <button
                    type="button"
                    (click)="copyToClipboard()"
                    class="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 focus:outline-none"
                  >
                    @if (copied()) {
                      <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                    } @else {
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <div class="flex">
                  <svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <div class="ml-3">
                    <p class="text-sm text-yellow-700 dark:text-yellow-400">
                      This invitation expires in <strong>7 days</strong>. The invited user will need to register using this link.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                (click)="closeSuccessModal()"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-base font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class InviteUserModalComponent {
  @Input() organizationId!: string;
  @Input() organizationName!: string;
  @Input() currentUserRole!: OrganizationRole;
  @Output() close = new EventEmitter<void>();
  @Output() invitationCreated = new EventEmitter<IInvitation>();

  readonly organizationService = inject(OrganizationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  createdInvitation = signal<IInvitation | null>(null);
  errorMessage = signal<string | null>(null);
  copied = signal(false);

  // Role options filtered by current user's role
  availableRoles = computed(() => {
    if (this.currentUserRole === OrganizationRole.OWNER) {
      return [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.VIEWER];
    }
    // ADMIN can only invite ADMIN and VIEWER
    return [OrganizationRole.ADMIN, OrganizationRole.VIEWER];
  });

  inviteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: [OrganizationRole.VIEWER, Validators.required],
  });

  inviteUrl = computed(() => {
    const invitation = this.createdInvitation();
    if (!invitation) return '';
    return this.organizationService.getInvitationUrl(invitation.token);
  });

  onSubmit(): void {
    if (this.inviteForm.invalid) return;

    this.errorMessage.set(null);

    this.organizationService
      .createInvitation({
        email: this.inviteForm.value.email,
        role: this.inviteForm.value.role,
        organizationId: this.organizationId,
      })
      .subscribe({
        next: (invitation) => {
          this.createdInvitation.set(invitation);
          this.invitationCreated.emit(invitation);
        },
        error: (error) => {
          this.errorMessage.set(
            error.error?.message || 'Failed to create invitation'
          );
        },
      });
  }

  copyToClipboard(): void {
    const url = this.inviteUrl();
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  closeSuccessModal(): void {
    this.createdInvitation.set(null);
    this.inviteForm.reset({ role: OrganizationRole.VIEWER });
    this.close.emit();
  }
}
