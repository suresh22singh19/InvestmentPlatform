"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { MessageDialog, SpinnerLoader } from "@/components/ui";
import { ReceptionAdmissionStepper } from "@/components/ipd-reception/open-file/ReceptionAdmissionStepper";
import { Step1PatientFileVerification } from "@/components/ipd-reception/open-file/Step1PatientFileVerification";
import { Step2IpdAdmission } from "@/components/ipd-reception/open-file/Step2IpdAdmission";
import {
  useCreateIpdAdmissionMutation,
  useGetIpdAwaitingPatientsQuery,
} from "@/store/api/ipdReceptionApi";
import { buildCreateIpdAdmissionPayload } from "@/lib/ipd-reception/buildCreateIpdAdmissionPayload";
import { mapAwaitingPatientToOpenFile } from "@/lib/ipd-reception/mapAwaitingPatientToOpenFile";
import { getRtkErrorMessage } from "@/lib/ipd-reception/mapIpdAwaitingPatients";
import { resolveReceptionBranchId } from "@/lib/ipd-reception/resolveReceptionBranchId";
import {
  buildSelectedDocumentsMap,
  findAwaitingPatientById,
  hasAtLeastOneSelectedDocument,
  sortRequiredDocuments,
} from "@/lib/ipd-reception/requiredDocumentsUtils";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import type { OpenFileStep, OpenFileStep1Form } from "@/lib/ipd-reception/openFileTypes";

const INITIAL_STEP1_FORM: OpenFileStep1Form = {
  vitals: {
    bloodPressure: "",
    sugarLevel: "",
    temperature: "",
    pulseRate: "",
    spo2: "",
  },
  dietary: { dietPlanRequest: "", clinicalNote: "" },
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

type OpenFileFlowProps = {
  patientId: string;
};

export function OpenFileFlow({ patientId }: OpenFileFlowProps) {
  const router = useRouter();
  const selectedBranch = useAppSelector(selectSelectedBranch);
  const userBranchId = useAppSelector(selectUserBranchId);
  const numericPatientId = Number(patientId);
  const isValidPatientId = Number.isFinite(numericPatientId) && numericPatientId > 0;

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

  const [currentStep, setCurrentStep] = useState<OpenFileStep>(1);
  const [admissionNumberGenerated, setAdmissionNumberGenerated] = useState(false);
  const [generatedAdmissionNumber, setGeneratedAdmissionNumber] = useState("");
  const [step1Form, setStep1Form] = useState<OpenFileStep1Form>(INITIAL_STEP1_FORM);
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, boolean>>({});
  const [confirmConsentsReceived, setConfirmConsentsReceived] = useState(false);
  const [confirmIdTag, setConfirmIdTag] = useState(false);
  const [finalizeDialog, setFinalizeDialog] = useState<{
    open: boolean;
    variant: "success" | "error";
    message: string;
  }>({ open: false, variant: "success", message: "" });
  const [documentsValidationError, setDocumentsValidationError] = useState<string | null>(null);

  const [createIpdAdmission, { isLoading: isCreatingAdmission }] =
    useCreateIpdAdmissionMutation();

  useEffect(() => {
    if (!listingPatient) return;

    setStep1Form({
      vitals: { ...INITIAL_STEP1_FORM.vitals },
      dietary: {
        dietPlanRequest: "",
        clinicalNote: "",
      },
    });
    setAdmissionNumberGenerated(false);
    setGeneratedAdmissionNumber("");
    setCurrentStep(1);
    setConfirmConsentsReceived(false);
    setConfirmIdTag(false);
    setFinalizeDialog({ open: false, variant: "success", message: "" });
    setDocumentsValidationError(null);
  }, [listingPatient?.patientId]);

  useEffect(() => {
    setSelectedDocuments(buildSelectedDocumentsMap(requiredDocuments));
  }, [requiredDocuments]);

  useEffect(() => {
    if (requiredDocuments.length > 0 && !hasAtLeastOneSelectedDocument(requiredDocuments, selectedDocuments)) {
      setDocumentsValidationError("Please select at least one document.");
    } else {
      setDocumentsValidationError(null);
    }
  }, [requiredDocuments, selectedDocuments]);

  const pageTitle = useMemo(
    () => (currentStep === 1 ? "Patient File & Verification" : "IPD Admission"),
    [currentStep]
  );

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

  const hasSelectedRequiredDocument = useMemo(
    () => hasAtLeastOneSelectedDocument(requiredDocuments, selectedDocuments),
    [requiredDocuments, selectedDocuments]
  );

  const canFinalize = confirmConsentsReceived && hasSelectedRequiredDocument;

  const handleFinalize = async () => {
    if (!confirmConsentsReceived || !patientDetails || !listingPatient) return;

    if (!hasSelectedRequiredDocument) {
      setDocumentsValidationError("Please select at least one document.");
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
        step1Form,
        requiredDocuments,
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
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeading title={pageTitle} />
        <ReceptionAdmissionStepper currentStep={currentStep} />
      </div>

      {currentStep === 1 ? (
        <Step1PatientFileVerification
          patient={patientDetails}
          admissionNumber={generatedAdmissionNumber}
          admissionNumberGenerated={admissionNumberGenerated}
          form={step1Form}
          onFormChange={setStep1Form}
          onGenerateAdmissionNumber={() => {
            setGeneratedAdmissionNumber(createUniqueAdmissionNumber());
            setAdmissionNumberGenerated(true);
          }}
          onBack={() => router.back()}
          onSaveDraft={() => undefined}
          onSaveAndNext={() => setCurrentStep(2)}
        />
      ) : (
        <Step2IpdAdmission
          admissionSummary={patientDetails.admissionSummary}
          requiredDocuments={requiredDocuments}
          isDocumentsLoading={false}
          selectedDocuments={selectedDocuments}
          onToggleDocument={handleToggleDocument}
          confirmConsentsReceived={confirmConsentsReceived}
          onConfirmConsentsReceivedChange={setConfirmConsentsReceived}
          confirmIdTag={confirmIdTag}
          onConfirmIdTagChange={setConfirmIdTag}
          onBack={() => setCurrentStep(1)}
          onFinalize={() => void handleFinalize()}
          canFinalize={canFinalize}
          isFinalizing={isCreatingAdmission}
          documentsValidationError={documentsValidationError}
        />
      )}

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
