import { describe, expect, it } from 'vitest';
import { calculatePMT, calculateProjection, type SimulationInput } from './calculations';
import { CASH_WORKBOOK, MORTGAGE_WORKBOOK, type Workbook } from './__fixtures__/workbooks';

// Acceptance gate for the workbook-parity work. Graded against the numbers in
// __fixtures__/workbooks.ts, which were read out of the spreadsheets — not against
// "looks right", and not against anything this file recomputes.
//
// Tolerances. The app carries BASE_FACTORS to 4 dp; the workbook's SLE table carries 7
// (1.3879 vs 1.387884). That is a genuine, bounded difference of 0.0097% at year 10
// (0.000016 x 6,071,428 = 97 HKD, exactly the observed gap), so anything scaled by a
// surrender factor gets FACTOR_TOL. Everything else — premium, loan, rate, year 0, and
// the mortgage schedule, none of which touch a factor — must be near-exact.
const FACTOR_TOL = 5e-4;
const EXACT_TOL = 1e-6;

const close = (actual: number, expected: number, tol: number, what: string) => {
    const denom = Math.abs(expected) || 1;
    const rel = Math.abs(actual - expected) / denom;
    expect(
        rel <= tol,
        `${what}: got ${actual}, workbook says ${expected} (rel ${(rel * 100).toFixed(4)}%, tol ${(tol * 100).toFixed(4)}%)`,
    ).toBe(true);
};

// Maps a workbook fixture onto the engine input. Phases 1-4 are wired; anything a later
// phase adds stays unsupported here until that phase lands.
const toEngineInput = (wb: Workbook): SimulationInput => {
    const p = wb.input.properties[0];
    // Gross bank loan, per 'Mortgage Table A'!C3 = 'Data Entry'!B7 = value x LTV.
    const grossLoan = p ? p.value * (p.ltv / 100) : 0;
    return {
        budget: wb.input.budget,
        cashReserve: wb.input.cashReserve,
        bondAlloc: wb.input.bondAlloc,
        bondYield: wb.input.bondYield,
        hibor: wb.input.hibor,
        cofRate: wb.input.cofRate,
        interestBasis: wb.input.interestBasis,
        spread: wb.input.spread,
        leverageLTV: wb.input.leverageLTV,
        capRate: wb.input.capRate,
        handlingFee: wb.input.handlingFee,
        fundSource: wb.input.fundSource,
        unlockedCash: grossLoan,
        effectiveMortgageRate: p ? p.rate : 0,
        monthlyMortgagePmt: p ? calculatePMT(p.rate, p.tenor, grossLoan) : 0,
        mortgageTenor: p ? p.tenor : 0,
        properties: wb.input.properties,
        extraCash: wb.input.extraCash,
        bondCollateralLTV: wb.input.bondCollateralLTV,
        bondLoanSpread: wb.input.bondLoanSpread,
        // Phase 3
        topUpMode: wb.input.topUpMode,
        minTopUpAmount: wb.input.minTopUpAmount,
        // Phase 4
        fxRate: wb.input.fxRate,
        policyRebateBands: wb.input.policyRebateBands,
        bankCashRebate: wb.input.bankCashRebate,
        fundFeeRebate: wb.input.fundFeeRebate,
        assetLoanHandlingFee: wb.input.assetLoanHandlingFee,
    } as SimulationInput;
};

describe('workbook parity', () => {
    describe(CASH_WORKBOOK.label, () => {
        const wb = CASH_WORKBOOK;
        const projection = calculateProjection(toEngineInput(wb));

        it('reproduces the funding structure', () => {
            close(projection.totalPremium, wb.expected.totalPremium, EXACT_TOL, 'total premium');
            close(projection.bankLoan, wb.expected.bankLoan, EXACT_TOL, 'bank loan');
            close(projection.effectiveRate, wb.expected.effectiveRate, EXACT_TOL, 'effective rate');
        });

        it('reproduces Year 0 exactly — no factor rounding at t0 (both use 0.8)', () => {
            close(projection.projectionData[0].cumulativeNetGain,
                wb.expected.gainByYear[0], EXACT_TOL, 'Y0 gain');
        });

        it.each([10, 15, 20, 30])('reproduces the Year %i return', year => {
            close(projection.projectionData[year].cumulativeNetGain,
                wb.expected.gainByYear[year], FACTOR_TOL, `Y${year} gain`);
        });

        it('reproduces the Year 30 ROI (workbook 「佔客戶資本」)', () => {
            close(projection.roi, wb.expected.roiByYear[30], FACTOR_TOL, 'Y30 ROI');
        });
    });

    // The mortgage workbook's return anchors were `.fails()` through Phases 1-3 and went
    // green when Phase 4's rebate landed. The marker earned its keep: it turned "the
    // anchors now pass" into a loud failure rather than a silent green, which is how the
    // closure was noticed at all.
    describe(MORTGAGE_WORKBOOK.label, () => {
        const wb = MORTGAGE_WORKBOOK;
        const projection = calculateProjection(toEngineInput(wb));
        const anchors = [5, 10, 15, 16];

        it('reproduces the funding structure', () => {
            close(projection.totalPremium, wb.expected.totalPremium, EXACT_TOL, 'total premium');
            close(projection.bankLoan, wb.expected.bankLoan, EXACT_TOL, 'bank loan');
            close(projection.effectiveRate, wb.expected.effectiveRate, EXACT_TOL, 'effective rate');
        });

        // Phase 1 — monthly amortisation on the gross loan, aggregated across properties.
        it('reproduces the Year 5 mortgage schedule', () => {
            const c = wb.expected.components![5];
            close(projection.projectionData[5].mortgageBalance,
                c.mortgageBalance!, EXACT_TOL, 'Y5 mortgage balance');
            close(projection.projectionData[5].cumulativeMortgageCost,
                c.cumulativeMortgageCost!, EXACT_TOL, 'Y5 cumulative mortgage outgo');
        });

        // Phase 4 — the banded rebate. Independent of the return basis: it is a flat
        // credit, so it can be graded on its own even while the anchors below are red.
        it('reproduces the policy rebate band', () => {
            close(projection.policyRebate,
                wb.expected.components![5].policyRebate!, EXACT_TOL, 'policy rebate');
        });

        // Phase 2 return basis + Phase 3 top-up + Phase 4 rebate all land in this number,
        // which is why it stayed red until the last of the three landed.
        it.each(anchors)('reproduces the Year %i return', year => {
            close(projection.projectionData[year].cumulativeNetGain,
                wb.expected.gainByYear[year], FACTOR_TOL, `Y${year} gain`);
        });

        // Independent of the return basis — surrender value is premium x factor.
        it('reproduces the Year 5 surrender value', () => {
            close(projection.projectionData[5].surrenderValue,
                wb.expected.components![5].surrenderValue!, FACTOR_TOL, 'Y5 surrender value');
        });
    });
});
