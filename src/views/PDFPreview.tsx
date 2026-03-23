import React from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { PDFProposal } from '../components/pdf/PDFProposal';
import { formatCurrency } from '../utils/calculations';
import { Language } from '../types';

interface PDFPreviewProps {
    t: any;
    lang: Language;
    clientName: string;
    setClientName: (name: string) => void;
    representativeName: string;
    setRepresentativeName: (name: string) => void;
    onNavigate: (view: string) => void;
    onDownloadPDF: () => void;
    isGeneratingPDF: boolean;
    totalPremium: number;
    bankLoan: number;
    projectionData: any[];
    roi: number;
    propertyValue: number;
    unlockedCash: number;
    hibor: number;
    effectiveMortgageRate: number;
    cashReserve: number;
    netBondPrincipal: number;
    pfEquity: number;
    fundSource: 'cash' | 'mortgage';
    sensitivityData: any;
    spread: number;
    leverageLTV: number;
    bondYield: number;
    sensitivityYear: number;
    budget: number;
    isSidebarCollapsed: boolean;
}

export const PDFPreview = ({
    t,
    lang,
    clientName,
    setClientName,
    representativeName,
    setRepresentativeName,
    onNavigate,
    onDownloadPDF,
    isGeneratingPDF,
    totalPremium,
    bankLoan,
    projectionData,
    roi,
    propertyValue,
    unlockedCash,
    hibor,
    effectiveMortgageRate,
    cashReserve,
    netBondPrincipal,
    pfEquity,
    fundSource,
    sensitivityData,
    spread,
    leverageLTV,
    bondYield,
    sensitivityYear,
    budget,
    isSidebarCollapsed
}: PDFPreviewProps) => {
    return (
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

                <div className="flex-1 flex flex-col sm:flex-row gap-4 px-4 w-full md:w-auto">
                    <div className="flex-1">
                        <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">
                            {lang === 'en' ? 'Client Name' : '客戶姓名'}
                        </label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-3 focus:outline-none focus:border-[#c5a059]"
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
                            className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-3 focus:outline-none focus:border-[#c5a059]"
                            placeholder={lang === 'en' ? 'Enter Rep Name' : '輸入代表姓名'}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => onNavigate('allocation')}
                        className="flex-1 md:flex-none py-2.5 px-6 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                    >
                        {lang === 'en' ? 'Back' : '返回'}
                    </button>
                    <button
                        onClick={onDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-8 bg-[#c5a059] hover:bg-[#b45309] text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50"
                    >
                        {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {lang === 'en' ? 'Generate PDF' : '生成報告'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-500">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{t.totalPolicyValue}</div>
                    <div className="text-lg font-serif font-bold text-slate-900">{formatCurrency(totalPremium)}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{t.lendingFacility}</div>
                    <div className="text-lg font-serif font-bold text-slate-900">{formatCurrency(bankLoan)}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{t.netEquityY30}</div>
                    <div className="text-lg font-serif font-bold text-[#c5a059]">{formatCurrency(projectionData?.[30]?.netEquity || 0)}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{t.projectedRoi}</div>
                    <div className="text-lg font-serif font-bold text-emerald-600">{roi.toFixed(1)}%</div>
                </div>
            </div>

            {/* Desktop: side nav, Mobile: bottom horizontal bar */}
            <div className={`fixed z-50
                bottom-4 left-4 right-4 ${isSidebarCollapsed ? 'lg:left-[86px]' : 'lg:left-[310px]'} lg:right-auto
                bg-white/30 backdrop-blur-2xl border border-white/40 rounded-2xl p-1.5
                shadow-[0_20px_50px_rgba(0,0,0,0.15)]
                flex lg:flex-col gap-1
                overflow-x-auto lg:overflow-x-visible
                transition-all duration-300 group hover:bg-white/40 ring-1 ring-white/20`}>
                {[
                    { id: 1, label: t.reportTabs.cover, icon: '01' },
                    { id: 2, label: t.reportTabs.summary, icon: '02' },
                    { id: 3, label: t.reportTabs.allocation, icon: '03' },
                    { id: 4, label: t.reportTabs.performance, icon: '04' },
                    { id: 5, label: t.reportTabs.holdings, icon: '05' },
                    { id: 6, label: t.reportTabs.calculation, icon: '06' },
                    { id: 7, label: t.reportTabs.ledger, icon: '07' },
                    { id: 8, label: t.reportTabs.risk, icon: '08' },
                    { id: 9, label: t.reportTabs.disclaimer, icon: '09' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            const el = document.getElementById(`report-page-${tab.id}`);
                            if (el) {
                                const offset = 120;
                                const bodyRect = document.body.getBoundingClientRect().top;
                                const elementRect = el.getBoundingClientRect().top;
                                const elementPosition = elementRect - bodyRect;
                                const offsetPosition = elementPosition - offset;

                                window.scrollTo({
                                    top: offsetPosition,
                                    behavior: 'smooth'
                                });
                            }
                        }}
                        className="relative flex items-center gap-3 p-2 min-w-[44px] min-h-[44px] hover:bg-white/40 rounded-xl transition-all duration-300"
                        title={tab.label}
                    >
                        <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/20 backdrop-blur-md shadow-inner text-[10px] font-bold text-slate-600 group-hover:bg-[#c5a059] group-hover:text-white transition-colors border border-white/30">{tab.icon}</span>
                        <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[200px]">
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="w-full flex flex-col items-center force-preview overflow-x-auto pt-4 pb-20">
                <div className="min-w-[1123px]">
                    <div className="transform origin-top flex flex-col items-center">
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
                            sensitivityData={sensitivityData}
                            clientName={clientName}
                            representativeName={representativeName}
                            spread={spread}
                            leverageLTV={leverageLTV}
                            bondYield={bondYield}
                            sensitivityYear={sensitivityYear}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
