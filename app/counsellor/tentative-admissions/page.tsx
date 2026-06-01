"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Button,
    MessageDialog,
} from "@/components/ui";
import {
    useGetTentativeOrArchivedListQuery,
    useRevertToOpdMutation,
    useLazyCheckFirstDayPaymentQuery,
} from "@/store/api/counsellorApi"; // just 
import { useDebounce } from "@/hooks/useDebounce";
import RoomAllocation from "../start-counselling/roomAllowcation";

export default function CounsellorTentativeAdmissionsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // 6 items shown as in reference image
    const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
    const [sortBy, setSortBy] = useState<string>("patientName");
    const [activeAllocationPatient, setActiveAllocationPatient] = useState<{ patient: any; payment: any } | null>(null);

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
        type: "tentative",
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
                    console.warn("Failed to refetch tentative admissions list:", e);
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

    // Button style class matching the dashboard action items
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

        // Custom green styled link for patient UHID
        const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline">
                {item.patientUhid || "N/A"}
            </span>
        );

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
                    className="whitespace-nowrap"
                >
                    View
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
            {activeAllocationPatient ? (
                <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                        <PageHeading title={`Room Allocation - ${activeAllocationPatient.patient.patientName || "Patient"}`} />
                        <Button
                            variant="outline"
                            onClick={() => setActiveAllocationPatient(null)}
                        >
                            ← Back to Tentative Admissions
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
                <div className="flex flex-col gap-6 ">
                    {/* Page Heading */}
                    <div className="flex items-start justify-between">
                        <PageHeading title="Tentative Admissions" />
                    </div>

                    {/* Table Listing Card */}
                    <div className="w-full rounded-[20px] border border-[#E3EEE1] p-2">
                        <TableListingCard
                            sections={[
                                {
                                    id: "tentative-admissions-list",
                                    title: "Tentative Admissions",
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
                                    isLoading,
                                    isError,
                                    errorMessage: "Facing server API error",
                                    emptyMessage: "No tentative admissions found",
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
