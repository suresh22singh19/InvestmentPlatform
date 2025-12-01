"use client";

import { forwardRef } from "react";
import Image from "next/image";

type SearchBarProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
};

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, placeholder = "Search", onChange, onSubmit, className }, ref) => {

    return (
      <div
        className={`flex h-[44px] items-center gap-2.5 rounded-[32px] bg-white pl-5 pr-2 py-[6px] shadow-[0px_15px_30px_rgba(34,56,43,0.08)] ${className ?? ""}`}
      >
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={
            onChange
              ? (event) => {
                  onChange(event.target.value);
                }
              : undefined
          }
          placeholder={placeholder}
          className="flex-1 border-0 bg-transparent text-sm font-medium text-[#434956] placeholder:text-[#8A8F9B] focus:outline-none"
        />

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B8C00] transition hover:bg-[#0A7A00]"
          onClick={onSubmit}
          aria-label="Search"
        >
          <Image src="/icons/Search.svg" alt="Search" width={16} height={16} />
        </button>
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";


