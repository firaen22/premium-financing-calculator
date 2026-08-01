import React, { useEffect, Suspense, useState } from 'react';
import { Sidebar, Header, PrintStyles } from './components/layout';
import { AdvisoryBanner, ChatWidget, GuidePanel, RiskAcknowledgement } from './components/ui';
import { SystemConfigView } from './views';
import { AppStateProvider, AppServicesProvider, useApp, useServices } from './state';

// Lazy-load heavy PDF components
const PDFPreview = React.lazy(() => import('./views/PDFPreview').then(m => ({ default: m.PDFPreview })));
const PDFProposal = React.lazy(() => import('./components/pdf/PDFProposal').then(m => ({ default: m.PDFProposal })));

// Lazy-load the four recharts-backed views: recharts alone is ~1MB of the former 1.33MB
// main chunk, and only these four (plus PDFProposal, already lazy above) import it.
// SystemConfigView does not import recharts and stays in the main chunk.
const AllocationView = React.lazy(() => import('./views/AllocationView').then(m => ({ default: m.AllocationView })));
const HoldingsView = React.lazy(() => import('./views/HoldingsView').then(m => ({ default: m.HoldingsView })));
const MarketRiskView = React.lazy(() => import('./views/MarketRiskView').then(m => ({ default: m.MarketRiskView })));
const ReturnStudio = React.lazy(() => import('./views/ReturnStudio').then(m => ({ default: m.ReturnStudio })));

const AppShell = () => {
    const state = useApp();
    const services = useServices();
    const { pdfRef } = services;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    // Owned here, not inside Sidebar: the opener lives in Header, so the state has to
    // sit above both. Below lg the sidebar is the ONLY route to every input and to all
    // six views, so an unreachable opener locks the whole app out on phones/tablets.
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    // Lock background scroll while the mobile drawer is open, and close it on Escape.
    // Also move keyboard focus into the drawer on open and back to the opener on close —
    // without this a keyboard user's focus stays stranded behind the overlay. NOT done
    // with `inert`: the same <aside> is the permanently-visible sidebar at lg+, so
    // marking it inert while "closed" would disable the whole desktop sidebar.
    useEffect(() => {
        if (!isMobileNavOpen) return;
        const opener = document.activeElement as HTMLElement | null;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // The drawer only renders its close button below lg, so this is a no-op on desktop.
        const closeBtn = document.querySelector<HTMLElement>('aside button[aria-label="Close menu"]');
        closeBtn?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileNavOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, [isMobileNavOpen]);

    const renderContent = () => {
        switch (state.activeView) {
            case 'allocation': return <AllocationView />;
            case 'holdings': return <HoldingsView />;
            case 'marketRisk': return <MarketRiskView />;
            case 'returnStudio': return <ReturnStudio />;
            case 'systemConfig': return <SystemConfigView />;
            case 'pdfPreview': return <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-400">Loading report preview...</div>}><PDFPreview isSidebarCollapsed={isSidebarCollapsed} /></Suspense>;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-[#c5a059]/30">
            <PrintStyles />
            <div className="flex">
                <Sidebar onCollapsedChange={setIsSidebarCollapsed} isMobileOpen={isMobileNavOpen} onMobileClose={() => setIsMobileNavOpen(false)} />

                {/* min-w-0 is load-bearing: a flex child defaults to min-width:auto, so
                    without it `main` cannot shrink below its widest content and every
                    `overflow-x-auto` wrapper inside (ledger table, sensitivity heatmap,
                    A4 report preview) widens the whole page instead of scrolling
                    internally. Measured at 360px: Holdings 900px, Report Review 1155px. */}
                <main className={`flex-1 min-w-0 overflow-x-hidden min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72'}`}>
                    <Header onOpenMobileMenu={() => setIsMobileNavOpen(true)} />
                    <div className="p-4 md:p-10 max-w-7xl mx-auto no-print">
                        {/* Above the view, not inside one: the findings describe the whole
                            proposal, and the advisor can be on any view when they break it. */}
                        <GuidePanel />
                        <AdvisoryBanner findings={state.advisories} t={state.t} />
                        <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>}>
                            {renderContent()}
                        </Suspense>
                    </div>
                </main>
            </div>

            {/* Outside <main> and outside the print tree: it gates the export, so it must never
                appear in the exported document it is gating. */}
            <RiskAcknowledgement
                findings={services.pendingRiskFindings}
                t={state.t}
                onAccept={services.acceptRisk}
                onCancel={services.dismissRisk}
            />
            <ChatWidget />

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
                        bondLoan={state.projection.bondLoan}
                        fundSource={state.fundSource}
                        clientName={state.clientName}
                        representativeName={state.representativeName}
                        sensitivityData={state.stressTest.sensitivityData}
                        spread={state.spread}
                        leverageLTV={state.leverageLTV}
                        bondYield={state.bondYield}
                        sensitivityYear={state.sensitivityYear}
                        interestBasis={state.interestBasis}
                        loanRate={state.projection.effectiveRate}
                    />
                </Suspense>
            </div>
        </div>
    );
};

const App = () => (
    <AppStateProvider>
        <AppServicesProvider>
            <AppShell />
        </AppServicesProvider>
    </AppStateProvider>
);

export default App;
