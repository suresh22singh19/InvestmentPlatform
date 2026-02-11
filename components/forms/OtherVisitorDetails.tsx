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
        {/* Row 1: Phone Number, Aadhar Card Number, Title + Visitor Name */}
        <div className="flex w-full gap-4">
          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.phoneNumber}
              label="Phone Number *"
              value={data.phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10); // Only allow digits, max 10
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
              onBlur={() => {
                onBlur?.("aadharCardNumber");
              }}
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
                onBlur={() => {
                  onBlur?.("visitorName");
                }}
                placeholder="Visitor Name"
                required
                error={errors?.visitorName}
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
                // Only allow letters and spaces
                const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                onChange("whomToMeet", value);
              }}
              onBlur={() => {
                onBlur?.("whomToMeet");
              }}
              placeholder="Whom To Meet"
              error={errors?.whomToMeet}
            />
          </div>

          <div className="w-1/3">
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

