import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorios y rutas de respaldo y logs
const BACKEND_ROOT = path.resolve(__dirname, '..');
const PHOTOS_DIR = path.join(BACKEND_ROOT, 'data', 'photos');
const LOGS_DIR = path.join(BACKEND_ROOT, 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'sync_photos.log');
const FAILED_FILE = path.join(LOGS_DIR, 'sync_photos_failed.json');

// Parámetros de entorno y defaults
const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@reydelarrecife.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'ReyDelArrecife2026!';

// Parámetros de ejecución
const CONCURRENCY = parseInt(process.env.SYNC_CONCURRENCY || '2', 10);
const COURTESY_DELAY_MS = parseInt(process.env.SYNC_DELAY_MS || '300', 10);
const MAX_RETRIES = parseInt(process.env.SYNC_RETRIES || '3', 10);
const LIMIT = parseInt(process.env.SYNC_LIMIT || '0', 10);
const TIMEOUT_MS = 20000;

// Utilidades del sistema de ficheros
fs.mkdirSync(PHOTOS_DIR, { recursive: true });
fs.mkdirSync(LOGS_DIR, { recursive: true });

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function writeLog(message) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, formatted, 'utf8');
}

/**
 * Resuelve la redirección y extrae la URL de la CDN de Google en alta resolución.
 */
async function extractGooglePhotosCdnUrl(shareUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(shareUrl, {
            signal: controller.signal,
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText} resolviendo álbum`);
        }

        const html = await response.text();

        // 1. Coincidencia principal: lh3.googleusercontent.com/pw/...
        const pwMatch = html.match(/https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9_\-]+/);
        let baseUrl = pwMatch ? pwMatch[0] : null;

        // 2. Coincidencia fallback: meta og:image
        if (!baseUrl) {
            const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
            if (ogMatch && ogMatch[1]) {
                baseUrl = ogMatch[1].split('=')[0];
            }
        }

        // 3. Coincidencia fallback general: lh3.googleusercontent.com/... (excluyendo avatares /a/ y /ogw/)
        if (!baseUrl) {
            const generalMatch = html.match(/https:\/\/lh3\.googleusercontent\.com\/(?!(?:a|ogw)\/)[a-zA-Z0-9_\-]+/);
            if (generalMatch) {
                baseUrl = generalMatch[0];
            }
        }

        if (!baseUrl) {
            throw new Error('Álbum vacío, sin fotos públicas o enlace inaccesible');
        }

        // Aplicar parámetro de alta resolución (=w1600)
        return `${baseUrl.split('=')[0]}=w1600`;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Descarga el binario de la imagen desde la CDN.
 */
async function downloadImageBuffer(cdnUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(cdnUrl, {
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} al descargar imagen desde CDN`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('image')) {
            throw new Error(`Tipo de contenido no válido: ${contentType}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length === 0) {
            throw new Error('El archivo descargado está vacío (0 bytes)');
        }

        return buffer;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Descarga y extrae la imagen con reintentos y retroceso exponencial.
 */
async function fetchImageWithRetry(shareUrl, itemRef) {
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const cdnUrl = await extractGooglePhotosCdnUrl(shareUrl);
            await sleep(100);
            const buffer = await downloadImageBuffer(cdnUrl);
            return buffer;
        } catch (err) {
            lastError = err;
            const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
            writeLog(`[RETRY] Ref #${itemRef} Intento ${attempt}/${MAX_RETRIES} falló: ${err.message}. Reintentando en ${delay}ms...`);
            if (attempt < MAX_RETRIES) {
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Asegura la configuración de miniaturas en la colección `inventario`.
 */
async function ensureThumbnailsConfig(pb) {
    try {
        const coll = await pb.collections.getOne('inventario');
        const fotosField = coll.fields.find(f => f.name === 'fotos');
        if (fotosField && (!fotosField.thumbs || !fotosField.thumbs.includes('100x100'))) {
            fotosField.thumbs = ['100x100'];
            await pb.collections.update('inventario', coll);
            writeLog('Configuradas miniaturas 100x100 en colección `inventario`.');
        }
    } catch (err) {
        writeLog(`Advertencia al verificar esquema de miniaturas: ${err.message}`);
    }
}

/**
 * Función principal del motor de sincronización.
 */
async function main() {
    console.log('🚀 Iniciando motor de sincronización de fotos Google -> Local...');
    writeLog('=== INICIO DE SINCRONIZACIÓN DE FOTOS ===');

    const pb = new PocketBase(PB_URL);

    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Autenticado como superusuario en PocketBase.');
    } catch (err) {
        console.error('❌ Error de autenticación en PocketBase:', err.message);
        writeLog(`Error fatal de autenticación: ${err.message}`);
        process.exit(1);
    }

    await ensureThumbnailsConfig(pb);

    // Obtener todas las piezas ordenadas por referencia
    const items = await pb.collection('inventario').getFullList({
        sort: 'ref',
    });

    console.log(`📦 Total registros en inventario: ${items.length}`);

    // Filtrar candidatos
    const pendingItems = items.filter(item => {
        const hasUrl = Boolean(item.foto_url && item.foto_url.trim().length > 0);
        const hasFotos = Array.isArray(item.fotos) && item.fotos.length > 0;
        return hasUrl && !hasFotos;
    });

    const alreadyDone = items.filter(item => Array.isArray(item.fotos) && item.fotos.length > 0).length;
    console.log(`ℹ️  Piezas ya con fotos locales: ${alreadyDone}`);
    console.log(`🎯 Piezas pendientes de sincronizar: ${pendingItems.length}`);

    if (pendingItems.length === 0) {
        console.log('✨ No hay piezas pendientes de sincronización.');
        return;
    }

    const toProcess = LIMIT > 0 ? pendingItems.slice(0, LIMIT) : pendingItems;
    if (LIMIT > 0) {
        console.log(`⚠️  Límite activo: procesando únicamente las primeras ${toProcess.length} piezas.`);
    }

    const failedItems = [];
    let completedCount = 0;
    const totalCount = toProcess.length;

    // Procesamiento con concurrencia controlada
    let index = 0;

    async function worker() {
        while (index < toProcess.length) {
            const currentIndex = index++;
            const item = toProcess[currentIndex];
            const itemRef = item.ref;
            const itemId = item.id;
            const shareUrl = item.foto_url.trim();

            try {
                // 1. Descargar imagen con reintentos
                const buffer = await fetchImageWithRetry(shareUrl, itemRef);

                // 2. Backup local permanente y auditable
                const filename = `ref_${itemRef}_${itemId}.jpg`;
                const localFilePath = path.join(PHOTOS_DIR, filename);
                fs.writeFileSync(localFilePath, buffer);

                // 3. Subir a PocketBase
                const form = new FormData();
                form.append('fotos', new Blob([buffer], { type: 'image/jpeg' }), filename);
                await pb.collection('inventario').update(itemId, form);

                completedCount++;
                const percent = Math.round((completedCount / totalCount) * 100);
                const progressMsg = `[${completedCount}/${totalCount}] (${percent}%) Ref #${itemRef} - OK`;
                console.log(progressMsg);
                writeLog(progressMsg);

            } catch (err) {
                const failEntry = {
                    id: itemId,
                    ref: itemRef,
                    foto_url: shareUrl,
                    error: err.message,
                    timestamp: new Date().toISOString()
                };
                failedItems.push(failEntry);
                const errorMsg = `[ERROR] Ref #${itemRef} (ID: ${itemId}): ${err.message}`;
                console.error(errorMsg);
                writeLog(errorMsg);
            }

            // Cortesía entre solicitudes para prevenir rate-limiting de Google
            if (COURTESY_DELAY_MS > 0) {
                await sleep(COURTESY_DELAY_MS);
            }
        }
    }

    // Iniciar trabajadores según concurrencia definida
    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);

    // Guardar archivo estructurado de fallos
    fs.writeFileSync(FAILED_FILE, JSON.stringify(failedItems, null, 2), 'utf8');

    console.log('\n=======================================');
    console.log('🏁 Resumen de Sincronización:');
    console.log(`- Total pendientes procesados: ${totalCount}`);
    console.log(`- Exitosos: ${completedCount}`);
    console.log(`- Fallidos: ${failedItems.length}`);
    console.log(`- Backup local guardado en: backend/data/photos/`);
    console.log(`- Registro de eventos: backend/logs/sync_photos.log`);
    if (failedItems.length > 0) {
        console.log(`- Archivo de fallos pendientes: backend/logs/sync_photos_failed.json`);
    }
    console.log('=======================================\n');

    writeLog(`=== FIN DE SINCRONIZACIÓN. Exitosos: ${completedCount}, Fallidos: ${failedItems.length} ===`);
}

main().catch(err => {
    console.error('❌ Error crítico en ejecución:', err);
    writeLog(`Error crítico: ${err.stack || err.message}`);
    process.exit(1);
});
