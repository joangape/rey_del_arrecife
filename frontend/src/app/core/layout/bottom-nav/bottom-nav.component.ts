import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideMenu,
  lucidePackage,
  lucideReceipt,
  lucideUsers,
} from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { LayoutStateService } from '../layout-state.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIcon],
  providers: [
    provideIcons({
      lucidePackage,
      lucideReceipt,
      lucideUsers,
      lucideMenu,
    }),
  ],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  protected readonly authService = inject(AuthService);
  protected readonly layoutState = inject(LayoutStateService);

  readonly isAdmin = computed(() => this.authService.isAdmin());
}
