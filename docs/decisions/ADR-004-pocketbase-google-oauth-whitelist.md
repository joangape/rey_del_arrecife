# ADR-004: Autenticación Google OAuth con Lista Blanca de Invitaciones

## Estado
Aceptado

## Contexto
El sistema utilizará autenticación con Google OAuth mediante PocketBase. Sin embargo, no se debe permitir el autoregistro público de cualquier cuenta de Google. Solo personas previamente autorizadas por un `admin` deben poder ingresar al sistema.

## Decisión
Implementar un modelo de lista blanca (*pre-authorized whitelist*):
1. El `admin` crea previamente el registro del usuario (con su email y su rol asignado: `admin` o `partner`).
2. Al pulsar "Iniciar sesión con Google", un hook de PocketBase (`pb_hooks/auth_whitelist.pb.js`) intercepta la petición OAuth2.
3. Si el correo que retorna Google no existe previamente en la colección `users` o tiene `active = false`, la autenticación es abortada con error 403 Forbidden.
4. Si el correo ya existe, se vincula el proveedor OAuth y se otorga la sesión.

## Consecuencias
- **Positivas**: Máxima comodidad para los usuarios (login con un clic sin contraseñas locales que gestionar ni recordar), con seguridad cerrada y controlada por invitación.
- **Negativas**: El administrador debe introducir con precisión el correo exacto de la cuenta de Google del socio.
