export interface GastoExtra {
  id: string;
  collectionId?: string;
  collectionName?: string;
  ref_pieza?: number;
  pieza?: string; // ID de relación a la colección inventario
  fecha_gasto?: string;
  fecha_pago?: string;
  descripcion?: string;
  importe?: number;
  comentarios?: string;
  created?: string;
  updated?: string;
}

export interface GastosFilter {
  piezaId?: string;
  refPieza?: number;
  page?: number;
  perPage?: number;
}
