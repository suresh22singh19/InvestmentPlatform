"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useRef } from "react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button } from "@/components/ui/Button";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { FormInputField } from "@/components/ui/FormInputField";
import { Checkbox, MessageDialog, Tooltip } from "@/components/ui";
import { API_BASE_URL } from "@/lib/config/api";
import {
    LOGIN_TYPE_OPTIONS,
    QUALIFICATION_OPTIONS,
    SPECIALIZATION_DROPDOWN_OPTIONS,
    optionLabel,
} from "@/lib/doctor/doctorStatic";
import {
    departmentLabelFromApiId,
    mapApiDoctorListItemToPayload,
} from "@/lib/doctor/mapDoctorApi";
import { DoctorAvatarImage } from "@/components/doctor/DoctorAvatarImage";
import { useGetAllDoctorsDetailsQuery, useUpdateDoctorPasswordMutation } from "@/store/api/doctorApi";
import { useAppSelector } from "@/store/hooks";
import { selectRoleCategoryType } from "@/store/slices/authSlice";

function rtkErrorMessage(e: unknown): string {
    const x = e as { data?: { message?: string }; message?: string };
    if (typeof x?.data?.message === "string") return x.data.message;
    if (typeof x?.message === "string") return x.message;
    return "Something went wrong. Please try again.";
}

function formatDateTime(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function loginTypeLabel(raw: string): string {
    const v = (raw || "").toLowerCase().replace(/\s+/g, "-");
    const normalized =
        v === "no-authentication" || v === "noauth" ? "no-auth" : v === "ip+otp" ? "ip-otp" : v;
    return optionLabel(LOGIN_TYPE_OPTIONS, normalized) || raw || "—";
}

function resolveDoctorAttachmentSrc(path: string | null | undefined): string | null {
    const p = (path ?? "").trim();
    if (!p) return null;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    const origin = API_BASE_URL.replace(/\/api\/v2\/?$/i, "");
    return `${origin}/${p.replace(/^\//, "")}`;
}

function TruncatedTextValue({ text }: { text: string | null | undefined }) {
    const value = text?.trim() ? text.trim() : "—";
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const element = textRef.current;
        if (!element) return;

        const checkTruncation = () => {
            setIsTruncated(element.scrollWidth > element.clientWidth + 1);
        };

        checkTruncation();

        const observer = new ResizeObserver(checkTruncation);
        observer.observe(element);
        return () => observer.disconnect();
    }, [value]);

    if (value === "—") {
        return <span>—</span>;
    }

    return (
        <Tooltip
            position="top"
            maxWidth={360}
            disabled={!isTruncated}
            className="!overflow-visible !py-2.5"
            content={
                <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
                    {value}
                </p>
            }
        >
            <span ref={textRef} className="block min-w-0 w-full truncate whitespace-nowrap font-medium text-[#262D3B]">
                {value}
            </span>
        </Tooltip>
    );
}

function FieldCell({ label, value }: { label: string; value: React.ReactNode }) {
    const renderValue = typeof value === "string" ? <TruncatedTextValue text={value} /> : value;
    return (
        <div className="min-w-0 overflow-hidden space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 last:border-0 md:px-0 lg:px-4">
            <p className="text-xs font-medium text-[#7B8089] truncate whitespace-nowrap">{label}</p>
            <div className="text-sm font-medium text-[#262D3B] min-w-0 overflow-hidden truncate whitespace-nowrap">{renderValue}</div>
        </div>
    );
}

function formatExperienceForView(raw: string | null | undefined): string {
    const s = (raw ?? "").trim();
    if (!s) return "—";
    if (/\d+\s*years?/i.test(s)) return s.replace(/\s+/g, " ").trim();
    if (/^\d+$/.test(s)) return `${s} years`;
    return s;
}

export default function DoctorViewPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const rawId = params?.id;
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    const branchIdParam = Number(searchParams?.get("branchId"));
    const branchId = Number.isFinite(branchIdParam) && branchIdParam > 0 ? branchIdParam : undefined;

    const { data, isLoading, isFetching } = useGetAllDoctorsDetailsQuery(
        {
            page: 1,
            limit: 500,
            search: "",
            branchId: branchId ?? 0,
            sort: "",
            order: "asc",
        },
        { skip: !Number.isFinite(id) || id <= 0 || branchId == null }
    );

    const doctor = useMemo(() => data?.data?.find((d) => d.id === id), [data, id]);

    const viewDetails = useMemo(() => {
        if (!doctor) return null;
        const payload = mapApiDoctorListItemToPayload(doctor);
        const eduFilled = payload.education.filter(
            (e) => e.qualification.trim() || e.college.trim() || e.completionYears.trim()
        );
        const regFilled = payload.registrations.filter(
            (r) =>
                r.councilRegistrationNumber.trim() ||
                r.councilName.trim() ||
                r.year.trim()
        );
        const specLabels = payload.specializations
            .map(
                (s) =>
                    optionLabel(SPECIALIZATION_DROPDOWN_OPTIONS, s.specialization) ||
                    s.specialization.trim()
            )
            .filter(Boolean);
        return { eduFilled, regFilled, specLabels };
    }, [doctor]);

    const [attachmentLoadFailed, setAttachmentLoadFailed] = useState(false);
    useEffect(() => {
        setAttachmentLoadFailed(false);
    }, [doctor?.attachment, id]);

    const isCredentialsSection = searchParams?.get("section") === "credentials";
    const roleCategoryType = useAppSelector(selectRoleCategoryType);
    const showOldPasswordField = (roleCategoryType ?? "").toLowerCase().trim() !== "superadmin";
    /** Blocks password-manager autofill of the signed-in user's password into the doctor's "current password" field. */
    const [oldPasswordAutofillBlocked, setOldPasswordAutofillBlocked] = useState(true);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOldPasswordText, setShowOldPasswordText] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordSubmitAttempted, setPasswordSubmitAttempted] = useState(false);
    const [updatePassword, { isLoading: isPasswordSaving }] = useUpdateDoctorPasswordMutation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState("");
    const [dialogSuccess, setDialogSuccess] = useState(false);

    useEffect(() => {
        if (isCredentialsSection) {
            setOldPasswordAutofillBlocked(true);
        }
    }, [isCredentialsSection, id]);

    useEffect(() => {
        if (isCredentialsSection && !showOldPasswordField) {
            setOldPasswordAutofillBlocked(true);
            setOldPassword("");
            setShowOldPasswordText(false);
        }
    }, [isCredentialsSection, showOldPasswordField, id]);

    const passwordChecks = useMemo(
        () => ({
            minLength: newPassword.length >= 8,
            hasLower: /[a-z]/.test(newPassword),
            hasUpper: /[A-Z]/.test(newPassword),
            hasNumber: /[0-9]/.test(newPassword),
        }),
        [newPassword]
    );

    const newPasswordMeetsRules =
        passwordChecks.minLength &&
        passwordChecks.hasLower &&
        passwordChecks.hasUpper &&
        passwordChecks.hasNumber;

    const oldPasswordFieldError = useMemo(() => {
        if (!showOldPasswordField) return "";
        if (!passwordSubmitAttempted || oldPassword.trim()) return "";
        return "Please enter your current password.";
    }, [showOldPasswordField, passwordSubmitAttempted, oldPassword]);

    const newPasswordFieldError = useMemo(() => {
        if (passwordSubmitAttempted && !newPassword.trim()) return "Please enter a new password.";
        if (newPassword.trim() && !newPasswordMeetsRules) return "Password does not meet all requirements.";
        return "";
    }, [passwordSubmitAttempted, newPassword, newPasswordMeetsRules]);

    const confirmPasswordFieldError = useMemo(() => {
        if (showOldPasswordField && confirmPassword && newPassword !== confirmPassword) return "Passwords do not match";
        if (
            passwordSubmitAttempted &&
            newPassword.trim() &&
            newPasswordMeetsRules &&
            !confirmPassword.trim()
        ) {
            return "Please confirm your new password.";
        }
        return "";
    }, [showOldPasswordField, confirmPassword, newPassword, newPasswordMeetsRules, passwordSubmitAttempted]);

    if (!Number.isFinite(id) || id <= 0) {
        notFound();
    }

    if (branchId == null) {
        return (
            <AppShell>
                <div className="space-y-8 pb-10">
                    <PageHeading title="View Doctor" />
                    <p className="text-sm text-[#7B8089]">
                        Missing branch context. Open this page from the doctor list, or add{" "}
                        <code className="rounded bg-[#F3F4F6] px-1">?branchId=</code> to the URL.
                    </p>
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/doctor")} />
                </div>
            </AppShell>
        );
    }

    if (!isLoading && !isFetching && !doctor) {
        notFound();
    }

    if (!doctor) {
        return (
            <AppShell>
                <div className="space-y-8 pb-10">
                    <PageHeading title="View Details" />
                    <p className="text-sm text-[#9CA3AF]">Loading…</p>
                </div>
            </AppShell>
        );
    }

    const attachmentSrc = resolveDoctorAttachmentSrc(doctor.attachment ?? null);
    const showAttachmentImage =
        Boolean(attachmentSrc) &&
        !attachmentLoadFailed &&
        /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachmentSrc ?? "");
    const nabhLabel = doctor.nabh?.toLowerCase() === "yes" ? "Yes" : "No";
    const statusRaw = (doctor.status ?? "").toLowerCase().trim();
    const statusLabel =
        statusRaw === "inactive" ? "Inactive" : statusRaw === "active" ? "Active" : doctor.status || "—";
    const departmentDisplay =
        (doctor.department?.name ?? "").trim() ||
        departmentLabelFromApiId(doctor.departmentId) ||
        "—";

    const handlePasswordSave = async () => {
        setPasswordSubmitAttempted(true);
        if (showOldPasswordField && !oldPassword.trim()) return;
        if (!newPassword.trim()) return;
        if (!newPasswordMeetsRules) return;
        if (!confirmPassword.trim()) return;
        if (showOldPasswordField && newPassword !== confirmPassword) return;
        try {
            const body = showOldPasswordField
                ? {
                    oldPassword: oldPassword.trim(),
                    newPassword: newPassword.trim(),
                    confirmPassword: confirmPassword.trim(),
                }
                : {
                    newPassword: newPassword.trim(),
                    confirmPassword: confirmPassword.trim(),
                };
            const res = await updatePassword({
                id,
                body,
            }).unwrap();
            setPasswordSubmitAttempted(false);
            setDialogSuccess(true);
            setDialogMessage(res?.message || "Password updated successfully.");
            setDialogOpen(true);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e) {
            setDialogSuccess(false);
            setDialogMessage(rtkErrorMessage(e));
            setDialogOpen(true);
        }
    };

    if (isCredentialsSection) {
        return (
            <AppShell>
                <div className="space-y-8 pb-10">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <PageHeading title="Change Password" />
                        <BackToPreviousPageButton text="List" onClick={() => router.push("/doctor")} />
                    </div>

                    <div className="rounded-[16px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_4px_24px_rgba(34,56,43,0.06)]">
                        <p className="not-italic font-medium text-[16px] leading-[120%] text-[#7B8088] mb-5 flex items-center gap-1">
                            Email/Username: <span className="text-[#262D3B]">{doctor.email}</span>
                        </p>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 space-y-4 lg:col-span-9">
                                {showOldPasswordField && (
                                    <FormInputField
                                        label="Old Password *"
                                        type={showOldPasswordText ? "text" : "password"}
                                        name={`doctor-existing-password-${id}`}
                                        autoComplete="off"
                                        // readOnly={oldPasswordAutofillBlocked}
                                        onFocus={() => setOldPasswordAutofillBlocked(false)}
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        height={44}
                                        placeholder="Current password"
                                        error={oldPasswordFieldError}
                                        disabled={isPasswordSaving}
                                        suffix={
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                className="text-[#7B8089] transition-colors hover:text-[#434956]"
                                                onClick={() => setShowOldPasswordText((p) => !p)}
                                                aria-label={
                                                    showOldPasswordText ? "Hide password" : "Show password"
                                                }
                                            >
                                                <Image
                                                    src={
                                                        showOldPasswordText
                                                            ? "/icons/openEye.svg"
                                                            : "/icons/closeEye.svg"
                                                    }
                                                    alt={showOldPasswordText ? "Hide" : "Show"}
                                                    width={20}
                                                    height={20}
                                                />
                                            </button>
                                        }
                                    />
                                )}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormInputField
                                        label="New Password *"
                                        type={showNewPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        height={44}
                                        placeholder="New password"
                                        error={newPasswordFieldError}
                                        disabled={isPasswordSaving}
                                        suffix={
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                className="text-[#7B8089] transition-colors hover:text-[#434956]"
                                                onClick={() => setShowNewPassword((p) => !p)}
                                                aria-label={showNewPassword ? "Hide password" : "Show password"}
                                            >
                                                <Image
                                                    src={showNewPassword ? "/icons/openEye.svg" : "/icons/closeEye.svg"}
                                                    alt={showNewPassword ? "Hide" : "Show"}
                                                    width={20}
                                                    height={20}
                                                />
                                            </button>
                                        }
                                    />
                                    <FormInputField
                                        label="Confirm Password *"
                                        type={showConfirmPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        height={44}
                                        placeholder="Confirm new password"
                                        error={confirmPasswordFieldError}
                                        disabled={isPasswordSaving}
                                        suffix={
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                className="text-[#7B8089] transition-colors hover:text-[#434956]"
                                                onClick={() => setShowConfirmPassword((p) => !p)}
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                            >
                                                <Image
                                                    src={
                                                        showConfirmPassword ? "/icons/openEye.svg" : "/icons/closeEye.svg"
                                                    }
                                                    alt={showConfirmPassword ? "Hide" : "Show"}
                                                    width={20}
                                                    height={20}
                                                />
                                            </button>
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-span-12 lg:col-span-3">
                                <div className="intruction_meet rounded-lg bg-[rgba(11,140,0,0.1)] p-4">
                                    <ul className="flex flex-col gap-3">
                                        <li className="text-base font-semibold text-[#262D3B]">
                                            Your password must contain:
                                        </li>
                                        <li>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={passwordChecks.minLength}
                                                    onChange={() => { }}
                                                    width={16}
                                                    height={16}
                                                />
                                                <span className="font-inter text-sm font-medium leading-5 text-[#344054]">
                                                    at least 8 Characters
                                                </span>
                                            </div>
                                        </li>
                                        <li>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={passwordChecks.hasLower}
                                                    onChange={() => { }}
                                                    width={16}
                                                    height={16}
                                                />
                                                <span className="font-inter text-sm font-medium leading-5 text-[#344054]">
                                                    lower case letters (i.e a-z)
                                                </span>
                                            </div>
                                        </li>
                                        <li>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={passwordChecks.hasUpper}
                                                    onChange={() => { }}
                                                    width={16}
                                                    height={16}
                                                />
                                                <span className="font-inter text-sm font-medium leading-5 text-[#344054]">
                                                    upper case letters (i.e A-Z)
                                                </span>
                                            </div>
                                        </li>
                                        <li>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={passwordChecks.hasNumber}
                                                    onChange={() => { }}
                                                    width={16}
                                                    height={16}
                                                />
                                                <span className="font-inter text-sm font-medium leading-5 text-[#344054]">
                                                    numbers (i.e 0-9)
                                                </span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <BackToPreviousPageButton
                            text="Back"
                            onClick={() => router.push(`/doctor`)}
                        />
                        <Button
                            type="button"
                            variant="primary"
                            isLoading={isPasswordSaving}
                            disabled={isPasswordSaving}
                            onClick={() => void handlePasswordSave()}
                        >
                            Save
                        </Button>
                    </div>

                    <MessageDialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        icon={dialogSuccess ? "/icons/SuccessCheck.svg" : "/icons/CrossIcon.svg"}
                        iconBgColor={dialogSuccess ? "#E8F5E9" : "#FFEBEE"}
                        message={dialogMessage}
                        confirmText={dialogSuccess ? "OK" : "OK"}
                        showCancel={false}
                        onConfirm={() => {
                            setDialogOpen(false);
                            if (dialogSuccess) {
                                router.push(`/doctor`);
                            }
                        }}
                    />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8 pb-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <PageHeading title="View Details" />
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/doctor")} />
                </div>

                <div className="view-registration-container">
                    <div className="mb-4 w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4">
                        <div className="mb-4 grid grid-cols-12 gap-4">
                            <div className="col-span-12 space-y-4">
                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/patientinfo.svg" alt="" width={20} height={20} /> Basic
                                        Information
                                    </h4>
                                    <div className="space-y-1 px-4 py-[10px] md:px-0 lg:px-4">
                                        <p className="text-xs font-medium text-[#7B8089]">Profile Photo</p>
                                        <p className="text-sm font-medium text-[#262D3B]">
                                            <span className="inline-block overflow-hidden rounded-full">
                                                <DoctorAvatarImage
                                                    imgUrl={doctor.imgUrl}
                                                    size={140}
                                                    className="h-[140px] w-[140px] rounded-full border border-[#E3EEE1] bg-[#F3F4F6] object-cover"
                                                />
                                            </span>
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                            <FieldCell label="Branch" value={doctor.branch?.name ?? "—"} />
                                            <FieldCell label="Name" value={doctor.name} />
                                            <FieldCell label="Email/Username" value={doctor.email} />
                                            <FieldCell label="NABH Registered" value={nabhLabel} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                            <FieldCell label="Contact" value={doctor.phone || "—"} />
                                            <FieldCell label="ALT Contact" value={doctor.altPhone || "—"} />
                                            <FieldCell
                                                label="Year of Experience"
                                                value={formatExperienceForView(doctor.experience)}
                                            />
                                            <FieldCell label="Department" value={departmentDisplay} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                            <FieldCell label="Login Type" value={loginTypeLabel(doctor.loginType)} />
                                            <FieldCell label="Employee Id" value={doctor.empId} />
                                            <FieldCell label="Status" value={statusLabel} />
                                            <FieldCell label="Created At" value={formatDateTime(doctor.createdAt)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/addressicon.svg" alt="" width={20} height={20} /> Address
                                        Information
                                    </h4>
                                    <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                        <FieldCell label="Address" value={doctor.address || "—"} />
                                        <FieldCell label="City" value={doctor.city || "—"} />
                                    </div>
                                </div>

                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/bankdetails.svg" alt="" width={20} height={20} />
                                        Bank Details
                                    </h4>
                                    <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                        <FieldCell label="Bank Name" value={doctor.bankName || "—"} />
                                        <FieldCell label="Account Number" value={doctor.accountNumber || "—"} />
                                        <FieldCell label="IFSC Code" value={doctor.ifscCode || "—"} />
                                    </div>
                                </div>

                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/educations.svg" alt="" width={20} height={20} />
                                        Education
                                    </h4>
                                    {viewDetails && viewDetails.eduFilled.length > 0 ? (
                                        <div className="space-y-4">
                                            {viewDetails.eduFilled.map((row, idx) => (
                                                <div key={row.id}>
                                                    {viewDetails.eduFilled.length > 1 ? (
                                                        <p className="mb-2 text-xs font-medium text-[#7B8089]">
                                                            Education {idx + 1}
                                                        </p>
                                                    ) : null}
                                                    <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                                        <FieldCell
                                                            label="Qualification"
                                                            value={
                                                                optionLabel(
                                                                    QUALIFICATION_OPTIONS,
                                                                    row.qualification
                                                                ) ||
                                                                row.qualification ||
                                                                "—"
                                                            }
                                                        />
                                                        <FieldCell label="College" value={row.college || "—"} />
                                                        <FieldCell
                                                            label="Completion Years"
                                                            value={row.completionYears || "—"}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                            <FieldCell label="Qualification" value="—" />
                                            <FieldCell label="College" value="—" />
                                            <FieldCell label="Completion Years" value="—" />
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/specialization.svg" alt="" width={20} height={20} />
                                        Specialization
                                    </h4>
                                    <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                        <FieldCell
                                            label="Add Specialization"
                                            value={
                                                viewDetails && viewDetails.specLabels.length > 0
                                                    ? viewDetails.specLabels.join(", ")
                                                    : "—"
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/registrations.svg" alt="" width={20} height={20} />
                                        Registration Detail
                                    </h4>
                                    {viewDetails && viewDetails.regFilled.length > 0 ? (
                                        <div className="space-y-4">
                                            {viewDetails.regFilled.map((row, idx) => (
                                                <div key={row.id}>
                                                    {viewDetails.regFilled.length > 1 ? (
                                                        <p className="mb-2 text-xs font-medium text-[#7B8089]">
                                                            Registration {idx + 1}
                                                        </p>
                                                    ) : null}
                                                    <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                                        <FieldCell
                                                            label="Council Registration Number"
                                                            value={row.councilRegistrationNumber || "—"}
                                                        />
                                                        <FieldCell label="Council Name" value={row.councilName || "—"} />
                                                        <FieldCell label="Year" value={row.year || "—"} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mb-4 grid grid-cols-2 gap-4 border-b border-t border-[#DFE0E2] md:grid-cols-4 lg:grid-cols-4">
                                            <FieldCell label="Council Registration Number" value="—" />
                                            <FieldCell label="Council Name" value="—" />
                                            <FieldCell label="Year" value="—" />
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                                        <Image src="/icons/documents.svg" alt="" width={20} height={20} />
                                        Documents & Certificate
                                    </h4>
                                    <div className="mb-4 border-b border-t border-[#DFE0E2] py-4">
                                        {showAttachmentImage && attachmentSrc ? (
                                            <span className="inline-block overflow-hidden rounded-lg border border-[#DFE0E2]">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={attachmentSrc}
                                                    alt=""
                                                    width={180}
                                                    height={180}
                                                    className="h-[180px] w-[180px] object-cover"
                                                    onError={() => setAttachmentLoadFailed(true)}
                                                />
                                            </span>
                                        ) : attachmentSrc && !attachmentLoadFailed ? (
                                            <a
                                                href={attachmentSrc}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-[#0B8C00] underline"
                                            >
                                                View document
                                            </a>
                                        ) : (
                                            <div className="flex h-[180px] w-[180px] flex-col items-center justify-center rounded-lg border border-[#DFE0E2] bg-[#F3F4F6] px-3 text-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <Image
                                                    src="/icons/noimage.svg"
                                                    alt=""
                                                    width={48}
                                                    height={48}
                                                    className="mb-2 opacity-60"
                                                />
                                                <span className="text-xs font-medium uppercase tracking-wide text-[#7B8089]">
                                                    NO IMAGE AVAILABLE
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end">
                    <BackToPreviousPageButton text="Back" onClick={() => router.push("/doctor")} />
                </div>
            </div>
        </AppShell>
    );
}
