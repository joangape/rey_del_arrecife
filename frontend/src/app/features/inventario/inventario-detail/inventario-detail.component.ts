import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowLeft,
  lucideCalendar,
  lucideCheck,
  lucideCoins,
  lucideExternalLink,
  lucideEye,
  lucideFileText,
  lucideImage,
  lucideLoader2,
  lucideLock,
  lucidePencil,
  lucidePercent,
  lucidePlus,
  lucideReceipt,
  lucideRotateCcw,
  lucideSave,
  lucideSparkles,
  lucideTag,
  lucideTrash2,
  lucideTrendingUp,
  lucideUploadCloud,
  lucideX,
  lucideZoomIn,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { GastoExtra } from '../../../core/models/gastos.model';
import { InventarioItem } from '../../../core/models/inventario.model';
import { AuthService } from '../../../core/services/auth.service';
import { GastosService } from '../../../core/services/gastos.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { GastoFormDialogComponent } from '../../gastos/gasto-form-dialog/gasto-form-dialog.component';

export interface PhotoDisplayItem {
  id: string;
  url: string;
  source: 'pocketbase' | 'external';
  filename?: string;
}

@Component({
  selector: 'app-inventario-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmInputImports,
    ...HlmTooltipImports,
    ...HlmTableImports,
    ...HlmAlertDialogImports,
    GastoFormDialogComponent,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideSave,
      lucideTrash2,
      lucidePencil,
      lucideLock,
      lucideExternalLink,
      lucideImage,
      lucideUploadCloud,
      lucidePlus,
      lucideCheck,
      lucideAlertCircle,
      lucideSparkles,
      lucideReceipt,
      lucideCalendar,
      lucideTag,
      lucideEye,
      lucideX,
      lucideRotateCcw,
      lucideLoader2,
      lucideCoins,
      lucideTrendingUp,
      lucidePercent,
      lucideFileText,
      lucideZoomIn,
    }),
  ],
  templateUrl: './inventario-detail.component.html',
  styleUrl: './inventario-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly inventarioService = inject(InventarioService);
  readonly gastosService = inject(GastosService);
  readonly authService = inject(AuthService);

  // Estados reactivos principales
  readonly itemId = signal<string | null>(null);
  readonly item = signal<InventarioItem | null>(null);
  readonly gastos = signal<GastoExtra[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isUploading = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Gestión de Gastos Extra en la Ficha
  readonly isGastoDialogOpen = signal<boolean>(false);
  readonly gastoToEdit = signal<GastoExtra | null>(null);
  readonly gastoToDelete = signal<GastoExtra | null>(null);
  readonly isDeleteGastoDialogOpen = signal<boolean>(false);
  readonly isDeletingGasto = signal<boolean>(false);

  readonly gastoPreselectedPieza = computed(() => {
    const it = this.item();
    if (!it) return null;
    return {
      id: it.id,
      ref: it.ref,
      descripcion: it.descripcion || `Pieza #${it.ref}`,
    };
  });

  // Galería de fotos
  readonly selectedPhoto = signal<PhotoDisplayItem | null>(null);
  readonly isLightboxOpen = signal<boolean>(false);

  // Permisos computados
  readonly isAdmin = computed(() => this.authService.isAdmin());
  readonly isPartner = computed(() => this.authService.isPartner());

  // Lista de estados predefinidos para selección rápida
  readonly availableEstados = [
    'Disponible',
    'En sobre',
    'AEM',
    'VyP',
    'Berlin',
    'Vendido',
    'Reservado',
    'En Taller',
  ];

  // Formulario reactivo
  readonly itemForm: FormGroup = this.fb.group({
    // Campos protegidos (solo editables por Admin)
    ref: [{ value: '', disabled: true }, [Validators.required]],
    descripcion: [{ value: '', disabled: true }],
    origen: [{ value: '', disabled: true }],
    fecha_compra: [{ value: '', disabled: true }],
    costo: [{ value: 0, disabled: true }],
    foto_url: [{ value: '', disabled: true }],

    // Campos comerciales (editables por Admin y Partner)
    pvp: [null],
    a_pagar: [null],
    estado: [''],
    fecha_venta: [''],
    fecha_pagado: [''],
    comentarios: [''],
  });

  // Lista unificada de fotos (PocketBase + enlace externo)
  readonly allPhotos = computed<PhotoDisplayItem[]>(() => {
    const it = this.item();
    if (!it) return [];

    const list: PhotoDisplayItem[] = [];

    // Fotos subidas a PocketBase
    if (it.fotos && it.fotos.length > 0) {
      for (const filename of it.fotos) {
        list.push({
          id: filename,
          url: this.inventarioService.getItemThumbnail(it) ? this.getPbFullUrl(it, filename) : '',
          source: 'pocketbase',
          filename,
        });
      }
    }

    // Foto externa de Google Photos / URL
    if (it.foto_url && it.foto_url.trim().startsWith('http')) {
      list.push({
        id: 'external_url',
        url: it.foto_url.trim(),
        source: 'external',
      });
    }

    return list;
  });

  // Cálculos financieros derivados
  readonly costoAdquisicion = computed(() => Number(this.item()?.costo ?? 0));

  readonly totalGastosExtra = computed(() => {
    const list = this.gastos();
    if (list.length > 0) {
      return list.reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
    }
    return Number(this.item()?.gastos_total ?? 0);
  });

  readonly costeTotalAcumulado = computed(
    () => this.costoAdquisicion() + this.totalGastosExtra()
  );

  // Valores comerciales reactivos a partir de formulario
  readonly currentPvp = signal<number>(0);
  readonly currentAPagar = signal<number>(0);

  readonly margenBruto = computed(() => {
    const pvp = this.currentPvp();
    const coste = this.costeTotalAcumulado();
    return pvp - coste;
  });

  readonly margenPorcentaje = computed(() => {
    const pvp = this.currentPvp();
    if (pvp <= 0) return 0;
    return (this.margenBruto() / pvp) * 100;
  });

  readonly beneficioNetoEstimado = computed(() => {
    const margen = this.margenBruto();
    const aPagar = this.currentAPagar();
    return margen - aPagar;
  });

  ngOnInit(): void {
    // Sincronizar señales reactivas ante cambios en inputs numéricos del formulario
    this.itemForm.get('pvp')?.valueChanges.subscribe((val) => {
      this.currentPvp.set(Number(val) || 0);
    });
    this.itemForm.get('a_pagar')?.valueChanges.subscribe((val) => {
      this.currentAPagar.set(Number(val) || 0);
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.itemId.set(id);
        this.loadItemData(id);
      } else {
        this.errorMessage.set('Identificador de pieza no proporcionado.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Carga la pieza y sus gastos extra asociados desde PocketBase.
   */
  async loadItemData(id: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const it = await this.inventarioService.getItemById(id);
      this.item.set(it);

      // Cargar campos en el formulario
      this.populateForm(it);

      // Cargar gastos extra de la pieza
      if (it.ref != null) {
        const gastos = await this.inventarioService.getItemGastos(it.ref, it.id);
        this.gastos.set(gastos);
      }

      // Configurar foto principal inicial
      const photos = this.allPhotos();
      if (photos.length > 0) {
        this.selectedPhoto.set(photos[0]);
      } else {
        this.selectedPhoto.set(null);
      }
    } catch (err: unknown) {
      const msg = this.inventarioService['pbService'].getErrorMessage(err);
      this.errorMessage.set(msg || 'No se pudo cargar la pieza de inventario.');
      toast.error('Error al cargar la pieza solicitada.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Inicializa los valores y estados de deshabilitación del formulario según rol.
   */
  private populateForm(it: InventarioItem): void {
    const admin = this.isAdmin();

    // Habilitar o deshabilitar campos de Admin según rol
    const adminFields = ['ref', 'descripcion', 'origen', 'fecha_compra', 'costo', 'foto_url'];
    for (const field of adminFields) {
      const control = this.itemForm.get(field);
      if (admin) {
        control?.enable({ emitEvent: false });
      } else {
        control?.disable({ emitEvent: false });
      }
    }

    this.itemForm.patchValue({
      ref: it.ref ?? '',
      descripcion: it.descripcion ?? '',
      origen: it.origen ?? '',
      fecha_compra: this.formatDateForInput(it.fecha_compra),
      costo: it.costo ?? 0,
      foto_url: it.foto_url ?? '',
      pvp: it.pvp ?? null,
      a_pagar: it.a_pagar ?? null,
      estado: it.estado ?? '',
      fecha_venta: this.formatDateForInput(it.fecha_venta),
      fecha_pagado: this.formatDateForInput(it.fecha_pagado),
      comentarios: it.comentarios ?? '',
    });

    this.currentPvp.set(Number(it.pvp) || 0);
    this.currentAPagar.set(Number(it.a_pagar) || 0);
    this.itemForm.markAsPristine();
  }

  /**
   * Guarda los cambios en la pieza aplicando validación estricta de permisos por rol.
   */
  async onSubmit(): Promise<void> {
    const currentItem = this.item();
    if (!currentItem || this.isSaving()) return;

    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      toast.error('Por favor, revisa los campos requeridos del formulario.');
      return;
    }

    this.isSaving.set(true);

    try {
      const formVal = this.itemForm.getRawValue();
      let updatePayload: Partial<InventarioItem>;

      if (this.isAdmin()) {
        // Admin: Edición total de todos los campos
        updatePayload = {
          ref: Number(formVal.ref),
          descripcion: formVal.descripcion?.trim() || '',
          origen: formVal.origen?.trim() || '',
          fecha_compra: formVal.fecha_compra || null,
          costo: Number(formVal.costo) || 0,
          foto_url: formVal.foto_url?.trim() || '',
          pvp: formVal.pvp != null && formVal.pvp !== '' ? Number(formVal.pvp) : undefined,
          a_pagar:
            formVal.a_pagar != null && formVal.a_pagar !== ''
              ? Number(formVal.a_pagar)
              : undefined,
          estado: formVal.estado?.trim() || '',
          fecha_venta: formVal.fecha_venta || '',
          fecha_pagado: formVal.fecha_pagado || '',
          comentarios: formVal.comentarios?.trim() || '',
        };
      } else {
        // Partner: Solo campos comerciales autorizados por el hook inventory_guard
        updatePayload = {
          pvp: formVal.pvp != null && formVal.pvp !== '' ? Number(formVal.pvp) : undefined,
          a_pagar:
            formVal.a_pagar != null && formVal.a_pagar !== ''
              ? Number(formVal.a_pagar)
              : undefined,
          estado: formVal.estado?.trim() || '',
          fecha_venta: formVal.fecha_venta || '',
          fecha_pagado: formVal.fecha_pagado || '',
          comentarios: formVal.comentarios?.trim() || '',
        };
      }

      const updated = await this.inventarioService.updateItem(currentItem.id, updatePayload);
      this.item.set(updated);
      this.populateForm(updated);

      toast.success('Pieza de inventario guardada correctamente.');
    } catch (err: unknown) {
      const msg = this.inventarioService['pbService'].getErrorMessage(err);
      toast.error(`Error al guardar: ${msg}`);
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Descarta los cambios realizados en el formulario y restablece los valores originales.
   */
  discardChanges(): void {
    const it = this.item();
    if (it) {
      this.populateForm(it);
      toast.info('Cambios descartados.');
    }
  }

  /**
   * Sube una o varias fotografías a PocketBase (solo disponible para Administrador).
   */
  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.item()) return;

    if (!this.isAdmin()) {
      toast.error('Solo los administradores pueden añadir fotografías adjuntas.');
      return;
    }

    const files = Array.from(input.files);
    this.isUploading.set(true);

    try {
      const updated = await this.inventarioService.uploadItemPhotos(this.item()!.id, files);
      this.item.set(updated);

      // Seleccionar la nueva foto si está disponible
      const photos = this.allPhotos();
      if (photos.length > 0) {
        this.selectedPhoto.set(photos[photos.length - 1]);
      }

      toast.success('Fotografías añadidas correctamente.');
      input.value = '';
    } catch (err: unknown) {
      const msg = this.inventarioService['pbService'].getErrorMessage(err);
      toast.error(`Error al subir fotos: ${msg}`);
    } finally {
      this.isUploading.set(false);
    }
  }

  /**
   * Elimina una fotografía específica adjunta a la pieza (solo disponible para Administrador).
   */
  async deletePhoto(photo: PhotoDisplayItem): Promise<void> {
    if (!this.isAdmin() || photo.source !== 'pocketbase' || !photo.filename || !this.item()) {
      return;
    }

    try {
      const updated = await this.inventarioService.deleteItemPhoto(
        this.item()!.id,
        photo.filename
      );
      this.item.set(updated);

      // Si la foto eliminada era la seleccionada, reasignar
      const photos = this.allPhotos();
      this.selectedPhoto.set(photos.length > 0 ? photos[0] : null);

      toast.success('Fotografía eliminada.');
    } catch (err: unknown) {
      const msg = this.inventarioService['pbService'].getErrorMessage(err);
      toast.error(`Error al eliminar fotografía: ${msg}`);
    }
  }

  /**
   * Elimina la pieza completa con confirmación previa (solo Administrador).
   */
  async confirmDeletePiece(): Promise<void> {
    const it = this.item();
    if (!it || !this.isAdmin()) return;

    this.isDeleting.set(true);

    try {
      await this.inventarioService.deleteItem(it.id);
      toast.success(`Pieza Ref. #${it.ref} eliminada del inventario.`);
      this.router.navigate(['/inventario']);
    } catch (err: unknown) {
      const msg = this.inventarioService['pbService'].getErrorMessage(err);
      toast.error(`Error al eliminar pieza: ${msg}`);
      this.isDeleting.set(false);
    }
  }

  /**
   * Selecciona una foto para la vista principal.
   */
  selectPhoto(photo: PhotoDisplayItem): void {
    this.selectedPhoto.set(photo);
  }

  /**
   * Abre el visor modal en pantalla completa (lightbox).
   */
  openLightbox(): void {
    if (this.selectedPhoto()) {
      this.isLightboxOpen.set(true);
    }
  }

  /**
   * Cierra el visor modal.
   */
  closeLightbox(): void {
    this.isLightboxOpen.set(false);
  }

  /**
   * Obtiene la URL completa del archivo en PocketBase.
   */
  getPbFullUrl(item: InventarioItem, filename: string): string {
    return this.inventarioService['pbService'].getFileUrl(item, filename);
  }

  /**
   * Formatea valores monetarios en Euros.
   */
  formatCurrency(val: number | null | undefined): string {
    if (val == null || isNaN(val)) return '—';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(val);
  }

  /**
   * Asigna estilos visuales de badges según el estado comercial.
   */
  getEstadoBadgeClass(estado: string | null | undefined): string {
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

  /**
   * Normaliza fechas europeas o cadenas ISO para inputs de tipo fecha (YYYY-MM-DD).
   */
  private formatDateForInput(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();

    // Si ya viene en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }

    // Si viene en formato DD/MM/YYYY
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3 && parts[2].length === 4) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }

    return trimmed;
  }

  // --- Métodos de Gestión de Gastos Extra en la Ficha ---

  openAddGastoDialog(): void {
    this.gastoToEdit.set(null);
    this.isGastoDialogOpen.set(true);
  }

  openEditGastoDialog(gasto: GastoExtra): void {
    this.gastoToEdit.set(gasto);
    this.isGastoDialogOpen.set(true);
  }

  openDeleteGastoDialog(gasto: GastoExtra): void {
    this.gastoToDelete.set(gasto);
    this.isDeleteGastoDialogOpen.set(true);
  }

  closeDeleteGastoDialog(): void {
    this.isDeleteGastoDialogOpen.set(false);
    this.gastoToDelete.set(null);
  }

  async executeDeleteGasto(): Promise<void> {
    const g = this.gastoToDelete();
    if (!g) return;

    this.isDeletingGasto.set(true);
    try {
      await this.gastosService.deleteGasto(g.id);
      toast.success('Gasto extra eliminado correctamente.');
      this.closeDeleteGastoDialog();
      await this.reloadItemGastos();
    } catch (err: any) {
      console.error('Error al eliminar gasto:', err);
      toast.error('Error al eliminar el gasto extra.');
    } finally {
      this.isDeletingGasto.set(false);
    }
  }

  async onGastoSaved(_saved: GastoExtra): Promise<void> {
    toast.success('Gasto extra guardado correctamente.');
    await this.reloadItemGastos();
  }

  async reloadItemGastos(): Promise<void> {
    const it = this.item();
    if (!it) return;
    const updatedGastos = await this.gastosService.getGastosByPieza(it.id, it.ref);
    this.gastos.set(updatedGastos);
  }
}
