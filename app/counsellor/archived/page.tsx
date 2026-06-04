"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Button,
    MessageDialog,
    ViewAppointment,
    BackToPreviousPageButton,
    SpinnerLoader,
} from "@/components/ui";
import {
    useGetTentativeOrArchivedListQuery,
    useRevertToOpdMutation,
    useLazyCheckFirstDayPaymentQuery,
    useLazyGetPatientDetailQuery,
} from "@/store/api/counsellorApi";
import { useDebounce } from "@/hooks/useDebounce";
import RoomAllocation from "../start-counselling/roomAllowcation";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";



export default function CounsellorArchivedPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Displays 10 items as in reference image
    const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
    const [sortBy, setSortBy] = useState<string>("patientName");
    const [activeAllocationPatient, setActiveAllocationPatient] = useState<{ patient: any; payment: any } | null>(null);

    // Date Filter State
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

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

    // Confirmation dialog and submitting states
    const [pendingAction, setPendingAction] = useState<{ type: "refer" | "startAdmission"; item: any } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successDialogConfig, setSuccessDialogConfig] = useState<{
        message: React.ReactNode;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
        onConfirm?: () => void;
        onCancel?: () => void;
    } | null>(null);
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    // Dynamic detailed patient data loading states
    const [getPatientDetail] = useLazyGetPatientDetailQuery();
    const [loadingPatientId, setLoadingPatientId] = useState<number | string | null>(null);
    const [fetchedPatientData, setFetchedPatientData] = useState<any>(null);

    const [revertToOpd] = useRevertToOpdMutation();
    const [checkFirstDayPayment] = useLazyCheckFirstDayPaymentQuery();

    // Reset page on search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    // Integrate backend query hook
    const {
        data: listRes,
        isLoading,
        isError,
        refetch
    } = useGetTentativeOrArchivedListQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortBy === "patientName" ? "patientName" : undefined,
        order: sortOrder,
        type: "archived",
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
    });

    const currentList = listRes?.data || [];
    const totalItems = listRes?.total || 0;

    const handleReferToOPD = async (item: any) => {
        setIsSubmitting(true);
        try {
            const res = await revertToOpd(item.id).unwrap();
            if (res.success) {
                setSuccessDialogConfig({
                    message: res.message || `Patient ${item.patientName} referred to OPD successfully!`,
                    confirmText: "OK",
                    showCancel: false,
                });
                try {
                    refetch();
                } catch (e) {
                    console.warn("Failed to refetch archived list:", e);
                }
            } else {
                setApiErrorMessage(res.message || "Failed to revert patient to OPD.");
                setShowApiErrorDialog(true);
            }
        } catch (err: any) {
            console.error("Error reverting patient to OPD:", err);
            setApiErrorMessage(err?.data?.message || err?.message || "An error occurred while reverting patient to OPD.");
            setShowApiErrorDialog(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartAdmission = async (item: any) => {
        setIsSubmitting(true);
        try {
            const res = await checkFirstDayPayment(item.id).unwrap();
            if (res.success) {
                const remaining = parseFloat(res.data.remainingForFirstDay || "0");
                const complete = res.data.firstDayPaymentComplete;

                if (remaining > 0 || !complete) {
                    // Case A: Payment not completed
                    setSuccessDialogConfig({
                        message: (
                            <div className="flex flex-col items-center text-center">
                                <span className="text-sm text-[#475569]">
                                    First day payment is not completed. Please complete the remaining amount{" "}
                                    <strong className="text-[#F6776E]">{res.data.remainingForFirstDay || "1500.00"}</strong> first, then proceed with room allocation.
                                </span>
                            </div>
                        ),
                        confirmText: "OK",
                        showCancel: false,
                    });
                } else {
                    // Case B: Payment completed
                    setSuccessDialogConfig({
                        message: (
                            <div className="flex flex-col items-center text-center">
                                <span className="text-sm text-[#475569]">
                                    Admission started for{" "}
                                    <strong className="text-[#0B8C00]">{item.patientName || "patient"}</strong>{" "}
                                    successfully! You can now proceed with room allocation.
                                </span>
                            </div>
                        ),
                        confirmText: "Assign Room & Bed",
                        cancelText: "Close",
                        showCancel: true,
                        onConfirm: () => {
                            setActiveAllocationPatient({
                                patient: item,
                                payment: res.data
                            });
                        },
                    });
                }
            } else {
                setApiErrorMessage(res.message || "Failed to check payment status.");
                setShowApiErrorDialog(true);
            }
        } catch (err: any) {
            console.error("Error checking first day payment:", err);
            setApiErrorMessage(err?.data?.message || err?.message || "An error occurred while starting admission.");
            setShowApiErrorDialog(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Action button style class
    const btnCls = "px-4 py-1.5 rounded-[32px] border border-[#0B8C00] text-[#0B8C00] text-xs font-medium hover:bg-[#F2F8F2] transition-colors whitespace-nowrap";

    // Setup columns
    const columns = [
        { label: "Sr no.", position: "first" as const },
        {
            label: "Patient Name",
            sortable: true,
            sortDirection: sortBy === "patientName" ? (sortOrder.toLowerCase() as "asc" | "desc") : null,
            onSort: () => {
                setSortBy("patientName");
                setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                setCurrentPage(1);
            },
        },
        { label: "Patient UHID" },
        { label: "Patient Contact Number" },
        { label: "Referring Doctor" },
        { label: "Chief Complaint" },
        { label: "Action", position: "last" as const, className: "cursor-pointer" },
    ];

    // Setup rows dynamically mapped from API response
    const rows = currentList.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        // Clickable green UHID
        const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline">
                {item.patientUhid || "N/A"}
            </span>
        );

        const isButtonLoading = loadingPatientId === item.id;
        // Action buttons
        const actions = (
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => setPendingAction({ type: "refer", item })}
                >
                    Refer to OPD
                </Button>
                <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap flex items-center justify-center min-w-[50px]"
                    onClick={async () => {
                        if (!item.id) return;
                        setLoadingPatientId(item.id);
                        try {
                            const res = await getPatientDetail(item.id).unwrap();
                            if (res && res.success) {
                                setFetchedPatientData(res.data);
                                setSelectedPatient(item);
                                setViewAppointmentMode(true);
                            } else {
                                setApiErrorMessage(res?.message || "Failed to load patient details.");
                                setShowApiErrorDialog(true);
                            }
                        } catch (err: any) {
                            console.error("Error fetching patient details:", err);
                            const msg = err?.data?.message || err?.message || "An error occurred while fetching patient details.";
                            setApiErrorMessage(msg);
                            setShowApiErrorDialog(true);
                        } finally {
                            setLoadingPatientId(null);
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
                    onClick={() => setPendingAction({ type: "startAdmission", item })}
                >
                    Start Admission
                </Button>
            </div>
        );

        return [
            sr,
            item.patientName || "N/A",
            uhid,
            item.contactNumber || "N/A",
            item.doctorName || "N/A",
            item.diagnosis || "N/A", // API "diagnosis" field maps to Chief Complaint
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
                                setSelectedPatient(null);
                            }}
                        />
                    </div>
                    {(() => {
                        const appDetail = fetchedPatientData?.appointmentDetail || {};
                        const patDetails = fetchedPatientData?.patientDetails || {};
                        const refDetail = fetchedPatientData?.referralDetail || {};
                        const medInfo = fetchedPatientData?.medicalInfo || {};
                        const otherInfo = fetchedPatientData?.otherInformation || {};

                        const appointmentItems = [
                            { label: "UHID", value: appDetail.uhid || "N/A" },
                            { label: "OPD ID", value: appDetail.opid?.toString() || "N/A" },
                            { label: "Branch", value: appDetail.branch || "N/A" },
                            { label: "Doctor", value: appDetail.doctor || "N/A" },
                            { label: "Doctor OPD Fee", value: appDetail.doctorCpdFee !== undefined ? `Rs. ${appDetail.doctorCpdFee}` : "N/A" },
                            // { label: "Entry Fee", value: appDetail.entryFee !== undefined ? `Rs. ${appDetail.entryFee}` : "N/A" },
                            { label: "Appointment Date", value: appDetail.appointmentDate || "N/A" },
                            { label: "Time Slot", value: appDetail.timeSlot || "N/A" },
                            { label: "Created Date", value: appDetail.createdDate ? new Date(appDetail.createdDate).toLocaleString() : "N/A" },
                            { label: "Remark", value: appDetail.remark || "N/A", multiline: true },
                        ];

                        const referralItems = [
                            { label: "Source", value: refDetail.source || "N/A" },
                            { label: "Sub Source", value: refDetail.subSource || "N/A" },
                            { label: "Referral Doctor", value: refDetail.referralDoctor || "N/A" },
                            { label: "Referral Name", value: refDetail.referralName || "N/A" },
                            { label: "Mobile", value: refDetail.mobile || "N/A" },
                        ];

                        const patientName = patDetails.name || "N/A";
                        const patientSubtitle = `Contact Number: ${patDetails.contactNumber || "N/A"} • Age : ${patDetails.age || "N/A"} Years • Gender : ${patDetails.gender || "N/A"}`;

                        const patientBadges = [
                            ...(medInfo.bloodGroup && medInfo.bloodGroup !== "N/A" ? [{
                                label: medInfo.bloodGroup,
                                className: "inline-flex h-[30px] min-w-[76px] me-2 items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]"
                            }] : []),
                            ...(otherInfo.patientType ? [{
                                label: otherInfo.patientType,
                                className: "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                            }] : [])
                        ];

                        const patientInfoItems = [
                            {
                                iconSrc: "/icons/UserGear.svg",
                                iconAlt: "Father/Husband",
                                label: "Father’s/Husband’s Name",
                                value: patDetails.fatherHusbandName || patDetails.guardianName || "N/A",
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

                        const medicalItems = [
                            { label: "Diagnosis", value: medInfo.diagnosis || "N/A" },
                            { label: "Disease", value: medInfo.disease || "N/A" },
                            { label: "Blood Group", value: medInfo.bloodGroup || "N/A" },
                            { label: "Allergies", value: medInfo.allergies || "N/A" },
                            { label: "Surgeries", value: medInfo.surgeries || "N/A" },
                            { label: "Addiction", value: medInfo.addiction || "N/A" },
                            { label: "Height", value: patDetails.height || medInfo.height || "N/A" },
                            { label: "Weight", value: patDetails.weight || medInfo.weight || "N/A" },
                            { label: "Diet Type", value: medInfo.dietType || "N/A" },
                            { label: "Remark", value: medInfo.remark || "N/A", multiline: true },
                        ];

                        const otherInfoItems = [
                            { label: "Patient Type", value: otherInfo.patientType || "N/A" },
                            { label: "Patient Sub Type", value: otherInfo.patientSubType || "N/A" },
                            { label: "Beneficiary ID", value: "N/A" },
                            { label: "Insurance Company", value: "N/A" },
                            { label: "Ayush Covered", value: "N/A" },
                        ];

                        const timelineItems = fetchedPatientData?.patientHistory?.map((h: any) => ({
                            dateLabel: h.date || h.createdDate || "N/A",
                            detail: {
                                primaryComplaintTitle: "Chief Complaint",
                                primaryComplaintText: h.chiefComplaint || h.remark || "N/A",
                                detailsTitle: "Symptoms",
                                detailsItems: Array.isArray(h.symptoms) ? h.symptoms : (h.symptoms ? [h.symptoms] : ["N/A"]),
                                actionsTitle: "Medicines Prescribed",
                                actionItems: Array.isArray(h.medicines) ? h.medicines : (h.medicines ? [h.medicines] : ["N/A"]),
                            }
                        })) || [];

                        const healthCardNo = patDetails.jsHealthCardNo || "N/A";

                        return (
                            <ViewAppointment
                                appointmentItems={appointmentItems}
                                walletRemainingAmount="Rs. 0"
                                walletDetails={undefined}
                                referralItems={referralItems}
                                patientName={patientName}
                                patientSubtitle={patientSubtitle}
                                patientBadges={patientBadges}
                                patientInfoItems={patientInfoItems}
                                showVitals={true}
                                vitalsItems={vitalsItems}
                                timelineItems={timelineItems.length > 0 ? timelineItems : undefined}
                                healthCardNo={healthCardNo}
                                medicalItems={medicalItems}
                                fileItems={[]}
                                otherInfoItems={otherInfoItems}
                            />
                        );
                    })()}
                </div>
            ) : activeAllocationPatient ? (
                <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                        <PageHeading title={`Room Allocation - ${activeAllocationPatient.patient.patientName || "Patient"}`} />
                        <Button
                            variant="outline"
                            onClick={() => setActiveAllocationPatient(null)}
                        >
                            ← Back to Archived
                        </Button>
                    </div>

                    <RoomAllocation
                        activePackage={{
                            id: activeAllocationPatient.payment?.patientPackageId?.toString(),
                            packageName: activeAllocationPatient.patient?.packageName || "Selected Package",
                            branchRoomType: {
                                roomRentPrice: parseFloat(activeAllocationPatient.payment?.perDayCost || "1500")
                            }
                        }}
                        patientId={activeAllocationPatient.patient?.patientId || activeAllocationPatient.patient?.id}
                        patientPackageId={activeAllocationPatient.payment?.patientPackageId}
                        patientDetails={{
                            patientName: activeAllocationPatient.patient?.patientName,
                            patientUhid: activeAllocationPatient.patient?.patientUhid,
                            contactNumber: activeAllocationPatient.patient?.contactNumber,
                            diagnosis: activeAllocationPatient.patient?.diagnosis,
                            doctorName: activeAllocationPatient.patient?.doctorName,
                        }}
                        onSuccess={() => {
                            setActiveAllocationPatient(null);
                            try {
                                refetch();
                            } catch (e) {
                                console.warn("Failed to refetch:", e);
                            }
                        }}
                        onCancel={() => setActiveAllocationPatient(null)}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Page Heading */}
                    <div className="flex items-start justify-between">
                        <PageHeading title="Archived" />
                    </div>

                    {/* Table Listing Card */}
                    <div className="w-full rounded-[20px] border border-[#E3EEE1] p-2">
                        <TableListingCard
                            sections={[
                                {
                                    id: "archived-patients-list",
                                    title: "Archived",
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
                                    emptyMessage: "No archived patients found",
                                    pagination: {
                                        currentPage,
                                        totalItems,
                                        itemsPerPage,
                                        onPageChange: setCurrentPage,
                                        onItemsPerPageChange: (items: number) => {
                                            setItemsPerPage(items);
                                            setCurrentPage(1);
                                        },
                                        itemsPerPageOptions: [10, 20, 50, 100],
                                    },
                                },
                            ]}
                        />

                    </div>
                </div>
            )}

            {/* Action Confirmation Dialog */}
            <MessageDialog
                open={!!pendingAction}
                onClose={() => { if (!isSubmitting) setPendingAction(null); }}
                icon="/icons/questionMark.svg"
                iconBgColor="transparent"
                message={
                    pendingAction ? (
                        pendingAction.type === "refer" ? (
                            <div className="flex flex-col items-center text-center">
                                <span className="text-lg font-bold text-[#1E293B] mb-1">Refer to OPD</span>
                                <span className="text-sm text-[#475569] max-w-[290px]">
                                    Are you sure you want to refer{" "}
                                    <strong className="text-[#0B8C00]">
                                        {pendingAction.item.patientName || "this patient"}
                                    </strong>{" "}
                                    back to OPD?
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center">
                                <span className="text-lg font-bold text-[#1E293B] mb-1">Confirm Admission</span>
                                <span className="text-sm text-[#475569] max-w-[290px]">
                                    Are you sure you want to proceed with the admission process for{" "}
                                    <strong className="text-[#0B8C00]">
                                        {pendingAction.item.patientName || "this patient"}
                                    </strong>
                                    ?
                                </span>
                            </div>
                        )
                    ) : null
                }
                confirmText="Confirm"
                cancelText="Cancel"
                showCancel
                isActionLoading={isSubmitting}
                onConfirm={async () => {
                    if (!pendingAction || isSubmitting) return;
                    if (pendingAction.type === "refer") {
                        await handleReferToOPD(pendingAction.item);
                    } else if (pendingAction.type === "startAdmission") {
                        await handleStartAdmission(pendingAction.item);
                    }
                    setPendingAction(null);
                }}
                onCancel={() => { if (!isSubmitting) setPendingAction(null); }}
            />

            {/* Standard Feedback Dialogs */}
            <MessageDialog
                open={!!successDialogConfig}
                onClose={() => setSuccessDialogConfig(null)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successDialogConfig?.message || ""}
                confirmText={successDialogConfig?.confirmText || "OK"}
                cancelText={successDialogConfig?.cancelText || "Close"}
                showCancel={successDialogConfig?.showCancel ?? false}
                onConfirm={() => {
                    if (successDialogConfig?.onConfirm) {
                        successDialogConfig.onConfirm();
                    }
                    setSuccessDialogConfig(null);
                }}
                onCancel={() => {
                    if (successDialogConfig?.onCancel) {
                        successDialogConfig.onCancel();
                    }
                    setSuccessDialogConfig(null);
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
