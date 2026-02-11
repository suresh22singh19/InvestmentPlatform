"use client";

import Image from "next/image";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetBranchIPsQuery, useCreateBranchIPMutation, useUpdateBranchIPMutation, useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useDebounce } from "@/hooks/useDebounce";
import { validateIPNetwork } from "@/lib/utils/common";

type BranchIP = {
    id: number;
    branchName: string;
    ipNetwork: string;
    status: "Active" | "Inactive";
};

export default function BranchIPNetworkPage() {
    const [filters, setFilters] = useState({
        searchTerm: "",
        currentPage: 1,
        itemsPerPage: 10,
        sortField: "",
        sortOrder: "asc" as "asc" | "desc",
    });
    
    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);
    const prevSearchTermRef = useRef(filters.searchTerm);
    
    // Trim the debounced search term to remove leading and trailing spaces
    // Only pass to API if trimmed value is not empty (don't hit API for spaces only)
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || undefined;
    
    // Reset to first page when search term changes
    useEffect(() => {
        if (prevSearchTermRef.current !== filters.searchTerm) {
            prevSearchTermRef.current = filters.searchTerm;
            setFilters((prev) => ({ ...prev, currentPage: 1 }));
        }
    }, [filters.searchTerm]);

    const { data: branchIPsData, isLoading: isLoadingBranchIPs, refetch: refetchBranchIPs } = useGetBranchIPsQuery({
        page: filters.currentPage,
        limit: filters.itemsPerPage,
        sort: filters.sortField || undefined,
        order: filters.sortField ? filters.sortOrder : undefined,
        search: searchParam,
    });
    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery();
    const [createBranchIP, { isLoading: isCreating }] = useCreateBranchIPMutation();
    const [updateBranchIP, { isLoading: isUpdating }] = useUpdateBranchIPMutation();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [viewingBranchIP, setViewingBranchIP] = useState<BranchIP | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [branchError, setBranchError] = useState("");
    const [ipNetworkError, setIpNetworkError] = useState("");
    const [ipNetworkTouched, setIpNetworkTouched] = useState(false);
    const [formValues, setFormValues] = useState({
        branchId: "",
        ipNetwork: "",
        status: "inactive" as "active" | "inactive",
    });

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

    // Map API data to UI format
    const branchIPs: BranchIP[] = useMemo(() => {
        if (!branchIPsData?.data) {
            return [];
        }
        // Map API response to UI format
        return branchIPsData.data.map((item) => ({
            id: item.id,
            branchName: item.branch?.name || "",
            ipNetwork: item.networkips || "",
            status: (item.status === "active" ? "Active" : "Inactive") as "Active" | "Inactive",
        }));
    }, [branchIPsData]);

    const totalItems = branchIPsData?.total || 0;

    const handleAddNew = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormValues({
            branchId: "",
            ipNetwork: "",
            status: "inactive",
        });
        setBranchError("");
        setIpNetworkError("");
        setIpNetworkTouched(false);
        setIsDialogOpen(true);
    };

    const handleEdit = (branchIP: BranchIP) => {
        setIsEditMode(true);
        setEditingId(branchIP.id);
        // Find branch ID from branch name
        const branch = branchesData?.data?.find((b) => b.name === branchIP.branchName);
        setFormValues({
            branchId: branch?.id.toString() || "",
            ipNetwork: branchIP.ipNetwork,
            status: branchIP.status === "Active" ? "active" : "inactive",
        });
        setBranchError("");
        setIpNetworkError("");
        setIpNetworkTouched(false);
        setIsDialogOpen(true);
    };

    const handleView = (branchIP: BranchIP) => {
        setViewingBranchIP(branchIP);
        setIsViewDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setBranchError("");
        setIpNetworkError("");

        // Validate fields
        let hasError = false;

        if (!formValues.branchId || formValues.branchId.trim() === "") {
            setBranchError("Branch is required");
            hasError = true;
        }

        // Validate IP Network
        const ipNetworkValidationError = validateIPNetwork(formValues.ipNetwork);
        if (ipNetworkValidationError) {
            setIpNetworkError(ipNetworkValidationError);
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            let result;
            if (isEditMode && editingId !== null) {
                result = await updateBranchIP({
                    id: editingId,
                    branchId: parseInt(formValues.branchId),
                    networkips: formValues.ipNetwork,
                    status: formValues.status,
                }).unwrap();
                
                // Refetch the data after successful update
                await refetchBranchIPs();
            } else {
                result = await createBranchIP({
                    branchId: parseInt(formValues.branchId),
                    networkips: formValues.ipNetwork,
                    status: formValues.status,
                }).unwrap();
                
                // Refetch the data after successful creation
                await refetchBranchIPs();
            }

            setSuccessMessage(result?.message || (isEditMode ? "Branch IP Network updated successfully" : "Branch IP Network created successfully"));
            setShowSuccessDialog(true);
            setIsDialogOpen(false);
            setIsEditMode(false);
            setEditingId(null);
            setFormValues({
                branchId: "",
                ipNetwork: "",
                status: "inactive",
            });
        } catch (error: any) {
            console.error("Error creating/updating branch IP:", error);
            const errorMessage = error?.data?.message || error?.data?.error || (isEditMode ? "Failed to update branch IP network" : "Failed to create branch IP network");
            setApiErrorMessage(errorMessage);
            setShowApiErrorDialog(true);
        }
    };

    const handlePageChange = (page: number) => {
        setFilters((prev) => ({ ...prev, currentPage: page }));
    };

    const handleItemsPerPageChange = (items: number) => {
        setFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
    };

    const handleSort = (field: string) => {
        setFilters((prev) => {
            if (prev.sortField === field) {
                // Toggle order if same field
                return { ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" };
            } else {
                // Set new field with ascending order
                return { ...prev, sortField: field, sortOrder: "asc" };
            }
        });
    };

    const getSortDirection = (field: string): "asc" | "desc" | null => {
        if (filters.sortField === field) {
            return filters.sortOrder;
        }
        return null;
    };
    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Branch IP Network" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <TableSearchInput
                                        value={filters.searchTerm}
                                        onChange={(value) => setFilters((prev) => ({ ...prev, searchTerm: value }))}
                                        placeholder="Search Here..."
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                    onClick={handleAddNew}
                                >
                                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                    Add Branch Network
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
                                        sortDirection={getSortDirection("name")}
                                        onSort={() => handleSort("name")}
                                    >
                                        Branch Name
                                    </TableHead>
                                    <TableHead 
                                        sortable
                                        sortDirection={getSortDirection("networkips")}
                                        onSort={() => handleSort("networkips")}
                                    >
                                        IP Network
                                    </TableHead>
                                    <TableHead 
                                        sortable
                                        sortDirection={getSortDirection("status")}
                                        onSort={() => handleSort("status")}
                                    >
                                        Status
                                    </TableHead>
                                    <TableHead position="last">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingBranchIPs ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={5}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            Loading...
                                        </TableData>
                                    </TableRow>
                                ) : branchIPs.length === 0 ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={5}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            No branch IP networks found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    branchIPs.map((branchIP, index) => (
                                        <TableRow
                                            key={branchIP.id}
                                            className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                        >
                                            <TableData variant="primary">
                                                {(filters.currentPage - 1) * filters.itemsPerPage + index + 1}
                                            </TableData>
                                            <TableData>
                                                {branchIP.branchName}
                                            </TableData>
                                            <TableData>
                                                {branchIP.ipNetwork}
                                            </TableData>
                                            <TableData>
                                                <span
                                                    className={`inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] ${branchIP.status === "Active"
                                                            ? "border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                                                            : "border-[#F6776E] bg-white text-[#F6776E]"
                                                        }`}
                                                >
                                                    {branchIP.status}
                                                </span>
                                            </TableData>
                                            <TableData>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(branchIP)}
                                                        className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                        aria-label="View"
                                                    >
                                                        <Image
                                                            src="/icons/ViewEyeIcon.svg"
                                                            alt="View"
                                                            width={20}
                                                            height={20}
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(branchIP)}
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

            <Dialog
                open={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setIsEditMode(false);
                    setEditingId(null);
                    setBranchError("");
                    setIpNetworkError("");
                    setIpNetworkTouched(false);
                }}
                title={isEditMode ? "Edit Branch IP Network" : "Add Branch IP Network"}
                width={686}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className={isEditMode ? "space-y-4" : "flex flex-col gap-4"}>
                        <div className={isEditMode ? "" : "flex-1"}>
                            <FormSelectField
                                label="Branch *"
                                value={formValues.branchId}
                                onChange={(value) => {
                                    // Only update value, validation will happen on submit
                                    const selectedValue = typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
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
                                placeholder={isLoadingBranches ? "Loading branches..." : "Select"}
                                mode="single"
                                background="white"
                                disabled={isLoadingBranches || isEditMode}
                            />
                            {branchError && (
                                <span className="mt-2 text-xs text-[#F87171]">{branchError}</span>
                            )}
                        </div>

                        <div className={isEditMode ? "" : "flex-1"}>
                            <FormInputField
                                label="IP Network *"
                                value={formValues.ipNetwork}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setFormValues((prev) => ({
                                        ...prev,
                                        ipNetwork: value,
                                    }));
                                    // If field was previously touched and had an error, validate on change to clear error immediately when corrected
                                    if (ipNetworkTouched && ipNetworkError) {
                                        const validationError = validateIPNetwork(value);
                                        if (validationError) {
                                            setIpNetworkError(validationError);
                                        } else {
                                            setIpNetworkError("");
                                        }
                                    }
                                }}
                                onBlur={(event) => {
                                    // Mark field as touched and validate when user moves to next field
                                    setIpNetworkTouched(true);
                                    const validationError = validateIPNetwork(event.target.value);
                                    if (validationError) {
                                        setIpNetworkError(validationError);
                                    } else {
                                        setIpNetworkError("");
                                    }
                                }}
                                height={44}
                                placeholder="IP Network (e.g., 192.168.1.1 or 192.168.1.0/24)"
                                required
                                error={ipNetworkError}
                            />
                        </div>

                        {isEditMode && (
                            <div>
                                <FormSelectField
                                    label="Status"
                                    value={formValues.status}
                                    onChange={(value) =>
                                        setFormValues((prev) => ({
                                            ...prev,
                                            status: (typeof value === "string" ? value : Array.isArray(value) ? value[0] : "inactive") as "active" | "inactive",
                                        }))
                                    }
                                    options={[
                                        { value: "active", label: "Active" },
                                        { value: "inactive", label: "Inactive" },
                                    ]}
                                    placeholder="Select"
                                    mode="single"
                                    background="white"
                                />
                            </div>
                        )}
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
                                setIpNetworkError("");
                                setIpNetworkTouched(false);
                            }}
                            disabled={isCreating || isUpdating}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog
                open={isViewDialogOpen}
                onClose={() => {
                    setIsViewDialogOpen(false);
                    setViewingBranchIP(null);
                }}
                title="View Branch Network"
                width={686}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-[#262D3B]">Branch Name</label>
                        <p className="text-xs font-medium text-[#7B8089]">{viewingBranchIP?.branchName || ""}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-[#262D3B]">Network IPs</label>
                        <p className="text-xs font-medium text-[#7B8089]">{viewingBranchIP?.ipNetwork || ""}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-[#262D3B]">Status</label>
                        <p className="text-xs font-medium text-[#7B8089]">{viewingBranchIP?.status || ""}</p>
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

            {/* API Error Dialog - Only for API errors, not validation errors */}
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
