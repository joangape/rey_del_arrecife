import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@reydelarrecife.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'ReyDelArrecife2026!';

const pb = new PocketBase(PB_URL);

async function updateSecurityRules() {
    console.log(`🔌 Conectando a PocketBase en ${PB_URL}...`);
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('🔑 Superuser autenticado.');

    // 1. Actualizar colección users
    const usersColl = await pb.collections.getOne('users');
    console.log('📋 Reglas actuales de users:', {
        createRule: usersColl.createRule,
        listRule: usersColl.listRule,
        viewRule: usersColl.viewRule,
        updateRule: usersColl.updateRule,
        deleteRule: usersColl.deleteRule,
    });

    usersColl.createRule = '@request.auth.role = "admin"';
    usersColl.listRule = '@request.auth.role = "admin" || id = @request.auth.id';
    usersColl.viewRule = '@request.auth.role = "admin" || id = @request.auth.id';
    usersColl.updateRule = '@request.auth.role = "admin" || id = @request.auth.id';
    usersColl.deleteRule = '@request.auth.role = "admin"';

    await pb.collections.update('users', usersColl);
    console.log('✅ Reglas de seguridad aplicadas con éxito a la colección `users`!');

    // 2. Verificar índices de rendimiento en inventario y gastos si existen
    const inv = await pb.collections.getOne('inventario').catch(() => null);
    if (inv) {
        let invIndexes = inv.indexes || [];
        const requiredInvIndexes = [
            'CREATE UNIQUE INDEX idx_inventario_ref ON inventario (ref)',
            'CREATE INDEX idx_inventario_estado ON inventario (estado)',
            'CREATE INDEX idx_inventario_origen ON inventario (origen)',
            'CREATE INDEX idx_inventario_fecha_compra ON inventario (fecha_compra)',
        ];
        let invMod = false;
        for (const idx of requiredInvIndexes) {
            const idxName = idx.split(' ')[2];
            if (!invIndexes.some(existing => existing.includes(idxName))) {
                invIndexes.push(idx);
                invMod = true;
            }
        }
        if (invMod) {
            inv.indexes = invIndexes;
            await pb.collections.update('inventario', inv);
            console.log('✅ Índices secundarios añadidos a la colección `inventario`.');
        }
    }

    const gastos = await pb.collections.getOne('gastos_extra').catch(() => null);
    if (gastos) {
        let gastosIndexes = gastos.indexes || [];
        const requiredGastosIndexes = [
            'CREATE INDEX idx_gastos_pieza ON gastos_extra (pieza)',
            'CREATE INDEX idx_gastos_ref_pieza ON gastos_extra (ref_pieza)',
        ];
        let gastosMod = false;
        for (const idx of requiredGastosIndexes) {
            const idxName = idx.split(' ')[2];
            if (!gastosIndexes.some(existing => existing.includes(idxName))) {
                gastosIndexes.push(idx);
                gastosMod = true;
            }
        }
        if (gastosMod) {
            gastos.indexes = gastosIndexes;
            await pb.collections.update('gastos_extra', gastos);
            console.log('✅ Índices secundarios añadidos a la colección `gastos_extra`.');
        }
    }
}

updateSecurityRules().catch((err) => {
    console.error('❌ Error aplicando reglas de seguridad:', JSON.stringify(err.response, null, 2));
    process.exit(1);
});
