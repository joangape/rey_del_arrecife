import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideCheck,
  lucideKey,
  lucideLoader2,
  lucideLock,
  lucideMail,
  lucideSend,
  lucideShield,
  lucideUser,
  lucideUserPlus,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { CreateUserDto, UpdateUserDto, User, UserRole } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UsersService } from '../../../../core/services/users.service';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NgIcon,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmInputImports,
    ...HlmSwitchImports,
  ],
  providers: [
    provideIcons({
      lucideUser,
      lucideMail,
      lucideShield,
      lucideKey,
      lucideLock,
      lucideSend,
      lucideCheck,
      lucideX,
      lucideAlertCircle,
      lucideLoader2,
      lucideUserPlus,
    }),
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialogComponent {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);

  readonly isOpen = model<boolean>(false);
  readonly userToEdit = input<User | null>(null);

  readonly saved = output<User>();
  readonly cancelled = output<void>();

  // Estado del formulario
  readonly email = signal<string>('');
  readonly name = signal<string>('');
  readonly role = signal<UserRole>('partner');
  readonly useCustomPassword = signal<boolean>(false);
  readonly password = signal<string>('');
  readonly passwordConfirm = signal<string>('');

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isSendingVerification = signal<boolean>(false);
  readonly verificationSent = signal<boolean>(false);

  readonly isEditMode = computed(() => !!this.userToEdit());

  readonly isCurrentUser = computed(() => {
    const current = this.authService.currentUser();
    const target = this.userToEdit();
    return !!current && !!target && current.id === target.id;
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.initForm();
      }
    });
  }

  private initForm(): void {
    this.errorMessage.set(null);
    this.verificationSent.set(false);
    this.isSendingVerification.set(false);

    const user = this.userToEdit();
    if (user) {
      this.email.set(user.email);
      this.name.set(user.name || '');
      this.role.set(user.role);
      this.useCustomPassword.set(false);
      this.password.set('');
      this.passwordConfirm.set('');
    } else {
      this.email.set('');
      this.name.set('');
      this.role.set('partner');
      this.useCustomPassword.set(false);
      this.password.set('');
      this.passwordConfirm.set('');
    }
  }

  setRole(selectedRole: UserRole): void {
    if (this.isCurrentUser() && selectedRole !== 'admin') {
      return; // Protección de degradación de rol
    }
    this.role.set(selectedRole);
  }

  toggleCustomPassword(value: boolean): void {
    this.useCustomPassword.set(value);
    if (!value) {
      this.password.set('');
      this.passwordConfirm.set('');
    }
  }

  async onResendVerification(): Promise<void> {
    const user = this.userToEdit();
    if (!user?.email) return;

    this.isSendingVerification.set(true);
    this.errorMessage.set(null);

    try {
      await this.usersService.resendVerificationEmail(user.email);
      this.verificationSent.set(true);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'No se pudo reenviar el correo de verificación.'
      );
    } finally {
      this.isSendingVerification.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);

    const emailVal = this.email().trim().toLowerCase();
    if (!emailVal) {
      this.errorMessage.set('El correo electrónico es obligatorio.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      this.errorMessage.set('El formato del correo electrónico no es válido.');
      return;
    }

    if (this.useCustomPassword()) {
      const pwd = this.password().trim();
      const pwdConfirm = this.passwordConfirm().trim();

      if (!pwd || pwd.length < 8) {
        this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
        return;
      }

      if (pwd !== pwdConfirm) {
        this.errorMessage.set('Las contraseñas introducidas no coinciden.');
        return;
      }
    }

    this.isSubmitting.set(true);

    try {
      if (this.isEditMode()) {
        const user = this.userToEdit()!;
        const updateDto: UpdateUserDto = {
          email: emailVal,
          name: this.name().trim(),
          role: this.role(),
        };

        if (this.useCustomPassword()) {
          updateDto.password = this.password().trim();
          updateDto.passwordConfirm = this.passwordConfirm().trim();
        }

        const updated = await this.usersService.updateUser(user.id, updateDto);
        this.saved.emit(updated);
        this.close();
      } else {
        const createDto: CreateUserDto = {
          email: emailVal,
          name: this.name().trim(),
          role: this.role(),
          password: this.useCustomPassword() ? this.password().trim() : undefined,
        };

        const created = await this.usersService.createUser(createDto);
        this.saved.emit(created);
        this.close();
      }
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Ocurrió un error al procesar el usuario.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.cancelled.emit();
  }
}
