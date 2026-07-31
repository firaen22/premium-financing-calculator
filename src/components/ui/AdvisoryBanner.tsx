import React, { useState } from 'react';
import { AlertOctagon, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { Finding, Severity } from '../../utils/advisories';
import { formatCurrency, formatPercent } from '../../utils/calculations';
import { Labels } from '../../i18n';
import { THEME } from '../../constants/theme';

// Maps a SimulationInput field to the label the rest of the app already uses for it, so a
// finding about `bondAlloc` reads "Bond Fund" — the same word the input carries — rather
// than a raw field name. Fields with no existing label (mortgage-derived, or the fund
// source / interest basis enums) fall back to a humanized version of the key; that
// fallback is English-only, which is an accepted gap for what are edge/rare paths.
const FIELD_LABEL_KEYS: Partial<Record<string, keyof Labels>> = {
    budget: 'totalBudget',
    cashReserve: 'cashReserve',
    bondAlloc: 'bondFund',
    bondYield: 'bondYield',
    hibor: 'hiborRate',
    cofRate: 'cofRate',
    spread: 'spread',
    leverageLTV: 'leverageLtv',
    capRate: 'capRate',
    handlingFee: 'handlingFee',
    unlockedCash: 'unlockedCash',
    mortgageTenor: 'mortgageTenorLabel',
};
const humanize = (field: string): string =>
    field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
const fieldLabel = (t: Labels, field: string): string => {
    const key = FIELD_LABEL_KEYS[field];
    const label = key ? (t[key] as unknown as string) : undefined;
    return label || humanize(field);
};

// Mirrors advisories.ts's MONEY_FIELDS/RATE_FIELDS — display formatting only, not the
// checker's own rounding. If a field is added there for validation, add it here too if it
// should render as currency/percent rather than a bare number.
const MONEY_FIELDS = new Set(['budget', 'cashReserve', 'bondAlloc', 'unlockedCash', 'monthlyMortgagePmt',
    'shortfall', 'totalPremium', 'netEquity', 'finalNetEquity', 'initialNetEquity',
    'worstNetEquity', 'monthlyNetCashflow', 'annualShortfall']);
const RATE_FIELDS = new Set(['bondYield', 'hibor', 'cofRate', 'spread', 'leverageLTV', 'capRate',
    'handlingFee', 'effectiveMortgageRate', 'basisRate', 'ltv']);
// Neither money nor a rate: a count of years. Formatting these as a percent (one reviewer's
// suggested fix) would print "80.00%" for an 80-year tenor; leaving them bare prints "80".
const YEAR_FIELDS = new Set(['mortgageTenor']);
const formatValue = (t: Labels, key: string, value: number): string =>
    MONEY_FIELDS.has(key) ? formatCurrency(value)
        : RATE_FIELDS.has(key) ? formatPercent(value)
            : YEAR_FIELDS.has(key) ? `${value} ${t.advisory.unitYears}`
                : String(value);

const interpolate = (template: string, values: Record<string, string>): string =>
    Object.entries(values).reduce((acc, [key, val]) => acc.replaceAll(`{${key}}`, val), template);

// Group-B bound description, e.g. "0.80%–2.00%" or "≤95.00%". A finding carries every bound
// its field defines, not just the breached one, so the pair to quote is chosen by severity:
// a blocker breached a block bound, a warning breached a warn bound. Quoting the block bound
// on a warning tells the advisor a 92% LTV is "outside the usual range (≤95%)" — a sentence
// that contradicts itself and reads as a bug, which is how advisors learn to ignore the
// banner. Falls back to the other pair only when the expected one isn't defined for the field.
const boundText = (t: Labels, field: string, severity: Severity, values: Record<string, number>): string => {
    const has = (k: string) => typeof values[k] === 'number';
    const fmt = (k: string) => formatValue(t, field, values[k]);
    const pair = (min: string, max: string): string | null => {
        if (has(min) && has(max)) return `${fmt(min)}–${fmt(max)}`;
        if (has(min)) return `≥${fmt(min)}`;
        if (has(max)) return `≤${fmt(max)}`;
        return null;
    };
    const preferred = severity === 'blocker' ? pair('blockMin', 'blockMax') : pair('warnMin', 'warnMax');
    const fallback = severity === 'blocker' ? pair('warnMin', 'warnMax') : pair('blockMin', 'blockMax');
    return preferred ?? fallback ?? '';
};

// Exported for the coverage test in advisories.test.ts, which asserts that every rule id
// checkAssumptions can emit resolves to a real sentence in every locale — a rule reaching
// the `return f.id` fallback would show an advisor a raw id like "A9B_UNDERWATER_PERIOD".
export const renderMessage = (t: Labels, f: Finding): string => {
    const a = t.advisory;
    if (f.id === 'STRUCT_INVALID_OUTPUT') return a.genericOutputInvalid;
    if (f.id === 'STRUCT_INVALID_ENUM') return interpolate(a.genericEnumInvalid, { field: fieldLabel(t, f.field || '') });
    if (f.id.endsWith('_INVALID') && f.field) return interpolate(a.genericInvalid, { field: fieldLabel(t, f.field) });
    if (f.id.endsWith('_OUT_OF_RANGE') && f.field) return interpolate(a.genericOutOfRange, {
        field: fieldLabel(t, f.field), value: formatValue(t, f.field, f.values.value),
        bound: boundText(t, f.field, f.severity, f.values),
    });
    if (f.id.endsWith('_IMPLAUSIBLE') && f.field) return interpolate(a.genericImplausible, {
        field: fieldLabel(t, f.field), value: formatValue(t, f.field, f.values.value),
        bound: boundText(t, f.field, f.severity, f.values),
    });
    const template: string | undefined = (a as unknown as Record<string, string>)[
        f.id === 'A11_STRESS_MARGIN_CALL' && typeof f.values.ltv === 'number' ? 'a11WithLtv'
            : f.id.toLowerCase().replace(/^a(\d+b?).*/, 'a$1')
    ];
    if (!template) return f.id; // last-resort fallback — should not happen for a known rule id
    const values: Record<string, string> = {};
    for (const [key, val] of Object.entries(f.values)) values[key] = formatValue(t, key, val);
    return interpolate(template, values);
};

const SEVERITY_STYLE: Record<Severity, { icon: typeof AlertOctagon; color: string; bg: string }> = {
    blocker: { icon: AlertOctagon, color: THEME.danger, bg: '#fef2f2' },
    warning: { icon: AlertTriangle, color: THEME.warning, bg: '#fffbeb' },
    note: { icon: Info, color: THEME.textMuted, bg: '#f8fafc' },
};

export const AdvisoryBanner = ({ findings, t }: { findings: Finding[]; t: Labels }) => {
    const [expanded, setExpanded] = useState(false);
    if (findings.length === 0) return null;

    const counts = { blocker: 0, warning: 0, note: 0 } as Record<Severity, number>;
    for (const f of findings) counts[f.severity]++;
    const topSeverity: Severity = counts.blocker > 0 ? 'blocker' : counts.warning > 0 ? 'warning' : 'note';
    const style = SEVERITY_STYLE[topSeverity];
    const Icon = style.icon;

    return (
        <div className="mb-5 md:mb-6 border rounded-lg overflow-hidden no-print" style={{ borderColor: style.color + '40' }}>
            <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"
                style={{ backgroundColor: style.bg }}
                aria-expanded={expanded}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ color: style.color }} />
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                        {counts.blocker > 0 && <span style={{ color: THEME.danger }}>{counts.blocker} {t.advisory.blockersLabel}</span>}
                        {counts.warning > 0 && <span style={{ color: THEME.warning }}>{counts.warning} {t.advisory.warningsLabel}</span>}
                        {counts.note > 0 && <span style={{ color: THEME.textMuted }}>{counts.note} {t.advisory.notesLabel}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 flex-shrink-0">
                    {expanded ? t.advisory.hideDetails : t.advisory.showDetails}
                    <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {expanded && (
                <ul className="divide-y divide-slate-100 bg-white">
                    {findings.map((f, i) => {
                        const s = SEVERITY_STYLE[f.severity];
                        const FIcon = s.icon;
                        return (
                            <li key={`${f.id}-${i}`} className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700">
                                <FIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.color }} />
                                <span>{renderMessage(t, f)}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
