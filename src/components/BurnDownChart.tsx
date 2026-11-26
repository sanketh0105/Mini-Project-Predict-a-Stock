import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { BurnDownData } from '../types';

interface BurnDownChartProps {
  data: BurnDownData[];
  safetyLevel: number;
}

export const BurnDownChart: React.FC<BurnDownChartProps> = ({ data, safetyLevel }) => {
  const isBelowSafety = data.some(d => d.stock < safetyLevel);

  return (
    <div className="w-full h-[450px] bg-app-card p-8 rounded-2xl border border-app-border shadow-xl shadow-app-text/5 relative overflow-hidden transition-all duration-300">
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h3 className="text-xl font-black text-app-text tracking-tight uppercase tracking-tight">Inventory Velocity</h3>
          <p className="text-sm text-app-muted font-medium">30-day projection based on current consumption</p>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand shadow-lg shadow-brand/40"></span>
            <span className="text-app-text">Current Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-0.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
            <span className="text-red-500">Safety Buffer</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isBelowSafety ? "#ef4444" : "#6366f1"} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isBelowSafety ? "#ef4444" : "#6366f1"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)" />
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--app-muted)', fontSize: 10, fontWeight: 700 }} 
            dy={15}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--app-muted)', fontSize: 10, fontWeight: 700 }}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--app-card)', 
              borderColor: 'var(--app-border)', 
              borderRadius: '12px',
              border: '1px solid var(--app-border)',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
            }}
            itemStyle={{ color: 'var(--app-text)', fontSize: '12px', fontWeight: 600 }}
            labelStyle={{ color: 'var(--app-muted)', fontSize: '10px', marginBottom: '4px', fontWeight: 700 }}
          />
          <Area 
            type="monotone" 
            dataKey="stock" 
            stroke={isBelowSafety ? "#ef4444" : "#6366f1"} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorStock)" 
            animationDuration={2000}
            className="drop-shadow-[0_0_8px_rgba(99,102,241,0.2)]"
          />
          <ReferenceLine 
            y={safetyLevel} 
            stroke="#ef4444" 
            strokeDasharray="5 5" 
            strokeWidth={2}
            label={{ 
              value: 'L-RESERVE', 
              position: 'right', 
              fill: '#ef4444', 
              fontSize: 10, 
              fontWeight: 900,
              offset: 20
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
