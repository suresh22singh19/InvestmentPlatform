"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HospitalTokenList, type TokenDoctorColumn } from "@/components/token/HospitalTokenList";
import {
  useGetBranchDoctorPatientsTokenQuery,
  useMarkOpdCompleteMutation,
  type TokenDoctorRow,
} from "@/store/api/tokenApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { selectRoleCategoryType, selectUserBranchId } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import { MessageDialog, ThreeDotLoader } from "@/components/ui";

function formatDateInputLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parsePositiveInt(raw: string | null): number | undefined {
  if (raw == null || String(raw).trim() === "") return undefined;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

function parseDoctorIds(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Used when branch options are built for selects (e.g. Super Admin branch picker). */
function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || str === "") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const DOCTORS_PER_SCREEN = 3;

function chunkColumns<T>(items: T[], size: number): T[][] {
  if (size < 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * - nowServing set: queue leads with nowServing; highlight that row; top banner shows that patient ("Now serving").
 * - nowServing null: queue is waiting only; highlight first waiting; no top banner.
 */
function mapApiToColumns(doctors: TokenDoctorRow[]): TokenDoctorColumn[] {
  return doctors.map((d) => {
    const seen = new Set<number>();
    const queue: Array<{
      appointmentId: number;
      patientName: string;
      token: string;
      timeSlot: string;
    }> = [];
    if (d.nowServing) {
      queue.push(d.nowServing);
      seen.add(d.nowServing.appointmentId);
    }
    for (const w of d.waiting) {
      if (!seen.has(w.appointmentId)) {
        queue.push(w);
        seen.add(w.appointmentId);
      }
    }
    const activeAppointmentId =
      d.nowServing?.appointmentId ?? (d.waiting[0]?.appointmentId ?? queue[0]?.appointmentId);

    const headlinePatientName = d.nowServing?.patientName ?? null;

    return {
      id: d.doctorId,
      name: d.doctorName,
      specialty: "—",
      roomNumber: "—",
      headlinePatientName,
      patients: queue.map((a) => ({
        appointmentId: a.appointmentId,
        token: a.token,
        patientName: a.patientName,
        timeSlot: a.timeSlot,
        isActive: activeAppointmentId != null && a.appointmentId === activeAppointmentId,
      })),
    };
  });
}

export default function TokenViewListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authBranchId = useAppSelector(selectUserBranchId);
  const roleCategoryType = useAppSelector(selectRoleCategoryType);
  const isSuperAdmin = roleCategoryType?.toLowerCase() === "superadmin";

  const { data: branchesData } = useGetBranchesQuery(undefined, {
    skip: !isSuperAdmin,
  });

  const queryString = searchParams?.toString();

  const parsedQuery = useMemo(() => {
    const sp = new URLSearchParams(queryString);
    const fromUrl = parsePositiveInt(sp.get("branchId"));
    const doctorIds = parseDoctorIds(sp.get("doctorIds"));
    const appointmentDate =
      sp.get("appointmentDate")?.trim() || formatDateInputLocal(new Date());
    const refreshMsRaw = sp.get("refreshMs");
    const parsed = parseInt(refreshMsRaw ?? "", 10);
    const refreshMs =
      refreshMsRaw != null && refreshMsRaw !== ""
        ? Math.max(1000, Number.isFinite(parsed) && parsed > 0 ? parsed : 10000)
        : 10000;
    const rotationMsRaw = sp.get("rotationMs");
    const parsedRot = parseInt(rotationMsRaw ?? "", 10);
    const rotationMs =
      rotationMsRaw != null && rotationMsRaw !== ""
        ? Math.max(5000, Number.isFinite(parsedRot) && parsedRot > 0 ? parsedRot : 15000)
        : 15000;
    return { fromUrl, doctorIds, appointmentDate, refreshMs, rotationMs };
  }, [queryString]);

  const branchId = useMemo(() => {
    if (parsedQuery.fromUrl != null) return parsedQuery.fromUrl;
    if (isSuperAdmin) {
      const first = branchesData?.data?.[0]?.id;
      const n = first != null ? Number(first) : NaN;
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    const a = authBranchId != null ? Number(authBranchId) : NaN;
    return Number.isFinite(a) && a > 0 ? a : 1;
  }, [parsedQuery.fromUrl, isSuperAdmin, authBranchId, branchesData]);

  /** Super Admin: persist branch in URL so refresh/share match the selected facility (and RTK refetches). */
  useEffect(() => {
    if (!isSuperAdmin) return;
    const rows = branchesData?.data;
    if (!Array.isArray(rows) || rows.length === 0) return;
    const fromUrl = parsePositiveInt(new URLSearchParams(queryString).get("branchId"));
    if (fromUrl != null) return;
    const p = new URLSearchParams(queryString);
    p.set("branchId", String(rows[0].id));
    router.replace(`${pathname}?${p.toString()}`);
  }, [isSuperAdmin, branchesData, queryString, pathname, router]);

  const { doctorIds, appointmentDate, refreshMs, rotationMs } = parsedQuery;

  const skip =
    branchId == null ||
    !Number.isFinite(branchId) ||
    doctorIds.length === 0;

  const {
    data: tokenRes,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetBranchDoctorPatientsTokenQuery(
    {
      branchId: branchId!,
      doctorIds,
      appointmentDate,
    },
    {
      skip,
      // Manual interval below so refresh matches URL `refreshMs` exactly and keeps polling
      // when the tab/window is unfocused (kiosk / second monitor).
      pollingInterval: 0,
      refetchOnMountOrArgChange: true,
    }
  );

  /** Poll token API on the interval from `refreshMs` (Display Configuration → Open live display). */
  useEffect(() => {
    if (skip) return;
    const id = window.setInterval(() => {
      void refetch();
    }, refreshMs);
    return () => window.clearInterval(id);
  }, [skip, refreshMs, refetch]);

  const [markOpdComplete] = useMarkOpdCompleteMutation();
  const [markingAppointmentId, setMarkingAppointmentId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [rotationPage, setRotationPage] = useState(0);
  const chunkCountRef = useRef(0);

  const doctorIdsKey = useMemo(() => doctorIds.join(","), [doctorIds]);

  const doctorsOrdered = useMemo(() => {
    const list = tokenRes?.data?.doctors;
    if (!list?.length) return [];
    const cols = mapApiToColumns(list);
    const orderIndex = new Map(doctorIds.map((id, idx) => [id, idx]));
    return [...cols].sort(
      (a, b) =>
        (orderIndex.get(Number(a.id)) ?? 999) - (orderIndex.get(Number(b.id)) ?? 999)
    );
  }, [tokenRes, doctorIds]);

  const doctorPageChunks = useMemo(
    () => chunkColumns(doctorsOrdered, DOCTORS_PER_SCREEN),
    [doctorsOrdered]
  );

  chunkCountRef.current = doctorPageChunks.length;

  useEffect(() => {
    setRotationPage(0);
  }, [doctorIdsKey]);

  useEffect(() => {
    const n = doctorPageChunks.length;
    if (n <= 1) {
      setRotationPage(0);
      return;
    }
    setRotationPage((p) => (p >= n ? 0 : p));
  }, [doctorPageChunks.length]);

  useEffect(() => {
    if (skip) return;
    if (chunkCountRef.current <= 1) return;
    const id = window.setInterval(() => {
      setRotationPage((p) => {
        const total = chunkCountRef.current;
        if (total <= 1) return 0;
        return (p + 1) % total;
      });
    }, rotationMs);
    return () => window.clearInterval(id);
  }, [skip, rotationMs, doctorPageChunks.length]);

  const visibleDoctors = useMemo(() => {
    if (doctorPageChunks.length === 0) return [];
    const idx = Math.min(rotationPage, doctorPageChunks.length - 1);
    return doctorPageChunks[idx] ?? [];
  }, [doctorPageChunks, rotationPage]);

  const handleMarkOpdComplete = useCallback(
    async (appointmentId: number) => {
      try {
        setMarkingAppointmentId(appointmentId);
        const res = await markOpdComplete({ appointmentId }).unwrap();
        setFeedback({
          message: res?.message || "Appointment updated successfully",
          isError: false,
        });
      } catch (e: unknown) {
        const msg =
          typeof e === "object" && e !== null && "data" in e
            ? String((e as { data?: { message?: string } }).data?.message ?? "")
            : "";
        setFeedback({
          message: msg || "Failed to mark OPD complete",
          isError: true,
        });
      } finally {
        setMarkingAppointmentId(null);
      }
    },
    [markOpdComplete]
  );

  if (skip) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center">
        <p className="max-w-lg text-lg text-[#434956]">
          Add <strong>doctorIds</strong> (comma-separated) and optionally <strong>appointmentDate</strong>{" "}
          (YYYY-MM-DD) to the URL, or open a monitor from{" "}
          <strong>Tokens → Display Configuration</strong> (Open live display).
        </p>
        <p className="text-sm text-[#7B8089]">
          Example:{" "}
          <code className="rounded bg-[#f0f0f0] px-2 py-1 text-xs">
            /token/view-list?branchId=1&doctorIds=1,2&appointmentDate={parsedQuery.appointmentDate}
          </code>
        </p>
      </div>
    );
  }

  if (isLoading && !tokenRes) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-white">
        <ThreeDotLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8">
        <p className="text-lg text-red-600">Could not load token data.</p>
        <button
          type="button"
          className="rounded-full border border-[#0B8C00] px-6 py-2 text-sm font-semibold text-[#0B8C00]"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!doctorsOrdered.length && !isFetching) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-2 bg-white p-8 text-center">
        <p className="text-xl text-[#434956]">No token appointments for the selected doctors and date.</p>
        <p className="text-sm text-[#7B8089]">{appointmentDate}</p>
      </div>
    );
  }

  return (
    <>
      <HospitalTokenList
        doctors={visibleDoctors}
        onMarkOpdComplete={handleMarkOpdComplete}
        markingAppointmentId={markingAppointmentId}
      />
      <MessageDialog
        open={Boolean(feedback)}
        onClose={() => setFeedback(null)}
        icon={feedback?.isError ? "/icons/CrossIcon.svg" : "/icons/SuccessCheck.svg"}
        iconBgColor={feedback?.isError ? "#FFEBEE" : "#E8F5E9"}
        message={feedback?.message ?? ""}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setFeedback(null)}
      />
    </>
  );
}
