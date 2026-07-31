import { useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, X } from 'lucide-react';
import { useApp } from '../../state';
import type { Step } from '../../utils/guide';
import type { Labels } from '../../i18n';

const MONEY_FIELDS = new Set(['budget', 'cashReserve', 'bondAlloc']);

const interpolate = (template: string, values: Record<string, number>): string =>
    template.replace(/\{(\w+)\}/g, (token, key: string) => {
        if (!(key in values)) return token;
        const value = values[key];
        return MONEY_FIELDS.has(key) ? value.toLocaleString('en-US') : String(value);
    });

const messageFor = (t: Labels, step: Step): string => {
    const template = t.guide[step.messageKey as keyof typeof t.guide];
    return interpolate(template, step.values);
};

const StepRow = ({ step, t, onNavigate }: { step: Step; t: Labels; onNavigate: (view: string) => void }) => (
    <li className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700">
        {step.kind === 'ready'
            ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-600" />
            : <ArrowRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#9a7b35]" />}
        <span className="flex-1">{messageFor(t, step)}</span>
        {step.targetView !== null && (
            <button
                type="button"
                onClick={() => onNavigate(step.targetView!)}
                className="flex-shrink-0 rounded border border-[#c5a059] px-3 py-1 text-xs font-semibold text-[#80652e] hover:bg-[#fffaf0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
            >
                {t.guide.goTo}
            </button>
        )}
    </li>
);

export const GuidePanel = () => {
    const { guide, t, setActiveView } = useApp();
    const [expanded, setExpanded] = useState(false);
    const [dismissedStepId, setDismissedStepId] = useState<string | null>(null);
    const current = guide[0];

    if (dismissedStepId === current.id) return null;

    const ready = current.kind === 'ready';
    return (
        <div className="mb-5 md:mb-6 overflow-hidden rounded-lg border no-print" style={{ borderColor: ready ? '#86efac' : '#c5a05966' }}>
            <div className={`flex items-start gap-3 px-4 py-3 ${ready ? 'bg-emerald-50' : 'bg-[#fffaf0]'}`}>
                {ready
                    ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-600" />
                    : <ArrowRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#9a7b35]" />}
                <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold uppercase tracking-widest ${ready ? 'text-emerald-700' : 'text-[#80652e]'}`}>
                        {ready ? t.guide.readyTitle : t.guide.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{messageFor(t, current)}</div>
                </div>
                {current.targetView !== null && (
                    <button
                        type="button"
                        onClick={() => setActiveView(current.targetView!)}
                        className="flex-shrink-0 rounded border border-[#c5a059] px-3 py-1.5 text-xs font-semibold text-[#80652e] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                    >
                        {t.guide.goTo}
                    </button>
                )}
                <button
                    type="button"
                    aria-label={t.guide.dismiss}
                    onClick={() => setDismissedStepId(current.id)}
                    className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            {guide.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => setExpanded(value => !value)}
                        aria-expanded={expanded}
                        className="flex w-full items-center justify-end gap-2 border-t border-slate-100 bg-white px-4 py-2 text-xs font-medium text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                    >
                        {expanded ? t.guide.hideMore : interpolate(t.guide.showMore, { count: guide.length - 1 })}
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                        <ul className="divide-y divide-slate-100 bg-white">
                            {guide.slice(1).map(step => <StepRow key={step.id} step={step} t={t} onNavigate={setActiveView} />)}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
};
