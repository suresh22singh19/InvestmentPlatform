import type { DoctorPayload, EducationEntry, RegistrationEntry, SpecializationEntry } from "@/lib/doctor/doctorStatic";
import {
    DEPARTMENT_OPTIONS,
    QUALIFICATION_OPTIONS,
    SPECIALIZATION_DROPDOWN_OPTIONS,
    doctorDisplayName,
    optionLabel,
} from "@/lib/doctor/doctorStatic";

/** Aligns UI department slugs with backend `departmentId` (adjust when master API is wired). */
export const DEPARTMENT_SLUG_TO_API_ID: Record<string, number> = {
    "": 3,
    opd: 3,
    ipd: 2,
    "opd-ipd": 10,
    dietitian: 4,
    "ac-fan-service": 5,
    "phone-service": 6,
    "bell-service": 7,
    housekeeping: 8,
    admin: 9,
    naturopathy: 11,
    panchkarma: 12,
};

const DEPT_ID_FALLBACK = 3;

/** Default doctor role when creating/updating (matches sample API payloads). */
export const DEFAULT_DOCTOR_ROLE_ID = 3;

/**
 * Resolves `departmentId` for create/update APIs from form `payload.department`:
 * numeric string from `getAllDepartmentsForDoctor`, or legacy slug from static options / seed data.
 */
export function resolveDepartmentIdFromPayload(payload: DoctorPayload): number {
    const raw = (payload.department ?? "").trim();
    if (/^\d+$/.test(raw)) {
        const n = Number.parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return DEPARTMENT_SLUG_TO_API_ID[raw] ?? DEPT_ID_FALLBACK;
}

function departmentFormValueFromApiId(id: number | null | undefined): string {
    if (id == null || !Number.isFinite(Number(id))) return "";
    return String(Number(id));
}

/** When `department.name` is missing, resolve label from `departmentId` (same mapping as forms). */
export function departmentLabelFromApiId(departmentId: number | null | undefined): string {
    if (departmentId == null || !Number.isFinite(Number(departmentId))) return "";
    const matches = Object.entries(DEPARTMENT_SLUG_TO_API_ID).filter(([, v]) => v === departmentId);
    const slug = matches.find(([k]) => k !== "")?.[0] ?? matches[0]?.[0] ?? "";
    if (!slug) return "";
    return optionLabel(DEPARTMENT_OPTIONS, slug) || slug;
}

export type ApiDoctorListItem = {
    id: number;
    branchId: number;
    imgUrl: string | null;
    empId: string;
    name: string;
    email: string;
    phone: string;
    altPhone: string | null;
    address: string;
    city: string | null;
    experience: string;
    departmentId: number | null;
    roleId?: number;
    bankName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    /** Plain text, JSON array string, or `"[]"`. */
    education: string | null;
    specialization: string | null;
    registeration: string | null;
    nabh: string;
    loginType: string;
    status: string;
    branch?: { name: string };
    department?: { name: string };
    createdAt?: string;
    /** Optional document / certificate URL or filename from API */
    attachment?: string | null;
    aiVoiceActivated?: boolean | string | null;
    aiVoicePassword?: string | null;
};

type ApiEducationJsonRow = {
    degree?: string;
    year?: string;
    qualification?: string;
    college?: string;
    completion_years?: string;
};

type ApiRegistrationJsonRow = {
    council_regist_no?: string;
    council_name?: string;
    year?: string;
    number?: string;
    name?: string;
};

/**
 * API often returns `education`, `specialization`, and `registeration` as JSON that was
 * stringified more than once (e.g. `"\"[{\\\"qualification\\\":...}]\""`), so the value
 * starts with `"` instead of `[`. Unwrap by parsing repeatedly while the result is a string.
 */
export function parseApiJsonField(raw: string | null | undefined): unknown {
    let s = (raw ?? "").trim();
    if (!s) return null;
    let lastStringResult: string | undefined;
    for (let i = 0; i < 8; i++) {
        try {
            const v = JSON.parse(s);
            if (typeof v === "string") {
                lastStringResult = v;
                s = v;
                continue;
            }
            return v;
        } catch {
            return lastStringResult ?? null;
        }
    }
    return lastStringResult ?? null;
}

/** Map API qualification (slug or label like `BAMS`) to `QUALIFICATION_OPTIONS` value. */
function qualificationSlugFromLabelOrValue(raw: string): string {
    const t = raw.trim();
    if (!t) return "";
    const found = QUALIFICATION_OPTIONS.find(
        (o) =>
            Boolean(o.value) &&
            (o.value === t ||
                o.value.toLowerCase() === t.toLowerCase() ||
                o.label.toLowerCase() === t.toLowerCase())
    );
    return found?.value ?? "";
}

function mapEducationRowsFromApi(raw: string | null | undefined, doctorId: number): EducationEntry[] {
    const s = (raw ?? "").trim();
    const emptyRow = (): EducationEntry => ({
        id: `edu-${doctorId}`,
        qualification: "",
        college: "",
        completionYears: "",
    });
    if (!s) return [emptyRow()];
    const parsed = parseApiJsonField(s);
    if (parsed === null) {
        return [{ ...emptyRow(), college: s }];
    }
    if (Array.isArray(parsed)) {
        if (parsed.length === 0) return [emptyRow()];
        return parsed.map((item, i) => {
            const o = item as ApiEducationJsonRow;
            const rawQual = (o.qualification ?? "").trim();
            const rawDegree = (o.degree ?? "").trim();
            const qualification =
                qualificationSlugFromLabelOrValue(rawQual) ||
                qualificationSlugFromLabelOrValue(rawDegree);
            const college = (o.college ?? "").trim() || (rawDegree && !qualification ? rawDegree : "");
            const years = (o.completion_years ?? o.year ?? "").toString().replace(/\D/g, "").slice(0, 4);
            return {
                id: `edu-${doctorId}-${i}`,
                qualification,
                college,
                completionYears: years,
            };
        });
    }
    return [{ ...emptyRow(), college: s }];
}

function specializationSlugFromLabelOrValue(raw: string): string {
    const t = raw.trim();
    if (!t) return "";
    return (
        SPECIALIZATION_DROPDOWN_OPTIONS.find(
            (o) =>
                o.value === t ||
                o.value.toLowerCase() === t.toLowerCase() ||
                o.label.toLowerCase() === t.toLowerCase()
        )?.value ?? ""
    );
}

function mapSpecializationsFromApi(raw: string | null | undefined, doctorId: number): SpecializationEntry[] {
    const s = (raw ?? "").trim();
    const one = (spec: string, i: number): SpecializationEntry => ({
        id: i === 0 ? `spec-${doctorId}` : `spec-${doctorId}-${i}`,
        specialization: spec,
    });
    if (!s || s === "[]") return [one("", 0)];
    const parsed = parseApiJsonField(s);
    if (parsed === null) {
        return [one(specializationSlugFromLabelOrValue(s), 0)];
    }
    if (Array.isArray(parsed)) {
        if (parsed.length === 0) return [one("", 0)];
        return parsed.map((val, i) =>
            one(specializationSlugFromLabelOrValue(String(val ?? "")), i)
        );
    }
    if (typeof parsed === "string") {
        return [one(specializationSlugFromLabelOrValue(parsed), 0)];
    }
    return [one("", 0)];
}

function mapRegistrationsFromApi(raw: string | null | undefined, doctorId: number): RegistrationEntry[] {
    const s = (raw ?? "").trim();
    const emptyRow = (): RegistrationEntry => ({
        id: `reg-${doctorId}`,
        councilRegistrationNumber: "",
        councilName: "",
        year: "",
    });
    if (!s) return [emptyRow()];
    const parsed = parseApiJsonField(s);
    if (parsed === null) {
        return [{ ...emptyRow(), councilRegistrationNumber: s }];
    }
    if (Array.isArray(parsed)) {
        if (parsed.length === 0) return [emptyRow()];
        return parsed.map((item, i) => {
            const o = item as ApiRegistrationJsonRow;
            return {
                id: `reg-${doctorId}-${i}`,
                councilRegistrationNumber: (o.council_regist_no ?? o.number ?? "").trim(),
                councilName: (o.council_name ?? o.name ?? "").trim(),
                year: (o.year ?? "").toString().replace(/\D/g, "").slice(0, 4),
            };
        });
    }
    return [{ ...emptyRow(), councilRegistrationNumber: s }];
}

function parseExperienceYears(exp: string): string {
    const m = /^(\d+)/.exec((exp ?? "").trim());
    return m ? m[1] : "";
}

function normalizeLoginType(raw: string): string {
    const t = (raw || "").toLowerCase().replace(/\s+/g, "-");
    if (t === "no-authentication" || t === "noauth") return "no-auth";
    if (t === "ip-otp" || t === "ip+otp") return "ip-otp";
    if (["no-auth", "ip", "otp", "ip-otp"].includes(t)) return t;
    return "no-auth";
}

/** Backend `@IsNumberString()` rejects `""`; omit when there is no alternate number. */
function altPhoneDigitsOrUndefined(raw: string | null | undefined): string | undefined {
    const d = (raw ?? "").trim().replace(/\D/g, "").slice(0, 10);
    return d.length > 0 ? d : undefined;
}

function qualificationLabelForApi(value: string): string {
    if (!value?.trim()) return "";
    const opt = QUALIFICATION_OPTIONS.find((o) => o.value === value);
    return (opt?.label ?? value).trim();
}

/** Longer titles first so e.g. "Mrs" matches before "Mr". */
const TITLE_PREFIX_ORDER = ["Mrs", "Miss", "Mr", "Ms", "Dr", "TG"] as const;

export function splitDoctorFullName(full: string): { nameTitle: string; name: string } {
    const raw = (full ?? "").trim();
    if (!raw) return { nameTitle: "", name: "" };
    for (const title of TITLE_PREFIX_ORDER) {
        const reDot = new RegExp(`^${title}\\.\\s*`, "i");
        const reSpace = new RegExp(`^${title}\\s+`, "i");
        if (reDot.test(raw)) {
            return { nameTitle: title, name: raw.replace(reDot, "").trim() };
        }
        if (reSpace.test(raw)) {
            return { nameTitle: title, name: raw.replace(reSpace, "").trim() };
        }
    }
    return { nameTitle: "", name: raw };
}

export function mapApiDoctorListItemToPayload(row: ApiDoctorListItem): DoctorPayload {
    const { name } = splitDoctorFullName(row.name ?? "");

    return {
        branchId: String(row.branchId),
        assignableRoleId:
            row.roleId != null && Number(row.roleId) > 0 ? String(Number(row.roleId)) : "",
        profileImageUrl: row.imgUrl && row.imgUrl !== "default.png" ? row.imgUrl : null,
        attachmentUrl: row.attachment?.trim() ? row.attachment : null,
        nameTitle: "Dr",
        name,
        email: row.email ?? "",
        nabhRegistered: row.nabh?.toLowerCase() === "yes",
        contact: (row.phone ?? "").replace(/\D/g, "").slice(0, 10),
        altContact: (row.altPhone ?? "").replace(/\D/g, "").slice(0, 10),
        yearsExperience: parseExperienceYears(row.experience ?? ""),
        department: departmentFormValueFromApiId(row.departmentId),
        opdFee: "",
        loginType: normalizeLoginType(row.loginType),
        doctorType: "team",
        selectTeam: "",
        employeeId: row.empId ?? "",
        status: row.status?.toLowerCase() === "inactive" ? "Inactive" : "Active",
        address: row.address ?? "",
        city: row.city ?? "",
        bankName: row.bankName ?? "",
        accountNumber: (row.accountNumber ?? "").replace(/\D/g, "").slice(0, 20),
        ifscCode: row.ifscCode ?? "",
        education: mapEducationRowsFromApi(row.education, row.id),
        specializations: mapSpecializationsFromApi(row.specialization, row.id),
        registrations: mapRegistrationsFromApi(row.registeration, row.id),
        aiVoiceActivated: row.aiVoiceActivated === true || row.aiVoiceActivated === "true" || row.aiVoiceActivated === "Active" ? "Active" : "Inactive",
        changeVoiceAiPassword: "No",
        aiVoicePassword: row.aiVoicePassword || "",
        voiceAiConfirmPassword: row.aiVoicePassword || "",
    };
}

export function buildCreateDoctorBody(payload: DoctorPayload) {
    const departmentId = resolveDepartmentIdFromPayload(payload);
    const experienceNum = Number.parseInt(payload.yearsExperience, 10);
    const altPhone = altPhoneDigitsOrUndefined(payload.altContact);
    const parsedRole = Number.parseInt((payload.assignableRoleId ?? "").trim(), 10);
    const roleId =
        Number.isFinite(parsedRole) && parsedRole > 0 ? parsedRole : DEFAULT_DOCTOR_ROLE_ID;
    return {
        branchId: Number(payload.branchId),
        name: doctorDisplayName(payload).trim(),
        email: payload.email.trim(),
        empId: payload.employeeId.trim(),
        phone: payload.contact.trim(),
        address: payload.address.trim(),
        departmentId,
        roleId,
        specialization: payload.specializations.map((s) => s.specialization).filter(Boolean),
        education: payload.education.map((e) => ({
            qualification: qualificationLabelForApi(e.qualification),
            college: e.college.trim(),
            completion_years: e.completionYears.trim(),
        })),
        registeration: payload.registrations.map((r) => ({
            council_regist_no: r.councilRegistrationNumber.trim(),
            council_name: r.councilName.trim(),
            year: r.year.trim(),
        })),
        nabh: payload.nabhRegistered ? "yes" : "no",
        ...(altPhone !== undefined ? { altPhone } : {}),
        experience: Number.isFinite(experienceNum) ? experienceNum : 0,
        loginType: payload.loginType,
        bankName: payload.bankName?.trim() || "",
        accountNumber: payload.accountNumber?.trim() || "",
        ifscCode: payload.ifscCode?.trim() || "",
        city: payload.city?.trim() || "",
        aiVoiceActivated: payload.aiVoiceActivated === "Active",
        ...(payload.aiVoiceActivated === "Active" ? { aiVoicePassword: payload.aiVoicePassword?.trim() } : {}),
    };
}

export function buildUpdateDoctorBody(
    payload: DoctorPayload,
    fallbackRoleId: number = DEFAULT_DOCTOR_ROLE_ID
): Record<string, unknown> {
    const departmentId = resolveDepartmentIdFromPayload(payload);
    const parsedRole = Number.parseInt((payload.assignableRoleId ?? "").trim(), 10);
    const roleId =
        Number.isFinite(parsedRole) && parsedRole > 0 ? parsedRole : fallbackRoleId;
    const rawExp = (payload.yearsExperience ?? "").trim();
    let experience = "0 years";
    if (rawExp) {
        if (/\d+\s*years?/i.test(rawExp)) {
            experience = rawExp;
        } else if (/^\d+$/.test(rawExp)) {
            experience = `${rawExp} years`;
        } else {
            experience = rawExp;
        }
    }

    const altPhone = altPhoneDigitsOrUndefined(payload.altContact);

    return {
        branchId: Number(payload.branchId),
        empId: payload.employeeId.trim(),
        name: doctorDisplayName(payload).trim(),
        email: payload.email.trim(),
        roleId,
        address: payload.address.trim(),
        city: payload.city?.trim() || "",
        phone: payload.contact.trim(),
        ...(altPhone !== undefined ? { altPhone } : {}),
        experience,
        departmentId,
        bankName: payload.bankName?.trim() || "",
        accountNumber: payload.accountNumber?.trim() || "",
        ifscCode: payload.ifscCode?.trim() || "",
        education: payload.education
            .filter((e) => e.qualification || e.college || e.completionYears)
            .map((e) => ({
                degree: qualificationLabelForApi(e.qualification) || e.college.trim(),
                year: e.completionYears.trim(),
            })),
        specialization: payload.specializations.map((s) => s.specialization).filter(Boolean),
        registeration: payload.registrations
            .filter((r) => r.councilRegistrationNumber || r.councilName || r.year)
            .map((r) => ({
                name: r.councilName.trim(),
                number: r.councilRegistrationNumber.trim(),
                year: r.year.trim(),
            })),
        nabh: payload.nabhRegistered ? "yes" : "no",
        loginType: payload.loginType,
        status: payload.status === "Inactive" ? "inactive" : "active",
        aiVoiceActivated: payload.aiVoiceActivated === "Active",
        ...(payload.aiVoiceActivated === "Active" && payload.changeVoiceAiPassword !== "No" ? { aiVoicePassword: payload.aiVoicePassword?.trim() } : {}),
    };
}

/** Multipart files for doctor create/update — same pattern as profile `updateProfile` (`imgUrl` file). */
export type UpdateDoctorFiles = {
    imgUrl: File | null;
    attachment: File | null;
};

function appendJsonField(formData: FormData, key: string, value: unknown) {
    if (value === undefined || value === null) return;
    formData.append(key, typeof value === "string" ? value : JSON.stringify(value));
}

/**
 * Build `FormData` for doctor create/update when uploading `imgUrl` and/or `attachment`.
 * POST `createDoctorByBranch` and PUT `updateDoctorDetails` use the same multipart layout.
 * Scalar fields are appended as strings; `education`, `specialization`, and `registeration` as JSON strings.
 */
export function buildUpdateDoctorFormData(
    body: Record<string, unknown>,
    files: UpdateDoctorFiles
): FormData {
    const formData = new FormData();
    const jsonKeys = new Set(["education", "specialization", "registeration"]);

    for (const [key, val] of Object.entries(body)) {
        if (val === undefined || val === null) continue;
        if (jsonKeys.has(key)) {
            appendJsonField(formData, key, val);
        } else {
            formData.append(key, String(val));
        }
    }

    if (files.imgUrl) {
        formData.append("imgUrl", files.imgUrl);
    }
    if (files.attachment) {
        formData.append("attachment", files.attachment);
    }

    return formData;
}
