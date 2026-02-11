"use client";

import { FormInputField, FormSelectField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface IPDAdditionalDetailsFormData {
  searchType: string;
  phoneNumber: string;
  uhid: string;
  building: string;
  roomNumber: string;
  bedNumber: string;
}

interface IPDAdditionalDetailsProps {
  data: IPDAdditionalDetailsFormData;
  onChange: (field: keyof IPDAdditionalDetailsFormData, value: string) => void;
  onBlur?: (field: keyof IPDAdditionalDetailsFormData) => void;
  title?: string;
  fieldRefs?: {
    searchType?: React.Ref<HTMLDivElement | null>;
    phoneNumber?: React.Ref<HTMLInputElement | null>;
    uhid?: React.Ref<HTMLInputElement | null>;
    building?: React.Ref<HTMLInputElement | null>;
    roomNumber?: React.Ref<HTMLInputElement | null>;
    bedNumber?: React.Ref<HTMLInputElement | null>;
  };
  errors?: Record<string, string>;
  searchTypeOptions?: SelectOption[];
}

export default function IPDAdditionalDetails({
  data,
  onChange,
  onBlur,
  title = "Additional Details",
  fieldRefs,
  errors,
  searchTypeOptions = [
    { value: "UHID", label: "UHID" },
    { value: "Phone", label: "Phone" },
  ],
}: IPDAdditionalDetailsProps) {
  return (
    <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h3 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h3>

      <div className="flex flex-col gap-4">
        <div className="flex w-full gap-4">
          <div className={"w-1/3"}>
            <div
              data-field="searchType"
              className="scroll-mt-4 hover:cursor-not-allowed transition-opacity"
            >
              <PatientTypeButtonGroup
                options={["UHID", "Phone"]}
                value={data.searchType ? data.searchType.toLowerCase() : ""}
                onChange={(value) => {
                  // Convert to proper case: "uhid" -> "UHID", "phone" -> "Phone"
                  const mappedValue = value === "uhid" ? "UHID" : value.charAt(0).toUpperCase() + value.slice(1);
                  onChange("searchType", mappedValue);
                  // If a value is selected, immediately mark as touched and validate to clear error
                  if (mappedValue) {
                    setTimeout(() => {
                      onBlur?.("searchType");
                    }, 0);
                  }
                }}
                onBlur={() => {
                  // Trigger validation when user leaves the field without selecting
                  onBlur?.("searchType");
                }}
                label="Search Type"
                required={false}
                error={errors?.searchType}
                fieldRef={fieldRefs?.searchType as React.RefObject<HTMLDivElement>}
                dataField="searchType"
                disabled={true}
              />
            </div>
          </div>

          {/* Dynamic field for Phone Number or UHID based on Search Type */}
          {data.searchType === "Phone" && (
            <div className="w-2/3 ">
              <div
                ref={fieldRefs?.phoneNumber as React.RefObject<HTMLInputElement>}
                data-field="phoneNumber"
                className="scroll-mt-4"
              >
                <FormInputField
                  label="Patient Phone *"
                  value={data.phoneNumber || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10); // Only allow digits, max 10
                    onChange("phoneNumber", value);
                  }}
                  onBlur={() => {
                    onBlur?.("phoneNumber");
                  }}
                  placeholder="Enter Phone Number"
                  type="tel"
                  maxLength={10}
                  error={errors?.phoneNumber}
                />
              </div>
            </div>
          )}

          {data.searchType === "UHID" && (
            <div className="w-2/3">
              <div
                ref={fieldRefs?.uhid as React.RefObject<HTMLInputElement>}
                data-field="uhid"
                className="scroll-mt-4"
              >
                <FormInputField
                  label="Patient UHID *"
                  value={data.uhid || ""}
                  onChange={(e) => {
                    // Remove spaces, allow alphanumeric characters, limit to 15 characters
                    const value = e.target.value.replace(/\s/g, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 15).toUpperCase();
                    onChange("uhid", value);
                  }}
                  onBlur={() => {
                    onBlur?.("uhid");
                  }}
                  placeholder="Enter UHID"
                  type="text"
                  maxLength={15}
                  error={errors?.uhid}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex w-full gap-4">
          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.building}
              label="Building"
              value={data.building}
              onChange={(e) => onChange("building", e.target.value)}
              onBlur={() => {
                onBlur?.("building");
              }}
              placeholder="Building"
              error={errors?.building}
              disabled
            />
          </div>

          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.roomNumber}
              label="Room Number"
              value={data.roomNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                onChange("roomNumber", value);
              }}
              onBlur={() => {
                onBlur?.("roomNumber");
              }}
              placeholder="Room Number"
              type="tel"
              error={errors?.roomNumber}
              disabled
            />
          </div>
          <div className="flex-1">
            <FormInputField
              ref={fieldRefs?.bedNumber}
              label="Bed Number"
              value={data.bedNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                onChange("bedNumber", value);
              }}
              onBlur={() => {
                onBlur?.("bedNumber");
              }}
              placeholder="Bed Number"
              type="tel"
              error={errors?.bedNumber}
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
}

