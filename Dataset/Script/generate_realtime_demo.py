"""
Generate Realtime Sensor Data for Probos Demo
Creates sensor datasets with deliberate Healthy, Warning, and Anomalous patterns
"""

import json
from datetime import datetime, timedelta
import random

# Configuration
START_TIME = datetime(2026, 2, 20, 15, 0, 0)
NUM_READINGS = 24  # Hourly readings
OUTPUT_DIR = "../Realtime"

# Sensor distribution per field (10 sensors each)
# Format: (sensor_id, type, zone)
SENSOR_CONFIG = {
    "zone_1": [
        # Healthy (6 sensors)
        ("s_01", "healthy"),
        ("s_02", "healthy"),
        ("s_03", "healthy"),
        ("s_04", "healthy"),
        ("s_05", "healthy"),
        ("s_06", "healthy"),
        # Warning - Drift (2 sensors)
        ("s_07", "warning_drift"),
        ("s_08", "warning_drift"),
        # Anomalous (2 sensors)
        ("s_09", "anomalous_spike"),
        ("s_10", "anomalous_static"),
    ],
    "zone_2": [
        ("s_11", "healthy"),
        ("s_12", "healthy"),
        ("s_13", "healthy"),
        ("s_14", "healthy"),
        ("s_15", "healthy"),
        ("s_16", "healthy"),
        ("s_17", "warning_drift"),
        ("s_18", "warning_drift"),
        ("s_19", "anomalous_spike"),
        ("s_20", "healthy"),
    ],
    "zone_3": [
        ("s_21", "healthy"),
        ("s_22", "healthy"),
        ("s_23", "healthy"),
        ("s_24", "healthy"),
        ("s_25", "healthy"),
        ("s_26", "healthy"),
        ("s_27", "warning_drift"),
        ("s_28", "warning_drift"),
        ("s_29", "anomalous_spike"),
        ("s_30", "healthy"),
    ],
    "zone_4": [
        ("s_31", "healthy"),
        ("s_32", "healthy"),
        ("s_33", "healthy"),
        ("s_34", "healthy"),
        ("s_35", "healthy"),
        ("s_36", "healthy"),
        ("s_37", "healthy"),
        ("s_38", "warning_drift"),
        ("s_39", "warning_drift"),
        ("s_40", "anomalous_static"),
    ],
    "zone_5": [
        ("s_41", "healthy"),
        ("s_42", "healthy"),
        ("s_43", "healthy"),
        ("s_44", "healthy"),
        ("s_45", "healthy"),
        ("s_46", "healthy"),
        ("s_47", "warning_drift"),
        ("s_48", "warning_drift"),
        ("s_49", "healthy"),
        ("s_50", "healthy"),
    ],
}


def generate_healthy_reading(base_moisture, timestamp_idx):
    """Generate realistic healthy sensor readings with slight variation"""
    # Small random variation per reading
    moisture_variation = random.uniform(-1.5, 1.5)
    
    return {
        "timestamp": (START_TIME + timedelta(hours=timestamp_idx)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "soil_moisture": round(base_moisture + moisture_variation, 2),
        "ec": round(random.uniform(1.0, 1.3), 2),
        "soil_temperature": round(15 + (timestamp_idx * 0.4) + random.uniform(-0.5, 0.5), 2),
        "ph": round(random.uniform(6.2, 6.5), 2),
    }


def generate_warning_drift_readings(start_moisture, end_moisture):
    """Generate readings that drift from normal to concerning levels"""
    readings = []
    
    for i in range(NUM_READINGS):
        # Linear drift from start to end
        progress = i / (NUM_READINGS - 1)
        current_moisture = start_moisture + (end_moisture - start_moisture) * progress
        
        # Add small noise
        current_moisture += random.uniform(-1.0, 1.0)
        
        readings.append({
            "timestamp": (START_TIME + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "soil_moisture": round(current_moisture, 2),
            "ec": round(1.1 + (progress * 0.5) + random.uniform(-0.05, 0.05), 2),
            "soil_temperature": round(15 + (i * 0.4) + random.uniform(-0.3, 0.3), 2),
            "ph": round(6.3 + random.uniform(-0.1, 0.1), 2),
        })
    
    return readings


def generate_anomalous_spike_readings(zone_avg_moisture):
    """Generate readings with sudden unrealistic spike"""
    readings = []
    spike_at = 16  # Spike happens at reading 16 (out of 24)
    
    for i in range(NUM_READINGS):
        if i < spike_at:
            # Normal before spike
            moisture = zone_avg_moisture + random.uniform(-2, 2)
        else:
            # Sudden spike to unrealistic high value
            moisture = random.uniform(88, 95)
        
        readings.append({
            "timestamp": (START_TIME + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "soil_moisture": round(moisture, 2),
            "ec": round(random.uniform(1.0, 1.3) if i < spike_at else random.uniform(2.8, 3.5), 2),
            "soil_temperature": round(15 + (i * 0.4) + random.uniform(-0.5, 0.5), 2),
            "ph": round(random.uniform(6.2, 6.4), 2),
        })
    
    return readings


def generate_anomalous_static_readings():
    """Generate identical readings (frozen/stuck sensor)"""
    # Fixed values - no variation
    STATIC_MOISTURE = 42.0
    STATIC_EC = 1.1
    STATIC_TEMP = 29.0
    STATIC_PH = 6.3
    
    readings = []
    
    for i in range(NUM_READINGS):
        readings.append({
            "timestamp": (START_TIME + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "soil_moisture": STATIC_MOISTURE,
            "ec": STATIC_EC,
            "soil_temperature": STATIC_TEMP,
            "ph": STATIC_PH,
        })
    
    return readings


def generate_sensor_data(sensor_id, sensor_type, zone_avg_moisture):
    """Generate complete sensor data based on type"""
    
    if sensor_type == "healthy":
        # Healthy sensors vary slightly around zone average
        base_moisture = zone_avg_moisture + random.uniform(-3, 3)
        readings = [generate_healthy_reading(base_moisture, i) for i in range(NUM_READINGS)]
        status = "active"
        battery = random.randint(50, 90)
    
    elif sensor_type == "warning_drift":
        # Start normal, drift to concerning levels
        start_moisture = zone_avg_moisture + random.uniform(-2, 2)
        end_moisture = random.uniform(48, 55)  # High enough to trigger warning
        readings = generate_warning_drift_readings(start_moisture, end_moisture)
        status = "active"
        battery = random.randint(40, 70)
    
    elif sensor_type == "anomalous_spike":
        # Sudden spike to unrealistic values
        readings = generate_anomalous_spike_readings(zone_avg_moisture)
        status = "active"
        battery = random.randint(30, 60)
    
    elif sensor_type == "anomalous_static":
        # Frozen sensor - identical readings
        readings = generate_anomalous_static_readings()
        status = "active"
        battery = random.randint(20, 50)
    
    else:
        raise ValueError(f"Unknown sensor type: {sensor_type}")
    
    return {
        "sensor_id": sensor_id,
        "status": status,
        "battery_level": battery,
        "readings": readings,
    }


def generate_field_data(zone_id, sensors_config):
    """Generate complete field JSON file"""
    
    # Zone-specific average moisture (for healthy sensors)
    zone_avg_moisture = {
        "zone_1": 30.0,
        "zone_2": 32.0,
        "zone_3": 28.0,
        "zone_4": 31.0,
        "zone_5": 29.0,
    }
    
    avg_moisture = zone_avg_moisture[zone_id]
    
    sensors = []
    for sensor_id, sensor_type in sensors_config:
        sensor_data = generate_sensor_data(sensor_id, sensor_type, avg_moisture)
        sensors.append(sensor_data)
    
    return {
        "field_id": zone_id,
        "sensors": sensors,
    }


def main():
    """Generate all realtime JSON files"""
    
    print("🔧 Generating Realtime Sensor Datasets for Demo")
    print("=" * 60)
    
    stats = {"healthy": 0, "warning": 0, "anomalous": 0}
    
    for zone_num, (zone_id, sensors_config) in enumerate(SENSOR_CONFIG.items(), 1):
        print(f"\n📁 Generating {zone_id}...")
        
        field_data = generate_field_data(zone_id, sensors_config)
        
        # Count sensor types
        for _, sensor_type in sensors_config:
            if sensor_type == "healthy":
                stats["healthy"] += 1
            elif "warning" in sensor_type:
                stats["warning"] += 1
            elif "anomalous" in sensor_type:
                stats["anomalous"] += 1
        
        # Write to file
        output_file = f"{OUTPUT_DIR}/realtime_field_{zone_num}.json"
        with open(output_file, "w") as f:
            json.dump(field_data, f, indent=2)
        
        print(f"   ✅ Written to {output_file}")
        print(f"   📊 {len(sensors_config)} sensors, {len(field_data['sensors'][0]['readings'])} readings each")
    
    print("\n" + "=" * 60)
    print("✅ Dataset generation complete!")
    print(f"\n📊 Distribution Summary:")
    print(f"   🟢 Healthy:    {stats['healthy']} sensors ({stats['healthy']/50*100:.0f}%)")
    print(f"   🟡 Warning:    {stats['warning']} sensors ({stats['warning']/50*100:.0f}%)")
    print(f"   🔴 Anomalous:  {stats['anomalous']} sensors ({stats['anomalous']/50*100:.0f}%)")
    print(f"\n   Total: {sum(stats.values())} sensors")
    
    print("\n📝 Sensor Type Details:")
    print("   🟢 Healthy: Stable values with small natural variation")
    print("   🟡 Warning: Gradual drift from normal to concerning levels")
    print("   🔴 Anomalous Spike: Sudden unrealistic jumps (moisture >90%)")
    print("   🔴 Anomalous Static: Frozen sensor (identical readings)")
    
    print("\n🚀 Next Steps:")
    print("   1. Reset cron state: cd backend && pnpm run realtime:reset")
    print("   2. Start cron job: pnpm run realtime:continuous")
    print("   3. Check dashboard for sensor health distribution")


if __name__ == "__main__":
    main()
