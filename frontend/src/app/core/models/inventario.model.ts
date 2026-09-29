export type InventarioEstado =
  | 'Disponible'
  | 'Vendido'
  | 'Reservado'
  | 'En Taller'
  | string;

export interface InventarioItem {
  id: string;
  collectionId?: string;
  collectionName?: string;
  ref: number;
  descripcion?: string;
  origen?: string;
  fecha_compra?: string;
  costo?: number;
  gastos_total?: number;
  a_pagar?: number;
  pvp?: number;
  fecha_venta?: string;
  fecha_pagado?: string;
  estado?: InventarioEstado;
  /** @deprecated Campo de archivo histórico en desuso tras migración a PocketBase */
  foto_url?: string;
  fotos?: string[];
  comentarios?: string;
  created?: string;
  updated?: string;
}

export interface InventarioFilter {
  query?: string;
  estado?: string;
  origen?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}
