import * as Yup from "yup";
import { DEPARTMENT_ALLOWED_VALUES, DOCTOR_NAME_TITLE_VALUES } from "@/lib/doctor/doctorStatic";
import { isValidEmailAddress } from "@/lib/utils/emailValidation";

const MAX_LEN = 100;

/** Same core rules as registration personal details: contact, name, email, address + max 100 on text fields. */
export const doctorFormSchema = Yup.object({
  branchId: Yup.string().trim().required("Branch is required"),
  profileImageUrl: Yup.string().nullable().optional(),
  attachmentUrl: Yup.string().nullable().optional(),
  nameTitle: Yup.string()
    .trim()
    .required("Title is required")
    .oneOf([...DOCTOR_NAME_TITLE_VALUES], "Select a valid title"),
  name: Yup.string()
    .trim()
    .required("Name is required")
    .max(MAX_LEN, `Name cannot exceed ${MAX_LEN} characters`)
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
    .max(3, "Year of Experience can be at most 3 digits")
    .matches(/^\d*$/, "Only numbers are allowed"),
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
    .max(MAX_LEN, `Employee Id cannot exceed ${MAX_LEN} characters`),
  status: Yup.mixed<"Active" | "Inactive">().oneOf(["Active", "Inactive"]).required(),
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
      "account-min-length",
      "Account Number must be at least 8 digits",
      (value) => {
        const v = (value ?? "").trim();
        if (v.length === 0) return true;
        return v.length >= 8;
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
        qualification: Yup.string().trim().max(MAX_LEN).optional(),
        college: Yup.string()
          .trim()
          .max(MAX_LEN, `College cannot exceed ${MAX_LEN} characters`)
          .matches(
            /^[a-zA-Z\s,.()]*$/,
            "Only letters, spaces, commas, parentheses, and periods are allowed",
          )
          .optional(),
        completionYears: Yup.string()
          .trim()
          .optional()
          .max(4, "Completion year can be at most 4 digits")
          .matches(/^\d*$/, "Only numbers are allowed"),
      }),
    )
    .required(),
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
          .max(4, "Year can be at most 4 digits")
          .matches(/^\d*$/, "Only numbers are allowed"),
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
