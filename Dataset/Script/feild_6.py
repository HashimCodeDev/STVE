import json
import random
import math
from datetime import datetime, timedelta

# Configuration
FIELD_ID_NUM = 6
SENSORS_PER_FIELD = 10
HISTORICAL_DAYS = 7
REALTIME_DAYS = 1
HOURS_PER_DAY = 24

# Anchor timestamps
now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
realtime_start = now - timedelta(days=REALTIME_DAYS)
historical_start = realtime_start - timedelta(days=HISTORICAL_DAYS)

def generate_field_6_data(is_realtime):
    field_id = f"zone_{FIELD_ID_NUM}"
    
    # Establish Field 6 Baselines
    base_sm = 25.0 + (FIELD_ID_NUM * 2.0)  # 37.0
    base_ec = 1.0 + (FIELD_ID_NUM * 0.1)   # 1.6
    base_temp = 20.0 + (FIELD_ID_NUM * 0.5) # 23.0
    base_ph = 6.2 + (FIELD_ID_NUM * 0.1)   # 6.8
    
    start_time = realtime_start if is_realtime else historical_start
    total_hours = HOURS_PER_DAY if is_realtime else (HISTORICAL_DAYS * HOURS_PER_DAY)
    
    field_data = {"field_id": field_id, "sensors": []}
    anomalous_in_field = []
    
    for sensor_offset in range(1, SENSORS_PER_FIELD + 1):
        global_sensor_id = (FIELD_ID_NUM - 1) * SENSORS_PER_FIELD + sensor_offset
        sensor_id = f"s_{global_sensor_id:02d}"
        
        battery = random.randint(50, 80) if is_realtime else random.randint(80, 100)
        readings = []
        is_anomalous = False
        anomaly_type = "Clean"
        
        for hour in range(total_hours):
            current_time = start_time + timedelta(hours=hour)
            
            # Natural variations to clear STATIC_THRESHOLDS
            diurnal_temp_shift = (hour % 24 - 12) * 0.4 
            macro_sm_variance = math.sin(hour / (24 * 3) * math.pi) * 3.5 
            
            sm = base_sm + macro_sm_variance + random.uniform(-1.0, 1.0) 
            ec = base_ec + (macro_sm_variance * 0.02) + random.uniform(-0.05, 0.05) 
            temp = base_temp + diurnal_temp_shift + random.uniform(-0.5, 0.5) 
            ph = base_ph + random.uniform(-0.05, 0.05) 
            
            # -------------------------------------------------------------------
            # Targeted Anomaly Injection for Field 6 (Real-time only)
            # -------------------------------------------------------------------
            if is_realtime:
                # s_56: Static Data (Frozen)
                if sensor_id == "s_56":
                    sm, ec, temp, ph = 37.5, 1.6, 23.0, 6.8
                    is_anomalous = True
                    anomaly_type = "Static Data (Frozen R=0)"

                # s_57: Erratic Data (Spikes)
                elif sensor_id == "s_57":
                    if hour in [8, 16]:
                        sm = 95.0
                        ec = 8.5
                    is_anomalous = True
                    anomaly_type = "Erratic Data (Spikes)"

                # s_58: Calibration Drift
                elif sensor_id == "s_58":
                    drift_step = 15.0 / 24 
                    sm = sm - (drift_step * hour) 
                    is_anomalous = True
                    anomaly_type = "Calibration Drift"

                # s_59: Cross-Sensor Inconsistency
                elif sensor_id == "s_59":
                    sm = sm - 18.0 # Permanently detached from mu_zone
                    is_anomalous = True
                    anomaly_type = "Cross-Sensor Inconsistency"

            reading = {
                "timestamp": current_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "soil_moisture": round(sm, 2),
                "ec": round(ec, 2),
                "soil_temperature": round(temp, 2),
                "ph": round(ph, 2)
            }
            readings.append(reading)
            
            # Simulate normal battery drain
            if hour > 0 and hour % 24 == 0 and battery > 5:
                battery -= random.randint(1, 2)

        if is_realtime and is_anomalous:
            anomalous_in_field.append({"id": sensor_id, "type": anomaly_type})

        field_data["sensors"].append({
            "sensor_id": sensor_id,
            "status": "active",
            "battery_level": battery,
            "readings": readings
        })
        
    return field_data, anomalous_in_field

# 1. Generate Historical Data (Field 6)
hist_data, _ = generate_field_6_data(is_realtime=False)
with open(f"historical_field_6.json", 'w') as f:
    json.dump(hist_data, f, indent=2)

# 2. Generate Real-Time Data (Field 6)
rt_data, anomalies = generate_field_6_data(is_realtime=True)
with open(f"realtime_field_6.json", 'w') as f:
    json.dump(rt_data, f, indent=2)

# Output Summary
print("✅ Field 6 Dataset Generation Complete.")
print(f"Generated historical_field_6.json and realtime_field_6.json")
print("-" * 50)
print("Anomalous Sensors Injected into Field 6:")
for item in anomalies:
    print(f" -> {item['id']}: {item['type']}")
print(" -> All other sensors (s_51-s_55, s_60) generated clean baseline data.")