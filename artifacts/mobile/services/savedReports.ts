import type { GeneratedReport } from "./reportTemplate";
import { secureLargeDelete, secureLargeRead, secureLargeWrite } from "./secureStorage";

const KEY = "lifeweb.savedReports.v1";
const MAX_REPORTS = 10;

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
    const raw = await secureLargeRead(KEY);
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
  await secureLargeWrite(KEY, JSON.stringify(trimmed));
}

export async function deleteReport(id: string): Promise<void> {
  const list = await loadReports();
  const next = list.filter((r) => r.id !== id);
  await secureLargeWrite(KEY, JSON.stringify(next));
}

export async function clearReports(): Promise<void> {
  await secureLargeDelete(KEY);
}
