import sys
import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("CAPSTONE DASHBOARD AUTOMATED VERIFICATION SUITE")
    print("=" * 70)

    # 1. Health check
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("✓ Step 1 & 2: Backend health verified:", res.json())

    # 3. Select residential electricity profile
    res = client.get('/api/datasets')
    assert res.status_code == 200
    datasets = res.json()
    res_ds = next(d for d in datasets if "Residential" in d["name"])
    print(f"✓ Step 3: Selected Residential Profile (ID: {res_ds['id']}, Records: {res_ds['record_count']}, Unit: {res_ds['unit']})")

    # 4. Inspect the dataset records
    res = client.get(f"/api/datasets/{res_ds['id']}")
    assert res.status_code == 200
    detail = res.json()
    records = detail["records"]
    assert len(records) >= 24, "Expected at least 24 hourly records"
    print(f"✓ Step 4: Dataset records inspected. Domain: {records[0]['time_index']} to {records[-1]['time_index']}h, First load: {records[0]['consumption_value']} {res_ds['unit']}")

    # 5. Validate the records (Diagnostics API)
    res = client.get(f"/api/datasets/{res_ds['id']}/diagnostics")
    assert res.status_code == 200
    diag = res.json()
    assert diag["can_interpolate"] is True, "Dataset should be interpolatable"
    print(f"✓ Step 5: Data validation status: '{diag['status']}', Uniqueness: {not diag['has_duplicates']}, Sorted: {diag['is_sorted']}")

    # 6. Prepare the dataset (Clean & Sort)
    res = client.post(f"/api/datasets/{res_ds['id']}/clean")
    assert res.status_code == 200
    clean_msg = res.json()
    print(f"✓ Step 6: Prepared dataset: {clean_msg['message']}")

    # 7. Select interpolation nodes (Chebyshev 6 nodes)
    import math
    a = records[0]["time_index"]
    b = records[-1]["time_index"]
    count = 6
    chosen_pts = []
    for k in range(1, count + 1):
        cheb_x = 0.5 * (a + b) + 0.5 * (b - a) * math.cos(((2 * k - 1) / (2 * count)) * math.pi)
        closest = min(records, key=lambda r: abs(r["time_index"] - cheb_x))
        chosen_pts.append({"x": closest["time_index"], "y": closest["consumption_value"]})
    # Deduplicate
    seen = set()
    supp_nodes = []
    for p in chosen_pts:
        if p["x"] not in seen:
            seen.add(p["x"])
            supp_nodes.append(p)
    print(f"✓ Step 7: Selected {len(supp_nodes)} Chebyshev support nodes forming degree n = {len(supp_nodes) - 1}")

    # 8 & 9. Enter target coordinate (e.g. 18.5h peak dinner) & Run Lagrange interpolation
    target_x = 18.5
    res = client.post('/api/estimate/single', json={
        "target_x": target_x,
        "points": supp_nodes,
        "dataset_id": res_ds["id"],
        "dataset_name": res_ds["name"],
        "save_to_history": True,
        "notes": "Automated Capstone Test"
    })
    assert res.status_code == 200
    single_res = res.json()

    # 10. Verify the mathematical result
    computed_sum = sum(st["weighted_value"] for st in single_res["steps"])
    assert abs(computed_sum - single_res["estimated_y"]) < 1e-4, "Sum of basis weights must equal estimated_y"
    print(f"✓ Step 8, 9, 10: Lagrange calculation verified: P({target_x}) = {single_res['estimated_y']:.4f} {res_ds['unit']} (Ramp rate: {single_res['ramp_rate']:.4f} {res_ds['unit']}/h, Domain area: {single_res['integral_over_domain']:.2f})")

    # 11. Display the interpolation curve
    res = client.post('/api/estimate/curve', json={
        "points": supp_nodes,
        "num_eval_points": 100,
        "x_min": a,
        "x_max": b
    })
    assert res.status_code == 200
    curve_res = res.json()
    assert len(curve_res["eval_x"]) == 100
    print(f"✓ Step 11: Interpolation curve generated with {len(curve_res['eval_x'])} dense points. Peak power: {curve_res['peak_power_kw']:.2f} at {curve_res['peak_x']:.2f}h")

    # 12 & 13. Run holdout validation & review accuracy metrics
    all_pts = [{"x": r["time_index"], "y": r["consumption_value"]} for r in records]
    res = client.post('/api/estimate/validate', json={
        "points": all_pts,
        "test_ratio": 0.3
    })
    assert res.status_code == 200
    val_res = res.json()
    print(f"✓ Step 12 & 13: Holdout Validation: MAE = {val_res['mae']:.3f} {res_ds['unit']}, RMSE = {val_res['rmse']:.3f}, MAPE = {val_res['mape']:.2f}%, R² = {val_res['r2_score']:.4f}")

    # 14 & 15. Open estimation history
    res = client.get('/api/history')
    assert res.status_code == 200
    history = res.json()
    assert len(history) > 0, "Estimation history should contain saved run"
    latest = history[0]
    print(f"✓ Step 14 & 15: History audit trail verified: Run #{latest['id']} saved for '{latest['dataset_name']}' at x* = {latest['target_x']} with P(x*) = {latest['estimated_y']:.3f}")

    # 16. Export results (CSV)
    res = client.get(f"/api/datasets/{res_ds['id']}/export-csv")
    assert res.status_code == 200
    csv_text = res.text
    assert "TimeIndex,Timestamp,Consumption" in csv_text
    print(f"✓ Step 16: Exported dataset CSV ({len(csv_text.splitlines())} lines)")

    # Repeat critical tests with Commercial Office Profile (kW unit integrity)
    comm_ds = next(d for d in datasets if "Commercial" in d["name"])
    res = client.get(f"/api/datasets/{comm_ds['id']}")
    comm_records = res.json()["records"]
    # Select nodes spanning the full domain
    step = (len(comm_records) - 1) / 5
    comm_supp = [comm_records[int(round(i * step))] for i in range(6)]
    comm_pts = [{"x": r["time_index"], "y": r["consumption_value"]} for r in comm_supp]
    res_comm = client.post('/api/estimate/single', json={
        "target_x": 13.5,
        "points": comm_pts,
        "dataset_id": comm_ds["id"],
        "dataset_name": comm_ds["name"]
    })
    assert res_comm.status_code == 200
    assert comm_ds["unit"] == "kW", "Commercial unit must be kW"
    print(f"✓ Repetition Test on Commercial Office Profile (kW): P(13.5h) = {res_comm.json()['estimated_y']:.2f} kW, Unit preserved without mixing!")

    # Test Capstone Report API
    res_rep = client.get(f"/api/reports/capstone-summary?dataset_id={res_ds['id']}&target_x=18.5")
    assert res_rep.status_code == 200
    rep = res_rep.json()
    assert rep["project_title"] == "Electricity Consumption Estimation Using Lagrange Interpolation"
    print(f"✓ Capstone Report Generation: Academic report verified for '{rep['dataset_name']}' with {len(rep['key_findings'])} key findings.")

    print("=" * 70)
    print("ALL 16 STEPS AND EXTENDED TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
