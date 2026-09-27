import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { BottomNavComponent } from './bottom-nav.component';

describe('BottomNavComponent', () => {
  let component: BottomNavComponent;
  let fixture: ComponentFixture<BottomNavComponent>;

  const mockUserSignal = signal<User | null>({
    id: 'user-partner',
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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create BottomNav component', () => {
    expect(component).toBeTruthy();
  });

  it('should not show usuarios tab for partner role', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#mobile-nav-usuarios')).toBeNull();
    expect(compiled.querySelector('#mobile-nav-inventario')).toBeTruthy();
    expect(compiled.querySelector('#mobile-nav-gastos')).toBeTruthy();
  });
});
