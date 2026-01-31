import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional route guard that protects routes requiring authentication.
 *
 * This follows the modern Angular functional guard pattern
 * introduced in Angular 15+.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasToken()) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  const returnUrl = state.url;

  // Navigate to login with return URL
  router.navigate(['/login'], {
    queryParams: { returnUrl },
  });

  return false;
};

/**
 * Guard that redirects authenticated users away from public pages
 * (e.g., login page when already logged in)
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasToken()) {
    return true;
  }

  // Already authenticated, redirect to dashboard
  router.navigate(['/dashboard']);
  return false;
};
