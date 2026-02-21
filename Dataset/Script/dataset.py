import json
import random
import math
from datetime import datetime, timedelta

# Configuration
NUM_FIELDS = 5
SENSORS_PER_FIELD = 4
HISTORICAL_DAYS = 3
REALTIME_DAYS = 1
HOURS_PER_DAY = 6

now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
realtime_start = now - timedelta(days=REALTIME_DAYS)
historical_start = realtime_start - timedelta(days=HISTORICAL_DAYS)

def generate_weather_data():
    weather_data = {"location": "KIREAP_Deployment_Area", "forecast": []}
    for hour in range(HOURS_PER_DAY):
        current_time = realtime_start + timedelta(hours=hour)
        diurnal_temp_shift = (hour % 24 - 12) * 0.4
        weather_data["forecast"].append({
            "timestamp": current_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "ambient_temp": round(22.0 + diurnal_temp_shift + random.uniform(-1.0, 1.0), 1),
            "humidity": round(random.uniform(50.0, 60.0), 1),
            "rainfall_mm": 0.0 # Strict zero for HIGH_MOISTURE_NO_RAIN check
        })
    return weather_data

def generate_sensor_data(field_id_num, is_realtime):
    field_id = f"zone_{field_id_num}"
    base_sm = 25.0 + (field_id_num * 2.0)
    base_ec = 1.0 + (field_id_num * 0.1)
    base_temp = 20.0 + (field_id_num * 0.5)
    base_ph = 6.2 + (field_id_num * 0.1) 
    
    start_time = realtime_start if is_realtime else historical_start
    total_hours = HOURS_PER_DAY if is_realtime else (HISTORICAL_DAYS * HOURS_PER_DAY)
    
    field_data = {"field_id": field_id, "sensors": []}
    anomalous_in_field = []
    
    for sensor_offset in range(1, SENSORS_PER_FIELD + 1):
        global_sensor_id = (field_id_num - 1) * SENSORS_PER_FIELD + sensor_offset
        sensor_id = f"s_{global_sensor_id:02d}"
        
        battery = random.randint(50, 80) if is_realtime else random.randint(80, 100)
        readings = []
        is_anomalous = False 
        
        for hour in range(total_hours):
            current_time = start_time + timedelta(hours=hour)
            diurnal_temp_shift = (hour % 24 - 12) * 0.4 
            macro_sm_variance = math.sin(hour / (24 * 3) * math.pi) * 3.5 
            
            # Natural variance must exceed STATIC_THRESHOLDS
            sm = base_sm + macro_sm_variance + random.uniform(-1.0, 1.0) # Range > 0.5
            ec = base_ec + (macro_sm_variance * 0.02) + random.uniform(-0.05, 0.05) # Range > 0.05
            temp = base_temp + diurnal_temp_shift + random.uniform(-0.5, 0.5) # Range > 0.2
            ph = base_ph + random.uniform(-0.05, 0.05) # Range > 0.05
            
            if is_realtime:
                # FIELD 2 (Multiple)
                if sensor_id == "s_12": # Static Detection (All R = 0)
                    sm, ec, temp, ph = 26.0, 1.1, 21.0, 6.3
                    is_anomalous = True
                elif sensor_id == "s_15": # SOIL_AIR_TEMP_GAP (> 10C diff)
                    temp = temp + 15.0 
                    is_anomalous = True
                elif sensor_id == "s_18": # Temporal Temp Extreme (> 15% change)
                    if hour == 12: temp *= 1.25 
                    is_anomalous = True

                # FIELD 3 (Multiple)
                elif sensor_id == "s_23": # PH_JUMP and EC_SPIKE
                    if hour in [10, 11]:
                        ec *= 1.4
                        ph -= 2.0
                    is_anomalous = True
                elif sensor_id == "s_28": # HIGH_MOISTURE_NO_RAIN
                    if hour in [14, 15]: sm = 90.0
                    is_anomalous = True
                elif sensor_id == "s_29": # Absolute Limit Violation (pH < 3)
                    if hour == 20: ph = 2.0
                    is_anomalous = True

                # FIELD 4 (Multiple)
                elif sensor_id == "s_34": # Cross Deviation Extreme Moisture (> 50%)
                    sm *= 0.4 
                    is_anomalous = True
                elif sensor_id == "s_37": # Partial Static Detection
                    sm, ec = 28.0, 1.2 # Temp and pH fluctuate normally
                    is_anomalous = True
                elif sensor_id == "s_39": # Absolute Limit Violation (EC > 10)
                    if hour == 8: ec = 12.0
                    is_anomalous = True

                # FIELD 5 (Multiple)
                elif sensor_id == "s_42": # Cross Deviation (Temp and pH)
                    temp *= 1.15
                    ph *= 1.10
                    is_anomalous = True
                elif sensor_id == "s_45": # Multi-failure extreme
                    if hour in [5, 18]:
                        sm = 95.0
                        ec = 8.5
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
            anomalous_in_field.append(sensor_id)

        field_data["sensors"].append({
            "sensor_id": sensor_id,
            "status": "active",
            "battery_level": battery,
            "readings": readings
        })
        
    return field_data, anomalous_in_field

all_anomalies = []

# Generate Historical
for i in range(1, NUM_FIELDS + 1):
    hist_data, _ = generate_sensor_data(i, is_realtime=False)
    with open(f"historical_field_{i}.json", 'w') as f:
        json.dump(hist_data, f, indent=2)

# Generate Real-Time
for i in range(1, NUM_FIELDS + 1):
    rt_data, anomalies = generate_sensor_data(i, is_realtime=True)
    all_anomalies.extend(anomalies)
    with open(f"realtime_field_{i}.json", 'w') as f:
        json.dump(rt_data, f, indent=2)

# Generate Weather
weather = generate_weather_data()
with open("weather_realtime.json", 'w') as f:
    json.dump(weather, f, indent=2)

print("\n--- STVE Dataset Generation Complete ---")
print(f"Total Anomalous Sensors Injected: {len(all_anomalies)}")
print("Target IDs to verify via Engine algorithms:")
for sensor in set(all_anomalies):
    print(f" -> {sensor}")