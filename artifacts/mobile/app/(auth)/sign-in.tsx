import { useSSO } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LiveEarth } from "@/components/LiveEarth";
import {
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  PaperBackground,
  PAINT,
  Sparkle,
  WobbleButton,
} from "@/components/paint";

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
      <PaperBackground />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Natura</Text>
            <View style={styles.sparkleA}><Sparkle size={9} color={PAINT.sun} /></View>
            <View style={styles.sparkleB}><Sparkle size={7} color={PAINT.pink} /></View>
          </View>
          <CrayonUnderline width={180} color={PAINT.sun} />
          <Text style={styles.subtitle}>
            a love letter to your{"\n"}neighborhood ecosystem
          </Text>

          <View style={styles.earthWrap}>
            <LiveEarth size={260} />
          </View>
        </View>

        <View style={styles.actions}>
          <WobbleButton
            label="Continue with Google"
            onPress={onGoogle}
            loading={busy}
            color={PAINT.grass}
            width={300}
            height={64}
            seed={7}
            leading={
              <View style={styles.gIcon}>
                <Feather name="globe" size={16} color={PAINT.ink} />
              </View>
            }
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.legal}>
            by continuing you agree to share your sign-in details with Natura
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAINT.paper },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },
  hero: { alignItems: "center", marginTop: 32 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 64,
    color: PAINT.ink,
    letterSpacing: -1,
    lineHeight: 72,
  },
  sparkleA: { position: "absolute", top: -4, right: -22 },
  sparkleB: { position: "absolute", bottom: 10, left: -18 },
  subtitle: {
    fontFamily: LABEL_FONT,
    fontSize: 20,
    lineHeight: 26,
    color: PAINT.inkSoft,
    textAlign: "center",
    marginTop: 12,
  },
  earthWrap: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { gap: 14, alignItems: "center", width: "100%" },
  gIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: PAINT.ink,
  },
  error: {
    fontFamily: LABEL_FONT,
    fontSize: 16,
    color: PAINT.red,
    textAlign: "center",
  },
  legal: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
