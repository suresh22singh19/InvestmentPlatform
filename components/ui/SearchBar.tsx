"use client";

import { forwardRef } from "react";
import Image from "next/image";

type SearchBarProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  className?: string;
  error?: string;
  allowOnlyDigits?: boolean;
  allowLettersAndSpaces?: boolean; // Allow letters and spaces only (for patient name)
  maxLength?: number;
  disabled?: boolean;
  searchButtonDisabled?: boolean; // Separate prop to disable only the search button
  onAttemptInput?: () => void;
};

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, placeholder = "Search", onChange, onBlur, onSubmit, className, error, allowOnlyDigits = false, allowLettersAndSpaces = false, maxLength, disabled = false, searchButtonDisabled = false, onAttemptInput }, ref) => {
    // Filter value based on props
    const filterRegex = allowOnlyDigits 
      ? /[^\d]/g 
      : allowLettersAndSpaces 
      ? /[^a-zA-Z\s]/g 
      : /[^a-zA-Z0-9]/g;
    const filteredValue = value !== undefined ? value.replace(filterRegex, '') : undefined;
    const isControlled = value !== undefined;

    const applyMaxLength = (text: string): string => {
      if (maxLength !== undefined && text.length > maxLength) {
        return text.slice(0, maxLength);
      }
      return text;
    };

    const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
      if (disabled) {
        event.preventDefault();
        onAttemptInput?.();
        return;
      }
      const target = event.currentTarget;
      let filteredValue = target.value.replace(filterRegex, '');
      filteredValue = applyMaxLength(filteredValue);
      
      // For uncontrolled components, update the DOM directly
      if (!isControlled && target.value !== filteredValue) {
        target.value = filteredValue;
      }
      
      if (onChange) {
        onChange(filteredValue);
      }
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        // Remove spaces and special characters, allow only digits or alphanumeric based on prop
        let filteredValue = event.target.value.replace(filterRegex, '');
        filteredValue = applyMaxLength(filteredValue);
        // Always call onChange to trigger validation, even when disabled
        onChange(filteredValue);
      }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled) {
        event.preventDefault();
        onAttemptInput?.();
        return;
      }
      event.preventDefault();
      const pastedText = event.clipboardData.getData('text');
      let filteredText = pastedText.replace(filterRegex, '');
      filteredText = applyMaxLength(filteredText);
      
      // For uncontrolled components, update the DOM directly
      if (!isControlled && event.currentTarget) {
        event.currentTarget.value = filteredText;
      }
      
      if (onChange) {
        onChange(filteredText);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) {
        // Allow navigation keys (arrow keys, backspace, delete, etc.)
        const allowedKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', 'Delete', 'Tab', 'Enter', 'Escape'];
        if (!allowedKeys.includes(event.key) && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onAttemptInput?.();
        }
        return;
      }
      
      // Handle Enter key to trigger search
      if (event.key === 'Enter' && onSubmit) {
        event.preventDefault();
        onSubmit();
      }
    };

    return (
      <div className="flex flex-col w-full">
        <div
          className={`flex h-[44px] items-center gap-2.5 rounded-[32px] bg-white pl-5 pr-2 py-[6px] border ${error ? "border-[#F87171]" : "border-[#EBECED]"} ${className ?? ""}`}
        >
          <input
            ref={ref}
            type="search"
            {...(isControlled ? { value: filteredValue } : {})}
            {...(maxLength !== undefined ? { maxLength } : {})}
            onInput={handleInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="flex-1 border-0 bg-transparent text-sm font-medium text-[#434956] placeholder:text-[#8A8F9B] focus:outline-none"
          />

          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#0B8C00] transition ${
              searchButtonDisabled 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-[#0A7A00]"
            }`}
            onClick={onSubmit}
            disabled={searchButtonDisabled}
            aria-label="Search"
          >
            <Image src="/icons/Search.svg" alt="Search" width={16} height={16} />
          </button>
        </div>
        {error ? <span className="text-xs text-[#F87171] mt-1">{error}</span> : null}
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";


