import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it } from 'vitest';
import handler from './simulate';
import { DEFAULT_INPUTS } from '../src/constants/defaults';
import {
    calculateProjection,
    calculateStressTest,
    type SimulationInput,
    type StressTestInput,
} from '../src/utils/calculations';
import { checkAssumptions } from '../src/utils/advisories';

type MockResponse = {
    statusCode: number;
    headers: Record<string, unknown>;
    body: unknown;
    status: (code: number) => MockResponse;
    json: (body: unknown) => MockResponse;
    end: () => MockResponse;
    setHeader: (name: string, value: unknown) => MockResponse;
};

const makeResponse = (): MockResponse => {
    const response = {
        statusCode: 200,
        headers: {},
        body: undefined,
        status(code: number) {
            response.statusCode = code;
            return response;
        },
        json(body: unknown) {
            response.body = body;
            return response;
        },
        end() {
            return response;
        },
        setHeader(name: string, value: unknown) {
            response.headers[name] = value;
            return response;
        },
    };
    return response;
};

const request = (method: string, body?: unknown, headers: Record<string, string> = {}) => ({
    method,
    body,
    headers,
}) as unknown as VercelRequest;

const baseInput = (): SimulationInput => ({
    budget: DEFAULT_INPUTS.budget,
    cashReserve: DEFAULT_INPUTS.cashReserve,
    bondAlloc: DEFAULT_INPUTS.bondAlloc,
    bondYield: DEFAULT_INPUTS.bondYield,
    hibor: DEFAULT_INPUTS.hibor,
    cofRate: DEFAULT_INPUTS.cofRate,
    interestBasis: DEFAULT_INPUTS.interestBasis,
    spread: DEFAULT_INPUTS.spread,
    leverageLTV: DEFAULT_INPUTS.leverageLTV,
    capRate: DEFAULT_INPUTS.capRate,
    handlingFee: DEFAULT_INPUTS.handlingFee,
    fundSource: DEFAULT_INPUTS.fundSource,
    unlockedCash: 0,
    effectiveMortgageRate: 0,
    monthlyMortgagePmt: 0,
    mortgageTenor: 0,
});

const call = async (body: unknown, method = 'POST', headers?: Record<string, string>) => {
    const res = makeResponse();
    await handler(request(method, body, headers), res as unknown as VercelResponse);
    return res;
};

const errorReasons = (body: unknown): string[] =>
    ((body as { fields: Array<{ reason: string }> }).fields).map(field => field.reason);

describe('/api/simulate', () => {
    it('returns the exact engine output for the real app defaults', async () => {
        const input = baseInput();
        const response = await call({ input });
        expect(response.statusCode).toBe(200);
        expect((response.body as { output: unknown }).output).toEqual(calculateProjection(input));
    });

    it('always returns findings matching the advisory engine', async () => {
        const input = baseInput();
        const response = await call({ input });
        const body = response.body as { output: ReturnType<typeof calculateProjection>; findings: unknown };
        expect(Array.isArray(body.findings)).toBe(true);
        expect(JSON.stringify(body.findings)).toBe(JSON.stringify(checkAssumptions(input, body.output)));
    });

    it('derives and returns the exact stress result', async () => {
        const input = baseInput();
        const stress = { simulatedHibor: 4.5, bondPriceDrop: 10, showGuaranteed: true, sensitivityYear: 15 };
        const response = await call({ input, stress });
        const body = response.body as { output: ReturnType<typeof calculateProjection>; stress: ReturnType<typeof calculateStressTest> };
        const expectedInput: StressTestInput = {
            projectionData: body.output.projectionData,
            ...stress,
            totalPremium: body.output.totalPremium,
            netBondPrincipal: body.output.netBondPrincipal,
            bondYield: input.bondYield,
            bankLoan: body.output.bankLoan,
            spread: input.spread,
            capRate: input.capRate,
            budget: input.budget,
            cashReserve: input.cashReserve,
            fundSource: input.fundSource,
            unlockedCash: input.unlockedCash,
            interestBasis: input.interestBasis,
            cofRate: input.cofRate,
            hibor: input.hibor,
        };
        expect(body.stress).not.toBeNull();
        expect(body.stress.stressedProjection.length).toBeGreaterThan(0);
        expect(body.stress).toEqual(calculateStressTest(expectedInput));
    });

    it('returns null stress when the stress key is absent', async () => {
        const response = await call({ input: baseInput() });
        expect((response.body as { stress: null }).stress).toBeNull();
    });

    it('ignores caller-supplied derived stress fields', async () => {
        const input = baseInput();
        const stress = { simulatedHibor: 4.5, bondPriceDrop: 10, showGuaranteed: false, sensitivityYear: 15 };
        const without = await call({ input, stress });
        const withFake = await call({ input, stress: { ...stress, totalPremium: 999, bankLoan: 999, projectionData: [] } });
        expect((withFake.body as { stress: unknown }).stress).toEqual((without.body as { stress: unknown }).stress);
    });

    it('reports each core validation rule', async () => {
        const input = { ...baseInput(), budget: undefined, bondYield: '5', hibor: Number.NaN,
            cofRate: Infinity, spread: -1, mortgageTenor: 1.5, interestBasis: 'bad', fundSource: 'bad' };
        const response = await call({ input });
        expect(response.statusCode).toBe(400);
        expect(errorReasons(response.body)).toEqual(expect.arrayContaining([
            'missing', 'not_a_number', 'not_finite', 'negative', 'not_an_integer', 'not_in_enum',
        ]));
    });

    it('reports all invalid fields instead of stopping at the first', async () => {
        const response = await call({ input: { ...baseInput(), budget: -1, bondYield: 101, fundSource: 'x' } });
        const body = response.body as { fields: Array<{ field: string }> };
        expect(response.statusCode).toBe(400);
        expect(body.fields.map(field => field.field)).toEqual(expect.arrayContaining(['budget', 'bondYield', 'fundSource']));
    });

    it('handles GET and OPTIONS with CORS headers', async () => {
        const get = await call(undefined, 'GET');
        expect(get.statusCode).toBe(405);
        expect(get.body).toEqual({ error: 'method_not_allowed', allowed: ['POST', 'OPTIONS'] });
        const options = await call(undefined, 'OPTIONS');
        expect(options.statusCode).toBe(204);
        expect(options.headers['Access-Control-Allow-Origin']).toBe('*');
        expect(options.headers['Cache-Control']).toBe('no-store');
    });

    it('allows a zero budget and returns findings', async () => {
        const response = await call({ input: { ...baseInput(), budget: 0 } });
        expect(response.statusCode).toBe(200);
        expect((response.body as { findings: unknown[] }).findings.length).toBeGreaterThan(0);
    });

    it('does not allow a prototype-polluting input key to mutate objects', async () => {
        const input = { ...baseInput(), __proto__: { polluted: 'yes' } };
        await call({ input });
        expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
    });

    it('rejects silent-clamp boundary violations and accepts exact boundaries', async () => {
        expect((await call({ input: { ...baseInput(), bondYield: 101 } })).statusCode).toBe(400);
        expect(errorReasons((await call({ input: { ...baseInput(), bondYield: 101 } })).body)).toContain('too_large');
        expect((await call({ input: { ...baseInput(), bondYield: 100 } })).statusCode).toBe(200);
        expect((await call({ input: { ...baseInput(), mortgageTenor: 51 } })).statusCode).toBe(400);
        expect((await call({ input: { ...baseInput(), mortgageTenor: 50 } })).statusCode).toBe(200);
        for (const sensitivityYear of [31, 0]) {
            const response = await call({ input: baseInput(), stress: { simulatedHibor: 4, bondPriceDrop: 0, sensitivityYear, showGuaranteed: false } });
            expect(response.statusCode).toBe(400);
        }
        for (const sensitivityYear of [30, 1]) {
            const response = await call({ input: baseInput(), stress: { simulatedHibor: 4, bondPriceDrop: 0, sensitivityYear, showGuaranteed: false } });
            expect(response.statusCode).toBe(200);
        }
    });

    it.each([null, [], 'x'])('rejects invalid input container %j', async input => {
        const response = await call({ input });
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ error: 'invalid_input', fields: [{ field: 'input', reason: 'missing' }] });
    });

    it('rejects an empty POST body as invalid input', async () => {
        const response = await call(undefined);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ error: 'invalid_input', fields: [{ field: 'input', reason: 'missing' }] });
    });

    it.each(['x', []])('rejects invalid stress container %j', async stress => {
        const response = await call({ input: baseInput(), stress });
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ error: 'invalid_input', fields: [{ field: 'stress', reason: 'not_an_object' }] });
    });

    it('requires a boolean showGuaranteed', async () => {
        const response = await call({ input: baseInput(), stress: { simulatedHibor: 4, bondPriceDrop: 0, sensitivityYear: 1, showGuaranteed: 'yes' } });
        expect(response.statusCode).toBe(400);
        expect(errorReasons(response.body)).toContain('not_a_boolean');
    });

    it('requires a positive mortgage payment only for a non-zero mortgage tenor', async () => {
        const mortgage = { ...baseInput(), fundSource: 'mortgage' as const, mortgageTenor: 20, monthlyMortgagePmt: 0 };
        const rejected = await call({ input: mortgage });
        expect(rejected.statusCode).toBe(400);
        expect(errorReasons(rejected.body)).toContain('required_with_mortgage');
        const allowed = await call({ input: { ...mortgage, mortgageTenor: 0 } });
        expect(allowed.statusCode).toBe(200);
    });

    it('uses missing for null numeric, enum, and stress boolean fields', async () => {
        const response = await call({ input: { ...baseInput(), budget: null, interestBasis: null }, stress: {
            simulatedHibor: 4, bondPriceDrop: 0, sensitivityYear: 1, showGuaranteed: null,
        } });
        const fields = (response.body as { fields: Array<{ field: string; reason: string }> }).fields;
        expect(fields).toEqual(expect.arrayContaining([
            { field: 'budget', reason: 'missing' },
            { field: 'interestBasis', reason: 'missing' },
            { field: 'stress.showGuaranteed', reason: 'missing' },
        ]));
    });

    it('rejects oversized payloads by bytes', async () => {
        const response = await call({ input: baseInput() }, 'POST', { 'content-length': '102401' });
        expect(response.statusCode).toBe(413);
        expect(response.body).toEqual({ error: 'payload_too_large' });
    });
});
