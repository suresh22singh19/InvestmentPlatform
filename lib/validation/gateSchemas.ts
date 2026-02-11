import * as Yup from "yup";

// Visitor validation schema (id is optional for validation, used for UI tracking)
// This schema is context-aware and will be enhanced in gateNewPatientSchema based on nationality
export const visitorSchema = Yup.object().shape({
  id: Yup.string().optional(), // ID is for UI tracking, not validated
  nameSelect: Yup.string()
    .trim()
    .required("Title is required"),
  name: Yup.string().trim().required("Visitor Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
  country: Yup.string()
    .trim()
    .required("Visitor Nationality is required"),
  aadharCardNo: Yup.string()
    .trim()
    .nullable()
    .when("country", {
      is: "Indian",
      then: (schema) => schema
        .required("Visitor Aadhar Card No. is required")
        .length(12, "Visitor Aadhar Card No. must be exactly 12 digits")
        .matches(/^\d+$/, "Visitor Aadhar Card No. must contain only digits"),
      otherwise: (schema) => schema
        .test("skip-if-not-indian", "", function(value) {
          // Skip all validation if country is not Indian
          const country = this.parent?.country;
          return country !== "Indian";
        }),
    }),
  passportNumber: Yup.string()
    .trim()
    .nullable()
    .when("country", {
      is: "Foreigner",
      then: (schema) => schema
        .required("Visitor Passport Number is required")
        .min(6, "Visitor Passport Number must be at least 6 characters")
        .max(9, "Visitor Passport Number must be at most 9 characters")
        .matches(
          /^[A-Z0-9]{6,9}$/i,
          "Visitor Passport Number must contain only letters (A-Z) and numbers (0-9), 6-9 characters"
        ),
      otherwise: (schema) => schema
        .test("skip-if-not-foreigner", "", function(value) {
          // Skip all validation if country is not Foreigner
          const country = this.parent?.country;
          return country !== "Foreigner";
        }),
    }),
  nationalId: Yup.string()
    .trim()
    .nullable()
    .when("country", {
      is: "Nepal",
      then: (schema) => schema
        .required("Visitor National Id is required")
        .min(8, "Visitor National Id must be at least 8 digits")
        .max(12, "Visitor National Id must be at most 12 digits")
        .matches(/^\d+$/, "Visitor National Id must contain only digits"),
      otherwise: (schema) => schema
        .test("skip-if-not-nepal", "", function(value) {
          // Skip all validation if country is not Nepal
          const country = this.parent?.country;
          return country !== "Nepal";
        }),
    }),
});

// New Patient Entry validation schema
export const newPatientEntrySchema = Yup.object().shape({
  // Personal Details
  contactNumber: Yup.string()
    .trim()
    .required("Contact Number is required")
    .min(10, "Contact Number must be at least 10 digits")
    .matches(/^\d+$/, "Contact Number must contain only digits"),
  
  aadharCardNo: Yup.string()
    .trim()
    .when("indianForeignerNepal", {
      is: "Indian",
      then: (schema) => schema
        .required("Aadhar Card No. is required")
        .length(12, "Aadhar Card No. must be exactly 12 digits")
        .matches(/^\d+$/, "Aadhar Card No. must contain only digits"),
      otherwise: (schema) => schema.optional(),
    }),
  
  passportNumber: Yup.string()
    .trim()
    .when("indianForeignerNepal", {
      is: "Foreigner",
      then: (schema) => schema
        .required("Passport Number is required")
        .min(6, "Passport Number must be at least 6 characters")
        .max(9, "Passport Number must be at most 9 characters")
        .matches(
          /^[A-Z0-9]{6,9}$/i,
          "Passport Number must contain only letters (A-Z) and numbers (0-9), 6-9 characters"
        ),
      otherwise: (schema) => schema.optional(),
    }),
  
  nationalId: Yup.string()
    .trim()
    .when("indianForeignerNepal", {
      is: "Nepal",
      then: (schema) => schema
        .required("National Id is required")
        .min(8, "National Id must be at least 8 digits")
        .max(12, "National Id must be at most 12 digits")
        .matches(/^\d+$/, "National Id must contain only digits"),
      otherwise: (schema) => schema.optional(),
    }),
   
  patientNameSelect: Yup.string()
    .trim()
    .required("Title is required"),
  
  patientName: Yup.string()
    .trim()
    .required("Patient Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
  
  age: Yup.string()
    .trim()
    .required("Age is required")
    .matches(/^\d+$/, "Age must contain only digits")
    .test("age-range", "Age must be between 1 and 999", (value) => {
      if (!value) return false;
      const numValue = parseInt(value, 10);
      return numValue >= 1 && numValue <= 999;
    }),
  
  indianForeignerNepal: Yup.string()
    .trim()
    .required("Nationality is required")
    .min(1, "Nationality is required"),
  
  patientType: Yup.string()
    .required("Patient Type is required"),
  
  panel: Yup.string()
    .trim()
    .when("patientType", {
      is: "Panel",
      then: (schema) => schema.required("Panel is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  emailAddress: Yup.string()
    .email("Email Address is invalid")
    .optional(),
  
  maritalStatus: Yup.string()
    .optional(),
  
  occupation: Yup.string()
    .optional(),
  
  // Address Details
  pinCode: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema
        .required("Pin Code is required")
        .min(3, "Pin Code must be at least 3 digits")
        .matches(/^\d+$/, "Pin Code must contain only digits"),
      otherwise: (schema) => schema
        .when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
          then: (s) => s
            .required("ZIP/Postal Code is required")
            .min(4, "ZIP/Postal Code must be 4-10 characters")
            .max(10, "ZIP/Postal Code must be 4-10 characters")
            .matches(/^[a-zA-Z0-9]+$/, "ZIP/Postal Code must contain only letters and numbers"),
          otherwise: (s) => s.optional(),
        }),
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
      is: (val: string) => Boolean(val && val !== "6"), // Selected and not India
      then: (schema) => schema.required("Address Line 1 is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  addressLine2: Yup.string()
    .trim()
    .optional(),
  
  // Photos (optional)
  vehiclePhoto: Yup.mixed()
    .nullable()
    .optional(),
  
  aadharPhoto: Yup.mixed()
    .nullable()
    .optional(),
});

// Visitors array validation with conditional validation based on nationality
export const visitorsSchema = Yup.array().of(visitorSchema);

// Enhanced visitor schema that validates based on nationality
const getVisitorSchemaWithNationality = (nationality: string) => {
  return Yup.object().shape({
    id: Yup.string().optional(),
    nameSelect: Yup.string()
      .trim()
      .required("Title is required"),
    name: Yup.string().trim().required("Visitor Name is required")
      .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),
    aadharCardNo: Yup.string()
      .trim()
      .when([], {
        is: () => nationality === "Indian",
        then: (schema) => schema
          .required("Visitor Aadhar Card No. is required")
          .length(12, "Visitor Aadhar Card No. must be exactly 12 digits")
          .matches(/^\d+$/, "Visitor Aadhar Card No. must contain only digits"),
        otherwise: (schema) => schema.optional(),
      }),
    passportNumber: Yup.string()
      .trim()
      .when([], {
        is: () => nationality === "Foreigner",
        then: (schema) => schema
          .required("Visitor Passport Number is required")
          .min(6, "Visitor Passport Number must be at least 6 characters")
          .max(9, "Visitor Passport Number must be at most 9 characters")
          .matches(
            /^[A-Z0-9]{6,9}$/i,
            "Visitor Passport Number must contain only letters (A-Z) and numbers (0-9), 6-9 characters"
          ),
        otherwise: (schema) => schema.optional(),
      }),
    nationalId: Yup.string()
      .trim()
      .when([], {
        is: () => nationality === "Nepal",
        then: (schema) => schema
          .required("Visitor National Id is required")
          .min(8, "Visitor National Id must be at least 8 digits")
          .max(12, "Visitor National Id must be at most 12 digits")
          .matches(/^\d+$/, "Visitor National Id must contain only digits"),
        otherwise: (schema) => schema.optional(),
      }),
  });
};

// Combined schema for form validation
export const gateNewPatientSchema = newPatientEntrySchema.shape({
  visitors: visitorsSchema,
});

// Patient Visitor (For OPD/Day Care) validation schema
export const patientVisitorItemSchema = Yup.object().shape({
  id: Yup.string().optional(),

  mobileNumber: Yup.string()
    .trim()
    .required("Mobile Number is required")
    .min(10, "Mobile Number must be at least 10 digits")
    .matches(/^\d+$/, "Mobile Number must contain only digits")
    .test("unique-mobile", "Mobile Number must be unique across all visitors", function (value) {
      if (!value) return true;
      const trimmedValue = value.trim();
      if (!trimmedValue) return true;
      
      // Access parent array (visitors) from the form context
      const allVisitors = this.parent?.parent?.visitors || [];
      if (!Array.isArray(allVisitors) || allVisitors.length <= 1) return true;
      
      // Count occurrences of this mobile number
      const duplicates = allVisitors
        .map((visitor: any, index: number) => ({
          mobile: visitor.mobileNumber?.trim(),
          index,
        }))
        .filter((item) => item.mobile === trimmedValue);
      
      // If more than one visitor has this mobile number, it's a duplicate
      return duplicates.length <= 1;
    }),

  aadharCardNumber: Yup.string()
    .trim()
    .nullable()
    .notRequired()
    .test(
      "len-or-empty",
      "Aadhar Card Number must be exactly 12 digits",
      (value) => !value || value.length === 12
    )
    .test(
      "digits-or-empty",
      "Aadhar Card Number must contain only digits",
      (value) => !value || /^\d+$/.test(value)
    )
    .test("unique-aadhar", "Aadhar Card Number must be unique across all visitors", function (value) {
      if (!value) return true;
      const trimmedValue = value.trim();
      if (!trimmedValue) return true;
      
      // Access parent array (visitors) from the form context
      const allVisitors = this.parent?.parent?.visitors || [];
      if (!Array.isArray(allVisitors) || allVisitors.length <= 1) return true;
      
      // Count occurrences of this Aadhar number
      const duplicates = allVisitors
        .map((visitor: any, index: number) => ({
          aadhar: visitor.aadharCardNumber?.trim(),
          index,
        }))
        .filter((item) => item.aadhar === trimmedValue);
      
      // If more than one visitor has this Aadhar number, it's a duplicate
      return duplicates.length <= 1;
    }),

  visitorNameSelect: Yup.string()
    .trim()
    .required("Title is required"),

  visitorName: Yup.string()
    .trim()
    .required("Visitor Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),

  patientNameSelect: Yup.string()
    .trim()
    .required("Patient Title is required"),

  patientName: Yup.string()
    .trim()
    .required("Patient Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),

  purpose: Yup.string()
    .trim()
    .required("Purpose is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),

  patientUHID: Yup.string()
    .trim()
    .optional()
    .test(
      "min-length-or-empty",
      "Patient UHID must be at least 10 characters",
      (value) => !value || value.length >= 10
    )
    .test(
      "alphanumeric-or-empty",
      "Patient UHID must contain only letters and numbers",
      (value) => !value || /^[a-zA-Z0-9]*$/.test(value)
    ),

  patientMobileNumber: Yup.string()
    .trim()
    .optional()
    .test(
      "len-or-empty",
      "Patient Mobile Number must be exactly 10 digits",
      (value) => !value || value.length === 10
    )
    .test(
      "digits-or-empty",
      "Patient Mobile Number must contain only digits",
      (value) => !value || /^\d+$/.test(value)
    ),

  // Address
  pinCode: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema
        .required("Pin Code is required")
        .min(3, "Pin Code must be at least 3 digits")
        .matches(/^\d+$/, "Pin Code must contain only digits"),
      otherwise: (schema) => schema
        .when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
          then: (s) => s
            .required("ZIP/Postal Code is required")
            .min(4, "ZIP/Postal Code must be 4-10 characters")
            .max(10, "ZIP/Postal Code must be 4-10 characters")
            .matches(/^[a-zA-Z0-9]+$/, "ZIP/Postal Code must contain only letters and numbers"),
          otherwise: (s) => s.optional(),
        }),
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
      is: (val: string) => Boolean(val && val !== "6"),
      then: (schema) => schema.required("Address Line 1 is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  addressLine2: Yup.string()
    .trim()
    .optional(),

  aadharPhoto: Yup.mixed()
    .nullable()
    .optional(),
});

export const gatePatientVisitorSchema = Yup.object().shape({
  visitors: Yup.array()
    .of(patientVisitorItemSchema)
    .min(1, "At least one visitor is required"),
});

// IPD Visitor validation schema (extends patientVisitorItemSchema with additional fields)
export const ipdVisitorItemSchema = patientVisitorItemSchema.shape({
  searchType: Yup.string().trim().optional(),
  phoneNumber: Yup.string()
    .trim()
    .when("searchType", {
      is: "Phone",
      then: (schema) =>
        schema
          .required("Phone Number is required")
          .min(10, "Phone Number must be at least 10 digits")
          .matches(/^\d+$/, "Phone Number must contain only digits"),
      otherwise: (schema) => schema.optional(),
    }),
  uhid: Yup.string()
    .trim()
    .when("searchType", {
      is: "UHID",
      then: (schema) => schema
        .required("UHID is required")
        .min(10, "UHID must be at least 10 characters")
        .matches(/^[a-zA-Z0-9]*$/, "UHID must contain only letters and numbers"),
      otherwise: (schema) => schema.optional(),
    }),
  building: Yup.string().trim().optional(),
  roomNumber: Yup.string().trim().optional(),
  bedNumber: Yup.string().trim().optional(),
});

export const gateIPDVisitorSchema = Yup.object().shape({
  visitors: Yup.array()
    .of(ipdVisitorItemSchema)
    .min(1, "At least one visitor is required"),
});

// Other Visitor validation schema
export const otherVisitorItemSchema = Yup.object().shape({
  id: Yup.string().optional(),

  phoneNumber: Yup.string()
    .trim()
    .required("Phone Number is required")
    .min(10, "Phone Number must be at least 10 digits")
    .matches(/^\d+$/, "Phone Number must contain only digits"),

  aadharCardNumber: Yup.string()
    .trim()
    .nullable()
    .notRequired()
    .test(
      "len-or-empty",
      "Aadhar Card Number must be exactly 12 digits",
      (value) => !value || value.length === 12
    )
    .test(
      "digits-or-empty",
      "Aadhar Card Number must contain only digits",
      (value) => !value || /^\d+$/.test(value)
    ),

  visitorNameSelect: Yup.string()
    .trim()
    .required("Title is required"),

  visitorName: Yup.string()
    .trim()
    .required("Visitor Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),

  whomToMeet: Yup.string()
    .trim()
    .optional()
    .matches(/^[a-zA-Z\s]*$/, "Only letters and spaces are allowed"),

  typeOfVisit: Yup.string()
    .trim()
    .optional(),

  companyName: Yup.string()
    .trim()
    .optional(),

  // Address
  pinCode: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema
        .required("Pin Code is required")
        .min(3, "Pin Code must be at least 3 digits")
        .matches(/^\d+$/, "Pin Code must contain only digits"),
      otherwise: (schema) => schema
        .when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
          then: (s) => s
            .required("ZIP/Postal Code is required")
            .min(4, "ZIP/Postal Code must be 4-10 characters")
            .max(10, "ZIP/Postal Code must be 4-10 characters")
            .matches(/^[a-zA-Z0-9]+$/, "ZIP/Postal Code must contain only letters and numbers"),
          otherwise: (s) => s.optional(),
        }),
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
      is: (val: string) => Boolean(val && val !== "6"),
      then: (schema) => schema.required("Address Line 1 is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  addressLine2: Yup.string()
    .trim()
    .optional(),

  aadharPhoto: Yup.mixed()
    .nullable()
    .optional(),
});

export const gateOtherVisitorSchema = Yup.object().shape({
  visitors: Yup.array()
    .of(otherVisitorItemSchema)
    .min(1, "At least one visitor is required"),
});

// Patient Medicine Type validation schema
export const patientMedicineTypeItemSchema = Yup.object().shape({
  id: Yup.string().optional(),

  // Patient Details
  mobileNumber: Yup.string()
    .trim()
    .required("Mobile Number is required")
    .min(10, "Mobile Number must be at least 10 digits")
    .matches(/^\d+$/, "Mobile Number must contain only digits"),

  title: Yup.string()
    .trim()
    .required("Title is required"),

  patientName: Yup.string()
    .trim()
    .required("Patient Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),

  uhid: Yup.string()
    .trim()
    .test(
      "uhid-length",
      "UHID must be at least 10 characters",
      (value) => !value || value.trim().length === 0 || value.length >= 10
    )
    .test(
      "uhid-format",
      "UHID must contain only letters and numbers",
      (value) => !value || value.trim().length === 0 || /^[a-zA-Z0-9]*$/.test(value)
    )
    .optional(),

  // Address Details
  pinCode: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema
        .required("Pin Code is required")
        .min(3, "Pin Code must be at least 3 digits")
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
    .required("Address is required"),

  // Visitors - conditional validation based on nationality
  visitors: Yup.array()
    .of(visitorSchema)
    .min(1, "At least one visitor is required")
    .test("visitor-id-validation", "Visitor ID field validation failed", function (visitors) {
      if (!visitors || visitors.length === 0) return true;
      
      const nationality = this.parent.indianForeignerNepal;
      if (!nationality) return true;
      
      for (let i = 0; i < visitors.length; i++) {
        const visitor = visitors[i];
        
        if (nationality === "Indian") {
          if (!visitor.aadharCardNo || visitor.aadharCardNo.trim() === "") {
            return this.createError({
              path: `visitors[${i}].aadharCardNo`,
              message: "Visitor Aadhar Card No. is required",
            });
          }
          if (visitor.aadharCardNo.length !== 12) {
            return this.createError({
              path: `visitors[${i}].aadharCardNo`,
              message: "Visitor Aadhar Card No. must be exactly 12 digits",
            });
          }
          if (!/^\d+$/.test(visitor.aadharCardNo)) {
            return this.createError({
              path: `visitors[${i}].aadharCardNo`,
              message: "Visitor Aadhar Card No. must contain only digits",
            });
          }
        } else if (nationality === "Foreigner") {
          if (!visitor.passportNumber || visitor.passportNumber.trim() === "") {
            return this.createError({
              path: `visitors[${i}].passportNumber`,
              message: "Visitor Passport Number is required",
            });
          }
          if (visitor.passportNumber.length < 6 || visitor.passportNumber.length > 9) {
            return this.createError({
              path: `visitors[${i}].passportNumber`,
              message: "Visitor Passport Number must be 6-9 characters",
            });
          }
          if (!/^[A-Z0-9]{6,9}$/i.test(visitor.passportNumber)) {
            return this.createError({
              path: `visitors[${i}].passportNumber`,
              message: "Visitor Passport Number must contain only letters and numbers",
            });
          }
        } else if (nationality === "Nepal") {
          if (!visitor.nationalId || visitor.nationalId.trim() === "") {
            return this.createError({
              path: `visitors[${i}].nationalId`,
              message: "Visitor National Id is required",
            });
          }
          if (visitor.nationalId.length < 8 || visitor.nationalId.length > 12) {
            return this.createError({
              path: `visitors[${i}].nationalId`,
              message: "Visitor National Id must be 8-12 digits",
            });
          }
          if (!/^\d+$/.test(visitor.nationalId)) {
            return this.createError({
              path: `visitors[${i}].nationalId`,
              message: "Visitor National Id must contain only digits",
            });
          }
        }
      }
      
      return true;
    }),
});

export const gatePatientMedicineTypeSchema = Yup.object().shape({
  mobileNumber: Yup.string()
    .trim()
    .required("Mobile Number is required")
    .min(10, "Mobile Number must be at least 10 digits")
    .matches(/^\d+$/, "Mobile Number must contain only digits"),

  title: Yup.string()
    .trim()
    .required("Title is required"),

  patientName: Yup.string()
    .trim()
    .required("Patient Name is required")
    .matches(/^[a-zA-Z\s]+$/, "Only letters and spaces are allowed"),

  uhid: Yup.string()
    .trim()
    .optional(),

  whoVisited: Yup.string()
    .trim()
    .required("Who visited is required"),

  // Address Details
  pinCode: Yup.string()
    .trim()
    .when("country", {
      is: "6", // India
      then: (schema) => schema
        .required("Pin Code is required")
        .min(3, "Pin Code must be at least 3 digits")
        .matches(/^\d+$/, "Pin Code must contain only digits"),
      otherwise: (schema) => schema
        .when("country", {
          is: (val: string) => Boolean(val && val !== "6"),
          then: (s) => s
            .required("ZIP/Postal Code is required")
            .min(4, "ZIP/Postal Code must be 4-10 characters")
            .max(10, "ZIP/Postal Code must be 4-10 characters")
            .matches(/^[a-zA-Z0-9]+$/, "ZIP/Postal Code must contain only letters and numbers"),
          otherwise: (s) => s.optional(),
        }),
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
      is: (val: string) => Boolean(val && val !== "6"),
      then: (schema) => schema.required("Address Line 1 is required"),
      otherwise: (schema) => schema.optional(),
    }),
  
  addressLine2: Yup.string()
    .trim()
    .optional(),

  // Visitors - required when whoVisited is "visitor", optional otherwise
  visitors: Yup.array()
    .of(visitorSchema)
    .when("whoVisited", {
      is: (value: string) => value?.toLowerCase() === "visitor",
      then: (schema) => schema
        .min(1, "At least one visitor is required when Visitor is selected")
        .required("At least one visitor is required"),
      otherwise: (schema) => schema.optional(),
    }),
});

export type NewPatientEntryFormValues = Yup.InferType<typeof newPatientEntrySchema>;
export type VisitorFormValues = Yup.InferType<typeof visitorSchema>;
// Revisit Patient validation schema
export const revisitPatientSchema = Yup.object().shape({
  contactNumber: Yup.string()
    .trim()
    .test(
      "contact-length",
      "Contact Number must be exactly 10 digits",
      function (value) {
        if (!value || value.trim().length === 0) return true; // Optional if other fields are filled
        return value.length === 10;
      }
    )
    .matches(/^\d*$/, "Contact Number must contain only digits"),
  
  uhid: Yup.string()
    .trim()
    .test(
      "uhid-length",
      "UHID must be at least 10 characters",
      function (value) {
        if (!value || value.trim().length === 0) return true; // Optional if other fields are filled
        return value.length >= 10;
      }
    )
    .matches(/^[a-zA-Z0-9]*$/, "UHID must contain only letters and numbers"),
  
  aadharCardNumber: Yup.string()
    .trim()
    .test(
      "aadhar-length",
      "Aadhar Card Number must be exactly 12 digits",
      function (value) {
        if (!value || value.trim().length === 0) return true; // Optional if other fields are filled
        return value.length === 12;
      }
    )
    .matches(/^\d*$/, "Aadhar Card Number must contain only digits"),
  
  preBooking: Yup.string()
    .trim()
    .test(
      "preBooking-length",
      "Pre Booking must be between 1 and 10 digits",
      function (value) {
        if (!value || value.trim().length === 0) return true; // Optional if other fields are filled
        return value.length >= 1 && value.length <= 10;
      }
    )
    .matches(/^\d*$/, "Pre Booking must contain only digits"),
}).test(
  "at-least-one",
  "At least one field (Contact Number, UHID, Aadhar Card Number, or Pre Booking) must be filled",
  function (values) {
    const { contactNumber, uhid, aadharCardNumber, preBooking } = values;
    const hasContactNumber = !!(contactNumber && contactNumber.trim().length > 0);
    const hasUHID = !!(uhid && uhid.trim().length > 0);
    const hasAadharCardNumber = !!(aadharCardNumber && aadharCardNumber.trim().length > 0);
    const hasPreBooking = !!(preBooking && preBooking.trim().length > 0);
    return hasContactNumber || hasUHID || hasAadharCardNumber || hasPreBooking;
  }
);

export type GateNewPatientFormValues = Yup.InferType<typeof gateNewPatientSchema>;
export type PatientVisitorItemFormValues = Yup.InferType<typeof patientVisitorItemSchema>;
export type GatePatientVisitorFormValues = Yup.InferType<typeof gatePatientVisitorSchema>;
export type IPDVisitorItemFormValues = Yup.InferType<typeof ipdVisitorItemSchema>;
export type GateIPDVisitorFormValues = Yup.InferType<typeof gateIPDVisitorSchema>;
export type OtherVisitorItemFormValues = Yup.InferType<typeof otherVisitorItemSchema>;
export type GateOtherVisitorFormValues = Yup.InferType<typeof gateOtherVisitorSchema>;
export type RevisitPatientFormValues = Yup.InferType<typeof revisitPatientSchema>;
export type GatePatientMedicineTypeFormValues = Yup.InferType<typeof gatePatientMedicineTypeSchema>;

