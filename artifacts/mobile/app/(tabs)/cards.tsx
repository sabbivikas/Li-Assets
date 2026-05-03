import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LifeCardView } from "@/components/LifeCardView";
import {
  Bee,
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  Mushroom,
  PaperBackground,
  PAINT,
  WobbleBox,
  WobbleButton,
} from "@/components/paint";
import {
  BADGE_META,
  deleteCard,
  enrichCard,
  loadCards,
  type CardBadge,
  type LifeCard,
} from "@/services/lifeCards";

type FilterKey =
  | "all"
  | "Birds"
  | "Insects"
  | "Plants"
  | "Mammals"
  | "Amphibians"
  | "Fungi"
  | "missing"
  | "keystone"
  | "rare";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "all" },
  { key: "Birds", label: "birds" },
  { key: "Insects", label: "insects" },
  { key: "Plants", label: "plants" },
  { key: "Mammals", label: "mammals" },
  { key: "Amphibians", label: "amphibians" },
  { key: "Fungi", label: "fungi" },
  { key: "keystone", label: "keystone" },
  { key: "rare", label: "rare" },
  { key: "missing", label: "missing" },
];

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cards, setCards] = useState<LifeCard[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<LifeCard | null>(null);

  const refresh = useCallback(async () => {
    const stored = await loadCards();
    setCards(stored.map(enrichCard));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filtered = useMemo(() => {
    let list = cards;
    if (filter !== "all") {
      const groupSet: FilterKey[] = [
        "Birds",
        "Insects",
        "Plants",
        "Mammals",
        "Amphibians",
        "Fungi",
      ];
      if (groupSet.includes(filter)) {
        list = list.filter((c) => c.group === filter);
      } else {
        list = list.filter((c) => (c.badges as CardBadge[]).includes(filter as CardBadge));
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.commonName || "").toLowerCase().includes(q) ||
          c.taxonName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cards, filter, search]);

  const sections = useMemo(() => {
    const localCollection = filtered;
    const missing = filtered.filter((c) => c.badges.includes("missing"));
    const keystone = filtered.filter((c) => c.badges.includes("keystone"));
    const sensitive = filtered.filter((c) => c.isSensitive);
    return { localCollection, missing, keystone, sensitive };
  }, [filtered]);

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  async function handleDelete(card: LifeCard) {
    await deleteCard(card.taxonId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    refresh();
    setOpen(null);
  }

  return (
    <View style={styles.container}>
      <PaperBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topInsets + 16,
            paddingBottom: bottomInsets + 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Life Cards</Text>
        <CrayonUnderline width={180} color={PAINT.purple} seed={2} />
        <Text style={styles.subtitle}>
          The real species you&apos;ve discovered around you.
        </Text>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={PAINT.inkMute} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="search by name…"
            placeholderTextColor={PAINT.inkMute}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={10}>
              <Feather name="x" size={16} color={PAINT.inkMute} />
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((f, i) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f.key);
                }}
              >
                <WobbleBox
                  width={f.label.length * 11 + 28}
                  height={36}
                  fill={active ? PAINT.sun : "white"}
                  seed={i + 30}
                  padding={0}
                >
                  <View style={styles.chipInner}>
                    <Text style={styles.chipText}>{f.label}</Text>
                  </View>
                </WobbleBox>
              </Pressable>
            );
          })}
        </ScrollView>

        {cards.length === 0 ? (
          <EmptyState
            onExplore={() => router.push("/(tabs)/species" as never)}
          />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyFiltered}>
            <Mushroom size={36} />
            <Text style={styles.emptyText}>
              No cards match this filter yet.
            </Text>
          </View>
        ) : (
          <>
            {/* Your Local Collection */}
            <SectionHeader
              title="Your Local Collection"
              count={sections.localCollection.length}
            />
            <View style={styles.grid}>
              {sections.localCollection.map((c, i) => (
                <LifeCardView
                  key={c.taxonId}
                  card={c}
                  size="compact"
                  seed={i * 5 + 41}
                  onPress={() => setOpen(c)}
                />
              ))}
            </View>

            {/* Keystone */}
            {sections.keystone.length > 0 && (
              <>
                <SectionHeader
                  title="Keystone Species"
                  count={sections.keystone.length}
                  caption="Their role shapes the local life web."
                />
                <View style={styles.grid}>
                  {sections.keystone.map((c, i) => (
                    <LifeCardView
                      key={`k-${c.taxonId}`}
                      card={c}
                      size="compact"
                      seed={i * 5 + 91}
                      onPress={() => setOpen(c)}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Missing */}
            {sections.missing.length > 0 && (
              <>
                <SectionHeader
                  title="Missing Cards"
                  count={sections.missing.length}
                  caption="Historically here. Not seen recently."
                />
                <View style={styles.grid}>
                  {sections.missing.map((c, i) => (
                    <LifeCardView
                      key={`m-${c.taxonId}`}
                      card={c}
                      size="compact"
                      seed={i * 5 + 131}
                      onPress={() => setOpen(c)}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Sensitive */}
            {sections.sensitive.length > 0 && (
              <>
                <SectionHeader
                  title="Sensitive Species"
                  count={sections.sensitive.length}
                  caption="Locations are intentionally generalized."
                />
                <View style={styles.grid}>
                  {sections.sensitive.map((c, i) => (
                    <LifeCardView
                      key={`s-${c.taxonId}`}
                      card={c}
                      size="compact"
                      seed={i * 5 + 171}
                      onPress={() => setOpen(c)}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Caveat */}
        <View style={styles.caveat}>
          <Text style={styles.caveatLabel}>about the data</Text>
          <Text style={styles.caveatText}>
            Based on community science observations. Missing observations do
            not always mean a species is absent. Observe respectfully — do not
            disturb wildlife or enter restricted areas.
          </Text>
        </View>
      </ScrollView>

      {/* Detail modal */}
      <CardDetailModal
        card={open}
        onClose={() => setOpen(null)}
        onSeeImpact={(c) => {
          setOpen(null);
          router.push({
            pathname: "/impact/[id]",
            params: { id: String(c.taxonId) },
          } as never);
        }}
        onOpenSpecies={(c) => {
          setOpen(null);
          router.push({
            pathname: "/species/[id]",
            params: { id: String(c.taxonId) },
          } as never);
        }}
        onContribute={() => {
          Linking.openURL("https://www.inaturalist.org/observations/upload");
        }}
        onDelete={handleDelete}
      />
    </View>
  );
}

function SectionHeader({
  title,
  count,
  caption,
}: {
  title: string;
  count: number;
  caption?: string;
}) {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{count}</Text>
        </View>
      </View>
      {caption && <Text style={styles.sectionCaption}>{caption}</Text>}
    </View>
  );
}

function EmptyState({ onExplore }: { onExplore: () => void }) {
  return (
    <View style={styles.empty}>
      <Bee size={64} />
      <Text style={styles.emptyTitle}>No cards yet</Text>
      <Text style={styles.emptyBody}>
        Tap any species in the Species tab to discover and unlock its Life
        Card. As you learn more — its role, its signal — the card grows with
        you.
      </Text>
      <View style={{ marginTop: 12 }}>
        <WobbleButton
          label="Explore species near me"
          onPress={onExplore}
          color={PAINT.grass}
          width={260}
          height={50}
          seed={5}
        />
      </View>
    </View>
  );
}

function CardDetailModal({
  card,
  onClose,
  onSeeImpact,
  onOpenSpecies,
  onContribute,
  onDelete,
}: {
  card: LifeCard | null;
  onClose: () => void;
  onSeeImpact: (c: LifeCard) => void;
  onOpenSpecies: (c: LifeCard) => void;
  onContribute: () => void;
  onDelete: (c: LifeCard) => void;
}) {
  if (!card) return null;
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalKicker}>your life card</Text>
                <Pressable onPress={onClose} hitSlop={10}>
                  <Feather name="x" size={22} color={PAINT.ink} />
                </Pressable>
              </View>

              <View style={{ alignItems: "center", marginVertical: 4 }}>
                <LifeCardView card={card} seed={card.taxonId} />
              </View>

              {/* Badge meanings */}
              {card.badges.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>about the badges</Text>
                  <View style={{ gap: 6, marginTop: 6 }}>
                    {card.badges.map((b) => (
                      <View key={b} style={styles.badgeMeaningRow}>
                        <View
                          style={[
                            styles.badgeMeaningSwatch,
                            { backgroundColor: BADGE_META[b].color },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.badgeMeaningLabel}>
                            {BADGE_META[b].label}
                          </Text>
                          <Text style={styles.badgeMeaningDesc}>
                            {BADGE_META[b].description}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.modalActions}>
                <WobbleButton
                  label="See Impact"
                  onPress={() => onSeeImpact(card)}
                  color={PAINT.sun}
                  width={300}
                  height={50}
                  seed={6}
                />
                <View style={{ height: 8 }} />
                <WobbleButton
                  label="Open species page"
                  onPress={() => onOpenSpecies(card)}
                  color={PAINT.cream}
                  width={300}
                  height={44}
                  seed={7}
                />
                <View style={{ height: 8 }} />
                {card.level === 5 && (
                  <>
                    <WobbleButton
                      label="Contribute on iNaturalist"
                      onPress={onContribute}
                      color={PAINT.grass}
                      width={300}
                      height={44}
                      seed={8}
                      leading={
                        <Feather name="external-link" size={14} color={PAINT.ink} />
                      }
                    />
                    <View style={{ height: 8 }} />
                  </>
                )}
                <Pressable
                  onPress={() => onDelete(card)}
                  style={styles.removeBtn}
                >
                  <Feather name="trash-2" size={14} color={PAINT.red} />
                  <Text style={styles.removeText}>remove from collection</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 16 },

  title: {
    fontFamily: HAND_FONT,
    fontSize: 32,
    color: PAINT.ink,
    transform: [{ rotate: "-1deg" }],
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    marginTop: 6,
  },

  searchWrap: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: "white",
  },
  searchInput: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.ink,
    padding: 0,
  },

  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
  },
  chipInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.ink,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 24,
    color: PAINT.ink,
    transform: [{ rotate: "-0.5deg" }],
  },
  sectionCount: {
    backgroundColor: PAINT.cream,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sectionCountText: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.ink,
  },
  sectionCaption: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    marginTop: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },

  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
  },
  emptyBody: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyFiltered: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
  },

  caveat: {
    marginTop: 32,
    padding: 12,
    borderWidth: 1.5,
    borderColor: PAINT.inkMute,
    borderStyle: "dashed",
    backgroundColor: PAINT.paperDeep + "55",
  },
  caveatLabel: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  caveatText: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
    lineHeight: 16,
    marginTop: 4,
  },

  /* modal */
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(26,26,26,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "90%",
    backgroundColor: PAINT.paper,
    borderWidth: 3,
    borderColor: PAINT.ink,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalKicker: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.inkMute,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  modalSection: {
    marginTop: 14,
    padding: 12,
    backgroundColor: PAINT.cream,
    borderWidth: 2,
    borderColor: PAINT.ink,
  },
  modalSectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.ink,
  },
  badgeMeaningRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  badgeMeaningSwatch: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
  },
  badgeMeaningLabel: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.ink,
  },
  badgeMeaningDesc: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    lineHeight: 16,
  },
  modalActions: {
    marginTop: 16,
    alignItems: "center",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  removeText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.red,
  },
});
