"use client";

import Image from "next/image";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetBranchIPsQuery, useCreateBranchIPMutation, useUpdateBranchIPMutation, useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useDebounce } from "@/hooks/useDebounce";

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
        search: debouncedSearchTerm || undefined,
    });
    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery();
    const [createBranchIP, { isLoading: isCreating }] = useCreateBranchIPMutation();
    const [updateBranchIP, { isLoading: isUpdating }] = useUpdateBranchIPMutation();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [viewingBranchIP, setViewingBranchIP] = useState<BranchIP | null>(null);
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
        setIsDialogOpen(true);
    };

    const handleView = (branchIP: BranchIP) => {
        setViewingBranchIP(branchIP);
        setIsViewDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formValues.branchId || !formValues.ipNetwork) {
            return;
        }

        try {
            if (isEditMode && editingId !== null) {
                await updateBranchIP({
                    id: editingId,
                    branchId: parseInt(formValues.branchId),
                    networkips: formValues.ipNetwork,
                }).unwrap();
                
                // Refetch the data after successful update
                await refetchBranchIPs();
            } else {
                await createBranchIP({
                    branchId: parseInt(formValues.branchId),
                    networkips: formValues.ipNetwork,
                    status: formValues.status,
                }).unwrap();
                
                // Refetch the data after successful creation
                await refetchBranchIPs();
            }

            setIsDialogOpen(false);
            setIsEditMode(false);
            setEditingId(null);
            setFormValues({
                branchId: "",
                ipNetwork: "",
                status: "inactive",
            });
        } catch (error) {
            console.error("Error creating branch IP:", error);
            // You might want to show an error message to the user here
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
                    <PageHeading title="Settings" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]">Network List</h2>

                            <div className="flex items-center gap-3">
                                <TableSearchInput
                                    value={filters.searchTerm}
                                    onChange={(value) => setFilters((prev) => ({ ...prev, searchTerm: value }))}
                                    placeholder="Search Here..."
                                />
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
                }}
                title={isEditMode ? "Edit Branch IP Network" : "Add Branch IP Network"}
                width={686}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className={isEditMode ? "space-y-4" : "flex flex-col gap-4"}>
                        <div className={isEditMode ? "" : "flex-1"}>
                            <FormSelectField
                                label="Branch"
                                value={formValues.branchId}
                                onChange={(value) =>
                                    setFormValues((prev) => ({
                                        ...prev,
                                        branchId: typeof value === "string" ? value : Array.isArray(value) ? value[0] : "",
                                    }))
                                }
                                options={branchOptions}
                                placeholder={isLoadingBranches ? "Loading branches..." : "Select"}
                                mode="single"
                                background="white"
                                disabled={isLoadingBranches || isEditMode}
                            />
                        </div>

                        <div className={isEditMode ? "" : "flex-1"}>
                            <FormInputField
                                label="IP Network"
                                value={formValues.ipNetwork}
                                onChange={(event) =>
                                    setFormValues((prev) => ({
                                        ...prev,
                                        ipNetwork: event.target.value,
                                    }))
                                }
                                height={44}
                                placeholder="IP Network"
                                required
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
                        <Button type="submit" variant="primary" disabled={isCreating || isUpdating}>
                            {(isCreating || isUpdating) ? "Saving..." : isEditMode ? "Update" : "Save"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setIsEditMode(false);
                                setEditingId(null);
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
        </AppShell>
    );
}
