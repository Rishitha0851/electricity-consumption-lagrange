import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Download,
  RefreshCw,
} from 'lucide-react';
import type { HistoryRecord } from '../types';
import { fetchHistory, deleteHistoryRecord, clearHistory } from '../api/client';

export const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchHistory();
      setHistory(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteHistoryRecord(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err: any) {
      alert('Failed to delete history item: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all estimation history logs?')) return;
    try {
      await clearHistory();
      setHistory([]);
    } catch (err: any) {
      alert('Failed to clear history: ' + err.message);
    }
  };

  const handleExportCsv = () => {
    if (!history.length) return;
    const headers = [
      'ID',
      'Dataset',
      'TargetX',
      'EstimatedY',
      'Degree',
      'Method',
      'SupportCount',
      'RampRate',
      'IntegralVal',
      'Timestamp',
      'Notes',
    ];
    const rows = history.map((h) => [
      h.id,
      `"${h.dataset_name || ''}"`,
      h.target_x,
      h.estimated_y,
      h.polynomial_degree,
      h.method,
      h.support_points_count,
      h.ramp_rate ?? '',
      h.integral_val ?? '',
      `"${h.created_at}"`,
      `"${(h.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `electricity_lagrange_estimation_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Audit Trail
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                SQLite Persistence
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Estimation Runs & Historical Log</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review past Lagrange calculations, compare estimated power loads, and export logs for reporting.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadHistory}
              title="Refresh history"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportCsv}
              disabled={!history.length}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold border border-slate-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleClearAll}
              disabled={!history.length}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold border border-rose-200 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* History Table */}
        <div className="mt-5 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3">Dataset Source</th>
                <th className="p-3">Target Time (x*)</th>
                <th className="p-3">Estimated Load P(x*)</th>
                <th className="p-3">Degree</th>
                <th className="p-3">Ramp Rate</th>
                <th className="p-3">Energy (Area)</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Notes</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    {loading ? 'Loading estimation history...' : 'No estimation history recorded yet. Compute and save runs from Module 2.'}
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{h.id}</td>
                    <td className="p-3 font-medium text-slate-800 max-w-[160px] truncate">
                      {h.dataset_name || 'Custom'}
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-700">{h.target_x.toFixed(2)}h</td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {h.estimated_y.toFixed(3)}
                    </td>
                    <td className="p-3 font-mono">n = {h.polynomial_degree}</td>
                    <td className="p-3 font-mono">
                      {h.ramp_rate !== null && h.ramp_rate !== undefined
                        ? `${h.ramp_rate >= 0 ? '+' : ''}${h.ramp_rate.toFixed(3)}`
                        : '—'}
                    </td>
                    <td className="p-3 font-mono">
                      {h.integral_val !== null && h.integral_val !== undefined
                        ? h.integral_val.toFixed(2)
                        : '—'}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(h.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3 text-slate-500 max-w-[180px] truncate">{h.notes || '—'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete run"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
