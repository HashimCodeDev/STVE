/**
 * Realtime Data Ingestion Cron Job for Probos
 * Simulates real-time sensor data ingestion from Dataset/Realtime folder
 * Can run as a cron job or continuous background process
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { evaluateTrustScore } from './src/modules/trustEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Configuration
const DATASET_PATH = path.join(__dirname, '..', 'Dataset');
const REALTIME_PATH = path.join(DATASET_PATH, 'Realtime');

// Cron job settings
const BATCH_SIZE = 10; // Number of readings to insert per run
const CONTINUOUS_MODE = process.argv.includes('--continuous');
const INTERVAL_MS = parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 20000; // Default: 20 seconds

// Track current position in dataset files
const STATE_FILE = path.join(__dirname, '.realtime-cron-state.json');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * Wait for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test database connection with retry logic
 */
async function testDatabaseConnection(retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log('✅ Database connection successful\n');
            return true;
        } catch (error) {
            const attempt = i + 1;
            if (attempt < retries) {
                console.log(`⚠️  Database connection failed (attempt ${attempt}/${retries}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                console.log(`   Reason: ${error.message.split('\n')[0]}`);
                await sleep(RETRY_DELAY_MS);
            } else {
                console.error(`❌ Database connection failed after ${retries} attempts`);
                return false;
            }
        }
    }
    return false;
}

/**
 * Load or initialize state tracking
 */
function loadState() {
    if (fs.existsSync(STATE_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        } catch (error) {
            console.warn('⚠️  Failed to load state file, starting fresh');
        }
    }
    return { files: {}, lastRun: null };
}

/**
 * Save state tracking
 */
function saveState(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save state:', error.message);
    }
}

/**
 * Read and parse JSON file
 */
function readJsonFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
}

/**
 * Get all JSON files from realtime directory
 */
function getRealtimeFiles() {
    if (!fs.existsSync(REALTIME_PATH)) {
        console.error(`❌ Realtime directory not found: ${REALTIME_PATH}`);
        return [];
    }

    return fs.readdirSync(REALTIME_PATH)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(REALTIME_PATH, file));
}

/**
 * Ensure sensors exist in database
 */
async function ensureSensorsExist(fieldId, sensorId) {
    return await prisma.sensor.upsert({
        where: { sensorId: sensorId },
        update: {
            zone: fieldId,
        },
        create: {
            sensorId: sensorId,
            zone: fieldId,
            type: 'soil_moisture',
            latitude: null,
            longitude: null,
        },
    });
}

// Trust scores are now calculated by evaluateTrustScore() after inserting readings
// No need to pre-create fake trust scores

/**
 * Insert batch of readings from realtime files
 */
async function insertRealtimeBatch() {
    console.log(`\n📊 Realtime Data Ingestion - ${new Date().toISOString()}`);

    const state = loadState();
    const files = getRealtimeFiles();

    if (files.length === 0) {
        console.log('⚠️  No realtime files found');
        return 0;
    }

    let totalInserted = 0;
    let totalSensorsProcessed = 0;

    for (const filePath of files) {
        const fileName = path.basename(filePath);

        try {
            const data = readJsonFile(filePath);
            const { field_id, sensors } = data;

            // Initialize file state if not exists
            if (!state.files[fileName]) {
                state.files[fileName] = {};
            }

            for (const sensorData of sensors) {
                const { sensor_id, status, readings } = sensorData;

                // Initialize sensor state if not exists
                if (state.files[fileName][sensor_id] === undefined) {
                    state.files[fileName][sensor_id] = 0;
                }

                const currentIndex = state.files[fileName][sensor_id];

                // Skip if all readings already inserted
                if (currentIndex >= readings.length) {
                    continue;
                }

                // Ensure sensor exists
                const sensor = await ensureSensorsExist(field_id, sensor_id);

                // Get next batch of readings
                const endIndex = Math.min(currentIndex + BATCH_SIZE, readings.length);
                const batchReadings = readings.slice(currentIndex, endIndex);

                // Insert readings
                const readingData = batchReadings.map(reading => ({
                    sensorId: sensor.id,
                    timestamp: new Date(reading.timestamp),
                    moisture: reading.soil_moisture,
                    temperature: reading.soil_temperature,
                    ec: reading.ec,
                    ph: reading.ph,
                }));

                await prisma.reading.createMany({
                    data: readingData,
                });

                // Evaluate trust score after inserting readings
                try {
                    const trustResult = await evaluateTrustScore(sensor.id);
                    if (trustResult) {
                        const statusIcon = trustResult.status === 'Healthy' ? '🟢' : trustResult.status === 'Warning' ? '🟡' : '🔴';
                        console.log(`  ✓ ${sensor_id}: ${readingData.length} readings (${endIndex}/${readings.length}) ${statusIcon} Trust: ${trustResult.score.toFixed(2)}`);
                    } else {
                        console.log(`  ✓ ${sensor_id}: ${readingData.length} readings (${endIndex}/${readings.length}) - insufficient history`);
                    }
                } catch (error) {
                    console.log(`  ✓ ${sensor_id}: ${readingData.length} readings (${endIndex}/${readings.length}) - trust eval failed: ${error.message}`);
                }

                totalInserted += readingData.length;
                totalSensorsProcessed++;

                // Update state
                state.files[fileName][sensor_id] = endIndex;
            }

        } catch (error) {
            console.error(`  ✗ Error processing ${fileName}:`, error.message);
        }
    }

    state.lastRun = new Date().toISOString();
    saveState(state);

    console.log(`\n✅ Batch complete: ${totalInserted} readings from ${totalSensorsProcessed} sensors`);

    // Show database stats
    try {
        const readingCount = await prisma.reading.count();
        console.log(`📈 Total readings in database: ${readingCount}\n`);
    } catch (error) {
        console.log(`⚠️  Could not fetch total count: ${error.message}\n`);
    }

    return totalInserted;
}

/**
 * Reset state (start from beginning)
 */
function resetState() {
    if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
        console.log('✅ State reset - will start from beginning on next run\n');
    } else {
        console.log('⚠️  No state file found\n');
    }
}

/**
 * Main function
 */
async function main() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Probos Realtime Data Cron Job       ║');
    console.log('╚════════════════════════════════════════╝');

    // Check for reset flag
    if (process.argv.includes('--reset')) {
        resetState();
        process.exit(0);
    }

    // Test database connection first
    console.log('\n🔌 Testing database connection...');
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
        console.error('\n❌ Cannot connect to database. Please check your connection and try again.\n');
        await prisma.$disconnect();
        process.exit(1);
    }

    try {
        if (CONTINUOUS_MODE) {
            console.log(`🔄 Running in continuous mode (interval: ${INTERVAL_MS}ms)`);
            console.log('Press Ctrl+C to stop\n');

            // Run immediately
            try {
                await insertRealtimeBatch();
            } catch (error) {
                console.error('❌ Error in initial batch:', error.message);
                console.log('   Will retry on next interval...\n');
            }

            // Then run at intervals
            setInterval(async () => {
                try {
                    await insertRealtimeBatch();
                } catch (error) {
                    console.error('❌ Error in continuous batch:', error.message);
                    console.log('   Will retry on next interval...\n');
                }
            }, INTERVAL_MS);

        } else {
            // Single run mode (for cron)
            console.log('📅 Running single batch insert\n');
            await insertRealtimeBatch();
            await prisma.$disconnect();
            process.exit(0);
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n⚠️  Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

// Run the script
main();
