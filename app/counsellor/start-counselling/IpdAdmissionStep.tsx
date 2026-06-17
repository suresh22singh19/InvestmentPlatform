"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SpinnerLoader, MessageDialog } from "@/components/ui";
import { Step2IpdAdmission } from "@/app/ipd-reception/patient/[patientId]/file/Step2IpdAdmission";
import type {
    RequiredDocumentItem,
    OpenFileAdmissionSummary,
} from "@/lib/ipd-reception/types";
import {
    useCreateIpdAdmissionMutation,
    useGetIpdAwaitingPatientsQuery,
} from "@/store/api/ipdReceptionApi";
import {
    buildCreateIpdAdmissionPayload,
} from "@/lib/ipd-reception/buildCreateIpdAdmissionPayload";
import {
    buildSelectedDocumentsMap,
    findAwaitingPatientById,
    hasAtLeastOneSelectedDocument,
    sortRequiredDocuments,
} from "@/lib/ipd-reception/requiredDocumentsUtils";
import { mapAwaitingPatientToOpenFile } from "@/lib/ipd-reception/mapAwaitingPatientToOpenFile";
import { resolveReceptionBranchId } from "@/lib/ipd-reception/resolveReceptionBranchId";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import type { OpenFileStep1Form } from "@/lib/ipd-reception/types";
import { useRouter } from "next/navigation";

const INITIAL_STEP1_FORM: OpenFileStep1Form = {
    vitals: {
        bloodPressure: "",
        sugarLevel: "",
        temperature: "",
        pulseRate: "",
        spo2: "",
    },
    dietary: {
        dietPlanRequest: "",
        clinicalNote: "",
    },
};

type IpdAdmissionStepProps = {
    patientId: number | null;
    onBack: () => void;
};

export default function IpdAdmissionStep({ patientId, onBack }: IpdAdmissionStepProps) {
    const router = useRouter();
    const selectedBranch = useAppSelector(selectSelectedBranch);
    const userBranchId = useAppSelector(selectUserBranchId);

    const numericPatientId = patientId ?? 0;
    const isValidPatientId = Number.isFinite(numericPatientId) && numericPatientId > 0;

    const {
        data: awaitingListingResponse,
        isLoading: isListingLoading,
        isError: isListingError,
        error: listingError,
    } = useGetIpdAwaitingPatientsQuery(
        { patientId: numericPatientId, limit: 10, page: 1 },
        { skip: !isValidPatientId, refetchOnMountOrArgChange: true }
    );

    const listingPatient = useMemo(
        () => findAwaitingPatientById(awaitingListingResponse?.data, numericPatientId),
        [awaitingListingResponse?.data, numericPatientId]
    );

    const patientDetails = useMemo(
        () => mapAwaitingPatientToOpenFile(listingPatient),
        [listingPatient]
    );

    const requiredDocuments = useMemo(
        () => sortRequiredDocuments(listingPatient?.requiredDocuments),
        [listingPatient?.requiredDocuments]
    );

    const admissionSummary: OpenFileAdmissionSummary | null = patientDetails?.admissionSummary ?? null;

    const [selectedDocuments, setSelectedDocuments] = useState<Record<string, boolean>>({});
    const [confirmConsentsReceived, setConfirmConsentsReceived] = useState(false);
    const [confirmIdTag, setConfirmIdTag] = useState(false);
    const [documentsValidationError, setDocumentsValidationError] = useState<string | null>(null);

    // Create mutation (Finalizes IPD admission)
    const [createIpdAdmission, { isLoading: isCreatingAdmission }] = useCreateIpdAdmissionMutation();

    const [finalizeDialog, setFinalizeDialog] = useState<{
        open: boolean;
        variant: "success" | "error";
        message: string;
    }>({ open: false, variant: "success", message: "" });

    useEffect(() => {
        setSelectedDocuments(buildSelectedDocumentsMap(requiredDocuments));
        setConfirmConsentsReceived(false);
        setConfirmIdTag(false);
        setDocumentsValidationError(null);
    }, [requiredDocuments]);

    const hasSelectedRequiredDocument = useMemo(
        () => hasAtLeastOneSelectedDocument(requiredDocuments, selectedDocuments),
        [requiredDocuments, selectedDocuments]
    );

    const canFinalize = confirmConsentsReceived && hasSelectedRequiredDocument;

    const handleToggleDocument = (documentMasterId: number) => {
        const key = String(documentMasterId);
        setSelectedDocuments((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            if (hasAtLeastOneSelectedDocument(requiredDocuments, next)) {
                setDocumentsValidationError(null);
            }
            return next;
        });
    };

    const admissionBranchId = useMemo(() => {
        return resolveReceptionBranchId({
            patientListingBranchId: patientDetails?.branchId ?? listingPatient?.branchId,
            selectedBranchId: selectedBranch?.id,
            userBranchId,
        });
    }, [patientDetails?.branchId, listingPatient?.branchId, selectedBranch?.id, userBranchId]);

    const handleFinalize = useCallback(async () => {
        if (!confirmConsentsReceived || !patientDetails) return;

        if (!hasSelectedRequiredDocument) {
            setDocumentsValidationError("Please select at least one document.");
            return;
        }

        if (admissionBranchId == null || !Number.isFinite(admissionBranchId) || admissionBranchId < 1) {
            setFinalizeDialog({
                open: true,
                variant: "error",
                message: "Branch information is missing for this patient.",
            });
            return;
        }

        try {
            const payload = buildCreateIpdAdmissionPayload({
                patientId: numericPatientId,
                branchId: admissionBranchId,
                patientName: patientDetails.patientName,
                step1Form: INITIAL_STEP1_FORM,
                requiredDocuments: requiredDocuments as RequiredDocumentItem[],
                selectedDocuments,
            });

            await createIpdAdmission(payload).unwrap();

            setFinalizeDialog({
                open: true,
                variant: "success",
                message: "Admission finalized successfully.",
            });
        } catch (err) {
            setFinalizeDialog({
                open: true,
                variant: "error",
                message: "Failed to finalize IPD admission. Please try again.",
            });
        }
    }, [
        confirmConsentsReceived,
        patientDetails,
        hasSelectedRequiredDocument,
        admissionBranchId,
        numericPatientId,
        requiredDocuments,
        selectedDocuments,
        createIpdAdmission,
    ]);

    if (!isValidPatientId) {
        return (
            <div className="rounded-[20px] border border-[#DFE0E2] bg-white p-6 text-sm text-[#EF4444]">
                Invalid patient ID.
            </div>
        );
    }

    if (isListingLoading) {
        return (
            <div className="flex min-h-[240px] items-center justify-center">
                <SpinnerLoader size={28} />
            </div>
        );
    }

    if (isListingError || !patientDetails || !admissionSummary) {
        return (
            <div className="rounded-[20px] border border-[#DFE0E2] bg-white p-6 text-sm text-[#EF4444]">
                Patient not found in IPD awaiting list.
                {listingError ? ` Error: ${String((listingError as any)?.message ?? listingError)}` : ""}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <Step2IpdAdmission
                admissionSummary={admissionSummary}
                requiredDocuments={requiredDocuments as RequiredDocumentItem[]}
                isDocumentsLoading={false}
                selectedDocuments={selectedDocuments}
                onToggleDocument={handleToggleDocument}
                confirmConsentsReceived={confirmConsentsReceived}
                onConfirmConsentsReceivedChange={setConfirmConsentsReceived}
                confirmIdTag={confirmIdTag}
                onConfirmIdTagChange={setConfirmIdTag}
                onBack={onBack}
                onFinalize={() => void handleFinalize()}
                canFinalize={canFinalize}
                isFinalizing={isCreatingAdmission}
                documentsValidationError={documentsValidationError}
            />

            <MessageDialog
                open={finalizeDialog.open}
                onClose={() => setFinalizeDialog((p) => ({ ...p, open: false }))}
                icon={finalizeDialog.variant === "success" ? "/icons/SuccessCheck.svg" : "/icons/ErrorIcon.svg"}
                iconBgColor={finalizeDialog.variant === "success" ? "#E8F5E9" : "#FFEBEE"}
                message={finalizeDialog.message}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setFinalizeDialog((p) => ({ ...p, open: false }));
                    if (finalizeDialog.variant === "success") {
                        router.push("/ipd-reception/dashboard");
                    }
                }}
            />
        </div>
    );
}

