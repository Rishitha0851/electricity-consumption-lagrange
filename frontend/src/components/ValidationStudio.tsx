import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Percent,
  TrendingDown,
  Target,
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
import type { DatasetDetail, ValidationResponse, Point2D } from '../types';
import { validateModel } from '../api/client';

interface ValidationProps {
  dataset: DatasetDetail | null;
}

export const ValidationStudio: React.FC<ValidationProps> = ({ dataset }) => {
  const [testRatio, setTestRatio] = useState<number>(0.3);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const records = dataset?.records || [];

  useEffect(() => {
    if (records.length >= 4) {
      runValidation();
    }
  }, [dataset, testRatio]);

  const runValidation = async () => {
    if (records.length < 4) {
      setErrorMsg('At least 4 records are required to perform holdout validation.');
      return;
    }

    try {
      setErrorMsg(null);
      const points: Point2D[] = records.map((r) => ({
        x: r.time_index,
        y: r.consumption_value,
      }));

      const res = await validateModel({
        points,
        test_ratio: testRatio,
      });
      setValidationResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed');
    }
  };

  if (!dataset) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm text-slate-500">Please select a dataset to perform validation.</p>
      </div>
    );
  }

  const unit = dataset.unit || 'kWh';

  // Build chart dataset
  const chartData = React.useMemo(() => {
    if (!validationResult) return [];

    const map = new Map<number, any>();

    validationResult.curve_x.forEach((x, idx) => {
      const rx = Number(x.toFixed(2));
      map.set(rx, {
        x: rx,
        interpolatedY: Number(validationResult.curve_y[idx].toFixed(2)),
      });
    });

    validationResult.points_comparison.forEach((pt) => {
      const rx = Number(pt.x.toFixed(2));
      const existing = map.get(rx) || { x: rx };
      if (pt.is_support_node) {
        existing.supportNodeY = Number(pt.actual_y.toFixed(2));
      } else {
        existing.testActualY = Number(pt.actual_y.toFixed(2));
        existing.testEstimatedY = Number(pt.estimated_y.toFixed(2));
      }
      map.set(rx, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.x - b.x);
  }, [validationResult]);

  return (
    <div className="space-y-6">
      {/* Top Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Model Verification
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Holdout Cross-Validation
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Interpolation Error & Goodness-of-Fit Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hides a portion of known records as ground-truth test points, fits the Lagrange polynomial on the remaining support nodes, and calculates residual accuracy metrics.
            </p>
          </div>

          {/* Test Split Ratio Slider */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs w-full sm:w-64">
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Holdout Test Ratio:</span>
              <span className="text-blue-600 font-bold">{Math.round(testRatio * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={testRatio}
              onChange={(e) => setTestRatio(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>10% test</span>
              <span>50% test</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Accuracy KPI Cards */}
        {validationResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Target className="w-4 h-4 text-blue-600" />
                Mean Absolute Error (MAE)
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {validationResult.mae.toFixed(3)}{' '}
                <span className="text-xs font-normal text-slate-500">{unit}</span>
              </div>
              <span className="text-[11px] text-slate-400">Average magnitude of error</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-indigo-600" />
                Root Mean Squared Error (RMSE)
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {validationResult.rmse.toFixed(3)}{' '}
                <span className="text-xs font-normal text-slate-500">{unit}</span>
              </div>
              <span className="text-[11px] text-slate-400">Penalizes large deviations</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Percent className="w-4 h-4 text-emerald-600" />
                Mean Abs % Error (MAPE)
              </span>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {validationResult.mape.toFixed(2)} %
              </div>
              <span className="text-[11px] text-slate-400">Relative accuracy index</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                R² Goodness of Fit
              </span>
              <div className="text-xl font-bold text-purple-800 mt-1">
                {validationResult.r2_score.toFixed(4)}
              </div>
              <span className="text-[11px] text-slate-400">Variance explained ratio</span>
            </div>
          </div>
        )}
      </div>

      {/* Validation Chart */}
      {validationResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ground Truth vs. Interpolation Fit at Holdout Nodes
              </h3>
              <p className="text-xs text-slate-500">
                Solid curve is Lagrange fit on {validationResult.support_points_count} support nodes; red crosses are unobserved test points evaluated for residual error.
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1 font-medium text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Support Nodes
              </span>
              <span className="flex items-center gap-1 font-medium text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Holdout Ground Truth
              </span>
            </div>
          </div>

          <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 15, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={['auto', 'auto']}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  label={{
                    value: 'Time Coordinate (Hours)',
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#475569',
                    fontSize: 12,
                  }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  label={{
                    value: `Consumption (${unit})`,
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#475569',
                    fontSize: 12,
                  }}
                />
                <Tooltip />

                {/* Continuous curve */}
                <Line
                  type="monotone"
                  dataKey="interpolatedY"
                  name="Interpolated Curve"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={false}
                />

                {/* Support nodes */}
                <Scatter
                  dataKey="supportNodeY"
                  name="Training Support Node"
                  fill="#2563eb"
                  shape="circle"
                />

                {/* Holdout test actual */}
                <Scatter
                  dataKey="testActualY"
                  name="Holdout Ground Truth"
                  fill="#f43f5e"
                  shape="cross"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Residual Error Table */}
          <div className="mt-6">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Holdout Test Points Residual Inspection
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Time (x)</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Actual Load</th>
                    <th className="p-3">Interpolated</th>
                    <th className="p-3">Residual Error</th>
                    <th className="p-3">Absolute Error</th>
                    <th className="p-3 text-right">% Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {validationResult.points_comparison.map((pt, idx) => {
                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          !pt.is_support_node ? 'bg-amber-50/30' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3 font-mono font-medium">{pt.x.toFixed(2)}h</td>
                        <td className="p-3">
                          {pt.is_support_node ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                              Support Node
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                              Holdout Test
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono">{pt.actual_y.toFixed(2)}</td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {pt.estimated_y.toFixed(2)}
                        </td>
                        <td
                          className={`p-3 font-mono ${
                            pt.error > 0 ? 'text-amber-700' : 'text-slate-600'
                          }`}
                        >
                          {pt.is_support_node ? '0.00' : `${pt.error > 0 ? '+' : ''}${pt.error.toFixed(3)}`}
                        </td>
                        <td className="p-3 font-mono">
                          {pt.is_support_node ? '0.00' : pt.abs_error.toFixed(3)}
                        </td>
                        <td className="p-3 font-mono text-right font-bold text-slate-800">
                          {pt.is_support_node ? '0.00%' : `${pt.percent_error.toFixed(2)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
