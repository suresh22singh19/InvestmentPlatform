"use client";

import { useState, useMemo } from "react";
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

// Static mock data representing patient future admissions and bookings
const STATIC_FUTURE_ADMISSIONS = [
    {
        id: 1,
        patientName: "Ajay Kumar",
        patientUhid: "JSKL41712025",
        bookingStatus: "Confirmed",
        packageName: "Cardiology Gold",
        roomType: "Deluxe Private",
        advance: "₹12,450",
        admissionDate: "12-01-2026 04:30 PM",
    },
    {
        id: 2,
        patientName: "Rohit Singh",
        patientUhid: "JSKL41712025",
        bookingStatus: "Pending",
        packageName: "Neurology Standard",
        roomType: "Semi-Private",
        advance: "Pending",
        admissionDate: "12-01-2026 04:30 PM",
    },
    {
        id: 3,
        patientName: "Ajeet Kumar",
        patientUhid: "JSKL41712025",
        bookingStatus: "Confirmed",
        packageName: "Executive Check-up",
        roomType: "Executive Check-up",
        advance: "₹12,450",
        admissionDate: "12-01-2026 04:30 PM",
    },
    {
        id: 4,
        patientName: "Manish Soni",
        patientUhid: "JSKL41712025",
        bookingStatus: "Pending",
        packageName: "Maternity Care",
        roomType: "General",
        advance: "Pending",
        admissionDate: "12-01-2026 04:30 PM",
    },
    {
        id: 5,
        patientName: "Pankaj Kumar",
        patientUhid: "JSKL41712025",
        bookingStatus: "Confirmed",
        packageName: "Orthopedics Deluxe",
        roomType: "Deluxe Private",
        advance: "₹12,450",
        admissionDate: "13-01-2026 11:30 AM",
    },
    {
        id: 6,
        patientName: "Aman Singh",
        patientUhid: "JSKL41712025",
        bookingStatus: "Pending",
        packageName: "Pediatric Gold",
        roomType: "General",
        advance: "Pending",
        admissionDate: "14-01-2026 02:15 PM",
    },
];

// Helper to filter items by a filter date in YYYY-MM-DD format
const matchDate = (admissionDateStr: string, filterDateStr: string) => {
    if (!filterDateStr) return true;
    // Extract date part: admissionDateStr is like "12-01-2026 04:30 PM"
    const parts = admissionDateStr.split(" ")[0].split("-");
    if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        const admissionYmd = `${year}-${month}-${day}`;
        return admissionYmd === filterDateStr;
    }
    return false;
};

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

const STAT_CARDS_CONFIG = [
    {
        id: "total-bookings",
        label: "Total Bookings (Next 7 Days)",
        value: "42",
        iconSrc: "/icons/calendarCheck.svg",
        badgeText: "+12%",
        badgeType: "success" as const,
    },
    {
        id: "confirmed-admissions",
        label: "Confirmed Admissions",
        value: "28",
        iconSrc: "/icons/confirmCheck.svg",
        badgeText: "Fixed",
        badgeType: "neutral" as const,
    },
    {
        id: "tentative-bookings",
        label: "Tentative Bookings",
        value: "14",
        iconSrc: "/icons/advanceCheck.svg",
        badgeText: "Action Request",
        badgeType: "warning" as const,
    },
    {
        id: "advances-collected",
        label: "Advances Collected",
        value: "₹12,450",
        iconSrc: "/icons/rupee.svg",
        badgeText: undefined,
        badgeType: undefined,
    },
];

export default function FutureAdmissionsPage() {
    const router = useRouter();
    const [admissionsList, setAdmissionsList] = useState(STATIC_FUTURE_ADMISSIONS);

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    // Table States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<"patientName" | "">("patientName");

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

    // Dynamically filter & sort static admissions
    const filteredAndSortedList = useMemo(() => {
        let result = [...admissionsList];

        // 1. Search filter
        const query = debouncedSearch.trim().toLowerCase();
        if (query) {
            result = result.filter(
                (item) =>
                    item.patientName.toLowerCase().includes(query) ||
                    item.patientUhid.toLowerCase().includes(query) ||
                    item.packageName.toLowerCase().includes(query) ||
                    item.roomType.toLowerCase().includes(query) ||
                    item.advance.toLowerCase().includes(query)
            );
        }

        // 2. Status filter
        if (selectedStatus) {
            result = result.filter((item) => item.bookingStatus === selectedStatus);
        }

        // 3. Date range filter
        if (selectedDate) {
            result = result.filter((item) => matchDate(item.admissionDate, selectedDate));
        }

        // 4. Sort by Patient Name
        if (sortBy === "patientName") {
            result.sort((a, b) => {
                const nameA = a.patientName.toLowerCase();
                const nameB = b.patientName.toLowerCase();
                if (nameA < nameB) return sortOrder === "asc" ? -1 : 1;
                if (nameA > nameB) return sortOrder === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [admissionsList, debouncedSearch, selectedStatus, selectedDate, sortBy, sortOrder]);

    const totalItems = filteredAndSortedList.length;
    const paginatedList = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedList.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedList, currentPage, itemsPerPage]);

    // Handle Action Trigger: Proceed to Admission
    const handleProceedToAdmission = async (item: any) => {
        setSubmittingItemId(item.id);
        setIsSubmitting(true);
        // Simulate background processing API call delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Update list status to Confirmed (if not already) and set advance
        const updated = admissionsList.map((admission) => {
            if (admission.id === item.id) {
                return {
                    ...admission,
                    bookingStatus: "Confirmed",
                    advance: "₹12,450",
                };
            }
            return admission;
        });

        setAdmissionsList(updated);
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

    // Rows mapped from filtered mock data list
    const rows = paginatedList.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        // Interactive click styled green UHID link
        const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline">
                {item.patientUhid}
            </span>
        );

        // Booking status pills (green for Confirmed, orange for Pending)
        const bookingStatusBadge = item.bookingStatus === "Confirmed" ? (
            <Badge variant="success">Confirmed</Badge>
        ) : (
            <Badge variant="warning">Pending</Badge>
        );

        // Advance column (shows numeric value or pending orange badge)
        const advanceCol = item.advance === "Pending" ? (
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
            item.patientName,
            uhid,
            bookingStatusBadge,
            item.packageName,
            item.roomType,
            advanceCol,
            item.admissionDate,
            actions,
        ];
    });

    return (
        <AppShell>
            <div className="flex flex-col gap-6">
                {/* Page Heading & Export Button */}
                <div className="flex items-center justify-between">
                    <PageHeading title="Future Admissions & Bookings Tracker" />
                    <ExportButton onExportPDF={handleExportPDF} isLoadingPDF={isLoadingPDF} />
                </div>

                {/* Top Widgets Summary Section */}
                <div className="grid grid-cols-4 gap-4">
                    {STAT_CARDS_CONFIG.map((card) => (
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
                                    {/* Date Range Picker Filter */}
                                    <div className="w-[280px]">
                                        <DatePicker
                                            value={selectedDate}
                                            onChange={setSelectedDate}
                                            placeholder="Date Range"
                                            background="normal"
                                            width="100%"
                                        />
                                    </div>

                                    {/* Status FormSelectField Filter */}
                                    <FormSelectField
                                        label=""
                                        hideLabel
                                        options={[
                                            { label: "Status", value: "" },
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
