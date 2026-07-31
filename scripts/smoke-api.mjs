const baseUrl = process.argv[2]?.replace(/\/$/, '');

if (!baseUrl) {
    console.error('Usage: node scripts/smoke-api.mjs <base-url>');
    process.exitCode = 1;
} else {
    let failures = 0;

    const check = async (label, run) => {
        try {
            const detail = await run();
            console.log(`PASS ${label}${detail ? ` — ${detail}` : ''}`);
        } catch (error) {
            failures += 1;
            const message = error instanceof Error ? error.message : String(error);
            console.log(`FAIL ${label} — ${message}`);
        }
    };

    const jsonRequest = async (path, options) => {
        const response = await fetch(`${baseUrl}${path}`, options);
        const text = await response.text();
        let body;
        try {
            body = text ? JSON.parse(text) : undefined;
        } catch {
            throw new Error(`HTTP ${response.status}; response was not JSON`);
        }
        return { response, body };
    };

    const validInput = {
        budget: 4000000,
        cashReserve: 200000,
        bondAlloc: 3000000,
        bondYield: 5.5,
        hibor: 4.15,
        cofRate: 5.0,
        interestBasis: 'hibor',
        spread: 1.3,
        leverageLTV: 90,
        capRate: 9.0,
        handlingFee: 1.0,
        fundSource: 'cash',
        unlockedCash: 0,
        effectiveMortgageRate: 0,
        monthlyMortgagePmt: 0,
        mortgageTenor: 0,
    };

    await check('GET /api/simulate → 405', async () => {
        const { response } = await jsonRequest('/api/simulate', { method: 'GET' });
        if (response.status !== 405) throw new Error(`expected 405, got ${response.status}`);
    });

    await check('GET /api/chat → 405', async () => {
        const { response } = await jsonRequest('/api/chat', { method: 'GET' });
        if (response.status !== 405) throw new Error(`expected 405, got ${response.status}`);
    });

    await check('POST /api/simulate valid input → 200', async () => {
        const { response, body } = await jsonRequest('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: validInput }),
        });
        if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
        if (!body || typeof body !== 'object' || !('output' in body) || !('findings' in body) ||
            !body.meta || typeof body.meta !== 'object' || !('engineVersion' in body.meta)) {
            throw new Error('response missing output, findings, or meta.engineVersion');
        }
    });

    await check('POST /api/simulate empty input → 400 invalid_input', async () => {
        const { response, body } = await jsonRequest('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: {} }),
        });
        if (response.status !== 400 || body?.error !== 'invalid_input') {
            throw new Error(`expected 400 invalid_input, got ${response.status} ${body?.error ?? 'no error'}`);
        }
    });

    await check('POST /api/mcp tools/list → 200 with three tools', async () => {
        const { response, body } = await jsonRequest('/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
        });
        const names = body?.result?.tools?.map(tool => tool.name).sort();
        const expected = ['check_assumptions', 'run_simulation', 'run_stress_test'];
        if (response.status !== 200 || JSON.stringify(names) !== JSON.stringify(expected)) {
            throw new Error(`expected 200 and ${expected.join(', ')}, got ${response.status} and ${names?.join(', ') ?? 'no tools'}`);
        }
    });

    // Not jsonRequest: a 404 here is Vercel's static HTML page, not a JSON body, so
    // parsing it would fail the check for the wrong reason. Only the status matters.
    await check('GET /api/mcp.test → 404', async () => {
        const response = await fetch(`${baseUrl}/api/mcp.test`, { method: 'GET' });
        if (response.status !== 404) throw new Error(`expected 404, got ${response.status}`);
    });

    process.exitCode = failures === 0 ? 0 : 1;
}
