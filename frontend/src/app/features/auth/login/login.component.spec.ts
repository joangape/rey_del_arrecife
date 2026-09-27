import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: {
    loginWithGoogle: ReturnType<typeof vi.fn>;
    loginWithPassword: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
    authError: ReturnType<typeof signal<string | null>>;
    isLoading: ReturnType<typeof signal<boolean>>;
  };
  let mockRouter: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };
  let queryParams: Record<string, string>;

  beforeEach(async () => {
    queryParams = {};
    mockAuthService = {
      loginWithGoogle: vi.fn(),
      loginWithPassword: vi.fn(),
      clearError: vi.fn(),
      authError: signal<string | null>(null),
      isLoading: signal<boolean>(false),
    };

    mockRouter = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParams() {
                return queryParams;
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  describe('Google OAuth Login', () => {
    it('should redirect to /inventario by default when Google login succeeds', async () => {
      mockAuthService.loginWithGoogle.mockResolvedValue({
        success: true,
        user: { id: 'u1', role: 'partner', email: 'test@example.com' },
      });

      await component.onLoginWithGoogle();

      expect(mockAuthService.loginWithGoogle).toHaveBeenCalled();
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/inventario');
    });

    it('should redirect to returnUrl when specified in queryParams and Google login succeeds', async () => {
      queryParams['returnUrl'] = '/admin/usuarios';
      mockAuthService.loginWithGoogle.mockResolvedValue({
        success: true,
        user: { id: 'u1', role: 'admin', email: 'admin@example.com' },
      });

      await component.onLoginWithGoogle();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/admin/usuarios');
    });

    it('should not redirect when Google login fails', async () => {
      mockAuthService.loginWithGoogle.mockResolvedValue({
        success: false,
        error: 'Acceso denegado',
      });

      await component.onLoginWithGoogle();

      expect(mockAuthService.loginWithGoogle).toHaveBeenCalled();
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('Password Login', () => {
    it('should show validation error when fields are empty', async () => {
      component.email.set('');
      component.password.set('');

      await component.onLoginWithPassword();

      expect(mockAuthService.loginWithPassword).not.toHaveBeenCalled();
      expect(component.localError()).toBe('Por favor, introduce tu correo y contraseña.');
    });

    it('should authenticate successfully with email and password and redirect to /inventario', async () => {
      component.email.set('admin@reydelarrecife.local');
      component.password.set('Password2026!');

      mockAuthService.loginWithPassword.mockResolvedValue({
        success: true,
        user: { id: 'admin1', role: 'admin', email: 'admin@reydelarrecife.local' },
      });

      await component.onLoginWithPassword();

      expect(mockAuthService.loginWithPassword).toHaveBeenCalledWith(
        'admin@reydelarrecife.local',
        'Password2026!'
      );
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/inventario');
    });

    it('should redirect to returnUrl on successful password login', async () => {
      queryParams['returnUrl'] = '/gastos';
      component.email.set('partner@reydelarrecife.local');
      component.password.set('Password2026!');

      mockAuthService.loginWithPassword.mockResolvedValue({
        success: true,
        user: { id: 'partner1', role: 'partner', email: 'partner@reydelarrecife.local' },
      });

      await component.onLoginWithPassword();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/gastos');
    });

    it('should not redirect when password login fails', async () => {
      component.email.set('user@reydelarrecife.local');
      component.password.set('wrong-pass');

      mockAuthService.loginWithPassword.mockResolvedValue({
        success: false,
        error: 'Credenciales inválidas',
      });

      await component.onLoginWithPassword();

      expect(mockAuthService.loginWithPassword).toHaveBeenCalled();
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('Demo Credentials & UI Controls', () => {
    it('should autofill admin credentials when clicking Admin Demo chip', () => {
      component.fillDemoCredentials('admin');

      expect(component.email()).toBe('admin@reydelarrecife.local');
      expect(component.password()).toBe('Password2026!');
      expect(component.localError()).toBeNull();
    });

    it('should autofill partner credentials when clicking Partner Demo chip', () => {
      component.fillDemoCredentials('partner');

      expect(component.email()).toBe('partner@reydelarrecife.local');
      expect(component.password()).toBe('Password2026!');
      expect(component.localError()).toBeNull();
    });

    it('should toggle password visibility signal', () => {
      expect(component.showPassword()).toBe(false);
      component.toggleShowPassword();
      expect(component.showPassword()).toBe(true);
      component.toggleShowPassword();
      expect(component.showPassword()).toBe(false);
    });

    it('should clear errors both locally and in AuthService', () => {
      component.localError.set('Un error');
      component.clearError();

      expect(component.localError()).toBeNull();
      expect(mockAuthService.clearError).toHaveBeenCalled();
    });
  });
});
