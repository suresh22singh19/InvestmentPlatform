"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Button,
    DatePicker,
    MessageDialog,
    FormSelectField,
    ExportButton,
    Badge,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useGetFutureAdmissionsQuery } from "@/store/api/counsellorApi";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";

// StatCard Component specifically designed for Future Admissions
interface StatCardProps {
    label: string;
    value: string | number;
    iconSrc: string;
    badgeText?: string;
    badgeType?: "success" | "neutral" | "warning";
}

function FutureAdmissionsStatCard({ label, value, iconSrc, badgeText, badgeType }: StatCardProps) {
    return (
        <div className="rounded-[20px] p-5 bg-white border border-[#E3EEE1] flex justify-between items-center transition-all duration-200 hover:shadow-md select-none">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#737A8B]">{label}</span>
                    {badgeText && (
                        <Badge
                            variant={badgeType}
                            className="px-2 py-0.5 rounded-[12px] text-[10px]"
                        >
                            {badgeText}
                        </Badge>
                    )}
                </div>
                <h4 className="font-bold text-[32px] leading-[120%] text-[#262D3B]">
                    {value}
                </h4>
            </div>
            <div>
                <Image
                    src={iconSrc}
                    alt={label}
                    width={48}
                    height={48}
                    className="object-contain"
                />
            </div>
        </div>
    );
}



export default function FutureAdmissionsPage() {
    const router = useRouter();

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const filterRef = useRef<HTMLDivElement>(null);

    // Table States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<"patientName" | "">("patientName");

    // Close Date Filter Dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleFilterClick = () => setIsFilterOpen((prev) => !prev);

    const handleFilter = (from: string, to: string) => {
        setFromDate(from);
        setToDate(to);
        setIsFilterOpen(false);
        setCurrentPage(1);
    };

    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setIsFilterOpen(false);
        setCurrentPage(1);
    };

    // Modal dialogs states
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingItemId, setSubmittingItemId] = useState<number | null>(null);
    const [pendingAction, setPendingAction] = useState<{ type: "proceed" | "reminder"; item: any } | null>(null);
    const [isLoadingPDF, setIsLoadingPDF] = useState(false);

    const handleExportPDF = async () => {
        setIsLoadingPDF(true);
        // Simulate PDF export process
        await new Promise((resolve) => setTimeout(resolve, 800));
        setIsLoadingPDF(false);
        setSuccessMessage("Future admissions report exported successfully!");
        setShowSuccessDialog(true);
    };

    // API Query params
    const queryParams = {
        sortBy: sortBy || undefined,
        order: sortOrder.toUpperCase() as "ASC" | "DESC",
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        branchId: undefined, // Branch ID can be set if needed
    };

    // Query Hook call
    const { data: apiResponse, isLoading: isFutureLoading } = useGetFutureAdmissionsQuery(queryParams);

    const metrics = apiResponse?.data?.metrics;
    const listingData = apiResponse?.data?.listing?.data || [];
    const listingTotal = apiResponse?.data?.listing?.total || 0;

    // Dynamically filter list client-side for Status and Date selectors
    const filteredList = useMemo(() => {
        let result = [...listingData];

        // 1. Status filter
        if (selectedStatus) {
            result = result.filter((item) => item.bookingStatus === selectedStatus);
        }

        // 2. Date range filter
        if (fromDate || toDate) {
            result = result.filter((item) => {
                if (!item.admissionDate) return false;
                try {
                    const d = new Date(item.admissionDate);
                    if (isNaN(d.getTime())) return false;
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    const itemYmd = `${year}-${month}-${day}`;
                    
                    if (fromDate && itemYmd < fromDate) return false;
                    if (toDate && itemYmd > toDate) return false;
                    return true;
                } catch (e) {
                    return false;
                }
            });
        }

        return result;
    }, [listingData, selectedStatus, fromDate, toDate]);

    const totalItems = (selectedStatus || fromDate || toDate) ? filteredList.length : listingTotal;

    // Since the API returns paginated data, paginatedList is just filteredList!
    const paginatedList = filteredList;

    // Handle Action Trigger: Proceed to Admission
    const handleProceedToAdmission = async (item: any) => {
        setSubmittingItemId(item.id);
        setIsSubmitting(true);
        // Simulate background processing API call delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        setIsSubmitting(false);
        setSubmittingItemId(null);
        setSuccessMessage(`Proceeded to admission successfully for ${item.patientName}!`);
        setShowSuccessDialog(true);
    };

    // Handle Action Trigger: Send Reminder
    const handleSendReminder = async (item: any) => {
        setSubmittingItemId(item.id);
        setIsSubmitting(true);
        // Simulate background processing API call delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        setIsSubmitting(false);
        setSubmittingItemId(null);
        setSuccessMessage(`Admission reminder sent successfully to ${item.patientName}!`);
        setShowSuccessDialog(true);
    };

    // Date formatter helper
    const formatAdmissionDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const formattedHours = String(hours).padStart(2, '0');
            return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
        } catch (e) {
            return dateStr;
        }
    };

    // Headers & Columns definition
    const columns = [
        { label: "Sr no.", position: "first" as const },
        {
            label: "Patient Name",
            sortable: true,
            sortDirection: sortBy === "patientName" ? sortOrder : null,
            onSort: () => {
                setSortBy("patientName");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                setCurrentPage(1);
            },
        },
        { label: "Patient UHID" },
        { label: "Booking Status" },
        { label: "Package" },
        { label: "Room Type" },
        { label: "Advance" },
        { label: "Admission Date" },
        { label: "Action", position: "last" as const, className: "cursor-pointer" },
    ];

    // Rows mapped from filtered list
    const rows = paginatedList.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        // Interactive click styled green UHID link
        const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline">
                {item.uhid || "N/A"}
            </span>
        );

        // Booking status pills (green for Confirmed, orange for Pending)
        const bookingStatusBadge = item.bookingStatus === "Confirmed" ? (
            <Badge variant="success">Confirmed</Badge>
        ) : (
            <Badge variant="warning">{item.bookingStatus || "Pending"}</Badge>
        );

        // Advance column (shows numeric value or pending orange badge)
        const advanceCol = item.advance === "Pending" || !item.advance ? (
            <Badge variant="warning">Pending</Badge>
        ) : (
            <span className="text-[#262D3B] font-medium text-sm">
                {item.advance}
            </span>
        );

        // Actions: Proceed to Admission (filled green) / Send Reminder (outlined green)
        const actions = item.bookingStatus === "Confirmed" ? (
            <Button
                variant="primary"
                size="xsmall"
                onClick={() => setPendingAction({ type: "proceed", item })}
                isLoading={isSubmitting && submittingItemId === item.id}
                disabled={isSubmitting && submittingItemId !== item.id}
                className="whitespace-nowrap "
            >
                Proceed to Admission
            </Button>
        ) : (
            <Button
                variant="outline"
                size="xsmall"
                onClick={() => setPendingAction({ type: "reminder", item })}
                isLoading={isSubmitting && submittingItemId === item.id}
                disabled={isSubmitting && submittingItemId !== item.id}
                className="whitespace-nowrap"
            >
                Send Reminder
            </Button>
        );

        return [
            sr,
            item.patientName || "N/A",
            uhid,
            bookingStatusBadge,
            item.package || "N/A",
            item.roomType || "N/A",
            advanceCol,
            formatAdmissionDate(item.admissionDate),
            actions,
        ];
    });

    // Dynamic stat cards config matching current API metrics
    const statCards = [
        {
            id: "total-bookings",
            label: "Total Bookings (Next 7 Days)",
            value: isFutureLoading ? "..." : (metrics?.totalBookingsNext7Days ?? 0),
            iconSrc: "/icons/calendarCheck.svg",
            badgeText: "+12%",
            badgeType: "success" as const,
        },
        {
            id: "confirmed-admissions",
            label: "Confirmed Admissions",
            value: isFutureLoading ? "..." : (metrics?.confirmedAdmissions ?? 0),
            iconSrc: "/icons/confirmCheck.svg",
            badgeText: "Fixed",
            badgeType: "neutral" as const,
        },
        {
            id: "tentative-bookings",
            label: "Tentative Bookings",
            value: isFutureLoading ? "..." : (metrics?.tentativeBookings ?? 0),
            iconSrc: "/icons/advanceCheck.svg",
            badgeText: "Action Request",
            badgeType: "warning" as const,
        },
        {
            id: "advances-collected",
            label: "Advances Collected",
            value: isFutureLoading
                ? "..."
                : (metrics?.advancesCollected !== undefined && metrics?.advancesCollected !== null
                    ? (String(metrics.advancesCollected).startsWith("₹")
                        ? String(metrics.advancesCollected)
                        : `₹${Number(metrics.advancesCollected).toLocaleString("en-IN")}`)
                    : "₹0"),
            iconSrc: "/icons/rupee.svg",
            badgeText: undefined,
            badgeType: undefined,
        },
    ];

    return (
        <AppShell>
            <div className="flex flex-col gap-6">
                {/* Page Heading & Export Button */}
                <div className="flex items-center justify-between">
                    <PageHeading title="Future Admissions & Bookings Tracker" />
                    <ExportButton onExportPDF={handleExportPDF} isLoadingPDF={isLoadingPDF} className="!bg-transparent" />
                </div>

                {/* Top Widgets Summary Section */}
                <div className="grid grid-cols-4 gap-4">
                    {statCards.map((card) => (
                        <FutureAdmissionsStatCard
                            key={card.id}
                            label={card.label}
                            value={card.value}
                            iconSrc={card.iconSrc}
                            badgeText={card.badgeText}
                            badgeType={card.badgeType}
                        />
                    ))}
                </div>

                {/* Dynamic Filters Row & Listing Table */}
                <TableListingCard
                    sections={[
                        {
                            id: "future-admissions-list",
                            titleRightContent: (
                                <div className="flex items-center gap-3 w-full justify-end flex-wrap md:flex-nowrap">
                                    {/* Date Range Picker Filter using DateFilterDropdown */}
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

                                    {/* Status FormSelectField Filter */}
                                    <FormSelectField
                                        label=""
                                        hideLabel
                                        options={[
                                            { label: "All", value: "" },
                                            { label: "Confirmed", value: "Confirmed" },
                                            { label: "Pending", value: "Pending" },
                                        ]}
                                        placeholder="Status"
                                        mode="single"
                                        background="normal"
                                        width={280}
                                        value={selectedStatus}
                                        onChange={(val) => {
                                            const v = typeof val === "string" ? val : "";
                                            setSelectedStatus(v);
                                            setCurrentPage(1);
                                        }}
                                    />

                                    {/* Table Search Input Filter */}
                                    <div className="w-[280px]">
                                        <TableSearchInput
                                            value={searchTerm}
                                            onChange={(val) => {
                                                setSearchTerm(val);
                                                setCurrentPage(1);
                                            }}
                                            placeholder="Search Patient Name or ID..."
                                        />
                                    </div>
                                </div>
                            ),
                            columns,
                            rows,
                            isLoading: isFutureLoading,
                            emptyMessage: "No future admissions or bookings found",
                            pagination: {
                                currentPage,
                                totalItems,
                                itemsPerPage,
                                onPageChange: setCurrentPage,
                                onItemsPerPageChange: (items: number) => {
                                    setItemsPerPage(items);
                                    setCurrentPage(1);
                                },
                                itemsPerPageOptions: [6, 12, 24, 60],
                            },
                        },
                    ]}
                />
            </div>

            {/* Action Confirmation Dialog */}
            <MessageDialog
                open={!!pendingAction}
                onClose={() => { if (!isSubmitting) setPendingAction(null); }}
                icon="/icons/questionMark.svg"
                iconBgColor="#FFF8E1"
                message={
                    pendingAction
                        ? pendingAction.type === "proceed"
                            ? `Are you sure you want to proceed to admission for ${pendingAction.item.patientName}?`
                            : `Are you sure you want to send an admission reminder to ${pendingAction.item.patientName}?`
                        : ""
                }
                confirmText="Confirm"
                cancelText="Cancel"
                showCancel
                isActionLoading={isSubmitting}
                onConfirm={async () => {
                    if (!pendingAction || isSubmitting) return;
                    if (pendingAction.type === "proceed") {
                        await handleProceedToAdmission(pendingAction.item);
                    } else {
                        await handleSendReminder(pendingAction.item);
                    }
                    setPendingAction(null);
                }}
                onCancel={() => { if (!isSubmitting) setPendingAction(null); }}
            />

            {/* Standard Feedback Dialogs */}
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
                open={showApiErrorDialog}
                onClose={() => setShowApiErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={apiErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowApiErrorDialog(false)}
            />
        </AppShell>
    );
}
