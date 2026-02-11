"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetBranchesQuery, useGetRefundConfigsQuery, useCreateRefundConfigMutation, useUpdateRefundConfigMutation } from "@/store/api/settingsApi";
import { useLazyGetUsersQuery } from "@/store/api/publicApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { selectUserId } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";

type RefundApproval = {
    id: number;
    branchId: number;
    userId: number;
    branchName: string;
    username: string;
    userEmail: string;
};

export default function RefundApprovalPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortField, setSortField] = useState<string>("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [formValues, setFormValues] = useState({
        branchId: "",
        userId: "",
    });
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [branchError, setBranchError] = useState("");
    const [userIdError, setUserIdError] = useState("");

    const loggedInUserId = useAppSelector(selectUserId);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    
    // Trim the debounced search term to remove leading and trailing spaces
    // Only pass to API if trimmed value is not empty (don't hit API for spaces only)
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || undefined;

    // Fetch branches
    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery();

    // Fetch users
    const [getUsers, { data: usersData, isLoading: isLoadingUsers }] = useLazyGetUsersQuery();

    // Fetch refund configs with pagination, search, and sorting
    const { data: refundConfigsData, isLoading: isLoadingRefundConfigs, refetch } = useGetRefundConfigsQuery({
        page: currentPage,
        limit: itemsPerPage,
        sort: sortField,
        order: sortOrder,
        search: searchParam,
    });

    const [createRefundConfig, { isLoading: isCreating }] = useCreateRefundConfigMutation();
    const [updateRefundConfig, { isLoading: isUpdating }] = useUpdateRefundConfigMutation();

    // Fetch users when dialog opens
    useEffect(() => {
        if (isDialogOpen) {
            getUsers({ search: undefined });
        }
    }, [isDialogOpen, getUsers]);

    // Convert branches to SelectOption format
    const branchOptions: SelectOption[] = useMemo(() => {
        if (!branchesData?.data) return [];
        return branchesData.data.map((branch) => ({
            value: branch.id.toString(),
            label: branch.name,
        }));
    }, [branchesData]);

    // Convert users to SelectOption format
    const userOptions: SelectOption[] = useMemo(() => {
        if (!usersData?.data) return [];
        return usersData.data.map((user) => ({
            value: user.id.toString(),
            label: `${user.name} (${user.email})`,
        }));
    }, [usersData]);


    // Transform API data to display format
    const refundApprovals: RefundApproval[] = useMemo(() => {
        if (!refundConfigsData?.data) return [];
        return refundConfigsData.data.map((config) => ({
            id: config.id,
            branchId: config.branchId,
            userId: config.userId,
            branchName: config.branch?.name || "",
            username: config.user?.name || "",
            userEmail: config.user?.email || "",
        }));
    }, [refundConfigsData]);

    const totalItems = refundConfigsData?.total || 0;
    const totalPages = refundConfigsData?.totalPages || 0;

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [trimmedSearchTerm]);

    const handleAddNew = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormValues({
            branchId: "",
            userId: "",
        });
        setBranchError("");
        setUserIdError("");
        setIsDialogOpen(true);
    };

    const handleEdit = (approval: RefundApproval) => {
        setIsEditMode(true);
        setEditingId(approval.id);
        setFormValues({
            branchId: approval.branchId.toString(),
            userId: approval.userId.toString(),
        });
        setBranchError("");
        setUserIdError("");
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setBranchError("");
        setUserIdError("");

        // Validate fields
        let hasError = false;

        if (!formValues.branchId || formValues.branchId.trim() === "") {
            setBranchError("Branch is required");
            hasError = true;
        }

        if (!formValues.userId || formValues.userId.trim() === "") {
            setUserIdError("Configuration refund approval username is required");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        if (!loggedInUserId) {
            setErrorMessage("User ID not available");
            setShowErrorDialog(true);
            return;
        }

        const userId = parseInt(formValues.userId, 10);

        try {
            if (isEditMode && editingId !== null) {
                const result = await updateRefundConfig({
                    id: editingId,
                    branchId: parseInt(formValues.branchId, 10),
                    userId: userId,
                    updatedBy: loggedInUserId,
                }).unwrap();

                if (result.success) {
                    setSuccessMessage(result.message || "Refund configuration updated successfully");
                    setShowSuccessDialog(true);
                    setIsDialogOpen(false);
                    setIsEditMode(false);
                    setEditingId(null);
                    setFormValues({
                        branchId: "",
                        userId: "",
                    });
                    setBranchError("");
                    setUserIdError("");
                    refetch();
                }
            } else {
                const result = await createRefundConfig({
                    branchId: parseInt(formValues.branchId, 10),
                    userId: userId,
                    createdBy: loggedInUserId,
                }).unwrap();

                if (result.success) {
                    setSuccessMessage(result.message || "Refund configuration created successfully");
                    setShowSuccessDialog(true);
                    setIsDialogOpen(false);
                    setIsEditMode(false);
                    setEditingId(null);
                    setFormValues({
                        branchId: "",
                        userId: "",
                    });
                    setBranchError("");
                    setUserIdError("");
                    refetch();
                }
            }
        } catch (error: any) {
            const errorMsg = error?.data?.message || error?.message || "An error occurred. Please try again.";
            setErrorMessage(errorMsg);
            setShowErrorDialog(true);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (items: number) => {
        setItemsPerPage(items);
        setCurrentPage(1);
    };

    // Map column keys to API field names
    const getApiSortField = (columnKey: string): string => {
        const fieldMap: Record<string, string> = {
            branchName: "branchName",
            username: "userEmail",
        };
        return fieldMap[columnKey] || columnKey;
    };

    const handleSort = (columnKey: string) => {
        const apiField = getApiSortField(columnKey);
        
        // If clicking the same field, toggle order; otherwise set new field with ASC
        if (sortField === apiField) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(apiField);
            setSortOrder("asc");
        }
        // Reset to first page when sorting changes
        setCurrentPage(1);
    };

    // Get sort direction for a column
    const getSortDirection = (columnKey: string): "asc" | "desc" | null => {
        const apiField = getApiSortField(columnKey);
        if (sortField === apiField) {
            return sortOrder;
        }
        return null;
    };

    const isLoading = isLoadingRefundConfigs || isLoadingBranches;
    const isSubmitting = isCreating || isUpdating;

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Refund Approval Configuration" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        placeholder="Search Here..."
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                    onClick={handleAddNew}
                                >
                                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                    Add Refund Approval Configuration
                                </button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="py-12 text-center text-sm text-[#9CA3AF]">
                                Loading...
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-white">
                                            <TableHead position="first">
                                                Sr no.
                                            </TableHead>
                                            <TableHead 
                                                sortable
                                                sortDirection={getSortDirection("branch.name")}
                                                onSort={() => handleSort("branch.name")}
                                            >
                                                Branch Name
                                            </TableHead>
                                            <TableHead 
                                                sortable
                                                sortDirection={getSortDirection("user")}
                                                onSort={() => handleSort("user")}
                                            >
                                                Username
                                            </TableHead>
                                            <TableHead position="last">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {refundApprovals.length === 0 ? (
                                            <TableRow>
                                                <TableData
                                                    colSpan={4}
                                                    className="py-12 text-center text-sm text-[#9CA3AF]"
                                                >
                                                    No refund approvals found
                                                </TableData>
                                            </TableRow>
                                        ) : (
                                            refundApprovals.map((approval, index) => (
                                                <TableRow
                                                    key={approval.id}
                                                    className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                                >
                                                    <TableData variant="primary">
                                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                                    </TableData>
                                                    <TableData>
                                                        {approval.branchName}
                                                    </TableData>
                                                    <TableData>
                                                        {approval.userEmail || approval.username}
                                                    </TableData>
                                                    <TableData>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(approval)}
                                                                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                                aria-label="Edit"
                                                            >
                                                                <Image
                                                                    src="/icons/EditIconBlack.svg"
                                                                    alt="Edit"
                                                                    width={20}
                                                                    height={20}
                                                                />
                                                            </button>
                                                        </div>
                                                    </TableData>
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
                                    />
                                )}
                            </>
                        )}
                    </div>
                </ListBorder>
            </div>

            <Dialog
                open={isDialogOpen}
                onClose={() => {
                    if (!isSubmitting) {
                        setIsDialogOpen(false);
                        setIsEditMode(false);
                        setEditingId(null);
                        setBranchError("");
                        setUserIdError("");
                    }
                }}
                title={isEditMode ? "Edit Refund Approval Configuration" : "Add Refund Approval Configuration"}
                width={686}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <FormSelectField
                                label="Branch*"
                                value={formValues.branchId}
                                onChange={(value) => {
                                    const selectedValue = Array.isArray(value) ? value[0] : value || "";
                                    setFormValues((prev) => ({
                                        ...prev,
                                        branchId: selectedValue,
                                    }));
                                    // Clear error when valid input is selected
                                    if (selectedValue && branchError) {
                                        setBranchError("");
                                    }
                                }}
                                options={branchOptions}
                                placeholder="Select Branch"
                                mode="single"
                                background="white"
                                disabled={isSubmitting}
                            />
                            {branchError && (
                                <span className="mt-2 text-xs text-[#F87171]">{branchError}</span>
                            )}
                        </div>

                        <div>
                            <FormSelectField
                                label="Configuration refund approval username*"
                                value={formValues.userId}
                                onChange={(value) => {
                                    const selectedValue = Array.isArray(value) ? value[0] : value || "";
                                    setFormValues((prev) => ({
                                        ...prev,
                                        userId: selectedValue,
                                    }));
                                    // Clear error when valid input is selected
                                    if (selectedValue && userIdError) {
                                        setUserIdError("");
                                    }
                                }}
                                options={userOptions}
                                placeholder="Select Configuration refund approval username"
                                mode="single"
                                background="white"
                                disabled={isSubmitting || isLoadingUsers}
                            />
                            {userIdError && (
                                <span className="mt-2 text-xs text-[#F87171]">{userIdError}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? "Loading..." : isEditMode ? "Update" : "Save"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setIsEditMode(false);
                                setEditingId(null);
                                setBranchError("");
                                setUserIdError("");
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                message={successMessage}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                onConfirm={() => setShowSuccessDialog(false)}
                confirmText="Success"
                showCancel={false}
            />

            {/* API Error Dialog - Only for API errors, not validation errors */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                message={errorMessage}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                onConfirm={() => setShowErrorDialog(false)}
                confirmText="OK"
                showCancel={false}
            />
        </AppShell>
    );
}
