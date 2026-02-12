
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
        guaranteed[k] = factors[k] * (0.85 - (k * 0.005));
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


// Core Calculation Logic
export const calculateProjection = (input: SimulationInput): SimulationOutput => {
    const {
        budget, cashReserve, bondAlloc, bondYield, hibor, cofRate, interestBasis, spread,
        leverageLTV, capRate, handlingFee, fundSource, unlockedCash,
        effectiveMortgageRate, monthlyMortgagePmt, mortgageTenor
    } = input;

    const equity = budget - cashReserve - bondAlloc;
    const ltvDecimal = leverageLTV / 100.0;

    // Use the base factors directly
    const currentFactors = BASE_FACTORS;
    const initialCSVFactor = currentFactors[0] || 0;

    let tPremium = 0;
    const denominator = 1 - (ltvDecimal * initialCSVFactor);
    if (denominator > 0 && equity > 0) {
        tPremium = equity / denominator;
    }

    const loan = Math.max(0, tPremium - equity);

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
                const principalPart = annualPmt - interestPart;

                cumInterest += interestPart;
                balance -= principalPart;
                if (balance < 0) balance = 0;
                mortgageSchedule.push({ balance: balance, annualPmt: annualPmt, cumInterest: cumInterest, annualInterest: interestPart });
            } else {
                mortgageSchedule.push({ balance: 0, annualPmt: 0, cumInterest: cumInterest, annualInterest: 0 });
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
        const denom = fundSource === 'mortgage' ? budget : prev.netEquity;
        if (denom !== 0) {
            annualRoC = (annualNetGain / denom) * 100;
        }

        const cumulativePolicyGrowth = surrenderValue - yr0Surrender;

        const cumulativeNetGain = netEquity - yr0NetEquity - (fundSource === 'mortgage' ? runningCumMtgCost : 0);

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
    const roiVal = (totalGain / budget) * 100;

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
    const {
        projectionData, simulatedHibor, bondPriceDrop, showGuaranteed,
        totalPremium, netBondPrincipal, bondYield, bankLoan, spread, capRate,
        budget, cashReserve, sensitivityYear, fundSource, unlockedCash
    } = input;

    const factors = showGuaranteed ? GUARANTEED_FACTORS : BASE_FACTORS;

    // 1. Bond Shock
    const stressedBondPrincipal = netBondPrincipal * (1 - bondPriceDrop / 100);

    // 2. Simulated HIBOR Rate
    const stressedRate = Math.min(simulatedHibor + spread, capRate);

    const data: ProjectionData[] = [];
    const baselineData = projectionData;

    // Year 0
    const yr0Factor = factors[0] || 0;
    const yr0Surrender = totalPremium * yr0Factor;
    const yr0Assets = yr0Surrender + stressedBondPrincipal + cashReserve;
    const yr0Liabilities = bankLoan;
    const yr0MortgageBal = fundSource === 'mortgage' ? unlockedCash : 0;
    const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;

    data.push({
        year: 0,
        netEquity: yr0NetEquity,
        baselineNetEquity: baselineData?.[0]?.netEquity || 0,
        ltv: (yr0Liabilities / (yr0Surrender + stressedBondPrincipal)) * 100
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

        const collateralValue = surrenderValue + bondFundNetValue;
        const ltv = collateralValue > 0 ? (currentLiabilities / collateralValue) * 100 : 0;

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
    const policyGrowthY1 = (totalPremium * (factors[1] || 0)) - (totalPremium * (factors[0] || 0));
    const annualBondIncome = stressedBondPrincipal * (bondYield / 100);
    const totalAnnualIncome = annualBondIncome + policyGrowthY1;
    const annualMtgPmt = fundSource === 'mortgage' ? baselineData[1]?.annualMortgagePayment || 0 : 0;

    let breakEvenHibor = 0;
    if (bankLoan > 0) {
        breakEvenHibor = (((totalAnnualIncome - annualMtgPmt) / bankLoan) * 100) - spread;
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
            const rate = Math.min(hiborVal + spread, capRate);
            const yr = sensitivityYear;

            const surr = totalPremium * (factors[yr] || 0);
            const bondVal = stressedBondPrincipal + (stressedBondPrincipal * (yieldVal / 100) * yr);
            const interest = bankLoan * (rate / 100) * yr;

            let result = (surr + bondVal + cashReserve) - bankLoan - interest;

            if (fundSource === 'mortgage') {
                const mtgBal = baselineData[yr]?.mortgageBalance || 0;
                result = result - mtgBal;
            }

            const profit = result - (fundSource === 'mortgage' ? 0 : budget);
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
