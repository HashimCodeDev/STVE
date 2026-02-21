import { PrismaClient } from '@prisma/client';
import { createMaintenanceTicket } from './maintenance.js';

const prisma = new PrismaClient();

/**
 * Trust Engine Module
 * Evaluates sensor reliability using:
 *   1. Temporal Stability   (weight: 0.4)
 *   2. Cross-Sensor Agreement (weight: 0.4)
 *   3. Physical Plausibility  (weight: 0.2)
 *
 * Final: SensorTrust = avg(moisture, temperature, ec, ph) parameter trusts
 */

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

const TRUST_CONFIG = {

    // Formula weights (must sum to 1.0)
    WEIGHTS: {
        TEMPORAL:  0.4,
        CROSS:     0.4,
        PHYSICAL:  0.2,
    },

    // Absolute physical limits — immediate EXTREME (score 0.1) if violated
    PHYSICAL_LIMITS: {
        moisture:    { min: 0,   max: 100  },  // % VWC
        temperature: { min: 0,   max: 60   },  // °C
        ec:          { min: 0,   max: 10   },  // mS/cm
        ph:          { min: 3,   max: 10   },  // pH units
    },

    // Temporal thresholds — % change from rolling mean
    // Formula: change% = |new - mean| / mean × 100
    TEMPORAL_THRESHOLDS: {
        moisture:    { normal: 25,  moderate: 60  },  // >60  = EXTREME
        temperature: { normal: 8,   moderate: 15  },  // >15  = EXTREME
        ec:          { normal: 15,  moderate: 30  },  // >30  = EXTREME
        ph:          { normal: 5,   moderate: 10  },  // >10  = EXTREME
    },

    // Static sensor detection — min required variation over history window
    STATIC_THRESHOLDS: {
        moisture:    0.5,   // % VWC
        temperature: 0.2,   // °C
        ec:          0.05,  // mS/cm
        ph:          0.05,  // pH units
    },

    // Cross-sensor thresholds — % deviation from zone mean
    // Formula: deviation% = |val - zoneMean| / zoneMean × 100
    CROSS_THRESHOLDS: {
        moisture:    { normal: 25, moderate: 50  },  // >50 = EXTREME
        temperature: { normal: 5,  moderate: 10  },  // >10 = EXTREME
        ec:          { normal: 15, moderate: 30  },  // >30 = EXTREME
        ph:          { normal: 3,  moderate: 6   },  // >6  = EXTREME
    },

    // Physical plausibility penalties (start at 1.0, subtract)
    PHYSICAL_PENALTIES: {
        HIGH_MOISTURE_NO_RAIN: 0.4,  // moisture > 85% with no rain
        SOIL_AIR_TEMP_GAP:     0.3,  // |soilTemp - airTemp| > 10°C
        PH_JUMP:               0.3,  // |pH_new - pH_prev| > 1.5
        EC_SPIKE:              0.3,  // EC sudden change > 25%
    },

    // Score lookup tables
    TEMPORAL_SCORES:  { normal: 1.0, moderate: 0.6, extreme: 0.1, static: 0.2 },
    CROSS_SCORES:     { normal: 1.0, moderate: 0.5, extreme: 0.1 },
    PHYSICAL_SCORES:  { normal: 1.0, moderate: 0.65, extreme: 0.1 },

    // Final sensor trust interpretation bands
    TRUST_BANDS: {
        HIGHLY_RELIABLE: 0.85,
        RELIABLE:        0.65,
        UNCERTAIN:       0.50,
        UNRELIABLE:      0.15,
    },

    // How many past readings to use for temporal analysis
    HISTORY_WINDOW: 10,
};


// ─────────────────────────────────────────────────────────────
// HELPER: MEAN
// ─────────────────────────────────────────────────────────────

function mean(values) {
    if (!values.length) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}


// ─────────────────────────────────────────────────────────────
// STEP 1 — TEMPORAL STABILITY
// Formula: μ = mean(history), change% = |new - μ| / μ × 100
// Static:  R = max(history) - min(history); if R < threshold → frozen
// ─────────────────────────────────────────────────────────────

function computeTemporalScore(param, newVal, history) {
    const scores  = TRUST_CONFIG.TEMPORAL_SCORES;
    const thresh  = TRUST_CONFIG.TEMPORAL_THRESHOLDS[param];
    const statThr = TRUST_CONFIG.STATIC_THRESHOLDS[param];

    if (!history || history.length < 2) {
        return { score: scores.normal, level: 'normal', info: 'insufficient history' };
    }

    // Static / frozen sensor check
    const range = Math.max(...history) - Math.min(...history);
    if (range < statThr) {
        return { score: scores.static, level: 'static', info: `range ${range.toFixed(3)} < ${statThr} (frozen sensor)` };
    }

    // Spike detection
    const mu = mean(history);
    if (mu === 0) return { score: scores.normal, level: 'normal', info: 'mean is zero' };

    const changePct = (Math.abs(newVal - mu) / Math.abs(mu)) * 100;

    let level;
    if      (changePct <= thresh.normal)   level = 'normal';
    else if (changePct <= thresh.moderate) level = 'moderate';
    else                                   level = 'extreme';

    return {
        score: scores[level],
        level,
        info:  `${changePct.toFixed(1)}% change from mean (${mu.toFixed(2)})`,
    };
}


// ─────────────────────────────────────────────────────────────
// STEP 2 — CROSS-SENSOR AGREEMENT
// Formula: μ_zone = mean(zoneReadings), deviation% = |val - μ_zone| / μ_zone × 100
// ─────────────────────────────────────────────────────────────

function computeCrossScore(param, val, zoneReadings) {
    const scores = TRUST_CONFIG.CROSS_SCORES;
    const thresh = TRUST_CONFIG.CROSS_THRESHOLDS[param];

    if (!zoneReadings || zoneReadings.length === 0) {
        return { score: scores.normal, level: 'normal', info: 'no neighbors available' };
    }

    const zoneMean = mean(zoneReadings);
    if (zoneMean === 0) return { score: scores.normal, level: 'normal', info: 'zone mean is zero' };

    const devPct = (Math.abs(val - zoneMean) / Math.abs(zoneMean)) * 100;

    let level;
    if      (devPct <= thresh.normal)   level = 'normal';
    else if (devPct <= thresh.moderate) level = 'moderate';
    else                                level = 'extreme';

    return {
        score: scores[level],
        level,
        info:  `${devPct.toFixed(1)}% deviation from zone mean (${zoneMean.toFixed(2)})`,
    };
}


// ─────────────────────────────────────────────────────────────
// STEP 3 — PHYSICAL PLAUSIBILITY
// Start at 1.0, subtract penalties. Immediate 0.1 for hard violations.
// ─────────────────────────────────────────────────────────────

function computePhysicalScore(reading, { prevPh = null, prevEc = null, airTemp = null, isRaining = false } = {}) {
    const limits   = TRUST_CONFIG.PHYSICAL_LIMITS;
    const penalties = TRUST_CONFIG.PHYSICAL_PENALTIES;
    const scores   = TRUST_CONFIG.PHYSICAL_SCORES;

    const flags = [];

    // ── Hard violations → immediate EXTREME ──
    for (const [param, { min, max }] of Object.entries(limits)) {
        const val = reading[param];
        if (val !== null && val !== undefined && (val < min || val > max)) {
            return {
                score: scores.extreme,
                level: 'extreme',
                flags: [`EXTREME: ${param} value ${val} out of bounds [${min}–${max}]`],
            };
        }
    }

    // ── Moderate penalties ──
    let score = 1.0;

    if (reading.moisture > 85 && !isRaining) {
        score -= penalties.HIGH_MOISTURE_NO_RAIN;
        flags.push(`Moisture ${reading.moisture}% high but no rain (−${penalties.HIGH_MOISTURE_NO_RAIN})`);
    }

    if (airTemp !== null) {
        const diff = Math.abs(reading.temperature - airTemp);
        if (diff > 10) {
            score -= penalties.SOIL_AIR_TEMP_GAP;
            flags.push(`Soil(${reading.temperature}°C) vs Air(${airTemp}°C) diff=${diff.toFixed(1)}°C > 10°C (−${penalties.SOIL_AIR_TEMP_GAP})`);
        }
    }

    if (prevPh !== null) {
        const phJump = Math.abs(reading.ph - prevPh);
        if (phJump > 1.5) {
            score -= penalties.PH_JUMP;
            flags.push(`pH jumped ${phJump.toFixed(2)} units > 1.5 (−${penalties.PH_JUMP})`);
        }
    }

    if (prevEc !== null && prevEc > 0) {
        const ecChangePct = (Math.abs(reading.ec - prevEc) / prevEc) * 100;
        if (ecChangePct > 25) {
            score -= penalties.EC_SPIKE;
            flags.push(`EC spiked ${ecChangePct.toFixed(1)}% > 25% (−${penalties.EC_SPIKE})`);
        }
    }

    score = Math.max(scores.extreme, score);

    const level = score >= 0.9 ? 'normal' : score >= 0.6 ? 'moderate' : 'extreme';

    return { score, level, flags };
}


// ─────────────────────────────────────────────────────────────
// STEP 4 — PARAMETER TRUST SCORE
// Formula: Trust_param = 0.4×Temporal + 0.4×Cross + 0.2×Physical
// ─────────────────────────────────────────────────────────────

function computeParamTrust(temporalScore, crossScore, physicalScore) {
    const { TEMPORAL, CROSS, PHYSICAL } = TRUST_CONFIG.WEIGHTS;
    return parseFloat((TEMPORAL * temporalScore + CROSS * crossScore + PHYSICAL * physicalScore).toFixed(4));
}


// ─────────────────────────────────────────────────────────────
// STEP 5 — SENSOR TRUST SCORE
// Formula: SensorTrust = (T_moisture + T_temp + T_ec + T_ph) / 4
// ─────────────────────────────────────────────────────────────

function computeSensorTrust(paramTrusts) {
    const values = Object.values(paramTrusts);
    return parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(4));
}


// ─────────────────────────────────────────────────────────────
// STEP 6 — INTERPRET FINAL TRUST SCORE
// ─────────────────────────────────────────────────────────────

function interpretTrust(score) {
    const { HIGHLY_RELIABLE, RELIABLE, UNCERTAIN, UNRELIABLE } = TRUST_CONFIG.TRUST_BANDS;

    if (score >= HIGHLY_RELIABLE) return { status: 'Healthy',   label: 'Highly Reliable', action: 'Safe to act on data' };
    if (score >= RELIABLE)        return { status: 'Healthy',   label: 'Reliable',         action: 'Continue monitoring' };
    if (score >= UNCERTAIN)       return { status: 'Warning',   label: 'Uncertain',        action: 'Verify manually' };
    if (score >= UNRELIABLE)      return { status: 'Anomalous', label: 'Unreliable',       action: 'Investigate sensor' };
    return                               { status: 'Anomalous', label: 'Anomaly',          action: 'Ignore reading — fault detected' };
}


// ─────────────────────────────────────────────────────────────
// MAIN: evaluateTrustScore
// Drop-in replacement — same signature as original
// ─────────────────────────────────────────────────────────────

export async function evaluateTrustScore(sensorId) {
    try {
        const sensor = await prisma.sensor.findUnique({
            where: { id: sensorId },
            include: {
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take: 50,
                },
            },
        });

        if (!sensor || sensor.readings.length < 5) {
            return null;
        }

        const readings  = sensor.readings;
        const latest    = readings[0];
        const previous  = readings[1] ?? null;
        const history   = readings.slice(1, TRUST_CONFIG.HISTORY_WINDOW + 1); // last N before current

        // Build current reading object
        const currentReading = {
            moisture:    latest.moisture,
            temperature: latest.temperature,
            ec:          latest.ec,
            ph:          latest.ph,
        };

        // Build history arrays per parameter
        const historyArrays = {
            moisture:    history.map(r => r.moisture).filter(v => v !== null),
            temperature: history.map(r => r.temperature).filter(v => v !== null),
            ec:          history.map(r => r.ec).filter(v => v !== null),
            ph:          history.map(r => r.ph).filter(v => v !== null),
        };

        // Get zone sensor readings for cross-sensor check
        const zoneSensors = await prisma.sensor.findMany({
            where: {
                zone: sensor.zone,
                id:   { not: sensorId },
            },
            include: {
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
            },
        });

        const zoneArrays = {
            moisture:    zoneSensors.map(s => s.readings[0]?.moisture).filter(v => v != null),
            temperature: zoneSensors.map(s => s.readings[0]?.temperature).filter(v => v != null),
            ec:          zoneSensors.map(s => s.readings[0]?.ec).filter(v => v != null),
            ph:          zoneSensors.map(s => s.readings[0]?.ph).filter(v => v != null),
        };

        // ── Physical check (shared across all parameters) ──
        const physical = computePhysicalScore(currentReading, {
            prevPh:    previous?.ph    ?? null,
            prevEc:    previous?.ec    ?? null,
            airTemp:   latest.airTemp  ?? null,  // attach air temp to reading if available
            isRaining: latest.isRaining ?? false,
        });

        // ── Per-parameter trust ──
        const params = ['moisture', 'temperature', 'ec', 'ph'];
        const paramDetails = {};
        const paramTrusts  = {};

        for (const param of params) {
            const temporal = computeTemporalScore(param, currentReading[param], historyArrays[param]);
            const cross    = computeCrossScore(param, currentReading[param], zoneArrays[param]);
            const trust    = computeParamTrust(temporal.score, cross.score, physical.score);

            paramDetails[param] = {
                value:        currentReading[param],
                temporal:     temporal.score,
                temporalInfo: temporal.info,
                temporalLevel:temporal.level,
                cross:        cross.score,
                crossInfo:    cross.info,
                crossLevel:   cross.level,
                physical:     physical.score,
                paramTrust:   trust,
            };

            paramTrusts[param] = trust;
        }

        // ── Sensor-level trust ──
        const sensorTrustScore = computeSensorTrust(paramTrusts);
        const { status, label, action } = interpretTrust(sensorTrustScore);

        // ── Collect all flags ──
        const allFlags = [...physical.flags];
        const lowVariance   = params.some(p => paramDetails[p].temporalLevel === 'static');
        const spikeDetected = params.some(p => paramDetails[p].temporalLevel === 'extreme');
        const zoneAnomaly   = params.some(p => paramDetails[p].crossLevel    === 'extreme');

        if (lowVariance)   allFlags.push('Low variance detected — sensor may be stuck');
        if (spikeDetected) allFlags.push('Extreme spike detected in one or more parameters');
        if (zoneAnomaly)   allFlags.push('Reading deviates significantly from zone neighbors');

        // ── Save to DB ──
        const trustScore = await prisma.trustScore.create({
            data: {
                sensorId:       sensor.id,
                score:          sensorTrustScore,   // 0.0 – 1.0
                status,
                label,
                lowVariance,
                spikeDetected,
                zoneAnomaly,
                paramMoisture:   paramTrusts.moisture,
                paramTemperature:paramTrusts.temperature,
                paramEc:         paramTrusts.ec,
                paramPh:         paramTrusts.ph,
                flags:           allFlags,
            },
        });

        // ── Auto maintenance ticket if Anomalous ──
        if (status === 'Anomalous') {
            await createMaintenanceTicket({
                sensorId: sensor.id,
                issue:    allFlags.join('; '),
                severity: sensorTrustScore < 0.15 ? 'Critical' : 'High',
            });
        }

        return {
            ...trustScore,
            paramDetails,       // full breakdown per parameter
            action,
        };

    } catch (error) {
        console.error(`Trust evaluation failed for sensor ${sensorId}:`, error);
        throw error;
    }
}


// ─────────────────────────────────────────────────────────────
// getTrustScoreDistribution — unchanged signature, updated bands
// ─────────────────────────────────────────────────────────────

export async function getTrustScoreDistribution() {
    try {
        const sensors = await prisma.sensor.findMany({
            include: {
                trustScores: {
                    orderBy: { lastEvaluated: 'desc' },
                    take: 1,
                },
            },
        });

        const distribution = { healthy: 0, warning: 0, anomalous: 0 };

        sensors.forEach(sensor => {
            if (sensor.trustScores.length > 0) {
                const { status } = sensor.trustScores[0];
                if      (status === 'Healthy')   distribution.healthy++;
                else if (status === 'Warning')   distribution.warning++;
                else if (status === 'Anomalous') distribution.anomalous++;
            }
        });

        return distribution;
    } catch (error) {
        throw new Error(`Failed to get trust score distribution: ${error.message}`);
    }
}


// ─────────────────────────────────────────────────────────────
// getTrustHistory — fetch past trust scores for a sensor
// Used by: sensorController → getSensorTrustHistory
// ─────────────────────────────────────────────────────────────

export async function getTrustHistory(sensorId, limit = 20) {
    try {
        const history = await prisma.trustScore.findMany({
            where:   { sensorId },
            orderBy: { lastEvaluated: 'desc' },
            take:    limit,
            select: {
                id:               true,
                score:            true,
                status:           true,
                label:            true,
                lowVariance:      true,
                spikeDetected:    true,
                zoneAnomaly:      true,
                paramMoisture:    true,
                paramTemperature: true,
                paramEc:          true,
                paramPh:          true,
                flags:            true,
                lastEvaluated:    true,
            },
        });

        return history;
    } catch (error) {
        throw new Error(`Failed to get trust history for sensor ${sensorId}: ${error.message}`);
    }
}


// ─────────────────────────────────────────────────────────────
// EXPORTS — pure functions exposed for testing / external use
// ─────────────────────────────────────────────────────────────

export {
    computeTemporalScore,
    computeCrossScore,
    computePhysicalScore,
    computeParamTrust,
    computeSensorTrust,
    interpretTrust,
    TRUST_CONFIG,
};