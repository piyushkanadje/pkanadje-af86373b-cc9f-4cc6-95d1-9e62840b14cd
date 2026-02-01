import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  // Password visibility toggles
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Track which fields have been touched for progressive disclosure
  currentStep = signal(1);

  // Signal to track password value for computed properties
  private passwordValue = signal('');

  registerForm: FormGroup = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          this.passwordStrengthValidator,
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  ngOnInit(): void {
    // Subscribe to password changes and update the signal
    this.registerForm.get('password')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.passwordValue.set(value || '');
      });
  }

  // Password strength indicators - now reactive with signal
  passwordStrength = computed(() => {
    const password = this.passwordValue();
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    return strength;
  });

  passwordStrengthLabel = computed(() => {
    const strength = this.passwordStrength();
    if (strength === 0) return '';
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  });

  passwordStrengthColor = computed(() => {
    const strength = this.passwordStrength();
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 3) return 'bg-yellow-500';
    if (strength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  });

  // Individual requirement checks for the password - now reactive
  hasMinLength = computed(() => this.passwordValue().length >= 8);
  hasUppercase = computed(() => /[A-Z]/.test(this.passwordValue()));
  hasLowercase = computed(() => /[a-z]/.test(this.passwordValue()));
  hasNumber = computed(() => /[0-9]/.test(this.passwordValue()));

  // Expose password value for template
  get currentPasswordValue(): string {
    return this.passwordValue();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(v => !v);
  }

  onSubmit(): void {
    // Mark all fields as touched to trigger validation display
    this.registerForm.markAllAsTouched();
    
    if (this.registerForm.invalid) return;

    const { firstName, lastName, email, password } = this.registerForm.value;

    this.authService.register(firstName, lastName, email, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
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

  private passwordStrengthValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric;

    return passwordValid ? null : { passwordStrength: true };
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // Helper methods for template
  getFieldError(fieldName: string): string | null {
    const control = this.registerForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return null;

    if (control.errors['required']) {
      const labels: Record<string, string> = {
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Password confirmation'
      };
      return `${labels[fieldName]} is required`;
    }
    if (control.errors['email']) return 'Please enter a valid email address';
    if (control.errors['minlength']) {
      if (fieldName === 'password') return 'Password must be at least 8 characters';
      return 'This field is too short';
    }
    if (control.errors['passwordStrength']) {
      return 'Password must include uppercase, lowercase, and a number';
    }
    return null;
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!control && control.valid && control.touched;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!control && control.invalid && control.touched;
  }
}
