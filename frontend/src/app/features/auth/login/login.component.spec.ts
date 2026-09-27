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

  it('should redirect to /inventario by default when login succeeds', async () => {
    mockAuthService.loginWithGoogle.mockResolvedValue({
      success: true,
      user: { id: 'u1', role: 'partner', email: 'test@example.com' },
    });

    await component.onLoginWithGoogle();

    expect(mockAuthService.loginWithGoogle).toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/inventario');
  });

  it('should redirect to returnUrl when specified in queryParams and login succeeds', async () => {
    queryParams['returnUrl'] = '/admin/usuarios';
    mockAuthService.loginWithGoogle.mockResolvedValue({
      success: true,
      user: { id: 'u1', role: 'admin', email: 'admin@example.com' },
    });

    await component.onLoginWithGoogle();

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/admin/usuarios');
  });

  it('should not redirect when login fails', async () => {
    mockAuthService.loginWithGoogle.mockResolvedValue({
      success: false,
      error: 'Acceso denegado',
    });

    await component.onLoginWithGoogle();

    expect(mockAuthService.loginWithGoogle).toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
  });
});
