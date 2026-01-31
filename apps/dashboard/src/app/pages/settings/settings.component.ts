import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, OrganizationService } from '../../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  readonly authService = inject(AuthService);
  readonly organizationService = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  emailNotifications = true;
  pushNotifications = false;

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  onPasswordSubmit(): void {
    if (this.passwordForm.invalid) return;
    // TODO: Implement password change API call
    console.log('Password change submitted');
  }
}
