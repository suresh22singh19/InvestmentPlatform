import * as Yup from "yup";
import { isValidEmailAddress } from "@/lib/utils/emailValidation";

// Reject more than 2 consecutive same characters (e.g. "ddddd" or "aaaa")
function hasMoreThanTwoConsecutiveSameChars(value: string): boolean {
  if (!value || value.length < 3) return false;
  return /(.)\1{2,}/.test(value);
}

// Time slots for OPD (must match AppointmentInformation / IpdOpdDetails)
const OPD_TIME_SLOTS = [
  "10:00am - 12:00pm",
  "11:00am - 01:00pm",
  "12:00pm - 02:00pm",
  "01:00pm - 03:00pm",
  "02:00pm - 04:00pm",
  "03:00pm - 05:00pm",
  "04:00pm - 06:00pm",
];

/** Default when master setting `prebooking` is missing or invalid (was previously hard-coded). */
export const DEFAULT_PREBOOKING_APPOINTMENT_MAX_DAYS = 45;

export function createPreBookingFormSchema(maxAdvanceBookingDays: number = DEFAULT_PREBOOKING_APPOINTMENT_MAX_DAYS) {
  return Yup.object().shape({
  // Patient Information
  contactNumber: Yup.string()
    .trim()
    .required("Contact Number is required")
    .min(10, "Contact Number must be at least 10 digits")
    .matches(/^\d+$/, "Contact Number must contain only digits"),

  branchId: Yup.string()
    .trim()
    .required("Branch is required"),

  doctor: Yup.string()
    .trim()
    .required("Doctor is required"),

  gender: Yup.string()
    .trim()
    .required("Gender is required"),

  emailAddress: Yup.string()
    .trim()
    .max(100, "Email Address cannot exceed 100 characters")
    .when("country", {
      is: "6", // India — optional; validate format when provided
      then: (schema) =>
        schema.test("email-format", "Please enter a valid email address", (value) => isValidEmailAddress(value)),
      otherwise: (schema) =>
        schema.when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
          then: (s) =>
            s
              .required("Email Address is required")
              .test("email-format", "Please enter a valid email address", (value) => isValidEmailAddress(value)),
          otherwise: (s) =>
            s.test("email-format", "Please enter a valid email address", (value) => isValidEmailAddress(value)),
        }),
    }),

  patientNameSelect: Yup.string()
    .trim()
    .required("Title is required"),

  patientName: Yup.string()
    .trim()
    .required("Patient Name is required")
    .max(100, "Patient Name cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed")
    .test("no-repeated-chars", "Patient Name cannot have more than 2 consecutive same characters", (value) => !value || !hasMoreThanTwoConsecutiveSameChars(value)),

  age: Yup.string()
    .trim()
    .required("Age is required")
    .matches(/^\d+$/, "Age must contain only digits")
    .test("age-range", "Age must be between 1 and 120", (value) => {
      if (!value) return false;
      const numValue = parseInt(value, 10);
      return numValue >= 1 && numValue <= 120;
    }),

  fathersHusbandsNameSelect: Yup.string()
    .trim()
    .required("Title is required"),

  fathersHusbandsName: Yup.string()
    .trim()
    .required("Father's/Husband's Name is required")
    .max(100, "Father's/Husband's Name cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed")
    .test("no-repeated-chars", "Father's/Husband's Name cannot have more than 2 consecutive same characters", (value) => !value || !hasMoreThanTwoConsecutiveSameChars(value)),

  maritalStatus: Yup.string()
    .trim()
    .required("Marital Status is required"),

  // Address Details
  pinCode: Yup.string()
    .trim()
    .when("country", {
      is: "6",
      then: (schema) => schema
        .required("Pin Code is required")
        .length(6, "Pin Code must be 6 digits")
        .matches(/^\d+$/, "Pin Code must contain only digits"),
      otherwise: (schema) => schema.optional(),
    }),

  country: Yup.string()
    .required("Country is required"),

  state: Yup.string()
    .required("State is required"),

  city: Yup.string()
    .required("District is required"),

  tehsil: Yup.string()
    .trim()
    .when("country", {
      is: "6",
      then: (schema) => schema.required("Tehsil/Area is required"),
      otherwise: (schema) => schema.optional(),
    }),

  area: Yup.string()
    .trim()
    .when("country", {
      is: "6",
      then: (schema) => schema.required("Post Office is required"),
      otherwise: (schema) => schema.optional(),
    }),

  address: Yup.string()
    .trim()
    .max(100, "Address cannot exceed 100 characters")
    .when("country", {
      is: "6",
      then: (schema) => schema.required("Address is required"),
      otherwise: (schema) => schema.optional(),
    }),

  addressLine1: Yup.string()
    .trim()
    .max(100, "Address Line 1 cannot exceed 100 characters")
    .when("country", {
      is: (val: string) => val && val !== "6",
      then: (schema) => schema.required("Address Line 1 is required"),
      otherwise: (schema) => schema.optional(),
    }),

  addressLine2: Yup.string()
    .trim()
    .max(100, "Address Line 2 cannot exceed 100 characters")
    .optional(),

  // GST Billing
  gstBilling: Yup.boolean()
    .default(false),

  gstNumber: Yup.string()
    .trim()
    .when("gstBilling", {
      is: true,
      then: (schema) => schema
        .required("GST Number is required")
        .length(15, "GST Number must be exactly 15 characters")
        .matches(
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
          "Please enter a valid GST Number (Format: 29ABCDE1234F1Z5)"
        ),
      otherwise: (schema) => schema.optional(),
    }),

  companyName: Yup.string()
    .trim()
    .max(100, "Company Name cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s&-]*$/, "Company Name can only contain letters, spaces, & and -")
    .when("gstBilling", {
      is: true,
      then: (schema) => schema.required("Company Name is required"),
      otherwise: (schema) => schema.optional(),
    }),

  billingAddress: Yup.string()
    .trim()
    .max(100, "Billing Address cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s&-]*$/, "Billing Address can only contain letters, spaces, & and -")
    .when("gstBilling", {
      is: true,
      then: (schema) => schema.required("Billing Address is required"),
      otherwise: (schema) => schema.optional(),
    }),

  billingState: Yup.string()
    .when("gstBilling", {
      is: true,
      then: (schema) => schema.required("Billing State is required"),
      otherwise: (schema) => schema.optional(),
    }),

  billingCity: Yup.string()
    .when("gstBilling", {
      is: true,
      then: (schema) => schema.required("Billing District is required"),
      otherwise: (schema) => schema.optional(),
    }),

  billingPincode: Yup.string()
    .trim()
    .when("gstBilling", {
      is: true,
      then: (schema) => schema
        .required("Billing Pincode is required")
        .length(6, "Pincode must be 6 digits")
        .matches(/^\d+$/, "Pincode must contain only digits"),
      otherwise: (schema) => schema.optional(),
    }),

  // Addiction (optional)
  addictionAlcohol: Yup.boolean().optional(),
  addictionSmoking: Yup.boolean().optional(),
  addictionTobacco: Yup.boolean().optional(),
  addictionDrugs: Yup.boolean().optional(),
  addictionOther: Yup.boolean().optional(),
  addictionSpecify: Yup.string().trim().max(100, "Specify cannot exceed 100 characters").optional(),

  // Referral (same as registration: Yes/No, Source, then source-specific fields)
  referral: Yup.string()
    .trim()
    .optional()
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),

  source: Yup.string()
    .trim()
    .when("referral", {
      is: (val: string) => val?.toLowerCase() === "yes",
      then: (schema) => schema.required("Source is required"),
      otherwise: (schema) => schema.optional(),
    }),

  tvSpecificField: Yup.string()
    .trim()
    .when(["referral", "source"], {
      is: (referral: string, source: string) => referral?.toLowerCase() === "yes" && source?.toLowerCase() === "tv",
      then: (schema) => schema.required("TV Specific field is required"),
      otherwise: (schema) => schema.optional(),
    }),

  newspaperSpecificField: Yup.string()
    .trim()
    .when(["referral", "source"], {
      is: (referral: string, source: string) => referral?.toLowerCase() === "yes" && source?.toLowerCase() === "newspaper",
      then: (schema) => schema.required("Newspaper Specific field is required"),
      otherwise: (schema) => schema.optional(),
    }),

  socialMediaSpecificField: Yup.string()
    .trim()
    .when(["referral", "source"], {
      is: (referral: string, source: string) => {
        if (referral?.toLowerCase() !== "yes") return false;
        const normalized = (source || "").toLowerCase().replace(/\s+/g, "-");
        return normalized === "social-media";
      },
      then: (schema) => schema.required("Social Media Specific field is required"),
      otherwise: (schema) => schema.optional(),
    }),

  doctorSpecificField: Yup.string()
    .trim()
    .when(["referral", "source"], {
      is: (referral: string, source: string) => referral?.toLowerCase() === "yes" && source?.toLowerCase() === "doctor",
      then: (schema) => schema.required("Doctor Specific field is required"),
      otherwise: (schema) => schema.optional(),
    }),

  referralName: Yup.string()
    .trim()
    .max(100, "Referral Name cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s]*$/, "Referral Name must contain only letters and spaces")
    .when(["referral", "source"], {
      is: (referral: string, source: string) => {
        if (referral?.toLowerCase() !== "yes") return false;
        const normalized = (source || "").toLowerCase();
        return normalized === "other" || normalized === "referral";
      },
      then: (schema) => schema.required("Referral Name is required").min(1, "Referral Name is required"),
      otherwise: (schema) => schema.optional(),
    }),

  referralMobile: Yup.string()
    .trim()
    .when(["referral", "source"], {
      is: (referral: string, source: string) => {
        if (referral?.toLowerCase() !== "yes") return false;
        const normalized = (source || "").toLowerCase();
        return normalized === "other" || normalized === "referral";
      },
      then: (schema) => schema
        .required("Referral Mobile is required")
        .length(10, "Referral Mobile must be 10 digits")
        .matches(/^\d+$/, "Referral Mobile must contain only digits"),
      otherwise: (schema) => schema
        .optional()
        .test("len-or-empty", "Referral Mobile must be 10 digits", (value) => !value || value.length === 10)
        .matches(/^\d*$/, "Referral Mobile must contain only digits"),
    }),

  // Patient Type
  patientType: Yup.string()
    .trim()
    .required("Patient Type is required")
    .oneOf(["private", "panel", "tpa", "Private", "Panel", "TPA"], "Please select a valid Patient Type"),

  patientSubType: Yup.string().trim().optional(),
  panelId: Yup.string()
    .trim()
    .when("patientType", {
      is: (value: string) => value && value.toLowerCase() === "panel",
      then: (schema) => schema.required("Panel is required"),
      otherwise: (schema) => schema.optional(),
    }),
  benificiaryId: Yup.string()
    .trim()
    .max(15, "Beneficiary ID cannot exceed 15 digits")
    .matches(/^\d*$/, "Beneficiary ID must contain only digits")
    .optional(),
  insuranceCompany: Yup.string().trim().max(100, "Insurance Company cannot exceed 100 characters").optional(),
  ayushCovered: Yup.string()
    .trim()
    .optional()
    .oneOf(["yes", "no", "Yes", "No", ""], "Please select Yes or No"),
  jsHealthCardNo: Yup.string().trim().optional(),

  // Diagnosis Information
  diagnosis: Yup.string().trim().required("Primary Disease is required"),
  subDiagnosis: Yup.string().trim().required("Secondary Disease is required"),
  symptoms: Yup.string()
    .trim()
    .max(100, "Symptoms cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s]*$/, "Symptoms can only contain letters and spaces")
    .optional(),

  // OPD / IPD
  bookingType: Yup.string()
    .trim()
    .required("Please select OPD or IPD")
    .oneOf(["opd", "ipd"], "Please select OPD or IPD"),

  appointmentDate: Yup.string()
    .trim()
    .when("bookingType", {
      is: "opd",
      then: (schema) => schema
        .required("Appointment Date is required")
        .test("valid-date", "Please select a valid date", (value) => {
          if (!value) return false;
          const date = new Date(value);
          return !isNaN(date.getTime());
        })
        .test(
          "date-range",
          `Appointment Date must be from today up to ${maxAdvanceBookingDays} days from now`,
          (value) => {
            if (!value) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selected = new Date(value);
            selected.setHours(0, 0, 0, 0);
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays);
            maxDate.setHours(23, 59, 59, 999);
            return selected >= today && selected <= maxDate;
          }
        ),
      otherwise: (schema) => schema.optional(),
    }),

  timeSlot: Yup.string()
    .trim()
    .when("bookingType", {
      is: "opd",
      then: (schema) => schema
        .required("Time Slot is required")
        .oneOf(OPD_TIME_SLOTS, "Please select a time slot"),
      otherwise: (schema) => schema.optional(),
    }),

  packageId: Yup.string()
    .trim()
    .when("bookingType", {
      is: "ipd",
      then: (schema) => schema.required("Package is required"),
      otherwise: (schema) => schema.optional(),
    }),

  startDate: Yup.string().trim().optional(),
  endDate: Yup.string().trim().optional(),
  amount: Yup.string().trim().optional(),
  paymentMode: Yup.string().trim().optional(),
  paymentMethod: Yup.string().trim().optional(),
  transactionId: Yup.string().trim().max(100, "Transaction ID cannot exceed 100 characters").optional(),
  });
}

export type PreBookingFormValues = Yup.InferType<ReturnType<typeof createPreBookingFormSchema>>;
