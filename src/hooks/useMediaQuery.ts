import { useState, useEffect } from 'react';

/**
 * Subscribes to a CSS media query.
 *
 * Recharts is configured with JS props, not CSS classes, so chart geometry
 * (margins, whether end-of-series labels are drawn) cannot be made responsive with
 * Tailwind breakpoints alone.
 */
export const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(query).matches
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia(query);
        const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
        setMatches(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);

    return matches;
};

/** Stock Tailwind `md` breakpoint — at or above 768px. */
export const useIsMdUp = () => useMediaQuery('(min-width: 768px)');
