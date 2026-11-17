import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "electricity_data.db"))
# Ensure parent directory exists for DB file
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Datasets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        unit TEXT DEFAULT 'kWh',
        interval_type TEXT DEFAULT 'hourly',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Consumption records table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consumption_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id INTEGER NOT NULL,
        time_index REAL NOT NULL,
        timestamp_str TEXT,
        consumption_value REAL NOT NULL,
        temperature REAL,
        notes TEXT,
        FOREIGN KEY(dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );
    """)
    
    # Estimation history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS estimation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id INTEGER,
        dataset_name TEXT,
        target_x REAL NOT NULL,
        estimated_y REAL NOT NULL,
        polynomial_degree INTEGER NOT NULL,
        method TEXT DEFAULT 'global_lagrange',
        support_points_count INTEGER,
        support_points_json TEXT,
        ramp_rate REAL,
        integral_val REAL,
        mae REAL,
        rmse REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
    );
    """)
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
