# 🛡️ Matriz de Permisos (RBAC) - Rey del Arrecife

Este documento establece las políticas de control de acceso basadas en roles (RBAC) implementadas a través de las **PocketBase API Rules** y reflejadas en la interfaz de usuario de Angular.

## 1. Definición de Roles

1. **`admin`**: Administrador principal. Acceso total a todas las operaciones del sistema, altas de usuarios, configuración y edición irrestricta de todos los campos.
2. **`partner`**: Socio / Colaborador comercial. Acceso operativo para consulta de inventario, edición de precios/fechas comerciales y gestión de gastos extra.

---

## 2. Matriz de Operaciones por Colección

| Colección | Operación | Rol `admin` | Rol `partner` | Regla / Detalle |
|---|---|:---:|:---:|---|
| **`users`** | List / View | ✅ | ❌ | Solo Admin puede ver la lista de usuarios y colaboradores. |
| | Create / Invite | ✅ | ❌ | Solo Admin puede crear o autorizar nuevos correos para login. |
| | Update | ✅ | ⚠️ Solo su perfil | Admin edita cualquier usuario; Partner solo su propio nombre/avatar. |
| | Delete | ✅ | ❌ | Solo Admin puede revocar accesos. |
| **`inventario`** | List / View | ✅ | ✅ | Ambos ven todas las piezas del catálogo. |
| | Create | ✅ | ❌ | Solo Admin da de alta nuevas piezas con su coste inicial de compra. |
| | Update | ✅ | ⚠️ Campos selectos | Partner solo puede editar los campos comerciales autorizados (ver tabla 3). |
| | Delete | ✅ | ❌ | Solo Admin puede eliminar piezas del inventario. |
| **`gastos_extra`**| List / View | ✅ | ✅ | Ambos pueden consultar los gastos asociados a las piezas. |
| | Create | ✅ | ✅ | Ambos pueden registrar nuevos gastos extra derivados de una pieza. |
| | Update | ✅ | ✅ | Ambos pueden corregir o actualizar gastos registrados. |
| | Delete | ✅ | ❌ | Solo Admin puede eliminar registros de gastos. |

---

## 3. Permisos a Nivel de Campo en `inventario` para `partner`

De acuerdo con las directrices acordadas:
> *"El partner puede ver el inventario completo, crear y editar gastos extra. Del inventario puede editar el PVP, el precio a pagar, el estado, los comentarios, la fecha de venta y la fecha de pago."*

| Campo de `inventario` | Visibilidad `partner` | Edición `partner` | Edición `admin` |
|---|:---:|:---:|:---:|
| `ref` | ✅ Lectura | ❌ Bloqueado | ✅ Total |
| `descripcion` | ✅ Lectura | ❌ Bloqueado | ✅ Total |
| `origen` | ✅ Lectura | ❌ Bloqueado | ✅ Total |
| `fecha_compra` | ✅ Lectura | ❌ Bloqueado | ✅ Total |
| `costo` (compra inicial)| ✅ Lectura | ❌ Bloqueado | ✅ Total |
| `gastos_total` | ✅ Lectura | ❌ Calculado | ✅ Total |
| `a_pagar` | ✅ Lectura | ✅ **Permitido** | ✅ Total |
| `pvp` | ✅ Lectura | ✅ **Permitido** | ✅ Total |
| `fecha_venta` | ✅ Lectura | ✅ **Permitido** | ✅ Total |
| `fecha_pagado` | ✅ Lectura | ✅ **Permitido** | ✅ Total |
| `estado` | ✅ Lectura | ✅ **Permitido** | ✅ Total |
| `foto_url` / `fotos` | ✅ Lectura | ❌ Bloqueado | ✅ Total |
| `comentarios` | ✅ Lectura | ✅ **Permitido** | ✅ Total |

---

## 4. Implementación en PocketBase

En PocketBase, la colección `inventario` valida en `Update Rule`:
```javascript
// Admin puede actualizar todo:
@request.auth.role = 'admin' ||
// Partner solo puede actualizar si no altera los campos protegidos:
(
  @request.auth.role = 'partner' &&
  @request.data.ref:isset = false &&
  @request.data.costo:isset = false &&
  @request.data.origen:isset = false &&
  @request.data.fecha_compra:isset = false &&
  @request.data.descripcion:isset = false
)
```
Adicionalmente, un Hook en JavaScript (`pb_hooks/inventory_guard.pb.js`) protege la integridad de los campos inmutables antes de ejecutar cualquier persistencia.
