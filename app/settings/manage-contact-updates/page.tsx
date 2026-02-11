"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, MessageDialog, Tabs } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetContactUpdatesQuery, useApproveRejectContactUpdateMutation } from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useSocket } from "@/hooks/useSocket";

type ContactUpdateItem = {
    id: number;
    branchName?: string;
    phoneNumber: string;
    remark: string;
    permissionBy: string;
    status?: "pending" | "approved" | "rejected";
};

const tabOptions = [
    { value: "pending", label: "Pending Approval" },
    { value: "approved", label: "Approved" },
];

export default function ManageContactUpdatesPage() {
    const pathname = usePathname();
    const { onContactChangeRequest } = useSocket();
    const [activeTab, setActiveTab] = useState("pending");
    const [filters, setFilters] = useState({
        searchTerm: "",
        currentPage: 1,
        itemsPerPage: 10,
        sortField: "createdAt",
        sortOrder: "asc" as "asc" | "desc",
    });
    
    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);
    const prevSearchTermRef = useRef(filters.searchTerm);
    
    // Trim the debounced search term to remove leading and trailing spaces
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || undefined;
    
    // Reset to first page when search term changes
    useEffect(() => {
        if (prevSearchTermRef.current !== filters.searchTerm) {
            prevSearchTermRef.current = filters.searchTerm;
            setFilters((prev) => ({ ...prev, currentPage: 1 }));
        }
    }, [filters.searchTerm]);

    // Reset to first page when tab changes
    useEffect(() => {
        setFilters((prev) => ({ ...prev, currentPage: 1 }));
    }, [activeTab]);

    const { data: contactUpdatesData, isLoading: isLoadingUpdates, refetch: refetchUpdates } = useGetContactUpdatesQuery({
        page: filters.currentPage,
        limit: filters.itemsPerPage,
        sort: filters.sortField || undefined,
        order: filters.sortField ? filters.sortOrder : undefined,
        search: searchParam,
        status: activeTab === "pending" ? "pending" : activeTab === "approved" ? "approved" : undefined,
    });
    const [approveRejectUpdate, { isLoading: isProcessingAction }] = useApproveRejectContactUpdateMutation();
    
    // Listen to contact-change-request socket event for real-time updates
    useEffect(() => {
        // Only listen if we're on the manage-contact-updates page
        if (!pathname?.includes("/settings/manage-contact-updates")) {
            return;
        }

        const unsubscribe = onContactChangeRequest((data: any) => {
            // Only update if we're on the pending tab
            if (activeTab === "pending") {
                // Extract data from socket event
                const requestData = data?.data || data;
                
                // Check if the request status is PENDING
                if (requestData?.status === "PENDING" || requestData?.status === "pending" || !requestData?.status) {
                    // Reset to first page, sort by createdAt desc to show newest first
                    // RTK Query will automatically refetch when filters change
                    setFilters((prev) => ({ 
                        ...prev, 
                        currentPage: 1,
                        sortField: "createdAt",
                        sortOrder: "desc" // Show newest requests at the top
                    }));
                    
                    // Also trigger manual refetch to ensure we get the latest data immediately
                    refetchUpdates();
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [pathname, activeTab, onContactChangeRequest, refetchUpdates]);
    
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);

    // Map API data to UI format
    const contactUpdates: ContactUpdateItem[] = useMemo(() => {
        if (!contactUpdatesData?.data) {
            return [];
        }
        return contactUpdatesData.data.map((item) => ({
            id: item.id,
            // branchName: "N/A", // API response doesn't include branch info
            phoneNumber: item.newContactNo,
            remark: item.remarks || "N/A",
            permissionBy: activeTab === "pending" 
                ? (item.requestedByUser?.userName || "N/A")
                : (item.approvedByUser?.userName || item.approvedByUser?.name || "N/A"),
            status: (item.status?.toLowerCase() || "pending") as "pending" | "approved" | "rejected",
            branchName: item.branch?.name || "N/A",
        }));
    }, [contactUpdatesData, activeTab]);

    // Filter data - search across all fields
    const filteredUpdates = useMemo(() => {
        if (!filters.searchTerm.trim()) {
            return contactUpdates;
        }
        
        const searchLower = filters.searchTerm.toLowerCase();
        return contactUpdates.filter((update) => {
            return (
                update.phoneNumber.toLowerCase().includes(searchLower) ||
                (update.remark || "").toLowerCase().includes(searchLower) ||
                (update.branchName || "").toLowerCase().includes(searchLower) ||
                update.permissionBy.toLowerCase().includes(searchLower)
            );
        });
    }, [contactUpdates, filters.searchTerm]);

    const totalItems = contactUpdatesData?.total || 0;

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
            currentPage: 1, // Reset to first page when sorting
        }));
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    const handleApprove = async (id: number) => {
        try {
            const result = await approveRejectUpdate({
                id,
                status: "approved",
            }).unwrap();
            
            setSuccessMessage(result?.message || "Contact update approved successfully");
            setShowSuccessDialog(true);
            await refetchUpdates();
        } catch (error: any) {
            console.error("Error approving contact update:", error);
            let errorMsg = "Failed to approve contact update. Please try again.";
            
            if (error?.data?.message) {
                errorMsg = error.data.message;
            } else if (error?.data?.error) {
                errorMsg = error.data.error;
            } else if (error?.message) {
                errorMsg = error.message;
            }
            
            setApiErrorMessage(errorMsg);
            setShowApiErrorDialog(true);
        }
    };

    const handleReject = async (id: number) => {
        try {
            const result = await approveRejectUpdate({
                id,
                status: "rejected",
            }).unwrap();
            
            setSuccessMessage(result?.message || "Contact update rejected successfully");
            setShowSuccessDialog(true);
            await refetchUpdates();
        } catch (error: any) {
            console.error("Error rejecting contact update:", error);
            let errorMsg = "Failed to reject contact update. Please try again.";
            
            if (error?.data?.message) {
                errorMsg = error.data.message;
            } else if (error?.data?.error) {
                errorMsg = error.data.error;
            } else if (error?.message) {
                errorMsg = error.message;
            }
            
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
                    <PageHeading title="Manage Contact Updates" />
                </div>

                {/* Tabs */}
                <div className="mb-6 w-[450px]">
                    <Tabs options={tabOptions} value={activeTab} onChange={handleTabChange} />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]">
                                {/* {activeTab === "pending" ? "Pending Approval" : "Approved"} */}
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
                                        sortable 
                                        onSort={() => handleSort("branch.name")}
                                        sortDirection={getSortDirection("branch.name")}
                                    >
                                        Branch Name
                                    </TableHead>
                                    <TableHead 
                                        sortable 
                                        onSort={() => handleSort("newContactNumber")}
                                        sortDirection={getSortDirection("newContactNumber")}
                                    >
                                        Phone Number
                                    </TableHead>
                                    <TableHead 
                                        sortable 
                                        onSort={() => handleSort("remark")}
                                        sortDirection={getSortDirection("remark")}
                                    >
                                        Remark
                                    </TableHead>
                                    <TableHead 
                                        sortable 
                                        onSort={() => handleSort(activeTab === "pending" ? "requestedByUser.userName" : "permissionByUser.userName")}
                                        sortDirection={getSortDirection(activeTab === "pending" ? "requestedByUser.userName" : "permissionByUser.userName")}
                                    >
                                        {activeTab === "pending" ? "Requested By" : "Permission By"}
                                    </TableHead>
                                    {activeTab === "approved" && (
                                        <TableHead 
                                            sortable 
                                            onSort={() => handleSort("status")}
                                            sortDirection={getSortDirection("status")}
                                        >
                                            Status
                                        </TableHead>
                                    )}
                                    {activeTab === "pending" && (
                                        <TableHead position="last">
                                            Action
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingUpdates ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={activeTab === "pending" ? 6 : 6}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            Loading...
                                        </TableData>
                                    </TableRow>
                                ) : filteredUpdates.length === 0 ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={activeTab === "pending" ? 6 : 6}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            No contact updates found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    filteredUpdates.map((update, index) => (
                                        <TableRow
                                            key={update.id}
                                            className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                        >
                                            <TableData variant="primary">
                                                {(filters.currentPage - 1) * filters.itemsPerPage + index + 1}
                                            </TableData>
                                            <TableData>
                                                {update.branchName}
                                            </TableData>
                                            <TableData>
                                                {update.phoneNumber}
                                            </TableData>
                                            <TableData>
                                                {update.remark}
                                            </TableData>
                                            <TableData>
                                                {update.permissionBy}
                                            </TableData>
                                            {activeTab === "approved" && (
                                                <TableData>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        update.status === "approved" 
                                                            ? "bg-[#E8F5E9] text-[#0B8C00]" 
                                                            : update.status === "rejected"
                                                            ? "bg-[#FFEBEE] text-[#F6776E]"
                                                            : "bg-[#FFF3E0] text-[#F59E0B]"
                                                    }`}>
                                                        {update.status ? update.status.charAt(0).toUpperCase() + update.status.slice(1) : "N/A"}
                                                    </span>
                                                </TableData>
                                            )}
                                            {activeTab === "pending" && (
                                                <TableData>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApprove(update.id)}
                                                            disabled={isProcessingAction}
                                                            className="cursor-pointer flex h-9 items-center justify-center gap-1 rounded-[32px] border border-[#0B8C00] bg-[#0B8C00] px-4 text-sm font-medium text-white transition-colors hover:bg-[#18751b] disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Image src="/icons/ApproveIcon.svg" alt="Approve" width={20} height={20} />
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReject(update.id)}
                                                            disabled={isProcessingAction}
                                                            className="cursor-pointer flex h-9 items-center justify-center gap-1 rounded-[32px] border border-[#F6776E] bg-white px-4 text-sm font-medium text-[#F6776E] transition-colors hover:bg-[#FFEBEE] disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M19.2806 18.2193C19.3502 18.289 19.4055 18.3717 19.4432 18.4628C19.4809 18.5538 19.5003 18.6514 19.5003 18.7499C19.5003 18.8485 19.4809 18.9461 19.4432 19.0371C19.4055 19.1281 19.3502 19.2109 19.2806 19.2806C19.2109 19.3502 19.1281 19.4055 19.0371 19.4432C18.9461 19.4809 18.8485 19.5003 18.7499 19.5003C18.6514 19.5003 18.5538 19.4809 18.4628 19.4432C18.3717 19.4055 18.289 19.3502 18.2193 19.2806L11.9999 13.0602L5.78055 19.2806C5.63982 19.4213 5.44895 19.5003 5.24993 19.5003C5.05091 19.5003 4.86003 19.4213 4.7193 19.2806C4.57857 19.1398 4.49951 18.949 4.49951 18.7499C4.49951 18.5509 4.57857 18.36 4.7193 18.2193L10.9396 11.9999L4.7193 5.78055C4.57857 5.63982 4.49951 5.44895 4.49951 5.24993C4.49951 5.05091 4.57857 4.86003 4.7193 4.7193C4.86003 4.57857 5.05091 4.49951 5.24993 4.49951C5.44895 4.49951 5.63982 4.57857 5.78055 4.7193L11.9999 10.9396L18.2193 4.7193C18.36 4.57857 18.5509 4.49951 18.7499 4.49951C18.949 4.49951 19.1398 4.57857 19.2806 4.7193C19.4213 4.86003 19.5003 5.05091 19.5003 5.24993C19.5003 5.44895 19.4213 5.63982 19.2806 5.78055L13.0602 11.9999L19.2806 18.2193Z" fill="#F6776E"/>
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
                </ListBorder>
            </div>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => {
                    setShowSuccessDialog(false);
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
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

