import React from "react";
import Svg, { G, Path } from "react-native-svg";

import { PAINT } from "./theme";

export function Sparkle({
  size = 8,
  color = PAINT.sun,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <Svg width={s * 2.4} height={s * 2.4} viewBox={`-${s * 1.2} -${s * 1.2} ${s * 2.4} ${s * 2.4}`}>
      <G>
        <Path
          d={`M 0 ${-s} L ${s * 0.3} ${-s * 0.3} L ${s} 0 L ${s * 0.3} ${s * 0.3} L 0 ${s} L ${-s * 0.3} ${s * 0.3} L ${-s} 0 L ${-s * 0.3} ${-s * 0.3} Z`}
          fill={color}
          stroke={PAINT.ink}
          strokeWidth={1.2}
        />
      </G>
    </Svg>
  );
}
