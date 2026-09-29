import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { UsuariosComponent } from './usuarios.component';

describe('UsuariosComponent', () => {
  let component: UsuariosComponent;
  let fixture: ComponentFixture<UsuariosComponent>;
  let mockUsersService: any;
  let mockAuthService: any;

  const mockAdminUser: User = {
    id: 'admin-1',
    email: 'admin@reydelarrecife.local',
    name: 'Admin Boss',
    role: 'admin',
    active: true,
    created: '2026-01-01 12:00:00',
  };

  const mockPartnerUser: User = {
    id: 'partner-1',
    email: 'socio@gmail.com',
    name: 'Carlos Socio',
    role: 'partner',
    active: true,
    created: '2026-02-15 15:30:00',
  };

  const filteredUsersSignal = signal<User[]>([mockAdminUser, mockPartnerUser]);
  const isLoadingSignal = signal<boolean>(false);
  const searchQuerySignal = signal<string>('');
  const roleFilterSignal = signal<string>('all');
  const statusFilterSignal = signal<string>('all');

  beforeEach(async () => {
    filteredUsersSignal.set([mockAdminUser, mockPartnerUser]);
    isLoadingSignal.set(false);
    searchQuerySignal.set('');
    roleFilterSignal.set('all');
    statusFilterSignal.set('all');

    mockUsersService = {
      filteredUsers: filteredUsersSignal,
      isLoading: isLoadingSignal,
      searchQuery: searchQuerySignal,
      roleFilter: roleFilterSignal,
      statusFilter: statusFilterSignal,
      totalCount: signal(2),
      adminCount: signal(1),
      partnerCount: signal(1),
      loadUsers: vi.fn().mockResolvedValue([mockAdminUser, mockPartnerUser]),
      setSearchQuery: vi.fn((q) => searchQuerySignal.set(q)),
      setRoleFilter: vi.fn((r) => roleFilterSignal.set(r)),
      setStatusFilter: vi.fn((s) => statusFilterSignal.set(s)),
      resetFilters: vi.fn(() => {
        searchQuerySignal.set('');
        roleFilterSignal.set('all');
        statusFilterSignal.set('all');
      }),
      toggleUserActive: vi.fn().mockResolvedValue({ ...mockPartnerUser, active: false }),
      deleteUser: vi.fn().mockResolvedValue(true),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(mockAdminUser),
    };

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e invocar loadUsers en ngOnInit', () => {
    expect(component).toBeTruthy();
    expect(mockUsersService.loadUsers).toHaveBeenCalled();
    expect(component.users().length).toBe(2);
  });

  describe('Búsqueda y Filtros', () => {
    it('debe delegar la búsqueda en usersService.setSearchQuery', () => {
      component.onSearchChange('carlos');
      expect(mockUsersService.setSearchQuery).toHaveBeenCalledWith('carlos');

      component.clearSearch();
      expect(mockUsersService.setSearchQuery).toHaveBeenCalledWith('');
    });

    it('debe delegar el cambio de rol en usersService.setRoleFilter', () => {
      component.onRoleChange('partner');
      expect(mockUsersService.setRoleFilter).toHaveBeenCalledWith('partner');
    });

    it('debe delegar el cambio de estado en usersService.setStatusFilter', () => {
      component.onStatusChange('active');
      expect(mockUsersService.setStatusFilter).toHaveBeenCalledWith('active');
    });

    it('debe delegar el reseteo de filtros en usersService.resetFilters', () => {
      component.resetAllFilters();
      expect(mockUsersService.resetFilters).toHaveBeenCalled();
    });
  });

  describe('Gestión de Diálogos de Formulario', () => {
    it('debe abrir el diálogo en modo creación al invocar openCreateDialog', () => {
      component.openCreateDialog();
      expect(component.selectedUserForEdit()).toBeNull();
      expect(component.isFormOpen()).toBe(true);
    });

    it('debe abrir el diálogo en modo edición al invocar openEditDialog', () => {
      component.openEditDialog(mockPartnerUser);
      expect(component.selectedUserForEdit()).toEqual(mockPartnerUser);
      expect(component.isFormOpen()).toBe(true);
    });

    it('debe mostrar mensaje de éxito al guardar usuario', () => {
      component.onUserSaved(mockPartnerUser);
      expect(component.successNotice()).toContain(mockPartnerUser.email);
    });
  });

  describe('Conmutación de Estado y Auto-Protección', () => {
    it('debe conmutar el estado activo para otro usuario', async () => {
      await component.onToggleActive(mockPartnerUser);
      expect(mockUsersService.toggleUserActive).toHaveBeenCalledWith('partner-1', false);
      expect(component.actionError()).toBeNull();
    });

    it('debe bloquear la conmutación de estado si es el propio admin autenticado', async () => {
      await component.onToggleActive(mockAdminUser);
      expect(component.actionError()).toBe('No puedes desactivar tu propia cuenta de administrador.');
      expect(mockUsersService.toggleUserActive).not.toHaveBeenCalled();
    });
  });

  describe('Eliminación y Auto-Protección', () => {
    it('debe abrir el diálogo de confirmación para otro usuario', () => {
      component.openDeleteDialog(mockPartnerUser);
      expect(component.userToDelete()).toEqual(mockPartnerUser);
      expect(component.isDeleteDialogOpen()).toBe(true);
    });

    it('debe bloquear la apertura del diálogo de eliminación si es el propio admin', () => {
      component.openDeleteDialog(mockAdminUser);
      expect(component.actionError()).toBe('No puedes eliminar tu propia cuenta de administrador.');
      expect(component.isDeleteDialogOpen()).toBe(false);
    });

    it('debe ejecutar la eliminación al confirmar', async () => {
      component.openDeleteDialog(mockPartnerUser);
      await component.executeDelete();

      expect(mockUsersService.deleteUser).toHaveBeenCalledWith('partner-1');
      expect(component.isDeleteDialogOpen()).toBe(false);
      expect(component.userToDelete()).toBeNull();
      expect(component.successNotice()).toContain('ha sido eliminado permanentemente');
    });
  });

  describe('Helpers de Presentación', () => {
    it('debe calcular correctamente las iniciales', () => {
      expect(component.getInitials('Carlos Gómez')).toBe('CG');
      expect(component.getInitials('Admin')).toBe('AD');
      expect(component.getInitials(undefined, 'correo@gmail.com')).toBe('CO');
    });

    it('debe formatear fechas en formato local dd/MM/yyyy', () => {
      const formatted = component.formatDate('2026-02-15 15:30:00');
      expect(formatted).toBe('15/02/2026');
    });

    it('debe retornar color de avatar consistente para un id', () => {
      const color1 = component.getAvatarColor('partner-1');
      const color2 = component.getAvatarColor('partner-1');
      expect(color1).toBe(color2);
    });
  });
});
