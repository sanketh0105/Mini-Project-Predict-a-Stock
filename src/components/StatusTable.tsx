import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { InventoryResult } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusTableProps {
  data: InventoryResult[];
  onResolve: (item: InventoryResult) => void;
}

export const StatusTable: React.FC<StatusTableProps> = ({ data, onResolve }) => {
  return (
    <div className="bg-app-card rounded-2xl border border-app-border shadow-xl shadow-app-text/5 overflow-hidden transition-all duration-300">
      <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-subtle-bg/50">
        <div>
          <h3 className="text-lg font-bold text-app-text tracking-tight">SKU Resilience Registry</h3>
          <p className="text-sm text-app-muted font-medium">Real-time supply chain health check</p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 flex items-center gap-2 group cursor-default">
          <Sparkles size={14} className="text-brand group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] font-bold text-brand uppercase tracking-widest">AI Intelligence Active</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-app-bg text-app-muted text-[10px] font-bold uppercase tracking-widest">
              <th className="px-8 py-5 border-b border-app-border">SKU Reference</th>
              <th className="px-8 py-5 border-b border-app-border">Avg. Consumption</th>
              <th className="px-8 py-5 border-b border-app-border">On-Hand Stock</th>
              <th className="px-8 py-5 border-b border-app-border">ROP Threshold</th>
              <th className="px-8 py-5 border-b border-app-border text-right">Status & Intelligence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border/50">
            {data.map((item) => {
              const isCritical = item.currentStock < item.reorderPoint;
              const isWarning = item.currentStock < item.reorderPoint * 1.5;
              
              const statusColor = 
                isCritical 
                ? 'text-red-500 bg-red-500/10 border-red-500/20' 
                : isWarning
                ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';

              const StatusIcon = 
                isCritical ? AlertTriangle :
                isWarning ? Clock : CheckCircle;

              return (
                <tr key={item.sku} className="hover:bg-brand/[0.02] transition-colors group">
                  <td className="px-8 py-5 font-bold text-app-text uppercase tracking-tight">{item.sku}</td>
                  <td className="px-8 py-5 text-sm text-app-muted font-medium">{item.avgDailyDemand.toFixed(1)} <span className="text-[10px] opacity-60 uppercase">u/day</span></td>
                  <td className="px-8 py-5 text-sm font-black text-app-text">{item.currentStock.toLocaleString()}</td>
                  <td className="px-8 py-5 text-sm font-bold text-app-muted">{item.reorderPoint.toFixed(0)}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-end gap-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-wider",
                        statusColor
                      )}>
                        <StatusIcon size={12} />
                        {isCritical ? 'Critical' : isWarning ? 'Reorder' : 'Optimal'}
                      </span>
                      
                      {(isCritical || isWarning) && (
                        <button 
                          onClick={() => onResolve(item)}
                          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-brand bg-brand/10 border border-brand/20 rounded-lg hover:bg-brand hover:text-white transition-all transform hover:scale-105 active:scale-95 uppercase tracking-wider shadow-lg shadow-brand/10"
                        >
                          <Sparkles size={12} />
                          AI Fix
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
