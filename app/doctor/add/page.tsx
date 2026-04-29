"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { MessageDialog } from "@/components/ui";
import { DoctorForm } from "@/components/doctor/DoctorForm";
import { createEmptyDoctorPayload } from "@/lib/doctor/doctorStatic";
import { buildCreateDoctorBody } from "@/lib/doctor/mapDoctorApi";
import { useCreateDoctorByBranchMutation } from "@/store/api/doctorApi";

function rtkErrorMessage(e: unknown): string {
    const x = e as { data?: { message?: string }; message?: string };
    if (typeof x?.data?.message === "string") return x.data.message;
    if (typeof x?.message === "string") return x.message;
    return "Failed to save doctor. Please try again.";
}

export default function AddDoctorPage() {
    const router = useRouter();
    const initial = useMemo(() => createEmptyDoctorPayload(), []);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [createDoctor] = useCreateDoctorByBranchMutation();

    return (
        <AppShell>
            <div className="space-y-8 pb-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <PageHeading title="Add Doctor" />
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/doctor")} />
                </div>
                <DoctorForm
                    mode="add"
                    initial={initial}
                    onSubmit={async (payload, files) => {
                        try {
                            const body = buildCreateDoctorBody(payload);
                            const res = await createDoctor({ body, files }).unwrap();
                            setSuccessMessage(res?.message || "Doctor added successfully.");
                            setShowSuccessDialog(true);
                        } catch (error) {
                            console.error("Failed to add doctor:", error);
                            setApiErrorMessage(rtkErrorMessage(error));
                            setShowApiErrorDialog(true);
                        }
                    }}
                    onBack={() => router.push("/doctor")}
                />

                <MessageDialog
                    open={showSuccessDialog}
                    onClose={() => {
                        setShowSuccessDialog(false);
                    }}
                    icon="/icons/SuccessCheck.svg"
                    iconBgColor="#E8F5E9"
                    message={successMessage}
                    confirmText="Success"
                    showCancel={false}
                    onConfirm={() => {
                        setShowSuccessDialog(false);
                        router.push("/doctor");
                    }}
                />

                <MessageDialog
                    open={showApiErrorDialog}
                    onClose={() => {
                        setShowApiErrorDialog(false);
                    }}
                    icon="/icons/CrossIcon.svg"
                    iconBgColor="#FFEBEE"
                    message={apiErrorMessage}
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => {
                        setShowApiErrorDialog(false);
                    }}
                />
            </div>
        </AppShell>
    );
}
