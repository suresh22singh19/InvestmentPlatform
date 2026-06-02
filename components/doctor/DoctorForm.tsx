"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Yup from "yup";
import { Button } from "@/components/ui/Button";
import { FormInputField } from "@/components/ui/FormInputField";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { FormSelectField } from "@/components/ui/FormSelectField";
import { LoginTypeInfoIcon } from "@/components/ui/LoginTypeInfoIcon";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import type { DoctorPayload } from "@/lib/doctor/doctorStatic";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import {
    BRANCH_OPTIONS_FORM,
    DOCTOR_NAME_TITLE_OPTIONS,
    DOCTOR_TYPE_OPTIONS,
    LOGIN_TYPE_OPTIONS,
    QUALIFICATION_OPTIONS,
    SPECIALIZATION_DROPDOWN_OPTIONS,
    STATUS_OPTIONS,
    TEAM_OPTIONS,
} from "@/lib/doctor/doctorStatic";
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
} from "@/store/api/settingsApi";
import type { GetBranchRoleByCategoryTypeParams } from "@/store/api/settingsApi";
import { useGetAllDepartmentsForDoctorQuery } from "@/store/api/doctorApi";
import { DEPARTMENT_SLUG_TO_API_ID } from "@/lib/doctor/mapDoctorApi";
import { doctorFormSchema, mapDoctorFormYupErrors } from "@/lib/validation/doctorFormSchema";
import { sanitizeEmailInput } from "@/lib/utils/emailValidation";
import { fileNameFromUrl } from "@/lib/doctor/doctorPhoto";

const MAX_FIELD_LEN = 100;
const MAX_EMPLOYEE_ID_LEN = 20;
/** Max repeatable rows for education, specialization, and registration (same as Visitors Details). */
const MAX_DYNAMIC_ROWS = 5;

function newRowId() {
    return Math.random().toString(36).slice(2, 11);
}

function pickSingle(v: string | string[]): string {
    return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

/** Map GET /branches `type` to getBranchRoleByCategoryType `branchType` (API: hospital | clinic). */
function branchRecordTypeToRoleApiBranchType(apiType: string | undefined): "hospital" | "clinic" {
    const t = (apiType ?? "").toLowerCase().trim();
    if (t === "clinic") return "clinic";
    return "hospital";
}

/** Mirrors registration `PersonalDetails` patient name handling. */
function formatDoctorNameInput(raw: string): string {
    let value = raw.replace(/[^a-zA-Z\s]/g, "");
    value = value.replace(/^\s+/, "");
    value = value.replace(/(.)\1{2,}/g, "$1$1");
    if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value.slice(0, MAX_FIELD_LEN);
}

/** Mirrors registration contact: digits only, strip leading zeros, max 10. */
function formatContactDigits(raw: string): string {
    let value = raw.replace(/\D/g, "").replace(/^0+/, "");
    return value.slice(0, 10);
}

function clipStr(v: string): string {
    return v.slice(0, MAX_FIELD_LEN);
}

/** Address: letters, digits, and spaces only (same max length as other text fields). */
function formatAddressInput(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9\s]/g, "").slice(0, MAX_FIELD_LEN);
}

/** Bank name: letters and spaces only; max 100 (preserves e.g. HDFC, SBI casing). */
function formatBankNameInput(raw: string): string {
    return raw.replace(/[^a-zA-Z\s]/g, "").slice(0, MAX_FIELD_LEN);
}

/** College: letters, spaces, comma, parentheses, period. */
function formatCollegeNameInput(raw: string): string {
    return raw.replace(/[^a-zA-Z\s,().]/g, "").slice(0, MAX_FIELD_LEN);
}

/** Council reg. no.: letters, digits, and / - _ | \\ only; max 100. */
function formatCouncilRegistrationNumberInput(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9/\-_|\\]/g, "").slice(0, MAX_FIELD_LEN);
}

/** Digits only; used for year-style fields. */
function digitsOnly(raw: string, maxLen: number): string {
    return raw.replace(/\D/g, "").slice(0, maxLen);
}

/** Employee id: letters, digits, hyphen (e.g. JS20752). */
function formatEmployeeIdInput(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, MAX_EMPLOYEE_ID_LEN);
}

/** Same as BranchBankInformation: uppercase A–Z / 0–9 only, max 11 (IFSC). */
function formatIfscInput(raw: string): string {
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

/** Indian IFSC: 4 letters + 0 + 6 alphanumeric (11 chars). */
function isValidIfscFormat(s: string): boolean {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(s.trim());
}

function clearErrorPrefix(
    setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    prefix: string
) {
    setFormErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
            if (k.startsWith(prefix)) delete next[k];
        });
        return next;
    });
}

function clearTouchedPrefix(
    setTouchedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    prefix: string
) {
    setTouchedFields((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
            if (k.startsWith(prefix)) delete next[k];
        });
        return next;
    });
}

function nestedFieldError(
    formErrors: Record<string, string>,
    arrayKey: "education" | "specializations" | "registrations",
    idx: number,
    field: string
): string | undefined {
    return (
        formErrors[`${arrayKey}[${idx}].${field}`] ?? formErrors[`${arrayKey}.${idx}.${field}`]
    );
}

/** Per-row options: hide values already chosen on other rows; keep placeholder (`value === ""`) and this row's current value. */
function selectOptionsExcludingOtherRows(
    allOptions: SelectOption[],
    pickedByRow: string[],
    currentRowIndex: number
): SelectOption[] {
    const current = (pickedByRow[currentRowIndex] ?? "").trim();
    const takenElsewhere = new Set(
        pickedByRow
            .map((v, i) => (i !== currentRowIndex ? (v ?? "").trim() : ""))
            .filter((v) => v.length > 0)
    );
    const filtered = allOptions.filter((o) => {
        const v = (o.value ?? "").trim();
        if (v === "") return true;
        if (v === current) return true;
        return !takenElsewhere.has(v);
    });
    // e.g. more rows than distinct specialization options — avoid an empty dropdown
    return filtered.length > 0 ? filtered : allOptions;
}

const NABH_REGISTERED_OPTIONS = ["Yes", "No"] as const;

const PROFILE_IMAGE_ACCEPT = "image/png,image/jpeg,.png,.jpg,.jpeg";
const PROFILE_IMAGE_MAX_PX = 128;

/** PNG/JPEG only; dimensions must not exceed 128×128 (same as registration-style constraints). */
function validateDoctorProfileImage(file: File): Promise<string | null> {
    const extOk = /\.(png|jpe?g)$/i.test(file.name);
    const type = (file.type || "").toLowerCase();
    const typeOk =
        type === "image/png" || type === "image/jpeg" || type === "image/pjpeg";
    if (type && !typeOk) {
        return Promise.resolve("Only PNG or JPG images are allowed.");
    }
    if (!type && !extOk) {
        return Promise.resolve("Only PNG or JPG files are allowed.");
    }
    return new Promise((resolve) => {
        if (typeof window === "undefined") {
            resolve(null);
            return;
        }
        const img = new window.Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (w > PROFILE_IMAGE_MAX_PX || h > PROFILE_IMAGE_MAX_PX) {
                resolve(
                    `Image must be at most ${PROFILE_IMAGE_MAX_PX}×${PROFILE_IMAGE_MAX_PX} pixels (this file is ${w}×${h}).`
                );
            } else {
                resolve(null);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve("Could not read the image. Please use a valid PNG or JPG file.");
        };
        img.src = url;
    });
}

const DOCUMENT_UPLOAD_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Images or PDF only; max 2 MB. */
function validateDoctorDocumentFile(file: File): Promise<string | null> {
    const type = (file.type || "").toLowerCase();
    const base = file.name.split(/[/\\]/).pop() ?? file.name;
    const n = base.toLowerCase();
    const isPdf = type === "application/pdf" || n.endsWith(".pdf");
    const isImageMime = type.startsWith("image/");
    const looksImageExt = /\.(jpe?g|png|gif|webp|bmp|svg|ico|heic|heif)$/i.test(base);
    if (!isPdf && !isImageMime && !looksImageExt) {
        return Promise.resolve("Only image or PDF files are allowed.");
    }
    if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
        return Promise.resolve("File size must be 2 MB or less.");
    }
    return Promise.resolve(null);
}

function SectionCard({
    title,
    iconSrc,
    children,
    headerAction,
}: {
    title: string;
    iconSrc: string;
    children: React.ReactNode;
    /** e.g. add row control shown top-right when multiple rows exist */
    headerAction?: React.ReactNode;
}) {
    return (
        <div className="rounded-[16px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_4px_24px_rgba(34,56,43,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-[#262D3B]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                        <Image src={iconSrc} alt="" width={20} height={20} />
                    </span>
                    {title}
                </h2>
                {headerAction ? (
                    <div className="flex shrink-0 items-center justify-end">{headerAction}</div>
                ) : null}
            </div>
            {children}
        </div>
    );
}

/** Optional files for doctor update/create (multipart), same idea as profile `imgUrl` on `updateProfile`. */
export type DoctorFormSubmitFiles = {
    imgUrl: File | null;
    attachment: File | null;
};

type DoctorFormProps = {
    mode: "add" | "edit";
    initial: DoctorPayload;
    onSubmit: (payload: DoctorPayload, files: DoctorFormSubmitFiles) => void | Promise<void>;
    onBack: () => void;
};

function AddRowButton({
    onClick,
    ariaLabel,
    disabled,
}: {
    onClick: () => void;
    ariaLabel: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            aria-label={ariaLabel}
            onClick={onClick}
            disabled={disabled}
            title={disabled ? `Maximum ${MAX_DYNAMIC_ROWS} rows allowed` : undefined}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-semibold leading-none text-white shadow-sm transition ${
                disabled
                    ? "cursor-not-allowed bg-[#98A2B3] opacity-60"
                    : "bg-[#0B8C00] hover:bg-[#0a7a00]"
            }`}
        >
            +
        </button>
    );
}

/** Same pattern as `VisitorsDetails`: green circular control with trash icon. */
function RemoveRowButton({
    onClick,
    disabled,
    ariaLabel,
}: {
    onClick: () => void;
    disabled?: boolean;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            className="flex shrink-0 items-center justify-center"
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            <Image
                src="/icons/TrashGreenIcon.svg"
                alt=""
                width={44}
                height={44}
                className={disabled ? "cursor-not-allowed opacity-40" : ""}
            />
        </button>
    );
}

export function DoctorForm({ mode, initial, onSubmit, onBack }: DoctorFormProps) {
    const [values, setValues] = useState<DoctorPayload>(initial);
    const [profileFileName, setProfileFileName] = useState("");
    const [docFileName, setDocFileName] = useState("");
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitLockRef = useRef(false);
    const roleCategoryType = useAppSelector(selectRoleCategoryType);
    const selectedBranch = useAppSelector(selectSelectedBranch);
    const userBranchId = useAppSelector(selectUserBranchId);
    const userBranchName = useAppSelector(selectUserBranchName);

    const roleLc = roleCategoryType?.toLowerCase() ?? "";
    const isSuperAdmin = roleLc === "superadmin";
    const isFacilityUser = roleLc === "facility";

    /** Single branch for facility (and fallback for locked users): header branch or JWT user branch. */
    const singleBranchFromAuth = useMemo((): SelectOption | null => {
        if (selectedBranch?.id != null) {
            return {
                value: String(selectedBranch.id),
                label: (selectedBranch.name ?? "").trim() || `Branch ${selectedBranch.id}`,
            };
        }
        const id = userBranchId != null ? Number(userBranchId) : NaN;
        if (Number.isFinite(id) && id > 0) {
            const label = (userBranchName ?? "").trim() || `Branch ${id}`;
            return { value: String(id), label };
        }
        return null;
    }, [selectedBranch, userBranchId, userBranchName]);

    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
        skip: !isSuperAdmin,
    });

    const { data: departmentsResponse } = useGetAllDepartmentsForDoctorQuery();
    const departmentRows = useMemo(() => {
        const res = departmentsResponse;
        return res?.success && Array.isArray(res.data) ? res.data : [];
    }, [departmentsResponse]);

    const departmentOptions = useMemo((): SelectOption[] => {
        const opts: SelectOption[] = [{ value: "", label: "--Select--" }];
        for (const d of departmentRows) {
            opts.push({ value: String(d.id), label: d.name });
        }
        return opts;
    }, [departmentRows]);

    const branchOptionsForm = useMemo((): SelectOption[] => {
        if (isSuperAdmin) {
            const rows = branchesData?.success ? branchesData.data : undefined;
            if (!Array.isArray(rows) || rows.length === 0) {
                return BRANCH_OPTIONS_FORM;
            }
            return rows.map((b) => ({
                value: String(b.id),
                label: b.name ?? "",
            }));
        }
        if (isFacilityUser) {
            if (singleBranchFromAuth) {
                return [singleBranchFromAuth];
            }
            return [
                {
                    value: "",
                    label: "No branch assigned",
                    disabled: true,
                },
            ];
        }
        if (selectedBranch?.id != null) {
            return [
                {
                    value: String(selectedBranch.id),
                    label: selectedBranch.name ?? "",
                },
            ];
        }
        if (singleBranchFromAuth) {
            return [singleBranchFromAuth];
        }
        return BRANCH_OPTIONS_FORM;
    }, [isSuperAdmin, isFacilityUser, branchesData, selectedBranch, singleBranchFromAuth]);

    /** Effective branch id for loading facility_doctor roles (matches branch selector / locked JWT branch). */
    const resolvedBranchIdForRoleDropdown = useMemo(() => {
        if (!isSuperAdmin && singleBranchFromAuth?.value) return singleBranchFromAuth.value.trim();
        return values.branchId.trim();
    }, [isSuperAdmin, singleBranchFromAuth, values.branchId]);

    const assignableRolesQueryArgs = useMemo((): GetBranchRoleByCategoryTypeParams | null => {
        const bid = resolvedBranchIdForRoleDropdown;
        if (!bid) return null;
        const n = Number.parseInt(bid, 10);
        if (!Number.isFinite(n) || n <= 0) return null;
        const rows = branchesData?.success && Array.isArray(branchesData.data) ? branchesData.data : [];
        const branchRow = rows.find((b) => b.id === n);
        const branchType = branchRecordTypeToRoleApiBranchType(branchRow?.type as string | undefined);
        return { roleCategoryType: "facility_doctor", branchId: n, branchType };
    }, [resolvedBranchIdForRoleDropdown, branchesData]);

    const { data: assignableRolesRes, isFetching: isLoadingAssignableRoles } =
        useGetBranchRoleByCategoryTypeQuery(assignableRolesQueryArgs ?? { roleCategoryType: "corporate" }, {
            skip: assignableRolesQueryArgs === null,
            refetchOnMountOrArgChange: true,
        });

    const assignableRoleOptions: SelectOption[] = useMemo(() => {
        const rows = Array.isArray(assignableRolesRes?.data) ? assignableRolesRes.data : [];
        return rows
            .filter((r) => r.isActive !== false)
            .map((r) => ({ value: String(r.id), label: r.name }));
    }, [assignableRolesRes]);

    const selectableBranchCount = useMemo(
        () => branchOptionsForm.filter((o) => !o.disabled).length,
        [branchOptionsForm]
    );

    /** Edit: branch cannot change. Add: non–super-admin locked unless exactly one selectable branch. */
    const branchFieldDisabled =
        mode === "edit" || (!isSuperAdmin && selectableBranchCount !== 1);

    useEffect(() => {
        setValues(() => {
            const next = { ...initial };
            if (!isSuperAdmin && singleBranchFromAuth?.value) {
                next.branchId = singleBranchFromAuth.value;
            }
            next.nameTitle = "Dr";
            return next;
        });
        setProfileFileName(fileNameFromUrl(initial.profileImageUrl));
        setDocFileName(fileNameFromUrl(initial.attachmentUrl));
        setProfileImageFile(null);
        setAttachmentFile(null);
        setFormErrors({});
        setTouchedFields({ nabhRegistered: true });
    }, [initial, isSuperAdmin, singleBranchFromAuth?.value, mode]);

    /** Map API department ids to the select; coerce legacy slug values; default add form to first department when loaded. */
    useEffect(() => {
        if (departmentRows.length === 0) return;
        const allowed = new Set(departmentRows.map((r) => String(r.id)));

        setValues((prev) => {
            const raw = (prev.department ?? "").trim();
            let normalized = raw;
            if (raw && !/^\d+$/.test(raw)) {
                const slugId = DEPARTMENT_SLUG_TO_API_ID[raw];
                if (slugId != null) normalized = String(slugId);
            }

            if (normalized && allowed.has(normalized)) {
                return normalized === prev.department ? prev : { ...prev, department: normalized };
            }

            if (mode === "add") {
                const first = String(departmentRows[0].id);
                if (!normalized || !allowed.has(normalized)) {
                    return { ...prev, department: first };
                }
            }

            if (normalized && !allowed.has(normalized)) {
                return { ...prev, department: "" };
            }

            return prev;
        });
    }, [departmentRows, mode]);

    const validateFieldWithPayload = async (field: string, payload: DoctorPayload) => {
        try {
            await doctorFormSchema.validateAt(field, payload);
            setFormErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        } catch (err) {
            if (err instanceof Yup.ValidationError) {
                setFormErrors((prev) => ({ ...prev, [field]: err.message }));
            }
        }
    };

    const markTouched = (field: string) => {
        setTouchedFields((prev) => ({ ...prev, [field]: true }));
    };

    const blurAndValidate = (field: string) => {
        markTouched(field);
        void validateFieldWithPayload(field, values);
    };

    const setField = <K extends keyof DoctorPayload>(key: K, v: DoctorPayload[K]) => {
        const field = String(key);
        setValues((prev) => {
            const next = { ...prev, [key]: v };
            if (touchedFields[field] || Boolean(formErrors[field])) {
                void validateFieldWithPayload(field, next);
            }
            return next;
        });
    };

    const ifscTrimmed = values.ifscCode.trim();
    const ifscLive = useMemo(() => {
        const t = ifscTrimmed;
        if (t.length !== 11) {
            return { error: undefined as string | undefined, helper: undefined as string | undefined };
        }
        if (isValidIfscFormat(t)) {
            return { error: undefined, helper: "Valid IFSC code" };
        }
        return { error: "Enter a valid IFSC code", helper: undefined };
    }, [ifscTrimmed]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitLockRef.current) return;
        const payload = { ...values };
        if (!isSuperAdmin && singleBranchFromAuth?.value) {
            payload.branchId = singleBranchFromAuth.value;
        }
        if (!touchedFields.nabhRegistered) {
            setFormErrors((prev) => ({ ...prev, nabhRegistered: "NABH Registered is required" }));
            if (typeof window !== "undefined") {
                window.requestAnimationFrame(() => {
                    const el = document.querySelector("[data-doctor-form-error]");
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                });
            }
            return;
        }
        submitLockRef.current = true;
        setIsSubmitting(true);
        try {
            await doctorFormSchema.validate(payload, { abortEarly: false });
            setFormErrors({});
            await Promise.resolve(
                onSubmit(payload, { imgUrl: profileImageFile, attachment: attachmentFile })
            );
        } catch (err) {
            if (err instanceof Yup.ValidationError) {
                setFormErrors(mapDoctorFormYupErrors(err));
                if (typeof window !== "undefined") {
                    window.requestAnimationFrame(() => {
                        const el = document.querySelector("[data-doctor-form-error]");
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    });
                }
            }
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="relative space-y-6">
            <div data-doctor-form-error className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden" aria-hidden />
            <SectionCard title="Basic Information" iconSrc="/icons/patientinfo.svg">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className={branchFieldDisabled ? "cursor-not-allowed" : undefined}>
                        <FormSelectField
                            label="Branch *"
                            value={
                                !isSuperAdmin && singleBranchFromAuth?.value
                                    ? singleBranchFromAuth.value
                                    : values.branchId
                            }
                            onChange={(v) => {
                                if (branchFieldDisabled) return;
                                const selected = pickSingle(v);
                                markTouched("branchId");
                                setValues((prev) => {
                                    const next = { ...prev, branchId: selected, assignableRoleId: "" };
                                    queueMicrotask(() => {
                                        void validateFieldWithPayload("branchId", next);
                                        void validateFieldWithPayload("assignableRoleId", next);
                                    });
                                    return next;
                                });
                            }}
                            options={branchOptionsForm}
                            placeholder={
                                isFacilityUser && !singleBranchFromAuth
                                    ? "No branch"
                                    : isLoadingBranches
                                      ? "Loading branches…"
                                      : "Select"
                            }
                            mode="single"
                            background="white"
                            disabled={branchFieldDisabled}
                            error={formErrors.branchId}
                        />
                    </div>
                    <div>
                        <FormSelectField
                            label="Role *"
                            value={values.assignableRoleId || null}
                            onChange={(value) => {
                                if (mode === "edit") return;
                                const id = Array.isArray(value) ? value[0] : value;
                                setValues((prev) => {
                                    const next = { ...prev, assignableRoleId: id || "" };
                                    markTouched("assignableRoleId");
                                    void validateFieldWithPayload("assignableRoleId", next);
                                    setFormErrors((e) => ({ ...e, assignableRoleId: "" }));
                                    return next;
                                });
                            }}
                            options={assignableRoleOptions}
                            placeholder={
                                isLoadingAssignableRoles
                                    ? "Loading roles..."
                                    : !resolvedBranchIdForRoleDropdown
                                      ? "Select branch first"
                                      : "Select role"
                            }
                            mode="single"
                            background="white"
                            disabled={
                                mode === "edit" ||
                                isLoadingAssignableRoles ||
                                assignableRoleOptions.length === 0 ||
                                !resolvedBranchIdForRoleDropdown
                            }
                            error={formErrors.assignableRoleId}
                        />
                    </div>
                    <FileUploadField
                        label="Profile Image"
                        placeholder="PNG or JPG, max 128×128 px"
                        value={profileFileName}
                        onChange={(file, name) => {
                            setProfileFileName(name);
                            setProfileImageFile(file);
                            if (!file && !name) {
                                setField("profileImageUrl", null);
                            }
                        }}
                        accept={PROFILE_IMAGE_ACCEPT}
                        validateFile={validateDoctorProfileImage}
                    />

                    <div className="flex min-w-0 gap-2">
                        <div data-field="nameTitle" className="scroll-mt-4 w-[115px] shrink-0">
                            <FormSelectField
                                label="Title *"
                                options={DOCTOR_NAME_TITLE_OPTIONS}
                                placeholder="Select"
                                background="white"
                                width={115}
                                dropdownWidth={160}
                                mode="single"
                                value={values.nameTitle || null}
                                onChange={(value) => {
                                    const selectedValue = Array.isArray(value) ? value[0] : value;
                                    const v = (selectedValue ?? "").toString();
                                    markTouched("nameTitle");
                                    setValues((prev) => {
                                        const next = { ...prev, nameTitle: v };
                                        void validateFieldWithPayload("nameTitle", next);
                                        return next;
                                    });
                                }}
                                onBlur={() => blurAndValidate("nameTitle")}
                                error={formErrors.nameTitle}
                            />
                        </div>
                        <div className="min-w-0 flex-1" data-field="name">
                            <FormInputField
                                label="Name *"
                                value={values.name}
                                onChange={(e) => setField("name", formatDoctorNameInput(e.target.value))}
                                onBlur={(e) => {
                                    setField("name", e.target.value.trim());
                                    blurAndValidate("name");
                                }}
                                height={44}
                                placeholder="Full name"
                                maxLength={MAX_FIELD_LEN}
                                error={formErrors.name}
                            />
                        </div>
                    </div>
                    <FormInputField
                        label="Email/Username *"
                        type="email"
                        value={values.email}
                        onChange={(e) => setField("email", sanitizeEmailInput(e.target.value))}
                        onBlur={() => blurAndValidate("email")}
                        height={44}
                        placeholder="email@example.com"
                        maxLength={MAX_FIELD_LEN}
                        error={formErrors.email}
                        disabled={mode === "edit"}
                    />
                    <div className="w-full min-w-0 xl:col-span-1">
                        <PatientTypeButtonGroup
                            options={[...NABH_REGISTERED_OPTIONS]}
                            value={values.nabhRegistered ? "yes" : "no"}
                            onChange={(value) => {
                                setField("nabhRegistered", value === "yes");
                                markTouched("nabhRegistered");
                                setFormErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.nabhRegistered;
                                    return next;
                                });
                            }}
                            onBlur={() => blurAndValidate("nabhRegistered")}
                            label="NABH Registered"
                            required
                            error={formErrors.nabhRegistered}
                            dataField="nabhRegistered"
                        />
                    </div>
                    <FormInputField
                        label="Contact *"
                        type="tel"
                        value={values.contact}
                        onChange={(e) => setField("contact", formatContactDigits(e.target.value))}
                        onBlur={() => blurAndValidate("contact")}
                        height={44}
                        placeholder="Contact"
                        maxLength={10}
                        error={formErrors.contact}
                        disabled={mode === "edit"}
                    />
                    <FormInputField
                        label="Alt Contact"
                        type="tel"
                        value={values.altContact}
                        onChange={(e) => setField("altContact", formatContactDigits(e.target.value))}
                        onBlur={() => blurAndValidate("altContact")}
                        height={44}
                        placeholder="Alt Contact"
                        maxLength={10}
                        error={formErrors.altContact}
                    />
                    <FormInputField
                        label="Year of Experience"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="off"
                        value={values.yearsExperience}
                        onChange={(e) => setField("yearsExperience", digitsOnly(e.target.value, 3))}
                        onBlur={() => blurAndValidate("yearsExperience")}
                        height={44}
                        placeholder="e.g. 5"
                        maxLength={3}
                        error={formErrors.yearsExperience}
                    />
                    <FormSelectField
                        label="Department"
                        value={values.department}
                        onChange={(v) => {
                            const selected = pickSingle(v);
                            setField("department", selected);
                            if (selected) {
                                markTouched("department");
                                const nextPayload = { ...values, department: selected };
                                void validateFieldWithPayload("department", nextPayload);
                            }
                        }}
                        options={departmentOptions}
                        placeholder="--Select--"
                        mode="single"
                        background="white"
                        error={formErrors.department}
                    />
                    {/* <FormInputField
                        label="OPD Fee *"
                        value={values.opdFee}
                        onChange={(e) => setField("opdFee", e.target.value)}
                        height={44}
                        placeholder="OPD Fee"
                    /> */}
                    <FormSelectField
                        label="Login Type"
                        labelSuffix={<LoginTypeInfoIcon entity="doctor" size={14} />}
                        value={values.loginType}
                        onChange={(v) => {
                            const raw = pickSingle(v) || "no-auth";
                            const loginType =
                                raw === "no-auth" || raw === "ip" || raw === "otp" || raw === "ip-otp"
                                    ? raw
                                    : "no-auth";
                            setField("loginType", loginType);
                            markTouched("loginType");
                            const nextPayload = { ...values, loginType };
                            void validateFieldWithPayload("loginType", nextPayload);
                        }}
                        options={LOGIN_TYPE_OPTIONS}
                        placeholder="Select"
                        mode="single"
                        background="white"
                        error={formErrors.loginType}
                    />
                     <FormInputField
                            label="Employee Id *"
                            type="text"
                            autoComplete="off"
                            value={values.employeeId}
                            onChange={(e) => setField("employeeId", formatEmployeeIdInput(e.target.value))}
                            onBlur={() => blurAndValidate("employeeId")}
                            height={44}
                            placeholder="Employee Id"
                            maxLength={MAX_EMPLOYEE_ID_LEN}
                            error={formErrors.employeeId}
                            disabled={mode === "edit"}
                        />
                    {/* <FormSelectField
                        label="Doctor Type *"
                        value={values.doctorType}
                        onChange={(v) => setField("doctorType", pickSingle(v) || "team")}
                        options={DOCTOR_TYPE_OPTIONS}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    /> */}
                    {/* {values.doctorType === "team" ? (
                        <FormSelectField
                            label="Select Team"
                            value={values.selectTeam}
                            onChange={(v) => setField("selectTeam", pickSingle(v))}
                            options={TEAM_OPTIONS}
                            placeholder="Select"
                            mode="single"
                            background="white"
                        /> */}
                    {/* ) : null} */}
                    {/* <div className={mode === "add" ? "min-w-0 xl:col-span-2" : "min-w-0"}>
                        <FormInputField
                            label="Employee Id *"
                            type="text"
                            autoComplete="off"
                            value={values.employeeId}
                            onChange={(e) => setField("employeeId", formatEmployeeIdInput(e.target.value))}
                            onBlur={() => blurAndValidate("employeeId")}
                            height={44}
                            placeholder="Employee Id"
                            maxLength={MAX_FIELD_LEN}
                            error={formErrors.employeeId}
                            disabled={mode === "edit"}
                        />
                    </div> */}
                    {mode === "edit" ? (
                        <FormSelectField
                            label="Status"
                            value={values.status === "Active" ? "active" : "inactive"}
                            onChange={(v) => {
                                const raw = pickSingle(v);
                                const nextStatus: "Active" | "Inactive" =
                                    raw === "active" ? "Active" : "Inactive";
                                setField("status", nextStatus);
                                markTouched("status");
                                const nextPayload = {
                                    ...values,
                                    status: nextStatus,
                                };
                                void validateFieldWithPayload("status", nextPayload);
                            }}
                            options={STATUS_OPTIONS}
                            placeholder="Select"
                            mode="single"
                            background="white"
                            error={formErrors.status}
                        />
                    ) : null}
                </div>
            </SectionCard>

            <SectionCard title="Address Information" iconSrc="/icons/addressicon.svg">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormInputField
                        label="Address *"
                        value={values.address}
                        onChange={(e) => setField("address", formatAddressInput(e.target.value))}
                        onBlur={(e) => {
                            setField("address", e.target.value.trim());
                            blurAndValidate("address");
                        }}
                        height={44}
                        placeholder="Full address"
                        maxLength={MAX_FIELD_LEN}
                        error={formErrors.address}
                    />
                    <FormInputField
                        label="City"
                        value={values.city}
                        onChange={(e) => setField("city", formatDoctorNameInput(e.target.value))}
                        onBlur={(e) => {
                            setField("city", e.target.value.trim());
                            blurAndValidate("city");
                        }}
                        height={44}
                        placeholder="City"
                        maxLength={MAX_FIELD_LEN}
                        error={formErrors.city}
                    />
                </div>
            </SectionCard>

            <SectionCard title="Bank Details" iconSrc="/icons/bankdetails.svg">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormInputField
                        label="Bank Name"
                        value={values.bankName}
                        onChange={(e) => setField("bankName", formatBankNameInput(e.target.value))}
                        onBlur={(e) => {
                            setField("bankName", e.target.value.trim());
                            blurAndValidate("bankName");
                        }}
                        height={44}
                        placeholder="Enter Bank Name"
                        maxLength={MAX_FIELD_LEN}
                        error={formErrors.bankName}
                    />
                    <FormInputField
                        label="Account Number"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="off"
                        value={values.accountNumber}
                        onChange={(e) => setField("accountNumber", digitsOnly(e.target.value, 20))}
                        onBlur={() => blurAndValidate("accountNumber")}
                        height={44}
                        placeholder="Enter Account Number"
                        maxLength={20}
                        // helperText="If entered: 8–20 digits only"
                        error={formErrors.accountNumber}
                    />
                    <FormInputField
                        label="IFSC Code"
                        value={values.ifscCode}
                        onChange={(e) => setField("ifscCode", formatIfscInput(e.target.value))}
                        onBlur={() => blurAndValidate("ifscCode")}
                        height={44}
                        placeholder="Enter the IFSC code"
                        maxLength={11}
                        error={formErrors.ifscCode ?? ifscLive.error}
                        helperText={ifscLive.helper}
                    />
                </div>
            </SectionCard>

            <SectionCard
                title="Education"
                iconSrc="/icons/educations.svg"
                headerAction={
                    <AddRowButton
                        ariaLabel="Add education row"
                        disabled={values.education.length >= MAX_DYNAMIC_ROWS}
                        onClick={() => {
                            setValues((p) => {
                                if (p.education.length >= MAX_DYNAMIC_ROWS) return p;
                                return {
                                    ...p,
                                    education: [
                                        ...p.education,
                                        {
                                            id: newRowId(),
                                            qualification: "",
                                            college: "",
                                            completionYears: "",
                                        },
                                    ],
                                };
                            });
                        }}
                    />
                }
            >
                <div className="space-y-4">
                    {values.education.map((row, idx) => {
                        const canRemoveEducation = values.education.length > 1;
                        return (
                            <div
                                key={row.id}
                                className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4"
                            >
                                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
                                    <FormSelectField
                                        label="Qualification"
                                        value={row.qualification}
                                        onChange={(v) => {
                                            const val = pickSingle(v);
                                            clearErrorPrefix(setFormErrors, "education");
                                            setValues((p) => ({
                                                ...p,
                                                education: p.education.map((e, i) =>
                                                    i === idx ? { ...e, qualification: val } : e
                                                ),
                                            }));
                                            const field = `education[${idx}].qualification`;
                                            markTouched(field);
                                            const nextPayload = {
                                                ...values,
                                                education: values.education.map((e, i) =>
                                                    i === idx ? { ...e, qualification: val } : e
                                                ),
                                            };
                                            void validateFieldWithPayload(field, nextPayload);
                                        }}
                                        options={selectOptionsExcludingOtherRows(
                                            QUALIFICATION_OPTIONS,
                                            values.education.map((e) => e.qualification),
                                            idx
                                        )}
                                        placeholder="--Select--"
                                        mode="single"
                                        background="white"
                                        error={nestedFieldError(formErrors, "education", idx, "qualification")}
                                    />

                                    <FormInputField
                                        label="College"
                                        value={row.college}
                                        onChange={(e) => {
                                            const val = formatCollegeNameInput(e.target.value);
                                            clearErrorPrefix(setFormErrors, "education");
                                            setValues((p) => ({
                                                ...p,
                                                education: p.education.map((ed, i) =>
                                                    i === idx ? { ...ed, college: val } : ed
                                                ),
                                            }));
                                        }}
                                        onBlur={(e) => {
                                            const val = e.target.value.trim();
                                            clearErrorPrefix(setFormErrors, "education");
                                            setValues((p) => ({
                                                ...p,
                                                education: p.education.map((ed, i) =>
                                                    i === idx ? { ...ed, college: val } : ed
                                                ),
                                            }));
                                            const field = `education[${idx}].college`;
                                            markTouched(field);
                                            const nextPayload = {
                                                ...values,
                                                education: values.education.map((ed, i) =>
                                                    i === idx ? { ...ed, college: val } : ed
                                                ),
                                            };
                                            void validateFieldWithPayload(field, nextPayload);
                                        }}
                                        height={44}
                                        placeholder="College"
                                        maxLength={MAX_FIELD_LEN}
                                        error={nestedFieldError(formErrors, "education", idx, "college")}
                                    />

                                    <FormInputField
                                        label="Completion Years"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        value={row.completionYears}
                                        onChange={(e) => {
                                            const val = digitsOnly(e.target.value, 4);
                                            clearErrorPrefix(setFormErrors, "education");
                                            setValues((p) => ({
                                                ...p,
                                                education: p.education.map((ed, i) =>
                                                    i === idx ? { ...ed, completionYears: val } : ed
                                                ),
                                            }));
                                            const field = `education[${idx}].completionYears`;
                                            if (touchedFields[field]) {
                                                const nextPayload = {
                                                    ...values,
                                                    education: values.education.map((ed, i) =>
                                                        i === idx ? { ...ed, completionYears: val } : ed
                                                    ),
                                                };
                                                void validateFieldWithPayload(field, nextPayload);
                                            }
                                        }}
                                        onBlur={() => {
                                            const field = `education[${idx}].completionYears`;
                                            markTouched(field);
                                            void validateFieldWithPayload(field, values);
                                        }}
                                        height={44}
                                        placeholder="Year"
                                        maxLength={4}
                                        error={nestedFieldError(formErrors, "education", idx, "completionYears")}
                                    />
                                </div>

                                {canRemoveEducation ? (
                                    <div className="flex shrink-0 items-end justify-end md:pb-1">
                                        <RemoveRowButton
                                            ariaLabel="Remove education row"
                                            onClick={() => {
                                                setValues((p) => {
                                                    if (p.education.length <= 1) return p;
                                                    return {
                                                        ...p,
                                                        education: p.education.filter((e) => e.id !== row.id),
                                                    };
                                                });
                                                clearErrorPrefix(setFormErrors, "education");
                                                clearTouchedPrefix(setTouchedFields, "education");
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            <SectionCard
                title="Specialization"
                iconSrc="/icons/specialization.svg"
                headerAction={
                    <AddRowButton
                        ariaLabel="Add specialization row"
                        disabled={values.specializations.length >= MAX_DYNAMIC_ROWS}
                        onClick={() => {
                            setValues((p) => {
                                if (p.specializations.length >= MAX_DYNAMIC_ROWS) return p;
                                return {
                                    ...p,
                                    specializations: [
                                        ...p.specializations,
                                        { id: newRowId(), specialization: "" },
                                    ],
                                };
                            });
                        }}
                    />
                }
            >
                <div className="space-y-4">
                    {values.specializations.map((row, idx) => {
                        const canRemoveSpec = values.specializations.length > 1;
                        return (
                            <div
                                key={row.id}
                                className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4"
                            >
                                <div className="min-w-0 flex-1">
                                    <FormSelectField
                                        label="Add Specialization"
                                        value={row.specialization}
                                        onChange={(v) => {
                                            const val = pickSingle(v);
                                            clearErrorPrefix(setFormErrors, "specializations");
                                            setValues((p) => ({
                                                ...p,
                                                specializations: p.specializations.map((s, i) =>
                                                    i === idx ? { ...s, specialization: val } : s
                                                ),
                                            }));
                                            const field = `specializations[${idx}].specialization`;
                                            markTouched(field);
                                            const nextPayload = {
                                                ...values,
                                                specializations: values.specializations.map((s, i) =>
                                                    i === idx ? { ...s, specialization: val } : s
                                                ),
                                            };
                                            void validateFieldWithPayload(field, nextPayload);
                                        }}
                                        options={selectOptionsExcludingOtherRows(
                                            SPECIALIZATION_DROPDOWN_OPTIONS,
                                            values.specializations.map((s) => s.specialization),
                                            idx
                                        )}
                                        placeholder="Select"
                                        mode="single"
                                        background="white"
                                        error={nestedFieldError(formErrors, "specializations", idx, "specialization")}
                                    />
                                </div>

                                {canRemoveSpec ? (
                                    <div className="flex shrink-0 items-end justify-end md:pb-1">
                                        <RemoveRowButton
                                            ariaLabel="Remove specialization row"
                                            onClick={() => {
                                                setValues((p) => {
                                                    if (p.specializations.length <= 1) return p;
                                                    return {
                                                        ...p,
                                                        specializations: p.specializations.filter(
                                                            (s) => s.id !== row.id
                                                        ),
                                                    };
                                                });
                                                clearErrorPrefix(setFormErrors, "specializations");
                                                clearTouchedPrefix(setTouchedFields, "specializations");
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            <SectionCard
                title="Registration Detail"
                iconSrc="/icons/registrations.svg"
                headerAction={
                    <AddRowButton
                        ariaLabel="Add registration row"
                        disabled={values.registrations.length >= MAX_DYNAMIC_ROWS}
                        onClick={() => {
                            setValues((p) => {
                                if (p.registrations.length >= MAX_DYNAMIC_ROWS) return p;
                                return {
                                    ...p,
                                    registrations: [
                                        ...p.registrations,
                                        {
                                            id: newRowId(),
                                            councilRegistrationNumber: "",
                                            councilName: "",
                                            year: "",
                                        },
                                    ],
                                };
                            });
                        }}
                    />
                }
            >
                <div className="space-y-4">
                    {values.registrations.map((row, idx) => {
                        const canRemoveReg = values.registrations.length > 1;
                        return (
                            <div
                                key={row.id}
                                className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4"
                            >
                                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
                                    <FormInputField
                                        label="Council Registration Number"
                                        value={row.councilRegistrationNumber}
                                        onChange={(e) => {
                                            const val = formatCouncilRegistrationNumberInput(e.target.value);
                                            clearErrorPrefix(setFormErrors, "registrations");
                                            setValues((p) => ({
                                                ...p,
                                                registrations: p.registrations.map((r, i) =>
                                                    i === idx ? { ...r, councilRegistrationNumber: val } : r
                                                ),
                                            }));
                                        }}
                                        onBlur={(e) => {
                                            const val = e.target.value.trim();
                                            clearErrorPrefix(setFormErrors, "registrations");
                                            setValues((p) => ({
                                                ...p,
                                                registrations: p.registrations.map((r, i) =>
                                                    i === idx ? { ...r, councilRegistrationNumber: val } : r
                                                ),
                                            }));
                                            const field = `registrations[${idx}].councilRegistrationNumber`;
                                            markTouched(field);
                                            const nextPayload = {
                                                ...values,
                                                registrations: values.registrations.map((r, i) =>
                                                    i === idx ? { ...r, councilRegistrationNumber: val } : r
                                                ),
                                            };
                                            void validateFieldWithPayload(field, nextPayload);
                                        }}
                                        height={44}
                                        maxLength={MAX_FIELD_LEN}
                                        error={nestedFieldError(
                                            formErrors,
                                            "registrations",
                                            idx,
                                            "councilRegistrationNumber"
                                        )}
                                    />

                                    <FormInputField
                                        label="Council Name"
                                        value={row.councilName}
                                        onChange={(e) => {
                                            const val = formatDoctorNameInput(e.target.value);
                                            clearErrorPrefix(setFormErrors, "registrations");
                                            setValues((p) => ({
                                                ...p,
                                                registrations: p.registrations.map((r, i) =>
                                                    i === idx ? { ...r, councilName: val } : r
                                                ),
                                            }));
                                        }}
                                        onBlur={(e) => {
                                            const val = e.target.value.trim();
                                            clearErrorPrefix(setFormErrors, "registrations");
                                            setValues((p) => ({
                                                ...p,
                                                registrations: p.registrations.map((r, i) =>
                                                    i === idx ? { ...r, councilName: val } : r
                                                ),
                                            }));
                                            const field = `registrations[${idx}].councilName`;
                                            markTouched(field);
                                            const nextPayload = {
                                                ...values,
                                                registrations: values.registrations.map((r, i) =>
                                                    i === idx ? { ...r, councilName: val } : r
                                                ),
                                            };
                                            void validateFieldWithPayload(field, nextPayload);
                                        }}
                                        height={44}
                                        placeholder="Council name"
                                        maxLength={MAX_FIELD_LEN}
                                        error={nestedFieldError(formErrors, "registrations", idx, "councilName")}
                                    />

                                    <FormInputField
                                        label="Year"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        value={row.year}
                                        onChange={(e) => {
                                            const val = digitsOnly(e.target.value, 4);
                                            clearErrorPrefix(setFormErrors, "registrations");
                                            setValues((p) => ({
                                                ...p,
                                                registrations: p.registrations.map((r, i) =>
                                                    i === idx ? { ...r, year: val } : r
                                                ),
                                            }));
                                            const field = `registrations[${idx}].year`;
                                            if (touchedFields[field]) {
                                                const nextPayload = {
                                                    ...values,
                                                    registrations: values.registrations.map((r, i) =>
                                                        i === idx ? { ...r, year: val } : r
                                                    ),
                                                };
                                                void validateFieldWithPayload(field, nextPayload);
                                            }
                                        }}
                                        onBlur={() => {
                                            const field = `registrations[${idx}].year`;
                                            markTouched(field);
                                            void validateFieldWithPayload(field, values);
                                        }}
                                        height={44}
                                        placeholder="Year"
                                        maxLength={4}
                                        error={nestedFieldError(formErrors, "registrations", idx, "year")}
                                    />
                                </div>

                                {canRemoveReg ? (
                                    <div className="flex shrink-0 items-end justify-end md:pb-1">
                                        <RemoveRowButton
                                            ariaLabel="Remove registration row"
                                            onClick={() => {
                                                setValues((p) => {
                                                    if (p.registrations.length <= 1) return p;
                                                    return {
                                                        ...p,
                                                        registrations: p.registrations.filter((r) => r.id !== row.id),
                                                    };
                                                });
                                                clearErrorPrefix(setFormErrors, "registrations");
                                                clearTouchedPrefix(setTouchedFields, "registrations");
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            <SectionCard title="Documents & Certificate" iconSrc="/icons/UploadIcon.svg">
                <FileUploadField
                    label="Upload Document"
                    placeholder="PDF or image"
                    value={docFileName}
                    onChange={(file, name) => {
                        setDocFileName(name);
                        setAttachmentFile(file);
                        if (!file && !name) {
                            setField("attachmentUrl", null);
                        }
                    }}
                    accept="image/*,.pdf,application/pdf"
                    validateFile={validateDoctorDocumentFile}
                />
            </SectionCard>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E3EEE1] pt-6">
                <BackToPreviousPageButton text="Back" onClick={onBack} />
                <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                >
                    {mode === "edit" ? "Update" : "Save"}
                </Button>
            </div>
        </form>
    );
}
