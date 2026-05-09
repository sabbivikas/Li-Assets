import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GeneratedReport } from "./reportTemplate";

const KEY = "lifeweb.savedReports.v1";
const MAX_REPORTS = 25;

export interface SavedReport extends GeneratedReport {
  approvalStatus: "pending" | "approved";
  userEditedSubject?: string;
  userEditedBody?: string;
  recipientId?: string;
  /** True when the report was generated while the author held an active supporter entitlement. */
  generatedAsSupporter?: boolean;
}

export async function loadReports(): Promise<SavedReport[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedReport[]) : [];
  } catch {
    return [];
  }
}

export async function saveReport(report: SavedReport): Promise<void> {
  const list = await loadReports();
  const idx = list.findIndex((r) => r.id === report.id);
  if (idx >= 0) {
    list[idx] = report;
  } else {
    list.unshift(report);
  }
  const trimmed = list.slice(0, MAX_REPORTS);
  await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
}

export async function deleteReport(id: string): Promise<void> {
  const list = await loadReports();
  const next = list.filter((r) => r.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearReports(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
