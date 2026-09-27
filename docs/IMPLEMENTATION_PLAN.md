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
[Fase 3: Frontend Foundation & Design System (Spartan UI)]
               │
               ▼
[Fase 4: Módulo de Inventario (Catálogo & Ficha Comercial)]
               │
               ▼
[Fase 5: Módulo de Gastos Extra & Liquidaciones]
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
- [ ] **2.2 Hook de Lista Blanca OAuth2 (`auth_whitelist.pb.js`)**:
  - [x] Código inicial del hook en `backend/pb_hooks/auth_whitelist.pb.js`.
  - [ ] Pruebas de integración: verificar rechazo automático de cuentas Google no autorizadas previamente en `users`.
  - [ ] Configuración del cliente OAuth2 de Google en la consola de Google Cloud (credenciales, client_id, secret y redirect URI).
- [ ] **2.3 Hook de Protección de Campos de Inventario (`inventory_guard.pb.js`)**:
  - [ ] Garantizar a nivel de servidor que un usuario con rol `partner` no pueda alterar `costo`, `fecha_compra`, `origen` ni `ref`, aunque envíe un payload manipulado por API.
- [ ] **2.4 Automatización de Migraciones (`pb_migrations/`)**:
  - [ ] Exportar el esquema actual a ficheros `.js` de migración PocketBase para despliegue automatizado sin necesidad de correr scripts manuales.

---

## 📌 Fase 3: Frontend Foundation & Design System (Spartan UI)
> **Objetivo**: Configurar el núcleo del frontend Angular: cliente PocketBase reactivo, estado de sesión, Guards de rutas y componentes base de Spartan UI.

- [ ] **3.1 Servicio PocketBase y Gestión de Autenticación**:
  - [ ] Servicio Angular `AuthService` utilizando Signals (`currentUser`, `isAuthenticated`, `isAdmin`, `isPartner`).
  - [ ] Sincronización del `authStore` de PocketBase con LocalStorage y estado reactivo.
  - [ ] Implementación de `loginWithGoogle()` y manejo de errores de acceso denegado (no en lista blanca).
  - [ ] `authGuard` y `roleGuard` funcionales en Angular Router.
- [ ] **3.2 Layout Principal y Spartan Shell**:
  - [ ] Barra de navegación superior / lateral con indicador de usuario, avatar, badge de rol y botón de logout.
  - [ ] Modo Oscuro / Claro implementado con tokens semánticos de Spartan UI.
  - [ ] Componentes Helm necesarios añadidos vía `@spartan-ng/cli:ui` (`button`, `dialog`, `table`, `input`, `badge`, `card`, `dropdown-menu`, `toast`).
- [ ] **3.3 Pantalla de Login (`/login`)**:
  - [ ] Diseño estético y profesional con botón de acceso mediante Google OAuth.
  - [ ] Mensajes amigables en caso de cuenta no invitada o desactivada.

---

## 📌 Fase 4: Módulo de Inventario
> **Objetivo**: Desarrollar la interfaz comercial de consulta, búsqueda, filtros y edición de piezas.

- [ ] **4.1 Vista de Catálogo / Tabla (`/inventario`)**:
  - [ ] Tabla interactiva (Spartan Table) con ordenación por `ref`, `pvp`, `fecha_compra`, `estado`.
  - [ ] Buscador global (búsqueda por número de referencia, palabras clave en descripción y origen).
  - [ ] Filtros rápidos por Estado (`Disponible`, `AEM`, `VyP`, etc.) y por Origen.
  - [ ] Paginación o scroll virtual optimizado para +300 artículos.
  - [ ] Vista alternativa en cuadrícula de tarjetas (*Cards view*) con foto principal y datos clave.
- [ ] **4.2 Ficha de Detalle y Edición de Pieza (`/inventario/:id`)**:
  - [ ] Visualización completa de metadatos de la pieza.
  - [ ] **Control de visibilidad y edición por rol**:
    - `admin`: Edición de todos los campos, botón de borrado, alta de nuevas piezas.
    - `partner`: Edición habilitada exclusivamente en `pvp`, `a_pagar`, `estado`, `comentarios`, `fecha_venta`, `fecha_pagado`. Campos de compra/coste bloqueados para edición.
  - [ ] **Galería de Fotos**:
    - Renderizado de imágenes desde enlace externo (`foto_url` de Google Photos).
    - Subida y previsualización de nuevas fotos adjuntas a PocketBase (`fotos`).
  - [ ] Resumen económico en ficha: Costo + Gastos Extra = Coste Total vs PVP y margen resultante.

---

## 📌 Fase 5: Módulo de Gastos Extra & Liquidaciones
> **Objetivo**: Controlar las intervenciones, arreglos, enfilados y liquidaciones de las piezas.

- [ ] **5.1 Lista General de Gastos (`/gastos`)**:
  - [ ] Tabla de gastos con filtros por fecha de gasto, fecha de pago y pieza asociada.
  - [ ] Indicador de estado de pago del gasto (Pendiente vs Pagado).
- [ ] **5.2 Alta y Edición de Gasto Extra**:
  - [ ] Diálogo modal (Spartan Dialog) para registrar un gasto vinculado a una `ref` de pieza.
  - [ ] Autocompletado del selector de pieza por número de referencia o descripción.
- [ ] **5.3 Recálculo Automático**:
  - [ ] Actualización en tiempo real del sumatorio de gastos (`gastos_total`) en la ficha de inventario.

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
