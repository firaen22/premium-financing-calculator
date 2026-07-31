import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSimulateRequest, runSimulate, type PlainObject, type ValidationField } from '../src/utils/engineApi';

const MAX_PAYLOAD_BYTES = 100 * 1024;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed', allowed: ['POST', 'OPTIONS'] });
    if (bodyBytes(req) > MAX_PAYLOAD_BYTES) return res.status(413).json({ error: 'payload_too_large' });

    const inputErrors = validateSimulateRequest(req.body);
    if (inputErrors.length > 0) return invalid(res, inputErrors);

    const body = req.body as { input: PlainObject; stress?: PlainObject };
    try {
        return res.status(200).json(runSimulate(body));
    } catch (error: unknown) {
        console.error('Simulation engine error:', error);
        return res.status(500).json({ error: 'engine_error' });
    }
}
