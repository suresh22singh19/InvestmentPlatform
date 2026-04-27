"use client";

import Image from "next/image";
import { useMemo } from "react";
import { FormInputField, FormSelectField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetDoctorsByBranchQuery, type Doctor } from "@/store/api/registrationApi";
import { sanitizeEmailInput } from "@/lib/utils/emailValidation";

export interface PreBookingPatientInformationFormData {
  contactNumber: string;
  branchId: string;
  doctor: string;
  gender: string;
  emailAddress: string;
  patientNameSelect: string;
  patientName: string;
  age: string;
  fathersHusbandsNameSelect: string;
  fathersHusbandsName: string;
  maritalStatus: string;
}

interface PreBookingPatientInformationProps {
  formData: PreBookingPatientInformationFormData;
  onChange: (field: keyof PreBookingPatientInformationFormData, value: string) => void;
  onBlur?: (field: keyof PreBookingPatientInformationFormData) => void;
  onContactNumberChange?: (value: string) => void;
  titleOptions?: SelectOption[];
  genderOptions?: SelectOption[];
  maritalStatusOptions?: SelectOption[];
  fieldRefs?: {
    contactNumber?: React.RefObject<HTMLInputElement | null>;
    branchId?: React.RefObject<HTMLDivElement | null>;
    doctor?: React.RefObject<HTMLDivElement | null>;
    gender?: React.RefObject<HTMLDivElement | null>;
    emailAddress?: React.RefObject<HTMLInputElement | null>;
    patientNameSelect?: React.RefObject<HTMLDivElement | null>;
    patientName?: React.RefObject<HTMLInputElement | null>;
    age?: React.RefObject<HTMLInputElement | null>;
    fathersHusbandsNameSelect?: React.RefObject<HTMLDivElement | null>;
    fathersHusbandsName?: React.RefObject<HTMLInputElement | null>;
    maritalStatus?: React.RefObject<HTMLDivElement | null>;
  };
  errors?: Record<string, string>;
  isContactLoading?: boolean;
  /** When true (Address country is not India), email is required — label shows * */
  emailRequiredByAddressCountry?: boolean;
  /** When true (e.g. Patient Type is Private), show JS Health Card No. in the last row with full width */
  showJsHealthCardNo?: boolean;
  jsHealthCardNo?: string;
  onJsHealthCardNoChange?: (value: string) => void;
  onJsHealthCardNoBlur?: () => void;
  /** When true, JS Health Card No. is shown but non-editable (for existing patients) */
  jsHealthCardReadOnly?: boolean;
  /** Field names that should be disabled (e.g. when filled from "Patient Already Exists" dialog) */
  readOnlyFields?: (keyof PreBookingPatientInformationFormData)[];
  /**
   * When provided (including `[]`), Doctor * options use this list only (parent owns `getDoctorsList` by branch).
   * Omit to fetch doctors inside this component from `formData.branchId`.
   */
  doctorSelectOptions?: SelectOption[];
}

const defaultTitleOptions: SelectOption[] = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Miss", label: "Miss" },
  { value: "Ms", label: "Ms" },
  { value: "Dr", label: "Dr" },
  { value: "TG", label: "TG" },
];

const defaultGenderOptions: SelectOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const defaultMaritalStatusOptions: SelectOption[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

export default function PreBookingPatientInformation({
  formData,
  onChange,
  onBlur,
  onContactNumberChange,
  titleOptions = defaultTitleOptions,
  genderOptions = defaultGenderOptions,
  maritalStatusOptions = defaultMaritalStatusOptions,
  fieldRefs,
  errors,
  isContactLoading = false,
  emailRequiredByAddressCountry = false,
  showJsHealthCardNo = false,
  jsHealthCardNo = "",
  onJsHealthCardNoChange,
  onJsHealthCardNoBlur,
  jsHealthCardReadOnly = false,
  readOnlyFields = [],
  doctorSelectOptions,
}: PreBookingPatientInformationProps) {
  const isContactReadOnly = readOnlyFields.includes("contactNumber");
  const isTitleReadOnly = readOnlyFields.includes("patientNameSelect");
  const isPatientNameReadOnly = readOnlyFields.includes("patientName");
  const useParentDoctorList = doctorSelectOptions !== undefined;
  const internalBranchId = formData.branchId ? Number(formData.branchId) : undefined;
  const { data: doctorsData } = useGetDoctorsByBranchQuery(
    { branchId: internalBranchId as number },
    {
      skip:
        useParentDoctorList ||
        internalBranchId == null ||
        !Number.isFinite(internalBranchId),
    }
  );

  const doctorOptions: SelectOption[] = useMemo(() => {
    if (useParentDoctorList) {
      return doctorSelectOptions ?? [];
    }
    const rows = doctorsData?.data;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows.map((doctor: Doctor) => {
      const doctorName = (doctor.name || doctor.userName || "").trim();
      const id = doctor.id ?? "";
      return {
        value: String(id),
        label: doctorName || `Doctor ${id}`,
      };
    });
  }, [useParentDoctorList, doctorSelectOptions, doctorsData]);

  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
      <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
        <Image src="/icons/patientinfo.svg" alt="Patient info" width={20} height={20} /> Patient Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 items-start">
        <div data-field="contactNumber" className="scroll-mt-4 relative">
          <FormInputField
            ref={fieldRefs?.contactNumber}
            label="Contact Number *"
            value={formData.contactNumber}
            onChange={(e) => {
              if (isContactReadOnly) return;
              const value = e.target.value.replace(/\D/g, "").slice(0, 10);
              onChange("contactNumber", value);
              onContactNumberChange?.(value);
            }}
            onBlur={() => onBlur?.("contactNumber")}
            placeholder="Contact Number"
            required
            type="tel"
            maxLength={10}
            error={errors?.contactNumber}
            className="!pr-12"
            disabled={isContactReadOnly}
            readOnly={isContactReadOnly}
          />
          {isContactLoading && (
            <div className="absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center pointer-events-none">
              <svg
                className="h-5 w-5 animate-spin text-[#0B8C00]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>
      

     
       

        <div className="flex flex-col gap-0 flex-1 flex-wrap">
          <div className="flex gap-2 flex-1">
            <div data-field="patientNameSelect" className="scroll-mt-4 w-[115px] shrink-0">
              <FormSelectField
                ref={fieldRefs?.patientNameSelect}
                label="Title *"
                options={titleOptions}
                placeholder="Select"
                background="white"
                width={115}
                dropdownWidth={160}
                value={formData.patientNameSelect || null}
                onChange={(value) => {
                  if (isTitleReadOnly) return;
                  const selectedValue = Array.isArray(value) ? value[0] : value;
                  onChange("patientNameSelect", selectedValue || "");
                  if (selectedValue) setTimeout(() => onBlur?.("patientNameSelect"), 0);
                }}
                onBlur={() => onBlur?.("patientNameSelect")}
                disabled={isTitleReadOnly}
              />
              {errors?.patientNameSelect && <p className="mt-1 text-xs text-[#F6776E]">{errors.patientNameSelect}</p>}
            </div>
            <div className="flex-1 min-w-0" data-field="patientName" ref={fieldRefs?.patientName}>
              <FormInputField
                label="Patient Name *"
                value={formData.patientName}
                onChange={(e) => {
                  if (isPatientNameReadOnly) return;
                  let value = e.target.value.replace(/[^a-zA-Z\s]/g, "").replace(/^\s+/, "");
                  value = value.replace(/(.)\1{2,}/g, "$1$1");
                  if (value.length > 0) value = value.charAt(0).toUpperCase() + value.slice(1);
                  value = value.slice(0, 100);
                  onChange("patientName", value);
                }}
                onBlur={() => onBlur?.("patientName")}
                placeholder="Patient Name"
                required
                type="text"
                maxLength={100}
                error={errors?.patientName}
                disabled={isPatientNameReadOnly}
                readOnly={isPatientNameReadOnly}
              />
            </div>
          </div>
        </div>

        <div data-field="age" className="scroll-mt-4" ref={fieldRefs?.age}>
          <FormInputField
            label="Age *"
            value={formData.age}
            onChange={(e) => {
              let value = e.target.value.replace(/\D/g, "").replace(/^0+/, "") || "";
              value = value.slice(0, 3);
              if (value && parseInt(value, 10) > 120) value = "120";
              onChange("age", value);
            }}
            onBlur={() => onBlur?.("age")}
            placeholder="Age"
            required
            type="tel"
            maxLength={3}
            error={errors?.age}
          />
        </div>
        <div data-field="gender" className="scroll-mt-4" ref={fieldRefs?.gender}>
          <FormSelectField
            label="Gender *"
            options={genderOptions}
            value={formData.gender || null}
            onChange={(value) => {
              const selectedValue = Array.isArray(value) ? value[0] : value;
              onChange("gender", selectedValue || "");
              if (selectedValue) setTimeout(() => onBlur?.("gender"), 0);
            }}
            onBlur={() => onBlur?.("gender")}
            placeholder="Select"
            mode="single"
            background="white"
          />
          {errors?.gender && <p className="mt-1 text-xs text-[#F6776E]">{errors.gender}</p>}
        </div>


        <div className="flex flex-col gap-0 flex-1 flex-wrap">
          <div className="flex gap-2 flex-1">
            <div data-field="fathersHusbandsNameSelect" className="scroll-mt-4 w-[115px] shrink-0">
              <FormSelectField
                ref={fieldRefs?.fathersHusbandsNameSelect}
                label="Title *"
                options={titleOptions}
                placeholder="Select"
                background="white"
                width={115}
                dropdownWidth={160}
                value={formData.fathersHusbandsNameSelect || null}
                onChange={(value) => {
                  const selectedValue = Array.isArray(value) ? value[0] : value;
                  onChange("fathersHusbandsNameSelect", selectedValue || "");
                  if (selectedValue) setTimeout(() => onBlur?.("fathersHusbandsNameSelect"), 0);
                }}
                onBlur={() => onBlur?.("fathersHusbandsNameSelect")}
              />
              {errors?.fathersHusbandsNameSelect && <p className="mt-1 text-xs text-[#F6776E]">{errors.fathersHusbandsNameSelect}</p>}
            </div>
            <div className="flex-1 min-w-0" data-field="fathersHusbandsName" ref={fieldRefs?.fathersHusbandsName}>
              <FormInputField
                label="Father's/Husband's Name *"
                value={formData.fathersHusbandsName}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^a-zA-Z\s]/g, "").replace(/^\s+/, "");
                  value = value.replace(/(.)\1{2,}/g, "$1$1");
                  if (value.length > 0) value = value.charAt(0).toUpperCase() + value.slice(1);
                  value = value.slice(0, 100);
                  onChange("fathersHusbandsName", value);
                }}
                onBlur={() => onBlur?.("fathersHusbandsName")}
                placeholder="Father's/Husband's Name"
                required
                type="text"
                maxLength={100}
                error={errors?.fathersHusbandsName}
              />
            </div>
          </div>
        </div>

        <div data-field="emailAddress" className="scroll-mt-4">
          <FormInputField
            ref={fieldRefs?.emailAddress}
            label={emailRequiredByAddressCountry ? "Email Address *" : "Email Address"}
            value={formData.emailAddress}
            onChange={(e) => onChange("emailAddress", sanitizeEmailInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === " ") e.preventDefault();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text");
              const cur = formData.emailAddress || "";
              onChange("emailAddress", sanitizeEmailInput(`${cur}${pasted}`));
            }}
            onBlur={() => onBlur?.("emailAddress")}
            placeholder="Email Address"
            type="email"
            maxLength={100}
            error={errors?.emailAddress}
          />
        </div>
        <div data-field="maritalStatus" className="scroll-mt-4" ref={fieldRefs?.maritalStatus}>
          <FormSelectField
            label="Marital Status *"
            options={maritalStatusOptions}
            value={formData.maritalStatus || null}
            onChange={(value) => {
              const selectedValue = Array.isArray(value) ? value[0] : value;
              onChange("maritalStatus", selectedValue || "");
              if (selectedValue) setTimeout(() => onBlur?.("maritalStatus"), 0);
            }}
            onBlur={() => onBlur?.("maritalStatus")}
            placeholder="Select"
            mode="single"
            background="white"
          />
          {errors?.maritalStatus && <p className="mt-1 text-xs text-[#F6776E]">{errors.maritalStatus}</p>}
        </div>
        <div data-field="doctor" className="scroll-mt-4 md:col-span-2 lg:col-span-2 min-w-0" ref={fieldRefs?.doctor}>
          <FormSelectField
            label="Doctor *"
            options={doctorOptions}
            value={formData.doctor || null}
            onChange={(value) => {
              const selectedValue = Array.isArray(value) ? value[0] : value;
              onChange("doctor", selectedValue || "");
              if (selectedValue) setTimeout(() => onBlur?.("doctor"), 0);
            }}
            onBlur={() => onBlur?.("doctor")}
            placeholder="Select"
            mode="single"
            background="white"
          />
          {errors?.doctor && <p className="mt-1 text-xs text-[#F6776E]">{errors.doctor}</p>}
        </div>
        {/* {showJsHealthCardNo && (
          <div className="col-span-full mt-0" data-field="jsHealthCardNo">
            <FormInputField
              label="JS Health Card No."
              value={jsHealthCardNo}
              onChange={(e) => {
                if (jsHealthCardReadOnly) return;
                const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                onJsHealthCardNoChange?.(value);
              }}
              onBlur={() => onJsHealthCardNoBlur?.()}
              placeholder="50503030 + 4 digits"
              type="tel"
              maxLength={12}
              error={errors?.jsHealthCardNo}
              disabled={jsHealthCardReadOnly}
              readOnly={jsHealthCardReadOnly}
            />
          </div>
        )} */}
      </div>
    </div>
  );
}
