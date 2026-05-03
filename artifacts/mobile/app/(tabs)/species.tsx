import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreenPadding } from "@/theme";

import {
  Bee,
  Bird,
  CrayonUnderline,
  Flower,
  Frog,
  HAND_FONT,
  LABEL_FONT,
  Mushroom,
  PaperBackground,
  PAINT,
  WobbleBox,
} from "@/components/paint";
import { useLocation } from "@/context/LocationContext";
import {
  fetchNearbySpecies,
  getIconicGroup,
  type SpeciesCount,
} from "@/services/iNaturalist";
import {
  getEcosystemRoles,
  getRoleColor,
  getRoleLabel,
} from "@/services/ecologyModel";
import { withCache } from "@/services/cache";

type GroupDef = {
  key: string;
  label: string;
  emoji: string;
  color: string;
  Icon?: React.ComponentType<{ size?: number }>;
};

const GROUPS: GroupDef[] = [
  { key: "All", label: "All", emoji: "🌍", color: PAINT.grass },
  { key: "Birds", label: "Birds", emoji: "🐦", color: PAINT.blue, Icon: Bird },
  { key: "Plants", label: "Plants", emoji: "🌸", color: PAINT.pink, Icon: Flower },
  { key: "Insects", label: "Bugs", emoji: "🐝", color: PAINT.sun, Icon: Bee },
  { key: "Amphibians", label: "Amphibians", emoji: "🐸", color: PAINT.grass, Icon: Frog },
  { key: "Fungi", label: "Fungi", emoji: "🍄", color: PAINT.purple, Icon: Mushroom },
  { key: "Mammals", label: "Mammals", emoji: "🦊", color: PAINT.brown },
  { key: "Reptiles", label: "Reptiles", emoji: "🦎", color: PAINT.purple },
  { key: "Other", label: "Other", emoji: "✨", color: PAINT.inkSoft },
];

export default function SpeciesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lat, lng, radius } = useLocation();

  const [selectedGroup, setSelectedGroup] = useState("All");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["nearby-species", lat, lng, radius],
    queryFn: () =>
      withCache(`nearby-${lat}-${lng}-${radius}`, () =>
        fetchNearbySpecies(lat!, lng!, radius, 100)
      ),
    enabled: !!lat && !!lng,
  });

  const filtered: SpeciesCount[] = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (selectedGroup !== "All") {
      result = result.filter(
        (s) => getIconicGroup(s.taxon.iconic_taxon_name) === selectedGroup
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.taxon.preferred_common_name?.toLowerCase().includes(q) ||
          s.taxon.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, selectedGroup, search]);

  const { top: screenTop, bottom: screenBottom } = useScreenPadding({ hasTabBar: true });

  return (
    <View style={styles.container}>
      <PaperBackground />

      {/* Header (fixed) */}
      <View style={[styles.header, { paddingTop: screenTop }]}>
        <Text style={styles.title}>Local Species</Text>
        <CrayonUnderline width={180} color={PAINT.grass} seed={3} />
        <Text style={styles.subtitle}>
          {data?.length ?? 0} critters within {radius}km
        </Text>

        {/* Search */}
        <View style={styles.searchWrap}>
          <WobbleBox width={358} height={48} fill="white" seed={31} padding={0}>
            <View style={styles.searchInner}>
              <Text style={styles.searchEmoji}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="search the wild..."
                placeholderTextColor={PAINT.inkMute}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Feather name="x" size={18} color={PAINT.inkMute} />
                </Pressable>
              )}
            </View>
          </WobbleBox>
        </View>

        {/* Filter chips */}
        <FlatList
          horizontal
          data={GROUPS}
          keyExtractor={(g) => g.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          style={{ marginTop: 12, flexGrow: 0 }}
          renderItem={({ item, index }) => {
            const active = selectedGroup === item.key;
            const count =
              item.key === "All"
                ? data?.length ?? 0
                : (data ?? []).filter(
                    (s) => getIconicGroup(s.taxon.iconic_taxon_name) === item.key
                  ).length;
            const chipWidth = item.label.length * 9 + 70;
            return (
              <Pressable
                onPress={() => setSelectedGroup(item.key)}
                style={{ marginRight: 8 }}
              >
                <WobbleBox
                  width={chipWidth}
                  height={36}
                  fill={active ? item.color : "white"}
                  seed={index + 40}
                  padding={0}
                  strokeWidth={2}
                >
                  <View style={styles.chipInner}>
                    <Text style={styles.chipEmoji}>{item.emoji}</Text>
                    <Text style={styles.chipLabel}>{item.label}</Text>
                    <Text style={styles.chipCount}>{count}</Text>
                  </View>
                </WobbleBox>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.empty}>
          <Bee size={64} />
          <Text style={styles.emptyTitle}>looking around...</Text>
          <Text style={styles.emptyDesc}>
            counting the critters within {radius}km
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <ScrollView
          contentContainerStyle={[styles.empty, { paddingBottom: screenBottom }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <Mushroom size={72} />
          <Text style={styles.emptyTitle}>no critters found</Text>
          <Text style={styles.emptyDesc}>
            {search
              ? "try a different word — or clear the search"
              : "nothing in this group nearby — try a wider radius"}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.taxon.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: screenBottom },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item, index }) => (
            <SpeciesRow
              item={item}
              seed={index * 5 + 7}
              onPress={() =>
                router.push({
                  pathname: "/species/[id]",
                  params: { id: String(item.taxon.id) },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

function SpeciesRow({
  item,
  seed,
  onPress,
}: {
  item: SpeciesCount;
  seed: number;
  onPress: () => void;
}) {
  const photo =
    item.taxon.default_photo?.medium_url ||
    item.taxon.default_photo?.square_url;
  const name = item.taxon.preferred_common_name || item.taxon.name;
  const roles = getEcosystemRoles(
    item.taxon.iconic_taxon_name,
    item.taxon.preferred_common_name
  );
  const roleLabel = getRoleLabel(roles[0]);
  const roleColor = getRoleColor(roles[0]);

  return (
    <Pressable onPress={onPress}>
      <WobbleBox width={358} height={92} fill="white" seed={seed} padding={10}>
        <View style={styles.row}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={styles.photo}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.photo, { backgroundColor: PAINT.cream }]} />
          )}
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.sci} numberOfLines={1}>
              {item.taxon.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>👀 {item.count} nearby</Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: roleColor + "33", borderColor: roleColor },
                ]}
              >
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {roleLabel.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          <Feather name="chevron-right" size={22} color={PAINT.inkMute} />
        </View>
      </WobbleBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 34,
    color: PAINT.ink,
    transform: [{ rotate: "-1deg" }],
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.inkSoft,
    marginTop: 4,
  },
  searchWrap: { marginTop: 12, alignItems: "flex-start" },
  searchInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchEmoji: { fontSize: 18 },
  searchInput: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 16,
    color: PAINT.ink,
    paddingVertical: 0,
  },
  filterList: { paddingRight: 16 },
  chipInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.ink,
    fontWeight: "700",
  },
  chipCount: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    marginLeft: 2,
  },
  list: { paddingHorizontal: 20, paddingTop: 12 },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.cream,
  },
  name: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.ink,
    lineHeight: 24,
  },
  sci: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkMute,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  meta: { fontFamily: LABEL_FONT, fontSize: 12, color: PAINT.inkSoft },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  roleText: { fontFamily: LABEL_FONT, fontSize: 10, fontWeight: "700" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
    marginTop: 8,
  },
  emptyDesc: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    textAlign: "center",
  },
});
