/**
 * Role & Permissions API
 * Base path: /admin/role-and-permissions (under API_BASE_URL …/api/v2)
 */

import { baseApi } from "./baseApi";
import type {
    GetBranchRoleByCategoryTypeParams,
    GetBranchRoleByCategoryTypeResponse,
} from "./settingsApi";

/** Standard API envelope */
export interface RolePermissionApiEnvelope<T> {
    success: boolean;
    data: T;
    message: string;
    /** ISO datetime from API */
    timestamp: string;
    statusCode: number;
}

/* ---------- Create role ---------- */

/** For zonal/regional corporate: `roleScopeType` "Hospital" | "Clinic" + `stateIds`. For specific/all: same as `mainScope` + `branchIds`. */
export interface RoleAccessPayload {
    roleScopeType: string;
    stateIds?: number[];
    branchIds?: number[];
}

export interface RolePermissionPayload {
    subModuleId: number;
    canDownload: boolean;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface CreateRolesRequest {
    name: string;
    /** e.g. "FACILITY" | "CORPORATE" — send as your backend expects */
    roleCategoryType: string;
    /** e.g. "zonal" | "regional" | "facility" */
    mainScope: string;
    roleAccess: RoleAccessPayload[];
    permissions: RolePermissionPayload[];
    roleDescription?: string;
}

export type CreateRolesResponse = RolePermissionApiEnvelope<null>;

/* ---------- List roles ---------- */

export interface RoleListItem {
    id: number;
    name: string;
    roleCategoryType: string;
    mainScope: string;
    isActive?: boolean;
    createdAt: string;
    roleScopeTypes: string[];
    /** Number of permissions assigned to the role; omit if API does not return it. */
    permissionCount?: number;
}

export type GetRolesResponse = RolePermissionApiEnvelope<RoleListItem[]> & {
    total?: number;
    totalPages?: number;
    page?: number;
    limit?: number;
};

export interface GetRolesParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
    /** Filter role list by name / term (backend-supported). */
    search?: string;
    /** Filter by role category: facility vs corporate. */
    roleCatType?: "facility" | "corporate";
    /** Filter by branch. */
    branchId?: number;
}

/* ---------- Role by id (manage permissions / detail) ---------- */

export interface RoleModuleNested {
    id: string;
    parentModule: string;
    moduleName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RolePermissionDetail {
    id: string;
    roleId: string;
    subModuleId: string;
    canDownload?: boolean;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
    module: RoleModuleNested;
}

export interface RoleAccessState {
    id: number;
    name: string;
    countryId: number;
    zone: string | null;
}

export interface RoleAccessItem {
    id: number;
    roleId: number;
    roleScopeType: string;
    stateId: number;
    branchId: number | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
    state: RoleAccessState | null;
    branch: unknown | null;
}

export interface RoleByIdData {
    id: number;
    name: string;
    roleCategoryType: string;
    mainScope: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
    permissions: RolePermissionDetail[];
    roleAccess: RoleAccessItem[];
}

export type GetRoleByIdResponse = RolePermissionApiEnvelope<RoleByIdData>;

export interface GetRoleByIdParams {
    roleId: number | string;
}

/* ---------- Role list dropdown (search) ---------- */

export interface RoleDropdownItem {
    id: number;
    name: string;
}

export interface GetRoleListDropdownParams {
    search?: string;
    /** Scoped search: `facility_doctor` | `facility_nurse` | `facility_therapist` | `facility` | `corporate`. */
    roleCategoryType?: string;
}

export type GetRoleListDropdownResponse = RolePermissionApiEnvelope<RoleDropdownItem[]>;

/* ---------- Update role ---------- */

export interface UpdateRoleRequest {
    name: string;
    roleCategoryType: string;
    mainScope: string;
    isActive: boolean;
    permissions: RolePermissionPayload[];
    roleDescription?: string;
}

export interface UpdateRoleData {
    id: number;
    name: string;
    roleCategoryType: string;
    mainScope: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: number | null;
}

export type UpdateRoleResponse = RolePermissionApiEnvelope<UpdateRoleData>;

export interface UpdateRoleParams {
    roleId: number | string;
    body: UpdateRoleRequest;
}

export interface UpdateRoleStatusRequest {
    roleId: number;
    isActive: boolean;
}

export interface UpdateRoleStatusResponse {
    success: boolean;
    message: string;
    timestamp?: string;
    statusCode?: number;
    data?: unknown;
}

/* ---------- Modules catalog (Settings, User Management, …) ---------- */

/** Child row under a parent module (e.g. GET getListOfmodules?branchId= nested `data[]`). */
export interface ModuleSubItem {
    id: number;
    parentModuleId: number;
    moduleName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

/**
 * Flat list (legacy): many rows with `parentModule` as group name.
 * Nested (branch / new API): parent rows with `subModules` for permission matrix rows.
 */
export interface ModuleListItem {
    id: number | string;
    moduleName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    /** Legacy flat catalog: used to group rows into sections */
    parentModule?: string;
    /** Nested catalog: sub-modules shown as matrix rows under this parent */
    subModules?: ModuleSubItem[];
}

export type GetListOfModulesResponse = RolePermissionApiEnvelope<ModuleListItem[]>;

/** Omit or pass `undefined` for full catalog; `branchId` filters modules for that branch (Facility Role). `roleType` filters by role type (e.g. "doctor", "nurse", "therapist", "other"). */
export type GetListOfModulesArg = { branchId: number; roleType?: string } | undefined;

/* ---------- Public states by zone (configure scope) ---------- */

export interface StateByZoneItem {
    id: number;
    name: string;
    countryId: number;
    zone: string;
}

export type GetStatesByZoneResponse = RolePermissionApiEnvelope<StateByZoneItem[]>;

export interface GetStatesByZoneParams {
    /** e.g. "central", "Central" — match backend */
    zone: string;
}

/* ---------- Branch Role Master ----------
 * GET getBranchesWithRoles · PUT assignRoleToBranches · GET assignableRoles
 */

export interface BranchRoleAssignedBy {
    id: number;
    userName: string;
    email: string;
}

export interface BranchRoleAssignedRole {
    id: number;
    name: string;
    roleCategoryType: string;
    mainScope: string;
    assignedBy: BranchRoleAssignedBy | null;
}

export interface BranchWithRolesRow {
    id: number;
    name: string;
    state: string;
    branchCode: string;
    branchStatus: string;
    roles: BranchRoleAssignedRole[];
}

export interface GetBranchesWithRolesParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
    /** Optional: if backend supports filtering / search */
    search?: string;
    branchId?: number;
}

export type GetBranchesWithRolesResponse = RolePermissionApiEnvelope<BranchWithRolesRow[]> & {
    total?: number;
    totalPages?: number;
    page?: number;
    limit?: number;
};

export interface AssignRoleToBranchesRequest {
    roleId: number;
    branchIds: number[];
}

export type AssignRoleToBranchesResponse = RolePermissionApiEnvelope<null>;

export interface AssignableRoleItem {
    id: number;
    name: string;
    roleCategoryType: string;
    mainScope: string;
}

export type GetAssignableRolesResponse = RolePermissionApiEnvelope<AssignableRoleItem[]>;

export interface GetAssignableRolesParams {
    branchId: number;
    /** From GET /admin/settings/branches `type`: hospital | clinic */
    branchType?: "hospital" | "clinic";
}

export interface DeleteRoleBranchAccessRequest {
    roleId: number;
    branchId: number;
}

export interface DeleteRoleBranchAccessData {
    raw: unknown[];
    affected: number;
}

export type DeleteRoleBranchAccessResponse = RolePermissionApiEnvelope<DeleteRoleBranchAccessData>;

/* ---------- Approval Levels Setup (branch-scoped discount / leave approval tiers) ---------- */

export interface ApprovalLevelSetupItem {
    id: number;
    levelName: string;
    levelCode: string;
    /** null = unlimited */
    maxVariance: number | null;
    maxAmount: number | null;
    /** Backend stores module keys, e.g. "billing", "purchase" */
    modules: string[];
    isActive?: boolean;
}

export interface GetApprovalLevelSetupListParams {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: "asc" | "desc";
}

/** Normalized shape returned by `getApprovalLevelSetupList` after `transformResponse`. */
export interface ApprovalLevelSetupListResult {
    success: boolean;
    message: string;
    levels: ApprovalLevelSetupItem[];
    total: number;
    totalPages?: number;
    page?: number;
    limit?: number;
}

/** POST /approvalLevels and PUT /updateApprovalLevel/:id */
export interface CreateApprovalLevelSetupRequest {
    levelName: string;
    levelCode: string;
    modules: string[];
    maxVariance?: number;
    maxAmount?: number;
}

export interface UpdateApprovalLevelSetupParams {
    id: number;
    body: CreateApprovalLevelSetupRequest;
}

export type CreateApprovalLevelSetupResponse = RolePermissionApiEnvelope<unknown>;
export type UpdateApprovalLevelSetupResponse = RolePermissionApiEnvelope<unknown>;

/** GET getListOfLevelForAssign — minimal id + levelCode for assign-approval dropdowns */
export interface LevelForAssignItem {
    id: number;
    levelCode: string;
}

/** Normalized list for assign UI (after transformResponse). */
export interface ListOfLevelForAssignResult {
    items: LevelForAssignItem[];
}

function normalizeListOfLevelForAssignResponse(raw: unknown): ListOfLevelForAssignResult {
    const env = raw as { data?: unknown };
    const data = env?.data;
    if (!Array.isArray(data)) return { items: [] };
    const items: LevelForAssignItem[] = [];
    for (const row of data) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const id = Number(r.id);
        if (!Number.isFinite(id)) continue;
        const levelCode = String(r.levelCode ?? "").trim();
        if (!levelCode) continue;
        items.push({ id, levelCode });
    }
    return { items };
}

/* ---------- Approval leave assignment (user ↔ level + permission) ---------- */

export interface ApprovalLeaveAssignmentItem {
    id: number;
    userId: number;
    userName: string;
    roleName: string;
    approvalPermission: boolean;
    approvalLevelSetupId: number;
    levelCode: string;
    levelName?: string;
    scopeType?: "facility" | "corporate";
    branchId?: number;
    corporateId?: number;
}

export interface GetApprovalLeaveAssignmentListParams {
    page?: number;
    limit?: number;
    branchId?: number;
    corporateId?: number;
    scopeType?: "facility" | "corporate";
    approvalLevelSetupId?: number;
    search?: string;
    sort?: string;
    order?: "asc" | "desc";
}

export interface ApprovalLeaveAssignmentListResult {
    success: boolean;
    message: string;
    items: ApprovalLeaveAssignmentItem[];
    total: number;
    totalPages?: number;
    page?: number;
    limit?: number;
}

export interface CreateApprovalLeaveAssignmentRequest {
    scopeType: "facility" | "corporate";
    branchId?: number;
    corporateId?: number;
    userId: number;
    approvalLevelSetupId: number;
    approvalPermission: boolean;
}

export interface UpdateApprovalLeaveAssignmentParams {
    id: number;
    body: CreateApprovalLeaveAssignmentRequest;
}

export type CreateApprovalLeaveAssignmentResponse = RolePermissionApiEnvelope<unknown>;
export type UpdateApprovalLeaveAssignmentResponse = RolePermissionApiEnvelope<unknown>;

/* ---------- Assign approval level (GET getAssignApprovalLevel / POST assignApprovalLevel) ---------- */

export interface AssignApprovalLevelListItem {
    id: number;
    isActive: boolean;
    userId: number;
    userName: string;
    roleId: number;
    roleName: string;
    /** When API returns it on nested `role` — used to pre-fill add/edit dialog role group. */
    roleCategoryType?: string | null;
    branchId: number;
    branchName: string;
    approvalLevelId: number;
    levelName: string;
    levelCode: string;
    maxVariance: string | null;
    maxAmount: string | null;
    modules: string[];
}

export interface GetAssignApprovalLevelParams {
    /** Omit to return assignments across branches (list filter is optional). */
    branchId?: number;
    search?: string;
    page?: number;
    limit?: number;
    /** Optional filter if the backend supports it */
    approvalLevelId?: number;
}

export interface AssignApprovalLevelListResult {
    success: boolean;
    message: string;
    items: AssignApprovalLevelListItem[];
    total: number;
    page?: number;
    limit?: number;
}

/** POST /assignApprovalLevel — same shape often used for PUT /assignApprovalLevel/:id */
export interface AssignApprovalLevelRequest {
    userId: number;
    roleId: number;
    branchId: number;
    approvalLevelId: number;
    isActive: boolean;
    createdBy: number | null;
    updatedBy: number | null;
}

/** PATCH /admin/role-and-permissions/updateAssignApprovalLevel */
export interface PatchAssignApprovalLevelRequest {
    id: number;
    approvalLevelId: number;
    isActive: boolean;
}

export type AssignApprovalLevelResponse = RolePermissionApiEnvelope<unknown>;

/** GET /admin/role-and-permissions/getRoleUsers?roleId= */
export interface RoleUserItem {
    id: number;
    userName: string;
    email: string;
}

function normalizeGetRoleUsersResponse(raw: unknown): RoleUserItem[] {
    const root = raw as Record<string, unknown> | null;
    if (!root) return [];
    const outer = root.data as Record<string, unknown> | undefined;
    if (!outer) return [];
    const inner = outer.data;
    if (Array.isArray(inner)) {
        return inner.map((row) => {
            const r = row as Record<string, unknown>;
            return {
                id: Number(r.id),
                userName: String(r.userName ?? r.name ?? ""),
                email: String(r.email ?? ""),
            };
        });
    }
    return [];
}

function normalizeAssignApprovalLevelRow(row: Record<string, unknown>): AssignApprovalLevelListItem {
    const user = row.user as Record<string, unknown> | undefined;
    const role = row.role as Record<string, unknown> | undefined;
    const branch = row.branch as Record<string, unknown> | undefined;
    const approvalLevel = row.approvalLevel as Record<string, unknown> | undefined;
    const id = Number(row.id);
    const isActiveRaw = row.isActive ?? row.is_active;
    const isActive =
        typeof isActiveRaw === "boolean"
            ? isActiveRaw
            : isActiveRaw === 1 ||
                isActiveRaw === "1" ||
                String(isActiveRaw).toLowerCase() === "true";
    const modulesRaw = approvalLevel?.modules;
    return {
        id: Number.isFinite(id) ? id : 0,
        isActive,
        userId: Number(user?.id ?? user?.userId ?? 0),
        userName: String(user?.userName ?? user?.name ?? ""),
        roleId: Number(role?.id ?? 0),
        roleName: String(role?.name ?? ""),
        roleCategoryType:
            role?.roleCategoryType != null ? String(role.roleCategoryType) : undefined,
        branchId: Number(branch?.id ?? 0),
        branchName: String(branch?.name ?? ""),
        approvalLevelId: Number(approvalLevel?.id ?? row.approvalLevelId ?? row.approval_level_id ?? 0),
        levelName: String(approvalLevel?.levelName ?? approvalLevel?.level_name ?? ""),
        levelCode: String(approvalLevel?.levelCode ?? approvalLevel?.level_code ?? ""),
        maxVariance:
            approvalLevel?.maxVariance != null || approvalLevel?.max_variance != null
                ? String(approvalLevel?.maxVariance ?? approvalLevel?.max_variance)
                : null,
        maxAmount:
            approvalLevel?.maxAmount != null || approvalLevel?.max_amount != null
                ? String(approvalLevel?.maxAmount ?? approvalLevel?.max_amount)
                : null,
        modules: Array.isArray(modulesRaw) ? modulesRaw.map((x) => String(x)) : [],
    };
}

function normalizeGetAssignApprovalLevelResponse(raw: unknown): AssignApprovalLevelListResult {
    const envelope = raw as Record<string, unknown>;
    const success = Boolean(envelope?.success ?? true);
    const message = String(envelope?.message ?? "");
    const data = envelope?.data;
    let items: AssignApprovalLevelListItem[] = [];
    let total = 0;
    let page: number | undefined;
    let limit: number | undefined;

    if (Array.isArray(data)) {
        items = data.map((row) => normalizeAssignApprovalLevelRow(row as Record<string, unknown>));
        total = typeof envelope.total === "number" && Number.isFinite(envelope.total) ? envelope.total : items.length;
    } else if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const arr = d.items ?? d.rows ?? d.list;
        if (Array.isArray(arr)) {
            items = arr.map((row) => normalizeAssignApprovalLevelRow(row as Record<string, unknown>));
        }
        const t = d.total ?? d.totalCount ?? envelope.total;
        total = typeof t === "number" && Number.isFinite(t) ? t : items.length;
        const pg = d.page ?? envelope.page;
        page = typeof pg === "number" ? pg : undefined;
        const lm = d.limit ?? envelope.limit;
        limit = typeof lm === "number" ? lm : undefined;
    }

    if (page === undefined && typeof envelope.page === "number") page = envelope.page;
    if (limit === undefined && typeof envelope.limit === "number") limit = envelope.limit;
    if (total === 0 && items.length > 0) total = items.length;

    return { success, message, items, total, page, limit };
}

function normalizeApprovalLeaveAssignmentRow(row: Record<string, unknown>): ApprovalLeaveAssignmentItem {
    const id = Number(row.id);
    const userId = Number(row.userId ?? row.user_id ?? 0);
    const approvalLevelSetupId = Number(
        row.approvalLevelSetupId ?? row.approval_level_setup_id ?? row.levelId ?? row.approvalLevelId ?? 0
    );
    const permRaw = row.approvalPermission ?? row.approval_permission ?? row.hasApproval ?? row.isActive;
    const approvalPermission =
        typeof permRaw === "boolean" ? permRaw : permRaw === 1 || permRaw === "1" || String(permRaw).toLowerCase() === "true";
    const scopeRaw = row.scopeType ?? row.scope_type ?? row.roleGroup;
    const scopeType: "facility" | "corporate" | undefined =
        String(scopeRaw).toLowerCase() === "corporate" ? "corporate" : String(scopeRaw).toLowerCase() === "facility" ? "facility" : undefined;
    const branchIdRaw = row.branchId ?? row.branch_id;
    const corporateIdRaw = row.corporateId ?? row.corporate_id;
    return {
        id: Number.isFinite(id) ? id : 0,
        userId: Number.isFinite(userId) ? userId : 0,
        userName: String(row.userName ?? row.user_name ?? row.name ?? ""),
        roleName: String(row.roleName ?? row.role_name ?? row.role ?? ""),
        approvalPermission,
        approvalLevelSetupId: Number.isFinite(approvalLevelSetupId) ? approvalLevelSetupId : 0,
        levelCode: String(row.levelCode ?? row.level_code ?? row.assignedLevel ?? ""),
        levelName: row.levelName != null ? String(row.levelName) : row.level_name != null ? String(row.level_name) : undefined,
        scopeType,
        branchId:
            branchIdRaw != null && branchIdRaw !== "" && Number.isFinite(Number(branchIdRaw)) ? Number(branchIdRaw) : undefined,
        corporateId:
            corporateIdRaw != null && corporateIdRaw !== "" && Number.isFinite(Number(corporateIdRaw))
                ? Number(corporateIdRaw)
                : undefined,
    };
}

function normalizeApprovalLeaveAssignmentListResponse(raw: unknown): ApprovalLeaveAssignmentListResult {
    const envelope = raw as Record<string, unknown>;
    const success = Boolean(envelope?.success ?? true);
    const message = String(envelope?.message ?? "");
    const data = envelope?.data;
    let items: ApprovalLeaveAssignmentItem[] = [];
    let total = 0;
    let totalPages: number | undefined;
    let page: number | undefined;
    let limit: number | undefined;

    if (Array.isArray(data)) {
        items = data.map((row) => normalizeApprovalLeaveAssignmentRow(row as Record<string, unknown>));
        total = items.length;
    } else if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const arr = d.items ?? d.rows ?? d.list ?? d.assignments;
        if (Array.isArray(arr)) {
            items = arr.map((row) => normalizeApprovalLeaveAssignmentRow(row as Record<string, unknown>));
        }
        const t = d.total ?? d.totalCount ?? d.count;
        total = typeof t === "number" && Number.isFinite(t) ? t : items.length;
        const tp = d.totalPages ?? d.total_pages;
        totalPages = typeof tp === "number" ? tp : undefined;
        const pg = d.page ?? envelope.page;
        page = typeof pg === "number" ? pg : undefined;
        const lm = d.limit ?? envelope.limit;
        limit = typeof lm === "number" ? lm : undefined;
    }

    if (total === 0 && items.length > 0) total = items.length;

    const envPage = envelope.page;
    const envLimit = envelope.limit;
    const envTotalPages = envelope.totalPages ?? envelope.total_pages;
    if (page === undefined && typeof envPage === "number") page = envPage;
    if (limit === undefined && typeof envLimit === "number") limit = envLimit;
    if (totalPages === undefined && typeof envTotalPages === "number") totalPages = envTotalPages;

    return { success, message, items, total, totalPages, page, limit };
}

function normalizeApprovalLevelRow(row: Record<string, unknown>): ApprovalLevelSetupItem {
    const modulesRaw = row.modules ?? row.moduleIds ?? row.module_ids ?? [];
    /** Handles API number fields as numbers or strings (e.g. "10.00", "50000.00"). */
    const parseNum = (v: unknown): number | null => {
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "number") return Number.isFinite(v) ? v : null;
        const n = Number(String(v).trim().replace(/,/g, ""));
        return Number.isFinite(n) ? n : null;
    };
    const activeRaw = row.isActive ?? row.is_active;
    return {
        id: Number(row.id),
        levelName: String(row.levelName ?? row.level_name ?? ""),
        levelCode: String(row.levelCode ?? row.level_code ?? ""),
        maxVariance: parseNum(row.maxVariance ?? row.max_variance ?? row.maxVariancePercent),
        maxAmount: parseNum(row.maxAmount ?? row.max_amount),
        modules: Array.isArray(modulesRaw) ? modulesRaw.map((x) => String(x)) : [],
        isActive:
            typeof activeRaw === "boolean"
                ? activeRaw
                : activeRaw === 1 || activeRaw === "1" || String(activeRaw).toLowerCase() === "true"
                  ? true
                  : activeRaw === 0 || activeRaw === "0"
                    ? false
                    : undefined,
    };
}

function pickApprovalLevelsListTotal(
    envelope: Record<string, unknown>,
    nested: Record<string, unknown> | null,
    levelsLength: number
): number {
    const tryNum = (v: unknown): number | undefined => {
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
        if (typeof v === "string" && v.trim() !== "") {
            const n = Number(v.trim().replace(/,/g, ""));
            if (Number.isFinite(n) && n >= 0) return n;
        }
        return undefined;
    };

    const candidates: unknown[] = [
        envelope.total,
        envelope.totalCount,
        envelope.total_count,
        envelope.recordCount,
        envelope.recordsTotal,
        envelope.count,
        nested?.total,
        nested?.totalCount,
        nested?.total_count,
        nested?.count,
        (envelope.meta as Record<string, unknown> | undefined)?.total,
        (envelope.pagination as Record<string, unknown> | undefined)?.total,
    ];

    for (const c of candidates) {
        const n = tryNum(c);
        if (n !== undefined) return n;
    }

    return levelsLength > 0 ? levelsLength : 0;
}

/**
 * GET getApprovalLevelsList — supports `data` as a plain array of rows (current API),
 * or `{ levels | items | rows | list: [] }`, plus common pagination fields on the envelope.
 */
function normalizeApprovalLevelListResponse(raw: unknown): ApprovalLevelSetupListResult {
    const envelope = raw as Record<string, unknown>;
    const success = Boolean(envelope?.success ?? true);
    const message = String(envelope?.message ?? "");
    const data = envelope?.data;
    let levels: ApprovalLevelSetupItem[] = [];
    let nestedMeta: Record<string, unknown> | null = null;

    if (Array.isArray(data)) {
        levels = data.map((row) => normalizeApprovalLevelRow(row as Record<string, unknown>));
    } else if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        nestedMeta = d;
        const arr = d.levels ?? d.items ?? d.rows ?? d.list ?? d.data;
        if (Array.isArray(arr)) {
            levels = arr.map((row) => normalizeApprovalLevelRow(row as Record<string, unknown>));
        }
    }

    const total = pickApprovalLevelsListTotal(envelope, nestedMeta, levels.length);

    const totalPagesRaw = envelope?.totalPages ?? envelope?.total_pages ?? nestedMeta?.totalPages ?? nestedMeta?.total_pages;
    const pageRaw = envelope?.page ?? nestedMeta?.page;
    const limitRaw = envelope?.limit ?? nestedMeta?.limit;

    return {
        success,
        message,
        levels,
        total,
        totalPages: totalPagesRaw !== undefined ? Number(totalPagesRaw) : undefined,
        page: pageRaw !== undefined ? Number(pageRaw) : undefined,
        limit: limitRaw !== undefined ? Number(limitRaw) : undefined,
    };
}

const APPROVAL_LEVEL_TAGS = {
    list: { type: "ApprovalLevelSetup" as const, id: "LIST" },
};

const APPROVAL_LEAVE_ASSIGNMENT_TAGS = {
    list: { type: "ApprovalLeaveAssignment" as const, id: "LIST" },
};

const ASSIGN_APPROVAL_LEVEL_TAGS = {
    list: { type: "AssignApprovalLevel" as const, id: "LIST" },
};

const LEVEL_FOR_ASSIGN_TAGS = {
    list: { type: "LevelForAssign" as const, id: "LIST" },
};

const ROLE_TAGS = {
    list: { type: "RoleAndPermissions" as const, id: "LIST" },
    modules: { type: "RoleAndPermissions" as const, id: "MODULES" },
    role: (roleId: number | string) =>
        ({ type: "RoleAndPermissions" as const, id: `ROLE-${roleId}` }) as const,
};

export const roleAndPermissionApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        /**
         * POST /admin/role-and-permissions/createRoles
         */
        createRoles: builder.mutation<CreateRolesResponse, CreateRolesRequest>({
            query: (body) => ({
                url: "/admin/role-and-permissions/createRoles",
                method: "POST",
                body,
            }),
            invalidatesTags: [ROLE_TAGS.list],
        }),

        /**
         * GET /admin/role-and-permissions/getRole?page=&limit=&sort=&order=&search=&roleCatType=&branchId=
         */
        getRoles: builder.query<GetRolesResponse, GetRolesParams | void>({
            query: (params) => {
                const p = params ?? {};
                const qp = new URLSearchParams();
                if (p.page != null) qp.set("page", String(p.page));
                if (p.limit != null) qp.set("limit", String(p.limit));
                if (p.sort != null && String(p.sort).trim() !== "") qp.set("sort", String(p.sort));
                if (p.order != null) qp.set("order", String(p.order));
                if (p.search != null && String(p.search).trim() !== "") {
                    qp.set("search", String(p.search).trim());
                }
                if (p.roleCatType != null && String(p.roleCatType).trim() !== "") {
                    qp.set("roleCatType", String(p.roleCatType));
                }
                if (
                    p.branchId != null &&
                    typeof p.branchId === "number" &&
                    Number.isFinite(p.branchId) &&
                    p.branchId > 0
                ) {
                    qp.set("branchId", String(p.branchId));
                }
                const qs = qp.toString();
                return {
                    url: `/admin/role-and-permissions/getRole${qs ? `?${qs}` : ""}`,
                    method: "GET",
                };
            },
            providesTags: [ROLE_TAGS.list],
        }),

        /**
         * GET /admin/role-and-permissions/getRoleById?roleId=
         */
        getRoleById: builder.query<GetRoleByIdResponse, GetRoleByIdParams>({
            query: ({ roleId }) => ({
                url: "/admin/role-and-permissions/getRoleById",
                method: "GET",
                params: { roleId },
            }),
            providesTags: (result, _err, { roleId }) => [ROLE_TAGS.role(roleId)],
        }),

        /**
         * PUT /admin/role-and-permissions/updateRole/:roleId
         */
        updateRole: builder.mutation<UpdateRoleResponse, UpdateRoleParams>({
            query: ({ roleId, body }) => ({
                url: `/admin/role-and-permissions/updateRole/${roleId}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: (result, _err, { roleId }) => [ROLE_TAGS.list, ROLE_TAGS.role(roleId)],
        }),

        updateRoleStatus: builder.mutation<UpdateRoleStatusResponse, UpdateRoleStatusRequest>({
            query: ({ roleId, isActive }) => ({
                url: `/admin/role-and-permissions/updateRoleStatus/${roleId}`,
                method: "PATCH",
                body: { isActive },
            }),
            invalidatesTags: (result, _err, { roleId }) => [ROLE_TAGS.list, ROLE_TAGS.role(roleId)],
        }),

        /**
         * GET /admin/role-and-permissions/getListOfmodules
         * Parent modules (Settings, User Management, …) and rows for permission matrix.
         * Optional query: branchId — modules available for that branch (Facility Role / assign permissions).
         */
        getListOfModules: builder.query<GetListOfModulesResponse, GetListOfModulesArg>({
            query: (arg) => {
                const hasBranchId =
                    arg?.branchId != null &&
                    typeof arg.branchId === "number" &&
                    !Number.isNaN(arg.branchId) &&
                    arg.branchId > 0;
                const params: Record<string, unknown> = {};
                if (hasBranchId) params.branchId = arg!.branchId;
                if (arg?.roleType) params.roleType = arg.roleType;
                return {
                    url: "/admin/role-and-permissions/getListOfmodules",
                    method: "GET",
                    ...(Object.keys(params).length > 0 ? { params } : {}),
                };
            },
            providesTags: [ROLE_TAGS.modules],
        }),

        /**
         * GET /public/states?zone=
         * Used when building roleAccess.stateIds from zone selection.
         */
        getStatesByZone: builder.query<GetStatesByZoneResponse, GetStatesByZoneParams>({
            query: ({ zone }) => ({
                url: "/public/states",
                method: "GET",
                params: { zone },
            }),
        }),

        /**
         * GET /admin/role-and-permissions/getBranchesWithRoles?page=&limit=&sort=&order=
         */
        getBranchesWithRoles: builder.query<GetBranchesWithRolesResponse, GetBranchesWithRolesParams | void>({
            query: (params) => ({
                url: "/admin/role-and-permissions/getBranchesWithRoles",
                method: "GET",
                params: params ?? {},
            }),
            providesTags: [{ type: "BranchRoleMaster" as const, id: "LIST" }],
        }),

        /**
         * GET /admin/role-and-permissions/assignableRoles?branchId=
         */
        getAssignableRoles: builder.query<GetAssignableRolesResponse, GetAssignableRolesParams>({
            query: ({ branchId, branchType }) => ({
                url: "/admin/role-and-permissions/assignableRoles",
                method: "GET",
                params: {
                    branchId,
                    ...(branchType ? { branchType } : {}),
                },
            }),
            providesTags: (_result, _err, { branchId }) => [
                { type: "BranchRoleMaster" as const, id: "LIST" },
                { type: "BranchRoleMaster" as const, id: `ASSIGNABLE-${branchId}` },
            ],
        }),

        /**
         * PUT /admin/role-and-permissions/assignRoleToBranches
         * Body: { roleId, branchIds }
         */
        assignRoleToBranches: builder.mutation<AssignRoleToBranchesResponse, AssignRoleToBranchesRequest>({
            query: (body) => ({
                url: "/admin/role-and-permissions/assignRoleToBranches",
                method: "PUT",
                body,
            }),
            invalidatesTags: (_result, _err, { branchIds }) => [
                { type: "BranchRoleMaster" as const, id: "LIST" },
                ...branchIds.map((id) => ({ type: "BranchRoleMaster" as const, id: `ASSIGNABLE-${id}` })),
            ],
        }),

        /**
         * DELETE /admin/role-and-permissions/deleteRoleBranchAccess
         * Body: { roleId, branchId }
         */
        deleteRoleBranchAccess: builder.mutation<DeleteRoleBranchAccessResponse, DeleteRoleBranchAccessRequest>({
            query: (body) => ({
                url: "/admin/role-and-permissions/deleteRoleBranchAccess",
                method: "DELETE",
                body,
            }),
            invalidatesTags: (_result, _err, { branchId }) => [
                { type: "BranchRoleMaster" as const, id: "LIST" },
                { type: "BranchRoleMaster" as const, id: `ASSIGNABLE-${branchId}` },
            ],
        }),

        /**
         * GET /admin/role-and-permissions/getApprovalLevelsList
         * Query: page, limit, search, sort, order
         */
        getApprovalLevelSetupList: builder.query<ApprovalLevelSetupListResult, GetApprovalLevelSetupListParams>({
            query: (params) => ({
                url: "/admin/role-and-permissions/getApprovalLevelsList",
                method: "GET",
                params,
            }),
            transformResponse: (raw: unknown) => normalizeApprovalLevelListResponse(raw),
            providesTags: [APPROVAL_LEVEL_TAGS.list],
        }),

        /**
         * POST /admin/role-and-permissions/approvalLevels
         */
        createApprovalLevelSetup: builder.mutation<CreateApprovalLevelSetupResponse, CreateApprovalLevelSetupRequest>({
            query: (body) => ({
                url: "/admin/role-and-permissions/approvalLevels",
                method: "POST",
                body,
            }),
            invalidatesTags: [APPROVAL_LEVEL_TAGS.list, LEVEL_FOR_ASSIGN_TAGS.list],
        }),

        /**
         * PUT /admin/role-and-permissions/updateApprovalLevel/:id
         */
        updateApprovalLevelSetup: builder.mutation<UpdateApprovalLevelSetupResponse, UpdateApprovalLevelSetupParams>({
            query: ({ id, body }) => ({
                url: `/admin/role-and-permissions/updateApprovalLevel/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: [APPROVAL_LEVEL_TAGS.list, LEVEL_FOR_ASSIGN_TAGS.list],
        }),

        /**
         * GET /admin/role-and-permissions/getListOfLevelForAssign
         * Returns id + levelCode for "Select Level" / assign dialogs (no pagination).
         */
        getListOfLevelForAssign: builder.query<ListOfLevelForAssignResult, void>({
            query: () => ({
                url: "/admin/role-and-permissions/getListOfLevelForAssign",
                method: "GET",
            }),
            transformResponse: (raw: unknown) => normalizeListOfLevelForAssignResponse(raw),
            providesTags: [LEVEL_FOR_ASSIGN_TAGS.list],
        }),

        /**
         * GET /admin/role-and-permissions/getAssignApprovalLevel
         * Query: optional branchId (filter), search, page, limit, optional approvalLevelId
         */
        getAssignApprovalLevel: builder.query<AssignApprovalLevelListResult, GetAssignApprovalLevelParams>({
            query: (params) => {
                const { branchId, search, page, limit, approvalLevelId } = params;
                const qp = new URLSearchParams();
                if (branchId != null && Number.isFinite(Number(branchId)) && Number(branchId) > 0) {
                    qp.set("branchId", String(branchId));
                }
                if (search != null && String(search).trim() !== "") {
                    qp.set("search", String(search).trim());
                }
                if (page != null) qp.set("page", String(page));
                if (limit != null) qp.set("limit", String(limit));
                if (approvalLevelId != null && Number.isFinite(Number(approvalLevelId)) && Number(approvalLevelId) > 0) {
                    qp.set("approvalLevelId", String(approvalLevelId));
                }
                const qs = qp.toString();
                return {
                    url: `/admin/role-and-permissions/getAssignApprovalLevel${qs ? `?${qs}` : ""}`,
                    method: "GET",
                };
            },
            transformResponse: (raw: unknown) => normalizeGetAssignApprovalLevelResponse(raw),
            providesTags: [ASSIGN_APPROVAL_LEVEL_TAGS.list],
        }),

        /**
         * GET /admin/role-and-permissions/getBranchRoleByCategoryType
         * Same query params as settings getBranchRoleByCategoryType: corporate | facility (+ branchId, branchType for facility).
         */
        getBranchRoleByCategoryTypeForAssign: builder.query<
            GetBranchRoleByCategoryTypeResponse,
            GetBranchRoleByCategoryTypeParams
        >({
            query: ({ roleCategoryType, branchId, branchType }) => {
                const params = new URLSearchParams();
                params.append("roleCategoryType", roleCategoryType);
                const needsBranchScope =
                    roleCategoryType === "facility" ||
                    roleCategoryType === "facility_doctor" ||
                    roleCategoryType === "facility_nurse" ||
                    roleCategoryType === "facility_therapist";
                if (needsBranchScope && branchId != null && Number.isFinite(branchId)) {
                    params.append("branchId", String(branchId));
                }
                if (needsBranchScope && branchType) {
                    params.append("branchType", branchType);
                }
                return {
                    url: `/admin/role-and-permissions/getBranchRoleByCategoryType?${params.toString()}`,
                    method: "GET",
                };
            },
        }),

        /**
         * GET /admin/role-and-permissions/getRoleUsers?roleId=
         */
        getRoleUsers: builder.query<RoleUserItem[], { roleId: number }>({
            query: ({ roleId }) => ({
                url: "/admin/role-and-permissions/getRoleUsers",
                method: "GET",
                params: { roleId },
            }),
            transformResponse: (raw: unknown) => normalizeGetRoleUsersResponse(raw),
        }),

        /**
         * POST /admin/role-and-permissions/assignApprovalLevel
         */
        assignApprovalLevel: builder.mutation<AssignApprovalLevelResponse, AssignApprovalLevelRequest>({
            query: (body) => ({
                url: "/admin/role-and-permissions/assignApprovalLevel",
                method: "POST",
                body,
            }),
            invalidatesTags: [ASSIGN_APPROVAL_LEVEL_TAGS.list],
        }),

        /**
         * PATCH /admin/role-and-permissions/updateAssignApprovalLevel
         */
        updateAssignApprovalLevel: builder.mutation<AssignApprovalLevelResponse, PatchAssignApprovalLevelRequest>({
            query: (body) => ({
                url: "/admin/role-and-permissions/updateAssignApprovalLevel",
                method: "PATCH",
                body,
            }),
            invalidatesTags: [ASSIGN_APPROVAL_LEVEL_TAGS.list],
        }),

        /**
         * GET /admin/role-and-permissions/getApprovalLeaveAssignmentList
         */
        getApprovalLeaveAssignmentList: builder.query<
            ApprovalLeaveAssignmentListResult,
            GetApprovalLeaveAssignmentListParams
        >({
            query: (params) => ({
                url: "/admin/role-and-permissions/getApprovalLeaveAssignmentList",
                method: "GET",
                params,
            }),
            transformResponse: (raw: unknown) => normalizeApprovalLeaveAssignmentListResponse(raw),
            providesTags: [APPROVAL_LEAVE_ASSIGNMENT_TAGS.list],
        }),

        /**
         * POST /admin/role-and-permissions/createApprovalLeaveAssignment
         */
        createApprovalLeaveAssignment: builder.mutation<
            CreateApprovalLeaveAssignmentResponse,
            CreateApprovalLeaveAssignmentRequest
        >({
            query: (body) => ({
                url: "/admin/role-and-permissions/createApprovalLeaveAssignment",
                method: "POST",
                body,
            }),
            invalidatesTags: [APPROVAL_LEAVE_ASSIGNMENT_TAGS.list],
        }),

        /**
         * PUT /admin/role-and-permissions/updateApprovalLeaveAssignment/:id
         */
        updateApprovalLeaveAssignment: builder.mutation<
            UpdateApprovalLeaveAssignmentResponse,
            UpdateApprovalLeaveAssignmentParams
        >({
            query: ({ id, body }) => ({
                url: `/admin/role-and-permissions/updateApprovalLeaveAssignment/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: [APPROVAL_LEAVE_ASSIGNMENT_TAGS.list],
        }),

        /**
         * GET /admin/role-and-permissions/getRoleListDropdown
         */
        getRoleListDropdown: builder.query<GetRoleListDropdownResponse, GetRoleListDropdownParams>({
            query: (params) => ({
                url: "/admin/role-and-permissions/getRoleListDropdown",
                method: "GET",
                params,
            }),
        }),
    }),
});

export const {
    useCreateRolesMutation,
    useGetRolesQuery,
    useLazyGetRolesQuery,
    useGetRoleByIdQuery,
    useLazyGetRoleByIdQuery,
    useUpdateRoleMutation,
    useUpdateRoleStatusMutation,
    useGetListOfModulesQuery,
    useLazyGetListOfModulesQuery,
    useGetStatesByZoneQuery,
    useLazyGetStatesByZoneQuery,
    useGetBranchesWithRolesQuery,
    useLazyGetBranchesWithRolesQuery,
    useGetAssignableRolesQuery,
    useAssignRoleToBranchesMutation,
    useDeleteRoleBranchAccessMutation,
    useGetApprovalLevelSetupListQuery,
    useCreateApprovalLevelSetupMutation,
    useUpdateApprovalLevelSetupMutation,
    useGetListOfLevelForAssignQuery,
    useGetAssignApprovalLevelQuery,
    useLazyGetAssignApprovalLevelQuery,
    useGetBranchRoleByCategoryTypeForAssignQuery,
    useGetRoleUsersQuery,
    useAssignApprovalLevelMutation,
    useUpdateAssignApprovalLevelMutation,
    useGetApprovalLeaveAssignmentListQuery,
    useCreateApprovalLeaveAssignmentMutation,
    useUpdateApprovalLeaveAssignmentMutation,
    useLazyGetRoleListDropdownQuery,
} = roleAndPermissionApi;
