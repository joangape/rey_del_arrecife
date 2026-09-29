import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GastoExtra } from '../../../core/models/gastos.model';
import { GastosService } from '../../../core/services/gastos.service';
import { GastoFormDialogComponent } from './gasto-form-dialog.component';

describe('GastoFormDialogComponent', () => {
  let component: GastoFormDialogComponent;
  let componentRef: ComponentRef<GastoFormDialogComponent>;
  let fixture: ComponentFixture<GastoFormDialogComponent>;
  let mockGastosService: any;

  beforeEach(async () => {
    mockGastosService = {
      searchPiezas: vi.fn().mockResolvedValue([
        { id: 'p1', ref: 42, descripcion: 'Collar de perlas', estado: 'Disponible' },
      ]),
      createGasto: vi.fn().mockResolvedValue({
        id: 'new_gasto',
        ref_pieza: 42,
        pieza: 'p1',
        descripcion: 'Enfilado',
        importe: 50,
      }),
      updateGasto: vi.fn().mockResolvedValue({
        id: 'edit_gasto',
        ref_pieza: 42,
        pieza: 'p1',
        descripcion: 'Enfilado nuevo',
        importe: 60,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [GastoFormDialogComponent],
      providers: [{ provide: GastosService, useValue: mockGastosService }],
    }).compileComponents();

    fixture = TestBed.createComponent(GastoFormDialogComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with preselected piece when provided and open', () => {
    componentRef.setInput('preselectedPieza', {
      id: 'p10',
      ref: 10,
      descripcion: 'Anillo vintage',
    });
    componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(component.selectedPieza()).toEqual({
      id: 'p10',
      ref: 10,
      descripcion: 'Anillo vintage',
    });
  });

  it('should initialize with existing gasto data when editing', () => {
    const mockGasto: GastoExtra = {
      id: 'g100',
      ref_pieza: 99,
      pieza: 'p99',
      descripcion: 'Pulido plata',
      importe: 35,
      fecha_gasto: '2023-04-10',
      fecha_pago: '2023-04-15',
      comentarios: 'Taller local',
      expand: {
        pieza: { id: 'p99', ref: 99, descripcion: 'Broche antiguo' } as any,
      },
    };

    componentRef.setInput('gastoToEdit', mockGasto);
    componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(component.isEditMode()).toBe(true);
    expect(component.selectedPieza()?.ref).toBe(99);
    expect(component.descripcion()).toBe('Pulido plata');
    expect(component.importe()).toBe(35);
    expect(component.fechaGasto()).toBe('2023-04-10');
    expect(component.fechaPago()).toBe('2023-04-15');
  });

  it('should search piezas on input', async () => {
    await component.onSearchPiezasInput('collar');
    expect(mockGastosService.searchPiezas).toHaveBeenCalledWith('collar', 6);
    expect(component.pieceSuggestions().length).toBe(1);
    expect(component.showSuggestions()).toBe(true);
  });

  it('should select piece from suggestions', () => {
    component.selectPieza({ id: 'p1', ref: 42, descripcion: 'Collar' } as any);
    expect(component.selectedPieza()).toEqual({
      id: 'p1',
      ref: 42,
      descripcion: 'Collar',
    });
    expect(component.showSuggestions()).toBe(false);
  });

  it('should apply quick concept', () => {
    component.applyConcept('Enfilado');
    expect(component.descripcion()).toBe('Enfilado');
  });

  it('should set fecha pago to today and clear it', () => {
    component.setFechaPagoHoy();
    const today = new Date().toISOString().substring(0, 10);
    expect(component.fechaPago()).toBe(today);

    component.clearFechaPago();
    expect(component.fechaPago()).toBe('');
  });

  it('should show error when required fields are missing on submit', async () => {
    componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    await component.onSubmit();
    expect(component.errorMessage()).toContain('seleccionar la pieza');

    component.selectedPieza.set({ id: 'p1', ref: 1, descripcion: 'Test' });
    await component.onSubmit();
    expect(component.errorMessage()).toContain('concepto o descripción');

    component.descripcion.set('Enfilado');
    await component.onSubmit();
    expect(component.errorMessage()).toContain('importe válido');
  });

  it('should call createGasto and emit saved when creating', async () => {
    componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.selectedPieza.set({ id: 'p1', ref: 42, descripcion: 'Collar' });
    component.descripcion.set('Enfilado');
    component.importe.set(50);
    component.fechaGasto.set('2023-05-01');

    await component.onSubmit();

    expect(mockGastosService.createGasto).toHaveBeenCalledWith({
      pieza: 'p1',
      ref_pieza: 42,
      descripcion: 'Enfilado',
      importe: 50,
      fecha_gasto: '2023-05-01',
      fecha_pago: undefined,
      comentarios: undefined,
    });
    expect(savedSpy).toHaveBeenCalled();
    expect(component.isOpen()).toBe(false);
  });

  it('should call updateGasto and emit saved when editing', async () => {
    const mockGasto: GastoExtra = {
      id: 'edit_gasto',
      ref_pieza: 42,
      pieza: 'p1',
      descripcion: 'Enfilado antiguo',
      importe: 50,
      fecha_gasto: '2023-05-01',
    };

    componentRef.setInput('gastoToEdit', mockGasto);
    componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.descripcion.set('Enfilado nuevo');
    component.importe.set(60);

    await component.onSubmit();

    expect(mockGastosService.updateGasto).toHaveBeenCalledWith(
      'edit_gasto',
      expect.objectContaining({
        descripcion: 'Enfilado nuevo',
        importe: 60,
      })
    );
    expect(savedSpy).toHaveBeenCalled();
  });
});
