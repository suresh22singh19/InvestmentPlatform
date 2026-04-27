"use client";

import { FormInputField, FormSelectField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface PatientVisitorFormData {
  mobileNumber: string;
  aadharCardNumber: string;
  visitorNameSelect: string;
  visitorName: string;
  patientNameSelect: string;
  patientName: string;
  purpose: string;
  searchType: string;
  patientUHID: string;
  patientMobileNumber: string;
}

export interface PatientVisitorDetailsProps {
  data: PatientVisitorFormData;
  onChange: (field: keyof PatientVisitorFormData, value: string) => void;
  onBlur?: (field: keyof PatientVisitorFormData) => void;
  title?: string;
  showPatientFields?: boolean; // Control visibility of Search Type and Patient UHID / Patient Mobile Number
  visitorIndex?: number;
  onVerify?: (visitorIndex: number) => void;
  isVerifyLoading?: boolean;
  /** When true, show loader on Aadhaar field (for existing-visitor lookup) */
  isAadharLoading?: boolean;
  /** When true, Aadhaar input is disabled (e.g. after selecting visitor from dialog) */
  aadharReadOnly?: boolean;
  /** When true, Visitor Mobile/Title/Name are non-editable */
  visitorIdentityReadOnly?: boolean;
  /** When provided, overrides visitorIdentityReadOnly for the mobile number field only */
  mobileNumberReadOnly?: boolean;
  /** When provided, overrides visitorIdentityReadOnly for the visitor title dropdown only */
  visitorTitleReadOnly?: boolean;
  /** When true, Patient Title and Patient Name are non-editable (filled via Verify) and show cursor-not-allowed */
  patientFieldsReadOnly?: boolean;
  /** When true, Patient Name field is read-only (e.g. after IPD verify). Overrides patientFieldsReadOnly for name only. */
  patientNameReadOnly?: boolean;
  /** When false, Patient Title dropdown is disabled (e.g. when title was from API). When true and patient is verified, user can select title. */
  patientTitleEditable?: boolean;
  fieldRefs?: {
    mobileNumber?: React.Ref<HTMLInputElement | null>;
    aadharCardNumber?: React.Ref<HTMLInputElement | null>;
    visitorTitle?: React.Ref<HTMLDivElement | null>;
    visitorName?: React.Ref<HTMLInputElement | null>;
    patientTitle?: React.Ref<HTMLDivElement | null>;
    patientName?: React.Ref<HTMLInputElement | null>;
    purpose?: React.Ref<HTMLInputElement | null>;
    searchType?: React.Ref<HTMLDivElement | null>;
    patientUHID?: React.Ref<HTMLInputElement | null>;
    patientMobileNumber?: React.Ref<HTMLInputElement | null>;
  };
  errors?: Record<string, string>;
  visitorTitleOptions?: SelectOption[];
  patientTitleOptions?: SelectOption[];
}

export default function PatientVisitorDetails({
  data,
  onChange,
  onBlur,
  title = "Patient Visitor (For OPD/Day Care)",
  showPatientFields = true, // Default to true to show fields for patient-visitor page
  visitorIndex = 0,
  onVerify,
  isVerifyLoading = false,
  isAadharLoading = false,
  aadharReadOnly = false,
  visitorIdentityReadOnly = false,
  mobileNumberReadOnly,
  visitorTitleReadOnly,
  patientFieldsReadOnly = false,
  patientNameReadOnly = false,
  patientTitleEditable = true,
  fieldRefs,
  errors,
  visitorTitleOptions = [
    { value: "Mr", label: "Mr" },
    { value: "Mrs", label: "Mrs" },
    { value: "Miss", label: "Miss" },
    { value: "Ms", label: "Ms" },
    { value: "Dr", label: "Dr" },
    { value: "TG", label: "TG" },
  ],
  patientTitleOptions = [
    { value: "Mr", label: "Mr" },
    { value: "Mrs", label: "Mrs" },
    { value: "Miss", label: "Miss" },
    { value: "Ms", label: "Ms" },
    { value: "Dr", label: "Dr" },
    { value: "TG", label: "TG" },
  ],
}: PatientVisitorDetailsProps) {
  return (
    <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h3 className="text-base font-medium leading-[120%] text-[#262D3B]">
        {title}
      </h3>

      <div className="flex flex-col gap-4">
        {/* Row 1: Aadhar, Mobile, Visitor Name */}
        <div className="grid w-full gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative flex-1">
            <FormInputField
              ref={fieldRefs?.aadharCardNumber}
              label="Aadhar Card Number"
              value={data.aadharCardNumber}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, "");
                // Aadhaar: first digit cannot be 0 or 1 – strip leading 0s and 1s
                value = value.replace(/^[01]+/, "");
                value = value.slice(0, 12);
                onChange("aadharCardNumber", value);
              }}
              onBlur={() => onBlur?.("aadharCardNumber")}
              placeholder="Aadhar Card Number"
              type="tel"
              maxLength={12}
              error={errors?.aadharCardNumber}
              className="!pr-12"
              disabled={aadharReadOnly}
            />
            {isAadharLoading && (
              <div className="absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
                <svg
                  className="h-5 w-5 animate-spin text-[#0B8C00]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.mobileNumber}
              label="Mobile Number *"
              value={data.mobileNumber}
              onChange={(e) => {
                const isMobileReadOnly = mobileNumberReadOnly !== undefined ? mobileNumberReadOnly : visitorIdentityReadOnly;
                if (isMobileReadOnly) return;
                let value = e.target.value.replace(/\D/g, "");
                value = value.replace(/^0+/, "");
                value = value.slice(0, 10);
                onChange("mobileNumber", value);
              }}
              onBlur={() => onBlur?.("mobileNumber")}
              placeholder="Mobile Number"
              required
              type="tel"
              maxLength={10}
              error={errors?.mobileNumber}
              disabled={mobileNumberReadOnly !== undefined ? mobileNumberReadOnly : visitorIdentityReadOnly}
            />
          </div>

          <div className={`flex gap-2 flex-1 ${(visitorTitleReadOnly !== undefined ? visitorTitleReadOnly : visitorIdentityReadOnly) ? "cursor-not-allowed" : ""}`}>
            <div
              ref={fieldRefs?.visitorTitle}
              data-field="visitorTitle"
              className={`scroll-mt-4 ${(visitorTitleReadOnly !== undefined ? visitorTitleReadOnly : visitorIdentityReadOnly) ? "cursor-not-allowed" : ""}`}
            >
              <FormSelectField
                label="Title *"
                options={visitorTitleOptions}
                placeholder="Select"
                background="white"
                width={115}
                dropdownWidth={160}
                value={data.visitorNameSelect}
                onChange={(value) => {
                  const isTitleReadOnly = visitorTitleReadOnly !== undefined ? visitorTitleReadOnly : visitorIdentityReadOnly;
                  if (isTitleReadOnly) return;
                  const selectedValue = Array.isArray(value) ? value[0] : (value as string);
                  onChange("visitorNameSelect", selectedValue || "");
                  // If a value is selected, immediately mark as touched and validate to clear error
                  if (selectedValue) {
                    setTimeout(() => {
                      onBlur?.("visitorNameSelect");
                    }, 0);
                  }
                }}
                onBlur={() => onBlur?.("visitorNameSelect")}
                disabled={visitorTitleReadOnly !== undefined ? visitorTitleReadOnly : visitorIdentityReadOnly}
              />
              {errors?.visitorNameSelect && (
                <p className="mt-1 text-xs text-[#F6776E]">
                  {errors.visitorNameSelect}
                </p>
              )}
            </div>
            <div className="flex-1">
              <FormInputField
                ref={fieldRefs?.visitorName}
                label="Visitor Name *"
                value={data.visitorName}
                onChange={(e) => {
                  if (visitorIdentityReadOnly) return;
                  // Only allow letters and spaces, max 100 characters; strip leading spaces only (trailing trimmed on blur)
                  let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  value = value.replace(/^\s+/, "");
                  // Collapse consecutive repeated characters to max 2 (e.g. "aaaa" -> "aa")
                  value = value.replace(/(.)\1{2,}/g, "$1$1");
                  // Ensure first character is uppercase (e.g. "test kumar" -> "Test kumar")
                  if (value.length > 0) {
                    value = value.charAt(0).toUpperCase() + value.slice(1);
                  }
                  value = value.slice(0, 100);
                  onChange("visitorName", value);
                }}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed !== e.target.value) onChange("visitorName", trimmed);
                  onBlur?.("visitorName");
                }}
                placeholder="Visitor Name"
                required
                maxLength={100}
                error={errors?.visitorName}
                readOnly={visitorIdentityReadOnly}
              />
            </div>
          </div>

          <div className="flex gap-2 flex-1">
            <div
              ref={fieldRefs?.patientTitle}
              data-field="patientTitle"
              className={`scroll-mt-4 ${(patientFieldsReadOnly || !patientTitleEditable) ? "cursor-not-allowed" : ""}`}
            >
              <FormSelectField
                label="Title *"
                options={patientTitleOptions}
                placeholder="Select"
                background="white"
                width={115}
                dropdownWidth={160}
                value={data.patientNameSelect}
                onChange={(value) => {
                  if (patientFieldsReadOnly || !patientTitleEditable) return;
                  const selectedValue = Array.isArray(value) ? value[0] : (value as string);
                  onChange("patientNameSelect", selectedValue || "");
                  if (selectedValue) {
                    setTimeout(() => {
                      onBlur?.("patientNameSelect");
                    }, 0);
                  }
                }}
                onBlur={() => onBlur?.("patientNameSelect")}
                disabled={patientFieldsReadOnly || !patientTitleEditable}
              />
              {errors?.patientNameSelect && (
                <p className="mt-1 text-xs text-[#F6776E]">
                  {errors.patientNameSelect}
                </p>
              )}
            </div>
            <div className={`flex-1 ${(patientFieldsReadOnly || patientNameReadOnly) ? "cursor-not-allowed" : ""}`}>
              <FormInputField
                ref={fieldRefs?.patientName}
                label="Patient Name *"
                value={data.patientName}
                onChange={(e) => {
                  if (patientFieldsReadOnly || patientNameReadOnly) return;
                  let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  value = value.replace(/^\s+/, "");
                  // Ensure first character is uppercase (e.g. "test kumar" -> "Test kumar")
                  if (value.length > 0) {
                    value = value.charAt(0).toUpperCase() + value.slice(1);
                  }
                  value = value.slice(0, 100);
                  onChange("patientName", value);
                }}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed !== e.target.value) onChange("patientName", trimmed);
                  onBlur?.("patientName");
                }}
                placeholder="Patient Name"
                required
                maxLength={100}
                error={errors?.patientName}
                readOnly={patientFieldsReadOnly || patientNameReadOnly}
              />
            </div>
          </div>

          <div className="flex-1 w-full col-span-full md:col-span-2 lg:col-span-2">
            <FormInputField
              ref={fieldRefs?.purpose}
              label="Purpose *"
              value={data.purpose}
              onChange={(e) => {
                // Only allow letters and spaces; auto-capitalize first character
                let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                if (value.length > 0) {
                  value = value.charAt(0).toUpperCase() + value.slice(1);
                }
                value = value.slice(0, 100);
                onChange("purpose", value);
              }}
              onBlur={() => onBlur?.("purpose")}
              placeholder="Purpose"
              required
              maxLength={100}
              error={errors?.purpose}
            />
          </div>

          {showPatientFields && (
            <div className="flex-1">
              <div data-field="searchType" className="scroll-mt-4">
                <PatientTypeButtonGroup
                  options={["UHID", "Phone"]}
                  value={data.searchType ? data.searchType.toLowerCase() : ""}
                  onChange={(value) => {
                    const mappedValue = value === "uhid" ? "UHID" : value.charAt(0).toUpperCase() + value.slice(1);
                    onChange("searchType", mappedValue);
                    if (mappedValue) {
                      setTimeout(() => {
                        onBlur?.("searchType");
                      }, 0);
                    }
                  }}
                  onBlur={() => onBlur?.("searchType")}
                  label="Search Type"
                  required={true}
                  error={errors?.searchType}
                  fieldRef={fieldRefs?.searchType as React.RefObject<HTMLDivElement>}
                  dataField="searchType"
                />
              </div>
            </div>

          )}
          {showPatientFields && (data.searchType === "UHID" || data.searchType === "Phone") && (
            <div className="flex-1 w-full col-span-full md:col-span-2 lg:col-span-2 flex flex-wrap items-start gap-3">
              {data.searchType === "UHID" && (
                <div className="flex-1 min-w-[180px]">
                  <FormInputField
                    ref={fieldRefs?.patientUHID}
                    label="Patient UHID *"
                    value={data.patientUHID || ""}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\s/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                      value = value.replace(/^0+/, "");
                      value = value.slice(0, 20);
                      onChange("patientUHID", value);
                    }}
                    onBlur={() => onBlur?.("patientUHID")}
                    placeholder="Patient UHID"
                    type="text"
                    maxLength={20}
                    error={errors?.patientUHID}
                  />
                </div>
              )}
              {data.searchType === "Phone" && (
                <div className="flex-1 min-w-[180px]">
                  <FormInputField
                    ref={fieldRefs?.patientMobileNumber}
                    label="Patient Mobile Number *"
                    value={data.patientMobileNumber || ""}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      value = value.replace(/^0+/, "");
                      value = value.slice(0, 10);
                      onChange("patientMobileNumber", value);
                    }}
                    onBlur={() => onBlur?.("patientMobileNumber")}
                    placeholder="Patient Mobile Number"
                    type="tel"
                    maxLength={10}
                    error={errors?.patientMobileNumber}
                  />
                </div>
              )}
              {onVerify && (
                <button
                  type="button"
                  onClick={() => onVerify(visitorIndex)}
                  disabled={isVerifyLoading || (data.searchType === "UHID" ? !(data.patientUHID || "").trim() : !(data.patientMobileNumber || "").trim())}
                  className="h-11 shrink-0 rounded-[32px] border border-[#0B8C00] bg-[#0B8C00] px-5 text-sm font-medium text-white transition-colors hover:bg-[#096b00] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifyLoading ? "Verifying..." : "Verify"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 3: Dynamic field based on Search Type - only one field shown */}

      </div>
    </div>
  );
}


