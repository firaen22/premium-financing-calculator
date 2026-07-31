import React, { useId } from 'react';

export const ToggleField = ({ label, checked, onChange, dark = false }: { label: string, checked: boolean, onChange: (val: boolean) => void, dark?: boolean }) => {
    const id = useId();
    return (
        <div className="mb-5 md:mb-8 flex items-center justify-between">
            {/* slate-700 reads 1.95:1 on the #020617 sidebar — dark mode needs slate-300. */}
            <span id={id} className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
            {/* The visual pill stays 48x24; the button itself carries a 44px hit area. */}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={id}
                onClick={() => onChange(!checked)}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] ${dark ? 'focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]' : 'focus-visible:ring-offset-2'} rounded-full`}
            >
                <span className={`w-12 h-6 rounded-full p-1 block transition-colors duration-200 ease-in-out ${checked ? 'bg-[#c5a059]' : dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <span className={`w-4 h-4 bg-white rounded-full shadow-sm block transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
                </span>
            </button>
        </div>
    );
};
