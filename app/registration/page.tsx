"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useFormik } from "formik";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import Image from "next/image";
import PreBookingPanel from "@/components/registration/PreBookingPanel";
import { type PreBookingItem } from "@/store/api/registrationApi";
import RegistrationSteps from "@/components/registration/RegistrationSteps";
import JSHealthCardPoints from "@/components/registration/JSHealthCardPoints";
import PatientOldHistory from "@/components/registration/PatientOldHistory";
import Vouchers from "@/components/registration/Vouchers";
import { registrationPersonalDetailsSchema, type RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import PersonalForm from "./personal";
import PaymentForm from "./payment";
import VitalForm from "./vital";
import MedicalForm from "./medical";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { useAppSelector } from "@/store/hooks";
import { selectUserId, selectUserBranchId } from "@/store/slices/authSlice";
import { useCreateClinicPatientMutation, useCreateAppointmentAndUpdateRegistrationMutation, type ClinicPatientRequest, type CreateAppointmentAndUpdateRegistrationRequest, useRequestDuplicateNumberPermissionMutation } from "@/store/api/registrationApi";
import { useGetStatesQuery, useGetCitiesQuery, useGetCountriesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery } from "@/store/api/publicApi";
import { useGetDoctorsQuery } from "@/store/api/registrationApi";
import { useGetPanelsQuery } from "@/store/api/settingsApi";
import { usePathname } from "next/navigation";
import { registrationApi } from "@/store/api/registrationApi";
import type { ExistingPatient } from "@/store/api/gateApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { MessageDialog, Tooltip } from "@/components/ui";
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
    // Fields for Pre Booking panel scenario (pre-bookings-list API)
    isFromPreBooking?: boolean; // Flag to identify if this is from Pre Booking panel selection
    preBookingData?: PreBookingItem; // Full pre-booking object from pre-bookings-list API
    preBookingId?: number | string | null; // Pre-booking ID for payload when submitting
}

// Interface for duplicate exception patient
interface DuplicateExceptionPatient {
    id: string;
    patientName: string;
    contactNo: string; // The duplicate contact number from the payload
    savedAt: string;
    status: "pending" | "approved" | "rejected"; // Status of the duplicate exception request
}

export default function RegistrationPage() {
    const pathname = usePathname();
    const formType: "clinic" | "hospital" = pathname?.includes("/hospital") ? "hospital" : "clinic";
    const [currentStep, setCurrentStep] = useState(0); // 0-based index, 0 = Step 01 (Personal Info)
    const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
    const [currentPendingRegistrationId, setCurrentPendingRegistrationId] = useState<string | null>(null); // Track which pending registration is currently loaded
    const [isPreBookingOpen, setIsPreBookingOpen] = useState(false); // Pre Booking panel state (closed by default)
    const [selectedPreBookingId, setSelectedPreBookingId] = useState<string | number | null>(null); // Track which pre-booking is selected
    const [selectedPreBooking, setSelectedPreBooking] = useState<PreBookingItem | null>(null); // Store selected pre-booking data
    const refetchPreBookingsListRef = useRef<(() => void) | null>(null); // Ref to store pre-bookings refetch function

    // Patient exists dialog state
    const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
    const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
    const [isUserLeadData, setIsUserLeadData] = useState(false); // User Lead Data from registrations-and-pre-bookings (show "User Lead Data" + Visit, send userLeadId in clinic-patient)
    const [userLeadId, setUserLeadId] = useState<number | null>(null);
    const isClosingDialogRef = useRef(false);
    const lastCheckedContactNumberRef = useRef<string>("");
    const lastCheckedAadharCardRef = useRef<string>(""); // Track last checked Aadhar Card to prevent duplicate calls
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const selectedPatientAddressRef = useRef<{ countryName?: string; stateName?: string; cityName?: string; pinCode?: string; tehsil?: string; area?: string } | null>(null);

    // Referral patients dialog state
    const [referralPatientsDialogOpen, setReferralPatientsDialogOpen] = useState(false);
    const [referralPatients, setReferralPatients] = useState<ReferralPatient[]>([]);
    const [selectedReferralPhoneNumber, setSelectedReferralPhoneNumber] = useState<string>("");
    const [selectedReferralPatient, setSelectedReferralPatient] = useState<ReferralPatient | null>(null);
    const lastCheckedReferralMobileRef = useRef<string>("");
    const referralPatientSelectedRef = useRef<boolean>(false);

    // Loading state for contact number API check
    const [isContactLoading, setIsContactLoading] = useState(false);

    // Loading state for referral mobile API check
    const [isReferralMobileLoading, setIsReferralMobileLoading] = useState(false);

    // Duplicate number exception dialog state
    const [duplicateExceptionDialogOpen, setDuplicateExceptionDialogOpen] = useState(false);

    // Success and error dialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Dialog state for duplicate pending registration (same contactNumber + patientName already saved)
    const [showDuplicatePendingDialog, setShowDuplicatePendingDialog] = useState(false);

    // Duplicate exception patients state
    const [duplicateExceptionPatients, setDuplicateExceptionPatients] = useState<DuplicateExceptionPatient[]>([]);
    const [selectedApprovedPatientId, setSelectedApprovedPatientId] = useState<string | null>(null);

    // Track if patient is revisited (from Patient Already Exists dialog)
    const [isRevisitedPatient, setIsRevisitedPatient] = useState(false);
    const [patientUhid, setPatientUhid] = useState<string>(""); // Store patient UHID from existing patient
    const [patientRegistrationId, setPatientRegistrationId] = useState<number | null>(null); // Store registration ID from existing patient
    // Store the selected patient data from API response for pending registration
    const [selectedRevisitedPatientData, setSelectedRevisitedPatientData] = useState<ExistingPatient | null>(null);

    // Get branchId and userId from auth state
    const branchId = useAppSelector(selectUserBranchId) || 1; // Default to 1 if not available
    const userId = useAppSelector(selectUserId) || 1;

    // Lazy query for checking existing patients
    const [checkExistingPatientsQuery] = registrationApi.useLazyCheckExistingPatientsByPhoneQuery();
    
    // Lazy query for checking referral patients by phone
    const [checkReferralPatientsQuery] = registrationApi.useLazyGetAllRegistrationForReferralByPhoneQuery();

    // Mutation for requesting duplicate number permission
    const [requestDuplicateNumberPermission, { isLoading: isCreatingException }] = useRequestDuplicateNumberPermissionMutation();

    // API mutation for clinic patient registration
    const [createClinicPatient, { isLoading: isSubmitting }] = useCreateClinicPatientMutation();
    const [createAppointmentAndUpdateRegistration, { isLoading: isUpdatingRegistration }] = useCreateAppointmentAndUpdateRegistrationMutation();

    // Container ref for arrow key navigation (wraps all form steps)
    const formsContainerRef = useRef<HTMLDivElement>(null);
    
    // Ref for the Registration heading to scroll to when steps change
    const registrationHeadingRef = useRef<HTMLDivElement>(null);

    // Enable arrow key navigation for form fields
    // Use the container ref to find all form fields across all steps
    useArrowKeyNavigation(formsContainerRef, true, (fieldName) => {
        // Validate the field when navigating to it
        formik.setFieldTouched(fieldName as keyof RegistrationPersonalDetailsFormValues, true, false);
        formik.validateField(fieldName);
    });

    const registrationSteps = [
        { number: "Step 01", label: "Personal" },
        { number: "Step 02", label: "Payment" },
        { number: "Step 03", label: "Vitals" },
        { number: "Step 04", label: "Medical" },
    ];

    // Source options for Referral component
    const sourceOptions: SelectOption[] = [
        { value: "tv", label: "TV" },
        { value: "newspaper", label: "NewsPaper" },
        { value: "social-media", label: "Social Media" },
        { value: "doctor", label: "Doctor" },
        { value: "patient", label: "Referral" },
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
            // Default old registrations to "clinic" (4-step form) - they were likely created on this page
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
            // Get patient name for identification
            const patientName = formData.patientName?.trim() || "";

            // Don't save if patient name is empty or "Unknown Patient"
            if (!patientName || patientName.toLowerCase() === "unknown patient") {
                return;
            }

            // Use only the patient name for button display
            const displayName = patientName;

            // Get existing pending registrations
            const existing = getPendingRegistrations();

            let updated: PendingRegistration[];

            // If we have an existing ID (updating an existing pending registration)
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
                    // Update existing registration instead of creating duplicate
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
                    // Generate unique ID for new registration
                    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                    const pendingRegistration: PendingRegistration = {
                        id,
                        patientName: displayName,
                        formData,
                        currentStep: step,
                        savedAt: new Date().toISOString(),
                        formType: formType,
                    };

                    // Add new pending registration
                    updated = [...existing, pendingRegistration];
                }
            }

            // Save to localStorage
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

    // LocalStorage functions for duplicate exception patients (clinic only)
    const getDuplicateExceptionPatients = useCallback((): DuplicateExceptionPatient[] => {
        if (typeof window === "undefined") return [];

        try {
            const stored = localStorage.getItem(DUPLICATE_EXCEPTION_PATIENTS_CLINIC_KEY);
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
                localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_CLINIC_KEY, JSON.stringify(updated));
                setDuplicateExceptionPatients(updated);
            }
        } catch (error) {
            console.error("Failed to save duplicate exception patient:", error);
        }
    }, [getDuplicateExceptionPatients]);

    // Remove duplicate exception patient from localStorage (clinic only)
    const removeDuplicateExceptionPatient = useCallback((patientId: string) => {
        if (typeof window === "undefined" || formType !== "clinic") return;

        try {
            const existing = getDuplicateExceptionPatients();
            const updated = existing.filter(patient => patient.id !== patientId);
            localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_CLINIC_KEY, JSON.stringify(updated));
            setDuplicateExceptionPatients(updated);
            console.log(`[Clinic Registration] ✅ Removed duplicate exception patient with ID: ${patientId}`);
        } catch (error) {
            console.error("[Clinic Registration] Failed to remove duplicate exception patient:", error);
        }
    }, [getDuplicateExceptionPatients, formType]);

    // Update duplicate exception patient status in localStorage (clinic only)
    const updateDuplicateExceptionPatientStatus = useCallback((contactNo: string, patientName: string, status: "approved" | "rejected") => {
        if (typeof window === "undefined" || formType !== "clinic") return;

        try {
            const existing = getDuplicateExceptionPatients();
            console.log(`[Clinic Registration] Looking for patient: "${patientName}" (${contactNo}) with status: ${status}`);
            console.log(`[Clinic Registration] Existing patients in localStorage:`, existing);

            const normalizedContactNo = contactNo.trim();
            const normalizedPatientName = patientName.trim();
            const normalizedStatus = status.toLowerCase() as "approved" | "rejected" | "pending";

            const updated = existing.map(patient => {
                // Match by contact number and patient name (case-insensitive comparison)
                const patientContactNo = patient.contactNo.trim();
                const patientNameTrimmed = patient.patientName.trim();

                if (patientContactNo === normalizedContactNo &&
                    patientNameTrimmed.toLowerCase() === normalizedPatientName.toLowerCase()) {
                    console.log(`[Clinic Registration] ✅ Match found! Updating patient status: ${patient.patientName} (${patient.contactNo}) -> ${normalizedStatus}`);
                    return { ...patient, status: normalizedStatus };
                }
                return patient;
            });

            // Check if any patient was updated
            const wasUpdated = updated.some((patient, index) => {
                return patient.status !== existing[index]?.status;
            });

            if (wasUpdated) {
                localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_CLINIC_KEY, JSON.stringify(updated));
                // Force state update by creating a new array reference
                setDuplicateExceptionPatients([...updated]);
                console.log(`[Clinic Registration] ✅ Status updated successfully. New state:`, updated);
            } else {
                console.warn(`[Clinic Registration] ❌ No matching patient found for: "${normalizedPatientName}" (${normalizedContactNo})`);
                console.log(`[Clinic Registration] Existing patients for comparison:`, existing.map(p => ({ name: p.patientName, contact: p.contactNo, status: p.status })));
            }
        } catch (error) {
            console.error("[Clinic Registration] Failed to update duplicate exception patient status:", error);
        }
    }, [getDuplicateExceptionPatients, formType]);

    // Get socket hook
    const { onDuplicateNumberPermissionUpdate } = useSocket();

    // Load pending registrations on mount - filter by current form type
    useEffect(() => {
        const pending = getPendingRegistrations();
        const filtered = pending.filter(reg => reg.formType === formType);
        setPendingRegistrations(filtered);

        // Load duplicate exception patients (clinic only) - status is already validated in getDuplicateExceptionPatients
        if (formType === "clinic") {
            const duplicatePatients = getDuplicateExceptionPatients();
            setDuplicateExceptionPatients(duplicatePatients);
        }
    }, [getPendingRegistrations, getDuplicateExceptionPatients, formType]);

    // Listen for duplicate number permission updates via socket (clinic only)
    useEffect(() => {
        if (formType !== "clinic") return;

        const unsubscribe = onDuplicateNumberPermissionUpdate((socketData: any) => {
            console.log("[Clinic Registration] Duplicate number permission update received:", socketData);
            // Socket data structure: { message: "...", data: { contactNo, patientName, status, ... } }
            // Extract the nested data object
            const data = socketData?.data || socketData;
            console.log("[Clinic Registration] Extracted data:", data);

            // Check if we have the required fields
            if (data?.contactNo && data?.patientName && data?.status) {
                // Convert status to lowercase (socket sends "APPROVED"/"REJECTED", we need "approved"/"rejected")
                const normalizedStatus = data.status.toLowerCase();
                console.log("[Clinic Registration] Normalized status:", normalizedStatus);
                console.log("[Clinic Registration] Full socket data:", JSON.stringify(socketData, null, 2));

                if (normalizedStatus === "approved" || normalizedStatus === "rejected") {
                    console.log("[Clinic Registration] Updating status for:", data.patientName, data.contactNo, "->", normalizedStatus);
                    updateDuplicateExceptionPatientStatus(data.contactNo, data.patientName, normalizedStatus as "approved" | "rejected");
                } else {
                    console.warn("[Clinic Registration] Invalid status received:", normalizedStatus);
                }
            } else {
                console.warn("[Clinic Registration] Missing required fields in socket data:", data);
                console.log("[Clinic Registration] Full socket data structure:", JSON.stringify(socketData, null, 2));
            }
        });
        return unsubscribe;
    }, [formType, onDuplicateNumberPermissionUpdate, updateDuplicateExceptionPatientStatus]);

    // Listen for custom event when localStorage is updated from another page (e.g., Notification component) - clinic only
    useEffect(() => {
        if (formType !== "clinic") return;

        const handleStatusUpdate = (event: CustomEvent) => {
            const { type } = event.detail || {};
            // Only reload if the update is for clinic type
            if (type === "clinic") {
                // Reload from localStorage to get the updated status
                const duplicatePatients = getDuplicateExceptionPatients();
                setDuplicateExceptionPatients(duplicatePatients);
            }
        };

        window.addEventListener('duplicateExceptionPatientStatusUpdated' as any, handleStatusUpdate as EventListener);
        return () => {
            window.removeEventListener('duplicateExceptionPatientStatusUpdated' as any, handleStatusUpdate as EventListener);
        };
    }, [formType, getDuplicateExceptionPatients]);

    // Listen for visibility change to reload when page becomes visible (fallback) - clinic only
    useEffect(() => {
        if (formType !== "clinic") return;

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
    }, [formType, getDuplicateExceptionPatients]);

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
            console.log("Form submitted:", values);
            // Handle form submission here
        },
    });

    // Fetch states and cities data to get names from IDs
    const { data: statesData } = useGetStatesQuery(
        formik.values.country
            ? { countryId: formik.values.country }
            : undefined,
        { skip: !formik.values.country }
    );

    const { data: citiesData } = useGetCitiesQuery(
        formik.values.state
            ? { stateId: formik.values.state }
            : undefined,
        { skip: !formik.values.state }
    );
    
    // Lazy queries for tehsils and areas - fetch during form submission
    const [getTehsilsQuery] = useLazyGetTehsilsQuery();
    const [getAreasQuery] = useLazyGetAreasQuery();

    // Fetch doctors and panels for matching when patient is selected
    const { data: doctorsData } = useGetDoctorsQuery();
    const { data: panelsData } = useGetPanelsQuery(
        formik.values.patientType?.toLowerCase() === "panel" ? { page: 1, limit: 100 } : undefined,
        { skip: formik.values.patientType?.toLowerCase() !== "panel" }
    );

    // Fetch billing states by country from Personal Info (Address)
    const billingCountryId = formik.values.country && formik.values.country.trim() !== "" ? formik.values.country : "6";
    const { data: billingStatesData } = useGetStatesQuery(
        { countryId: billingCountryId },
        { skip: !billingCountryId }
    );

    const { data: billingCitiesData } = useGetCitiesQuery(
        formik.values.billingState
            ? { stateId: formik.values.billingState }
            : undefined,
        { skip: !formik.values.billingState }
    );

    // Fetch countries data for pre-booking form pre-fill
    const { data: countriesData } = useGetCountriesQuery();

    // Handle pre-booking click - pre-fill form with pre-booking data
    const handlePreBookingClick = useCallback((preBooking: PreBookingItem | null) => {
        if (!preBooking) {
            // If null, clear the form and deselect
            formik.resetForm();
            setSelectedPreBookingId(null);
            setSelectedPreBooking(null);
            setCurrentPendingRegistrationId(null); // Un-highlight top stored patient name
            return;
        }

        const preBookingId = preBooking.id ? String(preBooking.id) : null;

        // If clicking the same pre-booking again, clear the form
        if (selectedPreBookingId !== null && String(selectedPreBookingId) === preBookingId) {
            formik.resetForm();
            setSelectedPreBookingId(null);
            setSelectedPreBooking(null);
            setPatientUhid(""); // Clear patient UHID
            setPatientRegistrationId(null); // Clear registration ID
            setIsRevisitedPatient(false); // Clear revisited state
            setSelectedRevisitedPatientData(null); // Clear selected patient data
            setCurrentPendingRegistrationId(null); // Un-highlight top stored patient name
            return;
        }

        // Reset form before loading new data
        formik.resetForm();
        // Un-highlight top stored patient name when switching to a different patient from Pre Booking list
        setCurrentPendingRegistrationId(null);
        // Clear revisited patient flags when selecting pre-booking
        setIsRevisitedPatient(false);
        setPatientRegistrationId(null);
        setSelectedRevisitedPatientData(null);
        // Set patient UHID if available from pre-booking
        if (preBooking.uhid) {
            setPatientUhid(preBooking.uhid);
        } else {
            setPatientUhid("");
        }
        // Set the selected pre-booking to trigger form pre-fill
        setSelectedPreBooking(preBooking);
        // Set selected pre-booking ID for highlighting
        setSelectedPreBookingId(preBookingId);
        setCurrentStep(0); // Reset to first step
    }, [formik, selectedPreBookingId]);

    // Pre-fill form when pre-booking is selected
    useEffect(() => {
        if (selectedPreBooking) {
            const preBooking = selectedPreBooking;

            // Clear revisited patient flags when pre-booking is selected
            setIsRevisitedPatient(false);
            setPatientRegistrationId(null);
            setSelectedRevisitedPatientData(null);
            // Set patient UHID if available from pre-booking
            if (preBooking.uhid) {
                setPatientUhid(preBooking.uhid);
            } else {
                setPatientUhid("");
            }

            // Pre-fill form fields immediately
            const formUpdates: Partial<RegistrationPersonalDetailsFormValues> = {
                contactNumber: (typeof preBooking.contactNumber === 'string') ? preBooking.contactNumber : "",
                whatsappNo: (typeof preBooking.whatsappNumber === 'string' && preBooking.whatsappNumber) ? preBooking.whatsappNumber : (typeof preBooking.contactNumber === 'string') ? preBooking.contactNumber : "",
                patientName: (typeof preBooking.patientName === 'string') ? preBooking.patientName : "",
                age: (typeof preBooking.age === 'string') ? preBooking.age : "",
                emailAddress: (typeof preBooking.emailAddress === 'string') ? preBooking.emailAddress : "",
                pinCode: (typeof preBooking.pinCode === 'string') ? preBooking.pinCode : "",
                address: (typeof preBooking.address === 'string') ? preBooking.address : "",
                gender: (preBooking.gender && typeof preBooking.gender === 'string') ? preBooking.gender.toLowerCase() : "",
                maritalStatus: (preBooking.maritalStatus && typeof preBooking.maritalStatus === 'string') ? preBooking.maritalStatus.toLowerCase() : "",
                fathersHusbandsName: (typeof preBooking.guardianName === 'string') ? preBooking.guardianName : "",
                occupation: (typeof preBooking.occupation === 'string') ? preBooking.occupation : "",
                appointmentDate: (typeof preBooking.appointmentDate === 'string') ? preBooking.appointmentDate : "",
                timeSlot: (typeof preBooking.appointmentTime === 'string') ? preBooking.appointmentTime : ((typeof preBooking.timeSlot === 'string') ? preBooking.timeSlot : ""),
                patientType: (preBooking.patientType && typeof preBooking.patientType === 'string')
                    ? (preBooking.patientType.toUpperCase() === "NORMAL" ? "private" : preBooking.patientType.toLowerCase())
                    : "",
                patientSubType: (typeof preBooking.patientSubType === 'string') ? preBooking.patientSubType : "",
                benificiaryId: (typeof preBooking.benificiaryId === 'string') ? preBooking.benificiaryId : "",
                insuranceCompany: (typeof preBooking.insuranceCompany === 'string') ? preBooking.insuranceCompany : "",
                ayushCovered: (typeof preBooking.ayushCovered === 'string') ? preBooking.ayushCovered : "",
                consultationCharges: (typeof preBooking.consultationFee === 'string') ? preBooking.consultationFee : "",
                // Vitals fields
                heightFeet: (typeof preBooking.height === 'string' && preBooking.height) ? Math.floor(parseInt(preBooking.height) / 12).toString() : "",
                heightInch: (typeof preBooking.height === 'string' && preBooking.height) ? (parseInt(preBooking.height) % 12).toString() : "",
                weight: (typeof preBooking.weight === 'string') ? preBooking.weight : "",
                bloodGroup: (typeof preBooking.bloodGroup === 'string') ? preBooking.bloodGroup : "",
                allergies: (typeof preBooking.allergies === 'string') ? preBooking.allergies : "",
                surgeries: (typeof preBooking.surgeries === 'string') ? preBooking.surgeries : "",
                dietType: (typeof preBooking.dietType === 'string') ? preBooking.dietType : "",
                // Medical fields
                diagnosis: (typeof preBooking.diagnosis === 'string') ? preBooking.diagnosis : "",
                subDiagnosis: (typeof preBooking.subDiagnosis === 'string') ? preBooking.subDiagnosis : "",
            };

            // Handle addiction field (JSON string array)
            if (typeof preBooking.addiction === 'string' && preBooking.addiction) {
                try {
                    const addictions = JSON.parse(preBooking.addiction);
                    if (Array.isArray(addictions)) {
                        formUpdates.alcohol = addictions.includes("Alcohol");
                        formUpdates.smoking = addictions.includes("Smoking");
                        formUpdates.tobacco = addictions.includes("Tobacco");
                        formUpdates.drugs = addictions.includes("Drugs");
                        // Check for other addictions
                        const otherAddictions = addictions.filter((a: string) =>
                            !["Alcohol", "Smoking", "Tobacco", "Drugs"].includes(a)
                        );
                        if (otherAddictions.length > 0) {
                            formUpdates.addictionOther = true;
                            formUpdates.addictionSpecify = otherAddictions.join(", ");
                        }
                    }
                } catch (e) {
                    // If parsing fails, treat as regular string
                    console.warn("Failed to parse addiction field:", e);
                }
            }

            // Set form values
            Object.keys(formUpdates).forEach((key) => {
                const value = formUpdates[key as keyof typeof formUpdates];
                if (value !== undefined && value !== "") {
                    formik.setFieldValue(key, value, false);
                }
            });

            // Map doctorUserId to doctor field if doctors data is available
            if (preBooking.doctorUserId && doctorsData?.data) {
                const doctorId = typeof preBooking.doctorUserId === 'number'
                    ? preBooking.doctorUserId
                    : parseInt(String(preBooking.doctorUserId), 10);

                const doctor = doctorsData.data.find((d) => d.id === doctorId);
                if (doctor) {
                    formik.setFieldValue("doctor", doctorId.toString(), false);
                }
            }

            // Map country name to ID if countries data is available
            if (preBooking.country && typeof preBooking.country === 'string' && countriesData?.data) {
                const countryName = preBooking.country.toLowerCase();
                const country = countriesData.data.find(
                    (c: any) => c.name.toLowerCase() === countryName
                );
                if (country) {
                    const countryId = country.id.toString();
                    formik.setFieldValue("country", countryId, false);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPreBooking, countriesData]);

    // Map state name to ID when states are loaded (after country is set)
    useEffect(() => {
        if (selectedPreBooking && statesData?.data && formik.values.country && selectedPreBooking.state && typeof selectedPreBooking.state === 'string') {
            const stateName = selectedPreBooking.state.toLowerCase();
            const state = statesData.data.find(
                (s) => s.name.toLowerCase() === stateName
            );
            if (state) {
                const stateId = state.id.toString();
                formik.setFieldValue("state", stateId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPreBooking, statesData, formik.values.country]);

    // Map city name to ID when cities are loaded (after state is set)
    useEffect(() => {
        if (selectedPreBooking && citiesData?.data && formik.values.state && selectedPreBooking.city && typeof selectedPreBooking.city === 'string') {
            const cityName = selectedPreBooking.city.toLowerCase();
            const city = citiesData.data.find(
                (c) => c.name.toLowerCase() === cityName
            );
            if (city) {
                const cityId = city.id.toString();
                formik.setFieldValue("city", cityId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPreBooking, citiesData, formik.values.state]);

    // Helper functions to get country, state and city names from IDs
    const getCountryName = useMemo(() => {
        if (!countriesData?.data || !formik.values.country) return formik.values.country || '';
        const country = countriesData.data.find((c: any) => c.id.toString() === formik.values.country);
        return country?.name || formik.values.country || '';
    }, [countriesData, formik.values.country]);

    const getStateName = useMemo(() => {
        if (!statesData?.data || !formik.values.state) return formik.values.state || '';
        const state = statesData.data.find((s) => s.id.toString() === formik.values.state);
        return state?.name || formik.values.state || '';
    }, [statesData, formik.values.state]);

    const getCityName = useMemo(() => {
        if (!citiesData?.data || !formik.values.city) return formik.values.city || '';
        const city = citiesData.data.find((c) => c.id.toString() === formik.values.city);
        return city?.name || formik.values.city || '';
    }, [citiesData, formik.values.city]);

    // Helper functions to get billing state and city names from IDs
    const getBillingStateName = useMemo(() => {
        if (!billingStatesData?.data || !formik.values.billingState) return formik.values.billingState || '';
        const state = billingStatesData.data.find((s) => s.id.toString() === formik.values.billingState);
        return state?.name || formik.values.billingState || '';
    }, [billingStatesData, formik.values.billingState]);

    const getBillingCityName = useMemo(() => {
        if (!billingCitiesData?.data || !formik.values.billingCity) return formik.values.billingCity || '';
        const city = billingCitiesData.data.find((c) => c.id.toString() === formik.values.billingCity);
        return city?.name || formik.values.billingCity || '';
    }, [billingCitiesData, formik.values.billingCity]);

    // Map state name to ID when states are loaded (after country is set)
    useEffect(() => {
        if (selectedPatientAddressRef.current?.stateName && statesData?.data && formik.values.country) {
            const state = statesData.data.find(
                (s) => s.name.toLowerCase() === selectedPatientAddressRef.current?.stateName?.toLowerCase()
            );
            if (state) {
                const stateId = state.id.toString();
                formik.setFieldValue("state", stateId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientAddressRef.current?.stateName, statesData, formik.values.country]);

    // Map city name to ID when cities are loaded (after state is set)
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

    // Map doctorUserId from pre-booking to doctor field when doctors are loaded
    useEffect(() => {
        if (selectedPreBooking && selectedPreBooking.doctorUserId && doctorsData?.data) {
            const doctorId = typeof selectedPreBooking.doctorUserId === 'number'
                ? selectedPreBooking.doctorUserId
                : parseInt(String(selectedPreBooking.doctorUserId), 10);

            const doctor = doctorsData.data.find((d) => d.id === doctorId);
            if (doctor) {
                formik.setFieldValue("doctor", doctorId.toString(), false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPreBooking, doctorsData]);

    // Clear selected referral patient when referral is set to "no"
    useEffect(() => {
        if (formik.values.referral?.toLowerCase() === "no") {
            setSelectedReferralPatient(null);
            referralPatientSelectedRef.current = false;
        }
    }, [formik.values.referral]);

    // Function to transform form values to clinic-patient API payload
    const mapFormikToClinicPatientPayload = async (): Promise<ClinicPatientRequest> => {
        const values = formik.values;

        // Build referral object for clinic-patient: only required fields per source
        // - Doctor: referralSourceType + doctorUserId only
        // - Referral (patient/other): referralSourceType "patient" + referralRegistrationId + referralName + referralMobile only
        // - TV / NewsPaper / Social Media: referralSourceType + doctorUserId: null + referralSourceInfo only
        let referralObject: ClinicPatientRequest["referral"] = undefined;
        if (values.referral?.toLowerCase() === "yes" && values.source) {
            const sourceLower = values.source?.toLowerCase();
            if (values.source === "doctor" && values.doctorSpecificField) {
                const doctorId = typeof values.doctorSpecificField === 'string' ? parseInt(values.doctorSpecificField, 10) : values.doctorSpecificField;
                referralObject = {
                    referralSourceType: "doctor",
                    doctorUserId: doctorId,
                };
            } else if (sourceLower === "patient" || values.source === "other") {
                referralObject = {
                    referralSourceType: "patient",
                    referralRegistrationId: selectedReferralPatient?.id ? (typeof selectedReferralPatient.id === 'number' ? selectedReferralPatient.id : parseInt(String(selectedReferralPatient.id), 10)) : undefined,
                    referralName: values.referralName || undefined,
                    referralMobile: values.referralMobile || undefined,
                };
            } else {
                // tv | newspaper | social-media
                let referralSourceInfo = "";
                if (values.source === "tv" && values.tvSpecificField) referralSourceInfo = values.tvSpecificField;
                else if (values.source === "newspaper" && values.newspaperSpecificField) referralSourceInfo = values.newspaperSpecificField;
                else if (values.source === "social-media" && values.socialMediaSpecificField) referralSourceInfo = values.socialMediaSpecificField;
                referralObject = {
                    referralSourceType: values.source,
                    doctorUserId: null,
                    referralSourceInfo: referralSourceInfo || undefined,
                };
            }
        }

        // Build addictionType array from form values
        const addictionType: string[] = [];
        if (values.alcohol) addictionType.push("alcohol");
        if (values.smoking) addictionType.push("smoking");
        if (values.tobacco) addictionType.push("tobacco");
        if (values.drugs) addictionType.push("drugs");
        if (values.addictionOther) addictionType.push("others");

        // Set addictionSpecify if "other" is checked and has a value
        const addictionSpecify = values.addictionOther && values.addictionSpecify
            ? values.addictionSpecify
            : undefined;
        
        // Fetch tehsil and area names if IDs are present
        let tehsilName: string | undefined = undefined;
        let areaName: string | undefined = undefined;
        
        const tehsilId = (values as any).tehsil;
        const areaId = (values as any).area;
        
        if (tehsilId && values.city) {
            try {
                const result = await getTehsilsQuery({ districtId: values.city }).unwrap();
                const tehsil = result?.data?.find((t: any) => t.id.toString() === tehsilId);
                tehsilName = tehsil?.name;
            } catch (error) {
                console.error("Error fetching tehsil name:", error);
            }
        }
        
        if (areaId && tehsilId) {
            // Always set areaId from the selected area ID (this is the numeric ID from areas API response)
            // areaId contains the area ID (e.g., 332662) from the areas API
            // Fetch area name for the payload
            try {
                const result = await getAreasQuery({ tehsilId: tehsilId }).unwrap();
                const area = result?.data?.find((a: any) => a.id.toString() === areaId);
                areaName = area?.name;
            } catch (error) {
                console.error("Error fetching area name, but areaId is still set:", error);
                // Even if area name fetch fails, areaId is still set below
                areaName = areaId; // Fallback to ID if name fetch fails
            }
        }

        // Determine preBookingId and isPreBooking based on selected pre-booking
        const preBookingId = selectedPreBooking?.id
            ? (typeof selectedPreBooking.id === 'number'
                ? selectedPreBooking.id
                : parseInt(String(selectedPreBooking.id), 10))
            : undefined;
        const isPreBooking = preBookingId !== undefined && preBookingId !== null;

        // Build the API payload (include userLeadId when flow is User Lead Data – from registrations-and-pre-bookings)
        const payload: ClinicPatientRequest = {
            branchId: branchId,
            patientEntryId: undefined, // Can be added if needed (e.g. token panel)
            ...(userLeadId != null && userLeadId !== undefined ? { userLeadId } : {}),
            patientTitle: values.patientNameSelect || "",
            patientName: values.patientName || "",
            contactNumber: values.contactNumber || "",
            whatsappNo: values.whatsappNo || values.contactNumber || "",
            aadharCardNo: values.aadharCardNumber || undefined,
            guardianTitle: values.fathersHusbandsNameSelect || "",
            guardianName: values.fathersHusbandsName || "",
            gender: values.gender || "",
            age: values.age || "",
            religion: values.religion || "",
            specificRelegion: values.specificReligion || undefined,
            occupation: values.occupation || "",
            emailAddress: values.emailAddress || undefined,
            jsHealthCardNo: values.jsHealthCardNo || undefined,
            ayushCovered: values.ayushCovered || undefined,
            panelId: values.panelId ? parseInt(values.panelId, 10) : undefined,
            benificiaryId: values.benificiaryId || undefined,
            insuranceCompany: values.insuranceCompany || undefined,
            maritalStatus: values.maritalStatus || "",
            isReferral: values.referral?.toLowerCase() === "yes" ? "yes" : "no",
            referral: referralObject,
            doctorUserId: parseInt(values.doctor || "0", 10) || 0,
            patientType: (values.patientType || "").toLowerCase(),
            patientSubType: values.patientSubType ? values.patientSubType : null,
            addictionType: addictionType.length > 0 ? addictionType : undefined,
            addictionSpecify: addictionSpecify,
            appointment: {
                isPreBooked: isPreBooking,
                appointmentDate: values.appointmentDate || "",
                timeSlot: values.timeSlot || "",
                doctorUserId: parseInt(values.doctor || "0", 10) || 0,
                bloodPressure: values.bloodPressure || undefined,
                sugarLevel: values.sugarLevel || undefined,
                temperature: values.temperature || undefined,
                spo2: values.spo2 || undefined,
                pulse: values.pulse || undefined,
                diagnosisId: values.diagnosis ? parseInt(values.diagnosis, 10) : undefined,
                subDiagnosisId: values.subDiagnosis ? parseInt(values.subDiagnosis, 10) : undefined,
                diagnosisSymptoms: values.symptoms || undefined,
                doctorFee: values.consultationCharges || undefined,
                isPreBooking: isPreBooking,
                isDoctorChecked: false,
                isDiabetes: values.diabetes?.toLowerCase() === "yes",
                diabetesRemarks: values.diabetesRemarks || undefined,
                isHypertension: values.htn?.toLowerCase() === "yes",
                hypertensionRemarks: values.htnRemarks || undefined,
                isCad: values.coronaryArteryDisease?.toLowerCase() === "yes",
                cadRemarks: values.coronaryArteryDiseaseRemarks || undefined,
                isThyroid: values.thyroid?.toLowerCase() === "yes",
                thyroidRemarks: values.thyroidRemarks || undefined,
                isMenstrual: values.menstrual?.toLowerCase() === "yes",
                menstrualRemarks: values.menstrualRemarks || undefined,
                preBookingId: preBookingId,
                // lastDayFullDiet: values.lastDayFullDiet || undefined,
                // Calculate height from feet and inches (e.g., 5 feet 8 inches = 5.8)
                
                // height: (() => {
                //     const heightFeet = parseFloat(values.heightFeet) || 0;
                //     const heightInch = parseFloat(values.heightInch) || 0;
                //     if (heightFeet > 0 || heightInch > 0) {
                //         return (heightFeet + (heightInch / 12)).toFixed(1);
                //     }
                //     return undefined;
                // })(),
                // weight: values.weight || undefined,
                // bloodGroup: values.bloodGroup || undefined,
                // dietType: values.dietType || undefined,
            },
            payment: {
                doctorFee: parseFloat(values.consultationCharges || "0") || 0,
                paymentMode: values.paymentMode?.toLowerCase() === "credit" ? "razorpay" : (values.paymentMode?.toLowerCase() === "cash" ? "cash" : (values.paymentMode || "").toLowerCase()),
                transactionId: values.transactionId || undefined,
                serviceId: values.paymentMode?.toLowerCase() === "credit" && values.serviceId ? (typeof values.serviceId === 'number' ? values.serviceId : parseInt(String(values.serviceId), 10)) : undefined,
                razorpayPosPaymentLogId: values.paymentMode?.toLowerCase() === "credit" && values.razorpayPosPaymentLogId ? (typeof values.razorpayPosPaymentLogId === 'number' ? values.razorpayPosPaymentLogId : parseInt(String(values.razorpayPosPaymentLogId), 10)) : undefined,
                gstNumber: values.gstBilling ? (values.gstNumber || undefined) : undefined,
                companyName: values.gstBilling ? (values.companyName || undefined) : undefined,
                billingAddress: values.gstBilling ? (values.billingAddress || undefined) : undefined,
                state: values.gstBilling ? (getBillingStateName === 'N/A' ? undefined : getBillingStateName || undefined) : undefined,
                city: values.gstBilling ? (getBillingCityName === 'N/A' ? undefined : getBillingCityName || undefined) : undefined,
                pincode: values.gstBilling ? (values.billingPincode ? parseInt(values.billingPincode, 10) : undefined) : undefined,
            },
            address: {
                address: values.address || "",
                city: getCityName === 'N/A' ? "" : getCityName || "",
                state: getStateName === 'N/A' ? "" : getStateName || "",
                country: getCountryName === 'N/A' ? "" : getCountryName || "",
                pinCode: values.pinCode || "",
                tehsil: tehsilName,
                area: areaName,
                areaId: areaId ? areaId : undefined, // Add areaId from the selected area ID (numeric ID from areas API)
                addressLine1: (values as any).addressLine1 || undefined,
                addressLine2: (values as any).addressLine2 || undefined,
            },
        };

        return payload;
    };

    // Map formik values to CreateAppointmentAndUpdateRegistration API payload (for clinic)
    const mapFormikToCreateAppointmentPayload = async (): Promise<CreateAppointmentAndUpdateRegistrationRequest> => {
        const values = formik.values;

        // Get city, state, country names from IDs
        const getCityName = citiesData?.data?.find((c: any) => c.id.toString() === values.city)?.name || values.city || 'N/A';
        const getStateName = statesData?.data?.find((s: any) => s.id.toString() === values.state)?.name || values.state || 'N/A';
        const getCountryName = countriesData?.data?.find((c: any) => c.id.toString() === values.country)?.name || values.country || 'N/A';

        // Get tehsil and area names if IDs are available
        let tehsilName: string | undefined = undefined;
        let areaName: string | undefined = undefined;

        if (values.tehsil && values.city) {
            try {
                const tehsilsResult = await getTehsilsQuery({ districtId: values.city });
                if (tehsilsResult.data?.success && tehsilsResult.data?.data) {
                    const tehsil = tehsilsResult.data.data.find((t: any) => t.id.toString() === values.tehsil);
                    tehsilName = tehsil?.name;

                    if (tehsilName && values.area) {
                        // Always set areaId from the selected area ID (this is the numeric ID from areas API response)
                        // values.area contains the area ID (e.g., 332662) from the areas API
                        // Fetch area name for the payload
                        try {
                            const areasResult = await getAreasQuery({ tehsilId: values.tehsil });
                            if (areasResult.data?.success && areasResult.data?.data) {
                                const area = areasResult.data.data.find((a: any) => a.id.toString() === values.area);
                                areaName = area?.name;
                            }
                        } catch (error) {
                            console.error("Error fetching area name, but areaId is still set:", error);
                            // Even if area name fetch fails, areaId is still set below
                            areaName = values.area; // Fallback to ID if name fetch fails
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching tehsil/area name:", error);
            }
        }

        // Determine referral source info based on source type
        let referralSourceInfo = "";
        if (values.referral?.toLowerCase() === "yes" && values.source) {
            if (values.source === "tv" && values.tvSpecificField) {
                referralSourceInfo = values.tvSpecificField;
            } else if (values.source === "newspaper" && values.newspaperSpecificField) {
                referralSourceInfo = values.newspaperSpecificField;
            } else if (values.source === "social-media" && values.socialMediaSpecificField) {
                referralSourceInfo = values.socialMediaSpecificField;
            } else if (values.source === "doctor" && values.doctorSpecificField) {
                referralSourceInfo = values.doctorSpecificField;
            } else if (values.source === "other" && values.referralName) {
                referralSourceInfo = values.referralName;
            }
        }

        // Parse addiction type
        const addictionType: string[] = [];
        if (values.alcohol) addictionType.push("alcohol");
        if (values.smoking) addictionType.push("smoking");
        if (values.tobacco) addictionType.push("tobacco");
        if (values.drugs) addictionType.push("drugs");
        if (values.addictionOther) addictionType.push("others");

        const addictionSpecify = values.addictionOther && values.addictionSpecify
            ? values.addictionSpecify
            : undefined;

        // Convert doctor ID to number
        const doctorUserId = values.doctor ? (typeof values.doctor === 'string' ? parseInt(values.doctor, 10) : values.doctor) : 0;

        // Check if pre-booking exists
        const isPreBooking = !!selectedPreBookingId;
        const preBookingId = selectedPreBookingId ? (typeof selectedPreBookingId === 'number' ? selectedPreBookingId : parseInt(String(selectedPreBookingId), 10)) : undefined;

        // Build the API payload for CreateAppointmentAndUpdateRegistration
        const payload: CreateAppointmentAndUpdateRegistrationRequest = {
            branchId: branchId,
            // Clinic registration doesn't use patient entries, so we don't send patientEntryId
            patientEntryId: undefined,
            registrationId: patientRegistrationId || 0,
            uhid: patientUhid || "",
            facilityType: "clinic",
            registration: {
                patientTitle: values.patientNameSelect || "",
                patientName: values.patientName || "",
                contactNumber: values.contactNumber || "",
                whatsappNo: values.whatsappNo || values.contactNumber || "",
                aadharCardNo: values.aadharCardNumber || undefined,
                guardianTitle: values.fathersHusbandsNameSelect || "",
                guardianName: values.fathersHusbandsName || "",
                gender: values.gender || "",
                age: values.age || "",
                religion: values.religion || "",
                specificRelegion: values.specificReligion || undefined,
                occupation: values.occupation || "",
                emailAddress: values.emailAddress || undefined,
                jsHealthCardNo: values.jsHealthCardNo || undefined,
                ayushCovered: values.ayushCovered || undefined,
                benificiaryId: values.benificiaryId || undefined,
                insuranceCompany: values.insuranceCompany || undefined,
                isReferral: values.referral?.toLowerCase() === "yes" ? values.referral : undefined,
                referralSourceInfo: referralSourceInfo || undefined,
                referralUserId: values.doctorSpecificField ? parseInt(values.doctorSpecificField, 10) : undefined,
                referralName: values.referralName || undefined,
                referralMobile: values.referralMobile || undefined,
                maritalStatus: values.maritalStatus || "",
                doctorUserId: doctorUserId,
                patientType: (values.patientType || "").toLowerCase(),
                addictionSpecify: addictionSpecify,
                addictionType: addictionType.length > 0 ? addictionType : undefined,
            },
            address: {
                address: values.address || "",
                city: getCityName === 'N/A' ? "" : getCityName || "",
                state: getStateName === 'N/A' ? "" : getStateName || "",
                country: getCountryName === 'N/A' ? "" : getCountryName || "",
                pinCode: values.pinCode || "",
                tehsil: tehsilName,
                area: areaName,
                areaId: values.area ? values.area : undefined, // Add areaId from the selected area ID (numeric ID from areas API)
                addressLine1: (values as any).addressLine1 || undefined,
                addressLine2: (values as any).addressLine2 || undefined,
            },
            appointment: {
                isPreBooking: isPreBooking,
                preBookingId: preBookingId,
                appointmentDate: values.appointmentDate || "",
                timeSlot: values.timeSlot || "",
                doctorUserId: doctorUserId,
                bloodPressure: values.bloodPressure || undefined,
                sugarLevel: values.sugarLevel || undefined,
                temperature: values.temperature || undefined,
                spo2: values.spo2 || undefined,
                pulse: values.pulse || undefined,
                diagnosisId: values.diagnosis ? parseInt(values.diagnosis, 10) : undefined,
                diagnosisSymptoms: values.symptoms || undefined,
                doctorFee: values.consultationCharges || undefined,
                subDiagnosisId: values.subDiagnosis ? parseInt(values.subDiagnosis, 10) : undefined,
                isDoctorChecked: false,
                isDiabetes: values.diabetes?.toLowerCase() === "yes",
                diabetesRemarks: values.diabetesRemarks || undefined,
                isHypertension: values.htn?.toLowerCase() === "yes",
                hypertensionRemarks: values.htnRemarks || undefined,
                isCad: values.coronaryArteryDisease?.toLowerCase() === "yes",
                cadRemarks: values.coronaryArteryDiseaseRemarks || undefined,
                isThyroid: values.thyroid?.toLowerCase() === "yes",
                thyroidRemarks: values.thyroidRemarks || undefined,
                isMenstrual: values.menstrual?.toLowerCase() === "yes",
                menstrualRemarks: values.menstrualRemarks || undefined,
                isPreBooked: isPreBooking,
                token: undefined,
            },
            payment: {
                doctorFee: parseFloat(values.consultationCharges || "0") || 0,
                serviceId: values.paymentMode?.toLowerCase() === "credit" && values.serviceId ? (typeof values.serviceId === 'number' ? values.serviceId : parseInt(String(values.serviceId), 10)) : undefined,
                paymentMode: values.paymentMode?.toLowerCase() === "credit" ? "razorpay" : (values.paymentMode?.toLowerCase() === "cash" ? "cash" : (values.paymentMode || "").toLowerCase()),
                razorpayPosPaymentLogId: values.paymentMode?.toLowerCase() === "credit" && values.razorpayPosPaymentLogId ? (typeof values.razorpayPosPaymentLogId === 'number' ? values.razorpayPosPaymentLogId : parseInt(String(values.razorpayPosPaymentLogId), 10)) : undefined,
                transactionId: values.transactionId || undefined,
                companyName: values.gstBilling ? (values.companyName || undefined) : undefined,
                billingAddress: values.gstBilling ? (values.billingAddress || undefined) : undefined,
                state: values.gstBilling ? (getStateName === 'N/A' ? undefined : getStateName || undefined) : undefined,
                city: values.gstBilling ? (getCityName === 'N/A' ? undefined : getCityName || undefined) : undefined,
                pincode: values.gstBilling ? (values.billingPincode ? parseInt(values.billingPincode, 10) : undefined) : undefined,
            },
        };

        return payload;
    };

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

    const handleFinalSubmit = async () => {
        try {
            await formik.submitForm();

            let result;
            
            // If patient already exists (has UHID and registrationId), use the new API
            if (patientUhid && patientRegistrationId) {
                const payload = await mapFormikToCreateAppointmentPayload();
                // Debug: Log the payload to see what's being sent
                console.log("CreateAppointmentAndUpdateRegistration API Payload Data:", JSON.stringify(payload, null, 2));
                result = await createAppointmentAndUpdateRegistration(payload).unwrap();
            } else {
                // New patient registration - use the regular API
                const payload = await mapFormikToClinicPatientPayload();
                // Debug: Log the payload to see what's being sent
                console.log("Clinic Patient Registration Payload:", JSON.stringify(payload, null, 2));
                result = await createClinicPatient(payload).unwrap();
            }

            // After successful registration: remove this patient's pending registration (match by patientName; if pending has contactNumber it must match too — so we also remove when pending was saved with only name, e.g. "Ajju")
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
            if (selectedApprovedPatientId && formType === "clinic") {
                removeDuplicateExceptionPatient(selectedApprovedPatientId);
                setSelectedApprovedPatientId(null);
            }

            // Refetch pre-bookings list after successful registration
            if (refetchPreBookingsListRef.current) {
                refetchPreBookingsListRef.current();
            }

            // If successful, the success dialog will be shown in MedicalForm
            // If there's an error, it will throw and be caught in MedicalForm
            if (!result.success) {
                throw new Error(result.message || "Registration failed. Please try again.");
            }
        } catch (error: any) {
            // Re-throw the error so MedicalForm can catch it and show error dialog
            const errorMessage = error?.data?.message || error?.message || "An error occurred during registration. Please try again.";
            throw new Error(errorMessage);
        }
    };

    // Function to reset form after successful submission (called from dialog close)
    const handleResetAfterSuccess = () => {
        formik.resetForm({ values: initialValues });
        setCurrentStep(0);
        setCurrentPendingRegistrationId(null);
        setSelectedApprovedPatientId(null);
        setPatientUhid(""); // Clear patient UHID
        setPatientRegistrationId(null); // Clear registration ID
        setIsRevisitedPatient(false); // Clear revisited state
        setSelectedRevisitedPatientData(null); // Clear selected patient data
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
                // uhid is optional - only include if available
            }).unwrap();

            // Double-check if dialog is being closed after async operation
            if (isClosingDialogRef.current) {
                lastCheckedContactNumberRef.current = "";
                return;
            }

            // Handle new response structure with registrations, preBookings, and userLead
            const registrations = result.data?.registrations || [];
            const preBookings = result.data?.preBookings || [];
            const userLead = result.data?.userLead;

            // Check if there are any registrations
            if (registrations.length > 0) {
                // Map API response to match ExistingPatient interface
                const mappedPatients: ExistingPatient[] = registrations.map((patient: any) => ({
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
                }));
                setExistingPatients(mappedPatients);
                setIsUserLeadData(false);
                setUserLeadId(null);
                setPatientExistsDialogOpen(true);
            } else if (registrations.length === 0 && preBookings.length === 0 && userLead && Object.keys(userLead).length > 0) {
                // Both registrations and preBookings empty – show "User Lead Data" dialog and send userLeadId in clinic-patient POST
                const userLeadData = userLead as any;
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
                };
                setExistingPatients([transformedUserLead]);
                setIsUserLeadData(true);
                if (userLeadData.id) {
                    setUserLeadId(userLeadData.id);
                }
                setPatientExistsDialogOpen(true);
            } else {
                // Clear the ref if no patients found
                lastCheckedContactNumberRef.current = "";
                setIsUserLeadData(false);
                setUserLeadId(null);
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

    // Handle contact number change - check when it reaches 10 digits
    const handleContactNumberChange = useCallback((field: string, value: string) => {
        // Don't check if dialog is being closed or if value is empty
        if (isClosingDialogRef.current || !value || value.length === 0) {
            return;
        }

        // Check when contact number reaches 10 digits
        if (value.length === 10) {
            checkExistingPatients(value);
            
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
    }, [checkExistingPatients, checkExistingAadharCard, formik.values.aadharCardNumber]);

    // Handle revisit button click from dialog (or "Visit" for User Lead Data)
    const handleRevisit = useCallback((patient: ExistingPatient) => {
        setPatientExistsDialogOpen(false);
        isClosingDialogRef.current = false;
        lastCheckedContactNumberRef.current = "";

        if (isUserLeadData) {
            // User Lead Data: use clinic-patient (new patient) flow and send userLeadId in POST
            setIsRevisitedPatient(false);
            setPatientUhid("");
            setPatientRegistrationId(null);
            // userLeadId already set when dialog opened – keep it for payload
        } else {
            setIsRevisitedPatient(true);
            setPatientUhid(patient.uhid || "");
            if (patient.id) {
                setPatientRegistrationId(patient.id);
            }
        }

        // Store the full patient data from API response for pending registration
        setSelectedRevisitedPatientData(patient);

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
        // Fill Medical/Vital fields (Step 4 for clinic, Step 2 for hospital)
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
        // Fill address fields (including User Lead address which may use different shape)
        if (patient.address) {
            const addr = patient.address as any;
            // Map country name to ID if countries data is available
            if (addr.country && countriesData?.data) {
                const countryName = String(addr.country).toLowerCase();
                const country = countriesData.data.find(
                    (c) => c.name.toLowerCase() === countryName
                );
                if (country) {
                    const countryId = country.id.toString();
                    formik.setFieldValue("country", countryId, false);
                } else {
                    const countryId = addr.country === "101" ? "6" : String(addr.country);
                    formik.setFieldValue("country", countryId, false);
                }
            } else if (addr.country) {
                const countryName = String(addr.country);
                selectedPatientAddressRef.current = {
                    ...selectedPatientAddressRef.current,
                    countryName: countryName,
                };
            }

            // Set address directly (addr works for both registration and userLead shapes)
            if (addr.address) {
                formik.setFieldValue("address", addr.address, false);
            }
            if (addr.addressLine1 != null) {
                formik.setFieldValue("addressLine1", addr.addressLine1 || "", false);
            }
            if (addr.addressLine2 != null) {
                formik.setFieldValue("addressLine2", addr.addressLine2 || "", false);
            }

            // Store state and city names for mapping to IDs (they come as names from API)
            selectedPatientAddressRef.current = {
                ...selectedPatientAddressRef.current,
                stateName: addr.state,
                cityName: addr.city,
                pinCode: addr.pinCode,
                tehsil: addr.tehsil,
                area: addr.area,
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
    }, [formik, isUserLeadData]);

    // Handle add new member button click
    const handleAddNewMember = useCallback(() => {
        // Store the first existing patient's registration ID and UHID if available (not used for User Lead)
        if (existingPatients.length > 0 && !isUserLeadData) {
            const firstPatient = existingPatients[0];
            if (firstPatient.id) {
                setPatientRegistrationId(firstPatient.id);
            }
            if (firstPatient.uhid) {
                setPatientUhid(firstPatient.uhid);
            }
        }
        setIsUserLeadData(false);
        setUserLeadId(null);
        setPatientExistsDialogOpen(false);
        setIsRevisitedPatient(false); // Clear revisited state when adding new member
        setSelectedRevisitedPatientData(null); // Clear selected patient data when adding new member
        setDuplicateExceptionDialogOpen(true);
    }, [existingPatients, isUserLeadData]);

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
                setErrorMessage("This patient is already in the duplicate exception list.");
                setShowErrorDialog(true);
                return;
            }

            const result = await requestDuplicateNumberPermission({
                branchId: branchId || 1,
                contactNo: formik.values.contactNumber,
                patientName: name,
                relationship: relationship,
                requestedBy: userId || 1,
            }).unwrap();

            // Save patient name to localStorage (clinic registration)
            if (formType === "clinic") {
                saveDuplicateExceptionPatient(name, formik.values.contactNumber);
            }

            // Show success message
            setSuccessMessage(result.message || "Permission request submitted successfully!");
            setShowSuccessDialog(true);

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

            setErrorMessage(errorMsg);
            setShowErrorDialog(true);
        }
    }, [requestDuplicateNumberPermission, branchId, userId, formik.values.contactNumber, formType, saveDuplicateExceptionPatient, getDuplicateExceptionPatients]);

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
        setIsUserLeadData(false);
        setUserLeadId(null);

        // Clear the contact number field when dialog closes
        formik.setFieldValue("contactNumber", "");

        setTimeout(() => {
            isClosingDialogRef.current = false;
        }, 500);
    }, [patientExistsDialogOpen, formik]);


    // Handle "Add New Patient" button click
    const handleAddNewPatient = () => {
        // If we're currently filling a form for an approved patient, don't save as duplicate exception
        // Just clear the form and start fresh
        if (selectedApprovedPatientId) {
            formik.resetForm({ values: initialValues });
            setCurrentStep(0);
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            // Clear pre-booking selection (don't save to localStorage)
            setSelectedPreBookingId(null);
            setSelectedPreBooking(null);
            // Clear patient UHID
            setPatientUhid("");
            // Clear registration ID
            setPatientRegistrationId(null);
            // Clear revisited patient flag
            setIsRevisitedPatient(false);
            // Clear selected patient data
            setSelectedRevisitedPatientData(null);
            return;
        }

        // If a pending registration is already selected (e.g. "Test Patient" from top buttons), "Add New Patient" means start fresh — clear form and selection without duplicate check or error
        if (currentPendingRegistrationId) {
            formik.resetForm({ values: initialValues });
            setCurrentStep(0);
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setSelectedPreBookingId(null);
            setSelectedPreBooking(null);
            setPatientUhid("");
            setPatientRegistrationId(null);
            setIsRevisitedPatient(false);
            setSelectedRevisitedPatientData(null);
            return;
        }

        // If form data came from Pre Booking panel selection, save as pending registration (like Token Panel / "Already Exist Patient")
        if (selectedPreBookingId !== null && selectedPreBooking) {
            const hasData = Object.values(formik.values).some(value => {
                if (typeof value === "string") return value.trim() !== "";
                if (typeof value === "boolean") return value === true;
                return false;
            });

            if (hasData) {
                const patientName = formik.values.patientName?.trim() || selectedPreBooking.patientName?.trim() || "Unknown Patient";
                const contactNumber = formik.values.contactNumber?.trim() || selectedPreBooking.contactNumber?.trim() || "";
                const normalizeContact = (s: string) => (s || "").replace(/\D/g, "").slice(-10);
                const normalizeName = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
                const contactNorm = normalizeContact(contactNumber);
                const nameNorm = normalizeName(patientName);

                // Check for duplicate: same contactNumber + patientName already saved as pending (same formType)
                const existing = getPendingRegistrations();
                const isDuplicate = existing.some(
                    (reg) =>
                        reg.formType === formType &&
                        normalizeContact(reg.formData.contactNumber || "") === contactNorm &&
                        (normalizeName(reg.patientName || "") === nameNorm || normalizeName(reg.formData.patientName || "") === nameNorm)
                );

                if (isDuplicate) {
                    setShowDuplicatePendingDialog(true);
                } else {
                    // Create pending registration with full pre-booking object (uhid null = new → clinic-patient; uhid present = old → CreateAppointmentAndUpdateRegistration)
                    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const pb = selectedPreBooking;
                    const pendingRegistration: PendingRegistration = {
                        id,
                        patientName: patientName || pb.patientName || "Unknown Patient",
                        formData: formik.values,
                        currentStep: currentStep,
                        savedAt: new Date().toISOString(),
                        formType: formType,
                        isFromPreBooking: true,
                        preBookingData: pb,
                        preBookingId: pb.id ?? null,
                        patientUhid: pb.uhid || undefined,
                        // Pre-booking API doesn't return registrationId; when uhid present backend may resolve. Use 0 for CreateAppointmentAndUpdateRegistration when uhid exists.
                        patientRegistrationId: pb.uhid ? 0 : null,
                    };

                    const updated = [...existing, pendingRegistration];
                    localStorage.setItem(PENDING_REGISTRATIONS_KEY, JSON.stringify(updated));

                    const filtered = updated.filter(reg => reg.formType === formType);
                    setPendingRegistrations(filtered);
                }
            }

            // Clear the form and pre-booking selection
            formik.resetForm({ values: initialValues });
            setCurrentStep(0);
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setSelectedPreBookingId(null);
            setSelectedPreBooking(null);
            setPatientUhid("");
            setPatientRegistrationId(null);
            setIsRevisitedPatient(false);
            setSelectedRevisitedPatientData(null);
            return;
        }

        // If form data came from "Already Exist Patient" dialog selection, save as pending registration
        if (isRevisitedPatient) {
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
                        isRevisitedPatient: true,
                        patientUhid: patientUhid || selectedRevisitedPatientData.uhid || undefined,
                        patientRegistrationId: patientRegistrationId || selectedRevisitedPatientData.id || null,
                        existingPatientData: selectedRevisitedPatientData,
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
            // Clear pre-booking selection
            setSelectedPreBookingId(null);
            setSelectedPreBooking(null);
            // Clear patient UHID
            setPatientUhid("");
            // Clear registration ID
            setPatientRegistrationId(null);
            // Clear revisited patient flag
            setIsRevisitedPatient(false);
            // Clear selected patient data
            setSelectedRevisitedPatientData(null);
            return;
        }

        // Check if there's any data in the form
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
                    // Clear pre-booking selection (don't save to localStorage)
                    setSelectedPreBookingId(null);
                    setSelectedPreBooking(null);
                    // Clear patient UHID
                    setPatientUhid("");
                    // Clear registration ID
                    setPatientRegistrationId(null);
                    // Clear revisited patient flag
                    setIsRevisitedPatient(false);
                    // Clear selected patient data
                    setSelectedRevisitedPatientData(null);
                    return;
                }
            }

            // If we're currently viewing a pending registration, update it instead of creating a new one
            if (currentPendingRegistrationId) {
                savePendingRegistration(formik.values, currentStep, currentPendingRegistrationId);
            } else {
                // Save current form data as pending registration (will update if same patient name exists)
                savePendingRegistration(formik.values, currentStep);
            }
        }

        // Reset form to initial values
        formik.resetForm({ values: initialValues });
        setCurrentStep(0);
        setCurrentPendingRegistrationId(null); // Clear the current pending registration ID
        setSelectedApprovedPatientId(null);
        setPatientUhid(""); // Clear patient UHID
        setPatientRegistrationId(null); // Clear registration ID
        // Clear pre-booking selection
        setSelectedPreBookingId(null);
        setSelectedPreBooking(null);
        // Clear revisited patient flag
        setIsRevisitedPatient(false);
        // Clear selected patient data
        setSelectedRevisitedPatientData(null);
    };

    // Handle clicking on pending registration button
    const handleLoadPendingRegistration = (pendingReg: PendingRegistration) => {
        // Load the form data
        formik.setValues(pendingReg.formData);
        formik.setTouched({});
        formik.setErrors({});

        // Set the current step
        setCurrentStep(pendingReg.currentStep);

        // Track which pending registration is currently loaded
        setCurrentPendingRegistrationId(pendingReg.id);

        // Clear selected approved patient when loading pending registration
        setSelectedApprovedPatientId(null);
        
        // Restore patient flags and API data if this is from "Already Exist Patient"
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
            setSelectedPreBookingId(null);
            setSelectedPreBooking(null);
        } else if (pendingReg.isFromPreBooking && pendingReg.preBookingData) {
            // Restore Pre Booking state so submission uses correct API (clinic-patient vs CreateAppointmentAndUpdateRegistration)
            const pb = pendingReg.preBookingData;
            setIsRevisitedPatient(false);
            setSelectedRevisitedPatientData(null);
            setPatientUhid(pb.uhid || "");
            setPatientRegistrationId(pb.uhid ? (pendingReg.patientRegistrationId ?? 0) : null);
            setSelectedPreBooking(pb);
            setSelectedPreBookingId(pendingReg.preBookingId ?? pb.id ?? null);
        } else {
            // Clear flags if not a revisited or pre-booking patient
            setIsRevisitedPatient(false);
            setPatientUhid("");
            setPatientRegistrationId(null);
            setSelectedRevisitedPatientData(null);
            setSelectedPreBookingId(null);
            setSelectedPreBooking(null);
        }
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

        console.log("[Clinic Registration] Loaded approved patient:", patient.patientName, patient.contactNo);
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
    // Only show green buttons for pending registrations (type: "pending")
    // Filter by current form type
    const filteredPendingRegistrations = pendingRegistrations.filter(reg => reg.formType === formType);
    const pendingRegistrationButtons = filteredPendingRegistrations.map(reg => {
        const isActive = currentPendingRegistrationId === reg.id;
        return {
            id: reg.id,
            name: reg.patientName,
            type: "pending" as const,
            iconSrc: "/icons/ProfileDarkIcon.svg",
            // Subtle highlighting: slightly darker light green background for active button
            bgColor: isActive ? "bg-[rgba(11,140,0,0.35)]" : "bg-[rgba(11,140,0,0.15)]",
            borderColor: "border-[#0B8C00]",
            textColor: "text-[#0B8C00]",
            isActive: isActive,
            registration: reg, // Store the full registration data
        };
    });

    return (
        <AppShell>
            <div className="flex justify-between items-center">
                <div ref={registrationHeadingRef} className="prebooking-icon flex items-center gap-3 mb-6" >
                    <Tooltip
                        content={formType === "clinic" ? "Pre Booking" : "Token"}
                        position="right"
                        delay={0}
                    >

                        <button onClick={() => setIsPreBookingOpen(!isPreBookingOpen)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            aria-label={formType === "clinic" ? "Pre Booking" : "Token"}
                        >

                            <Image src="/icons/prebookingtoggle.svg" alt="Prebooking Icon" width={32} height={32} />
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

                        {/* Pending registration buttons (green buttons only) */}
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
                {/* Pre Booking Panel - Conditionally rendered */}
                {isPreBookingOpen && (
                    <div className="w-[20%] transition-all duration-0 ease-in-out flex-shrink-0">
                        <PreBookingPanel
                            onPreBookingClick={handlePreBookingClick}
                            selectedPreBookingId={selectedPreBookingId}
                            onRefetchReady={(refetch) => {
                                refetchPreBookingsListRef.current = refetch;
                            }}
                        />
                    </div>
                )}

                {/* Registration Steps and Forms - Dynamic width based on Pre Booking panel visibility */}
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
                            readOnlyFields={(() => {
                                const baseFields = selectedPreBookingId || isRevisitedPatient 
                                    ? (() => {
                                        // For pre-booking: only lock Aadhar if the pre-booking data had Aadhar when loaded (so user can fill it when empty)
                                        const preBookingHadAadhar = selectedPreBookingId && selectedPreBooking && String((selectedPreBooking as { aadharCardNo?: string })?.aadharCardNo ?? "").trim() !== "";
                                        // For revisit: only lock Aadhar if the existing patient had Aadhar when loaded
                                        const revisitHadAadhar = isRevisitedPatient && selectedRevisitedPatientData?.aadharCardNo?.trim() !== "";
                                        const lockAadhar = preBookingHadAadhar || revisitHadAadhar;
                                        const base = ["patientName", "contactNumber"];
                                        return lockAadhar ? [...base, "aadharCardNumber"] : base;
                                    })()
                                    : (selectedApprovedPatientId 
                                        ? ["patientName", "contactNumber"] 
                                        : []);
                                
                                // Add referral fields if patient is selected or dialog is open
                                const referralFields = selectedReferralPatient 
                                    ? ["referralName", "referralMobile"] 
                                    : (referralPatientsDialogOpen ? ["referralMobile"] : []);
                                
                                return [...baseFields, ...referralFields];
                            })()}
                            hideReferral={!!patientUhid && patientUhid.trim() !== ""}
                            isContactLoading={isContactLoading}
                            isReferralMobileLoading={isReferralMobileLoading}
                        />
                    )}

                    {currentStep === 1 && (
                        <PaymentForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onNext={handleNextStep}
                            onBack={handleBackSteps}
                            patientUhid={patientUhid}
                            patientRegistrationId={patientRegistrationId}
                        />
                    )}

                    {currentStep === 2 && (
                        <VitalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onNext={handleNextStep}
                            onBack={handleBackSteps}
                        />
                    )}

                    {currentStep === 3 && (
                        <MedicalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onBack={handleBackSteps}
                            onSubmit={handleFinalSubmit}
                            onSuccessClose={handleResetAfterSuccess}
                            isSubmitting={isSubmitting}
                        />
                    )}
                </div>

                <div className="w-[20%]">
                    <JSHealthCardPoints />
                    <PatientOldHistory />
                    <Vouchers />
                </div>


            </div>

            {/* Patient Already Exists Dialog */}
            <PatientAlreadyExistsDialog
                open={patientExistsDialogOpen}
                onClose={handlePatientExistsDialogClose}
                existingPatients={existingPatients}
                onRevisit={handleRevisit}
                onAddNewMember={handleAddNewMember}
                isUserLeadData={isUserLeadData}
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

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />

            {/* Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
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