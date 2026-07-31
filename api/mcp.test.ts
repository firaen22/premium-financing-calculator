import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS } from '../src/constants/defaults';
import { calculateProjection, calculateStressTest, type SimulationInput, type StressTestInput } from '../src/utils/calculations';
import { INPUT_RANGES, STRESS_RANGES, runSimulate } from '../src/utils/engineApi';
import handler, { TOOL_HANDLERS, TOOL_SCHEMAS } from './mcp';

const validInput = (): SimulationInput => ({
    budget: DEFAULT_INPUTS.budget, cashReserve: DEFAULT_INPUTS.cashReserve, bondAlloc: DEFAULT_INPUTS.bondAlloc,
    bondYield: DEFAULT_INPUTS.bondYield, hibor: DEFAULT_INPUTS.hibor, cofRate: DEFAULT_INPUTS.cofRate,
    interestBasis: DEFAULT_INPUTS.interestBasis, spread: DEFAULT_INPUTS.spread, leverageLTV: DEFAULT_INPUTS.leverageLTV,
    capRate: DEFAULT_INPUTS.capRate, handlingFee: DEFAULT_INPUTS.handlingFee, fundSource: DEFAULT_INPUTS.fundSource,
    unlockedCash: 0, effectiveMortgageRate: 0, monthlyMortgagePmt: 0, mortgageTenor: 0,
});

const args = () => ({ ...validInput(), simulatedHibor: 4.5, bondPriceDrop: 10, showGuaranteed: true, sensitivityYear: 15 });
const payload = async (name: keyof typeof TOOL_HANDLERS, value = args()) => {
    const result = await TOOL_HANDLERS[name](value);
    expect(result.isError).not.toBe(true);
    return JSON.parse(result.content[0].text) as unknown;
};

describe('MCP tools', () => {
    it('runs the projection through the shared engine', async () => {
        const result = await payload('run_simulation');
        expect((result as { output: unknown }).output).toEqual(calculateProjection(validInput()));
    });

    it('partitions flat stress arguments and returns a stress result', async () => {
        const result = await payload('run_stress_test') as { output: ReturnType<typeof calculateProjection>; stress: unknown };
        const input = validInput();
        const stress: StressTestInput = {
            projectionData: result.output.projectionData, simulatedHibor: 4.5, bondPriceDrop: 10, showGuaranteed: true,
            sensitivityYear: 15, totalPremium: result.output.totalPremium, netBondPrincipal: result.output.netBondPrincipal,
            bondYield: input.bondYield, bankLoan: result.output.bankLoan, spread: input.spread, capRate: input.capRate,
            budget: input.budget, cashReserve: input.cashReserve, fundSource: input.fundSource, unlockedCash: input.unlockedCash,
            interestBasis: input.interestBasis, cofRate: input.cofRate, hibor: input.hibor,
        };
        expect(result.stress).toEqual(calculateStressTest(stress));
    });

    it('returns only findings for the assumptions tool', async () => {
        const result = await payload('check_assumptions');
        expect(Array.isArray(result)).toBe(true);
        expect(JSON.stringify(result)).not.toContain('projectionData');
    });

    it.each([
        ['bondYield', 101], ['mortgageTenor', 51], ['sensitivityYear', 0], ['sensitivityYear', 31],
    ])('reports invalid %s', async (field, value) => {
        const result = await TOOL_HANDLERS.run_stress_test({ ...args(), [field]: value });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(field);
    });

    it('reports the mortgage cross-field rule', async () => {
        const result = await TOOL_HANDLERS.run_simulation({ ...args(), fundSource: 'mortgage', mortgageTenor: 1, monthlyMortgagePmt: 0 });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('monthlyMortgagePmt');
    });

    it('keeps zod bounds aligned with the shared ranges', () => {
        for (const [field, range] of Object.entries(INPUT_RANGES)) {
            const schema = TOOL_SCHEMAS.run_simulation[field];
            expect(schema.safeParse(range.min).success).toBe(true);
            expect(schema.safeParse(range.max).success).toBe(true);
            expect(schema.safeParse(range.min - 1).success).toBe(false);
            expect(schema.safeParse(range.max + 1).success).toBe(false);
        }
        for (const [field, range] of Object.entries(STRESS_RANGES)) {
            const schema = TOOL_SCHEMAS.run_stress_test[field];
            expect(schema.safeParse(range.min).success).toBe(true);
            expect(schema.safeParse(range.max).success).toBe(true);
            expect(schema.safeParse(range.min - 1).success).toBe(false);
            expect(schema.safeParse(range.max + 1).success).toBe(false);
        }
    });

    it('does not accept caller-supplied derived stress fields', () => {
        const input = validInput();
        const expected = runSimulate({ input: { ...input }, stress: { simulatedHibor: 4.5, bondPriceDrop: 10, showGuaranteed: true, sensitivityYear: 15 } });
        const withFake = runSimulate({ input: { ...input }, stress: { simulatedHibor: 4.5, bondPriceDrop: 10, showGuaranteed: true, sensitivityYear: 15, totalPremium: 999 } });
        expect(withFake.stress).toEqual(expected.stress);
    });

    it('handles OPTIONS with MCP CORS headers', async () => {
        const response = {
            statusCode: 200, headers: {} as Record<string, unknown>, body: undefined as unknown,
            status(code: number) { response.statusCode = code; return response; },
            end() { return response; },
            json(body: unknown) { response.body = body; return response; },
            setHeader(name: string, value: unknown) { response.headers[name] = value; return response; },
        };
        await handler({ method: 'OPTIONS', headers: {} } as never, response as never);
        expect(response.statusCode).toBe(204);
        expect(response.headers['Access-Control-Allow-Headers']).toBe('Content-Type, Mcp-Session-Id');
    });

    it('does not reject a malformed JSON-RPC POST body', async () => {
        const response = {
            statusCode: 200, headers: {} as Record<string, unknown>, body: undefined as unknown,
            status(code: number) { response.statusCode = code; return response; },
            end() { return response; },
            json(body: unknown) { response.body = body; return response; },
            setHeader(name: string, value: unknown) { response.headers[name] = value; return response; },
            on() { return response; },
        };
        await expect(handler({ method: 'POST', body: '{bad json}', headers: {} } as never, response as never)).resolves.toBeDefined();
    });
});
