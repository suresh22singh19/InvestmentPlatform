"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { ListBorder } from "@/components/ui/ListBorder";
import {
    BackToPreviousPageButton,
    Button,
    Dialog,
    FormSelectField,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableData,
    TableSearchInput,
    Pagination,
    MessageDialog,
    Tooltip,
} from "@/components/ui";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import {
    useGetBranchesWithRolesQuery,
    useLazyGetBranchesWithRolesQuery,
    useGetAssignableRolesQuery,
    useAssignRoleToBranchesMutation,
    useDeleteRoleBranchAccessMutation,
    type AssignableRoleItem,
    type BranchRoleAssignedRole,
    type BranchWithRolesRow,
} from "@/store/api/roleAndPermission";
import { usePermission } from "@/hooks/usePermission";

const VISIBLE_ROLE_PILLS = 4;

/** FormSelectField option value for “no branch” (clears filter / resets form branch). */
const BRANCH_NONE_VALUE = "";

function errText(e: unknown, fallback: string): string {
    if (e && typeof e === "object" && "data" in e) {
        const d = (e as { data?: { message?: string } }).data;
        if (d?.message && typeof d.message === "string") return d.message;
    }
    return fallback;
}

/** Aligns with settings branch `type` and getBranchRoleByCategoryType: clinic vs hospital (daycare → hospital). */
function branchRecordTypeToAssignableApiBranchType(apiType: string | undefined): "hospital" | "clinic" {
    const t = (apiType ?? "").toLowerCase().trim();
    if (t === "clinic") return "clinic";
    return "hospital";
}

function addedByCell(row: BranchWithRolesRow): string {
    const withUser = row.roles.find((r) => r.assignedBy);
    if (!withUser?.assignedBy) return "—";
    const { email, userName } = withUser.assignedBy;
    return email || userName || "—";
}

function RoleCardDeleteIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            className={`h-3 w-2.5 shrink-0 text-[#F6776E] ${className}`}
            viewBox="0 0 10 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <path
                d="M4 0C3.73828 0 3.4707 0.091797 3.28125 0.28125C3.0918 0.470703 3 0.738282 3 1V1.5H0V2.5H0.5V10.5C0.5 11.3223 1.17773 12 2 12H8C8.82227 12 9.5 11.3223 9.5 10.5V2.5H10V1.5H7V1C7 0.738282 6.9082 0.470703 6.71875 0.28125C6.5293 0.091797 6.26172 0 6 0H4ZM4 1H6V1.5H4V1ZM1.5 2.5H8.5V10.5C8.5 10.7773 8.27734 11 8 11H2C1.72266 11 1.5 10.7773 1.5 10.5V2.5ZM2.5 4V9.5H3.5V4H2.5ZM4.5 4V9.5H5.5V4H4.5ZM6.5 4V9.5H7.5V4H6.5Z"
                fill="currentColor"
            />
        </svg>
    );
}

function RoleCardDeleteSpinner() {
    return (
        <svg
            className="h-4 w-4 shrink-0 animate-spin text-[#F2776E]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

export default function BranchRoleMasterPage() {
    const modulePermission = usePermission("Roles And Permissions");
    const subModulePermission = usePermission("Roles And Permissions", { subModule: "Branch Role Master" });
    const canView = modulePermission.canView || subModulePermission.canView;
    const canEdit = modulePermission.canEdit || subModulePermission.canEdit;
    const canDelete = modulePermission.canDelete || subModulePermission.canDelete;

    const [detailBranch, setDetailBranch] = useState<BranchWithRolesRow | null>(null);

    const [listPage, setListPage] = useState(1);
    const [listLimit, setListLimit] = useState(10);
    const [listSearchInput, setListSearchInput] = useState("");
    const [listSearchDebounced, setListSearchDebounced] = useState("");
    const {
        selectedBranchFilter: hookBranchFilter,
        setSelectedBranchFilter: setHookBranchFilter,
        branchFilterOptions: hookBranchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        filterBranchId: hookFilterBranchIdNum,
    } = useBranchFilter();
    const filterBranchId = hookBranchFilter || null;
    const [listSort, setListSort] = useState<string | undefined>(undefined);
    const [listOrder, setListOrder] = useState<"asc" | "desc" | undefined>(undefined);

    const [detailPage, setDetailPage] = useState(1);
    const [detailLimit, setDetailLimit] = useState(10);
    const [detailSearchInput, setDetailSearchInput] = useState("");
    const [detailSearchDebounced, setDetailSearchDebounced] = useState("");

    const [messageDialog, setMessageDialog] = useState<{
        open: boolean;
        variant: "success" | "error";
        message: string;
    }>({ open: false, variant: "success", message: "" });

    const showMessage = useCallback((variant: "success" | "error", message: string) => {
        setMessageDialog({ open: true, variant, message });
    }, []);

    const dismissMessageDialog = useCallback(() => {
        setMessageDialog((m) => ({ ...m, open: false }));
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => setListSearchDebounced(listSearchInput.trim()), 300);
        return () => window.clearTimeout(t);
    }, [listSearchInput]);

    useEffect(() => {
        const t = window.setTimeout(() => setDetailSearchDebounced(detailSearchInput.trim()), 300);
        return () => window.clearTimeout(t);
    }, [detailSearchInput]);

    useEffect(() => {
        setListPage(1);
    }, [listSearchDebounced, filterBranchId, listSort, listOrder]);

    useEffect(() => {
        setDetailPage(1);
    }, [detailSearchDebounced, detailBranch?.id]);

    const filterBranchIdNum = hookFilterBranchIdNum;

    const { data: branchesRes } = useGetBranchesQuery();
    const branchOptions = useMemo(() => {
        const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
        return rows.map((b) => ({ label: b.name, value: String(b.id) }));
    }, [branchesRes]);

    const branchOptionsWithNone = useMemo(
        () => [{ label: "None", value: BRANCH_NONE_VALUE }, ...branchOptions],
        [branchOptions]
    );

    const parseBranchSelectValue = (val: string | string[] | null): string | null => {
        const v = typeof val === "string" ? val : null;
        if (v == null || v === BRANCH_NONE_VALUE) return null;
        return v;
    };

    const { data: listRes, isFetching: listFetching } = useGetBranchesWithRolesQuery({
        page: listPage,
        limit: listLimit,
        sort: listSort,
        order: listOrder,
        search: listSearchDebounced || undefined,
        branchId: filterBranchIdNum,
    }, { skip: !canView });

    const listRows: BranchWithRolesRow[] = useMemo(() => {
        if (!listRes || listRes.success === false) return [];
        if (!Array.isArray(listRes.data)) return [];
        return listRes.data;
    }, [listRes]);

    const listTotal = listRes?.total ?? listRows.length;

    const [fetchBranchesWithRoles] = useLazyGetBranchesWithRolesQuery();

    const refreshDetailBranch = useCallback(
        async (branchId: number) => {
            try {
                const res = await fetchBranchesWithRoles({
                    page: 1,
                    limit: 500,
                    branchId,
                    sort: listSort,
                    order: listOrder,
                }).unwrap();
                if (!Array.isArray(res.data)) return;
                const found = res.data.find((b: BranchWithRolesRow) => b.id === branchId);
                if (found) setDetailBranch(found);
            } catch {
                /* keep current snapshot */
            }
        },
        [fetchBranchesWithRoles, listSort, listOrder]
    );

    const filteredDetailRoles = useMemo(() => {
        if (!detailBranch?.roles?.length) return [];
        const q = detailSearchDebounced.toLowerCase();
        if (!q) return detailBranch.roles;
        return detailBranch.roles.filter((r: BranchRoleAssignedRole) =>
            r.name.toLowerCase().includes(q)
        );
    }, [detailBranch, detailSearchDebounced]);

    const detailPagedRoles = useMemo(() => {
        const start = (detailPage - 1) * detailLimit;
        return filteredDetailRoles.slice(start, start + detailLimit);
    }, [filteredDetailRoles, detailPage, detailLimit]);

    const detailTotal = filteredDetailRoles.length;
    const detailBranchName = detailBranch?.name ?? "—";

    const [addOpen, setAddOpen] = useState(false);
    const [addBranchId, setAddBranchId] = useState<string | null>(null);
    const [addRoleId, setAddRoleId] = useState<string | null>(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editBranchId, setEditBranchId] = useState<string | null>(null);
    const [editRoleId, setEditRoleId] = useState<string | null>(null);
    /** Label for current role so the edit dropdown shows it even if not in assignable list */
    const [editCurrentRoleName, setEditCurrentRoleName] = useState<string | null>(null);

    const [moreOpen, setMoreOpen] = useState(false);
    const [moreRoleId, setMoreRoleId] = useState<string | null>(null);

    const addBranchIdParsed = addBranchId != null ? Number(addBranchId) : NaN;
    const addBranchType = useMemo(() => {
        const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
        const b = rows.find((x) => x.id === addBranchIdParsed);
        return branchRecordTypeToAssignableApiBranchType(b?.type);
    }, [branchesRes, addBranchIdParsed]);

    const { data: addAssignableRes, isFetching: addRolesFetching } = useGetAssignableRolesQuery(
        {
            branchId: Number.isFinite(addBranchIdParsed) ? addBranchIdParsed : 0,
            branchType: addBranchType,
        },
        { skip: !addOpen || !addBranchId || !Number.isFinite(addBranchIdParsed) }
    );

    const addRoleOptions = useMemo(() => {
        const rows: AssignableRoleItem[] = Array.isArray(addAssignableRes?.data) ? addAssignableRes.data : [];
        return rows.map((r) => ({ label: r.name, value: String(r.id) }));
    }, [addAssignableRes]);

    const editBranchIdParsed = editBranchId != null ? Number(editBranchId) : NaN;
    const editBranchType = useMemo(() => {
        const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
        const b = rows.find((x) => x.id === editBranchIdParsed);
        return branchRecordTypeToAssignableApiBranchType(b?.type);
    }, [branchesRes, editBranchIdParsed]);

    const { data: editAssignableRes, isFetching: editRolesFetching } = useGetAssignableRolesQuery(
        {
            branchId: Number.isFinite(editBranchIdParsed) ? editBranchIdParsed : 0,
            branchType: editBranchType,
        },
        { skip: !editOpen || !editBranchId || !Number.isFinite(editBranchIdParsed) }
    );

    const editRoleOptions = useMemo(() => {
        const rows = Array.isArray(editAssignableRes?.data) ? editAssignableRes!.data : [];
        return rows.map((r) => ({ label: r.name, value: String(r.id) }));
    }, [editAssignableRes]);

    const editRoleOptionsWithCurrent = useMemo(() => {
        if (!editRoleId) return editRoleOptions;
        if (editRoleOptions.some((o) => o.value === editRoleId)) return editRoleOptions;
        return [
            ...editRoleOptions,
            { label: editCurrentRoleName ?? `Role #${editRoleId}`, value: editRoleId },
        ];
    }, [editRoleOptions, editRoleId, editCurrentRoleName]);

    const moreBranchId = detailBranch?.id ?? 0;
    const moreBranchType = useMemo(() => {
        const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
        const b = rows.find((x) => x.id === moreBranchId);
        return branchRecordTypeToAssignableApiBranchType(b?.type);
    }, [branchesRes, moreBranchId]);

    const { data: moreAssignableRes, isFetching: moreRolesFetching } = useGetAssignableRolesQuery(
        { branchId: moreBranchId, branchType: moreBranchType },
        { skip: !moreOpen || !detailBranch?.id }
    );

    const moreRoleOptions = useMemo(() => {
        const rows: AssignableRoleItem[] = Array.isArray(moreAssignableRes?.data) ? moreAssignableRes.data : [];
        return rows.map((r) => ({ label: r.name, value: String(r.id) }));
    }, [moreAssignableRes]);

    const [assignRoleToBranches, { isLoading: assignLoading }] = useAssignRoleToBranchesMutation();
    const [deleteRoleBranchAccess] = useDeleteRoleBranchAccessMutation();
    const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);
    const [deleteConfirmRoleId, setDeleteConfirmRoleId] = useState<number | null>(null);

    const closeDeleteConfirm = () => {
        if (!canDelete) return;
        if (deletingRoleId !== null) return;
        setDeleteConfirmRoleId(null);
    };

    const openAddDialog = () => {
        setAddBranchId(null);
        setAddRoleId(null);
        setAddOpen(true);
    };

    const closeAddDialog = () => {
        setAddOpen(false);
        setAddBranchId(null);
        setAddRoleId(null);
    };

    const openEditFromRow = (row: BranchWithRolesRow) => {
        if (!canEdit) return;
        const first = row.roles[0];
        if (!first) {
            showMessage("error", "No role assignment found to edit for this branch.");
            return;
        }
        setEditBranchId(String(row.id));
        setEditRoleId(String(first.id));
        setEditCurrentRoleName(first.name);
        setEditOpen(true);
    };

    const closeEditDialog = () => {
        setEditOpen(false);
        setEditBranchId(null);
        setEditRoleId(null);
        setEditCurrentRoleName(null);
    };

    const openMoreDialog = () => {
        if (!canEdit) return;
        setMoreRoleId(null);
        setMoreOpen(true);
    };

    const closeMoreDialog = () => {
        setMoreOpen(false);
        setMoreRoleId(null);
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addBranchId || !addRoleId) {
            showMessage("error", "Please select branch and role.");
            return;
        }
        const branchId = Number(addBranchId);
        try {
            const res = await assignRoleToBranches({
                roleId: Number(addRoleId),
                branchIds: [branchId],
            }).unwrap();
            closeAddDialog();
            showMessage("success", res.message || "Role assigned to branches successfully.");
            if (detailBranch?.id === branchId) await refreshDetailBranch(branchId);
        } catch (err) {
            showMessage("error", errText(err, "Could not assign role."));
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        if (!canEdit) return;
        e.preventDefault();
        if (!editBranchId || !editRoleId) {
            showMessage("error", "Please select branch and role.");
            return;
        }
        const branchId = Number(editBranchId);
        try {
            const res = await assignRoleToBranches({
                roleId: Number(editRoleId),
                branchIds: [branchId],
            }).unwrap();
            closeEditDialog();
            showMessage("success", res.message || "Role assigned to branches successfully.");
            if (detailBranch?.id === branchId) await refreshDetailBranch(branchId);
        } catch (err) {
            showMessage("error", errText(err, "Could not update role assignment."));
        }
    };

    const handleMoreSubmit = async (e: React.FormEvent) => {
        if (!canEdit) return;
        e.preventDefault();
        if (!detailBranch || !moreRoleId) {
            showMessage("error", "Please select a role.");
            return;
        }
        try {
            const res = await assignRoleToBranches({
                roleId: Number(moreRoleId),
                branchIds: [detailBranch.id],
            }).unwrap();
            closeMoreDialog();
            showMessage("success", res.message || "Role assigned to branches successfully.");
            await refreshDetailBranch(detailBranch.id);
        } catch (err) {
            showMessage("error", errText(err, "Could not assign role."));
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!canDelete) return;
        if (!detailBranch || deleteConfirmRoleId == null || deletingRoleId !== null) return;
        const roleId = deleteConfirmRoleId;
        setDeletingRoleId(roleId);
        try {
            const res = await deleteRoleBranchAccess({
                roleId,
                branchId: detailBranch.id,
            }).unwrap();
            setDeleteConfirmRoleId(null);
            showMessage("success", res.message || "Role branch access deleted successfully.");
            await refreshDetailBranch(detailBranch.id);
        } catch (err) {
            showMessage("error", errText(err, "Could not delete role branch access."));
        } finally {
            setDeletingRoleId(null);
        }
    };

    const toggleListSort = (field: string) => {
        if (listSort !== field) {
            setListSort(field);
            setListOrder("asc");
            return;
        }
        if (listOrder === "asc") {
            setListOrder("desc");
            return;
        }
        setListSort(undefined);
        setListOrder(undefined);
    };

    return (
        <AppShell>
            {!canView ? (
                <div className="space-y-8">
                    <div className="flex items-start justify-between">
                        <PageHeading title="Branch Role Master" />
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view branch role master.
                        </div>
                    </ListBorder>
                </div>
            ) : (
                <>
            <MessageDialog
                open={messageDialog.open}
                onClose={dismissMessageDialog}
                message={messageDialog.message}
                icon={messageDialog.variant === "success" ? "/icons/SuccessCheck.svg" : "/icons/ErrorIcon.svg"}
                iconBgColor={messageDialog.variant === "success" ? "#E8F5E9" : "#FFEBEE"}
                showCancel={false}
                confirmText="OK"
                onConfirm={dismissMessageDialog}
            />

            <MessageDialog
                open={deleteConfirmRoleId != null && canDelete}
                onClose={closeDeleteConfirm}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFF8E1"
                message="Are you sure you want to delete the this role!"
                showCancel
                cancelText="Cancel"
                confirmText="Confirm"
                onCancel={closeDeleteConfirm}
                onConfirm={() => void handleDeleteConfirmed()}
                isActionLoading={deletingRoleId !== null && deleteConfirmRoleId !== null}
            />

            {!detailBranch && (
                <div className="space-y-8">
                    <div className="flex items-start justify-between">
                        <PageHeading title="Branch Role Master" />
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-semibold text-[#434956]" />
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <FormSelectField
                                            label=""
                                            hideLabel
                                            options={hookBranchFilterOptions}
                                            value={hookBranchFilter}
                                            placeholder={isLoadingBranchFilter ? "Loading..." : "Select Branch"}
                                            mode="single"
                                            background="normal"
                                            width={300}
                                            emptyMessage={hookBranchFilterOptions.length > 1 ? "No results found" : "No branches loaded"}
                                            onChange={(val) => {
                                                const v = typeof val === "string" ? val : Array.isArray(val) ? val[0] : "";
                                                setHookBranchFilter(v ?? "");
                                            }}
                                            disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                                        />
                                    </div>
                                    <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <TableSearchInput
                                            value={listSearchInput}
                                            placeholder="Search Here..."
                                            onChange={setListSearchInput}
                                            isLoading={listFetching}
                                        />
                                    </div>
                                    {/* <button
                                        type="button"
                                        onClick={openAddDialog}
                                        className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                        <span className="text-hide">Add Branch Role Master</span>
                                    </button> */}
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        <TableHead position="first">Sr no.</TableHead>
                                        <TableHead
                                            // sortable
                                            // sortDirection={listSort === "branchName" ? listOrder ?? null : null}
                                            // onSort={() => toggleListSort("branchName")}
                                        >
                                            Branch Name
                                        </TableHead>
                                        <TableHead>Branch Role</TableHead>
                                        <TableHead>Added By</TableHead>
                                        <TableHead position="last">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {listRows.length === 0 && !listFetching ? (
                                        <TableRow>
                                            <TableData colSpan={5}>
                                                <p className="py-8 text-center text-sm text-[#7B8089]">
                                                    No branch roles found.
                                                </p>
                                            </TableData>
                                        </TableRow>
                                    ) : (
                                        listRows.map((row, idx) => {
                                            const sr = (listPage - 1) * listLimit + idx + 1;
                                            const pills = row.roles.slice(0, VISIBLE_ROLE_PILLS);
                                            const extra = row.roles.length - VISIBLE_ROLE_PILLS;
                                            return (
                                                <TableRow key={row.id}>
                                                    <TableData>{sr}</TableData>
                                                    <TableData>{row.name}</TableData>
                                                    <TableData>
                                                        <div className="flex flex-row flex-wrap gap-1">
                                                            {pills.map((r) => (
                                                                <span
                                                                    key={`${row.id}-${r.id}`}
                                                                    className="rounded-full border border-[rgba(253,199,15,0.32)] bg-[rgba(253,199,15,0.05)] px-5 py-2 text-[12px] font-semibold leading-[120%] text-[#9A7909]"
                                                                >
                                                                    {r.name}
                                                                </span>
                                                            ))}
                                                            {extra > 0 ? (
                                                                <span className="rounded-full border border-[rgba(253,199,15,0.32)] bg-[rgba(253,199,15,0.05)] px-5 py-2 text-[12px] font-semibold leading-[120%] text-[#9A7909] opacity-75">
                                                                    View all +{extra}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </TableData>
                                                    <TableData>{addedByCell(row)}</TableData>
                                                    <TableData>
                                                        <div className="flex items-center gap-3">
                                                            <Tooltip content="View" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                                    aria-label="View"
                                                                    disabled={!canView}
                                                                    onClick={() => setDetailBranch(row)}
                                                                >
                                                                    <Image
                                                                        src="/icons/ViewEyeIcon.svg"
                                                                        alt="View"
                                                                        width={20}
                                                                        height={20}
                                                                    />
                                                                </button>
                                                            </Tooltip>
                                                            <Tooltip content="Edit" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    disabled={!row.roles.length || !canEdit}
                                                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:cursor-not-allowed disabled:opacity-40"
                                                                    aria-label="Edit"
                                                                    onClick={() => openEditFromRow(row)}
                                                                >
                                                                    <Image
                                                                        src="/icons/EditIconBlack.svg"
                                                                        alt="Edit"
                                                                        width={20}
                                                                        height={20}
                                                                    />
                                                                </button>
                                                            </Tooltip>
                                                        </div>
                                                    </TableData>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>

                            <div className="mt-4 border-t border-[#EEF1EF] pt-4">
                                <Pagination
                                    currentPage={listPage}
                                    totalItems={listTotal}
                                    itemsPerPage={listLimit}
                                    onPageChange={setListPage}
                                    onItemsPerPageChange={(n) => {
                                        setListLimit(n);
                                        setListPage(1);
                                    }}
                                    itemsPerPageOptions={[10, 20, 50, 100]}
                                />
                            </div>
                        </div>
                    </ListBorder>
                </div>
            )}

            {detailBranch && (
                <div className="space-y-8">
                    <PageHeading title="Branch Role Master" />
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-semibold text-[#434956]">
                                    Branch Name:- {detailBranchName}
                                </h2>
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <TableSearchInput
                                            value={detailSearchInput}
                                            placeholder="Search Here..."
                                            onChange={setDetailSearchInput}
                                            isLoading={false}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openMoreDialog}
                                        disabled={!canEdit}
                                        className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                        <span className="text-hide">Add More Roles</span>
                                    </button>
                                    <BackToPreviousPageButton
                                        text="Back"
                                        onClick={() => setDetailBranch(null)}
                                        className="shrink-0 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="role-list">
                                {detailPagedRoles.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-[#7B8089]">No roles for this branch.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                                        {detailPagedRoles.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex min-h-[140px] flex-col items-center justify-between gap-4 rounded-[12px] border border-[#DFE0E2] bg-white p-5 shadow-[0px_6px_40px_rgba(0,0,0,0.02)]"
                                            >
                                                <h4 className="line-clamp-2 text-center text-xl font-semibold leading-[130%] text-[#262D3B]">
                                                    {item.name}
                                                </h4>
                                                <button
                                                    type="button"
                                                    disabled={deletingRoleId !== null || !canDelete}
                                                    className="flex cursor-pointer items-center gap-2 rounded-[30px] border border-[rgba(246,119,110,0.24)] bg-[rgba(246,119,110,0.05)] px-5 py-2 text-sm font-medium text-[#F2776E] transition-colors hover:bg-[rgba(246,119,110,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2776E]/25 disabled:cursor-not-allowed disabled:opacity-55"
                                                    aria-label={`Delete ${item.name}`}
                                                    onClick={() => setDeleteConfirmRoleId(item.id)}
                                                >
                                                    {deletingRoleId === item.id ? (
                                                        <RoleCardDeleteSpinner />
                                                    ) : (
                                                        <RoleCardDeleteIcon />
                                                    )}
                                                    Delete
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 border-t border-[#EEF1EF] pt-4">
                                <Pagination
                                    currentPage={detailPage}
                                    totalItems={detailTotal}
                                    itemsPerPage={detailLimit}
                                    onPageChange={setDetailPage}
                                    onItemsPerPageChange={(n) => {
                                        setDetailLimit(n);
                                        setDetailPage(1);
                                    }}
                                    itemsPerPageOptions={[6, 10, 20, 50, 100]}
                                />
                            </div>
                        </div>
                    </ListBorder>
                </div>
            )}

            <Dialog open={addOpen} onClose={closeAddDialog} title="Add Branch Role" width={686}>
                <form className="space-y-6" onSubmit={handleAddSubmit}>
                    <FormSelectField
                        label="Branch *"
                        options={branchOptionsWithNone}
                        value={addBranchId ?? BRANCH_NONE_VALUE}
                        placeholder="Select"
                        mode="single"
                        background="white"
                        emptyMessage={branchOptions.length ? "No results found" : "No branches loaded"}
                        onChange={(val) => {
                            setAddBranchId(parseBranchSelectValue(val));
                            setAddRoleId(null);
                        }}
                    />
                    {addBranchId ? (
                        <FormSelectField
                            label="Role *"
                            options={addRoleOptions}
                            value={addRoleId}
                            placeholder="Select"
                            mode="single"
                            background="white"
                            disabled={addRolesFetching && addRoleOptions.length === 0}
                            emptyMessage={
                                addRolesFetching
                                    ? "Loading roles…"
                                    : addRoleOptions.length
                                      ? "No results found"
                                      : "No assignable roles for this branch."
                            }
                            onChange={(val) => setAddRoleId(typeof val === "string" ? val : null)}
                        />
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary" isLoading={assignLoading}>
                            Add Role
                        </Button>
                        <Button type="button" variant="outline" disabled={assignLoading} onClick={closeAddDialog}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog open={editOpen} onClose={closeEditDialog} title="Edit Branch Role" width={686}>
                <form className="space-y-6" onSubmit={handleEditSubmit}>
                    <FormSelectField
                        label="Branch *"
                        options={branchOptionsWithNone}
                        value={editBranchId ?? BRANCH_NONE_VALUE}
                        placeholder="Select"
                        mode="single"
                        background="white"
                        emptyMessage={branchOptions.length ? "No results found" : "No branches loaded"}
                        onChange={(val) => {
                            setEditBranchId(parseBranchSelectValue(val));
                            setEditRoleId(null);
                            setEditCurrentRoleName(null);
                        }}
                    />
                    {editBranchId ? (
                        <FormSelectField
                            label="Roles *"
                            options={editRoleOptionsWithCurrent}
                            value={editRoleId}
                            placeholder="Select"
                            mode="single"
                            background="white"
                            disabled={editRolesFetching && editRoleOptionsWithCurrent.length === 0}
                            emptyMessage={
                                editRolesFetching
                                    ? "Loading roles…"
                                    : editRoleOptionsWithCurrent.length
                                      ? "No results found"
                                      : "No assignable roles for this branch."
                            }
                            onChange={(val) => setEditRoleId(typeof val === "string" ? val : null)}
                        />
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary" isLoading={assignLoading}>
                            Update Role
                        </Button>
                        <Button type="button" variant="outline" disabled={assignLoading} onClick={closeEditDialog}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog open={moreOpen} onClose={closeMoreDialog} title="Add Roles" width={686}>
                <form className="space-y-6" onSubmit={handleMoreSubmit}>
                    <p className="text-sm text-[#5C6370]">
                        Branch: <span className="font-semibold text-[#262D3B]">{detailBranchName}</span>
                    </p>
                    <FormSelectField
                        label="Role *"
                        options={moreRoleOptions}
                        value={moreRoleId}
                        placeholder="Select"
                        mode="single"
                        background="white"
                        disabled={moreRolesFetching && moreRoleOptions.length === 0}
                        emptyMessage={
                            moreRolesFetching
                                ? "Loading roles…"
                                : moreRoleOptions.length
                                  ? "No results found"
                                  : "No assignable roles remaining for this branch."
                        }
                        onChange={(val) => setMoreRoleId(typeof val === "string" ? val : null)}
                    />

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary" isLoading={assignLoading}>
                            Add Role
                        </Button>
                        <Button type="button" variant="outline" disabled={assignLoading} onClick={closeMoreDialog}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>
                </>
            )}
        </AppShell>
    );
}
