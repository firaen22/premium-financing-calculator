import React from 'react';

const GAP = 13;

export const EndLabels = React.memo((props: any) => {
    const { formattedGraphicalItems, offset, labels } = props;

    if (!Array.isArray(formattedGraphicalItems) || !Array.isArray(labels) || !offset) {
        return null;
    }

    const offsetTop = Number(offset.top);
    const offsetHeight = Number(offset.height);
    if (!Number.isFinite(offsetTop) || !Number.isFinite(offsetHeight)) {
        return null;
    }

    const anchors: Array<{ dataKey: string; anchorY: number; anchorX: number; name: string; color: string }> = [];

    for (const label of labels) {
        // recharts exposes dataKey on the source element (item.props), not on the
        // computed geometry (props) — the latter is undefined, which silently
        // matches nothing and drops every label.
        const item = formattedGraphicalItems.find((graphicalItem: any) => graphicalItem?.item?.props?.dataKey === label.dataKey);
        if (!item) {
            continue;
        }

        const points = item.props?.points;
        const point = Array.isArray(points) && points.length > 0 ? points[points.length - 1] : null;
        const anchorX = Number(point?.x);
        const anchorY = Number(point?.y);
        if (!point || !Number.isFinite(anchorX) || !Number.isFinite(anchorY)) {
            return null;
        }

        anchors.push({ dataKey: label.dataKey, anchorY, anchorX, name: label.name, color: label.color });
    }

    if (anchors.length === 0) {
        return null;
    }

    const sortedAnchors = anchors
        .map((anchor, originalIndex) => ({ anchor, originalIndex }))
        .sort((a, b) => a.anchor.anchorY - b.anchor.anchorY || a.originalIndex - b.originalIndex)
        .map(({ anchor }) => anchor);
    const labelY: number[] = [];
    for (let index = 0; index < sortedAnchors.length; index += 1) {
        labelY[index] = sortedAnchors[index].anchorY;
        if (index > 0 && labelY[index] - labelY[index - 1] < GAP) {
            labelY[index] = labelY[index - 1] + GAP;
        }
    }

    const maxY = offsetTop + offsetHeight;
    if (labelY[labelY.length - 1] > maxY) {
        const shift = labelY[labelY.length - 1] - maxY;
        for (let index = 0; index < labelY.length; index += 1) {
            labelY[index] -= shift;
        }
    }

    for (let index = labelY.length - 2; index >= 0; index -= 1) {
        labelY[index] = Math.min(labelY[index], labelY[index + 1] - GAP);
    }

    if (labelY[0] < offsetTop) {
        labelY[0] = offsetTop;
        for (let index = 1; index < labelY.length; index += 1) {
            labelY[index] = sortedAnchors[index].anchorY;
            if (labelY[index] - labelY[index - 1] < GAP) {
                labelY[index] = labelY[index - 1] + GAP;
            }
        }
    }

    return (
        <g>
            {sortedAnchors.map((anchor, index) => {
                const displacement = Math.abs(labelY[index] - anchor.anchorY);
                return (
                    <React.Fragment key={anchor.dataKey}>
                        {displacement > 2 && (
                            <polyline
                                points={`${anchor.anchorX + 2},${anchor.anchorY} ${anchor.anchorX + 8},${labelY[index]}`}
                                stroke={anchor.color}
                                strokeWidth={1}
                                strokeOpacity={0.5}
                                fill="none"
                            />
                        )}
                        <text
                            x={anchor.anchorX + 10}
                            y={labelY[index]}
                            dy={4}
                            fill={anchor.color}
                            fontSize={11}
                            fontFamily="sans-serif"
                            fontWeight="bold"
                            textAnchor="start"
                        >
                            {anchor.name}
                        </text>
                    </React.Fragment>
                );
            })}
        </g>
    );
});
