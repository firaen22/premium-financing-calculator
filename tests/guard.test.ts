import { describe, expect, it, vi } from 'vitest';
import { mcpKeyValid, originAllowed } from '../api/_guard';

const request = (headers: Record<string, string | string[] | undefined>) => ({ headers } as never);

describe('API guards', () => {
    it('allows absent and configured origins, rejects other origins', () => {
        expect(originAllowed(request({}))).toBe(true);
        expect(originAllowed(request({ origin: 'HTTPS://PREMIUM-FINANCING-CALCULATOR.VERCEL.APP' }))).toBe(true);
        expect(originAllowed(request({ origin: 'https://example.com' }))).toBe(false);
    });

    it('handles optional MCP key authentication exactly', () => {
        vi.stubEnv('MCP_API_KEY', 'secret');
        expect(mcpKeyValid(request({ authorization: 'Bearer secret' }))).toBe(true);
        expect(mcpKeyValid(request({ authorization: 'Bearer wrong' }))).toBe(false);
        expect(mcpKeyValid(request({}))).toBe(false);
        expect(mcpKeyValid(request({ authorization: ['Bearer secret', 'Bearer wrong'] }))).toBe(false);
        expect(mcpKeyValid(request({ authorization: 'Bearer  secret' }))).toBe(false);
        vi.stubEnv('MCP_API_KEY', '');
        expect(mcpKeyValid(request({}))).toBe(true);
        vi.unstubAllEnvs();
    });
});
