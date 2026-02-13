import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set Cache-Control to cache headers for 1 hour (3600 seconds)
    // s-maxage controls Vercel's edge cache
    // stale-while-revalidate allows serving stale content while fetching new data in background
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');

    try {
        // HKMA Open API Endpoint for Daily Interbank Liquidity
        const apiUrl = 'https://api.hkma.gov.hk/public/market-data-and-statistics/daily-monetary-statistics/daily-figures-interbank-liquidity?segment=hibor&offset=0&limit=1';

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HKMA API fetch failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.header && data.header.success && data.result && data.result.records && data.result.records.length > 0) {
            const record = data.result.records[0];
            const hibor1M = record['hibor_fixing_1m'];
            const date = record['end_of_date'];

            if (hibor1M !== undefined) {
                return res.status(200).json({
                    rate: hibor1M,
                    date: date,
                    source: 'HKMA API'
                });
            }
        }

        // If structure doesn't match or no data
        return res.status(500).json({ error: 'Data parsing failed or no records found', raw: data });

    } catch (error: any) {
        console.error('HIBOR Fetch Error:', error);
        return res.status(500).json({ error: 'Failed to fetch HIBOR rate', details: error.message });
    }
}
