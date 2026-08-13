"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MessageDialog, SpinnerLoader } from "@/components/ui";
import { ReceptionFilePatientHeader } from "./ReceptionFilePatientHeader";
import { Step1PatientFileVerification } from "./Step1PatientFileVerification";
import { Step2IpdAdmission } from "./Step2IpdAdmission";
import {
  useCreateIpdAdmissionMutation,
  useGetIpdAwaitingPatientsQuery,
  useSubmitPendingDocumentsMutation,
} from "@/store/api/ipdReceptionApi";
import { buildCreateIpdAdmissionPayload } from "@/lib/ipd-reception/buildCreateIpdAdmissionPayload";
import { mapAwaitingPatientToOpenFile } from "@/lib/ipd-reception/mapAwaitingPatientToOpenFile";
import { getRtkErrorMessage } from "@/lib/ipd-reception/mapIpdAwaitingPatients";
import { resolveReceptionBranchId } from "@/lib/ipd-reception/resolveReceptionBranchId";
import {
  allDocumentsSelected,
  buildDocumentSelectionsMap,
  findAwaitingPatientById,
  hasAtLeastOneRequiredDocument,
  sortRequiredDocuments,
} from "@/lib/ipd-reception/requiredDocumentsUtils";
import type { DocumentSelection } from "@/lib/ipd-reception/requiredDocumentsUtils";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import type { OpenFileStep1Form } from "@/lib/ipd-reception/types";

const INITIAL_STEP1_FORM: OpenFileStep1Form = {
  // vitals: {
  //   bloodPressure: "",
  //   sugarLevel: "",
  //   temperature: "",
  //   pulseRate: "",
  //   spo2: "",
  // },
  patientIdTagNumber:"",
  // _dietary: { dietPlanRequest: "", clinicalNote: "" },
  // get dietary() {
  //   return this._dietary;
  // },
  // set dietary(value) {
  //   this._dietary = value;
  // },
};

const LISTING_QUERY_OPTIONS = {
  refetchOnMountOrArgChange: true as const,
};

function createUniqueAdmissionNumber(): string {
  const now = new Date();
  const yearPart = String(now.getFullYear()).slice(-2);
  const monthPart = String(now.getMonth() + 1).padStart(2, "0");
  const dayPart = String(now.getDate()).padStart(2, "0");
  const datePart = `${yearPart}${monthPart}${dayPart}`;
  const flowPart = String(Math.floor(1000 + Math.random() * 9000));

  return `IPD-${datePart}-${flowPart}`;
}

export default function ReceptionOpenFilePage() {
  const params = useParams();
  const patientId = typeof params?.patientId === "string" ? params?.patientId : "";

  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBranch = useAppSelector(selectSelectedBranch);
  const userBranchId = useAppSelector(selectUserBranchId);
  const numericPatientId = Number(patientId);
  const isValidPatientId = Number.isFinite(numericPatientId) && numericPatientId > 0;
  const nonCompliantMode = searchParams?.get("mode") === "non-compliant";

  const {
    data: awaitingListingResponse,
    isLoading: isListingLoading,
    isError: isListingError,
    error: listingError,
  } = useGetIpdAwaitingPatientsQuery(
    { patientId: numericPatientId, limit: 10, page: 1 },
    { skip: !isValidPatientId, ...LISTING_QUERY_OPTIONS }
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

  const branchId = useMemo(
    () =>
      resolveReceptionBranchId({
        patientListingBranchId: patientDetails?.branchId ?? listingPatient?.branchId,
        selectedBranchId: selectedBranch?.id,
        userBranchId,
      }),
    [patientDetails?.branchId, listingPatient?.branchId, selectedBranch?.id, userBranchId]
  );

  const [admissionNumberGenerated, setAdmissionNumberGenerated] = useState(false);
  const [generatedAdmissionNumber, setGeneratedAdmissionNumber] = useState("");
  const [step1Form, setStep1Form] = useState<OpenFileStep1Form>(INITIAL_STEP1_FORM);
  const [confirmPatientIdTagIssued, setConfirmPatientIdTagIssued] = useState(false);
  const [submitValidationAttempted, setSubmitValidationAttempted] = useState(false);
  const [documentSelections, setDocumentSelections] = useState<
    Record<number, DocumentSelection | undefined>
  >({});
  const [confirmConsentsReceived, setConfirmConsentsReceived] = useState(false);
  const [finalizeDialog, setFinalizeDialog] = useState<{
    open: boolean;
    variant: "success" | "error";
    message: string;
  }>({ open: false, variant: "success", message: "" });
  const [documentsValidationError, setDocumentsValidationError] = useState<string | null>(null);

  const [createIpdAdmission, { isLoading: isCreatingAdmission }] =
    useCreateIpdAdmissionMutation();

  const [submitPendingDocuments, { isLoading: isSubmittingDocuments }] =
    useSubmitPendingDocumentsMutation();

  useEffect(() => {
    if (!listingPatient) return;

    setStep1Form({
      // vitals: { ...INITIAL_STEP1_FORM.vitals },
      // dietary: {
      //   dietPlanRequest: "",
      //   clinicalNote: "",
      // },
        patientIdTagNumber:"",
    });
    setConfirmPatientIdTagIssued(false);
    setSubmitValidationAttempted(false);
    setAdmissionNumberGenerated(false);
    setGeneratedAdmissionNumber("");
    setConfirmConsentsReceived(false);
    setFinalizeDialog({ open: false, variant: "success", message: "" });
    setDocumentsValidationError(null);
  }, [listingPatient?.patientId, nonCompliantMode]);

  useEffect(() => {
    setDocumentSelections(buildDocumentSelectionsMap(requiredDocuments));
  }, [requiredDocuments]);

  const handleRequiredChange = (documentMasterId: number, checked: boolean) => {
    setDocumentSelections((prev) => {
      const next = { ...prev };
      if (checked) {
        next[documentMasterId] = "required";
      } else if (prev[documentMasterId] === "required") {
        delete next[documentMasterId];
      }
      return next;
    });
    setDocumentsValidationError(null);
  };

  const handleNotRequiredChange = (documentMasterId: number, checked: boolean) => {
    setDocumentSelections((prev) => {
      const next = { ...prev };
      if (checked) {
        next[documentMasterId] = "not_required";
      } else if (prev[documentMasterId] === "not_required") {
        delete next[documentMasterId];
      }
      return next;
    });
    setDocumentsValidationError(null);
  };

  const allDocumentsHaveSelection = useMemo(
    () => allDocumentsSelected(requiredDocuments, documentSelections),
    [requiredDocuments, documentSelections]
  );

  const hasSelectedRequiredDocument = useMemo(
    () => hasAtLeastOneRequiredDocument(requiredDocuments, documentSelections),
    [requiredDocuments, documentSelections]
  );

  const canFinalize =
    confirmConsentsReceived &&
    allDocumentsHaveSelection &&
    hasSelectedRequiredDocument;

  const isNonCompliantValid = canFinalize;

  const canUpdateDocument = !submitValidationAttempted || isNonCompliantValid;

  const isStep1Valid =
    nonCompliantMode ||
    (admissionNumberGenerated &&
      Boolean(step1Form.patientIdTagNumber?.trim()) &&
      confirmPatientIdTagIssued);

  const canSubmit = !submitValidationAttempted || isStep1Valid;

  const handleSubmit = async () => {
    if (nonCompliantMode) {
      setSubmitValidationAttempted(true);

      if (!allDocumentsHaveSelection) {
        setDocumentsValidationError(
          "Please select Required or Not Required for all documents."
        );
      } else if (!hasSelectedRequiredDocument) {
        setDocumentsValidationError("Please select at least one required document.");
      } else {
        setDocumentsValidationError(null);
      }

      if (!isNonCompliantValid) return;

      await handleFinalize();
      return;
    }

    setSubmitValidationAttempted(true);

    if (!isStep1Valid) return;

    await handleFinalize();
  };

  const handleFinalize = async () => {
    if (!patientDetails || !listingPatient) return;

    if (nonCompliantMode) {
      try {
        const documents = requiredDocuments.map((doc) => ({
          documentMasterId: doc.documentMasterId,
          isSubmitted: documentSelections[doc.documentMasterId] === "required",
        }));
        await submitPendingDocuments({
          patientId: numericPatientId,
          documents,
        }).unwrap();
        setFinalizeDialog({
          open: true,
          variant: "success",
          message: "Documents updated successfully.",
        });
      } catch (err) {
        setFinalizeDialog({
          open: true,
          variant: "error",
          message: getRtkErrorMessage(err, "Failed to update documents."),
        });
      }
      return;
    }

    if (branchId == null || !Number.isFinite(branchId) || branchId < 1) {
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
        branchId,
        patientName: patientDetails.patientName,
        admissionNo: generatedAdmissionNumber,
        step1Form,
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
        message: getRtkErrorMessage(err, "Failed to finalize IPD admission."),
      });
    }
  };

  const dismissFinalizeDialog = () => {
    setFinalizeDialog((prev) => ({ ...prev, open: false }));
  };

  if (!isValidPatientId) {
    return (
      <AppShell>
        <p className="text-sm text-[#EF4444]">Invalid patient ID.</p>
      </AppShell>
    );
  }

  if (isListingLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[240px] items-center justify-center">
          <SpinnerLoader size={28} />
        </div>
      </AppShell>
    );
  }

  if (isListingError || !patientDetails) {
    return (
      <AppShell>
        <p className="text-sm text-[#EF4444]">
          {isListingError
            ? getRtkErrorMessage(listingError, "Failed to load patient from awaiting list.")
            : "Patient not found in the awaiting admissions list."}
        </p>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <div className="mb-0">
        <ReceptionFilePatientHeader patient={patientDetails} />
      </div>

      <div className="space-y-6">
        {!nonCompliantMode ? (
          <Step1PatientFileVerification
            patient={patientDetails}
            admissionNumber={generatedAdmissionNumber}
            admissionNumberGenerated={admissionNumberGenerated}
            form={step1Form}
            onFormChange={setStep1Form}
            confirmPatientIdTagIssued={confirmPatientIdTagIssued}
            onConfirmPatientIdTagIssuedChange={setConfirmPatientIdTagIssued}
            onGenerateAdmissionNumber={() => {
              setGeneratedAdmissionNumber(createUniqueAdmissionNumber());
              setAdmissionNumberGenerated(true);
            }}
            onBack={() => router.back()}
            validationAttempted={submitValidationAttempted}
            onSubmit={() => void handleSubmit()}
            canSubmit={canSubmit}
            isSubmitting={isCreatingAdmission}
          />
        ) : null}

        {nonCompliantMode ? (
          <Step2IpdAdmission
            admissionSummary={patientDetails.admissionSummary}
            requiredDocuments={requiredDocuments}
            isDocumentsLoading={false}
            documentSelections={documentSelections}
            onRequiredChange={handleRequiredChange}
            onNotRequiredChange={handleNotRequiredChange}
            confirmConsentsReceived={confirmConsentsReceived}
            onConfirmConsentsReceivedChange={setConfirmConsentsReceived}
            onBack={() => router.back()}
            onFinalize={() => void handleSubmit()}
            canFinalize={canUpdateDocument}
            isFinalizing={isSubmittingDocuments}
            documentsValidationError={documentsValidationError}
            validationAttempted={submitValidationAttempted}
            nonCompliantMode
            hideActions
          />
        ) : null}
      </div>

      <MessageDialog
        open={finalizeDialog.open}
        onClose={dismissFinalizeDialog}
        icon={
          finalizeDialog.variant === "success"
            ? "/icons/SuccessCheck.svg"
            : "/icons/ErrorIcon.svg"
        }
        iconBgColor={finalizeDialog.variant === "success" ? "#E8F5E9" : "#FFEBEE"}
        message={finalizeDialog.message}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          dismissFinalizeDialog();
          if (finalizeDialog.variant === "success") {
            router.push("/ipd-reception/dashboard");
          }
        }}
      />
    </AppShell>
  );
}
