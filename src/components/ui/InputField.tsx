import React from 'react';

export const InputField = ({
    label,
    value,
    onChange,
    type = "number",
    prefix = "$",
    step = 1000,
    suffix = "",
    disabled = false,
    dark = false
}: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === "") {
            onChange(0);
            return;
        }
        const num = parseFloat(val);
        if (!isNaN(num)) onChange(num);
    };

    return (
        <div className="mb-5 md:mb-8 relative group">
            <label className={`absolute -top-3 left-0 text-[11px] font-bold uppercase tracking-widest pr-2 transition-colors group-focus-within:text-[#c5a059] ${dark ? 'bg-[#020617] text-slate-500' : 'bg-white text-slate-400'}`}>
                {label}
            </label>
            <div className="relative pt-2">
                {prefix && <span className="absolute left-0 bottom-3 text-slate-400 font-serif text-base md:text-lg">{prefix}</span>}
                <input
                    type={type}
                    value={value === 0 ? "" : value}
                    onChange={handleChange}
                    step={step}
                    disabled={disabled}
                    className={`w-full bg-transparent border-b text-serif text-base md:text-xl py-2 focus:ring-0 focus:border-[#c5a059] focus:outline-none block transition-colors ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-8' : ''} ${dark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'} disabled:text-slate-300 disabled:cursor-not-allowed`}
                    placeholder="0"
                />
                {suffix && <span className="absolute right-0 bottom-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">{suffix}</span>}
            </div>
        </div>
    );
};
