// The financial inputs the app opens with.
//
// Extracted out of useAppState so the golden projection snapshot in calculations.test.ts
// can bind to the REAL defaults rather than to a copy of them. That matters concretely:
// the app previously shipped with budget 1,000,000 against bondAlloc 3,000,000, which
// funded no policy at all and opened on a $0 policy value with a multi-million-dollar
// phantom loan. A snapshot built from test-local constants would not have noticed.
// Changing any number here now has to be acknowledged by updating the snapshot.
//
// Invariant worth keeping in mind when editing: cashReserve + bondAlloc must stay below
// budget, or equity (budget - cashReserve - bondAlloc) goes non-positive and no policy
// is funded.
export const DEFAULT_INPUTS = {
    // Core premium-financing inputs
    budget: 4000000,
    extraCash: 0,
    cashReserve: 200000,
    bondAlloc: 3000000,
    bondYield: 5.5,
    hibor: 4.15,
    spread: 1.3,
    capRate: 9.0,
    leverageLTV: 90,
    handlingFee: 1.0,
    interestBasis: 'hibor' as const,
    cofRate: 5.0,
    fundSource: 'cash' as const,

    // Bond-fund collateral loan (second leverage layer). Defaults to 0 = not drawn, which
    // is what keeps the golden projection snapshot bound to the pre-existing numbers.
    // bondLoanSpread mirrors the policy spread only as a placeholder — the real facility
    // prices separately and the user enters it.
    bondCollateralLTV: 0,
    bondLoanSpread: 1.3,

    // Rebates, one-off fees and FX. Every default is the engine's own no-op (empty
    // bands, zero rebates/fees, the engine's 7.8 FX and 28,000 USD floor), so wiring
    // these into simulationInput changes no projected number until the user enters
    // real bank terms — which is what keeps the golden snapshot green.
    fxRate: 7.8,
    policyRebateBands: [] as Array<{ minPremiumUsd: number; rate: number }>,
    bankCashRebate: 0,
    fundFeeRebate: 0,
    assetLoanHandlingFee: 0,
    minPremiumUsd: 28000,

    // Stress test / sensitivity
    simulatedHibor: 4.5,
    bondPriceDrop: 10,
    sensitivityYear: 15,

    // Mortgage refinance path
    propertyValue: 15000000,
    existingMortgage: 6000000,
    mortgageLtv: 70,
    primeRate: 5.5,
    mortgageHSpread: 1.3,
    mortgagePModifier: 1.75,
    mortgageTenor: 30,
};

export const DEFAULT_CLIENT_NAME = 'Estate of Mr. H.N.W.';
