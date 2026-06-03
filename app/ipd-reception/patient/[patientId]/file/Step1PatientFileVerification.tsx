"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Button, FormInputField, FormSelectField, FormTextareaField } from "@/components/ui";
import {
  OPEN_FILE_CLINICAL_NOTE_PLACEHOLDER,
  OPEN_FILE_DIET_OPTIONS,
  OPEN_FILE_VITAL_REFERENCES,
} from "@/lib/ipd-reception/openFileMock";
import type { OpenFilePatientDetails, OpenFileStep1Form } from "@/lib/ipd-reception/types";

type Step1PatientFileVerificationProps = {
  patient: OpenFilePatientDetails;
  admissionNumber: string;
  admissionNumberGenerated: boolean;
  form: OpenFileStep1Form;
  onFormChange: (form: OpenFileStep1Form) => void;
  onGenerateAdmissionNumber: () => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onSaveAndNext: () => void;
};

function SectionCard({
  title,
  titleAddon,
  children,
  className = "",
}: {
  title: string;
  titleAddon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm md:p-6 ${className}`}
    >
      <div className="relative z-10 mb-5 flex items-center gap-2">
        <h2 className="text-base font-medium text-[#262D3B]">{title}</h2>
        {titleAddon}
      </div>
      {children}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#EBECED] bg-[#FAFBFA] px-4 py-3">
      <p className="text-xs font-medium text-[#525763]">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-[#262D3B]">{value}</p>
    </div>
  );
}

export function Step1PatientFileVerification({
  patient,
  admissionNumber,
  admissionNumberGenerated,
  form,
  onFormChange,
  onGenerateAdmissionNumber,
  onBack,
  onSaveDraft,
  onSaveAndNext,
}: Step1PatientFileVerificationProps) {
  const updateVital = (field: keyof OpenFileStep1Form["vitals"], value: string) => {
    onFormChange({
      ...form,
      vitals: { ...form.vitals, [field]: value },
    });
  };

  const updateDietary = (field: keyof OpenFileStep1Form["dietary"], value: string) => {
    onFormChange({
      ...form,
      dietary: { ...form.dietary, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[35%_65%]">
        <SectionCard title="UHID & Admission Details">
          <div className="space-y-4">
            <div className="flex w-full flex-col items-center text-center">
              <p className="w-full text-sm font-medium text-[#434956]">Current UHID</p>
              <p className="mt-1 w-full text-2xl font-bold tracking-tight text-[#262D3B]">
                {patient.uhid}
              </p>
              <p className="mt-2 w-full text-[10px] leading-none text-[#787E8C] whitespace-nowrap lg:text-[11px]">
                System generated unique health identification number for the current session
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoBox label="Admission Type" value={patient.admissionType} />
              <InfoBox label="Ward Category" value={patient.wardCategory} />
            </div>

            {!admissionNumberGenerated ? (
              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="medium"
                  fullWidth
                  className="!min-w-0"
                  onClick={onGenerateAdmissionNumber}
                  leftIcon={
                    <Image
                      src="/icons/RefreshIcon.svg"
                      alt=""
                      width={18}
                      height={18}
                      className="brightness-0 invert"
                    />
                  }
                >
                  Generate Admission Number
                </Button>
                <p className="text-center text-xs text-[#9CA3AF]">Wait for manual trigger</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#EBECED] bg-[#FAFBFA] px-4 py-4 text-center">
                  <p className="text-xs font-medium text-[#525763]">Admission Number</p>
                  <p className="mt-2 text-xl font-bold text-[#262D3B]">{admissionNumber}</p>
                </div>
                <p className="whitespace-nowrap text-center text-xs italic leading-relaxed text-[#434956]">
                  Admission Number Generated Successfully! Please proceed with the admission process.
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Vitals Capture">
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
              {/* Blood Pressure */}
              <div>
                <div className="relative w-full">
                  <FormInputField
                    label="Blood Pressure"
                    value={form.vitals.bloodPressure}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      const limitedDigits = digitsOnly.slice(0, 6);
                      let formattedValue = "";
                      if (limitedDigits.length <= 3) {
                        formattedValue = limitedDigits;
                      } else {
                        formattedValue = `${limitedDigits.slice(0, 3)}/${limitedDigits.slice(3)}`;
                      }
                      updateVital("bloodPressure", formattedValue);
                    }}
                    placeholder="Systolic/Diastolic(mmHg/mmHg)"
                    type="text"
                    className="pr-16"
                    maxLength={7}
                  />
                  <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                    mmHg
                  </span>
                </div>
                <p className="mt-1 text-right text-xs font-medium text-[#0B8C00]">Ref: {OPEN_FILE_VITAL_REFERENCES.bloodPressure}</p>
              </div>

              {/* Sugar Level */}
              <div>
                <div className="relative w-full">
                  <FormInputField
                    label="Sugar Level"
                    value={form.vitals.sugarLevel}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 3);
                      updateVital("sugarLevel", value);
                    }}
                    placeholder="Sugar Level"
                    type="tel"
                    className="pr-16"
                    maxLength={3}
                  />
                  <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                    mg/dL
                  </span>
                </div>
                <p className="mt-1 text-right text-xs font-medium text-[#0B8C00]">Ref: {OPEN_FILE_VITAL_REFERENCES.sugarLevel}</p>
              </div>

              {/* Temperature */}
              <div>
                <div className="relative w-full">
                  <FormInputField
                    label="Temperature"
                    value={form.vitals.temperature}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 3);
                      let value = digitsOnly;
                      if (digitsOnly) {
                        const numValue = parseInt(digitsOnly, 10);
                        if (numValue > 110) value = "110";
                      }
                      updateVital("temperature", value);
                    }}
                    placeholder="Temperature (°F)"
                    type="tel"
                    className="pr-10"
                    maxLength={3}
                  />
                  <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                    °F
                  </span>
                </div>
                <p className="mt-1 text-right text-xs font-medium text-[#0B8C00]">Ref: {OPEN_FILE_VITAL_REFERENCES.temperature}</p>
              </div>

              {/* Pulse */}
              <div>
                <div className="relative w-full">
                  <FormInputField
                    label="Pulse"
                    value={form.vitals.pulseRate}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 3);
                      let value = digitsOnly;
                      if (digitsOnly) {
                        const numValue = parseInt(digitsOnly, 10);
                        if (numValue > 200) value = "200";
                      }
                      updateVital("pulseRate", value);
                    }}
                    placeholder="Pulse"
                    type="tel"
                    className="pr-10"
                    maxLength={3}
                  />
                  <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                    bpm
                  </span>
                </div>
                <p className="mt-1 text-right text-xs font-medium text-[#0B8C00]">Ref: {OPEN_FILE_VITAL_REFERENCES.pulseRate}</p>
              </div>

              {/* SpO2 */}
              <div>
                <div className="relative w-full">
                  <FormInputField
                    label="SPO2"
                    value={form.vitals.spo2}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 3);
                      let value = digitsOnly;
                      if (digitsOnly) {
                        const numValue = parseInt(digitsOnly, 10);
                        if (numValue > 100) value = "100";
                      }
                      updateVital("spo2", value);
                    }}
                    placeholder="SPO2"
                    type="tel"
                    className="pr-10"
                    maxLength={3}
                  />
                  <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: "44px" }}>
                    %
                  </span>
                </div>
                <p className="mt-1 text-right text-xs font-medium text-[#0B8C00]">Ref: {OPEN_FILE_VITAL_REFERENCES.spo2}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Dietary Requirements">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <FormSelectField
                    label="Diet Plan Request *"
                    value={form.dietary.dietPlanRequest}
                    onChange={(v) => updateDietary("dietPlanRequest", String(v))}
                    options={OPEN_FILE_DIET_OPTIONS}
                    mode="single"
                    background="normal"
                    disabled
                  />
                </div>
                <Button
                  variant="outline"
                  size="medium"
                  className="!min-w-0 shrink-0 sm:mb-0.5"
                  leftIcon={<Image src="/icons/Bell.svg" alt="" width={18} height={18} />}
                >
                  Notify Dietitian
                </Button>
              </div>
              <FormTextareaField
                label="Clinical Note for Pantry"
                value={form.dietary.clinicalNote}
                onChange={(e) => updateDietary("clinicalNote", e.target.value)}
                rows={4}
                placeholder={OPEN_FILE_CLINICAL_NOTE_PLACEHOLDER}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <Button
          variant="outline"
          size="medium"
          className="!min-w-0 !border-[#9A7909] !bg-white !text-[#9A7909] shadow-none hover:!bg-[#FBF8F2] active:!bg-[#F5F0E6]"
          onClick={onBack}
          leftIcon={<Image src="/icons/LeftArrowIcon.svg" alt="" width={16} height={16} />}
        >
          Back
        </Button>
        <Button variant="outline" size="medium" className="!min-w-0" onClick={onSaveDraft}>
          Save Draft
        </Button>
        <Button
          variant="primary"
          size="medium"
          className="!min-w-0"
          onClick={onSaveAndNext}
          disabled={!admissionNumberGenerated}
        >
          Save & Next Step
        </Button>
      </div>
    </div>
  );
}
