import React from 'react';
import { Landmark, Briefcase, Coins, Mountain, ShieldCheck, Building2 } from 'lucide-react';
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
    const Box = ({ x, y, width, height, color, title, value, icon: Icon }: any) => {
        return (
            <g transform={`translate(${x}, ${y})`} filter="url(#shadow)">
                <rect width={width} height={height} rx="8" fill="#ffffff" stroke={color} strokeWidth="2" />
                <rect width={width} height="36" rx="8" fill={color} clipPath={`inset(0 0 ${height-36} 0)`} />
                <text x={width/2} y="24" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold" style={{ fontFamily: 'sans-serif' }}>{title}</text>
                <Icon x={width/2 - 20} y="48" width="40" height="40" stroke={color} strokeWidth="1.5" />
                <text x={width/2} y="115" textAnchor="middle" fill="#0f172a" fontSize="20" fontWeight="bold" style={{ fontFamily: 'serif' }}>{value}</text>
            </g>
        );
    };

    return (
        <div className="w-full h-full flex justify-center py-4" style={{ minHeight: '550px' }}>
            <svg viewBox="0 0 800 550" className="w-full h-full max-w-[800px]" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                <defs>
                    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.1" />
                    </filter>
                    <marker id="arrow-down" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth">
                        <path d="M0,0 L10,5 L0,10 z" fill="#f59e0b" />
                    </marker>
                    <marker id="arrow-left" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth">
                        <path d="M10,0 L0,5 L10,10 z" fill="#f59e0b" />
                    </marker>
                </defs>

                <g transform="translate(0, 10)">
                    {/* Arrows drawn first so they are under the boxes */}
                    
                    {/* budget to bond */}
                    <path d="M 360 140 L 200 190" fill="none" stroke="#fcd34d" strokeWidth="6" markerEnd="url(#arrow-down)" strokeLinecap="round" />
                    {/* budget to cash */}
                    <path d="M 440 140 L 600 190" fill="none" stroke="#fcd34d" strokeWidth="6" markerEnd="url(#arrow-down)" strokeLinecap="round" />
                    {/* budget to equity */}
                    <path d="M 400 150 L 400 190" fill="none" stroke="#fcd34d" strokeWidth="6" markerEnd="url(#arrow-down)" strokeLinecap="round" />
                    
                    {/* equity to premium */}
                    <path d="M 400 340 L 400 370" fill="none" stroke="#fcd34d" strokeWidth="6" markerEnd="url(#arrow-down)" strokeLinecap="round" />
                    
                    {/* loan to premium (pointing left) */}
                    <path d="M 560 450 L 520 450" fill="none" stroke="#fcd34d" strokeWidth="6" markerEnd="url(#arrow-left)" strokeLinecap="round" />

                    {/* Nodes (Boxes) */}
                    {/* Row 1 */}
                    <Box x={290} y={10} width={220} height={140} color="#f59e0b" title={labels.capital} value={formatCurrency(budget)} icon={Coins} />

                    {/* Row 2 */}
                    <Box x={20} y={200} width={220} height={140} color="#65a30d" title={labels.yieldFundNet} value={formatCurrency(bond)} icon={Landmark} />
                    <Box x={290} y={200} width={220} height={140} color="#22c55e" title={labels.policyEquityCaps} value={formatCurrency(equity)} icon={Mountain} />
                    <Box x={560} y={200} width={220} height={140} color="#f59e0b" title={labels.liquidity} value={formatCurrency(cash)} icon={Briefcase} />

                    {/* Row 3 */}
                    <Box x={290} y={380} width={220} height={140} color="#16a34a" title={labels.totalExposure} value={formatCurrency(premium)} icon={ShieldCheck} />
                    <Box x={560} y={380} width={220} height={140} color="#64748b" title={labels.leverage} value={formatCurrency(loan)} icon={Building2} />
                </g>
            </svg>
        </div>
    );
});
