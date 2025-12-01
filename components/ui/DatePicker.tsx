"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type DatePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
};

export const DatePicker = ({
  value,
  onChange,
  placeholder = "Choose date",
  label,
  required = false,
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
      `}</style>
      <div className="inline-flex w-full flex-col gap-2">
        <div className="group relative inline-flex w-full">
          {label && (
            <span className="pointer-events-none absolute left-6 top-0 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
              {label}
              {required && <span className="text-[#F6776E]">*</span>}
            </span>
          )}
          <input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={handleDateChange}
            placeholder={placeholder}
            className="h-11 w-full cursor-pointer rounded-[32px] border border-[#DFE0E2] bg-white px-6 pr-12 text-sm font-medium leading-[120%] text-[#262D3B] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
            required={required}
            onClick={(e) => {
              // Toggle the date picker: open if closed, close if open
              if (isPickerOpen) {
                // Close the picker by blurring the input
                e.currentTarget.blur();
                setIsPickerOpen(false);
              } else {
                // Open the picker
                if (e.currentTarget.showPicker) {
                  e.currentTarget.showPicker();
                  setIsPickerOpen(true);
                }
              }
            }}
            onBlur={() => {
              // Reset the picker state when input loses focus
              setTimeout(() => {
                setIsPickerOpen(false);
              }, 200);
            }}
          />
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center">
            <div className="relative">
              <Image src="/icons/CalendarIconDark.svg" alt="Calendar" width={20} height={20} className="shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

