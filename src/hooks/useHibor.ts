import { useState, useEffect, useCallback } from 'react';

interface HiborData {
    rate: number | null;
    date: string | null;
    loading: boolean;
    error: string | null;
    isStale: boolean;
    refresh: () => void;
}

const CACHE_KEY = 'pf_hibor_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const useHibor = (): HiborData => {
    const [data, setData] = useState<Omit<HiborData, 'refresh'>>(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const isStale = Date.now() - parsed.timestamp > CACHE_EXPIRY;
                return {
                    rate: parsed.rate,
                    date: parsed.date,
                    loading: !parsed.rate || isStale,
                    error: null,
                    isStale
                };
            } catch (e) {
                // Ignore parse errors
            }
        }
        return {
            rate: null,
            date: null,
            loading: true,
            error: null,
            isStale: false,
        };
    });

    const fetchHibor = useCallback(async (retryCount = 0) => {
        setData(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await fetch('https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/hk-interbank-ir-daily?segment=1-month');
            if (!response.ok) {
                throw new Error('Failed to fetch HIBOR data from HKMA');
            }
            const dataObj = await response.json();
            
            if (!dataObj.result || !dataObj.result.records || dataObj.result.records.length === 0) {
                throw new Error('Invalid HIBOR data format from HKMA');
            }
            
            // The records are typically chronological, the first one is usually the most recent end_of_day but let's take the first one securely or rely on their sort
            const latestRecord = dataObj.result.records[0];
            const rate = latestRecord.ir_1m;
            const date = latestRecord.end_of_day;

            const newData = {
                rate,
                date,
                timestamp: Date.now()
            };

            localStorage.setItem(CACHE_KEY, JSON.stringify(newData));

            setData({
                rate,
                date,
                loading: false,
                error: null,
                isStale: false,
            });
        } catch (err: any) {
            if (retryCount < 3) {
                const backoff = Math.pow(2, retryCount) * 1000;
                setTimeout(() => fetchHibor(retryCount + 1), backoff);
            } else {
                console.error('Error fetching HIBOR after retries:', err);
                setData(prev => ({
                    ...prev,
                    loading: false,
                    error: err.message || 'Unknown error',
                }));
            }
        }
    }, []);

    useEffect(() => {
        if (!data.rate || data.isStale) {
            fetchHibor().catch(console.error);
        }
    }, [fetchHibor, data.rate, data.isStale]);

    return { ...data, refresh: () => fetchHibor(0) };
};
