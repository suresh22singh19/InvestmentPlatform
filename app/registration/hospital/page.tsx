"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useFormik } from "formik";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import Image from "next/image";
import { MessageDialog, Tooltip } from "@/components/ui";
import TokenPanel from "@/components/registration/TokenPanel";
import RegistrationSteps from "@/components/registration/RegistrationSteps";
import JSHealthCardPoints from "@/components/registration/JSHealthCardPoints";
import PatientOldHistory from "@/components/registration/PatientOldHistory";
import Vouchers from "@/components/registration/Vouchers";
import { registrationPersonalDetailsSchema, type RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import PersonalForm from "../personal";
import PaymentForm from "../payment";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { useGetPatientEntryByIdQuery } from "@/store/api/registrationApi";
import { useGetCountriesQuery, useGetStatesQuery, useGetCitiesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery } from "@/store/api/publicApi";
import { useGetDoctorsQuery, useLazyGetPatientEntriesQuery } from "@/store/api/registrationApi";
import { useGetPanelsQuery } from "@/store/api/settingsApi";
import type { PatientEntry } from "@/store/api/registrationApi";
import { usePathname } from "next/navigation";
import { registrationApi } from "@/store/api/registrationApi";
import type { ExistingPatient } from "@/store/api/gateApi";
import { useRequestDuplicateNumberPermissionMutation } from "@/store/api/registrationApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectUserId } from "@/store/slices/authSlice";
import type { SelectOption } from "@/components/ui/FormSelectField";
import PatientAlreadyExistsDialog from "@/components/registration/PatientAlreadyExistsDialog";
import DuplicateNumberExceptionDialog from "@/components/registration/DuplicateNumberExceptionDialog";
import ReferralPatientsDialog from "@/components/registration/ReferralPatientsDialog";
import type { ReferralPatient } from "@/components/registration/ReferralPatientsDialog";
import { useSocket } from "@/hooks/useSocket";

// LocalStorage key for pending registrations
const PENDING_REGISTRATIONS_KEY = "pendingPatientRegistrations";

// LocalStorage keys for duplicate exception patients (separate for hospital and clinic)
const DUPLICATE_EXCEPTION_PATIENTS_HOSPITAL_KEY = "duplicateExceptionPatientsHospital";
const DUPLICATE_EXCEPTION_PATIENTS_CLINIC_KEY = "duplicateExceptionPatientsClinic";

// Interface for pending registration
interface PendingRegistration {
    id: string;
    patientName: string;
    formData: RegistrationPersonalDetailsFormValues;
    currentStep: number;
    savedAt: string;
    formType: "clinic" | "hospital"; // "clinic" for 4-step form, "hospital" for 2-step form
    // Fields for "Already Exist Patient" scenario
    isRevisitedPatient?: boolean; // Flag to identify if this is from "Already Exist Patient" dialog
    patientUhid?: string; // UHID from existing patient
    patientRegistrationId?: number | null; // Registration ID from existing patient
    existingPatientData?: ExistingPatient; // Full API response data from registrations-and-pre-bookings
    // Fields for "User Lead Data" scenario
    isUserLeadData?: boolean; // Flag to identify if this is from userLead
    userLeadId?: number | null; // userLead ID for POST payload
    // Fields for Token Panel scenario (patient-entries API)
    isFromTokenPanel?: boolean; // Flag to identify if this is from Token Panel selection
    patientEntryId?: number | string | null; // ID from patient-entries API - sent as patientEntryId in hospital-patient POST
    patientEntryData?: PatientEntry; // Full patient entry object from patient-entries API (new or old/registered)
}

// Interface for duplicate exception patient
interface DuplicateExceptionPatient {
    id: string;
    patientName: string;
    contactNo: string; // The duplicate contact number from the payload
    savedAt: string;
    status: "pending" | "approved" | "rejected"; // Status of the duplicate exception request
}

export default function HospitalRegistrationPage() {
    const pathname = usePathname();
    const formType: "clinic" | "hospital" = "hospital"; // Always hospital for this page
    const [currentStep, setCurrentStep] = useState(0); // 0-based index, 0 = Step 01 (Personal Info)
    const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
    const [currentPendingRegistrationId, setCurrentPendingRegistrationId] = useState<string | null>(null);
    const [isPreBookingOpen, setIsPreBookingOpen] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [selectedPatientEntry, setSelectedPatientEntry] = useState<PatientEntry | null>(null);
    const [patientToken, setPatientToken] = useState<string>(""); // Store token for payload
    const [patientEntryId, setPatientEntryId] = useState<number | string | null>(null); // Store patient entry ID for payload
    const [patientUhid, setPatientUhid] = useState<string>(""); // Store patient UHID from existing patient
    const [patientRegistrationId, setPatientRegistrationId] = useState<number | null>(null); // Store registration ID from existing patient
    const [selectedTokenId, setSelectedTokenId] = useState<string | number | null>(null); // Track which token is selected for highlighting
    const refetchTokenListRef = useRef<(() => void) | null>(null); // Refetch function for token list using ref to avoid re-renders
    const [selectedPreBookingId, setSelectedPreBookingId] = useState<number | string | null>(null); // Store pre-booking ID when pre-booking is selected

    // Gate entry required state — when API returns empty for contact number
    const [gateEntryRequired, setGateEntryRequired] = useState(false);

    // Token panel pre-filled search value (set from contact number when patient-entries has data)
    const [tokenPanelSearch, setTokenPanelSearch] = useState("");

    // When token panel opens from patient-entries flow, force user to pick a token before proceeding
    const [isAwaitingTokenSelection, setIsAwaitingTokenSelection] = useState(false);

    // Loading state for contact number API check
    const [isContactLoading, setIsContactLoading] = useState(false);

    // Loading state for referral mobile API check
    const [isReferralMobileLoading, setIsReferralMobileLoading] = useState(false);

    // Patient exists dialog state
    const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
    const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
    const [isUserLeadData, setIsUserLeadData] = useState(false); // Track if data is from userLead
    const [userLeadId, setUserLeadId] = useState<number | null>(null); // Track userLead ID for POST payload
    const isClosingDialogRef = useRef(false);
    const lastCheckedContactNumberRef = useRef<string>("");
    const lastCheckedAadharCardRef = useRef<string>(""); // Track last checked Aadhar Card to prevent duplicate calls
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const selectedPatientAddressRef = useRef<{ countryName?: string; stateName?: string; cityName?: string; pinCode?: string; tehsil?: string; area?: string } | null>(null);

    // Duplicate number exception dialog state
    const [duplicateExceptionDialogOpen, setDuplicateExceptionDialogOpen] = useState(false);

    // Success and error dialog state for duplicate permission
    const [showDuplicateSuccessDialog, setShowDuplicateSuccessDialog] = useState(false);
    const [showDuplicateErrorDialog, setShowDuplicateErrorDialog] = useState(false);
    const [duplicateSuccessMessage, setDuplicateSuccessMessage] = useState("");
    const [duplicateErrorMessage, setDuplicateErrorMessage] = useState("");

    // Dialog state for duplicate pending registration (same contactNumber + patientName already saved)
    const [showDuplicatePendingDialog, setShowDuplicatePendingDialog] = useState(false);

    // Duplicate exception patients state
    const [duplicateExceptionPatients, setDuplicateExceptionPatients] = useState<DuplicateExceptionPatient[]>([]);
    const [selectedApprovedPatientId, setSelectedApprovedPatientId] = useState<string | null>(null);

    // Track if patient is revisited (from Patient Already Exists dialog)
    const [isRevisitedPatient, setIsRevisitedPatient] = useState(false);
    // Store the selected patient data from API response for pending registration
    const [selectedRevisitedPatientData, setSelectedRevisitedPatientData] = useState<ExistingPatient | null>(null);

    // Referral patients dialog state
    const [referralPatientsDialogOpen, setReferralPatientsDialogOpen] = useState(false);
    const [referralPatients, setReferralPatients] = useState<ReferralPatient[]>([]);
    const [selectedReferralPhoneNumber, setSelectedReferralPhoneNumber] = useState<string>("");
    const [selectedReferralPatient, setSelectedReferralPatient] = useState<ReferralPatient | null>(null);
    const lastCheckedReferralMobileRef = useRef<string>("");
    const referralPatientSelectedRef = useRef<boolean>(false);

    // Get branchId and userId from auth state
    const branchId = useAppSelector(selectUserBranchId) || 1;
    const userId = useAppSelector(selectUserId) || 1;

    // Lazy query for checking existing patients
    const [checkExistingPatientsQuery] = registrationApi.useLazyCheckExistingPatientsByPhoneQuery();

    // Lazy query for patient-entries (used before registrations-and-pre-bookings check)
    const [getPatientEntriesLazy] = useLazyGetPatientEntriesQuery();

    // Lazy query for checking referral patients by phone
    const [checkReferralPatientsQuery] = registrationApi.useLazyGetAllRegistrationForReferralByPhoneQuery();

    // Mutation for requesting duplicate number permission
    const [requestDuplicateNumberPermission, { isLoading: isCreatingException }] = useRequestDuplicateNumberPermissionMutation();

    // Container ref for arrow key navigation
    const formsContainerRef = useRef<HTMLDivElement>(null);
    const registrationHeadingRef = useRef<HTMLDivElement>(null);

    // Hospital registration has only 2 steps
    const registrationSteps = [
        { number: "Step 01", label: "Personal" },
        { number: "Step 02", label: "Payment" },
    ];

    // Source options for Referral component
    const sourceOptions: SelectOption[] = [
        { value: "tv", label: "TV" },
        { value: "newspaper", label: "NewsPaper" },
        { value: "social-media", label: "Social Media" },
        { value: "doctor", label: "Doctor" },
        { value: "other", label: "Referral" },
    ];

    // TV-specific field options
    const tvSpecificFieldOptions: SelectOption[] = [
        { value: "sahara-one", label: "Sahara one" },
        { value: "zee-tv", label: "Zee TV" },
        { value: "man-tv", label: "MAN TV" },
        { value: "9xm", label: "9XM" },
        { value: "9xm-jalwa", label: "9XM JALWA" },
        { value: "9x-jhakas", label: "9X JHAKAS" },
        { value: "9x-tashan", label: "9X TASHAN" },
        { value: "news-world-india", label: "NEWS WORLD INDIA" },
        { value: "janta-tv", label: "JANTA TV" },
        { value: "shubh-tv", label: "SHUBH TV" },
        { value: "india-news-rajasthan", label: "INDIA NEWS RAJASTHAN" },
        { value: "kashis-news", label: "KASHIS NEWS" },
        { value: "lakshya-tv", label: "LAKSHYA TV" },
        { value: "india-news-mp", label: "INDIA NEWS MP" },
        { value: "india-news-up", label: "INDIA NEWS UP" },
        { value: "india-news-hariyan", label: "INDIA NEWS HARIYAN" },
        { value: "nation-live", label: "NATION LIVE" },
        { value: "sharthi-tv", label: "SHARTHI TV" },
        { value: "channel-one", label: "CHANNEL ONE" },
        { value: "inventary", label: "INVENTARY" },
        { value: "adhyatam-tv", label: "ADHYATAM TV" },
        { value: "all-cable", label: "ALL CABLE" },
        { value: "chardi-kala-time-tv", label: "CHARDI KALA TIME TV" },
        { value: "sarv-dharam-tv", label: "SARV DHARAM TV" },
        { value: "sadvidya-tv", label: "SADVIDYA TV" },
        { value: "sadhna-tv", label: "SADHNA TV" },
        { value: "ishwar-tv", label: "ISHWAR TV" },
        { value: "sadhna-mp", label: "SADHNA MP" },
        { value: "sadhna-plus", label: "SADHNA PLUS" },
        { value: "darshan-24", label: "DARSHAN 24" },
        { value: "anjan-tv", label: "ANJAN TV" },
        { value: "care-world", label: "CARE WORLD" },
        { value: "chirtpath-marathi", label: "CHIRTPATH MARATHI" },
        { value: "manoranjan-tv", label: "MANORANJAN TV" },
        { value: "manoranjan-movie", label: "MANORANJAN MOVIE" },
        { value: "rt-movies", label: "RT MOVIES" },
        { value: "vaa-movie", label: "VAA MOVIE" },
        { value: "enter-10", label: "ENTER 10" },
        { value: "b-flix", label: "B FLIX" },
        { value: "dhamal-tv", label: "DHAMAL TV" },
        { value: "housefull-action", label: "HOUSEFULL ACTION" },
        { value: "ptc-tv", label: "PTC TV" },
        { value: "multiplex", label: "MULTIPLEX" },
        { value: "punjab-plus", label: "PUNJAB PLUS" },
        { value: "digi-cable", label: "DIGI CABLE" },
        { value: "india-talkies", label: "INDIA TALKIES" },
        { value: "garv-punjab", label: "GARV PUNJAB" },
        { value: "fastway-cable", label: "FASTWAY CABLE" },
        { value: "sanskrity-tv", label: "SANSKRITY TV" },
        { value: "dhishoom-tv", label: "DHISHOOM TV" },
        { value: "zee-salam", label: "ZEE SALAM" },
    ];

    // Newspaper-specific field options
    const newspaperSpecificFieldOptions: SelectOption[] = [
        { value: "hindustan-times", label: "Hindustan Times" },
        { value: "dainik-jagran", label: "Dainik Jagran" },
        { value: "dainik-bhaskar", label: "Dainik Bhaskar" },
        { value: "malayala-manorama", label: "Malayala Manorama" },
        { value: "daily-thanthi", label: "Daily Thanthi" },
        { value: "rajasthan-patrika", label: "Rajasthan Patrika" },
        { value: "amar-ujala", label: "Amar Ujala" },
        { value: "the-times-of-india", label: "The Times of India" },
    ];

    // Social Media-specific field options
    const socialMediaSpecificFieldOptions: SelectOption[] = [
        { value: "facebook", label: "Facebook" },
        { value: "instagram", label: "Instagram" },
        { value: "youtube", label: "Youtube" },
        { value: "whatsapp", label: "Whtsapp" },
        { value: "twitter", label: "Twitter" },
        { value: "linkedin", label: "Linkedin" },
        { value: "india-mart", label: "INDIA MART" },
        { value: "just-dial", label: "JUST DIAL" },
        { value: "website", label: "WEBSITE" },
    ];

    // LocalStorage functions
    const getPendingRegistrations = useCallback((): PendingRegistration[] => {
        if (typeof window === "undefined") return [];

        try {
            const stored = localStorage.getItem(PENDING_REGISTRATIONS_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored) as PendingRegistration[];
            // Backward compatibility: add formType to old registrations if missing
            // Default old registrations to "clinic" (most old registrations were likely 4-step)
            // They will be filtered out by formType === "hospital" below
            return parsed.map(reg => ({
                ...reg,
                formType: (reg.formType || "clinic") as "clinic" | "hospital"
            }));
        } catch (error) {
            console.error("Failed to load pending registrations:", error);
            return [];
        }
    }, []);

    const savePendingRegistration = useCallback((formData: RegistrationPersonalDetailsFormValues, step: number, existingId?: string | null) => {
        if (typeof window === "undefined") return;

        try {
            // Get patient name
            const patientName = formData.patientName?.trim() || "";

            // Don't save if patient name is empty or "Unknown Patient"
            if (!patientName || patientName.toLowerCase() === "unknown patient") {
                return;
            }

            // Use only the patient name for button display
            const displayName = patientName;
            const existing = getPendingRegistrations();

            let updated: PendingRegistration[];

            if (existingId) {
                updated = existing.map(reg =>
                    reg.id === existingId
                        ? {
                            ...reg,
                            patientName: displayName,
                            formData,
                            currentStep: step,
                            savedAt: new Date().toISOString(),
                            formType: formType,
                        }
                        : reg
                );
            } else {
                // Check if a registration with the same patient name and form type already exists
                const existingReg = existing.find(reg => reg.patientName === displayName && reg.formType === formType);

                if (existingReg) {
                    updated = existing.map(reg =>
                        reg.id === existingReg.id
                            ? {
                                ...reg,
                                patientName: displayName,
                                formData,
                                currentStep: step,
                                savedAt: new Date().toISOString(),
                                formType: formType,
                            }
                            : reg
                    );
                } else {
                    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const pendingRegistration: PendingRegistration = {
                        id,
                        patientName: displayName,
                        formData,
                        currentStep: step,
                        savedAt: new Date().toISOString(),
                        formType: formType,
                    };
                    updated = [...existing, pendingRegistration];
                }
            }

            localStorage.setItem(PENDING_REGISTRATIONS_KEY, JSON.stringify(updated));

            // Update state - filter by current form type
            const filtered = updated.filter(reg => reg.formType === formType);
            setPendingRegistrations(filtered);
        } catch (error) {
            console.error("Failed to save pending registration:", error);
        }
    }, [getPendingRegistrations, formType]);

    const removePendingRegistration = useCallback((id: string) => {
        if (typeof window === "undefined") return;

        try {
            const existing = getPendingRegistrations();
            const updated = existing.filter((reg: PendingRegistration) => reg.id !== id);
            localStorage.setItem(PENDING_REGISTRATIONS_KEY, JSON.stringify(updated));
            // Keep state consistent: only current form type so UI updates correctly
            const filtered = updated.filter((reg) => reg.formType === formType);
            setPendingRegistrations(filtered);
        } catch (error) {
            console.error("Failed to remove pending registration:", error);
        }
    }, [getPendingRegistrations, formType]);

    // LocalStorage functions for duplicate exception patients (hospital only)
    const getDuplicateExceptionPatients = useCallback((): DuplicateExceptionPatient[] => {
        if (typeof window === "undefined") return [];

        try {
            const stored = localStorage.getItem(DUPLICATE_EXCEPTION_PATIENTS_HOSPITAL_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored) as DuplicateExceptionPatient[];
            // Validate and normalize status values
            return parsed.map(patient => ({
                ...patient,
                status: (patient.status === "approved" || patient.status === "rejected" || patient.status === "pending")
                    ? patient.status
                    : "pending" as "pending" | "approved" | "rejected"
            }));
        } catch (error) {
            console.error("Failed to load duplicate exception patients:", error);
            return [];
        }
    }, []);

    const saveDuplicateExceptionPatient = useCallback((patientName: string, contactNo: string) => {
        if (typeof window === "undefined") return;

        try {
            const existing = getDuplicateExceptionPatients();
            // Check if patient with same name and contact number already exists
            const exists = existing.find(
                p => p.patientName === patientName && p.contactNo === contactNo
            );

            if (!exists) {
                const newPatient: DuplicateExceptionPatient = {
                    id: `duplicate_exception_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    patientName, // Patient name from payload
                    contactNo, // Contact number from payload (the duplicate number)
                    savedAt: new Date().toISOString(),
                    status: "pending", // Initial status is pending
                };
                const updated = [...existing, newPatient];
                localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_HOSPITAL_KEY, JSON.stringify(updated));
                setDuplicateExceptionPatients(updated);
            }
        } catch (error) {
            console.error("Failed to save duplicate exception patient:", error);
        }
    }, [getDuplicateExceptionPatients]);

    // Remove duplicate exception patient from localStorage
    const removeDuplicateExceptionPatient = useCallback((patientId: string) => {
        if (typeof window === "undefined") return;

        try {
            const existing = getDuplicateExceptionPatients();
            const updated = existing.filter(patient => patient.id !== patientId);
            localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_HOSPITAL_KEY, JSON.stringify(updated));
            setDuplicateExceptionPatients(updated);
        } catch (error) {
            console.error("[Hospital Registration] Failed to remove duplicate exception patient:", error);
        }
    }, [getDuplicateExceptionPatients]);

    // Update duplicate exception patient status in localStorage
    const updateDuplicateExceptionPatientStatus = useCallback((contactNo: string, patientName: string, status: "approved" | "rejected") => {
        if (typeof window === "undefined") return;

        try {
            const existing = getDuplicateExceptionPatients();

            const normalizedContactNo = contactNo.trim();
            const normalizedPatientName = patientName.trim();
            const normalizedStatus = status.toLowerCase() as "approved" | "rejected" | "pending";

            let patientFound = false;
            const updated = existing.map(patient => {
                // Match by contact number and patient name (case-insensitive comparison)
                const patientContactNo = patient.contactNo.trim();
                const patientNameTrimmed = patient.patientName.trim();

                if (patientContactNo === normalizedContactNo &&
                    patientNameTrimmed.toLowerCase() === normalizedPatientName.toLowerCase()) {
                    patientFound = true;
                    const newPatient = { ...patient, status: normalizedStatus };
                    return newPatient;
                }
                return patient;
            });

            if (patientFound) {
                localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_HOSPITAL_KEY, JSON.stringify(updated));
                // Force state update by creating a new array reference
                setDuplicateExceptionPatients([...updated]);
            }
        } catch (error) {
            console.error("[Hospital Registration] Failed to update duplicate exception patient status:", error);
        }
    }, [getDuplicateExceptionPatients]);

    // Get socket hook
    const { onDuplicateNumberPermissionUpdate } = useSocket();

    // Load pending registrations on mount - filter by current form type
    useEffect(() => {
        const pending = getPendingRegistrations();
        const filtered = pending.filter(reg => reg.formType === formType);
        setPendingRegistrations(filtered);

        // Load duplicate exception patients (status is already validated in getDuplicateExceptionPatients)
        const duplicatePatients = getDuplicateExceptionPatients();
        setDuplicateExceptionPatients(duplicatePatients);
    }, [getPendingRegistrations, getDuplicateExceptionPatients, formType]);

    // Listen for duplicate number permission updates via socket
    useEffect(() => {
        const unsubscribe = onDuplicateNumberPermissionUpdate((socketData: any) => {
            // Socket data structure: { message: "...", data: { contactNo, patientName, status, ... } }
            // Extract the nested data object
            const data = socketData?.data || socketData;

            // Check if we have the required fields
            if (data?.contactNo && data?.patientName && data?.status) {
                // Convert status to lowercase (socket sends "APPROVED"/"REJECTED", we need "approved"/"rejected")
                const normalizedStatus = data.status.toLowerCase();

                if (normalizedStatus === "approved" || normalizedStatus === "rejected") {
                    updateDuplicateExceptionPatientStatus(data.contactNo, data.patientName, normalizedStatus as "approved" | "rejected");
                }
            }
        });
        return unsubscribe;
    }, [onDuplicateNumberPermissionUpdate, updateDuplicateExceptionPatientStatus]);

    // Listen for custom event when localStorage is updated from another page (e.g., Notification component)
    useEffect(() => {
        const handleStatusUpdate = (event: CustomEvent) => {
            const { type } = event.detail || {};
            // Only reload if the update is for hospital type
            if (type === "hospital") {
                // Reload from localStorage to get the updated status
                const duplicatePatients = getDuplicateExceptionPatients();
                setDuplicateExceptionPatients(duplicatePatients);
            }
        };

        window.addEventListener('duplicateExceptionPatientStatusUpdated' as any, handleStatusUpdate as EventListener);
        return () => {
            window.removeEventListener('duplicateExceptionPatientStatusUpdated' as any, handleStatusUpdate as EventListener);
        };
    }, [getDuplicateExceptionPatients]);

    // Listen for visibility change to reload when page becomes visible (fallback)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const duplicatePatients = getDuplicateExceptionPatients();
                setDuplicateExceptionPatients(duplicatePatients);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [getDuplicateExceptionPatients]);

    // Fetch countries, states, cities for mapping names to IDs
    const { data: countriesData } = useGetCountriesQuery();
    
    // Lazy queries for tehsils and areas - fetch when needed for name-to-ID mapping
    const [getTehsilsQuery] = useLazyGetTehsilsQuery();
    const [getAreasQuery] = useLazyGetAreasQuery();
    const [selectedCountryId, setSelectedCountryId] = useState<string>("");
    const { data: statesData } = useGetStatesQuery(
        selectedCountryId ? { countryId: selectedCountryId } : undefined,
        { skip: !selectedCountryId }
    );
    const [selectedStateId, setSelectedStateId] = useState<string>("");
    const { data: citiesData } = useGetCitiesQuery(
        selectedStateId ? { stateId: selectedStateId } : undefined,
        { skip: !selectedStateId }
    );

    // Initial form values
    const initialValues: RegistrationPersonalDetailsFormValues = {
        contactNumber: "",
        whatsappNo: "",
        aadharCardNumber: "",
        patientNameSelect: "",
        patientName: "",
        gender: "",
        age: "",
        maritalStatus: "",
        fathersHusbandsNameSelect: "",
        fathersHusbandsName: "",
        religion: "",
        specificReligion: "",
        occupation: "",
        emailAddress: "",
        jsHealthCardNo: "",
        pinCode: "",
        country: "6", // India is auto-selected
        state: "",
        city: "",
        tehsil: "" as any,
        area: "" as any,
        address: "",
        addressLine1: "",
        addressLine2: "",
        patientType: "",
        patientSubType: "",
        panelId: "",
        benificiaryId: "",
        insuranceCompany: "",
        ayushCovered: "",
        referral: "no",
        source: "",
        tvSpecificField: "",
        newspaperSpecificField: "",
        socialMediaSpecificField: "",
        doctorSpecificField: "",
        referralName: "",
        referralMobile: "",
        doctor: "",
        appointmentDate: "",
        timeSlot: "",
        consultationCharges: "",
        paymentMode: "",
        transactionId: "",
        serviceId: "",
        razorpayPosPaymentLogId: "",
        gstBilling: false,
        gstNumber: "",
        companyName: "",
        billingAddress: "",
        billingState: "",
        billingCity: "",
        billingPincode: "",
        heightFeet: "",
        heightInch: "",
        weight: "",
        bloodGroup: "",
        allergies: "",
        surgeries: "",
        dietType: "",
        bloodPressure: "",
        sugarLevel: "",
        temperature: "",
        pulse: "",
        spo2: "",
        diabetes: "",
        diabetesRemarks: "",
        htn: "",
        htnRemarks: "",
        coronaryArteryDisease: "",
        coronaryArteryDiseaseRemarks: "",
        thyroid: "",
        thyroidRemarks: "",
        menstrual: "",
        menstrualRemarks: "",
        alcohol: false,
        smoking: false,
        tobacco: false,
        drugs: false,
        addictionOther: false,
        addictionSpecify: "",
        diagnosis: "",
        subDiagnosis: "",
        symptoms: "",
    };

    // Formik setup
    const formik = useFormik<RegistrationPersonalDetailsFormValues>({
        initialValues,
        validationSchema: registrationPersonalDetailsSchema,
        validateOnChange: false,
        validateOnBlur: true,
        onSubmit: async (values) => {
        },
    });

    // Fetch doctors and panels for matching when patient is selected (after formik is initialized)
    // Fetch panels by default to have them available for all patient types
    const { data: doctorsData } = useGetDoctorsQuery();
    const { data: panelsData } = useGetPanelsQuery({ page: 1, limit: 100 });

    // Enable arrow key navigation for form fields (after formik is initialized)
    useArrowKeyNavigation(formsContainerRef, true, (fieldName) => {
        formik.setFieldTouched(fieldName as keyof RegistrationPersonalDetailsFormValues, true, false);
        formik.validateField(fieldName);
    });

    // Clear selected referral patient when referral is set to "no"
    useEffect(() => {
        if (formik.values.referral?.toLowerCase() === "no") {
            setSelectedReferralPatient(null);
            referralPatientSelectedRef.current = false;
        }
    }, [formik.values.referral]);

    // Handle token click - pre-fill form with entry data (after formik is initialized)
    const handleTokenClick = useCallback((entry: PatientEntry) => {
        // Clear gate entry error when a token is selected
        if (gateEntryRequired) {
            setGateEntryRequired(false);
        }

        // Clear awaiting-token-selection block so Save & Next becomes enabled
        if (isAwaitingTokenSelection) {
            setIsAwaitingTokenSelection(false);
        }

        const entryId = entry.id ? String(entry.id) : null;

        // If clicking the same token again, clear the form
        if (selectedTokenId !== null && String(selectedTokenId) === entryId) {
            formik.resetForm();
            setSelectedCountryId("");
            setSelectedStateId("");
            setPatientToken("");
            setPatientEntryId(null);
            setSelectedPatientEntry(null);
            setSelectedTokenId(null);
            setSelectedPreBookingId(null); // Clear pre-booking when clearing token
            setPatientUhid(""); // Clear patient UHID
            setIsRevisitedPatient(false); // Clear revisited state
            setSelectedRevisitedPatientData(null); // Clear selected patient data
            setCurrentPendingRegistrationId(null); // Un-highlight pending registration button at top
            return;
        }

        // Reset form before loading new data
        formik.resetForm();
        setSelectedCountryId("");
        setSelectedStateId("");
        setPatientToken("");
        setPatientEntryId(null);
        setPatientUhid(""); // Clear patient UHID when selecting new token
        setPatientRegistrationId(null); // Clear registration ID when selecting new token
        setIsRevisitedPatient(false); // Clear revisited state when selecting new token
        setSelectedRevisitedPatientData(null); // Clear selected patient data when selecting new token
        setSelectedPreBookingId(null); // Clear pre-booking when selecting new token
        setCurrentPendingRegistrationId(null); // Un-highlight pending registration button at top when selecting from Token Panel
        // Note: Don't clear userLeadId here - it will be preserved if the token panel entry came from userLead
        // and will be saved to pending registration when form is saved
        
        // Check if patient entry has uhid - if yes, store it for CreateAppointmentAndUpdateRegistration API
        const entryUhid = entry.uhid;
        if (entryUhid) {
            setPatientUhid(entryUhid);
            // If uhid exists, use registrationId from the entry (not the regular id)
            // The patient-entries API response includes registrationId field which is different from id
            if (entry.registrationId) {
                setPatientRegistrationId(typeof entry.registrationId === 'number' ? entry.registrationId : parseInt(String(entry.registrationId), 10));
            }
        }
        
        // Check if patient entry has userLeadId - if yes, store it for POST payload
        const entryUserLeadId = (entry as any).userLeadId;
        if (entryUserLeadId !== null && entryUserLeadId !== undefined) {
            const leadId = typeof entryUserLeadId === 'number' ? entryUserLeadId : parseInt(String(entryUserLeadId), 10);
            if (!isNaN(leadId)) {
                setUserLeadId(leadId);
                setIsUserLeadData(true);
            }
        } else {
            // Clear userLeadId if entry doesn't have it
            setUserLeadId(null);
            setIsUserLeadData(false);
        }
        
        // Set the selected patient entry to trigger form pre-fill
        setSelectedPatientEntry(entry);
        // Store patient entry ID for payload
        if (entry.id) {
            setPatientEntryId(entry.id);
        }
        // Set selected token ID for highlighting
        setSelectedTokenId(entryId);
        setCurrentStep(0); // Reset to first step
    }, [formik, selectedTokenId, gateEntryRequired, isAwaitingTokenSelection]);

    // Pre-fill form when patient entry is selected (after formik is initialized)
    useEffect(() => {
        if (selectedPatientEntry) {
            const entry = selectedPatientEntry;

            // Pre-fill form fields immediately
            const formUpdates: Partial<RegistrationPersonalDetailsFormValues> = {
                contactNumber: entry.contactNo || "",
                aadharCardNumber: entry.aadharCardNo || "",
                patientNameSelect: entry.title || "",
                patientName: entry.name || "",
                age: entry.age || "",
                emailAddress: entry.emailAddress || "",
                pinCode: entry.pinCode || "",
                address: entry.patientAddress || "",
                addressLine1: (entry as any).addressLine1 ?? "",
                addressLine2: (entry as any).addressLine2 ?? "",
                occupation: entry.occupation || "",
                maritalStatus: entry.maritalStatus?.toLowerCase() || "",
                patientType: entry.patientType?.toLowerCase() || "",
                panelId: entry.panelId ? String(entry.panelId) : "",
            };

            // Set form values
            Object.keys(formUpdates).forEach((key) => {
                const value = formUpdates[key as keyof typeof formUpdates];
                // For panelId, set it even if empty string (to clear previous selection)
                if (key === "panelId") {
                    formik.setFieldValue(key, value || "", false);
                } else if (value !== undefined && value !== "") {
                    formik.setFieldValue(key, value, false);
                }
            });

            // If patientType is "panel" and panelId exists, ensure it's set
            if (entry.patientType?.toLowerCase() === "panel" && entry.panelId) {
                formik.setFieldValue("panelId", String(entry.panelId), false);
            } else if (entry.patientType?.toLowerCase() !== "panel") {
                // Clear panelId if patientType is not panel
                formik.setFieldValue("panelId", "", false);
            }

            // Store token (opdToken or registerToken)
            const token = entry.opdToken || entry.registerToken || "";
            if (token) {
                setPatientToken(token);
            }

            // Map country name to ID if countries data is available
            if (entry.country && countriesData?.data) {
                const country = countriesData.data.find(
                    (c) => c.name.toLowerCase() === entry.country?.toLowerCase()
                );
                if (country) {
                    const countryId = country.id.toString();
                    setSelectedCountryId(countryId);
                    formik.setFieldValue("country", countryId, false);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientEntry, countriesData]);

    // Map state name to ID when states are loaded (after country is set)
    useEffect(() => {
        if (selectedPatientEntry && statesData?.data && selectedCountryId && selectedPatientEntry.patientState) {
            const state = statesData.data.find(
                (s) => s.name.toLowerCase() === selectedPatientEntry.patientState?.toLowerCase()
            );
            if (state) {
                const stateId = state.id.toString();
                setSelectedStateId(stateId);
                formik.setFieldValue("state", stateId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientEntry, statesData, selectedCountryId]);

    // Map city name to ID when cities are loaded (after state is set)
    useEffect(() => {
        if (selectedPatientEntry && citiesData?.data && selectedStateId && selectedPatientEntry.city) {
            const city = citiesData.data.find(
                (c) => c.name.toLowerCase() === selectedPatientEntry.city?.toLowerCase()
            );
            if (city) {
                const cityId = city.id.toString();
                formik.setFieldValue("city", cityId, false);
                
                // After city is set, map tehsil if available
                const tehsilName = (selectedPatientEntry as any).tehsil;
                if (tehsilName && cityId) {
                    // Fetch tehsils for this city/district and find matching tehsil by name
                    getTehsilsQuery({ districtId: cityId }).then((result) => {
                        if (result.data?.success && result.data?.data) {
                            const tehsils = result.data.data;
                            const matchingTehsil = tehsils.find(
                                (t: any) => (t.name || "").toLowerCase() === String(tehsilName || "").toLowerCase()
                            );
                            if (matchingTehsil) {
                                formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);
                                
                                // After tehsil is set, map area if available
                                const areaName = (selectedPatientEntry as any).area;
                                if (areaName && matchingTehsil.id) {
                                    getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                                        if (areaResult.data?.success && areaResult.data?.data) {
                                            const areas = areaResult.data.data;
                                            const matchingArea = areas.find(
                                                (a: any) => (a.name || "").toLowerCase() === String(areaName || "").toLowerCase()
                                            );
                                            if (matchingArea) {
                                                formik.setFieldValue("area", matchingArea.id.toString(), false);
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
    }, [selectedPatientEntry, citiesData, selectedStateId, getTehsilsQuery, getAreasQuery]);

    // Ensure selectedTokenId and patientEntryId are set when loading pending registration from token panel
    useEffect(() => {
        if (currentPendingRegistrationId && pendingRegistrations.length > 0) {
            const pendingReg = pendingRegistrations.find(reg => reg.id === currentPendingRegistrationId);
            if (pendingReg?.isFromTokenPanel) {
                const entry = pendingReg.patientEntryData;
                const entryId = entry?.id ?? pendingReg.patientEntryId;
                if (entryId != null && entryId !== '') {
                    const tokenId = String(entryId);
                    setSelectedTokenId(tokenId);
                    // Ensure patientEntryId is set so it is sent in hospital-patient POST (e.g. 288)
                    const numId = typeof entryId === 'number' ? entryId : parseInt(String(entryId), 10);
                    if (!isNaN(numId)) {
                        setPatientEntryId(numId);
                    }
                }
            } else if (pendingReg && !pendingReg.isFromTokenPanel) {
                setSelectedTokenId(null);
            }
        } else if (!currentPendingRegistrationId) {
            setSelectedTokenId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPendingRegistrationId, pendingRegistrations]);

    // Map country name to ID when countries are loaded (for revisit patient from existing patients dialog)
    useEffect(() => {
        if (selectedPatientAddressRef.current?.countryName && countriesData?.data) {
            const country = countriesData.data.find(
                (c) => c.name.toLowerCase() === selectedPatientAddressRef.current?.countryName?.toLowerCase()
            );
            if (country) {
                const countryId = country.id.toString();
                formik.setFieldValue("country", countryId, false);
                setSelectedCountryId(countryId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientAddressRef.current?.countryName, countriesData]);

    // Map state name to ID when states are loaded (for revisit patient from existing patients dialog)
    useEffect(() => {
        if (selectedPatientAddressRef.current?.stateName && statesData?.data && formik.values.country) {
            const state = statesData.data.find(
                (s) => s.name.toLowerCase() === selectedPatientAddressRef.current?.stateName?.toLowerCase()
            );
            if (state) {
                const stateId = state.id.toString();
                setSelectedStateId(stateId);
                formik.setFieldValue("state", stateId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientAddressRef.current?.stateName, statesData, formik.values.country]);

    // Map city name to ID when cities are loaded (for revisit patient from existing patients dialog)
    useEffect(() => {
        if (selectedPatientAddressRef.current?.cityName && citiesData?.data && formik.values.state) {
            const city = citiesData.data.find(
                (c) => c.name.toLowerCase() === selectedPatientAddressRef.current?.cityName?.toLowerCase()
            );
            if (city) {
                const cityId = city.id.toString();
                formik.setFieldValue("city", cityId, false);
                
                // Store cityId temporarily for tehsil/area mapping before clearing ref
                const tehsilName = selectedPatientAddressRef.current?.tehsil;
                const areaName = selectedPatientAddressRef.current?.area;
                
                // Set pinCode after city is mapped (if it was stored in the ref)
                if (selectedPatientAddressRef.current?.pinCode) {
                    formik.setFieldValue("pinCode", selectedPatientAddressRef.current.pinCode, false);
                }
                
                // Map tehsil and area if available
                if (tehsilName && cityId) {
                    // Fetch tehsils for this city/district and find matching tehsil by name
                    getTehsilsQuery({ districtId: cityId }).then((result) => {
                        if (result.data?.success && result.data?.data) {
                            const tehsils = result.data.data;
                            const matchingTehsil = tehsils.find(
                                (t: any) => (t.name || "").toLowerCase() === String(tehsilName || "").toLowerCase()
                            );
                            if (matchingTehsil) {
                                formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);
                                
                                // After tehsil is set, map area if available
                                if (areaName && matchingTehsil.id) {
                                    getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                                        if (areaResult.data?.success && areaResult.data?.data) {
                                            const areas = areaResult.data.data;
                                            const matchingArea = areas.find(
                                                (a: any) => (a.name || "").toLowerCase() === String(areaName || "").toLowerCase()
                                            );
                                            if (matchingArea) {
                                                formik.setFieldValue("area", matchingArea.id.toString(), false);
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
                
                // Clear the ref after mapping is done
                selectedPatientAddressRef.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientAddressRef.current?.cityName, citiesData, formik.values.state, getTehsilsQuery, getAreasQuery]);

    // Match panelId when panels are loaded and patientType is panel
    useEffect(() => {
        if (formik.values.patientType?.toLowerCase() === "panel" && formik.values.panelId && panelsData?.data) {
            const panelId = parseInt(formik.values.panelId, 10);
            const panel = panelsData.data.find((p) => p.id === panelId);
            if (panel && (panel.status === "active" || panel.status === "Active")) {
                // Panel is already set and valid, no need to change
                return;
            } else if (!panel) {
                // Panel ID doesn't exist in the list, clear it
                console.warn("Panel ID not found in panels list:", panelId);
                formik.setFieldValue("panelId", "", false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values.patientType, formik.values.panelId, panelsData]);

    // Match doctor when doctors are loaded
    useEffect(() => {
        if (formik.values.doctor && doctorsData?.data) {
            const doctorId = parseInt(formik.values.doctor, 10);
            const doctor = doctorsData.data.find((d) => d.id === doctorId);
            if (!doctor) {
                // Doctor ID doesn't exist in the list, clear it
                console.warn("Doctor ID not found in doctors list:", doctorId);
                formik.setFieldValue("doctor", "", false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values.doctor, doctorsData]);

    const handleBackSteps = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleNextStep = () => {
        if (currentStep < registrationSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    // Scroll to Registration heading when step changes
    useEffect(() => {
        if (registrationHeadingRef.current) {
            setTimeout(() => {
                registrationHeadingRef.current?.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "start" 
                });
            }, 100);
        }
    }, [currentStep]);

    // Handle Hospital registration completion (after payment/invoice)
    const handleHospitalRegistrationComplete = () => {
        // Remove from pending registrations: match by patientName (required); if pending has contactNumber, it must match too (so we also remove when pending was saved with only name, e.g. "Ajju")
        const patientName = (formik.values.patientName || "").trim();
        const contactNumber = (formik.values.contactNumber || "").trim();
        const normalizeContact = (s: string) => (s || "").replace(/\D/g, "").slice(-10); // digits only, last 10
        const normalizeName = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
        const contactNorm = normalizeContact(contactNumber);
        const nameNorm = normalizeName(patientName);
        if (nameNorm) {
            const pending = getPendingRegistrations();
            const matching = pending.find((reg) => {
                if (reg.formType !== formType) return false;
                const nameMatch = normalizeName(reg.patientName || "") === nameNorm || normalizeName(reg.formData.patientName || "") === nameNorm;
                if (!nameMatch) return false;
                const pendingContact = normalizeContact(reg.formData.contactNumber || "");
                if (!pendingContact) return true; // pending saved with only name → match by name
                return pendingContact === contactNorm; // both have contact → must match
            });
            if (matching) {
                removePendingRegistration(matching.id);
                if (currentPendingRegistrationId === matching.id) {
                    setCurrentPendingRegistrationId(null);
                }
            }
        }

        // Remove approved duplicate exception patient from localStorage if registration was for an approved patient
        if (selectedApprovedPatientId) {
            removeDuplicateExceptionPatient(selectedApprovedPatientId);
            setSelectedApprovedPatientId(null);
        }

        // Refetch token list to get updated data
        if (refetchTokenListRef.current) {
            refetchTokenListRef.current();
        }
        // Show success dialog
        setShowSuccessDialog(true);
    };

    // Function to reset form after successful submission
    const handleResetAfterSuccess = () => {
        formik.resetForm({ values: initialValues });
        setCurrentStep(0);
        setCurrentPendingRegistrationId(null);
        setSelectedApprovedPatientId(null);
        setPatientUhid(""); // Clear patient UHID
        setPatientRegistrationId(null); // Clear registration ID
        setIsRevisitedPatient(false); // Clear revisited state
        setSelectedRevisitedPatientData(null); // Clear selected patient data
        setSelectedTokenId(null); // Clear selected token
        setSelectedPreBookingId(null); // Clear selected pre-booking
        setGateEntryRequired(false); // Clear gate entry error
    };

    // Handle "Add New Patient" button click
    const handleAddNewPatient = () => {
        // If we're currently filling a form for an approved patient, don't save as duplicate exception
        // Just clear the form and start fresh
        if (selectedApprovedPatientId) {
            formik.resetForm({ values: initialValues });
            setCurrentStep(0);
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setPatientUhid(""); // Clear patient UHID
            setPatientRegistrationId(null); // Clear registration ID
            setIsRevisitedPatient(false); // Clear revisited state
            setSelectedTokenId(null); // Clear selected token
            setSelectedPreBookingId(null); // Clear selected pre-booking
            return;
        }

        // If form data came from "Already Exist Patient" dialog selection or "User Lead Data", save as pending registration
        if (isRevisitedPatient || (userLeadId !== null && selectedRevisitedPatientData)) {
            const hasData = Object.values(formik.values).some(value => {
                if (typeof value === "string") return value.trim() !== "";
                if (typeof value === "boolean") return value === true;
                return false;
            });

            if (hasData && selectedRevisitedPatientData) {
                const patientName = formik.values.patientName?.trim() || selectedRevisitedPatientData.patientName || "Unknown Patient";
                const contactNumber = formik.values.contactNumber?.trim() || selectedRevisitedPatientData.contactNumber?.trim() || "";

                // Check for duplicate: same contactNumber + patientName already saved as pending (same formType)
                const existing = getPendingRegistrations();
                const isDuplicate = existing.some(
                    (reg) =>
                        reg.formType === formType &&
                        (reg.formData.contactNumber?.trim() || "").toLowerCase() === contactNumber.toLowerCase() &&
                        (reg.patientName?.trim() || "").toLowerCase() === patientName.toLowerCase()
                );

                if (isDuplicate) {
                    setShowDuplicatePendingDialog(true);
                } else {
                    // Create pending registration with API response data
                    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const pendingRegistration: PendingRegistration = {
                        id,
                        patientName,
                        formData: formik.values,
                        currentStep: currentStep,
                        savedAt: new Date().toISOString(),
                        formType: formType,
                        isRevisitedPatient: isRevisitedPatient, // true for existing patients, false for userLead
                        patientUhid: patientUhid || selectedRevisitedPatientData.uhid || undefined,
                        patientRegistrationId: patientRegistrationId || (isRevisitedPatient ? selectedRevisitedPatientData.id : null) || null,
                        existingPatientData: selectedRevisitedPatientData,
                        // Add userLead fields
                        isUserLeadData: userLeadId !== null,
                        userLeadId: userLeadId,
                    };

                    const updated = [...existing, pendingRegistration];
                    localStorage.setItem(PENDING_REGISTRATIONS_KEY, JSON.stringify(updated));

                    // Update state - filter by current form type
                    const filtered = updated.filter(reg => reg.formType === formType);
                    setPendingRegistrations(filtered);
                }
            }
            
            // Clear the form and flags
            formik.resetForm({ values: initialValues });
            setCurrentStep(0);
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setPatientUhid(""); // Clear patient UHID
            setPatientRegistrationId(null); // Clear registration ID
            setIsRevisitedPatient(false); // Clear revisited state
            setSelectedRevisitedPatientData(null); // Clear selected patient data
            setIsUserLeadData(false); // Clear userLead flag
            setUserLeadId(null); // Clear userLeadId
            setSelectedTokenId(null); // Clear selected token
            setSelectedPreBookingId(null); // Clear selected pre-booking
            return;
        }

        // If form data came from Token Panel selection, save as pending registration (like "Already Exist Patient")
        if (selectedTokenId !== null && selectedPatientEntry) {
            const hasData = Object.values(formik.values).some(value => {
                if (typeof value === "string") return value.trim() !== "";
                if (typeof value === "boolean") return value === true;
                return false;
            });

            if (hasData) {
                const patientName = formik.values.patientName?.trim() || selectedPatientEntry.name?.trim() || "Unknown Patient";
                const contactNumber = formik.values.contactNumber?.trim() || selectedPatientEntry.contactNo?.trim() || "";
                const normalizeContact = (s: string) => (s || "").replace(/\D/g, "").slice(-10);
                const normalizeName = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
                const contactNorm = normalizeContact(contactNumber);
                const nameNorm = normalizeName(patientName);

                // Check for duplicate: same contactNumber + patientName already saved as pending (same as "Already Exist Patient")
                const existing = getPendingRegistrations();
                const isDuplicate = existing.some(
                    (reg) =>
                        reg.formType === formType &&
                        (reg.formData.contactNumber?.trim() || "").replace(/\D/g, "").slice(-10) === contactNorm &&
                        (normalizeName(reg.patientName || "") === nameNorm || normalizeName(reg.formData.patientName || "") === nameNorm)
                );

                if (isDuplicate) {
                    setShowDuplicatePendingDialog(true);
                } else {
                    // Create pending registration with full patient entry object (new: no uhid/registrationId; old: has uhid and registrationId)
                    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const entry = selectedPatientEntry;
                    // Get userLeadId from entry if available, otherwise use state
                    const entryUserLeadId = (entry as any).userLeadId;
                    const finalUserLeadId = (entryUserLeadId !== null && entryUserLeadId !== undefined) 
                        ? (typeof entryUserLeadId === 'number' ? entryUserLeadId : parseInt(String(entryUserLeadId), 10))
                        : userLeadId;
                    const hasUserLeadId = finalUserLeadId !== null && finalUserLeadId !== undefined && !isNaN(finalUserLeadId as number);
                    
                    const pendingRegistration: PendingRegistration = {
                        id,
                        patientName: patientName || entry.name || "Unknown Patient",
                        formData: formik.values,
                        currentStep: currentStep,
                        savedAt: new Date().toISOString(),
                        formType: formType,
                        isFromTokenPanel: true,
                        patientEntryId: entry.id != null ? (typeof entry.id === 'number' ? entry.id : parseInt(String(entry.id), 10)) : null, // ID from patient-entries API (e.g. 288) - sent in hospital-patient POST
                        patientEntryData: entry,
                        patientUhid: entry.uhid || undefined,
                        patientRegistrationId: entry.registrationId != null ? (typeof entry.registrationId === "number" ? entry.registrationId : Number(entry.registrationId)) : null,
                        // Preserve userLeadId from entry or state (when token panel entry came from userLead)
                        isUserLeadData: hasUserLeadId,
                        userLeadId: hasUserLeadId ? finalUserLeadId : null,
                    };

                    const updated = [...existing, pendingRegistration];
                    localStorage.setItem(PENDING_REGISTRATIONS_KEY, JSON.stringify(updated));

                    const filtered = updated.filter(reg => reg.formType === formType);
                    setPendingRegistrations(filtered);
                }
            }

            // Clear the form and token selection
            formik.resetForm({ values: initialValues });
            setCurrentStep(0);
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setPatientUhid("");
            setPatientRegistrationId(null);
            setIsRevisitedPatient(false);
            setSelectedRevisitedPatientData(null);
            setSelectedPatientEntry(null);
            setPatientEntryId(null);
            setSelectedTokenId(null);
            setSelectedPreBookingId(null);
            // Note: Don't clear userLeadId here - it's already saved to pending registration
            // Only clear it if we're starting a completely new registration
            setIsUserLeadData(false);
            setUserLeadId(null);
            return;
        }

        // If form data came from pre-booking selection, don't save to localStorage
        // Just clear the form and pre-booking selection
        if (selectedPreBookingId !== null) {
            formik.resetForm({ values: initialValues });
            setCurrentStep(0);
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setPatientUhid(""); // Clear patient UHID
            setPatientRegistrationId(null); // Clear registration ID
            setIsRevisitedPatient(false); // Clear revisited state
            setSelectedRevisitedPatientData(null); // Clear selected patient data
            setSelectedTokenId(null); // Clear selected token
            setSelectedPreBookingId(null); // Clear selected pre-booking (don't save to localStorage)
            return;
        }

        const hasData = Object.values(formik.values).some(value => {
            if (typeof value === "string") return value.trim() !== "";
            if (typeof value === "boolean") return value === true;
            return false;
        });

        if (hasData) {
            // Check if this patient already exists in duplicate exception patients
            const currentPatientName = formik.values.patientName?.trim();
            const currentContactNumber = formik.values.contactNumber?.trim();

            if (currentPatientName && currentContactNumber) {
                const existing = getDuplicateExceptionPatients();
                const alreadyExists = existing.some(
                    p => p.patientName.trim().toLowerCase() === currentPatientName.toLowerCase() &&
                        p.contactNo.trim() === currentContactNumber
                );

                if (alreadyExists) {
                    // Patient already exists, just reset form without saving
                    formik.resetForm({ values: initialValues });
                    setCurrentStep(0);
                    setCurrentPendingRegistrationId(null);
                    setSelectedApprovedPatientId(null);
                    setIsRevisitedPatient(false); // Clear revisited state
                    setSelectedRevisitedPatientData(null); // Clear selected patient data
                    setSelectedTokenId(null); // Clear selected token
                    setSelectedPreBookingId(null); // Clear selected pre-booking
                    return;
                }
            }

            if (currentPendingRegistrationId) {
                savePendingRegistration(formik.values, currentStep, currentPendingRegistrationId);
            } else {
                savePendingRegistration(formik.values, currentStep);
            }
        }

        formik.resetForm({ values: initialValues });
        setCurrentStep(0);
        setCurrentPendingRegistrationId(null);
        setSelectedApprovedPatientId(null);
        setPatientUhid(""); // Clear patient UHID
        setPatientRegistrationId(null); // Clear registration ID
        setIsRevisitedPatient(false); // Clear revisited state
        setSelectedRevisitedPatientData(null); // Clear selected patient data
        setSelectedTokenId(null); // Clear selected token
        setSelectedPreBookingId(null); // Clear selected pre-booking
    };

    // Check for existing patients by contact number
    const checkExistingPatients = useCallback(async (contactNumber: string) => {
        if (!contactNumber || contactNumber.length !== 10) {
            lastCheckedContactNumberRef.current = "";
            return;
        }

        // Don't check if dialog is being closed
        if (isClosingDialogRef.current) return;

        // Clear any pending timeout
        if (checkTimeoutRef.current) {
            clearTimeout(checkTimeoutRef.current);
            checkTimeoutRef.current = null;
        }

        // Update the last checked contact number (for tracking, but don't prevent API calls)
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

            // Check if there are any registrations or pre-bookings
            const registrations = result.data?.registrations || [];
            const preBookings = result.data?.preBookings || [];
            const userLead = result.data?.userLead;

            // Combine registrations and pre-bookings
            const allPatients: ExistingPatient[] = [];

            // Map registrations
            if (registrations.length > 0) {
                const mappedRegistrations: ExistingPatient[] = registrations.map((patient: any) => ({
                    id: patient.id,
                    sUhid: patient.sUhid || null,
                    uhid: patient.uhid || "",
                    branchId: patient.branchId,
                    patientName: patient.patientName || "",
                    patientTitle: patient.patientTitle,
                    doctorUserId: patient.doctorUserId || null,
                    gender: patient.gender,
                    age: patient.age,
                    contactNumber: patient.contactNumber || "",
                    whatsappNo: patient.whatsappNo,
                    emailAddress: patient.emailAddress,
                    maritalStatus: patient.maritalStatus,
                    aadharCardNo: patient.aadharCardNo,
                    occupation: patient.occupation,
                    religion: patient.religion,
                    specificReligion: patient.specificReligion || null,
                    jsHealthCardNo: patient.jsHealthCardNo || null,
                    guardianName: patient.guardianName,
                    guardianTitle: patient.guardianTitle,
                    patientType: patient.patientType || null,
                    panelId: patient.panelId || null,
                    patientSubType: patient.patientSubType || null,
                    benificiaryId: patient.benificiaryId || null,
                    insuranceCompany: patient.insuranceCompany || null,
                    ayushCovered: patient.ayushCovered || null,
                    height: patient.height,
                    weight: patient.weight,
                    bloodGroup: patient.bloodGroup,
                    allergies: patient.allergies,
                    surgeries: patient.surgeries,
                    dietType: patient.dietType,
                    isReferral: patient.isReferral,
                    referralClinic: patient.referralClinic || null,
                    referralSourceInfo: patient.referralSourceInfo || null,
                    referralUserId: patient.referralUserId || null,
                    referralName: patient.referralName || null,
                    referralMobile: patient.referralMobile || null,
                    address: patient.address ? {
                        id: patient.address.id,
                        address: patient.address.address || "",
                        city: patient.address.city || "",
                        pinCode: patient.address.pinCode || "",
                        state: patient.address.state || "",
                        country: patient.address.country === "101" ? "6" : (patient.address.country || "6"),
                        tehsil: (patient.address as any)?.tehsil || undefined,
                        area: (patient.address as any)?.area || undefined,
                        addressLine1: (patient.address as any)?.addressLine1 ?? undefined,
                        addressLine2: (patient.address as any)?.addressLine2 ?? undefined,
                        addressableType: patient.address.addressableType,
                        addressableId: patient.address.addressableId,
                        addressType: patient.address.addressType,
                        isActive: patient.address.isActive,
                        createdAt: patient.address.createdAt,
                        updatedAt: patient.address.updatedAt,
                    } : undefined,
                    // For backward compatibility with dialog
                    name: patient.patientName || "",
                    branchName: "N/A", // Can be fetched from branch data if needed
                    isPreBooking: false,
                    preBookingId: null,
                }));
                allPatients.push(...mappedRegistrations);
            }

            // Map pre-bookings
            if (preBookings.length > 0) {
                const mappedPreBookings: ExistingPatient[] = preBookings.map((preBooking: any) => ({
                    id: preBooking.id || 0,
                    sUhid: null,
                    uhid: preBooking.uhid || "",
                    branchId: preBooking.branchId || branchId,
                    patientName: preBooking.patientName || "",
                    patientTitle: undefined,
                    doctorUserId: preBooking.doctorUserId || undefined,
                    gender: preBooking.gender || "",
                    age: preBooking.age || "",
                    contactNumber: preBooking.contactNumber || "",
                    whatsappNo: preBooking.whatsappNumber || preBooking.contactNumber || undefined,
                    emailAddress: preBooking.emailAddress || undefined,
                    maritalStatus: preBooking.maritalStatus || "",
                    aadharCardNo: undefined,
                    occupation: preBooking.occupation || undefined,
                    religion: undefined,
                    specificReligion: null,
                    jsHealthCardNo: null,
                    guardianName: preBooking.guardianName || "",
                    guardianTitle: undefined,
                    patientType: preBooking.patientType || null,
                    panelId: null,
                    patientSubType: preBooking.patientSubType || null,
                    benificiaryId: preBooking.benificiaryId || null,
                    insuranceCompany: preBooking.insuranceCompany || null,
                    ayushCovered: preBooking.ayushCovered || null,
                    address: preBooking.address ? {
                        id: 0,
                        address: preBooking.address || "",
                        city: preBooking.city || "",
                        pinCode: preBooking.pinCode || "",
                        state: preBooking.state || "",
                        country: preBooking.country === "101" ? "6" : (preBooking.country || "6"),
                        addressLine1: (preBooking as any).address?.addressLine1 ?? (preBooking as any).addressLine1 ?? undefined,
                        addressLine2: (preBooking as any).address?.addressLine2 ?? (preBooking as any).addressLine2 ?? undefined,
                    } : undefined,
                    name: preBooking.patientName || "",
                    branchName: "N/A",
                    isPreBooking: true,
                    preBookingId: preBooking.id || null,
                }));
                allPatients.push(...mappedPreBookings);
            }

            // First check registrations, then preBookings, then userLead
            if (registrations.length > 0) {
                setExistingPatients(allPatients);
                setIsUserLeadData(false);
                setUserLeadId(null);
                setPatientExistsDialogOpen(true);
            } else if (preBookings.length > 0) {
                setExistingPatients(allPatients);
                setIsUserLeadData(false);
                setUserLeadId(null);
                setPatientExistsDialogOpen(true);
            } else if (userLead && Object.keys(userLead).length > 0) {
                // Check if userLead has data (not empty object)
                // Transform userLead to match ExistingPatient format
                const userLeadData = userLead as any;
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
                    sUhid: null,
                    uhid: userLeadData.uhid || "",
                    branchId: userLeadData.branchId || branchId,
                    patientName: userLeadData.patientName || "",
                    patientTitle: userLeadData.parentPrefix || undefined,
                    doctorUserId: undefined,
                    gender: userLeadData.gender || "",
                    age: userLeadData.age || "",
                    contactNumber: userLeadData.contactNumber || "",
                    whatsappNo: userLeadData.alternateNumber || undefined,
                    emailAddress: undefined,
                    maritalStatus: undefined,
                    aadharCardNo: undefined,
                    occupation: undefined,
                    religion: undefined,
                    specificReligion: null,
                    jsHealthCardNo: null,
                    guardianName: userLeadData.parentName || "",
                    guardianTitle: userLeadData.parentPrefix || undefined,
                    patientType: userLeadData.patientType || null,
                    panelId: null,
                    patientSubType: userLeadData.patientSubType || null,
                    benificiaryId: userLeadData.benificiaryId || null,
                    insuranceCompany: undefined,
                    ayushCovered: undefined,
                    address: userLeadAddress,
                    name: userLeadData.patientName || "",
                    branchName: "N/A",
                    isPreBooking: false,
                    preBookingId: null,
                };
                setExistingPatients([transformedUserLead]);
                setIsUserLeadData(true);
                // Store userLead ID for POST payload and localStorage
                if (userLeadData.id) {
                    setUserLeadId(userLeadData.id);
                }
                setPatientExistsDialogOpen(true);
            } else {
                // No registrations, no preBookings, no userLead — gate entry required
                lastCheckedContactNumberRef.current = "";
                setIsUserLeadData(false);
                setUserLeadId(null);
                setGateEntryRequired(true);
            }
        } catch (error: any) {
            // Handle different error types properly
            const errorMessage = error?.message || error?.data?.message || error?.error || (typeof error === 'string' ? error : String(error));
            console.error("Error checking existing patients:", errorMessage || "Unknown error", error);
            // Clear the ref on error so we can retry if needed
            lastCheckedContactNumberRef.current = "";
            // If API fails, don't show dialog
        } finally {
            setIsContactLoading(false);
        }
    }, [checkExistingPatientsQuery, branchId]);

    // Check for existing patients by Aadhar Card number
    const checkExistingAadharCard = useCallback(async (aadharCardNo: string, contactNumber?: string) => {
        if (!aadharCardNo || aadharCardNo.trim().length !== 12) {
            // Clear the last checked ref if Aadhar Card is invalid
            lastCheckedAadharCardRef.current = "";
            // Clear error if Aadhar Card is not 12 digits
            const currentError = formik.errors.aadharCardNumber;
            if (currentError === "Aadhar Card No. already exists") {
                formik.setFieldError("aadharCardNumber", undefined);
            }
            return;
        }
        
        const trimmedAadhar = aadharCardNo.trim();
        
        // Always check when 12 digits are entered - check every time
        // The ref is used to track what was checked, but we allow re-checking
        // Don't set the ref here - set it after the check completes

        try {
            const result = await checkExistingPatientsQuery({
                branchId: branchId,
                phoneNumber: "", // Empty phone number as per API requirement
                aadharCardNo: trimmedAadhar,
            }).unwrap();

            // Handle new response structure with registrations and preBookings
            const registrations = result.data?.registrations || [];
            
            // If there are registrations, Aadhar Card already exists
            if (registrations.length > 0) {
                // Check if mobile number matches with existing patient
                // Use provided contactNumber or get from formik values
                const currentContactNumber = (contactNumber || formik.values.contactNumber || "").trim();
                
                // Find patient with matching contact number
                const matchingPatient = registrations.find((patient: any) => 
                    patient.contactNumber === currentContactNumber
                );
                
                // If both contactNumber and aadharCardNo match the same patient → OK (clear error)
                if (currentContactNumber.length === 10 && matchingPatient) {
                    // Both match - this is the same patient, clear error
                    formik.setFieldError("aadharCardNumber", undefined);
                    // Update ref after successful check
                    lastCheckedAadharCardRef.current = trimmedAadhar;
                } else if (currentContactNumber.length === 10 && !matchingPatient) {
                    // Contact number provided but doesn't match - Aadhar Card exists with different contact number
                    formik.setFieldError("aadharCardNumber", "Aadhar Card No. already exists");
                    formik.setFieldTouched("aadharCardNumber", true, false);
                    // Update ref to track this Aadhar Card has error
                    lastCheckedAadharCardRef.current = trimmedAadhar;
                } else {
                    // Contact number not provided yet or doesn't match - Aadhar Card exists, show error
                    formik.setFieldError("aadharCardNumber", "Aadhar Card No. already exists");
                    formik.setFieldTouched("aadharCardNumber", true, false);
                    // Update ref to track this Aadhar Card has error
                    lastCheckedAadharCardRef.current = trimmedAadhar;
                }
            } else {
                // No registrations found - Aadhar Card doesn't exist, clear error
                formik.setFieldError("aadharCardNumber", undefined);
                lastCheckedAadharCardRef.current = "";
            }
        } catch (error: any) {
            console.error("Error checking existing Aadhar Card:", error);
            
            // Check if error response indicates Aadhar Card exists
            const errorMessage = error?.data?.message || error?.message || "";
            if (errorMessage.toLowerCase().includes("aadhar") || errorMessage.toLowerCase().includes("exists")) {
                formik.setFieldError("aadharCardNumber", "Aadhar Card No. already exists");
                formik.setFieldTouched("aadharCardNumber", true, false);
            } else {
                // Clear the ref on other errors so we can retry if needed
                lastCheckedAadharCardRef.current = "";
            }
        }
    }, [checkExistingPatientsQuery, branchId, formik]);

    // Check patient-entries first; if data found → open token panel with pre-filled search.
    // If empty → fall through to registrations-and-pre-bookings (checkExistingPatients).
    const checkPatientEntriesFirst = useCallback(async (contactNumber: string) => {
        if (!contactNumber || contactNumber.length !== 10) return;

        setIsContactLoading(true);
        try {
            const result = await getPatientEntriesLazy({
                branchId: branchId,
                search: contactNumber,
                page: 1,
                limit: 100,
            }).unwrap();

            const entries = Array.isArray(result) ? result : (result as any)?.data || [];

            if (entries.length > 0) {
                // Patient-entries has data → open token panel, pre-fill search, and require selection
                setIsPreBookingOpen(true);
                setTokenPanelSearch(contactNumber);
                setIsAwaitingTokenSelection(true);
            } else {
                // No entries → fall back to registrations-and-pre-bookings flow
                await checkExistingPatients(contactNumber);
            }
        } catch {
            // On error, fall back to registrations-and-pre-bookings flow
            await checkExistingPatients(contactNumber);
        } finally {
            setIsContactLoading(false);
        }
    }, [getPatientEntriesLazy, branchId, checkExistingPatients]);

    // Handle contact number change - check when it reaches 10 digits
    const handleContactNumberChange = useCallback((field: string, value: string) => {
        // Clear gate entry error when user modifies contact number
        if (gateEntryRequired) {
            setGateEntryRequired(false);
        }

        // Clear token panel search and awaiting state when contact number changes
        if (tokenPanelSearch) {
            setTokenPanelSearch("");
        }
        if (isAwaitingTokenSelection) {
            setIsAwaitingTokenSelection(false);
        }

        // Don't check if dialog is being closed or if value is empty
        if (isClosingDialogRef.current || !value || value.length === 0) {
            return;
        }

        // Check when contact number reaches 10 digits
        if (value.length === 10) {
            checkPatientEntriesFirst(value);

            // Re-check Aadhar Card if it's already entered (to verify if contact number matches)
            const aadharValue = formik.values.aadharCardNumber?.trim() || "";
            if (aadharValue.length === 12) {
                // Re-check with new contact number to see if they match
                checkExistingAadharCard(aadharValue, value);
            }
        } else {
            // If contact number is incomplete, re-check Aadhar Card (may show error if Aadhar exists)
            const aadharValue = formik.values.aadharCardNumber?.trim() || "";
            if (aadharValue.length === 12) {
                // Re-check to update error status
                checkExistingAadharCard(aadharValue, value);
            }
        }
    }, [checkPatientEntriesFirst, checkExistingAadharCard, formik.values.aadharCardNumber, gateEntryRequired, tokenPanelSearch, isAwaitingTokenSelection]);

    // Check referral patients by phone number
    const checkReferralPatients = useCallback(async (phoneNumber: string) => {
        // Don't check if already checked this number
        if (lastCheckedReferralMobileRef.current === phoneNumber) {
            return;
        }

        setIsReferralMobileLoading(true);
        try {
            lastCheckedReferralMobileRef.current = phoneNumber;
            referralPatientSelectedRef.current = false; // Reset selection flag when opening dialog
            const result = await checkReferralPatientsQuery({ phoneNumber }).unwrap();
            
            // Show dialog if there are any patients (1 or more)
            if (result.data && result.data.length > 0) {
                setReferralPatients(result.data);
                setSelectedReferralPhoneNumber(phoneNumber);
                setReferralPatientsDialogOpen(true);
            }
        } catch (error: any) {
            console.error("Error checking referral patients:", error);
            // Clear the ref on error so we can retry if needed
            lastCheckedReferralMobileRef.current = "";
        } finally {
            setIsReferralMobileLoading(false);
        }
    }, [checkReferralPatientsQuery]);

    // Handle referral mobile change - check when it reaches 10 digits
    const handleReferralMobileChange = useCallback((value: string) => {
        // Don't check if dialog is being closed or if value is empty
        if (!value || value.length === 0) {
            lastCheckedReferralMobileRef.current = "";
            return;
        }

        // Check when referral mobile reaches 10 digits
        if (value.length === 10) {
            checkReferralPatients(value);
        } else {
            // Clear the ref if incomplete
            lastCheckedReferralMobileRef.current = "";
        }
    }, [checkReferralPatients]);

    // Handle select button click from referral patients dialog
    const handleReferralPatientSelect = useCallback((patient: ReferralPatient) => {
        // Only allow selection if patient has UHID
        if (!patient.uhid || patient.uhid.trim() === "") {
            return;
        }

        setReferralPatientsDialogOpen(false);
        lastCheckedReferralMobileRef.current = "";
        referralPatientSelectedRef.current = true; // Mark that a patient was selected
        
        // Store selected patient to keep fields non-editable
        setSelectedReferralPatient(patient);
        
        // Auto-fill referral name from selected patient - always set it
        // The phone number is already set and both fields remain non-editable
        formik.setFieldValue("referralName", patient.patientName || "", false);
    }, [formik]);

    // Handle close referral patients dialog
    const handleCloseReferralPatientsDialog = useCallback(() => {
        setReferralPatientsDialogOpen(false);
        lastCheckedReferralMobileRef.current = "";
        
        // If dialog is closed without selecting a patient, clear referral mobile field
        if (!referralPatientSelectedRef.current) {
            formik.setFieldValue("referralMobile", "", false);
            setSelectedReferralPhoneNumber("");
            setSelectedReferralPatient(null);
        }
    }, [formik]);

    // Handle revisit button click from dialog
    const handleRevisit = useCallback((patient: ExistingPatient) => {
        setPatientExistsDialogOpen(false);
        isClosingDialogRef.current = false;
        lastCheckedContactNumberRef.current = "";
        
        // Store isUserLeadData flag before resetting
        const wasUserLeadData = isUserLeadData;
        
        // For userLead data, don't mark as revisited (it's a new patient)
        // For existing registrations/preBookings, mark as revisited
        setIsRevisitedPatient(!wasUserLeadData);

        // Store patient UHID and registration ID if available (only for existing patients, not userLead)
        if (!wasUserLeadData) {
            setPatientUhid(patient.uhid || "");
            if (patient.id) {
                setPatientRegistrationId(patient.id);
            }
        } else {
            // For userLead, clear these as it's a new patient
            setPatientUhid("");
            setPatientRegistrationId(null);
        }
        
        // Store the full patient data from API response for pending registration
        setSelectedRevisitedPatientData(patient);
        
        // For userLead data, preserve userLeadId (don't reset it) as we need it for POST payload
        // Only reset isUserLeadData flag after we've used it
        if (!wasUserLeadData) {
            setIsUserLeadData(false);
            setUserLeadId(null);
        }
        // If wasUserLeadData is true, keep userLeadId and isUserLeadData will be reset after form is filled

        // For "Already Exist Patient" dialog, clear any previous patientEntryId so it is not sent
        setPatientEntryId(null);

        // Clear token selection when revisiting
        setSelectedTokenId(null);

        // Store pre-booking ID if it's a pre-booking
        if (patient.isPreBooking && patient.preBookingId) {
            setSelectedPreBookingId(patient.preBookingId);
        } else {
            setSelectedPreBookingId(null);
        }

        // Fill form with patient data
        if (patient.patientTitle) {
            formik.setFieldValue("patientNameSelect", patient.patientTitle, false);
        }
        if (patient.patientName || patient.name) {
            formik.setFieldValue("patientName", patient.patientName || patient.name || "", false);
        }
        if (patient.contactNumber) {
            formik.setFieldValue("contactNumber", patient.contactNumber, false);
        }
        if (patient.whatsappNo) {
            formik.setFieldValue("whatsappNo", patient.whatsappNo, false);
        }
        if (patient.aadharCardNo) {
            formik.setFieldValue("aadharCardNumber", patient.aadharCardNo, false);
        }
        if (patient.gender) {
            formik.setFieldValue("gender", patient.gender.toLowerCase(), false);
        }
        if (patient.age) {
            formik.setFieldValue("age", patient.age, false);
        }
        if (patient.maritalStatus) {
            formik.setFieldValue("maritalStatus", patient.maritalStatus.toLowerCase(), false);
        }
        if (patient.guardianTitle) {
            formik.setFieldValue("fathersHusbandsNameSelect", patient.guardianTitle, false);
        }
        if (patient.guardianName) {
            formik.setFieldValue("fathersHusbandsName", patient.guardianName, false);
        }
        if (patient.religion) {
            formik.setFieldValue("religion", patient.religion.toLowerCase(), false);
        }
        if (patient.occupation) {
            formik.setFieldValue("occupation", patient.occupation, false);
        }
        if (patient.emailAddress) {
            formik.setFieldValue("emailAddress", patient.emailAddress, false);
        }
        // Fill fields from step 2 (Payment) and step 4 (Medical)
        // Always set jsHealthCardNo, even if null/empty (to clear field if needed)
        formik.setFieldValue("jsHealthCardNo", patient.jsHealthCardNo || "", false);
        if (patient.specificReligion) {
            formik.setFieldValue("specificReligion", patient.specificReligion, false);
        }
        if (patient.patientSubType) {
            formik.setFieldValue("patientSubType", patient.patientSubType, false);
        }
        if (patient.benificiaryId) {
            formik.setFieldValue("benificiaryId", patient.benificiaryId, false);
        }
        if (patient.insuranceCompany) {
            formik.setFieldValue("insuranceCompany", patient.insuranceCompany, false);
        }
        if (patient.ayushCovered) {
            formik.setFieldValue("ayushCovered", patient.ayushCovered, false);
        }
        // Fill Medical/Vital fields (Step 2 for hospital)
        if (patient.height) {
            // Convert height to feet and inches if needed, or set directly
            formik.setFieldValue("heightFeet", patient.height, false);
        }
        if (patient.weight) {
            formik.setFieldValue("weight", patient.weight, false);
        }
        if (patient.bloodGroup) {
            formik.setFieldValue("bloodGroup", patient.bloodGroup, false);
        }
        if (patient.allergies) {
            formik.setFieldValue("allergies", patient.allergies, false);
        }
        if (patient.surgeries) {
            formik.setFieldValue("surgeries", patient.surgeries, false);
        }
        if (patient.dietType) {
            formik.setFieldValue("dietType", patient.dietType, false);
        }
        // Fill address fields
        if (patient.address) {
            // Map country name to ID if countries data is available
            if (patient.address.country && countriesData?.data) {
                // Check if country is a name (string) or ID (number/string number)
                const countryName = String(patient.address.country).toLowerCase();
                const country = countriesData.data.find(
                    (c) => c.name.toLowerCase() === countryName
                );
                if (country) {
                    const countryId = country.id.toString();
                    formik.setFieldValue("country", countryId, false);
                    setSelectedCountryId(countryId);
                } else {
                    // If not found by name, try treating it as ID (for backward compatibility)
                    const countryId = patient.address.country === "101" ? "6" : String(patient.address.country);
                    formik.setFieldValue("country", countryId, false);
                    setSelectedCountryId(countryId);
                }
            } else if (patient.address.country) {
                // If countriesData is not loaded yet, store country name for later mapping
                // Store it in the ref so we can map it when countriesData loads
                const countryName = String(patient.address.country);
                selectedPatientAddressRef.current = {
                    ...selectedPatientAddressRef.current,
                    countryName: countryName,
                };
            }

            // Set address directly
            if (patient.address.address) {
                formik.setFieldValue("address", patient.address.address, false);
            }
            if ((patient.address as any).addressLine1 != null) {
                formik.setFieldValue("addressLine1", (patient.address as any).addressLine1 || "", false);
            }
            if ((patient.address as any).addressLine2 != null) {
                formik.setFieldValue("addressLine2", (patient.address as any).addressLine2 || "", false);
            }

            // Store state and city names for mapping to IDs (they come as names from API)
            // Also store pinCode, tehsil, and area to set them after state/city are mapped
            selectedPatientAddressRef.current = {
                ...selectedPatientAddressRef.current,
                stateName: patient.address.state,
                cityName: patient.address.city,
                pinCode: patient.address.pinCode,
                tehsil: patient.address.tehsil,
                area: patient.address.area,
            };
        }

        // Set patientType (always set, even if null/empty)
        if (patient.patientType) {
            const normalizedPatientType = patient.patientType.toLowerCase();
            formik.setFieldValue("patientType", normalizedPatientType, false);

            // If patientType is "panel" and panelId exists, set it
            if (normalizedPatientType === "panel" && patient.panelId) {
                // Set panelId - will be matched in useEffect when panels are loaded
                formik.setFieldValue("panelId", String(patient.panelId), false);
            } else {
                // Clear panelId if patientType is not panel
                formik.setFieldValue("panelId", "", false);
            }
        } else {
            formik.setFieldValue("patientType", "", false);
        }

        // Set doctor if doctorUserId exists
        if (patient.doctorUserId) {
            formik.setFieldValue("doctor", String(patient.doctorUserId), false);
        } else {
            formik.setFieldValue("doctor", "", false);
        }

        // Fill referral fields if available
        if (patient.isReferral) {
            // Set referral to "yes" if isReferral is truthy
            formik.setFieldValue("referral", "yes", false);

            // Map referralSourceInfo to appropriate source field
            if (patient.referralSourceInfo) {
                // Try to determine source type from referralSourceInfo
                // This is a best-effort mapping - may need adjustment based on actual data
                const sourceInfo = patient.referralSourceInfo.toLowerCase();

                // Check if it's a doctor ID (numeric)
                if (patient.referralUserId && !isNaN(Number(patient.referralUserId))) {
                    formik.setFieldValue("source", "doctor", false);
                    formik.setFieldValue("doctorSpecificField", String(patient.referralUserId), false);
                } else if (patient.referralName) {
                    // If referralName exists, it's likely "other" source
                    formik.setFieldValue("source", "other", false);
                    formik.setFieldValue("referralName", patient.referralName, false);
                } else if (sourceInfo.includes("tv") || sourceInfo.includes("television")) {
                    formik.setFieldValue("source", "tv", false);
                    formik.setFieldValue("tvSpecificField", patient.referralSourceInfo, false);
                } else if (sourceInfo.includes("newspaper") || sourceInfo.includes("paper")) {
                    formik.setFieldValue("source", "newspaper", false);
                    formik.setFieldValue("newspaperSpecificField", patient.referralSourceInfo, false);
                } else if (sourceInfo.includes("social") || sourceInfo.includes("facebook") || sourceInfo.includes("instagram") || sourceInfo.includes("twitter")) {
                    formik.setFieldValue("source", "social-media", false);
                    formik.setFieldValue("socialMediaSpecificField", patient.referralSourceInfo, false);
                } else {
                    // Default to "other" if we can't determine
                    formik.setFieldValue("source", "other", false);
                    if (patient.referralName) {
                        formik.setFieldValue("referralName", patient.referralName, false);
                    }
                }
            }

            // Set referral name and mobile if available
            if (patient.referralName) {
                formik.setFieldValue("referralName", patient.referralName, false);
            }
            if (patient.referralMobile) {
                formik.setFieldValue("referralMobile", patient.referralMobile, false);
            }
        } else {
            // Set referral to "no" if not a referral
            formik.setFieldValue("referral", "no", false);
            formik.setFieldValue("source", "", false);
        }
    }, [formik]);

    // Handle add new member button click
    const handleAddNewMember = useCallback(() => {
        // Store the first existing patient's registration ID and UHID if available
        if (existingPatients.length > 0) {
            const firstPatient = existingPatients[0];
            if (firstPatient.id) {
                setPatientRegistrationId(firstPatient.id);
            }
            if (firstPatient.uhid) {
                setPatientUhid(firstPatient.uhid);
            }
        }
        setPatientExistsDialogOpen(false);
        setIsRevisitedPatient(false); // Clear revisited state when adding new member
        setDuplicateExceptionDialogOpen(true);
    }, [existingPatients]);

    // Handle duplicate exception dialog close
    const handleDuplicateExceptionDialogClose = useCallback(() => {
        setDuplicateExceptionDialogOpen(false);
        // Clear the contact number field when dialog closes
        formik.setFieldValue("contactNumber", "");
    }, [formik]);

    // Handle duplicate exception dialog submit
    const handleDuplicateExceptionSubmit = useCallback(async (name: string, relationship: string) => {
        try {
            // Check if patient with same name and contact number already exists
            const existing = getDuplicateExceptionPatients();
            const trimmedName = name.trim();
            const trimmedContact = formik.values.contactNumber.trim();
            const alreadyExists = existing.some(
                p => p.patientName.trim().toLowerCase() === trimmedName.toLowerCase() &&
                    p.contactNo.trim() === trimmedContact
            );

            if (alreadyExists) {
                // Patient already exists, don't submit again
                setDuplicateErrorMessage("This patient is already in the duplicate exception list.");
                setShowDuplicateErrorDialog(true);
                return;
            }

            const result = await requestDuplicateNumberPermission({
                branchId: branchId || 1,
                contactNo: formik.values.contactNumber,
                patientName: name,
                relationship: relationship,
                requestedBy: userId || 1,
            }).unwrap();

            // Save patient name to localStorage (hospital registration)
            saveDuplicateExceptionPatient(name, formik.values.contactNumber);

            // Show success message
            setDuplicateSuccessMessage(result.message || "Permission request submitted successfully!");
            setShowDuplicateSuccessDialog(true);

            // Clear the contact number field after successful submission
            formik.setFieldValue("contactNumber", "");

            // Close dialogs and allow form to continue
            setDuplicateExceptionDialogOpen(false);
            setPatientExistsDialogOpen(false);
            isClosingDialogRef.current = false;
            lastCheckedContactNumberRef.current = "";
        } catch (error: any) {
            console.error("Error requesting duplicate number permission:", error);

            // Handle error - show error message
            let errorMsg = "Failed to submit permission request. Please try again.";

            if (error?.data?.message) {
                errorMsg = error.data.message;
            } else if (error?.data?.error) {
                errorMsg = error.data.error;
            } else if (error?.error) {
                errorMsg = error.error;
            } else if (error?.message) {
                errorMsg = error.message;
            }

            setDuplicateErrorMessage(errorMsg);
            setShowDuplicateErrorDialog(true);
        }
    }, [requestDuplicateNumberPermission, branchId, userId, formik.values.contactNumber, saveDuplicateExceptionPatient, getDuplicateExceptionPatients]);

    // Memoized close handler for patient exists dialog
    const handlePatientExistsDialogClose = useCallback(() => {
        if (!patientExistsDialogOpen) return;

        isClosingDialogRef.current = true;

        if (checkTimeoutRef.current) {
            clearTimeout(checkTimeoutRef.current);
            checkTimeoutRef.current = null;
        }

        lastCheckedContactNumberRef.current = "";
        setExistingPatients([]);
        setPatientExistsDialogOpen(false);
        setPatientUhid(""); // Clear patient UHID when dialog closes
        setPatientRegistrationId(null); // Clear registration ID when dialog closes
        setIsRevisitedPatient(false); // Clear revisited state when dialog closes
        setSelectedRevisitedPatientData(null); // Clear selected patient data when dialog closes
        setIsUserLeadData(false); // Clear userLead flag when dialog closes
        setUserLeadId(null); // Clear userLeadId when dialog closes

        // Clear the contact number field when dialog closes
        formik.setFieldValue("contactNumber", "");

        setTimeout(() => {
            isClosingDialogRef.current = false;
        }, 500);
    }, [patientExistsDialogOpen, formik]);


    // Handle clicking on pending registration button
    const handleLoadPendingRegistration = (pendingReg: PendingRegistration) => {
        formik.setValues(pendingReg.formData);
        formik.setTouched({});
        formik.setErrors({});
        setCurrentStep(pendingReg.currentStep);
        setCurrentPendingRegistrationId(pendingReg.id);
        // Clear selected approved patient when loading pending registration
        setSelectedApprovedPatientId(null);
        
        // Restore patient flags and API data if this is from "Already Exist Patient" or "User Lead Data"
        if (pendingReg.isRevisitedPatient) {
            setIsRevisitedPatient(true);
            if (pendingReg.patientUhid) {
                setPatientUhid(pendingReg.patientUhid);
            }
            if (pendingReg.patientRegistrationId) {
                setPatientRegistrationId(pendingReg.patientRegistrationId);
            }
            if (pendingReg.existingPatientData) {
                setSelectedRevisitedPatientData(pendingReg.existingPatientData);
            }
            setIsUserLeadData(false);
            setUserLeadId(null);
            setSelectedPatientEntry(null);
            setPatientEntryId(null);
            setSelectedTokenId(null);
        } else if (pendingReg.isUserLeadData && pendingReg.userLeadId !== null && pendingReg.userLeadId !== undefined) {
            // Restore userLead data
            setIsRevisitedPatient(false);
            setIsUserLeadData(true);
            setUserLeadId(pendingReg.userLeadId ?? null);
            if (pendingReg.existingPatientData) {
                setSelectedRevisitedPatientData(pendingReg.existingPatientData);
            }
            setPatientUhid("");
            setPatientRegistrationId(null);
            setSelectedPatientEntry(null);
            setPatientEntryId(null);
            setSelectedTokenId(null);
        } else if (pendingReg.isFromTokenPanel && pendingReg.patientEntryData) {
            // Restore Token Panel IDs so submission uses correct API (hospital-patient vs CreateAppointmentAndUpdateRegistration); do not set selectedPatientEntry to avoid overwriting form
            const entry = pendingReg.patientEntryData;
            setIsRevisitedPatient(false);
            setSelectedRevisitedPatientData(null);
            setPatientUhid(entry.uhid || "");
            setPatientRegistrationId(entry.registrationId != null ? (typeof entry.registrationId === "number" ? entry.registrationId : Number(entry.registrationId)) : null);
            // Restore patientEntryId from localStorage (saved from token panel) - sent in hospital-patient POST so backend can remove/update that entry after registration
            // Prefer explicit patientEntryId, then entry.id (from patientEntryData) - normalize to number for API
            const rawId = pendingReg.patientEntryId ?? entry.id ?? null;
            const restoredEntryId = rawId != null && rawId !== ''
                ? (typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10))
                : null;
            setPatientEntryId(restoredEntryId !== null && !isNaN(restoredEntryId) ? restoredEntryId : null);
            setSelectedPatientEntry(null);
            // Ensure selectedTokenId is set to highlight the corresponding token in Token Panel
            // Convert to string for consistent comparison with TokenPanel component (which compares String(selectedTokenId) === token.id)
            // TokenPanel creates token.id as String(entry.id || ""), so we need to match that format exactly
            const tokenId = entry.id ? String(entry.id) : null;
            // Set selectedTokenId - the useEffect hook will also ensure it's set correctly
            // Set it synchronously here, and useEffect will handle any edge cases
            setSelectedTokenId(tokenId);
            // Restore userLeadId if it exists (when token panel entry came from userLead)
            // First check saved userLeadId, then check entry itself
            const savedUserLeadId = pendingReg.userLeadId;
            const entryUserLeadId = (entry as any).userLeadId;
            const finalUserLeadId = (savedUserLeadId !== null && savedUserLeadId !== undefined)
                ? savedUserLeadId
                : (entryUserLeadId !== null && entryUserLeadId !== undefined 
                    ? (typeof entryUserLeadId === 'number' ? entryUserLeadId : parseInt(String(entryUserLeadId), 10))
                    : null);
            
            if (finalUserLeadId !== null && finalUserLeadId !== undefined && !isNaN(finalUserLeadId)) {
                setIsUserLeadData(true);
                setUserLeadId(finalUserLeadId);
            } else {
                setIsUserLeadData(false);
                setUserLeadId(null);
            }
        } else {
            // Clear flags if not a revisited, userLead, or token-panel patient
            setIsRevisitedPatient(false);
            setIsUserLeadData(false);
            setUserLeadId(null);
            setPatientUhid("");
            setPatientRegistrationId(null);
            setSelectedRevisitedPatientData(null);
            setSelectedPatientEntry(null);
            setPatientEntryId(null);
            setSelectedTokenId(null);
        }
        
        // Clear pre-booking selection when loading pending registration
        setSelectedPreBookingId(null);
    };

    // Handle clicking on approved duplicate exception patient button
    const handleLoadApprovedPatient = useCallback((patient: DuplicateExceptionPatient) => {
        if (patient.status !== "approved") return; // Only handle approved patients

        // Auto-fill patient name and contact number
        formik.setFieldValue("patientName", patient.patientName, false);
        formik.setFieldValue("contactNumber", patient.contactNo, false);

        // Set as selected approved patient
        setSelectedApprovedPatientId(patient.id);

        // Clear pending registration selection
        setCurrentPendingRegistrationId(null);

        // Reset to first step
        setCurrentStep(0);
    }, [formik]);

    // Helper function to convert Formik errors to flat structure for components
    const getFormErrors = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        Object.keys(formik.errors).forEach((key) => {
            const error = formik.errors[key as keyof typeof formik.errors];
            const touched = formik.touched[key as keyof typeof formik.touched];
            if (touched && typeof error === "string") {
                errors[key] = error;
            }
        });
        // Persist gate entry error regardless of Formik validation state
        if (gateEntryRequired) {
            errors["contactNumber"] = "Please complete the gate entry process first. Direct patient registration requires a token assignment from the gate entry system.";
        }
        return errors;
    };

    // Function to scroll to first error field
    const scrollToFirstError = () => {
        const errors = getFormErrors();
        if (Object.keys(errors).length === 0) return;

        const firstErrorKey = Object.keys(errors)[0];
        const element = document.querySelector(`[data-field="${firstErrorKey}"]`);
        if (element instanceof HTMLElement) {
            setTimeout(() => {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                    element.focus();
                } else {
                    const triggerButton = element.querySelector('button[type="button"]');
                    if (triggerButton instanceof HTMLElement) {
                        setTimeout(() => {
                            triggerButton.focus();
                        }, 150);
                    }
                }
            }, 100);
        }
    };

    // Generate patient buttons from pending registrations
    // Filter by current form type
    const filteredPendingRegistrations = pendingRegistrations.filter(reg => reg.formType === formType);
    const pendingRegistrationButtons = filteredPendingRegistrations.map(reg => {
        const isActive = currentPendingRegistrationId === reg.id;
        return {
            id: reg.id,
            name: reg.patientName,
            type: "pending" as const,
            iconSrc: "/icons/ProfileDarkIcon.svg",
            bgColor: isActive ? "bg-[rgba(11,140,0,0.35)]" : "bg-[rgba(11,140,0,0.15)]",
            borderColor: "border-[#0B8C00]",
            textColor: "text-[#0B8C00]",
            isActive: isActive,
            registration: reg,
        };
    });

    return (
        <AppShell>
            <div className="flex justify-between items-center">
                <div ref={registrationHeadingRef} className="prebooking-icon flex items-center gap-3 mb-6" >
                    <Tooltip
                        content="Token"
                        position="right"
                        delay={0}
                    >
                        <button onClick={() => setIsPreBookingOpen(!isPreBookingOpen)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            aria-label="Toggle Token Panel"
                        >

                            <Image src="/icons/prebookingtoggle.svg" alt="Token Icon" width={32} height={32} />
                        </button>
                    </Tooltip>

                    <PageHeading title="Registration" />
                </div>
                <div>
                    <div className="pending_registration flex items-center gap-4">
                        {/* Duplicate exception patient buttons (orange/green/red style based on status) */}
                        {duplicateExceptionPatients.map((patient) => {
                            const status = patient.status || "pending";
                            const isApproved = status === "approved";
                            const isRejected = status === "rejected";
                            const isPending = status === "pending";

                            // Determine colors and tooltip based on status
                            const borderColor = isApproved ? "border-[#0B8C00]" : isRejected ? "border-[#EF4444]" : "border-[#F59E0B]";
                            const isSelected = selectedApprovedPatientId === patient.id;
                            // If selected and approved, use the special background and text colors
                            const bgColor = isSelected && isApproved ? "bg-[rgba(11,140,0,0.35)]" : isApproved ? "bg-[rgba(11,140,0,0.15)]" : isRejected ? "bg-[rgba(239,68,68,0.15)]" : "bg-[#FFF4D126]";
                            const textColor = isSelected && isApproved ? "text-[#0B8C00]" : isApproved ? "text-[#0B8C00]" : isRejected ? "text-[#EF4444]" : "text-[#A56A00]";
                            const dotColor = isApproved ? "bg-[#0B8C00]" : isRejected ? "bg-[#EF4444]" : "bg-[#F4A100]";
                            const dotShadow = isApproved ? "shadow-[0_0_4px_rgba(11,140,0,0.5)]" : isRejected ? "shadow-[0_0_4px_rgba(239,68,68,0.5)]" : "shadow-[0_0_4px_rgba(244,161,0,0.5)]";
                            const tooltipText = isApproved ? "Approved" : isRejected ? "Rejected" : "Pending";
                            const hoverBg = isApproved ? "hover:bg-[rgba(11,140,0,0.2)]" : isRejected ? "hover:bg-[rgba(239,68,68,0.2)]" : "hover:bg-[rgba(245,158,11,0.2)]";
                            // Use ProfileIconBrown.svg for approved status, ProfileDarkIcon.svg for others
                            const iconSrc = isApproved ? "/icons/ProfileDarkIcon.svg" : "/icons/ProfileIconBrown.svg";
                            const buttonClasses = `py-3 px-6 ${borderColor} border-[1px] ${bgColor} rounded-[16px] flex items-center gap-2 h-[48px] cursor-pointer transition-all duration-300 ${hoverBg} hover:opacity-80 relative ${isSelected && isApproved ? "animate-[pulse-border_2s_ease-in-out_infinite]" : ""
                                }`;

                            return (
                                <button
                                    key={patient.id}
                                    onClick={() => {
                                        if (isApproved) {
                                            handleLoadApprovedPatient(patient);
                                        }
                                    }}
                                    className={buttonClasses}
                                >
                                    <Image src={iconSrc} alt="Patient Icon" width={32} height={32} />
                                    <span className={`font-[Inter] font-medium text-sm leading-[120%] text-center ${textColor}`}>
                                        {patient.patientName}
                                    </span>
                                    {/* Status indicator dot with tooltip */}
                                    <Tooltip
                                        content={tooltipText}
                                        position="top"
                                        className="absolute top-[-4px] right-3"
                                        delay={0}
                                    >
                                        <div className={`w-2 h-2 ${dotColor} rounded-full ${dotShadow} cursor-pointer`}></div>
                                    </Tooltip>
                                </button>
                            );
                        })}

                        {/* Pending registration buttons */}
                        {pendingRegistrationButtons.map((patient) => (
                            <button
                                key={patient.id}
                                onClick={() => handleLoadPendingRegistration(patient.registration)}
                                className={`py-3 px-6 ${patient.bgColor} ${patient.borderColor} border-[1px] rounded-[16px] flex items-center gap-2 h-[48px] cursor-pointer transition-all duration-300 ${patient.isActive
                                        ? "hover:bg-[rgba(27, 179, 14, 0.4)] scale-[1.02]"
                                        : "hover:opacity-80 hover:bg-[rgba(11,140,0,0.2)]"
                                    }`}
                                style={patient.isActive ? {
                                    animation: 'pulse-border 2s ease-in-out infinite'
                                } : {}}
                            >
                                <Image src={patient.iconSrc} alt="Patient Icon" width={32} height={32} />
                                <span className={`font-[Inter] font-medium text-sm leading-[120%] text-center ${patient.textColor}`}>
                                    {patient.name}
                                </span>
                            </button>
                        ))}
                        {/* Add New Patient button */}
                        <button
                            onClick={handleAddNewPatient}
                            className="flex flex-row justify-center items-center py-3 px-6 gap-1 h-[48px] border border-[#0B8C00] rounded-[32px] cursor-pointer hover:bg-[#0B8C00]/10 transition-colors"
                        >
                            <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00]">Add New Patient</span>
                        </button>
                        {/* View List button */}
                        <Link
                            href="/registration/registrationList"
                            className="flex flex-row justify-center items-center py-3 px-6 gap-2 h-[48px]  border border-[#0B8C00] rounded-[16px] cursor-pointer hover:bg-[#F2F8F2] transition-all duration-300"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0B8C00"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="shrink-0"
                            >
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00]">View List</span>
                        </Link>
                    </div>
                </div>
            </div>
            <div className="flex gap-4 h-screen">
                {/* Token Panel */}
                {isPreBookingOpen && (
                    <div className="w-[20%] transition-all duration-0 ease-in-out flex-shrink-0">
                        <TokenPanel
                            onTokenClick={handleTokenClick}
                            selectedTokenId={selectedTokenId}
                            onRefetchReady={(refetch) => {
                                refetchTokenListRef.current = refetch;
                            }}
                            tokenSearchValue={tokenPanelSearch}
                        />
                    </div>
                )}

                {/* Registration Steps and Forms */}
                <div
                    ref={formsContainerRef}
                    data-form-container
                    className={`transition-all duration-0 ease-in-out ${isPreBookingOpen ? 'w-[60%]' : 'w-[80%]'}`}
                >
                    <RegistrationSteps steps={registrationSteps} currentStep={currentStep} />

                    {/* Conditional rendering based on current step */}
                    {currentStep === 0 && (
                        <PersonalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            scrollToFirstError={scrollToFirstError}
                            onNext={handleNextStep}
                            sourceOptions={sourceOptions}
                            tvSpecificFieldOptions={tvSpecificFieldOptions}
                            newspaperSpecificFieldOptions={newspaperSpecificFieldOptions}
                            socialMediaSpecificFieldOptions={socialMediaSpecificFieldOptions}
                            onContactNumberChange={handleContactNumberChange}
                            onAadharCardNumberChange={(value) => checkExistingAadharCard(value)}
                            onReferralMobileChange={handleReferralMobileChange}
                            readOnlyFields={
                                // For userLead data, make contactNumber and patientName read-only
                                isUserLeadData
                                    ? (formik.values.aadharCardNumber && formik.values.aadharCardNumber.trim() !== ""
                                        ? ["patientName", "contactNumber", "patientNameSelect", "aadharCardNumber"]
                                        : ["patientName", "contactNumber", "patientNameSelect"])
                                    : (selectedPreBookingId || selectedTokenId || isRevisitedPatient 
                                        ? (formik.values.aadharCardNumber && formik.values.aadharCardNumber.trim() !== ""
                                            ? ["patientName", "contactNumber", "patientNameSelect", "aadharCardNumber"]
                                            : ["patientName", "contactNumber", "patientNameSelect"])
                                        : (selectedApprovedPatientId 
                                            ? ["patientName", "contactNumber", "patientNameSelect"] 
                                            : []))
                                    .concat(
                                        // Always disable referralName when a patient is selected
                                        selectedReferralPatient 
                                            ? ["referralName", "referralMobile"] 
                                            : (referralPatientsDialogOpen ? ["referralMobile"] : [])
                                    )
                            }
                            isNextDisabled={gateEntryRequired || isAwaitingTokenSelection}
                            hideReferral={!!patientUhid && patientUhid.trim() !== ""}
                            isContactLoading={isContactLoading}
                            isReferralMobileLoading={isReferralMobileLoading} />
                    )}

                    {currentStep === 1 && (
                        <PaymentForm
                            preBookingId={selectedPreBookingId}
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onNext={handleHospitalRegistrationComplete}
                            onBack={handleBackSteps}
                            isHospitalRegistration={true}
                            patientToken={patientToken}
                            patientEntryId={patientEntryId}
                            patientUhid={patientUhid}
                            patientRegistrationId={patientRegistrationId}
                            userLeadId={userLeadId}
                            selectedReferralPatientId={selectedReferralPatient?.id || null}
                        />
                    )}
                </div>

                <div className="w-[20%]">
                    <JSHealthCardPoints />
                    <PatientOldHistory />
                    <Vouchers />
                </div>
            </div>

            {/* Success Dialog for Hospital Registration */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => {
                    setShowSuccessDialog(false);
                    handleResetAfterSuccess();
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message="Registration completed successfully!"
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowSuccessDialog(false);
                    handleResetAfterSuccess();
                }}
            />

            {/* Patient Already Exists Dialog */}
            <PatientAlreadyExistsDialog
                open={patientExistsDialogOpen}
                onClose={handlePatientExistsDialogClose}
                existingPatients={existingPatients}
                onRevisit={handleRevisit}
                onAddNewMember={handleAddNewMember}
                isUserLeadData={isUserLeadData}
                disableRevisit={true}
                revisitTooltipText="Please complete the gate entry process first. Direct patient registration requires a token assignment from the gate entry system."
            />

            {/* Duplicate Number Exception Dialog */}
            <DuplicateNumberExceptionDialog
                open={duplicateExceptionDialogOpen}
                onClose={handleDuplicateExceptionDialogClose}
                onSubmit={handleDuplicateExceptionSubmit}
                isLoading={isCreatingException}
            />

            {/* Referral Patients Dialog */}
            <ReferralPatientsDialog
                open={referralPatientsDialogOpen}
                onClose={handleCloseReferralPatientsDialog}
                referralPatients={referralPatients}
                onSelect={handleReferralPatientSelect}
                phoneNumber={selectedReferralPhoneNumber}
            />

            {/* Success Dialog for Duplicate Permission */}
            <MessageDialog
                open={showDuplicateSuccessDialog}
                onClose={() => setShowDuplicateSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={duplicateSuccessMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowDuplicateSuccessDialog(false)}
            />

            {/* Error Dialog for Duplicate Permission */}
            <MessageDialog
                open={showDuplicateErrorDialog}
                onClose={() => setShowDuplicateErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={duplicateErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowDuplicateErrorDialog(false)}
            />

            {/* Duplicate pending registration dialog */}
            <MessageDialog
                open={showDuplicatePendingDialog}
                onClose={() => setShowDuplicatePendingDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message="Patient details already saved as pending registration."
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowDuplicatePendingDialog(false)}
            />
        </AppShell>
    );
}
