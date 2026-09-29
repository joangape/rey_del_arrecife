import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideArrowUpDown,
  lucideCalendar,
  lucideCheck,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
  lucideCoins,
  lucideEye,
  lucideFilter,
  lucideImage,
  lucideLayoutGrid,
  lucideLayoutList,
  lucideMapPin,
  lucidePackageOpen,
  lucideRotateCcw,
  lucideSearch,
  lucideSlidersHorizontal,
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
      lucideSlidersHorizontal,
      lucideX,
      lucideCheck,
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

  onTodosClick(): void {
    this.inventarioService.setTodos();
  }

  onVendidoClick(): void {
    this.inventarioService.toggleFilterVendido();
  }

  onPagadoClick(): void {
    this.inventarioService.toggleFilterPagado();
  }

  onEstadoPredefinidoClick(estado: 'AEM' | 'Berlin'): void {
    this.inventarioService.togglePredefinedEstado(estado);
  }

  onEstadoClick(estado: string): void {
    this.inventarioService.setEstado(estado);
  }

  getVendidoTitle(): string {
    const v = this.inventarioService.filterVendido();
    if (v === 'vendido') {
      return 'Filtro activo: Vendidos (con fecha de venta). Clic para filtrar No Vendidos.';
    }
    if (v === 'no_vendido') {
      return 'Filtro activo: No Vendidos (sin fecha de venta). Clic para desactivar filtro.';
    }
    return 'Filtrar por vendidos (desactivado). Clic para filtrar Vendidos.';
  }

  getPagadoTitle(): string {
    const p = this.inventarioService.filterPagado();
    if (p === 'pagado') {
      return 'Filtro activo: Pagados (con fecha de pago). Clic para filtrar No Pagados.';
    }
    if (p === 'no_pagado') {
      return 'Filtro activo: No Pagados (sin fecha de pago). Clic para desactivar filtro.';
    }
    return 'Filtrar por pagados (desactivado). Clic para filtrar Pagados.';
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
