import { useState, useMemo } from 'react';
import { calculateProjection, calculateStressTest, SimulationInput, SimulationOutput, StressTestOutput } from '../utils/calculations';
import { Language } from '../types';

export const useAppState = () => {
    const [activeView, setActiveView] = useState('allocation');
    const [lang, setLang] = useState<Language>('en');

    // Financial State
    const [budget, setBudget] = useState(1000000);
    const [extraCash, setExtraCash] = useState(0);
    const [cashReserve, setCashReserve] = useState(200000);
    const [bondAlloc, setBondAlloc] = useState(3000000);
    const [bondYield, setBondYield] = useState(5.5);
    const [hibor, setHibor] = useState(4.15);
    const [spread, setSpread] = useState(1.3);
    const [capRate, setCapRate] = useState(9.0);
    const [leverageLTV, setLeverageLTV] = useState(90);
    const [handlingFee, setHandlingFee] = useState(1.0);
    const [simulatedHibor, setSimulatedHibor] = useState(4.5);
    const [bondPriceDrop, setBondPriceDrop] = useState(10);
    const [showGuaranteed, setShowGuaranteed] = useState(false);
    const [fundSource, setFundSource] = useState<'cash' | 'mortgage'>('cash');
    const [tempBudget, setTempBudget] = useState(1000000);
    const [tempCashReserve, setTempCashReserve] = useState(200000);
    const [interestBasis, setInterestBasis] = useState<'hibor' | 'cof'>('hibor');
    const [cofRate, setCofRate] = useState(5.0);
    const [clientName, setClientName] = useState('Estate of Mr. H.N.W.');
    const [representativeName, setRepresentativeName] = useState('Private Wealth Advisory Team');

    // Mortgage Refi State
    const [propertyValue, setPropertyValue] = useState(15000000);
    const [existingMortgage, setExistingMortgage] = useState(6000000);
    const [mortgageLtv, setMortgageLtv] = useState(70);
    const [primeRate, setPrimeRate] = useState(5.5);
    const [mortgageHSpread, setMortgageHSpread] = useState(1.3);
    const [mortgagePModifier, setMortgagePModifier] = useState(1.75);
    const [mortgageTenor, setMortgageTenor] = useState(30);

    // Market Risk & Sensitivity
    const [sensitivityYear, setSensitivityYear] = useState(15);

    // System Configuration State
    const [globalMinSpread, setGlobalMinSpread] = useState(1.0);
    const [globalMaxLTV, setGlobalMaxLTV] = useState(95);
    const [regulatoryMode, setRegulatoryMode] = useState('hkma');
    const [autoHedging, setAutoHedging] = useState(false);

    // PDF Generation State
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isFullPayment, setIsFullPayment] = useState(false);

    // HIBOR Caching State
    const [lastRateUpdate, setLastRateUpdate] = useState<Date | null>(null);
    const [isFetchingRates, setIsFetchingRates] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'live' | 'cached' | 'fallback' | 'manual'>('live');

    // Chart Filters State
    const [chartFilters, setChartFilters] = useState({
        bondPrincipal: true,
        cashValue: true,
        bondInterest: true,
        policyValue: true,
        loan: true
    });

    const unlockedCash = Math.max(0, (propertyValue * (mortgageLtv / 100)) - existingMortgage);
    const effectiveMortgageRate = Math.min(hibor + mortgageHSpread, primeRate - mortgagePModifier);

    const calculatePMT = (rate: number, nper: number, pv: number) => {
        if (rate === 0) return pv / nper;
        const r = rate / 100 / 12;
        const n = nper * 12;
        return (pv * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    };

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
            budget, cashReserve, sensitivityYear, fundSource, unlockedCash
        });
    }, [projection, simulatedHibor, bondPriceDrop, showGuaranteed, bondYield, spread, capRate, budget, cashReserve, sensitivityYear, fundSource, unlockedCash]);

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
        isFullPayment, setIsFullPayment,
        lastRateUpdate, setLastRateUpdate,
        isFetchingRates, setIsFetchingRates,
        fetchError, setFetchError,
        dataSource, setDataSource,
        chartFilters, setChartFilters,
        unlockedCash,
        effectiveMortgageRate,
        monthlyMortgagePmt,
        projection,
        stressTest
    };
};
