import React from 'react';
import { TRANSLATIONS } from '../../i18n/translations';

export const DetailedCalculationTable = ({ dataY10, dataY15, dataY20, dataY30, lang, fxRate }: any) => {
    if (!dataY10 || !dataY15 || !dataY20 || !dataY30) return null;

    const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];
    // Keep this fallback aligned with calculations.ts so the USD row uses the same rate
    // the engine used when banding the rebate.
    const exchangeRate = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 7.8;

    const years = [dataY10, dataY15, dataY20, dataY30];

    const rowStyle = "grid grid-cols-5 border-b border-slate-100 py-2 text-[10px]";
    const headerStyle = "grid grid-cols-5 border-b border-slate-900 py-2 text-[10px] font-bold uppercase tracking-wider bg-slate-50";
    const sectionHeaderStyle = "bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest mt-4";

    // The engine works in HKD throughout (Phase 4 converts to USD by DIVIDING by the FX
    // rate to band the rebate — see `premiumUsd` in calculations.ts). This table used to
    // label the raw figures "USD" and then MULTIPLY by 7.8 for its "HKD" row, which both
    // mislabelled the base column and overstated the HKD row by 7.8x.
    const f = (val: number, currency: 'USD' | 'HKD') => {
        const amount = currency === 'USD' ? val / exchangeRate : val;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // IRR is legitimately absent for a cash-flow vector with no sign change, and the
    // engine reports that as null rather than a fabricated rate. Render it as such.
    const pct = (val: number | null | undefined) =>
        val === null || val === undefined || !Number.isFinite(val) ? t.notApplicable : `${val.toFixed(1)}%`;

    const MetricRow = ({ label, dataKey }: any) => (
        <div className={rowStyle}>
            <div className="pl-3 font-medium text-slate-700">{label}</div>
            {years.map((y, i) => {
                const v = y[dataKey];
                const isNum = typeof v === 'number' && Number.isFinite(v);
                return (
                    <div key={i} className={`text-right pr-4 font-mono ${isNum && v < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {pct(v)}
                    </div>
                );
            })}
        </div>
    );

    const CalculationRow = ({ label, dataKey, isNeg = false }: any) => (
        <div className={rowStyle}>
            <div className="pl-3 font-medium text-slate-700">{label}</div>
            {years.map((y, i) => (
                <div key={i} className={`text-right pr-4 font-mono ${isNeg ? 'text-red-600' : 'text-slate-900'}`}>
                    {isNeg ? `(${f(y[dataKey], 'HKD')})` : f(y[dataKey], 'HKD')}
                </div>
            ))}
        </div>
    );

    return (
        <div className="w-full">
            <div className={headerStyle}>
                <div className="pl-3">{t.item}</div>
                <div className="text-right pr-4">{t.yearHeader.replace('{year}', '10')}</div>
                <div className="text-right pr-4">{t.yearHeader.replace('{year}', '15')}</div>
                <div className="text-right pr-4">{t.yearHeader.replace('{year}', '20')}</div>
                <div className="text-right pr-4">{t.yearHeader.replace('{year}', '30')}</div>
            </div>

            <div className={sectionHeaderStyle}>{t.netEquityInheritance}</div>
            <CalculationRow label={t.policySurrenderValue} dataKey="surrenderValue" />
            <CalculationRow label={t.bondPrincipalNetLabel} dataKey="bondPrincipal" />
            <CalculationRow label={t.reserveCash} dataKey="cashValue" />
            <CalculationRow label={t.lessPolicyLoan} dataKey="loan" isNeg />
            <CalculationRow label={t.lessMortgageBalance} dataKey="mortgageBalance" isNeg />

            <div className={sectionHeaderStyle}>{t.cumulativeCashFlow}</div>
            <CalculationRow label={t.cumulativeBondInterest} dataKey="cumulativeBondInterest" />
            {/* No "less cumulative mortgage payments" row here: netEquity below only ever
                deducts the mortgage's current outstanding balance (the row above), not the
                cash paid toward it. Printing cumulativeMortgageCost (principal+interest)
                as a further deduction double-charged the principal already reflected in
                the declining balance row, so this section's rows summed to $17.5M below
                the NET EQUITY total printed underneath on a 30-year mortgage case. */}
            <CalculationRow label={t.lessCumulativeLoanInterests} dataKey="cumulativeInterest" isNeg />

            <div className="grid grid-cols-5 bg-slate-100 py-3 mt-4 border-y border-slate-900 font-bold">
                <div className="pl-3 text-xs">{t.netEquityHkd}</div>
                {years.map((y, i) => (
                    <div key={i} className="text-right pr-4 text-xs font-mono">
                        {f(y ? y.netEquity : 0, 'HKD')}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-5 bg-slate-100/50 py-3 border-b border-slate-900 font-bold">
                <div className="pl-3 text-xs font-serif text-[#c5a059]">{t.netEquityUsd}</div>
                {years.map((y, i) => (
                    <div key={i} className="text-right pr-4 text-xs font-mono text-[#c5a059]">
                        {f(y ? y.netEquity : 0, 'USD')}
                    </div>
                ))}
            </div>

            <div className={sectionHeaderStyle}>{t.returnMetrics}</div>
            <MetricRow label={t.cumulativeRoiRow} dataKey="roi" />
            <MetricRow label={t.averageReturnRow} dataKey="averageReturn" />
            <MetricRow label={t.irrRow} dataKey="irr" />
        </div>
    );
};
