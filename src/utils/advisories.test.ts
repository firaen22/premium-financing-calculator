import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS } from '../constants/defaults';
import {
    calculatePMT, calculateProjection, deriveEffectiveMortgageRate, deriveUnlockedCash,
    LTV_IMPAIRED, type ProjectionData, type SimulationInput, type SimulationOutput,
    type StressTestOutput,
} from './calculations';
import {
    checkAssumptions, PLAUSIBILITY_RANGES, VALIDATED_FIELDS, type Finding,
} from './advisories';

const inputFromDefaults = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
    const unlockedCash = deriveUnlockedCash(
        DEFAULT_INPUTS.propertyValue, DEFAULT_INPUTS.mortgageLtv, DEFAULT_INPUTS.existingMortgage);
    const effectiveMortgageRate = deriveEffectiveMortgageRate(
        DEFAULT_INPUTS.hibor, DEFAULT_INPUTS.mortgageHSpread,
        DEFAULT_INPUTS.primeRate, DEFAULT_INPUTS.mortgagePModifier);
    return {
        budget: DEFAULT_INPUTS.budget, cashReserve: DEFAULT_INPUTS.cashReserve,
        bondAlloc: DEFAULT_INPUTS.bondAlloc, bondYield: DEFAULT_INPUTS.bondYield,
        hibor: DEFAULT_INPUTS.hibor, cofRate: DEFAULT_INPUTS.cofRate,
        interestBasis: DEFAULT_INPUTS.interestBasis, spread: DEFAULT_INPUTS.spread,
        leverageLTV: DEFAULT_INPUTS.leverageLTV, capRate: DEFAULT_INPUTS.capRate,
        handlingFee: DEFAULT_INPUTS.handlingFee, fundSource: DEFAULT_INPUTS.fundSource,
        unlockedCash, effectiveMortgageRate,
        monthlyMortgagePmt: calculatePMT(effectiveMortgageRate, DEFAULT_INPUTS.mortgageTenor, unlockedCash),
        mortgageTenor: DEFAULT_INPUTS.mortgageTenor, ...overrides,
    };
};

const projectionFor = (overrides: Partial<SimulationInput> = {}) => {
    const input = inputFromDefaults(overrides);
    return { input, output: calculateProjection(input) };
};

const outputWith = (base: SimulationOutput, overrides: Partial<SimulationOutput>): SimulationOutput => ({ ...base, ...overrides });
const row = (year: number, netEquity: number, ltv?: number): ProjectionData => ({ year, netEquity, ...(ltv === undefined ? {} : { ltv }) } as ProjectionData);
const stressWith = (rows: ProjectionData[]): StressTestOutput => ({
    stressedProjection: rows, stressStats: { breakEvenHibor: 0, breakEvenStatus: 'reachable', lowestEquity: 0 },
    sensitivityData: { xLabels: [], yLabels: [], data: [] },
});
const ids = (findings: Finding[]) => findings.map(finding => finding.id);
const deepFreeze = <T>(value: T): T => {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    }
    return value;
};

describe('checkAssumptions', () => {
    it('uses the real default derivation path and has no blockers when clean', () => {
        const { input, output } = projectionFor();
        const findings = checkAssumptions(input, output);
        expect(findings.filter(finding => finding.severity === 'blocker')).toEqual([]);
    });

    it('returns exact severity and phase order', () => {
        const { output } = projectionFor({
            interestBasis: 'cof', cofRate: DEFAULT_INPUTS.cofRate, hibor: 4,
            budget: 4_000_000, cashReserve: 3_000_000, bondAlloc: 2_000_000,
            capRate: 5, spread: 0.4,
        });
        const findings = checkAssumptions(inputFromDefaults({
            interestBasis: 'cof', cofRate: DEFAULT_INPUTS.cofRate, hibor: 4,
            budget: 4_000_000, cashReserve: 3_000_000, bondAlloc: 2_000_000,
            capRate: 5, spread: 0.4,
        }), outputWith(output, { totalPremium: 0, monthlyNetCashflow: -10_000 }));
        expect(ids(findings)).toEqual([
            'A1_ALLOCATION_EXCEEDS_BUDGET', 'A3_NO_POLICY_FUNDED',
            'A4_CAP_BINDS_IMMEDIATELY', 'A7_NEGATIVE_YEAR1_CASHFLOW', 'B_SPREAD_IMPLAUSIBLE', 'A5_STALE_COF_BASIS',
        ]);
    });

    it('measures the allocation against injected cash as well as the budget', () => {
        const clean = projectionFor();
        // 3M reserve + 2M bonds against a 4M budget is over-allocated on its own, and A1
        // fired before injected cash reached the engine. A 1M injection funds it exactly,
        // and the engine's own clamps now let it through — so the blocker must go quiet.
        const over = inputFromDefaults({ cashReserve: 3_000_000, bondAlloc: 2_000_000 });
        expect(ids(checkAssumptions(over, clean.output))).toContain('A1_ALLOCATION_EXCEEDS_BUDGET');
        expect(ids(checkAssumptions({ ...over, extraCash: 1_000_000 }, clean.output)))
            .not.toContain('A1_ALLOCATION_EXCEEDS_BUDGET');
        // Still fires when the injection is not enough to close the gap.
        expect(ids(checkAssumptions({ ...over, extraCash: 500_000 }, clean.output)))
            .toContain('A1_ALLOCATION_EXCEEDS_BUDGET');
    });

    it('fires and suppresses each Group A rule', () => {
        const clean = projectionFor();
        expect(ids(checkAssumptions(inputFromDefaults({ cashReserve: 3_000_000, bondAlloc: 2_000_000 }), clean.output))).toContain('A1_ALLOCATION_EXCEEDS_BUDGET');
        expect(ids(checkAssumptions(clean.input, outputWith(clean.output, { totalPremium: 0 })))).toContain('A3_NO_POLICY_FUNDED');
        expect(ids(checkAssumptions(inputFromDefaults({ capRate: 5 }), clean.output))).toContain('A4_CAP_BINDS_IMMEDIATELY');
        expect(ids(checkAssumptions(inputFromDefaults({ interestBasis: 'cof', cofRate: 5, hibor: 4 }), clean.output))).toContain('A5_STALE_COF_BASIS');
        expect(ids(checkAssumptions(inputFromDefaults({ fundSource: 'mortgage', unlockedCash: 0 }), clean.output))).toContain('A6_NO_UNLOCKED_CASH');
        expect(ids(checkAssumptions(clean.input, outputWith(clean.output, { monthlyNetCashflow: -1 })))).toContain('A7_NEGATIVE_YEAR1_CASHFLOW');
        expect(ids(checkAssumptions(inputFromDefaults({ cashReserve: 1 }), outputWith(clean.output, { monthlyNetCashflow: -1 })))).toContain('A8_FUNDING_GAP');
        expect(ids(checkAssumptions(clean.input, outputWith(clean.output, { projectionData: [row(0, -1)], finalNetEquity: -1 })))).toContain('A9_ENDS_NEGATIVE');
        expect(ids(checkAssumptions(clean.input, outputWith(clean.output, { projectionData: [row(0, -1), row(5, 10)], finalNetEquity: 10 })))).toContain('A9B_UNDERWATER_PERIOD');
        expect(ids(checkAssumptions(clean.input, outputWith(clean.output, { projectionData: [row(0, 10), row(1, 5)] })))).toContain('A10_NEVER_GROWS');
        expect(ids(checkAssumptions(clean.input, clean.output, stressWith([row(0, 1, 101)])))).toContain('A11_STRESS_MARGIN_CALL');

        expect(ids(checkAssumptions(clean.input, clean.output)).filter(id => id.startsWith('A'))).toEqual([]);
        // Reversed from `not.toContain` after review: LTV_IMPAIRED is the engine's sentinel for
        // collateral wiped out under a live loan (calculations.ts:464), i.e. the most severe
        // margin-call state there is. The original assertion locked in a false negative on the
        // worst case. It must fire — and must not print the 9999 sentinel as a percentage.
        const impaired = checkAssumptions(clean.input, outputWith(clean.output, { monthlyNetCashflow: 0 }),
            stressWith([row(0, 1, LTV_IMPAIRED)]));
        expect(ids(impaired)).toContain('A11_STRESS_MARGIN_CALL');
        expect(impaired.find(f => f.id === 'A11_STRESS_MARGIN_CALL')!.values.ltv).toBeUndefined();
    });

    it('fires A12 when the bond-collateral facility gears past 100% or is impaired', () => {
        const clean = projectionFor();
        const bondRow = (bondLtv: number) => ({ ...row(0, 1), bondLtv } as ProjectionData);
        // A blown bond facility with positive netEquity and healthy policy ltv: exactly the
        // case the separate gearing ratio exists for — A11 must stay silent, A12 must fire.
        const geared = checkAssumptions(clean.input, clean.output, stressWith([bondRow(125)]));
        expect(ids(geared)).toContain('A12_BOND_FACILITY_CALL');
        expect(ids(geared)).not.toContain('A11_STRESS_MARGIN_CALL');
        expect(geared.find(f => f.id === 'A12_BOND_FACILITY_CALL')!.values.bondLtv).toBe(125);
        // Collateral wiped with the loan outstanding: fires, but the 9999 sentinel must not
        // be rendered as a percentage — same contract as A11's LTV_IMPAIRED handling.
        const impaired = checkAssumptions(clean.input, clean.output, stressWith([bondRow(LTV_IMPAIRED)]));
        expect(ids(impaired)).toContain('A12_BOND_FACILITY_CALL');
        expect(impaired.find(f => f.id === 'A12_BOND_FACILITY_CALL')!.values.bondLtv).toBeUndefined();
        // A geared-but-healthy facility stays silent.
        expect(ids(checkAssumptions(clean.input, clean.output, stressWith([bondRow(60)])))).not.toContain('A12_BOND_FACILITY_CALL');
    });

    it('fires both Group B outcomes and suppresses clean values', () => {
        const clean = projectionFor();
        const cases: Array<[keyof SimulationInput, number, string, string]> = [
            ['spread', 6, 'B_SPREAD_OUT_OF_RANGE', 'B_SPREAD_IMPLAUSIBLE'],
            ['leverageLTV', 96, 'B_LEVERAGE_LTV_OUT_OF_RANGE', 'B_LEVERAGE_LTV_IMPLAUSIBLE'],
            ['capRate', 101, 'B_CAP_RATE_OUT_OF_RANGE', 'B_CAP_RATE_IMPLAUSIBLE'],
            ['bondYield', 10, 'B_BOND_YIELD_OUT_OF_RANGE', 'B_BOND_YIELD_IMPLAUSIBLE'],
            ['handlingFee', 101, 'B_HANDLING_FEE_OUT_OF_RANGE', 'B_HANDLING_FEE_IMPLAUSIBLE'],
            ['hibor', 101, 'B_HIBOR_OUT_OF_RANGE', 'B_HIBOR_IMPLAUSIBLE'],
            ['cofRate', 101, 'B_COF_RATE_OUT_OF_RANGE', 'B_COF_RATE_IMPLAUSIBLE'],
            ['mortgageTenor', 51, 'B_MORTGAGE_TENOR_OUT_OF_RANGE', 'B_MORTGAGE_TENOR_IMPLAUSIBLE'],
            ['budget', 1e15 + 1, 'B_BUDGET_OUT_OF_RANGE', ''],
        ];
        const warnValues: Partial<Record<keyof SimulationInput, number>> = {
            spread: 3, leverageLTV: 91, capRate: 13, bondYield: 8,
            handlingFee: 3, hibor: 10, cofRate: 10, mortgageTenor: 32,
        };
        for (const [field, blocked, blockId, warnId] of cases) {
            const blockedFindings = checkAssumptions(inputFromDefaults({ [field]: blocked } as Partial<SimulationInput>), clean.output);
            expect(ids(blockedFindings)).toContain(blockId);
            if (warnId) {
                const warning = warnValues[field]!;
                expect(ids(checkAssumptions(inputFromDefaults({ [field]: warning } as Partial<SimulationInput>), clean.output))).toContain(warnId);
            }
            expect(ids(checkAssumptions(clean.input, clean.output))).not.toContain(blockId);
        }
    });

    it('validates every numeric field across non-finite and negative values', () => {
        for (const field of VALIDATED_FIELDS as Array<keyof SimulationInput>) {
            for (const bad of [NaN, Infinity, -Infinity, undefined, null, -1]) {
                const findings = checkAssumptions(inputFromDefaults({ [field]: bad } as Partial<SimulationInput>), projectionFor().output);
                const token = String(field).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
                expect(ids(findings)).toContain(`B_${token}_INVALID`);
            }
        }
        expect(ids(checkAssumptions(inputFromDefaults({ interestBasis: 'bad' } as never), projectionFor().output))).toContain('STRUCT_INVALID_ENUM');
        expect(ids(checkAssumptions(inputFromDefaults({ fundSource: 'bad' } as never), projectionFor().output))).toContain('STRUCT_INVALID_ENUM');
    });

    it('handles output and projection edge cases without throwing', () => {
        const { input, output } = projectionFor({ budget: 0 });
        expect(checkAssumptions(input, output)).toEqual(expect.any(Array));
        expect(checkAssumptions(input, outputWith(output, { projectionData: [] }))).toEqual(expect.any(Array));
        expect(checkAssumptions(input, outputWith(output, { projectionData: undefined as never }))).toEqual(expect.any(Array));
        expect(ids(checkAssumptions(input, outputWith(output, { projectionData: [row(NaN, -1)] })))).not.toContain('A9_ENDS_NEGATIVE');
        expect(ids(checkAssumptions(input, outputWith(output, { totalPremium: NaN }))).filter(id => id === 'STRUCT_INVALID_OUTPUT')).toHaveLength(1);
    });

    it('does not mutate deeply frozen arguments and emits only finite values', () => {
        const { input, output } = projectionFor();
        const stress = stressWith([row(0, -1)]);
        expect(() => checkAssumptions(deepFreeze(input), deepFreeze(output), deepFreeze(stress))).not.toThrow();
        const all: Finding[] = [
            ...checkAssumptions(inputFromDefaults({ spread: 0.4 }), outputWith(output, { totalPremium: 0, monthlyNetCashflow: -100 })),
            ...checkAssumptions(input, output, stress),
        ];
        expect(all.every(finding => Object.values(finding.values).every(Number.isFinite))).toBe(true);
    });

    it('keeps the plausibility table as the sole Group B numeric source', () => {
        expect(Object.keys(PLAUSIBILITY_RANGES)).toEqual([
            'spread', 'leverageLTV', 'capRate', 'bondYield', 'handlingFee',
            'hibor', 'cofRate', 'mortgageTenor', 'budget',
            // Money inputs share budget's MAX_MONEY ceiling. They are bounds against arithmetic
            // overflow rather than product plausibility — see the note on the table itself.
            'cashReserve', 'bondAlloc', 'unlockedCash', 'monthlyMortgagePmt',
        ]);
    });
});
