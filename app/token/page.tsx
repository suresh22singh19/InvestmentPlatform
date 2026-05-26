"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  FormInputField,
  FormSelectField,
  MessageDialog,
  ScrollableContainer,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetDoctorsByBranchQuery } from "@/store/api/registrationApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { selectUserBranchId, selectUserBranchName } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import type { SelectOption } from "@/components/ui/FormSelectField";

const STORAGE_MONITORS = "tokenDisplayMonitors";

type MonitorConfig = {
  id: string;
  location: string;
  viewType: string;
  doctorIds: string[];
  refreshSeconds: number;
  /** When more than 3 doctors are selected: seconds before switching to the next group of 3. */
  rotationSeconds: number;
  resolutionOn: boolean;
};

const VIEW_OPTIONS = [
  { value: "doctor", label: "Doctor-wise Token View" },
  // { value: "department", label: "Department-wise Token View" },
  // { value: "counter", label: "Counter-wise Token View" },
  { value: "general", label: "General Token List" },
];

const REFRESH_OPTIONS = [
  { value: "5", label: "5 Seconds" },
  { value: "10", label: "10 Seconds" },
  { value: "30", label: "30 Seconds" },
  { value: "60", label: "1 Minute" },
  { value: "300", label: "5 Minutes" },
];

/** How long each “page” of up to 3 doctors stays on screen before rotating (when &gt;3 doctors). */
const ROTATION_OPTIONS = [
  { value: "10", label: "10 Seconds" },
  { value: "15", label: "15 Seconds" },
  { value: "30", label: "30 Seconds" },
  { value: "45", label: "45 Seconds" },
  { value: "60", label: "1 Minute" },
];

const VIEW_PREVIEW_BY_TYPE: Record<
  string,
  { label: string; imageSrc: string; imageAlt: string }
> = {
  doctor: {
    label: "Doctor-wise Token View",
    imageSrc: "/images/doctorwiseToken.png",
    imageAlt: "Doctor-wise Token View",
  },
  department: {
    label: "Department-wise Token View",
    imageSrc: "/images/departmentwiseToken.png",
    imageAlt: "Department-wise Token View",
  },
  counter: {
    label: "Counter-wise Token View",
    imageSrc: "/images/CounterwiseToken.png",
    imageAlt: "Counter-wise Token View",
  },
  general: {
    label: "General Token List",
    imageSrc: "/images/generalToken.png",
    imageAlt: "General Token List",
  },
};

function getViewPreviewMeta(viewType: string) {
  return VIEW_PREVIEW_BY_TYPE[viewType] ?? VIEW_PREVIEW_BY_TYPE.doctor;
}

function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || str === "") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDateInputLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function createMonitor(): MonitorConfig {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    location: "OPD Waiting Area",
    viewType: "doctor",
    doctorIds: [],
    refreshSeconds: 10,
    rotationSeconds: 15,
    resolutionOn: true,
  };
}

function buildViewListHref(params: {
  branchId: number;
  doctorIds: string[];
  view: string;
  appointmentDate: string;
  refreshSeconds: number;
  rotationSeconds: number;
}): string | null {
  const ids = params.doctorIds
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return null;
  const qs = new URLSearchParams();
  qs.set("view", params.view);
  qs.set("doctorIds", ids.join(","));
  qs.set("appointmentDate", params.appointmentDate);
  qs.set("branchId", String(params.branchId));
  const sec = Number(params.refreshSeconds);
  const safeSec = Number.isFinite(sec) && sec > 0 ? sec : 10;
  qs.set("refreshMs", String(Math.max(1000, safeSec * 1000)));
  const rotSec = Number(params.rotationSeconds);
  const safeRot = Number.isFinite(rotSec) && rotSec > 0 ? rotSec : 15;
  qs.set("rotationMs", String(Math.max(5000, safeRot * 1000)));
  return `/token/view-list?${qs.toString()}`;
}

export default function TokenDisplayConfigurationPage() {
  const authBranchId = useAppSelector(selectUserBranchId);
  const branchName = useAppSelector(selectUserBranchName);

  const {
    selectedBranchFilter: selectedBranchId,
    setSelectedBranchFilter: setSelectedBranchId,
    branchFilterOptions: branchOptions,
    isLoadingBranches,
    isBranchFilterDisabled,
    filterBranchId: hookFilterBranchId,
    isSuperAdmin: isTokenBranchSuperAdmin,
  } = useBranchFilter();

  const { data: branchesData } = useGetBranchesQuery(undefined, {
    skip: !isTokenBranchSuperAdmin,
  });

  const branchOptionsWithType = useMemo((): SelectOption[] => {
    const rows = branchesData?.data;
    const mapped =
      !Array.isArray(rows) || rows.length === 0
        ? branchOptions
        : branchOptions.map((opt) => {
            if (opt.value === "") return opt;
            const id = parseInt(String(opt.value), 10);
            if (!Number.isFinite(id)) return opt;
            const b = rows.find((x) => Number(x.id) === id);
            const t = b?.type?.trim();
            if (!b || !t) return opt;
            return {
              value: opt.value,
              label: `${b.name} (${capitalizeFirst(t)})`,
            };
          });
    if (isTokenBranchSuperAdmin) {
      return mapped.filter((o) => o.value !== "");
    }
    return mapped;
  }, [branchOptions, branchesData, isTokenBranchSuperAdmin]);

  /** Super Admin: default to first branch (same as dashboard / pre-booking). */
  useEffect(() => {
    if (!isTokenBranchSuperAdmin) return;
    if (isLoadingBranches) return;
    const rows = branchesData?.data;
    if (!Array.isArray(rows) || rows.length === 0) return;
    if (selectedBranchId !== "") return;
    setSelectedBranchId(String(rows[0].id));
  }, [
    isTokenBranchSuperAdmin,
    isLoadingBranches,
    branchesData,
    selectedBranchId,
    setSelectedBranchId,
  ]);

  const effectiveTokenBranchId = useMemo((): number | null => {
    if (isTokenBranchSuperAdmin) {
      if (
        hookFilterBranchId != null &&
        Number.isFinite(hookFilterBranchId) &&
        hookFilterBranchId > 0
      ) {
        return hookFilterBranchId;
      }
      return null;
    }
    const n = Number(authBranchId);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [isTokenBranchSuperAdmin, hookFilterBranchId, authBranchId]);

  const skipDoctors =
    effectiveTokenBranchId == null ||
    typeof effectiveTokenBranchId !== "number" ||
    Number.isNaN(Number(effectiveTokenBranchId));

  /** Parent module + submodule both named "Tokens" → slug `tokens` */
  const tokensPerm = usePermission("tokens", { subModule: "tokens" });
  const canView = tokensPerm.canView;
  const canAdd = tokensPerm.canAdd;

  const { data: doctorsRes, isLoading: doctorsLoading } = useGetDoctorsByBranchQuery(
    { branchId: effectiveTokenBranchId ?? 0 },
    { skip: skipDoctors, refetchOnMountOrArgChange: true }
  );

  const doctorOptions = useMemo(
    () =>
      (doctorsRes?.data ?? []).map((d) => ({
        label: d.name,
        value: String(d.id),
      })),
    [doctorsRes]
  );

  const [monitors, setMonitors] = useState<MonitorConfig[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const prevTokenBranchRef = useRef<number | null>(null);
  /** Doctor IDs are branch-specific; clear selections when Super Admin switches branch. */
  useEffect(() => {
    if (effectiveTokenBranchId == null) return;
    const prev = prevTokenBranchRef.current;
    if (prev != null && prev !== effectiveTokenBranchId) {
      setMonitors((m) => m.map((row) => ({ ...row, doctorIds: [] })));
    }
    prevTokenBranchRef.current = effectiveTokenBranchId;
  }, [effectiveTokenBranchId]);

  /** Always use local calendar date for live links and display (not persisted). */
  const todayAppointmentDate = formatDateInputLocal(new Date());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_MONITORS);
      if (raw) {
        const parsed = JSON.parse(raw) as MonitorConfig[];
        if (Array.isArray(parsed)) {
          setMonitors(
            parsed.map((m) => ({
              ...m,
              rotationSeconds:
                typeof m.rotationSeconds === "number" && Number.isFinite(m.rotationSeconds) && m.rotationSeconds > 0
                  ? m.rotationSeconds
                  : 15,
            }))
          );
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const addMonitor = useCallback(() => {
    setMonitors((prev) => [...prev, createMonitor()]);
  }, []);

  const removeMonitor = useCallback((id: string) => {
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMonitor = useCallback((id: string, patch: Partial<MonitorConfig>) => {
    setMonitors((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_MONITORS, JSON.stringify(monitors));
      setSuccessMessage("Display configuration saved.");
      setShowSuccessDialog(true);
    } catch {
      setErrorMessage("Could not save configuration.");
      setShowErrorDialog(true);
    }
  }, [monitors]);

  const locationLabel = useMemo(() => {
    if (isTokenBranchSuperAdmin && hookFilterBranchId != null && branchesData?.data) {
      const b = branchesData.data.find((x) => Number(x.id) === hookFilterBranchId);
      if (b?.name?.trim()) return b.name.trim();
    }
    return branchName?.trim() || "SR Hospital";
  }, [isTokenBranchSuperAdmin, hookFilterBranchId, branchesData, branchName]);

  if (!canView) {
    return (
      <AppShell>
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
          You don&apos;t have permission to view Tokens display configuration.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeading title="Display Configuration" />
          <div className="flex flex-wrap items-center justify-end gap-4">
            {isTokenBranchSuperAdmin ? (
              <div className="flex-shrink-0" style={{ width: "300px" }}>
                <FormSelectField
                  label=""
                  hideLabel
                  value={selectedBranchId}
                  onChange={(value) => {
                    const newValue = Array.isArray(value) ? value[0] : value ?? "";
                    setSelectedBranchId(newValue);
                  }}
                  options={branchOptionsWithType}
                  placeholder={isLoadingBranches ? "Loading branches..." : "Select branch"}
                  mode="single"
                  background="normal"
                  disabled={isBranchFilterDisabled || isLoadingBranches}
                />
              </div>
            ) : null}
            <h5 className="font-inter text-[18px] leading-[120%] text-[#262D3B]">
              Location: <span className="font-semibold">{locationLabel}</span>
            </h5>
            {/* <button
              type="button"
              onClick={handleSave}
              disabled={!hydrated}
              className="flex h-11 items-center gap-2 rounded-full border border-[#0B8C00] px-5 text-sm font-semibold text-[#0B8C00] shadow-[0px_20px_40px_rgba(34,56,43,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Changes
            </button> */}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-3">
            <ListBorder as="section" className="px-4 py-4">
              {!hydrated ? (
                <p className="text-sm text-[#7B8089]">Loading…</p>
              ) : monitors.length === 0 ? (
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-4 py-6 text-center shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                  <h3 className="mb-2 font-inter text-[20px] font-semibold leading-[120%] text-[#262D3B]">
                    Available View
                  </h3>
                  <p className="text-sm text-[#7B8089]">
                    {canAdd
                      ? "Add a monitor under Connected Monitors to see preview layouts for each screen."
                      : "Preview layouts appear here when monitors are configured."}
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="mb-4 font-inter text-[24px] font-semibold leading-[120%] text-[#262D3B]">
                    Available View
                  </h3>
                  <ScrollableContainer
                    maxHeight="min(80vh, calc(100vh - 12rem))"
                    className="flex flex-col gap-6 pr-1"
                  >
                  {monitors.map((monitor, monitorIndex) => {
                    const previewMeta = getViewPreviewMeta(monitor.viewType);
                    const previewHref =
                      effectiveTokenBranchId != null
                        ? buildViewListHref({
                            branchId: effectiveTokenBranchId,
                            doctorIds: monitor.doctorIds,
                            view: monitor.viewType,
                            appointmentDate: todayAppointmentDate,
                            refreshSeconds: monitor.refreshSeconds,
                            rotationSeconds: monitor.rotationSeconds ?? 15,
                          })
                        : null;

                    const cardInner = (
                      <>
                        <img
                          src={previewMeta.imageSrc}
                          alt={previewMeta.imageAlt}
                          className="h-auto w-full"
                        />
                        <h4 className="text-center text-[15px] font-medium leading-[120%] text-[#262D3B]">
                          {previewMeta.label}
                        </h4>
                        <p className="text-center text-[11px] font-medium text-[#8A8F9B]">
                          Monitor {monitorIndex + 1}
                        </p>
                      </>
                    );

                    return (
                      <div key={monitor.id} className="min-w-0">
                        <p className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-[#0B8C00]">
                          Monitor {monitorIndex + 1}
                        </p>
                        <div className="overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-4 pb-5 pt-4 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                          {previewHref ? (
                            <Link
                              href={previewHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[20px] border border-[#E9F3E6] p-4 transition-shadow hover:border-[#0B8C00]/30 hover:shadow-md"
                            >
                              {cardInner}
                            </Link>
                          ) : (
                            <div
                              className="flex flex-col items-center gap-1.5 rounded-[20px] border border-dashed border-[#DFE0E2] bg-[#FAFBFA] p-4 opacity-80"
                              title="Select at least one doctor for this monitor on the right"
                            >
                              {cardInner}
                              <span className="text-center text-[10px] text-[#F6776E]">
                                Select doctors to open
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </ScrollableContainer>
                </>
              )}
            </ListBorder>
          </div>

          <div className="col-span-12 lg:col-span-9">
            <ListBorder as="section" className="px-4 py-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-inter text-[24px] font-semibold leading-[120%] text-[#262D3B]">
                  Connected Monitors
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {/* <FormInputField
                    label="Appointment date (today)"
                    type="date"
                    value={todayAppointmentDate}
                    readOnly
                    title="Token display uses today's date"
                    height={40}
                  /> */}
                  {canAdd ? (
                    monitors.length === 0 ? (
                      <Button type="button" variant="primary" onClick={addMonitor}>
                        Add Monitor
                      </Button>
                    ) : (
                      <Button type="button" variant="primary" onClick={addMonitor}>
                        Add More Monitor
                      </Button>
                    )
                  ) : null}
                </div>
              </div>

              <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                {!hydrated ? (
                  <p className="text-sm text-[#7B8089]">Loading…</p>
                ) : monitors.length === 0 ? (
                  <p className="text-center text-[#434956]">
                    {canAdd ? (
                      <>
                        No monitors yet. Use <strong>Add Monitor</strong> to create one.
                      </>
                    ) : (
                      "No monitors configured for this branch."
                    )}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {monitors.map((monitor, index) => {
                      const liveHref =
                        effectiveTokenBranchId != null
                          ? buildViewListHref({
                              branchId: effectiveTokenBranchId,
                              doctorIds: monitor.doctorIds,
                              view: monitor.viewType,
                              appointmentDate: todayAppointmentDate,
                              refreshSeconds: monitor.refreshSeconds,
                              rotationSeconds: monitor.rotationSeconds ?? 15,
                            })
                          : null;

                      return (
                        <div
                          key={monitor.id}
                          className="rounded-[20px] border border-[#E9F3E6] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <h4 className="text-[16px] font-medium leading-[120%] text-[#262D3B]">
                                Monitor {index + 1}
                              </h4>
                              <h5 className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                Location:{" "}
                                <span className="font-normal text-[#434956]">{monitor.location}</span>
                              </h5>
                            </div>
                            <div className="screen-toggle">
                              <Toggle
                                checked={monitor.resolutionOn}
                                onChange={() =>
                                  updateMonitor(monitor.id, {
                                    resolutionOn: !monitor.resolutionOn,
                                  })
                                }
                                label="1920×1080"
                                disabled={!canAdd}
                              />
                            </div>
                          </div>

                          <div className="mb-3 flex flex-col gap-3">
                            <FormInputField
                              label="Area / location"
                              value={monitor.location}
                              onChange={(e) =>
                                updateMonitor(monitor.id, { location: e.target.value })
                              }
                              height={38}
                              disabled={!canAdd}
                            />
                            <FormSelectField
                              label=""
                              hideLabel
                              options={VIEW_OPTIONS}
                              placeholder="Select view"
                              background="white"
                              value={monitor.viewType}
                              onChange={(value) => {
                                if (typeof value === "string") {
                                  updateMonitor(monitor.id, { viewType: value });
                                }
                              }}
                              height={38}
                              disabled={!canAdd}
                            />
                            <FormSelectField
                              label="Doctors"
                              mode="multiple"
                              options={doctorOptions}
                              placeholder={
                                doctorsLoading ? "Loading doctors…" : "Select doctors"
                              }
                              background="white"
                              value={monitor.doctorIds}
                              onChange={(value) => {
                                if (Array.isArray(value)) {
                                  updateMonitor(monitor.id, { doctorIds: value });
                                }
                              }}
                              height={38}
                              disabled={!canAdd || doctorsLoading || !doctorOptions.length}
                              emptyMessage="No doctors for this branch"
                            />
                          </div>

                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-medium leading-[120%] text-[#434956]">
                              Refresh Interval:
                            </span>
                            <FormSelectField
                              label=""
                              hideLabel
                              options={REFRESH_OPTIONS}
                              placeholder="Interval"
                              background="white"
                              value={String(monitor.refreshSeconds)}
                              onChange={(value) => {
                                if (typeof value === "string") {
                                  const sec = parseInt(value, 10);
                                  if (Number.isFinite(sec)) {
                                    updateMonitor(monitor.id, { refreshSeconds: sec });
                                  }
                                }
                              }}
                              width={200}
                              height={38}
                              disabled={!canAdd}
                            />
                          </div>

                          {monitor.viewType === "doctor" ? (
                            <div className="mb-3 flex flex-col gap-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[14px] font-medium leading-[120%] text-[#434956]">
                                  Screen rotation (when &gt;3 doctors):
                                </span>
                                <FormSelectField
                                  label=""
                                  hideLabel
                                  options={ROTATION_OPTIONS}
                                  placeholder="Interval"
                                  background="white"
                                  value={String(monitor.rotationSeconds ?? 15)}
                                  onChange={(value) => {
                                    if (typeof value === "string") {
                                      const sec = parseInt(value, 10);
                                      if (Number.isFinite(sec)) {
                                        updateMonitor(monitor.id, { rotationSeconds: sec });
                                      }
                                    }
                                  }}
                                  width={200}
                                  height={38}
                                  disabled={!canAdd}
                                />
                              </div>
                              <p className="text-[12px] leading-[140%] text-[#7B8089]">
                                Up to <strong>3 doctors</strong> show at once. If you select more, the display cycles
                                through groups of three on this interval (loop).
                              </p>
                            </div>
                          ) : null}

                          <div className="flex flex-col gap-2">
                            {liveHref ? (
                              <Link
                                href={liveHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-center text-sm font-semibold text-[#0B8C00] underline"
                              >
                                Open live display
                              </Link>
                            ) : (
                              <p className="text-center text-xs text-[#7B8089]">
                                Select at least one doctor to open the live display.
                              </p>
                            )}
                            {canAdd ? (
                              <Button
                                type="button"
                                variant="primary"
                                className="w-full border-[#0B8C00] text-[#0B8C00]"
                                onClick={() => removeMonitor(monitor.id)}
                              >
                                <span className="inline-flex items-center justify-center gap-2">
                                  <Image
                                    src="/icons/DeleteWhiteIcon.svg"
                                    alt=""
                                    width={18}
                                    height={18}
                                  />
                                  Delete
                                </span>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ListBorder>
          </div>
        </div>
      </div>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowSuccessDialog(false)}
      />

      <MessageDialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={errorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowErrorDialog(false)}
      />
    </AppShell>
  );
}
