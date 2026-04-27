"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import GateEntryLayout from "@/components/gate/GateEntryLayout";
import { GoToHomeButton, BackToPreviousPageButton, Button, MessageDialog, Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableData } from "@/components/ui";
import { AddressDetails, VisitorsDetails, type Visitor, type AddressFormData } from "@/components/forms";
import PatientDetails from "@/components/forms/PatientDetails";
import { gatePatientMedicineTypeSchema, type GatePatientMedicineTypeFormValues } from "@/lib/validation/gateSchemas";
import {
  useVisitorEntryMutation,
  useLazyCheckGateExistingPatientsByPhoneQuery,
  useLazyGetVisitorByAadharQuery,
  type ExistingPatient,
  type VisitorEntryItem,
  type VisitorByAadharItem,
} from "@/store/api/gateApi";
import {
  useGetCountriesQuery,
  useGetStatesQuery,
  useGetCitiesQuery,
  useLazyGetTehsilsQuery,
  useLazyGetAreasQuery,
  useLazyGetStatesQuery,
  useLazyGetCitiesQuery,
} from "@/store/api/publicApi";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectPermissionsMap } from "@/store/slices/authSlice";
import { getSubModulePermissions } from "@/utils/permission";

// Helper functions to get names from IDs
const getCountryName = (countryId: string, countriesData: any) => {
  const country = countriesData?.data?.find((c: any) => c.id.toString() === countryId);
  return country?.name || "";
};

// Helper function to get country ID from country name
const getCountryId = (countryName: string, countriesData: any): string => {
  if (!countryName || !countriesData?.data) return "6"; // Default to India (ID: 6)
  const country = countriesData.data.find((c: any) => 
    c.name?.toLowerCase().trim() === countryName.toLowerCase().trim()
  );
  return country ? country.id.toString() : "6"; // Default to India if not found
};

const getStateName = (stateId: string, statesData: any) => {
  const state = statesData?.data?.find((s: any) => s.id.toString() === stateId);
  return state?.name || "";
};

const getCityName = (cityId: string, citiesData: any) => {
  const city = citiesData?.data?.find((c: any) => c.id.toString() === cityId);
  return city?.name || "";
};

/** Patient address on submit: India uses state/city IDs → names; non-India uses plain text in form fields. */
const stateValueForVisitorPayload = (
  countryId: string | undefined,
  stateVal: string | undefined,
  statesData: any
): string => {
  if (stateVal == null || String(stateVal).trim() === "") return "";
  if (countryId === "6") return getStateName(stateVal, statesData);
  return String(stateVal).trim();
};

const cityValueForVisitorPayload = (
  countryId: string | undefined,
  cityVal: string | undefined,
  citiesData: any
): string => {
  if (cityVal == null || String(cityVal).trim() === "") return "";
  if (countryId === "6") return getCityName(cityVal, citiesData);
  return String(cityVal).trim();
};

// Helper functions to get tehsil and area names from IDs (used in patient-medicine-type page)
const getTehsilNameAsync = async (tehsilId: string, cityId: string, getTehsilsQuery: any): Promise<string> => {
  if (!tehsilId || !cityId) return tehsilId;
  try {
    const result = await getTehsilsQuery({ districtId: cityId }).unwrap();
    const tehsil = result?.data?.find((t: any) => t.id.toString() === tehsilId);
    return tehsil?.name || tehsilId;
  } catch (error) {
    console.error("Error fetching tehsil name:", error);
    return tehsilId;
  }
};

const getAreaNameAsync = async (areaId: string, tehsilId: string, getAreasQuery: any): Promise<string> => {
  if (!areaId || !tehsilId) return areaId;
  try {
    const result = await getAreasQuery({ tehsilId: tehsilId }).unwrap();
    const area = result?.data?.find((a: any) => a.id.toString() === areaId);
    return area?.name || areaId;
  } catch (error) {
    console.error("Error fetching area name:", error);
    return areaId;
  }
};

export default function GatePatientMedicineTypePage() {
  const userBranchId = useAppSelector(selectUserBranchId);
  const branchId = userBranchId ?? 1;
  const permissionsMap = useAppSelector(selectPermissionsMap);
  const gatePermissions = useMemo(
    () => getSubModulePermissions(permissionsMap, "Gate", "Patient Medicine Type"),
    [permissionsMap]
  );
  const router = useRouter();
  const [visitorEntry, { isLoading: isSubmitting }] = useVisitorEntryMutation();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
  const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
  const [visitorExistsDialogOpen, setVisitorExistsDialogOpen] = useState(false);
  const [existingVisitors, setExistingVisitors] = useState<VisitorByAadharItem[]>([]);
  const [visitorDialogVisitorIndex, setVisitorDialogVisitorIndex] = useState<number>(0);
  const [visitorLookupLoading, setVisitorLookupLoading] = useState<Record<string, boolean>>({});
  const [visitorDialogSelectingId, setVisitorDialogSelectingId] = useState<number | string | null>(null);
  const [lockedVisitors, setLockedVisitors] = useState<Record<string, boolean>>({});
  const [activeVisitorAadharId, setActiveVisitorAadharId] = useState<string | null>(null);
  const [isVisitorAddressLockedByFirstSelection, setIsVisitorAddressLockedByFirstSelection] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ExistingPatient | null>(null);
  // Store original address details to restore when switching back to Patient
  const originalAddressRef = useRef<{
    pinCode: string;
    country: string;
    state: string;
    city: string;
    tehsil: string;
    area: string;
    address: string;
    addressLine1?: string;
    addressLine2?: string;
  } | null>(null);
  const addressByVisitTypeRef = useRef<{
    patient: {
      pinCode: string;
      country: string;
      state: string;
      city: string;
      tehsil: string;
      area: string;
      address: string;
      addressLine1: string;
      addressLine2: string;
    } | null;
    visitor: {
      pinCode: string;
      country: string;
      state: string;
      city: string;
      tehsil: string;
      area: string;
      address: string;
      addressLine1: string;
      addressLine2: string;
    } | null;
  }>({
    patient: null,
    visitor: null,
  });
  // Branch should be taken from logged-in user (fallback to 1 if unavailable)
  // Note: `branchId` is declared near top of component from auth state.
  const isClosingDialogRef = useRef(false);
  const lastCheckedContactNumberRef = useRef<string>("");
  const lastCheckedUHIDRef = useRef<string>("");
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const uhidSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For debouncing UHID search
  
  // Loading state for mobile number API check
  const [isMobileNumberLoading, setIsMobileNumberLoading] = useState(false);
  const [noPatientFoundMessage, setNoPatientFoundMessage] = useState<string | null>(null);
  const isVisitorLookupLoading = Object.values(visitorLookupLoading).some(Boolean);
  
  // Lazy query for checking existing patients
  const [checkExistingPatientsQuery] = useLazyCheckGateExistingPatientsByPhoneQuery();
  const [getVisitorByAadhar] = useLazyGetVisitorByAadharQuery();
  const [getStatesQuery] = useLazyGetStatesQuery();
  const [getCitiesQuery] = useLazyGetCitiesQuery();

  // Refs for form fields
  const mobileNumberRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const patientNameRef = useRef<HTMLInputElement>(null);
  const uhidRef = useRef<HTMLInputElement>(null);
  const whoVisitedRef = useRef<HTMLDivElement>(null);
  const pinCodeRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const tehsilRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const addressLine1Ref = useRef<HTMLInputElement>(null);
  const addressLine2Ref = useRef<HTMLInputElement>(null);
  const visitorTitleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const visitorNameRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const visitorCountryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const visitorAadharRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const visitorPassportRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const visitorNationalIdRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Form ref for arrow key navigation
  const formRef = useRef<HTMLFormElement>(null);

  // Enable arrow key navigation for form fields
  useArrowKeyNavigation(formRef, true, (fieldName) => {
    // Validate the select field when navigating to it
    const fieldMap: Record<string, string> = {
      title: "title",
      country: "country",
      state: "state",
      city: "city",
      visitorTitle: "visitors[0].nameSelect",
      whoVisited: "whoVisited",
    };
    const formikField = fieldMap[fieldName] || fieldName;
    if (formikField) {
      formik.setFieldTouched(formikField, true, false);
      formik.validateField(formikField);
    }
  });

  const initialValues: GatePatientMedicineTypeFormValues = {
    mobileNumber: "",
    title: "",
    patientName: "",
    uhid: "",
    whoVisited: "patient", // Default to "Patient"
    pinCode: "",
    country: "6", // India is auto-selected
    state: "",
    city: "",
    tehsil: "" as any,
    area: "" as any,
    address: "",
    addressLine1: "",
    addressLine2: "",
    visitors: [],
  };

  const formik = useFormik<GatePatientMedicineTypeFormValues>({
    initialValues,
    validationSchema: gatePatientMedicineTypeSchema,
    validateOnChange: true, // Enable validation on change to show errors immediately
    validateOnBlur: true,
    onSubmit: async () => {},
  });

  // Countries always; states/cities master APIs only for India (dropdown IDs). Non-India: text fields, no state/city API.
  const { data: countriesData } = useGetCountriesQuery({});
  const addressCountryIsIndia = formik.values.country === "6";
  const { data: statesData } = useGetStatesQuery(
    formik.values.country && addressCountryIsIndia ? { countryId: formik.values.country } : undefined,
    { skip: !formik.values.country || !addressCountryIsIndia }
  );
  const { data: citiesData } = useGetCitiesQuery(
    formik.values.state && addressCountryIsIndia ? { stateId: formik.values.state } : undefined,
    { skip: !formik.values.state || !addressCountryIsIndia }
  );
  
  // Lazy queries for tehsils and areas - fetch during form submission
  const [getTehsilsQuery] = useLazyGetTehsilsQuery();
  const [getAreasQuery] = useLazyGetAreasQuery();

  const getAddressSnapshotFromValues = (values: GatePatientMedicineTypeFormValues) => ({
    pinCode: values.pinCode || "",
    country: values.country || "6",
    state: values.state || "",
    city: values.city || "",
    tehsil: (values as any).tehsil || "",
    area: (values as any).area || "",
    address: values.address || "",
    addressLine1: (values as any).addressLine1 || "",
    addressLine2: (values as any).addressLine2 || "",
  });

  const applyAddressSnapshot = (snapshot: ReturnType<typeof getAddressSnapshotFromValues>) => {
    formik.setFieldValue("pinCode", snapshot.pinCode, false);
    formik.setFieldValue("country", snapshot.country, false);
    formik.setFieldValue("state", snapshot.state, false);
    formik.setFieldValue("city", snapshot.city, false);
    formik.setFieldValue("tehsil", snapshot.tehsil, false);
    formik.setFieldValue("area", snapshot.area, false);
    formik.setFieldValue("address", snapshot.address, false);
    formik.setFieldValue("addressLine1", snapshot.addressLine1, false);
    formik.setFieldValue("addressLine2", snapshot.addressLine2, false);
  };

  // Helper function to convert Formik errors to flat structure for components
  const getFormErrors = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const visitors = formik.values.visitors || [];
    const duplicateAadharIndices = new Set<number>();

    // Determine duplicate Aadhaar rows: only mark repeated entries (2nd, 3rd...), never the first one.
    const firstAadharIndexByValue = new Map<string, number>();
    visitors.forEach((visitor, index) => {
      const aadhar = (visitor.aadharCardNo || "").trim();
      if (aadhar.length !== 12) return;
      if (!firstAadharIndexByValue.has(aadhar)) {
        firstAadharIndexByValue.set(aadhar, index);
      } else {
        duplicateAadharIndices.add(index);
      }
    });

    // Patient Details errors
    if (formik.errors.mobileNumber && formik.touched.mobileNumber) {
      errors.mobileNumber = formik.errors.mobileNumber;
    }
    if (formik.errors.title && formik.touched.title) {
      errors.title = formik.errors.title;
    }
    if (formik.errors.patientName && formik.touched.patientName) {
      errors.patientName = formik.errors.patientName;
    }
    if (formik.errors.uhid && formik.touched.uhid) {
      errors.uhid = formik.errors.uhid;
    }
    if ((formik.errors as any).whoVisited && (formik.touched as any).whoVisited) {
      errors.whoVisited = (formik.errors as any).whoVisited;
    }

    // Address Details errors
    if (formik.errors.pinCode && formik.touched.pinCode) {
      errors.pinCode = formik.errors.pinCode;
    }
    if (formik.errors.country && formik.touched.country) {
      errors.country = formik.errors.country;
    }
    if (formik.errors.state && formik.touched.state) {
      errors.state = formik.errors.state;
    }
    if (formik.errors.city && formik.touched.city) {
      errors.city = formik.errors.city;
    }
    if (formik.errors.address && formik.touched.address) {
      errors.address = formik.errors.address;
    }
    if ((formik.errors as any).addressLine1 && (formik.touched as any).addressLine1) {
      errors.addressLine1 = (formik.errors as any).addressLine1;
    }
    if ((formik.errors as any).addressLine2 && (formik.touched as any).addressLine2) {
      errors.addressLine2 = (formik.errors as any).addressLine2;
    }

    // Visitor errors - only show errors for individual visitors (visitors are optional, so no array-level error)
    if (formik.errors.visitors && formik.touched.visitors) {
      // Only process array errors (individual visitor validation errors)
      if (Array.isArray(formik.errors.visitors)) {
        // If it's an array, process individual visitor errors
        const visitorErrors = formik.errors.visitors;
        const touchedVisitors = Array.isArray(formik.touched.visitors) ? formik.touched.visitors : undefined;

        if (touchedVisitors) {
          visitorErrors.forEach((visitorError: any, index: number) => {
            if (visitorError && typeof visitorError === "object") {
              const visitorTouched = touchedVisitors[index];
              Object.keys(visitorError).forEach((field) => {
                const fieldError = visitorError[field];
                const fieldTouched = (visitorTouched as any)?.[field];
                const isFieldTouched = fieldTouched === true;

                if (typeof fieldError === "string") {
                  // For duplicate Aadhaar, show error only on duplicated rows (not first occurrence).
                  if (field === "aadharCardNo" && fieldError === "Visitor Aadhar Card No. must be unique") {
                    const visitorValue = formik.values.visitors?.[index]?.aadharCardNo;
                    if (
                      visitorValue &&
                      visitorValue.trim().length === 12 &&
                      duplicateAadharIndices.has(index)
                    ) {
                      errors[`visitorAadhar_${index}`] = fieldError;
                    }
                  } else if (!isFieldTouched) {
                    return;
                  } else if (field === "nameSelect") {
                    errors[`visitorTitle_${index}`] = fieldError;
                  } else if (field === "name") {
                    errors[`visitorName_${index}`] = fieldError;
                  } else if (field === "aadharCardNo") {
                    errors[`visitorAadhar_${index}`] = fieldError;
                  } else if (field === "passportNumber") {
                    errors[`visitorPassport_${index}`] = fieldError;
                  } else if (field === "nationalId") {
                    errors[`visitorNationalId_${index}`] = fieldError;
                  }
                }
              });
            }
          });
        }
      }
    }

    return errors;
  };

  // Flatten validation errors to same key format as getFormErrors (for first-error lookup by sequence).
  const flattenValidationErrors = (validationErrors: typeof formik.errors): Record<string, string> => {
    const flat: Record<string, string> = {};
    if (!validationErrors) return flat;
    Object.keys(validationErrors).forEach((key) => {
      const error = validationErrors[key as keyof typeof formik.errors];
      if (typeof error === "string") flat[key] = error;
      else if (Array.isArray(error) && key === "visitors") {
        (error as any[]).forEach((visitorError: any, index: number) => {
          if (visitorError && typeof visitorError === "object") {
            Object.keys(visitorError).forEach((field) => {
              const msg = visitorError[field];
              if (typeof msg !== "string") return;
              if (field === "nameSelect") flat[`visitorTitle_${index}`] = msg;
              else if (field === "name") flat[`visitorName_${index}`] = msg;
              else if (field === "aadharCardNo") flat[`visitorAadhar_${index}`] = msg;
              else if (field === "passportNumber") flat[`visitorPassport_${index}`] = msg;
              else if (field === "nationalId") flat[`visitorNationalId_${index}`] = msg;
            });
          }
        });
      }
    });
    return flat;
  };

  // Ref → target ref according to sequence (same as form layout: first field, then next, then next).
  // Patient Details → Address Details → Visitors (per visitor: Title, Name, Aadhar).
  const PATIENT_MEDICINE_TYPE_FIELD_ORDER: readonly string[] = [
    "mobileNumber",   // 1 → mobileNumberRef
    "title",          // 2 → titleRef (Title)
    "patientName",    // 3 → patientNameRef
    "uhid",           // 4 → uhidRef
    "whoVisited",     // 5 → whoVisitedRef
    "pinCode",        // 6 → pinCodeRef
    "country",        // 7 → countryRef
    "state",          // 8 → stateRef
    "city",           // 9 → cityRef (District)
    "tehsil",         // 10 → tehsilRef
    "area",           // 11 → areaRef (Post Office)
    "address",        // 12 → addressRef
    "addressLine1",   // 13 → addressLine1Ref
    "addressLine2",   // 14 → addressLine2Ref
  ];

  // Use validationErrors when provided (e.g. from validateForm() on submit) so we use fresh result
  // and focus the first invalid field in form order (sequence by sequence).
  const scrollToFirstError = (validationErrors?: typeof formik.errors) => {
    const errors = validationErrors ? flattenValidationErrors(validationErrors) : getFormErrors();
    if (Object.keys(errors).length === 0) return;

    const visitorCount = formik.values.visitors?.length ?? 0;
    const order: string[] = [...PATIENT_MEDICINE_TYPE_FIELD_ORDER];
    for (let i = 0; i < visitorCount; i++) {
      order.push(`visitorTitle_${i}`, `visitorName_${i}`, `visitorAadhar_${i}`, `visitorPassport_${i}`, `visitorNationalId_${i}`);
    }
    const firstErrorKey = order.find((key) => errors[key]);
    if (firstErrorKey) scrollToErrorField(firstErrorKey);
  };

  // Function to scroll to error field
  const scrollToErrorField = (errorKey: string) => {
    // Handle visitors array error (empty array)
    if (errorKey === "visitors") {
      // Try to find the Visitors Details section
      const visitorsSection = document.querySelector('[data-section="visitors-details"]');
      if (visitorsSection) {
        setTimeout(() => {
          visitorsSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        return;
      }
    }

    const fieldRefMap: Record<string, React.RefObject<HTMLElement | null>> = {
      mobileNumber: mobileNumberRef as React.RefObject<HTMLElement>,
      title: titleRef,
      patientName: patientNameRef as React.RefObject<HTMLElement>,
      uhid: uhidRef as React.RefObject<HTMLElement>,
      whoVisited: whoVisitedRef,
      pinCode: pinCodeRef as React.RefObject<HTMLElement>,
      country: countryRef,
      state: stateRef,
      city: cityRef,
      tehsil: tehsilRef,
      area: areaRef,
      address: addressRef as React.RefObject<HTMLElement>,
      addressLine1: addressLine1Ref as React.RefObject<HTMLElement>,
      addressLine2: addressLine2Ref as React.RefObject<HTMLElement>,
    };

    // Check if it's a visitor field
    if (errorKey.startsWith("visitorTitle_")) {
      const index = parseInt(errorKey.replace("visitorTitle_", ""));
      const visitor = formik.values.visitors?.[index];
      if (visitor && visitor.id) {
        const ref = visitorTitleRefs.current[visitor.id];
        if (ref) {
          setTimeout(() => {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
            const triggerButton = ref.querySelector('button[type="button"]');
            if (triggerButton instanceof HTMLElement) {
              setTimeout(() => triggerButton.focus(), 150);
            }
          }, 100);
          return;
        }
      }
    }

    if (errorKey.startsWith("visitorName_")) {
      const index = parseInt(errorKey.replace("visitorName_", ""));
      const visitor = formik.values.visitors?.[index];
      if (visitor && visitor.id) {
        const ref = visitorNameRefs.current[visitor.id];
        if (ref) {
          setTimeout(() => {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
            ref.focus();
          }, 100);
          return;
        }
      }
    }

    if (errorKey.startsWith("visitorAadhar_")) {
      const index = parseInt(errorKey.replace("visitorAadhar_", ""));
      const visitor = formik.values.visitors?.[index];
      if (visitor && visitor.id) {
        const ref = visitorAadharRefs.current[visitor.id];
        if (ref) {
          setTimeout(() => {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
            ref.focus();
          }, 100);
          return;
        }
      }
    }

    if (errorKey.startsWith("visitorPassport_")) {
      const index = parseInt(errorKey.replace("visitorPassport_", ""));
      const visitor = formik.values.visitors?.[index];
      if (visitor && visitor.id) {
        const ref = visitorPassportRefs.current[visitor.id];
        if (ref) {
          setTimeout(() => {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
            ref.focus();
          }, 100);
          return;
        }
      }
    }

    if (errorKey.startsWith("visitorNationalId_")) {
      const index = parseInt(errorKey.replace("visitorNationalId_", ""));
      const visitor = formik.values.visitors?.[index];
      if (visitor && visitor.id) {
        const ref = visitorNationalIdRefs.current[visitor.id];
        if (ref) {
          setTimeout(() => {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
            ref.focus();
          }, 100);
          return;
        }
      }
    }

    // Handle regular fields
    const ref = fieldRefMap[errorKey];
    let targetElement: HTMLElement | null = null;

    if (ref?.current) {
      targetElement = ref.current;
    } else {
      const element = document.querySelector(`[data-field="${errorKey}"]`);
      if (element instanceof HTMLElement) {
        targetElement = element;
      }
    }

    if (targetElement) {
      setTimeout(() => {
        targetElement?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
          targetElement.focus();
        } else {
          const triggerButton = targetElement.querySelector('button[type="button"]');
          if (triggerButton instanceof HTMLElement) {
            setTimeout(() => triggerButton.focus(), 150);
          }
        }
      }, 100);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (values: GatePatientMedicineTypeFormValues) => {
    try {
      // Fetch tehsil and area names if IDs are present
      const tehsilId = (values as any).tehsil;
      const areaId = (values as any).area;
      let tehsilName: string | undefined = undefined;
      let areaName: string | undefined = undefined;
      
      if (tehsilId && values.city) {
        tehsilName = await getTehsilNameAsync(tehsilId, values.city, getTehsilsQuery);
      }
      
      if (areaId && tehsilId) {
        // Always set visitorAreaId from the selected area ID (this is the numeric ID from areas API response)
        // areaId contains the area ID (e.g., 332662) from the areas API
        // Fetch area name for the payload
        try {
          areaName = await getAreaNameAsync(areaId, tehsilId, getAreasQuery);
        } catch (error) {
          console.error("Error fetching area name, but visitorAreaId is still set:", error);
          // Even if area name fetch fails, visitorAreaId is still set below
          areaName = areaId; // Fallback to ID if name fetch fails
        }
      }
      
      // Create visitors array - if no visitors added, create one with patient and address info
      let visitors: VisitorEntryItem[];
      
      if (!values.visitors || values.visitors.length === 0) {
        // When no visitors are added, still send patient and address information
        // Create a visitor entry with patient details but no visitor name (since no visitor was added)
        const defaultNationality = "Indian";
        visitors = [{
          patientTitle: values.title || undefined,
          visitorTitle: undefined,
          visitorName: "", // Empty string - no visitor was added, so no visitor name
          visitorType: "MEDICINE" as const,
          visitorContactNumber: "", // No separate visitor contact number field in form - only patient mobile number exists
          visitorAadharCardNo: undefined, // No visitor added, so no identification
          visitorPassportNumber: undefined,
          visitorNationalId: undefined,
          visitorNationality: defaultNationality, // Default nationality when no visitor is added
          ...(values.country === "6"
            ? { visitorAddress: values.address || "" }
            : {
                visitorAddressLine1: (values as any).addressLine1 || "",
                visitorAddressLine2: (values as any).addressLine2 || "",
              }),
          visitorCity: cityValueForVisitorPayload(values.country, values.city, citiesData),
          visitorTehsil: tehsilName,
          visitorArea: areaName,
          visitorAreaId: areaId ? areaId : undefined, // Add areaId from the selected area ID (numeric ID from areas API)
          visitorState: stateValueForVisitorPayload(values.country, values.state, statesData),
          visitorCountry: values.country ? getCountryName(values.country, countriesData) : "",
          visitorPinCode: values.pinCode || "",
          patientName: values.patientName || "",
          patientPhoneNumber: values.mobileNumber || "", // Patient mobile number (only mobile number field in form)
          patientUhid: values.uhid || "",
          vehiclePhoto: null as File | null,
          aadharPhoto: null as File | null,
        }];
      } else {
        // Map visitors with patient and address information
        visitors = (values.visitors || []).map((visitor) => {
          const visitorNationality = visitor.country || "Indian";
          
          // Conditionally set identification fields based on nationality
          let visitorAadharCardNo: string | undefined = undefined;
          let visitorPassportNumber: string | undefined = undefined;
          let visitorNationalId: string | undefined = undefined;
          
          if (visitorNationality === "Indian") {
            visitorAadharCardNo = visitor.aadharCardNo && visitor.aadharCardNo.trim() !== "" ? visitor.aadharCardNo : undefined;
          } else if (visitorNationality === "Foreigner") {
            visitorPassportNumber = visitor.passportNumber && visitor.passportNumber.trim() !== "" ? visitor.passportNumber : undefined;
          } else if (visitorNationality === "Nepal") {
            visitorNationalId = visitor.nationalId && visitor.nationalId.trim() !== "" ? visitor.nationalId : undefined;
          }
          
          return {
            patientTitle: values.title || undefined,
            visitorTitle: visitor.nameSelect || undefined,
            visitorName: visitor.name,
            visitorType: "MEDICINE" as const,
            visitorContactNumber: (visitor.visitorContactNumber || "").trim(), // From "Already Exists" dialog selection
            visitorAadharCardNo,
            visitorPassportNumber,
            visitorNationalId,
            visitorNationality, // Visitor nationality (Indian, Nepal, Foreigner)
            ...(values.country === "6"
              ? { visitorAddress: values.address }
              : {
                  visitorAddressLine1: (values as any).addressLine1 || "",
                  visitorAddressLine2: (values as any).addressLine2 || "",
                }),
            visitorCity: cityValueForVisitorPayload(values.country, values.city, citiesData),
            visitorTehsil: tehsilName,
            visitorArea: areaName,
            visitorAreaId: areaId ? areaId : undefined, // Add areaId from the selected area ID (numeric ID from areas API)
            visitorState: stateValueForVisitorPayload(values.country, values.state, statesData),
            visitorCountry: values.country ? getCountryName(values.country, countriesData) : "",
            visitorPinCode: values.pinCode || "",
            patientName: values.patientName,
            patientPhoneNumber: values.mobileNumber || "", // Patient mobile number (only mobile number field in form)
            patientUhid: values.uhid || "",
            vehiclePhoto: null as File | null,
            aadharPhoto: null as File | null,
          };
        });
      }

      // Determine isPatientVisitForMedicine based on whoVisited selection
      const isPatientVisitForMedicine = values.whoVisited?.toLowerCase() === "patient";
      
      const payload = { 
        visitors,
        isPatientVisitForMedicine: isPatientVisitForMedicine
      };
      console.log("Patient Medicine Type - Payload before submit:", payload);
      console.log("Patient Medicine Type - Full form values:", values);
      console.log("Patient Medicine Type - Visitors array:", visitors);
      console.log("Patient Medicine Type - Payload (JSON):", JSON.stringify(payload, null, 2));
      console.log("Patient Medicine Type - Payload details:", {
        visitorCount: visitors.length,
        hasVisitors: (values.visitors && values.visitors.length > 0),
        visitors: visitors.map((v, idx) => ({
          index: idx,
          visitorName: v.visitorName,
          visitorType: v.visitorType,
          patientName: v.patientName,
          patientUhid: v.patientUhid,
          patientPhoneNumber: v.patientPhoneNumber,
          visitorContactNumber: v.visitorContactNumber,
          visitorAddress: v.visitorAddress,
          visitorAddressLine1: v.visitorAddressLine1,
          visitorAddressLine2: v.visitorAddressLine2,
          visitorCity: v.visitorCity,
          visitorState: v.visitorState,
          visitorCountry: v.visitorCountry,
          visitorPinCode: v.visitorPinCode,
          visitorAadharCardNo: v.visitorAadharCardNo,
        }))
      });
      const response = await visitorEntry(payload).unwrap();

      setSuccessMessage(response.message || "Patient Medicine Type entry created successfully!");
      setShowSuccessDialog(true);

      // Reset form after successful submission
      setTimeout(() => {
        formik.resetForm();
        formik.setFieldValue("visitors", []);
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting form:", error);

      let errorMsg = "Failed to submit patient medicine type entry. Please try again.";

      if (error?.data?.message) {
        errorMsg = error.data.message;
      } else if (error?.error) {
        errorMsg = error.error;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      setApiErrorMessage(errorMsg);
      setShowApiErrorDialog(true);
    }
  };

  const handleGoToHome = () => {
    router.push("/gate");
  };

  const handleBack = () => {
    router.back();
  };

  const handleAddVisitor = () => {
    const currentVisitors = formik.values.visitors || [];
    if (currentVisitors.length >= 5) {
      alert("Maximum 5 visitors allowed");
      return;
    }
    const newVisitor: Visitor = {
      id: Date.now().toString(),
      nameSelect: "",
      name: "",
      country: "Indian",
      aadharCardNo: "",
    };
    const updatedVisitors = [...currentVisitors, newVisitor];
    // Prevent immediate revalidation from clearing duplicate Aadhaar error on active row.
    formik.setFieldValue("visitors", updatedVisitors, false);

    if (activeVisitorAadharId !== null) {
      const activeIndex = updatedVisitors.findIndex((v) => v.id === activeVisitorAadharId);
      const activeValue = activeIndex >= 0 ? updatedVisitors[activeIndex]?.aadharCardNo?.trim() || "" : "";
      if (activeValue.length === 12) {
        const duplicateCount = updatedVisitors.filter(
          (v, idx) => idx !== activeIndex && (v.aadharCardNo || "").trim() === activeValue
        ).length;
        if (duplicateCount > 0 && activeIndex >= 0) {
          formik.setFieldError(
            `visitors.${activeIndex}.aadharCardNo`,
            "Visitor Aadhar Card No. must be unique"
          );
          formik.setFieldTouched(`visitors.${activeIndex}.aadharCardNo`, true, false);
        }
      }
    }
  };

  const handleVisitorAadharLookup = async (index: number, overrideAadhar?: string) => {
    const visitors = formik.values.visitors || [];
    const visitor = visitors[index];
    if (!visitor) return;

    const visitorKey = String(visitor.id ?? index);
    const aadhar = (overrideAadhar ?? visitor.aadharCardNo ?? "").trim();
    if (!aadhar || aadhar.length !== 12) return;
    if (visitorLookupLoading[visitorKey]) return;

    try {
      setVisitorLookupLoading((prev) => ({ ...prev, [visitorKey]: true }));
      const res = await getVisitorByAadhar({ visitorAadharCardNo: aadhar }).unwrap();
      const list = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
      if (list.length > 0) {
        setExistingVisitors(list);
        setVisitorDialogVisitorIndex(index);
        setVisitorExistsDialogOpen(true);
      } else {
        setExistingVisitors([]);
      }
    } catch (error) {
      console.error("Error fetching visitors by Aadhaar:", error);
      setExistingVisitors([]);
    } finally {
      setVisitorLookupLoading((prev) => ({ ...prev, [visitorKey]: false }));
    }
  };

  const handleVisitorDialogClose = (options?: { skipClearAadhar?: boolean }) => {
    setVisitorExistsDialogOpen(false);
    setExistingVisitors([]);
    setVisitorDialogSelectingId(null);

    if (options?.skipClearAadhar) return;
    const visitors = formik.values.visitors || [];
    const visitor = visitors[visitorDialogVisitorIndex];
    if (!visitor) return;

    setLockedVisitors((prev) => {
      const next = { ...prev };
      delete next[String(visitor.id ?? visitorDialogVisitorIndex)];
      return next;
    });

    formik.setFieldValue(`visitors.${visitorDialogVisitorIndex}.aadharCardNo`, "", false);
    formik.setFieldTouched(`visitors.${visitorDialogVisitorIndex}.aadharCardNo`, false, false);
    formik.setFieldError(`visitors.${visitorDialogVisitorIndex}.aadharCardNo`, undefined);
  };

  const handleSelectVisitorFromDialog = async (visitor: VisitorByAadharItem, rowKey: number | string) => {
    if (visitorDialogSelectingId !== null) return;
    setVisitorDialogSelectingId(rowKey);

    try {
      const visitors = formik.values.visitors || [];
      const index = visitorDialogVisitorIndex;
      const current = visitors[index];
      if (!current) return;

      const visitorKey = String(current.id ?? index);
      const isVisitorMode =
        String((formik.values as any).whoVisited || "patient").toLowerCase() === "visitor";
      const visitorCountryRaw = String(visitor.visitorNationality || visitor.visitorCountry || "Indian").trim();
      const normalizedVisitorCountry =
        visitorCountryRaw.toLowerCase().includes("foreigner")
          ? "Foreigner"
          : visitorCountryRaw.toLowerCase().includes("nepal")
            ? "Nepal"
            : "Indian";

      const updatedVisitors = [...visitors];
      updatedVisitors[index] = {
        ...current,
        nameSelect: (visitor.visitorTitle || "").trim() || current.nameSelect || "Mr",
        name: (visitor.visitorName || "").trim() || current.name,
        aadharCardNo: (visitor.visitorAadharCardNo || "").trim() || current.aadharCardNo,
        country: normalizedVisitorCountry,
        visitorContactNumber: (visitor.visitorContactNumber || "").trim(),
      };
      formik.setFieldValue("visitors", updatedVisitors, false);

      // Auto-fill address only in Visitor mode and only once from the first selected visitor.
      // In Patient mode, selecting an existing visitor must not modify Patient Address Details.
      if (isVisitorMode && !isVisitorAddressLockedByFirstSelection) {
        const visitorPinCode = String(visitor.visitorPinCode || "").trim();
        const visitorAddress = String(visitor.visitorAddress || "").trim();
        const visitorAddressLine1 = String(visitor.visitorAddressLine1 || "").trim();
        const visitorAddressLine2 = String(visitor.visitorAddressLine2 || "").trim();
        const visitorCountryName = String(visitor.visitorCountry || "").trim();
        const visitorStateName = String(visitor.visitorState || "").trim();
        const visitorCityName = String(visitor.visitorCity || "").trim();
        const visitorTehsilName = String(visitor.visitorTehsil || "").trim();
        const visitorAreaName = String(visitor.visitorArea || "").trim();

        const countryId = getCountryId(visitorCountryName || "India", countriesData);
        formik.setFieldValue("country", countryId || "6", false);
        formik.setFieldValue("pinCode", visitorPinCode, false);
        formik.setFieldValue("address", visitorAddress, false);
        formik.setFieldValue("addressLine1", visitorAddressLine1, false);
        formik.setFieldValue("addressLine2", visitorAddressLine2, false);

        let stateId = "";
        let cityId = "";
        let tehsilId = "";
        let areaId = "";

        if (countryId && visitorStateName) {
          try {
            const statesResult = await getStatesQuery({ countryId }).unwrap();
            const states = statesResult?.data || [];
            const matchedState = states.find(
              (s: any) => String(s.name || "").toLowerCase() === visitorStateName.toLowerCase()
            );
            if (matchedState?.id) {
              stateId = String(matchedState.id);
              formik.setFieldValue("state", stateId, false);
            }
          } catch (error) {
            console.error("Error fetching states for visitor address:", error);
          }
        }

        if (stateId && visitorCityName) {
          try {
            const citiesResult = await getCitiesQuery({ stateId }).unwrap();
            const cities = citiesResult?.data || [];
            const matchedCity = cities.find(
              (c: any) => String(c.name || "").toLowerCase() === visitorCityName.toLowerCase()
            );
            if (matchedCity?.id) {
              cityId = String(matchedCity.id);
              formik.setFieldValue("city", cityId, false);
            }
          } catch (error) {
            console.error("Error fetching cities for visitor address:", error);
          }
        }

        if (cityId && visitorTehsilName) {
          try {
            const tehsilsResult = await getTehsilsQuery({ districtId: cityId }).unwrap();
            const tehsils = tehsilsResult?.data || [];
            const matchedTehsil = tehsils.find(
              (t: any) => String(t.name || "").toLowerCase() === visitorTehsilName.toLowerCase()
            );
            if (matchedTehsil?.id) {
              tehsilId = String(matchedTehsil.id);
              formik.setFieldValue("tehsil", tehsilId, false);
            }
          } catch (error) {
            console.error("Error fetching tehsils for visitor address:", error);
          }
        }

        if (tehsilId && visitorAreaName) {
          try {
            const areasResult = await getAreasQuery({ tehsilId }).unwrap();
            const areas = areasResult?.data || [];
            const matchedArea = areas.find(
              (a: any) => String(a.name || "").toLowerCase() === visitorAreaName.toLowerCase()
            );
            if (matchedArea?.id) {
              areaId = String(matchedArea.id);
              formik.setFieldValue("area", areaId, false);
            }
          } catch (error) {
            console.error("Error fetching areas for visitor address:", error);
          }
        }

        setIsVisitorAddressLockedByFirstSelection(true);
      }

      formik.setFieldTouched(`visitors.${index}.nameSelect`, true, false);
      formik.setFieldTouched(`visitors.${index}.name`, true, false);
      formik.setFieldTouched(`visitors.${index}.aadharCardNo`, true, false);
      formik.setFieldTouched(`visitors.${index}.country`, true, false);
      formik.setFieldError(`visitors.${index}.nameSelect`, undefined);
      formik.setFieldError(`visitors.${index}.name`, undefined);
      formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
      formik.setFieldError(`visitors.${index}.country`, undefined);

      setLockedVisitors((prev) => ({ ...prev, [visitorKey]: true }));
      handleVisitorDialogClose({ skipClearAadhar: true });
    } finally {
      setVisitorDialogSelectingId(null);
    }
  };

  const handleRemoveVisitor = (id: string) => {
    const currentVisitors = formik.values.visitors || [];
    const updatedVisitors = currentVisitors.filter((visitor) => visitor.id !== id);

    setLockedVisitors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setVisitorLookupLoading((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeVisitorAadharId === id) {
      setActiveVisitorAadharId(null);
    }
    
    // Clear ALL errors and touched states for ALL visitors when a row is removed
    // This ensures no stale errors remain after array indices shift
    const currentErrors = { ...formik.errors };
    const currentTouched = { ...formik.touched };
    
    // Remove all visitor errors and touched states
    delete currentErrors.visitors;
    delete currentTouched.visitors;
    
    // Update errors and touched states (preserving all other form errors)
    formik.setErrors(currentErrors);
    formik.setTouched(currentTouched, false);
    
    // Update the visitors array
    formik.setFieldValue("visitors", updatedVisitors, false);
    
    // If only one visitor or no visitors remain, no duplicates are possible - we're done
    if (updatedVisitors.length <= 1) {
      return;
    }
    
    // Multiple visitors remain - re-check for duplicates after a brief delay
    setTimeout(() => {
      const finalVisitors = updatedVisitors;
      finalVisitors.forEach((visitor, index) => {
        if (visitor.aadharCardNo && visitor.aadharCardNo.trim().length === 12) {
          const duplicateCount = finalVisitors.filter((v, idx) => 
            idx !== index && v.aadharCardNo && v.aadharCardNo.trim() === visitor.aadharCardNo
          ).length;
          
          if (duplicateCount > 0) {
            // Duplicate found, set error only on the field with duplicate
            formik.setFieldError(`visitors.${index}.aadharCardNo`, "Visitor Aadhar Card No. must be unique");
            formik.setFieldTouched(`visitors.${index}.aadharCardNo`, true, false);
          }
        }
      });
    }, 0);
  };

  // Check for existing patients by mobile number or UHID
  const checkExistingPatients = async (mobileNumber?: string, uhid?: string) => {
    // Need at least one valid parameter
    if ((!mobileNumber || mobileNumber.length !== 10) && (!uhid || uhid.trim().length === 0)) {
      if (!mobileNumber || mobileNumber.length !== 10) {
        lastCheckedContactNumberRef.current = "";
      }
      if (!uhid || uhid.trim().length === 0) {
        lastCheckedUHIDRef.current = "";
      }
      return;
    }
    
    if (isClosingDialogRef.current) return;
    
    // Check if we already checked this value
    if (mobileNumber && lastCheckedContactNumberRef.current === mobileNumber) {
      return;
    }
    if (uhid && lastCheckedUHIDRef.current === uhid.trim()) {
      return;
    }

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }

    // Set the last checked values
    if (mobileNumber) {
      lastCheckedContactNumberRef.current = mobileNumber;
      setIsMobileNumberLoading(true);
    }
    if (uhid) {
      lastCheckedUHIDRef.current = uhid.trim();
    }

    try {
      const result = await checkExistingPatientsQuery({
        branchId: branchId,
        phoneNumber: mobileNumber || "",
        uhid: uhid || undefined,
      }).unwrap();

      if (isClosingDialogRef.current) {
        lastCheckedContactNumberRef.current = "";
        lastCheckedUHIDRef.current = "";
        return;
      }

      // Handle new response structure with registrations and preBookings
      const registrations = result.data?.registrations || [];
      const preBookings = result.data?.preBookings || [];
      const userLead = result.data?.userLead;

      if (registrations.length > 0 || preBookings.length > 0 || userLead) {
        setNoPatientFoundMessage(null);
        if (registrations.length > 0) {
          const mappedPatients = registrations.map((patient: any) => ({
            ...patient,
            name: patient.patientName || patient.name,
            branchName: patient.branchName || "N/A",
          }));
          setExistingPatients(mappedPatients);
          setPatientExistsDialogOpen(true);
        }
      } else {
        lastCheckedContactNumberRef.current = "";
        lastCheckedUHIDRef.current = "";
        if (mobileNumber) {
          setNoPatientFoundMessage("No patient found for the provided phone number");
        }
      }
    } catch (error) {
      console.error("Error checking existing patients:", error);
      lastCheckedContactNumberRef.current = "";
      lastCheckedUHIDRef.current = "";
    } finally {
      // Clear loading state only if it was a mobile number search
      if (mobileNumber) {
        setIsMobileNumberLoading(false);
      }
    }
  };

  // Handle mobile number change - check when it reaches 10 digits
  const handleMobileNumberChange = (field: string, value: string) => {
    formik.setFieldValue(field, value, false);

    // Clear "no patient found" message when user changes the number
    setNoPatientFoundMessage(null);

    // If form is read-only, don't check for existing patients
    if (isReadOnly) return;

    // Check if mobile number reaches 10 digits
    if (value.length === 10) {
      checkExistingPatients(value, undefined);
    }
  };

  // Handle UHID change - check when UHID is entered (debounced)
  const handleUHIDChange = (value: string) => {
    // If form is read-only, don't check for existing patients
    if (isReadOnly) return;
    
    if (value.trim().length > 0) {
      // Clear any existing timeout
      if (uhidSearchTimeoutRef.current) {
        clearTimeout(uhidSearchTimeoutRef.current);
      }
      
      // Debounce UHID search - wait a bit after user stops typing
      uhidSearchTimeoutRef.current = setTimeout(() => {
        checkExistingPatients(undefined, value.trim());
      }, 500); // Wait 500ms after user stops typing
    }
  };

  // Handle patient selection from dialog
  const handleSelectPatient = (patient: ExistingPatient) => {
    setSelectedPatient(patient);
    setPatientExistsDialogOpen(false);
    setIsReadOnly(true);
    setNoPatientFoundMessage(null);
    
    // Clear all errors and touched state before filling
    formik.setErrors({});
    formik.setTouched({});
    
    // Auto-fill Patient Details
    formik.setFieldValue("mobileNumber", patient.contactNumber || "", false);
    formik.setFieldValue("title", patient.patientTitle || "", false);
    formik.setFieldValue("patientName", patient.patientName || "", false);
    formik.setFieldValue("uhid", patient.uhid || "", false);
    
    // Auto-fill Address Details
    if (patient.address) {
      const addressData = {
        address: patient.address.address || "",
        pinCode: patient.address.pinCode || "",
        country: "", // Will be set in useEffect after countries data loads
        state: "", // Will be set in useEffect
        city: "", // Will be set in useEffect
        addressLine1: (patient.address as { addressLine1?: string })?.addressLine1 || "",
        addressLine2: (patient.address as { addressLine2?: string })?.addressLine2 || "",
      };
      
      formik.setFieldValue("address", addressData.address, false);
      formik.setFieldValue("pinCode", addressData.pinCode, false);
      formik.setFieldValue("addressLine1", addressData.addressLine1, false);
      formik.setFieldValue("addressLine2", addressData.addressLine2, false);
      // Avoid default India ("6") while resolving API country — prevents India state/city effects from running on foreign addresses
      if (patient.address.country) {
        formik.setFieldValue("country", "", false);
      }

      // Store original address details for restoration when switching back to Patient
      originalAddressRef.current = {
        pinCode: addressData.pinCode,
        country: "", // Will be updated in useEffect
        state: "", // Will be updated in useEffect
        city: "", // Will be updated in useEffect
        tehsil: patient.address?.tehsil || "", // Store tehsil name - will be converted to ID in useEffect
        area: patient.address?.area || "", // Store area name - will be converted to ID in useEffect
        address: addressData.address,
        addressLine1: addressData.addressLine1,
        addressLine2: addressData.addressLine2,
      };
      
      // Country, state and city will be set in useEffect after data loads
    }
    
    // Validate all fields after setting values to ensure no errors remain
    setTimeout(() => {
      formik.validateForm();
    }, 100);
  };

  // Update country ID when countries data is available
  useEffect(() => {
    if (!selectedPatient?.address?.country || !countriesData) return;
    
    const countryNameFromAPI = selectedPatient.address.country.trim();
    const countryId = getCountryId(countryNameFromAPI, countriesData);
    
    if (countryId) {
      formik.setFieldValue("country", countryId, false);
      console.log("Country found and set:", countryNameFromAPI, "->", countryId);

      if (originalAddressRef.current) {
        originalAddressRef.current.country = countryId;
      }

      // Non-India: state/city are free text from API (no states/cities master lists)
      if (countryId !== "6" && selectedPatient.address) {
        const a = selectedPatient.address;
        const st = a.state != null ? String(a.state).trim() : "";
        const ct = a.city != null ? String(a.city).trim() : "";
        formik.setFieldValue("state", st, false);
        formik.setFieldValue("city", ct, false);
        formik.setFieldValue("tehsil", "" as any, false);
        formik.setFieldValue("area", "" as any, false);
        if (originalAddressRef.current) {
          originalAddressRef.current.state = st;
          originalAddressRef.current.city = ct;
          originalAddressRef.current.tehsil = "";
          originalAddressRef.current.area = "";
        }
      }
    } else {
      console.warn("Country not found:", countryNameFromAPI);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, countriesData]);

  // Update state and city IDs when address data is available (India only)
  useEffect(() => {
    if (!selectedPatient?.address) return;
    if (formik.values.country !== "6") return;

    // Find state ID - case insensitive matching
    if (selectedPatient.address.state && statesData) {
      const statesList = Array.isArray(statesData) 
        ? statesData 
        : (statesData as any)?.data || [];
      
      if (statesList.length === 0) {
        console.warn("States list is empty");
        return;
      }
      
      const stateNameFromAPI = selectedPatient.address.state.trim();
      const state = statesList.find((s: any) => {
        const stateName = (s.name || s.state || "").toString().trim();
        return stateName.toLowerCase() === stateNameFromAPI.toLowerCase();
      });
      
      if (state) {
        const stateId = String(state.id);
        formik.setFieldValue("state", stateId, false);
        console.log("State found and set:", stateNameFromAPI, "->", stateId);
        
        // Update original address ref with state ID
        if (originalAddressRef.current) {
          originalAddressRef.current.state = stateId;
        }
      } else {
        console.warn("State not found:", stateNameFromAPI, "Available states:", statesList.map((s: any) => s.name || s.state));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, statesData, formik.values.country]);

  // Find city ID after state is set - separate useEffect to ensure state is set first (India only)
  useEffect(() => {
    if (formik.values.country !== "6") return;
    if (!selectedPatient?.address?.city || !formik.values.state) return;
    
    // Wait a bit for cities data to load after state is set
    const timer = setTimeout(() => {
      if (!citiesData) {
        console.warn("Cities data not loaded yet for state:", formik.values.state);
        return;
      }
      
      const citiesList = Array.isArray(citiesData)
        ? citiesData
        : (citiesData as any)?.data || [];
      
      if (citiesList.length === 0) {
        console.warn("Cities list is empty for state:", formik.values.state);
        return;
      }
      
      if (!selectedPatient?.address?.city) {
        console.warn("Selected patient address or city is not available");
        return;
      }
      
      const cityNameFromAPI = selectedPatient.address.city.trim();
      const city = citiesList.find((c: any) => {
        const cityName = (c.name || c.city || "").toString().trim();
        return cityName.toLowerCase() === cityNameFromAPI.toLowerCase();
      });
      
      if (city) {
        const cityId = String(city.id);
        formik.setFieldValue("city", cityId, false);
        console.log("City found and set:", cityNameFromAPI, "->", city.id);
        
        // Update original address ref with city ID
        if (originalAddressRef.current) {
          originalAddressRef.current.city = cityId;
        }
      } else {
        console.warn("City not found:", cityNameFromAPI, "Available cities:", citiesList.slice(0, 10).map((c: any) => c.name || c.city));
      }
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, formik.values.state, formik.values.country, citiesData]);

  // Find tehsil ID after city is set - separate useEffect to ensure city is set first (India only)
  useEffect(() => {
    if (formik.values.country !== "6") return;
    if (!selectedPatient?.address?.tehsil || !formik.values.city) return;
    
    // Wait a bit for tehsils data to load after city is set
    const timer = setTimeout(async () => {
      try {
        const tehsilsResult = await getTehsilsQuery({
          districtId: formik.values.city,
          ...(formik.values.pinCode ? { pincode: formik.values.pinCode.replace(/\D/g, "") } : {}),
        }).unwrap();
        
        const tehsilsList = Array.isArray(tehsilsResult?.data)
          ? tehsilsResult.data
          : [];
        
        if (tehsilsList.length === 0) {
          console.warn("Tehsils list is empty for city:", formik.values.city);
          return;
        }
        
        const tehsilNameFromAPI = selectedPatient.address?.tehsil?.trim();
        if (!tehsilNameFromAPI) {
          console.warn("Tehsil name not available in selected patient address");
          return;
        }
        
        const tehsil = tehsilsList.find((t: any) => {
          const tehsilName = (t.name || t.tehsil || "").toString().trim();
          return tehsilName.toLowerCase() === tehsilNameFromAPI.toLowerCase();
        });
        
        if (tehsil) {
          const tehsilId = String(tehsil.id);
          formik.setFieldValue("tehsil", tehsilId, false);
          console.log("Tehsil found and set:", tehsilNameFromAPI, "->", tehsilId);
          
          // Update original address ref with tehsil ID
          if (originalAddressRef.current) {
            originalAddressRef.current.tehsil = tehsilId;
          }
        } else {
          console.warn("Tehsil not found:", tehsilNameFromAPI, "Available tehsils:", tehsilsList.slice(0, 10).map((t: any) => t.name || t.tehsil));
        }
      } catch (error) {
        console.error("Error fetching tehsils:", error);
      }
    }, 200);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, formik.values.country, formik.values.city, formik.values.pinCode, getTehsilsQuery]);

  // Find area ID after tehsil is set - separate useEffect to ensure tehsil is set first (India only)
  useEffect(() => {
    if (formik.values.country !== "6") return;
    if (!selectedPatient?.address?.area || !formik.values.tehsil) return;
    
    // Wait a bit for areas data to load after tehsil is set
    const timer = setTimeout(async () => {
      try {
        const areasResult = await getAreasQuery({
          tehsilId: formik.values.tehsil,
          ...(formik.values.pinCode ? { pincode: formik.values.pinCode.replace(/\D/g, "") } : {}),
        }).unwrap();
        
        const areasList = Array.isArray(areasResult?.data)
          ? areasResult.data
          : [];
        
        if (areasList.length === 0) {
          console.warn("Areas list is empty for tehsil:", formik.values.tehsil);
          return;
        }
        
        const areaNameFromAPI = selectedPatient.address?.area?.trim();
        if (!areaNameFromAPI) {
          console.warn("Area name not available in selected patient address");
          return;
        }
        
        const area = areasList.find((a: any) => {
          const areaName = (a.name || a.area || "").toString().trim();
          return areaName.toLowerCase() === areaNameFromAPI.toLowerCase();
        });
        
        if (area) {
          const areaId = String(area.id);
          formik.setFieldValue("area", areaId, false);
          console.log("Area found and set:", areaNameFromAPI, "->", areaId);
          
          // Update original address ref with area ID
          if (originalAddressRef.current) {
            originalAddressRef.current.area = areaId;
          }
        } else {
          console.warn("Area not found:", areaNameFromAPI, "Available areas:", areasList.slice(0, 10).map((a: any) => a.name || a.area));
        }
      } catch (error) {
        console.error("Error fetching areas:", error);
      }
    }, 200);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, formik.values.country, formik.values.tehsil, formik.values.pinCode, getAreasQuery]);

  // Memoized close handler
  const handleDialogClose = useCallback(() => {
    if (!patientExistsDialogOpen) return;
    
    isClosingDialogRef.current = true;
    
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }
    
    lastCheckedContactNumberRef.current = "";
    setExistingPatients([]);
    setPatientExistsDialogOpen(false);
    
    setTimeout(() => {
      formik.setFieldValue("mobileNumber", "", false);
      formik.setFieldValue("uhid", "", false);
      // Clear any pending UHID search timeout
      if (uhidSearchTimeoutRef.current) {
        clearTimeout(uhidSearchTimeoutRef.current);
        uhidSearchTimeoutRef.current = null;
      }
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 500);
    }, 100);
  }, [formik, patientExistsDialogOpen]);

  const handleVisitorChange = (id: string, field: "nameSelect" | "name" | "aadharCardNo" | "passportNumber" | "nationalId" | "country", value: string) => {
    if (
      lockedVisitors[id] &&
      (field === "aadharCardNo" || field === "nameSelect" || field === "name" || field === "country")
    ) {
      return;
    }

    const currentVisitors = formik.values.visitors || [];
    const visitorIndex = currentVisitors.findIndex((v) => v.id === id);
    if (field === "aadharCardNo" && visitorIndex >= 0) {
      setActiveVisitorAadharId(id);
    }
    
    if (visitorIndex >= 0) {
      const updatedVisitors = currentVisitors.map((visitor) =>
        visitor.id === id ? { ...visitor, [field]: value } : visitor
      );
      formik.setFieldValue("visitors", updatedVisitors, false);

      // When nationality changes, clear touched/error for passport/nationalId so their
      // errors don't appear until the user actually touches those fields.
      if (field === "country") {
        formik.setFieldTouched(`visitors.${visitorIndex}.passportNumber`, false, false);
        formik.setFieldTouched(`visitors.${visitorIndex}.nationalId`, false, false);
        formik.setFieldError(`visitors.${visitorIndex}.passportNumber`, undefined);
        formik.setFieldError(`visitors.${visitorIndex}.nationalId`, undefined);
      }
      
      // Check for duplicate Aadhar Card numbers if field is aadharCardNo
      // Show error instantly when 12 digits are entered and it's a duplicate (only on the field being edited)
      if (field === "aadharCardNo") {
        let shouldLookupVisitor = false;
        const lookupAadhar = value.trim();
        if (!value || value.trim() === "") {
          // Empty value - clear duplicate error if exists
          const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.aadharCardNo;
          if (currentError === "Visitor Aadhar Card No. must be unique") {
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, undefined);
          }
          setLockedVisitors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } else if (value && value.trim().length === 12) {
          // Check for duplicates in updatedVisitors array (excluding current visitor)
          const duplicateCount = updatedVisitors.filter((visitor, idx) => 
            idx !== visitorIndex && visitor.aadharCardNo && visitor.aadharCardNo.trim() === value
          ).length;
          
          // If duplicate found, set error only on the current field being edited
          if (duplicateCount > 0) {
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, "Visitor Aadhar Card No. must be unique");
            formik.setFieldTouched(`visitors.${visitorIndex}.aadharCardNo`, true, false);
          } else {
            // No duplicate, clear duplicate error if exists and validate normally
            const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.aadharCardNo;
            if (currentError === "Visitor Aadhar Card No. must be unique") {
              formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, undefined);
            }
            // Validate field normally (for other validations like length, digits)
            setTimeout(() => {
              formik.validateField(`visitors.${visitorIndex}.aadharCardNo`);
            }, 0);
            shouldLookupVisitor = true;
          }
        } else if (value && value.trim().length < 12) {
          // If less than 12 digits, clear duplicate error (user is still typing)
          const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.aadharCardNo;
          if (currentError === "Visitor Aadhar Card No. must be unique") {
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, undefined);
          }
          setLockedVisitors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }

        if (shouldLookupVisitor && lookupAadhar.length === 12) {
          void handleVisitorAadharLookup(visitorIndex, lookupAadhar);
        }
      }
      
      // If field was previously invalid (touched and had error), validate on change
      // This allows errors to clear immediately when user corrects them
      const fieldPath = `visitors.${visitorIndex}.${field}`;
      const visitorTouched = Array.isArray(formik.touched.visitors) 
        ? (formik.touched.visitors[visitorIndex] as any)
        : undefined;
      const visitorErrors = Array.isArray(formik.errors.visitors)
        ? (formik.errors.visitors[visitorIndex] as any)
        : undefined;
      const isTouched = visitorTouched?.[field];
      const hasError = visitorErrors?.[field];
      
      // If field was touched and had an error (but not duplicate error), validate on change to clear error immediately
      if (isTouched && hasError && hasError !== "Visitor Aadhar Card No. must be unique") {
        setTimeout(() => {
          formik.validateField(fieldPath);
        }, 0);
      }
    }
  };

  // Mark all visitor fields as touched on submit
  const markAllVisitorFieldsTouched = () => {
    const currentVisitors = formik.values.visitors || [];
    const touchedVisitors = currentVisitors.map((visitor) => {
      const touchedVisitor: Partial<Record<keyof Visitor, boolean>> = {};
      (Object.keys(visitor) as (keyof Visitor)[]).forEach((key) => {
        touchedVisitor[key] = true;
      });
      return touchedVisitor;
    });

    formik.setTouched({ ...formik.touched, visitors: touchedVisitors } as any, false);
  };

  return (
    <GateEntryLayout title="" subModuleName="Patient Medicine Type">
      <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[28px] font-semibold leading-[120%] text-[#262D3B]">Patient Medicine Type</h1>
          <GoToHomeButton onClick={handleGoToHome} />
        </div>

        <form
          ref={formRef}
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            // Prevent multiple submissions while a request is already in progress
            if (formik.isSubmitting || isSubmitting) {
              return;
            }
            formik.setSubmitting(true);
            try {
            const errors = await formik.validateForm();
            if (Object.keys(errors).length > 0) {
              formik.setErrors(errors);

              // Mark all fields with errors as touched
              const touchedFields: Record<string, any> = {};
              const markFieldsAsTouched = (errorObj: any, path = "") => {
                Object.keys(errorObj).forEach((key) => {
                  const fieldPath = path ? `${path}.${key}` : key;
                  const error = errorObj[key];

                  if (typeof error === "string") {
                    touchedFields[fieldPath] = true;
                    // Special handling for visitors array error (empty array)
                    if (key === "visitors") {
                      touchedFields[key] = true;
                    }
                  } else if (Array.isArray(error)) {
                    if (key === "visitors") {
                      const visitorsTouched: any[] = [];
                      error.forEach((item, index) => {
                        if (item && typeof item === "object") {
                          const visitorTouched: any = {};
                          Object.keys(item).forEach((nestedKey) => {
                            visitorTouched[nestedKey] = true;
                            touchedFields[`${fieldPath}.${index}.${nestedKey}`] = true;
                          });
                          visitorsTouched[index] = visitorTouched;
                        }
                      });
                      if (!touchedFields[key]) {
                        touchedFields[key] = visitorsTouched;
                      }
                    } else {
                      error.forEach((item, index) => {
                        if (item && typeof item === "object") {
                          Object.keys(item).forEach((nestedKey) => {
                            touchedFields[`${fieldPath}.${index}.${nestedKey}`] = true;
                          });
                        }
                      });
                    }
                  } else if (error && typeof error === "object") {
                    markFieldsAsTouched(error, fieldPath);
                  }
                });
              };

              markFieldsAsTouched(errors);
              markAllVisitorFieldsTouched();
              const mergedTouched = { ...formik.touched, ...touchedFields };
              formik.setTouched(mergedTouched, false);

              scrollToFirstError(errors as typeof formik.errors);
              return;
            }

            await handleFormSubmit(formik.values);
            } finally {
              formik.setSubmitting(false);
            }
          }}
          className="space-y-6"
        >
          {/* Patient Details Section */}
          <PatientDetails
            formData={{
              mobileNumber: formik.values.mobileNumber || "",
              title: formik.values.title || "",
              patientName: formik.values.patientName || "",
              uhid: formik.values.uhid || "",
              whoVisited: (formik.values as any).whoVisited || "",
            }}
            onChange={(field, value) => {
              // Use special handler for mobile number
              if (field === "mobileNumber") {
                handleMobileNumberChange(field, value);
              } else if (field === "uhid") {
                formik.setFieldValue(field, value, false);
                // Check for existing patients when UHID is entered (debounced)
                if (value.trim().length > 0) {
                  handleUHIDChange(value);
                }
              } else if (field === "whoVisited") {
                const currentMode =
                  ((formik.values as any).whoVisited || "patient").toLowerCase() === "visitor"
                    ? "visitor"
                    : "patient";
                const targetMode = value.toLowerCase() === "visitor" ? "visitor" : "patient";

                // Save current mode address before switching.
                addressByVisitTypeRef.current[currentMode] = getAddressSnapshotFromValues(formik.values);

                formik.setFieldValue(field, value, false);

                // Reset address validation visibility on mode switch so
                // Visitor Address errors are not shown in Patient Address and vice versa.
                const addressFields = [
                  "pinCode",
                  "country",
                  "state",
                  "city",
                  "tehsil",
                  "area",
                  "address",
                  "addressLine1",
                  "addressLine2",
                ] as const;
                addressFields.forEach((addressField) => {
                  formik.setFieldTouched(addressField, false, false);
                  formik.setFieldError(addressField, undefined);
                });
                
                // Keep address details unchanged when switching whoVisited.
                // Only ensure at least one visitor row exists for Visitor flow.
                if (targetMode === "visitor") {
                  const visitorAddressSnapshot = addressByVisitTypeRef.current.visitor;
                  if (visitorAddressSnapshot) {
                    applyAddressSnapshot(visitorAddressSnapshot);
                  } else {
                    // First time entering Visitor mode: keep it isolated from Patient address.
                    applyAddressSnapshot({
                      pinCode: "",
                      country: "6",
                      state: "",
                      city: "",
                      tehsil: "",
                      area: "",
                      address: "",
                      addressLine1: "",
                      addressLine2: "",
                    });
                  }
                  // Auto-add one visitor if none exists
                  const currentVisitors = formik.values.visitors || [];
                  if (currentVisitors.length === 0) {
                    const newVisitor: Visitor = {
                      id: Date.now().toString(),
                      nameSelect: "",
                      name: "",
                      country: "Indian",
                      aadharCardNo: "",
                    };
                    formik.setFieldValue("visitors", [newVisitor], false);
                  }
                } else if (targetMode === "patient") {
                  const patientAddressSnapshot =
                    addressByVisitTypeRef.current.patient ||
                    (originalAddressRef.current
                      ? {
                          pinCode: originalAddressRef.current.pinCode || "",
                          country: originalAddressRef.current.country || "6",
                          state: originalAddressRef.current.state || "",
                          city: originalAddressRef.current.city || "",
                          tehsil: originalAddressRef.current.tehsil || "",
                          area: originalAddressRef.current.area || "",
                          address: originalAddressRef.current.address || "",
                          addressLine1: originalAddressRef.current.addressLine1 || "",
                          addressLine2: originalAddressRef.current.addressLine2 || "",
                        }
                      : null);

                  if (patientAddressSnapshot) {
                    applyAddressSnapshot(patientAddressSnapshot);
                  } else {
                    applyAddressSnapshot({
                      pinCode: "",
                      country: "6",
                      state: "",
                      city: "",
                      tehsil: "",
                      area: "",
                      address: "",
                      addressLine1: "",
                      addressLine2: "",
                    });
                  }
                }
              } else {
                formik.setFieldValue(field, value, false);
              }

              // Mark field as touched and validate immediately when value changes
              // This ensures errors show immediately when fields are emptied
              setTimeout(() => {
                formik.setFieldTouched(field, true, false);
                formik.validateField(field);
              }, 0);
            }}
            onBlur={(field) => {
              formik.setFieldTouched(field, true, false);
              formik.validateField(field);
              
              // Trigger immediate search when UHID field loses focus
              if (field === "uhid" && !isReadOnly && formik.values.uhid && formik.values.uhid.trim().length > 0) {
                // Clear any pending timeout and search immediately
                if (uhidSearchTimeoutRef.current) {
                  clearTimeout(uhidSearchTimeoutRef.current);
                  uhidSearchTimeoutRef.current = null;
                }
                checkExistingPatients(undefined, formik.values.uhid.trim());
              }
            }}
            fieldRefs={{
              mobileNumber: mobileNumberRef,
              title: titleRef,
              patientName: patientNameRef,
              uhid: uhidRef,
              whoVisited: whoVisitedRef,
            }}
            errors={getFormErrors()}
            readOnly={false}
            lockIdentityFields={true}
            isMobileNumberLoading={isMobileNumberLoading}
            mobileNumberMessage={noPatientFoundMessage || undefined}
          />

          {/* Conditionally render sections based on whoVisited */}
          {(formik.values as any).whoVisited?.toLowerCase() === "visitor" ? (
            <>
              {/* When Visitor is selected: Show Visitors Details first */}
              <VisitorsDetails
                visitors={(formik.values.visitors || []).map((v) => ({ ...v, id: v.id || Date.now().toString() })) as Visitor[]}
                onAddVisitor={handleAddVisitor}
                onRemoveVisitor={handleRemoveVisitor}
                onVisitorChange={handleVisitorChange}
                onVisitorBlur={(index, field) => {
                  const fieldName = field === "nameSelect" ? "nameSelect" : field === "name" ? "name" : field === "aadharCardNo" ? "aadharCardNo" : field === "passportNumber" ? "passportNumber" : field === "nationalId" ? "nationalId" : field === "country" ? "country" : field;
                  formik.setFieldTouched(`visitors.${index}.${fieldName}`, true, false);
                  
                  // Check for duplicate Aadhar Card numbers on blur if field is aadharCardNo
                  if (field === "aadharCardNo") {
                    const currentVisitors = formik.values.visitors || [];
                    const currentVisitorId = currentVisitors[index]?.id;
                    if (currentVisitorId) setActiveVisitorAadharId(currentVisitorId);
                    const currentValue = currentVisitors[index]?.aadharCardNo;

                    if (currentValue && currentValue.trim().length === 12) {
                      // Check for duplicates (excluding current index)
                      const duplicateCount = currentVisitors.filter((visitor, idx) => 
                        idx !== index && visitor.aadharCardNo && visitor.aadharCardNo.trim() === currentValue
                      ).length;

                      // If duplicate found, set error only on the current field
                      if (duplicateCount > 0) {
                        formik.setFieldError(`visitors.${index}.aadharCardNo`, "Visitor Aadhar Card No. must be unique");
                      } else {
                        // No duplicate, clear duplicate error if exists and validate normally
                        const currentError = (formik.errors.visitors?.[index] as any)?.aadharCardNo;
                        if (currentError === "Visitor Aadhar Card No. must be unique") {
                          formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
                        }
                        formik.validateField(`visitors.${index}.${fieldName}`);
                        void handleVisitorAadharLookup(index, currentValue.trim());
                      }
                    } else {
                      // Not 12 digits yet, validate normally
                      formik.validateField(`visitors.${index}.${fieldName}`);
                    }
                  } else if (field === "country") {
                    // Nationality changed — validate country, but do NOT touch passport/nationalId
                    // so their errors don't appear until the user actually interacts with those fields.
                    formik.validateField(`visitors.${index}.country`);
                  } else {
                    // Not aadharCardNo/country field, validate normally
                    formik.validateField(`visitors.${index}.${fieldName}`);
                  }
                }}
                visitorTitleRefs={visitorTitleRefs}
                visitorNameRefs={visitorNameRefs}
                visitorCountryRefs={visitorCountryRefs}
                visitorAadharRefs={visitorAadharRefs}
                visitorPassportRefs={visitorPassportRefs}
                visitorNationalIdRefs={visitorNationalIdRefs}
                countryOptions={[
                  { value: "Indian", label: "Indian" },
                  { value: "Nepal", label: "Nepal" },
                  { value: "Foreigner", label: "Foreigner" },
                ]}
                errors={getFormErrors()}
                visitorLookupLoading={visitorLookupLoading}
                lockedVisitors={lockedVisitors}
                disableFirstVisitorDelete={(formik.values as any).whoVisited?.toLowerCase() === "visitor"}
              />

              {/* Address Details Section - Show at bottom when Visitor is selected */}
              <AddressDetails
                title="Visitor Address Details"
                formData={{
                  pinCode: formik.values.pinCode || "",
                  country: formik.values.country || "",
                  state: formik.values.state || "",
                  city: formik.values.city || "",
                  tehsil: (formik.values as any).tehsil || "",
                  area: (formik.values as any).area || "",
                  address: formik.values.address || "",
                  addressLine1: (formik.values as any).addressLine1 || "",
                  addressLine2: (formik.values as any).addressLine2 || "",
                }}
                onChange={(field, value) => {
                  formik.setFieldValue(field, value, false);

                  // For select fields (country, state, city, tehsil, area), mark as touched and validate immediately
                  const selectFields = ["country", "state", "city", "tehsil", "area"] as string[];
                  if (selectFields.includes(field) && value && value.trim() !== "") {
                    setTimeout(() => {
                      formik.setFieldTouched(field, true, false);
                      formik.validateField(field);
                    }, 10);
                  } else {
                    // For input fields, mark as touched and validate immediately when value changes
                    setTimeout(() => {
                      formik.setFieldTouched(field, true, false);
                      formik.validateField(field);
                    }, 0);
                  }
                }}
                onBlur={(field) => {
                  formik.setFieldTouched(field, true, false);
                  formik.validateField(field);
                }}
                fieldRefs={{
                  pinCode: pinCodeRef,
                  country: countryRef,
                  state: stateRef,
                  city: cityRef,
                  tehsil: tehsilRef,
                  area: areaRef,
                  address: addressRef,
                  addressLine1: addressLine1Ref,
                  addressLine2: addressLine2Ref,
                }}
                errors={getFormErrors()}
                readOnly={false}
              />
            </>
          ) : (
            <>
              {/* When Patient is selected: Show Address Details first */}
              <AddressDetails
                title="Patient Address Details"
                formData={{
                  pinCode: formik.values.pinCode || "",
                  country: formik.values.country || "",
                  state: formik.values.state || "",
                  city: formik.values.city || "",
                  tehsil: (formik.values as any).tehsil || "",
                  area: (formik.values as any).area || "",
                  address: formik.values.address || "",
                  addressLine1: (formik.values as any).addressLine1 || "",
                  addressLine2: (formik.values as any).addressLine2 || "",
                }}
                onChange={(field, value) => {
                  formik.setFieldValue(field, value, false);

                  // For select fields (country, state, city, tehsil, area), mark as touched and validate immediately
                  const selectFields = ["country", "state", "city", "tehsil", "area"] as string[];
                  if (selectFields.includes(field) && value && value.trim() !== "") {
                    setTimeout(() => {
                      formik.setFieldTouched(field, true, false);
                      formik.validateField(field);
                    }, 10);
                  } else {
                    // For input fields, mark as touched and validate immediately when value changes
                    setTimeout(() => {
                      formik.setFieldTouched(field, true, false);
                      formik.validateField(field);
                    }, 0);
                  }
                }}
                onBlur={(field) => {
                  formik.setFieldTouched(field, true, false);
                  formik.validateField(field);
                }}
                fieldRefs={{
                  pinCode: pinCodeRef,
                  country: countryRef,
                  state: stateRef,
                  city: cityRef,
                  tehsil: tehsilRef,
                  area: areaRef,
                  address: addressRef,
                  addressLine1: addressLine1Ref,
                  addressLine2: addressLine2Ref,
                }}
                errors={getFormErrors()}
                readOnly={false}
              />

              {/* Visitors Details Section */}
              <VisitorsDetails
                visitors={(formik.values.visitors || []).map((v) => ({ ...v, id: v.id || Date.now().toString() })) as Visitor[]}
                onAddVisitor={handleAddVisitor}
                onRemoveVisitor={handleRemoveVisitor}
                onVisitorChange={handleVisitorChange}
                onVisitorBlur={(index, field) => {
                  const fieldName = field === "nameSelect" ? "nameSelect" : field === "name" ? "name" : field === "aadharCardNo" ? "aadharCardNo" : field === "passportNumber" ? "passportNumber" : field === "nationalId" ? "nationalId" : field === "country" ? "country" : field;
                  formik.setFieldTouched(`visitors.${index}.${fieldName}`, true, false);
                  
                  // Check for duplicate Aadhar Card numbers on blur if field is aadharCardNo
                  if (field === "aadharCardNo") {
                    const currentVisitors = formik.values.visitors || [];
                    const currentVisitorId = currentVisitors[index]?.id;
                    if (currentVisitorId) setActiveVisitorAadharId(currentVisitorId);
                    const currentValue = currentVisitors[index]?.aadharCardNo;

                    if (currentValue && currentValue.trim().length === 12) {
                      // Check for duplicates (excluding current index)
                      const duplicateCount = currentVisitors.filter((visitor, idx) => 
                        idx !== index && visitor.aadharCardNo && visitor.aadharCardNo.trim() === currentValue
                      ).length;

                      // If duplicate found, set error only on the current field
                      if (duplicateCount > 0) {
                        formik.setFieldError(`visitors.${index}.aadharCardNo`, "Visitor Aadhar Card No. must be unique");
                      } else {
                        // No duplicate, clear duplicate error if exists and validate normally
                        const currentError = (formik.errors.visitors?.[index] as any)?.aadharCardNo;
                        if (currentError === "Visitor Aadhar Card No. must be unique") {
                          formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
                        }
                        formik.validateField(`visitors.${index}.${fieldName}`);
                        void handleVisitorAadharLookup(index, currentValue.trim());
                      }
                    } else {
                      // Not 12 digits yet, validate normally
                      formik.validateField(`visitors.${index}.${fieldName}`);
                    }
                  } else if (field === "country") {
                    // Nationality changed — validate country, but do NOT touch passport/nationalId
                    // so their errors don't appear until the user actually interacts with those fields.
                    formik.validateField(`visitors.${index}.country`);
                  } else {
                    // Not aadharCardNo/country field, validate normally
                    formik.validateField(`visitors.${index}.${fieldName}`);
                  }
                }}
                visitorTitleRefs={visitorTitleRefs}
                visitorNameRefs={visitorNameRefs}
                visitorCountryRefs={visitorCountryRefs}
                visitorAadharRefs={visitorAadharRefs}
                visitorPassportRefs={visitorPassportRefs}
                visitorNationalIdRefs={visitorNationalIdRefs}
                countryOptions={[
                  { value: "Indian", label: "Indian" },
                  { value: "Nepal", label: "Nepal" },
                  { value: "Foreigner", label: "Foreigner" },
                ]}
                errors={getFormErrors()}
                visitorLookupLoading={visitorLookupLoading}
                lockedVisitors={lockedVisitors}
                disableFirstVisitorDelete={(formik.values as any).whoVisited?.toLowerCase() === "visitor"}
              />
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-start gap-4">
            {gatePermissions.canAdd && (
              <Button 
                type="submit" 
                variant="primary" 
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Submit
              </Button>
            )}
            <BackToPreviousPageButton onClick={handleBack} />
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {setShowSuccessDialog(false); handleBack()}}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
      />

      {/* Error Dialog */}
      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => setShowApiErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
      />

      {/* Visitor Already Exists Dialog */}
      <Dialog
        open={visitorExistsDialogOpen}
        onClose={() => handleVisitorDialogClose()}
        title=""
        width={1400}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center rounded-[8px] border border-[#0B8C00]/20 bg-[#0B8C00]/20 px-5 py-4">
            <p className="text-[28px] font-medium leading-[120%] text-[#0B8C00]">
              Visitor Already Exists
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead position="first">Sr no.</TableHead>
                <TableHead sortable>Visitor Name</TableHead>
                <TableHead sortable>Contact Number</TableHead>
                <TableHead sortable>Aadhar Card Number</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {existingVisitors.length === 0 ? (
                <TableRow>
                  <TableData colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                    {isVisitorLookupLoading ? "Loading visitors..." : "No visitors found"}
                  </TableData>
                </TableRow>
              ) : (
                existingVisitors.map((visitor, index) => {
                  const rowKey = visitor.id ?? index;
                  const isSelecting = visitorDialogSelectingId === rowKey;
                  const displayName = visitor.visitorTitle
                    ? `${visitor.visitorTitle} ${visitor.visitorName}`
                    : visitor.visitorName;
                  return (
                    <TableRow key={rowKey} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                      <TableData variant="primary">{index + 1}</TableData>
                      <TableData>{displayName || "-"}</TableData>
                      <TableData>{visitor.visitorContactNumber || "-"}</TableData>
                      <TableData>{visitor.visitorAadharCardNo || "-"}</TableData>
                      <TableData>
                        <button
                          type="button"
                          onClick={() => void handleSelectVisitorFromDialog(visitor, rowKey)}
                          disabled={visitorDialogSelectingId !== null}
                          className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] disabled:cursor-not-allowed disabled:opacity-75"
                        >
                          {isSelecting ? (
                            <svg
                              className="h-4 w-4 animate-spin text-[#0B8C00]"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            "Select"
                          )}
                        </button>
                      </TableData>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Dialog>

      {/* Patient Already Exists Dialog */}
      <Dialog
        open={patientExistsDialogOpen}
        onClose={handleDialogClose}
        title="Patient"
        width={1440}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center rounded-[8px] border border-[#0B8C00]/20 bg-[#0B8C00]/20 px-5 py-4">
            <p className="text-[28px] font-medium leading-[120%] text-[#0B8C00]">
              Patient Already Exists
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead position="first">Sr no.</TableHead>
                <TableHead sortable>UHID</TableHead>
                <TableHead sortable>Name</TableHead>
                <TableHead sortable>Branch Name</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {existingPatients.length === 0 ? (
                <TableRow>
                  <TableData
                    colSpan={5}
                    className="py-12 text-center text-sm text-[#9CA3AF]"
                  >
                    No patients found
                  </TableData>
                </TableRow>
              ) : (
                existingPatients.map((patient, index) => (
                  <TableRow
                    key={patient.id}
                    className="bg-white transition-colors hover:bg-[#F7FAF7]"
                  >
                    <TableData variant="primary">{index + 1}</TableData>
                    <TableData>{patient.uhid || "-"}</TableData>
                    <TableData>
                      {[patient.patientTitle, patient.patientName || patient.name]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </TableData>
                    <TableData>{patient.branchName || "N/A"}</TableData>
                    <TableData>
                      <button
                        type="button"
                        onClick={() => handleSelectPatient(patient)}
                        className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                      >
                        Select
                      </button>
                    </TableData>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Dialog>
    </GateEntryLayout>
  );
}
