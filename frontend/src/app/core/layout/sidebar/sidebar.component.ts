import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideCrown,
  lucideLogOut,
  lucideMoon,
  lucidePackage,
  lucidePanelLeftClose,
  lucidePanelLeftOpen,
  lucideReceipt,
  lucideShieldCheck,
  lucideSparkles,
  lucideSun,
  lucideUsers,
  lucideX,
} from '@ng-icons/lucide';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { LayoutStateService } from '../layout-state.service';

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    NgIcon,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmAlertDialogImports,
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucidePackage,
      lucideReceipt,
      lucideUsers,
      lucideChevronLeft,
      lucideChevronRight,
      lucidePanelLeftClose,
      lucidePanelLeftOpen,
      lucideSun,
      lucideMoon,
      lucideCrown,
      lucideShieldCheck,
      lucideSparkles,
      lucideLogOut,
      lucideX,
    }),
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly layoutState = inject(LayoutStateService);

  readonly navItems: NavItem[] = [
    {
      id: 'nav-inventario',
      label: 'Inventario',
      route: '/inventario',
      icon: 'lucidePackage',
    },
    {
      id: 'nav-gastos',
      label: 'Gastos Extra',
      route: '/gastos',
      icon: 'lucideReceipt',
    },
    {
      id: 'nav-usuarios',
      label: 'Usuarios',
      route: '/admin/usuarios',
      icon: 'lucideUsers',
      adminOnly: true,
    },
  ];

  readonly visibleNavItems = computed(() => {
    const isAdmin = this.authService.isAdmin();
    return this.navItems.filter((item) => !item.adminOnly || isAdmin);
  });

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

  onNavClick(): void {
    if (this.layoutState.isMobileDrawerOpen()) {
      this.layoutState.closeMobileDrawer();
    }
  }

  confirmLogout(): void {
    this.authService.logout(true, '/login');
  }
}
