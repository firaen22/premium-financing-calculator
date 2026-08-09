import {
    runSimulate,
    validateSimulateRequest,
    type PlainObject,
    type ValidationField,
} from './engineApi.js';
import type { Finding } from './advisories.js';

export type ExploreMetric = 'finalNetEquity' | 'roi' | 'monthlyNetCashflow';
export type ExploreRequest = {
    base: PlainObject;
    metric: ExploreMetric;
    topN?: number;
    budgetSteps?: number;
    reserveSteps?: number;
    bondSteps?: number;
    stress?: PlainObject | null;
    maxStressLTV?: number;
};

export type Candidate = {
    patch: Record<string, number>;
    summary: Record<string, number>;
    findingSummary: { warnings: number; notes: number; topIds: string[] };
    metricValue: number;
};

export type ExploreResult = {
    candidates: Candidate[];
    evaluated: number;
    rejected: { blockers: number; stress: number; invalid: number };
    metric: ExploreMetric;
    truncated: boolean;
    requiresAdvisorReview: true;
    disclaimer: string;
};

// Bounds worst-case compute on an unauthenticated endpoint. The step caps below hold the
// legal grid at exactly 6 x 5 x 5 = 150, so this is a defensive backstop that a well-formed
// request never reaches — deliberately, and it must never be lowered beneath that product.
// Truncating mid-grid would break out of the budget loop early, and because budget values are
// walked in ascending order that silently drops the HIGHEST-budget candidates: the ranking
// would then omit exactly the region most likely to top it, with nothing but a `truncated`
// flag to say so. Bounding compute via the step caps keeps every accepted request's grid whole.
export const MAX_CANDIDATES_EVALUATED = 150;
const DISCLAIMER = 'Illustrative scenarios only, ranked by the single stated metric. This is not financial advice, not a recommendation, and not a suitability assessment — a licensed advisor must review any candidate before it is presented to a client.';
const METRICS: readonly ExploreMetric[] = ['finalNetEquity', 'roi', 'monthlyNetCashflow'];
const SUMMARY_FIELDS = [
    'finalNetEquity', 'totalPremium', 'bankLoan', 'pfEquity', 'ownCapital', 'deployedCapital',
    'roi', 'effectiveRate', 'monthlyNetCashflow',
] as const;
const MONEY_SUMMARY_FIELDS = new Set([
    'finalNetEquity', 'totalPremium', 'bankLoan', 'pfEquity', 'ownCapital', 'deployedCapital',
    'monthlyNetCashflow',
]);

// Resolved from calculations.ts: all three public metrics are direct SimulationOutput fields.
// Stress LTV is SimulationOutput.projectionData/StressTestOutput.stressedProjection[*].ltv;
// bondLtv is a separate bond-collateral ratio and is intentionally not used here.
const metricValue = (output: Record<string, unknown>, metric: ExploreMetric): unknown => output[metric];

const option = (
    value: unknown, field: string, min: number, max: number, fallback: number,
): number | ValidationField => {
    if (value === undefined) return fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
        return { field, reason: `invalid_${field}` };
    }
    if (value < min || value > max) return { field, reason: `${field}_out_of_range` };
    return value;
};

const finiteNonNegative = (value: unknown): boolean =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0;

const points = (lower: number, upper: number, steps: number): number[] => {
    if (lower > upper) return [lower];
    if (lower === upper || steps === 1) return [lower];
    return Array.from({ length: steps }, (_, index) => lower + (upper - lower) * index / (steps - 1));
};

const round = (value: number, digits: number): number => Number(value.toFixed(digits));

const summaryFor = (output: Record<string, unknown>): Record<string, number> | null => {
    const summary: Record<string, number> = {};
    for (const field of SUMMARY_FIELDS) {
        const value = output[field];
        if (typeof value !== 'number' || !Number.isFinite(value)) return null;
        const rounded = round(value, MONEY_SUMMARY_FIELDS.has(field) ? 0 : 4);
        if (!Number.isFinite(rounded)) return null;
        summary[field] = rounded;
    }
    return summary;
};

const findingsFor = (findings: Finding[]): Candidate['findingSummary'] => ({
    warnings: findings.filter(finding => finding.severity === 'warning').length,
    notes: findings.filter(finding => finding.severity === 'note').length,
    topIds: findings
        .filter(finding => finding.severity !== 'blocker')
        .slice(0, 3)
        .map(finding => finding.id),
});

// The returned peak is in percentage points (0-100 scale), matching ProjectionData.ltv.
const stressPeak = (stressResult: ReturnType<typeof runSimulate>): number | null => {
    const rows = stressResult.stress?.stressedProjection;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const ltvs = rows.map(row => (row as { ltv?: unknown }).ltv);
    if (ltvs.some(value => typeof value !== 'number' || !Number.isFinite(value))) return null;
    const peak = Math.max(...ltvs as number[]);
    return Number.isFinite(peak) ? peak : null;
};

export const exploreStructures = (req: ExploreRequest): ExploreResult | ValidationField[] => {
    if (req === null || typeof req !== 'object' || Array.isArray(req) ||
        req.base === null || typeof req.base !== 'object' || Array.isArray(req.base)) {
        return [{ field: 'base', reason: 'missing' }];
    }
    if (!METRICS.includes(req.metric)) return [{ field: 'metric', reason: 'not_in_enum' }];

    const topN = option(req.topN, 'topN', 2, 5, 3);
    const budgetSteps = option(req.budgetSteps, 'budgetSteps', 1, 6, 5);
    const reserveSteps = option(req.reserveSteps, 'reserveSteps', 1, 5, 3);
    const bondSteps = option(req.bondSteps, 'bondSteps', 1, 5, 3);
    const optionErrors = [topN, budgetSteps, reserveSteps, bondSteps].filter(
        (value): value is ValidationField => typeof value !== 'number',
    );
    if (optionErrors.length > 0) return optionErrors;
    const resolvedTopN = topN as number;
    const resolvedBudgetSteps = budgetSteps as number;
    const resolvedReserveSteps = reserveSteps as number;
    const resolvedBondSteps = bondSteps as number;

    const base = req.base;
    for (const field of ['budget', 'cashReserve', 'bondAlloc']) {
        if (!finiteNonNegative(base[field])) return [{ field, reason: 'invalid_base' }];
    }
    if ((base.cashReserve as number) > (base.budget as number)) {
        return [{ field: 'cashReserve', reason: 'invalid_range' }];
    }
    if (req.maxStressLTV !== undefined &&
        (typeof req.maxStressLTV !== 'number' || !Number.isFinite(req.maxStressLTV) || req.maxStressLTV < 0 || req.maxStressLTV > 100)) {
        return [{ field: 'maxStressLTV', reason: 'invalid_maxStressLTV' }];
    }
    if (req.maxStressLTV !== undefined && req.stress === undefined ||
        req.maxStressLTV !== undefined && req.stress === null) {
        return [{ field: 'stress', reason: 'stress_required' }];
    }

    const baseValidation = validateSimulateRequest(req.stress === undefined || req.stress === null
        ? { input: base }
        : { input: base, stress: req.stress });
    if (baseValidation.length > 0) return baseValidation;

    const budgetValues = points((base.budget as number) * 0.5, base.budget as number, resolvedBudgetSteps);
    const rejected = { blockers: 0, stress: 0, invalid: 0 };
    const accepted: { candidate: Candidate; index: number }[] = [];
    let evaluated = 0;
    let truncated = false;

    outer: for (const budget of budgetValues) {
        const reserveValues = points(base.cashReserve as number, Math.min((base.cashReserve as number) * 3, budget), resolvedReserveSteps);
        for (const cashReserve of reserveValues) {
            const bondValues = points(0, budget - cashReserve, resolvedBondSteps);
            for (const bondAlloc of bondValues) {
                if (evaluated >= MAX_CANDIDATES_EVALUATED) {
                    truncated = true;
                    break outer;
                }
                evaluated += 1;
                const patch = { budget, cashReserve, bondAlloc };
                const input = { ...base, ...patch };
                const validation = validateSimulateRequest(req.stress === undefined || req.stress === null
                    ? { input }
                    : { input, stress: req.stress });
                if (validation.length > 0) {
                    rejected.invalid += 1;
                    continue;
                }
                const result = runSimulate(req.stress === undefined || req.stress === null
                    ? { input }
                    : { input, stress: req.stress });
                if (result.findings.some(finding => finding.severity === 'blocker')) {
                    rejected.blockers += 1;
                    continue;
                }
                if (req.maxStressLTV !== undefined) {
                    const peak = stressPeak(result);
                    if (peak === null) {
                        rejected.invalid += 1;
                        continue;
                    }
                    if (peak > req.maxStressLTV) {
                        rejected.stress += 1;
                        continue;
                    }
                }
                const value = metricValue(result.output as unknown as Record<string, unknown>, req.metric);
                const summary = summaryFor(result.output as unknown as Record<string, unknown>);
                if (typeof value !== 'number' || !Number.isFinite(value) || summary === null) {
                    rejected.invalid += 1;
                    continue;
                }
                accepted.push({
                    index: accepted.length,
                    candidate: {
                        patch,
                        summary,
                        findingSummary: findingsFor(result.findings),
                        metricValue: value,
                    },
                });
            }
        }
    }

    accepted.sort((left, right) =>
        right.candidate.metricValue - left.candidate.metricValue ||
        left.candidate.summary.bankLoan - right.candidate.summary.bankLoan ||
        left.index - right.index);
    return {
        candidates: accepted.slice(0, resolvedTopN).map(item => item.candidate),
        evaluated,
        rejected,
        metric: req.metric,
        truncated,
        requiresAdvisorReview: true,
        disclaimer: DISCLAIMER,
    };
};
