# 🛠️ Guía de Desarrollo Local - Rey del Arrecife

Esta guía detalla el entorno de desarrollo híbrido estándar acordado:
- **Backend (PocketBase)**: Ejecutándose en un contenedor Docker local ligero.
- **Frontend (Angular)**: Ejecutándose directamente en el host con Node.js (`npm start`) para máxima velocidad de compilación y recarga en caliente (HMR).

---

## 1. Requisitos Previos

- **Node.js**: v20+ o v22+ (detectado en el sistema)
- **Docker Desktop / Colima**: instalado y en ejecución
- **Make**: disponible en sistemas Unix/macOS

---

## 2. Comandos del Harness de Desarrollo

Para facilitar el día a día, se dispone de un `Makefile` en la raíz del proyecto:

```bash
# Iniciar backend PocketBase en Docker y frontend Angular en host
make dev

# Levantar únicamente el contenedor local de PocketBase
make backend-up

# Detener el contenedor de PocketBase
make backend-down

# Importar y migrar los datos históricos de los CSV a PocketBase
make seed

# Sincronizar y descargar fotografías de Google Photos al almacenamiento nativo local
make sync-photos

# Ejecutar las pruebas de integración del hook de autenticación OAuth2 Whitelist
make test-auth

# Compilar frontend Angular para producción
make build

# Ver logs del contenedor backend
make backend-logs
```

Para la configuración de Google Cloud y OAuth2, consulta la [Guía de Configuración de Google OAuth2](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/GOOGLE_OAUTH_SETUP.md).

---

## 3. Acceso a las Interfaces en Desarrollo

- **Frontend Angular**: [http://localhost:4200](http://localhost:4200)
- **PocketBase Admin UI**: [http://localhost:8090/_/](http://localhost:8090/_/)
  - **Email Admin por defecto**: `admin@reydelarrecife.local`
  - **Contraseña Admin por defecto**: `ReyDelArrecife2026!`
- **PocketBase API Endpoints**: `http://localhost:8090/api/`

---

## 4. Inicialización, Carga de Datos (Seed) y Fotos

La primera vez que levantes el backend:

1. Inicia el backend:
   ```bash
   make backend-up
   ```
2. Accede a [http://localhost:8090/_/](http://localhost:8090/_/) y crea tu usuario administrador inicial si es requerido por primera vez.
3. Ejecuta el script de migración para importar los datos de los ficheros CSV históricos:
   ```bash
   make seed
   ```
   El script creará/verificará las colecciones, limpiará los datos e importará las piezas y gastos extra.

4. Ejecuta la descarga y sincronización de fotografías:
   ```bash
   make sync-photos
   # O alternativamente: cd backend && npm run sync:photos
   ```
   Este script:
   - Descarga cada imagen de los álbumes compartidos de Google Photos en alta resolución (`=w1600`).
   - Guarda una copia de respaldo limpia y determinista en `backend/data/photos/ref_<REF>_<ID>.jpg`.
   - Adjunta el archivo binario directamente al registro en el campo nativo `fotos` de PocketBase.
   - Es idempotente: si una pieza ya cuenta con archivos en `fotos`, la omite automáticamente.
   - Genera logs detallados en `backend/logs/sync_photos.log`.

---

## 5. Skills del Agente en el Proyecto

El entorno cuenta con skills especializados en `.agents/skills`:
- **`spartan`**: Asistente y snippets para integración con Spartan UI en Angular.
- **`pocketbase-best-practices`**: Buenas prácticas, schemas y reglas de PocketBase.
- **`angular-signals`**: Guía y patrones para gestión de estado reactivo con Signals en Angular.
- **`angular-component`**: Patrones para standalone components modernos en Angular.
