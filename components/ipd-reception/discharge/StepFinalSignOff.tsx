"use client";

import { useState } from "react";
import { BackToPreviousPageButton, Button, FormInputField } from "@/components/ui";
import type { DischargePatientProfile } from "@/lib/ipd-reception/dischargeTypes";

type StepFinalSignOffProps = {
  patient: DischargePatientProfile;
  onBack: () => void;
  onComplete: () => void;
};

const CONFIRMATION_TEXT =
  "I confirm that I have explained the discharge instructions and medications to the patient. I have also explained the follow-up care requirements and warning signs. The documents including the reports have been handed over to the patient.";

export function StepFinalSignOff({ patient, onBack, onComplete }: StepFinalSignOffProps) {
  const [nurseName, setNurseName] = useState("");

  return (
    <div className="space-y-6">
      <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#262D3B]">Final Sign-off & Discharge</h2>

        <div className="mt-6 max-w-xl">
          <FormInputField
            label="Logged in Nurse's name"
            value={nurseName}
            onChange={(e) => setNurseName(e.target.value)}
            placeholder="Enter nurse name"
          />
        </div>

        <p className="mt-4 text-sm text-[#525763]">
          Bed {patient.bedCode} will be marked as vacant upon completion.
        </p>

        <div className="mt-6 rounded-[16px] border border-[#0B8C00]/30 bg-[#F4FAF4] p-5">
          <p className="text-sm leading-relaxed text-[#434956]">{CONFIRMATION_TEXT}</p>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <BackToPreviousPageButton text="Back" onClick={onBack} />
        <Button
          variant="primary"
          size="medium"
          className="!min-w-0 sm:min-w-[200px]"
          onClick={onComplete}
          disabled={!nurseName.trim()}
        >
          Complete Discharge
        </Button>
      </div>
    </div>
  );
}
