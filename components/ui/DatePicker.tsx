"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type DatePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  background?: "normal" | "white";
  width?: number | string;
  minDate?: string; // Minimum selectable date (YYYY-MM-DD format). If not provided, defaults to today
  maxDate?: string; // Maximum selectable date (YYYY-MM-DD format)
  disablePastDates?: boolean; // If true, sets min date to today
  error?: string;
};

const normalizeSize = (value: number | string | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
};

export const DatePicker = ({
  value,
  onChange,
  onBlur,
  placeholder = "Choose date",
  label,
  required = false,
  background = "normal",
  width = 300,
  minDate,
  maxDate,
  disablePastDates = false,
  error,
}: DatePickerProps) => {
  const [selectedDate, setSelectedDate] = useState(value || "");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    setSelectedDate(value || "");
  }, [value]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSelectedDate(newValue);
    onChange?.(newValue);
  };

  // Convert date string to YYYY-MM-DD format for input
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return "";
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Try to parse common date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    return "";
  };

  // Get today's date in YYYY-MM-DD format for minimum date
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Determine the minimum date
  const getMinDate = () => {
    if (minDate) return minDate;
    if (disablePastDates) return getTodayDate();
    return undefined;
  };

  // Determine the maximum date
  const getMaxDate = () => {
    if (maxDate) return maxDate;
    return undefined;
  };

  return (
    <>
      <style jsx global>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none !important;
          -webkit-appearance: none !important;
          opacity: 0 !important;
          position: absolute !important;
          right: -9999px !important;
          pointer-events: none !important;
        }
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-clear-button {
          display: none !important;
          -webkit-appearance: none !important;
        }
        input[type="date"] {
          -webkit-appearance: none;
        }
        input[type="date"]::-moz-calendar-picker-indicator {
          display: none !important;
        }
        /* Hide the native date placeholder (dd/mm/yyyy) when empty and focused */
        input[type="date"]:invalid::-webkit-datetime-edit {
          color: transparent !important;
        }
        input[type="date"]:invalid::-webkit-datetime-edit-fields-wrapper {
          color: transparent !important;
        }
        input[type="date"]:invalid::-webkit-datetime-edit-text {
          color: transparent !important;
        }
        input[type="date"]:invalid::-webkit-datetime-edit-month-field {
          color: transparent !important;
        }
        input[type="date"]:invalid::-webkit-datetime-edit-day-field {
          color: transparent !important;
        }
        input[type="date"]:invalid::-webkit-datetime-edit-year-field {
          color: transparent !important;
        }
        input[type="date"]:not([value]):focus::-webkit-datetime-edit {
          color: transparent !important;
        }
        input[type="date"]:not([value]):focus::-webkit-datetime-edit-fields-wrapper {
          color: transparent !important;
        }
        input[type="date"]:not([value]):focus::-webkit-datetime-edit-text {
          color: transparent !important;
        }
        input[type="date"]:not([value]):focus::-webkit-datetime-edit-month-field {
          color: transparent !important;
        }
        input[type="date"]:not([value]):focus::-webkit-datetime-edit-day-field {
          color: transparent !important;
        }
        input[type="date"]:not([value]):focus::-webkit-datetime-edit-year-field {
          color: transparent !important;
        }
        input[type="date"]:not([value])::-webkit-datetime-edit {
          color: transparent !important;
        }
        input[type="date"]:not([value])::-webkit-datetime-edit-fields-wrapper {
          color: transparent !important;
        }
        /* Hide selection backgrounds */
        input[type="date"]::-webkit-datetime-edit-fields-wrapper {
          background: transparent !important;
        }
        input[type="date"]::-webkit-datetime-edit {
          background: transparent !important;
        }
        input[type="date"]::-webkit-datetime-edit-month-field:focus {
          background: transparent !important;
          color: transparent !important;
        }
        input[type="date"]::-webkit-datetime-edit-day-field:focus {
          background: transparent !important;
          color: transparent !important;
        }
        input[type="date"]::-webkit-datetime-edit-year-field:focus {
          background: transparent !important;
          color: transparent !important;
        }
        input[type="date"] {
          caret-color: transparent !important;
        }
        /* Prevent text selection in date input */
        input[type="date"]::selection {
          background: transparent !important;
        }
        input[type="date"]::-moz-selection {
          background: transparent !important;
        }
        input[type="date"] {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        input[type="date"]::-webkit-datetime-edit-fields-wrapper {
          user-select: none !important;
        }
        input[type="date"]::-webkit-datetime-edit {
          user-select: none !important;
        }
      `}</style>
      <div className="inline-flex flex-col gap-2" style={{ width: normalizeSize(width) || "100%" }}>
        <div className={`group relative inline-flex w-full ${error ? "ring-1 ring-[#F87171] rounded-[32px]" : ""}`}>
          {label && (
            <span className="pointer-events-none absolute left-6 top-0 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
              {label}
              {required && <span className="text-[#F6776E]"> *</span>}
            </span>
          )}
          <input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={handleDateChange}
            min={getMinDate()}
            max={getMaxDate()}
            className={`h-11 w-full cursor-pointer rounded-[32px] border border-[#EBECED] ${background === "white" ? "bg-white" : "bg-[#0B8C000D]"} px-6 pr-12 text-sm font-medium leading-[120%] text-[#262D3B] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 ${!selectedDate ? "text-transparent" : "text-[#262D3B]"}`}
            required={required}
            onSelect={(e) => {
              // Prevent text selection in the date input
              e.preventDefault();
            }}
            onKeyDown={(e) => {
              // Handle Tab key to skip internal date field navigation (day, month, year)
              // This prevents needing to press Tab 3 times to move to next field
              if (e.key === 'Tab') {
                // Get all focusable elements in the document
                const focusableSelectors = [
                  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
                  'select:not([disabled]):not([tabindex="-1"])',
                  'textarea:not([disabled]):not([tabindex="-1"])',
                  'button:not([disabled]):not([tabindex="-1"])',
                  'a[href]:not([tabindex="-1"])',
                  '[tabindex]:not([tabindex="-1"])'
                ].join(', ');
                
                const focusableElements = Array.from(
                  document.querySelectorAll<HTMLElement>(focusableSelectors)
                ).filter(el => {
                  const style = window.getComputedStyle(el);
                  return style.display !== 'none' && style.visibility !== 'hidden';
                });
                
                const currentIndex = focusableElements.indexOf(e.currentTarget);
                
                if (currentIndex !== -1) {
                  if (!e.shiftKey && currentIndex < focusableElements.length - 1) {
                    // Tab forward - skip to next field
                    e.preventDefault();
                    e.stopPropagation();
                    focusableElements[currentIndex + 1]?.focus();
                  } else if (e.shiftKey && currentIndex > 0) {
                    // Shift+Tab backward - skip to previous field
                    e.preventDefault();
                    e.stopPropagation();
                    focusableElements[currentIndex - 1]?.focus();
                  }
                }
              }
            }}
            onClick={(e) => {
              // Toggle the date picker: open if closed, close if open
              if (isPickerOpen) {
                // Close the picker by blurring the input
                e.currentTarget.blur();
                setIsPickerOpen(false);
              } else {
                // Open the picker - wrap in try-catch to handle browser restrictions
                try {
                  if (e.currentTarget.showPicker && typeof e.currentTarget.showPicker === 'function') {
                    e.currentTarget.showPicker();
                    setIsPickerOpen(true);
                  }
                } catch (error) {
                  // If showPicker fails (requires user gesture), just focus the input
                  // The native date picker will open on focus
                  e.currentTarget.focus();
                  setIsPickerOpen(true);
                }
              }
            }}
            onBlur={() => {
              // Reset the picker state when input loses focus
              setTimeout(() => {
                setIsPickerOpen(false);
              }, 200);
              // Call the onBlur callback for validation
              onBlur?.();
            }}
          />
          {!selectedDate && placeholder && (
            <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-sm font-medium text-[#9CA3AF]">
              {placeholder}
            </div>
          )}
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center">
            <div className="relative">
              <Image src="/icons/CalendarIconDark.svg" alt="Calendar" width={20} height={20} className="shrink-0" />
            </div>
          </div>
        </div>
        {error ? <span className="text-xs text-[#F87171]">{error}</span> : null}
      </div>
    </>
  );
};

