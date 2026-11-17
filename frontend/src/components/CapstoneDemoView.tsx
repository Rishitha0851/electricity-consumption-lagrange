import React, { useState } from 'react';
import {
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileText,
} from 'lucide-react';
import type {
  DatasetDetail,
  DatasetSummary,
  SingleEstimateResponse,
  CurveEstimateResponse,
  ValidationResponse,
  DataDiagnostics,
  CapstoneSummaryReport,
} from '../types';
import {
  cleanDataset,
  estimateSingle,
  estimateCurve,
  validateModel,
  fetchCapstoneReport,
} from '../api/client';

interface CapstoneDemoProps {
  datasets: DatasetSummary[];
  selectedDatasetId: number | null;
  setSelectedDatasetId: (id: number) => void;
  dataset: DatasetDetail | null;
  selectedNodes: number[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<number[]>>;
  diagnostics: DataDiagnostics | null;
  onRefreshData: () => void;
  singleResult: SingleEstimateResponse | null;
  setSingleResult: (res: SingleEstimateResponse | null) => void;
  curveResult: CurveEstimateResponse | null;
  setCurveResult: (res: CurveEstimateResponse | null) => void;
  targetX: number;
  setTargetX: (x: number) => void;
}

const STEPS = [
  { id: 1, title: 'Select Sample Dataset', desc: 'Choose a standardized real-world electricity profile' },
  { id: 2, title: 'Inspect Records & Statistics', desc: 'Examine raw time series readings & summary metrics' },
  { id: 3, title: 'Validation & Cleaning', desc: 'Execute diagnostic verification & remove duplicates' },
  { id: 4, title: 'Select Support Nodes', desc: 'Choose uniform or Chebyshev interpolation points' },
  { id: 5, title: 'Enter Target Time (x*)', desc: 'Specify unobserved coordinate for load forecasting' },
  { id: 6, title: 'Execute Lagrange Engine', desc: 'Run Python numerical interpolation' },
  { id: 7, title: 'Step-by-Step Mathematical Proof', desc: 'Inspect basis polynomials Li(x*) & weighted sum' },
  { id: 8, title: 'Interpolation Curve & Analytics', desc: 'Continuous curve, instantaneous ramp rate & area' },
  { id: 9, title: 'Holdout Cross-Validation', desc: 'Evaluate MAE, RMSE, MAPE, and R² goodness of fit' },
  { id: 10, title: 'Final Capstone Project Summary', desc: 'Comprehensive academic evaluation report' },
];

export const CapstoneDemoView: React.FC<CapstoneDemoProps> = ({
  datasets,
  selectedDatasetId,
  setSelectedDatasetId,
  dataset,
  selectedNodes,
  setSelectedNodes,
  diagnostics,
  onRefreshData,
  singleResult,
  setSingleResult,
  setCurveResult,
  targetX,
  setTargetX,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [capstoneReport, setCapstoneReport] = useState<CapstoneSummaryReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);

  const unit = dataset?.unit || 'kWh';
  const records = dataset?.records || [];

  const handleNext = () => {
    if (currentStep < 10) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Step 3: Run Cleaning
  const handleExecuteClean = async () => {
    if (!dataset) return;
    try {
      setIsCleaning(true);
      await cleanDataset(dataset.id);
      onRefreshData();
    } catch (err: any) {
      alert('Cleaning error: ' + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  // Step 4: Preset Nodes
  const handleSelectChebyshevNodes = () => {
    if (!records.length) return;
    const a = records[0].time_index;
    const b = records[records.length - 1].time_index;
    const count = 6;
    const chosenIds: number[] = [];

    for (let k = 1; k <= count; k++) {
      const chebX = 0.5 * (a + b) + 0.5 * (b - a) * Math.cos(((2 * k - 1) / (2 * count)) * Math.PI);
      let closest = records[0];
      let minD = Math.abs(records[0].time_index - chebX);
      for (const r of records) {
        const d = Math.abs(r.time_index - chebX);
        if (d < minD) {
          minD = d;
          closest = r;
        }
      }
      chosenIds.push(closest.id);
    }
    setSelectedNodes(Array.from(new Set(chosenIds)));
  };

  // Step 6: Execute Interpolation
  const handleExecuteInterpolation = async () => {
    if (!dataset) return;
    const activeRecords = records.filter((r) => selectedNodes.includes(r.id));
    if (activeRecords.length < 2) {
      alert('Please select at least 2 support nodes in Step 4.');
      return;
    }

    try {
      setIsCalculating(true);
      const pts = activeRecords.map((r) => ({
        x: r.time_index,
        y: r.consumption_value,
      }));

      const single = await estimateSingle({
        target_x: targetX,
        points: pts,
        dataset_id: dataset.id,
        dataset_name: dataset.name,
        save_to_history: true,
        notes: 'Capstone Evaluation Run',
      });
      setSingleResult(single);

      const curve = await estimateCurve({
        points: pts,
        num_eval_points: 120,
        x_min: records[0].time_index,
        x_max: records[records.length - 1].time_index,
      });
      setCurveResult(curve);
    } catch (err: any) {
      alert('Estimation error: ' + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Step 9: Run Validation
  const handleExecuteValidation = async () => {
    if (!records.length) return;
    try {
      setIsValidating(true);
      const pts = records.map((r) => ({
        x: r.time_index,
        y: r.consumption_value,
      }));
      const val = await validateModel({ points: pts, test_ratio: 0.3 });
      setValidationResult(val);
    } catch (err: any) {
      alert('Validation error: ' + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Step 10: Generate Capstone Report
  const handleGenerateReport = async () => {
    if (!dataset) return;
    try {
      setIsLoadingReport(true);
      const rep = await fetchCapstoneReport(dataset.id, targetX);
      setCapstoneReport(rep);
    } catch (err: any) {
      alert('Report error: ' + err.message);
    } finally {
      setIsLoadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Capstone Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/20">
              <GraduationCap className="w-8 h-8 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-400 text-slate-900">
                  Capstone Evaluation Mode
                </span>
                <span className="text-xs text-blue-200">10-Step Guided Live Walkthrough</span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white">
                Live Demonstration & Faculty Examination Studio
              </h2>
              <p className="text-xs text-blue-100 max-w-xl">
                A structured, step-by-step presentation interface showing practical data collection, quality cleaning, Lagrange polynomial interpolation, validation, and engineering synthesis.
              </p>
            </div>
          </div>

          {/* Stepper counter */}
          <div className="flex items-center space-x-2 self-start md:self-auto">
            <span className="text-xs font-semibold text-blue-200">Step {currentStep} of 10</span>
            <div className="w-24 bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-5 mt-4 border-t border-white/10 pb-1 scrollbar-none">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(s.id)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                currentStep === s.id
                  ? 'bg-white text-blue-900 font-bold shadow-sm'
                  : currentStep > s.id
                  ? 'bg-white/20 text-blue-100 hover:bg-white/30'
                  : 'bg-white/5 text-blue-300 hover:bg-white/10'
              }`}
            >
              <span>{s.id}.</span>
              <span className="truncate max-w-[120px]">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Step Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs min-h-[420px] flex flex-col justify-between">
        <div>
          {/* Step Title Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Step {currentStep} of 10
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {STEPS[currentStep - 1].title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {STEPS[currentStep - 1].desc}
              </p>
            </div>

            {/* Quick status badge */}
            <div className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
              Active: {dataset?.name} ({unit})
            </div>
          </div>

          {/* STEP 1: Select Dataset */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Select one of the 4 preloaded real-world electricity profiles for demonstration. Notice that appropriate measurement units (<span className="font-mono font-bold text-blue-700">kWh</span>, <span className="font-mono font-bold text-indigo-700">kW</span>, <span className="font-mono font-bold text-emerald-700">MWh</span>) are strictly preserved.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {datasets.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDatasetId(d.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedDatasetId === d.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{d.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-blue-700 border border-blue-200">
                        {d.unit}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {d.description || 'Standard profile readings'}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>{d.record_count} Records</span>
                      <span>Type: {d.interval_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Display Original Records & Dataset Statistics */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500">Total Observations</span>
                  <div className="text-lg font-bold text-slate-900">{records.length} pts</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500">Domain Range</span>
                  <div className="text-lg font-bold text-blue-700">
                    {records.length ? `${records[0].time_index} to ${records[records.length - 1].time_index}h` : '—'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500">Peak Demand</span>
                  <div className="text-lg font-bold text-rose-600">
                    {records.length ? Math.max(...records.map((r) => r.consumption_value)).toFixed(2) : 0} {unit}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500">Base Demand</span>
                  <div className="text-lg font-bold text-cyan-700">
                    {records.length ? Math.min(...records.map((r) => r.consumption_value)).toFixed(2) : 0} {unit}
                  </div>
                </div>
              </div>

              {/* Data Table preview */}
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Time Coordinate (x)</th>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">Consumption ({unit})</th>
                      <th className="p-2.5">Temperature</th>
                      <th className="p-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.slice(0, 10).map((r) => (
                      <tr key={r.id}>
                        <td className="p-2.5 font-mono font-medium">{r.time_index.toFixed(2)}</td>
                        <td className="p-2.5">{r.timestamp_str || `T+${r.time_index}`}</td>
                        <td className="p-2.5 font-mono font-bold text-blue-700">{r.consumption_value.toFixed(2)}</td>
                        <td className="p-2.5">{r.temperature !== null ? `${r.temperature} °C` : '—'}</td>
                        <td className="p-2.5 text-slate-500">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400">Showing first 10 records of {records.length} total entries.</p>
            </div>
          )}

          {/* STEP 3: Data Validation and Cleaning */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700">Validation Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      diagnostics?.is_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {diagnostics?.status || 'Diagnostics Running...'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {diagnostics?.recommendation || 'Validating coordinate uniqueness, order, and physical feasibility.'}
                  </p>
                </div>

                <button
                  onClick={handleExecuteClean}
                  disabled={isCleaning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
                >
                  {isCleaning ? 'Cleaning & Sorting...' : 'Clean & Auto-Fix Dataset'}
                </button>
              </div>

              {/* Diagnostic checks breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">Coordinate Uniqueness</span>
                  <div className="text-slate-500 mt-1">
                    {diagnostics?.has_duplicates ? 'Duplicates Detected' : 'All x Coordinates Unique'}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">Chronological Monotonicity</span>
                  <div className="text-slate-500 mt-1">
                    {diagnostics?.is_sorted ? 'Strictly Ascending' : 'Requires Sorting'}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">Lagrange Readiness</span>
                  <div className="text-emerald-600 font-bold mt-1">
                    Ready for Matrix Formulation
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Select Support Nodes */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                To build a Lagrange polynomial <span className="font-mono">P(x)</span> of degree <span className="font-mono">n</span>, exactly <span className="font-mono">n + 1</span> support nodes must be chosen. Use Chebyshev spacing to minimize boundary errors.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSelectChebyshevNodes}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Select 6 Chebyshev Nodes (Mitigates Runge's Phenomenon)</span>
                </button>
                <button
                  onClick={() => {
                    const step = (records.length - 1) / 4;
                    const ids = [0, 1, 2, 3, 4].map((i) => records[Math.round(i * step)].id);
                    setSelectedNodes(ids);
                  }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Select 5 Uniform Nodes
                </button>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900">
                <span className="font-bold">Active Support Points:</span> {selectedNodes.length} nodes selected (forming polynomial degree <span className="font-mono font-bold">n = {Math.max(0, selectedNodes.length - 1)}</span>).
              </div>
            </div>
          )}

          {/* STEP 5: Enter Target Coordinate */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Choose an unobserved intermediate time coordinate <span className="font-mono font-bold">x*</span> to estimate power consumption.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Target Coordinate (x*):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetX}
                    onChange={(e) => setTargetX(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right text-xs font-mono font-bold bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <input
                  type="range"
                  min={records.length ? records[0].time_index : 0}
                  max={records.length ? records[records.length - 1].time_index : 24}
                  step="0.1"
                  value={targetX}
                  onChange={(e) => setTargetX(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Start: {records.length ? records[0].time_index : 0}h</span>
                  <span className="font-bold text-blue-700">Target x* = {targetX.toFixed(2)}h</span>
                  <span>End: {records.length ? records[records.length - 1].time_index : 24}h</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Execute Lagrange Interpolation */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Execute the mathematical numerical solver on the backend. This evaluates the basis polynomials <span className="font-mono">L_i(x*)</span> and instantaneous derivative <span className="font-mono">P'(x*)</span>.
              </p>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Ready to Compute:</div>
                  <div className="text-xs text-slate-500">
                    Evaluating P({targetX.toFixed(2)}) across {selectedNodes.length} support points.
                  </div>
                </div>
                <button
                  onClick={handleExecuteInterpolation}
                  disabled={isCalculating}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                >
                  {isCalculating ? 'Computing Lagrange...' : 'Execute Lagrange Interpolation'}
                </button>
              </div>

              {singleResult && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                  <div className="font-bold text-sm">Calculation Succeeded!</div>
                  <div className="mt-1">
                    Estimated load P({singleResult.target_x.toFixed(2)}) ={' '}
                    <span className="font-mono font-bold text-base text-blue-800">
                      {singleResult.estimated_y.toFixed(3)} {unit}
                    </span>
                    {' '}• Ramp Rate: <span className="font-mono font-bold">{singleResult.ramp_rate.toFixed(3)} {unit}/h</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Step-by-Step Mathematical Calculation */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Lagrange Formula Decomposition: P(x) = ∑ y_i · L_i(x)
                </span>
                <span className="text-xs text-slate-500">Target x* = {targetX.toFixed(2)}h</span>
              </div>

              {singleResult?.steps ? (
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">i</th>
                        <th className="p-2">Node (x_i, y_i)</th>
                        <th className="p-2">Numerator ∏(x* - x_j)</th>
                        <th className="p-2">Denominator ∏(x_i - x_j)</th>
                        <th className="p-2">Basis L_i(x*)</th>
                        <th className="p-2 font-bold text-blue-700">y_i · L_i(x*)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {singleResult.steps.map((st) => (
                        <tr key={st.i}>
                          <td className="p-2 font-bold text-blue-600">{st.i}</td>
                          <td className="p-2 font-mono">({st.xi.toFixed(2)}, {st.yi.toFixed(2)})</td>
                          <td className="p-2 font-mono">{st.numerator_value_at_x.toExponential(2)}</td>
                          <td className="p-2 font-mono">{st.denominator_value.toExponential(2)}</td>
                          <td className="p-2 font-mono font-bold">{st.Li_value_at_x.toFixed(4)}</td>
                          <td className="p-2 font-mono font-bold text-blue-800">{st.weighted_value.toFixed(4)} {unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  Please execute interpolation in Step 6 first to view mathematical breakdown.
                </div>
              )}
            </div>
          )}

          {/* STEP 8: Continuous Interpolation Curve & Estimation */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                  <span className="text-[11px] text-blue-700 font-semibold">Estimated Load P(x*)</span>
                  <div className="text-lg font-black text-blue-800">
                    {singleResult?.estimated_y.toFixed(3) || '—'} {unit}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
                  <span className="text-[11px] text-indigo-700 font-semibold">Ramp Rate P'(x*)</span>
                  <div className="text-lg font-black text-indigo-800">
                    {singleResult ? `${singleResult.ramp_rate >= 0 ? '+' : ''}${singleResult.ramp_rate.toFixed(3)} ${unit}/h` : '—'}
                  </div>
                </div>
                <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-200">
                  <span className="text-[11px] text-cyan-700 font-semibold">Integrated Energy Area</span>
                  <div className="text-lg font-black text-cyan-800">
                    {singleResult?.integral_over_domain.toFixed(2) || '—'} {unit === 'kW' ? 'kWh' : unit}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-600 font-semibold">Polynomial Degree</span>
                  <div className="text-lg font-black text-slate-800">
                    n = {singleResult?.degree ?? Math.max(0, selectedNodes.length - 1)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Full continuous curve and residual comparison are available in the Interactive Visualizations studio.
              </p>
            </div>
          )}

          {/* STEP 9: Holdout Validation */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Holdout Cross-Validation:</div>
                  <div className="text-xs text-slate-500">
                    Withholds 30% of records as ground truth to evaluate approximation error.
                  </div>
                </div>
                <button
                  onClick={handleExecuteValidation}
                  disabled={isValidating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  {isValidating ? 'Validating...' : 'Run Holdout Validation'}
                </button>
              </div>

              {validationResult && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">MAE (Mean Absolute Error)</span>
                    <div className="text-lg font-bold text-slate-900">{validationResult.mae.toFixed(3)} {unit}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">RMSE</span>
                    <div className="text-lg font-bold text-slate-900">{validationResult.rmse.toFixed(3)} {unit}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">MAPE</span>
                    <div className="text-lg font-bold text-emerald-700">{validationResult.mape.toFixed(2)} %</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">R² Goodness-of-Fit</span>
                    <div className="text-lg font-bold text-purple-800">{validationResult.r2_score.toFixed(4)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 10: Generate Final Project Summary */}
          {currentStep === 10 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Capstone Project Summary Generator:</div>
                  <div className="text-xs text-slate-500">
                    Synthesizes problem formulation, dataset profile, numerical results, and evaluation checklist.
                  </div>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={isLoadingReport}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isLoadingReport ? 'Synthesizing...' : 'Generate Academic Report'}</span>
                </button>
              </div>

              {capstoneReport && (
                <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-sm">{capstoneReport.project_title}</h4>
                    <p className="text-slate-500">{capstoneReport.academic_context}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div><span className="font-semibold text-slate-700">Dataset:</span> {capstoneReport.dataset_name}</div>
                    <div><span className="font-semibold text-slate-700">Unit:</span> {capstoneReport.unit}</div>
                    <div><span className="font-semibold text-slate-700">Observations:</span> {capstoneReport.total_records}</div>
                    <div><span className="font-semibold text-slate-700">Estimated Load:</span> {capstoneReport.estimated_y} {capstoneReport.unit}</div>
                    <div><span className="font-semibold text-slate-700">Ramp Rate:</span> {capstoneReport.ramp_rate} {capstoneReport.unit}/h</div>
                    <div><span className="font-semibold text-slate-700">R² Score:</span> {capstoneReport.r2_score}</div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <div className="font-bold text-slate-800 mb-1">Key Evaluation Findings:</div>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                      {capstoneReport.key_findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stepper Footer Controls */}
        <div className="flex items-center justify-between pt-5 mt-6 border-t border-slate-100">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-1.5 transition-colors border border-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          <div className="text-xs text-slate-500 font-medium">
            Step {currentStep} of 10
          </div>

          <button
            onClick={handleNext}
            disabled={currentStep === 10}
            className="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <span>Next Step</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
