import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export interface SpeciesSelection {
  id: number;
  taxonId?: number;
  name: string;
  scientificName?: string;
  role?: string;
  roleColor?: string;
  photoUrl?: string;
  observationCount?: number;
  group?: string;
}

interface Props {
  selection: SpeciesSelection | null;
  onClose: () => void;
}

export function SpeciesBottomSheet({ selection, onClose }: Props) {
  const router = useRouter();
  const translateY = useSharedValue(420);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (selection) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 });
      opacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(420, {
        duration: 240,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [selection, opacity, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  function handleSeeImpact() {
    const taxonId = selection?.taxonId;
    onClose();
    if (taxonId) {
      // Navigate after a tiny delay so the close animation can start
      setTimeout(() => router.push(`/species/${taxonId}` as never), 80);
    }
  }

  return (
    <Modal
      visible={!!selection}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        {selection && (
          <View style={styles.body}>
            {selection.photoUrl ? (
              <Image source={{ uri: selection.photoUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Feather name="image" size={28} color="#475569" />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {selection.name}
              </Text>
              {selection.scientificName && (
                <Text style={styles.sci} numberOfLines={1}>
                  {selection.scientificName}
                </Text>
              )}
              <View style={styles.metaRow}>
                {selection.role && (
                  <View
                    style={[
                      styles.rolePill,
                      { backgroundColor: (selection.roleColor || "#4ADE80") + "22" },
                    ]}
                  >
                    <View
                      style={[
                        styles.roleDot,
                        { backgroundColor: selection.roleColor || "#4ADE80" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        { color: selection.roleColor || "#4ADE80" },
                      ]}
                    >
                      {selection.role}
                    </Text>
                  </View>
                )}
                {typeof selection.observationCount === "number" &&
                  selection.observationCount > 0 && (
                    <View style={styles.countPill}>
                      <Feather name="eye" size={11} color="#94A3B8" />
                      <Text style={styles.countText}>
                        {selection.observationCount.toLocaleString()} nearby
                      </Text>
                    </View>
                  )}
                {selection.group && (
                  <View style={styles.countPill}>
                    <Text style={styles.countText}>{selection.group}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        <Pressable
          onPress={handleSeeImpact}
          disabled={!selection?.taxonId}
          style={({ pressed }) => [
            styles.cta,
            { opacity: pressed ? 0.85 : 1 },
            !selection?.taxonId && styles.ctaDisabled,
          ]}
        >
          <Feather name="activity" size={15} color="#080C14" />
          <Text style={styles.ctaText}>See impact</Text>
          <Feather name="arrow-right" size={15} color="#080C14" />
        </Pressable>
        <Text style={styles.hint}>Tap outside to dismiss</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 6,
  },
  body: { flexDirection: "row", gap: 14 },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 16,
    backgroundColor: "#0F1824",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 3, justifyContent: "center" },
  name: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#F8FAFC",
    letterSpacing: -0.3,
  },
  sci: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    fontStyle: "italic",
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  roleDot: { width: 5, height: 5, borderRadius: 3 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: "#0F1824",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  countText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#94A3B8" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#4ADE80",
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#080C14",
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    textAlign: "center",
    marginTop: -4,
  },
});
