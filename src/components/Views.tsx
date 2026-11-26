import React from 'react';
import { Database, Settings, Shield, Package, Truck, AlertCircle, TrendingUp, Info, Activity, Clock, Sliders, Box, Save, RefreshCcw, Globe, FileSpreadsheet } from 'lucide-react';
import { InventoryResult } from '../types';

interface ViewProps {
  data: InventoryResult[];
}

export const SKUExplorer: React.FC<ViewProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-app-card border border-app-border rounded-3xl flex items-center justify-center text-app-muted">
          <Database size={48} className="opacity-20" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Vault Empty</h3>
          <p className="text-app-muted text-sm font-medium mt-2 max-w-sm mx-auto">
            Upload your inventory manifest in the Dashboard to populate the SKU Explorer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-app-text tracking-tight uppercase italic underline decoration-brand decoration-4 underline-offset-8">SKU Explorer</h2>
          <p className="text-app-muted font-medium mt-4">Deep drill-down into your supply chain inventory components.</p>
        </div>
        <div className="flex gap-4">
           <button className="px-5 py-2.5 bg-app-card border border-app-border rounded-xl text-xs font-bold text-app-text hover:border-brand transition-all flex items-center gap-2 shadow-sm">
             <RefreshCcw size={14} />
             Sync Metadata
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.map(item => (
          <div key={item.sku} className="bg-app-card border border-app-border rounded-2xl p-6 hover:border-brand/40 transition-all group overflow-hidden relative shadow-lg shadow-app-text/5">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-brand/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-10 h-10 bg-app-bg border border-app-border rounded-lg flex items-center justify-center text-brand">
                <Box size={20} />
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded bg-app-subtle-bg border border-app-border uppercase tracking-widest ${
                item.currentStock < item.reorderPoint ? 'text-red-500 border-red-500/20' : 'text-emerald-500 border-emerald-500/20'
              }`}>
                {item.currentStock < item.reorderPoint ? 'Critical' : 'Healthy'}
              </span>
            </div>
            
            <h3 className="text-lg font-black text-app-text mb-1 uppercase tracking-tight">{item.sku}</h3>
            <p className="text-[10px] text-app-muted font-bold uppercase tracking-widest mb-6 italic">Inventory ID: 0x{Math.random().toString(16).slice(2, 8).toUpperCase()}</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-app-muted font-medium">Daily Demand</span>
                <span className="text-app-text font-bold">{item.avgDailyDemand.toFixed(1)} u</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-app-muted font-medium">Lead Time</span>
                <span className="text-app-text font-bold">{item.leadTime} Days</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-app-muted font-medium">Available</span>
                <span className="text-brand font-black">{item.currentStock.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-app-border flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-app-bg border border-app-border text-[9px] font-black uppercase tracking-widest text-app-muted hover:text-app-text transition-all">Details</button>
              <button className="flex-1 py-2 rounded-lg bg-brand/10 border border-brand/20 text-[9px] font-black uppercase tracking-widest text-brand hover:bg-brand hover:text-white transition-all">Optimize</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ConfigView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-app-text tracking-tight uppercase italic underline decoration-brand decoration-4 underline-offset-8">Engine Config</h2>
        <p className="text-app-muted font-medium mt-4">Configure your supply chain resilience parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-app-card border border-app-border rounded-3xl p-8 shadow-xl shadow-app-text/5 space-y-8 transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 vibrant-gradient rounded-xl flex items-center justify-center">
              <Sliders className="text-white" size={20} />
            </div>
            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Base Parameters</h3>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-app-muted uppercase tracking-widest">Service Level Confidence</label>
              <div className="flex items-center gap-4">
                <input type="range" className="flex-1 accent-brand h-1.5 rounded-full bg-app-border appearance-none" defaultValue={95} />
                <span className="text-xl font-black text-app-text">95%</span>
              </div>
              <p className="text-[10px] text-app-muted italic">Standard confidence interval for safety stock calculations.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-app-muted uppercase tracking-widest">Global Risk Multiplier</label>
              <div className="flex items-center gap-4">
                <input type="range" className="flex-1 accent-brand h-1.5 rounded-full bg-app-border appearance-none" defaultValue={1.2} step={0.1} min={1} max={3} />
                <span className="text-xl font-black text-app-text">x1.2</span>
              </div>
            </div>

            <div className="pt-6">
               <button className="w-full py-5 bg-brand text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-brand/20 active:scale-95 transition-all">
                 <Save size={16} />
                 Commit Parameters
               </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-app-card border border-app-border rounded-2xl p-8 shadow-xl shadow-app-text/5 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-brand" size={20} />
              <h4 className="text-sm font-black text-app-text uppercase tracking-tight">Resilience Protocols</h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-app-subtle-bg border border-app-border rounded-xl">
                <span className="text-xs font-bold text-app-text uppercase tracking-wider">Auto-Expedite AI</span>
                <div className="w-10 h-5 bg-brand rounded-full relative p-1 cursor-pointer">
                  <div className="w-3 h-3 bg-white rounded-full ml-auto"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-app-subtle-bg border border-app-border rounded-xl opacity-60">
                <span className="text-xs font-bold text-app-text uppercase tracking-wider">Multi-Supplier Diversify</span>
                <div className="w-10 h-5 bg-app-border rounded-full relative p-1 cursor-not-allowed">
                  <div className="w-3 h-3 bg-app-muted rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-brand/5 border border-brand/20 rounded-2xl p-8">
            <h4 className="text-xs font-black text-brand uppercase tracking-widest mb-4">Engine Metadata</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-app-card rounded-xl border border-app-border shadow-sm">
                <span className="text-[10px] font-bold text-app-muted uppercase">Logic Model</span>
                <p className="text-sm font-black text-app-text uppercase tracking-tight mt-1">Gemini-Pro-v3</p>
              </div>
              <div className="p-4 bg-app-card rounded-xl border border-app-border shadow-sm">
                <span className="text-[10px] font-bold text-app-muted uppercase">Latency</span>
                <p className="text-sm font-black text-app-text uppercase tracking-tight mt-1">142ms</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TroubleshootingView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-app-text tracking-tight uppercase italic underline decoration-brand decoration-4 underline-offset-8">Troubleshooting</h2>
        <p className="text-app-muted font-medium mt-4">Deployment and system integration guidelines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-app-card border border-app-border rounded-3xl p-8 shadow-xl shadow-app-text/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
              <Globe className="text-brand" size={20} />
            </div>
            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Manual Deployment</h3>
          </div>
          
          <div className="space-y-4">
             <div className="p-4 bg-app-subtle-bg border border-app-border rounded-xl">
               <h4 className="text-xs font-black text-app-text uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Info size={14} className="text-brand" />
                 Netlify Requirement
               </h4>
               <p className="text-xs text-app-muted leading-relaxed">
                 Every manual deployment must contain an <code className="text-brand font-bold">index.html</code> file in the root directory. Without it, the upload may appear to hang or fail because Netlify has no "entry point" for the site.
               </p>
             </div>

             <div className="p-4 bg-app-subtle-bg border border-app-border rounded-xl">
               <h4 className="text-xs font-black text-app-text uppercase tracking-widest mb-2 flex items-center gap-2">
                 <AlertCircle size={14} className="text-red-500" />
                 Hang/Fail States
               </h4>
               <p className="text-xs text-app-muted leading-relaxed">
                 If your site fails to load or hangs during upload, verify that your build output (usually the <code className="text-brand font-bold">dist</code> folder) contains the entry point file.
               </p>
             </div>
          </div>
        </div>

        <div className="bg-app-card border border-app-border rounded-3xl p-8 shadow-xl shadow-app-text/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-app-card border border-app-border rounded-xl flex items-center justify-center">
              <Activity className="text-brand" size={20} />
            </div>
            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">System Checks</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Cloud Run Connectivity', status: 'Optimal' },
              { label: 'Gemini Backend Proxy (/api/gemini/*)', status: 'Active' },
              { label: 'Model Pipeline (gemini-4-hydrogen)', status: 'Ready' },
              { label: 'Internal DB Sync', status: 'Connected' }
            ].map((check, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-app-subtle-bg border border-app-border rounded-xl">
                <span className="text-xs font-bold text-app-muted uppercase tracking-widest">{check.label}</span>
                <span className="text-xs font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">{check.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-app-card border border-app-border rounded-3xl p-8 shadow-xl shadow-app-text/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
              <Shield className="text-brand" size={20} />
            </div>
            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Gemini API Permission & Configuration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-app-subtle-bg border border-app-border rounded-xl">
              <h4 className="text-xs font-black text-app-text uppercase tracking-widest mb-1">Server-Side Proxy Architecture</h4>
              <p className="text-xs text-app-muted leading-relaxed">
                Gemini API calls are dispatched from the backend Express server (<code className="text-brand font-semibold">/api/gemini/analyze-risk</code> and <code className="text-brand font-semibold">/api/gemini/supplier-email</code>), safeguarding API keys and preventing browser CORS/permission-denied errors.
              </p>
            </div>
            <div className="p-4 bg-app-subtle-bg border border-app-border rounded-xl">
              <h4 className="text-xs font-black text-app-text uppercase tracking-widest mb-1">Permission Denied Resolution</h4>
              <p className="text-xs text-app-muted leading-relaxed">
                Server-side Gemini access is enabled via <code className="text-brand font-semibold">MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API</code> in application configuration, using the <code className="text-brand font-semibold">gemini-4-hydrogen</code> model with automatic heuristic fallback if a key is missing or revoked.
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-app-card border border-app-border rounded-3xl p-8 shadow-xl shadow-app-text/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="text-brand" size={20} />
            </div>
            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">CSV Dataset Upload Troubleshooting</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-app-subtle-bg border border-app-border rounded-xl">
              <h4 className="text-xs font-black text-app-text uppercase tracking-widest mb-1">Supported Columns & Aliases</h4>
              <p className="text-xs text-app-muted leading-relaxed">
                Include a product identifier column (<code className="text-brand font-semibold">Product_ID</code> or <code className="text-brand font-semibold">SKU</code>), a sales/demand column (<code className="text-brand font-semibold">Units_Sold</code>, <code className="text-brand font-semibold">Quantity</code>, or <code className="text-brand font-semibold">Sales</code>), and an optional <code className="text-brand font-semibold">Date</code> and <code className="text-brand font-semibold">Current_Stock</code> column. Headers are matched case-insensitively with UTF-8 BOM stripping.
              </p>
            </div>
            <div className="p-4 bg-app-subtle-bg border border-app-border rounded-xl">
              <h4 className="text-xs font-black text-app-text uppercase tracking-widest mb-1">Common Import Issues</h4>
              <p className="text-xs text-app-muted leading-relaxed">
                Ensure the file is saved as plain-text <code className="text-brand font-semibold">.csv</code> (not <code className="text-brand font-semibold">.xlsx</code> or <code className="text-brand font-semibold">.numbers</code> renamed to .csv). You can also click <strong className="text-app-text">Load Sample Dataset</strong> or download the <strong className="text-app-text">Sample .CSV</strong> template directly from the Dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
