import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CreateGastoDto,
  GastoExtra,
  GastoPaymentStatus,
  GastosStats,
  UpdateGastoDto,
} from '../models/gastos.model';
import { InventarioItem } from '../models/inventario.model';
import { PocketBaseService } from './pocketbase.service';

export type SortDirection = 'asc' | 'desc';

@Injectable({
  providedIn: 'root',
})
export class GastosService {
  private readonly pbService = inject(PocketBaseService);

  // Listado paginado actual
  readonly gastos = signal<GastoExtra[]>([]);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly page = signal<number>(1);
  readonly perPage = signal<number>(20);

  // Filtros reactivos
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<GastoPaymentStatus>('todos');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly sortField = signal<string>('fecha_gasto');
  readonly sortDirection = signal<SortDirection>('desc');

  // Estados de control
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Todos los gastos para cálculo global de estadísticas
  readonly allGastosSummary = signal<GastoExtra[]>([]);

  // Estadísticas globales reactivas
  readonly stats = computed<GastosStats>(() => {
    const list = this.allGastosSummary();
    let totalGastos = 0;
    let totalPagado = 0;
    let totalPendiente = 0;
    let countPendientes = 0;
    let countPagados = 0;

    for (const g of list) {
      const imp = Number(g.importe) || 0;
      totalGastos += imp;
      const isPaid = !!(g.fecha_pago && g.fecha_pago.trim().length > 0);
      if (isPaid) {
        totalPagado += imp;
        countPagados++;
      } else {
        totalPendiente += imp;
        countPendientes++;
      }
    }

    return {
      totalGastos,
      totalPagado,
      totalPendiente,
      countPendientes,
      countPagados,
      countTotal: list.length,
    };
  });

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery().trim().length > 0 ||
      this.statusFilter() !== 'todos' ||
      this.startDate().length > 0 ||
      this.endDate().length > 0
  );

  constructor() {
    this.refreshAll();
  }

  /**
   * Refresca las estadísticas globales y el listado actual.
   */
  async refreshAll(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadGastos()]);
  }

  /**
   * Carga el resumen de todos los gastos para alimentar las tarjetas KPI.
   */
  async loadStats(): Promise<void> {
    try {
      const list = await this.pbService.pb
        .collection('gastos_extra')
        .getFullList<GastoExtra>({
          fields: 'id,importe,fecha_pago,fecha_gasto',
          requestKey: null,
        });
      this.allGastosSummary.set(list);
    } catch (err: any) {
      console.warn('Error al cargar estadísticas de gastos:', err);
    }
  }

  /**
   * Carga el listado paginado con los filtros activos.
   */
  async loadGastos(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const filterConditions: string[] = [];

      // Filtro de estado de pago
      if (this.statusFilter() === 'pendientes') {
        filterConditions.push('(fecha_pago = "" || fecha_pago = null)');
      } else if (this.statusFilter() === 'pagados') {
        filterConditions.push('(fecha_pago != "" && fecha_pago != null)');
      }

      // Filtro de búsqueda textual o por referencia
      const q = this.searchQuery().trim();
      if (q) {
        const numRef = Number(q);
        if (!isNaN(numRef) && numRef > 0) {
          filterConditions.push(
            `(ref_pieza = ${numRef} || descripcion ~ "${q}" || comentarios ~ "${q}")`
          );
        } else {
          filterConditions.push(
            `(descripcion ~ "${q}" || comentarios ~ "${q}")`
          );
        }
      }

      // Rango de fechas de gasto
      if (this.startDate()) {
        filterConditions.push(`fecha_gasto >= "${this.startDate()}"`);
      }
      if (this.endDate()) {
        filterConditions.push(`fecha_gasto <= "${this.endDate()}"`);
      }

      const sortPrefix = this.sortDirection() === 'desc' ? '-' : '+';
      const sort = `${sortPrefix}${this.sortField()}`;

      const result = await this.pbService.pb
        .collection('gastos_extra')
        .getList<GastoExtra>(this.page(), this.perPage(), {
          filter: filterConditions.length > 0 ? filterConditions.join(' && ') : '',
          sort,
          expand: 'pieza',
          requestKey: null,
        });

      this.gastos.set(result.items);
      this.totalItems.set(result.totalItems);
      this.totalPages.set(result.totalPages);
    } catch (err: any) {
      if (err.isAbort) return;
      console.error('Error al cargar gastos extra:', err);
      this.error.set('No se pudieron cargar los gastos extra.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Modificadores de filtro
  setSearch(query: string): void {
    this.searchQuery.set(query);
    this.page.set(1);
    this.loadGastos();
  }

  setStatusFilter(status: GastoPaymentStatus): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadGastos();
  }

  setDateRange(start: string, end: string): void {
    this.startDate.set(start);
    this.endDate.set(end);
    this.page.set(1);
    this.loadGastos();
  }

  setSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('desc');
    }
    this.page.set(1);
    this.loadGastos();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.page.set(page);
      this.loadGastos();
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('todos');
    this.startDate.set('');
    this.endDate.set('');
    this.page.set(1);
    this.loadGastos();
  }

  /**
   * Obtiene un gasto por su ID.
   */
  async getGastoById(id: string): Promise<GastoExtra> {
    return await this.pbService.pb
      .collection('gastos_extra')
      .getOne<GastoExtra>(id, {
        expand: 'pieza',
        requestKey: null,
      });
  }

  /**
   * Obtiene todos los gastos asociados a una pieza.
   */
  async getGastosByPieza(piezaId: string, refPieza?: number): Promise<GastoExtra[]> {
    try {
      const filter = refPieza
        ? `(pieza = "${piezaId}" || ref_pieza = ${refPieza})`
        : `pieza = "${piezaId}"`;

      return await this.pbService.pb
        .collection('gastos_extra')
        .getFullList<GastoExtra>({
          filter,
          sort: '-fecha_gasto',
          requestKey: null,
        });
    } catch {
      return [];
    }
  }

  /**
   * Crea un nuevo gasto extra y actualiza las estadísticas.
   */
  async createGasto(dto: CreateGastoDto): Promise<GastoExtra> {
    const created = await this.pbService.pb
      .collection('gastos_extra')
      .create<GastoExtra>(dto);

    // Refrescar datos
    await this.refreshAll();
    return created;
  }

  /**
   * Actualiza un gasto extra existente.
   */
  async updateGasto(id: string, dto: UpdateGastoDto): Promise<GastoExtra> {
    const updated = await this.pbService.pb
      .collection('gastos_extra')
      .update<GastoExtra>(id, dto, {
        expand: 'pieza',
      });

    await this.refreshAll();
    return updated;
  }

  /**
   * Elimina un gasto extra.
   */
  async deleteGasto(id: string): Promise<boolean> {
    const success = await this.pbService.pb.collection('gastos_extra').delete(id);
    await this.refreshAll();
    return success;
  }

  /**
   * Busca piezas en el catálogo para el autocompletado en el formulario de gastos.
   */
  async searchPiezas(query: string, limit = 8): Promise<InventarioItem[]> {
    const q = query.trim();
    if (!q) {
      // Devolver las primeras piezas ordenadas por referencia
      const res = await this.pbService.pb
        .collection('inventario')
        .getList<InventarioItem>(1, limit, {
          sort: '+ref',
          fields: 'id,ref,descripcion,estado,pvp,foto_url,fotos',
          requestKey: null,
        });
      return res.items;
    }

    const num = Number(q);
    let filter = '';
    if (!isNaN(num) && num > 0) {
      filter = `ref = ${num} || descripcion ~ "${q}"`;
    } else {
      filter = `descripcion ~ "${q}"`;
    }

    try {
      const res = await this.pbService.pb
        .collection('inventario')
        .getList<InventarioItem>(1, limit, {
          filter,
          sort: '+ref',
          fields: 'id,ref,descripcion,estado,pvp,foto_url,fotos',
          requestKey: null,
        });
      return res.items;
    } catch {
      return [];
    }
  }
}
