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
    Tooltip,
    PatientWalletDetailItem,
    FormSelectField,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useCounsellorResolvedBranchId } from "@/hooks/useBranchFilter";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import {
    useGetAdvanceBookingListQuery,
    useLazyGetAdvanceBookingDetailQuery,
} from "@/store/api/counsellorApi";
import { useGetPatientFilesQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";


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

    const TRUNCATED_TABLE_CELL_WIDTH = 150;

    function TruncatedTableCell({ text }: { text: string }) {
    const value = text?.trim() ? text.trim() : "N/A";
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const element = textRef.current;
        if (!element) return;

        const checkTruncation = () => {
        setIsTruncated(element.scrollWidth > element.clientWidth + 1);
        };

        checkTruncation();

        const observer = new ResizeObserver(checkTruncation);
        observer.observe(element);
        return () => observer.disconnect();
    }, [value]);

    return (
        <Tooltip
        position="top"
        maxWidth={360}
        disabled={!isTruncated}
        className="!overflow-visible !py-2.5"
        content={
            <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
            {value}
            </p>
        }
        >
        <div
            className="flex min-w-0 items-center"
            style={{ width: TRUNCATED_TABLE_CELL_WIDTH, maxWidth: TRUNCATED_TABLE_CELL_WIDTH }}
        >
            <span
            ref={textRef}
            className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
            >
            {value}
            </span>
            {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
        </div>
        </Tooltip>
    );
    }


export default function CounsellorAdvanceBookingsPage() {
    const router = useRouter();

    const {
        selectedBranchFilter: selectedBranch,
        setSelectedBranchFilter: setSelectedBranch,
        branchFilterOptions: hookBranchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        resolvedFilterBranchId,
    } = useCounsellorResolvedBranchId();

    const [bookingsList, setBookingsList] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
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

    const { data: bookingsRes, isLoading, isError, refetch } = useGetAdvanceBookingListQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortBy || undefined,
        order: sortOrder.toUpperCase() as "ASC" | "DESC",
        ...(resolvedFilterBranchId != null ? { branchId: resolvedFilterBranchId } : {}),
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
    },{
      skip: resolvedFilterBranchId == null, 
      refetchOnMountOrArgChange: true 
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

    const handleViewBooking = async (item: { id?: number | string }) => {
        if (!item.id) {
            setApiErrorMessage("Booking ID not found.");
            setShowApiErrorDialog(true);
            return;
        }

        setLoadingBookingId(item.id);
        try {
            const res = await getAdvanceBookingDetail(item.id).unwrap();
            if (res?.success) {
                setFetchedBookingData(res.data);
                setSelectedItem(item);
                setViewAppointmentMode(true);
            } else {
                setApiErrorMessage(res?.message || "Failed to load booking details.");
                setShowApiErrorDialog(true);
            }
        } catch (err: unknown) {
            const apiErr = err as { data?: { message?: string }; message?: string };
            setApiErrorMessage(
                apiErr?.data?.message || apiErr?.message || "An error occurred while fetching booking details."
            );
            setShowApiErrorDialog(true);
        } finally {
            setLoadingBookingId(null);
        }
    };

       const [getPresignedUrl] = useLazyGetPresignedUrlQuery();
        const { data: patientFilesResponse } = useGetPatientFilesQuery(
            { uhid: fetchedBookingData?.appointmentDetail?.uhid || "" },
            { skip: !fetchedBookingData?.appointmentDetail?.uhid, refetchOnMountOrArgChange: true }
        );
    
        const handleViewFile = async (filePath: string) => {
            try {
                const result = await getPresignedUrl({ key: filePath }).unwrap();
                const signedUrl = result?.data?.signedUrl;
                if (signedUrl) {
                    window.open(signedUrl, "_blank", "noopener,noreferrer");
                }
            } catch (err) {
                console.error("Failed to get presigned URL:", err);
                alert("Failed to open file. Please try again.");
            }
        };
    
        const patientFilesItems = useMemo(() => {
            const files = patientFilesResponse?.data;
            if (!Array.isArray(files)) return [];
            return files.map((file) => {
                const formattedDate = file.createdAt
                    ? new Date(file.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "";
                return {
                    name: file.fileName || "File",
                    size: `${file.fileType || "Document"} • ${formattedDate}`,
                    onClick: () => handleViewFile(file.path),
                    actionIconSrc: "/icons/ViewEyeIcon.svg",
                    actionIconAlt: "View File",
                };
            });
        }, [patientFilesResponse]);


    // Client-side filtering, sorting, and pagination
    const totalItems = bookingsRes?.total ?? 0;
    const paginatedList = bookingsList;

    // Setup columns matching the reference screenshot
    const columns = [
        { label: "Sr no.", position: "first" as const, className: "w-[90px] max-w-[90px]" },
        {
            label: "Patient Name",
            sortable: true,
            sortDirection: sortBy === "patientName" ? sortOrder : null,
            className: "w-[150px] max-w-[150px]",
            onSort: () => {
                setSortBy("patientName");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                setCurrentPage(1);
            },
        },
        { label: "Package Name" },
        { label: "Patient UHID" },
        { label: "Referring Doctor" },
        { label: "Chief Complaint", className: "w-[150px] max-w-[150px]"},
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

        const isRowLoading = loadingBookingId === item.id;

        // Custom green styled link for patient UHID
        const uhid = (
            <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[#0B8C00] font-medium hover:underline cursor-pointer disabled:opacity-60"
                onClick={() => void handleViewBooking(item)}
                disabled={isRowLoading}
            >
                {isRowLoading ? <SpinnerLoader size={14} /> : null}
                {item.patientUhid || "N/A"}
            </button>
        );

        const actions = (
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap flex items-center justify-center min-w-[50px]"
                    onClick={() => void handleViewBooking(item)}
                    disabled={isRowLoading}
                >
                    {isRowLoading ? (
                        <SpinnerLoader size={16} />
                    ) : (
                        "View"
                    )}
                </Button>
                {/* <Button
                    variant="primary"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => router.push(`/counsellor/start-counselling?id=${item.id}`)}
                >
                    StartCounselling
                </Button> */}
            </div>
        );

        return [
            sr,
            // item.patientName,
            <TruncatedTableCell key={`advance-booking-${item.id ?? index}`} text={`${item.patientTitle || ""} ${item.patientName || "N/A"}`} />,
            item.packageName,
            uhid,
            item.doctorName,
            // item.chiefComplaint,
            <TruncatedTableCell key={`advance-booking-${item.id ?? index}`} text={item.chiefComplaint || "N/A"} />,
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
                                setFetchedBookingData(null);
                            }}
                        />
                    </div>
                    {(() => {
                        const bookingDetail = fetchedBookingData?.bookingDetail || {};
                        const patDetails = fetchedBookingData?.patientDetails || {};
                        const referralDetail = fetchedBookingData?.referralDetail || {};
                        const medicalInfo = fetchedBookingData?.medicalInfo || {};
                        const packageInfo = fetchedBookingData?.packageInfo || {};
                        const walletInfo = fetchedBookingData?.wallet || {};

                           //Patient Wallet Information Card
                            const remainingAmount =  walletInfo?.walletExists && walletInfo.availableBalance !== undefined
                                ? `Rs. ${walletInfo.availableBalance}`
                                : "N/A";

                            const walletDetails: PatientWalletDetailItem[] = walletInfo?.walletExists
                            ? [
                                { label: "Current Balance", value: `Rs. ${walletInfo.currentBalance ?? 0}` },
                                { label: "Hold Amount", value: `Rs. ${walletInfo.holdAmount ?? 0}` },
                                { label: "Total Credit", value: `Rs. ${walletInfo.totalCredit ?? 0}` },
                                { label: "Total Debit", value: `Rs. ${walletInfo.totalDebit ?? 0}` },
                                { label: "Last Updated", value: walletInfo.lastUpdated ? new Date(walletInfo.lastUpdated).toLocaleDateString('en-GB') : "N/A" },
                            ]
                            : [
                                { label: "Package", value: "N/A" },
                                { label: "Amount", value: "N/A" },
                                { label: "Discount", value: "N/A" },
                                { label: "Expire", value: "N/A" },
                            ];

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

                       const patientName = patDetails?.name
                        ? `${patDetails?.patientTitle || ""} ${patDetails.name}`.trim()
                        : "N/A";
                        const patientSubtitle = `Contact Number: ${patDetails.contactNumber || "N/A"} • Age : ${patDetails.age || "N/A"} Years • Gender : ${patDetails.gender || "N/A"}`;

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
                                  value:  `${patDetails?.guardianTitle || ""} ${
                                        patDetails?.fatherHusbandName || patDetails?.guardianName || ""
                                    }`.trim() || "N/A",
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

                        // const walletDetails = [
                        //     { label: "Package", value: packageInfo.packageName || "N/A" },
                        //     { label: "Start Date", value: packageInfo.startDate || "N/A" },
                        //     { label: "End Date", value: packageInfo.endDate || "N/A" },
                        // ];

                        return (
                            <ViewAppointment
                                appointmentItems={appointmentItems}
                                walletRemainingAmount={remainingAmount}
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
                                fileItems={patientFilesItems}
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
                                    <div className="flex flex-wrap items-center gap-3">
                                        <FormSelectField
                                            label=""
                                            hideLabel
                                            options={hookBranchFilterOptions}
                                            value={selectedBranch}
                                            onChange={(value) => {
                                                setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                                                setCurrentPage(1);
                                            }}
                                            placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                                            mode="single"
                                            background="normal"
                                            width={280}
                                            disabled={isBranchFilterDisabled || isLoadingBranchFilter}
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
                                    // itemsPerPageOptions: [6, 12, 24, 60],
                                    itemsPerPageOptions: [10, 20, 50, 100],
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
