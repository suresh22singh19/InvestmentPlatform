"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
    ViewAppointment,
    BackToPreviousPageButton,
    SpinnerLoader,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import {
    useGetAdvanceBookingListQuery,
    useLazyGetAdvanceBookingDetailQuery,
} from "@/store/api/counsellorApi";
import { selectUserBranchId } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";


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
    const [bookingsList, setBookingsList] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<"patientName" | "">("patientName");

    // Date Filter State
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!filterRef.current) return;
            if (!filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleFilterClick = () => setIsFilterOpen((prev) => !prev);
    const handleFilter = (newFromDate: string, newToDate: string) => {
        setFromDate(newFromDate);
        setToDate(newToDate);
        setCurrentPage(1);
        setIsFilterOpen(false);
    };
    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
        setIsFilterOpen(false);
    };

    const authBranchId = useAppSelector(selectUserBranchId);
    const branchId = authBranchId ? Number(authBranchId) : undefined;

    const { data: bookingsRes, isLoading, isError, refetch } = useGetAdvanceBookingListQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortBy || undefined,
        order: sortOrder.toUpperCase() as "ASC" | "DESC",
        branchId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
    });

    useEffect(() => {
        if (bookingsRes?.data) {
            setBookingsList(bookingsRes.data);
        }
    }, [bookingsRes]);

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

    // Dynamic detailed booking data loading states
    const [getAdvanceBookingDetail] = useLazyGetAdvanceBookingDetailQuery();
    const [loadingBookingId, setLoadingBookingId] = useState<number | string | null>(null);
    const [fetchedBookingData, setFetchedBookingData] = useState<any>(null);

    // Client-side filtering, sorting, and pagination
    const totalItems = bookingsRes?.total ?? 0;
    const paginatedList = bookingsList;

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
        try {
            refetch();
        } catch (e) {
            console.warn("Failed to refetch bookings list:", e);
        }
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

        const isButtonLoading = loadingBookingId === item.id;
        const actions = (
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap flex items-center justify-center min-w-[50px]"
                    onClick={async () => {
                        if (!item.id) return;
                        setLoadingBookingId(item.id);
                        try {
                            const res = await getAdvanceBookingDetail(item.id).unwrap();
                            if (res && res.success) {
                                setFetchedBookingData(res.data);
                                setSelectedItem(item);
                                setViewAppointmentMode(true);
                            } else {
                                setApiErrorMessage(res?.message || "Failed to load booking details.");
                                setShowApiErrorDialog(true);
                            }
                        } catch (err: any) {
                            console.error("Error fetching booking details:", err);
                            const msg = err?.data?.message || err?.message || "An error occurred while fetching booking details.";
                            setApiErrorMessage(msg);
                            setShowApiErrorDialog(true);
                        } finally {
                            setLoadingBookingId(null);
                        }
                    }}
                    disabled={isButtonLoading}
                >
                    {isButtonLoading ? (
                        <SpinnerLoader size={16} />
                    ) : (
                        "View"
                    )}
                </Button>
                <Button
                    variant="primary"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => router.push(`/counsellor/start-counselling?id=${item.id}`)}
                >
                    StartCounselling
                </Button>
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
            {viewAppointmentMode ? (
                <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                        <PageHeading title="View" />
                        <BackToPreviousPageButton
                            text="Back"
                            onClick={() => {
                                setViewAppointmentMode(false);
                                setSelectedItem(null);
                            }}
                        />
                    </div>
                    {(() => {
                        const bookingDetail = fetchedBookingData?.bookingDetail || {};
                        const patDetails = fetchedBookingData?.patientDetails || {};
                        const referralDetail = fetchedBookingData?.referralDetail || {};
                        const medicalInfo = fetchedBookingData?.medicalInfo || {};
                        const packageInfo = fetchedBookingData?.packageInfo || {};

                        const appointmentItems = [
                            { label: "UHID", value: bookingDetail.uhid || "N/A" },
                            { label: "OPD ID", value: bookingDetail.id?.toString() || "N/A" },
                            { label: "Branch", value: bookingDetail.branch || "N/A" },
                            { label: "Doctor", value: bookingDetail.doctor || "N/A" },
                            { label: "Doctor OPD Fee", value: bookingDetail.doctorFee !== undefined ? `Rs. ${bookingDetail.doctorFee}` : "N/A" },
                            // { label: "Entry Fee", value: bookingDetail.entryFee !== undefined ? `Rs. ${bookingDetail.entryFee}` : "N/A" },
                            { label: "Appointment Date", value: bookingDetail.appointmentDate || "N/A" },
                            { label: "Time Slot", value: bookingDetail.timeSlot || "N/A" },
                            { label: "Created Date", value: bookingDetail.createdDate ? new Date(bookingDetail.createdDate).toLocaleString() : "N/A" },
                            { label: "Remark", value: bookingDetail.remark || "N/A", multiline: true },
                        ];

                        const referralItems = [
                            { label: "Source", value: referralDetail.source || "N/A" },
                            { label: "Sub Source", value: referralDetail.subSource || "N/A" },
                            { label: "Referral Doctor", value: referralDetail.referralDoctor || "N/A" },
                            { label: "Referral Name", value: referralDetail.referralName || "N/A" },
                            { label: "Mobile", value: referralDetail.mobile || "N/A" },
                        ];

                        const patientName = patDetails.name || "N/A";
                        const patientSubtitle = `Contact Number: ${patDetails.contactNumber || "N/A"} • WhatsApp: ${patDetails.whatsappNumber || "N/A"} • Age : ${patDetails.age || "N/A"} Years • Gender : ${patDetails.gender || "N/A"}`;

                        const patientBadges = [
                            ...(patDetails.bloodGroup && patDetails.bloodGroup !== "N/A" ? [{
                                label: patDetails.bloodGroup,
                                className: "inline-flex h-[30px] min-w-[76px] me-2 items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]"
                            }] : []),
                            ...(patDetails.patientType ? [{
                                label: patDetails.patientType,
                                className: "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                            }] : [])
                        ];

                        const patientInfoItems = [
                            {
                                iconSrc: "/icons/UserGear.svg",
                                iconAlt: "Father/Husband",
                                label: "Father’s/Husband’s Name",
                                value: patDetails.guardianName || "N/A",
                            },
                            {
                                iconSrc: "/icons/gendericon.svg",
                                iconAlt: "Marital Status",
                                label: "Marital Status",
                                value: patDetails.maritalStatus || "N/A",
                            },
                            {
                                iconSrc: "/icons/mapicon.svg",
                                iconAlt: "Address",
                                label: "Address",
                                value: patDetails.address || "N/A",
                            },
                            {
                                iconSrc: "/icons/adharcardicon.svg",
                                iconAlt: "Aadhar Card Number",
                                label: "Aadhar Card Number",
                                value: patDetails.aadharCardNumber || "N/A",
                            },
                        ];

                        const vitalsItems = [
                            { label: "Blood Pressure", value: patDetails.bloodPressure || "N/A", unit: "bp" },
                            { label: "Sugar Level", value: patDetails.sugarLevel || "N/A", unit: "mg/dL" },
                            { label: "Temperature", value: patDetails.temperature || "N/A", unit: "" },
                            { label: "Heart Rate", value: patDetails.heartRate || "N/A", unit: "bpm" },
                        ];

                        let addictionVal = "N/A";
                        if (medicalInfo.addiction) {
                            try {
                                const parsed = JSON.parse(medicalInfo.addiction);
                                addictionVal = Array.isArray(parsed) ? parsed.join(", ") : String(parsed);
                            } catch {
                                addictionVal = String(medicalInfo.addiction);
                            }
                        }

                        const medicalItems = [
                            { label: "Diagnosis", value: medicalInfo.diagnosis || "N/A" },
                            { label: "Disease", value: medicalInfo.diseases || "N/A" },
                            { label: "Blood Group", value: patDetails.bloodGroup || "N/A" },
                            { label: "Allergies", value: patDetails.allergies || "N/A" },
                            { label: "Surgeries", value: patDetails.surgeries || "N/A" },
                            { label: "Addiction", value: addictionVal },
                            { label: "Height", value: patDetails.height || "N/A" },
                            { label: "Weight", value: patDetails.weight || "N/A" },
                            { label: "Diet Type", value: medicalInfo.dietType || "N/A" },
                            { label: "Remark", value: medicalInfo.remark || "N/A", multiline: true },
                        ];

                        const otherInfoItems = [
                            { label: "Patient Type", value: patDetails.patientType || "N/A" },
                            { label: "Patient Sub Type", value: patDetails.patientSubType || "N/A" },
                            { label: "Beneficiary ID", value: "N/A" },
                            { label: "Insurance Company", value: "N/A" },
                            { label: "Ayush Covered", value: "N/A" },
                        ];

                        const walletDetails = [
                            { label: "Package", value: packageInfo.packageName || "N/A" },
                            { label: "Start Date", value: packageInfo.startDate || "N/A" },
                            { label: "End Date", value: packageInfo.endDate || "N/A" },
                        ];

                        return (
                            <ViewAppointment
                                appointmentItems={appointmentItems}
                                walletRemainingAmount="Rs. 0"
                                walletDetails={walletDetails}
                                referralItems={referralItems}
                                patientName={patientName}
                                patientSubtitle={patientSubtitle}
                                patientBadges={patientBadges}
                                patientInfoItems={patientInfoItems}
                                showVitals={true}
                                vitalsItems={vitalsItems}
                                timelineItems={undefined}
                                healthCardNo="N/A"
                                medicalItems={medicalItems}
                                fileItems={[]}
                                otherInfoItems={otherInfoItems}
                            />
                        );
                    })()}
                </div>
            ) : (
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
                                    <div className="flex items-center gap-3">
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
                                        <div style={{ width: "300px" }}>
                                            <TableSearchInput
                                                value={searchTerm}
                                                onChange={setSearchTerm}
                                                placeholder="Search Here..."
                                            />
                                        </div>
                                    </div>
                                ),
                                columns,
                                rows,
                                isLoading,
                                isError,
                                errorMessage: "Facing server API error",
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
            )}

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
