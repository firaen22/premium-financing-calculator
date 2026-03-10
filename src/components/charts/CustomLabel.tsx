import React from 'react';

export const CustomLabel = React.memo((props: any) => {
    const { x, y, value, index, name, color } = props;
    // Last index is 30 for 30-year projection (0-30)
    if (index === 30) {
        return (
            <text
                x={x + 10}
                y={y}
                dy={4}
                fill={color}
                fontSize={11}
                fontFamily="sans-serif"
                fontWeight="bold"
                textAnchor="start"
            >
                {name}
            </text>
        );
    }
    return null;
});
