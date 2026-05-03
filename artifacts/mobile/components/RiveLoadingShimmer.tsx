import React from "react";
import { View, type ViewStyle } from "react-native";

import { LoadingShimmer } from "@/components/LoadingShimmer";
import { RiveAnimation, riveAssets } from "@/components/RiveAnimation";

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  /**
   * When true, render the shared Rive loading scene at the given size
   * instead of a per-shape shimmer. Use for hero/empty placeholders.
   */
  hero?: boolean;
}

/**
 * Drop-in replacement for <LoadingShimmer />. For inline shape-shaped
 * skeletons we keep the lightweight RN-Animated shimmer (Rive would be
 * overkill at that size). For the larger "hero" slot — used for tab-level
 * loading and empty placeholders — it switches to the shared Rive scene
 * with a graceful fallback.
 */
export function RiveLoadingShimmer({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
  hero = false,
}: Props) {
  if (!hero) {
    return (
      <LoadingShimmer
        width={width}
        height={height}
        borderRadius={borderRadius}
        style={style}
      />
    );
  }

  const w = typeof width === "number" ? width : 160;
  const h = typeof height === "number" ? height : 160;

  return (
    <RiveAnimation
      source={riveAssets.loading}
      style={[{ width: w, height: h }, style]}
      fallback={
        <View
          style={{
            width: w,
            height: h,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LoadingShimmer
            width={w * 0.7}
            height={h * 0.5}
            borderRadius={borderRadius || 16}
          />
        </View>
      }
    />
  );
}

export { SpeciesCardSkeleton } from "@/components/LoadingShimmer";
