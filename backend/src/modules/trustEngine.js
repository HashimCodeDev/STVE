import { PrismaClient } from '@prisma/client';
import { createMaintenanceTicket } from './maintenance.js';

const prisma = new PrismaClient();

/**
 * Trust Engine Module
 * Core logic that evaluates sensor reliability and assigns trust scores
 */

// Trust score configuration
const TRUST_CONFIG = {
    INITIAL_SCORE: 100,
    PENALTIES: {
        LOW_VARIANCE: 15,
        SPIKE_DETECTED: 20,
        ZONE_ANOMALY: 25,
    },
    THRESHOLDS: {
        HEALTHY: 80,
        WARNING: 60,
    },
    VARIANCE_THRESHOLD: 0.01, // Very low variance indicates stuck sensor
    SPIKE_THRESHOLD: 30, // Percentage change that indicates a spike
    ZONE_STD_MULTIPLIER: 2, // Standard deviations for zone anomaly
};

/**
 * Main trust score evaluation function
 */
export async function evaluateTrustScore(sensorId) {
    try {
        // Get sensor and recent readings
        const sensor = await prisma.sensor.findUnique({
            where: { id: sensorId },
            include: {
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take: 50, // Analyze last 50 readings
                },
            },
        });

        if (!sensor || sensor.readings.length < 5) {
            // Need at least 5 readings for meaningful analysis
            return null;
        }

        const readings = sensor.readings;
        let score = TRUST_CONFIG.INITIAL_SCORE;
        let flags = {
            lowVariance: false,
            spikeDetected: false,
            zoneAnomaly: false,
        };

        // Check 1: Low Variance Detection (Static sensor)
        const variance = calculateVariance(readings.map(r => r.moisture).filter(v => v !== null));
        if (variance < TRUST_CONFIG.VARIANCE_THRESHOLD) {
            flags.lowVariance = true;
            score -= TRUST_CONFIG.PENALTIES.LOW_VARIANCE;
        }

        // Check 2: Spike Detection (Sudden jumps)
        const spikeDetected = detectSpike(readings);
        if (spikeDetected) {
            flags.spikeDetected = true;
            score -= TRUST_CONFIG.PENALTIES.SPIKE_DETECTED;
        }

        // Check 3: Zone Anomaly (Cross-sensor comparison)
        const isZoneAnomaly = await detectZoneAnomaly(sensor.id, sensor.zone, readings[0].moisture);
        if (isZoneAnomaly) {
            flags.zoneAnomaly = true;
            score -= TRUST_CONFIG.PENALTIES.ZONE_ANOMALY;
        }

        // Clamp score between 0 and 100
        score = Math.max(0, Math.min(100, score));

        // Determine status
        let status = 'Anomalous';
        if (score > TRUST_CONFIG.THRESHOLDS.HEALTHY) {
            status = 'Healthy';
        } else if (score > TRUST_CONFIG.THRESHOLDS.WARNING) {
            status = 'Warning';
        }

        // Update trust score
        const trustScore = await prisma.trustScore.create({
            data: {
                sensorId: sensor.id,
                score,
                status,
                lowVariance: flags.lowVariance,
                spikeDetected: flags.spikeDetected,
                zoneAnomaly: flags.zoneAnomaly,
            },
        });

        // Auto-generate maintenance ticket if anomalous
        if (status === 'Anomalous') {
            const issues = [];
            if (flags.lowVariance) issues.push('Low variance detected (sensor may be stuck)');
            if (flags.spikeDetected) issues.push('Sudden spike in readings detected');
            if (flags.zoneAnomaly) issues.push('Reading deviates significantly from zone average');

            await createMaintenanceTicket({
                sensorId: sensor.id,
                issue: issues.join('; '),
                severity: 'High',
            });
        }

        return trustScore;
    } catch (error) {
        console.error(`Trust evaluation failed for sensor ${sensorId}:`, error);
        throw error;
    }
}

/**
 * Calculate variance of a dataset
 */
function calculateVariance(values) {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return variance;
}

/**
 * Detect sudden spikes in readings
 */
function detectSpike(readings) {
    if (readings.length < 2) return false;

    const latestMoisture = readings[0].moisture;
    const previousMoisture = readings[1].moisture;

    if (latestMoisture === null || previousMoisture === null) return false;
    if (previousMoisture === 0) return false;

    const percentageChange = Math.abs((latestMoisture - previousMoisture) / previousMoisture) * 100;

    return percentageChange > TRUST_CONFIG.SPIKE_THRESHOLD;
}

/**
 * Detect zone-level anomalies (cross-sensor comparison)
 */
async function detectZoneAnomaly(sensorId, zone, currentMoisture) {
    if (currentMoisture === null) return false;

    try {
        // Get all sensors in the same zone
        const zoneSensors = await prisma.sensor.findMany({
            where: {
                zone,
                id: { not: sensorId }, // Exclude current sensor
            },
            include: {
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
            },
        });

        // Get latest moisture readings from zone sensors
        const zoneReadings = zoneSensors
            .map(s => s.readings[0]?.moisture)
            .filter(m => m !== null && m !== undefined);

        if (zoneReadings.length < 2) {
            // Not enough data for comparison
            return false;
        }

        // Calculate zone mean and standard deviation
        const zoneMean = zoneReadings.reduce((sum, val) => sum + val, 0) / zoneReadings.length;
        const variance = calculateVariance(zoneReadings);
        const stdDev = Math.sqrt(variance);

        // Check if current reading is beyond zone mean ± 2 std deviations
        const lowerBound = zoneMean - (TRUST_CONFIG.ZONE_STD_MULTIPLIER * stdDev);
        const upperBound = zoneMean + (TRUST_CONFIG.ZONE_STD_MULTIPLIER * stdDev);

        return currentMoisture < lowerBound || currentMoisture > upperBound;
    } catch (error) {
        console.error('Zone anomaly detection failed:', error);
        return false;
    }
}

/**
 * Get trust score distribution for dashboard
 */
export async function getTrustScoreDistribution() {
    try {
        // Get latest trust score for each sensor
        const sensors = await prisma.sensor.findMany({
            include: {
                trustScores: {
                    orderBy: { lastEvaluated: 'desc' },
                    take: 1,
                },
            },
        });

        const distribution = {
            healthy: 0,
            warning: 0,
            anomalous: 0,
        };

        sensors.forEach(sensor => {
            if (sensor.trustScores.length > 0) {
                const status = sensor.trustScores[0].status;
                if (status === 'Healthy') distribution.healthy++;
                else if (status === 'Warning') distribution.warning++;
                else if (status === 'Anomalous') distribution.anomalous++;
            }
        });

        return distribution;
    } catch (error) {
        throw new Error(`Failed to get trust score distribution: ${error.message}`);
    }
}
