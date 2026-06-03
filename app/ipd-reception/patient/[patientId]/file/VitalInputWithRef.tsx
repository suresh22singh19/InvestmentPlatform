"use client";

import type { ClipboardEvent, KeyboardEvent } from "react";
import { FormInputField } from "@/components/ui";
import {
  isVitalNumericKeyAllowed,
  sanitizeVitalNumericInput,
  type VitalNumericMode,
} from "@/lib/ipd-reception/sanitizeVitalNumericInput";

type VitalInputWithRefProps = {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  refRange: string;
  placeholder?: string;
  /** integer = digits only; decimal = digits with optional single decimal point (e.g. temperature) */
  numericMode?: VitalNumericMode;
};

export function VitalInputWithRef({
  label,
  unit,
  value,
  onChange,
  refRange,
  placeholder,
  numericMode = "integer",
}: VitalInputWithRefProps) {
  const handleChange = (raw: string) => {
    onChange(sanitizeVitalNumericInput(raw, numericMode));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!isVitalNumericKeyAllowed(e.key, numericMode, value)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    handleChange(value + pasted);
  };

  return (
    <div>
      <FormInputField
        label={label}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        inputMode={numericMode === "decimal" ? "decimal" : "numeric"}
        autoComplete="off"
        suffix={
          <span className="text-xs font-medium text-[#9CA3AF]">{unit}</span>
        }
      />
      <p className="mt-1 text-right text-xs font-medium text-[#0B8C00]">Ref: {refRange}</p>
    </div>
  );
}
