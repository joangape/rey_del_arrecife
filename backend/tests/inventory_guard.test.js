import assert from 'node:assert';
import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const SUPERUSER_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@reydelarrecife.local';
const SUPERUSER_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'ReyDelArrecife2026!';

const TEST_ADMIN_EMAIL = 'test.admin.guard@reydelarrecife.local';
const TEST_PARTNER_EMAIL = 'test.partner.guard@reydelarrecife.local';
const TEST_USER_PASSWORD = 'TestPassword2026!';
const TEST_REF = 99999;

async function runTests() {
    console.log('🚀 Iniciando suite de pruebas para inventory_guard.pb.js...');

    const superPb = new PocketBase(PB_URL);
    await superPb.collection('_superusers').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD);
    console.log('🔑 Superuser autenticado.');

    // Helper para limpiar usuario si existe
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

    // Helper para limpiar pieza de prueba si existe
    async function cleanupInventoryItem(ref) {
        try {
            const existing = await superPb.collection('inventario').getFirstListItem(`ref = ${ref}`);
            if (existing) {
                await superPb.collection('inventario').delete(existing.id);
            }
        } catch (e) {
            // Ignorar si no existe
        }
    }

    // Limpieza inicial previa
    await cleanupUser(TEST_ADMIN_EMAIL);
    await cleanupUser(TEST_PARTNER_EMAIL);
    await cleanupInventoryItem(TEST_REF);
    await cleanupInventoryItem(99998);

    // 1. Crear usuarios de prueba
    console.log('👤 Creando usuarios de prueba: admin y partner...');
    const adminUser = await superPb.collection('users').create({
        email: TEST_ADMIN_EMAIL,
        password: TEST_USER_PASSWORD,
        passwordConfirm: TEST_USER_PASSWORD,
        role: 'admin',
        active: true,
        name: 'Admin Test Guard',
    });

    const partnerUser = await superPb.collection('users').create({
        email: TEST_PARTNER_EMAIL,
        password: TEST_USER_PASSWORD,
        passwordConfirm: TEST_USER_PASSWORD,
        role: 'partner',
        active: true,
        name: 'Partner Test Guard',
    });

    // 2. Crear pieza de inventario base para las pruebas
    console.log('📦 Creando pieza de inventario de prueba (ref: 99999)...');
    const testItem = await superPb.collection('inventario').create({
        ref: TEST_REF,
        descripcion: 'Collar de zafiros y diamantes de prueba',
        origen: 'Londres',
        fecha_compra: '2023-01-15 00:00:00.000Z',
        costo: 350,
        gastos_total: 50,
        a_pagar: 150,
        pvp: 600,
        fecha_venta: '',
        fecha_pagado: '',
        estado: 'Disponible',
        foto_url: 'https://photos.app.goo.gl/test-collar',
        fotos: [],
        comentarios: 'Pieza para tests de seguridad',
    });

    // 3. Crear instancias de PocketBase para cada rol
    const adminPb = new PocketBase(PB_URL);
    await adminPb.collection('users').authWithPassword(TEST_ADMIN_EMAIL, TEST_USER_PASSWORD);

    const partnerPb = new PocketBase(PB_URL);
    await partnerPb.collection('users').authWithPassword(TEST_PARTNER_EMAIL, TEST_USER_PASSWORD);

    const anonPb = new PocketBase(PB_URL);

    let passedCount = 0;
    let failedCount = 0;

    async function test(name, fn) {
        try {
            console.log(`\n🧪 [TEST] ${name}`);
            await fn();
            console.log(`✅ [OK] ${name}`);
            passedCount++;
        } catch (err) {
            console.error(`❌ [FALLO] ${name}`);
            console.error('   Error:', err.message || err);
            failedCount++;
        }
    }

    // -------------------------------------------------------------
    // PRUEBAS DE ADMIN
    // -------------------------------------------------------------
    await test('Admin puede modificar campos protegidos (costo, origen, ref)', async () => {
        const updated = await adminPb.collection('inventario').update(testItem.id, {
            costo: 400,
            origen: 'París',
            pvp: 800,
        });
        assert.strictEqual(updated.costo, 400);
        assert.strictEqual(updated.origen, 'París');
        assert.strictEqual(updated.pvp, 800);
    });

    await test('Admin puede crear y eliminar piezas de inventario', async () => {
        const created = await adminPb.collection('inventario').create({
            ref: 99998,
            descripcion: 'Pieza temporal admin',
            costo: 100,
        });
        assert.strictEqual(created.ref, 99998);

        await adminPb.collection('inventario').delete(created.id);
        const check = await superPb.collection('inventario').getList(1, 1, { filter: 'ref = 99998' });
        assert.strictEqual(check.totalItems, 0);
    });

    await test('Admin puede subir y gestionar archivos locales en el campo "fotos"', async () => {
        const form = new FormData();
        const dummyBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
        form.append('fotos', new Blob([dummyBuffer], { type: 'image/jpeg' }), 'test_pieza.jpg');

        const updated = await adminPb.collection('inventario').update(testItem.id, form);
        assert.ok(Array.isArray(updated.fotos) && updated.fotos.length > 0, 'Se esperaba al menos un archivo en fotos');
    });

    // -------------------------------------------------------------
    // PRUEBAS DE PARTNER - OPERACIONES PERMITIDAS
    // -------------------------------------------------------------
    await test('Partner puede modificar campos comerciales autorizados (pvp, a_pagar, estado, comentarios, fechas)', async () => {
        const updated = await partnerPb.collection('inventario').update(testItem.id, {
            pvp: 850,
            a_pagar: 200,
            estado: 'Reservado',
            comentarios: 'Cliente interesado en tienda',
            fecha_venta: '2026-09-27',
            fecha_pagado: '2026-09-28',
        });
        assert.strictEqual(updated.pvp, 850);
        assert.strictEqual(updated.a_pagar, 200);
        assert.strictEqual(updated.estado, 'Reservado');
        assert.strictEqual(updated.comentarios, 'Cliente interesado en tienda');
        assert.strictEqual(updated.fecha_venta, '2026-09-27');
        assert.strictEqual(updated.fecha_pagado, '2026-09-28');
    });

    await test('Partner puede enviar datos protegidos si su valor es IDÉNTICO al de la base de datos (no alteración)', async () => {
        // Enviar costo y origen con los mismos valores ya existentes
        const updated = await partnerPb.collection('inventario').update(testItem.id, {
            pvp: 900,
            costo: 400,
            origen: 'París',
        });
        assert.strictEqual(updated.pvp, 900);
        assert.strictEqual(updated.costo, 400);
    });

    await test('Partner actualiza campos comerciales manteniendo fotos locales intactas', async () => {
        const itemBefore = await superPb.collection('inventario').getOne(testItem.id);
        const originalFotos = [...(itemBefore.fotos || [])];

        const updated = await partnerPb.collection('inventario').update(testItem.id, {
            pvp: 920,
            comentarios: 'Comentario comercial de socio preservando fotos',
        });
        assert.strictEqual(updated.pvp, 920);
        assert.deepStrictEqual(updated.fotos, originalFotos);
    });

    // -------------------------------------------------------------
    // PRUEBAS DE PARTNER - INTENTOS DE ALTERACIÓN DE CAMPOS PROTEGIDOS (DEBEN FALLAR CON 403)
    // -------------------------------------------------------------
    await test('Partner NO puede alterar el campo "costo"', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').update(testItem.id, { costo: 50 });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba un error al intentar modificar costo');
        assert.strictEqual(errorCaught.status, 403, `Se esperaba HTTP 403, recibido: ${errorCaught?.status}`);
        assert.ok(
            errorCaught.message.includes('costo'),
            `El mensaje debe especificar el campo: ${errorCaught.message}`
        );

        // Verificar que no mutó en base de datos
        const current = await superPb.collection('inventario').getOne(testItem.id);
        assert.strictEqual(current.costo, 400);
    });

    await test('Partner NO puede alterar el campo "ref"', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').update(testItem.id, { ref: 12345 });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba un error al intentar modificar ref');
        assert.strictEqual(errorCaught.status, 403);
        assert.ok(errorCaught.message.includes('ref'));

        const current = await superPb.collection('inventario').getOne(testItem.id);
        assert.strictEqual(current.ref, TEST_REF);
    });

    await test('Partner NO puede alterar el campo "fecha_compra"', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').update(testItem.id, {
                fecha_compra: '2025-05-20 00:00:00.000Z',
            });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba un error al intentar modificar fecha_compra');
        assert.strictEqual(errorCaught.status, 403);
        assert.ok(errorCaught.message.includes('fecha_compra'));
    });

    await test('Partner NO puede alterar el campo "origen"', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').update(testItem.id, { origen: 'Madrid' });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba un error al intentar modificar origen');
        assert.strictEqual(errorCaught.status, 403);
        assert.ok(errorCaught.message.includes('origen'));
    });

    await test('Partner NO puede alterar el campo "descripcion"', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').update(testItem.id, { descripcion: 'Manipulado' });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba un error al intentar modificar descripcion');
        assert.strictEqual(errorCaught.status, 403);
        assert.ok(errorCaught.message.includes('descripcion'));
    });

    await test('Partner NO puede alterar el campo "gastos_total"', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').update(testItem.id, { gastos_total: 999 });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba un error al intentar modificar gastos_total');
        assert.strictEqual(errorCaught.status, 403);
        assert.ok(errorCaught.message.includes('gastos_total'));
    });

    await test('Partner NO puede alterar el campo "foto_url"', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').update(testItem.id, {
                foto_url: 'https://photos.app.goo.gl/hacked',
            });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba un error al intentar modificar foto_url');
        assert.strictEqual(errorCaught.status, 403);
        assert.ok(errorCaught.message.includes('foto_url'));
    });

    await test('Partner NO puede alterar el campo "fotos"', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').update(testItem.id, {
                fotos: ['hack_foto.jpg'],
            });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba un error al intentar modificar fotos');
        assert.strictEqual(errorCaught.status, 403);
        assert.ok(errorCaught.message.includes('fotos'));
    });

    await test('Partner NO puede dar de alta nuevas piezas (Create bloqueado)', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').create({
                ref: 99998,
                descripcion: 'Intento de alta partner',
                costo: 200,
            });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba rechazo al intentar crear pieza');
        assert.ok(
            errorCaught.status === 400 || errorCaught.status === 403,
            `Se esperaba 400 o 403, recibido: ${errorCaught?.status}`
        );
    });

    await test('Partner NO puede eliminar piezas (Delete bloqueado)', async () => {
        let errorCaught = null;
        try {
            await partnerPb.collection('inventario').delete(testItem.id);
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba rechazo al intentar eliminar pieza');
        assert.ok(
            errorCaught.status === 400 || errorCaught.status === 403 || errorCaught.status === 404,
            `Se esperaba 400, 403 o 404 (PocketBase regla de borrado), recibido: ${errorCaught?.status}`
        );
    });

    // -------------------------------------------------------------
    // PRUEBAS DE USUARIO NO AUTENTICADO
    // -------------------------------------------------------------
    await test('Usuario no autenticado NO puede actualizar piezas de inventario', async () => {
        let errorCaught = null;
        try {
            await anonPb.collection('inventario').update(testItem.id, { pvp: 1000 });
        } catch (err) {
            errorCaught = err;
        }
        assert.ok(errorCaught, 'Se esperaba rechazo para petición no autenticada');
        assert.ok(
            errorCaught.status === 400 || errorCaught.status === 401 || errorCaught.status === 403 || errorCaught.status === 404,
            `Se esperaba 401, 403 o 404, recibido: ${errorCaught?.status}`
        );
    });

    // -------------------------------------------------------------
    // LIMPIEZA FINAL DE FIXTURES
    // -------------------------------------------------------------
    console.log('\n🧹 Limpiando fixtures de prueba...');
    await cleanupInventoryItem(TEST_REF);
    await cleanupInventoryItem(99998);
    await cleanupUser(TEST_ADMIN_EMAIL);
    await cleanupUser(TEST_PARTNER_EMAIL);
    console.log('✅ Fixtures limpiadas.');

    console.log('\n========================================');
    console.log(`Resultados de pruebas: ${passedCount} superadas, ${failedCount} fallidas`);
    console.log('========================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('💥 Error inesperado durante la ejecución:', err);
    process.exit(1);
});
