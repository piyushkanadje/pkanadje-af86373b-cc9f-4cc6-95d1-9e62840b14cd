import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService, OrganizationService } from '../../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  readonly authService = inject(AuthService);
  readonly organizationService = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  emailNotifications = true;
  pushNotifications = false;

  // Password change state
  isChangingPassword = signal(false);
  passwordChangeError = signal<string | null>(null);
  passwordChangeSuccess = signal(false);

  passwordForm: FormGroup = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (
      newPassword &&
      confirmPassword &&
      newPassword.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.invalid) return;

    this.isChangingPassword.set(true);
    this.passwordChangeError.set(null);
    this.passwordChangeSuccess.set(false);

    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.passwordChangeSuccess.set(true);
        this.passwordForm.reset();
        // Auto-hide success message after 5 seconds
        setTimeout(() => this.passwordChangeSuccess.set(false), 5000);
      },
      error: (error) => {
        this.isChangingPassword.set(false);
        const message = Array.isArray(error.error?.message)
          ? error.error.message[0]
          : error.error?.message || 'Failed to change password';
        this.passwordChangeError.set(message);
      },
    });
  }

  clearPasswordError(): void {
    this.passwordChangeError.set(null);
  }
}
