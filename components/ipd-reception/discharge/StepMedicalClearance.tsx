"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { DatePicker, FormInputField, FormTextareaField } from "@/components/ui";
import type { MedicalClearanceForm } from "@/lib/ipd-reception/dischargeTypes";
import { DischargeFlowFooter } from "./DischargeFlowFooter";

type StepMedicalClearanceProps = {
  form: MedicalClearanceForm;
  onFormChange: (form: MedicalClearanceForm) => void;
  onBack: () => void;
  onNext: () => void;
};

function SectionCard({ title, iconSrc, children }: { title: string; iconSrc: string; children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Image src={iconSrc} alt="" width={20} height={20} />
        <h2 className="text-base font-medium text-[#262D3B]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function VitalField({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
}) {
  return (
    <FormInputField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      suffix={<span className="text-xs font-medium text-[#9FA2AB]">{unit}</span>}
    />
  );
}

export function StepMedicalClearance({
  form,
  onFormChange,
  onBack,
  onNext,
}: StepMedicalClearanceProps) {
  const update = <K extends keyof MedicalClearanceForm>(key: K, value: MedicalClearanceForm[K]) => {
    onFormChange({ ...form, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Final Vitals Recording" iconSrc="/icons/VitalsIcon.svg">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <VitalField
              label="Blood Pressure"
              value={form.bloodPressure}
              onChange={(v) => update("bloodPressure", v)}
              unit="mmHg"
            />
            <VitalField
              label="Sugar Level"
              value={form.sugarLevel}
              onChange={(v) => update("sugarLevel", v)}
              unit="mg/dL"
            />
            <VitalField
              label="Temperature"
              value={form.temperature}
              onChange={(v) => update("temperature", v)}
              unit="°C"
            />
            <VitalField
              label="Pulse"
              value={form.pulse}
              onChange={(v) => update("pulse", v)}
              unit="bpm"
            />
            <div className="sm:col-span-2">
              <VitalField
                label="SPO2"
                value={form.spo2}
                onChange={(v) => update("spo2", v)}
                unit="%"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Post-Discharge Care Instructions" iconSrc="/icons/documents.svg">
          <FormTextareaField
            label="Instructions"
            value={form.postDischargeInstructions}
            onChange={(e) => update("postDischargeInstructions", e.target.value)}
            rows={8}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SectionCard title="Diet Guidelines" iconSrc="/icons/dietplan.svg">
          <FormTextareaField
            label="Diet Guidelines"
            value={form.dietGuidelines}
            onChange={(e) => update("dietGuidelines", e.target.value)}
            rows={5}
          />
        </SectionCard>

        <SectionCard title="Follow-up Visit" iconSrc="/icons/calendarCheck.svg">
          <DatePicker
            label="Follow-up Date"
            value={form.followUpDate}
            onChange={(v) => update("followUpDate", v)}
            placeholder="DD/MM/YY"
          />
        </SectionCard>

        <SectionCard title="Emergency Warning Signs" iconSrc="/icons/Bell.svg">
          <FormTextareaField
            label="Warning Signs"
            value={form.emergencyWarningSigns}
            onChange={(e) => update("emergencyWarningSigns", e.target.value)}
            rows={5}
          />
        </SectionCard>
      </div>

      <DischargeFlowFooter onBack={onBack} onNext={onNext} />
    </div>
  );
}
