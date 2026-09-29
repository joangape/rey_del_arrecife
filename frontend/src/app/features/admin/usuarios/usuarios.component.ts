import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideCalendar,
  lucideCheck,
  lucideFilter,
  lucideLoader2,
  lucideLock,
  lucideMail,
  lucidePencil,
  lucideRefreshCw,
  lucideSearch,
  lucideShield,
  lucideTrash2,
  lucideUser,
  lucideUserPlus,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { User, UserRoleFilter, UserStatusFilter } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { UserFormDialogComponent } from './user-form-dialog/user-form-dialog.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    FormsModule,
    NgIcon,
    ...HlmTableImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmInputImports,
    UserFormDialogComponent,
  ],
  providers: [
    provideIcons({
      lucideUser,
      lucideUserPlus,
      lucideSearch,
      lucideX,
      lucideFilter,
      lucideShield,
      lucideCheck,
      lucidePencil,
      lucideTrash2,
      lucideAlertCircle,
      lucideLoader2,
      lucideCalendar,
      lucideMail,
      lucideLock,
      lucideRefreshCw,
    }),
  ],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements OnInit {
  readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);

  // Estado reactivo computado
  readonly users = this.usersService.filteredUsers;
  readonly isLoading = this.usersService.isLoading;
  readonly currentUserId = computed(() => this.authService.currentUser()?.id);

  // Estado de los Diálogos
  readonly isFormOpen = signal<boolean>(false);
  readonly selectedUserForEdit = signal<User | null>(null);

  readonly isDeleteDialogOpen = signal<boolean>(false);
  readonly userToDelete = signal<User | null>(null);
  readonly isDeleting = signal<boolean>(false);

  // Notificaciones y Alertas temporales
  readonly actionError = signal<string | null>(null);
  readonly successNotice = signal<string | null>(null);

  // Opciones de Filtros
  readonly roleOptions: { value: UserRoleFilter; label: string }[] = [
    { value: 'all', label: 'Todos los roles' },
    { value: 'admin', label: '👑 Administradores' },
    { value: 'partner', label: '🐠 Socios' },
  ];

  readonly statusOptions: { value: UserStatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  readonly hasActiveFilters = computed(
    () =>
      this.usersService.searchQuery().trim() !== '' ||
      this.usersService.roleFilter() !== 'all' ||
      this.usersService.statusFilter() !== 'all'
  );

  ngOnInit(): void {
    this.usersService.loadUsers().catch(() => {});
  }

  // Búsqueda y Filtros
  onSearchChange(query: string): void {
    this.usersService.setSearchQuery(query);
  }

  clearSearch(): void {
    this.usersService.setSearchQuery('');
  }

  onRoleChange(role: UserRoleFilter): void {
    this.usersService.setRoleFilter(role);
  }

  onStatusChange(status: UserStatusFilter): void {
    this.usersService.setStatusFilter(status);
  }

  resetAllFilters(): void {
    this.usersService.resetFilters();
  }

  // Diálogo de Alta / Invitación
  openCreateDialog(): void {
    this.actionError.set(null);
    this.selectedUserForEdit.set(null);
    this.isFormOpen.set(true);
  }

  // Diálogo de Edición
  openEditDialog(user: User): void {
    this.actionError.set(null);
    this.selectedUserForEdit.set(user);
    this.isFormOpen.set(true);
  }

  onUserSaved(user: User): void {
    this.showSuccessNotice(
      `Usuario ${user.email} ${this.selectedUserForEdit() ? 'actualizado' : 'invitado'} con éxito.`
    );
  }

  // Conmutación de Estado Activo / Inactivo con Auto-protección
  async onToggleActive(user: User): Promise<void> {
    this.actionError.set(null);

    if (user.id === this.currentUserId()) {
      this.actionError.set('No puedes desactivar tu propia cuenta de administrador.');
      return;
    }

    try {
      const nextActive = !user.active;
      await this.usersService.toggleUserActive(user.id, nextActive);
      this.showSuccessNotice(
        `Usuario ${user.email} ${nextActive ? 'activado' : 'desactivado'} correctamente.`
      );
    } catch (err: unknown) {
      this.actionError.set(
        err instanceof Error ? err.message : 'Error al modificar el estado del usuario.'
      );
    }
  }

  // Diálogo de Eliminación con Auto-protección
  openDeleteDialog(user: User): void {
    this.actionError.set(null);

    if (user.id === this.currentUserId()) {
      this.actionError.set('No puedes eliminar tu propia cuenta de administrador.');
      return;
    }

    this.userToDelete.set(user);
    this.isDeleteDialogOpen.set(true);
  }

  closeDeleteDialog(): void {
    this.isDeleteDialogOpen.set(false);
    this.userToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const user = this.userToDelete();
    if (!user) return;

    this.isDeleting.set(true);
    this.actionError.set(null);

    try {
      await this.usersService.deleteUser(user.id);
      this.showSuccessNotice(`El usuario ${user.email} ha sido eliminado permanentemente.`);
      this.closeDeleteDialog();
    } catch (err: unknown) {
      this.actionError.set(
        err instanceof Error ? err.message : 'No se pudo eliminar el usuario seleccionado.'
      );
    } finally {
      this.isDeleting.set(false);
    }
  }

  // Helpers de Formato y Presentación
  getInitials(name?: string, email?: string): string {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  }

  getAvatarColor(id: string): string {
    const colors = [
      'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-rose-500/20 text-rose-400 border-rose-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  }

  private showSuccessNotice(msg: string): void {
    this.successNotice.set(msg);
    setTimeout(() => {
      this.successNotice.set(null);
    }, 4000);
  }
}
