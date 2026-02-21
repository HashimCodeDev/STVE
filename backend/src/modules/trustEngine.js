import { PrismaClient } from '@prisma/client';
import { createMaintenanceTicket } from './maintenance.js';

const prisma = new PrismaClient();

/**
 * ═══════════════════════════════════════════════════════════════
 *  SMART SENSOR DIAGNOSTIC ENGINE  v2.0
 * ═══════════════════════════════════════════════════════════════
 *
 *  Improvements over v1:
 *  ✔ Diagnostic engine — classifies root cause, not just anomaly
 *  ✔ Parameter-level trust — isolates which probe is faulty
 *  ✔ Sensor fault vs field event differentiation
 *  ✔ Static + drift detection (not just spikes)
 *  ✔ Confidence-based scoring — no hard pass/fail
 *  ✔ Root cause classification (SPIKE / STATIC / DRIFT /
 *      ZONE_MISMATCH / WEATHER_MISMATCH / SENSOR_OFFLINE)
 *  ✔ Missing data & connectivity failure handling
 *  ✔ Sensor health trend tracking
 *  ✔ Severity prioritization (Critical / High / Medium / Low)
 *  ✔ Separated detection from presentation
 * ═══════════════════════════════════════════════════════════════
 */


// ───────────────────────────────────────────────────────────────
// ROOT CAUSE CODES
// ───────────────────────────────────────────────────────────────

export const ROOT_CAUSE = {
    NORMAL:           'NORMAL',
    SPIKE:            'SPIKE',            // sudden jump, isolated to this sensor
    STATIC:           'STATIC',           // frozen / stuck probe
    DRIFT:            'DRIFT',            // slow shift over time → calibration issue
    ZONE_MISMATCH:    'ZONE_MISMATCH',    // differs from neighbours but no spike
    WEATHER_MISMATCH: 'WEATHER_MISMATCH', // physical context doesn't match
    SENSOR_OFFLINE:   'SENSOR_OFFLINE',   // no recent data / null values
    FIELD_EVENT:      'FIELD_EVENT',      // real change — all zone sensors agree
    IMPOSSIBLE_VALUE: 'IMPOSSIBLE_VALUE', // out of physical bounds
};

// ───────────────────────────────────────────────────────────────
// SEVERITY LEVELS
// ───────────────────────────────────────────────────────────────

export const SEVERITY = {
    CRITICAL: 'Critical',   // impossible values / offline
    HIGH:     'High',       // confirmed sensor fault
    MEDIUM:   'Medium',     // suspicious / uncertain
    LOW:      'Low',        // monitor only
    NONE:     'None',       // healthy
};


// ───────────────────────────────────────────────────────────────
// CONFIGURATION
// ───────────────────────────────────────────────────────────────

const TRUST_CONFIG = {

    // Formula weights (must sum to 1.0)
    WEIGHTS: {
        TEMPORAL: 0.3,
        CROSS: 0.5,
        PHYSICAL: 0.2,
    },

    // Absolute physical limits — IMPOSSIBLE_VALUE if violated
    PHYSICAL_LIMITS: {
        moisture:    { min: 0,  max: 100 },  // % VWC
        temperature: { min: 0,  max: 60  },  // °C
        ec:          { min: 0,  max: 10  },  // mS/cm
        ph:          { min: 3,  max: 10  },  // pH units
    },

    // Temporal thresholds — % change from rolling mean
    // Formula: change% = |new - mean| / mean × 100
    TEMPORAL_THRESHOLDS: {
        moisture:    { normal: 25, moderate: 60  },
        temperature: { normal: 8,  moderate: 15  },
        ec:          { normal: 15, moderate: 30  },
        ph:          { normal: 5,  moderate: 10  },
    },

    // Static detection — min required variation across history window
    STATIC_THRESHOLDS: {
        moisture:    0.5,
        temperature: 0.2,
        ec:          0.05,
        ph:          0.05,
    },

    // Drift detection — slow trend over longer window
    // If linear regression slope exceeds this per reading → DRIFT
    DRIFT_THRESHOLDS: {
        moisture:    0.8,   // % per reading
        temperature: 0.3,   // °C per reading
        ec:          0.02,  // mS/cm per reading
        ph:          0.05,  // pH per reading
    },

    // Cross-sensor thresholds — % deviation from zone mean
    // Formula: deviation% = |val - zoneMean| / zoneMean × 100
    CROSS_THRESHOLDS: {
        moisture:    { normal: 25, moderate: 50 },
        temperature: { normal: 5,  moderate: 10 },
        ec:          { normal: 15, moderate: 30 },
        ph:          { normal: 3,  moderate: 6  },
    },

    // Physical plausibility penalties (start at 1.0, subtract)
    PHYSICAL_PENALTIES: {
        HIGH_MOISTURE_NO_RAIN: 0.4,
        SOIL_AIR_TEMP_GAP:     0.3,
        PH_JUMP:               0.3,
        EC_SPIKE:              0.3,
    },

    // Score lookup tables
    TEMPORAL_SCORES:  { normal: 1.0, moderate: 0.6, extreme: 0.1, static: 0.2, drift: 0.4 },
    CROSS_SCORES:     { normal: 1.0, moderate: 0.5, extreme: 0.1 },
    PHYSICAL_SCORES:  { normal: 1.0, moderate: 0.65, extreme: 0.1 },

    // Final sensor trust interpretation bands (must be descending)
    TRUST_BANDS: {
        HIGHLY_RELIABLE: 0.85,   // [0.85-1.0] = Healthy (Highly Reliable)
        RELIABLE: 0.78,          // [0.78-0.84] = Healthy (Reliable)
        UNCERTAIN: 0.73,         // [0.73-0.77] = Warning
        UNRELIABLE: 0.50,        // [0.50-0.72] = Anomalous, <0.50 = Anomalous (critical)
    },

    // Offline detection — if last reading is older than this (ms)
    OFFLINE_THRESHOLD_MS: 15 * 60 * 1000,   // 15 minutes

    // Windows
    HISTORY_WINDOW:      10,   // readings for temporal analysis
    DRIFT_WINDOW:        20,   // readings for drift detection
    TREND_WINDOW:        10,   // trust scores for health trend
};


// ───────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────

function mean(values) {
    if (!values.length) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Linear regression slope — used for drift detection
// Returns slope (change per step); positive = rising, negative = falling
function linearSlope(values) {
    const n = values.length;
    if (n < 3) return 0;
    const xMean = (n - 1) / 2;
    const yMean = mean(values);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += (i - xMean) * (values[i] - yMean);
        den += (i - xMean) ** 2;
    }
    return den === 0 ? 0 : num / den;
}


// ───────────────────────────────────────────────────────────────
// IMPROVEMENT 8 — OFFLINE / MISSING DATA DETECTION
// ───────────────────────────────────────────────────────────────

function checkOnlineStatus(latestTimestamp, readings) {
    if (!latestTimestamp) {
        return { online: false, cause: ROOT_CAUSE.SENSOR_OFFLINE, info: 'No timestamp on latest reading' };
    }
    const age = Date.now() - new Date(latestTimestamp).getTime();
    if (age > TRUST_CONFIG.OFFLINE_THRESHOLD_MS) {
        return {
            online: false,
            cause:  ROOT_CAUSE.SENSOR_OFFLINE,
            info:   `Last reading ${Math.round(age / 60000)} min ago (threshold: ${TRUST_CONFIG.OFFLINE_THRESHOLD_MS / 60000} min)`,
        };
    }
    const nullCount = readings.filter(r =>
        r.moisture === null && r.temperature === null && r.ec === null && r.ph === null
    ).length;
    if (nullCount > readings.length * 0.5) {
        return { online: false, cause: ROOT_CAUSE.SENSOR_OFFLINE, info: `${nullCount}/${readings.length} readings are null` };
    }
    return { online: true, cause: null, info: 'Online' };
}


// ───────────────────────────────────────────────────────────────
// STEP 1 — TEMPORAL STABILITY
// Detects: SPIKE, STATIC, DRIFT
// Formula: change% = |new - mean| / mean × 100
// Static:  R = max - min < threshold
// Drift:   linear slope over longer window > drift threshold
// ───────────────────────────────────────────────────────────────

function computeTemporalScore(param, newVal, history, driftHistory = []) {
    const scores  = TRUST_CONFIG.TEMPORAL_SCORES;
    const thresh  = TRUST_CONFIG.TEMPORAL_THRESHOLDS[param];
    const statThr = TRUST_CONFIG.STATIC_THRESHOLDS[param];
    const driftThr = TRUST_CONFIG.DRIFT_THRESHOLDS[param];

    if (!history || history.length < 2) {
        return { score: scores.normal, level: 'normal', cause: ROOT_CAUSE.NORMAL, info: 'insufficient history' };
    }

    // ── Static / frozen sensor ──
    const range = Math.max(...history) - Math.min(...history);
    if (range < statThr) {
        return {
            score: scores.static,
            level: 'static',
            cause: ROOT_CAUSE.STATIC,
            info:  `Range ${range.toFixed(3)} < ${statThr} — sensor appears frozen`,
        };
    }

    // ── Drift detection (slow shift) ──
    if (driftHistory.length >= 5) {
        const slope = Math.abs(linearSlope(driftHistory));
        if (slope > driftThr) {
            return {
                score: scores.drift,
                level: 'drift',
                cause: ROOT_CAUSE.DRIFT,
                info:  `Slope ${slope.toFixed(4)} per reading > ${driftThr} — possible calibration drift`,
            };
        }
    }

    // ── Spike detection ──
    const mu = mean(history);
    if (mu === 0) return { score: scores.normal, level: 'normal', cause: ROOT_CAUSE.NORMAL, info: 'mean is zero' };

    const changePct = (Math.abs(newVal - mu) / Math.abs(mu)) * 100;

    let level, cause;
    if (changePct <= thresh.normal) {
        level = 'normal'; cause = ROOT_CAUSE.NORMAL;
    } else if (changePct <= thresh.moderate) {
        level = 'moderate'; cause = ROOT_CAUSE.SPIKE;
    } else {
        level = 'extreme'; cause = ROOT_CAUSE.SPIKE;
    }

    return {
        score: scores[level],
        level,
        cause,
        info: `${changePct.toFixed(1)}% change from mean (${mu.toFixed(2)})`,
    };
}


// ───────────────────────────────────────────────────────────────
// STEP 2 — CROSS-SENSOR AGREEMENT
// Detects: ZONE_MISMATCH vs FIELD_EVENT
// Key upgrade: if ALL zone sensors also changed → FIELD_EVENT (real)
//              if only THIS sensor is different → ZONE_MISMATCH (fault)
// Formula: deviation% = |val - zoneMean| / zoneMean × 100
// ───────────────────────────────────────────────────────────────

function computeCrossScore(param, val, zoneReadings, zoneHistories = []) {
    const scores = TRUST_CONFIG.CROSS_SCORES;
    const thresh = TRUST_CONFIG.CROSS_THRESHOLDS[param];

    if (!zoneReadings || zoneReadings.length === 0) {
        return { score: scores.normal, level: 'normal', cause: ROOT_CAUSE.NORMAL, info: 'no neighbours available' };
    }

    const zoneMean = mean(zoneReadings);
    if (zoneMean === 0) return { score: scores.normal, level: 'normal', cause: ROOT_CAUSE.NORMAL, info: 'zone mean is zero' };

    const devPct = (Math.abs(val - zoneMean) / Math.abs(zoneMean)) * 100;

    let level, cause;
    if (devPct <= thresh.normal) {
        level = 'normal'; cause = ROOT_CAUSE.NORMAL;
    } else if (devPct <= thresh.moderate) {
        level = 'moderate'; cause = ROOT_CAUSE.ZONE_MISMATCH;
    } else {
        // ── Distinguish sensor fault vs field event ──
        // If zone neighbours also changed significantly from their own history → real field event
        let neighboursAlsoChanged = false;
        if (zoneHistories.length > 0) {
            const neighbourChanges = zoneHistories.map(hist => {
                if (!hist || hist.length < 2) return 0;
                const hMean = mean(hist);
                if (hMean === 0) return 0;
                return (Math.abs(zoneReadings[zoneHistories.indexOf(hist)] - hMean) / Math.abs(hMean)) * 100;
            });
            const avgNeighbourChange = mean(neighbourChanges);
            neighboursAlsoChanged = avgNeighbourChange > thresh.normal;
        }

        if (neighboursAlsoChanged) {
            // All sensors moved together — this is a real field event, not a fault
            level = 'moderate';
            cause = ROOT_CAUSE.FIELD_EVENT;
        } else {
            // Only this sensor is different — likely a fault
            level = 'extreme';
            cause = ROOT_CAUSE.ZONE_MISMATCH;
        }
    }

    return {
        score: scores[level],
        level,
        cause,
        info: `${devPct.toFixed(1)}% deviation from zone mean (${zoneMean.toFixed(2)})`,
    };
}


// ───────────────────────────────────────────────────────────────
// STEP 3 — PHYSICAL PLAUSIBILITY
// Detects: IMPOSSIBLE_VALUE, WEATHER_MISMATCH
// Start at 1.0, subtract penalties for context mismatches
// ───────────────────────────────────────────────────────────────

function computePhysicalScore(reading, {
    prevPh = null,
    prevEc = null,
    airTemp = null,
    isRaining = false,
    irrigationActive = false,   // NEW: irrigation context
} = {}) {
    const limits    = TRUST_CONFIG.PHYSICAL_LIMITS;
    const penalties = TRUST_CONFIG.PHYSICAL_PENALTIES;
    const scores    = TRUST_CONFIG.PHYSICAL_SCORES;
    const flags     = [];
    const causes    = [];

    // ── Hard violations → IMPOSSIBLE_VALUE ──
    for (const [param, { min, max }] of Object.entries(limits)) {
        const val = reading[param];
        if (val !== null && val !== undefined && (val < min || val > max)) {
            return {
                score:  scores.extreme,
                level:  'extreme',
                causes: [ROOT_CAUSE.IMPOSSIBLE_VALUE],
                flags:  [`IMPOSSIBLE: ${param} = ${val} out of bounds [${min}–${max}]`],
            };
        }
    }

    let score = 1.0;

    // High moisture — only flag if NEITHER rain NOR irrigation explains it
    if (reading.moisture > 85 && !isRaining && !irrigationActive) {
        score -= penalties.HIGH_MOISTURE_NO_RAIN;
        causes.push(ROOT_CAUSE.WEATHER_MISMATCH);
        flags.push(`Moisture ${reading.moisture}% high — no rain or irrigation active (−${penalties.HIGH_MOISTURE_NO_RAIN})`);
    }

    if (airTemp !== null) {
        const diff = Math.abs(reading.temperature - airTemp);
        if (diff > 10) {
            score -= penalties.SOIL_AIR_TEMP_GAP;
            causes.push(ROOT_CAUSE.WEATHER_MISMATCH);
            flags.push(`Soil(${reading.temperature}°C) vs Air(${airTemp}°C) gap = ${diff.toFixed(1)}°C (−${penalties.SOIL_AIR_TEMP_GAP})`);
        }
    }

    if (prevPh !== null) {
        const phJump = Math.abs(reading.ph - prevPh);
        if (phJump > 1.5) {
            score -= penalties.PH_JUMP;
            causes.push(ROOT_CAUSE.SPIKE);
            flags.push(`pH jumped ${phJump.toFixed(2)} units (−${penalties.PH_JUMP})`);
        }
    }

    if (prevEc !== null && prevEc > 0) {
        const ecChangePct = (Math.abs(reading.ec - prevEc) / prevEc) * 100;
        if (ecChangePct > 25) {
            score -= penalties.EC_SPIKE;
            causes.push(ROOT_CAUSE.SPIKE);
            flags.push(`EC spiked ${ecChangePct.toFixed(1)}% (−${penalties.EC_SPIKE})`);
        }
    }

    score = Math.max(scores.extreme, score);
    const level = score >= 0.9 ? 'normal' : score >= 0.6 ? 'moderate' : 'extreme';
    if (causes.length === 0) causes.push(ROOT_CAUSE.NORMAL);

    return { score, level, causes, flags };
}


// ───────────────────────────────────────────────────────────────
// STEP 4 — PARAMETER TRUST
// Formula: T_param = 0.4×Temporal + 0.4×Cross + 0.2×Physical
// ───────────────────────────────────────────────────────────────

function computeParamTrust(temporalScore, crossScore, physicalScore) {
    const { TEMPORAL, CROSS, PHYSICAL } = TRUST_CONFIG.WEIGHTS;
    return parseFloat((TEMPORAL * temporalScore + CROSS * crossScore + PHYSICAL * physicalScore).toFixed(4));
}


// ───────────────────────────────────────────────────────────────
// STEP 5 — SENSOR TRUST
// Formula: SensorTrust = (T_moisture + T_temp + T_ec + T_ph) / 4
// ───────────────────────────────────────────────────────────────

function computeSensorTrust(paramTrusts) {
    const values = Object.values(paramTrusts);
    return parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(4));
}


// ───────────────────────────────────────────────────────────────
// STEP 6 — INTERPRET TRUST SCORE
// ───────────────────────────────────────────────────────────────

function interpretTrust(score) {
    const { HIGHLY_RELIABLE, RELIABLE, UNCERTAIN, UNRELIABLE } = TRUST_CONFIG.TRUST_BANDS;
    if (score >= HIGHLY_RELIABLE) return { status: 'Healthy',   label: 'Highly Reliable', action: 'Safe to act on data' };
    if (score >= RELIABLE)        return { status: 'Healthy',   label: 'Reliable',         action: 'Continue monitoring' };
    if (score >= UNCERTAIN)       return { status: 'Warning',   label: 'Uncertain',        action: 'Verify manually' };
    if (score >= UNRELIABLE)      return { status: 'Anomalous', label: 'Unreliable',       action: 'Investigate sensor' };
    return                               { status: 'Anomalous', label: 'Anomaly',          action: 'Ignore reading — fault detected' };
}


// ───────────────────────────────────────────────────────────────
// IMPROVEMENT 12 — SEVERITY PRIORITIZATION
// Based on root causes and trust score
// ───────────────────────────────────────────────────────────────

function computeSeverity(sensorTrustScore, rootCauses, onlineStatus) {
    if (!onlineStatus.online)                                   return SEVERITY.CRITICAL;
    if (rootCauses.includes(ROOT_CAUSE.IMPOSSIBLE_VALUE))       return SEVERITY.CRITICAL;
    if (sensorTrustScore < 0.15)                                return SEVERITY.CRITICAL;
    if (rootCauses.includes(ROOT_CAUSE.ZONE_MISMATCH) &&
        sensorTrustScore < 0.5)                                 return SEVERITY.HIGH;
    if (rootCauses.includes(ROOT_CAUSE.SPIKE) &&
        sensorTrustScore < 0.5)                                 return SEVERITY.HIGH;
    if (rootCauses.includes(ROOT_CAUSE.STATIC))                 return SEVERITY.HIGH;
    if (rootCauses.includes(ROOT_CAUSE.DRIFT))                  return SEVERITY.MEDIUM;
    if (rootCauses.includes(ROOT_CAUSE.WEATHER_MISMATCH))       return SEVERITY.MEDIUM;
    if (sensorTrustScore < 0.65)                                return SEVERITY.LOW;
    return SEVERITY.NONE;
}


// ───────────────────────────────────────────────────────────────
// IMPROVEMENT 9 — SENSOR HEALTH TREND
// Analyses recent trust score history to detect degradation
// ───────────────────────────────────────────────────────────────

function computeHealthTrend(recentTrustScores) {
    if (!recentTrustScores || recentTrustScores.length < 3) {
        return { trend: 'stable', slope: 0, info: 'insufficient history for trend' };
    }

    const scores = recentTrustScores.map(t => t.score);
    const slope  = linearSlope(scores);

    let trend;
    if      (slope >  0.01) trend = 'improving';
    else if (slope < -0.01) trend = 'degrading';
    else                    trend = 'stable';

    // Count recent anomalies
    const recentAnomalies = recentTrustScores.filter(t => t.status === 'Anomalous').length;
    const anomalyRate = recentAnomalies / recentTrustScores.length;

    return {
        trend,
        slope:        parseFloat(slope.toFixed(4)),
        anomalyRate:  parseFloat(anomalyRate.toFixed(2)),
        info:         `${trend} (slope: ${slope.toFixed(4)}, anomaly rate: ${(anomalyRate * 100).toFixed(0)}%)`,
    };
}


// ───────────────────────────────────────────────────────────────
// IMPROVEMENT 1+3 — ROOT CAUSE CLASSIFIER
// Final decision: sensor fault or real field event?
// ───────────────────────────────────────────────────────────────

function classifyRootCauses(paramDetails, physical, onlineStatus) {
    const causes = new Set();

    if (!onlineStatus.online) {
        causes.add(ROOT_CAUSE.SENSOR_OFFLINE);
        return [...causes];
    }

    for (const d of Object.values(paramDetails)) {
        if (d.temporalCause !== ROOT_CAUSE.NORMAL) causes.add(d.temporalCause);
        if (d.crossCause    !== ROOT_CAUSE.NORMAL) causes.add(d.crossCause);
    }

    for (const c of physical.causes) {
        if (c !== ROOT_CAUSE.NORMAL) causes.add(c);
    }

    if (causes.size === 0) causes.add(ROOT_CAUSE.NORMAL);
    return [...causes];
}


// ───────────────────────────────────────────────────────────────
// IMPROVEMENT 6 — HUMAN-READABLE DIAGNOSTIC MESSAGE
// "Temperature sensor shows sudden spike and differs from nearby
//  sensors. Possible sensor fault." — not just "Anomaly detected"
// ───────────────────────────────────────────────────────────────

function buildDiagnosticMessage(paramDetails, rootCauses, sensorTrustScore, healthTrend) {
    const parts = [];

    // Which parameters are faulty?
    const faultyParams = Object.entries(paramDetails)
        .filter(([, d]) => d.paramTrust < 0.5)
        .map(([param]) => param);

    if (faultyParams.length > 0) {
        parts.push(`Low trust on: ${faultyParams.join(', ')} probe(s).`);
    }

    if (rootCauses.includes(ROOT_CAUSE.SENSOR_OFFLINE)) {
        parts.push('Sensor appears offline or not transmitting.');
    }
    if (rootCauses.includes(ROOT_CAUSE.IMPOSSIBLE_VALUE)) {
        parts.push('Impossible sensor value detected — hardware fault likely.');
    }
    if (rootCauses.includes(ROOT_CAUSE.STATIC)) {
        parts.push('One or more probes are frozen (no variation) — possible stuck sensor.');
    }
    if (rootCauses.includes(ROOT_CAUSE.DRIFT)) {
        parts.push('Slow drift detected — sensor may need recalibration.');
    }
    if (rootCauses.includes(ROOT_CAUSE.SPIKE) && !rootCauses.includes(ROOT_CAUSE.FIELD_EVENT)) {
        parts.push('Sudden spike detected and neighbours are stable — likely sensor fault.');
    }
    if (rootCauses.includes(ROOT_CAUSE.FIELD_EVENT)) {
        parts.push('Spike detected but zone neighbours also changed — likely a real field event (rain/irrigation).');
    }
    if (rootCauses.includes(ROOT_CAUSE.ZONE_MISMATCH)) {
        parts.push('Reading deviates significantly from zone — isolated sensor issue.');
    }
    if (rootCauses.includes(ROOT_CAUSE.WEATHER_MISMATCH)) {
        parts.push('Reading does not match environmental context — check physical conditions.');
    }
    if (healthTrend.trend === 'degrading') {
        parts.push(`Sensor health is degrading (anomaly rate: ${(healthTrend.anomalyRate * 100).toFixed(0)}%).`);
    }
    if (rootCauses.includes(ROOT_CAUSE.NORMAL)) {
        parts.push('All checks passed — sensor is operating normally.');
    }

    return parts.join(' ');
}


// ───────────────────────────────────────────────────────────────
// MAIN: evaluateTrustScore
// ───────────────────────────────────────────────────────────────

export async function evaluateTrustScore(sensorId) {
    try {
        const sensor = await prisma.sensor.findUnique({
            where: { id: sensorId },
            include: {
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take:    50,
                },
                trustScores: {
                    orderBy: { lastEvaluated: 'desc' },
                    take:    TRUST_CONFIG.TREND_WINDOW,   // for health trend
                },
            },
        });

        if (!sensor || sensor.readings.length < 5) {
            return null;
        }

        const readings = sensor.readings;
        const latest   = readings[0];
        const previous = readings[1] ?? null;
        const history  = readings.slice(1, TRUST_CONFIG.HISTORY_WINDOW  + 1);
        const driftWin = readings.slice(1, TRUST_CONFIG.DRIFT_WINDOW    + 1);

        // ── Improvement 8: Offline / missing data check ──
        const onlineStatus = checkOnlineStatus(latest.timestamp, readings.slice(0, 10));
        if (!onlineStatus.online) {
            const offlineResult = await prisma.trustScore.create({
                data: {
                    sensorId:        sensor.id,
                    score:           0.0,
                    status:          'Anomalous',
                    label:           'Sensor Offline',
                    rootCauses:      [ROOT_CAUSE.SENSOR_OFFLINE],
                    severity:        SEVERITY.CRITICAL,
                    diagnostic:      onlineStatus.info,
                    lowVariance:     false,
                    spikeDetected:   false,
                    zoneAnomaly:     false,
                    paramMoisture:    0,
                    paramTemperature: 0,
                    paramEc:          0,
                    paramPh:          0,
                    flags:           [onlineStatus.info],
                    healthTrend:     'unknown',
                    healthSlope:     0,
                    anomalyRate:     0,
                },
            });
            await createMaintenanceTicket({
                sensorId: sensor.id,
                issue:    onlineStatus.info,
                severity: SEVERITY.CRITICAL,
            });
            return offlineResult;
        }

        const currentReading = {
            moisture: latest.moisture,
            temperature: latest.temperature,
            ec: latest.ec,
            ph: latest.ph,
        };

        const historyArrays = {
            moisture: history.map(r => r.moisture).filter(v => v !== null),
            temperature: history.map(r => r.temperature).filter(v => v !== null),
            ec: history.map(r => r.ec).filter(v => v !== null),
            ph: history.map(r => r.ph).filter(v => v !== null),
        };

        const driftArrays = {
            moisture:    driftWin.map(r => r.moisture).filter(v => v !== null),
            temperature: driftWin.map(r => r.temperature).filter(v => v !== null),
            ec:          driftWin.map(r => r.ec).filter(v => v !== null),
            ph:          driftWin.map(r => r.ph).filter(v => v !== null),
        };

        // ── Zone sensors (with their own histories for field event detection) ──
        const zoneSensors = await prisma.sensor.findMany({
            where: { zone: sensor.zone, id: { not: sensorId } },
            include: {
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take:    TRUST_CONFIG.HISTORY_WINDOW + 1,
                },
            },
        });

        const zoneArrays = {
            moisture: zoneSensors.map(s => s.readings[0]?.moisture).filter(v => v != null),
            temperature: zoneSensors.map(s => s.readings[0]?.temperature).filter(v => v != null),
            ec: zoneSensors.map(s => s.readings[0]?.ec).filter(v => v != null),
            ph: zoneSensors.map(s => s.readings[0]?.ph).filter(v => v != null),
        };

        // Zone histories for field event vs fault differentiation
        const zoneHistories = {
            moisture:    zoneSensors.map(s => s.readings.slice(1).map(r => r.moisture).filter(v => v != null)),
            temperature: zoneSensors.map(s => s.readings.slice(1).map(r => r.temperature).filter(v => v != null)),
            ec:          zoneSensors.map(s => s.readings.slice(1).map(r => r.ec).filter(v => v != null)),
            ph:          zoneSensors.map(s => s.readings.slice(1).map(r => r.ph).filter(v => v != null)),
        };

        // ── Physical check (shared) ──
        const physical = computePhysicalScore(currentReading, {
            prevPh:           previous?.ph          ?? null,
            prevEc:           previous?.ec          ?? null,
            airTemp:          latest.airTemp         ?? null,
            isRaining:        latest.isRaining       ?? false,
            irrigationActive: latest.irrigationActive ?? false,
        });

        // ── Per-parameter trust ──
        const params       = ['moisture', 'temperature', 'ec', 'ph'];
        const paramDetails = {};
        const paramTrusts = {};

        for (const param of params) {
            const temporal = computeTemporalScore(
                param,
                currentReading[param],
                historyArrays[param],
                driftArrays[param],
            );
            const cross = computeCrossScore(
                param,
                currentReading[param],
                zoneArrays[param],
                zoneHistories[param],
            );
            const trust = computeParamTrust(temporal.score, cross.score, physical.score);

            paramDetails[param] = {
                value:         currentReading[param],
                temporal:      temporal.score,
                temporalInfo:  temporal.info,
                temporalLevel: temporal.level,
                temporalCause: temporal.cause,
                cross:         cross.score,
                crossInfo:     cross.info,
                crossLevel:    cross.level,
                crossCause:    cross.cause,
                physical:      physical.score,
                paramTrust:    trust,
            };

            paramTrusts[param] = trust;
        }

        // ── Sensor trust ──
        const sensorTrustScore = computeSensorTrust(paramTrusts);
        const { status, label, action } = interpretTrust(sensorTrustScore);

        // ── Root cause classification ──
        const rootCauses = classifyRootCauses(paramDetails, physical, onlineStatus);

        // ── Severity ──
        const severity = computeSeverity(sensorTrustScore, rootCauses, onlineStatus);

        // ── Health trend (improvement 9) ──
        const healthTrend = computeHealthTrend(sensor.trustScores);

        // ── Diagnostic message (improvement 6) ──
        const diagnostic = buildDiagnosticMessage(paramDetails, rootCauses, sensorTrustScore, healthTrend);

        // ── Collect flags ──
        const allFlags     = [...physical.flags];
        const lowVariance  = params.some(p => paramDetails[p].temporalLevel === 'static');
        const spikeDetected = params.some(p => paramDetails[p].temporalCause === ROOT_CAUSE.SPIKE);
        const zoneAnomaly  = params.some(p => paramDetails[p].crossCause === ROOT_CAUSE.ZONE_MISMATCH);

        if (lowVariance)    allFlags.push('Static sensor — no variation detected');
        if (spikeDetected)  allFlags.push('Spike detected in one or more parameters');
        if (zoneAnomaly)    allFlags.push('Isolated zone deviation — possible sensor fault');

        // ── Save to DB ──
        const trustScore = await prisma.trustScore.create({
            data: {
                sensorId:         sensor.id,
                score:            sensorTrustScore,
                status,
                label,
                rootCauses,
                severity,
                diagnostic,
                lowVariance,
                spikeDetected,
                zoneAnomaly,
                paramMoisture:    paramTrusts.moisture,
                paramTemperature: paramTrusts.temperature,
                paramEc:          paramTrusts.ec,
                paramPh:          paramTrusts.ph,
                flags:            allFlags,
                healthTrend:      healthTrend.trend,
                healthSlope:      healthTrend.slope,
                anomalyRate:      healthTrend.anomalyRate,
            },
        });

        // ── Maintenance ticket — only for real faults, not field events ──
        if (status === 'Anomalous' && !rootCauses.includes(ROOT_CAUSE.FIELD_EVENT)) {
            await createMaintenanceTicket({
                sensorId: sensor.id,
                issue:    diagnostic,
                severity,
            });
        }

        return {
            ...trustScore,
            paramDetails,
            rootCauses,
            healthTrend,
            action,
            diagnostic,
        };

    } catch (error) {
        console.error(`Trust evaluation failed for sensor ${sensorId}:`, error);
        throw error;
    }
}


// ───────────────────────────────────────────────────────────────
// getTrustScoreDistribution — dashboard summary
// ───────────────────────────────────────────────────────────────

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

        const distribution = {
            healthy:   0,
            warning:   0,
            anomalous: 0,
            offline:   0,
            bySeverity: { Critical: 0, High: 0, Medium: 0, Low: 0, None: 0 },
        };

        sensors.forEach(sensor => {
            if (sensor.trustScores.length > 0) {
                const ts = sensor.trustScores[0];
                if      (ts.status === 'Healthy')   distribution.healthy++;
                else if (ts.status === 'Warning')   distribution.warning++;
                else if (ts.status === 'Anomalous') distribution.anomalous++;

                if (ts.rootCauses?.includes(ROOT_CAUSE.SENSOR_OFFLINE)) distribution.offline++;
                if (ts.severity && distribution.bySeverity[ts.severity] !== undefined) {
                    distribution.bySeverity[ts.severity]++;
                }
            }
        });

        return distribution;
    } catch (error) {
        throw new Error(`Failed to get trust score distribution: ${error.message}`);
    }
}


// ───────────────────────────────────────────────────────────────
// getTrustHistory — past trust scores for one sensor
// ───────────────────────────────────────────────────────────────

export async function getTrustHistory(sensorId, limit = 20) {
    try {
        const history = await prisma.trustScore.findMany({
            where: { sensorId },
            orderBy: { lastEvaluated: 'desc' },
            take: limit,
            select: {
                id:               true,
                score:            true,
                status:           true,
                label:            true,
                rootCauses:       true,
                severity:         true,
                diagnostic:       true,
                lowVariance:      true,
                spikeDetected:    true,
                zoneAnomaly:      true,
                paramMoisture:    true,
                paramTemperature: true,
                paramEc:          true,
                paramPh:          true,
                flags:            true,
                healthTrend:      true,
                healthSlope:      true,
                anomalyRate:      true,
                lastEvaluated:    true,
            },
        });
        return history;
    } catch (error) {
        throw new Error(`Failed to get trust history for sensor ${sensorId}: ${error.message}`);
    }
}


// ───────────────────────────────────────────────────────────────
// EXPORTS
// ───────────────────────────────────────────────────────────────

export {
    computeTemporalScore,
    computeCrossScore,
    computePhysicalScore,
    computeParamTrust,
    computeSensorTrust,
    computeHealthTrend,
    computeSeverity,
    interpretTrust,
    classifyRootCauses,
    buildDiagnosticMessage,
    checkOnlineStatus,
    TRUST_CONFIG,
};