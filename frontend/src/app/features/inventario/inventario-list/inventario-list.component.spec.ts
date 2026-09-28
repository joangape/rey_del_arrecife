import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { InventarioListComponent } from './inventario-list.component';
import { InventarioItem } from '../../../core/models/inventario.model';

describe('InventarioListComponent', () => {
  let component: InventarioListComponent;
  let fixture: ComponentFixture<InventarioListComponent>;
  let mockInventarioService: any;
  let mockAuthService: any;

  const sampleItems: InventarioItem[] = [
    {
      id: 'rec_1',
      ref: 1,
      descripcion: 'Velo de novia',
      origen: 'Londres',
      pvp: 600,
      costo: 75,
      estado: 'AEM',
      fecha_compra: '2011-08-15',
    },
    {
      id: 'rec_2',
      ref: 2,
      descripcion: 'Broche vintage',
      origen: 'Tiergarten',
      pvp: 120,
      costo: 30,
      estado: 'En sobre',
      fecha_compra: '2015-05-10',
    },
  ];

  beforeEach(async () => {
    mockInventarioService = {
      items: signal<InventarioItem[]>(sampleItems),
      totalItems: signal<number>(2),
      totalPages: signal<number>(1),
      page: signal<number>(1),
      perPage: signal<number>(25),
      searchQuery: signal<string>(''),
      selectedEstado: signal<string>('all'),
      selectedOrigen: signal<string>('all'),
      sortField: signal<string>('ref'),
      sortDirection: signal<'asc' | 'desc'>('asc'),
      viewMode: signal<'table' | 'grid'>('table'),
      isLoading: signal<boolean>(false),
      error: signal<string | null>(null),
      availableOrigenes: signal<string[]>(['Londres', 'Tiergarten']),
      quickEstados: [
        { label: 'Todos', value: 'all' },
        { label: 'En sobre', value: 'En sobre' },
        { label: 'AEM', value: 'AEM' },
      ],
      hasActiveFilters: signal<boolean>(false),
      totalPvpCurrentPage: signal<number>(720),
      setSearch: vi.fn(),
      setEstado: vi.fn(),
      setOrigen: vi.fn(),
      setSort: vi.fn(),
      setPage: vi.fn(),
      setPerPage: vi.fn(),
      setViewMode: vi.fn(),
      resetFilters: vi.fn(),
      loadItems: vi.fn(),
      getItemThumbnail: vi.fn().mockReturnValue(null),
      hasExternalPhoto: vi.fn().mockReturnValue(false),
    };

    mockAuthService = {
      isAdmin: signal<boolean>(true),
      isPartner: signal<boolean>(false),
      currentUser: signal<any>({ name: 'Admin Test', role: 'admin' }),
    };

    await TestBed.configureTestingModule({
      imports: [InventarioListComponent],
      providers: [
        provideRouter([]),
        { provide: InventarioService, useValue: mockInventarioService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventarioListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render table view by default with items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('table')).toBeTruthy();
    expect(compiled.textContent).toContain('Velo de novia');
    expect(compiled.textContent).toContain('Broche vintage');
    expect(compiled.textContent).toContain('#1');
    expect(compiled.textContent).toContain('#2');
  });

  it('should call setSearch on search input change', () => {
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'anillo';
    input.dispatchEvent(new Event('input'));

    expect(mockInventarioService.setSearch).toHaveBeenCalledWith('anillo');
  });

  it('should call clearSearch on clear button click', () => {
    mockInventarioService.searchQuery.set('filtro previo');
    fixture.detectChanges();

    component.clearSearch();
    expect(mockInventarioService.setSearch).toHaveBeenCalledWith('');
  });

  it('should call setEstado when clicking quick estado button', () => {
    component.onEstadoClick('En sobre');
    expect(mockInventarioService.setEstado).toHaveBeenCalledWith('En sobre');
  });

  it('should call setOrigen when changing origen dropdown', () => {
    const mockEvent = {
      target: { value: 'Londres' },
    } as unknown as Event;

    component.onOrigenChange(mockEvent);
    expect(mockInventarioService.setOrigen).toHaveBeenCalledWith('Londres');
  });

  it('should toggle sort on header click', () => {
    component.toggleSort('pvp');
    expect(mockInventarioService.setSort).toHaveBeenCalledWith('pvp');
  });

  it('should toggle view mode to grid and render cards', () => {
    mockInventarioService.viewMode.set('grid');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('table')).toBeNull();
    expect(compiled.textContent).toContain('Velo de novia');
  });

  it('should call resetFilters on resetAll()', () => {
    component.resetAll();
    expect(mockInventarioService.resetFilters).toHaveBeenCalled();
  });

  it('should return appropriate CSS classes for various estados', () => {
    expect(component.getEstadoClass('Disponible')).toContain('emerald');
    expect(component.getEstadoClass('En sobre')).toContain('emerald');
    expect(component.getEstadoClass('AEM')).toContain('amber');
    expect(component.getEstadoClass('VyP 12.05')).toContain('purple');
    expect(component.getEstadoClass('Vendido')).toContain('zinc');
    expect(component.getEstadoClass('Otro')).toContain('cyan');
    expect(component.getEstadoClass(undefined)).toContain('muted');
  });
});
