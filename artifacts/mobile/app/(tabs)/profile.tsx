import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocation } from "@/context/LocationContext";

function initialsFor(name: string | null | undefined, email: string | undefined): string {
  const source = (name ?? email ?? "").trim();
  if (!source) return "·";
  const parts = source.split(/[\s@]+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const { cityName, radius } = useLocation();
  const [busy, setBusy] = useState(false);

  const onSignOut = useCallback(async () => {
    if (busy) return;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const doSignOut = async () => {
      setBusy(true);
      try {
        await signOut();
        router.replace("/(auth)/sign-in");
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === "web") {
      void doSignOut();
    } else {
      Alert.alert(
        "Sign out?",
        "You can sign back in any time.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign out", style: "destructive", onPress: () => void doSignOut() },
        ],
      );
    }
  }, [busy, router, signOut]);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7CF5C2" />
      </View>
    );
  }

  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    null;
  const email = user?.primaryEmailAddress?.emailAddress;
  const avatarUrl = user?.imageUrl;
  const initials = initialsFor(fullName, email);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0F1F1A", "#080C14"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{fullName ?? "Life Web member"}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>

        <Text style={styles.sectionLabel}>Your life web</Text>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Feather name="map-pin" size={16} color="#7CF5C2" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Listening near</Text>
            <Text style={styles.rowSub}>
              {cityName ? `${cityName} · ${radius}km radius` : `${radius}km radius`}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <Pressable
          onPress={onSignOut}
          disabled={busy}
          style={({ pressed }) => [
            styles.signOut,
            (pressed || busy) && styles.signOutPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#FF7E7E" />
          ) : (
            <>
              <Feather name="log-out" size={16} color="#FF7E7E" />
              <Text style={styles.signOutText}>Sign out</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080C14" },
  loading: {
    flex: 1,
    backgroundColor: "#080C14",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 20 },
  h1: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#F2FBF6",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#0E1822",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 28,
  },
  avatarWrap: { marginBottom: 14 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#142235",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#7CF5C2",
  },
  avatarInitials: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#7CF5C2",
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#F2FBF6",
    marginBottom: 4,
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8FA6A1",
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#5C6F6B",
    marginBottom: 10,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0E1822",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 28,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0F2A22",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#F2FBF6",
  },
  rowSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8FA6A1",
    marginTop: 2,
  },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1A0E14",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#3A1A22",
  },
  signOutPressed: { opacity: 0.7 },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FF7E7E",
  },
});
