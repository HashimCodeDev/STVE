import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sensor Registry Module
 * Handles sensor registration and metadata storage
 */

// Register a new sensor
export async function registerSensor(data) {
    const { sensorId, zone, type, latitude, longitude } = data;

    try {
        const sensor = await prisma.sensor.create({
            data: {
                sensorId,
                zone,
                type,
                latitude,
                longitude,
            },
        });

        // Initialize trust score for the new sensor
        await prisma.trustScore.create({
            data: {
                sensorId: sensor.id,
                score: 100.0,
                status: 'Healthy',
            },
        });

        return sensor;
    } catch (error) {
        throw new Error(`Failed to register sensor: ${error.message}`);
    }
}

// Get all sensors with their latest trust scores
export async function getAllSensors() {
    try {
        const sensors = await prisma.sensor.findMany({
            include: {
                trustScores: {
                    orderBy: { lastEvaluated: 'desc' },
                    take: 1,
                },
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
            },
        });

        return sensors;
    } catch (error) {
        throw new Error(`Failed to fetch sensors: ${error.message}`);
    }
}

// Get sensor by ID
export async function getSensorById(id) {
    try {
        const sensor = await prisma.sensor.findUnique({
            where: { id },
            include: {
                trustScores: {
                    orderBy: { lastEvaluated: 'desc' },
                    take: 1,
                },
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take: 10,
                },
            },
        });

        return sensor;
    } catch (error) {
        throw new Error(`Failed to fetch sensor: ${error.message}`);
    }
}
