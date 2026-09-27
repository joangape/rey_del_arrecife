/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de seguridad: Protección de Usuarios y Roles (User Guard).
 *
 * Implementa el control de acceso estricto y previene escaladas de privilegios
 * en la colección 'users':
 *
 * - Admin / Superuser: Gestión irrestricta de usuarios y roles.
 * - Partner / Usuarios autenticados regulares:
 *     * Solo pueden actualizar su propio perfil (id === @request.auth.id).
 *     * Tienen estrictamente prohibido alterar su propio rol ('role') o estado ('active').
 *     * Tienen prohibido dar de alta nuevos usuarios o eliminar usuarios existentes.
 * - Peticiones no autenticadas: Bloqueadas completamente para cualquier mutación.
 */

onRecordCreateRequest((e) => {
    // Superusuario autenticado
    if (e.hasSuperuserAuth()) {
        e.next();
        return;
    }

    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError("Se requiere autenticación para crear usuarios.");
    }

    const role = authRecord.getString("role");
    if (role !== "admin") {
        throw new ForbiddenError("Solo los administradores pueden dar de alta nuevos usuarios.");
    }

    e.next();
}, "users");

onRecordUpdateRequest((e) => {
    // Superusuario autenticado
    if (e.hasSuperuserAuth()) {
        e.next();
        return;
    }

    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError("Se requiere autenticación para actualizar datos de usuario.");
    }

    const role = authRecord.getString("role");

    // Administradores: acceso completo
    if (role === "admin") {
        e.next();
        return;
    }

    // Socios y usuarios regulares: solo pueden modificar su propio registro
    if (e.record.id !== authRecord.id) {
        throw new ForbiddenError("No tienes permisos para modificar los datos de otro usuario.");
    }

    const original = e.record.original();
    if (original) {
        // Bloquear alteración de rol
        if (original.getString("role") !== e.record.getString("role")) {
            throw new ForbiddenError("No tienes permisos para modificar tu rol de usuario.");
        }

        // Bloquear alteración de estado activo/inactivo
        if (original.getBool("active") !== e.record.getBool("active")) {
            throw new ForbiddenError("No tienes permisos para modificar el estado de activación de la cuenta.");
        }
    }

    e.next();
}, "users");

onRecordDeleteRequest((e) => {
    // Superusuario autenticado
    if (e.hasSuperuserAuth()) {
        e.next();
        return;
    }

    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError("Se requiere autenticación para eliminar usuarios.");
    }

    const role = authRecord.getString("role");
    if (role !== "admin") {
        throw new ForbiddenError("Solo los administradores pueden eliminar usuarios.");
    }

    e.next();
}, "users");
