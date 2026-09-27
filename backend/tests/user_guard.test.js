import assert from 'node:assert';
import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const SUPERUSER_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@reydelarrecife.local';
const SUPERUSER_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'ReyDelArrecife2026!';

const TEST_ADMIN_EMAIL = 'test.admin.userguard@reydelarrecife.local';
const TEST_PARTNER_EMAIL = 'test.partner.userguard@reydelarrecife.local';
const TEST_TARGET_EMAIL = 'test.target.userguard@reydelarrecife.local';
const TEST_PASSWORD = 'TestPassword2026!';

async function runTests() {
    console.log('🚀 Iniciando suite de pruebas para user_guard.pb.js y reglas de seguridad de users...');

    const superPb = new PocketBase(PB_URL);
    await superPb.collection('_superusers').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD);
    console.log('🔑 Superuser autenticado.');

    async function cleanupUser(email) {
        try {
            const existing = await superPb.collection('users').getFirstListItem(`email = "${email}"`);
            if (existing) {
                await superPb.collection('users').delete(existing.id);
            }
        } catch (e) {
            // Ignorar si no existe
        }
    }

    // Limpieza previa
    await cleanupUser(TEST_ADMIN_EMAIL);
    await cleanupUser(TEST_PARTNER_EMAIL);
    await cleanupUser(TEST_TARGET_EMAIL);
    await cleanupUser('admin.spawn@reydelarrecife.local');
    await cleanupUser('anon.created@reydelarrecife.local');

    // 1. Crear usuarios de prueba base
    const adminRecord = await superPb.collection('users').create({
        email: TEST_ADMIN_EMAIL,
        password: TEST_PASSWORD,
        passwordConfirm: TEST_PASSWORD,
        role: 'admin',
        active: true,
        name: 'Admin Test User',
    });

    const partnerRecord = await superPb.collection('users').create({
        email: TEST_PARTNER_EMAIL,
        password: TEST_PASSWORD,
        passwordConfirm: TEST_PASSWORD,
        role: 'partner',
        active: true,
        name: 'Partner Test User',
    });

    const targetRecord = await superPb.collection('users').create({
        email: TEST_TARGET_EMAIL,
        password: TEST_PASSWORD,
        passwordConfirm: TEST_PASSWORD,
        role: 'partner',
        active: true,
        name: 'Target Test User',
    });

    // Clientes PocketBase autenticados
    const adminPb = new PocketBase(PB_URL);
    await adminPb.collection('users').authWithPassword(TEST_ADMIN_EMAIL, TEST_PASSWORD);

    const partnerPb = new PocketBase(PB_URL);
    await partnerPb.collection('users').authWithPassword(TEST_PARTNER_EMAIL, TEST_PASSWORD);

    const anonPb = new PocketBase(PB_URL);

    let passedTests = 0;

    async function test(description, fn) {
        console.log(`\n🧪 [TEST] ${description}`);
        try {
            await fn();
            console.log(`✅ [OK] ${description}`);
            passedTests++;
        } catch (error) {
            console.error(`❌ [FAIL] ${description}`);
            console.error(error);
            process.exit(1);
        }
    }

    // TEST 1: Registro anónimo prohibido (CRÍTICO-01)
    await test('Usuario anónimo NO puede auto-registrarse en la colección users', async () => {
        let rejected = false;
        try {
            await anonPb.collection('users').create({
                email: 'anon.created@reydelarrecife.local',
                password: TEST_PASSWORD,
                passwordConfirm: TEST_PASSWORD,
                role: 'admin',
                active: true,
            });
        } catch (err) {
            rejected = true;
            assert.ok(err.status === 400 || err.status === 403 || err.status === 404);
        }
        assert.ok(rejected, 'El registro anónimo debió haber sido rechazado.');
    });

    // TEST 2: Partner NO puede crear nuevos usuarios
    await test('Partner NO puede dar de alta nuevos usuarios', async () => {
        let rejected = false;
        try {
            await partnerPb.collection('users').create({
                email: 'partner.spawn@reydelarrecife.local',
                password: TEST_PASSWORD,
                passwordConfirm: TEST_PASSWORD,
                role: 'partner',
                active: true,
            });
        } catch (err) {
            rejected = true;
            assert.ok(err.status === 400 || err.status === 403);
        }
        assert.ok(rejected, 'El alta de usuarios por parte de un socio debió ser rechazada.');
    });

    // TEST 3: Admin SÍ puede crear nuevos usuarios
    await test('Admin SÍ puede crear nuevos usuarios', async () => {
        let spawnedId = null;
        try {
            const newUser = await adminPb.collection('users').create({
                email: 'admin.spawn@reydelarrecife.local',
                password: TEST_PASSWORD,
                passwordConfirm: TEST_PASSWORD,
                role: 'partner',
                active: true,
                name: 'Spawned User',
            });
            spawnedId = newUser.id;
            assert.ok(newUser.id, 'Debe devolver un id válido para el nuevo usuario');
            assert.strictEqual(newUser.name, 'Spawned User');
        } finally {
            if (spawnedId) {
                await superPb.collection('users').delete(spawnedId);
            }
        }
    });

    // TEST 4: Partner NO puede modificar a otro usuario
    await test('Partner NO puede modificar a otro usuario', async () => {
        let rejected = false;
        try {
            await partnerPb.collection('users').update(targetRecord.id, {
                name: 'Hacked Name',
            });
        } catch (err) {
            rejected = true;
            assert.ok(err.status === 400 || err.status === 403 || err.status === 404);
        }
        assert.ok(rejected, 'El intento de modificar otro usuario debió ser bloqueado.');
    });

    // TEST 5: Partner SÍ puede actualizar su propio nombre
    await test('Partner SÍ puede modificar su propio nombre', async () => {
        const updated = await partnerPb.collection('users').update(partnerRecord.id, {
            name: 'Partner Updated Name',
        });
        assert.strictEqual(updated.name, 'Partner Updated Name');
    });

    // TEST 6: Partner NO puede auto-elevarse a admin (CRÍTICO-02)
    await test('Partner NO puede auto-elevar su propio rol a admin', async () => {
        let rejected = false;
        try {
            await partnerPb.collection('users').update(partnerRecord.id, {
                role: 'admin',
            });
        } catch (err) {
            rejected = true;
            assert.ok(err.status === 400 || err.status === 403);
        }
        assert.ok(rejected, 'El intento de auto-escalada de privilegios a admin debió fallar.');

        // Verificar que en base de datos sigue siendo partner
        const fresh = await superPb.collection('users').getOne(partnerRecord.id);
        assert.strictEqual(fresh.role, 'partner');
    });

    // TEST 7: Partner NO puede modificar su propio estado active
    await test('Partner NO puede alterar su propio campo active', async () => {
        let rejected = false;
        try {
            await partnerPb.collection('users').update(partnerRecord.id, {
                active: false,
            });
        } catch (err) {
            rejected = true;
            assert.ok(err.status === 400 || err.status === 403);
        }
        assert.ok(rejected, 'El intento de alterar el estado active debió ser rechazado.');
    });

    // TEST 8: Partner NO puede eliminar usuarios
    await test('Partner NO puede eliminar usuarios', async () => {
        let rejected = false;
        try {
            await partnerPb.collection('users').delete(targetRecord.id);
        } catch (err) {
            rejected = true;
            assert.ok(err.status === 400 || err.status === 403 || err.status === 404);
        }
        assert.ok(rejected, 'El borrado por parte de partner debió fallar.');
    });

    // TEST 9: Admin SÍ puede listar todos los usuarios (CRÍTICO-03)
    await test('Admin SÍ puede listar a los demás usuarios (listRule para admin)', async () => {
        const list = await adminPb.collection('users').getFullList();
        assert.ok(list.length >= 3, `Admin debería ver al menos 3 usuarios, vio ${list.length}`);
    });

    // TEST 10: Partner solo puede verse a sí mismo al listar
    await test('Partner solo ve su propio usuario en listRule', async () => {
        const list = await partnerPb.collection('users').getFullList();
        assert.strictEqual(list.length, 1, 'Partner solo debe ver su propio usuario');
        assert.strictEqual(list[0].id, partnerRecord.id);
    });

    // TEST 11: Admin SÍ puede modificar rol y estado de otro usuario
    await test('Admin SÍ puede cambiar el rol y active de otro usuario', async () => {
        const updated = await adminPb.collection('users').update(targetRecord.id, {
            role: 'admin',
            active: false,
        });
        assert.strictEqual(updated.role, 'admin');
        assert.strictEqual(updated.active, false);
    });

    // TEST 12: Admin SÍ puede eliminar usuarios
    await test('Admin SÍ puede eliminar un usuario', async () => {
        await adminPb.collection('users').delete(targetRecord.id);
        let exists = true;
        try {
            await superPb.collection('users').getOne(targetRecord.id);
        } catch (e) {
            exists = false;
        }
        assert.strictEqual(exists, false, 'El usuario debió quedar eliminado.');
    });

    // Limpieza final
    console.log('\n🧹 Limpiando fixtures de prueba...');
    await cleanupUser(TEST_ADMIN_EMAIL);
    await cleanupUser(TEST_PARTNER_EMAIL);
    await cleanupUser(TEST_TARGET_EMAIL);
    console.log('✅ Fixtures limpiadas.');

    console.log('\n========================================');
    console.log(`Resultados de pruebas: ${passedTests} superadas, 0 fallidas`);
    console.log('========================================\n');
}

runTests().catch((err) => {
    console.error('❌ Error ejecutando pruebas:', err);
    process.exit(1);
});
