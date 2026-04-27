"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useFormik } from "formik";
import GateEntryLayout from "@/components/gate/GateEntryLayout";
import { GoToHomeButton, BackToPreviousPageButton, Button, MessageDialog, Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableData } from "@/components/ui";
import { AddressDetails, PatientVisitorDetails, IPDAdditionalDetails } from "@/components/forms";
import { gateIPDVisitorSchema, type GateIPDVisitorFormValues, type IPDVisitorItemFormValues } from "@/lib/validation/gateSchemas";
import { useVisitorEntryMutation, useLazyGetSpecificIpdPatientDetailByBranchIdQuery, useLazyGetVisitorByAadharQuery, type VisitorByAadharItem } from "@/store/api/gateApi";
import { useGetCountriesQuery, useGetStatesQuery, useGetCitiesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery, useLazyGetPincodeQuery } from "@/store/api/publicApi";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectPermissionsMap } from "@/store/slices/authSlice";
import { getSubModulePermissions } from "@/utils/permission";

type IPDVerifyPatient = {
  patientId: number;
  uhid: string;
  patientName: string;
  patientTitle: string | null;
  buildingId: number;
  roomId: number;
  bedNumber: string | null;
  roomNumber: string | null;
};

export default function GateIPDVisitorPage() {
  const router = useRouter();
  const userBranchId = useAppSelector(selectUserBranchId);
  const branchId = userBranchId ?? 1;
  const permissionsMap = useAppSelector(selectPermissionsMap);
  const gatePermissions = useMemo(
    () => getSubModulePermissions(permissionsMap, "Gate", "IPD Visitor"),
    [permissionsMap]
  );
  const [visitorEntry, { isLoading: isSubmitting }] = useVisitorEntryMutation();
  const [getIpdPatientByBranch, { isLoading: isVerifyLoading }] = useLazyGetSpecificIpdPatientDetailByBranchIdQuery();
  const [getVisitorByAadhar] = useLazyGetVisitorByAadharQuery();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyPatients, setVerifyPatients] = useState<IPDVerifyPatient[]>([]);
  const [verifyVisitorIndex, setVerifyVisitorIndex] = useState(0);
  const [verifiedVisitors, setVerifiedVisitors] = useState<Record<number, boolean>>({});
  const [patientTitleFromApiMap, setPatientTitleFromApiMap] = useState<Record<number, boolean>>({});
  /** When true for a visitor index + field, that field was filled from API and is read-only with cursor block */
  const [ipdFieldsFromApiMap, setIpdFieldsFromApiMap] = useState<Record<number, { building: boolean; roomNumber: boolean; bedNumber: boolean }>>({});
  const [visitorExistsDialogOpen, setVisitorExistsDialogOpen] = useState(false);
  const [existingVisitors, setExistingVisitors] = useState<VisitorByAadharItem[]>([]);
  const [visitorDialogVisitorIndex, setVisitorDialogVisitorIndex] = useState(0);
  const [visitorLookupLoading, setVisitorLookupLoading] = useState<Record<number, boolean>>({});
  const [visitorDialogSelectingId, setVisitorDialogSelectingId] = useState<number | string | null>(null);
  const [aadharLockedVisitors, setAadharLockedVisitors] = useState<Record<number, boolean>>({});
  const [mobileEditableVisitors, setMobileEditableVisitors] = useState<Record<number, boolean>>({});
  const [titleEditableVisitors, setTitleEditableVisitors] = useState<Record<number, boolean>>({});

  // Fetch countries, states, and cities to get names from IDs
  const { data: countriesData } = useGetCountriesQuery({});
  const { data: statesData } = useGetStatesQuery({}); // Fetch all states
  const { data: citiesData } = useGetCitiesQuery({}); // Fetch all cities
  
  // Lazy queries for tehsils and areas - fetch per visitor during form submission
  const [getTehsilsQuery] = useLazyGetTehsilsQuery();
  const [getAreasQuery] = useLazyGetAreasQuery();
  const [getPincodeQuery] = useLazyGetPincodeQuery();

  // Refs for scrolling/focusing invalid fields
  const mobileNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const aadharCardNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const visitorTitleRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const visitorNameRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const patientTitleRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const patientNameRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const purposeRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const pinCodeRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const countryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const stateRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const cityRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const tehsilRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const areaRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const addressRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const searchTypeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const phoneNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const uhidRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const buildingRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const roomNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const bedNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const isVisitorLookupLoading = Object.values(visitorLookupLoading).some(Boolean);

  const createEmptyVisitor = (id: string): IPDVisitorItemFormValues => ({
    id,
    mobileNumber: "",
    aadharCardNumber: "",
    visitorNameSelect: "",
    visitorName: "",
    patientNameSelect: "",
    patientName: "",
    purpose: "",
    pinCode: "",
    country: "6", // India is auto-selected
    state: "",
    city: "",
    tehsil: "" as any,
    area: "" as any,
    address: "",
    addressLine1: "",
    addressLine2: "",
    searchType: "",
    phoneNumber: "",
    uhid: "",
    building: "",
    roomNumber: "",
    bedNumber: "",
  });

  const initialValues: GateIPDVisitorFormValues = {
    visitors: [createEmptyVisitor("1")],
  };

  // Form ref for arrow key navigation
  const formRef = useRef<HTMLFormElement>(null);
  
  // Enable arrow key navigation for form fields
  // When navigating to a select field, trigger validation
  useArrowKeyNavigation(formRef, true, (fieldName) => {
    // Validate the select field when navigating to it
    // Note: fieldName will be like "visitorTitle" or "patientTitle" from data-field attribute
    // We need to map it to the actual formik field path
    // Find the visitor index by checking which visitor's field is currently focused
    const activeElement = document.activeElement;
    let visitorIndex = 0; // Default to first visitor
    
    // Try to find the visitor index by checking the active element's parent
    if (activeElement) {
      const visitorContainer = activeElement.closest('[data-visitor-index]');
      if (visitorContainer) {
        const indexAttr = visitorContainer.getAttribute('data-visitor-index');
        if (indexAttr !== null) {
          visitorIndex = parseInt(indexAttr, 10);
        }
      } else {
        // Fallback: try to find by checking form structure
        const form = formRef.current;
        if (form) {
          const allVisitorContainers = form.querySelectorAll('[data-visitor-index]');
          for (let i = 0; i < allVisitorContainers.length; i++) {
            if (allVisitorContainers[i].contains(activeElement)) {
              const indexAttr = allVisitorContainers[i].getAttribute('data-visitor-index');
              if (indexAttr !== null) {
                visitorIndex = parseInt(indexAttr, 10);
                break;
              }
            }
          }
        }
      }
    }
    
    const fieldMap: Record<string, string> = {
      visitorTitle: `visitors[${visitorIndex}].visitorNameSelect`,
      patientTitle: `visitors[${visitorIndex}].patientNameSelect`,
      country: `visitors[${visitorIndex}].country`,
      state: `visitors[${visitorIndex}].state`,
      city: `visitors[${visitorIndex}].city`,
      searchType: `visitors[${visitorIndex}].searchType`,
    };
    const formikField = fieldMap[fieldName];
    if (formikField) {
      formik.setFieldTouched(formikField, true, false);
      formik.validateField(formikField);
    }
  });

  const formik = useFormik<GateIPDVisitorFormValues>({
    initialValues,
    validationSchema: gateIPDVisitorSchema,
    validateOnChange: false,
    validateOnBlur: true, // Enable validation on blur
    validate: (values) => {
      const errors: any = {};
      
      if (!values.visitors || values.visitors.length <= 1) {
        return errors;
      }
      
      // Check for duplicate mobile numbers
      const mobileNumberMap = new Map<string, number[]>();
      values.visitors.forEach((visitor, index) => {
        const mobileNumber = visitor.mobileNumber?.trim();
        if (mobileNumber && mobileNumber.length > 0) {
          if (!mobileNumberMap.has(mobileNumber)) {
            mobileNumberMap.set(mobileNumber, []);
          }
          mobileNumberMap.get(mobileNumber)!.push(index);
        }
      });
      
      mobileNumberMap.forEach((indices, mobileNumber) => {
        if (indices.length > 1) {
          if (!errors.visitors) {
            errors.visitors = [];
          }
          // Only show error on duplicates (skip the first occurrence, show error on subsequent ones)
          indices.slice(1).forEach((index) => {
            if (!errors.visitors[index]) {
              errors.visitors[index] = {};
            }
            errors.visitors[index].mobileNumber = "Mobile Number must be unique across all visitors";
          });
        }
      });
      
      // Check for duplicate Aadhar card numbers
      const aadharNumberMap = new Map<string, number[]>();
      values.visitors.forEach((visitor, index) => {
        const aadharNumber = visitor.aadharCardNumber?.trim();
        if (aadharNumber && aadharNumber.length > 0) {
          if (!aadharNumberMap.has(aadharNumber)) {
            aadharNumberMap.set(aadharNumber, []);
          }
          aadharNumberMap.get(aadharNumber)!.push(index);
        }
      });
      
      aadharNumberMap.forEach((indices, aadharNumber) => {
        if (indices.length > 1) {
          if (!errors.visitors) {
            errors.visitors = [];
          }
          // Only show error on duplicates (skip the first occurrence, show error on subsequent ones)
          indices.slice(1).forEach((index) => {
            if (!errors.visitors[index]) {
              errors.visitors[index] = {};
            }
            errors.visitors[index].aadharCardNumber = "Aadhar Card Number must be unique across all visitors";
          });
        }
      });
      
      return errors;
    },
    onSubmit: async () => {},
  });

  // Helper function to convert Formik errors to flat structure for components
  // Only show errors for fields that have been touched (blurred)
  const getFormErrors = (index: number): Record<string, string> => {
    const visitorErrors = Array.isArray(formik.errors.visitors)
      ? (formik.errors.visitors[index] as any)
      : undefined;
    const visitorTouched = Array.isArray(formik.touched.visitors)
      ? (formik.touched.visitors[index] as any)
      : undefined;

    if (!visitorErrors || !visitorTouched) {
      return {};
    }

    // Only return errors for fields that have been touched
    const errors: Record<string, string> = {};
    Object.keys(visitorErrors).forEach((key) => {
      if (visitorTouched[key] && typeof visitorErrors[key] === "string") {
        errors[key] = visitorErrors[key];
      }
    });

    return errors;
  };

  const applyIpdPatientToVisitor = (index: number, patient: IPDVerifyPatient) => {
    const title = (patient.patientTitle || "").trim() || "";
    const name = (patient.patientName || "").trim();
    const buildingVal = patient.buildingId != null ? String(patient.buildingId) : "";
    const roomVal = (patient.roomNumber || (patient.roomId != null ? String(patient.roomId) : "")) || "";
    const bedVal = (patient.bedNumber || "") || "";
    const visitors = formik.values.visitors || [];
    const indicesToUpdate = index === 0 ? visitors.map((_, i) => i) : [index];
    indicesToUpdate.forEach((i) => {
      formik.setFieldValue(`visitors[${i}].patientNameSelect`, title, false);
      formik.setFieldValue(`visitors[${i}].patientName`, name, false);
      formik.setFieldValue(`visitors[${i}].uhid`, patient.uhid || "", false);
      formik.setFieldValue(`visitors[${i}].building`, buildingVal, false);
      formik.setFieldValue(`visitors[${i}].roomNumber`, roomVal, false);
      formik.setFieldValue(`visitors[${i}].bedNumber`, bedVal, false);
      formik.setFieldTouched(`visitors[${i}].patientNameSelect`, true, false);
      formik.setFieldTouched(`visitors[${i}].patientName`, true, false);
      formik.setFieldError(`visitors[${i}].patientNameSelect`, undefined);
      formik.setFieldError(`visitors[${i}].patientName`, undefined);
    });
    const newVerified = { ...verifiedVisitors };
    const newTitleFromApi = { ...patientTitleFromApiMap };
    const newIpdFromApi = { ...ipdFieldsFromApiMap };
    indicesToUpdate.forEach((i) => {
      newVerified[i] = true;
      newTitleFromApi[i] = !!title;
      newIpdFromApi[i] = {
        building: !!buildingVal,
        roomNumber: !!roomVal,
        bedNumber: !!bedVal,
      };
    });
    setVerifiedVisitors(newVerified);
    setPatientTitleFromApiMap(newTitleFromApi);
    setIpdFieldsFromApiMap(newIpdFromApi);
  };

  const handleVerify = async (index: number) => {
    const visitor = formik.values.visitors?.[index];
    if (!visitor) return;
    const searchType = (visitor.searchType || "").trim();
    const uhid = (visitor.uhid || "").trim();
    const phoneNumber = (visitor.phoneNumber || "").trim();
    if (searchType === "UHID" && (uhid.length < 9 || uhid.length > 20)) {
      formik.setFieldTouched(`visitors[${index}].uhid`, true, false);
      formik.validateField(`visitors[${index}].uhid`);
      return;
    }
    if (searchType === "Phone" && phoneNumber.length !== 10) {
      formik.setFieldTouched(`visitors[${index}].phoneNumber`, true, false);
      formik.validateField(`visitors[${index}].phoneNumber`);
      return;
    }
    try {
      const res = await getIpdPatientByBranch({
        branchId,
        uhid: searchType === "UHID" ? uhid : undefined,
        phoneNumber: searchType === "Phone" ? phoneNumber : undefined,
      }).unwrap();
      if (!res.success || res.data == null) {
        setVerifyPatients([]);
        setVerifyVisitorIndex(index);
        setVerifyDialogOpen(true);
        return;
      }
      const list: IPDVerifyPatient[] = Array.isArray(res.data)
        ? res.data.map((p: any) => ({
            patientId: p.patientId,
            uhid: p.uhid || "",
            patientName: (p.patientName || "").trim(),
            patientTitle: p.patientTitle ?? null,
            buildingId: p.buildingId,
            roomId: p.roomId,
            bedNumber: p.bedNumber ?? null,
            roomNumber: p.roomNumber ?? null,
          }))
        : [
            {
              patientId: (res.data as any).patientId,
              uhid: (res.data as any).uhid || "",
              patientName: ((res.data as any).patientName || "").trim(),
              patientTitle: (res.data as any).patientTitle ?? null,
              buildingId: (res.data as any).buildingId,
              roomId: (res.data as any).roomId,
              bedNumber: (res.data as any).bedNumber ?? null,
              roomNumber: (res.data as any).roomNumber ?? null,
            },
          ];
      // Always show dialog so user can view details and confirm by selecting (UHID single result or Phone multiple)
      setVerifyPatients(list);
      setVerifyVisitorIndex(index);
      setVerifyDialogOpen(true);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to verify IPD patient.";
      setApiErrorMessage(msg);
      setShowApiErrorDialog(true);
    }
  };

  const handleVerifyDialogClose = () => {
    setVerifyDialogOpen(false);
    setVerifyPatients([]);
  };

  const handleSelectPatientFromVerify = (patient: IPDVerifyPatient) => {
    applyIpdPatientToVisitor(verifyVisitorIndex, patient);
    handleVerifyDialogClose();
  };

  const handleGoToHome = () => {
    router.push("/gate");
  };

  const handleAddMore = () => {
    const currentVisitors = formik.values.visitors || [];
    if (currentVisitors.length >= 5) {
      alert("Maximum 5 visitors allowed");
      return;
    }
    const first = currentVisitors[0];
    const newVisitor = createEmptyVisitor(Date.now().toString());
    if (first) {
      newVisitor.searchType = first.searchType || "";
      newVisitor.phoneNumber = first.phoneNumber || "";
      newVisitor.uhid = first.uhid || "";
      newVisitor.patientNameSelect = first.patientNameSelect || "";
      newVisitor.patientName = first.patientName || "";
      newVisitor.building = first.building || "";
      newVisitor.roomNumber = first.roomNumber || "";
      newVisitor.bedNumber = first.bedNumber || "";
    }
    const newIndex = currentVisitors.length;
    formik.setFieldValue("visitors", [...currentVisitors, newVisitor], false);
    if (first && verifiedVisitors[0]) {
      setVerifiedVisitors((prev) => ({ ...prev, [newIndex]: true }));
      setPatientTitleFromApiMap((prev) => ({ ...prev, [newIndex]: !!patientTitleFromApiMap[0] }));
      setIpdFieldsFromApiMap((prev) => ({
        ...prev,
        [newIndex]: ipdFieldsFromApiMap[0] ?? { building: false, roomNumber: false, bedNumber: false },
      }));
    }
    setTimeout(() => {
      formik.validateForm();
    }, 0);
  };

  const handleRemoveVisitor = (index: number) => {
    const currentVisitors = formik.values.visitors || [];
    if (currentVisitors.length <= 1) return;
    const updated = currentVisitors.filter((_, i) => i !== index);
    
    // Remove visitor from form values
    formik.setFieldValue("visitors", updated, false);
    
    // Clear errors and touched state for the removed visitor by filtering them out
    if (Array.isArray(formik.errors.visitors)) {
      const updatedErrors = formik.errors.visitors.filter((_, i) => i !== index);
      if (updatedErrors.length === 0) {
        // If no errors left, clear the visitors errors entirely
        const newErrors = { ...formik.errors };
        delete (newErrors as any).visitors;
        formik.setErrors(newErrors);
      } else {
        // Update with filtered errors
        formik.setFieldError("visitors", updatedErrors as any);
      }
    }
    
    if (Array.isArray(formik.touched.visitors)) {
      const updatedTouched = formik.touched.visitors.filter((_, i) => i !== index);
      formik.setFieldTouched("visitors", updatedTouched.length > 0 ? updatedTouched as any : []);
    }
    
    // Revalidate to check if duplicate errors should be cleared
    setTimeout(() => {
      formik.validateForm();
    }, 0);
  };

  const scrollToVisitorField = (index: number, field: keyof IPDVisitorItemFormValues) => {
    let target: HTMLElement | null = null;

    switch (field) {
      case "mobileNumber":
        target = mobileNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "aadharCardNumber":
        target = aadharCardNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "visitorNameSelect":
        target = visitorTitleRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "visitorName":
        target = visitorNameRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "patientNameSelect":
        target = patientTitleRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "patientName":
        target = patientNameRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "purpose":
        target = purposeRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "pinCode":
        target = pinCodeRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "country":
        target = countryRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "state":
        target = stateRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "city":
        target = cityRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "tehsil" as any:
        target = tehsilRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "area" as any:
        target = areaRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "address":
        target = addressRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "searchType":
        target = searchTypeRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "phoneNumber":
        target = phoneNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "uhid":
        target = uhidRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "building":
        target = buildingRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "roomNumber":
        target = roomNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "bedNumber":
        target = bedNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      default:
        break;
    }

    if (!target) return;

    setTimeout(() => {
      target?.scrollIntoView({ behavior: "smooth", block: "center" });

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.focus();
      } else {
        const triggerButton = target.querySelector('button[type="button"]');
        if (triggerButton instanceof HTMLElement) {
          setTimeout(() => {
            triggerButton.focus();
          }, 150);
        }
      }
    }, 100);
  };

  // Ref → target ref according to sequence (same as form layout: first field, then next, then next).
  // Sequence per visitor: Personal (mobile, aadhar, Title, Visitor Name, Patient Title, Patient Name, purpose) → Address → IPD Additional (searchType, phone/uhid, building, room, bed).
  const IPD_VISITOR_FIELD_ORDER: (keyof IPDVisitorItemFormValues)[] = [
    "mobileNumber",       // → mobileNumberRefs
    "aadharCardNumber",   // → aadharCardNumberRefs
    "visitorNameSelect",  // → visitorTitleRefs (Title)
    "visitorName",        // → visitorNameRefs
    "patientNameSelect",  // → patientTitleRefs
    "patientName",       // → patientNameRefs
    "purpose",           // → purposeRefs
    "pinCode",           // → pinCodeRefs
    "country",           // → countryRefs
    "state",             // → stateRefs
    "city",              // → cityRefs
    "tehsil" as any,     // → tehsilRefs
    "area" as any,       // → areaRefs
    "address",           // → addressRefs
    "searchType",        // → searchTypeRefs
    "phoneNumber",       // → phoneNumberRefs
    "uhid",              // → uhidRefs
    "building",          // → buildingRefs
    "roomNumber",        // → roomNumberRefs
    "bedNumber",         // → bedNumberRefs
  ];

  // Use validationErrors when provided (e.g. from validateForm() on submit) so we don't rely on
  // formik.errors which may not be updated yet. Ensures we scroll/focus first invalid field in sequence.
  const scrollToFirstError = (validationErrors?: typeof formik.errors) => {
    const errors = (validationErrors?.visitors ?? formik.errors.visitors) as Array<Partial<IPDVisitorItemFormValues>> | undefined;
    const values = formik.values.visitors;
    if (!errors || !Array.isArray(errors) || !values) return;

    for (let i = 0; i < errors.length; i++) {
      const err = errors[i];
      if (!err) continue;

      for (const field of IPD_VISITOR_FIELD_ORDER) {
        if ((err as any)[field]) {
          scrollToVisitorField(i, field);
          return;
        }
      }
    }
  };

  // Mark all IPD visitor fields as touched so validation messages show on submit
  const markAllVisitorFieldsTouched = () => {
    const currentVisitors = formik.values.visitors || [];
    const touchedVisitors = currentVisitors.map((visitor) => {
      const touchedVisitor: Partial<Record<keyof IPDVisitorItemFormValues, boolean>> = {};
      (Object.keys(visitor) as (keyof IPDVisitorItemFormValues)[]).forEach((key) => {
        touchedVisitor[key] = true;
      });
      return touchedVisitor;
    });

    formik.setTouched({ visitors: touchedVisitors } as any, false);
  };

  // Fetch visitors by Aadhaar card number and open "Visitor Already Exists" dialog.
  // For IPD visitor we always hit API again whenever the 12-digit Aadhaar changes (no caching).
  const handleVisitorAadharLookup = async (index: number, overrideAadhar?: string) => {
    const visitor = formik.values.visitors?.[index];
    if (!visitor) return;

    const aadhar = ((overrideAadhar ?? visitor.aadharCardNumber) || "").trim();
    // Only trigger lookup when Aadhaar has exactly 12 digits
    if (aadhar.length !== 12) return;

    try {
      setVisitorLookupLoading((prev) => ({ ...prev, [index]: true }));
      const res = await getVisitorByAadhar({
        visitorAadharCardNo: aadhar,
      }).unwrap();

      const list = Array.isArray(res.data)
        ? res.data
        : res.data
          ? [res.data]
          : [];

      // Only open dialog when we actually have at least one existing visitor.
      if (list.length > 0) {
        setExistingVisitors(list);
        setVisitorDialogVisitorIndex(index);
        setVisitorExistsDialogOpen(true);
      } else {
        // Treat Aadhaar as new – just clear any previous existing list.
        setExistingVisitors([]);
      }
    } catch (error) {
      console.error("Error fetching visitors by Aadhaar (IPD Visitor):", error);
      // On error, clear existing visitors and keep dialog closed.
      setExistingVisitors([]);
    } finally {
      setVisitorLookupLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Get names from IDs for country, state, and city
  const getCountryName = (countryId: string): string => {
    const country = countriesData?.data?.find((c) => c.id.toString() === countryId);
    return country?.name || countryId;
  };

  const getStateName = (stateId: string): string => {
    const state = statesData?.data?.find((s) => s.id.toString() === stateId);
    return state?.name || stateId;
  };

  const getCityName = (cityId: string): string => {
    const city = citiesData?.data?.find((c) => c.id.toString() === cityId);
    return city?.name || cityId;
  };

  // Helper functions to get tehsil and area names from IDs
  const getTehsilName = async (tehsilId: string, cityId: string): Promise<string> => {
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

  const getAreaName = async (areaId: string, tehsilId: string): Promise<string> => {
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

  const handleVisitorDialogClose = (options?: { skipClearAadhar?: boolean }) => {
    setVisitorExistsDialogOpen(false);
    setExistingVisitors([]);

    // If user closes the dialog without selecting a visitor, clear Aadhaar so they can type a new one.
    // When closing after selecting a visitor, skip clearing so the filled Aadhaar stays.
    if (options?.skipClearAadhar) return;
    const index = visitorDialogVisitorIndex;
    const visitors = formik.values.visitors || [];
    if (visitors[index]) {
      formik.setFieldValue(`visitors[${index}].aadharCardNumber`, "", false);
      formik.setFieldTouched(`visitors[${index}].aadharCardNumber`, false, false);
      formik.setFieldError(`visitors[${index}].aadharCardNumber`, undefined);
    }
  };

  // When a visitor is selected from the "Visitor Already Exists" dialog,
  // auto-fill Visitor + Address fields on the form.
  const handleSelectVisitorFromDialog = async (
    visitor: VisitorByAadharItem,
    rowKey: number | string,
  ) => {
    if (visitorDialogSelectingId !== null) return;
    setVisitorDialogSelectingId(rowKey);

    try {
      const visitors = formik.values.visitors || [];
      const index = visitorDialogVisitorIndex;
      if (!visitors[index]) return;

      const current = visitors[index];

      const title = (visitor.visitorTitle || "").trim() || "Mr";
      const name = (visitor.visitorName || "").trim();

      // Map country/state/city using a combination of pincode and master data
      let countryId = current.country || "6";
      const apiCountryName = (visitor.visitorCountry || "").trim().toLowerCase();

      const pinCodeFromApi = ((visitor as any).visitorPinCode || current.pinCode || "").toString().trim();

      // Prefer pincode API for resolving state/district/tehsil/area IDs
      let stateId = current.state || "";
      let cityId = current.city || "";
      let tehsilId = (current as any).tehsil || "";
      let areaId = (current as any).area || "";

      if (pinCodeFromApi && apiCountryName === "india") {
        try {
          const result = await getPincodeQuery(pinCodeFromApi.replace(/\D/g, "")).unwrap();
          const pincodeData = result?.data;
          const dataArray = Array.isArray(pincodeData) ? pincodeData : pincodeData ? [pincodeData] : [];
          const selected = dataArray[0];
          if (selected) {
            if (selected.state_id) {
              stateId = String(selected.state_id);
            }
            if (selected.district_id) {
              cityId = String(selected.district_id);
            }
            if (selected.tehsil_id) {
              tehsilId = String(selected.tehsil_id);
            }
            if (selected.area_id) {
              areaId = String(selected.area_id);
            }
          }
        } catch (error) {
          console.error("Error fetching pincode for visitor auto-fill (IPD Visitor):", error);
        }
      }

      // If state/city still not resolved from pincode, fall back to name-based mapping
      if (apiCountryName && countriesData?.data) {
        const matchCountry = countriesData.data.find(
          (c: any) => (c.name || "").toLowerCase() === apiCountryName,
        );
        if (matchCountry) {
          countryId = matchCountry.id.toString();
        }
      }

      const apiStateName = (visitor.visitorState || "").trim().toLowerCase();
      if (!stateId && apiStateName && statesData?.data) {
        const matchState = statesData.data.find(
          (s: any) => (s.name || "").toLowerCase() === apiStateName,
        );
        if (matchState) {
          stateId = matchState.id.toString();
        }
      }

      const apiCityName = (visitor.visitorCity || "").trim().toLowerCase();
      if (!cityId && apiCityName && citiesData?.data) {
        const matchCity = citiesData.data.find(
          (c: any) => (c.name || "").toLowerCase() === apiCityName,
        );
        if (matchCity) {
          cityId = matchCity.id.toString();
        }
      }

      // For Tehsil and Area, if not already resolved from pincode, we can still try to match by name
      const apiTehsilName = (visitor.visitorTehsil || "").trim().toLowerCase();
      if (!tehsilId && apiTehsilName && cityId) {
        try {
          const tehsilsResult = await getTehsilsQuery({ districtId: cityId }).unwrap();
          const matchTehsil = tehsilsResult?.data?.find(
            (t: any) => (t.name || "").toLowerCase() === apiTehsilName,
          );
          if (matchTehsil) {
            tehsilId = matchTehsil.id.toString();
          }
        } catch (error) {
          console.error("Error fetching tehsils for visitor auto-fill (IPD Visitor):", error);
        }
      }

      const apiAreaName = (visitor.visitorArea || "").trim().toLowerCase();
      if (!areaId && apiAreaName && tehsilId) {
        try {
          const areasResult = await getAreasQuery({ tehsilId }).unwrap();
          const matchArea = areasResult?.data?.find(
            (a: any) => (a.name || "").toLowerCase() === apiAreaName,
          );
          if (matchArea) {
            areaId = matchArea.id.toString();
          }
        } catch (error) {
          console.error("Error fetching areas for visitor auto-fill (IPD Visitor):", error);
        }
      }

      const updatedVisitors = [...visitors];
      updatedVisitors[index] = {
        ...current,
        mobileNumber: visitor.visitorContactNumber || current.mobileNumber,
        aadharCardNumber: visitor.visitorAadharCardNo || current.aadharCardNumber,
        visitorNameSelect: title,
        visitorName: name,
        pinCode: ((visitor as any).visitorPinCode || current.pinCode) as string,
        country: countryId,
        state: stateId,
        city: cityId,
        tehsil: tehsilId as any,
        area: areaId as any,
        // For India: use visitorAddress; for non-India, use addressLine1/2
        address:
          apiCountryName && apiCountryName === "india"
            ? visitor.visitorAddress || current.address
            : current.address,
        addressLine1:
          apiCountryName && apiCountryName !== "india"
            ? visitor.visitorAddressLine1 || (current as any).addressLine1 || ""
            : (current as any).addressLine1 || "",
        addressLine2:
          apiCountryName && apiCountryName !== "india"
            ? visitor.visitorAddressLine2 || (current as any).addressLine2 || ""
            : (current as any).addressLine2 || "",
      };

      formik.setFieldValue("visitors", updatedVisitors, false);

      // Mark key fields as touched so validation logic can run,
      // and proactively clear any existing errors for fields that
      // now have valid, auto-filled values.
      formik.setFieldTouched(`visitors[${index}].mobileNumber`, true, false);
      formik.setFieldTouched(`visitors[${index}].aadharCardNumber`, true, false);
      formik.setFieldTouched(`visitors[${index}].visitorNameSelect`, true, false);
      formik.setFieldTouched(`visitors[${index}].visitorName`, true, false);
      formik.setFieldTouched(`visitors[${index}].pinCode`, true, false);
      formik.setFieldTouched(`visitors[${index}].country`, true, false);
      formik.setFieldTouched(`visitors[${index}].state`, true, false);
      formik.setFieldTouched(`visitors[${index}].city`, true, false);
      formik.setFieldTouched(`visitors[${index}].tehsil`, true, false);
      formik.setFieldTouched(`visitors[${index}].area`, true, false);
      formik.setFieldTouched(`visitors[${index}].address`, true, false);

      const filledVisitor = updatedVisitors[index] || {};
      const fieldsToClearErrors = [
        "mobileNumber",
        "aadharCardNumber",
        "visitorNameSelect",
        "visitorName",
        "pinCode",
        "country",
        "state",
        "city",
        "tehsil",
        "area",
        "address",
      ] as const;

      fieldsToClearErrors.forEach((field) => {
        const value = (filledVisitor as any)[field];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          formik.setFieldError(`visitors[${index}].${field}`, undefined);
        }
      });

      // Lock Aadhaar so it can't be edited after selecting visitor
      setAadharLockedVisitors((prev) => ({ ...prev, [index]: true }));

      // If the selected visitor has no mobile number, keep mobile field editable
      if (!visitor.visitorContactNumber) {
        setMobileEditableVisitors((prev) => ({ ...prev, [index]: true }));
      } else {
        setMobileEditableVisitors((prev) => ({ ...prev, [index]: false }));
      }

      // If the selected visitor has no title, keep title dropdown editable
      if (!(visitor.visitorTitle || "").trim()) {
        setTitleEditableVisitors((prev) => ({ ...prev, [index]: true }));
      } else {
        setTitleEditableVisitors((prev) => ({ ...prev, [index]: false }));
      }

      handleVisitorDialogClose({ skipClearAadhar: true });
    } finally {
      setVisitorDialogSelectingId(null);
    }
  };

  // Handle form submission (assumes form is already validated)
  const handleFormSubmit = async (values: GateIPDVisitorFormValues) => {
    console.log("IPD Visitor form submit clicked");
    console.log("Form data:", values);

    try {
      // Map all visitors to the API format with async name resolution
      const visitors = await Promise.all(
        (values.visitors || []).map(async (visitor) => {
          const tehsilId = (visitor as any).tehsil;
          const areaId = (visitor as any).area;
          
          // Fetch tehsil and area names if IDs are present
          let tehsilName: string | undefined = undefined;
          let areaName: string | undefined = undefined;
          
          if (tehsilId && visitor.city) {
            tehsilName = await getTehsilName(tehsilId, visitor.city);
          }
          
          if (areaId && tehsilId) {
            // Always set visitorAreaId from the selected area ID (this is the numeric ID from areas API response)
            // areaId contains the area ID (e.g., 332662) from the areas API
            // Fetch area name for the payload
            try {
              areaName = await getAreaName(areaId, tehsilId);
            } catch (error) {
              console.error("Error fetching area name, but visitorAreaId is still set:", error);
              // Even if area name fetch fails, visitorAreaId is still set below
              areaName = areaId; // Fallback to ID if name fetch fails
            }
          }
          
          return {
            patientTitle: visitor.patientNameSelect || undefined,
            visitorTitle: visitor.visitorNameSelect || undefined,
            visitorName: visitor.visitorName,
            visitorType: "IPD" as const,
            visitorContactNumber: visitor.mobileNumber,
            visitorAadharCardNo: visitor.aadharCardNumber || undefined,
            visitorNationality: "Indian", // Default nationality for IPD visitor (no separate nationality field)
            ...(visitor.country === "6"
              ? { visitorAddress: visitor.address }
              : {
                  visitorAddressLine1: (visitor as any).addressLine1 || "",
                  visitorAddressLine2: (visitor as any).addressLine2 || "",
                }),
            visitorCity: visitor.city ? getCityName(visitor.city) : "",
            visitorTehsil: tehsilName,
            visitorArea: areaName,
            visitorAreaId: areaId ? areaId : undefined, // Add areaId from the selected area ID (numeric ID from areas API)
            visitorState: visitor.state ? getStateName(visitor.state) : "",
            visitorCountry: visitor.country ? getCountryName(visitor.country) : "",
            visitorPinCode: visitor.pinCode || "",
            visitorPurpose: visitor.purpose,
            patientName: visitor.patientName,
            // IPD specific fields - always send (empty string if not provided)
            patientPhoneNumber: visitor.phoneNumber || "",
            patientUhid: visitor.uhid || "",
            patientBuilding: visitor.building || undefined,
            patientRoomNo: visitor.roomNumber || undefined,
            patientBedNo: visitor.bedNumber || undefined,
            vehiclePhoto: null as File | null,
            aadharPhoto: (visitor.aadharPhoto && typeof visitor.aadharPhoto === "object" && "name" in visitor.aadharPhoto) ? (visitor.aadharPhoto as File) : null,
          };
        })
      );

      const payload = { visitors };

      console.log("API Payload:", payload);
      const response = await visitorEntry(payload).unwrap();
      console.log("Visitor entries created successfully:", response);
      
      // Show success message
      setSuccessMessage(response?.message || "Visitor entry created successfully!");
      setShowSuccessDialog(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        formik.resetForm();
        formik.setFieldValue("visitors", [createEmptyVisitor("1")]);
      }, 2000);
      
    } catch (error: any) {
      console.error("Error submitting form:", error);
      
      // Handle error - show error message
      let errorMsg = "Failed to submit visitor entry. Please try again.";
      
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

  return (
    <GateEntryLayout title="" subModuleName="IPD Visitor">
      <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[28px] font-semibold leading-[120%] text-[#262D3B]">IPD Visitor</h1>
          <div className="flex items-center gap-3">
            <GoToHomeButton onClick={handleGoToHome} />
            <button
              type="button"
              className={`flex h-11 items-center justify-center gap-2 rounded-[32px] border px-6 text-sm font-medium leading-[120%] transition-colors ${
                (formik.values.visitors?.length || 0) >= 5
                  ? "border-[#D0D5DD] bg-[#F9FAFB] text-[#98A2B3] cursor-not-allowed"
                  : "border-[#0B8C00] text-[#0B8C00] hover:bg-[#F2F8F2]"
              }`}
              onClick={handleAddMore}
              disabled={(formik.values.visitors?.length || 0) >= 5}
              title={(formik.values.visitors?.length || 0) >= 5 ? "Maximum 5 visitors allowed" : ""}
            >
              <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
              Add More
            </button>
          </div>
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
              markAllVisitorFieldsTouched();
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
          {formik.values.visitors?.map((visitor, index) => (
            <div key={visitor.id || index} className="space-y-3 rounded-[16px]" data-visitor-index={index}>
              {/* Visitor Header */}
              <div className="flex items-center justify-between">
                <div className="text-[20px] font-semibold leading-[120%] text-[#262D3B]">
                  IPD Visitor {index + 1}
                </div>
                {formik.values.visitors && formik.values.visitors.length > 1 && (
                  <button
                    type="button"
                    className="flex items-center justify-center shrink-0"
                    onClick={() => handleRemoveVisitor(index)}
                    aria-label="Remove visitor"
                  >
                    <Image
                      src="/icons/TrashGreenIcon.svg"
                      alt="Delete"
                      width={44}
                      height={44}
                    />
                  </button>
                )}
              </div>

              {/* IPD Visitor (Personal Details) Section */}
              <PatientVisitorDetails
                data={{
                  searchType: visitor.searchType || "",
                  mobileNumber: visitor.mobileNumber || "",
                  aadharCardNumber: visitor.aadharCardNumber || "",
                  visitorNameSelect: visitor.visitorNameSelect || "",
                  visitorName: visitor.visitorName || "",
                  patientNameSelect: visitor.patientNameSelect || "",
                  patientName: visitor.patientName || "",
                  purpose: visitor.purpose || "",
                  patientUHID: "",
                  patientMobileNumber: "",
                }}
                showPatientFields={false}
                isAadharLoading={!!visitorLookupLoading[index]}
                aadharReadOnly={!!aadharLockedVisitors[index]}
                visitorIdentityReadOnly={!!aadharLockedVisitors[index]}
                mobileNumberReadOnly={!!aadharLockedVisitors[index] && !mobileEditableVisitors[index]}
                visitorTitleReadOnly={!!aadharLockedVisitors[index] && !titleEditableVisitors[index]}
                patientNameReadOnly={true}
                patientTitleEditable={!!verifiedVisitors[index] && !patientTitleFromApiMap[index]}
                onChange={(field, value) => {
                  formik.setFieldValue(`visitors[${index}].${field}`, value, false); // Don't validate on change
                  
                  // For select fields only, if a value is selected, mark as touched and validate immediately
                  const selectFields = ["visitorNameSelect", "patientNameSelect"];
                  if (selectFields.includes(field) && value && value.trim() !== "") {
                    setTimeout(() => {
                      formik.setFieldTouched(`visitors[${index}].${field}`, true, false);
                      formik.validateField(`visitors[${index}].${field}`);
                    }, 0);
                  }
                  
                  // For input fields: if field was previously invalid (touched and had error), validate on change
                  // This allows errors to clear immediately when user corrects them
                  const inputFields = ["mobileNumber", "aadharCardNumber", "visitorName", "patientName", "purpose"];
                  if (inputFields.includes(field)) {
                    const fieldPath = `visitors[${index}].${field}`;
                    const visitorTouched = Array.isArray(formik.touched.visitors) 
                      ? (formik.touched.visitors[index] as any)
                      : undefined;
                    const visitorErrors = Array.isArray(formik.errors.visitors)
                      ? (formik.errors.visitors[index] as any)
                      : undefined;
                    const isTouched = visitorTouched?.[field];
                    const hasError = visitorErrors?.[field];
                    
                    // For mobileNumber and aadharCardNumber, we need to validate all visitors to check for duplicates
                    if (field === "mobileNumber" || field === "aadharCardNumber") {
                      const trimmed = value.trim();
                      if (field === "aadharCardNumber" && (trimmed.length === 12 || isTouched || hasError)) {
                        // Always validate Aadhar on change when 12 digits or when touched/has error so repeating/sequential pattern errors show and clear instantly
                        setTimeout(async () => {
                          formik.setFieldTouched(`visitors[${index}].${field}`, true, false);
                          const errors = await formik.validateForm();
                          formik.setErrors(errors);
                          // Only call "Already Exist Visitor" API when Aadhaar is valid (no error: not repeating, not sequential, first digit ok, unique)
                          if (trimmed.length === 12) {
                            const visitorErrorsAfter = Array.isArray(errors.visitors) ? (errors.visitors[index] as any) : undefined;
                            if (!visitorErrorsAfter?.aadharCardNumber) {
                              void handleVisitorAadharLookup(index, trimmed);
                            }
                          }
                        }, 0);
                      } else if (field === "mobileNumber" && (isTouched || hasError || trimmed.length === 10)) {
                        setTimeout(async () => {
                          formik.setFieldTouched(`visitors[${index}].${field}`, true, false);
                          const errors = await formik.validateForm();
                          formik.setErrors(errors);
                        }, 0);
                      }
                    } else {
                      // For other fields, only validate the specific field
                      if (isTouched && hasError) {
                        setTimeout(() => {
                          formik.validateField(fieldPath);
                        }, 0);
                      }
                    }
                  }
                  // For new fields (not touched), validation will happen on blur only
                }}
                onBlur={(field) => {
                  formik.setFieldTouched(`visitors[${index}].${field}`, true, false); // Mark as touched, don't validate yet
                  
                  // For mobileNumber and aadharCardNumber, validate all visitors to check for duplicates
                  if (field === "mobileNumber" || field === "aadharCardNumber") {
                    setTimeout(() => {
                      formik.validateForm();
                    }, 0);
                  } else {
                    // For other fields, only validate the specific field
                    formik.validateField(`visitors[${index}].${field}`);
                  }
                }}
                fieldRefs={{
                  mobileNumber: (el: HTMLInputElement | null) => {
                    mobileNumberRefs.current[index] = el;
                  },
                  aadharCardNumber: (el: HTMLInputElement | null) => {
                    aadharCardNumberRefs.current[index] = el;
                  },
                  visitorTitle: (el: HTMLDivElement | null) => {
                    visitorTitleRefs.current[index] = el;
                  },
                  visitorName: (el: HTMLInputElement | null) => {
                    visitorNameRefs.current[index] = el;
                  },
                  patientTitle: (el: HTMLDivElement | null) => {
                    patientTitleRefs.current[index] = el;
                  },
                  patientName: (el: HTMLInputElement | null) => {
                    patientNameRefs.current[index] = el;
                  },
                  purpose: (el: HTMLInputElement | null) => {
                    purposeRefs.current[index] = el;
                  },
                }}
                errors={getFormErrors(index)}
                title="IPD Visitor"
              />

              {/* Address Details Section */}
              <AddressDetails
                formData={{
                  pinCode: visitor.pinCode || "",
                  country: visitor.country || "",
                  state: visitor.state || "",
                  city: visitor.city || "",
                  tehsil: (visitor as any).tehsil || "",
                  area: (visitor as any).area || "",
                  address: visitor.address || "",
                  addressLine1: (visitor as any).addressLine1 || "",
                  addressLine2: (visitor as any).addressLine2 || "",
                }}
                onChange={(field, value) => {
                  formik.setFieldValue(`visitors[${index}].${field}`, value, false); // Set value without immediate validation
                  
                  // For select fields only (country, state, city, tehsil, area), if a value is selected, mark as touched and validate immediately
                  const selectFields = ["country", "state", "city", "tehsil", "area"] as string[];
                  if (selectFields.includes(field) && value && value.trim() !== "") {
                    const fieldPath = `visitors[${index}].${field}`;
                    // Use a slightly longer timeout to ensure Formik state is updated, especially for async auto-fill from pincode
                    setTimeout(() => {
                      // Double-check that the value is actually set before validating
                      const currentValue = formik.values.visitors?.[index]?.[field as keyof IPDVisitorItemFormValues];
                      if (currentValue === value || String(currentValue) === String(value)) {
                        formik.setFieldTouched(fieldPath, true, false);
                        formik.validateField(fieldPath);
                      } else {
                        // If value isn't set yet, try again after a bit more time
                        setTimeout(() => {
                          formik.setFieldTouched(fieldPath, true, false);
                          formik.validateField(fieldPath);
                        }, 50);
                      }
                    }, 10);
                  }
                  
                  // For input fields: if field was previously invalid (touched and had error), validate on change
                  // This allows errors to clear immediately when user corrects them
                  const inputFields = ["pinCode", "address", "addressLine1", "addressLine2"];
                  if (inputFields.includes(field)) {
                    const fieldPath = `visitors[${index}].${field}`;
                    const visitorTouched = Array.isArray(formik.touched.visitors) 
                      ? (formik.touched.visitors[index] as any)
                      : undefined;
                    const visitorErrors = Array.isArray(formik.errors.visitors)
                      ? (formik.errors.visitors[index] as any)
                      : undefined;
                    const isTouched = visitorTouched?.[field];
                    const hasError = visitorErrors?.[field];
                    
                    // If field was touched and had an error, validate on change to clear error immediately
                    if (isTouched && hasError) {
                      setTimeout(() => {
                        formik.validateField(fieldPath);
                      }, 0);
                    }
                  }
                  // For new fields (not touched), validation will happen on blur only
                }}
                onBlur={(field) => {
                  formik.setFieldTouched(`visitors[${index}].${field}`, true, false); // Mark as touched, don't validate yet
                  formik.validateField(`visitors[${index}].${field}`); // Validate the field after marking as touched
                }}
                fieldRefs={{
                  pinCode: (el: HTMLInputElement | null) => {
                    pinCodeRefs.current[index] = el;
                  },
                  country: (el: HTMLDivElement | null) => {
                    countryRefs.current[index] = el;
                  },
                  state: (el: HTMLDivElement | null) => {
                    stateRefs.current[index] = el;
                  },
                  city: (el: HTMLDivElement | null) => {
                    cityRefs.current[index] = el;
                  },
                  tehsil: (el: HTMLDivElement | null) => {
                    tehsilRefs.current[index] = el;
                  },
                  area: (el: HTMLDivElement | null) => {
                    areaRefs.current[index] = el;
                  },
                  address: (el: HTMLInputElement | null) => {
                    addressRefs.current[index] = el;
                  },
                }}
                errors={getFormErrors(index)}
              />

              {/* Additional Details Section */}
              <IPDAdditionalDetails
                data={{
                  searchType: visitor.searchType || "",
                  phoneNumber: visitor.phoneNumber || "",
                  uhid: visitor.uhid || "",
                  building: visitor.building || "",
                  roomNumber: visitor.roomNumber || "",
                  bedNumber: visitor.bedNumber || "",
                }}
                onVerify={handleVerify}
                isVerifyLoading={isVerifyLoading}
                visitorIndex={index}
                buildingReadOnly={!verifiedVisitors[index] || !!ipdFieldsFromApiMap[index]?.building}
                roomNumberReadOnly={!verifiedVisitors[index] || !!ipdFieldsFromApiMap[index]?.roomNumber}
                bedNumberReadOnly={!verifiedVisitors[index] || !!ipdFieldsFromApiMap[index]?.bedNumber}
                onChange={(field, value) => {
                  formik.setFieldValue(`visitors[${index}].${field}`, value, false); // Don't validate on change
                  
                  // For select fields only (searchType), if a value is selected, mark as touched and validate immediately
                  if (field === "searchType" && value && value.trim() !== "") {
                    setTimeout(() => {
                      formik.setFieldTouched(`visitors[${index}].${field}`, true, false);
                      formik.validateField(`visitors[${index}].${field}`);
                    }, 0);
                  }
                  
                  // For input fields: if field was previously invalid (touched and had error), validate on change
                  // This allows errors to clear immediately when user corrects them
                  const inputFields = ["phoneNumber", "uhid", "building", "roomNumber", "bedNumber"];
                  if (inputFields.includes(field)) {
                    const fieldPath = `visitors[${index}].${field}`;
                    const visitorTouched = Array.isArray(formik.touched.visitors) 
                      ? (formik.touched.visitors[index] as any)
                      : undefined;
                    const visitorErrors = Array.isArray(formik.errors.visitors)
                      ? (formik.errors.visitors[index] as any)
                      : undefined;
                    const isTouched = visitorTouched?.[field];
                    const hasError = visitorErrors?.[field];
                    
                    // If field was touched and had an error, validate on change to clear error immediately
                    if (isTouched && hasError) {
                      setTimeout(() => {
                        formik.validateField(fieldPath);
                      }, 0);
                    }
                  }
                  
                  // When switching Search Type (UHID <-> Phone), empty all auto-filled fields and both search inputs
                  if (field === "searchType") {
                    setVerifiedVisitors((prev) => {
                      const next = { ...prev };
                      delete next[index];
                      return next;
                    });
                    setPatientTitleFromApiMap((prev) => {
                      const next = { ...prev };
                      delete next[index];
                      return next;
                    });
                    setIpdFieldsFromApiMap((prev) => {
                      const next = { ...prev };
                      delete next[index];
                      return next;
                    });
                    formik.setFieldValue(`visitors[${index}].patientNameSelect`, "", false);
                    formik.setFieldValue(`visitors[${index}].patientName`, "", false);
                    formik.setFieldValue(`visitors[${index}].building`, "", false);
                    formik.setFieldValue(`visitors[${index}].roomNumber`, "", false);
                    formik.setFieldValue(`visitors[${index}].bedNumber`, "", false);
                    formik.setFieldValue(`visitors[${index}].phoneNumber`, "", false);
                    formik.setFieldValue(`visitors[${index}].uhid`, "", false);
                    formik.setFieldError(`visitors[${index}].patientNameSelect`, undefined);
                    formik.setFieldError(`visitors[${index}].patientName`, undefined);
                    formik.setFieldError(`visitors[${index}].phoneNumber`, undefined);
                    formik.setFieldError(`visitors[${index}].uhid`, undefined);
                  }
                  // For new fields (not touched), validation will happen on blur only
                }}
                onBlur={(field) => {
                  formik.setFieldTouched(`visitors[${index}].${field}`, true, false); // Mark as touched, don't validate yet
                  formik.validateField(`visitors[${index}].${field}`); // Validate the field after marking as touched
                }}
                fieldRefs={{
                  searchType: (el: HTMLDivElement | null) => {
                    searchTypeRefs.current[index] = el;
                  },
                  phoneNumber: (el: HTMLInputElement | null) => {
                    phoneNumberRefs.current[index] = el;
                  },
                  uhid: (el: HTMLInputElement | null) => {
                    uhidRefs.current[index] = el;
                  },
                  building: (el: HTMLInputElement | null) => {
                    buildingRefs.current[index] = el;
                  },
                  roomNumber: (el: HTMLInputElement | null) => {
                    roomNumberRefs.current[index] = el;
                  },
                  bedNumber: (el: HTMLInputElement | null) => {
                    bedNumberRefs.current[index] = el;
                  },
                }}
                errors={getFormErrors(index)}
              />
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex items-center justify-start gap-4">
            {gatePermissions.canAdd && (
              <Button 
                type="submit" 
                variant="primary" 
                isLoading={formik.isSubmitting || isSubmitting}
                disabled={formik.isSubmitting || isSubmitting}
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
        onClose={() => {
          setShowSuccessDialog(false);
          router.push("/gate");
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          router.push("/gate");
        }}
      />

      {/* API Error Dialog - Only for API errors, not validation errors */}
      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => {
          setShowApiErrorDialog(false);
        }}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowApiErrorDialog(false);
        }}
      />

      {/* Visitor Already Exists Dialog */}
      <Dialog
        open={visitorExistsDialogOpen}
        onClose={handleVisitorDialogClose}
        title=""
        width={1440}
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
                <TableHead sortable>Mobile Number</TableHead>
                <TableHead sortable>Aadhar Card Number</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {existingVisitors.length === 0 ? (
                <TableRow>
                  <TableData
                    colSpan={5}
                    className="py-12 text-center text-sm text-[#9CA3AF]"
                  >
                    {isVisitorLookupLoading ? "Loading visitors..." : "No visitors found"}
                  </TableData>
                </TableRow>
              ) : (
                existingVisitors.map((visitor, index) => {
                  const rowKey = visitor.id ?? index;
                  const isSelecting = visitorDialogSelectingId === rowKey;
                  return (
                    <TableRow
                      key={rowKey}
                      className="bg-white transition-colors hover:bg-[#F7FAF7]"
                    >
                      <TableData variant="primary">{index + 1}</TableData>
                      <TableData>
                        {visitor.visitorTitle && visitor.visitorName
                          ? `${visitor.visitorTitle} ${visitor.visitorName}`
                          : visitor.visitorName || "-"}
                      </TableData>
                      <TableData>{visitor.visitorContactNumber || "-"}</TableData>
                      <TableData>{visitor.visitorAadharCardNo || "-"}</TableData>
                      <TableData>
                        <button
                          type="button"
                          onClick={() => void handleSelectVisitorFromDialog(visitor, rowKey)}
                          disabled={!!visitorDialogSelectingId}
                          className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] disabled:cursor-not-allowed disabled:opacity-75"
                        >
                          {isSelecting ? (
                            <svg
                              className="h-4 w-4 animate-spin text-[#0B8C00]"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
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

      {/* Select Patient Dialog (when phone search returns multiple) */}
      <Dialog
        open={verifyDialogOpen}
        onClose={handleVerifyDialogClose}
        title=""
        width={1100}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center rounded-[8px] border border-[#0B8C00]/20 bg-[#0B8C00]/20 px-5 py-4">
            <p className="text-[20px] font-medium leading-[120%] text-[#0B8C00]">
              Verify Patient
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead position="first">Sr no.</TableHead>
                <TableHead sortable>UHID</TableHead>
                <TableHead sortable>Patient Name</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifyPatients.length === 0 ? (
                <TableRow>
                  <TableData
                    colSpan={4}
                    className="py-12 text-center text-sm text-[#9CA3AF]"
                  >
                    No patients found
                  </TableData>
                </TableRow>
              ) : (
                verifyPatients.map((patient, idx) => (
                  <TableRow
                    key={`${patient.patientId}-${patient.uhid}-${idx}`}
                    className="bg-white transition-colors hover:bg-[#F7FAF7]"
                  >
                    <TableData variant="primary">{idx + 1}</TableData>
                    <TableData>{patient.uhid || "-"}</TableData>
                    <TableData>
                      {patient.patientTitle?.trim()
                        ? `${patient.patientTitle.trim()} ${patient.patientName || ""}`.trim()
                        : (patient.patientName || "-")}
                    </TableData>
                    <TableData>
                      <button
                        type="button"
                        onClick={() => handleSelectPatientFromVerify(patient)}
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
