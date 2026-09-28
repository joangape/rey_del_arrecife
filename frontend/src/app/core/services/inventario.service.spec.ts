import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventarioItem } from '../models/inventario.model';
import { InventarioService } from './inventario.service';
import { PocketBaseService } from './pocketbase.service';

describe('InventarioService', () => {
  let service: InventarioService;
  let mockPbService: any;
  let getListSpy: any;

  const mockItems: InventarioItem[] = [
    {
      id: 'item1',
      ref: 1,
      descripcion: 'Velo de novia',
      origen: 'Londres',
      pvp: 600,
      costo: 75,
      estado: 'AEM',
      fecha_compra: '2011-08-15',
    },
    {
      id: 'item2',
      ref: 2,
      descripcion: 'Broche vintage',
      origen: 'Tiergarten',
      pvp: 120,
      costo: 30,
      estado: 'En sobre',
      fecha_compra: '2015-05-10',
    },
  ];

  beforeEach(() => {
    localStorage.clear();

    getListSpy = vi.fn().mockImplementation((page: number, perPage: number, options: any) => {
      // Si consulta para origenes
      if (options?.fields === 'origen') {
        return Promise.resolve({
          items: [{ origen: 'Londres' }, { origen: 'Tiergarten' }],
          totalItems: 2,
          totalPages: 1,
          page: 1,
          perPage: 350,
        });
      }

      return Promise.resolve({
        items: mockItems,
        totalItems: 2,
        totalPages: 1,
        page: page || 1,
        perPage: perPage || 25,
      });
    });

    mockPbService = {
      pb: {
        collection: vi.fn().mockReturnValue({
          getList: getListSpy,
        }),
      },
      getFileUrl: vi.fn().mockReturnValue('http://localhost:8090/files/thumb.jpg'),
      getErrorMessage: vi.fn().mockReturnValue('Error de conexión simulado'),
    };

    TestBed.configureTestingModule({
      providers: [
        InventarioService,
        { provide: PocketBaseService, useValue: mockPbService },
      ],
    });

    service = TestBed.inject(InventarioService);
  });

  it('should initialize and load items and origins', async () => {
    expect(service).toBeTruthy();
    expect(service.page()).toBe(1);
    expect(service.perPage()).toBe(25);
    expect(service.sortField()).toBe('ref');
    expect(service.sortDirection()).toBe('asc');
    expect(service.viewMode()).toBe('table');

    // Esperar a que las promesas de inicialización terminen
    await vi.waitFor(() => {
      expect(service.items().length).toBe(2);
      expect(service.totalItems()).toBe(2);
      expect(service.availableOrigenes()).toEqual(['Londres', 'Tiergarten']);
    });
  });

  it('should update search query, reset page to 1 and reload items', async () => {
    service.setSearch('123');
    expect(service.searchQuery()).toBe('123');
    expect(service.page()).toBe(1);

    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: '(ref = 123 || descripcion ~ "123" || origen ~ "123" || estado ~ "123")',
        })
      );
    });
  });

  it('should filter by estado', async () => {
    service.setEstado('En sobre');
    expect(service.selectedEstado()).toBe('En sobre');

    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: 'estado ~ "En sobre"',
        })
      );
    });
  });

  it('should filter by origen', async () => {
    service.setOrigen('Londres');
    expect(service.selectedOrigen()).toBe('Londres');

    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: 'origen = "Londres"',
        })
      );
    });
  });

  it('should toggle sort field and direction', async () => {
    // Primera llamada para ordenar por pvp -> asc
    service.setSort('pvp');
    expect(service.sortField()).toBe('pvp');
    expect(service.sortDirection()).toBe('asc');

    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          sort: '+pvp',
        })
      );
    });

    // Segunda llamada para ordenar por pvp -> desc
    service.setSort('pvp');
    expect(service.sortField()).toBe('pvp');
    expect(service.sortDirection()).toBe('desc');

    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          sort: '-pvp',
        })
      );
    });
  });

  it('should change page and perPage', async () => {
    // Simular que hay más páginas
    service.totalPages.set(5);
    service.setPage(2);
    expect(service.page()).toBe(2);

    service.setPerPage(50);
    expect(service.perPage()).toBe(50);
  });

  it('should toggle view mode and persist in localStorage', () => {
    service.setViewMode('grid');
    expect(service.viewMode()).toBe('grid');
    expect(localStorage.getItem('rda_inventario_view')).toBe('grid');

    service.setViewMode('table');
    expect(service.viewMode()).toBe('table');
    expect(localStorage.getItem('rda_inventario_view')).toBe('table');
  });

  it('should reset all filters and return to default state', async () => {
    service.setSearch('test');
    service.setEstado('AEM');
    service.setOrigen('Berlin');
    expect(service.hasActiveFilters()).toBe(true);

    service.resetFilters();
    expect(service.searchQuery()).toBe('');
    expect(service.selectedEstado()).toBe('all');
    expect(service.selectedOrigen()).toBe('all');
    expect(service.page()).toBe(1);
    expect(service.hasActiveFilters()).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    getListSpy.mockRejectedValueOnce(new Error('Network failure'));

    await service.loadItems();

    expect(service.error()).toBe('Error de conexión simulado');
    expect(service.items()).toEqual([]);
    expect(service.isLoading()).toBe(false);
  });

  it('should calculate totalPvpCurrentPage correctly', () => {
    expect(service.totalPvpCurrentPage()).toBe(720); // 600 + 120
  });

  it('should return photo thumbnail if item has fotos', () => {
    const itemWithFotos: InventarioItem = {
      id: 'test',
      ref: 99,
      fotos: ['img1.jpg'],
    };
    const url = service.getItemThumbnail(itemWithFotos);
    expect(url).toBe('http://localhost:8090/files/thumb.jpg');
    expect(mockPbService.getFileUrl).toHaveBeenCalled();

    const itemWithoutFotos: InventarioItem = {
      id: 'test2',
      ref: 100,
    };
    expect(service.getItemThumbnail(itemWithoutFotos)).toBeNull();
  });
});
