import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { RiveAnimation, riveAssets } from "@/components/RiveAnimation";

interface Props {
  size?: number;
  /** True while location is actively being requested. */
  locating?: boolean;
}

/**
 * User location pin overlay used by the map and onboarding. The Rive scene
 * exposes `locating` and `located` inputs to switch between the looping
 * search animation and the settled pulse. Falls back to a simple
 * Reanimated pulse + pin combo when Rive isn't available.
 */
export function RiveLocationPin({ size = 80, locating = false }: Props) {
  const inputs = useMemo(
    () => ({ locating, located: !locating }),
    [locating],
  );

  return (
    <RiveAnimation
      source={riveAssets.pin}
      inputs={inputs}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
      fallback={<FallbackPin size={size} locating={locating} />}
    />
  );
}

function FallbackPin({ size, locating }: { size: number; locating: boolean }) {
  const ring = useSharedValue(0);

  React.useEffect(() => {
    ring.value = 0;
    ring.value = withRepeat(
      withTiming(1, {
        duration: locating ? 1400 : 2200,
        easing: Easing.out(Easing.quad),
      }),
      -1,
      false,
    );
  }, [locating, ring]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 - ring.value * 0.55,
    transform: [{ scale: 0.6 + ring.value * 1.6 }],
  }));

  const dotSize = size * 0.42;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: locating ? "#22D3EE" : "#4ADE80",
          },
          ringStyle,
        ]}
      />
      <View style={[styles.pin, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]}>
        <Feather name="map-pin" size={dotSize * 0.55} color="#080C14" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    backgroundColor: "#4ADE80",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF40",
    shadowColor: "#4ADE80",
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
});
