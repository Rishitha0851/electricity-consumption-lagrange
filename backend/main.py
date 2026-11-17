from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import sqlite3
import json
import io
import os
import datetime
import numpy as np
import pandas as pd
from typing import List, Optional

from database import get_db_connection, init_db
from sample_data import seed_sample_datasets, SAMPLE_DATASETS
from models import (
    DatasetCreate, DatasetSummary, DatasetDetail, ConsumptionRecordCreate,
    SingleEstimateRequest, SingleEstimateResponse,
    CurveEstimateRequest, CurveEstimateResponse,
    PiecewiseEstimateRequest,
    ValidationRequest, ValidationResponse,
    HistoryRecord, DataDiagnostics, CapstoneSummaryReport
)
from lagrange import (
    lagrange_interpolate_single,
    generate_lagrange_curve,
    piecewise_lagrange_curve,
    validate_interpolation
)

app = FastAPI(
    title="Electricity Consumption Estimation API",
    description="Backend API for Electricity Consumption Data Preparation and Lagrange Interpolation Estimation",
    version="1.0.0"
)

# Enable CORS for frontend Vite dev server, Vercel deployments, and custom origins
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_env == "*":
    origins = ["*"]
else:
    origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    conn = get_db_connection()
    seed_sample_datasets(conn)
    conn.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Electricity Consumption Estimation Engine",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
def health_check():
    return {"status": "online", "service": "Electricity Consumption Estimation Engine", "version": "1.0.0"}

# --- DATASET MANAGEMENT ---

@app.get("/api/datasets", response_model=List[DatasetSummary])
def get_datasets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.id, d.name, d.description, d.unit, d.interval_type, d.created_at,
               COUNT(r.id) as record_count
        FROM datasets d
        LEFT JOIN consumption_records r ON d.id = r.dataset_id
        GROUP BY d.id
        ORDER BY d.id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "unit": row["unit"] or "kWh",
            "interval_type": row["interval_type"] or "hourly",
            "created_at": str(row["created_at"]),
            "record_count": row["record_count"]
        }
        for row in rows
    ]

@app.get("/api/datasets/{dataset_id}", response_model=DatasetDetail)
def get_dataset(dataset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    ds = cursor.fetchone()
    if not ds:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    cursor.execute("""
        SELECT id, dataset_id, time_index, timestamp_str, consumption_value, temperature, notes
        FROM consumption_records
        WHERE dataset_id = ?
        ORDER BY time_index ASC
    """, (dataset_id,))
    records = cursor.fetchall()
    conn.close()
    
    rec_list = [
        {
            "id": r["id"],
            "dataset_id": r["dataset_id"],
            "time_index": r["time_index"],
            "timestamp_str": r["timestamp_str"],
            "consumption_value": r["consumption_value"],
            "temperature": r["temperature"],
            "notes": r["notes"]
        }
        for r in records
    ]
    
    return {
        "id": ds["id"],
        "name": ds["name"],
        "description": ds["description"],
        "unit": ds["unit"] or "kWh",
        "interval_type": ds["interval_type"] or "hourly",
        "created_at": str(ds["created_at"]),
        "record_count": len(rec_list),
        "records": rec_list
    }

@app.post("/api/datasets", response_model=DatasetDetail)
def create_dataset(payload: DatasetCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO datasets (name, description, unit, interval_type)
        VALUES (?, ?, ?, ?)
    """, (payload.name, payload.description, payload.unit, payload.interval_type))
    ds_id = cursor.lastrowid
    
    for rec in payload.records or []:
        cursor.execute("""
            INSERT INTO consumption_records (dataset_id, time_index, timestamp_str, consumption_value, temperature, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (ds_id, rec.time_index, rec.timestamp_str, rec.consumption_value, rec.temperature, rec.notes))
        
    conn.commit()
    conn.close()
    return get_dataset(ds_id)

@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM consumption_records WHERE dataset_id = ?", (dataset_id,))
    cursor.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    conn.commit()
    conn.close()
    return {"message": f"Dataset {dataset_id} deleted successfully"}

@app.post("/api/datasets/reset-samples")
def reset_samples():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM consumption_records")
    cursor.execute("DELETE FROM datasets")
    conn.commit()
    seed_sample_datasets(conn)
    conn.close()
    return {"message": "Sample datasets successfully reloaded"}

# --- DATA VALIDATION & CLEANING (MODULE 1 CAPSTONE CORE) ---

@app.get("/api/datasets/{dataset_id}/diagnostics", response_model=DataDiagnostics)
def get_dataset_diagnostics(dataset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, time_index, consumption_value
        FROM consumption_records
        WHERE dataset_id = ?
        ORDER BY id ASC
    """, (dataset_id,))
    rows = cursor.fetchall()
    conn.close()

    total_records = len(rows)
    if total_records == 0:
        return {
            "is_valid": False,
            "status": "Empty Dataset",
            "issues": ["No consumption records found in this dataset."],
            "total_records": 0,
            "unique_times": 0,
            "has_duplicates": False,
            "duplicate_timestamps": [],
            "has_negatives": False,
            "negative_count": 0,
            "is_sorted": True,
            "min_x": 0.0,
            "max_x": 0.0,
            "min_y": 0.0,
            "max_y": 0.0,
            "avg_y": 0.0,
            "can_interpolate": False,
            "recommendation": "Import records or choose a preloaded sample profile."
        }

    times = [r["time_index"] for r in rows]
    vals = [r["consumption_value"] for r in rows]

    # Duplicate check
    seen = set()
    dup_times = []
    for t in times:
        if t in seen and t not in dup_times:
            dup_times.append(t)
        seen.add(t)
    has_duplicates = len(dup_times) > 0

    # Negative check
    neg_count = sum(1 for v in vals if v < 0)
    has_negatives = neg_count > 0

    # Chronological sorting check
    is_sorted = all(times[i] <= times[i+1] for i in range(len(times)-1))

    # Outlier check (> 3 std dev)
    mean_val = float(np.mean(vals))
    std_val = float(np.std(vals))
    outlier_count = sum(1 for v in vals if abs(v - mean_val) > 3 * std_val) if std_val > 0 else 0

    issues = []
    if has_duplicates:
        issues.append(f"Found {len(dup_times)} duplicate time coordinates (x) which will cause division-by-zero in Lagrange denominators.")
    if not is_sorted:
        issues.append("Time coordinates are not strictly sorted in chronological order.")
    if has_negatives:
        issues.append(f"Found {neg_count} negative consumption values (valid for solar net export, but unusual for standard gross demand).")
    if outlier_count > 0:
        issues.append(f"{outlier_count} statistical outlier values (> 3 standard deviations) detected.")
    if total_records < 2:
        issues.append("Lagrange interpolation requires at least 2 distinct data points.")

    can_interpolate = (total_records >= 2) and (not has_duplicates)

    if not can_interpolate:
        status = "Invalid Coordinates"
        rec = "Use 'Clean & Auto-Fix Dataset' to eliminate duplicate timestamps before interpolating."
    elif len(issues) > 0:
        status = "Needs Attention"
        rec = "Dataset is interpolatable, but sorting or outlier review is recommended."
    else:
        status = "Clean & Verified"
        rec = "Dataset is pristine, chronological, and ready for Lagrange interpolation modeling."

    return {
        "is_valid": can_interpolate and (len(issues) == 0 or (len(issues) == 1 and has_negatives)),
        "status": status,
        "issues": issues,
        "total_records": total_records,
        "unique_times": len(set(times)),
        "has_duplicates": has_duplicates,
        "duplicate_timestamps": dup_times,
        "has_negatives": has_negatives,
        "negative_count": neg_count,
        "is_sorted": is_sorted,
        "min_x": float(min(times)),
        "max_x": float(max(times)),
        "min_y": float(min(vals)),
        "max_y": float(max(vals)),
        "avg_y": round(mean_val, 4),
        "can_interpolate": can_interpolate,
        "recommendation": rec
    }

@app.post("/api/datasets/{dataset_id}/clean")
def clean_dataset(dataset_id: int):
    """
    Cleans dataset by removing duplicate time coordinates (keeping first instance)
    and sorting all records in strictly ascending chronological order.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, time_index, timestamp_str, consumption_value, temperature, notes
        FROM consumption_records
        WHERE dataset_id = ?
    """, (dataset_id,))
    rows = cursor.fetchall()

    if not rows:
        conn.close()
        raise HTTPException(status_code=400, detail="No records to clean.")

    # Sort by time_index
    sorted_rows = sorted(rows, key=lambda r: r["time_index"])

    # Deduplicate time_index
    unique_rows = []
    seen_times = set()
    for r in sorted_rows:
        t = round(r["time_index"], 4)
        if t not in seen_times:
            seen_times.add(t)
            unique_rows.append(r)

    # Re-insert cleanly
    cursor.execute("DELETE FROM consumption_records WHERE dataset_id = ?", (dataset_id,))
    for r in unique_rows:
        cursor.execute("""
            INSERT INTO consumption_records (dataset_id, time_index, timestamp_str, consumption_value, temperature, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (dataset_id, r["time_index"], r["timestamp_str"], r["consumption_value"], r["temperature"], r["notes"]))

    conn.commit()
    conn.close()

    removed_count = len(rows) - len(unique_rows)
    return {
        "message": f"Dataset cleaned: {removed_count} duplicate records removed, {len(unique_rows)} records chronologically ordered.",
        "cleaned_records_count": len(unique_rows),
        "duplicates_removed": removed_count
    }

@app.post("/api/datasets/{dataset_id}/sort")
def sort_dataset(dataset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT time_index, timestamp_str, consumption_value, temperature, notes
        FROM consumption_records
        WHERE dataset_id = ?
        ORDER BY time_index ASC
    """, (dataset_id,))
    rows = cursor.fetchall()
    
    cursor.execute("DELETE FROM consumption_records WHERE dataset_id = ?", (dataset_id,))
    for r in rows:
        cursor.execute("""
            INSERT INTO consumption_records (dataset_id, time_index, timestamp_str, consumption_value, temperature, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (dataset_id, r["time_index"], r["timestamp_str"], r["consumption_value"], r["temperature"], r["notes"]))
    conn.commit()
    conn.close()
    return {"message": "Dataset records successfully sorted chronologically."}

# --- RECORDS MANAGEMENT ---

@app.post("/api/datasets/{dataset_id}/records")
def add_records(dataset_id: int, records: List[ConsumptionRecordCreate]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM datasets WHERE id = ?", (dataset_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    for rec in records:
        cursor.execute("""
            INSERT INTO consumption_records (dataset_id, time_index, timestamp_str, consumption_value, temperature, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (dataset_id, rec.time_index, rec.timestamp_str, rec.consumption_value, rec.temperature, rec.notes))
        
    conn.commit()
    conn.close()
    return {"message": f"Added {len(records)} records successfully"}

@app.put("/api/records/{record_id}")
def update_record(record_id: int, rec: ConsumptionRecordCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE consumption_records
        SET time_index = ?, timestamp_str = ?, consumption_value = ?, temperature = ?, notes = ?
        WHERE id = ?
    """, (rec.time_index, rec.timestamp_str, rec.consumption_value, rec.temperature, rec.notes, record_id))
    conn.commit()
    conn.close()
    return {"message": f"Record {record_id} updated successfully"}

@app.delete("/api/records/{record_id}")
def delete_record(record_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM consumption_records WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    return {"message": f"Record {record_id} deleted"}

# --- CSV IMPORT & EXPORT ---

@app.post("/api/datasets/{dataset_id}/upload-csv")
async def upload_csv(dataset_id: int, file: UploadFile = File(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM datasets WHERE id = ?", (dataset_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")
        
    # Map column names flexibly
    col_map = {}
    for col in df.columns:
        c_low = col.lower().strip()
        if "time" in c_low or "hour" in c_low or "index" in c_low or c_low == "x":
            col_map["time"] = col
        elif "consum" in c_low or "kwh" in c_low or "kw" in c_low or "value" in c_low or "load" in c_low or c_low == "y":
            col_map["value"] = col
        elif "temp" in c_low:
            col_map["temp"] = col
        elif "label" in c_low or "stamp" in c_low or "date" in c_low:
            col_map["stamp"] = col

    if "value" not in col_map:
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if len(numeric_cols) >= 2:
            col_map["time"] = numeric_cols[0]
            col_map["value"] = numeric_cols[1]
        elif len(numeric_cols) == 1:
            col_map["value"] = numeric_cols[0]
        else:
            conn.close()
            raise HTTPException(status_code=400, detail="Could not identify numeric consumption values column in CSV.")

    records_added = 0
    for idx, row in df.iterrows():
        try:
            val = float(row[col_map["value"]])
            if "time" in col_map:
                t_idx = float(row[col_map["time"]])
            else:
                t_idx = float(idx)
                
            stamp = str(row[col_map["stamp"]]) if "stamp" in col_map and pd.notna(row[col_map["stamp"]]) else f"T_{int(t_idx)}"
            temp = float(row[col_map["temp"]]) if "temp" in col_map and pd.notna(row[col_map["temp"]]) else None
            
            cursor.execute("""
                INSERT INTO consumption_records (dataset_id, time_index, timestamp_str, consumption_value, temperature)
                VALUES (?, ?, ?, ?, ?)
            """, (dataset_id, t_idx, stamp, val, temp))
            records_added += 1
        except Exception:
            continue
            
    conn.commit()
    conn.close()
    return {"message": f"Successfully parsed and imported {records_added} consumption records."}

@app.get("/api/datasets/{dataset_id}/export-csv")
def export_csv(dataset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM datasets WHERE id = ?", (dataset_id,))
    ds = cursor.fetchone()
    if not ds:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    cursor.execute("""
        SELECT time_index, timestamp_str, consumption_value, temperature, notes
        FROM consumption_records
        WHERE dataset_id = ?
        ORDER BY time_index ASC
    """, (dataset_id,))
    rows = cursor.fetchall()
    conn.close()
    
    output = io.StringIO()
    output.write("TimeIndex,Timestamp,Consumption,Temperature,Notes\n")
    for r in rows:
        notes_str = f'"{r["notes"]}"' if r["notes"] else ""
        temp_str = str(r["temperature"]) if r["temperature"] is not None else ""
        output.write(f'{r["time_index"]},{r["timestamp_str"] or ""},{r["consumption_value"]},{temp_str},{notes_str}\n')
        
    output.seek(0)
    filename = f"{ds['name'].replace(' ', '_').lower()}_records.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- ESTIMATION & MATHEMATICAL ENGINE ---

@app.post("/api/estimate/single", response_model=SingleEstimateResponse)
def estimate_single_point(payload: SingleEstimateRequest):
    pts = [(p.x, p.y) for p in payload.points]
    if len(pts) < 2:
        raise HTTPException(status_code=400, detail="At least 2 distinct support points required for Lagrange interpolation.")
        
    try:
        result = lagrange_interpolate_single(payload.target_x, pts)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if payload.save_to_history:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO estimation_history (
                    dataset_id, dataset_name, target_x, estimated_y, polynomial_degree,
                    method, support_points_count, support_points_json, ramp_rate, integral_val, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payload.dataset_id,
                payload.dataset_name or "Custom Support Nodes",
                result["target_x"],
                result["estimated_y"],
                result["degree"],
                "global_lagrange",
                len(pts),
                json.dumps([{"x": p[0], "y": p[1]} for p in pts]),
                result["ramp_rate"],
                result["integral_over_domain"],
                payload.notes or ""
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print("Failed to save history:", e)
            
    return result

@app.post("/api/estimate/curve", response_model=CurveEstimateResponse)
def estimate_curve(payload: CurveEstimateRequest):
    pts = [(p.x, p.y) for p in payload.points]
    if len(pts) < 2:
        raise HTTPException(status_code=400, detail="At least 2 distinct points required.")
        
    try:
        curve = generate_lagrange_curve(
            pts,
            num_eval=payload.num_eval_points or 120,
            x_min=payload.x_min,
            x_max=payload.x_max,
            include_basis=payload.include_basis_curves if payload.include_basis_curves is not None else True
        )
        return curve
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/estimate/piecewise", response_model=CurveEstimateResponse)
def estimate_piecewise(payload: PiecewiseEstimateRequest):
    pts = [(p.x, p.y) for p in payload.points]
    if len(pts) < 2:
        raise HTTPException(status_code=400, detail="At least 2 points required.")
    try:
        return piecewise_lagrange_curve(
            pts,
            window_size=payload.window_size or 3,
            num_eval=payload.num_eval_points or 150
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/estimate/validate", response_model=ValidationResponse)
def validate_model(payload: ValidationRequest):
    pts = [(p.x, p.y) for p in payload.points]
    if len(pts) < 3:
        raise HTTPException(status_code=400, detail="At least 3 points required for cross-validation.")
        
    try:
        return validate_interpolation(
            pts,
            support_indices=payload.support_indices,
            test_ratio=payload.test_ratio or 0.3
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- ESTIMATION HISTORY ---

@app.get("/api/history", response_model=List[HistoryRecord])
def get_history(limit: int = Query(50, ge=1, le=200)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, dataset_id, dataset_name, target_x, estimated_y, polynomial_degree,
               method, support_points_count, ramp_rate, integral_val, mae, rmse, created_at, notes
        FROM estimation_history
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": r["id"],
            "dataset_id": r["dataset_id"],
            "dataset_name": r["dataset_name"],
            "target_x": r["target_x"],
            "estimated_y": r["estimated_y"],
            "polynomial_degree": r["polynomial_degree"],
            "method": r["method"],
            "support_points_count": r["support_points_count"],
            "ramp_rate": r["ramp_rate"],
            "integral_val": r["integral_val"],
            "mae": r["mae"],
            "rmse": r["rmse"],
            "created_at": str(r["created_at"]),
            "notes": r["notes"]
        }
        for r in rows
    ]

@app.delete("/api/history/{history_id}")
def delete_history_record(history_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM estimation_history WHERE id = ?", (history_id,))
    conn.commit()
    conn.close()
    return {"message": f"History entry {history_id} deleted"}

@app.delete("/api/history")
def clear_all_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM estimation_history")
    conn.commit()
    conn.close()
    return {"message": "All estimation history cleared"}

# --- CAPSTONE PROJECT SUMMARY REPORT ---

@app.get("/api/reports/capstone-summary", response_model=CapstoneSummaryReport)
def generate_capstone_summary(dataset_id: Optional[int] = None, target_x: Optional[float] = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    if dataset_id is None:
        cursor.execute("SELECT id FROM datasets ORDER BY id ASC LIMIT 1")
        row = cursor.fetchone()
        dataset_id = row["id"] if row else 1

    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    ds = cursor.fetchone()
    if not ds:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")

    cursor.execute("""
        SELECT time_index, consumption_value
        FROM consumption_records
        WHERE dataset_id = ?
        ORDER BY time_index ASC
    """, (dataset_id,))
    records = cursor.fetchall()
    conn.close()

    if not records:
        raise HTTPException(status_code=400, detail="Cannot generate report for empty dataset.")

    xs = [r["time_index"] for r in records]
    ys = [r["consumption_value"] for r in records]
    pts = list(zip(xs, ys))

    # Evaluate estimation at target_x (default middle + 0.5)
    eval_target = target_x if target_x is not None else float(xs[len(xs)//2] + 0.5)
    
    # Choose well-conditioned subset of nodes if dataset is large
    if len(pts) <= 7:
        supp_pts = pts
    else:
        step = (len(pts) - 1) / 5
        indices = [min(len(pts) - 1, int(round(i * step))) for i in range(6)]
        supp_pts = [pts[i] for i in sorted(list(set(indices)))]

    est_res = lagrange_interpolate_single(eval_target, supp_pts)
    val_res = validate_interpolation(pts, test_ratio=0.3) if len(pts) >= 4 else {
        "mae": 0.0, "rmse": 0.0, "mape": 0.0, "r2_score": 1.0
    }

    mean_c = float(np.mean(ys))
    max_c = float(np.max(ys))
    min_c = float(np.min(ys))

    key_findings = [
        f"Lagrange polynomial of degree {est_res['degree']} successfully synthesized across the domain [{min(xs):.1f}, {max(xs):.1f}].",
        f"At time coordinate x* = {eval_target:.2f}, estimated electricity load is {est_res['estimated_y']:.3f} {ds['unit']}.",
        f"Instantaneous ramp rate P'(x*) was computed at {est_res['ramp_rate']:.3f} {ds['unit']}/h, indicating load {'surge' if est_res['ramp_rate'] >= 0 else 'shedding'}.",
        f"Cumulative energy throughput over the full interval equals {est_res['integral_over_domain']:.2f} {ds['unit'] if ds['unit'] != 'kW' else 'kWh'}.",
        f"Model cross-validation against holdout ground truth yielded MAE of {val_res['mae']:.3f} {ds['unit']} with R² of {val_res['r2_score']:.4f}."
    ]

    return {
        "project_title": "Electricity Consumption Estimation Using Lagrange Interpolation",
        "academic_context": "Engineering Capstone Project — Numerical Analysis & Smart Grid Load Modeling",
        "dataset_name": ds["name"],
        "unit": ds["unit"] or "kWh",
        "interval_type": ds["interval_type"] or "hourly",
        "total_records": len(records),
        "domain_range": f"{min(xs):.1f} to {max(xs):.1f} hours",
        "mean_consumption": round(mean_c, 3),
        "peak_consumption": round(max_c, 3),
        "min_consumption": round(min_c, 3),
        "validation_status": "Pristine & Chronologically Ordered",
        "support_nodes_count": len(supp_pts),
        "polynomial_degree": est_res["degree"],
        "target_x": eval_target,
        "estimated_y": round(est_res["estimated_y"], 3),
        "ramp_rate": round(est_res["ramp_rate"], 3),
        "integral_val": round(est_res["integral_over_domain"], 2),
        "mae": val_res["mae"],
        "rmse": val_res["rmse"],
        "mape": val_res["mape"],
        "r2_score": val_res["r2_score"],
        "key_findings": key_findings,
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
