
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
    roi: number;
    averageReturn: number;
    irr: number | null;
    // Bond-fund collateral loan. Kept separate from `loan`/`cumulativeInterest` because
    // the two facilities are secured by different collateral: the policy loan against the
    // policy's cash surrender value, this one against the bond fund. Blended into one
    // number, a bond crash barely moves the ratio and the margin call it triggers is
    // invisible. Zero unless bondCollateralLTV is set.
    bondLoan: number;
    cumulativeBondLoanInterest: number;
    topUpUnits?: number;
    cumulativeTopUp?: number;
    cumulativeTopUpInterest?: number;
    topUpServicing?: number;
    topUpToClient?: number;
    // Stress test fields
    baselineNetEquity?: number;
    ltv?: number;
    bondLtv?: number;
}

export type MortgageProperty = {
    value: number;
    ltv: number;
    existingMortgage: number;
    tenor: number;
    rate: number;
};

export type MortgageYear = {
    balance: number;
    cumulativePayments: number;
    cumulativeInterest: number;
    annualPayment: number;
};

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
    properties?: MortgageProperty[];
    extraCash?: number;
    // Second leverage layer: pledge the bond fund as collateral and borrow against it to
    // top up the policy down payment. Optional and 0 by default, so every existing caller
    // and the golden projection snapshot keep their current numbers.
    bondCollateralLTV?: number;
    bondLoanSpread?: number;
    topUpMode?: 'off' | 'annual' | 'every5' | 'serviceOnly';
    minTopUpAmount?: number;
    topUpRate?: number;
    fxRate?: number;
    /** Ascending-sorted rebate bands. `minPremiumUsd` is an INCLUSIVE lower bound; the
     * applicable band is the last one whose bound is <= the USD premium. `rate` is a
     * DECIMAL (0.01 = 1%). Default [] — no bands means no rebate, which keeps every
     * existing caller unchanged.
     */
    policyRebateBands?: Array<{ minPremiumUsd: number; rate: number }>;
    bankCashRebate?: number;
    fundFeeRebate?: number;
    assetLoanHandlingFee?: number;
    minPremiumUsd?: number;
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
    bondLoan: number;
    bondLoanRate: number;
    monthlyBondLoanInterest: number;
    mortgageCashOut: number;
    ownCapital: number;
    deployedCapital: number;
    policyRebate: number;
    policyRebateRate: number;
    bankCashRebate: number;
    fundFeeRebate: number;
    assetLoanFee: number;
    belowMinPremium: boolean;
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
    // The bond-collateral facility, if drawn. It reprices off the same shocked base as the
    // policy loan, and the bond price drop hits the very collateral securing it — which is
    // the margin call this layer exists to expose. Optional and 0 by default.
    bondLoan?: number;
    bondLoanSpread?: number;
    // The client's injected cash, mirrored from SimulationInput. The projection clamps
    // cashReserve against budget + extraCash; the stress side must clamp against the
    // SAME total, or a reserve above the borrowed portion is silently clipped here and
    // a zero-shock stress run diverges from the baseline by the clipped amount.
    // Optional and 0 by default.
    extraCash?: number;
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

/** Excel VLOOKUP(x, table, col) with range_lookup omitted (approximate match):
 *  the last band whose minPremiumUsd <= premiumUsd wins. Returns 0 when the
 *  premium falls below every band, where Excel returns #N/A — a deliberate
 *  divergence, since an advisor quote must not render an error string as a number.
 */
export const lookupRebateRate = (
    premiumUsd: number,
    bands: Array<{ minPremiumUsd: number; rate: number }> | undefined,
): number => {
    if (!Number.isFinite(premiumUsd) || !bands?.length) return 0;

    const validBands = bands
        .map((band, index) => ({ band, index }))
        .filter(({ band }) => Number.isFinite(band?.minPremiumUsd) && Number.isFinite(band?.rate))
        .sort((left, right) =>
            left.band.minPremiumUsd - right.band.minPremiumUsd || left.index - right.index);

    let rate = 0;
    for (const { band } of validBands) {
        if (band.minPremiumUsd > premiumUsd) break;
        rate = band.rate;
    }
    // A rebate is a credit the insurer pays the client — this product has no concept of
    // a negative one; a fee/clawback already has its own dedicated field
    // (assetLoanHandlingFee), which is subtracted separately. A negative band rate here
    // is therefore a data-entry mistake, not a legitimate tier, so it is clamped rather
    // than passed through — otherwise it renders as a negative "rebate" on a client PDF.
    return Number.isFinite(rate) ? Math.max(0, rate) : 0;
};

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

/** Excel-XIRR-style root of the NPV function over annual periods (integer t, no dates).
 * Returns the rate as a decimal, or null when the cash flows are degenerate or no
 * finite root can be found in the displayable range.
 */
export const calculateIRR = (cashFlows: number[]): number | null => {
    if (!Array.isArray(cashFlows) || cashFlows.length < 2
        || cashFlows.some(flow => !Number.isFinite(flow))) return null;

    const hasPositive = cashFlows.some(flow => flow > 0);
    const hasNegative = cashFlows.some(flow => flow < 0);
    if (!hasPositive || !hasNegative) return null;

    const MIN_RATE = -0.9999;
    const MAX_RATE = 1000;
    const MAX_NEWTON_ITERATIONS = 50;
    const MAX_BISECTION_ITERATIONS = 200;
    const NPV_TOLERANCE = 1e-7;
    const STEP_TOLERANCE = 1e-10;

    const evaluate = (rate: number): { value: number; derivative: number | null } | null => {
        const base = 1 + rate;
        if (!Number.isFinite(base) || base <= 0) return null;

        let value = 0;
        let derivative = 0;
        let derivativeFinite = true;
        for (let t = 0; t < cashFlows.length; t++) {
            const flow = cashFlows[t];
            if (flow === 0) continue;

            const denominator = Math.pow(base, t);
            const term = denominator === 0 ? null : flow / denominator;
            if (term === null || !Number.isFinite(term)) return null;

            value += term;
            if (!Number.isFinite(value)) return null;

            if (t > 0 && derivativeFinite) {
                const derivativeTerm = -t * term / base;
                if (Number.isFinite(derivativeTerm)) {
                    derivative += derivativeTerm;
                    if (!Number.isFinite(derivative)) derivativeFinite = false;
                } else {
                    derivativeFinite = false;
                }
            }
        }

        return { value, derivative: derivativeFinite ? derivative : null };
    };

    const usableRate = (rate: number): number | null => {
        if (!Number.isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) return null;
        if (Math.abs(rate) < STEP_TOLERANCE) return 0;
        return Math.max(MIN_RATE, Math.min(MAX_RATE, rate));
    };

    const newtonStart = 0.1;
    let rate = newtonStart;
    for (let iteration = 0; iteration < MAX_NEWTON_ITERATIONS; iteration++) {
        const current = evaluate(rate);
        if (!current) break;
        if (Math.abs(current.value) < NPV_TOLERANCE) return usableRate(rate);
        if (current.derivative === null || current.derivative === 0) break;

        const step = current.value / current.derivative;
        const nextRate = rate - step;
        if (!Number.isFinite(step) || !Number.isFinite(nextRate) || nextRate <= -1
            || nextRate < MIN_RATE || nextRate > MAX_RATE) break;

        const next = evaluate(nextRate);
        if (!next) break;
        if (Math.abs(next.value) < NPV_TOLERANCE) return usableRate(nextRate);
        if (Math.abs(step) < STEP_TOLERANCE) break;
        rate = nextRate;
    }

    const lower = evaluate(MIN_RATE);
    const upper = evaluate(MAX_RATE);
    if (!lower || !upper) return null;
    if (Math.abs(lower.value) < NPV_TOLERANCE) return MIN_RATE;
    if (Math.abs(upper.value) < NPV_TOLERANCE) return MAX_RATE;
    if (Math.sign(lower.value) === Math.sign(upper.value)) return null;

    let left = MIN_RATE;
    let right = MAX_RATE;
    let leftValue = lower.value;
    for (let iteration = 0; iteration < MAX_BISECTION_ITERATIONS; iteration++) {
        const middle = left + (right - left) / 2;
        const evaluated = evaluate(middle);
        if (!evaluated) return null;
        if (Math.abs(evaluated.value) < NPV_TOLERANCE
            || Math.abs(right - left) < STEP_TOLERANCE) return usableRate(middle);

        if (Math.sign(evaluated.value) === Math.sign(leftValue)) {
            left = middle;
            leftValue = evaluated.value;
        } else {
            right = middle;
        }
    }

    return null;
};

const zeroMortgageYear = (): MortgageYear => ({
    balance: 0,
    cumulativePayments: 0,
    cumulativeInterest: 0,
    annualPayment: 0,
});

export const deriveMortgageSchedule = (properties?: MortgageProperty[]): MortgageYear[] => {
    const schedule = Array.from({ length: 31 }, zeroMortgageYear);

    for (const property of (properties ?? []).slice(0, 8)) {
        const value = sanitize(property?.value, 0, MAX_MONEY);
        const ltv = sanitize(property?.ltv, 0, 100);
        const tenor = sanitize(property?.tenor, 0, 50);
        const rate = sanitize(property?.rate, 0, 100);
        const gross = value * (ltv / 100);
        const pmt = calculatePMT(rate, tenor, gross);
        let balance = gross;
        let cumulativePayments = 0;
        let cumulativeInterest = 0;
        let annualPayment = 0;

        schedule[0].balance += balance;
        for (let month = 1; month <= 360; month++) {
            let payment = 0;
            let interest = 0;
            if (month <= tenor * 12) {
                interest = balance * rate / 1200;
                const principal = Math.max(0, Math.min(balance, pmt - interest));
                payment = principal + interest;
                balance -= principal;
                if (balance < 1e-9) balance = 0;
            }

            cumulativePayments += payment;
            cumulativeInterest += interest;
            annualPayment += payment;
            if (month % 12 === 0) {
                const year = month / 12;
                schedule[year].balance += balance;
                schedule[year].cumulativePayments += cumulativePayments;
                schedule[year].cumulativeInterest += cumulativeInterest;
                schedule[year].annualPayment += annualPayment;
                annualPayment = 0;
            }
        }
    }

    return schedule;
};

export const deriveMortgageCashOut = (properties?: MortgageProperty[]): number =>
    (properties ?? []).slice(0, 8).reduce((total, property) => {
        const value = sanitize(property?.value, 0, MAX_MONEY);
        const ltv = sanitize(property?.ltv, 0, 100);
        const existingMortgage = sanitize(property?.existingMortgage, 0, MAX_MONEY);
        const gross = value * (ltv / 100);
        // Signed, matching 'Data Entry'!B6 = B3*B4-B5, which carries no MAX. A property
        // whose existing mortgage exceeds the new facility is a refinance DOWN: it
        // releases nothing and consumes cash to complete, so it must reduce the pooled
        // cash-out ('Data Entry'!F6 = SUM(B6:E6)).
        //
        // Clamping each property at 0 instead looks safer and is not: the balance still
        // carries the full `gross`, so the client would be charged a debt against a
        // property recorded as having released no money — a loss of exactly `gross`
        // conjured out of the floor. The aggregate is allowed to go negative; `budget`
        // is sanitized downstream, where a non-viable structure collapses to a zero
        // premium rather than being silently papered over here.
        return total + (gross - existingMortgage);
    }, 0);

export type TopUpYear = {
    units: number;
    cumulativeTopUp: number;
    annualInterest: number;
    cumulativeInterest: number;
    servicing: number;
    toClient: number;
};

const zeroTopUpYear = (): TopUpYear => ({
    units: 0,
    cumulativeTopUp: 0,
    annualInterest: 0,
    cumulativeInterest: 0,
    servicing: 0,
    toClient: 0,
});

const finiteAt = (values: number[], index: number) => {
    const value = values[index];
    return Number.isFinite(value) ? value : 0;
};

/** Top-up rate as a DECIMAL. An explicit override wins; otherwise the plan's own
 *  effective financing rate (a percent) converted to a decimal. */
export const resolveTopUpRate = (explicit: number | undefined, effRatePercent: number): number => {
    if (Number.isFinite(explicit) && (explicit as number) >= 0) return explicit as number;
    return Number.isFinite(effRatePercent) && effRatePercent > 0 ? effRatePercent / 100 : 0;
};

export const deriveTopUpSchedule = (args: {
    surrenderByYear: number[];
    cumMortgagePayments: number[];
    cumPolicyLoanInterest: number[];
    cumBondInterest: number[];
    cashReserve: number;
    mode: 'off' | 'annual' | 'every5' | 'serviceOnly';
    minTopUpHkd: number;
    rate: number;
}): TopUpYear[] => {
    const schedule = Array.from({ length: 31 }, zeroTopUpYear);
    if (!Number.isFinite(args.minTopUpHkd) || args.minTopUpHkd <= 0 || args.mode === 'off') return schedule;

    // Releasable cash is 90% of the policy's APPRECIATION since year 1 — an advance
    // rate against growth, NOT the initial leverage LTV against the whole surrender
    // value. Both are 90% at the banks in the workbook's table, which is precisely how
    // the two get conflated: do not wire this to `leverageLTV`. Dividing the
    // appreciation by (minTopUp / 0.9) is the same statement as taking 90% of the
    // appreciation and dividing by minTopUp.
    const TOP_UP_ADVANCE_RATE = 0.9;
    const collateralPerUnit = args.minTopUpHkd / TOP_UP_ADVANCE_RATE;
    // ROUNDUP matches the workbook's hand-typed 55556 (= 50000/0.9 rounded up).
    const divisor = Math.ceil(collateralPerUnit);
    const rate = Number.isFinite(args.rate) && args.rate >= 0 ? args.rate : 0;
    if (!Number.isFinite(divisor) || divisor <= 0) return schedule;

    const baselineSurrender = finiteAt(args.surrenderByYear, 1);
    let cumulativeInterest = 0;
    for (let year = 5; year <= 30; year++) {
        const surrender = finiteAt(args.surrenderByYear, year);
        const capacity = Math.max(0, (surrender - baselineSurrender) / divisor);
        let units = 0;
        if (args.mode === 'serviceOnly') {
            const mortgage = finiteAt(args.cumMortgagePayments, year);
            const policyInterest = finiteAt(args.cumPolicyLoanInterest, year);
            const need = Math.max(0, mortgage + policyInterest);
            // Unrounded here, unlike `divisor` above — the workbook's U column uses
            // -F20/0.9 directly while W uses the rounded literal. Kept apart on purpose.
            units = Math.max(0, Math.ceil(need * 1.1 / collateralPerUnit));
        } else if (args.mode === 'annual' || (args.mode === 'every5' && year % 5 === 0)) {
            units = Math.max(0, Math.floor(capacity));
        } else if (args.mode === 'every5') {
            units = schedule[year - 1].units;
        }

        const cumulativeTopUp = args.minTopUpHkd * units;
        const annualInterest = cumulativeTopUp * rate;
        const safeTopUp = Number.isFinite(cumulativeTopUp) ? cumulativeTopUp : 0;
        const safeAnnualInterest = Number.isFinite(annualInterest) ? annualInterest : 0;
        cumulativeInterest += safeAnnualInterest;
        if (!Number.isFinite(cumulativeInterest)) cumulativeInterest = 0;
        const netOutgo = finiteAt([args.cashReserve], 0)
            + finiteAt(args.cumBondInterest, year)
            - cumulativeInterest
            - finiteAt(args.cumPolicyLoanInterest, year)
            - finiteAt(args.cumMortgagePayments, year);
        const servicing = safeTopUp > 0 && netOutgo < 0 ? -netOutgo : 0;

        schedule[year] = {
            units,
            cumulativeTopUp: safeTopUp,
            annualInterest: safeAnnualInterest,
            cumulativeInterest,
            servicing: Number.isFinite(servicing) ? servicing : 0,
            toClient: Number.isFinite(safeTopUp - servicing) ? safeTopUp - servicing : 0,
        };
    }
    return schedule;
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
    // The client's own cash injected on top of `budget`. Under mortgage funding `budget`
    // is the mortgage cash-out (borrowed) and this is the only money that is actually
    // theirs, which is what makes the two separate fields rather than one total.
    const extraCash = sanitize(input.extraCash ?? 0, 0, MAX_MONEY);
    // Every clamp below is against the capital on hand, which is both sources — not
    // `budget` alone. Clamping to `budget` capped the reserve and the bond sleeve at the
    // borrowed portion, so injected cash could not fund either.
    const totalCapital = budget + extraCash;
    const cashReserve = sanitize(input.cashReserve, 0, totalCapital);
    // Bonds can only be bought with money the capital actually contains. Uncapped, an
    // over-allocation counted as a Year-0 asset while funding no policy and drawing no
    // loan, so unfunded money showed up as net equity.
    const bondAlloc = sanitize(input.bondAlloc, 0, Math.max(0, totalCapital - cashReserve));
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
    const bondCollateralLTV = sanitize(input.bondCollateralLTV ?? 0, 0, 100);
    // Defaults to the policy loan's spread only so an unset field is not silently free
    // money; the real facility prices separately and the user enters it.
    const bondLoanSpread = sanitize(input.bondLoanSpread ?? spread, 0, 100);
    const topUpMode = input.topUpMode ?? 'off';
    const fxRate = Number.isFinite(input.fxRate) && (input.fxRate ?? 0) > 0 ? input.fxRate! : 7.8;
    const minTopUpAmountInput = input.minTopUpAmount ?? 50000;
    const minTopUpAmount = Number.isFinite(minTopUpAmountInput) ? Math.max(0, minTopUpAmountInput) : 0;
    const minTopUpHkd = minTopUpAmount * fxRate;
    const bankCashRebate = sanitize(input.bankCashRebate ?? 0, 0, MAX_MONEY);
    const fundFeeRebate = sanitize(input.fundFeeRebate ?? 0, 0, MAX_MONEY);
    const assetLoanHandlingFee = sanitize(input.assetLoanHandlingFee ?? 0, 0, 100);
    const minPremiumUsd = sanitize(input.minPremiumUsd ?? 28000, 0, MAX_MONEY, 28000);

    // Bond Logic: Fee is one-off, deducted from capital. Yield applies to Net Capital.
    // Computed before equity because the pledgeable collateral is what the client
    // actually holds — the fund net of the entry fee, not the gross allocation.
    const oneOffFee = bondAlloc * (handlingFee / 100);
    const netBondAlloc = bondAlloc - oneOffFee;

    // Borrowing against the bond fund raises the down payment the policy is bought with,
    // which is why it is added to equity — but it is debt, so it is also carried into
    // liabilities below. Left out of liabilities it would make borrowing look like it
    // increased net worth.
    const bondLoan = netBondAlloc * (bondCollateralLTV / 100);
    const equity = budget - cashReserve - bondAlloc + bondLoan + extraCash;
    const ltvDecimal = leverageLTV / 100.0;

    // Use the base factors directly
    const currentFactors = BASE_FACTORS;
    const initialCSVFactor = currentFactors[0] || 0;

    let tPremium = 0;
    const denominator = 1 - (ltvDecimal * initialCSVFactor);
    if (denominator > 0 && equity > 0) {
        tPremium = sanitize(equity / denominator, 0, MAX_MONEY);
    }

    // Rounded to cents before the band lookup, because the band edges are knife-edges
    // and the app and the workbook reach the same premium by different division orders:
    // the app computes (equity / 0.2799999999999999) / 7.8, the sheet computes
    // (equity / 7.8) / 0.28. At a premium of exactly USD 1,000,000 those land on
    // opposite sides — 1000000.0000000003 vs 999999.9999999999 — and the sheet drops a
    // band, paying 2% where the table says 4%. Sub-cent precision is not meaningful in a
    // premium, so rounding first makes the choice deterministic and lands both on the
    // band the table intends.
    const premiumUsdRaw = fxRate > 0 ? tPremium / fxRate : 0;
    const premiumUsd = Number.isFinite(premiumUsdRaw)
        ? Math.round(premiumUsdRaw * 100) / 100
        : 0;
    const rawPolicyRebateRate = lookupRebateRate(premiumUsd, input.policyRebateBands);
    // Keep a finite rate-product even if a caller supplies an extreme finite rate.
    const policyRebateRate = Math.max(-MAX_MONEY, Math.min(MAX_MONEY, rawPolicyRebateRate));
    // The rate applies to the HKD premium directly; FX selected the band only.
    const policyRebate = tPremium * policyRebateRate;
    const assetLoanFee = bondLoan * (assetLoanHandlingFee / 100);
    // Advisory only. The premium is not zeroed; the caller decides what to show.
    // Negated `>=` rather than `<` so a non-finite down payment raises the advisory
    // instead of silently clearing it — every NaN comparison is false, and the cheap
    // failure here is one spurious warning, not a quote that hides an ineligible deal.
    // Strict, per the sheet's own `IF(C29 < 28000, ...)`: exactly at the floor is fine.
    const belowMinPremium = !((equity / fxRate) >= minPremiumUsd);
    const flatAdjustment = policyRebate + bankCashRebate + fundFeeRebate - assetLoanFee;

    // The premium equation (loan = tPremium - equity) only holds once a policy is
    // actually funded. With equity <= 0 no policy is purchased (tPremium = 0), so
    // tPremium - equity would report a phantom loan equal to the equity shortfall.
    const loan = tPremium > 0 ? Math.max(0, tPremium - equity) : 0;

    // Effective Rate Logic
    const baseRate = interestBasis === 'hibor' ? hibor : cofRate;
    const effRate = Math.min(baseRate + spread, capRate);
    // Same rate basis as the policy loan (bank practice per user), own spread, own cap.
    const bondLoanRate = Math.min(baseRate + bondLoanSpread, capRate);

    // Monthly Cashflow Calculation (Year 1 Run-rate)
    const mBondIncome = (netBondAlloc * (bondYield / 100)) / 12;
    const mLoanInterest = (loan * (effRate / 100)) / 12;
    const mBondLoanInterest = (bondLoan * (bondLoanRate / 100)) / 12;
    const mMortgageCost = fundSource === 'mortgage' ? monthlyMortgagePmt : 0;
    const mNetCashflow = mBondIncome - mLoanInterest - mBondLoanInterest - mMortgageCost;

    // A supplied property list is the workbook-parity source of truth. The scalar
    // fields remain a compatibility fallback for callers that predate `properties`
    // (the current UI always supplies the list). The fallback amortises monthly,
    // matching deriveMortgageSchedule, but honours the caller's monthlyMortgagePmt
    // rather than re-deriving it — the two paths still differ when that payment is
    // not the PMT of unlockedCash (e.g. a payment summed across gross per-property
    // loans against a cash-out balance net of existing mortgages).
    const hasProperties = input.properties !== undefined;
    let mortgageSchedule: MortgageYear[] | undefined;
    if (fundSource === 'mortgage' && hasProperties) {
        mortgageSchedule = deriveMortgageSchedule(input.properties);
    } else if (fundSource === 'mortgage') {
        mortgageSchedule = Array.from({ length: 31 }, zeroMortgageYear);
        let balance = unlockedCash;
        let cumulativePayments = 0;
        let cumulativeInterest = 0;
        let annualPayment = 0;
        mortgageSchedule[0].balance = balance;
        for (let month = 1; month <= 360; month++) {
            if (month <= mortgageTenor * 12) {
                const interest = balance * effectiveMortgageRate / 1200;
                const principal = Math.max(0, Math.min(balance, monthlyMortgagePmt - interest));
                const payment = principal + interest;
                balance -= principal;
                if (balance < 1e-9) balance = 0;
                cumulativePayments += payment;
                cumulativeInterest += interest;
                annualPayment += payment;
            }
            if (month % 12 === 0) {
                mortgageSchedule[month / 12] = {
                    balance, cumulativePayments, cumulativeInterest, annualPayment,
                };
                annualPayment = 0;
            }
        }
    }
    const mortgageCashOut = fundSource === 'mortgage' && hasProperties
        ? deriveMortgageCashOut(input.properties)
        : 0;

    const surrenderByYear = Array.from({ length: 31 }, (_, year) =>
        tPremium * (currentFactors[year] || currentFactors[30]));
    const topUpSchedule = deriveTopUpSchedule({
        surrenderByYear,
        cumMortgagePayments: mortgageSchedule?.map(row => row.cumulativePayments) ?? Array(31).fill(0),
        cumPolicyLoanInterest: surrenderByYear.map((_, year) => loan * (effRate / 100) * year),
        cumBondInterest: surrenderByYear.map((_, year) => netBondAlloc * (bondYield / 100) * year),
        cashReserve,
        mode: topUpMode,
        minTopUpHkd,
        // Defaults to the plan's own financing rate rather than a frozen literal.
        // 'Data Entry'!B41 is VLOOKUP(bank, ..., 6) = the bank's "Rate (Premium
        // Financing)" column, and for every bank in that table it equals
        // HIBOR + spread — Wing Lung's 0.0231 is exactly 0.0026 + 0.0205. So the
        // top-up borrows at the same rate as the policy loan; hardcoding 0.0231
        // would freeze one bank's terms into every quote, which is the same defect
        // the workbook has in its capacity divisor.
        rate: resolveTopUpRate(input.topUpRate, effRate),
    });

    const data: ProjectionData[] = [];
    const topUpFields = (row: TopUpYear) => topUpMode === 'off' ? {} : {
        topUpUnits: row.units,
        cumulativeTopUp: row.cumulativeTopUp,
        cumulativeTopUpInterest: row.cumulativeInterest,
        topUpServicing: row.servicing,
        topUpToClient: row.toClient,
    };
    const ownCapital = (fundSource === 'mortgage' ? 0 : budget) + extraCash;
    const deployedCapital = totalCapital;
    const calculateRowRoi = (cumulativeNetGain: number): number => {
        const roi = deployedCapital > 0 ? (cumulativeNetGain / deployedCapital) * 100 : 0;
        return Number.isFinite(roi) ? roi : 0;
    };
    // The IRR vector is the client's OWN money. Under cash funding that is a single
    // outlay at t=0 and every mortgage payment below is 0, so this collapses exactly
    // to the original two-point vector. Under mortgage funding the client fronts no
    // day-1 capital but services the mortgage for its tenor — with a two-point vector
    // the initial flow was 0, so the solver saw no sign change and returned null for
    // every year of every mortgage-funded proposal.
    const calculateRowIrr = (
        year: number,
        cumulativeNetGain: number,
        cumulativeMortgagePayments: number,
        mortgagePaymentByYear: readonly number[],
    ): number | null => {
        if (year === 0) return null;
        const cashFlows = Array(year + 1).fill(0);
        cashFlows[0] = -ownCapital;
        for (let y = 1; y <= year; y++) {
            cashFlows[y] = -(mortgagePaymentByYear[y] ?? 0);
        }
        // cumulativeNetGain has ALREADY deducted cumulativeMortgagePayments, so they
        // must be added back into the terminal value — otherwise the per-year stream
        // above charges the mortgage a second time, which surfaces as a plausible but
        // materially understated IRR rather than an obvious failure.
        cashFlows[year] += ownCapital + cumulativeNetGain + cumulativeMortgagePayments;
        const rate = calculateIRR(cashFlows);
        return rate === null ? null : rate * 100;
    };

    // Initialize Year 0
    const yr0Factor = currentFactors[0];
    const yr0Surrender = tPremium * yr0Factor;
    const yr0Assets = yr0Surrender + netBondAlloc + cashReserve;
    const yr0Liabilities = loan + bondLoan;

    const yr0MortgageBal = fundSource === 'mortgage'
        ? (mortgageSchedule?.[0].balance ?? unlockedCash)
        : 0;
    const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;
    const yr0CumulativeNetGain = yr0NetEquity - (fundSource === 'mortgage' ? 0 : budget) - extraCash
        + flatAdjustment;

    data.push({
        year: 0,
        surrenderValue: yr0Surrender,
        bondPrincipal: netBondAlloc,
        cumulativeBondInterest: 0,
        bondFundNetValue: netBondAlloc,
        cashValue: cashReserve,
        totalAssets: yr0Assets,
        loan,
        cumulativeInterest: 0,
        netEquity: yr0NetEquity,
        formattedNetEquity: formatCurrency(yr0NetEquity),
        formattedLoan: formatCurrency(loan),
        annualBondIncome: 0,
        annualLoanInterest: 0,
        annualPolicyGrowth: 0,
        annualNetGain: 0,
        annualRoC: 0,
        cumulativePolicyGrowth: 0,
        // Measured against the capital actually put in (budget = mortgage-sourced +
        // own cash), not against Year-0 net equity. Year 0 is therefore already
        // negative by the bond entry fee plus the day-1 surrender-value haircut —
        // that is a real cost of entry, not a starting point to grow from.
        cumulativeNetGain: yr0CumulativeNetGain,
        mortgageBalance: yr0MortgageBal,
        cumulativeMortgageCost: 0,
        cumulativeMortgageInterest: 0,
        annualMortgagePayment: 0,
        roi: calculateRowRoi(yr0CumulativeNetGain),
        averageReturn: 0,
        irr: null,
        bondLoan,
        cumulativeBondLoanInterest: 0,
        ...topUpFields(topUpSchedule[0]),
    });

    let runningCumMtgCost = 0;
    // Filled from the loop's own annualMtgPmt rather than re-read from mortgageSchedule,
    // so the IRR stream cannot drift from the payments charged to annualNetGain.
    const mtgPaymentByYear: number[] = Array(31).fill(0);

    for (let yr = 1; yr <= 30; yr++) {
        const factor = currentFactors[yr] || currentFactors[30];
        const surrenderValue = tPremium * factor;

        const cumulativeBondInterest = netBondAlloc * (bondYield / 100) * yr;
        const bondFundNetValue = netBondAlloc + cumulativeBondInterest;
        const cumulativeInterest = loan * (effRate / 100) * yr;
        const cumulativeBondLoanInterest = bondLoan * (bondLoanRate / 100) * yr;
        const topUp = topUpSchedule[yr];
        const currentAssets = surrenderValue + bondFundNetValue + cashReserve + topUp.cumulativeTopUp;
        const currentLiabilities = loan + topUp.cumulativeTopUp + bondLoan;

        let netEquity = currentAssets - currentLiabilities - cumulativeInterest
            - cumulativeBondLoanInterest - topUp.cumulativeInterest;

        let mtgBal = 0;
        let annualMtgPmt = 0;
        let cumMtgInt = 0;
        if (fundSource === 'mortgage') {
            mtgBal = mortgageSchedule?.[yr]?.balance ?? 0;
            annualMtgPmt = mortgageSchedule?.[yr]?.annualPayment ?? 0;
            cumMtgInt = mortgageSchedule?.[yr]?.cumulativeInterest ?? 0;
            runningCumMtgCost += annualMtgPmt;
            netEquity -= mtgBal;
        }
        mtgPaymentByYear[yr] = annualMtgPmt;

        const prev = data[yr - 1];
        const annualBondIncome = cumulativeBondInterest - prev.cumulativeBondInterest;
        const annualLoanInterest = cumulativeInterest - prev.cumulativeInterest;
        const annualBondLoanInterest = cumulativeBondLoanInterest - prev.cumulativeBondLoanInterest;
        const annualPolicyGrowth = surrenderValue - prev.surrenderValue;

        // Note: annualMtgPmt is local here, but we are using it for Net Gain calc
        let annualNetGain = (annualBondIncome + annualPolicyGrowth) - annualLoanInterest
            - annualBondLoanInterest - annualMtgPmt - topUp.annualInterest;

        // Same capital base as roi (calculateRowRoi): budget + extraCash. A budget-only
        // denominator overstated the annual return whenever extraCash > 0, and read 0
        // when the position was funded entirely by extraCash.
        let annualRoC = 0;
        if (deployedCapital > 0) {
            annualRoC = (annualNetGain / deployedCapital) * 100;
        }

        const cumulativePolicyGrowth = surrenderValue - yr0Surrender;

        // Principal deducted, not netted out against a marked-down Year-0 baseline.
        // Using yr0NetEquity here credited the recovery of the day-1 surrender-value
        // haircut as profit, and left ReturnStudio's waterfall unable to reconcile
        // (opening equity = budget, gain measured off a different number).
        const cumulativeMortgagePayments = mortgageSchedule?.[yr]?.cumulativePayments
            ?? runningCumMtgCost;
        const cumulativeNetGain = netEquity
            - (fundSource === 'mortgage' ? 0 : budget)
            - extraCash
            - cumulativeMortgagePayments
            + flatAdjustment;
        const roi = calculateRowRoi(cumulativeNetGain);

        data.push({
            year: yr,
            surrenderValue,
            bondPrincipal: netBondAlloc,
            cumulativeBondInterest,
            bondFundNetValue,
            cashValue: cashReserve,
            totalAssets: currentAssets,
            loan: loan + topUp.cumulativeTopUp,
            cumulativeInterest,
            netEquity,
            formattedNetEquity: formatCurrency(netEquity),
            formattedLoan: formatCurrency(loan + topUp.cumulativeTopUp),
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
            annualMortgagePayment: annualMtgPmt,
            roi,
            averageReturn: roi / yr,
            irr: calculateRowIrr(yr, cumulativeNetGain, cumulativeMortgagePayments, mtgPaymentByYear),
            bondLoan,
            cumulativeBondLoanInterest,
            ...topUpFields(topUp)
        });
    }

    const final = data[30].netEquity;
    const totalGain = data[30].cumulativeNetGain;
    const roiVal = deployedCapital > 0 ? (totalGain / deployedCapital) * 100 : 0;

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
        monthlyMortgagePmt: mMortgageCost,
        bondLoan,
        bondLoanRate,
        monthlyBondLoanInterest: mBondLoanInterest,
        mortgageCashOut,
        ownCapital,
        deployedCapital,
        policyRebate,
        policyRebateRate,
        bankCashRebate,
        fundFeeRebate,
        assetLoanFee,
        belowMinPremium,
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
    const extraCash = sanitize(input.extraCash ?? 0, 0, MAX_MONEY);
    // Same clamp as calculateProjection's: the reserve can be funded from either source.
    const cashReserve = sanitize(input.cashReserve, 0, budget + extraCash);
    const sensitivityYear = sanitize(input.sensitivityYear, 1, 30, 20);
    const fundSource = input.fundSource;
    const unlockedCash = sanitize(input.unlockedCash, 0, MAX_MONEY);
    const interestBasis = input.interestBasis;
    const cofRate = sanitize(input.cofRate, 0, 100);
    const hibor = sanitize(input.hibor, 0, 100);
    const bondLoan = sanitize(input.bondLoan ?? 0, 0, MAX_MONEY);
    const bondLoanSpread = sanitize(input.bondLoanSpread ?? spread, 0, 100);

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
    const stressedBondLoanRate = Math.min(stressedBase + bondLoanSpread, capRate);

    // The bond loan's own gearing against the collateral that actually secures it. Folding
    // it into the blended ltv below would hide the margin call: at a 50% advance rate a 10%
    // bond drop takes this ratio 50% -> 55.6% while the blended number barely moves.
    const bondGearing = (collateral: number) => collateral > 0
        ? (bondLoan / collateral) * 100
        : (bondLoan > 0 ? LTV_IMPAIRED : 0);

    const data: ProjectionData[] = [];
    const baselineData = projectionData;

    // Year 0
    const yr0Factor = factors[0] || 0;
    const yr0Surrender = totalPremium * yr0Factor;
    const yr0Assets = yr0Surrender + stressedBondPrincipal + cashReserve;
    const yr0Liabilities = bankLoan + bondLoan;
    // Must match the baseline's own Year-0 balance (mortgageSchedule[0].balance, the GROSS
    // new loan), not unlockedCash (net of the existing mortgage that's being refinanced
    // away) — otherwise a zero-shock stress run diverges from the baseline by exactly the
    // existing-mortgage amount, rendering a phantom Year-0-to-Year-1 equity drop.
    const yr0MortgageBal = fundSource === 'mortgage'
        ? (baselineData?.[0]?.mortgageBalance ?? unlockedCash)
        : 0;
    const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;

    const yr0Collateral = yr0Surrender + stressedBondPrincipal;
    data.push({
        year: 0,
        netEquity: yr0NetEquity,
        baselineNetEquity: baselineData?.[0]?.netEquity || 0,
        ltv: yr0Collateral > 0
            ? (bankLoan / yr0Collateral) * 100
            : (bankLoan > 0 ? LTV_IMPAIRED : 0),
        bondLtv: bondGearing(stressedBondPrincipal)
    } as ProjectionData);

    let lowestEquity = yr0NetEquity;

    for (let yr = 1; yr <= 30; yr++) {
        const factor = factors[yr] || factors[30];
        const surrenderValue = totalPremium * factor;

        const cumulativeBondInterest = stressedBondPrincipal * (bondYield / 100) * yr;
        const bondFundNetValue = stressedBondPrincipal + cumulativeBondInterest;
        const cumulativeInterest = bankLoan * (stressedRate / 100) * yr;
        const cumulativeBondLoanInterest = bondLoan * (stressedBondLoanRate / 100) * yr;

        const currentAssets = surrenderValue + bondFundNetValue + cashReserve;
        const currentLiabilities = bankLoan + bondLoan;

        let netEquity = currentAssets - currentLiabilities - cumulativeInterest - cumulativeBondLoanInterest;

        // The top-up layer's principal cancels between assets and liabilities, so its whole
        // net effect on baseline equity is its cumulative interest. Carried across from the
        // baseline row (unshocked — the stress input has no top-up schedule to reprice);
        // without it a zero-shock stress run reads HIGHER than the baseline by exactly this
        // amount, breaking the comparability contract stated above stressedRate.
        const baselineTopUpInterest = baselineData?.[yr]?.cumulativeTopUpInterest ?? 0;
        netEquity -= Number.isFinite(baselineTopUpInterest) ? baselineTopUpInterest : 0;

        if (fundSource === 'mortgage') {
            const mtgBal = baselineData[yr]?.mortgageBalance || 0;
            netEquity -= mtgBal;
        }

        if (netEquity < lowestEquity) lowestEquity = netEquity;

        // A wiped-out collateral base with a live loan is the margin-call case the chart
        // exists to show; reporting 0% there rendered the worst outcome as the safest.
        const collateralValue = surrenderValue + bondFundNetValue;
        const ltv = collateralValue > 0
            ? (bankLoan / collateralValue) * 100
            : (bankLoan > 0 ? LTV_IMPAIRED : 0);

        data.push({
            year: yr,
            netEquity,
            baselineNetEquity: baselineData[yr]?.netEquity || 0,
            ltv,
            bondLtv: bondGearing(bondFundNetValue),
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

    // The rate base that would make BOTH facilities' interest exactly consume all income.
    // Break-even is then the HIBOR that produces that base on whichever basis the loans
    // price off. The bond-collateral loan must be included: the stressed projection and
    // heatmap charge its interest, so a break-even computed on the policy loan alone
    // overstates the safe HIBOR by the bond facility's share (reproduced: at the reported
    // break-even, outgo exceeded income by exactly the bond loan's interest).
    // Solve piecewise for base b in
    //   bankLoan * min(b + spread, cap) + bondLoan * min(b + bondLoanSpread, cap)
    //     = (income - mortgage) * 100
    // With bondLoan = 0 this reduces exactly to the previous single-facility formula.
    let breakEvenHibor = 0;
    const totalDebt = bankLoan + bondLoan;
    if (totalDebt > 0) {
        const incomeAvailable = totalAnnualIncome - annualMtgPmt;
        const maxAnnualInterest = totalDebt * (capRate / 100);
        let base: number;
        if (incomeAvailable > maxAnnualInterest) {
            // The cap binds before break-even is reachable, so no HIBOR level produces a
            // loss. Reported as 100 — the same "never breaks even" sentinel used below.
            base = Infinity;
        } else if (incomeAvailable === maxAnnualInterest) {
            // Both facilities capped: the earliest base at which interest first reaches
            // the income is where the last drawn facility hits its cap. Undrawn
            // facilities carry no interest and must not pick the spread.
            base = capRate - Math.min(
                bankLoan > 0 ? spread : Infinity,
                bondLoan > 0 ? bondLoanSpread : Infinity);
        } else {
            // Uncapped solution first; if it pushes one facility past its cap, re-solve
            // with that facility's interest frozen at the cap. Both-past-cap is excluded
            // by the incomeAvailable < maxAnnualInterest branch above.
            base = (incomeAvailable * 100 - bankLoan * spread - bondLoan * bondLoanSpread) / totalDebt;
            if (bondLoan > 0 && base + bondLoanSpread > capRate && bankLoan > 0) {
                base = (incomeAvailable * 100 - bondLoan * capRate - bankLoan * spread) / bankLoan;
            } else if (bankLoan > 0 && base + spread > capRate && bondLoan > 0) {
                base = (incomeAvailable * 100 - bankLoan * capRate - bondLoan * bondLoanSpread) / bondLoan;
            }
        }
        if (!Number.isFinite(base)) {
            breakEvenHibor = 100;
        } else if (interestBasis === 'hibor') {
            breakEvenHibor = base;
        } else {
            // On COF the loans reprice by the HIBOR delta, not by HIBOR itself:
            // base = cofRate + (H - hibor).
            breakEvenHibor = base - cofRate + hibor;
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

            // The bond-collateral loan and its interest belong here for the same reason
            // they do in the projection: omitted, the borrowed principal sat in bondVal
            // with no matching liability and read as profit.
            const bondLoanInterest = bondLoan * (Math.min(columnBase + bondLoanSpread, capRate) / 100) * yr;
            // Same top-up carry-across as the stressed projection above, for the same
            // comparability reason: `profit` below nets this cell against the baseline's
            // netEquity, which already includes the top-up interest.
            const topUpInterest = baselineData?.[yr]?.cumulativeTopUpInterest ?? 0;
            let result = (surr + bondVal + cashReserve) - bankLoan - interest - bondLoan - bondLoanInterest
                - (Number.isFinite(topUpInterest) ? topUpInterest : 0);

            if (fundSource === 'mortgage') {
                const mtgBal = baselineData[yr]?.mortgageBalance || 0;
                result = result - mtgBal;
            }

            // Re-express on the baseline's own gain basis rather than re-deriving it here:
            // cumulativeNetGain = netEquity - ownCapitalBasis + adjustments, and neither
            // ownCapitalBasis nor adjustments (rebates, extraCash, mortgage payments) move
            // under a rate/yield shock, so subtracting baseline netEquity and re-adding its
            // cumulativeNetGain recovers exactly "profit net of principal, rebates and
            // ongoing costs" without duplicating that basis logic (and drifting from it).
            const baselineYr = baselineData[yr];
            const profit = result - (baselineYr?.netEquity ?? 0) + (baselineYr?.cumulativeNetGain ?? 0);
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
