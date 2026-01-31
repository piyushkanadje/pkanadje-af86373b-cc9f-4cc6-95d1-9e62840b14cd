import { Route } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards';

export const appRoutes: Route[] = [
  // Landing page (public marketing page)
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(
        (m) => m.LandingComponent
      ),
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

  // Protected routes with shared layout
  {
    path: '',
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./pages/tasks/tasks.component').then((m) => m.TasksComponent),
      },
      {
        path: 'organizations',
        loadComponent: () =>
          import('./pages/organizations/organizations.component').then(
            (m) => m.OrganizationsComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
      },
      {
        path: 'audit-log',
        loadComponent: () =>
          import('./pages/audit-log/audit-log.component').then(
            (m) => m.AuditLogComponent
          ),
      },
    ],
  },

  // Wildcard - redirect to dashboard
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
