import crypto from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

const ALLOWED_ORIGINS = new Set([
    'https://premium-financing-calculator.vercel.app',
    'http://localhost:3000',
]);

// This is a browser cross-origin abuse mitigation only, not an authentication boundary:
// direct HTTP clients can send any Origin header. MCP_API_KEY is the authentication gate for
// /api/mcp; chat and PDF remain unauthenticated-but-origin-gated by explicit product choice.
export const originAllowed = (req: VercelRequest): boolean => {
    const origin = req.headers.origin;
    if (origin === undefined) return true;
    if (Array.isArray(origin)) return false;
    return ALLOWED_ORIGINS.has(origin.toLowerCase());
};

export const mcpKeyValid = (req: VercelRequest): boolean => {
    const configured = process.env.MCP_API_KEY;
    if (configured === undefined || configured === '') return true;
    const authorization = req.headers.authorization;
    if (Array.isArray(authorization) || typeof authorization !== 'string' ||
        !authorization.startsWith('Bearer ')) return false;
    const supplied = authorization.slice('Bearer '.length);
    const expectedBuffer = Buffer.from(configured, 'utf8');
    const suppliedBuffer = Buffer.from(supplied, 'utf8');
    if (expectedBuffer.length !== suppliedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
};
