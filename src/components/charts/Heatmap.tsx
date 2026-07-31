import React from 'react';
import { formatCurrency } from '../../utils/calculations';

export const Heatmap = React.memo(({ xLabels, yLabels, data }: { xLabels: number[], yLabels: number[], data: number[][] }) => {
    // Normalise the colour scale to this grid's own largest magnitude. The old fixed
    // 2,000,000 cap saturated every cell in a typical projection (values run 1.6M-4.8M),
    // so the whole heatmap rendered as one flat green and communicated nothing.
    const maxAbs = Math.max(1, ...data.flat().map(Math.abs));
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
                            const opacity = (Math.abs(val) / maxAbs) * 0.8 + 0.1;
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
