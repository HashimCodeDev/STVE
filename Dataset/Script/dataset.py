import json
import random
import math
from datetime import datetime, timedelta

# Configuration
NUM_FIELDS = 5
SENSORS_PER_FIELD = 10
HISTORICAL_DAYS = 7
REALTIME_DAYS = 1
HOURS_PER_DAY = 24

now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
realtime_start = now - timedelta(days=REALTIME_DAYS)
historical_start = realtime_start - timedelta(days=HISTORICAL_DAYS)

def generate_sensor_data(field_id_num, is_realtime):
    field_id = f"zone_{field_id_num}"
    
    # Base field metrics
    base_sm = 25.0 + (field_id_num * 2.0)
    base_ec = 1.0 + (field_id_num * 0.1)
    base_temp = 20.0 + (field_id_num * 0.5)
    base_ph = 6.2 + (field_id_num * 0.1) # New pH baseline per zone
    
    start_time = realtime_start if is_realtime else historical_start
    total_hours = HOURS_PER_DAY if is_realtime else (HISTORICAL_DAYS * HOURS_PER_DAY)
    
    field_data = {"field_id": field_id, "sensors": []}
    
    for sensor_offset in range(1, SENSORS_PER_FIELD + 1):
        global_sensor_id = (field_id_num - 1) * SENSORS_PER_FIELD + sensor_offset
        sensor_id = f"s_{global_sensor_id:02d}"
        
        battery = random.randint(50, 80) if is_realtime else random.randint(80, 100)
        readings = []
        
        for hour in range(total_hours):
            current_time = start_time + timedelta(hours=hour)
            
            # Natural Variations
            diurnal_temp_shift = (hour % 24 - 12) * 0.4 
            
            # Simulate natural irrigation/drying cycles (3-day macro variance)
            # This creates smooth, expected variations of roughly ±3.5% moisture
            macro_sm_variance = math.sin(hour / (24 * 3) * math.pi) * 3.5 
            
            sm = base_sm + macro_sm_variance + random.uniform(-1.0, 1.0)
            ec = base_ec + (macro_sm_variance * 0.02) + random.uniform(-0.03, 0.03) # EC slightly follows moisture
            temp = base_temp + diurnal_temp_shift + random.uniform(-0.5, 0.5)
            ph = base_ph + random.uniform(-0.05, 0.05) # pH changes very slowly
            
            # -------------------------------------------------------------------
            # Anomaly Injection Logic (ONLY applies to the real-time dataset)
            # -------------------------------------------------------------------
            if is_realtime:
                # Field 2: Static Data (Silent Failure)
                if field_id_num == 2 and global_sensor_id == 15:
                    battery = 2
                    sm, ec, temp, ph = 27.5, 1.2, 21.0, 6.4 # Completely frozen
                
                # Field 3: Erratic Data (Spikes)
                elif field_id_num == 3 and global_sensor_id == 25:
                    if hour in [4, 11, 18]:
                        sm = round(random.uniform(90.0, 100.0), 2)
                        ec = round(random.uniform(6.0, 9.5), 2)
                        ph = round(random.uniform(2.0, 4.0), 2) # Impossible sudden pH drop
                
                # Field 4: Calibration Drift
                elif field_id_num == 4 and global_sensor_id == 35:
                    drift_step = 8.0 / 24 
                    sm = sm - (drift_step * hour) 
                    ph = ph + ((0.5 / 24) * hour) # pH falsely drifting up
                
                # Field 5: Cross-Sensor Inconsistency
                elif field_id_num == 5 and global_sensor_id == 45:
                    sm = sm - 12.0 # Statistically detached from the zone's base_sm
                    ph = ph - 0.8  

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

        field_data["sensors"].append({
            "sensor_id": sensor_id,
            "status": "offline" if battery <= 5 else "active",
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
            "rainfall_mm": 0.0 
        })
    return weather_data

# 1. Generate Historical Data (7 Days, Clean variance)
for i in range(1, NUM_FIELDS + 1):
    hist_data = generate_sensor_data(i, is_realtime=False)
    with open(f"historical_field_{i}.json", 'w') as f:
        json.dump(hist_data, f, indent=2)

# 2. Generate Real-Time Data (1 Day, With Anomalies)
for i in range(1, NUM_FIELDS + 1):
    rt_data = generate_sensor_data(i, is_realtime=True)
    with open(f"realtime_field_{i}.json", 'w') as f:
        json.dump(rt_data, f, indent=2)

# 3. Generate Real-Time Weather Data
weather = generate_weather_data()
with open("weather_realtime.json", 'w') as f:
    json.dump(weather, f, indent=2)

print("Successfully generated 11 JSON files (Historical with natural variance, Realtime, Weather).")