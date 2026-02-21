import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini AI Module
 * Processes trust engine JSON output and returns
 * clear, human-readable diagnostic summaries
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });


// ───────────────────────────────────────────────────────────────
// PROMPT BUILDER
// Converts raw trust engine JSON into a structured prompt
// ───────────────────────────────────────────────────────────────

function buildPrompt(type, data) {
    const base = `
You are a precision agricultural IoT diagnostic assistant.
You receive sensor trust engine output in JSON and explain it clearly.
Be concise, factual, and actionable. No fluff. Use plain English.
Always structure your response exactly as requested.
`;

    switch (type) {

        case 'single_sensor':
            return `${base}
Here is the trust engine result for one sensor:

${JSON.stringify(data, null, 2)}

Respond in this exact structure:

SENSOR: [sensorId]
STATUS: [status] — [label]
TRUST SCORE: [score out of 1.0]
SEVERITY: [severity]

PARAMETER BREAKDOWN:
- Moisture:     [paramMoisture] → [good/moderate/poor]
- Temperature:  [paramTemperature] → [good/moderate/poor]
- EC:           [paramEc] → [good/moderate/poor]
- pH:           [paramPh] → [good/moderate/poor]

ROOT CAUSES: [list causes in plain English, one per line]

DIAGNOSIS:
[2-3 sentences explaining what is wrong and why, based on the diagnostic field and root causes]

ACTION REQUIRED:
[1-2 sentences on what the engineer or farmer should do next]

HEALTH TREND: [improving / stable / degrading] — [one sentence explanation]
`;

        case 'dashboard':
            return `${base}
Here is the dashboard summary from the trust engine:

${JSON.stringify(data, null, 2)}

Respond in this exact structure:

FLEET OVERVIEW:
- Total Sensors: [total]
- Healthy: [healthy] | Warning: [warning] | Anomalous: [anomalous] | Offline: [offline]

SEVERITY BREAKDOWN:
- Critical: [count] sensors need immediate attention
- High: [count] sensors have confirmed faults
- Medium: [count] sensors need verification
- Low: [count] sensors to monitor

ZONE HEALTH:
[For each zone, one line: Zone [name] — [avgScore] avg score, [degrading] degrading]

TICKET STATUS:
[Summarise open/resolved tickets in 1-2 sentences]

OVERALL ASSESSMENT:
[2-3 sentences on the overall health of the sensor network and top priority action]
`;

        case 'zone':
            return `${base}
Here are the zone statistics from the trust engine:

${JSON.stringify(data, null, 2)}

For each zone respond with:

ZONE: [zone name]
  Health:   [healthy]/[total] healthy ([percentage]%)
  Avg Score: [avgScore]
  Trend:    [X] sensors degrading
  Offline:  [offline] offline
  Priority: [Low / Medium / High / Critical — one sentence why]

End with:
WORST ZONE: [zone] — [reason in one sentence]
BEST ZONE:  [zone] — [reason in one sentence]
`;

        case 'tickets':
            return `${base}
Here is the list of maintenance tickets from the sensor system:

${JSON.stringify(data, null, 2)}

Respond in this exact structure:

TICKET SUMMARY:
- Total:    [count]
- Open:     [count]
- Resolved: [count]

CRITICAL ISSUES:
[List only Critical/High severity open tickets, one line each:
 → [sensorId] — [issue] — Open since [createdAt]]

PATTERNS NOTICED:
[1-2 sentences — are the same sensors failing repeatedly? same zone? same fault type?]

RECOMMENDED NEXT ACTIONS:
[2-3 bullet points on what to prioritise and why]
`;

        case 'timeline':
            return `${base}
Here is the trust score timeline for a sensor:

${JSON.stringify(data, null, 2)}

Respond in this structure:

TIMELINE ANALYSIS ([count] evaluations over [period])

TREND: [improving / stable / degrading]
AVERAGE SCORE: [avg]
LOWEST POINT: [score] at [timestamp]
HIGHEST POINT: [score] at [timestamp]

PATTERN OBSERVED:
[2-3 sentences describing what happened over time — spikes, drift, recovery, etc.]

RECOMMENDATION:
[1-2 sentences on what action to take based on the trend]
`;

        default:
            return `${base}
Analyse this trust engine data and provide a clear, concise summary:

${JSON.stringify(data, null, 2)}
`;
    }
}


// ───────────────────────────────────────────────────────────────
// CORE GEMINI CALL
// ───────────────────────────────────────────────────────────────

export async function analyseWithGemini(type, data) {
    try {
        const prompt = buildPrompt(type, data);
        const result = await model.generateContent(prompt);
        const text   = result.response.text().trim();
        return { success: true, analysis: text };
    } catch (error) {
        console.error('Gemini analysis failed:', error.message);
        return { success: false, error: error.message, analysis: null };
    }
}


// ───────────────────────────────────────────────────────────────
// PUBLIC FUNCTIONS
// ───────────────────────────────────────────────────────────────

/**
 * Analyse a single sensor trust result
 * Input: result from evaluateTrustScore()
 */
export async function analyseSensorTrust(trustResult) {
    return analyseWithGemini('single_sensor', trustResult);
}

/**
 * Analyse the full dashboard summary
 * Input: result from getDashboardSummary()
 */
export async function analyseDashboard(dashboardData) {
    return analyseWithGemini('dashboard', dashboardData);
}

/**
 * Analyse zone statistics
 * Input: result from getZoneStatistics()
 */
export async function analyseZones(zoneData) {
    return analyseWithGemini('zone', zoneData);
}

/**
 * Analyse a sensor's health timeline
 * Input: result from getHealthTimeline()
 */
export async function analyseTimeline(timelineData) {
    return analyseWithGemini('timeline', timelineData);
}

/**
 * Analyse a batch ingestion result
 * Input: result from ingestBatchReadings()
 */
export async function analyseBatchResult(batchResult) {
    const summary = {
        total:    batchResult.length,
        success:  batchResult.filter(r => r.success).length,
        failed:   batchResult.filter(r => !r.success).length,
        trustScores: batchResult
            .filter(r => r.success && r.data?.trustScore)
            .map(r => r.data.trustScore),
    };
    return analyseWithGemini('dashboard', summary);
}