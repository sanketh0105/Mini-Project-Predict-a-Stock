import React from 'react';
import { Shield, Truck, AlertCircle, TrendingDown, LayoutDashboard, Database, Settings, Sun, Moon, Info } from 'lucide-react';

interface SidebarProps {
  delay: number;
  setDelay: (d: number) => void;
  atRiskCount: number;
  activeView: 'dashboard' | 'sku' | 'config' | 'troubleshoot';
  setActiveView: (view: 'dashboard' | 'sku' | 'config' | 'troubleshoot') => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  delay, 
  setDelay, 
  atRiskCount, 
  activeView, 
  setActiveView,
  isDarkMode,
  toggleTheme 
}) => {
  return (
    <aside className="w-72 lg:w-80 h-full bg-app-card border-r border-app-border text-app-text flex flex-col shrink-0 overflow-y-auto transition-all duration-300">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 vibrant-gradient rounded-xl flex items-center justify-center shadow-lg shadow-brand/20 shrink-0">
            <Shield className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-app-text leading-tight">Predict-A-Stock</h1>
            <p className="text-[10px] text-brand font-bold uppercase tracking-widest">Resilience Engine</p>
          </div>
        </div>

        <nav className="space-y-6">
          <section>
            <h4 className="text-[10px] font-bold text-app-muted uppercase tracking-widest mb-3">Core Controls</h4>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveView('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                  activeView === 'dashboard' 
                    ? 'bg-brand/10 text-brand border-brand/20' 
                    : 'text-app-muted hover:text-app-text hover:bg-app-subtle-bg border-transparent'
                }`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
              <button 
                onClick={() => setActiveView('sku')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                  activeView === 'sku' 
                    ? 'bg-brand/10 text-brand border-brand/20' 
                    : 'text-app-muted hover:text-app-text hover:bg-app-subtle-bg border-transparent'
                }`}
              >
                <Database size={18} />
                SKU Explorer
              </button>
              <button 
                onClick={() => setActiveView('config')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                  activeView === 'config' 
                    ? 'bg-brand/10 text-brand border-brand/20' 
                    : 'text-app-muted hover:text-app-text hover:bg-app-subtle-bg border-transparent'
                }`}
              >
                <Settings size={18} />
                Config
              </button>
              <button 
                onClick={() => setActiveView('troubleshoot')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                  activeView === 'troubleshoot' 
                    ? 'bg-brand/10 text-brand border-brand/20' 
                    : 'text-app-muted hover:text-app-text hover:bg-app-subtle-bg border-transparent'
                }`}
              >
                <Info size={18} />
                Troubleshoot
              </button>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-bold text-app-muted uppercase tracking-widest mb-3">Disruption Simulator</h4>
            <div className={`p-4 rounded-xl border transition-all duration-500 space-y-3 ${
              delay > 15 
                ? "bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]" 
                : "bg-app-subtle-bg border-app-border shadow-inner"
            }`}>
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-app-text">Global Delay</label>
                  {delay > 15 && (
                    <span className="text-[10px] font-bold text-red-500 animate-pulse tracking-wider">CRITICAL OVERLOAD</span>
                  )}
                </div>
                <span className={`text-2xl font-black transition-colors ${
                  delay > 15 ? "text-red-500" : "text-brand"
                }`}>+{delay} d</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="30" 
                value={delay}
                onChange={(e) => setDelay(parseInt(e.target.value))}
                className={`w-full h-1.5 rounded-lg cursor-pointer transition-all ${
                  delay > 15 ? "accent-red-500 bg-red-900/20" : "accent-brand bg-app-border"
                }`}
              />
              <div className="flex justify-between text-[10px] font-bold">
                <span className={delay === 0 ? "text-emerald-500" : "text-app-muted"}>STABLE</span>
                <span className={delay > 15 ? "text-red-500" : "text-app-muted"}>SHOCK (30d)</span>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-bold text-app-muted uppercase tracking-widest mb-3">Risk Summary</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-red-500" size={18} />
                  <span className="text-sm font-semibold text-red-600 dark:text-red-100">At-Risk SKUs</span>
                </div>
                <span className="text-xl font-black text-red-500">{atRiskCount}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-app-subtle-bg border border-app-border rounded-xl">
                <div className="flex items-center gap-3">
                  <Truck className="text-app-muted" size={18} />
                  <span className="text-sm font-semibold text-app-text">Effective LT</span>
                </div>
                <span className="text-xl font-black text-app-text">{5 + delay} d</span>
              </div>
            </div>
          </section>
        </nav>

        <div className="mt-auto pt-6 border-t border-app-border space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 bg-app-subtle-bg border border-app-border rounded-2xl hover:border-brand transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon size={18} className="text-brand" /> : <Sun size={18} className="text-vibrant-amber" />}
              <span className="text-xs font-bold text-app-text uppercase tracking-widest">{isDarkMode ? 'Night Mode' : 'Light Mode'}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative p-1 transition-colors ${isDarkMode ? 'bg-brand' : 'bg-app-border'}`}>
              <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </button>

          <div className="p-3.5 bg-brand/5 border border-brand/20 rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12">
              <TrendingDown size={36} className="text-brand" />
            </div>
            <p className="text-xs text-brand/80 leading-relaxed font-medium relative z-10">
              Current buffers are optimized for <strong>low volatility</strong>. Increase safety stocks if delay persists.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
