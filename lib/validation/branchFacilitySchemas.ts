import * as Yup from "yup";
import { isValidEmailAddress } from "@/lib/utils/emailValidation";
import type { AddressFormData } from "@/components/forms/AddressDetails";
import {
  BRANCH_TEXT_INPUT_MAX_LENGTH,
  hasMoreThanTwoConsecutiveSameChars,
} from "@/lib/utils/branchFacilityInput";

const INDIA_COUNTRY_ID = "6";
const TEXT_MAX = BRANCH_TEXT_INPUT_MAX_LENGTH;

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/i;

const lettersSpacesOnly = /^[a-zA-Z\s]+$/;
const firmNameChars = /^[a-zA-Z0-9\s.&'()-]+$/;
const descriptionChars = /^[a-zA-Z0-9\s.,;:'"/&!%()\-]+$/;
const alphanumericCode = /^[a-zA-Z0-9]+$/;

function noTripleRepeatMsg(field: string) {
  return `${field} cannot have more than 2 consecutive same characters`;
}

export const branchFacilityAddressSchema = Yup.object().shape({
  pinCode: Yup.string().trim().required("Pin code is required"),
  country: Yup.string().trim().required("Country is required"),
  state: Yup.string()
    .trim()
    .when("country", {
      is: INDIA_COUNTRY_ID,
      then: (s) => s.required("State is required"),
      otherwise: (schema) =>
        schema.when("country", {
          is: (c: string) => Boolean(c && c !== INDIA_COUNTRY_ID),
          then: (s) =>
            s
              .required("State is required")
              .max(100, "State cannot exceed 100 characters")
              .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
          otherwise: (s) => s.required("State is required"),
        }),
    }),
  city: Yup.string()
    .trim()
    .when("country", {
      is: INDIA_COUNTRY_ID,
      then: (schema) => schema.required("District is required"),
      otherwise: (schema) =>
        schema.when("country", {
          is: (c: string) => Boolean(c && c !== INDIA_COUNTRY_ID),
          then: (s) =>
            s
              .required("City is required")
              .max(100, "City cannot exceed 100 characters")
              .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
          otherwise: (s) => s.required("District is required"),
        }),
    }),
  tehsil: Yup.string()
    .trim()
    .when("country", {
      is: INDIA_COUNTRY_ID,
      then: (s) => s.required("Tehsil is required"),
      otherwise: (s) => s.optional(),
    }),
  area: Yup.string()
    .trim()
    .when("country", {
      is: INDIA_COUNTRY_ID,
      then: (s) => s.required("Post office is required"),
      otherwise: (s) => s.optional(),
    }),
  address: Yup.string()
    .trim()
    .when("country", {
      is: INDIA_COUNTRY_ID,
      then: (s) => s.required("Address is required").max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`),
      otherwise: (s) => s.optional().max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`),
    }),
  addressLine1: Yup.string()
    .trim()
    .when("country", {
      is: (c: string) => !!c && c !== INDIA_COUNTRY_ID,
      then: (s) => s.required("Address line 1 is required").max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`),
      otherwise: (s) => s.optional(),
    }),
  addressLine2: Yup.string()
    .trim()
    .when("country", {
      is: (c: string) => !!c && c !== INDIA_COUNTRY_ID,
      then: (s) => s.required("Address line 2 is required").max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`),
      otherwise: (s) => s.optional().max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`),
    }),
  companyName: Yup.string().optional(),
});

export type BranchFacilityFormValues = {
  facilityType: "Hospital" | "Clinic" | "Daycare";
  name: string;
  phoneNumber: string;
  emailAddress: string;
  firmName: string;
  panNo: string;
  description: string;
  creditLimit: string;
  cstNo: string;
  tinNo: string;
  tat: string;
  gstNumber: string;
  stock: string;
  dp: string;
  stateCode: string;
  branchCode: string;
  branchId: string;
  branchUser: string;
  userPassword: string;
  warehouse: string;
  sms: string;
  advancedReferralAmount: string;
  referralAmountInPercent: string;
  showToAgent: string;
  isFranchise: string;
  branchStatus: string;
  wifiStatus: string;
  apiStatus: string;
  maplink: string;
  /** Selected module ids (strings) from GET /branch/getModulesForBranchSetup; sent as numeric `moduleIds` on create. */
  moduleIds: string[];
  /** Optional: copy infrastructure from an existing branch (GET /branch/getBranchListByType); sent as `cloneBranchId` on create. */
  cloneBranchId: string;
  bankName: string;
  accNo: string;
  ifscCode: string;
  bankBranchName: string;
  branchLogo: File | null;
  branchLogo2: File | null;
  address: AddressFormData;
};

export const initialBranchFacilityAddress: AddressFormData = {
  pinCode: "",
  country: INDIA_COUNTRY_ID,
  state: "",
  city: "",
  tehsil: "",
  area: "",
  address: "",
  addressLine1: "",
  addressLine2: "",
};

export const initialBranchFacilityValues: BranchFacilityFormValues = {
  facilityType: "Hospital",
  name: "",
  phoneNumber: "",
  emailAddress: "",
  firmName: "",
  panNo: "",
  description: "",
  creditLimit: "",
  cstNo: "",
  tinNo: "",
  tat: "",
  gstNumber: "",
  stock: "",
  dp: "",
  stateCode: "",
  branchCode: "",
  branchId: "",
  branchUser: "",
  userPassword: "",
  warehouse: "",
  sms: "ON",
  advancedReferralAmount: "",
  referralAmountInPercent: "",
  showToAgent: "",
  isFranchise: "no",
  branchStatus: "active",
  wifiStatus: "",
  apiStatus: "",
  maplink: "",
  moduleIds: [],
  cloneBranchId: "",
  bankName: "",
  accNo: "",
  ifscCode: "",
  bankBranchName: "",
  branchLogo: null,
  branchLogo2: null,
  address: { ...initialBranchFacilityAddress },
};

export const branchFacilityFormSchema = Yup.object().shape({
  facilityType: Yup.mixed<"Hospital" | "Clinic" | "Daycare">()
    .oneOf(["Hospital", "Clinic", "Daycare"])
    .required("Facility type is required"),
  name: Yup.string()
    .trim()
    .required("Facility name is required")
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .matches(lettersSpacesOnly, "Only letters and spaces are allowed")
    .test(
      "no-repeated-chars",
      noTripleRepeatMsg("Facility name"),
      (v) => !v || !hasMoreThanTwoConsecutiveSameChars(v)
    ),
  phoneNumber: Yup.string()
    .trim()
    .required("Phone number is required")
    .matches(/^\d{10}$/, "Enter a valid 10-digit phone number"),
  emailAddress: Yup.string()
    .trim()
    .required("Email is required")
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .test("email", "Enter a valid email address", (v) => !!v && isValidEmailAddress(v)),
  firmName: Yup.string()
    .trim()
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .test(
      "firm-name-chars",
      "Only letters, numbers, spaces and . & ' ( ) - are allowed",
      (v) => !v || firmNameChars.test(v)
    )
    .test(
      "no-repeated-chars",
      noTripleRepeatMsg("Firm name"),
      (v) => !v || !hasMoreThanTwoConsecutiveSameChars(v)
    ),
  panNo: Yup.string()
    .trim()
    .required("PAN is required")
    .transform((v) => v.toUpperCase())
    .matches(panRegex, "Enter a valid PAN (e.g. ABCDE1234F)"),
  description: Yup.string()
    .trim()
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .test(
      "description-chars",
      "Contains invalid characters for description",
      (v) => !v || descriptionChars.test(v)
    ),
  cstNo: Yup.string()
    .trim()
    .test("cst", "CST must be exactly 11 digits", (v) => !v || /^\d{11}$/.test(v)),
  tinNo: Yup.string()
    .trim()
    .test("tin", "TIN must be exactly 11 digits", (v) => !v || /^\d{11}$/.test(v)),
  tat: Yup.string()
    .trim()
    .transform((v) => (v == null ? "" : String(v).toUpperCase()))
    .test(
      "tat",
      "TAT must be exactly 10 letters or digits",
      (v) => !v || (v.length === 10 && /^[A-Z0-9]{10}$/.test(v))
    ),
  gstNumber: Yup.string()
    .trim()
    .transform((v) => (v == null ? "" : String(v).toUpperCase()))
    .required("GST number is required")
    .length(15, "GST must be exactly 15 characters")
    .matches(gstRegex, "Enter a valid GST number"),
  stock: Yup.string()
    .trim()
    .max(10, "Maximum 10 characters")
    .test("num", "Enter a valid number", (v) => !v || !Number.isNaN(Number(v))),
  dp: Yup.string()
    .trim()
    .max(10, "Maximum 10 characters")
    .test("num", "Enter a valid number", (v) => !v || !Number.isNaN(Number(v))),
  stateCode: Yup.string()
    .trim()
    .required("State code is required")
    .max(10, "Maximum 10 characters")
    .matches(alphanumericCode, "Only letters and numbers are allowed"),
  branchCode: Yup.string()
    .trim()
    .required("Branch code is required")
    .transform((v) => (v == null ? "" : String(v).toUpperCase()))
    .max(10, "Branch code must be at most 10 characters")
    .matches(/^[A-Z0-9]+$/, "Branch code must be alphanumeric only (no spaces or symbols)"),
  branchId: Yup.string()
    .trim()
    .required("Branch ID is required")
    .matches(/^\d{1,20}$/, "Branch ID must be numeric only, up to 20 digits"),
  branchUser: Yup.string()
    .trim()
    .required("Branch user is required")
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .matches(lettersSpacesOnly, "Only letters and spaces are allowed")
    .test(
      "no-repeated-chars",
      noTripleRepeatMsg("Branch user"),
      (v) => !v || !hasMoreThanTwoConsecutiveSameChars(v)
    ),
  userPassword: Yup.string()
    .trim()
    .required("User password is required")
    .min(6, "At least 6 characters")
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`),
  warehouse: Yup.string()
    .trim()
    .test(
      "warehouse",
      "Select Warehouse 1 or Warehouse 2",
      (v) => !v || v === "Warehouse 1" || v === "Warehouse 2"
    ),
  sms: Yup.string().oneOf(["ON", "OFF"]).required(),
  advancedReferralAmount: Yup.string()
    .trim()
    .test(
      "adv-digits",
      "Advanced referral amount must be up to 9 digits only",
      (v) => !v || /^\d{1,9}$/.test(v)
    )
    .test(
      "adv-finite",
      "Enter a valid amount",
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0)
    ),
  referralAmountInPercent: Yup.string()
    .trim()
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .test("num", "Enter a valid percentage", (v) => !v || !Number.isNaN(Number(v))),
  showToAgent: Yup.string()
    .trim()
    .test("showToAgent", "Select Yes or No", (v) => !v || v === "yes" || v === "no"),
  isFranchise: Yup.string().oneOf(["yes", "no"]).required(),
  creditLimit: Yup.string()
    .trim()
    .when("isFranchise", {
      is: "yes",
      then: (schema) =>
        schema
          .required("Credit limit is required when Is Franchise is Yes")
          .matches(/^\d{1,15}$/, "Credit limit must be up to 15 digits only")
          .test("finite", "Enter a valid number", (v) => v != null && v !== "" && Number.isFinite(Number(v))),
      otherwise: (schema) =>
        schema
          .test("credit-digits", "Credit limit must be up to 15 digits only", (v) => !v || /^\d{1,15}$/.test(v))
          .test("credit-finite", "Enter a valid number", (v) => !v || Number.isFinite(Number(v))),
    }),
  branchStatus: Yup.string().oneOf(["active", "inactive"]).required(),
  wifiStatus: Yup.string()
    .trim()
    .test("wifi", "Select Active or Deactive", (v) => !v || v === "active" || v === "deactive"),
  apiStatus: Yup.string()
    .trim()
    .test("api", "Select Active or Inactive", (v) => !v || v === "active" || v === "inactive"),
  maplink: Yup.string()
    .trim()
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .test("url", "Please enter a valid map link", (v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    }),
  moduleIds: Yup.array()
    .of(Yup.string().trim().required())
    .min(1, "Select at least one module")
    .required("Select at least one module"),
  cloneBranchId: Yup.string()
    .trim()
    .test("cloneBranchId", "Select a valid branch to copy or leave empty", (v) => !v || /^\d+$/.test(v)),
  bankName: Yup.string()
    .trim()
    .required("Bank name is required")
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .matches(firmNameChars, "Only letters, numbers, spaces and . & ' ( ) - are allowed")
    .test(
      "no-repeated-chars",
      noTripleRepeatMsg("Bank name"),
      (v) => !v || !hasMoreThanTwoConsecutiveSameChars(v)
    ),
  accNo: Yup.string()
    .trim()
    .required("Account number is required")
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .matches(/^\d+$/, "Only digits are allowed"),
  ifscCode: Yup.string()
    .trim()
    .required("IFSC code is required")
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Enter a valid IFSC code"),
  bankBranchName: Yup.string()
    .trim()
    .required("Bank branch name is required")
    .max(TEXT_MAX, `Maximum ${TEXT_MAX} characters`)
    .matches(firmNameChars, "Only letters, numbers, spaces and . & ' ( ) - are allowed")
    .test(
      "no-repeated-chars",
      noTripleRepeatMsg("Bank branch name"),
      (v) => !v || !hasMoreThanTwoConsecutiveSameChars(v)
    ),
  branchLogo: Yup.mixed()
    .nullable()
    .notRequired()
    .test("file", "Primary logo must be a valid image file", (v) => v == null || v instanceof File),
  branchLogo2: Yup.mixed()
    .nullable()
    .notRequired()
    .test(
      "secondary-file",
      "Secondary logo must be a valid image file",
      (v) => v == null || v instanceof File
    ),
  address: branchFacilityAddressSchema,
});

/** Field order for scroll/focus on first validation error (matches form layout top → bottom). */
export const BRANCH_FACILITY_FIELD_ORDER: readonly string[] = [
  "facilityType",
  "name",
  "phoneNumber",
  "emailAddress",
  "firmName",
  "panNo",
  "description",
  "creditLimit",
  "cstNo",
  "tinNo",
  "tat",
  "gstNumber",
  "stock",
  "dp",
  "stateCode",
  "warehouse",
  "branchCode",
  "branchId",
  "branchUser",
  "userPassword",
  "advancedReferralAmount",
  "referralAmountInPercent",
  "showToAgent",
  "sms",
  "isFranchise",
  "branchStatus",
  "wifiStatus",
  "apiStatus",
  "maplink",
  "moduleIds",
  "cloneBranchId",
  "branchLogo",
  "branchLogo2",
  "bankName",
  "accNo",
  "ifscCode",
  "bankBranchName",
  "address.pinCode",
  "address.country",
  "address.state",
  "address.city",
  "address.tehsil",
  "address.area",
  "address.address",
  "address.addressLine1",
  "address.addressLine2",
];

const _FACILITY_STEP_BANK = BRANCH_FACILITY_FIELD_ORDER.indexOf("bankName");
const _FACILITY_STEP_ADDR = BRANCH_FACILITY_FIELD_ORDER.indexOf("address.pinCode");

/** Form paths per Add Facility wizard step: basic → bank → address (matches `BRANCH_FACILITY_FIELD_ORDER`). */
export const BRANCH_FACILITY_STEP_FIELD_KEYS: readonly [readonly string[], readonly string[], readonly string[]] = [
  BRANCH_FACILITY_FIELD_ORDER.slice(0, _FACILITY_STEP_BANK),
  BRANCH_FACILITY_FIELD_ORDER.slice(_FACILITY_STEP_BANK, _FACILITY_STEP_ADDR),
  BRANCH_FACILITY_FIELD_ORDER.slice(_FACILITY_STEP_ADDR),
] as const;

export function flattenBranchFacilityErrors(err: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (!err || typeof err !== "object") return out;
  for (const [k, v] of Object.entries(err)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      out[key] = v;
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenBranchFacilityErrors(v, key));
    } else if (Array.isArray(v)) {
      const first = v.find((x) => typeof x === "string");
      if (typeof first === "string") out[key] = first;
    }
  }
  return out;
}

/**
 * Optional (non-mandatory) top-level fields: when validation fails, they should not
 * be shown ahead of mandatory errors on submit — see `pickMandatoryBranchFacilityErrors`.
 */
export const BRANCH_FACILITY_OPTIONAL_SUBMIT_PRIORITY_ROOTS: ReadonlySet<string> = new Set([
  "firmName",
  "description",
  "tinNo",
  "cstNo",
  "tat",
  "stock",
  "dp",
  "warehouse",
  "advancedReferralAmount",
  "referralAmountInPercent",
  "wifiStatus",
  "apiStatus",
  "maplink",
  "cloneBranchId",
  "branchLogo",
  "branchLogo2",
  "showToAgent",
]);

export function isOptionalSubmitPriorityBranchField(flatKey: string): boolean {
  if (flatKey.startsWith("address.")) return false;
  const root = flatKey.split(".")[0] ?? "";
  return BRANCH_FACILITY_OPTIONAL_SUBMIT_PRIORITY_ROOTS.has(root);
}

export function pickMandatoryBranchFacilityErrors(flat: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (!isOptionalSubmitPriorityBranchField(k)) out[k] = v;
  }
  return out;
}

export function pickOptionalOnlyBranchFacilityErrors(flat: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (isOptionalSubmitPriorityBranchField(k)) out[k] = v;
  }
  return out;
}
