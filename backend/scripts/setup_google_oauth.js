import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@reydelarrecife.local';

if (process.env.NODE_ENV === 'production' && !process.env.PB_ADMIN_PASSWORD) {
    console.error('❌ ERROR FATAL DE SEGURIDAD: La variable PB_ADMIN_PASSWORD es obligatoria en entornos de producción.');
    process.exit(1);
}

const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'ReyDelArrecife2026!';

const clientId = process.argv[2] || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.argv[3] || process.env.GOOGLE_CLIENT_SECRET;

async function main() {
    const pb = new PocketBase(PB_URL);
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log(`🔑 Superuser autenticado en ${PB_URL}`);

    const usersColl = await pb.collections.getOne('users');

    if (!clientId || !clientSecret) {
        console.log('\nℹ️ Estado actual de configuración OAuth2 en PocketBase:');
        console.log('Habilitado:', usersColl.oauth2?.enabled || false);
        const googleProvider = (usersColl.oauth2?.providers || []).find((p) => p.name === 'google');
        if (googleProvider) {
            console.log('Google Client ID configurado:', googleProvider.clientId ? `${googleProvider.clientId.slice(0, 15)}...` : 'No');
        } else {
            console.log('Proveedor Google: No configurado aún.');
        }

        console.log('\n📝 Para configurar o actualizar las credenciales de Google OAuth:');
        console.log('  Uso: node scripts/setup_google_oauth.js <CLIENT_ID> <CLIENT_SECRET>');
        console.log('  O define: GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/setup_google_oauth.js\n');
        return;
    }

    console.log('⚙️ Configurando proveedor Google OAuth2 en la colección `users`...');

    // Filtrar proveedores existentes quitando google si ya existía
    const currentProviders = (usersColl.oauth2?.providers || []).filter((p) => p.name !== 'google');

    currentProviders.push({
        name: 'google',
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        displayName: 'Google',
    });

    const updatedOauth2 = {
        enabled: true,
        mappedFields: {
            id: '',
            name: 'name',
            username: '',
            avatarURL: 'avatar',
        },
        providers: currentProviders,
    };

    await pb.collections.update('users', { oauth2: updatedOauth2 });
    console.log('✅ Proveedor Google configurado y OAuth2 habilitado exitosamente en PocketBase.');

    const authMethods = await pb.collection('users').listAuthMethods();
    const isGoogleActive = authMethods.oauth2?.providers?.some((p) => p.name === 'google');
    console.log(`🔍 Verificación de métodos de autenticación: Google activo = ${isGoogleActive}`);
}

main().catch((err) => {
    console.error('❌ Error configurando Google OAuth:', err.message);
    process.exit(1);
});
