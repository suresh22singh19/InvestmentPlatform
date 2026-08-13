"use client";

import { forwardRef, useMemo, useState } from "react";
import type { TextareaHTMLAttributes } from "react";

type SizeValue = number | string;

export type FormTextareaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> & {
  label: string;
  width?: SizeValue;
  height?: SizeValue;
  helperText?: string;
  error?: string;
  highlightBlack?: boolean;
  validateTextFormat?: boolean;
  preventOnlySpecialChars?: boolean;
  validationErrorMessage?: string;
};

const normalizeSize = (value: SizeValue | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
};

export const isMeaningfulText = (val: string): boolean => {
  if (!val || typeof val !== "string") return true;
  const trimmed = val.trim();
  if (trimmed === "") return true;

  // 1. Must contain at least one letter (a-z, A-Z, Unicode letters) OR at least one digit (0-9)
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    return false;
  }

  // 2. Reject 3 or more consecutive abnormal special characters (e.g. ##%%, #$$#, *^$%)
  // Allow normal punctuation like ..., ---, quotes, etc.
  if (/[^\p{L}\p{N}\s,.\-\/"'():+|]{3,}/u.test(trimmed)) {
    return false;
  }

  // 3. Special character density ratio: max 35% non-alphanumeric/non-standard chars
  const nonStandardChars = trimmed.replace(/[\p{L}\p{N}\s,.\-\/"'():+|]/gu, "");
  if (nonStandardChars.length / trimmed.length > 0.35) {
    return false;
  }

  // 4. Token-by-token validation
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  let junkTokenCount = 0;

  for (const rawToken of tokens) {
    // Strip common surrounding punctuation/quotes like ", ', ,, ., :, ;, (), [], {}, |
    const cleanToken = rawToken.replace(/^[^a-zA-Z0-9\u0900-\u097F]+|[^a-zA-Z0-9\u0900-\u097F]+$/gu, "");
    if (!cleanToken) {
      // Token was just standalone punctuation/symbol (e.g. "|", "&", "/", "-", ":", ",") -> valid
      continue;
    }

    // Pattern A: Pure numbers or phone numbers / dates / times / ratios / prices / years
    // e.g. 1999, 7519499000, 75194-99000, +91-75194-99000, 15/07/2026, 120/80, 10:30, 500.00
    if (/^\+?\d+([-\/\.:\s]\d+)*$/u.test(cleanToken)) {
      const digitCount = cleanToken.replace(/\D/g, "").length;
      const hasExcessiveRepeatedChars = /(.)\1{7,}/.test(cleanToken);
      if (digitCount > 20 || hasExcessiveRepeatedChars) {
        junkTokenCount++;
        continue;
      }
      continue;
    }

    // Pattern B: Hyphenated / Slashed words or codes
    // e.g. non-vegetarian, COVID-19, Type-2, A-12, 75194-99000, BP-120/80
    if (/^[\p{L}\p{N}]+([-\/][\p{L}\p{N}]+)+$/u.test(cleanToken)) {
      continue;
    }

    // Check C: Token has digits fused directly with letters (e.g. 84346843265gsd5g, ds64g3ds5gsd62...)
    if (/\d+/.test(cleanToken) && /\p{L}/u.test(cleanToken)) {
      // Exception: standard unit suffixes, ordinals, time AM/PM, short alpha-numeric codes (e.g. 10mg, 5ml, 1st, 2nd, 3rd, 4th, 10am, 2024, B12, A1)
      const isStandardUnitOrCode =
        /^\d+(mg|ml|g|kg|l|cm|mm|m|oz|iu|tab|caps?|pills?|hrs?|days?|wks?|yrs?|st|nd|rd|th|am|pm)$/i.test(cleanToken) ||
        /^[a-z]{1,3}\d{1,6}$/i.test(cleanToken) ||
        /^\d{1,6}[a-z]{1,3}$/i.test(cleanToken);

      if (!isStandardUnitOrCode) {
        junkTokenCount++;
        continue;
      }
    }

    // Check D: Token contains invalid special characters inside (e.g. fhgfhgf*^$%5$#fdghfgh)
    if (/[^\p{L}\p{N}]/u.test(cleanToken)) {
      junkTokenCount++;
      continue;
    }

    // Check E: Extremely long unspaced word token (> 25 letters)
    if (cleanToken.length > 25) {
      junkTokenCount++;
      continue;
    }

    // Check F: If token consists of letters (length >= 3), check for consonant mashing (must contain at least one vowel)
    if (/^\p{L}+$/u.test(cleanToken) && cleanToken.length >= 3) {
      const hasVowel = /[aeiouyAEIOUY\u0904-\u0914\u093E-\u094C]/u.test(cleanToken);
      // Allow common uppercase medical/general abbreviations without vowels (e.g. BP, OPD, IPD, CBC, ECG, MRI, CT, TB, HIV, ICU, PGI, AIIMS, SMS, ID)
      const isKnownAbbr = /^[A-Z]{2,6}$/.test(cleanToken);
      if (!hasVowel && !isKnownAbbr) {
        junkTokenCount++;
        continue;
      }
    }
  }

  // Reject if any junk token was detected
  if (junkTokenCount > 0) {
    return false;
  }

  return true;
};

export const FormTextareaField = forwardRef<HTMLTextAreaElement, FormTextareaFieldProps>(
  (
    {
      label,
      width,
      height = 94,
      helperText,
      error,
      className,
      highlightBlack,
      validateTextFormat,
      preventOnlySpecialChars,
      validationErrorMessage = "Please enter valid meaningful text",
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const shouldValidate = Boolean(validateTextFormat || preventOnlySpecialChars);
    const [internalError, setInternalError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (shouldValidate) {
        const val = e.target.value;
        if (!isMeaningfulText(val)) {
          setInternalError(validationErrorMessage);
        } else {
          setInternalError(null);
        }
      }
      onChange?.(e);
    };

    const effectiveError = useMemo(() => {
      if (error) return error;
      if (internalError) return internalError;
      if (shouldValidate && typeof value === "string" && !isMeaningfulText(value)) {
        return validationErrorMessage;
      }
      return undefined;
    }, [error, internalError, shouldValidate, value, validationErrorMessage]);

    const wrapperStyles = useMemo(() => {
      return {
        width: normalizeSize(width),
      } as React.CSSProperties;
    }, [width]);

    const textareaStyles = useMemo(() => {
      return {
        height: normalizeSize(height),
      } as React.CSSProperties;
    }, [height]);

    const renderLabel = useMemo(() => {
      if (label.includes("*")) {
        const parts = label.split("*");
        return (
          <>
            {parts[0]}
            <span className="text-[#F6776E]">*</span>
            {parts.slice(1).join("*")}
          </>
        );
      }
      return label;
    }, [label]);

    return (
      <div className="inline-flex w-full flex-col gap-2" style={wrapperStyles}>
        <div className="group relative inline-flex w-full">
          <span className={`pointer-events-none absolute left-6 top-0 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium transition-colors ${highlightBlack ? "!text-[#444242] !font-semibold !text-[13px]" : "text-[#7B8089]"}`}>
            {renderLabel}
          </span>

          <textarea
            ref={ref}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-quillbot-element="false"
            data-no-quillbot="true"
            data-quillbot-disable="true"
            data-lt-active="false"
            className={`w-full rounded-[32px] border border-[#DFE0E2] bg-white px-6 py-3 text-sm font-medium ${highlightBlack ? "text-[#444242] !text-[13px]" : "text-[#434956]"} placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 transition-colors resize-none ${effectiveError ? "border-[#F87171]" : ""} ${className ?? ""}`}
            style={textareaStyles}
            value={value}
            onChange={handleChange}
            {...props}
          />
        </div>

        {helperText && !effectiveError ? (
          <span className="text-xs text-[#7B8089]">{helperText}</span>
        ) : null}

        {effectiveError ? <span className="text-xs text-[#F87171]">{effectiveError}</span> : null}
      </div>
    );
  }
);

FormTextareaField.displayName = "FormTextareaField";

