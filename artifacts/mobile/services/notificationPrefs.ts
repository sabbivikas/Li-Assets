import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform } from "react-native";

const KEY = "natura.notificationPrefs.v1";

export interface NotificationPrefs {
  weeklyDigest: boolean;
  speciesNearby: boolean;
}

const DEFAULTS: NotificationPrefs = {
  weeklyDigest: false,
  speciesNearby: false,
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setNotificationPref<K extends keyof NotificationPrefs>(
  key: K,
  value: NotificationPrefs[K],
): Promise<void> {
  const prefs = await getNotificationPrefs();
  prefs[key] = value;
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}

/**
 * Requests OS notification permission if not already granted.
 * Shows a system Alert if permission is denied, directing the user to Settings.
 * Returns true if permission is granted (or on web where it's a no-op).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  if (existing === "denied") {
    Alert.alert(
      "Notifications blocked",
      "Natura doesn't have permission to send notifications. Enable it in your device Settings.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === "granted") return true;
  Alert.alert(
    "Notifications not enabled",
    "You can turn them on later in your device Settings.",
    [{ text: "OK" }],
  );
  return false;
}
