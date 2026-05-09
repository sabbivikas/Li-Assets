import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "natura.freeTierReports.v1";
export const FREE_REPORT_LIMIT = 5;

interface CapState {
  yearMonth: string; // "YYYY-MM"
  count: number;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function readState(): Promise<CapState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { yearMonth: currentMonth(), count: 0 };
    const parsed = JSON.parse(raw) as CapState;
    if (parsed.yearMonth !== currentMonth()) {
      return { yearMonth: currentMonth(), count: 0 };
    }
    return parsed;
  } catch {
    return { yearMonth: currentMonth(), count: 0 };
  }
}

export async function getReportsThisMonth(): Promise<number> {
  return (await readState()).count;
}

export async function recordReportGenerated(): Promise<number> {
  const state = await readState();
  const next: CapState = { yearMonth: state.yearMonth, count: state.count + 1 };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next.count;
}

export async function canGenerateReport(): Promise<boolean> {
  const state = await readState();
  return state.count < FREE_REPORT_LIMIT;
}
