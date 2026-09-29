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
  lucideCalendar,
  lucideCheck,
  lucideCoins,
  lucideLoader2,
  lucidePackage,
  lucideReceipt,
  lucideSearch,
  lucideSparkles,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { CreateGastoDto, GastoExtra, UpdateGastoDto } from '../../../core/models/gastos.model';
import { InventarioItem } from '../../../core/models/inventario.model';
import { GastosService } from '../../../core/services/gastos.service';

export interface PiezaSelection {
  id: string;
  ref: number;
  descripcion: string;
}

@Component({
  selector: 'app-gasto-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NgIcon,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmInputImports,
  ],
  providers: [
    provideIcons({
      lucideX,
      lucideReceipt,
      lucidePackage,
      lucideSearch,
      lucideCheck,
      lucideCalendar,
      lucideCoins,
      lucideAlertCircle,
      lucideLoader2,
      lucideSparkles,
    }),
  ],
  templateUrl: './gasto-form-dialog.component.html',
  styleUrl: './gasto-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GastoFormDialogComponent {
  private readonly gastosService = inject(GastosService);

  readonly isOpen = model<boolean>(false);
  readonly gastoToEdit = input<GastoExtra | null>(null);
  readonly preselectedPieza = input<PiezaSelection | null>(null);

  readonly saved = output<GastoExtra>();
  readonly cancelled = output<void>();

  // Estado del formulario
  readonly selectedPieza = signal<PiezaSelection | null>(null);
  readonly piezaSearchQuery = signal<string>('');
  readonly pieceSuggestions = signal<InventarioItem[]>([]);
  readonly isSearchingPieces = signal<boolean>(false);
  readonly showSuggestions = signal<boolean>(false);

  readonly descripcion = signal<string>('');
  readonly importe = signal<number | null>(null);
  readonly fechaGasto = signal<string>('');
  readonly fechaPago = signal<string>('');
  readonly comentarios = signal<string>('');

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isEditMode = computed(() => !!this.gastoToEdit());

  readonly quickConcepts = [
    'Enfilado',
    'Arreglo',
    'Limpieza y pulido',
    'Tasación',
    'Engarce',
    'Soldadura',
    'Cambio de broche',
  ];

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.initForm();
      }
    });
  }

  private initForm(): void {
    this.errorMessage.set(null);
    this.pieceSuggestions.set([]);
    this.showSuggestions.set(false);

    const editData = this.gastoToEdit();
    if (editData) {
      if (editData.pieza && editData.ref_pieza) {
        this.selectedPieza.set({
          id: editData.pieza,
          ref: editData.ref_pieza,
          descripcion: editData.expand?.pieza?.descripcion || `Pieza #${editData.ref_pieza}`,
        });
      } else {
        this.selectedPieza.set(null);
      }
      this.descripcion.set(editData.descripcion || '');
      this.importe.set(editData.importe ?? null);
      this.fechaGasto.set(editData.fecha_gasto ? editData.fecha_gasto.substring(0, 10) : '');
      this.fechaPago.set(editData.fecha_pago ? editData.fecha_pago.substring(0, 10) : '');
      this.comentarios.set(editData.comentarios || '');
    } else {
      // Modo creación
      const pre = this.preselectedPieza();
      if (pre) {
        this.selectedPieza.set(pre);
      } else {
        this.selectedPieza.set(null);
      }
      this.piezaSearchQuery.set('');
      this.descripcion.set('');
      this.importe.set(null);
      this.fechaGasto.set(new Date().toISOString().substring(0, 10));
      this.fechaPago.set('');
      this.comentarios.set('');
    }
  }

  async onSearchPiezasInput(query: string): Promise<void> {
    this.piezaSearchQuery.set(query);
    if (!query.trim()) {
      this.pieceSuggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }

    this.isSearchingPieces.set(true);
    try {
      const results = await this.gastosService.searchPiezas(query, 6);
      this.pieceSuggestions.set(results);
      this.showSuggestions.set(results.length > 0);
    } catch {
      this.pieceSuggestions.set([]);
      this.showSuggestions.set(false);
    } finally {
      this.isSearchingPieces.set(false);
    }
  }

  selectPieza(p: InventarioItem): void {
    this.selectedPieza.set({
      id: p.id,
      ref: p.ref,
      descripcion: p.descripcion || `Pieza #${p.ref}`,
    });
    this.showSuggestions.set(false);
    this.piezaSearchQuery.set('');
  }

  clearSelectedPieza(): void {
    if (this.preselectedPieza()) return; // Bloqueado si venía preseleccionado
    this.selectedPieza.set(null);
    this.piezaSearchQuery.set('');
  }

  applyConcept(concept: string): void {
    this.descripcion.set(concept);
  }

  setFechaPagoHoy(): void {
    this.fechaPago.set(new Date().toISOString().substring(0, 10));
  }

  clearFechaPago(): void {
    this.fechaPago.set('');
  }

  close(): void {
    this.isOpen.set(false);
    this.cancelled.emit();
  }

  async onSubmit(): Promise<void> {
    const pieza = this.selectedPieza();
    if (!pieza) {
      this.errorMessage.set('Debes seleccionar la pieza de inventario asociada.');
      return;
    }

    const desc = this.descripcion().trim();
    if (!desc) {
      this.errorMessage.set('El concepto o descripción del gasto es obligatorio.');
      return;
    }

    const imp = Number(this.importe());
    if (isNaN(imp) || imp <= 0) {
      this.errorMessage.set('Introduce un importe válido mayor que 0 €.');
      return;
    }

    const fGasto = this.fechaGasto().trim();
    if (!fGasto) {
      this.errorMessage.set('La fecha en que se realizó el gasto es obligatoria.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      const editItem = this.gastoToEdit();
      if (editItem) {
        const updatePayload: UpdateGastoDto = {
          pieza: pieza.id,
          ref_pieza: pieza.ref,
          descripcion: desc,
          importe: imp,
          fecha_gasto: fGasto,
          fecha_pago: this.fechaPago().trim() || undefined,
          comentarios: this.comentarios().trim() || undefined,
        };
        const updated = await this.gastosService.updateGasto(editItem.id, updatePayload);
        this.saved.emit(updated);
      } else {
        const createPayload: CreateGastoDto = {
          pieza: pieza.id,
          ref_pieza: pieza.ref,
          descripcion: desc,
          importe: imp,
          fecha_gasto: fGasto,
          fecha_pago: this.fechaPago().trim() || undefined,
          comentarios: this.comentarios().trim() || undefined,
        };
        const created = await this.gastosService.createGasto(createPayload);
        this.saved.emit(created);
      }
      this.isOpen.set(false);
    } catch (err: any) {
      console.error('Error al guardar gasto:', err);
      this.errorMessage.set(
        err?.message || 'Error al guardar el gasto extra. Por favor revisa los campos.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
