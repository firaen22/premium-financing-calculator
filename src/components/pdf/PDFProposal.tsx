import React from 'react';
import {
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Line,
    ComposedChart,
    Legend
} from 'recharts';
import {
    Shield,
    CheckCircle2,
    AlertTriangle,
    Server,
    Home
} from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';
import { formatCurrency } from '../../utils/calculations';
import { FlowDiagram } from '../charts/FlowDiagram';
import { StaticHeatmap } from '../charts/StaticHeatmap';
import { DetailedCalculationTable } from './DetailedCalculationTable';

export const PDFProposal = ({
    projectionData, lang, budget, totalPremium, bankLoan, roi, netEquityAt30,
    propertyValue, unlockedCash, hibor, currentMtgRate, cashReserve,
    netBondPrincipal, pfEquity, fundSource, clientName, representativeName,
    sensitivityData, spread, leverageLTV, bondYield, sensitivityYear
}: any) => {
    if (!projectionData || projectionData.length < 31) return null;
    const isZh = lang !== 'en';
    const t = (TRANSLATIONS as any)[lang];

    const PageContainer = ({ children, pageNum }: any) => (
        <div id={`report-page-${pageNum}`} className="pdf-only page-break bg-white w-[297mm] h-[210mm] relative p-8 overflow-hidden flex flex-col font-serif">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <div className="text-xl font-serif tracking-tighter text-slate-900 border-r border-slate-200 pr-3">{t.privateWealth}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none">{t.financingStrategy}</div>
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">{t.page} {pageNum} {t.of} 9</div>
            </div>
            <div className="flex-1">
                {children}
            </div>
            <div className="mt-2 flex justify-between items-end border-t border-slate-100 pt-2 text-[9px] text-slate-300">
                <div>{t.confidentialFooter}</div>
                <div>{new Date().toLocaleDateString()} • {t.refPrefix}: PF-2024-8921</div>
            </div>
        </div>
    );

    const SectionTitle = ({ title, subtitle }: any) => (
        <div className="mb-4">
            <h2 className="text-3xl font-serif text-slate-900 mb-2">{title}</h2>
            <div className="w-16 h-1 bg-[#c5a059] mb-3"></div>
            {subtitle && <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">{subtitle}</p>}
        </div>
    );

    const dataY10 = projectionData[10];
    const dataY15 = projectionData[15];
    const dataY20 = projectionData[20];
    const dataY30 = projectionData[projectionData.length - 1];

    return (
        <>
            {/* Page 1: Cover */}
            <div id="report-page-1" className="pdf-only page-break bg-slate-900 w-[297mm] h-[210mm] relative p-16 flex flex-col justify-center overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-[#c5a059] opacity-10 -skew-x-12 translate-x-20"></div>
                <div className="relative border-l-4 border-[#c5a059] pl-10">
                    <div className="text-white text-lg font-serif tracking-[0.3em] uppercase mb-4 opacity-60">{t.wealthManagement}</div>
                    <h1 className="text-white text-7xl font-serif leading-tight mb-8">
                        {t.premiumFinancing}<br />
                        <span className="text-[#c5a059]">{t.strategicProposal}</span>
                    </h1>
                    <div className="w-32 h-1 bg-[#c5a059] mb-12"></div>
                    <div className="space-y-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-[#c5a059] font-bold mb-1">{t.preparedFor}</div>
                            <div className="text-2xl text-white font-serif opacity-90">{clientName}</div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-[#c5a059] font-bold mb-1">{t.presentedBy}</div>
                            <div className="text-xl text-white font-serif opacity-90 italic">{representativeName}</div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-16 right-16 text-right">

                    <div className="text-xs text-white/40 font-mono tracking-widest uppercase">{new Date().getFullYear()} {t.collection}</div>
                </div>
            </div>

            {/* Page 2: Executive Summary */}
            <PageContainer pageNum={2}>
                <SectionTitle title={t.executiveSummary} subtitle={t.strategicOverviewSubtitle} />
                <div className="grid grid-cols-2 gap-12 mt-10">
                    <div className="space-y-8">
                        <div className="bg-slate-50 p-8 border border-slate-100 italic text-slate-600 leading-relaxed text-sm">
                            {t.execSummaryBody}
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white border-l-2 border-slate-900 p-4 shadow-sm">
                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">{t.targetNetEquity}</div>
                                <div className="text-2xl font-serif text-slate-900 mb-1">{formatCurrency(netEquityAt30)}</div>
                                <div className="text-[9px] text-emerald-600 font-bold">{t.projectionSuccess}</div>
                            </div>
                            <div className="bg-white border-l-2 border-[#c5a059] p-4 shadow-sm">
                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">{t.projectedRoi}</div>
                                <div className="text-2xl font-serif text-[#c5a059] mb-1">{roi.toFixed(1)}%</div>
                                <div className="text-[9px] text-[#c5a059] font-bold italic">{t.optimizedStructure}</div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {t.keyObjectives}
                        </h4>
                        <div className="space-y-4">
                            {[
                                { t: t.objAssetDiversification, d: t.objAssetDiversificationDesc },
                                { t: t.objLiquidityEnhancement, d: t.objLiquidityEnhancementDesc },
                                { t: t.objEstateMaximization, d: t.objEstateMaximizationDesc }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-bold mt-1 shrink-0">{i + 1}</div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{item.t}</div>
                                        <div className="text-[10px] text-slate-500 leading-relaxed">{item.d}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </PageContainer>

            {/* Page 3: Capital Allocation */}
            <PageContainer pageNum={3}>
                <SectionTitle title={t.capitalAllocation} subtitle={t.assetStructureSubtitle} />

                {/* Concept Diagram Section */}
                <div className="mt-2 bg-slate-50 border border-slate-100 rounded p-4">
                    <div className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4 text-center">
                        {t.strategyConcept}
                    </div>
                    <div className="min-h-[440px] flex items-center justify-center overflow-visible">
                        <FlowDiagram
                            budget={budget}
                            cash={cashReserve}
                            bond={netBondPrincipal}
                            equity={pfEquity}
                            loan={bankLoan}
                            premium={totalPremium}
                            labels={{
                                capital: t.capital,
                                liquidity: t.liquidity,
                                yieldFundNet: t.yieldFundNet,
                                policyEquityCaps: t.policyEquityCaps,
                                leverage: t.leverage,
                                totalExposure: t.totalExposure
                            }}
                            sourceType={fundSource}
                        />
                    </div>
                </div>

                {/* Funding Details */}

            </PageContainer>

            {/* Page 4: Performance Studio */}
            <PageContainer pageNum={4}>
                <SectionTitle title={t.performanceStudio} subtitle={t.financialProjectionSubtitle} />
                <div className="mt-6 border border-slate-100 p-8 rounded bg-white">
                    <div className="h-96 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={projectionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorEquityPdf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    label={{ value: t.year, position: 'insideBottom', offset: -10, fontSize: 10, fill: '#64748b' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickFormatter={(val) => `$${val / 1000000}M`}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />

                                <Area
                                    isAnimationActive={false}
                                    type="monotone"
                                    dataKey="netEquity"
                                    name={t.netEquity}
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#colorEquityPdf)"
                                    strokeWidth={2}
                                />
                                <Line
                                    isAnimationActive={false}
                                    type="monotone"
                                    dataKey="surrenderValue"
                                    name={t.policyValue}
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    dot={false}
                                />
                                <Line
                                    isAnimationActive={false}
                                    type="monotone"
                                    dataKey="loan"
                                    name={t.totalLoan}
                                    stroke="#f87171"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-4 gap-8 mt-10">
                        {[
                            { y: 10, v: dataY10.netEquity, g: dataY10.cumulativeNetGain },
                            { y: 20, v: dataY20.netEquity, g: dataY20.cumulativeNetGain },
                            { y: 30, v: dataY30.netEquity, g: dataY30.cumulativeNetGain },
                            { y: 30, v: dataY30.surrenderValue, g: 0, l: "Base Policy" },
                        ].map((m: any, i: number) => (
                            <div key={i} className="text-center">
                                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">{m.l || t.yearProjection.replace('{year}', m.y)}</div>
                                <div className="text-xl font-serif text-slate-900 border-b border-slate-100 pb-2 mb-2">{formatCurrency(m.v)}</div>
                                {m.g !== 0 && <div className="text-[9px] font-bold text-emerald-600 font-mono">+{formatCurrency(m.g)} {t.gain}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </PageContainer>

            {/* Page 5: Holdings Analysis */}
            <PageContainer pageNum={5}>
                <SectionTitle title={t.holdingsAnalysis} subtitle={t.assetStructureSubtitle} />
                <div className="grid grid-cols-2 gap-10 mt-10">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
                            <Shield className="w-3 h-3 text-[#c5a059]" /> {t.insuranceAia}
                        </h4>
                        <div className="bg-slate-50 rounded p-6 space-y-4 border border-slate-100 shadow-inner">
                            <div className="flex justify-between text-xs pb-2 border-b border-white">
                                <span className="text-slate-500">{t.totalPolicyValue}</span>
                                <span className="font-serif font-bold text-slate-900">{formatCurrency(totalPremium)}</span>
                            </div>
                            <div className="flex justify-between text-xs pb-2 border-b border-white">
                                <span className="text-slate-500">{t.premiumFinancingLoan}</span>
                                <span className="font-serif font-bold text-slate-900">{formatCurrency(bankLoan)}</span>
                            </div>
                            <div className="flex justify-between text-xs pb-2 border-b border-white">
                                <span className="text-slate-500">{t.interestCalcBasis}</span>
                                <span className="font-mono text-slate-900 font-bold">{t.hiborRate.replace('一個月 ', '')} + {spread}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">{t.financingLtv}</span>
                                <span className="font-serif font-bold text-slate-900">{leverageLTV}%</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
                            <Server className="w-3 h-3 text-blue-900" /> {t.fixedIncomeBond}
                        </h4>
                        <div className="bg-slate-50 rounded p-6 space-y-4 border border-slate-100 shadow-inner">
                            <div className="flex justify-between text-xs pb-2 border-b border-white">
                                <span className="text-slate-500">{t.fundPrincipal}</span>
                                <span className="font-serif font-bold text-slate-900">{formatCurrency(netBondPrincipal)}</span>
                            </div>
                            <div className="flex justify-between text-xs pb-2 border-b border-white">
                                <span className="text-slate-500">{t.targetAnnualYield}</span>
                                <span className="font-serif font-bold text-slate-900">{bondYield.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between text-xs pb-2 border-b border-white">
                                <span className="text-slate-500">{t.pledgeToBank}</span>
                                <span className="font-sans font-bold text-slate-900">{t.secureCollateral}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">{t.investmentStatus}</span>
                                <span className="text-emerald-600 font-bold uppercase italic">{t.activeManagement}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </PageContainer>

            {/* Page 6: Detailed Calculations */}
            <PageContainer pageNum={6}>
                <SectionTitle title={t.detailedCalculations} subtitle={t.milestoneBreakdownSubtitle} />
                <div className="mt-8 bg-white border border-slate-200 rounded-sm shadow-sm p-4">
                    <DetailedCalculationTable
                        dataY10={dataY10}
                        dataY15={dataY15}
                        dataY20={dataY20}
                        dataY30={dataY30}
                        lang={lang}
                    />
                </div>
                <div className="mt-4 text-[8px] text-slate-400 italic leading-relaxed">
                    {t.calculationDisclaimer}
                </div>
            </PageContainer>

            {/* Page 7: Ledger Statement */}
            <PageContainer pageNum={7}>
                <SectionTitle title={t.ledgerStatement} subtitle={t.cashFlowProjectionSubtitle} />
                <div className="mt-2">
                    <table className="w-full text-[6px] border-collapse leading-tight">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                <th className="py-1 px-1 text-left font-bold uppercase tracking-wider">{t.year}</th>
                                <th className="py-1 px-1 text-right font-bold uppercase tracking-wider text-emerald-700">{t.cumBondInt}</th>
                                <th className="py-1 px-1 text-right font-bold uppercase tracking-wider text-emerald-700">{t.cashReserve}</th>
                                <th className="py-1 px-1 text-right font-bold uppercase tracking-wider text-slate-700">{t.bondCapitalNet}</th>
                                <th className="py-1 px-1 text-right font-bold uppercase tracking-wider text-slate-700">{t.policyValue}</th>
                                <th className="py-1 px-1 text-right font-bold uppercase tracking-wider text-red-800">{t.totalLoan}</th>
                                {fundSource === 'mortgage' && <th className="py-1 px-1 text-right font-bold uppercase tracking-wider text-orange-800">{t.mortgageBalance}</th>}
                                <th className="py-1 px-1 text-right font-bold uppercase tracking-wider text-red-800">{t.cumLoanInt}</th>
                                {fundSource === 'mortgage' && <th className="py-1 px-1 text-right font-bold uppercase tracking-wider text-orange-600">{t.mtgCost}</th>}
                                <th className="py-1 px-1 text-right font-bold uppercase tracking-wider bg-slate-200 text-slate-900">{t.netEquity}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projectionData.map((row: any, i: number) => (
                                <tr key={row.year} className={`border-b border-slate-50 font-mono ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                    <td className="py-0.5 px-1 text-left font-bold text-slate-900">{row.year}</td>
                                    <td className="py-0.5 px-1 text-right text-emerald-600">+{formatCurrency(row.cumulativeBondInterest)}</td>
                                    <td className="py-0.5 px-1 text-right text-emerald-600">{formatCurrency(row.cashValue)}</td>
                                    <td className="py-0.5 px-1 text-right text-slate-600">{formatCurrency(row.bondPrincipal)}</td>
                                    <td className="py-0.5 px-1 text-right text-slate-600">{formatCurrency(row.surrenderValue)}</td>
                                    <td className="py-0.5 px-1 text-right text-red-700">{formatCurrency(row.loan)}</td>
                                    {fundSource === 'mortgage' && <td className="py-0.5 px-1 text-right text-orange-800">{formatCurrency(row.mortgageBalance)}</td>}
                                    <td className="py-0.5 px-1 text-right text-red-400">({formatCurrency(row.cumulativeInterest)})</td>
                                    {fundSource === 'mortgage' && <td className="py-0.5 px-1 text-right text-orange-600">({formatCurrency(row.annualMortgagePayment)})</td>}
                                    <td className={`py-0.5 px-1 text-right font-bold ${row.netEquity >= 0 ? 'text-slate-900' : 'text-red-600'} bg-slate-50`}>
                                        {row.formattedNetEquity}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-2 text-[6px] text-slate-400 italic text-right">
                        {t.ledgerDisclaimer}
                    </div>
                </div>
            </PageContainer>

            {/* Page 8: Risk Analysis */}
            <PageContainer pageNum={8}>
                <SectionTitle title={t.riskAnalysis} subtitle={t.stressTestingSubtitle} />
                <div className="mt-10 grid grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div className="bg-red-50 p-6 border-l-4 border-red-500 rounded">
                            <h5 className="text-[10px] font-bold uppercase text-red-900 mb-2">{t.interestRateSensitivity}</h5>
                            <p className="text-[10px] text-red-700 leading-relaxed">
                                {t.interestRateSensitivityDesc}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4">{t.riskMitigationStrategies}</h4>
                            <ul className="space-y-3 text-[10px] text-slate-600">

                                <li className="flex gap-2">
                                    <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
                                    <span>
                                        {(() => {
                                            const formatWan = (val: number, isHkd: boolean) => {
                                                if (lang === 'en') return formatCurrency(val);
                                                return `${(val / 10000).toFixed(1).replace('.0', '')}萬${isHkd ? '港元' : '美元'}`;
                                            };
                                            return t.riskMitigation2.replace('{bondAmount}', formatWan(netBondPrincipal, true));
                                        })()}
                                    </span>
                                </li>
                                <li className="flex gap-2">
                                    <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
                                    <span>
                                        {(() => {
                                            const formatWan = (val: number, isHkd: boolean) => {
                                                if (lang === 'en') return formatCurrency(val);
                                                return `${(val / 10000).toFixed(1).replace('.0', '')}萬${isHkd ? '港元' : '美元'}`;
                                            };
                                            return t.riskMitigation3.replace('{reserveAmount}', formatWan(cashReserve, false));
                                        })()}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded flex flex-col items-center justify-center border border-slate-100 w-full">
                        <div className="text-3xl font-serif text-slate-400 mb-4 font-bold opacity-20 uppercase tracking-[0.5em]">
                            {t.stressMap} - {lang === 'en' ? 'Year' : '第'} {sensitivityYear} {lang === 'en' ? '' : '年'}
                        </div>
                        <div className="w-full">
                            <StaticHeatmap
                                xLabels={sensitivityData?.xLabels || []}
                                yLabels={sensitivityData?.yLabels || []}
                                data={sensitivityData?.data || []}
                                lang={lang}
                            />
                        </div>
                        <div className="mt-4 text-[9px] text-slate-400 uppercase tracking-widest font-bold">{t.marketRiskHeatmap}</div>
                    </div>
                </div>
            </PageContainer>

            {/* Page 9: Disclaimers */}
            <PageContainer pageNum={9}>
                <SectionTitle title={t.disclaimers} subtitle={t.termsConditionsSubtitle} />
                <div className="mt-10 overflow-y-auto max-h-[130mm] pr-4 space-y-6 text-[9px] text-slate-500 leading-relaxed text-justify">
                    <p>{t.disclaimer1}</p>
                    <p>{t.disclaimer2}</p>
                    <p>{t.disclaimer3}</p>
                    <p>{t.disclaimer4}</p>
                    <div className="pt-10 border-t border-slate-100 mt-10">
                        <div className="flex justify-between">
                            <div className="w-48 border-b border-slate-400 h-10"></div>
                            <div className="w-48 border-b border-slate-400 h-10"></div>
                        </div>
                        <div className="flex justify-between mt-2 font-bold uppercase tracking-widest text-[8px] text-slate-400">
                            <span>{t.clientSignature}</span>
                            <span>{t.advisorSignature}</span>
                        </div>
                    </div>
                </div>
            </PageContainer>


        </>
    );
};
