import React, { useState, useEffect } from 'react';
import { Navbar, type ActiveTab } from './components/Navbar';
import { MainDashboard } from './components/MainDashboard';
import { Module1DataPrep } from './components/Module1DataPrep';
import { Module2Estimation } from './components/Module2Estimation';
import { InteractiveChartsView } from './components/InteractiveChartsView';
import { ValidationStudio } from './components/ValidationStudio';
import { CapstoneDemoView } from './components/CapstoneDemoView';
import { HistoryView } from './components/HistoryView';
import { CapstoneReportView } from './components/CapstoneReportView';
import { TheoryView } from './components/TheoryView';
import type {
  DatasetSummary,
  DatasetDetail,
  SingleEstimateResponse,
  CurveEstimateResponse,
  DataDiagnostics,
} from './types';
import {
  fetchHealth,
  fetchDatasets,
  fetchDatasetDetail,
  fetchDatasetDiagnostics,
  estimateSingle,
  estimateCurve,
} from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [datasetDetail, setDatasetDetail] = useState<DatasetDetail | null>(null);
  const [diagnostics, setDiagnostics] = useState<DataDiagnostics | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [targetX, setTargetX] = useState<number>(12.5);
  const [singleResult, setSingleResult] = useState<SingleEstimateResponse | null>(null);
  const [curveResult, setCurveResult] = useState<CurveEstimateResponse | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(false);

  // Health check ping
  useEffect(() => {
    const checkApi = async () => {
      try {
        await fetchHealth();
        setIsBackendHealthy(true);
      } catch {
        setIsBackendHealthy(false);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial datasets
  const loadDatasets = async () => {
    try {
      const list = await fetchDatasets();
      setDatasets(list);
      if (list.length > 0 && selectedDatasetId === null) {
        setSelectedDatasetId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  // Whenever selectedDatasetId changes, load details & diagnostics
  useEffect(() => {
    if (selectedDatasetId !== null) {
      loadActiveDataset(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const loadActiveDataset = async (id: number) => {
    try {
      const detail = await fetchDatasetDetail(id);
      setDatasetDetail(detail);

      // Load diagnostics
      const diag = await fetchDatasetDiagnostics(id).catch(() => null);
      setDiagnostics(diag);

      // Default node selection: pick 6 well-conditioned nodes or all if <= 7
      const records = detail.records || [];
      if (records.length <= 7) {
        setSelectedNodes(records.map((r) => r.id));
      } else {
        const step = (records.length - 1) / 5;
        const defaultChosen: number[] = [];
        for (let i = 0; i < 6; i++) {
          const idx = Math.min(records.length - 1, Math.round(i * step));
          defaultChosen.push(records[idx].id);
        }
        setSelectedNodes(Array.from(new Set(defaultChosen)));
      }

      // Default targetX to mid-range
      if (records.length > 0) {
        const midTime = records[Math.floor(records.length / 2)].time_index + 0.5;
        setTargetX(midTime);

        // Run initial default estimation
        const chosenRecords = records.filter((_, idx) => idx % Math.max(1, Math.floor(records.length / 6)) === 0);
        const pts = (chosenRecords.length >= 2 ? chosenRecords : records).map((r) => ({
          x: r.time_index,
          y: r.consumption_value,
        }));

        if (pts.length >= 2) {
          const single = await estimateSingle({
            target_x: midTime,
            points: pts,
            dataset_id: detail.id,
            dataset_name: detail.name,
            save_to_history: false,
          }).catch(() => null);
          setSingleResult(single);

          const curve = await estimateCurve({
            points: pts,
            num_eval_points: 120,
            x_min: records[0].time_index,
            x_max: records[records.length - 1].time_index,
          }).catch(() => null);
          setCurveResult(curve);
        }
      }
    } catch (err) {
      console.error('Failed to load dataset detail:', err);
    }
  };

  const handleRefreshData = () => {
    loadDatasets();
    if (selectedDatasetId !== null) {
      loadActiveDataset(selectedDatasetId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        setSelectedDatasetId={setSelectedDatasetId}
        isBackendHealthy={isBackendHealthy}
        onRefreshDatasets={handleRefreshData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <MainDashboard
            dataset={datasetDetail}
            selectedNodes={selectedNodes}
            diagnostics={diagnostics}
            singleResult={singleResult}
            curveResult={curveResult}
            targetX={targetX}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'data-prep' && (
          <Module1DataPrep
            dataset={datasetDetail}
            selectedNodes={selectedNodes}
            setSelectedNodes={setSelectedNodes}
            diagnostics={diagnostics}
            onRefreshData={handleRefreshData}
            onGoToEstimation={() => setActiveTab('estimation')}
          />
        )}

        {activeTab === 'estimation' && (
          <Module2Estimation
            dataset={datasetDetail}
            selectedNodes={selectedNodes}
            setSelectedNodes={setSelectedNodes}
            singleResult={singleResult}
            setSingleResult={setSingleResult}
            curveResult={curveResult}
            setCurveResult={setCurveResult}
            targetX={targetX}
            setTargetX={setTargetX}
            onRefreshHistory={() => {}}
          />
        )}

        {activeTab === 'visualizations' && (
          <InteractiveChartsView
            dataset={datasetDetail}
            selectedNodes={selectedNodes}
            curveResult={curveResult}
            singleResult={singleResult}
            targetX={targetX}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationStudio dataset={datasetDetail} />
        )}

        {activeTab === 'capstone-demo' && (
          <CapstoneDemoView
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            setSelectedDatasetId={setSelectedDatasetId}
            dataset={datasetDetail}
            selectedNodes={selectedNodes}
            setSelectedNodes={setSelectedNodes}
            diagnostics={diagnostics}
            onRefreshData={handleRefreshData}
            singleResult={singleResult}
            setSingleResult={setSingleResult}
            curveResult={curveResult}
            setCurveResult={setCurveResult}
            targetX={targetX}
            setTargetX={setTargetX}
          />
        )}

        {activeTab === 'history' && <HistoryView />}

        {activeTab === 'report' && (
          <CapstoneReportView dataset={datasetDetail} targetX={targetX} />
        )}

        {activeTab === 'theory' && <TheoryView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800">
              Electricity Consumption Estimation Platform
            </span>
            <span>•</span>
            <span className="text-blue-600 font-medium">Lagrange Polynomial Capstone Demonstration</span>
          </div>
          <div className="text-slate-400">
            FastAPI • NumPy • Pandas • SQLite3 • React 19 • TypeScript • Tailwind CSS • Recharts
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
