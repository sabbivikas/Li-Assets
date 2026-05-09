import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, useUser } from "@clerk/expo";
import { File as FSFile, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  PaperBackground,
  PAINT,
} from "@/components/paint";
import { clearCache } from "@/services/cache";
import { loadCards } from "@/services/lifeCards";
import {
  getNotificationPrefs,
  registerPushToken,
  requestNotificationPermission,
  setNotificationPref,
  unregisterPushToken,
  type NotificationPrefs,
} from "@/services/notificationPrefs";
import { useLocation } from "@/context/LocationContext";
import { loadReports } from "@/services/savedReports";

const PRIVACY_POLICY_URL = "https://natura.app/privacy";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { lat, lng, radius, cityName } = useLocation();

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    weeklyDigest: false,
    speciesNearby: false,
  });
  const [exporting, setExporting] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    void getNotificationPrefs().then(setNotifPrefs);
  }, []);

  async function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    if (Platform.OS !== "web") void Haptics.selectionAsync();

    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return;
      }
    }

    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    await setNotificationPref(key, value);

    const bothOff = !next.weeklyDigest && !next.speciesNearby;
    try {
      const authToken = await getToken();
      if (!authToken) return;
      if (bothOff) {
        await unregisterPushToken(authToken);
      } else if (lat && lng) {
        await registerPushToken({
          authToken,
          lat,
          lng,
          radiusKm: radius,
          city: cityName ?? "your area",
          weeklyDigest: next.weeklyDigest,
        });
      }
    } catch {
      /* non-fatal */
    }
  }

  async function handleExport() {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setExporting(true);
    try {
      const [reports, cards] = await Promise.all([loadReports(), loadCards()]);
      const payload = {
        exportedAt: new Date().toISOString(),
        savedReports: reports,
        lifeCards: cards,
      };
      const json = JSON.stringify(payload, null, 2);

      const sharingAvailable = Platform.OS !== "web" && (await Sharing.isAvailableAsync());

      if (sharingAvailable) {
        const file = new FSFile(Paths.cache, "natura-export.json");
        file.create({ overwrite: true });
        file.write(json);
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Export Natura data",
          UTI: "public.json",
        });
      } else {
        await Share.share({ title: "My Natura data", message: json });
      }
    } catch {
      Alert.alert("Export failed", "Couldn't prepare your data. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function handleClearCache() {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    Alert.alert(
      "Clear species cache?",
      "The app will re-fetch fresh data from iNaturalist next time you open it. Your saved reports and life cards are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear cache",
          onPress: async () => {
            setClearingCache(true);
            try {
              await clearCache();
              if (Platform.OS !== "web")
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setCacheCleared(true);
              setTimeout(() => setCacheCleared(false), 2500);
            } finally {
              setClearingCache(false);
            }
          },
        },
      ],
    );
  }

  function handleDeleteAccount() {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    Alert.alert(
      "Delete account?",
      "This will permanently delete your Natura account and all data saved on this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your account, saved reports, and life cards will be gone forever.",
              [
                { text: "Keep my account", style: "cancel" },
                {
                  text: "Yes, delete everything",
                  style: "destructive",
                  onPress: async () => {
                    if (!user) {
                      Alert.alert(
                        "Session error",
                        "Your session has expired. Please sign in again before deleting your account.",
                      );
                      return;
                    }
                    setDeletingAccount(true);
                    try {
                      const authToken = await getToken();
                      if (authToken) {
                        await unregisterPushToken(authToken).catch(() => {});
                      }
                      await user.delete();
                      await AsyncStorage.clear();
                      router.replace("/(auth)/sign-in");
                    } catch (err) {
                      const e = err as { message?: string };
                      Alert.alert(
                        "Couldn't delete account",
                        e?.message ?? "Please try again or contact support.",
                      );
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <PaperBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back bar */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBar}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={20} color={PAINT.ink} />
          <Text style={styles.backText}>back</Text>
        </Pressable>

        <Text style={styles.h1}>Settings</Text>
        <CrayonUnderline width={140} color={PAINT.grass} seed={7} />

        {/* ── NOTIFICATIONS ────────────────────────────────────── */}
        <SectionHeader title="notifications" />
        <View style={styles.card}>
          <ToggleRow
            icon="bell"
            label="Weekly neighborhood digest"
            description="A brief roundup of what's been spotted near you."
            value={notifPrefs.weeklyDigest}
            onToggle={(v) => void handleToggle("weeklyDigest", v)}
          />
          <Separator />
          <ToggleRow
            icon="map-pin"
            label="New species nearby"
            description="Alerts when an unusual species appears in your area."
            value={notifPrefs.speciesNearby}
            onToggle={(v) => void handleToggle("speciesNearby", v)}
          />
          <View style={styles.notifNote}>
            <Feather name="info" size={12} color={PAINT.inkMute} />
            <Text style={styles.notifNoteText}>
              Notifications are sent via Expo Push. A weekly digest fires server-side; new-species alerts fire locally.
            </Text>
          </View>
        </View>

        {/* ── PRIVACY ──────────────────────────────────────────── */}
        <SectionHeader title="privacy" />
        <View style={styles.card}>
          <InfoRow
            icon="cloud"
            label="What leaves your device"
            description="Species data requests go to iNaturalist (public API). AI report content is sent to our server to generate the report narrative."
          />
          <Separator />
          <InfoRow
            icon="hard-drive"
            label="What stays on your device"
            description="Your saved reports, life cards, location, and profile name are stored locally and never uploaded."
          />
          <Separator />
          <LinkRow
            icon="map-pin"
            label="Location permission"
            description="Manage how Natura accesses your location."
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              void Linking.openSettings();
            }}
          />
          <Separator />
          <LinkRow
            icon="file-text"
            label="Privacy policy"
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              void Linking.openURL(PRIVACY_POLICY_URL);
            }}
          />
        </View>

        {/* ── DATA & STORAGE ───────────────────────────────────── */}
        <SectionHeader title="data & storage" />
        <View style={styles.card}>
          <ActionRow
            icon="download"
            label="Export my data"
            description="Share a JSON file of your saved reports and life cards."
            onPress={() => void handleExport()}
            loading={exporting}
          />
          <Separator />
          <ActionRow
            icon="trash-2"
            label="Clear species cache"
            description="Forces fresh data from iNaturalist. Reports and cards are unaffected."
            onPress={handleClearCache}
            loading={clearingCache}
            success={cacheCleared}
          />
        </View>

        {/* ── ACCOUNT ──────────────────────────────────────────── */}
        <SectionHeader title="account" />
        <View style={styles.card}>
          <DestructiveRow
            icon="user-x"
            label="Delete account"
            description="Permanently removes your account and all local data."
            onPress={handleDeleteAccount}
            loading={deletingAccount}
          />
        </View>

        <Text style={styles.version}>
          Natura · settings
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name={icon} size={16} color={PAINT.ink} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: PAINT.inkMute + "44", true: PAINT.grass + "cc" }}
        thumbColor={value ? PAINT.grassDeep : "#f0f0f0"}
        ios_backgroundColor={PAINT.inkMute + "44"}
      />
    </View>
  );
}

function InfoRow({
  icon,
  label,
  description,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name={icon} size={16} color={PAINT.inkSoft} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  description,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.rowIcon}>
        <Feather name={icon} size={16} color={PAINT.ink} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Feather name="external-link" size={14} color={PAINT.inkMute} />
    </Pressable>
  );
}

function ActionRow({
  icon,
  label,
  description,
  onPress,
  loading,
  success = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  loading: boolean;
  success?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || success}
      style={({ pressed }) => [styles.row, { opacity: pressed || loading ? 0.7 : 1 }]}
    >
      <View style={[styles.rowIcon, success && styles.rowIconSuccess]}>
        <Feather name={success ? "check" : icon} size={16} color={success ? PAINT.grassDeep : PAINT.ink} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, success && styles.rowLabelSuccess]}>{label}</Text>
        <Text style={styles.rowDesc}>
          {success ? "Done — data will refresh on next visit." : description}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={PAINT.inkSoft} />
      ) : success ? null : (
        <Feather name="chevron-right" size={16} color={PAINT.inkMute} />
      )}
    </Pressable>
  );
}

function DestructiveRow({
  icon,
  label,
  description,
  onPress,
  loading,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.row, { opacity: pressed || loading ? 0.7 : 1 }]}
    >
      <View style={[styles.rowIcon, styles.rowIconDestructive]}>
        <Feather name={icon} size={16} color={PAINT.red} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, styles.rowLabelDestructive]}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={PAINT.red} />
      ) : (
        <Feather name="chevron-right" size={16} color={PAINT.red + "88"} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 20, alignItems: "stretch" },

  backBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  backText: { fontFamily: HAND_FONT, fontSize: 22, color: PAINT.ink },

  h1: {
    fontFamily: HAND_FONT,
    fontSize: 44,
    lineHeight: 50,
    color: PAINT.ink,
  },

  sectionHeader: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkMute,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 4,
  },

  card: {
    backgroundColor: PAINT.cream,
    borderWidth: 2,
    borderColor: PAINT.ink,
    borderRadius: 18,
    overflow: "hidden",
  },

  separator: {
    height: 1.5,
    backgroundColor: PAINT.inkMute + "22",
    marginLeft: 52,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },

  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PAINT.inkMute + "55",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowIconSuccess: {
    borderColor: PAINT.grassDeep + "55",
    backgroundColor: PAINT.grass + "22",
  },
  rowLabelSuccess: { color: PAINT.grassDeep },
  rowIconDestructive: {
    borderColor: PAINT.red + "55",
    backgroundColor: PAINT.red + "11",
  },

  rowBody: { flex: 1, gap: 2 },
  rowLabel: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
    lineHeight: 24,
  },
  rowLabelDestructive: { color: PAINT.red },
  rowDesc: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    lineHeight: 18,
  },

  notifNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
  },
  notifNoteText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkMute,
    lineHeight: 17,
  },

  version: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkMute,
    textAlign: "center",
    marginTop: 36,
  },
});
