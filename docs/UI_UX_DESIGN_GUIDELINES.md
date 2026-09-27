# 🎨 Directrices de Diseño UI/UX y Sistema Visual - Rey del Arrecife

Documento rector de diseño para la interfaz de usuario (UI), experiencia de usuario (UX) y arquitectura de componentes del frontend en **Rey del Arrecife**.

---

## 1. Identidad Visual y Filosofía de Diseño

### 1.1 Concepto de Marca: *Arrecife Marino & Joyería de Élite*
El diseño combina la riqueza orgánica y bioluminiscente del mundo submarino con la precisión, elegancia y exclusividad de la joyería y antigüedades.

- **Tema Principal**: *Deep Marine* (Modo Oscuro por defecto) con fondos abisales (`#060b17`), toques cian luminosos (`#06b6d4`, `#22d3ee`) y esmeralda sutil (`#10b981`).
- **Tema Claro (*Clean Marine*)**: Superficies limpias y nítidas en blanco hueso y gris perla (`oklch(0.985 0 0)`), con acentos en azul ultramar profundo y contrastes contrastados para máxima legibilidad diurna.
- **Detalles de Joyería y Rol**: Acentos en tonos ámbar y oro cálido (`#f59e0b`, `#fde68a`) para destacar roles de Administrador, márgenes de liquidación y piezas destacadas.

### 1.2 Tokens de Diseño y Paleta Semántica (OKLCH / CSS Vars)

| Token Semántico | Dark Mode (Por Defecto) | Light Mode | Uso Principal |
|---|---|---|---|
| `--background` | `oklch(0.141 0.005 285.823)` (~#060b17) | `oklch(0.99 0.002 285)` | Fondo de aplicación |
| `--card` | `oklch(0.18 0.01 285.8)` | `oklch(1 0 0)` | Superficies elevadas, tablas, modales |
| `--primary` | `oklch(0.72 0.15 210)` (Cian Arrecife) | `oklch(0.48 0.14 215)` | Botones primarios, enlaces activos |
| `--accent-gold` | `oklch(0.78 0.16 80)` (Oro Joyero) | `oklch(0.68 0.18 75)` | Badge Admin, métricas destacadas |
| `--muted-foreground` | `oklch(0.70 0.015 286)` | `oklch(0.50 0.02 286)` | Subtítulos, metadatos, etiquetas secundarias |
| `--border` | `oklch(1 0 0 / 12%)` | `oklch(0 0 0 / 10%)` | Separadores y bordes sutiles |

---

## 2. Arquitectura del App Shell (Navegación y Layout)

### 2.1 Estructura en Escritorio (Desktop >= 1024px)
```
+------------------------------------------------------------------------------------+
|  [REY DEL ARRECIFE 🪸]                                  [Buscar...]  [☀️/🌙] [Perfil]|
+------------+-----------------------------------------------------------------------+
|  📊 Catálogo|                                                                       |
|  💸 Gastos  |                 ÁREA DE CONTENIDO PRINCIPAL                           |
|  👥 Usuarios|                 (Router Outlet con scroll suave)                      |
|  ----------|                                                                       |
|  [Colapsar]|                                                                       |
|  👑 Admin  |                                                                       |
+------------+-----------------------------------------------------------------------+
```

- **Sidebar Izquierdo**:
  - Anchura: `260px` expandido, `72px` colapsado (modo solo iconos con tooltips).
  - Encabezado: Logotipo con silueta de coral bioluminiscente y nombre de la app.
  - Navegación principal:
    - 📦 **Inventario**: `/inventario`
    - 🧾 **Gastos Extra**: `/gastos`
    - 👥 **Usuarios**: `/admin/usuarios` (*visible condicionalmente solo para administradores*).
  - Pie del sidebar:
    - Avatar y nombre del usuario activo.
    - Badge de rol: 👑 `Admin` (dorado/ámbar) o 🐠 `Socio` (cian).
    - Conmutador de tema Claro / Oscuro.
    - Botón de cierre de sesión (`Logout`) con confirmación sutil.

### 2.2 Estructura en Dispositivos Móviles (< 1024px)
- **Top Bar Fija**: Logo reducido, conmutador de tema y avatar.
- **Bottom Navigation Bar Fija**: Acceso táctil inmediato con 3-4 accesos clave (Inventario, Gastos, Admin si aplica, Perfil).

---

## 3. Guía de Pantallas y Experiencia de Usuario (UX)

### 3.1 Catálogo de Inventario (`/inventario`)
- **Modo de visualización**: **Tabla enriquecida interactiva como vista única**.
- **Barra de control superior**:
  - Buscador predictivo en tiempo real: Filtra instantáneamente por número de `ref`, palabras en `descripcion` u `origen`.
  - Filtros rápidos tipo *chips/pills*: Estados frecuentes (`Disponible`, `AEM`, `VyP`, `Berlin`, `Vendida`).
  - Botón de acción: `+ Nueva Pieza` (*solo visible para Admin*).
- **Columnas de la tabla**:
  1. `Foto`: Miniatura compacta (40x40px) con previsualización flotante (*hover preview*) ampliada a 160px.
  2. `Ref`: Número de referencia en negrita con badge numérico.
  3. `Descripción`: Texto con limitación de líneas (`line-clamp-2`) para mantener densidad.
  4. `Origen`: Ubicación de adquisición con icono sutil de ubicación.
  5. `Costo` (*Solo Admin*): Importe de adquisición (€).
  6. `PVP`: Precio de venta destacado en tipografía de alto contraste.
  7. `A Pagar`: Importe a liquidar.
  8. `Estado`: Badge con código de color dinámico según estado.
  9. `Acciones`: Botón para ver ficha completa e icono de menú contextual.
- **Paginación y densidad**: Opciones de 25, 50 o 100 registros por página, o virtual scroll fluido.

### 3.2 Ficha de Detalle de Pieza (`/inventario/:id`)
- **Estructura**: **Página dedicada completa** con división en dos paneles principales:
  - **Panel Izquierdo (Media & Galería)**:
    - Visor de imagen principal de alta resolución.
    - Tira de miniaturas de fotos adjuntas (PocketBase `fotos`).
    - Zona de subida de archivos (Drag & Drop o botón de cámara/fichero) para administradores.
    - *Nota*: Sin enlaces externos a Google Photos (eliminados según decisión de producto).
  - **Panel Derecho (Ficha Comercial & Desglose Financiero)**:
    - Encabezado con `Ref. #` y selector de `Estado` interactivo.
    - Formulario de edición con control de permisos RBAC:
      - **Admin**: Acceso a editar todos los campos (`costo`, `fecha_compra`, `origen`, `descripcion`, `pvp`, `a_pagar`, etc.) y botón de eliminación.
      - **Partner (Socio)**: Campos de costo y origen de compra en solo lectura o enmascarados; edición habilitada exclusivamente en `pvp`, `a_pagar`, `estado`, `comentarios`, `fecha_venta`, `fecha_pagado`.
    - **Bloque de Gastos Extra Vinculados**:
      - Subtabla con todos los arreglos, enfilados o intervenciones imputadas a la pieza.
      - Botón `+ Añadir Gasto a esta pieza`.
      - Resumen económico consolidado: `Costo + Gastos = Total Invertido` vs `PVP` y margen de beneficio.

### 3.3 Módulo de Gastos Extra (`/gastos`)
- **Enfoque**: **Tabla operativa directa con filtros rápidos** (visión contable ágil).
- **Filtros superiores**:
  - Filtro por estado de pago: `Todos`, `Pendientes`, `Pagados/Liquidados`.
  - Selector de rango de fechas de gasto o pago.
  - Búsqueda por concepto o por referencia de pieza (`ref_pieza`).
- **Tabla interactiva**:
  - Columnas: `Fecha Gasto`, `Ref. Pieza` (con enlace directo a la ficha), `Concepto / Descripción`, `Importe (€)`, `Fecha Pago / Estado`, `Comentarios`, `Acciones`.
- **Modal de Alta Rápida de Gasto**:
  - Diálogo ágil accesible desde un botón `+ Nuevo Gasto`.
  - Selector con autocompletado para buscar la pieza por número de referencia o descripción.
  - Campos: Importe, Fecha de gasto, Concepto, Comentarios y toggle opcional "Marcar como pagado hoy".

### 3.4 Administración de Usuarios (`/admin/usuarios`)
- **Acceso**: Restringido a usuarios con rol `admin` (protegido en frontend por `roleGuard` y en backend por reglas API).
- **Diseño**:
  - Cabecera con título, descripción y botón `+ Invitar Colaborador`.
  - **Tabla de Usuarios**:
    - `Usuario`: Avatar (foto de Google o iniciales) + Nombre + Email.
    - `Rol`: Badge distinguido (`Admin` en ámbar con icono de corona, `Socio` en cian).
    - `Estado de Acceso`: Switch interactivo inmediato (`Activo` / `Inactivo`). Al desactivar, el usuario pierde el acceso inmediatamente vía hook de lista blanca.
    - `Fecha de Registro`.
  - **Modal de Invitación**:
    - Campo de correo de Google (`@gmail.com` o dominio autorizado).
    - Selector de rol inicial (`Socio Colaborador` o `Administrador`).
    - Explicación clara: *"El usuario podrá acceder con su cuenta de Google una vez registrado el email"*.

---

## 4. Sistema de Componentes y Reglas Técnicas (Spartan UI + Angular)

### 4.1 Reglas Estrictas del Repositorio (AGENTS.md)
1. **Separación de ficheros obligatoria**:
   - `*.component.ts`: Lógica, Signals e imports standalone.
   - `*.component.html`: Template limpio sin estilos en línea.
   - `*.component.scss`: Estilos SCSS dedicados (prohibido `.css`).
2. **Propiedades de Componente**:
   - Siempre usar `templateUrl: './<nombre>.component.html'`.
   - Siempre usar `styleUrl: './<nombre>.component.scss'`.
   - Prohibido el uso de `template: \`...\`` o `styles: [\`...\`]`.

### 4.2 Catálogo de Primitives Spartan UI a utilizar
- **Botones**: `hlmBtn` con variantes (`default`, `destructive`, `outline`, `secondary`, `ghost`) y tamaños (`sm`, `default`, `lg`, `icon`).
- **Tablas**: `hlmTable`, `hlmTableHeader`, `hlmTableRow`, `hlmTableHead`, `hlmTableCell`.
- **Modales y Diálogos**: `hlmDialog` para formularios de creación/edición rápida.
- **Diálogos de Confirmación**: `hlmAlertDialog` para borrado de piezas o revocación de acceso.
- **Formularios y Controles**: `hlmInput`, `hlmLabel`, `hlmSwitch`, `hlmSelect`.
- **Badges**: `hlmBadge` con variantes semánticas para estados de piezas y roles.
- **Notificaciones**: Toasts flotantes en la esquina inferior derecha mediante `spartan/ui` Sonner.
- **Iconografía**: Iconos consistentes de `@ng-icons/lucide` (`provideIcons(...)`).

---

## 5. Plan de Ejecución por Fases (Roadmap de Implementación)

1. **Fase 3.2 - App Shell & Design System Core**:
   - Generar componentes base de Spartan UI (`table`, `button`, `badge`, `dialog`, `alert-dialog`, `input`, `switch`, `sonner`).
   - Crear el layout `AppShellComponent` (Sidebar colapsable, Topbar, tema claro/oscuro y perfil).
   - Actualizar `styles.scss` con los tokens refinados.
2. **Fase 4.1 - Módulo Catálogo de Inventario**:
   - Implementar `InventarioListComponent` con la tabla enriquecida, buscador reactivo por Signals, badges de estado y previsualización de miniaturas.
3. **Fase 4.2 - Ficha de Detalle de Pieza**:
   - Implementar `InventarioDetailComponent` como página completa con galería de fotos PocketBase, formulario con validaciones RBAC y desglose de gastos asociados.
4. **Fase 5.1 & 5.2 - Módulo de Gastos Extra**:
   - Implementar `GastosListComponent` con tabla operativa, filtros rápidos y modal ágil de alta de gasto con autocompletado de pieza.
5. **Fase 6 - Portal de Usuarios**:
   - Implementar `UsuariosComponent` con tabla de gestión de accesos, switches de activación y modal de invitación Google.
