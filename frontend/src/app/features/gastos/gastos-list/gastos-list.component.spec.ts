import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GastoExtra } from '../../../core/models/gastos.model';
import { AuthService } from '../../../core/services/auth.service';
import { GastosService } from '../../../core/services/gastos.service';
import { PocketBaseService } from '../../../core/services/pocketbase.service';
import { GastosListComponent } from './gastos-list.component';

describe('GastosListComponent', () => {
  let component: GastosListComponent;
  let fixture: ComponentFixture<GastosListComponent>;
  let mockGastosService: any;
  let mockAuthService: any;
  let mockPbService: any;

  const mockGastos: GastoExtra[] = [
    {
      id: 'g1',
      ref_pieza: 12,
      pieza: 'p12',
      descripcion: 'Enfilado collar',
      importe: 40,
      fecha_gasto: '2023-05-10',
      fecha_pago: '2023-05-20',
      expand: {
        pieza: { id: 'p12', ref: 12, descripcion: 'Collar perlas' } as any,
      },
    },
    {
      id: 'g2',
      ref_pieza: 15,
      pieza: 'p15',
      descripcion: 'Engarce solitario',
      importe: 85,
      fecha_gasto: '2023-06-01',
      fecha_pago: '',
      expand: {
        pieza: { id: 'p15', ref: 15, descripcion: 'Anillo solitario' } as any,
      },
    },
  ];

  beforeEach(async () => {
    mockGastosService = {
      gastos: signal(mockGastos),
      totalItems: signal(2),
      totalPages: signal(1),
      page: signal(1),
      perPage: signal(20),
      searchQuery: signal(''),
      statusFilter: signal('todos'),
      sortField: signal('fecha_gasto'),
      sortDirection: signal('desc'),
      isLoading: signal(false),
      hasActiveFilters: signal(false),
      stats: signal({
        totalGastos: 125,
        totalPagado: 40,
        totalPendiente: 85,
        countPendientes: 1,
        countPagados: 1,
        countTotal: 2,
      }),
      setSearch: vi.fn(),
      setStatusFilter: vi.fn(),
      setDateRange: vi.fn(),
      setSort: vi.fn(),
      setPage: vi.fn(),
      resetFilters: vi.fn(),
      deleteGasto: vi.fn().mockResolvedValue(true),
      searchPiezas: vi.fn().mockResolvedValue([]),
    };

    mockAuthService = {
      isAdmin: signal(false),
      isPartner: signal(true),
    };

    mockPbService = {
      getFileUrl: vi.fn().mockReturnValue('https://pb.local/thumb.jpg'),
      pb: {
        collection: vi.fn(),
      },
    };

    await TestBed.configureTestingModule({
      imports: [GastosListComponent],
      providers: [
        provideRouter([]),
        { provide: GastosService, useValue: mockGastosService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: PocketBaseService, useValue: mockPbService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GastosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display KPI values correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('125,00');
    expect(compiled.textContent).toContain('40,00');
    expect(compiled.textContent).toContain('85,00');
  });

  it('should trigger search on input', () => {
    component.onSearchChange('enfilado');
    expect(mockGastosService.setSearch).toHaveBeenCalledWith('enfilado');
  });

  it('should trigger status filter change', () => {
    component.onStatusChange('pendientes');
    expect(mockGastosService.setStatusFilter).toHaveBeenCalledWith('pendientes');
  });

  it('should open create dialog when requested', () => {
    component.openCreateDialog();
    expect(component.isFormDialogOpen()).toBe(true);
    expect(component.gastoToEdit()).toBeNull();
  });

  it('should open edit dialog with selected gasto', () => {
    component.openEditDialog(mockGastos[0]);
    expect(component.isFormDialogOpen()).toBe(true);
    expect(component.gastoToEdit()).toEqual(mockGastos[0]);
  });

  it('should open delete dialog and execute deletion', async () => {
    component.openDeleteDialog(mockGastos[1]);
    expect(component.isDeleteDialogOpen()).toBe(true);
    expect(component.gastoToDelete()).toEqual(mockGastos[1]);

    await component.executeDelete();
    expect(mockGastosService.deleteGasto).toHaveBeenCalledWith('g2');
    expect(component.isDeleteDialogOpen()).toBe(false);
  });

  it('should format dates and currencies properly', () => {
    expect(component.formatDate('2023-05-10T12:00:00')).toBe('10/05/2023');
    expect(component.formatDate('')).toBe('-');
    expect(component.formatCurrency(40)).toContain('40,00');
    expect(component.formatCurrency(undefined)).toContain('0,00');
  });
});
