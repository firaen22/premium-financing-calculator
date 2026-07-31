import {
    LTV_IMPAIRED,
    MAX_MONEY,
    type ProjectionData,
    type SimulationInput,
    type SimulationOutput,
    type StressTestOutput,
} from './calculations.js';
import { DEFAULT_INPUTS } from '../constants/defaults.js';

export type Severity = 'blocker' | 'warning' | 'note';

export interface Finding {
    id: string;
    severity: Severity;
    field: string | null;
    messageKey: string;
    values: Record<string, number>;
}

export interface Bounds {
    warnMin?: number;
    warnMax?: number;
    blockMin?: number;
    blockMax?: number;
}

export const VALIDATED_FIELDS: readonly string[] = [
    'budget', 'cashReserve', 'bondAlloc', 'bondYield', 'hibor', 'cofRate',
    'spread', 'leverageLTV', 'capRate', 'handlingFee', 'unlockedCash',
    'effectiveMortgageRate', 'monthlyMortgagePmt', 'mortgageTenor',
];

// Bands reflect HK market practice as of 2026-07, cross-checked against published sources:
// spread — HSBC quotes HKD premium financing at 1M HIBOR +0.75% to +2%; block bound stays
//   wide because private-bank pricing is bespoke. No blockMin: negative rates are already
//   rejected as invalid input, and a near-zero bespoke spread is unusual, not absurd.
// leverageLTV — IA describes PF borrowing at 80–90% of premium; 95 is a hard ceiling.
// capRate — Prime-linked caps price off BLR (~5.0–5.25%) minus a discount, so effective
//   caps sit near 3.5–4.1%; a warnMin of 6 flagged every standard Prime-cap deal. The warn
//   ceiling stays at 12 rather than hugging the Prime range: a high cap is merely weak
//   protection, not an implausible input — the app's own default is a 9% ceiling.
// bondYield — the IA caps par-policy illustration rates at 6.0% (HKD) / 6.5% (non-HKD)
//   from 2025-07-01; anything above 6.5 exceeds the cap in every currency. No warnMin: a
//   conservative yield is legitimate, and its consequences are A7/A8/A9's job to state.
// hibor / cofRate — 1M HIBOR is ~2.7% (HKAB, 2026-07); 8 leaves room for deliberate
//   rate-shock modelling, 20 clears the 1998 spike while still catching absurd input.
// mortgageTenor — the HKMA caps property-mortgage tenor at 30 years (2012 guideline);
//   35 tolerates non-bank lenders while blocking fantasy tenors.
export const PLAUSIBILITY_RANGES: Readonly<Record<string, Bounds>> = {
    spread: { warnMin: 0.5, warnMax: 2.0, blockMax: 5 },
    leverageLTV: { warnMax: 90, blockMax: 95 },
    capRate: { warnMin: 3, warnMax: 12, blockMax: 15 },
    bondYield: { warnMax: 6.5, blockMax: 8 },
    handlingFee: { warnMax: 2, blockMax: 10 },
    hibor: { warnMax: 8, blockMax: 20 },
    cofRate: { warnMax: 8, blockMax: 20 },
    mortgageTenor: { warnMax: 30, blockMax: 35 },
    // Every money input carries the same ceiling, not just budget. Without one, cashReserve and
    // bondAlloc accepted values near Number.MAX_VALUE, whose sum overflows to Infinity — and A1's
    // `finite()` guard then dropped the over-budget blocker entirely on the most absurd input the
    // form can take. Bounding the fields is what makes that arithmetic unreachable.
    budget: { blockMax: MAX_MONEY },
    cashReserve: { blockMax: MAX_MONEY },
    bondAlloc: { blockMax: MAX_MONEY },
    unlockedCash: { blockMax: MAX_MONEY },
    monthlyMortgagePmt: { blockMax: MAX_MONEY },
};

const MONEY_FIELDS = new Set([
    'budget', 'cashReserve', 'bondAlloc', 'unlockedCash', 'monthlyMortgagePmt',
]);
const RATE_FIELDS = new Set([
    'bondYield', 'hibor', 'cofRate', 'spread', 'leverageLTV', 'capRate', 'handlingFee',
    'effectiveMortgageRate',
]);

const round = (value: number, digits: number): number => {
    const rounded = Number(value.toFixed(digits));
    return Number.isFinite(rounded) ? rounded : value;
};
const money = (value: number): number => round(value, 0);
const rate = (value: number): number => round(value, 2);
const year = (value: number): number => round(value, 0);
const valueForField = (field: string, value: number): number =>
    MONEY_FIELDS.has(field) ? money(value) : RATE_FIELDS.has(field) ? rate(value) : value;
const fieldToken = (field: string): string => field.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();

const finding = (
    id: string, severity: Severity, field: string | null, values: Record<string, number>,
): Finding => ({ id, severity, field, messageKey: `advisory.${id}`, values });

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const finiteValues = (values: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(values).filter(([, value]) => finite(value)));

const usableProjectionRows = (rows: unknown): ProjectionData[] => {
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is ProjectionData =>
        row !== null && typeof row === 'object' && finite((row as ProjectionData).year));
};

export const checkAssumptions = (
    input: SimulationInput, output: SimulationOutput, stress?: StressTestOutput,
): Finding[] => {
    const poisoned = new Set<string>();
    const validation: Finding[] = [];
    const groups: Finding[] = [];

    for (const field of VALIDATED_FIELDS) {
        const value = (input as unknown as Record<string, unknown>)[field];
        if (!finite(value) || value < 0) {
            poisoned.add(field);
            const id = `B_${fieldToken(field)}_INVALID`;
            validation.push(finding(id, 'blocker', field, {}));
        }
    }
    for (const field of ['interestBasis', 'fundSource'] as const) {
        const value = input[field];
        const valid = field === 'interestBasis' ? value === 'hibor' || value === 'cof' : value === 'cash' || value === 'mortgage';
        if (!valid) {
            poisoned.add(field);
            validation.push(finding('STRUCT_INVALID_ENUM', 'blocker', field, {}));
        }
    }

    // monthlyNetCashflow belongs here: A7 and A8 are its only readers, and both go silent when it
    // is non-finite, so without it a projection that failed to produce a cashflow number said
    // nothing at all about funding — the advisor reads an empty banner as "no problems found".
    const invalidOutput = ['totalPremium', 'pfEquity', 'finalNetEquity', 'monthlyNetCashflow'].some(field =>
        !finite((output as unknown as Record<string, unknown>)?.[field]));
    if (invalidOutput) validation.push(finding('STRUCT_INVALID_OUTPUT', 'blocker', null, {}));

    const reads = (...fields: string[]): boolean => fields.every(field => !poisoned.has(field));
    const outputNumber = (field: keyof SimulationOutput): number | undefined => {
        const value = output?.[field];
        return finite(value) ? value : undefined;
    };
    const rows = usableProjectionRows(output?.projectionData);
    const basisRate = input.interestBasis === 'cof' ? input.cofRate : input.hibor;

    if (reads('cashReserve', 'bondAlloc', 'budget')) {
        const shortfall = input.cashReserve + input.bondAlloc - input.budget;
        // Strictly greater, not >=: at exact equality nothing is over budget, and A1 would
        // render "is $0 over budget". Equality still leaves zero premium, which A3 states
        // correctly ("Budget of X funds no policy"), so nothing goes unreported.
        if (finite(shortfall) && shortfall > 0) groups.push(finding('A1_ALLOCATION_EXCEEDS_BUDGET', 'blocker',
            input.cashReserve > input.budget ? 'cashReserve' : 'bondAlloc', {
                cashReserve: money(input.cashReserve), bondAlloc: money(input.bondAlloc),
                budget: money(input.budget), shortfall: money(shortfall),
            }));
    }
    const totalPremium = outputNumber('totalPremium');
    if (totalPremium !== undefined && totalPremium <= 0 && reads('budget')) {
        groups.push(finding('A3_NO_POLICY_FUNDED', 'blocker', 'budget', {
            budget: money(input.budget), totalPremium: money(totalPremium),
        }));
    }
    if (reads('interestBasis', 'cofRate', 'hibor', 'spread', 'capRate') && input.capRate <= basisRate + input.spread) {
        groups.push(finding('A4_CAP_BINDS_IMMEDIATELY', 'warning', 'capRate', {
            capRate: rate(input.capRate), basisRate: rate(basisRate), spread: rate(input.spread),
        }));
    }
    if (reads('interestBasis', 'cofRate', 'hibor') && input.interestBasis === 'cof' &&
        input.cofRate === DEFAULT_INPUTS.cofRate && input.hibor !== DEFAULT_INPUTS.hibor) {
        groups.push(finding('A5_STALE_COF_BASIS', 'note', 'cofRate', {
            cofRate: rate(input.cofRate), hibor: rate(input.hibor),
        }));
    }
    if (reads('fundSource', 'unlockedCash') && input.fundSource === 'mortgage' && input.unlockedCash <= 0) {
        groups.push(finding('A6_NO_UNLOCKED_CASH', 'blocker', 'unlockedCash', { unlockedCash: money(input.unlockedCash) }));
    }
    const monthlyNetCashflow = outputNumber('monthlyNetCashflow');
    const annualShortfall = monthlyNetCashflow === undefined ? undefined : Math.abs(monthlyNetCashflow) * 12;
    // Compared per-month rather than as `annualShortfall > cashReserve`: at an extreme cashflow the
    // ×12 overflows to Infinity, `finite()` rejected it, and the A8 blocker silently degraded to
    // the A7 warning — the largest funding gaps were reported the least severely. Dividing the
    // reserve instead keeps both sides finite.
    const a8 = monthlyNetCashflow !== undefined && reads('cashReserve') && monthlyNetCashflow < 0 &&
        Math.abs(monthlyNetCashflow) > input.cashReserve / 12;
    if (a8) groups.push(finding('A8_FUNDING_GAP', 'blocker', 'cashReserve', {
        monthlyNetCashflow: money(monthlyNetCashflow!), annualShortfall: money(annualShortfall!),
        cashReserve: money(input.cashReserve),
    }));
    if (monthlyNetCashflow !== undefined && monthlyNetCashflow < 0 && !a8) {
        groups.push(finding('A7_NEGATIVE_YEAR1_CASHFLOW', 'warning', 'bondYield', { monthlyNetCashflow: money(monthlyNetCashflow) }));
    }
    // Year 0 on the mortgage path books the whole released equity as a liability
    // (calculations.ts:290-291) while the policy holds only its day-0 surrender value, so
    // yr0 net equity is negative by construction there. Flagging it would fire a blocker on
    // every mortgage-funded proposal. Year 0 on the CASH path carries no such offset and a
    // negative there is real, so the skip is scoped to the mortgage path only.
    const structuralYr0 = (row: ProjectionData): boolean =>
        input.fundSource === 'mortgage' && row.year === 0;
    // Measured on the real engine: a mortgage case releasing 4.5M against a 4M budget runs
    // negative through year 4, then recovers to +12.9M by year 30; a small release never goes
    // negative. So an early negative is a transitional state proportional to release size, not
    // grounds to stop the proposal. Only a structure that ENDS underwater is a blocker; a
    // recovering one is a warning naming the year it recovers.
    const negativeRow = rows.find(row =>
        finite(row.netEquity) && row.netEquity < 0 && !structuralYr0(row));
    const finalEquity = outputNumber('finalNetEquity');
    // Ending underwater is the blocker, and it is decided by finalNetEquity alone. Previously the
    // whole branch was gated on `negativeRow`, so a projection that ends negative without any
    // intermediate row showing it — the row set is filtered for finite netEquity, so a gap is
    // enough — produced no A9 and no blocker of any kind. The advisor read an empty banner on a
    // proposal that ends in the red.
    const lastEquityRow = [...rows].reverse().find(row => finite(row.netEquity));
    if (finalEquity !== undefined && finalEquity < 0) {
        groups.push(finding('A9_ENDS_NEGATIVE', 'blocker', null, {
            year: year(negativeRow ? negativeRow.year : (lastEquityRow?.year ?? 0)),
            netEquity: money(negativeRow ? negativeRow.netEquity : finalEquity),
            finalNetEquity: money(finalEquity),
        }));
    } else if (negativeRow) {
        const lastNegative = [...rows].reverse().find(row =>
            finite(row.netEquity) && row.netEquity < 0 && !structuralYr0(row))!;
        groups.push(finding('A9B_UNDERWATER_PERIOD', 'warning', null, {
            fromYear: year(negativeRow.year), untilYear: year(lastNegative.year),
            // Excludes the structural year-0 row for the same reason the rule itself does:
            // reporting it as the worst point contradicts a window that starts at year 1.
            worstNetEquity: money(Math.min(...rows
                .filter(r => finite(r.netEquity) && !structuralYr0(r)).map(r => r.netEquity))),
        }));
    }
    // Baseline excludes the structural year-0 row for the same reason A9/A9B do. Measured: on a
    // mortgage case releasing 4.5M, year 0 books -1,101,429 against year 1's -966,193 — so any
    // year beating that artificially depressed row set `grew`, and A10 could never fire on the
    // mortgage path at all, however flat the structure actually was.
    const initialRow = rows.find(row => finite(row.netEquity) && !structuralYr0(row));
    const equityRows = rows.filter(row => finite(row.netEquity) && !structuralYr0(row));
    if (equityRows.length >= 2 && initialRow && finite(initialRow.year) && finite(initialRow.netEquity)) {
        const grew = equityRows.some(row => row.year > initialRow.year && row.netEquity > initialRow.netEquity);
        const finalRow = equityRows[equityRows.length - 1];
        if (!grew) groups.push(finding('A10_NEVER_GROWS', 'warning', null, {
            initialNetEquity: money(initialRow.netEquity), finalNetEquity: money(finalRow.netEquity),
        }));
    }
    // Not gated on `!negativeRow`. Measured on the real engine: the mortgage/4.5M-release case is
    // underwater in the base case through year 4 AND margin-calls under stress from year 1 — with
    // that guard in place the advisor was shown only "recovers by year 5" and never learned the
    // stress scenario calls the loan. A base-case dip and a stress margin call are different facts
    // about different scenarios; A9B stating one must not suppress A11 stating the other.
    if (stress) {
        const stressRows = usableProjectionRows(stress.stressedProjection);
        const trigger = stressRows.find(row => {
            const negative = finite(row.netEquity) && row.netEquity < 0 && !structuralYr0(row);
            // LTV_IMPAIRED is the engine's sentinel for collateral wiped out with the loan still
            // outstanding — calculations.test.ts calls it "the margin-call case the LTV chart
            // exists to surface". Excluding it here meant the single worst stress outcome produced
            // no margin-call advisory at all. It triggers; it is only kept out of the rendered
            // number below, since 9999 is a sentinel and not an LTV anyone should read.
            const ltvTrigger = finite(row.ltv) && (row.ltv === LTV_IMPAIRED || row.ltv > 100);
            return negative || ltvTrigger;
        });
        if (trigger) {
            const values: Record<string, number> = { year: year(trigger.year) };
            if (finite(trigger.ltv) && trigger.ltv !== LTV_IMPAIRED && trigger.ltv > 100) values.ltv = rate(trigger.ltv);
            groups.push(finding('A11_STRESS_MARGIN_CALL', 'warning', null, values));
        }
    }

    for (const field of Object.keys(PLAUSIBILITY_RANGES)) {
        if (poisoned.has(field)) continue;
        const value = (input as unknown as Record<string, unknown>)[field];
        if (!finite(value)) continue;
        const bounds = PLAUSIBILITY_RANGES[field];
        const outside = (key: keyof Bounds): boolean => bounds[key] !== undefined &&
            (key.endsWith('Min') ? value < bounds[key]! : value > bounds[key]!);
        const block = outside('blockMin') || outside('blockMax');
        const warn = outside('warnMin') || outside('warnMax');
        if (block || warn) {
            const values: Record<string, number> = { value: valueForField(field, value) };
            for (const key of ['warnMin', 'warnMax', 'blockMin', 'blockMax'] as const) {
                if (bounds[key] !== undefined) values[key] = valueForField(field, bounds[key]!);
            }
            groups.push(finding(block ? `B_${fieldToken(field)}_OUT_OF_RANGE`
                : `B_${fieldToken(field)}_IMPLAUSIBLE`,
            block ? 'blocker' : 'warning', field, finiteValues(values)));
        }
    }

    const all = [...validation, ...groups];
    return (['blocker', 'warning', 'note'] as Severity[]).flatMap(severity =>
        all.filter(item => item.severity === severity));
};
