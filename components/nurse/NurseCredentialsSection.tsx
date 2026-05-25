"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button } from "@/components/ui/Button";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { FormInputField } from "@/components/ui/FormInputField";
import { Checkbox, MessageDialog } from "@/components/ui";
import { useUpdateNursePasswordMutation } from "@/store/api/nurseApi";

function rtkErrorMessage(e: unknown): string {
    const x = e as { data?: { message?: string }; message?: string };
    if (typeof x?.data?.message === "string") return x.data.message;
    if (typeof x?.message === "string") return x.message;
    return "Something went wrong. Please try again.";
}

type NurseCredentialsSectionProps = {
    nurseId: number;
    branchId: number;
    email: string;
};

export function NurseCredentialsSection({ nurseId, branchId, email }: NurseCredentialsSectionProps) {
    const router = useRouter();
    const [oldPasswordAutofillBlocked, setOldPasswordAutofillBlocked] = useState(true);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordSubmitAttempted, setPasswordSubmitAttempted] = useState(false);
    const [updatePassword, { isLoading: isPasswordSaving }] = useUpdateNursePasswordMutation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState("");
    const [dialogSuccess, setDialogSuccess] = useState(false);

    useEffect(() => {
        setOldPasswordAutofillBlocked(true);
    }, [nurseId]);

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
        if (!passwordSubmitAttempted || oldPassword.trim()) return "";
        return "Please enter your current password.";
    }, [passwordSubmitAttempted, oldPassword]);

    const newPasswordFieldError = useMemo(() => {
        if (passwordSubmitAttempted && !newPassword.trim()) return "Please enter a new password.";
        if (newPassword.trim() && !newPasswordMeetsRules) return "Password does not meet all requirements.";
        return "";
    }, [passwordSubmitAttempted, newPassword, newPasswordMeetsRules]);

    const confirmPasswordFieldError = useMemo(() => {
        if (confirmPassword && newPassword !== confirmPassword) return "Passwords do not match";
        if (
            passwordSubmitAttempted &&
            newPassword.trim() &&
            newPasswordMeetsRules &&
            !confirmPassword.trim()
        ) {
            return "Please confirm your new password.";
        }
        return "";
    }, [confirmPassword, newPassword, newPasswordMeetsRules, passwordSubmitAttempted]);

    const handlePasswordSave = async () => {
        setPasswordSubmitAttempted(true);
        if (!oldPassword.trim()) return;
        if (!newPassword.trim()) return;
        if (!newPasswordMeetsRules) return;
        if (newPassword !== confirmPassword) return;
        try {
            const res = await updatePassword({
                id: nurseId,
                body: {
                    oldPassword: oldPassword.trim(),
                    newPassword: newPassword.trim(),
                    confirmPassword: confirmPassword.trim(),
                },
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

    return (
        <AppShell>
            <div className="space-y-8 pb-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <PageHeading title="Change Password" />
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/nurse")} />
                </div>

                <div className="rounded-[16px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_4px_24px_rgba(34,56,43,0.06)]">
                    <p className="not-italic font-medium text-[16px] leading-[120%] text-[#7B8088] mb-5 flex items-center gap-1">
                        Email/Username: <span className="text-[#262D3B]">{email}</span>
                    </p>
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 space-y-4 lg:col-span-9">
                            <FormInputField
                                label="Old Password *"
                                type={showOldPassword ? "text" : "password"}
                                name={`nurse-existing-password-${nurseId}`}
                                autoComplete="off"
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
                                        onClick={() => setShowOldPassword((p) => !p)}
                                        aria-label={showOldPassword ? "Hide password" : "Show password"}
                                    >
                                        <Image
                                            src={showOldPassword ? "/icons/openEye.svg" : "/icons/closeEye.svg"}
                                            alt={showOldPassword ? "Hide" : "Show"}
                                            width={20}
                                            height={20}
                                        />
                                    </button>
                                }
                            />
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
                                                onChange={() => {}}
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
                                                onChange={() => {}}
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
                                                onChange={() => {}}
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
                                                onChange={() => {}}
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
                    <BackToPreviousPageButton text="Back" onClick={() => router.push("/nurse")} />
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
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => {
                        setDialogOpen(false);
                        if (dialogSuccess) {
                            router.push(`/nurse/${nurseId}?branchId=${branchId}`);
                        }
                    }}
                />
            </div>
        </AppShell>
    );
}
