import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BadgeMedal } from "@/components/BadgeMedal";
import {
  CrayonUnderline,
  Flower,
  HAND_FONT,
  LABEL_FONT,
  PaperBackground,
  PAINT,
  Sparkle,
  WobbleBox,
} from "@/components/paint";
import { useLocation } from "@/context/LocationContext";
import {
  computeBadgeStates,
  getFeaturedBadges,
} from "@/services/badges";
import { loadCards, type StoredCard } from "@/services/lifeCards";
import { loadReports, type SavedReport } from "@/services/savedReports";

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
  const {
    cityName,
    radius,
    displayName,
    setDisplayName,
    localAvatarUri,
    setLocalAvatarUri,
  } = useLocation();
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const [c, r] = await Promise.all([loadCards(), loadReports()]);
        if (alive) {
          setCards(c);
          setReports(r);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const badgeStates = useMemo(
    () => computeBadgeStates({ cards, reports }),
    [cards, reports]
  );
  const featured = useMemo(() => getFeaturedBadges(badgeStates), [badgeStates]);
  const totalUnlocked = badgeStates.filter((b) => b.unlocked).length;

  const onChangeAvatar = useCallback(async () => {
    if (avatarBusy) return;
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    try {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Photo access needed",
            "Allow photo library access to change your profile picture.",
          );
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setAvatarBusy(true);
      // Optimistic local update first so the user sees the new picture
      // immediately, regardless of Clerk upload success.
      await setLocalAvatarUri(uri);
      // Best-effort: also push the new image to Clerk so it persists
      // across devices and stays in sync with `user.imageUrl`.
      try {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        await user?.setProfileImage({ file: blob });
      } catch {
        // Silently fall back to local-only — the local URI is already
        // saved and rendered, so the feature still works offline / when
        // Clerk rejects the upload.
      }
    } catch {
      if (mountedRef.current) {
        Alert.alert("Couldn't update picture", "Please try again.");
      }
    } finally {
      if (mountedRef.current) setAvatarBusy(false);
    }
  }, [avatarBusy, setLocalAvatarUri, user]);

  const openNameEditor = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setNameDraft(
      displayName ??
        user?.fullName ??
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ??
        "",
    );
    setNameModalOpen(true);
  }, [displayName, user]);

  const saveName = useCallback(async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setNameSaving(true);
    try {
      await setDisplayName(trimmed);
      // Best-effort Clerk update so the name shows up across devices.
      try {
        const parts = trimmed.split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ");
        await user?.update({ firstName, lastName });
      } catch {
        // Ignore — local copy is the source of truth in-app.
      }
      if (mountedRef.current) setNameModalOpen(false);
    } finally {
      if (mountedRef.current) setNameSaving(false);
    }
  }, [nameDraft, setDisplayName, user]);

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
        <PaperBackground />
        <ActivityIndicator color={PAINT.grass} />
      </View>
    );
  }

  const fullName =
    displayName ||
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    null;
  const email = user?.primaryEmailAddress?.emailAddress;
  // Local URI takes precedence so changes appear instantly even before
  // Clerk finishes propagating the new imageUrl.
  const avatarUrl = localAvatarUri || user?.imageUrl;
  const initials = initialsFor(fullName, email);

  return (
    <View style={styles.root}>
      <PaperBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.h1}>My field journal</Text>
          <View style={styles.sparkleA}>
            <Sparkle size={8} color={PAINT.sun} />
          </View>
        </View>
        <CrayonUnderline width={200} color={PAINT.pink} seed={7} />

        {/* Naturalist passport card */}
        <WobbleBox
          width={340}
          height={300}
          fill={PAINT.cream}
          seed={11}
          padding={20}
          style={styles.passport}
        >
          <View style={styles.passportTop}>
            <Pressable
              onPress={onChangeAvatar}
              disabled={avatarBusy}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              style={styles.avatarWrap}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarFlower}>
                <Flower size={36} petal={PAINT.pink} />
              </View>
              <View style={styles.avatarEditBadge}>
                {avatarBusy ? (
                  <ActivityIndicator size="small" color={PAINT.ink} />
                ) : (
                  <Feather name="camera" size={14} color={PAINT.ink} />
                )}
              </View>
            </Pressable>
            <View style={styles.passportInfo}>
              <Text style={styles.naturalistLabel}>naturalist</Text>
              <Pressable
                onPress={openNameEditor}
                accessibilityRole="button"
                accessibilityLabel="Edit your name"
                style={styles.nameRow}
              >
                <Text style={styles.name} numberOfLines={1}>
                  {fullName ?? "Life Web member"}
                </Text>
                <Feather name="edit-2" size={14} color={PAINT.inkMute} />
              </Pressable>
              {email ? (
                <Text style={styles.email} numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color={PAINT.grassDeep} />
                <Text style={styles.locationText}>
                  {cityName ? `${cityName} · ${radius}km` : `${radius}km radius`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.statsLabel}>est. 2026 · seedling rank</Text>
        </WobbleBox>

        {/* Badge Case */}
        <View style={styles.badgeCaseHeader}>
          <View>
            <Text style={styles.sectionTitle}>badge case</Text>
            <CrayonUnderline width={130} color={PAINT.sun} seed={3} />
          </View>
          <View style={styles.badgeCount}>
            <Feather name="award" size={13} color={PAINT.grassDeep} />
            <Text style={styles.badgeCountText}>
              {totalUnlocked} / {badgeStates.length}
            </Text>
          </View>
        </View>
        <Text style={styles.badgeCaseSub}>
          Collect badges by discovering and protecting your local life web.
        </Text>
        <View style={styles.badges}>
          {featured.map((s, i) => (
            <Pressable
              key={s.def.id}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.selectionAsync();
                router.push(`/badges/${s.def.id}`);
              }}
              style={styles.badgeWrap}
            >
              <BadgeMedal state={s} size="md" seed={i * 3 + 5} showLabel />
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") void Haptics.selectionAsync();
            router.push("/badges");
          }}
          style={styles.viewAllBtn}
        >
          <Text style={styles.viewAllText}>View all badges</Text>
          <Feather name="arrow-right" size={16} color={PAINT.ink} />
        </Pressable>

        {/* Sign out */}
        <Text style={styles.sectionTitle}>account</Text>
        <Pressable
          onPress={onSignOut}
          disabled={busy}
          style={({ pressed }) => [
            { opacity: pressed || busy ? 0.7 : 1, marginTop: 6 },
          ]}
        >
          <WobbleBox
            width={300}
            height={56}
            fill="white"
            stroke={PAINT.red}
            strokeWidth={2.5}
            seed={13}
            padding={0}
          >
            <View style={styles.signOutRow}>
              {busy ? (
                <ActivityIndicator color={PAINT.red} />
              ) : (
                <>
                  <Feather name="log-out" size={18} color={PAINT.red} />
                  <Text style={styles.signOutText}>sign out</Text>
                </>
              )}
            </View>
          </WobbleBox>
        </Pressable>
      </ScrollView>

      <Modal
        visible={nameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setNameModalOpen(false)}
            accessibilityLabel="Dismiss"
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>your name</Text>
            <CrayonUnderline width={140} color={PAINT.pink} seed={4} />
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="What should we call you?"
              placeholderTextColor={PAINT.inkMute}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => void saveName()}
              style={styles.modalInput}
              accessibilityLabel="Your name"
            />
            <View style={styles.modalRow}>
              <Pressable
                onPress={() => setNameModalOpen(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnGhost,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.modalBtnGhostText}>cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveName()}
                disabled={!nameDraft.trim() || nameSaving}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  {
                    opacity:
                      !nameDraft.trim() || nameSaving
                        ? 0.5
                        : pressed
                          ? 0.85
                          : 1,
                  },
                ]}
              >
                {nameSaving ? (
                  <ActivityIndicator color={PAINT.ink} />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAINT.paper },
  loading: {
    flex: 1,
    backgroundColor: PAINT.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 20, alignItems: "center" },
  titleRow: { flexDirection: "row", alignSelf: "flex-start" },
  h1: {
    fontFamily: HAND_FONT,
    fontSize: 44,
    color: PAINT.ink,
    lineHeight: 50,
  },
  sparkleA: { marginLeft: 6, marginTop: 4 },
  passport: { marginTop: 22, marginBottom: 28 },
  passportTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarWrap: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: PAINT.paperDeep,
    borderWidth: 3,
    borderColor: PAINT.ink,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PAINT.sun,
  },
  avatarInitials: {
    fontFamily: HAND_FONT,
    fontSize: 36,
    color: PAINT.ink,
  },
  avatarFlower: {
    position: "absolute",
    bottom: -8,
    right: -10,
    transform: [{ rotate: "20deg" }],
  },
  avatarEditBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PAINT.sun,
    borderWidth: 2,
    borderColor: PAINT.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  passportInfo: { flex: 1 },
  naturalistLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: HAND_FONT,
    fontSize: 32,
    color: PAINT.ink,
    lineHeight: 36,
    marginTop: 2,
  },
  email: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.inkSoft,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  locationText: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.grassDeep,
  },
  divider: {
    height: 2,
    backgroundColor: PAINT.paperDeep,
    marginVertical: 16,
    borderRadius: 1,
  },
  statsLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.inkSoft,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 28,
    color: PAINT.ink,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  badgeCaseHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 4,
  },
  badgeCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: PAINT.grassDeep,
    marginBottom: 4,
  },
  badgeCountText: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.grassDeep,
  },
  badgeCaseSub: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    alignSelf: "flex-start",
    marginTop: 6,
    lineHeight: 17,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
    marginBottom: 8,
    rowGap: 18,
  },
  badgeWrap: { width: "31%", alignItems: "center" },
  viewAllBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    borderRadius: 18,
    backgroundColor: "white",
  },
  viewAllText: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
  },
  signOutRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  signOutText: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.red,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 16, 8, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: PAINT.cream,
    borderWidth: 2.5,
    borderColor: PAINT.ink,
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  modalTitle: {
    fontFamily: HAND_FONT,
    fontSize: 28,
    color: PAINT.ink,
  },
  modalInput: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
    backgroundColor: "white",
    borderWidth: 1.8,
    borderColor: PAINT.ink,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.8,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnGhost: {
    backgroundColor: "white",
    borderColor: PAINT.ink,
  },
  modalBtnGhostText: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
  },
  modalBtnPrimary: {
    backgroundColor: PAINT.sun,
    borderColor: PAINT.ink,
  },
  modalBtnPrimaryText: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
  },
});
