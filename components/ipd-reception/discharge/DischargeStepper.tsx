"use client";

import { DISCHARGE_STEP_LABELS } from "@/lib/ipd-reception/dischargeMock";
import type { DischargeFlowStep } from "@/lib/ipd-reception/dischargeTypes";

type DischargeStepperProps = {
  currentStep: DischargeFlowStep;
};

export function DischargeStepper({ currentStep }: DischargeStepperProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {DISCHARGE_STEP_LABELS.map((label, index) => {
        const stepNumber = (index + 1) as DischargeFlowStep;
        const isActive = currentStep === stepNumber;

        return (
          <div
            key={label}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-[#0B8C00] text-white"
                : "border border-[#DFE0E2] bg-white text-[#787E8C]"
            }`}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
