import type {
  DatasetSummary,
  DatasetDetail,
  Point2D,
  SingleEstimateResponse,
  CurveEstimateResponse,
  ValidationResponse,
  HistoryRecord,
  DataDiagnostics,
  CapstoneSummaryReport,
} from '../types';

export const API_BASE = import.meta.env.VITE_API_URL
  ? `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api`
  : '/api';

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to connect to backend API');
  return res.json();
}

export async function fetchDatasets(): Promise<DatasetSummary[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error('Failed to fetch datasets');
  return res.json();
}

export async function fetchDatasetDetail(id: number): Promise<DatasetDetail> {
  const res = await fetch(`${API_BASE}/datasets/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch dataset #${id}`);
  return res.json();
}

export async function createDataset(payload: {
  name: string;
  description?: string;
  unit?: string;
  interval_type?: string;
}): Promise<DatasetDetail> {
  const res = await fetch(`${API_BASE}/datasets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create dataset');
  return res.json();
}

export async function deleteDataset(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/datasets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete dataset #${id}`);
}

export async function resetSampleDatasets(): Promise<void> {
  const res = await fetch(`${API_BASE}/datasets/reset-samples`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset sample datasets');
}

export async function fetchDatasetDiagnostics(datasetId: number): Promise<DataDiagnostics> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/diagnostics`);
  if (!res.ok) throw new Error('Failed to run dataset diagnostics');
  return res.json();
}

export async function cleanDataset(datasetId: number): Promise<{ message: string; cleaned_records_count: number }> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/clean`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to clean dataset');
  }
  return res.json();
}

export async function sortDataset(datasetId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/sort`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to sort dataset');
  return res.json();
}

export async function addRecord(
  datasetId: number,
  record: {
    time_index: number;
    timestamp_str?: string;
    consumption_value: number;
    temperature?: number | null;
    notes?: string;
  }
): Promise<void> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([record]),
  });
  if (!res.ok) throw new Error('Failed to add record');
}

export async function updateRecord(
  recordId: number,
  record: {
    time_index: number;
    timestamp_str?: string;
    consumption_value: number;
    temperature?: number | null;
    notes?: string;
  }
): Promise<void> {
  const res = await fetch(`${API_BASE}/records/${recordId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`Failed to update record #${recordId}`);
}

export async function deleteRecord(recordId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/records/${recordId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete record #${recordId}`);
}

export async function uploadDatasetCsv(datasetId: number, file: File): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/upload-csv`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload CSV file');
  }
  return res.json();
}

export async function estimateSingle(payload: {
  target_x: number;
  points: Point2D[];
  dataset_id?: number;
  dataset_name?: string;
  save_to_history?: boolean;
  notes?: string;
}): Promise<SingleEstimateResponse> {
  const res = await fetch(`${API_BASE}/estimate/single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Interpolation calculation failed');
  }
  return res.json();
}

export async function estimateCurve(payload: {
  points: Point2D[];
  num_eval_points?: number;
  x_min?: number;
  x_max?: number;
  include_basis_curves?: boolean;
}): Promise<CurveEstimateResponse> {
  const res = await fetch(`${API_BASE}/estimate/curve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Curve evaluation failed');
  }
  return res.json();
}

export async function estimatePiecewiseCurve(payload: {
  points: Point2D[];
  window_size?: number;
  num_eval_points?: number;
}): Promise<CurveEstimateResponse> {
  const res = await fetch(`${API_BASE}/estimate/piecewise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Piecewise interpolation failed');
  }
  return res.json();
}

export async function validateModel(payload: {
  points: Point2D[];
  support_indices?: number[];
  test_ratio?: number;
}): Promise<ValidationResponse> {
  const res = await fetch(`${API_BASE}/estimate/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Validation run failed');
  }
  return res.json();
}

export async function fetchHistory(): Promise<HistoryRecord[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Failed to fetch estimation history');
  return res.json();
}

export async function deleteHistoryRecord(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete history record #${id}`);
}

export async function clearHistory(): Promise<void> {
  const res = await fetch(`${API_BASE}/history`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear history');
}

export async function fetchCapstoneReport(datasetId?: number, targetX?: number): Promise<CapstoneSummaryReport> {
  const params = new URLSearchParams();
  if (datasetId !== undefined) params.append('dataset_id', String(datasetId));
  if (targetX !== undefined) params.append('target_x', String(targetX));
  const res = await fetch(`${API_BASE}/reports/capstone-summary?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to generate capstone report');
  return res.json();
}
