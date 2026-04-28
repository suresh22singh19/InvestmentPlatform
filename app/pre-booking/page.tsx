"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Table, TableHeader, TableBody, TableRow, TableHead, Tooltip, TableData, TableSearchInput, Tabs, Pagination, FormSelectField, BackToPreviousPageButton, Button, Dialog, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import Image from "next/image";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGetAllPrebookingsQuery, useSendAddressSmsMutation, type PreBookingListItem } from "@/store/api/preBookingApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectUserEmail } from "@/store/slices/authSlice";
import { usePermission } from "@/hooks/usePermission";
import {
    PRE_BOOKING_LIST_BRANCH_STORAGE_KEY,
    useBranchFilter,
} from "@/hooks/useBranchFilter";

// Same email → route mapping as in TopNavigationBar
const EMAIL_REGISTRATION_ROUTE: Record<string, string> = {
    "superadminhiims@dikonia.in": "/registration",
    "superadminhiims2@dikonia.in": "/registration/hospital",
};
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useDebounce } from "@/hooks/useDebounce";

type PreBookingRow = {
    id: number;
    bookingId: number;
    patientName: string;
    contact: string;
    branchName: string;
    doctor: string;
    bookingType: string;
    bookingPrice: number | string;
    status: string;
    gender: string;
    city: string;
    state: string;
    createdAt: string;
    appointmentDisplay: string;
    isAppointmentToday: boolean;
};

const DEFAULT_FROM_DATE = "2025-01-01";
const DEFAULT_TO_DATE = "2026-12-31";
const PRE_BOOKING_EDIT_STORAGE_KEY = "hiims-pre-booking-edit-data";

function formatDisplayDate(isoDate: string | null | undefined): string {
    if (!isoDate) return "—";
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return "—";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
        return "—";
    }
}

function capitalizeFirst(str: string | null | undefined): string {
    if (str == null || str === "") return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** API sends `YYYY-MM-DD`; show as DD-MM-YYYY. */
function formatAppointmentYmdToDisplay(ymd: string | null | undefined): string {
    if (ymd == null || String(ymd).trim() === "") return "";
    const s = String(ymd).trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return "";
    return `${m[3]}-${m[2]}-${m[1]}`;
}

function formatAppointmentCell(
    appointmentDate: string | null | undefined,
    appointmentTime: string | null | undefined,
): string {
    const d = formatAppointmentYmdToDisplay(appointmentDate);
    const t = appointmentTime != null ? String(appointmentTime).trim() : "";
    if (!d && !t) return "—";
    if (!d) return t || "—";
    if (!t) return d;
    return `${d} ${t}`;
}

/** Compare API calendar date to today in local timezone. */
function isAppointmentDateToday(appointmentDate: string | null | undefined): boolean {
    if (appointmentDate == null || String(appointmentDate).trim() === "") return false;
    const s = String(appointmentDate).trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    const apt = new Date(y, mo, day);
    if (apt.getFullYear() !== y || apt.getMonth() !== mo || apt.getDate() !== day) return false;
    const now = new Date();
    return (
        apt.getFullYear() === now.getFullYear() &&
        apt.getMonth() === now.getMonth() &&
        apt.getDate() === now.getDate()
    );
}

const BOOKING_TYPE_LABEL: Record<string, string> = {
    opd: "OPD",
    ipd: "IPD",
    confirmed: "Confirmed",
};

export default function PreBookingPage() {
    const router = useRouter();
    const preBookingPermission = usePermission("Pre Booking");
    const preBookingSubPermission = usePermission("Pre Booking", { subModule: "Pre Booking" });
    const canView = preBookingPermission.canView || preBookingSubPermission.canView;
    const canAdd = preBookingPermission.canAdd || preBookingSubPermission.canAdd;
    const canEdit = preBookingPermission.canEdit || preBookingSubPermission.canEdit;
    const userBranchId = useAppSelector(selectUserBranchId);
    const userEmail = useAppSelector(selectUserEmail);
    // Direct registration route for special admin emails (null = show dialog as before)
    const emailBasedRoute = userEmail ? (EMAIL_REGISTRATION_ROUTE[userEmail.toLowerCase()] ?? null) : null;

    const {
        selectedBranchFilter: selectedBranchId,
        setSelectedBranchFilter: setSelectedBranchId,
        branchFilterOptions: branchOptions,
        isLoadingBranches: isLoadingBranches,
        isBranchFilterDisabled,
        filterBranchId: hookFilterBranchId,
        isSuperAdmin: isBranchFilterSuperAdmin,
        branchFilterPersistReady,
    } = useBranchFilter({ persistSuperAdminSelectionKey: PRE_BOOKING_LIST_BRANCH_STORAGE_KEY });

    const { data: branchesData } = useGetBranchesQuery();

    /** Pre-booking branch filter: append facility `type`; superadmin has no "All Branches" (first branch is default). */
    const branchOptionsWithType = useMemo((): SelectOption[] => {
        const rows = branchesData?.data;
        const mapped =
            !Array.isArray(rows) || rows.length === 0
                ? branchOptions
                : branchOptions.map((opt) => {
                      if (opt.value === "") return opt;
                      const id = parseInt(String(opt.value), 10);
                      if (!Number.isFinite(id)) return opt;
                      const b = rows.find((x) => Number(x.id) === id);
                      const t = b?.type?.trim();
                      if (!b || !t) return opt;
                      return {
                          value: opt.value,
                          label: `${b.name} (${capitalizeFirst(t)})`,
                      };
                  });
        if (isBranchFilterSuperAdmin) {
            return mapped.filter((o) => o.value !== "");
        }
        return mapped;
    }, [branchOptions, branchesData, isBranchFilterSuperAdmin]);

    /** Superadmin on Pre Booking: restore from session, validate id, else default to first branch (no "All Branches"). */
    useEffect(() => {
        if (!branchFilterPersistReady) return;
        if (!isBranchFilterSuperAdmin) return;
        if (isLoadingBranches) return;
        const rows = branchesData?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (selectedBranchId !== "") {
            const valid = rows.some((b) => String(b.id) === selectedBranchId);
            if (!valid) {
                setSelectedBranchId(String(rows[0].id));
            }
            return;
        }
        setSelectedBranchId(String(rows[0].id));
    }, [
        branchFilterPersistReady,
        isBranchFilterSuperAdmin,
        isLoadingBranches,
        branchesData,
        selectedBranchId,
        setSelectedBranchId,
    ]);

    /** Continue booking → registration URL from settings branch `type` (skip facility dialog when type is known). */
    const resolveContinueRouteFromBranchId = useCallback((branchId?: number | null): string | null => {
        if (branchId == null || !Number.isFinite(Number(branchId))) return null;
        const rows = branchesData?.data;
        if (!Array.isArray(rows)) return null;
        const b = rows.find((x) => Number(x.id) === Number(branchId));
        if (!b) return null;
        const t = (b.type ?? "").toLowerCase().trim();
        if (!t) return null;
        if (t === "hospital") return "/registration/hospital";
        if (t === "clinic") return "/registration";
        if (t === "daycare") return "/registration/daycare-registration-cli";
        return null;
    }, [branchesData]);

    const listQueryBranchId: number | null = hookFilterBranchId ?? (userBranchId ?? 1);

    const tabOptions = [
        { value: "opd", label: "OPD" },
        // { value: "ipd", label: "IPD" },
        { value: "confirmed", label: "Confirmed" },
    ];
    const tabOptions2 = [
        { value: "present", label: "Present" },
        { value: "future", label: "Future" },
        { value: "past", label: "Archived" },
    ];
    const [activeTab, setActiveTab] = useState("opd");
    const [activeTab2, setActiveTab2] = useState("present");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    /** After typing in search, period tabs are unselected until the user picks one; then dateFilter is sent with the search. Cleared when search is cleared. */
    const [periodLockedWithSearch, setPeriodLockedWithSearch] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isViewPreBooking, setIsViewPreBooking] = useState(false);
    const [selectedPreBooking, setSelectedPreBooking] = useState<PreBookingListItem | null>(null);
    const [facilityType, setFacilityType] = useState<"Hospital" | "Clinic">("Hospital");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogRow, setDialogRow] = useState<PreBookingListItem | null>(null);
    const [sendAddressConfirmOpen, setSendAddressConfirmOpen] = useState(false);
    const [sendAddressRow, setSendAddressRow] = useState<PreBookingListItem | null>(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [sendAddressSms, { isLoading: isSendingAddress }] = useSendAddressSmsMutation();

    const filterRef = useRef<HTMLDivElement>(null);
    /** Debounced search trimmed at the moment user locked a period tab; if debounced query changes, drop dateFilter until they pick a tab again. */
    const periodLockSearchSnapshotRef = useRef<string | null>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const hasSearch = debouncedSearchTerm.trim() !== "";
    const isConfirmedTab = activeTab === "confirmed";
    // While searching without a chosen period tab, do not highlight Present/Past/Future (API omits dateFilter).
    const isSearchingUi = searchTerm.trim() !== "";
    const omitDateFilterForQuery =
        isConfirmedTab || (hasSearch && !periodLockedWithSearch);

    const { data, isFetching, isError } = useGetAllPrebookingsQuery({
        branchId: listQueryBranchId,
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm,
        fromDate: fromDate || DEFAULT_FROM_DATE,
        toDate: toDate || DEFAULT_TO_DATE,
        // Confirmed list: no dateFilter. OPD: period tab or omit when searching without lock.
        dateFilter: (omitDateFilterForQuery ? "" : activeTab2) as "present" | "past" | "future" | "",
        sortBy: "createdAt",
        sortOrder: "DESC",
        bookingType: activeTab,
    }, { skip: !canView });

    const paginatedRows = useMemo((): PreBookingRow[] => {
        if (!data?.data) return [];
        // debugger
        const bookingTypeLabel = BOOKING_TYPE_LABEL[activeTab] ?? activeTab;

        return data.data.map((item) => ({
            id: item.id,
            bookingId: item.id,
            patientName: item.patient_name || "—",
            contact: item.contact_number || "—",
            branchName:
                item.branch_name != null && String(item.branch_name).trim() !== ""
                    ? String(item.branch_name).trim()
                    : "-",
            doctor: item.doctor_name || "—",
            bookingType: bookingTypeLabel,
            bookingPrice: item.price || "—",
            status: item.status ?? "—",
            gender: item.gender ?? "—",
            city: item.city ?? "—",
            state: item.state ?? "—",
            createdAt: formatDisplayDate(item.created_at),
            appointmentDisplay: formatAppointmentCell(item.appointment_date, item.appointment_time),
            isAppointmentToday: isAppointmentDateToday(item.appointment_date),
        }));
    }, [data?.data, activeTab]);


    const totalItems = data?.total ?? 0;

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setCurrentPage(1);
    };

    const handleTabChange2 = (value: string) => {
        setActiveTab2(value);
        setCurrentPage(1);
        if (searchTerm.trim() !== "") {
            setPeriodLockedWithSearch(true);
            periodLockSearchSnapshotRef.current = debouncedSearchTerm.trim();
        } else {
            setPeriodLockedWithSearch(false);
            periodLockSearchSnapshotRef.current = null;
        }
    };

    useEffect(() => {
        const curr = debouncedSearchTerm.trim();
        if (curr === "") {
            setPeriodLockedWithSearch(false);
            periodLockSearchSnapshotRef.current = null;
            return;
        }
        const snap = periodLockSearchSnapshotRef.current;
        if (snap != null && curr !== snap) {
            setPeriodLockedWithSearch(false);
            periodLockSearchSnapshotRef.current = null;
        }
    }, [debouncedSearchTerm]);

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
        setIsFilterOpen(false);
        setCurrentPage(1);
    };

    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (items: number) => {
        setItemsPerPage(items);
        setCurrentPage(1);
    };

    const handleViewRow = (row: PreBookingRow) => {
        if (!canView) return;
        const fullItem = data?.data?.find((d) => d.id === row.bookingId) ?? null;
        setSelectedPreBooking(fullItem ?? null);
        setIsViewPreBooking(true);
    };

    //View Pre Booking Dialog

    const handleContinueBooking = () => {
        if (!canEdit) return;
        if (!dialogRow) return;
        // Store only the contact number and pre-booking ID; the registration page will
        // call the API itself to get fresh data (including nested registration object).
        const bidDialog = dialogRow.branch_id;
        const continueData = {
            contactNumber: dialogRow.contact_number ?? "",
            preBookingId: dialogRow.id,
            ...(bidDialog != null && Number.isFinite(Number(bidDialog)) && Number(bidDialog) > 0
                ? { branchId: Number(bidDialog) }
                : {}),
        };
        localStorage.setItem("CONTINUE_BOOKING_DATA", JSON.stringify(continueData));
        setIsDialogOpen(false);
        const bid = dialogRow.branch_id;
        const branchQuery =
            bid != null && Number.isFinite(Number(bid)) && Number(bid) > 0 ? `?regBranch=${Number(bid)}` : "";
        if (facilityType === "Hospital") {
            router.push(`/registration/hospital${branchQuery}`);
        } else {
            router.push(`/registration${branchQuery}`);
        }
    };

    // Navigate directly without showing the dialog when the user's email uniquely
    // determines which registration page to use.
    const handleContinueBookingDirect = (row: PreBookingListItem, route: string) => {
        if (!canEdit) return;
        const bidRow = row.branch_id;
        const continueData = {
            contactNumber: row.contact_number ?? "",
            preBookingId: row.id,
            ...(bidRow != null && Number.isFinite(Number(bidRow)) && Number(bidRow) > 0
                ? { branchId: Number(bidRow) }
                : {}),
        };
        localStorage.setItem("CONTINUE_BOOKING_DATA", JSON.stringify(continueData));
        const bid = row.branch_id;
        const branchQuery =
            bid != null && Number.isFinite(Number(bid)) && Number(bid) > 0 ? `?regBranch=${Number(bid)}` : "";
        router.push(`${route}${branchQuery}`);
    };

    // Helper function to format date
    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        } catch {
            return dateString;
        }
    };

    // Helper function to format time slot
    const formatTimeSlot = (timeSlot: string | undefined | null): string => {
        if (!timeSlot) return "N/A";
        const timeSlotMap: { [key: string]: string } = {
            "09:00-10:00": "09:00am - 10:00am",
            "10:00-11:00": "10:00am - 11:00am",
            "11:00-12:00": "11:00am - 12:00pm",
            "12:00-13:00": "12:00pm - 01:00pm",
            "13:00-14:00": "01:00pm - 02:00pm",
            "14:00-15:00": "02:00pm - 03:00pm",
            "15:00-16:00": "03:00pm - 04:00pm",
            "16:00-17:00": "04:00pm - 05:00pm",
            "17:00-18:00": "05:00pm - 06:00pm",
        };
        return timeSlotMap[timeSlot] || timeSlot;
    };

    // Helper function to convert height to feet and inches
    const formatHeight = (height: string | null | undefined): string => {
        if (!height) return "N/A";
        try {
            const heightNum = parseFloat(height);
            if (isNaN(heightNum)) return height;
            // Check if height is in decimal format (feet.inches format like 5.8 for 5ft 8in)
            const feet = Math.floor(heightNum);
            const inches = Math.round((heightNum - feet) * 12);
            if (inches > 0) {
                return `${feet} ft ${inches} in`;
            }
            return `${feet} ft`;
        } catch {
            return height;
        }
    };

    // Helper function to format blood group
    const formatBloodGroup = (bloodGroup: string | null | undefined): string => {
        if (!bloodGroup) return "N/A";
        // Convert from lowercase format (e.g., "o-positive") to display format (e.g., "O+")
        const parts = bloodGroup.split("-");
        if (parts.length === 2) {
            const group = parts[0].toUpperCase();
            const sign = parts[1] === "positive" ? "+" : "-";
            return `${group}${sign}`;
        }
        return bloodGroup;
    };

    // Helper function to capitalize first letter
    const capitalizeFirstLetter = (str: string | null | undefined): string => {
        if (!str) return "N/A";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // Capitalize first letter of each word for Gender, Marital Status, Religion, Occupation (if value exists)
    const capitalizeWords = (str: string | null | undefined): string => {
        if (!str || typeof str !== "string" || !str.trim()) return "N/A";
        return str
            .trim()
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    };

    // Helper function to mask phone number (show last 4 digits, mask first 6 with 'x')
    const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
        if (!phoneNumber) return "N/A";
        const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-digits
        if (cleaned.length < 4) return phoneNumber; // If less than 4 digits, return as is
        const last4 = cleaned.slice(-4);
        const masked = "XXXXXX" + last4;
        return masked;
    };

    const handleSendAddressConfirm = async () => {
        if (!canEdit) return;
        if (!sendAddressRow) return;
        try {
            const result = await sendAddressSms({
                patientName: sendAddressRow.patient_name || "",
                contactNumber: sendAddressRow.contact_number || "",
                branchId: sendAddressRow.branch_id ?? userBranchId ?? 1,
            }).unwrap();
            setSendAddressConfirmOpen(false);
            setSendAddressRow(null);
            setSuccessMessage(result.message || "Address SMS sent successfully.");
        } catch (error: any) {
            setSendAddressConfirmOpen(false);
            setSendAddressRow(null);
            setErrorMessage(error?.data?.message || "Failed to send address SMS.");
        }
    };
    if (!canView) {
        return (
            <AppShell>
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                    You don&apos;t have permission to view pre-booking.
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            {isViewPreBooking == false && (
                <div className="space-y-8">
                    <div className="flex items-start justify-between">
                        <PageHeading title="Pre Booking" />
                    </div>
                    <div className="pending_registration flex items-center justify-between gap-4">
                        <div className="mb-0 w-[450px] pending_registration flex items-center justify-between gap-4">
                            <Tabs options={tabOptions} value={activeTab} onChange={handleTabChange} />
                        </div>
                        {canAdd ? (
                            <button
                                onClick={() => router.push("/pre-booking/new")}
                                className="flex flex-row justify-center items-center py-3 px-6 gap-1 lg:h-[48px] md:h-[36px] border border-[#0B8C00] rounded-[32px] cursor-pointer hover:bg-[#0B8C00]/10 transition-colors"
                            >
                                <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                                <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">Add Pre Booking</span>
                            </button>
                        ) : null}
                    </div>
                    <ListBorder as="section" className="px-4 py-4" style={{ overflow: 'visible' }}>
                        <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                            <div
                                className={`mb-6 flex items-center gap-4 ${isConfirmedTab ? "justify-end" : "justify-between"}`}
                            >
                                {!isConfirmedTab && (
                                    <div className="w-[450px] shrink-0">
                                        <Tabs
                                            options={tabOptions2}
                                            value={isSearchingUi && !periodLockedWithSearch ? "" : activeTab2}
                                            onChange={handleTabChange2}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    {/* Commented this for temporary purpose */}


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
                                    <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <FormSelectField
                                            label="Branch *"
                                            value={selectedBranchId}
                                            onChange={(value) => {
                                                const newValue = Array.isArray(value) ? value[0] : value ?? "";
                                                setSelectedBranchId(newValue);
                                                setCurrentPage(1);
                                            }}
                                            options={branchOptionsWithType}
                                            placeholder={isLoadingBranches ? "Loading branches..." : "Select branch"}
                                            mode="single"
                                            background="white"
                                            disabled={isBranchFilterDisabled || isLoadingBranches}
                                        />
                                    </div>
                                    <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <TableSearchInput
                                            value={searchTerm}
                                            onChange={(value) => {
                                                setSearchTerm(value);
                                                setCurrentPage(1);
                                            }}
                                            placeholder="Search "
                                        />
                                    </div>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        <TableHead position="first">Sr no.</TableHead>
                                        <TableHead>Booking ID</TableHead>
                                        <TableHead>Patient Name</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead className="w-[168px] min-w-[168px] max-w-[168px] box-border">
                                            Branch Name
                                        </TableHead>
                                        <TableHead>Doctor</TableHead>
                                        <TableHead>Booking Type</TableHead>
                                        <TableHead>Booking Price</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Gender</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead>Created At</TableHead>
                                        <TableHead>Appointment</TableHead>
                                        {canView || canEdit ? <TableHead position="last">Action</TableHead> : null}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isFetching ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={canView || canEdit ? 15 : 14}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                Loading...
                                            </TableData>
                                        </TableRow>
                                    ) : isError ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={canView || canEdit ? 15 : 14}
                                                className="py-12 text-center text-sm text-red-600"
                                            >
                                                Failed to load pre-bookings. Please try again.
                                            </TableData>
                                        </TableRow>
                                    ) : paginatedRows.length === 0 ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={canView || canEdit ? 15 : 14}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                No pre-bookings found
                                            </TableData>
                                        </TableRow>
                                    ) : (
                                        paginatedRows.map((row, index) => (
                                            <TableRow
                                                key={`${row.bookingId}-${(currentPage - 1) * itemsPerPage + index}`}
                                                className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                            >
                                                <TableData variant="primary">
                                                    {(currentPage - 1) * itemsPerPage + index + 1}
                                                </TableData>
                                                <TableData>{row.bookingId}</TableData>
                                                <TableData>
                                                    <Tooltip content={row.patientName} position="top" delay={0}>
                                                        <div className="max-w-[200px] truncate inline-block align-top">
                                                            {row.patientName}
                                                        </div>
                                                    </Tooltip>
                                                </TableData>
                                                <TableData>{maskPhoneNumber(row.contact)}</TableData>
                                                <TableData className="w-[168px] min-w-[168px] max-w-[168px] box-border">
                                                    <Tooltip
                                                        content={row.branchName}
                                                        position="top"
                                                        delay={0}
                                                        disabled={row.branchName === "-"}
                                                    >
                                                        <div className="max-w-[168px] truncate inline-block align-top">
                                                            {row.branchName}
                                                        </div>
                                                    </Tooltip>
                                                </TableData>
                                                <TableData>
                                                    <Tooltip content={row.doctor} position="top" delay={0}>
                                                        <div className="max-w-[200px] truncate inline-block align-top">
                                                            {row.doctor}
                                                        </div>
                                                    </Tooltip>
                                                </TableData>
                                                <TableData>{row.bookingType}</TableData>
                                                <TableData>{row.bookingPrice}</TableData>
                                                <TableData>
                                                    <span className="inline-flex items-center rounded-[30px] border border-[#0B8C00]/20 bg-white px-5 py-2 text-xs font-normal text-[#16A34A]">
                                                        {capitalizeFirst(row.status)}
                                                    </span>
                                                </TableData>
                                                <TableData>{row.gender}</TableData>
                                                <TableData>
                                                    <div className="max-w-[200px] truncate" title={row.city}>
                                                        {row.city}
                                                    </div>
                                                </TableData>
                                                <TableData>{row.state}</TableData>
                                                <TableData>{row.createdAt}</TableData>
                                                <TableData>
                                                    <Tooltip
                                                        content={row.appointmentDisplay}
                                                        position="top"
                                                        delay={0}
                                                        disabled={row.appointmentDisplay === "—"}
                                                    >
                                                        <div className="max-w-[250px] truncate" title={row.appointmentDisplay}>
                                                            {row.appointmentDisplay}
                                                        </div>
                                                    </Tooltip>
                                                </TableData>
                                                {canView || canEdit ? (
                                                    <TableData className="flex gap-1">
                                                        {canView ? (
                                                            <Tooltip content="View">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleViewRow(row)}
                                                                    className="cursor-pointer p-1 rounded hover:bg-[#F7FAF7] transition-colors"
                                                                    aria-label="View details"
                                                                >
                                                                    <Image src="/icons/ViewEyeIcon.svg" alt="View" width={20} height={20} />
                                                                </button>
                                                            </Tooltip>
                                                        ) : null}

                                                        {canEdit &&
                                                            activeTab !== "confirmed" &&
                                                            (activeTab2 === "present" || activeTab2 === "future") &&
                                                            row.status?.toLowerCase() !== "confirmed" && (
                                                            <><Tooltip content="Edit">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const fullItem = data?.data?.find((d) => d.id === row.bookingId) ?? null;
                                                                        if (!fullItem) return;
                                                                        try {
                                                                            localStorage.setItem(PRE_BOOKING_EDIT_STORAGE_KEY, JSON.stringify(fullItem));
                                                                        } catch {
                                                                            // Ignore storage errors and continue navigation.
                                                                        }
                                                                        router.push(`/pre-booking/new?editId=${fullItem.id}`);
                                                                    }}
                                                                    className="cursor-pointer p-1 rounded hover:bg-[#F7FAF7] transition-colors"
                                                                    aria-label="Edit pre-booking"
                                                                >
                                                                    <Image src="/icons/EditIconBlack.svg" alt="Edit" width={20} height={20} />
                                                                </button>
                                                            </Tooltip>
                                                            {activeTab2 === "present" && row.isAppointmentToday ? (
                                                            <>
                                                            <Tooltip content="Send Address">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const fullItem = data?.data?.find((d) => d.id === row.bookingId) ?? null;
                                                                        setSendAddressRow(fullItem);
                                                                        setSendAddressConfirmOpen(true);
                                                                    }}
                                                                    className="cursor-pointer p-1 rounded hover:bg-[#F7FAF7] transition-colors"
                                                                    aria-label="Send Address"
                                                                >
                                                                    <Image src="/icons/ConfimPreBooking.svg" alt="Send Address" width={20} height={20} />
                                                                </button>
                                                            </Tooltip>
                                                                <Tooltip content="Confirm">
                                                                    <button
                                                                   
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const fullItem = data?.data?.find((d) => d.id === row.bookingId) ?? null;
                                                                            if (!fullItem) return;
                                                                            const branchIdForRoute =
                                                                                fullItem.branch_id ??
                                                                                hookFilterBranchId ??
                                                                                userBranchId ??
                                                                                null;
                                                                            const routeFromType =
                                                                                resolveContinueRouteFromBranchId(branchIdForRoute);
                                                                            if (routeFromType) {
                                                                                handleContinueBookingDirect(fullItem, routeFromType);
                                                                                return;
                                                                            }
                                                                            if (emailBasedRoute) {
                                                                                handleContinueBookingDirect(fullItem, emailBasedRoute);
                                                                                return;
                                                                            }
                                                                            setDialogRow(fullItem);
                                                                            setFacilityType("Hospital");
                                                                            setIsDialogOpen(true);
                                                                        }}
                                                                        className="cursor-pointer p-1 rounded hover:bg-[#F7FAF7] transition-colors"
                                                                        aria-label="Continue booking"
                                                                    >
                                                                        <Image src="/icons/sendBlackIcon.svg" alt="Continue booking" width={20} height={20} />
                                                                    </button>
                                                                </Tooltip>
                                                            </>
                                                            ) : null}
                                                            </>
                                                        )}
                                                    </TableData>
                                                ) : null}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {totalItems > 0 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={totalItems}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={handlePageChange}
                                    onItemsPerPageChange={handleItemsPerPageChange}
                                    itemsPerPageOptions={[10, 20, 50, 100]}
                                />
                            )}
                        </div>
                    </ListBorder>


                </div>)}

            {isViewPreBooking && selectedPreBooking && (() => {
                const vb = selectedPreBooking;
                const branchName = branchesData?.data?.find((b) => b.id === vb.branch_id)?.name ?? (vb.branch_id != null ? String(vb.branch_id) : "—");
                const appointmentDateTime = [formatDate(vb.appointment_date), vb.appointment_time].filter(Boolean).join(" ") || "—";
                const addr = {
                    country: vb.country,
                    pinCode: vb.pin_code,
                    state: vb.state,
                    city: vb.city,
                    tehsil: vb.tehsil,
                    area: vb.area,
                    address: vb.address,
                    addressLine1: vb.address_line1,
                    addressLine2: vb.address_line2,
                };
                const isIndia = addr?.country === "India" || addr?.country === "6";
                const pinCodeLabel = isIndia ? "Pin Code" : "ZIP/Postal Code";
                const cityLabel = isIndia ? "District" : "City";
                const patientDisplayName = [vb.patient_title, vb.patient_name].filter(Boolean).join(" ") || "—";
                const guardianDisplayName = [vb.guardian_title, vb.guardian_name].filter(Boolean).join(" ") || "—";
                return (
                    <div className="space-y-8">
                        <div className="flex items-start justify-between">
                            <PageHeading title="View Pre Booking Form" />
                            <div className="px-5 flex items-center gap-3">
                                <BackToPreviousPageButton
                                    iconOnly={true}
                                    onClick={() => {
                                        setIsViewPreBooking(false);
                                        setSelectedPreBooking(null);
                                    }}
                                />
                            </div>
                        </div>
                        <div className="view-registration-container">
                            <div className="w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4 mb-4">
                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                    <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                        <Image src="/icons/CalendarIconDark.svg" alt="patient info" width={20} height={20} /> Pre Booking Patient Detail
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words">
                                                <p className="text-xs font-medium text-[#7B8089]">Pre Booking ID</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.id ?? "—"}</p>
                                            </div>
                                            {/* <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Branch</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{branchName}</p>
                                        </div> */}
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words">
                                                <p className="text-xs font-medium text-[#7B8089]">Appointment Date & Time</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointmentDateTime}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Booking Type</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.booking_type ? String(vb.booking_type).toUpperCase() : "—"}</p>
                                            </div>
                                            <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 break-words">
                                                <p className="text-xs font-medium text-[#7B8089]">Doctor</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.doctor_name ?? "—"}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">

                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Created Date</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{formatDisplayDate(vb.created_at)}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Remark</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.remark?.trim() || "—"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                    <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                        <Image src="/icons/patientinfo.svg" alt="patient info" width={20} height={20} /> Patient Information
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words">
                                                <p className="text-xs font-medium text-[#7B8089]">Contact Number</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{maskPhoneNumber(vb.contact_number)}</p>
                                            </div>
                                            <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 break-words">
                                                <p className="text-xs font-medium text-[#7B8089]">Patient Name</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{patientDisplayName}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Gender</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.gender ?? "—"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Age</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.age ?? "—"}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words">
                                                <p className="text-xs font-medium text-[#7B8089]">Father / Husband&apos;s Name</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{guardianDisplayName}</p>
                                            </div>

                                            <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                                <p className="text-xs font-medium text-[#7B8089]">Marital Status</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.marital_status ?? "—"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Email Address</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.email_address?.trim() ?? "—"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">UHID</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.uhid ?? "—"}</p>
                                            </div>
                                        </div>
                                        {/* <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                      
                                    </div> */}
                                    </div>
                                </div>
                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                    <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                        <Image src="/icons/addressicon.svg" alt="Address info" width={20} height={20} /> Address Information
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Country</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{String(addr?.country ?? "N/A")}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">{pinCodeLabel}</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{String(addr?.pinCode ?? "N/A")}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">State</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{String(addr?.state ?? "N/A")}</p>
                                            </div>
                                            <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                                <p className="text-xs font-medium text-[#7B8089]">{cityLabel}</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{String(addr?.city ?? "N/A")}</p>
                                            </div>
                                        </div>
                                        {isIndia ? (
                                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">Tehsil</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.tehsil ?? "N/A"}</p>
                                                </div>
                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">Area</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.area ?? "N/A"}</p>
                                                </div>
                                                <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                                    <p className="text-xs font-medium text-[#7B8089]">Address</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.address ?? addr?.addressLine1 ?? "N/A"}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">Address Line 1</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.addressLine1?.trim() ?? "N/A"}</p>
                                                </div>
                                                <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                                    <p className="text-xs font-medium text-[#7B8089]">Address Line 2</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.addressLine2?.trim() ?? "N/A"}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                    <Image src="/icons/patientinfo.svg" alt="patient info" width={20} height={20} /> Patient Type
                                </h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Patient Type</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{vb.patient_type ?? "—"}</p>
                                        </div>
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Patient Sub Type</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{vb.patient_sub_type?.trim() ?? "—"}</p>
                                        </div>
                                        <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                            <p className="text-xs font-medium text-[#7B8089]">Benificiary ID</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{vb.benificiary_id?.trim() ?? "—"}</p>
                                        </div>
                                        <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                            <p className="text-xs font-medium text-[#7B8089]">Insurance / Ayush</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{[vb.insurance_company, vb.ayush_covered].filter(Boolean).join(" / ") || "—"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div> */}
                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                    <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                        <Image src="/icons/CalendarDarkIcon.svg" alt="Appointment info" width={20} height={20} /> Appointment Information
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Doctor</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.doctor_name ?? "—"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Appointment Date</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{formatDate(vb.appointment_date)}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Appointment Time</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.appointment_time ?? "—"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Symptoms</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{vb.symptoms?.trim() ?? "—"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <Dialog
                open={isDialogOpen && canEdit}
                onClose={() => { setIsDialogOpen(false) }}
                title="Continue Booking"
                width={550}
                contentPadding="px-6 py-6"
            >
                <div className="flex flex-col gap-6">
                    {/* Subtitle */}
                    <p className="text-sm text-gray-500 -mt-2">
                        Do you want to visit in Hospital or Clinic?
                    </p>

                    {/* Facility Type Selection */}
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-medium text-gray-700">Facility Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Hospital Option */}
                            <button
                                type="button"
                                onClick={() => setFacilityType("Hospital")}
                                className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all ${facilityType === "Hospital"
                                    ? "border-green-600 bg-white"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${facilityType === "Hospital" ? "bg-green-600" : "bg-gray-300"
                                        }`} />
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={facilityType === "Hospital" ? "text-green-700" : "text-gray-400"}
                                    >
                                        <path
                                            d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v0M9 13v0M9 17v0M15 13v0M15 17v0"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                                <div className="flex flex-col items-start w-full">
                                    <span className="text-sm font-medium text-gray-900">Hospital</span>
                                    <span className="text-xs text-gray-500">Multi-specialty facility</span>
                                </div>
                            </button>

                            {/* Clinic Option */}
                            <button
                                type="button"
                                onClick={() => setFacilityType("Clinic")}
                                className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all ${facilityType === "Clinic"
                                    ? "border-green-600 bg-white"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${facilityType === "Clinic" ? "bg-green-600" : "bg-gray-300"
                                        }`} />
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={facilityType === "Clinic" ? "text-green-700" : "text-gray-400"}
                                    >
                                        <path
                                            d="M9 5h6M9 5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M9 5v14M15 5v14M12 11v2M8 19h8"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <circle cx="7" cy="19" r="2" fill="currentColor" />
                                        <circle cx="17" cy="19" r="2" fill="currentColor" />
                                    </svg>
                                </div>
                                <div className="flex flex-col items-start w-full">
                                    <span className="text-sm font-medium text-gray-900">Clinic</span>
                                    <span className="text-xs text-gray-500">Smaller practice</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Address Input */}


                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="min-w-[100px]"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleContinueBooking}
                            className="min-w-[140px]"
                        >
                            Continue
                        </Button>
                    </div>
                </div>
            </Dialog>
            {/* Send Address confirmation dialog */}
            <MessageDialog
                open={sendAddressConfirmOpen && canEdit}
                onClose={() => { setSendAddressConfirmOpen(false); setSendAddressRow(null); }}
                icon="/icons/Send.svg"
                iconBgColor="#E8F5E9"
                message="Are you sure you want to send address?"
                confirmText={isSendingAddress ? "Sending..." : "Yes"}
                cancelText="No"
                showCancel={true}
                onConfirm={handleSendAddressConfirm}
                onCancel={() => { setSendAddressConfirmOpen(false); setSendAddressRow(null); }}
            />

            {/* Success dialog */}
            <MessageDialog
                open={!!successMessage}
                onClose={() => setSuccessMessage("")}
                icon="/icons/SuccessIcon.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
                onConfirm={() => setSuccessMessage("")}
            />

            {/* Error dialog */}
            <MessageDialog
                open={!!errorMessage}
                onClose={() => setErrorMessage("")}
                icon="/icons/ErrorIcon.svg"
                iconBgColor="#FEE2E2"
                message={errorMessage}
                confirmText="OK"
                onConfirm={() => setErrorMessage("")}
            />
        </AppShell>
    );
}
