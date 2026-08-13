"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
// import { keepPreviousData } from "@reduxjs/toolkit/query";
import { useFormik, setNestedObjectValues } from "formik";
import * as Yup from "yup";
import { AppShell } from "@/components/layout/AppShell";
import {
  BackToPreviousPageButton,
  Button,
  DatePicker,
  FormInputField,
  FormSelectField,
  FormTextareaField,
  MessageDialog,
  Pagination,
  SpinnerLoader,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
  Tooltip,
} from "@/components/ui";
import { StatusPill, type StatusTone } from "@/components/ipd-head-nurse/shared";
import {
  coreVitalsValidationFields,
  formatBloodPressureInput,
  formatHeartRateInput,
  formatSpo2Input,
  formatTemperatureInput,
  parseBloodPressureValues,
} from "@/components/ipd-head-nurse/vitalsFormUtils";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useCreateReferPatientMutation,
  useGetReferPatientListingQuery,
  useUpdateReferPatientMutation,
  type CreateReferPatientRequest,
  type ReferPatientListItem,
} from "@/store/api/ipdHeadNurseAPI";

type ReferralFormState = {
  patientName: string;
  patientUhid: string;
  age: string;
  gender: string | null;
  temperature: string;
  pulse: string;
  bloodPressure: string;
  spo2: string;
  fromHospitalName: string;
  fromDepartment: string;
  fromAge: string;
  fromGender: string | null;
  toHospitalName: string;
  reasonForReferral: string;
  diagnosis: string;
  chiefComplaints: string;
  doctorName: string;
  dateTimeStamp: string;
};

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const INITIAL_FORM: ReferralFormState = {
  patientName: "",
  patientUhid: "",
  age: "",
  gender: null,
  temperature: "",
  pulse: "",
  bloodPressure: "",
  spo2: "",
  fromHospitalName: "",
  fromDepartment: "",
  fromAge: "",
  fromGender: null,
  toHospitalName: "",
  reasonForReferral: "",
  diagnosis: "",
  chiefComplaints: "",
  doctorName: "",
  dateTimeStamp: "",
};

const requiredString = (label: string) =>
  Yup.string().trim().required(`${label} is required`);

const requiredSelect = (label: string) =>
  Yup.string().nullable().required(`${label} is required`);

const referralValidationSchema = Yup.object({
  patientName: requiredString("Patient Name"),
  patientUhid: requiredString("Patient UHID"),
  age: requiredString("Age"),
  gender: requiredSelect("Gender"),
  ...coreVitalsValidationFields,
  fromHospitalName: requiredString("Hospital Name"),
  fromDepartment: requiredString("Department"),
  fromAge: requiredString("Age"),
  fromGender: requiredSelect("Gender"),
  toHospitalName: requiredString("Hospital Name"),
  reasonForReferral: requiredString("Reason for Referral"),
  diagnosis: requiredString("Provisional / Final Diagnosis"),
  chiefComplaints: requiredString("Chief Complaints"),
  doctorName: requiredString("Doctor Name"),
  dateTimeStamp: requiredString("Date & Time Stamp"),
});

const PAGINATION_OPTIONS = [6, 10, 20, 50];
const COLUMN_COUNT = 8;

function formatReferralDate(dateValue: string) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatReferralStatus(status: string): { label: string; tone: StatusTone } {
  const normalized = status?.toLowerCase();
  if (normalized === "draft") return { label: "Draft", tone: "warning" };
  if (normalized === "active") return { label: "Active", tone: "success" };
  if (normalized === "completed") return { label: "Completed", tone: "success" };
  if (normalized === "pending") return { label: "Pending", tone: "warning" };
  return { label: status || "N/A", tone: "neutral" };
}

function canEditReferral(status: string) {
  const normalized = status?.toLowerCase();
  return normalized === "draft" || normalized === "active";
}

function capitalizeLabel(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function normalizeGenderSelectValue(gender: string): string | null {
  if (!gender) return null;
  const normalized = gender.trim().toLowerCase();
  if (normalized === "male" || normalized === "female" || normalized === "other") {
    return normalized;
  }
  return null;
}

function toDatePickerValue(dateValue: string) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function mapReferPatientToFormValues(referral: ReferPatientListItem): ReferralFormState {
  const bloodPressure =
    referral.bloodPressureSystolic != null && referral.bloodPressureDiastolic != null
      ? `${referral.bloodPressureSystolic}/${referral.bloodPressureDiastolic}`
      : "";

  return {
    patientName: referral.patientName ?? "",
    patientUhid: referral.uhid ?? "",
    age: referral.age ?? "",
    gender: normalizeGenderSelectValue(referral.gender),
    temperature: referral.temperature != null ? String(referral.temperature) : "",
    pulse: referral.pulse != null ? String(referral.pulse) : "",
    bloodPressure,
    spo2: referral.spo2 != null ? String(referral.spo2) : "",
    fromHospitalName: referral.referralHospitalName ?? "",
    fromDepartment: referral.referralDepartment ?? "",
    fromAge: referral.referralDoctorAge ?? "",
    fromGender: normalizeGenderSelectValue(referral.referralDoctorGender),
    toHospitalName: referral.referredToHospital ?? "",
    reasonForReferral: referral.reasonForReferral ?? "",
    diagnosis: referral.diagnosis ?? "",
    chiefComplaints: referral.chiefComplaints ?? "",
    doctorName: referral.referralDoctorName ?? "",
    dateTimeStamp: toDatePickerValue(referral.referralDate),
  };
}

function toReferralDateISO(dateValue: string) {
  if (!dateValue) return "";
  const parsed = new Date(dateValue.includes("T") ? dateValue : `${dateValue}T00:00:00`);
  return parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function buildCreateReferPatientPayload(
  values: ReferralFormState,
  status: "draft" | "active",
  branchId: number
): CreateReferPatientRequest {
  const { systolic, diastolic } = parseBloodPressureValues(values.bloodPressure);

  return {
    branchId,
    patientName: values.patientName.trim(),
    uhid: values.patientUhid.trim(),
    age: values.age.trim(),
    gender: capitalizeLabel(values.gender || ""),
    temperature: Number(values.temperature),
    pulse: Number(values.pulse),
    bloodPressureSystolic: systolic,
    bloodPressureDiastolic: diastolic,
    spo2: Number(values.spo2),
    referralHospitalName: values.fromHospitalName.trim(),
    referralDepartment: values.fromDepartment.trim(),
    referralDoctorName: values.doctorName.trim(),
    referralDoctorAge: values.fromAge.trim(),
    referralDoctorGender: capitalizeLabel(values.fromGender || ""),
    referredToHospital: values.toHospitalName.trim(),
    reasonForReferral: values.reasonForReferral.trim(),
    diagnosis: values.diagnosis.trim(),
    chiefComplaints: values.chiefComplaints.trim(),
    referralDate: toReferralDateISO(values.dateTimeStamp),
    status,
  };
}

function unitSuffix(unit: string) {
  return <span className="text-xs font-medium text-[#9FA2AB]">{unit}</span>;
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
      <h2 className="mb-5 text-base font-medium text-[#262D3B]">{title}</h2>
      {children}
    </section>
  );
}

const TRUNCATED_TABLE_CELL_WIDTH = 150;
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

function PatientReferralForm({
  onBack,
  onSuccess,
  referralToEdit,
}: {
  onBack: () => void;
  onSuccess: () => void;
  referralToEdit?: ReferPatientListItem | null;
}) {
  const isEditMode = referralToEdit != null;
  const submitStatusRef = useRef<"draft" | "active">("active");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [createReferPatient, { isLoading: isCreating }] = useCreateReferPatientMutation();
  const [updateReferPatient, { isLoading: isUpdating }] = useUpdateReferPatientMutation();
  const { resolvedFilterBranchId } = useIPDNurseResolvedBranchId();
  const isSaving = isCreating || isUpdating;

  const formik = useFormik<ReferralFormState>({
    initialValues: referralToEdit ? mapReferPatientToFormValues(referralToEdit) : INITIAL_FORM,
    enableReinitialize: true,
    validationSchema: referralValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (resolvedFilterBranchId == null) {
        setDialogMessage("Please select a branch before saving the referral.");
        setShowErrorDialog(true);
        setSubmitting(false);
        return;
      }

      try {
        const payload = buildCreateReferPatientPayload(
          values,
          submitStatusRef.current,
          resolvedFilterBranchId
        );
        const result = isEditMode
          ? await updateReferPatient({
              referPatientId: referralToEdit.id,
              body: payload,
            }).unwrap()
          : await createReferPatient(payload).unwrap();

        setDialogMessage(
          result.message ||
            (isEditMode ? "Referral updated successfully." : "Referral saved successfully.")
        );
        setShowSuccessDialog(true);
      } catch (error) {
        const message =
          error && typeof error === "object" && "data" in error
            ? (error as { data?: { message?: string } }).data?.message
            : isEditMode
              ? "Failed to update referral. Please try again."
              : "Failed to save referral. Please try again.";

        setDialogMessage(
          message ||
            (isEditMode
              ? "Failed to update referral. Please try again."
              : "Failed to save referral. Please try again.")
        );
        setShowErrorDialog(true);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleSubmitWithStatus = async (status: "draft" | "active") => {
    submitStatusRef.current = status;
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(setNestedObjectValues(errors, true));
      return;
    }
    formik.submitForm();
  };

  const fieldError = (field: keyof ReferralFormState) =>
    formik.touched[field] && formik.errors[field] ? String(formik.errors[field]) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
          {isEditMode ? "Edit Patient Referral" : "Patient Referral"}
        </h1>
        <BackToPreviousPageButton
          className="shrink-0 self-start sm:self-auto"
          onClick={onBack}
          text="Back"
        />
      </div>

      <form onSubmit={formik.handleSubmit} noValidate>
        <div className="space-y-6">
          <FormSection title="Basic Information">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormInputField
          label="Patient Name *"
          width="100%"
          name="patientName"
          value={formik.values.patientName}
          onChange={(e) => {
            const value = e.target.value;

            // Allow only letters and spaces
            if (/^[A-Za-z\s]*$/.test(value)) {
              formik.setFieldValue("patientName", value);
            }
          }}
          onBlur={formik.handleBlur}
          error={fieldError("patientName")}
          placeholder="Patient Name"
        />
              <FormInputField
                label="Patient UHID *"
                width="100%"
                name="patientUhid"
                value={formik.values.patientUhid}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={fieldError("patientUhid")}
                placeholder="Patient UHID"
              />
              <FormInputField
            label="Age *"
            width="100%"
            name="age"
            value={formik.values.age}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ""); // Allow only digits
              formik.setFieldValue("age", value);
            }}
            onBlur={formik.handleBlur}
            error={fieldError("age")}
            placeholder="Age"
            inputMode="numeric"
          />
              <FormSelectField
                label="Gender *"
                width="100%"
                height={44}
                options={GENDER_OPTIONS}
                value={formik.values.gender}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  formik.setFieldValue("gender", next || null);
                }}
                onBlur={() => formik.setFieldTouched("gender", true)}
                error={fieldError("gender")}
                placeholder="Select"
                background="white"
              />
            </div>
          </FormSection>

          <FormSection title="Vitals at Time of Referral">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormInputField
                  label="Temperature *"
                  width="100%"
                  name="temperature"
                  value={formik.values.temperature}
                  onChange={(event) => {
                    void formik.setFieldValue("temperature", formatTemperatureInput(event.target.value));
                  }}
                  onBlur={formik.handleBlur}
                  error={fieldError("temperature")}
                  placeholder="Temperature (°F)"
                  suffix={unitSuffix("°F")}
                  maxLength={5}
                />
                <FormInputField
                  label="Heart Rate *"
                  width="100%"
                  name="pulse"
                  value={formik.values.pulse}
                  onChange={(event) => {
                    void formik.setFieldValue("pulse", formatHeartRateInput(event.target.value));
                  }}
                  onBlur={formik.handleBlur}
                  error={fieldError("pulse")}
                  placeholder="Heart Rate"
                  suffix={unitSuffix("bpm")}
                  maxLength={3}
                />
                <FormInputField
                  label="Blood Pressure *"
                  width="100%"
                  name="bloodPressure"
                  value={formik.values.bloodPressure}
                  onChange={(event) => {
                    void formik.setFieldValue("bloodPressure", formatBloodPressureInput(event.target.value));
                  }}
                  onBlur={formik.handleBlur}
                  error={fieldError("bloodPressure")}
                  placeholder="Systolic/Diastolic(mmHg/mmHg)"
                  suffix={unitSuffix("mmHg")}
                  maxLength={7}
                />
                <FormInputField
                  label="SPO2 *"
                  width="100%"
                  name="spo2"
                  value={formik.values.spo2}
                  onChange={(event) => {
                    void formik.setFieldValue("spo2", formatSpo2Input(event.target.value));
                  }}
                  onBlur={formik.handleBlur}
                  error={fieldError("spo2")}
                  placeholder="SPO2"
                  suffix={unitSuffix("%")}
                  maxLength={3}
                />
              </div>
            </div>
          </FormSection>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <FormSection title="Referral From">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInputField
                  label="Hospital Name *"
                  width="100%"
                  name="fromHospitalName"
                  value={formik.values.fromHospitalName}
                  // onChange={formik.handleChange}
                    onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z\s]/g, ""); // Allow only letters and spaces
                    formik.setFieldValue("fromHospitalName", value);
                  }}
                  onBlur={formik.handleBlur}
                  error={fieldError("fromHospitalName")}
                  placeholder="Hospital Name"
                />
                <FormInputField
                  label="Department *"
                  width="100%"
                  name="fromDepartment"
                  value={formik.values.fromDepartment}
                  // onChange={formik.handleChange}
                    onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z\s]/g, "");
                    formik.setFieldValue("fromDepartment", value);
                  }}
                  onBlur={formik.handleBlur}
                  error={fieldError("fromDepartment")}
                  placeholder="Department"
                />
                <FormInputField
                  label="Age *"
                  width="100%"
                  name="fromAge"
                  value={formik.values.fromAge}
                  onChange={(e) => {
                    const value = e.target.value;

                    // Allow only numbers
                    if (/^\d*$/.test(value)) {
                      formik.setFieldValue("fromAge", value);
                    }
                  }}
                  onBlur={formik.handleBlur}
                  error={fieldError("fromAge")}
                  placeholder="Age"
                />
                <FormSelectField
                  label="Gender *"
                  width="100%"
                  height={44}
                  options={GENDER_OPTIONS}
                  value={formik.values.fromGender}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    formik.setFieldValue("fromGender", next || null);
                  }}
                  onBlur={() => formik.setFieldTouched("fromGender", true)}
                  error={fieldError("fromGender")}
                  placeholder="Select"
                  background="white"
                />
              </div>
            </FormSection>

            <FormSection title="Referred To">
              <div className="space-y-4">
                <FormInputField
                  label="Hospital Name *"
                  width="100%"
                  name="toHospitalName"
                  value={formik.values.toHospitalName}
                  // onChange={formik.handleChange}
                    onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z\s]/g, "");
                    formik.setFieldValue("toHospitalName", value);
                  }}
                  onBlur={formik.handleBlur}
                  error={fieldError("toHospitalName")}
                  placeholder="Hospital Name"
                />
                <FormTextareaField
                  label="Reason for Referral *"
                  width="100%"
                  name="reasonForReferral"
                  value={formik.values.reasonForReferral}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={fieldError("reasonForReferral")}
                  placeholder="Reason for Referral"
                  rows={4}
                />
              </div>
            </FormSection>
          </div>

          <FormSection title="Additional Details">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <FormTextareaField
                  label="Provisional / Final Diagnosis *"
                  width="100%"
                  name="diagnosis"
                  value={formik.values.diagnosis}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={fieldError("diagnosis")}
                  placeholder="Provisional / Final Diagnosis"
                  rows={5}
                />
                <FormTextareaField
                  label="Chief Complaints *"
                  width="100%"
                  name="chiefComplaints"
                  value={formik.values.chiefComplaints}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={fieldError("chiefComplaints")}
                  placeholder="Chief Complaints"
                  rows={5}
                />
              </div>

              <div>
                {/* <p className="mb-3 text-sm font-medium text-[#262D3B]">Doctor Confirmation / E-signature</p>
                <div className="rounded-[16px] border border-dashed border-[#D1D5DB] bg-[#FCFDFC] px-5 py-8">
                  <p
                    className="text-center text-[28px] leading-none text-[#434956]"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
                  >
                    {formik.values.doctorName || "Doctor Signature"}
                  </p>
                </div> */}

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormInputField
                    label="Doctor Name *"
                    width="100%"
                    name="doctorName"
                    value={formik.values.doctorName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={fieldError("doctorName")}
                    placeholder="Doctor Name"
                  />
                  <DatePicker
                    label="Date & Time Stamp *"
                    value={formik.values.dateTimeStamp}
                    onChange={(value) => formik.setFieldValue("dateTimeStamp", value)}
                    onBlur={() => formik.setFieldTouched("dateTimeStamp", true)}
                    error={fieldError("dateTimeStamp")}
                    placeholder="Select date"
                    width="100%"
                    background="white"
                    disablePastDates={false}
                  />
                </div>
              </div>
            </div>
          </FormSection>

          <div className="flex flex-wrap justify-end gap-3">
            {/* <button
              type="button"
              disabled={isSaving || formik.isSubmitting}
              onClick={() => handleSubmitWithStatus("draft")}
              className="flex h-11 items-center justify-center rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium text-[#9A7909] transition-colors hover:bg-[#FDF8E8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save &amp; Draft
            </button> */}
            <Button
              type="button"
              variant="primary"
              size="medium"
              className="!min-w-0"
              disabled={isSaving || formik.isSubmitting}
              onClick={() => handleSubmitWithStatus("active")}
            >
              {isSaving || formik.isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Submitting..."
                : isEditMode
                  ? "Update"
                  : "Submit"}
            </Button>
          </div>
        </div>
      </form>

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
    </div>
  );
}

export default function PatientReferralPage() {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingReferral, setEditingReferral] = useState<ReferPatientListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState("patientName");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
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
  }, [debouncedSearch, sortBy, sortOrder, selectedBranch, resolvedFilterBranchId]);

  const referralParams =
    resolvedFilterBranchId == null
      ? null
      : {
          branchId: resolvedFilterBranchId,
          search: debouncedSearch.trim() || undefined,
          sortBy,
          order: sortOrder,
          page: currentPage,
          limit: itemsPerPage,
        };

  const {
    data: referralsRes,
    isLoading: isReferralsLoading,
  } = useGetReferPatientListingQuery(referralParams!, {
    skip: referralParams == null || view !== "list",
    refetchOnMountOrArgChange: true,
    // placeholderData: keepPreviousData,
  });

  const referrals = referralsRes?.data ?? [];
  const totalItems = referralsRes?.total ?? 0;
  const isTableLoading = isReferralsLoading;

  const handleReferralSuccess = () => {
    setEditingReferral(null);
    setCurrentPage(1);
    setView("list");
  };

  const openCreateReferralForm = () => {
    setEditingReferral(null);
    setView("form");
  };

  const openEditReferralForm = (referral: ReferPatientListItem) => {
    setEditingReferral(referral);
    setView("form");
  };

  if (view === "form") {
    return (
      <AppShell>
        <PatientReferralForm
          key={editingReferral?.id ?? "create"}
          referralToEdit={editingReferral}
          onBack={() => {
            setEditingReferral(null);
            setView("list");
          }}
          onSuccess={handleReferralSuccess}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
            Patient Referral
          </h1>

          {/* <Button
            variant="outline"
            size="medium"
            className="!min-w-0"
            onClick={openCreateReferralForm}
            leftIcon={<Image src="/icons/AddIcon.svg" alt="" width={16} height={16} />}
          >
            Refer Patient
          </Button> */}
            <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-[32px] border border-[#0B8C00] px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
            onClick={openCreateReferralForm}
            >
            <Image src="/icons/AddIcon.svg" alt="Refer Patient" width={20} height={20} />
            <span className="text-hide">Refer Patient</span>
        </button>
        </div>

        <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-medium text-[#262D3B]">Referred Patient</h2>

            <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <div className="w-full sm:w-[280px] sm:shrink-0">
                <FormSelectField
                  label=""
                  hideLabel
                  options={hookBranchFilterOptions}
                  value={selectedBranch}
                  onChange={(value) => {
                    setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                    setCurrentPage(1);
                  }}
                  placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                  mode="single"
                  background="normal"
                  width="100%"
                  disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                />
              </div>
              <div className="w-full sm:w-[260px] sm:shrink-0">
                <TableSearchInput
                  value={searchTerm}
                  onChange={(value) => {
                    setSearchTerm(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search..."
                />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead position="first">Sr no.</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 cursor-pointer"
                    onClick={() => {
                      setSortBy("patientName");
                      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                      setCurrentPage(1);
                    }}
                  >
                    Patient Name
                    <Image src="/icons/SortByAscDes.svg" alt="Sort" width={12} height={12} />
                  </button>
                </TableHead>
                <TableHead>Referred From</TableHead>
                <TableHead>Referred to</TableHead>
                <TableHead>Referred by</TableHead>
                <TableHead>Referred on</TableHead>
                <TableHead>Status</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading referred patients...
                    </div>
                  </TableData>
                </TableRow>
              ) : referrals.length === 0 ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
                    No referred patients found.
                  </TableData>
                </TableRow>
              ) : (
                referrals.map((row, index) => {
                  const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");
                  const statusDisplay = formatReferralStatus(row.status);
                  const isEditable = canEditReferral(row.status);

                  return (
                    <TableRow key={row.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                      <TableData variant="primary">{srNo}</TableData>
                      <TableData>
                        <div className="min-w-[160px]">
                          <div className="font-medium text-[#262D3B]">
                          <TruncatedTableCell
                          key={`referral-patient-list-${row.id ?? index}`}
                          text={[row.patientTitle, row.patientName].filter(Boolean).join(" ") || "N/A"}
                           />
                          </div>

                          <p className="mt-0.5 text-xs text-[#262D3B]">{row.uhid}</p>
                        </div>
                      </TableData>
                      <TableData className="min-w-[180px]">{row.referralHospitalName || "N/A"}</TableData>
                      <TableData className="min-w-[180px]">{row.referredToHospital || "N/A"}</TableData>
                      <TableData>{row.referralDoctorName || "N/A"}</TableData>
                      <TableData>{formatReferralDate(row.referralDate)}</TableData>
                      <TableData>
                        <StatusPill label={statusDisplay.label} tone={statusDisplay.tone} />
                      </TableData>
                      <TableData>
                         <Tooltip content="Edit" position="top" delay={0}>
                        <button
                          type="button"
                          disabled={!isEditable}
                          className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                            isEditable ? "hover:bg-[#F7FAF7]" : "cursor-not-allowed opacity-40"
                          }`}
                          aria-label={`Edit ${row.patientName}`}
                          onClick={() => {
                            if (isEditable) openEditReferralForm(row);
                          }}
                        >
                          <Image src="/icons/EditIconBlack.svg" alt="Edit" width={18} height={18} />
                        </button>
                        </Tooltip>
                      </TableData>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {totalItems > 0 ? (
            <div className="mt-4">
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
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
