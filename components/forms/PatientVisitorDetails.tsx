"use client";

import { FormInputField, FormSelectField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface PatientVisitorFormData {
  mobileNumber: string;
  aadharCardNumber: string;
  visitorNameSelect: string;
  visitorName: string;
  patientNameSelect: string;
  patientName: string;
  purpose: string;
  patientUHID: string;
  patientMobileNumber: string;
}

interface PatientVisitorDetailsProps {
  data: PatientVisitorFormData;
  onChange: (field: keyof PatientVisitorFormData, value: string) => void;
  onBlur?: (field: keyof PatientVisitorFormData) => void;
  title?: string;
  showPatientFields?: boolean; // Control visibility of Patient UHID and Patient Mobile Number fields
  fieldRefs?: {
    mobileNumber?: React.Ref<HTMLInputElement | null>;
    aadharCardNumber?: React.Ref<HTMLInputElement | null>;
    visitorTitle?: React.Ref<HTMLDivElement | null>;
    visitorName?: React.Ref<HTMLInputElement | null>;
    patientTitle?: React.Ref<HTMLDivElement | null>;
    patientName?: React.Ref<HTMLInputElement | null>;
    purpose?: React.Ref<HTMLInputElement | null>;
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
        {/* Row 1: Mobile, Aadhar, Visitor Name */}
        <div className="flex w-full gap-4">
          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.mobileNumber}
              label="Mobile Number *"
              value={data.mobileNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10); // Only allow digits, max 10
                onChange("mobileNumber", value);
              }}
              onBlur={() => onBlur?.("mobileNumber")}
              placeholder="Mobile Number"
              required
              type="tel"
              maxLength={10}
              error={errors?.mobileNumber}
            />
          </div>

          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.aadharCardNumber}
              label="Aadhar Card Number"
              value={data.aadharCardNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                onChange("aadharCardNumber", value);
              }}
              onBlur={() => onBlur?.("aadharCardNumber")}
              placeholder="Aadhar Card Number"
              type="tel"
              maxLength={12}
              error={errors?.aadharCardNumber}
            />
          </div>

          <div className="flex gap-2 flex-1">
            <div
              ref={fieldRefs?.visitorTitle}
              data-field="visitorTitle"
              className="scroll-mt-4"
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
                  // Only allow letters and spaces
                  const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  onChange("visitorName", value);
                }}
                onBlur={() => onBlur?.("visitorName")}
                placeholder="Visitor Name"
                required
                error={errors?.visitorName}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Patient Name + Purpose */}
        <div className="flex w-full gap-4">
          <div className="flex gap-2 flex-1">
            <div
              ref={fieldRefs?.patientTitle}
              data-field="patientTitle"
              className="scroll-mt-4"
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
                  const selectedValue = Array.isArray(value) ? value[0] : (value as string);
                  onChange("patientNameSelect", selectedValue || "");
                  // If a value is selected, immediately mark as touched and validate to clear error
                  if (selectedValue) {
                    setTimeout(() => {
                      onBlur?.("patientNameSelect");
                    }, 0);
                  }
                }}
                onBlur={() => onBlur?.("patientNameSelect")}
              />
              {errors?.patientNameSelect && (
                <p className="mt-1 text-xs text-[#F6776E]">
                  {errors.patientNameSelect}
                </p>
              )}
            </div>
            <div className="flex-1">
              <FormInputField
                ref={fieldRefs?.patientName}
                label="Patient Name *"
                value={data.patientName}
                onChange={(e) => {
                  // Only allow letters and spaces
                  const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  onChange("patientName", value);
                }}
                onBlur={() => onBlur?.("patientName")}
                placeholder="Patient Name"
                required
                error={errors?.patientName}
              />
            </div>
          </div>

          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.purpose}
              label="Purpose *"
              value={data.purpose}
              onChange={(e) => {
                // Only allow letters and spaces
                const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                onChange("purpose", value);
              }}
              onBlur={() => onBlur?.("purpose")}
              placeholder="Purpose"
              required
              error={errors?.purpose}
            />
          </div>
        </div>

        {/* Row 3: Patient UHID and Patient Mobile Number (Optional) - Only show if showPatientFields is true */}
        {showPatientFields && (
          <div className="flex w-full gap-4">
            <div className="flex-1">
              <FormInputField
                ref={fieldRefs?.patientUHID}
                label="Patient UHID"
                value={data.patientUHID || ""}
                onChange={(e) => {
                  // Remove spaces, allow alphanumeric characters, limit to 15 characters
                  const value = e.target.value.replace(/\s/g, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 15).toUpperCase();
                  onChange("patientUHID", value);
                }}
                onBlur={() => onBlur?.("patientUHID")}
                placeholder="Patient UHID"
                type="text"
                maxLength={15}
                error={errors?.patientUHID}
              />
            </div>

            <div className="flex-1">
              <FormInputField
                ref={fieldRefs?.patientMobileNumber}
                label="Patient Mobile Number"
                value={data.patientMobileNumber || ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10); // Only allow digits, max 10
                  onChange("patientMobileNumber", value);
                }}
                onBlur={() => onBlur?.("patientMobileNumber")}
                placeholder="Patient Mobile Number"
                type="tel"
                maxLength={10}
                error={errors?.patientMobileNumber}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


