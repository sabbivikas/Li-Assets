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
import {
  SUPPORTER_TIERS,
  type SupporterCadence,
  type SupporterTierId,
  useSupporter,
} from "@/lib/revenuecat";

const PERKS: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
  {
    icon: "heart",
    title: "Keep Natura free for everyone",
    body: "Your support pays for AI civic reports and the servers that bring them to life.",
  },
  {
    icon: "edit-3",
    title: "Unlimited AI reports",
    body: "Free naturalists get 5 reports a month — supporters get as many as they want.",
  },
  {
    icon: "feather",
    title: "Supporter badge",
    body: "A small heart on your profile and on every report you save. A quiet thank-you.",
  },
  {
    icon: "moon",
    title: "Custom paper themes",
    body: "Switch field-notebook colors to Forest or Dusk whenever you fancy a change.",
  },
];

const TIER_COLORS: Record<SupporterTierId, string> = {
  supporter: PAINT.sky,
  sustainer: PAINT.grass,
  patron: PAINT.pink,
};

function formatPrice(amountUSD: number): string {
  return `$${amountUSD.toFixed(2)}`;
}

function monthlyEquiv(yearlyUSD: number): string {
  return `$${(yearlyUSD / 12).toFixed(2)} / mo`;
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    available,
    ready,
    isSupporter,
    findPackage,
    purchase,
    restore,
    isPurchasing,
    isRestoring,
  } = useSupporter();

  const [pickedTier, setPickedTier] = useState<SupporterTierId>("supporter");
  const [cadence, setCadence] = useState<SupporterCadence>("yearly");
  const [thanks, setThanks] = useState(false);

  const pickedTierData = SUPPORTER_TIERS.find((t) => t.id === pickedTier)!;

  const handlePurchase = async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pkg = findPackage(pickedTier, cadence);
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

  // ── SUCCESS / THANK-YOU STATE ────────────────────────────────────────────────
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
              <WobbleBox width={220} height={54} fill={PAINT.grass} seed={9} padding={0}>
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

  // ── OFFER STATE ──────────────────────────────────────────────────────────────
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
          Natura stays free for everyone. Pick the level that feels right —
          every tier unlocks the same thank-you perks below.
        </Text>

        {/* ── Perks card (auto-height) ── */}
        <View style={styles.perksCard}>
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

        {/* ── Cadence toggle ── */}
        <Text style={styles.sectionLabel}>billing</Text>
        <View style={styles.cadenceRow}>
          <CadenceTab
            label="Monthly"
            active={cadence === "monthly"}
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              setCadence("monthly");
            }}
          />
          <CadenceTab
            label="Yearly"
            active={cadence === "yearly"}
            ribbon="Save 17%"
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              setCadence("yearly");
            }}
          />
        </View>

        {/* ── Yearly R&D callout ── */}
        {cadence === "yearly" && (
          <View style={styles.rdCallout}>
            <Feather name="activity" size={15} color={PAINT.grassDeep} />
            <Text style={styles.rdText}>
              Annual plans cover AI report costs, servers, and the ongoing work of
              testing better models and data sources to make Natura more useful.
            </Text>
          </View>
        )}

        {/* ── Tier picker ── */}
        <Text style={styles.sectionLabel}>choose your level</Text>
        <View style={styles.tiers}>
          {SUPPORTER_TIERS.map((t) => {
            const pkg = findPackage(t.id, cadence);
            const fallbackUSD =
              cadence === "monthly" ? t.monthlyPriceUSD : t.yearlyPriceUSD;
            const priceLabel = pkg?.product?.priceString
              ?? (available && ready ? formatPrice(fallbackUSD) : "—");
            const perMonthLabel = cadence === "yearly"
              ? (pkg?.product
                  ? monthlyEquiv(pkg.product.price)
                  : monthlyEquiv(t.yearlyPriceUSD))
              : null;
            return (
              <TierCard
                key={t.id}
                label={t.label}
                blurb={t.blurb}
                price={priceLabel}
                cadence={cadence === "monthly" ? "/ month" : "/ year"}
                perMonth={perMonthLabel}
                picked={pickedTier === t.id}
                color={TIER_COLORS[t.id]}
                onPick={() => {
                  if (Platform.OS !== "web") void Haptics.selectionAsync();
                  setPickedTier(t.id);
                }}
              />
            );
          })}
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

        {/* ── Primary CTA ── */}
        <Pressable
          onPress={() => void handlePurchase()}
          disabled={!available || isPurchasing}
          style={({ pressed }) => [
            { opacity: pressed && !isPurchasing ? 0.85 : 1, marginTop: 24 },
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
                    Become a {pickedTierData.label}
                  </Text>
                </>
              )}
            </View>
          </WobbleBox>
        </Pressable>

        <Text style={styles.fineprint}>
          Cancel anytime in your {Platform.OS === "ios" ? "App Store" : "Google Play"} settings.
          Your support renews automatically until cancelled.
        </Text>

        {/* ── Secondary actions ── */}
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

function CadenceTab({
  label,
  active,
  ribbon,
  onPress,
}: {
  label: string;
  active: boolean;
  ribbon?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <WobbleBox
        width={172}
        height={52}
        fill={active ? PAINT.sun + "66" : "white"}
        stroke={active ? PAINT.ink : PAINT.inkMute}
        strokeWidth={active ? 2.5 : 1.5}
        seed={active ? 41 : 43}
        padding={0}
      >
        <View style={styles.cadenceInner}>
          <Text style={[styles.cadenceLabel, !active && { color: PAINT.inkSoft }]}>
            {label}
          </Text>
          {ribbon && (
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>{ribbon}</Text>
            </View>
          )}
        </View>
      </WobbleBox>
    </Pressable>
  );
}

function TierCard({
  label,
  blurb,
  price,
  cadence,
  perMonth,
  picked,
  onPick,
  color,
}: {
  label: string;
  blurb: string;
  price: string;
  cadence: string;
  perMonth: string | null;
  picked: boolean;
  onPick: () => void;
  color: string;
}) {
  return (
    <Pressable onPress={onPick} style={styles.tierCardWrap}>
      <View
        style={[
          styles.tierCard,
          { backgroundColor: picked ? color + "44" : "white" },
          picked && styles.tierCardPicked,
        ]}
      >
        {/* Left: name + blurb */}
        <View style={styles.tierLeft}>
          <Text style={styles.tierLabel}>{label}</Text>
          <Text style={styles.tierBlurb}>{blurb}</Text>
        </View>

        {/* Right: price stack */}
        <View style={styles.tierRight}>
          <Text style={styles.tierPrice}>{price}</Text>
          <Text style={styles.tierCadence}>{cadence}</Text>
          {perMonth && (
            <View style={styles.tierEquivRow}>
              <Text style={styles.tierEquiv}>{perMonth}</Text>
            </View>
          )}
        </View>

        {/* Selected checkmark */}
        {picked && (
          <View style={styles.pickedDot}>
            <Feather name="check" size={12} color="white" />
          </View>
        )}
      </View>
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

  // Perks — auto-height, no fixed size
  perksCard: {
    alignSelf: "stretch",
    backgroundColor: PAINT.cream,
    borderWidth: 2.5,
    borderColor: PAINT.ink,
    borderRadius: 18,
    padding: 18,
    gap: 16,
    marginTop: 18,
  },
  perkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  perkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  perkTitle: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
    lineHeight: 24,
  },
  perkBody: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    lineHeight: 19,
    marginTop: 3,
  },

  sectionLabel: {
    alignSelf: "flex-start",
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkMute,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
  },

  cadenceRow: { flexDirection: "row", gap: 14, alignSelf: "stretch" },
  cadenceInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cadenceLabel: { fontFamily: HAND_FONT, fontSize: 22, color: PAINT.ink },

  ribbon: {
    backgroundColor: PAINT.sun,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
  },
  ribbonText: { fontFamily: HAND_FONT, fontSize: 13, color: PAINT.ink },

  // R&D callout
  rdCallout: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: PAINT.grass + "22",
    borderWidth: 1.5,
    borderColor: PAINT.grassDeep,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 12,
  },
  rdText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    lineHeight: 20,
  },

  // Tier cards — auto-height
  tiers: { gap: 10, alignSelf: "stretch" },
  tierCardWrap: { alignSelf: "stretch" },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: PAINT.inkMute,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: "relative",
  },
  tierCardPicked: {
    borderColor: PAINT.ink,
    borderWidth: 2.5,
  },
  tierLeft: { flex: 1 },
  tierLabel: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
    lineHeight: 30,
  },
  tierBlurb: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    lineHeight: 18,
    marginTop: 3,
  },
  tierRight: { alignItems: "flex-end", gap: 1 },
  tierPrice: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
    lineHeight: 30,
  },
  tierCadence: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
  },
  tierEquivRow: {
    marginTop: 4,
    backgroundColor: PAINT.sun + "88",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierEquiv: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.ink,
  },

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
    marginTop: 12,
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  secondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
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
