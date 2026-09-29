# Plan de Implementación: Migración Definitiva de Google Photos a Almacenamiento Local

## 1. Contexto y Diagnóstico
Actualmente el inventario contiene 300 piezas cuyo campo `foto_url` apunta a enlaces cortos de álbumes compartidos de Google Photos (`https://photos.app.goo.gl/...`). 
Dichos enlaces redirigen a una página web interactiva (HTML) y no a un archivo binario de imagen, lo cual provoca:
- Bloqueo por CORS/CORB y error de renderizado en `<img [src]="selectedPhoto()?.url">`.
- Ausencia de miniaturas en la vista de lista y gastos.
- Dependencia externa frágil respecto a Google.

**Objetivo:** Descargar y persistir todas las imágenes en el almacenamiento nativo de PocketBase (`fotos`), archivar las fotos en disco local de manera ordenada y desacoplar completamente el frontend de Google Photos.

---

## 2. Fases de Ejecución

### Fase 1: Motor de Descarga, Resiliencia y Backup Local (`backend/scripts/sync_google_photos.js`)
Implementar script en Node.js que realice la descarga y asociación de imágenes con las siguientes características:

1. **Resolución y Extracción Directa:**
   - Para cada ítem con `foto_url` y sin `fotos`:
   - Realizar petición HTTP siguiendo redirecciones (`302`) hasta la página del álbum.
   - Extraer la URL de la CDN de Google mediante expresión regular:
     ```regex
     https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9_\-]+
     ```
   - Añadir parámetro de alta resolución (`=w1600`) para obtener la imagen en máxima fidelidad comercial.

2. **Copia de Seguridad Permanente y Ordenada:**
   - Guardar cada imagen descargada en disco local en:
     `backend/data/photos/ref_<REF>_<ID>.jpg`
   - Garantizar que los nombres sean deterministas, limpios y auditables.

3. **Subida a PocketBase:**
   - Crear instancia `FormData` con el archivo binario y actualizar el registro en PocketBase:
     ```js
     const form = new FormData();
     form.append('fotos', new Blob([buffer], { type: 'image/jpeg' }), filename);
     await pb.collection('inventario').update(item.id, form);
     ```

4. **Resiliencia, Rate Limiting y Reintentos:**
   - **Concurrencia controlada:** 2-3 descargas simultáneas máximo con un delay de cortesía (300ms) entre solicitudes para evitar bloqueos por rate-limiting de Google (HTTP 429).
   - **Backoff Exponencial:** Hasta 3 reintentos automáticos por imagen (espera de 1s, 2s, 4s) ante fallos de conexión, timeouts o errores 5xx.
   - **Logging estructurado:**
     - Consola en tiempo real con indicador de progreso `[12/300] (4%) Ref #12 - OK`.
     - Archivo de registro detallado: `backend/logs/sync_photos.log`.
     - Archivo de fallos pendientes: `backend/logs/sync_photos_failed.json` para permitir reintentos selectivos.
   - **Idempotencia:** El script detecta si una pieza ya cuenta con archivos en `fotos` y la omite automáticamente.

5. **Comando npm:**
   - Registrar script en `backend/package.json`:
     `"sync:photos": "node scripts/sync_google_photos.js"`

---

### Fase 2: Ejecución de la Migración
1. Ejecutar el script contra la base de datos de desarrollo.
2. Monitorear los logs y verificar que las 300 piezas reciban su imagen.
3. Comprobar la generación automática de miniaturas en PocketBase (`thumb: 100x100`).
4. Si existen fallos residuales en `sync_photos_failed.json`, investigar URLs manuales o enlaces rotos/privados.

---

### Fase 3: Desacoplamiento del Frontend
Eliminar todos los elementos y referencias a Google Photos en la aplicación Angular:

1. **Catálogo de Inventario (`inventario-list`):**
   - [inventario-list.component.html](file:///Users/josegarces/Coding_projects/rey_del_arrecife/frontend/src/app/features/inventario/inventario-list/inventario-list.component.html):
     - Eliminar el bloque `@else if (item.foto_url)` que renderizaba el botón de enlace externo con icono `lucideExternalLink`.
     - Las miniaturas se cargan únicamente desde `inventarioService.getItemThumbnail(item)`.

2. **Ficha de Detalle de Pieza (`inventario-detail`):**
   - [inventario-detail.component.ts](file:///Users/josegarces/Coding_projects/rey_del_arrecife/frontend/src/app/features/inventario/inventario-detail/inventario-detail.component.ts):
     - Simplificar `allPhotos()` para iterar exclusivamente sobre `it.fotos`. Eliminar objeto derivado `{ id: 'external_url', source: 'external' }`.
     - Eliminar `foto_url` de los campos editables por el administrador (`adminFields`).
     - Retirar `foto_url` del formulario reactivo `itemForm` o marcarlo como solo lectura oculto.
   - [inventario-detail.component.html](file:///Users/josegarces/Coding_projects/rey_del_arrecife/frontend/src/app/features/inventario/inventario-detail/inventario-detail.component.html):
     - Eliminar los badges que diferencian "PocketBase" vs "Google Photos".
     - Eliminar el botón "Álbum" externo del visor principal.
     - Retirar el campo "Enlace Fotográfico Externo (Google Photos)" del formulario de edición.
     - Simplificar el título del modal Lightbox a `Ref. #{{ item()?.ref }} — Fotografía {{ selectedPhotoIndex() + 1 }}`.

3. **Módulo de Gastos (`gastos-list`):**
   - [gastos-list.component.ts](file:///Users/josegarces/Coding_projects/rey_del_arrecife/frontend/src/app/features/gastos/gastos-list/gastos-list.component.ts):
     - Actualizar función `getPiecePhotoUrl()` para resolver miniaturas a través de `fotos` en lugar de `foto_url`.

4. **Servicio y Modelo de Inventario:**
   - [inventario.service.ts](file:///Users/josegarces/Coding_projects/rey_del_arrecife/frontend/src/app/core/services/inventario.service.ts):
     - Deprecar/eliminar método `hasExternalPhoto()`.
   - [inventario.model.ts](file:///Users/josegarces/Coding_projects/rey_del_arrecife/frontend/src/app/core/models/inventario.model.ts):
     - Marcar `foto_url?: string;` como `@deprecated (campo de archivo histórico)`.

5. **Pruebas Unitarias del Frontend:**
   - Actualizar mocks y assertions en `inventario-detail.component.spec.ts` y `inventario-list.component.spec.ts`.

---

### Fase 4: Limpieza de Backend y Pruebas
1. **Script de Seed (`backend/scripts/seed_csv.js`):**
   - Asegurar que futuras reimportaciones no eliminen ni sobreescriban el array `fotos` de registros existentes.
2. **Tests de Integración (`backend/tests/`):**
   - Ajustar `backend/tests/inventory_guard.test.js` para asegurar que las pruebas validen la gestión del campo `fotos` sin depender de enlaces externos.

---

### Fase 5: Actualización de Documentación
1. **[docs/DATA_MODEL.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DATA_MODEL.md):**
   - Actualizar descripción del campo `fotos` como fuente única de verdad para imágenes.
   - Declarar `foto_url` como campo histórico en desuso.
2. **[docs/IMPLEMENTATION_PLAN.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/IMPLEMENTATION_PLAN.md):**
   - Registrar la finalización de la migración de fotos locales.
3. **[docs/DEVELOPMENT_GUIDE.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DEVELOPMENT_GUIDE.md) & [README.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/README.md):**
   - Documentar la existencia del script `npm run sync:photos` para aprovisionamiento inicial.

---

## 3. Checklist de Verificación y Validación
- [x] Ejecución exitosa de `sync_google_photos.js` con las 300 piezas procesadas (293 descargadas con éxito, 7 enlaces origen rotos/vacíos).
- [x] Directorio `backend/data/photos/` poblado con copias locales `ref_*.jpg`.
- [x] Generación y verificación de miniaturas automáticas PocketBase (`100x100`).
- [ ] Navegación en `/inventario`: todas las filas de la tabla muestran su miniatura correctamente.
- [ ] Navegación en `/inventario/:id`: visor de imágenes carga fotos locales nítidas en alta resolución y el Lightbox abre sin fallos.
- [x] Eliminación completa de enlaces rotos de Google Photos en frontend.
- [x] Pruebas unitarias de frontend (`npm test` con 171 tests) y backend (`npm test` con 32 tests) pasando al 100%.
- [ ] Documentación técnica actualizada.
