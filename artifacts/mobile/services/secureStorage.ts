/**
 * Secure large-item storage with AsyncStorage fallback.
 *
 * Uses expo-secure-store (platform keychain/keystore) as the primary store
 * for sensitive data. Falls back transparently to AsyncStorage when SecureStore
 * is unavailable or rejects a value (e.g. payload exceeds platform limits on
 * older Android devices). Reads check SecureStore first, then AsyncStorage, so
 * migration from the old AsyncStorage-only path works without user action.
 * Deletes purge both stores as defense-in-depth.
 *
 * On web, SecureStore is not available; AsyncStorage is used directly.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export async function secureLargeRead(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value !== null) return value;
  } catch {
    // SecureStore unavailable or key not found — try AsyncStorage migration path
  }
  return AsyncStorage.getItem(key);
}

export async function secureLargeWrite(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
    // On success, remove any stale AsyncStorage copy from the old storage path
    AsyncStorage.removeItem(key).catch(() => {});
  } catch {
    // SecureStore write failed (payload too large for device keystore, or
    // hardware-backed storage unavailable). Fall back to AsyncStorage and
    // clear any partial SecureStore state so reads don't return stale data.
    SecureStore.deleteItemAsync(key).catch(() => {});
    await AsyncStorage.setItem(key, value);
  }
}

export async function secureLargeDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  // Purge from both stores so no stale data remains regardless of which
  // path was in use (handles sign-out after a SecureStore fallback).
  await Promise.allSettled([
    SecureStore.deleteItemAsync(key),
    AsyncStorage.removeItem(key),
  ]);
}
