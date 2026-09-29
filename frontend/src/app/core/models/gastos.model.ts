import { InventarioItem } from './inventario.model';

export interface GastoExtra {
  id: string;
  collectionId?: string;
  collectionName?: string;
  ref_pieza?: number;
  pieza?: string; // ID de relación a la colección inventario
  expand?: {
    pieza?: InventarioItem;
  };
  fecha_gasto?: string;
  fecha_pago?: string;
  descripcion?: string;
  importe?: number;
  comentarios?: string;
  created?: string;
  updated?: string;
}

export type GastoPaymentStatus = 'todos' | 'pendientes' | 'pagados';

export interface GastosFilter {
  search?: string;
  status?: GastoPaymentStatus;
  piezaId?: string;
  refPieza?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
  sort?: string;
}

export interface GastosStats {
  totalGastos: number;
  totalPagado: number;
  totalPendiente: number;
  countPendientes: number;
  countPagados: number;
  countTotal: number;
}

export interface CreateGastoDto {
  pieza: string;
  ref_pieza: number;
  fecha_gasto: string;
  fecha_pago?: string;
  descripcion: string;
  importe: number;
  comentarios?: string;
}

export type UpdateGastoDto = Partial<CreateGastoDto>;
