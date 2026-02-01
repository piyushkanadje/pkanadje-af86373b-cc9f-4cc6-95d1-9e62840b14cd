import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import {
  IOrganization,
  IOrganizationWithHierarchy,
  IInvitation,
  ICreateInvitation,
  IOrganizationMember,
  InvitationStatus,
} from '@task-manager/data/frontend';
import { AuthService } from './auth.service';

export interface CreateOrganizationDto {
  name: string;
  parentId?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private readonly API_URL = '/api/v1/organizations';
  private readonly INVITATIONS_API_URL = '/api/v1/invitations';
  private readonly CURRENT_ORG_KEY = 'current_organization_id';
  private readonly authService = inject(AuthService);

  // Signals for reactive state management
  private readonly _currentOrg = signal<IOrganization | null>(null);
  private readonly _organizations = signal<IOrganization[]>([]);
  private readonly _members = signal<IOrganizationMember[]>([]);
  private readonly _invitations = signal<IInvitation[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly currentOrg = this._currentOrg.asReadonly();
  readonly organizations = this._organizations.asReadonly();
  readonly members = this._members.asReadonly();
  readonly invitations = this._invitations.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly hasOrganization = computed(() => !!this._currentOrg());
  readonly organizationCount = computed(() => this._organizations().length);
  readonly pendingInvitations = computed(() =>
    this._invitations().filter((i) => i.status === 'PENDING' && new Date(i.expiresAt) > new Date())
  );

  private readonly http = inject(HttpClient);

  constructor() {
    // Effect to auto-select organization when user logs in
    effect(() => {
      const user = this.authService.currentUser();
      if (user && user.organizationMemberships.length > 0) {
        // Only initialize if no organization is currently set
        if (!this._currentOrg()) {
          this.initializeOrganization(user.organizationMemberships);
        }
      } else if (!user) {
        // Clear org state on logout
        this._currentOrg.set(null);
        this._organizations.set([]);
        localStorage.removeItem(this.CURRENT_ORG_KEY);
      }
    });
  }

  /**
   * Load all organizations the user has access to
   */
  loadOrganizations(): void {
    this._isLoading.set(true);
    this._error.set(null);

    this.http
      .get<IOrganization[]>(this.API_URL)
      .pipe(
        tap((orgs) => {
          this._organizations.set(orgs);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._error.set(
            error.error?.message || 'Failed to load organizations'
          );
          this._isLoading.set(false);
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Get organization details with hierarchy
   */
  getOrganization(id: string): Observable<IOrganizationWithHierarchy> {
    return this.http
      .get<IOrganizationWithHierarchy>(`${this.API_URL}/${id}`)
      .pipe(
        catchError((error) => {
          this._error.set(
            error.error?.message || 'Failed to load organization'
          );
          throw error;
        })
      );
  }

  /**
   * Create a new organization
   */
  createOrganization(dto: CreateOrganizationDto): Observable<IOrganization> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<IOrganization>(this.API_URL, dto).pipe(
      tap((newOrg) => {
        this._organizations.update((orgs) => [...orgs, newOrg]);
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._error.set(
          error.error?.message || 'Failed to create organization'
        );
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Update an organization
   */
  updateOrganization(
    id: string,
    dto: UpdateOrganizationDto
  ): Observable<IOrganization> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.patch<IOrganization>(`${this.API_URL}/${id}`, dto).pipe(
      tap((updatedOrg) => {
        this._organizations.update((orgs) =>
          orgs.map((o) => (o.id === id ? updatedOrg : o))
        );
        if (this._currentOrg()?.id === id) {
          this._currentOrg.set(updatedOrg);
        }
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._error.set(
          error.error?.message || 'Failed to update organization'
        );
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Delete an organization (OWNER only)
   */
  deleteOrganization(id: string): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        // Remove from organizations list
        this._organizations.update((orgs) => orgs.filter((o) => o.id !== id));
        
        // If this was the current org, clear it
        if (this._currentOrg()?.id === id) {
          this._currentOrg.set(null);
          localStorage.removeItem(this.CURRENT_ORG_KEY);
        }
        
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._error.set(
          error.error?.message || 'Failed to delete organization'
        );
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Switch to a different organization
   */
  switchOrganization(org: IOrganization): void {
    this._currentOrg.set(org);
    localStorage.setItem(this.CURRENT_ORG_KEY, org.id);
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Initialize organization selection from user memberships
   */
  private initializeOrganization(
    memberships: { organizationId: string; organizationName: string }[]
  ): void {
    // Try to restore previously selected org
    const savedOrgId = localStorage.getItem(this.CURRENT_ORG_KEY);

    if (savedOrgId) {
      const savedMembership = memberships.find(
        (m) => m.organizationId === savedOrgId
      );
      if (savedMembership) {
        // Fetch full org details
        this.getOrganization(savedMembership.organizationId).subscribe({
          next: (org) => this._currentOrg.set(org),
          error: () => this.selectFirstOrganization(memberships),
        });
        return;
      }
    }

    // Default to first organization
    this.selectFirstOrganization(memberships);
  }

  /**
   * Select the first available organization
   */
  private selectFirstOrganization(
    memberships: { organizationId: string; organizationName: string }[]
  ): void {
    if (memberships.length > 0) {
      this.getOrganization(memberships[0].organizationId).subscribe({
        next: (org) => {
          this._currentOrg.set(org);
          localStorage.setItem(this.CURRENT_ORG_KEY, org.id);
        },
      });
    }
  }

  // ==================== MEMBERS ====================

  /**
   * Get all members of an organization
   */
  getMembers(organizationId: string): Observable<IOrganizationMember[]> {
    this._isLoading.set(true);
    return this.http
      .get<IOrganizationMember[]>(`${this.API_URL}/${organizationId}/members`)
      .pipe(
        tap((members) => {
          this._members.set(members);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._error.set(error.error?.message || 'Failed to load members');
          this._isLoading.set(false);
          return of([]);
        })
      );
  }

  /**
   * Clear members when switching org
   */
  clearMembers(): void {
    this._members.set([]);
  }

  // ==================== INVITATIONS ====================

  /**
   * Get all invitations for an organization
   */
  getInvitations(organizationId: string): Observable<IInvitation[]> {
    this._isLoading.set(true);
    return this.http
      .get<IInvitation[]>(
        `${this.INVITATIONS_API_URL}/organization/${organizationId}`
      )
      .pipe(
        tap((invitations) => {
          this._invitations.set(invitations);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._error.set(
            error.error?.message || 'Failed to load invitations'
          );
          this._isLoading.set(false);
          return of([]);
        })
      );
  }

  /**
   * Create a new invitation
   */
  createInvitation(dto: ICreateInvitation): Observable<IInvitation> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<IInvitation>(this.INVITATIONS_API_URL, dto)
      .pipe(
        tap((invitation) => {
          this._invitations.update((invs) => [...invs, invitation]);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._error.set(
            error.error?.message || 'Failed to create invitation'
          );
          this._isLoading.set(false);
          throw error;
        })
      );
  }

  /**
   * Revoke an invitation
   */
  revokeInvitation(invitationId: string): Observable<void> {
    this._isLoading.set(true);
    return this.http
      .delete<void>(`${this.INVITATIONS_API_URL}/${invitationId}`)
      .pipe(
        tap(() => {
          this._invitations.update((invs) =>
            invs.map((i) =>
              i.id === invitationId ? { ...i, status: InvitationStatus.REVOKED } : i
            )
          );
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._error.set(
            error.error?.message || 'Failed to revoke invitation'
          );
          this._isLoading.set(false);
          throw error;
        })
      );
  }

  /**
   * Resend an invitation (generates new token)
   */
  resendInvitation(invitationId: string): Observable<IInvitation> {
    this._isLoading.set(true);
    return this.http
      .post<IInvitation>(
        `${this.INVITATIONS_API_URL}/${invitationId}/resend`,
        {}
      )
      .pipe(
        tap((updatedInvitation) => {
          this._invitations.update((invs) =>
            invs.map((i) => (i.id === invitationId ? updatedInvitation : i))
          );
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._error.set(
            error.error?.message || 'Failed to resend invitation'
          );
          this._isLoading.set(false);
          throw error;
        })
      );
  }

  /**
   * Clear invitations when switching org
   */
  clearInvitations(): void {
    this._invitations.set([]);
  }

  /**
   * Generate the full invitation URL for copying
   */
  getInvitationUrl(token: string): string {
    return `${window.location.origin}/accept-invite?token=${token}`;
  }
}
