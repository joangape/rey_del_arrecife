# 🔐 Guía de Configuración: Google OAuth2 & Lista Blanca de Acceso

Esta guía detalla paso a paso cómo crear las credenciales en la consola de Google Cloud, configurar PocketBase y asegurar el sistema mediante la lista blanca de invitaciones (`auth_whitelist.pb.js`).

---

## 🏗️ 1. Crear el Proyecto y Credenciales en Google Cloud Console

1. Accede a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un nuevo proyecto (o selecciona uno existente), por ejemplo: `rey-del-arrecife`.

### 1.1 Pantalla de Consentimiento OAuth (*OAuth consent screen*)
1. Ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth** (*OAuth consent screen*).
2. Selecciona **External** (Externo) y pulsa **Crear**.
   > *Nota:* Si tienes Google Workspace corporativo, puedes seleccionar *Internal* para restringir el acceso exclusivamente a tu organización.
3. Rellena los datos básicos:
   - **Nombre de la aplicación**: `Rey del Arrecife`
   - **Correo de asistencia al usuario**: Tu correo de administrador.
   - **Datos de contacto del desarrollador**: Tu correo.
4. En la sección **Permisos (*Scopes*)**:
   - Pulsa **Añadir o quitar permisos**.
   - Selecciona los permisos básicos de perfil y correo:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
5. En la sección **Usuarios de prueba (*Test users*)** (si la app está en estado *Testing*):
   - Añade los correos de Google de los administradores y socios autorizados para que puedan iniciar sesión mientras la aplicación no esté verificada públicamente.
6. Guarda y finaliza.

---

### 1.2 Crear el ID de Cliente OAuth 2.0
1. Ve a **APIs y servicios** > **Credenciales**.
2. Pulsa en **+ Crear credenciales** > **ID de cliente de OAuth** (*OAuth client ID*).
3. Selecciona **Tipo de aplicación**: `Aplicación web` (*Web application*).
4. Asigna un nombre: `Rey del Arrecife Web`.
5. Configura los **Orígenes autorizados de JavaScript**:
   - Desarrollo Local:
     - `http://localhost:8090`
     - `http://localhost:4200`
   - Producción (Synology NAS / Dominio final):
     - `https://tudominio.com` (o la URL de tu Reverse Proxy)
6. Configura los **URIs de redireccionamiento autorizados**:
   - Desarrollo Local:
     - `http://localhost:8090/api/oauth2-redirect`
   - Producción:
     - `https://tudominio.com/api/oauth2-redirect`
7. Pulsa en **Crear**.
8. Copia tu **ID de cliente (*Client ID*)** y tu **Secreto de cliente (*Client Secret*)**.

---

## ⚙️ 2. Registrar las Credenciales en PocketBase

Puedes registrar las credenciales de Google utilizando cualquiera de los dos métodos siguientes:

### Opción A: Mediante el script automatizado (Recomendado)
Desde la terminal en el directorio raíz o en `/backend`:

```bash
# Opción 1: Pasando las credenciales directamente por argumento
cd backend
npm run oauth:google <TU_CLIENT_ID> <TU_CLIENT_SECRET>

# Opción 2: Usando variables de entorno
GOOGLE_CLIENT_ID="tu-client-id" GOOGLE_CLIENT_SECRET="tu-secret" npm run oauth:google
```

El script verificará la conexión con el superuser, actualizará la colección `users`, activará el proveedor `google` y confirmará que `listAuthMethods()` lo devuelve activo.

### Opción B: A través del Dashboard de Administración
1. Abre en tu navegador `http://localhost:8090/_/` e inicia sesión como Superuser.
2. Selecciona la colección **users**.
3. Haz clic en el icono de configuración (rueda dentada / *Edit collection*).
4. Ve a la pestaña **Options** o **OAuth2**.
5. Activa el toggle de **OAuth2**.
6. En la lista de proveedores, localiza **Google**:
   - Marca la casilla para activarlo.
   - Pega tu **Client ID** y **Client Secret**.
7. Pulsa **Save changes**.

---

## 🛡️ 3. Funcionamiento de la Lista Blanca de Acceso

El hook de seguridad implementado en `backend/pb_hooks/auth_whitelist.pb.js` intercepta cada intento de autenticación OAuth2 antes de que PocketBase emita una sesión.

### Flujo de Acceso:
```
Usuario pulsa "Iniciar sesión con Google"
                   │
                   ▼
Google autentica al usuario y devuelve su correo
                   │
                   ▼
Hook: onRecordAuthWithOAuth2Request() intercepta
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
¿Existe en `users`?        NO  ──► ⛔ 403 Forbidden ("Correo no invitado")
         │
        SÍ
         ▼
¿Está `active == true`?    NO  ──► ⛔ 403 Forbidden ("Cuenta desactivada")
         │
        SÍ
         ▼
✅ Vincula `e.record = user`, sincroniza nombre y autoriza sesión
```

### Cómo Invitar a un Nuevo Colaborador / Socio:
1. El Administrador accede al Dashboard (o posteriormente al portal `/admin/usuarios`).
2. Crea un nuevo registro en `users` introduciendo:
   - **email**: El correo exacto de Google del colaborador (ej: `socio@gmail.com`).
   - **role**: `partner` (o `admin`).
   - **active**: `true` (marcado).
   - **password**: Una clave aleatoria provisional (no será requerida por el socio al usar Google).
3. Cuando el colaborador pulsa "Iniciar sesión con Google", su cuenta se vincula automáticamente y accede con el rol preasignado.

---

## 🧪 4. Pruebas de Integración Automatizadas

El sistema cuenta con una suite de pruebas de integración completa que levanta un servidor mock OIDC y prueba los tres escenarios críticos contra la instancia real de PocketBase:

```bash
# Desde el directorio raíz del proyecto:
make test-auth

# O desde /backend:
npm run test:auth
```

### Escenarios validados por la suite:
1. **Rechazo de correos no invitados**: Retorna HTTP 403 Forbidden con el mensaje: `El correo ... no ha sido invitado ni autorizado por un administrador.`
2. **Rechazo de cuentas desactivadas**: Retorna HTTP 403 Forbidden con el mensaje: `Esta cuenta ha sido desactivada temporalmente.`
3. **Acceso concedido a socios activos**: Retorna HTTP 200 OK con token JWT válido, asociando el ID del usuario pre-creado y actualizando su nombre si no estaba definido.
