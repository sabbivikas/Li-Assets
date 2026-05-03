import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { SpeciesSelection } from "./SpeciesBottomSheet";

interface Props {
  pins: SpeciesSelection[] | null;
  onClose: () => void;
  onSelect: (pin: SpeciesSelection) => void;
}

const HIDDEN_Y = 600;

/**
 * Cluster expansion sheet. Shown when the user taps a photo-stack
 * cluster on the map. Lists each unique species inside the cluster
 * with thumbnail + common name + role pill; tapping a row hands the
 * species off to the host so the regular SpeciesBottomSheet can open.
 */
export function SpeciesListSheet({ pins, onClose, onSelect }: Props) {
  const translateY = useSharedValue(HIDDEN_Y);
  const opacity = useSharedValue(0);
  const startY = useSharedValue(0);
  const [rendered, setRendered] = useState<SpeciesSelection[] | null>(pins);

  useEffect(() => {
    if (pins && pins.length > 0) {
      setRendered(pins);
      translateY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 });
      opacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(HIDDEN_Y, {
        duration: 240,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      opacity.value = withTiming(0, { duration: 200 }, (done) => {
        if (done) runOnJS(setRendered)(null);
      });
    }
  }, [pins, opacity, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      translateY.value = next < 0 ? next * 0.2 : next;
    })
    .onEnd((e) => {
      if (translateY.value > 80 || e.velocityY > 600) {
        translateY.value = withTiming(HIDDEN_Y, { duration: 220 });
        opacity.value = withTiming(0, { duration: 180 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, {
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        });
      }
    });

  const list = rendered ?? [];
  const count = list.length;

  return (
    <Modal
      visible={!!rendered && rendered.length > 0}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Pan gesture is scoped to the grab area only — attaching it
            to the whole sheet would steal vertical drags from the
            list and make scrolling unreliable on native. */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.grabArea}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Feather name="layers" size={14} color="#4ADE80" />
              <Text style={styles.headerText}>
                {count} {count === 1 ? "species" : "species"} in this cluster
              </Text>
            </View>
          </View>
        </GestureDetector>
        <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {list.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onSelect(p)}
                style={({ pressed }) => [
                  styles.row,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                {p.photoUrl ? (
                  <Image source={{ uri: p.photoUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Feather name="image" size={18} color="#475569" />
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.scientificName && (
                    <Text style={styles.rowSci} numberOfLines={1}>
                      {p.scientificName}
                    </Text>
                  )}
                </View>
                {p.role && (
                  <View
                    style={[
                      styles.rolePill,
                      { backgroundColor: (p.roleColor || "#4ADE80") + "22" },
                    ]}
                  >
                    <View
                      style={[
                        styles.roleDot,
                        { backgroundColor: p.roleColor || "#4ADE80" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        { color: p.roleColor || "#4ADE80" },
                      ]}
                      numberOfLines={1}
                    >
                      {p.role}
                    </Text>
                  </View>
                )}
                <Feather name="chevron-right" size={16} color="#475569" />
              </Pressable>
            ))}
          </ScrollView>
        <Text style={styles.hint}>Swipe down or tap outside to dismiss</Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(2, 8, 18, 0.7)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(8, 12, 20, 0.96)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  grabArea: { paddingBottom: 4 },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  headerText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  list: { maxHeight: 380 },
  listContent: { gap: 8, paddingBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(15, 24, 36, 0.6)",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0F1824",
  },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  rowName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  rowSci: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    fontStyle: "italic",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    maxWidth: 110,
  },
  roleDot: { width: 5, height: 5, borderRadius: 3 },
  roleText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    textAlign: "center",
    marginTop: 2,
  },
});
