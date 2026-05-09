import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

export type Radius = 5 | 10 | 25 | 50;

interface LocationState {
  lat: number | null;
  lng: number | null;
  cityName: string | null;
  radius: Radius;
  hasOnboarded: boolean;
  permissionGranted: boolean;
  loading: boolean;
  displayName: string | null;
  localAvatarUri: string | null;
  onboardedUserId: string | null;
}

interface LocationContextType extends LocationState {
  requestLocation: () => Promise<boolean>;
  setRadius: (r: Radius) => void;
  completeOnboarding: (userId?: string) => Promise<void>;
  resetOnboarding: () => void;
  setDisplayName: (name: string) => Promise<void>;
  setLocalAvatarUri: (uri: string | null) => Promise<void>;
}

const LocationContext = createContext<LocationContextType | null>(null);

const STORAGE_KEYS = {
  onboarded: "@lifeweb:onboarded",
  radius: "@lifeweb:radius",
  city: "@lifeweb:city",
  displayName: "@lifeweb:displayName",
  avatarUri: "@lifeweb:avatarUri",
  onboardedUserId: "@lifeweb:onboardedUserId",
};

const SECURE_KEYS = {
  lat: "@lifeweb:lat",
  lng: "@lifeweb:lng",
};

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  // Default to San Francisco so the app shows real biodiversity data
  // immediately, even before the user grants location permission.
  const [state, setState] = useState<LocationState>({
    lat: 37.7749,
    lng: -122.4194,
    cityName: "San Francisco",
    radius: 10,
    hasOnboarded: false,
    permissionGranted: false,
    loading: true,
    displayName: null,
    localAvatarUri: null,
    onboardedUserId: null,
  });

  useEffect(() => {
    loadStoredState();
  }, []);

  async function loadStoredState() {
    try {
      const [onboarded, radius, lat, lng, city, displayName, avatarUri, onboardedUserId] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.onboarded),
          AsyncStorage.getItem(STORAGE_KEYS.radius),
          getSecureItem(SECURE_KEYS.lat),
          getSecureItem(SECURE_KEYS.lng),
          AsyncStorage.getItem(STORAGE_KEYS.city),
          AsyncStorage.getItem(STORAGE_KEYS.displayName),
          AsyncStorage.getItem(STORAGE_KEYS.avatarUri),
          AsyncStorage.getItem(STORAGE_KEYS.onboardedUserId),
        ]);
      setState((prev) => ({
        ...prev,
        hasOnboarded: onboarded === "true",
        radius: radius ? (parseInt(radius) as Radius) : 10,
        lat: lat ? parseFloat(lat) : prev.lat,
        lng: lng ? parseFloat(lng) : prev.lng,
        cityName: city ?? prev.cityName,
        displayName: displayName ?? null,
        localAvatarUri: avatarUri ?? null,
        onboardedUserId: onboardedUserId ?? null,
        loading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }

  const requestLocation = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "web") {
        return new Promise((resolve) => {
          if (!("geolocation" in navigator)) {
            // eslint-disable-next-line no-console
            console.warn("[location] navigator.geolocation unavailable");
            resolve(false);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const city = await reverseGeocode(lat, lng);
                await saveLocation(lat, lng, city);
                resolve(true);
              } catch (err) {
                // eslint-disable-next-line no-console
                console.warn("[location] web saveLocation failed", err);
                resolve(false);
              }
            },
            (err) => {
              // eslint-disable-next-line no-console
              console.warn("[location] web geolocation error", err);
              resolve(false);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
          );
        });
      }

      // Native: check OS-level location services up front so we can give a
      // useful error rather than hanging forever if the GPS hardware is off.
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        // eslint-disable-next-line no-console
        console.warn("[location] OS location services are disabled");
        return false;
      }

      let { status } = await Location.getForegroundPermissionsAsync();
      if (status === "undetermined") {
        ({ status } = await Location.requestForegroundPermissionsAsync());
      }
      if (status !== "granted") {
        // eslint-disable-next-line no-console
        console.warn("[location] permission not granted:", status);
        return false;
      }

      // Try the cached fix first — instant, works indoors and on Android
      // emulators where getCurrentPositionAsync often hangs waiting for GPS.
      try {
        const cached = await Location.getLastKnownPositionAsync({
          maxAge: 10 * 60 * 1000,
        });
        if (cached?.coords) {
          const { latitude, longitude } = cached.coords;
          const city = await reverseGeocode(latitude, longitude);
          await saveLocation(latitude, longitude, city);
          // Kick off a background fresh fix so subsequent reads are accurate,
          // but don't block the UI on it.
          void Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
            .then(async (fresh) => {
              const flat = fresh.coords.latitude;
              const flng = fresh.coords.longitude;
              const fcity = await reverseGeocode(flat, flng);
              await saveLocation(flat, flng, fcity);
            })
            .catch(() => {
              /* fresh fix is best-effort */
            });
          return true;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[location] getLastKnownPositionAsync failed", err);
      }

      // No cached fix — request a fresh one with a hard timeout so we never
      // leave the user staring at a stuck spinner.
      const loc = await Promise.race<Location.LocationObject | null>([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000)),
      ]);
      if (!loc) {
        // eslint-disable-next-line no-console
        console.warn("[location] getCurrentPositionAsync timed out after 20s");
        return false;
      }
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const city = await reverseGeocode(lat, lng);
      await saveLocation(lat, lng, city);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[location] requestLocation failed", err);
      return false;
    }
  }, []);

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      if (Platform.OS !== "web") {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results.length > 0) {
          const r = results[0];
          return r.city || r.subregion || r.region || "Your Location";
        }
      }
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await resp.json();
      return (
        data.address?.city ||
        data.address?.town ||
        data.address?.county ||
        "Your Location"
      );
    } catch {
      return "Your Location";
    }
  }

  async function saveLocation(lat: number, lng: number, city: string) {
    await Promise.all([
      setSecureItem(SECURE_KEYS.lat, String(lat)),
      setSecureItem(SECURE_KEYS.lng, String(lng)),
      AsyncStorage.setItem(STORAGE_KEYS.city, city),
    ]);
    setState((prev) => ({
      ...prev,
      lat,
      lng,
      cityName: city,
      permissionGranted: true,
    }));
  }

  const setRadius = useCallback(async (r: Radius) => {
    await AsyncStorage.setItem(STORAGE_KEYS.radius, String(r));
    setState((prev) => ({ ...prev, radius: r }));
  }, []);

  const completeOnboarding = useCallback(async (userId?: string) => {
    const tasks: Promise<void>[] = [
      AsyncStorage.setItem(STORAGE_KEYS.onboarded, "true"),
    ];
    if (userId) {
      tasks.push(AsyncStorage.setItem(STORAGE_KEYS.onboardedUserId, userId));
    }
    await Promise.all(tasks);
    setState((prev) => ({
      ...prev,
      hasOnboarded: true,
      onboardedUserId: userId ?? prev.onboardedUserId,
    }));
  }, []);

  const resetOnboarding = useCallback(async () => {
    await Promise.all([
      AsyncStorage.multiRemove(Object.values(STORAGE_KEYS)),
      deleteSecureItem(SECURE_KEYS.lat),
      deleteSecureItem(SECURE_KEYS.lng),
    ]);
    setState({
      lat: 37.7749,
      lng: -122.4194,
      cityName: "San Francisco",
      radius: 10,
      hasOnboarded: false,
      permissionGranted: false,
      loading: false,
      displayName: null,
      localAvatarUri: null,
    });
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      await AsyncStorage.setItem(STORAGE_KEYS.displayName, trimmed);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.displayName);
    }
    setState((prev) => ({ ...prev, displayName: trimmed || null }));
  }, []);

  const setLocalAvatarUri = useCallback(async (uri: string | null) => {
    if (uri) {
      await AsyncStorage.setItem(STORAGE_KEYS.avatarUri, uri);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.avatarUri);
    }
    setState((prev) => ({ ...prev, localAvatarUri: uri }));
  }, []);

  return (
    <LocationContext.Provider
      value={{
        ...state,
        requestLocation,
        setRadius,
        completeOnboarding,
        resetOnboarding,
        setDisplayName,
        setLocalAvatarUri,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
