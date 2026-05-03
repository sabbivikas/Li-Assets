import React from "react";
import Svg, { Path } from "react-native-svg";

import { PAINT } from "./theme";
import { wobble } from "./wobble";

export function CrayonUnderline({
  width = 120,
  color = PAINT.sun,
  seed = 4,
}: {
  width?: number;
  color?: string;
  seed?: number;
}) {
  return (
    <Svg width={width} height={10} style={{ marginTop: -2 }}>
      <Path
        d={wobble(2, 5, width - 2, 6, 2, 10, seed)}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.7}
      />
    </Svg>
  );
}
