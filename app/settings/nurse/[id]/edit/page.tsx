"use client";

import { useMemo, useState } from "react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { MessageDialog } from "@/components/ui";
import { NurseForm } from "@/components/nurse/NurseForm";
import { mapApiNurseListItemToPayload, buildUpdateNurseBody } from "@/lib/nurse/mapNurseApi";
import { useGetNursesQuery, useUpdateNurseMutation } from "@/store/api/nurseApi";

function rtkErrorMessage(e: unknown): string {
    const x = e as { data?: { message?: string }; message?: string };
    if (typeof x?.data?.message === "string") return x.data.message;
    if (typeof x?.message === "string") return x.message;
    return "Failed to update nurse. Please try again.";
}

export default function EditNursePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const rawId = params?.id;
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    const branchIdParam = Number(searchParams?.get("branchId"));
    const branchId = Number.isFinite(branchIdParam) && branchIdParam > 0 ? branchIdParam : undefined;

    const { data, isLoading, isFetching } = useGetNursesQuery(
        {
            page: 1,
            limit: 500,
            search: "",
            branchId: branchId ?? 0,
            sort: "",
            order: "ASC",
        },
        { skip: !Number.isFinite(id) || id <= 0 || branchId == null }
    );

    const apiRow = useMemo(() => data?.data?.find((d) => d.id === id), [data, id]);

    const initial = useMemo(() => {
        if (!apiRow) return null;
        return mapApiNurseListItemToPayload(apiRow);
    }, [apiRow]);

    const [updateNurse] = useUpdateNurseMutation();
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);

    if (!Number.isFinite(id) || id <= 0) {
        notFound();
    }

    if (branchId == null) {
        return (
            <AppShell>
                <div className="space-y-8 pb-10">
                    <PageHeading title="Edit Nurse" />
                    <p className="text-sm text-[#7B8089]">
                        Missing branch context. Open edit from the nurse list, or add{" "}
                        <code className="rounded bg-[#F3F4F6] px-1">?branchId=</code> to the URL.
                    </p>
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/settings/nurse")} />
                </div>
            </AppShell>
        );
    }

    if (!isLoading && !isFetching && !apiRow) {
        notFound();
    }

    if (!initial) {
        return (
            <AppShell>
                <div className="space-y-8 pb-10">
                    <PageHeading title="Edit Nurse" />
                    <p className="text-sm text-[#9CA3AF]">Loading nurse…</p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8 pb-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <PageHeading title="Edit Nurse" />
                    <BackToPreviousPageButton text="List" onClick={() => router.push("/settings/nurse")} />
                </div>
                <NurseForm
                    mode="edit"
                    initial={initial}
                    onSubmit={async (payload, files) => {
                        try {
                            const body = buildUpdateNurseBody(payload);
                            const res = await updateNurse({ id, body, files }).unwrap();
                            setSuccessMessage(res?.message || "Nurse updated successfully.");
                            setShowSuccessDialog(true);
                        } catch (error) {
                            console.error(error);
                            setApiErrorMessage(rtkErrorMessage(error));
                            setShowApiErrorDialog(true);
                        }
                    }}
                    onBack={() => router.push("/settings/nurse")}
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
                        router.push("/settings/nurse");
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
