import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useApp } from './AppStateContext';
import { useHibor, useBatchProcess, useNotificationState, type Notification } from '../hooks';
import type { Finding } from '../utils/advisories';

export type AppServices = {
    isStale: boolean;
    refreshHibor: () => void;
    notifications: Notification[];
    showNotifications: boolean;
    setShowNotifications: (show: boolean) => void;
    unreadCount: number;
    setUnreadCount: (count: number) => void;
    /** `id` and `time` are stamped by the hook, so callers must not supply them. */
    addNotification: (notif: Omit<Notification, 'id' | 'time'>) => void;
    batchStatus: 'idle' | 'running' | 'success';
    batchLogs: string[];
    batchProgress: number;
    runBatch: () => void;
    pdfRef: React.RefObject<HTMLDivElement>;
    onDownloadPDF: () => Promise<void>;
    onExportCSV: () => void;
    /** Blockers awaiting acknowledgement, or [] when the export is not gated right now. */
    pendingRiskFindings: Finding[];
    /** Advisor accepted the risk for the current blocker set; runs the export they asked for. */
    acceptRisk: () => void;
    dismissRisk: () => void;
};

/**
 * Identity of a blocker set, used to decide whether an earlier acknowledgement still applies.
 *
 * Keyed by the rule ids, not by a boolean: an advisor who accepts "ends underwater" and then
 * edits the proposal into a different failure must be shown the new one. Sorted so ordering
 * changes in the checker cannot silently invalidate a live acknowledgement.
 */
const riskKey = (findings: Finding[]): string =>
    findings.map(f => f.id).sort().join('|');

const AppServicesContext = createContext<AppServices | null>(null);

/**
 * Every style rule the page is currently using, as text, for the server PDF renderer.
 *
 * The renderer used to pull Tailwind from the Play CDN and this payload's `css` field was
 * never sent, so the PDF was styled by whatever the CDN shipped that day rather than by
 * the stylesheet this build compiled. Sending the real rules pins the PDF to the same CSS
 * the user is looking at. Cross-origin sheets (Google Fonts) throw on `cssRules` access;
 * they are skipped because the renderer links those fonts itself.
 */
const collectDocumentCss = (): string => {
    const chunks: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            for (const rule of Array.from(sheet.cssRules)) chunks.push(rule.cssText);
        } catch {
            continue;
        }
    }
    return chunks.join('\n');
};

export const AppServicesProvider = ({ children }: { children: React.ReactNode }) => {
    const state = useApp();
    const { rate: liveRate, date: liveDate, isStale, refresh: refreshHibor } = useHibor();
    const { batchStatus, batchLogs, batchProgress, runBatch } = useBatchProcess();
    const { notifications, showNotifications, setShowNotifications, unreadCount, setUnreadCount, addNotification } = useNotificationState(state.t);
    const pdfRef = useRef<HTMLDivElement>(null);
    const [pendingRiskFindings, setPendingRiskFindings] = useState<Finding[]>([]);
    // A ref, not state: acknowledging must not re-render the tree mid-export, and it is read
    // only at the moment an export is requested.
    const acknowledgedRisk = useRef<string | null>(null);

    useEffect(() => {
        if (liveRate && state.dataSource === 'live') {
            state.setHibor(liveRate);
            state.setLastRateUpdate(new Date(liveDate));
        }
    }, [liveRate, liveDate, state.dataSource]);

    const onExportCSV = () => {
        // Headers must name what the row builder below actually emits. 'Bond Interest'
        // over row.cumulativeBondInterest read as an annual figure but exported the
        // running total — identical at year 1 (the trap), 30x apart by year 30 for
        // anyone summing or charting the column. Every other surface qualifies it
        // (t.cumulativeBondInterest); the CSV was the only one that dropped the word.
        // 'Policy Loan' likewise: the column is row.loan alone, excluding bondLoan.
        const headers = ['Year', 'Cumulative Bond Interest', 'Cash Value', 'Bond Principal', 'Policy Value', 'Policy Loan', 'Mortgage Balance', 'Mortgage Principal Repaid', 'Net Equity'];
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

    const blockers = state.advisories.filter((f: Finding) => f.severity === 'blocker');

    // Warn-and-proceed, not block-and-refuse. The advisor is the licensed party; the tool's job
    // is to make sure a blocking issue was seen, not to decide the export for them.
    const onDownloadPDF = async () => {
        if (blockers.length > 0 && acknowledgedRisk.current !== riskKey(blockers)) {
            setPendingRiskFindings(blockers);
            return;
        }
        await runDownloadPDF();
    };

    const acceptRisk = () => {
        acknowledgedRisk.current = riskKey(pendingRiskFindings);
        setPendingRiskFindings([]);
        void runDownloadPDF();
    };
    const dismissRisk = () => setPendingRiskFindings([]);

    const runDownloadPDF = async () => {
        state.setIsGeneratingPDF(true);
        addNotification({
            title: state.t.generatingPdf,
            message: 'Preparing high-resolution document...',
            type: 'info'
        });

        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: pdfRef.current?.innerHTML,
                    css: collectDocumentCss(),
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

    return <AppServicesContext.Provider value={{ isStale, refreshHibor, notifications, showNotifications, setShowNotifications, unreadCount, setUnreadCount, addNotification, batchStatus, batchLogs, batchProgress, runBatch, pdfRef, onDownloadPDF, onExportCSV, pendingRiskFindings, acceptRisk, dismissRisk }}>{children}</AppServicesContext.Provider>;
};

export const useServices = (): AppServices => {
    const ctx = useContext(AppServicesContext);
    if (!ctx) throw new Error('useServices must be used inside <AppServicesProvider>');
    return ctx;
};
