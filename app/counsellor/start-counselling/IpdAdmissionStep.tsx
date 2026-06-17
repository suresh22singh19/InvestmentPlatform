"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
    Button,
    Checkbox,
    MessageDialog,
    SpinnerLoader,
} from "@/components/ui";
import {
    useGetAllDocumentsQuery,
    useGetPatientAdmissionDetailsQuery,
    useUpdateDocumentsMutation,
} from "@/store/api/counsellorApi";
import type { CounsellorDocumentItem, PatientAdmissionDetailsData } from "@/store/api/counsellorApi";
import { useRouter } from "next/navigation";

const FINALIZE_DISCLAIMER =
    "By clicking Finalize, you confirm that all physical documents have been collected.";

type DocumentSelection = "required" | "not_required";

type IpdAdmissionStepProps = {
    patientId: number | null;
    onBack: () => void;
};

function SectionCard({
    title,
    children,
    className = "",
}: {
    title?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm md:p-6 ${className}`}
        >
            {title ? (
                <h2 className="mb-5 text-base font-medium text-[#262D3B]">{title}</h2>
            ) : null}
            {children}
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-[#0B8C00]/20 bg-[#F4FAF4] px-4 py-3">
            <p className="text-xs font-medium text-[#434956]">{label}</p>
            <p className="mt-1 text-sm font-semibold text-[#262D3B]">{value || "—"}</p>
        </div>
    );
}

function isActiveDocument(doc: CounsellorDocumentItem): boolean {
    const status = doc.isActive;
    if (typeof status === "boolean") return status;
    if (status == null) return true;
    return String(status).toLowerCase() === "active";
}

function formatWardAssigned(details: PatientAdmissionDetailsData): string {
    const roomBed = [details.roomNumber, details.bedNumber].filter(Boolean).join(" / ");
    if (roomBed) return roomBed;
    if (details.roomType) {
        return details.roomType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "—";
}

const DOCUMENTS_TABLE_GRID =
    "grid w-full grid-cols-3 items-center gap-x-8 sm:gap-x-12 md:gap-x-16";

export default function IpdAdmissionStep({ patientId, onBack }: IpdAdmissionStepProps) {
    const router = useRouter();

    const numericPatientId = patientId ?? 0;
    const isValidPatientId = Number.isFinite(numericPatientId) && numericPatientId > 0;

    const {
        data: documentsResponse,
        isLoading: isDocumentsLoading,
        isError: isDocumentsError,
        error: documentsError,
        refetch: refetchDocuments,
    } = useGetAllDocumentsQuery();

    const {
        data: admissionDetailsResponse,
        isLoading: isAdmissionDetailsLoading,
        isError: isAdmissionDetailsError,
        error: admissionDetailsError,
    } = useGetPatientAdmissionDetailsQuery(numericPatientId, {
        skip: !isValidPatientId,
        refetchOnMountOrArgChange: true,
    });

    const admissionDetails = admissionDetailsResponse?.data ?? null;

    const activeDocuments = useMemo(() => {
        const items = documentsResponse?.data ?? [];
        return items.filter(isActiveDocument);
    }, [documentsResponse?.data]);

    const [documentSelections, setDocumentSelections] = useState<Record<number, DocumentSelection>>({});
    const [confirmConsentsReceived, setConfirmConsentsReceived] = useState(false);
    const [documentsValidationError, setDocumentsValidationError] = useState<string | null>(null);
    const [updateDocuments, { isLoading: isUpdatingDocuments }] = useUpdateDocumentsMutation();

    const [resultDialog, setResultDialog] = useState<{
        open: boolean;
        variant: "success" | "error";
        message: string;
    }>({ open: false, variant: "success", message: "" });

    const hasAnyDocumentSelection = useMemo(
        () => activeDocuments.some((doc) => documentSelections[doc.id] != null),
        [activeDocuments, documentSelections]
    );

    const canUpdateDocuments =
        confirmConsentsReceived &&
        hasAnyDocumentSelection &&
        activeDocuments.length > 0 &&
        !isDocumentsLoading &&
        !isDocumentsError;

    const requiredDocumentIds = useMemo(
        () =>
            activeDocuments
                .filter((doc) => documentSelections[doc.id] === "required")
                .map((doc) => doc.id),
        [activeDocuments, documentSelections]
    );

    const handleRequiredChange = (docId: number, checked: boolean) => {
        setDocumentSelections((prev) => {
            const next = { ...prev };
            if (checked) {
                next[docId] = "required";
            } else if (prev[docId] === "required") {
                delete next[docId];
            }
            return next;
        });
        setDocumentsValidationError(null);
    };

    const handleNotRequiredChange = (docId: number, checked: boolean) => {
        setDocumentSelections((prev) => {
            const next = { ...prev };
            if (checked) {
                next[docId] = "not_required";
            } else if (prev[docId] === "not_required") {
                delete next[docId];
            }
            return next;
        });
        setDocumentsValidationError(null);
    };

    const handleUpdateDocuments = useCallback(async () => {
        if (!confirmConsentsReceived) {
            setDocumentsValidationError(
                "Please confirm that you have received the signed consent forms."
            );
            return;
        }

        if (!hasAnyDocumentSelection) {
            setDocumentsValidationError(
                "Please mark at least one document as Required or Not Required."
            );
            return;
        }

        try {
            const res = await updateDocuments({
                patientId: numericPatientId,
                documentIds: requiredDocumentIds,
            }).unwrap();

            setResultDialog({
                open: true,
                variant: "success",
                message: res.message || "Documents updated successfully.",
            });
        } catch (err: unknown) {
            const apiErr = err as { data?: { message?: string }; message?: string };
            setResultDialog({
                open: true,
                variant: "error",
                message:
                    apiErr?.data?.message ||
                    apiErr?.message ||
                    "Failed to update documents. Please try again.",
            });
        }
    }, [
        confirmConsentsReceived,
        hasAnyDocumentSelection,
        updateDocuments,
        numericPatientId,
        requiredDocumentIds,
    ]);

    const documentsErrorMessage = useMemo(() => {
        if (!documentsError) return "Failed to load documents. Please try again.";
        const apiErr = documentsError as { data?: { message?: string }; message?: string };
        return apiErr?.data?.message || apiErr?.message || "Failed to load documents. Please try again.";
    }, [documentsError]);

    const admissionDetailsErrorMessage = useMemo(() => {
        if (!admissionDetailsError) return "Failed to load patient admission details.";
        const apiErr = admissionDetailsError as { data?: { message?: string }; message?: string };
        return (
            apiErr?.data?.message ||
            apiErr?.message ||
            "Failed to load patient admission details."
        );
    }, [admissionDetailsError]);

    if (!isValidPatientId) {
        return (
            <SectionCard>
                <p className="text-sm text-[#EF4444]">Invalid patient ID.</p>
            </SectionCard>
        );
    }

    if (isAdmissionDetailsLoading) {
        return (
            <div className="flex min-h-[240px] items-center justify-center">
                <SpinnerLoader size={28} />
            </div>
        );
    }

    if (isAdmissionDetailsError || !admissionDetails) {
        return (
            <SectionCard>
                <p className="text-sm text-[#EF4444]">{admissionDetailsErrorMessage}</p>
            </SectionCard>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <SectionCard title="Documents">
                {isDocumentsLoading ? (
                    <div className="flex min-h-[160px] items-center justify-center">
                        <SpinnerLoader size={24} />
                    </div>
                ) : isDocumentsError ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 text-center">
                        <p className="text-sm text-[#EF4444]" role="alert">
                            {documentsErrorMessage}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="medium"
                            className="!min-w-0"
                            onClick={() => void refetchDocuments()}
                        >
                            Retry
                        </Button>
                    </div>
                ) : activeDocuments.length === 0 ? (
                    <div className="flex min-h-[120px] items-center justify-center">
                        <p className="text-sm text-[#787E8C]">No documents available.</p>
                    </div>
                ) : (
                    <div className="w-full">
                        <div className={`${DOCUMENTS_TABLE_GRID} border-b border-[#EDF3EA] pb-4`}>
                            <span className="text-sm font-medium text-[#262D3B]">Documents</span>
                            <span className="text-center text-sm font-medium text-[#262D3B]">
                                Required Document
                            </span>
                            <span className="text-center text-sm font-medium text-[#262D3B]">
                                Not Required Document
                            </span>
                        </div>

                        <div className="flex flex-col">
                            {activeDocuments.map((doc) => {
                                const selection = documentSelections[doc.id];
                                const isRequired = selection === "required";
                                const isNotRequired = selection === "not_required";

                                return (
                                    <div
                                        key={doc.id}
                                        className={`${DOCUMENTS_TABLE_GRID} border-b border-[#EDF3EA] py-4 last:border-b-0`}
                                    >
                                        <span className="text-sm font-medium leading-relaxed text-[#262D3B]">
                                            {doc.documentName}
                                        </span>
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={isRequired}
                                                onChange={(checked) =>
                                                    handleRequiredChange(doc.id, checked)
                                                }
                                            />
                                        </div>
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={isNotRequired}
                                                onChange={(checked) =>
                                                    handleNotRequiredChange(doc.id, checked)
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {documentsValidationError ? (
                    <p className="mt-3 text-sm text-[#EF4444]" role="alert">
                        {documentsValidationError}
                    </p>
                ) : null}

                <div className="mt-6 rounded-[6px] border border-[#0B8C00]/50 bg-[#F4FAF4] p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox
                            checked={confirmConsentsReceived}
                            onChange={(checked) => {
                                setConfirmConsentsReceived(checked);
                                if (checked) setDocumentsValidationError(null);
                            }}
                        />
                        <span className="text-sm leading-relaxed text-[#434956]">
                            I confirm that I have received the signed consent forms from the patient
                            or their attendant.
                        </span>
                    </label>
                </div>
            </SectionCard>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoCard label="Ward Assigned" value={formatWardAssigned(admissionDetails)} />
                <InfoCard label="Billing Type" value={admissionDetails.admissionType} />
                <InfoCard label="OPD Doctor" value={admissionDetails.doctorName} />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3">
                    <Button
                        type="button"
                        variant="primary"
                        size="medium"
                        className="!min-w-0"
                        onClick={() => void handleUpdateDocuments()}
                        disabled={!canUpdateDocuments || isUpdatingDocuments}
                        isLoading={isUpdatingDocuments}
                    >
                        Update Document
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="medium"
                        className="!min-w-0 !border-[#9A7909] !bg-white !text-[#9A7909] shadow-none hover:!bg-[#FBF8F2] active:!bg-[#F5F0E6]"
                        onClick={onBack}
                        leftIcon={
                            <Image src="/icons/LeftArrowIcon.svg" alt="" width={16} height={16} />
                        }
                    >
                        Back
                    </Button>
                </div>
                <p className="text-xs italic leading-relaxed text-[#9FA2AB] sm:text-right">
                    {FINALIZE_DISCLAIMER}
                </p>
            </div>

            <MessageDialog
                open={resultDialog.open}
                onClose={() => setResultDialog((p) => ({ ...p, open: false }))}
                icon={
                    resultDialog.variant === "success"
                        ? "/icons/SuccessCheck.svg"
                        : "/icons/ErrorIcon.svg"
                }
                iconBgColor={resultDialog.variant === "success" ? "#E8F5E9" : "#FFEBEE"}
                message={resultDialog.message}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setResultDialog((p) => ({ ...p, open: false }));
                    if (resultDialog.variant === "success") {
                        router.push("/counsellor/dashboard");
                    }
                }}
            />
        </div>
    );
}
