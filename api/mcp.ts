import { readFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    ENUM_VALUES,
    INPUT_RANGES,
    STRESS_RANGES,
    runSimulate,
    validateSimulateRequest,
    type PlainObject,
} from '../src/utils/engineApi.js';

// `type` is the literal 'text', not string: the SDK's content type is a discriminated
// union, so a widened string is not assignable to it.
type ToolResult = { isError?: boolean; content: { type: 'text'; text: string }[] };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

const INPUT_FIELDS = [
    'budget', 'cashReserve', 'bondAlloc', 'bondYield', 'hibor', 'cofRate',
    'interestBasis', 'spread', 'leverageLTV', 'capRate', 'handlingFee', 'fundSource',
    'unlockedCash', 'effectiveMortgageRate', 'monthlyMortgagePmt', 'mortgageTenor',
] as const;
const STRESS_FIELDS = ['simulatedHibor', 'bondPriceDrop', 'showGuaranteed', 'sensitivityYear'] as const;
const MONEY_FIELDS = new Set(['budget', 'cashReserve', 'bondAlloc', 'unlockedCash', 'monthlyMortgagePmt']);
const MAX_PAYLOAD_BYTES = 100 * 1024;

const fieldDescription = (field: string): string => MONEY_FIELDS.has(field) ? `${field}, in HKD` : `${field}, as a percent`;

const numberSchema = (field: string, stress = false) => {
    const range = (stress ? STRESS_RANGES : INPUT_RANGES)[field];
    let schema = z.number().min(range.min).max(range.max);
    if (range.integer) schema = schema.int();
    return schema.describe(fieldDescription(field));
};

const inputSchema = (): Record<string, z.ZodTypeAny> => {
    const schema: Record<string, z.ZodTypeAny> = {};
    for (const field of Object.keys(INPUT_RANGES)) schema[field] = numberSchema(field);
    schema.interestBasis = z.enum(ENUM_VALUES.interestBasis).describe('interest basis: hibor or cof');
    schema.fundSource = z.enum(ENUM_VALUES.fundSource).describe('funding source: cash or mortgage');
    return schema;
};

const stressSchema = (): Record<string, z.ZodTypeAny> => {
    const schema = inputSchema();
    for (const field of Object.keys(STRESS_RANGES)) schema[field] = numberSchema(field, true);
    schema.showGuaranteed = z.boolean().describe('whether to show guaranteed values');
    return schema;
};

export const TOOL_SCHEMAS = {
    run_simulation: inputSchema(),
    run_stress_test: stressSchema(),
    check_assumptions: inputSchema(),
};

const pick = (args: Record<string, unknown>, fields: readonly string[]): PlainObject =>
    Object.fromEntries(fields.map(field => [field, args[field]]));

const validationFailure = (args: Record<string, unknown>, withStress: boolean): ToolResult | null => {
    const input = pick(args, INPUT_FIELDS);
    const request = withStress ? { input, stress: pick(args, STRESS_FIELDS) } : { input };
    const fields = validateSimulateRequest(request);
    if (fields.length === 0) return null;
    return {
        isError: true,
        content: [{ type: 'text', text: fields.map(field => `${field.field}:${field.reason}`).join(', ') }],
    };
};

const runSimulation = async (args: Record<string, unknown>): Promise<ToolResult> => {
    const failure = validationFailure(args, false);
    if (failure) return failure;
    return { content: [{ type: 'text', text: JSON.stringify(runSimulate({ input: pick(args, INPUT_FIELDS) })) }] };
};

const runStressTest = async (args: Record<string, unknown>): Promise<ToolResult> => {
    const failure = validationFailure(args, true);
    if (failure) return failure;
    const input = pick(args, INPUT_FIELDS);
    const stress = pick(args, STRESS_FIELDS);
    return { content: [{ type: 'text', text: JSON.stringify(runSimulate({ input, stress })) }] };
};

const checkAssumptions = async (args: Record<string, unknown>): Promise<ToolResult> => {
    const failure = validationFailure(args, false);
    if (failure) return failure;
    const result = runSimulate({ input: pick(args, INPUT_FIELDS) });
    return { content: [{ type: 'text', text: JSON.stringify(result.findings) }] };
};

export const TOOL_HANDLERS: Record<'run_simulation' | 'run_stress_test' | 'check_assumptions', ToolHandler> = {
    run_simulation: runSimulation,
    run_stress_test: runStressTest,
    check_assumptions: checkAssumptions,
};

const cors = (res: VercelResponse): void => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    res.setHeader('Cache-Control', 'no-store');
};

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

const registerServer = (): McpServer => {
    const server = new McpServer({ name: 'premium-financing-calculator', version: '1' });
    server.registerTool('run_simulation', {
        title: 'Run simulation',
        description: 'Returns an ILLUSTRATION, not financial advice.',
        inputSchema: TOOL_SCHEMAS.run_simulation,
        annotations: { readOnlyHint: true },
    }, TOOL_HANDLERS.run_simulation);
    server.registerTool('run_stress_test', {
        title: 'Run stress test',
        description: 'Returns an ILLUSTRATION, not financial advice.',
        inputSchema: TOOL_SCHEMAS.run_stress_test,
        annotations: { readOnlyHint: true },
    }, TOOL_HANDLERS.run_stress_test);
    server.registerTool('check_assumptions', {
        title: 'Check assumptions',
        description: 'Returns an ILLUSTRATION plausibility verdict, not financial advice.',
        inputSchema: TOOL_SCHEMAS.check_assumptions,
        annotations: { readOnlyHint: true },
    }, TOOL_HANDLERS.check_assumptions);
    server.registerResource('accepted_ranges', 'range://accepted', {
        mimeType: 'application/json',
    }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ input: INPUT_RANGES, stress: STRESS_RANGES }) }] }));
    server.registerResource('about', 'doc://about', {
        mimeType: 'text/markdown',
    }, async uri => {
        let text: string;
        try {
            text = await readFile(`${process.cwd()}/public/llms.txt`, 'utf8');
        } catch {
            text = 'This tool produces illustrative calculations, not financial advice.';
        }
        return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text }] };
    });
    return server;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (bodyBytes(req) > MAX_PAYLOAD_BYTES) return res.status(413).json({ error: 'payload_too_large' });
    try {
        const server = registerServer();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        const close = () => {
            void transport.close();
            void server.close();
        };
        const responseWithEvents = res as VercelResponse & { on?: (event: string, callback: () => void) => void };
        responseWithEvents.on?.('close', close);
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch {
        return res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
}
