import React from 'react';

export const KPICard = ({ label, value, subtext, highlight = false, alert = false }: { label: string, value: string, subtext: string, highlight?: boolean, alert?: boolean }) => (
    <div className={`p-4 md:p-6 border ${highlight ? 'bg-[#020617] border-[#020617] text-white' : alert ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
        <div className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-3 ${highlight ? 'text-[#c5a059]' : alert ? 'text-red-600' : 'text-slate-500'}`}>
            {label}
        </div>
        <div className={`text-3xl font-serif mb-2 ${highlight ? 'text-white' : alert ? 'text-red-900' : 'text-slate-900'}`}>
            {value}
        </div>
        <div className={`text-xs font-medium font-mono ${highlight ? 'text-slate-400' : alert ? 'text-red-700' : 'text-slate-500'}`}>
            {subtext}
        </div>
    </div>
);
