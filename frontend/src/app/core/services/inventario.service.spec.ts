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

  it('should toggle filterVendido across three states (vendido, no_vendido, all)', async () => {
    // 1er clic: vendido
    service.toggleFilterVendido();
    expect(service.filterVendido()).toBe('vendido');
    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: '(fecha_venta != "" && fecha_venta != null)',
        })
      );
    });

    // 2do clic: no_vendido
    service.toggleFilterVendido();
    expect(service.filterVendido()).toBe('no_vendido');
    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: '(fecha_venta = "" || fecha_venta = null)',
        })
      );
    });

    // 3er clic: all (desactivado)
    service.toggleFilterVendido();
    expect(service.filterVendido()).toBe('all');
    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: undefined,
        })
      );
    });
  });

  it('should toggle filterPagado across three states (pagado, no_pagado, all)', async () => {
    // 1er clic: pagado
    service.toggleFilterPagado();
    expect(service.filterPagado()).toBe('pagado');
    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: '(fecha_pagado != "" && fecha_pagado != null)',
        })
      );
    });

    // 2do clic: no_pagado
    service.toggleFilterPagado();
    expect(service.filterPagado()).toBe('no_pagado');
    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: '(fecha_pagado = "" || fecha_pagado = null)',
        })
      );
    });

    // 3er clic: all (desactivado)
    service.toggleFilterPagado();
    expect(service.filterPagado()).toBe('all');
    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: undefined,
        })
      );
    });
  });

  it('should toggle predefined estados AEM and Berlin', async () => {
    service.togglePredefinedEstado('AEM');
    expect(service.selectedEstado()).toBe('AEM');

    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: 'estado ~ "AEM"',
        })
      );
    });

    // Al pulsar el mismo, conmuta a 'all'
    service.togglePredefinedEstado('AEM');
    expect(service.selectedEstado()).toBe('all');

    // Al pulsar Berlin, activa Berlin
    service.togglePredefinedEstado('Berlin');
    expect(service.selectedEstado()).toBe('Berlin');
    await vi.waitFor(() => {
      expect(getListSpy).toHaveBeenCalledWith(
        1,
        25,
        expect.objectContaining({
          filter: 'estado ~ "Berlin"',
        })
      );
    });
  });

  it('should reset predefined filters when calling setTodos', async () => {
    service.setFilterVendido('vendido');
    service.setFilterPagado('no_pagado');
    service.setEstado('AEM');
    expect(service.isTodosActive()).toBe(false);

    service.setTodos();
    expect(service.filterVendido()).toBe('all');
    expect(service.filterPagado()).toBe('all');
    expect(service.selectedEstado()).toBe('all');
    expect(service.isTodosActive()).toBe(true);
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

  it('should fetch single item by id', async () => {
    const mockItem = { id: 'item1', ref: 1 };
    const getOneSpy = vi.fn().mockResolvedValue(mockItem);
    mockPbService.pb.collection = vi.fn().mockReturnValue({
      getList: getListSpy,
      getOne: getOneSpy,
    });

    const result = await service.getItemById('item1');
    expect(getOneSpy).toHaveBeenCalledWith('item1', { requestKey: null });
    expect(result).toEqual(mockItem);
  });

  it('should update item and update local signal list', async () => {
    const updatedData = { pvp: 800 };
    const updateSpy = vi.fn().mockResolvedValue({ id: 'item1', ref: 1, pvp: 800 });
    mockPbService.pb.collection = vi.fn().mockReturnValue({
      getList: getListSpy,
      update: updateSpy,
    });

    const result = await service.updateItem('item1', updatedData);
    expect(updateSpy).toHaveBeenCalledWith('item1', updatedData);
    expect(result.pvp).toBe(800);
    expect(service.items().find((i) => i.id === 'item1')?.pvp).toBe(800);
  });

  it('should delete item and remove it from signal list', async () => {
    const deleteSpy = vi.fn().mockResolvedValue(true);
    mockPbService.pb.collection = vi.fn().mockReturnValue({
      getList: getListSpy,
      delete: deleteSpy,
    });

    await service.deleteItem('item1');
    expect(deleteSpy).toHaveBeenCalledWith('item1');
    expect(service.items().find((i) => i.id === 'item1')).toBeUndefined();
    expect(service.totalItems()).toBe(1);
  });

  it('should fetch related gastos extra for an item', async () => {
    const mockGastos = [{ id: 'g1', ref_pieza: 1, importe: 40 }];
    const getFullListSpy = vi.fn().mockResolvedValue(mockGastos);
    mockPbService.pb.collection = vi.fn().mockReturnValue({
      getList: getListSpy,
      getFullList: getFullListSpy,
    });

    const result = await service.getItemGastos(1, 'item1');
    expect(getFullListSpy).toHaveBeenCalledWith({
      filter: '(ref_pieza = 1 || pieza = "item1")',
      sort: '-fecha_gasto',
      requestKey: null,
    });
    expect(result).toEqual(mockGastos);
  });

  it('should return all photo full urls', () => {
    const itemWithMultiple: InventarioItem = {
      id: 'it1',
      ref: 5,
      fotos: ['a.jpg', 'b.jpg'],
    };
    const urls = service.getItemPhotoUrls(itemWithMultiple);
    expect(urls.length).toBe(2);
    expect(mockPbService.getFileUrl).toHaveBeenCalledTimes(2);
  });
});

