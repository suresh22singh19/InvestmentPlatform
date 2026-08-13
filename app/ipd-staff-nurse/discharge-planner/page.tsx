"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { AppShell } from "@/components/layout/AppShell";
import {
  BackToPreviousPageButton,
  Button,
  DatePicker,
  Dialog,
  FormInputField,
  FormSelectField,
  FormTextareaField,
  MessageDialog,
  Pagination,
  PatientTypeButtonGroup,
  SpinnerLoader,
  TableSearchInput,
} from "@/components/ui";
import { Tooltip } from "@/components/ui/Tooltip";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGetDischargeInitiatedPatientsQuery,
  useCreateDischargePatientMutation,
  useViewOnePatientDischargeDetailQuery,
  useStaffNurseGetAllMedicineByBranchListQuery,
  useStaffNurseGetNurseDropdownQuery,
  useGetDietMasterDropdownQuery,
  type CreateDischargePatientRequest,
  type DischargeInitiatedPatientItem,
} from "@/store/api/ipdStaffNurseAPI";
import {
  formatBloodPressureInput,
  formatHeartRateInput,
  formatSpo2Input,
  formatTemperatureInput,
} from "@/components/ipd-staff-nurse/vitalsFormUtils";
import { useAppSelector } from "@/store/hooks";
import {
  selectDosageList,
  selectDurationList,
  selectFrequencyList,
  type LookupItem,
} from "@/store/slices/medicineSlice";

type ChecklistTone = "success" | "warning" | "danger" | "neutral";
type ActionType = "sign-off" | "complete";

type ChecklistItem = {
  label: string;
  status: string;
  detail: string;
  tone: ChecklistTone;
};

type DischargePatient = {
  id: number;
  patientName: string;
  roomLabel: string;
  dischargeDate: string;
  checklist: ChecklistItem[];
  action: ActionType;
};

type MedicineRow = {
  id: string;
  medicineId: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
};

type YesNo = "yes" | "no";

type SignOffFormState = {
  heightFeet: string;
  heightInch: string;
  weight: string;
  bloodGroup: string;
  allergies: string;
  allergiesDetails: string;
  surgeries: string;
  surgeriesDetails: string;
  bloodPressure: string;
  sugarLevel: string;
  temperature: string;
  pulse: string;
  spo2: string;
  medicines: MedicineRow[];
  dietSectionType: string;
  dietInstructions: string;
  educationRemarks: string;
  nextVisitDate: string;
  followUpRemarks: string;
  vitalsCompleted: YesNo;
  medicinesExplained: YesNo;
  dietExplained: YesNo;
  followUpScheduled: YesNo;
  patientEducationDone: YesNo;
  nurseName: string;
  finalRemarks: string;
  signature: string;
};

const STATUS_FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
];

const PAGINATION_OPTIONS = [6, 10, 20, 50];

const BLOOD_GROUP_OPTIONS = [
  { value: "a-positive", label: "A+" },
  { value: "a-negative", label: "A-" },
  { value: "b-positive", label: "B+" },
  { value: "b-negative", label: "B-" },
  { value: "ab-positive", label: "AB+" },
  { value: "ab-negative", label: "AB-" },
  { value: "o-positive", label: "O+" },
  { value: "o-negative", label: "O-" },
];

/** Same timing options as Add Medicine modal (AssignedPatientView) */
const ADD_MEDICINE_TIMING_OPTIONS = [
  { label: "Before Food", value: "BEFORE_FOOD" },
  { label: "After Food", value: "AFTER_FOOD" },
];

function toLookupSelectOptions(list: LookupItem[]) {
  return list.map((item) => ({
    label: item.value,
    value: item.key,
  }));
}

function selectValueAsString(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "");
}

const VITALS_FIELD_ORDER = [
  "heightFeet",
  "heightInch",
  "weight",
  "bloodGroup",
  "allergies",
  "allergiesDetails",
  "surgeries",
  "surgeriesDetails",
  "bloodPressure",
  "sugarLevel",
  "temperature",
  "pulse",
  "spo2",
] as const;

const NURSE_APPROVAL_FIELD_ORDER = ["nurseName", "signature"] as const;

const SIGNOFF_REQUIRED_FIELD_ORDER = [...VITALS_FIELD_ORDER, ...NURSE_APPROVAL_FIELD_ORDER] as const;

/** Same rules as registration vitals fields / registrationSchemas */
const dischargeVitalsValidationSchema = Yup.object({
  heightFeet: Yup.string()
    .trim()
    .optional()
    .required("Weight is required")
    .matches(/^\d+$/, { message: "Height in Feet must contain only digits", excludeEmptyString: true })
    .test("height-feet-range", "Height in Feet must be between 1 and 10", (value) => {
      if (!value) return true;
      const numValue = parseInt(value, 10);
      return numValue >= 1 && numValue <= 10;
    }),
  heightInch: Yup.string()
    .trim()
    .optional()
    .required("Weight is required")
    .matches(/^\d+$/, { message: "Height in Inch must contain only digits", excludeEmptyString: true })
    .test("height-inch-range", "Height in Inch must be between 0 and 11", (value) => {
      if (!value) return true;
      const numValue = parseInt(value, 10);
      return numValue >= 0 && numValue <= 11;
    }),
  weight: Yup.string()
    .trim()
    .required("Weight is required")
    .matches(/^\d+(\.\d{1,2})?$/, "Weight must be a valid number")
    .test("weight-range", "Weight must be between 1 and 500 kg", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 1 && numValue <= 500;
    }),
  bloodGroup: Yup.string()
    .trim()
    .required("Blood Group is required")
    .oneOf(
      [
        "a-positive",
        "a-negative",
        "b-positive",
        "b-negative",
        "ab-positive",
        "ab-negative",
        "o-positive",
        "o-negative",
      ],
      "Please select a valid blood group"
    ),
  allergies: Yup.string()
    .trim()
    .optional()
    .nullable()
    .oneOf(["yes", "no", "Yes", "No", "", undefined], "Please select Yes or No"),
  allergiesDetails: Yup.string().trim().optional(),
  surgeries: Yup.string()
    .trim()
    .optional()
    .nullable()
    .oneOf(["yes", "no", "Yes", "No", "", undefined], "Please select Yes or No"),
  surgeriesDetails: Yup.string().trim().optional(),
  bloodPressure: Yup.string()
    .trim()
    .required("Blood Pressure is required")
    .matches(/^\d+\/\d+$/, "Blood Pressure must be in format Systolic/Diastolic (e.g., 120/80)")
    .test("bp-range", "Blood Pressure must be between 030/030 and 250/250 mmHg", (value) => {
      if (!value) return true;
      const parts = value.split("/");
      if (parts.length !== 2) return false;
      const systolic = parseInt(parts[0], 10);
      const diastolic = parseInt(parts[1], 10);
      if (Number.isNaN(systolic) || Number.isNaN(diastolic)) return false;
      return systolic >= 30 && systolic <= 250 && diastolic >= 30 && diastolic <= 250;
    }),
  sugarLevel: Yup.string()
    .trim()
    .required("Sugar Level is required")
    .matches(/^\d+(\.\d{1,2})?$/, "Sugar Level must be a valid number")
    .test("sugar-range", "Sugar Level must be between 20 and 600 mg/dL", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 20 && numValue <= 600;
    }),
  temperature: Yup.string()
    .trim()
    .required("Temperature is required")
    .matches(/^\d+(\.\d{1,2})?$/, "Temperature must be a valid number")
    .test("temperature-range", "Temperature must be between 86 and 113 °F", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 86 && numValue <= 113;
    }),
  pulse: Yup.string()
    .trim()
    .optional()
    .matches(/^\d+$/, { message: "Pulse must contain only digits", excludeEmptyString: true })
    .test("pulse-range", "Pulse must be between 40 and 200 bpm", (value) => {
      if (!value) return true;
      const numValue = parseInt(value, 10);
      return numValue >= 40 && numValue <= 200;
    }),
  spo2: Yup.string()
    .trim()
    .optional()
    .matches(/^\d+(\.\d{1,2})?$/, { message: "SPO2 must be a valid number", excludeEmptyString: true })
    .test("spo2-range", "SPO2 must be between 70 and 100%", (value) => {
      if (!value) return true;
      const numValue = parseFloat(value);
      return numValue >= 70 && numValue <= 100;
    }),
  nurseName: Yup.string().trim().required("Nurse Name is required"),
  signature: Yup.string().trim().required("Signature is required"),
});

const BLOOD_GROUP_API_MAP: Record<string, string> = {
  "a-positive": "A+",
  "a-negative": "A-",
  "b-positive": "B+",
  "b-negative": "B-",
  "ab-positive": "AB+",
  "ab-negative": "AB-",
  "o-positive": "O+",
  "o-negative": "O-",
};

const BLOOD_GROUP_KEY_FROM_API: Record<string, string> = Object.fromEntries(
  Object.entries(BLOOD_GROUP_API_MAP).map(([key, value]) => [value, key])
);

function toYesNoBoolean(value: YesNo) {
  return value === "yes";
}

function normalizeDosageAmount(amount: string) {
  if (amount === "½") return "0.5";
  if (amount === "¼") return "0.25";
  if (amount === "1½") return "1.5";
  return amount;
}

/** Same parsing rules as Add Medicine modal (AssignedPatientView) */
function parseDosageFromLookup(key: string, dosageList: LookupItem[]) {
  const item = dosageList.find((entry) => entry.key === key);
  if (!item) return { dosageAmount: "", dosageUnit: "" };

  const match = item.value.trim().match(/^([0-9/.¼-¾⅐-↉½]+)\s*(.*)$/i);
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

/** Same parsing rules as Add Medicine modal (AssignedPatientView) */
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

/** Reverse of parseDosageFromLookup - finds the lookup key matching an amount/unit pair from the API */
function findDosageLookupKey(dosageAmount: string, dosageUnit: string, dosageList: LookupItem[]) {
  const match = dosageList.find((item) => {
    const parsed = parseDosageFromLookup(item.key, dosageList);
    return parsed.dosageAmount === dosageAmount && parsed.dosageUnit === dosageUnit;
  });
  return match?.key || "";
}

/** Reverse of parseDurationFromLookup - finds the lookup key matching an amount/unit pair from the API */
function findDurationLookupKey(durationAmount: string, durationUnit: string, durationList: LookupItem[]) {
  const match = durationList.find((item) => {
    const parsed = parseDurationFromLookup(item.key, durationList);
    return parsed.durationAmount === durationAmount && parsed.durationUnit === durationUnit;
  });
  return match?.key || "";
}

/** Drops keys whose value is empty (blank string, empty array, null/undefined) so only fields with actual values are sent to the API. */
function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((key) => {
    const value = obj[key];
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    result[key] = value;
  });
  return result;
}

function buildCreateDischargePayload(
  patientId: number,
  values: SignOffFormState,
  dosageList: LookupItem[],
  durationList: LookupItem[]
): CreateDischargePatientRequest {
  const vitals = omitEmpty({
    heightFeet: values.heightFeet ? Number(values.heightFeet) : undefined,
    heightInch: values.heightInch !== "" ? Number(values.heightInch) : undefined,
    weight: values.weight ? Number(values.weight) : undefined,
    bloodGroup: values.bloodGroup
      ? BLOOD_GROUP_API_MAP[values.bloodGroup] || values.bloodGroup
      : undefined,
    allergies: values.allergies ? toYesNoBoolean(values.allergies as YesNo) : undefined,
    surgeries: values.surgeries ? toYesNoBoolean(values.surgeries as YesNo) : undefined,
    bloodPressure: values.bloodPressure || undefined,
    sugarLevel: values.sugarLevel ? Number(values.sugarLevel) : undefined,
    temperature: values.temperature ? Number(values.temperature) : undefined,
    pulse: values.pulse ? Number(values.pulse) : undefined,
    spo2: values.spo2 ? Number(values.spo2) : undefined,
  });

  const medicalInformation = values.medicines
    .filter((row) => row.medicineId)
    .map((row) => {
      const { dosageAmount, dosageUnit } = parseDosageFromLookup(row.dosage, dosageList);
      const { durationAmount, durationUnit } = parseDurationFromLookup(row.duration, durationList);
      return {
        medicineId: Number(row.medicineId),
        dosageAmount,
        dosageUnit,
        frequencyType: row.frequency,
        timingType: row.timing,
        durationAmount: durationAmount ? Number(durationAmount) : 0,
        durationUnit,
      };
    });

  return omitEmpty({
    patientId,
    vitals: Object.keys(vitals).length > 0 ? vitals : undefined,
    medicalInformation,
    dietTypeId: values.dietSectionType ? Number(values.dietSectionType) : undefined,
    dietTypeInstruction: values.dietInstructions,
    educationRemarks: values.educationRemarks,
    followUpDate: values.nextVisitDate,
    followUpRemarks: values.followUpRemarks,
    vitalsCompleted: toYesNoBoolean(values.vitalsCompleted),
    medicinesExplained: toYesNoBoolean(values.medicinesExplained),
    dietExplained: toYesNoBoolean(values.dietExplained),
    followUpScheduled: toYesNoBoolean(values.followUpScheduled),
    patientEducationDone: toYesNoBoolean(values.patientEducationDone),
    nurseName: values.nurseName,
    finalRemarks: values.finalRemarks,
    signature: values.signature,
    status: "completed",
  }) as CreateDischargePatientRequest;
}

function formatSugarLevelInput(rawValue: string) {
  let value = rawValue.replace(/[^0-9.]/g, "");
  const parts = value.split(".");
  if (parts.length > 2) {
    value = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  if (value.includes(".")) {
    const dotIndex = value.indexOf(".");
    value = value.slice(0, dotIndex + 3);
  }
  value = value.slice(0, 6);
  if (value) {
    const numValue = parseFloat(value);
    if (numValue > 600) return "600";
  }
  return value;
}

function formatHeightFeetInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 2);
  if (!digitsOnly) return "";
  const numValue = parseInt(digitsOnly, 10);
  if (numValue < 1) return "1";
  if (numValue > 10) return "10";
  return String(numValue);
}

function formatHeightInchInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 2);
  if (!digitsOnly) return "";
  const numValue = parseInt(digitsOnly, 10);
  if (numValue < 0) return "0";
  if (numValue > 11) return "11";
  return String(numValue);
}

function formatWeightInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 3);
  if (!digitsOnly) return "";
  const numValue = parseInt(digitsOnly, 10);
  if (numValue < 1) return "1";
  if (numValue > 500) return "500";
  return String(numValue);
}
const CHECKLIST_FIELD_CONFIG = [
  {
    key: "patientEducationDone" as const,
    label: "Patient Education",
    completedDetail: "Education completed.",
    pendingDetail: "Education pending.",
  },
  {
    key: "followUpScheduled" as const,
    label: "Follow-up Scheduled",
    completedDetail: "Follow-up scheduled.",
    pendingDetail: "Follow-up pending.",
  },
  {
    key: "medicinesExplained" as const,
    label: "Medicines Explained",
    completedDetail: "Medicines explained.",
    pendingDetail: "Medicines pending.",
  },
  {
    key: "vitalsCompleted" as const,
    label: "Vitals Completed",
    completedDetail: "Vitals completed.",
    pendingDetail: "Vitals pending.",
  },
  {
    key: "dietExplained" as const,
    label: "Diet Explained",
    completedDetail: "Diet explained.",
    pendingDetail: "Diet pending.",
  },
];

function formatDischargeDate(dateValue: string | null | undefined) {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatRoomLabel(item: DischargeInitiatedPatientItem) {
  const room = item.roomNumber?.trim() || "N/A";
  const bed = item.bedNumber?.trim() || "N/A";
  const building = item.buildingName?.trim();
  return building ? `Room No. ${room} • Bed No. ${bed} • ${building}` : `Room No. ${room} • Bed No. ${bed}`;
}

function mapBooleanChecklistItem(
  value: boolean | null | undefined,
  label: string,
  completedDetail: string,
  pendingDetail: string
): ChecklistItem {
  if (value === true) {
    return {
      label,
      status: "Completed",
      detail: completedDetail,
      tone: "success",
    };
  }

  if (value === false) {
    return {
      label,
      status: "Incomplete",
      detail: pendingDetail,
      tone: "danger",
    };
  }

  return {
    label,
    status: "Pending",
    detail: pendingDetail,
    tone: "neutral",
  };
}

const TRUNCATED_TABLE_CELL_WIDTH = 200;


function TruncatedTableCell({ text }: { text: string }) {
  const value = text?.trim() ? text.trim() : "N/A";
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
        className="flex min-w-0 items-center"
        style={{ width: TRUNCATED_TABLE_CELL_WIDTH, maxWidth: TRUNCATED_TABLE_CELL_WIDTH }}
      >
        <span
          ref={textRef}
          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
        >
          {value}
        </span>
        {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
      </div>
    </Tooltip>
  );
}



function mapDischargeItemToCard(item: DischargeInitiatedPatientItem): DischargePatient {
  const checklist = CHECKLIST_FIELD_CONFIG.map((field) =>
    mapBooleanChecklistItem(
      item[field.key],
      field.label,
      field.completedDetail,
      field.pendingDetail
    )
  );

  const isCompleted = item.PatientDischargeStatus === "completed";

  return {
    id: item.id,
    patientName: [item.patientTitle, item.patientName].filter(Boolean).join(" ") || "N/A",
    roomLabel: formatRoomLabel(item),
    dischargeDate: formatDischargeDate(item.createdAt),
    checklist,
    action: isCompleted ? "complete" : "sign-off",
  };
}
const CHECKLIST_TONE_STYLES: Record<
  ChecklistTone,
  { border: string; bg: string; iconBg: string; iconColor: string }
> = {
  success: {
    border: "border-l-[#0B8C00]",
    bg: "bg-[#F2F9F2]",
    iconBg: "bg-[#0B8C00]",
    iconColor: "text-white",
  },
  warning: {
    border: "border-l-[#EA580C]",
    bg: "bg-[#FFF7ED]",
    iconBg: "bg-[#EA580C]",
    iconColor: "text-white",
  },
  danger: {
    border: "border-l-[#DC2626]",
    bg: "bg-[#FEF2F2]",
    iconBg: "bg-[#DC2626]",
    iconColor: "text-white",
  },
  neutral: {
    border: "border-l-[#CBD5E1]",
    bg: "bg-[#F8FAFC]",
    iconBg: "bg-white border border-[#CBD5E1]",
    iconColor: "text-[#94A3B8]",
  },
};

function createEmptyMedicineRow(): MedicineRow {
  return {
    id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    medicineId: "",
    dosage: "",
    frequency: "",
    duration: "",
    timing: "",
  };
}

function createInitialSignOffForm(): SignOffFormState {
  return {
    heightFeet: "",
    heightInch: "",
    weight: "",
    bloodGroup: "",
    allergies: "",
    allergiesDetails: "",
    surgeries: "",
    surgeriesDetails: "",
    bloodPressure: "",
    sugarLevel: "",
    temperature: "",
    pulse: "",
    spo2: "",
    medicines: [createEmptyMedicineRow()],
    dietSectionType: "",
    dietInstructions: "",
    educationRemarks: "",
    nextVisitDate: "",
    followUpRemarks: "",
    vitalsCompleted: "yes",
    medicinesExplained: "yes",
    dietExplained: "yes",
    followUpScheduled: "yes",
    patientEducationDone: "yes",
    nurseName: "",
    finalRemarks: "",
    signature: "",
  };
}

function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)] ${className}`}
    >
      <h3 className="mb-4 text-base font-semibold text-[#262D3B]">{title}</h3>
      {children}
    </section>
  );
}

function StatusIcon({ tone }: { tone: ChecklistTone }) {
  const styles = CHECKLIST_TONE_STYLES[tone];

  if (tone === "success") {
    return (
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${styles.iconBg} ${styles.iconColor}`}
      >
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (tone === "warning") {
    return (
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${styles.iconBg} ${styles.iconColor}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    );
  }

  if (tone === "danger") {
    return (
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${styles.iconBg} ${styles.iconColor}`}
      >
        <span className="text-[11px] font-bold leading-none">!</span>
      </span>
    );
  }

  return (
    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${styles.iconBg}`}>
      <span className="h-2 w-2 rounded-full border border-[#94A3B8]" />
    </span>
  );
}

function ChecklistStatusCard({ item }: { item: ChecklistItem }) {
  const styles = CHECKLIST_TONE_STYLES[item.tone];
    //  console.log("stylesgsdygds",styles)
  return (
    <div
      className={`rounded-[14px] border border-[#EDF3EA] border-l-4 px-3 py-3 ${styles.border} ${styles.bg}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[#7B8089]">{item.label}</p>
        <StatusIcon tone={item.tone} />
      </div>
      <p className="text-sm font-semibold text-[#262D3B]">{item.status}</p>
      {/* <p className="mt-1 text-xs text-[#7B8089]">{item.detail}</p> */}
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
}) {
  return (
    <PatientTypeButtonGroup
      options={["Yes", "No"]}
      value={value}
      onChange={(next) => onChange(next as YesNo)}
      label={label}
    />
  );
}

function DischargeSignOffForm({
  patient,
  onBack,
  onSuccess,
}: {
  patient: DischargePatient;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const heightFeetRef = useRef<HTMLInputElement>(null);
  const heightInchRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const bloodGroupRef = useRef<HTMLDivElement>(null);
  const allergiesRef = useRef<HTMLDivElement>(null);
  const surgeriesRef = useRef<HTMLDivElement>(null);
  const bloodPressureRef = useRef<HTMLInputElement>(null);
  const sugarLevelRef = useRef<HTMLInputElement>(null);
  const temperatureRef = useRef<HTMLInputElement>(null);
  const pulseRef = useRef<HTMLInputElement>(null);
  const spo2Ref = useRef<HTMLInputElement>(null);
  const nurseNameRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  const [showAllergiesDialog, setShowAllergiesDialog] = useState(false);
  const [allergiesDetailText, setAllergiesDetailText] = useState("");
  const [showSurgeriesDialog, setShowSurgeriesDialog] = useState(false);
  const [surgeriesDetailText, setSurgeriesDetailText] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const [createDischargePatient, { isLoading: isSubmittingDischarge }] =
    useCreateDischargePatientMutation();

  const { resolvedFilterBranchId: branchId } = useIPDNurseResolvedBranchId();
  const dosageList = useAppSelector(selectDosageList);
  const frequencyList = useAppSelector(selectFrequencyList);
  const durationList = useAppSelector(selectDurationList);

  const { data: medicinesData, isLoading: isMedicineListLoading } =
    useStaffNurseGetAllMedicineByBranchListQuery(
      { branchId: branchId ?? 0 },
      { skip: branchId == null, refetchOnMountOrArgChange: true }
    );

  const { data: nurseDropdownData, isLoading: isNurseListLoading } = useStaffNurseGetNurseDropdownQuery(
    { branchId: branchId ?? 0 },
    { skip: branchId == null, refetchOnMountOrArgChange: true }
  );

  const nurseOptions = useMemo(
    () =>
      (nurseDropdownData?.data ?? []).map((nurse) => ({
        label: nurse.name,
        value: nurse.name,
      })),
    [nurseDropdownData?.data]
  );

  const { data: dietMasterDropdownData, isLoading: isDietTypeListLoading } =
    useGetDietMasterDropdownQuery(
      { branchId: branchId ?? 0 },
      { skip: branchId == null, refetchOnMountOrArgChange: true }
    );

  const dietTypeOptions = useMemo(
    () =>
      (dietMasterDropdownData?.data ?? []).map((diet) => ({
        label: diet.diet,
        value: String(diet.id),
      })),
    [dietMasterDropdownData?.data]
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

  const formik = useFormik<SignOffFormState>({
    initialValues: createInitialSignOffForm(),
    validationSchema: dischargeVitalsValidationSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: () => {
      // Save handler – API integration can be added later

    },
  });

  const { data: dischargeDetailData } = useViewOnePatientDischargeDetailQuery(patient.id, {
    skip: !patient.id,
    refetchOnMountOrArgChange: true,
  });

  const hasPopulatedFromDetailRef = useRef(false);

  useEffect(() => {
    const detail = dischargeDetailData?.data;
    if (!detail || hasPopulatedFromDetailRef.current) return;
    hasPopulatedFromDetailRef.current = true;

    const vitals = detail.vitals;
    const medicines = detail.medicalInformation?.length
      ? detail.medicalInformation.map((med) => ({
          id: `med-${med.id}`,
          medicineId: String(med.medicineId),
          dosage: findDosageLookupKey(med.dosageAmount, med.dosageUnit, dosageList),
          frequency: med.frequencyType || "",
          duration: findDurationLookupKey(med.durationAmount, med.durationUnit, durationList),
          timing: med.timingType || "",
        }))
      : [createEmptyMedicineRow()];

    const matchedNurse = nurseDropdownData?.data?.find((nurse) => nurse.id === detail.dischargeBy);

    void formik.setValues({
      heightFeet: detail.heightFeet != null ? String(detail.heightFeet) : "",
      heightInch: detail.heightInch != null ? String(detail.heightInch) : "",
      weight: detail.weight != null ? String(detail.weight) : "",
      bloodGroup: detail.bloodGroup ? BLOOD_GROUP_KEY_FROM_API[detail.bloodGroup] || "" : "",
      allergies: detail.allergies ? "yes" : "no",
      allergiesDetails: "",
      surgeries: detail.surgeries ? "yes" : "no",
      surgeriesDetails: "",
      bloodPressure: vitals?.bloodPressure || "",
      sugarLevel: vitals?.sugarLevel || "",
      temperature: vitals?.temperature || "",
      pulse: vitals?.pulse || "",
      spo2: vitals?.spo2 || "",
      medicines,
      dietSectionType: detail.dietTypeId != null ? String(detail.dietTypeId) : "",
      dietInstructions: detail.dietTypeInstruction || "",
      educationRemarks: detail.educationRemarks || "",
      nextVisitDate: detail.followUpDate || "",
      followUpRemarks: detail.followUpRemarks || "",
      vitalsCompleted: detail.vitalsCompleted ? "yes" : "no",
      medicinesExplained: detail.medicinesExplained ? "yes" : "no",
      dietExplained: detail.dietExplained ? "yes" : "no",
      followUpScheduled: detail.followUpScheduled ? "yes" : "no",
      patientEducationDone: detail.patientEducationDone ? "yes" : "no",
      nurseName: matchedNurse?.name || "",
      finalRemarks: detail.remark || "",
      signature: detail.signature || "",
    }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dischargeDetailData, dosageList, durationList, nurseDropdownData]);

  const vitalsErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    SIGNOFF_REQUIRED_FIELD_ORDER.forEach((field) => {
      const touched = formik.touched[field];
      const error = formik.errors[field];
      if (touched && typeof error === "string") {
        errors[field] = error;
      }
    });
    return errors;
  }, [formik.touched, formik.errors]);

  const scrollToFirstVitalsError = (errors: Record<string, string>) => {
    const fieldRefs: Record<string, RefObject<HTMLElement | null>> = {
      heightFeet: heightFeetRef,
      heightInch: heightInchRef,
      weight: weightRef,
      bloodGroup: bloodGroupRef,
      allergies: allergiesRef,
      surgeries: surgeriesRef,
      bloodPressure: bloodPressureRef,
      sugarLevel: sugarLevelRef,
      temperature: temperatureRef,
      pulse: pulseRef,
      spo2: spo2Ref,
      nurseName: nurseNameRef,
      signature: signatureRef,
    };

    for (const field of SIGNOFF_REQUIRED_FIELD_ORDER) {
      if (!errors[field]) continue;
      const ref = fieldRefs[field];
      const element =
        ref?.current ||
        (typeof document !== "undefined"
          ? (document.querySelector(`[data-field="${field}"]`) as HTMLElement | null)
          : null);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        if ("focus" in element && typeof element.focus === "function") {
          element.focus();
        }
        break;
      }
    }
  };

  const handleSave = async () => {
    try {
      const touched = SIGNOFF_REQUIRED_FIELD_ORDER.reduce<Record<string, boolean>>((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      await formik.setTouched({ ...formik.touched, ...touched }, false);
      const errors = await formik.validateForm();
      const vitalsErrorMap = SIGNOFF_REQUIRED_FIELD_ORDER.reduce<Record<string, string>>((acc, field) => {
        const error = errors[field];
        if (typeof error === "string") acc[field] = error;
        return acc;
      }, {});

      if (Object.keys(vitalsErrorMap).length > 0) {
        scrollToFirstVitalsError(vitalsErrorMap);
        return;
      }

      const payload = buildCreateDischargePayload(
        patient.id,
        formik.values,
        dosageList,
        durationList
      );
      const result = await createDischargePatient({
        branchId: branchId ?? 0,
        body: payload,
      }).unwrap();
      setDialogMessage(result.message || "Patient discharge created successfully");
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Discharge sign-off save failed:", error);
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;
      setDialogMessage(message || "Failed to create patient discharge. Please try again.");
      setShowErrorDialog(true);
    }
  };

  const handleVitalsChange = (field: keyof SignOffFormState, value: string) => {
    let nextValue = value;
    if (field === "heightFeet") nextValue = formatHeightFeetInput(value);
    else if (field === "heightInch") nextValue = formatHeightInchInput(value);
    else if (field === "weight") nextValue = formatWeightInput(value);
    else if (field === "bloodPressure") nextValue = formatBloodPressureInput(value);
    else if (field === "sugarLevel") nextValue = formatSugarLevelInput(value);
    else if (field === "temperature") nextValue = formatTemperatureInput(value);
    else if (field === "pulse") nextValue = formatHeartRateInput(value);
    else if (field === "spo2") nextValue = formatSpo2Input(value);

    void formik.setFieldValue(field, nextValue, false);

    if (field === "bloodPressure") {
      const hasError = !!formik.errors.bloodPressure;
      const isCompleteFormat = /^\d{3}\/\d{3}$/.test(nextValue);
      if (hasError || isCompleteFormat) {
        setTimeout(() => {
          void formik.setFieldTouched("bloodPressure", true, false);
          void formik.validateField("bloodPressure");
        }, 0);
      }
      return;
    }

    if (field === "bloodGroup" && nextValue.trim() !== "") {
      setTimeout(() => {
        void formik.setFieldTouched(field, true, false);
        void formik.validateField(field);
      }, 10);
    }

    if (field === "allergies" || field === "surgeries") {
      setTimeout(() => {
        void formik.setFieldTouched(field, true, false);
        void formik.validateField(field);
      }, 10);
    }

    if (field === "allergies") {
      if (nextValue.toLowerCase() === "yes") {
        setAllergiesDetailText(formik.values.allergiesDetails || "");
        setShowAllergiesDialog(true);
      } else if (nextValue.toLowerCase() === "no") {
        void formik.setFieldValue("allergiesDetails", "", false);
      }
    }

    if (field === "surgeries") {
      if (nextValue.toLowerCase() === "yes") {
        setSurgeriesDetailText(formik.values.surgeriesDetails || "");
        setShowSurgeriesDialog(true);
      } else if (nextValue.toLowerCase() === "no") {
        void formik.setFieldValue("surgeriesDetails", "", false);
      }
    }

    const inputFields = [
      "heightFeet",
      "heightInch",
      "weight",
      "bloodPressure",
      "sugarLevel",
      "temperature",
      "pulse",
      "spo2",
    ];
    if (inputFields.includes(field)) {
      const isTouched = formik.touched[field as keyof typeof formik.touched];
      const hasError = formik.errors[field as keyof typeof formik.errors];
      if (isTouched || hasError) {
        setTimeout(() => {
          void formik.validateField(field);
        }, 0);
      }
    }
  };

  const handleVitalsBlur = (field: keyof SignOffFormState) => {
    void formik.setFieldTouched(field, true, false);
    void formik.validateField(field);
  };

  const updateMedicine = (id: string, key: keyof Omit<MedicineRow, "id">, value: string) => {
    void formik.setFieldValue(
      "medicines",
      formik.values.medicines.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  };

  const addMedicineRow = () => {
    void formik.setFieldValue("medicines", [...formik.values.medicines, createEmptyMedicineRow()]);
  };

  const removeMedicineRow = (id: string) => {
    const medicines = formik.values.medicines;
    void formik.setFieldValue(
      "medicines",
      medicines.length <= 1 ? medicines : medicines.filter((row) => row.id !== id)
    );
  };
  console.log("patient",patient)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
            Discharge Planner
          </h1>
          <p className="mt-1 text-sm text-[#434956] flex gap-1">
            Final sign-off for <span className="font-semibold text-[#262D3B]">
              {/* {patient.patientName} */}
                  <TruncatedTableCell
                  key={`Discharge-list-${patient.id}`}
                  text={`${patient.patientName|| "N/A"}`}
                  />
              </span>
            {" • "}
            {patient.roomLabel}
          </p>
        </div>
        <BackToPreviousPageButton text="Back" onClick={onBack} />
      </div>

      <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
        <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
          <Image src="/icons/VitalsIcon.svg" alt="Vital info" width={20} height={20} /> Vital Details
        </h2>

        {/* Row 1: Height Feet, Height Inch, Weight, Blood Group */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div data-field="heightFeet" className="scroll-mt-4" ref={heightFeetRef}>
            <FormInputField
              label="Height in Feet"
              value={formik.values.heightFeet}
              onChange={(e) => handleVitalsChange("heightFeet", e.target.value)}
              onBlur={() => handleVitalsBlur("heightFeet")}
              placeholder="ft"
              type="tel"
              maxLength={2}
              error={vitalsErrors.heightFeet}
            />
          </div>

          <div data-field="heightInch" className="scroll-mt-4" ref={heightInchRef}>
            <FormInputField
              label="Height in Inch"
              value={formik.values.heightInch}
              onChange={(e) => handleVitalsChange("heightInch", e.target.value)}
              onBlur={() => handleVitalsBlur("heightInch")}
              placeholder="in"
              type="tel"
              maxLength={2}
              error={vitalsErrors.heightInch}
            />
          </div>

          <div data-field="weight" className="scroll-mt-4">
            <div className="relative w-full">
              <FormInputField
                ref={weightRef}
                label="Weight *"
                value={formik.values.weight}
                onChange={(e) => handleVitalsChange("weight", e.target.value)}
                onBlur={() => handleVitalsBlur("weight")}
                placeholder="Weight"
                required
                type="tel"
                className="pr-10"
                maxLength={3}
                error={vitalsErrors.weight}
              />
              <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                kg
              </span>
            </div>
          </div>

          <div data-field="bloodGroup" className="scroll-mt-4" ref={bloodGroupRef}>
            <FormSelectField
              label="Blood Group *"
              options={BLOOD_GROUP_OPTIONS}
              value={formik.values.bloodGroup || null}
              onChange={(value) => {
                const selectedValue = Array.isArray(value) ? value[0] : value;
                handleVitalsChange("bloodGroup", selectedValue || "");
              }}
              onBlur={() => handleVitalsBlur("bloodGroup")}
              placeholder="Select"
              mode="single"
              background="white"
            />
            {vitalsErrors.bloodGroup && (
              <p className="mt-1 text-xs text-[#F6776E]">{vitalsErrors.bloodGroup}</p>
            )}
          </div>
        </div>

        {/* Row 2: Allergies, Surgeries, Blood Pressure, Sugar Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div data-field="allergies" className="scroll-mt-4" ref={allergiesRef}>
            <div className="flex items-start gap-2">
              <div className="flex-grow">
                <PatientTypeButtonGroup
                  options={["Yes", "No"]}
                  value={formik.values.allergies}
                  onChange={(value) => handleVitalsChange("allergies", value)}
                  label="Allergies"
                  required={false}
                  error={vitalsErrors.allergies}
                  fieldRef={allergiesRef}
                  dataField="allergies"
                />
              </div>
              {formik.values.allergies?.toLowerCase() === "yes" && formik.values.allergiesDetails && (
                <div className="mt-5 shrink-0 flex items-center h-6">
                  <Tooltip content={formik.values.allergiesDetails} position="top" delay={0}>
                    <div className="cursor-pointer hover:scale-105 transition-all flex items-center justify-center bg-[#E8F5E9] rounded-full p-[3px] border border-[#0B8C00]/30 shadow-sm">
                      <Image src="/icons/infoIcon.svg" alt="Allergies Details" width={14} height={14} />
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>

          <div data-field="surgeries" className="scroll-mt-4" ref={surgeriesRef}>
            <div className="flex items-start gap-2">
              <div className="flex-grow">
                <PatientTypeButtonGroup
                  options={["Yes", "No"]}
                  value={formik.values.surgeries}
                  onChange={(value) => handleVitalsChange("surgeries", value)}
                  label="Surgeries"
                  required={false}
                  error={vitalsErrors.surgeries}
                  fieldRef={surgeriesRef}
                  dataField="surgeries"
                />
              </div>
              {formik.values.surgeries?.toLowerCase() === "yes" && formik.values.surgeriesDetails && (
                <div className="mt-5 shrink-0 flex items-center h-6">
                  <Tooltip content={formik.values.surgeriesDetails} position="top" delay={0}>
                    <div className="cursor-pointer hover:scale-105 transition-all flex items-center justify-center bg-[#E8F5E9] rounded-full p-[3px] border border-[#0B8C00]/30 shadow-sm">
                      <Image src="/icons/infoIcon.svg" alt="Surgeries Details" width={14} height={14} />
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>

          <div data-field="bloodPressure" className="scroll-mt-4">
            <div className="relative w-full">
              <FormInputField
                ref={bloodPressureRef}
                label="Blood Pressure *"
                value={formik.values.bloodPressure}
                onChange={(e) => handleVitalsChange("bloodPressure", e.target.value)}
                onBlur={() => handleVitalsBlur("bloodPressure")}
                placeholder="Systolic/Diastolic(mmHg/mmHg)"
                required
                type="text"
                className="pr-10"
                maxLength={7}
                error={vitalsErrors.bloodPressure}
              />
              <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                mmHg
              </span>
            </div>
          </div>

          <div data-field="sugarLevel" className="scroll-mt-4">
            <div className="relative w-full">
              <FormInputField
                ref={sugarLevelRef}
                label="Sugar Level *"
                value={formik.values.sugarLevel}
                onChange={(e) => handleVitalsChange("sugarLevel", e.target.value)}
                onBlur={() => handleVitalsBlur("sugarLevel")}
                placeholder="Sugar Level"
                required
                type="text"
                className="pr-10"
                maxLength={5}
                error={vitalsErrors.sugarLevel}
              />
              <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                mg/dL
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: Temperature, Pulse, and SPO2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div data-field="temperature" className="scroll-mt-4">
            <div className="relative w-full">
              <FormInputField
                ref={temperatureRef}
                label="Temperature *"
                value={formik.values.temperature}
                onChange={(e) => handleVitalsChange("temperature", e.target.value)}
                onBlur={() => handleVitalsBlur("temperature")}
                placeholder="Temperature (°F)"
                required
                type="text"
                className="pr-10"
                maxLength={5}
                error={vitalsErrors.temperature}
              />
              <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                °F
              </span>
            </div>
          </div>

          <div data-field="pulse" className="scroll-mt-4">
            <div className="relative w-full">
              <FormInputField
                ref={pulseRef}
                label="Pulse"
                value={formik.values.pulse}
                onChange={(e) => handleVitalsChange("pulse", e.target.value)}
                onBlur={() => handleVitalsBlur("pulse")}
                placeholder="Pulse"
                type="tel"
                className="pr-10"
                maxLength={3}
                error={vitalsErrors.pulse}
              />
              <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                bpm
              </span>
            </div>
          </div>

          <div data-field="spo2" className="scroll-mt-4">
            <div className="relative w-full">
              <FormInputField
                ref={spo2Ref}
                label="SPO2"
                value={formik.values.spo2}
                onChange={(e) => handleVitalsChange("spo2", e.target.value)}
                onBlur={() => handleVitalsBlur("spo2")}
                placeholder="SPO2"
                type="tel"
                className="pr-10"
                maxLength={3}
                error={vitalsErrors.spo2}
              />
              <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard title="Medical Information" className="xl:col-span-2">
          <div className="space-y-3">
            <div className="w-full overflow-x-auto rounded-[8px] border border-[#DFE0E2]">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-[#444242]">
                      Medicine Name
                    </th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-[#444242]">
                      Dosage
                    </th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-[#444242]">
                      Frequency
                    </th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-[#444242]">
                      Duration
                    </th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-[#444242]">
                      Time
                    </th>
                    <th className="px-3 py-3 text-center text-[13px] font-semibold text-[#444242]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formik.values.medicines.map((row) => (
                    <tr key={row.id} className="bg-white align-middle">
                      <td className="min-w-[180px] px-2 py-2">
                        <FormSelectField
                          label="Medicine Name"
                          hideLabel
                          width="100%"
                          background="white"
                          value={row.medicineId}
                          options={medicineOptions}
                          onChange={(value) =>
                            updateMedicine(row.id, "medicineId", selectValueAsString(value))
                          }
                          placeholder={
                            isMedicineListLoading ? "Loading medicines..." : "Select"
                          }
                          disabled={isMedicineListLoading}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <FormSelectField
                          label="Dosage"
                          hideLabel
                          width="100%"
                          background="white"
                          value={row.dosage}
                          options={dosageOptions}
                          onChange={(value) =>
                            updateMedicine(row.id, "dosage", selectValueAsString(value))
                          }
                          placeholder="Select"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <FormSelectField
                          label="Frequency"
                          hideLabel
                          width="100%"
                          background="white"
                          value={row.frequency}
                          options={frequencyOptions}
                          onChange={(value) =>
                            updateMedicine(row.id, "frequency", selectValueAsString(value))
                          }
                          placeholder="Select"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <FormSelectField
                          label="Duration"
                          hideLabel
                          width="100%"
                          background="white"
                          value={row.duration}
                          options={durationOptions}
                          onChange={(value) =>
                            updateMedicine(row.id, "duration", selectValueAsString(value))
                          }
                          placeholder="Duration"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <FormSelectField
                          label="Time"
                          hideLabel
                          width="100%"
                          background="white"
                          value={row.timing}
                          options={timingOptions}
                          onChange={(value) =>
                            updateMedicine(row.id, "timing", selectValueAsString(value))
                          }
                          placeholder="Select"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeMedicineRow(row.id)}
                            className="flex items-center justify-center rounded-full bg-[#FEE2E2] transition-colors cursor-pointer"
                            aria-label="Remove medicine row"
                          >
                            <Image src="/icons/redcrossIcon.svg" alt="" width={22} height={22} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="primary"
              size="small"
              className="!min-w-0"
              onClick={addMedicineRow}
            >
              Add Row
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Diet">
          <div className="space-y-4">
            <FormSelectField
              label="Diet Type"
              width="100%"
              value={formik.values.dietSectionType}
              options={dietTypeOptions}
              onChange={(value) =>
                void formik.setFieldValue(
                  "dietSectionType",
                  Array.isArray(value) ? value[0] || "" : String(value || "")
                )
              }
              background="white"
              placeholder={isDietTypeListLoading ? "Loading diet types..." : "Diet Type"}
              disabled={isDietTypeListLoading}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-[#434956]">
                Diet Instructions
              </label>
              <textarea
                value={formik.values.dietInstructions}
                onChange={(e) => void formik.setFieldValue("dietInstructions", e.target.value)}
                placeholder="Diet Instructions"
                rows={6}
                className="w-full resize-none rounded-[20px] border border-[#DFE0E2] bg-white px-4 py-3 text-sm font-medium text-[#434956] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Patient Education">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#434956]">
            Education Remarks
          </label>
          <textarea
            value={formik.values.educationRemarks}
            onChange={(e) => void formik.setFieldValue("educationRemarks", e.target.value)}
            placeholder="Education Remarks..."
            rows={4}
            className="w-full resize-none rounded-[20px] border border-[#DFE0E2] bg-white px-4 py-3 text-sm font-medium text-[#434956] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Follow-Up">
          <div className="space-y-4">
            <DatePicker
              label="Next Visit Date"
              value={formik.values.nextVisitDate}
              onChange={(value) => void formik.setFieldValue("nextVisitDate", value)}
              placeholder="DD-MM-YYYY"
              width="100%"
              disablePastDates={false}
              background="white"
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-[#434956]">Remarks</label>
              <textarea
                value={formik.values.followUpRemarks}
                onChange={(e) => void formik.setFieldValue("followUpRemarks", e.target.value)}
                placeholder="Instructions for next visit..."
                rows={5}
                className="w-full resize-none rounded-[20px] border border-[#DFE0E2] bg-white px-4 py-3 text-sm font-medium text-[#434956] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Nurse Final Approval">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <YesNoField
                label="Vitals Completed"
                value={formik.values.vitalsCompleted}
                onChange={(value) => void formik.setFieldValue("vitalsCompleted", value)}
              />
              <YesNoField
                label="Medicines Explained"
                value={formik.values.medicinesExplained}
                onChange={(value) => void formik.setFieldValue("medicinesExplained", value)}
              />
              <YesNoField
                label="Diet Explained"
                value={formik.values.dietExplained}
                onChange={(value) => void formik.setFieldValue("dietExplained", value)}
              />
              <YesNoField
                label="Follow-up Scheduled"
                value={formik.values.followUpScheduled}
                onChange={(value) => void formik.setFieldValue("followUpScheduled", value)}
              />
              <YesNoField
                label="Patient Education"
                value={formik.values.patientEducationDone}
                onChange={(value) => void formik.setFieldValue("patientEducationDone", value)}
              />
            </div>

            <div data-field="nurseName" className="scroll-mt-4" ref={nurseNameRef}>
              <FormSelectField
                label="Nurse Name *"
                width="100%"
                background="white"
                value={formik.values.nurseName}
                options={nurseOptions}
                onChange={(value) => {
                  void formik.setFieldValue("nurseName", selectValueAsString(value));
                  void formik.setFieldTouched("nurseName", true, false);
                }}
                onBlur={() => {
                  void formik.setFieldTouched("nurseName", true, false);
                  void formik.validateField("nurseName");
                }}
                placeholder={isNurseListLoading ? "Loading nurses..." : "Select Nurse"}
                disabled={isNurseListLoading}
              />
              {vitalsErrors.nurseName && (
                <p className="mt-1 text-xs text-[#F6776E]">{vitalsErrors.nurseName}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#434956]">
                Final Remarks
              </label>
              <textarea
                value={formik.values.finalRemarks}
                onChange={(e) => void formik.setFieldValue("finalRemarks", e.target.value)}
                placeholder="Final Remarks"
                rows={3}
                className="w-full resize-none rounded-[20px] border border-[#DFE0E2] bg-white px-4 py-3 text-sm font-medium text-[#434956] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
              />
            </div>

            <div data-field="signature" className="scroll-mt-4">
              <FormInputField
                ref={signatureRef}
                label="Signature *"
                width="100%"
                required
                value={formik.values.signature}
                onChange={(e) => void formik.setFieldValue("signature", e.target.value)}
                onBlur={() => {
                  void formik.setFieldTouched("signature", true, false);
                  void formik.validateField("signature");
                }}
                placeholder="Signature"
                error={vitalsErrors.signature}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="medium"
          className="!min-w-[120px]"
          onClick={() => void handleSave()}
          disabled={isSubmittingDischarge}
          isLoading={isSubmittingDischarge}
        >
          Save
        </Button>
      </div>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          onSuccess();
        }}
        message={dialogMessage}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => {
          setShowSuccessDialog(false);
          onSuccess();
        }}
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

      {/* <Dialog
        open={showAllergiesDialog}
        onClose={() => {
          const trimmed = allergiesDetailText.trim();
          if (trimmed) {
            void formik.setFieldValue("allergiesDetails", trimmed, false);
            void formik.setFieldValue("allergies", "yes", false);
          } else {
            void formik.setFieldValue("allergies", "no", false);
            void formik.setFieldValue("allergiesDetails", "", false);
          }
          setShowAllergiesDialog(false);
          setAllergiesDetailText("");
          setTimeout(() => {
            void formik.setFieldTouched("allergies", true, false);
            void formik.validateField("allergies");
          }, 0);
        }}
        title="Enter the allergies details"
        width={600}
      >
        <div className="flex flex-col gap-6">
          <FormTextareaField
            label="Details"
            value={allergiesDetailText}
            onChange={(e) => setAllergiesDetailText(e.target.value)}
            placeholder="Please enter the allergies (maximum 1,000 characters)"
            height={200}
            className="w-full"
            required
            maxLength={1000}
          />
          <div className="flex justify-end -mt-4 text-[12px] leading-[120%] text-[#7B8089]">
            Remaining characters:{" "}
            <span className="ml-1 font-semibold text-[#262D3B]">
              {1000 - allergiesDetailText.length}
            </span>
          </div>
          <div className="flex items-center justify-start gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="medium"
              onClick={() => {
                const trimmed = allergiesDetailText.trim();
                if (trimmed) {
                  void formik.setFieldValue("allergiesDetails", trimmed, false);
                  void formik.setFieldValue("allergies", "yes", false);
                } else {
                  void formik.setFieldValue("allergies", "no", false);
                  void formik.setFieldValue("allergiesDetails", "", false);
                }
                setShowAllergiesDialog(false);
                setAllergiesDetailText("");
                setTimeout(() => {
                  void formik.setFieldTouched("allergies", true, false);
                  void formik.validateField("allergies");
                }, 0);
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="medium"
              onClick={() => {
                const trimmed = allergiesDetailText.trim();
                if (!trimmed) {
                  setShowAllergiesDialog(false);
                  setAllergiesDetailText("");
                  void formik.setFieldValue("allergies", "no", false);
                  void formik.setFieldValue("allergiesDetails", "", false);
                  setTimeout(() => {
                    void formik.setFieldTouched("allergies", true, false);
                    void formik.validateField("allergies");
                  }, 0);
                  return;
                }
                void formik.setFieldValue("allergiesDetails", trimmed, false);
                void formik.setFieldValue("allergies", "yes", false);
                setShowAllergiesDialog(false);
                setAllergiesDetailText("");
                setTimeout(() => {
                  void formik.setFieldTouched("allergies", true, false);
                  void formik.validateField("allergies");
                }, 0);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog> */}

      {/* <Dialog
        open={showSurgeriesDialog}
        onClose={() => {
          const trimmed = surgeriesDetailText.trim();
          if (trimmed) {
            void formik.setFieldValue("surgeriesDetails", trimmed, false);
            void formik.setFieldValue("surgeries", "yes", false);
          } else {
            void formik.setFieldValue("surgeries", "no", false);
            void formik.setFieldValue("surgeriesDetails", "", false);
          }
          setShowSurgeriesDialog(false);
          setSurgeriesDetailText("");
          setTimeout(() => {
            void formik.setFieldTouched("surgeries", true, false);
            void formik.validateField("surgeries");
          }, 0);
        }}
        title="Enter the surgeries details"
        width={600}
      >
        <div className="flex flex-col gap-6">
          <FormTextareaField
            label="Details"
            value={surgeriesDetailText}
            onChange={(e) => setSurgeriesDetailText(e.target.value)}
            placeholder="Please enter the surgeries (maximum 1,000 characters)"
            height={200}
            className="w-full"
            required
            maxLength={1000}
          />
          <div className="flex justify-end -mt-4 text-[12px] leading-[120%] text-[#7B8089]">
            Remaining characters:{" "}
            <span className="ml-1 font-semibold text-[#262D3B]">
              {1000 - surgeriesDetailText.length}
            </span>
          </div>
          <div className="flex items-center justify-start gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="medium"
              onClick={() => {
                const trimmed = surgeriesDetailText.trim();
                if (trimmed) {
                  void formik.setFieldValue("surgeriesDetails", trimmed, false);
                  void formik.setFieldValue("surgeries", "yes", false);
                } else {
                  void formik.setFieldValue("surgeries", "no", false);
                  void formik.setFieldValue("surgeriesDetails", "", false);
                }
                setShowSurgeriesDialog(false);
                setSurgeriesDetailText("");
                setTimeout(() => {
                  void formik.setFieldTouched("surgeries", true, false);
                  void formik.validateField("surgeries");
                }, 0);
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="medium"
              onClick={() => {
                const trimmed = surgeriesDetailText.trim();
                if (!trimmed) {
                  setShowSurgeriesDialog(false);
                  setSurgeriesDetailText("");
                  void formik.setFieldValue("surgeries", "no", false);
                  void formik.setFieldValue("surgeriesDetails", "", false);
                  setTimeout(() => {
                    void formik.setFieldTouched("surgeries", true, false);
                    void formik.validateField("surgeries");
                  }, 0);
                  return;
                }
                void formik.setFieldValue("surgeriesDetails", trimmed, false);
                void formik.setFieldValue("surgeries", "yes", false);
                setShowSurgeriesDialog(false);
                setSurgeriesDetailText("");
                setTimeout(() => {
                  void formik.setFieldTouched("surgeries", true, false);
                  void formik.validateField("surgeries");
                }, 0);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog> */}
    </div>
  );
}

export default function DischargePlannerPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [selectedPatient, setSelectedPatient] = useState<DischargePatient | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 500);

  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useIPDNurseResolvedBranchId();

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, selectedBranch, resolvedFilterBranchId]);

  const listParams =
    resolvedFilterBranchId == null
      ? null
      : {
          branchId: resolvedFilterBranchId,
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch.trim() || undefined,
          PatientDischargeStatus:
            statusFilter === "completed" || statusFilter === "pending"
              ? (statusFilter as "completed" | "pending")
              : undefined,
        };

  const {
    data: dischargeRes,
    isLoading: isDischargeLoading,
  } = useGetDischargeInitiatedPatientsQuery(listParams!, {
    skip: listParams == null || selectedPatient != null,
    refetchOnMountOrArgChange: true,
  });

  const patients = useMemo(
    () => (dischargeRes?.data ?? []).map(mapDischargeItemToCard),
    [dischargeRes?.data]
  );
  const totalItems = dischargeRes?.total ?? 0;
  const isListLoading = resolvedFilterBranchId == null || isDischargeLoading;

  if (selectedPatient) {
    return (
      <AppShell>
        <DischargeSignOffForm
          patient={selectedPatient}
          onBack={() => setSelectedPatient(null)}
          onSuccess={() => setSelectedPatient(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
              Discharge Planner
            </h1>
            {/* <p className="mt-1 text-base font-medium text-[#262D3B]">Hourly Roster</p> */}
          </div>

          {/* <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            <div className="w-full sm:w-[200px]">
              <FormSelectField
                label="Branch"
                hideLabel
                options={hookBranchFilterOptions}
                value={selectedBranch}
                onChange={(value) => {
                  setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                  setCurrentPage(1);
                }}
                placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                mode="single"
                width="100%"
                height={44}
                disabled={isBranchFilterDisabled || isLoadingBranchFilter}
              />
            </div>

            <div className="w-full sm:w-[160px]">
              <FormSelectField
                label="Status"
                hideLabel
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setStatusFilter(next || "all");
                  setCurrentPage(1);
                }}
                placeholder="Status"
                mode="single"
                width="100%"
                height={44}
              />
            </div>

            <div className="w-full sm:w-[240px]">
              <TableSearchInput
                value={searchTerm}
                onChange={(value) => {
                  setSearchTerm(value);
                  setCurrentPage(1);
                }}
                placeholder="Search Here..."
              />
            </div>
          </div> */}
        </div>

        <div className="space-y-4 rounded-[10px] bg-white p-[18px]">

           <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              
                      <div className="w-full max-w-[380px]">
                        {/* <p className="mt-1 text-base font-medium text-[#262D3B]">Hourly Roster</p> */}
                      </div>
          
                      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-[860px] lg:flex-1">
                        <div className="w-full min-w-0 sm:flex-1">
                         
                        </div>
                         <div className="w-full sm:w-[200px]">
                          <FormSelectField
                            label="Branch"
                            hideLabel
                            options={hookBranchFilterOptions}
                            value={selectedBranch}
                            onChange={(value) => {
                              setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                              setCurrentPage(1);
                            }}
                            placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                            mode="single"
                            width="100%"
                            height={44}
                            disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                          />
                        </div>
                          <div className="w-full sm:w-[160px]">
                          <FormSelectField
                            label="Status"
                            hideLabel
                            options={STATUS_FILTER_OPTIONS}
                            value={statusFilter}
                            onChange={(value) => {
                              const next = Array.isArray(value) ? value[0] : value;
                              setStatusFilter(next || "all");
                              setCurrentPage(1);
                            }}
                            placeholder="Status"
                            mode="single"
                            width="100%"
                            height={44}
                          />
                        </div>
                        <div className="w-full shrink-0 sm:w-[220px] lg:w-[240px]">
                          <TableSearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Search Here..."
                          />
                        </div>
                      </div>
                    </div>

          {isListLoading ? (
            <section className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-12 text-center shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
              <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                <SpinnerLoader size={18} />
                Loading discharge patients...
              </div>
            </section>
          ) : patients.length === 0 ? (
            <section className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-12 text-center shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
              <p className="text-sm text-[#9CA3AF]">No discharge patients found.</p>
            </section>
          ) : (
            patients.map((patient) => (
              <article
                key={patient.id}
                className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]"
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9]">
                      <Image src="/icons/ProfileGreenIcon.svg" alt="" width={20} height={20} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[#262D3B]">{patient.patientName}</p>
                      <p className="mt-0.5 text-sm text-[#7B8089]">{patient.roomLabel}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-[#434956] sm:pt-1">{patient.dischargeDate}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {patient.checklist.map((item) => (
                    <ChecklistStatusCard key={`${patient.id}-${item.label}`} item={item} />
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    className="!min-w-0"
                    onClick={() => {
                      if (patient.action === "sign-off") {
                        setSelectedPatient(patient);
                      }
                    }}
                  >
                    {patient.action === "sign-off" ? "Final Sign-Off Required" : "Complete"}
                  </Button>
                </div>
              </article>
            ))
          )}
        {totalItems > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={PAGINATION_OPTIONS}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        ) : null}
        </div>

      </div>
    </AppShell>
  );
}
