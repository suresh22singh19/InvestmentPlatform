"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackToPreviousPageButton,
  Button,
  DatePicker,
  Dialog,
  SpinnerLoader,
  Tabs,
  Tooltip,
} from "@/components/ui";
import {
  useGetAssignedPatientTherapyScheduleQuery,
  useGetPatientVitalsBySessionQuery,
  type AssignedPatientTherapyScheduleItem,
  type SessionPatientVitals,
} from "@/store/api/ipdHeadNurseAPI";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import type { AssignedPatientDetail } from "./AssignedPatientView";

type StatusTone = "success" | "warning" | "danger" | "neutral";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultTherapyScheduleDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
}

function parseTherapyDateKey(therapyDate: string) {
  const [year, month, day] = therapyDate.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTherapyScheduleHeader(therapyDate: string) {
  const date = parseTherapyDateKey(therapyDate);
  const label = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayNumber = date.getDate();
  const monthName = date.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  const year = date.getFullYear();
  const dateLine = `${dayNumber} ${monthName} ${year}`;

  return {
    dateKey: therapyDate.split("T")[0],
    label,
    dateLine,
  };
}

function groupTherapyScheduleByDate(items: AssignedPatientTherapyScheduleItem[]) {
  const grouped = new Map<string, AssignedPatientTherapyScheduleItem[]>();

  items.forEach((item) => {
    const dateKey = item.session.therapyDate.split("T")[0];
    const existing = grouped.get(dateKey) ?? [];
    existing.push(item);
    grouped.set(dateKey, existing);
  });

  return Array.from(grouped.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([dateKey, sessions]) => ({
      ...formatTherapyScheduleHeader(dateKey),
      sessions,
    }));
}

function isTodayDateKey(dateKey: string) {
  return dateKey === formatLocalDate(new Date());
}

function formatTherapyTimeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (timeMatch) {
    let hours = Number.parseInt(timeMatch[1], 10);
    const minutes = Number.parseInt(timeMatch[2], 10);
    const meridiem = hours >= 12 ? "pm" : "am";

    hours %= 12;
    if (hours === 0) hours = 12;

    return `${hours}:${String(minutes).padStart(2, "0")} ${meridiem}`;
  }

  if (/am|pm/i.test(trimmed)) return trimmed.toLowerCase();

  return trimmed;
}

function formatTherapyScheduleTime(session: AssignedPatientTherapyScheduleItem) {
  const start = session.scheduledStartTime;
  const end = session.scheduledEndTime;

  if (start && end) {
    return `${formatTherapyTimeValue(start)} to ${formatTherapyTimeValue(end)}`;
  }

  if (start) return formatTherapyTimeValue(start);

  return "N/A";
}


function TruncatedPatientName({ name }: { name: string }) {
    const value = name?.trim() ? name.trim() : "N/A";
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const element = textRef.current;
        if (!element) return;

        const checkTruncation = () => {
            setIsTruncated(element.scrollWidth > element.clientWidth + 1);
        };

        checkTruncation();

        const observer = new ResizeObserver(checkTruncation);
        observer.observe(element);
        return () => observer.disconnect();
    }, [value]);

    return (
        <Tooltip
            position="top"
            maxWidth={360}
            disabled={!isTruncated}
            className="!overflow-visible !py-2.5"
            content={
                <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
                    {value}
                </p>
            }
        >
            <div
                className="flex min-w-0 w-fit max-w-[600px] items-center"
            >
                <h2 className="m-0 min-w-0 text-xl font-bold text-[#262D3B]">
                    <span ref={textRef} className="block overflow-hidden whitespace-nowrap">
                        {value}
                    </span>
                </h2>
                {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
            </div>
        </Tooltip>
    );
}

function formatOverviewLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatOverviewValue(value: string | null | undefined, fallback = "N/A") {
  if (value === null || value === undefined || value.trim() === "") return fallback;
  return value.trim();
}

function formatTherapyStatusLabel(status: string) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("overdue") || normalized.includes("over due")) return "over due";
  if (normalized.includes("complete")) return "Completed";
  if (normalized.includes("schedule")) return "Scheduled";
  if (normalized.includes("defer")) return "Deferred";
  return formatOverviewLabel(status);
}

function parseTherapyTimeSortValue(timeLabel: string) {
  const match = timeLabel.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function buildTherapyScheduleGrid(items: AssignedPatientTherapyScheduleItem[]) {
  const columns = groupTherapyScheduleByDate(items).map(({ dateKey, label, dateLine }) => ({
    dateKey,
    label,
    dateLine,
  }));

  const timeSet = new Set<string>();
  const cells = new Map<string, AssignedPatientTherapyScheduleItem[]>();

  items.forEach((session) => {
    const dateKey = session.session.therapyDate.split("T")[0];
    const timeLabel = formatTherapyScheduleTime(session);
    const cellKey = `${dateKey}::${timeLabel}`;
    const existing = cells.get(cellKey) ?? [];

    timeSet.add(timeLabel);
    existing.push(session);
    cells.set(cellKey, existing);
  });

  const rows = Array.from(timeSet).sort(
    (left, right) => parseTherapyTimeSortValue(left) - parseTherapyTimeSortValue(right)
  );

  return { columns, rows, cells };
}

type TherapyScheduleTone = StatusTone;

type TherapyScheduleCard = {
  id: number;
  timeLabel: string;
  therapyName: string;
  roomLabel: string;
  patientName: string;
  therapistName: string;
  statusLabel: string;
  tone: TherapyScheduleTone;
};

function mapTherapyStatusTone(status: string): TherapyScheduleTone {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("complete")) return "success";
  if (normalized.includes("overdue") || normalized.includes("over due")) return "danger";
  if (normalized.includes("defer")) return "neutral";
  if (normalized.includes("schedule") || normalized.includes("pending")) return "warning";
  return "neutral";
}

function mapTherapySessionToCard(
  session: AssignedPatientTherapyScheduleItem,
  fallbackPatientName: string
): TherapyScheduleCard {
  return {
    id: session.session.sessionId,
    timeLabel: formatTherapyScheduleTime(session),
    therapyName: session.therapyName || "N/A",
    roomLabel: session.roomNumber ? `Room ${session.roomNumber}` : "Room N/A",
    patientName: formatOverviewValue(session.patientName ?? fallbackPatientName, "N/A"),
    therapistName: formatOverviewValue(session.therapistName, "N/A"),
    statusLabel: formatTherapyStatusLabel(session.session.status),
    tone: mapTherapyStatusTone(session.session.status),
  };
}

function TherapyScheduleStatusBadge({
  label,
  tone,
  onViewVitals,
}: {
  label: string;
  tone: TherapyScheduleTone;
  onViewVitals?: () => void;
}) {
  if (tone === "success") {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#0B8C004D] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0B8C00]">
          {label}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onViewVitals?.();
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#0B8C004D] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
          aria-label="View therapy vitals"
        >
          <Image src="/icons/clinacalNursefees.svg" alt="" width={16} height={16} />
        </button>
      </div>
    );
  }

  if (tone === "danger") {
    return (
      <span className="inline-flex shrink-0 rounded-full border border-[#FECACA] bg-[#FFFF] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]">
        {label}
      </span>
    );
  }

  if (tone === "warning") {
    return (
      <span className="inline-flex shrink-0 rounded-full border border-[#FED7AA] bg-[#FFFF] px-2 py-0.5 text-[10px] font-semibold text-[#EA580C]">
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#64748B]">
      {label}
    </span>
  );
}

type TherapyVitalCard = {
  id: number;
  label: string;
  value: string;
  status: string;
  tone: StatusTone;
};

type TherapyVitalsPhase = "before" | "after";

const THERAPY_VITALS_PHASE_OPTIONS = [
  { label: "Before the Therapy", value: "before" },
  { label: "After the Therapy", value: "after" },
];

function buildTherapyVitalsCards(vitals: SessionPatientVitals | null | undefined): TherapyVitalCard[] {
  const cardMeta = (value: string | null | undefined, displayValue: string) => ({
    value: displayValue,
    status: value ? "Normal" : "N/A",
    tone: (value ? "success" : "neutral") as StatusTone,
  });

  return [
    {
      id: 1,
      label: "Temperature",
      ...cardMeta(vitals?.temperature, vitals?.temperature ? `${vitals.temperature}°F` : "N/A"),
    },
    {
      id: 2,
      label: "Blood Pressure",
      ...cardMeta(
        vitals?.bloodPressure,
        vitals?.bloodPressure ? `${vitals.bloodPressure}mmHg` : "N/A"
      ),
    },
    {
      id: 3,
      label: "Pulse Rate",
      ...cardMeta(vitals?.pulse, vitals?.pulse ? `${vitals.pulse}bpm` : "N/A"),
    },
    {
      id: 4,
      label: "Respiratory Rate",
      ...cardMeta(
        vitals?.respiratoryRate,
        vitals?.respiratoryRate ? String(vitals.respiratoryRate) : "N/A"
      ),
    },
    {
      id: 5,
      label: "SpO2",
      ...cardMeta(vitals?.spo2, vitals?.spo2 ? `${vitals.spo2}%` : "N/A"),
    },
    {
      id: 6,
      label: "Blood Sugar",
      ...cardMeta(vitals?.sugarLevel, vitals?.sugarLevel ? `${vitals.sugarLevel}mg/dL` : "N/A"),
    },
    {
      id: 7,
      label: "Pain",
      ...cardMeta(vitals?.painScale, vitals?.painScale ? `${vitals.painScale}/10` : "N/A"),
    },
  ];
}

function TherapyVitalsDialog({
  open,
  onClose,
  sessionId,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: number | null;
}) {
  const [phase, setPhase] = useState<TherapyVitalsPhase>("before");

  const { data: sessionVitalsRes, isLoading: isSessionVitalsLoading } =
    useGetPatientVitalsBySessionQuery(sessionId ?? 0, {
      skip: !open || sessionId == null,
      refetchOnMountOrArgChange: true,
    });

  const phaseVitals = useMemo(() => {
    const items = sessionVitalsRes?.data ?? [];
    return items.find((item) => String(item.type ?? "").toLowerCase() === phase) ?? null;
  }, [sessionVitalsRes?.data, phase]);

  const vitalsCards = useMemo(() => buildTherapyVitalsCards(phaseVitals), [phaseVitals]);

  useEffect(() => {
    if (!open) setPhase("before");
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="Vitals" width={560} contentPadding="px-6 pb-6 pt-4">
      <div className="mb-5">
        <Tabs
          options={THERAPY_VITALS_PHASE_OPTIONS}
          value={phase}
          onChange={(value) => setPhase(value as TherapyVitalsPhase)}
        />
      </div>

      {isSessionVitalsLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#9CA3AF]">
          <SpinnerLoader size={18} />
          Loading vitals...
        </div>
      ) : !phaseVitals ? (
        <p className="py-12 text-center text-sm text-[#9CA3AF]">
          No {phase === "before" ? "before" : "after"} therapy vitals recorded.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vitalsCards.map((vital) => (
            <div
              key={`${phase}-${vital.id}`}
              className={`rounded-2xl border border-[#EDF3EA] bg-white p-4 ${
                vital.label === "Pain" ? "sm:col-span-2" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-[#2563EB]" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-[120%] text-[#434956]">{vital.label}</p>
                    <p className="mt-1 text-base font-semibold text-[#262D3B]">{vital.value}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {phaseVitals.vitalsNote ? (
            <p className="sm:col-span-2 rounded-[12px] border border-[#EDF3EA] bg-[#FCFDFC] px-4 py-3 text-sm text-[#434956]">
              <span className="text-[#9FA2AB]">Note:</span> {phaseVitals.vitalsNote}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-6">
        <Button type="button" variant="outline" size="small" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}

function TherapyScheduleCardView({
  card,
  onViewVitals,
}: {
  card: TherapyScheduleCard;
  onViewVitals?: () => void;
}) {
  const toneStyles = (() => {
    switch (card.tone) {
      case "danger":
        return {
          bg: "#FEF2F2",
          border: "#FECACA",
          left: "#DC2626",
          footerBorder: "#FECACA",
        };
      case "warning":
        return {
          bg: "#FFF7ED",
          border: "#FED7AA",
          left: "#EA580C",
          footerBorder: "#FED7AA",
        };
      case "success":
        return {
          bg: "#E8F5E9",
          border: "#BBF7D0",
          left: "#0B8C00",
          footerBorder: "#BBF7D0",
        };
      case "neutral":
      default:
        return {
          bg: "#F8FAFC",
          border: "#CBD5E1",
          left: "#64748B",
          footerBorder: "#E2E8F0",
        };
    }
  })();

  return (
    <div
      // className="mx-auto w-[270px] shrink-0 rounded-[10px] border px-3 py-3 shadow-[0px_1px_2px_rgba(15,23,42,0.04)]"
      className="mx-auto w-full max-w-[270px] rounded-[10px] border px-3 py-3 shadow-[0px_1px_2px_rgba(15,23,42,0.04)]"
      style={{
        backgroundColor: toneStyles.bg,
        borderColor: toneStyles.border,
        borderLeftWidth: 4,
        borderLeftColor: toneStyles.left,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium leading-tight text-[#7B8089]">{card.timeLabel}</p>
        <TherapyScheduleStatusBadge label={card.statusLabel} tone={card.tone} onViewVitals={onViewVitals} />
      </div>

      {/* <p className="mt-2 text-sm font-semibold leading-tight text-[#262D3B]">{card.therapyName}</p> */}
         
    {/* <p className="mt-2 text-sm font-semibold leading-tight text-[#262D3B]">
      {card.therapyName
        ?.split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")}
      </p> */}
      
      <Tooltip
        position="top"
        content={
          <span className="max-w-xs whitespace-normal break-words">
            {card.therapyName
              ?.split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join(" ") || "N/A"}
          </span>
        }
      >
        <p className="mt-2 truncate text-sm font-semibold leading-tight text-[#262D3B]">
          {card.therapyName
            ?.split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ") || "N/A"}
        </p>
      </Tooltip>

      <p className="mt-1 text-xs text-[#9FA2AB]">{card.roomLabel}</p>

      <div
        className="mt-3 grid grid-cols-2 gap-3 pt-3"
        style={{ borderTop: `1px solid ${toneStyles.footerBorder}` }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-[#9FA2AB]">Therapist</p>
          <p className="mt-1 truncate text-xs font-semibold text-[#434956]">{card.therapistName}</p>
        </div>
        {/* <div className="min-w-0">
          <p className="text-[10px] font-medium text-[#9FA2AB]">Patient Name</p>
          <p className="mt-1 truncate text-xs font-semibold text-[#434956]">{card.patientName}</p>
        </div> */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[10px] font-medium text-[#9FA2AB]">Patient Name</p>

          <Tooltip
            position="top"
            content={
              <span className="max-w-xs whitespace-normal break-words">
                {card.patientName || "N/A"}
              </span>
            }
          >
            <p className="mt-1 w-full truncate text-xs font-semibold text-[#434956]">
              {card.patientName || "N/A"}
            </p>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export function PatientTherapiesTab({
  patient,
  onBack,
}: {
  patient: AssignedPatientDetail;
  onBack?: () => void;
}) {
  const { resolvedFilterBranchId } = useIPDNurseResolvedBranchId();
  const [therapyScheduleFilters, setTherapyScheduleFilters] = useState(getDefaultTherapyScheduleDateRange);
  const [isTherapyVitalsOpen, setIsTherapyVitalsOpen] = useState(false);
  const [therapyVitalsSessionId, setTherapyVitalsSessionId] = useState<number | null>(null);

  const { data: therapyScheduleRes, isLoading: isTherapyScheduleLoading } =
    useGetAssignedPatientTherapyScheduleQuery(
      {
        branchId: resolvedFilterBranchId!,
        patientId: patient.id,
        startDate: therapyScheduleFilters.startDate,
        endDate: therapyScheduleFilters.endDate,
      },
      {
        skip:
          !patient.id ||
          resolvedFilterBranchId == null ||
          !therapyScheduleFilters.startDate ||
          !therapyScheduleFilters.endDate,
        refetchOnMountOrArgChange: true,
      }
    );

  const therapyScheduleGrid = useMemo(
    () => buildTherapyScheduleGrid(therapyScheduleRes?.data ?? []),
    [therapyScheduleRes?.data]
  );

  return (
    <div className="space-y-5">
      {/* {onBack ? <BackToPreviousPageButton onClick={onBack} text="Back to Therapies" /> : null} */}

      {/* <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px]">
          {`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
        </h1>
      </div>
      <p className="text-sm text-[#434956]">
        UHID: {patient.patientUhid}  •  Age: {patient.age}  •  Gender: {patient.gender}
      </p> */}

    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {/* <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px]">
              {patient.patientName}
            </h1> */}
            <TruncatedPatientName 
            // name={patient.patientName} 
             name={`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
            />
            {/* <Badge variant="success" className="font-medium uppercase">
              {patient.patientType ?? "Normal Patient"}
            </Badge> */}
          </div>
          {/* <p className="mt-3 text-sm">{renderMetaItems(headerMetaItems)}</p>
          <p className="mt-1 text-sm">{renderMetaItems(locationMetaItems)}</p> */}

          {/* <p className="mt-2 text-[13px]">{renderMetaItems(headerMetaItems)}</p>
          <p className="mt-0 text-[13px]">{renderMetaItems(locationMetaItems)}</p> */}

      <p className="text-[13px]">
       <span className="font-normal text-[#525763]" >UHID:</span> <span className="font-semibold text-[#434956]">{patient.patientUhid}</span>  •  <span className="font-normal text-[#525763]">Age:</span> <span className="font-semibold text-[#434956]">{patient.age}</span>  •  <span className="font-normal text-[#525763]">Gender:</span> <span className="font-semibold text-[#434956]">{patient.gender}</span>
      </p> 
        </div>

        <BackToPreviousPageButton
          className="shrink-0"
          onClick={onBack}
          text="Back"
        />
      </div>


      <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-base font-medium text-[#262D3B]">Therapy Schedule</h3>

          <div className="flex flex-wrap items-end justify-end gap-4">
            <DatePicker
              label="Start Date"
              value={therapyScheduleFilters.startDate}
              onChange={(value) =>
                setTherapyScheduleFilters((prev) => ({
                  ...prev,
                  startDate: value,
                }))
              }
              placeholder="DD/MM/YY"
              width="156px"
              disablePastDates={false}
            />
            <DatePicker
              label="End Date"
              value={therapyScheduleFilters.endDate}
              onChange={(value) =>
                setTherapyScheduleFilters((prev) => ({
                  ...prev,
                  endDate: value,
                }))
              }
              placeholder="DD/MM/YY"
              width="156px"
              disablePastDates={false}
            />
          </div>
        </div>

        {isTherapyScheduleLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9CA3AF]">
            <SpinnerLoader size={18} />
            Loading therapy schedule...
          </div>
        ) : therapyScheduleGrid.columns.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#9CA3AF]">No therapy sessions found.</p>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-dashed border-[#B7E2B4]">
            <div
              className="min-w-max"
              style={{
                minWidth: `${Math.max(therapyScheduleGrid.columns.length, 1) * 270}px`,
              }}
            >
              <div
                className="grid bg-white"
                style={{
                  gridTemplateColumns: `repeat(${therapyScheduleGrid.columns.length}, minmax(270px, 1fr))`,
                  borderBottom: "1px dashed #B7E2B4",
                }}
              >
                {therapyScheduleGrid.columns.map((column) => (
                  <div
                    key={column.dateKey}
                    className="border-l border-dashed border-[#B7E2B4] px-3 py-3 text-center first:border-l-0"
                  >
                    <p className="text-xs font-medium text-[#7B8089]">{column.label}</p>
                    <p className="mt-1 text-xs font-semibold leading-snug text-[#262D3B]">
                      {column.dateLine}
                    </p>
                    <div className="mt-1 min-h-[14px]">
                      {isTodayDateKey(column.dateKey) ? (
                        <p className="text-[10px] font-medium text-[#0B8C00]">Today</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="max-h-[520px] overflow-y-auto overflow-x-hidden bg-white">
                {therapyScheduleGrid.rows.map((timeLabel) => (
                  <div
                    key={timeLabel}
                    className="grid border-b border-dashed border-[#B7E2B4] last:border-b-0"
                    style={{
                      gridTemplateColumns: `repeat(${therapyScheduleGrid.columns.length}, minmax(270px, 1fr))`,
                    }}
                  >
                    {therapyScheduleGrid.columns.map((column) => {
                      const sessions =
                        therapyScheduleGrid.cells.get(`${column.dateKey}::${timeLabel}`) ?? [];

                      return (
                        <div
                          key={`${column.dateKey}-${timeLabel}`}
                          className="min-h-[156px] border-l border-dashed border-[#B7E2B4] p-2 first:border-l-0"
                        >
                          <div className="flex flex-wrap gap-2">
                            {sessions.map((session) => (
                              <TherapyScheduleCardView
                                key={session.session.sessionId}
                                card={mapTherapySessionToCard(session, patient.patientName)}
                                onViewVitals={() => {
                                  setTherapyVitalsSessionId(session.session.sessionId);
                                  setIsTherapyVitalsOpen(true);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <TherapyVitalsDialog
        open={isTherapyVitalsOpen}
        onClose={() => {
          setIsTherapyVitalsOpen(false);
          setTherapyVitalsSessionId(null);
        }}
        sessionId={therapyVitalsSessionId}
      />
    </div>
  );
}
