"use client";

import { FormInputField, FormSelectField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";

export interface PatientDetailsFormData {
  mobileNumber: string;
  title: string;
  patientName: string;
  uhid: string;
  whoVisited?: string;
}

interface PatientDetailsProps {
  formData: PatientDetailsFormData;
  onChange: (field: keyof PatientDetailsFormData, value: string) => void;
  onBlur?: (field: keyof PatientDetailsFormData) => void;
  titleOptions?: SelectOption[];
  title?: string;
  fieldRefs?: {
    mobileNumber?: React.RefObject<HTMLInputElement | null>;
    title?: React.RefObject<HTMLDivElement | null>;
    patientName?: React.RefObject<HTMLInputElement | null>;
    uhid?: React.RefObject<HTMLInputElement | null>;
    whoVisited?: React.RefObject<HTMLDivElement | null>;
  };
  errors?: Record<string, string>;
  readOnly?: boolean;
  isMobileNumberLoading?: boolean; // Show loading spinner on mobile number field
}

export default function PatientDetails({
  formData,
  onChange,
  onBlur,
  titleOptions = [
    { value: "Mr", label: "Mr" },
    { value: "Mrs", label: "Mrs" },
    { value: "Miss", label: "Miss" },
    { value: "Ms", label: "Ms" },
    { value: "Dr", label: "Dr" },
    { value: "TG", label: "TG" },
  ],
  title = "Patient Details",
  fieldRefs,
  errors,
  readOnly = false,
  isMobileNumberLoading = false,
}: PatientDetailsProps) {
  return (
    <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2>

      <div className="space-y-4">
        {/* First Row: Mobile Number (50%) | Title + Patient Name (50% together) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Mobile Number - 50% width */}
          <div
            ref={fieldRefs?.mobileNumber}
            data-field="mobileNumber"
            className="scroll-mt-4 relative"
          >
            <FormInputField
              label="Mobile Number *"
              value={formData.mobileNumber}
              onChange={(e) => {
                if (readOnly) return;
                const value = e.target.value.replace(/\D/g, "").slice(0, 10); // Only allow digits, max 10
                onChange("mobileNumber", value);
              }}
              onBlur={() => onBlur?.("mobileNumber")}
              placeholder="Mobile Number"
              required
              type="tel"
              maxLength={10}
              error={errors?.mobileNumber}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {isMobileNumberLoading && (
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

          {/* Title + Patient Name - 50% width together */}
          <div className="flex gap-2">
            <div
              ref={fieldRefs?.title}
              data-field="title"
              className="scroll-mt-4"
            >
              <FormSelectField
                label="Title *"
                options={titleOptions}
                placeholder="Select"
                background="white"
                width={115}
                dropdownWidth={160}
                value={formData.title || null}
                onChange={(value) => {
                  if (readOnly) return;
                  const selectedValue = Array.isArray(value) ? value[0] : value;
                  onChange("title", selectedValue || "");
                  if (selectedValue) {
                    setTimeout(() => {
                      onBlur?.("title");
                    }, 0);
                  }
                }}
                onBlur={() => onBlur?.("title")}
                error={errors?.title}
                disabled={readOnly}
              />
              {errors?.title && (
                <p className="mt-1 text-xs text-[#F6776E]">{errors.title}</p>
              )}
            </div>

            <div
              ref={fieldRefs?.patientName}
              data-field="patientName"
              className="scroll-mt-4 flex-1"
            >
              <FormInputField
                label="Patient Name *"
                value={formData.patientName}
                onChange={(e) => {
                  if (readOnly) return;
                  // Only allow letters and spaces
                  const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  onChange("patientName", value);
                }}
                onBlur={() => onBlur?.("patientName")}
                placeholder="Patient Name"
                required
                error={errors?.patientName}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Second Row: UHID (66.6%) and Who visited (33.3%) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          ref={fieldRefs?.uhid}
          data-field="uhid"
          className="scroll-mt-4 md:col-span-2"
        >
          <FormInputField
            label="UHID"
            value={formData.uhid}
            onChange={(e) => {
              if (readOnly) return;
              // Remove spaces, allow alphanumeric characters, limit to 15 characters
              const value = e.target.value.replace(/\s/g, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 15).toUpperCase();
              onChange("uhid", value);
            }}
            onBlur={() => onBlur?.("uhid")}
            placeholder="UHID"
            type="text"
            maxLength={15}
            error={errors?.uhid}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </div>
        
        {/* Who Visited - Patient or Visitor */}
        <div
          ref={fieldRefs?.whoVisited}
          data-field="whoVisited"
          className="scroll-mt-4 md:col-span-1"
        >
          <PatientTypeButtonGroup
            label="Who visited"
            options={["Patient", "Visitor"]}
            value={formData.whoVisited || ""}
            onChange={(value) => {
              // Always allow changing "Who visited" field, even in read-only mode
              onChange("whoVisited", value);
            }}
            onBlur={() => onBlur?.("whoVisited")}
            error={errors?.whoVisited}
            fieldRef={fieldRefs?.whoVisited}
            dataField="whoVisited"
            required={true}
          />
        </div>
       
          </div>
       
      </div>
    </div>
  );
}

