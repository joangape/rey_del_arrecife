import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ClientResponseError, RecordModel } from 'pocketbase';
import { AuthResult, User, UserRole } from '../models/user.model';
import { PocketBaseService } from './pocketbase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly pbService = inject(PocketBaseService);
  private readonly router = inject(Router);

  // Estado reactivo basado en Angular Signals
  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');
  readonly isPartner = computed(() => this._currentUser()?.role === 'partner');

  private readonly _isLoading = signal<boolean>(false);
  readonly isLoading = this._isLoading.asReadonly();

  private readonly _authError = signal<string | null>(null);
  readonly authError = this._authError.asReadonly();

  private unsubscribeAuthStore?: () => void;

  constructor() {
    this.initAuthSync();
  }

  /**
   * Inicializa la sincronización reactiva entre PocketBase AuthStore (LocalStorage) y los Signals de Angular.
   */
  private initAuthSync(): void {
    const pb = this.pbService.pb;

    // 1. Cargar estado inicial desde el authStore existente (persistido en LocalStorage)
    if (pb.authStore.isValid && pb.authStore.record) {
      this._currentUser.set(this.mapRecordToUser(pb.authStore.record));
    } else {
      pb.authStore.clear();
      this._currentUser.set(null);
    }

    // 2. Suscribirse a cambios en el authStore (login, refresh, logout, token update)
    this.unsubscribeAuthStore = pb.authStore.onChange((token, record) => {
      if (token && pb.authStore.isValid && record) {
        this._currentUser.set(this.mapRecordToUser(record));
      } else {
        this._currentUser.set(null);
      }
    });

    // 3. Sincronización multi-pestaña ante eventos de storage en el navegador
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === 'pocketbase_auth') {
          if (!event.newValue) {
            pb.authStore.clear();
            this._currentUser.set(null);
          } else {
            try {
              const data = JSON.parse(event.newValue);
              pb.authStore.save(data.token, data.record);
              if (pb.authStore.isValid && data.record) {
                this._currentUser.set(this.mapRecordToUser(data.record));
              } else {
                this._currentUser.set(null);
              }
            } catch {
              pb.authStore.clear();
              this._currentUser.set(null);
            }
          }
        }
      });
    }
  }

  /**
   * Refresca la sesión contra el servidor PocketBase para asegurar que el token sea vigente
   * y que el estado o rol del usuario no haya sido modificado o revocado en el backend.
   */
  async refreshSession(): Promise<boolean> {
    const pb = this.pbService.pb;
    if (!pb.authStore.isValid) {
      this.logout(false);
      return false;
    }

    try {
      const authData = await pb.collection('users').authRefresh();
      if (authData.record) {
        const user = this.mapRecordToUser(authData.record);
        this._currentUser.set(user);
        return true;
      }
      this.logout(false);
      return false;
    } catch (err) {
      console.warn('Sesión no válida o expirada:', err);
      this.logout(false);
      return false;
    }
  }

  /**
   * Inicia sesión mediante Google OAuth2 utilizando el flujo integrado de PocketBase (popup).
   * Gestiona el rechazo por lista blanca (HTTP 403 Forbidden del hook pb_hooks/auth_whitelist.pb.js)
   * o cuenta desactivada.
   */
  async loginWithGoogle(): Promise<AuthResult> {
    this._isLoading.set(true);
    this._authError.set(null);

    const pb = this.pbService.pb;

    try {
      const authData = await pb.collection('users').authWithOAuth2({
        provider: 'google',
      });

      const user = this.mapRecordToUser(authData.record);
      this._currentUser.set(user);
      this._isLoading.set(false);

      return {
        success: true,
        user: user ?? undefined,
      };
    } catch (err: unknown) {
      this._isLoading.set(false);

      // Si fue rechazado o falló, garantizar que no queden credenciales residuales
      pb.authStore.clear();
      this._currentUser.set(null);

      const clientErr = err as ClientResponseError;

      // El usuario cerró el popup de Google OAuth antes de finalizar
      if (clientErr?.isAbort) {
        const cancelMsg = 'Inicio de sesión con Google cancelado.';
        this._authError.set(cancelMsg);
        return {
          success: false,
          isCancelled: true,
          error: cancelMsg,
        };
      }

      // Error 403: Cuenta no autorizada por lista blanca o desactivada por admin
      if (clientErr?.status === 403) {
        const forbiddenMsg =
          clientErr.response?.['message'] ||
          clientErr.message ||
          'Acceso denegado: tu cuenta no ha sido invitada o autorizada por un administrador.';
        this._authError.set(forbiddenMsg);
        return {
          success: false,
          error: forbiddenMsg,
        };
      }

      const rawMsg = String(clientErr?.response?.['message'] || clientErr?.message || '');

      // Proveedor no configurado o no soportado en PocketBase
      if (rawMsg.includes('not supported') || rawMsg.includes('Missing provider')) {
        const configMsg =
          'El proveedor de Google OAuth no está configurado en el servidor. Configura GOOGLE_CLIENT_ID en PocketBase o accede con usuario y contraseña.';
        this._authError.set(configMsg);
        return {
          success: false,
          error: configMsg,
        };
      }

      // Ventana emergente bloqueada por el navegador
      if (rawMsg.toLowerCase().includes('popup') || rawMsg.toLowerCase().includes('blocked')) {
        const popupMsg =
          'La ventana emergente de Google fue bloqueada por el navegador. Habilita las ventanas emergentes para continuar.';
        this._authError.set(popupMsg);
        return {
          success: false,
          error: popupMsg,
        };
      }

      // Cualquier otro error de red, configuración o servidor
      const genericMsg =
        clientErr?.response?.['message'] ||
        clientErr?.message ||
        'Error inesperado al iniciar sesión con Google. Inténtalo de nuevo más tarde o usa usuario y contraseña.';
      this._authError.set(genericMsg);

      return {
        success: false,
        error: genericMsg,
      };
    }
  }

  /**
   * Autenticación con contraseña (útil para desarrollo, superusuarios o pruebas).
   */
  async loginWithPassword(email: string, pass: string): Promise<AuthResult> {
    this._isLoading.set(true);
    this._authError.set(null);

    const pb = this.pbService.pb;

    try {
      const authData = await pb.collection('users').authWithPassword(email, pass);
      const user = this.mapRecordToUser(authData.record);
      this._currentUser.set(user);
      this._isLoading.set(false);
      return {
        success: true,
        user: user ?? undefined,
      };
    } catch (err: unknown) {
      this._isLoading.set(false);
      pb.authStore.clear();
      this._currentUser.set(null);

      const clientErr = err as ClientResponseError;
      const errorMsg =
        clientErr?.response?.['message'] ||
        clientErr?.message ||
        'Credenciales de acceso incorrectas.';

      this._authError.set(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Cierra la sesión activa en PocketBase, limpia el estado y redirige a la ruta especificada.
   */
  logout(navigate: boolean = true, redirectUrl: string = '/login'): void {
    this.pbService.pb.authStore.clear();
    this._currentUser.set(null);
    this._authError.set(null);

    if (navigate) {
      this.router.navigateByUrl(redirectUrl);
    }
  }

  /**
   * Limpia manualmente el mensaje de error de autenticación.
   */
  clearError(): void {
    this._authError.set(null);
  }

  /**
   * Transforma un RecordModel devuelto por PocketBase a la interfaz de usuario `User`.
   */
  private mapRecordToUser(record: RecordModel | null): User | null {
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      collectionId: record.collectionId,
      collectionName: record.collectionName,
      email: record['email'] || '',
      name: record['name'] || '',
      avatar: record['avatar'] || '',
      role: (record['role'] as UserRole) || 'partner',
      active: record['active'] !== undefined ? Boolean(record['active']) : true,
      created: record['created'] || '',
      updated: record['updated'] || '',
    };
  }

  ngOnDestroy(): void {
    if (this.unsubscribeAuthStore) {
      this.unsubscribeAuthStore();
    }
  }
}
