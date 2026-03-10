import React, { useState } from 'react';
import {
    TrendingUp,
    Shield,
    PlusCircle,
    MinusCircle,
    Home,
    Landmark
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine
} from 'recharts';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '../utils/calculations';

interface ReturnStudioProps {
    data: any[];
    labels: any;
    bondYield: number;
    loanRate: number;
    budget: number;
    totalPremium: number;
}

export const ReturnStudio = ({
    data,
    labels,
    bondYield,
    loanRate,
    budget,
    totalPremium
}: ReturnStudioProps) => {
    const [selectedYear, setSelectedYear] = useState(1);

    const getCurrentYearData = (year: number) => {
        const currData = data[year];
        const initialData = data[0];

        if (!currData || !initialData) return null;

        const initialMtg = initialData.mortgageBalance || 0;
        const currentMtg = currData.mortgageBalance || 0;
        const mortgagePrincipalRepaid = Math.max(0, initialMtg - currentMtg);
        const policyPnL = currData.surrenderValue - totalPremium;

        return {
            year,
            openingEquity: budget,
            bondIncome: currData.cumulativeBondInterest,
            policyGrowth: policyPnL,
            loanInterest: currData.cumulativeInterest,
            netGain: currData.cumulativeNetGain,
            closingEquity: currData.netEquity,
            annualRoC: currData.annualRoC,
            cumulativeMortgageCost: currData.cumulativeMortgageCost || 0,
            mortgageInterest: currData.cumulativeMortgageInterest || 0,
            mortgagePrincipalRepaid
        };
    };

    const stats = getCurrentYearData(selectedYear);
    if (!stats) return <div>No data available</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card className="bg-[#020617] text-white border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-serif text-white mb-1">{labels.returnStudio}</h2>
                        <p className="text-slate-400 text-xs uppercase tracking-widest">{labels.analysisYear}: <span className="text-[#c5a059] font-bold text-lg">Year {selectedYear}</span></p>
                    </div>
                    <div className="flex-1 max-w-md">
                        <input
                            type="range"
                            min="1"
                            max="30"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#c5a059]"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 uppercase">
                            <span>Year 1</span>
                            <span>Year 15</span>
                            <span>Year 30</span>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{labels.openingEquity}</div>
                    <div className="text-xl md:text-2xl font-serif text-slate-900">{formatCurrency(stats.openingEquity)}</div>
                </div>
                <div className="bg-white p-6 border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{labels.netGain}</div>
                    <div className={`text-xl md:text-2xl font-serif ${stats.netGain >= 0 ? 'text-[#059669]' : 'text-[#991b1b]'}`}>
                        {stats.netGain > 0 ? '+' : ''}{formatCurrency(stats.netGain)}
                    </div>
                </div>
                <div className="bg-white p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#c5a059]/10 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{labels.closingEquity}</div>
                    <div className="text-xl md:text-2xl font-serif text-slate-900 relative z-10">{formatCurrency(stats.closingEquity)}</div>
                </div>
                <div className="bg-[#020617] p-6 border border-slate-900 shadow-sm text-white">
                    <div className="text-[10px] font-bold text-[#c5a059] uppercase tracking-widest mb-2">{labels.annualRoC}</div>
                    <div className="text-xl md:text-2xl font-serif text-white">{stats.annualRoC.toFixed(2)}%</div>
                </div>
            </div>

            <Card title={labels.attributionAnalysis} subtitle={labels.cumulativePerfPattern ? labels.cumulativePerfPattern.replace('{year}', selectedYear.toString()) : `Cumulative Performance to Year ${selectedYear}`}>
                <div className="flex flex-col lg:flex-row gap-12 mt-4">
                    <div className="flex-1 space-y-3">
                        <div className="relative pl-8 border-l-2 border-slate-100 pb-8">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
                                <PlusCircle className="w-3 h-3 text-emerald-600" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{labels.totalInflow}</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded shadow-sm text-emerald-600">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700">{labels.bondIncome}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{labels.yieldLabel}: {bondYield.toFixed(2)}%</div>
                                        </div>
                                    </div>
                                    <div className="font-serif text-emerald-700 font-medium">{formatCurrency(stats.bondIncome)}</div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded shadow-sm text-emerald-600">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700">{labels.policyGrowth}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{labels.organicGrowth}</div>
                                        </div>
                                    </div>
                                    <div className={`font-serif font-medium ${stats.policyGrowth >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {formatCurrency(stats.policyGrowth)}
                                    </div>
                                </div>
                                {stats.mortgagePrincipalRepaid > 0 && (
                                    <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded shadow-sm text-emerald-600">
                                                <Home className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">{labels.mtgRepaid}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">Liability Reduction</div>
                                            </div>
                                        </div>
                                        <div className="font-serif text-emerald-700 font-medium">+{formatCurrency(stats.mortgagePrincipalRepaid)}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative pl-8 border-l-2 border-slate-100 pb-8">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                                <MinusCircle className="w-3 h-3 text-red-600" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{labels.costOfFunding}</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded shadow-sm text-red-600">
                                            <Landmark className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700">{labels.pfInterest}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">Rate: {loanRate.toFixed(2)}%</div>
                                        </div>
                                    </div>
                                    <div className="font-serif text-red-700 font-medium">-{formatCurrency(stats.loanInterest)}</div>
                                </div>
                                {stats.mortgageInterest > 0 && (
                                    <div className="flex items-center justify-between p-4 bg-orange-50/50 border border-orange-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded shadow-sm text-orange-600">
                                                <Home className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">{labels.mortgageInterest || "Mortgage Interest"}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">Interest Portion</div>
                                            </div>
                                        </div>
                                        <div className="font-serif text-orange-700 font-medium">-{formatCurrency(stats.mortgageInterest)}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative pl-8">
                            <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-800 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            <div className="flex items-center justify-between p-6 bg-[#020617] text-white rounded-lg shadow-lg">
                                <div>
                                    <div className="text-sm font-bold text-[#c5a059] uppercase tracking-wider mb-1">{labels.netEquity}</div>
                                    <div className="text-[10px] text-slate-400">{labels.netEquityDesc}</div>
                                </div>
                                <div className="text-2xl font-serif">
                                    {formatCurrency(stats.closingEquity)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/3 h-[300px] md:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[
                                    { name: labels.chartStart, value: stats.openingEquity, fill: '#94a3b8' },
                                    { name: labels.chartBond, value: stats.bondIncome, fill: '#059669' },
                                    { name: labels.chartPolicy, value: stats.policyGrowth, fill: stats.policyGrowth >= 0 ? '#10b981' : '#ef4444' },
                                    { name: labels.chartInterest, value: -stats.loanInterest, fill: '#dc2626' },
                                    ...(stats.mortgagePrincipalRepaid > 0 ? [{ name: labels.mtgRepaid, value: stats.mortgagePrincipalRepaid, fill: '#c5a059' }] : []),
                                    { name: labels.chartEnd, value: stats.closingEquity, fill: '#0f172a' },
                                ]}
                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis hide />
                                <Tooltip
                                    formatter={(val: number) => formatCurrency(val)}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <ReferenceLine y={0} stroke="#000" />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                                    <Cell fill="#cbd5e1" />
                                    <Cell fill="#059669" />
                                    <Cell fill={stats.policyGrowth >= 0 ? "#10b981" : "#ef4444"} />
                                    <Cell fill="#ef4444" />
                                    {stats.mortgagePrincipalRepaid > 0 && <Cell fill="#c5a059" />}
                                    <Cell fill="#020617" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="text-center text-[10px] text-slate-400 mt-2 italic">
                            {labels.equityWalkFooter}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};
