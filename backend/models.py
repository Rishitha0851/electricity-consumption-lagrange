from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ConsumptionRecordCreate(BaseModel):
    time_index: float = Field(..., description="Numeric coordinate x (e.g. hour 0.0, 1.5, 24.0)")
    timestamp_str: Optional[str] = Field(None, description="Human readable timestamp or time label, e.g. '08:00 AM'")
    consumption_value: float = Field(..., description="Electricity consumption y in kWh or kW")
    temperature: Optional[float] = Field(None, description="Ambient temperature (°C)")
    notes: Optional[str] = None

class ConsumptionRecord(ConsumptionRecordCreate):
    id: int
    dataset_id: int

class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    unit: Optional[str] = "kWh"
    interval_type: Optional[str] = "hourly"
    records: Optional[List[ConsumptionRecordCreate]] = []

class DatasetSummary(BaseModel):
    id: int
    name: str
    description: Optional[str]
    unit: str
    interval_type: str
    record_count: int
    created_at: str

class DatasetDetail(DatasetSummary):
    records: List[ConsumptionRecord]

class Point2D(BaseModel):
    x: float
    y: float
    label: Optional[str] = None

class BasisPolynomialStep(BaseModel):
    i: int
    xi: float
    yi: float
    term_factors: List[str]
    denominator_value: float
    numerator_value_at_x: float
    Li_value_at_x: float
    weighted_value: float
    formula_latex: str

class SingleEstimateRequest(BaseModel):
    target_x: float
    points: List[Point2D]
    dataset_id: Optional[int] = None
    dataset_name: Optional[str] = None
    save_to_history: Optional[bool] = True
    notes: Optional[str] = ""

class SingleEstimateResponse(BaseModel):
    target_x: float
    estimated_y: float
    degree: int
    steps: List[BasisPolynomialStep]
    polynomial_formula_str: str
    ramp_rate: float
    integral_over_domain: float
    support_points: List[Point2D]
    runge_warning: bool
    warning_message: Optional[str] = None
    computation_time_ms: float

class CurveEstimateRequest(BaseModel):
    points: List[Point2D]
    num_eval_points: Optional[int] = 120
    x_min: Optional[float] = None
    x_max: Optional[float] = None
    include_basis_curves: Optional[bool] = True

class CurveEstimateResponse(BaseModel):
    degree: int
    eval_x: List[float]
    eval_y: List[float]
    basis_curves: Optional[List[Dict[str, Any]]] = None
    support_points: List[Point2D]
    min_y: float
    max_y: float
    total_energy_kwh: float
    avg_power_kw: float
    peak_power_kw: float
    peak_x: float

class ValidationRequest(BaseModel):
    points: List[Point2D]
    support_indices: Optional[List[int]] = None
    test_ratio: Optional[float] = 0.3

class ValidationPointResult(BaseModel):
    x: float
    actual_y: float
    estimated_y: float
    error: float
    abs_error: float
    percent_error: float
    is_support_node: bool

class ValidationResponse(BaseModel):
    degree: int
    support_points_count: int
    test_points_count: int
    mae: float
    rmse: float
    mape: float
    r2_score: float
    points_comparison: List[ValidationPointResult]
    curve_x: List[float]
    curve_y: List[float]

class PiecewiseEstimateRequest(BaseModel):
    points: List[Point2D]
    window_size: Optional[int] = 3
    num_eval_points: Optional[int] = 150

class HistoryRecord(BaseModel):
    id: int
    dataset_id: Optional[int]
    dataset_name: Optional[str]
    target_x: float
    estimated_y: float
    polynomial_degree: int
    method: str
    support_points_count: int
    ramp_rate: Optional[float]
    integral_val: Optional[float]
    mae: Optional[float]
    rmse: Optional[float]
    created_at: str
    notes: Optional[str]

class DataDiagnostics(BaseModel):
    is_valid: bool
    status: str
    issues: List[str]
    total_records: int
    unique_times: int
    has_duplicates: bool
    duplicate_timestamps: List[float]
    has_negatives: bool
    negative_count: int
    is_sorted: bool
    min_x: float
    max_x: float
    min_y: float
    max_y: float
    avg_y: float
    can_interpolate: bool
    recommendation: str

class CapstoneSummaryReport(BaseModel):
    project_title: str
    academic_context: str
    dataset_name: str
    unit: str
    interval_type: str
    total_records: int
    domain_range: str
    mean_consumption: float
    peak_consumption: float
    min_consumption: float
    validation_status: str
    support_nodes_count: int
    polynomial_degree: int
    target_x: float
    estimated_y: float
    ramp_rate: float
    integral_val: float
    mae: float
    rmse: float
    mape: float
    r2_score: float
    key_findings: List[str]
    generated_at: str
