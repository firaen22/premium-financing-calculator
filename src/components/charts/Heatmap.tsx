import React from 'react';
import { formatCurrency } from '../../utils/calculations';

export const Heatmap = React.memo(({ xLabels, yLabels, data }: { xLabels: number[], yLabels: number[], data: number[][] }) => {
    return (
        <div className="w-full overflow-x-auto">
            <div className="min-w-[400px]">
                {/* Header Row */}
                <div className="flex">
                    <div className="w-16 flex-none bg-slate-50"></div> {/* Corner */}
                    {xLabels.map(x => (
                        <div key={x} className="flex-1 text-center py-2 text-[10px] font-bold text-slate-500 bg-slate-50 border-b border-slate-100">
                            HIBOR {x}%
                        </div>
                    ))}
                </div>
                {/* Rows */}
                {yLabels.map((y, i) => (
                    <div key={y} className="flex h-12">
                        {/* Y Axis Label */}
                        <div className="w-16 flex-none flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-50 border-r border-slate-100 px-2">
                            Yield {y}%
                        </div>
                        {/* Cells */}
                        {data[i].map((val, j) => {
                            const isPositive = val > 0;
                            // Calculate opacity based on magnitude relative to max (clamped)
                            const opacity = Math.min(Math.abs(val) / 2000000, 1) * 0.8 + 0.1;
                            const bgColor = isPositive
                                ? `rgba(5, 150, 105, ${opacity})` // emerald
                                : `rgba(220, 38, 38, ${opacity})`; // red

                            return (
                                <div
                                    key={`${i}-${j}`}
                                    className="flex-1 flex items-center justify-center text-[10px] font-mono border border-white transition-all hover:scale-105 z-0 hover:z-10 shadow-none hover:shadow-md cursor-default"
                                    style={{ backgroundColor: bgColor, color: opacity > 0.5 ? 'white' : '#1e293b' }}
                                    title={`Yield ${y}%, HIBOR ${xLabels[j]}%: ${formatCurrency(val)}`}
                                >
                                    {val > 0 ? '+' : ''}{(val / 1000).toFixed(0)}k
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
            <div className="text-[10px] text-slate-400 text-right mt-2 font-mono">
                *Values in '000s USD
            </div>
        </div>
    )
});
