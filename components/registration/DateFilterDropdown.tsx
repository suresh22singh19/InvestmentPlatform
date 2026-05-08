"use client";

import { useState, useEffect } from "react";
import { DatePicker } from "../ui/DatePicker";

interface DateFilterDropdownProps {
    onFilter?: (fromDate: string, toDate: string) => void;
    onClear?: () => void;
    initialFromDate?: string;
    initialToDate?: string;
}

const MAX_MONTHS = 3;

/** Add `months` months to a YYYY-MM-DD string, returns YYYY-MM-DD. */
const addMonths = (dateStr: string, months: number): string => {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
};

const getTodayYmd = (): string => new Date().toISOString().slice(0, 10);

const minYmd = (a: string, b: string): string => (a <= b ? a : b);

export default function DateFilterDropdown({ onFilter, onClear, initialFromDate = "", initialToDate = "" }: DateFilterDropdownProps) {
    const [fromDate, setFromDate] = useState<string>(initialFromDate);
    const [toDate, setToDate] = useState<string>(initialToDate);
    const todayYmd = getTodayYmd();

    const maxToDate = fromDate ? addMonths(fromDate, MAX_MONTHS) : undefined;
    const toDateMax = maxToDate ? minYmd(maxToDate, todayYmd) : todayYmd;
    const isInvalidDateRange = !!(fromDate && toDate && toDate < fromDate);
    const isExceedsMaxRange = !!(fromDate && toDate && toDate > toDateMax);
    const isDisabled = isInvalidDateRange || isExceedsMaxRange;

    // Update internal state when initial values change
    useEffect(() => {
        setFromDate(initialFromDate);
        setToDate(initialToDate);
    }, [initialFromDate, initialToDate]);

    const handleFromDateChange = (value: string) => {
        setFromDate(value);
        // If existing toDate would now exceed the 3-month cap, clear it
        if (value && toDate && toDate > addMonths(value, MAX_MONTHS)) {
            setToDate("");
        }
    };

    const handleFilter = () => {
        if (isDisabled) return;
        if (onFilter) {
            onFilter(fromDate, toDate);
        }
    };

    const handleClear = () => {
        setFromDate("");
        setToDate("");
        if (onClear) {
            onClear();
        }
    };

    return (
        <div className="w-[235px] bg-white border border-[#EAECF0] rounded-[8px] shadow-lg pt-3 pr-2 pb-3 pl-2 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 px-2 border-b border-[#F2F4F7]">
                <h3 className="font-inter font-semibold text-xs leading-[18px] text-[#344054]">Date Filter</h3>
                <button
                    onClick={handleClear}
                    className="font-lato font-medium text-xs leading-[150%] text-[#0B8C00] cursor-pointer hover:opacity-80"
                >
                    Clear
                </button>
            </div>

            <div className="flex flex-col gap-4">
                <div className="w-full">
                    <DatePicker
                        label="From Date"
                        placeholder="DD/MM/YY"
                        value={fromDate}
                        onChange={handleFromDateChange}
                        required={false}
                        background="white"
                        width="100%"
                        maxDate={todayYmd}
                    />
                </div>

                <div className="w-full">
                    <DatePicker
                        label="To Date"
                        placeholder="DD/MM/YY"
                        value={toDate}
                        onChange={setToDate}
                        required={true}
                        background="white"
                        width="100%"
                        minDate={fromDate || undefined}
                        maxDate={toDateMax}
                    />
                </div>
            </div>

            {isExceedsMaxRange && (
                <p className="text-xs text-[#DC2626] px-1 -mt-2">
                    Date range cannot exceed 3 months.
                </p>
            )}

            <button
                onClick={handleFilter}
                disabled={isDisabled}
                className={`w-full h-9 rounded-[32px] px-6 py-3 flex items-center justify-center gap-2 font-inter font-medium text-sm leading-[120%] text-white transition-opacity ${
                    isDisabled
                        ? "bg-[#98A2B3] cursor-not-allowed"
                        : "bg-[#0B8C00] cursor-pointer hover:opacity-90"
                }`}
            >
                Apply
            </button>
        </div>
    );
}

