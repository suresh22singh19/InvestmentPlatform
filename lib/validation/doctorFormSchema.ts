import * as Yup from "yup";
import { DEPARTMENT_ALLOWED_VALUES, DOCTOR_NAME_TITLE_VALUES } from "@/lib/doctor/doctorStatic";
import { isValidEmailAddress } from "@/lib/utils/emailValidation";

const MAX_LEN = 100;

/** Same core rules as registration personal details: contact, name, email, address + max 100 on text fields. */
export const doctorFormSchema = Yup.object({
  branchId: Yup.string().trim().required("Branch is required"),
  assignableRoleId: Yup.string().trim().required("Role is required"),
  profileImageUrl: Yup.string().nullable().optional(),
  attachmentUrl: Yup.string().nullable().optional(),
  nameTitle: Yup.string()
    .trim()
    .required("Title is required")
    .oneOf([...DOCTOR_NAME_TITLE_VALUES], "Select a valid title"),
  name: Yup.string()
    .trim()
    .required("Name is required")
    .max(96, "Name cannot exceed 96 characters")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
  email: Yup.string()
    .trim()
    .required("Email/Username is required")
    .max(MAX_LEN, `Email cannot exceed ${MAX_LEN} characters`)
    .test("email-format", "Please enter a valid email address", (value) =>
      Boolean(value && isValidEmailAddress(value)),
    ),
  nabhRegistered: Yup.boolean().required(),
  contact: Yup.string()
    .trim()
    .required("Contact Number is required")
    .min(10, "Contact Number must be at least 10 digits")
    .max(10, "Contact Number must be exactly 10 digits")
    .matches(/^\d+$/, "Contact Number must contain only digits"),
  altContact: Yup.string()
    .trim()
    .optional()
    .test(
      "alt-contact",
      "Alt Contact must be exactly 10 digits",
      (value) => !value || (value.length === 10 && /^\d+$/.test(value)),
    ),
  yearsExperience: Yup.string()
    .trim()
    .optional()
    .test(
      "valid-years-experience",
      "Year of Experience must be between 0 and 100",
      (value) => {
        if (!value || value.trim() === "") return true;
        if (!/^\d+$/.test(value)) return false;
        const num = parseInt(value, 10);
        return num >= 0 && num <= 100;
      },
    ),
  department: Yup.string()
    .trim()
    .required("Department is required")
    .max(MAX_LEN, `Department cannot exceed ${MAX_LEN} characters`)
    .test("department", "Select a valid department", (value) => {
      const v = (value ?? "").trim();
      if (!v) return false;
      if (/^\d+$/.test(v)) return true;
      return DEPARTMENT_ALLOWED_VALUES.includes(v);
    }),
  opdFee: Yup.string().trim().max(MAX_LEN).optional(),
  loginType: Yup.string()
    .trim()
    .oneOf(["no-auth", "ip", "otp", "ip-otp"], "Select a valid login type")
    .optional(),
  doctorType: Yup.string().trim().max(MAX_LEN).optional(),
  selectTeam: Yup.string().trim().max(MAX_LEN).optional(),
  employeeId: Yup.string()
    .trim()
    .required("Employee Id is required")
    .max(9, "Employee Id cannot exceed 9 characters")
    .matches(
      /^JS[-_]?[0-9]{1,6}$/,
      "Invalid format (e.g. JS-01, JS_01, JS01, JS-9999)"
    )
    .test(
      "not-all-zeros",
      "Employee Id cannot be all zeros",
      (val) => !val || !/^JS[-_]?0{6}$/.test(val.trim())
    ),
  status: Yup.mixed<"Active" | "Inactive">().oneOf(["Active", "Inactive"]).required(),
  aiVoiceActivated: Yup.mixed<"Active" | "Inactive">().oneOf(["Active", "Inactive"]).required("Voice AI is required"),
  changeVoiceAiPassword: Yup.string().oneOf(["Yes", "No"]).optional(),
  aiVoicePassword: Yup.string()
    .trim()
    .when(["aiVoiceActivated", "changeVoiceAiPassword"], ([aiVoiceActivated, changeVoiceAiPassword], schema) => {
      if (aiVoiceActivated === "Active" && changeVoiceAiPassword !== "No") {
        return schema
          .required("Password for Voice AI is required")
          .min(6, "Password must be at least 6 characters");
      }
      return schema.optional();
    }),
  voiceAiConfirmPassword: Yup.string()
    .trim()
    .when(["aiVoiceActivated", "changeVoiceAiPassword"], ([aiVoiceActivated, changeVoiceAiPassword], schema) => {
      if (aiVoiceActivated === "Active" && changeVoiceAiPassword !== "No") {
        return schema
          .required("Confirm Password for Voice AI is required")
          .oneOf([Yup.ref("aiVoicePassword")], "Passwords must match");
      }
      return schema.optional();
    }),
  address: Yup.string()
    .trim()
    .required("Address is required")
    .max(MAX_LEN, `Address cannot exceed ${MAX_LEN} characters`)
    .matches(/^[a-zA-Z0-9\s]+$/, "Only letters, numbers and spaces are allowed"),
  city: Yup.string()
    .trim()
    .max(MAX_LEN, `City cannot exceed ${MAX_LEN} characters`)
    .matches(/^[a-zA-Z\s]*$/, "Only letters and spaces are allowed")
    .optional(),
  bankName: Yup.string()
    .trim()
    .max(MAX_LEN, `Bank name cannot exceed ${MAX_LEN} characters`)
    .matches(/^[a-zA-Z\s]*$/, "Only letters and spaces are allowed")
    .optional(),
  accountNumber: Yup.string()
    .trim()
    .optional()
    .max(20, "Account Number cannot exceed 20 digits")
    .matches(/^\d*$/, "Account Number must contain only digits")
    .test(
      "not-single-zero",
      "Account Number cannot be a single zero",
      (value) => {
        const v = (value ?? "").trim();
        return v !== "0";
      },
    )
    .test(
      "account-min-length",
      "Account Number must be at least 8 digits",
      (value) => {
        const v = (value ?? "").trim();
        if (v.length === 0) return true;
        return v.length >= 8;
      },
    )
    .test(
      "not-all-zeros",
      "Account Number cannot be all zeros",
      (value) => {
        const v = (value ?? "").trim();
        if (!v) return true;
        return !/^0+$/.test(v);
      },
    ),
  ifscCode: Yup.string()
    .trim()
    .optional()
    .max(11, "IFSC Code cannot exceed 11 characters")
    .test("ifsc-format", "Enter a valid IFSC code", (value) => {
      if (!value || value.trim() === "") return true;
      return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value.trim());
    }),
  education: Yup.array()
    .of(
      Yup.object({
        id: Yup.string().required(),
        qualification: Yup.string()
          .trim()
          .required("Qualification is required")
          .max(MAX_LEN),
        college: Yup.string()
          .trim()
          .required("College is required")
          .max(MAX_LEN, `College cannot exceed ${MAX_LEN} characters`)
          .matches(
            /^[a-zA-Z\s,.()]+$/,
            "Only letters, spaces, commas, parentheses, and periods are allowed",
          ),
        completionYears: Yup.string()
          .trim()
          .required("Completion Year is required")
          .test(
            "valid-completion-year",
            `Completion year must be between 1920 and ${new Date().getFullYear()}`,
            (value) => {
              if (!value || value.trim() === "") return false;
              if (!/^\d{4}$/.test(value.trim())) return false;
              const yr = parseInt(value.trim(), 10);
              return yr >= 1920 && yr <= new Date().getFullYear();
            },
          ),
      }),
    )
    .min(1, "At least one education detail is required")
    .required("At least one education detail is required"),
  specializations: Yup.array()
    .of(
      Yup.object({
        id: Yup.string().required(),
        specialization: Yup.string().trim().max(MAX_LEN).optional(),
      }),
    )
    .required(),
  registrations: Yup.array()
    .of(
      Yup.object({
        id: Yup.string().required(),
        councilRegistrationNumber: Yup.string()
          .trim()
          .max(MAX_LEN, `Council registration number cannot exceed ${MAX_LEN} characters`)
          .matches(
            /^[a-zA-Z0-9/\-_|\\]*$/,
            'Only letters, numbers, and / - _ | \\ are allowed',
          )
          .optional(),
        councilName: Yup.string()
          .trim()
          .max(MAX_LEN, `Council name cannot exceed ${MAX_LEN} characters`)
          .matches(/^[a-zA-Z\s]*$/, "Only letters and spaces are allowed")
          .optional(),
        year: Yup.string()
          .trim()
          .optional()
          .test(
            "valid-reg-year",
            `Year must be between 1920 and ${new Date().getFullYear()}`,
            (value) => {
              if (!value || value.trim() === "") return true;
              if (!/^\d{4}$/.test(value)) return false;
              const yr = parseInt(value, 10);
              return yr >= 1920 && yr <= new Date().getFullYear();
            },
          ),
      }),
    )
    .required(),
});

export function mapDoctorFormYupErrors(err: Yup.ValidationError): Record<string, string> {
  const out: Record<string, string> = {};
  if (err.inner?.length) {
    err.inner.forEach((e) => {
      if (e.path) {
        out[e.path] = e.message;
      }
    });
  } else if (err.path) {
    out[err.path] = err.message;
  }
  return out;
}
