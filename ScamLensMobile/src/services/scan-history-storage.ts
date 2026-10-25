import type { ScanResult } from "./api-types";
import { appStorage } from "@/utils/app-storage";

const SCAN_HISTORY_KEY = "scan-history";
const GUEST_MODE_KEY = "guest-mode";
const HISTORY_PREFERENCES_KEY = "scan-history-preferences";

export type RetentionDays = 7 | 30 | null;

export interface HistoryPreferences {
  enabled: boolean;
  retentionDays: RetentionDays;
}

const DEFAULT_PREFERENCES: HistoryPreferences = {
  enabled: true,
  retentionDays: 30,
};

export interface LocalScan extends ScanResult {
  local_id: string;
}

const isLocalScan = (value: unknown): value is LocalScan =>
  typeof value === "object" &&
  value !== null &&
  "local_id" in value &&
  typeof value.local_id === "string" &&
  "risk_level" in value &&
  typeof value.risk_level === "string" &&
  "created_at" in value &&
  typeof value.created_at === "string";

export const startGuestSession = async (): Promise<void> => {
  await appStorage.setItem(GUEST_MODE_KEY, "true");
};

export const getHistoryPreferences =
  async (): Promise<HistoryPreferences> => {
    const value = await appStorage.getItem(HISTORY_PREFERENCES_KEY);
    if (!value) return DEFAULT_PREFERENCES;

    const preferences: unknown = JSON.parse(value);
    if (
      typeof preferences !== "object" ||
      preferences === null ||
      !("enabled" in preferences) ||
      typeof preferences.enabled !== "boolean" ||
      !("retentionDays" in preferences) ||
      !(
        preferences.retentionDays === 7 ||
        preferences.retentionDays === 30 ||
        preferences.retentionDays === null
      )
    ) {
      throw new Error("Saved history preferences are invalid.");
    }
    return preferences as HistoryPreferences;
  };

export const saveHistoryPreferences = async (
  preferences: HistoryPreferences,
): Promise<void> => {
  await appStorage.setItem(
    HISTORY_PREFERENCES_KEY,
    JSON.stringify(preferences),
  );
};

export const getLocalScans = async (): Promise<LocalScan[]> => {
  const value = await appStorage.getItem(SCAN_HISTORY_KEY);
  if (!value) return [];

  const scans: unknown = JSON.parse(value);
  if (!Array.isArray(scans) || !scans.every(isLocalScan)) {
    throw new Error("Saved scan history is invalid and could not be loaded.");
  }
  if (scans.some((scan) => !Number.isFinite(Date.parse(scan.created_at)))) {
    throw new Error("Saved scan history contains an invalid timestamp.");
  }
  const preferences = await getHistoryPreferences();
  if (preferences.retentionDays === null) return scans;

  const cutoff = Date.now() - preferences.retentionDays * 24 * 60 * 60 * 1000;
  const retainedScans = scans.filter(
    (scan) => new Date(scan.created_at).getTime() >= cutoff,
  );
  if (retainedScans.length !== scans.length) {
    await appStorage.setItem(
      SCAN_HISTORY_KEY,
      JSON.stringify(retainedScans),
    );
  }
  return retainedScans;
};

export const saveLocalScan = async (
  result: ScanResult,
): Promise<LocalScan | null> => {
  const preferences = await getHistoryPreferences();
  if (!preferences.enabled) return null;

  const scans = await getLocalScans();
  const localScan: LocalScan = {
    ...result,
    local_id:
      result.id ??
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
  const updatedScans = [
    localScan,
    ...scans.filter((scan) => scan.local_id !== localScan.local_id),
  ];
  await appStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updatedScans));
  return localScan;
};

export const removeLocalScan = async (localId: string): Promise<void> => {
  const scans = await getLocalScans();
  await appStorage.setItem(
    SCAN_HISTORY_KEY,
    JSON.stringify(scans.filter((scan) => scan.local_id !== localId)),
  );
};

export const clearLocalScans = async (): Promise<void> => {
  await appStorage.removeItem(SCAN_HISTORY_KEY);
};
