import type { NursePayload } from "@/lib/nurse/nurseTypes";
import { NURSE_LOGIN_TYPE_OPTIONS } from "@/lib/nurse/nurseTypes";

export type ApiNurseListItem = {
    id: number;
    branchId: number;
    imgUrl: string | null;
    name: string;
    email: string;
    address: string;
    phone: string;
    empId: string;
    loginType: string;
    roleId?: number;
    /** API active flag (`true` / `false`, or legacy string/number). */
    IsActive?: string | boolean | number;
    /** CamelCase alias some API responses use. */
    isActive?: string | boolean | number;
    /** @deprecated Use `IsActive` — kept for older API responses. */
    status?: string;
    branchName?: string;
    branch?: { id?: number; name?: string };
};

/** Request body `IsActive` flag sent as boolean (`true` = active, `false` = inactive). */
export type NurseApiIsActive = boolean;

function apiIsActiveBooleanFromPayload(status: NursePayload["status"]): NurseApiIsActive {
    return status !== "Inactive";
}

function coerceApiIsActiveToBoolean(value: string | boolean | number): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const s = value.toLowerCase().trim();
    if (s === "true" || s === "active" || s === "1") return true;
    if (s === "false" || s === "inactive" || s === "0") return false;
    return null;
}

/** Resolves API `IsActive` / `isActive` / legacy `status` to a boolean, or `null` if unknown. */
export function resolveNurseIsActiveBoolean(
    row: Pick<ApiNurseListItem, "IsActive" | "isActive" | "status">
): boolean | null {
    if (row.IsActive !== undefined && row.IsActive !== null) {
        const parsed = coerceApiIsActiveToBoolean(row.IsActive);
        if (parsed !== null) return parsed;
    }
    if (row.isActive !== undefined && row.isActive !== null) {
        const parsed = coerceApiIsActiveToBoolean(row.isActive);
        if (parsed !== null) return parsed;
    }
    if (row.status !== undefined && row.status !== null && String(row.status).trim() !== "") {
        const parsed = coerceApiIsActiveToBoolean(row.status);
        if (parsed !== null) return parsed;
    }
    return null;
}

/** Human-readable status for list/view: `true` → Active, `false` → Inactive. */
export function nurseStatusDisplayLabel(
    row: Pick<ApiNurseListItem, "IsActive" | "isActive" | "status">
): string {
    const active = resolveNurseIsActiveBoolean(row);
    if (active === true) return "Active";
    if (active === false) return "Inactive";
    return "—";
}

/** Whether the nurse row should render as inactive (for badge styling). */
export function nurseIsInactive(row: Pick<ApiNurseListItem, "IsActive" | "isActive" | "status">): boolean {
    return resolveNurseIsActiveBoolean(row) === false;
}

/** Human-readable branch name from nested branch, `branchName`, or optional id lookup. */
export function nurseBranchDisplayLabel(
    row: Pick<ApiNurseListItem, "branch" | "branchId" | "branchName">,
    resolveNameById?: (branchId: string) => string | undefined
): string {
    const fromNested = row.branch?.name?.trim();
    if (fromNested) return fromNested;
    const fromTop = row.branchName?.trim();
    if (fromTop) return fromTop;
    const resolved = resolveNameById?.(String(row.branchId))?.trim();
    if (resolved) return resolved;
    if (row.branchId != null && Number(row.branchId) > 0) return String(row.branchId);
    return "—";
}

export type UpdateNurseFiles = {
    imgUrl: File | null;
};

/** Default nurse role when create/update has no valid selection (matches doctor pattern). */
export const DEFAULT_NURSE_ROLE_ID = 3;

export function normalizeLoginType(raw: string | null | undefined): string {
    const t = (raw || "").toLowerCase().replace(/\s+/g, "-");
    if (t === "no-authentication" || t === "noauth") return "no-auth";
    if (t === "ip-otp" || t === "ip+otp" || t === "ip/otp") return "ip-otp";
    if (["no-auth", "ip", "otp", "ip-otp"].includes(t)) return t;
    return "no-auth";
}

export function loginTypeLabel(raw: string | null | undefined): string {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) return "—";
    const normalized = normalizeLoginType(trimmed);
    if (!normalized) return "—";
    const opt = NURSE_LOGIN_TYPE_OPTIONS.find((o) => o.value === normalized);
    return opt?.label ?? trimmed;
}

export function resolveRoleIdFromPayload(
    payload: NursePayload,
    fallbackRoleId: number = DEFAULT_NURSE_ROLE_ID
): number {
    const parsed = Number.parseInt((payload.roleId ?? "").trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackRoleId;
}

export function mapApiNurseListItemToPayload(row: ApiNurseListItem): NursePayload {
    return {
        branchId: String(row.branchId),
        imgUrl: row.imgUrl,
        name: row.name ?? "",
        email: row.email ?? "",
        address: row.address ?? "",
        phone: row.phone ?? "",
        empId: row.empId ?? "",
        loginType: normalizeLoginType(row.loginType),
        roleId: row.roleId != null && Number(row.roleId) > 0 ? String(Number(row.roleId)) : "",
        status: resolveNurseIsActiveBoolean(row) === false ? "Inactive" : "Active",
    };
}

export function buildCreateNurseBody(payload: NursePayload): Record<string, unknown> {
    return {
        branchId: Number(payload.branchId),
        name: payload.name.trim(),
        email: payload.email.trim(),
        address: payload.address.trim(),
        phone: payload.phone.trim(),
        empId: payload.empId.trim(),
        loginType: payload.loginType.trim(),
        roleId: resolveRoleIdFromPayload(payload),
        IsActive: apiIsActiveBooleanFromPayload(payload.status),
    };
}

/** Edit nurse — only name, loginType, isActive; image sent separately via multipart. */
export function buildUpdateNurseBody(payload: NursePayload): Record<string, unknown> {
    return {
        name: payload.name.trim(),
        loginType: payload.loginType.trim(),
        isActive: apiIsActiveBooleanFromPayload(payload.status),
    };
}

export function buildNurseFormData(
    body: Record<string, unknown>,
    files: UpdateNurseFiles
): FormData {
    const formData = new FormData();
    for (const [key, val] of Object.entries(body)) {
        if (val === undefined || val === null) continue;
        formData.append(key, String(val));
    }
    if (files.imgUrl) {
        formData.append("imgUrl", files.imgUrl);
    }
    return formData;
}
