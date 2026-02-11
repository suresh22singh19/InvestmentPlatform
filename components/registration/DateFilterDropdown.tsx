"use client";

import { useState, useEffect } from "react";
import { DatePicker } from "../ui/DatePicker";

interface DateFilterDropdownProps {
    onFilter?: (fromDate: string, toDate: string) => void;
    onClear?: () => void;
    initialFromDate?: string;
    initialToDate?: string;
}

export default function DateFilterDropdown({ onFilter, onClear, initialFromDate = "", initialToDate = "" }: DateFilterDropdownProps) {
    const [fromDate, setFromDate] = useState<string>(initialFromDate);
    const [toDate, setToDate] = useState<string>(initialToDate);

    // Update internal state when initial values change
    useEffect(() => {
        setFromDate(initialFromDate);
        setToDate(initialToDate);
    }, [initialFromDate, initialToDate]);

    const handleFilter = () => {
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
                        onChange={setFromDate}
                        required={false}
                        background="white"
                        width="100%"
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
                    />
                </div>
            </div>

            <button
                onClick={handleFilter}
                className="w-full h-9 bg-[#0B8C00] rounded-[32px] px-6 py-3 flex items-center justify-center gap-2 font-inter font-medium text-sm leading-[120%] text-white cursor-pointer hover:opacity-90 transition-opacity"
            >
                Apply
            </button>
        </div>
    );
}

