"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Dialog,
    MessageDialog,
    Button,
    DatePicker,
    FormInputField,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";

// Static interactive data matching the reference image for Advance Bookings
const STATIC_ADVANCE_BOOKINGS = [
    {
        id: 1,
        patientName: "Ajay Kumar",
        packageName: "Cardiac Premium Care",
        patientUhid: "JSKL41712025",
        doctorName: "Dr Shiv Ram Singh",
        chiefComplaint: "Fever & Body Pain",
        lastVisitDate: "18 May 2026",
        admissionDate: "18 May 2026",
    },
    {
        id: 2,
        patientName: "Rohit Singh",
        packageName: "Cardiac Standard",
        patientUhid: "JSKL41712025",
        doctorName: "Dr. Aakash Dave",
        chiefComplaint: "Chest Pain",
        lastVisitDate: "17 May 2026",
        admissionDate: "17 May 2026",
    },
    {
        id: 3,
        patientName: "Ajeet Kumar",
        packageName: "Cardiac Advanced Care",
        patientUhid: "JSKL41712025",
        doctorName: "Dr Heera Singh",
        chiefComplaint: "Migraine",
        lastVisitDate: "16 May 2026",
        admissionDate: "16 May 2026",
    },
    {
        id: 4,
        patientName: "Manish Soni",
        packageName: "Cardiac Basic Care",
        patientUhid: "JSKL41712025",
        doctorName: "Dr Alok Ashok Tripathi",
        chiefComplaint: "Stomach Infection",
        lastVisitDate: "15 May 2026",
        admissionDate: "15 May 2026",
    },
    {
        id: 5,
        patientName: "Pankaj Kumar",
        packageName: "Cardiac Premium Care",
        patientUhid: "JSKL41712025",
        doctorName: "Dr Aishwarya Subhash Thorat",
        chiefComplaint: "Back Pain",
        lastVisitDate: "14 May 2026",
        admissionDate: "14 May 2026",
    },
    {
        id: 6,
        patientName: "Aman Singh",
        packageName: "Cardiac Standard",
        patientUhid: "JSKL41712025",
        doctorName: "Dr Kadambaree",
        chiefComplaint: "High Blood Pressure",
        lastVisitDate: "13 May 2026",
        admissionDate: "13 May 2026",
    },
];

// Helper to parse "18 May 2026" to "2026-05-18" for the DatePicker input
const parseDateToInputFormat = (dateStr: string) => {
    if (!dateStr) return "";
    const months: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const monthName = parts[1].toLowerCase().substring(0, 3);
        const month = months[monthName] || "01";
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return dateStr;
};

// Helper to format "2026-05-18" to "18 May 2026" for list presentation
const formatDateToDisplayFormat = (dateStr: string) => {
    if (!dateStr) return "";
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const parts = dateStr.split("-");
    if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (monthIndex >= 0 && monthIndex < 12) {
            return `${day} ${months[monthIndex]} ${year}`;
        }
    }
    return dateStr;
};

export default function CounsellorAdvanceBookingsPage() {
    const router = useRouter();
    const [bookingsList, setBookingsList] = useState(STATIC_ADVANCE_BOOKINGS);

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<"patientName" | "">("patientName");

    // Modal state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [editDate, setEditDate] = useState("");
    const [editPackage, setEditPackage] = useState("");

    // MessageDialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Client-side filtering, sorting, and pagination
    const filteredAndSortedList = useMemo(() => {
        let result = [...bookingsList];

        // 1. Search Filter
        const query = debouncedSearch.trim().toLowerCase();
        if (query) {
            result = result.filter(
                (item) =>
                    item.patientName.toLowerCase().includes(query) ||
                    item.packageName.toLowerCase().includes(query) ||
                    item.patientUhid.toLowerCase().includes(query) ||
                    item.doctorName.toLowerCase().includes(query) ||
                    item.chiefComplaint.toLowerCase().includes(query) ||
                    item.lastVisitDate.toLowerCase().includes(query) ||
                    item.admissionDate.toLowerCase().includes(query)
            );
        }

        // 2. Sort by Patient Name
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
    }, [bookingsList, debouncedSearch, sortBy, sortOrder]);

    const totalItems = filteredAndSortedList.length;
    const paginatedList = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedList.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedList, currentPage, itemsPerPage]);

    // Setup columns matching the reference screenshot
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
        { label: "Package Name" },
        { label: "Patient UHID" },
        { label: "Referring Doctor" },
        { label: "Chief Complaint" },
        { label: "Last Visit Date" },
        { label: "Admission Date" },
        { label: "Action", position: "last" as const, className: "cursor-pointer" },
    ];

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setEditDate(parseDateToInputFormat(item.admissionDate || item.lastVisitDate));
        setEditPackage(item.packageName);
        setIsEditDialogOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editDate) {
            setApiErrorMessage("Date is required.");
            setShowApiErrorDialog(true);
            return;
        }
        if (!editPackage.trim()) {
            setApiErrorMessage("Package Name is required.");
            setShowApiErrorDialog(true);
            return;
        }

        setIsSubmitting(true);
        // Simulate a small network delay for loaders
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Live list update simulation
        const updatedList = bookingsList.map((item) => {
            if (item.id === selectedItem.id) {
                const formattedDate = formatDateToDisplayFormat(editDate);
                return {
                    ...item,
                    packageName: editPackage.trim(),
                    admissionDate: formattedDate,
                    lastVisitDate: formattedDate,
                };
            }
            return item;
        });

        setBookingsList(updatedList);
        setIsSubmitting(false);
        setIsEditDialogOpen(false);
        setSuccessMessage("Booking updated successfully!");
        setShowSuccessDialog(true);
    };

    // Setup rows dynamically mapped from list
    const rows = paginatedList.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        // Custom green styled link for patient UHID
        const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline">
                {item.patientUhid}
            </span>
        );

        // Action Buttons: View (Eye) & Edit (Pencil)
        const actions = (
            <div className="flex items-center gap-3">
                <button type="button" className="cursor-pointer hover:opacity-80 transition-opacity">
                    <Image
                        src="/icons/ViewEyeIcon.svg"
                        alt="View"
                        width={20}
                        height={20}
                    />
                </button>
                <button
                    type="button"
                    onClick={() => handleEditClick(item)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                    <Image
                        src="/icons/EditIconBlack.svg"
                        alt="Edit"
                        width={20}
                        height={20}
                    />
                </button>
            </div>
        );

        return [
            sr,
            item.patientName,
            item.packageName,
            uhid,
            item.doctorName,
            item.chiefComplaint,
            item.lastVisitDate,
            item.admissionDate,
            actions,
        ];
    });

    return (
        <AppShell>
            <div className="flex flex-col gap-6">
                {/* Page Heading */}
                <div className="flex items-start justify-between">
                    <PageHeading title="Advance Bookings" />
                </div>

                {/* Table Listing Card */}
                <TableListingCard
                    sections={[
                        {
                            id: "advance-bookings-list",
                            title: "Advance Bookings",
                            titleRightContent: (
                                <div style={{ width: "300px" }}>
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        placeholder="Search Here..."
                                    />
                                </div>
                            ),
                            columns,
                            rows,
                            emptyMessage: "No advance bookings found",
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

            {/* Edit Dialog */}
            <Dialog
                open={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                title="Edit Advance Bookings"
                width={600}
            >
                <form
                    onSubmit={handleUpdate}
                    className="space-y-6"
                >
                    <div className="space-y-6">
                        <DatePicker
                            label="Date"
                            placeholder="Select Date"
                            value={editDate}
                            onChange={setEditDate}
                            required={true}
                            background="white"
                            width="100%"
                        />
                        <FormInputField
                            label="Package"
                            value={editPackage}
                            onChange={(e) => setEditPackage(e.target.value)}
                            height={44}
                            placeholder="Package"
                            type="text"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                        >
                            Update
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Message Dialogs */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="Success"
                showCancel={false}
                onConfirm={() => {
                    setShowSuccessDialog(false);
                    router.push(`/counsellor/advance-bookings`);
                }}
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
