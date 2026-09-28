import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GastoExtra } from '../../../core/models/gastos.model';
import { InventarioItem } from '../../../core/models/inventario.model';
import { AuthService } from '../../../core/services/auth.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { InventarioDetailComponent } from './inventario-detail.component';

describe('InventarioDetailComponent', () => {
  let component: InventarioDetailComponent;
  let fixture: ComponentFixture<InventarioDetailComponent>;
  let mockInventarioService: any;
  let mockAuthService: any;
  let mockRouter: any;

  const mockItem: InventarioItem = {
    id: 'rec_1',
    ref: 42,
    descripcion: 'Anillo de oro con esmeralda',
    origen: 'Londres',
    costo: 300,
    gastos_total: 50,
    pvp: 650,
    a_pagar: 150,
    estado: 'Disponible',
    fecha_compra: '2020-03-15',
    fecha_venta: '2021-06-20',
    fecha_pagado: '2021-06-25',
    foto_url: 'https://photos.app.goo.gl/sample-link',
    fotos: ['foto1.jpg', 'foto2.jpg'],
    comentarios: 'Pieza en perfecto estado',
  };

  const mockGastos: GastoExtra[] = [
    {
      id: 'gasto_1',
      ref_pieza: 42,
      descripcion: 'Ajuste de talla y pulido',
      importe: 50,
      fecha_gasto: '2020-04-10',
      fecha_pago: '2020-04-12',
      comentarios: 'Taller Joyería Central',
    },
  ];

  beforeEach(async () => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockAuthService = {
      isAdmin: signal<boolean>(true),
      isPartner: signal<boolean>(false),
    };

    mockInventarioService = {
      getItemById: vi.fn().mockResolvedValue({ ...mockItem }),
      getItemGastos: vi.fn().mockResolvedValue([...mockGastos]),
      updateItem: vi.fn().mockImplementation((id: string, data: any) =>
        Promise.resolve({ ...mockItem, ...data })
      ),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      uploadItemPhotos: vi.fn().mockResolvedValue({
        ...mockItem,
        fotos: [...(mockItem.fotos || []), 'new_foto.jpg'],
      }),
      deleteItemPhoto: vi.fn().mockResolvedValue({
        ...mockItem,
        fotos: ['foto2.jpg'],
      }),
      getItemThumbnail: vi.fn().mockReturnValue('http://localhost:8090/thumb.jpg'),
      pbService: {
        getFileUrl: vi.fn().mockReturnValue('http://localhost:8090/full.jpg'),
        getErrorMessage: vi.fn().mockReturnValue('Error simulado'),
      },
    };

    await TestBed.configureTestingModule({
      imports: [InventarioDetailComponent],
      providers: [
        FormBuilder,
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: InventarioService, useValue: mockInventarioService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'rec_1' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventarioDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load item data and related gastos on init', () => {
    expect(mockInventarioService.getItemById).toHaveBeenCalledWith('rec_1');
    expect(mockInventarioService.getItemGastos).toHaveBeenCalledWith(42, 'rec_1');
    expect(component.item()?.ref).toBe(42);
    expect(component.gastos().length).toBe(1);
    expect(component.isLoading()).toBe(false);
  });

  it('should populate form controls with loaded item values', () => {
    expect(component.itemForm.get('ref')?.value).toBe(42);
    expect(component.itemForm.get('descripcion')?.value).toBe('Anillo de oro con esmeralda');
    expect(component.itemForm.get('pvp')?.value).toBe(650);
    expect(component.itemForm.get('a_pagar')?.value).toBe(150);
    expect(component.itemForm.get('estado')?.value).toBe('Disponible');
  });

  it('should calculate financial metrics correctly', () => {
    // costo = 300, totalGastos = 50 -> costeTotal = 350
    expect(component.costoAdquisicion()).toBe(300);
    expect(component.totalGastosExtra()).toBe(50);
    expect(component.costeTotalAcumulado()).toBe(350);

    // pvp = 650 -> margenBruto = 650 - 350 = 300
    expect(component.margenBruto()).toBe(300);

    // margenPorcentaje = (300 / 650) * 100 = ~46.15%
    expect(component.margenPorcentaje()).toBeCloseTo(46.15, 1);

    // beneficioNeto = margenBruto (300) - aPagar (150) = 150
    expect(component.beneficioNetoEstimado()).toBe(150);
  });

  it('should enable admin fields when user is admin', () => {
    expect(component.isAdmin()).toBe(true);
    expect(component.itemForm.get('ref')?.enabled).toBe(true);
    expect(component.itemForm.get('costo')?.enabled).toBe(true);
    expect(component.itemForm.get('origen')?.enabled).toBe(true);
    expect(component.itemForm.get('descripcion')?.enabled).toBe(true);
  });

  it('should disable admin fields when user is partner', async () => {
    mockAuthService.isAdmin.set(false);
    mockAuthService.isPartner.set(true);

    await component.loadItemData('rec_1');

    expect(component.itemForm.get('ref')?.disabled).toBe(true);
    expect(component.itemForm.get('costo')?.disabled).toBe(true);
    expect(component.itemForm.get('origen')?.disabled).toBe(true);
    expect(component.itemForm.get('descripcion')?.disabled).toBe(true);
    expect(component.itemForm.get('foto_url')?.disabled).toBe(true);

    // Commercial fields must remain enabled
    expect(component.itemForm.get('pvp')?.disabled).toBe(false);
    expect(component.itemForm.get('a_pagar')?.disabled).toBe(false);
    expect(component.itemForm.get('estado')?.disabled).toBe(false);
    expect(component.itemForm.get('fecha_venta')?.disabled).toBe(false);
    expect(component.itemForm.get('comentarios')?.disabled).toBe(false);
  });

  it('should submit full payload when admin saves changes', async () => {
    component.itemForm.patchValue({
      pvp: 700,
      descripcion: 'Descripción modificada por admin',
    });

    await component.onSubmit();

    expect(mockInventarioService.updateItem).toHaveBeenCalledWith(
      'rec_1',
      expect.objectContaining({
        ref: 42,
        pvp: 700,
        descripcion: 'Descripción modificada por admin',
      })
    );
  });

  it('should submit only commercial fields when partner saves changes', async () => {
    mockAuthService.isAdmin.set(false);
    mockAuthService.isPartner.set(true);
    await component.loadItemData('rec_1');

    mockInventarioService.updateItem.mockClear();
    component.itemForm.patchValue({
      pvp: 720,
      comentarios: 'Oferta especial cliente',
    });

    await component.onSubmit();

    expect(mockInventarioService.updateItem).toHaveBeenCalledWith(
      'rec_1',
      expect.objectContaining({
        pvp: 720,
        comentarios: 'Oferta especial cliente',
      })
    );

    // Verify protected fields are not sent in partner payload
    const payload = mockInventarioService.updateItem.mock.calls[0][1];
    expect(payload.ref).toBeUndefined();
    expect(payload.costo).toBeUndefined();
    expect(payload.origen).toBeUndefined();
    expect(payload.descripcion).toBeUndefined();
  });

  it('should discard form changes and restore original values', () => {
    component.itemForm.patchValue({ pvp: 999 });
    expect(component.itemForm.get('pvp')?.value).toBe(999);

    component.discardChanges();
    expect(component.itemForm.get('pvp')?.value).toBe(650);
  });

  it('should delete piece and redirect to catalog when admin confirms', async () => {
    await component.confirmDeletePiece();

    expect(mockInventarioService.deleteItem).toHaveBeenCalledWith('rec_1');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventario']);
  });

  it('should select photos and toggle lightbox state', () => {
    const photos = component.allPhotos();
    expect(photos.length).toBeGreaterThan(0);

    component.selectPhoto(photos[0]);
    expect(component.selectedPhoto()).toBe(photos[0]);

    component.openLightbox();
    expect(component.isLightboxOpen()).toBe(true);

    component.closeLightbox();
    expect(component.isLightboxOpen()).toBe(false);
  });
});
