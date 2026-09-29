import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowDown,
  lucideArrowUp,
  lucideArrowUpDown,
  lucideCalendar,
  lucideCheck,
  lucideCheckCircle2,
  lucideChevronLeft,
  lucideChevronRight,
  lucideClock,
  lucideDollarSign,
  lucideFilter,
  lucidePackage,
  lucidePencil,
  lucidePlus,
  lucideReceipt,
  lucideRotateCcw,
  lucideSearch,
  lucideSparkles,
  lucideTag,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { GastoExtra, GastoPaymentStatus } from '../../../core/models/gastos.model';
import { AuthService } from '../../../core/services/auth.service';
import { GastosService } from '../../../core/services/gastos.service';
import { PocketBaseService } from '../../../core/services/pocketbase.service';
import { GastoFormDialogComponent } from '../gasto-form-dialog/gasto-form-dialog.component';

@Component({
  selector: 'app-gastos-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    NgIcon,
    ...HlmTableImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmInputImports,
    ...HlmTooltipImports,
    ...HlmAlertDialogImports,
    GastoFormDialogComponent,
  ],
  providers: [
    provideIcons({
      lucideReceipt,
      lucidePlus,
      lucideSearch,
      lucideFilter,
      lucideRotateCcw,
      lucideTag,
      lucideArrowUpDown,
      lucideArrowUp,
      lucideArrowDown,
      lucideCalendar,
      lucideClock,
      lucideCheckCircle2,
      lucideCheck,
      lucideDollarSign,
      lucideTrash2,
      lucidePencil,
      lucideChevronLeft,
      lucideChevronRight,
      lucidePackage,
      lucideAlertCircle,
      lucideSparkles,
      lucideX,
    }),
  ],
  templateUrl: './gastos-list.component.html',
  styleUrl: './gastos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GastosListComponent {
  readonly gastosService = inject(GastosService);
  readonly authService = inject(AuthService);
  private readonly pbService = inject(PocketBaseService);

  // Modales
  readonly isFormDialogOpen = signal<boolean>(false);
  readonly gastoToEdit = signal<GastoExtra | null>(null);

  readonly isDeleteDialogOpen = signal<boolean>(false);
  readonly gastoToDelete = signal<GastoExtra | null>(null);
  readonly isDeleting = signal<boolean>(false);

  // Filtros locales
  readonly localStartDate = signal<string>('');
  readonly localEndDate = signal<string>('');

  // Estados rápidos
  readonly statusOptions: { label: string; value: GastoPaymentStatus }[] = [
    { label: 'Todos los gastos', value: 'todos' },
    { label: 'Pendientes de pago', value: 'pendientes' },
    { label: 'Pagados / Liquidados', value: 'pagados' },
  ];

  // Cálculos de paginación
  readonly startItemIndex = computed(() => {
    if (this.gastosService.totalItems() === 0) return 0;
    return (this.gastosService.page() - 1) * this.gastosService.perPage() + 1;
  });

  readonly endItemIndex = computed(() => {
    const calculated = this.gastosService.page() * this.gastosService.perPage();
    return Math.min(calculated, this.gastosService.totalItems());
  });

  openCreateDialog(): void {
    this.gastoToEdit.set(null);
    this.isFormDialogOpen.set(true);
  }

  openEditDialog(gasto: GastoExtra): void {
    this.gastoToEdit.set(gasto);
    this.isFormDialogOpen.set(true);
  }

  openDeleteDialog(gasto: GastoExtra): void {
    this.gastoToDelete.set(gasto);
    this.isDeleteDialogOpen.set(true);
  }

  closeDeleteDialog(): void {
    this.isDeleteDialogOpen.set(false);
    this.gastoToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const item = this.gastoToDelete();
    if (!item) return;

    this.isDeleting.set(true);
    try {
      await this.gastosService.deleteGasto(item.id);
      this.closeDeleteDialog();
    } catch (err) {
      console.error('Error al eliminar gasto:', err);
    } finally {
      this.isDeleting.set(false);
    }
  }

  onSearchChange(val: string): void {
    this.gastosService.setSearch(val);
  }

  onStatusChange(status: GastoPaymentStatus): void {
    this.gastosService.setStatusFilter(status);
  }

  onDateFilterApply(): void {
    this.gastosService.setDateRange(this.localStartDate(), this.localEndDate());
  }

  clearDateFilter(): void {
    this.localStartDate.set('');
    this.localEndDate.set('');
    this.gastosService.setDateRange('', '');
  }

  toggleSort(field: string): void {
    this.gastosService.setSort(field);
  }

  goToPage(page: number): void {
    this.gastosService.setPage(page);
  }

  resetAllFilters(): void {
    this.localStartDate.set('');
    this.localEndDate.set('');
    this.gastosService.resetFilters();
  }

  formatCurrency(val: number | undefined): string {
    if (val === undefined || val === null) return '0,00 €';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(val);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      const clean = dateStr.substring(0, 10);
      const [year, month, day] = clean.split('-');
      if (!year || !month || !day) return dateStr;
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }

  getPieceThumbnail(gasto: GastoExtra): string | null {
    const piece = gasto.expand?.pieza;
    if (!piece) return null;

    if (piece.fotos && piece.fotos.length > 0) {
      return this.pbService.getFileUrl(piece, piece.fotos[0], { thumb: '80x80' });
    }
    return null;
  }
}
