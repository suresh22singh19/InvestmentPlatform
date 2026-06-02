"use client";

import { useEffect, useState } from "react";
import { Button, Dialog } from "@/components/ui";
import type { AdmittedPatientRegistryItem } from "@/lib/ipd-reception/admittedPatientsTypes";
import {
  DISCHARGE_TYPE_OPTIONS,
  type DischargeTypeValue,
} from "@/lib/ipd-reception/dischargeTypeOptions";

type SelectDischargeTypeDialogProps = {
  open: boolean;
  patient: AdmittedPatientRegistryItem | null;
  onClose: () => void;
  onContinue: (dischargeType: DischargeTypeValue) => void;
};

function PatientSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-[#9FA2AB]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#262D3B]">{value}</p>
    </div>
  );
}

export function SelectDischargeTypeDialog({
  open,
  patient,
  onClose,
  onContinue,
}: SelectDischargeTypeDialogProps) {
  const [selectedType, setSelectedType] = useState<DischargeTypeValue>("normal");

  useEffect(() => {
    if (open) {
      setSelectedType("normal");
    }
  }, [open, patient?.id]);

  if (!patient) {
    return null;
  }

  const handleContinue = () => {
    onContinue(selectedType);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Select Discharge Type - ${patient.patientName}`}
      width={720}
      contentPadding="px-6 pb-6 pt-2"
    >
      <div className="space-y-6">
        <div className="flex gap-0 overflow-hidden rounded-[12px] border border-[#E3EEE1] bg-[#F4FAF4]">
          <div className="w-1 shrink-0 bg-[#0B8C00]" aria-hidden />
          <div className="grid flex-1 grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <PatientSummaryItem label="Patient UHID" value={patient.patientUhid} />
            <PatientSummaryItem label="Gender" value={patient.gender} />
            <PatientSummaryItem label="Diagnosis" value={patient.diagnosis} />
            <PatientSummaryItem label="Ward/Bed" value={patient.wardBed} />
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-[#434956]">Discharge Type</p>
          <div className="flex flex-wrap gap-2">
            {DISCHARGE_TYPE_OPTIONS.map((option) => {
              const isSelected = selectedType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedType(option.value)}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-[#0B8C00] text-white"
                      : "border border-[#DFE0E2] bg-white text-[#787E8C] hover:border-[#0B8C00]/40"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="primary" size="medium" className="!min-w-[120px]" onClick={handleContinue}>
            Continue
          </Button>
          <Button variant="outline" size="medium" className="!min-w-[120px]" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
