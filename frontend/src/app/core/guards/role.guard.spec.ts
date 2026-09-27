import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { hasRoleGuard, roleGuard } from './role.guard';

describe('RoleGuards', () => {
  let authServiceSpy: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  const mockState = { url: '/admin/usuarios' } as RouterStateSnapshot;

  const adminUser: User = {
    id: 'u1',
    email: 'admin@reydelarrecife.local',
    role: 'admin',
    active: true,
  };

  const partnerUser: User = {
    id: 'u2',
    email: 'partner@reydelarrecife.local',
    role: 'partner',
    active: true,
  };

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: vi.fn(),
      currentUser: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  describe('roleGuard', () => {
    it('should redirect to /login if user is not authenticated', () => {
      authServiceSpy.isAuthenticated.mockReturnValue(false);
      const route = { data: { roles: ['admin'] } } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fadmin%2Fusuarios');
    });

    it('should allow access if no roles are configured on route', () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      authServiceSpy.currentUser.mockReturnValue(partnerUser);
      const route = { data: {} } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

      expect(result).toBe(true);
    });

    it('should allow access if user has one of the allowed roles', () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      authServiceSpy.currentUser.mockReturnValue(adminUser);
      const route = { data: { roles: ['admin'] } } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

      expect(result).toBe(true);
    });

    it('should redirect to /inventario if user does not have required role', () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      authServiceSpy.currentUser.mockReturnValue(partnerUser);
      const route = { data: { roles: ['admin'] } } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result as UrlTree)).toBe('/inventario');
    });
  });

  describe('hasRoleGuard factory', () => {
    it('should allow admin when admin is required', () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      authServiceSpy.currentUser.mockReturnValue(adminUser);
      const guard = hasRoleGuard('admin');
      const route = {} as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => guard(route, mockState));

      expect(result).toBe(true);
    });

    it('should redirect partner to /inventario when admin is required', () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      authServiceSpy.currentUser.mockReturnValue(partnerUser);
      const guard = hasRoleGuard('admin');
      const route = {} as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => guard(route, mockState));

      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result as UrlTree)).toBe('/inventario');
    });
  });
});
