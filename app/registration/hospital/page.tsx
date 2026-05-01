"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
import { useFormik } from "formik";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import Image from "next/image";
import { MessageDialog, Tooltip, ScrollableContainer, FormSelectField } from "@/components/ui";
import TokenPanel from "@/components/registration/TokenPanel";
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
import PersonalForm from "../personal";
import PaymentForm, { type PaymentFormHandle } from "../payment";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import {
    useRegistrationVoucherPanel,
    type RegistrationVoucherPanelItem,
    normalizeRegistrationContactDigits,
} from "@/hooks/useRegistrationVoucherPanel";
import { DEFAULT_REGISTRATION_VOUCHER_TYPE } from "@/lib/api/voucherApi";
import {
    registrationApi,
    useGetPatientEntryByIdQuery,
    useGetDoctorsByBranchQuery,
    useLazyGetPatientEntriesQuery,
    useRequestDuplicateNumberPermissionMutation,
    type PatientEntry,
} from "@/store/api/registrationApi";
import { useGetCountriesQuery, useGetStatesQuery, useGetCitiesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery } from "@/store/api/publicApi";
import { useGetPanelsQuery, useGetBranchesQuery } from "@/store/api/settingsApi";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ExistingPatient } from "@/store/api/gateApi";
import { parseHeightToFeetAndInches } from "@/lib/utils/common";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectUserId, selectRoleCategoryType, selectSelectedBranch } from "@/store/slices/authSlice";
import type { SelectOption } from "@/components/ui/FormSelectField";
import PatientAlreadyExistsDialog from "@/components/registration/PatientAlreadyExistsDialog";
import DuplicateNumberExceptionDialog from "@/components/registration/DuplicateNumberExceptionDialog";
import ReferralPatientsDialog from "@/components/registration/ReferralPatientsDialog";
import type { ReferralPatient } from "@/components/registration/ReferralPatientsDialog";
import { useSocket } from "@/hooks/useSocket";
import { usePermission } from "@/hooks/usePermission";
import { registrationListPathFromBranchType } from "@/lib/utils/registrationBranchRoutes";

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
    const router = useRouter();
    const searchParams = useSearchParams();
    const formType: "clinic" | "hospital" = "hospital"; // Always hospital for this page
    const registrationPermission = usePermission("Registration");
    const registrationSubPermission = usePermission("Registration", { subModule: "Registration" });
    /** Registration is create-only: require Add (not View) to open this page—view-only cannot use the full form. */
    const canAdd = registrationPermission.canAdd || registrationSubPermission.canAdd;
    const canDownload = registrationPermission.canDownload || registrationSubPermission.canDownload;
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
    const [jsHealthCardAutoFilled, setJsHealthCardAutoFilled] = useState(false); // Track if jsHealthCardNo was auto-filled from API
    const [selectedTokenId, setSelectedTokenId] = useState<string | number | null>(null); // Track which token is selected for highlighting
    const refetchTokenListRef = useRef<(() => void) | null>(null); // Refetch function for token list using ref to avoid re-renders
    const [selectedPreBookingId, setSelectedPreBookingId] = useState<number | string | null>(null); // Store pre-booking ID when pre-booking is selected
    const [appliedConsultancyVoucher, setAppliedConsultancyVoucher] = useState<{
        voucherType: string;
        voucher: string;
        benefitMessage: string;
        claimedForContactDigits: string;
        selectionKey: string;
    } | null>(null);
    const paymentFormRef = useRef<PaymentFormHandle | null>(null);

    // Gate entry required state — when API returns empty for contact number
    const [gateEntryRequired, setGateEntryRequired] = useState(false);

    // Token panel pre-filled search value (set from contact number when patient-entries has data)
    const [tokenPanelSearch, setTokenPanelSearch] = useState("");

    // When token panel opens from patient-entries flow, force user to pick a token before proceeding
    const [isAwaitingTokenSelection, setIsAwaitingTokenSelection] = useState(false);

    // No-token confirmation: patient-entries empty → show dialog; on Continue call registrations-and-pre-bookings
    const [showNoTokenConfirmDialog, setShowNoTokenConfirmDialog] = useState(false);
    const [pendingContactForContinue, setPendingContactForContinue] = useState("");

    // User chose "Continue" without token and registrations-and-pre-bookings returned empty → new user, allow Save & Next, no gate error
    const [allowRegistrationWithoutToken, setAllowRegistrationWithoutToken] = useState(false);

    // Loading state for contact number API check
    const [isContactLoading, setIsContactLoading] = useState(false);

    // Loading state for referral mobile API check
    const [isReferralMobileLoading, setIsReferralMobileLoading] = useState(false);

    // Patient exists dialog state
    const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
    const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
    const [isUserLeadData, setIsUserLeadData] = useState(false); // Track if data is from userLead
    const [userLeadId, setUserLeadId] = useState<number | null>(null); // Track userLead ID for POST payload
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
    /** When true, next userLead-only API result skips the dialog and applies Visit (from /lead-request confirm). */
    const skipUserLeadDialogFromLeadRequestRef = useRef(false);
    const handleRevisitRef = useRef<
        ((patient: ExistingPatient, options?: { fromLeadRequestAuto?: boolean }) => void) | null
    >(null);

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

    // Referral patients dialog & validation state
    const [referralPatientsDialogOpen, setReferralPatientsDialogOpen] = useState(false);
    const [referralPatients, setReferralPatients] = useState<ReferralPatient[]>([]);
    const [selectedReferralPhoneNumber, setSelectedReferralPhoneNumber] = useState<string>("");
    const [selectedReferralPatient, setSelectedReferralPatient] = useState<ReferralPatient | null>(null);
    const [showReferralNotFoundDialog, setShowReferralNotFoundDialog] = useState(false);
    const [isReferralNameDisabledAfterNotFound, setIsReferralNameDisabledAfterNotFound] = useState(false);
    const lastCheckedReferralMobileRef = useRef<string>("");
    const referralPatientSelectedRef = useRef<boolean>(false);

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
        const onHospitalUrl = pathname?.includes("/registration/hospital");
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

    // Lazy query for patient-entries (used before registrations-and-pre-bookings check)
    const [getPatientEntriesLazy] = useLazyGetPatientEntriesQuery();

    // Lazy query for checking referral patients by phone
    const [checkReferralPatientsQuery] = registrationApi.useLazyGetAllRegistrationForReferralByPhoneQuery();

    // Mutation for requesting duplicate number permission
    const [requestDuplicateNumberPermission, { isLoading: isCreatingException }] = useRequestDuplicateNumberPermissionMutation();

    // Container ref for arrow key navigation
    const formsContainerRef = useRef<HTMLDivElement>(null);
    const registrationHeadingRef = useRef<HTMLDivElement>(null);

    // Ref for the Token panel container (for click-outside detection)
    const tokenPanelRef = useRef<HTMLDivElement>(null);
    const pendingChipsScrollRef = useRef<HTMLDivElement>(null);

    // Hospital: 2 steps normally; 1 step when consultancy voucher is applied (submit from Personal)
    const registrationSteps = useMemo(
        () =>
            appliedConsultancyVoucher
                ? [{ number: "Step 01", label: "Personal" }]
                : [
                      { number: "Step 01", label: "Personal" },
                      { number: "Step 02", label: "Payment" },
                  ],
        [appliedConsultancyVoucher],
    );

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
    const tokenPanelCountryIsIndia = selectedCountryId === "6";
    const { data: statesData } = useGetStatesQuery(
        selectedCountryId && tokenPanelCountryIsIndia ? { countryId: selectedCountryId } : undefined,
        { skip: !selectedCountryId || !tokenPanelCountryIsIndia }
    );
    const [selectedStateId, setSelectedStateId] = useState<string>("");
    const { data: citiesData } = useGetCitiesQuery(
        selectedStateId && tokenPanelCountryIsIndia ? { stateId: selectedStateId } : undefined,
        { skip: !selectedStateId || !tokenPanelCountryIsIndia }
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
        referral: "",
        source: "Direct Patient",
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
        if (appliedConsultancyVoucher && currentStep > 0) {
            setCurrentStep(0);
        }
    }, [appliedConsultancyVoucher, currentStep]);

    useEffect(() => {
        if (!formik.touched.jsHealthCardNo) return;
        void formik.validateField("jsHealthCardNo");
    }, [jsHealthCardDigitLength]);

    // Fetch doctors and panels for matching when patient is selected (after formik is initialized)
    // Fetch panels by default to have them available for all patient types
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
        Number.isFinite(registrationBranchId) && registrationBranchId >= 1
            ? { page: 1, limit: 100, branchId: registrationBranchId }
            : undefined,
        {
            skip: !Number.isFinite(registrationBranchId) || registrationBranchId < 1,
        }
    );

    // Enable arrow key navigation for form fields (after formik is initialized)
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

            // Only close if panel is open
            if (!isPreBookingOpen) {
                return;
            }

            // Check if click is outside the panel container
            if (
                tokenPanelRef.current &&
                !tokenPanelRef.current.contains(event.target as Node) &&
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

    // Clear selected referral patient when source is Direct Patient or cleared
    useEffect(() => {
        const sourceSlugEffect = (formik.values.source || "").toLowerCase().replace(/\s+/g, "-");
        if (!formik.values.source || sourceSlugEffect === "direct-patient") {
            setSelectedReferralPatient(null);
            referralPatientSelectedRef.current = false;
        }
    }, [formik.values.source]);

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
                    // Non-India: state/city are free text from token — set directly (no master ID mapping)
                    if (countryId !== "6") {
                        formik.setFieldValue("state", (entry.patientState ?? "").trim(), false);
                        formik.setFieldValue("city", (entry.city ?? "").trim(), false);
                        setSelectedStateId("");
                        formik.setFieldValue("tehsil", "", false);
                        formik.setFieldValue("area", "", false);
                    }
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientEntry, countriesData]);

    // India only: map state name to ID when states are loaded (after country is set)
    useEffect(() => {
        if (
            selectedCountryId !== "6" ||
            !selectedPatientEntry ||
            !statesData?.data ||
            !selectedCountryId ||
            !selectedPatientEntry.patientState
        ) {
            return;
        }
        const state = statesData.data.find(
            (s) => s.name.toLowerCase() === selectedPatientEntry.patientState?.toLowerCase()
        );
        if (state) {
            const stateId = state.id.toString();
            setSelectedStateId(stateId);
            formik.setFieldValue("state", stateId, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientEntry, statesData, selectedCountryId]);

    // India only: map city (district) name to ID when cities are loaded (after state is set)
    useEffect(() => {
        if (selectedCountryId !== "6") {
            return;
        }
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

    const normalizeGeoLabel = (s: string | null | undefined) =>
        (s ?? "")
            .toLowerCase()
            .replace(/\./g, "")
            .replace(/\s+/g, " ")
            .trim();

    // Map country name to ID when countries are loaded (for revisit patient from existing patients dialog)
    useEffect(() => {
        if (selectedPatientAddressRef.current?.countryName && countriesData?.data) {
            const want = normalizeGeoLabel(selectedPatientAddressRef.current.countryName);
            let country = countriesData.data.find(
                (c) => c.name.toLowerCase() === selectedPatientAddressRef.current?.countryName?.toLowerCase(),
            );
            if (!country && want.length > 0) {
                country = countriesData.data.find((c) => normalizeGeoLabel(c.name) === want);
            }
            if (country) {
                const countryId = country.id.toString();
                formik.setFieldValue("country", countryId, false);
                setSelectedCountryId(countryId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientAddressRef.current?.countryName, countriesData]);

    // India only: map state name to ID when states are loaded (revisit / dialog flows)
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
                setSelectedStateId(stateId);
                formik.setFieldValue("state", stateId, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatientAddressRef.current?.stateName, statesData, formik.values.country]);

    // India only: map city name to ID when cities are loaded
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

        // Refetch token list (must not block success UI if refetch rejects)
        const refetchTokens = refetchTokenListRef.current;
        if (refetchTokens) {
            try {
                void Promise.resolve(refetchTokens()).catch(() => {});
            } catch {
                /* ignore */
            }
        }
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
        setPatientToken("");
        setPatientEntryId(null);
        setSelectedPatientEntry(null);
        setTokenPanelSearch("");
        setJsHealthCardAutoFilled(false);
        setGateEntryRequired(false); // Clear gate entry error
        setAllowRegistrationWithoutToken(false);
        setIsAwaitingTokenSelection(false);
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
        setSelectedReferralPatient(null);
        setReferralPatients([]);
        setReferralPatientsDialogOpen(false);
        setShowReferralNotFoundDialog(false);
        setShowNoTokenConfirmDialog(false);
        setPendingContactForContinue("");
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
    // When fromContinueWithoutToken is true (user clicked Continue in no-token dialog), empty result → allow registration without token
    const checkExistingPatients = useCallback(
        async (
            contactNumber: string,
            options?: { fromContinueWithoutToken?: boolean; branchId?: number },
        ) => {
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
            options?.branchId != null &&
            Number.isFinite(Number(options.branchId)) &&
            Number(options.branchId) > 0
                ? Number(options.branchId)
                : registrationBranchId;

        setIsContactLoading(true);
        try {
            const result = await checkExistingPatientsQuery({
                branchId: branchForQuery,
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
            const mappedPreBookings: ExistingPatient[] = preBookings.map((pb: any) => {
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
                const branchIdVal = pb.branch_id ?? pb.branchId ?? branchForQuery;
                const panelId = reg?.panelId ?? pb.panel_id ?? pb.panelId ?? null;
                // When a registration record is embedded, prefer its id/uhid so the submission
                // targets the correct existing registration.
                const entityId = reg ? (reg.id ?? pb.id ?? 0) : (pb.id ?? 0);
                const entityUhid = reg ? (reg.uhid ?? pb.uhid ?? "") : (pb.uhid ?? "");
                return {
                    id: entityId,
                    sUhid: null,
                    uhid: entityUhid,
                    branchId: branchIdVal,
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
                    panelId,
                    patientSubType,
                    benificiaryId,
                    insuranceCompany,
                    ayushCovered,
                    // Address comes as flat top-level fields on the preBooking object
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
                setExistingPatients(mappedRegistrations);
                setIsUserLeadData(false);
                setUserLeadId(null);
                setPatientExistsDialogOpen(true);
            } else if (userLead && Object.keys(userLead).length > 0) {
                // Check if userLead has data (not empty object)
                // Transform userLead to match ExistingPatient format
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
                    isPreBooking: false,
                    preBookingId: null,
                    diagnosis:
                        userLeadData.diagnosis != null ? String(userLeadData.diagnosis) : undefined,
                };
                setExistingPatients([transformedUserLead]);
                setIsUserLeadData(true);
                // Store userLead ID for POST payload and localStorage
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
                // No registrations, no preBookings, no userLead
                lastCheckedContactNumberRef.current = "";
                setIsUserLeadData(false);
                setUserLeadId(null);
                if (options?.fromContinueWithoutToken) {
                    // User chose "Continue" from no-token dialog → treat as new user, enable Save & Next, no gate error
                    setAllowRegistrationWithoutToken(true);
                } else {
                    setGateEntryRequired(true);
                }
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
            // Clear error if Aadhar Card is not 12 digits, but only for API \"already exists\" error
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

    // Check patient-entries first; if data found → open token panel with pre-filled search.
    // If empty → fall through to registrations-and-pre-bookings (checkExistingPatients).
    const checkPatientEntriesFirst = useCallback(async (contactNumber: string) => {
        if (!contactNumber || contactNumber.length !== 10) return;

        setIsContactLoading(true);
        try {
            const result = await getPatientEntriesLazy({
                branchId: registrationBranchId,
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
                // No entries → show confirmation dialog; on Continue we call registrations-and-pre-bookings
                setPendingContactForContinue(contactNumber);
                setShowNoTokenConfirmDialog(true);
            }
        } catch {
            // On error, show same confirmation dialog
            setPendingContactForContinue(contactNumber);
            setShowNoTokenConfirmDialog(true);
        } finally {
            setIsContactLoading(false);
        }
    }, [getPatientEntriesLazy, registrationBranchId, checkExistingPatients]);

    // No-token dialog: user clicked Continue → call registrations-and-pre-bookings; if data → Already Exist dialog, if not → new user (allow Save & Next)
    const handleNoTokenConfirmContinue = useCallback(async () => {
        const contact = pendingContactForContinue;
        setShowNoTokenConfirmDialog(false);
        setPendingContactForContinue("");
        if (contact && contact.length === 10) {
            await checkExistingPatients(contact, { fromContinueWithoutToken: true });
        }
    }, [pendingContactForContinue, checkExistingPatients]);

    const handleNoTokenConfirmCancel = useCallback(() => {
        setShowNoTokenConfirmDialog(false);
        setPendingContactForContinue("");
        // Dismiss without continuing: clear contact so user can re-enter (Cancel, backdrop, or X)
        void formik.setFieldValue("contactNumber", "");
    }, [formik]);

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
        if (allowRegistrationWithoutToken) {
            setAllowRegistrationWithoutToken(false);
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
    }, [checkPatientEntriesFirst, checkExistingAadharCard, formik.values.aadharCardNumber, gateEntryRequired, tokenPanelSearch, isAwaitingTokenSelection, allowRegistrationWithoutToken]);

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

    // Handle revisit button click from dialog
    const handleRevisit = useCallback(
        (patient: ExistingPatient, options?: { fromLeadRequestAuto?: boolean }) => {
        setPatientExistsDialogOpen(false);
        isClosingDialogRef.current = false;
        lastCheckedContactNumberRef.current = "";

        // Store isUserLeadData flag before resetting (lead-request auto path uses same behavior as Visit on user lead)
        const wasUserLeadData = options?.fromLeadRequestAuto === true || isUserLeadData;

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
            const addr = patient.address;
            let revisitCountryId: string | null = null;

            if (addr.country && countriesData?.data) {
                const countryName = String(addr.country).toLowerCase();
                const country = countriesData.data.find(
                    (c) => c.name.toLowerCase() === countryName
                );
                if (country) {
                    revisitCountryId = country.id.toString();
                    formik.setFieldValue("country", revisitCountryId, false);
                    setSelectedCountryId(revisitCountryId);
                } else {
                    revisitCountryId = addr.country === "101" ? "6" : String(addr.country);
                    formik.setFieldValue("country", revisitCountryId, false);
                    setSelectedCountryId(revisitCountryId);
                }
            } else if (addr.country) {
                const countryName = String(addr.country);
                selectedPatientAddressRef.current = {
                    ...selectedPatientAddressRef.current,
                    countryName: countryName,
                };
            }

            if (addr.address) {
                formik.setFieldValue("address", addr.address, false);
            }
            if ((addr as any).addressLine1 != null) {
                formik.setFieldValue("addressLine1", (addr as any).addressLine1 || "", false);
            }
            if ((addr as any).addressLine2 != null) {
                formik.setFieldValue("addressLine2", (addr as any).addressLine2 || "", false);
            }

            if (revisitCountryId != null && revisitCountryId !== "6") {
                formik.setFieldValue("state", addr.state != null ? String(addr.state).trim() : "", false);
                formik.setFieldValue("city", addr.city != null ? String(addr.city).trim() : "", false);
                formik.setFieldValue("tehsil", "", false);
                formik.setFieldValue("area", "", false);
                setSelectedStateId("");
                selectedPatientAddressRef.current = {
                    pinCode: addr.pinCode,
                    tehsil: addr.tehsil,
                    area: addr.area,
                    areaId: (addr as { areaId?: number | string }).areaId,
                };
            } else {
                selectedPatientAddressRef.current = {
                    ...selectedPatientAddressRef.current,
                    stateName: addr.state,
                    cityName: addr.city,
                    pinCode: addr.pinCode,
                    tehsil: addr.tehsil,
                    area: addr.area,
                    areaId: (addr as { areaId?: number | string }).areaId,
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

        // Fill Lead Source fields if available
        if (patient.isReferral) {
            formik.setFieldValue("referral", "yes", false);

            if (patient.referralUserId && !isNaN(Number(patient.referralUserId))) {
                formik.setFieldValue("source", "HIIMS Doctor", false);
                formik.setFieldValue("doctorSpecificField", String(patient.referralUserId), false);
            } else if (patient.referralName || patient.referralMobile) {
                formik.setFieldValue("source", "Patient Referral", false);
                if (patient.referralName) formik.setFieldValue("referralName", patient.referralName, false);
                if (patient.referralMobile) formik.setFieldValue("referralMobile", patient.referralMobile, false);
            } else if (patient.referralSourceInfo) {
                const sourceInfo = patient.referralSourceInfo.toLowerCase();
                if (sourceInfo.includes("tv") || sourceInfo.includes("television")) {
                    formik.setFieldValue("source", "TV", false);
                    formik.setFieldValue("tvSpecificField", patient.referralSourceInfo, false);
                } else if (sourceInfo.includes("newspaper") || sourceInfo.includes("paper")) {
                    formik.setFieldValue("source", "NewsPaper", false);
                    formik.setFieldValue("newspaperSpecificField", patient.referralSourceInfo, false);
                } else if (sourceInfo.includes("social") || sourceInfo.includes("facebook") || sourceInfo.includes("instagram") || sourceInfo.includes("twitter")) {
                    formik.setFieldValue("source", "Social Media", false);
                    formik.setFieldValue("socialMediaSpecificField", patient.referralSourceInfo, false);
                } else {
                    formik.setFieldValue("source", "Patient Referral", false);
                }
            }
        } else {
            formik.setFieldValue("referral", "no", false);
            formik.setFieldValue("source", "Direct Patient", false);
        }

        // Clear validation state; delay full validate until async tehsil/area IDs are applied
        formik.setErrors({});
        window.setTimeout(() => {
            void formik.validateForm();
        }, 450);
    },
        [formik, isUserLeadData]
    );

    handleRevisitRef.current = handleRevisit;

    // Ref to auto-select a pre-booking by ID when the "Patient Already Exists" dialog opens
    const pendingAutoSelectPreBookingIdRef = useRef<number | null>(null);

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
                branchId: registrationBranchId || 1,
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
    }, [requestDuplicateNumberPermission, registrationBranchId, userId, formik.values.contactNumber, saveDuplicateExceptionPatient, getDuplicateExceptionPatients]);

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
        setUserLeadDialogTitle(undefined);

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
        // Persist gate entry error only when gate entry required and user did not choose to continue without token (new user path)
        if (gateEntryRequired && !allowRegistrationWithoutToken) {
            errors["contactNumber"] = "Please complete the gate entry process first. Direct patient registration requires a token assignment from the gate entry system.";
        }
        return errors;
    };

    // Step 01 Personal: all select and input fields in form order. First invalid in this series gets focus.
    const HOSPITAL_STEP1_FIELD_ORDER: readonly string[] = [
        "contactNumber",
        "patientNameSelect",
        "patientName",
        "fathersHusbandsNameSelect",
        "fathersHusbandsName",
        "age",
        "gender",
        "maritalStatus",
        "religion",
        "specificReligion",
        "occupation",
        "emailAddress",
        "jsHealthCardNo",
        "aadharCardNumber",
        "whatsappNo",
        "pinCode",
        "country",
        "state",
        "city",
        "tehsil",
        "area",
        "address",
        "addressLine1",
        "addressLine2",
        "patientType",
        "panelId",
        "patientSubType",
        "benificiaryId",
        "insuranceCompany",
        "ayushCovered",
        "referral",
        "source",
        "tvSpecificField",
        "newspaperSpecificField",
        "socialMediaSpecificField",
        "doctorSpecificField",
        "referralName",
        "referralMobile",
        "doctor",
        "appointmentDate",
        "timeSlot",
    ];

    const scrollToFirstError = (errorsOverride?: Record<string, string>) => {
        const errors = errorsOverride ?? getFormErrors();
        if (Object.keys(errors).length === 0) return;

        const firstErrorKey = HOSPITAL_STEP1_FIELD_ORDER.find((key) => errors[key]) ?? Object.keys(errors)[0];
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
                        content="Token"
                        position="right"
                 
                    >
                        <button 
                 
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            aria-label="Toggle Token Panel"
                        >

                            <Image src="/icons/prebookingtoggle.svg" alt="Token Icon" width={32} height={32} />
                        </button>
                    </Tooltip>

                    <PageHeading title="Registration" />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                    <ScrollableContainer
                        ref={pendingChipsScrollRef}
                        maxHeight="66px"
                        overflowY="hidden"
                        className="pending_registration-scroll min-w-0 max-w-full flex-1 overflow-x-auto pb-1"
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
                                        <Tooltip content={patient.patientName || ""} position="top" delay={0}>
                                            <span className="flex min-w-0 flex-1 items-center gap-2">
                                                <Image src={iconSrc} alt="Patient Icon" width={32} height={32} className="shrink-0" />
                                                <span className={`min-w-0 max-w-[180px] truncate text-center font-[Inter] text-sm font-medium leading-[120%] ${textColor}`}>
                                                    {patient.patientName}
                                                </span>
                                            </span>
                                        </Tooltip>
                                    </button>
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

                        {/* Pending registration buttons */}
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
                                <Tooltip content={patient.name || ""} position="top" delay={0}>
                                    <span className="flex items-center gap-2 min-w-0 flex-1">
                                        <Image src={patient.iconSrc} alt="Patient Icon" width={32} height={32} className="shrink-0" />
                                        <span className={`font-[Inter] font-medium text-sm leading-[120%] text-center ${patient.textColor} min-w-0 max-w-[180px] truncate`}>
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
                {/* Token Panel */}
                {isPreBookingOpen && (
                    <div ref={tokenPanelRef} className="w-[20%] transition-all duration-0 ease-in-out flex-shrink-0 small-screens">
                        <TokenPanel
                            onTokenClick={handleTokenClick}
                            selectedTokenId={selectedTokenId}
                            onRefetchReady={(refetch) => {
                                refetchTokenListRef.current = refetch;
                            }}
                            tokenSearchValue={tokenPanelSearch}
                            branchId={registrationBranchId}
                        />
                    </div>
                )}

                {/* Registration Steps and Forms */}
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
                            submitButtonText={appliedConsultancyVoucher ? "Submit" : undefined}
                            onValidatedContinue={
                                appliedConsultancyVoucher
                                    ? () => void paymentFormRef.current?.runDirectHospitalRegistration()
                                    : undefined
                            }
                            branchDoctorOptions={branchDoctorSelectOptions}
                            sourceOptions={sourceOptions}
                            tvSpecificFieldOptions={tvSpecificFieldOptions}
                            newspaperSpecificFieldOptions={newspaperSpecificFieldOptions}
                            socialMediaSpecificFieldOptions={socialMediaSpecificFieldOptions}
                            onContactNumberChange={handleContactNumberChange}
                            onAadharCardNumberChange={(value) => checkExistingAadharCard(value)}
                            onJsHealthCardNoChange={(value) => checkJsHealthCard(value)}
                            onReferralMobileChange={handleReferralMobileChange}
                            readOnlyFields={
                                // For userLead data, lock fields only if they have data
                                (
                                    isUserLeadData
                                        ? (() => {
                                            const fields: string[] = [];
                                            if (selectedRevisitedPatientData?.contactNumber?.trim()) fields.push("contactNumber");
                                            if (selectedRevisitedPatientData?.patientName?.trim()) fields.push("patientName", "patientNameSelect");
                                            if (selectedRevisitedPatientData?.aadharCardNo?.trim()) fields.push("aadharCardNumber");
                                            return fields;
                                        })()
                                        : (selectedPreBookingId || selectedTokenId || isRevisitedPatient
                                            ? (() => {
                                                const base = ["patientName", "contactNumber", "patientNameSelect"];
                                                const withAadhar = selectedRevisitedPatientData?.aadharCardNo
                                                    ? [...base, "aadharCardNumber"]
                                                    : base;
                                                // Lock JS Health Card No. if patient already has it OR it was auto-filled from API
                                                return (selectedRevisitedPatientData?.jsHealthCardNo?.trim() || jsHealthCardAutoFilled)
                                                    ? [...withAadhar, "jsHealthCardNo"]
                                                    : withAadhar;
                                            })()
                                            : (selectedApprovedPatientId
                                                ? ["patientName", "contactNumber", "patientNameSelect"]
                                                : []))
                                )
                                    .concat(
                                        // Always disable referralName and referralMobile when a patient is selected
                                        selectedReferralPatient
                                            ? ["referralName", "referralMobile"]
                                            : (referralPatientsDialogOpen ? ["referralMobile"] : [])
                                    )
                                    .concat(
                                        // When referral mobile has no registered patient, keep Referral Name disabled
                                        isReferralNameDisabledAfterNotFound ? ["referralName"] : []
                                    )
                            }
                            isNextDisabled={!canAdd || gateEntryRequired || isAwaitingTokenSelection || showNoTokenConfirmDialog}
                            hideReferral={!!patientUhid && patientUhid.trim() !== ""}
                            isContactLoading={isContactLoading}
                            isReferralMobileLoading={isReferralMobileLoading} />
                    )}

                    {(currentStep === 1 || appliedConsultancyVoucher) && (
                        <div
                            className={
                                appliedConsultancyVoucher && currentStep === 0
                                    ? "sr-only pointer-events-none absolute h-0 w-0 overflow-hidden"
                                    : undefined
                            }
                            aria-hidden={appliedConsultancyVoucher && currentStep === 0 ? true : undefined}
                        >
                            <PaymentForm
                                ref={paymentFormRef}
                                preBookingId={selectedPreBookingId}
                                formik={formik}
                                getFormErrors={getFormErrors}
                                onPostSuccessReceiptClose={handleHospitalRegistrationComplete}
                                onBack={handleBackSteps}
                                isHospitalRegistration={true}
                                patientToken={patientToken}
                                patientEntryId={patientEntryId}
                                patientUhid={patientUhid}
                                patientRegistrationId={patientRegistrationId}
                                userLeadId={userLeadId}
                                selectedReferralPatientId={selectedReferralPatient?.id || null}
                                patientTokenSource={selectedTokenId != null ? "gate" : "reception"}
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
                                renderPaymentBody={!(appliedConsultancyVoucher && currentStep === 0)}
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
                customTitle={userLeadDialogTitle}
                disableRevisit={true}
                revisitTooltipText="Please complete the gate entry process first. Direct patient registration requires a token assignment from the gate entry system."
            />

            {/* No token confirmation: continue with registration without token */}
            <MessageDialog
                open={showNoTokenConfirmDialog}
                onClose={handleNoTokenConfirmCancel}
                message="Patient doesn't have a Token Number allocated to him. Do you want to continue with registration?"
                confirmText="Continue"
                cancelText="Cancel"
                showCancel={true}
                onConfirm={handleNoTokenConfirmContinue}
                onCancel={handleNoTokenConfirmCancel}
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
        </AppShell>
    );
}
