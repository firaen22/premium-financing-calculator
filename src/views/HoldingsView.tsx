import React from 'react';
import { Download } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line } from 'recharts';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '../utils/calculations';
import { THEME } from '../constants/theme';
import { CustomLabel } from '../components/charts';

interface HoldingsViewProps {
    t: any;
    projectionData: any[];
    chartFilters: any;
    setChartFilters: (filters: any) => void;
    fundSource: 'cash' | 'mortgage';
    handleExportCSV: () => void;
}

export const HoldingsView = ({
    t,
    projectionData,
    chartFilters,
    setChartFilters,
    fundSource,
    handleExportCSV
}: HoldingsViewProps) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card title={t.projectedPerf} subtitle={t.horizon30y}>
                <div className="flex flex-wrap gap-2 mb-4 mt-4 px-4 overflow-x-auto">
                    {[
                        { key: 'bondPrincipal', label: t.bond, color: THEME.gold },
                        { key: 'cashValue', label: t.cash, color: THEME.success },
                        { key: 'bondInterest', label: t.bondInt, color: THEME.goldHighlight },
                        { key: 'policyValue', label: t.policy, color: THEME.navy },
                        { key: 'loan', label: t.loan, color: THEME.danger },
                    ].map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setChartFilters((prev: any) => ({ ...prev, [filter.key]: !prev[filter.key] }))}
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all ${chartFilters[filter.key]
                                ? 'text-white shadow-sm'
                                : 'bg-white text-slate-300 border-slate-100'
                                }`}
                            style={{
                                backgroundColor: chartFilters[filter.key] ? filter.color : undefined,
                                borderColor: chartFilters[filter.key] ? filter.color : undefined,
                            }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={projectionData} margin={{ top: 10, right: 100, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPolicy" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={THEME.navy} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={THEME.navy} stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="colorBond" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.6} />
                                    <stop offset="95%" stopColor={THEME.gold} stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="colorBondInt" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={THEME.goldHighlight} stopOpacity={0.6} />
                                    <stop offset="95%" stopColor={THEME.goldHighlight} stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={THEME.success} stopOpacity={0.6} />
                                    <stop offset="95%" stopColor={THEME.success} stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="year"
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={15}
                                fontFamily="sans-serif"
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={10}
                                tickFormatter={(val) => `$${val / 1000000}M`}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={15}
                                fontFamily="sans-serif"
                            />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                    backgroundColor: '#020617',
                                    border: 'none',
                                    color: '#fff',
                                    fontFamily: 'sans-serif'
                                }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ fontWeight: 'bold', color: '#c5a059', marginBottom: '5px' }}
                            />
                            {chartFilters.bondPrincipal && (
                                <Area isAnimationActive={false}
                                    type="monotone"
                                    dataKey="bondPrincipal"
                                    stackId="1"
                                    stroke={THEME.gold}
                                    fill="url(#colorBond)"
                                    name={t.bond}
                                    label={(props) => <CustomLabel {...props} name={t.bond} color={THEME.gold} />}
                                />
                            )}
                            {chartFilters.cashValue && (
                                <Area isAnimationActive={false}
                                    type="monotone"
                                    dataKey="cashValue"
                                    stackId="1"
                                    stroke={THEME.success}
                                    fill="url(#colorCash)"
                                    name={t.cash}
                                    label={(props) => <CustomLabel {...props} name={t.cash} color={THEME.success} />}
                                />
                            )}
                            {chartFilters.bondInterest && (
                                <Area isAnimationActive={false}
                                    type="monotone"
                                    dataKey="cumulativeBondInterest"
                                    stackId="1"
                                    stroke={THEME.goldHighlight}
                                    fill="url(#colorBondInt)"
                                    name={t.bondInt}
                                    label={(props) => <CustomLabel {...props} name={t.bondInt} color={THEME.goldHighlight} />}
                                />
                            )}
                            {chartFilters.policyValue && (
                                <Area isAnimationActive={false}
                                    type="monotone"
                                    dataKey="surrenderValue"
                                    stackId="1"
                                    stroke={THEME.navy}
                                    fill="url(#colorPolicy)"
                                    name={t.policy}
                                    label={(props) => <CustomLabel {...props} name={t.policy} color={THEME.navy} />}
                                />
                            )}
                            {chartFilters.loan && (
                                <Line isAnimationActive={false}
                                    type="monotone"
                                    dataKey="loan"
                                    stroke={THEME.danger}
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    name={t.loan}
                                    label={(props) => <CustomLabel {...props} name={t.loan} color={THEME.danger} />}
                                />
                            )}
                            {fundSource === 'mortgage' && (
                                <Line isAnimationActive={false}
                                    type="monotone"
                                    dataKey="mortgageBalance"
                                    stroke={THEME.orange}
                                    strokeWidth={2}
                                    strokeDasharray="2 2"
                                    dot={false}
                                    name={t.mortgageBalance}
                                />
                            )}
                            <Line isAnimationActive={false}
                                type="monotone"
                                dataKey="netEquity"
                                stroke="#000"
                                strokeWidth={3}
                                dot={false}
                                name={t.netEquity}
                                label={(props) => <CustomLabel {...props} name={t.netEquity} color="#020617" />}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card
                title={t.ledgerStatement}
                subtitle={t.fiscalYearBreakdown}
                className="overflow-hidden"
                action={
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#020617] transition-colors uppercase tracking-wider group"
                    >
                        <Download className="w-4 h-4 text-[#c5a059] group-hover:text-[#020617]" />
                        {t.exportData}
                    </button>
                }
            >
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-4 font-bold uppercase tracking-widest min-w-[60px]">{t.year}</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-emerald-600">{t.cumBondInt}</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-emerald-600">{t.cashReserve}</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-widest text-right">{t.bondCapitalNet}</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-widest text-right">{t.policyValue}</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-red-800">{t.totalLoan}</th>
                                {fundSource === 'mortgage' && <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-orange-800">{t.mortgageBalance}</th>}
                                <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-red-800">{t.cumLoanInt}</th>
                                {fundSource === 'mortgage' && <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-orange-600">{t.mtgCost}</th>}
                                <th className="px-4 py-4 font-bold uppercase tracking-widest text-right bg-slate-100">{t.netEquity}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {projectionData.map((row) => (
                                <tr key={row.year} className="hover:bg-slate-50 transition-colors font-mono text-slate-600">
                                    <td className="px-4 py-3 font-bold text-slate-900">{row.year}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600">+{formatCurrency(row.cumulativeBondInterest)}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(row.cashValue)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(row.bondPrincipal)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(row.surrenderValue)}</td>
                                    <td className="px-4 py-3 text-right text-red-700">{formatCurrency(row.loan)}</td>
                                    {fundSource === 'mortgage' && <td className="px-4 py-3 text-right text-orange-800">{formatCurrency(row.mortgageBalance)}</td>}
                                    <td className="px-4 py-3 text-right text-red-400">({formatCurrency(row.cumulativeInterest)})</td>
                                    {fundSource === 'mortgage' && <td className="px-4 py-3 text-right text-orange-600">({formatCurrency(row.annualMortgagePayment)})</td>}
                                    <td className={`px-4 py-3 text-right font-bold bg-slate-50 ${row.netEquity >= 0 ? 'text-[#020617]' : 'text-red-700'}`}>
                                        {row.formattedNetEquity}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
