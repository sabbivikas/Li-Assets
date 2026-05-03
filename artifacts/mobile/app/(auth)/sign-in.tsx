import { Feather } from "@expo/vector-icons";
import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EarthGlobe } from "@/components/EarthGlobe";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) return;
            router.replace("/");
          },
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [busy, router, startSSOFlow]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0F1F1A", "#080C14"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.globeWrap}>
            <EarthGlobe size={180} />
          </View>
          <Text style={styles.title}>Welcome to Life Web</Text>
          <Text style={styles.subtitle}>
            Sign in to track the wild lives unfolding around you.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onGoogle}
            disabled={busy}
            style={({ pressed }) => [
              styles.googleBtn,
              (pressed || busy) && styles.googleBtnPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#0B0F18" />
            ) : (
              <>
                <View style={styles.googleIconWrap}>
                  <Feather name="globe" size={18} color="#0B0F18" />
                </View>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.legal}>
            By continuing you agree to share your sign-in details with Life Web.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080C14" },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  hero: { alignItems: "center", marginTop: 48 },
  globeWrap: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: "#F2FBF6",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#8FA6A1",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  actions: { gap: 16 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#7CF5C2",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#7CF5C2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  googleBtnPressed: { opacity: 0.85 },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F2FBF6",
    alignItems: "center",
    justifyContent: "center",
  },
  googleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#0B0F18",
  },
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#FF7E7E",
    textAlign: "center",
  },
  legal: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#5C6F6B",
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});
