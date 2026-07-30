
// Constants
export const BASE_FACTORS: { [key: number]: number } = {
    0: 0.8000, 1: 0.8000, 2: 0.8211, 3: 0.8442, 4: 0.8734, 5: 1.0066,
    6: 1.0838, 7: 1.1862, 8: 1.2407, 9: 1.2992, 10: 1.3879,
    11: 1.4427, 12: 1.5056, 13: 1.5886, 14: 1.6558, 15: 1.7472,
    16: 1.8367, 17: 1.9223, 18: 2.0262, 19: 2.1262, 20: 2.2469,
    21: 2.3459, 22: 2.4530, 23: 2.5764, 24: 2.7080, 25: 2.8379,
    26: 2.9755, 27: 3.1255, 28: 3.2799, 29: 3.4488, 30: 3.6222
};

export const generateGuaranteed = (factors: { [key: number]: number }) => {
    const guaranteed: { [key: number]: number } = {};
    Object.keys(factors).forEach(key => {
        const k = Number(key);
        guaranteed[k] = factors[k] * Math.max(0, 0.85 - (k * 0.005));
    });
    return guaranteed;
};

export const GUARANTEED_FACTORS = generateGuaranteed(BASE_FACTORS);

export const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(val);
};

export const formatPercent = (val: number) => `${val.toFixed(2)}%`;

// Types
export interface ProjectionData {
    year: number;
    surrenderValue: number;
    bondPrincipal: number;
    cumulativeBondInterest: number;
    bondFundNetValue: number;
    cashValue: number;
    totalAssets: number;
    loan: number;
    cumulativeInterest: number;
    netEquity: number;
    formattedNetEquity: string;
    formattedLoan: string;
    annualBondIncome: number;
    annualLoanInterest: number;
    annualPolicyGrowth: number;
    annualNetGain: number;
    annualRoC: number;
    cumulativePolicyGrowth: number;
    cumulativeNetGain: number;
    mortgageBalance: number;
    cumulativeMortgageCost: number;
    cumulativeMortgageInterest: number;
    annualMortgagePayment: number;
    // Stress test fields
    baselineNetEquity?: number;
    ltv?: number;
}

export interface SimulationInput {
    budget: number;
    cashReserve: number;
    bondAlloc: number;
    bondYield: number;
    hibor: number;
    cofRate: number;
    interestBasis: 'hibor' | 'cof';
    spread: number;
    leverageLTV: number;
    capRate: number;
    handlingFee: number;
    fundSource: 'cash' | 'mortgage';
    unlockedCash: number; // Derived often, but needed here
    effectiveMortgageRate: number;
    monthlyMortgagePmt: number;
    mortgageTenor: number;
}

export interface SimulationOutput {
    pfEquity: number;
    totalPremium: number;
    bankLoan: number;
    effectiveRate: number;
    projectionData: ProjectionData[];
    finalNetEquity: number;
    roi: number;
    monthlyBondIncome: number;
    monthlyLoanInterest: number;
    monthlyNetCashflow: number;
    oneOffBondFee: number;
    netBondPrincipal: number;
    monthlyMortgagePmt: number;
}

export interface StressTestInput {
    projectionData: ProjectionData[];
    simulatedHibor: number;
    bondPriceDrop: number;
    showGuaranteed: boolean;
    totalPremium: number;
    netBondPrincipal: number;
    bondYield: number;
    bankLoan: number;
    spread: number;
    capRate: number;
    budget: number;
    cashReserve: number;
    sensitivityYear: number;
    fundSource: 'cash' | 'mortgage';
    unlockedCash: number; // Needed for Year 0 mortgage check
    // The stressed loan rate must be built on the SAME basis the baseline used,
    // otherwise the stressed projection is not comparable to baselineNetEquity.
    interestBasis: 'hibor' | 'cof';
    cofRate: number;
    hibor: number; // current HIBOR — the shock is (simulatedHibor - hibor)
}

export interface StressTestOutput {
    stressedProjection: ProjectionData[];
    stressStats: {
        breakEvenHibor: number;
        lowestEquity: number;
    };
    sensitivityData: {
        xLabels: number[];
        yLabels: number[];
        data: number[][];
    };
}


export const sanitize = (val: number, min = 0, max = Infinity, fallback = 0) => {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return fallback;
    return Math.max(min, Math.min(max, val));
};

// Upper bound for any monetary input. A finite-but-astronomical entry (the number
// field accepts up to Number.MAX_VALUE) stays finite on its own, but overflows to
// Infinity once compounded over 30 years — which then renders as "$∞"/"NaN". This
// ceiling is orders of magnitude above any real premium-financing case.
export const MAX_MONEY = 1e15;

// Reported LTV when a loan is outstanding against fully impaired collateral. The true
// ratio is unbounded, but the LTV chart needs a finite number, and any value this far
// above a margin-call threshold reads unambiguously as "collateral gone".
export const LTV_IMPAIRED = 9999;

// Standard amortizing payment. Lives here rather than inside useAppState because it is
// pure arithmetic with no React dependency — being trapped in the hook is the only
// reason its divide-by-zero went unnoticed.
export const calculatePMT = (rate: number, nper: number, pv: number) => {
    // A cleared tenor field arrives as 0; without this guard nper=0 divides by zero
    // and yields Infinity (pv > 0) or NaN (pv === 0), which then renders in the UI.
    // The isFinite checks make the function total regardless of what reaches it.
    if (!isFinite(nper) || !isFinite(pv) || !isFinite(rate)) return 0;
    if (nper <= 0 || pv <= 0) return 0;
    // nper is in YEARS but the payment is monthly, so the interest-free case has to
    // divide by months, not years. `pv / nper` returned an annual figure that every
    // caller then treated as monthly — a 12x overstatement. Reachable from the UI:
    // primeRate <= mortgagePModifier drives effectiveMortgageRate to 0.
    if (rate === 0) return pv / (nper * 12);
    const r = rate / 100 / 12;
    const n = nper * 12;
    const growth = Math.pow(1 + r, n);
    if (!isFinite(growth) || growth === 1) return pv / (nper * 12);
    return (pv * r * growth) / (growth - 1);
};

// The two derivations below were inline in useAppState. They are extracted for the same
// reason as calculatePMT — pure arithmetic — plus one specific to them: the hook-chain
// test needs to drive the REAL derivation. A test that re-implemented these would pass
// happily while the hook itself regressed. Behaviour is identical to the inline versions.

// propertyValue and mortgageLtv are both free numeric fields, so their product can reach
// Infinity (e.g. 1e308 x 1e10). Unbounded, that fed calculatePMT and surfaced as an
// "Infinity" monthly payment in the UI.
export const deriveUnlockedCash = (
    propertyValue: number, mortgageLtv: number, existingMortgage: number
) => sanitize(
    Math.max(0, (propertyValue * (mortgageLtv / 100)) - existingMortgage),
    0, MAX_MONEY
);

// calculateProjection sanitizes the rate to 0..100 internally, so an unclamped value here
// would be displayed in the UI while the engine used a different number. A negative
// P-minus rate (primeRate < mortgagePModifier) is the reachable case.
export const deriveEffectiveMortgageRate = (
    hibor: number, mortgageHSpread: number, primeRate: number, mortgagePModifier: number
) => Math.max(0, Math.min(100,
    Math.min(hibor + mortgageHSpread, primeRate - mortgagePModifier)));

// Core Calculation Logic
export const calculateProjection = (input: SimulationInput): SimulationOutput => {
    const budget = sanitize(input.budget, 0, MAX_MONEY);
    const cashReserve = sanitize(input.cashReserve, 0, budget);
    // Bonds can only be bought with money the budget actually contains. Uncapped, an
    // over-allocation counted as a Year-0 asset while funding no policy and drawing no
    // loan, so unfunded money showed up as net equity.
    const bondAlloc = sanitize(input.bondAlloc, 0, Math.max(0, budget - cashReserve));
    const bondYield = sanitize(input.bondYield, 0, 100);
    const hibor = sanitize(input.hibor, 0, 100);
    const cofRate = sanitize(input.cofRate, 0, 100);
    const interestBasis = input.interestBasis;
    const spread = sanitize(input.spread, 0, 100);
    const leverageLTV = sanitize(input.leverageLTV, 0, 100);
    const capRate = sanitize(input.capRate, 0, 100);
    const handlingFee = sanitize(input.handlingFee, 0, 100);
    const fundSource = input.fundSource;
    const unlockedCash = sanitize(input.unlockedCash, 0, MAX_MONEY);
    const effectiveMortgageRate = sanitize(input.effectiveMortgageRate, 0, 100);
    const monthlyMortgagePmt = sanitize(input.monthlyMortgagePmt, 0, MAX_MONEY);
    const mortgageTenor = sanitize(input.mortgageTenor, 0, 50);

    const equity = budget - cashReserve - bondAlloc;
    const ltvDecimal = leverageLTV / 100.0;

    // Use the base factors directly
    const currentFactors = BASE_FACTORS;
    const initialCSVFactor = currentFactors[0] || 0;

    let tPremium = 0;
    const denominator = 1 - (ltvDecimal * initialCSVFactor);
    if (denominator > 0 && equity > 0) {
        tPremium = sanitize(equity / denominator, 0, MAX_MONEY);
    }

    // The premium equation (loan = tPremium - equity) only holds once a policy is
    // actually funded. With equity <= 0 no policy is purchased (tPremium = 0), so
    // tPremium - equity would report a phantom loan equal to the equity shortfall.
    const loan = tPremium > 0 ? Math.max(0, tPremium - equity) : 0;

    // Effective Rate Logic
    const baseRate = interestBasis === 'hibor' ? hibor : cofRate;
    const effRate = Math.min(baseRate + spread, capRate);

    // Bond Logic: Fee is one-off, deducted from capital. Yield applies to Net Capital.
    const oneOffFee = bondAlloc * (handlingFee / 100);
    const netBondAlloc = bondAlloc - oneOffFee;

    // Monthly Cashflow Calculation (Year 1 Run-rate)
    const mBondIncome = (netBondAlloc * (bondYield / 100)) / 12;
    const mLoanInterest = (loan * (effRate / 100)) / 12;
    const mMortgageCost = fundSource === 'mortgage' ? monthlyMortgagePmt : 0;
    const mNetCashflow = mBondIncome - mLoanInterest - mMortgageCost;

    // Generate Mortgage Schedule if applicable
    const mortgageSchedule: any[] = [];
    if (fundSource === 'mortgage') {
        let balance = unlockedCash;
        const annualPmt = monthlyMortgagePmt * 12;
        let cumInterest = 0;

        for (let y = 0; y <= 30; y++) {
            if (y === 0) {
                mortgageSchedule.push({ balance: balance, annualPmt: 0, cumInterest: 0, annualInterest: 0 });
            } else if (y <= mortgageTenor) {
                const interestPart = balance * (effectiveMortgageRate / 100);
                let principalPart = annualPmt - interestPart;
                let actualPmt = annualPmt;

                if (balance < principalPart) {
                    principalPart = balance;
                    actualPmt = principalPart + interestPart;
                }

                cumInterest += interestPart;
                balance -= principalPart;
                if (balance < 0) balance = 0;
                mortgageSchedule.push({ balance: balance, annualPmt: actualPmt, cumInterest: cumInterest, annualInterest: interestPart });
            } else {
                // Carry whatever principal is still outstanding. Hardcoding 0 here made an
                // under-amortised balance vanish the year after the tenor ended, which
                // showed as a one-year jump in net equity equal to the unpaid principal.
                mortgageSchedule.push({ balance: balance, annualPmt: 0, cumInterest: cumInterest, annualInterest: 0 });
            }
        }
    }

    const data: ProjectionData[] = [];

    // Initialize Year 0
    const yr0Factor = currentFactors[0];
    const yr0Surrender = tPremium * yr0Factor;
    const yr0Assets = yr0Surrender + netBondAlloc + cashReserve;
    const yr0Liabilities = loan;

    const yr0MortgageBal = fundSource === 'mortgage' ? unlockedCash : 0;
    const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;

    data.push({
        year: 0,
        surrenderValue: yr0Surrender,
        bondPrincipal: netBondAlloc,
        cumulativeBondInterest: 0,
        bondFundNetValue: netBondAlloc,
        cashValue: cashReserve,
        totalAssets: yr0Assets,
        loan: yr0Liabilities,
        cumulativeInterest: 0,
        netEquity: yr0NetEquity,
        formattedNetEquity: formatCurrency(yr0NetEquity),
        formattedLoan: formatCurrency(yr0Liabilities),
        annualBondIncome: 0,
        annualLoanInterest: 0,
        annualPolicyGrowth: 0,
        annualNetGain: 0,
        annualRoC: 0,
        cumulativePolicyGrowth: 0,
        cumulativeNetGain: 0,
        mortgageBalance: yr0MortgageBal,
        cumulativeMortgageCost: 0,
        cumulativeMortgageInterest: 0,
        annualMortgagePayment: 0
    });

    let runningCumMtgCost = 0;

    for (let yr = 1; yr <= 30; yr++) {
        const factor = currentFactors[yr] || currentFactors[30];
        const surrenderValue = tPremium * factor;

        const cumulativeBondInterest = netBondAlloc * (bondYield / 100) * yr;
        const bondFundNetValue = netBondAlloc + cumulativeBondInterest;
        const cumulativeInterest = loan * (effRate / 100) * yr;
        const currentAssets = surrenderValue + bondFundNetValue + cashReserve;
        const currentLiabilities = loan;

        let netEquity = currentAssets - currentLiabilities - cumulativeInterest;

        let mtgBal = 0;
        let annualMtgPmt = 0;
        let cumMtgInt = 0;
        if (fundSource === 'mortgage') {
            mtgBal = mortgageSchedule[yr]?.balance || 0;
            annualMtgPmt = mortgageSchedule[yr]?.annualPmt || 0;
            cumMtgInt = mortgageSchedule[yr]?.cumInterest || 0;
            runningCumMtgCost += annualMtgPmt;
            netEquity -= mtgBal;
        }

        const prev = data[yr - 1];
        const annualBondIncome = cumulativeBondInterest - prev.cumulativeBondInterest;
        const annualLoanInterest = cumulativeInterest - prev.cumulativeInterest;
        const annualPolicyGrowth = surrenderValue - prev.surrenderValue;

        // Note: annualMtgPmt is local here, but we are using it for Net Gain calc
        let annualNetGain = (annualBondIncome + annualPolicyGrowth) - annualLoanInterest - annualMtgPmt;

        let annualRoC = 0;
        const denom = budget;
        if (denom !== 0) {
            annualRoC = (annualNetGain / denom) * 100;
        }

        const cumulativePolicyGrowth = surrenderValue - yr0Surrender;

        const cumulativeNetGain = netEquity - yr0NetEquity;

        data.push({
            year: yr,
            surrenderValue,
            bondPrincipal: netBondAlloc,
            cumulativeBondInterest,
            bondFundNetValue,
            cashValue: cashReserve,
            totalAssets: currentAssets,
            loan: currentLiabilities,
            cumulativeInterest,
            netEquity,
            formattedNetEquity: formatCurrency(netEquity),
            formattedLoan: formatCurrency(currentLiabilities),
            annualBondIncome,
            annualLoanInterest,
            annualPolicyGrowth,
            annualNetGain,
            annualRoC,
            cumulativePolicyGrowth,
            cumulativeNetGain,
            mortgageBalance: mtgBal,
            cumulativeMortgageCost: runningCumMtgCost,
            cumulativeMortgageInterest: cumMtgInt,
            annualMortgagePayment: annualMtgPmt
        });
    }

    const final = data[30].netEquity;
    const totalGain = data[30].cumulativeNetGain;
    const roiVal = budget > 0 ? (totalGain / budget) * 100 : 0;

    return {
        pfEquity: equity,
        totalPremium: tPremium,
        bankLoan: loan,
        effectiveRate: effRate,
        projectionData: data,
        finalNetEquity: final,
        roi: roiVal,
        monthlyBondIncome: mBondIncome,
        monthlyLoanInterest: mLoanInterest,
        monthlyNetCashflow: mNetCashflow,
        oneOffBondFee: oneOffFee,
        netBondPrincipal: netBondAlloc,
        monthlyMortgagePmt: mMortgageCost
    };
};

export const calculateStressTest = (input: StressTestInput): StressTestOutput => {
    const projectionData = input.projectionData;
    const simulatedHibor = sanitize(input.simulatedHibor, 0, 100);
    const bondPriceDrop = sanitize(input.bondPriceDrop, 0, 100);
    const showGuaranteed = input.showGuaranteed;
    const totalPremium = sanitize(input.totalPremium, 0, MAX_MONEY);
    const netBondPrincipal = sanitize(input.netBondPrincipal, 0, MAX_MONEY);
    const bondYield = sanitize(input.bondYield, 0, 100);
    const bankLoan = sanitize(input.bankLoan, 0, MAX_MONEY);
    const spread = sanitize(input.spread, 0, 100);
    const capRate = sanitize(input.capRate, 0, 100);
    const budget = sanitize(input.budget, 0, MAX_MONEY);
    const cashReserve = sanitize(input.cashReserve, 0, budget);
    const sensitivityYear = sanitize(input.sensitivityYear, 1, 30, 20);
    const fundSource = input.fundSource;
    const unlockedCash = sanitize(input.unlockedCash, 0, MAX_MONEY);
    const interestBasis = input.interestBasis;
    const cofRate = sanitize(input.cofRate, 0, 100);
    const hibor = sanitize(input.hibor, 0, 100);

    const factors = showGuaranteed ? GUARANTEED_FACTORS : BASE_FACTORS;

    // 1. Bond Shock
    const stressedBondPrincipal = netBondPrincipal * (1 - bondPriceDrop / 100);

    // 2. Stressed loan rate — apply the rate shock to whichever base the baseline
    //    priced off. On a COF facility a HIBOR move does not reprice the loan
    //    directly, so the shock carries across as a delta. With a zero shock this
    //    reproduces the baseline effective rate exactly, which is what makes
    //    stressedProjection comparable to baselineNetEquity.
    const rateShock = simulatedHibor - hibor;
    const stressedBase = interestBasis === 'hibor'
        ? simulatedHibor
        : Math.max(0, cofRate + rateShock);
    const stressedRate = Math.min(stressedBase + spread, capRate);

    const data: ProjectionData[] = [];
    const baselineData = projectionData;

    // Year 0
    const yr0Factor = factors[0] || 0;
    const yr0Surrender = totalPremium * yr0Factor;
    const yr0Assets = yr0Surrender + stressedBondPrincipal + cashReserve;
    const yr0Liabilities = bankLoan;
    const yr0MortgageBal = fundSource === 'mortgage' ? unlockedCash : 0;
    const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;

    const yr0Collateral = yr0Surrender + stressedBondPrincipal;
    data.push({
        year: 0,
        netEquity: yr0NetEquity,
        baselineNetEquity: baselineData?.[0]?.netEquity || 0,
        ltv: yr0Collateral > 0
            ? (yr0Liabilities / yr0Collateral) * 100
            : (yr0Liabilities > 0 ? LTV_IMPAIRED : 0)
    } as ProjectionData);

    let lowestEquity = yr0NetEquity;

    for (let yr = 1; yr <= 30; yr++) {
        const factor = factors[yr] || factors[30];
        const surrenderValue = totalPremium * factor;

        const cumulativeBondInterest = stressedBondPrincipal * (bondYield / 100) * yr;
        const bondFundNetValue = stressedBondPrincipal + cumulativeBondInterest;
        const cumulativeInterest = bankLoan * (stressedRate / 100) * yr;

        const currentAssets = surrenderValue + bondFundNetValue + cashReserve;
        const currentLiabilities = bankLoan;

        let netEquity = currentAssets - currentLiabilities - cumulativeInterest;

        if (fundSource === 'mortgage') {
            const mtgBal = baselineData[yr]?.mortgageBalance || 0;
            netEquity -= mtgBal;
        }

        if (netEquity < lowestEquity) lowestEquity = netEquity;

        // A wiped-out collateral base with a live loan is the margin-call case the chart
        // exists to show; reporting 0% there rendered the worst outcome as the safest.
        const collateralValue = surrenderValue + bondFundNetValue;
        const ltv = collateralValue > 0
            ? (currentLiabilities / collateralValue) * 100
            : (currentLiabilities > 0 ? LTV_IMPAIRED : 0);

        data.push({
            year: yr,
            netEquity,
            baselineNetEquity: baselineData[yr]?.netEquity || 0,
            ltv,
            surrenderValue,
            bondFundNetValue
        } as ProjectionData);
    }

    // Break-even HIBOR
    let totalGrowth = 0;
    for (let i = 1; i <= 5; i++) {
        totalGrowth += totalPremium * ((factors[i] || factors[30]) - (factors[i - 1] || factors[0]));
    }
    const avgAnnualPolicyGrowth = totalGrowth / 5;
    const annualBondIncome = stressedBondPrincipal * (bondYield / 100);
    const totalAnnualIncome = annualBondIncome + avgAnnualPolicyGrowth;
    const annualMtgPmt = fundSource === 'mortgage' ? baselineData[1]?.annualMortgagePayment || 0 : 0;

    // The loan rate that would exactly consume all income. Break-even is then the HIBOR
    // that produces that rate on whichever basis the facility prices off.
    let breakEvenHibor = 0;
    if (bankLoan > 0) {
        const breakEvenRate = ((totalAnnualIncome - annualMtgPmt) / bankLoan) * 100;
        if (breakEvenRate > capRate) {
            // The cap binds before break-even is reachable, so no HIBOR level produces a
            // loss. Reported as 100 — the same "never breaks even" sentinel used below.
            breakEvenHibor = 100;
        } else if (interestBasis === 'hibor') {
            breakEvenHibor = breakEvenRate - spread;
        } else {
            // On COF the loan reprices by the HIBOR delta, not by HIBOR itself:
            // rate = cofRate + (H - hibor) + spread.
            breakEvenHibor = breakEvenRate - spread - cofRate + hibor;
        }
    } else {
        breakEvenHibor = 100;
    }

    // Sensitivity Heatmap
    const xLabels = [1, 2, 3, 4, 5, 6];
    const yLabels = [3, 4, 5, 6, 7];
    const heatMapRows: number[][] = [];

    for (const yieldVal of yLabels) {
        const row: number[] = [];
        for (const hiborVal of xLabels) {
            // Price each column off the facility's own basis. Always using hiborVal
            // understated interest on a COF facility by the COF-to-HIBOR gap.
            const columnBase = interestBasis === 'hibor'
                ? hiborVal
                : Math.max(0, cofRate + (hiborVal - hibor));
            const rate = Math.min(columnBase + spread, capRate);
            const yr = sensitivityYear;

            const surr = totalPremium * (factors[yr] || 0);
            const bondVal = stressedBondPrincipal + (stressedBondPrincipal * (yieldVal / 100) * yr);
            const interest = bankLoan * (rate / 100) * yr;

            let result = (surr + bondVal + cashReserve) - bankLoan - interest;

            if (fundSource === 'mortgage') {
                const mtgBal = baselineData[yr]?.mortgageBalance || 0;
                result = result - mtgBal;
            }

            const profit = result - yr0NetEquity;
            row.push(profit);
        }
        heatMapRows.push(row);
    }

    return {
        stressedProjection: data,
        stressStats: {
            breakEvenHibor,
            lowestEquity
        },
        sensitivityData: {
            xLabels,
            yLabels,
            data: heatMapRows
        }
    };
};
