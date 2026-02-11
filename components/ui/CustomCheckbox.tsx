"use client";

import React from "react";

type SizeValue = number | string;

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  width?: SizeValue;
  height?: SizeValue;
  disabled?: boolean;
  className?: string;
}

const normalizeSize = (value: SizeValue | undefined) => {
  if (value === undefined) return undefined;
  if (typeof value === "number") return `${value}px`;
  return value;
};

const CheckIcon = () => (
  <svg
    width="12"
    height="9"
    viewBox="0 0 12 9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.6666 1.66675L4.24992 8.08341L1.33325 5.16675"
      stroke="#0B8C00"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  width = 16,
  height = 16,
  disabled = false,
  className = "",
}) => {
  const sizeStyles: React.CSSProperties = {
    width: normalizeSize(width),
    height: normalizeSize(height),
  };

  return (
    <button
      type="button"
      className={`relative inline-flex items-center justify-center rounded-[4px] border-2 bg-white ${
        checked ? "border-[#0B8C00]" : "border-[#D0D5DD]"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}
      style={sizeStyles}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      aria-pressed={checked}
      aria-checked={checked}
      role="checkbox"
    >
      {checked ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <CheckIcon />
        </span>
      ) : null}
    </button>
  );
};

