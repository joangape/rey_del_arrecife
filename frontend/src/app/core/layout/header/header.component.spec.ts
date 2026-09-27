import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { LayoutStateService } from '../layout-state.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  const mockUserSignal = signal<User | null>({
    id: 'user-1',
    collectionId: '_pb_users_auth_',
    collectionName: 'users',
    email: 'socio@reydelarrecife.local',
    name: 'Socio Coral',
    avatar: '',
    role: 'partner',
    active: true,
    created: '2026-01-01',
    updated: '2026-01-01',
  });

  const mockAuthService = {
    currentUser: mockUserSignal.asReadonly(),
    isAdmin: signal(false).asReadonly(),
    isPartner: signal(true).asReadonly(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        ThemeService,
        LayoutStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create header component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute user initials for partner', () => {
    expect(component.userInitials()).toBe('SC');
  });

  it('should update search query in layoutState', () => {
    const layoutState = TestBed.inject(LayoutStateService);
    component.onSearchInput({ target: { value: 'Coral Anillo' } } as unknown as Event);
    expect(layoutState.searchQuery()).toBe('Coral Anillo');
  });

  it('should call authService.logout on confirmLogout', () => {
    component.confirmLogout();
    expect(mockAuthService.logout).toHaveBeenCalledWith(true, '/login');
  });
});
