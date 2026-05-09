import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Round a coordinate to 2 decimal places (~1.1 km precision) before
 * embedding it in a cache key. This prevents exact GPS coordinates from
 * being written to plain AsyncStorage key names.
 */
export function coarsenCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`@lifeweb:cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(`@lifeweb:cache:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(`@lifeweb:cache:${key}`, JSON.stringify(entry));
  } catch {
    // Cache write failure is non-fatal
  }
}

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) return cached;
  const data = await fetcher();
  await setCached(key, data);
  return data;
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith("@lifeweb:cache:"));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch {
    // Ignore
  }
}
