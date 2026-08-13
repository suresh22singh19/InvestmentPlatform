/**
 * Utility to track active/ongoing patient consultation tabs in localStorage.
 * Prevents opening the same patient consultation simultaneously in multiple tabs (including duplicated tabs).
 */

const STORAGE_KEY = "ongoing_consultations_registry_v2";
const CUSTOM_EVENT_NAME = "ongoing_consultations_changed";
const STALE_TIMEOUT_MS = 30 * 60 * 1000; // 20 minutes timeout for tab crash protection (1,200,000 ms)

// Unique in-memory ID for this JS execution environment (browser tab instance).
// Note: We use an in-memory variable instead of sessionStorage because browser tab duplication
// (Right-click tab -> Duplicate) copies sessionStorage verbatim, whereas in-memory variables
// are freshly generated for every tab execution environment.
const TAB_ID =
  typeof window !== "undefined"
    ? "tab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9)
    : "";

export interface ConsultationTabRecord {
  tabId: string;
  updatedAt: number;
  patientName?: string;
  step?: number;
}

export function getTabId(): string {
  return TAB_ID;
}

/**
 * Reads the ongoing consultations map from localStorage, automatically removing stale entries.
 */
export function getOngoingConsultationsMap(): Record<string, ConsultationTabRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const map: Record<string, ConsultationTabRecord> = JSON.parse(raw);
    const now = Date.now();
    let cleaned = false;

    for (const [appId, record] of Object.entries(map)) {
      if (!record || !record.tabId || now - (record.updatedAt || 0) > STALE_TIMEOUT_MS) {
        delete map[appId];
        cleaned = true;
      }
    }

    if (cleaned) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
    return map;
  } catch (e) {
    return {};
  }
}

/**
 * Registers an appointment as currently active/ongoing in the current tab.
 */
export function registerOngoingConsultation(
  appointmentId: string | number,
  extra?: { patientName?: string; step?: number }
): void {
  if (typeof window === "undefined" || !appointmentId) return;
  const appIdStr = String(appointmentId).trim();
  if (!appIdStr || !TAB_ID) return;

  try {
    const map = getOngoingConsultationsMap();
    const existing = map[appIdStr];
    const isNewOrChanged = !existing || existing.tabId !== TAB_ID || existing.step !== extra?.step;

    map[appIdStr] = {
      tabId: TAB_ID,
      updatedAt: Date.now(),
      ...(extra?.patientName ? { patientName: extra.patientName } : {}),
      ...(extra?.step !== undefined ? { step: extra.step } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));

    if (isNewOrChanged) {
      window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME));
    }
  } catch (e) {
    console.error("Failed to register ongoing consultation:", e);
  }
}

/**
 * Unregisters an appointment from ongoing consultations if registered by the current tab.
 */
export function unregisterOngoingConsultation(appointmentId: string | number): void {
  if (typeof window === "undefined" || !appointmentId) return;
  const appIdStr = String(appointmentId).trim();
  if (!appIdStr || !TAB_ID) return;

  try {
    const map = getOngoingConsultationsMap();
    if (map[appIdStr] && map[appIdStr].tabId === TAB_ID) {
      delete map[appIdStr];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME));
    }
  } catch (e) {
    console.error("Failed to unregister ongoing consultation:", e);
  }
}

/**
 * Checks if a consultation for the given appointment ID is ongoing in ANOTHER browser tab.
 */
export function isConsultationOngoingInAnotherTab(appointmentId: string | number): boolean {
  if (typeof window === "undefined" || !appointmentId) return false;
  const appIdStr = String(appointmentId).trim();
  const map = getOngoingConsultationsMap();
  const record = map[appIdStr];

  return Boolean(record && record.tabId && record.tabId !== TAB_ID);
}

/**
 * Returns a Set of appointment IDs (as strings) that are ongoing in OTHER tabs.
 */
export function getOngoingInOtherTabsAppointmentIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const map = getOngoingConsultationsMap();
  const otherTabsSet = new Set<string>();

  for (const [appId, record] of Object.entries(map)) {
    if (record && record.tabId && record.tabId !== TAB_ID) {
      otherTabsSet.add(appId);
    }
  }

  return otherTabsSet;
}
