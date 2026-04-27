"use client";

import { FormInputField, FormSelectField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface OtherVisitorFormData {
  phoneNumber: string;
  aadharCardNumber: string;
  visitorNameSelect: string;
  visitorName: string;
  whomToMeet: string;
  typeOfVisit: string;
}

interface OtherVisitorDetailsProps {
  data: OtherVisitorFormData;
  onChange: (field: keyof OtherVisitorFormData, value: string) => void;
  onBlur?: (field: keyof OtherVisitorFormData) => void;
  title?: string;
  /** When true, show loader on Aadhaar field (for existing-visitor lookup) */
  isAadharLoading?: boolean;
  /** When true, Aadhaar input is disabled (e.g. after selecting visitor from dialog) */
  aadharReadOnly?: boolean;
  /** When true, Visitor Phone/Title/Name are non-editable */
  visitorIdentityReadOnly?: boolean;
  /** When provided, overrides visitorIdentityReadOnly for the phone number field only */
  mobileNumberReadOnly?: boolean;
  /** When provided, overrides visitorIdentityReadOnly for the visitor title dropdown only */
  visitorTitleReadOnly?: boolean;
  fieldRefs?: {
    phoneNumber?: React.Ref<HTMLInputElement | null>;
    aadharCardNumber?: React.Ref<HTMLInputElement | null>;
    visitorTitle?: React.Ref<HTMLDivElement | null>;
    visitorName?: React.Ref<HTMLInputElement | null>;
    whomToMeet?: React.Ref<HTMLInputElement | null>;
    typeOfVisit?: React.Ref<HTMLDivElement | null>;
  };
  errors?: Record<string, string>;
  visitorTitleOptions?: SelectOption[];
}

export default function OtherVisitorDetails({
  data,
  onChange,
  onBlur,
  title = "Others",
  isAadharLoading = false,
  aadharReadOnly = false,
  visitorIdentityReadOnly = false,
  mobileNumberReadOnly,
  visitorTitleReadOnly,
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
}: OtherVisitorDetailsProps) {
  return (
    <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h3 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h3>

      <div className="flex flex-col gap-4">
        {/* Row 1: Aadhar Card Number, Phone Number, Title + Visitor Name */}
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
              onBlur={() => {
                onBlur?.("aadharCardNumber");
              }}
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.phoneNumber}
              label="Phone Number *"
              value={data.phoneNumber}
              onChange={(e) => {
                const isPhoneReadOnly = mobileNumberReadOnly !== undefined ? mobileNumberReadOnly : visitorIdentityReadOnly;
                if (isPhoneReadOnly) return;
                let value = e.target.value.replace(/\D/g, "");
                value = value.replace(/^0+/, "");
                value = value.slice(0, 10);
                onChange("phoneNumber", value);
              }}
              onBlur={() => {
                onBlur?.("phoneNumber");
              }}
              placeholder="Phone Number"
              required
              type="tel"
              maxLength={10}
              error={errors?.phoneNumber}
              disabled={mobileNumberReadOnly !== undefined ? mobileNumberReadOnly : visitorIdentityReadOnly}
            />
          </div>

          <div className={`flex gap-2 col-span-2 lg:col-span-1 ${(visitorTitleReadOnly !== undefined ? visitorTitleReadOnly : visitorIdentityReadOnly) ? "cursor-not-allowed" : ""}`}>
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
                  onChange("visitorNameSelect", selectedValue);
                  // For select fields, if a value is selected, call onBlur immediately
                  if (selectedValue && selectedValue.trim() !== "") {
                    setTimeout(() => {
                      onBlur?.("visitorNameSelect");
                    }, 0);
                  }
                }}
                onBlur={() => {
                  onBlur?.("visitorNameSelect");
                }}
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
                // Only allow letters and spaces; prevent leading spaces while typing
                let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                value = value.replace(/^\s+/, "");
                // Collapse consecutive repeated characters to max 2 (e.g. "aaaa" -> "aa")
                value = value.replace(/(.)\1{2,}/g, "$1$1");
                // Ensure first character is uppercase (e.g. "test kumar" -> "Test kumar")
                if (value.length > 0) {
                  value = value.charAt(0).toUpperCase() + value.slice(1);
                }
                // Limit to maximum 100 characters
                value = value.slice(0, 100);
                onChange("visitorName", value);
              }}
              onBlur={(e) => {
                // On blur, trim both sides so no leading/trailing spaces remain
                const trimmed = e.target.value.trim();
                if (trimmed !== e.target.value) {
                  onChange("visitorName", trimmed);
                }
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
        </div>

        {/* Row 2: Whom To Meet and Type of Visit */}
        <div className="flex w-full gap-4">
          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.whomToMeet}
              label="Whom To Meet"
              value={data.whomToMeet}
              onChange={(e) => {
                // Only allow letters and spaces; auto-capitalize first character
                let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                if (value.length > 0) {
                  value = value.charAt(0).toUpperCase() + value.slice(1);
                }
                value = value.slice(0, 100);
                onChange("whomToMeet", value);
              }}
              onBlur={() => {
                onBlur?.("whomToMeet");
              }}
              placeholder="Whom To Meet"
              maxLength={100}
              error={errors?.whomToMeet}
            />
          </div>

          <div className="lg:w-1/3 md:w-1/2 w-full">
            <div
              data-field="typeOfVisit"
              className="scroll-mt-4"
            >
              <PatientTypeButtonGroup
                options={["Personal", "Official"]}
                value={data.typeOfVisit ? data.typeOfVisit.toLowerCase() : "personal"}
                onChange={(value) => {
                  // Convert to proper case: "personal" -> "Personal", "official" -> "Official"
                  const mappedValue = value.charAt(0).toUpperCase() + value.slice(1);
                  onChange("typeOfVisit", mappedValue);
                  // If a value is selected, immediately mark as touched and validate to clear error
                  if (mappedValue) {
                    setTimeout(() => {
                      onBlur?.("typeOfVisit");
                    }, 0);
                  }
                }}
                onBlur={() => {
                  // Trigger validation when user leaves the field without selecting
                  onBlur?.("typeOfVisit");
                }}
                label="Type of Visit"
                required={false}
                error={errors?.typeOfVisit}
                fieldRef={fieldRefs?.typeOfVisit as React.RefObject<HTMLDivElement>}
                dataField="typeOfVisit"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

