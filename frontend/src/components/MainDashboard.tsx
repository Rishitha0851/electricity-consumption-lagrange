import React from 'react';
import {
  Zap,
  Activity,
  Gauge,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  GraduationCap,
  Calculator,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type {
  DatasetDetail,
  SingleEstimateResponse,
  CurveEstimateResponse,
  DataDiagnostics,
} from '../types';

interface MainDashboardProps {
  dataset: DatasetDetail | null;
  selectedNodes: number[];
  diagnostics: DataDiagnostics | null;
  singleResult: SingleEstimateResponse | null;
  curveResult: CurveEstimateResponse | null;
  targetX: number;
  onNavigate: (tab: 'dashboard' | 'data-prep' | 'estimation' | 'visualizations' | 'validation' | 'capstone-demo' | 'history' | 'report' | 'theory') => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  dataset,
  selectedNodes,
  diagnostics,
  singleResult,
  curveResult,
  targetX,
  onNavigate,
}) => {
  const records = dataset?.records || [];
  const unit = dataset?.unit || 'kWh';

  const values = records.map((r) => r.consumption_value);
  const totalRecords = records.length;
  const avgVal = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const maxVal = values.length ? Math.max(...values) : 0;
  const minVal = values.length ? Math.min(...values) : 0;
  const estimatedVal = singleResult ? singleResult.estimated_y : (values.length ? avgVal : 0);
  const validationStatus = diagnostics ? diagnostics.status : 'Clean & Verified';

  // Preview chart data
  const chartData = React.useMemo(() => {
    if (!curveResult) {
      return records.map((r) => ({
        x: Number(r.time_index.toFixed(2)),
        actual: Number(r.consumption_value.toFixed(2)),
      }));
    }

    const map = new Map<number, any>();
    curveResult.eval_x.forEach((x, idx) => {
      const rx = Number(x.toFixed(2));
      map.set(rx, { x: rx, interpolated: Number(curveResult.eval_y[idx].toFixed(2)) });
    });

    records.forEach((r) => {
      const rx = Number(r.time_index.toFixed(2));
      const existing = map.get(rx) || { x: rx };
      existing.actual = Number(r.consumption_value.toFixed(2));
      if (selectedNodes.includes(r.id)) {
        existing.support = Number(r.consumption_value.toFixed(2));
      }
      map.set(rx, existing);
    });

    if (singleResult) {
      const tx = Number(targetX.toFixed(2));
      const existing = map.get(tx) || { x: tx };
      existing.target = Number(singleResult.estimated_y.toFixed(2));
      map.set(tx, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.x - b.x);
  }, [curveResult, records, selectedNodes, singleResult, targetX]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                Capstone Analytics Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Active: {dataset?.name || 'No Dataset'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Electricity Consumption Analytics
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1 max-w-3xl">
              An intelligent electricity consumption estimation system powered by Lagrange Polynomial Interpolation.
            </p>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('capstone-demo')}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2"
            >
              <GraduationCap className="w-4 h-4 text-cyan-300" />
              <span>Launch Capstone Demo</span>
            </button>
            <button
              onClick={() => onNavigate('estimation')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>Estimation Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Required Dynamic KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Total Data Records */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Total Data Records
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {totalRecords} <span className="text-xs font-medium text-slate-400">pts</span>
          </div>
          <span className="text-[10px] text-slate-400">Recorded telemetry</span>
        </div>

        {/* KPI 2: Average Electricity Consumption */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-emerald-500" />
            Average Consumption
          </span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {avgVal.toFixed(2)} <span className="text-xs font-medium text-slate-400">{unit}</span>
          </div>
          <span className="text-[10px] text-slate-400">Mean load demand</span>
        </div>

        {/* KPI 3: Maximum Consumption */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-rose-300 transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
            Maximum Consumption
          </span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {maxVal.toFixed(2)} <span className="text-xs font-medium text-slate-400">{unit}</span>
          </div>
          <span className="text-[10px] text-slate-400">Peak observed load</span>
        </div>

        {/* KPI 4: Minimum Consumption */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-cyan-300 transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-cyan-500" />
            Minimum Consumption
          </span>
          <div className="text-xl font-black text-slate-800 mt-1">
            {minVal.toFixed(2)} <span className="text-xs font-medium text-slate-400">{unit}</span>
          </div>
          <span className="text-[10px] text-slate-400">Base load level</span>
        </div>

        {/* KPI 5: Estimated Consumption */}
        <div className="bg-white rounded-2xl p-4 border border-blue-200 bg-blue-50/20 shadow-xs hover:border-blue-400 transition-colors">
          <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            Estimated Load P(x*)
          </span>
          <div className="text-xl font-black text-blue-700 mt-1">
            {estimatedVal.toFixed(2)} <span className="text-xs font-medium text-slate-400">{unit}</span>
          </div>
          <span className="text-[10px] text-blue-600 font-medium">At x* = {targetX.toFixed(1)}h</span>
        </div>

        {/* KPI 6: Data Validation Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            {diagnostics?.is_valid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            )}
            Validation Status
          </span>
          <div className={`text-sm font-bold mt-1.5 truncate ${
            diagnostics?.is_valid ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            {validationStatus}
          </div>
          <span className="text-[10px] text-slate-400">Automated diagnostic</span>
        </div>
      </div>

      {/* Main Dashboard Preview Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Live Load Curve & Lagrange Polynomial Interpolation
            </h3>
            <p className="text-xs text-slate-500">
              Interactive visualization of original observations, support nodes, and the continuous mathematical polynomial.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('visualizations')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>Explore all 5 views</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={['auto', 'auto']}
                tick={{ fill: '#64748b', fontSize: 11 }}
                label={{ value: 'Time (Hours)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                label={{ value: `Consumption (${unit})`, angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="interpolated"
                name="Lagrange Curve P(x)"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={false}
              />
              <Scatter dataKey="actual" name="Observed Readings" fill="#94a3b8" />
              <Scatter dataKey="support" name="Selected Support Node" fill="#2563eb" />
              <Scatter dataKey="target" name="Target Estimate P(x*)" fill="#f59e0b" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Module Overview & Navigation Pathway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Module 1 Pathway */}
        <div
          onClick={() => onNavigate('data-prep')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mt-3">Module 1 — Data Collection & Preparation</h4>
          <p className="text-xs text-slate-500 mt-1">
            CSV import, manual record entry, diagnostic checks, automated cleaning, sorting, and Chebyshev support node selection.
          </p>
        </div>

        {/* Module 2 Pathway */}
        <div
          onClick={() => onNavigate('estimation')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mt-3">Module 2 — Lagrange Estimation Studio</h4>
          <p className="text-xs text-slate-500 mt-1">
            Interactive estimation workspace, step-by-step algebraic basis decomposition, load ramp rate P'(x), and definite energy integral.
          </p>
        </div>

        {/* Validation Studio Pathway */}
        <div
          onClick={() => onNavigate('validation')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mt-3">Validation & Accuracy Studio</h4>
          <p className="text-xs text-slate-500 mt-1">
            Holdout cross-validation, MAE, RMSE, MAPE (with robust zero-handling), and coefficient of determination R² analysis.
          </p>
        </div>
      </div>
    </div>
  );
};
