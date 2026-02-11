import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  Legend
} from 'recharts';
import {
  Settings,
  Shield,
  TrendingUp,
  DollarSign,
  PieChart,
  Lock,
  Unlock,
  Download,
  X,
  LayoutDashboard,
  Briefcase,
  Globe,
  LogOut,
  User,
  ChevronRight,
  Bell,
  Search,
  Menu,
  PlusCircle,
  MinusCircle,
  Languages,
  Landmark,
  Wallet,
  FileText,
  Calculator,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Activity,
  Database,
  Server,
  Loader2,
  FileCheck,
  RefreshCw,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  Home,
  Play,
  Check,
  Printer
} from 'lucide-react';

const PrintStyles = () => (
  <style>{`
    @media print {
      @page {
        size: A4 landscape;
        margin: 0;
      }
      body {
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: block !important;
      }
      #root {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #root > aside,
      #root > main > header,
      #root > main > .p-4,
      #root > main > .p-6,
      #root > main > .p-8,
      #root > main > .p-10,
      .no-print {
        display: none !important;
      }
      .pdf-only {
        display: block !important;
        width: 297mm !important;
        height: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
        position: relative !important;
        visibility: visible !important;
        z-index: 9999 !important;
        box-sizing: border-box !important;
      }
      .page-break {
        page-break-after: always !important;
        break-after: page !important;
      }
    }
    .pdf-only {
      display: none !important;
      visibility: hidden;
    }
    .force-preview .pdf-only {
      display: block !important;
      visibility: visible !important;
      margin-bottom: 3rem !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
      position: relative !important;
    }
  `}</style>
);

const DetailedCalculationTable = ({ dataY10, dataY15, dataY20, dataY30, lang }: any) => {
  if (!dataY10 || !dataY15 || !dataY20 || !dataY30) return null;

  const isZh = lang !== 'en';
  const exchangeRate = 7.8;

  const years = [dataY10, dataY15, dataY20, dataY30];

  const rowStyle = "grid grid-cols-5 border-b border-slate-100 py-2 text-[10px]";
  const headerStyle = "grid grid-cols-5 border-b border-slate-900 py-2 text-[10px] font-bold uppercase tracking-wider bg-slate-50";
  const sectionHeaderStyle = "bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest mt-4";

  const f = (val: number, currency: 'USD' | 'HKD') => {
    const amount = currency === 'HKD' ? val * exchangeRate : val;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const CalculationRow = ({ label, labelZh, dataKey, isNeg = false }: any) => (
    <div className={rowStyle}>
      <div className="pl-3 font-medium text-slate-700">{isZh ? labelZh : label}</div>
      {years.map((y, i) => (
        <div key={i} className={`text-right pr-4 font-mono ${isNeg ? 'text-red-600' : 'text-slate-900'}`}>
          {isNeg ? `(${f(y[dataKey], 'USD')})` : f(y[dataKey], 'USD')}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      <div className={headerStyle}>
        <div className="pl-3">{isZh ? '項目' : 'ITEM'}</div>
        <div className="text-right pr-4">Year 10 (USD)</div>
        <div className="text-right pr-4">Year 15 (USD)</div>
        <div className="text-right pr-4">Year 20 (USD)</div>
        <div className="text-right pr-4">Year 30 (USD)</div>
      </div>

      <div className={sectionHeaderStyle}>{isZh ? '傳承給下一代 / 取消計劃 (淨資産)' : 'NET EQUITY / INHERITANCE'}</div>
      <CalculationRow label="Policy Surrender Value (AIA)" labelZh="退保價值：AIA友邦保單" dataKey="surrenderValue" />
      <CalculationRow label="Bond Principal (Net)" labelZh="銀行資產" dataKey="bondPrincipal" />
      <CalculationRow label="Reserve Cash" labelZh="備用現金" dataKey="cashValue" />
      <CalculationRow label="(Less) Policy Loan" labelZh="減：保單貸款" dataKey="loan" isNeg />
      <CalculationRow label="(Less) Mortgage Balance" labelZh="減：按揭餘額" dataKey="mortgageBalance" isNeg />

      <div className={sectionHeaderStyle}>{isZh ? '經營方案現金流 (累計收益)' : 'CUMULATIVE CASH FLOW'}</div>
      <CalculationRow label="Cumulative Bond Interest" labelZh="加：債券基金利息 (累計)" dataKey="cumulativeBondInterest" />
      <CalculationRow label="(Less) Cumulative Mortgage Payments" labelZh="減：按揭供款 (累計)" dataKey="cumulativeMortgageCost" isNeg />
      <CalculationRow label="(Less) Cumulative Loan Interests" labelZh="減：保單貸款利息 (累計)" dataKey="cumulativeInterest" isNeg />

      <div className="grid grid-cols-5 bg-slate-100 py-3 mt-4 border-y border-slate-900 font-bold">
        <div className="pl-3 text-xs">{isZh ? '預計淨資産 (USD)' : 'NET EQUITY (USD)'}</div>
        {years.map((y, i) => (
          <div key={i} className="text-right pr-4 text-xs font-mono">
            {f(y ? y.netEquity : 0, 'USD')}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 bg-slate-100/50 py-3 border-b border-slate-900 font-bold">
        <div className="pl-3 text-xs font-serif text-[#c5a059]">{isZh ? '預計淨資産 (HKD)' : 'NET EQUITY (HKD)'}</div>
        {years.map((y, i) => (
          <div key={i} className="text-right pr-4 text-xs font-mono text-[#c5a059]">
            {f(y ? y.netEquity : 0, 'HKD')}
          </div>
        ))}
      </div>
    </div>
  );
};

const PDFProposal = ({ projectionData, lang, budget, totalPremium, bankLoan, roi, netEquityAt30, propertyValue, unlockedCash, hibor, currentMtgRate, cashReserve, netBondPrincipal, pfEquity, fundSource, clientName, representativeName }: any) => {
  if (!projectionData || projectionData.length < 31) return null;
  const isZh = lang !== 'en';

  const t = TRANSLATIONS[lang];

  const PageContainer = ({ children, pageNum }: any) => (
    <div className="pdf-only page-break bg-white w-[297mm] h-[210mm] relative p-12 overflow-hidden flex flex-col font-serif">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="text-xl font-serif tracking-tighter text-slate-900 border-r border-slate-200 pr-3">PRIVATE Wealth</div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none">Financing<br />Strategy</div>
        </div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Page {pageNum} of 8</div>
      </div>
      <div className="flex-1">
        {children}
      </div>
      <div className="mt-6 flex justify-between items-end border-t border-slate-100 pt-4 text-[9px] text-slate-300">
        <div>STRICTLY CONFIDENTIAL • FOR PROFESSIONAL ADVISOR USE ONLY</div>
        <div>{new Date().toLocaleDateString()} • REF: PF-2024-8921</div>
      </div>
    </div>
  );

  const SectionTitle = ({ title, subtitle }: any) => (
    <div className="mb-8">
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
      <div className="pdf-only page-break bg-slate-900 w-[297mm] h-[210mm] relative p-16 flex flex-col justify-center overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#c5a059] opacity-10 -skew-x-12 translate-x-20"></div>
        <div className="relative border-l-4 border-[#c5a059] pl-10">
          <div className="text-white text-lg font-serif tracking-[0.3em] uppercase mb-4 opacity-60">Wealth Management</div>
          <h1 className="text-white text-7xl font-serif leading-tight mb-8">
            Premium Financing<br />
            <span className="text-[#c5a059]">Strategic Proposal</span>
          </h1>
          <div className="w-32 h-1 bg-[#c5a059] mb-12"></div>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#c5a059] font-bold mb-1">Prepared For</div>
              <div className="text-2xl text-white font-serif opacity-90">{clientName}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#c5a059] font-bold mb-1">Presented By</div>
              <div className="text-xl text-white font-serif opacity-90 italic">{representativeName}</div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-16 right-16 text-right">
          <div className="text-4xl text-white font-serif opacity-20 mb-2 italic">Strictly Private</div>
          <div className="text-xs text-white/40 font-mono tracking-widest uppercase">{new Date().getFullYear()} COLLECTION</div>
        </div>
      </div>

      {/* Page 2: Executive Summary */}
      <PageContainer pageNum={2}>
        <SectionTitle title={t.executiveSummary} subtitle="Strategic Overview & Objectives" />
        <div className="grid grid-cols-2 gap-12 mt-10">
          <div className="space-y-8">
            <div className="bg-slate-50 p-8 border border-slate-100 italic text-slate-600 leading-relaxed text-sm">
              "This proposal outlines a tax-efficient wealth enhancement strategy utilizing high-quality fixed income assets and universal life insurance. By leveraging existing property equity, we aim to augment the total estate value while maintaining a neutral net-carry position."
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white border-l-2 border-slate-900 p-4 shadow-sm">
                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Target Net Equity (Y30)</div>
                <div className="text-2xl font-serif text-slate-900 mb-1">{formatCurrency(netEquityAt30)}</div>
                <div className="text-[9px] text-emerald-600 font-bold">PROJECTION SUCCESS</div>
              </div>
              <div className="bg-white border-l-2 border-[#c5a059] p-4 shadow-sm">
                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Projected ROI (Annual)</div>
                <div className="text-2xl font-serif text-[#c5a059] mb-1">{roi.toFixed(1)}%</div>
                <div className="text-[9px] text-[#c5a059] font-bold italic">OPTIMIZED STRUCTURE</div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Key Objectives
            </h4>
            <div className="space-y-4">
              {[
                { t: "Asset Diversification", d: "Reallocating property equity into liquid financial instruments and insurance protection." },
                { t: "Liquidity Enhancement", d: "Maintaining accessible cash reserves while keeping assets fully productive." },
                { t: "Estate Maximization", d: "Structuring for efficient inter-generational wealth transfer (Inheritance)." }
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
        <SectionTitle title={t.capitalAllocation} subtitle="Asset Structure & Funding Source" />

        {/* Concept Diagram Section */}
        <div className="mt-6 bg-slate-50 border border-slate-100 rounded p-6">
          <div className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4 text-center">
            {t.strategyConcept}
          </div>
          <div className="min-h-[400px] flex items-center justify-center">
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
        <SectionTitle title={t.performanceStudio} subtitle="30-Year Financial Projection" />
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
                  type="monotone"
                  dataKey="netEquity"
                  name={t.netEquity}
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorEquityPdf)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="surrenderValue"
                  name={t.policyValue}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
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
            ].map((m, i) => (
              <div key={i} className="text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">{m.l || `Year ${m.y} Projection`}</div>
                <div className="text-xl font-serif text-slate-900 border-b border-slate-100 pb-2 mb-2">{formatCurrency(m.v)}</div>
                {m.g !== 0 && <div className="text-[9px] font-bold text-emerald-600 font-mono">+{formatCurrency(m.g)} Gain</div>}
              </div>
            ))}
          </div>
        </div>
      </PageContainer>

      {/* Page 5: Holdings Analysis */}
      <PageContainer pageNum={5}>
        <SectionTitle title={t.holdingsAnalysis} subtitle="Asset Details & Financing Terms" />
        <div className="grid grid-cols-2 gap-10 mt-10">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
              <Shield className="w-3 h-3 text-[#c5a059]" /> Insurance (AIA Global)
            </h4>
            <div className="bg-slate-50 rounded p-6 space-y-4 border border-slate-100 shadow-inner">
              <div className="flex justify-between text-xs pb-2 border-b border-white">
                <span className="text-slate-500">Total Premium</span>
                <span className="font-serif font-bold text-slate-900">{formatCurrency(totalPremium)}</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white">
                <span className="text-slate-500">Premium Financing (Loan)</span>
                <span className="font-serif font-bold text-slate-900">{formatCurrency(bankLoan)}</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white">
                <span className="text-slate-500">Interest Calculation Basis</span>
                <span className="font-mono text-slate-900 font-bold">1M HIBOR + 1.25%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Financing LTV</span>
                <span className="font-serif font-bold text-slate-900">90% of Day-1 CV</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
              <Server className="w-3 h-3 text-blue-900" /> Fixed Income (Bond Fund)
            </h4>
            <div className="bg-slate-50 rounded p-6 space-y-4 border border-slate-100 shadow-inner">
              <div className="flex justify-between text-xs pb-2 border-b border-white">
                <span className="text-slate-500">Fund Principal (Market Value)</span>
                <span className="font-serif font-bold text-slate-900">$2,000,000</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white">
                <span className="text-slate-500">Target Annual Yield</span>
                <span className="font-serif font-bold text-slate-900">8.50%</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white">
                <span className="text-slate-500">Pledge to Bank</span>
                <span className="font-sans font-bold text-slate-900">100% Secure Collateral</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Investment Status</span>
                <span className="text-emerald-600 font-bold uppercase italic">Active Management</span>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Page 6: Detailed Calculations */}
      <PageContainer pageNum={6}>
        <SectionTitle title={t.detailedCalculations} subtitle="Milestone Year Breakdowns (USD/HKD)" />
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
          Disclaimer: Calculations above assume constant interest rates and fund yields as specified in the system parameters. Fluctuations in HIBOR or Prime Rate will impact the net carry and cumulative gain.
        </div>
      </PageContainer>

      {/* Page 7: Ledger Statement */}
      <PageContainer pageNum={7}>
        <SectionTitle title={t.ledgerStatement} subtitle="30-Year Cash Flow & Equity Projection" />
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
            * Values in USD unless otherwise specified. Projections assume constant rates.
          </div>
        </div>
      </PageContainer>

      {/* Page 8: Risk Analysis */}
      <PageContainer pageNum={8}>
        <SectionTitle title={t.riskAnalysis} subtitle="Stress Testing & Sensitivities" />
        <div className="mt-10 grid grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="bg-red-50 p-6 border-l-4 border-red-500 rounded">
              <h5 className="text-[10px] font-bold uppercase text-red-900 mb-2">Interest Rate Sensitivity</h5>
              <p className="text-[10px] text-red-700 leading-relaxed">
                A 2% increase in HIBOR would reduce the annual net carry by approximately $40,000. Break-even HIBOR for this strategy is 7.25%.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4">Risk Mitigation Strategies</h4>
              <ul className="space-y-3 text-[10px] text-slate-600">
                <li className="flex gap-2">
                  <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
                  <span>Interest Cap: Mortgage capping mechanism protects against extreme rate spikes.</span>
                </li>
                <li className="flex gap-2">
                  <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
                  <span>Collateral Buffer: $2M Bond fund provides significant equity cushion for the loan.</span>
                </li>
                <li className="flex gap-2">
                  <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
                  <span>Liquidity Reserve: $138k initial cash reserve held for unforeseen margin calls.</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-slate-50 p-8 rounded flex flex-col items-center justify-center border border-slate-100">
            <div className="text-3xl font-serif text-slate-400 mb-4 font-bold opacity-20 uppercase tracking-[0.5em]">STRESS MAP</div>
            <div className="w-full grid grid-cols-5 grid-rows-5 gap-1 shrink-0">
              {[...Array(25)].map((_, i) => (
                <div key={i} className={`h-8 rounded-sm ${i < 10 ? 'bg-emerald-200' : i < 18 ? 'bg-orange-200' : 'bg-red-200'} opacity-60`}></div>
              ))}
            </div>
            <div className="mt-4 text-[9px] text-slate-400 uppercase tracking-widest font-bold">Market Risk Heatmap (Simulated)</div>
          </div>
        </div>
      </PageContainer>

      {/* Page 9: Disclaimers */}
      <PageContainer pageNum={9}>
        <SectionTitle title={t.disclaimers} subtitle="Terms, Conditions & Regulatory Notices" />
        <div className="mt-10 overflow-y-auto max-h-[130mm] pr-4 space-y-6 text-[9px] text-slate-500 leading-relaxed text-justify">
          <p>
            This proposal is for illustrative purposes only and does not constitute an offer, solicitation or recommendation to purchase any insurance product or financial instrument. The information contained herein is based on current market conditions and assumptions which are subject to change without notice.
          </p>
          <p>
            Investment involved risks. The price of units and the income from them may go down as well as up and any past performance figures shown are not indicative of future performance. You should not invest unless the intermediary who sells it to you has explained to you that the product is suitable for you having regard to your financial situation, investment experience and investment objectives.
          </p>
          <p>
            Premium financing involves borrowing money to pay for life insurance premiums. This strategy carries risks including interest rate risk (should the cost of borrowing exceed the policy returns), margin call risk (should the collateral value fall below the bank's requirements), and policy surrender risk. Guaranteed and non-guaranteed values of the insurance policy are as illustrated by AIA (Hong Kong) and are subject to the carrier's performance and credit risk.
          </p>
          <p>
            In the event of a cross-border solicitation (specifically for Mainland China residents), please note that this proposal is for informational use only and any transaction must be completed in accordance with the regulatory requirements of Hong Kong and the PRC. No solicitation of insurance business is intended within the mainland territory.
          </p>
          <div className="pt-10 border-t border-slate-100 mt-10">
            <div className="flex justify-between">
              <div className="w-48 border-b border-slate-400 h-10"></div>
              <div className="w-48 border-b border-slate-400 h-10"></div>
            </div>
            <div className="flex justify-between mt-2 font-bold uppercase tracking-widest text-[8px] text-slate-400">
              <span>Client Signature</span>
              <span>Advisor Signature</span>
            </div>
          </div>
        </div>
      </PageContainer>


    </>
  );
};

const BASE_FACTORS: { [key: number]: number } = {
  0: 0.8000, 1: 0.8000, 2: 0.8211, 3: 0.8442, 4: 0.8734, 5: 1.0066,
  6: 1.0838, 7: 1.1862, 8: 1.2407, 9: 1.2992, 10: 1.3879,
  11: 1.4427, 12: 1.5056, 13: 1.5886, 14: 1.6558, 15: 1.7472,
  16: 1.8367, 17: 1.9223, 18: 2.0262, 19: 2.1262, 20: 2.2469,
  21: 2.3459, 22: 2.4530, 23: 2.5764, 24: 2.7080, 25: 2.8379,
  26: 2.9755, 27: 3.1255, 28: 3.2799, 29: 3.4488, 30: 3.6222
};

// Helper to generate guaranteed factors (lower than total)
const generateGuaranteed = (factors: { [key: number]: number }) => {
  const guaranteed: { [key: number]: number } = {};
  Object.keys(factors).forEach(key => {
    const k = Number(key);
    // Guaranteed is ~80% of total at year 0, rising to ~70% at year 30 (just a mock curve)
    guaranteed[k] = factors[k] * (0.85 - (k * 0.005));
  });
  return guaranteed;
};

const GUARANTEED_FACTORS = generateGuaranteed(BASE_FACTORS);

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

const formatPercent = (val: number) => `${val.toFixed(2)}%`;

// --- Translations ---

const TRANSLATIONS = {
  en: {
    privateWealth: "PRIVATE",
    wealthManagement: "Wealth Management",
    clientOverview: "Client Overview",
    allocationStructure: "Allocation Structure",
    returnStudio: "Return Studio",
    holdingsAnalysis: "Holdings Analysis",
    marketRisk: "Market Risk",
    bankControls: "Bank Controls",
    systemConfig: "System Configuration",
    rm: "RM",
    seniorBanker: "Senior Banker",
    financingProposal: "Financing Proposal",
    preparedFor: "Prepared for:",
    estateOf: "Estate of Mr. H.N.W.",
    hiborRate: "1M HIBOR Rate",
    capitalAllocation: "Capital Allocation",
    clientAssets: "Client Assets",
    totalBudget: "Total Budget",
    cashReserve: "Cash Reserve",
    bondFund: "Bond Fund",
    bondYield: "Bond Yield (%)",
    policyEquity: "Policy Equity",
    bankParams: "Bank Parameters",
    lendingTerms: "Lending Terms",
    spread: "Spread (%)",
    intCap: "Int. Cap (%)",
    leverageLtv: "Leverage (LTV)",
    handlingFee: "Fund Handling Fee (%)",
    oneOffDeduction: "One-off Deduction",
    totalPolicyValue: "Total Policy Value",
    day1Exposure: "Day 1 Gross Exposure",
    lendingFacility: "Lending Facility",
    effectiveRate: "Effective Rate",
    netEquityY30: "Net Equity (Y30)",
    roi: "ROI",
    monthlyCashflow: "Monthly Cashflow",
    incomeVsCost: "Income vs Cost Analysis (Year 1)",
    bondIncome: "Bond Income",
    loanInterest: "Loan Interest",
    netMonthlyCashflow: "Net Monthly Cashflow",
    structureVis: "Structure Visualization",
    fundFlow: "Fund Flow",
    capital: "CAPITAL",
    liquidity: "LIQUID CASH",
    yieldFundNet: "YIELD FUND (NET)",
    policyEquityCaps: "INITIAL PREMIUM",
    leverage: "BANK LOAN",
    totalExposure: "AIA CAPITAL PRESERVED POLICY",
    projectedPerf: "Projected Performance",
    horizon30y: "30-Year Horizon",
    ledgerStatement: "Ledger Statement",
    fiscalYearBreakdown: "Fiscal Year Breakdown",
    exportData: "Export Data",
    year: "Year",
    cumBondInt: "Cum. Bond Int.",
    bondCapitalNet: "Bond Capital (Net)",
    bondPrincipalNet: "Bond Principal (Net)",
    policyValue: "Policy Value",
    policy: "Policy",
    totalLoan: "Total Loan",
    loan: "Loan",
    cumLoanInt: "Cum. Loan Int.",
    cumInterest: "Cum. Interest",
    netEquity: "Net Equity",
    cash: "Cash",
    bond: "Bond (Net)",
    bondInt: "Bond Int.",
    income: "Income",
    intCost: "Int. Cost",
    ref: "Ref: PF-2024-001",
    analysisYear: "Analysis Year",
    openingEquity: "Opening Equity",
    closingEquity: "Closing Equity",
    netGain: "Net Gain",
    annualRoC: "Annual RoC",
    attributionAnalysis: "Return Attribution Analysis",
    policyGrowth: "Policy Growth",
    totalInflow: "Total Inflow",
    costOfFunding: "Cost of Funding",
    netPerformance: "Net Performance",
    insurancePlan: "Insurance Plan",
    stressTest: "Stress Test",
    simulatedHibor: "Simulated HIBOR",
    bondPriceDrop: "Bond Price Drop",
    showGuaranteed: "Show Guaranteed Cash Value Only",
    breakEvenHibor: "Break-even HIBOR",
    lowestNetEquity: "Lowest Net Equity",
    ltvMonitor: "LTV Monitor (Margin Call Risk)",
    netWorthComparison: "Net Worth Comparison",
    sensitivityAnalysis: "Sensitivity Heatmap",
    marginCallThreshold: "Margin Call Threshold (95%)",
    baseline: "Baseline",
    stressed: "Stressed",
    interpretation: "Interpretation",
    heatmapLegend: "The heatmap displays the projected Net Equity at the selected analysis year. The X-axis represents the HIBOR rate (Cost of Borrowing), and the Y-axis represents the Bond Yield (Asset Return). Green cells indicate a surplus (Profit), while red cells indicate a shortfall (Loss).",
    dataFeeds: "Data Feeds",
    riskLimits: "Risk Limits",
    compliance: "Compliance",
    providerStatus: "Provider Status",
    globalMinSpread: "Global Min. Spread",
    globalMaxLtv: "Global Max LTV",
    regulatoryMode: "Regulatory Mode",
    autoHedging: "Auto-Hedging Protocols",
    globalDisclaimer: "IMPORTANT: This material is provided for informational purposes only and does not constitute an offer or solicitation to sell any financial product or service. Investment involves risk, including the possible loss of principal. Premium financing involves leverage, which can magnify both gains and losses. Interest rates are subject to change and may increase the cost of borrowing. Past performance is not indicative of future results. Please consult your professional advisors before making any investment decision.",
    sourceUrl: "Source URL",
    lastUpdated: "Last Updated",
    cachingStatus: "Caching Status",
    notifications: "Notifications",
    markRead: "Mark Read",
    noNotifications: "No new notifications",
    marketDataUpdate: "Market Data Update",
    systemReady: "System Ready",
    complianceAlert: "Compliance Alert",
    // Mortgage
    source: "Source",
    cashSource: "Cash",
    mortgageRefi: "Mortgage Refi",
    propVal: "Property Value",
    existingLoan: "Existing Mortgage",
    refiLtv: "Refi LTV (%)",
    unlockedCash: "Cash Out Amount",
    mortgageRate: "Mortgage Rate (%)",
    tenor: "Tenor (Years)",
    applyCapital: "Use this Capital",
    monthlyMtg: "Monthly Mtg.",
    mtgCost: "Mortgage Cost",
    unlockedCapital: "Unlocked Capital",
    mortgageBalance: "Mortgage Balance",
    primeRate: "Prime Rate (P)",
    hSpread: "H + Spread (%)",
    pCap: "Cap (P - %)",
    effectiveMtgRate: "Effective Rate",
    mtgRepaid: "Mtg Repaid (Principal)",
    // Return Studio Specific
    cumulativePerfPattern: "Cumulative Performance to Year {year}",
    yieldLabel: "Yield",
    organicGrowth: "Organic Growth",
    pfInterest: "Premium Financing Interest",
    netEquityDesc: "Total Assets - Liabilities",
    chartStart: "Start",
    chartBond: "Bond",
    chartPolicy: "Policy",
    chartInterest: "Interest",
    chartEnd: "End",
    equityWalkFooter: "*Equity Walk: Start Equity + Income + Growth - Interest + Debt Repaid = End Equity",
    projectedMinimum: "Projected Minimum",
    netCarryNeutral: "Net Carry Neutral",
    netEquityAtYear: "Net Equity @ Year {year}",
    pdfPreview: "Report Preview",
    strategyConcept: "Strategy Concept Diagram",
    executiveSummary: "Executive Summary",
    performanceStudio: "Performance Studio",
    detailedCalculations: "Detailed Calculations",
    riskAnalysis: "Risk Analysis",
    disclaimers: "Important Disclaimers"
  },
  zh_hk: {
    // ... existing translations ...
    privateWealth: "私人",
    wealthManagement: "財富管理",
    clientOverview: "客戶概覽",
    allocationStructure: "資產配置結構",
    returnStudio: "回報工作室",
    holdingsAnalysis: "持倉分析",
    marketRisk: "市場風險",
    bankControls: "銀行控制",
    systemConfig: "系統配置",
    rm: "客戶經理",
    seniorBanker: "資深銀行家",
    financingProposal: "融資提案",
    preparedFor: "客戶:",
    estateOf: "H.N.W. 先生家族信託",
    hiborRate: "一個月 HIBOR",
    capitalAllocation: "資本配置",
    clientAssets: "客戶資產",
    totalBudget: "總預算",
    cashReserve: "現金儲備",
    bondFund: "債券基金",
    bondYield: "債券收益率 (%)",
    policyEquity: "保單首期",
    bankParams: "銀行參數",
    lendingTerms: "貸款條款",
    spread: "利差 (%)",
    intCap: "利率上限 (%)",
    leverageLtv: "槓桿 (LTV)",
    handlingFee: "基金手續費 (%)",
    oneOffDeduction: "一次性扣除",
    totalPolicyValue: "保單總值",
    day1Exposure: "首日價值",
    lendingFacility: "貸款額度",
    effectiveRate: "實際利率",
    netEquityY30: "淨權益 (第30年)",
    roi: "投資回報率",
    monthlyCashflow: "現金流分析",
    incomeVsCost: "",
    bondIncome: "債券收入",
    loanInterest: "貸款利息",
    netMonthlyCashflow: "淨月度現金流",
    structureVis: "方案概念圖",
    fundFlow: "資金流向",
    capital: "資本",
    liquidity: "流動資金",
    yieldFundNet: "收益基金 (淨額)",
    policyEquityCaps: "保單首期",
    leverage: "銀行貸款",
    totalExposure: "AIA 保本大額保單",
    projectedPerf: "預期表現",
    horizon30y: "30年展望",
    ledgerStatement: "分類帳表",
    fiscalYearBreakdown: "財政年度細分",
    exportData: "導出數據",
    year: "年份",
    cumBondInt: "累計債券利息",
    bondCapitalNet: "債券本金 (淨額)",
    bondPrincipalNet: "債券本金 (淨額)",
    policyValue: "保單價值",
    policy: "保單",
    totalLoan: "總貸款",
    loan: "貸款",
    cumLoanInt: "累計貸款利息",
    cumInterest: "累計利息",
    netEquity: "淨權益",
    cash: "現金",
    bond: "債券 (淨額)",
    bondInt: "債券利息",
    income: "收入",
    intCost: "利息成本",
    ref: "編號: PF-2024-001",
    analysisYear: "分析年份",
    openingEquity: "期初權益",
    closingEquity: "期末權益",
    netGain: "淨收益",
    annualRoC: "年度資本回報率",

    policyGrowth: "保單增長",
    totalInflow: "總流入",
    costOfFunding: "融資成本",
    netPerformance: "淨表現",
    insurancePlan: "保險計劃",
    stressTest: "壓力測試",
    simulatedHibor: "模擬 HIBOR",
    bondPriceDrop: "債券價格下跌",
    showGuaranteed: "僅顯示保證現金價值",
    breakEvenHibor: "收支平衡 HIBOR",
    lowestNetEquity: "最低淨權益",
    ltvMonitor: "LTV 監控 (追收保證金風險)",
    netWorthComparison: "淨資產比較",
    sensitivityAnalysis: "敏感度熱圖",
    marginCallThreshold: "追收保證金門檻 (95%)",
    baseline: "基準",
    stressed: "壓力情境",
    interpretation: "解讀",
    heatmapLegend: "熱圖顯示選定分析年份的預計淨權益。X軸代表HIBOR利率（借貸成本），Y軸代表債券收益率（資產回報）。綠色單元格表示盈餘（利潤），紅色單元格表示虧空（虧損）。",
    dataFeeds: "數據源",
    riskLimits: "風險限額",
    compliance: "合規",
    providerStatus: "供應商狀態",
    globalMinSpread: "全球最低利差",
    globalMaxLtv: "全球最高 LTV",
    regulatoryMode: "監管模式",
    autoHedging: "自動對沖協議",
    globalDisclaimer: "重要提示：本資料僅供參考，並不構成銷售任何金融產品或服務的要約或招攬。投資涉及風險，包括可能損失本金。保費融資涉及槓桿，這可能會放大收益和損失。利率可能會變動並增加借貸成本。過往表現並不預示未來結果。在作出任何投資決定前，請諮詢您的專業顧問。",
    sourceUrl: "來源網址",
    lastUpdated: "最後更新",
    cachingStatus: "緩存狀態",
    notifications: "通知",
    markRead: "標記為已讀",
    noNotifications: "沒有新通知",
    marketDataUpdate: "市場數據更新",
    systemReady: "系統就緒",
    complianceAlert: "合規警報",
    source: "資金來源",
    cashSource: "現金",
    mortgageRefi: "物業加按",
    propVal: "物業估值",
    existingLoan: "現有按揭",
    refiLtv: "加按 LTV (%)",
    unlockedCash: "套現金額",
    mortgageRate: "按揭利率 (%)",
    tenor: "年期 (年)",
    applyCapital: "使用此資金",
    monthlyMtg: "月供款",
    mtgCost: "按揭成本",
    unlockedCapital: "套現資金",
    mortgageBalance: "按揭餘額",
    primeRate: "最優惠利率 (P)",
    hSpread: "H + 利差 (%)",
    pCap: "封頂息率 (P - %)",
    effectiveMtgRate: "實際按揭利率",
    mtgRepaid: "已償還貸款",
    // Return Studio Specific
    cumulativePerfPattern: "第 {year} 年的累計回報",
    yieldLabel: "收益率",
    organicGrowth: "有機成長",
    pfInterest: "保單融資利息成本",
    attributionAnalysis: "息差概念",
    netEquityDesc: "總資產 － 總貸款",
    chartStart: "起始資金",
    chartBond: "債券收入",
    chartPolicy: "保單增長",
    chartInterest: "保融利息成本",
    chartEnd: "回報",
    equityWalkFooter: "圖表導覽：起始資金＋債券收入＋保單增長－保融利息成本＋已償還貸款＝回報",
    projectedMinimum: "預計最差情況",
    netCarryNeutral: "息差平衡",
    netEquityAtYear: "第 {year} 年淨資產",
    pdfPreview: "報告預覽",
    strategyConcept: "方案概念圖",
    executiveSummary: "執行摘要",
    performanceStudio: "表現分析",
    detailedCalculations: "詳細計算",
    riskAnalysis: "風險分析",
    disclaimers: "免責聲明"
  },
  zh_cn: {
    // ... existing translations ...
    privateWealth: "私人",
    wealthManagement: "财富管理",
    clientOverview: "客户概览",
    allocationStructure: "资产配置结构",
    returnStudio: "回报工作室",
    holdingsAnalysis: "持仓分析",
    marketRisk: "市场风险",
    bankControls: "银行控制",
    systemConfig: "系统配置",
    rm: "客户经理",
    seniorBanker: "资深银行家",
    financingProposal: "融资提案",
    preparedFor: "客户:",
    estateOf: "H.N.W. 先生家族信托",
    hiborRate: "一个月 HIBOR",
    capitalAllocation: "资本配置",
    clientAssets: "客户资产",
    totalBudget: "总预算",
    cashReserve: "现金储备",
    bondFund: "债券基金",
    bondYield: "债券收益率 (%)",
    policyEquity: "保单首期",
    bankParams: "银行参数",
    lendingTerms: "贷款条款",
    spread: "利差 (%)",
    intCap: "利率上限 (%)",
    leverageLtv: "杠杆 (LTV)",
    handlingFee: "基金手续费 (%)",
    oneOffDeduction: "一次性扣除",
    totalPolicyValue: "保单总值",
    day1Exposure: "首日价值",
    lendingFacility: "贷款额度",
    effectiveRate: "实际利率",
    netEquityY30: "净权益 (第30年)",
    roi: "投资回报率",
    monthlyCashflow: "现金流分析",
    incomeVsCost: "",
    bondIncome: "债券收入",
    loanInterest: "贷款利息",
    netMonthlyCashflow: "净月度现金流",
    structureVis: "方案概念图",
    fundFlow: "资金流向",
    capital: "资本",
    liquidity: "流动资金",
    yieldFundNet: "收益基金 (净额)",
    policyEquityCaps: "保单首期",
    leverage: "银行贷款",
    totalExposure: "AIA 保本大额保单",
    projectedPerf: "预期表现",
    horizon30y: "30年展望",
    ledgerStatement: "分类账表",
    fiscalYearBreakdown: "财政年度细分",
    exportData: "导出数据",
    year: "年份",
    cumBondInt: "累计债券利息",
    bondCapitalNet: "债券本金 (净额)",
    bondPrincipalNet: "债券本金 (净额)",
    policyValue: "保单价值",
    policy: "保单",
    totalLoan: "总贷款",
    loan: "贷款",
    cumLoanInt: "累计贷款利息",
    cumInterest: "累计利息",
    netEquity: "净权益",
    cash: "现金",
    bond: "债券 (净额)",
    bondInt: "债券利息",
    income: "收入",
    intCost: "利息成本",
    ref: "编号: PF-2024-001",
    analysisYear: "分析年份",
    openingEquity: "期初权益",
    closingEquity: "期末权益",
    netGain: "净收益",
    annualRoC: "年度资本回报率",

    policyGrowth: "保单增长",
    totalInflow: "总流入",
    costOfFunding: "融资成本",
    netPerformance: "净表现",
    insurancePlan: "保险计划",
    stressTest: "压力测试",
    simulatedHibor: "模拟 HIBOR",
    bondPriceDrop: "债券价格下跌",
    showGuaranteed: "仅显示保证现金价值",
    breakEvenHibor: "收支平衡 HIBOR",
    lowestNetEquity: "最低净权益",
    ltvMonitor: "LTV 监控 (追收保证金风险)",
    netWorthComparison: "净资产比较",
    sensitivityAnalysis: "敏感度热图",
    marginCallThreshold: "追收保证金门槛 (95%)",
    baseline: "基准",
    stressed: "压力情境",
    interpretation: "解读",
    heatmapLegend: "热图显示选定分析年份的预计净权益。X轴代表HIBOR利率（借贷成本），Y轴代表债券收益率（资产回报）。绿色单元格表示盈余（利润），红色单元格表示亏空（亏损）。",
    dataFeeds: "数据源",
    riskLimits: "风险限额",
    compliance: "合规",
    providerStatus: "供应商状态",
    globalMinSpread: "全球最低利差",
    globalMaxLtv: "全球最高 LTV",
    regulatoryMode: "监管模式",
    autoHedging: "自动对冲协议",
    globalDisclaimer: "重要提示：本资料仅供参考，并不构成销售任何金融产品 or 服务的要约 or 招揽。投资涉及风险，包括可能损失本金。保费融资涉及杠杆，这可能会放大收益和损失。利率可能会变动并增加借贷成本。过往表现并不预示未来结果。在作出任何投资决定前，请咨询您的专业顾问。",
    sourceUrl: "来源网址",
    lastUpdated: "最后更新",
    cachingStatus: "缓存状态",
    notifications: "通知",
    markRead: "标记为已读",
    noNotifications: "没有新通知",
    marketDataUpdate: "市场数据更新",
    systemReady: "系统就绪",
    complianceAlert: "合规警报",
    source: "资金来源",
    cashSource: "现金",
    mortgageRefi: "物业加按",
    propVal: "物业估值",
    existingLoan: "现有按揭",
    refiLtv: "加按 LTV (%)",
    unlockedCash: "套现金额",
    mortgageRate: "按揭利率 (%)",
    tenor: "年期 (年)",
    applyCapital: "使用此资金",
    monthlyMtg: "月供款",
    mtgCost: "按揭成本",
    unlockedCapital: "套现资金",
    mortgageBalance: "按揭余额",
    primeRate: "最优惠利率 (P)",
    hSpread: "H + 利差 (%)",
    pCap: "封顶息率 (P - %)",
    effectiveMtgRate: "实际按揭利率",
    mtgRepaid: "已偿还贷款",
    // Return Studio Specific
    cumulativePerfPattern: "第 {year} 年的累计回报",
    yieldLabel: "收益率",
    organicGrowth: "有机增长",
    pfInterest: "保单融资利息成本",
    attributionAnalysis: "息差概念",
    netEquityDesc: "总资产 － 总贷款",
    chartStart: "起始资金",
    chartBond: "债券收入",
    chartPolicy: "保单增长",
    chartInterest: "保融利息成本",
    chartEnd: "回报",
    equityWalkFooter: "图表导览：起始资金＋债券收入＋保单增长－保融利息成本＋已偿还贷款＝回报",
    projectedMinimum: "预计最差情况",
    netCarryNeutral: "息差平衡",
    netEquityAtYear: "第 {year} 年净资产",
    pdfPreview: "报告预览",
    strategyConcept: "方案概念图",
    executiveSummary: "执行摘要",
    performanceStudio: "表现分析",
    detailedCalculations: "详细计算",
    riskAnalysis: "风险分析",
    disclaimers: "免责声明"
  },
};

type Language = 'en' | 'zh_hk' | 'zh_cn';

// --- Private Bank Theme Colors ---
const THEME = {
  navy: '#020617',     // Ultra deep navy
  navyLight: '#1e293b',
  gold: '#c5a059',     // Metallic Gold (Muted)
  goldLight: '#e4c685',
  goldHighlight: '#fcd34d', // Brighter gold for interest
  white: '#ffffff',
  offWhite: '#f8fafc',
  textMain: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  success: '#059669',
  danger: '#991b1b',
  warning: '#f59e0b',
  orange: '#f97316'
};

// --- Components ---

const Card = ({
  children,
  className = "",
  title,
  subtitle,
  action,
  goldAccent = false,
  collapsible = false,
  defaultCollapsed = false
}: {
  children?: React.ReactNode;
  className?: string,
  title?: React.ReactNode,
  subtitle?: string,
  action?: React.ReactNode,
  goldAccent?: boolean,
  collapsible?: boolean,
  defaultCollapsed?: boolean
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`bg-white shadow-sm border border-slate-200/60 ${goldAccent ? 'border-t-2 border-t-[#c5a059]' : ''} ${className}`}>
      {(title || action || collapsible) && (
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex-1">
            {title && <h3 className="text-lg font-serif font-medium text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">{subtitle}</p>}
          </div>
          <div className="ml-4 flex items-center gap-2">
            {action}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-slate-50 rounded-full text-slate-400 hover:text-[#c5a059] transition-colors focus:outline-none"
                aria-label={isCollapsed ? "Expand" : "Collapse"}
              >
                <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} />
              </button>
            )}
          </div>
        </div>
      )}
      {!isCollapsed && (
        <div className="p-8">
          {children}
        </div>
      )}
    </div>
  );
};

const InputField = ({
  label,
  value,
  onChange,
  type = "number",
  prefix = "$",
  step = 1000,
  suffix = "",
  disabled = false
}: any) => (
  <div className="mb-8 relative group">
    <label className="absolute -top-2.5 left-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white pr-2 transition-colors group-focus-within:text-[#c5a059]">
      {label}
    </label>
    <div className="relative pt-1">
      {prefix && <span className="absolute left-0 bottom-2 text-slate-400 font-serif text-lg">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={step}
        disabled={disabled}
        className={`w-full bg-transparent border-b border-slate-200 text-slate-900 font-serif text-xl py-1 focus:ring-0 focus:border-[#c5a059] focus:outline-none block transition-colors ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-8' : ''} disabled:text-slate-300 disabled:cursor-not-allowed`}
        placeholder="0"
      />
      {suffix && <span className="absolute right-0 bottom-2 text-slate-400 text-xs font-medium uppercase">{suffix}</span>}
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, options, disabled = false }: any) => (
  <div className="mb-8 relative group">
    <label className="absolute -top-2.5 left-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white pr-2 group-focus-within:text-[#c5a059]">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-transparent border-b border-slate-200 text-slate-900 font-serif text-xl py-1 pt-2 focus:ring-0 focus:border-[#c5a059] focus:outline-none block disabled:text-slate-300 disabled:cursor-not-allowed appearance-none rounded-none"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <ChevronRight className="absolute right-0 bottom-3 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
  </div>
);

const ToggleField = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) => (
  <div className="mb-8 flex items-center justify-between">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${checked ? 'bg-[#c5a059]' : 'bg-slate-200'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const KPICard = ({ label, value, subtext, highlight = false, alert = false }: { label: string, value: string, subtext: string, highlight?: boolean, alert?: boolean }) => (
  <div className={`p-6 border ${highlight ? 'bg-[#020617] border-[#020617] text-white' : alert ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
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

// --- Heatmap Component ---
const Heatmap = ({ xLabels, yLabels, data }: { xLabels: number[], yLabels: number[], data: number[][] }) => {
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
}

// --- Custom Flow Visualization (Vertical Portrait Style) ---
const FlowDiagram = ({
  budget,
  cash,
  bond,
  equity,
  loan,
  premium,
  labels,
  sourceType
}: {
  budget: number, cash: number, bond: number, equity: number, loan: number, premium: number, labels: any, sourceType: 'cash' | 'mortgage'
}) => {
  return (
    <div className="w-full flex justify-center py-4">
      {/* Increased viewBox width to 500 for more breathing room for larger blocks, height to 600 */}
      <svg width="100%" height="380" viewBox="0 0 500 600" className="w-full max-w-lg font-sans" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
          </marker>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.05" />
          </filter>
        </defs>

        {/* Level 1: Capital */}
        <g filter="url(#shadow)">
          <rect x="130" y="10" width="240" height="80" rx="8" fill="#ffffff" stroke={sourceType === 'mortgage' ? '#f59e0b' : '#e2e8f0'} strokeWidth={sourceType === 'mortgage' ? 2 : 1} />
          <circle cx="170" cy="50" r="22" fill={sourceType === 'mortgage' ? '#fffbeb' : '#f8fafc'} stroke={sourceType === 'mortgage' ? '#fcd34d' : '#f1f5f9'} />
          {sourceType === 'mortgage' ? (
            <Home x={158} y={38} width={24} height={24} stroke="#b45309" strokeWidth={1.5} />
          ) : (
            <Briefcase x={158} y={38} width={24} height={24} stroke="#0f172a" strokeWidth={1.5} />
          )}

          <text x={210} y={42} textAnchor="start" fill="#64748b" fontSize="10" fontWeight="bold" letterSpacing="1.5" style={{ textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{labels.capital}</text>
          <text x={210} y={68} textAnchor="start" fill="#0f172a" fontSize="20" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(budget)}</text>
        </g>

        {/* Connectors */}
        <path d="M250 90 L 250 120" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M250 120 L 85 120 L 85 140" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <path d="M250 120 L 415 120 L 415 140" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <path d="M250 120 L 250 260" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />

        {/* Level 2 Left: Liquidity */}
        <g filter="url(#shadow)">
          <rect x="10" y="140" width="150" height="80" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="45" cy="180" r="20" fill="#f0fdf4" stroke="#dcfce7" />
          <Wallet x={33} y={168} width={24} height={24} stroke="#15803d" strokeWidth={1.5} />
          <text x={75} y={165} textAnchor="start" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="0.5" style={{ textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{labels.liquidity}</text>
          <text x={75} y={190} textAnchor="start" fill="#0f172a" fontSize="15" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(cash)}</text>
        </g>

        {/* Level 2 Right: Yield Fund */}
        <g filter="url(#shadow)">
          <rect x="330" y="140" width="170" height="80" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="365" cy="180" r="20" fill="#fefce8" stroke="#fef9c3" />
          <TrendingUp x={353} y={168} width={24} height={24} stroke="#ca8a04" strokeWidth={1.5} />
          <text x={395} y={165} textAnchor="start" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="0.5" style={{ textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{labels.yieldFundNet}</text>
          <text x={395} y={190} textAnchor="start" fill="#0f172a" fontSize="15" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(bond)}</text>
        </g>

        {/* Level 3: Policy Initial */}
        <g filter="url(#shadow)">
          <rect x="150" y="260" width="200" height="80" rx="8" fill="#ffffff" stroke="#020617" strokeWidth="2" />
          <circle cx="190" cy="300" r="22" fill="#f1f5f9" stroke="#e2e8f0" />
          <FileText x={178} y={288} width={24} height={24} stroke="#334155" strokeWidth={1.5} />
          <text x={225} y={285} textAnchor="start" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="1" style={{ textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{labels.policyEquityCaps}</text>
          <text x={225} y={312} textAnchor="start" fill="#0f172a" fontSize="18" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(equity)}</text>
        </g>

        {/* Connector Premium to Exposure */}
        <path d="M250 340 L 250 450" fill="none" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />

        {/* Junction Point */}
        <circle cx="250" cy="395" r="4" fill="#94a3b8" />

        {/* Bank Loan (New Rectangle) */}
        <g filter="url(#shadow)">
          <rect x="20" y="360" width="160" height="70" rx="8" fill="#ffffff" stroke="#c5a059" strokeWidth="1" />
          <circle cx="50" cy="395" r="20" fill="#fffbeb" stroke="#fcd34d" />
          <Landmark x={38} y={383} width={24} height={24} stroke="#b45309" strokeWidth={1.5} />
          <text x={80} y={382} textAnchor="start" fill="#b45309" fontSize="9" fontWeight="bold" letterSpacing="0.5" style={{ textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{labels.leverage}</text>
          <text x={80} y={405} textAnchor="start" fill="#0f172a" fontSize="15" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(loan)}</text>
        </g>

        {/* Connector Loan to Junction */}
        <path d="M180 395 L 246 395" fill="none" stroke="#c5a059" strokeWidth="1.5" strokeDasharray="4 4" markerEnd="url(#arrow)" />

        {/* Level 4: Total Exposure */}
        <g filter="url(#shadow)">
          <rect x="90" y="450" width="320" height="100" rx="8" fill="#020617" stroke="#020617" strokeWidth="1" />
          <rect x="94" y="454" width="312" height="92" rx="6" fill="none" stroke="#1e293b" strokeWidth="1" />

          <circle cx="135" cy="500" r="26" fill="#1e293b" stroke="#334155" />
          <Shield x={119} y={484} width={32} height={32} stroke="#c5a059" strokeWidth={1.5} />

          <text x={175} y={488} textAnchor="start" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1" style={{ textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{labels.totalExposure}</text>
          <text x={175} y={520} textAnchor="start" fill="#ffffff" fontSize="22" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(premium)}</text>
        </g>

      </svg>
    </div>
  );
};

// --- Custom Label Component ---
const CustomLabel = (props: any) => {
  const { x, y, value, index, name, color } = props;
  // Last index is 30 for 30-year projection (0-30)
  if (index === 30) {
    return (
      <text
        x={x + 10}
        y={y}
        dy={4}
        fill={color}
        fontSize={11}
        fontFamily="sans-serif"
        fontWeight="bold"
        textAnchor="start"
      >
        {name}
      </text>
    );
  }
  return null;
};

// --- Return Studio Component ---
const ReturnStudio = ({
  data,
  labels,
  bondYield,
  loanRate,
  budget,
  totalPremium
}: {
  data: any[],
  labels: any,
  bondYield: number,
  loanRate: number,
  budget: number,
  totalPremium: number
}) => {
  const [selectedYear, setSelectedYear] = useState(1);

  // Helper to safely get data
  const getCurrentYearData = (year: number) => {
    // We now use cumulative data matching the Ledger Statement
    const currData = data[year];
    // Start from Inception (Year 0) to show total growth
    const initialData = data[0];

    if (!currData || !initialData) return null;

    // Principal Repaid Calculation (Decrease in Mtg Balance)
    const initialMtg = initialData.mortgageBalance || 0;
    const currentMtg = currData.mortgageBalance || 0;
    const mortgagePrincipalRepaid = Math.max(0, initialMtg - currentMtg);

    // Calculate Policy P&L (Current Value - Cost Basis)
    // Cost Basis = Total Premium Paid.
    // Note: This differs from "Growth" which is usually Year over Year or from Day 0 Net Equity.
    // Use this P&L to bridge the gap between "Budget" (Start) and "Net Equity" (End)
    const policyPnL = currData.surrenderValue - totalPremium;

    return {
      year,
      // Opening Equity is now the Initial Budget (User's Capital Input)
      openingEquity: budget,
      // Cumulative Ledger Values
      bondIncome: currData.cumulativeBondInterest,
      policyGrowth: policyPnL, // Renamed logic, keeps variable name for compatibility but represents P&L
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

  // Use cumulativeNetGain (Profit) for the Net Gain Box, but Net Equity (Balance Sheet) for Closing Equity Box.
  // Note: netGain = netEquity - openingEquity - externalCosts.

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Year Selector */}
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

      {/* Top Level Metrics */}
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

      {/* Waterfall / Breakdown Logic Visual */}
      <Card title={labels.attributionAnalysis} subtitle={labels.cumulativePerfPattern ? labels.cumulativePerfPattern.replace('{year}', selectedYear) : `Cumulative Performance to Year ${selectedYear}`}>
        <div className="flex flex-col lg:flex-row gap-12 mt-4">

          {/* Visual Equation */}
          <div className="flex-1 space-y-3">
            {/* Income Block */}
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

                {/* Mortgage Repayment Gain (Asset Building) */}
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

            {/* Cost Block */}
            <div className="relative pl-8 border-l-2 border-slate-100 pb-8">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                <MinusCircle className="w-3 h-3 text-red-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{labels.costOfFunding}</h4>

              <div className="space-y-2">
                {/* Premium Financing Interest */}
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

                {/* Mortgage Interest (If Applicable) */}
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

            {/* Result Block */}
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

          {/* Simple Chart Visualization */}
          <div className="lg:w-1/3 h-[400px]">
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
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill="#cbd5e1" /> {/* Start */}
                  <Cell fill="#059669" /> {/* Bond */}
                  <Cell fill={stats.policyGrowth >= 0 ? "#10b981" : "#ef4444"} /> {/* Policy */}
                  <Cell fill="#ef4444" /> {/* Interest */}
                  {stats.mortgagePrincipalRepaid > 0 && <Cell fill="#c5a059" />} {/* Mortgage Repayment */}
                  <Cell fill="#020617" /> {/* End */}
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

// --- Sidebar Component ---
const Sidebar = ({ activeView, onNavigate, isOpen, onClose, labels, lang, onDownloadPDF, isGeneratingPDF }: any) => {
  const menuItems = [
    { id: 'allocation', label: labels.allocationStructure, icon: PieChart },
    { id: 'returnStudio', label: labels.returnStudio, icon: TrendingUp },
    { id: 'holdings', label: labels.holdingsAnalysis, icon: Briefcase },
    { id: 'marketRisk', label: labels.marketRisk, icon: AlertTriangle },
    { id: 'pdfPreview', label: labels.pdfPreview, icon: FileText },
    { id: 'systemConfig', label: labels.systemConfig, icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/50 z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#020617] text-white z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#c5a059] to-[#b45309] flex items-center justify-center shadow-lg shadow-orange-900/20">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-tight text-white">{labels.privateWealth}</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400">{labels.wealthManagement}</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client Profile Snippet */}


        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                  ? 'bg-[#c5a059] text-white shadow-lg shadow-orange-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/70" />}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-800 bg-[#0f172a]/50 space-y-4">
          <button
            onClick={onDownloadPDF}
            disabled={isGeneratingPDF}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#c5a059] hover:bg-[#b45309] text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {lang === 'en' ? 'Download PDF' : '導出 PDF 報告'}
          </button>
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-white/5"
          >
            <Printer className="w-3 h-3" />
            {lang === 'en' ? 'Quick Print (Browser)' : '快速打印 (瀏覽器)'}
          </button>
          <div className="flex items-center justify-between text-[9px] text-slate-600 font-mono">
            <span>v2.5.0 (Server-Side)</span>
            {isGeneratingPDF && <span className="text-[#c5a059] animate-pulse">Processing...</span>}
          </div>
        </div>
      </aside>
    </>
  );
};

// --- Main App Component ---

const App = () => {
  // --- Refs ---
  const pdfRef = useRef<HTMLDivElement>(null);

  // --- State ---
  const [activeView, setActiveView] = useState('allocation');
  const [preventCrossBorder, setPreventCrossBorder] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  // Financial State
  const [budget, setBudget] = useState(1000000);
  const [cashReserve, setCashReserve] = useState(200000);
  const [bondAlloc, setBondAlloc] = useState(3000000); // Default 3M bond
  const [bondYield, setBondYield] = useState(5.5);
  const [hibor, setHibor] = useState(4.15); // Default fallback
  const [spread, setSpread] = useState(1.3);
  const [capRate, setCapRate] = useState(9.0); // P-based cap
  const [leverageLTV, setLeverageLTV] = useState(90); // 90% or 95%
  const [handlingFee, setHandlingFee] = useState(1.0); // 1%
  const [simulatedHibor, setSimulatedHibor] = useState(4.5); // For stress test
  const [bondPriceDrop, setBondPriceDrop] = useState(10); // % drop
  const [showGuaranteed, setShowGuaranteed] = useState(false);
  const [fundSource, setFundSource] = useState<'cash' | 'mortgage'>('cash');
  const [interestBasis, setInterestBasis] = useState<'hibor' | 'cof'>('hibor');
  const [cofRate, setCofRate] = useState(5.0); // Cost of Funds rate for manual override
  const [clientName, setClientName] = useState('Estate of Mr. H.N.W.');
  const [representativeName, setRepresentativeName] = useState('Private Wealth Advisory Team');

  // HIBOR Caching State
  const [lastRateUpdate, setLastRateUpdate] = useState<Date | null>(null);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'cached' | 'fallback' | 'manual'>('fallback');

  // Mortgage Refi State
  const [propertyValue, setPropertyValue] = useState(15000000);
  const [existingMortgage, setExistingMortgage] = useState(6000000);
  const [mortgageLtv, setMortgageLtv] = useState(60); // Target LTV for Refi
  const [primeRate, setPrimeRate] = useState(5.875); // Major Bank Prime
  const [mortgageHSpread, setMortgageHSpread] = useState(1.3); // H + 1.3
  const [mortgagePModifier, setMortgagePModifier] = useState(1.75); // P - 1.75
  const [mortgageTenor, setMortgageTenor] = useState(30);

  // Market Risk & Sensitivity
  const [sensitivityYear, setSensitivityYear] = useState(15);

  // System Configuration State
  const [globalMinSpread, setGlobalMinSpread] = useState(1.0);
  const [globalMaxLTV, setGlobalMaxLTV] = useState(95);
  const [regulatoryMode, setRegulatoryMode] = useState('hkma'); // hkma | mas
  const [autoHedging, setAutoHedging] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<{ id: number, title: string, message: string, time: string, type: 'info' | 'warning' | 'success' }[]>([
    { id: 1, title: t.systemReady, message: 'Ledger synchronization complete.', time: '2m ago', type: 'success' },
    { id: 2, title: t.complianceAlert, message: 'Client risk profile review due.', time: '1h ago', type: 'warning' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  // Chart Filters State
  const [chartFilters, setChartFilters] = useState({
    bondPrincipal: true,
    cashValue: true,
    bondInterest: true,
    policyValue: true,
    loan: true
  });

  // Batch Process State
  const [batchStatus, setBatchStatus] = useState<'idle' | 'running' | 'success'>('idle');
  const [batchLogs, setBatchLogs] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);

  const runBatch = () => {
    if (batchStatus === 'running') return;
    setBatchStatus('running');
    setBatchLogs(['Starting nightly batch process...', 'Initializing secure connection...']);
    setBatchProgress(10);

    setTimeout(() => {
      setBatchLogs(prev => [...prev, '✔ Archiving scenarios to encrypted storage...']);
      setBatchProgress(40);
    }, 1500);

    setTimeout(() => {
      setBatchLogs(prev => [...prev, '✔ Generating client portfolio reports (PDF)...']);
      setBatchProgress(70);
    }, 3000);

    setTimeout(() => {
      setBatchLogs(prev => [...prev, '✔ Syncing market rates with HKMA...']);
      setBatchProgress(90);
    }, 4500);

    setTimeout(() => {
      setBatchLogs(prev => [...prev, '✨ Batch process completed successfully. System ready for new day.']);
      setBatchProgress(100);
      setBatchStatus('success');
    }, 6000);
  };


  // --- HIBOR Persistence & Fetching ---
  useEffect(() => {
    const CACHE_KEY = 'hibor_cache';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Hours

    const fetchLiveHibor = async () => {
      setIsFetchingRates(true);
      setFetchError(null);
      try {
        // Use HKMA Open API (CORS friendly, official source)
        // Note: Data might have a slight lag (e.g. 1-2 weeks) but is reliable.
        const response = await fetch('https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/hk-interbank-ir-daily?segment=hibor.fixing&offset=0');
        const data = await response.json();

        if (data.header && data.header.success && data.result && data.result.records && data.result.records.length > 0) {
          const latestRecord = data.result.records[0];
          const rate = latestRecord.ir_1m; // 1-month HIBOR
          const dateStr = latestRecord.end_of_day;

          if (rate && !isNaN(rate)) {
            setHibor(rate);
            const recordDate = new Date(dateStr);
            setLastRateUpdate(recordDate);
            setDataSource('live');

            // Add notification
            setNotifications(prev => [{
              id: Date.now(),
              title: t.marketDataUpdate,
              message: `HIBOR (HKMA) updated: ${rate}% (As of ${dateStr})`,
              time: 'Just now',
              type: 'info'
            }, ...prev]);
            setUnreadCount(c => c + 1);

            // Save to cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              rate: rate,
              timestamp: Date.now(), // Cache timestamp (when we fetched it)
              dataDate: dateStr      // Actual data date
            }));
            setIsFetchingRates(false);
            return;
          }
        }

        throw new Error("Invalid data structure from HKMA API");

      } catch (err) {
        console.error("HIBOR Fetch Error:", err);
        setFetchError("Failed to fetch live rate. Please input manually.");
        setDataSource('fallback'); // This will enable manual input
        setHibor(2.50); // Set a more realistic fallback (current ~2.50) rather than 4.15
      } finally {
        setIsFetchingRates(false);
      }
    };

    // 1. Check Cache
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        const { rate, timestamp, dataDate } = JSON.parse(cachedData);
        const age = Date.now() - timestamp;

        if (age < CACHE_DURATION) {
          setHibor(rate);
          // If we have a data date, use that for display, otherwise fallback to cache time
          setLastRateUpdate(dataDate ? new Date(dataDate) : new Date(timestamp));
          setDataSource('cached');
          return; // Skip fetch
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    // 2. Fetch if no valid cache
    fetchLiveHibor();

  }, []); // Run once on mount



  // --- Helper: Mortgage PMT ---
  const calculatePMT = (rate: number, nper: number, pv: number) => {
    if (rate === 0) return pv / nper;
    const r = rate / 100 / 12;
    const n = nper * 12;
    return (pv * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const unlockedCash = Math.max(0, (propertyValue * (mortgageLtv / 100)) - existingMortgage);

  // Effective Mortgage Rate Calculation (Min of H+Spread and P-Cap)
  const effectiveMortgageRate = Math.min(hibor + mortgageHSpread, primeRate - mortgagePModifier);
  const monthlyMortgagePmt = calculatePMT(effectiveMortgageRate, mortgageTenor, unlockedCash);

  const handleApplyCapital = () => {
    setBudget(unlockedCash);
  };



  // --- Calculations ---
  const {
    pfEquity,
    totalPremium,
    bankLoan,
    effectiveRate,
    projectionData,
    finalNetEquity,
    roi,
    monthlyBondIncome,
    monthlyLoanInterest,
    monthlyNetCashflow,
    oneOffBondFee,
    netBondPrincipal
  } = useMemo(() => {
    const equity = budget - cashReserve - bondAlloc;
    const ltvDecimal = leverageLTV / 100.0;

    // Use the base factors directly
    const currentFactors = BASE_FACTORS;
    const initialCSVFactor = currentFactors[0] || 0;

    let tPremium = 0;
    const denominator = 1 - (ltvDecimal * initialCSVFactor);
    if (denominator > 0 && equity > 0) {
      tPremium = equity / denominator;
    }

    const loan = Math.max(0, tPremium - equity);

    // Effective Rate Logic
    const baseRate = interestBasis === 'hibor' ? hibor : cofRate;
    const effRate = Math.min(baseRate + spread, capRate);

    // Bond Logic: Fee is one-off, deducted from capital. Yield applies to Net Capital.
    const oneOffFee = bondAlloc * (handlingFee / 100);
    const netBondAlloc = bondAlloc - oneOffFee;

    // Monthly Cashflow Calculation (Year 1 Run-rate)
    const mBondIncome = (netBondAlloc * (bondYield / 100)) / 12;
    const mLoanInterest = (loan * (effRate / 100)) / 12;
    const mMortgageCost = fundSource === 'mortgage' ? monthlyMortgagePmt : 0;
    const mNetCashflow = mBondIncome - mLoanInterest - mMortgageCost;

    // Generate Mortgage Schedule if applicable
    const mortgageSchedule = [];
    if (fundSource === 'mortgage') {
      let balance = unlockedCash; // We assume the "Budget" is the Loan amount
      const annualPmt = monthlyMortgagePmt * 12;
      let cumInterest = 0;

      for (let y = 0; y <= 30; y++) {
        if (y === 0) {
          mortgageSchedule.push({ balance: balance, annualPmt: 0, cumInterest: 0, annualInterest: 0 });
        } else if (y <= mortgageTenor) {
          // Simple annual amortization approximation for ledger
          const interestPart = balance * (effectiveMortgageRate / 100);
          const principalPart = annualPmt - interestPart;

          cumInterest += interestPart;
          balance -= principalPart;
          if (balance < 0) balance = 0;
          mortgageSchedule.push({ balance: balance, annualPmt: annualPmt, cumInterest: cumInterest, annualInterest: interestPart });
        } else {
          mortgageSchedule.push({ balance: 0, annualPmt: 0, cumInterest: cumInterest, annualInterest: 0 });
        }
      }
    }

    const data = [];

    // Initialize Year 0
    const yr0Factor = currentFactors[0];
    const yr0Surrender = tPremium * yr0Factor;
    const yr0Assets = yr0Surrender + netBondAlloc + cashReserve;
    const yr0Liabilities = loan;

    // If Mortgage is source, we have an additional liability (The Mortgage Loan)
    // Net Equity = (Assets - PremiumLoan) - MortgageBalance
    const yr0MortgageBal = fundSource === 'mortgage' ? unlockedCash : 0;
    const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;

    data.push({
      year: 0,
      surrenderValue: yr0Surrender,
      bondPrincipal: netBondAlloc,
      cumulativeBondInterest: 0,
      bondFundNetValue: netBondAlloc,
      cashValue: cashReserve,
      totalAssets: yr0Assets,
      loan: yr0Liabilities,
      cumulativeInterest: 0,
      netEquity: yr0NetEquity,
      formattedNetEquity: formatCurrency(yr0NetEquity),
      formattedLoan: formatCurrency(yr0Liabilities),
      annualBondIncome: 0,
      annualLoanInterest: 0,
      annualPolicyGrowth: 0,
      annualNetGain: 0,
      annualRoC: 0,
      cumulativePolicyGrowth: 0,
      cumulativeNetGain: 0,
      mortgageBalance: yr0MortgageBal,
      cumulativeMortgageCost: 0,
      cumulativeMortgageInterest: 0,
      annualMortgagePayment: 0
    });

    let runningCumMtgCost = 0;

    for (let yr = 1; yr <= 30; yr++) {
      const factor = currentFactors[yr] || currentFactors[30];
      const surrenderValue = tPremium * factor;

      const cumulativeBondInterest = netBondAlloc * (bondYield / 100) * yr;
      const bondFundNetValue = netBondAlloc + cumulativeBondInterest;
      const cumulativeInterest = loan * (effRate / 100) * yr;
      const currentAssets = surrenderValue + bondFundNetValue + cashReserve;
      const currentLiabilities = loan;

      let netEquity = currentAssets - currentLiabilities - cumulativeInterest;

      // Mortgage Logic
      let mtgBal = 0;
      let annualMtgPmt = 0;
      let cumMtgInt = 0;
      if (fundSource === 'mortgage') {
        mtgBal = mortgageSchedule[yr]?.balance || 0;
        annualMtgPmt = mortgageSchedule[yr]?.annualPmt || 0;
        cumMtgInt = mortgageSchedule[yr]?.cumInterest || 0;
        runningCumMtgCost += annualMtgPmt;
        // Subtract Mortgage Balance from Net Equity (Balance Sheet Logic)
        // Net Equity = Assets - Liabilities. Liabilities include Mortgage Balance.
        netEquity -= mtgBal;
        // Note: We do NOT subtract runningCumMtgCost from NetEquity here. 
        // Net Equity is what you own vs what you owe. Sunk costs (payments) are gone but handled in Net Gain.
      }

      const prev = data[yr - 1];
      const annualBondIncome = cumulativeBondInterest - prev.cumulativeBondInterest;
      const annualLoanInterest = cumulativeInterest - prev.cumulativeInterest;
      const annualPolicyGrowth = surrenderValue - prev.surrenderValue;

      // Net Gain for the year
      let annualNetGain = (annualBondIncome + annualPolicyGrowth) - annualLoanInterest - annualMtgPmt;

      let annualRoC = 0;
      // If Mortgage, initial equity is near 0. Using budget as denominator for relative perf.
      const denom = fundSource === 'mortgage' ? budget : prev.netEquity;
      if (denom !== 0) {
        annualRoC = (annualNetGain / denom) * 100;
      }

      const cumulativePolicyGrowth = surrenderValue - yr0Surrender;

      // Cumulative Net Gain (Performance / Profit)
      // Profit = Current Net Equity - Initial Equity - External Costs Paid (Mortgage Payments)
      const cumulativeNetGain = netEquity - yr0NetEquity - (fundSource === 'mortgage' ? runningCumMtgCost : 0);

      data.push({
        year: yr,
        surrenderValue,
        bondPrincipal: netBondAlloc,
        cumulativeBondInterest,
        bondFundNetValue,
        cashValue: cashReserve,
        totalAssets: currentAssets,
        loan: currentLiabilities,
        cumulativeInterest,
        netEquity, // Balance Sheet Value
        formattedNetEquity: formatCurrency(netEquity),
        formattedLoan: formatCurrency(currentLiabilities),
        annualBondIncome,
        annualLoanInterest,
        annualPolicyGrowth,
        annualNetGain,
        annualRoC,
        cumulativePolicyGrowth,
        cumulativeNetGain, // Profit Value
        mortgageBalance: mtgBal,
        cumulativeMortgageCost: runningCumMtgCost,
        cumulativeMortgageInterest: cumMtgInt,
        annualMortgagePayment: annualMtgPmt
      });
    }

    // Final Equity is the Balance Sheet value
    const final = data[30].netEquity;

    // ROI based on Cumulative Net Gain
    const totalGain = data[30].cumulativeNetGain;

    // For ROI denominator:
    // If Mortgage: Denominator is difficult as initial equity is ~0. Can use Budget (Exposure) or Total Costs Paid.
    // Usually clients ask "Return on Capital Employed". If Capital is 0 (100% financed), ROI is infinite.
    // Let's use 'Budget' as a proxy for 'Asset Value Controlled' to give a sensible % 
    // OR just use totalGain if budget is 0?
    // Let's stick to using `budget` for stability, but conceptually it's "Return on Assets Managed".
    const roiVal = (totalGain / budget) * 100;

    return {
      pfEquity: equity,
      totalPremium: tPremium,
      bankLoan: loan,
      effectiveRate: effRate,
      projectionData: data,
      finalNetEquity: final,
      roi: roiVal,
      monthlyBondIncome: mBondIncome,
      monthlyLoanInterest: mLoanInterest,
      monthlyNetCashflow: mNetCashflow,
      oneOffBondFee: oneOffFee,
      netBondPrincipal: netBondAlloc,
      monthlyMortgagePmt: mMortgageCost
    };

  }, [budget, cashReserve, bondAlloc, bondYield, hibor, cofRate, interestBasis, spread, leverageLTV, capRate, handlingFee, fundSource, propertyValue, existingMortgage, mortgageLtv, effectiveMortgageRate, mortgageTenor]);


  // --- Stressed Projections (For Market Risk) ---
  const { stressedProjection, stressStats, sensitivityData } = useMemo(() => {
    // Recalculate based on stress parameters
    const factors = showGuaranteed ? GUARANTEED_FACTORS : BASE_FACTORS;

    // 1. Bond Shock (Immediate drop at T=0 applied to principal)
    // The prompt implies a scenario where assets drop. We will model this as the bond fund value dropping.
    // However, usually stress tests apply to the *current* situation. 
    // For simplicity in this projection, we assume the bond fund starts at (1 - drop) value.
    const stressedBondPrincipal = netBondPrincipal * (1 - bondPriceDrop / 100);

    // 2. Simulated HIBOR Rate
    const stressedRate = Math.min(simulatedHibor + spread, capRate);

    const data = [];
    const baselineData = projectionData; // For comparison

    // Initial Setup (Year 0)
    // Year 0 Equity reflects the immediate shock if any
    const yr0Factor = factors[0] || 0;
    const yr0Surrender = totalPremium * yr0Factor;
    const yr0Assets = yr0Surrender + stressedBondPrincipal + cashReserve;
    const yr0Liabilities = bankLoan;
    // Mortgage Logic
    const yr0MortgageBal = fundSource === 'mortgage' ? unlockedCash : 0;
    const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;

    data.push({
      year: 0,
      netEquity: yr0NetEquity,
      baselineNetEquity: baselineData?.[0]?.netEquity || 0,
      ltv: (yr0Liabilities / (yr0Surrender + stressedBondPrincipal)) * 100
    });

    let lowestEquity = yr0NetEquity;

    // Calculate Mortgage Schedule for Stress Test (Assuming Rate stays same as it's usually fixed or P-linked, not HIBOR linked directly in this context, or we simplify)
    // We will use the same mortgage schedule as baseline for simplicity
    let runningCumMtgCost = 0;

    for (let yr = 1; yr <= 30; yr++) {
      const factor = factors[yr] || factors[30];
      const surrenderValue = totalPremium * factor;

      // Bond grows from the stressed principal
      const cumulativeBondInterest = stressedBondPrincipal * (bondYield / 100) * yr;
      const bondFundNetValue = stressedBondPrincipal + cumulativeBondInterest;

      const cumulativeInterest = bankLoan * (stressedRate / 100) * yr;

      const currentAssets = surrenderValue + bondFundNetValue + cashReserve;
      const currentLiabilities = bankLoan;

      let netEquity = currentAssets - currentLiabilities - cumulativeInterest;

      // Mortgage Deductions
      if (fundSource === 'mortgage') {
        const mtgBal = baselineData[yr]?.mortgageBalance || 0;
        // const annualPmt = baselineData[yr]?.annualMortgagePayment || 0;
        // runningCumMtgCost += annualPmt;
        netEquity -= mtgBal;
        // REMOVED: netEquity -= runningCumMtgCost; (Match balance sheet logic)
      }

      if (netEquity < lowestEquity) lowestEquity = netEquity;

      // LTV Calculation: Loan / (Policy + Bond)
      const collateralValue = surrenderValue + bondFundNetValue;
      const ltv = collateralValue > 0 ? (currentLiabilities / collateralValue) * 100 : 0;

      data.push({
        year: yr,
        netEquity,
        baselineNetEquity: baselineData[yr]?.netEquity || 0,
        ltv,
        surrenderValue,
        bondFundNetValue
      });
    }

    // --- Break-even HIBOR Calculation (Simplified) ---
    // Solve for Rate where (BondYield + PolicyYield) - CostOfFunds = 0
    // We use Year 1 run-rate for immediate risk.
    // Income = (StressedBond * Yield) + (Policy_Y1 - Policy_Y0) 
    // Cost = Loan * (X + Spread)
    // This is an approximation. 
    // Better metric: What HIBOR rate makes Year 30 Net Equity = Initial Budget? (Break-even on Capital)
    // Or Year 1 Cashflow Break-even. 
    // Let's use "Net Carry Break-even": The rate where annual asset income equals annual loan cost.
    // Policy income is tricky as it's not cash, but growth. We'll use Year 1 growth.

    const policyGrowthY1 = (totalPremium * (factors[1] || 0)) - (totalPremium * (factors[0] || 0));
    const annualBondIncome = stressedBondPrincipal * (bondYield / 100);
    const totalAnnualIncome = annualBondIncome + policyGrowthY1;

    // Mortgage Cost needs to be covered too for true break even
    const annualMtgPmt = fundSource === 'mortgage' ? baselineData[1]?.annualMortgagePayment || 0 : 0;

    // totalAnnualIncome - MortgagePmt = Loan * (BE_Rate + Spread)
    // (totalAnnualIncome - MortgagePmt) / Loan = BE_Rate + Spread

    let breakEvenHibor = 0;
    if (bankLoan > 0) {
      breakEvenHibor = (((totalAnnualIncome - annualMtgPmt) / bankLoan) * 100) - spread;
    } else {
      breakEvenHibor = 100; // Infinite if no loan
    }

    // --- Sensitivity Heatmap Data ---
    // X: HIBOR (1, 2, 3, 4, 5, 6)
    // Y: Bond Yield (3, 4, 5, 6, 7)
    // Value: Net Equity at Year 15
    const xLabels = [1, 2, 3, 4, 5, 6];
    const yLabels = [3, 4, 5, 6, 7];
    const heatMapRows = [];

    for (const yieldVal of yLabels) {
      const row = [];
      for (const hiborVal of xLabels) {
        // Quick Calc for Year 15 Net Equity
        // Re-use current params but swap yield & hibor
        const rate = Math.min(hiborVal + spread, capRate);
        const yr = sensitivityYear;

        // Policy at Y15 (Using current Stress toggle settings)
        const surr = totalPremium * (factors[yr] || 0);

        // Bond at Y15 (using stressed principal)
        const bondVal = stressedBondPrincipal + (stressedBondPrincipal * (yieldVal / 100) * yr);

        // Loan Cost
        const interest = bankLoan * (rate / 100) * yr;

        let result = (surr + bondVal + cashReserve) - bankLoan - interest;

        if (fundSource === 'mortgage') {
          const mtgBal = baselineData[yr]?.mortgageBalance || 0;
          // const cumMtgCost = baselineData[yr]?.cumulativeMortgageCost || 0;
          result = result - mtgBal;
          // REMOVED: result = result - cumMtgCost;
        }

        // Profit relative to Budget
        const profit = result - (fundSource === 'mortgage' ? 0 : budget);
        row.push(profit);
      }
      heatMapRows.push(row);
    }


    return {
      stressedProjection: data,
      stressStats: {
        breakEvenHibor,
        lowestEquity
      },
      sensitivityData: {
        xLabels,
        yLabels,
        data: heatMapRows
      }
    }

  }, [projectionData, simulatedHibor, bondPriceDrop, showGuaranteed, totalPremium, netBondPrincipal, bondYield, bankLoan, spread, capRate, budget, cashReserve, sensitivityYear, fundSource, unlockedCash]);


  // --- Export Function ---
  const handleExportCSV = () => {
    const headers = [
      "Year",
      "Cum. Bond Interest",
      "Cash Reserve",
      "Bond Principal (Net)",
      "Policy Cash Value",
      "Total Loan",
      "Cum. Loan Interest",
      ...(fundSource === 'mortgage' ? ["Mortgage Balance", "Annual Mtg Pmt"] : []),
      "Net Equity"
    ];
    const rows = projectionData.map(d => [
      d.year,
      d.cumulativeBondInterest.toFixed(2),
      d.cashValue.toFixed(2),
      d.bondPrincipal.toFixed(2),
      d.surrenderValue.toFixed(2),
      d.loan.toFixed(2),
      d.cumulativeInterest.toFixed(2),
      ...(fundSource === 'mortgage' ? [d.mortgageBalance.toFixed(2), d.annualMortgagePayment.toFixed(2)] : []),
      d.netEquity.toFixed(2)
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "financial_projection_30y.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNavigate = (view: string) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPDF(true);

    try {
      // Capture the HTML content of the PDF container
      const htmlContent = pdfRef.current.innerHTML;

      // Get styles (optional, keeping it simple as cdn tailwind is in API)
      const cssStyles = `
        @page { size: A4 landscape; margin: 0; }
        .pdf-only { display: block !important; width: 297mm !important; height: 210mm !important; }
        .page-break { page-break-after: always !important; break-after: page !important; }
      `;

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlContent, css: cssStyles }),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Premium-Financing-Proposal-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error generating PDF. Please try "Quick Print" instead.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex font-sans no-print">
      <PrintStyles />

      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        labels={t}
        lang={lang}
        onDownloadPDF={handleDownloadPDF}
        isGeneratingPDF={isGeneratingPDF}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 transition-all duration-300">

        {/* Top Header */}
        <header className="bg-white sticky top-0 z-10 px-6 md:px-10 py-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-slate-500 hover:text-[#020617] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div>
              <h1 className="text-xl md:text-2xl font-serif text-[#020617]">{t.financingProposal}</h1>
              {/* Header Reference info removed */}
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Language Switcher */}
            <div className="hidden sm:flex items-center space-x-2 mr-2">
              <Globe className="w-4 h-4 text-slate-400" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="bg-transparent text-xs font-bold text-slate-600 uppercase tracking-wide focus:outline-none cursor-pointer hover:text-[#020617]"
              >
                <option value="en">English</option>
                <option value="zh_hk">繁體中文</option>
                <option value="zh_cn">简体中文</option>
              </select>
            </div>

            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t.hiborRate}</span>
              <span className="text-lg font-serif font-bold text-[#020617]">{formatPercent(hibor)}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:border-[#c5a059] cursor-pointer transition-colors relative"
              >
                <Bell className="w-4 h-4 text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {/* Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white shadow-xl border border-slate-100 rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-[#f8fafc] px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.notifications}</span>
                    <button onClick={() => setUnreadCount(0)} className="text-[10px] text-[#c5a059] font-bold hover:text-[#b45309]">{t.markRead}</button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${n.type === 'success' ? 'text-emerald-600' :
                            n.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                            }`}>
                            {n.title}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{n.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400">{t.noNotifications}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-10 max-w-[1600px] mx-auto space-y-8">

          {/* Dashboard Grid */}
          <div className={`grid grid-cols-1 ${activeView === 'pdfPreview' ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-8`}>

            {/* Left Column: Inputs & Controls (Always Visible) */}
            <div className={`${activeView === 'pdfPreview' ? 'hidden' : 'lg:col-span-4'} space-y-8`}>

              {activeView === 'marketRisk' ? (
                // --- Stress Test Controls ---
                <Card title={t.stressTest} subtitle={t.marketRisk} goldAccent>
                  <InputField
                    label={t.simulatedHibor}
                    value={simulatedHibor}
                    onChange={setSimulatedHibor}
                    step={0.1}
                    suffix="%"
                  />
                  <InputField
                    label={t.bondPriceDrop}
                    value={bondPriceDrop}
                    onChange={setBondPriceDrop}
                    step={5}
                    suffix="%"
                  />
                  <ToggleField
                    label={t.showGuaranteed}
                    checked={showGuaranteed}
                    onChange={setShowGuaranteed}
                  />
                </Card>
              ) : activeView === 'systemConfig' ? (
                // --- System Config Sidebar Controls (Optional) ---
                <Card title={t.providerStatus} subtitle="System Health" goldAccent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${dataSource === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        <span className="text-xs font-bold text-slate-700">Bloomberg API</span>
                      </div>
                      <span className={`text-[10px] uppercase font-bold ${dataSource === 'live' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {dataSource === 'live' ? 'Active' : 'Standby'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-bold text-slate-700">Core Ledger</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600">Synced</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        <span className="text-xs font-bold text-slate-500">Nightly Batch</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Pending</span>
                    </div>
                  </div>
                </Card>
              ) : (
                // --- Default Controls ---
                <>
                  <Card
                    className="overflow-hidden"
                    goldAccent
                    collapsible
                    title={
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); setFundSource('cash') }}
                          className={`pb-1 text-sm font-bold uppercase tracking-wider transition-colors ${fundSource === 'cash' ? 'text-[#c5a059] border-b-2 border-[#c5a059]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {t.cashSource}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFundSource('mortgage') }}
                          className={`pb-1 text-sm font-bold uppercase tracking-wider transition-colors ${fundSource === 'mortgage' ? 'text-[#c5a059] border-b-2 border-[#c5a059]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {t.mortgageRefi}
                        </button>
                      </div>
                    }
                    subtitle={fundSource === 'cash' ? t.clientAssets : t.unlockedCapital}
                  >
                    {fundSource === 'cash' ? (
                      <>
                        <InputField label={t.totalBudget} value={budget} onChange={setBudget} />
                      </>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <InputField label={t.propVal} value={propertyValue} onChange={setPropertyValue} />
                          <InputField label={t.existingLoan} value={existingMortgage} onChange={setExistingMortgage} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                            <InputField label={t.refiLtv} value={mortgageLtv} onChange={setMortgageLtv} suffix="%" step={1} />
                          </div>
                          <div className="col-span-2">
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.unlockedCash}</div>
                              <div className="text-lg font-serif font-medium text-slate-900">{formatCurrency(unlockedCash)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Mortgage Rate Terms (Replaces single input) */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                          <InputField label={t.hiborRate} value={parseFloat(hibor.toFixed(2))} onChange={() => { }} prefix="" suffix="%" disabled />
                          <InputField label={t.hSpread} value={mortgageHSpread} onChange={setMortgageHSpread} suffix="%" step={0.1} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <InputField label={t.primeRate} value={primeRate} onChange={setPrimeRate} suffix="%" step={0.125} />
                          <InputField label={t.pCap} value={mortgagePModifier} onChange={setMortgagePModifier} suffix="%" step={0.1} />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <InputField label={t.tenor} value={mortgageTenor} onChange={setMortgageTenor} suffix="Yr" step={1} />
                          <div className="bg-orange-50 p-2 rounded border border-orange-100 text-center flex flex-col justify-center">
                            <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">{t.effectiveMtgRate}</div>
                            <div className="text-xl font-serif font-bold text-orange-700">{formatPercent(effectiveMortgageRate)}</div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-center text-xs text-slate-500">
                            <span className="font-bold uppercase tracking-wider">{t.monthlyMtg}</span>
                            <span className="font-mono text-slate-900">{formatCurrency(monthlyMortgagePmt)}</span>
                          </div>
                          <button
                            onClick={handleApplyCapital}
                            className="w-full py-3 bg-[#c5a059] hover:bg-[#b45309] text-white text-xs font-bold uppercase tracking-widest rounded shadow transition-colors"
                          >
                            {t.applyCapital}
                          </button>
                        </div>
                        <div className="text-center text-[10px] text-slate-400 mt-2">
                          Current Budget: <span className="font-mono text-slate-700">{formatCurrency(budget)}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                      <InputField label={t.cashReserve} value={cashReserve} onChange={setCashReserve} />
                      <InputField label={t.bondFund} value={bondAlloc} onChange={setBondAlloc} />
                    </div>
                    <InputField label={t.bondYield} value={bondYield} onChange={setBondYield} prefix="" step={0.1} suffix="%" />

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-baseline">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.policyEquity}</span>
                      <span className={`text-xl font-serif ${pfEquity < 0 ? 'text-red-700' : 'text-[#020617]'}`}>
                        {formatCurrency(pfEquity)}
                      </span>
                    </div>
                  </Card>

                  <Card title={t.bankParams} subtitle={t.lendingTerms} collapsible>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 flex items-center gap-4 mb-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() => setInterestBasis('hibor')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${interestBasis === 'hibor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            HIBOR + Spread
                          </button>
                          <button
                            onClick={() => setInterestBasis('cof')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${interestBasis === 'cof' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            COF (Manual)
                          </button>
                        </div>
                      </div>

                      {interestBasis === 'hibor' ? (
                        <InputField
                          label={t.hiborRate}
                          value={hibor}
                          onChange={setHibor}
                          prefix=""
                          step={0.01}
                          disabled={dataSource === 'live' || dataSource === 'cached'}
                        />
                      ) : (
                        <InputField
                          label="COF Rate" // TODO: Add translation key if creating proper i18n
                          value={cofRate}
                          onChange={setCofRate}
                          prefix=""
                          step={0.01}
                          suffix="%"
                        />
                      )}
                      <InputField label={t.spread} value={spread} onChange={setSpread} prefix="" step={0.05} />
                    </div>
                    <div className="grid grid-cols-2 gap-6 mt-2">
                      <InputField label={t.intCap} value={capRate} onChange={setCapRate} prefix="" step={0.1} />
                      <SelectField
                        label={t.leverageLtv}
                        value={leverageLTV}
                        onChange={setLeverageLTV}
                        options={[{ value: 90, label: '90% LTV' }, { value: 95, label: '95% LTV' }]}
                      />
                    </div>
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <InputField label={t.handlingFee} value={handlingFee} onChange={setHandlingFee} prefix="" step={0.1} />
                      <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                        <span>{t.oneOffDeduction}:</span>
                        <span className="font-bold text-[#c5a059]">{formatCurrency(oneOffBondFee)}</span>
                      </div>
                    </div>
                  </Card>
                </>
              )}

            </div>

            {/* Right Column: Visuals & Metrics (Switched based on View) */}
            <div className={`${activeView === 'pdfPreview' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-8`}>

              {activeView === 'allocation' && (
                <>
                  {/* Top KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                  {/* Monthly Cashflow Analysis */}
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
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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

                  {/* Diagram */}
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
                </>
              )}

              {activeView === 'returnStudio' && (
                <ReturnStudio
                  data={projectionData}
                  labels={t}
                  bondYield={bondYield}
                  loanRate={effectiveRate}
                  budget={budget}
                  totalPremium={totalPremium}
                />
              )}

              {activeView === 'holdings' && (
                <>
                  {/* Chart */}
                  <Card title={t.projectedPerf} subtitle={t.horizon30y}>
                    {/* Chart Controls */}
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
                          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all ${chartFilters[filter.key as keyof typeof chartFilters]
                            ? 'text-white shadow-sm'
                            : 'bg-white text-slate-300 border-slate-100'
                            }`}
                          style={{
                            backgroundColor: chartFilters[filter.key as keyof typeof chartFilters] ? filter.color : undefined,
                            borderColor: chartFilters[filter.key as keyof typeof chartFilters] ? filter.color : undefined,
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
                            <Area
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
                            <Area
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
                            <Area
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
                            <Area
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
                            <Line
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
                            <Line
                              type="monotone"
                              dataKey="mortgageBalance"
                              stroke={THEME.orange}
                              strokeWidth={2}
                              strokeDasharray="2 2"
                              dot={false}
                              name={t.mortgageBalance}
                            />
                          )}
                          <Line
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

                  {/* Table */}
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
                </>
              )}

              {activeView === 'marketRisk' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <KPICard
                      label={t.lowestNetEquity}
                      value={formatCurrency(stressStats.lowestEquity)}
                      subtext={t.projectedMinimum}
                      alert={stressStats.lowestEquity < 0}
                    />
                    <KPICard
                      label={t.breakEvenHibor}
                      value={formatPercent(stressStats.breakEvenHibor)}
                      subtext={t.netCarryNeutral}
                    />

                  </div>

                  {/* Net Worth Comparison Chart */}
                  <Card title={t.netWorthComparison} subtitle={`${t.baseline} vs ${t.stressed}`}>
                    <div className="h-[350px] w-full mt-4">
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
                          <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `$${val / 1000000}M`} tickLine={false} axisLine={false} />
                          <Tooltip formatter={(val: number) => formatCurrency(val)} />
                          <Legend />
                          <Area type="monotone" dataKey="baselineNetEquity" name={t.baseline} stroke={THEME.navy} fill="url(#colorBaseline)" strokeWidth={2} />
                          <Area type="monotone" dataKey="netEquity" name={t.stressed} stroke={THEME.danger} fill="url(#colorStressed)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Heatmap */}
                  <Card
                    title={t.sensitivityAnalysis}
                    subtitle={`${t.netEquityAtYear.replace('{year}', String(sensitivityYear))} (${t.stressed})`}
                    action={
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">{t.analysisYear}:</span>
                        <select
                          value={sensitivityYear}
                          onChange={(e) => setSensitivityYear(Number(e.target.value))}
                          className="bg-slate-100 border-none text-xs font-bold text-slate-700 rounded py-1 pl-2 pr-2 cursor-pointer focus:ring-1 focus:ring-[#c5a059] outline-none"
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
                </div>
              )}

              {activeView === 'systemConfig' && (
                <div className="space-y-8 animate-in fade-in duration-500">

                  {/* Document Settings */}
                  <Card title={lang === 'en' ? 'Document Settings' : '文件設定'} subtitle={lang === 'en' ? 'Client & Representative Information' : '客戶及代表資料'}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputField
                        label={lang === 'en' ? 'Client Name' : '客戶姓名'}
                        value={clientName}
                        onChange={(val: string) => setClientName(val)}
                        hint={lang === 'en' ? 'Displayed on PDF cover page' : '顯示於PDF封面'}
                      />
                      <InputField
                        label={lang === 'en' ? 'Representative Name' : '代表姓名'}
                        value={representativeName}
                        onChange={(val: string) => setRepresentativeName(val)}
                        hint={lang === 'en' ? 'Advisor or team name' : '顧問或團隊名稱'}
                      />
                    </div>
                  </Card>

                  {/* Data Feeds Config */}
                  <Card title={t.dataFeeds} subtitle="Market Data Integration">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Server className="w-5 h-5 text-slate-600" />
                            <h4 className="text-sm font-bold text-slate-800">HIBOR Source</h4>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${dataSource === 'live' ? 'bg-emerald-100 text-emerald-700' : dataSource === 'cached' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {dataSource === 'cached' ? 'Live' : dataSource} Mode
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                          Select the primary source for Interbank rates. 'Live' pulls from the active HKMA Open API integration. 'Manual' allows override for scenario planning.
                        </p>
                        <SelectField
                          label="Primary Feed"
                          value={dataSource === 'cached' ? 'live' : dataSource}
                          onChange={(val: any) => setDataSource(val === 'live' ? 'live' : 'manual')}
                          options={[{ value: 'live', label: 'HKMA (Open API)' }, { value: 'manual', label: 'Manual Input' }]}
                        />

                        {/* Caching Source Details */}
                        {(dataSource === 'live' || dataSource === 'cached' || dataSource === 'fallback') && (
                          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <LinkIcon className="w-3 h-3" />
                                <span className="font-bold">{t.sourceUrl}</span>
                              </div>
                              <a href="https://api.hkma.gov.hk" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#c5a059] hover:underline truncate max-w-[150px]">
                                api.hkma.gov.hk
                              </a>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span className="font-bold">{t.cachingStatus}</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-mono">
                                {isFetchingRates ? 'Syncing...' : dataSource === 'cached' ? 'Cached (LocalStorage)' : 'Live (HKMA)'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Clock className="w-3 h-3" />
                                <span className="font-bold">Data Date</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {lastRateUpdate ? lastRateUpdate.toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-6">
                        {/* Nightly Batch */}
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Server className="w-5 h-5 text-slate-600" />
                              <h4 className="text-sm font-bold text-slate-800">Nightly Batch</h4>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${batchStatus === 'running' ? 'bg-blue-100 text-blue-700' : batchStatus === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                              {batchStatus === 'idle' ? 'Idle' : batchStatus === 'running' ? 'Running' : 'Completed'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            Automated overnight processing tasks. Execute manually if needed for off-cycle updates.
                          </p>

                          {/* Progress output */}
                          {batchStatus !== 'idle' && (
                            <div className="mb-4 bg-slate-900 rounded p-3 font-mono text-[10px] text-emerald-400 h-32 overflow-y-auto border border-slate-800">
                              {batchLogs.map((log, i) => (
                                <div key={i} className="mb-1 opacity-90">{log}</div>
                              ))}
                              {batchStatus === 'running' && (
                                <div className="animate-pulse">_</div>
                              )}
                            </div>
                          )}

                          {/* Progress Bar */}
                          {batchStatus === 'running' && (
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-4 overflow-hidden">
                              <div className="bg-[#c5a059] h-1.5 rounded-full transition-all duration-500" style={{ width: `${batchProgress}%` }}></div>
                            </div>
                          )}

                          <button
                            onClick={runBatch}
                            disabled={batchStatus === 'running'}
                            className={`w-full py-2 px-4 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${batchStatus === 'running'
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-[#c5a059] hover:text-[#c5a059]'
                              }`}
                          >
                            {batchStatus === 'running' ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Processing...
                              </>
                            ) : batchStatus === 'success' ? (
                              <>
                                <RefreshCw className="w-3 h-3" />
                                Re-Run Batch
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                Run Manually
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Global Risk Limits */}
                  <Card title={t.riskLimits} subtitle="Bank-wide Controls">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputField
                        label={t.globalMinSpread}
                        value={globalMinSpread}
                        onChange={setGlobalMinSpread}
                        step={0.05}
                        suffix="%"
                      />
                      <InputField
                        label={t.globalMaxLtv}
                        value={globalMaxLTV}
                        onChange={setGlobalMaxLTV}
                        step={1}
                        suffix="%"
                      />
                    </div>
                    <div className="mt-2 p-4 bg-yellow-50 border border-yellow-100 rounded flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-none mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-1">Override Warning</h5>
                        <p className="text-xs text-yellow-700 leading-relaxed">
                          Changing these global parameters will trigger a compliance review for all existing proposals currently in "Draft" status.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Compliance & Regulatory */}
                  <Card title={t.compliance} subtitle="Jurisdiction Settings">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                      <SelectField
                        label={t.regulatoryMode}
                        value={regulatoryMode}
                        onChange={setRegulatoryMode}
                        options={[{ value: 'hkma', label: 'HKMA (Hong Kong)' }, { value: 'mas', label: 'MAS (Singapore)' }, { value: 'cbirc', label: 'CBIRC (China)' }]}
                      />
                      <ToggleField
                        label={t.autoHedging}
                        checked={autoHedging}
                        onChange={setAutoHedging}
                      />
                    </div>
                    <div className="border-t border-slate-100 pt-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Disclaimer Preview</h4>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 font-mono leading-relaxed">
                        {regulatoryMode === 'hkma'
                          ? "This document is for High Net Worth Individuals only. The risks of borrowing to finance the purchase of an insurance policy are significant. If the value of your policy falls below a certain level, you may be called upon to pay margin."
                          : "This document is intended for Accredited Investors. Leverage involves a high degree of risk. Ensure you understand the impact of currency fluctuation and interest rate hikes on your net equity."
                        }
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeView === 'pdfPreview' && (
                <div className="space-y-8 animate-in fade-in duration-700">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-lg border border-slate-200 shadow-sm sticky top-24 z-20 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-[#f8fafc] flex items-center justify-center border border-slate-200">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg text-slate-900">{t.pdfPreview}</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">A4 Landscape • 8-Page Professional Suite</p>
                      </div>
                    </div>

                    {/* Quick Edit Inputs */}
                    <div className="flex-1 flex flex-col sm:flex-row gap-4 px-4 w-full md:w-auto">
                      <div className="flex-1">
                        <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">
                          {lang === 'en' ? 'Client Name' : '客戶姓名'}
                        </label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#c5a059]"
                          placeholder={lang === 'en' ? 'Enter Client Name' : '輸入客戶姓名'}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">
                          {lang === 'en' ? 'Representative' : '代表姓名'}
                        </label>
                        <input
                          type="text"
                          value={representativeName}
                          onChange={(e) => setRepresentativeName(e.target.value)}
                          className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#c5a059]"
                          placeholder={lang === 'en' ? 'Enter Rep Name' : '輸入代表姓名'}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button
                        onClick={() => setActiveView('allocation')}
                        className="flex-1 md:flex-none py-2.5 px-6 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        {lang === 'en' ? 'Back' : '返回'}
                      </button>
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-8 bg-[#c5a059] hover:bg-[#b45309] text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50"
                      >
                        {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {lang === 'en' ? 'Generate PDF' : '生成報告'}
                      </button>
                    </div>
                  </div>

                  <div className="w-full flex flex-col items-center force-preview overflow-x-hidden pt-4 pb-20">
                    <div className="transform scale-[0.4] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.85] xl:scale-100 origin-top flex flex-col items-center">
                      <PDFProposal
                        projectionData={projectionData}
                        lang={lang}
                        budget={budget}
                        totalPremium={totalPremium}
                        bankLoan={bankLoan}
                        roi={roi}
                        netEquityAt30={projectionData?.[projectionData.length - 1]?.netEquity || 0}
                        propertyValue={propertyValue}
                        unlockedCash={unlockedCash}
                        hibor={hibor}
                        currentMtgRate={effectiveMortgageRate}
                        cashReserve={cashReserve}
                        netBondPrincipal={netBondPrincipal}
                        pfEquity={pfEquity}
                        fundSource={fundSource}
                        clientName={clientName}
                        representativeName={representativeName}
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div >
        </div >

        {/* Footer with Disclaimer */}
        < footer className="mt-12 py-8 border-t border-slate-200 text-center bg-slate-50" >
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-4xl mx-auto px-6">
            {t.globalDisclaimer}
          </p>
          <p className="text-[10px] text-slate-300 mt-4 font-mono uppercase tracking-widest">
            © 2024 Private Wealth Management. Confidential & Proprietary.
          </p>
        </footer >

      </main >

      <div className="pdf-container" ref={pdfRef}>
        <PDFProposal
          projectionData={projectionData}
          lang={lang}
          budget={budget}
          totalPremium={totalPremium}
          bankLoan={bankLoan}
          roi={roi}
          netEquityAt30={projectionData?.[projectionData.length - 1]?.netEquity || 0}
          propertyValue={propertyValue}
          unlockedCash={unlockedCash}
          hibor={hibor}
          currentMtgRate={effectiveMortgageRate}
          cashReserve={cashReserve}
          netBondPrincipal={netBondPrincipal}
          pfEquity={pfEquity}
          fundSource={fundSource}
          clientName={clientName}
          representativeName={representativeName}
        />
      </div>
    </div >
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);