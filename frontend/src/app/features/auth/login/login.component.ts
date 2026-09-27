import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly localError = signal<string | null>(null);

  readonly activeError = computed(() => {
    return this.localError() || this.authService.authError();
  });

  async onLoginWithPassword(event?: Event): Promise<void> {
    if (event) {
      event.preventDefault();
    }
    this.clearError();

    const emailVal = this.email().trim();
    const passVal = this.password();

    if (!emailVal || !passVal) {
      this.localError.set('Por favor, introduce tu correo y contraseña.');
      return;
    }

    const result = await this.authService.loginWithPassword(emailVal, passVal);
    if (result.success) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/inventario';
      await this.router.navigateByUrl(returnUrl);
    }
  }

  async onLoginWithGoogle(): Promise<void> {
    this.clearError();
    const result = await this.authService.loginWithGoogle();
    if (result.success) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/inventario';
      await this.router.navigateByUrl(returnUrl);
    }
  }

  toggleShowPassword(): void {
    this.showPassword.update((prev) => !prev);
  }

  clearError(): void {
    this.localError.set(null);
    this.authService.clearError();
  }

  fillDemoCredentials(role: 'admin' | 'partner'): void {
    this.clearError();
    if (role === 'admin') {
      this.email.set('admin@reydelarrecife.local');
      this.password.set('Password2026!');
    } else {
      this.email.set('partner@reydelarrecife.local');
      this.password.set('Password2026!');
    }
  }
}
