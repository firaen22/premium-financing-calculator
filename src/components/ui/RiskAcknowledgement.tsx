import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Finding } from '../../utils/advisories';
import { renderMessage } from './AdvisoryBanner';
import { Labels } from '../../i18n';
import { THEME } from '../../constants/theme';

/**
 * Shown when an advisor exports a proposal that has blocker-severity findings.
 *
 * Deliberately NOT a hard stop. A checker that refuses to export is a checker advisors route
 * around — they screenshot the page, or they stop entering the real numbers. This states the
 * blockers in plain language, makes the advisor click past them, and gets out of the way. The
 * export is theirs to make; what the tool owes them is that they cannot say they were not told.
 *
 * The acknowledgement is keyed to the exact set of blocker ids (see AppServicesContext), so
 * accepting the risk on one configuration never silently carries over to a different one.
 */
export const RiskAcknowledgement = ({ findings, t, onAccept, onCancel }: {
    findings: Finding[];
    t: Labels;
    onAccept: () => void;
    onCancel: () => void;
}) => {
    if (findings.length === 0) return null;
    const a = t.advisory;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 no-print"
            role="dialog"
            aria-modal="true"
            aria-labelledby="risk-ack-title"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
                    <AlertOctagon className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: THEME.danger }} />
                    <div>
                        <h2 id="risk-ack-title" className="text-base font-bold" style={{ color: THEME.danger }}>
                            {a.riskTitle}
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">{a.riskIntro}</p>
                    </div>
                </div>

                <ul className="overflow-y-auto divide-y divide-slate-100">
                    {findings.map((f, i) => (
                        <li key={`${f.id}-${i}`} className="flex items-start gap-3 px-5 py-3 text-sm text-slate-700">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: THEME.danger }} />
                            <span>{renderMessage(t, f)}</span>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded"
                    >
                        {a.riskCancel}
                    </button>
                    <button
                        type="button"
                        onClick={onAccept}
                        className="px-4 py-2 text-sm font-bold text-white rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c5a059]"
                        style={{ backgroundColor: THEME.danger }}
                    >
                        {a.riskAccept}
                    </button>
                </div>
            </div>
        </div>
    );
};
