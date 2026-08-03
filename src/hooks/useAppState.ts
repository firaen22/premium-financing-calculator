import { useState, useMemo, useEffect } from 'react';
import {
    calculateProjection, calculateStressTest, calculatePMT,
    deriveMortgageCashOut, deriveEffectiveMortgageRate, MortgageProperty
} from '../utils/calculations';
import { checkAssumptions } from '../utils/advisories';
import { DEFAULT_CLIENT_NAME, DEFAULT_INPUTS } from '../constants/defaults';
import { nextSteps } from '../utils/guide';
import { Language } from '../types';

export type InputPatch = Record<string, number | string | boolean>;

export const useAppState = () => {
    const [activeView, setActiveView] = useState('allocation');
    const [visitedViews, setVisitedViews] = useState<string[]>(['allocation']);
    const [lang, setLang] = useState<Language>('en');

    // Financial State — initial values come from DEFAULT_INPUTS so the golden projection
    // test binds to the same numbers the app opens with. See src/constants/defaults.ts
    // for the budget >= cashReserve + bondAlloc invariant.
    const [budget, setBudget] = useState(DEFAULT_INPUTS.budget);
    const [extraCash, setExtraCash] = useState(DEFAULT_INPUTS.extraCash);
    const [cashReserve, setCashReserve] = useState(DEFAULT_INPUTS.cashReserve);
    const [bondAlloc, setBondAlloc] = useState(DEFAULT_INPUTS.bondAlloc);
    const [bondYield, setBondYield] = useState(DEFAULT_INPUTS.bondYield);
    const [hibor, setHibor] = useState(DEFAULT_INPUTS.hibor);
    const [spread, setSpread] = useState(DEFAULT_INPUTS.spread);
    const [capRate, setCapRate] = useState(DEFAULT_INPUTS.capRate);
    const [leverageLTV, setLeverageLTV] = useState(DEFAULT_INPUTS.leverageLTV);
    const [handlingFee, setHandlingFee] = useState(DEFAULT_INPUTS.handlingFee);
    const [simulatedHibor, setSimulatedHibor] = useState(DEFAULT_INPUTS.simulatedHibor);
    const [bondPriceDrop, setBondPriceDrop] = useState(DEFAULT_INPUTS.bondPriceDrop);
    const [showGuaranteed, setShowGuaranteed] = useState(false);
    const [fundSource, setFundSource] = useState<'cash' | 'mortgage'>(DEFAULT_INPUTS.fundSource);
    // tempBudget/tempCashReserve are the pending edits behind the Apply button, so they
    // must start equal to the live values or the first Apply silently reverts them.
    const [tempBudget, setTempBudget] = useState(DEFAULT_INPUTS.budget);
    const [tempCashReserve, setTempCashReserve] = useState(DEFAULT_INPUTS.cashReserve);
    const [bondCollateralLTV, setBondCollateralLTV] = useState(DEFAULT_INPUTS.bondCollateralLTV);
    const [bondLoanSpread, setBondLoanSpread] = useState(DEFAULT_INPUTS.bondLoanSpread);
    const [interestBasis, setInterestBasis] = useState<'hibor' | 'cof'>(DEFAULT_INPUTS.interestBasis);
    const [cofRate, setCofRate] = useState(DEFAULT_INPUTS.cofRate);
    const [clientName, setClientName] = useState(DEFAULT_CLIENT_NAME);
    const [representativeName, setRepresentativeName] = useState('Private Wealth Advisory Team');

    // Mortgage Refi State
    const [properties, setProperties] = useState<MortgageProperty[]>([{
        value: DEFAULT_INPUTS.propertyValue,
        ltv: DEFAULT_INPUTS.mortgageLtv,
        existingMortgage: DEFAULT_INPUTS.existingMortgage,
        tenor: DEFAULT_INPUTS.mortgageTenor,
        rate: deriveEffectiveMortgageRate(
            DEFAULT_INPUTS.hibor, DEFAULT_INPUTS.mortgageHSpread,
            DEFAULT_INPUTS.primeRate, DEFAULT_INPUTS.mortgagePModifier),
    }]);
    const [primeRate, setPrimeRate] = useState(DEFAULT_INPUTS.primeRate);
    const [mortgageHSpread, setMortgageHSpread] = useState(DEFAULT_INPUTS.mortgageHSpread);
    const [mortgagePModifier, setMortgagePModifier] = useState(DEFAULT_INPUTS.mortgagePModifier);

    // Market Risk & Sensitivity
    const [sensitivityYear, setSensitivityYear] = useState(DEFAULT_INPUTS.sensitivityYear);

    // System Configuration State
    const [globalMinSpread, setGlobalMinSpread] = useState(1.0);
    const [globalMaxLTV, setGlobalMaxLTV] = useState(95);
    const [regulatoryMode, setRegulatoryMode] = useState('hkma');
    const [autoHedging, setAutoHedging] = useState(false);

    // PDF Generation State
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // HIBOR Caching State
    const [lastRateUpdate, setLastRateUpdate] = useState<Date | null>(null);
    const [isFetchingRates, setIsFetchingRates] = useState(false);
    const [dataSource, setDataSource] = useState<'live' | 'cached' | 'fallback' | 'manual'>('live');

    // Chart Filters State
    const [chartFilters, setChartFilters] = useState({
        bondPrincipal: true,
        cashValue: true,
        bondInterest: true,
        policyValue: true,
        loan: true
    });

    const addProperty = () => setProperties(prev => prev.length >= 8 ? prev : [...prev, {
        value: 0,
        ltv: DEFAULT_INPUTS.mortgageLtv,
        existingMortgage: 0,
        tenor: DEFAULT_INPUTS.mortgageTenor,
        rate: effectiveMortgageRate,
    }]);

    const removeProperty = (index: number) => setProperties(prev =>
        prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));

    const updateProperty = (index: number, patch: Partial<MortgageProperty>) =>
        setProperties(prev => prev.map((property, i) => i === index ? { ...property, ...patch } : property));

    const unlockedCash = deriveMortgageCashOut(properties);
    const effectiveMortgageRate = deriveEffectiveMortgageRate(
        hibor, mortgageHSpread, primeRate, mortgagePModifier);

    const monthlyMortgagePmt = properties.reduce((sum, property) => {
        const grossLoan = property.value * (property.ltv / 100);
        return sum + calculatePMT(property.rate, property.tenor, grossLoan);
    }, 0);
    // Vestigial compatibility field: the engine uses properties when present, but this
    // scalar remains required by SimulationInput. Downstream checks therefore see the
    // first property's tenor only.
    const mortgageTenor = properties[0]?.tenor ?? DEFAULT_INPUTS.mortgageTenor;

    // Built once and reused for both the engine and the assumption checker below, so the
    // two never drift out of sync on which fields make up a SimulationInput.
    const simulationInput = useMemo(() => ({
        budget, cashReserve, bondAlloc, bondYield, hibor, cofRate, interestBasis, spread,
        leverageLTV, capRate, handlingFee, fundSource, unlockedCash,
        effectiveMortgageRate, monthlyMortgagePmt, mortgageTenor, properties,
        bondCollateralLTV, bondLoanSpread
    }), [budget, cashReserve, bondAlloc, bondYield, hibor, cofRate, interestBasis, spread, leverageLTV, capRate, handlingFee, fundSource, unlockedCash, effectiveMortgageRate, monthlyMortgagePmt, mortgageTenor, properties, bondCollateralLTV, bondLoanSpread]);

    const projection = useMemo(() => {
        return calculateProjection(simulationInput);
    }, [simulationInput]);

    const stressTest = useMemo(() => {
        return calculateStressTest({
            projectionData: projection.projectionData, simulatedHibor, bondPriceDrop, showGuaranteed,
            totalPremium: projection.totalPremium, netBondPrincipal: projection.netBondPrincipal, bondYield, bankLoan: projection.bankLoan, spread, capRate,
            budget, cashReserve, sensitivityYear, fundSource, unlockedCash, interestBasis, cofRate, hibor,
            bondLoan: projection.bondLoan, bondLoanSpread
        });
    }, [projection, simulatedHibor, bondPriceDrop, showGuaranteed, bondYield, spread, capRate, budget, cashReserve, sensitivityYear, fundSource, unlockedCash, interestBasis, cofRate, hibor, bondLoanSpread]);

    // Deterministic, no-LLM assumption checker (src/utils/advisories.ts). Display-only —
    // does not gate PDF export.
    const advisories = useMemo(
        () => checkAssumptions(simulationInput, projection, stressTest),
        [simulationInput, projection, stressTest]
    );

    useEffect(() => {
        setVisitedViews(prev => prev.includes(activeView) ? prev : [...prev, activeView]);
    }, [activeView]);

    // Applies a chat-assistant patch to the on-screen inputs and returns the previous
    // values of the fields it actually changed, so the caller can offer an undo (which
    // is just applyInputPatch of the returned object). Fields arrive server-validated
    // against INPUT_RANGES/STRESS_RANGES, but each is still type-guarded here because
    // the patch crosses the network. budget/cashReserve also update their temp mirrors,
    // or the Apply button's pending edits would silently revert the change.
    //
    // Deliberately ABSENT, and they must stay absent: hibor, cofRate, spread,
    // bondLoanSpread, capRate, bondYield, handlingFee, leverageLTV, interestBasis. Those
    // are market data or contracted bank terms — an assistant that can rewrite the rate
    // an illustration is priced on can make any strategy look affordable. leverageLTV in
    // particular is fixed by the bank at 90-95%; the client's real lever is bondAlloc and
    // bondCollateralLTV, which are settable. api/chat.ts refuses the locked fields
    // upstream; this omission is the second line of defence.
    const applyInputPatch = (patch: InputPatch): InputPatch => {
        const numericFields: Record<string, [number, (value: number) => void]> = {
            budget: [budget, value => { setBudget(value); setTempBudget(value); }],
            cashReserve: [cashReserve, value => { setCashReserve(value); setTempCashReserve(value); }],
            bondAlloc: [bondAlloc, setBondAlloc],
            bondCollateralLTV: [bondCollateralLTV, setBondCollateralLTV],
            simulatedHibor: [simulatedHibor, setSimulatedHibor],
            bondPriceDrop: [bondPriceDrop, setBondPriceDrop],
            sensitivityYear: [sensitivityYear, setSensitivityYear],
        };
        const previous: InputPatch = {};
        for (const [field, value] of Object.entries(patch)) {
            const numeric = numericFields[field];
            if (numeric && typeof value === 'number' && Number.isFinite(value)) {
                previous[field] = numeric[0];
                numeric[1](value);
            } else if (field === 'fundSource' && (value === 'cash' || value === 'mortgage')) {
                previous.fundSource = fundSource;
                setFundSource(value);
            } else if (field === 'showGuaranteed' && typeof value === 'boolean') {
                previous.showGuaranteed = showGuaranteed;
                setShowGuaranteed(value);
            }
        }
        return previous;
    };

    const guide = useMemo(
        () => nextSteps({
            input: simulationInput, output: projection, advisories,
            visitedViews, clientName, simulatedHibor, bondPriceDrop, hibor,
        }),
        [simulationInput, projection, advisories, visitedViews, clientName, simulatedHibor, bondPriceDrop, hibor]
    );

    return {
        activeView, setActiveView,
        visitedViews,
        lang, setLang,
        budget, setBudget,
        extraCash, setExtraCash,
        cashReserve, setCashReserve,
        bondAlloc, setBondAlloc,
        bondYield, setBondYield,
        hibor, setHibor,
        spread, setSpread,
        capRate, setCapRate,
        leverageLTV, setLeverageLTV,
        handlingFee, setHandlingFee,
        simulatedHibor, setSimulatedHibor,
        bondPriceDrop, setBondPriceDrop,
        bondCollateralLTV, setBondCollateralLTV,
        bondLoanSpread, setBondLoanSpread,
        showGuaranteed, setShowGuaranteed,
        fundSource, setFundSource,
        tempBudget, setTempBudget,
        tempCashReserve, setTempCashReserve,
        interestBasis, setInterestBasis,
        cofRate, setCofRate,
        clientName, setClientName,
        representativeName, setRepresentativeName,
        properties, addProperty, removeProperty, updateProperty,
        primeRate, setPrimeRate,
        mortgageHSpread, setMortgageHSpread,
        mortgagePModifier, setMortgagePModifier,
        sensitivityYear, setSensitivityYear,
        globalMinSpread, setGlobalMinSpread,
        globalMaxLTV, setGlobalMaxLTV,
        regulatoryMode, setRegulatoryMode,
        autoHedging, setAutoHedging,
        isGeneratingPDF, setIsGeneratingPDF,
        lastRateUpdate, setLastRateUpdate,
        isFetchingRates, setIsFetchingRates,
        dataSource, setDataSource,
        chartFilters, setChartFilters,
        unlockedCash,
        effectiveMortgageRate,
        monthlyMortgagePmt,
        applyInputPatch,
        simulationInput,
        projection,
        stressTest,
        advisories,
        guide
    };
};
