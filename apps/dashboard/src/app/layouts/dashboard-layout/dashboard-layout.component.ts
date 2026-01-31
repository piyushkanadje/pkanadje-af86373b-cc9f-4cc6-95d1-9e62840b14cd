import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, OrganizationService } from '../../core/services';
import { OrganizationRole } from '@task-manager/data/frontend';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss'],
})
export class DashboardLayoutComponent {
  readonly authService = inject(AuthService);
  readonly organizationService = inject(OrganizationService);

  // Navigation items
  readonly navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/tasks', label: 'Tasks', icon: 'tasks' },
    { path: '/organizations', label: 'Organizations', icon: 'building' },
    { path: '/audit-log', label: 'Audit Log', icon: 'history' },
  ];

  // Mobile sidebar state
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
  }

  switchOrg(org: { organizationId: string; organizationName: string }): void {
    this.organizationService.getOrganization(org.organizationId).subscribe({
      next: (fullOrg) => {
        this.organizationService.switchOrganization(fullOrg);
      },
    });
  }

  getCurrentOrgRole(): OrganizationRole | null {
    const currentOrg = this.organizationService.currentOrg();
    const memberships = this.authService.userOrganizations();
    
    if (!currentOrg || !memberships) return null;
    
    const membership = memberships.find(m => m.organizationId === currentOrg.id);
    return membership?.role ?? null;
  }

  isCurrentOrg(orgId: string): boolean {
    return this.organizationService.currentOrg()?.id === orgId;
  }
}
