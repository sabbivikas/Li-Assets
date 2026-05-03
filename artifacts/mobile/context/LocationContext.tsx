import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
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
}

interface LocationContextType extends LocationState {
  requestLocation: () => Promise<boolean>;
  setRadius: (r: Radius) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

const STORAGE_KEYS = {
  onboarded: "@lifeweb:onboarded",
  radius: "@lifeweb:radius",
  lat: "@lifeweb:lat",
  lng: "@lifeweb:lng",
  city: "@lifeweb:city",
};

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocationState>({
    lat: null,
    lng: null,
    cityName: null,
    radius: 10,
    hasOnboarded: false,
    permissionGranted: false,
    loading: true,
  });

  useEffect(() => {
    loadStoredState();
  }, []);

  async function loadStoredState() {
    try {
      const [onboarded, radius, lat, lng, city] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.onboarded),
        AsyncStorage.getItem(STORAGE_KEYS.radius),
        AsyncStorage.getItem(STORAGE_KEYS.lat),
        AsyncStorage.getItem(STORAGE_KEYS.lng),
        AsyncStorage.getItem(STORAGE_KEYS.city),
      ]);
      setState((prev) => ({
        ...prev,
        hasOnboarded: onboarded === "true",
        radius: radius ? (parseInt(radius) as Radius) : 10,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        cityName: city,
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
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const city = await reverseGeocode(lat, lng);
              await saveLocation(lat, lng, city);
              resolve(true);
            },
            () => resolve(false)
          );
        });
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return false;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const city = await reverseGeocode(lat, lng);
      await saveLocation(lat, lng, city);
      return true;
    } catch {
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
      AsyncStorage.setItem(STORAGE_KEYS.lat, String(lat)),
      AsyncStorage.setItem(STORAGE_KEYS.lng, String(lng)),
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

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.onboarded, "true");
    setState((prev) => ({ ...prev, hasOnboarded: true }));
  }, []);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    setState({
      lat: null,
      lng: null,
      cityName: null,
      radius: 10,
      hasOnboarded: false,
      permissionGranted: false,
      loading: false,
    });
  }, []);

  return (
    <LocationContext.Provider
      value={{ ...state, requestLocation, setRadius, completeOnboarding, resetOnboarding }}
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
