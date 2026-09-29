import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GastoExtra } from '../models/gastos.model';
import { GastosService } from './gastos.service';
import { PocketBaseService } from './pocketbase.service';

describe('GastosService', () => {
  let service: GastosService;
  let mockPbService: any;
  let getListSpy: any;
  let getFullListSpy: any;
  let createSpy: any;
  let updateSpy: any;
  let deleteSpy: any;

  const mockGastosList: GastoExtra[] = [
    {
      id: 'g1',
      ref_pieza: 1,
      pieza: 'p1',
      descripcion: 'Enfilado collar',
      importe: 45,
      fecha_gasto: '2023-01-10',
      fecha_pago: '2023-01-20',
      comentarios: 'Taller central',
    },
    {
      id: 'g2',
      ref_pieza: 2,
      pieza: 'p2',
      descripcion: 'Engarce brillante',
      importe: 120,
      fecha_gasto: '2023-02-15',
      fecha_pago: '',
      comentarios: 'Pendiente entrega',
    },
  ];

  beforeEach(() => {
    getListSpy = vi.fn().mockImplementation((page: number, perPage: number, options: any) => {
      return Promise.resolve({
        items: mockGastosList,
        totalItems: mockGastosList.length,
        totalPages: 1,
        page: page || 1,
        perPage: perPage || 20,
      });
    });

    getFullListSpy = vi.fn().mockImplementation((options: any) => {
      return Promise.resolve(mockGastosList);
    });

    createSpy = vi.fn().mockImplementation((dto: any) => {
      return Promise.resolve({ id: 'g3', ...dto });
    });

    updateSpy = vi.fn().mockImplementation((id: string, dto: any) => {
      return Promise.resolve({ id, ...dto });
    });

    deleteSpy = vi.fn().mockResolvedValue(true);

    mockPbService = {
      pb: {
        collection: vi.fn((colName: string) => {
          if (colName === 'gastos_extra') {
            return {
              getList: getListSpy,
              getFullList: getFullListSpy,
              getOne: vi.fn().mockResolvedValue(mockGastosList[0]),
              create: createSpy,
              update: updateSpy,
              delete: deleteSpy,
            };
          }
          if (colName === 'inventario') {
            return {
              getList: vi.fn().mockResolvedValue({
                items: [{ id: 'p1', ref: 1, descripcion: 'Anillo oro', estado: 'AEM' }],
                totalItems: 1,
              }),
            };
          }
          return {};
        }),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        GastosService,
        { provide: PocketBaseService, useValue: mockPbService },
      ],
    });

    service = TestBed.inject(GastosService);
  });

  it('should initialize and load gastos and stats', async () => {
    await service.refreshAll();
    expect(service.gastos().length).toBe(2);
    expect(service.totalItems()).toBe(2);

    const stats = service.stats();
    expect(stats.totalGastos).toBe(165); // 45 + 120
    expect(stats.totalPagado).toBe(45);
    expect(stats.totalPendiente).toBe(120);
    expect(stats.countPagados).toBe(1);
    expect(stats.countPendientes).toBe(1);
    expect(stats.countTotal).toBe(2);
  });

  it('should filter by payment status "pendientes"', async () => {
    service.setStatusFilter('pendientes');
    expect(service.statusFilter()).toBe('pendientes');
    expect(service.page()).toBe(1);

    expect(getListSpy).toHaveBeenCalledWith(
      1,
      20,
      expect.objectContaining({
        filter: expect.stringContaining('(fecha_pago = "" || fecha_pago = null)'),
      })
    );
  });

  it('should filter by search query (numeric ref and text)', async () => {
    service.setSearch('12');
    expect(service.searchQuery()).toBe('12');

    expect(getListSpy).toHaveBeenCalledWith(
      1,
      20,
      expect.objectContaining({
        filter: expect.stringContaining('ref_pieza = 12'),
      })
    );
  });

  it('should filter by date range', async () => {
    service.setDateRange('2023-01-01', '2023-12-31');
    expect(service.startDate()).toBe('2023-01-01');
    expect(service.endDate()).toBe('2023-12-31');

    expect(getListSpy).toHaveBeenCalledWith(
      1,
      20,
      expect.objectContaining({
        filter: expect.stringContaining('fecha_gasto >= "2023-01-01"'),
      })
    );
  });

  it('should toggle sort direction when sorting on the same field', () => {
    service.setSort('importe');
    expect(service.sortField()).toBe('importe');
    expect(service.sortDirection()).toBe('desc');

    service.setSort('importe');
    expect(service.sortDirection()).toBe('asc');
  });

  it('should reset filters', () => {
    service.setSearch('test');
    service.setStatusFilter('pagados');
    service.setDateRange('2023-01-01', '2023-05-01');

    service.resetFilters();
    expect(service.searchQuery()).toBe('');
    expect(service.statusFilter()).toBe('todos');
    expect(service.startDate()).toBe('');
    expect(service.endDate()).toBe('');
    expect(service.hasActiveFilters()).toBe(false);
  });

  it('should create a new gasto and refresh data', async () => {
    const dto = {
      pieza: 'p1',
      ref_pieza: 1,
      fecha_gasto: '2023-03-01',
      descripcion: 'Pulido',
      importe: 25,
    };

    const res = await service.createGasto(dto);
    expect(createSpy).toHaveBeenCalledWith(dto);
    expect(res.id).toBe('g3');
    expect(getFullListSpy).toHaveBeenCalled();
  });

  it('should update an existing gasto and refresh', async () => {
    const res = await service.updateGasto('g1', { importe: 50 });
    expect(updateSpy).toHaveBeenCalledWith('g1', { importe: 50 }, expect.anything());
    expect(res.importe).toBe(50);
  });

  it('should delete a gasto', async () => {
    const res = await service.deleteGasto('g1');
    expect(deleteSpy).toHaveBeenCalledWith('g1');
    expect(res).toBe(true);
  });

  it('should search piezas for autocomplete', async () => {
    const piezas = await service.searchPiezas('anillo');
    expect(piezas.length).toBe(1);
    expect(piezas[0].ref).toBe(1);
  });
});
