"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  width?: string;
  height?: string;
  fontsize?: string;
  transform?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
  width,
  height,
  fontsize,
  transform
}) => {
  return (
    <div className={`flex items-center gap-3`}>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-7 w-[52px] items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none ${className}
          ${checked ? "bg-gradient-to-r from-amber-400 to-yellow-500 shadow-md shadow-amber-500/20" : "bg-slate-800 border border-slate-700"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <span
          className={`
            inline-block ${height ? height : "h-5" } ${width ? width : "w-5" } transform rounded-full bg-slate-950 shadow-md
            transition-transform duration-200 ease-in-out ${transform}
            ${checked ? "translate-x-[27px] bg-slate-950" : "translate-x-1 bg-slate-400"}
          `}
        />
      </button>
      {label && (
        <label
          className={`text-sm font-semibold text-slate-200 cursor-pointer select-none hover:text-white transition-colors ${fontsize ? fontsize : ""}`}
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
        </label>
      )}
    </div>
  );
};