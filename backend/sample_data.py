from typing import List, Dict, Any
import sqlite3

SAMPLE_DATASETS: List[Dict[str, Any]] = [
    {
        "name": "24-Hour Residential Smart Meter Profile",
        "description": "Standard single-family suburban household electricity consumption over a 24-hour cycle showing morning and evening peak loads.",
        "unit": "kWh",
        "interval_type": "hourly",
        "records": [
            {"time_index": 0.0, "timestamp_str": "00:00", "consumption_value": 0.45, "temperature": 18.2, "notes": "Midnight baseline"},
            {"time_index": 1.0, "timestamp_str": "01:00", "consumption_value": 0.38, "temperature": 17.5, "notes": "Refrigeration & standby"},
            {"time_index": 2.0, "timestamp_str": "02:00", "consumption_value": 0.34, "temperature": 17.0, "notes": "Low base power"},
            {"time_index": 3.0, "timestamp_str": "03:00", "consumption_value": 0.32, "temperature": 16.8, "notes": "Deep sleep minimum"},
            {"time_index": 4.0, "timestamp_str": "04:00", "consumption_value": 0.35, "temperature": 16.5, "notes": "Pre-dawn baseline"},
            {"time_index": 5.0, "timestamp_str": "05:00", "consumption_value": 0.62, "temperature": 16.9, "notes": "Water heater startup"},
            {"time_index": 6.0, "timestamp_str": "06:00", "consumption_value": 1.45, "temperature": 17.8, "notes": "Morning wake-up ramp"},
            {"time_index": 7.0, "timestamp_str": "07:00", "consumption_value": 2.65, "temperature": 19.1, "notes": "Breakfast, showers, appliances"},
            {"time_index": 8.0, "timestamp_str": "08:00", "consumption_value": 2.10, "temperature": 21.0, "notes": "Departing for work"},
            {"time_index": 9.0, "timestamp_str": "09:00", "consumption_value": 1.15, "temperature": 23.4, "notes": "Daytime standby"},
            {"time_index": 10.0, "timestamp_str": "10:00", "consumption_value": 0.95, "temperature": 25.2, "notes": "Light domestic load"},
            {"time_index": 11.0, "timestamp_str": "11:00", "consumption_value": 1.05, "temperature": 27.0, "notes": "HVAC circulation"},
            {"time_index": 12.0, "timestamp_str": "12:00", "consumption_value": 1.35, "temperature": 28.5, "notes": "Midday meal prep"},
            {"time_index": 13.0, "timestamp_str": "13:00", "consumption_value": 1.10, "temperature": 29.2, "notes": "Afternoon idle"},
            {"time_index": 14.0, "timestamp_str": "14:00", "consumption_value": 1.25, "temperature": 29.8, "notes": "Cooling cycle"},
            {"time_index": 15.0, "timestamp_str": "15:00", "consumption_value": 1.40, "temperature": 30.1, "notes": "HVAC peak ambient"},
            {"time_index": 16.0, "timestamp_str": "16:00", "consumption_value": 1.85, "temperature": 29.5, "notes": "Residents returning home"},
            {"time_index": 17.0, "timestamp_str": "17:00", "consumption_value": 2.75, "temperature": 28.0, "notes": "EV charging plug-in & lights"},
            {"time_index": 18.0, "timestamp_str": "18:00", "consumption_value": 3.60, "temperature": 26.5, "notes": "Dinner cooking, stove & oven"},
            {"time_index": 19.0, "timestamp_str": "19:00", "consumption_value": 3.85, "temperature": 24.8, "notes": "Evening peak: TV, dishwasher, AC"},
            {"time_index": 20.0, "timestamp_str": "20:00", "consumption_value": 3.20, "temperature": 23.5, "notes": "High evening activity"},
            {"time_index": 21.0, "timestamp_str": "21:00", "consumption_value": 2.45, "temperature": 22.0, "notes": "Winding down, entertainment"},
            {"time_index": 22.0, "timestamp_str": "22:00", "consumption_value": 1.65, "temperature": 20.8, "notes": "Bedtime ramp-down"},
            {"time_index": 23.0, "timestamp_str": "23:00", "consumption_value": 0.85, "temperature": 19.5, "notes": "Late night standby"}
        ]
    },
    {
        "name": "Commercial Office Building (Summer AC Peak)",
        "description": "5-story commercial building demand curve in kilowatt (kW) displaying strong office hours HVAC and lighting dominance.",
        "unit": "kW",
        "interval_type": "hourly",
        "records": [
            {"time_index": 0.0, "timestamp_str": "00:00", "consumption_value": 18.5, "temperature": 22.0, "notes": "Server room base"},
            {"time_index": 2.0, "timestamp_str": "02:00", "consumption_value": 17.8, "temperature": 21.0, "notes": "Security & emergency lighting"},
            {"time_index": 4.0, "timestamp_str": "04:00", "consumption_value": 18.2, "temperature": 20.5, "notes": "Unoccupied chiller idle"},
            {"time_index": 6.0, "timestamp_str": "06:00", "consumption_value": 38.0, "temperature": 22.0, "notes": "Building pre-cooling cycle"},
            {"time_index": 8.0, "timestamp_str": "08:00", "consumption_value": 85.5, "temperature": 25.5, "notes": "Staff arrival, elevators, IT"},
            {"time_index": 10.0, "timestamp_str": "10:00", "consumption_value": 128.0, "temperature": 29.0, "notes": "Full office occupancy"},
            {"time_index": 12.0, "timestamp_str": "12:00", "consumption_value": 115.0, "temperature": 32.5, "notes": "Cafeteria & lunch break"},
            {"time_index": 14.0, "timestamp_str": "14:00", "consumption_value": 139.5, "temperature": 34.0, "notes": "Peak HVAC demand (ambient high)"},
            {"time_index": 16.0, "timestamp_str": "16:00", "consumption_value": 122.0, "temperature": 33.0, "notes": "Late afternoon work"},
            {"time_index": 18.0, "timestamp_str": "18:00", "consumption_value": 68.0, "temperature": 30.0, "notes": "Departure & lighting set-back"},
            {"time_index": 20.0, "timestamp_str": "20:00", "consumption_value": 32.0, "temperature": 27.0, "notes": "Cleaning crew & IT batch jobs"},
            {"time_index": 22.0, "timestamp_str": "22:00", "consumption_value": 21.0, "temperature": 24.5, "notes": "Night shutdown"}
        ]
    },
    {
        "name": "Solar Microgrid & Net Load Profile (Duck Curve)",
        "description": "Net grid load curve with 10 kW rooftop solar PV showcasing mid-day generation belly and rapid evening ramp rate.",
        "unit": "kW",
        "interval_type": "hourly",
        "records": [
            {"time_index": 0.0, "timestamp_str": "00:00", "consumption_value": 1.20, "temperature": 19.0, "notes": "Night baseline"},
            {"time_index": 3.0, "timestamp_str": "03:00", "consumption_value": 0.95, "temperature": 18.0, "notes": "Minimum base"},
            {"time_index": 6.0, "timestamp_str": "06:00", "consumption_value": 2.40, "temperature": 19.5, "notes": "Morning wake-up (solar 0)"},
            {"time_index": 8.0, "timestamp_str": "08:00", "consumption_value": 1.80, "temperature": 22.0, "notes": "Solar starts generating"},
            {"time_index": 10.0, "timestamp_str": "10:00", "consumption_value": 0.60, "temperature": 26.0, "notes": "Solar covers most load"},
            {"time_index": 12.0, "timestamp_str": "12:00", "consumption_value": 0.25, "temperature": 29.0, "notes": "Maximum solar generation 'belly'"},
            {"time_index": 14.0, "timestamp_str": "14:00", "consumption_value": 0.50, "temperature": 30.0, "notes": "High solar offsetting AC"},
            {"time_index": 16.0, "timestamp_str": "16:00", "consumption_value": 1.95, "temperature": 28.5, "notes": "Solar generation drops fast"},
            {"time_index": 18.0, "timestamp_str": "18:00", "consumption_value": 4.10, "temperature": 26.0, "notes": "Steep duck-curve evening ramp"},
            {"time_index": 20.0, "timestamp_str": "20:00", "consumption_value": 3.80, "temperature": 24.0, "notes": "Peak evening demand"},
            {"time_index": 22.0, "timestamp_str": "22:00", "consumption_value": 2.10, "temperature": 21.5, "notes": "Late evening reduction"}
        ]
    },
    {
        "name": "Annual Substation Demand (12 Months)",
        "description": "Monthly average substation energy throughput in Megawatt-hours (MWh) across the 12 calendar months.",
        "unit": "MWh",
        "interval_type": "monthly",
        "records": [
            {"time_index": 1.0, "timestamp_str": "Jan", "consumption_value": 480.0, "temperature": 4.0, "notes": "Winter heating demand"},
            {"time_index": 2.0, "timestamp_str": "Feb", "consumption_value": 450.0, "temperature": 6.0, "notes": "Winter moderate"},
            {"time_index": 3.0, "timestamp_str": "Mar", "consumption_value": 390.0, "temperature": 11.0, "notes": "Mild spring transition"},
            {"time_index": 4.0, "timestamp_str": "Apr", "consumption_value": 340.0, "temperature": 16.0, "notes": "Low seasonal demand"},
            {"time_index": 5.0, "timestamp_str": "May", "consumption_value": 360.0, "temperature": 21.0, "notes": "Spring baseline"},
            {"time_index": 6.0, "timestamp_str": "Jun", "consumption_value": 490.0, "temperature": 27.0, "notes": "Summer cooling ramp"},
            {"time_index": 7.0, "timestamp_str": "Jul", "consumption_value": 580.0, "temperature": 31.0, "notes": "Annual maximum cooling peak"},
            {"time_index": 8.0, "timestamp_str": "Aug", "consumption_value": 560.0, "temperature": 30.5, "notes": "High summer AC"},
            {"time_index": 9.0, "timestamp_str": "Sep", "consumption_value": 430.0, "temperature": 24.0, "notes": "Late summer decline"},
            {"time_index": 10.0, "timestamp_str": "Oct", "consumption_value": 350.0, "temperature": 17.0, "notes": "Autumn lull"},
            {"time_index": 11.0, "timestamp_str": "Nov", "consumption_value": 410.0, "temperature": 10.0, "notes": "Pre-winter heating onset"},
            {"time_index": 12.0, "timestamp_str": "Dec", "consumption_value": 495.0, "temperature": 5.0, "notes": "Holiday lighting & heating"}
        ]
    }
]

def seed_sample_datasets(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM datasets")
    count = cursor.fetchone()[0]
    
    if count == 0:
        for ds in SAMPLE_DATASETS:
            cursor.execute("""
                INSERT INTO datasets (name, description, unit, interval_type)
                VALUES (?, ?, ?, ?)
            """, (ds["name"], ds["description"], ds["unit"], ds["interval_type"]))
            ds_id = cursor.lastrowid
            
            for rec in ds["records"]:
                cursor.execute("""
                    INSERT INTO consumption_records (dataset_id, time_index, timestamp_str, consumption_value, temperature, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (ds_id, rec["time_index"], rec["timestamp_str"], rec["consumption_value"], rec.get("temperature"), rec.get("notes")))
        conn.commit()
