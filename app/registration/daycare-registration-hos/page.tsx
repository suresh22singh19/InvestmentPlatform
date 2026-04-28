"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useFormik } from "formik";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import TokenPanel from "@/components/registration/TokenPanel";
import { type PatientEntry } from "@/store/api/registrationApi";
import JSHealthCardPoints from "@/components/registration/JSHealthCardPoints";
import PatientOldHistory from "@/components/registration/PatientOldHistory";
import Vouchers from "@/components/registration/Vouchers";
import PersonalDetailsReg from "@/components/registration/PersonalDetailsReg";
import Vitals from "@/components/registration/Vitals";
import Doctor from "@/components/registration/Doctor";
import MedicalDetails from "@/components/registration/MedicalDetails";
import PatientWalletInformation from "@/components/registration/PatientWalletInformation";
import Therapy from "@/components/registration/Therapy";
import PatientWalletView from "@/components/registration/PatientWalletView";
import { registrationPersonalDetailsSchema, type RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import PersonalForm from "../personal";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { useAppSelector } from "@/store/hooks";
import { selectUserId, selectUserBranchId } from "@/store/slices/authSlice";
import { useGetStatesQuery, useGetCitiesQuery, useGetCountriesQuery } from "@/store/api/publicApi";
import { useGetDoctorsQuery } from "@/store/api/registrationApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { registrationApi, useRequestDuplicateNumberPermissionMutation } from "@/store/api/registrationApi";
import type { ExistingPatient } from "@/store/api/gateApi";
import { MessageDialog, Tooltip } from "@/components/ui";
import PatientAlreadyExistsDialog from "@/components/registration/PatientAlreadyExistsDialog";
import DuplicateNumberExceptionDialog from "@/components/registration/DuplicateNumberExceptionDialog";
import { useSocket } from "@/hooks/useSocket";

// LocalStorage key for pending registrations
const PENDING_REGISTRATIONS_KEY = "pendingPatientRegistrations";

// LocalStorage key for duplicate exception patients (Daycare Hospital)
const DUPLICATE_EXCEPTION_PATIENTS_DAYCARE_KEY = "duplicateExceptionPatientsDaycareHospital";

// Interface for pending registration
interface PendingRegistration {
    id: string;
    patientName: string;
    formData: RegistrationPersonalDetailsFormValues;
    currentStep: number;
    savedAt: string;
    formType: "clinic" | "hospital" | "ipd" | "ipd-clinic" | "ipd-hospital" | "daycare" | "daycare-clinic" | "daycare-hospital";
}

// Interface for duplicate exception patient
interface DuplicateExceptionPatient {
    id: string;
    patientName: string;
    contactNo: string;
    savedAt: string;
    status: "pending" | "approved" | "rejected";
}

export default function DaycareRegistrationPage() {
    const formType: "daycare-hospital" = "daycare-hospital";
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
    const [currentPendingRegistrationId, setCurrentPendingRegistrationId] = useState<string | null>(null);
    const [selectedTokenId, setSelectedTokenId] = useState<string | number | null>(null);
    const [selectedToken, setSelectedToken] = useState<PatientEntry | null>(null);
    const refetchTokensListRef = useRef<(() => void) | null>(null);

    // Patient exists dialog state
    const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
    const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
    const isClosingDialogRef = useRef(false);
    const lastCheckedContactNumberRef = useRef<string>("");
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Duplicate number exception dialog state
    const [duplicateExceptionDialogOpen, setDuplicateExceptionDialogOpen] = useState(false);
    const [duplicateExceptionPatients, setDuplicateExceptionPatients] = useState<DuplicateExceptionPatient[]>([]);
    const [selectedApprovedPatientId, setSelectedApprovedPatientId] = useState<string | null>(null);
    const [isRevisitedPatient, setIsRevisitedPatient] = useState(false);

    // Success and error dialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Wallet view state
    const [showWalletView, setShowWalletView] = useState(false);

    // Get branchId and userId from auth state
    const branchId = useAppSelector(selectUserBranchId) || 1;
    const userId = useAppSelector(selectUserId) || 1;

    // Lazy query for checking existing patients
    const [checkExistingPatientsQuery] = registrationApi.useLazyCheckExistingPatientsByPhoneQuery();

    // Mutation for requesting duplicate number permission
    const [requestDuplicateNumberPermission, { isLoading: isCreatingException }] = useRequestDuplicateNumberPermissionMutation();

    // Container ref for arrow key navigation
    const formsContainerRef = useRef<HTMLDivElement>(null);
    const registrationHeadingRef = useRef<HTMLDivElement>(null);

    // Ref for the left sidebar panel container (for click-outside detection)
    const leftSidebarRef = useRef<HTMLDivElement>(null);

    // Enable arrow key navigation for form fields
    useArrowKeyNavigation(formsContainerRef, true, (fieldName) => {
        formik.setFieldTouched(fieldName as keyof RegistrationPersonalDetailsFormValues, true, false);
        formik.validateField(fieldName);
    });

    // Click-outside detection for responsive mode (when panels take full height on left side)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Only handle click-outside when in responsive mode (width <= 1280px where small-screens becomes absolute)
            if (window.innerWidth > 1280) {
                return;
            }

            // Only close if sidebar is open
            if (!isLeftSidebarOpen) {
                return;
            }

            // Check if click is outside the sidebar container
            if (
                leftSidebarRef.current &&
                !leftSidebarRef.current.contains(event.target as Node) &&
                // Also check if click is not on the toggle button
                !registrationHeadingRef.current?.contains(event.target as Node)
            ) {
                setIsLeftSidebarOpen(false);
            }
        };

        if (isLeftSidebarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isLeftSidebarOpen]);

    // Get socket hook
    const { onDuplicateNumberPermissionUpdate } = useSocket();

    // Source options for Referral component
    const sourceOptions: SelectOption[] = [
        { value: "TV", label: "TV" },
        { value: "NewsPaper", label: "Newspaper" },
        { value: "Social Media", label: "Social Media" },
        { value: "VOPD Doctors", label: "VOPD Doctors" },
        { value: "HIIMS Doctor", label: "HIIMS Doctor" },
        { value: "Patient Referral", label: "Patient Referral (Health Card)" },
        { value: "Direct Patient", label: "Direct Patient" },
    ];

    // TV-specific field options
    const tvSpecificFieldOptions: SelectOption[] = [
        { value: "Sahara one", label: "Sahara one" },
        { value: "Zee TV", label: "Zee TV" },
        { value: "MAN TV", label: "MAN TV" },
        { value: "9XM", label: "9XM" },
        { value: "9XM JALWA", label: "9XM JALWA" },
        { value: "9X JHAKAS", label: "9X JHAKAS" },
        { value: "9X TASHAN", label: "9X TASHAN" },
        { value: "NEWS WORLD INDIA", label: "NEWS WORLD INDIA" },
        { value: "JANTA TV", label: "JANTA TV" },
        { value: "SHUBH TV", label: "SHUBH TV" },
        { value: "INDIA NEWS RAJASTHAN", label: "INDIA NEWS RAJASTHAN" },
        { value: "KASHIS NEWS", label: "KASHIS NEWS" },
        { value: "LAKSHYA TV", label: "LAKSHYA TV" },
        { value: "INDIA NEWS MP", label: "INDIA NEWS MP" },
        { value: "INDIA NEWS UP", label: "INDIA NEWS UP" },
        { value: "INDIA NEWS HARIYAN", label: "INDIA NEWS HARIYAN" },
        { value: "NATION LIVE", label: "NATION LIVE" },
        { value: "SHARTHI TV", label: "SHARTHI TV" },
        { value: "CHANNEL ONE", label: "CHANNEL ONE" },
        { value: "INVENTARY", label: "INVENTARY" },
        { value: "ADHYATAM TV", label: "ADHYATAM TV" },
        { value: "ALL CABLE", label: "ALL CABLE" },
        { value: "CHARDI KALA TIME TV", label: "CHARDI KALA TIME TV" },
        { value: "SARV DHARAM TV", label: "SARV DHARAM TV" },
        { value: "SADVIDYA TV", label: "SADVIDYA TV" },
        { value: "SADHNA TV", label: "SADHNA TV" },
        { value: "ISHWAR TV", label: "ISHWAR TV" },
        { value: "SADHNA MP", label: "SADHNA MP" },
        { value: "SADHNA PLUS", label: "SADHNA PLUS" },
        { value: "DARSHAN 24", label: "DARSHAN 24" },
        { value: "ANJAN TV", label: "ANJAN TV" },
        { value: "CARE WORLD", label: "CARE WORLD" },
        { value: "CHIRTPATH MARATHI", label: "CHIRTPATH MARATHI" },
        { value: "MANORANJAN TV", label: "MANORANJAN TV" },
        { value: "MANORANJAN MOVIE", label: "MANORANJAN MOVIE" },
        { value: "RT MOVIES", label: "RT MOVIES" },
        { value: "VAA MOVIE", label: "VAA MOVIE" },
        { value: "ENTER 10", label: "ENTER 10" },
        { value: "B FLIX", label: "B FLIX" },
        { value: "DHAMAL TV", label: "DHAMAL TV" },
        { value: "HOUSEFULL ACTION", label: "HOUSEFULL ACTION" },
        { value: "PTC TV", label: "PTC TV" },
        { value: "MULTIPLEX", label: "MULTIPLEX" },
        { value: "PUNJAB PLUS", label: "PUNJAB PLUS" },
        { value: "DIGI CABLE", label: "DIGI CABLE" },
        { value: "INDIA TALKIES", label: "INDIA TALKIES" },
        { value: "GARV PUNJAB", label: "GARV PUNJAB" },
        { value: "FASTWAY CABLE", label: "FASTWAY CABLE" },
        { value: "SANSKRITY TV", label: "SANSKRITY TV" },
        { value: "DHISHOOM TV", label: "DHISHOOM TV" },
        { value: "ZEE SALAM", label: "ZEE SALAM" },
    ];

    // Newspaper-specific field options
    const newspaperSpecificFieldOptions: SelectOption[] = [
        { value: "Hindustan Times", label: "Hindustan Times" },
        { value: "Dainik Jagran", label: "Dainik Jagran" },
        { value: "Dainik Bhaskar", label: "Dainik Bhaskar" },
        { value: "Malayala Manorama", label: "Malayala Manorama" },
        { value: "Daily Thanthi", label: "Daily Thanthi" },
        { value: "Rajasthan Patrika", label: "Rajasthan Patrika" },
        { value: "Amar Ujala", label: "Amar Ujala" },
        { value: "The Times of India", label: "The Times of India" },
    ];

    // Social Media-specific field options
    const socialMediaSpecificFieldOptions: SelectOption[] = [
        { value: "Facebook", label: "Facebook" },
        { value: "Instagram", label: "Instagram" },
        { value: "Youtube", label: "Youtube" },
        { value: "Whtsapp", label: "Whtsapp" },
        { value: "Twitter", label: "Twitter" },
        { value: "Linkedin", label: "Linkedin" },
        { value: "India Mart", label: "India Mart" },
        { value: "Just Dial", label: "Just Dial" },
        { value: "Website", label: "Website" },
    ];

    // LocalStorage functions for pending registrations
    const getPendingRegistrations = useCallback((): PendingRegistration[] => {
        if (typeof window === "undefined") return [];

        try {
            const stored = localStorage.getItem(PENDING_REGISTRATIONS_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored) as PendingRegistration[];
            return parsed.map(reg => ({
                ...reg,
                formType: (reg.formType || "clinic") as "clinic" | "hospital" | "ipd" | "ipd-clinic" | "ipd-hospital" | "daycare" | "daycare-clinic" | "daycare-hospital"
            }));
        } catch (error) {
            console.error("Failed to load pending registrations:", error);
            return [];
        }
    }, []);

    const savePendingRegistration = useCallback((formData: RegistrationPersonalDetailsFormValues, step: number, existingId?: string | null) => {
        if (typeof window === "undefined") return;

        try {
            const patientName = formData.patientName?.trim() || "";

            if (!patientName || patientName.toLowerCase() === "unknown patient") {
                return;
            }

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
            setPendingRegistrations(updated);
        } catch (error) {
            console.error("Failed to remove pending registration:", error);
        }
    }, [getPendingRegistrations]);

    // LocalStorage functions for duplicate exception patients (Daycare)
    const getDuplicateExceptionPatients = useCallback((): DuplicateExceptionPatient[] => {
        if (typeof window === "undefined") return [];

        try {
            const stored = localStorage.getItem(DUPLICATE_EXCEPTION_PATIENTS_DAYCARE_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored) as DuplicateExceptionPatient[];
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
            const id = `duplicate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const duplicatePatient: DuplicateExceptionPatient = {
                id,
                patientName: patientName.trim(),
                contactNo: contactNo.trim(),
                savedAt: new Date().toISOString(),
                status: "pending",
            };

            const updated = [...existing, duplicatePatient];
            localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_DAYCARE_KEY, JSON.stringify(updated));
            setDuplicateExceptionPatients(updated);
        } catch (error) {
            console.error("Failed to save duplicate exception patient:", error);
        }
    }, [getDuplicateExceptionPatients]);

    // Update duplicate exception patient status in localStorage (Daycare)
    const updateDuplicateExceptionPatientStatus = useCallback((contactNo: string, patientName: string, status: "approved" | "rejected") => {
        if (typeof window === "undefined") return;

        try {
            const existing = getDuplicateExceptionPatients();
            console.log(`[Daycare Registration Hospital] Looking for patient: "${patientName}" (${contactNo}) with status: ${status}`);
            console.log(`[Daycare Registration Hospital] Existing patients in localStorage:`, existing);

            const normalizedContactNo = contactNo.trim();
            const normalizedPatientName = patientName.trim();
            const normalizedStatus = status.toLowerCase() as "approved" | "rejected" | "pending";

            const updated = existing.map(patient => {
                // Match by contact number and patient name (case-insensitive comparison)
                const patientContactNo = patient.contactNo.trim();
                const patientNameTrimmed = patient.patientName.trim();

                if (patientContactNo === normalizedContactNo &&
                    patientNameTrimmed.toLowerCase() === normalizedPatientName.toLowerCase()) {
                    console.log(`[Daycare Registration Hospital] ✅ Match found! Updating patient status: ${patient.patientName} (${patient.contactNo}) -> ${normalizedStatus}`);
                    return { ...patient, status: normalizedStatus };
                }
                return patient;
            });

            // Check if any patient was updated
            const wasUpdated = updated.some((patient, index) => {
                return patient.status !== existing[index]?.status;
            });

            if (wasUpdated) {
                localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_DAYCARE_KEY, JSON.stringify(updated));
                // Force state update by creating a new array reference
                setDuplicateExceptionPatients([...updated]);
                console.log(`[Daycare Registration Hospital] ✅ Status updated successfully. New state:`, updated);
            } else {
                console.warn(`[Daycare Registration Hospital] ❌ No matching patient found for: "${normalizedPatientName}" (${normalizedContactNo})`);
                console.log(`[Daycare Registration Hospital] Existing patients for comparison:`, existing.map(p => ({ name: p.patientName, contact: p.contactNo, status: p.status })));
            }
        } catch (error) {
            console.error("[Daycare Registration Hospital] Failed to update duplicate exception patient status:", error);
        }
    }, [getDuplicateExceptionPatients]);

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
        patientType: "",
        patientSubType: "",
        panelId: "",
        benificiaryId: "",
        insuranceCompany: "",
        ayushCovered: "",
        referral: "",
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

    const addressCountryIsIndia = formik.values.country === "6";
    const { data: statesData } = useGetStatesQuery(
        formik.values.country && addressCountryIsIndia ? { countryId: formik.values.country } : undefined,
        { skip: !formik.values.country || !addressCountryIsIndia }
    );

    const { data: citiesData } = useGetCitiesQuery(
        formik.values.state && addressCountryIsIndia ? { stateId: formik.values.state } : undefined,
        { skip: !formik.values.state || !addressCountryIsIndia }
    );

    // Fetch doctors for matching when patient is selected
    const { data: doctorsData } = useGetDoctorsQuery();

    // Fetch countries data
    const { data: countriesData } = useGetCountriesQuery({});

    // Load pending registrations and duplicate exception patients on mount
    useEffect(() => {
        const pending = getPendingRegistrations();
        const filtered = pending.filter(reg => reg.formType === formType);
        setPendingRegistrations(filtered);

        const duplicatePatients = getDuplicateExceptionPatients();
        setDuplicateExceptionPatients(duplicatePatients);
    }, [getPendingRegistrations, getDuplicateExceptionPatients, formType]);

    // Listen for duplicate number permission updates via socket (Daycare)
    useEffect(() => {
        const unsubscribe = onDuplicateNumberPermissionUpdate((socketData: any) => {
            console.log("[Daycare Registration Hospital] Duplicate number permission update received:", socketData);
            // Socket data structure: { message: "...", data: { contactNo, patientName, status, ... } }
            // Extract the nested data object
            const data = socketData?.data || socketData;
            console.log("[Daycare Registration Hospital] Extracted data:", data);

            // Check if we have the required fields
            if (data?.contactNo && data?.patientName && data?.status) {
                // Convert status to lowercase (socket sends "APPROVED"/"REJECTED", we need "approved"/"rejected")
                const normalizedStatus = data.status.toLowerCase();
                console.log("[Daycare Registration Hospital] Normalized status:", normalizedStatus);
                console.log("[Daycare Registration Hospital] Full socket data:", JSON.stringify(socketData, null, 2));

                if (normalizedStatus === "approved" || normalizedStatus === "rejected") {
                    console.log("[Daycare Registration Hospital] Updating status for:", data.patientName, data.contactNo, "->", normalizedStatus);
                    updateDuplicateExceptionPatientStatus(data.contactNo, data.patientName, normalizedStatus as "approved" | "rejected");
                } else {
                    console.warn("[Daycare Registration Hospital] Invalid status received:", normalizedStatus);
                }
            } else {
                console.warn("[Daycare Registration Hospital] Missing required fields in socket data:", data);
                console.log("[Daycare Registration Hospital] Full socket data structure:", JSON.stringify(socketData, null, 2));
            }
        });
        return unsubscribe;
    }, [onDuplicateNumberPermissionUpdate, updateDuplicateExceptionPatientStatus]);

    // Listen for custom event when localStorage is updated from another page
    useEffect(() => {
        const handleStatusUpdate = (event: CustomEvent) => {
            const { type } = event.detail || {};
            if (type === "daycare-hospital") {
                const duplicatePatients = getDuplicateExceptionPatients();
                setDuplicateExceptionPatients(duplicatePatients);
            }
        };

        window.addEventListener('duplicateExceptionPatientStatusUpdated' as any, handleStatusUpdate as EventListener);
        return () => {
            window.removeEventListener('duplicateExceptionPatientStatusUpdated' as any, handleStatusUpdate as EventListener);
        };
    }, [getDuplicateExceptionPatients]);

    // Listen for visibility change to reload when page becomes visible
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


    // Check for existing patients by contact number
    const checkExistingPatients = useCallback(async (contactNumber: string) => {
        if (!contactNumber || contactNumber.length !== 10) {
            lastCheckedContactNumberRef.current = "";
            return;
        }

        if (isClosingDialogRef.current) return;

        if (checkTimeoutRef.current) {
            clearTimeout(checkTimeoutRef.current);
        }

        if (lastCheckedContactNumberRef.current === contactNumber) {
            return;
        }

        lastCheckedContactNumberRef.current = contactNumber;

        checkTimeoutRef.current = setTimeout(async () => {
            try {
                const result = await checkExistingPatientsQuery({
                    branchId: branchId || 1,
                    phoneNumber: contactNumber,
                }).unwrap();

                if (isClosingDialogRef.current) {
                    lastCheckedContactNumberRef.current = "";
                    return;
                }

                const registrations = result.data?.registrations || [];

                if (registrations.length > 0) {
                    const mappedPatients = registrations.map((patient: any) => ({
                        ...patient,
                        name: patient.patientName || patient.name,
                        branchName: patient.branchName || "N/A",
                    }));
                    setExistingPatients(mappedPatients);
                    setPatientExistsDialogOpen(true);
                } else {
                    lastCheckedContactNumberRef.current = "";
                }
            } catch (error: any) {
                console.error("Error checking existing patients:", error);
                lastCheckedContactNumberRef.current = "";
            }
        }, 500);
    }, [checkExistingPatientsQuery, branchId]);

    // Handle contact number change
    const handleContactNumberChange = useCallback((field: string, value: string) => {
        if (isClosingDialogRef.current || !value || value.length === 0) {
            return;
        }

        if (value.length === 10) {
            checkExistingPatients(value);
        }
    }, [checkExistingPatients]);

    // Handle next step (save to localStorage for single-step form)
    const handleNextStep = useCallback(() => {
        // Save pending registration when Save button is clicked
        const patientName = formik.values.patientName?.trim() || "";
        if (patientName && patientName.toLowerCase() !== "unknown patient") {
            savePendingRegistration(formik.values, 0, currentPendingRegistrationId);
            setSuccessMessage("Patient registration saved successfully!");
            setShowSuccessDialog(true);

            // Reset form after saving
            setTimeout(() => {
                formik.resetForm({ values: initialValues });
                setCurrentPendingRegistrationId(null);
                setSelectedApprovedPatientId(null);
                setIsRevisitedPatient(false);
                setSelectedTokenId(null);
                setSelectedToken(null);
                setShowSuccessDialog(false);
            }, 2000);
        }
    }, [formik, currentPendingRegistrationId, savePendingRegistration, initialValues]);

    // Handle token click
    const handleTokenClick = useCallback((entry: PatientEntry | null) => {
        if (!entry) {
            formik.resetForm();
            setSelectedTokenId(null);
            setSelectedToken(null);
            return;
        }

        const tokenId = entry.id ? String(entry.id) : null;

        if (selectedTokenId !== null && String(selectedTokenId) === tokenId) {
            formik.resetForm();
            setSelectedTokenId(null);
            setSelectedToken(null);
            return;
        }

        formik.resetForm();
        setSelectedToken(entry);
        setSelectedTokenId(tokenId);
    }, [formik, selectedTokenId]);

    // Pre-fill form when token is selected
    useEffect(() => {
        if (selectedToken && selectedTokenId) {
            const entry = selectedToken;

            const formUpdates: Partial<RegistrationPersonalDetailsFormValues> = {
                contactNumber: (typeof entry.contactNo === 'string') ? entry.contactNo : "",
                whatsappNo: (typeof entry.contactNo === 'string') ? entry.contactNo : "",
                patientName: (typeof entry.name === 'string') ? entry.name : "",
                age: (typeof entry.age === 'string') ? entry.age : "",
                emailAddress: (typeof entry.emailAddress === 'string') ? entry.emailAddress : "",
            };

            Object.keys(formUpdates).forEach((key) => {
                const value = formUpdates[key as keyof typeof formUpdates];
                if (value !== undefined) {
                    formik.setFieldValue(key, value, false);
                }
            });
        }
    }, [selectedTokenId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Note: PatientEntry doesn't have doctorUserId, so we skip doctor mapping for tokens

    // Handle load pending registration
    const handleLoadPendingRegistration = useCallback((registration: PendingRegistration) => {
        formik.setValues(registration.formData);
        setCurrentPendingRegistrationId(registration.id);
        setSelectedApprovedPatientId(null);
        setIsRevisitedPatient(false);
        setSelectedTokenId(null);
        setSelectedToken(null);
    }, [formik]);

    // Handle load approved patient
    const handleLoadApprovedPatient = useCallback((patient: DuplicateExceptionPatient) => {
        formik.setFieldValue("contactNumber", patient.contactNo, false);
        setSelectedApprovedPatientId(patient.id);
        setCurrentPendingRegistrationId(null);
        setIsRevisitedPatient(false);
        setSelectedTokenId(null);
        setSelectedToken(null);
    }, [formik]);

    // Handle Add New Patient button click
    const handleAddNewPatient = useCallback(() => {
        if (selectedApprovedPatientId) {
            formik.resetForm({ values: initialValues });
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setSelectedTokenId(null);
            setSelectedToken(null);
            setIsRevisitedPatient(false);
            return;
        }

        if (selectedTokenId !== null) {
            formik.resetForm({ values: initialValues });
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setSelectedTokenId(null);
            setSelectedToken(null);
            return;
        }

        if (isRevisitedPatient) {
            formik.resetForm({ values: initialValues });
            setCurrentPendingRegistrationId(null);
            setSelectedApprovedPatientId(null);
            setIsRevisitedPatient(false);
            setSelectedTokenId(null);
            setSelectedToken(null);
            return;
        }

        const hasData = Object.values(formik.values).some(value => {
            if (typeof value === "string") return value.trim() !== "";
            if (typeof value === "boolean") return value === true;
            return false;
        });

        if (hasData) {
            const currentPatientName = formik.values.patientName?.trim();
            const currentContactNumber = formik.values.contactNumber?.trim();

            if (currentPatientName && currentContactNumber) {
                const existing = getDuplicateExceptionPatients();
                const alreadyExists = existing.some(
                    p => p.patientName.trim().toLowerCase() === currentPatientName.toLowerCase() &&
                        p.contactNo.trim() === currentContactNumber
                );

                if (alreadyExists) {
                    formik.resetForm({ values: initialValues });
                    setCurrentPendingRegistrationId(null);
                    setSelectedApprovedPatientId(null);
                    setSelectedTokenId(null);
                    setSelectedToken(null);
                    setIsRevisitedPatient(false);
                    return;
                }
            }

            if (currentPendingRegistrationId) {
                savePendingRegistration(formik.values, 0, currentPendingRegistrationId);
            } else {
                savePendingRegistration(formik.values, 0);
            }
        }

        formik.resetForm({ values: initialValues });
        setCurrentPendingRegistrationId(null);
        setSelectedApprovedPatientId(null);
        setIsRevisitedPatient(false);
        setSelectedTokenId(null);
        setSelectedToken(null);
    }, [formik, selectedApprovedPatientId, selectedTokenId, isRevisitedPatient, currentPendingRegistrationId, savePendingRegistration, getDuplicateExceptionPatients, initialValues]);

    // Handle revisit from dialog
    const handleRevisit = useCallback((patient: ExistingPatient) => {
        setPatientExistsDialogOpen(false);
        isClosingDialogRef.current = false;
        lastCheckedContactNumberRef.current = "";
        setIsRevisitedPatient(true);

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

        // Fill address fields
        if (patient.address) {
            if (patient.address.country && countriesData?.data) {
                const countryName = String(patient.address.country).toLowerCase();
                const country = countriesData.data.find(
                    (c) => c.name.toLowerCase() === countryName || String(c.id) === String(patient.address?.country)
                );
                if (country) {
                    formik.setFieldValue("country", country.id.toString(), false);
                }
            }

            if (patient.address.state && statesData?.data && formik.values.country) {
                const stateName = patient.address.state.toLowerCase();
                const state = statesData.data.find(
                    (s) => s.name.toLowerCase() === stateName
                );
                if (state) {
                    formik.setFieldValue("state", state.id.toString(), false);
                }
            }

            if (patient.address.city && citiesData?.data && formik.values.state) {
                const cityName = patient.address.city.toLowerCase();
                const city = citiesData.data.find(
                    (c) => c.name.toLowerCase() === cityName
                );
                if (city) {
                    formik.setFieldValue("city", city.id.toString(), false);
                }
            }

            if (patient.address.pinCode) {
                formik.setFieldValue("pinCode", patient.address.pinCode, false);
            }
            if (patient.address.address) {
                formik.setFieldValue("address", patient.address.address, false);
            }
        }

        if (patient.patientType) {
            formik.setFieldValue("patientType", patient.patientType.toUpperCase(), false);
        } else {
            formik.setFieldValue("patientType", "", false);
        }

        if (patient.doctorUserId) {
            formik.setFieldValue("doctor", String(patient.doctorUserId), false);
        } else {
            formik.setFieldValue("doctor", "", false);
        }

        if (patient.isReferral) {
            formik.setFieldValue("referral", "yes", false);

            if (patient.referralSourceInfo) {
                const sourceInfo = patient.referralSourceInfo.toLowerCase();

                if (patient.referralUserId && !isNaN(Number(patient.referralUserId))) {
                    formik.setFieldValue("source", "doctor", false);
                    formik.setFieldValue("doctorSpecificField", String(patient.referralUserId), false);
                } else if (patient.referralName) {
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
                    formik.setFieldValue("source", "other", false);
                    if (patient.referralName) {
                        formik.setFieldValue("referralName", patient.referralName, false);
                    }
                }
            }

            if (patient.referralName) {
                formik.setFieldValue("referralName", patient.referralName, false);
            }
            if (patient.referralMobile) {
                formik.setFieldValue("referralMobile", patient.referralMobile, false);
            }
        } else {
            formik.setFieldValue("referral", "", false);
            formik.setFieldValue("source", "", false);
        }

        formik.setErrors({});
        window.setTimeout(() => {
            void formik.validateForm();
        }, 450);
    }, [formik, countriesData, statesData, citiesData]);

    // Handle add new member
    const handleAddNewMember = useCallback(() => {
        setPatientExistsDialogOpen(false);
        setIsRevisitedPatient(false);
        setDuplicateExceptionDialogOpen(true);
    }, []);

    // Handle duplicate exception dialog close
    const handleDuplicateExceptionDialogClose = useCallback(() => {
        setDuplicateExceptionDialogOpen(false);
        formik.setFieldValue("contactNumber", "");
    }, [formik]);

    // Handle duplicate exception dialog submit
    const handleDuplicateExceptionSubmit = useCallback(async (name: string, relationship: string) => {
        try {
            const existing = getDuplicateExceptionPatients();
            const trimmedName = name.trim();
            const trimmedContact = formik.values.contactNumber.trim();
            const alreadyExists = existing.some(
                p => p.patientName.trim().toLowerCase() === trimmedName.toLowerCase() &&
                    p.contactNo.trim() === trimmedContact
            );

            if (alreadyExists) {
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

            saveDuplicateExceptionPatient(name, formik.values.contactNumber);

            setSuccessMessage(result.message || "Permission request submitted successfully!");
            setShowSuccessDialog(true);

            formik.setFieldValue("contactNumber", "");

            setDuplicateExceptionDialogOpen(false);
            setPatientExistsDialogOpen(false);
            isClosingDialogRef.current = false;
            lastCheckedContactNumberRef.current = "";
        } catch (error: any) {
            console.error("Error requesting duplicate number permission:", error);

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
    }, [requestDuplicateNumberPermission, branchId, userId, formik.values.contactNumber, saveDuplicateExceptionPatient, getDuplicateExceptionPatients]);

    // Handle patient exists dialog close
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
        setIsRevisitedPatient(false);

        formik.setFieldValue("contactNumber", "");

        setTimeout(() => {
            isClosingDialogRef.current = false;
        }, 500);
    }, [patientExistsDialogOpen, formik]);

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

    // State to track right-screen visibility
    const [isRightScreenOpen, setIsRightScreenOpen] = useState(false);

    // Generate patient buttons from pending registrations
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

    // If wallet view is open, show only the wallet view
    if (showWalletView) {
        return (
            <PatientWalletView onClose={() => setShowWalletView(false)} />
        );
    }

    return (
        <AppShell>
            <div className="flex justify-between items-center">
                <div ref={registrationHeadingRef} className="prebooking-icon flex items-center gap-3">
                    <Tooltip
                        content="Patient Information"
                        position="right"
                        delay={0}
                    >
                        <button
                            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            aria-label="Patient Information"
                        >
                            <Image src="/icons/prebookingtoggle.svg" alt="Patient Info Icon" width={32} height={32} />
                        </button>
                    </Tooltip>

                    <PageHeading title="Daycare Registration Hospital" />
                </div>
                <div>
                    <div className="pending_registration flex items-center gap-4">
                        {/* Duplicate exception patient buttons */}
                        {duplicateExceptionPatients.map((patient) => {
                            const status = patient.status || "pending";
                            const isApproved = status === "approved";
                            const isRejected = status === "rejected";
                            const isPending = status === "pending";

                            const borderColor = isApproved ? "border-[#0B8C00]" : isRejected ? "border-[#EF4444]" : "border-[#F59E0B]";
                            const isSelected = selectedApprovedPatientId === patient.id;
                            const bgColor = isSelected && isApproved ? "bg-[rgba(11,140,0,0.35)]" : isApproved ? "bg-[rgba(11,140,0,0.15)]" : isRejected ? "bg-[rgba(239,68,68,0.15)]" : "bg-[#FFF4D126]";
                            const textColor = isSelected && isApproved ? "text-[#0B8C00]" : isApproved ? "text-[#0B8C00]" : isRejected ? "text-[#EF4444]" : "text-[#A56A00]";
                            const dotColor = isApproved ? "bg-[#0B8C00]" : isRejected ? "bg-[#EF4444]" : "bg-[#F4A100]";
                            const dotShadow = isApproved ? "shadow-[0_0_4px_rgba(11,140,0,0.5)]" : isRejected ? "shadow-[0_0_4px_rgba(239,68,68,0.5)]" : "shadow-[0_0_4px_rgba(244,161,0,0.5)]";
                            const tooltipText = isApproved ? "Approved" : isRejected ? "Rejected" : "Pending";
                            const hoverBg = isApproved ? "hover:bg-[rgba(11,140,0,0.2)]" : isRejected ? "hover:bg-[rgba(239,68,68,0.2)]" : "hover:bg-[rgba(245,158,11,0.2)]";
                            const iconSrc = isApproved ? "/icons/ProfileDarkIcon.svg" : "/icons/ProfileIconBrown.svg";
                            const buttonClasses = `py-3 px-6 ${borderColor} border-[1px] ${bgColor} rounded-[16px] flex items-center gap-2 lg:h-[48px] md:h-[36px] cursor-pointer transition-all duration-300 ${hoverBg} hover:opacity-80 relative ${isSelected && isApproved ? "animate-[pulse-border_2s_ease-in-out_infinite]" : ""}`;

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
                                className={`py-3 lg:px-6 px-3 ${patient.bgColor} ${patient.borderColor} border-[1px] rounded-[16px] flex items-center gap-2 lg:h-[48px] md:h-[36px] cursor-pointer transition-all duration-300 ${patient.isActive
                                    ? "hover:bg-[rgba(27, 179, 14, 0.4)] scale-[1.02]"
                                    : "hover:opacity-80 hover:bg-[rgba(11,140,0,0.2)]"
                                    }`}
                                style={patient.isActive ? {
                                    animation: 'pulse-border 2s ease-in-out infinite'
                                } : {}}
                            >
                                <Image src={patient.iconSrc} alt="Patient Icon" width={32} height={32} />
                                <span className={`font-[Inter] font-medium text-sm leading-[120%] text-center text-hide ${patient.textColor}`}>
                                    {patient.name}
                                </span>
                            </button>
                        ))}

                        {/* Add New Patient button */}
                        <button
                            onClick={handleAddNewPatient}
                            className="flex flex-row justify-center items-center py-3 px-6 gap-1 lg:h-[48px] md:h-[36px] border border-[#0B8C00] rounded-[32px] cursor-pointer hover:bg-[#0B8C00]/10 transition-colors"
                        >
                            <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">Add New Patient</span>
                        </button>

                        {/* View List button */}
                        <Link
                            href="/registration/registrationList"
                            className="flex flex-row justify-center items-center py-3 px-6 gap-2 lg:h-[48px] md:h-[36px] border border-[#0B8C00] rounded-[16px] cursor-pointer hover:bg-[#F2F8F2] transition-all duration-300"
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
                            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">View List</span>
                        </Link>
                        <Link
                            href="#"
                            className="right-toggle  py-3 px-6 gap-2  border border-[#0B8C00] lg:h-[48px] md:h-[36px] rounded-[16px] cursor-pointer hover:bg-[#F2F8F2] transition-all duration-300"
                            onClick={(e) => {
                                e.preventDefault();
                                setIsRightScreenOpen(!isRightScreenOpen);
                            }}
                        >
                            {/* <Image src="/icons/prebookingtoggle.svg" alt="Prebooking Icon" width={32} height={32} /> */}
                            <svg width={20} fill="#0b8c00" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M566.6 470.6L470.6 566.6C461.4 575.8 447.7 578.5 435.7 573.5C423.7 568.5 416 556.9 416 544L416 480L96 480C78.3 480 64 465.7 64 448C64 430.3 78.3 416 96 416L416 416L416 352C416 339.1 423.8 327.4 435.8 322.4C447.8 317.4 461.5 320.2 470.7 329.3L566.7 425.3C579.2 437.8 579.2 458.1 566.7 470.6zM73.4 214.6C60.9 202.1 60.9 181.8 73.4 169.3L169.4 73.3C178.6 64.1 192.3 61.4 204.3 66.4C216.3 71.4 224 83.1 224 96L224 160L544 160C561.7 160 576 174.3 576 192C576 209.7 561.7 224 544 224L224 224L224 288C224 300.9 216.2 312.6 204.2 317.6C192.2 322.6 178.5 319.8 169.3 310.7L73.3 214.7z" /></svg>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 h-screen">
                {/* Left Sidebar - Token Panel and Patient Info Panels */}
                {isLeftSidebarOpen && (
                    <div ref={leftSidebarRef} className="w-[20%] transition-all duration-0 ease-in-out flex-shrink-0 space-y-4 small-screens">
                        <TokenPanel
                            onTokenClick={handleTokenClick}
                            selectedTokenId={selectedTokenId}
                            onRefetchReady={(refetch) => {
                                refetchTokensListRef.current = refetch;
                            }}
                        />
                        <JSHealthCardPoints />
                        <PatientOldHistory />
                        <Vouchers />
                    </div>
                )}

                {/* Registration Forms - Dynamic width based on panel visibility */}
                <div
                    ref={formsContainerRef}
                    data-form-container
                    className={`form-screen transition-all duration-0 ease-in-out ${isLeftSidebarOpen ? 'w-[60%]' : 'w-[80%]'}`}
                >
                    {/* Personal Form - Only Step */}
                    <PersonalForm
                        formik={formik}
                        getFormErrors={getFormErrors}
                        scrollToFirstError={scrollToFirstError}
                        onNext={handleNextStep}
                        panelsBranchId={Number(branchId)}
                        sourceOptions={sourceOptions}
                        tvSpecificFieldOptions={tvSpecificFieldOptions}
                        newspaperSpecificFieldOptions={newspaperSpecificFieldOptions}
                        socialMediaSpecificFieldOptions={socialMediaSpecificFieldOptions}
                        onContactNumberChange={handleContactNumberChange}
                        readOnlyFields={selectedTokenId || isRevisitedPatient ? ["patientName", "contactNumber"] : (selectedApprovedPatientId ? ["patientName", "contactNumber"] : [])}
                        submitButtonText="Save"
                    />
                </div>

                <div className="hidden xl:block w-[20%] right-screen">
                    <PersonalDetailsReg />
                    <Vitals />
                    <Doctor />
                    <MedicalDetails />
                    <PatientWalletInformation onViewDetails={() => setShowWalletView(true)} />
                    <Therapy />
                </div>
                {/* Mobile right screen drawer - slides from right on screens below 1280px */}
                <div className={`mobile-fix fixed right-0 top-0 h-screen w-[80%] sm:w-[60%] md:w-[50%] lg:w-[40%] bg-white z-50 transform transition-transform duration-300 overflow-hidden ${isRightScreenOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}>
                    <div className="h-full overflow-y-auto p-3">
                        <PersonalDetailsReg />
                        <Vitals />
                        <Doctor />
                        <MedicalDetails />
                        <PatientWalletInformation onViewDetails={() => setShowWalletView(true)} />
                        <Therapy />
                    </div>
                </div>

                {/* Overlay for mobile right screen - only on screens below 1280px */}
                {isRightScreenOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 "
                        onClick={() => setIsRightScreenOpen(false)}
                    />
                )}
            </div>

            {/* Patient Already Exists Dialog */}
            <PatientAlreadyExistsDialog
                open={patientExistsDialogOpen}
                onClose={handlePatientExistsDialogClose}
                existingPatients={existingPatients}
                onRevisit={handleRevisit}
                onAddNewMember={handleAddNewMember}
            />

            {/* Duplicate Number Exception Dialog */}
            <DuplicateNumberExceptionDialog
                open={duplicateExceptionDialogOpen}
                onClose={handleDuplicateExceptionDialogClose}
                onSubmit={handleDuplicateExceptionSubmit}
                isLoading={isCreatingException}
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
        </AppShell>
    );
}
