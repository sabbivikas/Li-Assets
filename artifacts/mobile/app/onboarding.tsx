import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocation, type Radius } from "@/context/LocationContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const RADII: { value: Radius; label: string; desc: string }[] = [
  { value: 5, label: "5 km", desc: "Neighborhood" },
  { value: 10, label: "10 km", desc: "City area" },
  { value: 25, label: "25 km", desc: "Region" },
  { value: 50, label: "50 km", desc: "Large region" },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { requestLocation, setRadius, completeOnboarding, radius } = useLocation();

  const [step, setStep] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState<Radius>(10);

  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function handleLocationRequest() {
    setLocationLoading(true);
    const granted = await requestLocation();
    setLocationLoading(false);
    if (granted) {
      setLocationGranted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setStep(1), 600);
    } else {
      setLocationGranted(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleFinish() {
    await setRadius(selectedRadius);
    await completeOnboarding();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)" as any);
  }

  const bg = colors.earthDark;
  const isDark = true;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Glowing earth background orb */}
      <Animated.View
        style={[
          styles.earthOrb,
          {
            opacity: glowAnim,
            backgroundColor: isDark ? "#0F3020" : "#DCFCE7",
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.earthOrbInner,
          {
            opacity: glowAnim,
            backgroundColor: isDark ? "#14532D" : "#BBF7D0",
          },
        ]}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <Step0
            colors={colors}
            glowAnim={glowAnim}
            locationGranted={locationGranted}
            locationLoading={locationLoading}
            onRequest={handleLocationRequest}
          />
        )}
        {step === 1 && (
          <Step1
            colors={colors}
            selectedRadius={selectedRadius}
            onSelect={(r) => {
              setSelectedRadius(r);
              Haptics.selectionAsync();
            }}
            onFinish={handleFinish}
          />
        )}
      </ScrollView>
    </View>
  );
}

function Step0({
  colors,
  glowAnim,
  locationGranted,
  locationLoading,
  onRequest,
}: {
  colors: ReturnType<typeof useColors>;
  glowAnim: Animated.Value;
  locationGranted: boolean;
  locationLoading: boolean;
  onRequest: () => void;
}) {
  return (
    <View style={styles.stepContent}>
      <View style={styles.globeWrap}>
        <Animated.View
          style={[
            styles.globeGlow,
            { opacity: glowAnim, borderColor: "#4ADE8040" },
          ]}
        />
        <Animated.View
          style={[
            styles.globeGlow2,
            { opacity: glowAnim, borderColor: "#4ADE8025" },
          ]}
        />
        <View style={[styles.globe, { backgroundColor: "#0F2027", borderColor: "#22C55E40" }]}>
          <Feather name="globe" size={56} color="#4ADE80" />
        </View>
        {/* Glowing dots around globe */}
        <View style={[styles.dot1, { backgroundColor: "#4ADE80" }]} />
        <View style={[styles.dot2, { backgroundColor: "#22D3EE" }]} />
        <View style={[styles.dot3, { backgroundColor: "#FBBF24" }]} />
      </View>

      <Text style={[styles.headline, { color: "#FFFFFF" }]}>Life Web</Text>
      <Text style={[styles.tagline, { color: "#4ADE80" }]}>
        See what's living around you
      </Text>
      <Text style={[styles.body, { color: "#94A3B8" }]}>
        Discover local species, track biodiversity trends, and understand what happens when a species disappears from your neighborhood.
      </Text>

      <View style={[styles.featureList, { backgroundColor: "#0F1824" }]}>
        {[
          { icon: "map-pin", text: "Species observed near you" },
          { icon: "alert-triangle", text: "Threatened & vulnerable species" },
          { icon: "activity", text: "Local biodiversity signals" },
          { icon: "file-text", text: "Civic impact reports" },
        ].map((f) => (
          <View key={f.icon} style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: "#4ADE8015" }]}>
              <Feather name={f.icon as any} size={16} color="#4ADE80" />
            </View>
            <Text style={[styles.featureText, { color: "#CBD5E1" }]}>{f.text}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onRequest}
        disabled={locationLoading || locationGranted}
        style={({ pressed }) => [
          styles.primaryBtn,
          {
            backgroundColor: locationGranted ? "#16A34A" : "#4ADE80",
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <Feather
          name={locationGranted ? "check" : locationLoading ? "loader" : "map-pin"}
          size={20}
          color="#080C14"
        />
        <Text style={[styles.btnText, { color: "#080C14" }]}>
          {locationGranted
            ? "Location found!"
            : locationLoading
            ? "Finding your location…"
            : "Allow Location Access"}
        </Text>
      </Pressable>

      <Text style={[styles.privacyNote, { color: "#475569" }]}>
        Your location is only used to find nearby species and is never shared or stored on our servers.
      </Text>
    </View>
  );
}

function Step1({
  colors,
  selectedRadius,
  onSelect,
  onFinish,
}: {
  colors: ReturnType<typeof useColors>;
  selectedRadius: Radius;
  onSelect: (r: Radius) => void;
  onFinish: () => void;
}) {
  return (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconWrap, { backgroundColor: "#22D3EE15" }]}>
        <Feather name="crosshair" size={40} color="#22D3EE" />
      </View>

      <Text style={[styles.headline, { color: "#FFFFFF" }]}>Your Search Radius</Text>
      <Text style={[styles.body, { color: "#94A3B8" }]}>
        How far from your location should we look for species? You can change this later.
      </Text>

      <View style={styles.radiusGrid}>
        {RADII.map((r) => (
          <Pressable
            key={r.value}
            onPress={() => onSelect(r.value)}
            style={[
              styles.radiusCard,
              {
                backgroundColor:
                  selectedRadius === r.value ? "#22D3EE15" : "#0F1824",
                borderColor:
                  selectedRadius === r.value ? "#22D3EE" : "#1E293B",
                borderWidth: selectedRadius === r.value ? 1.5 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.radiusValue,
                {
                  color:
                    selectedRadius === r.value ? "#22D3EE" : "#FFFFFF",
                },
              ]}
            >
              {r.label}
            </Text>
            <Text style={[styles.radiusDesc, { color: "#64748B" }]}>
              {r.desc}
            </Text>
            {selectedRadius === r.value && (
              <Feather name="check-circle" size={16} color="#22D3EE" style={styles.checkIcon} />
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onFinish}
        style={({ pressed }) => [
          styles.primaryBtn,
          {
            backgroundColor: "#4ADE80",
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <Text style={[styles.btnText, { color: "#080C14" }]}>Explore Life Web</Text>
        <Feather name="arrow-right" size={20} color="#080C14" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  earthOrb: {
    position: "absolute",
    width: SCREEN_WIDTH * 1.4,
    height: SCREEN_WIDTH * 1.4,
    borderRadius: SCREEN_WIDTH * 0.7,
    top: -SCREEN_WIDTH * 0.7,
    left: -SCREEN_WIDTH * 0.2,
  },
  earthOrbInner: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: SCREEN_WIDTH * 0.45,
    top: -SCREEN_WIDTH * 0.45,
    left: SCREEN_WIDTH * 0.05,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  stepContent: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },
  globeWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  globeGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
  },
  globeGlow2: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
  },
  globe: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dot1: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 20,
    right: 10,
  },
  dot2: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    bottom: 25,
    right: 5,
  },
  dot3: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    bottom: 30,
    left: 10,
  },
  stepIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 10,
  },
  headline: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  featureList: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 18,
  },
  btnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  privacyNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 300,
  },
  radiusGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  radiusCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  radiusValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  radiusDesc: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  checkIcon: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});
