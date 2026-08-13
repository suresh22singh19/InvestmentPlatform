"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormik, setNestedObjectValues } from "formik";
import * as Yup from "yup";
import {
  BackToPreviousPageButton,
  Badge,
  Button,
  DatePicker,
  Dialog,
  FormInputField,
  FormSelectField,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  TableSearchInput,
  Tabs,
  MessageDialog,
  SpinnerLoader,
  Tooltip,
} from "@/components/ui";
import { MedicalInformationCard, type MedicalInformationItem } from "@/components/ui/MedicalInformationCard";
import {
  useCreateNursingNoteMutation,
  useGetPatientMedicineScheduleQuery,
  useGetPatientMedicineListQuery,
  useGetPatientOverviewQuery,
  useGetNursingNoteListQuery,
  useGetLabTestSummaryQuery,
  useGetLabTestListQuery,
  useGetLabTestListingQuery,
  useCreateLabTestMutation,
  useGetDistinctLabTestCategoriesQuery,
  useGetPendingApprovalLabTestListQuery,
  useAddPatientMedicineMutation,
  useEditPatientMedicineMutation,
  useReplacePatientMedicineMutation,
  useStopPatientMedicineMutation,
  useGetAllMedicineByBranchListQuery,
  useGetAssignedPatientTherapyScheduleQuery,
  useGetPatientVitalsBySessionQuery,
  useGetPatientNurseTasksQuery,
  useUpdatePatientNurseTaskStatusMutation,
  type LabTestListItem,
  type AssignedPatientTherapyScheduleItem,
  type PatientMedicineDetailItem,
  type PatientMedicineListItem,
  type PatientMedicineScheduleShift,
  type PatientOverviewData,
  type SessionPatientVitals,
} from "@/store/api/ipdHeadNurseAPI";
import { useAppSelector } from "@/store/hooks";
import {
  selectDosageList,
  selectDurationList,
  selectFrequencyList,
  type LookupItem,
} from "@/store/slices/medicineSlice";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { PatientHistoryTab } from "./history";
import { PatientMedicationScheduleTab } from "./medicationSchedule";
import { PatientTimelineTab } from "./timeline";
import { PatientVitalsTab } from "./vitals";

export type AssignedPatientDetail = {
  id: number;
  patientTitle:string;
  patientName: string;
  patientUhid: string;
  age: string;
  gender: string;
  bedNumber: string;
  roomNumber: string;
  admissionDate: string;
  treatingDoctor: string;
  diagnosis: string;
  patientType?: string;
};

type AssignedPatientViewProps = {
  patient: AssignedPatientDetail;
  onBack: () => void;
};

type PatientTab =
  | "overview"
  | "nursing-notes"
  | "lab-result"
  | "therapies"
  | "vitals"
  | "medicines"
  | "medication-schedule"
  | "timeline"
  | "history";

const PATIENT_TABS: { id: PatientTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "nursing-notes", label: "Nursing Notes" },
  { id: "lab-result", label: "Lab Result" },
  { id: "therapies", label: "Therapies" },
  { id: "vitals", label: "Vitals" },
  { id: "medicines", label: "Medicines" },
  { id: "medication-schedule", label: "Medication Schedule" },
  { id: "timeline", label: "Timeline" },
  { id: "history", label: "History" },
];

const MEDICAL_INFO_ITEMS = [
  { label: "Diagnosis", value: "Alopecia" },
  { label: "Disease", value: "Alopecia Areata" },
  { label: "Blood Group", value: "A+" },
  { label: "Allergies", value: "No" },
  { label: "Surgeries", value: "No" },
  { label: "Addiction", value: "No" },
  { label: "Height", value: "5.8" },
  { label: "Weight", value: "80kg" },
  { label: "Diet Type", value: "Vegetarian" },
  {
    label: "Remark",
    value: "",
    remark: "Mild abdominal discomfort and reduced appetite for the past 24 hours.",
  },
];

const VITALS = [
  { id: 1, label: "Blood Pressure", value: "124/82 mmHg", status: "High", tone: "danger" as const, icon: "/icons/BloodPressureIcon.svg" },
  { id: 2, label: "Pulse Rate", value: "72bpm", status: "Normal", tone: "success" as const, icon: "/icons/VitalsIcon.svg" },
  { id: 3, label: "Temperature", value: "98.6°F", status: "Normal", tone: "success" as const, icon: "/icons/VitalsIcon.svg" },
  { id: 4, label: "SpO2", value: "98%", status: "Watch", tone: "warning" as const, icon: "/icons/VitalsIcon.svg" },
  { id: 5, label: "Resp Rate", value: "18", status: "Normal", tone: "success" as const, icon: "/icons/VitalsIcon.svg" },
  { id: 6, label: "Pain", value: "7/10", status: "Severe", tone: "danger" as const, icon: "/icons/painLevel.svg" },
];

type StatusTone = "success" | "warning" | "danger" | "neutral";

type MedicineTone = "success" | "warning" | "danger" | "neutral";

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
  const [year, month, day] = therapyDate?.split("T")[0]?.split("-")?.map(Number);
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
    const dateKey = item?.session?.therapyDate?.split("T")[0];
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

function formatTherapyStatusLabel(status: string) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("overdue") || normalized.includes("over due")) return "over due";
  if (normalized.includes("complete")) return "Completed";
  if (normalized.includes("schedule")) return "Scheduled";
  if (normalized.includes("defer")) return "Deferred";
  return formatOverviewLabel(status);
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

function formatMedicineDose(item: PatientMedicineDetailItem) {
  const amount = item.dosageAmount?.trim();
  const unit = item.dosageUnit?.trim();
  if (amount && unit) return `${amount} ${unit}`;
  return amount || unit || "N/A";
}

type MedicineScheduleTableRow = PatientMedicineDetailItem & {
  scheduleShift: string;
};

function flattenMedicineSchedule(
  shifts: PatientMedicineScheduleShift[]
): MedicineScheduleTableRow[] {
  return shifts.flatMap((group) =>
    (group.medicines ?? []).map((medicine) => ({
      ...medicine,
      scheduleShift:
        group.shift?.trim() ||
        medicine.shift?.trim() ||
        medicine.todayDoses?.shift?.trim() ||
        "N/A",
    }))
  );
}

function formatMedicineScheduleTime(item: PatientMedicineDetailItem) {
  const completedAt = item.todayDoses?.completedAt;
  if (completedAt) {
    return new Date(completedAt).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (item.timingType) {
    return item.timingType
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return "N/A";
}

function formatMedicineDoseStatus(status: string | null | undefined): {
  label: string;
  tone: StatusTone;
} {
  const normalized = status?.toLowerCase().replace(/\s+/g, "") ?? "";
  if (normalized === "missed" || normalized === "overdue") {
    return { label: status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : "Missed", tone: "danger" };
  }
  if (
    normalized === "completed" ||
    normalized === "given" ||
    normalized === "administered" ||
    normalized === "taken"
  ) {
    return { label: "Completed", tone: "success" };
  }
  if (
    normalized === "pending" ||
    normalized === "due" ||
    normalized === "duenow" ||
    normalized === "due_now" ||
    normalized === "next"
  ) {
    return {
      label: normalized === "duenow" || normalized === "due_now" ? "Due Now" : status
        ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        : "Pending",
      tone: "warning",
    };
  }
  if (!status) return { label: "N/A", tone: "neutral" };
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
    tone: "neutral",
  };
}

function getMedicineScheduleStatus(row: PatientMedicineDetailItem) {
  if (row.todayDoses) {
    return row.doseStatus || row.todayDoses.status;
  }

  return row.shiftTimeStatus || row.doseStatus;
}

function formatOverviewValue(value: string | null | undefined, fallback = "N/A") {
  if (value === null || value === undefined || value.trim() === "") return fallback;
  return value.trim();
}

function formatOverviewLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatBloodGroup(value: string | null | undefined) {
  if (!value) return "N/A";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatAddictionList(addiction: string[] | null | undefined) {
  if (!addiction?.length) return "No";
  return addiction.map((item) => formatOverviewLabel(item)).join(", ");
}

function formatYesNoValue(value: string | null | undefined) {
  if (!value) return "N/A";
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "no") {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return formatOverviewLabel(value);
}

function formatVitalsUpdatedAt(dateValue: string | null | undefined) {
  if (!dateValue) return "N/A";
  const updatedAt = new Date(dateValue);
  if (Number.isNaN(updatedAt.getTime())) return "N/A";

  const diffMinutes = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return updatedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapLabStatusTone(status: string): StatusTone {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized === "done" || normalized === "completed" || normalized === "received") {
    return "success";
  }
  if (normalized === "pending") return "warning";
  return "neutral";
}

function mapTherapyStatusTone(status: string): TherapyScheduleTone {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("complete")) return "success";
  if (normalized.includes("overdue") || normalized.includes("over due")) return "danger";
  if (normalized.includes("defer")) return "neutral";
  if (normalized.includes("schedule") || normalized.includes("pending")) return "warning";
  return "neutral";
}

function mapLabStatusText(status: string) {
  if (!status || status.toLowerCase() === "n/a") return "N/A";
  return formatOverviewLabel(status);
}

function buildMedicalInfoItems(details: PatientOverviewData["patientDetails"]): MedicalInformationItem[] {
  const items: MedicalInformationItem[] = [
    { label: "Diagnosis", value: formatOverviewValue(details.diagnosis) },
    { label: "Blood Group", value: formatBloodGroup(details.bloodGroup) },
    { label: "Allergies", value: formatYesNoValue(details.allergies) },
    { label: "Surgeries", value: formatYesNoValue(details.surgeries) },
    { label: "Addiction", value: formatAddictionList(details.addiction) },
    { label: "Height", value: formatOverviewValue(details.height) },
    {
      label: "Weight",
      value: details.weight
        ? details.weight.toLowerCase().includes("kg")
          ? details.weight
          : `${details.weight} kg`
        : "N/A",
    },
    { label: "Diet Type", value: formatOverviewValue(details.dietType) },
  ];

  if (details.remark) {
    items.push({
      label: "Remark",
      value: "",
      remark: details.remark,
    });
  }

  return items;
}

function buildLatestVitalsCards(vitals: PatientOverviewData["latestVitals"]) {
  if (!vitals) return [];

  return [
    {
      id: 1,
      label: "Temperature",
      value: vitals.temperature ? `${vitals.temperature}°F` : "N/A",
      icon: "/icons/VitalsIcon.svg",
    },
    {
      id: 2,
      label: "Blood Pressure",
      value: vitals.bloodPressure ? `${vitals.bloodPressure} mmHg` : "N/A",
      icon: "/icons/BloodPressureIcon.svg",
    },
    {
      id: 3,
      label: "Pulse Rate",
      value: vitals.pulse ? `${vitals.pulse} bpm` : "N/A",
      icon: "/icons/VitalsIcon.svg",
    },
    {
      id: 4,
      label: "Respiratory Rate",
      value: vitals.respiratoryRate ? `${vitals.respiratoryRate} /min` : "N/A",
      icon: "/icons/VitalsIcon.svg",
    },
    {
      id: 5,
      label: "SpO2",
      value: vitals.spo2 ? `${vitals.spo2}%` : "N/A",
      icon: "/icons/VitalsIcon.svg",
    },
    {
      id: 6,
      label: "Sugar Level",
      value: vitals.sugarLevel ? `${vitals.sugarLevel} mg/dL` : "N/A",
      icon: "/icons/VitalsIcon.svg",
    },
    {
      id: 7,
      label: "Pain",
      value: vitals.painScale ? String(vitals.painScale) : "N/A",
      icon: "/icons/painLevel.svg",
    },
  ];
}

function getNameInitials(name: string | null | undefined) {
  if (!name) return "NA";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatNursingNoteDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNursingNoteDateTime(dateValue: string) {
  return new Date(dateValue).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

type MedicineRow = {
  id: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  status: string;
  tone: MedicineTone;
};

function formatMedicineListDosage(item: PatientMedicineListItem) {
  const amount = item.dosageAmount?.trim();
  const unit = item.dosageUnit?.trim();
  if (amount && unit) return `${amount} ${unit}`;
  return amount || unit || "N/A";
}

function formatMedicineListTiming(timingType: string | null | undefined) {
  if (!timingType?.trim()) return "N/A";
  return timingType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMedicineListDuration(item: PatientMedicineListItem) {
  const amount = item.durationAmount?.trim();
  const unit = item.durationUnit?.trim();
  if (!amount && !unit) return "N/A";

  const unitLabel = unit
    ? unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase()
    : "";
  return amount && unitLabel ? `${amount} ${unitLabel}` : amount || unitLabel || "N/A";
}

function formatMedicineListStatus(medicineStatus: string | null | undefined): {
  label: string;
  tone: MedicineTone;
} {
  const normalized = medicineStatus?.toLowerCase() ?? "";
  if (normalized === "active") return { label: "Active", tone: "success" };
  if (normalized === "approved") return { label: "Approved", tone: "success" };
  if (normalized === "paused" || normalized === "pause") return { label: "Paused", tone: "warning" };
  if (normalized === "replaced" || normalized === "inactive") {return { label: "Replaced", tone: "danger" }}
  if (normalized === "updated") return { label: "Updated", tone: "warning" };

  return {
    label: medicineStatus
      ? medicineStatus.charAt(0).toUpperCase() + medicineStatus.slice(1).toLowerCase()
      : "N/A",
    tone: "neutral",
  };
}

function mapPatientMedicineListItemToRow(item: PatientMedicineListItem): MedicineRow {
  const statusDisplay = formatMedicineListStatus(item.medicineStatus);
  return {
    id: item.id,
    medicineName: item.medicineName || "N/A",
    dosage: formatMedicineListDosage(item),
    frequency: item.frequency || item.frequencyType || "N/A",
    timing: formatMedicineListTiming(item.timingType),
    duration: formatMedicineListDuration(item),
    status: statusDisplay.label,
    tone: statusDisplay.tone,
  };
}

const MEDICINES_LIST: MedicineRow[] = [
  {
    id: 1,
    medicineName: "Triphala Churna",
    dosage: "5g",
    frequency: "Twice daily",
    timing: "Morning & Evening",
    duration: "10 Days",
    status: "Active",
    tone: "success",
  },
  {
    id: 2,
    medicineName: "Ashwagandha Tab",
    dosage: "500mg",
    frequency: "Once at night",
    timing: "8:00 PM",
    duration: "30 Days",
    status: "Updated",
    tone: "warning",
  },
  {
    id: 3,
    medicineName: "Dashmoolak Kwath",
    dosage: "30ml",
    frequency: "Thrice daily",
    timing: "Before Meals",
    duration: "14 Days",
    status: "Replaced",
    tone: "danger",
  },
  {
    id: 4,
    medicineName: "Brahmi Ghrita",
    dosage: "10ml",
    frequency: "Once (morning)",
    timing: "Morning",
    duration: "21 Days",
    status: "Active",
    tone: "success",
  },
  {
    id: 5,
    medicineName: "Amalaki Rasayana",
    dosage: "1 Tablet",
    frequency: "Twice daily",
    timing: "After Meals",
    duration: "30 Days",
    status: "Updated",
    tone: "warning",
  },
  {
    id: 6,
    medicineName: "Giloy Tablet",
    dosage: "500 mg",
    frequency: "Twice daily",
    timing: "Morning & Night",
    duration: "15 Days",
    status: "Replaced",
    tone: "danger",
  },
];

const ADD_MEDICINE_ROUTE_OPTIONS = ["Oral", "Topical", "Intravenous", "Intramuscular", "Sublingual"].map(
  (value) => ({
    label: value,
    value,
  })
);

const ADD_MEDICINE_TIMING_OPTIONS = [
  { label: "Before Food", value: "BEFORE_FOOD" },
  { label: "After Food", value: "AFTER_FOOD" },
];

const ADD_MEDICINE_EXTENDED_TIMING_OPTIONS: LookupItem[] = [
  { key: "BEFORE_BREAKFAST", value: "Before Breakfast" },
  { key: "AFTER_BREAKFAST", value: "After Breakfast" },
  { key: "BEFORE_LUNCH", value: "Before Lunch" },
  { key: "AFTER_LUNCH", value: "After Lunch" },
  { key: "BEFORE_DINNER", value: "Before Dinner" },
  { key: "AFTER_DINNER", value: "After Dinner" },
  { key: "EMPTY_STOMACH", value: "Empty Stomach" },
  { key: "AT_BEDTIME", value: "At Bedtime" },
];

type AddMedicineFormValues = {
  medicineId: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  timings: { value: string }[];
  remark: string;
};

const addMedicineValidationSchema = Yup.object({
  medicineId: Yup.string().required("Medicine name is required"),
  dosage: Yup.string().required("Dosage is required"),
  frequency: Yup.string().required("Frequency is required"),
  duration: Yup.string().required("Duration is required"),
  route: Yup.string().required("Route is required"),
  timings: Yup.array()
    .of(
      Yup.object({
        value: Yup.string().required("Timing is required"),
      })
    )
    .min(1, "At least one timing is required"),
  remark: Yup.string(),
});

function toLookupSelectOptions(list: LookupItem[]) {
  return list.map((item) => ({
    label: item.value,
    value: item.key,
  }));
}

function normalizeDosageAmount(amount: string) {
  if (amount === "½") return "0.5";
  if (amount === "¼") return "0.25";
  if (amount === "1½") return "1.5";
  return amount;
}

function parseDosageFromLookup(key: string, dosageList: LookupItem[]) {
  const item = dosageList.find((entry) => entry.key === key);
  if (!item) return { dosageAmount: "", dosageUnit: "" };

  const match = item.value.trim().match(/^([0-9/.\u00BC-\u00BE\u2150-\u2189½]+)\s*(.*)$/i);
  if (!match) return { dosageAmount: "", dosageUnit: "" };

  const amount = normalizeDosageAmount(match[1].trim());
  const unitRaw = match[2].trim().toUpperCase();

  let dosageUnit = "TABLET";
  if (unitRaw.includes("CAPSULE") || unitRaw.includes("CAP")) dosageUnit = "CAPSULE";
  else if (unitRaw.includes("ML")) dosageUnit = "ML";
  else if (unitRaw.includes("DROP")) dosageUnit = "DROP";
  else if (unitRaw.includes("SPOON") || unitRaw.includes("TSP")) dosageUnit = "SPOON";
  else if (unitRaw.includes("GM") || unitRaw.includes("GRAM")) dosageUnit = "GM";
  else if (unitRaw.includes("TABLET") || unitRaw.includes("TAB")) dosageUnit = "TABLET";

  return { dosageAmount: amount, dosageUnit };
}

function parseDurationFromLookup(key: string, durationList: LookupItem[]) {
  const item = durationList.find((entry) => entry.key === key);
  if (!item) return { durationAmount: "", durationUnit: "" };

  const match = item.value.trim().match(/^([0-9]+)\s*(.*)$/i);
  if (!match) return { durationAmount: "", durationUnit: "" };

  const durationAmount = match[1].trim();
  const unitRaw = match[2].trim().toUpperCase();

  let durationUnit = "DAY";
  if (unitRaw.includes("WEEK")) durationUnit = "WEEK";
  else if (unitRaw.includes("MONTH")) durationUnit = "MONTH";
  else if (unitRaw.includes("YEAR")) durationUnit = "YEAR";

  return { durationAmount, durationUnit };
}

function findDosageLookupKey(item: PatientMedicineListItem, dosageList: LookupItem[]) {
  const normalizedAmount = item.dosageAmount?.trim() ?? "";
  const normalizedUnit = item.dosageUnit?.trim().toUpperCase() ?? "";

  const match = dosageList.find((entry) => {
    const parsed = parseDosageFromLookup(entry.key, dosageList);
    return (
      parsed.dosageAmount === normalizeDosageAmount(normalizedAmount) &&
      parsed.dosageUnit === normalizedUnit
    );
  });

  return match?.key ?? "";
}

function findDurationLookupKey(item: PatientMedicineListItem, durationList: LookupItem[]) {
  const match = durationList.find((entry) => {
    const parsed = parseDurationFromLookup(entry.key, durationList);
    return (
      parsed.durationAmount === item.durationAmount?.trim() &&
      parsed.durationUnit === item.durationUnit?.trim().toUpperCase()
    );
  });

  return match?.key ?? "";
}

function mapTimingTypeToEditOption(timingType: string | null | undefined) {
  if (!timingType?.trim()) return "";
  if (timingType === "BEFORE_FOOD" || timingType === "AFTER_FOOD") return timingType;

  const upper = timingType.toUpperCase();
  if (upper.includes("BEFORE") || upper.includes("EMPTY")) return "BEFORE_FOOD";
  if (upper.includes("AFTER")) return "AFTER_FOOD";

  return "";
}

function buildEditMedicineInitialValues(
  medicine: PatientMedicineListItem,
  dosageList: LookupItem[],
  durationList: LookupItem[]
): AddMedicineFormValues {
  return {
    medicineId: String(medicine.medicineId),
    dosage: findDosageLookupKey(medicine, dosageList),
    frequency: medicine.frequencyType || "",
    duration: findDurationLookupKey(medicine, durationList),
    route: "Oral",
    timings: [{ value: mapTimingTypeToEditOption(medicine.timingType) }],
    remark: medicine.remark?.trim() ?? "",
  };
}

const editMedicineValidationSchema = addMedicineValidationSchema;

const createChangeMedicineValidationSchema = (currentMedicineId?: number) =>
  addMedicineValidationSchema.shape({
    medicineId: Yup.string()
      .required("Medicine name is required")
      .test("different-medicine", "Please select a different medicine", (value) => {
        if (!value || currentMedicineId == null) return true;
        return Number(value) !== Number(currentMedicineId);
      }),
  });

function buildChangeMedicineInitialValues(
  medicine: PatientMedicineListItem,
  dosageList: LookupItem[],
  durationList: LookupItem[]
): AddMedicineFormValues {
  const editValues = buildEditMedicineInitialValues(medicine, dosageList, durationList);
  return {
    ...editValues,
    medicineId: "",
  };
}

const ADD_MEDICINE_OPTIONS = {
  medicineNames: [...new Set(MEDICINES_LIST.map((m) => m.medicineName))].map((name) => ({
    label: name,
    value: name,
  })),
  dosage: ["5g", "500mg", "30ml", "10mg", "250mg", "10ml", "1 Tablet"].map((value) => ({
    label: value,
    value,
  })),
  frequency: ["Once daily", "Twice daily", "Thrice daily", "Once at night", "Once (morning)"].map(
    (value) => ({ label: value, value })
  ),
  duration: ["7 Days", "10 Days", "14 Days", "15 Days", "21 Days", "30 Days"].map((value) => ({
    label: value,
    value,
  })),
  route: ADD_MEDICINE_ROUTE_OPTIONS,
  timing: [
    "Morning",
    "Evening",
    "Before Meals",
    "After Meals",
    "Morning & Evening",
    "Morning & Night",
    "8:00 PM",
  ].map((value) => ({ label: value, value })),
};

const EDIT_MEDICINE_TIMING_OPTIONS = [
  "After Meals (08:00 AM, 08:00 PM)",
  "Before Meals (06:00 AM, 07:00 PM)",
  "Morning",
  "Evening",
  "Before Meals",
  "After Meals",
  "8:00 PM",
].map((value) => ({ label: value, value }));

function parseMedicineTimingRows(timing: string): { id: number; value: string }[] {
  const presetPairs: Record<string, string[]> = {
    "Morning & Evening": [
      "After Meals (08:00 AM, 08:00 PM)",
      "Before Meals (06:00 AM, 07:00 PM)",
    ],
    "Morning & Night": [
      "After Meals (08:00 AM, 08:00 PM)",
      "Before Meals (06:00 AM, 07:00 PM)",
    ],
  };

  const values = presetPairs[timing] ?? [timing];
  return values.map((value, index) => ({ id: index + 1, value }));
}

const LAB_RESULTS = [
  { id: 1, testName: "CBC", status: "Done", statusTone: "success" as const, report: "Received", reportTone: "success" as const },
  { id: 2, testName: "HbA1c", status: "Done", statusTone: "success" as const, report: "Pending", reportTone: "warning" as const },
  { id: 3, testName: "LFT", status: "Not Done", statusTone: "danger" as const, report: "N/A", reportTone: "neutral" as const },
  { id: 4, testName: "KFT", status: "Done", statusTone: "success" as const, report: "Received", reportTone: "success" as const },
  { id: 5, testName: "Lipid Profile", status: "Done", statusTone: "success" as const, report: "Pending", reportTone: "warning" as const },
];

const DOCTOR_ORDERS = [
  { id: 1, title: "Physiotherapy Consult", meta: "Pending Approval", tone: "warning" as const },
  { id: 2, title: "MRI Lumbar Spine", meta: "Scheduled 04:00 PM", tone: "success" as const },
];

const NURSING_NOTE_CATEGORY_OPTIONS = [
  { label: "Routine", value: "routine" },
  { label: "Urgent", value: "urgent" },
];

const NURSING_NOTE_PAGINATION_OPTIONS = [6, 10, 20, 50];

const LAB_TEST_LIST_PAGINATION_OPTIONS = [6, 10, 20, 50];

type RecentLabResultRow = {
  id: number;
  createdByUserName:string,
  testName: string;
  dateTime: string;
  status: string;
  result: string;
  referenceRange: string;
  reportDate: string;
  admissionDate: string;
};

function formatLabTestDateTime(dateValue: string) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatLabReportDate(dateValue: string | null | undefined) {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function mapLabTestToReportRow(item: LabTestListItem): RecentLabResultRow {
  return {
    id: item.id,
    testName: item.labTest?.testName || "N/A",
    dateTime: formatLabTestDateTime(item.updatedAt),
    status: formatOverviewLabel(item.testStatus),
    result: item.result || "N/A",
    referenceRange: "—",
    createdByUserName:item?.createdByUserName || "",
    reportDate: formatLabReportDate(item.updatedAt),
    admissionDate: formatLabReportDate(item.admissionDate),
  };
}

type LabRequestPatient = {
  id: number;
  patientTitle: string;
  patientName: string;
  patientUhid: string;
  patientType: string;
  age: string;
};

const LAB_REQUEST_PATIENTS: LabRequestPatient[] = [
  {
    id: 1,
    patientTitle: "Mr",
    patientName: "Arjun Singh",
    patientUhid: "JSKL47172025",
    patientType: "VATA-PITTA",
    age: "45Y",
  },
  {
    id: 2,
    patientTitle: "Mr",
    patientName: "Sita Devi",
    patientUhid: "JSDK11223344",
    patientType: "PITTA-KAPHA",
    age: "42Y",
  },
];

const LAB_TEST_LISTING_PAGINATION_OPTIONS = [6, 10, 20, 50];

function LabSummaryCard({
  label,
  value,
  iconSrc,
  className = "",
}: {
  label: string;
  value: string | number;
  iconSrc: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-[20px] border border-[#E3EEE1] bg-white px-5 py-4 shadow-[0px_20px_40px_rgba(34,56,43,0.06)] ${className}`}
    >
      <div>
        <p className="text-sm font-medium text-[#434956]">{label}</p>
        <p className="mt-2 text-[32px] font-bold leading-none text-[#262D3B]">{value}</p>
      </div>
      <Image src={iconSrc} alt="" width={28} height={28} />
    </div>
  );
}

function SectionCard({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)] ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-[#262D3B]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const classes =
    tone === "danger"
      ? "border-[#93000A3D] text-[#93000A] bg-white"
      : tone === "warning"
        ? "border-[#B4530933] text-[#B45309] bg-white"
        : tone === "success"
          ? "border-[#0B8C0033] text-[#0B8C00] bg-white"
          : "border-[#CBD5E1] text-[#64748B] bg-[#F8FAFC]";

  return (
    <span
      className={`inline-block shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

// console.log(formattedDateTime);
// Example: Jul 16, 2026 | 12:30 PM

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

function NewLabRequestScreen({
  onClose,
  onSuccess,
  patient,
  branchId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  patient: AssignedPatientDetail;
  branchId: number | null| undefined ;
}) {
  const patientOptions: LabRequestPatient[] = [
    {
      id: patient.id,
      patientTitle: patient.patientTitle,
      patientName: patient.patientName,
      patientUhid: patient.patientUhid,
      patientType: patient.patientType ?? "",
      age: patient.age,
    },
    ...LAB_REQUEST_PATIENTS.filter((p) => p.id !== patient.id),
  ];

  const [selectedPatientId, setSelectedPatientId] = useState(patientOptions[0]?.id ?? 1);
  const [labCategory, setLabCategory] = useState("all");
  const [labTestListingFilters, setLabTestListingFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
  });
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
  const [labTestDialogMessage, setLabTestDialogMessage] = useState("");
  const [showLabTestSuccessDialog, setShowLabTestSuccessDialog] = useState(false);
  const [showLabTestErrorDialog, setShowLabTestErrorDialog] = useState(false);

  const [createLabTest, { isLoading: isCreatingLabTest }] = useCreateLabTestMutation();

  const { data: labCategoriesRes } = useGetDistinctLabTestCategoriesQuery();

  const labCategoryOptions = useMemo(() => {
    const categories = labCategoriesRes?.data ?? [];

    return [
      { label: "All Categories", value: "all" },
      ...categories.map((category) => ({
        label: category,
        value: category,
      })),
    ];
  }, [labCategoriesRes?.data]);

  const selectedPatient = useMemo(
    () => patientOptions.find((p) => p.id === selectedPatientId) ?? patientOptions[0],
    [patientOptions, selectedPatientId]
  );

  const {
    data: labTestListingRes,
    isLoading: isLabTestListingLoading,
  } = useGetLabTestListingQuery(
    {
      page: labTestListingFilters.page,
      limit: labTestListingFilters.limit,
      search: labTestListingFilters.search.trim() || undefined,
      categoryName: labCategory === "all" ? undefined : labCategory,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const labTestListing = labTestListingRes?.data ?? [];
  const labTestListingTotal = Number(labTestListingRes?.total ?? 0);

  const toggleTest = (testId: number) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const selectedCount = selectedTestIds.length;

  const handleSubmitLabRequest = async () => {
    if (selectedCount === 0) return;

    if (branchId == null) {
      setLabTestDialogMessage("Please select a branch before submitting the lab request.");
      setShowLabTestErrorDialog(true);
      return;
    }

    try {
      const result = await createLabTest({
        patientId: selectedPatientId,
        branchId,
        labTestIds: selectedTestIds,
      }).unwrap();

      setLabTestDialogMessage(result.message || "Lab test created successfully");
      setShowLabTestSuccessDialog(true);
      setSelectedTestIds([]);
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : "Failed to create lab test. Please try again.";

      setLabTestDialogMessage(message || "Failed to create lab test. Please try again.");
      setShowLabTestErrorDialog(true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px]">
          New Lab Request
        </h1>

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#F2F8F2]"
          aria-label="Close"
        >
          <Image src="/icons/CrossIcon.svg" alt="Close" width={18} height={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <h3 className="text-sm font-medium text-[#262D3B]">Patient Selection</h3>

            <div className="mt-4">
              <Tooltip
                position="top"
                content={
                  <span className="max-w-xs whitespace-normal break-words">
                    {[selectedPatient?.patientTitle, selectedPatient?.patientName]
                      .filter(Boolean)
                      .join(" ") || "N/A"}
                  </span>
                 }
              >
                <div className="w-full">
                  <FormSelectField
                    label="Patient Name"
                    width="100%"
                    disabled
                    
                    value={String(selectedPatientId)}
                    options={patientOptions.map((p) => ({
                      // label: p.patientName,
                    label: `${p.patientTitle ? `${p.patientTitle} ` : ""}${p.patientName || ""}`,
                    value: String(p.id),
                    }))}
                    onChange={(value) => {
                      const next = Number(value);
                      if (!Number.isNaN(next)) setSelectedPatientId(next);
                    }}
                    className="!bg-[#F2F4F7]"
                  />
                </div>
              </Tooltip>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <h3 className="text-sm font-medium text-[#262D3B]">Patient Details</h3>

            {/* <div className="mt-4 overflow-hidden rounded-xl border-l-4 border-l-[#0B8C00] bg-[#0B8C000D] px-5 py-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient Name</p>
                  <Tooltip
                    position="top"
                    content={
                      <span className="max-w-xs whitespace-normal break-words">
                     
                           {[selectedPatient?.patientTitle, selectedPatient?.patientName].filter(Boolean).join(" ") || "N/A"}
                      </span>
                    }
                  >
                    <p className="mt-1.5 cursor-default truncate text-sm font-semibold text-[#262D3B]">
                      {[selectedPatient?.patientTitle, selectedPatient?.patientName].filter(Boolean).join(" ") || "N/A"}
                    </p>
                  </Tooltip>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient UHID</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-[#262D3B]">
                    {selectedPatient.patientUhid}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient Type</p>
                  <div className="mt-1.5">
                    <span className="inline-flex rounded-full border uppercase border-[#E3EEE1] bg-white px-3 py-1 text-xs font-medium text-[#0B8C00]">
                      {selectedPatient.patientType}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Age</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-[#262D3B]">
                    {selectedPatient.age}
                  </p>
                </div>
     
              </div>
            </div> */}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-4 overflow-hidden rounded-xl border-l-4 border-l-[#0B8C00] bg-[#0B8C000D] px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#7B8089]">Patient Name</p>
                <Tooltip
                  position="top"
                  content={
                    <span className="max-w-xs whitespace-normal break-words">
                      {[selectedPatient?.patientTitle, selectedPatient?.patientName]
                        .filter(Boolean)
                        .join(" ") || "N/A"}
                    </span>
                  }
                >
                  <p className="mt-1.5 cursor-default truncate text-sm font-semibold text-[#262D3B]">
                    {[selectedPatient?.patientTitle, selectedPatient?.patientName]
                      .filter(Boolean)
                      .join(" ") || "N/A"}
                  </p>
                </Tooltip>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#7B8089]">Patient UHID</p>
                <p className="mt-1.5 truncate text-sm font-semibold text-[#262D3B]">
                  {selectedPatient.patientUhid}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#7B8089]">Patient Type</p>
                <div className="mt-1.5">
                  <span className="inline-flex rounded-full border border-[#E3EEE1] bg-white px-3 py-1 text-xs font-medium uppercase text-[#0B8C00]">
                    {selectedPatient.patientType}
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#7B8089]">Age</p>
                <p className="mt-1.5 truncate text-sm font-semibold text-[#262D3B]">
                  {selectedPatient.age}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          <h3 className="text-sm font-medium text-[#262D3B]">Form</h3>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormSelectField
              label="Lab Category"
              width="100%"
              value={labCategory}
              options={labCategoryOptions}
              onChange={(value) => {
                setLabCategory(String(value));
                setLabTestListingFilters((prev) => ({ ...prev, page: 1 }));
              }}
            />

            <FormInputField
              label="Search Specific Test"
              width="100%"
              value={labTestListingFilters.search}
              placeholder="e.g. CBC, HbA1c..."
              onChange={(e) =>
                setLabTestListingFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                  page: 1,
                }))
              }
              className="!bg-[#0B8C00]/5"
            />
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-medium text-[#262D3B]">Select Tests</h4>
              <p className="text-xs font-medium text-[#7B8089]">
                {selectedCount === 1
                  ? "1 Test Selected"
                  : `${selectedCount} Tests Selected`}
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead position="first">Sr no.</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLabTestListingLoading ? (
                  <TableRow className="bg-white">
                    <TableData colSpan={3}>
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                        <SpinnerLoader size={18} />
                        Loading lab tests...
                      </div>
                    </TableData>
                  </TableRow>
                ) : labTestListing.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableData colSpan={3}>
                      <p className="py-10 text-center text-sm text-[#9CA3AF]">No lab tests found.</p>
                    </TableData>
                  </TableRow>
                ) : (
                  labTestListing.map((test, index) => {
                    const serialNumber =
                      (labTestListingFilters.page - 1) * labTestListingFilters.limit + index + 1;
                    const testNameLabel = [test.name, test.category].filter(Boolean).join(" - ");

                    return (
                      <TableRow
                        key={test.id}
                        className="bg-white transition-colors hover:bg-[#F7FAF7]"
                      >
                        <TableData variant="primary">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedTestIds.includes(test.id)}
                              onChange={() => toggleTest(test.id)}
                              className="h-4 w-4 rounded border-[#D1D5DB] accent-[#0B8C00]"
                              aria-label={`Select ${testNameLabel}`}
                            />
                            <span>{String(serialNumber).padStart(2, "0")}</span>
                          </div>
                        </TableData>
                        <TableData>{testNameLabel || "N/A"}</TableData>
                        <TableData>{test.description || "N/A"}</TableData>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {!isLabTestListingLoading && labTestListing.length > 0 ? (
              <div className="mt-4 border-t border-[#EDF3EA] pt-4">
                <Pagination
                  currentPage={labTestListingFilters.page}
                  totalItems={labTestListingTotal > 0 ? labTestListingTotal : labTestListing.length}
                  itemsPerPage={labTestListingFilters.limit}
                  itemsPerPageOptions={LAB_TEST_LISTING_PAGINATION_OPTIONS}
                  onPageChange={(page) =>
                    setLabTestListingFilters((prev) => ({ ...prev, page }))
                  }
                  onItemsPerPageChange={(limit) =>
                    setLabTestListingFilters((prev) => ({ ...prev, limit, page: 1 }))
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* <Button
              variant="outline"
              size="small"
              className="!min-w-0 whitespace-nowrap"
              onClick={onClose}
            >
              Save Draft
            </Button> */}

            <div className="flex w-full flex-col-reverse items-stretch gap-3 sm:flex-row sm:justify-end sm:items-center">
              {/* <BackToPreviousPageButton
                className="h-9"
                onClick={onClose}
                text="Back"
              /> */}

               <button
                type="button"
                onClick={onClose}
                className={`flex h-9 items-center justify-center gap-2 px-6 rounded-[32px] border border-[#9A7909] text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
               <Image src="/icons/LeftArrowIcon.svg" alt="Back" width={20} height={20} className="shrink-0" />
                Back
              </button>
              <Button
                variant="primary"
                size="small"
                className="!min-w-0 whitespace-nowrap"
                disabled={selectedCount === 0 || isCreatingLabTest}
                onClick={() => void handleSubmitLabRequest()}
              >
                {isCreatingLabTest ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <MessageDialog
        open={showLabTestSuccessDialog}
        onClose={() => {
          setShowLabTestSuccessDialog(false);
          onSuccess();
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={labTestDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowLabTestSuccessDialog(false);
          onSuccess();
        }}
      />

      <MessageDialog
        open={showLabTestErrorDialog}
        onClose={() => setShowLabTestErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={labTestDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowLabTestErrorDialog(false)}
      />
    </div>
  );
}

type TherapyScheduleTone = "success" | "warning" | "danger" | "neutral";

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

/** Field set aligned with `vitals.tsx` `buildVitalsTabCards`. */
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
      ...cardMeta(
        vitals?.sugarLevel,
        vitals?.sugarLevel ? `${vitals.sugarLevel}mg/dL` : "N/A"
      ),
    },
    {
      id: 7,
      label: "Pain",
      ...cardMeta(
        vitals?.painScale,
        vitals?.painScale ? `${vitals.painScale}/10` : "N/A"
      ),
    },
  ];
}

// vital dialogbox
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
    return (
      items.find((item) => String(item.type ?? "").toLowerCase() === phase) ?? null
    );
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
      // className="w-full max-w-[270px] rounded-[10px] border px-3 py-3 shadow-[0px_1px_2px_rgba(15,23,42,0.04)]"
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
        <TherapyScheduleStatusBadge
          label={card.statusLabel}
          tone={card.tone}
          onViewVitals={onViewVitals}
        />
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

function EditMedicineDialog({
  open,
  onClose,
  medicine,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  medicine: PatientMedicineListItem | null;
  onSuccess?: () => void;
}) {
  const dosageList = useAppSelector(selectDosageList);
  const frequencyList = useAppSelector(selectFrequencyList);
  const durationList = useAppSelector(selectDurationList);

  const [dialogMessage, setDialogMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const [editPatientMedicine, { isLoading: isEditingPatientMedicine }] = useEditPatientMedicineMutation();

  const dosageOptions = useMemo(() => toLookupSelectOptions(dosageList), [dosageList]);
  const frequencyOptions = useMemo(() => toLookupSelectOptions(frequencyList), [frequencyList]);
  const durationOptions = useMemo(() => toLookupSelectOptions(durationList), [durationList]);
  const timingOptions = ADD_MEDICINE_TIMING_OPTIONS;

  const medicineOptions = useMemo(
    () =>
      medicine
        ? [{ label: medicine.medicineName, value: String(medicine.medicineId) }]
        : [],
    [medicine]
  );

  const formik = useFormik<AddMedicineFormValues>({
    enableReinitialize: true,
    initialValues: medicine
      ? buildEditMedicineInitialValues(medicine, dosageList, durationList)
      : {
          medicineId: "",
          dosage: "",
          frequency: "",
          duration: "",
          route: "",
          timings: [{ value: "" }],
          remark: "",
        },
    validationSchema: editMedicineValidationSchema,
    onSubmit: async (values) => {
      if (!medicine) return;

      const { dosageAmount, dosageUnit } = parseDosageFromLookup(values.dosage, dosageList);
      const { durationAmount, durationUnit } = parseDurationFromLookup(values.duration, durationList);
      const primaryTiming = values.timings[0]?.value ?? "";

      if (!dosageAmount || !dosageUnit || !durationAmount || !durationUnit || !primaryTiming) {
        setDialogMessage("Please review dosage, duration, and timing selections.");
        setShowErrorDialog(true);
        return;
      }

      try {
        const result = await editPatientMedicine({
          patientMedicineId: medicine.id,
          body: {
            medicineId: Number(values.medicineId),
            dosageAmount,
            dosageUnit,
            durationAmount,
            durationUnit,
            frequencyType: values.frequency,
            timingType: primaryTiming,
            remark: values.remark.trim(),
          },
        }).unwrap();

        setDialogMessage(result.message || "Medicine updated successfully");
        setShowSuccessDialog(true);
        onSuccess?.();
      } catch (error) {
        const message =
          error && typeof error === "object" && "data" in error
            ? (error as { data?: { message?: string } }).data?.message
            : "Failed to update medicine. Please try again.";

        setDialogMessage(message || "Failed to update medicine. Please try again.");
        setShowErrorDialog(true);
      }
    },
  });

  useEffect(() => {
    if (!open) return;

    setShowSuccessDialog(false);
    setShowErrorDialog(false);
    setDialogMessage("");
  }, [open]);

  const handleSendForApproval = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(setNestedObjectValues(errors, true));
      return;
    }

    formik.submitForm();
  };

  const fieldError = (field: keyof AddMedicineFormValues) =>
    formik.touched[field] && formik.errors[field] ? String(formik.errors[field]) : undefined;

  const timingError = (index: number) => {
    const touchedRow = Array.isArray(formik.touched.timings) ? formik.touched.timings[index] : undefined;
    const errorRow = Array.isArray(formik.errors.timings) ? formik.errors.timings[index] : undefined;

    if (!touchedRow?.value || !errorRow || typeof errorRow !== "object") return undefined;
    return "value" in errorRow && errorRow.value ? String(errorRow.value) : undefined;
  };

  const addTimingRow = () => {
    void formik.setFieldValue("timings", [...formik.values.timings, { value: "" }]);
  };

  const removeTimingRow = (index: number) => {
    if (formik.values.timings.length <= 1) return;
    void formik.setFieldValue(
      "timings",
      formik.values.timings.filter((_, rowIndex) => rowIndex !== index)
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Edit Medicine" width={720} contentPadding="px-6 pb-6 pt-4">
        <form onSubmit={formik.handleSubmit} noValidate className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelectField
              label="Medicine Name"
              width="100%"
              // background="#EBEBE4"
              value={formik.values.medicineId}
              options={medicineOptions}
              onChange={() => {}}
              onBlur={() => formik.setFieldTouched("medicineId", true)}
              placeholder="Select"
              disabled={true}
              error={fieldError("medicineId")}
            />
            <FormSelectField
              label="Dosage"
              width="100%"
              background="white"
              value={formik.values.dosage}
              options={dosageOptions}
              onChange={(value) => formik.setFieldValue("dosage", String(value))}
              onBlur={() => formik.setFieldTouched("dosage", true)}
              placeholder="Select"
              error={fieldError("dosage")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelectField
              label="Frequency"
              width="100%"
              background="white"
              value={formik.values.frequency}
              options={frequencyOptions}
              onChange={(value) => formik.setFieldValue("frequency", String(value))}
              onBlur={() => formik.setFieldTouched("frequency", true)}
              placeholder="Select"
              error={fieldError("frequency")}
            />
            <FormSelectField
              label="Duration"
              width="100%"
              background="white"
              value={formik.values.duration}
              options={durationOptions}
              onChange={(value) => formik.setFieldValue("duration", String(value))}
              onBlur={() => formik.setFieldTouched("duration", true)}
              placeholder="Duration"
              error={fieldError("duration")}
            />
          </div>

          <FormSelectField
            label="Route"
            width="100%"
            background="white"
            value={formik.values.route}
            options={ADD_MEDICINE_ROUTE_OPTIONS}
            onChange={(value) => formik.setFieldValue("route", String(value))}
            onBlur={() => formik.setFieldTouched("route", true)}
            placeholder="Select"
            error={fieldError("route")}
          />

          <div className="space-y-3">
            <p className="text-sm font-medium text-[#262D3B]">Timing</p>
            {formik.values.timings.map((row, index) => (
              <div key={`edit-timing-row-${index}`} className="flex items-center gap-3">
                <div className="flex-1">
                  <FormSelectField
                    label="Timing"
                    hideLabel
                    width="100%"
                    background="white"
                    value={row.value}
                    options={timingOptions}
                    onChange={(value) => formik.setFieldValue(`timings.${index}.value`, String(value))}
                    onBlur={() => formik.setFieldTouched(`timings.${index}.value`, true)}
                    placeholder="Select"
                    error={timingError(index)}
                  />
                </div>
                {/* {index === 0 ? (
                  <button
                    type="button"
                    onClick={addTimingRow}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B8C00] transition-colors hover:bg-[#097300]"
                    aria-label="Add timing"
                  >
                    <Image
                      src="/icons/AddIcon.svg"
                      alt="Add timing"
                      width={16}
                      height={16}
                      className="brightness-0 invert"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeTimingRow(index)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F28B82] transition-colors hover:bg-[#e87a70]"
                    aria-label="Remove timing"
                  >
                    <Image
                      src="/icons/TrashRedIcon.svg"
                      alt="Remove timing"
                      width={16}
                      height={16}
                      className="brightness-0 invert"
                    />
                  </button>
                )} */}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="small"
              disabled={isEditingPatientMedicine || formik.isSubmitting}
              onClick={() => void handleSendForApproval()}
            >
              {isEditingPatientMedicine || formik.isSubmitting ? "Submitting..." : "Send for Approval"}
            </Button>
            <Button type="button" variant="outline" size="small" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={dialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
      />

      <MessageDialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={dialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowErrorDialog(false)}
      />
    </>
  );
}

function ChangeMedicineDialog({
  open,
  onClose,
  medicine,
  branchId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  medicine: PatientMedicineListItem | null;
  branchId: number | null | undefined;
  onSuccess?: () => void;
}) {
  const dosageList = useAppSelector(selectDosageList);
  const frequencyList = useAppSelector(selectFrequencyList);
  const durationList = useAppSelector(selectDurationList);

  const [dialogMessage, setDialogMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const [replacePatientMedicine, { isLoading: isReplacingPatientMedicine }] =
    useReplacePatientMedicineMutation();

  const {
    data: medicinesData,
    isLoading: isMedicineListLoading,
  } = useGetAllMedicineByBranchListQuery(
    { branchId: branchId ?? 0 },
    { skip: !open || branchId == null, refetchOnMountOrArgChange: true }
  );

  const medicineOptions = useMemo(
    () =>
      (medicinesData?.data ?? [])
        .filter((item) => item.isActive)
        .map((item) => ({ label: item.name, value: String(item.id) })),
    [medicinesData?.data]
  );

  const dosageOptions = useMemo(() => toLookupSelectOptions(dosageList), [dosageList]);
  const frequencyOptions = useMemo(() => toLookupSelectOptions(frequencyList), [frequencyList]);
  const durationOptions = useMemo(() => toLookupSelectOptions(durationList), [durationList]);
  const timingOptions = ADD_MEDICINE_TIMING_OPTIONS;

  const changeMedicineValidationSchema = useMemo(
    () => createChangeMedicineValidationSchema(medicine?.medicineId),
    [medicine?.medicineId]
  );

  const formik = useFormik<AddMedicineFormValues>({
    enableReinitialize: true,
    initialValues: medicine
      ? buildChangeMedicineInitialValues(medicine, dosageList, durationList)
      : {
          medicineId: "",
          dosage: "",
          frequency: "",
          duration: "",
          route: "",
          timings: [{ value: "" }],
          remark: "",
        },
    validationSchema: changeMedicineValidationSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values) => {
      if (!medicine) return;

      const { dosageAmount, dosageUnit } = parseDosageFromLookup(values.dosage, dosageList);
      const { durationAmount, durationUnit } = parseDurationFromLookup(values.duration, durationList);
      const primaryTiming = values.timings[0]?.value ?? "";

      if (!dosageAmount || !dosageUnit || !durationAmount || !durationUnit || !primaryTiming) {
        setDialogMessage("Please review dosage, duration, and timing selections.");
        setShowErrorDialog(true);
        return;
      }

      try {
        const result = await replacePatientMedicine({
          patientMedicineId: medicine.id,
          body: {
            newMedicineId: Number(values.medicineId),
          },
        }).unwrap();

        setDialogMessage(result.message || "Medicine replaced successfully");
        setShowSuccessDialog(true);
        onSuccess?.();
      } catch (error) {
        const message =
          error && typeof error === "object" && "data" in error
            ? (error as { data?: { message?: string } }).data?.message
            : "Failed to replace medicine. Please try again.";

        setDialogMessage(message || "Failed to replace medicine. Please try again.");
        setShowErrorDialog(true);
      }
    },
  });

  useEffect(() => {
    if (!open) return;

    void formik.resetForm({
      values: medicine
        ? buildChangeMedicineInitialValues(medicine, dosageList, durationList)
        : {
            medicineId: "",
            dosage: "",
            frequency: "",
            duration: "",
            route: "",
            timings: [{ value: "" }],
            remark: "",
          },
      touched: {},
      errors: {},
    });
    setShowSuccessDialog(false);
    setShowErrorDialog(false);
    setDialogMessage("");
  }, [open, medicine?.id, dosageList, durationList]);

  const handleSendForApproval = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(setNestedObjectValues(errors, true));
      return;
    }

    formik.submitForm();
  };

  const addTimingRow = () => {
    formik.setFieldValue("timings", [...formik.values.timings, { value: "" }]);
  };

  const removeTimingRow = (index: number) => {
    if (formik.values.timings.length <= 1) return;
    formik.setFieldValue(
      "timings",
      formik.values.timings.filter((_, rowIndex) => rowIndex !== index)
    );
  };

  const fieldError = (field: keyof AddMedicineFormValues) =>
    formik.touched[field] && formik.errors[field] ? String(formik.errors[field]) : undefined;

  const timingError = (index: number) => {
    const touchedRow = Array.isArray(formik.touched.timings) ? formik.touched.timings[index] : undefined;
    const errorRow = Array.isArray(formik.errors.timings) ? formik.errors.timings[index] : undefined;

    if (!touchedRow?.value || !errorRow || typeof errorRow !== "object") return undefined;
    return "value" in errorRow && errorRow.value ? String(errorRow.value) : undefined;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Change Medicine" width={720} contentPadding="px-6 pb-6 pt-4">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSendForApproval();
          }}
          className="space-y-5"
        >
          <div>
            <p className="text-xs text-[#9FA2AB]">Current Medicine</p>
            <p className="mt-1 text-base font-semibold text-[#262D3B]">
              {medicine?.medicineName ?? "—"}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-[#9FA2AB]">Change to</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelectField
                label="Medicine Name"
                width="100%"
                background="white"
                value={formik.values.medicineId}
                options={medicineOptions}
                onChange={(value) => formik.setFieldValue("medicineId", String(value))}
                onBlur={() => formik.setFieldTouched("medicineId", true)}
                placeholder={isMedicineListLoading ? "Loading medicines..." : "Select"}
                disabled={isMedicineListLoading}
                error={fieldError("medicineId")}
              />
              <FormSelectField
                label="Dosage"
                width="100%"
                disabled
                background="white"
                value={formik.values.dosage}
                options={dosageOptions}
                onChange={(value) => formik.setFieldValue("dosage", String(value))}
                onBlur={() => formik.setFieldTouched("dosage", true)}
                placeholder="Select"
                error={fieldError("dosage")}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelectField
                label="Frequency"
                width="100%"
                disabled
                background="white"
                value={formik.values.frequency}
                options={frequencyOptions}
                onChange={(value) => formik.setFieldValue("frequency", String(value))}
                onBlur={() => formik.setFieldTouched("frequency", true)}
                placeholder="Select"
                error={fieldError("frequency")}
              />
              <FormSelectField
                label="Duration"
                width="100%"
                disabled
                background="white"
                value={formik.values.duration}
                options={durationOptions}
                onChange={(value) => formik.setFieldValue("duration", String(value))}
                onBlur={() => formik.setFieldTouched("duration", true)}
                placeholder="Duration"
                error={fieldError("duration")}
              />
            </div>

            <FormSelectField
              label="Route"
              width="100%"
              disabled
              background="white"
              value={formik.values.route}
              options={ADD_MEDICINE_ROUTE_OPTIONS}
              onChange={(value) => formik.setFieldValue("route", String(value))}
              onBlur={() => formik.setFieldTouched("route", true)}
              placeholder="Select"
              error={fieldError("route")}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-[#262D3B]">Timing</p>
            {formik.values.timings.map((row, index) => (
              <div key={`change-timing-row-${index}`} className="flex items-center gap-3">
                <div className="flex-1">
                  <FormSelectField
                    label="Timing"
                    hideLabel
                    width="100%"
                    disabled
                    background="white"
                    value={row.value}
                    options={timingOptions}
                    onChange={(value) => formik.setFieldValue(`timings.${index}.value`, String(value))}
                    onBlur={() => formik.setFieldTouched(`timings.${index}.value`, true)}
                    placeholder="Select"
                    error={timingError(index)}
                  />
                </div>
                {/* {index === 0 ? (
                  <button
                    type="button"
                    onClick={addTimingRow}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B8C00] transition-colors hover:bg-[#097300]"
                    aria-label="Add timing"
                  >
                    <Image
                      src="/icons/AddIcon.svg"
                      alt="Add timing"
                      width={16}
                      height={16}
                      className="brightness-0 invert"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeTimingRow(index)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F28B82] transition-colors hover:bg-[#e87a70]"
                    aria-label="Remove timing"
                  >
                    <Image
                      src="/icons/TrashRedIcon.svg"
                      alt="Remove timing"
                      width={16}
                      height={16}
                      className="brightness-0 invert"
                    />
                  </button>
                )} */}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="small"
              disabled={isReplacingPatientMedicine || formik.isSubmitting}
              onClick={() => void handleSendForApproval()}
            >
              {isReplacingPatientMedicine || formik.isSubmitting ? "Submitting..." : "Send for Approval"}
            </Button>
            <Button type="button" variant="outline" size="small" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={dialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
      />

      <MessageDialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={dialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowErrorDialog(false)}
      />
    </>
  );
}

function AddMedicineDialog({
  open,
  onClose,
  patientId,
  branchId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  patientId: number;
  branchId: number | null | undefined;
  onSuccess?: () => void;
}) {
  const dosageList = useAppSelector(selectDosageList);
  const frequencyList = useAppSelector(selectFrequencyList);
  const durationList = useAppSelector(selectDurationList);

  const [dialogMessage, setDialogMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const [addPatientMedicine, { isLoading: isAddingPatientMedicine }] = useAddPatientMedicineMutation();

  const {
    data: medicinesData,
    isLoading: isMedicineListLoading,
  } = useGetAllMedicineByBranchListQuery(
    { branchId: branchId ?? 0 },
    { skip: !open || branchId == null, refetchOnMountOrArgChange: true }
  );

  const medicineOptions = useMemo(
    () =>
      (medicinesData?.data ?? [])
        .filter((medicine) => medicine.isActive)
        .map((medicine) => ({ label: medicine.name, value: String(medicine.id) })),
    [medicinesData?.data]
  );

  const dosageOptions = useMemo(() => toLookupSelectOptions(dosageList), [dosageList]);
  const frequencyOptions = useMemo(() => toLookupSelectOptions(frequencyList), [frequencyList]);
  const durationOptions = useMemo(() => toLookupSelectOptions(durationList), [durationList]);
  const timingOptions = ADD_MEDICINE_TIMING_OPTIONS;

  const formik = useFormik<AddMedicineFormValues>({
    initialValues: {
      medicineId: "",
      dosage: "",
      frequency: "",
      duration: "",
      route: "",
      timings: [{ value: "" }],
      remark: "",
    },
    validationSchema: addMedicineValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      if (branchId == null) {
        setDialogMessage("Please select a branch before adding medicine.");
        setShowErrorDialog(true);
        return;
      }

      const { dosageAmount, dosageUnit } = parseDosageFromLookup(values.dosage, dosageList);
      const { durationAmount, durationUnit } = parseDurationFromLookup(values.duration, durationList);
      const primaryTiming = values.timings[0]?.value ?? "";

      if (!dosageAmount || !dosageUnit || !durationAmount || !durationUnit || !primaryTiming) {
        setDialogMessage("Please review dosage, duration, and timing selections.");
        setShowErrorDialog(true);
        return;
      }

      try {
        const result = await addPatientMedicine({
          patientId,
          medicineId: Number(values.medicineId),
          dosageAmount,
          dosageUnit,
          durationAmount,
          durationUnit,
          frequencyType: values.frequency,
          timingType: primaryTiming,
          remark: values.remark.trim(),
        }).unwrap();

        setDialogMessage(result.message || "Medicine added successfully");
        setShowSuccessDialog(true);
        resetForm();
        onSuccess?.();
      } catch (error) {
        const message =
          error && typeof error === "object" && "data" in error
            ? (error as { data?: { message?: string } }).data?.message
            : "Failed to add medicine. Please try again.";

        setDialogMessage(message || "Failed to add medicine. Please try again.");
        setShowErrorDialog(true);
      }
    },
  });

  useEffect(() => {
    if (!open) return;

    formik.resetForm();
    setShowSuccessDialog(false);
    setShowErrorDialog(false);
    setDialogMessage("");
  }, [open]);

  const handleSendForApproval = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(setNestedObjectValues(errors, true));
      return;
    }

    formik.submitForm();
  };

  const addTimingRow = () => {
    formik.setFieldValue("timings", [...formik.values.timings, { value: "" }]);
  };

  const removeTimingRow = (index: number) => {
    if (formik.values.timings.length <= 1) return;
    formik.setFieldValue(
      "timings",
      formik.values.timings.filter((_, rowIndex) => rowIndex !== index)
    );
  };

  const fieldError = (field: keyof AddMedicineFormValues) =>
    formik.touched[field] && formik.errors[field] ? String(formik.errors[field]) : undefined;

  const timingError = (index: number) => {
    const touchedRow = Array.isArray(formik.touched.timings) ? formik.touched.timings[index] : undefined;
    const errorRow = Array.isArray(formik.errors.timings) ? formik.errors.timings[index] : undefined;

    if (!touchedRow?.value || !errorRow || typeof errorRow !== "object") return undefined;
    return "value" in errorRow && errorRow.value ? String(errorRow.value) : undefined;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Add Medicine" width={720} contentPadding="px-6 pb-6 pt-4">
        <form onSubmit={formik.handleSubmit} noValidate className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelectField
              label="Medicine Name"
              width="100%"
              background="white"
              value={formik.values.medicineId}
              options={medicineOptions}
              onChange={(value) => formik.setFieldValue("medicineId", String(value))}
              onBlur={() => formik.setFieldTouched("medicineId", true)}
              placeholder={isMedicineListLoading ? "Loading medicines..." : "Select"}
              disabled={isMedicineListLoading}
              error={fieldError("medicineId")}
            />
            <FormSelectField
              label="Dosage"
              width="100%"
              background="white"
              value={formik.values.dosage}
              options={dosageOptions}
              onChange={(value) => formik.setFieldValue("dosage", String(value))}
              onBlur={() => formik.setFieldTouched("dosage", true)}
              placeholder="Select"
              error={fieldError("dosage")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelectField
              label="Frequency"
              width="100%"
              background="white"
              value={formik.values.frequency}
              options={frequencyOptions}
              onChange={(value) => formik.setFieldValue("frequency", String(value))}
              onBlur={() => formik.setFieldTouched("frequency", true)}
              placeholder="Select"
              error={fieldError("frequency")}
            />
            <FormSelectField
              label="Duration"
              width="100%"
              background="white"
              value={formik.values.duration}
              options={durationOptions}
              onChange={(value) => formik.setFieldValue("duration", String(value))}
              onBlur={() => formik.setFieldTouched("duration", true)}
              placeholder="Duration"
              error={fieldError("duration")}
            />
          </div>

          <FormSelectField
            label="Route"
            width="100%"
            background="white"
            value={formik.values.route}
            options={ADD_MEDICINE_ROUTE_OPTIONS}
            onChange={(value) => formik.setFieldValue("route", String(value))}
            onBlur={() => formik.setFieldTouched("route", true)}
            placeholder="Select"
            error={fieldError("route")}
          />

          <div className="space-y-3">
            <p className="text-sm font-medium text-[#262D3B]">Timing</p>
            {formik.values.timings.map((row, index) => (
              <div key={`timing-row-${index}`} className="flex items-center gap-3">
                <div className="flex-1">
                  <FormSelectField
                    label="Timing"
                    hideLabel
                    width="100%"
                    background="white"
                    value={row.value}
                    options={timingOptions}
                    onChange={(value) => formik.setFieldValue(`timings.${index}.value`, String(value))}
                    onBlur={() => formik.setFieldTouched(`timings.${index}.value`, true)}
                    placeholder="Select"
                    error={timingError(index)}
                  />
                </div>
                {/* {index === 0 ? (
                  <button
                    type="button"
                    onClick={addTimingRow}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B8C00] transition-colors hover:bg-[#097300]"
                    aria-label="Add timing"
                  >
                    <Image
                      src="/icons/AddIcon.svg"
                      alt="Add timing"
                      width={16}
                      height={16}
                      className="brightness-0 invert"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeTimingRow(index)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F28B82] transition-colors hover:bg-[#e87a70]"
                    aria-label="Remove timing"
                  >
                    <Image
                      src="/icons/TrashRedIcon.svg"
                      alt="Remove timing"
                      width={16}
                      height={16}
                      className="brightness-0 invert"
                    />
                  </button>
                )} */}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="small"
              disabled={isAddingPatientMedicine || formik.isSubmitting}
              onClick={() => void handleSendForApproval()}
            >
              {isAddingPatientMedicine || formik.isSubmitting ? "Submitting..." : "Send for Approval"}
            </Button>
            <Button type="button" variant="outline" size="small" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={dialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
      />

      <MessageDialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={dialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowErrorDialog(false)}
      />
    </>
  );
}

export function AssignedPatientView({ patient, onBack }: AssignedPatientViewProps) {
  const { resolvedFilterBranchId } = useIPDNurseResolvedBranchId();
  const [activeTab, setActiveTab] = useState<PatientTab>("overview");
  const [isNewLabOrderOpen, setIsNewLabOrderOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => formatLocalDate(new Date()));
  const [medicineSchedulePage, setMedicineSchedulePage] = useState(1);
  const [medicineScheduleItemsPerPage, setMedicineScheduleItemsPerPage] = useState(6);

  const [isLabReportOpen, setIsLabReportOpen] = useState(false);
  const [selectedLabReport, setSelectedLabReport] = useState<RecentLabResultRow | null>(null);
  const [isLabReportDownloading, setIsLabReportDownloading] = useState(false);
  const [isTherapyVitalsOpen, setIsTherapyVitalsOpen] = useState(false);
  const [therapyVitalsSessionId, setTherapyVitalsSessionId] = useState<number | null>(null);
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [isEditMedicineOpen, setIsEditMedicineOpen] = useState(false);
  const [selectedPatientMedicine, setSelectedPatientMedicine] = useState<PatientMedicineListItem | null>(null);
  const [isChangeMedicineOpen, setIsChangeMedicineOpen] = useState(false);
  const [selectedChangePatientMedicine, setSelectedChangePatientMedicine] =
    useState<PatientMedicineListItem | null>(null);
  const [pauseMedicineConfirm, setPauseMedicineConfirm] = useState<PatientMedicineListItem | null>(
    null
  );
  const [isPauseMedicineSuccessOpen, setIsPauseMedicineSuccessOpen] = useState(false);
  const [isPauseMedicineErrorOpen, setIsPauseMedicineErrorOpen] = useState(false);
  const [pauseMedicineDialogMessage, setPauseMedicineDialogMessage] = useState("");
  const [stopPatientMedicine, { isLoading: isStoppingPatientMedicine }] =
    useStopPatientMedicineMutation();

  const [therapyScheduleFilters, setTherapyScheduleFilters] = useState(getDefaultTherapyScheduleDateRange);

  const [medicinesSearch, setMedicinesSearch] = useState("");
  const [medicinesCurrentPage, setMedicinesCurrentPage] = useState(1);
  const [medicinesItemsPerPage, setMedicinesItemsPerPage] = useState(6);
  const [medicinesSortBy, setMedicinesSortBy] = useState("medicineName");
  const [medicinesSortOrder, setMedicinesSortOrder] = useState<"ASC" | "DESC">("ASC");

  const [nursingNoteFilters, setNursingNoteFilters] = useState({
    noteAddedBy: "",
    startDate: "",
    endDate: "",
    category: "" as "" | "routine" | "urgent",
    page: 1,
    limit: 10,
  });
  const [expandedNursingNoteIds, setExpandedNursingNoteIds] = useState<number[]>([]);
  const [addNoteCategory, setAddNoteCategory] = useState<string | null>(null);
  const [addNoteMessage, setAddNoteMessage] = useState("");
  const [addNoteErrors, setAddNoteErrors] = useState<{ category?: string; notes?: string }>({});
  const [showNursingNoteSuccessDialog, setShowNursingNoteSuccessDialog] = useState(false);
  const [showNursingNoteErrorDialog, setShowNursingNoteErrorDialog] = useState(false);
  const [nursingNoteDialogMessage, setNursingNoteDialogMessage] = useState("");

  const [createNursingNote, { isLoading: isCreatingNursingNote }] = useCreateNursingNoteMutation();


// currentdatetime(LabtestReport)
const [labtestReportformattedDateTime, setLabtestReportformattedDateTime] = useState("");
const [nurseName, setNurseName] = useState("");
useEffect(() => {
  const updateDateTime = () => {
    const now = new Date();

    const date = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    setLabtestReportformattedDateTime(`${date} | ${time}`);
  };

  updateDateTime();

  const userData = localStorage.getItem("user");
  if (userData) {
    const user = JSON.parse(userData);

    setNurseName(user?.name || "");
  }

  const interval = setInterval(updateDateTime, 60000);

  return () => clearInterval(interval);
}, [isLabReportOpen]);







  const {
    data: labTestSummaryRes,
    isLoading: isLabTestSummaryLoading,
    refetch: refetchLabTestSummary,
  } = useGetLabTestSummaryQuery(
    { branchId: resolvedFilterBranchId!, patientId: patient.id },
    {
      skip: !patient.id || resolvedFilterBranchId == null || activeTab !== "lab-result",
      refetchOnMountOrArgChange: true,
    }
  );

  const labTestSummary = labTestSummaryRes?.data;
  const totalTestsValue = isLabTestSummaryLoading
    ? "..."
    : String(labTestSummary?.totalTests ?? 0);
  const pendingResultsValue = isLabTestSummaryLoading
    ? "..."
    : String(labTestSummary?.pendingResults ?? 0);

      const sendForApproval = isLabTestSummaryLoading
    ? "..."
    : String(labTestSummary?.pendingApprovals ?? 0);

  const [labTestListFilters, setLabTestListFilters] = useState({
    page: 1,
    limit: 10,
  });

  const {
    data: labTestListRes,
    isLoading: isLabTestListLoading,
  } = useGetLabTestListQuery(
    {
      patientId: patient.id,
      page: labTestListFilters.page,
      limit: labTestListFilters.limit,
      status: "completed",
    },
    {
      skip: !patient.id || activeTab !== "lab-result",
      refetchOnMountOrArgChange: true,
      // placeholderData: keepPreviousData,
    }
  );

  const labTestList = labTestListRes?.data ?? [];
  const labTestListTotal = Number(labTestListRes?.total ?? 0);

  const [pendingLabOrdersFilters] = useState({
    page: 1,
    limit: 10,
  });

  const {
    data: pendingLabOrdersRes,
    isLoading: isPendingLabOrdersLoading,
    refetch: refetchPendingLabOrders,
  } = useGetLabTestListQuery(
    {
      patientId: patient.id,
      page: pendingLabOrdersFilters.page,
      limit: pendingLabOrdersFilters.limit,
      isPending: true,
    },
    {
      skip: !patient.id || activeTab !== "lab-result",
      refetchOnMountOrArgChange: true,
    }
  );

  const pendingLabOrders = pendingLabOrdersRes?.data ?? [];

  const {
    data: pendingApprovalLabTestRes,
    isLoading: isPendingApprovalLabTestLoading,
    refetch: refetchPendingApprovalLabTest,
  } = useGetPendingApprovalLabTestListQuery(
    {
      branchId: resolvedFilterBranchId!,
      patientId: patient.id,
    },
    {
      skip: !patient.id || resolvedFilterBranchId == null || activeTab !== "lab-result",
      refetchOnMountOrArgChange: true,
    }
  );

  const pendingApprovalLabTests = pendingApprovalLabTestRes?.data ?? [];

  const {
    data: therapyScheduleRes,
    isLoading: isTherapyScheduleLoading,
  } = useGetAssignedPatientTherapyScheduleQuery(
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
        activeTab !== "therapies" ||
        !therapyScheduleFilters.startDate ||
        !therapyScheduleFilters.endDate,
      refetchOnMountOrArgChange: true,
    }
  );

  const therapyScheduleGrid = useMemo(
    () => buildTherapyScheduleGrid(therapyScheduleRes?.data ?? []),
    [therapyScheduleRes?.data]
  );

  const {
    data: medicineScheduleRes,
    isLoading: isMedicineScheduleLoading,
  } = useGetPatientMedicineScheduleQuery(
    {
      patientId: patient.id,
      date: scheduleDate,
    },
    {
      skip: !patient.id || activeTab !== "overview",
      refetchOnMountOrArgChange: true,
    }
  );

  const {
    data: patientOverviewRes,
    isLoading: isPatientOverviewLoading,
  } = useGetPatientOverviewQuery(patient.id, {
    skip: !patient.id || activeTab !== "overview",
    refetchOnMountOrArgChange: true,
  });

  const {
    data: patientNurseTasksRes,
    isLoading: isPatientNurseTasksLoading,
    refetch: refetchPatientNurseTasks,
  } = useGetPatientNurseTasksQuery(
    { patientId: patient.id },
    {
      skip: !patient.id || activeTab !== "overview",
      refetchOnMountOrArgChange: true,
    }
  );

  const nursingTasks = useMemo(
    () =>
      (patientNurseTasksRes?.data ?? []).map((task) => ({
        id: task.id,
        title: task.taskDescription,
        status: task.status === "completed" ? "Completed" : "Pending",
        completed: task.status === "completed",
      })),
    [patientNurseTasksRes?.data]
  );

  const [updatePatientNurseTaskStatus, { isLoading: isUpdatingNurseTaskStatus }] = useUpdatePatientNurseTaskStatusMutation();
  const [nurseTaskDialogMessage, setNurseTaskDialogMessage] = useState("");
  const [showNurseTaskSuccessDialog, setShowNurseTaskSuccessDialog] = useState(false);
  const [showNurseTaskErrorDialog, setShowNurseTaskErrorDialog] = useState(false);
  const [nurseTaskToggleConfirmId, setNurseTaskToggleConfirmId] = useState<number | null>(null);

  const handleToggleNurseTask = (taskId: number, isCompleted: boolean) => {
    if (isCompleted) {
      setNurseTaskDialogMessage("This task has already been completed.");
      setShowNurseTaskErrorDialog(true);
      return;
    }
    setNurseTaskToggleConfirmId(taskId);
  };

  const closeNurseTaskToggleConfirm = () => {
    setNurseTaskToggleConfirmId(null);
  };

  const handleConfirmToggleNurseTask = async () => {
    if (nurseTaskToggleConfirmId === null) return;

    try {
      const result = await updatePatientNurseTaskStatus({
        taskId: nurseTaskToggleConfirmId,
        status: "completed",
        remark: "",
      }).unwrap();

      setNurseTaskDialogMessage(result?.message || "Task updated successfully");
      setShowNurseTaskSuccessDialog(true);
      void refetchPatientNurseTasks();
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;

      setNurseTaskDialogMessage(message || "Failed to update task. Please try again.");
      setShowNurseTaskErrorDialog(true);
    } finally {
      setNurseTaskToggleConfirmId(null);
    }
  };

  const {
    data: patientMedicineListRes,
    isLoading: isPatientMedicineListLoading,
    refetch: refetchPatientMedicineList,
  } = useGetPatientMedicineListQuery(
    {
      patientId: patient.id,
      page: medicinesCurrentPage,
      limit: medicinesItemsPerPage,
      // medicineStatus: "active",
      search: medicinesSearch.trim(),
      sortBy: medicinesSortBy,
      order: medicinesSortOrder,
    },
    {
      skip: !patient.id || activeTab !== "medicines",
      refetchOnMountOrArgChange: true,
    }
  );

  const medicineScheduleRows = useMemo(
    () => flattenMedicineSchedule(medicineScheduleRes?.data ?? []),
    [medicineScheduleRes?.data]
  );
  const medicineScheduleTotalItems = medicineScheduleRows.length;
  const medicineSchedule = useMemo(() => {
    const start = (medicineSchedulePage - 1) * medicineScheduleItemsPerPage;
    return medicineScheduleRows.slice(start, start + medicineScheduleItemsPerPage);
  }, [medicineScheduleRows, medicineSchedulePage, medicineScheduleItemsPerPage]);
  const isMedicineScheduleTableLoading = isMedicineScheduleLoading;
  const patientOverview = patientOverviewRes?.data;

  const medicalInfoItems = useMemo(
    () =>
      patientOverview?.patientDetails
        ? buildMedicalInfoItems(patientOverview.patientDetails)
        : [],
    [patientOverview?.patientDetails]
  );

  const latestVitalsCards = useMemo(
    () => buildLatestVitalsCards(patientOverview?.latestVitals ?? null),
    [patientOverview?.latestVitals]
  );

  const nursingNotes = patientOverview?.latestNursingNote ?? [];
  const labResults = patientOverview?.labResults ?? [];
  const patientAttendants = patientOverview?.patientAttendant ?? [];
  const vitalsUpdatedLabel = formatVitalsUpdatedAt(patientOverview?.latestVitals?.createdAt);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>("[data-app-shell-scroll]");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [patient.id]);

  useEffect(() => {
    setMedicineSchedulePage(1);
  }, [scheduleDate]);

  const nursingNoteListParams = useMemo(
    () => ({
      patientId: patient.id,
      category: nursingNoteFilters.category || undefined,
      startDate: nursingNoteFilters.startDate || undefined,
      endDate: nursingNoteFilters.endDate || undefined,
      page: nursingNoteFilters.page,
      limit: nursingNoteFilters.limit,
      noteAddedBy: nursingNoteFilters.noteAddedBy.trim() || undefined,
    }),
    [patient.id, nursingNoteFilters]
  );

  const {
    data: nursingNoteListRes,
    isLoading: isNursingNoteListLoading,
    refetch: refetchNursingNoteList,
  } = useGetNursingNoteListQuery(nursingNoteListParams, {
    skip: !patient.id || activeTab !== "nursing-notes",
    refetchOnMountOrArgChange: true,
  });

  const nursingNoteList = nursingNoteListRes?.data ?? [];
  const nursingNoteTotal = nursingNoteListRes?.total ?? 0;

  useEffect(() => {
    if (activeTab !== "nursing-notes") return;
    if (nursingNoteList.length === 0) {
      setExpandedNursingNoteIds([]);
      return;
    }
    setExpandedNursingNoteIds((prev) =>
      prev.length > 0 ? prev.filter((id) => nursingNoteList.some((note) => note.id === id)) : [nursingNoteList[0].id]
    );
  }, [activeTab, nursingNoteList]);

  const toggleNursingNoteExpanded = (noteId: number) => {
    setExpandedNursingNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

  const clearNursingNoteFilters = () => {
    setNursingNoteFilters({
      noteAddedBy: "",
      startDate: "",
      endDate: "",
      category: "",
      page: 1,
      limit: 10,
    });
  };

  const handleAddNursingNote = async () => {
    const errors: { category?: string; notes?: string } = {};

    if (!addNoteCategory) {
      errors.category = "Note category is required";
    }
    // if (!addNoteMessage.trim()) {
    //   errors.notes = "Message is required";
    // }

    if (!addNoteMessage.trim()) {
    errors.notes = "Message is required";
    } else if (addNoteMessage.trim().length > 1000) {
      errors.notes = "Maximum 1000 characters allowed";
    }


    if (Object.keys(errors).length > 0) {
      setAddNoteErrors(errors);
      return;
    }

    if (resolvedFilterBranchId == null) {
      setNursingNoteDialogMessage("Please select a branch before adding a note.");
      setShowNursingNoteErrorDialog(true);
      return;
    }

    setAddNoteErrors({});

    try {
      const result = await createNursingNote({
        patientId: patient.id,
        uhid: patient.patientUhid,
        branchId: resolvedFilterBranchId,
        category: addNoteCategory as "routine" | "urgent",
        notes: addNoteMessage.trim(),
      }).unwrap();

      setNursingNoteDialogMessage(result.message || "Nursing note created successfully");
      setShowNursingNoteSuccessDialog(true);
      setAddNoteCategory(null);
      setAddNoteMessage("");
      setNursingNoteFilters((prev) => ({ ...prev, page: 1 }));
      void refetchNursingNoteList();
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : "Failed to create nursing note. Please try again.";

      setNursingNoteDialogMessage(message || "Failed to create nursing note. Please try again.");
      setShowNursingNoteErrorDialog(true);
    }
  };







  const openLabReport = (row: RecentLabResultRow) => {
    setSelectedLabReport(row);
    setIsLabReportOpen(true);
  };

  const closeLabReport = () => {
    setIsLabReportOpen(false);
    setSelectedLabReport(null);
  };

  const handleLabReportDownload = async () => {
    if (isLabReportDownloading) return;

    try {
      setIsLabReportDownloading(true);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;
      const contentWidth = pageWidth - marginX * 2;
      let y = 16;

      const safeText = (value: string | null | undefined) =>
        (value || "N/A").replace(/\s+/g, " ").trim();

      // Header
      try {
        const logoResponse = await fetch(`${window.location.origin}/images/logo.png`);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoDataUrl, "PNG", marginX, y - 4, 42, 16);
        }
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(11, 140, 0);
        doc.text("Jeena Sikho", marginX, y + 4);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(67, 73, 86);
      doc.text("Report Date: ", pageWidth - marginX - 55, y, { align: "left" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(38, 45, 59);
      doc.text(safeText(selectedLabReport?.reportDate), pageWidth - marginX, y, { align: "right" });

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(67, 73, 86);
      doc.text("Generated By: ", pageWidth - marginX - 55, y, { align: "left" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(38, 45, 59);
      doc.text(selectedLabReport?.createdByUserName || "", pageWidth - marginX, y, { align: "right" });

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(67, 73, 86);
      doc.text("Admission Date: ", pageWidth - marginX - 55, y, { align: "left" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(38, 45, 59);
      doc.text(
        safeText(selectedLabReport?.admissionDate || patient.admissionDate),
        pageWidth - marginX,
        y,
        { align: "right" }
      );

      y += 12;

      // Patient Information section
      doc.setFillColor(239, 243, 239);
      doc.rect(marginX, y, contentWidth, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(38, 45, 59);
      doc.text("Patient Information", marginX + 3, y + 5.5);
      y += 8;

      const infoRows: Array<[string, string, string, string]> = [
        ["Patient Name",  safeText([patient.patientTitle, patient.patientName].filter(Boolean).join(" ")), "Room", safeText(patient.roomNumber)],
        ["Patient UHID", safeText(patient.patientUhid), "Bed Number", safeText(patient.bedNumber)],
        ["Age", safeText(patient.age), "Ward", "General Ward"],
        ["Gender", safeText(patient.gender), "Admission Date", safeText(selectedLabReport?.admissionDate || patient.admissionDate)],
      ];

      const colWidth = contentWidth / 2;
      const rowHeight = 10;

      infoRows.forEach((row, index) => {
        const rowY = y + index * rowHeight;
        doc.setDrawColor(229, 231, 235);
        doc.rect(marginX, rowY, colWidth, rowHeight);
        doc.rect(marginX + colWidth, rowY, colWidth, rowHeight);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(82, 87, 99);
        doc.text(`${row[0]}:`, marginX + 3, rowY + 6);
        doc.text(`${row[2]}:`, marginX + colWidth + 3, rowY + 6);

        const leftLabelWidth = doc.getTextWidth(`${row[0]}: `);
        const rightLabelWidth = doc.getTextWidth(`${row[2]}: `);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(38, 45, 59);
        const leftValue = doc.splitTextToSize(
          row[1],
          colWidth - leftLabelWidth - 8
        );
        const rightValue = doc.splitTextToSize(
          row[3],
          colWidth - rightLabelWidth - 8
        );
        doc.text(leftValue[0] || "N/A", marginX + 3 + leftLabelWidth, rowY + 6);
        doc.text(rightValue[0] || "N/A", marginX + colWidth + 3 + rightLabelWidth, rowY + 6);
      });

      y += infoRows.length * rowHeight + 10;

      // Lab test results section
      doc.setFillColor(239, 243, 239);
      doc.rect(marginX, y, contentWidth, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(38, 45, 59);
      doc.text("Lab test results", marginX + 3, y + 5.5);
      y += 8;

      const headers = ["Sr no.", "Test Name", "Result", "Reference Range", "Status", "Date & Time"];
      const colWidths = [16, 38, 22, 36, 28, 42];
      const tableRowHeight = 10;

      // Header row
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(255, 255, 255);
      let x = marginX;
      headers.forEach((header, i) => {
        doc.rect(x, y, colWidths[i], tableRowHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(82, 87, 99);
        doc.text(header, x + 2, y + 6);
        x += colWidths[i];
      });
      y += tableRowHeight;

      // Data row
      const report = selectedLabReport;
      const values = report
        ? [
            "1",
            safeText(report.testName),
            safeText(report.result),
            safeText(report.referenceRange),
            safeText(report.status),
            safeText(report.dateTime),
          ]
        : ["-", "No lab result selected", "-", "-", "-", "-"];

      x = marginX;
      values.forEach((value, i) => {
        doc.rect(x, y, colWidths[i], tableRowHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(38, 45, 59);
        const lines = doc.splitTextToSize(value, colWidths[i] - 4);
        doc.text(lines[0] || "-", x + 2, y + 6);
        x += colWidths[i];
      });

      y += tableRowHeight + 14;

      // Audit
      const exportedBy = nurseName?.trim() || "N/A";
      const exportDateTime =
        labtestReportformattedDateTime?.trim() ||
        (() => {
          const now = new Date();
          const date = now.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const time = now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          return `${date} | ${time}`;
        })();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(38, 45, 59);
      doc.text("AUDIT INFORMATION", pageWidth - marginX, y, { align: "right" });
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(67, 73, 86);
      doc.text(`Exported by: ${exportedBy}`, pageWidth - marginX, y, { align: "right" });
      y += 5;
      doc.text(`Date/Time: ${exportDateTime}`, pageWidth - marginX, y, { align: "right" });

      const filename = `lab-test-report_${patient.patientUhid || patient.id}_${Date.now()}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Failed to download lab report", error);
    } finally {
      setIsLabReportDownloading(false);
    }
  };

  const openEditMedicine = (item: PatientMedicineListItem) => {
    setSelectedPatientMedicine(item);
    setIsEditMedicineOpen(true);
  };

  const closeEditMedicine = () => {
    setIsEditMedicineOpen(false);
    setSelectedPatientMedicine(null);
  };

  const openChangeMedicine = (item: PatientMedicineListItem) => {
    setSelectedChangePatientMedicine(item);
    setIsChangeMedicineOpen(true);
  };

  const closeChangeMedicine = () => {
    setIsChangeMedicineOpen(false);
    setSelectedChangePatientMedicine(null);
  };

  const openPauseMedicineConfirm = (item: PatientMedicineListItem) => {
    setPauseMedicineConfirm(item);
  };

  const closePauseMedicineConfirm = () => {
    if (isStoppingPatientMedicine) {
      return;
    }
    setPauseMedicineConfirm(null);
  };

  const handlePauseMedicineConfirm = async () => {
    if (!pauseMedicineConfirm) {
      return;
    }

    try {
      const result = await stopPatientMedicine(pauseMedicineConfirm.id).unwrap();

      setPauseMedicineConfirm(null);
      setPauseMedicineDialogMessage(result.message || "Medicine stopped successfully");
      setIsPauseMedicineSuccessOpen(true);
      void refetchPatientMedicineList();
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : "Failed to stop medicine. Please try again.";

      setPauseMedicineConfirm(null);
      setPauseMedicineDialogMessage(message || "Failed to stop medicine. Please try again.");
      setIsPauseMedicineErrorOpen(true);
    }
  };

  const closePauseMedicineSuccess = () => {
    setIsPauseMedicineSuccessOpen(false);
    setPauseMedicineDialogMessage("");
  };

  const closePauseMedicineError = () => {
    setIsPauseMedicineErrorOpen(false);
    setPauseMedicineDialogMessage("");
  };

  const handleMedicineNameSort = () => {
    setMedicinesSortBy("medicineName");
    setMedicinesSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    setMedicinesCurrentPage(1);
  };


  const headerMetaItems = [
    { label: "UHID", value: patient.patientUhid },
    { label: "Age", value: patient.age },
    { label: "Gender", value: patient.gender },
    { label: "Bed Number", value: patient.bedNumber },
  ];

  const locationMetaItems = [
    { label: "Room Number", value: patient.roomNumber },
    { label: "Admission Date", value: patient.admissionDate },
    { label: "Treating Doctor", value: patient.treatingDoctor },
    { label: "Final Diagnosis", value: patient.diagnosis },
  ];

  const renderMetaItems = (items: Array<{ label: string; value: string }>) =>
    items.map((item, index) => (
      <span key={item.label} className="inline">
        {index > 0 ? <span className="mx-1.5 text-[#434956]">•</span> : null}
        <span className="font-normal text-[#525763]">{item.label}: </span>
        <span className="font-semibold text-[#434956]">{item.value}</span>
      </span>
    ));

  const patientMedicineList = patientMedicineListRes?.data ?? [];
  const patientMedicineRows = useMemo(
    () => patientMedicineList.map(mapPatientMedicineListItemToRow),
    [patientMedicineList]
  );
  const medicinesTotalItems = Number(patientMedicineListRes?.total ?? 0);

//   const tabOptions = PATIENT_TABS.map((tab) => ({
//   label: tab.label,
//   value: tab.id,
// }));

  if (isNewLabOrderOpen) {
    return (
      <NewLabRequestScreen
        patient={patient}
        branchId={resolvedFilterBranchId}
        onClose={() => {
          setIsNewLabOrderOpen(false);
          setActiveTab("lab-result");
        }}
        onSuccess={() => {
          setIsNewLabOrderOpen(false);
          setActiveTab("lab-result");
          void refetchPendingLabOrders();
          void refetchLabTestSummary();
          void refetchPendingApprovalLabTest();
        }}
      />
    );
  }
  return (
    <div className="space-y-5">
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
            <Badge variant="success" className="font-medium uppercase">
              {patient.patientType ?? ""}
            </Badge>
          </div>
          {/* <p className="mt-3 text-sm">{renderMetaItems(headerMetaItems)}</p>
          <p className="mt-1 text-sm">{renderMetaItems(locationMetaItems)}</p> */}

          <p className="mt-0.5 text-[13px]">{renderMetaItems(headerMetaItems)}</p>
          <p className="mt-0 text-[13px]">{renderMetaItems(locationMetaItems)}</p>
        </div>

        <BackToPreviousPageButton
          className="shrink-0"
          onClick={onBack}
          text="Back"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {/* {PATIENT_TABS.map((tab) => { */}
       {/* const isActive = activeTab === tab.id;
          return ( */}
             <div className="w-full">
                <Tabs
                    options={PATIENT_TABS.map((tab) => ({ label: tab.label, value: tab.id }))}
                    value={activeTab}
                    onChange={(value) => setActiveTab(value as PatientTab)}
                />
                </div>
          {/* ); */}
        {/* })} */}
      </div>

      {activeTab === "overview" ? (
        // <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,320px)]">
        // <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(240px,1fr)_600px_minmax(280px,1fr)]">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,1fr)_minmax(400px,2fr)_minmax(280px,1fr)]">
          <div className="space-y-5">
            {isPatientOverviewLoading ? (
              <SectionCard title="Medical Information">
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading medical information...
                </div>
              </SectionCard>
            ) : (
              <MedicalInformationCard items={medicalInfoItems} className="!mb-0 !shadow-none" />
            )}

            <SectionCard title="Nursing Tasks" className="mt-4">
              {isPatientNurseTasksLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading nursing tasks...
                </div>
              ) : nursingTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No nursing tasks found.</p>
              ) : (
                // <div className="space-y-3">
                <div className="space-y-3 h-[400px] overflow-y-auto overflow-x-hidden">
                  {nursingTasks.map((task) => (
                   <div
                      key={task.id}
                        className={`rounded-[14px] border px-4 py-3 me-2 ${
                          task.completed
                            ? "border-[#0B8C0033] bg-[#0B8C00]/5"
                            : "border-[#FED7AA] bg-[#B45309]/5"
                        }`}
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: task.completed ? "#0B8C00" : "#EA580C",
                        }}
                      >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleToggleNurseTask(task.id, task.completed)}
                            className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#D1D5DB] accent-[#0B8C00]"
                          />
                          <Tooltip content={task.title} position="top">
                            <p className="truncate text-sm font-medium text-[#262D3B]">{task.title}</p>
                          </Tooltip>
                        </div>
                        <StatusPill
                          label={task.status}
                          tone={task.completed ? "success" : "warning"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard
              title="Latest Vitals"
              action={<span className="text-xs text-[#9FA2AB]">Last updated: {vitalsUpdatedLabel}</span>}
            >
              {isPatientOverviewLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading vitals...
                </div>
              ) : latestVitalsCards.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No vitals recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {latestVitalsCards.map((vital) => (
                    <div
                      key={vital.id}
                      className={`rounded-2xl border border-[#EDF3EA] bg-white p-4 ${
                        vital.label === "Pain" ? "sm:col-span-2" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-[#2563EB]" />

                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-[120%] text-[#434956]">
                            {vital.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#262D3B]">
                            {vital.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {patientOverview?.latestVitals?.VitalsNote ? (
                <p className="mt-4 text-sm text-[#434956]">
                  <span className="text-[#9FA2AB]">Note:</span> {patientOverview.latestVitals.VitalsNote}
                </p>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Medications Schedule(Today)"
              action={
                <div className="w-[180px]">
                  <DatePicker
                    label=""
                    value={scheduleDate}
                    onChange={(value) => {
                      setScheduleDate(value);
                      setMedicineSchedulePage(1);
                    }}
                    placeholder="Select date"
                    // background="white"
                    width="100%"
                    disablePastDates={false}
                  />
                </div>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead position="first">Shift</TableHead>
                      <TableHead>Time</TableHead>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Dose</TableHead>
                    <TableHead position="last">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMedicineScheduleTableLoading ? (
                    <TableRow>
                      <TableData colSpan={5} className="py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                          <SpinnerLoader size={18} />
                          Loading medicine schedule...
                        </div>
                      </TableData>
                    </TableRow>
                  ) : medicineSchedule.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No medicines scheduled for this date.
                      </TableData>
                    </TableRow>
                  ) : (
                    medicineSchedule.map((row) => {
                      const statusDisplay = formatMedicineDoseStatus(getMedicineScheduleStatus(row));
                      return (
                        <TableRow
                          key={`${row.scheduleShift}-${row.id}`}
                          className="bg-white transition-colors hover:bg-[#F7FAF7]"
                        >
                          <TableData variant="primary">{row.scheduleShift}</TableData>
                          <TableData variant="primary">{formatMedicineScheduleTime(row)}</TableData>
                          <TableData>{row.medicineName || "N/A"}</TableData>
                          <TableData>{formatMedicineDose(row)}</TableData>
                          <TableData>
                            <StatusPill label={statusDisplay.label} tone={statusDisplay.tone} />
                          </TableData>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {medicineScheduleTotalItems > 0 ? (
                <div className="mt-4 border-t border-[#EDF3EA] pt-4">
                  <Pagination
                    currentPage={medicineSchedulePage}
                    totalItems={medicineScheduleTotalItems}
                    itemsPerPage={medicineScheduleItemsPerPage}
                    itemsPerPageOptions={[6, 10, 20, 50]}
                    onPageChange={setMedicineSchedulePage}
                    onItemsPerPageChange={(itemsPerPage) => {
                      setMedicineScheduleItemsPerPage(itemsPerPage);
                      setMedicineSchedulePage(1);
                    }}
                  />
                </div>
              ) : null}
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard title="Attendant Details">
              {isPatientOverviewLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading attendant details...
                </div>
              ) : patientAttendants.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No attendant details found.</p>
              ) : (
                <div
                  className={
                    patientAttendants.length > 1
                      ? "max-h-[280px] space-y-4 overflow-y-auto pr-1"
                      : "space-y-4"
                  }
                >
                  {patientAttendants.map((patientAttendant, attendantIndex) => (
                    <div
                      key={patientAttendant.id ?? `attendant-${attendantIndex}`}
                      className="overflow-hidden border border-[#EBECED] bg-white"
                    >
                      {[
                        {
                          label: "Attendant Name",
                          value: formatOverviewValue(patientAttendant.name),
                        },
                        {
                          label: "Attendant Contact",
                          value: formatOverviewValue(patientAttendant.contactNumber),
                        },
                        ...(patientAttendant.relation
                          ? [
                              {
                                label: "Relation",
                                value: formatOverviewLabel(patientAttendant.relation),
                              },
                            ]
                          : []),
                        ...(patientAttendant.gender
                          ? [
                              {
                                label: "Gender",
                                value: formatOverviewLabel(patientAttendant.gender),
                              },
                            ]
                          : []),
                        ...(patientAttendant.address
                          ? [
                              {
                                label: "Address",
                                value: patientAttendant.address,
                              },
                            ]
                          : []),
                      ].map((item, itemIndex, items) => (
                        <div
                          key={item.label}
                          className={`flex justify-between gap-3 px-[20px] py-[18px] ${
                            itemIndex < items.length - 1 ? "border-b border-[#EBECED]" : ""
                          }`}
                        >
                          <span className="font-inter shrink-0 text-[14px] font-normal leading-[120%] text-[#525763]">
                            {item.label}
                          </span>
                          <span className="font-inter text-right text-[14px] font-medium leading-[120%] text-[#434956] break-words">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Recent Lab Results">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead position="first">Lab Test Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead position="last">Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPatientOverviewLoading ? (
                    <TableRow>
                      <TableData colSpan={3} className="py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                          <SpinnerLoader size={18} />
                          Loading lab results...
                        </div>
                      </TableData>
                    </TableRow>
                  ) : labResults.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={3} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No lab results found.
                      </TableData>
                    </TableRow>
                  ) : (
                    labResults.map((row, index) => {
                      const testTone = mapLabStatusTone(row.testStatus);

                      return (
                        <TableRow
                          key={`${row.labTestName}-${index}`}
                          className="bg-white transition-colors hover:bg-[#F7FAF7]"
                        >
                          <TableData variant="primary">{row.labTestName}</TableData>
                          <TableData>
                            <span
                              className={`text-sm font-medium ${
                                testTone === "success"
                                  ? "text-[#0B8C00]"
                                  : testTone === "warning"
                                    ? "text-[#B45309]"
                                    : "text-[#434956]"
                              }`}
                            >
                              {mapLabStatusText(row.testStatus)}
                            </span>
                          </TableData>
                          <TableData>
                            <StatusPill
                              label={mapLabStatusText(row.reportStatus)}
                              tone={mapLabStatusTone(row.reportStatus)}
                            />
                          </TableData>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </SectionCard>

            {/* <SectionCard title="Doctor's Orders">
              <div className="space-y-4">
                {DOCTOR_ORDERS.map((order) => (
                  <div key={order.id} className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        order.tone === "success" ? "bg-[#0B8C00]" : "bg-[#F59E0B]"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#262D3B]">{order.title}</p>
                      <p className="mt-1 text-xs text-[#9FA2AB]">{order.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard> */}

            <SectionCard title="Notes">
              {isPatientOverviewLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading notes...
                </div>
              ) : nursingNotes.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No notes found.</p>
              ) : (
                <div className="max-h-[176px] space-y-3 overflow-y-auto pr-1">
                  {nursingNotes.map((note) => (
                    <div
                      key={`note-${note.id}`}
                      className="rounded-[14px] border border-[#EDF3EA] bg-[#FCFDFC] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#262D3B]">
                          {formatOverviewValue(note.addedByName, "N/A")}
                        </p>
                        <StatusPill label={formatOverviewLabel(note.category)} tone="neutral" />
                      </div>
                      <p className="mt-2 text-sm text-[#434956]">{note.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      ) : activeTab === "nursing-notes" ? (
        <div className="space-y-5">
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-medium text-[#262D3B]">Filter</h3>
              <button
                type="button"
                onClick={clearNursingNoteFilters}
                className="rounded-full border border-[#EF4444]/30 bg-white px-4 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
              >
                Clear All filter
              </button>
            </div>

            <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-4">
              <FormInputField
                label="Nurse/Practitioner"
                width="100%"
                height={44}
                value={nursingNoteFilters.noteAddedBy}
                onChange={(event) =>
                  setNursingNoteFilters((prev) => ({
                    ...prev,
                    noteAddedBy: event.target.value,
                    page: 1,
                  }))
                }
                className="!bg-[#0B8C00]/5"
                placeholder="Search by name"
              />

              <DatePicker
                label="Start Date"
                value={nursingNoteFilters.startDate}
                onChange={(value) =>
                  setNursingNoteFilters((prev) => ({
                    ...prev,
                    startDate: value,
                    page: 1,
                  }))
                }
                placeholder="DD/MM/YY"
                // background="white"
                width="100%"
                disablePastDates={false}
              />

              <DatePicker
                label="End Date"
                value={nursingNoteFilters.endDate}
                onChange={(value) =>
                  setNursingNoteFilters((prev) => ({
                    ...prev,
                    endDate: value,
                    page: 1,
                  }))
                }
                placeholder="DD/MM/YY"
                // background="white"
                width="100%"
                disablePastDates={false}
              />

              <div className="flex w-full flex-col justify-end">
                <p className="mb-2 text-xs font-medium text-[#7B8089]">Note Category</p>
                <Tabs
                  options={NURSING_NOTE_CATEGORY_OPTIONS.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                  value={nursingNoteFilters.category}
                  onChange={(value) =>
                    setNursingNoteFilters((prev) => ({
                      ...prev,
                      category:
                        prev.category === value
                          ? ""
                          : (value as "routine" | "urgent"),
                      page: 1,
                    }))
                  }
                />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
              <h3 className="text-base font-medium text-[#262D3B]">Add Notes</h3>

              <div className="mt-4 space-y-4">
                <FormSelectField
                  label="Note Category *"
                  width="100%"
                  height={44}
                  options={NURSING_NOTE_CATEGORY_OPTIONS}
                  value={addNoteCategory}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setAddNoteCategory(next || null);
                    if (addNoteErrors.category) {
                      setAddNoteErrors((prev) => ({ ...prev, category: undefined }));
                    }
                  }}
                  error={addNoteErrors.category}
                  placeholder="Select"
                  background="white"
                />

                <div>
                  <p className="mb-1.5 text-xs text-[#525763]">Message</p>
                  <div
                    className={`rounded-[12px] border bg-white p-3 ${
                      addNoteErrors.notes ? "border-[#F87171]" : "border-[#E3EEE1]"
                    }`}
                  >
                    <textarea
                      rows={6}
                      value={addNoteMessage}
                      onChange={(event) => {
                        setAddNoteMessage(event.target.value);
                        if (addNoteErrors.notes) {
                          setAddNoteErrors((prev) => ({ ...prev, notes: undefined }));
                        }
                      }}
                      placeholder="Type clinical observations, patient responses, and treatment adherence details here..."
                      className="w-full resize-none border-none bg-transparent text-sm text-[#434956] placeholder:text-[#9FA2AB] focus:outline-none"
                    />

                    {/* <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#EDF3EA] pt-3 text-[#9FA2AB]">
                      {["B", "I", "U", "H", "≡", "•", "🔗", "📎", "✎"].map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className="text-sm font-medium transition-colors hover:text-[#434956]"
                        >
                          {icon}
                        </button>
                      ))}
                    </div> */}
                  </div>
                  {addNoteErrors.notes ? (
                    <span className="mt-1 block text-xs text-[#F87171]">{addNoteErrors.notes}</span>
                  ) : null}
                </div>

                <Button
                  variant="primary"
                  size="small"
                  className="!min-w-0 whitespace-nowrap"
                  disabled={isCreatingNursingNote}
                  onClick={() => void handleAddNursingNote()}
                >
                  {isCreatingNursingNote ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </section>

            <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
              <h3 className="mb-4 text-base font-medium text-[#262D3B]">Patient History</h3>

              {isNursingNoteListLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading nursing notes...
                </div>
              ) : nursingNoteList.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#9CA3AF]">No nursing notes found.</p>
              ) : (
                <>
                  <div className="space-y-0">
                    {nursingNoteList.map((entry, index) => {
                      const isExpanded = expandedNursingNoteIds.includes(entry.id);
                      const authorName = formatOverviewValue(entry.addedByName, "N/A");

                      return (
                        <div key={entry.id} className="relative pl-8">
                          {index !== nursingNoteList.length - 1 ? (
                            <span className="absolute left-[11px] top-7 h-[calc(100%-8px)] w-px bg-[#B7E2B4]" />
                          ) : null}

                          <span className="absolute left-0 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#0B8C00] text-white">
                            <Image
                              src="/icons/check.svg"
                              alt=""
                              width={12}
                              height={12}
                              className="brightness-0 invert"
                            />
                          </span>

                          <div className="pb-5">
                            <button
                              type="button"
                              onClick={() => toggleNursingNoteExpanded(entry.id)}
                              className="text-left text-sm font-medium text-[#262D3B] transition-colors hover:text-[#0B8C00] cursor-pointer"
                            >
                              {formatNursingNoteDate(entry.createdAt)} – {authorName}
                            </button>

                            {isExpanded ? (
                              <div className="mt-3 rounded-[14px] bg-[#FCFDFC] p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#DDF3DB] text-xs font-semibold text-[#262D3B]">
                                      {getNameInitials(entry.addedByName)}
                                    </span>
                                    <p className="text-sm font-medium text-[#262D3B]">{authorName}</p>
                                  </div>
                                  <span className="text-xs text-[#525763]">
                                    {formatNursingNoteDateTime(entry.createdAt)}
                                  </span>
                                </div>

                                <div className="mt-4 rounded-[12px] bg-[#F3FBF2] p-4">
                                  <p className="text-xs font-medium text-[#262D3B]">
                                    {formatOverviewLabel(entry.category)}
                                  </p>
                                  <p className="mt-2 text-xs leading-5 text-[#525763]">{entry.notes}</p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {nursingNoteTotal > 0 ? (
                    <div className="mt-4 border-t border-[#EDF3EA] pt-4">
                      <Pagination
                        currentPage={nursingNoteFilters.page}
                        totalItems={nursingNoteTotal}
                        itemsPerPage={nursingNoteFilters.limit}
                        itemsPerPageOptions={NURSING_NOTE_PAGINATION_OPTIONS}
                        onPageChange={(page) =>
                          setNursingNoteFilters((prev) => ({ ...prev, page }))
                        }
                        onItemsPerPageChange={(limit) =>
                          setNursingNoteFilters((prev) => ({ ...prev, limit, page: 1 }))
                        }
                      />
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
      ) : activeTab === "lab-result" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-4">
            <LabSummaryCard
              label="Total Tests"
              value={totalTestsValue}
              iconSrc="/icons/totalTests.svg"
              className="w-full sm:w-[400px]"
            />
            <LabSummaryCard
              label="Pending Results"
              value={pendingResultsValue}
              iconSrc="/icons/Hourglass.svg"
              className="w-full sm:w-[400px]"
            />
            <LabSummaryCard
              label="Sent for Approval"
              value={sendForApproval}
              iconSrc="/icons/sendForApproval.svg"
              className="w-full sm:w-[400px]"
            />
          </div>

          {/* <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"> */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_450px]">
            <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
              <h3 className="mb-4 text-base font-medium text-[#262D3B]">Recent Lab Results</h3>

              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead position="first">Sr no.</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead position="last">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLabTestListLoading ? (
                    <TableRow>
                      <TableData colSpan={5} className="py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                          <SpinnerLoader size={18} />
                          Loading lab results...
                        </div>
                      </TableData>
                    </TableRow>
                  ) : labTestList.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No lab results found.
                      </TableData>
                    </TableRow>
                  ) : (
                    labTestList.map((row, index) => {
                      const reportRow = mapLabTestToReportRow(row);
                      const statusTone = mapLabStatusTone(row.testStatus);
                      const srNo = String(
                        (labTestListFilters.page - 1) * labTestListFilters.limit + index + 1
                      ).padStart(2, "0");

                      return (
                        <TableRow key={row.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                          <TableData variant="primary">{srNo}</TableData>
                          <TableData>{row.labTest?.testName || "N/A"}</TableData>
                          <TableData>{formatLabTestDateTime(row.updatedAt)}</TableData>
                          <TableData>
                            <StatusPill label={formatOverviewLabel(row.testStatus)} tone={statusTone} />
                          </TableData>
                          <TableData>
                          <Tooltip content="View Lab Test Report" position="top" delay={0}>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                              aria-label={`View ${row.labTest?.testName || "lab test"}`}
                              onClick={() => openLabReport(reportRow)}
                            >
                              <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
                            </button>
                          </Tooltip>
                          </TableData>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {!isLabTestListLoading && labTestList.length > 0 ? (
                <div className="mt-4 border-t border-[#EDF3EA] pt-4">
                  <Pagination
                    currentPage={labTestListFilters.page}
                    totalItems={labTestListTotal > 0 ? labTestListTotal : labTestList.length}
                    itemsPerPage={labTestListFilters.limit}
                    itemsPerPageOptions={LAB_TEST_LIST_PAGINATION_OPTIONS}
                    onPageChange={(page) =>
                      setLabTestListFilters((prev) => ({ ...prev, page }))
                    }
                    onItemsPerPageChange={(limit) =>
                      setLabTestListFilters((prev) => ({ ...prev, limit, page: 1 }))
                    }
                  />
                </div>
              ) : null}
            </section>

            <div className="flex flex-col gap-5">
              <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-base font-medium text-[#262D3B]">Pending Orders</h3>
                  {/* <Button
                    variant="outline"
                    size="xsmall"
                    className="!min-w-0 whitespace-nowrap"
                    onClick={() => setIsNewLabOrderOpen(true)}
                  >
                    <Image src="/icons/AddIcon.svg" alt="" width={14} height={14} className="mr-1.5" />
                    New Lab Order
                  </Button> */}

                     <button
                      type="button"
                      className="flex h-9 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                      onClick={() => setIsNewLabOrderOpen(true)}
                  >
                      <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                      <span className="text-hide">New Lab Order</span>
                  </button>
                </div>
{/* 
                <div className="space-y-3"> */}
                <div className="h-[150px] overflow-y-auto space-y-3">
                  {isPendingLabOrdersLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading pending orders...
                    </div>
                  ) : pendingLabOrders.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#9CA3AF]">No pending orders found.</p>
                  ) : (
                    pendingLabOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-[14px] border border-[#EDF3EA] bg-[#FCFDFC] px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#262D3B]">
                              {order.labTest?.testName || "N/A"}
                            </p>
                            <p className="mt-1 text-xs text-[#434956]">
                              Ordered by: {formatOverviewValue(order.createdByUserName, "N/A")}
                            </p>
                          </div>
                          <StatusPill
                            label={formatOverviewLabel(order.testStatus)}
                            tone={mapLabStatusTone(order.testStatus)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-base font-medium text-[#262D3B]">Send For Approval</h3>
                </div>

                {/* <div className="space-y-3"> */}
                <div className="h-[150px] overflow-y-auto space-y-3">
                  {isPendingApprovalLabTestLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading approvals...
                    </div>
                  ) : pendingApprovalLabTests.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#9CA3AF]">No tests pending approval.</p>
                  ) : (
                    pendingApprovalLabTests.map((test) => (
                      <div
                        key={test.id}
                        className="rounded-[14px] border border-[#EDF3EA] bg-[#FCFDFC] px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#262D3B]">
                              {test.testName || "N/A"} - {test.categoryName || "N/A"}
                            </p>
                            <p className="mt-1 text-xs text-[#434956]">
                              Ordered by: {formatOverviewValue(test.createdByUserName, "N/A")}
                            </p>
                          </div>
                          <StatusPill
                            label={
                              test.approvalStatus?.toLowerCase() === "pending"
                                ? "Awaiting Approval"
                                : formatOverviewLabel(test.approvalStatus)
                            }
                            tone={
                              test.approvalStatus?.toLowerCase() === "pending" ? "danger" : "success"
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

          </div>
        </div>
      ) : activeTab === "therapies" ? (
        <div className="space-y-5">
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
                  // background="white"
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
                  // background="white"
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
                              {/* <div className="space-y-2"> */}
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
        </div>
      ) : activeTab === "medicines" ? (
        <div className="space-y-5">
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-base font-medium text-[#262D3B]">Medicine</h3>

              <div className="flex items-center gap-4">
                <div className="w-[320px]">
                  <TableSearchInput
                    value={medicinesSearch}
                    onChange={(value) => {
                      setMedicinesSearch(value);
                      setMedicinesCurrentPage(1);
                    }}
                    placeholder="Search..."
                  />
                </div>

                {/* <Button
                  variant="primary"
                  size="xsmall"
                  className="!min-w-0 whitespace-nowrap"
                  onClick={() => setIsAddMedicineOpen(true)}
                >
                  <Image
                    src="/icons/AddIcon.svg"
                    alt="Add Medicine"
                    width={14}
                    height={14}
                    className="brightness-0 invert"
                  />
                  Add Medicine
                </Button> */}

                      <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                   onClick={() => setIsAddMedicineOpen(true)}
                >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                    <span className="text-hide">Add Medicine</span>
                </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead position="first">Sr no.</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-1"
                      onClick={handleMedicineNameSort}
                    >
                      Medicine Name
                      <Image src="/icons/SortByAscDes.svg" alt="Sort" width={12} height={12} />
                    </button>
                  </TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead position="last">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPatientMedicineListLoading ? (
                  <TableRow className="bg-white">
                    <TableData colSpan={8}>
                      <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#9CA3AF]">
                        <SpinnerLoader size={18} />
                        Loading medicines...
                      </div>
                    </TableData>
                  </TableRow>
                ) : patientMedicineRows.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={8} className="py-12 text-center text-sm text-[#9FA2AB]">
                      No medicines found
                    </TableData>
                  </TableRow>
                ) : (
                  patientMedicineList.map((item, index) => {
                    const row = mapPatientMedicineListItemToRow(item);
                    return (
                    <TableRow
                      key={row.id}
                      className="bg-white transition-colors hover:bg-[#F7FAF7]"
                    >
                      <TableData variant="primary">
                        {String(
                          (medicinesCurrentPage - 1) * medicinesItemsPerPage + index + 1
                        ).padStart(2, "0")}
                      </TableData>
                      <TableData className="min-w-[220px]"
                        
                     
                      >{row.medicineName}</TableData>
                      <TableData>{row.dosage}</TableData>
                      <TableData>{row.frequency}</TableData>
                      <TableData>{row.timing}</TableData>
                      <TableData>{row.duration}</TableData>
                      <TableData>
                        <StatusPill label={row.status} tone={row.tone} />
                      </TableData>
                      <TableData>
                        <div className="flex items-center gap-2">
                          <Tooltip position="top" content="Edit">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                              aria-label={`Edit ${row.medicineName}`}
                              onClick={() => openEditMedicine(item)}
                            >
                              <Image
                                src="/icons/EditIconBlack.svg"
                                alt="Edit"
                                width={18}
                                height={18}
                              />
                            </button>
                          </Tooltip>
                          <Tooltip position="top" content="Change Medicine">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                              aria-label={`Change medicine ${row.medicineName}`}
                              onClick={() => openChangeMedicine(item)}
                            >
                              <Image
                                src="/icons/changeMedicine.svg"
                                alt="Change medicine"
                                width={18}
                                height={18}
                              />
                            </button>
                          </Tooltip>
                          <Tooltip position="top" content="Pause Medicine">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                              aria-label={`Pause medicine ${row.medicineName}`}
                              onClick={() => openPauseMedicineConfirm(item)}
                            >
                              <Image
                                src="/icons/darkPauseIcon.svg"
                                alt="Pause medicine"
                                width={18}
                                height={18}
                              />
                            </button>
                          </Tooltip>
                        </div>
                      </TableData>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {medicinesTotalItems > 0 ? (
              <div className="mt-4">
                <Pagination
                  currentPage={medicinesCurrentPage}
                  totalItems={medicinesTotalItems}
                  itemsPerPage={medicinesItemsPerPage}
                  itemsPerPageOptions={[6, 10, 20, 50]}
                  onPageChange={(page) => setMedicinesCurrentPage(page)}
                  onItemsPerPageChange={(itemsPerPage) => {
                    setMedicinesItemsPerPage(itemsPerPage);
                    setMedicinesCurrentPage(1);
                  }}
                />
              </div>
            ) : null}
          </section>
        </div>
      ) : activeTab === "vitals" ? (
        <PatientVitalsTab patientId={patient.id} />
      ) : activeTab === "medication-schedule" ? (
        <PatientMedicationScheduleTab
          patientId={patient.id}
          patient={{
            patientId: patient.id,
            patientName: patient.patientName,
            patientUhid: patient.patientUhid,
            age: patient.age,
            gender: patient.gender,
            bedNumber: patient.bedNumber,
            diagnosis: patient.diagnosis,
            admissionDate: patient.admissionDate,
            statusLabel: "STABLE",
          }}
        />
      ) : activeTab === "timeline" ? (
        <PatientTimelineTab patientId={patient.id} branchId={resolvedFilterBranchId} />
      ) : activeTab === "history" ? (
        <PatientHistoryTab patientId={patient.id} branchId={resolvedFilterBranchId} />
      ) : (
        <section className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-12 text-center shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          <p className="text-sm text-[#9FA2AB]">
            {PATIENT_TABS.find((tab) => tab.id === activeTab)?.label} content will be available soon.
          </p>
        </section>
      )}

      

      <Dialog
        open={isLabReportOpen}
        onClose={closeLabReport}
        title="Lab Test Report"
        width={920}
        height="85vh"
        contentPadding="px-6 pb-6 pt-4"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <Image src="/images/logo.png" alt="Jeena Sikho" width={140} height={80} />
              <div className="text-right text-sm text-[#434956]">
                <p>
                  Report Date:{" "}
                  <span className="font-bold text-[#262D3B]">
                    {selectedLabReport?.reportDate || "N/A"}
                  </span>
                </p>
                <p className="mt-1">
                  Generated By: <span className="font-bold text-[#262D3B]">{selectedLabReport?.createdByUserName}</span>
                </p>
                <p className="mt-1">
                  Admission Date:{" "}
                  <span className="font-bold text-[#262D3B]">
                    {selectedLabReport?.admissionDate || "N/A"}
                  </span>
                </p>
              </div>
            </div>

            <section>
              <div className="bg-[#EFF3EF] px-4 py-2.5">
                <h3 className="text-sm font-semibold text-[#262D3B]">Patient Information</h3>
              </div>

              <div className="overflow-hidden border border-[#E5E7EB] border-t-0">
                {[
                  [
                    { label: "Patient Name",   value: [patient.patientTitle, patient.patientName].filter(Boolean).join(" ") || "N/A", withTooltip: true },
                    { label: "Room", value: patient.roomNumber },
                  ],
                  [
                    { label: "Patient UHID", value: patient.patientUhid },
                    { label: "Bed Number", value: patient.bedNumber },
                  ],
                  [
                    { label: "Age", value: patient.age },
                    { label: "Ward", value: "General Ward" },
                  ],
                  [
                    { label: "Gender", value: patient.gender },
                    {
                      label: "Admission Date",
                      value: selectedLabReport?.admissionDate || patient.admissionDate,
                    },
                  ],
                ].map((row, rowIndex, rows) => (
                  <div
                    key={rowIndex}
                    className={`grid grid-cols-1 sm:grid-cols-2 ${
                      rowIndex < rows.length - 1 ? "border-b border-[#E5E7EB]" : ""
                    }`}
                  >
                    {row.map((item, itemIndex) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-2 px-4 py-3 text-sm ${
                          itemIndex === 0 ? "sm:border-r sm:border-[#E5E7EB]" : ""
                        }`}
                      >
                        <span className="shrink-0 font-normal text-[#525763]">{item.label}:</span>
                        {item.withTooltip ? (
                          <Tooltip
                            position="top"
                            maxWidth={600}
                            content={
                              <span className="whitespace-nowrap text-xs text-[#262D3B]">
                                {item.value}
                              </span>
                            }
                          >
                            <span className="min-w-0 cursor-default truncate font-bold text-[#262D3B]">
                              {item.value}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="min-w-0 truncate font-bold text-[#262D3B]">
                            {item.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="bg-[#EFF3EF] px-4 py-2.5">
                <h3 className="text-sm font-semibold text-[#262D3B]">Lab test results</h3>
              </div>

              <div className="overflow-hidden border border-[#E5E7EB] border-t-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead position="first">Sr no.</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Reference Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead position="last">Date &amp; Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLabReport ? (
                      <TableRow className="bg-white">
                        <TableData variant="primary">1</TableData>
                        <TableData className="font-semibold text-[#262D3B]">
                          {selectedLabReport.testName}
                        </TableData>
                        <TableData className="font-semibold text-[#262D3B]">
                          {selectedLabReport.result}
                        </TableData>
                        <TableData className="font-semibold text-[#262D3B]">
                          {selectedLabReport.referenceRange}
                        </TableData>
                        <TableData>
                          <span className="inline-flex rounded-full border border-[#0B8C0033] bg-[#F2F9F2] px-3 py-1 text-xs font-medium text-[#0B8C00]">
                            {selectedLabReport.status}
                          </span>
                        </TableData>
                        <TableData className="font-semibold text-[#262D3B]">
                          {selectedLabReport.dateTime}
                        </TableData>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-5 flex justify-end">
                <div className="text-right text-xs text-[#434956]">
                  <p className="font-bold uppercase tracking-wide text-[#262D3B]">
                    Audit Information
                  </p>
                  <p className="mt-1">
                    Exported by:{" "}
                    <span className="font-semibold text-[#262D3B]">{nurseName}</span>
                  </p>
                  <p className="mt-1">
                    Date/Time:{" "}
                    <span className="font-semibold text-[#262D3B]">
                      {labtestReportformattedDateTime}
                    </span>
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#E5E7EB] pt-4 pb-4">
            <button
              type="button"
              onClick={closeLabReport}
              className="flex h-[41px] items-center justify-center rounded-[32px] border border-[#C0C3C8] bg-white px-6 text-sm font-medium text-[#434956] transition-colors hover:bg-[#F5F6F8]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => void handleLabReportDownload()}
              disabled={isLabReportDownloading}
              className="flex h-[41px] items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium text-[#9A7909] transition-colors hover:bg-[#FEF9E7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Image
                src="/icons/DownloadExport.svg"
                alt=""
                width={20}
                height={20}
                className="shrink-0"
              />
              {isLabReportDownloading ? "Downloading..." : "Download Now"}
            </button>
          </div>
        </div>
      </Dialog>

      <AddMedicineDialog
        open={isAddMedicineOpen}
        onClose={() => setIsAddMedicineOpen(false)}
        patientId={patient.id}
        branchId={resolvedFilterBranchId}
        onSuccess={() => void refetchPatientMedicineList()}
      />
      <TherapyVitalsDialog
        open={isTherapyVitalsOpen}
        onClose={() => {
          setIsTherapyVitalsOpen(false);
          setTherapyVitalsSessionId(null);
        }}
        sessionId={therapyVitalsSessionId}
      />
      <EditMedicineDialog
        open={isEditMedicineOpen}
        onClose={closeEditMedicine}
        medicine={selectedPatientMedicine}
        onSuccess={() => void refetchPatientMedicineList()}
      />
      <ChangeMedicineDialog
        open={isChangeMedicineOpen}
        onClose={closeChangeMedicine}
        medicine={selectedChangePatientMedicine}
        branchId={resolvedFilterBranchId}
        onSuccess={() => void refetchPatientMedicineList()}
      />

      <MessageDialog
        open={pauseMedicineConfirm !== null}
        onClose={closePauseMedicineConfirm}
        iconSlot={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B8C00] text-2xl font-black text-white">
            ?
          </div>
        }
        message={
          <span className="flex flex-col items-center gap-1.5">
            <span className="text-lg font-bold text-[#262D3B]">Are you sure?</span>
            <span className="text-sm font-medium text-[#7B8089]">Do you want to Pause the Medicine?</span>
          </span>
        }
        confirmText="Confirm"
        cancelText="Close"
        showCancel
        onConfirm={() => void handlePauseMedicineConfirm()}
        onCancel={closePauseMedicineConfirm}
        isActionLoading={isStoppingPatientMedicine}
        width={400}
      />

      <MessageDialog
        open={isPauseMedicineSuccessOpen}
        onClose={closePauseMedicineSuccess}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={<span className="text-lg font-bold text-[#262D3B]">{pauseMedicineDialogMessage}</span>}
        confirmText="Close"
        showCancel={false}
        onConfirm={closePauseMedicineSuccess}
        width={400}
      />

      <MessageDialog
        open={isPauseMedicineErrorOpen}
        onClose={closePauseMedicineError}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={<span className="text-lg font-bold text-[#262D3B]">{pauseMedicineDialogMessage}</span>}
        confirmText="Close"
        showCancel={false}
        onConfirm={closePauseMedicineError}
        width={400}
      />

      <MessageDialog
        open={showNursingNoteSuccessDialog}
        onClose={() => setShowNursingNoteSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={nursingNoteDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowNursingNoteSuccessDialog(false)}
      />

      <MessageDialog
        open={showNursingNoteErrorDialog}
        onClose={() => setShowNursingNoteErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={nursingNoteDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowNursingNoteErrorDialog(false)}
      />

      <MessageDialog
        open={nurseTaskToggleConfirmId !== null}
        onClose={closeNurseTaskToggleConfirm}
        iconSlot={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B8C00] text-2xl font-black text-white">
            ?
          </div>
        }
        message={
          <span className="flex flex-col items-center gap-1.5">
            <span className="text-[16px] font-bold text-[#262D3B]">Are you sure you want to mark this task as complete?</span>
            {/* <span className="text-sm font-medium text-[#7B8089]">Are you sure to change Status?</span> */}
          </span>
        }
        confirmText="Confirm"
        cancelText="Close"
        showCancel
        onConfirm={() => void handleConfirmToggleNurseTask()}
        onCancel={closeNurseTaskToggleConfirm}
        isActionLoading={isUpdatingNurseTaskStatus}
        width={400}
      />

      <MessageDialog
        open={showNurseTaskSuccessDialog}
        onClose={() => setShowNurseTaskSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={nurseTaskDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowNurseTaskSuccessDialog(false)}
      />

      <MessageDialog
        open={showNurseTaskErrorDialog}
        onClose={() => setShowNurseTaskErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={nurseTaskDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowNurseTaskErrorDialog(false)}
      />

    </div>
  );
}

export function mapAssignedPatientRowToDetail(row: {
  id: number;
  patientTitle:string;
  patientName: string;
  patientId: string;
  age: string;
  gender: string;
  accommodation: string;
  doctor: string;
  diagnosis: string;
}): AssignedPatientDetail {
  const bedMatch = row.accommodation.match(/Bed:\s*([^|]+)/i);
  const roomMatch = row.accommodation.match(/Room:\s*([^|]+)/i);

  return {
    id: row.id,
    patientTitle:row.patientTitle,
    patientName: row.patientName,
    patientUhid: row.patientId,
    age: row.age.replace(/Y$/i, " years"),
    gender: row.gender,
    bedNumber: bedMatch?.[1]?.trim() ?? "302",
    roomNumber: roomMatch?.[1]?.trim() ?? "Room 1",
    admissionDate: "Oct 18, 2024",
    treatingDoctor: row.doctor,
    diagnosis: row.diagnosis,
    patientType: "Normal Patient",
  };
}
