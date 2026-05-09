import AsyncStorage from "@react-native-async-storage/async-storage";

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
