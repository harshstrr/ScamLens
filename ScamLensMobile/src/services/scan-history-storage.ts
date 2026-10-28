import type { ScanResult } from "./api-types";
import { appStorage } from "@/utils/app-storage";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

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

type NativeHistorySettings = {
  setScanHistoryEnabled(enabled: boolean): Promise<boolean>;
};

const syncNativeHistorySetting = async (enabled: boolean): Promise<void> => {
  if (Platform.OS !== "android") return;
  const nativeModule =
    requireOptionalNativeModule<NativeHistorySettings>("MyModule");
  if (nativeModule) await nativeModule.setScanHistoryEnabled(enabled);
};

export type LocalScan = Omit<ScanResult, "id"> & { id: string };

const isStoredScan = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  ("id" in value || "local_id" in value) &&
  (!("id" in value) || typeof value.id === "string" || value.id === null) &&
  (!("local_id" in value) || typeof value.local_id === "string") &&
  "risk_level" in value &&
  typeof value.risk_level === "string" &&
  "created_at" in value &&
  typeof value.created_at === "string";

const normalizeStoredScan = (scan: Record<string, unknown>): LocalScan => {
  const legacyLocalId = scan.local_id;
  const id =
    typeof scan.id === "string"
      ? scan.id
      : typeof legacyLocalId === "string"
        ? legacyLocalId
        : "";
  const data = { ...scan };
  delete data.local_id;
  delete data.saved_to_history;
  return { ...data, id } as LocalScan;
};

const createScanId = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });

export const startGuestSession = async (): Promise<void> => {
  await appStorage.setItem(GUEST_MODE_KEY, "true");
};

export const getHistoryPreferences =
  async (): Promise<HistoryPreferences> => {
    const value = await appStorage.getItem(HISTORY_PREFERENCES_KEY);
    if (!value) {
      await syncNativeHistorySetting(DEFAULT_PREFERENCES.enabled);
      return DEFAULT_PREFERENCES;
    }

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
    const parsedPreferences = preferences as HistoryPreferences;
    await syncNativeHistorySetting(parsedPreferences.enabled);
    return parsedPreferences;
  };

export const saveHistoryPreferences = async (
  preferences: HistoryPreferences,
): Promise<void> => {
  await appStorage.setItem(
    HISTORY_PREFERENCES_KEY,
    JSON.stringify(preferences),
  );
  await syncNativeHistorySetting(preferences.enabled);
  await getLocalScans();
};

export const getLocalScans = async (): Promise<LocalScan[]> => {
  const value = await appStorage.getItem(SCAN_HISTORY_KEY);
  if (!value) return [];

  const scans: unknown = JSON.parse(value);
  if (!Array.isArray(scans) || !scans.every(isStoredScan)) {
    throw new Error("Saved scan history is invalid and could not be loaded.");
  }
  const normalizedScans = scans.map(normalizeStoredScan);
  if (normalizedScans.some((scan) => !scan.id)) {
    throw new Error("Saved scan history contains a scan without an id.");
  }
  if (
    normalizedScans.some(
      (scan) => !Number.isFinite(Date.parse(scan.created_at)),
    )
  ) {
    throw new Error("Saved scan history contains an invalid timestamp.");
  }
  const preferences = await getHistoryPreferences();
  if (preferences.retentionDays === null) {
    if (
      scans.some(
        (scan) => "local_id" in scan || "saved_to_history" in scan,
      )
    ) {
      await appStorage.setItem(
        SCAN_HISTORY_KEY,
        JSON.stringify(normalizedScans),
      );
    }
    return normalizedScans;
  }

  const cutoff = Date.now() - preferences.retentionDays * 24 * 60 * 60 * 1000;
  const retainedScans = normalizedScans.filter(
    (scan) => new Date(scan.created_at).getTime() >= cutoff,
  );
  if (
    retainedScans.length !== scans.length ||
    scans.some((scan) => "local_id" in scan || "saved_to_history" in scan)
  ) {
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
  const scanData: ScanResult = { ...result };
  delete scanData.saved_to_history;
  const localScan: LocalScan = {
    ...scanData,
    id: result.id || createScanId(),
  };
  const updatedScans = [
    localScan,
    ...scans.filter((scan) => scan.id !== localScan.id),
  ];
  await appStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updatedScans));
  return localScan;
};

export const getLocalScan = async (
  id: string,
): Promise<LocalScan | undefined> => {
  const scans = await getLocalScans();
  return scans.find((scan) => scan.id === id);
};

export const removeLocalScan = async (localId: string): Promise<void> => {
  const scans = await getLocalScans();
  await appStorage.setItem(
    SCAN_HISTORY_KEY,
    JSON.stringify(scans.filter((scan) => scan.id !== localId)),
  );
};

export const clearLocalScans = async (): Promise<void> => {
  await appStorage.removeItem(SCAN_HISTORY_KEY);
};
