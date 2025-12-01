"use client";

import { forwardRef, useMemo } from "react";
import type { TextareaHTMLAttributes } from "react";

type SizeValue = number | string;

export type FormTextareaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> & {
  label: string;
  width?: SizeValue;
  height?: SizeValue;
  helperText?: string;
  error?: string;
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

export const FormTextareaField = forwardRef<HTMLTextAreaElement, FormTextareaFieldProps>(
  ({ label, width, height = 94, helperText, error, className, ...props }, ref) => {
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

    return (
      <div className="inline-flex w-full flex-col gap-2" style={wrapperStyles}>
        <div className="group relative inline-flex w-full">
          <span className="pointer-events-none absolute left-6 top-0 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
            {label}
          </span>

          <textarea
            ref={ref}
            className={`w-full rounded-[32px] border border-[#DFE0E2] bg-white px-6 py-3 text-sm font-medium text-[#434956] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 transition-colors resize-none ${error ? "border-[#F87171]" : ""} ${className ?? ""}`}
            style={textareaStyles}
            {...props}
          />
        </div>

        {helperText && !error ? (
          <span className="text-xs text-[#7B8089]">{helperText}</span>
        ) : null}

        {error ? <span className="text-xs text-[#F87171]">{error}</span> : null}
      </div>
    );
  }
);

FormTextareaField.displayName = "FormTextareaField";

