import React, { createContext, useContext, useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TRANSLATIONS, type Labels } from '../i18n';

export type AppState = ReturnType<typeof useAppState> & { t: Labels };

const AppStateContext = createContext<AppState | null>(null);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
    const state = useAppState();
    const t = useMemo(() => TRANSLATIONS[state.lang], [state.lang]);
    return (
        <AppStateContext.Provider value={{ ...state, t }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useApp = (): AppState => {
    const ctx = useContext(AppStateContext);
    if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
    return ctx;
};
