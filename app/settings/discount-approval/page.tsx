"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, MessageDialog, Tooltip } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetBranchesQuery, useGetDiscountConfigsQuery, useCreateDiscountConfigMutation, useUpdateDiscountConfigMutation } from "@/store/api/settingsApi";
import { useGetUsersListQuery } from "@/store/api/publicApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { selectUserId, selectUserBranchId } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";

type DiscountApproval = {
    id: number;
    branchName: string;
    branchId: number;
    level1: string;
    level2: string;
    levelOneUserId: number;
    levelTwoUserId: number;
};




export default function DiscountApprovalPage() {
    const discountApprovalPermission = usePermission("settings", { subModule: "discount-approval" });
    const canView = discountApprovalPermission.canView;
    const canAdd = discountApprovalPermission.canAdd;
    const canEdit = discountApprovalPermission.canEdit;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        filterBranchId: hookFilterBranchId,
    } = useBranchFilter();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortField, setSortField] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [formValues, setFormValues] = useState({
        branchName: "",
        level1: "",
        level2: "",
    });
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [branchError, setBranchError] = useState("");
    const [level1Error, setLevel1Error] = useState("");
    const [level2Error, setLevel2Error] = useState("");

    const userBranchId = useAppSelector(selectUserBranchId);

    const formBranchIdForUsers = useMemo(() => {
        const n = parseInt(formValues.branchName, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [formValues.branchName]);

    const usersListDialogActive = isDialogOpen && (isEditMode ? canEdit : canAdd);
    const {
        data: usersData,
        isLoading: isLoadingUsersList,
        isFetching: isFetchingUsersList,
    } = useGetUsersListQuery(
        { branchId: formBranchIdForUsers ?? 0 },
        {
            skip: !usersListDialogActive || formBranchIdForUsers == null,
        }
    );
    const isLoadingUsers = isLoadingUsersList || isFetchingUsersList;

    const levelUserPlaceholderBase = !formValues.branchName
        ? "Select a branch first"
        : isLoadingUsers
          ? "Loading users..."
          : "Select user";

    
    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Trim the debounced search term to remove leading and trailing spaces
    // Only pass to API if trimmed value is not empty (don't hit API for spaces only)
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || undefined;

    const loggedInUserId = useAppSelector(selectUserId);

    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
        skip: !canView,
    });

    const { data: discountConfigsData, isLoading: isLoadingConfigs, refetch: refetchConfigs } =
        useGetDiscountConfigsQuery(
            {
                page: currentPage,
                limit: itemsPerPage,
                search: searchParam,
                sort: sortField || undefined,
                order: sortField ? sortOrder : undefined,
                branchId: hookFilterBranchId,
            },
            { skip: !canView }
        );
    
    // Create discount config mutation
    const [createDiscountConfig, { isLoading: isCreating }] = useCreateDiscountConfigMutation();
    
    // Update discount config mutation
    const [updateDiscountConfig, { isLoading: isUpdating }] = useUpdateDiscountConfigMutation();

    // Convert branches data to select options
    const branchOptions: SelectOption[] = useMemo(() => {
        if (!branchesData?.data) {
            return [];
        }
        return branchesData.data.map((branch) => ({
            value: branch.id.toString(),
            label: branch.name,
        }));
    }, [branchesData]);


    // getUsersList: { id, userName, branch? } — no email; duplicate userNames get #id suffix
    const userOptions: SelectOption[] = useMemo(() => {
        const rows = usersData?.data;
        if (!rows?.length) return [];
        const nameCounts = new Map<string, number>();
        for (const u of rows) {
            const key = (u.userName ?? u.name ?? "").trim().toLowerCase() || `id-${u.id}`;
            nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
        }
        return rows.map((user) => {
            const displayName = (user.userName ?? user.name ?? "").trim() || `User ${user.id}`;
            const key = (user.userName ?? user.name ?? "").trim().toLowerCase() || `id-${user.id}`;
            const duplicateName = (nameCounts.get(key) ?? 0) > 1;
            const emailSuffix = user.email?.trim() ? ` (${user.email})` : "";
            const dedupeSuffix = duplicateName ? ` #${user.id}` : "";
            return {
                value: user.id.toString(),
                label: `${displayName}${emailSuffix}${dedupeSuffix}`,
            };
        });
    }, [usersData]);

    // Filter Level 1 options to exclude user selected in Level 2
    const level1Options: SelectOption[] = useMemo(() => {
        if (!formValues.level2) {
            return userOptions;
        }
        return userOptions.filter((option) => option.value !== formValues.level2);
    }, [userOptions, formValues.level2]);

    // Filter Level 2 options to exclude user selected in Level 1
    const level2Options: SelectOption[] = useMemo(() => {
        if (!formValues.level1) {
            return userOptions;
        }
        return userOptions.filter((option) => option.value !== formValues.level1);
    }, [userOptions, formValues.level1]);

    // Map API data to DiscountApproval format - use data directly from API response
    const discountApprovals: DiscountApproval[] = useMemo(() => {
        if (!discountConfigsData?.data) {
            return [];
        }
        return discountConfigsData.data.map((config) => {
            // Use user data directly from API response
            const level1Display = config.levelOneUser 
                ? `${config.levelOneUser.userName} (${config.levelOneUser.email})`
                : `User ${config.levelOneUserId}`;
            
            const level2Display = config.levelTwoUser
                ? `${config.levelTwoUser.userName} (${config.levelTwoUser.email})`
                : `User ${config.levelTwoUserId}`;
            
            return {
                id: config.id,
                branchName: config.branch?.name || `Branch ${config.branchId}`,
                branchId: config.branchId,
                level1: level1Display,
                level2: level2Display,
                levelOneUserId: config.levelOneUserId,
                levelTwoUserId: config.levelTwoUserId,
            };
        });
    }, [discountConfigsData]);

    // No need for client-side filtering - API handles it via branchId parameter
    const totalItems = discountConfigsData?.total || 0;
    const paginatedData = discountApprovals;

    const getSortDirection = (field: string): "asc" | "desc" | null => {
        if (sortField === field) {
            return sortOrder;
        }
        return null;
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            // Toggle sort order if same field
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            // Set new sort field with ascending order
            setSortField(field);
            setSortOrder("asc");
        }
        setCurrentPage(1); // Reset to first page when sorting
    };

    const handleAddNew = () => {
        if (!canAdd) return;
        setIsEditMode(false);
        setEditingId(null);
        const defaultBranch =
            userBranchId != null &&
            branchOptions.some((o) => o.value === String(userBranchId))
                ? String(userBranchId)
                : "";
        setFormValues({
            branchName: defaultBranch,
            level1: "",
            level2: "",
        });
        setBranchError("");
        setLevel1Error("");
        setLevel2Error("");
        setIsDialogOpen(true);
    };

    const handleEdit = (approval: DiscountApproval) => {
        if (!canEdit) return;
        setIsEditMode(true);
        setEditingId(approval.id);
        
        setFormValues({
            branchName: approval.branchId.toString(),
            level1: approval.levelOneUserId.toString(),
            level2: approval.levelTwoUserId.toString(),
        });
        setBranchError("");
        setLevel1Error("");
        setLevel2Error("");
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditMode && !canEdit) return;
        if (!isEditMode && !canAdd) return;

        // Clear previous errors
        setBranchError("");
        setLevel1Error("");
        setLevel2Error("");

        // Validate fields
        let hasError = false;

        if (!formValues.branchName || formValues.branchName.trim() === "") {
            setBranchError("Branch is required");
            hasError = true;
        }

        if (!formValues.level1 || formValues.level1.trim() === "") {
            setLevel1Error("Level 1 is required");
            hasError = true;
        }

        if (!formValues.level2 || formValues.level2.trim() === "") {
            setLevel2Error("Level 2 is required");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Convert form values to numbers
        const branchId = parseInt(formValues.branchName, 10);
        const levelOneUserId = parseInt(formValues.level1, 10);
        const levelTwoUserId = parseInt(formValues.level2, 10);

        // Check if loggedInUserId is available
        if (!loggedInUserId) {
            setApiErrorMessage("User ID not available");
            setShowApiErrorDialog(true);
            return;
        }

        try {
            let result;
            
            if (isEditMode && editingId) {
                // Update existing discount config
                const payload = {
                    id: editingId,
                    branchId: branchId,
                    levelOneUserId: levelOneUserId,
                    levelTwoUserId: levelTwoUserId,
                    updatedBy: loggedInUserId,
                };

                result = await updateDiscountConfig(payload).unwrap();
                setSuccessMessage(result?.message || "Discount config updated successfully");
            } else {
                // Create new discount config
                const payload = {
                    branchId: branchId,
                    levelOneUserId: levelOneUserId,
                    levelTwoUserId: levelTwoUserId,
                    createdBy: loggedInUserId,
                };

                result = await createDiscountConfig(payload).unwrap();
                setSuccessMessage(result?.message || "Discount config created successfully");
            }

            // Show success message
            setShowSuccessDialog(true);

            // Refetch data after successful creation/update
            await refetchConfigs();

            setIsDialogOpen(false);
            setIsEditMode(false);
            setEditingId(null);
            setFormValues({
                branchName: "",
                level1: "",
                level2: "",
            });
            setBranchError("");
            setLevel1Error("");
            setLevel2Error("");
        } catch (error: unknown) {
            console.error(`Failed to ${isEditMode ? "update" : "create"} discount config:`, error);

            let errorMsg = `Failed to ${isEditMode ? "update" : "create"} discount config. Please try again.`;
            const err = error as {
                data?: { message?: string; error?: string };
                error?: string;
                message?: string;
            };
            if (err?.data?.message) {
                errorMsg = err.data.message;
            } else if (err?.data?.error) {
                errorMsg = err.data.error;
            } else if (err?.error) {
                errorMsg = err.error;
            } else if (err?.message) {
                errorMsg = err.message;
            }
            
            setApiErrorMessage(errorMsg);
            setShowApiErrorDialog(true);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (items: number) => {
        setItemsPerPage(items);
        setCurrentPage(1);
    };

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Discount Approval Configuration" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    {!canView ? (
                        <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view discount approval configuration.
                        </div>
                    ) : (
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex items-center gap-3">
                                <FormSelectField
                                    label=""
                                    hideLabel
                                    options={branchFilterOptions}
                                    value={selectedBranchFilter}
                                    onChange={(value) => {
                                        setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                                        setCurrentPage(1);
                                    }}
                                    placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                                    mode="single"
                                    background="normal"
                                    width={300}
                                    disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                                />
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={(value) => {
                                            setSearchTerm((prev) => {
                                                if (prev !== value) setCurrentPage(1);
                                                return value;
                                            });
                                        }}
                                        placeholder="Search Here..."
                                    />
                                </div>
                                {canAdd ? (
                                    <button
                                        type="button"
                                        className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                        onClick={handleAddNew}
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                        <span className="text-hide">Add Discount Approval Configuration</span>
                                    </button>
                                ) : null}
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
                                        sortDirection={getSortDirection("branch.name")}
                                        onSort={() => handleSort("branch.name")}
                                    >
                                        Branch Name
                                    </TableHead>
                                    <TableHead 
                                        sortable
                                        sortDirection={getSortDirection("levelOneUser.email")}
                                        onSort={() => handleSort("levelOneUser.email")}
                                    >
                                        Level 1
                                    </TableHead>
                                    <TableHead 
                                        sortable
                                        sortDirection={getSortDirection("levelTwoUser.email")}
                                        onSort={() => handleSort("levelTwoUser.email")}
                                    >
                                        Level 2
                                    </TableHead>
                                    <TableHead position="last">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingConfigs ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={5}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            Loading...
                                        </TableData>
                                    </TableRow>
                                ) : paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={5}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            No discount approvals found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((approval, index) => (
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
                                                {approval.level1}
                                            </TableData>
                                            <TableData>
                                                {approval.level2}
                                            </TableData>
                                            <TableData>
                                                <div className="flex items-center gap-3">
                                                    {canEdit ? (
                                                        <Tooltip content="Edit" position="top" delay={0}>
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
                                                        </Tooltip>
                                                    ) : null}
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
                    </div>
                    )}
                </ListBorder>
            </div>

            <Dialog
                open={isDialogOpen && (isEditMode ? canEdit : canAdd)}
                onClose={() => {
                    setIsDialogOpen(false);
                    setIsEditMode(false);
                    setEditingId(null);
                    setBranchError("");
                    setLevel1Error("");
                    setLevel2Error("");
                }}
                title={isEditMode ? "Edit Discount Approval Configuration" : "Add Discount Approval Configuration"}
                width={686}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <FormSelectField
                                label="Branch *"
                                value={formValues.branchName}
                                onChange={(value) => {
                                    const selectedValue = Array.isArray(value) ? value[0] : value;
                                    const nextBranch = selectedValue || "";
                                    setFormValues((prev) => ({
                                        ...prev,
                                        branchName: nextBranch,
                                        ...(prev.branchName !== nextBranch
                                            ? { level1: "", level2: "" }
                                            : {}),
                                    }));
                                    // Clear error when valid input is selected
                                    if (selectedValue && branchError) {
                                        setBranchError("");
                                    }
                                }}
                                options={branchOptions}
                                placeholder={isLoadingBranches ? "Loading branches..." : "Select"}
                                mode="single"
                                background="white"
                                disabled={isLoadingBranches}
                            />
                            {branchError && (
                                <span className="mt-2 text-xs text-[#F87171]">{branchError}</span>
                            )}
                            <p className="mt-2 text-[11px] leading-snug text-[#7B8089]">
                                Choose a branch to load users into Level 1 and Level 2 (users listed for that
                                branch only).
                            </p>
                        </div>

                        <div>
                            <FormSelectField
                                label="Level 1 *"
                                value={formValues.level1}
                                onChange={(value) => {
                                    const selectedValue = Array.isArray(value) ? value[0] : value || "";
                                    setFormValues((prev) => {
                                        // If selected user is the same as Level 2, clear Level 2
                                        const updatedLevel1 = selectedValue;
                                        const updatedLevel2 = prev.level2 === updatedLevel1 ? "" : prev.level2;
                                        
                                        return {
                                            ...prev,
                                            level1: updatedLevel1,
                                            level2: updatedLevel2,
                                        };
                                    });
                                    // Clear error when valid input is selected
                                    if (selectedValue && level1Error) {
                                        setLevel1Error("");
                                    }
                                    // Clear Level 2 error if Level 2 was cleared
                                    if (formValues.level2 === selectedValue && level2Error) {
                                        setLevel2Error("");
                                    }
                                }}
                                options={level1Options}
                                placeholder={`${levelUserPlaceholderBase} (level 1)`}
                                emptyMessage={
                                    !formValues.branchName
                                        ? "Select a branch first"
                                        : isLoadingUsers
                                          ? "Loading…"
                                          : "No users returned for this branch"
                                }
                                mode="single"
                                background="white"
                                height={44}
                                disabled={!formValues.branchName || isLoadingUsers}
                            />
                            {level1Error && (
                                <span className="mt-2 text-xs text-[#F87171]">{level1Error}</span>
                            )}
                        </div>

                        <div>
                            <FormSelectField
                                label="Level 2 *"
                                value={formValues.level2}
                                onChange={(value) => {
                                    const selectedValue = Array.isArray(value) ? value[0] : value || "";
                                    setFormValues((prev) => {
                                        // If selected user is the same as Level 1, clear Level 1
                                        const updatedLevel2 = selectedValue;
                                        const updatedLevel1 = prev.level1 === updatedLevel2 ? "" : prev.level1;
                                        
                                        return {
                                            ...prev,
                                            level1: updatedLevel1,
                                            level2: updatedLevel2,
                                        };
                                    });
                                    // Clear error when valid input is selected
                                    if (selectedValue && level2Error) {
                                        setLevel2Error("");
                                    }
                                    // Clear Level 1 error if Level 1 was cleared
                                    if (formValues.level1 === selectedValue && level1Error) {
                                        setLevel1Error("");
                                    }
                                }}
                                options={level2Options}
                                placeholder={`${levelUserPlaceholderBase} (level 2)`}
                                emptyMessage={
                                    !formValues.branchName
                                        ? "Select a branch first"
                                        : isLoadingUsers
                                          ? "Loading…"
                                          : "No users returned for this branch"
                                }
                                mode="single"
                                background="white"
                                height={44}
                                disabled={!formValues.branchName || isLoadingUsers}
                            />
                            {level2Error && (
                                <span className="mt-2 text-xs text-[#F87171]">{level2Error}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button 
                            type="submit" 
                            variant="primary" 
                            isLoading={isCreating || isUpdating}
                            disabled={isCreating || isUpdating}
                        >
                            {isEditMode ? "Update" : "Save"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setIsEditMode(false);
                                setEditingId(null);
                                setBranchError("");
                                setLevel1Error("");
                                setLevel2Error("");
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
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

