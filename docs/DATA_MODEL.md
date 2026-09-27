# 📊 Modelo de Datos - Rey del Arrecife

Este documento detalla las colecciones de PocketBase, sus campos, tipos de datos, restricciones y reglas de relación, reflejando fielmente la estructura de los datos iniciales de los CSVs.

---

## 1. Colección: `users` (Colección de Autenticación de PocketBase)

Gestiona los usuarios autorizados en la plataforma.

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | String | Sí | Identificador único de PocketBase (15 caracteres alfanuméricos) |
| `email` | Email | Sí | Correo electrónico del usuario (clave para Google OAuth) |
| `name` | String | No | Nombre completo del usuario |
| `avatar` | File | No | Imagen de perfil obtenida de OAuth o subida |
| `role` | Select | Sí | Opciones: `admin`, `partner`. (Por defecto: `partner`) |
| `active` | Bool | Sí | Indica si el usuario tiene permiso para acceder (Por defecto: `true`) |
| `created` | DateTime | Auto | Fecha de creación del registro / invitación |
| `updated` | DateTime | Auto | Última actualización |

---

## 2. Colección: `inventario` (Artículos / Piezas)

Almacena las piezas catalogadas con su información comercial, trazabilidad y estado.

| Campo | Tipo en PB | CSV Origen | Formato / Notas |
|---|---|---|---|
| `ref` | Number | `Ref.` | Número identificativo de la pieza (único). Ej: `1`, `42` |
| `descripcion` | Text | `Descripción` | Descripción detallada de la pieza (materiales, peso, medidas, etc.) |
| `origen` | Text | `Origen` | Ubicación o procedencia de compra (ej: `Tiergarten`, `Arkonaplatz`, `Londres`) |
| `fecha_compra` | Date | `F. Compra` | Fecha de adquisición (convertida desde `DD/MM/AAAA` a `YYYY-MM-DD`) |
| `costo` | Number | `Costo` | Coste inicial de adquisición en euros (ej: `700€` -> `700.00`) |
| `gastos_total` | Number | `Gastos` | Total de gastos imputados (calculado/agregado desde `gastos_extra`) |
| `a_pagar` | Number | `A pagar` | Importe a liquidar / pagar en euros (ej: `48.00`) |
| `pvp` | Number | `PVP` | Precio de Venta al Público fijado en euros (ej: `60.00`) |
| `fecha_venta` | Text/Date | `F. Venta` | Fecha en que se vendió el artículo (o indicación de estado) |
| `fecha_pagado` | Text/Date | `F. Pagado` | Fecha en que se cobró/pagó |
| `estado` | Text | `Estado` | Ej: `AEM`, `VyP`, `VyP 30.03.2023`, `En Sobre 21/5/25`, `Berlin` |
| `foto_url` | URL | `Foto` | Enlace externo a foto (ej: álbumes compartidos de Google Photos) |
| `fotos` | File (Múltiple)| - | Archivos de imagen cargados directamente a PocketBase |
| `comentarios` | Text | `Comentarios` | Observaciones adicionales o notas privadas |

---

## 3. Colección: `gastos_extra` (Gastos imputables a piezas)

Registra cualquier gasto suplementario (enfilado, arreglo, transporte, etc.) asociado a una pieza específica.

| Campo | Tipo en PB | CSV Origen | Formato / Notas |
|---|---|---|---|
| `pieza` | Relation | `Ref. pieza` | Relación con la colección `inventario` (apuntando al registro por `ref`) |
| `ref_pieza` | Number | `Ref. pieza` | Número de referencia redundante para consultas rápidas |
| `fecha_gasto` | Date | `Fecha gasto` | Fecha en la que se incurrió en el gasto (`YYYY-MM-DD`) |
| `fecha_pago` | Date | `Fecha pago` | Fecha en la que se liquidó el gasto (`YYYY-MM-DD`) |
| `descripcion` | Text | `Descripción` | Concepto del gasto (ej: `Enfilado`, `Arreglo`, `Conversión a pendientes`) |
| `importe` | Number | `Importe` | Cuantía económica en euros (ej: `40.00€` -> `40.00`) |
| `comentarios` | Text | `Comentarios` | Notas sobre el taller, joyero o detalles de la intervención |

---

## 4. Normalización en la Migración Inicial

Durante la importación de los ficheros CSV históricos:
1. **Monedas**: Los valores como `700€`, `40.00€`, `0€` se limpian de sufijos y se convierten a números decimales en punto flotante (`700.00`, `40.00`).
2. **Fechas**: Se normaliza el formato europeo `DD/MM/AAAA` al estándar ISO `YYYY-MM-DD`. En campos como `F. Venta` donde a veces aparece texto (`Pagado`), se almacena la cadena o se deriva la fecha correspondiente.
3. **Enlaces de Fotos**: Se preservan los enlaces originales a Google Photos (`https://photos.app.goo.gl/...` o `https://photos.google.com/...`) en el campo `foto_url`. Se ofrece además el campo nativo `fotos` para adjuntar nuevas imágenes tomadas con cámara o dispositivo móvil.
