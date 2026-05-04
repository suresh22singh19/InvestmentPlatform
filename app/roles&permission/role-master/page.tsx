"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FocusEvent,
    type ReactNode,
} from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    Dialog,
    FormInputField,
    FormSelectField,
    FormTextareaField,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableData,
    TableSearchInput,
    MessageDialog,
    Pagination,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import Image from "next/image";
import { BackToPreviousPageButton } from "@/components/ui";
import type {
    ModuleListItem,
    RoleByIdData,
    RoleAccessPayload,
    RolePermissionPayload,
    RoleDropdownItem,
    StateByZoneItem,
} from "@/store/api/roleAndPermission";
import {
    useCreateRolesMutation,
    useGetListOfModulesQuery,
    useGetRolesQuery,
    useLazyGetListOfModulesQuery,
    useLazyGetRoleByIdQuery,
    useLazyGetStatesByZoneQuery,
    useLazyGetRoleListDropdownQuery,
    useUpdateRoleMutation,
} from "@/store/api/roleAndPermission";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import { useGetStatesQuery } from "@/store/api/publicApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";

type RoleGroup = "facility" | "corporate";

type WizardMode = "create" | "edit";

/** Matches `DATA_SCOPE_OPTIONS.id` — sent as `mainScope` in create/update payloads (capitalized). */
type DataScopeLevel = "Zonal" | "Regional" | "Specific" | "All";

type PermCell = { download: boolean; view: boolean; add: boolean; edit: boolean; delete: boolean };

const PERM_MATRIX_COLUMNS: (keyof PermCell)[] = ["download", "view", "add", "edit", "delete"];

const PERM_COL_LABELS: Record<keyof PermCell, string> = {
    download: "Download",
    view: "View",
    add: "Add",
    edit: "Edit",
    delete: "Archive",
};

type PermSectionDef = { id: string; title: string; rows: string[] };

const ZONES = [
    "North Zone",
    "South Zone",
    "East Zone",
    "West Zone",
    "Central Zone",
    "North-East Zone",
] as const;

const REGIONS = [
    "Delhi NCR",
    "Himachal Pradesh",
    "Jammu & Kashmir",
    "Uttarakhand",
    "Chandigarh (UT)",
] as const;

const DATA_SCOPE_OPTIONS: { id: DataScopeLevel; label: string }[] = [
    { id: "Zonal", label: "Zonal" },
    { id: "Regional", label: "Regional" },
    { id: "Specific", label: "Branch Specific" },
    { id: "All", label: "All" },
];

function isZonalOrRegionalScope(scope: DataScopeLevel | null): scope is "Zonal" | "Regional" {
    return scope === "Zonal" || scope === "Regional";
}

function isSpecificOrAllScope(scope: DataScopeLevel | null): scope is "Specific" | "All" {
    return scope === "Specific" || scope === "All";
}

/** `roleScopeTypes` from GET list — API uses lowercase/snake_case; show friendly labels in the table. */
const ROLE_SCOPE_TYPE_DISPLAY: Record<string, string> = {
    specific: "Branch Specific",
    all: "All",
    hospital: "Hospital",
    clinic: "Clinic",
    zonal_hospital: "Zonal Hospital",
    zonal_clinic: "Zonal Clinic",
    regional_hospital: "Regional Hospital",
    regional_clinic: "Regional Clinic",
};

/** RTK / fetch error body for read-only permission flows */
function loadPermissionFlowErrorMessage(e: unknown, fallback: string): string {
    if (e && typeof e === "object" && "data" in e) {
        const d = (e as { data?: { message?: string } }).data;
        if (d?.message && typeof d.message === "string" && d.message.trim()) return d.message.trim();
    }
    if (e instanceof Error && e.message.trim()) return e.message.trim();
    return fallback;
}

function formatRoleScopeTypeLabel(raw: string): string {
    const k = raw.trim().toLowerCase();
    if (ROLE_SCOPE_TYPE_DISPLAY[k]) return ROLE_SCOPE_TYPE_DISPLAY[k];
    return k
        .split("_")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

/** Corporate `mainScope` from role detail API (e.g. "Specific") — match list table wording. */
function formatMainScopeForDisplay(mainScope: string): string {
    const t = mainScope.trim();
    if (t.toLowerCase() === "specific") return "Branch Specific";
    return mainScope;
}

/** Same rules as hospital registration Patient Name (`components/forms/PatientDetails.tsx`). */
const ROLE_WIZARD_TEXT_MAX_LEN = 100;

function sanitizeRoleWizardTextLikePatientName(raw: string): string {
    let value = raw.replace(/[^a-zA-Z\s]/g, "");
    value = value.replace(/^\s+/, "");
    value = value.replace(/(.)\1{2,}/g, "$1$1");
    if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value.slice(0, ROLE_WIZARD_TEXT_MAX_LEN);
}

/** GET getRole list row: Super Admin system roles must not be edited from this screen. */
function isSuperAdminRoleRow(row: { roleCategoryType?: string | null }): boolean {
    return (row.roleCategoryType || "").toLowerCase() === "superadmin";
}

/** GET getRole list row: built-in Doctor role (e.g. `roleCategoryType: "DOCTOR"`) is read-only here. */
function isDoctorRoleRow(row: { roleCategoryType?: string | null }): boolean {
    return (row.roleCategoryType || "").toLowerCase() === "doctor";
}

/** Role Group column label from API `roleCategoryType` (e.g. `DOCTOR` → "Doctor"). */
function formatRoleGroupColumnLabel(roleCategoryType: string | null | undefined): string {
    const catLower = (roleCategoryType || "").toLowerCase();
    if (catLower === "superadmin") return "Super Admin";
    if (catLower === "corporate") return "Corporate";
    if (catLower === "doctor") return "Doctor";
    if (catLower === "facility") return "Facility";
    const raw = String(roleCategoryType ?? "").trim();
    if (!raw) return "Facility";
    return raw
        .toLowerCase()
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** GET getRole: `sort` param values; default list order is newest first. */
const ROLES_LIST_DEFAULT_SORT = { field: "createdAt", order: "desc" as const };
type RolesListSortableColumnApiField = "rolename" | "roleGroup" | "zonal";

function emptyPermStateFor(sections: PermSectionDef[]): Record<string, PermCell[]> {
    const out: Record<string, PermCell[]> = {};
    for (const sec of sections) {
        out[sec.id] = sec.rows.map(() => ({
            download: false,
            view: false,
            add: false,
            edit: false,
            delete: false,
        }));
    }
    return out;
}

function initExpandedForSections(sections: PermSectionDef[]): Record<string, boolean> {
    const init: Record<string, boolean> = {};
    sections.forEach((s) => {
        init[s.id] = true;
    });
    return init;
}

function buildCatalogFromModules(modules: ModuleListItem[]): {
    sections: PermSectionDef[];
    moduleIdsBySection: Record<string, string[]>;
} {
    const activeRoots = modules.filter((m) => m.isActive);
    const hasNested = activeRoots.some(
        (m) => Array.isArray(m.subModules) && m.subModules.length > 0
    );

    if (hasNested) {
        const sections: PermSectionDef[] = [];
        const moduleIdsBySection: Record<string, string[]> = {};
        const sortedRoots = [...activeRoots].sort((a, b) =>
            String(a.moduleName).localeCompare(String(b.moduleName))
        );
        sortedRoots.forEach((root) => {
            /** Include all sub-rows so the matrix never goes empty when API marks some inactive. */
            const subs = (root.subModules ?? []).filter((s) => s != null);
            if (subs.length === 0) return;
            const sortedSubs = [...subs].sort((a, b) =>
                a.moduleName.localeCompare(b.moduleName)
            );
            const sectionId = `pm-root-${String(root.id)}`;
            sections.push({
                id: sectionId,
                title: root.moduleName,
                rows: sortedSubs.map((s) => s.moduleName),
            });
            moduleIdsBySection[sectionId] = sortedSubs.map((s) => String(s.id));
        });
        if (sections.length > 0) {
            return { sections, moduleIdsBySection };
        }
        /** Nested shape but no usable rows (edge case) — fall through to flat grouping. */
    }

    const active = activeRoots;
    const byParent = new Map<string, ModuleListItem[]>();
    for (const m of active) {
        const key = (m.parentModule || "Other").trim() || "Other";
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(m);
    }
    const sortedParents = [...byParent.keys()].sort((a, b) => a.localeCompare(b));
    const sections: PermSectionDef[] = [];
    const moduleIdsBySection: Record<string, string[]> = {};
    sortedParents.forEach((parent, idx) => {
        const items = [...byParent.get(parent)!].sort((a, b) =>
            a.moduleName.localeCompare(b.moduleName)
        );
        const id = `pm-${idx}-${parent.replace(/\s+/g, "-").slice(0, 40).toLowerCase()}`;
        sections.push({
            id,
            title: parent,
            rows: items.map((i) => i.moduleName),
        });
        moduleIdsBySection[id] = items.map((i) => String(i.id));
    });
    return { sections, moduleIdsBySection };
}

function permissionsFromRoleDetail(
    detail: RoleByIdData,
    sections: PermSectionDef[],
    moduleIdsBySection: Record<string, string[]>
): Record<string, PermCell[]> {
    const permByMod = new Map(
        detail.permissions.map((p) => [
            String(p.moduleId),
            {
                download: Boolean(p.canDownload),
                view: Boolean(p.canView),
                add: Boolean(p.canAdd),
                edit: Boolean(p.canEdit),
                delete: Boolean(p.canDelete),
            } satisfies PermCell,
        ])
    );
    const out = emptyPermStateFor(sections);
    for (const sec of sections) {
        const ids = moduleIdsBySection[sec.id];
        if (!ids?.length) continue;
        out[sec.id] = ids.map((mid) => permByMod.get(String(mid)) ?? {
            download: false,
            view: false,
            add: false,
            edit: false,
            delete: false,
        });
    }
    return out;
}

function snapshotFromRoleDetail(
    detail: RoleByIdData,
    permState: Record<string, PermCell[]>,
    sections: PermSectionDef[]
): ManagePermissionsSnapshot {
    const cat = (detail.roleCategoryType || "").toLowerCase();
    const group: RoleGroup = cat === "corporate" ? "corporate" : "facility";
    const regionNames = [
        ...new Set(detail.roleAccess.map((a) => a.state?.name).filter(Boolean) as string[]),
    ];
    const scopeTypeLabels = [...new Set(detail.roleAccess.map((a) => a.roleScopeType))];
    const zoneFromAccess =
        detail.roleAccess.map((a) => a.state?.zone).find((z) => z && String(z).trim() !== "") ?? "—";
    return {
        roleGroup: group,
        roleName: detail.name,
        roleDescription: "",
        facilityTypeLabel: group === "facility" ? scopeTypeLabels.join(", ") || "—" : undefined,
        scope:
            group === "corporate"
                ? {
                      dataScope: detail.mainScope || "—",
                      zone: String(zoneFromAccess),
                      regions: regionNames.length ? regionNames.join(", ") : "—",
                  }
                : undefined,
        permissions: permState,
        permissionSections: sections,
    };
}

/** Corporate roles: only Download + View are editable; strip Add / Edit / Delete from state. */
function corporateDownloadViewPermState(perms: Record<string, PermCell[]>): Record<string, PermCell[]> {
    const out: Record<string, PermCell[]> = {};
    for (const [id, rows] of Object.entries(perms)) {
        out[id] = rows.map((r) => ({
            download: r.download,
            view: r.view,
            add: false,
            edit: false,
            delete: false,
        }));
    }
    return out;
}

function buildPermissionsPayload(
    moduleIdsBySection: Record<string, string[]>,
    perms: Record<string, PermCell[]>,
    sections: PermSectionDef[]
): RolePermissionPayload[] {
    const out: RolePermissionPayload[] = [];
    for (const sec of sections) {
        const ids = moduleIdsBySection[sec.id];
        const cells = perms[sec.id];
        if (!ids?.length || !cells?.length || ids.length !== cells.length) continue;
        for (let i = 0; i < ids.length; i++) {
            const idNum = Number(ids[i]);
            if (Number.isNaN(idNum)) continue;
            out.push({
                moduleId: idNum,
                canDownload: cells[i].download,
                canView: cells[i].view,
                canAdd: cells[i].add,
                canEdit: cells[i].edit,
                canDelete: cells[i].delete,
            });
        }
    }
    return out;
}

function resolveStateIdsFromSelection(
    selectedLabels: string[],
    options: StateByZoneItem[],
    fallback: number[]
): number[] {
    if (!selectedLabels.length) return fallback;
    if (!options.length) {
        return fallback.slice(0, Math.min(fallback.length, Math.max(1, selectedLabels.length)));
    }
    const byName = new Map(options.map((o) => [o.name, o.id]));
    const ids = selectedLabels
        .map((l) => byName.get(l))
        .filter((v): v is number => typeof v === "number");
    return ids.length ? ids : fallback;
}

/**
 * Maps wizard to API `roleAccess`.
 * Facility: branch-bound role via `specific` + `branchIds`. Corporate: zonal_* / regional_* | specific | all (+ branchIds).
 */
function buildRoleAccessForCreate(
    activeGroup: RoleGroup,
    dataScope: DataScopeLevel | null,
    facilityBranchId: number | null,
    corporateFacilityTypes: { hospital: boolean; clinic: boolean },
    hospitalRegions: string[],
    clinicRegions: string[],
    hospitalStateOptions: StateByZoneItem[],
    clinicStateOptions: StateByZoneItem[],
    corporateBranchIds: number[],
    allStates: { id: number; name: string }[]
): RoleAccessPayload[] {
    if (activeGroup === "facility") {
        if (facilityBranchId != null && facilityBranchId > 0) {
            return [{ roleScopeType: "specific", branchIds: [facilityBranchId] }];
        }
        return [];
    }
    if (!dataScope) {
        return [{ roleScopeType: "zonal_hospital", stateIds: [1] }];
    }
    if (isSpecificOrAllScope(dataScope)) {
        const apiScopeType = dataScope === "Specific" ? "specific" : "all";
        const branchIds = dataScope === "Specific" ? corporateBranchIds : [];
        return [{ roleScopeType: apiScopeType, branchIds }];
    }
    const isRegional = dataScope === "Regional";
    const zonePrefix = isRegional ? "regional_" : "zonal_";
    const allStatesAsOptions: StateByZoneItem[] = isRegional
        ? allStates.map((s) => ({ id: s.id, name: s.name, countryId: 0, zone: "" }))
        : [];
    const out: RoleAccessPayload[] = [];
    if (corporateFacilityTypes.hospital) {
        const opts = isRegional ? allStatesAsOptions : hospitalStateOptions;
        out.push({
            roleScopeType: `${zonePrefix}hospital`,
            stateIds: resolveStateIdsFromSelection(hospitalRegions, opts, []),
        });
    }
    if (corporateFacilityTypes.clinic) {
        const opts = isRegional ? allStatesAsOptions : clinicStateOptions;
        out.push({
            roleScopeType: `${zonePrefix}clinic`,
            stateIds: resolveStateIdsFromSelection(clinicRegions, opts, []),
        });
    }
    if (out.length === 0) {
        out.push({ roleScopeType: `${zonePrefix}hospital`, stateIds: [] });
    }
    return out;
}

/**
 * Custom checkbox: opacity-0 input stacked over the box inside a `relative` wrapper.
 * Avoid `sr-only` here — its `position:absolute` without a positioned ancestor was moving the
 * focus target in the document and triggering scroll-into-view / huge blank overflow in `main`.
 */
type ManagePermissionsSnapshot = {
    roleGroup: RoleGroup;
    roleName: string;
    roleDescription: string;
    /** Facility role — e.g. "Hospital", "Hospital, Clinic" */
    facilityTypeLabel?: string;
    /** Corporate role */
    scope?: {
        dataScope: string;
        zone: string;
        regions: string;
    };
    permissions: Record<string, PermCell[]>;
    /** Module/sub-module rows for read-only matrix (from GET getListOfmodules for this role’s branch). */
    permissionSections: PermSectionDef[];
};

function ReadOnlyPermBox({ allowed }: { allowed: boolean }) {
    return (
        <span
            aria-hidden
            className={`inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded border align-middle ${
                allowed
                    ? "border-[#0B8C00] bg-[rgba(11,140,0,0.1)]"
                    : "border-[#DFE0E2] bg-white"
            }`}
        >
            {allowed ? (
                <svg
                    className="h-[10px] w-[10px] text-[#0B8C00]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                    />
                </svg>
            ) : null}
        </span>
    );
}

function AlignedCheckbox({
    id,
    checked,
    onChange,
    label,
    disabled = false,
    className = "",
}: {
    id?: string;
    checked: boolean;
    onChange: () => void;
    label?: ReactNode;
    /** When true: not clickable, cursor-not-allowed, dimmed. */
    disabled?: boolean;
    className?: string;
}) {
    return (
        <label
            htmlFor={id}
            aria-disabled={disabled}
            className={`inline-flex select-none items-center gap-2 align-middle ${
                disabled
                    ? "cursor-not-allowed opacity-55"
                    : "cursor-pointer"
            } ${className}`}
        >
            <span className="relative inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                        if (!disabled) onChange();
                    }}
                    className={`absolute inset-0 z-[1] m-0 h-[14px] w-[14px] opacity-0 ${
                        disabled ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                />
                <span
                    aria-hidden
                    className={`pointer-events-none flex h-[14px] w-[14px] items-center justify-center rounded border transition-colors ${
                        disabled
                            ? checked
                                ? "border-[#0B8C00]/40 bg-[rgba(11,140,0,0.06)]"
                                : "border-[#DFE0E2] bg-[#F8F9FA]"
                            : checked
                              ? "border-[#0B8C00] bg-[rgba(11,140,0,0.1)]"
                              : "border-[#DFE0E2] bg-white"
                    }`}
                >
                    {checked ? (
                        <svg
                            className="h-[10px] w-[10px] text-[#0B8C00]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    ) : null}
                </span>
            </span>
            {label != null ? label : null}
        </label>
    );
}

export default function RoleMasterPage() {
    const modulePermission = usePermission("Roles And Permissions");
    const subModulePermission = usePermission("Roles And Permissions", { subModule: "Role Master" });
    const canView = modulePermission.canView || subModulePermission.canView;
    const canAdd = modulePermission.canAdd || subModulePermission.canAdd;
    const canEdit = modulePermission.canEdit || subModulePermission.canEdit;

    const [listPage, setListPage] = useState(1);
    const [listLimit, setListLimit] = useState(10);
    const [rolesListSort, setRolesListSort] = useState<{
        field: string;
        order: "asc" | "desc";
    }>(ROLES_LIST_DEFAULT_SORT);
    const [roleListSearchInput, setRoleListSearchInput] = useState("");
    const [roleListSearchDebounced, setRoleListSearchDebounced] = useState("");
    /** List filter: GET getRole `roleCatType` (facility | corporate). */
    const [roleListRoleCatType, setRoleListRoleCatType] = useState<RoleGroup | null>("facility");
    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        filterBranchId,
        isSuperAdmin: isRoleListSuperAdmin,
    } = useBranchFilter();

    const authUserBranchId = useAppSelector(selectUserBranchId);
    const headerSelectedBranch = useAppSelector(selectSelectedBranch);

    const { data: branchesEnvelope, isLoading: isBranchesEnvelopeLoading } = useGetBranchesQuery(
        undefined,
        {
            skip: !canView,
        }
    );

    /** Super Admin list filter: default to first branch so GET getListOfmodules always has branchId. */
    useEffect(() => {
        if (!isRoleListSuperAdmin) return;
        if (isLoadingBranchFilter) return;
        const rows = branchesEnvelope?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (selectedBranchFilter !== "") return;
        setSelectedBranchFilter(String(rows[0].id));
    }, [
        isRoleListSuperAdmin,
        isLoadingBranchFilter,
        branchesEnvelope,
        selectedBranchFilter,
        setSelectedBranchFilter,
    ]);

    /**
     * Branch id for GET getRole only: follows the branch dropdown, with super-admin first-branch
     * fallback so the query string includes branchId even before the sync effect updates selection.
     */
    const getRoleListQueryBranchId = useMemo((): number | undefined => {
        const raw = String(selectedBranchFilter ?? "").trim();
        if (raw) {
            const n = Number.parseInt(raw, 10);
            if (Number.isFinite(n) && n > 0) return n;
        }
        if (isRoleListSuperAdmin) {
            const rows = branchesEnvelope?.data;
            if (Array.isArray(rows) && rows.length > 0) {
                const fid = rows[0].id;
                if (typeof fid === "number" && Number.isFinite(fid) && fid > 0) return fid;
            }
            return undefined;
        }
        const hdr = headerSelectedBranch?.id;
        if (hdr != null && Number(hdr) > 0) return Number(hdr);
        const auth = authUserBranchId != null ? Number(authUserBranchId) : NaN;
        if (Number.isFinite(auth) && auth > 0) return auth;
        return undefined;
    }, [
        selectedBranchFilter,
        isRoleListSuperAdmin,
        branchesEnvelope?.data,
        headerSelectedBranch?.id,
        authUserBranchId,
    ]);

    useEffect(() => {
        const id = window.setTimeout(() => {
            setRoleListSearchDebounced(roleListSearchInput.trim());
        }, 300);
        return () => window.clearTimeout(id);
    }, [roleListSearchInput]);

    useEffect(() => {
        setListPage(1);
    }, [roleListSearchDebounced, roleListRoleCatType, getRoleListQueryBranchId]);

    const rolesQueryParams = useMemo(
        () => ({
            page: listPage,
            limit: listLimit,
            sort: rolesListSort.field,
            order: rolesListSort.order,
            ...(roleListSearchDebounced ? { search: roleListSearchDebounced } : {}),
            ...(roleListRoleCatType ? { roleCatType: roleListRoleCatType } : {}),
            ...(roleListRoleCatType === "facility" &&
            getRoleListQueryBranchId != null &&
            getRoleListQueryBranchId > 0
                ? { branchId: getRoleListQueryBranchId }
                : {}),
        }),
        [
            listPage,
            listLimit,
            roleListSearchDebounced,
            roleListRoleCatType,
            rolesListSort.field,
            rolesListSort.order,
            getRoleListQueryBranchId,
        ]
    );

    /**
     * Super Admin: avoid a first GET getRole without branchId (then again with branchId) while
     * branch list / filter is still resolving. Non–super-admin always has branch from session.
     */
    const skipGetRolesList =
        !canView ||
        (isRoleListSuperAdmin &&
            roleListRoleCatType === "facility" &&
            getRoleListQueryBranchId == null &&
            (isLoadingBranchFilter || isBranchesEnvelopeLoading));

    const setRolesListSortByColumn = useCallback((apiField: RolesListSortableColumnApiField) => {
        setListPage(1);
        setRolesListSort((prev) => {
            if (prev.field === apiField) {
                return { field: apiField, order: prev.order === "asc" ? "desc" : "asc" };
            }
            return { field: apiField, order: "asc" };
        });
    }, []);

    const { data: rolesEnvelope, isLoading: rolesLoading, isFetching: rolesFetching } =
        useGetRolesQuery(rolesQueryParams, {
            skip: skipGetRolesList,
        });

    const [createRoles, { isLoading: isCreating }] = useCreateRolesMutation();
    const [updateRoleMutation, { isLoading: isUpdating }] = useUpdateRoleMutation();
    const [triggerGetRoleById] = useLazyGetRoleByIdQuery();
    const [triggerStatesByZone] = useLazyGetStatesByZoneQuery();
    const { data: indiaStatesData } = useGetStatesQuery({ countryId: 6 });

    const roles = useMemo(() => {
        if (!rolesEnvelope?.success || !Array.isArray(rolesEnvelope.data)) return [];
        return rolesEnvelope.data;
    }, [rolesEnvelope]);

    const rolesListTotalItems = useMemo(() => {
        const apiTotal = rolesEnvelope?.total;
        if (typeof apiTotal === "number" && apiTotal >= 0) return apiTotal;
        if (roles.length < listLimit) {
            return Math.max(0, (listPage - 1) * listLimit + roles.length);
        }
        return listPage * listLimit + 1;
    }, [rolesEnvelope?.total, roles.length, listPage, listLimit]);

    const [isRoleWizardOpen, setIsRoleWizardOpen] = useState(false);
    const [wizardMode, setWizardMode] = useState<WizardMode>("create");
    const [selectedGroup, setSelectedGroup] = useState<RoleGroup | null>(null);
    const [phaseStep, setPhaseStep] = useState(1);

    const [roleName, setRoleName] = useState("");
    const debouncedRoleName = useDebounce(roleName, 400);
    /** Hide dropdown while user is still typing (debounce not caught up) to avoid stale API results. */
    const isRoleNameSearchSynced = roleName.trim() === debouncedRoleName.trim();
    const [roleNameOption, setRoleNameOption] = useState<"Doctor" | "Nurse" | "Therapist" | "Other">("Doctor");
    const [roleDescription, setRoleDescription] = useState("");

    /** Inline field-level errors for the "Define Role Name" step. */
    const [defineErrors, setDefineErrors] = useState({ roleName: "", branch: "" });

    /** Autocomplete for define-step role name field (all presets) */
    const [roleDropdownItems, setRoleDropdownItems] = useState<RoleDropdownItem[]>([]);
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
    const roleDropdownRef = useRef<HTMLDivElement>(null);
    const [fetchRoleDropdown] = useLazyGetRoleListDropdownQuery();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
                setRoleDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const ROLE_NAME_PRESET_OPTIONS = ["Doctor", "Nurse", "Therapist", "Other"] as const;

    const ROLE_DEFINE_NAME_FIELD_COPY: Record<
        "Doctor" | "Nurse" | "Therapist" | "Other",
        { label: string; placeholder: string }
    > = {
        Doctor: { label: "Role Name *", placeholder: "Role Name" },
        Nurse: { label: "Role Name *", placeholder: "Role Name" },
        Therapist: { label: "Role Name *", placeholder: "Role Name" },
        Other: { label: "Role Name *", placeholder: "Role Name" },
    };

    /** `roleCategoryType` query param for getRoleListDropdown. */
    const roleListDropdownRoleCategoryParam = useMemo(() => {
        if (selectedGroup === "corporate") return "corporate";
        if (selectedGroup === "facility") {
            switch (roleNameOption) {
                case "Doctor":
                    return "facility_doctor";
                case "Nurse":
                    return "facility_nurse";
                case "Therapist":
                    return "facility_therapist";
                case "Other":
                    return "facility";
            }
        }
        return "facility";
    }, [selectedGroup, roleNameOption]);

    useEffect(() => {
        const q = debouncedRoleName.trim();
        if (q.length === 0) {
            setRoleDropdownItems([]);
            setRoleDropdownOpen(false);
            return;
        }
        let cancelled = false;
        void fetchRoleDropdown({
            search: q,
            roleCategoryType: roleListDropdownRoleCategoryParam,
        })
            .unwrap()
            .then((res) => {
                if (cancelled) return;
                const apiItems: RoleDropdownItem[] = res.success && Array.isArray(res.data) ? res.data : [];
                setRoleDropdownItems(apiItems);
                setRoleDropdownOpen(apiItems.length > 0);
            })
            .catch(() => {
                if (cancelled) return;
                setRoleDropdownItems([]);
                setRoleDropdownOpen(false);
            });
        return () => {
            cancelled = true;
        };
    }, [debouncedRoleName, roleListDropdownRoleCategoryParam, fetchRoleDropdown]);

    const onRoleNameOptionChange = useCallback((option: "Doctor" | "Nurse" | "Therapist" | "Other") => {
        setRoleNameOption(option);
        setDefineErrors((prev) => ({ ...prev, roleName: "" }));
        setRoleDropdownOpen(false);
        setRoleDropdownItems([]);
        setRoleName("");
    }, []);

    const onRoleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const val = sanitizeRoleWizardTextLikePatientName(e.target.value);
        setRoleName(val);
        if (val.trim()) setDefineErrors((prev) => ({ ...prev, roleName: "" }));

        if (val.trim().length === 0) {
            setRoleDropdownItems([]);
            setRoleDropdownOpen(false);
        }
    }, []);
    const onRoleNameBlur = useCallback((e: FocusEvent<HTMLInputElement>) => {
        const trimmed = e.target.value.trim();
        if (trimmed !== e.target.value) setRoleName(trimmed);

        // Auto-select first dropdown item on blur if dropdown is open
        setRoleDropdownItems((prevItems) => {
            setRoleDropdownOpen((prevOpen) => {
                if (prevOpen && prevItems.length > 0) {
                    const first = prevItems[0];
                    if (selectedGroup === "facility") {
                        const presetMatch = (["Doctor", "Nurse", "Therapist"] as const).find(
                            (p) => p.toLowerCase() === first.name.trim().toLowerCase()
                        );
                        if (presetMatch) {
                            setRoleNameOption(presetMatch);
                            setRoleName(presetMatch);
                        } else {
                            setRoleName(first.name);
                        }
                    } else {
                        setRoleName(first.name);
                    }
                    setDefineErrors((prev) => ({ ...prev, roleName: "" }));
                }
                return false;
            });
            return [];
        });
    }, [selectedGroup]);
    const onRoleDescriptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
        setRoleDescription(sanitizeRoleWizardTextLikePatientName(e.target.value));
    }, []);
    const onRoleDescriptionBlur = useCallback((e: FocusEvent<HTMLTextAreaElement>) => {
        const trimmed = e.target.value.trim();
        if (trimmed !== e.target.value) setRoleDescription(trimmed);
    }, []);

    /** Facility Role create/edit: single branch for scope + branch-scoped module list. */
    const [facilitySelectedBranchId, setFacilitySelectedBranchId] = useState("");

    const [dataScope, setDataScope] = useState<DataScopeLevel | null>(null);
    const [corporateFacilityTypes, setCorporateFacilityTypes] = useState({
        hospital: false,
        clinic: false,
    });

    const [hospitalZones, setHospitalZones] = useState<string[]>([]);
    const [hospitalRegions, setHospitalRegions] = useState<string[]>([]);
    const [clinicZones, setClinicZones] = useState<string[]>([]);
    const [clinicRegions, setClinicRegions] = useState<string[]>([]);

    /** Corporate Specific / All: branch IDs from GET /admin/settings/branches (multi-select values as strings). */
    const [corporateSelectedBranchIds, setCorporateSelectedBranchIds] = useState<string[]>([]);

    const resolveBranchIdForModuleList = useCallback(
        (d: RoleByIdData, fallbackBranchId: number | undefined): number | undefined => {
            /** Prefer branch tied to the role (facility + corporate specific/all scopes may list branchIds). */
            const fromAccess = d.roleAccess
                .map((a) => a.branchId)
                .find((b): b is number => typeof b === "number" && !Number.isNaN(b) && b > 0);
            if (fromAccess != null) return fromAccess;
            if (fallbackBranchId != null && fallbackBranchId > 0) return fallbackBranchId;
            const hdr = headerSelectedBranch?.id;
            if (hdr != null && Number(hdr) > 0) return Number(hdr);
            const auth = authUserBranchId != null ? Number(authUserBranchId) : NaN;
            if (Number.isFinite(auth) && auth > 0) return auth;
            const first = branchesEnvelope?.data?.[0]?.id;
            return first != null && Number(first) > 0 ? Number(first) : undefined;
        },
        [headerSelectedBranch?.id, authUserBranchId, branchesEnvelope?.data]
    );

    const branchSelectOptions = useMemo(() => {
        if (!branchesEnvelope?.success || !Array.isArray(branchesEnvelope.data)) return [];
        return branchesEnvelope.data.map((b) => ({
            label: `${b.name} (${b.branchCode})`,
            value: String(b.id),
        }));
    }, [branchesEnvelope]);

    const facilityBranchIdNumeric = useMemo(() => {
        const n = Number.parseInt(facilitySelectedBranchId.trim(), 10);
        return Number.isFinite(n) && n > 0 ? n : undefined;
    }, [facilitySelectedBranchId]);

    /** Wizard Facility “Assign Permissions” step uses the selected facility branch for the module list. */
    const isWizardFacilityPermissionsStep = Boolean(
        isRoleWizardOpen &&
            selectedGroup === "facility" &&
            (wizardMode === "create" ? phaseStep === 3 : phaseStep === 2)
    );

    /** Always scope GET getListOfmodules with a branchId (required for nested subModules). */
    const resolvedModulesBranchId = useMemo((): number | undefined => {
        if (isWizardFacilityPermissionsStep && facilityBranchIdNumeric != null) {
            return facilityBranchIdNumeric;
        }
        if (filterBranchId != null && Number.isFinite(filterBranchId) && filterBranchId > 0) {
            return filterBranchId;
        }
        const hdr = headerSelectedBranch?.id;
        if (hdr != null && Number(hdr) > 0) return Number(hdr);
        const auth = authUserBranchId != null ? Number(authUserBranchId) : NaN;
        if (Number.isFinite(auth) && auth > 0) return auth;
        const first = branchesEnvelope?.data?.[0]?.id;
        return first != null && Number(first) > 0 ? Number(first) : undefined;
    }, [
        isWizardFacilityPermissionsStep,
        facilityBranchIdNumeric,
        filterBranchId,
        headerSelectedBranch?.id,
        authUserBranchId,
        branchesEnvelope?.data,
    ]);

    /** Map ROLE_NAME_PRESET_OPTIONS selection to the `roleType` query param for getListOfModules. Only applies for facility wizard; undefined for corporate. */
    const resolvedRoleType: string | undefined = useMemo(() => {
        if (selectedGroup !== "facility") return undefined;
        switch (roleNameOption) {
            case "Doctor": return "doctor";
            case "Nurse": return "nurse";
            case "Therapist": return "therapist";
            case "Other": return "other";
        }
    }, [selectedGroup, roleNameOption]);

    const modulesQueryArg =
        resolvedModulesBranchId != null
            ? { branchId: resolvedModulesBranchId, ...(resolvedRoleType ? { roleType: resolvedRoleType } : {}) }
            : undefined;

    const { data: modulesEnvelope, isFetching: modulesLoading } = useGetListOfModulesQuery(
        modulesQueryArg,
        { skip: !canView || modulesQueryArg == null }
    );

    const [triggerListModules] = useLazyGetListOfModulesQuery();

    const { permissionSections, moduleIdsBySection } = useMemo(() => {
        const raw = modulesEnvelope?.success ? modulesEnvelope.data : undefined;
        if (raw?.length) {
            const built = buildCatalogFromModules(raw);
            return {
                permissionSections: built.sections,
                moduleIdsBySection: built.moduleIdsBySection,
            };
        }
        return { permissionSections: [] as PermSectionDef[], moduleIdsBySection: {} as Record<string, string[]> };
    }, [modulesEnvelope]);

    const [hospitalStateOptions, setHospitalStateOptions] = useState<StateByZoneItem[]>([]);
    const [clinicStateOptions, setClinicStateOptions] = useState<StateByZoneItem[]>([]);

    const [permissions, setPermissions] = useState<Record<string, PermCell[]>>({});
    const [expandedPermSections, setExpandedPermSections] = useState<Record<string, boolean>>({});

    const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
    const [editingIsActive, setEditingIsActive] = useState(true);
    const [editingRoleCategoryType, setEditingRoleCategoryType] = useState("");
    const submitRoleInFlightRef = useRef(false);
    const [isRoleSubmitting, setIsRoleSubmitting] = useState(false);

    const [messageDialog, setMessageDialog] = useState<{
        open: boolean;
        variant: "success" | "error";
        message: string;
    }>({ open: false, variant: "success", message: "" });

    const [manageView, setManageView] = useState<ManagePermissionsSnapshot | null>(null);
    const [manageLoading, setManageLoading] = useState(false);
    const [manageSectionOpen, setManageSectionOpen] = useState<Record<string, boolean>>({});

    const [dataScopeDialogOpen, setDataScopeDialogOpen] = useState(false);
    const [dataScopeDialogItems, setDataScopeDialogItems] = useState<string[]>([]);

    const permissionSectionKeyRef = useRef("");
    const managePermissionsBusyRef = useRef(false);
    const editingRoleDetailRef = useRef<RoleByIdData | null>(null);
    const facilityEditPermHydrateKeyRef = useRef("");
    const facilityPermCatalogKeyRef = useRef("");
    const corporatePermCatalogKeyRef = useRef("");
    const corporateEditPermHydrateKeyRef = useRef("");

    useEffect(() => {
        const key = permissionSections.map((s) => s.id).join("|");
        if (key === permissionSectionKeyRef.current) return;
        permissionSectionKeyRef.current = key;
        if (isRoleWizardOpen || manageView || manageLoading) return;
        setPermissions(emptyPermStateFor(permissionSections));
        setExpandedPermSections(initExpandedForSections(permissionSections));
    }, [permissionSections, isRoleWizardOpen, manageView, manageLoading]);

    /** Facility permissions matrix: when the module catalog changes (e.g. branch-scoped list loads), reset cells. */
    useEffect(() => {
        if (!isRoleWizardOpen || selectedGroup !== "facility") return;
        const permStep = wizardMode === "create" ? 3 : 2;
        if (phaseStep !== permStep) return;
        const key = permissionSections.map((s) => s.id).join("|");
        if (key === facilityPermCatalogKeyRef.current) return;
        facilityPermCatalogKeyRef.current = key;
        facilityEditPermHydrateKeyRef.current = "";
        setPermissions(emptyPermStateFor(permissionSections));
        setExpandedPermSections(initExpandedForSections(permissionSections));
    }, [
        isRoleWizardOpen,
        selectedGroup,
        wizardMode,
        phaseStep,
        permissionSections,
    ]);

    /** Corporate permissions matrix: when the global module catalog loads on the permissions step, align `permissions` keys with `permissionSections` (fixes undefined section rows / dead checkboxes). */
    useEffect(() => {
        if (!isRoleWizardOpen || selectedGroup !== "corporate") return;
        const permStep = wizardMode === "create" ? 5 : 4;
        if (phaseStep !== permStep) return;
        const key = permissionSections.map((s) => s.id).join("|");
        if (key === corporatePermCatalogKeyRef.current) return;
        corporatePermCatalogKeyRef.current = key;
        corporateEditPermHydrateKeyRef.current = "";
        setPermissions(emptyPermStateFor(permissionSections));
        setExpandedPermSections(initExpandedForSections(permissionSections));
    }, [
        isRoleWizardOpen,
        selectedGroup,
        wizardMode,
        phaseStep,
        permissionSections,
    ]);

    /** Edit Facility: after branch-scoped catalog matches, hydrate checkboxes from GET role by id. */
    useEffect(() => {
        if (!isRoleWizardOpen || wizardMode !== "edit" || selectedGroup !== "facility") return;
        const permStep = 2;
        if (phaseStep !== permStep || modulesLoading) return;
        const d = editingRoleDetailRef.current;
        if (!d || editingRoleId == null || d.id !== editingRoleId) return;
        const k = `${d.id}|${permissionSections.map((s) => s.id).join("|")}`;
        if (facilityEditPermHydrateKeyRef.current === k) return;
        facilityEditPermHydrateKeyRef.current = k;
        setPermissions(permissionsFromRoleDetail(d, permissionSections, moduleIdsBySection));
    }, [
        isRoleWizardOpen,
        wizardMode,
        selectedGroup,
        phaseStep,
        modulesLoading,
        permissionSections,
        moduleIdsBySection,
        editingRoleId,
    ]);

    /** Edit Corporate: after module catalog matches, hydrate checkboxes from GET role by id. */
    useEffect(() => {
        if (!isRoleWizardOpen || wizardMode !== "edit" || selectedGroup !== "corporate") return;
        const permStep = 4;
        if (phaseStep !== permStep || modulesLoading) return;
        const d = editingRoleDetailRef.current;
        if (!d || editingRoleId == null || d.id !== editingRoleId) return;
        const k = `${d.id}|${permissionSections.map((s) => s.id).join("|")}`;
        if (corporateEditPermHydrateKeyRef.current === k) return;
        corporateEditPermHydrateKeyRef.current = k;
        const detailPerms = permissionsFromRoleDetail(d, permissionSections, moduleIdsBySection);
        setPermissions(corporateDownloadViewPermState(detailPerms));
    }, [
        isRoleWizardOpen,
        wizardMode,
        selectedGroup,
        phaseStep,
        modulesLoading,
        permissionSections,
        moduleIdsBySection,
        editingRoleId,
    ]);

    useEffect(() => {
        if (hospitalZones.length === 0) {
            setHospitalStateOptions([]);
            return;
        }
        let cancelled = false;
        (async () => {
            const merged = new Map<number, StateByZoneItem>();
            for (const z of hospitalZones) {
                const zoneParam = z
                    .replace(/\s+Zone$/i, "")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "-");
                try {
                    const res = await triggerStatesByZone({ zone: zoneParam }).unwrap();
                    if (res.success && Array.isArray(res.data)) {
                        for (const s of res.data) merged.set(s.id, s);
                    }
                } catch {
                    /* keep static region list */
                }
            }
            if (!cancelled) setHospitalStateOptions([...merged.values()].sort((a, b) => a.name.localeCompare(b.name)));
        })();
        return () => {
            cancelled = true;
        };
    }, [hospitalZones, triggerStatesByZone]);

    useEffect(() => {
        if (clinicZones.length === 0) {
            setClinicStateOptions([]);
            return;
        }
        let cancelled = false;
        (async () => {
            const merged = new Map<number, StateByZoneItem>();
            for (const z of clinicZones) {
                const zoneParam = z
                    .replace(/\s+Zone$/i, "")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "-");
                try {
                    const res = await triggerStatesByZone({ zone: zoneParam }).unwrap();
                    if (res.success && Array.isArray(res.data)) {
                        for (const s of res.data) merged.set(s.id, s);
                    }
                } catch {
                    /* keep static region list */
                }
            }
            if (!cancelled) setClinicStateOptions([...merged.values()].sort((a, b) => a.name.localeCompare(b.name)));
        })();
        return () => {
            cancelled = true;
        };
    }, [clinicZones, triggerStatesByZone]);

    const hospitalRegionSource: string[] =
        dataScope === "Regional"
            ? Array.from(
                new Set(
                    (indiaStatesData?.data ?? [])
                        .map((state) => state?.name?.trim())
                        .filter((name): name is string => Boolean(name))
                )
            ).sort((a, b) => a.localeCompare(b))
            : hospitalStateOptions.length > 0
              ? hospitalStateOptions.map((s) => s.name)
              : [...REGIONS];
    const clinicRegionSource: string[] =
        dataScope === "Regional"
            ? Array.from(
                new Set(
                    (indiaStatesData?.data ?? [])
                        .map((state) => state?.name?.trim())
                        .filter((name): name is string => Boolean(name))
                )
            ).sort((a, b) => a.localeCompare(b))
            : clinicStateOptions.length > 0
              ? clinicStateOptions.map((s) => s.name)
              : [...REGIONS];

    const openDataScopeViewAllDialog = (items: string[]) => {
        setDataScopeDialogItems(items);
        setDataScopeDialogOpen(true);
    };

    const closeDataScopeViewAllDialog = () => {
        setDataScopeDialogOpen(false);
        setDataScopeDialogItems([]);
    };

    const activeGroup = selectedGroup;

    const resetForm = useCallback(() => {
        setRoleName("");
        setRoleNameOption("Doctor");
        setDefineErrors({ roleName: "", branch: "" });
        setRoleDescription("");
        setFacilitySelectedBranchId("");
        setDataScope(null);
        setCorporateFacilityTypes({ hospital: false, clinic: false });
        setHospitalZones([]);
        setHospitalRegions([]);
        setClinicZones([]);
        setClinicRegions([]);
        setHospitalStateOptions([]);
        setClinicStateOptions([]);
        setCorporateSelectedBranchIds([]);
        setPermissions(emptyPermStateFor(permissionSections));
        setExpandedPermSections(initExpandedForSections(permissionSections));
        setEditingRoleId(null);
        setEditingIsActive(true);
    }, [permissionSections]);

    const selectCorporateDataScope = useCallback((id: DataScopeLevel) => {
        setDataScope(id);
        if (isSpecificOrAllScope(id)) {
            setCorporateFacilityTypes({ hospital: false, clinic: false });
            setHospitalZones([]);
            setHospitalRegions([]);
            setClinicZones([]);
            setClinicRegions([]);
        } else {
            setCorporateSelectedBranchIds([]);
        }
    }, []);

    const closeWizard = useCallback(() => {
        editingRoleDetailRef.current = null;
        facilityEditPermHydrateKeyRef.current = "";
        facilityPermCatalogKeyRef.current = "";
        corporatePermCatalogKeyRef.current = "";
        corporateEditPermHydrateKeyRef.current = "";
        setIsRoleWizardOpen(false);
        setWizardMode("create");
        setSelectedGroup(null);
        setPhaseStep(1);
        resetForm();
    }, [resetForm]);

    const openCreateRole = () => {
        if (!canAdd || !canView) return;
        editingRoleDetailRef.current = null;
        facilityEditPermHydrateKeyRef.current = "";
        facilityPermCatalogKeyRef.current = "";
        corporatePermCatalogKeyRef.current = "";
        corporateEditPermHydrateKeyRef.current = "";
        setWizardMode("create");
        setEditingRoleId(null);
        setEditingIsActive(true);
        setSelectedGroup(null);
        setPhaseStep(1);
        resetForm();
        setIsRoleWizardOpen(true);
    };

    const showMessage = (variant: "success" | "error", message: string) => {
        setMessageDialog({ open: true, variant, message });
    };

    /** Backdrop, OK, X, Escape — on success, same as OK: close dialog and return to role list. */
    const dismissMessageDialog = useCallback(() => {
        setMessageDialog((m) => {
            if (m.variant === "success") {
                setTimeout(() => closeWizard(), 0);
            }
            return { ...m, open: false };
        });
    }, [closeWizard]);

    const closeManageView = () => {
        setManageView(null);
        setManageLoading(false);
    };

    const openManagePermissions = async (roleId: number) => {
        if (!canView) return;
        if (managePermissionsBusyRef.current) return;
        managePermissionsBusyRef.current = true;
        setManageLoading(true);
        setManageView(null);
        setManageSectionOpen({});
        try {
            const res = await triggerGetRoleById({ roleId }).unwrap();
            if (!res.success || !res.data) {
                throw new Error(res.message || "Failed to load role");
            }
            const d = res.data;
            const branchForModules = resolveBranchIdForModuleList(d, resolvedModulesBranchId);
            if (branchForModules == null || branchForModules <= 0) {
                showMessage("error", "Could not determine branch for permission modules.");
                return;
            }

            const roleTypeFromCategory = (() => {
                const cat = (d.roleCategoryType ?? "").toLowerCase();
                if (cat === "facility_doctor") return "doctor";
                if (cat === "facility_nurse") return "nurse";
                if (cat === "facility_therapist") return "therapist";
                if (cat.startsWith("facility")) return "other";
                return undefined;
            })();

            let modulesPayload: ModuleListItem[] | undefined;
            let modulesMessage = "";
            try {
                const modRes = await triggerListModules({ branchId: branchForModules, ...(roleTypeFromCategory ? { roleType: roleTypeFromCategory } : {}) }).unwrap();
                if (modRes.success && Array.isArray(modRes.data) && modRes.data.length > 0) {
                    modulesPayload = modRes.data;
                    modulesMessage = modRes.message || "";
                }
            } catch (branchErr) {
                /** Branch-scoped list failed (network / 404) — try global catalog. */
                try {
                    const globalRes = await triggerListModules(undefined).unwrap();
                    if (globalRes.success && Array.isArray(globalRes.data) && globalRes.data.length > 0) {
                        modulesPayload = globalRes.data;
                        modulesMessage = globalRes.message || "";
                    } else {
                        throw branchErr;
                    }
                } catch {
                    showMessage(
                        "error",
                        loadPermissionFlowErrorMessage(
                            branchErr,
                            "Could not load permission modules for this branch."
                        )
                    );
                    return;
                }
            }

            if (!modulesPayload?.length) {
                try {
                    const fallbackRes = await triggerListModules(undefined).unwrap();
                    if (fallbackRes.success && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
                        modulesPayload = fallbackRes.data;
                        modulesMessage = fallbackRes.message || "";
                    }
                } catch {
                    /* handled below */
                }
            }

            if (!modulesPayload?.length) {
                showMessage(
                    "error",
                    modulesMessage || "Could not load permission modules. Try again or pick a branch in the header."
                );
                return;
            }

            const built = buildCatalogFromModules(modulesPayload);
            if (built.sections.length === 0) {
                showMessage("error", "No permission modules could be built from the catalog.");
                return;
            }
            const perms = permissionsFromRoleDetail(d, built.sections, built.moduleIdsBySection);
            setManageSectionOpen(initExpandedForSections(built.sections));
            setManageView(snapshotFromRoleDetail(d, perms, built.sections));
        } catch (e: unknown) {
            showMessage("error", loadPermissionFlowErrorMessage(e, "Could not load role permissions."));
        } finally {
            managePermissionsBusyRef.current = false;
            setManageLoading(false);
        }
    };

    const openEditRole = async (roleId: number) => {
        if (!canEdit || !canView) return;
        setWizardMode("edit");
        setEditingRoleId(roleId);
        setIsRoleWizardOpen(true);
        try {
            const res = await triggerGetRoleById({ roleId }).unwrap();
            if (!res.success || !res.data) {
                throw new Error(res.message || "Failed to load role");
            }
            const d = res.data;
            setEditingIsActive(d.isActive);
            const cat = (d.roleCategoryType || "").toLowerCase();
            setEditingRoleCategoryType(d.roleCategoryType || "");
            const grp: RoleGroup = cat === "corporate" ? "corporate" : "facility";
            setSelectedGroup(grp);
            setRoleName(d.name);
            const presetMatch: "Doctor" | "Nurse" | "Therapist" | "Other" =
                cat === "facility_doctor" ? "Doctor"
                : cat === "facility_nurse" ? "Nurse"
                : cat === "facility_therapist" ? "Therapist"
                : "Other";
            setRoleNameOption(presetMatch);
            setRoleDescription((d as any).roleDescription || "");
            const rawScope = (d.mainScope || "Zonal").trim();
            const scopeMatch = DATA_SCOPE_OPTIONS.find(
                (o) => o.id.toLowerCase() === rawScope.toLowerCase()
            );
            if (grp === "corporate" && scopeMatch) {
                setDataScope(scopeMatch.id);
            } else {
                setDataScope(null);
            }
            if (grp === "corporate" && scopeMatch && isSpecificOrAllScope(scopeMatch.id)) {
                const bid = [
                    ...new Set(
                        d.roleAccess
                            .map((a) => a.branchId)
                            .filter(
                                (b): b is number =>
                                    typeof b === "number" && !Number.isNaN(b) && b > 0
                            )
                    ),
                ];
                setCorporateSelectedBranchIds(bid.map(String));
                setCorporateFacilityTypes({ hospital: false, clinic: false });
                setHospitalZones([]);
                setHospitalRegions([]);
                setClinicZones([]);
                setClinicRegions([]);
                setFacilitySelectedBranchId("");
            } else if (grp === "facility") {
                setCorporateSelectedBranchIds([]);
                const branchIds = [
                    ...new Set(
                        d.roleAccess
                            .map((a) => a.branchId)
                            .filter((b): b is number => typeof b === "number" && !Number.isNaN(b) && b > 0)
                    ),
                ];
                setFacilitySelectedBranchId(branchIds[0] != null ? String(branchIds[0]) : "");
                setCorporateFacilityTypes({ hospital: false, clinic: false });
                setHospitalZones([]);
                setHospitalRegions([]);
                setClinicZones([]);
                setClinicRegions([]);
                editingRoleDetailRef.current = d;
                facilityEditPermHydrateKeyRef.current = "";
                facilityPermCatalogKeyRef.current = "";
            } else {
                setCorporateSelectedBranchIds([]);
                const scopeTypes = d.roleAccess.map((a) => a.roleScopeType.toLowerCase());
                const hasHospital = scopeTypes.some((s) => s.includes("hospital"));
                const hasClinic = scopeTypes.some((s) => s.includes("clinic"));
                setCorporateFacilityTypes({ hospital: hasHospital, clinic: hasClinic });
                const zones = [
                    ...new Set(
                        d.roleAccess.map((a) => a.state?.zone).filter((z): z is string => Boolean(z && z.trim()))
                    ),
                ];
                const regions = [
                    ...new Set(
                        d.roleAccess.map((a) => a.state?.name).filter((n): n is string => Boolean(n && n.trim()))
                    ),
                ];
                setHospitalZones(zones.length ? zones : []);
                setHospitalRegions(regions.length ? regions : []);
                setClinicZones(zones.length ? zones : []);
                setClinicRegions(regions.length ? regions : []);
                setFacilitySelectedBranchId("");
                editingRoleDetailRef.current = d;
                corporateEditPermHydrateKeyRef.current = "";
                corporatePermCatalogKeyRef.current = "";
            }
            if (grp === "corporate") {
                editingRoleDetailRef.current = d;
                const detailPerms = permissionsFromRoleDetail(
                    d,
                    permissionSections,
                    moduleIdsBySection
                );
                setPermissions(corporateDownloadViewPermState(detailPerms));
            } else {
                setPermissions(emptyPermStateFor(permissionSections));
            }
            setPhaseStep(grp === "facility" ? 1 : 4);
        } catch {
            showMessage("error", "Could not load role for editing.");
            closeWizard();
        }
    };

    const errText = (e: unknown): string => {
        if (e && typeof e === "object" && "data" in e) {
            const d = (e as { data?: { message?: string } }).data;
            if (d?.message && typeof d.message === "string") return d.message;
        }
        return "Something went wrong while saving the role.";
    };

    const defineStepNumber = wizardMode === "create" ? 2 : 1;
    const chooseScopeStepNumber = wizardMode === "create" ? 3 : 2;
    const configureScopeStepNumber = wizardMode === "create" ? 4 : 3;
    const permissionsStepNumber = wizardMode === "create" ? (activeGroup === "facility" ? 3 : 5) : activeGroup === "facility" ? 2 : 4;

    const isDefineStep = activeGroup && phaseStep === defineStepNumber;
    const isChooseScopeStep = activeGroup === "corporate" && phaseStep === chooseScopeStepNumber;
    const isConfigureScopeStep = activeGroup === "corporate" && phaseStep === configureScopeStepNumber;
    const isPermissionsStep = activeGroup && phaseStep === permissionsStepNumber;

    const isCorporatePermMatrix = activeGroup === "corporate" && Boolean(isPermissionsStep);

    /** Corporate roles: only Download + View columns; Facility shows all five. */
    const visiblePermColumns: (keyof PermCell)[] = useMemo(() => {
        const corporateWizard = activeGroup === "corporate" && Boolean(isPermissionsStep);
        const corporateManage = manageView?.roleGroup === "corporate";
        if (corporateWizard || corporateManage) {
            return ["download", "view"];
        }
        return [...PERM_MATRIX_COLUMNS];
    }, [activeGroup, isPermissionsStep, manageView?.roleGroup]);

    useEffect(() => {
        if (!isCorporatePermMatrix) return;
        setPermissions((prev) => {
            let dirty = false;
            const next = { ...prev };
            for (const sec of permissionSections) {
                const rows = next[sec.id];
                if (!rows?.length) continue;
                if (!rows.some((r) => r.add || r.edit || r.delete)) continue;
                dirty = true;
                next[sec.id] = rows.map((r) => ({
                    download: r.download,
                    view: r.view,
                    add: false,
                    edit: false,
                    delete: false,
                }));
            }
            return dirty ? next : prev;
        });
    }, [isCorporatePermMatrix, permissionSections]);

    const stepperLabels = useMemo(() => {
        if (!activeGroup) return [];
        if (activeGroup === "facility") {
            return ["Create the Role", "Assign Permissions"];
        }
        return ["Define Role Name", "Choose Data Scope", "Configure Scope", "Assign Permissions"];
    }, [activeGroup]);

    const facilityStepperIndex = useMemo(() => {
        if (!activeGroup || activeGroup !== "facility") return 0;
        if (phaseStep <= defineStepNumber) return 0;
        return 1;
    }, [activeGroup, phaseStep, defineStepNumber]);

    const corporateStepperIndex = useMemo(() => {
        if (!activeGroup || activeGroup !== "corporate") return 0;
        if (phaseStep <= defineStepNumber) return 0;
        if (phaseStep <= chooseScopeStepNumber) return 1;
        if (phaseStep <= configureScopeStepNumber) return 2;
        return 3;
    }, [activeGroup, phaseStep, defineStepNumber, chooseScopeStepNumber, configureScopeStepNumber]);

    const handleWizardBack = () => {
        if (wizardMode === "create" && phaseStep === 1) {
            closeWizard();
            return;
        }
        if (wizardMode === "edit" && phaseStep === 1) {
            closeWizard();
            return;
        }
        if (wizardMode === "create" && phaseStep === 2) {
            setPhaseStep(1);
            setSelectedGroup(null);
            return;
        }
        if (
            wizardMode === "create" &&
            activeGroup === "corporate" &&
            phaseStep === 5 &&
            isSpecificOrAllScope(dataScope)
        ) {
            setPhaseStep(3);
            return;
        }
        if (
            wizardMode === "edit" &&
            activeGroup === "corporate" &&
            phaseStep === 4 &&
            isSpecificOrAllScope(dataScope)
        ) {
            setPhaseStep(2);
            return;
        }
        setPhaseStep((s) => s - 1);
    };

    const validateDefineFacility = () => {
        const errors = { roleName: "", branch: "" };
        if (!roleName.trim()) {
            errors.roleName = "Please enter role name.";
        }
        const bid = Number.parseInt(facilitySelectedBranchId.trim(), 10);
        if (!facilitySelectedBranchId.trim() || !Number.isFinite(bid) || bid <= 0) {
            errors.branch = "Please select a branch.";
        }
        if (errors.roleName || errors.branch) {
            setDefineErrors(errors);
            return false;
        }
        setDefineErrors({ roleName: "", branch: "" });
        return true;
    };

    const validateDefineCorporate = () => {
        if (!roleName.trim()) {
            setDefineErrors((prev) => ({ ...prev, roleName: "Please enter role name." }));
            return false;
        }
        setDefineErrors({ roleName: "", branch: "" });
        return true;
    };

    const validateChooseScope = () => {
        if (!dataScope) {
            showMessage("error", "Please select a data scope.");
            return false;
        }
        if (isZonalOrRegionalScope(dataScope)) {
            if (!corporateFacilityTypes.hospital && !corporateFacilityTypes.clinic) {
                showMessage("error", "Select at least one facility type (Hospital or Clinic).");
                return false;
            }
        } else if (dataScope === "Specific") {
            if (corporateSelectedBranchIds.length === 0) {
                showMessage("error", "Select at least one branch.");
                return false;
            }
        }
        return true;
    };

    const validateConfigureScope = () => {
        const requiresZone = dataScope === "Zonal";
        if (corporateFacilityTypes.hospital) {
            const hospitalPickedInSource = hospitalRegions.filter((r) =>
                hospitalRegionSource.some((label) => label === r)
            );
            if (
                (requiresZone && hospitalZones.length === 0) ||
                hospitalPickedInSource.length === 0
            ) {
                showMessage(
                    "error",
                    requiresZone
                        ? "For Hospital, select at least one zone and one region / state."
                        : "For Hospital, select at least one region / state."
                );
                return false;
            }
        }
        if (corporateFacilityTypes.clinic) {
            const clinicPickedInSource = clinicRegions.filter((r) =>
                clinicRegionSource.some((label) => label === r)
            );
            if (
                (requiresZone && clinicZones.length === 0) ||
                clinicPickedInSource.length === 0
            ) {
                showMessage(
                    "error",
                    requiresZone
                        ? "For Clinic, select at least one zone and one region / state."
                        : "For Clinic, select at least one region / state."
                );
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (wizardMode === "create" && phaseStep === 1) {
            if (!selectedGroup) {
                showMessage("error", "Please select Facility Role or Corporate Role.");
                return;
            }
            setPhaseStep(2);
            return;
        }

        if (activeGroup === "facility" && isDefineStep) {
            if (!validateDefineFacility()) return;
            setPhaseStep(phaseStep + 1);
            return;
        }

        if (activeGroup === "corporate" && isDefineStep) {
            if (!validateDefineCorporate()) return;
            setPhaseStep(phaseStep + 1);
            return;
        }

        if (activeGroup === "corporate" && isChooseScopeStep) {
            if (!validateChooseScope()) return;
            if (isSpecificOrAllScope(dataScope)) {
                setPhaseStep(permissionsStepNumber);
            } else {
                setPhaseStep(phaseStep + 1);
            }
            return;
        }

        if (activeGroup === "corporate" && isConfigureScopeStep) {
            if (!validateConfigureScope()) return;
            setPhaseStep(phaseStep + 1);
            return;
        }
    };

    const submitRole = async () => {
        if (!canView) return;
        if (wizardMode === "create" && !canAdd) return;
        if (wizardMode === "edit" && !canEdit) return;
        if (!selectedGroup) return;
        let permsPayload = buildPermissionsPayload(
            moduleIdsBySection,
            permissions,
            permissionSections
        );
        if (selectedGroup === "corporate") {
            permsPayload = permsPayload.map((p) => ({
                ...p,
                canAdd: false,
                canEdit: false,
                canDelete: false,
            }));
        }
        if (permsPayload.length === 0) {
            showMessage(
                "error",
                "No module permissions to save. Wait for the module list to load, then try again."
            );
            return;
        }
        if (
            wizardMode === "create" &&
            selectedGroup === "corporate" &&
            dataScope &&
            isZonalOrRegionalScope(dataScope)
        ) {
            if (!validateConfigureScope()) return;
        }
        if (submitRoleInFlightRef.current || isCreating || isUpdating) return;
        submitRoleInFlightRef.current = true;
        setIsRoleSubmitting(true);
        try {
            const corporateBranchIdsNumeric = corporateSelectedBranchIds
                .map((s) => Number.parseInt(s, 10))
                .filter((n) => !Number.isNaN(n));
            const facilityBranchForAccess =
                selectedGroup === "facility"
                    ? (() => {
                          const n = Number.parseInt(facilitySelectedBranchId.trim(), 10);
                          return Number.isFinite(n) && n > 0 ? n : null;
                      })()
                    : null;
            if (wizardMode === "create") {
                const createRoleCategoryType =
                    selectedGroup === "corporate"
                        ? "CORPORATE"
                        : roleNameOption === "Doctor"
                          ? "facility_doctor"
                          : roleNameOption === "Nurse"
                            ? "facility_nurse"
                            : roleNameOption === "Therapist"
                              ? "facility_therapist"
                              : "FACILITY";

                await createRoles({
                    name: roleName.trim(),
                    roleCategoryType: createRoleCategoryType,
                    mainScope:
                        selectedGroup === "facility" ? "Specific" : (dataScope || "Zonal"),
                    roleAccess: buildRoleAccessForCreate(
                        selectedGroup,
                        dataScope,
                        facilityBranchForAccess,
                        corporateFacilityTypes,
                        hospitalRegions,
                        clinicRegions,
                        hospitalStateOptions,
                        clinicStateOptions,
                        selectedGroup === "corporate" ? corporateBranchIdsNumeric : [],
                        indiaStatesData?.data ?? []
                    ),
                    permissions: permsPayload,
                    roleDescription: roleDescription.trim() || undefined,
                }).unwrap();
                showMessage("success", "Role created successfully.");
            } else {
                if (editingRoleId == null) return;
                await updateRoleMutation({
                    roleId: editingRoleId,
                    body: {
                        name: roleName.trim(),
                        roleCategoryType: editingRoleCategoryType,
                        mainScope: selectedGroup === "facility" ? "Facility" : (dataScope || "Zonal"),
                        isActive: editingIsActive,
                        permissions: permsPayload,
                        roleDescription: roleDescription.trim() || undefined,
                    },
                }).unwrap();
                showMessage("success", "Role updated successfully.");
            }
        } catch (e: unknown) {
            showMessage("error", errText(e));
        } finally {
            submitRoleInFlightRef.current = false;
            setIsRoleSubmitting(false);
        }
    };

    const handlePrimaryAction = () => {
        if (isPermissionsStep) {
            if (
                submitRoleInFlightRef.current ||
                isRoleSubmitting ||
                isCreating ||
                isUpdating ||
                modulesLoading
            ) {
                return;
            }
            void submitRole();
            return;
        }
        handleNext();
    };

    const toggleCorporateFacilityType = (key: "hospital" | "clinic") => {
        setCorporateFacilityTypes((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleZone = (
        facility: "hospital" | "clinic",
        zone: string,
        selected: boolean
    ) => {
        const setter = facility === "hospital" ? setHospitalZones : setClinicZones;
        setter((prev) => (selected ? [...prev, zone] : prev.filter((z) => z !== zone)));
    };

    const toggleRegion = (
        facility: "hospital" | "clinic",
        region: string,
        selected: boolean
    ) => {
        const setter = facility === "hospital" ? setHospitalRegions : setClinicRegions;
        setter((prev) => (selected ? [...prev, region] : prev.filter((r) => r !== region)));
    };

    const setAllRegions = (
        facility: "hospital" | "clinic",
        all: boolean,
        source: readonly string[]
    ) => {
        const setter = facility === "hospital" ? setHospitalRegions : setClinicRegions;
        setter(all ? [...source] : []);
    };

    const permAllSelectedForSection = (sectionId: string, col: keyof PermCell) => {
        const rows = permissions[sectionId];
        if (!rows?.length) return false;
        return rows.every((r) => r[col]);
    };

    const corporatePermColEnabled = (col: keyof PermCell) =>
        col === "download" || col === "view";

    const togglePermHeaderCol = (sectionId: string, col: keyof PermCell) => {
        if (activeGroup === "corporate" && !corporatePermColEnabled(col)) return;
        const nextVal = !permAllSelectedForSection(sectionId, col);
        setPermissions((prev) => {
            const sectionRows = prev[sectionId];
            if (!sectionRows?.length) return prev;
            return {
                ...prev,
                [sectionId]: sectionRows.map((r) => ({ ...r, [col]: nextVal })),
            };
        });
    };

    const togglePermRowAll = (sectionId: string, rowIndex: number) => {
        if (activeGroup === "corporate") {
            const row = permissions[sectionId]?.[rowIndex];
            if (!row) return;
            const allCorporateOn = row.download && row.view;
            const next = !allCorporateOn;
            setPermissions((prev) => {
                const sectionRows = prev[sectionId];
                if (!sectionRows?.length || rowIndex >= sectionRows.length) return prev;
                const copy = [...sectionRows];
                copy[rowIndex] = {
                    download: next,
                    view: next,
                    add: false,
                    edit: false,
                    delete: false,
                };
                return { ...prev, [sectionId]: copy };
            });
            return;
        }
        const row = permissions[sectionId]?.[rowIndex];
        if (!row) return;
        const allOn = row.download && row.view && row.add && row.edit && row.delete;
        const next = !allOn;
        setPermissions((prev) => {
            const sectionRows = prev[sectionId];
            if (!sectionRows?.length || rowIndex >= sectionRows.length) return prev;
            const copy = [...sectionRows];
            copy[rowIndex] = {
                download: next,
                view: next,
                add: next,
                edit: next,
                delete: next,
            };
            return { ...prev, [sectionId]: copy };
        });
    };

    const togglePermCell = (sectionId: string, rowIndex: number, col: keyof PermCell) => {
        if (activeGroup === "corporate" && !corporatePermColEnabled(col)) return;
        setPermissions((prev) => {
            const sectionRows = prev[sectionId];
            if (!sectionRows?.length || rowIndex >= sectionRows.length) return prev;
            const copy = [...sectionRows];
            const r = { ...copy[rowIndex], [col]: !copy[rowIndex][col] };
            copy[rowIndex] = r;
            return { ...prev, [sectionId]: copy };
        });
    };

    const toggleSectionRowSelectAll = (sectionId: string) => {
        const rows = permissions[sectionId];
        if (!rows?.length) return;

        if (activeGroup === "corporate") {
            const allOn = rows.every((r) => r.download && r.view);
            const next = !allOn;
            setPermissions((prev) => {
                const sectionRows = prev[sectionId];
                if (!sectionRows?.length) return prev;
                return {
                    ...prev,
                    [sectionId]: sectionRows.map(() => ({
                        download: next,
                        view: next,
                        add: false,
                        edit: false,
                        delete: false,
                    })),
                };
            });
            return;
        }
        const allRowChecksOn = rows.every((_, i) => {
            const r = rows[i];
            return r.download && r.view && r.add && r.edit && r.delete;
        });
        const next = !allRowChecksOn;
        setPermissions((prev) => {
            const sectionRows = prev[sectionId];
            if (!sectionRows?.length) return prev;
            return {
                ...prev,
                [sectionId]: sectionRows.map(() => ({
                    download: next,
                    view: next,
                    add: next,
                    edit: next,
                    delete: next,
                })),
            };
        });
    };

    const renderStepperFacility = () => (
        <div className="grid grid-cols-2 gap-2">
            {stepperLabels.map((label, i) => (
                <div key={label} className="flex-1">
                    <p
                        className={`mb-2 text-[12px] leading-[18px] ${
                            i <= facilityStepperIndex ? "font-medium text-[#313131]" : "text-[#313131]"
                        }`}
                    >
                        {label}
                    </p>
                    <div
                        className={`h-2 rounded-full ${
                            i <= facilityStepperIndex ? "bg-[#0B8C00]" : "bg-[#EBEBEB]"
                        }`}
                    />
                </div>
            ))}
        </div>
    );

    const renderStepperCorporate = () => (
        <div className="grid grid-cols-4 gap-2">
            {stepperLabels.map((label, i) => (
                <div key={label} className="flex-1">
                    <p
                        className={`mb-2 text-[12px] leading-[18px] ${
                            i <= corporateStepperIndex ? "font-medium text-[#313131]" : "text-[#313131]"
                        }`}
                    >
                        {label}
                    </p>
                    <div
                        className={`h-2 rounded-full ${
                            i <= corporateStepperIndex ? "bg-[#0B8C00]" : "bg-[#EBEBEB]"
                        }`}
                    />
                </div>
            ))}
        </div>
    );

    const renderPillCheckbox = (
        selected: boolean,
        onToggle: () => void,
        label: string,
        id: string
    ) => (
        <div
            className={
                selected
                    ? "rounded-[20px] border border-[rgba(11,140,0,0.2)] bg-[rgba(11,140,0,0.05)] px-6 py-3"
                    : "rounded-[20px] border border-[rgba(208,213,221,0.2)] bg-[rgba(208,213,221,0.05)] px-6 py-3"
            }
        >
            <AlignedCheckbox
                id={id}
                checked={selected}
                onChange={onToggle}
                label={
                    <span className="font-inter text-[12px] font-normal leading-[120%] text-[#434956]">
                        {label}
                    </span>
                }
            />
        </div>
    );

    const renderScopeFacilityCard = (
        title: string,
        facility: "hospital" | "clinic",
        showZone: boolean,
        zones: string[],
        regions: string[],
        regionSource: readonly string[]
    ) => (
        <div className="mb-3 rounded-[20px] border border-[#DFE0E2] p-4">
            <h4 className="mb-4 text-[16px] font-medium leading-[120%] text-[#434956]">{title}</h4>
            {showZone && (
                <div className="mb-4">
                    <label className="mb-2 block text-[12px] font-normal leading-[120%] text-[#525763]">
                        Zone
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                        {ZONES.map((zone) => {
                            const selected = zones.includes(zone);
                            return (
                                <div key={zone}>
                                    {renderPillCheckbox(
                                        selected,
                                        () => toggleZone(facility, zone, !selected),
                                        zone,
                                        `${facility}-zone-${zone}`
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-normal leading-[120%] text-[#525763]">
                        Regions / States
                    </span>
                    <AlignedCheckbox
                        id={`${facility}-regions-select-all`}
                        checked={
                            regionSource.length > 0 && regions.length === regionSource.length
                        }
                        onChange={() =>
                            setAllRegions(
                                facility,
                                !(
                                    regionSource.length > 0 &&
                                    regions.length === regionSource.length
                                ),
                                regionSource
                            )
                        }
                        label={
                            <span className="font-inter text-[12px] font-normal leading-[120%] text-[#434956]">
                                Select All
                            </span>
                        }
                    />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    {regionSource.map((region) => {
                        const selected = regions.includes(region);
                        return (
                            <div key={region}>
                                {renderPillCheckbox(
                                    selected,
                                    () => toggleRegion(facility, region, !selected),
                                    region,
                                    `${facility}-region-${region}`
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const wizardTitle =
        wizardMode === "edit"
            ? "Edit Role"
            : phaseStep === 1 && wizardMode === "create"
              ? "Create Roles Master"
              : "Create Role";

    const nextArrow = (
        <svg width={20} fill="white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M566.6 342.6C579.1 330.1 579.1 309.8 566.6 297.3L406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3C348.8 149.8 348.8 170.1 361.3 182.6L466.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L466.7 352L361.3 457.4C348.8 469.9 348.8 490.2 361.3 502.7C373.8 515.2 394.1 515.2 406.6 502.7L566.6 342.7z" />
        </svg>
    );

    return (
        <AppShell>
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

            <Dialog
                open={dataScopeDialogOpen}
                onClose={closeDataScopeViewAllDialog}
                title="View Data Scope"
                width={772}
            >
                <div className="flex flex-wrap gap-2">
                    {dataScopeDialogItems.map((item, idx) => (
                        <span
                            key={`${item}-${idx}`}
                            className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-5 text-xs font-semibold leading-[120%] text-[#9A7909]"
                        >
                            {item}
                        </span>
                    ))}
                </div>
            </Dialog>

            {!isRoleWizardOpen && !manageView && !manageLoading && (
                <div className="space-y-8">
                    <div className="flex items-start justify-between">
                        <PageHeading title="Role Master" />
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        {!canView ? (
                        <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view role master.
                        </div>
                        ) : (
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[#434956]"></h2>

                                <div className="flex items-center gap-3">
                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <FormSelectField
                                            label=""
                                            hideLabel
                                            options={[
                                                // { label: "None", value: "" },
                                                { label: "Facility", value: "facility" },
                                                { label: "Corporate", value: "corporate" },
                                            ]}
                                            placeholder="Select Group Role"
                                            mode="single"
                                            background="normal"
                                            width={300}
                                            value={roleListRoleCatType ?? "none"}
                                            onChange={(val) => {
                                                const v = typeof val === "string" ? val : "";
                                                if (v === "facility" || v === "corporate") {
                                                    setRoleListRoleCatType(v);
                                                } else {
                                                    setRoleListRoleCatType(null);
                                                }
                                            }}
                                        />
                                    </div>
                                    {roleListRoleCatType === "facility" ? (
                                        <div className="flex-shrink-0" style={{ width: "300px" }}>
                                            <FormSelectField
                                                label=""
                                                hideLabel
                                                options={branchFilterOptions.filter((option) => option.label !== "All Branches")}
                                                value={selectedBranchFilter}
                                                onChange={(value) => {
                                                    setSelectedBranchFilter(
                                                        Array.isArray(value) ? value[0] ?? "" : value || ""
                                                    );
                                                    setListPage(1);
                                                }}
                                                placeholder={
                                                    isLoadingBranchFilter ? "Loading branches…" : "Select branch"
                                                }
                                                mode="single"
                                                background="normal"
                                                width={300}
                                                disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                                            />
                                        </div>
                                    ) : null}
                                    
                                    <div className="flex-shrink-0" style={{ width: "300px" }}>
                                        <TableSearchInput
                                            value={roleListSearchInput}
                                            placeholder="Search Here..."
                                            onChange={setRoleListSearchInput}
                                            isLoading={rolesFetching && !rolesLoading}
                                        />
                                    </div>
                                    {canAdd ? (
                                    <button
                                        type="button"
                                        onClick={openCreateRole}
                                        className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                        <span className="text-hide">Create Role</span>
                                    </button>
                                    ) : null}
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        <TableHead position="first">Sr no.</TableHead>
                                        <TableHead
                                            // sortable
                                            // sortDirection={
                                            //     rolesListSort.field === "rolename"
                                            //         ? rolesListSort.order
                                            //         : null
                                            // }
                                            // onSort={() => setRolesListSortByColumn("rolename")}
                                        >
                                            Role Name
                                        </TableHead>
                                        <TableHead
                                            // sortable
                                            // sortDirection={
                                            //     rolesListSort.field === "roleGroup"
                                            //         ? rolesListSort.order
                                            //         : null
                                            // }
                                            // onSort={() => setRolesListSortByColumn("roleGroup")}
                                        >
                                            Role Group
                                        </TableHead>
                                        <TableHead
                                            // sortable
                                            // sortDirection={
                                            //     rolesListSort.field === "zonal"
                                            //         ? rolesListSort.order
                                            //         : null
                                            // }
                                            // onSort={() => setRolesListSortByColumn("zonal")}
                                        >
                                            Data Scope
                                        </TableHead>
                                        <TableHead>Permissions</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead position="last">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rolesLoading ? (
                                        <TableRow>
                                            <TableData colSpan={7}>
                                                <span className="text-sm text-[#525763]">Loading roles…</span>
                                            </TableData>
                                        </TableRow>
                                    ) : roles.length === 0 ? (
                                        <TableRow>
                                            <TableData colSpan={7}>
                                                <span className="text-sm text-[#525763]">No roles found.</span>
                                            </TableData>
                                        </TableRow>
                                    ) : (
                                        roles.map((row, idx) => {
                                            const scopeItems = row.roleScopeTypes ?? [];
                                            const preview = scopeItems.slice(0, 4);
                                            const rest = Math.max(0, scopeItems.length - preview.length);
                                            const groupLabel = formatRoleGroupColumnLabel(row.roleCategoryType);
                                            const superAdminLocked = isSuperAdminRoleRow(row);
                                            const doctorLocked = isDoctorRoleRow(row);
                                            const roleActionsLocked = superAdminLocked || doctorLocked;
                                            const managePermissionsTitle = superAdminLocked
                                                ? "Super Admin roles cannot be managed here"
                                                : doctorLocked
                                                  ? "Doctor roles cannot be managed here"
                                                  : undefined;
                                            const editRoleTitle = superAdminLocked
                                                ? "Super Admin roles cannot be edited here"
                                                : doctorLocked
                                                  ? "Doctor roles cannot be edited here"
                                                  : undefined;
                                            const permissionCountDisplay =
                                                typeof row.permissionCount === "number" &&
                                                !Number.isNaN(row.permissionCount)
                                                    ? row.permissionCount
                                                    : "—";
                                            return (
                                                <TableRow key={row.id}>
                                                    <TableData>{(listPage - 1) * listLimit + idx + 1}</TableData>
                                                    <TableData>{row.name}</TableData>
                                                    <TableData>{groupLabel}</TableData>
                                                    <TableData>
                                                        <div className="flex flex-row flex-wrap items-center gap-1">
                                                            {preview.map((raw, scopeIdx) => (
                                                                <span
                                                                    key={`${raw}-${scopeIdx}`}
                                                                    className="rounded-full border border-[rgba(253,199,15,0.32)] bg-[rgba(253,199,15,0.05)] px-5 py-2 text-[12px] font-normal leading-[120%] text-[#434956]"
                                                                >
                                                                    {formatRoleScopeTypeLabel(raw)}
                                                                </span>
                                                            ))}
                                                            {rest > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openDataScopeViewAllDialog(
                                                                            scopeItems.map(formatRoleScopeTypeLabel)
                                                                        )
                                                                    }
                                                                    className="rounded-full border border-[rgba(253,199,15,0.32)] bg-[rgba(253,199,15,0.05)] px-5 py-2 text-left text-[12px] font-semibold leading-[120%] text-[#9A7909] opacity-90 transition-opacity hover:opacity-100"
                                                                >
                                                                    View all +{rest}
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </TableData>
                                                    <TableData>{permissionCountDisplay}</TableData>
                                                    <TableData>
                                                        <span className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border border-[#0B8C00]/20 bg-white py-2 px-5 text-xs leading-[120%] text-[#0B8C00]">
                                                            Active
                                                        </span>
                                                    </TableData>
                                                    <TableData>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={roleActionsLocked}
                                                                title={managePermissionsTitle}
                                                                onClick={() => {
                                                                    if (roleActionsLocked) return;
                                                                    void openManagePermissions(row.id);
                                                                }}
                                                                className={`flex h-9 items-center justify-center gap-1 rounded-[32px] border border-[#0B8C00] bg-[#0B8C00] px-4 text-sm font-medium text-white transition-colors ${
                                                                    roleActionsLocked
                                                                        ? "cursor-not-allowed opacity-50"
                                                                        : "cursor-pointer hover:bg-[#18751b]"
                                                                }`}
                                                            >
                                                                View Permissions
                                                            </button>
                                                            {canEdit ? (
                                                            <button
                                                                type="button"
                                                                disabled={roleActionsLocked}
                                                                title={editRoleTitle}
                                                                onClick={() => {
                                                                    if (roleActionsLocked) return;
                                                                    void openEditRole(row.id);
                                                                }}
                                                                className={`flex h-9 items-center justify-center gap-1 rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors ${
                                                                    roleActionsLocked
                                                                        ? "cursor-not-allowed opacity-50"
                                                                        : "cursor-pointer hover:bg-[#0B8C00] hover:text-white"
                                                                }`}
                                                            >
                                                                Edit Role
                                                            </button>
                                                            ) : null}
                                                        </div>
                                                    </TableData>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                            {!rolesLoading && roles.length > 0 ? (
                                <Pagination
                                    currentPage={listPage}
                                    totalItems={Math.max(rolesListTotalItems, roles.length)}
                                    itemsPerPage={listLimit}
                                    onPageChange={setListPage}
                                    onItemsPerPageChange={setListLimit}
                                    itemsPerPageOptions={[10, 20, 50, 100]}
                                />
                            ) : null}
                        </div>
                        )}
                    </ListBorder>
                </div>
            )}

            {isRoleWizardOpen && wizardMode === "create" && phaseStep === 1 && (
                <div className="mx-auto w-full space-y-8 lg:w-[850px]">
                    <div className="flex items-center justify-between">
                        <PageHeading title={wizardTitle} />
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[#434956]">Select Role Group</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedGroup("facility")}
                                    className={`flex h-auto w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border p-4 text-center transition-colors ${
                                        selectedGroup === "facility"
                                            ? "border-2 border-[#0B8C00] bg-[rgba(11,140,0,0.04)]"
                                            : "border border-[#E3EEE1]"
                                    }`}
                                >
                                    <img src="/icons/FacilityRole.svg" alt="Facility Role" />
                                    <p className="text-center font-['Inter'] text-[16px] font-semibold leading-[120%] text-[#434956]">
                                        Facility Role
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedGroup("corporate")}
                                    className={`flex h-auto w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border p-4 text-center transition-colors ${
                                        selectedGroup === "corporate"
                                            ? "border-2 border-[#0B8C00] bg-[rgba(11,140,0,0.04)]"
                                            : "border border-[#E3EEE1]"
                                    }`}
                                >
                                    <img src="/icons/CorporateRole.svg" alt="Corporate Role" />
                                    <p className="text-center font-['Inter'] text-[16px] font-semibold leading-[120%] text-[#434956]">
                                        Corporate Role
                                    </p>
                                </button>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <BackToPreviousPageButton onClick={handleWizardBack} />
                                <button
                                    type="button"
                                    onClick={handlePrimaryAction}
                                    className="flex cursor-pointer flex-row items-center justify-center gap-2 rounded-[32px] bg-[#0B8C00] px-6 py-3 text-center font-inter text-sm font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7A00] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span>Next </span>
                                    {nextArrow}
                                </button>
                            </div>
                        </div>
                    </ListBorder>
                </div>
            )}

            {isRoleWizardOpen && activeGroup === "facility" && isDefineStep && (
                <div className="mx-auto w-full space-y-8 lg:w-[850px]">
                    <div className="flex items-center justify-between">
                        <PageHeading title={wizardTitle} />
                        {wizardMode === "edit" && (
                            <BackToPreviousPageButton onClick={closeWizard} />
                        )}
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            {renderStepperFacility()}
                            <form className="mt-6" onSubmit={(e) => e.preventDefault()}>
                                <div className="mb-5">
                                    <h4 className="text-[16px] font-medium leading-[120%] text-[#434956]">
                                        Define Role Name
                                    </h4>
                                    <p className="text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Provide a suitable name for the role based on its scope and
                                        responsibility.
                                    </p>
                                </div>
                                <div className="mb-3">
                                    <FormSelectField
                                        label="Branches *"
                                        options={branchSelectOptions}
                                        value={facilitySelectedBranchId || null}
                                        onChange={(v) => {
                                            setFacilitySelectedBranchId(
                                                typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : ""
                                            );
                                            setDefineErrors((prev) => ({ ...prev, branch: "" }));
                                        }}
                                        placeholder="Select branch"
                                        background="white"
                                        width="100%"
                                        emptyMessage="No branches found."
                                        error={defineErrors.branch || undefined}
                                        disabled={wizardMode === "edit"}
                                    />
                                </div>
                                <div className="mb-5">
                                    <label className="mb-2 block text-[13px] font-medium text-[#434956]">
                                        Role Type <span className="text-[#F6776E]">*</span>
                                    </label>
                                    <div className="flex flex-wrap gap-4">
                                        {ROLE_NAME_PRESET_OPTIONS.map((opt) => {
                                            const isDisabled = wizardMode === "edit" || opt === "Nurse" || opt === "Therapist";
                                            return (
                                                <label key={opt} className={`flex items-center gap-2 ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                                    <input
                                                        type="radio"
                                                        name="roleNameOption-facility"
                                                        value={opt}
                                                        checked={roleNameOption === opt}
                                                        onChange={() => onRoleNameOptionChange(opt)}
                                                        disabled={isDisabled}
                                                        className="h-4 w-4 accent-[#0B8C00] disabled:cursor-not-allowed"
                                                    />
                                                    <span className="text-[14px] text-[#434956]">{opt}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div className="relative mt-3" ref={roleDropdownRef}>
                                        <FormInputField
                                            label={ROLE_DEFINE_NAME_FIELD_COPY[roleNameOption].label}
                                            placeholder={ROLE_DEFINE_NAME_FIELD_COPY[roleNameOption].placeholder}
                                            height={44}
                                            value={roleName}
                                            maxLength={ROLE_WIZARD_TEXT_MAX_LEN}
                                            onChange={onRoleNameChange}
                                            onBlur={onRoleNameBlur}
                                            error={defineErrors.roleName || undefined}
                                            autoComplete="off"
                                        />
                                        {roleDropdownOpen &&
                                            roleDropdownItems.length > 0 &&
                                            isRoleNameSearchSynced && (
                                            <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-2xl border border-[#DFE0E2] bg-white py-1 shadow-lg">
                                                {roleDropdownItems.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            const presetMatch = (["Doctor", "Nurse", "Therapist"] as const).find(
                                                                (o) => o.toLowerCase() === item.name.trim().toLowerCase()
                                                            );
                                                            if (presetMatch) {
                                                                setRoleNameOption(presetMatch);
                                                                setRoleName(presetMatch);
                                                            } else {
                                                                setRoleName(item.name);
                                                            }
                                                            setRoleDropdownOpen(false);
                                                            setRoleDropdownItems([]);
                                                            setDefineErrors((prev) => ({ ...prev, roleName: "" }));
                                                        }}
                                                        className="cursor-pointer px-5 py-2 text-sm text-[#434956] hover:bg-[#F0FAF0]"
                                                    >
                                                        {item.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="mb-5">
                                    <FormTextareaField
                                        label="Role Description"
                                        placeholder="Description"
                                        height={94}
                                        value={roleDescription}
                                        maxLength={ROLE_WIZARD_TEXT_MAX_LEN}
                                        onChange={onRoleDescriptionChange}
                                        onBlur={onRoleDescriptionBlur}
                                    />
                                </div>
                               
                                <div className="mt-4 flex gap-2">
                                    <BackToPreviousPageButton onClick={handleWizardBack} />
                                    <button
                                        type="button"
                                        onClick={handlePrimaryAction}
                                        className="flex cursor-pointer flex-row items-center justify-center gap-2 rounded-[32px] bg-[#0B8C00] px-6 py-3 text-center font-inter text-sm font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7A00] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span>Next </span>
                                        {nextArrow}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </ListBorder>
                </div>
            )}

            {isRoleWizardOpen && activeGroup === "corporate" && isDefineStep && (
                <div className="mx-auto w-full space-y-8 lg:w-[850px]">
                    <div className="flex items-center justify-between">
                        <PageHeading title={wizardTitle} />
                        {wizardMode === "edit" && (
                            <BackToPreviousPageButton onClick={closeWizard} />
                        )}
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            {renderStepperCorporate()}
                            <form className="mt-6" onSubmit={(e) => e.preventDefault()}>
                                <div className="mb-5">
                                    <h4 className="text-[16px] font-medium leading-[120%] text-[#434956]">
                                        Define Role Name
                                    </h4>
                                    <p className="text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Provide a suitable name for the role based on its scope and
                                        responsibility.
                                    </p>
                                </div>
                                <div className="mb-5">
                                    <div className="relative" ref={roleDropdownRef}>
                                        <FormInputField
                                            label="Role Name *"
                                            placeholder="Role Name"
                                            height={44}
                                            value={roleName}
                                            maxLength={ROLE_WIZARD_TEXT_MAX_LEN}
                                            onChange={onRoleNameChange}
                                            onBlur={onRoleNameBlur}
                                            error={defineErrors.roleName || undefined}
                                            autoComplete="off"
                                        />
                                        {roleDropdownOpen &&
                                            roleDropdownItems.length > 0 &&
                                            isRoleNameSearchSynced && (
                                            <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-2xl border border-[#DFE0E2] bg-white py-1 shadow-lg">
                                                {roleDropdownItems.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setRoleName(item.name);
                                                            setRoleDropdownOpen(false);
                                                            setRoleDropdownItems([]);
                                                            setDefineErrors((prev) => ({ ...prev, roleName: "" }));
                                                        }}
                                                        className="cursor-pointer px-5 py-2 text-sm text-[#434956] hover:bg-[#F0FAF0]"
                                                    >
                                                        {item.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="mb-5">
                                    <FormTextareaField
                                        label="Role Description"
                                        placeholder="Description"
                                        height={94}
                                        value={roleDescription}
                                        maxLength={ROLE_WIZARD_TEXT_MAX_LEN}
                                        onChange={onRoleDescriptionChange}
                                        onBlur={onRoleDescriptionBlur}
                                    />
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <BackToPreviousPageButton onClick={handleWizardBack} />
                                    <button
                                        type="button"
                                        onClick={handlePrimaryAction}
                                        className="flex cursor-pointer flex-row items-center justify-center gap-2 rounded-[32px] bg-[#0B8C00] px-6 py-3 text-center font-inter text-sm font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7A00] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span>Next </span>
                                        {nextArrow}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </ListBorder>
                </div>
            )}

            {isRoleWizardOpen && activeGroup === "corporate" && isChooseScopeStep && (
                <div className="mx-auto w-full space-y-8 lg:w-[850px]">
                    <div className="flex items-center justify-between">
                        <PageHeading title={wizardTitle} />
                        {wizardMode === "edit" && (
                            <BackToPreviousPageButton onClick={closeWizard} />
                        )}
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            {renderStepperCorporate()}
                            <form className="mt-6" onSubmit={(e) => e.preventDefault()}>
                                <div className="mb-5">
                                    <h4 className="text-[16px] font-medium leading-[120%] text-[#434956]">
                                        Choose Data Scope
                                    </h4>
                                    <p className="text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Select the level at which the role will have access.
                                    </p>
                                </div>
                                <div className="mb-5">
                                    <label className="mb-2 block text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Data Scope
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {DATA_SCOPE_OPTIONS.map((opt) => {
                                            const selected = dataScope === opt.id;
                                            return (
                                                <div key={opt.id}>
                                                    {renderPillCheckbox(
                                                        selected,
                                                        () => selectCorporateDataScope(opt.id),
                                                        opt.label,
                                                        `scope-${opt.id}`
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {isZonalOrRegionalScope(dataScope) ? (
                                <div className="mb-5">
                                    <label className="mb-2 block text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Facility Type
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div>
                                            {renderPillCheckbox(
                                                corporateFacilityTypes.hospital,
                                                () => toggleCorporateFacilityType("hospital"),
                                                "Hospital",
                                                "corp-ft-hospital"
                                            )}
                                        </div>
                                        <div>
                                            {renderPillCheckbox(
                                                corporateFacilityTypes.clinic,
                                                () => toggleCorporateFacilityType("clinic"),
                                                "Clinic",
                                                "corp-ft-clinic"
                                            )}
                                        </div>
                                    </div>
                                </div>
                                ) : null}
                                {dataScope === "Specific" ? (
                                    <div className="mb-5">
                                        <FormSelectField
                                            label="Branches"
                                            options={branchSelectOptions}
                                            mode="multiple"
                                            value={corporateSelectedBranchIds}
                                            onChange={(vals) =>
                                                setCorporateSelectedBranchIds(
                                                    Array.isArray(vals) ? vals : vals ? [vals] : []
                                                )
                                            }
                                            placeholder="Select one or more branches"
                                            background="normal"
                                            width="100%"
                                            emptyMessage="No branches found."
                                        />
                                    </div>
                                ) : null}
                                <div className="mt-4 flex gap-2">
                                    <BackToPreviousPageButton onClick={handleWizardBack} />
                                    <button
                                        type="button"
                                        onClick={handlePrimaryAction}
                                        className="flex cursor-pointer flex-row items-center justify-center gap-2 rounded-[32px] bg-[#0B8C00] px-6 py-3 text-center font-inter text-sm font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7A00] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span>Next </span>
                                        {nextArrow}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </ListBorder>
                </div>
            )}

            {isRoleWizardOpen &&
                activeGroup === "corporate" &&
                isConfigureScopeStep &&
                isZonalOrRegionalScope(dataScope) && (
                <div className="mx-auto w-full space-y-8 lg:w-[850px]">
                    <div className="flex items-center justify-between">
                        <PageHeading title={wizardTitle} />
                        {wizardMode === "edit" && (
                            <BackToPreviousPageButton onClick={closeWizard} />
                        )}
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            {renderStepperCorporate()}
                            <form className="mt-6" onSubmit={(e) => e.preventDefault()}>
                                <div className="mb-5">
                                    <h4 className="text-[16px] font-medium leading-[120%] text-[#434956]">
                                        Configure Scope
                                    </h4>
                                    <p className="text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Based on the selected data scope, the Admin configures access as
                                        follows.
                                    </p>
                                </div>
                                <div className="mb-5 space-y-3">
                                    <div>
                                        <label className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                            Data Scope
                                        </label>
                                        <h5 className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                            {dataScope
                                                ? DATA_SCOPE_OPTIONS.find((o) => o.id === dataScope)?.label
                                                : "—"}
                                        </h5>
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                            Facility Type
                                        </label>
                                        <h5 className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                            {[
                                                corporateFacilityTypes.hospital ? "Hospital" : null,
                                                corporateFacilityTypes.clinic ? "Clinic" : null,
                                            ]
                                                .filter(Boolean)
                                                .join(", ") || "—"}
                                        </h5>
                                    </div>
                                </div>
                                {corporateFacilityTypes.hospital &&
                                    renderScopeFacilityCard(
                                        "Hospital",
                                        "hospital",
                                        dataScope === "Zonal",
                                        hospitalZones,
                                        hospitalRegions,
                                        hospitalRegionSource
                                    )}
                                {corporateFacilityTypes.clinic &&
                                    renderScopeFacilityCard(
                                        "Clinic",
                                        "clinic",
                                        dataScope === "Zonal",
                                        clinicZones,
                                        clinicRegions,
                                        clinicRegionSource
                                    )}
                                <div className="mt-4 flex gap-2">
                                    <BackToPreviousPageButton onClick={handleWizardBack} />
                                    <button
                                        type="button"
                                        onClick={handlePrimaryAction}
                                        className="flex cursor-pointer flex-row items-center justify-center gap-2 rounded-[32px] bg-[#0B8C00] px-6 py-3 text-center font-inter text-sm font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7A00] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span>Next </span>
                                        {nextArrow}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </ListBorder>
                </div>
            )}

            {isRoleWizardOpen && isPermissionsStep && activeGroup && (
                <div className="mx-auto w-full space-y-8 lg:w-[850px]">
                    <div className="flex items-center justify-between">
                        <PageHeading title={wizardTitle} />
                        {wizardMode === "edit" && (
                            <BackToPreviousPageButton onClick={closeWizard} />
                        )}
                    </div>
                    <ListBorder as="section" className="px-4 py-4">
                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
                            {activeGroup === "facility"
                                ? renderStepperFacility()
                                : renderStepperCorporate()}
                            <form className="mt-6" onSubmit={(e) => e.preventDefault()}>
                                <div className="mb-5">
                                    <h4 className="text-[16px] font-medium leading-[120%] text-[#434956]">
                                        Assign Permissions
                                    </h4>
                                    <p className="text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Select the permissions that should be granted to this role.
                                    </p>
                                </div>
                                <div className="mb-5">
                                    <label className="mb-1 block text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Role Name
                                    </label>
                                    <h5 className="text-sm font-medium leading-[120%] text-[#262D3B]">
                                        {roleName.trim() || "—"}
                                    </h5>
                                </div>
                                <div className="mb-5">
                                    <label className="mb-2 block text-[12px] font-normal leading-[120%] text-[#525763]">
                                        Permissions
                                    </label>
                                    <div className="flex flex-col gap-4">
                                        {permissionSections.map((section) => {
                                            const rowCells = permissions[section.id] ?? [];
                                            return (
                                            <div
                                                key={section.id}
                                                className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white p-5"
                                            >
                                                <button
                                                    type="button"
                                                    className="mb-4 flex w-full cursor-pointer items-center justify-between text-left"
                                                    onClick={() =>
                                                        setExpandedPermSections((e) => ({
                                                            ...e,
                                                            [section.id]: !e[section.id],
                                                        }))
                                                    }
                                                >
                                                    <h3 className="text-[16px] font-semibold leading-[24px] text-[#344054]">
                                                        {section.title}
                                                    </h3>
                                                    <span className="text-lg text-green-600">
                                                        <svg
                                                            width="17"
                                                            height="10"
                                                            viewBox="0 0 17 10"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className={`transition-transform ${expandedPermSections[section.id] ? "" : "rotate-180"}`}
                                                        >
                                                            <path
                                                                d="M1.2002 1.19922L8.4002 8.39922L15.6002 1.19922"
                                                                stroke="#0B8C00"
                                                                strokeWidth={2.4}
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </span>
                                                </button>
                                                {expandedPermSections[section.id] && (
                                                    <table className="w-full table-fixed border-separate border-spacing-y-2">
                                                        <colgroup>
                                                            <col className="min-w-0" />
                                                            {visiblePermColumns.map((_, ci) => (
                                                                <col key={ci} style={{ width: 88 }} />
                                                            ))}
                                                        </colgroup>
                                                        <thead>
                                                            <tr className="border border-[#DFE0E2] text-[12px] text-[#262D3B]">
                                                                <th className="rounded-l-[10px] border border-[#DFE0E2] border-r-0 px-3 py-3 text-left align-middle">
                                                                    <AlignedCheckbox
                                                                        id={`${section.id}-hdr-select-all-rows`}
                                                                        checked={
                                                                            isCorporatePermMatrix
                                                                                ? section.rows.every((_, ri) => {
                                                                                      const r = rowCells[ri];
                                                                                      return Boolean(
                                                                                          r?.download && r?.view
                                                                                      );
                                                                                  })
                                                                                : section.rows.every(
                                                                                      (_, ri) => {
                                                                                          const r = rowCells[ri];
                                                                                          return (
                                                                                              Boolean(
                                                                                                  r?.download
                                                                                              ) &&
                                                                                              Boolean(r?.view) &&
                                                                                              Boolean(r?.add) &&
                                                                                              Boolean(r?.edit) &&
                                                                                              Boolean(r?.delete)
                                                                                          );
                                                                                      }
                                                                                  )
                                                                        }
                                                                        onChange={() =>
                                                                            toggleSectionRowSelectAll(section.id)
                                                                        }
                                                                        label={<span>Select All</span>}
                                                                    />
                                                                </th>
                                                                {visiblePermColumns.map((col, ci) => (
                                                                        <th
                                                                            key={col}
                                                                            className={`border border-[#DFE0E2] border-l-0 border-r-0 px-0 py-3 text-center align-middle ${
                                                                                ci ===
                                                                                visiblePermColumns.length - 1
                                                                                    ? "rounded-r-[10px] border-r-1"
                                                                                    : ""
                                                                            }`}
                                                                        >
                                                                            <div className="flex h-full flex-col items-center justify-center gap-1 px-1">
                                                                                <AlignedCheckbox
                                                                                    id={`${section.id}-hdr-${col}`}
                                                                                    disabled={
                                                                                        isCorporatePermMatrix &&
                                                                                        !corporatePermColEnabled(col)
                                                                                    }
                                                                                    checked={permAllSelectedForSection(
                                                                                        section.id,
                                                                                        col
                                                                                    )}
                                                                                    onChange={() =>
                                                                                        togglePermHeaderCol(
                                                                                            section.id,
                                                                                            col
                                                                                        )
                                                                                    }
                                                                                />
                                                                                <span className="text-center text-[11px] font-normal leading-none text-[#262D3B]">
                                                                                    {PERM_COL_LABELS[col]}
                                                                                </span>
                                                                            </div>
                                                                        </th>
                                                                    ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {section.rows.map((rowLabel, rowIndex) => (
                                                                <tr
                                                                    key={rowLabel}
                                                                    className="border border-[#F1F5F3] bg-white"
                                                                >
                                                                    <td className="min-w-0 rounded-l-[10px] border border-[#DFE0E2] border-r-0 px-3 py-3 align-middle text-[13px] text-[#434956]">
                                                                        <AlignedCheckbox
                                                                            id={`${section.id}-row-${rowIndex}-all`}
                                                                            checked={(() => {
                                                                                const r = rowCells[rowIndex];
                                                                                if (isCorporatePermMatrix) {
                                                                                    return Boolean(
                                                                                        r?.download && r?.view
                                                                                    );
                                                                                }
                                                                                return (
                                                                                    Boolean(r?.download) &&
                                                                                    Boolean(r?.view) &&
                                                                                    Boolean(r?.add) &&
                                                                                    Boolean(r?.edit) &&
                                                                                    Boolean(r?.delete)
                                                                                );
                                                                            })()}
                                                                            onChange={() =>
                                                                                togglePermRowAll(
                                                                                    section.id,
                                                                                    rowIndex
                                                                                )
                                                                            }
                                                                            label={
                                                                                <span className="min-w-0 break-words text-[13px] text-[#434956]">
                                                                                    {rowLabel}
                                                                                </span>
                                                                            }
                                                                        />
                                                                    </td>
                                                                    {visiblePermColumns.map((col, ci) => (
                                                                            <td
                                                                                key={col}
                                                                                className={`border border-[#DFE0E2] border-l-0 px-0 py-2 text-center align-middle ${
                                                                                    ci ===
                                                                                    visiblePermColumns.length - 1
                                                                                        ? "rounded-r-[10px] border-r-1"
                                                                                        : "border-r-0"
                                                                                }`}
                                                                            >
                                                                                <div className="flex min-h-[36px] items-center justify-center px-1">
                                                                                    <AlignedCheckbox
                                                                                        id={`${section.id}-r${rowIndex}-${col}`}
                                                                                        disabled={
                                                                                            isCorporatePermMatrix &&
                                                                                            !corporatePermColEnabled(
                                                                                                col
                                                                                            )
                                                                                        }
                                                                                        checked={
                                                                                            Boolean(
                                                                                                rowCells[rowIndex]?.[
                                                                                                    col
                                                                                                ]
                                                                                            )
                                                                                        }
                                                                                        onChange={() =>
                                                                                            togglePermCell(
                                                                                                section.id,
                                                                                                rowIndex,
                                                                                                col
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                        ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        );
                                        })}
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <BackToPreviousPageButton onClick={handleWizardBack} />
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="large"
                                        isLoading={
                                            isRoleSubmitting || isCreating || isUpdating
                                        }
                                        disabled={modulesLoading}
                                        onClick={handlePrimaryAction}
                                        className="rounded-[32px] px-6 py-3 font-inter text-sm font-medium leading-[120%] shadow-none hover:shadow-none"
                                    >
                                        Submit
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </ListBorder>
                </div>
            )}

            {canView && (manageLoading || manageView) && (
                <div className="mx-auto w-full max-w-[1440px] space-y-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <PageHeading
                            title={
                                manageView
                                    ? manageView.roleGroup === "facility"
                                        ? "Facility Role"
                                        : "Corporate Role"
                                    : "Role permissions"
                            }
                        />
                        <BackToPreviousPageButton onClick={closeManageView} text="Back" />
                    </div>

                    <ListBorder as="section" className="px-4 py-4">
                        {manageLoading ? (
                            <p className="px-4 py-8 text-center text-sm text-[#525763]">
                                Loading permissions…
                            </p>
                        ) : manageView ? (
                        <>
                        {manageView.roleGroup === "corporate" && manageView.scope ? (
                            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white p-5">
                                    <div className="mb-3">
                                        <h4 className="text-[18px] font-medium leading-[120%] text-[#262D3B]">
                                            Scope information
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                                Data Scope
                                            </p>
                                            <p className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                                {formatMainScopeForDisplay(manageView.scope.dataScope)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                                Zone
                                            </p>
                                            <p className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                                {manageView.scope.zone}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                                Regions / States
                                            </p>
                                            <p className="break-words text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                                {manageView.scope.regions}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white p-5">
                                    <div className="mb-3">
                                        <h4 className="text-[18px] font-medium leading-[120%] text-[#262D3B]">
                                            Role Information
                                        </h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                                Role Name
                                            </p>
                                            <p className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                                {manageView.roleName}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                                Role Description
                                            </p>
                                            <p className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                                {manageView.roleDescription}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white p-5">
                                <div className="mb-3">
                                    <h4 className="text-[18px] font-medium leading-[120%] text-[#262D3B]">
                                        Role Information
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                            Role Name
                                        </p>
                                        <p className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                            {manageView.roleName}
                                        </p>
                                    </div>
                                    {manageView.facilityTypeLabel ? (
                                        <div>
                                            <p className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                                Facility Type
                                            </p>
                                            <p className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                                {manageView.facilityTypeLabel}
                                            </p>
                                        </div>
                                    ) : null}
                                    <div className="sm:col-span-2">
                                        <p className="text-[12px] font-normal leading-[120%] text-[#434956]">
                                            Role Description
                                        </p>
                                        <p className="text-[14px] font-medium leading-[120%] text-[#262D3B]">
                                            {manageView.roleDescription}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white p-5">
                            <h4 className="mb-6 text-[18px] font-medium leading-[120%] text-[#262D3B]">
                                Permissions
                            </h4>
                            <div className="flex flex-col gap-4">
                                {manageView.permissionSections.map((section) => (
                                    <div
                                        key={section.id}
                                        className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white p-5"
                                    >
                                        <button
                                            type="button"
                                            className="mb-4 flex w-full cursor-pointer items-center justify-between text-left"
                                            onClick={() =>
                                                setManageSectionOpen((prev) => ({
                                                    ...prev,
                                                    [section.id]: !prev[section.id],
                                                }))
                                            }
                                        >
                                            <h3 className="text-[16px] font-semibold leading-[24px] text-[#344054]">
                                                {section.title}
                                            </h3>
                                            <span className="text-lg text-green-600">
                                                <svg
                                                    width="17"
                                                    height="10"
                                                    viewBox="0 0 17 10"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className={`transition-transform ${manageSectionOpen[section.id] ? "" : "rotate-180"}`}
                                                >
                                                    <path
                                                        d="M1.2002 1.19922L8.4002 8.39922L15.6002 1.19922"
                                                        stroke="#0B8C00"
                                                        strokeWidth={2.4}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </span>
                                        </button>

                                        {manageSectionOpen[section.id] && manageView.permissions[section.id] ? (
                                                    <table className="w-full table-fixed border-separate border-spacing-y-2">
                                                <colgroup>
                                                    <col className="min-w-0" />
                                                    {visiblePermColumns.map((_, ci) => (
                                                        <col key={ci} style={{ width: 88 }} />
                                                    ))}
                                                </colgroup>
                                                <thead>
                                                    <tr className="border border-[#DFE0E2] text-[12px] text-[#262D3B]">
                                                        <th className="rounded-l-[10px] border border-[#DFE0E2] border-r-0 px-3 py-3 text-left align-middle font-normal">
                                                            <span>Select All</span>
                                                        </th>
                                                        {visiblePermColumns.map((col, ci) => (
                                                                <th
                                                                    key={col}
                                                                    className={`border border-[#DFE0E2] border-l-0 border-r-0 px-0 py-3 text-center align-middle font-normal ${
                                                                        ci === visiblePermColumns.length - 1
                                                                            ? "rounded-r-[10px] border-r-1"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <div className="flex flex-col items-center justify-center gap-1 px-1">
                                                                        <span className="text-center text-[11px] leading-none text-[#262D3B]">
                                                                            {PERM_COL_LABELS[col]}
                                                                        </span>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {section.rows.map((rowLabel, rowIndex) => {
                                                        const cell =
                                                            manageView.permissions[section.id][rowIndex];
                                                        if (!cell) return null;
                                                        return (
                                                            <tr
                                                                key={rowLabel}
                                                                className="border border-[#F1F5F3] bg-white"
                                                            >
                                                                <td className="min-w-0 rounded-l-[10px] border border-[#DFE0E2] border-r-0 px-3 py-3 align-middle text-[13px] text-[#434956]">
                                                                    <span className="break-words">{rowLabel}</span>
                                                                </td>
                                                                {visiblePermColumns.map((colKey, ci) => (
                                                                        <td
                                                                            key={colKey}
                                                                            className={`border border-[#DFE0E2] border-l-0 px-0 py-2 text-center align-middle ${
                                                                                ci === visiblePermColumns.length - 1
                                                                                    ? "rounded-r-[10px] border-r-1"
                                                                                    : "border-r-0"
                                                                            }`}
                                                                        >
                                                                            <div className="flex min-h-[36px] items-center justify-center px-1">
                                                                                <ReadOnlyPermBox
                                                                                    allowed={cell[colKey]}
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                    ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                        </>
                        ) : null}
                    </ListBorder>
                </div>
            )}
        </AppShell>
    );
}
