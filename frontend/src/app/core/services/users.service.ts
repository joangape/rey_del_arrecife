import { Injectable, computed, inject, signal } from '@angular/core';
import { RecordModel } from 'pocketbase';
import {
  CreateUserDto,
  UpdateUserDto,
  User,
  UserRole,
  UserRoleFilter,
  UserStatusFilter,
} from '../models/user.model';
import { AuthService } from './auth.service';
import { PocketBaseService } from './pocketbase.service';

/**
 * Genera una contraseña aleatoria criptográficamente segura con mayúsculas,
 * minúsculas, números y símbolos para cumplir los requisitos de PocketBase.
 */
export function generateSecurePassword(length = 24): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|';
  const all = lowercase + uppercase + numbers + symbols;

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  // Asegurar al menos uno de cada categoría requerida
  const passwordChars = [
    lowercase[array[0] % lowercase.length],
    uppercase[array[1] % uppercase.length],
    numbers[array[2] % numbers.length],
    symbols[array[3] % symbols.length],
  ];

  for (let i = 4; i < length; i++) {
    passwordChars.push(all[array[i] % all.length]);
  }

  // Mezclar array aleatoriamente
  return passwordChars.sort(() => Math.random() - 0.5).join('');
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly pbService = inject(PocketBaseService);
  private readonly authService = inject(AuthService);

  // Estado reactivo con Signals
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();

  private readonly _isLoading = signal<boolean>(false);
  readonly isLoading = this._isLoading.asReadonly();

  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  // Filtros reactivos
  private readonly _searchQuery = signal<string>('');
  readonly searchQuery = this._searchQuery.asReadonly();

  private readonly _roleFilter = signal<UserRoleFilter>('all');
  readonly roleFilter = this._roleFilter.asReadonly();

  private readonly _statusFilter = signal<UserStatusFilter>('all');
  readonly statusFilter = this._statusFilter.asReadonly();

  // Lista filtrada computada en memoria
  readonly filteredUsers = computed(() => {
    const list = this._users();
    const query = this._searchQuery().trim().toLowerCase();
    const role = this._roleFilter();
    const status = this._statusFilter();

    return list.filter((user) => {
      // 1. Filtro por Rol
      if (role !== 'all' && user.role !== role) {
        return false;
      }

      // 2. Filtro por Estado
      if (status === 'active' && !user.active) {
        return false;
      }
      if (status === 'inactive' && user.active) {
        return false;
      }

      // 3. Búsqueda por texto (nombre o email)
      if (query) {
        const nameMatch = user.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = user.email.toLowerCase().includes(query);
        return nameMatch || emailMatch;
      }

      return true;
    });
  });

  // Métricas computadas
  readonly totalCount = computed(() => this._users().length);
  readonly activeCount = computed(() => this._users().filter((u) => u.active).length);
  readonly inactiveCount = computed(() => this._users().filter((u) => !u.active).length);
  readonly adminCount = computed(() => this._users().filter((u) => u.role === 'admin').length);
  readonly partnerCount = computed(() => this._users().filter((u) => u.role === 'partner').length);

  /**
   * Carga la lista completa de usuarios autorizados desde PocketBase ordenada por fecha de creación desc.
   */
  async loadUsers(): Promise<User[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const records = await this.pbService.pb.collection('users').getFullList({
        sort: '-created',
      });

      const mappedUsers = records.map((r) => this.mapRecordToUser(r));
      this._users.set(mappedUsers);
      return mappedUsers;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los usuarios.';
      this._error.set(msg);
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Da de alta a un nuevo usuario autorizándolo para Google OAuth2 o con contraseña manual.
   * Envía automáticamente el correo de verificación/bienvenida de PocketBase si está configurado.
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    this._isLoading.set(true);
    this._error.set(null);

    const email = dto.email.trim().toLowerCase();
    const password = dto.password?.trim() || generateSecurePassword();

    try {
      const payload: Record<string, unknown> = {
        email,
        name: dto.name?.trim() || '',
        role: dto.role,
        active: true,
        emailVisibility: true,
        password,
        passwordConfirm: password,
      };

      const record = await this.pbService.pb.collection('users').create(payload);
      const newUser = this.mapRecordToUser(record);

      // Intentar enviar el correo de verificación nativo de PocketBase (ignorar error si SMTP no está configurado)
      try {
        await this.pbService.pb.collection('users').requestVerification(email);
      } catch (mailErr) {
        console.warn('No se pudo enviar el correo de verificación automático:', mailErr);
      }

      await this.loadUsers();
      return newUser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el usuario.';
      this._error.set(msg);
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Actualiza los datos de un usuario existente en PocketBase.
   * Aplica guardas de auto-protección impidiendo auto-degradación de rol si es el propio admin.
   */
  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const currentUserId = this.authService.currentUser()?.id;

    if (currentUserId === id && dto.role && dto.role !== 'admin') {
      throw new Error('No puedes cambiar tu propio rol de Administrador a Socio.');
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const payload: Record<string, unknown> = {};

      if (dto.name !== undefined) payload['name'] = dto.name.trim();
      if (dto.role !== undefined) payload['role'] = dto.role;
      if (dto.active !== undefined) payload['active'] = dto.active;
      if (dto.email !== undefined) payload['email'] = dto.email.trim().toLowerCase();
      if (dto.password) {
        payload['password'] = dto.password;
        payload['passwordConfirm'] = dto.passwordConfirm || dto.password;
      }

      const record = await this.pbService.pb.collection('users').update(id, payload);
      const updatedUser = this.mapRecordToUser(record);

      await this.loadUsers();
      return updatedUser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el usuario.';
      this._error.set(msg);
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Conmuta el estado activo/inactivo de un usuario.
   * Impide auto-desactivación del propio usuario autenticado.
   */
  async toggleUserActive(id: string, active: boolean): Promise<User> {
    const currentUserId = this.authService.currentUser()?.id;

    if (currentUserId === id && !active) {
      throw new Error('No puedes desactivar tu propia cuenta de administrador.');
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const record = await this.pbService.pb.collection('users').update(id, { active });
      const updated = this.mapRecordToUser(record);

      // Actualizar localmente para reactividad inmediata sin parpadeo
      this._users.update((list) => list.map((u) => (u.id === id ? { ...u, active } : u)));
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al modificar el estado del usuario.';
      this._error.set(msg);
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Elimina un usuario de PocketBase tras verificar que no se trate de la propia cuenta en sesión.
   */
  async deleteUser(id: string): Promise<boolean> {
    const currentUserId = this.authService.currentUser()?.id;

    if (currentUserId === id) {
      throw new Error('No puedes eliminar tu propia cuenta de administrador.');
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.pbService.pb.collection('users').delete(id);
      this._users.update((list) => list.filter((u) => u.id !== id));
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el usuario.';
      this._error.set(msg);
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Reenvía bajo demanda el correo nativo de verificación de PocketBase.
   */
  async resendVerificationEmail(email: string): Promise<boolean> {
    try {
      await this.pbService.pb.collection('users').requestVerification(email.trim().toLowerCase());
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reenviar el correo de verificación.';
      this._error.set(msg);
      throw err;
    }
  }

  // Setters para filtros reactivos
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  setRoleFilter(role: UserRoleFilter): void {
    this._roleFilter.set(role);
  }

  setStatusFilter(status: UserStatusFilter): void {
    this._statusFilter.set(status);
  }

  resetFilters(): void {
    this._searchQuery.set('');
    this._roleFilter.set('all');
    this._statusFilter.set('all');
  }

  private mapRecordToUser(record: RecordModel): User {
    return {
      id: record.id,
      collectionId: record.collectionId,
      collectionName: record.collectionName,
      email: record['email'] || '',
      name: record['name'] || '',
      avatar: record['avatar'] || '',
      role: (record['role'] as UserRole) || 'partner',
      active: record['active'] ?? true,
      created: record['created'],
      updated: record['updated'],
    };
  }
}
