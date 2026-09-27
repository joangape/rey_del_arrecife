import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ClientResponseError, RecordModel } from 'pocketbase';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { PocketBaseService } from './pocketbase.service';

function createMockJwt(expSecondsFromNow = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      id: 'mock_user_id',
      type: 'auth',
      collectionId: 'users',
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    })
  );
  return `${header}.${payload}.mockSignature`;
}

describe('AuthService', () => {
  let authService: AuthService;
  let pbService: PocketBaseService;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  const mockAdminRecord: RecordModel = {
    id: 'user_admin_1',
    collectionId: 'users',
    collectionName: 'users',
    email: 'admin@reydelarrecife.local',
    name: 'Admin User',
    avatar: 'avatar1.png',
    role: 'admin',
    active: true,
    created: '2026-01-01',
    updated: '2026-01-02',
  };

  const mockPartnerRecord: RecordModel = {
    id: 'user_partner_1',
    collectionId: 'users',
    collectionName: 'users',
    email: 'partner@reydelarrecife.local',
    name: 'Partner User',
    avatar: '',
    role: 'partner',
    active: true,
    created: '2026-01-01',
    updated: '2026-01-02',
  };

  beforeEach(() => {
    localStorage.clear();

    router = {
      navigateByUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        PocketBaseService,
        { provide: Router, useValue: router },
      ],
    });

    authService = TestBed.inject(AuthService);
    pbService = TestBed.inject(PocketBaseService);

    pbService.pb.authStore.clear();
  });

  afterEach(() => {
    pbService.pb.authStore.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should initialize with null user and false authentication signals', () => {
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.isAdmin()).toBe(false);
    expect(authService.isPartner()).toBe(false);
  });

  it('should update signals reactively when authStore changes to admin', () => {
    const token = createMockJwt();
    pbService.pb.authStore.save(token, mockAdminRecord);

    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isAdmin()).toBe(true);
    expect(authService.isPartner()).toBe(false);
    expect(authService.currentUser()?.email).toBe('admin@reydelarrecife.local');
    expect(authService.currentUser()?.role).toBe('admin');
  });

  it('should update signals reactively when authStore changes to partner', () => {
    const token = createMockJwt();
    pbService.pb.authStore.save(token, mockPartnerRecord);

    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isAdmin()).toBe(false);
    expect(authService.isPartner()).toBe(true);
    expect(authService.currentUser()?.email).toBe('partner@reydelarrecife.local');
    expect(authService.currentUser()?.role).toBe('partner');
  });

  it('should reset signals when authStore is cleared', () => {
    const token = createMockJwt();
    pbService.pb.authStore.save(token, mockAdminRecord);
    expect(authService.isAuthenticated()).toBe(true);

    pbService.pb.authStore.clear();
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.isAdmin()).toBe(false);
    expect(authService.isPartner()).toBe(false);
  });

  describe('loginWithGoogle', () => {
    it('should authenticate successfully with Google OAuth2', async () => {
      vi.spyOn(pbService.pb.collection('users'), 'authWithOAuth2').mockResolvedValue({
        token: createMockJwt(),
        record: mockAdminRecord,
        meta: { isNew: false },
      } as any);

      const result = await authService.loginWithGoogle();

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('admin@reydelarrecife.local');
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.isAdmin()).toBe(true);
      expect(authService.authError()).toBeNull();
    });

    it('should handle user closing OAuth popup (isAbort)', async () => {
      const abortError = new ClientResponseError({
        isAbort: true,
        message: 'The request was autocancelled.',
      });

      vi.spyOn(pbService.pb.collection('users'), 'authWithOAuth2').mockRejectedValue(abortError);

      const result = await authService.loginWithGoogle();

      expect(result.success).toBe(false);
      expect(result.isCancelled).toBe(true);
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.authError()).toContain('cancelado');
    });

    it('should handle 403 Forbidden whitelist rejection error', async () => {
      const whitelistError = new ClientResponseError({
        status: 403,
        response: {
          message: 'El correo desconocido@gmail.com no ha sido invitado ni autorizado por un administrador.',
        },
      });

      vi.spyOn(pbService.pb.collection('users'), 'authWithOAuth2').mockRejectedValue(whitelistError);

      const result = await authService.loginWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toContain('no ha sido invitado ni autorizado');
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.authError()).toContain('no ha sido invitado ni autorizado');
    });

    it('should handle generic error', async () => {
      vi.spyOn(pbService.pb.collection('users'), 'authWithOAuth2').mockRejectedValue(
        new Error('Network failure')
      );

      const result = await authService.loginWithGoogle();

      expect(result.success).toBe(false);
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.authError()).toContain('Network failure');
    });
  });

  describe('loginWithPassword', () => {
    it('should log in successfully with credentials', async () => {
      vi.spyOn(pbService.pb.collection('users'), 'authWithPassword').mockResolvedValue({
        token: createMockJwt(),
        record: mockPartnerRecord,
      } as any);

      const result = await authService.loginWithPassword('partner@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('partner');
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.isPartner()).toBe(true);
    });

    it('should handle invalid credentials error', async () => {
      vi.spyOn(pbService.pb.collection('users'), 'authWithPassword').mockRejectedValue(
        new ClientResponseError({
          status: 400,
          response: { message: 'Failed to authenticate.' },
        })
      );

      const result = await authService.loginWithPassword('bad@test.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to authenticate.');
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear authStore, reset signals and navigate to /login', () => {
      const token = createMockJwt();
      pbService.pb.authStore.save(token, mockAdminRecord);
      expect(authService.isAuthenticated()).toBe(true);

      authService.logout(true, '/login');

      expect(pbService.pb.authStore.isValid).toBe(false);
      expect(authService.currentUser()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });
  });

  describe('refreshSession', () => {
    it('should return false if authStore is not valid', async () => {
      pbService.pb.authStore.clear();
      const refreshed = await authService.refreshSession();
      expect(refreshed).toBe(false);
    });

    it('should refresh session successfully when valid token exists', async () => {
      const token = createMockJwt();
      pbService.pb.authStore.save(token, mockAdminRecord);

      vi.spyOn(pbService.pb.collection('users'), 'authRefresh').mockResolvedValue({
        token: createMockJwt(),
        record: { ...mockAdminRecord, name: 'Updated Admin Name' },
      } as any);

      const refreshed = await authService.refreshSession();

      expect(refreshed).toBe(true);
      expect(authService.currentUser()?.name).toBe('Updated Admin Name');
    });

    it('should logout and return false when authRefresh fails', async () => {
      const token = createMockJwt();
      pbService.pb.authStore.save(token, mockAdminRecord);

      vi.spyOn(pbService.pb.collection('users'), 'authRefresh').mockRejectedValue(
        new ClientResponseError({ status: 401 })
      );

      const refreshed = await authService.refreshSession();

      expect(refreshed).toBe(false);
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
