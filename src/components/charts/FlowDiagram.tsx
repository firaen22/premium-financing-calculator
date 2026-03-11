import React from 'react';
import { Home, Briefcase } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

export const FlowDiagram = React.memo(({
    budget,
    cash,
    bond,
    equity,
    loan,
    premium,
    labels,
    sourceType
}: {
    budget: number, cash: number, bond: number, equity: number, loan: number, premium: number, labels: any, sourceType: 'cash' | 'mortgage'
}) => {
    return (
        <div className="w-full h-full flex justify-center py-4" style={{ minHeight: '400px' }}>
            <svg viewBox="0 0 700 400" className="w-full h-full max-w-[800px]" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.1" />
                    </filter>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                    </marker>
                    <marker id="arrow-gold" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#c5a059" />
                    </marker>
                </defs>

                <g transform="translate(0,10)">
                    {/* Paths */}
                    {/* Capital to Yield Fund */}
                    <path d="M 350 80 L 350 110 L 120 110 L 120 135" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Capital to Liquidity */}
                    <path d="M 350 80 L 350 110 L 580 110 L 580 135" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Capital to Policy Equity */}
                    <path d="M 350 80 L 350 135" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Policy Equity to Total Exposure */}
                    <path d="M 350 210 L 350 255" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Leverage to Total Exposure */}
                    <path d="M 490 320 L 474 320" fill="none" stroke="#c5a059" strokeWidth="2" markerEnd="url(#arrow-gold)" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Capital (Top Center) */}
                    <g filter="url(#shadow)" transform="translate(230, 0)">
                        <rect x="0" y="0" width="240" height="80" rx="8" fill="#ffffff" stroke={sourceType === 'mortgage' ? '#f59e0b' : '#e2e8f0'} strokeWidth={sourceType === 'mortgage' ? 2 : 1} />
                        <circle cx="40" cy="40" r="22" fill={sourceType === 'mortgage' ? '#fffbeb' : '#f8fafc'} stroke={sourceType === 'mortgage' ? '#fcd34d' : '#f1f5f9'} />
                        {sourceType === 'mortgage' ? (
                            <Home x={28} y={28} width={24} height={24} stroke="#b45309" strokeWidth={1.5} />
                        ) : (
                            <Briefcase x={28} y={28} width={24} height={24} stroke="#0f172a" strokeWidth={1.5} />
                        )}
                        <text x="80" y="32" textAnchor="start" fill="#64748b" fontSize="12" fontWeight="bold" letterSpacing="1.5" style={{ textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{labels.capital}</text>
                        <text x="80" y="58" textAnchor="start" fill="#0f172a" fontSize="22" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(budget)}</text>
                    </g>

                    {/* Yield Fund (Left) */}
                    <g filter="url(#shadow)" transform="translate(10, 140)">
                        <rect x="0" y="0" width="220" height="70" rx="6" fill="#f0f9ff" stroke="#e0f2fe" strokeWidth="1" />
                        <text x="20" y="25" fill="#0284c7" fontSize="10" fontWeight="bold" letterSpacing="1">{labels.yieldFundNet}</text>
                        <text x="20" y="52" fill="#075985" fontSize="18" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(bond)}</text>
                    </g>

                    {/* Policy Equity (Center) */}
                    <g filter="url(#shadow)" transform="translate(240, 140)">
                        <rect x="0" y="0" width="220" height="70" rx="6" fill="#fff7ed" stroke="#ffedd5" strokeWidth="1" />
                        <text x="20" y="25" fill="#ea580c" fontSize="10" fontWeight="bold" letterSpacing="1">{labels.policyEquityCaps}</text>
                        <text x="20" y="52" fill="#9a3412" fontSize="18" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(equity)}</text>
                    </g>

                    {/* Liquidity (Right) */}
                    <g filter="url(#shadow)" transform="translate(470, 140)">
                        <rect x="0" y="0" width="220" height="70" rx="6" fill="#f0fdf4" stroke="#dcfce7" strokeWidth="1" />
                        <text x="20" y="25" fill="#16a34a" fontSize="10" fontWeight="bold" letterSpacing="1">{labels.liquidity}</text>
                        <text x="20" y="52" fill="#166534" fontSize="18" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(cash)}</text>
                    </g>

                    {/* Total Exposure (Bottom Center) */}
                    <g filter="url(#shadow)" transform="translate(225, 260)">
                        <rect x="0" y="0" width="250" height="120" rx="8" fill="#ffffff" stroke="#c5a059" strokeWidth="2" />
                        <rect x="0" y="0" width="250" height="30" rx="8" fill="#c5a059" clipPath="inset(0 0 90 0)" />
                        <text x="125" y="20" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" letterSpacing="1">{labels.totalExposure}</text>
                        <text x="125" y="65" textAnchor="middle" fill="#c5a059" fontSize="10" fontWeight="bold" style={{ textTransform: 'uppercase' }}>{labels.assetsPreserved}</text>
                        <text x="125" y="100" textAnchor="middle" fill="#0f172a" fontSize="26" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(premium)}</text>
                    </g>

                    {/* Leverage (Bottom Right) */}
                    <g filter="url(#shadow)" transform="translate(490, 260)">
                        <rect x="0" y="0" width="200" height="120" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                        <text x="100" y="45" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold" letterSpacing="1.5">{labels.leverage}</text>
                        <text x="100" y="85" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(loan)}</text>
                    </g>
                </g>
            </svg>
        </div>
    );
});
