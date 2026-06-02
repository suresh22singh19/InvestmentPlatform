"use client";

import { OPEN_FILE_STEP_LABELS } from "@/lib/ipd-reception/openFileMock";
import type { OpenFileStep } from "@/lib/ipd-reception/types";

type ReceptionAdmissionStepperProps = {
  currentStep: OpenFileStep;
};

export function ReceptionAdmissionStepper({ currentStep }: ReceptionAdmissionStepperProps) {
  return (
    <div className="flex items-start gap-2 select-none shrink-0">
      {OPEN_FILE_STEP_LABELS.map((label, index) => {
        const stepNumber = (index + 1) as OpenFileStep;
        const isActive = currentStep >= stepNumber;
        const isLast = index === OPEN_FILE_STEP_LABELS.length - 1;

        return (
          <div key={label} className="flex items-start gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#0B8C00] text-white"
                    : "border border-[#DFE0E2] bg-white text-[#787E8C]"
                }`}
              >
                {stepNumber}
              </div>
              <span
                className={`whitespace-nowrap text-center text-xs font-semibold leading-tight ${
                  isActive ? "text-[#0B8C00]" : "text-[#787E8C]"
                }`}
              >
                {label}
              </span>
            </div>
            {!isLast ? (
              <div
                className={`mx-1 mt-[13px] w-32 rounded-full transition-all sm:w-40 ${
                  currentStep > stepNumber ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
