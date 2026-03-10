import React from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { formatCurrency } from '../../utils/calculations';

export const StaticHeatmap = ({ xLabels, yLabels, data, lang }: { xLabels: number[], yLabels: number[], data: number[][], lang: string }) => {
    const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];
    return (
        <div className="w-full">
            <div className="w-full">
                {/* Header Row */}
                <div className="flex">
                    <div className="w-12 h-6 flex-none bg-slate-50 border border-slate-200"></div>
                    {xLabels.map(x => (
                        <div key={x} className="flex-1 text-center py-1 text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200 uppercase">
                            H {x}%
                        </div>
                    ))}
                </div>
                {/* Rows */}
                {yLabels.map((y, i) => (
                    <div key={y} className="flex">
                        {/* Y Axis Label */}
                        <div className="w-12 h-8 flex-none flex items-center justify-center text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1 text-center">
                            Y {y}%
                        </div>
                        {/* Cells */}
                        {data[i].map((val, j) => {
                            const isPositive = val > 0;
                            const opacity = Math.min(Math.abs(val) / 2000000, 1) * 0.8 + 0.1;
                            const bgColor = isPositive
                                ? `rgba(16, 185, 129, ${opacity})`
                                : `rgba(239, 68, 68, ${opacity})`;

                            return (
                                <div
                                    key={`${i}-${j}`}
                                    className="flex-1 h-8 flex items-center justify-center text-[8px] font-mono border border-white"
                                    style={{ backgroundColor: bgColor, color: opacity > 0.5 ? 'white' : '#1e293b' }}
                                >
                                    {val > 0 ? '+' : ''}{(val / 1000).toFixed(0)}k
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}
