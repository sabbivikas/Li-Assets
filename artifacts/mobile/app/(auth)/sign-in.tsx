import { useSSO, useSignIn, useSignUp } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

type EmailMode = "idle" | "signin" | "signup" | "verify";

export default function SignInScreen() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { startSSOFlow } = useSSO();
  // Clerk React 6+ signal-based API — no isLoaded / setActive on these hooks
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [googleBusy, setGoogleBusy] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (emailMode !== "idle") {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [emailMode, fadeAnim]);

  const navigateIn = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  // ── Google SSO ──────────────────────────────────────────────────────────────
  const onGoogle = useCallback(async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    setError(null);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        // Do NOT pass a navigate callback — the _layout isSignedIn guard handles
        // the Stack switch; the explicit replace is a belt-and-suspenders fallback.
        await setActive({ session: createdSessionId });
        navigateIn();
      } else {
        setError("Google sign-in didn't complete. Please try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed. Please try again.";
      if (!msg.toLowerCase().includes("cancel")) {
        setError(msg);
      }
    } finally {
      setGoogleBusy(false);
    }
  }, [googleBusy, startSSOFlow, navigateIn]);

  // ── Email: show / hide form ─────────────────────────────────────────────────
  const openEmail = useCallback((mode: "signin" | "signup") => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setError(null);
    setEmailMode(mode);
    setTimeout(() => emailRef.current?.focus(), 250);
  }, []);

  const closeEmail = useCallback(() => {
    setEmailMode("idle");
    setEmail("");
    setPassword("");
    setCode("");
    setError(null);
  }, []);

  // ── Email sign-in ───────────────────────────────────────────────────────────
  const onEmailSignIn = useCallback(async () => {
    if (emailBusy) return;
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setEmailBusy(true);
    setError(null);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // New API: create() returns { error }, status lives on signIn resource
      const { error: createErr } = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });
      if (createErr) {
        setError(humaniseClerkError(createErr.message));
        return;
      }
      if (signIn.status === "complete") {
        // finalize() replaces the old setActive() call
        const { error: finalErr } = await signIn.finalize();
        if (finalErr) {
          setError(humaniseClerkError(finalErr.message));
          return;
        }
        navigateIn();
      } else {
        setError("Sign in incomplete — please check your credentials.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setError(humaniseClerkError(msg));
    } finally {
      setEmailBusy(false);
    }
  }, [emailBusy, email, password, signIn, navigateIn]);

  // ── Email sign-up ───────────────────────────────────────────────────────────
  const onEmailSignUp = useCallback(async () => {
    if (emailBusy) return;
    if (!email.trim() || !password) {
      setError("Please enter an email and password.");
      return;
    }
    setEmailBusy(true);
    setError(null);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { error: createErr } = await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      if (createErr) {
        setError(humaniseClerkError(createErr.message));
        return;
      }
      // New API: sendEmailCode lives on signUp.verifications
      const { error: sendErr } = await signUp.verifications.sendEmailCode();
      if (sendErr) {
        setError(humaniseClerkError(sendErr.message));
        return;
      }
      setEmailMode("verify");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up failed. Please try again.";
      setError(humaniseClerkError(msg));
    } finally {
      setEmailBusy(false);
    }
  }, [emailBusy, email, password, signUp]);

  // ── Email verification ──────────────────────────────────────────────────────
  const onVerify = useCallback(async () => {
    if (emailBusy) return;
    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setEmailBusy(true);
    setError(null);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // New API: verifyEmailCode on signUp.verifications
      const { error: verifyErr } = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });
      if (verifyErr) {
        setError(humaniseClerkError(verifyErr.message));
        return;
      }
      if (signUp.status === "complete") {
        const { error: finalErr } = await signUp.finalize();
        if (finalErr) {
          setError(humaniseClerkError(finalErr.message));
          return;
        }
        navigateIn();
      } else {
        setError("Verification incomplete. Please check the code and try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed. Please try again.";
      setError(humaniseClerkError(msg));
    } finally {
      setEmailBusy(false);
    }
  }, [emailBusy, code, signUp, navigateIn]);

  const isEmailMode = emailMode !== "idle";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.root}>
        <PaperBackground />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
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

            {!isEmailMode && (
              <View style={styles.earthWrap}>
                <LiveEarth size={220} />
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {/* Error banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={PAINT.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Google button — always visible */}
            <WobbleButton
              label={googleBusy ? "Opening Google…" : "Continue with Google"}
              onPress={onGoogle}
              loading={googleBusy}
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

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email form (animated) */}
            {isEmailMode ? (
              <Animated.View style={[styles.emailForm, { opacity: fadeAnim }]}>
                {emailMode === "verify" ? (
                  /* ── Verification code ── */
                  <>
                    <Text style={styles.formHint}>
                      We sent a code to{" "}
                      <Text style={{ fontFamily: HAND_FONT }}>{email}</Text>.
                      Enter it below.
                    </Text>
                    <TextInput
                      ref={codeRef}
                      style={styles.input}
                      value={code}
                      onChangeText={setCode}
                      placeholder="Verification code"
                      placeholderTextColor={PAINT.inkMute}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => void onVerify()}
                      autoFocus
                    />
                    <WobbleButton
                      label={emailBusy ? "Verifying…" : "Verify email"}
                      onPress={() => void onVerify()}
                      loading={emailBusy}
                      color={PAINT.pink}
                      width={300}
                      height={58}
                      seed={17}
                    />
                  </>
                ) : (
                  /* ── Email + password ── */
                  <>
                    <TextInput
                      ref={emailRef}
                      style={styles.input}
                      value={email}
                      onChangeText={(t) => { setEmail(t); setError(null); }}
                      placeholder="Email address"
                      placeholderTextColor={PAINT.inkMute}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                    <View style={styles.passwordRow}>
                      <TextInput
                        ref={passwordRef}
                        style={[styles.input, styles.inputNoBorder, { flex: 1 }]}
                        value={password}
                        onChangeText={(t) => { setPassword(t); setError(null); }}
                        placeholder="Password"
                        placeholderTextColor={PAINT.inkMute}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={() =>
                          emailMode === "signin"
                            ? void onEmailSignIn()
                            : void onEmailSignUp()
                        }
                      />
                      <Pressable
                        onPress={() => setShowPassword((s) => !s)}
                        hitSlop={12}
                        style={styles.eyeBtn}
                      >
                        <Feather
                          name={showPassword ? "eye-off" : "eye"}
                          size={18}
                          color={PAINT.inkMute}
                        />
                      </Pressable>
                    </View>

                    <WobbleButton
                      label={
                        emailBusy
                          ? emailMode === "signin" ? "Signing in…" : "Creating account…"
                          : emailMode === "signin" ? "Sign in" : "Create account"
                      }
                      onPress={() =>
                        emailMode === "signin"
                          ? void onEmailSignIn()
                          : void onEmailSignUp()
                      }
                      loading={emailBusy}
                      color={PAINT.pink}
                      width={300}
                      height={58}
                      seed={17}
                    />

                    {/* Toggle between sign-in / sign-up */}
                    <Pressable
                      onPress={() => {
                        if (Platform.OS !== "web") void Haptics.selectionAsync();
                        setError(null);
                        setEmailMode(emailMode === "signin" ? "signup" : "signin");
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.toggleText}>
                        {emailMode === "signin"
                          ? "No account? Create one"
                          : "Already have an account? Sign in"}
                      </Text>
                    </Pressable>
                  </>
                )}

                {/* Back to options */}
                <Pressable onPress={closeEmail} hitSlop={8} style={styles.backBtn}>
                  <Feather name="arrow-left" size={14} color={PAINT.inkMute} />
                  <Text style={styles.backText}>other options</Text>
                </Pressable>
              </Animated.View>
            ) : (
              /* ── Email entry point buttons ── */
              <View style={styles.emailOptions}>
                <Pressable
                  onPress={() => openEmail("signin")}
                  style={({ pressed }) => [styles.emailBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name="mail" size={16} color={PAINT.ink} />
                  <Text style={styles.emailBtnText}>Sign in with email</Text>
                </Pressable>
                <Pressable
                  onPress={() => openEmail("signup")}
                  style={({ pressed }) => [styles.emailBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name="user-plus" size={16} color={PAINT.ink} />
                  <Text style={styles.emailBtnText}>Create account with email</Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.legal}>
              by continuing you agree to share your sign-in details with Natura
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function humaniseClerkError(msg: string): string {
  if (msg.includes("password") && msg.includes("incorrect")) {
    return "Incorrect password. Please try again.";
  }
  if (msg.includes("identifier") || (msg.includes("email") && msg.includes("found"))) {
    return "No account found with that email.";
  }
  if (msg.includes("already") && msg.includes("exist")) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("verification")) {
    return "Incorrect code. Please check your email and try again.";
  }
  return msg;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAINT.paper },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
  },
  hero: { alignItems: "center", width: "100%" },
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

  actions: { gap: 12, alignItems: "center", width: "100%" },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: PAINT.red + "18",
    borderWidth: 1,
    borderColor: PAINT.red + "44",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "stretch",
  },
  errorText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.red,
    lineHeight: 18,
  },

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

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    paddingHorizontal: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: PAINT.inkMute + "55" },
  dividerText: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
  },

  emailOptions: { gap: 10, alignSelf: "stretch" },
  emailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PAINT.inkMute,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignSelf: "stretch",
  },
  emailBtnText: {
    fontFamily: LABEL_FONT,
    fontSize: 16,
    color: PAINT.ink,
  },

  emailForm: { gap: 12, alignSelf: "stretch", alignItems: "center" },
  formHint: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.inkSoft,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    alignSelf: "stretch",
    fontFamily: LABEL_FONT,
    fontSize: 16,
    color: PAINT.ink,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PAINT.inkMute,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 0,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PAINT.inkMute,
    borderRadius: 12,
    paddingRight: 12,
  },
  inputNoBorder: { borderWidth: 0, borderRadius: 0, backgroundColor: "transparent" },
  eyeBtn: { padding: 4 },
  toggleText: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.grassDeep,
    textDecorationLine: "underline",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  backText: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
  },

  legal: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
});
