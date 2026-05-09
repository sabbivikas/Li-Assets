import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "natura.seenSpecies.v1";

export async function getSeenSpeciesIds(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export async function addSeenSpeciesIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const existing = await getSeenSpeciesIds();
    for (const id of ids) existing.add(id);
    const arr = Array.from(existing);
    await AsyncStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    /* ignore storage errors */
  }
}

export async function clearSeenSpecies(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
