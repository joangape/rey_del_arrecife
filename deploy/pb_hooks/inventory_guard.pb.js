/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de seguridad: Protección de Campos de Inventario (Inventory Guard).
 *
 * Implementa el control de acceso a nivel de campo (Field-Level Permissions) y operaciones
 * para la colección 'inventario' de acuerdo con la matriz RBAC del proyecto.
 *
 * - Admin / Superuser: Edición y gestión irrestricta de todos los campos.
 * - Partner: Solo puede modificar los campos comerciales autorizados:
 *     ['pvp', 'a_pagar', 'estado', 'comentarios', 'fecha_venta', 'fecha_pagado']
 *   Cualquier intento de alterar campos protegidos ('costo', 'fecha_compra', 'origen',
 *   'ref', 'descripcion', 'gastos_total', 'foto_url', 'fotos') o realizar altas/bajas
 *   será bloqueado a nivel de servidor con HTTP 403 Forbidden.
 */

onRecordUpdateRequest((e) => {
    // Si la petición proviene de un superuser autenticado (dashboard admin o API superuser), permitir
    if (e.hasSuperuserAuth()) {
        e.next();
        return;
    }

    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError("Se requiere autenticación para actualizar piezas de inventario.");
    }

    const role = authRecord.getString("role");

    // Rol 'admin': acceso irrestricto
    if (role === "admin") {
        e.next();
        return;
    }

    // Rol 'partner': validar que no altere ningún campo protegido
    if (role === "partner") {
        const protectedFields = [
            "ref",
            "costo",
            "fecha_compra",
            "origen",
            "descripcion",
            "gastos_total",
            "foto_url",
            "fotos",
        ];

        const original = e.record.original();
        const current = e.record;

        function checkFieldAltered(field) {
            if (!original || !current) return false;

            switch (field) {
                case "costo":
                case "gastos_total": {
                    const origVal = original.getFloat(field);
                    const currVal = current.getFloat(field);
                    return Math.abs(origVal - currVal) > 0.0001;
                }
                case "ref": {
                    return original.getInt(field) !== current.getInt(field);
                }
                case "fecha_compra": {
                    return original.getString(field) !== current.getString(field);
                }
                case "origen":
                case "descripcion":
                case "foto_url": {
                    return original.getString(field).trim() !== current.getString(field).trim();
                }
                case "fotos": {
                    const origFotos = original.getStringSlice(field) || [];
                    const currFotos = current.getStringSlice(field) || [];
                    if (origFotos.length !== currFotos.length) return true;
                    for (let i = 0; i < origFotos.length; i++) {
                        if (origFotos[i] !== currFotos[i]) return true;
                    }
                    return false;
                }
                default: {
                    return original.get(field) !== current.get(field);
                }
            }
        }

        for (let i = 0; i < protectedFields.length; i++) {
            const field = protectedFields[i];
            if (checkFieldAltered(field)) {
                throw new ForbiddenError(
                    `Los usuarios con rol 'partner' no tienen permisos para modificar el campo protegido: '${field}'.`
                );
            }
        }

        e.next();
        return;
    }

    // Cualquier otro rol no reconocido
    throw new ForbiddenError("No tienes permisos para modificar piezas de inventario.");
}, "inventario");

onRecordCreateRequest((e) => {
    if (e.hasSuperuserAuth()) {
        e.next();
        return;
    }

    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError("Se requiere autenticación para dar de alta piezas de inventario.");
    }

    const role = authRecord.getString("role");
    if (role !== "admin") {
        throw new ForbiddenError("Solo los administradores pueden dar de alta nuevas piezas en el inventario.");
    }

    e.next();
}, "inventario");

onRecordDeleteRequest((e) => {
    if (e.hasSuperuserAuth()) {
        e.next();
        return;
    }

    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError("Se requiere autenticación para eliminar piezas de inventario.");
    }

    const role = authRecord.getString("role");
    if (role !== "admin") {
        throw new ForbiddenError("Solo los administradores pueden eliminar piezas del inventario.");
    }

    e.next();
}, "inventario");
