import http from 'node:http';
import assert from 'node:assert';
import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@reydelarrecife.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'ReyDelArrecife2026!';
const MOCK_OIDC_PORT = 3099;

// Estado del mock server para controlar qué usuario responde
let currentMockUser = {
    sub: 'mock-sub-123',
    email: '',
    name: '',
    email_verified: true,
};

function startMockOidcServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url, `http://localhost:${MOCK_OIDC_PORT}`);

            if (url.pathname === '/token' && req.method === 'POST') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    access_token: 'mock_access_token_xyz',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    id_token: 'mock_id_token',
                }));
                return;
            }

            if (url.pathname === '/userinfo') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(currentMockUser));
                return;
            }

            res.writeHead(404);
            res.end();
        });

        server.listen(MOCK_OIDC_PORT, () => {
            resolve(server);
        });
    });
}

async function runTests() {
    console.log('🚀 Iniciando suite de pruebas de integración para Whitelist OAuth2...');

    // 1. Iniciar servidor mock OIDC
    const mockServer = await startMockOidcServer();
    console.log(`📡 Servidor Mock OIDC escuchando en puerto ${MOCK_OIDC_PORT}`);

    const adminPb = new PocketBase(PB_URL);
    await adminPb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('🔑 Superuser autenticado exitosamente.');

    // 2. Configurar proveedor OIDC temporal en PocketBase
    const usersColl = await adminPb.collections.getOne('users');
    const originalOauth2Config = JSON.parse(JSON.stringify(usersColl.oauth2 || {}));

    const testOauth2Config = {
        enabled: true,
        mappedFields: {
            id: '',
            name: 'name',
            username: '',
            avatarURL: 'avatar',
        },
        providers: [
            {
                name: 'oidc',
                clientId: 'test-client-id',
                clientSecret: 'test-client-secret',
                authURL: `http://localhost:${MOCK_OIDC_PORT}/auth`,
                tokenURL: `http://host.docker.internal:${MOCK_OIDC_PORT}/token`,
                userInfoURL: `http://host.docker.internal:${MOCK_OIDC_PORT}/userinfo`,
                displayName: 'Mock OIDC',
                extra: {},
            },
        ],
    };

    await adminPb.collections.update('users', { oauth2: testOauth2Config });
    console.log('⚙️ Proveedor OIDC de prueba configurado en PocketBase.');

    // Helper para limpiar usuarios de prueba existentes
    async function cleanupTestUser(email) {
        try {
            const existing = await adminPb.collection('users').getFirstListItem(`email = "${email}"`);
            if (existing) {
                // Eliminar external auths asociadas si existen
                try {
                    const extAuths = await adminPb.collection('users').listExternalAuths(existing.id);
                    for (const ext of extAuths) {
                        await adminPb.collection('users').unlinkExternalAuth(existing.id, ext.provider);
                    }
                } catch {}
                await adminPb.collection('users').delete(existing.id);
            }
        } catch {}
    }

    const testEmailUnauthorized = 'desconocido.oauth@gmail.com';
    const testEmailInactive = 'socio.bloqueado@gmail.com';
    const testEmailActive = 'socio.autorizado@gmail.com';

    await cleanupTestUser(testEmailUnauthorized);
    await cleanupTestUser(testEmailInactive);
    await cleanupTestUser(testEmailActive);

    // Crear fixture: socio inactivo
    const inactiveUser = await adminPb.collection('users').create({
        email: testEmailInactive,
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        role: 'partner',
        active: false,
        name: 'Socio Desactivado',
        emailVisibility: true,
    });
    console.log(`👤 Usuario inactivo creado: ${inactiveUser.email} (id: ${inactiveUser.id})`);

    // Crear fixture: socio activo
    const activeUser = await adminPb.collection('users').create({
        email: testEmailActive,
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        role: 'partner',
        active: true,
        name: '', // Intencionadamente vacío para verificar sincronización de nombre
        emailVisibility: true,
    });
    console.log(`👤 Usuario activo creado: ${activeUser.email} (id: ${activeUser.id})`);

    let passedTests = 0;
    let failedTests = 0;

    // --- TEST 1: Intento con cuenta Google no autorizada ---
    try {
        console.log('\n🧪 [TEST 1] Verificando rechazo de cuenta NO invitada...');
        currentMockUser = {
            sub: 'google-sub-unauthorized',
            email: testEmailUnauthorized,
            name: 'Intruso Desconocido',
            email_verified: true,
        };

        const clientPb = new PocketBase(PB_URL);
        let errorCaught = null;
        try {
            await clientPb.collection('users').authWithOAuth2Code(
                'oidc',
                'mock_code_1',
                'mock_verifier_1',
                'http://localhost:8090/api/oauth2-redirect'
            );
        } catch (err) {
            errorCaught = err;
        }

        assert(errorCaught !== null, 'Se esperaba un error 403 pero la petición tuvo éxito');
        assert.strictEqual(errorCaught.status, 403, `Status code esperado: 403, obtenido: ${errorCaught.status}`);
        assert(
            errorCaught.message.includes('no ha sido invitado ni autorizado'),
            `Mensaje inesperado: ${errorCaught.message}`
        );

        // Verificar que no se creó ningún registro nuevo en la base de datos
        let userCreated = null;
        try {
            userCreated = await adminPb.collection('users').getFirstListItem(`email = "${testEmailUnauthorized}"`);
        } catch {}
        assert.strictEqual(userCreated, null, 'No debe crearse ningún registro de usuario en la base de datos');

        console.log('✅ [TEST 1] ÉXITO: Intento no autorizado rechazado con HTTP 403 Forbidden y mensaje de lista blanca.');
        passedTests++;
    } catch (err) {
        console.error('❌ [TEST 1] FALLÓ:', err);
        failedTests++;
    }

    // --- TEST 2: Intento con cuenta autorizada pero deshabilitada (active = false) ---
    try {
        console.log('\n🧪 [TEST 2] Verificando rechazo de cuenta desactivada (active = false)...');
        currentMockUser = {
            sub: 'google-sub-inactive',
            email: testEmailInactive,
            name: 'Socio Desactivado',
            email_verified: true,
        };

        const clientPb = new PocketBase(PB_URL);
        let errorCaught = null;
        try {
            await clientPb.collection('users').authWithOAuth2Code(
                'oidc',
                'mock_code_2',
                'mock_verifier_2',
                'http://localhost:8090/api/oauth2-redirect'
            );
        } catch (err) {
            errorCaught = err;
        }

        assert(errorCaught !== null, 'Se esperaba un error 403 pero la petición tuvo éxito');
        assert.strictEqual(errorCaught.status, 403, `Status code esperado: 403, obtenido: ${errorCaught.status}`);
        assert(
            errorCaught.message.includes('desactivada temporalmente'),
            `Mensaje inesperado: ${errorCaught.message}`
        );

        console.log('✅ [TEST 2] ÉXITO: Cuenta desactivada rechazada con HTTP 403 Forbidden.');
        passedTests++;
    } catch (err) {
        console.error('❌ [TEST 2] FALLÓ:', err);
        failedTests++;
    }

    // --- TEST 3: Acceso legítimo de usuario activo pre-autorizado ---
    try {
        console.log('\n🧪 [TEST 3] Verificando login exitoso de usuario activo pre-autorizado...');
        currentMockUser = {
            sub: 'google-sub-active-123',
            email: testEmailActive,
            name: 'Socio Juan Pérez',
            email_verified: true,
        };

        const clientPb = new PocketBase(PB_URL);
        const authData = await clientPb.collection('users').authWithOAuth2Code(
            'oidc',
            'mock_code_3',
            'mock_verifier_3',
            'http://localhost:8090/api/oauth2-redirect'
        );

        assert(authData.token, 'Se debe recibir un token JWT de sesión');
        assert.strictEqual(authData.record.id, activeUser.id, 'El ID autenticado debe coincidir con el usuario pre-creado');
        assert.strictEqual(authData.record.email, testEmailActive, 'El correo debe coincidir');
        assert.strictEqual(authData.record.role, 'partner', 'El rol pre-asignado debe preservarse');

        // Comprobar que el nombre se sincronizó desde el perfil OAuth
        const updatedUser = await adminPb.collection('users').getOne(activeUser.id);
        assert.strictEqual(updatedUser.name, 'Socio Juan Pérez', 'El nombre del usuario debe actualizarse desde el perfil OAuth');

        console.log('✅ [TEST 3] ÉXITO: Usuario autenticado correctamente, cuenta vinculada y perfil actualizado.');
        passedTests++;
    } catch (err) {
        console.error('❌ [TEST 3] FALLÓ:', err);
        failedTests++;
    }

    // --- TEARDOWN / LIMPIEZA ---
    console.log('\n🧹 Limpiando fixtures de prueba y restaurando configuración original...');
    await cleanupTestUser(testEmailUnauthorized);
    await cleanupTestUser(testEmailInactive);
    await cleanupTestUser(testEmailActive);
    await adminPb.collections.update('users', { oauth2: originalOauth2Config });

    await new Promise((resolve) => mockServer.close(resolve));
    console.log('🏁 Servidor mock cerrado y configuración restaurada.');

    console.log(`\n========================================`);
    console.log(`Resultados de pruebas: ${passedTests} superadas, ${failedTests} fallidas`);
    console.log(`========================================\n`);

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('💥 Error fatal en el ejecutor de pruebas:', err);
    process.exit(1);
});
