# Probos Demo Dataset - Sensor Distribution Guide

## 📊 Overview

The realtime sensor dataset has been regenerated with **deliberate patterns** to showcase the Trust Engine's ability to detect Healthy, Warning, and Anomalous sensors.

### Distribution Summary
- **🟢 Healthy:** 35 sensors (70%)
- **🟡 Warning:** 10 sensors (20%)  
- **🔴 Anomalous:** 5 sensors (10%)
  - 3 Spike sensors
  - 2 Static sensors

**Total:** 50 sensors across 5 fields

---

## 🔍 Sensor Type Examples

### 1️⃣ Healthy Sensors (70%)

**Example: s_01 (zone_1)**

```json
{
  "timestamp": "2026-02-20T15:00:00Z",
  "soil_moisture": 30.51,  // Stable around zone average
  "ec": 1.13,
  "soil_temperature": 15.21,
  "ph": 6.47
}
...
{
  "timestamp": "2026-02-21T14:00:00Z",
  "soil_moisture": 31.45,  // Small variation (±1-2%)
  "ec": 1.18,
  "soil_temperature": 24.35,
  "ph": 6.42
}
```

**Characteristics:**
- Moisture varies naturally (±1-2% per reading)
- Values stay close to zone average (~30% for zone_1)
- No sudden jumps or static behavior
- Temperature increases gradually through the day

**Expected Trust Score:** 85-95 (Highly Reliable)

**Healthy sensors:** s_01 to s_06, s_11 to s_16, s_21 to s_26, s_31 to s_37, s_41 to s_46, plus s_20, s_30, s_49, s_50

---

### 2️⃣ Warning Sensors - Drift Pattern (20%)

**Example: s_07 (zone_1)**

```json
// Early readings (normal)
{
  "timestamp": "2026-02-20T15:00:00Z",
  "soil_moisture": 27.21,  // Starts normal
  "ec": 1.06,
  "soil_temperature": 15.28
}
...
// Middle readings (drifting)
{
  "timestamp": "2026-02-21T06:00:00Z",
  "soil_moisture": 40.12,  // Gradually increasing
  "ec": 1.38
}
...
// Final readings (concerning)
{
  "timestamp": "2026-02-21T14:00:00Z",
  "soil_moisture": 50.15,  // Ends at 50% (high but not extreme)
  "ec": 1.60
}
```

**Characteristics:**
- **Progressive drift** from ~27% → ~50% over 24 hours
- EC also increases gradually (1.06 → 1.60)
- Deviates significantly from zone mean (~30%)
- No sudden spike - smooth transition

**Expected Trust Score:** 60-75 (Warning/Uncertain)

**Warning sensors:** s_07, s_08, s_17, s_18, s_27, s_28, s_38, s_39, s_47, s_48

---

### 3️⃣ Anomalous Sensors - Spike Pattern (3 sensors)

**Example: s_09 (zone_1)**

```json
// Before spike (readings 0-15)
{
  "timestamp": "2026-02-21T06:00:00Z",
  "soil_moisture": 29.62,  // Normal
  "ec": 1.27,
  "soil_temperature": 21.09
}
// SUDDEN SPIKE (reading 16+)
{
  "timestamp": "2026-02-21T07:00:00Z",
  "soil_moisture": 91.51,  // Unrealistic jump! 📈
  "ec": 3.41,              // EC also spikes
  "soil_temperature": 21.24
}
...
{
  "timestamp": "2026-02-21T14:00:00Z",
  "soil_moisture": 92.43,  // Stays high
  "ec": 3.17
}
```

**Characteristics:**
- **Sudden jump** from ~30% → ~90% moisture
- EC spikes from ~1.2 → ~3.4 (physically unrealistic)
- Happens at reading 16 (out of 24)
- Zone average is ~30%, so 90% is extreme outlier
- No rain event to explain high moisture

**Expected Trust Score:** <30 (Anomalous)

**Triggers:**
- ✅ Spike detected (temporal check)
- ✅ Zone anomaly (cross-sensor deviation >50%)
- ✅ Physical plausibility penalty (high moisture without rain)

**Spike sensors:** s_09, s_19, s_29

---

### 4️⃣ Anomalous Sensors - Static/Frozen Pattern (2 sensors)

**Example: s_10 (zone_1)**

```json
// All 24 readings are IDENTICAL
{
  "timestamp": "2026-02-20T15:00:00Z",
  "soil_moisture": 42.0,
  "ec": 1.1,
  "soil_temperature": 29.0,
  "ph": 6.3
}
{
  "timestamp": "2026-02-20T16:00:00Z",
  "soil_moisture": 42.0,  // Same
  "ec": 1.1,              // Same
  "soil_temperature": 29.0, // Same
  "ph": 6.3               // Same
}
...
{
  "timestamp": "2026-02-21T14:00:00Z",
  "soil_moisture": 42.0,  // Still same!
  "ec": 1.1,
  "soil_temperature": 29.0,
  "ph": 6.3
}
```

**Characteristics:**
- **Zero variation** across all 24 readings
- Values never change (stuck/frozen sensor)
- Range = 0.0 (max - min)

**Expected Trust Score:** <25 (Anomalous)

**Triggers:**
- ✅ Low variance detected (temporal check fails)
- ✅ Static sensor threshold violation
- ✅ Trust score drops to 0.2 (temporal score for static sensors)

**Static sensors:** s_10, s_40

---

## 🎯 Trust Engine Detection Logic

### Temporal Stability (40% weight)

**Healthy:** Small variation from rolling mean (<25% for moisture)  
**Warning:** Moderate drift (25-60% change from mean)  
**Anomalous:** Extreme spike (>60% change) OR static (range < 0.5%)

### Cross-Sensor Agreement (40% weight)

**Healthy:** Within zone mean ±25%  
**Warning:** Deviation 25-50% from zone mean  
**Anomalous:** Deviation >50% from zone mean

### Physical Plausibility (20% weight)

**Penalties applied for:**
- High moisture (>85%) with no rain
- Soil vs air temp difference >10°C
- pH jump >1.5 units
- EC spike >25%

---

## 🚀 Testing the Dataset

### 1. Reset cron state
```bash
cd backend
pnpm run realtime:reset
```

### 2. Start continuous ingestion
```bash
pnpm run realtime:continuous
```

### 3. Watch the dashboard

After ~2-3 batches, you should see:
- **Healthy:** 35 sensors (green)
- **Warning:** 10 sensors (yellow)
- **Anomalous:** 5 sensors (red)

### 4. Verify specific sensors

**Check a healthy sensor:**
```bash
curl http://localhost:3000/api/sensors/s_01/trust-history
```
Expected: Trust score ~0.85-0.95

**Check a warning sensor:**
```bash
curl http://localhost:3000/api/sensors/s_07/trust-history
```
Expected: Trust score ~0.60-0.75, `spikeDetected: false`, `zoneAnomaly: true`

**Check an anomalous spike sensor:**
```bash
curl http://localhost:3000/api/sensors/s_09/trust-history
```
Expected: Trust score <0.30, `spikeDetected: true`, `zoneAnomaly: true`

**Check an anomalous static sensor:**
```bash
curl http://localhost:3000/api/sensors/s_10/trust-history
```
Expected: Trust score <0.25, `lowVariance: true`

---

## 📋 Sensor Reference Table

| Sensor ID | Zone | Type | Expected Status | Key Pattern |
|-----------|------|------|----------------|-------------|
| s_01-s_06 | zone_1 | Healthy | Healthy | Stable ~30% |
| s_07, s_08 | zone_1 | Warning | Warning | Drift to 48-52% |
| s_09 | zone_1 | Anomalous | Anomalous | Spike to 90% |
| s_10 | zone_1 | Anomalous | Anomalous | Static 42% |
| s_11-s_16 | zone_2 | Healthy | Healthy | Stable ~32% |
| s_17, s_18 | zone_2 | Warning | Warning | Drift to 50-54% |
| s_19 | zone_2 | Anomalous | Anomalous | Spike to 88-95% |
| s_20 | zone_2 | Healthy | Healthy | Stable ~32% |
| s_21-s_26 | zone_3 | Healthy | Healthy | Stable ~28% |
| s_27, s_28 | zone_3 | Warning | Warning | Drift to 48-52% |
| s_29 | zone_3 | Anomalous | Anomalous | Spike to 90% |
| s_30 | zone_3 | Healthy | Healthy | Stable ~28% |
| s_31-s_37 | zone_4 | Healthy | Healthy | Stable ~31% |
| s_38, s_39 | zone_4 | Warning | Warning | Drift to 50-55% |
| s_40 | zone_4 | Anomalous | Anomalous | Static 42% |
| s_41-s_46 | zone_5 | Healthy | Healthy | Stable ~29% |
| s_47, s_48 | zone_5 | Warning | Warning | Drift to 48-53% |
| s_49, s_50 | zone_5 | Healthy | Healthy | Stable ~29% |

---

## 🎓 Demo Walkthrough

### Narrative for Presentation

1. **Start with clean state:**
   - "We have 50 sensors across 5 agricultural zones"
   - "Most are functioning normally, but some have issues"

2. **Run the cron job:**
   - "Our real-time ingestion pipeline starts collecting data"
   - "The Trust Engine evaluates each sensor's reliability"

3. **Show the distribution:**
   - "70% are healthy - these show stable, expected values"
   - "20% are in warning state - showing gradual drift that needs monitoring"
   - "10% are anomalous - either stuck sensors or unrealistic spikes"

4. **Drill into examples:**
   - **Healthy (s_01):** "Normal variation, within expected ranges"
   - **Warning (s_07):** "Moisture climbing from 27% to 50% - could indicate irrigation issue or sensor calibration drift"
   - **Spike (s_09):** "Sudden jump to 90% with no rain - clear sensor malfunction"
   - **Static (s_10):** "Completely frozen at 42% for 24 hours - hardware failure"

5. **Show automated response:**
   - "System automatically creates maintenance tickets for anomalous sensors"
   - "Field teams get prioritized work orders"
   - "Farmers still have reliable data from healthy sensors"

---

## ✅ Validation Checklist

- [ ] All 5 JSON files generated successfully
- [ ] Each file has 10 sensors with 24 readings
- [ ] Healthy sensors show small variation (±1-2%)
- [ ] Warning sensors show drift pattern (start ~30%, end ~50%)
- [ ] Spike sensors show sudden jump (normal → 90%+)
- [ ] Static sensors show identical values across all readings
- [ ] Distribution is exactly 35/10/5 (Healthy/Warning/Anomalous)
- [ ] Zone averages differ slightly (zone_1: 30%, zone_2: 32%, etc.)
- [ ] Cron job successfully ingests data
- [ ] Dashboard shows correct distribution after ingestion
- [ ] Trust scores match expected ranges
- [ ] Maintenance tickets created for anomalous sensors

---

## 🔧 Troubleshooting

**Dashboard shows all healthy?**
- Ensure cron has run enough batches (at least 10 readings ingested per sensor)
- Check if trust engine is evaluating after each reading insertion
- Verify HISTORY_WINDOW in trustEngine.js (should be 10)

**Trust scores not as expected?**
- Check TRUST_CONFIG thresholds in trustEngine.js
- Verify zone mean calculation includes all sensors in the zone
- Review temporal/cross/physical weights (should be 0.4/0.4/0.2)

**Sensors not creating tickets?**
- Check if status === 'Anomalous' condition triggers ticket creation
- Verify maintenance ticket creation in trustEngine.js (around line 415)

---

Generated: 2026-02-21  
Script: Dataset/Script/generate_realtime_demo.py
