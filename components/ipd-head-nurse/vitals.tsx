"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  BackToPreviousPageButton,
  Badge,
  Button,
  Dialog,
  FormInputField,
  FormSelectField,
  FormTextareaField,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  SpinnerLoader,
  Pagination,
  MessageDialog,
  Tooltip,
} from "@/components/ui";
import {
  useGetLatestVitalsQuery,
  useGetVitalsHistoryQuery,
  useCreatePatientVitalsMutation,
  useLazyDownloadVitalCsvFileQuery,
  type CreatePatientVitalsRequest,
  type LatestVitalsData,
} from "@/store/api/ipdHeadNurseAPI";
import { StatusPill, type StatusTone } from "./shared";
import {
  coreVitalsValidationFields,
  formatBloodPressureInput,
  formatHeartRateInput,
  formatSpo2Input,
  formatTemperatureInput,
} from "./vitalsFormUtils";
import { API_BASE_URL } from "@/lib/config/api";

export type VitalsDetailPatient = {
  patientTitle: string;
  patientId?: number;
  patientName: string;
  patientUhid: string;
  doctorName?: string;
  nurseName?: string;
  age?: string;
  gender?: string;
  bedNumber?: string;
  diagnosis?: string;
  admissionDate?: string;
  statusLabel?: string;
};

type VitalsTabCard = {
  id: number;
  label: string;
  value: string;
  status: string;
  tone: StatusTone;
};

// Cards shown in the Vitals tab (matches the design screenshot).
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

function buildVitalsTabCards(vitals: LatestVitalsData | null | undefined): VitalsTabCard[] {
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
        vitals?.bloodPressure ? `${vitals.bloodPressure} mmHg` : "N/A"
      ),
    },
    {
      id: 3,
      label: "Pulse Rate",
      ...cardMeta(vitals?.pulse, vitals?.pulse ? `${vitals.pulse} bpm` : "N/A"),
    },
    {
      id: 4,
      label: "Respiratory Rate",
      ...cardMeta(
        vitals?.respiratoryRate,
        vitals?.respiratoryRate ? `${vitals.respiratoryRate} /min` : "N/A"
      ),
    },
    {
      id: 5,
      label: "SpO2",
      ...cardMeta(vitals?.spo2, vitals?.spo2 ? `${vitals.spo2}%` : "N/A"),
    },
    {
      id: 6,
      label: "Sugar Level",
      ...cardMeta(
        vitals?.sugarLevel,
        vitals?.sugarLevel ? `${vitals.sugarLevel} mg/dL` : "N/A"
      ),
    },
    {
      id: 7,
      label: "Pain",
      ...cardMeta(vitals?.painScale, vitals?.painScale ? String(vitals.painScale) : "N/A"),
    },
  ];
}

const VITALS_HISTORY_PAGINATION_OPTIONS = [6, 10, 20, 50];

function formatVitalsHistoryDateTime(value: string | null | undefined) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMetaDate(value: string | null | undefined) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatVitalsHistoryValue(value: string | null | undefined, fallback = "N/A") {
  if (!value || !value.trim()) return fallback;
  return value;
}

type AddVitalsFormValues = {
  bloodPressure: string;
  sugarLevel: string;
  temperature: string;
  pulse: string;
  spo2: string;
  vitalsNote: string;
  painScale: string;
  respiratoryRate: string;
  abdominalGirth: string;
};

const PAIN_SCALE_OPTIONS = [
  "0 - No Pain",
  "1 - Mild",
  "2 - Mild",
  "3 - Moderate",
  "4 - Moderate",
  "5 - Moderate",
  "6 - Severe",
  "7 - Severe",
  "8 - Very Severe",
  "9 - Very Severe",
  "10 - Worst Pain",
].map((value) => ({ label: value, value }));

const EMPTY_ADD_VITALS_FORM: AddVitalsFormValues = {
  bloodPressure: "",
  sugarLevel: "",
  temperature: "",
  pulse: "",
  spo2: "",
  vitalsNote: "",
  painScale: "",
  respiratoryRate: "",
  abdominalGirth: "",
};

const ADD_VITALS_FIELD_ORDER = [
  "bloodPressure",
  "sugarLevel",
  "temperature",
  "pulse",
  "spo2",
  "painScale",
  "respiratoryRate",
  "abdominalGirth",
  "vitalsNote",
] as const;

const addVitalsValidationSchema = Yup.object({
  ...coreVitalsValidationFields,
  sugarLevel: Yup.string()
    .trim()
    .required("Sugar Level is required")
    .matches(/^\d+(\.\d{1,2})?$/, "Sugar Level must be a valid number")
    .test("sugar-range", "Sugar Level must be between 20 and 600 mg/dL", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 20 && numValue <= 600;
    }),
  vitalsNote: Yup.string().trim(),
  painScale: Yup.string().trim(),
  respiratoryRate: Yup.string()
    .trim()
    .matches(/^\d*$/, "Respiratory Rate must contain only digits")
    .test("respiratory-range", "Respiratory Rate must be between 8 and 60 /min", (value) => {
      if (!value) return true;
      const numValue = parseInt(value, 10);
      return numValue >= 8 && numValue <= 60;
    }),
  abdominalGirth: Yup.string()
    .trim()
    .matches(/^(\d+(\.\d{1,2})?)?$/, "Abdominal Girth must be a valid number")
    .test("abdominal-girth-range", "Abdominal Girth must be between 1 and 200 cm", (value) => {
      if (!value) return true;
      const numValue = parseFloat(value);
      return numValue >= 1 && numValue <= 200;
    }),
});

function formatSugarLevelInput(rawValue: string) {
  let value = rawValue.replace(/[^0-9.]/g, "");
  const parts = value.split(".");
  if (parts.length > 2) {
    value = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  if (value.includes(".")) {
    const dotIndex = value.indexOf(".");
    value = value.slice(0, dotIndex + 2);
  }
  value = value.slice(0, 5);
  if (value) {
    const numValue = parseFloat(value);
    if (numValue > 600) {
      return "600";
    }
  }
  return value;
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

function formatRespiratoryRateInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 2);
  if (!digitsOnly) return "";
  const numValue = parseInt(digitsOnly, 10);
  if (numValue > 60) return "60";
  return digitsOnly;
}

function formatAbdominalGirthInput(rawValue: string) {
  let value = rawValue.replace(/[^0-9.]/g, "");
  const parts = value.split(".");
  if (parts.length > 2) {
    value = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  if (value.includes(".")) {
    const dotIndex = value.indexOf(".");
    value = value.slice(0, dotIndex + 2);
  }
  value = value.slice(0, 5);
  if (value) {
    const numValue = parseFloat(value);
    if (numValue > 200) {
      return "200";
    }
  }
  return value;
}

function scrollToFirstAddVitalsError(errors: Record<string, string>) {
  const firstField = ADD_VITALS_FIELD_ORDER.find((field) => errors[field]);
  if (!firstField) return;

  const element = document.querySelector(`[data-field="${firstField}"]`);
  if (!(element instanceof HTMLElement)) return;

  element.scrollIntoView({ behavior: "smooth", block: "center" });
  const input = element.querySelector("input, textarea");
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    setTimeout(() => input.focus(), 150);
    return;
  }

  const trigger = element.querySelector('button[type="button"], [role="combobox"]');
  if (trigger instanceof HTMLElement) {
    setTimeout(() => trigger.focus(), 150);
  }
}

function extractPainScaleValue(painScale: string) {
  const match = painScale.match(/^(\d+)/);
  return match ? match[1] : painScale;
}

function buildCreatePatientVitalsPayload(
  patientId: number,
  values: AddVitalsFormValues
): CreatePatientVitalsRequest {
  const payload: CreatePatientVitalsRequest = {
    patientId,
    bloodPressure: values.bloodPressure.trim(),
    sugarLevel: values.sugarLevel.trim(),
    temperature: values.temperature.trim(),
    pulse: values.pulse.trim(),
    spo2: values.spo2.trim(),
  };

  if (values.vitalsNote.trim()) {
    payload.vitalsNote = values.vitalsNote.trim();
  }

  if (values.painScale.trim()) {
    payload.painScale = extractPainScaleValue(values.painScale.trim());
  }

  if (values.respiratoryRate.trim()) {
    payload.respiratoryRate = values.respiratoryRate.trim();
  }

  if (values.abdominalGirth.trim()) {
    payload.abdominalGirth = values.abdominalGirth.trim();
  }

  return payload;
}

function AddVitalsDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AddVitalsFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
}) {
  const bloodPressureRef = useRef<HTMLInputElement>(null);
  const sugarLevelRef = useRef<HTMLInputElement>(null);
  const temperatureRef = useRef<HTMLInputElement>(null);
  const pulseRef = useRef<HTMLInputElement>(null);
  const spo2Ref = useRef<HTMLInputElement>(null);

  const formik = useFormik<AddVitalsFormValues>({
    initialValues: EMPTY_ADD_VITALS_FORM,
    validationSchema: addVitalsValidationSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: (values) => {
      void onSubmit(values);
    },
  });

  useEffect(() => {
    if (!open) return;
    void formik.resetForm({ values: EMPTY_ADD_VITALS_FORM, touched: {}, errors: {} });
  }, [open]);

  const handleSubmit = async () => {
    const errors = await formik.validateForm();
    formik.setErrors(errors);

    const touched = ADD_VITALS_FIELD_ORDER.reduce<Record<string, boolean>>((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    await formik.setTouched(touched, false);

    if (Object.keys(errors).length > 0) {
      scrollToFirstAddVitalsError(errors as Record<string, string>);
      return;
    }

    formik.handleSubmit();
  };

  const unitSuffix = (unit: string) => (
    <span className="text-xs font-medium text-[#9FA2AB]">{unit}</span>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Add Vitals" width={720} contentPadding="px-6 pb-6 pt-4">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-field="bloodPressure" className="scroll-mt-4">
            <FormInputField
              ref={bloodPressureRef}
              label="Blood Pressure *"
              width="100%"
              value={formik.values.bloodPressure}
              onChange={(event) => {
                void formik.setFieldValue("bloodPressure", formatBloodPressureInput(event.target.value));
              }}
              onBlur={() => void formik.setFieldTouched("bloodPressure", true)}
              placeholder="Systolic/Diastolic(mmHg/mmHg)"
              suffix={unitSuffix("mmHg")}
              maxLength={7}
              error={
                formik.touched.bloodPressure && formik.errors.bloodPressure
                  ? formik.errors.bloodPressure
                  : undefined
              }
            />
          </div>
          <div data-field="sugarLevel" className="scroll-mt-4">
            <FormInputField
              ref={sugarLevelRef}
              label="Sugar Level *"
              width="100%"
              value={formik.values.sugarLevel}
              onChange={(event) => {
                void formik.setFieldValue("sugarLevel", formatSugarLevelInput(event.target.value));
              }}
              onBlur={() => void formik.setFieldTouched("sugarLevel", true)}
              placeholder="Sugar Level"
              suffix={unitSuffix("mg/dL")}
              maxLength={5}
              error={
                formik.touched.sugarLevel && formik.errors.sugarLevel
                  ? formik.errors.sugarLevel
                  : undefined
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-field="temperature" className="scroll-mt-4">
            <FormInputField
              ref={temperatureRef}
              label="Temperature *"
              width="100%"
              value={formik.values.temperature}
              onChange={(event) => {
                void formik.setFieldValue("temperature", formatTemperatureInput(event.target.value));
              }}
              onBlur={() => void formik.setFieldTouched("temperature", true)}
              placeholder="Temperature (°F)"
              suffix={unitSuffix("°F")}
              maxLength={5}
              error={
                formik.touched.temperature && formik.errors.temperature
                  ? formik.errors.temperature
                  : undefined
              }
            />
          </div>
          <div data-field="pulse" className="scroll-mt-4">
            <FormInputField
              ref={pulseRef}
              label="Heart Rate *"
              width="100%"
              value={formik.values.pulse}
              onChange={(event) => {
                void formik.setFieldValue("pulse", formatHeartRateInput(event.target.value));
              }}
              onBlur={() => void formik.setFieldTouched("pulse", true)}
              placeholder="Heart Rate"
              suffix={unitSuffix("bpm")}
              maxLength={3}
              error={formik.touched.pulse && formik.errors.pulse ? formik.errors.pulse : undefined}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-field="spo2" className="scroll-mt-4">
            <FormInputField
              ref={spo2Ref}
              label="SPO2 *"
              width="100%"
              value={formik.values.spo2}
              onChange={(event) => {
                void formik.setFieldValue("spo2", formatSpo2Input(event.target.value));
              }}
              onBlur={() => void formik.setFieldTouched("spo2", true)}
              placeholder="SPO2"
              suffix={unitSuffix("%")}
              maxLength={3}
              error={formik.touched.spo2 && formik.errors.spo2 ? formik.errors.spo2 : undefined}
            />
          </div>
          <div data-field="painScale" className="scroll-mt-4">
            <FormSelectField
              label="Pain Scale"
              width="100%"
              background="white"
              value={formik.values.painScale || null}
              options={PAIN_SCALE_OPTIONS}
              onChange={(value) => {
                void formik.setFieldValue(
                  "painScale",
                  Array.isArray(value) ? value[0] || "" : String(value || "")
                );
                void formik.setFieldTouched("painScale", true, false);
              }}
              onBlur={() => void formik.setFieldTouched("painScale", true)}
              placeholder="Pain Scale"
              error={
                formik.touched.painScale && formik.errors.painScale
                  ? formik.errors.painScale
                  : undefined
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-field="respiratoryRate" className="scroll-mt-4">
            <FormInputField
              label="Respirational Rate"
              width="100%"
              value={formik.values.respiratoryRate}
              onChange={(event) => {
                void formik.setFieldValue(
                  "respiratoryRate",
                  formatRespiratoryRateInput(event.target.value)
                );
              }}
              onBlur={() => void formik.setFieldTouched("respiratoryRate", true)}
              placeholder="Respirational Rate"
              suffix={unitSuffix("/min")}
              maxLength={2}
              error={
                formik.touched.respiratoryRate && formik.errors.respiratoryRate
                  ? formik.errors.respiratoryRate
                  : undefined
              }
            />
          </div>
          <div data-field="abdominalGirth" className="scroll-mt-4">
            <FormInputField
              label="Abdominal Girth"
              width="100%"
              value={formik.values.abdominalGirth}
              onChange={(event) => {
                void formik.setFieldValue(
                  "abdominalGirth",
                  formatAbdominalGirthInput(event.target.value)
                );
              }}
              onBlur={() => void formik.setFieldTouched("abdominalGirth", true)}
              placeholder="Abdominal Girth"
              suffix={unitSuffix("cm")}
              maxLength={5}
              error={
                formik.touched.abdominalGirth && formik.errors.abdominalGirth
                  ? formik.errors.abdominalGirth
                  : undefined
              }
            />
          </div>
        </div>

        {/* <div data-field="vitalsNote" className="scroll-mt-4">
          <FormTextareaField
            label="Vitals Note"
            width="100%"
            height={110}
            value={formik.values.vitalsNote}
            onChange={(event) => {
              void formik.setFieldValue("vitalsNote", event.target.value);
            }}
            onBlur={() => void formik.setFieldTouched("vitalsNote", true)}
            placeholder="Enter vitals note..."
          />
        </div> */}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" variant="primary" size="small" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Vital"}
          </Button>
          <Button type="button" variant="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}



function rtkErrorMessage(error: unknown): string {
  const parsed = error as { data?: { message?: string }; message?: string };
  if (typeof parsed?.data?.message === "string") return parsed.data.message;
  if (typeof parsed?.message === "string") return parsed.message;
  return "Something went wrong";
}

export function PatientVitalsTab({
  patient,
  patientId,
  onBack,
}: {
  patient?: VitalsDetailPatient;
  patientId?: number;
  onBack?: () => void;
} = {}) {
  const [isAddVitalsOpen, setIsAddVitalsOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const [showExportErrorDialog, setShowExportErrorDialog] = useState(false);
  const [isAddVitalsSuccessOpen, setIsAddVitalsSuccessOpen] = useState(false);
  const [isAddVitalsErrorOpen, setIsAddVitalsErrorOpen] = useState(false);
  const [addVitalsDialogMessage, setAddVitalsDialogMessage] = useState("");
  const [vitalsHistoryFilters, setVitalsHistoryFilters] = useState({
    page: 1,
    limit: 10,
  });
  const [isPrintingLog, setIsPrintingLog] = useState(false);

  const resolvedPatientId = patientId ?? patient?.patientId;

  const [createPatientVitals, { isLoading: isCreatingPatientVitals }] =
    useCreatePatientVitalsMutation();
  const [triggerVitalCsvDownload, { isFetching: isVitalCsvDownloading }] =
    useLazyDownloadVitalCsvFileQuery();

  const {
    data: latestVitalsRes,
    isLoading: isLatestVitalsLoading,
    refetch: refetchLatestVitals,
  } = useGetLatestVitalsQuery(resolvedPatientId ?? 0, {
    skip: !resolvedPatientId,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: vitalsHistoryRes,
    isLoading: isVitalsHistoryLoading,
    refetch: refetchVitalsHistory,
  } = useGetVitalsHistoryQuery(
    {
      patientId: resolvedPatientId ?? 0,
      page: vitalsHistoryFilters.page,
      limit: vitalsHistoryFilters.limit,
    },
    {
      skip: !resolvedPatientId,
      refetchOnMountOrArgChange: true,
    }
  );

  const latestVitals = latestVitalsRes?.data ?? null;
  const latestVitalsCards = useMemo(() => buildVitalsTabCards(latestVitals), [latestVitals]);
  const vitalsUpdatedLabel = formatVitalsUpdatedAt(latestVitals?.createdAt);
  const vitalsHistory = vitalsHistoryRes?.data ?? [];
  const vitalsHistoryTotal = Number(vitalsHistoryRes?.total ?? 0);

  const patientMetaItems = patient
    ? [
        { label: "UHID", value: patient.patientUhid },
        patient.age ? { label: "Age", value: `${patient.age} years` } : null,
        patient.gender ? { label: "Gender", value: patient.gender } : null,
        patient.bedNumber ? { label: "Bed Number", value: patient.bedNumber } : null,
      ].filter((item): item is { label: string; value: string } => Boolean(item))
    : [];

  const patientMetaItemsSecondRow = patient
    ? [
        patient.diagnosis ? { label: "Diagnosis", value: patient.diagnosis } : null,
        patient.admissionDate
          ? { label: "Admission Date", value: formatMetaDate(patient.admissionDate) }
          : null,
        patient.doctorName ? { label: "Treating Doctor", value: patient.doctorName } : null,
      ].filter((item): item is { label: string; value: string } => Boolean(item))
    : [];

  // const statusBadgeVariant = patient?.statusLabel?.toLowerCase() === "pending" ? "warning" : "success";

    const statusBadgeVariant = patient?.statusLabel?.toLowerCase() === "pending" ? "warning" :
    patient?.statusLabel?.toLowerCase() === "critical"  ? "warning" :
    "success";

  const handleExportCSV = async () => {
    if (!resolvedPatientId) {
      setExportError("Patient is required to export vitals.");
      setShowExportErrorDialog(true);
      return;
    }

    try {
      const result = await triggerVitalCsvDownload({
        patientId: resolvedPatientId,
      }).unwrap();

      if (result?.data?.url) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setExportError(rtkErrorMessage(error));
      setShowExportErrorDialog(true);
    }
  };

  const handlePrintLog = async () => {
    if (!resolvedPatientId) {
      setExportError("Patient is required to print vitals.");
      setShowExportErrorDialog(true);
      return;
    }

    setIsPrintingLog(true);

    try {
      const authToken =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
          : null;

      const headers: HeadersInit = authToken
        ? { authorization: `Bearer ${authToken}` }
        : {};

      const limit = 100;
      let page = 1;
      let total = 0;
      const allRows: LatestVitalsData[] = [];
      let pageRows: any = [];

      do {
        const response = await fetch(
          `${API_BASE_URL}/headNurse/getVitalsHistory?patientId=${resolvedPatientId}&page=${page}&limit=${limit}`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch vitals history for print.");
        }

        const result = (await response.json()) as {
          data?: LatestVitalsData[];
          total?: number;
        };

        pageRows = result.data ?? [];
        total = Number(result.total ?? pageRows.length);
        allRows.push(...pageRows);
        page += 1;
      } while (allRows.length < total && pageRows.length > 0);

      const patientTitle = patient?.patientName || "Vitals History";
      const generatedAt = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const tableRowsHtml =
        allRows.length > 0
          ? allRows
              .map(
                (row) => `
            <tr>
              <td>${escapeHtml(formatVitalsHistoryDateTime(row.createdAt))}</td>
              <td>${escapeHtml(formatVitalsHistoryValue(row.createdByUserName))}</td>
              <td>${escapeHtml(formatVitalsHistoryValue(row.bloodPressure))}</td>
              <td>${escapeHtml(row.pulse ? `${formatVitalsHistoryValue(row.pulse)} bpm` : "N/A")}</td>
              <td>${escapeHtml(row.temperature ? `${formatVitalsHistoryValue(row.temperature)}°F` : "N/A")}</td>
              <td>${escapeHtml(row.spo2 ? `${formatVitalsHistoryValue(row.spo2)}%` : "N/A")}</td>
              <td>${escapeHtml(row.respiratoryRate ? `${formatVitalsHistoryValue(row.respiratoryRate)} /min` : "N/A")}</td>
              <td>${escapeHtml(formatVitalsHistoryValue(row.painScale))}</td>
              <td>${escapeHtml(row.sugarLevel ? `${formatVitalsHistoryValue(row.sugarLevel)} mg/dL` : "N/A")}</td>
            </tr>
          `
              )
              .join("")
          : `<tr><td colspan="9">No vitals history found.</td></tr>`;

      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Vitals History</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                color: #262D3B;
                margin: 24px;
              }
              h1 {
                margin: 0 0 6px;
                font-size: 24px;
              }
              .meta {
                margin-bottom: 16px;
                color: #525763;
                font-size: 13px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid #E5E7EB;
                padding: 10px 12px;
                text-align: left;
                font-size: 12px;
                vertical-align: top;
              }
              th {
                background: #F8FAF8;
                color: #434956;
                font-weight: 700;
              }
              @media print {
                body {
                  margin: 12px;
                }
              }
            </style>
          </head>
          <body>
            <h1>Vitals History</h1>
            <div class="meta">
              <div>Patient: ${escapeHtml(patientTitle)}</div>
              <div>Generated: ${escapeHtml(generatedAt)}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Nurse Name</th>
                  <th>BP</th>
                  <th>Pulse</th>
                  <th>Temp</th>
                  <th>SpO2</th>
                  <th>Resp</th>
                  <th>Pain</th>
                  <th>Blood Sugar</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
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
      setExportError(error instanceof Error ? error.message : "Failed to print vitals history.");
      setShowExportErrorDialog(true);
    } finally {
      setIsPrintingLog(false);
    }
  };

  const handleAddVitalsSubmit = async (values: AddVitalsFormValues) => {
    if (!resolvedPatientId) {
      setAddVitalsDialogMessage("Patient is required to add vitals.");
      setIsAddVitalsErrorOpen(true);
      return;
    }

    try {
      const result = await createPatientVitals(
        buildCreatePatientVitalsPayload(resolvedPatientId, values)
      ).unwrap();

      setIsAddVitalsOpen(false);
      setAddVitalsDialogMessage(result.message || "Patient vitals created successfully");
      setIsAddVitalsSuccessOpen(true);
      setVitalsHistoryFilters((prev) => ({ ...prev, page: 1 }));
      void refetchLatestVitals();
      void refetchVitalsHistory();
    } catch (error) {
      setAddVitalsDialogMessage(
        rtkErrorMessage(error) || "Failed to create patient vitals. Please try again."
      );
      setIsAddVitalsErrorOpen(true);
    }
  };

  return (
    <>
      <div className="space-y-5">
        {patient ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {/* <Tooltip
                  position="top"
                  maxWidth={400}
                  content={
                    <span className="whitespace-nowrap text-xs text-[#262D3B]">
                      {`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                    </span>
                  }
                >
                  <h1 className="max-w-[min(100%,600px)] cursor-default truncate text-[20px] font-semibold leading-tight text-[#262D3B] md:text-[20px]">
                    {`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                  </h1>
                </Tooltip> */}


                  <TruncatedPatientName 
                    // name={patient.patientName} 
                      name={`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                    />
                <Badge variant={statusBadgeVariant} className="font-medium">
                  {patient.statusLabel ?? "Completed"}
                </Badge>
              </div>
              {patientMetaItems.length > 0 ? (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#434956] text-[13px]">
                  {patientMetaItems.map((item, index) => (
                    <span key={item.label} className="inline-flex items-center gap-2">
                      {index > 0 ? <span aria-hidden>•</span> : null}
                      <span>
                        {item.label}:{" "}
                        <span className="font-semibold text-[#262D3B]">{item.value}</span>
                      </span>
                    </span>
                  ))}
                </p>
              ) : null}
              {patientMetaItemsSecondRow.length > 0 ? (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#434956] text-[13px]">
                  {patientMetaItemsSecondRow.map((item, index) => (
                    <span key={item.label} className="inline-flex items-center gap-2">
                      {index > 0 ? <span aria-hidden>•</span> : null}
                      <span>
                        {item.label}:{" "}
                        <span className="font-semibold text-[#262D3B]">{item.value}</span>
                      </span>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>

            {onBack ? (
              <BackToPreviousPageButton
                className="shrink-0 self-start"
                onClick={onBack}
                text="Back to Vitals"
              />
            ) : null}
          </div>
        ) : onBack ? (
          <div className="flex justify-end">
            <BackToPreviousPageButton onClick={onBack} text="Back to Vitals" />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-medium text-[#262D3B]">Latest Vitals</h3>
              <span className="text-xs text-[#9FA2AB]">Last updated: {vitalsUpdatedLabel}</span>
            </div>

            {isLatestVitalsLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                <SpinnerLoader size={18} />
                Loading vitals...
              </div>
            ) : !latestVitals ? (
              <p className="py-10 text-center text-sm text-[#9CA3AF]">No vitals recorded yet.</p>
            ) : (
              <>
                {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"> */}
                  {/* {latestVitalsCards.map((card) => {
                const dotColor =
                  card.tone === "success"
                    ? "#0B8C00"
                    : card.tone === "warning"
                      ? "#B45309"
                      : card.tone === "danger"
                        ? "#93000A"
                        : "#CBD5E1";

                return (
                  <div key={card.id} className="rounded-[16px] border border-[#EDF3EA] bg-[#FCFDFC] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#7B8089]">{card.label}</p>
                      </div>
                      <StatusPill label={card.status} tone={card.tone} />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                      <p className="text-sm font-semibold text-[#262D3B]">{card.value}</p>
                    </div>
                  </div>
                );
              })} */}
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
                {/* </div> */}

                {latestVitals.VitalsNote ? (
                  <p className="mt-4 rounded-[12px] border border-[#EDF3EA] bg-[#FCFDFC] px-4 py-3 text-sm text-[#434956]">
                    {latestVitals.VitalsNote}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-medium text-[#262D3B]">Vitals History</h3>
              <div className="flex items-center gap-3">
                {/* <Button
                  variant="primary"
                  size="medium"
                  className="!min-w-0 whitespace-nowrap"
                  onClick={() => setIsAddVitalsOpen(true)}
                >
                  <Image src="/icons/AddIcon.svg" alt="" width={16} height={16} className="mr-2 brightness-0 invert" />
                  Add Vitals
                </Button> */}

                <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                   onClick={() => setIsAddVitalsOpen(true)}
                >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                    <span className="text-hide">Add Vitals</span>
                </button>

                {/* <Button
                  variant="outline"
                  size="xsmall"
                  className="!min-w-0 whitespace-nowrap"
                  disabled={isPrintingLog}
                  onClick={() => void handlePrintLog()}
                  leftIcon={
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B]/20">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 9V2H17V9" stroke="#9A7909" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 18H19V22H5V18Z" stroke="#9A7909" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 10H21V18H3V10H5" stroke="#9A7909" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  }
                >
                  {isPrintingLog ? "Printing..." : "Print Log"}
                </Button> */}

                  <button
                    type="button"
                    disabled={isPrintingLog}
                    onClick={() => void handlePrintLog()}
                    className={`flex h-9 items-center justify-center gap-2 px-6 rounded-[32px] border border-[#9A7909] text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                  <Image src="/icons/printBrownprint.svg" alt="Back" width={18} height={18} className="shrink-0" />
                       {isPrintingLog ? "Printing..." : "Print"}
                             </button>


                {/* <Button
                  variant="outline"
                  size="xsmall"
                  className="!min-w-0 whitespace-nowrap"
                  disabled={isVitalCsvDownloading}
                  onClick={() => void handleExportCSV()}
                  leftIcon={
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B8C00]/10">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3V14" stroke="#0B8C00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 10L12 14L16 10" stroke="#0B8C00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 17V21H20V17" stroke="#0B8C00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  }
                >
                  {isVitalCsvDownloading ? "Exporting..." : "Export CSV"}
                </Button> */}

                <button
                  type="button"
                   disabled={isVitalCsvDownloading}
                   onClick={() => void handleExportCSV()}
                    className={`flex h-9 items-center justify-center gap-2 px-6 rounded-[32px] border border-[#9A7909] text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                  <Image src="/icons/DownloadExport.svg" alt="Back" width={18} height={18} className="shrink-0" />
                    {isVitalCsvDownloading ? "Exporting..." : "Export CSV"}
                   </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead position="first">Date/Time</TableHead>
                  <TableHead>Nurse Name</TableHead>
                  <TableHead>BP</TableHead>
                  <TableHead>Pulse</TableHead>
                  <TableHead>Temp</TableHead>
                  <TableHead>SpO2</TableHead>
                  <TableHead>Resp</TableHead>
                  <TableHead>Pain</TableHead>
                  <TableHead position="last">Sugar Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isVitalsHistoryLoading ? (
                  <TableRow className="bg-white">
                    <TableData colSpan={9}>
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                        <SpinnerLoader size={18} />
                        Loading vitals history...
                      </div>
                    </TableData>
                  </TableRow>
                ) : vitalsHistory.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableData colSpan={9}>
                      <p className="py-10 text-center text-sm text-[#9CA3AF]">No vitals history found.</p>
                    </TableData>
                  </TableRow>
                ) : (
                  vitalsHistory.map((row: LatestVitalsData) => (
                    <TableRow key={row.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                      <TableData variant="primary">
                        {formatVitalsHistoryDateTime(row.createdAt)}
                      </TableData>
                      <TableData>
                        {formatVitalsHistoryValue(row.createdByUserName)}
                      </TableData>
                      <TableData>{formatVitalsHistoryValue(row.bloodPressure)}</TableData>
                      <TableData>
                        {row.pulse ? `${formatVitalsHistoryValue(row.pulse)} bpm` : "N/A"}
                      </TableData>
                      <TableData>
                        {row.temperature ? `${formatVitalsHistoryValue(row.temperature)}°F` : "N/A"}
                      </TableData>
                      <TableData>
                        {row.spo2 ? `${formatVitalsHistoryValue(row.spo2)}%` : "N/A"}
                      </TableData>
                      <TableData>
                        {row.respiratoryRate
                          ? `${formatVitalsHistoryValue(row.respiratoryRate)} /min`
                          : "N/A"}
                      </TableData>
                      <TableData>
                        {formatVitalsHistoryValue(row.painScale)}
                      </TableData>
                      <TableData>
                        {row.sugarLevel ? `${formatVitalsHistoryValue(row.sugarLevel)} mg/dL` : "N/A"}
                      </TableData>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {!isVitalsHistoryLoading && vitalsHistory.length > 0 ? (
              <div className="mt-4 border-t border-[#EDF3EA] pt-4">
                <Pagination
                  currentPage={vitalsHistoryFilters.page}
                  totalItems={vitalsHistoryTotal > 0 ? vitalsHistoryTotal : vitalsHistory.length}
                  itemsPerPage={vitalsHistoryFilters.limit}
                  itemsPerPageOptions={VITALS_HISTORY_PAGINATION_OPTIONS}
                  onPageChange={(page) =>
                    setVitalsHistoryFilters((prev) => ({ ...prev, page }))
                  }
                  onItemsPerPageChange={(limit) =>
                    setVitalsHistoryFilters((prev) => ({ ...prev, limit, page: 1 }))
                  }
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <AddVitalsDialog
        open={isAddVitalsOpen}
        onClose={() => setIsAddVitalsOpen(false)}
        onSubmit={handleAddVitalsSubmit}
        isSubmitting={isCreatingPatientVitals}
      />

      <MessageDialog
        open={isAddVitalsSuccessOpen}
        onClose={() => setIsAddVitalsSuccessOpen(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={addVitalsDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setIsAddVitalsSuccessOpen(false)}
        width={400}
      />

      <MessageDialog
        open={isAddVitalsErrorOpen}
        onClose={() => setIsAddVitalsErrorOpen(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={addVitalsDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setIsAddVitalsErrorOpen(false)}
        width={400}
      />

      <MessageDialog
        open={showExportErrorDialog}
        onClose={() => setShowExportErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={exportError}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowExportErrorDialog(false)}
      />
    </>
  );
}
