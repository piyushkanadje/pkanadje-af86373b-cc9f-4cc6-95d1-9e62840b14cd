import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AuthService,
  OrganizationService,
  CreateOrganizationDto,
} from '../../core/services';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss'],
})
export class OrganizationsComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly organizationService = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  showCreateModal = signal(false);

  orgForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.organizationService.loadOrganizations();
  }

  selectOrganization(membership: { organizationId: string; organizationName: string }): void {
    this.organizationService.getOrganization(membership.organizationId).subscribe({
      next: (org) => this.organizationService.switchOrganization(org),
    });
  }

  closeModal(): void {
    this.showCreateModal.set(false);
    this.orgForm.reset();
  }

  onSubmit(): void {
    if (this.orgForm.invalid) return;

    const dto: CreateOrganizationDto = {
      name: this.orgForm.value.name,
    };

    this.organizationService.createOrganization(dto).subscribe({
      next: () => {
        this.closeModal();
        // Refresh user profile to get updated memberships
        this.authService.loadUserProfile();
      },
    });
  }
}
