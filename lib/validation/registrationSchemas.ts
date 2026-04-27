import * as Yup from "yup";
import { isValidEmailAddress } from "@/lib/utils/emailValidation";

// Aadhaar validation helpers: first digit not 0/1, not sequential, not repeating
function isAadharFirstDigitValid(value: string): boolean {
  if (!value || value.length === 0) return true;
  const first = value.trim().charAt(0);
  return first >= "2" && first <= "9";
}

function isAadharSequential(value: string): boolean {
  if (!value || value.length !== 12) return false;
  const digits = value.replace(/\D/g, "").split("").map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 1) % 10);
  const descending = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 9) % 10);
  return ascending || descending;
}

function isAadharRepeatingOrSame(value: string): boolean {
  if (!value || value.length !== 12) return false;
  const s = value.replace(/\D/g, "");
  if (/^(\d)\1{11}$/.test(s)) return true; // all same digit
  if (/^(\d{2})\1{5}$/.test(s)) return true; // pattern length 2
  if (/^(\d{3})\1{3}$/.test(s)) return true; // pattern length 3
  if (/^(\d{4})\1{2}$/.test(s)) return true; // pattern length 4
  if (/^(\d{6})\1{1}$/.test(s)) return true; // pattern length 6
  return false;
}

/** Fallback until Arogya series API returns */
export const DEFAULT_JS_HEALTH_CARD_DIGIT_LENGTH = 12;

function jsHealthCardNoFieldSchema(digitLength: number) {
  const len = digitLength > 0 ? digitLength : DEFAULT_JS_HEALTH_CARD_DIGIT_LENGTH;
  const lengthMsg = `JS Health Card No. must be exactly ${len} digits`;
  return Yup.string()
    .trim()
    .when("patientType", {
      is: (val: string) => val?.toLowerCase() === "private",
      then: (schema) =>
        schema
          .required("JS Health Card No. is required")
          .matches(/^\d+$/, "JS Health Card No. must contain only digits")
          .test(
            "js-health-card-length-private",
            lengthMsg,
            (value) => (value || "").replace(/\D/g, "").length === len,
          ),
      otherwise: (schema) =>
        schema
          .optional()
          .matches(/^\d*$/, "JS Health Card No. must contain only digits")
          .test("js-health-card-length", lengthMsg, (value) => {
            const d = (value || "").replace(/\D/g, "");
            return d.length === 0 || d.length === len;
          }),
    });
}

// Registration Personal Details validation schema
function buildRegistrationPersonalDetailsSchema(
  jsHealthCardDigitLength: number = DEFAULT_JS_HEALTH_CARD_DIGIT_LENGTH,
) {
  return Yup.object().shape({
  contactNumber: Yup.string()
    .trim()
    .required("Contact Number is required")
    .min(10, "Contact Number must be at least 10 digits")
    .matches(/^\d+$/, "Contact Number must contain only digits"),
  
  whatsappNo: Yup.string()
    .trim()
    .optional()
    .test("len-or-empty", "WhatsApp Number must be 10 digits", (value) => !value || value.length === 10)
    .matches(/^\d*$/, "WhatsApp Number must contain only digits"),
  
  aadharCardNumber: Yup.string()
    .trim()
    .optional()
    .test("len-or-empty", "Aadhar Card Number must be exactly 12 digits", (value) => !value || value.length === 12)
    .matches(/^\d*$/, "Aadhar Card Number must contain only digits")
    .test("aadhar-first-digit", "First digit cannot be 0 or 1", (value) => !value || value.trim().length === 0 || isAadharFirstDigitValid(value))
    .test("aadhar-sequential", "Aadhar cannot be a sequential pattern", (value) => !value || !isAadharSequential(value))
    .test("aadhar-repeating", "Aadhar cannot be a repeating or same-digit pattern", (value) => !value || !isAadharRepeatingOrSame(value)),
  
  patientNameSelect: Yup.string()
    .trim()
    .required("Title is required"),
  
  patientName: Yup.string()
    .trim()
    .required("Patient Name is required")
    .max(100, "Patient Name cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
  
  gender: Yup.string()
    .trim()
    .required("Gender is required"),
  
  age: Yup.string()
    .trim()
    .required("Age is required")
    .matches(/^\d+$/, "Age must contain only digits")
    .test("age-range", "Age must be between 1 and 120", (value) => {
      if (!value) return false;
      const numValue = parseInt(value, 10);
      return numValue >= 1 && numValue <= 120;
    }),
  
  maritalStatus: Yup.string()
    .trim()
    .required("Marital Status is required"),
  
  fathersHusbandsNameSelect: Yup.string()
    .trim()
    .required("Title is required"),
  
  fathersHusbandsName: Yup.string()
    .trim()
    .required("Father's/Husband's Name is required")
    .max(100, "Father's/Husband's Name cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
  
  religion: Yup.string()
    .trim()
    .required("Religion is required")
    .oneOf(["hindu", "muslim", "sikh", "buddhists", "jain", "other", "Hindu", "Muslim", "Sikh", "Buddhists", "Jain", "Other"], "Please select a valid religion"),
  
  specificReligion: Yup.string()
    .trim()
    .when("religion", {
      is: (val: string) => val?.toLowerCase() === "other",
      then: (schema) => schema
        .required("Specific Religion is required")
        .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
      otherwise: (schema) => schema.optional(),
    }),
  
  occupation: Yup.string()
    .trim()
    .required("Occupation is required")
    .max(100, "Occupation cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
  
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
  
  jsHealthCardNo: jsHealthCardNoFieldSchema(jsHealthCardDigitLength),
  
  // Address Details
  pinCode: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema
        .required("Pin Code is required")
        .length(6, "Pin Code must be 6 digits")
        .matches(/^\d+$/, "Pin Code must contain only digits"),
      otherwise: (schema) => schema.optional(),
    }),
  
  country: Yup.string()
    .required("Country is required"),
  
  state: Yup.string()
    .trim()
    .when("country", {
      is: "6",
      then: (schema) => schema.required("State is required"),
      otherwise: (schema) =>
        schema.when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
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
      is: "6",
      then: (schema) => schema.required("District is required"),
      otherwise: (schema) =>
        schema.when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
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
      is: "6", // India
      then: (schema) => schema.required("Tehsil/Area is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  area: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema.required("Post Office is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  address: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema.required("Address is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  addressLine1: Yup.string()
    .trim()
    .when("country", {
      is: (val: string) => val && val !== "6",
      then: (schema) => schema.required("Address Line 1 is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  addressLine2: Yup.string()
    .trim()
    .optional(),
  
  // Patient Type
  patientType: Yup.string()
    .trim()
    .required("Patient Type is required")
    .oneOf(["private", "panel", "tpa", "Private", "Panel", "TPA"], "Please select a valid Patient Type"),
  
  patientSubType: Yup.string()
    .trim()
    .optional(),
  
  panelId: Yup.string()
    .trim()
    .when("patientType", {
      is: (value: string) => value && value.toLowerCase() === "panel",
      then: (schema) => schema.required("Panel is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  benificiaryId: Yup.string()
    .trim()
    .optional(),
  
  insuranceCompany: Yup.string()
    .trim()
    .optional(),
  
  ayushCovered: Yup.string()
    .trim()
    .optional()
    .oneOf(["yes", "no", "Yes", "No", ""], "Please select Yes or No"),
  
  // Referral
  referral: Yup.string()
    .trim()
    .optional()
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),
  
  source: Yup.string()
    .trim()
    .when("referral", {
      is: (value: string) => value?.toLowerCase() === "yes",
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
  
  // Appointment Information
  doctor: Yup.string()
    .trim()
    .required("Doctor is required"),
  
  appointmentDate: Yup.string()
    .trim()
    .required("Appointment Date is required")
    .test("valid-date", "Please select a valid date", (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    }),
  
  timeSlot: Yup.string()
    .trim()
    .required("Time Slot is required")
    // Must match one of the configured UI options in AppointmentInformation.tsx
    .oneOf(
      [
        "10:00am - 12:00pm",
        "11:00am - 01:00pm",
        "12:00pm - 02:00pm",
        "01:00pm - 03:00pm",
        "02:00pm - 04:00pm",
        "03:00pm - 05:00pm",
        "04:00pm - 06:00pm",
      ],
      "Please select a time slot"
    ),
  
  // Payment Details
  consultationCharges: Yup.string()
    .trim()
    .required("Consultation Charges is required")
    .test("valid-price", "Please select a valid consultation charge", (value) => {
      if (!value || value.trim() === "") return false;
      // Check if it's a valid number (allows decimals and 0)
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue >= 0;
    }),
  
  paymentMode: Yup.string()
    .trim()
    .when("consultationCharges", {
      is: (value: string) => value && parseFloat(value) > 0,
      then: (schema) => schema
        .required("Payment Mode is required")
        .oneOf(["cash", "credit", "Cash", "Credit"], "Please select Cash or Online Payment"),
      otherwise: (schema) => schema.optional(),
    }),
  
  transactionId: Yup.string()
    .trim()
    .when("paymentMode", {
      is: (value: string) => value?.toLowerCase() === "credit",
      then: (schema) => schema
        .required("Transaction ID is required for digital payment")
        .min(10, "Transaction ID must be at least 10 characters")
        .max(30, "Transaction ID must be at most 30 characters"),
      otherwise: (schema) => schema.optional(),
    }),
  
  serviceId: Yup.mixed<number | string>()
    .optional(),
  
  razorpayPosPaymentLogId: Yup.mixed<number | string>()
    .optional(),
  
  gstBilling: Yup.boolean()
    .default(false),
  
  // Billing Information
  gstNumber: Yup.string()
    .trim()
    .when("gstBilling", {
      is: true,
      then: (schema) => schema
        .required("GST Number is required")
        .length(15, "GST Number must be exactly 15 characters")
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Please enter a valid GST Number (Format: 29ABCDE1234F1Z5)"),
      otherwise: (schema) => schema.optional(),
    }),
  
  companyName: Yup.string()
    .trim()
    .when("gstBilling", {
      is: true,
      then: (schema) => schema.required("Company Name is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  billingAddress: Yup.string()
    .trim()
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
  
  // Vitals Information
  heightFeet: Yup.string()
    .trim()
    .required("Height in Feet is required")
    .matches(/^\d+$/, "Height in Feet must contain only digits")
    .test("height-feet-range", "Height in Feet must be between 1 and 10", (value) => {
      if (!value) return false;
      const numValue = parseInt(value, 10);
      return numValue >= 1 && numValue <= 10;
    }),
  
  heightInch: Yup.string()
    .trim()
    .required("Height in Inch is required")
    .matches(/^\d+$/, "Height in Inch must contain only digits")
    .test("height-inch-range", "Height in Inch must be between 0 and 11", (value) => {
      if (!value) return false;
      const numValue = parseInt(value, 10);
      return numValue >= 0 && numValue <= 11;
    }),
  
  weight: Yup.string()
    .trim()
    .required("Weight is required")
    .matches(/^\d+(\.\d{1,2})?$/, "Weight must be a valid number")
    .test("weight-range", "Weight must be between 1 and 500 kg", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 1 && numValue <= 500;
    }),
  
  bloodGroup: Yup.string()
    .trim()
    .required("Blood Group is required")
    .oneOf(["a-positive", "a-negative", "b-positive", "b-negative", "ab-positive", "ab-negative", "o-positive", "o-negative"], "Please select a valid blood group"),
  
  allergies: Yup.string()
    .trim()
    .required("Allergies is required")
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),

  /** Free-text details captured when Allergies = "Yes" (dialog input) */
  allergiesDetails: Yup.string()
    .trim()
    .optional()
    .when("allergies", {
      is: (val: string) => typeof val === "string" && val.toLowerCase() === "yes",
      then: (schema) => schema.required("Please enter allergies details"),
      otherwise: (schema) => schema.optional(),
    }),

  surgeries: Yup.string()
    .trim()
    .required("Surgeries is required")
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),

  /** Free-text details captured when Surgeries = "Yes" (dialog input) */
  surgeriesDetails: Yup.string()
    .trim()
    .optional()
    .when("surgeries", {
      is: (val: string) => typeof val === "string" && val.toLowerCase() === "yes",
      then: (schema) => schema.required("Please enter surgeries details"),
      otherwise: (schema) => schema.optional(),
    }),

  dietType: Yup.string()
    .trim()
    .required("Diet Type is required"),
  
  lastDayFullDiet: Yup.string()
    .trim()
    .optional(),
  
  bloodPressure: Yup.string()
    .trim()
    .required("Blood Pressure is required")
    .matches(/^\d+\/\d+$/, "Blood Pressure must be in format Systolic/Diastolic (e.g., 120/80)"),
  
  sugarLevel: Yup.string()
    .trim()
    .required("Sugar Level is required")
    .matches(/^\d+(\.\d{1,2})?$/, "Sugar Level must be a valid number")
    .test("sugar-range", "Sugar Level must be between 50 and 500 mg/dL", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 50 && numValue <= 500;
    }),
  
  temperature: Yup.string()
    .trim()
    .required("Temperature is required")
    .matches(/^\d+(\.\d{1,2})?$/, "Temperature must be a valid number")
    .test("temperature-range", "Temperature must be between 90 and 110 °F", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 90 && numValue <= 110;
    }),
  
  pulse: Yup.string()
    .trim()
    .optional()
    .matches(/^\d+$/, "Pulse must contain only digits")
    .test("pulse-range", "Pulse must be between 40 and 200 bpm", (value) => {
      if (!value) return true; // Optional field
      const numValue = parseInt(value, 10);
      return numValue >= 40 && numValue <= 200;
    }),
  
  spo2: Yup.string()
    .trim()
    .optional()
    .matches(/^\d+(\.\d{1,2})?$/, "SPO2 must be a valid number")
    .test("spo2-range", "SPO2 must be between 70 and 100%", (value) => {
      if (!value) return true; // Optional field
      const numValue = parseFloat(value);
      return numValue >= 70 && numValue <= 100;
    }),
  
  // Medical Information
  diabetes: Yup.string()
    .trim()
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),
  
  diabetesRemarks: Yup.string()
    .trim()
    .optional(),
  
  htn: Yup.string()
    .trim()
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),
  
  htnRemarks: Yup.string()
    .trim()
    .optional(),
  
  coronaryArteryDisease: Yup.string()
    .trim()
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),
  
  coronaryArteryDiseaseRemarks: Yup.string()
    .trim()
    .optional(),
  
  thyroid: Yup.string()
    .trim()
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),
  
  thyroidRemarks: Yup.string()
    .trim()
    .optional(),
  
  menstrual: Yup.string()
    .trim()
    .oneOf(["yes", "no", "Yes", "No"], "Please select Yes or No"),
  
  menstrualRemarks: Yup.string()
    .trim()
    .optional(),
  
  alcohol: Yup.boolean(),
  
  smoking: Yup.boolean(),
  
  tobacco: Yup.boolean(),
  
  drugs: Yup.boolean(),
  
  addictionOther: Yup.boolean(),
  
  addictionSpecify: Yup.string()
    .trim()
    .when("addictionOther", {
      is: true,
      then: (schema) => schema.required("Please specify the addiction"),
      otherwise: (schema) => schema.optional(),
    }),
  
  // Diagnosis Information
  diagnosis: Yup.string()
    .trim()
    .required("Please select a primary disease")
    .test("not-empty", "Please select a primary disease", (value) => {
      return value !== undefined && value !== null && value.trim() !== "";
    }),
  
  subDiagnosis: Yup.string()
    .trim()
    .required("Please select a secondary disease")
    .test("not-empty", "Please select a secondary disease", (value) => {
      return value !== undefined && value !== null && value.trim() !== "";
    }),
  
  symptoms: Yup.string()
    .trim()
    .optional(),
  });
}

export const registrationPersonalDetailsSchema = buildRegistrationPersonalDetailsSchema();

export function createRegistrationPersonalDetailsSchema(options?: {
  jsHealthCardDigitLength?: number;
}) {
  return buildRegistrationPersonalDetailsSchema(
    options?.jsHealthCardDigitLength ?? DEFAULT_JS_HEALTH_CARD_DIGIT_LENGTH,
  );
}

export type RegistrationPersonalDetailsFormValues = Yup.InferType<typeof registrationPersonalDetailsSchema>;

// Custom schema for IPD Registration Clinic with optional vitals fields
// This extends the base schema but makes all vitals fields optional
export const ipdRegistrationClinicSchema = registrationPersonalDetailsSchema.shape({
  contactNumber: Yup.string()
    .trim()
    .required("Contact Number is required")
    .min(10, "Contact Number must be at least 10 digits")
    .matches(/^\d+$/, "Contact Number must contain only digits"),
  
  whatsappNo: Yup.string()
    .trim()
    .optional()
    .test("len-or-empty", "WhatsApp Number must be 10 digits", (value) => !value || value.length === 10)
    .matches(/^\d*$/, "WhatsApp Number must contain only digits"),
  
  aadharCardNumber: Yup.string()
    .trim()
    .optional()
    .test("len-or-empty", "Aadhar Card Number must be exactly 12 digits", (value) => !value || value.length === 12)
    .matches(/^\d*$/, "Aadhar Card Number must contain only digits"),
  
  patientNameSelect: Yup.string()
    .trim()
    .required("Title is required"),
  
  patientName: Yup.string()
    .trim()
    .required("Patient Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
  
  gender: Yup.string()
    .trim()
    .required("Gender is required"),
  
  age: Yup.string()
    .trim()
    .required("Age is required")
    .matches(/^\d+$/, "Age must contain only digits")
    .test("age-range", "Age must be between 1 and 120", (value) => {
      if (!value) return false;
      const numValue = parseInt(value, 10);
      return numValue >= 1 && numValue <= 120;
    }),
  
  maritalStatus: Yup.string()
    .trim()
    .required("Marital Status is required"),
  
  fathersHusbandsNameSelect: Yup.string()
    .trim()
    .required("Guardian Title is required"),
  
  fathersHusbandsName: Yup.string()
    .trim()
    .required("Father's/Husband's Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
  
  religion: Yup.string()
    .trim()
    .required("Religion is required"),
  
  specificReligion: Yup.string()
    .trim()
    .optional(),
  
  occupation: Yup.string()
    .trim()
    .optional()
    .max(100, "Occupation cannot exceed 100 characters")
    .matches(/^[a-zA-Z\s]*$/, "Only letters and spaces are allowed"),
  
  emailAddress: Yup.string()
    .trim()
    .max(100, "Email Address cannot exceed 100 characters")
    .when("country", {
      is: "6",
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
  
  jsHealthCardNo: jsHealthCardNoFieldSchema(DEFAULT_JS_HEALTH_CARD_DIGIT_LENGTH),

  pinCode: Yup.string()
    .trim()
    .when("country", {
      is: (value: string) => value && value.trim() !== "",
      then: (schema) =>
        schema
          .required("Pin Code is required")
          .matches(/^\d+$/, "Pincode must contain only digits"),
      otherwise: (schema) => schema.optional(),
    }),
  
  country: Yup.string()
    .trim()
    .required("Country is required"),
  
  state: Yup.string()
    .trim()
    .when("country", {
      is: "6",
      then: (schema) => schema.required("State is required"),
      otherwise: (schema) =>
        schema.when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
          then: (s) =>
            s
              .required("State is required")
              .max(100, "State cannot exceed 100 characters")
              .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
          otherwise: (s) => s.optional(),
        }),
    }),
  
  city: Yup.string()
    .trim()
    .when("country", {
      is: "6",
      then: (schema) =>
        schema.when("state", {
          is: (value: string) => Boolean(value && value.trim() !== ""),
          then: (s) => s.required("District is required"),
          otherwise: (s) => s.optional(),
        }),
      otherwise: (schema) =>
        schema.when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
          then: (s) =>
            s
              .required("City is required")
              .max(100, "City cannot exceed 100 characters")
              .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
          otherwise: (s) => s.optional(),
        }),
    }),
  
  address: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema.required("Address is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  addressLine1: Yup.string()
    .trim()
    .when("country", {
      is: (val: string) => val && val !== "6",
      then: (schema) => schema.required("Address Line 1 is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  addressLine2: Yup.string()
    .trim()
    .optional(),
  
  patientType: Yup.string()
    .trim()
    .required("Patient Type is required"),
  
  patientSubType: Yup.string()
    .trim()
    .optional(),
  
  panelId: Yup.string()
    .trim()
    .optional(),
  
  benificiaryId: Yup.string()
    .trim()
    .optional(),
  
  insuranceCompany: Yup.string()
    .trim()
    .optional(),
  
  ayushCovered: Yup.string()
    .trim()
    .optional(),
  
  referral: Yup.string()
    .trim()
    .optional(),
  
  source: Yup.string()
    .trim()
    .optional(),
  
  tvSpecificField: Yup.string()
    .trim()
    .optional(),
  
  newspaperSpecificField: Yup.string()
    .trim()
    .optional(),
  
  socialMediaSpecificField: Yup.string()
    .trim()
    .optional(),
  
  doctorSpecificField: Yup.string()
    .trim()
    .optional(),
  
  referralName: Yup.string()
    .trim()
    .optional(),
  
  referralMobile: Yup.string()
    .trim()
    .optional()
    .matches(/^\d*$/, "Referral Mobile must contain only digits"),
  
  doctor: Yup.string()
    .trim()
    .optional(),
  
  appointmentDate: Yup.string()
    .trim()
    .optional(),
  
  timeSlot: Yup.string()
    .trim()
    .optional(),
  
  consultationCharges: Yup.string()
    .trim()
    .optional(),
  
  paymentMode: Yup.string()
    .trim()
    .optional(),
  
  transactionId: Yup.string()
    .trim()
    .optional(),
  
  gstBilling: Yup.boolean()
    .optional(),
  
  gstNumber: Yup.string()
    .trim()
    .optional(),
  
  companyName: Yup.string()
    .trim()
    .optional(),
  
  billingAddress: Yup.string()
    .trim()
    .optional(),
  
  billingState: Yup.string()
    .trim()
    .optional(),
  
  billingCity: Yup.string()
    .trim()
    .optional(),
  
  billingPincode: Yup.string()
    .trim()
    .optional(),
  
  // Vitals Information - ALL OPTIONAL for IPD Registration Clinic
  heightFeet: Yup.string()
    .trim()
    .optional()
    .matches(/^\d*$/, "Height in Feet must contain only digits")
    .test("height-feet-range", "Height in Feet must be between 1 and 10", (value) => {
      if (!value || value.trim() === "") return true; // Optional
      const numValue = parseInt(value, 10);
      return numValue >= 1 && numValue <= 10;
    }),
  
  heightInch: Yup.string()
    .trim()
    .optional()
    .matches(/^\d*$/, "Height in Inch must contain only digits")
    .test("height-inch-range", "Height in Inch must be between 0 and 11", (value) => {
      if (!value || value.trim() === "") return true; // Optional
      const numValue = parseInt(value, 10);
      return numValue >= 0 && numValue <= 11;
    }),
  
  weight: Yup.string()
    .trim()
    .optional()
    .matches(/^\d*(\.\d{1,2})?$/, "Weight must be a valid number")
    .test("weight-range", "Weight must be between 1 and 500 kg", (value) => {
      if (!value || value.trim() === "") return true; // Optional
      const numValue = parseFloat(value);
      return numValue >= 1 && numValue <= 500;
    }),
  
  bloodGroup: Yup.string()
    .trim()
    .optional()
    .oneOf(["a-positive", "a-negative", "b-positive", "b-negative", "ab-positive", "ab-negative", "o-positive", "o-negative", ""], "Please select a valid blood group"),
  
  allergies: Yup.string()
    .trim()
    .optional()
    .oneOf(["yes", "no", "Yes", "No", ""], "Please select Yes or No"),

  /** Free-text details captured when Allergies = "Yes" (dialog input) */
  allergiesDetails: Yup.string().trim().optional(),

  surgeries: Yup.string()
    .trim()
    .optional()
    .oneOf(["yes", "no", "Yes", "No", ""], "Please select Yes or No"),

  /** Free-text details captured when Surgeries = "Yes" (dialog input) */
  surgeriesDetails: Yup.string().trim().optional(),
  
  dietType: Yup.string()
    .trim()
    .optional(),
  
  bloodPressure: Yup.string()
    .trim()
    .optional()
    .matches(/^(\d+\/\d+)?$/, "Blood Pressure must be in format Systolic/Diastolic (e.g., 120/80)"),
  
  sugarLevel: Yup.string()
    .trim()
    .optional()
    .matches(/^\d*(\.\d{1,2})?$/, "Sugar Level must be a valid number")
    .test("sugar-range", "Sugar Level must be between 50 and 500 mg/dL", (value) => {
      if (!value || value.trim() === "") return true; // Optional
      const numValue = parseFloat(value);
      return numValue >= 50 && numValue <= 500;
    }),
  
  temperature: Yup.string()
    .trim()
    .optional()
    .matches(/^\d*(\.\d{1,2})?$/, "Temperature must be a valid number")
    .test("temperature-range", "Temperature must be between 90 and 110 °F", (value) => {
      if (!value || value.trim() === "") return true; // Optional
      const numValue = parseFloat(value);
      return numValue >= 90 && numValue <= 110;
    }),
  
  pulse: Yup.string()
    .trim()
    .optional()
    .matches(/^\d*$/, "Pulse must contain only digits")
    .test("pulse-range", "Pulse must be between 40 and 200 bpm", (value) => {
      if (!value || value.trim() === "") return true; // Optional
      const numValue = parseInt(value, 10);
      return numValue >= 40 && numValue <= 200;
    }),
  
  spo2: Yup.string()
    .trim()
    .optional()
    .matches(/^\d*(\.\d{1,2})?$/, "SPO2 must be a valid number")
    .test("spo2-range", "SPO2 must be between 70 and 100%", (value) => {
      if (!value || value.trim() === "") return true; // Optional
      const numValue = parseFloat(value);
      return numValue >= 70 && numValue <= 100;
    }),
  
  // Medical Information
  diabetes: Yup.string()
    .trim()
    .optional(),
  
  diabetesRemarks: Yup.string()
    .trim()
    .optional(),
  
  htn: Yup.string()
    .trim()
    .optional(),
  
  htnRemarks: Yup.string()
    .trim()
    .optional(),
  
  coronaryArteryDisease: Yup.string()
    .trim()
    .optional(),
  
  coronaryArteryDiseaseRemarks: Yup.string()
    .trim()
    .optional(),
  
  thyroid: Yup.string()
    .trim()
    .optional(),
  
  thyroidRemarks: Yup.string()
    .trim()
    .optional(),
  
  menstrual: Yup.string()
    .trim()
    .optional(),
  
  menstrualRemarks: Yup.string()
    .trim()
    .optional(),
  
  alcohol: Yup.boolean()
    .optional(),
  
  smoking: Yup.boolean()
    .optional(),
  
  tobacco: Yup.boolean()
    .optional(),
  
  drugs: Yup.boolean()
    .optional(),
  
  addictionOther: Yup.boolean()
    .optional(),
  
  addictionSpecify: Yup.string()
    .trim()
    .optional(),
  
  diagnosis: Yup.string()
    .trim()
    .optional(),
  
  subDiagnosis: Yup.string()
    .trim()
    .optional(),
  
  symptoms: Yup.string()
    .trim()
    .optional(),
});

