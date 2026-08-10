import React from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area } from 'recharts';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { Heatmap } from '../components/charts/Heatmap';
import { formatCurrency, formatPercent } from '../utils/calculations';
import { THEME } from '../constants/theme';
import { Language } from '../types';
import { useApp } from '../state';

export const MarketRiskView = () => {
    const { t, sensitivityYear, setSensitivityYear, lang, setActiveView: onNavigate, stressTest } = useApp();
    const { stressStats, stressedProjection, sensitivityData } = stressTest;
    return (
        <div className="space-y-5 sm:space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <KPICard
                    label={t.lowestNetEquity}
                    value={formatCurrency(stressStats.lowestEquity)}
                    subtext={t.projectedMinimum}
                    alert={stressStats.lowestEquity < 0}
                />
                {/* Read stressStats.breakEvenStatus, not the number: 100 means "no HIBOR
                    level produces a loss" and 0 can mean "already loss-making at 0%", so
                    rendering either literally inverts its meaning. 'underwater' is an alert
                    state — the structure loses money at every reachable rate. */}
                <KPICard
                    label={t.breakEvenHibor}
                    value={
                        stressStats.breakEvenStatus === 'never' ? t.breakEvenNever
                            : stressStats.breakEvenStatus === 'underwater' ? t.breakEvenUnderwater
                                : formatPercent(stressStats.breakEvenHibor)
                    }
                    subtext={
                        stressStats.breakEvenStatus === 'never' ? t.breakEvenNeverSub
                            : stressStats.breakEvenStatus === 'underwater' ? t.breakEvenUnderwaterSub
                                : t.netCarryNeutral
                    }
                    alert={stressStats.breakEvenStatus === 'underwater'}
                />
            </div>

            <Card title={t.netWorthComparison} subtitle={`${t.baseline} vs ${t.stressed}`}>
                <div className="h-[240px] sm:h-[300px] md:h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stressedProjection} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={THEME.navy} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={THEME.navy} stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="colorStressed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={THEME.danger} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={THEME.danger} stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} label={{ value: t.year, position: 'insideBottomRight', offset: -2, fontSize: 10, fill: '#64748b' }} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `$${val / 1000000}M`} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            <Legend />
                            <Area type="monotone" dataKey="baselineNetEquity" name={t.baseline} stroke={THEME.navy} fill="url(#colorBaseline)" strokeWidth={2} isAnimationActive={false} />
                            <Area type="monotone" dataKey="netEquity" name={t.stressed} stroke={THEME.danger} fill="url(#colorStressed)" strokeWidth={2} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card
                title={t.sensitivityAnalysis}
                subtitle={`${t.netEquityAtYear.replace('{year}', String(sensitivityYear))} (${t.stressed})`}
                action={
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">{t.analysisYear}:</span>
                        <select
                            value={sensitivityYear}
                            onChange={(e) => setSensitivityYear(Number(e.target.value))}
                            className="bg-slate-100 border-none text-base lg:text-xs font-bold text-slate-700 rounded min-h-[44px] lg:min-h-0 py-1 pl-3 pr-3 cursor-pointer focus:ring-2 focus:ring-[#c5a059] outline-none"
                        >
                            {[10, 15, 20, 25, 30].map(y => (
                                <option key={y} value={y}>Year {y}</option>
                            ))}
                        </select>
                    </div>
                }
            >
                <div className="mt-6 overflow-x-auto pb-4">
                    <Heatmap
                        xLabels={sensitivityData.xLabels}
                        yLabels={sensitivityData.yLabels}
                        data={sensitivityData.data}
                    />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3 text-[#c5a059]" />
                        {t.interpretation}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {t.heatmapLegend}
                    </p>
                </div>
            </Card>

            <div className="flex justify-center pt-4 pb-12">
                <button
                    onClick={() => onNavigate('pdfPreview')}
                    className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition-all group scale-100 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
                >
                    <div className="flex flex-col items-start text-left">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold mb-1">{lang === 'en' ? 'Analysis Complete' : '分析完成'}</span>
                        <span className="text-base font-bold">{lang === 'en' ? 'Review Final Report' : '審閱最終報告'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#c5a059] flex items-center justify-center group-hover:translate-x-1 transition-transform">
                        <ChevronRight className="w-6 h-6 text-[#020617]" />
                    </div>
                </button>
            </div>
        </div>
    );
};
