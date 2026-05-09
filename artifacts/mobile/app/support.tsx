import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

import {
  CrayonUnderline,
  Flower,
  HAND_FONT,
  LABEL_FONT,
  PaperBackground,
  PAINT,
  Sparkle,
  WobbleBox,
} from "@/components/paint";
import { useSupporter } from "@/lib/revenuecat";

const PERKS: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
  {
    icon: "heart",
    title: "Keep Natura free for everyone",
    body: "Your support pays for the AI civic reports and the servers that bring them to life.",
  },
  {
    icon: "edit-3",
    title: "Unlimited AI reports",
    body: "Free naturalists get 5 AI reports a month — supporters get as many as they want.",
  },
  {
    icon: "feather",
    title: "Supporter badge",
    body: "A small heart on your profile and on every report you save. A quiet thank-you.",
  },
  {
    icon: "moon",
    title: "Custom paper themes",
    body: "Switch the field-notebook colors to Forest or Dusk whenever you fancy a change.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    available,
    ready,
    isSupporter,
    monthlyPackage,
    yearlyPackage,
    purchase,
    restore,
    isPurchasing,
    isRestoring,
  } = useSupporter();

  const [pickedPlan, setPickedPlan] = useState<"monthly" | "yearly">("yearly");
  const [thanks, setThanks] = useState(false);

  const handlePurchase = async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pkg: PurchasesPackage | null =
      pickedPlan === "monthly" ? monthlyPackage : yearlyPackage;
    if (!pkg) {
      Alert.alert(
        "Plan unavailable",
        "We couldn't find that plan right now. Please try again in a moment.",
      );
      return;
    }
    try {
      await purchase(pkg);
      setThanks(true);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      const e = err as { userCancelled?: boolean; message?: string };
      if (e?.userCancelled) return;
      Alert.alert("Purchase failed", e?.message ?? "Please try again.");
    }
  };

  const handleRestore = async () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    try {
      const info = await restore();
      const active = !!info.entitlements.active.supporter;
      if (active) {
        setThanks(true);
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert(
          "No purchases found",
          "We couldn't find an active supporter subscription on this account.",
        );
      }
    } catch (err) {
      const e = err as { message?: string };
      Alert.alert("Couldn't restore", e?.message ?? "Please try again.");
    }
  };

  // SUCCESS / THANK-YOU STATE
  if (thanks || isSupporter) {
    return (
      <View style={styles.root}>
        <PaperBackground />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <BackBar onBack={() => router.back()} />
          <View style={styles.thanksWrap}>
            <View style={styles.thanksFlower}>
              <Flower size={120} petal={PAINT.pink} />
              <View style={styles.thanksSparkleA}>
                <Sparkle size={14} color={PAINT.sun} />
              </View>
              <View style={styles.thanksSparkleB}>
                <Sparkle size={10} color={PAINT.grass} />
              </View>
            </View>
            <Text style={styles.thanksTitle}>Thank you.</Text>
            <CrayonUnderline width={140} color={PAINT.pink} seed={3} />
            <Text style={styles.thanksBody}>
              You're keeping Natura alive for every neighbor who wants to listen
              to their local life web. We're grateful, truly.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, marginTop: 26 }]}
            >
              <WobbleBox
                width={220}
                height={54}
                fill={PAINT.grass}
                seed={9}
                padding={0}
              >
                <View style={styles.primaryInner}>
                  <Text style={styles.primaryLabel}>back to the journal</Text>
                </View>
              </WobbleBox>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // OFFER STATE
  return (
    <View style={styles.root}>
      <PaperBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackBar onBack={() => router.back()} />

        <View style={styles.heroFlowerRow}>
          <Flower size={56} petal={PAINT.pink} />
          <Flower size={44} petal={PAINT.sun} />
          <Flower size={50} petal={PAINT.grass} />
        </View>

        <Text style={styles.h1}>Support Natura</Text>
        <CrayonUnderline width={200} color={PAINT.pink} seed={11} />
        <Text style={styles.lede}>
          Natura stays free for everyone. If it's been useful to you,
          consider chipping in — it covers the AI reports and keeps the lights on.
        </Text>

        {/* Perks card */}
        <WobbleBox
          width={358}
          height={286}
          fill={PAINT.cream}
          seed={31}
          padding={18}
          style={{ marginTop: 18 }}
        >
          <View style={{ gap: 14 }}>
            {PERKS.map((p) => (
              <View key={p.title} style={styles.perkRow}>
                <View style={styles.perkIcon}>
                  <Feather name={p.icon} size={16} color={PAINT.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.perkTitle}>{p.title}</Text>
                  <Text style={styles.perkBody}>{p.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </WobbleBox>

        {/* Plan picker */}
        <Text style={styles.sectionLabel}>choose an amount</Text>
        <View style={styles.plans}>
          <PlanCard
            label="Monthly"
            price={
              monthlyPackage?.product?.priceString ??
              (available && ready ? "—" : "loading…")
            }
            cadence="every month"
            picked={pickedPlan === "monthly"}
            onPick={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              setPickedPlan("monthly");
            }}
            color={PAINT.sky}
          />
          <PlanCard
            label="Yearly"
            price={
              yearlyPackage?.product?.priceString ??
              (available && ready ? "—" : "loading…")
            }
            cadence="every year"
            picked={pickedPlan === "yearly"}
            onPick={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              setPickedPlan("yearly");
            }}
            color={PAINT.grass}
            ribbon="Save 33%"
          />
        </View>

        {!available && (
          <View style={styles.warnBox}>
            <Feather name="alert-circle" size={14} color={PAINT.inkSoft} />
            <Text style={styles.warnText}>
              Supporter purchases aren't available in this build. Try again from the
              published app.
            </Text>
          </View>
        )}

        {/* Primary action */}
        <Pressable
          onPress={() => void handlePurchase()}
          disabled={!available || isPurchasing}
          style={({ pressed }) => [
            { opacity: pressed && !isPurchasing ? 0.85 : 1, marginTop: 20 },
          ]}
        >
          <WobbleBox
            width={358}
            height={62}
            fill={available ? PAINT.pink : PAINT.paperDeep}
            seed={51}
            padding={0}
          >
            <View style={styles.primaryInner}>
              {isPurchasing ? (
                <ActivityIndicator color={PAINT.ink} />
              ) : (
                <>
                  <Feather name="heart" size={18} color={PAINT.ink} />
                  <Text style={styles.primaryLabel}>
                    Become a Supporter
                  </Text>
                </>
              )}
            </View>
          </WobbleBox>
        </Pressable>

        <Text style={styles.fineprint}>
          Cancel anytime in your {Platform.OS === "ios" ? "App Store" : "Google Play"} settings.
          Your support is recurring until you cancel.
        </Text>

        {/* Secondary actions */}
        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => void handleRestore()}
            disabled={!available || isRestoring}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={styles.secondaryLink}>
              {isRestoring ? "Restoring…" : "Restore purchases"}
            </Text>
          </Pressable>
          <Text style={styles.secondaryDot}>·</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={styles.secondaryLink}>Maybe later</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() =>
            void Linking.openURL(
              Platform.OS === "ios"
                ? "https://apps.apple.com/account/subscriptions"
                : "https://play.google.com/store/account/subscriptions",
            )
          }
          style={({ pressed }) => [styles.manageRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="external-link" size={13} color={PAINT.inkSoft} />
          <Text style={styles.manageText}>Manage existing subscription</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <Pressable onPress={onBack} style={styles.backBar} hitSlop={12}>
      <Feather name="arrow-left" size={20} color={PAINT.ink} />
      <Text style={styles.backText}>back</Text>
    </Pressable>
  );
}

function PlanCard({
  label,
  price,
  cadence,
  picked,
  onPick,
  color,
  ribbon,
}: {
  label: string;
  price: string;
  cadence: string;
  picked: boolean;
  onPick: () => void;
  color: string;
  ribbon?: string;
}) {
  return (
    <Pressable onPress={onPick} style={{ flex: 1 }}>
      <WobbleBox
        width={172}
        height={140}
        fill={picked ? color + "55" : "white"}
        stroke={picked ? PAINT.ink : PAINT.inkMute}
        strokeWidth={picked ? 3 : 1.5}
        seed={picked ? 71 : 73}
        padding={14}
      >
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            <Text style={styles.planLabel}>{label}</Text>
            <Text style={styles.planPrice}>{price}</Text>
            <Text style={styles.planCadence}>{cadence}</Text>
          </View>
          {ribbon ? (
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>{ribbon}</Text>
            </View>
          ) : (
            <View style={{ height: 22 }} />
          )}
        </View>
        {picked && (
          <View style={styles.pickedDot}>
            <Feather name="check" size={12} color="white" />
          </View>
        )}
      </WobbleBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 20, alignItems: "center" },

  backBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  backText: { fontFamily: HAND_FONT, fontSize: 22, color: PAINT.ink },

  heroFlowerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
    marginTop: 6,
    marginBottom: 8,
    height: 64,
    alignSelf: "flex-start",
  },
  h1: {
    alignSelf: "flex-start",
    fontFamily: HAND_FONT,
    fontSize: 44,
    lineHeight: 50,
    color: PAINT.ink,
  },
  lede: {
    alignSelf: "flex-start",
    fontFamily: LABEL_FONT,
    fontSize: 16,
    color: PAINT.inkSoft,
    lineHeight: 22,
    marginTop: 14,
  },

  perkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  perkTitle: { fontFamily: HAND_FONT, fontSize: 20, color: PAINT.ink, lineHeight: 24 },
  perkBody: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    lineHeight: 18,
    marginTop: 2,
  },

  sectionLabel: {
    alignSelf: "flex-start",
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 22,
    marginBottom: 8,
  },
  plans: { flexDirection: "row", gap: 14, alignSelf: "stretch" },
  planLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  planPrice: {
    fontFamily: HAND_FONT,
    fontSize: 32,
    color: PAINT.ink,
    lineHeight: 36,
    marginTop: 4,
  },
  planCadence: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
  },
  ribbon: {
    alignSelf: "flex-start",
    backgroundColor: PAINT.sun,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
  },
  ribbonText: { fontFamily: HAND_FONT, fontSize: 14, color: PAINT.ink },
  pickedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PAINT.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  warnBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PAINT.cream,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PAINT.inkMute,
    alignSelf: "stretch",
  },
  warnText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
  },

  primaryInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryLabel: { fontFamily: HAND_FONT, fontSize: 24, color: PAINT.ink },
  fineprint: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkMute,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 16,
  },
  secondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  secondaryDot: { color: PAINT.inkMute, fontSize: 16 },
  secondaryLink: { fontFamily: HAND_FONT, fontSize: 18, color: PAINT.ink },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  manageText: { fontFamily: LABEL_FONT, fontSize: 13, color: PAINT.inkSoft },

  // Thank you
  thanksWrap: { alignItems: "center", marginTop: 30, paddingHorizontal: 20 },
  thanksFlower: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  thanksSparkleA: { position: "absolute", top: 6, right: 8 },
  thanksSparkleB: { position: "absolute", bottom: 14, left: 0 },
  thanksTitle: {
    fontFamily: HAND_FONT,
    fontSize: 56,
    color: PAINT.ink,
    lineHeight: 60,
  },
  thanksBody: {
    fontFamily: LABEL_FONT,
    fontSize: 17,
    color: PAINT.inkSoft,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 18,
  },
});
