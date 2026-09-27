import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@reydelarrecife.local';

if (process.env.NODE_ENV === 'production' && !process.env.PB_ADMIN_PASSWORD) {
    console.error('❌ ERROR FATAL DE SEGURIDAD: La variable PB_ADMIN_PASSWORD es obligatoria en entornos de producción.');
    process.exit(1);
}

const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'ReyDelArrecife2026!';

const pb = new PocketBase(PB_URL);

// Helper para limpiar importes monetarios (ej: "700€", "40.00€", "4 € botón ")
function parseCurrency(val) {
    if (!val) return 0;
    const cleaned = String(val)
        .replace(/€/g, '')
        .replace(/\s+/g, '')
        .replace(/,/g, '.')
        .replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

// Helper para formatear fechas de DD/MM/AAAA a YYYY-MM-DD
function parseDate(val) {
    if (!val) return null;
    const str = String(val).trim();
    const parts = str.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2].trim();
        if (year.length === 2) {
            year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
        }
        if (year.length === 4) {
            return `${year}-${month}-${day} 00:00:00.000Z`;
        }
    }
    return null;
}

async function ensureSchema() {
    console.log('🛠️ Verificando y configurando esquemas en PocketBase...');

    // 1. users: role y active
    const usersColl = await pb.collections.getOne('users');
    const existingUserFields = usersColl.fields.map(f => f.name);
    let usersModified = false;
    if (!existingUserFields.includes('role')) {
        usersColl.fields.push({
            name: 'role',
            type: 'select',
            maxSelect: 1,
            values: ['admin', 'partner'],
            required: false,
        });
        usersModified = true;
    }
    if (!existingUserFields.includes('active')) {
        usersColl.fields.push({
            name: 'active',
            type: 'bool',
            required: false,
        });
        usersModified = true;
    }
    const targetCreateRule = '@request.auth.role = "admin"';
    const targetListRule = '@request.auth.role = "admin" || id = @request.auth.id';
    const targetViewRule = '@request.auth.role = "admin" || id = @request.auth.id';
    const targetUpdateRule = '@request.auth.role = "admin" || id = @request.auth.id';
    const targetDeleteRule = '@request.auth.role = "admin"';

    if (usersColl.createRule !== targetCreateRule ||
        usersColl.listRule !== targetListRule ||
        usersColl.viewRule !== targetViewRule ||
        usersColl.updateRule !== targetUpdateRule ||
        usersColl.deleteRule !== targetDeleteRule) {
        usersColl.createRule = targetCreateRule;
        usersColl.listRule = targetListRule;
        usersColl.viewRule = targetViewRule;
        usersColl.updateRule = targetUpdateRule;
        usersColl.deleteRule = targetDeleteRule;
        usersModified = true;
    }

    if (usersModified) {
        await pb.collections.update('users', usersColl);
        console.log('✅ Colección `users` actualizada con campos role, active y reglas de acceso seguras.');
    }

    // 2. inventario
    let inv = await pb.collections.getOne('inventario').catch(() => null);
    if (!inv) {
        inv = await pb.collections.create({
            name: 'inventario',
            type: 'base',
            fields: [
                { name: 'ref', type: 'number', required: true },
                { name: 'descripcion', type: 'text', required: false },
                { name: 'origen', type: 'text', required: false },
                { name: 'fecha_compra', type: 'date', required: false },
                { name: 'costo', type: 'number', required: false },
                { name: 'gastos_total', type: 'number', required: false },
                { name: 'a_pagar', type: 'number', required: false },
                { name: 'pvp', type: 'number', required: false },
                { name: 'fecha_venta', type: 'text', required: false },
                { name: 'fecha_pagado', type: 'text', required: false },
                { name: 'estado', type: 'text', required: false },
                { name: 'foto_url', type: 'url', required: false },
                { name: 'fotos', type: 'file', maxSelect: 10, required: false },
                { name: 'comentarios', type: 'text', required: false },
            ],
            indexes: ['CREATE UNIQUE INDEX idx_inventario_ref ON inventario (ref)'],
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.role = "admin"',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.role = "admin"',
        });
        console.log('✅ Colección `inventario` creada.');
    }

    // 3. gastos_extra
    let gastos = await pb.collections.getOne('gastos_extra').catch(() => null);
    if (!gastos) {
        gastos = await pb.collections.create({
            name: 'gastos_extra',
            type: 'base',
            fields: [
                { name: 'ref_pieza', type: 'number', required: false },
                {
                    name: 'pieza',
                    type: 'relation',
                    collectionId: inv.id,
                    cascadeDelete: false,
                    maxSelect: 1,
                    required: false,
                },
                { name: 'fecha_gasto', type: 'date', required: false },
                { name: 'fecha_pago', type: 'date', required: false },
                { name: 'descripcion', type: 'text', required: false },
                { name: 'importe', type: 'number', required: false },
                { name: 'comentarios', type: 'text', required: false },
            ],
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.role = "admin"',
        });
        console.log('✅ Colección `gastos_extra` creada.');
    }
}

async function main() {
    console.log(`🔌 Conectando a PocketBase en ${PB_URL}...`);

    try {
        // En PocketBase v0.23+ y v0.40+, los administradores son superusers en `_superusers`
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log(`✅ Autenticado como Superuser (${ADMIN_EMAIL}).`);
    } catch (err) {
        console.log('⚠️ No se pudo autenticar como superuser existente. Intentando registrar superuser inicial...');
        try {
            await pb.collection('_superusers').create({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                passwordConfirm: ADMIN_PASSWORD,
            });
            await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
            console.log(`✅ Primer superuser creado exitosamente (${ADMIN_EMAIL}).`);
        } catch (createErr) {
            console.error('❌ Error de autenticación en PocketBase:', createErr.message);
            console.log('\n💡 Si es la primera vez, puedes crear el superuser ejecutando:');
            console.log(`docker exec -it rey-arrecife-pocketbase-dev pocketbase superuser upsert ${ADMIN_EMAIL} ${ADMIN_PASSWORD} --dir=/pb_data`);
            process.exit(1);
        }
    }

    // Asegurar colecciones y reglas
    await ensureSchema();

    // Rutas de CSV
    const rootDir = path.resolve(__dirname, '../../');
    const inventarioCsvPath = path.join(rootDir, 'Mis Corales - Rey del Arrecife sevillano SL - Inventario.csv');
    const gastosCsvPath = path.join(rootDir, 'Mis Corales - Rey del Arrecife sevillano SL - Gastos extra.csv');

    if (!fs.existsSync(inventarioCsvPath)) {
        console.error(`❌ Fichero no encontrado: ${inventarioCsvPath}`);
        process.exit(1);
    }

    console.log('📖 Leyendo fichero de Inventario...');
    const inventarioContent = fs.readFileSync(inventarioCsvPath, 'utf-8');
    const inventarioRows = parse(inventarioContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`📦 Procesando e importando ${inventarioRows.length} artículos del inventario...`);
    const refToRecordId = new Map();

    for (const row of inventarioRows) {
        const refNum = parseInt(row['Ref.'], 10);
        if (isNaN(refNum)) continue;

        const data = {
            ref: refNum,
            descripcion: row['Descripción'] || '',
            origen: row['Origen'] || '',
            fecha_compra: parseDate(row['F. Compra']),
            costo: parseCurrency(row['Costo']),
            gastos_total: parseCurrency(row['Gastos']),
            a_pagar: parseCurrency(row['A pagar']),
            pvp: parseCurrency(row['PVP']),
            fecha_venta: row['F. Venta'] || '',
            fecha_pagado: row['F. Pagado'] || '',
            estado: row['Estado'] || 'Disponible',
            foto_url: row['Foto'] || '',
            comentarios: row['Comentarios'] || '',
        };

        try {
            const existing = await pb.collection('inventario').getFirstListItem(`ref = ${refNum}`).catch(() => null);
            if (existing) {
                await pb.collection('inventario').update(existing.id, data);
                refToRecordId.set(refNum, existing.id);
            } else {
                const created = await pb.collection('inventario').create(data);
                refToRecordId.set(refNum, created.id);
            }
        } catch (e) {
            console.error(`⚠️ Error guardando ref ${refNum}:`, e.message);
        }
    }
    console.log(`✅ Inventario migrado: ${refToRecordId.size} piezas registradas en PocketBase.`);

    // Migrar Gastos Extra
    if (fs.existsSync(gastosCsvPath)) {
        console.log('📖 Leyendo fichero de Gastos Extra...');
        const gastosContent = fs.readFileSync(gastosCsvPath, 'utf-8');
        const gastosRows = parse(gastosContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        console.log(`💸 Procesando e importando ${gastosRows.length} gastos extra...`);
        let gastosGuardados = 0;

        for (const row of gastosRows) {
            const refPieza = parseInt(row['Ref. pieza'], 10);
            const piezaId = refToRecordId.get(refPieza) || null;

            const gastoData = {
                ref_pieza: isNaN(refPieza) ? null : refPieza,
                pieza: piezaId,
                fecha_gasto: parseDate(row['Fecha gasto']),
                fecha_pago: parseDate(row['Fecha pago']),
                descripcion: row['Descripción'] || '',
                importe: parseCurrency(row['Importe']),
                comentarios: row['Comentarios'] || '',
            };

            try {
                await pb.collection('gastos_extra').create(gastoData);
                gastosGuardados++;
            } catch (err) {
                console.error(`⚠️ Error guardando gasto para ref ${refPieza}:`, err.message);
            }
        console.log(`✅ Gastos extra migrados: ${gastosGuardados} registros procesados.`);
    }

    // Asegurar usuarios iniciales de desarrollo en la colección 'users'
    console.log('👥 Asegurando cuentas de usuario iniciales en PocketBase...');
    const defaultUsers = [
        {
            email: 'admin@reydelarrecife.local',
            password: 'Password2026!',
            name: 'Administrador Demo',
            role: 'admin',
            active: true,
        },
        {
            email: 'partner@reydelarrecife.local',
            password: 'Password2026!',
            name: 'Socio Demo',
            role: 'partner',
            active: true,
        },
    ];

    for (const u of defaultUsers) {
        try {
            const existing = await pb.collection('users').getFirstListItem(`email = "${u.email}"`);
            await pb.collection('users').update(existing.id, {
                active: u.active,
                role: u.role,
                name: existing.name || u.name,
            });
        } catch {
            await pb.collection('users').create({
                ...u,
                passwordConfirm: u.password,
                emailVisibility: true,
            });
            console.log(`✨ Usuario creado: ${u.email} (${u.role})`);
        }
    }

    console.log('🎉 Migración completada exitosamente.');
}

main().catch(err => {
    console.error('❌ Error en el proceso de seed:', err);
    process.exit(1);
});
