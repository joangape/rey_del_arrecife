import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/**
 * Guard que valida los roles permitidos declarados en route.data['roles'] (o route.data['role']).
 * Si el usuario no está autenticado, lo envía a /login.
 * Si no tiene el rol autorizado, lo redirige a /inventario.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const allowedRoles =
    (route.data?.['roles'] as UserRole[] | undefined) ||
    (route.data?.['role'] ? [route.data['role'] as UserRole] : undefined);

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userRole = authService.currentUser()?.role;
  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  return router.createUrlTree(['/inventario']);
};

/**
 * Creador de guard de roles explícitos para rutas.
 * Ejemplo de uso:
 * `canActivate: [authGuard, hasRoleGuard('admin')]`
 */
export const hasRoleGuard = (...allowedRoles: UserRole[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const userRole = authService.currentUser()?.role;
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    return router.createUrlTree(['/inventario']);
  };
};
