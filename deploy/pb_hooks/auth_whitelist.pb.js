/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de seguridad: Whitelist de Google OAuth2.
 * Solo permite acceder mediante OAuth2 si el correo electrónico
 * ha sido pre-autorizado e introducido previamente por un Administrador en la colección 'users'.
 */
onRecordAuthWithOAuth2Request((e) => {
    const oAuthUser = e.oAuth2User;
    if (!oAuthUser || !oAuthUser.email) {
        throw new ForbiddenError("No se pudo obtener el correo de la cuenta de Google.");
    }

    const email = oAuthUser.email.toLowerCase().trim();

    let user;
    try {
        // En PocketBase v0.40, las consultas se ejecutan a través de la instancia transaccional e.app
        user = e.app.findAuthRecordByEmail("users", email);
    } catch (err) {
        throw new ForbiddenError(
            `El correo ${email} no ha sido invitado ni autorizado por un administrador.`
        );
    }

    if (!user) {
        throw new ForbiddenError(
            `El correo ${email} no ha sido invitado ni autorizado por un administrador.`
        );
    }

    // Verificar que el usuario no esté deshabilitado
    if (user.getBool("active") === false) {
        throw new ForbiddenError("Esta cuenta ha sido desactivada temporalmente.");
    }

    // Vincular explícitamente el record a este usuario existente para que PocketBase
    // asocie la cuenta externa de Google con este usuario en lugar de intentar crear uno nuevo
    e.record = user;

    // Asociar datos del perfil de Google si aún no están establecidos
    let needsSave = false;
    if (!user.getString("name") && oAuthUser.name) {
        user.set("name", oAuthUser.name);
        needsSave = true;
    }

    if (needsSave) {
        e.app.save(user);
    }

    // Continuar con la cadena de hooks de PocketBase
    e.next();
}, "users");
