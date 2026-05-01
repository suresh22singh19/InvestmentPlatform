"use client";

import { useState, useMemo, useEffect, useRef, type RefObject } from "react";
import type { FormikProps } from "formik";
import { FormInputField, FormSelectField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import type { BranchFacilityFormValues } from "@/lib/validation/branchFacilitySchemas";
import PhotoCapture, { type PhotoCaptureFormData, type PhotoCaptureRef } from "@/components/forms/PhotoCapture";
import { useGetModulesForBranchSetupQuery, useGetBranchListByTypeQuery } from "@/store/api/branchSetupApi";
import {
  BRANCH_TEXT_INPUT_MAX_LENGTH,
  clampBranchTextInput,
  filterAlphanumericUpper,
  filterDescriptionChars,
  filterDigitsOnly,
  filterFirmNameChars,
  filterPercentageMax100,
  filterGstInput,
  filterLettersAndSpacesOnly,
  filterMapLinkInput,
} from "@/lib/utils/branchFacilityInput";

const TX = BRANCH_TEXT_INPUT_MAX_LENGTH;

type Props = {
  formik: FormikProps<BranchFacilityFormValues>;
  photoCaptureRef?: RefObject<PhotoCaptureRef | null>;
  onPhotoValidationChange?: (
    hasErrors: boolean,
    errors: { vehiclePhoto?: string; aadharPhoto?: string }
  ) => void;
};

function err(
  formik: FormikProps<BranchFacilityFormValues>,
  key: keyof BranchFacilityFormValues
): string | undefined {
  const t = formik.touched[key];
  const e = formik.errors[key];
  if (!t || typeof e !== "string") return undefined;
  return e;
}

const yesNoOptions: SelectOption[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const smsOptions: SelectOption[] = [
  { label: "ON", value: "ON" },
  { label: "OFF", value: "OFF" },
];

const activeInactiveOptions: SelectOption[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

/** WiFi payload uses `deactive` (not `inactive`) per POST /branch/createBranch. */
const wifiStatusOptions: SelectOption[] = [
  { label: "Active", value: "active" },
  { label: "Deactive", value: "deactive" },
];

const labTestSourceOptions: SelectOption[] = [
  { label: "Chandan", value: "chandan_api" },
  { label: "Manual", value: "manual" },
];

const warehouseSelectOptions: SelectOption[] = [
  { label: "Warehouse 1", value: "Warehouse 1" },
  { label: "Warehouse 2", value: "Warehouse 2" },
];

export default function BranchBasicInformation({
  formik,
  photoCaptureRef,
  onPhotoValidationChange,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const { values, handleBlur, setFieldValue } = formik;

  const branchLogoPhotoData: PhotoCaptureFormData = useMemo(
    () => ({
      vehiclePhoto: values.branchLogo,
      aadharPhoto: values.branchLogo2,
    }),
    [values.branchLogo, values.branchLogo2]
  );

  const { data: modulesRes, isLoading: modulesLoading, isFetching: modulesFetching } =
    useGetModulesForBranchSetupQuery();

  const cloneBranchTypeArg: "hospital" | "clinic" | null =
    values.facilityType === "Hospital"
      ? "hospital"
      : values.facilityType === "Clinic"
        ? "clinic"
        : null;

  const { data: cloneListRes, isFetching: cloneListFetching } = useGetBranchListByTypeQuery(
    { branchType: cloneBranchTypeArg ?? "hospital" },
    { skip: cloneBranchTypeArg == null }
  );

  const copyBranchOptions: SelectOption[] = useMemo(() => {
    const rows = cloneListRes?.success && Array.isArray(cloneListRes.data) ? cloneListRes.data : [];
    return rows.map((b) => ({ label: b.name, value: String(b.id) }));
  }, [cloneListRes]);

  const prevFacilityTypeRef = useRef(values.facilityType);
  useEffect(() => {
    if (prevFacilityTypeRef.current !== values.facilityType) {
      prevFacilityTypeRef.current = values.facilityType;
      void setFieldValue("cloneBranchId", "");
    }
  }, [values.facilityType, setFieldValue]);

  const moduleSelectOptions: SelectOption[] = useMemo(() => {
    const rows = modulesRes?.success && Array.isArray(modulesRes.data) ? modulesRes.data : [];
    return rows
      .filter((m) => m.isActive)
      .map((m) => ({
        label: m.moduleName,
        value: String(m.id),
      }));
  }, [modulesRes]);

  return (
    <div className="space-y-4 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
      <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">Branch Basic Information</h2>

      <div data-field="facilityType" className="flex flex-col gap-3 scroll-mt-4">
        <span className="text-sm font-medium text-gray-700">
          Facility Type <span className="text-[#F6776E]">*</span>
        </span>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFieldValue("facilityType", "Hospital")}
            className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all ${values.facilityType === "Hospital" ? "border-green-600 bg-white" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
          >
            <div className="flex w-full items-center gap-2">
              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${values.facilityType === "Hospital" ? "bg-green-600" : "bg-gray-300"}`} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={values.facilityType === "Hospital" ? "text-green-700" : "text-gray-400"}>
                <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v0M9 13v0M9 17v0M15 13v0M15 17v0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex w-full flex-col items-start">
              <span className="text-sm font-medium text-gray-900">Hospital</span>
              <span className="text-xs text-gray-500">Multi-specialty facility</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFieldValue("facilityType", "Clinic")}
            className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all ${values.facilityType === "Clinic" ? "border-green-600 bg-white" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
          >
            <div className="flex w-full items-center gap-2">
              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${values.facilityType === "Clinic" ? "bg-green-600" : "bg-gray-300"}`} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={values.facilityType === "Clinic" ? "text-green-700" : "text-gray-400"}>
                <path d="M9 5h6M9 5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M9 5v14M15 5v14M12 11v2M8 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="7" cy="19" r="2" fill="currentColor" />
                <circle cx="17" cy="19" r="2" fill="currentColor" />
              </svg>
            </div>
            <div className="flex w-full flex-col items-start">
              <span className="text-sm font-medium text-gray-900">Clinic</span>
              <span className="text-xs text-gray-500">Smaller practice</span>
            </div>
          </button>
          {/* <button
            type="button"
            onClick={() => setFieldValue("facilityType", "Daycare")}
            className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all ${
              values.facilityType === "Daycare" ? "border-green-600 bg-white" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex w-full items-center gap-2">
              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${values.facilityType === "Daycare" ? "bg-green-600" : "bg-gray-300"}`} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={values.facilityType === "Daycare" ? "text-green-700" : "text-gray-400"}>
                <path
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex w-full flex-col items-start">
              <span className="text-sm font-medium text-gray-900">Daycare</span>
              <span className="text-xs text-gray-500">Day care services</span>
            </div>
          </button> */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div data-field="name" className="scroll-mt-4">
          <FormInputField
            label="Facility Name *"
            name="name"
            placeholder="e.g., City General Hospital"
            value={values.name}
            maxLength={TX}
            onChange={(e) => setFieldValue("name", filterLettersAndSpacesOnly(e.target.value))}
            onBlur={handleBlur}
            error={err(formik, "name")}
          />
        </div>
        <div data-field="phoneNumber" className="scroll-mt-4">
          <FormInputField
            label="Phone Number *"
            name="phoneNumber"
            placeholder="10-digit mobile number"
            value={values.phoneNumber}
            onChange={(e) => setFieldValue("phoneNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
            onBlur={handleBlur}
            type="tel"
            maxLength={10}
            error={err(formik, "phoneNumber")}
          />
        </div>
        <div data-field="emailAddress" className="scroll-mt-4">
          <FormInputField
            label="Email Address *"
            name="emailAddress"
            placeholder="branch@example.com"
            value={values.emailAddress}
            maxLength={TX}
            onChange={(e) => setFieldValue("emailAddress", clampBranchTextInput(e.target.value))}
            onBlur={handleBlur}
            type="email"
            error={err(formik, "emailAddress")}
          />
        </div>
        <div data-field="firmName" className="scroll-mt-4">
          <FormInputField
            label="Firm Name"
            name="firmName"
            placeholder="Enter firm name"
            value={values.firmName}
            maxLength={TX}
            onChange={(e) => setFieldValue("firmName", filterFirmNameChars(e.target.value))}
            onBlur={handleBlur}
            error={err(formik, "firmName")}
          />
        </div>
        <div data-field="panNo" className="scroll-mt-4">
          <FormInputField
            label="Pan Card No *"
            name="panNo"
            placeholder="ABCDE1234F"
            value={values.panNo}
            onChange={(e) => setFieldValue("panNo", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
            onBlur={handleBlur}
            maxLength={10}
            error={err(formik, "panNo")}
          />
        </div>
        <div data-field="description" className="scroll-mt-4">
          <FormInputField
            label="Description"
            name="description"
            placeholder="Enter the description"
            value={values.description}
            maxLength={TX}
            onChange={(e) => setFieldValue("description", filterDescriptionChars(e.target.value))}
            onBlur={handleBlur}
            error={err(formik, "description")}
          />
        </div>
        <div data-field="tinNo" className="scroll-mt-4">
          <FormInputField
            label="TIN No"
            name="tinNo"
            placeholder="Enter TIN number"
            value={values.tinNo}
            maxLength={11}
            inputMode="numeric"
            onChange={(e) => setFieldValue("tinNo", filterDigitsOnly(e.target.value, 11))}
            onBlur={handleBlur}
            error={err(formik, "tinNo")}
          // helperText="Optional. Exactly 11 digits if filled."
          />
        </div>
        <div data-field="creditLimit" className="scroll-mt-4">
          <FormInputField
            label={values.isFranchise === "yes" ? "Credit Limit *" : "Credit Limit"}
            name="creditLimit"
            placeholder="Enter credit limit"
            value={values.creditLimit}
            maxLength={15}
            inputMode="numeric"
            onChange={(e) => setFieldValue("creditLimit", filterDigitsOnly(e.target.value, 15))}
            onBlur={handleBlur}
            error={err(formik, "creditLimit")}
          // helperText={
          //   values.isFranchise === "yes"
          //     ? "Required for franchise branches. Numbers only, max 15 digits."
          //     : "Optional when Is Franchise is No. Numbers only, max 15 digits if filled."
          // }
          />
        </div>
        <div data-field="tat" className="scroll-mt-4">
          <FormInputField
            label="TAT"
            name="tat"
            placeholder="10-character A–Z / 0–9"
            value={values.tat}
            maxLength={10}
            onChange={(e) => setFieldValue("tat", filterAlphanumericUpper(e.target.value, 10))}
            onBlur={handleBlur}
            error={err(formik, "tat")}
          // helperText="Exactly 10 letters or digits."
          />
        </div>
        <div data-field="cstNo" className="scroll-mt-4">
          <FormInputField
            label="CST No"
            name="cstNo"
            placeholder="11-digit number"
            value={values.cstNo}
            maxLength={11}
            inputMode="numeric"
            onChange={(e) => setFieldValue("cstNo", filterDigitsOnly(e.target.value, 11))}
            onBlur={handleBlur}
            error={err(formik, "cstNo")}
          // helperText="Exactly 11 digits."
          />
        </div>
        <div data-field="gstNumber" className="scroll-mt-4">
          <FormInputField
            label="GST Number *"
            name="gstNumber"
            placeholder="15-character GST"
            value={values.gstNumber}
            maxLength={15}
            onChange={(e) => setFieldValue("gstNumber", filterGstInput(e.target.value))}
            onBlur={handleBlur}
            error={err(formik, "gstNumber")}
          />
        </div>
        <div data-field="stock" className="scroll-mt-4">
          <FormInputField
            label="Stock %"
            name="stock"
            placeholder="0–100"
            value={values.stock}
            maxLength={7}
            inputMode="decimal"
            onChange={(e) => setFieldValue("stock", filterPercentageMax100(e.target.value, 7))}
            onBlur={handleBlur}
            error={err(formik, "stock")}
          // helperText="0–100%, decimals allowed."
          />
        </div>
        <div data-field="dp" className="scroll-mt-4">
          <FormInputField
            label="DP %"
            name="dp"
            placeholder="0–100"
            value={values.dp}
            maxLength={7}
            inputMode="decimal"
            onChange={(e) => setFieldValue("dp", filterPercentageMax100(e.target.value, 7))}
            onBlur={handleBlur}
            error={err(formik, "dp")}
          // helperText="0–100%, decimals allowed."
          />
        </div>
        <div data-field="stateCode" className="scroll-mt-4">
          <FormInputField
            label="State Code *"
            name="stateCode"
            placeholder="Enter state code"
            value={values.stateCode}
            maxLength={10}
            onChange={(e) => setFieldValue("stateCode", filterAlphanumericUpper(e.target.value, 10))}
            onBlur={handleBlur}
            error={err(formik, "stateCode")}
          />
        </div>
        <div data-field="warehouse" className="scroll-mt-4">
          <FormSelectField
            label="Warehouse"
            options={warehouseSelectOptions}
            placeholder="Select the warehouse"
            background="white"
            value={values.warehouse || null}
            onChange={(v) => setFieldValue("warehouse", Array.isArray(v) ? v[0] : v ?? "")}
            onBlur={() => handleBlur("warehouse")}
            error={err(formik, "warehouse")}
          />
        </div>
        {/* <div data-field="branchCode" className="scroll-mt-4">
          <FormInputField
            label="Branch Code *"
            name="branchCode"
            placeholder="Enter branch code"
            value={values.branchCode}
            maxLength={10}
            onChange={(e) => setFieldValue("branchCode", filterAlphanumericUpper(e.target.value, 10))}
            onBlur={handleBlur}
            error={err(formik, "branchCode")}
            // helperText="Alphanumeric only, maximum 10 characters."
          /> */}
        <div data-field="branchCode" className="scroll-mt-4">
          <FormInputField
            label="Branch Code *"
            name="branchCode"
            placeholder="Enter branch code"
            value={values.branchCode}
            maxLength={4}
            onChange={(e) =>
              // Replace everything that is NOT a letter (a-z, A-Z) with an empty string
              setFieldValue("branchCode", e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4))
            }
            onBlur={handleBlur}
            error={err(formik, "branchCode")}
          />
        </div>
        {/* </div> */}
        <div data-field="branchId" className="scroll-mt-4">
          <FormInputField
            label="Branch ID *"
            name="branchId"
            placeholder="Enter branch ID"
            value={values.branchId}
            maxLength={20}
            inputMode="numeric"
            onChange={(e) => setFieldValue("branchId", filterDigitsOnly(e.target.value, 20))}
            onBlur={handleBlur}
            error={err(formik, "branchId")}
          // helperText="Numbers only, maximum 20 digits."
          />
        </div>
        <div data-field="branchUser" className="scroll-mt-4">
          <FormInputField
            label="Branch User *"
            name="branchUser"
            placeholder="Enter branch user"
            value={values.branchUser}
            maxLength={TX}
            onChange={(e) => setFieldValue("branchUser", filterLettersAndSpacesOnly(e.target.value))}
            onBlur={handleBlur}
            error={err(formik, "branchUser")}
          />
        </div>
        <div data-field="userPassword" className="scroll-mt-4">
          <div className="inline-flex w-full flex-col gap-2">
            <div className="group relative inline-flex w-full">
              <span className="pointer-events-none absolute left-6 top-0 z-10 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
                User Password <span className="text-[#F6776E]">*</span>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="userPassword"
                autoComplete="new-password"
                maxLength={TX}
                className={`h-[44px] w-full rounded-[32px] border border-[#DFE0E2] bg-white px-6 pr-12 text-sm font-medium text-[#434956] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 ${err(formik, "userPassword") ? "border-[#F87171]" : ""}`}
                placeholder="Enter password"
                value={values.userPassword}
                onChange={(e) => setFieldValue("userPassword", e.target.value.slice(0, TX))}
                onBlur={handleBlur}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B8089] hover:text-[#434956]"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {err(formik, "userPassword") ? <span className="text-xs text-[#F87171]">{err(formik, "userPassword")}</span> : null}
          </div>
        </div>
        <div data-field="advancedReferralAmount" className="scroll-mt-4">
          <FormInputField
            label="Advanced Referral Amount"
            name="advancedReferralAmount"
            placeholder="Enter advanced referral amount"
            value={values.advancedReferralAmount}
            maxLength={9}
            inputMode="numeric"
            onChange={(e) =>
              setFieldValue("advancedReferralAmount", filterDigitsOnly(e.target.value, 9))
            }
            onBlur={handleBlur}
            error={err(formik, "advancedReferralAmount")}
          // helperText="Optional. Digits only, maximum 9 digits if filled."
          />
        </div>
        <div data-field="referralAmountInPercent" className="scroll-mt-4">
          <FormInputField
            label="Referral Amount In %"
            name="referralAmountInPercent"
            placeholder="0–100"
            value={values.referralAmountInPercent}
            maxLength={10}
            inputMode="decimal"
            onChange={(e) =>
              setFieldValue("referralAmountInPercent", filterPercentageMax100(e.target.value, 10))
            }
            onBlur={handleBlur}
            error={err(formik, "referralAmountInPercent")}
          // helperText="Optional. 0–100%, max 10 characters if filled."
          />
        </div>
        <div data-field="showToAgent" className="scroll-mt-4">
          <FormSelectField
            label="Show to Agent"
            options={yesNoOptions}
            placeholder="Select"
            background="white"
            value={values.showToAgent}
            onChange={(v) => setFieldValue("showToAgent", Array.isArray(v) ? v[0] : v)}
            onBlur={() => handleBlur("showToAgent")}
            error={err(formik, "showToAgent")}
          />
        </div>
        <div data-field="sms" className="scroll-mt-4">
          <FormSelectField
            label="SMS *"
            options={smsOptions}
            placeholder="Select"
            background="white"
            value={values.sms}
            onChange={(v) => setFieldValue("sms", Array.isArray(v) ? v[0] : v)}
            onBlur={() => handleBlur("sms")}
            error={err(formik, "sms")}
          />
        </div>
        <div data-field="isFranchise" className="scroll-mt-4">
          <FormSelectField
            label="Is Franchise *"
            options={yesNoOptions}
            placeholder="Select"
            background="white"
            value={values.isFranchise}
            onChange={(v) => setFieldValue("isFranchise", Array.isArray(v) ? v[0] : v)}
            onBlur={() => handleBlur("isFranchise")}
            error={err(formik, "isFranchise")}
          />
        </div>
        <div data-field="branchStatus" className="scroll-mt-4">
          <FormSelectField
            label="Branch Status *"
            options={activeInactiveOptions}
            placeholder="Select"
            background="white"
            value={values.branchStatus}
            onChange={(v) => setFieldValue("branchStatus", Array.isArray(v) ? v[0] : v)}
            onBlur={() => handleBlur("branchStatus")}
            error={err(formik, "branchStatus")}
          />
        </div>
        <div data-field="wifiStatus" className="scroll-mt-4">
          <FormSelectField
            label="WiFi Status"
            options={wifiStatusOptions}
            placeholder="Select"
            background="white"
            value={values.wifiStatus}
            onChange={(v) => setFieldValue("wifiStatus", Array.isArray(v) ? v[0] : v)}
            onBlur={() => handleBlur("wifiStatus")}
            error={err(formik, "wifiStatus")}
          />
        </div>
        <div data-field="apiStatus" className="scroll-mt-4">
          <FormSelectField
            label="API Status"
            options={activeInactiveOptions}
            placeholder="Select"
            background="white"
            value={values.apiStatus || null}
            onChange={(v) => setFieldValue("apiStatus", Array.isArray(v) ? v[0] : v ?? "")}
            onBlur={() => handleBlur("apiStatus")}
            error={err(formik, "apiStatus")}
          />
        </div>
        <div data-field="maplink" className="scroll-mt-4">
          <FormInputField
            label="Map Link"
            name="maplink"
            placeholder="https://…"
            value={values.maplink}
            maxLength={TX}
            onChange={(e) => setFieldValue("maplink", filterMapLinkInput(e.target.value))}
            onBlur={handleBlur}
            error={err(formik, "maplink")}
          />
        </div>
        <div className="scroll-mt-4 md:col-span-2 flex w-full min-w-0 flex-row flex-nowrap items-start gap-4">
          <div data-field="moduleIds" className="min-w-0 flex-1">
            <FormSelectField
              label="Select Module *"
              mode="multiple"
              options={moduleSelectOptions}
              placeholder={
                modulesLoading || modulesFetching ? "Loading modules…" : "Select one or more modules"
              }
              background="white"
              width="100%"
              disabled={modulesLoading || modulesFetching}
              emptyMessage="No modules available"
              value={values.moduleIds}
              onChange={(v) =>
                setFieldValue(
                  "moduleIds",
                  Array.isArray(v) ? v : v != null && v !== "" ? [v] : [],
                  true
                )
              }
              onBlur={() => void handleBlur("moduleIds")}
              error={err(formik, "moduleIds")}
            />
          </div>
          {cloneBranchTypeArg != null ? (
            <div data-field="cloneBranchId" className="min-w-0 flex-1">
              <FormSelectField
                label="Copy Branch"
                options={copyBranchOptions}
                placeholder={
                  cloneListFetching ? "Loading branches…" : "Copy infrastructure from an existing branch"
                }
                background="white"
                width="100%"
                disabled={cloneListFetching}
                emptyMessage="No branches found"
                value={values.cloneBranchId || null}
                onChange={(v) =>
                  setFieldValue("cloneBranchId", Array.isArray(v) ? (v[0] ?? "") : (v ?? ""), true)
                }
                onBlur={() => void handleBlur("cloneBranchId")}
                error={err(formik, "cloneBranchId")}
              />
            </div>
          ) : null}
        </div>
        <div className="scroll-mt-4 md:col-span-2 flex w-full min-w-0 flex-row flex-nowrap items-start gap-4">
          <FormSelectField
            label="Lab Test Source *"
            options={labTestSourceOptions}
            placeholder="Select"
            background="white"
            width="100%"
            value={values.labTestSource || null}
            onChange={(v) =>
              setFieldValue("labTestSource", Array.isArray(v) ? (v[0] ?? "") : (v ?? ""), true)
            }
            onBlur={() => void handleBlur("labTestSource")}
            error={err(formik, "labTestSource")}
          />
        </div>
        <div className="scroll-mt-4 md:col-span-2 space-y-3">
          <PhotoCapture
            ref={photoCaptureRef}
            embedded
            mode="both"
            selectionHeading="Branch logo"
            slotDataFields={{ vehiclePhoto: "branchLogo", aadharPhoto: "branchLogo2" }}
            formData={branchLogoPhotoData}
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,.png,.jpg,.jpeg,.svg"
            externalFieldErrors={{
              vehiclePhoto: err(formik, "branchLogo"),
            }}
            onChange={(field, file) => {
              if (field === "vehiclePhoto") {
                setFieldValue("branchLogo", file);
                void formik.setFieldTouched("branchLogo", true, false);
              } else {
                setFieldValue("branchLogo2", file);
                void formik.setFieldTouched("branchLogo2", true, false);
              }
            }}
            onValidationChange={onPhotoValidationChange}
            fieldLabels={{
              vehiclePhoto: "Primary logo",
              aadharPhoto: "Secondary logo",
            }}
          />
        </div>
      </div>
    </div>
  );
}
