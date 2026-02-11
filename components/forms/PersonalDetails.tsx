"use client";

import { FormInputField, FormSelectField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface PersonalFormData {
  contactNumber: string;
  aadharCardNo: string;
  passportNumber: string;
  nationalId: string;
  patientNameSelect: string;
  patientName: string;
  age: string;
  indianForeignerNepal: string;
  emailAddress: string;
  maritalStatus: string;
  occupation: string;
  patientType: string;
  panel: string;
}

interface PersonalDetailsProps {
  formData: PersonalFormData;
  onChange: (field: keyof PersonalFormData, value: string) => void;
  onContactNumberChange?: (value: string) => void;
  onContactNumberBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (field: keyof PersonalFormData) => void;
  titleOptions?: SelectOption[];
  indianForeignerNepalOptions?: SelectOption[];
  maritalStatusOptions?: SelectOption[];
  patientTypeOptions?: SelectOption[];
  panelOptions?: SelectOption[];
  title?: string;
  fieldRefs?: {
    contactNumber?: React.RefObject<HTMLInputElement | null>;
    aadharCardNo?: React.RefObject<HTMLInputElement | null>;
    passportNumber?: React.RefObject<HTMLInputElement | null>;
    nationalId?: React.RefObject<HTMLInputElement | null>;
    patientNameSelect?: React.RefObject<HTMLDivElement | null>;
    patientName?: React.RefObject<HTMLInputElement | null>;
    age?: React.RefObject<HTMLInputElement | null>;
    indianForeignerNepal?: React.RefObject<HTMLDivElement | null>;
    patientType?: React.RefObject<HTMLDivElement | null>;
    panel?: React.RefObject<HTMLDivElement | null>;
  };
  errors?: Record<string, string>;
  readOnlyFields?: string[]; // Array of field names that should be read-only
}

export default function PersonalDetails({
  formData,
  onChange,
  onContactNumberChange,
  onContactNumberBlur,
  onBlur,
  titleOptions = [
    { value: "Mr", label: "Mr" },
    { value: "Mrs", label: "Mrs" },
    { value: "Miss", label: "Miss" },
    { value: "Ms", label: "Ms" },
    { value: "Dr", label: "Dr" },
    { value: "TG", label: "TG" },
  ],
  indianForeignerNepalOptions = [
    { value: "Indian", label: "Indian" },
    { value: "Foreigner", label: "Foreigner" },
    { value: "Nepal", label: "Nepal" },
  ],
  maritalStatusOptions = [
    { value: "Single", label: "Single" },
    { value: "Married", label: "Married" },
    { value: "Other", label: "Other" },
  ],
  patientTypeOptions = [
    { value: "Private", label: "Private" },
    { value: "Panel", label: "Panel" },
    { value: "TPA", label: "TPA" },
  ],
  panelOptions = [],
  title = "Personal Details",
  fieldRefs,
  errors,
  readOnlyFields = [],
}: PersonalDetailsProps) {
  
  // Helper to check if a field is read-only
  const isFieldReadOnly = (fieldName: string) => readOnlyFields.includes(fieldName);
  return (
    <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FormInputField
          ref={fieldRefs?.contactNumber}
          label="Contact Number *"
          value={formData.contactNumber}
          onChange={(e) => {
            if (!isFieldReadOnly("contactNumber")) {
            const value = e.target.value.replace(/\D/g, "").slice(0, 10); // Only allow digits, max 10
            onChange("contactNumber", value);
              // Call onContactNumberChange if provided (for checking existing patients)
              onContactNumberChange?.(value);
            }
          }}
          onBlur={(e) => {
            onBlur?.("contactNumber");
            onContactNumberBlur?.(e);
          }}
          placeholder="Contact Number"
          required
          type="tel"
          maxLength={10}
          error={errors?.contactNumber}
          disabled={isFieldReadOnly("contactNumber")}
          readOnly={isFieldReadOnly("contactNumber")}
        />
        <div className="flex gap-2">
          <div
            data-field="patientNameSelect"
            className="scroll-mt-4"
          >
            <FormSelectField
              ref={fieldRefs?.patientNameSelect}
              label="Title *"
              options={titleOptions}
              placeholder="Select"
              background="white"
              width={115}
              dropdownWidth={160}
              value={formData.patientNameSelect}
              onChange={(value) => {
                if (!isFieldReadOnly("patientNameSelect")) {
                const selectedValue = Array.isArray(value) ? value[0] : value;
                onChange("patientNameSelect", selectedValue || "");
                // If a value is selected, immediately mark as touched and validate to clear error
                if (selectedValue) {
                  setTimeout(() => {
                    onBlur?.("patientNameSelect");
                  }, 0);
                  }
                }
              }}
              onBlur={() => onBlur?.("patientNameSelect")}
              disabled={isFieldReadOnly("patientNameSelect")}
            />
            {errors?.patientNameSelect && (
              <p className="mt-1 text-xs text-[#F6776E]">{errors.patientNameSelect}</p>
            )}
          </div>
          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.patientName}
              label="Patient Name *"
              value={formData.patientName}
              onChange={(e) => {
                if (!isFieldReadOnly("patientName")) {
                // Only allow letters and spaces
                const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                onChange("patientName", value);
                }
              }}
              onBlur={() => onBlur?.("patientName")}
              placeholder="Patient Name"
              required
              error={errors?.patientName}
              disabled={isFieldReadOnly("patientName")}
              readOnly={isFieldReadOnly("patientName")}
            />
          </div>
        </div>
        <div
          data-field="indianForeignerNepal"
          className="scroll-mt-4"
        >
          <FormSelectField
            ref={fieldRefs?.indianForeignerNepal}
            label="Indian / Foreigner / Nepal *"
            options={indianForeignerNepalOptions}
            placeholder="Select"
            background="white"
            value={formData.indianForeignerNepal}
            onChange={(value) => {
              if (!isFieldReadOnly("indianForeignerNepal")) {
              const selectedValue = Array.isArray(value) ? value[0] : value;
              onChange("indianForeignerNepal", selectedValue || "");
              // Clear the other ID fields when nationality changes
              if (selectedValue === "Indian") {
                onChange("passportNumber", "");
                onChange("nationalId", "");
              } else if (selectedValue === "Foreigner") {
                onChange("aadharCardNo", "");
                onChange("nationalId", "");
              } else if (selectedValue === "Nepal") {
                onChange("aadharCardNo", "");
                onChange("passportNumber", "");
              }
              // If a value is selected, immediately mark as touched and validate to clear error
              if (selectedValue) {
                setTimeout(() => {
                  onBlur?.("indianForeignerNepal");
                }, 0);
                }
              }
            }}
            onBlur={() => onBlur?.("indianForeignerNepal")}
            disabled={isFieldReadOnly("indianForeignerNepal")}
          />
          {errors?.indianForeignerNepal && (
            <p className="mt-1 text-xs text-[#F6776E]">{errors.indianForeignerNepal}</p>
          )}
        </div>

        {/* Show Aadhar Card No. for Indian */}
        {formData.indianForeignerNepal === "Indian" && (
          <FormInputField
            ref={fieldRefs?.aadharCardNo}
            label="Aadhar Card No. *"
            value={formData.aadharCardNo}
            onChange={(e) => {
              if (!isFieldReadOnly("aadharCardNo")) {
              const value = e.target.value.replace(/\D/g, "").slice(0, 12); // Only allow digits, max 12
              onChange("aadharCardNo", value);
              }
            }}
            onBlur={() => onBlur?.("aadharCardNo")}
            placeholder="Aadhar Card No."
            required
            type="tel"
            maxLength={12}
            error={errors?.aadharCardNo}
            disabled={isFieldReadOnly("aadharCardNo")}
            readOnly={isFieldReadOnly("aadharCardNo")}
          />
        )}

        {/* Show Passport Number for Foreigner */}
        {formData.indianForeignerNepal === "Foreigner" && (
          <FormInputField
            ref={fieldRefs?.passportNumber}
            label="Passport Number *"
            value={formData.passportNumber}
            onChange={(e) => {
              // Allow alphanumeric characters, 6-9 characters (global passport standard)
              // Convert letters to uppercase automatically
              const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 9);
              onChange("passportNumber", value);
            }}
            onBlur={() => onBlur?.("passportNumber")}
            placeholder="Passport Number"
            required
            type="text"
            maxLength={9}
            error={errors?.passportNumber}
          />
        )}

        {/* Show National ID for Nepal */}
        {formData.indianForeignerNepal === "Nepal" && (
          <FormInputField
            ref={fieldRefs?.nationalId}
            label="National Id *"
            value={formData.nationalId}
            onChange={(e) => {
              // Only allow digits, max 12 characters
              const value = e.target.value.replace(/\D/g, "").slice(0, 12);
              onChange("nationalId", value);
            }}
            onBlur={() => onBlur?.("nationalId")}
            placeholder="National Id"
            required
            type="tel"
            maxLength={12}
            error={errors?.nationalId}
          />
        )}



        <FormInputField
          ref={fieldRefs?.age}
          label="Age (In Years) *"
          value={formData.age}
          onChange={(e) => {
            let value = e.target.value.replace(/\D/g, ""); // Only allow digits
            // Remove leading zeros (e.g., "000" becomes "", "0005" becomes "5", "0056" becomes "56")
            value = value.replace(/^0+/, "") || "";
            // Limit to 3 digits max
            value = value.slice(0, 3);
            // Ensure value is between 1 and 120
            if (value && parseInt(value, 10) > 120) {
              value = "120";
            }
            onChange("age", value);
          }}
          onBlur={() => onBlur?.("age")}
          placeholder="Age (In Years)"
          required
          type="tel"
          maxLength={3}
          error={errors?.age}
        />
        <div
          data-field="patientType"
          className="scroll-mt-4"
        >
          <PatientTypeButtonGroup
            options={["Private", "Panel", "TPA"]}
            value={formData.patientType === "private" ? "private" : (formData.patientType ? formData.patientType.toLowerCase() : "")}
            onChange={(value) => {
              // Convert back: "private" -> "Normal", "panel" -> "Panel", "tpa" -> "TPA"
              const mappedValue = value === "private" ? "Private" : value.charAt(0).toUpperCase() + value.slice(1);
              onChange("patientType", mappedValue);
              // If a value is selected, immediately mark as touched and validate to clear error
              if (mappedValue) {
                setTimeout(() => {
                  onBlur?.("patientType");
                }, 0);
              }
            }}
            onBlur={() => {
              // Trigger validation when user leaves the field without selecting
              onBlur?.("patientType");
            }}
            label="Patient Type"
            required
            error={errors?.patientType}
            fieldRef={fieldRefs?.patientType}
            dataField="patientType"
          />
        </div>

        {/* Panel Select Field - Show only when Patient Type is "Panel" */}
        {formData.patientType === "Panel" && (
          <div
            data-field="panel"
            className="scroll-mt-4"
          >
            <FormSelectField
              ref={fieldRefs?.panel}
              label="Panel *"
              options={panelOptions}
              placeholder="Select"
              background="white"
              value={formData.panel}
              onChange={(value) => {
                if (!isFieldReadOnly("panel")) {
                  const selectedValue = Array.isArray(value) ? value[0] : value;
                  onChange("panel", selectedValue || "");
                  // If a value is selected, immediately mark as touched and validate to clear error
                  if (selectedValue) {
                    setTimeout(() => {
                      onBlur?.("panel");
                    }, 0);
                  }
                }
              }}
              onBlur={() => onBlur?.("panel")}
              disabled={isFieldReadOnly("panel")}
            />
            {errors?.panel && (
              <p className="mt-1 text-xs text-[#F6776E]">{errors.panel}</p>
            )}
          </div>
        )}

        <FormInputField
          label="Email Address"
          value={formData.emailAddress}
          onChange={(e) => onChange("emailAddress", e.target.value)}
          onBlur={() => onBlur?.("emailAddress")}
          placeholder="Email Address"
          type="email"
          error={errors?.emailAddress}
        />

        <FormSelectField
          label="Marital Status"
          options={maritalStatusOptions}
          placeholder="Select"
          background="white"
          value={formData.maritalStatus}
          onChange={(value) => {
            const selectedValue = Array.isArray(value) ? value[0] : value;
            onChange("maritalStatus", selectedValue);
            // If a value is selected, immediately mark as touched and validate
            if (selectedValue) {
              setTimeout(() => {
                onBlur?.("maritalStatus");
              }, 0);
            }
          }}
          onBlur={() => onBlur?.("maritalStatus")}
        />

        <div className={formData.patientType === "Panel" ? "col-span-full lg:col-span-3" : ""}>
          <FormInputField
            label="Occupation"
            value={formData.occupation}
            onChange={(e) => {
              // Allow only alphanumeric characters, spaces, and common punctuation (hyphen, comma, period)
              // Block special characters like $, %, #, &, *, etc.
              const value = e.target.value.replace(/[^a-zA-Z0-9\s,.\-]/g, "");
              onChange("occupation", value);
            }}
            onBlur={() => onBlur?.("occupation")}
            placeholder="Occupation"
          />
        </div>


      </div>
    </div>
  );
}

