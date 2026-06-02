"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MessageDialog } from "@/components/ui";
import { DischargePatientHeader } from "@/components/ipd-reception/discharge/DischargePatientHeader";
import { DischargeStepper } from "@/components/ipd-reception/discharge/DischargeStepper";
import { StepBillingPayment } from "@/components/ipd-reception/discharge/StepBillingPayment";
import { StepDocumentGeneration } from "@/components/ipd-reception/discharge/StepDocumentGeneration";
import { StepFinalSignOff } from "@/components/ipd-reception/discharge/StepFinalSignOff";
import { StepMedicalClearance } from "@/components/ipd-reception/discharge/StepMedicalClearance";
import {
  DISCHARGE_BILLING_INFO,
  getDischargePatientProfile,
  INITIAL_MEDICAL_CLEARANCE_FORM,
} from "@/lib/ipd-reception/dischargeMock";
import {
  DISCHARGE_TYPE_LABELS,
  isDischargeTypeValue,
} from "@/lib/ipd-reception/dischargeTypeOptions";
import type { DischargeFlowStep, MedicalClearanceForm } from "@/lib/ipd-reception/dischargeTypes";

type DischargeFlowProps = {
  patientId: string;
};

export function DischargeFlow({ patientId }: DischargeFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePatient = getDischargePatientProfile(patientId);

  const patient = useMemo(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && isDischargeTypeValue(typeParam)) {
      return { ...basePatient, dischargeType: DISCHARGE_TYPE_LABELS[typeParam] };
    }
    return basePatient;
  }, [basePatient, searchParams]);

  const [currentStep, setCurrentStep] = useState<DischargeFlowStep>(1);
  const [medicalForm, setMedicalForm] = useState<MedicalClearanceForm>(
    INITIAL_MEDICAL_CLEARANCE_FORM
  );
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const goBack = () => {
    if (currentStep === 1) {
      router.back();
      return;
    }
    setCurrentStep((prev) => (prev - 1) as DischargeFlowStep);
  };

  const goNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as DischargeFlowStep);
    }
  };

  return (
    <AppShell>
      <DischargePatientHeader patient={patient} showViewProfile={currentStep === 3} />

      <div className="mb-6">
        <DischargeStepper currentStep={currentStep} />
      </div>

      {currentStep === 1 ? (
        <StepMedicalClearance
          form={medicalForm}
          onFormChange={setMedicalForm}
          onBack={goBack}
          onNext={goNext}
        />
      ) : null}

      {currentStep === 2 ? (
        <StepBillingPayment billing={DISCHARGE_BILLING_INFO} onBack={goBack} onNext={goNext} />
      ) : null}

      {currentStep === 3 ? (
        <StepDocumentGeneration onBack={goBack} onNext={goNext} />
      ) : null}

      {currentStep === 4 ? (
        <StepFinalSignOff
          patient={patient}
          onBack={goBack}
          onComplete={() => setShowSuccessDialog(true)}
        />
      ) : null}

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message="Patient discharge completed successfully."
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          router.push("/ipd-reception/admitted-patients/pending-discharges");
        }}
      />
    </AppShell>
  );
}
