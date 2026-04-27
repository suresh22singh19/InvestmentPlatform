"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, MessageDialog, Tabs } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetBranchesQuery, useGetDuplicateNumberExceptionsQuery, useCreateDuplicateNumberExceptionMutation, useApproveRejectDuplicateNumberExceptionMutation } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useDebounce } from "@/hooks/useDebounce";
import { useSocket } from "@/hooks/useSocket";
import { usePathname } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";

type MemberRegistration = {
    id: number;
    branchName: string;
    phoneNumber: string;
    patientName?: string;
    relationship?: string;
    permissionBy: string;
    requestedBy: string;
    status?: "pending" | "approved" | "rejected";
};

const tabOptions = [
    { value: "pending", label: "Pending Approval" },
    { value: "approved", label: "Approved" },
];


export default function AddMemberPage() {
    const duplicateNumberPermission = usePermission("settings", { subModule: "duplicate-number-exceptions" });
    const canView = duplicateNumberPermission.canView;
    const canAdd = duplicateNumberPermission.canAdd;
    const canEdit = duplicateNumberPermission.canEdit;

    const pathname = usePathname();
    const { onDuplicateNumberRequest } = useSocket();
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

    // Reset to first page when tab changes
    useEffect(() => {
        setFilters((prev) => ({ ...prev, currentPage: 1 }));
    }, [activeTab]);

    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
        skip: !canView || !canAdd,
    });
    const { data: duplicateNumberExceptionsData, isLoading: isLoadingExceptions, refetch: refetchExceptions } = useGetDuplicateNumberExceptionsQuery({
        page: filters.currentPage,
        limit: filters.itemsPerPage,
        sort: filters.sortField || undefined,
        order: filters.sortField ? filters.sortOrder : undefined,
        search: searchParam,
        status: activeTab === "pending" ? "pending" : activeTab === "approved" ? "approved" : undefined,
    }, { skip: !canView });
    const [createDuplicateNumberException, { isLoading: isCreating }] = useCreateDuplicateNumberExceptionMutation();
    const [approveRejectException, { isLoading: isProcessingAction }] = useApproveRejectDuplicateNumberExceptionMutation();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [branchError, setBranchError] = useState("");
    const [phoneNumberError, setPhoneNumberError] = useState("");
    const [phoneNumberTouched, setPhoneNumberTouched] = useState(false);
    const [formValues, setFormValues] = useState({
        branchId: "",
        phoneNumber: "",
    });
    const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

    // Get logged-in user ID from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (user?.id) {
                        setLoggedInUserId(typeof user.id === "string" ? parseInt(user.id) : user.id);
                    }
                } catch (error) {
                    console.error("Failed to parse user data", error);
                }
            }
        }
    }, []);

    // Refetch data when component mounts or when pathname changes (page visit/revisit)
    useEffect(() => {
        if (pathname?.includes("/settings/duplicate-number-exceptions")) {
            // Always refetch when visiting the page to get fresh data
            refetchExceptions();
        }
    }, [pathname, refetchExceptions]);

    // Listen for duplicate-number-request socket events
    useEffect(() => {
        // Only listen if we're on the duplicate-number-exceptions page
        if (!pathname?.includes("/settings/duplicate-number-exceptions")) {
            return;
        }

        const unsubscribe = onDuplicateNumberRequest((data: any) => {
            // Only update if we're on the pending tab
            if (activeTab === "pending") {
                // Check if the request status is PENDING
                const requestData = data?.data || data;
                if (requestData?.status === "PENDING" || requestData?.status === "pending") {
                    // Reset to first page, sort by createdAt desc to show newest first
                    // RTK Query will automatically refetch when filters change
                    setFilters((prev) => ({ 
                        ...prev, 
                        currentPage: 1,
                        sortField: "createdAt",
                        sortOrder: "desc" // Show newest requests at the top
                    }));
                    
                    // Also trigger manual refetch to ensure we get the latest data immediately
                    refetchExceptions();
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [pathname, activeTab, onDuplicateNumberRequest, refetchExceptions]);

    // Convert branches data to select options (using ID as value)
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
    const memberRegistrations: MemberRegistration[] = useMemo(() => {
        if (!duplicateNumberExceptionsData?.data) {
            return [];
        }
        return duplicateNumberExceptionsData.data.map((item) => ({
            id: item.id,
            branchName: item.branch?.name || "N/A",
            phoneNumber: item.contactNo,
            patientName: item.patientName || "N/A",
            relationship: item.relationship || "N/A",
            permissionBy: item.permissionByUser?.userName || item.permissionByUser?.name || "N/A",
            requestedBy: item.requestedByUser?.userName || item.requestedByUser?.userName || "N/A",
            status: (item.status?.toLowerCase() || "pending") as "pending" | "approved" | "rejected",
        }));
    }, [duplicateNumberExceptionsData]);

    // Filter data - search across all fields
    const filteredRegistrations = useMemo(() => {
        if (!filters.searchTerm.trim()) {
            return memberRegistrations;
        }
        
        const searchLower = filters.searchTerm.toLowerCase();
        return memberRegistrations.filter((member) => {
            return (
                member.phoneNumber.toLowerCase().includes(searchLower) ||
                (member.patientName || "").toLowerCase().includes(searchLower) ||
                (member.relationship || "").toLowerCase().includes(searchLower) ||
                member.branchName.toLowerCase().includes(searchLower) ||
                member.permissionBy.toLowerCase().includes(searchLower)||
                member.requestedBy.toLowerCase().includes(searchLower)

            );
        });
    }, [memberRegistrations, filters.searchTerm]);

    const totalItems = duplicateNumberExceptionsData?.total || 0;
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
            currentPage: 1, // Reset to first page when sorting
        }));
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    const handleApprove = async (id: number) => {
        if (!canEdit) return;
        try {
            const result = await approveRejectException({
                id,
                status: "approved",
            }).unwrap();
            
            setSuccessMessage(result?.message || "Exception approved successfully");
            setShowSuccessDialog(true);
            await refetchExceptions();
        } catch (error: any) {
            console.error("Error approving exception:", error);
            let errorMsg = "Failed to approve exception. Please try again.";
            
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
        if (!canEdit) return;
        try {
            const result = await approveRejectException({
                id,
                status: "rejected",
            }).unwrap();
            
            setSuccessMessage(result?.message || "Exception rejected successfully");
            setShowSuccessDialog(true);
            await refetchExceptions();
        } catch (error: any) {
            console.error("Error rejecting exception:", error);
            let errorMsg = "Failed to reject exception. Please try again.";
            
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

    const handleAddNew = () => {
        if (!canAdd) return;
        setFormValues({
            branchId: "",
            phoneNumber: "",
        });
        setBranchError("");
        setPhoneNumberError("");
        setPhoneNumberTouched(false);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canAdd) return;

        // Clear previous errors
        setBranchError("");
        setPhoneNumberError("");

        // Validate fields
        let hasError = false;

        if (!formValues.branchId || formValues.branchId.trim() === "") {
            setBranchError("Branch is required");
            hasError = true;
        }

        // Validate phone number
        if (!formValues.phoneNumber || formValues.phoneNumber.trim() === "") {
            setPhoneNumberError("Phone Number is required");
            hasError = true;
        } else {
            // Remove any non-digit characters for validation
            const digitsOnly = formValues.phoneNumber.replace(/\D/g, "");
            if (digitsOnly.length !== 10) {
                setPhoneNumberError("Phone Number must be exactly 10 digits");
                hasError = true;
            }
        }

        if (hasError) {
            return;
        }

        if (!loggedInUserId) {
            setApiErrorMessage("User information not found. Please login again.");
            setShowApiErrorDialog(true);
            return;
        }

        try {
            // Ensure phone number is digits only
            const phoneDigitsOnly = formValues.phoneNumber.replace(/\D/g, "");
            const result = await createDuplicateNumberException({
                branchId: parseInt(formValues.branchId),
                contactNo: phoneDigitsOnly,
                permissionBy: loggedInUserId, // Using logged-in user ID for permissionBy
                addedBy: loggedInUserId,
            }).unwrap();

            setSuccessMessage(result?.message || "Member permission added successfully");
            setShowSuccessDialog(true);
            setIsDialogOpen(false);
            setFormValues({
                branchId: "",
                phoneNumber: "",
            });
            setBranchError("");
            setPhoneNumberError("");
            setPhoneNumberTouched(false);
            
            // Refetch data after successful creation
            await refetchExceptions();
        } catch (error: any) {
            console.error("Error creating duplicate number exception:", error);
            
            // Handle error - show error message
            let errorMsg = "Failed to add member permission. Please try again.";
            
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
        setFilters((prev) => ({ ...prev, currentPage: page }));
    };

    const handleItemsPerPageChange = (items: number) => {
        setFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
    };

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Duplicate Number Exceptions" />
                </div>

                {/* Tabs */}
                <div className="mb-6 w-[450px]">
                    <Tabs options={tabOptions} value={activeTab} onChange={handleTabChange} />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    {!canView ? (
                        <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view duplicate number exceptions.
                        </div>
                    ) : (
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
                                {/* {canAdd ? (
                                    <button
                                        type="button"
                                        className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                        onClick={handleAddNew}
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                        <span className="text-hide">Add Member Permission List</span>
                                    </button>
                                ) : null} */}
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
                                        onSort={() => handleSort("contactNo")}
                                        sortDirection={getSortDirection("contactNo")}
                                    >
                                        Phone Number
                                    </TableHead>
                                    <TableHead 
                                        sortable 
                                        onSort={() => handleSort("patientName")}
                                        sortDirection={getSortDirection("patientName")}
                                    >
                                        Patient Name
                                    </TableHead>
                                    <TableHead 
                                        sortable 
                                        onSort={() => handleSort("relationship")}
                                        sortDirection={getSortDirection("relationship")}
                                    >
                                        Relationship
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
                                            colSpan={showActionColumn ? 7 : 6}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            Loading...
                                        </TableData>
                                    </TableRow>
                                ) : filteredRegistrations.length === 0 ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={showActionColumn ? 7 : 6}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            No member registrations found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    filteredRegistrations.map((member, index) => (
                                        <TableRow
                                            key={member.id}
                                            className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                        >
                                            <TableData variant="primary">
                                                {(filters.currentPage - 1) * filters.itemsPerPage + index + 1}
                                            </TableData>
                                            <TableData>
                                                {member.branchName}
                                            </TableData>
                                            <TableData>
                                                {member.phoneNumber}
                                            </TableData>
                                            <TableData>
                                                {member.patientName}
                                            </TableData>
                                            <TableData>
                                                {member.relationship}
                                            </TableData>
                                            <TableData>
                                                {activeTab === "pending" ? member.requestedBy : member.permissionBy}
                                            </TableData>
                                            {activeTab === "approved" && (
                                                <TableData>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        member.status === "approved" 
                                                            ? "bg-[#E8F5E9] text-[#0B8C00]" 
                                                            : member.status === "rejected"
                                                            ? "bg-[#FFEBEE] text-[#F6776E]"
                                                            : "bg-[#FFF3E0] text-[#F59E0B]"
                                                    }`}>
                                                        {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : "N/A"}
                                                    </span>
                                                </TableData>
                                            )}
                                            {showActionColumn && (
                                                <TableData>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApprove(member.id)}
                                                            disabled={isProcessingAction}
                                                            className="cursor-pointer flex h-9 items-center justify-center gap-1 rounded-[32px] border border-[#0B8C00] bg-[#0B8C00] px-4 text-sm font-medium text-white transition-colors hover:bg-[#18751b] disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Image src="/icons/ApproveIcon.svg" alt="Approve" width={20} height={20} />
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReject(member.id)}
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
                    )}
                </ListBorder>
            </div>

            <Dialog
                open={isDialogOpen && canAdd}
                onClose={() => {
                    setIsDialogOpen(false);
                    setBranchError("");
                    setPhoneNumberError("");
                    setPhoneNumberTouched(false);
                }}
                title="Duplicate Number Exceptions"
                width={686}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <FormSelectField
                                label="Branch *"
                                value={formValues.branchId}
                                onChange={(value) => {
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
                                disabled={isLoadingBranches || isCreating}
                            />
                            {branchError && (
                                <span className="mt-2 text-xs text-[#F87171]">{branchError}</span>
                            )}
                        </div>

                        <div>
                            <FormInputField
                                label="Phone Number *"
                                type="tel"
                                value={formValues.phoneNumber}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    // Only allow digits
                                    const digitsOnly = value.replace(/\D/g, "");
                                    // Limit to 10 digits
                                    const limitedValue = digitsOnly.slice(0, 10);
                                    setFormValues((prev) => ({
                                        ...prev,
                                        phoneNumber: limitedValue,
                                    }));
                                    // If field was previously touched and had an error, validate on change to clear error immediately when corrected
                                    if (phoneNumberTouched && phoneNumberError) {
                                        if (limitedValue.length === 10) {
                                            setPhoneNumberError("");
                                        } else if (limitedValue.length === 0) {
                                            setPhoneNumberError("Phone Number is required");
                                        } else {
                                            setPhoneNumberError("Phone Number must be exactly 10 digits");
                                        }
                                    }
                                }}
                                onBlur={(event) => {
                                    // Mark field as touched and validate when user moves to next field
                                    setPhoneNumberTouched(true);
                                    const value = event.target.value.trim();
                                    if (!value) {
                                        setPhoneNumberError("Phone Number is required");
                                    } else {
                                        const digitsOnly = value.replace(/\D/g, "");
                                        if (digitsOnly.length !== 10) {
                                            setPhoneNumberError("Phone Number must be exactly 10 digits");
                                        } else {
                                            setPhoneNumberError("");
                                        }
                                    }
                                }}
                                height={44}
                                placeholder="Phone Number"
                                required
                                maxLength={10}
                                disabled={isCreating}
                                error={phoneNumberError}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary" isLoading={isCreating}>
                            Save
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setBranchError("");
                                setPhoneNumberError("");
                                setPhoneNumberTouched(false);
                            }}
                            disabled={isCreating}
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
