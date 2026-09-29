import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';
import { PocketBaseService } from './pocketbase.service';
import { UsersService, generateSecurePassword } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockPbService: any;
  let mockAuthService: any;
  let getFullListSpy: any;
  let createSpy: any;
  let updateSpy: any;
  let deleteSpy: any;
  let requestVerificationSpy: any;

  const mockUsersList: User[] = [
    {
      id: 'admin-1',
      email: 'admin@reydelarrecife.local',
      name: 'Admin Principal',
      role: 'admin',
      active: true,
      created: '2026-01-01 10:00:00',
    },
    {
      id: 'partner-1',
      email: 'socio@gmail.com',
      name: 'Carlos Socio',
      role: 'partner',
      active: true,
      created: '2026-02-01 10:00:00',
    },
    {
      id: 'partner-2',
      email: 'bloqueado@gmail.com',
      name: 'Elena Inactiva',
      role: 'partner',
      active: false,
      created: '2026-03-01 10:00:00',
    },
  ];

  beforeEach(() => {
    getFullListSpy = vi.fn().mockResolvedValue(mockUsersList);
    createSpy = vi.fn().mockImplementation((payload: any) =>
      Promise.resolve({
        id: 'new-user-id',
        ...payload,
      })
    );
    updateSpy = vi.fn().mockImplementation((id: string, payload: any) =>
      Promise.resolve({
        id,
        ...mockUsersList.find((u) => u.id === id),
        ...payload,
      })
    );
    deleteSpy = vi.fn().mockResolvedValue(true);
    requestVerificationSpy = vi.fn().mockResolvedValue(true);

    mockPbService = {
      pb: {
        collection: vi.fn((colName: string) => {
          if (colName === 'users') {
            return {
              getFullList: getFullListSpy,
              create: createSpy,
              update: updateSpy,
              delete: deleteSpy,
              requestVerification: requestVerificationSpy,
            };
          }
          return {};
        }),
      },
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue({
        id: 'admin-1',
        email: 'admin@reydelarrecife.local',
        role: 'admin',
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        UsersService,
        { provide: PocketBaseService, useValue: mockPbService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(UsersService);
  });

  describe('generateSecurePassword helper', () => {
    it('debe generar una contraseña de longitud adecuada con mezcla de caracteres', () => {
      const pwd = generateSecurePassword(24);
      expect(pwd.length).toBe(24);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
      expect(/[!@#$%^&*()_+\-=[\]{}|]/.test(pwd)).toBe(true);
    });
  });

  describe('Carga de usuarios y listado reactivo', () => {
    it('debe cargar la lista de usuarios y mapear sus campos', async () => {
      const users = await service.loadUsers();
      expect(users.length).toBe(3);
      expect(service.users().length).toBe(3);
      expect(service.totalCount()).toBe(3);
      expect(service.adminCount()).toBe(1);
      expect(service.partnerCount()).toBe(2);
      expect(service.activeCount()).toBe(2);
      expect(service.inactiveCount()).toBe(1);
    });

    it('debe manejar errores en loadUsers y registrarlos en error()', async () => {
      getFullListSpy.mockRejectedValueOnce(new Error('Network error'));
      await expect(service.loadUsers()).rejects.toThrow('Network error');
      expect(service.error()).toBe('Network error');
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('Filtros y lista computada filteredUsers', () => {
    beforeEach(async () => {
      await service.loadUsers();
    });

    it('debe filtrar por texto en nombre y email', () => {
      service.setSearchQuery('carlos');
      expect(service.filteredUsers().length).toBe(1);
      expect(service.filteredUsers()[0].email).toBe('socio@gmail.com');

      service.setSearchQuery('admin@');
      expect(service.filteredUsers().length).toBe(1);
      expect(service.filteredUsers()[0].name).toBe('Admin Principal');
    });

    it('debe filtrar por rol', () => {
      service.setRoleFilter('admin');
      expect(service.filteredUsers().length).toBe(1);
      expect(service.filteredUsers()[0].role).toBe('admin');

      service.setRoleFilter('partner');
      expect(service.filteredUsers().length).toBe(2);
    });

    it('debe filtrar por estado activo/inactivo', () => {
      service.setStatusFilter('active');
      expect(service.filteredUsers().length).toBe(2);

      service.setStatusFilter('inactive');
      expect(service.filteredUsers().length).toBe(1);
      expect(service.filteredUsers()[0].id).toBe('partner-2');
    });

    it('debe resetear los filtros al invocar resetFilters', () => {
      service.setSearchQuery('carlos');
      service.setRoleFilter('partner');
      service.setStatusFilter('active');
      expect(service.filteredUsers().length).toBe(1);

      service.resetFilters();
      expect(service.filteredUsers().length).toBe(3);
      expect(service.searchQuery()).toBe('');
      expect(service.roleFilter()).toBe('all');
      expect(service.statusFilter()).toBe('all');
    });
  });

  describe('Creación de usuarios (createUser)', () => {
    it('debe crear un usuario con clave autogenerada y solicitar verificación', async () => {
      const created = await service.createUser({
        email: 'nuevo@empresa.com',
        name: 'Nuevo Socio',
        role: 'partner',
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'nuevo@empresa.com',
          name: 'Nuevo Socio',
          role: 'partner',
          active: true,
        })
      );
      expect(requestVerificationSpy).toHaveBeenCalledWith('nuevo@empresa.com');
      expect(created.id).toBe('new-user-id');
    });

    it('debe respetar una contraseña manual provista', async () => {
      await service.createUser({
        email: 'manual@empresa.com',
        name: 'Manual Pwd',
        role: 'partner',
        password: 'CustomPassword123!',
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'CustomPassword123!',
          passwordConfirm: 'CustomPassword123!',
        })
      );
    });
  });

  describe('Actualización y Auto-Protección (updateUser)', () => {
    it('debe actualizar los datos de otro usuario', async () => {
      await service.updateUser('partner-1', {
        name: 'Carlos Actualizado',
      });

      expect(updateSpy).toHaveBeenCalledWith(
        'partner-1',
        expect.objectContaining({
          name: 'Carlos Actualizado',
        })
      );
    });

    it('debe impedir auto-degradación de rol del propio admin', async () => {
      await expect(
        service.updateUser('admin-1', {
          role: 'partner',
        })
      ).rejects.toThrow('No puedes cambiar tu propio rol de Administrador a Socio.');
    });
  });

  describe('Conmutación de Estado (toggleUserActive)', () => {
    beforeEach(async () => {
      await service.loadUsers();
    });

    it('debe desactivar o activar a otro usuario', async () => {
      await service.toggleUserActive('partner-1', false);
      expect(updateSpy).toHaveBeenCalledWith('partner-1', { active: false });
    });

    it('debe impedir auto-desactivación del propio admin en sesión', async () => {
      await expect(service.toggleUserActive('admin-1', false)).rejects.toThrow(
        'No puedes desactivar tu propia cuenta de administrador.'
      );
    });
  });

  describe('Eliminación y Auto-Protección (deleteUser)', () => {
    beforeEach(async () => {
      await service.loadUsers();
    });

    it('debe eliminar a otro usuario y actualizar la lista reactiva', async () => {
      const ok = await service.deleteUser('partner-2');
      expect(ok).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith('partner-2');
      expect(service.users().some((u) => u.id === 'partner-2')).toBe(false);
    });

    it('debe impedir auto-eliminación del propio admin en sesión', async () => {
      await expect(service.deleteUser('admin-1')).rejects.toThrow(
        'No puedes eliminar tu propia cuenta de administrador.'
      );
    });
  });

  describe('Reenvío de Verificación (resendVerificationEmail)', () => {
    it('debe llamar a requestVerification con el email formateado', async () => {
      const ok = await service.resendVerificationEmail(' Socio@Gmail.com ');
      expect(ok).toBe(true);
      expect(requestVerificationSpy).toHaveBeenCalledWith('socio@gmail.com');
    });
  });
});
