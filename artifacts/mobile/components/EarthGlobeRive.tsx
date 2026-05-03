import React, { useMemo } from "react";
import { StyleSheet } from "react-native";

import { EarthGlobe } from "@/components/EarthGlobe";
import { RiveAnimation, riveAssets } from "@/components/RiveAnimation";

interface Props {
  size?: number;
  pinLat?: number | null;
  pinLng?: number | null;
  /** 0..1 — drives a "density" input on the Rive state machine when present. */
  density?: number;
  /** True while we're actively requesting location. */
  locating?: boolean;
}

/**
 * Home-screen earth visualization. On a dev build with rive-react-native
 * linked, this renders the Rive `globe.riv` scene driven by app state
 * (locating, located, density). On Expo Go / web / when the module is
 * unavailable, it falls back to the existing SVG-based <EarthGlobe />.
 */
export function EarthGlobeRive({
  size = 260,
  pinLat = null,
  pinLng = null,
  density,
  locating,
}: Props) {
  const located = pinLat != null && pinLng != null;

  const inputs = useMemo(
    () => ({
      locating: !!locating,
      located,
      density: typeof density === "number" ? Math.max(0, Math.min(1, density)) : 0,
    }),
    [locating, located, density],
  );

  return (
    <RiveAnimation
      source={riveAssets.globe}
      inputs={inputs}
      style={{ ...styles.frame, width: size, height: size }}
      fallback={<EarthGlobe size={size} pinLat={pinLat} pinLng={pinLng} />}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
  },
});
