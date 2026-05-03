import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function LoadingShimmer({ width = "100%", height = 20, borderRadius = 8, style }: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.muted,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SpeciesCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LoadingShimmer width={72} height={72} borderRadius={12} />
      <View style={styles.skeletonContent}>
        <LoadingShimmer width="60%" height={16} borderRadius={6} />
        <LoadingShimmer width="40%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
        <LoadingShimmer width="80%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
});
