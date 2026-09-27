import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCrown,
  lucideLogOut,
  lucideMenu,
  lucideMoon,
  lucidePanelLeftClose,
  lucidePanelLeftOpen,
  lucideSearch,
  lucideShieldCheck,
  lucideSun,
  lucideUser,
  lucideX,
} from '@ng-icons/lucide';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { LayoutStateService } from '../layout-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmAlertDialogImports,
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideSun,
      lucideMoon,
      lucideMenu,
      lucideX,
      lucidePanelLeftClose,
      lucidePanelLeftOpen,
      lucideCrown,
      lucideShieldCheck,
      lucideUser,
      lucideLogOut,
    }),
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly layoutState = inject(LayoutStateService);
  private readonly router = inject(Router);

  readonly userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 'RA';
    if (user.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'RA';
  });

  readonly currentSectionTitle = computed(() => {
    const url = this.router.url;
    if (url.startsWith('/inventario/')) return 'Detalle de Pieza';
    if (url.startsWith('/inventario')) return 'Catálogo de Inventario';
    if (url.startsWith('/gastos')) return 'Gastos Extra';
    if (url.startsWith('/admin/usuarios')) return 'Administración de Usuarios';
    return 'Panel de Gestión';
  });

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.layoutState.searchQuery.set(input.value);
  }

  confirmLogout(): void {
    this.authService.logout(true, '/login');
  }
}
