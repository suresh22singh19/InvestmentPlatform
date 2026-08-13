"use client";

import { forwardRef, useMemo } from "react";
import type { InputHTMLAttributes } from "react";

type SizeValue = number | string;

export type FormInputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  width?: SizeValue;
  height?: SizeValue;
  helperText?: string;
  error?: string;
  suffix?: React.ReactNode;
  highlightBlack?: boolean;
  background?: "white" | "green" | "normal" | string;
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

export const FormInputField = forwardRef<HTMLInputElement, FormInputFieldProps>(
  ({ label, width, height = 44, helperText, error, suffix, className, onWheel, min, highlightBlack, background = "white", ...props }, ref) => {
    const wrapperStyles = useMemo(() => {
      return {
        width: normalizeSize(width),
      } as React.CSSProperties;
    }, [width]);

    const inputStyles = useMemo(() => {
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

    const bgClass = background === "green" 
      ? "bg-[#0B8C000D]" 
      : background === "white" || background === "normal"
      ? "bg-white" 
      : background;

    return (
      <div className="inline-flex w-full flex-col gap-2" style={wrapperStyles}>
        <div className="group relative inline-flex w-full">
          <span className={`pointer-events-none absolute left-6 top-0 -translate-y-1/2 rounded-full px-2 text-xs font-medium transition-colors ${background === "green" ? "bg-[#F4FAF4]" : "bg-white"} ${highlightBlack ? "!text-[#444242] !font-semibold !text-[13px]" : "text-[#7B8089]"}`}>
            {renderLabel}
          </span>

          <input
            ref={ref}
            className={`w-full rounded-[32px] border border-[#DFE0E2] ${bgClass} px-6 text-sm font-medium ${highlightBlack ? "text-[#444242] !text-[13px]" : "text-[#434956]"} placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${error ? "border-[#F87171]" : ""} ${props.disabled || props.readOnly ? (background === "green" ? "cursor-not-allowed bg-[#0B8C000D] text-[#667085]" : "cursor-not-allowed bg-[#F2F4F7] text-[#667085]") : "cursor-text"} ${suffix ? "pr-12" : ""} ${className ?? ""}`}
            style={inputStyles}
            min={props.type === "number" ? (min ?? 0) : min}
            onWheel={(e) => {
              if (props.type === "number") e.currentTarget.blur();
              onWheel?.(e);
            }}
            {...props}
          />
          {suffix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
              {suffix}
            </span>
          )}
        </div>

        {helperText && !error ? (
          <span className="text-xs text-[#7B8089]">{helperText}</span>
        ) : null}

        {error ? <span className="text-xs text-[#F87171]">{error}</span> : null}
      </div>
    );
  }
);

FormInputField.displayName = "FormInputField";


