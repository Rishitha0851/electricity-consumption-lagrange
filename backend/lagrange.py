import numpy as np
from typing import List, Tuple, Dict, Any, Optional
import time

def evaluate_lagrange_basis_step(
    x_val: float, 
    i: int, 
    xs: List[float], 
    ys: List[float]
) -> Dict[str, Any]:
    """
    Computes Li(x) = prod_{j != i} (x - xj) / (xi - xj)
    and returns full step-by-step mathematical breakdown.
    """
    n = len(xs)
    xi = xs[i]
    yi = ys[i]
    
    term_factors = []
    denom = 1.0
    numer_at_x = 1.0
    
    for j in range(n):
        if j != i:
            xj = xs[j]
            denom_part = xi - xj
            numer_part = x_val - xj
            
            denom *= denom_part
            numer_at_x *= numer_part
            
            sign = "-" if xj >= 0 else "+"
            abs_xj = abs(xj)
            term_factors.append(f"\\frac{{x {sign} {abs_xj:.2f}}}{{{xi:.2f} {sign} {abs_xj:.2f}}}")

    li_val = numer_at_x / denom if denom != 0 else 0.0
    weighted_val = yi * li_val
    
    latex_formula = f"L_{{{i}}}(x) = " + " \\cdot ".join(term_factors) if term_factors else "1"
    
    return {
        "i": i,
        "xi": xi,
        "yi": yi,
        "term_factors": term_factors,
        "denominator_value": float(denom),
        "numerator_value_at_x": float(numer_at_x),
        "Li_value_at_x": float(li_val),
        "weighted_value": float(weighted_val),
        "formula_latex": latex_formula
    }

def lagrange_interpolate_single(
    target_x: float, 
    points: List[Tuple[float, float]]
) -> Dict[str, Any]:
    """
    Interpolates P(target_x) using points = [(x0, y0), ..., (xn, yn)].
    Includes derivative P'(target_x) and integration across domain.
    """
    start_time = time.perf_counter()
    
    # Sort points by x coordinate
    sorted_pts = sorted(points, key=lambda pt: pt[0])
    xs = [pt[0] for pt in sorted_pts]
    ys = [pt[1] for pt in sorted_pts]
    n = len(xs)
    
    if n == 0:
        raise ValueError("At least one point is required for interpolation.")
    if len(set(xs)) != n:
        raise ValueError("Support points must have distinct x coordinates (no duplicate timestamps).")
    
    if n == 1:
        return {
            "target_x": target_x,
            "estimated_y": ys[0],
            "degree": 0,
            "steps": [],
            "polynomial_formula_str": f"P(x) = {ys[0]:.2f}",
            "ramp_rate": 0.0,
            "integral_over_domain": 0.0,
            "support_points": [{"x": xs[0], "y": ys[0]}],
            "runge_warning": False,
            "warning_message": None,
            "computation_time_ms": (time.perf_counter() - start_time) * 1000.0
        }
    
    steps = []
    estimated_y = 0.0
    
    for i in range(n):
        step_dict = evaluate_lagrange_basis_step(target_x, i, xs, ys)
        steps.append(step_dict)
        estimated_y += step_dict["weighted_value"]
        
    # Calculate derivative P'(target_x)
    # d/dx Li(x) = Li(x) * sum_{j != i} 1 / (x - xj)
    ramp_rate = 0.0
    for i in range(n):
        xi = xs[i]
        yi = ys[i]
        # Calculate Li'(x)
        d_li = 0.0
        for k in range(n):
            if k == i:
                continue
            # product over j != i, j != k of (x - xj)/(xi - xj) divided by (xi - xk)
            term_prod = 1.0 / (xi - xs[k])
            for j in range(n):
                if j != i and j != k:
                    term_prod *= (target_x - xs[j]) / (xi - xs[j])
            d_li += term_prod
        ramp_rate += yi * d_li

    # Numerical integral over domain [min(xs), max(xs)] using Simpson's rule (100 steps)
    a, b = min(xs), max(xs)
    domain_length = b - a
    if domain_length > 0:
        quad_steps = 100
        quad_x = np.linspace(a, b, quad_steps + 1)
        quad_y = [barycentric_eval(qx, xs, ys) for qx in quad_x]
        # composite Simpson's rule
        dx = (b - a) / quad_steps
        integral_val = (dx / 3.0) * (quad_y[0] + 4.0 * sum(quad_y[1:-1:2]) + 2.0 * sum(quad_y[2:-1:2]) + quad_y[-1])
    else:
        integral_val = 0.0

    # Runge phenomenon check
    degree = n - 1
    runge_warning = False
    warning_msg = None
    
    # Check if target_x is outside bounds or if degree >= 8 with equispaced nodes
    if target_x < min(xs) or target_x > max(xs):
        warning_msg = f"Extrapolation alert: target {target_x:.2f} is outside the range [{min(xs):.2f}, {max(xs):.2f}]. Lagrange polynomials can oscillate widely when extrapolating."
        runge_warning = True
    elif degree >= 8:
        # Check oscillation ratio
        max_y = max(abs(y) for y in ys)
        if abs(estimated_y) > 2.5 * max_y and max_y > 0:
            runge_warning = True
            warning_msg = f"Potential Runge's Phenomenon detected (degree {degree} polynomial). Noticeable oscillation near boundary regions. Consider using 3-5 support nodes or Piecewise Lagrange."

    # Formula representation string
    poly_terms = []
    for i in range(n):
        sign = "+" if ys[i] >= 0 else "-"
        poly_terms.append(f"{sign} {abs(ys[i]):.2f} \\cdot L_{{{i}}}(x)")
    poly_str = "P(x) = " + " ".join(poly_terms)

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "target_x": target_x,
        "estimated_y": float(estimated_y),
        "degree": degree,
        "steps": steps,
        "polynomial_formula_str": poly_str,
        "ramp_rate": float(ramp_rate),
        "integral_over_domain": float(integral_val),
        "support_points": [{"x": pt[0], "y": pt[1]} for pt in sorted_pts],
        "runge_warning": runge_warning,
        "warning_message": warning_msg,
        "computation_time_ms": float(elapsed_ms)
    }

def barycentric_eval(x: float, xs: List[float], ys: List[float]) -> float:
    """
    Numerically stable Barycentric Lagrange evaluation:
    O(n) per evaluation point.
    """
    n = len(xs)
    # Check if x exactly matches any node
    for i in range(n):
        if abs(x - xs[i]) < 1e-12:
            return ys[i]
            
    # Calculate barycentric weights w_j = 1 / prod_{k != j} (xj - xk)
    weights = []
    for j in range(n):
        w = 1.0
        xj = xs[j]
        for k in range(n):
            if k != j:
                w /= (xj - xs[k])
        weights.append(w)
        
    numer = 0.0
    denom = 0.0
    for j in range(n):
        temp = weights[j] / (x - xs[j])
        numer += temp * ys[j]
        denom += temp
        
    return numer / denom if denom != 0 else 0.0

def generate_lagrange_curve(
    points: List[Tuple[float, float]],
    num_eval: int = 120,
    x_min: Optional[float] = None,
    x_max: Optional[float] = None,
    include_basis: bool = True
) -> Dict[str, Any]:
    """
    Generates dense curve data for interactive visualization.
    """
    sorted_pts = sorted(points, key=lambda pt: pt[0])
    xs = [pt[0] for pt in sorted_pts]
    ys = [pt[1] for pt in sorted_pts]
    n = len(xs)
    
    if n == 0:
        raise ValueError("No points provided.")
    if len(set(xs)) != n:
        raise ValueError("Support points must have distinct x coordinates.")
        
    if x_min is None:
        x_min = min(xs)
    if x_max is None:
        x_max = max(xs)
        
    eval_x = np.linspace(x_min, x_max, num_eval).tolist()
    eval_y = [float(barycentric_eval(x, xs, ys)) for x in eval_x]
    
    # Compute basis curves if requested (for small degree <= 8)
    basis_curves = []
    if include_basis and n <= 8:
        for i in range(n):
            basis_y = []
            for x in eval_x:
                numer = 1.0
                denom = 1.0
                for j in range(n):
                    if j != i:
                        numer *= (x - xs[j])
                        denom *= (xs[i] - xs[j])
                li = numer / denom if denom != 0 else 0.0
                basis_y.append(float(li))
            basis_curves.append({
                "index": i,
                "node_x": xs[i],
                "node_y": ys[i],
                "values": basis_y
            })
            
    # Metrics
    min_y = min(eval_y) if eval_y else 0.0
    max_y = max(eval_y) if eval_y else 0.0
    avg_y = sum(eval_y) / len(eval_y) if eval_y else 0.0
    
    # Peak index
    peak_idx = int(np.argmax(eval_y)) if eval_y else 0
    peak_x = eval_x[peak_idx] if eval_x else 0.0
    peak_power = eval_y[peak_idx] if eval_y else 0.0
    
    # Total energy (integral)
    dx = (x_max - x_min) / (num_eval - 1) if num_eval > 1 else 1.0
    total_energy = float(np.trapz(eval_y, eval_x))
    
    return {
        "degree": n - 1,
        "eval_x": [round(x, 4) for x in eval_x],
        "eval_y": [round(y, 4) for y in eval_y],
        "basis_curves": basis_curves,
        "support_points": [{"x": pt[0], "y": pt[1]} for pt in sorted_pts],
        "min_y": round(min_y, 4),
        "max_y": round(max_y, 4),
        "total_energy_kwh": round(total_energy, 4),
        "avg_power_kw": round(avg_y, 4),
        "peak_power_kw": round(peak_power, 4),
        "peak_x": round(peak_x, 4)
    }

def piecewise_lagrange_curve(
    points: List[Tuple[float, float]],
    window_size: int = 3,
    num_eval: int = 150
) -> Dict[str, Any]:
    """
    Piecewise local Lagrange interpolation:
    For any target x, chooses the closest `window_size` points to form a local
    Lagrange polynomial. Completely suppresses global Runge oscillations!
    """
    sorted_pts = sorted(points, key=lambda pt: pt[0])
    xs = np.array([pt[0] for pt in sorted_pts])
    ys = np.array([pt[1] for pt in sorted_pts])
    n = len(xs)
    
    if n < 2:
        return generate_lagrange_curve(points, num_eval)
        
    k = min(window_size, n)
    x_min, x_max = xs[0], xs[-1]
    eval_x = np.linspace(x_min, x_max, num_eval)
    eval_y = []
    
    for x in eval_x:
        # Find nearest k points
        distances = np.abs(xs - x)
        nearest_indices = np.argsort(distances)[:k]
        nearest_indices.sort()
        
        local_xs = xs[nearest_indices].tolist()
        local_ys = ys[nearest_indices].tolist()
        
        val = barycentric_eval(x, local_xs, local_ys)
        eval_y.append(float(val))
        
    total_energy = float(np.trapz(eval_y, eval_x))
    peak_idx = int(np.argmax(eval_y))
    
    return {
        "degree": k - 1,
        "eval_x": [round(float(x), 4) for x in eval_x],
        "eval_y": [round(float(y), 4) for y in eval_y],
        "support_points": [{"x": float(xs[i]), "y": float(ys[i])} for i in range(n)],
        "min_y": round(float(min(eval_y)), 4),
        "max_y": round(float(max(eval_y)), 4),
        "total_energy_kwh": round(total_energy, 4),
        "avg_power_kw": round(float(np.mean(eval_y)), 4),
        "peak_power_kw": round(float(eval_y[peak_idx]), 4),
        "peak_x": round(float(eval_x[peak_idx]), 4)
    }

def validate_interpolation(
    points: List[Tuple[float, float]],
    support_indices: Optional[List[int]] = None,
    test_ratio: float = 0.3
) -> Dict[str, Any]:
    """
    Partitions data into support points and hold-out test points.
    Builds the Lagrange polynomial on support points, then calculates
    ground truth errors (MAE, RMSE, MAPE, R2 score).
    """
    sorted_pts = sorted(points, key=lambda pt: pt[0])
    n = len(sorted_pts)
    
    if n < 3:
        raise ValueError("At least 3 data points required for validation.")
        
    if support_indices is None:
        # For well-conditioned polynomial interpolation without Runge explosion:
        # If n > 8, select 6-7 well-spaced support nodes; otherwise hold out ~test_ratio
        if n > 8:
            num_nodes = 6
            step = (n - 1) / (num_nodes - 1)
            support_indices = [min(n - 1, int(round(i * step))) for i in range(num_nodes)]
            support_indices = sorted(list(set(support_indices)))
        else:
            num_test = max(1, int(round(n * test_ratio)))
            step = max(2, n // (n - num_test))
            support_indices = [0]
            for i in range(1, n - 1):
                if len(support_indices) < (n - num_test) and (i % 2 != 0 or len(support_indices) + (n - 1 - i) <= (n - num_test)):
                    support_indices.append(i)
            if (n - 1) not in support_indices:
                support_indices.append(n - 1)
            support_indices = sorted(list(set(support_indices)))
        
    test_indices = [i for i in range(n) if i not in support_indices]
    if not test_indices:
        # If all were selected, pick one middle index for test
        test_indices = [n // 2]
        support_indices = [i for i in range(n) if i != test_indices[0]]

    support_pts = [sorted_pts[i] for i in support_indices]
    supp_xs = [pt[0] for pt in support_pts]
    supp_ys = [pt[1] for pt in support_pts]

    results = []
    abs_errors = []
    sq_errors = []
    pct_errors = []
    actual_test_ys = []
    est_test_ys = []

    for i in range(n):
        x, actual_y = sorted_pts[i]
        is_supp = i in support_indices
        est_y = float(barycentric_eval(x, supp_xs, supp_ys))
        
        err = est_y - actual_y
        abs_err = abs(err)
        # Handle zero or near-zero observations gracefully to avoid division by zero
        if abs(actual_y) > 1e-4:
            pct_err = (abs_err / abs(actual_y)) * 100.0
        else:
            # If actual is essentially zero, percentage error is bounded by absolute error scale
            pct_err = abs_err * 100.0
        
        if not is_supp:
            abs_errors.append(abs_err)
            sq_errors.append(err ** 2)
            pct_errors.append(min(pct_err, 500.0)) # Cap extreme outlier percentages for numerical robustness
            actual_test_ys.append(actual_y)
            est_test_ys.append(est_y)
            
        results.append({
            "x": x,
            "actual_y": round(actual_y, 4),
            "estimated_y": round(est_y, 4),
            "error": round(err, 4),
            "abs_error": round(abs_err, 4),
            "percent_error": round(pct_err, 2),
            "is_support_node": is_supp
        })

    mae = float(np.mean(abs_errors)) if abs_errors else 0.0
    rmse = float(np.sqrt(np.mean(sq_errors))) if sq_errors else 0.0
    mape = float(np.mean(pct_errors)) if pct_errors else 0.0
    
    # R2 score
    if len(actual_test_ys) > 1:
        ss_res = sum((np.array(actual_test_ys) - np.array(est_test_ys)) ** 2)
        ss_tot = sum((np.array(actual_test_ys) - np.mean(actual_test_ys)) ** 2)
        r2 = float(1.0 - (ss_res / ss_tot)) if ss_tot > 0 else 1.0
    else:
        r2 = 1.0

    # Dense curve for visualization
    curve_data = generate_lagrange_curve(support_pts, num_eval=120, include_basis=False)

    return {
        "degree": len(support_pts) - 1,
        "support_points_count": len(support_pts),
        "test_points_count": len(test_indices),
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "mape": round(mape, 2),
        "r2_score": round(r2, 4),
        "points_comparison": results,
        "curve_x": curve_data["eval_x"],
        "curve_y": curve_data["eval_y"]
    }
