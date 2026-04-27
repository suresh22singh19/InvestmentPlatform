"use client";

import Image from "next/image";
import { FormInputField, FormSelectField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface Visitor {
  id: string;
  nameSelect?: string;
  name: string;
  aadharCardNo: string;
  passportNumber?: string;
  nationalId?: string;
  country?: string;
  visitorContactNumber?: string;
}

export interface VisitorsFormData {
  visitors: Visitor[];
}

interface VisitorsDetailsProps {
  visitors: Visitor[];
  onAddVisitor: () => void;
  onRemoveVisitor: (id: string) => void;
  onVisitorChange: (id: string, field: "nameSelect" | "name" | "aadharCardNo" | "passportNumber" | "nationalId" | "country", value: string) => void;
  onVisitorBlur?: (index: number, field: "nameSelect" | "name" | "aadharCardNo" | "passportNumber" | "nationalId" | "country") => void;
  title?: string;
  titleOptions?: SelectOption[];
  nationality?: string; // "Indian" | "Foreigner" | "Nepal" - determines which ID field to show
  countryOptions?: SelectOption[]; // Country options for visitor nationality field
  visitorTitleRefs?: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  visitorNameRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
  visitorCountryRefs?: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  visitorAadharRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
  visitorPassportRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
  visitorNationalIdRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
  errors?: Record<string, string>;
  arrayError?: string; // Error message for the entire visitors array (e.g., "At least one visitor is required")
  visitorLookupLoading?: Record<string, boolean>;
  lockedVisitors?: Record<string, boolean>;
  disableFirstVisitorDelete?: boolean;
}

export default function VisitorsDetails({
  visitors,
  onAddVisitor,
  onRemoveVisitor,
  onVisitorChange,
  onVisitorBlur,
  title = "Visitors Details",
  titleOptions = [
    { value: "Mr", label: "Mr" },
    { value: "Mrs", label: "Mrs" },
    { value: "Miss", label: "Miss" },
    { value: "Ms", label: "Ms" },
    { value: "Dr", label: "Dr" },
    { value: "TG", label: "TG" },
  ],
  countryOptions = [
    { value: "Indian", label: "Indian" },
    { value: "Nepal", label: "Nepal" },
    { value: "Foreigner", label: "Foreigner" },
  ],
  nationality = "Indian", // Default to Indian
  visitorTitleRefs,
  visitorNameRefs,
  visitorCountryRefs,
  visitorAadharRefs,
  visitorPassportRefs,
  visitorNationalIdRefs,
  errors,
  arrayError,
  visitorLookupLoading = {},
  lockedVisitors = {},
  disableFirstVisitorDelete = false,
}: VisitorsDetailsProps) {
  const buttonLabel = visitors.length === 0 ? "Add Visitor" : "Add More Visitor";
  const maxVisitors = 5;
  const isMaxVisitorsReached = visitors.length >= maxVisitors;

  return (
    <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]" data-section="visitors-details">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2>
        <button
          type="button"
          className={`flex h-11 items-center justify-center gap-2 rounded-[32px] border px-6 text-sm font-medium leading-[120%] transition-colors ${
            isMaxVisitorsReached
              ? "border-[#D0D5DD] bg-[#F9FAFB] text-[#98A2B3] cursor-not-allowed"
              : "border-[#0B8C00] bg-white text-[#0B8C00] hover:bg-[#F2F8F2]"
          }`}
          onClick={onAddVisitor}
          disabled={isMaxVisitorsReached}
          title={isMaxVisitorsReached ? `Maximum ${maxVisitors} visitors allowed` : ""}
        >
          <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
          {buttonLabel}
        </button>
      </div>

      {/* Display array-level error (e.g., "At least one visitor is required") */}
      {arrayError && (
        <p className="text-xs text-[#F6776E]">{arrayError}</p>
      )}

      <div className="space-y-4">
        {visitors.map((visitor, index) => {
          const isLockedVisitor = !!lockedVisitors[visitor.id];
          const isVisitorLookupLoading = !!visitorLookupLoading[visitor.id];

          return (
            <div key={visitor.id} className="flex items-start gap-4">
            <div className="flex-1 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex gap-2">
                <div
                  ref={(el) => {
                    if (visitorTitleRefs && el) {
                      visitorTitleRefs.current[visitor.id] = el;
                    }
                  }}
                  className={errors?.[`visitorTitle_${index}`] ? "scroll-mt-4" : "scroll-mt-4"}
                >
                  <FormSelectField
                    label="Title *"
                    options={titleOptions}
                    placeholder="Select"
                    background="white"
                    width={115}
                    dropdownWidth={160}
                    value={visitor.nameSelect || ""}
                    error={errors?.[`visitorTitle_${index}`]}
                    onChange={(value) => {
                      const selectedValue = Array.isArray(value) ? value[0] : value;
                      onVisitorChange(visitor.id, "nameSelect", selectedValue || "");
                      if (selectedValue) {
                        setTimeout(() => {
                          onVisitorBlur?.(index, "nameSelect");
                        }, 0);
                      }
                    }}
                    onBlur={() => onVisitorBlur?.(index, "nameSelect")}
                    disabled={isLockedVisitor}
                  />
                </div>
                <div className="flex-1">
                  <FormInputField
                    ref={(el) => {
                      if (visitorNameRefs && el) {
                        visitorNameRefs.current[visitor.id] = el;
                      }
                    }}
                    label="Visitor Name *"
                    value={visitor.name}
                    onChange={(e) => {
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
                      onVisitorChange(visitor.id, "name", value);
                    }}
                    onBlur={(e) => {
                      const trimmed = e.target.value.trim();
                      if (trimmed !== e.target.value) onVisitorChange(visitor.id, "name", trimmed);
                      onVisitorBlur?.(index, "name");
                    }}
                    placeholder="Visitor Name"
                    required
                    maxLength={100}
                    error={errors?.[`visitorName_${index}`]}
                    disabled={isLockedVisitor}
                    readOnly={isLockedVisitor}
                  />
                </div>
              </div>
              <div
                ref={(el) => {
                  if (visitorCountryRefs && el) {
                    visitorCountryRefs.current[visitor.id] = el;
                  }
                }}
              >
                <FormSelectField
                  label="Visitor Nationality *"
                  options={countryOptions}
                  placeholder="Select"
                  background="white"
                  value={visitor.country || ""}
                  error={errors?.[`visitorCountry_${index}`]}
                  onChange={(value) => {
                    const selectedValue = Array.isArray(value) ? value[0] : value;
                    onVisitorChange(visitor.id, "country", selectedValue || "");
                    if (selectedValue) {
                      setTimeout(() => {
                        onVisitorBlur?.(index, "country");
                      }, 0);
                    }
                  }}
                  onBlur={() => onVisitorBlur?.(index, "country")}
                  disabled={isLockedVisitor}
                />
              </div>
              <div className="md:col-span-2 flex items-start gap-2">
                <div className="flex-1">
                  {/* Show Aadhar Card No. for Indian (default when country not set) */}
                  {(visitor.country === "Indian" || !visitor.country) && (
                    <div className="relative">
                      <FormInputField
                        ref={(el) => {
                          if (visitorAadharRefs && el) {
                            visitorAadharRefs.current[visitor.id] = el;
                          }
                        }}
                        label="Visitor Aadhar Card No. *"
                        value={visitor.aadharCardNo || ""}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, "");
                          // Aadhaar: first digit cannot be 0 or 1 – strip leading 0s and 1s
                          value = value.replace(/^[01]+/, "");
                          value = value.slice(0, 12); // Only allow digits, max 12
                          onVisitorChange(visitor.id, "aadharCardNo", value);
                        }}
                        onBlur={() => onVisitorBlur?.(index, "aadharCardNo")}
                        placeholder="Visitor Aadhar Card No."
                        type="tel"
                        maxLength={12}
                        required
                        error={errors?.[`visitorAadhar_${index}`]}
                        disabled={isLockedVisitor || isVisitorLookupLoading}
                        readOnly={isLockedVisitor}
                        className={isVisitorLookupLoading ? "!pr-12" : ""}
                      />
                      {isVisitorLookupLoading && (
                        <div className="pointer-events-none absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
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
                  )}
                  {/* Show National Id for Nepal */}
                  {visitor.country === "Nepal" && (
                    <FormInputField
                      ref={(el) => {
                        if (visitorNationalIdRefs && el) {
                          visitorNationalIdRefs.current[visitor.id] = el;
                        }
                      }}
                      label="Visitor National Id *"
                      value={visitor.nationalId || ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 12); // Only allow digits, max 12
                        onVisitorChange(visitor.id, "nationalId", value);
                      }}
                      onBlur={() => onVisitorBlur?.(index, "nationalId")}
                      placeholder="Visitor National Id"
                      type="tel"
                      maxLength={12}
                      required
                      error={errors?.[`visitorNationalId_${index}`]}
                    />
                  )}
                  {/* Show Passport Number for Foreigner */}
                  {visitor.country === "Foreigner" && (
                    <FormInputField
                      ref={(el) => {
                        if (visitorPassportRefs && el) {
                          visitorPassportRefs.current[visitor.id] = el;
                        }
                      }}
                      label="Visitor Passport Number *"
                      value={visitor.passportNumber || ""}
                      onChange={(e) => {
                        // Allow alphanumeric characters, 6-9 characters (global passport standard)
                        // Convert letters to uppercase automatically
                        const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 9);
                        onVisitorChange(visitor.id, "passportNumber", value);
                      }}
                      onBlur={() => onVisitorBlur?.(index, "passportNumber")}
                      placeholder="Visitor Passport Number"
                      type="text"
                      maxLength={9}
                      required
                      error={errors?.[`visitorPassport_${index}`]}
                    />
                  )}
                </div>
                {visitors.length >= 1 && (
                  <button
                    type="button"
                    className="flex items-center justify-center shrink-0 mt-0"
                    onClick={() => onRemoveVisitor(visitor.id)}
                    aria-label="Remove visitor"
                    disabled={disableFirstVisitorDelete && index === 0}
                  >
                    <Image
                      src="/icons/TrashGreenIcon.svg"
                      alt="Delete"
                      width={44}
                      height={44}
                      className={disableFirstVisitorDelete && index === 0 ? "opacity-50 cursor-not-allowed" : ""}
                    />
                  </button>
                )}
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

