// Ground truth for the two source workbooks the app re-implements:
//   ~/Downloads/Premium financing cash .xlsx
//   ~/Downloads/Premium financing 樓按.xlsx
//
// Every number below was read out of the workbook itself (cell reference given), not
// recomputed here — a fixture that re-derives its own expectations proves nothing. The
// workbooks compute in USD and present in HKD via `Data Entry`!F3/F16 = 7.8; the app is
// single-currency HKD, so expectations are the workbook's HKD (G) column.
//
// `input` is the TARGET engine shape — it names fields that do not exist yet (properties,
// topUp*, rebate*, fxRate). That is deliberate: the fixture encodes the destination, and
// each phase moves another field from unsupported to honoured. See parity.test.ts.

export type WorkbookProperty = {
    value: number;
    ltv: number;
    existingMortgage: number;
    tenor: number;
    rate: number;
};

export type WorkbookInput = {
    budget: number;
    cashReserve: number;
    extraCash: number;
    bondAlloc: number;
    bondYield: number;
    handlingFee: number;
    hibor: number;
    cofRate: number;
    interestBasis: 'hibor' | 'cof';
    spread: number;
    leverageLTV: number;
    // The workbooks apply no cap; 100 is the app's no-op value for a field it requires.
    capRate: number;
    fundSource: 'cash' | 'mortgage';
    bondCollateralLTV: number;
    bondLoanSpread: number;
    // Phase 1+
    properties: WorkbookProperty[];
    // Phase 3+
    topUpMode: 'off' | 'annual' | 'every5' | 'serviceOnly';
    minTopUpAmount: number;
    // Phase 4+
    fxRate: number;
    /** 'Data Entry'!A47:C51 — col A is an INCLUSIVE lower bound, col C the rate. The
     *  sheet's col B upper bound is decorative: no formula references it, because
     *  VLOOKUP's approximate match only ever reads col A. */
    policyRebateBands: Array<{ minPremiumUsd: number; rate: number }>;
    // These three are typed into both sheets and then referenced by NO formula in any
    // sheet of either workbook — verified by an exhaustive cross-sheet reference scan.
    // They are real money in the real transaction, so the engine honours them; parity is
    // unaffected because both books carry them at zero (or, for the asset-loan fee, with
    // a zero base — 基金抵押 is "No" in both, so bondLoan is 0).
    bankCashRebate: number;
    fundFeeRebate: number;
    assetLoanHandlingFee: number;
};

export type Workbook = {
    label: string;
    input: WorkbookInput;
    expected: {
        totalPremium: number;
        bankLoan: number;
        effectiveRate: number;
        /** HKD cumulative net gain, by policy year. */
        gainByYear: Record<number, number>;
        /** Percent, workbook's 「佔客戶資本」 row. */
        roiByYear: Record<number, number>;
        /** Per-year component checks, where the workbook exposes them. */
        components?: Record<number, Partial<{
            surrenderValue: number;
            mortgageBalance: number;
            cumulativeMortgageCost: number;
            policyRebate: number;
        }>>;
    };
};

// `Data Entry `: budget B6, fund B9 @ 1% B10, yield B21, ORIX B40 = HIBOR 2.6 + 1.75,
// leverage F9 = 0.9. No reserve, no bond collateral, no policy top-up (J4/J5 = No).
export const CASH_WORKBOOK: Workbook = {
    label: 'Premium financing cash .xlsx',
    input: {
        budget: 2_500_000,
        cashReserve: 0,
        extraCash: 0,
        bondAlloc: 800_000,
        bondYield: 7,
        handlingFee: 1,
        hibor: 2.6,
        cofRate: 0,
        interestBasis: 'hibor',
        spread: 1.75,
        leverageLTV: 90,
        capRate: 100,
        fundSource: 'cash',
        bondCollateralLTV: 0,
        bondLoanSpread: 0,
        properties: [],
        topUpMode: 'off',
        minTopUpAmount: 50_000,
        fxRate: 7.8,
        // 'Data Entry '!A32:C36. Every rate in the cash book's table is 0 — this book
        // runs no rebate promotion — which is why its return needs no rebate term.
        policyRebateBands: [
            { minPremiumUsd: 0, rate: 0 },
            { minPremiumUsd: 300_000, rate: 0 },
            { minPremiumUsd: 600_000, rate: 0 },
            { minPremiumUsd: 1_000_000, rate: 0 },
        ],
        bankCashRebate: 0,
        fundFeeRebate: 0,
        assetLoanHandlingFee: 0,
    },
    expected: {
        totalPremium: 6_071_428.571,   // 'Concept Cash'!D51
        bankLoan: 4_371_428.571,       // 'Data Entry '!B17
        effectiveRate: 4.35,           // 'Data Entry '!B28
        gainByYear: {
            // 'Investment Holdings Return'!P6 x 7.8
            0: -1_222_285.71,
            10: 999_838.57,            // 'Expect Return Page 1'!G16
            15: 2_507_592.68,          // 'Expect Return Page 1'!G34
            20: 4_868_261.68,          // 'Expect Return Page 2'!G16
            30: 11_870_960.21,         // 'Expect Return Page 2'!G34
        },
        roiByYear: {
            10: 39.99354286,           // 'Expect Return Page 1'!E17
            15: 100.3037071,           // 'Expect Return Page 1'!E35
            20: 194.7304671,           // 'Expect Return Page 2'!E17
            30: 474.8384086,           // 'Expect Return Page 2'!E35
        },
    },
};

// `Data Entry`: one property B3-B9 (5.1M @ 80%, existing 1.9M, 25y @ 2.5%); budget B19 is
// the cash-out itself; reserve B27 1M; fund B22 @ 1.5%; yield B34; Wing Lung B55 = 0.26 +
// 2.05; rebate band E31 = 1%; top-up I5 = 每年盡按, min draw F20 = 50,000.
//
// Note the mortgage amortises the GROSS bank loan B7 = 5.1M x 80% = 4,080,000, not the
// 2,180,000 released — 'Mortgage Table A'!C3 = 'Data Entry'!B7.
export const MORTGAGE_WORKBOOK: Workbook = {
    label: 'Premium financing 樓按.xlsx',
    input: {
        budget: 2_180_000,
        cashReserve: 1_000_000,
        extraCash: 0,
        bondAlloc: 500_000,
        bondYield: 6,
        handlingFee: 1.5,
        hibor: 0.26,
        cofRate: 0,
        interestBasis: 'hibor',
        spread: 2.05,
        leverageLTV: 90,
        capRate: 100,
        fundSource: 'mortgage',
        bondCollateralLTV: 0,
        bondLoanSpread: 0,
        properties: [
            { value: 5_100_000, ltv: 80, existingMortgage: 1_900_000, tenor: 25, rate: 2.5 },
        ],
        topUpMode: 'annual',
        minTopUpAmount: 50_000,
        fxRate: 7.8,
        // 'Data Entry'!A47:C51 — the 「Promotion」 table. E30 = 311,355.31 USD selects
        // the 300k band at 1%, giving B31 = 24,285.71 HKD.
        policyRebateBands: [
            { minPremiumUsd: 1, rate: 0 },
            { minPremiumUsd: 300_000, rate: 0.01 },
            { minPremiumUsd: 600_000, rate: 0.02 },
            { minPremiumUsd: 1_000_000, rate: 0.04 },
            { minPremiumUsd: 2_000_000, rate: 0.05 },
        ],
        bankCashRebate: 0,
        fundFeeRebate: 0,
        // 'Data Entry'!B38, Wing Lung's 基金貸手續費. Dead in the sheet; harmless here
        // because 基金抵押 is "No", so there is no asset loan to charge it against.
        assetLoanHandlingFee: 0.25,
    },
    expected: {
        totalPremium: 2_428_571.43,    // 'Data Entry'!E30 x 7.8
        bankLoan: 1_748_571.429,       // 'Data Entry'!B30
        effectiveRate: 2.31,           // 'Data Entry'!B41
        gainByYear: {
            5: -2_402_764.20,          // 'Expected Return Page 1'!G18
            10: -2_010_186.66,         // 'Expected Return Page 1'!G38
            15: -1_657_828.24,         // 'Expected Return Page 2'!G18
            16: -1_542_898.20,         // 'Expected Return Page 2'!G38
        },
        roiByYear: {
            5: -110.2185411,           // 'Expected Return Page 1'!E19
            10: -92.21039701,          // 'Expected Return Page 1'!E39
            15: -76.04716683,          // 'Expected Return Page 2'!E19
            16: -70.77514657,          // 'Expected Return Page 2'!E39
        },
        components: {
            5: {
                surrenderValue: 2_444_589.557,        // 'Expected Return Page 1'!G4
                mortgageBalance: 3_454_135.275,       // G8, 'Mortgage Overall'!G7
                cumulativeMortgageCost: 1_098_213.765, // G15, 'Mortgage Overall'!O7
                policyRebate: 24_285.71429,           // 'Data Entry'!B31
            },
        },
    },
};

export const WORKBOOKS = [CASH_WORKBOOK, MORTGAGE_WORKBOOK];
