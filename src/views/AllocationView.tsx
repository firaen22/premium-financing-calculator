import React from 'react';
import { PlusCircle, MinusCircle, Home, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { FlowDiagram } from '../components/charts/FlowDiagram';
import { formatCurrency, formatPercent } from '../utils/calculations';
import { THEME } from '../constants/theme';
import { Language } from '../types';

interface AllocationViewProps {
    t: any;
    totalPremium: number;
    bankLoan: number;
    effectiveRate: number;
    finalNetEquity: number;
    roi: number;
    monthlyBondIncome: number;
    monthlyLoanInterest: number;
    fundSource: 'cash' | 'mortgage';
    monthlyMortgagePmt: number;
    monthlyNetCashflow: number;
    budget: number;
    cashReserve: number;
    netBondPrincipal: number;
    pfEquity: number;
    lang: Language;
    onNavigate: (view: string) => void;
}

export const AllocationView = ({
    t,
    totalPremium,
    bankLoan,
    effectiveRate,
    finalNetEquity,
    roi,
    monthlyBondIncome,
    monthlyLoanInterest,
    fundSource,
    monthlyMortgagePmt,
    monthlyNetCashflow,
    budget,
    cashReserve,
    netBondPrincipal,
    pfEquity,
    lang,
    onNavigate
}: AllocationViewProps) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <KPICard
                    label={t.totalPolicyValue}
                    value={formatCurrency(totalPremium)}
                    subtext={t.day1Exposure}
                />
                <KPICard
                    label={t.lendingFacility}
                    value={formatCurrency(bankLoan)}
                    subtext={`@ ${formatPercent(effectiveRate)} ${t.effectiveRate}`}
                />
                <KPICard
                    label={t.netEquityY30}
                    value={formatCurrency(finalNetEquity)}
                    subtext={`${roi.toFixed(1)}% ${t.roi}`}
                    highlight
                />
            </div>

            <Card title={t.monthlyCashflow} subtitle={t.incomeVsCost}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.bondIncome}</div>
                            <div className="text-xl font-serif text-[#059669] flex items-center">
                                <PlusCircle className="w-4 h-4 mr-2" />
                                {formatCurrency(monthlyBondIncome)}
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.loanInterest}</div>
                            <div className="text-xl font-serif text-[#991b1b] flex items-center">
                                <MinusCircle className="w-4 h-4 mr-2" />
                                {formatCurrency(monthlyLoanInterest)}
                            </div>
                        </div>
                        {fundSource === 'mortgage' && (
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.mtgCost}</div>
                                <div className="text-xl font-serif text-orange-700 flex items-center">
                                    <Home className="w-4 h-4 mr-2" />
                                    {formatCurrency(monthlyMortgagePmt)}
                                </div>
                            </div>
                        )}
                        <div className="pt-4">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{t.netMonthlyCashflow}</div>
                            <div className={`text-3xl font-serif font-medium ${monthlyNetCashflow >= 0 ? 'text-slate-900' : 'text-[#991b1b]'}`}>
                                {monthlyNetCashflow >= 0 ? '+' : ''}{formatCurrency(monthlyNetCashflow)}
                            </div>
                        </div>
                    </div>

                    <div className="h-48 w-full border-l border-slate-100 pl-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={[
                                    { name: t.income, value: monthlyBondIncome, fill: THEME.success },
                                    { name: t.intCost, value: monthlyLoanInterest, fill: THEME.danger },
                                    ...(fundSource === 'mortgage' ? [{ name: t.mtgCost, value: monthlyMortgagePmt, fill: THEME.orange }] : [])
                                ]}
                                margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
                                barSize={24}
                            >
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    width={60}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                                    {
                                        [THEME.success, THEME.danger, THEME.orange].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>

            <Card title={t.structureVis} subtitle={t.fundFlow}>
                <FlowDiagram
                    budget={budget}
                    cash={cashReserve}
                    bond={netBondPrincipal}
                    equity={pfEquity}
                    loan={bankLoan}
                    premium={totalPremium}
                    labels={t}
                    sourceType={fundSource}
                />
            </Card>

            <div className="flex justify-center pt-8 pb-12">
                <button
                    onClick={() => onNavigate('pdfPreview')}
                    className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition-all group scale-100 hover:scale-105 active:scale-95"
                >
                    <div className="flex flex-col items-start text-left">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold mb-1">{lang === 'en' ? 'Configuration Complete' : '配置完成'}</span>
                        <span className="text-base font-bold">{lang === 'en' ? 'Review & Download Report' : '預覽並導出報告'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#c5a059] flex items-center justify-center group-hover:translate-x-1 transition-transform">
                        <ChevronRight className="w-6 h-6 text-white" />
                    </div>
                </button>
            </div>
        </div>
    );
};
