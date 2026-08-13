"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { ListBorder } from "@/components/ui/ListBorder";
import {
    Button,
    Dialog,
    FormInputField,
    FormSelectField,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    SpinnerLoader,
    TableHead,
    TableData,
    TableSearchInput,
    Pagination,
    MessageDialog,
    Tooltip,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import {
    useCreateApprovalLevelSetupMutation,
    useGetApprovalLevelSetupListQuery,
    useUpdateApprovalLevelSetupMutation,
} from "@/store/api/roleAndPermission";
import type { ApprovalLevelSetupItem, CreateApprovalLevelSetupRequest } from "@/store/api/roleAndPermission";
import {
    sanitizeLevelCodeInput,
    sanitizeMaxAmountDigitsInput,
    sanitizeMaxVariancePercentInput,
    sanitizePatientNameInput,
} from "@/lib/utils/common";

/** Static module values sent as `modules: string[]` in create/update APIs (must match backend). */
const APPROVAL_MODULE_OPTIONS: SelectOption[] = [
    { label: "Reception", value: "Reception" },
    { label: "IPD", value: "Ipd" },
    { label: "OPD", value: "Opd" },
];

const moduleSlugLabel = (slug: string) =>
    APPROVAL_MODULE_OPTIONS.find((o) => o.value === slug)?.label ??
    slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function formatInr(amount: number | null): string {
    if (amount == null) return "Unlimited";
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `₹${amount}`;
    }
}

function formatVariance(p: number | null): string {
    if (p == null) return "Unlimited";
    return `${p}%`;
}

function parseOptionalPercent(raw: string): number | undefined {
    const t = raw.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
}

function parseOptionalAmount(raw: string): number | undefined {
    const t = raw.replace(/\D/g, "").trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
}

function buildPayload(
    levelName: string,
    levelCode: string,
    modules: string[],
    maxVar: number | undefined,
    maxAmt: number | undefined
): CreateApprovalLevelSetupRequest {
    const body: CreateApprovalLevelSetupRequest = {
        levelName: levelName.trim(),
        levelCode: levelCode.trim(),
        modules,
    };
    if (maxVar !== undefined) body.maxVariance = maxVar;
    if (maxAmt !== undefined) body.maxAmount = maxAmt;
    return body;
}

export default function ApprovalLeaveSetupPage() {
    const modulePermission = usePermission("Roles And Permissions");
    const subModulePermission = usePermission("Roles And Permissions", { subModule: "Approval Level Setup" });
    const canView = modulePermission.canView || subModulePermission.canView;
    const canAdd = modulePermission.canAdd || subModulePermission.canAdd;
    const canEdit = modulePermission.canEdit || subModulePermission.canEdit;

    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortField, setSortField] = useState<string>("levelName");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formLevelName, setFormLevelName] = useState("");
    const [formLevelCode, setFormLevelCode] = useState("");
    const [formMaxVariance, setFormMaxVariance] = useState("");
    const [formMaxAmount, setFormMaxAmount] = useState("");
    const [formModules, setFormModules] = useState<string[]>([]);
    const [levelNameError, setLevelNameError] = useState("");
    const [levelCodeError, setLevelCodeError] = useState("");
    const [modulesError, setModulesError] = useState("");

    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const debouncedSearch = useDebounce(searchTerm, 500);
    const searchParam = debouncedSearch.trim() || undefined;

    const {
        data: listResult,
        isLoading: listLoading,
        isFetching: listFetching,
        isError: listError,
        refetch,
    } = useGetApprovalLevelSetupListQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: searchParam,
        sort: sortField,
        order: sortOrder,
    }, { skip: !canView });

    const [createLevel, { isLoading: isCreating }] = useCreateApprovalLevelSetupMutation();
    const [updateLevel, { isLoading: isUpdating }] = useUpdateApprovalLevelSetupMutation();

    const isSubmitting = isCreating || isUpdating;
    const showListLoader = !listError && listLoading;

    const levels: ApprovalLevelSetupItem[] = listResult?.levels ?? [];
    const totalItems = useMemo(() => {
        const t = listResult?.total;
        if (typeof t === "number" && t > 0) return t;
        return levels.length;
    }, [listResult?.total, levels.length]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    const openMessageError = (msg: string) => {
        setErrorMessage(msg);
        setShowErrorDialog(true);
    };

    const openMessageSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setShowSuccessDialog(true);
    };

    const resetForm = () => {
        setFormLevelName("");
        setFormLevelCode("");
        setFormMaxVariance("");
        setFormMaxAmount("");
        setFormModules([]);
        setLevelNameError("");
        setLevelCodeError("");
        setModulesError("");
    };

    const closeDialog = () => {
        if (isSubmitting) return;
        setIsDialogOpen(false);
        setIsEditMode(false);
        setEditingId(null);
        resetForm();
    };

    const handleAddClick = () => {
        if (!canAdd) return;
        setIsEditMode(false);
        setEditingId(null);
        resetForm();
        setIsDialogOpen(true);
    };

    const handleEdit = (row: ApprovalLevelSetupItem) => {
        if (!canEdit) return;
        if (isSubmitting) return;
        setIsEditMode(true);
        setEditingId(row.id);
        setFormLevelName(row.levelName);
        setFormLevelCode(row.levelCode);
        setFormMaxVariance(row.maxVariance != null ? String(row.maxVariance) : "");
        setFormMaxAmount(row.maxAmount != null ? String(row.maxAmount) : "");
        setFormModules([...row.modules]);
        setLevelNameError("");
        setLevelCodeError("");
        setModulesError("");
        setIsDialogOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((isEditMode && !canEdit) || (!isEditMode && !canAdd)) return;

        setLevelNameError("");
        setLevelCodeError("");
        setModulesError("");
        let bad = false;
        if (!formLevelName.trim()) {
            setLevelNameError("Level name is required");
            bad = true;
        }
        if (!formLevelCode.trim()) {
            setLevelCodeError("Level code is required");
            bad = true;
        }
        if (!formModules.length) {
            setModulesError("Select at least one module");
            bad = true;
        }
        if (bad) return;

        const maxVar = parseOptionalPercent(formMaxVariance);
        const maxAmt = parseOptionalAmount(formMaxAmount);
        const body = buildPayload(formLevelName, formLevelCode, formModules, maxVar, maxAmt);

        try {
            if (isEditMode && editingId != null) {
                const res = await updateLevel({ id: editingId, body }).unwrap();
                if (res.success !== false) {
                    openMessageSuccess(res.message || "Approval level updated successfully.");
                    closeDialog();
                    refetch();
                }
            } else {
                const res = await createLevel(body).unwrap();
                if (res.success !== false) {
                    openMessageSuccess(res.message || "Approval level created successfully.");
                    closeDialog();
                    refetch();
                }
            }
        } catch (err: unknown) {
            const e = err as { data?: { message?: string }; message?: string };
            openMessageError(e?.data?.message || e?.message || "Request failed. Please try again.");
        }
    };

    const getApiSortField = (key: string) => {
        const map: Record<string, string> = {
            levelName: "levelName",
            levelCode: "levelCode",
        };
        return map[key] || key;
    };

    const handleSort = (columnKey: string) => {
        const apiField = getApiSortField(columnKey);
        if (sortField === apiField) {
            setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        } else {
            setSortField(apiField);
            setSortOrder("asc");
        }
        setCurrentPage(1);
    };

    const getSortDirection = (columnKey: string): "asc" | "desc" | null => {
        const apiField = getApiSortField(columnKey);
        return sortField === apiField ? sortOrder : null;
    };

    const displayModules = (row: ApprovalLevelSetupItem) => row.modules.map(moduleSlugLabel).join(", ");

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (n: number) => {
        setItemsPerPage(n);
        setCurrentPage(1);
    };

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Approval Level Setup" />
                </div>
                <ListBorder as="section" className="px-4 py-4">
                    {!canView ? (
                        <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view approval level setup.
                        </div>
                    ) : (
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-semibold text-[#434956]" />

                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <TableSearchInput
                                            value={searchTerm}
                                            onChange={setSearchTerm}
                                            placeholder="Search Here..."
                                            isLoading={listFetching}
                                        />
                                    </div>
                                    {canAdd ? (
                                        <button
                                            type="button"
                                            className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] disabled:cursor-not-allowed disabled:opacity-60"
                                            onClick={handleAddClick}
                                            disabled={isSubmitting}
                                        >
                                            <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                            <span className="text-hide">Add Approval Level Setup</span>
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {listError ? (
                                <div className="py-12 text-center text-sm text-[#F87171]">
                                    Could not load approval levels. Check getApprovalLevelsList and your session.
                                </div>
                            ) : showListLoader ? (
                                <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading…</div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-white">
                                                <TableHead position="first">Sr no.</TableHead>
                                                <TableHead
                                                // sortable
                                                // sortDirection={getSortDirection("levelName")}
                                                // onSort={() => handleSort("levelName")}
                                                >
                                                    Level Name
                                                </TableHead>
                                                <TableHead
                                                // sortable
                                                // sortDirection={getSortDirection("levelCode")}
                                                // onSort={() => handleSort("levelCode")}
                                                >
                                                    Level Code
                                                </TableHead>
                                                <TableHead>Max % Variance</TableHead>
                                                <TableHead>Max Amount</TableHead>
                                                <TableHead>Modules</TableHead>
                                                <TableHead position="last">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {levels.length === 0 ? (
                                                <TableRow>
                                                    <TableData
                                                        colSpan={7}
                                                        className="py-12 text-center text-sm text-[#9CA3AF]"
                                                    >
                                                        No approval levels found
                                                    </TableData>
                                                </TableRow>
                                            ) : (
                                                levels.map((row, index) => (
                                                    <TableRow
                                                        key={row.id}
                                                        className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                                    >
                                                        <TableData variant="primary">
                                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                                        </TableData>
                                                        <TableData className="min-w-0 max-w-[320px]">
                                                            <Tooltip content={row.levelName || "—"} position="top">
                                                                <span className="inline-block max-w-[320px] truncate align-middle font-medium text-[#262D3B]">
                                                                    {row.levelName || "—"}
                                                                </span>
                                                            </Tooltip>
                                                        </TableData>
                                                        <TableData>{row.levelCode}</TableData>
                                                        <TableData>{formatVariance(row.maxVariance)}</TableData>
                                                        <TableData>{formatInr(row.maxAmount)}</TableData>
                                                        <TableData>{displayModules(row)}</TableData>
                                                        <TableData>
                                                            <div className="flex items-center gap-3">
                                                                {canEdit ? (
                                                                    <Tooltip content="Edit" position="top" delay={0}>
                                                                        <button
                                                                            type="button"
                                                                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:cursor-not-allowed disabled:opacity-50"
                                                                            aria-label="Edit"
                                                                            disabled={isSubmitting}
                                                                            onClick={() => handleEdit(row)}
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

                                    {totalItems > 0 ? (
                                        <Pagination
                                            currentPage={currentPage}
                                            totalItems={totalItems}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={handlePageChange}
                                            onItemsPerPageChange={handleItemsPerPageChange}
                                            itemsPerPageOptions={[10, 20, 50, 100]}
                                        />
                                    ) : null}
                                </>
                            )}
                        </div>
                    )}
                </ListBorder>
            </div>

            {canView ? (
                <>
                    <Dialog
                        open={isDialogOpen && ((isEditMode && canEdit) || (!isEditMode && canAdd))}
                        onClose={() => {
                            if (!isSubmitting) closeDialog();
                        }}
                        title={isEditMode ? "Edit Approval Level Setup" : "Add Approval Level Setup"}
                        width={686}
                        closeOnOutsideClick={false}
                    >
                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            <FormInputField
                                label="Level Name *"
                                value={formLevelName}
                                placeholder="Level Name"
                                type="text"
                                disabled={isSubmitting}
                                maxLength={100}
                                onChange={(e) => setFormLevelName(sanitizePatientNameInput(e.target.value))}
                                onBlur={(e) => {
                                    const trimmed = e.target.value.trim();
                                    if (trimmed !== e.target.value) setFormLevelName(trimmed);
                                }}
                                error={levelNameError}
                            />
                            <FormInputField
                                label="Level Code *"
                                value={formLevelCode}
                                placeholder="Level Code"
                                type="text"
                                disabled={isSubmitting}
                                maxLength={15}
                                onChange={(e) => setFormLevelCode(sanitizeLevelCodeInput(e.target.value))}
                                onBlur={(e) => {
                                    const trimmed = e.target.value.trim();
                                    if (trimmed !== e.target.value) setFormLevelCode(trimmed);
                                }}
                                error={levelCodeError}
                            />
                            <div className="scroll-mt-4">
                                <div className="relative w-full">
                                    <FormInputField
                                        label="Max % Variance"
                                        placeholder="Unlimited if empty (0–100)"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={3}
                                        autoComplete="off"
                                        className="pr-10"
                                        value={formMaxVariance}
                                        disabled={isSubmitting}
                                        onChange={(e) => setFormMaxVariance(sanitizeMaxVariancePercentInput(e.target.value))}
                                    />
                                    <span
                                        className="pointer-events-none absolute right-6 top-[0px] flex h-[44px] items-center font-inter text-[12px] font-normal not-italic leading-[120%] text-[#525763]"
                                    >
                                        %
                                    </span>
                                </div>
                            </div>
                            <div className="scroll-mt-4">
                                <div className="relative w-full">
                                    <FormInputField
                                        label="Max Amount"
                                        placeholder="Unlimited if empty"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={10}
                                        autoComplete="off"
                                        className="pr-10"
                                        value={formMaxAmount}
                                        disabled={isSubmitting}
                                        onChange={(e) => setFormMaxAmount(sanitizeMaxAmountDigitsInput(e.target.value))}
                                    />
                                    <span
                                        className="pointer-events-none absolute right-6 top-[0px] flex h-[44px] items-center font-inter text-[12px] font-normal not-italic leading-[120%] text-[#525763]"
                                    >
                                        ₹
                                    </span>
                                </div>
                            </div>
                            <div>
                                <FormSelectField
                                    label="Modules *"
                                    value={formModules}
                                    options={APPROVAL_MODULE_OPTIONS}
                                    placeholder="Select Modules"
                                    mode="multiple"
                                    background="white"
                                    disabled={isSubmitting}
                                    onChange={(val) => {
                                        const v = Array.isArray(val) ? val : val ? [val] : [];
                                        setFormModules(v);
                                        if (v.length && modulesError) setModulesError("");
                                    }}
                                />
                                {modulesError ? <span className="mt-2 block text-xs text-[#F87171]">{modulesError}</span> : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                                    {isEditMode ? "Update" : "Submit"}
                                </Button>
                                <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
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
                </>
            ) : null}
        </AppShell>
    );
}
