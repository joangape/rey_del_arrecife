import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { LayoutStateService } from '../layout-state.service';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        ThemeService,
        LayoutStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create sidebar component', () => {
    expect(component).toBeTruthy();
  });

  it('should show all nav items including admin for admin user', () => {
    const items = component.visibleNavItems();
    expect(items.some((i) => i.id === 'nav-usuarios')).toBe(true);
    expect(items.some((i) => i.id === 'nav-inventario')).toBe(true);
    expect(items.some((i) => i.id === 'nav-gastos')).toBe(true);
  });

  it('should compute user initials correctly', () => {
    expect(component.userInitials()).toBe('AJ');
  });

  it('should call authService.logout on confirmLogout', () => {
    component.confirmLogout();
    expect(mockAuthService.logout).toHaveBeenCalledWith(true, '/login');
  });
});
