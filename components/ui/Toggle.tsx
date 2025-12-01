"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-8 w-[60px] items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none
          ${checked ? "bg-[#0B8C00]" : "bg-gray-200"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <span
          className={`
            inline-block h-6 w-6 transform rounded-full bg-white shadow-md
            transition-transform duration-200 ease-in-out
            ${checked ? "translate-x-[32px]" : "translate-x-1"}
          `}
        />
      </button>
      {label && (
        <label
          className="text-base text-[#262D3B] cursor-pointer"
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
        </label>
      )}
    </div>
  );
};
