import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;

  const mockUserSignal = signal<User | null>({
    id: 'user-admin',
    collectionId: '_pb_users_auth_',
    collectionName: 'users',
    email: 'admin@reydelarrecife.local',
    name: 'Admin Joyas',
    avatar: '',
    role: 'admin',
    active: true,
    created: '2026-01-01',
    updated: '2026-01-01',
  });

  const mockAuthService = {
    currentUser: mockUserSignal.asReadonly(),
    isAdmin: signal(true).asReadonly(),
    isPartner: signal(false).asReadonly(),
    logout: vi.fn(),
  };

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        ThemeService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create AppShell component', () => {
    expect(component).toBeTruthy();
  });

  it('should render header and sidebar in template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-bottom-nav')).toBeTruthy();
    expect(compiled.querySelector('hlm-toaster')).toBeTruthy();
  });
});
