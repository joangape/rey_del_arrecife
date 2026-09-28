import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideArrowUpDown,
  lucideCalendar,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
  lucideCoins,
  lucideExternalLink,
  lucideEye,
  lucideFilter,
  lucideImage,
  lucideLayoutGrid,
  lucideLayoutList,
  lucideMapPin,
  lucidePackageOpen,
  lucideRotateCcw,
  lucideSearch,
  lucideSparkles,
  lucideTag,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { InventarioService, ViewMode } from '../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgIcon,
    DatePipe,
    ...HlmTableImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmInputImports,
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideX,
      lucideFilter,
      lucideArrowUpDown,
      lucideArrowUp,
      lucideArrowDown,
      lucideLayoutList,
      lucideLayoutGrid,
      lucideChevronLeft,
      lucideChevronRight,
      lucideChevronsLeft,
      lucideChevronsRight,
      lucideExternalLink,
      lucideImage,
      lucideSparkles,
      lucideRotateCcw,
      lucideTag,
      lucideMapPin,
      lucideCalendar,
      lucideEye,
      lucideCoins,
      lucidePackageOpen,
    }),
  ],
  templateUrl: './inventario-list.component.html',
  styleUrl: './inventario-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioListComponent {
  readonly inventarioService = inject(InventarioService);
  readonly authService = inject(AuthService);

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.inventarioService.setSearch(input.value);
  }

  clearSearch(): void {
    this.inventarioService.setSearch('');
  }

  onEstadoClick(estado: string): void {
    this.inventarioService.setEstado(estado);
  }

  onOrigenChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.inventarioService.setOrigen(select.value);
  }

  onPerPageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.inventarioService.setPerPage(Number(select.value));
  }

  toggleSort(field: string): void {
    this.inventarioService.setSort(field);
  }

  setViewMode(mode: ViewMode): void {
    this.inventarioService.setViewMode(mode);
  }

  resetAll(): void {
    this.inventarioService.resetFilters();
  }

  formatCurrency(val: number | null | undefined): string {
    if (val == null) return '—';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val);
  }

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'bg-muted/40 text-muted-foreground border-border/60';
    const e = estado.toLowerCase();
    if (e.includes('disponible') || e.includes('en sobre') || e.includes('sobre')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (e.includes('aem')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (e.includes('vyp')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
    if (e.includes('vend')) {
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    }
    return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  }
}
