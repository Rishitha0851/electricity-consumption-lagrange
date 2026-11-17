import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  GitCompare,
  BarChart2,
  PieChart,
} from 'lucide-react';
import type { DatasetDetail, CurveEstimateResponse, SingleEstimateResponse } from '../types';

interface InteractiveChartsProps {
  dataset: DatasetDetail | null;
  selectedNodes: number[];
  curveResult: CurveEstimateResponse | null;
  singleResult: SingleEstimateResponse | null;
  targetX: number;
}

export const InteractiveChartsView: React.FC<InteractiveChartsProps> = ({
  dataset,
  selectedNodes,
  curveResult,
  singleResult,
  targetX,
}) => {
  const [activeChartView, setActiveChartView] = useState<
    'all' | 'trend' | 'lagrange' | 'comparison' | 'residuals' | 'distribution'
  >('all');

  if (!dataset || !dataset.records.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        Please select a dataset to view interactive visualizations.
      </div>
    );
  }

  const records = dataset.records;
  const unit = dataset.unit || 'kWh';

  // 1. Trend Data
  const trendData = records.map((r) => ({
    time: Number(r.time_index.toFixed(2)),
    label: r.timestamp_str || `${r.time_index}h`,
    consumption: Number(r.consumption_value.toFixed(2)),
    isSupport: selectedNodes.includes(r.id),
  }));

  // 2. Lagrange Curve Data
  const lagrangeChartData = React.useMemo(() => {
    if (!curveResult) return trendData;
    const map = new Map<number, any>();

    curveResult.eval_x.forEach((x, idx) => {
      const rx = Number(x.toFixed(2));
      map.set(rx, {
        time: rx,
        interpolated: Number(curveResult.eval_y[idx].toFixed(2)),
      });
    });

    records.forEach((r) => {
      const rx = Number(r.time_index.toFixed(2));
      const existing = map.get(rx) || { time: rx };
      existing.actual = Number(r.consumption_value.toFixed(2));
      if (selectedNodes.includes(r.id)) {
        existing.supportNode = Number(r.consumption_value.toFixed(2));
      }
      map.set(rx, existing);
    });

    if (singleResult) {
      const tx = Number(targetX.toFixed(2));
      const existing = map.get(tx) || { time: tx };
      existing.target = Number(singleResult.estimated_y.toFixed(2));
      map.set(tx, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  }, [curveResult, records, selectedNodes, singleResult, targetX, trendData]);

  // 3. Actual vs Estimated at observed points
  const comparisonData = records.map((r) => {
    let est = r.consumption_value;
    if (curveResult) {
      let minDiff = Infinity;
      curveResult.eval_x.forEach((ex, idx) => {
        const diff = Math.abs(ex - r.time_index);
        if (diff < minDiff) {
          minDiff = diff;
          est = curveResult.eval_y[idx];
        }
      });
    }
    const error = est - r.consumption_value;
    return {
      time: Number(r.time_index.toFixed(2)),
      label: r.timestamp_str || `${r.time_index}h`,
      actual: Number(r.consumption_value.toFixed(2)),
      estimated: Number(est.toFixed(2)),
      residual: Number(error.toFixed(3)),
      absError: Number(Math.abs(error).toFixed(3)),
      isSupport: selectedNodes.includes(r.id),
    };
  });

  // 4. Consumption Distribution (Histogram Bins)
  const values = records.map((r) => r.consumption_value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const numBins = 6;
  const binStep = maxVal > minVal ? (maxVal - minVal) / numBins : 1;

  const distributionData = Array.from({ length: numBins }).map((_, idx) => {
    const low = minVal + idx * binStep;
    const high = low + binStep;
    const count = values.filter((v) => (idx === numBins - 1 ? v >= low && v <= high : v >= low && v < high)).length;
    return {
      binRange: `${low.toFixed(1)}-${high.toFixed(1)} ${unit}`,
      frequency: count,
      percentage: Number(((count / values.length) * 100).toFixed(1)),
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Controls & View Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">
                Interactive Analytics
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Unit: {unit}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Multi-Dimensional Visualization Studio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive visual suite displaying raw demand trends, continuous Lagrange interpolation, actual vs. estimated comparison, residual errors, and load distribution.
            </p>
          </div>

          {/* Chart Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveChartView('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartView === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All 5 Views
            </button>
            <button
              onClick={() => setActiveChartView('trend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartView === 'trend'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trend (A)
            </button>
            <button
              onClick={() => setActiveChartView('lagrange')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartView === 'lagrange'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lagrange Curve (B)
            </button>
            <button
              onClick={() => setActiveChartView('comparison')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartView === 'comparison'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comparison (C)
            </button>
            <button
              onClick={() => setActiveChartView('residuals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartView === 'residuals'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Residuals (D)
            </button>
            <button
              onClick={() => setActiveChartView('distribution')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartView === 'distribution'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Distribution (E)
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Charts */}
      <div className="space-y-6">
        {/* CHART A: Electricity Consumption Trend */}
        {(activeChartView === 'all' || activeChartView === 'trend') && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    View A — Electricity Consumption Trend (Time Series)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Observed electricity load across the entire temporal domain.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                {records.length} Recorded Readings
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    label={{ value: 'Time (Hours / Units)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    label={{ value: `Consumption (${unit})`, angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} ${unit}`, 'Consumption']}
                    labelFormatter={(label) => `Time: ${label}h`}
                  />
                  <Line
                    type="monotone"
                    dataKey="consumption"
                    name="Observed Consumption"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART B: Lagrange Interpolation Curve */}
        {(activeChartView === 'all' || activeChartView === 'lagrange') && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    View B — Continuous Lagrange Interpolation Curve
                  </h3>
                  <p className="text-xs text-slate-500">
                    Original observations, selected support nodes, synthesized polynomial curve, and highlighted target x* = {targetX.toFixed(2)}h.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Support Nodes ({selectedNodes.length})
                </span>
                <span className="flex items-center gap-1.5 font-medium text-cyan-600">
                  <span className="w-3.5 h-0.5 bg-cyan-500" /> Lagrange Curve
                </span>
                <span className="flex items-center gap-1.5 font-medium text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Target x*
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={lagrangeChartData} margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="time"
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
                  <ReferenceLine x={Number(targetX.toFixed(2))} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="interpolated"
                    name="Lagrange Curve P(x)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Scatter dataKey="actual" name="Observed Points" fill="#94a3b8" />
                  <Scatter dataKey="supportNode" name="Support Node" fill="#2563eb" />
                  <Scatter dataKey="target" name="Target Estimate" fill="#f59e0b" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART C & D in Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CHART C: Actual vs Estimated Comparison */}
          {(activeChartView === 'all' || activeChartView === 'comparison') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <GitCompare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      View C — Actual vs. Estimated Comparison
                    </h3>
                    <p className="text-xs text-slate-500">
                      Side-by-side verification at all recorded timestamps.
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actual" name="Actual Load" stroke="#64748b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="estimated" name="Lagrange Fit" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CHART D: Residual Analysis */}
          {(activeChartView === 'all' || activeChartView === 'residuals') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      View D — Residual Error Analysis (y - ŷ)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Zero error at support nodes; deviations represent approximation errors.
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => [`${val} ${unit}`, 'Residual Error']} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Bar dataKey="residual" name="Residual (est - act)" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* CHART E: Consumption Distribution */}
        {(activeChartView === 'all' || activeChartView === 'distribution') && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    View E — Electricity Consumption Distribution
                  </h3>
                  <p className="text-xs text-slate-500">
                    Frequency histogram binning electrical demand to identify base vs peak clusters.
                  </p>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="binRange" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Frequency (Points)', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 }} />
                  <Tooltip formatter={(val: any, _name: any, item: any) => [`${val} readings (${item.payload.percentage}%)`, 'Frequency']} />
                  <Bar dataKey="frequency" name="Record Count" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
