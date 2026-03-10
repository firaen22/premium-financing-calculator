import React from 'react';
import { Home, Briefcase } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

export const FlowDiagram = ({
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
        <div className="w-full h-full flex justify-center py-0" style={{ minHeight: '350px' }}>
            {/* Increased viewBox width to 500 for more breathing room for larger blocks, height to 600 */}
            <svg viewBox="0 0 500 500" className="w-full h-full max-w-[500px]" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
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

                <g transform="translate(25,10) scale(1.0)">
                    {/* Level 1: Capital */}
                    <g filter="url(#shadow)">
                        <rect x="130" y="10" width="240" height="80" rx="8" fill="#ffffff" stroke={sourceType === 'mortgage' ? '#f59e0b' : '#e2e8f0'} strokeWidth={sourceType === 'mortgage' ? 2 : 1} />
                        <circle cx="170" cy="50" r="22" fill={sourceType === 'mortgage' ? '#fffbeb' : '#f8fafc'} stroke={sourceType === 'mortgage' ? '#fcd34d' : '#f1f5f9'} />
                        {sourceType === 'mortgage' ? (
                            <Home x={158} y={38} width={24} height={24} stroke="#b45309" strokeWidth={1.5} />
                        ) : (
                            <Briefcase x={158} y={38} width={24} height={24} stroke="#0f172a" strokeWidth={1.5} />
                        )}

                        {/* Capital */}
                        <text x={210} y={42} textAnchor="start" fill="#64748b" fontSize="12" fontWeight="bold" letterSpacing="1.5" style={{ textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{labels.capital}</text>
                        <text x={210} y={68} textAnchor="start" fill="#0f172a" fontSize="22" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(budget)}</text>
                    </g>

                    {/* Connectors */}
                    <path d="M250 90 L 250 100" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />

                    {/* Level 2: Allocation */}
                    <g transform="translate(0, 110)">
                        {/* Cash/Liquidity */}
                        <g filter="url(#shadow)">
                            <rect x="0" y="0" width="240" height="70" rx="6" fill="#f0fdf4" stroke="#dcfce7" strokeWidth="1" />
                            <text x="20" y="25" fill="#16a34a" fontSize="10" fontWeight="bold" letterSpacing="1">{labels.liquidity}</text>
                            <text x="20" y="52" fill="#166534" fontSize="18" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(cash)}</text>
                        </g>

                        {/* Yield Fund */}
                        <g filter="url(#shadow)" transform="translate(260, 0)">
                            <rect x="0" y="0" width="240" height="70" rx="6" fill="#f0f9ff" stroke="#e0f2fe" strokeWidth="1" />
                            <text x="20" y="25" fill="#0284c7" fontSize="10" fontWeight="bold" letterSpacing="1">{labels.yieldFundNet}</text>
                            <text x="20" y="52" fill="#075985" fontSize="18" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(bond)}</text>
                        </g>

                        {/* Policy Equity */}
                        <g filter="url(#shadow)" transform="translate(130, 90)">
                            <rect x="0" y="0" width="240" height="70" rx="6" fill="#fff7ed" stroke="#ffedd5" strokeWidth="1" />
                            <text x="20" y="25" fill="#ea580c" fontSize="10" fontWeight="bold" letterSpacing="1">{labels.policyEquityCaps}</text>
                            <text x="20" y="52" fill="#9a3412" fontSize="18" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(equity)}</text>
                        </g>

                        {/* Path from Capital to Level 2 */}
                        <path d="M250 -20 L 250 10 M 250 10 L 120 10 L 120 0 M 250 10 L 380 10 L 380 0 M 250 10 L 250 90" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />
                    </g>

                    {/* Level 3: Leverage & Total Policy */}
                    <g transform="translate(0, 310)">
                        {/* Bank Loan */}
                        <g filter="url(#shadow)">
                            <rect x="0" y="0" width="200" height="140" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                            <text x="100" y="50" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold" letterSpacing="1.5">{labels.leverage}</text>
                            <text x="100" y="90" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(loan)}</text>
                            <path d="M200 70 L 230 70" fill="none" stroke="#c5a059" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-gold)" />
                        </g>

                        {/* Total Exposure */}
                        <g filter="url(#shadow)" transform="translate(250, 0)">
                            <rect x="0" y="0" width="250" height="140" rx="8" fill="#ffffff" stroke="#c5a059" strokeWidth="2" />
                            <rect x="0" y="0" width="250" height="30" rx="8" fill="#c5a059" clipPath="inset(0 0 110 0)" />
                            <text x="125" y="20" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" letterSpacing="1">{labels.totalExposure}</text>
                            <text x="125" y="85" textAnchor="middle" fill="#0f172a" fontSize="28" fontWeight="500" style={{ fontFamily: 'serif' }}>{formatCurrency(premium)}</text>
                            <text x="125" y="115" textAnchor="middle" fill="#c5a059" fontSize="10" fontWeight="bold" style={{ textTransform: 'uppercase' }}>Assets Preserved</text>
                        </g>

                        {/* Connector from Level 2 to Leverage */}
                        <path d="M250 -40 L 250 -20" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />
                    </g>
                </g>
            </svg>
        </div>
    );
};
