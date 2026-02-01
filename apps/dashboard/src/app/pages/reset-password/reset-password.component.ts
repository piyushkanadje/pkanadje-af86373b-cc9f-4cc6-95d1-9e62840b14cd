import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  token = signal<string>('');
  isValidating = signal(true);
  isTokenValid = signal(false);
  userEmail = signal<string>('');
  isLoading = signal(false);
  isSuccess = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  resetPasswordForm: FormGroup = this.fb.group(
    {
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

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.isValidating.set(false);
      this.error.set('Invalid reset link. Please request a new password reset.');
      return;
    }

    this.token.set(token);
    this.validateToken(token);
  }

  private validateToken(token: string): void {
    this.authService.validateResetToken(token).subscribe({
      next: (result) => {
        this.isValidating.set(false);
        this.isTokenValid.set(result.valid);
        if (result.email) {
          this.userEmail.set(result.email);
        }
        if (!result.valid) {
          this.error.set(
            'This reset link has expired or is invalid. Please request a new password reset.'
          );
        }
      },
      error: () => {
        this.isValidating.set(false);
        this.isTokenValid.set(false);
        this.error.set(
          'Unable to verify reset link. Please try again or request a new password reset.'
        );
      },
    });
  }

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

  onSubmit(): void {
    this.resetPasswordForm.markAllAsTouched();

    if (this.resetPasswordForm.invalid) return;

    this.isLoading.set(true);
    this.error.set(null);

    const { newPassword } = this.resetPasswordForm.value;

    this.authService.resetPassword(this.token(), newPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        const message = Array.isArray(err.error?.message)
          ? err.error.message[0]
          : err.error?.message || 'Failed to reset password';
        this.error.set(message);
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  clearError(): void {
    this.error.set(null);
  }

  getFieldError(fieldName: string): string | null {
    const control = this.resetPasswordForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return null;

    if (control.errors['required']) {
      return fieldName === 'newPassword'
        ? 'Password is required'
        : 'Please confirm your password';
    }
    if (control.errors['minlength']) {
      return 'Password must be at least 8 characters';
    }
    if (control.errors['pattern']) {
      return 'Password must contain uppercase, lowercase, and a number';
    }
    if (control.errors['passwordMismatch']) {
      return 'Passwords do not match';
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.resetPasswordForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
