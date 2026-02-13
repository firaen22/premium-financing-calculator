import { useState, useEffect } from 'react';

interface HiborData {
    rate: number | null;
    date: string | null;
    loading: boolean;
    error: string | null;
}

export const useHibor = () => {
    const [data, setData] = useState<HiborData>({
        rate: null,
        date: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchHibor = async () => {
            try {
                const response = await fetch('/api/hibor');
                if (!response.ok) {
                    throw new Error('Failed to fetch HIBOR data');
                }
                const result = await response.json();

                setData({
                    rate: result.rate,
                    date: result.date,
                    loading: false,
                    error: null,
                });
            } catch (err: any) {
                console.error('Error fetching HIBOR:', err);
                setData({
                    rate: null,
                    date: null,
                    loading: false,
                    error: err.message || 'Unknown error',
                });
            }
        };

        fetchHibor();
    }, []);

    return data;
};
