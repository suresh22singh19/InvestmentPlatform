"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { ListBorder } from "@/components/ui/ListBorder";
import {
    Button,
    Dialog,
    ExportButton,
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
    Tabs,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import Image from "next/image";
import { Toggle } from "@/components/ui/Toggle";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useExport, type ExportConfig } from "@/hooks/useExport";
import { usePermission } from "@/hooks/usePermission";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import type {
    BranchAssignableRole,
    GetBranchRoleByCategoryTypeParams,
} from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import {
    useAssignApprovalLevelMutation,
    useGetListOfLevelForAssignQuery,
    useGetAssignApprovalLevelQuery,
    useLazyGetAssignApprovalLevelQuery,
    useGetBranchRoleByCategoryTypeForAssignQuery,
    useGetRoleUsersQuery,
    useUpdateAssignApprovalLevelMutation,
    type AssignApprovalLevelListItem,
    type AssignApprovalLevelRequest,
    type GetAssignApprovalLevelParams,
    type RoleUserItem,
} from "@/store/api/roleAndPermission";

/** GET getApprovalLevelsList — API max limit is 100; default page size for level pickers. */
const APPROVAL_LEVELS_SETUP_PAGE_SIZE = 10;

/** Map GET /branches `type` to getBranchRoleByCategoryType `branchType` (API: hospital | clinic). */
function branchRecordTypeToRoleApiBranchType(apiType: string | undefined): "hospital" | "clinic" {
    const t = (apiType ?? "").toLowerCase().trim();
    if (t === "clinic") return "clinic";
    return "hospital";
}

function errText(e: unknown, fallback: string): string {
    if (e && typeof e === "object" && "data" in e) {
        const d = (e as { data?: { message?: string } }).data;
        if (d?.message && typeof d.message === "string") return d.message;
    }
    return fallback;
}

export default function ApprovalLevelAssignmentPage() {
    const currentUserId = useAppSelector((s) => s.auth.loginData?.user?.id ?? null);

    const modPerm = usePermission("Roles And Permissions");
    const subPerm = usePermission("Roles And Permissions", { subModule: "Approval Level Assignment" });
    const canView = modPerm.canView || subPerm.canView;
    const canAdd = modPerm.canAdd || subPerm.canAdd;
    const canEdit = modPerm.canEdit || subPerm.canEdit;
    const canDownload = modPerm.canDownload || subPerm.canDownload;

    const {
        selectedBranchFilter: branchId,
        setSelectedBranchFilter: setBranchId,
        branchFilterOptions: hookBranchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        filterBranchId: hookFilterBranchId,
    } = useBranchFilter();
    const [filterLevelId, setFilterLevelId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingRow, setEditingRow] = useState<AssignApprovalLevelListItem | null>(null);

    const [formRoleGroup, setFormRoleGroup] = useState<"facility" | "corporate">("facility");
    /** Facility role group: branch for role API + POST branchId. Corporate: not used (toolbar branch for POST). */
    const [formDialogBranchId, setFormDialogBranchId] = useState<string | null>(null);
    const [formUserId, setFormUserId] = useState<string | null>(null);
    const [formRoleId, setFormRoleId] = useState<string | null>(null);
    const [formLevelId, setFormLevelId] = useState<string | null>(null);
    const [formPermissionTab, setFormPermissionTab] = useState("yes");

    const [toggleSavingId, setToggleSavingId] = useState<number | null>(null);

    /** Blocks double-submit before RTK mutation `isLoading` flips; cleared in `finally` or before `closeDialog` on success. */
    const dialogSubmitLockRef = useRef(false);
    const [dialogSubmitPending, setDialogSubmitPending] = useState(false);

    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const debouncedSearch = useDebounce(searchTerm, 400);
    const searchParam = debouncedSearch.trim() || undefined;

    const branchIdNum = hookFilterBranchId ?? NaN;
    const branchValid = Number.isFinite(branchIdNum) && branchIdNum > 0;

    const filterLevelNum = filterLevelId ? parseInt(filterLevelId, 10) : NaN;

    const { data: branchesRes, isLoading: loadingBranches } = useGetBranchesQuery(undefined, {
        skip: !canView,
    });
    const branchOptions: SelectOption[] = useMemo(() => {
        const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
        return rows.map((b) => ({ label: b.name, value: String(b.id) }));
    }, [branchesRes]);


    const {
        data: levelsForAssign,
        isLoading: loadingLevelsForAssign,
        isFetching: fetchingLevelsForAssign,
    } = useGetListOfLevelForAssignQuery(undefined, { skip: !canView });

    const levelOptions: SelectOption[] = useMemo(() => {
        const items = levelsForAssign?.items ?? [];
        return items.map((l) => ({
            label: l.levelCode,
            value: String(l.id),
        }));
    }, [levelsForAssign]);

    const listQueryParams = useMemo((): GetAssignApprovalLevelParams => {
        return {
            ...(branchValid ? { branchId: branchIdNum } : {}),
            page: currentPage,
            limit: itemsPerPage,
            ...(searchParam ? { search: searchParam } : {}),
            ...(Number.isFinite(filterLevelNum) && filterLevelNum > 0
                ? { approvalLevelId: filterLevelNum }
                : {}),
        };
    }, [branchValid, branchIdNum, currentPage, itemsPerPage, searchParam, filterLevelNum]);

    const {
        data: assignmentList,
        isLoading: listLoading,
        isFetching: listFetching,
        isError: listError,
        refetch: refetchAssignments,
    } = useGetAssignApprovalLevelQuery(listQueryParams, { skip: !canView });

    const [triggerExportList] = useLazyGetAssignApprovalLevelQuery();

    const [assignApprovalLevel, { isLoading: isCreating }] = useAssignApprovalLevelMutation();
    const [updateAssignApprovalLevel, { isLoading: isUpdating }] = useUpdateAssignApprovalLevelMutation();

    const branchNameForExport = useMemo(() => {
        const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
        const b = rows.find((x) => x.id === branchIdNum);
        return b?.name ?? null;
    }, [branchesRes, branchIdNum]);

    const exportConfig = useMemo<ExportConfig>(
        () => ({
            title: "Assign Approval Levels",
            fileName: "assign-approval-levels",
            logoUrl: "/images/logo.png",
            branchName: branchNameForExport,
            columns: [
                { key: "sr", label: "Sr no." },
                { key: "userName", label: "User" },
                { key: "roleName", label: "Role" },
                {
                    key: "approvalPermission",
                    label: "Approval Permission",
                    getValue: (row: { approvalPermission?: string }) => row.approvalPermission ?? "",
                },
                {
                    key: "assignedLevel",
                    label: "Assigned Level",
                    getValue: (row: { assignedLevel?: string }) => row.assignedLevel ?? "",
                },
            ],
            fetchData: async () => {
                if (!canView) return [];
                const res = await triggerExportList({
                    ...(branchValid ? { branchId: branchIdNum } : {}),
                    page: 1,
                    limit: 10_000,
                    ...(searchParam ? { search: searchParam } : {}),
                    ...(Number.isFinite(filterLevelNum) && filterLevelNum > 0
                        ? { approvalLevelId: filterLevelNum }
                        : {}),
                }).unwrap();
                return res.items.map((row) => ({
                    userName: row.userName || "—",
                    roleName: row.roleName || "—",
                    approvalPermission: row.isActive ? "Yes" : "No",
                    assignedLevel: row.levelName
                        ? `${row.levelName} (${row.levelCode})`
                        : row.levelCode || "—",
                }));
            },
        }),
        [canView, branchValid, branchIdNum, searchParam, filterLevelNum, triggerExportList, branchNameForExport]
    );

    const { handleExportPDF, isLoadingPDF } = useExport(exportConfig);

    const onExportPdfClick = useCallback(() => {
        if (!canDownload) return;
        void handleExportPDF();
    }, [canDownload, handleExportPDF]);

    const branchRowsForDialog = useMemo(() => {
        const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
        return rows;
    }, [branchesRes]);

    const assignDialogRolesArgs = useMemo((): GetBranchRoleByCategoryTypeParams => {
        if (formRoleGroup === "corporate") {
            return { roleCategoryType: "corporate" };
        }
        if (!formDialogBranchId) {
            return { roleCategoryType: "facility" };
        }
        const n = Number.parseInt(formDialogBranchId, 10);
        if (!Number.isFinite(n)) {
            return { roleCategoryType: "facility" };
        }
        const branchRow = branchRowsForDialog.find((b) => b.id === n);
        const branchType = branchRecordTypeToRoleApiBranchType(branchRow?.type);
        return { roleCategoryType: "facility", branchId: n, branchType };
    }, [formRoleGroup, formDialogBranchId, branchRowsForDialog]);

    const shouldSkipAssignableRolesQuery =
        !isDialogOpen ||
        !canView ||
        (formRoleGroup === "facility" && !("branchId" in assignDialogRolesArgs));

    const { data: assignableRolesRes, isFetching: loadingRoles } = useGetBranchRoleByCategoryTypeForAssignQuery(
        assignDialogRolesArgs,
        {
            skip: shouldSkipAssignableRolesQuery,
            refetchOnMountOrArgChange: true,
        }
    );

    const roleOptions: SelectOption[] = useMemo(() => {
        const rows = Array.isArray(assignableRolesRes?.data) ? assignableRolesRes.data : [];
        return rows
            .filter((r: BranchAssignableRole) => r.isActive !== false)
            .map((r: BranchAssignableRole) => ({ label: r.name, value: String(r.id) }));
    }, [assignableRolesRes]);

    const roleIdNum = formRoleId ? parseInt(formRoleId, 10) : NaN;
    const roleValid = Number.isFinite(roleIdNum) && roleIdNum > 0;

    const { data: roleUsers = [], isFetching: loadingUsers } = useGetRoleUsersQuery(
        { roleId: roleIdNum },
        { skip: !isDialogOpen || !canView || !roleValid }
    );

    const userOptions: SelectOption[] = useMemo(() => {
        return roleUsers.map((u: RoleUserItem) => ({
            value: String(u.id),
            label: u.userName || u.email || `User #${u.id}`,
        }));
    }, [roleUsers]);

    /** Inline hints when prerequisites are met but the API returned no options (same style as validation under fields). */
    const showNoRolesHint = useMemo(() => {
        if (!isDialogOpen || isEditMode) return false;
        if (formRoleGroup === "facility" && !formDialogBranchId) return false;
        if (shouldSkipAssignableRolesQuery) return false;
        if (loadingRoles) return false;
        return roleOptions.length === 0;
    }, [
        isDialogOpen,
        isEditMode,
        formRoleGroup,
        formDialogBranchId,
        shouldSkipAssignableRolesQuery,
        loadingRoles,
        roleOptions.length,
    ]);

    const showNoUsersHint = useMemo(() => {
        if (!isDialogOpen || isEditMode) return false;
        if (!formRoleId) return false;
        if (loadingUsers) return false;
        return userOptions.length === 0;
    }, [isDialogOpen, isEditMode, formRoleId, loadingUsers, userOptions.length]);

    const showNoLevelsHint = useMemo(() => {
        if (!isDialogOpen) return false;
        if (!formUserId) return false;
        if (loadingLevelsForAssign || fetchingLevelsForAssign) return false;
        return levelOptions.length === 0;
    }, [
        isDialogOpen,
        formUserId,
        loadingLevelsForAssign,
        fetchingLevelsForAssign,
        levelOptions.length,
    ]);

    const isFormSubmitting = isCreating || isUpdating || dialogSubmitPending;
    const listMutationBusy = toggleSavingId !== null;
    const anyListBusy = isFormSubmitting || listMutationBusy;

    const items = assignmentList?.items ?? [];
    const totalItems = assignmentList?.total ?? 0;

    const roleGroupTabOptions = useMemo(
        () => [
            { value: "facility", label: "Facility" },
            { value: "corporate", label: "Corporate" },
        ],
        []
    );

    const permissionTabOptions = useMemo(
        () => [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
        ],
        []
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [branchId, debouncedSearch, filterLevelId]);

    const openMessageSuccess = useCallback((msg: string) => {
        setSuccessMessage(msg);
        setShowSuccessDialog(true);
    }, []);

    const openMessageError = useCallback((msg: string) => {
        setErrorMessage(msg);
        setShowErrorDialog(true);
    }, []);

    const resetForm = useCallback(() => {
        setFormRoleGroup("facility");
        setFormDialogBranchId(null);
        setFormUserId(null);
        setFormRoleId(null);
        setFormLevelId(null);
        setFormPermissionTab("yes");
    }, []);

    /** User dismiss only; do not gate on `dialogSubmitPending` (stale on success before `finally`). Backdrop/Cancel use `isFormSubmitting`. */
    const closeDialog = useCallback(() => {
        if (isCreating || isUpdating) return;
        setIsDialogOpen(false);
        setIsEditMode(false);
        setEditingRow(null);
        resetForm();
    }, [isCreating, isUpdating, resetForm]);

    const openAdd = useCallback(() => {
        if (!canAdd) return;
        resetForm();
        setIsEditMode(false);
        setEditingRow(null);
        setFormDialogBranchId(branchId || null);
        setIsDialogOpen(true);
    }, [canAdd, branchId, resetForm]);

    const openEdit = useCallback(
        (row: AssignApprovalLevelListItem) => {
            if (!canEdit || anyListBusy) return;
            setIsEditMode(true);
            setEditingRow(row);
            const rc = row.roleCategoryType?.toLowerCase();
            const isCorporate = rc === "corporate" || (!row.branchId && !row.branchName);
            setFormRoleGroup(isCorporate ? "corporate" : "facility");
            setFormDialogBranchId(isCorporate ? null : String(row.branchId));
            setFormUserId(String(row.userId));
            setFormRoleId(String(row.roleId));
            setFormLevelId(String(row.approvalLevelId));
            setFormPermissionTab(row.isActive ? "yes" : "no");
            setIsDialogOpen(true);
        },
        [canEdit, anyListBusy]
    );

    const buildRequestBody = useCallback(
        (overrides?: Partial<AssignApprovalLevelRequest>): AssignApprovalLevelRequest | null => {
            if (currentUserId == null) return null;
            const userId = formUserId ? parseInt(formUserId, 10) : NaN;
            const roleId = formRoleId ? parseInt(formRoleId, 10) : NaN;
            const approvalLevelId = formLevelId ? parseInt(formLevelId, 10) : NaN;
            const isActive = formPermissionTab === "yes";
            const dialogBranchNum = formDialogBranchId ? parseInt(formDialogBranchId, 10) : NaN;
            const effectiveBranchId =
                formRoleGroup === "facility" ? dialogBranchNum : (branchValid ? branchIdNum : 0);
            return {
                userId: Number.isFinite(userId) ? userId : 0,
                roleId: Number.isFinite(roleId) ? roleId : 0,
                branchId: Number.isFinite(effectiveBranchId) ? effectiveBranchId : 0,
                approvalLevelId: Number.isFinite(approvalLevelId) ? approvalLevelId : 0,
                isActive,
                createdBy: isEditMode ? null : currentUserId,
                updatedBy: isEditMode ? currentUserId : null,
                ...overrides,
            };
        },
        [
            branchIdNum,
            currentUserId,
            formUserId,
            formRoleId,
            formLevelId,
            formPermissionTab,
            isEditMode,
            formRoleGroup,
            formDialogBranchId,
        ]
    );

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (dialogSubmitLockRef.current || isCreating || isUpdating) return;
        if (currentUserId == null) return;
        if ((isEditMode && !canEdit) || (!isEditMode && !canAdd)) return;

        if (formRoleGroup === "facility" && !formDialogBranchId) {
            openMessageError("Please select a branch.");
            return;
        }
        if (!formRoleId) {
            openMessageError("Please select a role.");
            return;
        }
        if (!formUserId) {
            openMessageError("Please select a user.");
            return;
        }
        if (!formLevelId) {
            openMessageError("Please select an approval level.");
            return;
        }

        const body = buildRequestBody();
        if (
            !body ||
            body.userId <= 0 ||
            body.roleId <= 0 ||
            body.approvalLevelId <= 0 ||
            (formRoleGroup === "facility" && body.branchId <= 0)
        ) {
            openMessageError("Invalid form data.");
            return;
        }

        dialogSubmitLockRef.current = true;
        setDialogSubmitPending(true);
        try {
            if (isEditMode && editingRow) {
                const res = await updateAssignApprovalLevel({
                    id: editingRow.id,
                    approvalLevelId: body.approvalLevelId,
                    isActive: body.isActive,
                }).unwrap();
                if (res.success !== false) {
                    openMessageSuccess(res.message || "Assignment updated successfully.");
                    closeDialog();
                    void refetchAssignments();
                } else {
                    openMessageError(res.message || "Update failed.");
                }
            } else {
                const res = await assignApprovalLevel({
                    ...body,
                    createdBy: currentUserId,
                    updatedBy: null,
                }).unwrap();
                if (res.success !== false) {
                    openMessageSuccess(res.message || "Assignment created successfully.");
                    closeDialog();
                    void refetchAssignments();
                } else {
                    openMessageError(res.message || "Could not create assignment.");
                }
            }
        } catch (err: unknown) {
            openMessageError(
                errText(
                    err,
                    "Request failed. If update is not supported, confirm PATCH updateAssignApprovalLevel with the backend."
                )
            );
        } finally {
            dialogSubmitLockRef.current = false;
            setDialogSubmitPending(false);
        }
    };

    const handleToggle = async (row: AssignApprovalLevelListItem, next: boolean) => {
        if (!canEdit || toggleSavingId !== null || isFormSubmitting || currentUserId == null)
            return;
        setToggleSavingId(row.id);
        try {
            const res = await updateAssignApprovalLevel({
                id: row.id,
                approvalLevelId: row.approvalLevelId,
                isActive: next,
            }).unwrap();
            if (res.success !== false) {
                openMessageSuccess(res.message || "Updated.");
                void refetchAssignments();
            } else {
                openMessageError(res.message || "Could not update.");
            }
        } catch (err: unknown) {
            openMessageError(errText(err, "Could not update assignment."));
        } finally {
            setToggleSavingId(null);
        }
    };

    const handlePageChange = (page: number) => setCurrentPage(page);
    const handleItemsPerPageChange = (n: number) => {
        setItemsPerPage(n);
        setCurrentPage(1);
    };

    const showListLoader = !listError && listLoading;
    const filterLevelsLoading = loadingLevelsForAssign || fetchingLevelsForAssign;

    const dialogMayOpen = (isEditMode && canEdit) || (!isEditMode && canAdd);

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Assign Approval Levels" />
                </div>
                <ListBorder as="section" className="px-4 py-4">
                    {!canView ? (
                        <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view assign approval levels.
                        </div>
                    ) : (
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-[#434956]" />

                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <FormSelectField
                                        label=""
                                        options={hookBranchFilterOptions}
                                        value={branchId}
                                        placeholder={isLoadingBranchFilter ? "Loading…" : "Filter by branch"}
                                        mode="single"
                                        background="normal"
                                        width={300}
                                        disabled={isBranchFilterDisabled || isLoadingBranchFilter || anyListBusy || isFormSubmitting}
                                        onChange={(val) => {
                                            const v = Array.isArray(val) ? val[0] : val;
                                            setBranchId(v || "");
                                            setFilterLevelId(null);
                                        }}
                                    />
                                </div>
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <FormSelectField
                                        label=""
                                        options={levelOptions}
                                        value={filterLevelId}
                                        placeholder={filterLevelsLoading ? "Loading levels…" : "Select Level"}
                                        mode="single"
                                        background="normal"
                                        width={300}
                                        disabled={filterLevelsLoading || anyListBusy || isFormSubmitting}
                                        onChange={(val) => {
                                            const v = Array.isArray(val) ? val[0] : val;
                                            setFilterLevelId(v || null);
                                        }}
                                    />
                                </div>
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        placeholder="Search Here..."
                                        isLoading={listFetching && !listLoading}
                                    />
                                </div>
                                {canDownload ? (
                                    <></>
                                    // <ExportButton
                                    //     onExportPDF={onExportPdfClick}
                                    //     isLoadingPDF={isLoadingPDF}
                                    // />
                                ) : null}
                                {canAdd ? (
                                <button
                                    type="button"
                                    className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={openAdd}
                                    disabled={anyListBusy || isFormSubmitting || currentUserId == null}
                                >
                                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                    <span className="text-hide">Add Assign Approval Levels</span>
                                </button>
                                ) : null}
                            </div>
                        </div>

                        {listError ? (
                            <div className="py-12 text-center text-sm text-[#F87171]">
                                Could not load assignments. Check getAssignApprovalLevel (optional branchId filter,
                                search, page, limit).
                            </div>
                        ) : showListLoader ? (
                            <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading…</div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-white">
                                            <TableHead position="first">Sr no.</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Approval Permission</TableHead>
                                            <TableHead>Assigned Level</TableHead>
                                            <TableHead position="last">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableData
                                                    colSpan={6}
                                                    className="py-12 text-center text-sm text-[#9CA3AF]"
                                                >
                                                    No assignments found
                                                </TableData>
                                            </TableRow>
                                        ) : (
                                            items.map((row, index) => (
                                                <TableRow
                                                    key={row.id}
                                                    className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                                >
                                                    <TableData variant="primary">
                                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                                    </TableData>
                                                    <TableData>{row.userName || "—"}</TableData>
                                                    <TableData>{row.roleName || "—"}</TableData>
                                                    <TableData>
                                                        <Toggle
                                                            checked={row.isActive}
                                                            // onChange={(checked) => void handleToggle(row, checked)}
                                                            onChange={() => { console.log("onChange"); }}
                                                            label=""
                                                            disabled={
                                                                !canEdit ||
                                                                anyListBusy ||
                                                                isFormSubmitting ||
                                                                toggleSavingId === row.id ||
                                                                currentUserId == null
                                                            }
                                                        />
                                                    </TableData>
                                                    <TableData>
                                                        {row.levelName
                                                            ? `${row.levelName} (${row.levelCode})`
                                                            : row.levelCode || "—"}
                                                    </TableData>
                                                    <TableData>
                                                        <div className="flex items-center gap-3">
                                                            {canEdit ? (
                                                            <Tooltip content="Edit" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:cursor-not-allowed disabled:opacity-50"
                                                                    aria-label="Edit"
                                                                    disabled={anyListBusy || isFormSubmitting}
                                                                    onClick={() => openEdit(row)}
                                                                >
                                                                    <Image
                                                                        src="/icons/EditIconBlack.svg"
                                                                        alt="Edit"
                                                                        width={20}
                                                                        height={20}
                                                                    />
                                                                </button>
                                                            </Tooltip>
                                                            ) : (
                                                                <span className="text-xs text-[#9CA3AF]">—</span>
                                                            )}
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
                                        itemsPerPageOptions={[10, 20, 50, 100]}
                                    />
                                )}
                            </>
                        )}
                    </div>
                    )}
                </ListBorder>
            </div>

            <Dialog
                open={isDialogOpen && dialogMayOpen}
                onClose={() => {
                    if (!isFormSubmitting) closeDialog();
                }}
                title={isEditMode ? "Edit Assign Approval Levels" : "Add Assign Approval Levels"}
                width={686}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <label className="mb-2 block text-[12px] font-normal not-italic leading-[120%] text-[#525763]">
                        Select Role Group
                    </label>
                    <div className="mb-2 w-[450px]">
                        <Tabs
                            options={roleGroupTabOptions}
                            value={formRoleGroup}
                            disabled={isFormSubmitting || isEditMode}
                            onChange={(v) => {
                                const next = v === "corporate" ? "corporate" : "facility";
                                setFormRoleGroup(next);
                                setFormDialogBranchId(next === "corporate" ? null : branchId || null);
                                setFormRoleId(null);
                                setFormUserId(null);
                                setFormLevelId(null);
                            }}
                        />
                    </div>

                    {formRoleGroup === "facility" ? (
                        <FormSelectField
                            label="Branch *"
                            value={formDialogBranchId}
                            options={branchOptions}
                            placeholder={loadingBranches ? "Loading…" : "Select branch"}
                            mode="single"
                            background="white"
                            disabled={isFormSubmitting || isEditMode || loadingBranches}
                            onChange={(val) => {
                                const v = Array.isArray(val) ? val[0] : val;
                                setFormDialogBranchId(v || null);
                                setFormRoleId(null);
                                setFormUserId(null);
                                setFormLevelId(null);
                            }}
                        />
                    ) : null}

                    <FormSelectField
                        label="Role *"
                        value={formRoleId}
                        options={roleOptions}
                        placeholder={
                            formRoleGroup === "facility" && !formDialogBranchId
                                ? "Select a branch first"
                                : loadingRoles
                                  ? "Loading roles…"
                                  : "Select Role"
                        }
                        mode="single"
                        background="white"
                        disabled={
                            isFormSubmitting ||
                            isEditMode ||
                            loadingRoles ||
                            (formRoleGroup === "facility" && !formDialogBranchId)
                        }
                        error={
                            showNoRolesHint
                                ? formRoleGroup === "corporate"
                                    ? "No roles are available for Corporate."
                                    : "No roles are available for this branch."
                                : undefined
                        }
                        onChange={(val) => {
                            const v = Array.isArray(val) ? val[0] : val;
                            setFormRoleId(v || null);
                            setFormUserId(null);
                            setFormLevelId(null);
                        }}
                    />

                    <FormSelectField
                        label="User *"
                        value={formUserId}
                        options={userOptions}
                        placeholder={
                            !formRoleId
                                ? "Select a role first"
                                : loadingUsers
                                  ? "Loading users…"
                                  : "Select User"
                        }
                        mode="single"
                        background="white"
                        disabled={
                            isFormSubmitting ||
                            isEditMode ||
                            !formRoleId ||
                            loadingUsers
                        }
                        error={
                            showNoUsersHint
                                ? "No users are available for this role."
                                : undefined
                        }
                        onChange={(val) => {
                            const v = Array.isArray(val) ? val[0] : val;
                            setFormUserId(v || null);
                            setFormLevelId(null);
                        }}
                    />

                    <FormSelectField
                        label="Assign Level *"
                        value={formLevelId}
                        options={levelOptions}
                        placeholder={
                            !formUserId
                                ? "Select a user first"
                                : loadingLevelsForAssign
                                  ? "Loading levels…"
                                  : "Assign Level"
                        }
                        mode="single"
                        background="white"
                        disabled={isFormSubmitting || loadingLevelsForAssign || !formUserId}
                        error={
                            showNoLevelsHint
                                ? "No approval levels are available for this facility."
                                : undefined
                        }
                        onChange={(val) => {
                            const v = Array.isArray(val) ? val[0] : val;
                            setFormLevelId(v || null);
                        }}
                    />

                    <label
                        htmlFor="assign-permission"
                        className="mb-2 block text-[12px] font-normal not-italic leading-[120%] text-[#525763]"
                    >
                        Approval Permission
                    </label>
                    <div className="mb-6 w-[450px]">
                        <Tabs
                            options={permissionTabOptions}
                            value={formPermissionTab}
                            disabled={isFormSubmitting || !formLevelId}
                            onChange={(v) => setFormPermissionTab(v === "no" ? "no" : "yes")}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isFormSubmitting}
                            disabled={
                                isFormSubmitting ||
                                currentUserId == null ||
                                (isEditMode && !canEdit) ||
                                (!isEditMode && !canAdd)
                            }
                        >
                            {isEditMode ? "Update Assign Approval Levels" : "Add Assign Approval Levels"}
                        </Button>
                        <Button type="button" variant="outline" disabled={isFormSubmitting} onClick={closeDialog}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                message={successMessage}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                onConfirm={() => setShowSuccessDialog(false)}
                confirmText="OK"
                showCancel={false}
            />

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
