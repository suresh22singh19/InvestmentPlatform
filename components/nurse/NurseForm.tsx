"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { FormInputField } from "@/components/ui/FormInputField";
import { FormSelectField, type SelectOption } from "@/components/ui/FormSelectField";
import { LoginTypeInfoIcon } from "@/components/ui/LoginTypeInfoIcon";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { Button } from "@/components/ui/Button";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import type { NursePayload } from "@/lib/nurse/nurseTypes";
import { NURSE_LOGIN_TYPE_OPTIONS, NURSE_STATUS_OPTIONS } from "@/lib/nurse/nurseTypes";
import { fileNameFromUrl } from "@/lib/nurse/nursePhoto";
import { useAppSelector } from "@/store/hooks";
import {
    selectRoleCategoryType,
    selectSelectedBranch,
    selectUserBranchId,
    selectUserBranchName,
} from "@/store/slices/authSlice";
import {
    useGetBranchesQuery,
    useGetBranchRoleByCategoryTypeQuery,
    type GetBranchRoleByCategoryTypeParams,
} from "@/store/api/settingsApi";
import { sanitizeEmailInput } from "@/lib/utils/emailValidation";

const PROFILE_IMAGE_ACCEPT = "image/png,image/jpeg,.png,.jpg,.jpeg";
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const PROFILE_IMAGE_ERROR = "Only PNG, JPG, and JPEG image files are allowed.";

async function validateProfileImage(file: File): Promise<string | null> {
    const ext = file.name.includes(".")
        ? `.${file.name.split(".").pop()!.toLowerCase()}`
        : "";
    const mime = file.type.toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mime) || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        return PROFILE_IMAGE_ERROR;
    }
    return null;
}

/** Muted read-only styling for Edit Nurse non-editable fields (nurse form only). */
const NURSE_EDIT_READONLY_INPUT_CLASS =
    "!cursor-not-allowed !border-[#D0D5DD] !bg-[#F3F4F6] !text-[#5F6570] !opacity-90 shadow-none focus:!border-[#D0D5DD] focus:!ring-0 hover:!cursor-not-allowed hover:!border-[#D0D5DD]";

const NURSE_EDIT_READONLY_SELECT_WRAPPER_CLASS =
    "cursor-not-allowed overflow-visible [&_span.rounded-full]:!z-10 [&_span.rounded-full]:!bg-[#F3F4F6] [&_button]:!cursor-not-allowed [&_button]:!border-[#D0D5DD] [&_button]:!bg-[#F3F4F6] [&_button]:!text-[#5F6570] [&_button]:!opacity-90 [&_button]:shadow-none [&_button]:hover:!cursor-not-allowed [&_button]:hover:!bg-[#F3F4F6] [&_button]:hover:!border-[#D0D5DD] [&_button]:focus:!border-[#D0D5DD] [&_button]:focus:!ring-0";

/** Room for floating labels (half above the field border) so headings are not clipped. */
const NURSE_FORM_FIELD_SLOT_CLASS = "overflow-visible pt-3 [&_span.rounded-full]:z-10";

function NurseFormFieldSlot({
    children,
    editOrder,
}: {
    children: ReactNode;
    /** Grid sort order in edit mode — disabled fields first (1–6), then editable (7–10). */
    editOrder?: number;
}) {
    return (
        <div className={NURSE_FORM_FIELD_SLOT_CLASS} style={editOrder != null ? { order: editOrder } : undefined}>
            {children}
        </div>
    );
}

function NurseFormReadOnlyShell({
    active,
    variant,
    children,
}: {
    active: boolean;
    variant: "input" | "select";
    children: ReactNode;
}) {
    if (!active) return <>{children}</>;
    if (variant === "select") {
        return <div className={NURSE_EDIT_READONLY_SELECT_WRAPPER_CLASS}>{children}</div>;
    }
    return (
        <div className="cursor-not-allowed overflow-visible [&_span.rounded-full]:!z-10 [&_span.rounded-full]:!bg-[#F3F4F6]">
            {children}
        </div>
    );
}

type NurseFormProps = {
    mode: "add" | "edit";
    initial: NursePayload;
    onSubmit: (payload: NursePayload, files: { imgUrl: File | null }) => void | Promise<void>;
    onBack: () => void;
};

function pickSingle(v: string | string[]): string {
    return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function branchRecordTypeToRoleApiBranchType(apiType: string | undefined): "hospital" | "clinic" {
    const t = (apiType ?? "").toLowerCase().trim();
    if (t === "clinic") return "clinic";
    return "hospital";
}

function formatNameInput(raw: string): string {
    let value = raw.replace(/[^a-zA-Z\s]/g, "").replace(/^\s+/, "");
    if (value.length > 0) value = value.charAt(0).toUpperCase() + value.slice(1);
    return value.slice(0, 100);
}

function formatPhoneInput(raw: string): string {
    return raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
}

function formatEmpIdInput(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 20);
}

function formatAddressInput(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9\s,.\-]/g, "").slice(0, 200);
}

function validateNursePayload(payload: NursePayload, mode: "add" | "edit"): Record<string, string> {
    const errors: Record<string, string> = {};
    if (mode === "edit") {
        if (!payload.name.trim()) errors.name = "Name is required.";
        if (!payload.loginType.trim()) errors.loginType = "Login Type is required.";
        if (!payload.status) errors.status = "Status is required.";
        return errors;
    }
    if (!payload.branchId.trim()) errors.branchId = "Branch is required.";
    if (!payload.roleId.trim()) errors.roleId = "Role is required.";
    if (!payload.name.trim()) errors.name = "Name is required.";
    if (!payload.email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
        errors.email = "Enter a valid email.";
    }
    if (!payload.phone.trim()) errors.phone = "Phone is required.";
    else if (payload.phone.trim().length !== 10) errors.phone = "Phone must be 10 digits.";
    if (!payload.empId.trim()) errors.empId = "Emp ID is required.";
    if (!payload.address.trim()) errors.address = "Address is required.";
    if (!payload.loginType.trim()) errors.loginType = "Login Type is required.";
    if (!payload.status) errors.status = "Status is required.";
    return errors;
}

export function NurseForm({ mode, initial, onSubmit, onBack }: NurseFormProps) {
    const isEdit = mode === "edit";
    const roleCategoryType = useAppSelector(selectRoleCategoryType);
    const selectedBranch = useAppSelector(selectSelectedBranch);
    const userBranchId = useAppSelector(selectUserBranchId);
    const userBranchName = useAppSelector(selectUserBranchName);
    const roleLc = roleCategoryType?.toLowerCase() ?? "";
    const isSuperAdmin = roleLc === "superadmin";
    const isFacilityUser = roleLc === "facility";

    const singleBranchFromAuth = useMemo((): SelectOption | null => {
        if (selectedBranch?.id != null) {
            return {
                value: String(selectedBranch.id),
                label: (selectedBranch.name ?? "").trim() || `Branch ${selectedBranch.id}`,
            };
        }
        const id = userBranchId != null ? Number(userBranchId) : NaN;
        if (Number.isFinite(id) && id > 0) {
            return { value: String(id), label: (userBranchName ?? "").trim() || `Branch ${id}` };
        }
        return null;
    }, [selectedBranch, userBranchId, userBranchName]);

    const { data: branchesData, isLoading: branchesLoading } = useGetBranchesQuery(undefined, {
        skip: !isSuperAdmin,
    });

    const [form, setForm] = useState<NursePayload>(initial);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [imgFile, setImgFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setForm(initial);
        setImgFile(null);
        setFormErrors({});
    }, [initial]);

    const branchOptions: SelectOption[] = useMemo(() => {
        if (isSuperAdmin) {
            const rows = branchesData?.data;
            if (Array.isArray(rows) && rows.length > 0) {
                return rows.map((b) => ({ value: String(b.id), label: b.name ?? String(b.id) }));
            }
            return [];
        }
        if (isFacilityUser && singleBranchFromAuth) {
            return [singleBranchFromAuth];
        }
        if (selectedBranch?.id != null) {
            return [
                {
                    value: String(selectedBranch.id),
                    label: selectedBranch.name ?? String(selectedBranch.id),
                },
            ];
        }
        if (singleBranchFromAuth) {
            return [singleBranchFromAuth];
        }
        return [];
    }, [isSuperAdmin, isFacilityUser, branchesData, selectedBranch, singleBranchFromAuth]);

    const branchOptionsForDisplay: SelectOption[] = useMemo(() => {
        if (!isEdit || !form.branchId.trim()) return branchOptions;
        if (branchOptions.some((o) => o.value === form.branchId)) return branchOptions;
        const rows = branchesData?.data ?? [];
        const match = rows.find((b) => String(b.id) === form.branchId);
        const label = match?.name ?? form.branchId;
        return [{ value: form.branchId, label }, ...branchOptions];
    }, [isEdit, form.branchId, branchOptions, branchesData]);

    const resolvedBranchIdForRole = useMemo(() => {
        if (!isSuperAdmin && singleBranchFromAuth?.value) {
            return singleBranchFromAuth.value.trim();
        }
        return form.branchId.trim();
    }, [isSuperAdmin, singleBranchFromAuth, form.branchId]);

    const assignableRolesQueryArgs = useMemo((): GetBranchRoleByCategoryTypeParams | null => {
        const bid = resolvedBranchIdForRole;
        if (!bid) return null;
        const n = Number.parseInt(bid, 10);
        if (!Number.isFinite(n) || n <= 0) return null;
        const rows = branchesData?.data ?? [];
        const branchRow = rows.find((b) => b.id === n);
        const branchType = branchRecordTypeToRoleApiBranchType(branchRow?.type as string | undefined);
        return { roleCategoryType: "facility_nurse", branchId: n, branchType };
    }, [resolvedBranchIdForRole, branchesData]);

    const { data: assignableRolesRes, isFetching: isLoadingRoles } =
        useGetBranchRoleByCategoryTypeQuery(assignableRolesQueryArgs ?? { roleCategoryType: "corporate" }, {
            skip: assignableRolesQueryArgs === null || isEdit,
            refetchOnMountOrArgChange: true,
        });

    const roleOptions: SelectOption[] = useMemo(() => {
        const rows = Array.isArray(assignableRolesRes?.data) ? assignableRolesRes.data : [];
        return rows
            .filter((r) => r.isActive !== false)
            .map((r) => ({ value: String(r.id), label: r.name }));
    }, [assignableRolesRes]);

    const roleOptionsForDisplay: SelectOption[] = useMemo(() => {
        if (!isEdit || !form.roleId.trim()) return roleOptions;
        if (roleOptions.some((o) => o.value === form.roleId)) return roleOptions;
        return [{ value: form.roleId, label: form.roleId }, ...roleOptions];
    }, [isEdit, form.roleId, roleOptions]);

    const branchFieldDisabled = isEdit;
    const readOnlyFieldDisabled = isEdit;

    const roleFieldDisabled =
        isEdit || !resolvedBranchIdForRole || isLoadingRoles || roleOptions.length === 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form };
        if (!isEdit && !isSuperAdmin && singleBranchFromAuth?.value) {
            payload.branchId = singleBranchFromAuth.value;
        }
        const errors = validateNursePayload(payload, mode);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;
        setSubmitting(true);
        try {
            await onSubmit(payload, { imgUrl: imgFile });
        } finally {
            setSubmitting(false);
        }
    };

    const existingPhotoLabel = fileNameFromUrl(form.imgUrl);

    const loginTypeField = (
        <FormSelectField
            label="Login Type *"
            labelSuffix={<LoginTypeInfoIcon entity="nurse" size={14} />}
            value={form.loginType}
            options={NURSE_LOGIN_TYPE_OPTIONS}
            mode="single"
            background="white"
            placeholder="Select"
            onChange={(v) => {
                setForm((p) => ({ ...p, loginType: pickSingle(v) }));
                setFormErrors((err) => ({ ...err, loginType: "" }));
            }}
            error={formErrors.loginType}
        />
    );

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="overflow-visible rounded-[20px] border border-[#E3EEE1] bg-white p-5">
                <h4 className="mb-5 text-base font-medium text-[#262D3B]">Nurse Details</h4>
                <div className="grid grid-cols-1 gap-x-4 gap-y-4 overflow-visible md:grid-cols-2">
                    <NurseFormFieldSlot editOrder={isEdit ? 1 : undefined}>
                    <NurseFormReadOnlyShell active={isEdit} variant="select">
                        <FormSelectField
                            label="Branch *"
                            value={form.branchId.trim() ? form.branchId : null}
                            options={branchOptionsForDisplay}
                            placeholder={branchesLoading && !isEdit ? "Loading…" : "Select Branch"}
                            mode="single"
                            background="white"
                            disabled={branchFieldDisabled}
                            onChange={(v) => {
                                if (branchFieldDisabled) return;
                                const selected = pickSingle(v);
                                setForm((p) => ({ ...p, branchId: selected, roleId: "" }));
                                setFormErrors((e) => ({ ...e, branchId: "", roleId: "" }));
                            }}
                            error={formErrors.branchId}
                        />
                    </NurseFormReadOnlyShell>
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot editOrder={isEdit ? 2 : undefined}>
                    <NurseFormReadOnlyShell active={isEdit} variant="select">
                        <FormSelectField
                            label="Role *"
                            value={form.roleId || null}
                            options={roleOptionsForDisplay}
                            placeholder={
                                isEdit
                                    ? "—"
                                    : !resolvedBranchIdForRole
                                      ? "Select branch first"
                                      : isLoadingRoles
                                        ? "Loading roles…"
                                        : "Select role"
                            }
                            mode="single"
                            background="white"
                            disabled={roleFieldDisabled}
                            onChange={(v) => {
                                if (isEdit || roleFieldDisabled) return;
                                setForm((p) => ({ ...p, roleId: pickSingle(v) }));
                                setFormErrors((err) => ({ ...err, roleId: "" }));
                            }}
                            error={formErrors.roleId}
                        />
                    </NurseFormReadOnlyShell>
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot editOrder={isEdit ? 8 : undefined}>
                    {loginTypeField}
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot editOrder={isEdit ? 9 : undefined}>
                        <FileUploadField
                            label="Upload Profile Image"
                            placeholder="Upload profile image"
                            value={imgFile?.name ?? existingPhotoLabel}
                            accept={PROFILE_IMAGE_ACCEPT}
                            validateFile={validateProfileImage}
                            onChange={(file) => {
                                setImgFile(file ?? null);
                                setFormErrors((err) => ({ ...err, imgUrl: "" }));
                            }}
                            error={formErrors.imgUrl}
                        />
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot editOrder={isEdit ? 7 : undefined}>
                    <FormInputField
                        label="Name *"
                        value={form.name}
                        onChange={(e) => {
                            setForm((p) => ({ ...p, name: formatNameInput(e.target.value) }));
                            setFormErrors((err) => ({ ...err, name: "" }));
                        }}
                        height={44}
                        placeholder="Name"
                        error={formErrors.name}
                    />
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot editOrder={isEdit ? 3 : undefined}>
                    <NurseFormReadOnlyShell active={readOnlyFieldDisabled} variant="input">
                        <FormInputField
                            label="Email *"
                            value={form.email}
                            disabled={readOnlyFieldDisabled}
                            readOnly={readOnlyFieldDisabled}
                            className={readOnlyFieldDisabled ? NURSE_EDIT_READONLY_INPUT_CLASS : undefined}
                            onChange={(e) => {
                                if (readOnlyFieldDisabled) return;
                                setForm((p) => ({
                                    ...p,
                                    email: sanitizeEmailInput(e.target.value),
                                }));
                                setFormErrors((err) => ({ ...err, email: "" }));
                            }}
                            height={44}
                            placeholder="Email"
                            error={formErrors.email}
                        />
                    </NurseFormReadOnlyShell>
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot editOrder={isEdit ? 4 : undefined}>
                    <NurseFormReadOnlyShell active={readOnlyFieldDisabled} variant="input">
                        <FormInputField
                            label="Phone *"
                            value={form.phone}
                            disabled={readOnlyFieldDisabled}
                            readOnly={readOnlyFieldDisabled}
                            className={readOnlyFieldDisabled ? NURSE_EDIT_READONLY_INPUT_CLASS : undefined}
                            onChange={(e) => {
                                if (readOnlyFieldDisabled) return;
                                setForm((p) => ({ ...p, phone: formatPhoneInput(e.target.value) }));
                                setFormErrors((err) => ({ ...err, phone: "" }));
                            }}
                            height={44}
                            placeholder="Phone"
                            error={formErrors.phone}
                        />
                    </NurseFormReadOnlyShell>
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot>
                    <NurseFormReadOnlyShell active={readOnlyFieldDisabled} variant="input">
                        <FormInputField
                            label="Emp ID *"
                            value={form.empId}
                            disabled={readOnlyFieldDisabled}
                            readOnly={readOnlyFieldDisabled}
                            className={readOnlyFieldDisabled ? NURSE_EDIT_READONLY_INPUT_CLASS : undefined}
                            onChange={(e) => {
                                if (readOnlyFieldDisabled) return;
                                setForm((p) => ({ ...p, empId: formatEmpIdInput(e.target.value) }));
                                setFormErrors((err) => ({ ...err, empId: "" }));
                            }}
                            height={44}
                            placeholder="Emp ID"
                            error={formErrors.empId}
                        />
                    </NurseFormReadOnlyShell>
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot editOrder={isEdit ? 6 : undefined}>
                    <NurseFormReadOnlyShell active={readOnlyFieldDisabled} variant="input">
                        <FormInputField
                            label="Address *"
                            value={form.address}
                            disabled={readOnlyFieldDisabled}
                            readOnly={readOnlyFieldDisabled}
                            className={readOnlyFieldDisabled ? NURSE_EDIT_READONLY_INPUT_CLASS : undefined}
                            onChange={(e) => {
                                if (readOnlyFieldDisabled) return;
                                setForm((p) => ({ ...p, address: formatAddressInput(e.target.value) }));
                                setFormErrors((err) => ({ ...err, address: "" }));
                            }}
                            height={44}
                            placeholder="Address"
                            error={formErrors.address}
                        />
                    </NurseFormReadOnlyShell>
                    </NurseFormFieldSlot>
                    <NurseFormFieldSlot editOrder={isEdit ? 10 : undefined}>
                    <FormSelectField
                        label="Status *"
                        value={form.status}
                        options={NURSE_STATUS_OPTIONS}
                        mode="single"
                        background="white"
                        onChange={(v) => {
                            setForm((p) => ({
                                ...p,
                                status: (pickSingle(v) as NursePayload["status"]) || "Active",
                            }));
                            setFormErrors((err) => ({ ...err, status: "" }));
                        }}
                        error={formErrors.status}
                    />
                    </NurseFormFieldSlot>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
                <BackToPreviousPageButton text="Back" onClick={onBack} />
                <Button type="submit" variant="primary" isLoading={submitting} disabled={submitting}>
                    {mode === "add" ? "Save" : "Update"}
                </Button>
            </div>
        </form>
    );
}
