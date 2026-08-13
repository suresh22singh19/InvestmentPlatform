"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormTextareaField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, MessageDialog, Tabs, Tooltip } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetHealthCardChangeRequestsQuery, useProcessCardChangeRequestMutation, HealthCardChangeRequestItem } from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useSocket } from "@/hooks/useSocket";
import { usePathname } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";
import { useSelector } from "react-redux";
import { selectUserId } from "@/store/slices/authSlice";
import type { RootState } from "@/store";

const tabOptions = [
    { value: "pending", label: "Pending Approval" },
    { value: "approved", label: "Approved" },
];

export default function HealthCardExceptionsPage() {
    const healthCardApprovalPermission = usePermission("settings", { subModule: "health-card-approval-management" });
    const healthCardPermission = usePermission("settings", { subModule: "healthcard-exceptions" });
    // Fallback to duplicate-number-exceptions permission if healthcard-exceptions isn't registered separately
    const fallbackPermission = usePermission("settings", { subModule: "duplicate-number-exceptions" });

    const canView = healthCardApprovalPermission.canView || healthCardPermission.canView || fallbackPermission.canView;
    const canEdit = healthCardApprovalPermission.canEdit || healthCardPermission.canEdit || fallbackPermission.canEdit;

    const pathname = usePathname();
    const { onHealthCardChangeRequest, onHealthCardChangeRequestUpdate } = useSocket();
    const authUserId = useSelector((state: RootState) => selectUserId(state));

    const [activeTab, setActiveTab] = useState("pending");
    const [filters, setFilters] = useState({
        searchTerm: "",
        currentPage: 1,
        itemsPerPage: 10,
        sortField: "createdAt",
        sortOrder: "desc" as "asc" | "desc",
    });

    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);
    const prevSearchTermRef = useRef(filters.searchTerm);
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || undefined;

    useEffect(() => {
        if (prevSearchTermRef.current !== filters.searchTerm) {
            prevSearchTermRef.current = filters.searchTerm;
            setFilters((prev) => ({ ...prev, currentPage: 1 }));
        }
    }, [filters.searchTerm]);

    useEffect(() => {
        setFilters((prev) => ({ ...prev, currentPage: 1 }));
    }, [activeTab]);

    const {
        data: healthCardRequestsData,
        isLoading: isLoadingExceptions,
        refetch: refetchRequests,
    } = useGetHealthCardChangeRequestsQuery({
        page: filters.currentPage,
        limit: filters.itemsPerPage,
        sort: filters.sortField || undefined,
        order: filters.sortOrder,
        search: searchParam,
        status: activeTab === "pending" ? "PENDING" : activeTab === "approved" ? "APPROVED" : undefined,
    }, { skip: !canView });

    const [processCardChangeRequest, { isLoading: isProcessingAction }] = useProcessCardChangeRequestMutation();

    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);

    // Reject Dialog
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejectionError, setRejectionError] = useState("");

    const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (user?.id) {
                        setLoggedInUserId(typeof user.id === "string" ? parseInt(user.id, 10) : user.id);
                    }
                } catch (error) {
                    console.error("Failed to parse user data", error);
                }
            }
        }
    }, []);

    const currentUserId = authUserId || loggedInUserId || 1;

    useEffect(() => {
        if (canView && pathname?.includes("/settings/healthcard-exceptions")) {
            refetchRequests();
        }
    }, [pathname, canView, refetchRequests]);

    useEffect(() => {
        if (!canView || !pathname?.includes("/settings/healthcard-exceptions")) {
            return;
        }

        const unsubReq = onHealthCardChangeRequest?.(() => {
            refetchRequests();
        });
        const unsubUpd = onHealthCardChangeRequestUpdate?.(() => {
            refetchRequests();
        });

        return () => {
            unsubReq?.();
            unsubUpd?.();
        };
    }, [pathname, canView, onHealthCardChangeRequest, onHealthCardChangeRequestUpdate, refetchRequests]);

    const cardRequests: HealthCardChangeRequestItem[] = useMemo(() => {
        return healthCardRequestsData?.data || [];
    }, [healthCardRequestsData]);

    const totalItems = healthCardRequestsData?.total || 0;
    const showActionColumn = activeTab === "pending" && canEdit;

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

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    const handleApprove = async (id: number) => {
        if (!canEdit) return;
        try {
            const result = await processCardChangeRequest({
                id,
                status: "APPROVED",
                approvedBy: Number(currentUserId),
            }).unwrap();

            setSuccessMessage(result?.message || "Health card change request approved successfully");
            setShowSuccessDialog(true);
            await refetchRequests();
        } catch (error: any) {
            console.error("Error approving health card change request:", error);
            const errorMsg = error?.data?.message || error?.message || "Failed to approve request. Please try again.";
            setApiErrorMessage(errorMsg);
            setShowApiErrorDialog(true);
        }
    };

    const openRejectDialog = (id: number) => {
        setSelectedRequestId(id);
        setRejectionReason("");
        setRejectionError("");
        setRejectDialogOpen(true);
    };

    const handleConfirmReject = async () => {
        if (!selectedRequestId) return;
        if (!rejectionReason.trim()) {
            setRejectionError("Rejection reason is required");
            return;
        }

        try {
            const result = await processCardChangeRequest({
                id: selectedRequestId,
                status: "REJECTED",
                approvedBy: Number(currentUserId),
                rejectionReason: rejectionReason.trim(),
            }).unwrap();

            setSuccessMessage(result?.message || "Health card change request rejected successfully");
            setShowSuccessDialog(true);
            setRejectDialogOpen(false);
            setSelectedRequestId(null);
            setRejectionReason("");
            await refetchRequests();
        } catch (error: any) {
            console.error("Error rejecting health card change request:", error);
            const errorMsg = error?.data?.message || error?.message || "Failed to reject request. Please try again.";
            setApiErrorMessage(errorMsg);
            setShowApiErrorDialog(true);
        }
    };

    const handlePageChange = (page: number) => {
        setFilters((prev) => ({ ...prev, currentPage: page }));
    };

    const handleItemsPerPageChange = (items: number) => {
        setFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
    };

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Health Card Exceptions" />
                </div>

                {/* Tabs */}
                <div className="mb-6 w-[450px]">
                    <Tabs options={tabOptions} value={activeTab} onChange={handleTabChange} />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    {!canView ? (
                        <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view health card exceptions.
                        </div>
                    ) : (
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[#434956]">
                                </h2>

                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <TableSearchInput
                                            value={filters.searchTerm}
                                            onChange={(value) => setFilters((prev) => ({ ...prev, searchTerm: value }))}
                                            placeholder="Search Here..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        <TableHead position="first">
                                            Sr no.
                                        </TableHead>
                                        <TableHead
                                        // sortable                    
                                        // onSort={() => handleSort("branchName")}
                                        // sortDirection={getSortDirection("branchName")}                              
                                        >
                                            Branch Name
                                        </TableHead>
                                        <TableHead
                                            sortable
                                            onSort={() => handleSort("patientName")}
                                            sortDirection={getSortDirection("patientName")}
                                        >
                                            Patient Name
                                        </TableHead>
                                        <TableHead
                                        // sortable
                                        // onSort={() => handleSort("oldCardNumber")}
                                        // sortDirection={getSortDirection("oldCardNumber")}
                                        >
                                            Old Health Card Name
                                        </TableHead>
                                        <TableHead
                                        // sortable
                                        // onSort={() => handleSort("newCardNumber")}
                                        // sortDirection={getSortDirection("newCardNumber")}
                                        >
                                            New Health Card Name
                                        </TableHead>
                                        {/* <TableHead>
                                            Phone
                                        </TableHead> */}
                                        <TableHead
                                        // sortable
                                        // onSort={() => handleSort(activeTab === "pending" ? "requestedByUser.userName" : "approvedByUser.userName")}
                                        // sortDirection={getSortDirection(activeTab === "pending" ? "requestedByUser.userName" : "approvedByUser.userName")}
                                        >
                                            {activeTab === "pending" ? "Requested By" : "Permission By"}
                                        </TableHead>
                                        <TableHead>
                                            Remarks
                                        </TableHead>
                                        {activeTab === "approved" && (
                                            <TableHead
                                            // sortable
                                            // onSort={() => handleSort("status")}
                                            // sortDirection={getSortDirection("status")}
                                            >
                                                Status
                                            </TableHead>
                                        )}
                                        {showActionColumn && (
                                            <TableHead position="last">
                                                Action
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingExceptions ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={showActionColumn ? 10 : 9}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                Loading...
                                            </TableData>
                                        </TableRow>
                                    ) : cardRequests.length === 0 ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={showActionColumn ? 10 : 9}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                No Data Available
                                            </TableData>
                                        </TableRow>
                                    ) : (
                                        cardRequests.map((item, index) => (
                                            <TableRow
                                                key={item.id}
                                                className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                            >
                                                <TableData variant="primary">
                                                    {(filters.currentPage - 1) * filters.itemsPerPage + index + 1}
                                                </TableData>
                                                <TableData>
                                                    <Tooltip content={item.branch?.name || "N/A"}>
                                                        <span className="truncate inline-block align-top max-w-[300px]">
                                                            {item.branch?.name || "N/A"}
                                                        </span>
                                                    </Tooltip>
                                                </TableData>
                                                <TableData>
                                                    <Tooltip content={`${[item.registration?.patientTitle, item.registration?.patientName].filter(Boolean).join(" ") || "N/A"}${item.uhid ? ` (${item.uhid})` : ""}`}>
                                                        <div className="flex flex-col max-w-[180px]">
                                                            <span className="truncate inline-block align-top text-sm font-semibold text-[#262D3B]">
                                                                {[item.registration?.patientTitle, item.registration?.patientName].filter(Boolean).join(" ") || "N/A"}
                                                            </span>
                                                            {item.uhid && (
                                                                <span className="truncate inline-block align-top text-xs font-semibold text-[#0B8C00]">
                                                                    {item.uhid}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Tooltip>
                                                </TableData>
                                                <TableData>
                                                    {item.oldCardNumber || "N/A"}
                                                </TableData>
                                                <TableData>
                                                    {item.newCardNumber || "N/A"}
                                                </TableData>
                                                {/* <TableData>
                                                    {item.phone || "N/A"}
                                                </TableData> */}
                                                <TableData>
                                                    <Tooltip
                                                        content={
                                                            activeTab === "pending"
                                                                ? item.requestedByUser?.userName || "N/A"
                                                                : item.approvedByUser?.userName || item.requestedByUser?.userName || "N/A"
                                                        }
                                                    >
                                                        <span className="truncate inline-block align-top max-w-[150px]">
                                                            {activeTab === "pending"
                                                                ? item.requestedByUser?.userName || "N/A"
                                                                : item.approvedByUser?.userName || item.requestedByUser?.userName || "N/A"}
                                                        </span>
                                                    </Tooltip>
                                                </TableData>
                                                <TableData>
                                                    <Tooltip content={item.reason || item.rejectionReason || "-"}>
                                                        <span className="truncate inline-block align-top max-w-[180px]">
                                                            {item.reason || item.rejectionReason || "-"}
                                                        </span>
                                                    </Tooltip>
                                                </TableData>
                                                {activeTab === "approved" && (
                                                    <TableData>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === "APPROVED" || item.status === "approved"
                                                            ? "bg-[#E8F5E9] text-[#0B8C00]"
                                                            : item.status === "REJECTED" || item.status === "rejected"
                                                                ? "bg-[#FFEBEE] text-[#F6776E]"
                                                                : "bg-[#FFF3E0] text-[#F59E0B]"
                                                            }`}>
                                                            {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : "N/A"}
                                                        </span>
                                                    </TableData>
                                                )}
                                                {showActionColumn && (
                                                    <TableData>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApprove(item.id)}
                                                                disabled={isProcessingAction}
                                                                className="cursor-pointer flex h-9 items-center justify-center gap-1 rounded-[32px] border border-[#0B8C00] bg-[#0B8C00] px-4 text-sm font-medium text-white transition-colors hover:bg-[#18751b] disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Image src="/icons/ApproveIcon.svg" alt="Approve" width={20} height={20} />
                                                                Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openRejectDialog(item.id)}
                                                                disabled={isProcessingAction}
                                                                className="cursor-pointer flex h-9 items-center justify-center gap-1 rounded-[32px] border border-[#F6776E] bg-white px-4 text-sm font-medium text-[#F6776E] transition-colors hover:bg-[#FFEBEE] disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M19.2806 18.2193C19.3502 18.289 19.4055 18.3717 19.4432 18.4628C19.4809 18.5538 19.5003 18.6514 19.5003 18.7499C19.5003 18.8485 19.4809 18.9461 19.4432 19.0371C19.4055 19.1281 19.3502 19.2109 19.2806 19.2806C19.2109 19.3502 19.1281 19.4055 19.0371 19.4432C18.9461 19.4809 18.8485 19.5003 18.7499 19.5003C18.6514 19.5003 18.5538 19.4809 18.4628 19.4432C18.3717 19.4055 18.289 19.3502 18.2193 19.2806L11.9999 13.0602L5.78055 19.2806C5.63982 19.4213 5.44895 19.5003 5.24993 19.5003C5.05091 19.5003 4.86003 19.4213 4.7193 19.2806C4.57857 19.1398 4.49951 18.949 4.49951 18.7499C4.49951 18.5509 4.57857 18.36 4.7193 18.2193L10.9396 11.9999L4.7193 5.78055C4.57857 5.63982 4.49951 5.44895 4.49951 5.24993C4.49951 5.05091 4.57857 4.86003 4.7193 4.7193C4.86003 4.57857 5.05091 4.49951 5.24993 4.49951C5.44895 4.49951 5.63982 4.57857 5.78055 4.7193L11.9999 10.9396L18.2193 4.7193C18.36 4.57857 18.5509 4.49951 18.7499 4.49951C18.949 4.49951 19.1398 4.57857 19.2806 4.7193C19.4213 4.86003 19.5003 5.05091 19.5003 5.24993C19.5003 5.44895 19.4213 5.63982 19.2806 5.78055L13.0602 11.9999L19.2806 18.2193Z" fill="#F6776E" />
                                                                </svg>
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </TableData>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {totalItems > 0 && (
                                <Pagination
                                    currentPage={filters.currentPage}
                                    totalItems={totalItems}
                                    itemsPerPage={filters.itemsPerPage}
                                    onPageChange={handlePageChange}
                                    onItemsPerPageChange={handleItemsPerPageChange}
                                />
                            )}
                        </div>
                    )}
                </ListBorder>
            </div>

            {/* Reject Dialog */}
            <Dialog
                open={rejectDialogOpen}
                onClose={() => setRejectDialogOpen(false)}
                title="Reject Health Card Change Request"
                width={500}
            >
                <div className="flex flex-col gap-4">
                    <FormTextareaField
                        label="Rejection Reason *"
                        placeholder="Enter rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => {
                            setRejectionReason(e.target.value);
                            if (e.target.value.trim()) setRejectionError("");
                        }}
                        maxLength={250}
                        rows={3}
                        error={rejectionError}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRejectDialogOpen(false)}
                            disabled={isProcessingAction}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleConfirmReject}
                            isLoading={isProcessingAction}
                        >
                            Submit Rejection
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => {
                    setShowSuccessDialog(false);
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="Success"
                showCancel={false}
                onConfirm={() => {
                    setShowSuccessDialog(false);
                }}
            />

            {/* API Error Dialog */}
            <MessageDialog
                open={showApiErrorDialog}
                onClose={() => {
                    setShowApiErrorDialog(false);
                }}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={apiErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowApiErrorDialog(false);
                }}
            />
        </AppShell>
    );
}
