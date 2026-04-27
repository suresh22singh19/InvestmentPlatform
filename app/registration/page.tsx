"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
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
import {
    createRegistrationPersonalDetailsSchema,
    DEFAULT_JS_HEALTH_CARD_DIGIT_LENGTH,
    type RegistrationPersonalDetailsFormValues,
} from "@/lib/validation/registrationSchemas";
import {
    buildJsHealthCardSeriesErrorMessage,
    getJsHealthCardDigitCountFromSeries,
    isJsHealthCardNumberInSeries,
    isJsHealthCardSeriesRangeError,
} from "@/lib/validation/jsHealthCardSeries";
import PersonalForm from "./personal";
import PaymentForm, {
    buildConsultancyVoucherRoot,
    type PaymentFormHandle,
    type RegistrationReceiptPayload,
} from "./payment";
import VitalForm from "./vital";
import MedicalForm from "./medical";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import {
    useRegistrationVoucherPanel,
    type RegistrationVoucherPanelItem,
    normalizeRegistrationContactDigits,
} from "@/hooks/useRegistrationVoucherPanel";
import { DEFAULT_REGISTRATION_VOUCHER_TYPE } from "@/lib/api/voucherApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserId, selectUserBranchId, selectRoleCategoryType, selectSelectedBranch } from "@/store/slices/authSlice";
import { useCreateClinicPatientMutation, useCreateAppointmentAndUpdateRegistrationMutation, type ClinicPatientRequest, type CreateAppointmentAndUpdateRegistrationRequest, useRequestDuplicateNumberPermissionMutation } from "@/store/api/registrationApi";
import { useGetStatesQuery, useGetCitiesQuery, useGetCountriesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery } from "@/store/api/publicApi";
import { useGetDoctorsByBranchQuery } from "@/store/api/registrationApi";
import { useGetPanelsQuery, useGetBranchesQuery } from "@/store/api/settingsApi";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { registrationApi } from "@/store/api/registrationApi";
import type { ExistingPatient } from "@/store/api/gateApi";
import { parseHeightToFeetAndInches, parseYesNoDetailsValue, buildYesNoDetailsPayload } from "@/lib/utils/common";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { MessageDialog, Tooltip, ScrollableContainer, FormSelectField } from "@/components/ui";
import PatientAlreadyExistsDialog from "@/components/registration/PatientAlreadyExistsDialog";
import DuplicateNumberExceptionDialog from "@/components/registration/DuplicateNumberExceptionDialog";
import ReferralPatientsDialog from "@/components/registration/ReferralPatientsDialog";
import type { ReferralPatient } from "@/components/registration/ReferralPatientsDialog";
import { useSocket } from "@/hooks/useSocket";
import { usePermission } from "@/hooks/usePermission";
import { registrationListPathFromBranchType } from "@/lib/utils/registrationBranchRoutes";

// LocalStorage key for pending registrations
const PENDING_REGISTRATIONS_KEY = "pendingPatientRegistrations";

/** Pending registrations saved before this version used Personal→Payment→Vitals→Medical. */
const CLINIC_REGISTRATION_STEP_ORDER_VERSION = 2 as const;
/** Maps legacy step index to Personal→Vitals→Medical→Payment. */
const CLINIC_LEGACY_STEP_TO_NEW = [0, 3, 1, 2] as const;

function migrateClinicPendingStep(step: number, version: number | undefined): number {
    if (version === CLINIC_REGISTRATION_STEP_ORDER_VERSION) {
        return Math.min(Math.max(0, step), 3);
    }
    if (step < 0 || step > 3) return step;
    return CLINIC_LEGACY_STEP_TO_NEW[step] ?? step;
}

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
    /** 2 = step order Personal→Vitals→Medical→Payment; omit/1 = legacy Personal→Payment→Vitals→Medical */
    clinicStepOrderVersion?: number;
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const formType: "clinic" | "hospital" = pathname?.includes("/hospital") ? "hospital" : "clinic";
    const registrationPermission = usePermission("Registration");
    const registrationSubPermission = usePermission("Registration", { subModule: "Registration" });
    /** Registration is create-only: require Add (not View) to open this page—view-only cannot use the full form. */
    const canAdd = registrationPermission.canAdd || registrationSubPermission.canAdd;
    const canDownload = registrationPermission.canDownload || registrationSubPermission.canDownload;
    const [currentStep, setCurrentStep] = useState(0); // 0-based index, 0 = Step 01 (Personal Info)
    const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
    const [currentPendingRegistrationId, setCurrentPendingRegistrationId] = useState<string | null>(null); // Track which pending registration is currently loaded
    const [isPreBookingOpen, setIsPreBookingOpen] = useState(false); // Pre Booking panel state (closed by default)
    const [selectedPreBookingId, setSelectedPreBookingId] = useState<string | number | null>(null); // Track which pre-booking is selected
    const [selectedPreBooking, setSelectedPreBooking] = useState<PreBookingItem | null>(null); // Store selected pre-booking data
    const [appliedConsultancyVoucher, setAppliedConsultancyVoucher] = useState<{
        voucherType: string;
        voucher: string;
        benefitMessage: string;
        claimedForContactDigits: string;
        selectionKey: string;
    } | null>(null);
    const paymentFormRef = useRef<PaymentFormHandle | null>(null);

    // Patient exists dialog state
    const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
    const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
    const [isUserLeadData, setIsUserLeadData] = useState(false); // User Lead Data from registrations-and-pre-bookings (show "User Lead Data" + Visit, send userLeadId in clinic-patient)
    const [userLeadId, setUserLeadId] = useState<number | null>(null);
    const [userLeadDialogTitle, setUserLeadDialogTitle] = useState<string | undefined>(undefined);
    const isClosingDialogRef = useRef(false);
    const lastCheckedContactNumberRef = useRef<string>("");
    const lastCheckedAadharCardRef = useRef<string>(""); // Track last checked Aadhar Card to prevent duplicate calls
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const selectedPatientAddressRef = useRef<{
        countryName?: string;
        stateName?: string;
        cityName?: string;
        pinCode?: string;
        tehsil?: string;
        area?: string;
        areaId?: number | string;
    } | null>(null);

    // Referral patients dialog & validation state
    const [referralPatientsDialogOpen, setReferralPatientsDialogOpen] = useState(false);
    const [referralPatients, setReferralPatients] = useState<ReferralPatient[]>([]);
    const [selectedReferralPhoneNumber, setSelectedReferralPhoneNumber] = useState<string>("");
    const [selectedReferralPatient, setSelectedReferralPatient] = useState<ReferralPatient | null>(null);
    const [showReferralNotFoundDialog, setShowReferralNotFoundDialog] = useState(false);
    const [isReferralNameDisabledAfterNotFound, setIsReferralNameDisabledAfterNotFound] = useState(false);
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
    /** Shown after full registration completes from the Payment step (success resets form). */
    const [showRegistrationCompleteDialog, setShowRegistrationCompleteDialog] = useState(false);
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
    const [jsHealthCardAutoFilled, setJsHealthCardAutoFilled] = useState(false); // Track if jsHealthCardNo was auto-filled from API
    // Store the selected patient data from API response for pending registration
    const [selectedRevisitedPatientData, setSelectedRevisitedPatientData] = useState<ExistingPatient | null>(null);

    const authUserBranchId = useAppSelector(selectUserBranchId);
    const headerSelectedBranch = useAppSelector(selectSelectedBranch);
    const roleCategoryType = useAppSelector(selectRoleCategoryType);
    const isRegistrationSuperAdmin = roleCategoryType?.toLowerCase() === "superadmin";
    const [superAdminRegistrationBranch, setSuperAdminRegistrationBranch] = useState("");
    /** After true, skip auto-routing to first branch (e.g. user picked another branch or used ?regBranch=). */
    const superAdminRegListRouteSyncedRef = useRef(false);

    const registrationBranchId = useMemo(() => {
        if (isRegistrationSuperAdmin) {
            const n = parseInt(superAdminRegistrationBranch, 10);
            if (Number.isFinite(n) && n > 0) return n;
            return headerSelectedBranch?.id ?? authUserBranchId ?? 1;
        }
        return headerSelectedBranch?.id ?? authUserBranchId ?? 1;
    }, [
        isRegistrationSuperAdmin,
        superAdminRegistrationBranch,
        headerSelectedBranch?.id,
        authUserBranchId,
    ]);

    const { data: branchesForSuperAdminReg, isLoading: isLoadingSuperAdminBranches } = useGetBranchesQuery(undefined, {
        skip: !isRegistrationSuperAdmin,
    });

    const superAdminRegistrationBranchOptions: SelectOption[] = useMemo(() => {
        const rows = branchesForSuperAdminReg?.data;
        if (!rows?.length) return [];
        return rows.map((b) => {
            const t = (b as { type?: string }).type?.trim() ?? "";
            const typeSuffix =
                t.length > 0 ? ` (${t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()})` : "";
            return { value: String(b.id), label: `${b.name}${typeSuffix}` };
        });
    }, [branchesForSuperAdminReg]);

    useEffect(() => {
        if (!isRegistrationSuperAdmin) return;
        const rows = branchesForSuperAdminReg?.data;
        if (!rows?.length) return;

        const q = searchParams?.get("regBranch");
        if (q && /^\d+$/.test(q)) {
            const n = parseInt(q, 10);
            if (Number.isFinite(n) && n > 0 && superAdminRegistrationBranch !== q) {
                setSuperAdminRegistrationBranch(q);
            }
            superAdminRegListRouteSyncedRef.current = true;
            return;
        }

        if (superAdminRegListRouteSyncedRef.current) return;
        if (!pathname) return;

        const first = rows[0];
        const firstId = Number(first.id);
        if (!Number.isFinite(firstId) || firstId < 1) return;

        const targetPath = registrationListPathFromBranchType((first as { type?: string }).type);
        const onHospitalUrl = pathname.includes("/registration/hospital");
        const wantHospital = targetPath === "/registration/hospital";

        if (superAdminRegistrationBranch !== String(firstId)) {
            setSuperAdminRegistrationBranch(String(firstId));
        }
        if (wantHospital !== onHospitalUrl) {
            router.replace(`${targetPath}?regBranch=${firstId}`);
        }
        superAdminRegListRouteSyncedRef.current = true;
    }, [
        isRegistrationSuperAdmin,
        branchesForSuperAdminReg,
        searchParams,
        pathname,
        router,
        superAdminRegistrationBranch,
    ]);

    useEffect(() => {
        if (!isRegistrationSuperAdmin) return;
        if (!searchParams?.get("regBranch")) return;
        if (!pathname) return;
        router.replace(pathname);
    }, [isRegistrationSuperAdmin, searchParams, pathname, router]);

    const userId = useAppSelector(selectUserId) || 1;

    // Lazy query for checking existing patients
    const [checkExistingPatientsQuery] = registrationApi.useLazyCheckExistingPatientsByPhoneQuery();

    // Lazy query for checking JS Health Card assignment
    const [checkJsHealthCardQuery] = registrationApi.useLazyCheckJsHealthCardAssignmentQuery();
    const [getArogyaCardSeriesQuery] = registrationApi.useLazyGetArogyaCardSeriesQuery();
    const [jsCardSeriesFetchEnabled, setJsCardSeriesFetchEnabled] = useState(false);
    const { data: arogyaCardSeriesForValidation } = registrationApi.useGetArogyaCardSeriesQuery(
        { id: 1 },
        { skip: !jsCardSeriesFetchEnabled },
    );
    const jsHealthCardDigitLength = useMemo(() => {
        const d = arogyaCardSeriesForValidation?.data;
        if (!d?.seriesStart) return DEFAULT_JS_HEALTH_CARD_DIGIT_LENGTH;
        return getJsHealthCardDigitCountFromSeries(d.seriesStart, d.seriesEnd);
    }, [arogyaCardSeriesForValidation]);

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

    // Ref for the PreBooking panel container (for click-outside detection)
    const preBookingPanelRef = useRef<HTMLDivElement>(null);
    const pendingChipsScrollRef = useRef<HTMLDivElement>(null);

    // Enable arrow key navigation for form fields
    // Use the container ref to find all form fields across all steps
    useArrowKeyNavigation(formsContainerRef, true, (fieldName) => {
        // Validate the field when navigating to it
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

            // Only close if panel is open
            if (!isPreBookingOpen) {
                return;
            }

            // Check if click is outside the panel container
            if (
                preBookingPanelRef.current &&
                !preBookingPanelRef.current.contains(event.target as Node) &&
                // Also check if click is not on the toggle button
                !registrationHeadingRef.current?.contains(event.target as Node)
            ) {
                setIsPreBookingOpen(false);
            }
        };

        if (isPreBookingOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isPreBookingOpen]);

    const registrationSteps = useMemo(
        () =>
            appliedConsultancyVoucher
                ? [
                      { number: "Step 01", label: "Personal" },
                      { number: "Step 02", label: "Vitals" },
                      { number: "Step 03", label: "Medical" },
                  ]
                : [
                      { number: "Step 01", label: "Personal" },
                      { number: "Step 02", label: "Vitals" },
                      { number: "Step 03", label: "Medical" },
                      { number: "Step 04", label: "Payment" },
                  ],
        [appliedConsultancyVoucher],
    );

    // Source options for Referral component
    const sourceOptions: SelectOption[] = [
        { value: "TV", label: "TV" },
        { value: "NewsPaper", label: "NewsPaper" },
        { value: "Social Media", label: "Social Media" },
        { value: "Doctor", label: "Doctor" },
        { value: "Referral", label: "Referral" },
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
        { value: "INDIA MART", label: "INDIA MART" },
        { value: "JUST DIAL", label: "JUST DIAL" },
        { value: "WEBSITE", label: "WEBSITE" },
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
                            ...(formType === "clinic"
                                ? { clinicStepOrderVersion: CLINIC_REGISTRATION_STEP_ORDER_VERSION }
                                : {}),
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
                                ...(formType === "clinic"
                                    ? { clinicStepOrderVersion: CLINIC_REGISTRATION_STEP_ORDER_VERSION }
                                    : {}),
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
                        ...(formType === "clinic"
                            ? { clinicStepOrderVersion: CLINIC_REGISTRATION_STEP_ORDER_VERSION }
                            : {}),
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
        tehsil: "",
        area: "",
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
        allergiesDetails: "",
        surgeries: "",
        surgeriesDetails: "",
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

    const registrationValidationSchema = useMemo(
        () => createRegistrationPersonalDetailsSchema({ jsHealthCardDigitLength }),
        [jsHealthCardDigitLength],
    );

    // Formik setup
    const formik = useFormik<RegistrationPersonalDetailsFormValues>({
        initialValues,
        validationSchema: registrationValidationSchema,
        validateOnChange: false,
        validateOnBlur: true,
        onSubmit: async (values) => {
            console.log("Form submitted:", values);
            // Handle form submission here
        },
    });

    const {
        vouchers: registrationVouchers,
        isLoading: isRegistrationVouchersLoading,
        fetchError: registrationVouchersError,
    } = useRegistrationVoucherPanel(formik.values.contactNumber);

    useEffect(() => {
        if (!appliedConsultancyVoucher) return;
        const d = normalizeRegistrationContactDigits(formik.values.contactNumber || "");
        if (d !== appliedConsultancyVoucher.claimedForContactDigits) {
            setAppliedConsultancyVoucher(null);
        }
    }, [formik.values.contactNumber, appliedConsultancyVoucher]);

    useEffect(() => {
        if (appliedConsultancyVoucher && currentStep > 2) {
            setCurrentStep(2);
        }
    }, [appliedConsultancyVoucher, currentStep]);

    useEffect(() => {
        if (!formik.touched.jsHealthCardNo) return;
        void formik.validateField("jsHealthCardNo");
    }, [jsHealthCardDigitLength]);

    // States/cities master APIs only for India (address uses IDs). Non-India: plain text — no API.
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

    // Fetch doctors and panels for matching when patient is selected
    const { data: doctorsData } = useGetDoctorsByBranchQuery(
        { branchId: registrationBranchId },
        { skip: !Number.isFinite(registrationBranchId) || registrationBranchId < 1, refetchOnMountOrArgChange: true }
    );
    const branchDoctorSelectOptions: SelectOption[] = useMemo(() => {
        const rows = doctorsData?.data;
        if (!Array.isArray(rows) || rows.length === 0) return [];
        return rows.map((doctor) => {
            const doctorName = doctor.name || doctor.userName || "";
            const id = doctor.id || "";
            return {
                value: String(id),
                label: doctorName,
            };
        });
    }, [doctorsData]);
    const { data: panelsData } = useGetPanelsQuery(
        formik.values.patientType?.toLowerCase() === "panel" &&
            Number.isFinite(registrationBranchId) &&
            registrationBranchId >= 1
            ? { page: 1, limit: 100, branchId: registrationBranchId }
            : undefined,
        {
            skip:
                formik.values.patientType?.toLowerCase() !== "panel" ||
                !Number.isFinite(registrationBranchId) ||
                registrationBranchId < 1,
        }
    );

    // Billing: master state/city APIs only when billing country is India
    const billingCountryId = formik.values.country && formik.values.country.trim() !== "" ? formik.values.country : "6";
    const billingCountryIsIndia = billingCountryId === "6";
    const { data: billingStatesData } = useGetStatesQuery(
        billingCountryId && billingCountryIsIndia ? { countryId: billingCountryId } : undefined,
        { skip: !billingCountryId || !billingCountryIsIndia }
    );

    const { data: billingCitiesData } = useGetCitiesQuery(
        formik.values.billingState && billingCountryIsIndia ? { stateId: formik.values.billingState } : undefined,
        { skip: !formik.values.billingState || !billingCountryIsIndia }
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

    // Ref to auto-select a pre-booking by ID when the "Patient Already Exists" dialog opens
    const pendingAutoSelectPreBookingIdRef = useRef<number | null>(null);
    /** When true, next userLead-only API result skips the dialog and applies Visit (from /lead-request confirm). */
    const skipUserLeadDialogFromLeadRequestRef = useRef(false);
    const handleRevisitRef = useRef<
        ((patient: ExistingPatient, options?: { fromLeadRequestAuto?: boolean }) => void) | null
    >(null);

    // On mount: check if navigated from pre-booking "Continue Booking" dialog.
    // Set the contact number and trigger the existing-patients API so that the normal
    // priority logic runs. The auto-select effect below picks the right pre-booking.
    useEffect(() => {
        const stored = localStorage.getItem("CONTINUE_BOOKING_DATA");
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as {
                    contactNumber?: string;
                    preBookingId?: number | null;
                    branchId?: number | null;
                };
                localStorage.removeItem("CONTINUE_BOOKING_DATA");
                const { contactNumber, preBookingId, branchId: rawBid } = parsed;
                const branchIdNum =
                    rawBid != null &&
                    Number.isFinite(Number(rawBid)) &&
                    Number(rawBid) > 0
                        ? Number(rawBid)
                        : null;
                if (contactNumber) {
                    formik.setFieldValue("contactNumber", contactNumber, false);
                    pendingAutoSelectPreBookingIdRef.current = preBookingId ?? null;
                    if (isRegistrationSuperAdmin && branchIdNum != null) {
                        setSuperAdminRegistrationBranch(String(branchIdNum));
                        superAdminRegListRouteSyncedRef.current = true;
                    }
                    checkExistingPatients(
                        contactNumber,
                        branchIdNum != null ? { branchId: branchIdNum } : undefined,
                    );
                }
            } catch {
                localStorage.removeItem("CONTINUE_BOOKING_DATA");
            }
        }

        // Check if navigated from Lead Request "Active Leads" confirm button
        const storedLead = localStorage.getItem("ACTIVE_LEAD_DATA");
        if (storedLead) {
            try {
                const parsed = JSON.parse(storedLead) as {
                    contactNumber?: string;
                    source?: string;
                    branchId?: number | null;
                };
                localStorage.removeItem("ACTIVE_LEAD_DATA");
                const { contactNumber, source, branchId: rawLeadBid } = parsed;
                const branchIdNum =
                    rawLeadBid != null &&
                    Number.isFinite(Number(rawLeadBid)) &&
                    Number(rawLeadBid) > 0
                        ? Number(rawLeadBid)
                        : null;
                if (contactNumber) {
                    formik.setFieldValue("contactNumber", contactNumber, false);
                    const titleMap: Record<string, string> = {
                        "active-leads": "Active User Leads Data",
                        "shifted-leads": "Shifted User Leads Data",
                        "confirmed-leads": "Confirmed User Leads Data",
                    };
                    if (source && titleMap[source]) {
                        setUserLeadDialogTitle(titleMap[source]);
                    }
                    if (isRegistrationSuperAdmin && branchIdNum != null) {
                        setSuperAdminRegistrationBranch(String(branchIdNum));
                        superAdminRegListRouteSyncedRef.current = true;
                    }
                    skipUserLeadDialogFromLeadRequestRef.current = true;
                    checkExistingPatients(
                        contactNumber,
                        branchIdNum != null ? { branchId: branchIdNum } : undefined,
                    );
                }
            } catch {
                localStorage.removeItem("ACTIVE_LEAD_DATA");
            }
        }
        // Only run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-select the matching pre-booking when the "Patient Already Exists" dialog opens
    // as a result of the "Continue Booking" flow.
    useEffect(() => {
        if (!patientExistsDialogOpen || existingPatients.length === 0) return;
        if (pendingAutoSelectPreBookingIdRef.current === null) return;

        const targetId = pendingAutoSelectPreBookingIdRef.current;
        pendingAutoSelectPreBookingIdRef.current = null;

        const match = existingPatients.find(
            (p) => p.isPreBooking && (p.preBookingId === targetId || Number(p.preBookingId) === targetId)
        ) ?? existingPatients[0];

        handleRevisit(match);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientExistsDialogOpen, existingPatients]);

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

            const pbExt = preBooking as PreBookingItem & {
                panelId?: number | string | null;
                panel_id?: number | string | null;
                diagnosisId?: number | string | null;
                diagnosis_id?: number | string | null;
                subDiagnosisId?: number | string | null;
                sub_diagnosis_id?: number | string | null;
                symptoms?: string | null;
            };

            const idToFormString = (v: unknown): string => {
                if (v === null || v === undefined || v === "") return "";
                return String(v);
            };

            const normalizedPatientType =
                preBooking.patientType && typeof preBooking.patientType === "string"
                    ? preBooking.patientType.toUpperCase() === "NORMAL"
                        ? "private"
                        : preBooking.patientType.toLowerCase()
                    : "";

            const diagnosisFromApi =
                idToFormString(pbExt.diagnosisId ?? pbExt.diagnosis_id) ||
                (typeof preBooking.diagnosis === "string" ? preBooking.diagnosis : "");

            const subDiagnosisFromApi =
                idToFormString(pbExt.subDiagnosisId ?? pbExt.sub_diagnosis_id) ||
                (typeof preBooking.subDiagnosis === "string" ? preBooking.subDiagnosis : "");

            const rawPanelId = pbExt.panelId ?? pbExt.panel_id;
            const panelIdStr =
                rawPanelId !== null && rawPanelId !== undefined && String(rawPanelId).trim() !== ""
                    ? String(rawPanelId)
                    : "";

            const symptomsFromApi =
                typeof pbExt.symptoms === "string" ? pbExt.symptoms : "";

            // Pre-fill form fields immediately (diagnosis / subDiagnosis / symptoms / panelId applied after batch — order matters for sub-diagnosis options)
            const formUpdates: Partial<RegistrationPersonalDetailsFormValues> = {
                contactNumber: (typeof preBooking.contactNumber === 'string') ? preBooking.contactNumber : "",
                whatsappNo: (typeof preBooking.whatsappNumber === 'string' && preBooking.whatsappNumber) ? preBooking.whatsappNumber : (typeof preBooking.contactNumber === 'string') ? preBooking.contactNumber : "",
                patientName: (typeof preBooking.patientName === 'string') ? preBooking.patientName : "",
                patientNameSelect: (typeof preBooking.patientTitle === 'string' && preBooking.patientTitle) ? preBooking.patientTitle : "",
                age: (typeof preBooking.age === 'string') ? preBooking.age : "",
                emailAddress: (typeof preBooking.emailAddress === 'string') ? preBooking.emailAddress : "",
                pinCode: (typeof preBooking.pinCode === 'string') ? preBooking.pinCode : "",
                address: (typeof preBooking.address === 'string') ? preBooking.address : "",
                addressLine1: (typeof preBooking.addressLine1 === 'string') ? preBooking.addressLine1 : "",
                addressLine2: (typeof preBooking.addressLine2 === 'string') ? preBooking.addressLine2 : "",
                gender: (preBooking.gender && typeof preBooking.gender === 'string') ? preBooking.gender.toLowerCase() : "",
                maritalStatus: (preBooking.maritalStatus && typeof preBooking.maritalStatus === 'string') ? preBooking.maritalStatus.toLowerCase() : "",
                fathersHusbandsName: (typeof preBooking.guardianName === 'string') ? preBooking.guardianName : "",
                fathersHusbandsNameSelect: (typeof preBooking.guardianTitle === 'string' && preBooking.guardianTitle) ? preBooking.guardianTitle : "",
                occupation: (typeof preBooking.occupation === 'string') ? preBooking.occupation : "",
                appointmentDate: (typeof preBooking.appointmentDate === 'string') ? preBooking.appointmentDate : "",
                timeSlot: (typeof preBooking.appointmentTime === 'string') ? preBooking.appointmentTime : ((typeof preBooking.timeSlot === 'string') ? preBooking.timeSlot : ""),
                patientType: normalizedPatientType,
                patientSubType: (typeof preBooking.patientSubType === 'string') ? preBooking.patientSubType : "",
                benificiaryId:
                    preBooking.benificiaryId !== null && preBooking.benificiaryId !== undefined
                        ? String(preBooking.benificiaryId)
                        : "",
                insuranceCompany: (typeof preBooking.insuranceCompany === 'string') ? preBooking.insuranceCompany : "",
                ayushCovered: (typeof preBooking.ayushCovered === 'string') ? preBooking.ayushCovered : "",
                consultationCharges: (typeof preBooking.consultationFee === 'string') ? preBooking.consultationFee : "",
                // Vitals fields: API may send height as "feet.inches" (e.g. "10.9") or total inches
                ...(typeof preBooking.height === 'string' && preBooking.height
                    ? (() => {
                        const { feet, inch } = parseHeightToFeetAndInches(preBooking.height);
                        return { heightFeet: feet, heightInch: inch };
                    })()
                    : { heightFeet: "", heightInch: "" }),
                weight: (typeof preBooking.weight === 'string') ? preBooking.weight : "",
                bloodGroup: (typeof preBooking.bloodGroup === 'string') ? preBooking.bloodGroup : "",
                // Allergies / Surgeries: API returns either "no", "yes", or a free-text detail.
                // Split into the Yes/No button state + the free-text details field for the dialog.
                ...(() => {
                    const { yesNo, details } = parseYesNoDetailsValue(
                        typeof preBooking.allergies === 'string' ? preBooking.allergies : ""
                    );
                    return { allergies: yesNo, allergiesDetails: details };
                })(),
                ...(() => {
                    const { yesNo, details } = parseYesNoDetailsValue(
                        typeof preBooking.surgeries === 'string' ? preBooking.surgeries : ""
                    );
                    return { surgeries: yesNo, surgeriesDetails: details };
                })(),
                dietType: (typeof preBooking.dietType === 'string') ? preBooking.dietType : "",
            };

            // Set form values (skip empty strings; booleans must still apply for toggles)
            Object.keys(formUpdates).forEach((key) => {
                const value = formUpdates[key as keyof typeof formUpdates];
                if (value !== undefined && value !== "") {
                    formik.setFieldValue(key, value, false);
                }
            });

            if (normalizedPatientType === "panel" && panelIdStr) {
                formik.setFieldValue("panelId", panelIdStr, false);
            }

            if (diagnosisFromApi) {
                formik.setFieldValue("diagnosis", diagnosisFromApi, false);
            }
            if (subDiagnosisFromApi) {
                formik.setFieldValue("subDiagnosis", subDiagnosisFromApi, false);
            }
            formik.setFieldValue("symptoms", symptomsFromApi, false);

            // Addiction from pre-bookings-list JSON array string (explicit set — matches handleRevisit path)
            if (typeof preBooking.addiction === "string" && preBooking.addiction.trim()) {
                try {
                    const addictions = JSON.parse(preBooking.addiction);
                    if (Array.isArray(addictions)) {
                        const addictionsLower = addictions.map((a: unknown) => String(a).toLowerCase());
                        formik.setFieldValue("alcohol", addictionsLower.includes("alcohol"), false);
                        formik.setFieldValue("smoking", addictionsLower.includes("smoking"), false);
                        formik.setFieldValue("tobacco", addictionsLower.includes("tobacco"), false);
                        formik.setFieldValue("drugs", addictionsLower.includes("drugs"), false);
                        const otherAddictions = addictions.filter(
                            (a: unknown) =>
                                !["alcohol", "smoking", "tobacco", "drugs"].includes(String(a).toLowerCase())
                        );
                        if (otherAddictions.length > 0) {
                            formik.setFieldValue("addictionOther", true, false);
                            formik.setFieldValue("addictionSpecify", otherAddictions.map(String).join(", "), false);
                        } else {
                            formik.setFieldValue("addictionOther", false, false);
                            formik.setFieldValue("addictionSpecify", "", false);
                        }
                    }
                } catch (e) {
                    console.warn("Failed to parse addiction field:", e);
                }
            }

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
                    // Non-India: state/city are free text from API — set directly (no master ID mapping)
                    if (countryId !== "6") {
                        const st = typeof preBooking.state === "string" ? preBooking.state.trim() : "";
                        const ci = typeof preBooking.city === "string" ? preBooking.city.trim() : "";
                        formik.setFieldValue("state", st, false);
                        formik.setFieldValue("city", ci, false);
                        formik.setFieldValue("tehsil", "", false);
                        formik.setFieldValue("area", "", false);
                    }
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPreBooking, countriesData]);

    // India only: map state name to ID when states are loaded (after country is set)
    useEffect(() => {
        if (formik.values.country !== "6") return;
        if (selectedPreBooking && statesData?.data && formik.values.country && selectedPreBooking.state && typeof selectedPreBooking.state === 'string') {
            const stateName = selectedPreBooking.state.toLowerCase().trim();
            const state = statesData.data.find(
                (s) => s.name.toLowerCase().trim() === stateName
            );
            if (state) {
                const stateId = state.id.toString();
                formik.setFieldValue("state", stateId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPreBooking, statesData, formik.values.country]);

    // India only: map city (district) name to ID when cities are loaded (after state is set)
    useEffect(() => {
        if (formik.values.country !== "6") return;
        if (selectedPreBooking && citiesData?.data && formik.values.state && selectedPreBooking.city && typeof selectedPreBooking.city === 'string') {
            const cityName = selectedPreBooking.city.toLowerCase().trim();
            const city = citiesData.data.find(
                (c) => c.name.toLowerCase().trim() === cityName
            );
            if (city) {
                const cityId = city.id.toString();
                formik.setFieldValue("city", cityId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPreBooking, citiesData, formik.values.state, formik.values.country]);

    // Map tehsil + post office (area) when pre-booking row includes them — same as revisit flow but list API uses diagnosisId / tehsil / area / areaId (India only)
    useEffect(() => {
        if (formik.values.country !== "6") return;
        if (!selectedPreBooking || !formik.values.city || !citiesData?.data) return;

        const pb = selectedPreBooking;
        const tehsilName = typeof pb.tehsil === "string" ? pb.tehsil.trim() : "";
        const areaName = typeof pb.area === "string" ? pb.area.trim() : "";
        const areaIdRaw = pb.areaId ?? (pb as PreBookingItem & { area_id?: number | string }).area_id;

        if (!tehsilName && !areaName && (areaIdRaw === undefined || areaIdRaw === null || String(areaIdRaw).trim() === "")) {
            return;
        }

        const selectedCity = citiesData.data.find((c) => c.id.toString() === formik.values.city);
        if (!selectedCity || !pb.city || typeof pb.city !== "string") return;
        if (selectedCity.name.toLowerCase() !== pb.city.toLowerCase()) return;

        let cancelled = false;
        const districtId = formik.values.city;
        getTehsilsQuery({ districtId })
            .then((result) => {
                if (cancelled || !result.data?.success || !result.data?.data?.length) return;
                const tehsils = result.data.data;
                const matchingTehsil = tehsilName
                    ? tehsils.find((t: { name?: string }) => (t.name || "").toLowerCase() === tehsilName.toLowerCase())
                    : undefined;
                if (!matchingTehsil) return;

                formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);

                return getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                    if (cancelled || !areaResult.data?.success || !areaResult.data?.data) return;
                    const areas = areaResult.data.data;
                    let matchingArea: { id: string | number } | undefined;
                    if (areaIdRaw != null && String(areaIdRaw).trim() !== "") {
                        matchingArea = areas.find((a: { id?: string | number }) => String(a.id) === String(areaIdRaw));
                    }
                    if (!matchingArea && areaName) {
                        matchingArea = areas.find(
                            (a: { name?: string }) => (a.name || "").toLowerCase() === areaName.toLowerCase()
                        );
                    }
                    if (matchingArea) {
                        formik.setFieldValue("area", String(matchingArea.id), false);
                        formik.setFieldError("area", undefined);
                        void formik.validateField("area");
                    }
                });
            })
            .catch((err) => console.error("Pre-booking tehsil/area mapping failed:", err));

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPreBooking, formik.values.city, citiesData, getTehsilsQuery, getAreasQuery]);

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

    const normalizeGeoLabel = (s: string | null | undefined) =>
        (s ?? "")
            .toLowerCase()
            .replace(/\./g, "")
            .replace(/\s+/g, " ")
            .trim();

    // India only: map state name to ID when states are loaded (after country is set) — revisit / lead flows
    useEffect(() => {
        if (formik.values.country !== "6") return;
        if (selectedPatientAddressRef.current?.stateName && statesData?.data && formik.values.country) {
            const want = normalizeGeoLabel(selectedPatientAddressRef.current.stateName);
            let state = statesData.data.find(
                (s) => s.name.toLowerCase() === selectedPatientAddressRef.current?.stateName?.toLowerCase(),
            );
            if (!state && want.length > 0) {
                state = statesData.data.find((s) => normalizeGeoLabel(s.name) === want);
            }
            if (state) {
                const stateId = state.id.toString();
                formik.setFieldValue("state", stateId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientAddressRef.current?.stateName, statesData, formik.values.country]);

    // India only: map city name to ID when cities are loaded (after state is set)
    useEffect(() => {
        if (formik.values.country !== "6") return;
        if (selectedPatientAddressRef.current?.cityName && citiesData?.data && formik.values.state) {
            const wantCity = normalizeGeoLabel(selectedPatientAddressRef.current.cityName);
            let city = citiesData.data.find(
                (c) => c.name.toLowerCase() === selectedPatientAddressRef.current?.cityName?.toLowerCase(),
            );
            if (!city && wantCity.length > 0) {
                city = citiesData.data.find((c) => normalizeGeoLabel(c.name) === wantCity);
            }
            if (city) {
                const cityId = city.id.toString();
                formik.setFieldValue("city", cityId, false);

                // Store cityId temporarily for tehsil/area mapping before clearing ref
                const tehsilName = selectedPatientAddressRef.current?.tehsil;
                const areaName = selectedPatientAddressRef.current?.area;
                const areaIdLead = selectedPatientAddressRef.current?.areaId;

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
                            const wantTehsil = normalizeGeoLabel(tehsilName);
                            let matchingTehsil = tehsils.find(
                                (t: any) => (t.name || "").toLowerCase() === String(tehsilName || "").toLowerCase(),
                            );
                            if (!matchingTehsil && wantTehsil.length > 0) {
                                matchingTehsil = tehsils.find(
                                    (t: any) => normalizeGeoLabel(t.name) === wantTehsil,
                                );
                            }
                            if (matchingTehsil) {
                                formik.setFieldValue("tehsil", matchingTehsil.id.toString(), false);

                                const areaIdStr =
                                    areaIdLead != null && String(areaIdLead).trim() !== ""
                                        ? String(areaIdLead)
                                        : "";
                                if (areaIdStr) {
                                    formik.setFieldValue("area", areaIdStr, false);
                                    formik.setFieldError("area", undefined);
                                    void formik.validateField("area");
                                    void formik.validateForm();
                                    selectedPatientAddressRef.current = null;
                                    return;
                                }

                                // After tehsil is set, map area if available
                                if (areaName && matchingTehsil.id) {
                                    getAreasQuery({ tehsilId: matchingTehsil.id.toString() }).then((areaResult) => {
                                        if (areaResult.data?.success && areaResult.data?.data) {
                                            const areas = areaResult.data.data;
                                            const wantArea = normalizeGeoLabel(areaName);
                                            let matchingArea = areas.find(
                                                (a: any) => (a.name || "").toLowerCase() === String(areaName || "").toLowerCase(),
                                            );
                                            if (!matchingArea && wantArea.length > 0) {
                                                matchingArea = areas.find(
                                                    (a: any) => normalizeGeoLabel(a.name) === wantArea,
                                                );
                                            }
                                            if (matchingArea) {
                                                formik.setFieldValue("area", matchingArea.id.toString(), false);
                                                formik.setFieldError("area", undefined);
                                                void formik.validateField("area");
                                            }
                                            void formik.validateForm();
                                        }
                                    }).catch((error) => {
                                        console.error("Error fetching areas:", error);
                                    });
                                } else {
                                    void formik.validateForm();
                                }
                            }
                        }
                    }).catch((error) => {
                        console.error("Error fetching tehsils:", error);
                    });
                } else {
                    void formik.validateForm();
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
            } else if (sourceLower === "patient" || values.source === "other" || sourceLower === "referral") {
                referralObject = {
                    referralSourceType: "Referral",
                    referralRegistrationId: selectedReferralPatient?.id ? (typeof selectedReferralPatient.id === 'number' ? selectedReferralPatient.id : parseInt(String(selectedReferralPatient.id), 10)) : undefined,
                    referralName: values.referralName || undefined,
                    referralMobile: values.referralMobile || undefined,
                };
            } else {
                // tv | newspaper | social-media
                let referralSourceInfo = "";
                if (values.source === "TV" && values.tvSpecificField) referralSourceInfo = values.tvSpecificField;
                else if (values.source === "NewsPaper" && values.newspaperSpecificField) referralSourceInfo = values.newspaperSpecificField;
                else if (values.source === "Social Media" && values.socialMediaSpecificField) referralSourceInfo = values.socialMediaSpecificField;
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

        // Determine preBookingId and isPreBooking based on selected pre-booking.
        // selectedPreBookingId is set from the "Continue Booking" flow; selectedPreBooking?.id
        // is set from the pre-booking panel.  Prefer whichever is available.
        const rawPreBookingId = selectedPreBooking?.id ?? selectedPreBookingId ?? null;
        const preBookingId = rawPreBookingId != null
            ? (typeof rawPreBookingId === 'number' ? rawPreBookingId : parseInt(String(rawPreBookingId), 10))
            : undefined;
        const isPreBooking = preBookingId != null;

        // Build the API payload (include userLeadId when flow is User Lead Data – from registrations-and-pre-bookings)
        const payload: ClinicPatientRequest = {
            branchId: registrationBranchId,
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
            // patientType: (values.patientType || "").toLowerCase(),
            patientType: values?.patientType ? (values?.patientType).toUpperCase() : "",
            patientSubType: values.patientSubType ? values.patientSubType : null,
            addictionType: addictionType.length > 0 ? addictionType : undefined,
            addictionSpecify: addictionSpecify,
            appointment: {
                patientTokenSource: selectedPreBookingId != null ? "gate" : "reception",
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

            },
            height: (() => {
                const feet = parseFloat(values.heightFeet || "0") || 0;
                const inch = parseFloat(values.heightInch || "0") || 0;
                if (feet <= 0 && inch <= 0) return undefined;
                return `${feet}.${Math.round(inch)}`;
            })(),
            weight: values.weight?.trim() || undefined,
            bloodGroup: values.bloodGroup?.trim() || undefined,
            // "Yes" + details → send details; "No" → send "no"; empty → omit
            allergies: buildYesNoDetailsPayload(values.allergies, (values as any).allergiesDetails),
            surgeries: buildYesNoDetailsPayload(values.surgeries, (values as any).surgeriesDetails),
            dietType: values.dietType?.trim() || undefined,

            lastDayFullDiet: values.lastDayFullDiet?.trim() || undefined,

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

        const vRoot = buildConsultancyVoucherRoot(
            appliedConsultancyVoucher
                ? {
                      voucherType: appliedConsultancyVoucher.voucherType,
                      voucher: appliedConsultancyVoucher.voucher,
                      benefitMessage: appliedConsultancyVoucher.benefitMessage,
                  }
                : null,
        );
        if (vRoot.isConsultancyVoucherApplied === "yes") {
            return {
                ...payload,
                ...vRoot,
                payment: {
                    ...payload.payment,
                    doctorFee: 0,
                    paymentMode: "cash",
                    transactionId: undefined,
                    serviceId: undefined,
                    razorpayPosPaymentLogId: undefined,
                },
                appointment: {
                    ...payload.appointment,
                    doctorFee: undefined,
                },
            };
        }
        return { ...payload, ...vRoot };
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

        // Determine referral source info based on source type (normalize: "TV" -> "tv", "Social Media" -> "social-media", "Referral" -> "referral")
        let referralSourceInfo = "";
        const sourceSlug = values.source?.toLowerCase().replace(/\s+/g, "-");
        // debugger
        if (values.referral?.toLowerCase() === "yes" && values.source) {
            if (sourceSlug === "TV" && values.tvSpecificField) {
                referralSourceInfo = values.tvSpecificField;
            } else if (sourceSlug === "NewsPaper" && values.newspaperSpecificField) {
                referralSourceInfo = values.newspaperSpecificField;
            } else if (sourceSlug === "Social Media" && values.socialMediaSpecificField) {
                referralSourceInfo = values.socialMediaSpecificField;
            } else if (sourceSlug === "Doctor" && values.doctorSpecificField) {
                referralSourceInfo = values.doctorSpecificField;
            } else if ((sourceSlug === "Referral" || sourceSlug === "other") && values.referralName) {
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
            branchId: registrationBranchId,
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
                // patientType: (values.patientType || "").toLowerCase(),
                // panelId:
                //     values.patientType?.toLowerCase() === "panel" && values.panelId
                //         ? parseInt(values.panelId, 10)
                //         : undefined,
                panelId: values?.panelId ? parseInt(values?.panelId, 10) : undefined,
                patientType: values?.patientType ? (values?.patientType).toUpperCase() : "",
                addictionSpecify: addictionSpecify,
                addictionType: addictionType.length > 0 ? addictionType : undefined,
                lastDayFullDiet: values.lastDayFullDiet?.trim() || undefined,
                dietType: values.dietType?.trim() || undefined,
                height: (() => {
                    const feet = parseFloat(values.heightFeet || "0") || 0;
                    const inch = parseFloat(values.heightInch || "0") || 0;
                    if (feet <= 0 && inch <= 0) return undefined;
                    return (feet + inch / 12).toFixed(1);
                })(),
                weight: values.weight?.trim() || undefined,
                bloodGroup: values.bloodGroup?.trim() || undefined,
                // "Yes" + details → send details; "No" → send "no"; empty → omit
                allergies: buildYesNoDetailsPayload(values.allergies, (values as any).allergiesDetails),
                surgeries: buildYesNoDetailsPayload(values.surgeries, (values as any).surgeriesDetails),
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
                patientTokenSource: selectedPreBookingId != null ? "gate" : "reception",
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
        const vRoot = buildConsultancyVoucherRoot(
            appliedConsultancyVoucher
                ? {
                      voucherType: appliedConsultancyVoucher.voucherType,
                      voucher: appliedConsultancyVoucher.voucher,
                      benefitMessage: appliedConsultancyVoucher.benefitMessage,
                  }
                : null,
        );
        if (vRoot.isConsultancyVoucherApplied === "yes") {
            const out: CreateAppointmentAndUpdateRegistrationRequest = {
                ...payload,
                ...vRoot,
                payment: {
                    ...payload.payment,
                    doctorFee: 0,
                    paymentMode: "cash",
                    transactionId: undefined,
                    serviceId: undefined,
                    razorpayPosPaymentLogId: undefined,
                },
                appointment: {
                    ...payload.appointment,
                    doctorFee: "0",
                },
            };
            console.log("CreateAppointmentAndUpdateRegistration API Payload (before call):", JSON.stringify(out, null, 2));
            return out;
        }
        const out = { ...payload, ...vRoot };
        console.log("CreateAppointmentAndUpdateRegistration API Payload (before call):", JSON.stringify(out, null, 2));
        return out;
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

    const finalSubmitInProgressRef = useRef(false);

    type ClinicRegistrationResult = { success: boolean; data?: unknown; message: string };

    const handleFinalSubmit = async (): Promise<ClinicRegistrationResult> => {
        // Prevent multiple submissions while a request or previous final submit is already in progress
        if (formik.isSubmitting || isSubmitting || isUpdatingRegistration || finalSubmitInProgressRef.current) {
            throw new Error("Please wait for the current operation to finish.");
        }
        finalSubmitInProgressRef.current = true;
        try {
            await formik.submitForm();

            let result: ClinicRegistrationResult;

            // If patient already exists (has UHID and registrationId), use the new API
            if (patientUhid && patientRegistrationId) {
                const payload = await mapFormikToCreateAppointmentPayload();
                console.log("CreateAppointmentAndUpdateRegistration API Payload (before call):", JSON.stringify(payload, null, 2));
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

            // Pre-bookings list refresh: handled via createClinicPatient invalidatesTags (Prebookings).
            // Do not call refetch() from an unmounted PreBookingPanel — that throws and masks success.

            // errors throw for caller to show / receipt step handles success UI
            if (!result.success) {
                throw new Error(result.message || "Registration failed. Please try again.");
            }
            return result;
        } catch (error: any) {
            const errorMessage = error?.data?.message || error?.message || "An error occurred during registration. Please try again.";
            throw new Error(errorMessage);
        } finally {
            finalSubmitInProgressRef.current = false;
        }
    };

    const finalizeClinicRegistrationWithReceipt = async (): Promise<RegistrationReceiptPayload> => {
        const result = await handleFinalSubmit();
        const d = result.data as Record<string, unknown> | undefined;
        if (!d || typeof d !== "object") {
            return { uhid: "", invoiceNumber: "" };
        }
        return {
            uhid: d.uhid != null ? String(d.uhid) : "",
            invoiceNumber: d.invoiceNumber != null ? String(d.invoiceNumber) : "",
            invoiceId: typeof d.invoiceId === "number" ? d.invoiceId : d.invoiceId != null ? Number(d.invoiceId) : undefined,
        };
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
        setSelectedPreBookingId(null);
        setSelectedPreBooking(null);
        setAppliedConsultancyVoucher(null);
    };

    const resetRegistrationFormForSuperAdminBranchChange = () => {
        handleResetAfterSuccess();
        setIsUserLeadData(false);
        setUserLeadId(null);
        setUserLeadDialogTitle(undefined);
        setJsHealthCardAutoFilled(false);
        setIsReferralNameDisabledAfterNotFound(false);
        referralPatientSelectedRef.current = false;
        lastCheckedContactNumberRef.current = "";
        lastCheckedAadharCardRef.current = "";
        lastCheckedReferralMobileRef.current = "";
        setIsContactLoading(false);
        setIsReferralMobileLoading(false);
    };

    // Check for existing patients by contact number
    const checkExistingPatients = useCallback(
        async (contactNumber: string, opts?: { branchId?: number }) => {
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

        const branchForQuery =
            opts?.branchId != null &&
            Number.isFinite(Number(opts.branchId)) &&
            Number(opts.branchId) > 0
                ? Number(opts.branchId)
                : registrationBranchId;

        setIsContactLoading(true);
        try {
            const result = await checkExistingPatientsQuery({
                branchId: branchForQuery,
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

            // Map registrations
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
                name: patient.patientName || "",
                branchName: "N/A",
                isPreBooking: false,
                preBookingId: null,
            }));

            // Map pre-bookings – support both snake_case (new API) and camelCase (old API).
            // When pb.registration is present it means this pre-booking is linked to an
            // existing patient record – merge those fields so Revisit fills them & locks them.
            const mappedPreBookings: ExistingPatient[] = (preBookings as any[]).map((pb: any) => {
                const reg = pb.registration ?? null; // nested registration object (may be null)
                const patientName = pb.patient_name ?? pb.patientName ?? "";
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
                // When a registration record is embedded, prefer its id/uhid so the submission
                // targets the correct existing registration.
                const entityId = reg ? (reg.id ?? pb.id ?? 0) : (pb.id ?? 0);
                const entityUhid = reg ? (reg.uhid ?? pb.uhid ?? "") : (pb.uhid ?? "");
                return {
                    id: entityId,
                    sUhid: null,
                    uhid: entityUhid,
                    branchId: pb.branch_id ?? pb.branchId ?? branchForQuery,
                    patientName: reg?.patientName ?? patientName,
                    patientTitle: reg?.patientTitle ?? patientTitle,
                    doctorUserId: reg?.doctorUserId ?? pb.doctor_user_id ?? pb.doctorUserId ?? undefined,
                    gender: reg?.gender ?? pb.gender ?? "",
                    age: reg?.age ?? pb.age ?? "",
                    contactNumber: reg?.contactNumber ?? contactNumber,
                    whatsappNo: reg?.whatsappNo ?? contactNumber,
                    emailAddress: reg?.emailAddress ?? emailAddress,
                    maritalStatus: reg?.maritalStatus ?? maritalStatus,
                    // Only set aadharCardNo / jsHealthCardNo when the registration record exists
                    aadharCardNo: reg?.aadharCardNo ?? undefined,
                    jsHealthCardNo: reg?.jsHealthCardNo ?? null,
                    occupation: reg?.occupation ?? undefined,
                    religion: reg?.religion ?? undefined,
                    specificReligion: reg?.specificReligion ?? null,
                    guardianName,
                    guardianTitle,
                    patientType: reg?.patientType ?? patientType,
                    panelId: reg?.panelId ?? pb.panel_id ?? pb.panelId ?? null,
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
                    name: reg?.patientName ?? patientName,
                    branchName: "N/A",
                    isPreBooking: true,
                    preBookingId: pb.id || null,
                    // Extra fields used by handleRevisit (via [key: string]: unknown)
                    appointmentTime: pb.appointment_time ?? pb.appointmentTime ?? undefined,
                    appointmentDate: pb.appointment_date ?? pb.appointmentDate ?? undefined,
                } as ExistingPatient;
            });

            // Priority: preBookings first. If preBookings exist, show ONLY preBookings.
            // If no preBookings but registrations exist, show only registrations.
            if (preBookings.length > 0) {
                skipUserLeadDialogFromLeadRequestRef.current = false;
                setExistingPatients(mappedPreBookings);
                setIsUserLeadData(false);
                setUserLeadId(null);
                const pendingPbRaw = pendingAutoSelectPreBookingIdRef.current;
                const pendingPbId =
                    pendingPbRaw == null ? null : Number(pendingPbRaw);
                if (pendingPbId != null && Number.isFinite(pendingPbId) && pendingPbId > 0) {
                    const match =
                        mappedPreBookings.find(
                            (p) =>
                                p.isPreBooking &&
                                (Number(p.preBookingId) === pendingPbId ||
                                    p.preBookingId === pendingPbId),
                        ) ?? mappedPreBookings[0];
                    pendingAutoSelectPreBookingIdRef.current = null;
                    setPatientExistsDialogOpen(false);
                    queueMicrotask(() => {
                        handleRevisitRef.current?.(match);
                    });
                } else {
                    setPatientExistsDialogOpen(true);
                }
            } else if (registrations.length > 0) {
                skipUserLeadDialogFromLeadRequestRef.current = false;
                setExistingPatients(mappedRegistrations);
                setIsUserLeadData(false);
                setUserLeadId(null);
                setPatientExistsDialogOpen(true);
            } else if (userLead && Object.keys(userLead).length > 0) {
                // Both registrations and preBookings empty – show "User Lead Data" dialog and send userLeadId in clinic-patient POST
                const userLeadData = userLead as any;
                const nestedAddr = userLeadData.address;
                const hasNestedAddress =
                    nestedAddr != null &&
                    typeof nestedAddr === "object" &&
                    !Array.isArray(nestedAddr) &&
                    Object.keys(nestedAddr as object).length > 0;
                const flatLeadAddress = {
                    id: 0,
                    pinCode: userLeadData.pinCode,
                    city: userLeadData.city,
                    state: userLeadData.state,
                    country: userLeadData.country,
                    address:
                        typeof userLeadData.address === "string"
                            ? userLeadData.address
                            : (nestedAddr as { address?: string } | undefined)?.address,
                    areaId: userLeadData.areaId,
                    area: userLeadData.area,
                    tehsil: userLeadData.tehsil,
                };
                const userLeadAddress = hasNestedAddress
                    ? { ...(nestedAddr as object), ...flatLeadAddress }
                    : flatLeadAddress;
                const transformedUserLead: ExistingPatient = {
                    id: userLeadData.id || 0,
                    sUhid: null,
                    uhid: userLeadData.uhid || "",
                    // Register under the branch selected in UI / query, not the lead's originating branchId from API
                    branchId: branchForQuery,
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
                    diagnosis:
                        userLeadData.diagnosis != null ? String(userLeadData.diagnosis) : undefined,
                };
                setExistingPatients([transformedUserLead]);
                setIsUserLeadData(true);
                if (userLeadData.id) {
                    setUserLeadId(userLeadData.id);
                }
                const autoVisitFromLead = skipUserLeadDialogFromLeadRequestRef.current;
                skipUserLeadDialogFromLeadRequestRef.current = false;
                if (autoVisitFromLead) {
                    setPatientExistsDialogOpen(false);
                    queueMicrotask(() => {
                        handleRevisitRef.current?.(transformedUserLead, { fromLeadRequestAuto: true });
                    });
                } else {
                    setPatientExistsDialogOpen(true);
                }
            } else {
                skipUserLeadDialogFromLeadRequestRef.current = false;
                // Clear the ref if no patients found
                lastCheckedContactNumberRef.current = "";
                setIsUserLeadData(false);
                setUserLeadId(null);
            }
        } catch (error: any) {
            // Handle different error types properly
            const errorMessage = error?.message || error?.data?.message || error?.error || (typeof error === 'string' ? error : String(error));
            console.error("Error checking existing patients:", errorMessage || "Unknown error", error);
            skipUserLeadDialogFromLeadRequestRef.current = false;
            // Clear the ref on error so we can retry if needed
            lastCheckedContactNumberRef.current = "";
            // If API fails, don't show dialog
        } finally {
            setIsContactLoading(false);
        }
    }, [checkExistingPatientsQuery, registrationBranchId]);

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
                branchId: registrationBranchId,
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

                // If both contactNumber and aadharCardNo match the same patient → OK (clear only API \"already exists\" error)
                if (currentContactNumber.length === 10 && matchingPatient) {
                    const currentError = formik.errors.aadharCardNumber;
                    if (currentError === "Aadhar Card No. already exists") {
                        formik.setFieldError("aadharCardNumber", undefined);
                    }
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
                // No registrations found - Aadhar Card doesn't exist; only clear the API \"already exists\" error
                const currentError = formik.errors.aadharCardNumber;
                if (currentError === "Aadhar Card No. already exists") {
                    formik.setFieldError("aadharCardNumber", undefined);
                }
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
    }, [checkExistingPatientsQuery, registrationBranchId, formik]);

    // Check JS Health Card No.: allowed series (public API) then assignment (admin API)
    const checkJsHealthCard = useCallback(async (cardNumber: string) => {
        if (/\d/.test(cardNumber || "")) {
            setJsCardSeriesFetchEnabled(true);
        }
        const trimmedCard = cardNumber.trim();
        if (!trimmedCard || trimmedCard.length !== jsHealthCardDigitLength) {
            const currentError = formik.errors.jsHealthCardNo;
            if (
                currentError === "JS Health Card No. already assigned to another patient" ||
                isJsHealthCardSeriesRangeError(currentError)
            ) {
                formik.setFieldError("jsHealthCardNo", undefined);
            }
            return;
        }
        let inAllowedSeries = true;
        try {
            const seriesResult = await getArogyaCardSeriesQuery({ id: 1 }).unwrap();
            if (seriesResult.success && seriesResult.data) {
                const { seriesStart, seriesEnd } = seriesResult.data;
                if (
                    !isJsHealthCardNumberInSeries(trimmedCard, String(seriesStart), String(seriesEnd))
                ) {
                    inAllowedSeries = false;
                    formik.setFieldError(
                        "jsHealthCardNo",
                        buildJsHealthCardSeriesErrorMessage(String(seriesStart), String(seriesEnd)),
                    );
                    formik.setFieldTouched("jsHealthCardNo", true, false);
                }
            }
        } catch {
            const e = formik.errors.jsHealthCardNo;
            if (isJsHealthCardSeriesRangeError(e)) {
                formik.setFieldError("jsHealthCardNo", undefined);
            }
        }
        if (!inAllowedSeries) {
            return;
        }
        const seriesErr = formik.errors.jsHealthCardNo;
        if (isJsHealthCardSeriesRangeError(seriesErr)) {
            formik.setFieldError("jsHealthCardNo", undefined);
        }
        try {
            const result = await checkJsHealthCardQuery({ cardNumber: trimmedCard }).unwrap();
            if (result.data?.patient) {
                formik.setFieldError("jsHealthCardNo", "JS Health Card No. already assigned to another patient");
                formik.setFieldTouched("jsHealthCardNo", true, false);
            } else {
                const currentError = formik.errors.jsHealthCardNo;
                if (currentError === "JS Health Card No. already assigned to another patient") {
                    formik.setFieldError("jsHealthCardNo", undefined);
                }
            }
        } catch {
            // If API fails, don't block the user
        }
    }, [checkJsHealthCardQuery, getArogyaCardSeriesQuery, formik, jsHealthCardDigitLength]);

    // Auto-fill jsHealthCardNo from the JS Health Card API response (only when field is empty)
    const handleJsHealthCardFetched = useCallback((cardNumber: string) => {
        if (/\d/.test(cardNumber || "")) {
            setJsCardSeriesFetchEnabled(true);
        }
        if (!formik.values.jsHealthCardNo || formik.values.jsHealthCardNo.trim() === "") {
            formik.setFieldValue("jsHealthCardNo", cardNumber, false);
            setJsHealthCardAutoFilled(true);
        }
    }, [formik]);

    // Clear auto-fill flag when patient is deselected / form is reset
    useEffect(() => {
        if (!patientUhid) {
            setJsHealthCardAutoFilled(false);
        }
    }, [patientUhid]);

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

            const patients = result.data || [];

            // If patients exist → open selection dialog
            if (patients.length > 0) {
                setReferralPatients(patients);
                setSelectedReferralPhoneNumber(phoneNumber);
                setReferralPatientsDialogOpen(true);
                setIsReferralNameDisabledAfterNotFound(false);
            } else {
                // No patients found → show "Patient not found" dialog
                setReferralPatients([]);
                setSelectedReferralPhoneNumber(phoneNumber);
                setShowReferralNotFoundDialog(true);
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
        // When user edits mobile manually, re-enable Referral Name until we know result
        if (!value || value.length === 0) {
            lastCheckedReferralMobileRef.current = "";
            setIsReferralNameDisabledAfterNotFound(false);
            return;
        }

        // Check when referral mobile reaches 10 digits
        if (value.length === 10) {
            checkReferralPatients(value);
        } else {
            // Clear the ref and re-enable Referral Name if incomplete
            lastCheckedReferralMobileRef.current = "";
            setIsReferralNameDisabledAfterNotFound(false);
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

    // Handle close for "Patient not found" dialog
    const handleReferralNotFoundDialogClose = useCallback(() => {
        setShowReferralNotFoundDialog(false);
        lastCheckedReferralMobileRef.current = "";

        // Clear mobile and disable Referral Name for this attempt
        formik.setFieldValue("referralMobile", "", false);
        setSelectedReferralPhoneNumber("");
        setSelectedReferralPatient(null);
        setIsReferralNameDisabledAfterNotFound(true);
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

    const handleClaimConsultancyVoucher = useCallback(
        (item: RegistrationVoucherPanelItem) => {
            const d = normalizeRegistrationContactDigits(formik.values.contactNumber || "");
            if (d.length !== 10) return;
            setAppliedConsultancyVoucher({
                voucherType: item.type?.trim() || DEFAULT_REGISTRATION_VOUCHER_TYPE,
                voucher: item.voucherCode,
                benefitMessage: (item.description || item.title || "").trim(),
                claimedForContactDigits: d,
                selectionKey: `${item.voucherCode}-${item.id}`,
            });
        },
        [formik.values.contactNumber],
    );

    // Handle revisit button click from dialog (or "Visit" for User Lead Data)
    const handleRevisit = useCallback(
        (patient: ExistingPatient, options?: { fromLeadRequestAuto?: boolean }) => {
            const userLeadFlow = options?.fromLeadRequestAuto === true || isUserLeadData;
            setPatientExistsDialogOpen(false);
            isClosingDialogRef.current = false;
            lastCheckedContactNumberRef.current = "";

            if (userLeadFlow) {
                // User Lead Data: use clinic-patient (new patient) flow and send userLeadId in POST
                setIsRevisitedPatient(false);
                setPatientUhid("");
                setPatientRegistrationId(null);
                setSelectedPreBookingId(null);
                // userLeadId already set when dialog opened – keep it for payload
            } else if (patient.isPreBooking && patient.preBookingId) {
                // Pre-booking patient: always track the pre-booking ID for the payload.
                setSelectedPreBookingId(patient.preBookingId);
                if (patient.uhid) {
                    // Linked to an existing registration → update that registration
                    setIsRevisitedPatient(true);
                    setPatientUhid(patient.uhid);
                    setPatientRegistrationId(patient.id ?? null);
                } else {
                    // Brand-new patient from pre-booking → create new registration
                    setIsRevisitedPatient(false);
                    setPatientUhid("");
                    setPatientRegistrationId(null);
                }
            } else {
                setIsRevisitedPatient(true);
                setSelectedPreBookingId(null);
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
            // Payment + Medical fields (legacy comment: step 2 Payment / step 4 Medical)
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
            // Fill Medical/Vital fields (clinic: Vitals+Medical steps; hospital: combined step)
            if (patient.height) {
                const { feet, inch } = parseHeightToFeetAndInches(patient.height);
                if (feet) formik.setFieldValue("heightFeet", feet, false);
                if (inch) formik.setFieldValue("heightInch", inch, false);
            }
            if (patient.weight) {
                formik.setFieldValue("weight", patient.weight, false);
            }
            if (patient.bloodGroup) {
                formik.setFieldValue("bloodGroup", patient.bloodGroup, false);
            }
            if (patient.allergies) {
                const { yesNo, details } = parseYesNoDetailsValue(patient.allergies);
                if (yesNo) formik.setFieldValue("allergies", yesNo, false);
                formik.setFieldValue("allergiesDetails", details, false);
            }
            if (patient.surgeries) {
                const { yesNo, details } = parseYesNoDetailsValue(patient.surgeries);
                if (yesNo) formik.setFieldValue("surgeries", yesNo, false);
                formik.setFieldValue("surgeriesDetails", details, false);
            }
            if (patient.dietType) {
                formik.setFieldValue("dietType", patient.dietType, false);
            }

            // Fill Diagnosis / Medical fields (clinic Medical step)
            if (patient.diagnosis) {
                formik.setFieldValue("diagnosis", String(patient.diagnosis), false);
            }
            if (patient.subDiagnosis) {
                formik.setFieldValue("subDiagnosis", String(patient.subDiagnosis), false);
            }
            if (patient.symptoms) {
                formik.setFieldValue("symptoms", patient.symptoms, false);
            }

            // Fill Addiction checkboxes (addictionType is an array via [key: string]: unknown)
            const patientAddictionType = (patient as any).addictionType as string[] | undefined;
            if (Array.isArray(patientAddictionType) && patientAddictionType.length > 0) {
                const addictionsLower = patientAddictionType.map((a: string) => a.toLowerCase());
                formik.setFieldValue("alcohol", addictionsLower.includes("alcohol"), false);
                formik.setFieldValue("smoking", addictionsLower.includes("smoking"), false);
                formik.setFieldValue("tobacco", addictionsLower.includes("tobacco"), false);
                formik.setFieldValue("drugs", addictionsLower.includes("drugs"), false);
                const otherAddictions = patientAddictionType.filter(
                    (a: string) => !["alcohol", "smoking", "tobacco", "drugs"].includes(a.toLowerCase())
                );
                if (otherAddictions.length > 0) {
                    formik.setFieldValue("addictionOther", true, false);
                    formik.setFieldValue("addictionSpecify", (patient as any).addictionSpecify || otherAddictions.join(", "), false);
                }
            } else {
                // Also handle raw JSON string (from pre-booking panel path)
                const rawAddiction = (patient as any).addiction;
                if (typeof rawAddiction === "string" && rawAddiction) {
                    try {
                        const parsed = JSON.parse(rawAddiction);
                        if (Array.isArray(parsed)) {
                            const addictionsLower = parsed.map((a: string) => a.toLowerCase());
                            formik.setFieldValue("alcohol", addictionsLower.includes("alcohol"), false);
                            formik.setFieldValue("smoking", addictionsLower.includes("smoking"), false);
                            formik.setFieldValue("tobacco", addictionsLower.includes("tobacco"), false);
                            formik.setFieldValue("drugs", addictionsLower.includes("drugs"), false);
                            const others = parsed.filter((a: string) => !["alcohol", "smoking", "tobacco", "drugs"].includes(a.toLowerCase()));
                            if (others.length > 0) {
                                formik.setFieldValue("addictionOther", true, false);
                                formik.setFieldValue("addictionSpecify", (patient as any).addictionSpecify || others.join(", "), false);
                            }
                        }
                    } catch { /* ignore */ }
                }
            }

            // Fill address fields (including User Lead address which may use different shape)
            if (patient.address) {
                const addr = patient.address as any;
                let revisitCountryId: string | null = null;

                // Map country name to ID if countries data is available
                if (addr.country && countriesData?.data) {
                    const countryName = String(addr.country).toLowerCase();
                    const country = countriesData.data.find(
                        (c) => c.name.toLowerCase() === countryName
                    );
                    if (country) {
                        revisitCountryId = country.id.toString();
                        formik.setFieldValue("country", revisitCountryId, false);
                    } else {
                        revisitCountryId = addr.country === "101" ? "6" : String(addr.country);
                        formik.setFieldValue("country", revisitCountryId, false);
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

                // Non-India: state/city are free text from API — set directly; India: ref drives ID mapping in effects
                if (revisitCountryId != null && revisitCountryId !== "6") {
                    formik.setFieldValue("state", addr.state != null ? String(addr.state).trim() : "", false);
                    formik.setFieldValue("city", addr.city != null ? String(addr.city).trim() : "", false);
                    formik.setFieldValue("tehsil", "", false);
                    formik.setFieldValue("area", "", false);
                    selectedPatientAddressRef.current = {
                        pinCode: addr.pinCode,
                        tehsil: addr.tehsil,
                        area: addr.area,
                        areaId: addr.areaId,
                    };
                } else {
                    selectedPatientAddressRef.current = {
                        ...selectedPatientAddressRef.current,
                        stateName: addr.state,
                        cityName: addr.city,
                        pinCode: addr.pinCode,
                        tehsil: addr.tehsil,
                        area: addr.area,
                        areaId: addr.areaId,
                    };
                }
                if (addr.pinCode) {
                    formik.setFieldValue("pinCode", String(addr.pinCode), false);
                }
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

            // Set time slot from pre-booking appointment_time (available via [key: string]: unknown)
            const pbAppointmentTime = (patient as any).appointmentTime ?? (patient as any).timeSlot;
            if (pbAppointmentTime) {
                formik.setFieldValue("timeSlot", pbAppointmentTime, false);
            }
            // Set appointment date if available
            const pbAppointmentDate = (patient as any).appointmentDate;
            if (pbAppointmentDate) {
                formik.setFieldValue("appointmentDate", pbAppointmentDate, false);
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

            // Clear stale errors. Do not validate on the same tick as async tehsil/area — that re-sets "Post Office required" before IDs load.
            formik.setErrors({});
            window.setTimeout(() => {
                void formik.validateForm();
            }, 450);
        },
        [formik, isUserLeadData]
    );

    handleRevisitRef.current = handleRevisit;

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
                branchId: registrationBranchId || 1,
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
    }, [requestDuplicateNumberPermission, registrationBranchId, userId, formik.values.contactNumber, formType, saveDuplicateExceptionPatient, getDuplicateExceptionPatients]);

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
        setUserLeadDialogTitle(undefined);

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
                        clinicStepOrderVersion: CLINIC_REGISTRATION_STEP_ORDER_VERSION,
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
                        clinicStepOrderVersion: CLINIC_REGISTRATION_STEP_ORDER_VERSION,
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

        // Set the current step (migrate legacy Personal→Payment→Vitals→Medical indices)
        setCurrentStep(
            pendingReg.formType === "clinic"
                ? migrateClinicPendingStep(pendingReg.currentStep, pendingReg.clinicStepOrderVersion)
                : pendingReg.currentStep
        );

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

    // Ref → target by sequence (Step 01 Personal: all required fields and selects in form order). First invalid gets focus in this order.
    const REGISTRATION_FIELD_ORDER: readonly string[] = [
        "contactNumber",
        "patientNameSelect",        // Title (select)
        "patientName",              // Patient Name (input)
        "fathersHusbandsNameSelect", // Father's/Husband's Title (select)
        "fathersHusbandsName",       // Father's/Husband's Name (input)
        "age",
        "gender",                   // Gender (select)
        "maritalStatus",            // Marital Status (select)
        "religion",                 // Religion (select)
        "specificReligion",
        "occupation",
        "emailAddress",
        "jsHealthCardNo",
        "aadharCardNumber",
        "whatsappNo",
        "pinCode",
        "country",                  // Country (select)
        "state",                    // State (select)
        "city",                     // District (select)
        "tehsil",                   // Tehsil/Area (select)
        "area",                     // Post Office (select)
        "address",
        "addressLine1",
        "addressLine2",
        "patientType",              // Patient Type (select/buttons)
        "panelId",                  // Panel (select, when Panel)
        "patientSubType",
        "benificiaryId",
        "insuranceCompany",
        "ayushCovered",
        "referral",                 // Referral (select)
        "source",                   // Source (select)
        "tvSpecificField",
        "newspaperSpecificField",
        "socialMediaSpecificField",
        "doctorSpecificField",
        "referralName",
        "referralMobile",
        "doctor",                   // Doctor (select)
        "appointmentDate",
        "timeSlot",                 // Time Slot (select)
    ];

    // errorsOverride: when provided (e.g. step1 errors from Personal form), use it so first error is chosen by REGISTRATION_FIELD_ORDER.
    const scrollToFirstError = (errorsOverride?: Record<string, string>) => {
        const errors = errorsOverride ?? getFormErrors();
        if (Object.keys(errors).length === 0) return;

        const firstErrorKey = REGISTRATION_FIELD_ORDER.find((key) => errors[key]) ?? Object.keys(errors)[0];
        const element = document.querySelector(`[data-field="${firstErrorKey}"]`);
        if (element instanceof HTMLElement) {
            setTimeout(() => {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                    element.focus();
                } else {
                    const inputOrTextarea = element.querySelector("input, textarea");
                    if (inputOrTextarea instanceof HTMLInputElement || inputOrTextarea instanceof HTMLTextAreaElement) {
                        setTimeout(() => inputOrTextarea.focus(), 150);
                    } else {
                        const triggerButton = element.querySelector('button[type="button"]');
                        if (triggerButton instanceof HTMLElement) {
                            setTimeout(() => triggerButton.focus(), 150);
                        }
                    }
                }
            }, 100);
        }
    };

    // State to track right-screen visibility
    const [isRightScreenOpen, setIsRightScreenOpen] = useState(false);

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

    useLayoutEffect(() => {
        const el = pendingChipsScrollRef.current;
        if (!el) return;
        el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    }, [pendingRegistrationButtons.length, duplicateExceptionPatients.length]);

    if (!canAdd) {
        return (
            <AppShell>
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                    You don&apos;t have permission to add patient registrations. Ask an administrator to grant{" "}
                    <strong>Add</strong> on <strong>Registration</strong> (sub-module Registration).
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="flex justify-between items-center gap-4 min-w-0">
                <div ref={registrationHeadingRef} className="prebooking-icon flex items-center gap-3 shrink-0 min-w-0" onClick={() => setIsPreBookingOpen(!isPreBookingOpen)}>
                    <Tooltip
                        content={formType === "clinic" ? "Pre Booking" : "Token"}
                        position="right"

                    >
                        <button
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            aria-label={formType === "clinic" ? "Pre Booking" : "Token"}
                        >
                            <Image src="/icons/prebookingtoggle.svg" alt="Prebooking Icon" width={32} height={32} />
                        </button>
                    </Tooltip>

                    <PageHeading title="Registration" />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                    <ScrollableContainer
                        ref={pendingChipsScrollRef}
                        maxHeight="66px"
                        overflowY="hidden"
                        className="pending_registration-scroll min-w-0 max-w-full flex-1 overflow-x-auto pb-1 "
                    >
                        <div className="pending_registration flex min-h-[48px] w-max min-w-full flex-nowrap items-center justify-end gap-4 pb-1 pt-1 pr-1">
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
                                const buttonClasses = `h-full min-h-0 w-max shrink-0 overflow-visible py-3 px-6 ${borderColor} border-[1px] ${bgColor} rounded-[16px] flex items-center gap-2 cursor-pointer transition-all duration-300 ${hoverBg} hover:opacity-80 relative ${isSelected && isApproved ? "animate-[pulse-border_2s_ease-in-out_infinite]" : ""
                                    }`;

                                return (
                                    <span
                                        key={patient.id}
                                        className="relative inline-flex shrink-0 items-stretch overflow-visible md:h-[36px] lg:h-[48px]"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isApproved) {
                                                    handleLoadApprovedPatient(patient);
                                                }
                                            }}
                                            className={buttonClasses}
                                        >
                                            <Tooltip content={patient.patientName || ""} position="top">
                                                <span className="flex min-w-0 flex-1 items-center gap-2">
                                                    <Image src={iconSrc} alt="Patient Icon" width={32} height={32} className="shrink-0" />
                                                    <span className={`min-w-0 max-w-[180px] truncate text-center font-[Inter] text-sm font-medium leading-[120%] ${textColor}`}>
                                                        {patient.patientName}
                                                    </span>
                                                </span>
                                            </Tooltip>
                                        </button>
                                        {/* Dot on top border; wrapper height matches pending chips (no extra pt-*) */}
                                        <span className="pointer-events-auto absolute right-4 top-0 z-20 inline-flex -translate-y-1/2">
                                            <Tooltip content={tooltipText} position="top" delay={0}>
                                                <span
                                                    className={`box-border block h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full border-2 border-white ${dotColor} ${dotShadow}`}
                                                />
                                            </Tooltip>
                                        </span>
                                    </span>
                                );
                            })}

                            {/* Pending registration buttons (green buttons only) */}
                            {pendingRegistrationButtons.map((patient) => (
                                <button
                                    key={patient.id}
                                    onClick={() => handleLoadPendingRegistration(patient.registration)}
                                    className={`shrink-0 py-3 lg:px-6 px-3 ${patient.bgColor} ${patient.borderColor} border-[1px] rounded-[16px] flex items-center gap-2 lg:h-[48px] md:h-[36px] cursor-pointer transition-all duration-300 ${patient.isActive
                                        ? "hover:bg-[rgba(27, 179, 14, 0.4)] scale-[1.02]"
                                        : "hover:opacity-80 hover:bg-[rgba(11,140,0,0.2)]"
                                        }`}
                                    style={patient.isActive ? {
                                        animation: 'pulse-border 2s ease-in-out infinite'
                                    } : {}}
                                >
                                    <Tooltip content={patient.name || ""} position="top">
                                        <span className="flex items-center gap-2 min-w-0 flex-1" >
                                            <Image src={patient.iconSrc} alt="Patient Icon" width={32} height={32} className="shrink-0" />
                                            <span className={`font-[Inter] font-medium text-sm leading-[120%] text-center text-hide ${patient.textColor} min-w-0 max-w-[180px] truncate`}>
                                                {patient.name}
                                            </span>
                                        </span>
                                    </Tooltip>
                                </button>
                            ))}
                        </div>
                    </ScrollableContainer>
                    <div className="flex shrink-0 flex-nowrap items-center gap-4">
                        {isRegistrationSuperAdmin && superAdminRegistrationBranchOptions.length > 0 ? (
                            <div className="w-[300px] max-w-[min(300px,100vw)] shrink-0">
                                <FormSelectField
                                    label=""
                                    hideLabel
                                    options={superAdminRegistrationBranchOptions}
                                    value={superAdminRegistrationBranch || String(registrationBranchId)}
                                    onChange={(val) => {
                                        const nextStr = Array.isArray(val) ? val[0] : val ?? "";
                                        const nextNum = parseInt(String(nextStr), 10);
                                        if (!Number.isFinite(nextNum) || nextNum < 1) return;
                                        const rows = branchesForSuperAdminReg?.data;
                                        const b = rows?.find((x) => Number(x.id) === nextNum);
                                        const targetPath = registrationListPathFromBranchType(
                                            (b as { type?: string }).type,
                                        );
                                        const onHospitalUrl =
                                            pathname?.includes("/registration/hospital") ?? false;
                                        const wantHospital = targetPath === "/registration/hospital";
                                        if (wantHospital !== onHospitalUrl) {
                                            if (nextNum !== registrationBranchId) {
                                                resetRegistrationFormForSuperAdminBranchChange();
                                            }
                                            router.replace(`${targetPath}?regBranch=${nextNum}`);
                                            return;
                                        }
                                        if (nextNum !== registrationBranchId) {
                                            resetRegistrationFormForSuperAdminBranchChange();
                                        }
                                        setSuperAdminRegistrationBranch(String(nextNum));
                                    }}
                                    placeholder={isLoadingSuperAdminBranches ? "Loading branches…" : "Select Branch"}
                                    mode="single"
                                    background="normal"
                                    width={300}
                                    disabled={isLoadingSuperAdminBranches}
                                />
                            </div>
                        ) : null}
                        <button
                            type="button"
                            onClick={handleAddNewPatient}
                            className="flex flex-row justify-center items-center py-3 px-6 gap-1 lg:h-[48px] md:h-[36px] border border-[#0B8C00] rounded-[32px] cursor-pointer hover:bg-[#0B8C00]/10 transition-colors"
                        >
                            <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                            <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">Add New Patient</span>
                        </button>
                        {/* View List button */}
                        {/* <Link
                            href="/registration/registrationList"
                            className="flex flex-row justify-center items-center py-3 px-6 gap-2 lg:h-[48px] md:h-[36px]  border border-[#0B8C00] rounded-[16px] cursor-pointer hover:bg-[#F2F8F2] transition-all duration-300"
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
                        </Link> */}

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
                {/* Pre Booking Panel - Conditionally rendered */}
                {isPreBookingOpen && (
                    <div ref={preBookingPanelRef} className="w-[20%] transition-all duration-0 ease-in-out flex-shrink-0 small-screens">
                        <PreBookingPanel
                            branchId={registrationBranchId}
                            onPreBookingClick={handlePreBookingClick}
                            selectedPreBookingId={selectedPreBookingId}
                        />
                    </div>
                )}

                {/* Registration Steps and Forms - Dynamic width based on Pre Booking panel visibility */}
                <div
                    ref={formsContainerRef}
                    data-form-container
                    className={`form-screen transition-all duration-0 ease-in-out ${isPreBookingOpen ? 'w-[60%]' : 'w-[80%]'}`}
                >
                    <RegistrationSteps steps={registrationSteps} currentStep={currentStep} />

                    {/* Conditional rendering based on current step */}
                    {currentStep === 0 && (
                        <PersonalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            scrollToFirstError={scrollToFirstError}
                            onNext={handleNextStep}
                            panelsBranchId={registrationBranchId}
                            branchDoctorOptions={branchDoctorSelectOptions}
                            sourceOptions={sourceOptions}
                            tvSpecificFieldOptions={tvSpecificFieldOptions}
                            newspaperSpecificFieldOptions={newspaperSpecificFieldOptions}
                            socialMediaSpecificFieldOptions={socialMediaSpecificFieldOptions}
                            onContactNumberChange={handleContactNumberChange}
                            onAadharCardNumberChange={(value) => checkExistingAadharCard(value)}
                            onJsHealthCardNoChange={(value) => checkJsHealthCard(value)}
                            onReferralMobileChange={handleReferralMobileChange}
                            readOnlyFields={(() => {
                                let baseFields: string[] = [];

                                if (isUserLeadData) {
                                    // For user lead data: lock fields only if original API data had values
                                    if (selectedRevisitedPatientData?.contactNumber?.trim()) baseFields.push("contactNumber");
                                    if (selectedRevisitedPatientData?.patientName?.trim()) baseFields.push("patientName");
                                    if (selectedRevisitedPatientData?.aadharCardNo?.trim()) baseFields.push("aadharCardNumber");
                                } else if (selectedPreBookingId || isRevisitedPatient) {
                                    // For pre-booking: only lock Aadhar if the pre-booking data had Aadhar when loaded (so user can fill it when empty)
                                    const preBookingHadAadhar = selectedPreBookingId && selectedPreBooking && String((selectedPreBooking as { aadharCardNo?: string })?.aadharCardNo ?? "").trim() !== "";
                                    // For revisit: only lock Aadhar if the existing patient had Aadhar when loaded
                                    const revisitHadAadhar = isRevisitedPatient && !!(selectedRevisitedPatientData?.aadharCardNo?.trim());
                                    const lockAadhar = preBookingHadAadhar || revisitHadAadhar;
                                    // Lock JS Health Card No. if patient already has it OR it was auto-filled from API
                                    const lockJsCard = !!(selectedRevisitedPatientData?.jsHealthCardNo?.trim()) || jsHealthCardAutoFilled;
                                    baseFields = ["patientName", "contactNumber"];
                                    if (lockAadhar) baseFields.push("aadharCardNumber");
                                    if (lockJsCard) baseFields.push("jsHealthCardNo");
                                } else if (selectedApprovedPatientId) {
                                    baseFields = ["patientName", "contactNumber"];
                                }

                                // Add referral fields if patient is selected or dialog is open
                                const referralFields = selectedReferralPatient
                                    ? ["referralName", "referralMobile"]
                                    : (referralPatientsDialogOpen ? ["referralMobile"] : []);

                                // When referral mobile has no registered patient, keep Referral Name disabled
                                const referralNameDisabledFromNotFound = isReferralNameDisabledAfterNotFound ? ["referralName"] : [];

                                return [...baseFields, ...referralFields, ...referralNameDisabledFromNotFound];
                            })()}
                            hideReferral={!!patientUhid && patientUhid.trim() !== ""}
                            isContactLoading={isContactLoading}
                            isReferralMobileLoading={isReferralMobileLoading}
                            isNextDisabled={!canAdd}
                        />
                    )}

                    {currentStep === 1 && (
                        <VitalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onNext={handleNextStep}
                            onBack={handleBackSteps}
                            branchId={registrationBranchId}
                        />
                    )}

                    {currentStep === 2 && (
                        <MedicalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onBack={handleBackSteps}
                            onNext={appliedConsultancyVoucher ? undefined : handleNextStep}
                            onSubmit={
                                appliedConsultancyVoucher
                                    ? () => void paymentFormRef.current?.runDirectClinicRegistration()
                                    : undefined
                            }
                            showInternalSuccessDialog={false}
                            isSubmitting={isSubmitting || isUpdatingRegistration}
                        />
                    )}

                    {(currentStep === 3 || appliedConsultancyVoucher) && (
                        <div
                            className={
                                appliedConsultancyVoucher && currentStep !== 3
                                    ? "sr-only pointer-events-none absolute h-0 w-0 overflow-hidden"
                                    : undefined
                            }
                            aria-hidden={appliedConsultancyVoucher && currentStep !== 3 ? true : undefined}
                        >
                            <PaymentForm
                                ref={paymentFormRef}
                                formik={formik}
                                getFormErrors={getFormErrors}
                                onFinalizeClinicRegistration={finalizeClinicRegistrationWithReceipt}
                                onPostSuccessReceiptClose={() => setShowRegistrationCompleteDialog(true)}
                                onBack={handleBackSteps}
                                patientUhid={patientUhid}
                                patientRegistrationId={patientRegistrationId}
                                registrationSubmitting={isSubmitting || isUpdatingRegistration}
                                canDownload={canDownload}
                                registrationBranchId={registrationBranchId}
                                consultancyVoucher={
                                    appliedConsultancyVoucher
                                        ? {
                                              voucherType: appliedConsultancyVoucher.voucherType,
                                              voucher: appliedConsultancyVoucher.voucher,
                                              benefitMessage: appliedConsultancyVoucher.benefitMessage,
                                          }
                                        : null
                                }
                                renderPaymentBody={currentStep === 3}
                            />
                        </div>
                    )}
                </div>

                <div className="hidden xl:block w-[20%] right-screen">
                    <JSHealthCardPoints uhid={patientUhid} patientType={formik.values.patientType} onCardNumberFetched={handleJsHealthCardFetched} />
                    <PatientOldHistory />
                    <Vouchers
                        vouchers={registrationVouchers}
                        isLoading={isRegistrationVouchersLoading}
                        fetchError={registrationVouchersError}
                        onClaimVoucher={handleClaimConsultancyVoucher}
                        onRemoveAppliedVoucher={() => setAppliedConsultancyVoucher(null)}
                        appliedVoucherSelectionKey={appliedConsultancyVoucher?.selectionKey ?? null}
                    />
                </div>
                {/* Mobile right screen drawer - slides from right on screens below 1280px */}
                <div className={`mobile-fix fixed right-0 top-0 h-screen w-[80%] sm:w-[60%] md:w-[50%] lg:w-[40%] bg-white z-50 transform transition-transform duration-300 overflow-hidden ${isRightScreenOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}>
                    <div className="h-full overflow-y-auto p-3">
                        <JSHealthCardPoints uhid={patientUhid} patientType={formik.values.patientType} onCardNumberFetched={handleJsHealthCardFetched} />
                        <PatientOldHistory />
                        <Vouchers
                            vouchers={registrationVouchers}
                            isLoading={isRegistrationVouchersLoading}
                            fetchError={registrationVouchersError}
                            onClaimVoucher={handleClaimConsultancyVoucher}
                            onRemoveAppliedVoucher={() => setAppliedConsultancyVoucher(null)}
                            appliedVoucherSelectionKey={appliedConsultancyVoucher?.selectionKey ?? null}
                        />
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
                isUserLeadData={isUserLeadData}
                customTitle={userLeadDialogTitle}
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

            {/* Referral mobile - patient not found dialog */}
            <MessageDialog
                open={showReferralNotFoundDialog}
                onClose={handleReferralNotFoundDialogClose}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message="Patient not found for this Referral Mobile number."
                confirmText="OK"
                showCancel={false}
                onConfirm={handleReferralNotFoundDialogClose}
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

            <MessageDialog
                open={showRegistrationCompleteDialog}
                onClose={() => {
                    setShowRegistrationCompleteDialog(false);
                    handleResetAfterSuccess();
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message="Registration completed successfully!"
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowRegistrationCompleteDialog(false);
                    handleResetAfterSuccess();
                }}
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