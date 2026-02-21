import json
import random
import math
from datetime import datetime, timedelta

# Configuration
NUM_FIELDS = 5
SENSORS_PER_FIELD = 10
HISTORICAL_DAYS = 3
REALTIME_DAYS = 1
HOURS_PER_DAY = 12

now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
realtime_start = now - timedelta(days=REALTIME_DAYS)
historical_start = realtime_start - timedelta(days=HISTORICAL_DAYS)

anomalous_sensors = [] # Tracker for the final output

def generate_sensor_data(field_id_num, is_realtime):
    field_id = f"zone_{field_id_num}"
    
    base_sm = 25.0 + (field_id_num * 2.0)
    base_ec = 1.0 + (field_id_num * 0.1)
    base_temp = 20.0 + (field_id_num * 0.5)
    base_ph = 6.2 + (field_id_num * 0.1) 
    
    start_time = realtime_start if is_realtime else historical_start
    total_hours = HOURS_PER_DAY if is_realtime else (HISTORICAL_DAYS * HOURS_PER_DAY)
    
    field_data = {"field_id": field_id, "sensors": []}
    
    for sensor_offset in range(1, SENSORS_PER_FIELD + 1):
        global_sensor_id = (field_id_num - 1) * SENSORS_PER_FIELD + sensor_offset
        sensor_id = f"s_{global_sensor_id:02d}"
        
        battery = random.randint(50, 80) if is_realtime else random.randint(80, 100)
        readings = []
        
        # Track if we flag this sensor to avoid duplicates in the print list
        is_anomalous = False 
        
        for hour in range(total_hours):
            current_time = start_time + timedelta(hours=hour)
            diurnal_temp_shift = (hour % 24 - 12) * 0.4 
            macro_sm_variance = math.sin(hour / (24 * 3) * math.pi) * 3.5 
            
            sm = base_sm + macro_sm_variance + random.uniform(-1.0, 1.0)
            ec = base_ec + (macro_sm_variance * 0.02) + random.uniform(-0.03, 0.03)
            temp = base_temp + diurnal_temp_shift + random.uniform(-0.5, 0.5)
            ph = base_ph + random.uniform(-0.05, 0.05)
            
            # -------------------------------------------------------------------
            # Formula-Specific Anomaly Injection (Real-time only)
            # -------------------------------------------------------------------
            if is_realtime:
                # FIELD 2 -------------------------------------------------------
                if sensor_id == "s_12": # Static Detection (R = 0)
                    sm, ec, temp, ph = 26.0, 1.1, 21.0, 6.3
                    is_anomalous = True
                    
                elif sensor_id == "s_15": # Temp Physical Plausibility (>10C diff)
                    if hour > 10:
                        temp = temp + 12.0 
                    is_anomalous = True

                # FIELD 3 -------------------------------------------------------
                elif sensor_id == "s_23": # Temporal Erratic (% Change)
                    if hour in [5, 14, 20]:
                        ec = round(random.uniform(5.0, 8.0), 2)
                        ph = round(random.uniform(2.0, 3.5), 2)
                    is_anomalous = True
                    
                elif sensor_id == "s_28": # Moisture Physical Plausibility (No rain)
                    if hour in [8, 9, 10]:
                        sm = sm + 45.0
                    is_anomalous = True

                # FIELD 4 -------------------------------------------------------
                elif sensor_id == "s_34": # Cross-Sensor Agreement Drift
                    drift_step = 18.0 / 24 
                    sm = sm - (drift_step * hour) 
                    is_anomalous = True
                    
                elif sensor_id == "s_37": # Partial Static Detection (Moisture R=0)
                    sm = 31.5 # Only moisture is frozen, others fluctuate
                    is_anomalous = True

                # FIELD 5 -------------------------------------------------------
                elif sensor_id == "s_42": # Cross-Sensor Deviation (Baseline shift)
                    sm = sm - 15.0 
                    is_anomalous = True
                    
                elif sensor_id == "s_48": # Multi-failure (Erratic + Temp)
                    if hour % 4 == 0:
                        sm = sm + 30.0
                        temp = temp - 15.0
                        ec = ec * 4
                    is_anomalous = True

            reading = {
                "timestamp": current_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "soil_moisture": round(sm, 2),
                "ec": round(ec, 2),
                "soil_temperature": round(temp, 2),
                "ph": round(ph, 2)
            }
            readings.append(reading)
            
            if hour > 0 and hour % 24 == 0 and battery > 5:
                battery -= random.randint(1, 2)

        if is_realtime and is_anomalous:
            anomalous_sensors.append(sensor_id)

        field_data["sensors"].append({
            "sensor_id": sensor_id,
            "status": "active",
            "battery_level": battery,
            "readings": readings
        })
        
    return field_data

def generate_weather_data():
    weather_data = {"location": "KIREAP_Deployment_Area", "forecast": []}
    for hour in range(HOURS_PER_DAY):
        current_time = realtime_start + timedelta(hours=hour)
        diurnal_temp_shift = (hour % 24 - 12) * 0.4
        
        weather_data["forecast"].append({
            "timestamp": current_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "ambient_temp": round(22.0 + diurnal_temp_shift + random.uniform(-1.0, 1.0), 1),
            "humidity": round(random.uniform(50.0, 60.0), 1),
            "rainfall_mm": 0.0 # Strict zero to ensure s_28 fails physical plausibility
        })
    return weather_data

# 1. Generate Historical Data
for i in range(1, NUM_FIELDS + 1):
    hist_data = generate_sensor_data(i, is_realtime=False)
    with open(f"historical_field_{i}.json", 'w') as f:
        json.dump(hist_data, f, indent=2)

# 2. Generate Real-Time Data 
for i in range(1, NUM_FIELDS + 1):
    rt_data = generate_sensor_data(i, is_realtime=True)
    with open(f"realtime_field_{i}.json", 'w') as f:
        json.dump(rt_data, f, indent=2)

# 3. Generate Weather Data
weather = generate_weather_data()
with open("weather_realtime.json", 'w') as f:
    json.dump(weather, f, indent=2)

print("✅ Dataset Generation Complete.")
print("-" * 40)
print("Anomalous Sensors Injected (Target for STVE Engine):")
for sensor in anomalous_sensors:
    print(f" - {sensor}")