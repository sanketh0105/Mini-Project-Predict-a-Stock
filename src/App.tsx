import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Sidebar } from './components/Sidebar';
import { StatusTable } from './components/StatusTable';
import { BurnDownChart } from './components/BurnDownChart';
import { CoPilotModal } from './components/CoPilotModal';
import { CsvPreviewModal } from './components/CsvPreviewModal';
import { InventoryChat } from './components/InventoryChat';
import { SKUExplorer, ConfigView, TroubleshootingView } from './components/Views';
import { InventoryResult, SalesRow, BurnDownData } from './types';
import { Upload, FileSpreadsheet, Package, AlertCircle, TrendingUp, Info, Sparkles, Globe, Search, Cpu, Download, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSupplierEmail, analyzeDisruptionRisk, RiskAnalysis } from './services/geminiService';
import { validateInventoryCsv, CsvValidationResult } from './utils/csvValidator';

const SAMPLE_CSV_DATA = `Date,Product_ID,Units_Sold,Current_Stock
2026-10-01,SKU-ALPHA-101,42,480
2026-10-02,SKU-ALPHA-101,38,480
2026-10-03,SKU-ALPHA-101,45,480
2026-10-01,SKU-BRAVO-204,85,390
2026-10-02,SKU-BRAVO-204,92,390
2026-10-03,SKU-BRAVO-204,88,390
2026-10-01,SKU-CHARLIE-309,18,620
2026-10-02,SKU-CHARLIE-309,22,620
2026-10-03,SKU-CHARLIE-309,20,620
2026-10-01,SKU-DELTA-412,64,210
2026-10-02,SKU-DELTA-412,70,210
2026-10-03,SKU-DELTA-412,67,210`;

export default function App() {
  const [data, setData] = useState<InventoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [delay, setDelay] = useState(0);
  const [rawSales, setRawSales] = useState<SalesRow[]>([]);
  const [uploadError, setUploadError] = useState<{ message: string; details?: string[] } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingCsv, setPendingCsv] = useState<{
    fileName: string;
    headers: string[];
    rows: SalesRow[];
    validation: CsvValidationResult;
  } | null>(null);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // AI Feature States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  
  // Risk Monitor States
  const [newsHeadline, setNewsHeadline] = useState('');
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<'dashboard' | 'sku' | 'config' | 'troubleshoot'>('dashboard');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Simulation Logic
  const processedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
      const baseLeadTime = 5;
      const effectiveLeadTime = baseLeadTime + delay;
      const safetyStock = (item.avgDailyDemand * effectiveLeadTime) * 0.20;
      const reorderPoint = (item.avgDailyDemand * effectiveLeadTime) + safetyStock;
      
      return {
        ...item,
        leadTime: effectiveLeadTime,
        safetyStock,
        reorderPoint
      };
    });
  }, [data, delay]);

  const atRiskCount = processedData.filter(i => i.currentStock < i.reorderPoint).length;

  const handleResolveAI = async (item: InventoryResult) => {
    setSelectedSKU(item.sku);
    setIsGeneratingEmail(true);
    setIsModalOpen(true);
    
    try {
      const daysUntilStockout = item.avgDailyDemand > 0 ? item.currentStock / item.avgDailyDemand : 999;
      const email = await generateSupplierEmail({
        sku: item.sku,
        daysUntilStockout,
        avgDailyDemand: item.avgDailyDemand
      });
      setGeneratedEmail(email);
    } catch (err: any) {
      console.error(err);
      setGeneratedEmail(`Failed to generate draft: ${err?.message || "Please try again."}`);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleRiskAnalysis = async (customHeadline?: string) => {
    const textToAnalyze = typeof customHeadline === 'string' ? customHeadline : newsHeadline;
    if (!textToAnalyze.trim()) return;
    if (typeof customHeadline === 'string') {
      setNewsHeadline(customHeadline);
    }
    setIsAnalyzingRisk(true);
    setRiskError(null);
    try {
      const analysis = await analyzeDisruptionRisk(textToAnalyze);
      setRiskAnalysis(analysis);
      if (analysis.isDisruption) {
        setDelay(prev => Math.min(30, prev + analysis.estimatedDelayDays));
      }
    } catch (err: any) {
      console.error("Risk analysis error:", err);
      setRiskError(err?.message || "Failed to analyze risk. Please try again.");
    } finally {
      setIsAnalyzingRisk(false);
    }
  };

  const burnDownData = useMemo(() => {
    if (processedData.length === 0) return [];
    const target = processedData[0];
    const dataPoints: BurnDownData[] = [];
    
    for (let i = 0; i < 30; i++) {
      dataPoints.push({
        day: i,
        stock: Math.max(0, target.currentStock - (target.avgDailyDemand * i)),
        safetyStock: target.safetyStock
      });
    }
    return dataPoints;
  }, [processedData]);

  const submitParsedRows = async (rows: SalesRow[], fields?: string[]) => {
    const validation = validateInventoryCsv(
      rows as unknown as Record<string, unknown>[],
      fields
    );
    if (!validation.valid) {
      setUploadError({
        message: validation.error || "Invalid CSV format.",
        details: validation.details,
      });
      setLoading(false);
      return;
    }

    setRawSales(rows);
    try {
      const response = await fetch('/api/process-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: rows, leadTime: 5, serviceLevel: 0.95 })
      });
      const json = await response.json();
      if (!response.ok || !Array.isArray(json)) {
        setUploadError({
          message: json?.error || `Server failed to process CSV (HTTP ${response.status}).`,
        });
        return;
      }
      if (json.length === 0) {
        setUploadError({ message: "No valid SKU records could be extracted from the CSV." });
        return;
      }
      setUploadError(null);
      setData(json);
    } catch (err: any) {
      console.error("CSV processing error:", err);
      setUploadError({
        message: err?.message || "Network error while processing CSV data. Please ensure the server is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processCsvFile = (file: File) => {
    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.csv') && file.type && !['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.type)) {
      setUploadError({
        message: `Unsupported file "${file.name}". Please upload a valid .csv file (comma, semicolon, or tab-separated text CSV — not .xlsx or binary Excel).`,
      });
      return;
    }

    setLoading(true);
    setUploadError(null);
    Papa.parse<SalesRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      complete: (results) => {
        setLoading(false);
        if (results.errors && results.errors.length > 0 && (!results.data || results.data.length === 0)) {
          setUploadError({ message: `CSV parse error: ${results.errors[0].message}` });
          return;
        }
        const rows = results.data || [];
        const headers =
          results.meta?.fields && results.meta.fields.length > 0
            ? results.meta.fields
            : rows[0]
              ? Object.keys(rows[0])
              : [];
        const validation = validateInventoryCsv(
          rows as unknown as Record<string, unknown>[],
          headers
        );
        setPendingCsv({
          fileName: file.name,
          headers,
          rows,
          validation,
        });
      },
      error: (err) => {
        console.error("PapaParse error:", err);
        setUploadError({
          message: `Could not read CSV file: ${err?.message || "Unknown file read error."}`,
        });
        setLoading(false);
      }
    });
  };

  const handleConfirmPreviewUpload = async () => {
    if (!pendingCsv) return;
    const { rows, headers } = pendingCsv;
    setLoading(true);
    await submitParsedRows(rows, headers);
    setPendingCsv(null);
  };

  const handleCancelPreviewUpload = () => {
    if (loading) return;
    setPendingCsv(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so re-uploading the same file triggers onChange
    e.target.value = '';
    if (!file) return;
    processCsvFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processCsvFile(file);
    }
  };

  const handleLoadSampleDataset = () => {
    setLoading(true);
    setUploadError(null);
    Papa.parse<SalesRow>(SAMPLE_CSV_DATA, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      complete: async (results) => {
        await submitParsedRows(results.data, results.meta?.fields);
      }
    });
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_DATA], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'predict_a_stock_sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg text-app-text font-sans selection:bg-brand/30">
      <Sidebar 
        delay={delay} 
        setDelay={setDelay} 
        atRiskCount={atRiskCount} 
        activeView={activeView}
        setActiveView={setActiveView}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
      
      <main className="flex-1 min-w-0 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent)] transition-colors duration-300">
        <header className="h-20 border-b border-app-border bg-app-bg/60 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System Online</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-[10px] font-black text-app-muted bg-app-card px-4 py-2 rounded-xl border border-app-border flex items-center gap-3 uppercase tracking-widest shadow-sm">
              <Cpu size={14} className="text-brand" />
              Engine: <span className="text-app-text">v1.2-AI</span>
            </div>
            {data.length > 0 && (
              <label className="cursor-pointer bg-brand hover:bg-brand/90 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-brand/20 uppercase tracking-widest">
                <Upload size={16} />
                <span>{loading ? "Syncing..." : "Sync Data"}</span>
                <input type="file" accept=".csv,text/csv,application/csv,application/vnd.ms-excel" className="hidden" onChange={handleFileUpload} disabled={loading} />
              </label>
            )}
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto space-y-10">
          {uploadError && (
            <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/10 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div className="space-y-2">
                  <p className="text-xs font-black text-red-500 uppercase tracking-widest">CSV Import Failed</p>
                  <p className="text-xs text-app-text font-semibold leading-relaxed">{uploadError.message}</p>
                  {uploadError.details && uploadError.details.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-xs text-app-muted">
                      {uploadError.details.map((detail, idx) => (
                        <li key={idx} className="leading-relaxed">{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-[10px] font-black uppercase tracking-widest text-app-muted hover:text-app-text px-2 py-1 shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeView === 'dashboard' ? (
              <div key="dashboard-group" className="space-y-10">
                {/* Risk Analysis Monitor */}
                <section className="bg-app-card rounded-3xl p-8 border border-app-border shadow-xl shadow-app-text/5 relative overflow-hidden group transition-all duration-300">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand/5 rounded-full blur-3xl group-hover:bg-brand/10 transition-all duration-1000"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-12 h-12 vibrant-gradient rounded-xl flex items-center justify-center shadow-2xl shadow-brand/40">
                        <Globe size={24} className="text-white animate-spin-slow" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-app-text tracking-tight">Agentic Risk Monitor</h3>
                        <p className="text-xs text-app-muted font-bold uppercase tracking-widest mt-1 italic">Real-time supply chain disruption analysis</p>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                         <div className="flex -space-x-2">
                           {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-app-card bg-app-border"></div>)}
                         </div>
                         <span className="text-[10px] font-black text-app-muted uppercase tracking-widest">Scanning Global nodes</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                      <div className="space-y-4">
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Paste news headline or shipping alert..."
                            value={newsHeadline}
                            onChange={(e) => setNewsHeadline(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRiskAnalysis()}
                            className="w-full bg-app-bg border border-app-border rounded-2xl pl-6 pr-32 py-5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all shadow-inner text-app-text"
                          />
                          <button 
                            onClick={() => handleRiskAnalysis()}
                            disabled={isAnalyzingRisk || !newsHeadline}
                            className="absolute right-2 top-2 bottom-2 bg-brand hover:bg-brand/90 disabled:bg-app-border text-white px-6 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-widest shadow-xl shadow-brand/20 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {isAnalyzingRisk ? "Cognitizing..." : "Analyze"}
                          </button>
                        </div>

                        {/* Presets */}
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-app-muted uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles size={12} className="text-brand" />
                            <span>Quick Simulation Scenarios</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: '🚢 Suez Canal Strike (+12d)', text: 'Port worker strike at Suez Canal transit hub halts container traffic, leading to 12-day shipping backlog' },
                              { label: '⚓ Panama Canal Low Draft (+7d)', text: 'Severe drought restricts daily vessel passages through Panama Canal, causing a 7-day queue' },
                              { label: '✅ Normal Terminal Operations (+0d)', text: 'Terminal operations and customs clearance proceeding ahead of schedule with zero transit delays' }
                            ].map((preset, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleRiskAnalysis(preset.text)}
                                disabled={isAnalyzingRisk}
                                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-app-card hover:bg-brand/10 border border-app-border hover:border-brand/40 text-app-muted hover:text-brand transition-all text-left cursor-pointer disabled:opacity-50"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-vibrant-teal shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>
                            <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest">Suez Canal</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-vibrant-purple shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                            <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest">Panama Node</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-vibrant-pink shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
                            <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest">APAC Routes</span>
                          </div>
                        </div>
                      </div>
                      
                      <AnimatePresence mode="wait">
                        {riskError ? (
                          <motion.div
                            key="risk-error"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-6 rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl"
                          >
                            <div className="flex items-center gap-2 mb-2 text-red-500">
                              <AlertCircle size={20} />
                              <span className="text-xs font-black uppercase tracking-widest">Analysis Error</span>
                            </div>
                            <p className="text-xs text-app-text font-medium leading-relaxed mb-4">
                              {riskError}
                            </p>
                            <button
                              onClick={() => handleRiskAnalysis()}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-md uppercase tracking-wider"
                            >
                              Retry Analysis
                            </button>
                          </motion.div>
                        ) : riskAnalysis ? (
                          <motion.div 
                            key="risk-result"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`p-6 rounded-2xl border backdrop-blur-xl ${
                              riskAnalysis.isDisruption ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                 <AlertCircle size={20} className={riskAnalysis.isDisruption ? 'text-red-500' : 'text-emerald-500'} />
                                 <span className={`text-[10px] font-black uppercase tracking-widest ${riskAnalysis.isDisruption ? 'text-red-500' : 'text-emerald-500'}`}>
                                   AI Analysis Verdict
                                 </span>
                              </div>
                              {riskAnalysis.isDisruption && (
                                <span className="px-3 py-1 bg-red-500 text-white text-[8px] font-black rounded uppercase tracking-tighter ring-4 ring-red-500/10">
                                  Delay Injected
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-app-text mb-4 leading-relaxed font-medium">
                              {riskAnalysis.reasoning}
                            </p>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-app-muted uppercase tracking-widest">Impact Magnitude</span>
                                <span className={`text-xl font-black ${riskAnalysis.isDisruption ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {riskAnalysis.isDisruption ? `+${riskAnalysis.estimatedDelayDays} Days` : 'Zero Impact'}
                                </span>
                              </div>
                              <div className="ml-auto">
                                 <Sparkles size={20} className="text-brand opacity-40" />
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-app-border rounded-2xl bg-app-bg/50">
                             <Search size={40} className="text-app-muted opacity-20 mb-3" />
                             <p className="text-[10px] font-black text-app-muted uppercase tracking-widest">Awaiting News Feed</p>
                             <p className="text-[11px] text-app-muted mt-1 text-center">Type a headline above or click one of the quick simulation scenarios</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </section>

                <AnimatePresence mode="wait">
                  {data.length === 0 ? (
                    <motion.div 
                      key="empty-dashboard"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`min-h-[46vh] flex flex-col items-center justify-center text-center max-w-2xl mx-auto p-10 rounded-3xl border-2 border-dashed transition-all ${
                        isDragging
                          ? 'border-brand bg-brand/10 scale-[1.01]'
                          : 'border-app-border bg-app-card/40'
                      }`}
                    >
                      <div className="w-24 h-24 vibrant-gradient rounded-[2rem] flex items-center justify-center mb-8 rotate-6 shadow-2xl shadow-brand/40 group">
                        <FileSpreadsheet className="text-white group-hover:scale-110 transition-transform" size={44} />
                      </div>
                      <h2 className="text-3xl font-black tracking-tight mb-3 text-app-text uppercase italic">Supply Chain Genesis</h2>
                      <p className="text-app-muted mb-8 leading-relaxed text-sm font-medium max-w-lg">
                        Drag and drop or upload your SME historical sales CSV (<code className="text-brand font-semibold">Date, Product_ID, Units_Sold</code> — also accepts <code className="text-brand font-semibold">SKU</code>, <code className="text-brand font-semibold">Quantity</code>, and optional <code className="text-brand font-semibold">Current_Stock</code>).
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-4">
                        <label className="group relative cursor-pointer bg-brand px-8 py-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand/30 border border-white/10">
                          <div className="flex items-center gap-3">
                            <Upload size={18} />
                            <span>{loading ? "Initializing..." : "Upload CSV Manifest"}</span>
                          </div>
                          <input
                            type="file"
                            accept=".csv,text/csv,application/csv,application/vnd.ms-excel"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={loading}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleLoadSampleDataset}
                          disabled={loading}
                          className="cursor-pointer bg-app-card hover:bg-brand/10 border border-app-border hover:border-brand/40 px-6 py-4 rounded-2xl text-app-text font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2.5 shadow-sm disabled:opacity-50"
                        >
                          <Play size={16} className="text-brand" />
                          <span>Load Sample Dataset</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadSampleCsv}
                          className="cursor-pointer bg-app-subtle-bg hover:bg-app-card border border-app-border px-5 py-4 rounded-2xl text-app-muted hover:text-app-text font-bold uppercase text-xs tracking-widest transition-all flex items-center gap-2"
                        >
                          <Download size={16} />
                          <span>Sample .CSV</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="dashboard-active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-10"
                    >
                      {/* Stats */}
                      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                          { label: 'Active SKUs', value: processedData.length, icon: Package, color: 'text-brand', bg: 'bg-brand/10' },
                          { label: 'High Alert', value: atRiskCount, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
                          { label: 'System Confidence', value: '95%', icon: TrendingUp, color: 'text-vibrant-teal', bg: 'bg-vibrant-teal/10' },
                        ].map((stat, i) => (
                          <div key={i} className="bg-app-card p-8 rounded-[2rem] border border-app-border shadow-xl shadow-app-text/5 flex items-center justify-between group hover:border-brand/30 transition-all">
                            <div>
                              <span className="text-[10px] font-black text-app-muted uppercase tracking-widest block mb-1">{stat.label}</span>
                              <div className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</div>
                            </div>
                            <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                              <stat.icon className={stat.color} size={28} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="lg:col-span-2">
                        <BurnDownChart 
                          data={burnDownData} 
                          safetyLevel={processedData[0]?.safetyStock || 0} 
                        />
                      </div>

                      <div className="bg-app-card border border-app-border p-8 rounded-3xl shadow-xl shadow-app-text/5 flex flex-col justify-between relative overflow-hidden transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-45 text-app-text">
                          <Sparkles size={200} />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                             <Cpu size={20} className="text-brand" />
                             <h3 className="text-xl font-black text-app-text uppercase tracking-tight">AI Strategy</h3>
                          </div>
                          <p className="text-app-muted text-sm mb-10 leading-relaxed font-medium">
                            Simulated Latency: <span className="text-app-text font-bold">{5 + delay} d</span>. 
                            Predictive safety buffers have been recalculated to ensure <span className="text-vibrant-teal font-bold text-brand">95% continuity</span>.
                          </p>
                          
                          <div className="space-y-8">
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-app-muted uppercase tracking-widest">Resilience Load</span>
                                <span className="text-xs font-black text-vibrant-purple uppercase tracking-widest">Heavy Buffer</span>
                              </div>
                              <div className="w-full bg-app-bg rounded-full h-3 border border-app-border overflow-hidden">
                                <div className="vibrant-gradient h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)]" style={{ width: '65%' }}></div>
                              </div>
                            </div>
                            <div className="p-4 bg-app-subtle-bg border border-app-border rounded-xl">
                               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-1">
                                  <span className="text-app-muted">Optimal SS Unit</span>
                                  <span className="text-brand">Recalculated</span>
                               </div>
                               <div className="text-2xl font-black text-app-text">
                                 {processedData[0]?.safetyStock.toFixed(0)} <span className="text-xs font-bold text-app-muted">Units</span>
                               </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-8 mt-10 border-t border-app-border">
                          <button className="w-full py-5 bg-app-bg border border-app-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-app-muted hover:text-app-text hover:border-brand transition-all flex items-center justify-center gap-3">
                            <Sparkles size={16} className="text-brand" />
                            Generate Resilience Audit
                          </button>
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <StatusTable 
                          data={processedData} 
                          onResolve={handleResolveAI}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : activeView === 'sku' ? (
              <SKUExplorer key="sku-explorer" data={processedData} />
            ) : activeView === 'config' ? (
              <ConfigView key="config-view" />
            ) : (
              <TroubleshootingView key="troubleshooting-view" />
            )}
          </AnimatePresence>
        </div>
      </main>

      <InventoryChat inventoryData={processedData} />

      <CoPilotModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sku={selectedSKU}
        emailContent={isGeneratingEmail ? "Syncing with Gemini for strategic draft..." : generatedEmail}
      />

      <CsvPreviewModal
        isOpen={Boolean(pendingCsv)}
        fileName={pendingCsv?.fileName || ''}
        headers={pendingCsv?.headers || []}
        rows={(pendingCsv?.rows as unknown as Record<string, unknown>[]) || []}
        validation={pendingCsv?.validation || null}
        isProcessing={loading}
        onConfirm={handleConfirmPreviewUpload}
        onCancel={handleCancelPreviewUpload}
      />
    </div>
  );
}
