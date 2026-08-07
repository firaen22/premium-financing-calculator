import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS } from '../constants/defaults';
import {
    BASE_FACTORS,
    calculateIRR,
    calculatePMT,
    calculateProjection,
    calculateStressTest,
    deriveEffectiveMortgageRate,
    deriveMortgageCashOut,
    deriveMortgageSchedule,
    deriveTopUpSchedule,
    deriveUnlockedCash,
    LTV_IMPAIRED,
    lookupRebateRate,
    type SimulationInput,
    type SimulationOutput,
    type StressTestInput,
} from './calculations';

const topUpArgs = (overrides: Partial<Parameters<typeof deriveTopUpSchedule>[0]> = {}) => ({
    surrenderByYear: Array.from({ length: 31 }, (_, year) => year * 100),
    cumMortgagePayments: Array.from({ length: 31 }, (_, year) => year * 10),
    cumPolicyLoanInterest: Array.from({ length: 31 }, (_, year) => year * 5),
    cumBondInterest: Array.from({ length: 31 }, (_, year) => year * 20),
    cashReserve: 1000,
    mode: 'annual' as const,
    minTopUpHkd: 100,
    rate: 0.1,
    ...overrides,
});

const inputFromDefaults = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
    const unlockedCash = deriveUnlockedCash(
        DEFAULT_INPUTS.propertyValue, DEFAULT_INPUTS.mortgageLtv, DEFAULT_INPUTS.existingMortgage);
    const effectiveMortgageRate = deriveEffectiveMortgageRate(
        DEFAULT_INPUTS.hibor, DEFAULT_INPUTS.mortgageHSpread,
        DEFAULT_INPUTS.primeRate, DEFAULT_INPUTS.mortgagePModifier);
    const monthlyMortgagePmt = calculatePMT(
        effectiveMortgageRate, DEFAULT_INPUTS.mortgageTenor, unlockedCash);

    return {
        budget: DEFAULT_INPUTS.budget,
        cashReserve: DEFAULT_INPUTS.cashReserve,
        bondAlloc: DEFAULT_INPUTS.bondAlloc,
        bondYield: DEFAULT_INPUTS.bondYield,
        hibor: DEFAULT_INPUTS.hibor,
        cofRate: DEFAULT_INPUTS.cofRate,
        interestBasis: DEFAULT_INPUTS.interestBasis,
        spread: DEFAULT_INPUTS.spread,
        leverageLTV: DEFAULT_INPUTS.leverageLTV,
        capRate: DEFAULT_INPUTS.capRate,
        handlingFee: DEFAULT_INPUTS.handlingFee,
        fundSource: DEFAULT_INPUTS.fundSource,
        unlockedCash,
        effectiveMortgageRate,
        monthlyMortgagePmt,
        mortgageTenor: DEFAULT_INPUTS.mortgageTenor,
        ...overrides,
    };
};

const stressInput = (
    projection: SimulationOutput,
    overrides: Partial<StressTestInput> = {},
): StressTestInput => ({
    projectionData: projection.projectionData,
    simulatedHibor: DEFAULT_INPUTS.simulatedHibor,
    bondPriceDrop: DEFAULT_INPUTS.bondPriceDrop,
    showGuaranteed: false,
    totalPremium: projection.totalPremium,
    netBondPrincipal: projection.netBondPrincipal,
    bondYield: DEFAULT_INPUTS.bondYield,
    bankLoan: projection.bankLoan,
    spread: DEFAULT_INPUTS.spread,
    capRate: DEFAULT_INPUTS.capRate,
    budget: DEFAULT_INPUTS.budget,
    cashReserve: DEFAULT_INPUTS.cashReserve,
    sensitivityYear: DEFAULT_INPUTS.sensitivityYear,
    fundSource: DEFAULT_INPUTS.fundSource,
    unlockedCash: 0,
    interestBasis: DEFAULT_INPUTS.interestBasis,
    cofRate: DEFAULT_INPUTS.cofRate,
    hibor: DEFAULT_INPUTS.hibor,
    ...overrides,
});

const nonFiniteNumbers = (value: unknown, path = 'result'): string[] => {
    if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path}=${String(value)}`];
    if (Array.isArray(value)) return value.flatMap((item, index) => nonFiniteNumbers(item, `${path}[${index}]`));
    if (value !== null && typeof value === 'object') {
        return Object.entries(value).flatMap(([key, item]) => nonFiniteNumbers(item, `${path}.${key}`));
    }
    return [];
};

describe('Phase 5 return metrics', () => {
    describe('calculateIRR', () => {
        it('returns null for empty, short, and same-sign cash flows', () => {
            for (const cashFlows of [
                [],
                [100],
                [100, 200],
                [-100, -1],
                [0, 0],
            ] as number[][]) {
                expect(calculateIRR(cashFlows)).toBeNull();
            }
        });

        it('solves the known two-year 10% answer', () => {
            const rate = calculateIRR([-100, 0, 121]);
            expect(rate).not.toBeNull();
            expect(Math.abs((rate as number) * 100 - 10) / 10).toBeLessThanOrEqual(1e-6);
        });

        it('solves the known one-year 10% answer', () => {
            const rate = calculateIRR([-100, 110]);
            expect(rate).not.toBeNull();
            expect(Math.abs((rate as number) * 100 - 10) / 10).toBeLessThanOrEqual(1e-6);
        });

        it('accepts a zero initial cash flow when later flows change sign', () => {
            const rate = calculateIRR([0, -100, 121]);
            expect(rate).not.toBeNull();
            expect((rate as number) * 100).toBeCloseTo(21, 6);
        });

        it('returns the valid zero-rate root when terminal value equals own capital', () => {
            expect(calculateIRR([-100, 100])).toBe(0);
        });

        it('returns null for total loss vectors rather than a rate at or below -100%', () => {
            for (const cashFlows of [[-100, 0], [-100, -1]]) {
                const rate = calculateIRR(cashFlows);
                expect(rate === null || (Number.isFinite(rate) && rate >= -0.9999)).toBe(true);
            }
        });

        it('never returns a non-finite result for a huge terminal gain', () => {
            const rate = calculateIRR([-1, Number.MAX_VALUE]);
            expect(rate === null || Number.isFinite(rate)).toBe(true);
        });

        // A billion-dollar-scale cash flow was flagged as a risk case: an absolute NPV
        // tolerance (1e-7) can sit below one ULP of a large-magnitude value, which would
        // make convergence unreachable. It doesn't happen here — the tolerance is checked
        // against the NPV itself, and dividing a ~1e10 flow by (1+r)^t brings the ratio
        // back to an ordinary magnitude before the comparison — but it is cheap to pin.
        it('converges at billion-dollar scale', () => {
            const rate = calculateIRR([-10_000_000_000, 0, 15_000_000_000]);
            expect(rate).not.toBeNull();
            expect(Math.abs((rate as number) - 0.224744871) / 0.224744871).toBeLessThanOrEqual(1e-6);
        });

        it.each([
            [Number.NaN, 1],
            [Number.POSITIVE_INFINITY, -1],
            [-1, Number.NEGATIVE_INFINITY],
        ])('returns null for non-finite cash flow entries %j', (first, second) => {
            expect(calculateIRR([first, second])).toBeNull();
        });
    });

    it('adds finite per-year ROI, average return, and annual IRR metrics', () => {
        const projection = calculateProjection(inputFromDefaults());

        expect(projection.projectionData[0].irr).toBeNull();
        for (const year of [0, 1, 2, 5, 10, 30]) {
            const row = projection.projectionData[year];
            expect(Number.isFinite(row.roi)).toBe(true);
            expect(Number.isFinite(row.averageReturn)).toBe(true);
            expect(row.averageReturn).toBe(year > 0 ? row.roi / year : 0);
            expect(row.irr === null || Number.isFinite(row.irr)).toBe(true);
        }
        expect(projection.projectionData[30].roi).toBe(projection.roi);
    });

    it('guards ROI metrics when deployed capital is non-positive', () => {
        const projection = calculateProjection(inputFromDefaults({
            budget: 0, cashReserve: 0, bondAlloc: 0, extraCash: 0,
        }));

        expect(projection.deployedCapital).toBe(0);
        expect(projection.projectionData.every(row => row.roi === 0 && row.averageReturn === 0
            && row.irr === null)).toBe(true);
        expect(projection.projectionData[0].irr).toBeNull();
    });

    it('computes annualRoC on the same deployed-capital base as roi', () => {
        const extraCash = 500_000;
        const projection = calculateProjection(inputFromDefaults({ extraCash }));
        const deployedCapital = projection.deployedCapital;
        expect(deployedCapital).toBeGreaterThan(extraCash);

        for (const year of [1, 5, 10, 30]) {
            const row = projection.projectionData[year];
            expect(row.annualRoC).toBeCloseTo((row.annualNetGain / deployedCapital) * 100, 10);
        }
    });

    it('reports a non-zero annualRoC when the position is funded entirely by extra cash', () => {
        const projection = calculateProjection(inputFromDefaults({
            budget: 0, cashReserve: 0, bondAlloc: 0, extraCash: 1_000_000,
        }));

        expect(projection.deployedCapital).toBe(1_000_000);
        const row = projection.projectionData[10];
        // Guards the regression: with a budget-only denominator this read 0.
        expect(row.annualNetGain).not.toBe(0);
        expect(row.annualRoC).toBeCloseTo((row.annualNetGain / 1_000_000) * 100, 10);
    });

    describe('mortgage-funded IRR', () => {
        // fundSource 'mortgage' means the client fronts no day-1 capital and instead
        // services the refinanced mortgage. DEFAULT_INPUTS is cash-funded, so nothing
        // else in the suite covers this path.
        const mortgageFunded = (overrides: Partial<SimulationInput> = {}) => {
            const unlockedCash = deriveUnlockedCash(
                DEFAULT_INPUTS.propertyValue, DEFAULT_INPUTS.mortgageLtv,
                DEFAULT_INPUTS.existingMortgage);
            return calculateProjection(inputFromDefaults({
                fundSource: 'mortgage', budget: unlockedCash, ...overrides,
            }));
        };
        const netRebate = (p: SimulationOutput) =>
            p.policyRebate + p.bankCashRebate + p.fundFeeRebate - p.assetLoanFee;

        it('returns a rate once the position is above water', () => {
            // Previously EVERY year returned null here, because ownCapital was 0 under
            // mortgage funding and a two-point vector had no sign change to solve.
            const projection = mortgageFunded();
            const rows = projection.projectionData;
            const terminalRebate = netRebate(projection);

            expect(rows[0].irr).toBeNull();
            for (let year = 1; year <= 30; year++) {
                const row = rows[year];
                const exitFlow = row.netEquity + terminalRebate - row.annualMortgagePayment;
                if (exitFlow > 0) {
                    expect(row.irr).not.toBeNull();
                    expect(Number.isFinite(row.irr!)).toBe(true);
                } else {
                    // Every flow is an outflow, so there is genuinely no rate to solve.
                    expect(row.irr).toBeNull();
                }
            }
            // Keeps the loop above from passing vacuously if the scenario ever changes.
            expect(rows[30].irr).not.toBeNull();
        });

        it('stays null only while net equity is still below the day-1 haircut', () => {
            const rows = mortgageFunded().projectionData;

            expect(rows[4].netEquity).toBeLessThan(0);
            expect(rows[4].irr).toBeNull();

            expect(rows[10].netEquity).toBeGreaterThan(0);
            expect(rows[10].irr).not.toBeNull();
        });

        it('prices an early exit as a loss', () => {
            // A year-5 unwind has barely cleared the haircut against five years of
            // servicing, so the rate must be deeply negative rather than flattering.
            const rows = mortgageFunded().projectionData;

            expect(rows[5].irr!).toBeLessThan(0);
            expect(rows[30].irr!).toBeGreaterThan(0);
        });

        it('returns a rate that zeroes the NPV of the real client cash flows', () => {
            // Independent of how the engine assembles its vector: discount the mortgage
            // payments the client actually makes against the equity they actually exit
            // with, and the reported rate must solve it.
            const projection = mortgageFunded();
            const rows = projection.projectionData;
            const terminalRebate = netRebate(projection);

            for (const year of [5, 10, 20, 30]) {
                const rate = rows[year].irr! / 100;
                let npv = 0;
                for (let y = 1; y <= year; y++) {
                    npv -= rows[y].annualMortgagePayment / (1 + rate) ** y;
                }
                npv += (rows[year].netEquity + terminalRebate) / (1 + rate) ** year;
                expect(npv / rows[year].netEquity).toBeCloseTo(0, 8);
            }
        });

        it('adds mortgage payments back into the terminal value exactly once', () => {
            // The invariant the terminal value depends on: cumulativeNetGain has already
            // deducted the payments, so an IRR that also charges them per year must add
            // them back. Without this the year-30 rate reads far below the true one.
            const projection = mortgageFunded();
            const row = projection.projectionData[30];

            expect(row.cumulativeMortgageCost).toBeGreaterThan(0);
            expect(row.cumulativeNetGain + row.cumulativeMortgageCost)
                .toBeCloseTo(row.netEquity + netRebate(projection), 6);
        });

        it('beats the cash-funded rate on the same defaults, as leverage should', () => {
            const cash = calculateProjection(inputFromDefaults({ fundSource: 'cash' }));
            const mortgage = mortgageFunded();

            expect(mortgage.projectionData[30].irr!)
                .toBeGreaterThan(cash.projectionData[30].irr!);
        });
    });

    it('leaves the cash-funded IRR on its original two-point vector', () => {
        // The mortgage stream must collapse to a single day-1 outlay under cash funding.
        const projection = calculateProjection(inputFromDefaults({ fundSource: 'cash' }));
        const row = projection.projectionData[30];
        const twoPoint = calculateIRR([
            -projection.ownCapital,
            ...Array(29).fill(0),
            projection.ownCapital + row.cumulativeNetGain,
        ]);

        expect(twoPoint).not.toBeNull();
        expect(row.irr).toBeCloseTo(twoPoint! * 100, 10);
    });
});

describe('injected client cash (extraCash)', () => {
    // `budget` is the mortgage cash-out; `extraCash` is the client's own money on top.
    // The UI used to fold both into `budget` and then park the injection in cashReserve,
    // so entering Input Cash bought no extra policy while still enlarging the ROI base.
    const unlockedCash = deriveUnlockedCash(
        DEFAULT_INPUTS.propertyValue, DEFAULT_INPUTS.mortgageLtv, DEFAULT_INPUTS.existingMortgage);
    const mortgageFunded = (overrides: Partial<SimulationInput> = {}) =>
        calculateProjection(inputFromDefaults({
            fundSource: 'mortgage', budget: unlockedCash, ...overrides,
        }));

    it('deploys injected cash into the policy rather than parking it', () => {
        const without = mortgageFunded();
        const with1M = mortgageFunded({ extraCash: 1_000_000 });

        expect(with1M.pfEquity).toBeCloseTo(without.pfEquity + 1_000_000, 6);
        expect(with1M.totalPremium).toBeGreaterThan(without.totalPremium);
    });

    it('funds a reserve larger than the budget alone', () => {
        // cashReserve used to be clamped to `budget`, so 500k of the reserve silently
        // stayed in the policy — the projection ran on a reserve the user never asked for.
        const projection = calculateProjection(inputFromDefaults({
            budget: 1_000_000, extraCash: 2_000_000, cashReserve: 1_500_000, bondAlloc: 0,
        }));

        expect(projection.pfEquity).toBeCloseTo(1_500_000, 6);
    });

    it('funds a bond sleeve larger than the budget alone', () => {
        const projection = calculateProjection(inputFromDefaults({
            budget: 1_000_000, extraCash: 2_000_000, cashReserve: 0, bondAlloc: 2_500_000,
            handlingFee: 0, bondCollateralLTV: 0,
        }));

        expect(projection.netBondPrincipal).toBeCloseTo(2_500_000, 6);
        expect(projection.pfEquity).toBeCloseTo(500_000, 6);
    });

    it('still clamps an allocation the injected cash cannot cover', () => {
        const projection = calculateProjection(inputFromDefaults({
            budget: 1_000_000, extraCash: 500_000, cashReserve: 0, bondAlloc: 9_000_000,
            handlingFee: 0,
        }));

        expect(projection.netBondPrincipal).toBeCloseTo(1_500_000, 6);
    });

    it('counts injected cash as the client\'s own capital under mortgage funding', () => {
        const projection = mortgageFunded({ extraCash: 1_000_000 });

        // The cash-out is borrowed; only the injection is theirs.
        expect(projection.ownCapital).toBeCloseTo(1_000_000, 6);
        expect(projection.deployedCapital).toBeCloseTo(unlockedCash + 1_000_000, 6);
    });

    it('charges injected cash as a day-1 outflow in the IRR', () => {
        // Rebuilt from the rows rather than the engine's own vector: the injection has to
        // appear at t=0, or a mortgage-funded IRR reads as return on no money at all.
        const projection = mortgageFunded({ extraCash: 1_000_000 });
        const rows = projection.projectionData;
        const terminalRebate = projection.policyRebate + projection.bankCashRebate
            + projection.fundFeeRebate - projection.assetLoanFee;
        const rate = rows[30].irr! / 100;

        let npv = -1_000_000;
        for (let year = 1; year <= 30; year++) {
            npv -= rows[year].annualMortgagePayment / (1 + rate) ** year;
        }
        npv += (rows[30].netEquity + terminalRebate) / (1 + rate) ** 30;

        expect(npv / rows[30].netEquity).toBeCloseTo(0, 8);
    });

    it('leaves a projection without injected cash untouched', () => {
        // Guards the whole feature against becoming a silent default: the golden snapshot
        // and both workbook parity fixtures run with no injection.
        const omitted = calculateProjection(inputFromDefaults());
        const explicitZero = calculateProjection(inputFromDefaults({ extraCash: 0 }));

        expect(explicitZero).toEqual(omitted);
    });
});

describe('premium-financing arithmetic engine golden regressions', () => {
    describe('1. phantom loan', () => {
        it('does not create a loan when equity is non-positive', () => {
            // The old default state had a $1M budget against $3M of bonds. It funded no
            // policy, but the old loan formula reported the equity shortfall as a loan.
            const result = calculateProjection(inputFromDefaults({ budget: 1_000_000 }));

            expect(result.totalPremium).toBe(0);
            expect(result.bankLoan).toBe(0);
            expect(result.projectionData[30].cumulativeInterest).toBe(0);
        });
    });

    describe('2. default coherence', () => {
        it('uses coherent defaults and leaves room for policy equity', () => {
            const result = calculateProjection(inputFromDefaults());

            expect(result.pfEquity).toBe(800000);
            expect(result.totalPremium).toBeCloseTo(800000 / 0.28, 2);
            expect(result.bankLoan).toBeCloseTo(result.totalPremium - result.pfEquity, 2);
            expect(DEFAULT_INPUTS.cashReserve + DEFAULT_INPUTS.bondAlloc).toBeLessThan(DEFAULT_INPUTS.budget);
        });
    });

    describe('3. stress-test basis consistency', () => {
        it.each([
            ['hibor', 5.0],
            ['cof', 8.0],
            ['cof', 2.0],
        ] as const)('has no zero-shock divergence for basis=%s cofRate=%s', (interestBasis, cofRate) => {
            // Zero rate shock and zero bond drop must reproduce the baseline on both
            // interest bases; otherwise the stress chart compares unlike calculations.
            const projection = calculateProjection(inputFromDefaults({ interestBasis, cofRate }));
            const stressed = calculateStressTest(stressInput(projection, {
                interestBasis, cofRate, simulatedHibor: DEFAULT_INPUTS.hibor, bondPriceDrop: 0,
            }));
            const worst = Math.max(...projection.projectionData.map((row, year) =>
                Math.abs(stressed.stressedProjection[year].netEquity - row.netEquity)));

            expect(worst).toBeLessThan(1);
        });

        // Regression for the Year-0 basis mismatch: the baseline's Year-0 mortgage
        // balance is the GROSS new loan (mortgageSchedule[0].balance); a stress-test
        // Year 0 built from the NET unlockedCash (excluding the refinanced-away existing
        // mortgage) diverges from the baseline by exactly that existing-mortgage amount
        // even at zero shock. inputFromDefaults's own fundSource stays 'cash', so this
        // needs its own mortgage/properties input to exercise the path at all.
        it('has no zero-shock divergence on the mortgage path with an existing loan', () => {
            const unlockedCash = deriveMortgageCashOut([
                { value: 5_100_000, ltv: 80, existingMortgage: 1_900_000, tenor: 25, rate: 2.31 },
            ]);
            const projection = calculateProjection(inputFromDefaults({
                fundSource: 'mortgage',
                unlockedCash,
                properties: [
                    { value: 5_100_000, ltv: 80, existingMortgage: 1_900_000, tenor: 25, rate: 2.31 },
                ],
            }));
            const stressed = calculateStressTest(stressInput(projection, {
                unlockedCash, fundSource: 'mortgage', simulatedHibor: DEFAULT_INPUTS.hibor, bondPriceDrop: 0,
            }));
            const worst = Math.max(...projection.projectionData.map((row, year) =>
                Math.abs(stressed.stressedProjection[year].netEquity - row.netEquity)));

            expect(worst).toBeLessThan(1);
        });

        it.each([
            ['hibor', 5.0],
            ['cof', 2.0],
        ] as const)('lowers year-10 equity after a real shock for basis=%s cofRate=%s', (interestBasis, cofRate) => {
            // COF is kept below the cap here so the assertion tests repricing rather
            // than merely observing the 9% cap.
            const projection = calculateProjection(inputFromDefaults({ interestBasis, cofRate }));
            const stressed = calculateStressTest(stressInput(projection, {
                interestBasis, cofRate, simulatedHibor: 6.5, bondPriceDrop: 0,
            }));

            expect(stressed.stressedProjection[10].netEquity)
                .toBeLessThan(projection.projectionData[10].netEquity);
        });

        it('absorbs a COF shock at the cap', () => {
            // With COF 8% and spread 1.3%, baseline pricing is already at the 9% cap;
            // a shock to HIBOR 9% must therefore be absorbed and change nothing.
            const projection = calculateProjection(inputFromDefaults({ interestBasis: 'cof', cofRate: 8.0 }));
            const stressed = calculateStressTest(stressInput(projection, {
                interestBasis: 'cof', cofRate: 8.0, simulatedHibor: 9.0, bondPriceDrop: 0,
            }));

            expect(Math.abs(stressed.stressedProjection[10].netEquity - projection.projectionData[10].netEquity))
                .toBeLessThan(1);
        });
    });

    describe('4. calculatePMT guards', () => {
        it.each([
            [3.75, 0, 4500000, true],
            [0, 0, 0, false],
            [0, 0, 4500000, false],
            [0, 30, 4500000, false],
            [3.75, 30, 0, false],
        ])('returns a finite payment for (%s, %s, %s)', (rate, tenor, pv, clearedTenor) => {
            // A cleared tenor used to divide by zero and render Infinity in the UI.
            const result = calculatePMT(rate, tenor, pv);

            expect(Number.isFinite(result)).toBe(true);
            if (clearedTenor) expect(result).toBe(0);
        });

        // Finiteness alone is not enough: the zero-rate branch divided the principal by
        // YEARS while every caller treats the result as a MONTHLY payment, so a 12x
        // overstatement passed the check above. These two assert the value.
        it('spreads an interest-free loan over months, not years', () => {
            expect(calculatePMT(0, 30, 4500000)).toBe(4500000 / 360);
        });

        it('returns a payment that amortises the balance to zero over the term', () => {
            // Independent of the closed form: run the schedule the payment implies.
            const pmt = calculatePMT(3.75, 30, 4500000);
            let balance = 4500000;
            for (let m = 0; m < 360; m++) balance = balance * (1 + 0.0375 / 12) - pmt;
            expect(Math.abs(balance)).toBeLessThan(1);
        });
    });

    describe('11. multi-property mortgage schedule', () => {
        it('returns 31 zeroed years for an empty or absent property list', () => {
            expect(deriveMortgageSchedule([])).toEqual(Array.from({ length: 31 }, () => ({
                balance: 0, cumulativePayments: 0, cumulativeInterest: 0, annualPayment: 0,
            })));
            expect(deriveMortgageSchedule(undefined)).toEqual(deriveMortgageSchedule([]));
            expect(deriveMortgageCashOut(undefined)).toBe(0);
        });

        it('uses at most eight properties', () => {
            const property = { value: 100, ltv: 50, existingMortgage: 0, tenor: 1, rate: 0 };
            const properties = Array.from({ length: 9 }, () => property);
            expect(deriveMortgageCashOut(properties)).toBe(8 * 50);
            expect(deriveMortgageSchedule(properties)[0].balance).toBe(8 * 50);
        });

        // 'Data Entry'!B6 = B3*B4-B5 carries no MAX, and F6 sums the signed per-property
        // figures. A refinance DOWN releases nothing and costs cash to complete, so it has
        // to pull the pooled cash-out down. Clamping it at 0 while the schedule still
        // carries the full `gross` would charge a debt against a property booked as having
        // released nothing — inventing a loss of exactly `gross`.
        it('lets a refinance-down reduce the pooled cash-out instead of flooring it', () => {
            const releases = { value: 100, ltv: 50, existingMortgage: 0, tenor: 1, rate: 0 };
            const consumes = { ...releases, existingMortgage: 60 };

            expect(deriveMortgageCashOut([consumes])).toBe(-10);
            expect(deriveMortgageCashOut([releases, consumes])).toBe(40);
            // The debt is real regardless of what the property released.
            expect(deriveMortgageSchedule([consumes])[0].balance).toBe(50);
        });

        it('sanitizes non-finite fields and keeps the schedule finite', () => {
            const schedule = deriveMortgageSchedule([{
                value: Number.NaN, ltv: Number.POSITIVE_INFINITY,
                existingMortgage: Number.NaN, tenor: Number.POSITIVE_INFINITY,
                rate: Number.NEGATIVE_INFINITY,
            }]);
            expect(schedule.every(row => Object.values(row).every(Number.isFinite))).toBe(true);
            expect(schedule.every(row => Object.values(row).every(value => value === 0))).toBe(true);
        });

        it('does not grow the balance under negative amortisation', () => {
            const schedule = deriveMortgageSchedule([{
                value: 1_000_000, ltv: 100, existingMortgage: 0, tenor: 50, rate: 100,
            }]);
            expect(schedule.every((row, year) => year === 0 || row.balance <= schedule[year - 1].balance))
                .toBe(true);
        });

        it('keeps zero-tenor debt unchanged and pays zero interest at zero rate', () => {
            const unamortised = deriveMortgageSchedule([{
                value: 1_000_000, ltv: 80, existingMortgage: 0, tenor: 0, rate: 2.5,
            }]);
            expect(unamortised[30]).toEqual({
                balance: 800_000, cumulativePayments: 0, cumulativeInterest: 0, annualPayment: 0,
            });
            const straightLine = deriveMortgageSchedule([{
                value: 1_000_000, ltv: 80, existingMortgage: 0, tenor: 1, rate: 0,
            }]);
            expect(straightLine[1].balance).toBeCloseTo(0, 9);
            expect(straightLine[1].cumulativeInterest).toBe(0);
        });
    });

    describe('12. Phase 3 policy top-up schedule', () => {
        it('returns exactly 31 zero rows for off, invalid minimum, and invalid mode inputs', () => {
            for (const args of [
                topUpArgs({ mode: 'off' }),
                topUpArgs({ minTopUpHkd: 0 }),
                topUpArgs({ minTopUpHkd: -1 }),
                topUpArgs({ minTopUpHkd: Number.NaN }),
                topUpArgs({ minTopUpHkd: Number.POSITIVE_INFINITY }),
                topUpArgs({ mode: 'not-a-mode' as never }),
            ]) {
                const result = deriveTopUpSchedule(args);
                expect(result).toHaveLength(31);
                expect(result).toEqual(Array.from({ length: 31 }, () => ({
                    units: 0, cumulativeTopUp: 0, annualInterest: 0,
                    cumulativeInterest: 0, servicing: 0, toClient: 0,
                })));
            }
        });

        it('keeps years 0..4 zero and implements annual and every-five draws', () => {
            const annual = deriveTopUpSchedule(topUpArgs({
                surrenderByYear: Array.from({ length: 31 }, (_, year) => year * 100),
            }));
            expect(annual.slice(0, 5).every(row => Object.values(row).every(value => value === 0))).toBe(true);
            expect(annual[5].units).toBe(3);
            expect(annual[6].units).toBe(4);

            const every5 = deriveTopUpSchedule(topUpArgs({ mode: 'every5' }));
            expect(every5[5].units).toBe(3);
            expect(every5[6].units).toBe(3);
            expect(every5[9].units).toBe(3);
            expect(every5[10].units).toBe(8);
        });

        it('uses the rounded capacity divisor, clamps falling surrender values, and preserves INT boundaries', () => {
            const result = deriveTopUpSchedule(topUpArgs({
                minTopUpHkd: 1,
                surrenderByYear: Object.assign(Array(31).fill(0), { 5: 1.9999999999999998, 6: -1 }),
            }));
            expect(result[5].units).toBe(0);
            expect(result[6].units).toBe(0);
            expect(result.every(row => Object.values(row).every(Number.isFinite))).toBe(true);
        });

        it('uses the unrounded divisor for service-only and clamps negative need', () => {
            const result = deriveTopUpSchedule(topUpArgs({
                mode: 'serviceOnly',
                minTopUpHkd: 90,
                cumMortgagePayments: Object.assign(Array(31).fill(0), { 5: -100 }),
                cumPolicyLoanInterest: Object.assign(Array(31).fill(0), { 5: -100, 6: 100 }),
            }));
            expect(result[5].units).toBe(0);
            expect(result[6].units).toBe(Math.ceil(100 * 1.1 / (90 / 0.9)));
        });

        it('accrues interest on the running balance without reversing prior interest when units shrink', () => {
            const result = deriveTopUpSchedule(topUpArgs({
                surrenderByYear: Object.assign(Array(31).fill(0), { 1: 0, 5: 5, 6: 1 }),
                minTopUpHkd: 1,
                rate: 0.1,
            }));
            expect(result[5]).toMatchObject({ units: 2, cumulativeTopUp: 2, annualInterest: 0.2, cumulativeInterest: 0.2 });
            expect(result[6]).toMatchObject({ units: 0, cumulativeTopUp: 0, annualInterest: 0, cumulativeInterest: 0.2 });
        });

        it('treats missing and non-finite surrender values as zero', () => {
            const result = deriveTopUpSchedule(topUpArgs({
                surrenderByYear: [0, 0, Number.NaN, Number.POSITIVE_INFINITY],
            }));
            expect(result).toHaveLength(31);
            expect(result.every(row => Object.values(row).every(Number.isFinite))).toBe(true);
            expect(result[5].units).toBe(0);
        });

        it('sanitizes a negative or non-finite rate to zero', () => {
            for (const rate of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
                const result = deriveTopUpSchedule(topUpArgs({ rate }));
                expect(result[5].annualInterest).toBe(0);
                expect(result[30].cumulativeInterest).toBe(0);
            }
        });
    });

    describe('13. Phase 3 projection wiring', () => {
        it('cancels each draw with the matching asset and liability, leaving only top-up interest in return', () => {
            const baseline = calculateProjection(inputFromDefaults());
            const topUp = calculateProjection(inputFromDefaults({ topUpMode: 'annual', minTopUpAmount: 1000 }));
            const row = topUp.projectionData[5];
            expect(row.cumulativeTopUp).toBeGreaterThan(0);
            expect(row.loan - baseline.projectionData[5].loan).toBe(row.cumulativeTopUp);
            expect(row.netEquity - baseline.projectionData[5].netEquity).toBeCloseTo(-row.cumulativeTopUpInterest, 8);
            expect(row.cumulativeNetGain - baseline.projectionData[5].cumulativeNetGain)
                .toBeCloseTo(-row.cumulativeTopUpInterest, 8);
        });

        it('does not feed display-only servicing or to-client amounts into cumulative gain', () => {
            const result = calculateProjection(inputFromDefaults({
                topUpMode: 'serviceOnly', minTopUpAmount: 1000, cashReserve: 0,
            }));
            const row = result.projectionData[10];
            expect(row.topUpServicing).toBeGreaterThanOrEqual(0);
            expect(row.topUpToClient).toBe(row.cumulativeTopUp - row.topUpServicing);
            expect(row.cumulativeNetGain).toBeCloseTo(
                result.projectionData[0].cumulativeNetGain
                    + result.projectionData.slice(1, 11).reduce((sum, year) => sum + year.annualNetGain, 0),
                8,
            );
        });

        it('falls back to the default FX rate when fxRate is non-positive or non-finite', () => {
            const expected = calculateProjection(inputFromDefaults({ topUpMode: 'annual', minTopUpAmount: 1000, fxRate: 7.8 }));
            for (const fxRate of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
                const actual = calculateProjection(inputFromDefaults({
                    topUpMode: 'annual', minTopUpAmount: 1000, fxRate,
                }));
                expect(actual.projectionData[10].cumulativeTopUp).toBe(expected.projectionData[10].cumulativeTopUp);
            }
        });
    });

    describe('14. Phase 4 policy rebate and flat adjustments', () => {
        const mortgageBands = [
            { minPremiumUsd: 1, rate: 0 },
            { minPremiumUsd: 300_000, rate: 0.01 },
            { minPremiumUsd: 600_000, rate: 0.02 },
            { minPremiumUsd: 1_000_000, rate: 0.04 },
            { minPremiumUsd: 2_000_000, rate: 0.05 },
        ];

        it('reproduces all five approximate-match workbook bands', () => {
            expect(mortgageBands.map(({ minPremiumUsd }) => lookupRebateRate(minPremiumUsd, mortgageBands)))
                .toEqual([0, 0.01, 0.02, 0.04, 0.05]);
            // The decorative upper bound is not part of the lookup function.
            expect(lookupRebateRate(50, [
                { minPremiumUsd: 1, rate: 0.01 },
                { minPremiumUsd: 100, rate: 0.02 },
            ])).toBe(0.01);
        });

        it('handles empty, undefined, non-finite, below-band, and tied inputs safely', () => {
            expect(lookupRebateRate(100, undefined)).toBe(0);
            expect(lookupRebateRate(100, [])).toBe(0);
            expect(lookupRebateRate(Number.NaN, [{ minPremiumUsd: 1, rate: 0.01 }])).toBe(0);
            expect(lookupRebateRate(0.99, [{ minPremiumUsd: 1, rate: 0.01 }])).toBe(0);
            expect(lookupRebateRate(100, [
                { minPremiumUsd: Number.NaN, rate: 0.7 },
                { minPremiumUsd: Number.POSITIVE_INFINITY, rate: 0.8 },
                { minPremiumUsd: 1, rate: Number.NaN },
                { minPremiumUsd: 50, rate: 0.02 },
            ])).toBe(0.02);
            expect(lookupRebateRate(100, [
                { minPremiumUsd: 100, rate: 0.01 },
                { minPremiumUsd: 100, rate: 0.02 },
            ])).toBe(0.02);
        });

        it('sorts without mutating an unsorted or frozen band list', () => {
            const bands = Object.freeze([
                { minPremiumUsd: 1_000_000, rate: 0.04 },
                { minPremiumUsd: 300_000, rate: 0.01 },
            ]) as unknown as Array<{ minPremiumUsd: number; rate: number }>;
            const before = JSON.stringify(bands);

            expect(lookupRebateRate(400_000, bands)).toBe(0.01);
            expect(JSON.stringify(bands)).toBe(before);
        });

        it.each([
            [299_999.99, 0],
            [300_000, 0.01],
            [300_000.01, 0.01],
        ])('uses inclusive boundaries at premium %s', (premiumUsd, expectedRate) => {
            expect(lookupRebateRate(premiumUsd, mortgageBands)).toBe(expectedRate);
        });

        // The engine reaches the premium as (equity / 0.2799999999999999) / 7.8 while the
        // workbook reaches it as (equity / 7.8) / 0.28. Both are "the same" premium and
        // neither lands exactly on a band edge, so without rounding to cents first the
        // band a client gets depends on which order the divisions happened in. At the
        // USD 1,000,000 edge that is the difference between a 4% and a 2% rebate —
        // 156,000 HKD on a 7.8M premium — decided by the last bit of a double.
        it.each([
            [655_199.999_999_992_1, 300_000, 0.01],
            [1_310_399.999_999_992_3, 600_000, 0.02],
            [2_183_999.999_999_992, 1_000_000, 0.04],
            [4_367_999.999_999_992, 2_000_000, 0.05],
        ])('awards the band at a hair under the USD %s edge', (budget, _edge, expectedRate) => {
            const projection = calculateProjection(inputFromDefaults({
                budget, cashReserve: 0, bondAlloc: 0, extraCash: 0,
                leverageLTV: 90, fxRate: 7.8, policyRebateBands: mortgageBands,
            }));
            expect(projection.policyRebateRate).toBe(expectedRate);
        });

        it('keeps the default path bit-identical and all output numbers finite', () => {
            const baseline = calculateProjection(inputFromDefaults());
            const explicitEmpty = calculateProjection(inputFromDefaults({ policyRebateBands: [] }));
            expect(explicitEmpty).toEqual(baseline);

            const extreme = calculateProjection(inputFromDefaults({
                policyRebateBands: [{ minPremiumUsd: 0, rate: Number.MAX_VALUE }],
                bankCashRebate: Number.MAX_VALUE,
                fundFeeRebate: Number.MAX_VALUE,
                assetLoanHandlingFee: Number.MAX_VALUE,
            }));
            expect(nonFiniteNumbers(extreme)).toEqual([]);
        });

        it('applies the rate to HKD premium and matches the workbook anchor', () => {
            const projection = calculateProjection(inputFromDefaults({
                budget: 680_000,
                cashReserve: 0,
                bondAlloc: 0,
                handlingFee: 0,
                leverageLTV: 90,
                fxRate: 7.8,
                policyRebateBands: mortgageBands,
            }));
            const expectedRebate = 24_285.714285714286;

            expect(projection.totalPremium).toBeCloseTo(2_428_571.428571429, 6);
            expect(projection.policyRebateRate).toBe(0.01);
            expect(Math.abs(projection.policyRebate - expectedRebate) / expectedRebate).toBeLessThanOrEqual(1e-6);
        });

        it('sanitizes flat rebates and asset-loan fee, including zero bond collateral', () => {
            const sanitized = calculateProjection(inputFromDefaults({
                bankCashRebate: -1,
                fundFeeRebate: Number.NaN,
                assetLoanHandlingFee: Number.POSITIVE_INFINITY,
                bondCollateralLTV: 0,
            }));
            expect(sanitized.bankCashRebate).toBe(0);
            expect(sanitized.fundFeeRebate).toBe(0);
            expect(sanitized.assetLoanFee).toBe(0);

            const fee = calculateProjection(inputFromDefaults({
                bondCollateralLTV: 50,
                assetLoanHandlingFee: 2,
            }));
            expect(fee.assetLoanFee).toBeCloseTo(fee.bondLoan * 0.02, 6);
        });

        it('keeps tPremium and rebate at zero when equity cannot fund a policy', () => {
            for (const overrides of [
                { budget: 0, cashReserve: 0, bondAlloc: 0 },
                { budget: 1_000_000, cashReserve: 0, bondAlloc: 1_000_000 },
            ]) {
                const projection = calculateProjection(inputFromDefaults({
                    ...overrides,
                    policyRebateBands: mortgageBands,
                }));
                expect(projection.totalPremium).toBe(0);
                expect(projection.policyRebate).toBe(0);
                expect(projection.policyRebateRate).toBe(0);
                expect(nonFiniteNumbers(projection)).toEqual([]);
            }
        });

        it('uses a strict minimum-premium advisory and defaults invalid thresholds to 28000 USD', () => {
            const atMinimum = calculateProjection(inputFromDefaults({
                budget: 218_400, cashReserve: 0, bondAlloc: 0, leverageLTV: 0,
                fxRate: 7.8, minPremiumUsd: 28_000,
            }));
            const belowMinimum = calculateProjection(inputFromDefaults({
                budget: 218_399.99, cashReserve: 0, bondAlloc: 0, leverageLTV: 0,
                fxRate: 7.8, minPremiumUsd: 28_000,
            }));
            expect(atMinimum.belowMinPremium).toBe(false);
            expect(belowMinimum.belowMinPremium).toBe(true);
            expect(atMinimum.totalPremium).toBeGreaterThan(0);
            expect(belowMinimum.totalPremium).toBeGreaterThan(0);

            for (const minPremiumUsd of [Number.NaN, Number.POSITIVE_INFINITY]) {
                const invalid = calculateProjection(inputFromDefaults({
                    budget: 218_400, cashReserve: 0, bondAlloc: 0, leverageLTV: 0,
                    fxRate: 7.8, minPremiumUsd,
                }));
                expect(invalid.belowMinPremium).toBe(false);
            }
        });

        it('adds one flat adjustment to years 0 and 30 without changing annual gain', () => {
            const baseline = calculateProjection(inputFromDefaults());
            const adjusted = calculateProjection(inputFromDefaults({
                policyRebateBands: [{ minPremiumUsd: 1, rate: 0.01 }],
                bankCashRebate: 1_000,
                fundFeeRebate: 2_000,
            }));
            const flatAdjustment = adjusted.policyRebate + 3_000;

            expect(adjusted.projectionData[0].cumulativeNetGain
                - baseline.projectionData[0].cumulativeNetGain).toBeCloseTo(flatAdjustment, 8);
            expect(adjusted.projectionData[30].cumulativeNetGain
                - baseline.projectionData[30].cumulativeNetGain).toBeCloseTo(flatAdjustment, 8);
            expect(adjusted.projectionData.map(row => row.annualNetGain))
                .toEqual(baseline.projectionData.map(row => row.annualNetGain));
            expect(adjusted.projectionData.map(row => row.netEquity))
                .toEqual(baseline.projectionData.map(row => row.netEquity));
        });
    });

    describe('5. effective mortgage rate clamp', () => {
        it.each([
            [4.15, 1.3, 5.0, 6.0],
            [4.15, 1.3, 5.5, 1.75],
            [0, 0, 0, 0],
        ])('keeps (%s, %s, %s, %s) within 0..100', (hibor, hSpread, prime, modifier) => {
            // P-minus can be negative; the displayed effective mortgage rate must stay
            // inside the same 0..100 range consumed by the projection engine.
            const result = deriveEffectiveMortgageRate(hibor, hSpread, prime, modifier);

            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
        });
    });

    describe('6. simulation and stress edge sweep', () => {
        it('returns no non-finite number for every boundary configuration', () => {
            const fields: Array<keyof SimulationInput> = [
                'budget', 'cashReserve', 'bondAlloc', 'bondYield', 'hibor', 'cofRate', 'spread',
                'leverageLTV', 'capRate', 'handlingFee', 'unlockedCash', 'effectiveMortgageRate',
                'monthlyMortgagePmt', 'mortgageTenor',
            ];
            const values = [0, -1, 1e9, 100, 111.2, 1e300, Number.MAX_VALUE, NaN, Infinity, -Infinity];
            const failures: string[] = [];

            for (const field of fields) for (const value of values) for (const fundSource of ['cash', 'mortgage'] as const)
                for (const interestBasis of ['hibor', 'cof'] as const) {
                    const input = inputFromDefaults({
                        [field]: value,
                        fundSource,
                        interestBasis,
                        unlockedCash: fundSource === 'mortgage' ? 4500000 : 0,
                    });
                    try {
                        const projection = calculateProjection(input);
                        const stress = calculateStressTest(stressInput(projection, {
                            fundSource,
                            interestBasis,
                            unlockedCash: fundSource === 'mortgage' ? 4500000 : 0,
                            simulatedHibor: value === Number.MAX_VALUE ? 9 : 6,
                        }));
                        failures.push(...nonFiniteNumbers(projection, `${field}=${String(value)} ${fundSource}/${interestBasis}.projection`));
                        failures.push(...nonFiniteNumbers(stress, `${field}=${String(value)} ${fundSource}/${interestBasis}.stress`));
                    } catch (error) {
                        failures.push(`${field}=${String(value)} ${fundSource}/${interestBasis} threw ${String(error)}`);
                    }
                }

            expect(failures, failures.slice(0, 20).join('\n')).toEqual([]);
        });
    });

    describe('7. full hook derivation chain', () => {
        it('keeps derivations and both engine outputs finite across the overflow surface', () => {
            // This drives the real propertyValue x mortgageLtv product. Directly sweeping
            // unlockedCash misses the Infinity that the hook used to pass downstream.
            const propertyValues = [0, 1, 15000000, 1e300, Number.MAX_VALUE];
            const ltvValues = [0, 70, 100, 1e10, Number.MAX_VALUE];
            const existingMortgages = [0, 6000000, Number.MAX_VALUE];
            const tenors = [0, 1, 30, 1e6];
            const primeRates = [0, 5.5];
            const failures: string[] = [];

            for (const propertyValue of propertyValues) for (const mortgageLtv of ltvValues)
                for (const existingMortgage of existingMortgages) for (const mortgageTenor of tenors)
                    for (const primeRate of primeRates) {
                        const unlockedCash = deriveUnlockedCash(propertyValue, mortgageLtv, existingMortgage);
                        const effectiveMortgageRate = deriveEffectiveMortgageRate(4.15, 1.3, primeRate, 1.75);
                        const monthlyMortgagePmt = calculatePMT(effectiveMortgageRate, mortgageTenor, unlockedCash);
                        const label = `property=${propertyValue} ltv=${mortgageLtv} existing=${existingMortgage} tenor=${mortgageTenor} prime=${primeRate}`;
                        if (![unlockedCash, effectiveMortgageRate, monthlyMortgagePmt].every(Number.isFinite)) {
                            failures.push(`${label}: derivation ${unlockedCash}/${effectiveMortgageRate}/${monthlyMortgagePmt}`);
                            continue;
                        }

                        try {
                            const projection = calculateProjection(inputFromDefaults({
                                fundSource: 'mortgage', unlockedCash, effectiveMortgageRate,
                                monthlyMortgagePmt, mortgageTenor,
                            }));
                            const stress = calculateStressTest(stressInput(projection, {
                                fundSource: 'mortgage', unlockedCash,
                            }));
                            failures.push(...nonFiniteNumbers(projection, `${label}.projection`));
                            failures.push(...nonFiniteNumbers(stress, `${label}.stress`));
                        } catch (error) {
                            failures.push(`${label} threw ${String(error)}`);
                        }
                    }

            expect(failures, failures.slice(0, 20).join('\n')).toEqual([]);
        });
    });

    describe('8. default projection golden snapshot', () => {
        it('matches the full default projection array', () => {
            // Bind this snapshot to DEFAULT_INPUTS and the real hook derivations so a
            // default-value or arithmetic change requires an explicit client-facing review.
            const projection = calculateProjection(inputFromDefaults());

            // irr is iteratively solved, so its trailing decimals differ across FP
            // environments (Node 22 vs 26 diverged at ~1e-13 in CI); round to 10 dp
            // so the snapshot is environment-stable while still catching real changes.
            const snapshotRows = projection.projectionData.map(row => ({
                ...row,
                irr: row.irr === null ? null : Number(row.irr.toFixed(10)),
            }));

            expect(snapshotRows).toMatchInlineSnapshot(`
              [
                {
                  "annualBondIncome": 0,
                  "annualLoanInterest": 0,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 0,
                  "annualPolicyGrowth": 0,
                  "annualRoC": 0,
                  "averageReturn": 0,
                  "bondFundNetValue": 2970000,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 0,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 0,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": -601428.5714285709,
                  "cumulativePolicyGrowth": 0,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,398,571",
                  "irr": null,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3398571.428571429,
                  "roi": -15.035714285714272,
                  "surrenderValue": 2285714.285714287,
                  "totalAssets": 5455714.285714287,
                  "year": 0,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428577,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 51235.71428571423,
                  "annualPolicyGrowth": 0,
                  "annualRoC": 1.2808928571428557,
                  "averageReturn": -13.75482142857142,
                  "bondFundNetValue": 3133350,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 163350,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 112114.28571428577,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": -550192.8571428568,
                  "cumulativePolicyGrowth": 0,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,449,807",
                  "irr": -13.7548214286,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3449807.142857143,
                  "roi": -13.75482142857142,
                  "surrenderValue": 2285714.285714287,
                  "totalAssets": 5619064.285714287,
                  "year": 1,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428577,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 111521.42857142832,
                  "annualPolicyGrowth": 60285.714285714086,
                  "annualRoC": 2.7880357142857077,
                  "averageReturn": -5.483392857142858,
                  "bondFundNetValue": 3296700,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 326700,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 224228.57142857154,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": -438671.42857142864,
                  "cumulativePolicyGrowth": 60285.714285714086,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,561,329",
                  "irr": -5.6425867853,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3561328.5714285714,
                  "roi": -10.966785714285717,
                  "surrenderValue": 2346000.000000001,
                  "totalAssets": 5842700.000000001,
                  "year": 2,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428574,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 117235.71428571426,
                  "annualPolicyGrowth": 66000,
                  "annualRoC": 2.9308928571428567,
                  "averageReturn": -2.6786309523809546,
                  "bondFundNetValue": 3460050,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 490050,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 336342.8571428573,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": -321435.71428571455,
                  "cumulativePolicyGrowth": 126285.71428571409,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,678,564",
                  "irr": -2.7537672088,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3678564.2857142854,
                  "roi": -8.035892857142864,
                  "surrenderValue": 2412000.000000001,
                  "totalAssets": 6072050.000000001,
                  "year": 3,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.2857142858,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 134664.28571428556,
                  "annualPolicyGrowth": 83428.57142857136,
                  "annualRoC": 3.366607142857139,
                  "averageReturn": -1.167321428571429,
                  "bondFundNetValue": 3623400,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 653400,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 448457.1428571431,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": -186771.42857142864,
                  "cumulativePolicyGrowth": 209714.28571428545,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,813,229",
                  "irr": -1.1883362631,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3813228.5714285714,
                  "roi": -4.669285714285716,
                  "surrenderValue": 2495428.5714285723,
                  "totalAssets": 6318828.571428573,
                  "year": 4,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.2857142858,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 431807.14285714284,
                  "annualPolicyGrowth": 380571.42857142864,
                  "annualRoC": 10.79517857142857,
                  "averageReturn": 1.2251785714285681,
                  "bondFundNetValue": 3786750,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 816750,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 560571.4285714289,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 245035.71428571362,
                  "cumulativePolicyGrowth": 590285.7142857141,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$4,245,036",
                  "irr": 1.1962155458,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 4245035.714285714,
                  "roi": 6.125892857142841,
                  "surrenderValue": 2876000.000000001,
                  "totalAssets": 6862750.000000001,
                  "year": 5,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428568,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 271807.1428571434,
                  "annualPolicyGrowth": 220571.4285714291,
                  "annualRoC": 6.795178571428585,
                  "averageReturn": 2.1535119047619053,
                  "bondFundNetValue": 3950100,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 980100,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 672685.7142857146,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 516842.8571428573,
                  "cumulativePolicyGrowth": 810857.1428571432,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$4,516,843",
                  "irr": 2.0459637664,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 4516842.857142857,
                  "roi": 12.921071428571432,
                  "surrenderValue": 3096571.42857143,
                  "totalAssets": 7246671.42857143,
                  "year": 6,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.2857142858,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 343807.1428571424,
                  "annualPolicyGrowth": 292571.4285714282,
                  "annualRoC": 8.595178571428558,
                  "averageReturn": 3.07375,
                  "bondFundNetValue": 4113450,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1143450,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 784800.0000000003,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 860650,
                  "cumulativePolicyGrowth": 1103428.5714285714,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$4,860,650",
                  "irr": 2.8230832983,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 4860650,
                  "roi": 21.51625,
                  "surrenderValue": 3389142.857142858,
                  "totalAssets": 7702592.857142858,
                  "year": 7,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.2857142858,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 206950.00000000012,
                  "annualPolicyGrowth": 155714.2857142859,
                  "annualRoC": 5.173750000000003,
                  "averageReturn": 3.336249999999997,
                  "bondFundNetValue": 4276800,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1306800,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 896914.2857142861,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 1067599.999999999,
                  "cumulativePolicyGrowth": 1259142.8571428573,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$5,067,600",
                  "irr": 3.0013203873,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 5067599.999999999,
                  "roi": 26.689999999999976,
                  "surrenderValue": 3544857.142857144,
                  "totalAssets": 8021657.142857144,
                  "year": 8,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.2857142858,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 218378.571428571,
                  "annualPolicyGrowth": 167142.8571428568,
                  "annualRoC": 5.459464285714275,
                  "averageReturn": 3.572162698412697,
                  "bondFundNetValue": 4440150,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1470150,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1009028.571428572,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 1285978.571428571,
                  "cumulativePolicyGrowth": 1426285.714285714,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$5,285,979",
                  "irr": 3.1458387775,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 5285978.571428571,
                  "roi": 32.149464285714274,
                  "surrenderValue": 3712000.000000001,
                  "totalAssets": 8352150.000000001,
                  "year": 9,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.2857142858,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 304664.28571428603,
                  "annualPolicyGrowth": 253428.57142857183,
                  "annualRoC": 7.616607142857151,
                  "averageReturn": 3.976607142857141,
                  "bondFundNetValue": 4603500,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1633500,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1121142.8571428577,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 1590642.8571428563,
                  "cumulativePolicyGrowth": 1679714.285714286,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$5,590,643",
                  "irr": 3.4046754386,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 5590642.857142856,
                  "roi": 39.76607142857141,
                  "surrenderValue": 3965428.5714285728,
                  "totalAssets": 8768928.571428573,
                  "year": 10,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428568,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 207807.14285714342,
                  "annualPolicyGrowth": 156571.4285714291,
                  "annualRoC": 5.195178571428586,
                  "averageReturn": 4.087386363636363,
                  "bondFundNetValue": 4766850,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1796850,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1233257.1428571434,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 1798450,
                  "cumulativePolicyGrowth": 1836285.714285715,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$5,798,450",
                  "irr": 3.4330344543,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 5798450,
                  "roi": 44.96125,
                  "surrenderValue": 4122000.000000002,
                  "totalAssets": 9088850.000000002,
                  "year": 11,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428568,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 230949.99999999977,
                  "annualPolicyGrowth": 179714.28571428545,
                  "annualRoC": 5.773749999999994,
                  "averageReturn": 4.227916666666666,
                  "bondFundNetValue": 4930200,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1960200,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1345371.428571429,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 2029400,
                  "cumulativePolicyGrowth": 2016000.0000000005,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$6,029,400",
                  "irr": 3.4787503678,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 6029400,
                  "roi": 50.735,
                  "surrenderValue": 4301714.285714287,
                  "totalAssets": 9431914.285714287,
                  "year": 12,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 288378.57142857136,
                  "annualPolicyGrowth": 237142.85714285728,
                  "annualRoC": 7.209464285714285,
                  "averageReturn": 4.457266483516486,
                  "bondFundNetValue": 5093550,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2123550,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1457485.714285715,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 2317778.5714285728,
                  "cumulativePolicyGrowth": 2253142.8571428577,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$6,317,779",
                  "irr": 3.5784886855,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 6317778.571428573,
                  "roi": 57.94446428571432,
                  "surrenderValue": 4538857.142857145,
                  "totalAssets": 9832407.142857146,
                  "year": 13,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428568,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 243235.71428571432,
                  "annualPolicyGrowth": 192000,
                  "annualRoC": 6.080892857142858,
                  "averageReturn": 4.573239795918369,
                  "bondFundNetValue": 5256900,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2286900,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1569600.0000000007,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 2561014.2857142864,
                  "cumulativePolicyGrowth": 2445142.8571428577,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$6,561,014",
                  "irr": 3.5978601855,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 6561014.285714286,
                  "roi": 64.02535714285716,
                  "surrenderValue": 4730857.142857145,
                  "totalAssets": 10187757.142857146,
                  "year": 14,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 312378.57142857136,
                  "annualPolicyGrowth": 261142.85714285728,
                  "annualRoC": 7.8094642857142835,
                  "averageReturn": 4.788988095238095,
                  "bondFundNetValue": 5420250,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2450250,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1681714.2857142866,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 2873392.8571428573,
                  "cumulativePolicyGrowth": 2706285.714285715,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$6,873,393",
                  "irr": 3.6750082021,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 6873392.857142857,
                  "roi": 71.83482142857143,
                  "surrenderValue": 4992000.000000002,
                  "totalAssets": 10612250.000000002,
                  "year": 15,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428568,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 306949.99999999977,
                  "annualPolicyGrowth": 255714.28571428545,
                  "annualRoC": 7.673749999999995,
                  "averageReturn": 4.9692857142857125,
                  "bondFundNetValue": 5583600,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2613600,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1793828.5714285723,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 3180342.8571428563,
                  "cumulativePolicyGrowth": 2962000.0000000005,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$7,180,343",
                  "irr": 3.7242550549,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 7180342.857142856,
                  "roi": 79.5085714285714,
                  "surrenderValue": 5247714.285714287,
                  "totalAssets": 11031314.285714287,
                  "year": 16,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428568,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 295807.1428571434,
                  "annualPolicyGrowth": 244571.4285714291,
                  "annualRoC": 7.395178571428586,
                  "averageReturn": 5.111985294117647,
                  "bondFundNetValue": 5746950,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2776950,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 1905942.857142858,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 3476150,
                  "cumulativePolicyGrowth": 3206571.4285714296,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$7,476,150",
                  "irr": 3.7474737145,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 7476150,
                  "roi": 86.90375,
                  "surrenderValue": 5492285.714285716,
                  "totalAssets": 11439235.714285716,
                  "year": 17,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 348092.8571428559,
                  "annualPolicyGrowth": 296857.1428571418,
                  "annualRoC": 8.702321428571397,
                  "averageReturn": 5.311448412698411,
                  "bondFundNetValue": 5910300,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2940300,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2018057.142857144,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 3824242.8571428563,
                  "cumulativePolicyGrowth": 3503428.5714285714,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$7,824,243",
                  "irr": 3.7977422925,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 7824242.857142856,
                  "roi": 95.6060714285714,
                  "surrenderValue": 5789142.857142858,
                  "totalAssets": 11899442.857142858,
                  "year": 18,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428568,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 336950.0000000007,
                  "annualPolicyGrowth": 285714.2857142864,
                  "annualRoC": 8.423750000000018,
                  "averageReturn": 5.4752537593984965,
                  "bondFundNetValue": 6073650,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3103650,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2130171.4285714296,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 4161192.857142858,
                  "cumulativePolicyGrowth": 3789142.8571428577,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$8,161,193",
                  "irr": 3.8244563606,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 8161192.857142858,
                  "roi": 104.02982142857144,
                  "surrenderValue": 6074857.142857145,
                  "totalAssets": 12348507.142857146,
                  "year": 19,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 396092.85714285774,
                  "annualPolicyGrowth": 344857.14285714366,
                  "annualRoC": 9.902321428571444,
                  "averageReturn": 5.696607142857141,
                  "bondFundNetValue": 6237000,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3267000,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2242285.7142857155,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 4557285.714285713,
                  "cumulativePolicyGrowth": 4134000.0000000014,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$8,557,286",
                  "irr": 3.875661403,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 8557285.714285713,
                  "roi": 113.93214285714282,
                  "surrenderValue": 6419714.285714288,
                  "totalAssets": 12856714.285714287,
                  "year": 20,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428545,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 334092.8571428573,
                  "annualPolicyGrowth": 282857.1428571427,
                  "annualRoC": 8.352321428571432,
                  "averageReturn": 5.823069727891156,
                  "bondFundNetValue": 6400350,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3430350,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2354400.000000001,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 4891378.571428571,
                  "cumulativePolicyGrowth": 4416857.142857144,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$8,891,379",
                  "irr": 3.8770198213,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 8891378.57142857,
                  "roi": 122.28446428571426,
                  "surrenderValue": 6702571.428571431,
                  "totalAssets": 13302921.428571431,
                  "year": 21,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 357235.7142857141,
                  "annualPolicyGrowth": 306000,
                  "annualRoC": 8.930892857142853,
                  "averageReturn": 5.964334415584415,
                  "bondFundNetValue": 6563700,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3593700,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2466514.285714287,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 5248614.285714285,
                  "cumulativePolicyGrowth": 4722857.142857144,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$9,248,614",
                  "irr": 3.8834137157,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 9248614.285714285,
                  "roi": 131.21535714285713,
                  "surrenderValue": 7008571.428571431,
                  "totalAssets": 13772271.428571431,
                  "year": 22,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 403807.1428571432,
                  "annualPolicyGrowth": 352571.4285714291,
                  "annualRoC": 10.09517857142858,
                  "averageReturn": 6.143936335403727,
                  "bondFundNetValue": 6727050,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3757050,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2578628.5714285728,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 5652421.428571429,
                  "cumulativePolicyGrowth": 5075428.571428573,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$9,652,421",
                  "irr": 3.9043551696,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 9652421.42857143,
                  "roi": 141.31053571428572,
                  "surrenderValue": 7361142.85714286,
                  "totalAssets": 14288192.85714286,
                  "year": 23,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428545,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 427235.7142857155,
                  "annualPolicyGrowth": 376000.00000000093,
                  "annualRoC": 10.680892857142886,
                  "averageReturn": 6.332976190476194,
                  "bondFundNetValue": 6890400,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3920400,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2690742.857142858,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 6079657.1428571455,
                  "cumulativePolicyGrowth": 5451428.571428575,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$10,079,657",
                  "irr": 3.9260466501,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 10079657.142857146,
                  "roi": 151.99142857142866,
                  "surrenderValue": 7737142.857142861,
                  "totalAssets": 14827542.857142862,
                  "year": 24,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 422378.57142857043,
                  "annualPolicyGrowth": 371142.85714285634,
                  "annualRoC": 10.559464285714261,
                  "averageReturn": 6.502035714285714,
                  "bondFundNetValue": 7053750,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4083750,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2802857.142857144,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 6502035.714285715,
                  "cumulativePolicyGrowth": 5822571.428571431,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$10,502,036",
                  "irr": 3.9366081397,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 10502035.714285715,
                  "roi": 162.55089285714286,
                  "surrenderValue": 8108285.714285717,
                  "totalAssets": 15362035.714285716,
                  "year": 25,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 444378.57142857136,
                  "annualPolicyGrowth": 393142.8571428573,
                  "annualRoC": 11.109464285714283,
                  "averageReturn": 6.679244505494507,
                  "bondFundNetValue": 7217100,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4247100,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 2914971.42857143,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 6946414.285714287,
                  "cumulativePolicyGrowth": 6215714.285714287,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$10,946,414",
                  "irr": 3.9479291879,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 10946414.285714287,
                  "roi": 173.66035714285718,
                  "surrenderValue": 8501428.571428575,
                  "totalAssets": 15918528.571428575,
                  "year": 26,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 479807.1428571432,
                  "annualPolicyGrowth": 428571.4285714291,
                  "annualRoC": 11.99517857142858,
                  "averageReturn": 6.876130952380953,
                  "bondFundNetValue": 7380450,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4410450,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 3027085.714285716,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 7426221.428571429,
                  "cumulativePolicyGrowth": 6644285.714285716,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$11,426,221",
                  "irr": 3.9640192335,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 11426221.42857143,
                  "roi": 185.65553571428572,
                  "surrenderValue": 8930000.000000004,
                  "totalAssets": 16510450.000000004,
                  "year": 27,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428545,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 492378.5714285709,
                  "annualPolicyGrowth": 441142.85714285634,
                  "annualRoC": 12.309464285714272,
                  "averageReturn": 7.07017857142857,
                  "bondFundNetValue": 7543800,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4573800,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 3139200.0000000014,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 7918599.999999998,
                  "cumulativePolicyGrowth": 7085428.571428573,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$11,918,600",
                  "irr": 3.9763273756,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 11918599.999999998,
                  "roi": 197.96499999999995,
                  "surrenderValue": 9371142.85714286,
                  "totalAssets": 17114942.85714286,
                  "year": 28,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 533807.1428571432,
                  "annualPolicyGrowth": 482571.4285714291,
                  "annualRoC": 13.345178571428578,
                  "averageReturn": 7.286557881773402,
                  "bondFundNetValue": 7707150,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4737150,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 3251314.2857142873,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 8452407.142857146,
                  "cumulativePolicyGrowth": 7568000.000000002,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$12,452,407",
                  "irr": 3.9936128262,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 12452407.142857146,
                  "roi": 211.31017857142865,
                  "surrenderValue": 9853714.28571429,
                  "totalAssets": 17760864.28571429,
                  "year": 29,
                },
                {
                  "annualBondIncome": 163350,
                  "annualLoanInterest": 112114.28571428591,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 546664.285714285,
                  "annualPolicyGrowth": 495428.5714285709,
                  "annualRoC": 13.666607142857124,
                  "averageReturn": 7.4992261904761905,
                  "bondFundNetValue": 7870500,
                  "bondLoan": 0,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4900500,
                  "cumulativeBondLoanInterest": 0,
                  "cumulativeInterest": 3363428.571428573,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 8999071.428571427,
                  "cumulativePolicyGrowth": 8063428.571428573,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$12,999,071",
                  "irr": 4.0068024139,
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 12999071.428571427,
                  "roi": 224.9767857142857,
                  "surrenderValue": 10349142.85714286,
                  "totalAssets": 18419642.85714286,
                  "year": 30,
                },
              ]
            `);
        });
    });

    // The six cases below come from an adversarial review of the engine. Each was a
    // reproducible client-visible defect that the eight groups above did not catch,
    // because those groups assert finiteness where these assert the actual number.
    describe('9. adversarial money-path regressions', () => {
        // cumulativeNetGain used to be measured off Year-0 net equity, which is the budget
        // already marked down by the bond entry fee and the day-1 surrender-value haircut.
        // That credited the recovery of a cost the client really paid as profit, and left
        // ReturnStudio's walk unable to reconcile (it opens at `budget`). Gain is now
        // net of the principal put in, so opening + gain must equal closing exactly.
        describe.each([
            ['cash-funded', {}],
            ['with a bond-collateral loan', { bondCollateralLTV: 50, bondLoanSpread: 1.5 }],
            ['mortgage-funded', { fundSource: 'mortgage' as const }],
        ])('gain is net of principal (%s)', (_name, overrides) => {
            const projection = calculateProjection(inputFromDefaults(overrides));
            const budget = DEFAULT_INPUTS.budget;

            it('reconciles the capital-basis identity at every year (refactor guard)', () => {
                for (const row of projection.projectionData) {
                    expect(projection.ownCapital + row.cumulativeNetGain
                        + row.cumulativeMortgageCost).toBeCloseTo(row.netEquity, 6);
                }
            });

            it('opens Year 0 below zero by the entry costs the client actually paid', () => {
                // The fee and the haircut are sunk on day one. A zero here would mean the
                // baseline had absorbed them — the exact bug this group guards.
                expect(projection.projectionData[0].cumulativeNetGain).toBeLessThan(0);
            });
        });

        it('charges the bond-collateral loan in the sensitivity heatmap', () => {
            // The heatmap omitted the bond loan and its interest, so the borrowed principal
            // sat in the bond value with no matching liability and read as profit.
            // Gearing also buys a larger policy, so a geared structure can legitimately
            // out-earn an ungeared one — the invariant is not "levered is worse". It is
            // that the SAME structure priced with its bond loan must come out behind the
            // same structure priced as if that loan were free.
            const geared = calculateProjection(inputFromDefaults({
                bondCollateralLTV: 50, bondLoanSpread: 1.5,
            }));
            const stress = (bondLoan: number) => calculateStressTest(stressInput(geared, {
                bondPriceDrop: 0, sensitivityYear: 20, bondLoan, bondLoanSpread: 1.5,
            })).sensitivityData.data[0][0];

            const charged = stress(geared.bondLoan);
            const ignored = stress(0);

            expect(geared.bondLoan).toBeGreaterThan(0);
            // Principal must be carried as a liability, and interest on top of it.
            expect(charged).toBeLessThan(ignored - geared.bondLoan);
        });

        it('prices the sensitivity heatmap off the COF basis, not raw HIBOR', () => {
            // A COF facility does not reprice with HIBOR directly. Sweeping the heatmap's
            // HIBOR axis as if it did understated loan interest by the COF-to-HIBOR gap.
            const projection = calculateProjection(inputFromDefaults({
                interestBasis: 'cof', cofRate: 8.0, hibor: 4.0, spread: 1.0, capRate: 15.0,
            }));
            const cof = calculateStressTest(stressInput(projection, {
                interestBasis: 'cof', cofRate: 8.0, hibor: 4.0, spread: 1.0, capRate: 15.0,
                bondPriceDrop: 0, sensitivityYear: 20,
            }));
            const hiborBasis = calculateStressTest(stressInput(projection, {
                interestBasis: 'hibor', cofRate: 8.0, hibor: 4.0, spread: 1.0, capRate: 15.0,
                bondPriceDrop: 0, sensitivityYear: 20,
            }));

            // Same inputs, higher funding cost on COF => strictly lower heatmap profit.
            expect(cof.sensitivityData.data[0][0]).toBeLessThan(hiborBasis.sensitivityData.data[0][0]);
        });

        it('keeps unpaid mortgage principal after the tenor ends', () => {
            // A 5-year tenor cannot amortise $1,000,000 at $12,000/yr. The remaining
            // balance must persist rather than vanishing into a net-equity jump at year 6.
            const projection = calculateProjection(inputFromDefaults({
                fundSource: 'mortgage', unlockedCash: 1_000_000, mortgageTenor: 5,
                monthlyMortgagePmt: 1000, effectiveMortgageRate: 0,
            }));
            const year5 = projection.projectionData[5];
            const year6 = projection.projectionData[6];

            expect(year5.mortgageBalance).toBeCloseTo(940000, 2);
            expect(year6.mortgageBalance).toBeCloseTo(940000, 2);
            expect(year6.netEquity - year5.netEquity).toBeLessThan(500000);
        });

        it('offsets break-even HIBOR by the COF gap', () => {
            // rate = cofRate + (H - hibor) + spread, so break-even H sits below the
            // HIBOR-basis answer by exactly (cofRate - hibor).
            const projection = calculateProjection(inputFromDefaults({
                interestBasis: 'cof', cofRate: 8.0, hibor: 4.0, spread: 1.0, capRate: 50.0,
            }));
            const cof = calculateStressTest(stressInput(projection, {
                interestBasis: 'cof', cofRate: 8.0, hibor: 4.0, spread: 1.0, capRate: 50.0,
                bondPriceDrop: 0,
            }));
            const hiborBasis = calculateStressTest(stressInput(projection, {
                interestBasis: 'hibor', cofRate: 8.0, hibor: 4.0, spread: 1.0, capRate: 50.0,
                bondPriceDrop: 0,
            }));

            expect(hiborBasis.stressStats.breakEvenHibor - cof.stressStats.breakEvenHibor)
                .toBeCloseTo(8.0 - 4.0, 6);
        });

        it('reports no break-even when the rate cap binds first', () => {
            // With interest capped below the break-even rate the position cannot be pushed
            // into loss by any HIBOR level, so a numeric threshold would be fiction.
            const projection = calculateProjection(inputFromDefaults({
                interestBasis: 'hibor', hibor: 4.0, spread: 1.0, capRate: 0.5,
            }));
            const stressed = calculateStressTest(stressInput(projection, {
                interestBasis: 'hibor', hibor: 4.0, spread: 1.0, capRate: 0.5, bondPriceDrop: 0,
            }));

            expect(stressed.stressStats.breakEvenHibor).toBe(100);
        });

        it('charges the bond-collateral facility in break-even HIBOR', () => {
            // The stressed projection and heatmap charge interest on BOTH facilities, so
            // the break-even stat must too. At the reported break-even HIBOR, combined
            // interest must exactly consume the income the stat is built on (bond income
            // plus average years-1-5 policy growth); the pre-fix formula ignored the bond
            // loan and reported a break-even where outgo exceeded income by its interest.
            const overrides = {
                interestBasis: 'hibor' as const, hibor: 3.0, spread: 1.5, capRate: 50.0,
                bondYield: 5.0, handlingFee: 1.0,
                bondCollateralLTV: 50, bondLoanSpread: 1.5,
            };
            const projection = calculateProjection(inputFromDefaults(overrides));
            expect(projection.bondLoan).toBeGreaterThan(0);
            const stressed = calculateStressTest(stressInput(projection, {
                ...overrides, simulatedHibor: 3.0, bondPriceDrop: 0,
                bondLoan: projection.bondLoan,
            }));
            const breakEven = stressed.stressStats.breakEvenHibor;

            let growth = 0;
            for (let i = 1; i <= 5; i++) {
                growth += projection.totalPremium * (BASE_FACTORS[i] - BASE_FACTORS[i - 1]);
            }
            const income = projection.netBondPrincipal * 0.05 + growth / 5;
            const rate = Math.min(breakEven + 1.5, 50.0);
            const outgo = (projection.bankLoan + projection.bondLoan) * (rate / 100);
            expect(outgo / income).toBeCloseTo(1, 9);
        });

        it('keeps a zero-shock stress run equal to the baseline while top-ups are drawn', () => {
            // The top-up principal cancels between assets and liabilities, but its
            // cumulative interest does not; a stress run that drops it reads higher than
            // the baseline by exactly that interest, breaking the zero-shock invariant.
            const projection = calculateProjection(inputFromDefaults({
                topUpMode: 'annual', minTopUpAmount: 50_000, fxRate: 7.8,
            }));
            expect(projection.projectionData[30].cumulativeTopUpInterest ?? 0).toBeGreaterThan(0);
            const stressed = calculateStressTest(stressInput(projection, {
                simulatedHibor: DEFAULT_INPUTS.hibor, bondPriceDrop: 0,
            }));
            for (const yr of [1, 15, 30]) {
                expect(stressed.stressedProjection[yr].netEquity)
                    .toBeCloseTo(projection.projectionData[yr].netEquity, 4);
            }
        });

        it('clamps the stressed cash reserve against budget plus extraCash, like the projection', () => {
            // The projection funds the reserve from budget + extraCash; a stress side that
            // still clamps to budget alone clips a reserve above the borrowed portion and a
            // zero-shock stress run diverges from the baseline by exactly the clipped amount.
            const overrides = {
                budget: 2_000_000, cashReserve: 3_000_000, bondAlloc: 500_000,
                extraCash: 4_000_000, fundSource: 'mortgage' as const,
                unlockedCash: 2_000_000, effectiveMortgageRate: 3.5,
                monthlyMortgagePmt: 10_000, mortgageTenor: 20,
                interestBasis: 'hibor' as const, hibor: 3.0, spread: 1.5, capRate: 9.0,
                bondYield: 5.0, handlingFee: 1.0,
            };
            const projection = calculateProjection(inputFromDefaults(overrides));
            const stressed = calculateStressTest(stressInput(projection, {
                ...overrides, simulatedHibor: 3.0, bondPriceDrop: 0,
                bondLoan: projection.bondLoan,
            }));
            for (const yr of [1, 15, 30]) {
                expect(stressed.stressedProjection[yr].netEquity)
                    .toBeCloseTo(projection.projectionData[yr].netEquity, 4);
            }
        });

        it('does not count bond allocation the budget cannot fund', () => {
            // equity goes negative here, so no policy is funded and no loan is drawn. The
            // over-allocation must not still appear as a Year-0 asset.
            const projection = calculateProjection(inputFromDefaults({
                budget: 1_000_000, cashReserve: 0, bondAlloc: 2_000_000, handlingFee: 0,
            }));

            expect(projection.bankLoan).toBe(0);
            expect(projection.projectionData[0].netEquity).toBeLessThanOrEqual(1_000_000);
        });

        it('reports impaired LTV when collateral is wiped out under a live loan', () => {
            // A 100% bond drop with no policy value leaves a loan against nothing. That is
            // the margin-call case the LTV chart exists to surface, not 0%.
            const projection = calculateProjection(inputFromDefaults());
            const stressed = calculateStressTest(stressInput(projection, {
                totalPremium: 0, netBondPrincipal: 1_000_000, bankLoan: 1_000_000,
                bondPriceDrop: 100, showGuaranteed: false,
            }));

            expect(stressed.stressedProjection[10].ltv).toBe(LTV_IMPAIRED);
        });
    });

    // The bond-fund collateral loan is a SECOND leverage layer: pledge the bond fund,
    // borrow against it, and use the proceeds as extra down payment on the policy. The
    // failure mode it must never have is the one the rest of this file guards against
    // elsewhere — borrowed money counted as an asset without the matching liability,
    // which makes borrowing look like it created net worth.
    describe('10. bond-fund collateral loan', () => {
        it('is off by default, leaving every existing number untouched', () => {
            const withoutField = calculateProjection(inputFromDefaults());
            const explicitZero = calculateProjection(inputFromDefaults({ bondCollateralLTV: 0 }));

            expect(withoutField.bondLoan).toBe(0);
            expect(withoutField.projectionData).toEqual(explicitZero.projectionData);
        });

        it('draws against the fund net of the handling fee, not the gross allocation', () => {
            const projection = calculateProjection(inputFromDefaults({ bondCollateralLTV: 50 }));

            // 3,000,000 gross - 1% fee = 2,970,000 pledgeable, half of which is drawn.
            expect(projection.netBondPrincipal).toBeCloseTo(2_970_000, 6);
            expect(projection.bondLoan).toBeCloseTo(1_485_000, 6);
        });

        it('adds the drawn amount to equity and carries it as a liability, so the balance sheet still reconciles', () => {
            const projection = calculateProjection(inputFromDefaults({ bondCollateralLTV: 50 }));
            const baseline = calculateProjection(inputFromDefaults());
            const yr0 = projection.projectionData[0];

            expect(projection.pfEquity).toBeCloseTo(baseline.pfEquity + projection.bondLoan, 6);

            const assets = yr0.surrenderValue + yr0.bondFundNetValue + yr0.cashValue;
            expect(yr0.netEquity).toBeCloseTo(assets - yr0.loan - yr0.bondLoan, 6);
        });

        it('does not let borrowing inflate year-0 net equity', () => {
            const baseline = calculateProjection(inputFromDefaults());
            const geared = calculateProjection(inputFromDefaults({ bondCollateralLTV: 50 }));

            // Year 0 books the policy's surrender haircut on a larger premium funded with
            // debt, so gearing up must REDUCE opening net equity. A rise here means the
            // drawn loan escaped the liability side.
            expect(geared.projectionData[0].netEquity)
                .toBeLessThan(baseline.projectionData[0].netEquity);
        });

        it('accrues its own interest and drags monthly cashflow', () => {
            const baseline = calculateProjection(inputFromDefaults());
            const geared = calculateProjection(inputFromDefaults({ bondCollateralLTV: 50 }));

            expect(geared.monthlyBondLoanInterest)
                .toBeCloseTo((geared.bondLoan * (geared.bondLoanRate / 100)) / 12, 6);
            expect(geared.monthlyNetCashflow).toBeLessThan(baseline.monthlyNetCashflow);
            expect(geared.projectionData[10].cumulativeBondLoanInterest)
                .toBeCloseTo(geared.bondLoan * (geared.bondLoanRate / 100) * 10, 6);
        });

        it('prices off the same basis as the policy loan but its own spread', () => {
            const wide = calculateProjection(inputFromDefaults({
                bondCollateralLTV: 50, bondLoanSpread: 3,
            }));

            expect(wide.bondLoanRate).toBeCloseTo(DEFAULT_INPUTS.hibor + 3, 6);
            expect(wide.bondLoanRate).toBeGreaterThan(wide.effectiveRate);
        });

        it('reports the bond facility gearing separately, so a bond crash is not hidden by policy collateral', () => {
            const projection = calculateProjection(inputFromDefaults({ bondCollateralLTV: 50 }));
            const mild = calculateStressTest(stressInput(projection, {
                bondPriceDrop: 0, bondLoan: projection.bondLoan,
            }));
            const severe = calculateStressTest(stressInput(projection, {
                bondPriceDrop: 60, bondLoan: projection.bondLoan,
            }));

            expect(mild.stressedProjection[0].bondLtv).toBeCloseTo(50, 6);
            // 50% advance against collateral worth 40% of par is a blown facility. The
            // blended policy ratio barely moves over the same shock, which is exactly why
            // this is reported as its own number.
            expect(severe.stressedProjection[0].bondLtv).toBeCloseTo(125, 6);
            expect(severe.stressedProjection[0].ltv).toBeLessThan(100);
        });

        it('flags a fully impaired bond facility rather than reporting 0%', () => {
            const projection = calculateProjection(inputFromDefaults({ bondCollateralLTV: 50 }));
            const wipeout = calculateStressTest(stressInput(projection, {
                bondPriceDrop: 100, bondLoan: projection.bondLoan,
            }));

            expect(wipeout.stressedProjection[0].bondLtv).toBe(LTV_IMPAIRED);
        });

        it('stays finite across the whole collateral-LTV range', () => {
            for (const bondCollateralLTV of [0, 1, 50, 99, 100]) {
                const projection = calculateProjection(inputFromDefaults({ bondCollateralLTV }));
                expect(nonFiniteNumbers(projection)).toEqual([]);
            }
        });
    });
});
