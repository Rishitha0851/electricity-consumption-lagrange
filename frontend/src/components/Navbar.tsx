import React from 'react';
import {
  Zap,
  LayoutDashboard,
  Database,
  Calculator,
  BarChart2,
  CheckCircle2,
  GraduationCap,
  History,
  FileText,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import type { DatasetSummary } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'data-prep'
  | 'estimation'
  | 'visualizations'
  | 'validation'
  | 'capstone-demo'
  | 'history'
  | 'report'
  | 'theory';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  datasets: DatasetSummary[];
  selectedDatasetId: number | null;
  setSelectedDatasetId: (id: number) => void;
  isBackendHealthy: boolean;
  onRefreshDatasets: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  datasets,
  selectedDatasetId,
  setSelectedDatasetId,
  isBackendHealthy,
  onRefreshDatasets,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Electricity Consumption Analytics
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Lagrange Interpolation
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Numerical Modeling, Instantaneous Ramp Rates & Capstone Verification
              </p>
            </div>
          </div>

          {/* Right Controls: Dataset Selector & Health */}
          <div className="flex items-center space-x-3">
            {/* Live API Health indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="hidden lg:inline">
                {isBackendHealthy ? 'FastAPI Online' : 'Backend Offline'}
              </span>
            </div>

            {/* Dataset Selector */}
            <div className="flex items-center space-x-1">
              <label htmlFor="dataset-select" className="text-xs font-semibold text-slate-600 hidden xl:inline">
                Dataset:
              </label>
              <select
                id="dataset-select"
                value={selectedDatasetId ?? ''}
                onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold max-w-[200px] truncate"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.record_count} pts - {d.unit})
                  </option>
                ))}
              </select>

              <button
                onClick={onRefreshDatasets}
                title="Refresh datasets"
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 border-t border-slate-100 py-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('data-prep')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'data-prep'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Module 1: Data Prep</span>
          </button>

          <button
            onClick={() => setActiveTab('estimation')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'estimation'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Module 2: Estimation</span>
          </button>

          <button
            onClick={() => setActiveTab('visualizations')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'visualizations'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>5 Visualizations</span>
          </button>

          <button
            onClick={() => setActiveTab('validation')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'validation'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validation Studio</span>
          </button>

          {/* Prominent Capstone Demo Tab */}
          <button
            onClick={() => setActiveTab('capstone-demo')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'capstone-demo'
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Capstone Demo (10 Steps)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'report'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Project Report</span>
          </button>

          <button
            onClick={() => setActiveTab('theory')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'theory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Math Theory</span>
          </button>
        </div>
      </div>
    </header>
  );
};
