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
  onVerify?: (visitorIndex: number) => void;
  isVerifyLoading?: boolean;
  visitorIndex?: number;
  /** When true, field is read-only and shows cursor-not-allowed (used when value came from API) */
  buildingReadOnly?: boolean;
  roomNumberReadOnly?: boolean;
  bedNumberReadOnly?: boolean;
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
  onVerify,
  isVerifyLoading = false,
  visitorIndex = 0,
  buildingReadOnly = false,
  roomNumberReadOnly = false,
  bedNumberReadOnly = false,
}: IPDAdditionalDetailsProps) {
  const uhidLen = (data.uhid || "").trim().length;
  const canVerify =
    (data.searchType === "Phone" && (data.phoneNumber || "").trim().length === 10) ||
    (data.searchType === "UHID" && uhidLen >= 9 && uhidLen <= 20);

  return (
    <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h3 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h3>

      <div className="flex flex-col gap-4">
        <div className="flex w-full gap-4 items-start">
          <div className={"w-1/3"}>
            <div
              data-field="searchType"
              className="scroll-mt-4 transition-opacity"
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
                label="Search Type *"
                required={false}
                error={errors?.searchType}
                fieldRef={fieldRefs?.searchType as React.RefObject<HTMLDivElement>}
                dataField="searchType"
              />
            </div>
          </div>

          {/* Dynamic field for Phone Number or UHID based on Search Type + Verify button */}
          {data.searchType === "Phone" && (
            <div className="w-2/3 flex flex-wrap items-start gap-3">
              <div
                ref={fieldRefs?.phoneNumber as React.RefObject<HTMLInputElement>}
                data-field="phoneNumber"
                className="scroll-mt-4 flex-1 min-w-[180px]"
              >
                <FormInputField
                  label="Patient Phone *"
                  value={data.phoneNumber || ""}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    value = value.replace(/^0+/, "");
                    value = value.slice(0, 10);
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
              {onVerify && (
                <button
                  type="button"
                  onClick={() => onVerify(visitorIndex)}
                  disabled={isVerifyLoading || !canVerify}
                  className="mt-0 h-11 shrink-0 self-start rounded-[32px] border border-[#0B8C00] bg-[#0B8C00] px-5 text-sm font-medium text-white transition-colors hover:bg-[#096b00] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifyLoading ? "Verifying..." : "Verify"}
                </button>
              )}
            </div>
          )}

          {data.searchType === "UHID" && (
            <div className="w-2/3 flex flex-wrap items-start gap-3">
              <div
                ref={fieldRefs?.uhid as React.RefObject<HTMLInputElement>}
                data-field="uhid"
                className="scroll-mt-4 flex-1 min-w-[180px]"
              >
                <FormInputField
                  label="Patient UHID *"
                  value={data.uhid || ""}
                  onChange={(e) => {
                    let value = e.target.value
                      .replace(/\s/g, "")
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .toUpperCase();
                    value = value.replace(/^0+/, "");
                    value = value.slice(0, 20);
                    onChange("uhid", value);
                  }}
                  onBlur={() => {
                    onBlur?.("uhid");
                  }}
                  placeholder="Enter UHID"
                  type="text"
                  maxLength={20}
                  error={errors?.uhid}
                />
              </div>
              {onVerify && (
                <button
                  type="button"
                  onClick={() => onVerify(visitorIndex)}
                  disabled={isVerifyLoading || !canVerify}
                  className="mt-0 h-11 shrink-0 self-start rounded-[32px] border border-[#0B8C00] bg-[#0B8C00] px-5 text-sm font-medium text-white transition-colors hover:bg-[#096b00] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifyLoading ? "Verifying..." : "Verify"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full gap-4">
          <div className={`flex-1 ${buildingReadOnly ? "cursor-not-allowed" : ""}`}>
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
              readOnly={buildingReadOnly}
            />
          </div>

          <div className={`flex-1 ${roomNumberReadOnly ? "cursor-not-allowed" : ""}`}>
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
              readOnly={roomNumberReadOnly}
            />
          </div>
          <div className={`flex-1 ${bedNumberReadOnly ? "cursor-not-allowed" : ""}`}>
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
              readOnly={bedNumberReadOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

