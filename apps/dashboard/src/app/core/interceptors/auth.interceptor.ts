import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP interceptor that adds the Authorization header
 * to outgoing requests when a token is available.
 *
 * This follows the modern Angular functional interceptor pattern
 * introduced in Angular 15+.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Skip adding auth header for auth endpoints (login/register)
  const isAuthEndpoint =
    req.url.includes('/auth/login') || req.url.includes('/auth/register');

  if (token && !isAuthEndpoint) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedRequest);
  }

  return next(req);
};
