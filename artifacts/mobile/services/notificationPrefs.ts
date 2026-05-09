import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform } from "react-native";

const KEY = "natura.notificationPrefs.v1";
const TOKEN_KEY = "natura.pushToken.v1";

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

function getApiBase(): string | null {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return null;
  const stripped = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${stripped}/api`;
}

/**
 * Gets the Expo push token. Returns null if unavailable (e.g. no EAS project ID,
 * running in development without the Expo Go app, or on web).
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {},
    );
    return tokenResult.data;
  } catch {
    return null;
  }
}

/**
 * Registers the device push token with the API server.
 * Includes the user's location context and current notification preferences
 * so the server can send location-relevant, preference-filtered notifications.
 * Returns true if registration succeeded, false otherwise.
 */
export async function registerPushToken(args: {
  authToken: string;
  lat: number;
  lng: number;
  radiusKm: number;
  city: string;
  weeklyDigest: boolean;
}): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return false;

  const pushToken = await getExpoPushToken();
  if (!pushToken) return false;

  const apiBase = getApiBase();
  if (!apiBase) return false;

  try {
    await AsyncStorage.setItem(TOKEN_KEY, pushToken);
    const res = await fetch(`${apiBase}/push/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.authToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        lat: args.lat,
        lng: args.lng,
        radiusKm: args.radiusKm,
        city: args.city,
        weeklyDigest: args.weeklyDigest,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Unregisters the device push token from the API server.
 * Call on sign-out or when all notification preferences are disabled.
 */
export async function unregisterPushToken(authToken: string): Promise<void> {
  const apiBase = getApiBase();
  if (!apiBase) return;
  try {
    await fetch(`${apiBase}/push/token`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* non-fatal */
  }
}
