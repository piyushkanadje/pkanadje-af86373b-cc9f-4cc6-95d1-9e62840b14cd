import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';

const TOKEN_KEY = 'auth_token';

/**
 * Functional HTTP interceptor that adds the Authorization header
 * to outgoing requests when a token is available.
 *
 * This follows the modern Angular functional interceptor pattern
 * introduced in Angular 15+.
 * 
 * Note: We read the token directly from localStorage instead of
 * injecting AuthService to avoid circular dependency issues during
 * app initialization when AuthService triggers loadUserProfile().
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const token = localStorage.getItem(TOKEN_KEY);

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
