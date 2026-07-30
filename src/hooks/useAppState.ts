import { useState, useMemo } from 'react';
import {
    calculateProjection, calculateStressTest, calculatePMT,
    deriveUnlockedCash, deriveEffectiveMortgageRate
} from '../utils/calculations';
import { DEFAULT_INPUTS } from '../constants/defaults';
import { Language } from '../types';

export const useAppState = () => {
    const [activeView, setActiveView] = useState('allocation');
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
    const [interestBasis, setInterestBasis] = useState<'hibor' | 'cof'>(DEFAULT_INPUTS.interestBasis);
    const [cofRate, setCofRate] = useState(DEFAULT_INPUTS.cofRate);
    const [clientName, setClientName] = useState('Estate of Mr. H.N.W.');
    const [representativeName, setRepresentativeName] = useState('Private Wealth Advisory Team');

    // Mortgage Refi State
    const [propertyValue, setPropertyValue] = useState(DEFAULT_INPUTS.propertyValue);
    const [existingMortgage, setExistingMortgage] = useState(DEFAULT_INPUTS.existingMortgage);
    const [mortgageLtv, setMortgageLtv] = useState(DEFAULT_INPUTS.mortgageLtv);
    const [primeRate, setPrimeRate] = useState(DEFAULT_INPUTS.primeRate);
    const [mortgageHSpread, setMortgageHSpread] = useState(DEFAULT_INPUTS.mortgageHSpread);
    const [mortgagePModifier, setMortgagePModifier] = useState(DEFAULT_INPUTS.mortgagePModifier);
    const [mortgageTenor, setMortgageTenor] = useState(DEFAULT_INPUTS.mortgageTenor);

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

    // Both derivations are bounded at the source in calculations.ts, where they are also
    // unit-tested against the full propertyValue x mortgageLtv overflow surface.
    const unlockedCash = deriveUnlockedCash(propertyValue, mortgageLtv, existingMortgage);
    const effectiveMortgageRate = deriveEffectiveMortgageRate(
        hibor, mortgageHSpread, primeRate, mortgagePModifier);

    const monthlyMortgagePmt = calculatePMT(effectiveMortgageRate, mortgageTenor, unlockedCash);

    const projection = useMemo(() => {
        return calculateProjection({
            budget, cashReserve, bondAlloc, bondYield, hibor, cofRate, interestBasis, spread,
            leverageLTV, capRate, handlingFee, fundSource, unlockedCash,
            effectiveMortgageRate, monthlyMortgagePmt, mortgageTenor
        });
    }, [budget, cashReserve, bondAlloc, bondYield, hibor, cofRate, interestBasis, spread, leverageLTV, capRate, handlingFee, fundSource, unlockedCash, effectiveMortgageRate, monthlyMortgagePmt, mortgageTenor]);

    const stressTest = useMemo(() => {
        return calculateStressTest({
            projectionData: projection.projectionData, simulatedHibor, bondPriceDrop, showGuaranteed,
            totalPremium: projection.totalPremium, netBondPrincipal: projection.netBondPrincipal, bondYield, bankLoan: projection.bankLoan, spread, capRate,
            budget, cashReserve, sensitivityYear, fundSource, unlockedCash, interestBasis, cofRate, hibor
        });
    }, [projection, simulatedHibor, bondPriceDrop, showGuaranteed, bondYield, spread, capRate, budget, cashReserve, sensitivityYear, fundSource, unlockedCash, interestBasis, cofRate, hibor]);

    return {
        activeView, setActiveView,
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
        showGuaranteed, setShowGuaranteed,
        fundSource, setFundSource,
        tempBudget, setTempBudget,
        tempCashReserve, setTempCashReserve,
        interestBasis, setInterestBasis,
        cofRate, setCofRate,
        clientName, setClientName,
        representativeName, setRepresentativeName,
        propertyValue, setPropertyValue,
        existingMortgage, setExistingMortgage,
        mortgageLtv, setMortgageLtv,
        primeRate, setPrimeRate,
        mortgageHSpread, setMortgageHSpread,
        mortgagePModifier, setMortgagePModifier,
        mortgageTenor, setMortgageTenor,
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
        projection,
        stressTest
    };
};
