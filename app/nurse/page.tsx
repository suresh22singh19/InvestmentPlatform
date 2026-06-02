"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    ExportButton,
    RefreshButton,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableData,
    TableSearchInput,
    Pagination,
    Tooltip,
    FormSelectField,
    MessageDialog,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import {
    nurseIsInactive,
    nurseStatusDisplayLabel,
    type ApiNurseListItem,
} from "@/lib/nurse/mapNurseApi";
import { NurseAvatarImage } from "@/components/nurse/NurseAvatarImage";
import { useAppSelector } from "@/store/hooks";
import { selectLoginType, selectSelectedBranch } from "@/store/slices/authSlice";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import {
    useGetNursesQuery,
    useLazyGenerateNursesCsvQuery,
    useLazyGenerateNursesPdfQuery,
    useUpdateNurseMutation,
} from "@/store/api/nurseApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

const NURSE_LIST_BRANCH_STORAGE_KEY = "hiims-nurse-list-branch-filter";

const TABLE_COL_COUNT = 9;

function mapSortField(field: string): string | undefined {
    if (!field) return undefined;
    if (field === "name") return "name";
    return field;
}

function mapSortOrder(order: "asc" | "desc"): "ASC" | "DESC" {
    return order === "desc" ? "DESC" : "ASC";
}

function rtkErrorMessage(e: unknown): string {
    const x = e as { data?: { message?: string }; message?: string };
    if (typeof x?.data?.message === "string") return x.data.message;
    if (typeof x?.message === "string") return x.message;
    return "Something went wrong";
}

export default function NurseListPage() {
    const router = useRouter();
    const nursePerm = usePermission("Nurse", { subModule: "Nurse" });
    // debugger;
    const selectedBranch = useAppSelector(selectSelectedBranch);
    const loginType = useAppSelector(selectLoginType);
    const checkLoginType = loginType?.toLowerCase() === "nurse" ? true : false;
      
    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions,
        isLoadingBranches,
        isBranchFilterDisabled,
        isSuperAdmin: isBranchFilterSuperAdmin,
        filterBranchId,
        branchFilterPersistReady,
    } = useBranchFilter({
        persistSuperAdminSelectionKey: NURSE_LIST_BRANCH_STORAGE_KEY,
    });

    const { data: branchesData } = useGetBranchesQuery(undefined, {
        skip: !isBranchFilterSuperAdmin,
    });

    const nurseBranchFilterOptions: SelectOption[] = useMemo(
        () => branchFilterOptions.filter((o) => o.value !== ""),
        [branchFilterOptions]
    );

    useEffect(() => {
        if (!branchFilterPersistReady) return;
        if (!isBranchFilterSuperAdmin) return;
        if (isLoadingBranches) return;
        const rows = branchesData?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (selectedBranchFilter !== "") {
            const valid = rows.some((b) => String(b.id) === selectedBranchFilter);
            if (!valid) {
                setSelectedBranchFilter(String(rows[0].id));
            }
            return;
        }
        setSelectedBranchFilter(String(rows[0].id));
    }, [
        branchFilterPersistReady,
        isBranchFilterSuperAdmin,
        isLoadingBranches,
        branchesData,
        selectedBranchFilter,
        setSelectedBranchFilter,
    ]);

    const branchDisplayName = useMemo(() => {
        return (branchId: string): string => {
            const rows = branchesData?.data;
            if (Array.isArray(rows)) {
                const found = rows.find((b) => String(b.id) === branchId);
                if (found?.name) return found.name;
            }
            if (selectedBranch && String(selectedBranch.id) === branchId) {
                return selectedBranch.name ?? "";
            }
            return branchId;
        };
    }, [branchesData, selectedBranch]);

    const [filters, setFilters] = useState({
        searchTerm: "",
        currentPage: 1,
        itemsPerPage: 10,
        sortField: "",
        sortOrder: "asc" as "asc" | "desc",
    });

    const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

    const [exportError, setExportError] = useState("");
    const [showExportErrorDialog, setShowExportErrorDialog] = useState(false);
    const [pendingStatusToggle, setPendingStatusToggle] = useState<ApiNurseListItem | null>(null);
    const [messageDialog, setMessageDialog] = useState<{
        open: boolean;
        variant: "success" | "error";
        message: string;
    }>({ open: false, variant: "success", message: "" });

    const [updateNurse, { isLoading: isUpdatingNurse }] = useUpdateNurseMutation();

    const { data, isLoading, isFetching, refetch } = useGetNursesQuery(
        {
            page: filters.currentPage,
            limit: filters.itemsPerPage,
            search: debouncedSearchTerm.trim(),
            branchId: filterBranchId ?? 0,
            sort: mapSortField(filters.sortField),
            order: filters.sortField ? mapSortOrder(filters.sortOrder) : undefined,
        },
        { skip: filterBranchId == null || !nursePerm.canView }
    );

    const [triggerPdf, { isFetching: pdfLoading }] = useLazyGenerateNursesPdfQuery();
    const [triggerCsv, { isFetching: csvLoading }] = useLazyGenerateNursesCsvQuery();

    const rows: ApiNurseListItem[] = data?.data ?? [];
    const totalItems = data?.total ?? 0;

    const handleExportPDF = async () => {
        if (filterBranchId == null) {
            setExportError("Select a branch to export.");
            setShowExportErrorDialog(true);
            return;
        }
        try {
            const res = await triggerPdf({
                branchId: filterBranchId,
                search: debouncedSearchTerm.trim(),
                page: filters.currentPage,
                limit: filters.itemsPerPage,
            }).unwrap();
            if (res?.data?.url) {
                window.open(res.data.url, "_blank", "noopener,noreferrer");
            }
        } catch (e) {
            setExportError(rtkErrorMessage(e));
            setShowExportErrorDialog(true);
        }
    };

    const handleExportCSV = async () => {
        if (filterBranchId == null) {
            setExportError("Select a branch to export.");
            setShowExportErrorDialog(true);
            return;
        }
        try {
            const res = await triggerCsv({
                branchId: filterBranchId,
                search: debouncedSearchTerm.trim(),
                page: filters.currentPage,
                limit: filters.itemsPerPage,
            }).unwrap();
            if (res?.data?.url) {
                window.open(res.data.url, "_blank", "noopener,noreferrer");
            }
        } catch (e) {
            setExportError(rtkErrorMessage(e));
            setShowExportErrorDialog(true);
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
                return { ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" };
            }
            return { ...prev, sortField: field, sortOrder: "asc", currentPage: 1 };
        });
    };

    const getSortDirection = (field: string): "asc" | "desc" | null => {
        if (filters.sortField === field) {
            return filters.sortOrder;
        }
        return null;
    };

    const handleRefresh = () => {
        void refetch();
    };

    const dismissMessageDialog = () => {
        setMessageDialog((m) => ({ ...m, open: false }));
    };

    const handleConfirmStatusToggle = async () => {
        if (!pendingStatusToggle || isUpdatingNurse) return;

        const nextIsActive = nurseIsInactive(pendingStatusToggle);

        try {
            await updateNurse({
                id: pendingStatusToggle.id,
                body: { isActive: nextIsActive },
            }).unwrap();
            setPendingStatusToggle(null);
            setMessageDialog({
                open: true,
                variant: "success",
                message: nextIsActive
                    ? "Nurse has been activated successfully."
                    : "Nurse has been inactivated successfully.",
            });
        } catch (e) {
            setPendingStatusToggle(null);
            setMessageDialog({
                open: true,
                variant: "error",
                message: rtkErrorMessage(e),
            });
        }
    };

    const goView = (row: ApiNurseListItem) =>
        router.push(`/nurse/${row.id}?branchId=${row.branchId}`);
    const goCredentials = (row: ApiNurseListItem) =>
        router.push(`/nurse/${row.id}?branchId=${row.branchId}&section=credentials`);
    const goEdit = (row: ApiNurseListItem) =>
        router.push(`/nurse/${row.id}/edit?branchId=${row.branchId}`);

    const listLoading = isLoading || isFetching;

    if (!nursePerm.canView) {
        return (
            <AppShell>
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                    You don&apos;t have permission to view nurses.
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Nurse" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex flex-wrap items-center gap-3">
                                <FormSelectField
                                    className="cursor-pointer"
                                    label=""
                                    hideLabel
                                    options={nurseBranchFilterOptions}
                                    value={selectedBranchFilter}
                                    onChange={(value) => {
                                        setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                                        setFilters((prev) => ({ ...prev, currentPage: 1 }));
                                    }}
                                    placeholder={
                                        isLoadingBranches ? "Loading branches…" : "Select Branch"
                                    }
                                    mode="single"
                                    background="normal"
                                    width={300}
                                    disabled={isBranchFilterDisabled}
                                />
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <TableSearchInput
                                        value={filters.searchTerm}
                                        onChange={(value) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                searchTerm: value,
                                                currentPage: prev.searchTerm !== value ? 1 : prev.currentPage,
                                            }))
                                        }
                                        placeholder="Search Here..."
                                    />
                                </div>
                                {nursePerm.canAdd && (
                                    <button
                                        type="button"
                                        className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] cursor-pointer"
                                        onClick={() => router.push("/nurse/add")}
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                        <span className="text-hide">Add Nurse</span>
                                    </button>
                                )}
                                {nursePerm.canDownload && (
                                    <ExportButton
                                        className="cursor-pointer"
                                        onExportPDF={handleExportPDF}
                                        onExportCSV={handleExportCSV}
                                        isLoadingPDF={pdfLoading}
                                        isLoadingCSV={csvLoading}
                                    />
                                )}
                                <RefreshButton onClick={handleRefresh} className="cursor-pointer" />
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        <TableHead position="first">Sr no.</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead
                                            sortable
                                            sortDirection={getSortDirection("name")}
                                            onSort={() => handleSort("name")}
                                        >
                                            User Details
                                        </TableHead>
                                        <TableHead
                                            sortable
                                            sortDirection={getSortDirection("email")}
                                            onSort={() => handleSort("email")}
                                        >
                                            Email
                                        </TableHead>
                                        <TableHead
                                            sortable
                                            sortDirection={getSortDirection("address")}
                                            onSort={() => handleSort("address")}
                                        >
                                            Address
                                        </TableHead>
                                        <TableHead
                                            sortable
                                            sortDirection={getSortDirection("phone")}
                                            onSort={() => handleSort("phone")}
                                        >
                                            Phone
                                        </TableHead>
                                        <TableHead
                                            sortable
                                            sortDirection={getSortDirection("empId")}
                                            onSort={() => handleSort("empId")}
                                        >
                                            Emp ID
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead position="last">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filterBranchId == null ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={TABLE_COL_COUNT}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                Select a branch to view nurses.
                                            </TableData>
                                        </TableRow>
                                    ) : listLoading ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={TABLE_COL_COUNT}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                Loading…
                                            </TableData>
                                        </TableRow>
                                    ) : rows.length === 0 ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={TABLE_COL_COUNT}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                No nurses found
                                            </TableData>
                                        </TableRow>
                                    ) : (
                                        rows.map((row, index) => (
                                            <TableRow
                                                key={row.id}
                                                className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                            >
                                                <TableData variant="primary">
                                                    {(filters.currentPage - 1) * filters.itemsPerPage + index + 1}
                                                </TableData>
                                                <TableData className="whitespace-nowrap">
                                                    {row.branch?.name ?? branchDisplayName(String(row.branchId))}
                                                </TableData>
                                                <TableData>
                                                    <div className="flex min-w-[180px] items-center gap-3">
                                                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#E3EEE1] bg-[#F3F4F6]">
                                                            <NurseAvatarImage
                                                                imgUrl={row.imgUrl}
                                                                size={40}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                        <span className="font-medium text-[#262D3B]">
                                                            {row.name || "—"}
                                                        </span>
                                                    </div>
                                                </TableData>
                                                <TableData className="max-w-[200px] truncate text-sm">
                                                    {row.email}
                                                </TableData>
                                                <TableData className="max-w-[180px] truncate">
                                                    {row.address || "—"}
                                                </TableData>
                                                <TableData>{row.phone}</TableData>
                                                <TableData>{row.empId}</TableData>
                                                <TableData className="text-start">
                                                    {nursePerm.canEdit ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingStatusToggle(row)}
                                                            className={`inline-flex h-[30px] min-w-[76px] cursor-pointer items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] transition-colors duration-150 ${nurseIsInactive(row)
                                                                    ? "border-[#F6776E] bg-white text-[#F6776E] hover:border-[#F6776E] hover:bg-[#FFEBEE] hover:shadow-sm"
                                                                    : "border-[#0B8C00]/20 bg-white text-[#0B8C00] hover:border-[#0B8C00]/50 hover:bg-[#E8F5E9] hover:shadow-sm"
                                                                }`}
                                                            aria-label={`Change status from ${nurseStatusDisplayLabel(row)}`}
                                                        >
                                                            {nurseStatusDisplayLabel(row)}
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className={`inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] ${nurseIsInactive(row)
                                                                    ? "border-[#F6776E] bg-white text-[#F6776E]"
                                                                    : "border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                                                                }`}
                                                        >
                                                            {nurseStatusDisplayLabel(row)}
                                                        </span>
                                                    )}
                                                </TableData>
                                                <TableData className="text-start">
                                                    <div className="flex items-center justify-start gap-2">
                                                        {nursePerm.canView && (
                                                            <Tooltip content="View" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => goView(row)}
                                                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] cursor-pointer"
                                                                    aria-label="View"
                                                                >
                                                                    <Image
                                                                        src="/icons/ViewEyeIcon.svg"
                                                                        alt="View"
                                                                        width={20}
                                                                        height={20}
                                                                    />
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                        {nursePerm.canEdit && (
                                                            <Tooltip content="Edit" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => goEdit(row)}
                                                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] cursor-pointer"
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
                                                        )}
                                                        {/* {nursePerm.canEdit && ( */}
                                                           { !checkLoginType &&
                                                            <Tooltip content="Credentials" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => goCredentials(row)}
                                                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] cursor-pointer"
                                                                    aria-label="Credentials"
                                                                >
                                                                    <Image
                                                                        src="/icons/key.svg"
                                                                        alt=""
                                                                        width={20}
                                                                        height={20}
                                                                    />
                                                                </button>
                                                            </Tooltip>
                                                            }
                                                        {/* )} */}
                                                    </div>
                                                </TableData>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {filterBranchId != null && totalItems > 0 && (
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

            <MessageDialog
                open={!!pendingStatusToggle}
                onClose={() => {
                    if (!isUpdatingNurse) setPendingStatusToggle(null);
                }}
                icon="/icons/questionMark.svg"
                iconBgColor="#FFF8E1"
                message={
                    pendingStatusToggle
                        ? nurseIsInactive(pendingStatusToggle)
                            ? "Are you sure you want to Active this Nurse"
                            : "Are you sure you want to Inactive this Nurse"
                        : ""
                }
                confirmText="Confirm"
                cancelText="Cancel"
                showCancel
                isActionLoading={isUpdatingNurse}
                onConfirm={handleConfirmStatusToggle}
                onCancel={() => {
                    if (!isUpdatingNurse) setPendingStatusToggle(null);
                }}
            />

            <MessageDialog
                open={messageDialog.open}
                onClose={dismissMessageDialog}
                message={messageDialog.message}
                icon={
                    messageDialog.variant === "success"
                        ? "/icons/SuccessCheck.svg"
                        : "/icons/ErrorIcon.svg"
                }
                iconBgColor={messageDialog.variant === "success" ? "#E8F5E9" : "#FFEBEE"}
                confirmText="OK"
                showCancel={false}
                onConfirm={dismissMessageDialog}
            />

            <MessageDialog
                open={showExportErrorDialog}
                onClose={() => setShowExportErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={exportError}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowExportErrorDialog(false)}
            />
        </AppShell>
    );
}
