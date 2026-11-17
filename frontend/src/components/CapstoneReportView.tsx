import React, { useState, useEffect } from 'react';
import {
  Printer,
  GraduationCap,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { DatasetDetail, CapstoneSummaryReport } from '../types';
import { fetchCapstoneReport } from '../api/client';

interface CapstoneReportProps {
  dataset: DatasetDetail | null;
  targetX: number;
}

export const CapstoneReportView: React.FC<CapstoneReportProps> = ({ dataset, targetX }) => {
  const [report, setReport] = useState<CapstoneSummaryReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReport = async () => {
    if (!dataset) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchCapstoneReport(dataset.id, targetX);
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dataset, targetX]);

  const handlePrint = () => {
    window.print();
  };

  if (!dataset) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        Please select a dataset to generate a capstone summary report.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Academic Capstone Deliverable
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Project Summary & Faculty Evaluation Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synthesized engineering summary report ready for presentation to faculty evaluators.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadReport}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh Report"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {loading && !report && (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
          Compiling academic report from backend numerical calculations...
        </div>
      )}

      {/* Printable Report Document */}
      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-6 h-6 text-blue-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Capstone Project Evaluation Document
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Date: {report.generated_at}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
              {report.project_title}
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              {report.academic_context}
            </p>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
              1. Executive Summary & Objective
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This application implements a complete, full-stack numerical simulation and forecasting system for smart grid electricity consumption telemetry. By applying the unique <span className="font-semibold text-slate-800">Lagrange Interpolating Polynomial</span> of degree <span className="font-mono font-bold">n = {report.polynomial_degree}</span> across <span className="font-semibold text-slate-800">{report.support_nodes_count} support nodes</span>, the system models continuous electricity demand, evaluates instantaneous ramp rates (kW/h), integrates cumulative energy throughput (kWh), and validates accuracy against withheld ground truth data.
            </p>
          </div>

          {/* Section 2: Dataset Profile */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
              2. Dataset Specifications & Telemetry Profile
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Dataset Profile:</span>
                <div className="font-bold text-slate-900 mt-0.5">{report.dataset_name}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Telemetry Unit:</span>
                <div className="font-bold text-slate-900 mt-0.5">{report.unit} ({report.interval_type})</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Total Observations:</span>
                <div className="font-bold text-slate-900 mt-0.5">{report.total_records} Records</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Domain Range:</span>
                <div className="font-bold text-slate-900 mt-0.5">{report.domain_range}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Peak Demand:</span>
                <div className="font-bold text-rose-600 mt-0.5">{report.peak_consumption.toFixed(2)} {report.unit}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Base Demand:</span>
                <div className="font-bold text-slate-900 mt-0.5">{report.min_consumption.toFixed(2)} {report.unit}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Mean Demand:</span>
                <div className="font-bold text-emerald-700 mt-0.5">{report.mean_consumption.toFixed(2)} {report.unit}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Validation Status:</span>
                <div className="font-bold text-emerald-700 mt-0.5">{report.validation_status}</div>
              </div>
            </div>
          </div>

          {/* Section 3: Numerical Formulation */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
              3. Numerical Method Formulation
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-center space-y-1">
              <div>P(x) = ∑ᵢ₌₀ⁿ yᵢ · Lᵢ(x)</div>
              <div className="text-blue-700">Lᵢ(x) = ∏ⱼ≠ᵢ (x - xⱼ) / (xᵢ - xⱼ)</div>
            </div>
            <p className="text-xs text-slate-600">
              Interpolation order is strictly <span className="font-mono">n = {report.polynomial_degree}</span> utilizing <span className="font-mono">{report.support_nodes_count}</span> Chebyshev/uniform support nodes. Denominators are guaranteed non-zero by Module 1 coordinate deduplication.
            </p>
          </div>

          {/* Section 4: Results & Forecast */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
              4. Active Estimation & Analytical Results
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <span className="text-blue-700 font-semibold">Target Coordinate x*</span>
                <div className="text-base font-bold text-blue-900 mt-0.5">{report.target_x.toFixed(2)} hours</div>
              </div>
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <span className="text-blue-700 font-semibold">Estimated Load P(x*)</span>
                <div className="text-base font-bold text-blue-900 mt-0.5">{report.estimated_y.toFixed(3)} {report.unit}</div>
              </div>
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                <span className="text-indigo-700 font-semibold">Instantaneous Ramp Rate</span>
                <div className="text-base font-bold text-indigo-900 mt-0.5">{report.ramp_rate.toFixed(3)} {report.unit}/h</div>
              </div>
              <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl">
                <span className="text-cyan-700 font-semibold">Total Energy ∫ P(x) dx</span>
                <div className="text-base font-bold text-cyan-900 mt-0.5">{report.integral_val.toFixed(2)} {report.unit === 'kW' ? 'kWh' : report.unit}</div>
              </div>
            </div>
          </div>

          {/* Section 5: Verification Metrics */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
              5. Holdout Cross-Validation & Accuracy Verification
            </h3>
            <div className="grid grid-cols-4 gap-3 text-xs text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">MAE</span>
                <div className="font-bold text-slate-900 mt-0.5">{report.mae.toFixed(3)} {report.unit}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">RMSE</span>
                <div className="font-bold text-slate-900 mt-0.5">{report.rmse.toFixed(3)} {report.unit}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">MAPE</span>
                <div className="font-bold text-emerald-700 mt-0.5">{report.mape.toFixed(2)} %</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">R² Score</span>
                <div className="font-bold text-purple-800 mt-0.5">{report.r2_score.toFixed(4)}</div>
              </div>
            </div>
          </div>

          {/* Section 6: Key Findings */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
              6. Evaluation Checklist & Key Findings
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {report.key_findings.map((finding, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Signoff block */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <div className="font-semibold text-slate-800">Student Developer Signature:</div>
              <div className="mt-8 border-b border-slate-300 w-48" />
              <div className="mt-1 text-[11px] text-slate-400">Capstone Project Candidate</div>
            </div>
            <div>
              <div className="font-semibold text-slate-800">Faculty Evaluator Review:</div>
              <div className="mt-8 border-b border-slate-300 w-48" />
              <div className="mt-1 text-[11px] text-slate-400">Department of Computer Science & Engineering</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
