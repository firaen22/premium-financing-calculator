import React, { useId } from 'react';

interface InputFieldProps {
    label: string;
    /** Always numeric — every call site passes a money amount or a rate. */
    value: number;
    onChange: (val: number) => void;
    type?: string;
    /** Rendered before the value; pass "" to suppress the default "$". */
    prefix?: string;
    step?: number;
    suffix?: string;
    disabled?: boolean;
    /** Dark sidebar treatment rather than the light card treatment. */
    dark?: boolean;
}

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
}: InputFieldProps) => {
    const id = useId();
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === "") {
            onChange(0);
            return;
        }
        // Number(), not parseFloat(): parseFloat("1e") is 1 and parseFloat("0x10") is 0,
        // so a half-typed exponent would commit a number the user never entered. Number()
        // returns NaN for those and the finite check then rejects them. Belt-and-braces —
        // a type="number" input already reports "" for input it cannot parse (measured in
        // Chrome: "0.", "-", "1e", "1.2.3", "Infinity", "0x10" all report as "").
        const num = Number(val);
        if (Number.isFinite(num)) onChange(num);
    };

    return (
        <div className="mb-5 md:mb-8 relative group">
            {/* Label colours are contrast-tuned per background: slate-400 reads 7.87:1 on
                the #020617 sidebar but only 2.56:1 on white; slate-500 reads 4.76:1 on
                white but only 4.24:1 on navy — each background gets the shade that
                passes WCAG AA. */}
            <label htmlFor={id} className={`absolute -top-3 left-0 text-[11px] font-bold uppercase tracking-widest pr-2 transition-colors group-focus-within:text-[#c5a059] ${dark ? 'bg-[#020617] text-slate-400' : 'bg-white text-slate-500'}`}>
                {label}
            </label>
            <div className="relative pt-2">
                {prefix && <span className={`absolute left-0 bottom-3 font-serif text-base md:text-lg ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{prefix}</span>}
                <input
                    id={id}
                    type={type}
                    inputMode="decimal"
                    // Was `value === 0 ? "" : value`, which caused both known warts. A real
                    // 0 rendered as an empty field, indistinguishable from "not set"; and
                    // typing "0.5" cleared the field after the "0" — because "0" commits 0,
                    // which then rendered as "". Showing the value plainly fixes both. It
                    // also lets the trailing "." of "0." survive: the browser reports "" for
                    // it so the committed value stays 0, the controlled value is therefore
                    // unchanged, and React leaves the DOM node's text alone.
                    value={value}
                    onChange={handleChange}
                    step={step}
                    disabled={disabled}
                    className={`w-full bg-transparent border-b font-serif text-base md:text-xl py-2 focus:ring-0 focus:border-[#c5a059] focus:outline-none block transition-colors ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-8' : ''} ${dark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'} disabled:text-slate-300 disabled:cursor-not-allowed`}
                    placeholder="0"
                />
                {suffix && <span className={`absolute right-0 bottom-3 text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{suffix}</span>}
            </div>
        </div>
    );
};
