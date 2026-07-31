import React, { useId } from 'react';
import { ChevronRight } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: SelectOption[];
    disabled?: boolean;
}

export const SelectField = ({ label, value, onChange, options, disabled = false }: SelectFieldProps) => {
    const id = useId();
    return (
        <div className="mb-5 md:mb-8 relative group">
            <label htmlFor={id} className="absolute -top-2.5 left-0 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white pr-2 group-focus-within:text-[#c5a059]">
                {label}
            </label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full bg-transparent border-b border-slate-200 text-slate-900 font-serif text-lg md:text-xl min-h-[44px] py-1 pt-2 focus:ring-0 focus:border-[#c5a059] focus:outline-none block disabled:text-slate-300 disabled:cursor-not-allowed appearance-none rounded-none"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <ChevronRight className="absolute right-0 bottom-3 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
        </div>
    );
};
