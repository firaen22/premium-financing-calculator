import { describe, expect, it } from 'vitest';
import { DEFAULT_CLIENT_NAME, DEFAULT_INPUTS } from '../constants/defaults';
import {
    calculatePMT, calculateProjection, deriveEffectiveMortgageRate, deriveUnlockedCash,
    type SimulationInput,
} from './calculations';
import { type Finding } from './advisories';
import { nextSteps, type GuideContext } from './guide';

const inputFrom = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
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

const contextFrom = (inputOverrides: Partial<SimulationInput> = {}, overrides: Partial<GuideContext> = {}): GuideContext => {
    const input = inputFrom(inputOverrides);
    return {
        input,
        output: calculateProjection(input),
        advisories: [],
        visitedViews: ['allocation', 'marketRisk'],
        clientName: 'Chan Tai Man',
        simulatedHibor: 6,
        bondPriceDrop: 10,
        hibor: input.hibor,
        ...overrides,
    };
};

const blocker = (id = 'B_SPREAD_OUT_OF_RANGE'): Finding => ({
    id, severity: 'blocker', field: 'spread', messageKey: 'spread', values: {},
});

describe('nextSteps', () => {
    it('returns G1_ZERO_BUDGET first', () => {
        const step = nextSteps(contextFrom({ budget: 0 }))[0];
        expect(step).toEqual({ id: 'G1_ZERO_BUDGET', kind: 'action', targetView: 'allocation', field: 'budget', messageKey: 'g1', values: {} });
    });

    it('returns G2_NO_POLICY_FUNDED with allocation values', () => {
        const ctx = contextFrom({ budget: 4_000_000, cashReserve: 2_500_000, bondAlloc: 2_000_000 });
        expect(nextSteps(ctx)[0]).toEqual({
            id: 'G2_NO_POLICY_FUNDED', kind: 'action', targetView: 'allocation', field: 'bondAlloc', messageKey: 'g2',
            values: { budget: 4_000_000, cashReserve: 2_500_000, bondAlloc: 2_000_000 },
        });
    });

    it('returns G3_RESOLVE_BLOCKERS with the filtered count', () => {
        const step = nextSteps(contextFrom({}, { advisories: [blocker(), blocker('A3_NO_POLICY_FUNDED')] }))[0];
        expect(step).toEqual({ id: 'G3_RESOLVE_BLOCKERS', kind: 'action', targetView: null, field: null, messageKey: 'g3', values: { count: 1 } });
    });

    it('returns G4_STRESS_NOT_REVIEWED for an unvisited market risk view', () => {
        const step = nextSteps(contextFrom({}, { visitedViews: ['allocation'] }))[0];
        expect(step).toEqual({ id: 'G4_STRESS_NOT_REVIEWED', kind: 'action', targetView: 'marketRisk', field: null, messageKey: 'g4', values: {} });
    });

    it('returns G5_STRESS_NOT_ADVERSE for a non-downside stress rate', () => {
        const step = nextSteps(contextFrom({}, { simulatedHibor: 4, hibor: 4.15, bondPriceDrop: 0 }))[0];
        expect(step).toEqual({ id: 'G5_STRESS_NOT_ADVERSE', kind: 'action', targetView: 'marketRisk', field: 'simulatedHibor', messageKey: 'g5', values: { simulatedHibor: 4, hibor: 4.15 } });
    });

    it('returns G6_STRESS_INVALID for a non-finite visited stress rate', () => {
        const step = nextSteps(contextFrom({}, { simulatedHibor: NaN }))[0];
        expect(step).toEqual({ id: 'G6_STRESS_INVALID', kind: 'action', targetView: 'marketRisk', field: 'simulatedHibor', messageKey: 'g6', values: {} });
    });

    it('returns G7_CLIENT_UNNAMED for the default placeholder', () => {
        const step = nextSteps(contextFrom({}, { clientName: DEFAULT_CLIENT_NAME }))[0];
        expect(step).toEqual({ id: 'G7_CLIENT_UNNAMED', kind: 'action', targetView: 'pdfPreview', field: 'clientName', messageKey: 'g7', values: {} });
    });

    it('returns G8_READY alone when every prerequisite is satisfied', () => {
        expect(nextSteps(contextFrom())[0]).toEqual({ id: 'G8_READY', kind: 'ready', targetView: 'pdfPreview', field: null, messageKey: 'g8', values: {} });
        expect(nextSteps(contextFrom())).toHaveLength(1);
    });

    it('keeps the specific zero-budget step ahead of unrelated blockers', () => {
        expect(nextSteps(contextFrom({ budget: 0 }, { advisories: [blocker()] }))[0].id).toBe('G1_ZERO_BUDGET');
    });

    it('does not let A3_NO_POLICY_FUNDED shadow G2', () => {
        const ctx = contextFrom({ budget: 4_000_000, cashReserve: 2_500_000, bondAlloc: 2_000_000 }, {
            advisories: [blocker('A3_NO_POLICY_FUNDED')],
        });
        expect(nextSteps(ctx)[0].id).toBe('G2_NO_POLICY_FUNDED');
    });

    it('does not call a lower stress rate adverse when bond price drop is positive', () => {
        const steps = nextSteps(contextFrom({}, { simulatedHibor: 4, hibor: 4.15, bondPriceDrop: 10 }));
        expect(steps.map(step => step.id)).not.toContain('G5_STRESS_NOT_ADVERSE');
    });

    it('does not silence NaN stress input as ready', () => {
        const steps = nextSteps(contextFrom({}, { simulatedHibor: NaN }));
        expect(steps[0].id).toBe('G6_STRESS_INVALID');
        expect(steps.map(step => step.id)).not.toContain('G8_READY');
    });

    it('never returns an empty array, including all-zero and all-NaN contexts', () => {
        const zero = contextFrom({ budget: 0 }, { visitedViews: [] });
        const nanInput = inputFrom({
            budget: NaN, cashReserve: NaN, bondAlloc: NaN, bondYield: NaN, hibor: NaN,
            cofRate: NaN, spread: NaN, leverageLTV: NaN, capRate: NaN, handlingFee: NaN,
            unlockedCash: NaN, effectiveMortgageRate: NaN, monthlyMortgagePmt: NaN, mortgageTenor: NaN,
        });
        const nan = contextFrom({}, {
            input: nanInput, output: calculateProjection(nanInput), visitedViews: [],
            simulatedHibor: NaN, hibor: NaN, bondPriceDrop: NaN, clientName: '',
        });
        expect(nextSteps(zero)).not.toHaveLength(0);
        expect(nextSteps(nan)).not.toHaveLength(0);
    });

    it('keeps mutually exclusive rule groups separate', () => {
        const zeroSteps = nextSteps(contextFrom({ budget: 0 }));
        const unvisitedSteps = nextSteps(contextFrom({}, { visitedViews: ['allocation'] }));
        expect(zeroSteps.map(step => step.id)).not.toContain('G2_NO_POLICY_FUNDED');
        expect(unvisitedSteps.map(step => step.id)).not.toContain('G5_STRESS_NOT_ADVERSE');
        expect(unvisitedSteps.map(step => step.id)).not.toContain('G6_STRESS_INVALID');
    });

    it('is pure and deterministic', () => {
        const ctx = contextFrom();
        const before = structuredClone(ctx);
        const first = nextSteps(ctx);
        const second = nextSteps(ctx);
        expect(second).toEqual(first);
        expect(ctx).toEqual(before);
    });
});
