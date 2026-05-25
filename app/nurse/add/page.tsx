"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { MessageDialog } from "@/components/ui";
import { NurseForm } from "@/components/nurse/NurseForm";
import { createEmptyNursePayload } from "@/lib/nurse/nurseTypes";
import { buildCreateNurseBody } from "@/lib/nurse/mapNurseApi";
import { useAddNurseMutation } from "@/store/api/nurseApi";

function rtkErrorMessage(e: unknown): string {
    const x = e as { data?: { message?: string }; message?: string };
    if (typeof x?.data?.message === "string") return x.data.message;
    if (typeof x?.message === "string") return x.message;
    return "Failed to save nurse. Please try again.";
}

export default function AddNursePage() {
    const router = useRouter();
    const initial = useMemo(() => createEmptyNursePayload(), []);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [addNurse] = useAddNurseMutation();

    return (
        <AppShell>
            <div className="space-y-8 pb-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <PageHeading title="Add Nurse" />
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/nurse")} />
                </div>
                <NurseForm
                    mode="add"
                    initial={initial}
                    onSubmit={async (payload, files) => {
                        try {
                            const body = buildCreateNurseBody(payload);
                            const res = await addNurse({ body, files }).unwrap();
                            setSuccessMessage(res?.message || "Nurse added successfully.");
                            setShowSuccessDialog(true);
                        } catch (error) {
                            console.error("Failed to add nurse:", error);
                            setApiErrorMessage(rtkErrorMessage(error));
                            setShowApiErrorDialog(true);
                        }
                    }}
                    onBack={() => router.push("/nurse")}
                />

                <MessageDialog
                    open={showSuccessDialog}
                    onClose={() => setShowSuccessDialog(false)}
                    icon="/icons/SuccessCheck.svg"
                    iconBgColor="#E8F5E9"
                    message={successMessage}
                    confirmText="Success"
                    showCancel={false}
                    onConfirm={() => {
                        setShowSuccessDialog(false);
                        router.push("/nurse");
                    }}
                />

                <MessageDialog
                    open={showApiErrorDialog}
                    onClose={() => setShowApiErrorDialog(false)}
                    icon="/icons/CrossIcon.svg"
                    iconBgColor="#FFEBEE"
                    message={apiErrorMessage}
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => setShowApiErrorDialog(false)}
                />
            </div>
        </AppShell>
    );
}
