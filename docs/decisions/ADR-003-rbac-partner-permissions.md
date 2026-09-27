# ADR-003: Modelo de Permisos y Capacidades del Rol Partner

## Estado
Aceptado

## Contexto
El sistema tiene dos perfiles de usuario: `admin` y `partner`. Era necesario definir con precisión los límites del rol `partner`, especialmente respecto a la visualización de costes y la edición de campos de inventario y gastos.

## Decisión
El rol `partner` tiene:
1. Acceso de lectura al catálogo completo de `inventario` (incluyendo fotos, descripción, PVP y estado).
2. Permiso para crear y modificar registros en `gastos_extra`.
3. Permiso para editar exclusivamente en `inventario`:
   - `pvp`
   - `a_pagar`
   - `estado`
   - `comentarios`
   - `fecha_venta`
   - `fecha_pagado`
4. Bloqueo estricto para:
   - Crear o eliminar piezas de inventario.
   - Modificar coste de compra inicial (`costo`), origen o fecha de compra.
   - Administrar o invitar a otros usuarios.

## Consecuencias
- **Positivas**: El colaborador puede gestionar activamente el ciclo comercial de las piezas y los gastos de taller/arreglo sin comprometer la auditoría de compras ni los accesos del sistema.
- **Negativas**: Requiere validación tanto a nivel de reglas en PocketBase como en formularios de la UI Angular.
