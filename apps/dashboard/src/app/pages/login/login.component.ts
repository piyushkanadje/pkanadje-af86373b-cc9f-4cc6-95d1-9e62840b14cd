import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  // Password visibility toggle
  showPassword = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    // Mark all fields as touched to trigger validation display
    this.loginForm.markAllAsTouched();
    
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        // Redirect to return URL or dashboard
        const returnUrl =
          this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        // Error is handled in the service
      },
    });
  }

  // Clear error when user starts typing again
  onFieldFocus(): void {
    this.authService.clearError();
  }

  // Helper methods for template
  getFieldError(fieldName: string): string | null {
    const control = this.loginForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return null;

    if (control.errors['required']) {
      const labels: Record<string, string> = {
        email: 'Email',
        password: 'Password',
      };
      return `${labels[fieldName]} is required`;
    }
    if (control.errors['email']) return 'Please enter a valid email address';
    if (control.errors['minlength']) return 'Password must be at least 6 characters';
    return null;
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return !!control && control.valid && control.touched;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }
}
