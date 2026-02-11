"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetBranchesQuery, useGetDiscountConfigsQuery, useCreateDiscountConfigMutation, useUpdateDiscountConfigMutation } from "@/store/api/settingsApi";
import { useLazyGetUsersQuery } from "@/store/api/publicApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { selectLoginData, selectUserId } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";

type DiscountApproval = {
    id: number;
    branchName: string;
    branchId: number;
    level1: string;
    level2: string;
    levelOneUserId: number;
    levelTwoUserId: number;
};



// Custom Select Component with ArrowDown icon
const CustomSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select",
    width = 300,
}: {
    options: SelectOption[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    width?: number;
}) => {
    return (
        <>
            <style jsx global>{`
                .custom-select-with-arrow button > span:last-child {
                    display: none !important;
                }
            `}</style>
            <div className="relative custom-select-with-arrow" style={{ width: `${width}px` }}>
                <FormSelectField
                    label=""
                    options={options}
                    mode="multiple"
                    value={value}
                    onChange={(val) => {
                        if (Array.isArray(val)) {
                            onChange(val);
                        }
                    }}
                    placeholder={placeholder}
                    width={width}
                    height={44}
                />
                <div 
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center" 
                    style={{ height: '44px' }}
                >
                    <Image src="/icons/ArrowDown.svg" alt="Arrow down" width={20} height={20} />
                </div>
            </div>
        </>
    );
};

export default function DiscountApprovalPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortField, setSortField] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [formValues, setFormValues] = useState({
        branchName: "",
        level1: "",
        level2: "",
    });

    // Fetch users
    const [getUsers, { data: usersData, isLoading: isLoadingUsers }] = useLazyGetUsersQuery();
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [branchError, setBranchError] = useState("");
    const [level1Error, setLevel1Error] = useState("");
    const [level2Error, setLevel2Error] = useState("");
    
    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const prevSearchTermRef = useRef(searchTerm);
    
    // Trim the debounced search term to remove leading and trailing spaces
    // Only pass to API if trimmed value is not empty (don't hit API for spaces only)
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || undefined;
    
    // Reset to first page when search term changes
    useEffect(() => {
        if (prevSearchTermRef.current !== searchTerm) {
            prevSearchTermRef.current = searchTerm;
            setCurrentPage(1);
        }
    }, [searchTerm]);
    
    // Reset to first page when branch selection changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedBranches]);
    
    // Get complete login data from Redux store
    const loginData = useAppSelector(selectLoginData);
    const loggedInUserId = useAppSelector(selectUserId);

    // Log the complete login data to see everything
    // console.log("Complete Login Data:", loginData);
    // console.log("User ID:", loggedInUserId);

    // Fetch branches from API
    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery();

    // Fetch users when dialog opens
    useEffect(() => {
        if (isDialogOpen) {
            getUsers({ search: undefined });
        }
    }, [isDialogOpen, getUsers]);
    
    // Get selected branch IDs - send as array (single or multiple)
    const selectedBranchIds = useMemo(() => {
        if (selectedBranches.length === 0) {
            return undefined;
        }
        
        // Convert string array to number array
        const branchIds = selectedBranches
            .map((id) => parseInt(id, 10))
            .filter((id) => !isNaN(id));
        
        if (branchIds.length === 0) {
            return undefined;
        }
        
        // Return array whether it's single or multiple branch IDs
        return branchIds;
    }, [selectedBranches]);
    
    // Fetch discount configs from API
    const { data: discountConfigsData, isLoading: isLoadingConfigs, refetch: refetchConfigs } = useGetDiscountConfigsQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: searchParam,
        sort: sortField || undefined,
        order: sortField ? sortOrder : undefined,
        branchId: selectedBranchIds,
    });
    
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

    // Convert users to SelectOption format
    const userOptions: SelectOption[] = useMemo(() => {
        if (!usersData?.data) return [];
        return usersData.data.map((user) => ({
            value: user.id.toString(),
            label: `${user.name} (${user.email})`,
        }));
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
        setIsDialogOpen(true);
    };

    const handleEdit = (approval: DiscountApproval) => {
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
        } catch (error: any) {
            console.error(`Failed to ${isEditMode ? "update" : "create"} discount config:`, error);
            
            // Handle error - show error message
            let errorMsg = `Failed to ${isEditMode ? "update" : "create"} discount config. Please try again.`;
            
            if (error?.data?.message) {
                errorMsg = error.data.message;
            } else if (error?.data?.error) {
                errorMsg = error.data.error;
            } else if (error?.error) {
                errorMsg = error.error;
            } else if (error?.message) {
                errorMsg = error.message;
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
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <CustomSelect
                                        options={branchOptions}
                                        value={selectedBranches}
                                        onChange={setSelectedBranches}
                                        placeholder={isLoadingBranches ? "Loading..." : "Select"}
                                        width={300}
                                    />
                                </div>
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
                                    Add Discount Approval Configuration
                                </button>
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
                    </div>
                </ListBorder>
            </div>

            <Dialog
                open={isDialogOpen}
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
                                    setFormValues((prev) => ({
                                        ...prev,
                                        branchName: selectedValue || "",
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
                                placeholder="Select Level 1"
                                mode="single"
                                background="white"
                                height={44}
                                disabled={isLoadingUsers}
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
                                placeholder="Select Level 2"
                                mode="single"
                                background="white"
                                height={44}
                                disabled={isLoadingUsers}
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

