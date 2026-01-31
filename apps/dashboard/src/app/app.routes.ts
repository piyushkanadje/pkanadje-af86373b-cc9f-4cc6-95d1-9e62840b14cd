import { Route } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards';

export const appRoutes: Route[] = [
  // Default redirect
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  // Public routes (no auth required)
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [noAuthGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then(
        (m) => m.RegisterComponent
      ),
    canActivate: [noAuthGuard],
  },

  // Protected routes (auth required)
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./pages/tasks/tasks.component').then((m) => m.TasksComponent),
    canActivate: [authGuard],
  },
  {
    path: 'organizations',
    loadComponent: () =>
      import('./pages/organizations/organizations.component').then(
        (m) => m.OrganizationsComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(
        (m) => m.SettingsComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'audit-log',
    loadComponent: () =>
      import('./pages/audit-log/audit-log.component').then(
        (m) => m.AuditLogComponent
      ),
    canActivate: [authGuard],
  },

  // Wildcard - redirect to dashboard
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
