import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    calculateProjection,
    calculateStressTest,
    MAX_MONEY,
    type SimulationInput,
    type StressTestInput,
} from '../src/utils/calculations';
import { checkAssumptions, type Finding } from '../src/utils/advisories';

const MAX_PAYLOAD_BYTES = 100 * 1024;
const NUMERIC_FIELDS = [
    'budget', 'cashReserve', 'bondAlloc', 'bondYield', 'hibor', 'cofRate',
    'spread', 'leverageLTV', 'capRate', 'handlingFee', 'unlockedCash',
    'effectiveMortgageRate', 'monthlyMortgagePmt', 'mortgageTenor',
] as const;
const MONEY_FIELDS = new Set<string>([
    'budget', 'cashReserve', 'bondAlloc', 'unlockedCash', 'monthlyMortgagePmt',
]);
const STRESS_NUMERIC_FIELDS = ['simulatedHibor', 'bondPriceDrop', 'sensitivityYear'] as const;

type ValidationField = { field: string; reason: string };
type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const missing = (value: unknown): boolean => value === undefined || value === null;

const validateNumber = (field: string, value: unknown, min: number, max: number, integer = false): ValidationField | null => {
    if (missing(value)) return { field, reason: 'missing' };
    if (typeof value !== 'number' || Number.isNaN(value)) return { field, reason: 'not_a_number' };
    if (!Number.isFinite(value)) return { field, reason: 'not_finite' };
    if (value < 0) return { field, reason: 'negative' };
    if (value < min) return { field, reason: 'too_small' };
    if (value > max) return { field, reason: 'too_large' };
    if (integer && !Number.isInteger(value)) return { field, reason: 'not_an_integer' };
    return null;
};

const validateInput = (input: PlainObject): ValidationField[] => {
    const fields: ValidationField[] = [];
    for (const field of NUMERIC_FIELDS) {
        const max = field === 'mortgageTenor' ? 50 : MONEY_FIELDS.has(field) ? MAX_MONEY : 100;
        const result = validateNumber(field, input[field], 0, max, field === 'mortgageTenor');
        if (result) fields.push(result);
    }

    for (const [field, allowed] of [
        ['interestBasis', ['hibor', 'cof']],
        ['fundSource', ['cash', 'mortgage']],
    ] as const) {
        const value = input[field];
        if (missing(value)) fields.push({ field, reason: 'missing' });
        else if (typeof value !== 'string' || !allowed.includes(value as never)) {
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
    for (const field of STRESS_NUMERIC_FIELDS) {
        const result = validateNumber(`stress.${field}`, stress[field], field === 'sensitivityYear' ? 1 : 0,
            field === 'sensitivityYear' ? 30 : 100, field === 'sensitivityYear');
        if (result) fields.push(result);
    }
    const showGuaranteed = stress.showGuaranteed;
    if (missing(showGuaranteed)) fields.push({ field: 'stress.showGuaranteed', reason: 'missing' });
    else if (typeof showGuaranteed !== 'boolean') fields.push({ field: 'stress.showGuaranteed', reason: 'not_a_boolean' });
    return fields;
};

const cors = (res: VercelResponse): void => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
};

const invalid = (res: VercelResponse, fields: ValidationField[]) => res.status(400).json({ error: 'invalid_input', fields });

const bodyBytes = (req: VercelRequest): number => {
    const contentLength = req.headers['content-length'];
    if (typeof contentLength === 'string' && /^\d+$/.test(contentLength)) return Number(contentLength);
    try {
        const serialized = JSON.stringify(req.body);
        return serialized === undefined ? 0 : Buffer.byteLength(serialized, 'utf8');
    } catch {
        return MAX_PAYLOAD_BYTES + 1;
    }
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
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed', allowed: ['POST', 'OPTIONS'] });
    if (bodyBytes(req) > MAX_PAYLOAD_BYTES) return res.status(413).json({ error: 'payload_too_large' });

    const body = req.body;
    if (!isPlainObject(body) || !isPlainObject(body.input)) {
        return invalid(res, [{ field: 'input', reason: 'missing' }]);
    }
    const inputObject = body.input;
    const inputErrors = validateInput(inputObject);
    const stressPresent = Object.prototype.hasOwnProperty.call(body, 'stress');
    let stressObject: PlainObject | undefined;
    if (stressPresent) {
        if (!isPlainObject(body.stress)) return invalid(res, [...inputErrors, { field: 'stress', reason: 'not_an_object' }]);
        stressObject = body.stress;
        inputErrors.push(...validateStress(stressObject));
    }
    if (inputErrors.length > 0) return invalid(res, inputErrors);

    const input = pickInput(inputObject);
    try {
        const output = calculateProjection(input);
        let stress: ReturnType<typeof calculateStressTest> | null = null;
        if (stressObject) {
            const stressInput: StressTestInput = {
                projectionData: output.projectionData,
                simulatedHibor: stressObject.simulatedHibor as number,
                bondPriceDrop: stressObject.bondPriceDrop as number,
                showGuaranteed: stressObject.showGuaranteed as boolean,
                totalPremium: output.totalPremium,
                netBondPrincipal: output.netBondPrincipal,
                bondYield: input.bondYield,
                bankLoan: output.bankLoan,
                spread: input.spread,
                capRate: input.capRate,
                budget: input.budget,
                cashReserve: input.cashReserve,
                sensitivityYear: stressObject.sensitivityYear as number,
                fundSource: input.fundSource,
                unlockedCash: input.unlockedCash,
                interestBasis: input.interestBasis,
                cofRate: input.cofRate,
                hibor: input.hibor,
            };
            stress = calculateStressTest(stressInput);
        }
        const findings: Finding[] = checkAssumptions(input, output, stress ?? undefined);
        return res.status(200).json({
            output,
            stress,
            findings,
            meta: { engineVersion: '1', generatedAt: new Date().toISOString() },
        });
    } catch (error: unknown) {
        console.error('Simulation engine error:', error);
        return res.status(500).json({ error: 'engine_error' });
    }
}
