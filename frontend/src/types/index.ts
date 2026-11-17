export interface ConsumptionRecord {
  id: number;
  dataset_id: number;
  time_index: number;
  timestamp_str?: string | null;
  consumption_value: number;
  temperature?: number | null;
  notes?: string | null;
}

export interface DatasetSummary {
  id: number;
  name: string;
  description?: string | null;
  unit: string;
  interval_type: string;
  record_count: number;
  created_at: string;
}

export interface DatasetDetail extends DatasetSummary {
  records: ConsumptionRecord[];
}

export interface Point2D {
  x: number;
  y: number;
  label?: string;
}

export interface BasisPolynomialStep {
  i: number;
  xi: number;
  yi: number;
  term_factors: string[];
  denominator_value: number;
  numerator_value_at_x: number;
  Li_value_at_x: number;
  weighted_value: number;
  formula_latex: string;
}

export interface SingleEstimateResponse {
  target_x: number;
  estimated_y: number;
  degree: number;
  steps: BasisPolynomialStep[];
  polynomial_formula_str: string;
  ramp_rate: number;
  integral_over_domain: number;
  support_points: Point2D[];
  runge_warning: boolean;
  warning_message?: string | null;
  computation_time_ms: number;
}

export interface BasisCurve {
  index: number;
  node_x: number;
  node_y: number;
  values: number[];
}

export interface CurveEstimateResponse {
  degree: number;
  eval_x: number[];
  eval_y: number[];
  basis_curves?: BasisCurve[];
  support_points: Point2D[];
  min_y: number;
  max_y: number;
  total_energy_kwh: number;
  avg_power_kw: number;
  peak_power_kw: number;
  peak_x: number;
}

export interface ValidationPointResult {
  x: number;
  actual_y: number;
  estimated_y: number;
  error: number;
  abs_error: number;
  percent_error: number;
  is_support_node: boolean;
}

export interface ValidationResponse {
  degree: number;
  support_points_count: number;
  test_points_count: number;
  mae: number;
  rmse: number;
  mape: number;
  r2_score: number;
  points_comparison: ValidationPointResult[];
  curve_x: number[];
  curve_y: number[];
}

export interface HistoryRecord {
  id: number;
  dataset_id?: number | null;
  dataset_name?: string | null;
  target_x: number;
  estimated_y: number;
  polynomial_degree: number;
  method: string;
  support_points_count: number;
  ramp_rate?: number | null;
  integral_val?: number | null;
  mae?: number | null;
  rmse?: number | null;
  created_at: string;
  notes?: string | null;
}

export interface DataDiagnostics {
  is_valid: boolean;
  status: string;
  issues: string[];
  total_records: number;
  unique_times: number;
  has_duplicates: boolean;
  duplicate_timestamps: number[];
  has_negatives: boolean;
  negative_count: number;
  is_sorted: boolean;
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  avg_y: number;
  can_interpolate: boolean;
  recommendation: string;
}

export interface CapstoneSummaryReport {
  project_title: string;
  academic_context: string;
  dataset_name: string;
  unit: string;
  interval_type: string;
  total_records: number;
  domain_range: string;
  mean_consumption: number;
  peak_consumption: number;
  min_consumption: number;
  validation_status: string;
  support_nodes_count: number;
  polynomial_degree: number;
  target_x: number;
  estimated_y: number;
  ramp_rate: number;
  integral_val: number;
  mae: number;
  rmse: number;
  mape: number;
  r2_score: number;
  key_findings: string[];
  generated_at: string;
}
