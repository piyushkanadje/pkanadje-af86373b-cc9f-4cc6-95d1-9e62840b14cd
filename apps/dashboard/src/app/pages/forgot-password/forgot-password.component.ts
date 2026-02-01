import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  isLoading = signal(false);
  isSubmitted = signal(false);
  error = signal<string | null>(null);

  forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    this.forgotPasswordForm.markAllAsTouched();

    if (this.forgotPasswordForm.invalid) return;

    this.isLoading.set(true);
    this.error.set(null);

    const { email } = this.forgotPasswordForm.value;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSubmitted.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        const message = Array.isArray(err.error?.message)
          ? err.error.message[0]
          : err.error?.message || 'Failed to send reset email';
        this.error.set(message);
      },
    });
  }

  clearError(): void {
    this.error.set(null);
  }

  getFieldError(fieldName: string): string | null {
    const control = this.forgotPasswordForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return null;

    if (control.errors['required']) return 'Email is required';
    if (control.errors['email']) return 'Please enter a valid email address';
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.forgotPasswordForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }
}
