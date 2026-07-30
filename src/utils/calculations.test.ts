import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS } from '../constants/defaults';
import {
    calculatePMT,
    calculateProjection,
    calculateStressTest,
    deriveEffectiveMortgageRate,
    deriveUnlockedCash,
    LTV_IMPAIRED,
    type SimulationInput,
    type SimulationOutput,
    type StressTestInput,
} from './calculations';

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

            expect(projection.projectionData).toMatchInlineSnapshot(`
              [
                {
                  "annualBondIncome": 0,
                  "annualLoanInterest": 0,
                  "annualMortgagePayment": 0,
                  "annualNetGain": 0,
                  "annualPolicyGrowth": 0,
                  "annualRoC": 0,
                  "bondFundNetValue": 2970000,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 0,
                  "cumulativeInterest": 0,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 0,
                  "cumulativePolicyGrowth": 0,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,398,571",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3398571.428571429,
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
                  "bondFundNetValue": 3133350,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 163350,
                  "cumulativeInterest": 112114.28571428577,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 51235.714285714086,
                  "cumulativePolicyGrowth": 0,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,449,807",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3449807.142857143,
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
                  "bondFundNetValue": 3296700,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 326700,
                  "cumulativeInterest": 224228.57142857154,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 162757.14285714226,
                  "cumulativePolicyGrowth": 60285.714285714086,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,561,329",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3561328.5714285714,
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
                  "bondFundNetValue": 3460050,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 490050,
                  "cumulativeInterest": 336342.8571428573,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 279992.85714285634,
                  "cumulativePolicyGrowth": 126285.71428571409,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,678,564",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3678564.2857142854,
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
                  "bondFundNetValue": 3623400,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 653400,
                  "cumulativeInterest": 448457.1428571431,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 414657.14285714226,
                  "cumulativePolicyGrowth": 209714.28571428545,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$3,813,229",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 3813228.5714285714,
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
                  "bondFundNetValue": 3786750,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 816750,
                  "cumulativeInterest": 560571.4285714289,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 846464.2857142845,
                  "cumulativePolicyGrowth": 590285.7142857141,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$4,245,036",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 4245035.714285714,
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
                  "bondFundNetValue": 3950100,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 980100,
                  "cumulativeInterest": 672685.7142857146,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 1118271.4285714282,
                  "cumulativePolicyGrowth": 810857.1428571432,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$4,516,843",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 4516842.857142857,
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
                  "bondFundNetValue": 4113450,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1143450,
                  "cumulativeInterest": 784800.0000000003,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 1462078.571428571,
                  "cumulativePolicyGrowth": 1103428.5714285714,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$4,860,650",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 4860650,
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
                  "bondFundNetValue": 4276800,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1306800,
                  "cumulativeInterest": 896914.2857142861,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 1669028.57142857,
                  "cumulativePolicyGrowth": 1259142.8571428573,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$5,067,600",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 5067599.999999999,
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
                  "bondFundNetValue": 4440150,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1470150,
                  "cumulativeInterest": 1009028.571428572,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 1887407.1428571418,
                  "cumulativePolicyGrowth": 1426285.714285714,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$5,285,979",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 5285978.571428571,
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
                  "bondFundNetValue": 4603500,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1633500,
                  "cumulativeInterest": 1121142.8571428577,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 2192071.4285714272,
                  "cumulativePolicyGrowth": 1679714.285714286,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$5,590,643",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 5590642.857142856,
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
                  "bondFundNetValue": 4766850,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1796850,
                  "cumulativeInterest": 1233257.1428571434,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 2399878.571428571,
                  "cumulativePolicyGrowth": 1836285.714285715,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$5,798,450",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 5798450,
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
                  "bondFundNetValue": 4930200,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 1960200,
                  "cumulativeInterest": 1345371.428571429,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 2630828.571428571,
                  "cumulativePolicyGrowth": 2016000.0000000005,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$6,029,400",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 6029400,
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
                  "bondFundNetValue": 5093550,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2123550,
                  "cumulativeInterest": 1457485.714285715,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 2919207.1428571437,
                  "cumulativePolicyGrowth": 2253142.8571428577,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$6,317,779",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 6317778.571428573,
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
                  "bondFundNetValue": 5256900,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2286900,
                  "cumulativeInterest": 1569600.0000000007,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 3162442.8571428573,
                  "cumulativePolicyGrowth": 2445142.8571428577,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$6,561,014",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 6561014.285714286,
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
                  "bondFundNetValue": 5420250,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2450250,
                  "cumulativeInterest": 1681714.2857142866,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 3474821.428571428,
                  "cumulativePolicyGrowth": 2706285.714285715,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$6,873,393",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 6873392.857142857,
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
                  "bondFundNetValue": 5583600,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2613600,
                  "cumulativeInterest": 1793828.5714285723,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 3781771.4285714272,
                  "cumulativePolicyGrowth": 2962000.0000000005,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$7,180,343",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 7180342.857142856,
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
                  "bondFundNetValue": 5746950,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2776950,
                  "cumulativeInterest": 1905942.857142858,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 4077578.571428571,
                  "cumulativePolicyGrowth": 3206571.4285714296,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$7,476,150",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 7476150,
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
                  "bondFundNetValue": 5910300,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 2940300,
                  "cumulativeInterest": 2018057.142857144,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 4425671.428571427,
                  "cumulativePolicyGrowth": 3503428.5714285714,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$7,824,243",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 7824242.857142856,
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
                  "bondFundNetValue": 6073650,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3103650,
                  "cumulativeInterest": 2130171.4285714296,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 4762621.428571429,
                  "cumulativePolicyGrowth": 3789142.8571428577,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$8,161,193",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 8161192.857142858,
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
                  "bondFundNetValue": 6237000,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3267000,
                  "cumulativeInterest": 2242285.7142857155,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 5158714.285714284,
                  "cumulativePolicyGrowth": 4134000.0000000014,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$8,557,286",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 8557285.714285713,
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
                  "bondFundNetValue": 6400350,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3430350,
                  "cumulativeInterest": 2354400.000000001,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 5492807.142857142,
                  "cumulativePolicyGrowth": 4416857.142857144,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$8,891,379",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 8891378.57142857,
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
                  "bondFundNetValue": 6563700,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3593700,
                  "cumulativeInterest": 2466514.285714287,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 5850042.857142856,
                  "cumulativePolicyGrowth": 4722857.142857144,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$9,248,614",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 9248614.285714285,
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
                  "bondFundNetValue": 6727050,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3757050,
                  "cumulativeInterest": 2578628.5714285728,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 6253850,
                  "cumulativePolicyGrowth": 5075428.571428573,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$9,652,421",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 9652421.42857143,
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
                  "bondFundNetValue": 6890400,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 3920400,
                  "cumulativeInterest": 2690742.857142858,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 6681085.714285716,
                  "cumulativePolicyGrowth": 5451428.571428575,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$10,079,657",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 10079657.142857146,
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
                  "bondFundNetValue": 7053750,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4083750,
                  "cumulativeInterest": 2802857.142857144,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 7103464.285714285,
                  "cumulativePolicyGrowth": 5822571.428571431,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$10,502,036",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 10502035.714285715,
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
                  "bondFundNetValue": 7217100,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4247100,
                  "cumulativeInterest": 2914971.42857143,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 7547842.857142858,
                  "cumulativePolicyGrowth": 6215714.285714287,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$10,946,414",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 10946414.285714287,
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
                  "bondFundNetValue": 7380450,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4410450,
                  "cumulativeInterest": 3027085.714285716,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 8027650,
                  "cumulativePolicyGrowth": 6644285.714285716,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$11,426,221",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 11426221.42857143,
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
                  "bondFundNetValue": 7543800,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4573800,
                  "cumulativeInterest": 3139200.0000000014,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 8520028.571428569,
                  "cumulativePolicyGrowth": 7085428.571428573,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$11,918,600",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 11918599.999999998,
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
                  "bondFundNetValue": 7707150,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4737150,
                  "cumulativeInterest": 3251314.2857142873,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 9053835.714285716,
                  "cumulativePolicyGrowth": 7568000.000000002,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$12,452,407",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 12452407.142857146,
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
                  "bondFundNetValue": 7870500,
                  "bondPrincipal": 2970000,
                  "cashValue": 200000,
                  "cumulativeBondInterest": 4900500,
                  "cumulativeInterest": 3363428.571428573,
                  "cumulativeMortgageCost": 0,
                  "cumulativeMortgageInterest": 0,
                  "cumulativeNetGain": 9600499.999999998,
                  "cumulativePolicyGrowth": 8063428.571428573,
                  "formattedLoan": "$2,057,143",
                  "formattedNetEquity": "$12,999,071",
                  "loan": 2057142.8571428582,
                  "mortgageBalance": 0,
                  "netEquity": 12999071.428571427,
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
});
