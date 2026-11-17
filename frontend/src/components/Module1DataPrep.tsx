import React, { useState } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Sparkles,
  Sliders,
  Info,
  Calendar,
  Gauge,
  Edit2,
  Check,
  X,
  ArrowRight,
  Wrench,
  ArrowUpDown,
} from 'lucide-react';
import type { DatasetDetail, ConsumptionRecord, DataDiagnostics } from '../types';
import {
  uploadDatasetCsv,
  addRecord,
  updateRecord,
  deleteRecord,
  createDataset,
  resetSampleDatasets,
  cleanDataset,
  sortDataset,
  API_BASE,
} from '../api/client';

interface Module1Props {
  dataset: DatasetDetail | null;
  selectedNodes: number[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<number[]>>;
  diagnostics: DataDiagnostics | null;
  onRefreshData: () => void;
  onGoToEstimation: () => void;
}

export const Module1DataPrep: React.FC<Module1Props> = ({
  dataset,
  selectedNodes,
  setSelectedNodes,
  diagnostics,
  onRefreshData,
  onGoToEstimation,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewDatasetModal, setShowNewDatasetModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New record form state
  const [newTimeIndex, setNewTimeIndex] = useState('');
  const [newTimestampStr, setNewTimestampStr] = useState('');
  const [newConsumption, setNewConsumption] = useState('');
  const [newTemperature, setNewTemperature] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Editing record state
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    time_index: number;
    timestamp_str: string;
    consumption_value: number;
    temperature: string;
    notes: string;
  }>({
    time_index: 0,
    timestamp_str: '',
    consumption_value: 0,
    temperature: '',
    notes: '',
  });

  // New dataset form state
  const [newDsName, setNewDsName] = useState('');
  const [newDsDesc, setNewDsDesc] = useState('');
  const [newDsUnit, setNewDsUnit] = useState('kWh');
  const [newDsInterval, setNewDsInterval] = useState('hourly');

  if (!dataset) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">No Dataset Selected</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Please select an existing dataset or click below to restore sample electricity profiles.
        </p>
        <button
          onClick={async () => {
            await resetSampleDatasets();
            onRefreshData();
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm"
        >
          Load Standard Electricity Profiles
        </button>
      </div>
    );
  }

  const records = dataset.records || [];
  const unit = dataset.unit || 'kWh';

  // Summary statistics
  const values = records.map((r) => r.consumption_value);
  const maxVal = values.length ? Math.max(...values) : 0;
  const minVal = values.length ? Math.min(...values) : 0;
  const avgVal = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  // Node selection helpers
  const handleToggleNode = (id: number) => {
    setSelectedNodes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedNodes(records.map((r) => r.id));
  };

  const handleClearSelection = () => {
    setSelectedNodes([]);
  };

  const handleSelectUniform = (count: number) => {
    if (records.length <= count) {
      handleSelectAll();
      return;
    }
    const step = (records.length - 1) / (count - 1);
    const chosen: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(records.length - 1, Math.round(i * step));
      chosen.push(records[idx].id);
    }
    setSelectedNodes(Array.from(new Set(chosen)));
  };

  const handleSelectChebyshev = (count: number) => {
    if (records.length <= count) {
      handleSelectAll();
      return;
    }
    const a = records[0].time_index;
    const b = records[records.length - 1].time_index;
    const chosenIds: number[] = [];

    // Chebyshev nodes in [a, b]: x_k = (a+b)/2 + (b-a)/2 * cos((2k-1)/(2n)*PI)
    for (let k = 1; k <= count; k++) {
      const chebX =
        0.5 * (a + b) +
        0.5 * (b - a) * Math.cos(((2 * k - 1) / (2 * count)) * Math.PI);

      let closestRec = records[0];
      let minDiff = Math.abs(records[0].time_index - chebX);
      for (const rec of records) {
        const diff = Math.abs(rec.time_index - chebX);
        if (diff < minDiff) {
          minDiff = diff;
          closestRec = rec;
        }
      }
      chosenIds.push(closestRec.id);
    }
    setSelectedNodes(Array.from(new Set(chosenIds)));
  };

  // Actions
  const handleCleanDataset = async () => {
    try {
      setIsCleaning(true);
      const res = await cleanDataset(dataset.id);
      setActionSuccessMsg(res.message);
      onRefreshData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Cleaning error: ' + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSortDataset = async () => {
    try {
      setIsSorting(true);
      const res = await sortDataset(dataset.id);
      setActionSuccessMsg(res.message);
      onRefreshData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Sort error: ' + err.message);
    } finally {
      setIsSorting(false);
    }
  };

  // Add single record submit
  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimeIndex || !newConsumption) return;
    try {
      await addRecord(dataset.id, {
        time_index: parseFloat(newTimeIndex),
        timestamp_str: newTimestampStr || undefined,
        consumption_value: parseFloat(newConsumption),
        temperature: newTemperature ? parseFloat(newTemperature) : undefined,
        notes: newNotes || undefined,
      });
      setShowAddModal(false);
      setNewTimeIndex('');
      setNewTimestampStr('');
      setNewConsumption('');
      setNewTemperature('');
      setNewNotes('');
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error adding record');
    }
  };

  // Upload CSV submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      setUploadLoading(true);
      setUploadStatus(null);
      const res = await uploadDatasetCsv(dataset.id, uploadFile);
      setUploadStatus(res.message);
      setUploadFile(null);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadStatus(null);
        onRefreshData();
      }, 1000);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  // Create new dataset submit
  const handleCreateDatasetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDsName) return;
    try {
      await createDataset({
        name: newDsName,
        description: newDsDesc || undefined,
        unit: newDsUnit,
        interval_type: newDsInterval,
      });
      setShowNewDatasetModal(false);
      setNewDsName('');
      setNewDsDesc('');
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error creating dataset');
    }
  };

  // Edit record inline
  const startEditing = (rec: ConsumptionRecord) => {
    setEditingRecordId(rec.id);
    setEditValues({
      time_index: rec.time_index,
      timestamp_str: rec.timestamp_str || '',
      consumption_value: rec.consumption_value,
      temperature: rec.temperature !== null && rec.temperature !== undefined ? String(rec.temperature) : '',
      notes: rec.notes || '',
    });
  };

  const saveEdit = async (recordId: number) => {
    try {
      await updateRecord(recordId, {
        time_index: editValues.time_index,
        timestamp_str: editValues.timestamp_str || undefined,
        consumption_value: editValues.consumption_value,
        temperature: editValues.temperature !== '' ? parseFloat(editValues.temperature) : undefined,
        notes: editValues.notes || undefined,
      });
      setEditingRecordId(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update record');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('Are you sure you want to remove this record?')) return;
    try {
      await deleteRecord(recordId);
      setSelectedNodes((prev) => prev.filter((id) => id !== recordId));
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Workflow Pipeline Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 text-xs">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">1</span>
            <span className="font-bold text-slate-800">Data Collection</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">2</span>
            <span className="font-bold text-slate-800">Data Validation</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">3</span>
            <span className="font-bold text-slate-800">Data Cleaning</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">4</span>
            <span className="font-bold text-slate-800">Data Preparation</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px]">5</span>
            <span className="font-bold text-emerald-800">Ready for Estimation</span>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Dataset Information Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Dataset #{dataset.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 uppercase">
                {dataset.interval_type}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Unit: {dataset.unit}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                diagnostics?.is_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {diagnostics?.status || 'Clean & Verified'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{dataset.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
              {dataset.description || 'Preloaded electricity load profile for academic analysis.'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold border border-blue-200 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>

            <a
              href={`${API_BASE}/datasets/${dataset.id}/export-csv`}
              download
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>

            <button
              onClick={() => setShowNewDatasetModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>New Dataset</span>
            </button>
          </div>
        </div>

        {/* Metric Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Total Records
            </span>
            <div className="text-lg font-bold text-slate-900 mt-1">{records.length} pts</div>
            <span className="text-[11px] text-slate-400">
              Domain: {records.length ? `${records[0].time_index} to ${records[records.length - 1].time_index}h` : '0 to 0'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-rose-500" />
              Peak Demand
            </span>
            <div className="text-lg font-bold text-rose-600 mt-1">
              {maxVal.toFixed(2)} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </div>
            <span className="text-[11px] text-slate-400">Max observed load</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-cyan-500" />
              Base Demand
            </span>
            <div className="text-lg font-bold text-slate-800 mt-1">
              {minVal.toFixed(2)} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </div>
            <span className="text-[11px] text-slate-400">Standby / baseline</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-emerald-500" />
              Average Load
            </span>
            <div className="text-lg font-bold text-emerald-700 mt-1">
              {avgVal.toFixed(2)} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </div>
            <span className="text-[11px] text-slate-400">Mean consumption</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              Selected Nodes
            </span>
            <div className="text-lg font-bold text-blue-600 mt-1">
              {selectedNodes.length} <span className="text-xs font-normal text-slate-500">of {records.length}</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Polynomial degree: {Math.max(0, selectedNodes.length - 1)}
            </span>
          </div>
        </div>
      </div>

      {/* Diagnostics, Cleaning & Support Node Selector Studio */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Data Validation, Cleaning & Support Node Selector
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify coordinate uniqueness, chronological sorting, and select Chebyshev or uniform support points for Lagrange polynomial modeling.
            </p>
          </div>

          {/* Cleaning & Sorting Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCleanDataset}
              disabled={isCleaning}
              className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isCleaning ? 'Cleaning...' : 'Clean & Auto-Fix Dataset'}</span>
            </button>

            <button
              onClick={handleSortDataset}
              disabled={isSorting}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{isSorting ? 'Sorting...' : 'Sort Chronologically'}</span>
            </button>
          </div>
        </div>

        {/* Quality Diagnostics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-4">
          <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            {diagnostics && !diagnostics.has_duplicates ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-slate-800">Coordinate Uniqueness</div>
              <div className="text-[11px] text-slate-500">
                {diagnostics?.has_duplicates ? 'Duplicates Detected' : 'All x Coordinates Unique'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            {diagnostics?.is_sorted ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-slate-800">Chronological Monotonicity</div>
              <div className="text-[11px] text-slate-500">
                {diagnostics?.is_sorted ? 'Strictly Ascending' : 'Requires Sorting'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            {diagnostics && !diagnostics.has_negatives ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-cyan-600 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-slate-800">Load Non-Negativity</div>
              <div className="text-[11px] text-slate-500">
                {diagnostics?.has_negatives ? 'Contains negative draw (solar export)' : 'Physical gross demand'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            {selectedNodes.length >= 2 ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-slate-800">Lagrange Readiness</div>
              <div className="text-[11px] text-slate-500">
                {selectedNodes.length >= 2 ? `${selectedNodes.length} nodes active` : 'Select at least 2 nodes'}
              </div>
            </div>
          </div>
        </div>

        {/* Support Node Presets Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-blue-900 mr-1">Node Selection Presets:</span>
            <button
              onClick={() => handleSelectUniform(5)}
              className="px-2.5 py-1 text-xs font-semibold bg-white text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-2xs"
            >
              5 Uniform Nodes
            </button>
            <button
              onClick={() => handleSelectUniform(7)}
              className="px-2.5 py-1 text-xs font-semibold bg-white text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-2xs"
            >
              7 Uniform Nodes
            </button>
            <button
              onClick={() => handleSelectChebyshev(6)}
              className="px-2.5 py-1 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors flex items-center space-x-1 shadow-xs"
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>6 Chebyshev Nodes</span>
            </button>
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1 text-xs font-semibold bg-white text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
            >
              Clear
            </button>
          </div>

          <button
            onClick={onGoToEstimation}
            disabled={selectedNodes.length < 2}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold text-xs transition-colors flex items-center space-x-1 shadow-xs shrink-0"
          >
            <span>Proceed to Module 2 Estimation</span>
            <span>&rarr;</span>
          </button>
        </div>

        {/* Interactive Data Table */}
        <div className="mt-5 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 w-12 text-center">Node</th>
                <th className="p-3">Time Coordinate (x)</th>
                <th className="p-3">Time Label</th>
                <th className="p-3">Consumption ({unit})</th>
                <th className="p-3">Ambient Temp</th>
                <th className="p-3">Operational Notes</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.map((r) => {
                const isSelected = selectedNodes.includes(r.id);
                const isEditing = editingRecordId === r.id;

                return (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/40 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleNode(r.id)}
                        className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                      />
                    </td>

                    {isEditing ? (
                      <>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            value={editValues.time_index}
                            onChange={(e) =>
                              setEditValues({ ...editValues, time_index: parseFloat(e.target.value) || 0 })
                            }
                            className="w-20 px-2 py-1 bg-white border border-blue-400 rounded-md text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editValues.timestamp_str}
                            onChange={(e) =>
                              setEditValues({ ...editValues, timestamp_str: e.target.value })
                            }
                            className="w-24 px-2 py-1 bg-white border border-blue-400 rounded-md text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.consumption_value}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                consumption_value: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 px-2 py-1 bg-white border border-blue-400 rounded-md text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="°C"
                            value={editValues.temperature}
                            onChange={(e) =>
                              setEditValues({ ...editValues, temperature: e.target.value })
                            }
                            className="w-20 px-2 py-1 bg-white border border-blue-400 rounded-md text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editValues.notes}
                            onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                            className="w-full px-2 py-1 bg-white border border-blue-400 rounded-md text-xs"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => saveEdit(r.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingRecordId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded-md"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-mono font-medium text-slate-800">
                          {r.time_index.toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-600">
                          {r.timestamp_str || `T+${r.time_index}`}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {r.consumption_value.toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-500">
                          {r.temperature !== null && r.temperature !== undefined
                            ? `${r.temperature.toFixed(1)} °C`
                            : '—'}
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">
                          {r.notes || '—'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => startEditing(r)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Upload CSV */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Import Electricity Data (CSV)
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Upload a CSV containing time coordinates and electricity consumption values.
                Accepted column names: <span className="font-mono">time/hour/x</span> and{' '}
                <span className="font-mono">consumption/kwh/kw/load/y</span>.
              </p>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50">
                <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <input
                  type="file"
                  accept=".csv,.txt"
                  id="csv-file-input"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer text-xs font-semibold text-blue-600 hover:underline"
                >
                  {uploadFile ? uploadFile.name : 'Select or drop a CSV file here'}
                </label>
                <div className="text-[11px] text-slate-400 mt-1">UTF-8 comma-separated file</div>
              </div>

              {uploadStatus && (
                <div
                  className={`p-2.5 rounded-lg text-xs ${
                    uploadStatus.startsWith('Error')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {uploadStatus}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploadLoading}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:opacity-50"
                >
                  {uploadLoading ? 'Importing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Record */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Add Consumption Record
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRecordSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Time Index (x) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 14.5"
                    value={newTimeIndex}
                    onChange={(e) => setNewTimeIndex(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Time Label</label>
                  <input
                    type="text"
                    placeholder="e.g. 14:30"
                    value={newTimestampStr}
                    onChange={(e) => setNewTimestampStr(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Consumption ({unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 2.45"
                    value={newConsumption}
                    onChange={(e) => setNewConsumption(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Ambient Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 26.5"
                    value={newTemperature}
                    onChange={(e) => setNewTemperature(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Notes / Operating Context</label>
                <input
                  type="text"
                  placeholder="e.g. Dishwasher run + AC cycle"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Dataset */}
      {showNewDatasetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                Create New Electricity Dataset
              </h3>
              <button
                onClick={() => setShowNewDatasetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDatasetSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Dataset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EV Fleet Charging Hub"
                  value={newDsName}
                  onChange={(e) => setNewDsName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe building type, load characteristic, or region..."
                  value={newDsDesc}
                  onChange={(e) => setNewDsDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Unit</label>
                  <select
                    value={newDsUnit}
                    onChange={(e) => setNewDsUnit(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="kWh">kWh (Energy)</option>
                    <option value="kW">kW (Power Demand)</option>
                    <option value="MWh">MWh (Industrial)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Interval</label>
                  <select
                    value={newDsInterval}
                    onChange={(e) => setNewDsInterval(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="15-min">15-minute</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewDatasetModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl"
                >
                  Create Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
