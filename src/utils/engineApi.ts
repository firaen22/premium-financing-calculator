import {
    calculateProjection,
    calculateStressTest,
    MAX_MONEY,
    type SimulationInput,
    type SimulationOutput,
    type StressTestInput,
    type StressTestOutput,
} from './calculations.js';
import { checkAssumptions, type Finding } from './advisories.js';

export type PlainObject = Record<string, unknown>;
export type ValidationField = { field: string; reason: string };
export type NumericRange = { min: number; max: number; integer?: boolean };
export type SimulateResult = {
    output: SimulationOutput;
    stress: StressTestOutput | null;
    findings: Finding[];
    meta: { engineVersion: string; generatedAt: string };
};

const MONEY_FIELDS = new Set([
    'budget', 'cashReserve', 'bondAlloc', 'unlockedCash', 'monthlyMortgagePmt',
]);
export const INPUT_RANGES: Readonly<Record<string, NumericRange>> = {
    budget: { min: 0, max: MAX_MONEY },
    cashReserve: { min: 0, max: MAX_MONEY },
    bondAlloc: { min: 0, max: MAX_MONEY },
    bondYield: { min: 0, max: 100 },
    hibor: { min: 0, max: 100 },
    cofRate: { min: 0, max: 100 },
    spread: { min: 0, max: 100 },
    leverageLTV: { min: 0, max: 100 },
    capRate: { min: 0, max: 100 },
    handlingFee: { min: 0, max: 100 },
    unlockedCash: { min: 0, max: MAX_MONEY },
    effectiveMortgageRate: { min: 0, max: 100 },
    monthlyMortgagePmt: { min: 0, max: MAX_MONEY },
    mortgageTenor: { min: 0, max: 50, integer: true },
};

// Validated only when present. Kept out of INPUT_RANGES because validateInput requires
// every key there, which would reject every existing caller that predates these fields.
export const OPTIONAL_INPUT_RANGES: Readonly<Record<string, NumericRange>> = {
    bondCollateralLTV: { min: 0, max: 100 },
    bondLoanSpread: { min: 0, max: 100 },
    extraCash: { min: 0, max: MAX_MONEY },
};

export const STRESS_RANGES: Readonly<Record<string, NumericRange>> = {
    simulatedHibor: { min: 0, max: 100 },
    bondPriceDrop: { min: 0, max: 100 },
    sensitivityYear: { min: 1, max: 30, integer: true },
};

export const ENUM_VALUES: {
    interestBasis: readonly ['hibor', 'cof'];
    fundSource: readonly ['cash', 'mortgage'];
} = {
    interestBasis: ['hibor', 'cof'],
    fundSource: ['cash', 'mortgage'],
};

const isPlainObject = (value: unknown): value is PlainObject => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const missing = (value: unknown): boolean => value === undefined || value === null;

// Exported for api/chat.ts, which validates partial input patches field-by-field
// against the same rules the full-request validator applies.
export const validateNumber = (field: string, value: unknown, range: NumericRange): ValidationField | null => {
    if (missing(value)) return { field, reason: 'missing' };
    if (typeof value !== 'number' || Number.isNaN(value)) return { field, reason: 'not_a_number' };
    if (!Number.isFinite(value)) return { field, reason: 'not_finite' };
    if (value < 0) return { field, reason: 'negative' };
    if (value < range.min) return { field, reason: 'too_small' };
    if (value > range.max) return { field, reason: 'too_large' };
    if (range.integer && !Number.isInteger(value)) return { field, reason: 'not_an_integer' };
    return null;
};

const validateInput = (input: PlainObject): ValidationField[] => {
    const fields: ValidationField[] = [];
    for (const field of Object.keys(INPUT_RANGES)) {
        const result = validateNumber(field, input[field], INPUT_RANGES[field]);
        if (result) fields.push(result);
    }
    for (const field of Object.keys(OPTIONAL_INPUT_RANGES)) {
        if (missing(input[field])) continue;
        const result = validateNumber(field, input[field], OPTIONAL_INPUT_RANGES[field]);
        if (result) fields.push(result);
    }
    for (const field of ['interestBasis', 'fundSource'] as const) {
        const value = input[field];
        if (missing(value)) fields.push({ field, reason: 'missing' });
        else if (typeof value !== 'string' || !ENUM_VALUES[field].includes(value as never)) {
            fields.push({ field, reason: 'not_in_enum' });
        }
    }
    if (input.fundSource === 'mortgage' && typeof input.mortgageTenor === 'number' &&
        Number.isFinite(input.mortgageTenor) && input.mortgageTenor > 0 &&
        typeof input.monthlyMortgagePmt === 'number' && Number.isFinite(input.monthlyMortgagePmt) &&
        input.monthlyMortgagePmt <= 0) {
        fields.push({ field: 'monthlyMortgagePmt', reason: 'required_with_mortgage' });
    }
    return fields;
};

const validateStress = (stress: PlainObject): ValidationField[] => {
    const fields: ValidationField[] = [];
    for (const field of Object.keys(STRESS_RANGES)) {
        const result = validateNumber(`stress.${field}`, stress[field], STRESS_RANGES[field]);
        if (result) fields.push(result);
    }
    if (missing(stress.showGuaranteed)) fields.push({ field: 'stress.showGuaranteed', reason: 'missing' });
    else if (typeof stress.showGuaranteed !== 'boolean') fields.push({ field: 'stress.showGuaranteed', reason: 'not_a_boolean' });
    return fields;
};

export const validateSimulateRequest = (body: unknown): ValidationField[] => {
    if (!isPlainObject(body) || !isPlainObject(body.input)) {
        return [{ field: 'input', reason: 'missing' }];
    }
    const fields = validateInput(body.input);
    if (Object.prototype.hasOwnProperty.call(body, 'stress')) {
        if (!isPlainObject(body.stress)) return [...fields, { field: 'stress', reason: 'not_an_object' }];
        fields.push(...validateStress(body.stress));
    }
    return fields;
};

const pickInput = (input: PlainObject): SimulationInput => ({
    budget: input.budget as number,
    cashReserve: input.cashReserve as number,
    bondAlloc: input.bondAlloc as number,
    bondYield: input.bondYield as number,
    hibor: input.hibor as number,
    cofRate: input.cofRate as number,
    interestBasis: input.interestBasis as SimulationInput['interestBasis'],
    spread: input.spread as number,
    leverageLTV: input.leverageLTV as number,
    capRate: input.capRate as number,
    handlingFee: input.handlingFee as number,
    fundSource: input.fundSource as SimulationInput['fundSource'],
    unlockedCash: input.unlockedCash as number,
    effectiveMortgageRate: input.effectiveMortgageRate as number,
    monthlyMortgagePmt: input.monthlyMortgagePmt as number,
    mortgageTenor: input.mortgageTenor as number,
    bondCollateralLTV: input.bondCollateralLTV as number | undefined,
    bondLoanSpread: input.bondLoanSpread as number | undefined,
    extraCash: input.extraCash as number | undefined,
});

const pickStress = (stress: PlainObject, input: SimulationInput, output: SimulationOutput): StressTestInput => ({
    projectionData: output.projectionData,
    simulatedHibor: stress.simulatedHibor as number,
    bondPriceDrop: stress.bondPriceDrop as number,
    showGuaranteed: stress.showGuaranteed as boolean,
    totalPremium: output.totalPremium,
    netBondPrincipal: output.netBondPrincipal,
    bondYield: input.bondYield,
    bankLoan: output.bankLoan,
    spread: input.spread,
    capRate: input.capRate,
    budget: input.budget,
    cashReserve: input.cashReserve,
    sensitivityYear: stress.sensitivityYear as number,
    fundSource: input.fundSource,
    unlockedCash: input.unlockedCash,
    interestBasis: input.interestBasis,
    cofRate: input.cofRate,
    hibor: input.hibor,
    // From the projection, not the request: the drawn amount is netBondAlloc x LTV, which
    // only the engine has resolved after its own clamping of bondAlloc to the budget.
    bondLoan: output.bondLoan,
    bondLoanSpread: input.bondLoanSpread,
});

export const runSimulate = (body: { input: PlainObject; stress?: PlainObject }): SimulateResult => {
    const input = pickInput(body.input);
    const output = calculateProjection(input);
    const stress = body.stress ? calculateStressTest(pickStress(body.stress, input, output)) : null;
    const findings = checkAssumptions(input, output, stress ?? undefined);
    return { output, stress, findings, meta: { engineVersion: '1', generatedAt: new Date().toISOString() } };
};
