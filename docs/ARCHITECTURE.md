# 🏛️ Arquitectura del Sistema - Rey del Arrecife

## 1. Visión General

**Rey del Arrecife** es una plataforma web para la gestión de inventario y gastos de piezas (joyería antigua, corales, etc.), diseñada para ejecutarse de forma autosuficiente tanto en un entorno de desarrollo local como en un servidor doméstico **Synology NAS** mediante **Synology Container Manager**.

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENTE (Navegador)                                  |
+-----------------------------------------------------------------------------------------+
                                             │ HTTP/HTTPS
                                             ▼
+─────────────────────────────────────────────────────────────────────────────────────────+
|                           SYNOLOGY CONTAINER MANAGER (Proyecto)                         |
|                                                                                         |
|  +───────────────────────────────────────────────────+                                  |
|  |             Servicio Frontend (Nginx)             |                                  |
|  | - Sirve Angular 22 SPA estático                   |                                  |
|  | - Reverse Proxy: /api/*  -> pocketbase:8090/api/* |                                  |
|  | - Reverse Proxy: /_/*    -> pocketbase:8090/_/*   |                                  |
|  +─────────────────────────┬─────────────────────────+                                  |
|                            │ Red interna docker                                         |
|                            ▼                                                            |
|  +───────────────────────────────────────────────────+                                  |
|  |            Servicio Backend (PocketBase)          |                                  |
|  | - SQLite embedded en /pb_data                     |                                  |
|  | - Auth (Google OAuth2 + Email Whitelist Hook)     |                                  |
|  | - REST API + Realtime (SSE)                       |                                  |
|  | - Almacenamiento de fotos (volumen persistente)   |                                  |
|  +───────────────────────────────────────────────────+                                  |
|                            │                                                            |
|                            ▼                                                            |
|             Volumen NAS: /volume1/docker/rey_del_arrecife/pb_data                       |
+─────────────────────────────────────────────────────────────────────────────────────────+
```

## 2. Componentes

### 2.1 Frontend (`/frontend`)
- **Framework**: Angular 22 (Standalone Components, Signals, Zoneless/modern reactivity).
- **Estilos & UI**: Tailwind CSS v3 + **Spartan UI** (`@spartan-ng/brain` y `@spartan-ng/ui-*`).
- **Iconografía**: Lucide Angular.
- **Cliente API**: `pocketbase` JS SDK.
- **Rutas Principales**:
  - `/login`: Autenticación con Google OAuth.
  - `/inventario`: Catálogo con filtros, buscador por referencia/descripción/estado, tabla interactiva y tarjetas de detalle.
  - `/inventario/:id`: Ficha de pieza, fotos, histórico de gastos extra asociados y edición según rol.
  - `/gastos`: Gestión centralizada de gastos extra y relación con piezas.
  - `/admin/usuarios`: Gestión de invitaciones y roles (solo accesible por `admin`).

### 2.2 Backend (`/backend`)
- **Motor**: PocketBase (Go executable en contenedor Docker alpine/scratch).
- **Persistencia**: SQLite integrado (con WAL mode habilitado por defecto en PocketBase).
- **Hooks**:
  - `pb_hooks/auth_whitelist.pb.js`: Intercepta la autenticación OAuth2 para garantizar que únicamente correos electrónicos previamente registrados por un Admin puedan autenticarse.
- **Migraciones & Seeds**:
  - `scripts/seed_csv.js`: Parser e importador de los ficheros CSV históricos (`Inventario.csv` y `Gastos extra.csv`).

### 2.3 Despliegue en Synology (`/deploy`)
- **Contenedores**:
  1. `pocketbase`: expone el puerto 8090 internamente a la red docker `rey_network`.
  2. `frontend` (Nginx): expone el puerto público configurado (ej. 3080 o vía Synology Reverse Proxy).
- **Ventaja**: Cero problemas de CORS en producción, ya que todo se sirve bajo el mismo origen.

## 3. Entornos de Ejecución

| Entorno | Backend | Frontend | Enlace de Red |
|---|---|---|---|
| **Local Dev (Híbrido)** | Docker (`docker-compose.yml` en `/backend`) en `localhost:8090` | Host nativo (`npm start` en `/frontend`) en `localhost:4200` | Frontend conecta directamente a `http://localhost:8090` |
| **Producción (Synology)** | Contenedor `pocketbase` | Contenedor `nginx` compilado | Red Docker interna; acceso por puerto único o Reverse Proxy DSM |
