import {
  Caveat_500Medium,
  Caveat_700Bold,
} from "@expo-google-fonts/caveat";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { PatrickHand_400Regular } from "@expo-google-fonts/patrick-hand";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocationProvider, useLocation } from "@/context/LocationContext";
import { PaperThemeProvider } from "@/context/PaperThemeContext";
import { initializeRevenueCat, SupporterProvider } from "@/lib/revenuecat";
import { useUser } from "@clerk/expo";
import {
  getNotificationPrefs,
  registerPushToken,
} from "@/services/notificationPrefs";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

SplashScreen.preventAutoHideAsync();

// On iOS the Keychain (which expo-secure-store / Clerk's tokenCache use)
// survives app deletion. AsyncStorage does NOT — it's wiped with the app
// container. We use that asymmetry to detect a fresh install: if the marker
// is missing in AsyncStorage, this is the first launch since (re)install,
// so any Clerk session jwt left behind in the Keychain belongs to a previous
// install and must be cleared before ClerkProvider's tokenCache reads it,
// otherwise the user is silently auto-signed-in as the previous account.
const INSTALL_MARKER_KEY = "@lifeweb:installMarker";
const CLERK_SECURE_KEYS = [
  "__clerk_client_jwt",
  "__clerk_client_jwt_dev",
  "__clerk_session_jwt",
  "__clerk_session_jwt_dev",
  "__clerk_environment",
];

async function clearStaleSessionIfFreshInstall(): Promise<void> {
  try {
    const marker = await AsyncStorage.getItem(INSTALL_MARKER_KEY);
    if (marker) return;
    if (Platform.OS !== "web") {
      await Promise.all(
        CLERK_SECURE_KEYS.map((k) =>
          SecureStore.deleteItemAsync(k).catch(() => undefined),
        ),
      );
    }
    await AsyncStorage.setItem(INSTALL_MARKER_KEY, "1");
  } catch {
    // Best-effort: if cleanup fails the worst case is the existing buggy
    // behaviour (previous user still signed in), so don't block startup.
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

interface RegisteredState {
  lat: number;
  lng: number;
  radiusKm: number;
  city: string;
  weeklyDigest: boolean;
}

function PushTokenRegistrar() {
  const { getToken, isSignedIn } = useAuth();
  const { lat, lng, radius, cityName } = useLocation();
  const lastRegistered = useRef<RegisteredState | null>(null);

  useEffect(() => {
    if (!isSignedIn || !lat || !lng) return;

    void (async () => {
      try {
        const prefs = await getNotificationPrefs();
        const nextState: RegisteredState = {
          lat,
          lng,
          radiusKm: radius,
          city: cityName ?? "your area",
          weeklyDigest: prefs.weeklyDigest,
        };

        const prev = lastRegistered.current;
        const changed =
          !prev ||
          prev.lat !== nextState.lat ||
          prev.lng !== nextState.lng ||
          prev.radiusKm !== nextState.radiusKm ||
          prev.city !== nextState.city ||
          prev.weeklyDigest !== nextState.weeklyDigest;

        if (!changed) return;

        const authToken = await getToken();
        if (!authToken) return;

        const ok = await registerPushToken({ authToken, ...nextState });
        if (ok) {
          lastRegistered.current = nextState;
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, [isSignedIn, lat, lng, radius, cityName, getToken]);

  return null;
}

function RootLayoutNav() {
  const { hasOnboarded, loading } = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (loading || !isLoaded) return null;

  return (
    <SupporterProvider userId={isSignedIn ? user?.id ?? null : null}>
      {isSignedIn && <PushTokenRegistrar />}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fdf6e3" } }}>
        {!isSignedIn ? (
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        ) : !hasOnboarded ? (
          <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        ) : (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="species/[id]"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="impact/[id]"
              options={{ headerShown: false, animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="support"
              options={{ headerShown: false, animation: "slide_from_bottom", presentation: "modal" }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
          </>
        )}
      </Stack>
    </SupporterProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Caveat_500Medium,
    Caveat_700Bold,
    PatrickHand_400Regular,
  });

  // Run the fresh-install Keychain cleanup BEFORE ClerkProvider mounts so
  // tokenCache never sees a stale jwt left behind by a previous install.
  const [sessionCleanupDone, setSessionCleanupDone] = useState(false);

  useEffect(() => {
    void clearStaleSessionIfFreshInstall().finally(() =>
      setSessionCleanupDone(true),
    );
  }, []);

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && sessionCleanupDone) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, sessionCleanupDone]);

  if ((!fontsLoaded && !fontError) || !sessionCleanupDone) return null;

  if (!publishableKey) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Configuration Error</Text>
        <Text style={styles.errorBody}>
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set.{"\n"}Please rebuild the
          app with the correct environment variables.
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={clerkProxyUrl}
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <PaperThemeProvider>
                <LocationProvider>
                  <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#fdf6e3" }}>
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </LocationProvider>
              </PaperThemeProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: "#fdf6e3",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#b91c1c",
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    lineHeight: 22,
  },
});
