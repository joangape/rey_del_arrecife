import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@reydelarrecife.local';
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
        let year = parts[2];
        if (year.length === 2) {
            year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
        }
        return `${year}-${month}-${day} 00:00:00.000Z`;
    }
    return null;
}

async function main() {
    console.log(`🔌 Conectando a PocketBase en ${PB_URL}...`);

    try {
        // Intentar autenticar como admin
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Autenticado como Administrador en PocketBase.');
    } catch (err) {
        console.log('⚠️ No se pudo autenticar con credenciales existentes. Intentando crear primer admin...');
        try {
            await pb.admins.create({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                passwordConfirm: ADMIN_PASSWORD,
            });
            await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
            console.log(`✅ Primer administrador creado exitosamente (${ADMIN_EMAIL}).`);
        } catch (createErr) {
            console.error('❌ Error fatal de autenticación en PocketBase:', createErr.message);
            console.log('Por favor asegúrate de que PocketBase está corriendo (ej: `make backend-up`)');
            process.exit(1);
        }
    }

    // Ruta de los CSVs en la raíz del proyecto
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

    console.log(`📦 Procesando ${inventarioRows.length} artículos del inventario...`);
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
            // Comprobar si ya existe por ref
            const existing = await pb.collection('inventario').getFirstListItem(`ref = ${refNum}`).catch(() => null);
            if (existing) {
                await pb.collection('inventario').update(existing.id, data);
                refToRecordId.set(refNum, existing.id);
            } else {
                const created = await pb.collection('inventario').create(data);
                refToRecordId.set(refNum, created.id);
            }
        } catch (e) {
            console.error(`Error guardando ref ${refNum}:`, e.message);
        }
    }
    console.log(`✅ Inventario migrado: ${refToRecordId.size} piezas registradas.`);

    // Migrar Gastos Extra si existe el fichero
    if (fs.existsSync(gastosCsvPath)) {
        console.log('📖 Leyendo fichero de Gastos Extra...');
        const gastosContent = fs.readFileSync(gastosCsvPath, 'utf-8');
        const gastosRows = parse(gastosContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        console.log(`💸 Procesando ${gastosRows.length} gastos extra...`);
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
                console.error(`Error guardando gasto para ref ${refPieza}:`, err.message);
            }
        }
        console.log(`✅ Gastos extra migrados: ${gastosGuardados} registros procesados.`);
    }

    console.log('🎉 Migración completada con éxito.');
}

main().catch(err => {
    console.error('❌ Error en el proceso de seed:', err);
    process.exit(1);
});
