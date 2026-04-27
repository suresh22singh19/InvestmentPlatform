"use client";

import Image from "next/image";
import { FormInputField, Checkbox } from "@/components/ui";

export interface AddictionDetailsFormData {
  addictionAlcohol: boolean;
  addictionSmoking: boolean;
  addictionTobacco: boolean;
  addictionDrugs: boolean;
  addictionOther: boolean;
  addictionSpecify: string;
}

interface AddictionDetailsProps {
  formData: AddictionDetailsFormData;
  onChange: (field: keyof AddictionDetailsFormData, value: boolean | string) => void;
  onBlur?: (field: keyof AddictionDetailsFormData) => void;
  fieldRefs?: {
    addictionSpecify?: React.RefObject<HTMLInputElement | null>;
  };
  errors?: Record<string, string>;
}

const ADDICTION_OPTIONS: { key: keyof AddictionDetailsFormData; label: string }[] = [
  { key: "addictionAlcohol", label: "Alcohol" },
  { key: "addictionSmoking", label: "Smoking" },
  { key: "addictionTobacco", label: "Tobacco" },
  { key: "addictionDrugs", label: "Drugs" },
  { key: "addictionOther", label: "Other" },
];

export default function AddictionDetails({
  formData,
  onChange,
  onBlur,
  fieldRefs,
  errors,
}: AddictionDetailsProps) {
  const showSpecify = formData.addictionOther;

  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4 mt-4">
      <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
        <Image src="/icons/patientinfo.svg" alt="Addiction" width={20} height={20} /> Addiction Details
      </h2>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {ADDICTION_OPTIONS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                checked={formData[key] as boolean}
                onChange={(checked) => onChange(key, checked)}
                width={16}
                height={16}
              />
              <span className="text-sm text-[#262D3B]">{label}</span>
            </div>
          ))}
        </div>
        {showSpecify && (
          <div className="min-w-[200px] flex-1 ml-auto" data-field="addictionSpecify" ref={fieldRefs?.addictionSpecify}>
            <FormInputField
              label="Specify"
              value={formData.addictionSpecify}
              onChange={(e) => onChange("addictionSpecify", e.target.value.slice(0, 100))}
              onBlur={() => onBlur?.("addictionSpecify")}
              placeholder="Please Specify"
              type="text"
              maxLength={100}
              error={errors?.addictionSpecify}
            />
          </div>
        )}
      </div>
    </div>
  );
}
