"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import { FieldArray } from "formik";
import GateEntryLayout from "@/components/gate/GateEntryLayout";
import { ListBorder } from "@/components/ui/ListBorder";
import { GoToHomeButton, BackToPreviousPageButton, Button } from "@/components/ui";
import { Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableData, MessageDialog } from "@/components/ui";
import { AddressDetails, type AddressFormData, PersonalDetails, type PersonalFormData, VisitorsDetails, type Visitor, PhotoCapture, type PhotoCaptureRef } from "@/components/forms";
import {
  useNewPatientEntryMutation,
  useLazyCheckGateExistingPatientsByPhoneQuery,
  useLazyGetVisitorByAadharQuery,
  type ExistingPatient,
  type VisitorByAadharItem,
} from "@/store/api/gateApi";
import { useGetPanelsQuery } from "@/store/api/settingsApi";
import { useGetCountriesQuery, useGetStatesQuery, useGetCitiesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery, useLazyGetPincodeQuery } from "@/store/api/publicApi";
import { gateNewPatientSchema, type GateNewPatientFormValues } from "@/lib/validation/gateSchemas";
import {
  isPanelNameHiddenFromPanelTypeDropdown,
  DEFAULT_PANEL_NAME_FOR_PRIVATE,
  DEFAULT_PANEL_NAME_FOR_TPA_TYPE,
  findActivePanelIdByName,
  findActivePanelIdStringByName,
} from "@/lib/registration/panelDropdownFilter";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectPermissionsMap } from "@/store/slices/authSlice";
import { getSubModulePermissions } from "@/utils/permission";



export default function GateNewPatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientDataParam = searchParams?.get("patientData");
  const userBranchId = useAppSelector(selectUserBranchId);
  const permissionsMap = useAppSelector(selectPermissionsMap);
  const gatePermissions = useMemo(
    () => getSubModulePermissions(permissionsMap, "Gate", "New Patient"),
    [permissionsMap]
  );

  const [newPatientEntry, { isLoading: isSubmitting }] = useNewPatientEntryMutation();
  const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
  const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
  const [isUserLeadData, setIsUserLeadData] = useState(false); // Track if data is from userLead
  const [isGateEntriesOnly, setIsGateEntriesOnly] = useState(false); // Track if data is only from patientEntries (show "Already Exist Gate Entries of Patients")
  const [userLeadId, setUserLeadId] = useState<number | null>(null); // Track userLead ID for POST payload
  const branchId = userBranchId ?? 1;
  const [preBookingInfo, setPreBookingInfo] = useState<{ isPreBooking: boolean; preBookingId: number | null }>({
    isPreBooking: false,
    preBookingId: null,
  });
  const [isRevisitMode, setIsRevisitMode] = useState(false); // Track if we're in revisit mode (from "Already Patient Exist" dialog)
  const [selectedPatientForRevisit, setSelectedPatientForRevisit] = useState<ExistingPatient | null>(null); // Store selected patient data including UHID
  const [forceClosePincodeDropdown, setForceClosePincodeDropdown] = useState(false); // Force-close pincode dropdown when prefilled
  const isClosingDialogRef = useRef(false); // Track if dialog is being closed to prevent re-triggering
  const lastCheckedContactNumberRef = useRef<string>(""); // Track last checked contact number to prevent duplicate calls
  const lastCheckedAadharCardRef = useRef<string>(""); // Track last checked Aadhar Card to prevent duplicate calls
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track timeout for debouncing
  const pendingCityNameRef = useRef<string | null>(null); // Store city name to match when citiesData is available
  const pendingStateNameRef = useRef<string | null>(null); // Store state name to match when statesData is available
  const pendingCountryNameRef = useRef<string | null>(null); // Store country name to match when countriesData is available
  /** When country name is resolved async, apply revisit address state/city for non-India (prefill uses prefilledPatientData). */
  const pendingRevisitAddressRef = useRef<{ state?: string; city?: string } | null>(null);
  const pendingTehsilNameRef = useRef<string | null>(null); // Store tehsil name to match when tehsils data is available
  const pendingAreaNameRef = useRef<string | null>(null); // Store area name to match when areas data is available
  const pendingPincodeInfoRef = useRef<{ country_id?: number; state_id?: number; district_id?: number; country?: string; state?: string; district?: string } | null>(null); // Store pincode info for userLead auto-selection
  const skipClearingVisitorMatchErrorRef = useRef(false); // When true, sync won't clear "patient match" error (set after selecting patient from dialog, cleared after a short delay)
  const hasPerformedInitialPrefillSyncRef = useRef(false); // Track if we've done the initial prefilled data sync (prevents overwriting user's address when they change pincode)

  // Lazy query for checking existing patients
  const [checkExistingPatientsQuery] = useLazyCheckGateExistingPatientsByPhoneQuery();
  const [getVisitorByAadhar] = useLazyGetVisitorByAadharQuery();
  // Lazy queries for tehsils and areas
  const [getTehsilsQuery] = useLazyGetTehsilsQuery();
  const [getAreasQuery] = useLazyGetAreasQuery();
  // Lazy query for pincode
  const [getPincodeQuery] = useLazyGetPincodeQuery();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [visitorExistsDialogOpen, setVisitorExistsDialogOpen] = useState(false);
  const [existingVisitors, setExistingVisitors] = useState<VisitorByAadharItem[]>([]);
  const [visitorDialogVisitorIndex, setVisitorDialogVisitorIndex] = useState<number>(0);
  const [visitorLookupLoading, setVisitorLookupLoading] = useState<Record<string, boolean>>({});
  const [visitorDialogSelectingId, setVisitorDialogSelectingId] = useState<number | string | null>(null);
  const [lockedVisitors, setLockedVisitors] = useState<Record<string, boolean>>({});
  const [visitorApiData, setVisitorApiData] = useState<Record<number, VisitorByAadharItem>>({});
  const [photoCaptureErrors, setPhotoCaptureErrors] = useState<{ vehiclePhoto?: string; aadharPhoto?: string }>({});
  const photoCaptureRef = useRef<PhotoCaptureRef>(null);

  // Loading state for contact number API check
  const [isContactLoading, setIsContactLoading] = useState(false);
  const isVisitorLookupLoading = Object.values(visitorLookupLoading).some(Boolean);

  // Form ref for arrow key navigation
  const formRef = useRef<HTMLFormElement>(null);
  
  // Enable arrow key navigation for form fields
  // When navigating to a select field, trigger validation
  useArrowKeyNavigation(formRef, true, (fieldName) => {
    // Validate the select field when navigating to it
    formik.setFieldTouched(fieldName as keyof GateNewPatientFormValues, true, false);
    formik.validateField(fieldName);
  });

  // Refs for form fields
  const contactNumberRef = useRef<HTMLInputElement>(null);
  const aadharCardNoRef = useRef<HTMLInputElement>(null);
  const passportNumberRef = useRef<HTMLInputElement>(null);
  const nationalIdRef = useRef<HTMLInputElement>(null);
  const patientNameSelectRef = useRef<HTMLDivElement>(null);
  const patientNameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const indianForeignerNepalRef = useRef<HTMLDivElement>(null);
  const patientTypeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pinCodeRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const addressLine1Ref = useRef<HTMLInputElement>(null);
  const addressLine2Ref = useRef<HTMLInputElement>(null);
  const visitorTitleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const visitorNameRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const visitorCountryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const visitorAadharRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const visitorPassportRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const visitorNationalIdRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Parse patient data from query param if available
  const [prefilledPatientData, setPrefilledPatientData] = useState<ExistingPatient | null>(null);
  
  useEffect(() => {
    if (patientDataParam) {
      try {
        const decoded = decodeURIComponent(patientDataParam);
        const parsed = JSON.parse(decoded) as ExistingPatient;
        setPrefilledPatientData(parsed);
        // Set revisit mode when patient data comes from query param (from revisit-patient page)
        setIsRevisitMode(true);
      } catch (error) {
        console.error("Error parsing patient data:", error);
      }
    }
  }, [patientDataParam]);

  // Reset initial sync flag when prefilled patient data changes (e.g. different patient from revisit)
  useEffect(() => {
    hasPerformedInitialPrefillSyncRef.current = false;
  }, [prefilledPatientData]);

  // Helper function to map API response to form values
  const getInitialValuesFromPatientData = (patient: ExistingPatient | null): GateNewPatientFormValues => {
    if (!patient) {
      return {
    contactNumber: "",
    aadharCardNo: "",
    passportNumber: "",
    nationalId: "",
    patientName: "",
    patientNameSelect: "",
    age: "",
    indianForeignerNepal: "Indian",
    emailAddress: "",
    maritalStatus: "",
    occupation: "",
    patientType: "",
    panel: "",
    pinCode: "",
    country: "6", // India is auto-selected
    state: "",
    city: "",
    address: "",
    addressLine1: "",
    addressLine2: "",
    vehiclePhoto: null,
    aadharPhoto: null,
    visitors: [], // Visitors will have aadharCardNo, passportNumber, or nationalId based on nationality
  };
    }

    // Map API response to form values
    // Note: state and city will be mapped to IDs in useEffect after data is loaded
    return {
      contactNumber: patient.contactNumber || "",
      aadharCardNo: patient.aadharCardNo || "",
      passportNumber: "", // Not in API response
      nationalId: "", // Not in API response
      patientName: patient.patientName || "",
      patientNameSelect: patient.patientTitle || "",
      age: patient.age || "",
      indianForeignerNepal: "Indian", // Default to Indian
      emailAddress: patient.emailAddress || "",
      maritalStatus: patient.maritalStatus || "",
      occupation: patient.occupation || "",
      patientType: patient.patientType || "",
      panel: "",
      pinCode: patient.address?.pinCode || "",
      country: "", // Will be set to ID in useEffect after countries data loads (API may return name or ID)
      state: "", // Will be set to ID in useEffect after states data loads
      city: "", // Will be set to ID in useEffect after cities data loads
      address: patient.address?.address || "",
      addressLine1: (patient.address as { addressLine1?: string })?.addressLine1 || "",
      addressLine2: (patient.address as { addressLine2?: string })?.addressLine2 || "",
      vehiclePhoto: null,
      aadharPhoto: null,
      visitors: [],
    };
  };

  // Initial form values
  const initialValues: GateNewPatientFormValues = getInitialValuesFromPatientData(prefilledPatientData);

  // Formik setup
  const formik = useFormik<GateNewPatientFormValues>({
    initialValues,
    enableReinitialize: true, // Re-initialize when prefilledPatientData changes
    validationSchema: gateNewPatientSchema,
    validateOnChange: false,
    validateOnBlur: true, // Enable validation on blur
    // We'll handle submission + scroll manually via a custom form onSubmit handler
    onSubmit: async () => { },
  });

  // Fetch countries; states/cities master APIs only for India (IDs). Non-India uses plain text in AddressDetails — no state/city API.
  const { data: countriesData } = useGetCountriesQuery();
  const addressCountryIsIndia = formik.values.country === "6";
  const { data: statesData } = useGetStatesQuery(
    formik.values.country && addressCountryIsIndia ? { countryId: formik.values.country } : undefined,
    { skip: !formik.values.country || !addressCountryIsIndia }
  );
  const { data: citiesData } = useGetCitiesQuery(
    formik.values.state && addressCountryIsIndia ? { stateId: formik.values.state } : undefined,
    { skip: !formik.values.state || !addressCountryIsIndia }
  );
  
  // Fetch panels from API (scoped to gate user's branch)
  const panelsListBranchId = Number(branchId);
  const { data: panelsData } = useGetPanelsQuery(
    Number.isFinite(panelsListBranchId) && panelsListBranchId >= 1
      ? { page: 1, limit: 100, branchId: panelsListBranchId }
      : undefined,
    { skip: !Number.isFinite(panelsListBranchId) || panelsListBranchId < 1 }
  );
  
  // Map panels to SelectOption format (omit default "Normal" / "TPA" system rows; IDs differ by environment)
  const panelOptions = useMemo(() => {
    if (!panelsData?.data) return [];
    const isPanel = formik.values.patientType === "Panel";
    return panelsData.data
      .filter((panel) => {
        const isActive = panel.status === "active" || panel.status === "Active";
        if (!isActive) return false;
        if (isPanel && isPanelNameHiddenFromPanelTypeDropdown(panel.name)) return false;
        return true;
      })
      .map((panel) => ({
        value: panel.id.toString(),
        label: panel.name,
      }));
  }, [panelsData, formik.values.patientType]);

  const privateDefaultPanelIdStr = useMemo(
    () => findActivePanelIdStringByName(panelsData?.data, DEFAULT_PANEL_NAME_FOR_PRIVATE),
    [panelsData?.data]
  );
  const tpaDefaultPanelIdStr = useMemo(
    () => findActivePanelIdStringByName(panelsData?.data, DEFAULT_PANEL_NAME_FOR_TPA_TYPE),
    [panelsData?.data]
  );

  // Update form values when patient data is loaded
  useEffect(() => {
    if (!prefilledPatientData) return;
    
    const mappedValues = getInitialValuesFromPatientData(prefilledPatientData);
    
    // Only do full setValues and location matching on initial load - prevents overwriting user's address when they change pincode
    const isInitialSync = !hasPerformedInitialPrefillSyncRef.current;
    if (isInitialSync) {
      formik.setValues(mappedValues);
      hasPerformedInitialPrefillSyncRef.current = true;
    }
    
    // Handle country - API may return name ("India" or "INDIA") or ID ("6")
    let resolvedPrefillCountryId: string | null = null;
    if (prefilledPatientData.address?.country) {
      const countryValue = String(prefilledPatientData.address.country);

      if (!isNaN(Number(countryValue)) && countryValue.trim() !== "") {
        resolvedPrefillCountryId = countryValue;
        formik.setFieldValue("country", countryValue, false);
      } else if (countriesData?.data) {
        const country = countriesData.data.find((c: any) => {
          const countryName = c.name || "";
          return countryName.toLowerCase() === countryValue.toLowerCase();
        });
        if (country) {
          resolvedPrefillCountryId = String(country.id);
          formik.setFieldValue("country", resolvedPrefillCountryId, false);
        } else {
          pendingCountryNameRef.current = countryValue.toLowerCase();
        }
      } else {
        pendingCountryNameRef.current = countryValue.toLowerCase();
      }
    }

    // Non-India: state/city are free text from API — set directly (no states/cities master API)
    if (
      isInitialSync &&
      resolvedPrefillCountryId &&
      resolvedPrefillCountryId !== "6" &&
      prefilledPatientData.address
    ) {
      const a = prefilledPatientData.address;
      formik.setFieldValue("state", a.state != null ? String(a.state).trim() : "", false);
      formik.setFieldValue("city", a.city != null ? String(a.city).trim() : "", false);
      formik.setFieldValue("tehsil", "", false);
      formik.setFieldValue("area", "", false);
      pendingStateNameRef.current = null;
      pendingCityNameRef.current = null;
      pendingTehsilNameRef.current = null;
      pendingAreaNameRef.current = null;
    } else if (isInitialSync) {
      if (prefilledPatientData.address?.state) {
        pendingStateNameRef.current = String(prefilledPatientData.address.state).toLowerCase();
      }
      if (prefilledPatientData.address?.city) {
        pendingCityNameRef.current = prefilledPatientData.address.city;
      }
      if ((prefilledPatientData.address as any)?.tehsil) {
        pendingTehsilNameRef.current = (prefilledPatientData.address as any).tehsil;
      }
      if ((prefilledPatientData.address as any)?.area) {
        pendingAreaNameRef.current = (prefilledPatientData.address as any).area;
      }
    }

    // India only: match state/city names to master IDs when states/cities APIs are loaded
    if (
      resolvedPrefillCountryId === "6" &&
      pendingStateNameRef.current &&
      prefilledPatientData.address?.state &&
      statesData
    ) {
      const statesList = Array.isArray(statesData) 
        ? statesData 
        : (statesData as any)?.data || [];
      const state = statesList.find((s: any) => {
        const stateName = s.name || s.state || "";
        const patientState = prefilledPatientData.address?.state || "";
        return stateName.toLowerCase() === patientState.toLowerCase();
      });
      if (state) {
        formik.setFieldValue("state", String(state.id), false);
        pendingStateNameRef.current = null; // Clear after successful match
      }
    }
    
    // Find city ID after state is set (India only)
    if (
      resolvedPrefillCountryId === "6" &&
      pendingCityNameRef.current &&
      prefilledPatientData.address?.city &&
      citiesData &&
      formik.values.state
    ) {
      const citiesList = Array.isArray(citiesData)
        ? citiesData
        : (citiesData as any)?.data || [];
      const city = citiesList.find((c: any) => {
        const cityName = c.name || c.city || "";
        const patientCity = prefilledPatientData.address?.city || "";
        return cityName.toLowerCase() === patientCity.toLowerCase();
      });
      if (city) {
        formik.setFieldValue("city", String(city.id), false);
        pendingCityNameRef.current = null; // Clear after successful match
        
        // After city is set, try to match tehsil if available
        if (pendingTehsilNameRef.current) {
          getTehsilsQuery({ districtId: String(city.id) }).then((result) => {
            if (result.data?.success && result.data?.data) {
              const tehsils = result.data.data;
              const matchingTehsil = tehsils.find((t: any) => 
                (t.name || "").toLowerCase() === String(pendingTehsilNameRef.current || "").toLowerCase()
              );
              if (matchingTehsil) {
                formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);
                pendingTehsilNameRef.current = null;
                
                // After tehsil is set, try to match area if available
                if (pendingAreaNameRef.current) {
                  getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                    if (areaResult.data?.success && areaResult.data?.data) {
                      const areas = areaResult.data.data;
                      const matchingArea = areas.find((a: any) => 
                        (a.name || "").toLowerCase() === String(pendingAreaNameRef.current || "").toLowerCase()
                      );
                      if (matchingArea) {
                        formik.setFieldValue("area", matchingArea.id.toString(), false);
                        pendingAreaNameRef.current = null;
                      }
                    }
                  }).catch((error) => {
                    console.error("Error fetching areas:", error);
                  });
                }
              }
            }
          }).catch((error) => {
            console.error("Error fetching tehsils:", error);
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledPatientData, statesData, citiesData, countriesData, getTehsilsQuery, getAreasQuery]);

  // Effect to match country when countriesData becomes available
  useEffect(() => {
    if (pendingCountryNameRef.current && countriesData?.data) {
      const country = countriesData.data.find((c: any) => {
        const countryName = c.name || "";
        return countryName.toLowerCase() === pendingCountryNameRef.current?.toLowerCase();
      });
      if (country) {
        const cid = String(country.id);
        formik.setFieldValue("country", cid, false);
        pendingCountryNameRef.current = null;
        if (cid !== "6") {
          const a = prefilledPatientData?.address ?? pendingRevisitAddressRef.current;
          if (a) {
            formik.setFieldValue("state", a.state != null ? String(a.state).trim() : "", false);
            formik.setFieldValue("city", a.city != null ? String(a.city).trim() : "", false);
            formik.setFieldValue("tehsil", "", false);
            formik.setFieldValue("area", "", false);
          }
          pendingStateNameRef.current = null;
          pendingCityNameRef.current = null;
          pendingTehsilNameRef.current = null;
          pendingAreaNameRef.current = null;
          pendingRevisitAddressRef.current = null;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countriesData, prefilledPatientData]);

  // Effect to auto-select Nepal when countriesData becomes available and Nepal is selected
  useEffect(() => {
    if (formik.values.indianForeignerNepal === "Nepal" && !formik.values.country && countriesData?.data) {
      const nepalCountry = countriesData.data.find(
        (c: any) => c.name?.toLowerCase() === "nepal"
      );
      if (nepalCountry) {
        formik.setFieldValue("country", String(nepalCountry.id), false);
        // Clear pincode, state and city when country changes
        formik.setFieldValue("pinCode", "", false);
        formik.setFieldValue("state", "", false);
        formik.setFieldValue("city", "", false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countriesData, formik.values.indianForeignerNepal]);

  // Effect to match state when statesData becomes available (India only — non-India uses free-text state)
  useEffect(() => {
    if (!statesData || !formik.values.country || formik.values.country !== "6") {
      return;
    }
    const statesList = Array.isArray(statesData) 
      ? statesData 
      : (statesData as any)?.data || [];
    
    // First try to match by pincodeInfo state_id if available
    if (pendingPincodeInfoRef.current?.state_id) {
      const state = statesList.find((s: any) => s.id === pendingPincodeInfoRef.current?.state_id);
      if (state) {
        formik.setFieldValue("state", String(state.id), false);
        pendingStateNameRef.current = null;
        console.log("Auto-selected state from pinCode (by ID in useEffect):", state.name);
        return;
      }
    }
    
    // Then try to match by name
    if (pendingStateNameRef.current) {
      const state = statesList.find((s: any) => {
        const stateName = s.name || s.state || "";
        return stateName.toLowerCase() === pendingStateNameRef.current?.toLowerCase();
      });
      if (state) {
        formik.setFieldValue("state", String(state.id), false);
        pendingStateNameRef.current = null; // Clear after successful match
        console.log("Auto-selected state from pinCode (by name in useEffect):", state.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statesData, formik.values.country]);

  // Auto-set panel field when patientType is Private/TPA (ids from GET /admin/settings/panel)
  useEffect(() => {
    const patientType = formik.values.patientType;
    const currentPanel = formik.values.panel?.trim() || "";
    if (patientType === "Private" && privateDefaultPanelIdStr && currentPanel !== privateDefaultPanelIdStr) {
      formik.setFieldValue("panel", privateDefaultPanelIdStr, false);
    } else if (patientType === "TPA" && tpaDefaultPanelIdStr && currentPanel !== tpaDefaultPanelIdStr) {
      formik.setFieldValue("panel", tpaDefaultPanelIdStr, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.patientType, formik.values.panel, privateDefaultPanelIdStr, tpaDefaultPanelIdStr]);

  // Effect to match city when citiesData becomes available
  useEffect(() => {
    if (citiesData && formik.values.state) {
      const citiesList = Array.isArray(citiesData)
        ? citiesData
        : (citiesData as any)?.data || [];
      
      // First try to match by pincodeInfo district_id if available
      if (pendingPincodeInfoRef.current?.district_id) {
        const city = citiesList.find((c: any) => c.id === pendingPincodeInfoRef.current?.district_id);
        if (city) {
          formik.setFieldValue("city", String(city.id), false);
          pendingCityNameRef.current = null;
          console.log("Auto-selected city from pinCode (by ID in useEffect):", city.name);
          
          // Clear pincodeInfo after successful match
          pendingPincodeInfoRef.current = null;
          
          // After city is set, try to match tehsil if pending
          if (pendingTehsilNameRef.current) {
            getTehsilsQuery({ districtId: String(city.id) }).then((result) => {
              if (result.data?.success && result.data?.data) {
                const tehsils = result.data.data;
                const matchingTehsil = tehsils.find((t: any) => 
                  (t.name || "").toLowerCase() === String(pendingTehsilNameRef.current || "").toLowerCase()
                );
                if (matchingTehsil) {
                  formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);
                  pendingTehsilNameRef.current = null;
                  
                  // After tehsil is set, try to match area if pending
                  if (pendingAreaNameRef.current) {
                    getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                      if (areaResult.data?.success && areaResult.data?.data) {
                        const areas = areaResult.data.data;
                        const matchingArea = areas.find((a: any) => 
                          (a.name || "").toLowerCase() === String(pendingAreaNameRef.current || "").toLowerCase()
                        );
                        if (matchingArea) {
                          formik.setFieldValue("area", matchingArea.id.toString(), false);
                          pendingAreaNameRef.current = null;
                        }
                      }
                    }).catch((error) => {
                      console.error("Error fetching areas:", error);
                    });
                  }
                }
              }
            }).catch((error) => {
              console.error("Error fetching tehsils:", error);
            });
          }
          return;
        }
      }
      
      // Then try to match by name
      if (pendingCityNameRef.current) {
        const city = citiesList.find((c: any) => {
          const cityName = c.name || c.city || "";
          return cityName.toLowerCase() === pendingCityNameRef.current?.toLowerCase();
        });
        if (city) {
          formik.setFieldValue("city", String(city.id), false);
          pendingCityNameRef.current = null; // Clear after successful match
          console.log("Auto-selected city from pinCode (by name in useEffect):", city.name);
          
          // Clear pincodeInfo after successful match
          pendingPincodeInfoRef.current = null;
          
          // After city is set, try to match tehsil if pending
          if (pendingTehsilNameRef.current) {
            getTehsilsQuery({ districtId: String(city.id) }).then((result) => {
              if (result.data?.success && result.data?.data) {
                const tehsils = result.data.data;
                const matchingTehsil = tehsils.find((t: any) => 
                  (t.name || "").toLowerCase() === String(pendingTehsilNameRef.current || "").toLowerCase()
                );
                if (matchingTehsil) {
                  formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);
                  pendingTehsilNameRef.current = null;
                  
                  // After tehsil is set, try to match area if pending
                  if (pendingAreaNameRef.current) {
                    getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                      if (areaResult.data?.success && areaResult.data?.data) {
                        const areas = areaResult.data.data;
                        const matchingArea = areas.find((a: any) => 
                          (a.name || "").toLowerCase() === String(pendingAreaNameRef.current || "").toLowerCase()
                        );
                        if (matchingArea) {
                          formik.setFieldValue("area", matchingArea.id.toString(), false);
                          pendingAreaNameRef.current = null;
                        }
                      }
                    }).catch((error) => {
                      console.error("Error fetching areas:", error);
                    });
                  }
                }
              }
            }).catch((error) => {
              console.error("Error fetching tehsils:", error);
            });
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citiesData, formik.values.state]);
  
  // Effect to match tehsil when city is set and tehsil name is pending
  useEffect(() => {
    if (pendingTehsilNameRef.current && formik.values.city) {
      getTehsilsQuery({ districtId: formik.values.city }).then((result) => {
        if (result.data?.success && result.data?.data) {
          const tehsils = result.data.data;
          const matchingTehsil = tehsils.find((t: any) => 
            (t.name || "").toLowerCase() === String(pendingTehsilNameRef.current || "").toLowerCase()
          );
          if (matchingTehsil) {
            formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);
            pendingTehsilNameRef.current = null;
            
            // After tehsil is set, try to match area if pending
            if (pendingAreaNameRef.current) {
              getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                if (areaResult.data?.success && areaResult.data?.data) {
                  const areas = areaResult.data.data;
                  const matchingArea = areas.find((a: any) => 
                    (a.name || "").toLowerCase() === String(pendingAreaNameRef.current || "").toLowerCase()
                  );
                  if (matchingArea) {
                    formik.setFieldValue("area", matchingArea.id.toString(), false);
                    pendingAreaNameRef.current = null;
                  }
                }
              }).catch((error) => {
                console.error("Error fetching areas:", error);
              });
            }
          }
        }
      }).catch((error) => {
        console.error("Error fetching tehsils:", error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.city, getTehsilsQuery, getAreasQuery]);
  
  // Effect to match area when tehsil is set and area name is pending
  useEffect(() => {
    if (pendingAreaNameRef.current && formik.values.tehsil) {
      getAreasQuery({ tehsilId: formik.values.tehsil }).then((result) => {
        if (result.data?.success && result.data?.data) {
          const areas = result.data.data;
          const matchingArea = areas.find((a: any) => 
            (a.name || "").toLowerCase() === String(pendingAreaNameRef.current || "").toLowerCase()
          );
          if (matchingArea) {
            formik.setFieldValue("area", matchingArea.id.toString(), false);
            pendingAreaNameRef.current = null;
          }
        }
      }).catch((error) => {
        console.error("Error fetching areas:", error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.tehsil, getAreasQuery]);

  // Helper function to convert Formik errors to flat structure for components
  // Only show errors for fields that have been touched (blurred)
  const getFormErrors = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Flatten Formik errors - only include if field is touched
    Object.keys(formik.errors).forEach((key) => {
      const error = formik.errors[key as keyof typeof formik.errors];
      const touched = formik.touched[key as keyof typeof formik.touched];
      
      // Only show error if field is touched
      if (!touched) return;
      
      if (typeof error === "string") {
        errors[key] = error;
      } else if (Array.isArray(error)) {
        // Handle visitor array errors
        const touchedVisitors = formik.touched.visitors as any;
        (error as any[]).forEach((visitorError: any, index: number) => {
          if (visitorError && typeof visitorError === "object") {
            const visitorTouched = touchedVisitors?.[index];
            
            Object.keys(visitorError).forEach((field) => {
              const fieldError = visitorError[field];
              // Check if field is touched - check both nested structure and direct field access
              const fieldTouched = visitorTouched?.[field];
              // Also check if visitor object exists (means fields were marked as touched on submit)
              const isFieldTouched = fieldTouched === true || (visitorTouched && typeof visitorTouched === "object" && Object.keys(visitorTouched).length > 0);
              // For visitor aadhar "patient match" and "duplicate" errors: always show when we have the error and 12-digit value (so it shows even if user entered visitor first then patient)
              const isVisitorAadharMatchOrDuplicateError = field === "aadharCardNo" && typeof fieldError === "string" &&
                (fieldError === "Visitor Aadhar Card No. already exist" || fieldError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor");
              const visitorAadharValue = formik.values.visitors?.[index]?.aadharCardNo;
              const hasVisitorAadhar12Digits = visitorAadharValue && String(visitorAadharValue).trim().length === 12;
              if (isVisitorAadharMatchOrDuplicateError && hasVisitorAadhar12Digits) {
                errors[`visitorAadhar_${index}`] = fieldError;
              } else if (typeof fieldError === "string" && isFieldTouched) {
                // Other fields: show error only if field is touched
                if (field === "aadharCardNo") {
                  const visitorVal = formik.values.visitors?.[index]?.aadharCardNo;
                  if (visitorVal && visitorVal.trim().length === 12) {
                    errors[`visitorAadhar_${index}`] = fieldError;
                  }
                } else if (field === "passportNumber" && fieldError === "Visitor Passport Number already exist") {
                  const visitorValue = formik.values.visitors?.[index]?.passportNumber;
                  if (visitorValue && visitorValue.trim().length > 0) {
                    errors[`visitorPassport_${index}`] = fieldError;
                  }
                } else if (field === "nationalId" && fieldError === "Visitor National Id already exist") {
                  const visitorValue = formik.values.visitors?.[index]?.nationalId;
                  if (visitorValue && visitorValue.trim().length > 0) {
                    errors[`visitorNationalId_${index}`] = fieldError;
                  }
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
    });

    return errors;
  };

  // Sync visitor Aadhar vs patient Aadhar: set error on any visitor whose Aadhar matches patient's (and clear when no match)
  const syncVisitorAadharVsPatientAadharErrors = useCallback(() => {
    const patientAadhar = (formik.values.aadharCardNo || "").trim();
    const isIndian = formik.values.indianForeignerNepal === "Indian";
    const visitors = formik.values.visitors || [];
    if (!isIndian || patientAadhar.length !== 12) {
      if (skipClearingVisitorMatchErrorRef.current) return;
      visitors.forEach((_, index) => {
        const currentError = (formik.errors.visitors?.[index] as { aadharCardNo?: string } | undefined)?.aadharCardNo;
        if (currentError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
          formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
        }
      });
      return;
    }
    visitors.forEach((visitor, index) => {
      const visitorAadhar = (visitor.aadharCardNo || "").trim();
      const isIndianVisitor = visitor.country === "Indian";
      if (isIndianVisitor && visitorAadhar.length === 12) {
        if (visitorAadhar === patientAadhar) {
          formik.setFieldError(`visitors.${index}.aadharCardNo`, "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor");
          formik.setFieldTouched(`visitors.${index}.aadharCardNo`, true, false);
        } else {
          const currentError = (formik.errors.visitors?.[index] as { aadharCardNo?: string } | undefined)?.aadharCardNo;
          if (currentError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
            formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only depend on values; formik.errors read for clearing
  }, [formik.values.aadharCardNo, formik.values.indianForeignerNepal, formik.values.visitors]);

  // Whenever patient Aadhar or visitor Aadhar values change, re-check and show error if any visitor Aadhar matches patient
  const visitorAadharKeys = (formik.values.visitors || []).map((v) => v.aadharCardNo || "").join("|");
  useEffect(() => {
    syncVisitorAadharVsPatientAadharErrors();
  }, [formik.values.aadharCardNo, formik.values.indianForeignerNepal, visitorAadharKeys, syncVisitorAadharVsPatientAadharErrors]);

  const handleAddVisitor = () => {
    const currentVisitors = formik.values.visitors || [];
    if (currentVisitors.length >= 5) {
      // Show error message - you can customize this
      alert("Maximum 5 visitors allowed");
      return;
    }
    const newVisitor = {
      id: Date.now().toString(),
      nameSelect: "",
      name: "",
      country: "Indian",
      aadharCardNo: "",
      passportNumber: "",
      nationalId: "",
    };
    formik.setFieldValue("visitors", [...currentVisitors, newVisitor]);
  };

  const handleVisitorAadharLookup = async (index: number, overrideAadhar?: string) => {
    const currentVisitors = formik.values.visitors || [];
    const visitor = currentVisitors[index];
    if (!visitor) return;

    const visitorKey = String(visitor.id ?? index);
    const aadhar = (overrideAadhar ?? visitor.aadharCardNo ?? "").trim();

    if (!aadhar || aadhar.length !== 12) return;
    if (visitorLookupLoading[visitorKey]) return;

    try {
      setVisitorLookupLoading((prev) => ({ ...prev, [visitorKey]: true }));
      const result = await getVisitorByAadhar({ visitorAadharCardNo: aadhar }).unwrap();
      const list = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];

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

    const currentVisitors = formik.values.visitors || [];
    const visitor = currentVisitors[visitorDialogVisitorIndex];
    if (!visitor) return;

    const visitorKey = String(visitor.id ?? visitorDialogVisitorIndex);
    setLockedVisitors((prev) => {
      const next = { ...prev };
      delete next[visitorKey];
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
      const currentVisitors = formik.values.visitors || [];
      const index = visitorDialogVisitorIndex;
      const current = currentVisitors[index];
      if (!current) return;

      const visitorKey = String(current.id ?? index);
      const apiCountry = String(visitor.visitorNationality || visitor.visitorCountry || "").toLowerCase();
      const normalizedCountry =
        apiCountry.includes("foreigner")
          ? "Foreigner"
          : apiCountry.includes("nepal")
            ? "Nepal"
            : "Indian";

      const updatedVisitors = [...currentVisitors];
      updatedVisitors[index] = {
        ...current,
        nameSelect: (visitor.visitorTitle || "").trim() || current.nameSelect || "Mr",
        name: (visitor.visitorName || "").trim() || current.name,
        aadharCardNo: (visitor.visitorAadharCardNo || "").trim() || current.aadharCardNo,
        country: normalizedCountry,
        visitorContactNumber: (visitor.visitorContactNumber || "").trim(),
      };

      formik.setFieldValue("visitors", updatedVisitors, false);
      formik.setFieldTouched(`visitors.${index}.nameSelect`, true, false);
      formik.setFieldTouched(`visitors.${index}.name`, true, false);
      formik.setFieldTouched(`visitors.${index}.aadharCardNo`, true, false);
      formik.setFieldTouched(`visitors.${index}.country`, true, false);
      formik.setFieldError(`visitors.${index}.nameSelect`, undefined);
      formik.setFieldError(`visitors.${index}.name`, undefined);
      formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
      formik.setFieldError(`visitors.${index}.country`, undefined);

      // Store full visitor API data (address, pincode, purpose, etc.) for use in payload
      setVisitorApiData((prev) => ({ ...prev, [index]: visitor }));

      setLockedVisitors((prev) => ({ ...prev, [visitorKey]: true }));
      handleVisitorDialogClose({ skipClearAadhar: true });
    } finally {
      setVisitorDialogSelectingId(null);
    }
  };

  const handleRemoveVisitor = (id: string) => {
    const currentVisitors = formik.values.visitors || [];
    const removedIndex = currentVisitors.findIndex((v) => v.id === id);
    const updatedVisitors = currentVisitors.filter((visitor) => visitor.id !== id);

    setLockedVisitors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    // Remove visitor API data for removed index and re-key remaining entries
    if (removedIndex !== -1) {
      setVisitorApiData((prev) => {
        const next: Record<number, VisitorByAadharItem> = {};
        Object.entries(prev).forEach(([key, value]) => {
          const k = Number(key);
          if (k < removedIndex) next[k] = value;
          else if (k > removedIndex) next[k - 1] = value;
        });
        return next;
      });
    }
    setVisitorLookupLoading((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    
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
    
    // Multiple visitors remain - re-check duplicates against the updated array only
    setTimeout(() => {
      const finalVisitors = updatedVisitors;
      const nationality = formik.values.indianForeignerNepal;
      
      finalVisitors.forEach((visitor, index) => {
        // Check for duplicate Aadhar Card numbers if nationality is Indian
        if (nationality === "Indian" && visitor.aadharCardNo && visitor.aadharCardNo.trim().length === 12) {
          const duplicateCount = finalVisitors.filter((v, idx) => 
            idx !== index && v.aadharCardNo && v.aadharCardNo.trim() === visitor.aadharCardNo
          ).length;
          
          if (duplicateCount > 0) {
            // Duplicate found, set error only on the field with duplicate
            formik.setFieldError(`visitors.${index}.aadharCardNo`, "Visitor Aadhar Card No. already exist");
            formik.setFieldTouched(`visitors.${index}.aadharCardNo`, true, false);
          }
        }
        
        // Check for duplicate Passport Numbers if nationality is Foreigner
        if (nationality === "Foreigner" && visitor.passportNumber && visitor.passportNumber.trim().length > 0) {
          const visitorPassportNumber = visitor.passportNumber!.trim();
          const duplicateCount = finalVisitors.filter((v, idx) => 
            idx !== index && v.passportNumber && v.passportNumber.trim() === visitorPassportNumber
          ).length;
          
          if (duplicateCount > 0) {
            // Duplicate found, set error only on the field with duplicate
            formik.setFieldError(`visitors.${index}.passportNumber`, "Visitor Passport Number already exist");
            formik.setFieldTouched(`visitors.${index}.passportNumber`, true, false);
          }
        }
        
        // Check for duplicate National IDs if nationality is Nepal
        if (nationality === "Nepal" && visitor.nationalId && visitor.nationalId.trim().length > 0) {
          const visitorNationalId = visitor.nationalId.trim();
          const duplicateCount = finalVisitors.filter((v, idx) => 
            idx !== index && v.nationalId && v.nationalId.trim() === visitorNationalId
          ).length;
          
          if (duplicateCount > 0) {
            // Duplicate found, set error only on the field with duplicate
            formik.setFieldError(`visitors.${index}.nationalId`, "Visitor National Id already exist");
            formik.setFieldTouched(`visitors.${index}.nationalId`, true, false);
          }
        }
      });
    }, 0);
  };

  const handleVisitorChange = (id: string, field: "nameSelect" | "name" | "aadharCardNo" | "passportNumber" | "nationalId" | "country", value: string) => {
    if (
      lockedVisitors[id] &&
      (field === "aadharCardNo" || field === "nameSelect" || field === "name" || field === "country")
    ) {
      return;
    }

    const currentVisitors = formik.values.visitors || [];
    const visitorIndex = currentVisitors.findIndex((v) => v.id === id);
    
    if (visitorIndex >= 0) {
      let updatedVisitors = currentVisitors.map((visitor) =>
        visitor.id === id ? { ...visitor, [field]: value } : visitor
      );
      
      // Clear identification fields when nationality changes
      if (field === "country") {
        const visitor = updatedVisitors.find((v) => v.id === id);
        if (visitor) {
          if (value === "Indian") {
            // Clear passport and nationalId for Indian
            visitor.passportNumber = "";
            visitor.nationalId = "";
            // Clear errors for these fields
            formik.setFieldError(`visitors.${visitorIndex}.passportNumber`, undefined);
            formik.setFieldError(`visitors.${visitorIndex}.nationalId`, undefined);
          } else if (value === "Foreigner") {
            // Clear aadharCardNo and nationalId for Foreigner
            visitor.aadharCardNo = "";
            visitor.nationalId = "";
            // Clear errors for these fields
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, undefined);
            formik.setFieldError(`visitors.${visitorIndex}.nationalId`, undefined);
          } else if (value === "Nepal") {
            // Clear aadharCardNo and passportNumber for Nepal
            visitor.aadharCardNo = "";
            visitor.passportNumber = "";
            // Clear errors for these fields
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, undefined);
            formik.setFieldError(`visitors.${visitorIndex}.passportNumber`, undefined);
          }
        }
      }
      
      formik.setFieldValue("visitors", updatedVisitors, false);
      
      // Check for duplicate Aadhar Card numbers if field is aadharCardNo and nationality is Indian
      // Show error instantly when 12 digits are entered and it's a duplicate (only on the field being edited)
      if (field === "aadharCardNo" && formik.values.indianForeignerNepal === "Indian") {
        let shouldLookupVisitor = false;
        const lookupAadhar = value.trim();
        if (!value || value.trim() === "") {
          // Empty value - clear all errors if exists
          const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.aadharCardNo;
          if (currentError === "Visitor Aadhar Card No. already exist" || 
              currentError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, undefined);
          }
          setLockedVisitors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } else if (value && value.trim().length === 12) {
          const trimmedValue = value.trim();
          const patientAadharCard = formik.values.aadharCardNo?.trim() || "";
          
          // First check: Visitor Aadhar Card cannot match Patient Aadhar Card
          if (patientAadharCard && patientAadharCard.length === 12 && trimmedValue === patientAadharCard) {
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor");
            formik.setFieldTouched(`visitors.${visitorIndex}.aadharCardNo`, true, false);
            return; // Don't check for duplicate visitors if it matches patient
          }
          
          // Clear patient match error if it doesn't match anymore
          const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.aadharCardNo;
          if (currentError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, undefined);
          }
          
          // Second check: Check for duplicates in updatedVisitors array (excluding current visitor)
          const duplicateCount = updatedVisitors.filter((visitor, idx) => 
            idx !== visitorIndex && visitor.aadharCardNo && visitor.aadharCardNo.trim() === trimmedValue
          ).length;
          
          // If duplicate found, set error only on the current field being edited
          if (duplicateCount > 0) {
            formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, "Visitor Aadhar Card No. already exist");
            formik.setFieldTouched(`visitors.${visitorIndex}.aadharCardNo`, true, false);
          } else {
            // No duplicate, clear duplicate error if exists and validate normally
            if (currentError === "Visitor Aadhar Card No. already exist") {
              formik.setFieldError(`visitors.${visitorIndex}.aadharCardNo`, undefined);
            }
            // Validate field normally (for other validations like length, digits)
            setTimeout(() => {
              formik.validateField(`visitors.${visitorIndex}.aadharCardNo`);
            }, 0);
            shouldLookupVisitor = true;
          }
        } else if (value && value.trim().length < 12) {
          // If less than 12 digits, clear all errors (user is still typing)
          const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.aadharCardNo;
          if (currentError === "Visitor Aadhar Card No. already exist" || 
              currentError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
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
      
      // Check for duplicate Passport Numbers if field is passportNumber and nationality is Foreigner
      // Show error instantly when value is entered and it's a duplicate (only on the field being edited)
      if (field === "passportNumber" && formik.values.indianForeignerNepal === "Foreigner") {
        if (!value || value.trim() === "") {
          // Empty value - clear duplicate error if exists
          const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.passportNumber;
          if (currentError === "Visitor Passport Number already exist") {
            formik.setFieldError(`visitors.${visitorIndex}.passportNumber`, undefined);
          }
        } else if (value && value.trim().length > 0) {
          // Check for duplicates in updatedVisitors array (excluding current visitor)
          const duplicateCount = updatedVisitors.filter((visitor, idx) => 
            idx !== visitorIndex && visitor.passportNumber && visitor.passportNumber.trim() === value.trim()
          ).length;
          
          // If duplicate found, set error only on the current field being edited
          if (duplicateCount > 0) {
            formik.setFieldError(`visitors.${visitorIndex}.passportNumber`, "Visitor Passport Number already exist");
            formik.setFieldTouched(`visitors.${visitorIndex}.passportNumber`, true, false);
          } else {
            // No duplicate, clear duplicate error if exists and validate normally
            const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.passportNumber;
            if (currentError === "Visitor Passport Number already exist") {
              formik.setFieldError(`visitors.${visitorIndex}.passportNumber`, undefined);
            }
            // Validate field normally
            setTimeout(() => {
              formik.validateField(`visitors.${visitorIndex}.passportNumber`);
            }, 0);
          }
        }
      }
      
      // Check for duplicate National IDs if field is nationalId and nationality is Nepal
      // Show error instantly when value is entered and it's a duplicate (only on the field being edited)
      if (field === "nationalId" && formik.values.indianForeignerNepal === "Nepal") {
        if (!value || value.trim() === "") {
          // Empty value - clear duplicate error if exists
          const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.nationalId;
          if (currentError === "Visitor National Id already exist") {
            formik.setFieldError(`visitors.${visitorIndex}.nationalId`, undefined);
          }
        } else if (value && value.trim().length > 0) {
          // Check for duplicates in updatedVisitors array (excluding current visitor)
          const duplicateCount = updatedVisitors.filter((visitor, idx) => 
            idx !== visitorIndex && visitor.nationalId && visitor.nationalId.trim() === value.trim()
          ).length;
          
          // If duplicate found, set error only on the current field being edited
          if (duplicateCount > 0) {
            formik.setFieldError(`visitors.${visitorIndex}.nationalId`, "Visitor National Id already exist");
            formik.setFieldTouched(`visitors.${visitorIndex}.nationalId`, true, false);
          } else {
            // No duplicate, clear duplicate error if exists and validate normally
            const currentError = (formik.errors.visitors?.[visitorIndex] as any)?.nationalId;
            if (currentError === "Visitor National Id already exist") {
              formik.setFieldError(`visitors.${visitorIndex}.nationalId`, undefined);
            }
            // Validate field normally
            setTimeout(() => {
              formik.validateField(`visitors.${visitorIndex}.nationalId`);
            }, 0);
          }
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
      
      // If field was touched and had an error (but not duplicate error or patient match error), validate on change to clear error immediately
      if (isTouched && hasError && 
          hasError !== "Visitor Aadhar Card No. already exist" &&
          hasError !== "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor" &&
          hasError !== "Visitor Passport Number already exist" &&
          hasError !== "Visitor National Id already exist") {
        setTimeout(() => {
          formik.validateField(fieldPath);
        }, 0);
      }
    }
  };

  const handleGoToHome = () => {
    router.push("/gate");
  };


  // Flatten validation errors to same keys as scrollToErrorField (for first-error lookup by sequence).
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

  // Ref → target ref according to sequence (same as form layout: first after contact number, then next, then next).
  // Personal Details: Contact → Title → Patient Name → Indian/Foreigner/Nepal → Aadhar/Passport/NationalId → Age → Patient Type → Panel.
  // Address Details: Country → Pin Code → State → District (city) → Tehsil/Area → Post Office (area) → Address.
  const NEW_PATIENT_FIELD_ORDER: readonly string[] = [
    "contactNumber",       // 1 → contactNumberRef
    "patientNameSelect",   // 2 → patientNameSelectRef (Title)
    "patientName",         // 3 → patientNameRef
    "indianForeignerNepal",// 4 → indianForeignerNepalRef
    "aadharCardNo",        // 5 → aadharCardNoRef
    "passportNumber",      // 6 → passportNumberRef
    "nationalId",          // 7 → nationalIdRef
    "age",                 // 8 → ageRef
    "patientType",         // 9 → patientTypeRef
    "panel",               // 10 → panelRef
    "country",             // 11 → countryRef
    "pinCode",             // 12 → pinCodeRef
    "state",               // 13 → stateRef
    "city",                // 14 → cityRef (District)
    "tehsil",              // 15 → data-field tehsil (Tehsil/Area)
    "area",                // 16 → data-field area (Post Office)
    "address",             // 17 → addressRef
    "addressLine1",        // 18 → addressLine1Ref
    "addressLine2",        // 19 → addressLine2Ref
  ];

  const scrollToFirstError = (validationErrors?: typeof formik.errors) => {
    const errors = validationErrors ? flattenValidationErrors(validationErrors) : getFormErrors();
    if (Object.keys(errors).length === 0) return;
    const visitorCount = formik.values.visitors?.length ?? 0;
    const order: string[] = [...NEW_PATIENT_FIELD_ORDER];
    for (let i = 0; i < visitorCount; i++) {
      order.push(`visitorTitle_${i}`, `visitorName_${i}`, `visitorAadhar_${i}`, `visitorPassport_${i}`, `visitorNationalId_${i}`);
    }
    const firstErrorKey = order.find((key) => errors[key]);
    if (firstErrorKey) scrollToErrorField(firstErrorKey);
  };

  // Map error key → target ref (same sequence as NEW_PATIENT_FIELD_ORDER + visitor keys).
  const scrollToErrorField = (errorKey: string) => {
    const fieldRefMap: Record<string, React.RefObject<HTMLElement | null>> = {
      contactNumber: contactNumberRef as React.RefObject<HTMLElement>,
      aadharCardNo: aadharCardNoRef as React.RefObject<HTMLElement>,
      passportNumber: passportNumberRef as React.RefObject<HTMLElement>,
      nationalId: nationalIdRef as React.RefObject<HTMLElement>,
      patientNameSelect: patientNameSelectRef,
      patientName: patientNameRef as React.RefObject<HTMLElement>,
      age: ageRef as React.RefObject<HTMLElement>,
      indianForeignerNepal: indianForeignerNepalRef,
      patientType: patientTypeRef,
      panel: panelRef,
      pinCode: pinCodeRef as React.RefObject<HTMLElement>,
      country: countryRef,
      state: stateRef,
      city: cityRef,
      address: addressRef as React.RefObject<HTMLElement>,
      addressLine1: addressLine1Ref as React.RefObject<HTMLElement>,
      addressLine2: addressLine2Ref as React.RefObject<HTMLElement>,
    };

    // Visitor fields: ref by visitor id (sequence = visitorTitle_0, visitorName_0, visitorAadhar_0, ...)
    if (errorKey.startsWith("visitorTitle_")) {
      const index = parseInt(errorKey.replace("visitorTitle_", ""), 10);
      const visitor = formik.values.visitors?.[index];
      if (visitor?.id) {
        const target = visitorTitleRefs.current[visitor.id];
        if (target) {
          setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            const triggerButton = target.querySelector('button[type="button"]');
            if (triggerButton instanceof HTMLElement) setTimeout(() => triggerButton.focus(), 150);
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

    // Handle regular fields - try ref first, then data attribute
    const ref = fieldRefMap[errorKey];
    let targetElement: HTMLElement | null = null;

    if (ref?.current) {
      targetElement = ref.current;
    } else {
      // Fallback: try to find by data-field attribute
      const element = document.querySelector(`[data-field="${errorKey}"]`);
      if (element instanceof HTMLElement) {
        targetElement = element;
      }
    }

    if (targetElement) {
      setTimeout(() => {
        targetElement?.scrollIntoView({ behavior: "smooth", block: "center" });

        // For input/textarea fields, focus them directly
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
          targetElement.focus();
        } else {
          // For select fields, try to find and focus the trigger button
          const triggerButton = targetElement.querySelector('button[type="button"]');
          if (triggerButton instanceof HTMLElement) {
            // Small delay to ensure scroll completes before focus
            setTimeout(() => {
              triggerButton.focus();
            }, 150);
          }
        }
      }, 100);
    }
  };

  // Handle form submission (assumes form is already validated)
  const handleFormSubmit = async (values: GateNewPatientFormValues) => {
    console.log("Form submit clicked");
    console.log("Form data:", values);
    console.log("Visitors:", values.visitors);

    // Additional check for required fields (double-check before API call)
    if (!values.indianForeignerNepal || values.indianForeignerNepal.trim() === "") {
      formik.setFieldError("indianForeignerNepal", "Nationality is required");
      scrollToErrorField("indianForeignerNepal");
      return;
    }

    // Re-verify: no visitor Aadhar may match patient Aadhar (instant error and block submit)
    const patientAadharTrim = (values.aadharCardNo || "").trim();
    if (values.indianForeignerNepal === "Indian" && patientAadharTrim.length === 12) {
      const visitors = values.visitors || [];
      let firstMatchingIndex: number | null = null;
      for (let i = 0; i < visitors.length; i++) {
        const v = visitors[i];
        const visitorAadhar = (v.aadharCardNo || "").trim();
        if (v.country === "Indian" && visitorAadhar.length === 12 && visitorAadhar === patientAadharTrim) {
          formik.setFieldError(`visitors.${i}.aadharCardNo`, "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor");
          formik.setFieldTouched(`visitors.${i}.aadharCardNo`, true, false);
          if (firstMatchingIndex === null) firstMatchingIndex = i;
        }
      }
      if (firstMatchingIndex !== null) {
        scrollToErrorField(`visitorAadhar_${firstMatchingIndex}`);
        return;
      }
    }

    console.log("Validation passed. Calling API...");

    try {
      // Transform visitors data to match API format based on each visitor's nationality
      const visitorsData = (values.visitors || []).map((visitor, idx) => {
        const visitorNationality = visitor.country || "Indian";
        const apiData = visitorApiData[idx];

        // Address fields from the "Visitor Already Exists" dialog selection (if available)
        const addressFields = apiData ? {
          ...(apiData.visitorContactNumber ? { visitorContactNumber: apiData.visitorContactNumber.trim() } : {}),
          ...(apiData.visitorPinCode ? { visitorPinCode: apiData.visitorPinCode } : {}),
          ...(apiData.visitorAddress ? { visitorAddress: apiData.visitorAddress } : {}),
          ...(apiData.visitorCity ? { visitorCity: apiData.visitorCity } : {}),
          ...(apiData.visitorState ? { visitorState: apiData.visitorState } : {}),
          ...(apiData.visitorCountry ? { visitorCountry: apiData.visitorCountry } : {}),
          ...(apiData.visitorTehsil ? { visitorTehsil: apiData.visitorTehsil } : {}),
          ...(apiData.visitorArea ? { visitorArea: apiData.visitorArea } : {}),
          ...(apiData.visitorAddressLine1 ? { visitorAddressLine1: apiData.visitorAddressLine1 } : {}),
          ...(apiData.visitorAddressLine2 ? { visitorAddressLine2: apiData.visitorAddressLine2 } : {}),
          ...(apiData.visitorPurpose ? { visitorPurpose: apiData.visitorPurpose } : {}),
          ...(apiData.visitorNationality ? { visitorNationality: apiData.visitorNationality } : {}),
          ...(apiData.visitorCompanyName ? { visitorCompanyName: apiData.visitorCompanyName } : {}),
        } : {};

        const baseVisitor = {
          visitorTitle: visitor.nameSelect || undefined,
          visitorName: visitor.name,
          visitorContactNumber: (visitor.visitorContactNumber || "").trim(),
          visitorCountry: visitor.country || "Indian",
          visitorNationality: visitorNationality, // Visitor nationality (Indian, Nepal, Foreigner)
          visitorType: "OPD", // Default visitor type
          ...addressFields,
        };
        
        // Add the appropriate ID field based on each visitor's nationality
        if (visitorNationality === "Indian") {
          return {
            ...baseVisitor,
            visitorAadharCardNo: visitor.aadharCardNo || undefined,
            visitorPassportNumber: undefined,
            visitorNationalId: undefined,
          };
        } else if (visitorNationality === "Foreigner") {
          return {
            ...baseVisitor,
            visitorPassportNumber: visitor.passportNumber || undefined,
            visitorAadharCardNo: undefined,
            visitorNationalId: undefined,
          };
        } else if (visitorNationality === "Nepal") {
          return {
            ...baseVisitor,
            visitorNationalId: visitor.nationalId || undefined,
            visitorAadharCardNo: undefined,
            visitorPassportNumber: undefined,
          };
        }
        
        // Fallback (shouldn't happen) - default to Indian
        return {
          ...baseVisitor,
          visitorAadharCardNo: visitor.aadharCardNo || undefined,
          visitorPassportNumber: undefined,
          visitorNationalId: undefined,
        };
      });

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

      const getTehsilName = async (tehsilId: string, cityId: string): Promise<string> => {
        if (!tehsilId || !cityId) return tehsilId || "";
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
        if (!areaId || !tehsilId) return areaId || "";
        try {
          const result = await getAreasQuery({ tehsilId: tehsilId }).unwrap();
          const area = result?.data?.find((a: any) => a.id.toString() === areaId);
          return area?.name || areaId;
        } catch (error) {
          console.error("Error fetching area name:", error);
          return areaId;
        }
      };

      // Determine entryType: "old" if patient is selected from "Patient Already Exists" dialog
      // This happens when isRevisitMode is true OR when prefilledPatientData exists (from revisit-patient page)
      const entryType = (isRevisitMode || prefilledPatientData) ? "old" : "new";

      // Build payload with conditional ID fields based on nationality
      const payload: any = {
        title: values.patientNameSelect || undefined, // Patient title
        contactNo: values.contactNumber,
        name: values.patientName,
        age: values.age,
        nationality: values.indianForeignerNepal,
        patientType: values.patientType,
        maritalStatus: values.maritalStatus,
        occupation: values.occupation,
        emailAddress: values.emailAddress,
        pinCode: values.pinCode || "",
        country: values.country ? getCountryName(values.country) : "",
        patientState: values.state ? getStateName(values.state) : "",
        city: values.city ? getCityName(values.city) : "",
        ...(values.country === "6"
          ? { patientAddress: values.address }
          : {
              addressLine1: values.addressLine1 || "",
              addressLine2: values.addressLine2 || "",
            }),
        visitors: visitorsData,
        branchId: branchId,
        entryType: entryType, // Set to "old" when patient is selected from "Patient Already Exists" dialog, otherwise "new"
        vehiclePhoto: values.vehiclePhoto as File | null,
        aadharPhoto: values.aadharPhoto as File | null,
        // Add isPreBooking and preBookingId when preBookings array is empty
        isPreBooking: preBookingInfo.isPreBooking,
        preBookingId: preBookingInfo.preBookingId,
      };

      // Add userLead ID to payload when data is from userLead (both registrations and preBookings are empty)
      if (userLeadId !== null) {
        payload.userLeadId = userLeadId;
        console.log("Added userLeadId to payload:", userLeadId);
      }

      // Add registrationId and UHID when entryType is "old" (existing patient)
      if (entryType === "old") {
        // First, try to get registrationId and UHID from selectedPatientForRevisit (when patient is selected from dialog)
        if (selectedPatientForRevisit) {
          if (selectedPatientForRevisit.id) {
            payload.registrationId = selectedPatientForRevisit.id;
          }
          if (selectedPatientForRevisit.uhid) {
            payload.uhid = selectedPatientForRevisit.uhid;
          }
        } 
        // Then, try to get registrationId and UHID from prefilledPatientData (when coming from revisit-patient page)
        else if (prefilledPatientData) {
          if (prefilledPatientData.id) {
            payload.registrationId = prefilledPatientData.id;
          }
          if (prefilledPatientData.uhid) {
            payload.uhid = prefilledPatientData.uhid;
          }
        } 
        // If not available, fetch from registrations-and-pre-bookings API
        else {
          try {
            const result = await checkExistingPatientsQuery({
              branchId: branchId,
              phoneNumber: values.contactNumber,
            }).unwrap();
            
            // Get registrationId (id) and UHID from the first registration if available
            const registrations = result.data?.registrations || [];
            const preBookings = result.data?.preBookings || [];
            const userLead = result.data?.userLead;
            
            // Priority: registrations > preBookings > userLead
            if (registrations.length > 0) {
              if (registrations[0].id) {
                payload.registrationId = registrations[0].id;
              }
              if (registrations[0].uhid) {
                payload.uhid = registrations[0].uhid;
              }
            } else if (preBookings.length > 0) {
              // Pre-bookings don't have registrationId, but may have UHID
              if (preBookings[0].uhid) {
                payload.uhid = preBookings[0].uhid;
              }
            } else if (userLead && Object.keys(userLead).length > 0) {
              // userLead may have UHID but typically won't have registrationId (it's a lead, not a registration)
              const userLeadData = userLead as any;
              if (userLeadData.uhid) {
                payload.uhid = userLeadData.uhid;
              }
              // Add userLead ID to payload when both registrations and preBookings are empty
              if (userLeadData.id) {
                payload.userLeadId = userLeadData.id;
              }
              // Note: userLead typically won't have registrationId since it's not yet registered
            }
          } catch (error) {
            console.error("Error fetching registrationId and UHID from registrations-and-pre-bookings API:", error);
            // Continue without registrationId and UHID if API call fails
          }
        }
      }

      // Add panelId - mandatory field based on patientType
      // Always set panelId based on patientType
      const patientTypeNormalized = values.patientType?.trim() || "";
      
      if (patientTypeNormalized === "Private" || patientTypeNormalized.toLowerCase() === "private") {
        const id = findActivePanelIdByName(panelsData?.data, DEFAULT_PANEL_NAME_FOR_PRIVATE);
        if (id != null) payload.panelId = id;
      } else if (patientTypeNormalized === "TPA" || patientTypeNormalized.toLowerCase() === "tpa") {
        const id = findActivePanelIdByName(panelsData?.data, DEFAULT_PANEL_NAME_FOR_TPA_TYPE);
        if (id != null) payload.panelId = id;
      } else if (patientTypeNormalized === "Panel" || patientTypeNormalized.toLowerCase() === "panel") {
        // Set panelId to selected panel value when Panel is selected
        if (values.panel) {
          payload.panelId = parseInt(values.panel, 10);
          console.log("Setting panelId to", payload.panelId, "for Panel patientType");
        }
      }
      
      if (!payload.panelId && patientTypeNormalized?.toLowerCase() === "tpa") {
        const id = findActivePanelIdByName(panelsData?.data, DEFAULT_PANEL_NAME_FOR_TPA_TYPE);
        if (id != null) payload.panelId = id;
      }

      // Add the appropriate ID field based on nationality
      if (values.indianForeignerNepal === "Indian") {
        payload.aadharCardNo = values.aadharCardNo;
      } else if (values.indianForeignerNepal === "Foreigner") {
        payload.passportNumber = values.passportNumber;
      } else if (values.indianForeignerNepal === "Nepal") {
        payload.nationalId = values.nationalId;
      }

      // Fetch tehsil and area names if IDs are present
      if (values.tehsil && values.city) {
        const tehsilName = await getTehsilName(values.tehsil, values.city);
        payload.tehsil = tehsilName;
      }
      if (values.area && values.tehsil) {
        // Always set areaId from the selected area ID (this is the numeric ID from areas API response)
        // values.area contains the area ID (e.g., 332662) from the areas API
        payload.areaId = values.area;
        
        // Fetch area name for the payload
        try {
          const areaName = await getAreaName(values.area, values.tehsil);
          payload.area = areaName;
        } catch (error) {
          console.error("Error fetching area name, but areaId is still set:", error);
          // Even if area name fetch fails, areaId is already set above
          payload.area = values.area; // Fallback to ID if name fetch fails
        }
      }

      console.log("API Payload:", payload);

      const response = await newPatientEntry(payload).unwrap();

      console.log("Patient entry created successfully:", response);

      // Show success message
      setSuccessMessage(response.message || "Patient entry created successfully!");
      setShowSuccessDialog(true);

      // Reset form after successful submission
      setTimeout(() => {
        formik.resetForm();
        formik.setFieldValue("visitors", []);
        setIsRevisitMode(false); // Reset revisit mode
        setSelectedPatientForRevisit(null); // Clear selected patient data
      }, 2000);

    } catch (error: any) {
      console.error("Error submitting form:", error);

      // Handle error - show error message
      let errorMsg = "Failed to submit patient entry. Please try again.";

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

  const handleBack = () => {
    router.back();
  };

  // Check for existing patients by contact number
  const checkExistingPatients = async (contactNumber: string) => {
    if (!contactNumber || contactNumber.length !== 10) {
      // Clear the last checked ref if contact number is invalid
      lastCheckedContactNumberRef.current = "";
      return;
    }
    
    // Don't check if dialog is being closed
    if (isClosingDialogRef.current) return;
    
    // Prevent duplicate calls for the same contact number
    if (lastCheckedContactNumberRef.current === contactNumber) {
      return;
    }

    // Clear any pending timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }

    // Set the last checked contact number immediately to prevent duplicate calls
    lastCheckedContactNumberRef.current = contactNumber;

    setIsContactLoading(true);
    try {
      const result = await checkExistingPatientsQuery({
        branchId: branchId,
        phoneNumber: contactNumber,
      }).unwrap();

      // Double-check if dialog is being closed after async operation
      if (isClosingDialogRef.current) {
        lastCheckedContactNumberRef.current = "";
        return;
      }

      // Handle new response structure with registrations and preBookings
      const registrations = result.data?.registrations || [];
      const preBookings = result.data?.preBookings || [];
      const userLead = result.data?.userLead;

      // Map registrations
      const mappedRegistrations: ExistingPatient[] = (registrations as any[]).map((patient: any) => ({
        ...patient,
        name: patient.patientName || patient.name,
        branchName: patient.branchName || "N/A",
        isPreBooking: false,
        preBookingId: null,
      }));

      // Map pre-bookings – support both snake_case (new API) and camelCase (old API)
      const mappedPreBookings: ExistingPatient[] = (preBookings as any[]).map((pb: any) => {
        const patientName = pb.patient_name ?? pb.patientName ?? pb.patient ?? "";
        const patientTitle = pb.patient_title ?? pb.patientTitle ?? undefined;
        const guardianName = pb.guardian_name ?? pb.guardianName ?? "";
        const guardianTitle = pb.guardian_title ?? pb.guardianTitle ?? undefined;
        const contactNumber = pb.contact_number ?? pb.contactNumber ?? "";
        const emailAddress = pb.email_address ?? pb.emailAddress ?? undefined;
        const maritalStatus = pb.marital_status ?? pb.maritalStatus ?? "";
        const patientType = pb.patient_type ?? pb.patientType ?? null;
        const patientSubType = pb.patient_sub_type ?? pb.patientSubType ?? null;
        const benificiaryId = pb.benificiary_id ?? pb.benificiaryId ?? null;
        const insuranceCompany = pb.insurance_company ?? pb.insuranceCompany ?? null;
        const ayushCovered = pb.ayush_covered ?? pb.ayushCovered ?? null;
        const pinCode = pb.pin_code ?? pb.pinCode ?? "";
        const addressLine1 = pb.address_line1 ?? pb.addressLine1 ?? undefined;
        const addressLine2 = pb.address_line2 ?? pb.addressLine2 ?? undefined;
        let addictionType: string[] | undefined;
        try {
          if (Array.isArray(pb.addiction)) addictionType = pb.addiction;
          else if (typeof pb.addiction === "string" && pb.addiction) addictionType = JSON.parse(pb.addiction);
        } catch { addictionType = undefined; }
        return {
          id: pb.id || 0,
          sUhid: null,
          uhid: pb.uhid || "",
          branchId: pb.branch_id ?? pb.branchId ?? branchId,
          patientName,
          patientTitle,
          doctorUserId: pb.doctor_user_id ?? pb.doctorUserId ?? undefined,
          gender: pb.gender || "",
          age: pb.age || "",
          contactNumber,
          whatsappNo: contactNumber,
          emailAddress,
          maritalStatus,
          aadharCardNo: undefined,
          occupation: undefined,
          religion: undefined,
          specificReligion: null,
          jsHealthCardNo: null,
          guardianName,
          guardianTitle,
          patientType,
          panelId: pb.panel_id ?? pb.panelId ?? null,
          patientSubType,
          benificiaryId,
          insuranceCompany,
          ayushCovered,
          addictionType,
          addictionSpecify: pb.addiction_specify ?? pb.addictionSpecify ?? undefined,
          diagnosis: String(pb.diagnosis_id ?? pb.diagnosisId ?? ""),
          subDiagnosis: String(pb.sub_diagnosis_id ?? pb.subDiagnosisId ?? ""),
          symptoms: pb.symptoms ?? undefined,
          address: {
            id: 0,
            address: pb.address || "",
            city: pb.city || "",
            pinCode,
            state: pb.state || "",
            country: pb.country === "101" ? "6" : (pb.country || "India"),
            tehsil: pb.tehsil || undefined,
            area: pb.area || undefined,
            addressLine1,
            addressLine2,
            areaId: pb.area_id ?? pb.areaId ?? undefined,
          },
          name: patientName,
          branchName: "N/A",
          isPreBooking: true,
          preBookingId: pb.id || null,
        } as ExistingPatient;
      });

      // Set preBookingInfo based on what we found
      if (preBookings.length > 0) {
        setPreBookingInfo({
          isPreBooking: true,
          preBookingId: preBookings[0]?.id || null,
        });
      } else {
        setPreBookingInfo({
          isPreBooking: false,
          preBookingId: null,
        });
      }

      // Priority: preBookings first. If preBookings exist, show ONLY preBookings.
      // If no preBookings but registrations exist, show only registrations.
      if (preBookings.length > 0) {
        setExistingPatients(mappedPreBookings);
        setIsUserLeadData(false);
        setIsGateEntriesOnly(false);
        setUserLeadId(null);
        setPatientExistsDialogOpen(true);
      } else if (registrations.length > 0) {
        setExistingPatients(mappedRegistrations);
        setIsUserLeadData(false);
        setIsGateEntriesOnly(false);
        setUserLeadId(null);
        setPatientExistsDialogOpen(true);
      } else if (userLead && Object.keys(userLead).length > 0) {
        // Check if userLead has data (not empty object)
        // Transform userLead to match ExistingPatient format
        const userLeadData = userLead as any; // Type assertion to handle dynamic userLead structure
        // Create address object from userLead data if address doesn't exist
        const userLeadAddress = userLeadData.address || {
          pinCode: userLeadData.pinCode || undefined,
          city: userLeadData.city || undefined,
          state: userLeadData.state || undefined,
          country: userLeadData.country || undefined,
          address: userLeadData.address || undefined,
          areaId: userLeadData.areaId || undefined,
          area: userLeadData.area || undefined,
          tehsil: userLeadData.tehsil || undefined,
        };
        
        const transformedUserLead: ExistingPatient = {
          id: userLeadData.id || 0,
          sUhid: userLeadData.sUhid || null,
          uhid: userLeadData.uhid || "",
          branchId: userLeadData.branchId || branchId,
          patientName: userLeadData.patientName || userLeadData.name || "",
          patientTitle: userLeadData.patientTitle || "",
          doctorUserId: userLeadData.doctorUserId,
          gender: userLeadData.gender || "",
          age: userLeadData.age || "",
          contactNumber: userLeadData.contactNumber || "",
          whatsappNo: (userLeadData.whatsappNo || userLeadData.whatsappNumber || "") as string,
          emailAddress: userLeadData.emailAddress || "",
          maritalStatus: userLeadData.maritalStatus || "",
          aadharCardNo: userLeadData.aadharCardNo || "",
          occupation: userLeadData.occupation || "",
          patientType: userLeadData.patientType || null,
          panelId: userLeadData.panelId || null,
          address: userLeadAddress,
          name: userLeadData.patientName || userLeadData.name || "",
          branchName: userLeadData.branchName || "N/A",
          // Include any other fields from userLead that might be needed
          ...Object.fromEntries(
            Object.entries(userLeadData).filter(([key]) => 
              !['id', 'sUhid', 'uhid', 'branchId', 'patientName', 'name', 'patientTitle', 
                'doctorUserId', 'gender', 'age', 'contactNumber', 'whatsappNo', 'whatsappNumber',
                'emailAddress', 'maritalStatus', 'aadharCardNo', 'occupation', 'patientType',
                'panelId', 'address', 'branchName', 'pinCode', 'city', 'state', 'country', 'areaId', 'area', 'tehsil'].includes(key)
            )
          ),
        };
        setExistingPatients([transformedUserLead]);
        setIsUserLeadData(true); // Mark as userLead data
        setIsGateEntriesOnly(false);
        // Store userLead ID for POST payload
        if (userLeadData.id) {
          setUserLeadId(userLeadData.id);
          console.log("Added userLeadId to payload:", userLeadData.id);
        } else {
          console.log("No userLeadId found in userLeadData");
        }
        setPatientExistsDialogOpen(true);
      } else {
        // No registrations, preBookings, or userLead – check patientEntries (gate entries only)
        const patientEntries = result.data?.patientEntries || [];
        if (patientEntries.length > 0) {
          const mappedPatients = patientEntries.map((entry: Record<string, unknown>) => ({
            id: entry.id as number,
            uhid: (entry.uhid as string) ?? "",
            patientTitle: (entry.title as string) ?? "",
            patientName: (entry.name as string) ?? "",
            name: (entry.name as string) ?? "",
            branchId: Number(entry.branchId) || branchId,
            branchName: "N/A",
            contactNumber: (entry.contactNo as string) ?? "",
            aadharCardNo: entry.aadharCardNo as string | undefined,
            gender: (entry.gender as string) ?? "",
            age: entry.age as string | undefined,
            emailAddress: entry.emailAddress as string | undefined,
            maritalStatus: entry.maritalStatus as string | undefined,
            occupation: entry.occupation as string | undefined,
            patientType: (entry.patientType as string | null) ?? null,
            address: {
              id: 0,
              address: (entry.patientAddress as string) ?? "",
              city: (entry.city as string) ?? "",
              pinCode: (entry.pinCode as string) ?? "",
              state: (entry.patientState as string) ?? "",
              country: (entry.country as string) ?? "",
              tehsil: entry.tehsil as string | undefined,
              area: entry.area as string | undefined,
            },
          }));
          setExistingPatients(mappedPatients);
          setIsUserLeadData(false);
          setUserLeadId(null);
          setIsGateEntriesOnly(true);
          setPatientExistsDialogOpen(true);
        } else {
          lastCheckedContactNumberRef.current = "";
          setIsUserLeadData(false);
          setUserLeadId(null);
          setIsGateEntriesOnly(false);
        }
      }
    } catch (error) {
      console.error("Error checking existing patients:", error);
      // Clear the ref on error so we can retry if needed
      lastCheckedContactNumberRef.current = "";
      // If API fails, don't show dialog
    } finally {
      setIsContactLoading(false);
    }
  };

  // Check for existing patients by Aadhar Card number
  const checkExistingAadharCard = async (aadharCardNo: string, contactNumber?: string) => {
    if (!aadharCardNo || aadharCardNo.trim().length !== 12) {
      // Clear the last checked ref if Aadhar Card is invalid
      lastCheckedAadharCardRef.current = "";
      // Clear error if Aadhar Card is not 12 digits
      const currentError = formik.errors.aadharCardNo;
      if (currentError === "Aadhar Card No. already exists") {
        formik.setFieldError("aadharCardNo", undefined);
      }
      return;
    }
    
    const trimmedAadhar = aadharCardNo.trim();
    
    // Always check when 12 digits are entered - check every time
    // Update the ref after checking to track what was checked
    // But don't prevent re-checking - always allow API call when 12 digits are entered

    try {
      const result = await checkExistingPatientsQuery({
        branchId: branchId,
        phoneNumber: "", // Empty phone number as per API requirement
        aadharCardNo: trimmedAadhar,
      }).unwrap();

      // Handle new response structure with registrations, preBookings, and patientEntries
      const registrations = result.data?.registrations || [];
      const patientEntries = result.data?.patientEntries || [];
      
      // If there are registrations, Aadhar Card already exists
      if (registrations.length > 0) {
        // Check if mobile number matches with existing patient
        // Use provided contactNumber or get from formik values
        const currentContactNumber = (contactNumber || formik.values.contactNumber || "").trim();
        
        // Find patient with matching contact number
        const matchingPatient = registrations.find((patient: any) => 
          patient.contactNumber === currentContactNumber
        );
        
        // If both contactNumber and aadharCardNo match the same patient → OK (clear only API error)
        if (currentContactNumber.length === 10 && matchingPatient) {
          if (formik.errors.aadharCardNo === "Aadhar Card No. already exists") {
            formik.setFieldError("aadharCardNo", undefined);
          }
          lastCheckedAadharCardRef.current = trimmedAadhar;
        } else if (currentContactNumber.length === 10 && !matchingPatient) {
          // Contact number provided but doesn't match - Aadhar Card exists with different contact number
          formik.setFieldError("aadharCardNo", "Aadhar Card No. already exists");
          formik.setFieldTouched("aadharCardNo", true, false);
          // Update ref to track this Aadhar Card has error
          lastCheckedAadharCardRef.current = trimmedAadhar;
        } else {
          // Contact number not provided yet or doesn't match - Aadhar Card exists, show error
          formik.setFieldError("aadharCardNo", "Aadhar Card No. already exists");
          formik.setFieldTouched("aadharCardNo", true, false);
          // Update ref to track this Aadhar Card has error
          lastCheckedAadharCardRef.current = trimmedAadhar;
        }
      } else if (patientEntries.length > 0) {
        // No registrations but gate entries exist – show "Already Exist Gate Entries of Patients" dialog
        const mappedPatients = patientEntries.map((entry: Record<string, unknown>) => ({
          id: entry.id as number,
          uhid: (entry.uhid as string) ?? "",
          patientTitle: (entry.title as string) ?? "",
          patientName: (entry.name as string) ?? "",
          name: (entry.name as string) ?? "",
          branchId: Number(entry.branchId) || branchId,
          branchName: "N/A",
          contactNumber: (entry.contactNo as string) ?? "",
          aadharCardNo: entry.aadharCardNo as string | undefined,
          gender: (entry.gender as string) ?? "",
          age: entry.age as string | undefined,
          emailAddress: entry.emailAddress as string | undefined,
          maritalStatus: entry.maritalStatus as string | undefined,
          occupation: entry.occupation as string | undefined,
          patientType: (entry.patientType as string | null) ?? null,
          address: {
            id: 0,
            address: (entry.patientAddress as string) ?? "",
            city: (entry.city as string) ?? "",
            pinCode: (entry.pinCode as string) ?? "",
            state: (entry.patientState as string) ?? "",
            country: (entry.country as string) ?? "",
            tehsil: entry.tehsil as string | undefined,
            area: entry.area as string | undefined,
          },
        }));
        setExistingPatients(mappedPatients);
        setIsUserLeadData(false);
        setUserLeadId(null);
        setIsGateEntriesOnly(true);
        setPatientExistsDialogOpen(true);
        lastCheckedAadharCardRef.current = trimmedAadhar;
      } else {
        // No registrations or gate entries – Aadhar Card doesn't exist; only clear the API "already exists" error
        // Do not clear schema validation errors (e.g. repeating/sequential pattern, first digit 0/1)
        const currentError = formik.errors.aadharCardNo;
        if (currentError === "Aadhar Card No. already exists") {
          formik.setFieldError("aadharCardNo", undefined);
        }
        lastCheckedAadharCardRef.current = "";
      }
    } catch (error: any) {
      console.error("Error checking existing Aadhar Card:", error);
      
      // Check if error response indicates Aadhar Card exists
      const errorMessage = error?.data?.message || error?.message || "";
      if (errorMessage.toLowerCase().includes("aadhar") || errorMessage.toLowerCase().includes("exists")) {
        formik.setFieldError("aadharCardNo", "Aadhar Card No. already exists");
        formik.setFieldTouched("aadharCardNo", true, false);
      } else {
        // Clear the ref on other errors so we can retry if needed
        lastCheckedAadharCardRef.current = "";
      }
    }
  };

  // Handle contact number change - check when it reaches 10 digits
  const handleContactNumberChange = (field: string, value: string) => {
    formik.setFieldValue(field, value);
    
    // Check if contact number reaches 10 digits
    if (value.length === 10) {
      checkExistingPatients(value);
    }
  };

  const handleContactNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const contactNumber = e.target.value.trim();
    if (contactNumber && contactNumber.length === 10) {
      checkExistingPatients(contactNumber);
    }
  };

  const handleRevisit = (patient: ExistingPatient) => {
    // Close dialog
    setPatientExistsDialogOpen(false);
    isClosingDialogRef.current = false;
    lastCheckedContactNumberRef.current = "";
    
    // Store selected patient data including UHID for later use in submission
    setSelectedPatientForRevisit(patient);
    
    // Store isUserLeadData flag before resetting (needed for pinCode matching)
    const wasUserLeadData = isUserLeadData;
    
    // Clear all errors and touched state before filling
    formik.setErrors({});
    formik.setTouched({});
    
    // Set revisit mode - for userLead data, allow editing (isRevisitMode will be false)
    // For existing registrations/preBookings, set to true
    // Note: isRevisitMode is used to determine entryType, not to make fields read-only
    // User can always edit fields, but entryType helps track if it's a new or existing patient
    setIsRevisitMode(!wasUserLeadData);
    
    // Reset userLead flag after selecting patient
    setIsUserLeadData(false);
    
    // Fill all available form fields with patient data
    if (patient.patientTitle) {
      formik.setFieldValue("patientNameSelect", patient.patientTitle, false);
    }
    if (patient.patientName) {
      formik.setFieldValue("patientName", patient.patientName, false);
    }
    if (patient.contactNumber) {
      formik.setFieldValue("contactNumber", patient.contactNumber, false);
    }
    if (patient.aadharCardNo) {
      formik.setFieldValue("aadharCardNo", patient.aadharCardNo, false);
    }
    if (patient.gender) {
      formik.setFieldValue("gender", patient.gender.toLowerCase(), false);
    }
    if (patient.age) {
      formik.setFieldValue("age", patient.age, false);
    }
    if (patient.emailAddress) {
      formik.setFieldValue("emailAddress", patient.emailAddress, false);
    }
    if (patient.maritalStatus) {
      // Normalize maritalStatus: capitalize first letter (e.g., "single" -> "Single")
      const normalizedMaritalStatus = patient.maritalStatus.charAt(0).toUpperCase() + patient.maritalStatus.slice(1).toLowerCase();
      formik.setFieldValue("maritalStatus", normalizedMaritalStatus, false);
    }
    if (patient.occupation) {
      formik.setFieldValue("occupation", patient.occupation, false);
    }
    if (patient.patientType) {
      formik.setFieldValue("patientType", patient.patientType, false);
    }

    // Run visitor-vs-patient Aadhar check after Formik has applied the above updates (setErrors/setTouched/setFieldValue are batched)
    // so our setFieldError is not overwritten by the initial setErrors({})
    const patientAadharForCheck = (patient.aadharCardNo || "").trim();
    if (patientAadharForCheck.length === 12) {
      setTimeout(() => {
        const visitors = formik.values.visitors || [];
        visitors.forEach((visitor, index) => {
          const visitorAadhar = (visitor.aadharCardNo || "").trim();
          if (visitor.country === "Indian" && visitorAadhar.length === 12 && visitorAadhar === patientAadharForCheck) {
            formik.setFieldError(`visitors.${index}.aadharCardNo`, "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor");
            formik.setFieldTouched(`visitors.${index}.aadharCardNo`, true, false);
          }
        });
      }, 500);
    }
    
    // Fill address fields
    if (patient.address) {
      let resolvedRevisitCountryId: string | null = null;
      // Handle country - API may return name ("India" or "INDIA") or ID ("6")
      if (patient.address.country) {
        const countryValue = String(patient.address.country);

        if (!isNaN(Number(countryValue)) && countryValue.trim() !== "") {
          resolvedRevisitCountryId = countryValue;
          formik.setFieldValue("country", countryValue, false);
        } else if (countriesData?.data) {
          const country = countriesData.data.find((c: any) => {
            const countryName = c.name || "";
            return countryName.toLowerCase() === countryValue.toLowerCase();
          });
          if (country) {
            resolvedRevisitCountryId = String(country.id);
            formik.setFieldValue("country", resolvedRevisitCountryId, false);
          } else {
            pendingCountryNameRef.current = countryValue.toLowerCase();
            pendingRevisitAddressRef.current = {
              state: patient.address.state != null ? String(patient.address.state) : "",
              city: patient.address.city != null ? String(patient.address.city) : "",
            };
          }
        } else {
          pendingCountryNameRef.current = countryValue.toLowerCase();
          pendingRevisitAddressRef.current = {
            state: patient.address.state != null ? String(patient.address.state) : "",
            city: patient.address.city != null ? String(patient.address.city) : "",
          };
        }
      }

      if (resolvedRevisitCountryId && resolvedRevisitCountryId !== "6") {
        const a = patient.address;
        formik.setFieldValue("state", a.state != null ? String(a.state).trim() : "", false);
        formik.setFieldValue("city", a.city != null ? String(a.city).trim() : "", false);
        formik.setFieldValue("tehsil", "", false);
        formik.setFieldValue("area", "", false);
        pendingStateNameRef.current = null;
        pendingCityNameRef.current = null;
        pendingTehsilNameRef.current = null;
        pendingAreaNameRef.current = null;
        pendingRevisitAddressRef.current = null;
      }

      // Get pinCode from address or directly from patient (for userLead)
      const pinCodeValue = patient.address?.pinCode || (patient as any).pinCode;
      const userLeadCountry = patient.address?.country || (patient as any).country;
      const userLeadState = patient.address?.state || (patient as any).state;
      const userLeadCity = patient.address?.city || (patient as any).city;
      
      if (pinCodeValue) {
        formik.setFieldValue("pinCode", pinCodeValue, false);
        
        // India userLead: pincode API drives cascading IDs; skip for non-India addresses
        if (wasUserLeadData && pinCodeValue && resolvedRevisitCountryId === "6") {
          // Fetch pinCode data to get location details
          getPincodeQuery(pinCodeValue).then((result) => {
            if (result.data?.success && result.data?.data) {
              const pincodeData = result.data.data;
              const dataArray = Array.isArray(pincodeData) ? pincodeData : [pincodeData];
              
              if (dataArray.length > 0) {
                // Use the first result (or find the best match)
                const pincodeInfo = dataArray[0];
                
                // Store pincode info for cascading selection
                pendingPincodeInfoRef.current = {
                  country_id: pincodeInfo.country_id,
                  state_id: pincodeInfo.state_id,
                  district_id: pincodeInfo.district_id,
                  country: pincodeInfo.country,
                  state: pincodeInfo.state,
                  district: pincodeInfo.district,
                };
                
                // Step 1: Auto-select country first
                if (userLeadCountry && countriesData?.data) {
                  const userLeadCountryLower = String(userLeadCountry).toLowerCase();
                  const pincodeCountryLower = String(pincodeInfo.country || "").toLowerCase();
                  
                  // Check if country names match (case-insensitive)
                  if (pincodeCountryLower && (userLeadCountryLower === pincodeCountryLower || 
                      userLeadCountryLower.includes(pincodeCountryLower) || 
                      pincodeCountryLower.includes(userLeadCountryLower))) {
                    const country = countriesData.data.find((c: any) => {
                      const countryName = String(c.name || "").toLowerCase();
                      return countryName === pincodeCountryLower || 
                             (pincodeInfo.country_id && c.id === pincodeInfo.country_id);
                    });
                    if (country) {
                      formik.setFieldValue("country", String(country.id), false);
                      console.log("Auto-selected country from pinCode:", country.name);
                    }
                  }
                } else if (pincodeInfo.country_id && countriesData?.data) {
                  // If no country in userLead but pinCode has country_id, use it
                  const country = countriesData.data.find((c: any) => c.id === pincodeInfo.country_id);
                  if (country) {
                    formik.setFieldValue("country", String(country.id), false);
                    console.log("Auto-selected country from pinCode (by ID):", country.name);
                  }
                }
                
                // Step 2: Store state name for matching when statesData loads
                if (userLeadState) {
                  pendingStateNameRef.current = String(userLeadState).toLowerCase();
                } else if (pincodeInfo.state) {
                  pendingStateNameRef.current = String(pincodeInfo.state).toLowerCase();
                }
                
                // Step 3: Store city name for matching when citiesData loads
                if (userLeadCity) {
                  pendingCityNameRef.current = String(userLeadCity).toLowerCase();
                } else if (pincodeInfo.district) {
                  pendingCityNameRef.current = String(pincodeInfo.district).toLowerCase();
                }
              }
            }
          }).catch((error) => {
            console.error("Error fetching pinCode data for userLead:", error);
          });
        }
        // commented this when handle Revisit patient then hide the pincode dropdown setShowPincodeDropdown(false)
      }
      if (patient.address.address) {
        formik.setFieldValue("address", patient.address.address, false);
      }
      if ((patient.address as any).addressLine1 != null) {
        formik.setFieldValue("addressLine1", (patient.address as any).addressLine1 || "", false);
      }
      if ((patient.address as any).addressLine2 != null) {
        formik.setFieldValue("addressLine2", (patient.address as any).addressLine2 || "", false);
      }
      
      if (resolvedRevisitCountryId === "6") {
      // Store state and city names in refs for useEffect to match later (normalize to lowercase)
      if (patient.address.state) {
        pendingStateNameRef.current = String(patient.address.state).toLowerCase();
      }
      if (patient.address.city) {
        pendingCityNameRef.current = patient.address.city;
      }
      
      // Try to match state immediately if statesData is available
      if (patient.address.state && statesData) {
        const statesList = Array.isArray(statesData) 
          ? statesData 
          : (statesData as any)?.data || [];
        const state = statesList.find((s: any) => {
          const stateName = s.name || s.state || "";
          const patientState = String(patient.address?.state || "");
          return stateName.toLowerCase() === patientState.toLowerCase();
        });
        if (state) {
          formik.setFieldValue("state", String(state.id), false);
          pendingStateNameRef.current = null; // Clear after successful match
          
          // Try to match city immediately if citiesData is available
          if (patient.address.city && citiesData) {
            const citiesList = Array.isArray(citiesData)
              ? citiesData
              : (citiesData as any)?.data || [];
            const city = citiesList.find((c: any) => {
              const cityName = c.name || c.city || "";
              const patientCity = patient.address?.city || "";
              return cityName.toLowerCase() === patientCity.toLowerCase();
            });
            if (city) {
              formik.setFieldValue("city", String(city.id), false);
              pendingCityNameRef.current = null; // Clear after successful match
              console.log("City matched immediately:", city.name, "->", city.id);
              
              // After city is set, try to match tehsil if available
              if ((patient.address as any)?.tehsil) {
                pendingTehsilNameRef.current = (patient.address as any).tehsil;
                // Fetch tehsils and match
                getTehsilsQuery({ districtId: String(city.id) }).then((result) => {
                  if (result.data?.success && result.data?.data) {
                    const tehsils = result.data.data;
                    const matchingTehsil = tehsils.find((t: any) => 
                      (t.name || "").toLowerCase() === String((patient.address as any)?.tehsil || "").toLowerCase()
                    );
                    if (matchingTehsil) {
                      formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);
                      pendingTehsilNameRef.current = null;
                      
                      // After tehsil is set, try to match area if available
                      if ((patient.address as any)?.area) {
                        pendingAreaNameRef.current = (patient.address as any).area;
                        // Fetch areas and match
                        getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                          if (areaResult.data?.success && areaResult.data?.data) {
                            const areas = areaResult.data.data;
                            const matchingArea = areas.find((a: any) => 
                              (a.name || "").toLowerCase() === String((patient.address as any)?.area || "").toLowerCase()
                            );
                            if (matchingArea) {
                              formik.setFieldValue("area", matchingArea.id.toString(), false);
                              pendingAreaNameRef.current = null;
                            }
                          }
                        }).catch((error) => {
                          console.error("Error fetching areas:", error);
                        });
                      }
                    }
                  }
                }).catch((error) => {
                  console.error("Error fetching tehsils:", error);
                });
              }
            }
          }
        }
      }
      // If state/city data is not available yet, the useEffect hooks will handle matching when data loads
      
      // Store tehsil and area names for later matching if city is not yet set
      if ((patient.address as any)?.tehsil && !formik.values.city) {
        pendingTehsilNameRef.current = (patient.address as any).tehsil;
      }
      if ((patient.address as any)?.area && !formik.values.tehsil) {
        pendingAreaNameRef.current = (patient.address as any).area;
      }
      }
    }
    
    // Re-apply visitor-vs-patient Aadhar errors after a tick so they persist (do not call validateForm here
    // as it overwrites errors and would clear our programmatic "patient match" error).
    setTimeout(() => {
      const patientAadhar = (formik.values.aadharCardNo || "").trim();
      if (formik.values.indianForeignerNepal === "Indian" && patientAadhar.length === 12) {
        const visitors = formik.values.visitors || [];
        visitors.forEach((visitor, index) => {
          const visitorAadhar = (visitor.aadharCardNo || "").trim();
          if (visitor.country === "Indian" && visitorAadhar.length === 12 && visitorAadhar === patientAadhar) {
            formik.setFieldError(`visitors.${index}.aadharCardNo`, "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor");
            formik.setFieldTouched(`visitors.${index}.aadharCardNo`, true, false);
          }
        });
      }
    }, 0);
  };

  // Memoized close handler to prevent double-click issues
  const handleDialogClose = useCallback(() => {
    // Only close if dialog is currently open (prevents multiple calls)
    if (!patientExistsDialogOpen) return;
    
    // Set flag to prevent re-triggering the check when clearing contact number
    isClosingDialogRef.current = true;
    
    // Clear any pending API calls/timeouts
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }
    
    // Clear the last checked contact number to allow future checks
    lastCheckedContactNumberRef.current = "";
    
    // Reset userLead data flag, gate entries flag, and ID
    setIsUserLeadData(false);
    setIsGateEntriesOnly(false);
    setUserLeadId(null);
    
    // Clear existing patients list to prevent re-opening
    setExistingPatients([]);
    
    // Close the dialog first
    setPatientExistsDialogOpen(false);
    
    // Clear the contact number field after a short delay
    // This prevents the check from re-triggering
    setTimeout(() => {
      formik.setFieldValue("contactNumber", "", false);
      setIsRevisitMode(false); // Reset revisit mode when dialog is closed
      setSelectedPatientForRevisit(null); // Clear selected patient data when dialog is closed
      // Reset the flag after clearing (longer delay to ensure all handlers have finished)
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 500);
    }, 100);
  }, [formik, patientExistsDialogOpen]);

  return (
    <GateEntryLayout title="" subModuleName="New Patient">
      <ListBorder as="section" className="px-4 py-4">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[24px] font-semibold leading-[130%] text-[#434956]">New Patient</h1>
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
            
            // Check for Aadhar Card "already exists" error first - prevent submission
            if (formik.errors.aadharCardNo === "Aadhar Card No. already exists") {
              // Mark field as touched to ensure error is visible
              formik.setFieldTouched("aadharCardNo", true, false);
              // Scroll to Aadhar Card field
              scrollToErrorField("aadharCardNo");
              return;
            }
            
            // Check for visitor Aadhar Card matching patient Aadhar Card error - prevent submission
            const visitors = formik.values.visitors || [];
            for (let i = 0; i < visitors.length; i++) {
              const visitorError = (formik.errors.visitors?.[i] as any)?.aadharCardNo;
              if (visitorError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
                // Mark field as touched to ensure error is visible
                formik.setFieldTouched(`visitors.${i}.aadharCardNo`, true, false);
                // Scroll to visitor Aadhar Card field
                scrollToErrorField(`visitorAadhar_${i}`);
                return;
              }
            }
            
            // Check for file validation errors first
            const hasFileErrors = photoCaptureRef.current?.hasErrors() || !!(photoCaptureErrors.vehiclePhoto || photoCaptureErrors.aadharPhoto);
            if (hasFileErrors) {
              // Scroll to the error field
              photoCaptureRef.current?.scrollToError();
              return;
            }
            
            // Run Formik/Yup validation manually so we can always scroll to errors
            const errors = await formik.validateForm();
            if (Object.keys(errors).length > 0) {
              console.log("Validation failed. Errors:", errors);
              formik.setErrors(errors);
              
              // Mark all fields with errors as touched so errors will be displayed
              const touchedFields: Record<string, any> = {};
              const markFieldsAsTouched = (errorObj: any, path = "") => {
                Object.keys(errorObj).forEach((key) => {
                  const fieldPath = path ? `${path}.${key}` : key;
                  const error = errorObj[key];
                  
                  if (typeof error === "string") {
                    // Simple field error
                    touchedFields[fieldPath] = true;
                  } else if (Array.isArray(error)) {
                    // Array field (e.g., visitors) - build nested structure
                    if (key === "visitors") {
                      // For visitors, build nested array structure
                      const visitorsTouched: any[] = [];
                      error.forEach((item, index) => {
                        if (item && typeof item === "object") {
                          const visitorTouched: any = {};
                          Object.keys(item).forEach((nestedKey) => {
                            visitorTouched[nestedKey] = true;
                            // Also set dot notation for Formik compatibility
                            touchedFields[`${fieldPath}.${index}.${nestedKey}`] = true;
                          });
                          visitorsTouched[index] = visitorTouched;
                        }
                      });
                      // Set nested structure
                      if (!touchedFields[key]) {
                        touchedFields[key] = visitorsTouched;
                      }
                    } else {
                      // For other arrays, use dot notation
                      error.forEach((item, index) => {
                        if (item && typeof item === "object") {
                          Object.keys(item).forEach((nestedKey) => {
                            touchedFields[`${fieldPath}.${index}.${nestedKey}`] = true;
                          });
                        }
                      });
                    }
                  } else if (error && typeof error === "object") {
                    // Nested object
                    markFieldsAsTouched(error, fieldPath);
                  }
                });
              };
              
              markFieldsAsTouched(errors);
              // Merge with existing touched state to preserve other fields
              const mergedTouched = { ...formik.touched, ...touchedFields };
              formik.setTouched(mergedTouched, false);
              
              // Check if Aadhar Card error exists in the errors object
              if (errors.aadharCardNo === "Aadhar Card No. already exists" || formik.errors.aadharCardNo === "Aadhar Card No. already exists") {
                // Prioritize Aadhar Card error - scroll to it first
                scrollToErrorField("aadharCardNo");
                return;
              }
              
              // Check for visitor Aadhar Card matching patient error in errors object
              if (errors.visitors && Array.isArray(errors.visitors)) {
                for (let i = 0; i < errors.visitors.length; i++) {
                  const visitorError = (errors.visitors[i] as any)?.aadharCardNo;
                  if (visitorError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
                    formik.setFieldTouched(`visitors.${i}.aadharCardNo`, true, false);
                    scrollToErrorField(`visitorAadhar_${i}`);
                    return;
                  }
                }
              }
              
              scrollToFirstError(errors as typeof formik.errors);
              return;
            }
            
            // Double-check for Aadhar Card error before submission (in case it's not in validation errors)
            if (formik.errors.aadharCardNo === "Aadhar Card No. already exists") {
              formik.setFieldTouched("aadharCardNo", true, false);
              scrollToErrorField("aadharCardNo");
              return;
            }
            
            // Double-check for visitor Aadhar Card matching patient error before submission
            const finalVisitors = formik.values.visitors || [];
            for (let i = 0; i < finalVisitors.length; i++) {
              const visitorError = (formik.errors.visitors?.[i] as any)?.aadharCardNo;
              if (visitorError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
                formik.setFieldTouched(`visitors.${i}.aadharCardNo`, true, false);
                scrollToErrorField(`visitorAadhar_${i}`);
                return;
              }
            }
            
            // If no errors, proceed with API submission
            await handleFormSubmit(formik.values);
            } finally {
              formik.setSubmitting(false);
            }
          }}
          className="space-y-4"
        >
          {/* Personal Details Section */}
          <PersonalDetails
            formData={{
              contactNumber: formik.values.contactNumber || "",
              aadharCardNo: formik.values.aadharCardNo || "",
              passportNumber: formik.values.passportNumber || "",
              nationalId: formik.values.nationalId || "",
              patientNameSelect: formik.values.patientNameSelect || "",
              patientName: formik.values.patientName || "",
              age: formik.values.age || "",
              indianForeignerNepal: formik.values.indianForeignerNepal || "",
              emailAddress: formik.values.emailAddress || "",
              maritalStatus: formik.values.maritalStatus || "",
              occupation: formik.values.occupation || "",
              patientType: formik.values.patientType || "",
              panel: formik.values.panel || "",
            }}
            emailRequiredByAddressCountry={
              Boolean(formik.values.country) && formik.values.country !== "6"
            }
            panelOptions={panelOptions}
            readOnlyFields={useMemo(() => {
              if (!isRevisitMode && !prefilledPatientData) {
                return [];
              }
              
              // Base read-only fields that are always read-only when data is prefilled
              const baseReadOnlyFields = ["contactNumber", "patientName"];
              
              // Conditionally add fields only if they have values
              const conditionalFields: string[] = [];
              
              // Add aadharCardNo when present: from prefilled URL data, or from "Patient Already Exists" dialog selection
              if (prefilledPatientData?.aadharCardNo || selectedPatientForRevisit?.aadharCardNo?.trim()) {
                conditionalFields.push("aadharCardNo");
              }
              
              // Add patientNameSelect (Title) when present: from prefilled URL data, or from "Patient Already Exists" dialog selection
              if (prefilledPatientData?.patientTitle || selectedPatientForRevisit?.patientTitle) {
                conditionalFields.push("patientNameSelect");
              }
              
              // Add indianForeignerNepal only if not in revisit mode
              if (!isRevisitMode && prefilledPatientData) {
                conditionalFields.push("indianForeignerNepal");
              }
              
              return [...baseReadOnlyFields, ...conditionalFields];
            }, [isRevisitMode, prefilledPatientData, selectedPatientForRevisit])}
            onChange={(field, value) => {
              formik.setFieldValue(field, value, false); // Don't validate on change
              
              // Auto-select country based on nationality selection
              if (field === "indianForeignerNepal") {
                // Clear all visitor ID fields when nationality changes
                const currentVisitors = formik.values.visitors || [];
                const updatedVisitors = currentVisitors.map((visitor) => ({
                  ...visitor,
                  aadharCardNo: "",
                  passportNumber: "",
                  nationalId: "",
                }));
                formik.setFieldValue("visitors", updatedVisitors, false);
                
                if (value === "Indian") {
                  // Auto-select India (country ID: 6)
                  formik.setFieldValue("country", "6", false);
                  // Clear pincode, state and city when country changes
                  formik.setFieldValue("pinCode", "", false);
                  formik.setFieldValue("state", "", false);
                  formik.setFieldValue("city", "", false);
                } else if (value === "Nepal") {
                  // Find Nepal's country ID from countriesData
                  if (countriesData?.data) {
                    const nepalCountry = countriesData.data.find(
                      (c: any) => c.name?.toLowerCase() === "nepal"
                    );
                    if (nepalCountry) {
                      formik.setFieldValue("country", String(nepalCountry.id), false);
                      // Clear pincode, state and city when country changes
                      formik.setFieldValue("pinCode", "", false);
                      formik.setFieldValue("state", "", false);
                      formik.setFieldValue("city", "", false);
                    }
                  }
                } else if (value === "Foreigner") {
                  // Clear country field for Foreigner
                  formik.setFieldValue("country", "", false);
                  // Clear pincode, state and city when country is cleared
                  formik.setFieldValue("pinCode", "", false);
                  formik.setFieldValue("state", "", false);
                  formik.setFieldValue("city", "", false);
                }
              }
              
              // Handle patientType changes - auto-set panelId for Private and TPA
              if (field === "patientType") {
                if (value === "Private") {
                  formik.setFieldValue("panel", privateDefaultPanelIdStr ?? "", false);
                  formik.setFieldError("panel", undefined);
                } else if (value === "TPA") {
                  formik.setFieldValue("panel", tpaDefaultPanelIdStr ?? "", false);
                  formik.setFieldError("panel", undefined);
                } else if (value === "Panel") {
                  // Clear panel field when Panel is selected - user will choose from dropdown
                  formik.setFieldValue("panel", "", false);
                  formik.setFieldError("panel", undefined);
                } else {
                  // Clear panel field for any other value
                  formik.setFieldValue("panel", "", false);
                  formik.setFieldError("panel", undefined);
                }
              }
              
              // For select fields only, if a value is selected, mark as touched and validate immediately
              const selectFields = ["patientNameSelect", "indianForeignerNepal", "maritalStatus", "patientType", "panel"];
              if (selectFields.includes(field) && value && value.trim() !== "") {
                setTimeout(() => {
                  formik.setFieldTouched(field, true, false);
                  formik.validateField(field);
                }, 0);
              }
              
              // For input fields: if field was previously invalid (touched and had error), validate on change
              // This allows errors to clear immediately when user corrects them
              const inputFields = ["contactNumber", "aadharCardNo", "passportNumber", "nationalId", "patientName", "age", "occupation", "address"];
              if (inputFields.includes(field)) {
                const isTouched = formik.touched[field as keyof typeof formik.touched];
                const hasError = formik.errors[field as keyof typeof formik.errors];
                
                // Special handling for Aadhar Card No. - check if it exists when 12 digits are entered
                if (field === "aadharCardNo" && formik.values.indianForeignerNepal === "Indian") {
                  const trimmedValue = value?.trim() || "";
                  
                  // Always check when 12 digits are entered (every time, no matter what)
                  if (trimmedValue.length === 12) {
                    // Always check - don't prevent duplicate calls, check every time
                    checkExistingAadharCard(trimmedValue);
                    
                    // Check all visitors to see if any visitor's Aadhar Card matches the new patient Aadhar Card
                    const currentVisitors = formik.values.visitors || [];
                    currentVisitors.forEach((visitor, index) => {
                      if (visitor.aadharCardNo && visitor.aadharCardNo.trim() === trimmedValue) {
                        formik.setFieldError(`visitors.${index}.aadharCardNo`, "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor");
                        formik.setFieldTouched(`visitors.${index}.aadharCardNo`, true, false);
                      }
                    });
                  } else if (trimmedValue.length < 12) {
                    // Clear error if Aadhar Card is not 12 digits yet
                    const currentError = formik.errors.aadharCardNo;
                    if (currentError === "Aadhar Card No. already exists") {
                      formik.setFieldError("aadharCardNo", undefined);
                      lastCheckedAadharCardRef.current = "";
                    }
                    
                    // Clear visitor errors if patient Aadhar Card is cleared/changed (only if visitor doesn't match new partial value)
                    const currentVisitors = formik.values.visitors || [];
                    currentVisitors.forEach((visitor, index) => {
                      const visitorError = (formik.errors.visitors?.[index] as any)?.aadharCardNo;
                      if (visitorError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
                        const visitorAadhar = visitor.aadharCardNo?.trim() || "";
                        // Only clear if visitor's Aadhar Card doesn't match the new (partial) patient Aadhar Card
                        if (visitorAadhar.length === 12 && visitorAadhar !== trimmedValue) {
                          formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
                        }
                      }
                    });
                  }
                  
                  // Skip validation for Aadhar Card if it has API error (to prevent clearing it)
                  // Don't validate Aadhar Card if it has the "Aadhar Card No. already exists" error
                  if (isTouched && hasError && formik.errors.aadharCardNo === "Aadhar Card No. already exists") {
                    // Don't validate - keep the error
                    return;
                  }
                }
                
                // If field was touched and had an error, validate on change to clear error immediately
                if (isTouched && hasError) {
                  setTimeout(() => {
                    formik.validateField(field);
                  }, 0);
                }
              }

              // Email: re-validate after value updates (required/format by country) so errors clear while typing
              if (field === "emailAddress") {
                const emailTouched = formik.touched.emailAddress;
                const emailErr = formik.errors.emailAddress;
                if (emailTouched || emailErr) {
                  setTimeout(() => {
                    void formik.validateField("emailAddress");
                  }, 0);
                }
              }
              // For new fields (not touched), validation will happen on blur only
            }}
            onContactNumberChange={(value) => {
              // Don't check if dialog is being closed or if value is empty
              if (isClosingDialogRef.current || !value || value.length === 0) {
                return;
              }
              
              // Check when contact number reaches 10 digits
              if (value.length === 10) {
                checkExistingPatients(value);
                
                // Re-check Aadhar Card if it's already entered (to verify if contact number matches)
                const aadharValue = formik.values.aadharCardNo?.trim() || "";
                if (aadharValue.length === 12 && formik.values.indianForeignerNepal === "Indian") {
                  // Re-check with new contact number to see if they match
                  checkExistingAadharCard(aadharValue, value);
                }
              } else {
                // If contact number is incomplete, re-check Aadhar Card (may show error if Aadhar exists)
                const aadharValue = formik.values.aadharCardNo?.trim() || "";
                if (aadharValue.length === 12 && formik.values.indianForeignerNepal === "Indian") {
                  // Re-check to update error status
                  checkExistingAadharCard(aadharValue, value);
                }
              }
            }}
            onBlur={(field) => {
              formik.setFieldTouched(field, true, false); // Mark as touched, don't validate yet
              
              // Special handling for Aadhar Card No. - check if it exists on blur
              if (field === "aadharCardNo" && formik.values.indianForeignerNepal === "Indian") {
                const aadharValue = formik.values.aadharCardNo?.trim() || "";
                if (aadharValue.length === 12) {
                  checkExistingAadharCard(aadharValue);
                }
              }
              
              // Don't validate Aadhar Card if it has the "Aadhar Card No. already exists" error
              // This prevents the error from being cleared by schema validation
              if (field === "aadharCardNo" && formik.errors.aadharCardNo === "Aadhar Card No. already exists") {
                // Don't validate - keep the error
                return;
              }
              
              formik.validateField(field); // Validate the field after marking as touched
            }}
            onContactNumberBlur={handleContactNumberBlur}
            fieldRefs={{
              contactNumber: contactNumberRef,
              aadharCardNo: aadharCardNoRef,
              passportNumber: passportNumberRef,
              nationalId: nationalIdRef,
              patientNameSelect: patientNameSelectRef,
              patientName: patientNameRef,
              age: ageRef,
              indianForeignerNepal: indianForeignerNepalRef,
              patientType: patientTypeRef,
              panel: panelRef,
            }}
            errors={getFormErrors()}
            isContactLoading={isContactLoading}
          />

          {/* Address Details Section - Always editable (including when coming from Patient Revisit flow) */}
          <AddressDetails
            nationality={formik.values.indianForeignerNepal}
            formData={{
              pinCode: formik.values.pinCode || "",
              country: formik.values.country || "",
              state: formik.values.state || "",
              city: formik.values.city || "",
              tehsil: formik.values.tehsil || "",
              area: formik.values.area || "",
              address: formik.values.address || "",
              addressLine1: formik.values.addressLine1 || "",
              addressLine2: formik.values.addressLine2 || "",
            }}
            readOnly={false}
            onChange={(field, value) => {
              formik.setFieldValue(field, value, false); // Set value without immediate validation

              if (field === "country") {
                setTimeout(() => {
                  formik.validateField("emailAddress");
                }, 10);
              }
              
              // For select fields only (country, state, city, tehsil, area), if a value is selected, mark as touched and validate immediately
              const selectFields = ["country", "state", "city", "tehsil", "area"];
              if (selectFields.includes(field) && value && value.trim() !== "") {
                // Use a slightly longer timeout to ensure Formik state is updated, especially for async auto-fill from pincode
                setTimeout(() => {
                  // Double-check that the value is actually set before validating
                  const currentValue = formik.values[field as keyof typeof formik.values];
                  if (currentValue === value || String(currentValue) === String(value)) {
                    formik.setFieldTouched(field, true, false);
                    formik.validateField(field);
                  } else {
                    // If value isn't set yet, try again after a bit more time
                    setTimeout(() => {
                      formik.setFieldTouched(field, true, false);
                      formik.validateField(field);
                    }, 50);
                  }
                }, 10);
              }
              
              // For input fields: if field was previously invalid (touched and had error), validate on change
              // This allows errors to clear immediately when user corrects them
              const inputFields = ["pinCode", "address", "addressLine1", "addressLine2"];
              if (inputFields.includes(field)) {
                const isTouched = formik.touched[field as keyof typeof formik.touched];
                const hasError = formik.errors[field as keyof typeof formik.errors];
                
                // If field was touched and had an error, validate on change to clear error immediately
                if (isTouched && hasError) {
                  setTimeout(() => {
                    formik.validateField(field);
                  }, 0);
                }
              }
              // For new fields (not touched), validation will happen on blur only
            }}
            onBlur={(field) => {
              formik.setFieldTouched(field, true, false); // Mark as touched, don't validate yet
              formik.validateField(field); // Validate the field after marking as touched
            }}
            fieldRefs={{
              pinCode: pinCodeRef,
              country: countryRef,
              state: stateRef,
              city: cityRef,
              address: addressRef,
              addressLine1: addressLine1Ref,
              addressLine2: addressLine2Ref,
            }}
            errors={getFormErrors()}
          />

          {/* Visitors Details Section */}
          <VisitorsDetails
            visitors={(formik.values.visitors || []).map(v => ({ ...v, id: v.id || Date.now().toString() })) as Visitor[]}
            onAddVisitor={handleAddVisitor}
            onRemoveVisitor={handleRemoveVisitor}
            onVisitorChange={handleVisitorChange}
            onVisitorBlur={(index, field) => {
              const fieldName = field === "nameSelect" ? "nameSelect" : field === "name" ? "name" : field === "aadharCardNo" ? "aadharCardNo" : field === "passportNumber" ? "passportNumber" : "nationalId";
              formik.setFieldTouched(`visitors.${index}.${fieldName}`, true, false);
              
              // Check for duplicate Aadhar Card numbers on blur if field is aadharCardNo and nationality is Indian
              if (field === "aadharCardNo" && formik.values.indianForeignerNepal === "Indian") {
                const currentVisitors = formik.values.visitors || [];
                const currentValue = currentVisitors[index]?.aadharCardNo;
                const patientAadharCard = formik.values.aadharCardNo?.trim() || "";

                if (currentValue && currentValue.trim().length === 12) {
                  // First check: Visitor Aadhar Card cannot match Patient Aadhar Card
                  if (patientAadharCard && patientAadharCard.length === 12 && currentValue.trim() === patientAadharCard) {
                    formik.setFieldError(`visitors.${index}.aadharCardNo`, "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor");
                    return; // Don't check for duplicate visitors if it matches patient
                  }
                  
                  // Clear patient match error if it doesn't match anymore
                  const currentError = (formik.errors.visitors?.[index] as any)?.aadharCardNo;
                  if (currentError === "This Aadhar Card No. already exists for patient. Cannot use same Aadhar Card No. for visitor") {
                    formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
                  }
                  
                  // Second check: Check for duplicates (excluding current index)
                  const duplicateCount = currentVisitors.filter((visitor, idx) => 
                    idx !== index && visitor.aadharCardNo && visitor.aadharCardNo.trim() === currentValue.trim()
                  ).length;

                  // If duplicate found, set error only on the current field
                  if (duplicateCount > 0) {
                    formik.setFieldError(`visitors.${index}.aadharCardNo`, "Visitor Aadhar Card No. already exist");
                  } else {
                    // No duplicate, clear duplicate error if exists and validate normally
                    if (currentError === "Visitor Aadhar Card No. already exist") {
                      formik.setFieldError(`visitors.${index}.aadharCardNo`, undefined);
                    }
                    formik.validateField(`visitors.${index}.${fieldName}`);
                    void handleVisitorAadharLookup(index, currentValue.trim());
                  }
                } else {
                  // Not 12 digits yet, validate normally
                  formik.validateField(`visitors.${index}.${fieldName}`);
                }
              } else if (field === "passportNumber" && formik.values.indianForeignerNepal === "Foreigner") {
                // Check for duplicate Passport Numbers on blur if field is passportNumber and nationality is Foreigner
                const currentVisitors = formik.values.visitors || [];
                const currentValue = currentVisitors[index]?.passportNumber;

                if (currentValue && currentValue.trim().length > 0) {
                  // Check for duplicates (excluding current index)
                  const duplicateCount = currentVisitors.filter((visitor, idx) => 
                    idx !== index && visitor.passportNumber && visitor.passportNumber.trim() === currentValue.trim()
                  ).length;

                  // If duplicate found, set error only on the current field
                  if (duplicateCount > 0) {
                    formik.setFieldError(`visitors.${index}.passportNumber`, "Visitor Passport Number already exist");
                  } else {
                    // No duplicate, clear duplicate error if exists and validate normally
                    const currentError = (formik.errors.visitors?.[index] as any)?.passportNumber;
                    if (currentError === "Visitor Passport Number already exist") {
                      formik.setFieldError(`visitors.${index}.passportNumber`, undefined);
                    }
                    formik.validateField(`visitors.${index}.${fieldName}`);
                  }
                } else {
                  // Empty value, validate normally
                  formik.validateField(`visitors.${index}.${fieldName}`);
                }
              } else if (field === "nationalId" && formik.values.indianForeignerNepal === "Nepal") {
                // Check for duplicate National IDs on blur if field is nationalId and nationality is Nepal
                const currentVisitors = formik.values.visitors || [];
                const currentValue = currentVisitors[index]?.nationalId;

                if (currentValue && currentValue.trim().length > 0) {
                  // Check for duplicates (excluding current index)
                  const duplicateCount = currentVisitors.filter((visitor, idx) => 
                    idx !== index && visitor.nationalId && visitor.nationalId.trim() === currentValue.trim()
                  ).length;

                  // If duplicate found, set error only on the current field
                  if (duplicateCount > 0) {
                    formik.setFieldError(`visitors.${index}.nationalId`, "Visitor National Id already exist");
                  } else {
                    // No duplicate, clear duplicate error if exists and validate normally
                    const currentError = (formik.errors.visitors?.[index] as any)?.nationalId;
                    if (currentError === "Visitor National Id already exist") {
                      formik.setFieldError(`visitors.${index}.nationalId`, undefined);
                    }
                    formik.validateField(`visitors.${index}.${fieldName}`);
                  }
                } else {
                  // Empty value, validate normally
                  formik.validateField(`visitors.${index}.${fieldName}`);
                }
              } else {
                // Not a field that requires duplicate validation, validate normally
                formik.validateField(`visitors.${index}.${fieldName}`);
              }
            }}
            nationality={formik.values.indianForeignerNepal}
            countryOptions={[
              { value: "Indian", label: "Indian" },
              { value: "Nepal", label: "Nepal" },
              { value: "Foreigner", label: "Foreigner" },
            ]}
            visitorTitleRefs={visitorTitleRefs}
            visitorNameRefs={visitorNameRefs}
            visitorCountryRefs={visitorCountryRefs}
            visitorAadharRefs={visitorAadharRefs}
            visitorPassportRefs={visitorPassportRefs}
            visitorNationalIdRefs={visitorNationalIdRefs}
            errors={getFormErrors()}
            visitorLookupLoading={visitorLookupLoading}
            lockedVisitors={lockedVisitors}
          />

          {/* Photo Capture Section */}
          <PhotoCapture
            ref={photoCaptureRef}
            formData={{
              vehiclePhoto: (formik.values.vehiclePhoto && typeof formik.values.vehiclePhoto === 'object' && 'name' in formik.values.vehiclePhoto) ? (formik.values.vehiclePhoto as File) : null,
              aadharPhoto: (formik.values.aadharPhoto && typeof formik.values.aadharPhoto === 'object' && 'name' in formik.values.aadharPhoto) ? (formik.values.aadharPhoto as File) : null,
            }}
            onChange={(field, file) => {
              formik.setFieldValue(field, file);
            }}
            mode="both"
            onValidationChange={(hasErrors, errors) => {
              setPhotoCaptureErrors(errors);
            }}
          />

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

      </ListBorder>

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
              {isGateEntriesOnly ? "Already Exist Gate Entries of Patients" : isUserLeadData ? "User Lead Data" : "Patient Already Exists"}
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
                    key={patient.id || index}
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
                        onClick={() => handleRevisit(patient)}
                        className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                      >
                        {isUserLeadData ? "Visit" : "Revisit"}
                      </button>
                    </TableData>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Dialog>

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
    </GateEntryLayout>
  );
}
