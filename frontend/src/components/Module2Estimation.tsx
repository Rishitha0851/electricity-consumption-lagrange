import React, { useState, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  Activity,
  Layers,
  AlertTriangle,
  Bookmark,
  Sparkles,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Sliders,
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
  ReferenceLine,
} from 'recharts';
import type {
  DatasetDetail,
  SingleEstimateResponse,
  CurveEstimateResponse,
  Point2D,
} from '../types';
import {
  estimateSingle,
  estimateCurve,
  estimatePiecewiseCurve,
} from '../api/client';

interface Module2Props {
  dataset: DatasetDetail | null;
  selectedNodes: number[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<number[]>>;
  singleResult: SingleEstimateResponse | null;
  setSingleResult: (res: SingleEstimateResponse | null) => void;
  curveResult: CurveEstimateResponse | null;
  setCurveResult: (res: CurveEstimateResponse | null) => void;
  targetX: number;
  setTargetX: (x: number) => void;
  onRefreshHistory: () => void;
}

export const Module2Estimation: React.FC<Module2Props> = ({
  dataset,
  selectedNodes,
  setSelectedNodes,
  singleResult,
  setSingleResult,
  curveResult,
  setCurveResult,
  targetX,
  setTargetX,
  onRefreshHistory,
}) => {
  const records = dataset?.records || [];
  const minX = records.length ? records[0].time_index : 0;
  const maxX = records.length ? records[records.length - 1].time_index : 24;

  const [method, setMethod] = useState<'global' | 'piecewise'>('global');
  const [windowSize] = useState<number>(3);
  const [showBasisCurves, setShowBasisCurves] = useState<boolean>(false);
  const [saveNotes, setSaveNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active support points from dataset
  const activeSupportRecords = records.filter((r) => selectedNodes.includes(r.id));
  const supportPoints: Point2D[] = activeSupportRecords.map((r) => ({
    x: r.time_index,
    y: r.consumption_value,
    label: r.timestamp_str || undefined,
  }));

  // Run calculation on change of support nodes, method, or windowSize
  useEffect(() => {
    if (supportPoints.length >= 2) {
      runEstimation();
    } else {
      setSingleResult(null);
      setCurveResult(null);
    }
  }, [selectedNodes, method, windowSize]);

  const runEstimation = async () => {
    if (supportPoints.length < 2) {
      setErrorMsg('Please select at least 2 support nodes to compute Lagrange Interpolation.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setIsSaved(false);

      // Single point estimate
      const singleRes = await estimateSingle({
        target_x: targetX,
        points: supportPoints,
        dataset_id: dataset?.id,
        dataset_name: dataset?.name,
        save_to_history: false,
        notes: saveNotes,
      });
      setSingleResult(singleRes);

      // Dense curve estimate
      if (method === 'global') {
        const curveRes = await estimateCurve({
          points: supportPoints,
          num_eval_points: 120,
          x_min: minX,
          x_max: maxX,
          include_basis_curves: true,
        });
        setCurveResult(curveRes);
      } else {
        const pieceRes = await estimatePiecewiseCurve({
          points: supportPoints,
          window_size: windowSize,
          num_eval_points: 150,
        });
        setCurveResult(pieceRes);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Interpolation calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExplicitSave = async () => {
    if (!singleResult) return;
    try {
      await estimateSingle({
        target_x: targetX,
        points: supportPoints,
        dataset_id: dataset?.id,
        dataset_name: dataset?.name,
        save_to_history: true,
        notes: saveNotes || 'Saved from Module 2 Estimation Studio',
      });
      setIsSaved(true);
      onRefreshHistory();
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      alert('Failed to save to history: ' + err.message);
    }
  };

  // Node selection shortcuts
  const selectUniformNodes = (count: number) => {
    if (!records.length) return;
    const step = (records.length - 1) / (count - 1);
    const chosen: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(records.length - 1, Math.round(i * step));
      chosen.push(records[idx].id);
    }
    setSelectedNodes(Array.from(new Set(chosen)));
  };

  const selectChebyshevNodes = (count: number) => {
    if (!records.length) return;
    const a = records[0].time_index;
    const b = records[records.length - 1].time_index;
    const chosenIds: number[] = [];
    for (let k = 1; k <= count; k++) {
      const chebX = 0.5 * (a + b) + 0.5 * (b - a) * Math.cos(((2 * k - 1) / (2 * count)) * Math.PI);
      let closest = records[0];
      let minDiff = Math.abs(records[0].time_index - chebX);
      for (const rec of records) {
        const diff = Math.abs(rec.time_index - chebX);
        if (diff < minDiff) {
          minDiff = diff;
          closest = rec;
        }
      }
      chosenIds.push(closest.id);
    }
    setSelectedNodes(Array.from(new Set(chosenIds)));
  };

  // Combine data for Recharts
  const chartData = React.useMemo(() => {
    if (!curveResult) return [];

    const pointsMap = new Map<number, any>();

    curveResult.eval_x.forEach((x, idx) => {
      const roundedX = Number(x.toFixed(2));
      const obj: any = {
        x: roundedX,
        lagrangeY: Number(curveResult.eval_y[idx].toFixed(2)),
      };

      if (showBasisCurves && curveResult.basis_curves) {
        curveResult.basis_curves.forEach((bc, bIdx) => {
          if (bc.values[idx] !== undefined) {
            obj[`basis_${bIdx}`] = Number(bc.values[idx].toFixed(3));
          }
        });
      }
      pointsMap.set(roundedX, obj);
    });

    records.forEach((r) => {
      const roundedX = Number(r.time_index.toFixed(2));
      const existing = pointsMap.get(roundedX) || { x: roundedX };
      existing.actualY = Number(r.consumption_value.toFixed(2));
      if (selectedNodes.includes(r.id)) {
        existing.supportY = Number(r.consumption_value.toFixed(2));
      }
      pointsMap.set(roundedX, existing);
    });

    if (singleResult) {
      const targetRounded = Number(targetX.toFixed(2));
      const existing = pointsMap.get(targetRounded) || { x: targetRounded };
      existing.targetY = Number(singleResult.estimated_y.toFixed(2));
      pointsMap.set(targetRounded, existing);
    }

    return Array.from(pointsMap.values()).sort((a, b) => a.x - b.x);
  }, [curveResult, records, selectedNodes, singleResult, targetX, showBasisCurves]);

  if (!dataset) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm text-slate-500">Please select a dataset first.</p>
      </div>
    );
  }

  const degree = supportPoints.length > 0 ? supportPoints.length - 1 : 0;
  const unit = dataset.unit || 'kWh';

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {singleResult?.runge_warning && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start space-x-3 text-amber-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Runge's Phenomenon or Boundary Extrapolation Alert: </span>
            {singleResult.warning_message}
            <div className="mt-1 flex items-center space-x-2">
              <span className="text-amber-800">Recommendation:</span>
              <button
                onClick={() => setMethod('piecewise')}
                className="font-bold underline text-blue-700 hover:text-blue-900"
              >
                Switch to Piecewise Lagrange
              </button>
              <span>or select Chebyshev-spaced nodes below.</span>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Lagrange Engine Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Polynomial Degree: n = {degree}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                {selectedNodes.length} Support Nodes
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Electricity Demand Estimation Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select support points, choose uniform/Chebyshev distribution, enter target coordinate x*, and execute Lagrange interpolation.
            </p>
          </div>

          {/* Quick presets for target time */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Target Presets:</span>
            {[
              { label: '07:30h', val: 7.5 },
              { label: '12:30h', val: 12.5 },
              { label: '18:30h', val: 18.5 },
              { label: '22:30h', val: 22.5 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setTargetX(preset.val);
                  setTimeout(() => runEstimation(), 50);
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors border border-slate-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Support Node Quick-Bar in Module 2 */}
        <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">Support Points Selection:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => selectUniformNodes(5)}
              className="px-2.5 py-1 text-xs font-medium bg-white text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              5 Uniform Nodes
            </button>
            <button
              onClick={() => selectUniformNodes(7)}
              className="px-2.5 py-1 text-xs font-medium bg-white text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              7 Uniform Nodes
            </button>
            <button
              onClick={() => selectChebyshevNodes(6)}
              className="px-2.5 py-1 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors flex items-center space-x-1 shadow-xs"
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>6 Chebyshev Nodes</span>
            </button>
            <button
              onClick={() => setSelectedNodes(records.map((r) => r.id))}
              className="px-2.5 py-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              All {records.length} Points
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-3">
          {/* Target Hour / Coordinate Slider & Input */}
          <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Target Coordinate (x*)
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step="0.1"
                  min={minX}
                  max={maxX}
                  value={targetX}
                  onChange={(e) => setTargetX(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-right text-xs font-mono font-bold bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-500 font-medium">hrs</span>
              </div>
            </div>

            <input
              type="range"
              min={minX}
              max={maxX}
              step="0.05"
              value={targetX}
              onChange={(e) => setTargetX(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Start: {minX.toFixed(1)}h</span>
              <span className="font-semibold text-blue-700">x* = {targetX.toFixed(2)}h</span>
              <span>End: {maxX.toFixed(1)}h</span>
            </div>
          </div>

          {/* Interpolation Method Selector */}
          <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Method Formulation
            </label>
            <div className="flex rounded-lg bg-slate-200 p-0.5 text-xs">
              <button
                onClick={() => setMethod('global')}
                className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
                  method === 'global' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Global Lagrange
              </button>
              <button
                onClick={() => setMethod('piecewise')}
                className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
                  method === 'piecewise' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Piecewise Local
              </button>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              {method === 'global'
                ? `Exact degree n = ${degree} polynomial through all support nodes`
                : `Sliding local ${windowSize}-point interpolation (immune to Runge's oscillation)`}
            </div>
          </div>

          {/* Action & Toggle Controls */}
          <div className="md:col-span-3 flex flex-col justify-between space-y-2">
            <button
              onClick={runEstimation}
              disabled={loading || supportPoints.length < 2}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              <span>{loading ? 'Calculating...' : 'Estimate Consumption'}</span>
            </button>

            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200/60">
              <input
                type="checkbox"
                checked={showBasisCurves}
                onChange={(e) => setShowBasisCurves(e.target.checked)}
                className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Overlay Basis Curves L_i(x)</span>
            </label>
          </div>
        </div>
      </div>

      {/* KPI Results Grid */}
      {singleResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Zap className="w-4 h-4 text-blue-600" />
              Estimated Consumption P(x*)
            </span>
            <div className="text-2xl font-black text-blue-700 tracking-tight mt-1">
              {singleResult.estimated_y.toFixed(3)}{' '}
              <span className="text-xs font-semibold text-slate-500">{unit}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              At coordinate <span className="font-mono font-bold text-slate-700">{singleResult.target_x.toFixed(2)}h</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Instantaneous Ramp Rate P'(x*)
            </span>
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`text-2xl font-black tracking-tight ${
                  singleResult.ramp_rate >= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {singleResult.ramp_rate >= 0 ? '+' : ''}
                {singleResult.ramp_rate.toFixed(3)}
              </span>
              <span className="text-xs font-semibold text-slate-500">{unit}/h</span>
            </div>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              {singleResult.ramp_rate >= 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Demand surging
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> Demand shedding
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Activity className="w-4 h-4 text-cyan-600" />
              Integrated Energy ∫ P(x) dx
            </span>
            <div className="text-2xl font-black text-cyan-800 tracking-tight mt-1">
              {singleResult.integral_over_domain.toFixed(2)}{' '}
              <span className="text-xs font-semibold text-slate-500">
                {unit === 'kW' ? 'kWh' : unit}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Total area under interpolated curve
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Model Complexity
            </span>
            <div className="text-2xl font-black text-purple-800 tracking-tight mt-1">
              Degree n = {singleResult.degree}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Computed in {singleResult.computation_time_ms.toFixed(2)} ms
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Recharts Visualizer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Continuous Electricity Load Curve & Lagrange Polynomial
            </h3>
            <p className="text-xs text-slate-500">
              Blue dots are selected support nodes; smooth cyan curve is the continuous Lagrange polynomial P(x); amber marker is target estimate.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <span className="w-3 h-3 rounded-full bg-slate-300" /> Raw Points
            </span>
            <span className="flex items-center gap-1.5 font-medium text-blue-700">
              <span className="w-3 h-3 rounded-full bg-blue-600" /> Support Nodes
            </span>
            <span className="flex items-center gap-1.5 font-medium text-cyan-600">
              <span className="w-4 h-0.5 bg-cyan-500" /> Lagrange Curve
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-600">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Target x*
            </span>
          </div>
        </div>

        <div className="h-96 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={['auto', 'auto']}
                tick={{ fill: '#64748b', fontSize: 11 }}
                label={{ value: 'Time Coordinate (Hours)', position: 'insideBottom', offset: -15, fill: '#475569', fontSize: 12 }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#64748b', fontSize: 11 }}
                label={{ value: `Electricity Demand (${unit})`, angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }}
              />
              <Tooltip />
              {singleResult && (
                <ReferenceLine
                  x={Number(targetX.toFixed(2))}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `x* = ${targetX.toFixed(2)}h`,
                    position: 'top',
                    fill: '#b45309',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="lagrangeY"
                name="Lagrange Curve P(x)"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={false}
              />
              <Scatter dataKey="actualY" name="Observed Records" fill="#94a3b8" />
              <Scatter dataKey="supportY" name="Support Nodes (xi, yi)" fill="#2563eb" />
              <Scatter dataKey="targetY" name="Estimate P(x*)" fill="#f59e0b" />
              {showBasisCurves &&
                curveResult?.basis_curves?.map((_, bIdx) => (
                  <Line
                    key={`basis_${bIdx}`}
                    type="monotone"
                    dataKey={`basis_${bIdx}`}
                    name={`Basis L_${bIdx}(x)`}
                    stroke={`hsl(${(bIdx * 55) % 360}, 70%, 50%)`}
                    strokeWidth={1.2}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Step-by-Step Mathematical Decomposition Panel */}
      {singleResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Step-by-Step Algebraic Decomposition
              </h3>
              <p className="text-xs text-slate-500">
                Mathematical evaluation of each basis polynomial term{' '}
                <span className="font-mono">L_i(x*)</span> and its weighted product{' '}
                <span className="font-mono">y_i · L_i(x*)</span> at target{' '}
                <span className="font-semibold">x* = {singleResult.target_x.toFixed(2)}</span>.
              </p>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
              P(x) = ∑ y_i · L_i(x)
            </div>
          </div>

          <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-3 w-10 text-center">i</th>
                  <th className="p-3">Node (x_i, y_i)</th>
                  <th className="p-3">Numerator ∏(x* - x_j)</th>
                  <th className="p-3">Denominator ∏(x_i - x_j)</th>
                  <th className="p-3">Basis L_i(x*)</th>
                  <th className="p-3 font-bold text-blue-700">Weighted y_i · L_i(x*)</th>
                  <th className="p-3 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {singleResult.steps.map((step) => {
                  const contribPct =
                    singleResult.estimated_y !== 0
                      ? Math.min(100, Math.max(0, (step.weighted_value / singleResult.estimated_y) * 100))
                      : 0;

                  return (
                    <tr key={step.i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-bold text-blue-600">{step.i}</td>
                      <td className="p-3 font-mono font-medium">
                        ({step.xi.toFixed(2)}, {step.yi.toFixed(2)})
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {step.numerator_value_at_x.toExponential(3)}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {step.denominator_value.toExponential(3)}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {step.Li_value_at_x.toFixed(4)}
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700">
                        {step.weighted_value.toFixed(4)} {unit}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center space-x-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${contribPct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {contribPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-blue-50/70 border-t border-blue-200 font-bold text-slate-800">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-xs uppercase tracking-wider text-blue-900">
                    Final Estimated Load P({singleResult.target_x.toFixed(2)}) = ∑ y_i · L_i(x*):
                  </td>
                  <td className="p-3 font-mono text-sm text-blue-800">
                    {singleResult.estimated_y.toFixed(4)} {unit}
                  </td>
                  <td className="p-3 text-right text-xs text-blue-700">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700">Polynomial Representation:</span>
            <div className="font-mono text-blue-900 mt-1 break-all bg-white p-2 rounded-lg border border-slate-200">
              {singleResult.polynomial_formula_str}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Add optional notes for this estimation run..."
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <button
              onClick={handleExplicitSave}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors shrink-0"
            >
              {isSaved ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Saved to History!' : 'Log Run in Database'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
