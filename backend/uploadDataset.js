/**
 * Dataset Upload Script for Probos
 * Deletes all existing data and uploads JSON files from Dataset folder
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Configuration
const DATASET_PATH = path.join(__dirname, '..', 'Dataset');
const HISTORICAL_PATH = path.join(DATASET_PATH, 'Historical');
const REALTIME_PATH = path.join(DATASET_PATH, 'Realtime');
const WEATHER_PATH = path.join(DATASET_PATH, 'Weather');

/**
 * Delete all existing data from database
 */
async function clearDatabase() {
    console.log('🗑️  Clearing existing data...');

    try {
        // Delete in order to respect foreign key constraints
        await prisma.ticket.deleteMany({});
        console.log('  ✓ Cleared Tickets');

        await prisma.trustScore.deleteMany({});
        console.log('  ✓ Cleared TrustScores');

        await prisma.reading.deleteMany({});
        console.log('  ✓ Cleared Readings');

        await prisma.sensor.deleteMany({});
        console.log('  ✓ Cleared Sensors');

        console.log('✅ Database cleared successfully\n');
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        throw error;
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
 * Get all JSON files from a directory
 */
function getJsonFiles(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        console.warn(`⚠️  Directory not found: ${directoryPath}`);
        return [];
    }

    return fs.readdirSync(directoryPath)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(directoryPath, file));
}

/**
 * Upload sensor data from JSON files
 */
async function uploadSensorData(filePaths, dataType) {
    console.log(`📊 Uploading ${dataType} sensor data...`);

    let totalSensors = 0;
    let totalReadings = 0;

    for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        console.log(`  Processing: ${fileName}`);

        try {
            const data = readJsonFile(filePath);
            const { field_id, sensors } = data;

            for (const sensorData of sensors) {
                const { sensor_id, status, battery_level, readings } = sensorData;

                // Create or update sensor
                const sensor = await prisma.sensor.upsert({
                    where: { sensorId: sensor_id },
                    update: {
                        zone: field_id,
                    },
                    create: {
                        sensorId: sensor_id,
                        zone: field_id,
                        type: 'soil_moisture',
                        latitude: null,
                        longitude: null,
                    },
                });

                totalSensors++;

                // Create readings in batches for better performance
                const readingData = readings.map(reading => ({
                    sensorId: sensor.id,
                    timestamp: new Date(reading.timestamp),
                    moisture: reading.soil_moisture,
                    temperature: reading.soil_temperature,
                    ec: reading.ec,
                    ph: reading.ph,
                }));

                // Insert in batches of 100
                const batchSize = 100;
                for (let i = 0; i < readingData.length; i += batchSize) {
                    const batch = readingData.slice(i, i + batchSize);
                    await prisma.reading.createMany({
                        data: batch,
                    });
                    totalReadings += batch.length;
                }

                // Initialize trust score for sensor
                await prisma.trustScore.create({
                    data: {
                        sensorId: sensor.id,
                        score: status === 'active' ? 100.0 : 50.0,
                        status: status === 'active' ? 'Healthy' : 'Warning',
                        lowVariance: false,
                        spikeDetected: false,
                        zoneAnomaly: false,
                    },
                });
            }

            console.log(`    ✓ Processed ${sensors.length} sensors`);
        } catch (error) {
            console.error(`    ✗ Error processing ${fileName}:`, error.message);
        }
    }

    console.log(`  Total: ${totalSensors} sensors, ${totalReadings} readings\n`);
    return { sensors: totalSensors, readings: totalReadings };
}

/**
 * Main upload function
 */
async function main() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Probos Dataset Upload Tool           ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        // Step 1: Clear existing data
        await clearDatabase();

        // Step 2: Upload historical data
        const historicalFiles = getJsonFiles(HISTORICAL_PATH);
        if (historicalFiles.length > 0) {
            const histStats = await uploadSensorData(historicalFiles, 'Historical');
            console.log(`✅ Historical data uploaded: ${histStats.sensors} sensors, ${histStats.readings} readings\n`);
        } else {
            console.log('⚠️  No historical files found\n');
        }

        // Step 3: Skip realtime data (disabled)
        console.log('⏭️  Skipping realtime data upload\n');

        // Step 4: Verify upload
        const sensorCount = await prisma.sensor.count();
        const readingCount = await prisma.reading.count();
        const trustScoreCount = await prisma.trustScore.count();

        console.log('📈 Database Summary:');
        console.log(`  • Sensors: ${sensorCount}`);
        console.log(`  • Readings: ${readingCount}`);
        console.log(`  • Trust Scores: ${trustScoreCount}`);
        console.log(`  • Tickets: 0`);

        console.log('\n✅ Dataset upload completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Upload failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main();
