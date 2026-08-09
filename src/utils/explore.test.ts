import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_INPUTS } from '../constants/defaults';
import {
    calculatePMT,
    deriveEffectiveMortgageRate,
    deriveUnlockedCash,
    type SimulationInput,
} from './calculations';
import * as engineApi from './engineApi';
import { exploreStructures, MAX_CANDIDATES_EVALUATED } from './explore';

const inputFromDefaults = (overrides: Partial<SimulationInput> = {}): SimulationInput & Record<string, unknown> => {
    const unlockedCash = deriveUnlockedCash(DEFAULT_INPUTS.propertyValue, DEFAULT_INPUTS.mortgageLtv, DEFAULT_INPUTS.existingMortgage);
    const effectiveMortgageRate = deriveEffectiveMortgageRate(
        DEFAULT_INPUTS.hibor, DEFAULT_INPUTS.mortgageHSpread, DEFAULT_INPUTS.primeRate, DEFAULT_INPUTS.mortgagePModifier);
    const monthlyMortgagePmt = calculatePMT(effectiveMortgageRate, DEFAULT_INPUTS.mortgageTenor, unlockedCash);
    return {
        budget: DEFAULT_INPUTS.budget, cashReserve: DEFAULT_INPUTS.cashReserve, bondAlloc: DEFAULT_INPUTS.bondAlloc,
        bondYield: DEFAULT_INPUTS.bondYield, hibor: DEFAULT_INPUTS.hibor, cofRate: DEFAULT_INPUTS.cofRate,
        interestBasis: DEFAULT_INPUTS.interestBasis, spread: DEFAULT_INPUTS.spread, leverageLTV: DEFAULT_INPUTS.leverageLTV,
        capRate: DEFAULT_INPUTS.capRate, handlingFee: DEFAULT_INPUTS.handlingFee, fundSource: DEFAULT_INPUTS.fundSource,
        unlockedCash, effectiveMortgageRate, monthlyMortgagePmt, mortgageTenor: DEFAULT_INPUTS.mortgageTenor,
        ...overrides,
    } as SimulationInput & Record<string, unknown>;
};

describe('exploreStructures', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('carries base rate-locked fields to the engine call verbatim, only patching budget/cashReserve/bondAlloc', () => {
        const base = inputFromDefaults();
        const spy = vi.spyOn(engineApi, 'runSimulate');
        const result = exploreStructures({ base, metric: 'finalNetEquity', budgetSteps: 1, reserveSteps: 1, bondSteps: 1 });
        expect(Array.isArray(result)).toBe(false);
        expect(spy).toHaveBeenCalled();
        const lockedFields = ['hibor', 'cofRate', 'spread', 'bondLoanSpread', 'capRate', 'bondYield', 'handlingFee', 'leverageLTV', 'interestBasis', 'fundSource'] as const;
        for (const call of spy.mock.calls) {
            const input = call[0].input as Record<string, unknown>;
            for (const field of lockedFields) {
                if (field in base) expect(input[field]).toBe((base as Record<string, unknown>)[field]);
            }
        }
        if (!Array.isArray(result)) {
            for (const candidate of result.candidates) {
                expect(Object.keys(candidate.patch).sort()).toEqual(['bondAlloc', 'budget', 'cashReserve']);
            }
        }
    });

    it('rejects a candidate as invalid, not stress-failed, when the stress computation yields no finite peak LTV', () => {
        const base = inputFromDefaults();
        const stress = { simulatedHibor: base.hibor, bondPriceDrop: 0, showGuaranteed: false, sensitivityYear: 1 };
        vi.spyOn(engineApi, 'runSimulate').mockReturnValue({
            output: { finalNetEquity: 1, roi: 1, monthlyNetCashflow: 1, totalPremium: 1, bankLoan: 1, pfEquity: 1, effectiveRate: 1, ownCapital: 1, deployedCapital: 1 } as never,
            stress: { stressedProjection: [] } as never,
            findings: [],
            meta: { engineVersion: 'test', generatedAt: 'test' },
        });
        const result = exploreStructures({
            base, metric: 'finalNetEquity', budgetSteps: 1, reserveSteps: 1, bondSteps: 1, stress, maxStressLTV: 80,
        });
        expect(Array.isArray(result)).toBe(false);
        if (!Array.isArray(result)) {
            expect(result.rejected.invalid).toBeGreaterThan(0);
            expect(result.rejected.stress).toBe(0);
            expect(result.candidates).toHaveLength(0);
        }
    });

    it('rejects a candidate rather than emitting a non-finite summary field', () => {
        const base = inputFromDefaults();
        vi.spyOn(engineApi, 'runSimulate').mockReturnValue({
            output: { finalNetEquity: NaN, roi: 1, monthlyNetCashflow: 1, totalPremium: 1, bankLoan: 1, pfEquity: 1, effectiveRate: 1, ownCapital: 1, deployedCapital: 1 } as never,
            stress: undefined as never,
            findings: [],
            meta: { engineVersion: 'test', generatedAt: 'test' },
        });
        const result = exploreStructures({ base, metric: 'roi', budgetSteps: 1, reserveSteps: 1, bondSteps: 1 });
        expect(Array.isArray(result)).toBe(false);
        if (!Array.isArray(result)) {
            expect(result.rejected.invalid).toBeGreaterThan(0);
            expect(result.candidates).toHaveLength(0);
        }
    });

    it('keeps the payload under budget even when every candidate carries many non-blocker findings', () => {
        const base = inputFromDefaults();
        const manyFindings = Array.from({ length: 30 }, (_, index) => ({
            id: `NOTE_${index}_${'x'.repeat(20)}`,
            severity: (index % 2 === 0 ? 'warning' : 'note') as 'warning' | 'note',
            field: 'budget',
            messageKey: 'some.message.key',
            values: { a: 1, b: 2 },
        }));
        vi.spyOn(engineApi, 'runSimulate').mockReturnValue({
            output: { finalNetEquity: 1000000, roi: 0.1, monthlyNetCashflow: 500, totalPremium: 1, bankLoan: 1, pfEquity: 1, effectiveRate: 1, ownCapital: 1, deployedCapital: 1 } as never,
            stress: undefined as never,
            findings: manyFindings,
            meta: { engineVersion: 'test', generatedAt: 'test' },
        });
        const result = exploreStructures({ base, metric: 'finalNetEquity', topN: 5, budgetSteps: 6, reserveSteps: 5, bondSteps: 5 });
        expect(Array.isArray(result)).toBe(false);
        if (!Array.isArray(result)) {
            expect(result.candidates.length).toBeGreaterThan(0);
            for (const candidate of result.candidates) expect(candidate.findingSummary.topIds.length).toBeLessThanOrEqual(3);
            expect(JSON.stringify(result).length).toBeLessThan(4000);
        }
    });

    it('ranks the default grid deterministically', () => {
        const result = exploreStructures({ base: inputFromDefaults(), metric: 'finalNetEquity' });
        expect(Array.isArray(result) ? result : {
            evaluated: result.evaluated,
            rejected: result.rejected,
            candidates: result.candidates.map(candidate => ({ patch: candidate.patch, metricValue: candidate.metricValue })),
        }).toMatchInlineSnapshot(`
          {
            "candidates": [
              {
                "metricValue": 21546428.57142857,
                "patch": {
                  "bondAlloc": 0,
                  "budget": 4000000,
                  "cashReserve": 600000,
                },
              },
              {
                "metricValue": 18466071.428571433,
                "patch": {
                  "bondAlloc": 0,
                  "budget": 3500000,
                  "cashReserve": 600000,
                },
              },
              {
                "metricValue": 16890007.142857146,
                "patch": {
                  "bondAlloc": 1900000,
                  "budget": 4000000,
                  "cashReserve": 200000,
                },
              },
            ],
            "evaluated": 45,
            "rejected": {
              "blockers": 22,
              "invalid": 0,
              "stress": 0,
            },
          }
        `);
    });

    it('keeps the full result under the payload budget', () => {
        const result = exploreStructures({ base: inputFromDefaults(), metric: 'roi' });
        expect(Array.isArray(result)).toBe(false);
        expect(JSON.stringify(result).length).toBeLessThan(4000);
    });

    // The largest grid a caller may legally request must still evaluate WHOLE. Truncation would
    // break out of the ascending budget loop early and drop the highest-budget candidates, biasing
    // the ranking toward the cheap end; the step caps exist so that can never happen.
    it('evaluates the largest legal grid whole, without truncating', () => {
        const request = { base: inputFromDefaults(), metric: 'roi' as const, budgetSteps: 6, reserveSteps: 5, bondSteps: 5 };
        const first = exploreStructures(request);
        const second = exploreStructures(request);
        expect(first).toEqual(second);
        expect(Array.isArray(first)).toBe(false);
        if (!Array.isArray(first)) {
            expect(first.evaluated).toBe(150);
            expect(first.evaluated).toBe(MAX_CANDIDATES_EVALUATED);
            expect(first.truncated).toBe(false);
        }
    });

    it('uses percentage points for maxStressLTV and preserves the stress requirement', () => {
        const base = inputFromDefaults();
        const stress = { simulatedHibor: base.hibor, bondPriceDrop: 0, showGuaranteed: false, sensitivityYear: 1 };
        const valid = exploreStructures({ base, metric: 'roi', budgetSteps: 1, reserveSteps: 1, bondSteps: 1, stress, maxStressLTV: 80 });
        expect(Array.isArray(valid)).toBe(false);
        expect(exploreStructures({ base, metric: 'roi', maxStressLTV: 101 })).toEqual([{ field: 'maxStressLTV', reason: 'invalid_maxStressLTV' }]);
        expect(exploreStructures({ base, metric: 'roi', maxStressLTV: 100 })).toEqual([{ field: 'stress', reason: 'stress_required' }]);
    });

    it('requires at least two scenarios', () => {
        const base = inputFromDefaults();
        expect(exploreStructures({ base, metric: 'roi', topN: 1 })).toEqual([{ field: 'topN', reason: 'topN_out_of_range' }]);
        const valid = exploreStructures({ base, metric: 'roi', topN: 2, budgetSteps: 1, reserveSteps: 1, bondSteps: 1 });
        expect(Array.isArray(valid)).toBe(false);
    });

    it('uses bankLoan ascending as the deterministic tie-breaker', () => {
        const base = inputFromDefaults();
        vi.spyOn(engineApi, 'runSimulate').mockImplementation(({ input }) => ({
            output: {
                finalNetEquity: 1, roi: 1, monthlyNetCashflow: 1, totalPremium: 1,
                bankLoan: 10_000_000 - (input.budget as number), pfEquity: 1,
                effectiveRate: 1, ownCapital: 1, deployedCapital: 1,
            } as never,
            stress: null,
            findings: [],
            meta: { engineVersion: 'test', generatedAt: 'test' },
        }));
        const result = exploreStructures({ base, metric: 'roi', topN: 3, budgetSteps: 3, reserveSteps: 1, bondSteps: 1 });
        expect(Array.isArray(result)).toBe(false);
        if (!Array.isArray(result)) {
            expect(result.candidates.map(candidate => candidate.metricValue)).toEqual([1, 1, 1]);
            expect(result.candidates.map(candidate => candidate.summary.bankLoan)).toEqual([
                ...result.candidates.map(candidate => candidate.summary.bankLoan),
            ].sort((left, right) => left - right));
        }
    });

    it('range-validates caller-supplied base fields before exploring', () => {
        // INPUT_RANGES.hibor is inclusive 0-100; 101 is outside that range.
        const result = exploreStructures({ base: inputFromDefaults({ hibor: 101 }), metric: 'roi' });
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'hibor' })]));
    });

    it.each([
        ['budgetSteps', NaN], ['budgetSteps', Infinity], ['budgetSteps', 0], ['budgetSteps', -1], ['budgetSteps', 2.5], ['budgetSteps', 7],
        ['reserveSteps', NaN], ['reserveSteps', Infinity], ['reserveSteps', 0], ['reserveSteps', -1], ['reserveSteps', 2.5], ['reserveSteps', 6],
        ['bondSteps', NaN], ['bondSteps', Infinity], ['bondSteps', 0], ['bondSteps', -1], ['bondSteps', 2.5], ['bondSteps', 6],
        ['topN', NaN], ['topN', Infinity], ['topN', 0], ['topN', -1], ['topN', 2.5], ['topN', 6],
    ] as [string, number][])('rejects invalid %s=%s without throwing', (field, value) => {
        const result = exploreStructures({ base: inputFromDefaults(), metric: 'roi', [field]: value } as never);
        const invalid = typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value);
        expect(result).toEqual([{ field, reason: invalid ? `invalid_${field}` : `${field}_out_of_range` }]);
    });

    it('handles invalid base and stress-bound requests as validation fields', () => {
        expect(exploreStructures({ base: inputFromDefaults({ budget: NaN }), metric: 'roi' })).toEqual([{ field: 'budget', reason: 'invalid_base' }]);
        expect(exploreStructures({ base: inputFromDefaults({ budget: Infinity }), metric: 'roi' })).toEqual([{ field: 'budget', reason: 'invalid_base' }]);
        expect(exploreStructures({ base: inputFromDefaults({ budget: -1 }), metric: 'roi' })).toEqual([{ field: 'budget', reason: 'invalid_base' }]);
        expect(exploreStructures({ base: inputFromDefaults({ budget: 1, cashReserve: 2 }), metric: 'roi' })).toEqual([{ field: 'cashReserve', reason: 'invalid_range' }]);
        expect(exploreStructures({ base: inputFromDefaults(), metric: 'roi', maxStressLTV: 1 })).toEqual([{ field: 'stress', reason: 'stress_required' }]);
        expect(exploreStructures({ base: inputFromDefaults(), metric: 'roi', maxStressLTV: NaN })).toEqual([{ field: 'maxStressLTV', reason: 'invalid_maxStressLTV' }]);
        expect(exploreStructures({ base: inputFromDefaults(), metric: 'roi', maxStressLTV: Infinity })).toEqual([{ field: 'maxStressLTV', reason: 'invalid_maxStressLTV' }]);
        expect(exploreStructures({ base: inputFromDefaults(), metric: 'roi', maxStressLTV: -1 })).toEqual([{ field: 'maxStressLTV', reason: 'invalid_maxStressLTV' }]);
    });

    it('treats budget=0 as a valid one-point range, not a rejection', () => {
        const result = exploreStructures({ base: inputFromDefaults({ budget: 0, cashReserve: 0, bondAlloc: 0 }), metric: 'roi', budgetSteps: 3 });
        expect(Array.isArray(result)).toBe(false);
        if (!Array.isArray(result)) {
            expect(result.evaluated).toBeGreaterThan(0);
        }
    });

    it('filters out grid points that end underwater as blockers, not as accepted candidates', () => {
        // The default grid's low-budget corner ends negative (A9_ENDS_NEGATIVE); this
        // is the concrete blocker path the ranking must exclude.
        const result = exploreStructures({ base: inputFromDefaults(), metric: 'finalNetEquity' });
        expect(Array.isArray(result)).toBe(false);
        if (!Array.isArray(result)) {
            expect(result.rejected.blockers).toBeGreaterThan(0);
            expect(result.candidates.length).toBeGreaterThan(0);
            expect(result.candidates.length + result.rejected.blockers).toBeLessThanOrEqual(result.evaluated);
        }
    });
});
