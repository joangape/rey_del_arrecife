import { Injectable, computed, inject, signal } from '@angular/core';
import { InventarioFilter, InventarioItem } from '../models/inventario.model';
import { PocketBaseService } from './pocketbase.service';

export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'table' | 'grid';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  private readonly pbService = inject(PocketBaseService);

  // Estado reactivo principal
  readonly items = signal<InventarioItem[]>([]);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly page = signal<number>(1);
  readonly perPage = signal<number>(25);

  // Filtros y ordenación
  readonly searchQuery = signal<string>('');
  readonly selectedEstado = signal<string>('all');
  readonly selectedOrigen = signal<string>('all');
  readonly sortField = signal<string>('ref');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly viewMode = signal<ViewMode>('table');

  // Estados de control
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Listas de filtros dinámicos
  readonly availableOrigenes = signal<string[]>([]);
  readonly quickEstados = [
    { label: 'Todos', value: 'all' },
    { label: 'En sobre', value: 'En sobre' },
    { label: 'AEM', value: 'AEM' },
    { label: 'VyP', value: 'VyP' },
    { label: 'Disponible', value: 'Disponible' },
    { label: 'Berlin', value: 'Berlin' },
  ];

  // Señales computadas
  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery().trim().length > 0 ||
      this.selectedEstado() !== 'all' ||
      this.selectedOrigen() !== 'all'
  );

  readonly totalPvpCurrentPage = computed(() =>
    this.items().reduce((sum, item) => sum + (item.pvp || 0), 0)
  );

  constructor() {
    this.initViewMode();
    this.loadOrigenes();
    this.loadItems();
  }

  private initViewMode(): void {
    try {
      const saved = localStorage.getItem('rda_inventario_view');
      if (saved === 'grid' || saved === 'table') {
        this.viewMode.set(saved);
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Carga los artículos de inventario aplicando filtros, ordenación y paginación.
   */
  async loadItems(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const filterClauses: string[] = [];
      const query = this.searchQuery().trim();
      const estado = this.selectedEstado();
      const origen = this.selectedOrigen();

      if (query) {
        const isNumeric = /^\d+$/.test(query);
        if (isNumeric) {
          filterClauses.push(
            `(ref = ${query} || descripcion ~ "${query}" || origen ~ "${query}" || estado ~ "${query}")`
          );
        } else {
          filterClauses.push(
            `(descripcion ~ "${query}" || origen ~ "${query}" || estado ~ "${query}")`
          );
        }
      }

      if (estado !== 'all') {
        filterClauses.push(`estado ~ "${estado}"`);
      }

      if (origen !== 'all') {
        filterClauses.push(`origen = "${origen}"`);
      }

      const sortPrefix = this.sortDirection() === 'desc' ? '-' : '+';
      const sortParam = `${sortPrefix}${this.sortField()}`;

      const res = await this.pbService.pb
        .collection('inventario')
        .getList<InventarioItem>(this.page(), this.perPage(), {
          filter: filterClauses.length > 0 ? filterClauses.join(' && ') : undefined,
          sort: sortParam,
          requestKey: null,
        });

      this.items.set(res.items);
      this.totalItems.set(res.totalItems);
      this.totalPages.set(res.totalPages || 1);
    } catch (err: unknown) {
      const msg = this.pbService.getErrorMessage(err);
      this.error.set(msg);
      this.items.set([]);
      this.totalItems.set(0);
      this.totalPages.set(1);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Carga los orígenes únicos disponibles en el catálogo para el filtro rápido.
   */
  async loadOrigenes(): Promise<void> {
    try {
      // Consulta una muestra amplia para deducir orígenes distintos
      const res = await this.pbService.pb
        .collection('inventario')
        .getList<InventarioItem>(1, 350, {
          fields: 'origen',
          sort: 'origen',
          requestKey: null,
        });

      const unique = new Set<string>();
      for (const item of res.items) {
        if (item.origen && item.origen.trim()) {
          unique.add(item.origen.trim());
        }
      }
      this.availableOrigenes.set(Array.from(unique).sort());
    } catch {
      // Orígenes por defecto si falla la petición
      this.availableOrigenes.set([
        'Agra Leipzig',
        'Arkonaplatz',
        'Berlin',
        'Karlshorst',
        'Londres',
        'Mixto',
        'Ostbahnhof',
        'Tiergarten',
      ]);
    }
  }

  /**
   * Actualiza el término de búsqueda y reinicia a la página 1.
   */
  setSearch(query: string): void {
    if (this.searchQuery() === query) return;
    this.searchQuery.set(query);
    this.page.set(1);
    this.loadItems();
  }

  /**
   * Actualiza el filtro de estado y reinicia a la página 1.
   */
  setEstado(estado: string): void {
    if (this.selectedEstado() === estado) return;
    this.selectedEstado.set(estado);
    this.page.set(1);
    this.loadItems();
  }

  /**
   * Actualiza el filtro de origen y reinicia a la página 1.
   */
  setOrigen(origen: string): void {
    if (this.selectedOrigen() === origen) return;
    this.selectedOrigen.set(origen);
    this.page.set(1);
    this.loadItems();
  }

  /**
   * Alterna la columna de orden o su dirección.
   */
  setSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.page.set(1);
    this.loadItems();
  }

  /**
   * Cambia la página actual.
   */
  setPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.loadItems();
  }

  /**
   * Modifica el número de elementos por página.
   */
  setPerPage(count: number): void {
    if (this.perPage() === count) return;
    this.perPage.set(count);
    this.page.set(1);
    this.loadItems();
  }

  /**
   * Alterna entre vista de tabla y cuadrícula de tarjetas.
   */
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    try {
      localStorage.setItem('rda_inventario_view', mode);
    } catch {
      // Ignore
    }
  }

  /**
   * Restablece todos los filtros activos al estado por defecto.
   */
  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedEstado.set('all');
    this.selectedOrigen.set('all');
    this.sortField.set('ref');
    this.sortDirection.set('asc');
    this.page.set(1);
    this.loadItems();
  }

  /**
   * Obtiene la URL de miniatura de imagen si existe en PocketBase.
   */
  getItemThumbnail(item: InventarioItem): string | null {
    if (item.fotos && item.fotos.length > 0) {
      return this.pbService.getFileUrl(item, item.fotos[0], { thumb: '100x100' });
    }
    return null;
  }

  /**
   * Obtiene todas las URLs públicas completas de las fotos cargadas en PocketBase para una pieza.
   */
  getItemPhotoUrls(item: InventarioItem): string[] {
    if (!item.fotos || item.fotos.length === 0) {
      return [];
    }
    return item.fotos.map((filename) => this.pbService.getFileUrl(item, filename));
  }

  /**
   * @deprecated Campo histórico en desuso tras migración de imágenes a PocketBase.
   */
  hasExternalPhoto(item: InventarioItem): boolean {
    return !!(item.foto_url && item.foto_url.trim().startsWith('http'));
  }

  /**
   * Obtiene una pieza por su ID de PocketBase.
   */
  async getItemById(id: string): Promise<InventarioItem> {
    return await this.pbService.pb.collection('inventario').getOne<InventarioItem>(id, {
      requestKey: null,
    });
  }

  /**
   * Actualiza los datos de una pieza. Acepta objeto parcial o FormData (para archivos).
   */
  async updateItem(
    id: string,
    data: Partial<InventarioItem> | FormData
  ): Promise<InventarioItem> {
    const updated = await this.pbService.pb
      .collection('inventario')
      .update<InventarioItem>(id, data);

    // Actualiza la lista en memoria si el ítem ya existe en la página
    this.items.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );

    return updated;
  }

  /**
   * Elimina una pieza por su ID.
   */
  async deleteItem(id: string): Promise<void> {
    await this.pbService.pb.collection('inventario').delete(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.totalItems.update((t) => Math.max(0, t - 1));
  }

  /**
   * Da de alta una nueva pieza de inventario.
   */
  async createItem(
    data: Partial<InventarioItem> | FormData
  ): Promise<InventarioItem> {
    const created = await this.pbService.pb
      .collection('inventario')
      .create<InventarioItem>(data);
    this.loadItems();
    return created;
  }

  /**
   * Carga los gastos extra vinculados a una pieza (por ref o id de pieza).
   */
  async getItemGastos(itemRef: number, itemId?: string): Promise<any[]> {
    try {
      const filter = itemId
        ? `(ref_pieza = ${itemRef} || pieza = "${itemId}")`
        : `ref_pieza = ${itemRef}`;

      return await this.pbService.pb.collection('gastos_extra').getFullList({
        filter,
        sort: '-fecha_gasto',
        requestKey: null,
      });
    } catch {
      return [];
    }
  }

  /**
   * Sube una o varias fotografías adjuntas a PocketBase para la pieza indicada.
   */
  async uploadItemPhotos(id: string, files: File[]): Promise<InventarioItem> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('fotos+', file);
    }
    return await this.updateItem(id, formData);
  }

  /**
   * Elimina un archivo fotográfico específico adjunto a una pieza.
   */
  async deleteItemPhoto(id: string, filename: string): Promise<InventarioItem> {
    return await this.pbService.pb.collection('inventario').update<InventarioItem>(id, {
      'fotos-': [filename],
    });
  }
}
