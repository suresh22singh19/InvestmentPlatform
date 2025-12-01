"use client";

import Image from "next/image";
import { forwardRef } from "react";

type TableSearchInputProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export const TableSearchInput = forwardRef<HTMLInputElement, TableSearchInputProps>(
  ({ value, placeholder = "Search Here...", onChange, className = "" }, ref) => {
    return (
      <label className={`group flex h-11 w-[300px] items-center gap-2 rounded-[32px] border border-[#EBECED] bg-[#0B8C000D] px-4 transition-all duration-200 focus-within:border-[#0B8C00] focus-within:shadow-[0_0_0_2px_rgba(11,140,0,0.12)] ${className}`}>
        <Image
          src="/icons/searchdarkIcon.svg"
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 text-[#98A2B3]"
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          className="w-full border-none bg-transparent text-sm font-medium text-[#262D3B] placeholder:font-normal placeholder:text-[#7B8088] focus:outline-none"
        />
      </label>
    );
  }
);

TableSearchInput.displayName = "TableSearchInput";

