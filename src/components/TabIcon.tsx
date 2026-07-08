/**
 * Tab-bar icons, ported 1:1 from the design's inline SVGs
 * (viewBox 0 0 24 24, stroke currentColor, width 1.7, round caps/joins).
 */
import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

export type TabIconName = 'journal' | 'favoris' | 'motdujour';

type Props = { name: TabIconName; size?: number; color: string };

export function TabIcon({ name, size = 23, color }: Props) {
  const common = {
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {name === 'journal' && (
        <>
          <Path d="M4 5h11v14H5a1 1 0 0 1-1-1z" {...common} />
          <Path d="M15 8h4a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-4" {...common} />
          <Line x1={7} y1={9} x2={12} y2={9} {...common} />
          <Line x1={7} y1={12} x2={12} y2={12} {...common} />
          <Line x1={7} y1={15} x2={10} y2={15} {...common} />
        </>
      )}
      {name === 'favoris' && (
        <Path
          d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"
          {...common}
        />
      )}
      {name === 'motdujour' && (
        <>
          <Path d="M3 5.5c2.4-1 5.4-1 8 .6v12.4c-2.6-1.5-5.6-1.5-8-.6z" {...common} />
          <Path d="M21 5.5c-2.4-1-5.4-1-8 .6v12.4c2.4-1.5 5.6-1.5 8-.6z" {...common} />
        </>
      )}
    </Svg>
  );
}
