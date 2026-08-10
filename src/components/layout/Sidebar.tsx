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
import { Card } from '../ui/Card';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { ToggleField } from '../ui/ToggleField';
import { formatCurrency, formatPercent } from '../../utils/calculations';
import { useApp, useServices } from '../../state';

interface SidebarProps {
    onCollapsedChange?: (collapsed: boolean) => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

export const Sidebar = ({
    onCollapsedChange,
    isMobileOpen,
    onMobileClose,
}: SidebarProps) => {
    const { t: labels, activeView, setActiveView: onViewChange, lang, fundSource, setFundSource, extraCash, setExtraCash, tempBudget, setTempBudget, setBudget, tempCashReserve, setTempCashReserve, setCashReserve, budget, cashReserve, bondAlloc, setBondAlloc, bondYield, setBondYield, bondCollateralLTV, setBondCollateralLTV, bondLoanSpread, setBondLoanSpread, projection, hibor, spread, setSpread, capRate, setCapRate, leverageLTV, setLeverageLTV, handlingFee, setHandlingFee, interestBasis, setInterestBasis, cofRate, setCofRate, properties, addProperty, removeProperty, updateProperty, simulatedHibor, setSimulatedHibor, bondPriceDrop, setBondPriceDrop, showGuaranteed, setShowGuaranteed, isGeneratingPDF, unlockedCash, primeRate, setPrimeRate, mortgageHSpread, setMortgageHSpread, mortgagePModifier, setMortgagePModifier, fxRate, setFxRate, policyRebateBands, addRebateBand, removeRebateBand, updateRebateBand, bankCashRebate, setBankCashRebate, fundFeeRebate, setFundFeeRebate, assetLoanHandlingFee, setAssetLoanHandlingFee, minPremiumUsd, setMinPremiumUsd } = useApp();
    const { addNotification, onDownloadPDF } = useServices();
    // pfEquity comes from the projection engine rather than being recomputed here. A local
    // copy once used raw values while the engine clamps cashReserve to budget, so the two
    // could disagree on screen.
    const { pfEquity } = useApp().projection;
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showRateAssumptions, setShowRateAssumptions] = useState(false);
    const [showRebatesFees, setShowRebatesFees] = useState(false);

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
        // `budget` is the mortgage cash-out ALONE; the client's injected cash reaches the
        // engine as its own `extraCash` input. Folding both into budget and then parking
        // the same amount in cashReserve — which is what this used to do — cancelled the
        // injection out of equity while still inflating the ROI denominator, so entering
        // Input Cash lowered the quoted return without buying any more policy.
        setBudget(unlockedCash);
        // Mirror the write like handleApplyCash and applyInputPatch do. tempBudget is
        // the cash panel's pending edit; leaving it behind here meant that after a
        // mortgage Apply, the Total Budget field displayed the stale cash-mode figure,
        // and one click of the cash panel's Apply silently reverted the engine to it.
        setTempBudget(unlockedCash);
        setCashReserve(tempCashReserve);
        addNotification({
            title: 'Capital Applied',
            message: 'Mortgage refi capital deployed to strategy.',
            type: 'success'
        });
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-slate-900/50 z-40 transition-opacity duration-300 lg:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onMobileClose}
            />

            <aside
                className={`fixed top-0 left-0 h-[100dvh] bg-[#020617] text-white z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 border-r border-slate-800 flex flex-col w-72 sm:w-80 max-w-[85vw] ${isMobileOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'} lg:visible ${isCollapsed ? 'lg:w-16' : 'lg:w-72'}`}
            >
                <div className={`border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between p-6'}`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#c5a059] to-[#b45309] flex items-center justify-center shadow-lg shadow-orange-900/20">
                                <Landmark className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="font-serif text-lg font-bold tracking-tight text-white">{labels.privateWealth}</div>
                                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{labels.wealthManagement}</div>
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
                            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                        {/* Mobile close */}
                        <button
                            onClick={onMobileClose}
                            aria-label="Close menu"
                            className="lg:hidden w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white -mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded"
                        >
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
                                onClick={() => { onViewChange(item.id); onMobileClose(); }}
                                title={isCollapsed ? item.label : undefined}
                                // Navy-on-gold, not white-on-gold: white on #c5a059 is 2.46:1,
                                // navy #020617 on it is 8.2:1 (WCAG AA needs 4.5:1 at this size).
                                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} ${isActive
                                    ? 'bg-[#c5a059] text-[#020617] font-bold shadow-lg shadow-orange-900/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#020617]' : 'text-slate-500 group-hover:text-white'}`} />
                                {!isCollapsed && item.label}
                                {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 ml-auto text-[#020617]/70" />}
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
                                    prefix=""
                                    step={0.1}
                                    suffix="%"
                                    dark
                                />
                                <InputField
                                    label={labels.bondPriceDrop}
                                    value={bondPriceDrop}
                                    onChange={setBondPriceDrop}
                                    prefix=""
                                    step={5}
                                    suffix="%"
                                    dark
                                />
                                <ToggleField
                                    label={labels.showGuaranteed}
                                    checked={showGuaranteed}
                                    onChange={setShowGuaranteed}
                                    dark
                                />
                            </div>
                        ) : activeView === 'systemConfig' ? (
                            <div className="p-4 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold border border-slate-800 rounded">
                                System Mode Active
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex bg-slate-800/50 p-1 rounded-lg">
                                    <button
                                        onClick={() => setFundSource('cash')}
                                        className={`min-w-0 flex-1 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] ${fundSource === 'cash' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
                                    >
                                        {labels.cashSource}
                                    </button>
                                    <button
                                        onClick={() => setFundSource('mortgage')}
                                        className={`min-w-0 flex-1 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] ${fundSource === 'mortgage' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
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
                                            className="w-full min-h-[44px] py-2 bg-[#c5a059] hover:bg-[#e4c685] text-[#020617] text-[10px] font-bold uppercase tracking-widest rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                        >
                                            {labels.applyCapital}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-5">
                                            {properties.map((property, index) => (
                                                <div key={index} className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                                                    <div className="flex items-center justify-between gap-3 mb-5">
                                                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                                                            {labels.propertyLabel} {index + 1}
                                                        </h3>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeProperty(index)}
                                                            disabled={properties.length <= 1}
                                                            aria-label={`${labels.removeProperty} ${labels.propertyLabel} ${index + 1}`}
                                                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded"
                                                        >
                                                            <MinusCircle className="w-4 h-4" />
                                                            {labels.removeProperty}
                                                        </button>
                                                    </div>
                                                    <InputField label={labels.propVal} value={property.value} onChange={value => updateProperty(index, { value })} dark />
                                                    <InputField label={labels.mortgageLtvLabel} value={property.ltv} onChange={ltv => updateProperty(index, { ltv })} prefix="" step={5} suffix="%" dark />
                                                    <InputField label={labels.existingLoan} value={property.existingMortgage} onChange={existingMortgage => updateProperty(index, { existingMortgage })} dark />
                                                    <InputField label={labels.mortgageTenorLabel} value={property.tenor} onChange={tenor => updateProperty(index, { tenor })} prefix="" step={5} suffix="YRS" dark />
                                                    <InputField label={labels.mortgageRate} value={property.rate} onChange={rate => updateProperty(index, { rate })} prefix="" step={0.05} suffix="%" dark />
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addProperty}
                                            disabled={properties.length >= 8}
                                            className="w-full flex items-center justify-center gap-2 min-h-[44px] py-2 border border-slate-700 hover:border-[#c5a059] text-slate-300 hover:text-[#e4c685] text-[10px] font-bold uppercase tracking-widest rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            {labels.addProperty}
                                        </button>
                                        <InputField label={labels.inputCash} value={extraCash} onChange={setExtraCash} dark />
                                        {/* The reserve used to be set implicitly to whatever Input Cash
                                            held, which is why this panel never needed a field for it.
                                            Now that injected cash buys policy, the reserve has to be
                                            stated — otherwise the mortgage path has no way to hold a
                                            liquidity buffer at all. Same temp-then-apply mirror as the
                                            cash panel, so both tabs commit on the same button. */}
                                        <InputField label={labels.cashReserve} value={tempCashReserve} onChange={setTempCashReserve} dark />
                                        <button
                                            onClick={() => setShowRateAssumptions(v => !v)}
                                            aria-expanded={showRateAssumptions}
                                            className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-200 transition-colors min-h-[44px] py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded"
                                        >
                                            <span>{labels.rateAssumptions}</span>
                                            <span>{showRateAssumptions ? '−' : '+'}</span>
                                        </button>
                                        {showRateAssumptions && (
                                            <div className="space-y-4 pt-2">
                                                <InputField label={labels.primeRateLabel} value={primeRate} onChange={setPrimeRate} prefix="" step={0.125} suffix="%" dark />
                                                <InputField label={labels.hSpreadLabel} value={mortgageHSpread} onChange={setMortgageHSpread} prefix="" step={0.05} suffix="%" dark />
                                                <InputField label={labels.pModifierLabel} value={mortgagePModifier} onChange={setMortgagePModifier} prefix="" step={0.05} suffix="%" dark />
                                            </div>
                                        )}
                                        <div className="bg-emerald-900/20 p-3 rounded border border-emerald-800/30 mb-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-500 uppercase">
                                                <span>{labels.totalAvailableCapital}</span>
                                                <span>{formatCurrency(unlockedCash + extraCash)}</span>
                                            </div>
                                        </div>
                                        {/* Both sides are totals, because injected cash now reaches the
                                            engine on its own input: what is applied is budget + extraCash,
                                            what is available is unlockedCash + extraCash. */}
                                        {Math.abs(budget - unlockedCash) > 1 && (
                                            <div className="-mt-2 flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                                <AlertTriangle className="w-3.5 h-3.5 flex-none" />
                                                <span>{labels.budgetMismatchWarning} ({formatCurrency(budget + extraCash)} vs {formatCurrency(unlockedCash + extraCash)})</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleApplyCapital}
                                            className="w-full min-h-[44px] py-2 bg-[#c5a059] hover:bg-[#e4c685] text-[#020617] text-[10px] font-bold uppercase tracking-widest rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                        >
                                            {labels.applyCapital}
                                        </button>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-800">
                                    <InputField label={labels.bondFund} value={bondAlloc} onChange={setBondAlloc} dark />
                                    {/* The engine silently clamps bondAlloc to what the capital can fund
                                        (calculations.ts). Without this the field kept showing the larger
                                        entry while every projection ran on the smaller number. Read off
                                        the engine's own deployedCapital rather than recomputing
                                        budget + extraCash here, so the two cannot drift. */}
                                    {bondAlloc > Math.max(0, projection.deployedCapital - cashReserve) && (
                                        <div className="-mt-3 mb-5 md:mb-8 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                            {labels.bondFundCapped} {formatCurrency(Math.max(0, projection.deployedCapital - cashReserve))}
                                        </div>
                                    )}
                                    <InputField label={labels.bondYield} value={bondYield} onChange={setBondYield} prefix="" step={0.1} suffix="%" dark />
                                </div>

                                {/* Second leverage layer: pledge the bond fund, borrow against it, and
                                    use the proceeds as extra down payment. 0 = not drawn, which is the
                                    default and the "lower risk" position. The drawn figure is shown
                                    because the pledge is taken on the fund NET of the handling fee, so
                                    a % of the headline allocation would be the wrong number. */}
                                <div className="pt-4 border-t border-slate-800">
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">{labels.bondCollateralLoan}</div>
                                    <InputField label={labels.bondCollateralLTV} value={bondCollateralLTV} onChange={setBondCollateralLTV} prefix="" step={5} suffix="%" dark />
                                    {bondCollateralLTV > 0 ? (
                                        <>
                                            <div className="-mt-3 mb-5 md:mb-8 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                                {labels.bondCollateralDrawn} {formatCurrency(projection.bondLoan)}
                                            </div>
                                            <InputField label={labels.bondLoanSpread} value={bondLoanSpread} onChange={setBondLoanSpread} prefix="" step={0.1} suffix="%" dark />
                                        </>
                                    ) : (
                                        <div className="-mt-3 mb-5 md:mb-8 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            {labels.bondCollateralOff}
                                        </div>
                                    )}
                                </div>

                                {/* Rebates & one-off fees — contracted bank terms, so they live behind a
                                    collapse like Rate Assumptions and default to the engine's no-ops.
                                    Band rates are stored as DECIMALS (0.01 = 1%) to match the engine and
                                    the workbook's VLOOKUP table; the ×100/÷100 here is the only place
                                    the percent representation exists. */}
                                <div className="pt-4 border-t border-slate-800">
                                    <button
                                        onClick={() => setShowRebatesFees(v => !v)}
                                        aria-expanded={showRebatesFees}
                                        className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-200 transition-colors min-h-[44px] py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded"
                                    >
                                        <span>{labels.rebatesFeesSection}</span>
                                        <span>{showRebatesFees ? '−' : '+'}</span>
                                    </button>
                                    {showRebatesFees && (
                                        <div className="space-y-4 pt-4">
                                            <InputField label={labels.fxRateLabel} value={fxRate} onChange={setFxRate} prefix="" step={0.05} dark />
                                            <InputField label={labels.bankCashRebateLabel} value={bankCashRebate} onChange={setBankCashRebate} dark />
                                            <InputField label={labels.fundFeeRebateLabel} value={fundFeeRebate} onChange={setFundFeeRebate} dark />
                                            <InputField label={labels.assetLoanFeeLabel} value={assetLoanHandlingFee} onChange={setAssetLoanHandlingFee} prefix="" step={0.05} suffix="%" dark />
                                            <InputField label={labels.minPremiumUsdLabel} value={minPremiumUsd} onChange={setMinPremiumUsd} step={1000} dark />

                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{labels.rebateBandsLabel}</div>
                                            {policyRebateBands.map((band, index) => (
                                                <div key={index} className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                                                    <div className="flex items-center justify-between gap-3 mb-5">
                                                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                                                            {labels.bandLabel} {index + 1}
                                                        </h3>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRebateBand(index)}
                                                            aria-label={`${labels.removeBand} ${labels.bandLabel} ${index + 1}`}
                                                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded"
                                                        >
                                                            <MinusCircle className="w-4 h-4" />
                                                            {labels.removeBand}
                                                        </button>
                                                    </div>
                                                    <InputField label={labels.bandMinPremiumLabel} value={band.minPremiumUsd} onChange={minPremiumUsd => updateRebateBand(index, { minPremiumUsd })} step={100000} dark />
                                                    <InputField label={labels.bandRateLabel} value={band.rate * 100} onChange={pctValue => updateRebateBand(index, { rate: pctValue / 100 })} prefix="" step={0.5} suffix="%" dark />
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={addRebateBand}
                                                disabled={policyRebateBands.length >= 8}
                                                className="w-full flex items-center justify-center gap-2 min-h-[44px] py-2 border border-slate-700 hover:border-[#c5a059] text-slate-300 hover:text-[#e4c685] text-[10px] font-bold uppercase tracking-widest rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                                            >
                                                <PlusCircle className="w-4 h-4" />
                                                {labels.addBand}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Premium Financing Loan Interest */}
                                <div className="pt-4 border-t border-slate-800 space-y-4">
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{labels.loanInterest}</div>
                                    <div className="flex bg-slate-800/50 p-1 rounded-lg">
                                        <button
                                            onClick={() => setInterestBasis('hibor')}
                                            className={`min-w-0 flex-1 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] ${interestBasis === 'hibor' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
                                        >
                                            HIBOR
                                        </button>
                                        <button
                                            onClick={() => setInterestBasis('cof')}
                                            className={`min-w-0 flex-1 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] ${interestBasis === 'cof' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
                                        >
                                            COF
                                        </button>
                                    </div>
                                    {interestBasis === 'hibor' ? (
                                        <>
                                            <InputField label={`${labels.hiborRate} (HKMA API)`} value={hibor} onChange={() => {}} prefix="" step={0.01} suffix="%" disabled={true} dark />
                                            <InputField label={labels.spread} value={spread} onChange={setSpread} prefix="" step={0.1} suffix="%" dark />
                                        </>
                                    ) : (
                                        <InputField label={labels.cofRate} value={cofRate} onChange={setCofRate} prefix="" step={0.01} suffix="%" dark />
                                    )}
                                    <InputField label={labels.capRate} value={capRate} onChange={setCapRate} prefix="" step={0.1} suffix="%" dark />
                                    <InputField label={labels.leverageLtv} value={leverageLTV} onChange={setLeverageLTV} prefix="" step={1} suffix="%" dark />
                                    <InputField label={labels.handlingFee} value={handlingFee} onChange={setHandlingFee} prefix="" step={0.1} suffix="%" dark />
                                </div>

                                <div className="pt-4 border-t border-slate-800 flex justify-between items-baseline">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{labels.policyEquity}</span>
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
                        className={`w-full flex items-center justify-center gap-3 bg-[#c5a059] hover:bg-[#e4c685] text-[#020617] rounded-xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-orange-900/40 disabled:opacity-50 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${isCollapsed ? 'py-3 px-2 text-xs' : 'py-4 px-4 text-sm'}`}
                    >
                        {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : activeView === 'pdfPreview' ? <Download className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        {!isCollapsed && (activeView === 'pdfPreview'
                            ? (lang === 'en' ? 'Download PDF' : '導出報告')
                            : (lang === 'en' ? 'Generate Report' : '生成報告'))}
                    </button>

                    {!isCollapsed && <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-4">
                        <span>v3.0.0 (Refactored)</span>
                        {isGeneratingPDF && <span className="text-[#c5a059] animate-pulse">Processing...</span>}
                    </div>}
                </div>
            </aside>
        </>
    );
};
