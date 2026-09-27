# 🚀 Guía de Despliegue en Synology NAS (Container Manager)

Esta guía describe el procedimiento para desplegar el proyecto **Rey del Arrecife** en un único proyecto de **Synology Container Manager** mediante Docker Compose.

---

## 1. Arquitectura en Synology

El proyecto se despliega como una única unidad compuesta por dos servicios coordinados en una red interna privada:
1. **`pocketbase`**: Servidor de base de datos y autenticación, persistiendo sus ficheros en el volumen del NAS.
2. **`frontend` (Nginx)**: Servidor web ligero que despacha la SPA compilada de Angular y actúa como Proxy Inverso redirigiendo las rutas `/api/*` y `/_/*` hacia el contenedor de PocketBase.

> [!TIP]
> Al salir todo por el contenedor Nginx en un único puerto, **no existe configuración compleja de CORS** ni necesidad de exponer PocketBase directamente a internet.

---

## 2. Preparación de Carpetas en el Synology NAS

En el File Station de tu Synology NAS, crea la siguiente estructura en la carpeta compartida `docker`:

```bash
/volume1/docker/rey_del_arrecife/
├── docker-compose.yml       # Copiado desde /deploy/docker-compose.yml
├── nginx.conf               # Copiado desde /deploy/nginx.conf
├── .env                     # Variables de entorno de producción
├── pb_data/                 # Directorio de persistencia de PocketBase (se creará solo o con permisos)
└── dist/                    # Build compilada de Angular (o montada en la imagen Docker)
```

### Permisos del volumen `pb_data`
Asegúrate de que la carpeta `pb_data` tenga permisos de lectura y escritura para el contenedor Docker:
```bash
chmod -R 775 /volume1/docker/rey_del_arrecife/pb_data
```

---

## 3. Configuración en Synology Container Manager

1. Abre la aplicación **Container Manager** en tu DSM de Synology.
2. En el menú lateral izquierdo, haz clic en **Proyecto** (Project).
3. Haz clic en **Crear**:
   - **Nombre del proyecto**: `rey-del-arrecife`
   - **Ruta**: Selecciona `/docker/rey_del_arrecife`
   - **Origen**: Selecciona *Crear docker-compose.yml* o cárgalo desde el fichero generado en [`deploy/docker-compose.yml`](file:///Users/josegarces/Coding_projects/rey_del_arrecife/deploy/docker-compose.yml).
4. Configura las variables en `.env`:
   - `PORT`: Puerto exterior deseado en el NAS (ej. `3080`).
   - `APP_URL`: Dominio o IP pública del NAS (ej. `https://arrecife.midominio.synology.me`).
5. Siguiente y Finalizar. Container Manager descargará/compilará las imágenes y levantará los servicios automáticamente.

---

## 4. Configuración de Acceso Externo y SSL (Portal de Inicio de Sesión de Synology)

Para acceder de forma segura vía HTTPS con tu certificado Let's Encrypt de Synology:

1. Ve a **Panel de Control > Portal de inicio de sesión > Avanzado > Proxy Inverso**.
2. Haz clic en **Crear**:
   - **Descripción**: `Rey del Arrecife`
   - **Origen**:
     - Protocolo: `HTTPS`
     - Nombre de host: `arrecife.tudominio.synology.me`
     - Puerto: `443`
     - Habilitar HSTS: Sí
   - **Destino**:
     - Protocolo: `HTTP`
     - Nombre de host: `localhost`
     - Puerto: `3080` (el puerto mapeado por Nginx en el compose)
3. En la pestaña **Cabecera personalizada**:
   - Pulsa en **Crear > WebSocket** (para permitir suscripciones en tiempo real SSE/WebSocket de PocketBase).
4. Guarda los cambios. Tu aplicación estará disponible de forma cifrada y lista para autorizar los callbacks de Google OAuth en la consola de Google Cloud.
