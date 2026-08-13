"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  ExportButton,
  FormSelectField,
  MessageDialog,
  SpinnerLoader,
  Tabs,
} from "@/components/ui";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  useBulkUpsertRosterMutation,
  useGetNurseDropdownQuery,
  useGetNursesWithoutRosterQuery,
  useGetstaffNurseDropdownQuery,
  useLazyDownloadRosterCSVFileQuery,
  useLazyDownloadRosterPDFFileQuery,
  useListRosterQuery,
  useUpdateDutyRosterForNurseExitMutation,
  type BulkUpsertRosterRequest,
  type ListRosterData,
  type NurseDropdownItem,
  type RosterDutyChartItem,
  type RosterDutyItem,
} from "@/store/api/ipdHeadNurseAPI";

type SingleShiftCode = "M" | "E" | "N" | "O" | "L";
type ComboShiftCode = "ME" | "EN" | "MN";
type ShiftCode = SingleShiftCode | ComboShiftCode | null;
type ApplyRange = "entire-month" | "whole-week" | "weekends";
type PatternPresetId = "mornings-6" | "nights-5" | "rotating-222" | "weekend-coverage";

type NurseRoster = {
  id: number;
  name: string;
  employeeId: string;
  userType: string;
  role: string;
  employmentStatus: string;
  shifts: ShiftCode[];
};

const SHIFT_META: Record<
  SingleShiftCode,
  { label: string; color: string; border: string; bg: string; hours: number; apiValue: string }
> = {
  M: { label: "Morning", color: "#0B8C00", border: "#0B8C0033", bg: "#F3FAF2", hours: 8, apiValue: "morning" },
  E: { label: "Evening", color: "#CA8A04", border: "#CA8A0433", bg: "#FFFBEB", hours: 8, apiValue: "evening" },
  N: { label: "Night", color: "#7C3AED", border: "#7C3AED33", bg: "#F5F3FF", hours: 8, apiValue: "night" },
  O: { label: "Off", color: "#6B7280", border: "#6B728033", bg: "#F8FAFC", hours: 0, apiValue: "week_off" },
  L: { label: "On Leave", color: "#DC2626", border: "#DC262633", bg: "#FEF2F2", hours: 0, apiValue: "leave" },
};

const Nurse_rotation: Array<{ id: string; label: string }> = [
  { id: "brush", label: "Brush" },
  { id: "doubleshift", label: "Double shift" },
];


const COMBO_META: Record<
  ComboShiftCode,
  { label: string; displayCode: string; color: string; border: string; bg: string; parts: [SingleShiftCode, SingleShiftCode] }
> = {
  ME: {
    label: "Morning + Evening",
    displayCode: "M+E",
    color: "#CA8A04",
    border: "#CA8A0433",
    bg: "#FFFBEB",
    parts: ["M", "E"],
  },
  EN: {
    label: "Evening + Night",
    displayCode: "E+N",
    color: "#7C3AED",
    border: "#7C3AED33",
    bg: "#F5F3FF",
    parts: ["E", "N"],
  },
  MN: {
    label: "Morning + Night",
    displayCode: "M+N",
    color: "#0B8C00",
    border: "#0B8C0033",
    bg: "#F3FAF2",
    parts: ["M", "N"],
  },
};

function isComboShift(code: ShiftCode): code is ComboShiftCode {
  return code === "ME" || code === "EN" || code === "MN";
}

function comboHours(code: ComboShiftCode) {
  return COMBO_META[code].parts.reduce((sum, part) => sum + SHIFT_META[part].hours, 0);
}

function getShiftDisplayMeta(code: Exclude<ShiftCode, null>) {
  if (isComboShift(code)) {
    const combo = COMBO_META[code];
    return {
      label: combo.label,
      displayCode: combo.displayCode,
      color: combo.color,
      border: combo.border,
      bg: combo.bg,
      hours: comboHours(code),
    };
  }
  const single = SHIFT_META[code];
  return {
    label: single.label,
    displayCode: code as string,
    color: single.color,
    border: single.border,
    bg: single.bg,
    hours: single.hours,
  };
}

function findComboCode(codes: SingleShiftCode[]): ComboShiftCode | null {
  if (codes.length !== 2) return null;
  const key = [...codes].sort().join("");
  const entry = (Object.entries(COMBO_META) as Array<[ComboShiftCode, (typeof COMBO_META)[ComboShiftCode]]>).find(
    ([, meta]) => [...meta.parts].sort().join("") === key
  );
  return entry ? entry[0] : null;
}

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const PATTERN_PRESETS: Array<{
  id: PatternPresetId;
  title: string;
  description: string;
  week: (SingleShiftCode | null)[];
}> = [
  {
    id: "mornings-6",
    title: "Mornings · 6-day",
    description: "Mon–Sat morning, Sun off",
    week: ["O", "M", "M", "M", "M", "M", "M"],
  },
  {
    id: "nights-5",
    title: "Nights · 5-day",
    description: "Mon–Fri nights, weekend off",
    week: ["O", "N", "N", "N", "N", "N", "O"],
  },
  {
    id: "rotating-222",
    title: "Rotating 2-2-2",
    description: "2 Morning · 2 Evening · 2 Night · 1 Off",
    week: ["M", "M", "E", "E", "N", "N", "O"],
  },
  {
    id: "weekend-coverage",
    title: "Weekend coverage",
    description: "Sat–Sun morning only",
    week: ["M", null, null, null, null, null, "M"],
  },
];

const APPLY_RANGE_OPTIONS: Array<{ label: string; value: ApplyRange }> = [
  { label: "Entire month", value: "entire-month" },
  { label: "Whole week", value: "whole-week" },
  { label: "Weekends only", value: "weekends" },
];

const MONTH_OPTIONS = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

function buildYearOptions(currentYear: number) {
  return Array.from({ length: 7 }, (_, index) => {
    const year = currentYear - 3 + index;
    return { label: String(year), value: String(year) };
  });
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function cellKey(nurseId: number, dayIndex: number) {
  return `${nurseId}:${dayIndex}`;
}

function shouldApplyOnDay(dayOfWeek: number, range: ApplyRange) {
  const isWeekend = dayOfWeek === 0;
  if (range === "weekends") return isWeekend;
  return true;
}

function mapApiShiftToCode(shift: string | null | undefined): SingleShiftCode | null {
  if (!shift) return null;
  const normalized = shift.trim().toLowerCase();
  if (normalized === "m" || normalized === "morning") return "M";
  if (normalized === "e" || normalized === "evening") return "E";
  if (normalized === "n" || normalized === "night") return "N";
  if (
    normalized === "o" ||
    normalized === "off" ||
    normalized === "week_off" ||
    normalized === "weekoff" ||
    normalized === "week off"
  ) {
    return "O";
  }
  if (
    normalized === "l" ||
    normalized === "leave" ||
    normalized === "onleave" ||
    normalized === "on_leave" ||
    normalized === "on leave"
  ) {
    return "L";
  }
  return null;
}

function getDutyDayIndex(duty: RosterDutyItem, year: number, month: number) {
  if (typeof duty.day === "number" && duty.day >= 1) return duty.day - 1;
  if (!duty.dutyDate) return -1;
  const parsed = new Date(duty.dutyDate);
  if (Number.isNaN(parsed.getTime())) {
    const match = duty.dutyDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return -1;
    const dutyYear = Number(match[1]);
    const dutyMonth = Number(match[2]);
    const dutyDay = Number(match[3]);
    if (dutyYear !== year || dutyMonth !== month) return -1;
    return dutyDay - 1;
  }
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month) return -1;
  return parsed.getDate() - 1;
}

function getChartNurseName(item: RosterDutyChartItem) {
  return item.name || item.userName || item.nurseName || "Unknown Nurse";
}

function getChartEmployeeId(item: RosterDutyChartItem) {
  return item.employeeId || item.empId || "";
}

function normalizeDuties(raw: unknown): RosterDutyItem[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter((item): item is RosterDutyItem => item != null && typeof item === "object");
  }

  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).flatMap(([key, value]) => {
      if (value == null) return [];

      const dayFromKey = Number(key);
      const fallbackDay = Number.isFinite(dayFromKey) ? dayFromKey : undefined;

      if (typeof value === "string") {
        return [
          {
            day: fallbackDay,
            shift: value,
          },
        ];
      }

      if (Array.isArray(value)) {
        return value
          .filter((item): item is RosterDutyItem => item != null && typeof item === "object")
          .map((duty) => ({
            ...duty,
            day: typeof duty.day === "number" ? duty.day : fallbackDay,
          }));
      }

      if (typeof value === "object") {
        const duty = value as RosterDutyItem;
        return [
          {
            ...duty,
            day: typeof duty.day === "number" ? duty.day : fallbackDay,
          },
        ];
      }

      return [];
    });
  }

  return [];
}

function getChartDuties(item: RosterDutyChartItem): RosterDutyItem[] {
  return normalizeDuties(item.duties ?? item.days ?? item.dutyChart);
}

function extractDutyChart(data: ListRosterData | RosterDutyChartItem[] | undefined): RosterDutyChartItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const chart = data.dutyChart ?? data.roster;
  return Array.isArray(chart) ? chart : [];
}

function extractRosterStatus(
  response:
    | {
        data?: ListRosterData | RosterDutyChartItem[];
        rosterStatus?: string | null;
      }
    | undefined
) {
  if (!response) return "";
  if (response.rosterStatus?.trim()) return response.rosterStatus.trim();

  if (response.data && !Array.isArray(response.data)) {
    if (response.data.rosterStatus?.trim()) return response.data.rosterStatus.trim();

    const chartStatus = (response.data.dutyChart ?? response.data.roster ?? []).find(
      (item) => item.rosterStatus?.trim()
    )?.rosterStatus;
    if (chartStatus?.trim()) return chartStatus.trim();
  }

  if (Array.isArray(response.data)) {
    const chartStatus = response.data.find((item) => item.rosterStatus?.trim())?.rosterStatus;
    if (chartStatus?.trim()) return chartStatus.trim();
  }

  return "";
}

function isRosterReadOnly(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "confirmed" || normalized === "approved";
}

function buildShiftsFromDuties(
  duties: RosterDutyItem[] | unknown,
  year: number,
  month: number,
  daysInMonth: number
): ShiftCode[] {
  const shifts = Array.from({ length: daysInMonth }, () => null as ShiftCode);
  const normalizedDuties = normalizeDuties(duties);
  const dayCodes: SingleShiftCode[][] = Array.from({ length: daysInMonth }, () => []);

  normalizedDuties.forEach((duty) => {
    const dayIndex = getDutyDayIndex(duty, year, month);
    if (dayIndex < 0 || dayIndex >= daysInMonth) return;
    const code = mapApiShiftToCode(duty.shift);
    if (!code) return;
    dayCodes[dayIndex].push(code);
  });

  dayCodes.forEach((codes, dayIndex) => {
    if (codes.length === 0) return;
    if (codes.length === 1) {
      shifts[dayIndex] = codes[0];
      return;
    }
    const uniqueWorkCodes = Array.from(
      new Set(codes.filter((code) => code === "M" || code === "E" || code === "N"))
    );
    shifts[dayIndex] = findComboCode(uniqueWorkCodes) ?? codes[codes.length - 1];
  });

  return shifts;
}

function buildNursesFromApi(
  nurses: NurseDropdownItem[],
  dutyChart: RosterDutyChartItem[],
  year: number,
  month: number,
  daysInMonth: number
): NurseRoster[] {
  const chartRows: NurseRoster[] = dutyChart.map((item) => ({
    id: item.userId,
    name: getChartNurseName(item),
    employeeId: getChartEmployeeId(item),
    userType: item.userType || "NURSE",
    role: item.role || getChartEmployeeId(item) || "Nurse",
    employmentStatus: item.employmentStatus || "",
    shifts: buildShiftsFromDuties(getChartDuties(item), year, month, daysInMonth),
  }));

  if (chartRows.length > 0) {
    return chartRows;
  }

  return nurses.map((nurse) => ({
    id: nurse.id,
    name: nurse.name,
    employeeId: nurse.empId || "",
    userType: "NURSE",
    role: nurse.empId || "Nurse",
    employmentStatus: "",
    shifts: Array.from({ length: daysInMonth }, () => null),
  }));
}

function summarizeShifts(shifts: ShiftCode[]) {
  const counts: Record<SingleShiftCode, number> = {
    M: 0,
    E: 0,
    N: 0,
    O: 0,
    L: 0,
  };

  let totalHours = 0;

  shifts.forEach((shift) => {
    if (!shift) return;
    if (isComboShift(shift)) {
      COMBO_META[shift].parts.forEach((part) => {
        counts[part] += 1;
      });
      totalHours += comboHours(shift);
      return;
    }
    counts[shift] += 1;
    totalHours += SHIFT_META[shift].hours;
  });

  return { counts, totalHours };
}

function buildBulkUpsertPayload(
  rows: NurseRoster[],
  year: number,
  month: number,
  branchId: number,
  rosterStatus: string
): BulkUpsertRosterRequest {
  return {
    rosterStatus,
    branchId,
    roster: rows.map((nurse) => ({
      userId: nurse.id,
      employeeId: nurse.employeeId,
      userType: nurse.userType || "NURSE",
      duties: nurse.shifts.flatMap((shift, dayIndex) => {
        if (!shift) return [];
        const day = String(dayIndex + 1).padStart(2, "0");
        const monthValue = String(month).padStart(2, "0");
        const dutyDate = `${year}-${monthValue}-${day}`;

        if (isComboShift(shift)) {
          return COMBO_META[shift].parts.map((part) => ({
            dutyDate,
            shift: SHIFT_META[part].apiValue,
            shiftHours: SHIFT_META[part].hours,
          }));
        }

        return [
          {
            dutyDate,
            shift: SHIFT_META[shift].apiValue,
            shiftHours: SHIFT_META[shift].hours,
          },
        ];
      }),
    })),
  };
}

function isPastMonth(year: number, month: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year < currentYear || (year === currentYear && month < currentMonth);
}

function rtkErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

function ShiftCell({
  value,
  onClick,
  disabled = false,
}: {
  value: ShiftCode;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (!value) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!disabled) onClick();
        }}
        disabled={disabled}
        className={`flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors ${
          disabled
            ? "cursor-not-allowed border-[#E5E7EB] bg-[#F8FAFC] opacity-70"
            : "border-[#E5E7EB] bg-white hover:border-[#0B8C00]/40"
        }`}
        aria-label="Empty shift"
        aria-disabled={disabled}
      />
    );
  }

  const meta = getShiftDisplayMeta(value);
  const isCombo = isComboShift(value);

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-[10px] border font-semibold ${
        isCombo ? "text-[10px]" : "text-sm"
      } ${disabled ? "cursor-not-allowed opacity-70" : "transition-transform hover:scale-[1.04]"}`}
      style={{ color: meta.color, borderColor: meta.border, backgroundColor: meta.bg }}
      aria-label={`${meta.label} shift`}
      aria-disabled={disabled}
    >
      {meta.displayCode}
    </button>
  );
}

// function ToolbarButton({
//   label,
//   iconSrc,
//   onClick,
//   variant = "outline",
//   disabled = false,
// }: {
//   label: string;
//   iconSrc?: string;
//   onClick?: () => void;
//   variant?: "outline" | "primary";
//   disabled?: boolean;
// }) {
//   return (
//     <Button
//       variant={variant}
//       size="xsmall"
//       className="!min-w-0 whitespace-nowrap"
//       onClick={onClick}
//       disabled={disabled}
//       leftIcon={
//         iconSrc ? <Image src={iconSrc} alt="" width={14} height={14} /> : undefined
//       }
//     >
//       {label}
//     </Button>
//   );
// }

function PatternDayCell({
  dayLabel,
  value,
  onClick,
  disabled = false,
}: {
  dayLabel: string;
  value: ShiftCode;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (!value) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex h-[72px] w-full flex-col items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-white transition-colors ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:border-[#0B8C00]/40"
        }`}
      >
        <span className="text-[10px] font-medium uppercase text-[#9FA2AB]">{dayLabel}</span>
        <span className="mt-1 text-sm font-semibold text-[#9CA3AF]">-</span>
      </button>
    );
  }

  const meta = getShiftDisplayMeta(value);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[72px] w-full flex-col items-center justify-center rounded-[12px] border ${
        disabled ? "cursor-not-allowed opacity-70" : "transition-transform hover:scale-[1.02]"
      }`}
      style={{ color: meta.color, borderColor: meta.border, backgroundColor: meta.bg }}
    >
      <span className="text-[10px] font-medium uppercase opacity-80">{dayLabel}</span>
      <span className="mt-1 text-sm font-semibold">{meta.displayCode}</span>
    </button>
  );
}

function ApplyPatternDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (weekPattern: ShiftCode[], range: ApplyRange) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<PatternPresetId | null>("mornings-6");
  const [weekPattern, setWeekPattern] = useState<ShiftCode[]>([...PATTERN_PRESETS[0].week]);
  const [applyRange, setApplyRange] = useState<ApplyRange>("whole-week");
  const [patternTab, setPatternTab] = useState<string>(Nurse_rotation[0].id);

  const selectPreset = (presetId: PatternPresetId) => {
    const preset = PATTERN_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setWeekPattern([...preset.week]);
  };

  const cycleDay = (dayIndex: number) => {
    const cycle: ShiftCode[] =
      patternTab === "doubleshift" ? ["ME", "EN", "MN", null] : ["M", "E", "N", "O", "L", null];
    setSelectedPreset(null);
    setWeekPattern((prev) => {
      const next = [...prev];
      const current = next[dayIndex] ?? null;
      const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
      next[dayIndex] = cycle[nextIndex];
      return next;
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Apply a pattern" width={720} contentPadding="px-6 pb-6 pt-2">
      <div className="space-y-6">
        <p className="text-sm text-[#7B8089]">
          Set shifts for one week, then apply across the whole month for the selected nurses.
        </p>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#262D3B]">Presets</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PATTERN_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id)}
                  className={`rounded-[14px] border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-[#0B8C00] bg-[#F3FAF2]"
                      : "border-[#E5E7EB] bg-white hover:border-[#0B8C00]/40"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#262D3B]">{preset.title}</p>
                  <p className="mt-1 text-xs text-[#7B8089]">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#262D3B]">
            Customize · click a day to cycle shift
          </h3>
          <div className="mb-3 max-w-[400px]">
            <Tabs
              options={Nurse_rotation.map((tab) => ({
                label: tab.label,
                value: tab.id,
              }))}
              value={patternTab}
              onChange={(value) => setPatternTab(value)}
            />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {DAY_LABELS.map((label, index) => (
              <PatternDayCell
                key={label}
                dayLabel={label}
                value={weekPattern[index] ?? null}
                onClick={() => cycleDay(index)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#262D3B]">Apply to</h3>
          <div className="inline-flex w-full flex-wrap overflow-hidden rounded-full border border-[#E5E7EB] bg-white p-1 sm:flex-nowrap">
            {APPLY_RANGE_OPTIONS.map((option) => {
              const isActive = applyRange === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setApplyRange(option.value)}
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#0B8C00] text-white"
                      : "bg-transparent text-[#434956] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="medium"
            className="!min-w-0"
            onClick={() => {
              onApply(weekPattern, applyRange);
              onClose();
            }}
          >
            Apply pattern
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function AddNurseDialog({
  open,
  onClose,
  onSubmit,
  branchId,
  month,
  year,
  existingNurseIds,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (nurse: NurseDropdownItem) => void;
  branchId: number | null;
  month: number;
  year: number;
  existingNurseIds: number[];
}) {
  const [selectedNurseId, setSelectedNurseId] = useState("");

  const { data, isFetching } = useGetNursesWithoutRosterQuery(
    { branchId: branchId!, month, year },
    { skip: !open || branchId == null }
  );

  useEffect(() => {
    if (!open) setSelectedNurseId("");
  }, [open]);

  console.log("dsgdyd",data)

  const nurseOptions = useMemo(
    () =>
      (data?.data ?? [])
        // .filter((nurse) => !existingNurseIds.includes(nurse.id))
        .map((nurse) => ({ label: nurse.name, value: String(nurse.id) })),
    [data?.data, existingNurseIds]
  );

  console.log("nurseOptions",nurseOptions)

  const handleSubmit = () => {
    const nurse = (data?.data ?? []).find((item) => String(item.id) === selectedNurseId);
    if (!nurse) return;
    onSubmit(nurse);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Nurse" width={480} contentPadding="px-6 pb-6 pt-2">
      <div className="space-y-6">
        <FormSelectField
          label="Nurse"
          options={nurseOptions}
          value={selectedNurseId}
          onChange={(value) => setSelectedNurseId(Array.isArray(value) ? value[0] : value || "")}
          placeholder={isFetching ? "Loading nurses..." : "Select"}
          mode="single"
          width="100%"
          height={44}
          disabled={isFetching}
          background="white"
        />

        <div className="flex justify-end gap-3">
          <Button variant="primary" size="medium" className="!min-w-0" onClick={handleSubmit} disabled={!selectedNurseId}>
            Submit
          </Button>
          <Button variant="outline" size="medium" className="!min-w-0" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

  function NurseExitDialog({
    open,
    nurse,
    lastWorkingDate,
    onChangeLastWorkingDate,
    onClose,
    onSubmit,
  }: {
    open: boolean;
    nurse: NurseRoster | null;
    lastWorkingDate: string;
    onChangeLastWorkingDate: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
  }) {
    if (!nurse) return null;

    return (
      <Dialog
        open={open}
        onClose={onClose}
        title={nurse.name}
        width={420}
        contentPadding="px-6 pb-6 pt-4"
        customHeader={
          <div className="flex items-start justify-between border-b border-[#E8EDE8] px-6 pb-4 pt-5">
            <div>
              <h2 className="text-lg font-bold text-[#262D3B]">{nurse.name}</h2>
              <p className="mt-0.5 text-sm text-[#7B8089]">{nurse.role}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#F2F8F2]"
              aria-label="Close dialog"
            >
              <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={20} height={20} />
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <DatePicker
            label="Last working day"
            value={lastWorkingDate}
            onChange={onChangeLastWorkingDate}
            placeholder="DD/MM/YY"
            width="100%"
            background="white"
          />

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="medium"
              className="!min-w-0"
              onClick={onSubmit}
              disabled={!lastWorkingDate}
            >
              Mark As Left
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

export default function StaffRosterPage() {
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedNurseId, setSelectedNurseId] = useState("");
  const [activeShift, setActiveShift] = useState<Exclude<ShiftCode, null>>("M");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isApplyPatternOpen, setIsApplyPatternOpen] = useState(false);
  const [isAddNurseOpen, setIsAddNurseOpen] = useState(false);
  const [isPatternApplied, setIsPatternApplied] = useState(false);
  const [nurses, setNurses] = useState<NurseRoster[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [showExportErrorDialog, setShowExportErrorDialog] = useState(false);
  const [exitTarget, setExitTarget] = useState<NurseRoster | null>(null);
  const [exitLastWorkingDate, setExitLastWorkingDate] = useState("");
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isExitSuccessOpen, setIsExitSuccessOpen] = useState(false);
  const [newlyAddedNurseIds, setNewlyAddedNurseIds] = useState<Set<number>>(new Set());
  const [editedCellKeys, setEditedCellKeys] = useState<Set<string>>(new Set());
  

  const yearOptions = useMemo(() => buildYearOptions(currentYear), [currentYear]);

  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useIPDNurseResolvedBranchId();

  const { year, month, monthIndex, daysInMonth, dayHeaders } = useMemo(() => {
    const parsedYear = Number(selectedYear);
    const parsedMonth = Number(selectedMonth);
    const safeYear = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
    const safeMonth =
      Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : new Date().getMonth() + 1;
    const monthZeroBased = safeMonth - 1;
    const totalDays = getDaysInMonth(safeYear, monthZeroBased);
    const headers = Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(safeYear, monthZeroBased, index + 1);
      return {
        day: index + 1,
        label: DAY_LABELS[date.getDay()],
      };
    });

    return {
      year: safeYear,
      month: safeMonth,
      monthIndex: monthZeroBased,
      daysInMonth: totalDays,
      dayHeaders: headers,
    };
  }, [selectedMonth, selectedYear]);

  const { data: nurseDropdownRes, isLoading: isNurseDropdownLoading,  refetch: refetchRoasterNurseDropdown } = useGetstaffNurseDropdownQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  const {
    data: rosterRes,
    isLoading: isRosterLoading,
    isFetching: isRosterFetching,
    refetch: refetchRoster,
  } = useListRosterQuery(
    {
      branchId: resolvedFilterBranchId!,
      month,
      year,
      userType: "NURSE",
      page: 1,
      limit: 100,
    },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  // console.log("rosterRes",rosterRes?.total)

  const [bulkUpsertRoster, { isLoading: isSavingRoster }] = useBulkUpsertRosterMutation();
  const [triggerRosterPdf, { isFetching: isExportPdfLoading }] = useLazyDownloadRosterPDFFileQuery();
  const [triggerRosterCsv, { isFetching: isExportCsvLoading }] = useLazyDownloadRosterCSVFileQuery();
  const [updateDutyRosterForNurseExit, { isLoading: isExitSubmitting }] =
    useUpdateDutyRosterForNurseExitMutation();

  const nurseOptions = useMemo(
    () => [
      { label: "All Nurses", value: "" },
      ...(nurseDropdownRes?.data ?? []).map((nurse) => ({
        label: nurse.name,
        value: String(nurse.id),
      })),
    ],
    [nurseDropdownRes?.data]
  );

  const rosterStatus = extractRosterStatus(rosterRes);
  const isStatusLocked = isRosterReadOnly(rosterStatus);
  const isPastRosterMonth = isPastMonth(year, month);
  const isTableCellsLocked = isStatusLocked || isPastRosterMonth;

  useEffect(() => {
    if (resolvedFilterBranchId == null) {
      setNurses([]);
      setSelectedIds([]);
      setNewlyAddedNurseIds(new Set());
      setEditedCellKeys(new Set());
      return;
    }

    const dutyChart = extractDutyChart(rosterRes?.data);
    const nextNurses = buildNursesFromApi(
      nurseDropdownRes?.data ?? [],
      dutyChart,
      year,
      month,
      daysInMonth
    );
    setNurses(nextNurses);
    setSelectedIds((prev) => prev.filter((id) => nextNurses.some((nurse) => nurse.id === id)));
    setNewlyAddedNurseIds(new Set());
    setEditedCellKeys(new Set());
  }, [resolvedFilterBranchId, nurseDropdownRes?.data, rosterRes?.data, year, month, daysInMonth]);

  const visibleNurses = useMemo(() => {
    if (!selectedNurseId) return nurses;
    return nurses.filter((nurse) => String(nurse.id) === selectedNurseId);
  }, [nurses, selectedNurseId]);

  console.log("nursesdgvdgv",visibleNurses, nurses)

  const allSelected =
    visibleNurses.length > 0 && visibleNurses.every((nurse) => selectedIds.includes(nurse.id));

  const isTableLoading =
    resolvedFilterBranchId == null ||
    isNurseDropdownLoading ||
    isRosterLoading ||
    isRosterFetching;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleNurses.some((nurse) => nurse.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const merged = new Set(prev);
      visibleNurses.forEach((nurse) => merged.add(nurse.id));
      return Array.from(merged);
    });
  };

  const toggleNurse = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const applyShiftToCell = (nurseId: number, dayIndex: number) => {
    const isNewlyAdded = newlyAddedNurseIds.has(nurseId);

    if (isTableCellsLocked && !isNewlyAdded) return;
    setNurses((rows) =>
      rows.map((nurse) => {
        if (nurse.id !== nurseId) return nurse;
        const shifts = [...nurse.shifts];
        shifts[dayIndex] = shifts[dayIndex] === activeShift ? null : activeShift;
        return { ...nurse, shifts };
      })
    );
    setEditedCellKeys((prev) => {
      const next = new Set(prev);
      next.add(cellKey(nurseId, dayIndex));
      return next;
    });
  };

  const applyPatternFromDialog = (weekPattern: ShiftCode[], range: ApplyRange) => {
    if (isTableCellsLocked && newlyAddedNurseIds.size === 0) return;
    const touchedKeys: string[] = [];
    setNurses((rows) =>
      rows.map((nurse) => {
        if (isTableCellsLocked && !newlyAddedNurseIds.has(nurse.id)) return nurse;
        const shouldUpdate =
          selectedIds.length === 0 ||
          selectedIds.includes(nurse.id) ||
          selectedIds.length === nurses.length;
        if (!shouldUpdate) return nurse;

        const shifts = nurse.shifts.map((current, dayIndex) => {
          const date = new Date(year, monthIndex, dayIndex + 1);
          const dayOfWeek = date.getDay();
          if (!shouldApplyOnDay(dayOfWeek, range)) return current;
          touchedKeys.push(cellKey(nurse.id, dayIndex));
          return weekPattern[dayOfWeek] ?? null;
        });

        return { ...nurse, shifts };
      })
    );
    setIsPatternApplied(true);
    setEditedCellKeys((prev) => {
      const next = new Set(prev);
      touchedKeys.forEach((key) => next.add(key));
      return next;
    });
  };

  const handleAddNurse = (nurse: NurseDropdownItem) => {
    setNurses((rows) => {
      if (rows.some((row) => row.id === nurse.id)) return rows;
      const newRow: NurseRoster = {
        id: nurse.id,
        name: nurse.name,
        employeeId: nurse.empId || "",
        userType: "NURSE",
        role: nurse.empId || "Nurse",
        employmentStatus: "active",
        shifts: Array.from({ length: daysInMonth }, () => null),
      };
      return [newRow, ...rows];
    });
    setNewlyAddedNurseIds((prev) => {
      const next = new Set(prev);
      next.add(nurse.id);
      return next;
    });
  };

  const openExitDialog = (nurse: NurseRoster) => {
    setExitTarget(nurse);
    setExitLastWorkingDate("");
  };

  const closeExitDialog = () => {
    setExitTarget(null);
    setExitLastWorkingDate("");
    setIsExitConfirmOpen(false);
  };

  const handleMarkAsLeftClick = () => {
    if (!exitLastWorkingDate) return;
    setIsExitConfirmOpen(true);
  };

  const handleConfirmExit = async () => {
    if (!exitTarget || resolvedFilterBranchId == null) return;

    try {
      await updateDutyRosterForNurseExit({
        branchId: resolvedFilterBranchId,
        nurseId: exitTarget.id,
        lastWorkingDate: exitLastWorkingDate,
      }).unwrap();
      setIsExitConfirmOpen(false);
      setExitTarget(null);
      setIsExitSuccessOpen(true);
    } catch (error) {
      setIsExitConfirmOpen(false);
      setExitTarget(null);
      setDialogMessage(rtkErrorMessage(error) || "Failed to mark nurse as left. Please try again.");
      setShowErrorDialog(true);
    }
  };

  const handleExitSuccessOk = () => {
    setIsExitSuccessOpen(false);
    setExitLastWorkingDate("");
    void refetchRoster();
    void refetchRoasterNurseDropdown();
  };

  const copyPrevWeek = () => {
    if (isTableCellsLocked) return;
    const touchedKeys: string[] = [];
    setNurses((rows) =>
      rows.map((nurse) => {
        const shouldUpdate =
          selectedIds.length === 0 ||
          selectedIds.includes(nurse.id) ||
          selectedIds.length === nurses.length;
        if (!shouldUpdate) return nurse;

        const shifts = [...nurse.shifts];
        for (let day = 7; day < shifts.length; day += 1) {
          shifts[day] = shifts[day - 7] ?? null;
          touchedKeys.push(cellKey(nurse.id, day));
        }
        return { ...nurse, shifts };
      })
    );
    setEditedCellKeys((prev) => {
      const next = new Set(prev);
      touchedKeys.forEach((key) => next.add(key));
      return next;
    });
  };

  const clearSelected = () => {
    if (editedCellKeys.size === 0) return;
    if (isTableCellsLocked && newlyAddedNurseIds.size === 0) return;
    const clearableNurseIds = new Set(
      nurses
        .filter((nurse) => !isTableCellsLocked || newlyAddedNurseIds.has(nurse.id))
        .map((nurse) => nurse.id)
    );
    setNurses((rows) =>
      rows.map((nurse) => {
        if (!clearableNurseIds.has(nurse.id)) return nurse;
        const shifts = nurse.shifts.map((shift, dayIndex) =>
          editedCellKeys.has(cellKey(nurse.id, dayIndex)) ? null : shift
        );
        return { ...nurse, shifts };
      })
    );
    setIsPatternApplied(false);
    setEditedCellKeys((prev) => {
      const next = new Set<string>();
      prev.forEach((key) => {
        const nurseId = Number(key.split(":")[0]);
        if (!clearableNurseIds.has(nurseId)) next.add(key);
      });
      return next;
    });
  };

  const handleSaveRoster = async (nextStatus: "draft" | "confirmed") => {
    if (resolvedFilterBranchId == null) {
      setDialogMessage("Please select a branch before saving the roster.");
      setShowErrorDialog(true);
      return;
    }

    if (isTableCellsLocked && newlyAddedNurseIds.size === 0) {
      setDialogMessage(
        isStatusLocked
          ? `Confirmed or approved rosters cannot be edited. Current status: ${rosterStatus.toLowerCase()}.`
          : isPastRosterMonth
            ? "Previous months are view-only and cannot be edited."
            : "This roster cannot be edited."
      );
      setShowErrorDialog(true);
      return;
    }

    if (nextStatus === "confirmed" && newlyAddedNurseIds.size > 0) {
      const incompleteNurses = nurses.filter(
        (nurse) => newlyAddedNurseIds.has(nurse.id) && nurse.shifts.some((shift) => !shift)
      );
      if (incompleteNurses.length > 0) {
        setDialogMessage(
          `Please fill shifts for all days of the month for newly added nurse(s): ${incompleteNurses
            .map((nurse) => nurse.name)
            .join(", ")} before sending for approval.`
        );
        setShowErrorDialog(true);
        return;
      }
    }

    const rowsToSubmit =
      newlyAddedNurseIds.size > 0
        ? nurses.filter((nurse) => newlyAddedNurseIds.has(nurse.id))
        : nurses;

    try {
      const result = await bulkUpsertRoster(
        buildBulkUpsertPayload(rowsToSubmit, year, month, resolvedFilterBranchId, nextStatus)
      ).unwrap();
      setDialogMessage(result.message || "Roster saved successfully");
      setShowSuccessDialog(true);
      void refetchRoster();
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : "Failed to save roster. Please try again.";
      setDialogMessage(message || "Failed to save roster. Please try again.");
      setShowErrorDialog(true);
    }
  };

  const handleExportPDF = async () => {
    if (resolvedFilterBranchId == null) {
      setExportError("Select a branch to export.");
      setShowExportErrorDialog(true);
      return;
    }

    try {
      const result = await triggerRosterPdf({
        branchId: resolvedFilterBranchId,
        month,
        year,
      }).unwrap();

      if (result?.data?.url) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setExportError(rtkErrorMessage(error));
      setShowExportErrorDialog(true);
    }
  };

  const handleExportCSV = async () => {
    if (resolvedFilterBranchId == null) {
      setExportError("Select a branch to export.");
      setShowExportErrorDialog(true);
      return;
    }

    try {
      const result = await triggerRosterCsv({
        branchId: resolvedFilterBranchId,
        month,
        year,
      }).unwrap();

      if (result?.data?.url) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setExportError(rtkErrorMessage(error));
      setShowExportErrorDialog(true);
    }
  };

  const handlePrintRoster = () => {
    try {
      if (visibleNurses.length === 0) {
        setExportError("No roster data available to print.");
        setShowExportErrorDialog(true);
        return;
      }

      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const monthLabel =
        MONTH_OPTIONS.find((option) => option.value === selectedMonth)?.label || "Month";
      const generatedAt = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const dayHeaderHtml = dayHeaders
        .map(
          (header) =>
            `<th><div class="day-label">${escapeHtml(header.label)}</div><div class="day-num">${header.day}</div></th>`
        )
        .join("");

      const tableRowsHtml = visibleNurses
        .map((nurse) => {
          const { counts, totalHours } = summarizeShifts(nurse.shifts);
          const summaryLines = (["M", "E", "N", "O", "L"] as const)
            .filter((code) => counts[code] > 0)
            .map((code) => `${code} ${counts[code]}`);
          if (summaryLines.length === 0) {
            summaryLines.push("—");
          }
          summaryLines.push(`${totalHours}h`);

          const shiftCellsHtml = nurse.shifts
            .map((shift) => {
              if (!shift) return `<td class="shift empty">—</td>`;
              const meta = getShiftDisplayMeta(shift);
              return `<td class="shift" style="color:${meta.color};background:${meta.bg};">${escapeHtml(meta.displayCode)}</td>`;
            })
            .join("");

          return `
            <tr>
              <td class="nurse">
                <div class="nurse-name">${escapeHtml(nurse.name)}</div>
                <div class="nurse-role">${escapeHtml(nurse.role)}</div>
              </td>
              ${shiftCellsHtml}
              <td class="summary">${summaryLines.map((line) => escapeHtml(line)).join("<br/>")}</td>
            </tr>
          `;
        })
        .join("");

      const dayColgroupHtml = dayHeaders.map(() => `<col class="col-day" />`).join("");

      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Staff Roster - ${escapeHtml(monthLabel)} ${year}</title>
            <style>
              * {
                box-sizing: border-box;
              }
              body {
                font-family: Arial, Helvetica, sans-serif;
                color: #262D3B;
                margin: 12px;
              }
              h1 {
                margin: 0 0 4px;
                font-size: 18px;
              }
              .meta {
                margin-bottom: 12px;
                color: #525763;
                font-size: 11px;
              }
              .table-wrap {
                width: 100%;
                overflow: visible;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
              }
              col.col-nurse {
                width: 150px;
              }
              col.col-day {
                width: auto;
              }
              col.col-summary {
                width: 72px;
              }
              th, td {
                border: 1px solid #E5E7EB;
                padding: 4px 3px;
                text-align: center;
                font-size: 9px;
                vertical-align: middle;
              }
              th {
                background: #F8FAF8;
                color: #434956;
                font-weight: 700;
              }
              .day-label {
                font-size: 7px;
                line-height: 1.1;
                text-transform: uppercase;
                color: #9FA2AB;
              }
              .day-num {
                margin-top: 1px;
                font-size: 10px;
                line-height: 1.1;
              }
              th.nurse,
              td.nurse {
                text-align: left;
                padding: 6px 8px;
                white-space: normal;
                word-break: break-word;
                overflow-wrap: break-word;
                hyphens: auto;
              }
              .nurse-name {
                font-weight: 700;
                font-size: 10px;
                line-height: 1.3;
                color: #262D3B;
              }
              .nurse-role {
                margin-top: 2px;
                color: #9FA2AB;
                font-size: 8px;
                line-height: 1.2;
              }
              td.shift {
                font-weight: 700;
                font-size: 9px;
                padding: 3px 1px;
              }
              td.shift.empty {
                color: #C5C9D1;
                background: #FFFFFF;
              }
              th.summary,
              td.summary {
                text-align: left;
                padding: 6px 6px;
                font-size: 9px;
                font-weight: 600;
                line-height: 1.35;
                white-space: normal;
                word-break: keep-all;
              }
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
              @media print {
                body {
                  margin: 0;
                }
              }
            </style>
          </head>
          <body>
            <h1>Staff Roster</h1>
            <div class="meta">
              <div>${escapeHtml(monthLabel)} ${year}</div>
              <div>Generated: ${escapeHtml(generatedAt)}</div>
            </div>
            <div class="table-wrap">
              <table>
                <colgroup>
                  <col class="col-nurse" />
                  ${dayColgroupHtml}
                  <col class="col-summary" />
                </colgroup>
                <thead>
                  <tr>
                    <th class="nurse">Nurse Name</th>
                    ${dayHeaderHtml}
                    <th class="summary">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>
            </div>
          </body>
        </html>
      `;

      const iframe = document.createElement("iframe");
      iframe.setAttribute(
        "style",
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
      );
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("Unable to prepare print view.");
      }

      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      const printFrame = iframe.contentWindow;
      if (!printFrame) {
        document.body.removeChild(iframe);
        throw new Error("Unable to prepare print view.");
      }

      printFrame.focus();
      printFrame.print();

      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Failed to print staff roster.");
      setShowExportErrorDialog(true);
    }
  };

  const clearAllFilters = () => {
    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1));
    setSelectedYear(String(now.getFullYear()));
    setSelectedNurseId("");
    if (!isBranchFilterDisabled) {
      setSelectedBranch("");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
              Staff Roster
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#525763]">
              {/* Plan monthly shifts for Ward 4B. Use patterns or drag across cells to fill quickly. Room &amp; bed
              allocation is handled separately on a day-by-day basis under Room Allocation. */}

              Plan monthly staff shifts. Use patterns or drag across cells to fill quickly.
              Room & bed allocation is handled separately on a day-by-day basis under Room Allocation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* <Button
              variant="outline"
              size="medium"
              className="!min-w-0"
              disabled={isTableCellsLocked || isSavingRoster}
              onClick={() => void handleSaveRoster("draft")}
            >
              {isSavingRoster ? "Saving..." : "Save as Draft"}
            </Button> */}

             <button
                   disabled={isTableCellsLocked || isSavingRoster}
                    type="button"
                    className="flex h-10 items-center gap-2 rounded-[32px] border border-[#9A7909] px-6 text-sm font-medium text-[#9A7909] transition-colors hover:bg-[#F2F8F2]"
                 onClick={() => void handleSaveRoster("draft")}
                >
                    <span className="text-hide">{isSavingRoster ? "Saving..." : "Save & Draft"}</span>
                </button>

            <Button
              variant="primary"
              size="medium"
              className="!min-w-0"
              disabled={(isTableCellsLocked && newlyAddedNurseIds.size === 0) || isSavingRoster}
              onClick={() => void handleSaveRoster("confirmed")}
            >
              {isSavingRoster ? "Saving..." : "Send for Approval"}
            </Button>
          </div>
        </div>

        <section className="rounded-[20px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
          <div className="mb-0 flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-[#262D3B]">Filter</h3>
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-full border border-[#EF4444]/30 bg-white px-4 py-2 text-xs font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
            >
              Clear All filter
            </button>
          </div>
         {/* <div className="flex justify-end">
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_200px_150px_minmax(0,1.15fr)_minmax(0,1.8fr)]">
            <FormSelectField
              label=""
              options={hookBranchFilterOptions}
              value={selectedBranch}
              onChange={(value) => {
                setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
              }}
              placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
              mode="single"
              // background="white"
              // width="100%"
              width={250}
              height={44}
              disabled={isBranchFilterDisabled || isLoadingBranchFilter}
            />

            <FormSelectField
              label=""
              options={MONTH_OPTIONS}
              value={selectedMonth}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                setSelectedMonth(next || String(new Date().getMonth() + 1));
              }}
              placeholder="Select month"
              width="100%"
              height={44}
              // background="white"
            />

            <FormSelectField
              label=""
              options={yearOptions}
              value={selectedYear}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                setSelectedYear(next || String(new Date().getFullYear()));
              }}
              placeholder="Select year"
              width="100%"
              height={44}
              // background="white"
            />

            <FormSelectField
              label=""
              options={nurseOptions}
              value={selectedNurseId}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                setSelectedNurseId(next || "");
              }}
              placeholder={isNurseDropdownLoading ? "Loading nurses..." : "All Nurses"}
              width={250}
              height={44}
              // background="white"
              disabled={isNurseDropdownLoading || resolvedFilterBranchId == null}
            />

            <div className="flex w-full flex-col justify-end md:col-span-2 xl:col-span-1">
              <p className="mb-2 text-xs font-medium text-[#7B8089]">Shift</p>
              <div className="flex h-auto min-h-11 w-full flex-wrap items-center gap-1 rounded-full border border-[#E3EEE1] bg-[#FAFBFA] p-1">
                {(Object.keys(SHIFT_META) as Array<Exclude<ShiftCode, null>>).map((code) => {
                  const meta = SHIFT_META[code];
                  const isActive = activeShift === code;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setActiveShift(code)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                        isActive
                          ? "bg-[#0B8C00] text-white shadow-sm"
                          : "text-[#434956] hover:bg-white"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>
          </div>

          <div className="mt-5 pb-4 flex flex-col gap-3 border-t border-[#EEF2EE] pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-[32px] border border-[#DFE0E2] bg-white px-6 text-sm font-medium text-[#434956] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={copyPrevWeek}
                disabled={isTableCellsLocked}
              >
                <Image src="/icons/Copy.svg" alt="" width={20} height={20} />
                <span>Copy Prev Week</span>
              </button>

              <button
                type="button"
                disabled={isTableCellsLocked && newlyAddedNurseIds.size === 0}
                onClick={() => setIsApplyPatternOpen(true)}
                className={`flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] px-6 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isPatternApplied
                    ? "bg-[#0B8C00] text-white hover:bg-[#097A00]"
                    : "bg-white text-[#0B8C00] hover:bg-[#F2F8F2]"
                }`}
              >
                <span>Apply pattern</span>
              </button>

              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                onClick={() => setIsAddNurseOpen(true)}
                >
                <Image src="/icons/AddIcon.svg" alt="Refer Patient" width={20} height={20} />
                <span className="text-hide">Add Nurse</span>
              </button>

              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-[32px] border border-[#DFE0E2] bg-white px-6 text-sm font-medium text-[#434956] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={clearSelected}
                disabled={(isTableCellsLocked && newlyAddedNurseIds.size === 0) || editedCellKeys.size === 0}
              >
                <Image src="/icons/TrashBlackIcon.svg" alt="" width={16} height={16} />
                <span>Clear</span>
              </button>

              <button
                type="button"
                onClick={handlePrintRoster}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] px-6 text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20"
              >
                <Image
                  src="/icons/printBrownprint.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="shrink-0"
                />
                Print
              </button>
              <ExportButton
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                isLoadingPDF={isExportPdfLoading}
                isLoadingCSV={isExportCsvLoading}
              />
            </div> */}


          <div className="rounded-[20px] bg-white p-5">
            <div className="flex flex-wrap items-end gap-4">
              {/* Branch */}
              {/* <div className="min-w-[180px] flex-1 basis-[180px]">
                <FormSelectField
                  label=""
                  options={hookBranchFilterOptions}
                  value={selectedBranch}
                  onChange={(value) => {
                    setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                  }}
                  placeholder={
                    isLoadingBranchFilter ? "Loading branches..." : "Select Branch"
                  }
                  mode="single"
                  width="100%"
                  height={44}
                  disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                />
              </div> */}

              <div className="w-full sm:w-[280px] sm:shrink-0">
                <FormSelectField
                  label=""
                  options={hookBranchFilterOptions}
                  value={selectedBranch}
                  onChange={(value) => {
                    setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                  }}
                  placeholder={
                    isLoadingBranchFilter ? "Loading branches..." : "Select Branch"
                  }
                  mode="single"
                  width="100%"
                  height={44}
                  disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                />
              </div>

              {/* Month */}
              {/* <div className="min-w-[120px] flex-1 basis-[120px]">
                <FormSelectField
                  label=""
                  options={MONTH_OPTIONS}
                  value={selectedMonth}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setSelectedMonth(next || String(new Date().getMonth() + 1));
                  }}
                  placeholder="Select month"
                  width="100%"
                  height={44}
                />
              </div> */}

              <div className="w-full sm:w-[180px] sm:shrink-0">
                <FormSelectField
                  label=""
                  options={MONTH_OPTIONS}
                  value={selectedMonth}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setSelectedMonth(next || String(new Date().getMonth() + 1));
                  }}
                  placeholder="Select month"
                  width="100%"
                  height={44}
                />
              </div>

              {/* Year */}
              {/* <div className="min-w-[110px] flex-1 basis-[110px]">
                <FormSelectField
                  label=""
                  options={yearOptions}
                  value={selectedYear}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setSelectedYear(next || String(new Date().getFullYear()));
                  }}
                  placeholder="Select year"
                  width="100%"
                  height={44}
                />
              </div> */}

              <div className="w-full sm:w-[150px] sm:shrink-0">
                <FormSelectField
                  label=""
                  options={yearOptions}
                  value={selectedYear}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setSelectedYear(next || String(new Date().getFullYear()));
                  }}
                  placeholder="Select year"
                  width="100%"
                  height={44}
                />
              </div>

              {/* Nurse */}
              {/* <div className="min-w-[160px] flex-1 basis-[160px]">
                <FormSelectField
                  label=""
                  options={nurseOptions}
                  value={selectedNurseId}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setSelectedNurseId(next || "");
                  }}
                  placeholder={
                    isNurseDropdownLoading ? "Loading nurses..." : "All Nurses"
                  }
                  width="100%"
                  height={44}
                  disabled={
                    isNurseDropdownLoading || resolvedFilterBranchId == null
                  }
                />
              </div> */}

              {/* Shift */}
          <div className="w-fit">
            {/* <p className="mb-2 text-xs font-medium text-[#7B8089]">Shift</p> */}

            {/* <div className="flex h-11 w-[380px] items-center gap-0.5 rounded-full border border-[#E3EEE1] bg-[#FAFBFA] p-1">
              {(Object.keys(SHIFT_META) as Array<Exclude<ShiftCode, null>>).map(
                (code) => {
                  const meta = SHIFT_META[code];
                  const isActive = activeShift === code;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setActiveShift(code)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-full px-1 py-1.5 text-[11px] whitespace-nowrap transition-colors ${
                        isActive
                          ? "bg-[#0B8C00] text-white"
                          : "text-[#434956] hover:bg-white"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </button>
                  );
                }
              )}
            </div> */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#434956]">Brush:</span>

            <div className="flex h-11 w-[380px] items-center gap-0.5 rounded-full border border-[#E3EEE1] bg-[#FAFBFA] p-1">
              {(Object.keys(SHIFT_META) as SingleShiftCode[]).map(
                (code) => {
                  const meta = SHIFT_META[code];
                  const isActive = activeShift === code;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setActiveShift(code)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? "bg-[#0B8C00] text-white"
                          : "text-[#434956] hover:bg-white"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>
          </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#434956]">Double shift:</span>

                  <div className="flex h-11 w-[380px] items-center gap-0.5 rounded-full border border-[#E3EEE1] bg-[#FAFBFA] p-1">
                    {(Object.keys(COMBO_META) as ComboShiftCode[]).map((code) => {
                      const meta = COMBO_META[code];
                      const isActive = activeShift === code;

                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setActiveShift(code)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                            isActive
                              ? "bg-[#0B8C00] text-white"
                              : "text-[#434956] hover:bg-white"
                          }`}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-1 basis-full flex-wrap items-center justify-end gap-3">
                {/* Acting on all nurse */}
                <div className="inline-flex items-center rounded-full bg-[#E8F4E6] px-4 py-1">
                <span className="text-[13px] font-medium text-[#1D8F2A]">
                  Acting on all {rosterRes?.total} nurses
                </span>
              </div>

                <button
                  type="button"
                  onClick={copyPrevWeek}
                  disabled={isTableCellsLocked}
                  className="flex h-11 items-center gap-2 rounded-full border border-[#DFE0E2] bg-white px-5 text-sm font-medium text-[#434956] whitespace-nowrap"
                >
                  <Image src="/icons/Copy.svg" alt="" width={18} height={18} />
                  Copy Prev Week
                </button>

                <button
                  type="button"
                  disabled={isTableCellsLocked && newlyAddedNurseIds.size === 0}
                  onClick={() => setIsApplyPatternOpen(true)}
                  className={`flex h-11 items-center rounded-full border px-5 text-sm font-medium whitespace-nowrap ${
                    isPatternApplied
                      ? "border-[#0B8C00] bg-[#0B8C00] text-white"
                      : "border-[#0B8C00] bg-white text-[#0B8C00]"
                  }`}
                >
                  Apply Pattern
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddNurseOpen(true)}
                  className="flex h-11 items-center gap-2 rounded-full border border-[#0B8C00] px-5 text-sm font-medium text-[#0B8C00] whitespace-nowrap"
                >
                  <Image src="/icons/AddIcon.svg" alt="" width={18} height={18} />
                  Add Nurse
                </button>

                <button
                  type="button"
                  onClick={clearSelected}
                  disabled={
                    (isTableCellsLocked && newlyAddedNurseIds.size === 0) ||
                    editedCellKeys.size === 0
                  }
                  className="flex h-11 items-center gap-2 rounded-full border border-[#9A7909] px-5 text-sm font-medium text-[#9A7909] whitespace-nowrap"
                >
                  <Image
                    src="/icons/clearIcon.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handlePrintRoster}
                  className="flex h-11 items-center gap-2 rounded-full border border-[#9A7909] px-5 text-sm font-medium text-[#9A7909] whitespace-nowrap"
                >
                  <Image
                    src="/icons/printBrownprint.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Print
                </button>

                <ExportButton
                  onExportPDF={handleExportPDF}
                  onExportCSV={handleExportCSV}
                  isLoadingPDF={isExportPdfLoading}
                  isLoadingCSV={isExportCsvLoading}
                />
                </div>
            </div>
          </div>


          <div className="w-fit max-w-full overflow-auto rounded-[16px] border border-[#E8EDE8]">
            <table className="min-w-max border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#F8FAF8]">
                  <th className="sticky left-0 z-20 border-b border-r border-[#E8EDE8] bg-[#F8FAF8] px-3 py-3 text-left">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={allSelected} onChange={toggleSelectAll} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#7B8089]">
                        Nurse Name
                      </span>
                    </div>
                  </th>
                  {dayHeaders.map((header) => (
                    <th
                      key={`${year}-${monthIndex}-${header.day}`}
                      className="border-b border-[#E8EDE8] px-1.5 py-3 text-center"
                    >
                      <div className="flex min-w-[42px] flex-col items-center leading-tight">
                        <span className="text-[10px] font-medium uppercase text-[#9FA2AB]">{header.label}</span>
                        <span className="text-xs font-semibold text-[#434956]">{header.day}</span>
                      </div>
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 border-b border-l border-[#E8EDE8] bg-[#F8FAF8] px-3 py-3 text-left">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#7B8089]">Summary</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isTableLoading ? (
                  <tr>
                    <td
                      colSpan={daysInMonth + 2}
                      className="border-b border-[#E8EDE8] px-3 py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <SpinnerLoader size={18} />
                        Loading staff roster...
                      </div>
                    </td>
                  </tr>
                ) : visibleNurses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={daysInMonth + 2}
                      className="border-b border-[#E8EDE8] px-3 py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      No nurses found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  visibleNurses.map((nurse) => {
                    const isSelected = selectedIds.includes(nurse.id);
                    const isNewlyAdded = newlyAddedNurseIds.has(nurse.id);
                    const cellsDisabled = isTableCellsLocked && !isNewlyAdded;
                    const { counts, totalHours } = summarizeShifts(nurse.shifts);
                    console.log("nurseahdyagysa",nurse)
                    return (
                      <tr key={nurse.id} className={isSelected ? "bg-[#F7FAF7]" : "bg-white"}>
                        {/* <td
                          className={`sticky left-0 z-10 border-b border-r border-[#E8EDE8] px-3 py-3 ${
                            isSelected ? "bg-[#F7FAF7]" : "bg-white"
                          }`}
                        >
                          <div className="flex min-w-[210px] items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleNurse(nurse.id)}
                            />
                            <div>
                              <p className="text-sm font-semibold text-[#262D3B]">{nurse.name}</p>
                              <p className="mt-0.5 text-xs text-[#9FA2AB]">{nurse.role}</p>
                            </div>
                             <Image src="/icons/threeDot.svg" alt="" width={20} height={20} />
                          </div>
                        </td> */}

                        <td
                          className={`sticky left-0 z-10 border-b border-r border-[#E8EDE8] px-3 py-3 ${
                            isSelected ? "bg-[#F7FAF7]" : "bg-white"
                          }`}
                        >
                          <div className="flex w-full min-w-[210px] items-start justify-between">
                            {/* <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleNurse(nurse.id)}
                              />
                              <div>
                                <p className="text-sm font-semibold text-[#262D3B]">
                                  {nurse.name}
                                </p>
                                <Badge variant="success" className="font-medium uppercase">
                                    {nurse.employmentStatus ?? ""}
                                 </Badge>
                                <p className="mt-0.5 text-xs text-[#9FA2AB]">
                                  {nurse.role}
                                </p>
                              </div>
                            </div> */}
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleNurse(nurse.id)}
                              />

                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-[#262D3B]">
                                    {nurse.name}
                                  </p>

                                 {!isNewlyAdded && nurse.employmentStatus?.toLowerCase() === "inactive" && (
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] leading-none font-medium ${
                                    nurse.employmentStatus?.toLowerCase() === "active"
                                      ? "border-[#0B8C00] bg-[#0B8C000D] text-[#0B8C00]"
                                      : "border-[#D32F2F] bg-[#D32F2F0D] text-[#D32F2F]"
                                  }`}
                                >
                                  {nurse.employmentStatus
                                    ? nurse.employmentStatus.charAt(0).toUpperCase() +
                                      nurse.employmentStatus.slice(1).toLowerCase()
                                    : ""}
                                </span>
                                 )}

                             </div>

                                <p className="mt-0.5 text-xs text-[#9FA2AB]">
                                  {nurse.role}
                                </p>
                              </div>
                            </div>

                            {!isNewlyAdded && nurse.employmentStatus?.toLowerCase() !== "inactive" && (
                              <Image
                                src="/icons/threeDot.svg"
                                alt=""
                                width={20}
                                height={20}
                                className="mt-1 cursor-pointer"
                                onClick={() => openExitDialog(nurse)}
                              />
                            )}
                          </div>
                        </td>

                        {nurse.shifts.map((shift, dayIndex) => (
                          <td key={`${nurse.id}-${dayIndex}`} className="border-b border-[#E8EDE8] px-1.5 py-2">
                            <div className="flex justify-center">
                              <ShiftCell
                                value={shift}
                                disabled={cellsDisabled}
                                onClick={() => applyShiftToCell(nurse.id, dayIndex)}
                              />
                            </div>
                          </td>
                        ))}

                        <td
                          className={`sticky right-0 z-10 border-b border-l border-[#E8EDE8] px-3 py-3 ${
                            isSelected ? "bg-[#F7FAF7]" : "bg-white"
                          }`}
                        >
                          <div className="flex min-w-[120px] flex-col gap-1.5">
                            <div className="flex flex-wrap gap-1">
                              {(["M", "E", "N"] as const)
                                .filter((code) => counts[code] > 0)
                                .map((code) => (
                                  <span
                                    key={code}
                                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                    style={{
                                      color: SHIFT_META[code].color,
                                      backgroundColor: SHIFT_META[code].bg,
                                      border: `1px solid ${SHIFT_META[code].border}`,
                                    }}
                                  >
                                    {code} {counts[code]}
                                  </span>
                                ))}
                            </div>
                            <span className="text-xs font-medium text-[#7B8089]">{totalHours}h</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-[#525763]">
            Tip: select a shift type (Morning / Evening / Night / Off / On Leave), then click a cell to assign only that
            shift. Click the same cell again to clear it.
          </p>
        </section>
      </div>

      <ApplyPatternDialog
        open={isApplyPatternOpen}
        onClose={() => setIsApplyPatternOpen(false)}
        onApply={applyPatternFromDialog}
      />

      <AddNurseDialog
        open={isAddNurseOpen}
        onClose={() => setIsAddNurseOpen(false)}
        onSubmit={handleAddNurse}
        branchId={resolvedFilterBranchId ?? null}
        month={month}
        year={year}
        existingNurseIds={nurses.map((nurse) => nurse.id)}
      />

      <NurseExitDialog
        open={exitTarget !== null && !isExitConfirmOpen}
        nurse={exitTarget}
        lastWorkingDate={exitLastWorkingDate}
        onChangeLastWorkingDate={setExitLastWorkingDate}
        onClose={closeExitDialog}
        onSubmit={handleMarkAsLeftClick}
      />

      <MessageDialog
        open={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        icon="/icons/questionMark.svg"
        iconBgColor="#E8F5E9"
          message={
          <>
            <p className="text-[18px] font-semibold text-[#262D3B]">
              Are you sure you want to mark {exitTarget?.name} as left?
            </p>

            <p className="mt-2 text-[14px] font-normal text-[#6B7280]">
              This will remove all of her upcoming nurse assignments, bookings,
              and scheduled duties. This action cannot be undone.
            </p>
          </>
        }
        confirmText="Confirm"
        cancelText="Close"
        showCancel
        isActionLoading={isExitSubmitting}
        onConfirm={handleConfirmExit}
        onCancel={() => setIsExitConfirmOpen(false)}
      />

      <MessageDialog
        open={isExitSuccessOpen}
        onClose={handleExitSuccessOk}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message="Nurse marked as left successfully."
        showCancel={false}
        confirmText="OK"
        onConfirm={handleExitSuccessOk}
      />

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        message={dialogMessage}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => setShowSuccessDialog(false)}
      />

      <MessageDialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={dialogMessage}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => setShowErrorDialog(false)}
      />

      <MessageDialog
        open={showExportErrorDialog}
        onClose={() => setShowExportErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={exportError}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => setShowExportErrorDialog(false)}
      />
    </AppShell>
  );
}
