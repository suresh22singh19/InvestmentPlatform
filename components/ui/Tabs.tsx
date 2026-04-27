"use client";

import { useState } from "react";

type TabOption = {
  value: string;
  label: string;
};

type TabsProps = {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export const Tabs = ({ options, value, onChange, className = "", disabled = false }: TabsProps) => {
  return (
    <div
      className={`flex h-[41px] w-full items-center gap-[5px] rounded-[100px] border border-[#DFE0E2]  p-1 ${disabled ? "opacity-60" : ""} ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange(option.value);
            }}
            className={`text-nowrap flex h-[33px] flex-1 items-center justify-center rounded-[100px] px-4 text-sm font-medium leading-[120%] transition-colors disabled:cursor-not-allowed ${
              isActive
                ? "bg-[#0B8C00] text-white"
                : "bg-white text-[#434956] hover:bg-[#F2F8F2]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

