import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreenPadding } from "@/theme";

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
import { useLocation } from "@/context/LocationContext";
import { withCache } from "@/services/cache";
import {
  fetchHistoricalSpecies,
  fetchNearbySpecies,
  getIconicGroup,
  type SpeciesCount,
} from "@/services/iNaturalist";
import {
  APPROVAL_TEXT,
  buildEmailBody,
  buildEmailSubject,
  DISCLAIMER,
  generateReport,
  MOCK_RECIPIENTS,
  REPORT_TYPES,
  type GeneratedReport,
  type GroupFilter,
  type Recipient,
  type ReportInputs,
  type ReportType,
  type ReportTypeMeta,
} from "@/services/reportTemplate";
import { generateReportWithAI } from "@/services/aiReport";
import { useAuth } from "@clerk/expo";
import {
  deleteReport,
  loadReports,
  saveReport,
  type SavedReport,
} from "@/services/savedReports";

type Step = "type" | "scope" | "preview" | "approve" | "send";

const GROUP_OPTIONS: GroupFilter[] = [
  "all",
  "Pollinators",
  "Birds",
  "Insects",
  "Plants",
  "Amphibians",
  "Fungi",
  "Mammals",
  "Reptiles",
];

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { lat, lng, radius, cityName } = useLocation();
  const { user } = useUser();
  const { getToken } = useAuth();
  const userName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "A community member";

  // Step state
  const [step, setStep] = useState<Step>("type");

  // Selections
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupFilter>("all");
  const [focusSpecies, setFocusSpecies] = useState<SpeciesCount | undefined>();

  // Generated artifact
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Approval
  const [approved, setApproved] = useState(false);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");

  // Saved
  const [savedOpen, setSavedOpen] = useState(false);
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [savedConfirm, setSavedConfirm] = useState(false);

  const { top: screenTop, bottom: screenBottom } = useScreenPadding({ hasTabBar: true });

  // Data
  const { data: nearby, isLoading: nearbyLoading } = useQuery({
    queryKey: ["nearby-species", lat, lng, radius],
    queryFn: () =>
      withCache(`nearby-${lat}-${lng}-${radius}`, () =>
        fetchNearbySpecies(lat!, lng!, radius, 80)
      ),
    enabled: !!lat && !!lng,
  });

  const { data: historical } = useQuery({
    queryKey: ["historical-species", lat, lng, radius],
    queryFn: () =>
      withCache(`historical-${lat}-${lng}-${radius}`, () =>
        fetchHistoricalSpecies(lat!, lng!, radius, 2)
      ),
    enabled: !!lat && !!lng,
  });

  // Load saved on mount
  useEffect(() => {
    loadReports().then(setSaved);
  }, []);

  const typeMeta: ReportTypeMeta | null = useMemo(
    () => REPORT_TYPES.find((t) => t.id === selectedType) || null,
    [selectedType]
  );

  // Auto-set group filter when type changes
  useEffect(() => {
    if (typeMeta?.defaultGroup) setSelectedGroup(typeMeta.defaultGroup);
  }, [typeMeta]);

  // Filtered species for the species picker (step "scope")
  const speciesForPicker = useMemo(() => {
    if (!nearby) return [];
    if (selectedGroup === "all") return nearby.slice(0, 30);
    if (selectedGroup === "Pollinators") {
      return nearby
        .filter((s) => {
          const g = getIconicGroup(s.taxon.iconic_taxon_name);
          if (g !== "Insects" && g !== "Birds") return false;
          const n = (s.taxon.preferred_common_name || s.taxon.name).toLowerCase();
          return (
            g === "Insects" ||
            n.includes("bee") ||
            n.includes("butterfly") ||
            n.includes("moth") ||
            n.includes("hummingbird")
          );
        })
        .slice(0, 30);
    }
    return nearby
      .filter((s) => getIconicGroup(s.taxon.iconic_taxon_name) === selectedGroup)
      .slice(0, 30);
  }, [nearby, selectedGroup]);

  // Step navigation helpers
  async function goNext() {
    Haptics.selectionAsync();
    if (step === "type" && selectedType) setStep("scope");
    else if (step === "scope") {
      // Generate report on entering preview
      if (!nearby || lat == null || lng == null) return;
      setAiError(null);
      setGenerating(true);
      const baseInputs = {
        type: selectedType!,
        city: cityName || "Your Location",
        radiusKm: radius,
        group: selectedGroup,
        current: nearby,
        historical: historical || [],
        focusSpecies: typeMeta?.needsSpecies ? focusSpecies : undefined,
      };
      let aiOverride: ReportInputs["aiOverride"] | undefined;
      try {
        const token = await getToken();
        const ai = await generateReportWithAI(baseInputs, { token });
        aiOverride = ai;
      } catch (err) {
        setAiError(
          err instanceof Error ? err.message : "AI generation failed; using template."
        );
      }
      const r = generateReport({ ...baseInputs, aiOverride });
      setReport(r);
      const defaultRecipient = MOCK_RECIPIENTS[0];
      setRecipient(defaultRecipient);
      setEditedSubject(buildEmailSubject(r));
      setEditedBody(buildEmailBody(r, defaultRecipient, userName));
      setApproved(false);
      setGenerating(false);
      setStep("preview");
    } else if (step === "preview") setStep("approve");
    else if (step === "approve") setStep("send");
  }

  function goBack() {
    Haptics.selectionAsync();
    if (step === "scope") setStep("type");
    else if (step === "preview") setStep("scope");
    else if (step === "approve") setStep("preview");
    else if (step === "send") setStep("approve");
  }

  function reset() {
    setStep("type");
    setSelectedType(null);
    setSelectedGroup("all");
    setFocusSpecies(undefined);
    setReport(null);
    setApproved(false);
    setRecipient(null);
    setEditedSubject("");
    setEditedBody("");
  }

  function handleRecipientPick(r: Recipient) {
    setRecipient(r);
    if (report) {
      setEditedBody(buildEmailBody(report, r, userName));
    }
  }

  async function handleOpenEmail() {
    if (!recipient || !report) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `mailto:${recipient.email}?subject=${encodeURIComponent(
      editedSubject
    )}&body=${encodeURIComponent(editedBody)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Could not open email app",
        "We couldn't launch your email app. Try copying the message and pasting it into your mail client."
      );
    }
  }

  async function handleCopy() {
    if (!report) return;
    await Clipboard.setStringAsync(report.body);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Report body copied to clipboard.");
  }

  async function handleShare() {
    if (!report) return;
    try {
      await Share.share({
        title: report.title,
        message: report.body,
      });
    } catch {
      // user cancelled
    }
  }

  async function handleSave() {
    if (!report) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const sr: SavedReport = {
      ...report,
      approvalStatus: approved ? "approved" : "pending",
      userEditedSubject: editedSubject,
      userEditedBody: editedBody,
      recipientId: recipient?.id,
    };
    await saveReport(sr);
    setSaved(await loadReports());
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 1800);
  }

  async function handleDeleteSaved(id: string) {
    await deleteReport(id);
    setSaved(await loadReports());
  }

  function openSavedReport(s: SavedReport) {
    setReport(s);
    setSelectedType(s.type);
    setSelectedGroup(s.group);
    setEditedSubject(s.userEditedSubject || buildEmailSubject(s));
    setApproved(s.approvalStatus === "approved");
    const r = MOCK_RECIPIENTS.find((m) => m.id === s.recipientId) || MOCK_RECIPIENTS[0];
    setRecipient(r);
    setEditedBody(s.userEditedBody || buildEmailBody(s, r, userName));
    setSavedOpen(false);
    setStep("preview");
  }

  const stepIndex = ["type", "scope", "preview", "approve", "send"].indexOf(step);
  const stepNames = ["Type", "Scope", "Preview", "Approve", "Send"];

  return (
    <View style={styles.container}>
      <PaperBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: screenTop,
            paddingBottom: screenBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Make a Report</Text>
            <CrayonUnderline width={180} color={PAINT.orange} seed={2} />
          </View>
          {saved.length > 0 && (
            <Pressable onPress={() => setSavedOpen(true)}>
              <WobbleBox
                width={104}
                height={40}
                fill={PAINT.cream}
                seed={3}
                padding={0}
              >
                <View style={styles.savedBtnInner}>
                  <Feather name="archive" size={14} color={PAINT.ink} />
                  <Text style={styles.savedBtnText}>
                    saved · {saved.length}
                  </Text>
                </View>
              </WobbleBox>
            </Pressable>
          )}
        </View>

        {/* Stepper */}
        <View style={styles.stepperRow}>
          {stepNames.map((name, i) => {
            const active = i === stepIndex;
            const done = i < stepIndex;
            return (
              <View key={name} style={styles.stepperItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: active
                        ? PAINT.sun
                        : done
                        ? PAINT.grass
                        : "white",
                      borderColor: PAINT.ink,
                    },
                  ]}
                >
                  <Text style={styles.stepDotNum}>{i + 1}</Text>
                </View>
                <Text
                  style={[
                    styles.stepName,
                    {
                      color: active
                        ? PAINT.ink
                        : done
                        ? PAINT.grassDeep
                        : PAINT.inkMute,
                    },
                  ]}
                >
                  {name}
                </Text>
              </View>
            );
          })}
        </View>

        {/* STEP CONTENT */}
        {step === "type" && (
          <TypeStep
            selected={selectedType}
            onPick={(t) => {
              Haptics.selectionAsync();
              setSelectedType(t);
            }}
          />
        )}

        {step === "scope" && (
          <ScopeStep
            typeMeta={typeMeta!}
            cityName={cityName}
            radius={radius}
            group={selectedGroup}
            onGroup={setSelectedGroup}
            speciesList={speciesForPicker}
            speciesLoading={nearbyLoading}
            focus={focusSpecies}
            onFocus={setFocusSpecies}
          />
        )}

        {step === "preview" && report && (
          <>
            {aiError && (
              <View style={styles.aiErrorBox}>
                <Feather name="alert-circle" size={14} color={PAINT.inkSoft} />
                <Text style={styles.aiErrorText}>
                  AI couldn{"\u2019"}t reach the server, so this report uses the
                  built-in template instead.
                </Text>
              </View>
            )}
            <PreviewStep report={report} />
          </>
        )}

        {step === "approve" && report && (
          <ApproveStep
            approved={approved}
            onToggle={() => {
              Haptics.selectionAsync();
              setApproved((v) => !v);
            }}
            recipient={recipient}
            onRecipient={handleRecipientPick}
            subject={editedSubject}
            onSubject={setEditedSubject}
            body={editedBody}
            onBody={setEditedBody}
          />
        )}

        {step === "send" && report && recipient && (
          <SendStep
            report={report}
            recipient={recipient}
            onOpenEmail={handleOpenEmail}
            onCopy={handleCopy}
            onShare={handleShare}
            onSave={handleSave}
            justSaved={savedConfirm}
            onDone={reset}
          />
        )}

        {/* Nav buttons */}
        {step !== "send" && (
          <View style={styles.navRow}>
            {step !== "type" && (
              <Pressable onPress={goBack} style={{ flex: 1 }}>
                <WobbleBox
                  width={170}
                  height={50}
                  fill="white"
                  seed={101}
                  padding={0}
                >
                  <View style={styles.navInner}>
                    <Feather name="arrow-left" size={16} color={PAINT.ink} />
                    <Text style={styles.navText}>back</Text>
                  </View>
                </WobbleBox>
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <WobbleButton
                label={
                  generating
                    ? "Asking Nature…"
                    : step === "type"
                    ? "Continue"
                    : step === "scope"
                    ? "Generate Report"
                    : step === "preview"
                    ? "Review & Send"
                    : "Continue"
                }
                onPress={goNext}
                disabled={
                  generating ||
                  !canAdvance(step, {
                    selectedType,
                    needsSpecies: typeMeta?.needsSpecies,
                    focusSpecies,
                    approved,
                    recipient,
                    editedBody,
                  })
                }
                color={
                  generating
                    ? PAINT.sun
                    : canAdvance(step, {
                        selectedType,
                        needsSpecies: typeMeta?.needsSpecies,
                        focusSpecies,
                        approved,
                        recipient,
                        editedBody,
                      })
                    ? PAINT.grass
                    : PAINT.paperDeep
                }
                width={170}
                height={50}
                seed={111}
              />
            </View>
          </View>
        )}

        {/* Disclaimer footer */}
        <View style={styles.disclaimerWrap}>
          <Text style={styles.disclaimerLabel}>about this tool</Text>
          <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
        </View>
      </ScrollView>

      {/* Saved reports modal */}
      <SavedModal
        open={savedOpen}
        reports={saved}
        onClose={() => setSavedOpen(false)}
        onOpen={openSavedReport}
        onDelete={handleDeleteSaved}
      />
    </View>
  );
}

function canAdvance(
  step: Step,
  ctx: {
    selectedType: ReportType | null;
    needsSpecies?: boolean;
    focusSpecies?: SpeciesCount;
    approved: boolean;
    recipient: Recipient | null;
    editedBody: string;
  }
): boolean {
  if (step === "type") return !!ctx.selectedType;
  if (step === "scope") {
    if (ctx.needsSpecies) return !!ctx.focusSpecies;
    return true;
  }
  if (step === "preview") return true;
  if (step === "approve")
    return ctx.approved && !!ctx.recipient && !!ctx.editedBody.trim();
  return false;
}

/* ============================================================ */
/* Step 1 — Type                                                 */
/* ============================================================ */
function TypeStep({
  selected,
  onPick,
}: {
  selected: ReportType | null;
  onPick: (t: ReportType) => void;
}) {
  return (
    <View style={{ marginTop: 18, gap: 12 }}>
      <Text style={styles.stepHeader}>What kind of report?</Text>
      <Text style={styles.stepCaption}>
        Choose what fits — you can always start a new one later.
      </Text>
      <View style={{ gap: 10, marginTop: 6 }}>
        {REPORT_TYPES.map((t, i) => {
          const active = selected === t.id;
          return (
            <Pressable key={t.id} onPress={() => onPick(t.id)}>
              <WobbleBox
                width={358}
                height={88}
                fill={active ? PAINT.sun + "55" : "white"}
                stroke={active ? PAINT.orange : PAINT.ink}
                strokeWidth={active ? 3.5 : 2.5}
                seed={i * 11 + 21}
                padding={14}
              >
                <View style={styles.typeRow}>
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.typeTitle}>{t.title}</Text>
                    <Text style={styles.typeBlurb}>{t.blurb}</Text>
                  </View>
                  {active && (
                    <Feather name="check-circle" size={22} color={PAINT.orange} />
                  )}
                </View>
              </WobbleBox>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ============================================================ */
/* Step 2 — Scope                                                */
/* ============================================================ */
function ScopeStep({
  typeMeta,
  cityName,
  radius,
  group,
  onGroup,
  speciesList,
  speciesLoading,
  focus,
  onFocus,
}: {
  typeMeta: ReportTypeMeta;
  cityName: string | null;
  radius: number;
  group: GroupFilter;
  onGroup: (g: GroupFilter) => void;
  speciesList: SpeciesCount[];
  speciesLoading: boolean;
  focus: SpeciesCount | undefined;
  onFocus: (s: SpeciesCount | undefined) => void;
}) {
  return (
    <View style={{ marginTop: 18, gap: 14 }}>
      <Text style={styles.stepHeader}>Where & what</Text>

      {/* Area card */}
      <WobbleBox width={358} height={86} fill="white" seed={31} padding={14}>
        <View style={styles.areaRow}>
          <View style={styles.areaIcon}>
            <Feather name="map-pin" size={20} color={PAINT.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.areaLabel}>area</Text>
            <Text style={styles.areaCity}>
              {cityName || "Your Location"}
            </Text>
            <Text style={styles.areaRadius}>{radius} km radius</Text>
          </View>
        </View>
      </WobbleBox>

      {/* Group filter chips */}
      <View>
        <Text style={styles.fieldLabel}>group</Text>
        <View style={styles.chipsWrap}>
          {GROUP_OPTIONS.map((g, i) => {
            const active = group === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  Haptics.selectionAsync();
                  onGroup(g);
                  onFocus(undefined);
                }}
              >
                <WobbleBox
                  width={g === "Pollinators" ? 108 : g === "Amphibians" ? 100 : 78}
                  height={36}
                  fill={active ? PAINT.grass : "white"}
                  seed={i * 5 + 41}
                  padding={0}
                >
                  <View style={styles.chipInner}>
                    <Text style={styles.chipText}>
                      {g === "all" ? "all" : g.toLowerCase()}
                    </Text>
                  </View>
                </WobbleBox>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Species picker (only when type needs it) */}
      {typeMeta.needsSpecies && (
        <View>
          <Text style={styles.fieldLabel}>focus species</Text>
          <Text style={styles.fieldHint}>
            tap a species recorded near you
          </Text>
          {speciesLoading ? (
            <View style={styles.loadingWrap}>
              <Bee size={42} />
              <Text style={styles.loadingText}>
                gathering nearby sightings…
              </Text>
            </View>
          ) : speciesList.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Mushroom size={36} />
              <Text style={styles.emptyText}>
                No species in this group nearby. Try a different group.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8, marginTop: 8 }}>
              {speciesList.slice(0, 12).map((s, i) => {
                const active = focus?.taxon.id === s.taxon.id;
                const photo =
                  s.taxon.default_photo?.square_url ||
                  s.taxon.default_photo?.medium_url;
                const common =
                  s.taxon.preferred_common_name || s.taxon.name;
                return (
                  <Pressable
                    key={s.taxon.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onFocus(active ? undefined : s);
                    }}
                  >
                    <WobbleBox
                      width={358}
                      height={64}
                      fill={active ? PAINT.sun + "55" : "white"}
                      stroke={active ? PAINT.orange : PAINT.ink}
                      strokeWidth={active ? 3 : 2}
                      seed={i * 7 + 71}
                      padding={8}
                    >
                      <View style={styles.speciesRow}>
                        <View style={styles.speciesThumb}>
                          {photo ? (
                            <Image
                              source={{ uri: photo }}
                              style={StyleSheet.absoluteFill}
                              contentFit="cover"
                            />
                          ) : (
                            <View
                              style={[
                                StyleSheet.absoluteFill,
                                styles.speciesThumbFallback,
                              ]}
                            >
                              <Bee size={22} />
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.speciesCommon} numberOfLines={1}>
                            {common}
                          </Text>
                          <Text style={styles.speciesSci} numberOfLines={1}>
                            {s.taxon.name}
                          </Text>
                        </View>
                        <Text style={styles.speciesCount}>{s.count}×</Text>
                      </View>
                    </WobbleBox>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ============================================================ */
/* Step 3 — Preview                                              */
/* ============================================================ */
function PreviewStep({ report }: { report: GeneratedReport }) {
  return (
    <View style={{ marginTop: 18, gap: 14 }}>
      <Text style={styles.stepHeader}>Review the draft</Text>

      {/* Title + meta card */}
      <WobbleBox width={358} height={140} fill="white" seed={91} padding={14}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.previewKicker}>~ Natura Report ~</Text>
          <Text style={styles.previewTitle} numberOfLines={3}>
            {report.title}
          </Text>
          <View style={styles.previewMetaRow}>
            <Text style={styles.previewMetaText}>
              📍 {report.city} · {report.radiusKm}km
            </Text>
            <Text style={styles.previewMetaText}>
              🔬 {report.observationsCount} observations
            </Text>
          </View>
        </View>
      </WobbleBox>

      {/* Bullet summary */}
      <View>
        <Text style={styles.fieldLabel}>at a glance</Text>
        <View style={{ gap: 6, marginTop: 6 }}>
          {report.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Body */}
      <View>
        <Text style={styles.fieldLabel}>full report</Text>
        <WobbleBox
          width={358}
          height={420}
          fill={PAINT.cream}
          seed={97}
          padding={14}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.bodyText}>{report.body}</Text>
          </ScrollView>
        </WobbleBox>
      </View>
    </View>
  );
}

/* ============================================================ */
/* Step 4 — Approve                                              */
/* ============================================================ */
function ApproveStep({
  approved,
  onToggle,
  recipient,
  onRecipient,
  subject,
  onSubject,
  body,
  onBody,
}: {
  approved: boolean;
  onToggle: () => void;
  recipient: Recipient | null;
  onRecipient: (r: Recipient) => void;
  subject: string;
  onSubject: (s: string) => void;
  body: string;
  onBody: (s: string) => void;
}) {
  return (
    <View style={{ marginTop: 18, gap: 14 }}>
      <Text style={styles.stepHeader}>Approve & address</Text>

      {/* Approval checkbox */}
      <Pressable onPress={onToggle}>
        <View
          style={[
            styles.approvalBox,
            {
              borderColor: approved ? PAINT.grassDeep : PAINT.ink,
              backgroundColor: approved ? PAINT.grass + "33" : PAINT.cream,
            },
          ]}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: approved ? PAINT.grassDeep : "white",
              },
            ]}
          >
            {approved && (
              <Feather name="check" size={16} color="white" />
            )}
          </View>
          <Text style={styles.approvalText}>{APPROVAL_TEXT}</Text>
        </View>
      </Pressable>

      {/* Recipient */}
      <View>
        <Text style={styles.fieldLabel}>recipient</Text>
        <View style={{ gap: 8, marginTop: 6 }}>
          {MOCK_RECIPIENTS.map((r, i) => {
            const active = recipient?.id === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  onRecipient(r);
                }}
              >
                <WobbleBox
                  width={358}
                  height={66}
                  fill={active ? PAINT.sun + "55" : "white"}
                  stroke={active ? PAINT.orange : PAINT.ink}
                  strokeWidth={active ? 3 : 2}
                  seed={i * 7 + 121}
                  padding={10}
                >
                  <View style={styles.recipientRow}>
                    <View style={styles.recipientCat}>
                      <Text style={styles.recipientCatText}>{r.category}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipientName} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={styles.recipientEmail} numberOfLines={1}>
                        {r.email}
                      </Text>
                    </View>
                    {active && (
                      <Feather name="check-circle" size={20} color={PAINT.orange} />
                    )}
                  </View>
                </WobbleBox>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.placeholderHint}>
          (placeholder addresses — replace with your local representatives.)
        </Text>
      </View>

      {/* Editable subject */}
      <View>
        <Text style={styles.fieldLabel}>subject (editable)</Text>
        <View style={styles.inputBox}>
          <TextInput
            value={subject}
            onChangeText={onSubject}
            style={styles.input}
            multiline={false}
            placeholderTextColor={PAINT.inkMute}
          />
        </View>
      </View>

      {/* Editable body */}
      <View>
        <Text style={styles.fieldLabel}>email message (editable)</Text>
        <View style={styles.inputBoxLarge}>
          <TextInput
            value={body}
            onChangeText={onBody}
            style={styles.inputLarge}
            multiline
            textAlignVertical="top"
            placeholderTextColor={PAINT.inkMute}
          />
        </View>
      </View>
    </View>
  );
}

/* ============================================================ */
/* Step 5 — Send                                                 */
/* ============================================================ */
function SendStep({
  report,
  recipient,
  onOpenEmail,
  onCopy,
  onShare,
  onSave,
  justSaved,
  onDone,
}: {
  report: GeneratedReport;
  recipient: Recipient;
  onOpenEmail: () => void;
  onCopy: () => void;
  onShare: () => void;
  onSave: () => void;
  justSaved: boolean;
  onDone: () => void;
}) {
  return (
    <View style={{ marginTop: 18, gap: 14, alignItems: "center" }}>
      <Text style={[styles.stepHeader, { textAlign: "center" }]}>
        Ready to send
      </Text>
      <Text style={styles.sendCaption}>
        We&apos;ll open your email app — you do the final send.
      </Text>

      {/* Recipient summary */}
      <WobbleBox width={358} height={70} fill={PAINT.cream} seed={141} padding={12}>
        <View style={styles.sendRecipientRow}>
          <View style={styles.recipientCat}>
            <Text style={styles.recipientCatText}>{recipient.category}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recipientName}>{recipient.name}</Text>
            <Text style={styles.recipientEmail}>{recipient.email}</Text>
          </View>
        </View>
      </WobbleBox>

      {/* Open email button */}
      <WobbleButton
        label="Open Email App"
        onPress={onOpenEmail}
        color={PAINT.grass}
        width={320}
        height={62}
        seed={151}
        leading={<Feather name="mail" size={20} color={PAINT.ink} />}
      />

      {/* Secondary actions */}
      <View style={styles.secondaryGrid}>
        <Pressable style={{ flex: 1 }} onPress={onCopy}>
          <WobbleBox
            width={108}
            height={56}
            fill="white"
            seed={161}
            padding={0}
          >
            <View style={styles.secondaryInner}>
              <Feather name="copy" size={16} color={PAINT.ink} />
              <Text style={styles.secondaryText}>copy</Text>
            </View>
          </WobbleBox>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={onShare}>
          <WobbleBox
            width={108}
            height={56}
            fill="white"
            seed={171}
            padding={0}
          >
            <View style={styles.secondaryInner}>
              <Feather name="share-2" size={16} color={PAINT.ink} />
              <Text style={styles.secondaryText}>share</Text>
            </View>
          </WobbleBox>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={onSave}>
          <WobbleBox
            width={108}
            height={56}
            fill={justSaved ? PAINT.grass : "white"}
            seed={181}
            padding={0}
          >
            <View style={styles.secondaryInner}>
              <Feather
                name={justSaved ? "check" : "archive"}
                size={16}
                color={PAINT.ink}
              />
              <Text style={styles.secondaryText}>
                {justSaved ? "saved!" : "save"}
              </Text>
            </View>
          </WobbleBox>
        </Pressable>
      </View>

      {/* PDF placeholder */}
      <View style={styles.pdfNote}>
        <Feather name="file-text" size={14} color={PAINT.inkMute} />
        <Text style={styles.pdfNoteText}>
          PDF export coming soon. For now, use share or copy to send the
          formatted report.
        </Text>
      </View>

      {/* Done button */}
      <View style={{ marginTop: 12 }}>
        <Pressable onPress={onDone}>
          <WobbleBox
            width={200}
            height={44}
            fill={PAINT.cream}
            seed={191}
            padding={0}
          >
            <View style={styles.doneInner}>
              <Feather name="rotate-ccw" size={14} color={PAINT.ink} />
              <Text style={styles.doneText}>start a new report</Text>
            </View>
          </WobbleBox>
        </Pressable>
      </View>
    </View>
  );
}

/* ============================================================ */
/* Saved reports modal                                           */
/* ============================================================ */
function SavedModal({
  open,
  reports,
  onClose,
  onOpen,
  onDelete,
}: {
  open: boolean;
  reports: SavedReport[];
  onClose: () => void;
  onOpen: (r: SavedReport) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Saved Reports</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={PAINT.ink} />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10 }}>
            {reports.length === 0 ? (
              <View style={{ alignItems: "center", padding: 40, gap: 8 }}>
                <Mushroom size={48} />
                <Text style={styles.emptyText}>
                  Reports you save will appear here.
                </Text>
              </View>
            ) : (
              reports.map((r, i) => (
                <View key={r.id}>
                  <WobbleBox
                    width={320}
                    height={86}
                    fill="white"
                    seed={i * 7 + 201}
                    padding={10}
                  >
                    <View style={styles.savedRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedTitle} numberOfLines={2}>
                          {r.title}
                        </Text>
                        <Text style={styles.savedMeta}>
                          {new Date(r.generatedAt).toLocaleDateString()} ·{" "}
                          {r.observationsCount} obs
                        </Text>
                      </View>
                      <View style={{ gap: 4 }}>
                        <Pressable onPress={() => onOpen(r)} hitSlop={6}>
                          <View style={styles.savedActionBtn}>
                            <Feather
                              name="external-link"
                              size={14}
                              color={PAINT.ink}
                            />
                          </View>
                        </Pressable>
                        <Pressable
                          onPress={() => onDelete(r.id)}
                          hitSlop={6}
                        >
                          <View
                            style={[
                              styles.savedActionBtn,
                              { backgroundColor: PAINT.red + "33" },
                            ]}
                          >
                            <Feather
                              name="trash-2"
                              size={14}
                              color={PAINT.red}
                            />
                          </View>
                        </Pressable>
                      </View>
                    </View>
                  </WobbleBox>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================ */
/* Styles                                                        */
/* ============================================================ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 32,
    color: PAINT.ink,
    transform: [{ rotate: "-1deg" }],
    lineHeight: 36,
  },

  savedBtnInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  savedBtnText: {
    fontFamily: HAND_FONT,
    fontSize: 15,
    color: PAINT.ink,
  },

  /* Stepper */
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingHorizontal: 4,
  },
  stepperItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotNum: { fontFamily: HAND_FONT, fontSize: 14, color: PAINT.ink },
  stepName: { fontFamily: LABEL_FONT, fontSize: 11 },

  stepHeader: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
    transform: [{ rotate: "-0.5deg" }],
  },
  stepCaption: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    marginTop: 2,
  },

  /* Type step */
  typeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeEmoji: { fontSize: 32 },
  typeTitle: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
    lineHeight: 22,
  },
  typeBlurb: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    marginTop: 2,
    lineHeight: 16,
  },

  /* Scope step */
  areaRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  areaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.sun,
    alignItems: "center",
    justifyContent: "center",
  },
  areaLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkMute,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  areaCity: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.ink,
    lineHeight: 24,
  },
  areaRadius: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
  },

  fieldLabel: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.ink,
  },
  fieldHint: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    marginTop: 2,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
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

  loadingWrap: {
    alignItems: "center",
    padding: 32,
    gap: 10,
  },
  loadingText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
  },
  emptyWrap: {
    alignItems: "center",
    padding: 32,
    gap: 10,
  },
  emptyText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  speciesRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  speciesThumb: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.cream,
    overflow: "hidden",
  },
  speciesThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  speciesCommon: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.ink,
    lineHeight: 20,
  },
  speciesSci: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
    fontStyle: "italic",
  },
  speciesCount: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.grassDeep,
  },

  /* Preview step */
  previewKicker: {
    fontFamily: HAND_FONT,
    fontSize: 12,
    color: PAINT.inkMute,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  previewTitle: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
    lineHeight: 22,
  },
  previewMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  previewMetaText: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
  },
  bulletDot: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.orange,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.ink,
    lineHeight: 18,
  },
  bodyText: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.ink,
    lineHeight: 18,
  },

  /* Approve step */
  approvalBox: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 2.5,
    borderStyle: "dashed",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PAINT.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  approvalText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.ink,
    lineHeight: 18,
  },
  recipientRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recipientCat: {
    backgroundColor: PAINT.sun + "55",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    borderRadius: 6,
  },
  recipientCatText: {
    fontFamily: LABEL_FONT,
    fontSize: 10,
    color: PAINT.ink,
    fontWeight: "700",
  },
  recipientName: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.ink,
    lineHeight: 20,
  },
  recipientEmail: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
  },
  placeholderHint: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkMute,
    marginTop: 6,
    fontStyle: "italic",
  },
  inputBox: {
    marginTop: 6,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.ink,
    minHeight: 24,
    padding: 0,
  },
  inputBoxLarge: {
    marginTop: 6,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 220,
  },
  inputLarge: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.ink,
    minHeight: 200,
    padding: 0,
    lineHeight: 18,
  },

  /* Send step */
  sendCaption: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    textAlign: "center",
  },
  sendRecipientRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  secondaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  secondaryInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  secondaryText: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.ink,
  },
  pdfNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    backgroundColor: PAINT.cream,
    borderWidth: 1.5,
    borderColor: PAINT.inkMute,
    borderStyle: "dashed",
    marginTop: 6,
  },
  pdfNoteText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
    lineHeight: 15,
  },
  doneInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  doneText: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.ink,
  },

  /* Nav */
  navRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  navInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  navText: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.ink,
  },

  aiErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: PAINT.inkMute,
    borderStyle: "dashed",
    backgroundColor: PAINT.cream,
  },
  aiErrorText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
    lineHeight: 15,
  },

  /* Disclaimer */
  disclaimerWrap: {
    marginTop: 28,
    padding: 12,
    borderWidth: 1.5,
    borderColor: PAINT.inkMute,
    borderStyle: "dashed",
    backgroundColor: PAINT.paperDeep + "55",
  },
  disclaimerLabel: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
    lineHeight: 16,
    marginTop: 4,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(26, 26, 26, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
    backgroundColor: PAINT.paper,
    borderWidth: 3,
    borderColor: PAINT.ink,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
    transform: [{ rotate: "-1deg" }],
  },
  savedRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  savedTitle: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.ink,
    lineHeight: 18,
  },
  savedMeta: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
    marginTop: 4,
  },
  savedActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
});
