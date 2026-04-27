"use client";

import Image from "next/image";
import { forwardRef } from "react";

type TableSearchInputProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
  /** Shows the same green spinner as PersonalDetails contact field while loading */
  isLoading?: boolean;
  /**
   * When true (default), strips characters other than letters, digits, and spaces.
   * Set false for values that may include hyphens etc. (e.g. room numbers).
   */
  sanitize?: boolean;
};

export const TableSearchInput = forwardRef<HTMLInputElement, TableSearchInputProps>(
  (
    {
      value,
      placeholder = "Search Here...",
      onChange,
      className = "",
      isLoading = false,
      sanitize = true,
    },
    ref
  ) => {
    const sanitizeSearchValue = (input: string) =>
      sanitize ? input.replace(/[^a-zA-Z0-9\s]/g, "") : input;

    return (
      <label
        className={`group relative flex h-11 w-full items-center gap-2 rounded-[32px] border border-[#EBECED] bg-[#0B8C000D] px-4 transition-all duration-200 focus-within:border-[#0B8C00] focus-within:shadow-[0_0_0_2px_rgba(11,140,0,0.12)] ${className}`}
      >
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
          onChange={(event) => onChange?.(sanitizeSearchValue(event.target.value))}
          placeholder={placeholder}
          className={`w-full border-none bg-transparent text-sm font-medium text-[#262D3B] placeholder:font-normal placeholder:text-[#7B8088] focus:outline-none ${isLoading ? "pr-12" : ""}`}
        />
        {isLoading && (
          <div className="pointer-events-none absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
            <svg
              className="h-5 w-5 animate-spin text-[#0B8C00]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </label>
    );
  }
);

TableSearchInput.displayName = "TableSearchInput";

