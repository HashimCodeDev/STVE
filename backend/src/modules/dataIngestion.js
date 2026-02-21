import { PrismaClient } from '@prisma/client';
import { evaluateTrustScore } from './trustEngine.js';

const prisma = new PrismaClient();

/**
 * Data Ingestion Module
 * Accepts sensor readings and stores them in the database
 */

// Ingest a new sensor reading
export async function ingestReading(data) {
    const { sensorId, moisture, temperature, ec } = data;

    try {
        // Find sensor by sensorId (not UUID)
        const sensor = await prisma.sensor.findUnique({
            where: { sensorId },
        });

        if (!sensor) {
            throw new Error(`Sensor ${sensorId} not found`);
        }

        // Create the reading
        const reading = await prisma.reading.create({
            data: {
                sensorId: sensor.id,
                moisture,
                temperature,
                ec,
            },
        });

        // Trigger trust score evaluation
        await evaluateTrustScore(sensor.id);

        return reading;
    } catch (error) {
        throw new Error(`Failed to ingest reading: ${error.message}`);
    }
}

// Batch ingest multiple readings
export async function ingestBatchReadings(readings) {
    const results = [];

    for (const reading of readings) {
        try {
            const result = await ingestReading(reading);
            results.push({ success: true, data: result });
        } catch (error) {
            results.push({ success: false, error: error.message });
        }
    }

    return results;
}

// Get recent readings for a sensor
export async function getRecentReadings(sensorId, limit = 100) {
    try {
        const readings = await prisma.reading.findMany({
            where: { sensorId },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });

        return readings;
    } catch (error) {
        throw new Error(`Failed to fetch readings: ${error.message}`);
    }
}
