import React, { useRef, useEffect, useMemo, Suspense, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { TRANSLATIONS } from './i18n';
import {
    Sidebar,
    Header,
    PrintStyles
} from './components/layout';
import {
    AllocationView,
    HoldingsView,
    MarketRiskView,
    ReturnStudio,
    SystemConfigView,
} from './views';
import {
    useAppState,
    useHibor,
    useBatchProcess,
    useNotificationState
} from './hooks';

// Lazy-load heavy PDF components
const PDFPreview = React.lazy(() => import('./views/PDFPreview').then(m => ({ default: m.PDFPreview })));
const PDFProposal = React.lazy(() => import('./components/pdf/PDFProposal').then(m => ({ default: m.PDFProposal })));

const App = () => {
    const state = useAppState();
    const {
        rate: liveRate,
        date: liveDate,
        isStale,
        refresh: refreshHibor
    } = useHibor();

    const {
        batchStatus,
        batchLogs,
        batchProgress,
        runBatch
    } = useBatchProcess();

    const t = useMemo(() => TRANSLATIONS[state.lang], [state.lang]);
    const {
        notifications,
        showNotifications,
        setShowNotifications,
        unreadCount,
        setUnreadCount,
        addNotification
    } = useNotificationState(t);

    const pdfRef = useRef<HTMLDivElement>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Sync live rate when it changes
    useEffect(() => {
        if (liveRate && state.dataSource === 'live') {
            state.setHibor(liveRate);
            state.setLastRateUpdate(new Date(liveDate));
        }
    }, [liveRate, liveDate, state.dataSource]);

    const handleExportCSV = () => {
        const headers = ['Year', 'Bond Interest', 'Cash Value', 'Bond Principal', 'Policy Value', 'Loan', 'Mortgage Balance', 'Mortgage Principal Repaid', 'Net Equity'];
        const projData = state.projection.projectionData;
        const initialMtgBalance = projData[0]?.mortgageBalance || 0;
        const csvContent = [
            headers.join(','),
            ...projData.map(row => {
                const mortgagePrincipalRepaid = Math.max(0, initialMtgBalance - (row.mortgageBalance || 0));
                return [
                    row.year,
                    row.cumulativeBondInterest,
                    row.cashValue,
                    row.bondPrincipal,
                    row.surrenderValue,
                    row.loan,
                    row.mortgageBalance || 0,
                    mortgagePrincipalRepaid,
                    row.netEquity
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `projection_${state.clientName.replace(/\s+/g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addNotification({
            title: 'Export Success',
            message: 'Projection data exported to CSV.',
            type: 'success'
        });
    };

    const handleDownloadPDF = async () => {
        state.setIsGeneratingPDF(true);
        addNotification({
            title: t.generatingPdf,
            message: 'Preparing high-resolution document...',
            type: 'info'
        });

        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: pdfRef.current?.innerHTML,
                    clientName: state.clientName
                }),
            });

            if (response.ok) {
                // API returns { url: signedUrl } — fetch the PDF from R2 and download
                const data = await response.json();
                if (data.url) {
                    const pdfResponse = await fetch(data.url);
                    if (!pdfResponse.ok) throw new Error(`Failed to fetch PDF from storage: ${pdfResponse.statusText}`);
                    const blob = await pdfResponse.blob();
                    const objectUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = `Premium_Financing_Proposal_${state.clientName}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(objectUrl);
                    document.body.removeChild(a);
                } else {
                    throw new Error(data.error || 'No URL returned from server');
                }
                addNotification({
                    title: 'PDF Complete',
                    message: 'Professional report has been generated.',
                    type: 'success'
                });
            } else {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error ${response.status}`);
            }
        } catch (error) {
            console.warn('Server PDF failed, falling back to client-side...', error);

            try {
                const element = pdfRef.current;
                if (!element) return;

                const pdf = new jsPDF('l', 'mm', 'a4');
                const pages = element.querySelectorAll('.page-break');

                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i] as HTMLElement;
                    const canvas = await html2canvas(page, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        windowWidth: 1123,
                        windowHeight: 794
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
                }

                pdf.save(`Proposal_${state.clientName}.pdf`);
                addNotification({
                    title: 'PDF Complete',
                    message: 'Client-side report generated (fallback).',
                    type: 'success'
                });
            } catch (fallbackError) {
                console.error('Client-side PDF also failed:', fallbackError);
                window.print();
            }
        } finally {
            state.setIsGeneratingPDF(false);
        }
    };

    const renderContent = () => {
        switch (state.activeView) {
            case 'allocation':
                return <AllocationView
                    t={t}
                    {...state.projection}
                    budget={state.budget}
                    cashReserve={state.cashReserve}
                    netBondPrincipal={state.projection.netBondPrincipal}
                    pfEquity={state.projection.pfEquity}
                    lang={state.lang}
                    fundSource={state.fundSource}
                    onNavigate={state.setActiveView}
                />;
            case 'holdings':
                return <HoldingsView
                    t={t}
                    projectionData={state.projection.projectionData}
                    chartFilters={state.chartFilters}
                    setChartFilters={state.setChartFilters}
                    fundSource={state.fundSource}
                    handleExportCSV={handleExportCSV}
                />;
            case 'marketRisk':
                return <MarketRiskView
                    t={t}
                    {...state.stressTest}
                    stressedProjection={state.stressTest.stressedProjection}
                    sensitivityYear={state.sensitivityYear}
                    setSensitivityYear={state.setSensitivityYear}
                    lang={state.lang}
                    onNavigate={state.setActiveView}
                />;
            case 'returnStudio':
                return <ReturnStudio
                    labels={t}
                    data={state.projection.projectionData}
                    bondYield={state.bondYield}
                    loanRate={state.hibor + state.spread}
                    budget={state.budget}
                    totalPremium={state.projection.totalPremium}
                />;
            case 'systemConfig':
                return <SystemConfigView
                    t={t}
                    dataSource={state.dataSource}
                    setDataSource={state.setDataSource}
                    isFetchingRates={state.isFetchingRates}
                    lastRateUpdate={state.lastRateUpdate}
                    batchStatus={batchStatus}
                    batchLogs={batchLogs}
                    batchProgress={batchProgress}
                    runBatch={runBatch}
                    globalMinSpread={state.globalMinSpread}
                    setGlobalMinSpread={state.setGlobalMinSpread}
                    globalMaxLTV={state.globalMaxLTV}
                    setGlobalMaxLTV={state.setGlobalMaxLTV}
                    regulatoryMode={state.regulatoryMode}
                    setRegulatoryMode={state.setRegulatoryMode}
                    autoHedging={state.autoHedging}
                    setAutoHedging={state.setAutoHedging}
                />;
            case 'pdfPreview':
                return <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-400">Loading report preview...</div>}>
                    <PDFPreview
                    t={t}
                    lang={state.lang}
                    clientName={state.clientName}
                    setClientName={state.setClientName}
                    representativeName={state.representativeName}
                    setRepresentativeName={state.setRepresentativeName}
                    onNavigate={state.setActiveView}
                    onDownloadPDF={handleDownloadPDF}
                    isGeneratingPDF={state.isGeneratingPDF}
                    totalPremium={state.projection.totalPremium}
                    bankLoan={state.projection.bankLoan}
                    projectionData={state.projection.projectionData}
                    roi={state.projection.roi}
                    propertyValue={state.propertyValue}
                    unlockedCash={state.unlockedCash}
                    hibor={state.hibor}
                    effectiveMortgageRate={state.effectiveMortgageRate}
                    cashReserve={state.cashReserve}
                    netBondPrincipal={state.projection.netBondPrincipal}
                    pfEquity={state.projection.pfEquity}
                    fundSource={state.fundSource}
                    sensitivityData={state.stressTest.sensitivityData}
                    spread={state.spread}
                    leverageLTV={state.leverageLTV}
                    bondYield={state.bondYield}
                    sensitivityYear={state.sensitivityYear}
                    budget={state.budget}
                    isSidebarCollapsed={isSidebarCollapsed}
                />
                </Suspense>;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-[#c5a059]/30">
            <PrintStyles />
            <div className="flex">
                <Sidebar
                    activeView={state.activeView}
                    onViewChange={state.setActiveView}
                    lang={state.lang}
                    fundSource={state.fundSource}
                    setFundSource={state.setFundSource}
                    budget={state.budget}
                    extraCash={state.extraCash}
                    setExtraCash={state.setExtraCash}
                    tempBudget={state.tempBudget}
                    setTempBudget={state.setTempBudget}
                    setBudget={state.setBudget}
                    cashReserve={state.cashReserve}
                    tempCashReserve={state.tempCashReserve}
                    setTempCashReserve={state.setTempCashReserve}
                    setCashReserve={state.setCashReserve}
                    bondAlloc={state.bondAlloc}
                    setBondAlloc={state.setBondAlloc}
                    bondYield={state.bondYield}
                    setBondYield={state.setBondYield}
                    hibor={state.hibor}
                    setHibor={state.setHibor}
                    spread={state.spread}
                    setSpread={state.setSpread}
                    capRate={state.capRate}
                    setCapRate={state.setCapRate}
                    leverageLTV={state.leverageLTV}
                    setLeverageLTV={state.setLeverageLTV}
                    handlingFee={state.handlingFee}
                    setHandlingFee={state.setHandlingFee}
                    interestBasis={state.interestBasis}
                    setInterestBasis={state.setInterestBasis}
                    cofRate={state.cofRate}
                    setCofRate={state.setCofRate}
                    propertyValue={state.propertyValue}
                    setPropertyValue={state.setPropertyValue}
                    existingMortgage={state.existingMortgage}
                    setExistingMortgage={state.setExistingMortgage}
                    mortgageLtv={state.mortgageLtv}
                    setMortgageLtv={state.setMortgageLtv}
                    primeRate={state.primeRate}
                    setPrimeRate={state.setPrimeRate}
                    mortgageHSpread={state.mortgageHSpread}
                    setMortgageHSpread={state.setMortgageHSpread}
                    mortgagePModifier={state.mortgagePModifier}
                    setMortgagePModifier={state.setMortgagePModifier}
                    mortgageTenor={state.mortgageTenor}
                    setMortgageTenor={state.setMortgageTenor}
                    simulatedHibor={state.simulatedHibor}
                    setSimulatedHibor={state.setSimulatedHibor}
                    bondPriceDrop={state.bondPriceDrop}
                    setBondPriceDrop={state.setBondPriceDrop}
                    showGuaranteed={state.showGuaranteed}
                    setShowGuaranteed={state.setShowGuaranteed}
                    isStale={isStale}
                    refreshHibor={refreshHibor}
                    onDownloadPDF={handleDownloadPDF}
                    isGeneratingPDF={state.isGeneratingPDF}
                    labels={t}
                    addNotification={addNotification}
                    onCollapsedChange={setIsSidebarCollapsed}
                />

                <main className={`flex-1 min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72'}`}>
                    <Header
                        onOpenMobileMenu={() => { }} // TODO: Implement mobile menu state
                        lang={state.lang}
                        onLanguageChange={state.setLang}
                        hibor={state.hibor}
                        unreadCount={unreadCount}
                        showNotifications={showNotifications}
                        setShowNotifications={setShowNotifications}
                        notifications={notifications}
                        setUnreadCount={setUnreadCount}
                        labels={t}
                    />

                    <div className="p-4 md:p-10 max-w-7xl mx-auto no-print">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* Hidden PDF capture container — only PDFProposal (no nav/UI chrome) */}
            <div ref={pdfRef} className="pdf-container">
                <Suspense fallback={null}>
                    <PDFProposal
                        projectionData={state.projection.projectionData}
                        lang={state.lang}
                        budget={state.budget}
                        totalPremium={state.projection.totalPremium}
                        bankLoan={state.projection.bankLoan}
                        roi={state.projection.roi}
                        netEquityAt30={state.projection.projectionData?.[state.projection.projectionData.length - 1]?.netEquity || 0}
                        propertyValue={state.propertyValue}
                        unlockedCash={state.unlockedCash}
                        hibor={state.hibor}
                        currentMtgRate={state.effectiveMortgageRate}
                        cashReserve={state.cashReserve}
                        netBondPrincipal={state.projection.netBondPrincipal}
                        pfEquity={state.projection.pfEquity}
                        fundSource={state.fundSource}
                        clientName={state.clientName}
                        representativeName={state.representativeName}
                        sensitivityData={state.stressTest.sensitivityData}
                        spread={state.spread}
                        leverageLTV={state.leverageLTV}
                        bondYield={state.bondYield}
                        sensitivityYear={state.sensitivityYear}
                    />
                </Suspense>
            </div>
        </div>
    );
};

export default App;
