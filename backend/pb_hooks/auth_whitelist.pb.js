/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de seguridad: Whitelist de Google OAuth2.
 * Solo permite acceder mediante OAuth2 si el correo electrónico
 * ha sido pre-autorizado e introducido previamente por un Administrador.
 */
onRecordAuthWithOAuth2Request((e) => {
    const oAuthUser = e.oAuth2User;
    if (!oAuthUser || !oAuthUser.email) {
        throw new ForbiddenError("No se pudo obtener el correo de la cuenta de Google.");
    }

    const email = oAuthUser.email.toLowerCase().trim();

    try {
        // Buscar si el usuario ya existe en la colección de usuarios
        const user = $app.dao().findAuthRecordByEmail("users", email);

        if (!user) {
            throw new ForbiddenError(
                `El correo ${email} no ha sido invitado ni autorizado por un administrador.`
            );
        }

        // Verificar que el usuario no esté deshabilitado
        if (user.getBool("active") === false) {
            throw new ForbiddenError("Esta cuenta ha sido desactivada temporalmente.");
        }

        // Asociar datos del perfil de Google si aún no están establecidos
        if (!user.getString("name") && oAuthUser.name) {
            user.set("name", oAuthUser.name);
            $app.dao().saveRecord(user);
        }
    } catch (err) {
        if (err instanceof ForbiddenError) {
            throw err;
        }
        // Si no se encuentra el usuario por email, findAuthRecordByEmail lanza error
        throw new ForbiddenError(
            `El correo ${email} no tiene acceso autorizado a Rey del Arrecife.`
        );
    }
}, "users");
