import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { OrganizationRole, IInvitation, IOrganizationMember } from '@task-manager/data/frontend';
import {
  AuthService,
  OrganizationService,
  CreateOrganizationDto,
} from '../../core/services';
import { InviteUserModalComponent } from './invite-user-modal.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InviteUserModalComponent],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss'],
})
export class OrganizationsComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly organizationService = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  showCreateModal = signal(false);
  showInviteModal = signal(false);
  activeTab = signal<'members' | 'invitations'>('members');

  orgForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  // Get current user's role in the current organization
  currentUserRole = computed(() => {
    const currentOrg = this.organizationService.currentOrg();
    const memberships = this.authService.userOrganizations();
    if (!currentOrg) return null;
    const membership = memberships.find((m) => m.organizationId === currentOrg.id);
    return membership?.role || null;
  });

  // Check if user can invite (OWNER or ADMIN)
  canInvite = computed(() => {
    const role = this.currentUserRole();
    return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN;
  });

  // Check if user is OWNER (can manage everything)
  isOwner = computed(() => this.currentUserRole() === OrganizationRole.OWNER);

  // Check if user can delete (OWNER and has multiple orgs)
  canDelete = computed(() => {
    return this.isOwner() && this.authService.userOrganizations().length > 1;
  });

  showDeleteConfirm = signal(false);

  constructor() {
    // Load members and invitations when organization changes
    effect(() => {
      const org = this.organizationService.currentOrg();
      if (org) {
        this.loadOrgData(org.id);
      }
    });
  }

  ngOnInit(): void {
    this.organizationService.loadOrganizations();
  }

  loadOrgData(orgId: string): void {
    this.organizationService.getMembers(orgId).subscribe();
    if (this.canInvite()) {
      this.organizationService.getInvitations(orgId).subscribe();
    }
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
        this.authService.loadUserProfile();
      },
    });
  }

  openInviteModal(): void {
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
  }

  onInvitationCreated(invitation: IInvitation): void {
    // Invitation is already added to the list via the service
  }

  revokeInvitation(invitation: IInvitation): void {
    if (confirm(`Are you sure you want to revoke the invitation for ${invitation.email}?`)) {
      this.organizationService.revokeInvitation(invitation.id).subscribe();
    }
  }

  resendInvitation(invitation: IInvitation): void {
    this.organizationService.resendInvitation(invitation.id).subscribe();
  }

  copyInviteLink(invitation: IInvitation): void {
    const url = this.organizationService.getInvitationUrl(invitation.token);
    navigator.clipboard.writeText(url);
  }

  getRoleBadgeClass(role: OrganizationRole): string {
    switch (role) {
      case OrganizationRole.OWNER:
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400';
      case OrganizationRole.ADMIN:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case OrganizationRole.VIEWER:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'ACCEPTED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'EXPIRED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      case 'REVOKED':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400';
    }
  }

  isExpired(expiresAt: Date): boolean {
    return new Date(expiresAt) < new Date();
  }

  getExpiryText(expiresAt: Date): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Expired';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
    return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }

  openDeleteConfirm(): void {
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
  }

  deleteOrganization(): void {
    const orgId = this.organizationService.currentOrg()?.id;
    if (!orgId) return;

    this.organizationService.deleteOrganization(orgId).subscribe({
      next: () => {
        this.closeDeleteConfirm();
        // Reload user profile to update organization memberships
        this.authService.loadUserProfile();
      },
      error: () => {
        // Error is handled by the service
        this.closeDeleteConfirm();
      }
    });
  }

  protected readonly OrganizationRole = OrganizationRole;
}
