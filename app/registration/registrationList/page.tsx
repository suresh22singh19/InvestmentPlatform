"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, FormSelectField, Button, Dialog, FormInputField, BackToPreviousPageButton, MessageDialog, Tooltip, SpinnerLoader } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
    useGetDoctorsByBranchQuery,
    useGetAppointmentsListQuery,
    useUpdateAppointmentDoctorMutation,
    type AppointmentRegistration,
} from "@/store/api/registrationApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter, REGISTRATION_LIST_BRANCH_STORAGE_KEY } from "@/hooks/useBranchFilter";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import { useAppSelector } from "@/store/hooks";
import { selectLoginType, selectUser } from "@/store/slices/authSlice";
import PatientCGHS, {
    DEFAULT_STATIC_BRANCH_INFO,
    type PatientCGHSHandle,
    type PatientCGHSProps,
    type BranchInfo,
} from "@/lib/utils/patientForm";
import PatientForm2, {
    DEFAULT_STATIC_BRANCH_INFO2,
    type PatientForm2Handle,
    type PatientForm2Props,
} from "@/lib/utils/patientForm2";
import { PaymentReceiptCapture } from "@/components/registration/PaymentReceiptCapture";
import { buildListInvoiceReceiptProps } from "@/lib/registration/buildListInvoiceReceiptProps";
import { downloadPaymentReceiptPdfFromElement } from "@/lib/utils/downloadPaymentReceiptPdf";

const REGISTRATION_LIST_FILTERS_STORAGE_KEY = "registrationList_filters_state";

type PatientRegistration = {
    id: number;
    registrationId: number | string | null; // Registration ID for view/edit pages
    srNo: number;
    uhid: string;
    patientName: string;
    diagnosis: string;
    doctorName: string;
    token: string;
    appointmentTime: string;
    checkInTime: string;
    vitalsStatus: "add" | "done";
    patientStatus: "OPD Waiting" | "OPD In Progress" | "Pharmacy Pending" | "IPD Recommended" | "IPD Admission In Progress" | "Medicine Taken" | "Admitted";
    gender?: string; // Patient gender for conditional field display
    /** Appointment createdAt (ISO) — invoice download UI only for first 24h after this */
    createdAt?: string;
};

const INVOICE_DOWNLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

function isWithinInvoiceDownloadWindow(createdAt: string | undefined | null): boolean {
    if (createdAt == null || String(createdAt).trim() === "") return false;
    const createdMs = new Date(createdAt).getTime();
    if (!Number.isFinite(createdMs)) return false;
    const now = Date.now();
    if (now < createdMs) return false;
    return now - createdMs <= INVOICE_DOWNLOAD_WINDOW_MS;
}

/**
 * Appointments-list sometimes omits `createdAt` on the first fetch after a new registration;
 * other timestamps are equivalent for the 24h invoice window and check-in display.
 */
function resolveAppointmentAnchorDate(appointment: AppointmentRegistration): string | undefined {
    const reg = appointment.registration as { createdAt?: string } | null | undefined;
    const candidates: unknown[] = [
        appointment.createdAt,
        appointment.updatedAt,
        reg?.createdAt,
        appointment.appointmentDate,
        appointment.payment?.transactionDate,
    ];
    for (const c of candidates) {
        if (c != null && String(c).trim() !== "") {
            return String(c);
        }
    }
    return undefined;
}

// Helper function to format timeSlot (e.g., "10-12" to "10:00am - 12:00pm")
const formatTimeSlot = (timeSlot: string | undefined | null): string => {
    if (!timeSlot || timeSlot === "-") return "N/A";

    const timeSlotMap: Record<string, string> = {
        "10-12": "10:00am - 12:00pm",
        "11-13": "11:00am - 01:00pm",
        "12-14": "12:00pm - 02:00pm",
        "13-15": "01:00pm - 03:00pm",
        "14-16": "02:00pm - 04:00pm",
        "15-17": "03:00pm - 05:00pm",
        "16-18": "04:00pm - 06:00pm",
    };

    return timeSlotMap[timeSlot] || timeSlot;
};

// Helper function to format date to time string (HH:MM AM/PM)
const formatTimeFromDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (error) {
        return "N/A";
    }
};

// Helper function to format date to date string (DD-MM-YYYY)
const formatDateFromDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (error) {
        return "N/A";
    }
};

// Helper function to format name with title
const formatNameWithTitle = (name: string | undefined | null, title: string | undefined | null): string => {
    if (!name) return "";
    const trimmedName = name.trim();
    const trimmedTitle = title && title.trim() ? title.trim() : null;

    if (!trimmedTitle) {
        return trimmedName;
    }

    return `${trimmedTitle} ${trimmedName}`;
};

function capitalizeFirst(str: string | null | undefined): string {
    if (str == null || str === "") return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function branchSelectLabel(name: string, typeRaw: string | null | undefined): string {
    const t = (typeRaw ?? "").trim();
    if (!t) return name;
    return `${name} (${capitalizeFirst(t)})`;
}

function buildPatientFormDownloadProps(
    patient: PatientRegistration,
    appointment: AppointmentRegistration | undefined,
    loginType: string | null | undefined,
): PatientCGHSProps {
    const reg = appointment?.registration;

    const toDisplayString = (v: unknown): string => {
        if (v == null) return "";
        return String(v).trim();
    };

    const branchType: BranchInfo["type"] = loginType?.toLowerCase().includes("hospital")
        ? "hospital"
        : "clinic";

    const branch: BranchInfo = {
        ...DEFAULT_STATIC_BRANCH_INFO,
        type: branchType,
    };

    const guardianDisplay = formatNameWithTitle(reg?.guardianName ?? null, reg?.guardianTitle ?? null);
    const createdRaw = appointment?.createdAt
        ? String(appointment.createdAt)
        : new Date().toISOString();

    return {
        branch,
        patient: {
            patient: patient.patientName || "",
            parent_name: guardianDisplay || "—",
            bp: toDisplayString(appointment?.bloodPressure),
            sl: toDisplayString(appointment?.sugarLevel) || "—",
            weight: toDisplayString(reg?.weight),
            height: toDisplayString(reg?.height),
            uhid: patient.uhid || "",
            opdId: String(appointment?.id ?? patient.id ?? ""),
            age: toDisplayString(reg?.age) || "—",
            gender: patient.gender || toDisplayString(reg?.gender) || "—",
        },
        doctor: {
            name: patient.doctorName || "",
            education: ["BAMS"],
            reg_no: "",
        },
        appointment: { created_at: createdRaw },
        diagnosis: patient.diagnosis || "",
        showDownloadButton: false,
    };
}

function buildPatientForm2DownloadProps(
    patient: PatientRegistration,
    appointment: AppointmentRegistration | undefined,
    loginType: string | null | undefined,
): PatientForm2Props {
    const reg = appointment?.registration;

    const toDisplayString = (v: unknown): string => {
        if (v == null) return "";
        return String(v).trim();
    };

    const branchType: "clinic" | "hospital" = loginType?.toLowerCase().includes("hospital")
        ? "hospital"
        : "clinic";

    const guardianDisplay = formatNameWithTitle(reg?.guardianName ?? null, reg?.guardianTitle ?? null);
    const createdRaw = appointment?.createdAt
        ? String(appointment.createdAt)
        : new Date().toISOString();

    const addr = reg?.address;

    return {
        branch: {
            ...DEFAULT_STATIC_BRANCH_INFO2,
            type: branchType,
        },
        patient: {
            patient: patient.patientName || "",
            parent_name: guardianDisplay || "—",
            bp: toDisplayString(appointment?.bloodPressure),
            sl: toDisplayString(appointment?.sugarLevel) || "—",
            weight: toDisplayString(reg?.weight),
            height: toDisplayString(reg?.height),
            uhid: patient.uhid || "",
            opdId: String(appointment?.id ?? patient.id ?? ""),
            age: toDisplayString(reg?.age) || "—",
            gender: patient.gender || toDisplayString(reg?.gender) || "—",
            contactNumber: toDisplayString(reg?.contactNumber),
            emailAddress: toDisplayString(reg?.emailAddress),
            bloodGroup: toDisplayString(reg?.bloodGroup),
            address: toDisplayString(addr?.address || addr?.addressLine1),
            city: toDisplayString(addr?.city),
            state: toDisplayString(addr?.state),
            pinCode: toDisplayString(addr?.pinCode),
        },
        doctor: {
            name: patient.doctorName || "",
            education: ["BAMS"],
            reg_no: "",
        },
        appointment: { created_at: createdRaw },
        diagnosis: patient.diagnosis || "",
        showDownloadButton: false,
    };
}

// Patient status options for filter
const patientStatusOptions: SelectOption[] = [
    { value: "OPD Waiting", label: "OPD Waiting" },
    { value: "OPD In Progress", label: "OPD In Progress" },
    { value: "Pharmacy Pending", label: "Pharmacy Pending" },
    { value: "IPD Recommended", label: "IPD Recommended" },
    { value: "IPD Admission In Progress", label: "IPD Admission In Progress" },
    { value: "Medicine Taken", label: "Medicine Taken" },
    { value: "Admitted", label: "Admitted" },
];

// Get status badge color classes
const getStatusBadgeClasses = (status: PatientRegistration["patientStatus"]) => {
    const baseClasses = "inline-flex items-center justify-center px-5 py-2 rounded-[30px] text-xs font-medium border";

    switch (status) {
        case "OPD Waiting":
            return `${baseClasses} border-[#FFC107] text-[#FFC107] bg-white`;
        case "OPD In Progress":
            return `${baseClasses} border-[#42A5F5] text-[#42A5F5] bg-white`;
        case "Pharmacy Pending":
            return `${baseClasses} border-[#FF9800] text-[#FF9800] bg-white`;
        case "IPD Recommended":
            return `${baseClasses} border-[#9C27B0] text-[#9C27B0] bg-white`;
        case "IPD Admission In Progress":
            return `${baseClasses} border-[#2196F3] text-[#2196F3] bg-white`;
        case "Medicine Taken":
            return `${baseClasses} border-[#4CAF50] text-[#4CAF50] bg-white`;
        case "Admitted":
            return `${baseClasses} border-[#F44336] text-[#F44336] bg-white`;
        default:
            return `${baseClasses} border-[#9CA3AF] text-[#9CA3AF] bg-white`;
    }
};

export default function RegistrationListPage() {
    const router = useRouter();
    const patientPermission = usePermission("Patient");
    const opdPermission = usePermission("Patient", { subModule: "Opd" });
    const canView = patientPermission.canView || opdPermission.canView;
    const canAdd = patientPermission.canAdd || opdPermission.canAdd;
    const canEdit = patientPermission.canEdit || opdPermission.canEdit;
    const canDownload = patientPermission.canDownload || opdPermission.canDownload;
    const loginType = useAppSelector(selectLoginType);
    const authUser = useAppSelector(selectUser);
    const patientFormRef = useRef<PatientCGHSHandle>(null);
    const [patientFormDownloadProps, setPatientFormDownloadProps] = useState<PatientCGHSProps | null>(null);
    const patientForm2Ref = useRef<PatientForm2Handle>(null);
    const [patientForm2DownloadProps, setPatientForm2DownloadProps] = useState<PatientForm2Props | null>(null);
    const [pdfDownloadingPatientId2, setPdfDownloadingPatientId2] = useState<number | null>(null);
    const pdfDownloadBusyRef2 = useRef(false);
    /** Row id while html2pdf is generating (shows spinner on that row; other PDF buttons disabled). */
    const [pdfDownloadingPatientId, setPdfDownloadingPatientId] = useState<number | null>(null);
    /** Row id while invoice receipt PDF is generating. */
    const [invoiceDownloadingPatientId, setInvoiceDownloadingPatientId] = useState<number | null>(null);
    /** Appointment row used to render off-screen receipt for html2pdf. */
    const [invoicePdfAppointment, setInvoicePdfAppointment] = useState<AppointmentRegistration | null>(null);
    /** Sync guard so double-clicks before React re-renders cannot start two downloads. */
    const pdfDownloadBusyRef = useRef(false);
    const invoiceDownloadBusyRef = useRef(false);
    const isNurse = loginType?.toLowerCase() === "nurse";
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const getDefaultState = () => {
        const today = getTodayDate();
        return {
            filters: {
                searchTerm: "",
                patientStatus: "",
                currentPage: 1,
                itemsPerPage: 10,
                sortField: "",
                sortOrder: "asc" as "asc" | "desc",
            },
            fromDate: today,
            toDate: today,
        };
    };

    const getInitialState = () => {
        const defaultState = getDefaultState();
        if (typeof window === "undefined") {
            return defaultState;
        }

        const storedState = sessionStorage.getItem(REGISTRATION_LIST_FILTERS_STORAGE_KEY);
        if (!storedState) {
            return defaultState;
        }

        try {
            const parsedState = JSON.parse(storedState) as {
                filters?: Partial<typeof defaultState.filters>;
                fromDate?: string;
                toDate?: string;
            };

            return {
                filters: {
                    ...defaultState.filters,
                    ...parsedState.filters,
                },
                fromDate: parsedState.fromDate ?? defaultState.fromDate,
                toDate: parsedState.toDate ?? defaultState.toDate,
            };
        } catch {
            return defaultState;
        }
    };

    const initialState = getInitialState();
    const [filters, setFilters] = useState(initialState.filters);
    const prevSearchTermRef = useRef(filters.searchTerm);
    const [fromDate, setFromDate] = useState<string>(initialState.fromDate);
    const [toDate, setToDate] = useState<string>(initialState.toDate);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions,
        isLoadingBranches,
        isBranchFilterDisabled,
        filterBranchId,
        isSuperAdmin: isBranchFilterSuperAdmin,
        branchFilterPersistReady,
    } = useBranchFilter({
        persistSuperAdminSelectionKey: REGISTRATION_LIST_BRANCH_STORAGE_KEY,
    });
    const { data: branchesListData } = useGetBranchesQuery(undefined);

    /** Superadmin: no "All Branches"; labels include facility type. */
    const registrationListBranchOptions = useMemo((): SelectOption[] => {
        const rows = branchesListData?.data;
        if (!isBranchFilterSuperAdmin) {
            if (!Array.isArray(rows) || rows.length === 0) return branchFilterOptions;
            return branchFilterOptions.map((opt) => {
                const id = parseInt(String(opt.value), 10);
                if (!Number.isFinite(id)) return opt;
                const b = rows.find((x) => Number(x.id) === id) as { name?: string; type?: string } | undefined;
                if (!b?.name) return opt;
                return {
                    value: opt.value,
                    label: branchSelectLabel(String(b.name), b.type),
                };
            });
        }
        if (!Array.isArray(rows) || rows.length === 0) return [];
        return rows.map((b) => {
            const row = b as { id: number; name?: string; type?: string };
            return {
                value: String(row.id),
                label: branchSelectLabel(String(row.name ?? ""), row.type),
            };
        });
    }, [isBranchFilterSuperAdmin, branchesListData, branchFilterOptions]);

    // Super admin: default branch, or re-align if persisted id no longer exists; wait for session restore first
    useEffect(() => {
        if (!branchFilterPersistReady) return;
        if (!isBranchFilterSuperAdmin) return;
        if (isLoadingBranches) return;
        const rows = branchesListData?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (selectedBranchFilter !== "") {
            const valid = rows.some((b) => String(b.id) === selectedBranchFilter);
            if (!valid) {
                setSelectedBranchFilter(String(rows[0].id));
            }
            return;
        }
        setSelectedBranchFilter(String(rows[0].id));
    }, [
        branchFilterPersistReady,
        isBranchFilterSuperAdmin,
        isLoadingBranches,
        branchesListData,
        selectedBranchFilter,
        setSelectedBranchFilter,
    ]);

    const filterRef = useRef<HTMLDivElement>(null);

    // Persist filters and dates so list state survives navigation to view/edit pages
    useEffect(() => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem(
                REGISTRATION_LIST_FILTERS_STORAGE_KEY,
                JSON.stringify({
                    filters,
                    fromDate,
                    toDate,
                })
            );
        }
    }, [filters, fromDate, toDate]);

    // Dialog state for Doctor Exchange
    const [isDoctorDialogOpen, setIsDoctorDialogOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientRegistration | null>(null);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | string | null>(null);
    const [currentDoctorId, setCurrentDoctorId] = useState<number | string | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<string>("");

    // Success/Error dialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    // Trim the debounced search term to remove leading and trailing spaces
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || "";

    // Reset to first page when search term changes
    useEffect(() => {
        if (prevSearchTermRef.current !== filters.searchTerm) {
            prevSearchTermRef.current = filters.searchTerm;
            setFilters((prev) => ({ ...prev, currentPage: 1 }));
        }
    }, [filters.searchTerm]);

    // Handle click outside filter dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        if (isFilterOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isFilterOpen]);

    const handleFilterClick = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    const handleFilter = (filterFromDate: string, filterToDate: string) => {
        setFromDate(filterFromDate);
        setToDate(filterToDate);
        setFilters((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page when filter is applied
        setIsFilterOpen(false);
    };

    const handleClear = () => {
        // Clear dates to empty strings to match DateFilterDropdown behavior
        // Empty strings will be converted to undefined in API call, which means no date filter
        setFromDate("");
        setToDate("");
        setFilters((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page when filter is cleared
    };

    // Map sort field to API sortBy field names
    const getSortByFieldForAPI = (field: string): string | undefined => {
        const fieldMap: Record<string, string> = {
            "uhid": "uhid",
            "patientName": "patient",
            "diagnosis": "diagnosis",
            "doctorName": "doctor",
            "token": "token",
            "appointmentTime": "appointmentDate",
            "checkInTime": "createdAt",
            "vitalsStatus": "status",
            "patientStatus": "status",
        };
        return fieldMap[field] || undefined;
    };

    const appointmentsListSkip =
        !canView ||
        (isBranchFilterSuperAdmin &&
            (filterBranchId === undefined || !Number.isFinite(filterBranchId) || filterBranchId < 1));

    // Fetch appointments list from API
    // Convert empty strings to undefined for API (empty string means no filter, undefined means no date filter)
    const { data: appointmentsData, isLoading, isError, refetch: refetchAppointments } = useGetAppointmentsListQuery(
        {
            branchId: filterBranchId,
            search: searchParam,
            page: filters.currentPage,
            limit: filters.itemsPerPage,
            sortBy: filters.sortField ? getSortByFieldForAPI(filters.sortField) : undefined,
            sortOrder: filters.sortField ? (filters.sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
            fromDate: fromDate && fromDate.trim() !== "" ? fromDate : undefined,
            toDate: toDate && toDate.trim() !== "" ? toDate : undefined,
        },
        {
            // Always refetch when this page mounts or filters change,
            // so the list reflects latest vitals/medical updates
            refetchOnMountOrArgChange: true,
            skip: appointmentsListSkip,
        }
    );

    useEffect(() => {
        if (!patientFormDownloadProps) return;
        let cancelled = false;
        let raf2Id = 0;
        let timeoutId: number | null = null;
        // Double rAF + setTimeout(0) so React commits and the browser paints the spinner before
        // html2canvas blocks the main thread (otherwise the loader never appears).
        const raf1Id = requestAnimationFrame(() => {
            raf2Id = requestAnimationFrame(() => {
                timeoutId = window.setTimeout(() => {
                    if (cancelled) return;
                    const downloadPromise = patientFormRef.current?.downloadPdf();
                    if (downloadPromise) {
                        void downloadPromise.finally(() => {
                            if (!cancelled) {
                                setPatientFormDownloadProps(null);
                                setPdfDownloadingPatientId(null);
                                pdfDownloadBusyRef.current = false;
                            }
                        });
                    } else if (!cancelled) {
                        setPatientFormDownloadProps(null);
                        setPdfDownloadingPatientId(null);
                        pdfDownloadBusyRef.current = false;
                    }
                }, 0);
            });
        });

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf1Id);
            cancelAnimationFrame(raf2Id);
            if (timeoutId !== null) window.clearTimeout(timeoutId);
        };
    }, [patientFormDownloadProps]);

    useEffect(() => {
        if (!patientForm2DownloadProps) return;
        let cancelled = false;
        let raf2Id = 0;
        let timeoutId: number | null = null;
        const raf1Id = requestAnimationFrame(() => {
            raf2Id = requestAnimationFrame(() => {
                timeoutId = window.setTimeout(() => {
                    if (cancelled) return;
                    const downloadPromise = patientForm2Ref.current?.downloadPdf();
                    if (downloadPromise) {
                        void downloadPromise.finally(() => {
                            if (!cancelled) {
                                setPatientForm2DownloadProps(null);
                                setPdfDownloadingPatientId2(null);
                                pdfDownloadBusyRef2.current = false;
                            }
                        });
                    } else if (!cancelled) {
                        setPatientForm2DownloadProps(null);
                        setPdfDownloadingPatientId2(null);
                        pdfDownloadBusyRef2.current = false;
                    }
                }, 0);
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(raf1Id);
            cancelAnimationFrame(raf2Id);
            if (timeoutId !== null) window.clearTimeout(timeoutId);
        };
    }, [patientForm2DownloadProps]);

    useEffect(() => {
        if (!invoicePdfAppointment) return;
        let cancelled = false;
        let raf2Id = 0;
        let timeoutId: number | null = null;
        const raf1Id = requestAnimationFrame(() => {
            raf2Id = requestAnimationFrame(() => {
                timeoutId = window.setTimeout(() => {
                    if (cancelled) return;
                    const apt = invoicePdfAppointment;
                    const uhid = apt.uhid || apt.registration?.uhid || "receipt";
                    void (async () => {
                        try {
                            await downloadPaymentReceiptPdfFromElement(
                                "registration-list-invoice-capture",
                                String(uhid),
                            );
                        } catch (err) {
                            console.error("Invoice PDF download failed:", err);
                            setErrorMessage("Could not download invoice. Please try again.");
                            setShowErrorDialog(true);
                        } finally {
                            if (!cancelled) {
                                setInvoicePdfAppointment(null);
                                setInvoiceDownloadingPatientId(null);
                                invoiceDownloadBusyRef.current = false;
                            }
                        }
                    })();
                }, 0);
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(raf1Id);
            cancelAnimationFrame(raf2Id);
            if (timeoutId !== null) window.clearTimeout(timeoutId);
        };
    }, [invoicePdfAppointment]);

    // Mutation for updating doctor
    const [updateAppointmentDoctor, { isLoading: isUpdatingDoctor }] = useUpdateAppointmentDoctorMutation();

    const doctorsQuerySkip =
        !canView ||
        filterBranchId === undefined ||
        !Number.isFinite(filterBranchId) ||
        filterBranchId < 1;

    // Fetch doctors list for the selected branch (required for superadmin multi-branch)
    const { data: doctorsData } = useGetDoctorsByBranchQuery(
        { branchId: filterBranchId },
        { skip: doctorsQuerySkip },
    );

    // Transform doctors to SelectOption format (label: name only; value remains doctor user id)
    const doctorOptions: SelectOption[] = useMemo(() => {
        return doctorsData?.data?.map((doctor) => {
            const id = doctor.id ?? "";
            const doctorName = (doctor.name || doctor.userName || "").trim();
            return {
                value: String(id),
                label: doctorName || `Doctor ${id}`,
            };
        }) || [];
    }, [doctorsData]);

    // Transform API data to PatientRegistration format
    const transformedData: PatientRegistration[] = useMemo(() => {
        if (!appointmentsData?.data || !Array.isArray(appointmentsData.data)) {
            return [];
        }

        return appointmentsData.data.map((appointment: AppointmentRegistration, index: number) => {
            // Determine vitals status based on isVitalMedicalAdded flag
            const vitalsStatus: "add" | "done" = appointment.isVitalMedicalAdded ? "done" : "add";

            // Map status to patientStatus (handle both lowercase and mixed case)
            const statusMap: Record<string, PatientRegistration["patientStatus"]> = {
                "active": "OPD Waiting",
                "in-progress": "OPD In Progress",
                "in_progress": "OPD In Progress",
                "completed": "Medicine Taken",
                "pharmacy-pending": "Pharmacy Pending",
                "pharmacy_pending": "Pharmacy Pending",
                "ipd-recommended": "IPD Recommended",
                "ipd_recommended": "IPD Recommended",
                "ipd-admission-in-progress": "IPD Admission In Progress",
                "ipd_admission_in_progress": "IPD Admission In Progress",
                "medicine-taken": "Medicine Taken",
                "medicine_taken": "Medicine Taken",
                "admitted": "Admitted",
                // Add more mappings as needed
            };
            const statusKey = (appointment.status || "").toLowerCase();
            const patientStatus = statusMap[statusKey] || "OPD Waiting";

            // Format appointment time from timeSlot (e.g., "10-12" to "10:00am - 12:00pm")
            const appointmentTime = formatTimeSlot(appointment.timeSlot);

            const anchorDate = resolveAppointmentAnchorDate(appointment);
            // Format check-in time from best available timestamp (see resolveAppointmentAnchorDate)
            const checkInTime = formatTimeFromDate(anchorDate);

            // Get patient name and title from registration
            const rawPatientName = appointment.registration?.patientName || appointment.registration?.patient || "";
            const patientTitle = appointment.registration?.patientTitle || null;
            const formattedPatientName = formatNameWithTitle(rawPatientName, patientTitle);
            // Get gender from registration
            const gender = appointment.registration?.gender || "";

            return {
                id: Number(appointment.id) || index + 1,
                registrationId: appointment.registration?.id || appointment.registrationId || null,
                srNo: (filters.currentPage - 1) * filters.itemsPerPage + index + 1,
                uhid: appointment.uhid || appointment.registration?.uhid || "",
                patientName: formattedPatientName,
                diagnosis: appointment.diagnosis?.name || "",
                doctorName: appointment.doctor?.name || appointment.doctor?.userName || `Dr. User ${appointment.doctorUserId}`,
                token: appointment.token || "-",
                appointmentTime: appointmentTime,
                checkInTime: checkInTime,
                vitalsStatus: vitalsStatus,
                patientStatus: patientStatus,
                gender: gender,
                createdAt: anchorDate,
            };
        });
    }, [appointmentsData, filters.currentPage, filters.itemsPerPage]);

    // Apply client-side status filter (if API doesn't support it)
    const filteredData = useMemo(() => {
        let data = [...transformedData];

        // Apply patient status filter (client-side if API doesn't support it)
        if (filters.patientStatus) {
            data = data.filter((patient) => patient.patientStatus === filters.patientStatus);
        }

        return data;
    }, [transformedData, filters.patientStatus]);

    // Get total items from API or filtered data
    const totalItems = appointmentsData?.total || filteredData.length;

    const getSortDirection = (field: string): "asc" | "desc" | null => {
        if (filters.sortField === field) {
            return filters.sortOrder;
        }
        return null;
    };

    const handleSort = (field: string) => {
        setFilters((prev) => ({
            ...prev,
            sortField: field,
            sortOrder: prev.sortField === field && prev.sortOrder === "asc" ? "desc" : "asc",
            currentPage: 1,
        }));
    };

    const handlePageChange = (page: number) => {
        setFilters((prev) => ({ ...prev, currentPage: page }));
    };

    const handleItemsPerPageChange = (items: number) => {
        setFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
    };

    const handleVitalsAction = (patientId: number, currentStatus: "add" | "done", patientName: string, gender?: string) => {
        if (!canAdd) return;
        // Navigate to vitals & medical info page if status is "add"
        // patientId here is actually the appointment ID
        if (currentStatus === "add") {
            const queryParams = new URLSearchParams();
            if (gender) queryParams.set("gender", gender);
            if (patientName) queryParams.set("patientName", patientName);
            const queryString = queryParams.toString();
            router.push(`/registration/registrationList/vitals-medical/${patientId}${queryString ? `?${queryString}` : ""}`);
        } else {
            // If "done", maybe show view/edit page or do nothing
            console.log(`Viewing vitals for patient ${patientId}`);
        }
    };

    const handleDoctorAction = (patientId: number) => {
        if (!canEdit) return;
        // Find the appointment from the original API data
        const appointment = appointmentsData?.data?.find((apt: AppointmentRegistration) => Number(apt.id) === patientId);
        // Find the patient data from transformed data
        const patient = filteredData.find((p) => p.id === patientId);
        if (patient && appointment) {
            setSelectedPatient(patient);
            setSelectedAppointmentId(Number(appointment.id));
            setCurrentDoctorId(appointment.doctorUserId || null);
            setSelectedDoctor("");
            setIsDoctorDialogOpen(true);
        }
    };

    const handleDoctorDialogSubmit = async () => {
        if (selectedPatient && selectedDoctor && selectedAppointmentId) {
            // Prevent selecting the same doctor
            if (currentDoctorId && Number(selectedDoctor) === Number(currentDoctorId)) {
                setErrorMessage("Please select a different doctor.");
                setShowErrorDialog(true);
                return;
            }

            try {
                const result = await updateAppointmentDoctor({
                    appointmentId: selectedAppointmentId,
                    doctorUserId: Number(selectedDoctor),
                }).unwrap();

                // Close the doctor exchange dialog
                setIsDoctorDialogOpen(false);
                setSelectedPatient(null);
                setSelectedAppointmentId(null);
                setCurrentDoctorId(null);
                setSelectedDoctor("");

                // Show success message
                setSuccessMessage(result.message || "Doctor updated successfully");
                setShowSuccessDialog(true);

                // Re-fetch appointments list
                refetchAppointments();
            } catch (error: any) {
                // Close the doctor exchange dialog
                setIsDoctorDialogOpen(false);
                setSelectedPatient(null);
                setSelectedAppointmentId(null);
                setCurrentDoctorId(null);
                setSelectedDoctor("");

                // Show error message
                const errorMsg = error?.data?.message || error?.message || "Failed to update doctor. Please try again.";
                setErrorMessage(errorMsg);
                setShowErrorDialog(true);
            }
        }
    };

    const handleDoctorDialogCancel = () => {
        setIsDoctorDialogOpen(false);
        setSelectedPatient(null);
        setSelectedAppointmentId(null);
        setCurrentDoctorId(null);
        setSelectedDoctor("");
    };

    const handleView = (patient: PatientRegistration) => {
        if (!canView) return;
        // Use appointmentId (patient.id) instead of registrationId
        if (!patient.id) {
            console.error("Appointment ID not found for patient:", patient);
            return;
        }
        router.push(`/registration/registrationList/${patient.id}/view`);
    };

    const handleEdit = (patient: PatientRegistration) => {
        if (!canEdit) return;
        if (!patient.registrationId) {
            console.error("Registration ID not found for patient:", patient);
            return;
        }
        router.push(`/registration/registrationList/${patient.registrationId}/edit`);
    };

    const handleDownloadListInvoice = (patient: PatientRegistration) => {
        if (!canDownload) return;
        if (
            invoiceDownloadBusyRef.current ||
            invoiceDownloadingPatientId !== null ||
            pdfDownloadingPatientId !== null
        ) {
            return;
        }
        const apt = appointmentsData?.data?.find((a: AppointmentRegistration) => Number(a.id) === patient.id);
        if (!apt) {
            setErrorMessage("Appointment not found for this row.");
            setShowErrorDialog(true);
            return;
        }
        const createdRaw =
            patient.createdAt ?? resolveAppointmentAnchorDate(apt) ?? (apt.createdAt != null ? String(apt.createdAt) : "");
        if (!isWithinInvoiceDownloadWindow(createdRaw)) {
            setErrorMessage("Invoice download is only available within 24 hours of the appointment creation time.");
            setShowErrorDialog(true);
            return;
        }
        invoiceDownloadBusyRef.current = true;
        flushSync(() => {
            setInvoiceDownloadingPatientId(patient.id);
        });
        setInvoicePdfAppointment(apt);
    };

    const handleDownloadPDF = (patient: PatientRegistration) => {
        if (!canDownload) return;
        if (
            pdfDownloadBusyRef.current ||
            pdfDownloadingPatientId !== null ||
            invoiceDownloadingPatientId !== null
        ) {
            return;
        }
        pdfDownloadBusyRef.current = true;
        const appointment = appointmentsData?.data?.find(
            (apt: AppointmentRegistration) => Number(apt.id) === patient.id
        );
        // Commit loading state immediately so the button disables before the next click can fire
        flushSync(() => {
            setPdfDownloadingPatientId(patient.id);
        });
        setPatientFormDownloadProps(
            buildPatientFormDownloadProps(patient, appointment, loginType)
        );
    };

    const handleDownloadPDF2 = (patient: PatientRegistration) => {
        if (!canDownload) return;
        if (
            pdfDownloadBusyRef2.current ||
            pdfDownloadingPatientId2 !== null ||
            pdfDownloadingPatientId !== null ||
            invoiceDownloadingPatientId !== null
        ) {
            return;
        }
        pdfDownloadBusyRef2.current = true;
        const appointment = appointmentsData?.data?.find(
            (apt: AppointmentRegistration) => Number(apt.id) === patient.id
        );
        flushSync(() => {
            setPdfDownloadingPatientId2(patient.id);
        });
        setPatientForm2DownloadProps(
            buildPatientForm2DownloadProps(patient, appointment, loginType)
        );
    };

    if (!canView) {
        return (
            <AppShell>
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                    You don&apos;t have permission to view patient registration list.
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Registration List" />
                    {/* Only show back button if user is NOT a nurse */}
                    {!isNurse && (
                        <div className="px-5">
                            <BackToPreviousPageButton
                                iconOnly={true}
                                onClick={() => router.back()}
                            />
                        </div>
                    )}
                </div>

                <ListBorder as="section" className="px-4 py-4" style={{ overflow: 'visible' }}>
                    <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]" style={{ overflow: 'visible' }}>
                        <div className="mb-6 flex items-center justify-between" style={{ overflow: 'visible' }}>
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex items-center gap-3 relative">
                                <FormSelectField
                                    label=""
                                    hideLabel
                                    options={registrationListBranchOptions}
                                    value={selectedBranchFilter}
                                    onChange={(value) => {
                                        setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                                        setFilters((prev) => ({ ...prev, currentPage: 1 }));
                                    }}
                                    placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                                    mode="single"
                                    background="normal"
                                    width={300}
                                    disabled={isBranchFilterDisabled || isLoadingBranches}
                                />
                                <div className="relative" ref={filterRef}>
                                    <button
                                        onClick={handleFilterClick}
                                        className="cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center w-[108px] h-10 rounded-[32px] border border-[#0B8C00] bg-white hover:bg-[#F7FAF7] relative z-10"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Image src="/icons/FilterIcon.svg" alt="filter" width={24} height={24} />
                                            <span className="font-inter font-medium text-sm leading-[120%] text-[#0B8C00]">Filter</span>
                                        </div>
                                    </button>
                                    {isFilterOpen && (
                                        <div className="absolute right-0 top-full mt-2 z-50">
                                            <DateFilterDropdown
                                                onFilter={handleFilter}
                                                onClear={handleClear}
                                                initialFromDate={fromDate}
                                                initialToDate={toDate}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="lg:w-[300px] lg:flex-shrink-0">
                                    <FormSelectField
                                        label=""
                                        options={patientStatusOptions}
                                        value={filters.patientStatus || null}
                                        onChange={(value) => {
                                            const selectedValue = typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
                                            setFilters((prev) => ({ ...prev, patientStatus: selectedValue, currentPage: 1 }));
                                        }}
                                        placeholder="Select patient Status"
                                        background="normal"
                                        width={300}
                                    />
                                </div>
                                <div className="lg:w-[300px] lg:flex-shrink-0">
                                    <TableSearchInput
                                        value={filters.searchTerm}
                                        onChange={(value) => {
                                            // Trim leading spaces from input value
                                            const trimmedValue = value.trimStart();
                                            setFilters((prev) => ({ ...prev, searchTerm: trimmedValue, currentPage: 1 }));
                                        }}
                                        placeholder="Search Here..."
                                    />
                                </div>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white">
                                    <TableHead position="first">Sr no.</TableHead>
                                    <TableHead
                                        sortable
                                        onSort={() => handleSort("uhid")}
                                        sortDirection={getSortDirection("uhid")}
                                    >
                                        UHID
                                    </TableHead>
                                    <TableHead
                                    // sortable
                                    // onSort={() => handleSort("patientName")}
                                    // sortDirection={getSortDirection("patientName")}
                                    >
                                        Patient Name
                                    </TableHead>
                                    <TableHead>
                                        Token
                                    </TableHead>
                                    <TableHead>
                                        Vitals & Medical
                                    </TableHead>
                                    <TableHead
                                    // sortable
                                    // onSort={() => handleSort("doctorName")}
                                    // sortDirection={getSortDirection("doctorName")}
                                    >
                                        Doctor Name
                                    </TableHead>
                                    <TableHead
                                    // sortable
                                    // onSort={() => handleSort("appointmentTime")}
                                    // sortDirection={getSortDirection("appointmentTime")}
                                    >
                                        Appointment Time
                                    </TableHead>
                                    <TableHead
                                    // sortable
                                    // onSort={() => handleSort("checkInTime")}
                                    // sortDirection={getSortDirection("checkInTime")}
                                    >
                                        Check-In Time
                                    </TableHead>
                                    <TableHead>
                                        Diagnosis
                                    </TableHead>
                                    <TableHead>
                                        Patient Status
                                    </TableHead>
                                    {canView || canAdd || canEdit || canDownload ? (
                                        <TableHead position="last">Action</TableHead>
                                    ) : null}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={canView || canAdd || canEdit || canDownload ? 11 : 10}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            Loading appointments...
                                        </TableData>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={canView || canAdd || canEdit || canDownload ? 11 : 10}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            Error loading appointments
                                        </TableData>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={canView || canAdd || canEdit || canDownload ? 11 : 10}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            No patient registrations found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    filteredData.map((patient) => (
                                        <TableRow
                                            key={patient.id}
                                            className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                        >
                                            <TableData variant="primary">
                                                {patient.srNo}
                                            </TableData>
                                            <TableData onClick={canView ? () => handleView(patient) : undefined}><span className="text-[#0B8C00] font-medium">{patient.uhid}</span></TableData>
                                            <TableData onClick={canView ? () => handleView(patient) : undefined}>
                                                <Tooltip content={patient.patientName} position="top" delay={0}>
                                                    <div className="max-w-[200px] truncate inline-block align-top">
                                                        {patient.patientName}
                                                    </div>
                                                </Tooltip>
                                            </TableData>
                                            <TableData>
                                                {patient.token && patient.token !== "-" ? (
                                                    <span className="inline-flex items-center justify-center h-6 px-5 py-2 rounded-[30px] bg-white border border-[#0B8C00]/20 text-xs font-normal text-[#0B8C00] leading-[120%] whitespace-nowrap">
                                                        {patient.token}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-normal text-[#434956]">-</span>
                                                )}
                                            </TableData>
                                            <TableData>
                                                {patient.vitalsStatus === "done" ? (
                                                    <button
                                                        type="button"
                                                        disabled={!canAdd}
                                                        onClick={
                                                            canAdd
                                                                ? () =>
                                                                      handleVitalsAction(
                                                                          patient.id,
                                                                          patient.vitalsStatus,
                                                                          patient.patientName,
                                                                          patient.gender
                                                                      )
                                                                : undefined
                                                        }
                                                        className={`flex items-center justify-center h-6 px-5 py-2 rounded-[30px] text-xs font-medium border transition-colors ${
                                                            canAdd
                                                                ? "text-[#0B8C00] bg-white border-[#0B8C00]/20 hover:bg-[#F2F8F2]"
                                                                : "text-[#9CA3AF] bg-[#F9FAFB] border-[#E5E7EB] cursor-not-allowed"
                                                        }`}
                                                    >
                                                        Done
                                                    </button>
                                                ) : canAdd ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleVitalsAction(
                                                                patient.id,
                                                                patient.vitalsStatus,
                                                                patient.patientName,
                                                                patient.gender,
                                                            )
                                                        }
                                                        className="flex items-center justify-center gap-1 h-6 px-3 py-2 rounded-[32px] text-xs font-medium text-white bg-[#0B8C00] border border-[#0B8C00] cursor-pointer hover:opacity-90"
                                                    >
                                                        <Image
                                                            src="/icons/AddIconWhite.svg"
                                                            alt="Add"
                                                            width={14}
                                                            height={14}
                                                            className="shrink-0"
                                                        />
                                                        <span>Add</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs font-normal text-[#434956]">-</span>
                                                )}
                                            </TableData>
                                            <TableData>{patient.doctorName}</TableData>
                                            <TableData>{patient.appointmentTime}</TableData>
                                            <TableData>{patient.checkInTime}</TableData>
                                            <TableData>{patient.diagnosis ? patient.diagnosis : "-"}</TableData>
                                            <TableData>
                                                <span className={getStatusBadgeClasses(patient.patientStatus)}>
                                                    {patient.patientStatus}
                                                </span>
                                            </TableData>
                                            {canView || canAdd || canEdit || canDownload ? (
                                                <TableData className="">
                                                    <div className="flex items-center gap-3">
                                                        {canView ? (
                                                            <Tooltip content="View" position="top">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleView(patient)}
                                                                    className="cursor-pointer flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                                    aria-label="View"
                                                                >
                                                                    <Image
                                                                        src="/icons/ViewEyeIcon.svg"
                                                                        alt="View"
                                                                        width={20}
                                                                        height={20}
                                                                    />
                                                                </button>
                                                            </Tooltip>
                                                        ) : null}
                                                        {!isNurse && canEdit ? (
                                                            <>
                                                                <Tooltip content="Edit" position="top" delay={0}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEdit(patient)}
                                                                        className="cursor-pointer flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                                        aria-label="Edit"
                                                                    >
                                                                        <Image
                                                                            src="/icons/EditIconBlack.svg"
                                                                            alt="Edit"
                                                                            width={20}
                                                                            height={20}
                                                                        />
                                                                    </button>
                                                                </Tooltip>
                                                                <Tooltip content="Doctor Change" position="top" delay={0}>
                                                                    <button
                                                                        onClick={() => handleDoctorAction(patient.id)}
                                                                        className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-[#F2F8F2] transition-colors"
                                                                        aria-label="Doctor Action"
                                                                    >
                                                                    <Image
                                                                        src="/icons/doctorIcon.svg"
                                                                        alt="Doctor"
                                                                        width={20}
                                                                        height={20}
                                                                        className="text-[#434956]"
                                                                    />
                                                                </button>
                                                                </Tooltip>
                                                            </>
                                                        ) : null}
                                                        {canDownload ? (
                                                            <>
                                                                <Tooltip
                                                                    content="Patient form"
                                                                    position="top"
                                                                    delay={0}
                                                                    disabled={
                                                                        pdfDownloadingPatientId !== null ||
                                                                        invoiceDownloadingPatientId !== null
                                                                    }
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            pdfDownloadingPatientId !== null ||
                                                                            invoiceDownloadingPatientId !== null
                                                                        }
                                                                        onClick={() => handleDownloadPDF(patient)}
                                                                        className={`flex min-h-8 min-w-8 items-center justify-center rounded-[8px] transition-colors disabled:pointer-events-none ${
                                                                            pdfDownloadingPatientId === patient.id
                                                                                ? "cursor-wait bg-[#F2F8F2] disabled:opacity-100"
                                                                                : pdfDownloadingPatientId !== null ||
                                                                                    invoiceDownloadingPatientId !== null
                                                                                  ? "cursor-not-allowed opacity-50"
                                                                                  : "cursor-pointer hover:bg-[#F2F8F2]"
                                                                        }`}
                                                                        aria-label={
                                                                            pdfDownloadingPatientId === patient.id
                                                                                ? "Generating patient form PDF"
                                                                                : "Download patient form"
                                                                        }
                                                                    >
                                                                        {pdfDownloadingPatientId === patient.id ? (
                                                                            <SpinnerLoader />
                                                                        ) : (
                                                                            <Image
                                                                                src="/icons/DownloadExport.svg"
                                                                                alt=""
                                                                                width={20}
                                                                                height={20}
                                                                            />
                                                                        )}
                                                                    </button>
                                                                </Tooltip>
                                                                {/*
                                                                <Tooltip
                                                                    content="Download Patient Form 2"
                                                                    position="top"
                                                                    delay={0}
                                                                    disabled={
                                                                        pdfDownloadingPatientId2 !== null ||
                                                                        pdfDownloadingPatientId !== null ||
                                                                        invoiceDownloadingPatientId !== null
                                                                    }
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            pdfDownloadingPatientId2 !== null ||
                                                                            pdfDownloadingPatientId !== null ||
                                                                            invoiceDownloadingPatientId !== null
                                                                        }
                                                                        onClick={() => handleDownloadPDF2(patient)}
                                                                        className={`flex min-h-8 min-w-8 items-center justify-center rounded-[8px] transition-colors disabled:pointer-events-none ${
                                                                            pdfDownloadingPatientId2 === patient.id
                                                                                ? "cursor-wait bg-[#F2F8F2] disabled:opacity-100"
                                                                                : pdfDownloadingPatientId2 !== null ||
                                                                                    pdfDownloadingPatientId !== null ||
                                                                                    invoiceDownloadingPatientId !== null
                                                                                  ? "cursor-not-allowed opacity-50"
                                                                                  : "cursor-pointer hover:bg-[#F2F8F2]"
                                                                        }`}
                                                                        aria-label={
                                                                            pdfDownloadingPatientId2 === patient.id
                                                                                ? "Generating patient form 2 PDF"
                                                                                : "Download patient form 2"
                                                                        }
                                                                    >
                                                                        {pdfDownloadingPatientId2 === patient.id ? (
                                                                            <SpinnerLoader />
                                                                        ) : (
                                                                            <Image
                                                                                src="/icons/DownloadExport.svg"
                                                                                alt=""
                                                                                width={20}
                                                                                height={20}
                                                                            />
                                                                        )}
                                                                    </button>
                                                                </Tooltip>
                                                                */}
                                                                {isWithinInvoiceDownloadWindow(patient.createdAt) ? (
                                                                    <Tooltip
                                                                        content="Download invoice"
                                                                        position="top"
                                                                        delay={0}
                                                                        disabled={
                                                                            pdfDownloadingPatientId !== null ||
                                                                            invoiceDownloadingPatientId !== null
                                                                        }
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                pdfDownloadingPatientId !== null ||
                                                                                invoiceDownloadingPatientId !== null
                                                                            }
                                                                            onClick={() => handleDownloadListInvoice(patient)}
                                                                            className={`flex min-h-8 min-w-8 items-center justify-center rounded-[8px] transition-colors disabled:pointer-events-none ${
                                                                                invoiceDownloadingPatientId === patient.id
                                                                                    ? "cursor-wait bg-[#F2F8F2] disabled:opacity-100"
                                                                                    : pdfDownloadingPatientId !== null ||
                                                                                        invoiceDownloadingPatientId !== null
                                                                                      ? "cursor-not-allowed opacity-50"
                                                                                      : "cursor-pointer hover:bg-[#F2F8F2]"
                                                                            }`}
                                                                            aria-label={
                                                                                invoiceDownloadingPatientId === patient.id
                                                                                    ? "Generating invoice PDF"
                                                                                    : "Download patient invoice"
                                                                            }
                                                                        >
                                                                            {invoiceDownloadingPatientId === patient.id ? (
                                                                                <SpinnerLoader />
                                                                            ) : (
                                                                                <Image
                                                                                    src="/icons/InvoiceDownloadIcon.svg"
                                                                                    alt=""
                                                                                    width={15}
                                                                                    height={15}
                                                                                />
                                                                            )}
                                                                        </button>
                                                                    </Tooltip>
                                                                ) : null}
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </TableData>
                                            ) : null}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {!isLoading && !isError && totalItems > 0 && (
                            <Pagination
                                currentPage={filters.currentPage}
                                totalItems={totalItems}
                                itemsPerPage={filters.itemsPerPage}
                                onPageChange={handlePageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                            />
                        )}
                    </div>
                </ListBorder>
            </div>

            {/* Doctor Exchange Dialog */}
            <Dialog
                open={isDoctorDialogOpen && canEdit}
                onClose={handleDoctorDialogCancel}
                title="Doctor Exchange"
                width={577}
            >
                <div className="flex flex-col gap-6">
                    {/* Current Doctor */}
                    <div>
                        <FormInputField
                            label="Current Doctor"
                            value={selectedPatient?.doctorName || ""}
                            onChange={() => { }}
                            placeholder=""
                            type="text"
                            disabled
                            className="!cursor-not-allowed"
                        />
                    </div>

                    {/* To Section */}
                    <div>
                        <FormSelectField
                            label="Choose Doctor"
                            options={doctorOptions}
                            value={selectedDoctor || null}
                            onChange={(value) => {
                                const selectedValue = typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
                                setSelectedDoctor(selectedValue || "");
                            }}
                            placeholder="Select Doctor"
                            mode="single"
                            background="white"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={handleDoctorDialogCancel}
                            className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#F2F8F2]"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleDoctorDialogSubmit}
                            disabled={!selectedDoctor || isUpdatingDoctor}
                            isLoading={isUpdatingDoctor}
                        >
                            Submit
                        </Button>
                    </div>
                </div>
            </Dialog>

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
                icon="/icons/ErrorIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />

            {patientFormDownloadProps ? (
                <PatientCGHS ref={patientFormRef} {...patientFormDownloadProps} />
            ) : null}

            {patientForm2DownloadProps ? (
                <PatientForm2 ref={patientForm2Ref} {...patientForm2DownloadProps} />
            ) : null}

            {invoicePdfAppointment ? (
                <div
                    className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] w-[min(720px,100vw)] overflow-visible"
                    aria-hidden
                >
                    <div className="invoice-content flex w-full min-w-0 flex-col gap-[16px]">
                        <PaymentReceiptCapture {...buildListInvoiceReceiptProps(invoicePdfAppointment)} />
                    </div>
                </div>
            ) : null}
        </AppShell>
    );
}
