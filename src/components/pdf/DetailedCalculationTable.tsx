import React from 'react';
import { TRANSLATIONS } from '../../i18n/translations';

export const DetailedCalculationTable = ({ dataY10, dataY15, dataY20, dataY30, lang }: any) => {
    if (!dataY10 || !dataY15 || !dataY20 || !dataY30) return null;

    const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];
    const exchangeRate = 7.8;

    const years = [dataY10, dataY15, dataY20, dataY30];

    const rowStyle = "grid grid-cols-5 border-b border-slate-100 py-2 text-[10px]";
    const headerStyle = "grid grid-cols-5 border-b border-slate-900 py-2 text-[10px] font-bold uppercase tracking-wider bg-slate-50";
    const sectionHeaderStyle = "bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest mt-4";

    const f = (val: number, currency: 'USD' | 'HKD') => {
        const amount = currency === 'HKD' ? val * exchangeRate : val;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const CalculationRow = ({ label, dataKey, isNeg = false }: any) => (
        <div className={rowStyle}>
            <div className="pl-3 font-medium text-slate-700">{label}</div>
            {years.map((y, i) => (
                <div key={i} className={`text-right pr-4 font-mono ${isNeg ? 'text-red-600' : 'text-slate-900'}`}>
                    {isNeg ? `(${f(y[dataKey], 'USD')})` : f(y[dataKey], 'USD')}
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
            <CalculationRow label={t.lessCumulativeMortgagePayments} dataKey="cumulativeMortgageCost" isNeg />
            <CalculationRow label={t.lessCumulativeLoanInterests} dataKey="cumulativeInterest" isNeg />

            <div className="grid grid-cols-5 bg-slate-100 py-3 mt-4 border-y border-slate-900 font-bold">
                <div className="pl-3 text-xs">{t.netEquityUsd}</div>
                {years.map((y, i) => (
                    <div key={i} className="text-right pr-4 text-xs font-mono">
                        {f(y ? y.netEquity : 0, 'USD')}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-5 bg-slate-100/50 py-3 border-b border-slate-900 font-bold">
                <div className="pl-3 text-xs font-serif text-[#c5a059]">{t.netEquityHkd}</div>
                {years.map((y, i) => (
                    <div key={i} className="text-right pr-4 text-xs font-mono text-[#c5a059]">
                        {f(y ? y.netEquity : 0, 'HKD')}
                    </div>
                ))}
            </div>
        </div>
    );
};
