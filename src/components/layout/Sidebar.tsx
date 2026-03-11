import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronLeft,
    X,
    PieChart,
    TrendingUp,
    Briefcase,
    AlertTriangle,
    FileText,
    Settings,
    Landmark,
    Download,
    Loader2,
    Home,
    Wallet,
    ArrowRight,
    TrendingDown,
    Activity,
    PlusCircle,
    MinusCircle,
    Globe
} from 'lucide-react';
import { Language } from '../../types';
import { Card } from '../ui/Card';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { ToggleField } from '../ui/ToggleField';
import { formatCurrency, formatPercent } from '../../utils/calculations';

interface SidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
    lang: Language;
    fundSource: 'cash' | 'mortgage';
    setFundSource: (source: 'cash' | 'mortgage') => void;
    budget: number;
    extraCash: number;
    setExtraCash: (val: number) => void;
    tempBudget: number;
    setTempBudget: (val: number) => void;
    setBudget: (val: number) => void;
    cashReserve: number;
    tempCashReserve: number;
    setTempCashReserve: (val: number) => void;
    setCashReserve: (val: number) => void;
    bondAlloc: number;
    setBondAlloc: (val: number) => void;
    bondYield: number;
    setBondYield: (val: number) => void;
    hibor: number;
    setHibor: (val: number) => void;
    spread: number;
    setSpread: (val: number) => void;
    capRate: number;
    setCapRate: (val: number) => void;
    leverageLTV: number;
    setLeverageLTV: (val: number) => void;
    handlingFee: number;
    setHandlingFee: (val: number) => void;
    interestBasis: 'hibor' | 'cof';
    setInterestBasis: (basis: 'hibor' | 'cof') => void;
    cofRate: number;
    setCofRate: (val: number) => void;
    propertyValue: number;
    setPropertyValue: (val: number) => void;
    existingMortgage: number;
    setExistingMortgage: (val: number) => void;
    mortgageLtv: number;
    setMortgageLtv: (val: number) => void;
    primeRate: number;
    setPrimeRate: (val: number) => void;
    mortgageHSpread: number;
    setMortgageHSpread: (val: number) => void;
    mortgagePModifier: number;
    setMortgagePModifier: (val: number) => void;
    mortgageTenor: number;
    setMortgageTenor: (val: number) => void;
    simulatedHibor: number;
    setSimulatedHibor: (val: number) => void;
    bondPriceDrop: number;
    setBondPriceDrop: (val: number) => void;
    showGuaranteed: boolean;
    setShowGuaranteed: (val: boolean) => void;
    isStale: boolean;
    refreshHibor: () => void;
    onDownloadPDF: () => void;
    isGeneratingPDF: boolean;
    labels: any;
    addNotification: (notif: any) => void;
    onCollapsedChange?: (collapsed: boolean) => void;
}

export const Sidebar = ({
    activeView,
    onViewChange,
    lang,
    fundSource,
    setFundSource,
    budget,
    extraCash,
    setExtraCash,
    tempBudget,
    setTempBudget,
    setBudget,
    cashReserve,
    tempCashReserve,
    setTempCashReserve,
    setCashReserve,
    bondAlloc,
    setBondAlloc,
    bondYield,
    setBondYield,
    hibor,
    setHibor,
    spread,
    setSpread,
    capRate,
    setCapRate,
    leverageLTV,
    setLeverageLTV,
    handlingFee,
    setHandlingFee,
    interestBasis,
    setInterestBasis,
    cofRate,
    setCofRate,
    propertyValue,
    setPropertyValue,
    existingMortgage,
    setExistingMortgage,
    mortgageLtv,
    setMortgageLtv,
    primeRate,
    setPrimeRate,
    mortgageHSpread,
    setMortgageHSpread,
    mortgagePModifier,
    setMortgagePModifier,
    mortgageTenor,
    setMortgageTenor,
    simulatedHibor,
    setSimulatedHibor,
    bondPriceDrop,
    setBondPriceDrop,
    showGuaranteed,
    setShowGuaranteed,
    isStale,
    refreshHibor,
    onDownloadPDF,
    isGeneratingPDF,
    labels,
    addNotification,
    onCollapsedChange
}: SidebarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isFullPayment, setIsFullPayment] = useState(existingMortgage === 0);

    const handleCollapseToggle = () => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        onCollapsedChange?.(next);
    };

    const menuItems = [
        { id: 'allocation', label: labels.allocationStructure, icon: PieChart },
        { id: 'returnStudio', label: labels.returnStudio, icon: TrendingUp },
        { id: 'holdings', label: labels.holdingsAnalysis, icon: Briefcase },
        { id: 'marketRisk', label: labels.marketRisk, icon: AlertTriangle },
        { id: 'pdfPreview', label: labels.pdfPreview, icon: FileText },
        { id: 'systemConfig', label: labels.systemConfig, icon: Settings },
    ];

    const handleApplyCash = () => {
        setBudget(tempBudget);
        setCashReserve(tempCashReserve);
        addNotification({
            title: 'Capital Applied',
            message: 'Financial model updated with new cash parameters.',
            type: 'success'
        });
    };

    const handleApplyCapital = () => {
        setBudget(unlockedCash + extraCash);
        setCashReserve(extraCash);
        addNotification({
            title: 'Capital Applied',
            message: 'Mortgage refi capital deployed to strategy.',
            type: 'success'
        });
    };

    const unlockedCash = Math.max(0, (propertyValue * (mortgageLtv / 100)) - existingMortgage);
    const pfEquity = budget - cashReserve - bondAlloc;

    return (
        <>
            <div
                className={`fixed inset-0 bg-slate-900/50 z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />

            <aside
                className={`fixed top-0 left-0 h-full bg-[#020617] text-white z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 border-r border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-16' : 'w-72'}`}
            >
                <div className={`border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between p-6'}`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#c5a059] to-[#b45309] flex items-center justify-center shadow-lg shadow-orange-900/20">
                                <Landmark className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="font-serif text-lg font-bold tracking-tight text-white">{labels.privateWealth}</div>
                                <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400">{labels.wealthManagement}</div>
                            </div>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-[#c5a059] to-[#b45309] flex items-center justify-center">
                            <Landmark className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        {/* Desktop collapse toggle */}
                        <button
                            onClick={handleCollapseToggle}
                            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                        {/* Mobile close */}
                        <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id)}
                                title={isCollapsed ? item.label : undefined}
                                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} ${isActive
                                    ? 'bg-[#c5a059] text-white shadow-lg shadow-orange-900/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                                {!isCollapsed && item.label}
                                {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/70" />}
                            </button>
                        );
                    })}

                    {!isCollapsed && <div className="mt-8 px-4 space-y-6 bg-slate-900/50 py-6 rounded-xl border border-slate-800/50 mx-1">
                        {activeView === 'marketRisk' ? (
                            <div className="space-y-6">
                                <InputField
                                    label={labels.simulatedHibor}
                                    value={simulatedHibor}
                                    onChange={setSimulatedHibor}
                                    step={0.1}
                                    suffix="%"
                                />
                                <InputField
                                    label={labels.bondPriceDrop}
                                    value={bondPriceDrop}
                                    onChange={setBondPriceDrop}
                                    step={5}
                                    suffix="%"
                                />
                                <ToggleField
                                    label={labels.showGuaranteed}
                                    checked={showGuaranteed}
                                    onChange={setShowGuaranteed}
                                />
                            </div>
                        ) : activeView === 'systemConfig' ? (
                            <div className="p-4 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold border border-slate-800 rounded">
                                System Mode Active
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex bg-slate-800/50 p-1 rounded-lg">
                                    <button
                                        onClick={() => setFundSource('cash')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${fundSource === 'cash' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
                                    >
                                        {labels.cashSource}
                                    </button>
                                    <button
                                        onClick={() => setFundSource('mortgage')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${fundSource === 'mortgage' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
                                    >
                                        {labels.mortgageRefi}
                                    </button>
                                </div>

                                {fundSource === 'cash' ? (
                                    <div className="space-y-4">
                                        <InputField label={labels.totalBudget} value={tempBudget} onChange={setTempBudget} dark />
                                        <InputField label={labels.cashReserve} value={tempCashReserve} onChange={setTempCashReserve} dark />
                                        <button
                                            onClick={handleApplyCash}
                                            className="w-full py-2 bg-[#c5a059] hover:bg-[#b45309] text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors"
                                        >
                                            {labels.applyCapital}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex bg-slate-800/30 p-1 rounded-md mb-2">
                                            <button
                                                onClick={() => { setIsFullPayment(true); setExistingMortgage(0); }}
                                                className={`flex-1 py-1 text-[9px] font-bold uppercase rounded transition-all ${isFullPayment ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                            >
                                                {labels.fullPayment}
                                            </button>
                                            <button
                                                onClick={() => setIsFullPayment(false)}
                                                className={`flex-1 py-1 text-[9px] font-bold uppercase rounded transition-all ${!isFullPayment ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                            >
                                                {labels.remortgage}
                                            </button>
                                        </div>
                                        <InputField label={labels.propertyValue} value={propertyValue} onChange={setPropertyValue} dark />
                                        {!isFullPayment && <InputField label={labels.existingLoan} value={existingMortgage} onChange={setExistingMortgage} dark />}
                                        <InputField label={labels.inputCash} value={extraCash} onChange={setExtraCash} dark />
                                        <div className="bg-emerald-900/20 p-3 rounded border border-emerald-800/30 mb-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-500 uppercase">
                                                <span>{labels.unlockedCapital}</span>
                                                <span>{formatCurrency(unlockedCash + extraCash)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleApplyCapital}
                                            className="w-full py-2 bg-[#c5a059] hover:bg-[#b45309] text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors"
                                        >
                                            {labels.applyCapital}
                                        </button>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-800">
                                    <InputField label={labels.bondFund} value={bondAlloc} onChange={setBondAlloc} dark />
                                    <InputField label={labels.bondYield} value={bondYield} onChange={setBondYield} prefix="" step={0.1} suffix="%" dark />
                                </div>

                                <div className="pt-4 border-t border-slate-800 flex justify-between items-baseline">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{labels.policyEquity}</span>
                                    <span className={`text-base font-serif ${pfEquity < 0 ? 'text-red-400' : 'text-[#c5a059]'}`}>
                                        {formatCurrency(pfEquity)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>}
                </nav>

                <div className={`border-t border-slate-800 bg-[#0f172a]/50 ${isCollapsed ? 'p-3' : 'p-6'}`}>
                    <button
                        onClick={() => activeView === 'pdfPreview' ? onDownloadPDF() : onViewChange('pdfPreview')}
                        disabled={isGeneratingPDF}
                        title={isCollapsed ? (activeView === 'pdfPreview' ? (lang === 'en' ? 'Download PDF' : '導出報告') : (lang === 'en' ? 'Generate Report' : '生成報告')) : undefined}
                        className={`w-full flex items-center justify-center gap-3 bg-[#c5a059] hover:bg-[#b45309] text-white rounded-xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-orange-900/40 disabled:opacity-50 active:scale-95 ${isCollapsed ? 'py-3 px-2 text-xs' : 'py-4 px-4 text-sm'}`}
                    >
                        {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : activeView === 'pdfPreview' ? <Download className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        {!isCollapsed && (activeView === 'pdfPreview'
                            ? (lang === 'en' ? 'Download PDF' : '導出報告')
                            : (lang === 'en' ? 'Generate Report' : '生成報告'))}
                    </button>

                    {!isCollapsed && <div className="flex items-center justify-between text-[9px] text-slate-600 font-mono mt-4">
                        <span>v3.0.0 (Refactored)</span>
                        {isGeneratingPDF && <span className="text-[#c5a059] animate-pulse">Processing...</span>}
                    </div>}
                </div>
            </aside>
        </>
    );
};
