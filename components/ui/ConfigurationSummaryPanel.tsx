"use client";

import React from "react";

/** Display metric for summary rows; placeholders and null → "-" */
function summaryMetric(v: number | string | undefined | null, empty = "-"): string | number {
  if (v === undefined || v === null) return empty;
  if (typeof v === "number" && Number.isNaN(v)) return empty;
  if (v === "-" || (typeof v === "string" && v.toUpperCase() === "N/A")) return empty;
  return v;
}

/** Structure Overview: treat unknown placeholders as zero counts (not "-"). */
function structureOverviewMetric(v: number | string | undefined | null): number {
  const d = summaryMetric(v, "-");
  return d === "-" ? 0 : typeof d === "number" ? d : parseInt(String(d), 10) || 0;
}

export type SetupChecklistItem = { label: string; completed: boolean };

/** Drive checklist ticks from the same numbers shown in Structure Overview + Room Status */
function deriveFacilitySetupChecklist(
  buildings?: number | string,
  floors?: number | string,
  totalRooms?: number | string,
  configuredRooms?: number | string,
  incompleteRooms?: number | string,
): SetupChecklistItem[] {
  const b = structureOverviewMetric(buildings);
  const f = structureOverviewMetric(floors);
  const tr = structureOverviewMetric(totalRooms);
  const crDisplay = summaryMetric(configuredRooms);
  const irDisplay = summaryMetric(incompleteRooms);
  const metricsKnown = crDisplay !== "-" && irDisplay !== "-";
  const crNum =
    typeof crDisplay === "number"
      ? crDisplay
      : crDisplay === "-"
        ? NaN
        : parseInt(String(crDisplay), 10);
  const irNum =
    typeof irDisplay === "number"
      ? irDisplay
      : irDisplay === "-"
        ? NaN
        : parseInt(String(irDisplay), 10);

  const allConfigured =
    metricsKnown &&
    tr > 0 &&
    Number.isFinite(crNum) &&
    Number.isFinite(irNum) &&
    irNum === 0 &&
    crNum >= tr;

  return [
    { label: "Add Buildings", completed: b > 0 },
    { label: "Add Floors", completed: f > 0 },
    { label: "Add Rooms", completed: tr > 0 },
    { label: "Configure All Rooms", completed: allConfigured },
  ];
}

/** When parents pass "-" / empty, show a clear fallback instead of a bare dash */
function resolveLastModifiedDisplay(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (t === "" || t === "-" || t === "—" || t.toUpperCase() === "N/A") {
    return "Not yet modified";
  }
  return t;
}

type ConfigurationSummaryPanelProps = {
  facilityName: string;
  facilityType?: "Hospital" | "Clinic";
  /** When `null`, overall completion is shown as "-". */
  completionPercentage: number | null;
  isOpen: boolean;
  onClose: () => void;
  buildings?: number | string;
  floors?: number | string;
  totalRooms?: number | string;
  configuredRooms?: number | string;
  incompleteRooms?: number | string;
  lastModified?: string;
};

export const ConfigurationSummaryPanel = ({
  facilityName,
  facilityType: _facilityType = "Hospital",
  completionPercentage,
  isOpen,
  onClose,
  buildings,
  floors,
  totalRooms,
  configuredRooms,
  incompleteRooms,
  lastModified = "-",
}: ConfigurationSummaryPanelProps) => {
  if (!isOpen) return null;

  const lastModifiedDisplay = resolveLastModifiedDisplay(lastModified);
  const setupChecklist = deriveFacilitySetupChecklist(
    buildings,
    floors,
    totalRooms,
    configuredRooms,
    incompleteRooms,
  );

  const safeCompletion =
    completionPercentage != null && Number.isFinite(completionPercentage)
      ? Math.min(100, Math.max(0, completionPercentage))
      : null;

  const progressLabel =
    safeCompletion === null ? "-" : safeCompletion >= 100 ? "Complete" : "In Progress";

  return (
    <div className="w-[20%] flex-shrink-0">
      <div className="sticky top-0 rounded-[12px] border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Configuration Summary</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            aria-label="Close panel"
          >
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-base font-medium text-gray-700 mb-6">{facilityName}</p>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Overall Progress</h3>
          <div className="mb-2">
            <div className="h-2 bg-green-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: safeCompletion === null ? "0%" : `${safeCompletion}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">{progressLabel}</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Structure Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-5 w-5 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 flex-1">Buildings</span>
              <span className="text-sm font-semibold text-gray-900">{structureOverviewMetric(buildings)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-5 w-5 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 flex-1">Floors</span>
              <span className="text-sm font-semibold text-gray-900">{structureOverviewMetric(floors)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-5 w-5 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 flex-1">Total Rooms</span>
              <span className="text-sm font-semibold text-gray-900">{structureOverviewMetric(totalRooms)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Room Status</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600 flex-1">Configured</span>
              <span className="text-sm font-semibold text-gray-900">{summaryMetric(configuredRooms)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              <span className="text-sm text-gray-600 flex-1">Incomplete</span>
              <span className="text-sm font-semibold text-gray-900">{summaryMetric(incompleteRooms)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Setup Checklist</h3>
          <div className="space-y-2">
            {setupChecklist.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                {item.completed ? (
                  <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-green-500">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex-shrink-0 h-5 w-5 rounded-full border-2 border-gray-300"></div>
                )}
                <span className={`text-sm ${item.completed ? "text-gray-600" : "text-gray-400"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 mt-4">
          <p className="text-xs text-gray-500 mb-1">Last Modified</p>
          <p className="text-sm font-medium text-gray-800">{lastModifiedDisplay}</p>
        </div>
      </div>
    </div>
  );
};
