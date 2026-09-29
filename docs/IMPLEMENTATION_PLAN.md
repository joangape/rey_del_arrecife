# 📋 Plan de Implementación Integral - Rey del Arrecife

Este documento es el mapa de ruta (*living roadmap*) del proyecto. Registra las fases de desarrollo, hitos técnicos, tareas granulares y su estado de avance.

---

## 🗺️ Resumen de Fases

```
[Fase 1: Harness & Living Docs] ✅ COMPLETADO
               │
               ▼
[Fase 2: Backend & Auth Security] 🔄 EN CURSO / BASE LISTA
               │
               ▼
[Fase 3: Frontend Foundation & Design System (Spartan UI)] ✅ COMPLETADO
               │
               ▼
[Fase 4: Módulo de Inventario (Catálogo & Ficha Comercial)] ✅ COMPLETADO
               │
               ▼
[Fase 5: Módulo de Gastos Extra & Liquidaciones] ✅ COMPLETADO
               │
               ▼
[Fase 6: Portal de Administración de Usuarios & Invitaciones]
               │
               ▼
[Fase 7: Despliegue & Validación en Synology NAS Container Manager]
```

---

## 📌 Fase 1: Harness de Desarrollo, Living Docs y Estructura Base
> **Objetivo**: Establecer los cimientos del repositorio, la documentación viva y las herramientas de desarrollo local.

- [x] **1.1 Estructura modular**: Creación de monorepo ligero (`/frontend`, `/backend`, `/deploy`, `/docs`).
- [x] **1.2 Living Documents iniciales**:
  - [x] [ARCHITECTURE.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/ARCHITECTURE.md)
  - [x] [DATA_MODEL.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DATA_MODEL.md)
  - [x] [PERMISSIONS_MATRIX.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/PERMISSIONS_MATRIX.md)
  - [x] [DEPLOYMENT_SYNOLOGY.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DEPLOYMENT_SYNOLOGY.md)
  - [x] [DEVELOPMENT_GUIDE.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DEVELOPMENT_GUIDE.md)
  - [x] Registro de ADRs iniciales (ADR-001 a ADR-005).
- [x] **1.3 Instalación de Skills del Agente** en `.agents/skills`:
  - [x] `spartan` (oficial Spartan UI)
  - [x] `pocketbase-best-practices`
  - [x] `angular-signals` y `angular-component`
- [x] **1.4 Orquestador de comandos**: `Makefile` y scripts raíz en `package.json`.
- [x] **1.5 Scaffolding inicial**:
  - [x] Angular 22 inicializado con Spartan UI / Tailwind CSS configurado.
  - [x] PocketBase Docker compose local operativo en puerto 8090.
  - [x] Migración y seed exitoso de los 309 registros de inventario y 27 gastos extra desde los CSVs.
- [x] **1.6 Repositorio Git y primer commit**: Publicado en [GitHub joangape/rey_del_arrecife](https://github.com/joangape/rey_del_arrecife).

---

## 📌 Fase 2: Backend & Seguridad de Autenticación
> **Objetivo**: Dejar el backend de PocketBase con seguridad RBAC completa, OAuth2 de Google y ganchos de servidor (JSVM hooks).

- [x] **2.1 Esquemas y Reglas API en PocketBase**:
  - [x] Colección `inventario` con validación de unicidad en `ref` y reglas de lectura/escritura según rol.
  - [x] Colección `gastos_extra` con clave foránea a `inventario` (`pieza`).
  - [x] Colección `users` extendida con campos `role` (`admin` / `partner`) y `active` (booleano).
- [x] **2.2 Hook de Lista Blanca OAuth2 (`auth_whitelist.pb.js`)**:
  - [x] Implementación y adaptación a PocketBase v0.40 en `backend/pb_hooks/auth_whitelist.pb.js`.
  - [x] Pruebas de integración automatizadas (`make test-auth` / `backend/tests/auth_whitelist.test.js`) validando los 3 escenarios: rechazo de no invitados (403), rechazo de inactivos (403) y vinculación exitosa de activos.
  - [x] Guía técnica completa y script de configuración de credenciales de Google OAuth2 en [GOOGLE_OAUTH_SETUP.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/GOOGLE_OAUTH_SETUP.md) y `backend/scripts/setup_google_oauth.js`.
- [x] **2.3 Hook de Protección de Campos de Inventario (`inventory_guard.pb.js`)**:
  - [x] Implementación en `backend/pb_hooks/inventory_guard.pb.js` protegiendo a nivel de servidor los campos inmutables para el rol `partner` (`ref`, `costo`, `fecha_compra`, `origen`, `descripcion`, `gastos_total`, `foto_url`, `fotos`), permitiendo exclusivamente la edición de campos comerciales (`pvp`, `a_pagar`, `estado`, `comentarios`, `fecha_venta`, `fecha_pagado`).
  - [x] Bloqueo a nivel de hook de operaciones de creación (`onRecordCreateRequest`) y eliminación (`onRecordDeleteRequest`) para usuarios no administradores.
  - [x] Tolerancia ante envíos de datos completos desde el cliente siempre que los campos protegidos no hayan sido alterados respecto al registro en base de datos.
  - [x] Suite de pruebas automatizadas de integración (`make test-guard` / `backend/tests/inventory_guard.test.js`) con 14 casos de prueba cubriendo roles `admin`, `partner` y llamadas anónimas.
- [x] **2.4 Automatización de Migraciones (`pb_migrations/`)**:
  - [x] Esquema consolidado y unificado en 1 fichero maestro (`1790541647_initial_schema.js`) en `backend/pb_migrations/` y `deploy/pb_migrations/`.
  - [x] Configuración de volumen persistente y flags `--migrationsDir=/pb_migrations` en `backend/docker-compose.yml`, `backend/Dockerfile` y `deploy/docker-compose.yml`.
  - [x] Comandos de orquestación en `Makefile` (`make migrate`, `make migrate-snapshot`) y `backend/package.json` (`npm run migrate:up`, `npm run migrate:snapshot`).
  - [x] Validación exitosa de inicialización y migración completa desde cero en base de datos limpia.

---

## 📌 Fase 3: Frontend Foundation & Design System (Spartan UI)
> **Objetivo**: Configurar el núcleo del frontend Angular: cliente PocketBase reactivo, estado de sesión, Guards de rutas y componentes base de Spartan UI.

- [x] **3.1 Servicio PocketBase y Gestión de Autenticación**:
  - [x] Servicio Angular `AuthService` utilizando Signals (`currentUser`, `isAuthenticated`, `isAdmin`, `isPartner`, `isLoading`, `authError`).
  - [x] Sincronización del `authStore` de PocketBase con LocalStorage y estado reactivo (incluyendo sincronización multi-pestaña `storage` y `refreshSession`).
  - [x] Implementación de `loginWithGoogle()` y manejo de errores de acceso denegado (rechazo 403 por hook de lista blanca o cuenta desactivada).
  - [x] `authGuard`, `unauthGuard` y `roleGuard` (`hasRoleGuard`) funcionales en Angular Router con suite de pruebas unitarias al 100%.
- [x] **3.2 Layout Principal y Spartan Shell**:
  - [x] Barra de navegación superior (`HeaderComponent`) fija con buscador predictivo (`⌘K`), título contextual de sección, conmutador de tema claro/oscuro y perfil de usuario con badge de rol.
  - [x] Barra de navegación lateral (`SidebarComponent`) colapsable (260px expandido / 72px modo iconos) con logo coral bioluminiscente, indicador activo lateral, badge de rol (`👑 Admin` oro / `🐠 Socio` cian) y logout con confirmación `HlmAlertDialog`.
  - [x] Navegación táctil para móviles (`BottomNavComponent`) fija en la parte inferior (< 1024px) y panel lateral deslizable (`Mobile Drawer`) con backdrop desenfocado.
  - [x] Modo Oscuro por defecto (*Deep Marine*) y Claro (*Clean Marine*) gestionado reactivamente por `ThemeService` con persistencia en `localStorage`.
  - [x] Generación de primitives Spartan UI en `src/app/shared/ui/`: `button`, `badge`, `dialog`, `alert-dialog`, `input`, `switch`, `sonner`, `table`, `tooltip`.
  - [x] Configuración de PostCSS (`@tailwindcss/postcss`, `.postcssrc.json`) para compilación completa de utilidades de Tailwind CSS v4 con Angular CLI.
  - [x] Verificación visual y funcional completa en navegador automatizado (Playwright).
- [x] **3.3 Pantalla de Login (`/login`)**:
  - [x] Diseño estético y profesional con soporte para inicio de sesión con Google OAuth2 y contraseña de desarrollo.
  - [x] Manejo reactivo de errores (rechazo por lista blanca, cuenta desactivada, cancelación de popup).
  - [x] Redirección automática tras autenticación hacia `/inventario` o ruta previa solicitada (`returnUrl`).

---

## 📌 Fase 4: Módulo de Inventario
> **Objetivo**: Desarrollar la interfaz comercial de consulta, búsqueda, filtros y edición de piezas.

- [x] **4.1 Vista de Catálogo / Tabla (`/inventario`)**:
  - [x] Tabla interactiva (Spartan Table) con ordenación por `ref`, `pvp`, `fecha_compra`, `estado`.
  - [x] Buscador global (búsqueda por número de referencia, palabras clave en descripción y origen).
  - [x] Filtros rápidos por Estado (`Disponible`, `En sobre`, `AEM`, `VyP`, etc.) y por Origen.
  - [x] Paginación optimizada para +300 artículos con selector configurable de elementos por página.
  - [x] Vista alternativa en cuadrícula de tarjetas (*Cards view*) con foto principal y datos clave.
  - [x] Servicio reactivo `InventarioService` con Signals, cliente PocketBase y suite de pruebas unitarias al 100%.
- [x] **4.2 Ficha de Detalle y Edición de Pieza (`/inventario/:id`)**:
  - [x] Visualización completa de metadatos de la pieza (`ref`, `descripcion`, `origen`, `costo`, `gastos_total`, `pvp`, `a_pagar`, `estado`, fechas comerciales y observaciones).
  - [x] **Control de visibilidad y edición por rol**:
    - `admin`: Edición de todos los campos, borrado con confirmación modal (`HlmAlertDialog`), gestión total de fotos.
    - `partner`: Edición habilitada exclusivamente en `pvp`, `a_pagar`, `estado`, `comentarios`, `fecha_venta`, `fecha_pagado`. Campos de compra/coste bloqueados con indicador de solo lectura y candado según regla RBAC y hook de servidor.
  - [x] **Galería de Fotos**:
    - Renderizado de imágenes desde enlace externo (`foto_url` de Google Photos) y visor ampliado modal (Lightbox).
    - Subida y previsualización de nuevas fotos adjuntas a PocketBase (`fotos`) con eliminación individual para `admin`.
  - [x] **Resumen económico en ficha**:
    - Tarjetas KPI: Costo Compra + Gastos Extra = Coste Total vs PVP, Margen Bruto (€ y %), Liquidación A Pagar y Beneficio Neto.
    - Tabla integrada con desglose de `gastos_extra` vinculados a la pieza.
  - [x] Suite de pruebas unitarias (`inventario-detail.component.spec.ts`) y build de producción verificado al 100%.

---

## 📌 Fase 5: Módulo de Gastos Extra & Liquidaciones
> **Objetivo**: Controlar las intervenciones, arreglos, enfilados y liquidaciones de las piezas.

- [x] **5.1 Backend & Permisos RBAC en PocketBase**:
  - [x] Actualización de la regla `deleteRule` en `gastos_extra` (`@request.auth.id != ""`) permitiendo a los colaboradores (`partner`) eliminar gastos.
  - [x] Migración automatizada `1790541700_update_gastos_delete_rule.js` sincronizada en backend y deploy, y reflejada en `docs/PERMISSIONS_MATRIX.md`.
- [x] **5.2 Servicio Reactivo `GastosService` (`src/app/core/services/gastos.service.ts`)**:
  - [x] Estado reactivo completo con Angular Signals (`gastos`, `totalItems`, `page`, `perPage`, `searchQuery`, `statusFilter`).
  - [x] Métricas KPI calculadas computadas (`totalGastos`, `totalPagado`, `totalPendiente`, `countPendientes`, `countPagados`).
  - [x] CRUD reactivo completo (`createGasto`, `updateGasto`, `deleteGasto`, `getGastosByPieza`).
  - [x] Buscador predictivo de piezas (`searchPiezas`) para autocompletado interactivo en formularios.
  - [x] Suite de pruebas unitarias (`gastos.service.spec.ts`) al 100%.
- [x] **5.3 Modal de Alta y Edición (`GastoFormDialogComponent`)**:
  - [x] Diálogo modal estilizado con Spartan UI y tokens de diseño (*Deep Marine* / *Clean Marine*).
  - [x] Selector autocompletado de piezas con sugerencias dinámicas (Ref, descripción, estado) o fijación automática si se abre desde la ficha.
  - [x] Conceptos rápidos de un clic (*Enfilado*, *Arreglo*, *Limpieza y pulido*, *Tasación*, etc.).
  - [x] Control del estado de pago mediante selector de fecha de liquidación con botón rápido de fecha actual.
  - [x] Validación reactiva y gestión de errores.
  - [x] Suite de pruebas unitarias (`gasto-form-dialog.component.spec.ts`) al 100%.
- [x] **5.4 Pantalla General de Gastos (`/gastos`)**:
  - [x] 3 Tarjetas KPI superiores: Total Gastos (€), Total Pagado (€), Total Pendiente de Pago (€ y nº de pendientes).
  - [x] Pestañas de estado de pago: *Todos los gastos*, *Pendientes de pago* y *Pagados / Liquidados* con badges numéricos.
  - [x] Buscador textual por Ref. de pieza (#42), concepto o comentarios, y filtro de rango de fechas de gasto.
  - [x] Tabla interactiva (Spartan Table) con ordenación, miniaturas de piezas vinculadas y badges de estado esmeralda / ámbar.
  - [x] Paginación dinámica y diálogo modal de confirmación de borrado (`HlmAlertDialog`).
  - [x] Suite de pruebas unitarias (`gastos-list.component.spec.ts`) al 100%.
- [x] **5.5 Integración en Ficha de Inventario (`/inventario/:id`)**:
  - [x] Botón directo `+ Añadir Gasto` en la sección de intervenciones con preselección automática de la pieza actual.
  - [x] Botones de acción en cada fila de la tabla de gastos (Editar y Eliminar con diálogo de confirmación).
  - [x] Recálculo inmediato reactivo de `totalGastosExtra()`, `costeTotal()`, `margenBruto()` y `beneficioNeto()`.
  - [x] Suite de pruebas unitarias actualizada (`inventario-detail.component.spec.ts`) al 100%.

---

## 📌 Fase 6: Gestión de Usuarios & Invitaciones (Admin Portal)
> **Objetivo**: Permitir al administrador invitar colaboradores y gestionar el acceso a la plataforma.

- [ ] **6.1 Pantalla de Usuarios (`/admin/usuarios`)**:
  - [ ] Acceso protegido exclusivo para rol `admin`.
  - [ ] Listado de usuarios autorizados con email, rol, estado (activo/inactivo) y fecha de creación.
- [ ] **6.2 Formulario de Invitación / Alta**:
  - [ ] Modal para autorizar un nuevo correo de Google y asignarle rol (`partner` o `admin`).
  - [ ] Activar o revocar acceso de un usuario con un toggle.

---

## 📌 Fase 7: Empaquetado y Despliegue en Synology NAS
> **Objetivo**: Puesta en marcha en el NAS Synology mediante un único proyecto de Container Manager.

- [ ] **7.1 Validación del Build de Producción**:
  - [ ] Comprobación del build multi-stage `deploy/Dockerfile.frontend`.
  - [ ] Verificación del proxy inverso Nginx (`deploy/nginx.conf`) redirigiendo `/api/` y `/_/` a `pocketbase:8090`.
- [ ] **7.2 Despliegue en Synology Container Manager**:
  - [ ] Cargar proyecto en el NAS en `/volume1/docker/rey_del_arrecife`.
  - [ ] Comprobación de persistencia del volumen `pb_data` en el NAS.
  - [ ] Configuración de Synology Reverse Proxy (HTTPS + WebSockets para Realtime).
- [ ] **7.3 Configuración de Backup de Base de Datos**:
  - [ ] Configurar copia de seguridad periódica automática de `/volume1/docker/rey_del_arrecife/pb_data` mediante Hyper Backup o script cron de PocketBase.
