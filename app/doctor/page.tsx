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
import {
    DOCTOR_LIST_BRANCH_STORAGE_KEY,
    useBranchFilter,
} from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import type { ApiDoctorListItem } from "@/lib/doctor/mapDoctorApi";
import {
    buildUpdateDoctorBody,
    departmentLabelFromApiId,
    mapApiDoctorListItemToPayload,
} from "@/lib/doctor/mapDoctorApi";
import { DoctorAvatarImage } from "@/components/doctor/DoctorAvatarImage";
import { useAppSelector } from "@/store/hooks";
import { selectLoginType, selectSelectedBranch } from "@/store/slices/authSlice";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import {
    useGetAllDoctorsDetailsQuery,
    useLazyGenerateCsvForDoctorQuery,
    useLazyGeneratePdfForDoctorQuery,
    useUpdateDoctorDetailsMutation,
} from "@/store/api/doctorApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

function mapSortField(field: string): string | undefined {
    if (!field) return undefined;
    if (field === "department") return "departmentId";
    return field;
}

function rtkErrorMessage(e: unknown): string {
    const x = e as { data?: { message?: string }; message?: string };
    if (typeof x?.data?.message === "string") return x.data.message;
    if (typeof x?.message === "string") return x.message;
    return "Something went wrong";
}

function doctorIsInactive(row: Pick<ApiDoctorListItem, "status">): boolean {
    return row.status?.toLowerCase() === "inactive";
}

function doctorStatusLabel(row: Pick<ApiDoctorListItem, "status">): string {
    return doctorIsInactive(row) ? "Inactive" : "Active";
}

export default function DoctorListPage() {
    const router = useRouter();
    const doctorPerm = usePermission("Doctor", { subModule: "Doctor" });
    const selectedBranch = useAppSelector(selectSelectedBranch);
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
        persistSuperAdminSelectionKey: DOCTOR_LIST_BRANCH_STORAGE_KEY,
    });

    const { data: branchesData } = useGetBranchesQuery(undefined, {
        skip: !isBranchFilterSuperAdmin,
    });

    /** Super admin: no "All Branches" — same pattern as dashboard. */
    const doctorBranchFilterOptions: SelectOption[] = useMemo(
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
    const [pendingStatusToggle, setPendingStatusToggle] = useState<ApiDoctorListItem | null>(null);
    const [messageDialog, setMessageDialog] = useState<{
        open: boolean;
        variant: "success" | "error";
        message: string;
    }>({ open: false, variant: "success", message: "" });

    const [updateDoctorDetails, { isLoading: isUpdatingDoctor }] = useUpdateDoctorDetailsMutation();

    const loginType = useAppSelector(selectLoginType);
    const checkLoginType = loginType?.toLowerCase() === "doctor" ? true : false;

    const { data, isLoading, isFetching, refetch } = useGetAllDoctorsDetailsQuery(
        {
            page: filters.currentPage,
            limit: filters.itemsPerPage,
            search: debouncedSearchTerm.trim(),
            branchId: filterBranchId ?? 0,
            sort: mapSortField(filters.sortField),
            order: filters.sortOrder,
        },
        { skip: filterBranchId == null || !doctorPerm.canView }
    );

    const [triggerPdf, { isFetching: pdfLoading }] = useLazyGeneratePdfForDoctorQuery();
    const [triggerCsv, { isFetching: csvLoading }] = useLazyGenerateCsvForDoctorQuery();

    const rows: ApiDoctorListItem[] = data?.data ?? [];
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
        if (!pendingStatusToggle || isUpdatingDoctor) return;

        const nextStatusApi = doctorIsInactive(pendingStatusToggle) ? "active" : "inactive";
        const payload = mapApiDoctorListItemToPayload(pendingStatusToggle);
        const body = buildUpdateDoctorBody(
            {
                ...payload,
                status: nextStatusApi === "active" ? "Active" : "Inactive",
            },
            pendingStatusToggle.roleId
        );

        try {
            await updateDoctorDetails({
                id: pendingStatusToggle.id,
                body,
            }).unwrap();
            setPendingStatusToggle(null);
            setMessageDialog({
                open: true,
                variant: "success",
                message:
                    nextStatusApi === "active"
                        ? "Doctor has been activated successfully."
                        : "Doctor has been inactivated successfully.",
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

    const goView = (row: ApiDoctorListItem) =>
        router.push(`/doctor/${row.id}?branchId=${row.branchId}`);
    const goCredentials = (row: ApiDoctorListItem) =>
        router.push(`/doctor/${row.id}?branchId=${row.branchId}&section=credentials`);
    const goEdit = (row: ApiDoctorListItem) =>
        router.push(`/doctor/${row.id}/edit?branchId=${row.branchId}`);

    const listLoading = isLoading || isFetching;

    if (!doctorPerm.canView) {
        return (
            <AppShell>
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                    You don&apos;t have permission to view doctors.
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Doctor" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex flex-wrap items-center gap-3">
                                <FormSelectField
                                    label=""
                                    hideLabel
                                    options={doctorBranchFilterOptions}
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
                                {doctorPerm.canAdd && (
                                    <button
                                        type="button"
                                        className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                        onClick={() =>
                                            router.push(
                                                filterBranchId != null
                                                    ? `/doctor/add?branchId=${filterBranchId}`
                                                    : "/doctor/add"
                                            )
                                        }
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                        <span className="text-hide">Add Doctor</span>
                                    </button>
                                )}
                                {doctorPerm.canDownload && (
                                    <ExportButton
                                        onExportPDF={handleExportPDF}
                                        onExportCSV={handleExportCSV}
                                        isLoadingPDF={pdfLoading}
                                        isLoadingCSV={csvLoading}
                                    />
                                )}
                                <RefreshButton onClick={handleRefresh} />
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        <TableHead position="first">Sr no.</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>User Details</TableHead>
                                        <TableHead
                                            sortable
                                            sortDirection={getSortDirection("email")}
                                            onSort={() => handleSort("email")}
                                        >
                                            Email/Username
                                        </TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Emp ID</TableHead>
                                        <TableHead
                                            // sortable
                                            // sortDirection={getSortDirection("department")}
                                            // onSort={() => handleSort("department")}
                                        >
                                            Department
                                        </TableHead>
                                        <TableHead>NABH</TableHead>
                                        <TableHead
                                            // sortable
                                            // sortDirection={getSortDirection("status")}
                                            // onSort={() => handleSort("status")}
                                        >
                                            Status
                                        </TableHead>
                                        <TableHead position="last">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filterBranchId == null ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={10}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                Select a branch to view doctors.
                                            </TableData>
                                        </TableRow>
                                    ) : listLoading ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={10}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                Loading…
                                            </TableData>
                                        </TableRow>
                                    ) : rows.length === 0 ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={10}
                                                className="py-12 text-center text-sm text-[#9CA3AF]"
                                            >
                                                No doctors found
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
                                                            <DoctorAvatarImage
                                                                imgUrl={row.imgUrl}
                                                                size={40}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                        <span className="font-medium text-[#262D3B]">{row.name}</span>
                                                    </div>
                                                </TableData>
                                                <TableData className="max-w-[200px] truncate text-sm">
                                                    {row.email}
                                                </TableData>
                                                <TableData>{row.phone}</TableData>
                                                <TableData>{row.empId}</TableData>
                                                <TableData>
                                                    {formatDepartmentTableCell(row)}
                                                </TableData>
                                                <TableData>
                                                    {row.nabh?.toLowerCase() === "yes" ? "Yes" : "No"}
                                                </TableData>
                                                <TableData>
                                                    {doctorPerm.canEdit ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingStatusToggle(row)}
                                                            className={`inline-flex h-[30px] min-w-[76px] cursor-pointer items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] transition-colors duration-150 ${
                                                                doctorIsInactive(row)
                                                                    ? "border-[#F6776E] bg-white text-[#F6776E] hover:border-[#F6776E] hover:bg-[#FFEBEE] hover:shadow-sm"
                                                                    : "border-[#0B8C00]/20 bg-white text-[#0B8C00] hover:border-[#0B8C00]/50 hover:bg-[#E8F5E9] hover:shadow-sm"
                                                            }`}
                                                            aria-label={`Change status from ${doctorStatusLabel(row)}`}
                                                        >
                                                            {doctorStatusLabel(row)}
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className={`inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] ${
                                                                doctorIsInactive(row)
                                                                    ? "border-[#F6776E] bg-white text-[#F6776E]"
                                                                    : "border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                                                            }`}
                                                        >
                                                            {doctorStatusLabel(row)}
                                                        </span>
                                                    )}
                                                </TableData>
                                                <TableData>
                                                    <div className="flex items-center gap-2">
                                                        {doctorPerm.canView && (
                                                            <Tooltip content="View" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => goView(row)}
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
                                                            </Tooltip>
                                                        )}
                                                        {doctorPerm.canEdit && (
                                                            <Tooltip content="Edit" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => goEdit(row)}
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
                                                        )}
                                                        {/* {doctorPerm.canEdit && ( */}
                                                              { !checkLoginType &&
                                                            <Tooltip content="Credentials" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => goCredentials(row)}
                                                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
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
                    if (!isUpdatingDoctor) setPendingStatusToggle(null);
                }}
                icon="/icons/questionMark.svg"
                iconBgColor="#FFF8E1"
                message={
                    pendingStatusToggle
                        ? doctorIsInactive(pendingStatusToggle)
                            ? "Are you sure you want to Active this Doctor"
                            : "Are you sure you want to Inactive this Doctor"
                        : ""
                }
                confirmText="Confirm"
                cancelText="Cancel"
                showCancel
                isActionLoading={isUpdatingDoctor}
                onConfirm={handleConfirmStatusToggle}
                onCancel={() => {
                    if (!isUpdatingDoctor) setPendingStatusToggle(null);
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

/** When `department` is null, show "-" (not `departmentId`). Otherwise name, or label from id. */
function formatDepartmentTableCell(row: ApiDoctorListItem): string {
    if (row.department == null) return "-";
    const named = row.department.name?.trim();
    if (named) return named;
    return departmentLabelFromApiId(row.departmentId) || "-";
}
