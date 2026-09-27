import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  async onLoginWithGoogle(): Promise<void> {
    const result = await this.authService.loginWithGoogle();
    if (result.success) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/inventario';
      await this.router.navigateByUrl(returnUrl);
    }
  }
}
