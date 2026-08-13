"use client";

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

export interface SelectOption {
    label: string;
    value: string;
}

export interface FormInputSelectGroupProps {
    label?: string;
    hideLabel?: boolean;
    inputValue: string | number;
    inputPlaceholder?: string;
    onInputChange: (val: string) => void;
    selectValue: string;
    selectOptions: Array<SelectOption | string>;
    selectPlaceholder?: string;
    onSelectChange: (val: string) => void;
    disabled?: boolean;
    error?: string;
    width?: string | number;
    className?: string;
    background?: string;
    min?: number;
    max?: number;
}

const RadioTick = () => (
    <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B8C00] flex-shrink-0" />
);

export const FormInputSelectGroup: React.FC<FormInputSelectGroupProps> = ({
    label,
    hideLabel = false,
    inputValue,
    inputPlaceholder = "0",
    onInputChange,
    selectValue,
    selectOptions,
    selectPlaceholder = "Select",
    onSelectChange,
    disabled = false,
    error,
    width = "100%",
    className = "",
    background = "white",
    min = 1,
    max = 99,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<{
        top: number;
        left: number;
        width: number;
        placement: "bottom" | "top";
        maxHeight: number;
    } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Normalize select options
    const normalizedOptions: SelectOption[] = selectOptions.map((opt) =>
        typeof opt === "string" ? { label: opt, value: opt } : opt
    );

    const selectedOption = normalizedOptions.find((opt) => opt.value === selectValue);
    const selectLabel = selectedOption ? selectedOption.label : selectValue || selectPlaceholder;

    // Filter options based on search term
    const filteredOptions = searchTerm.trim()
        ? normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(searchTerm.trim().toLowerCase()))
        : normalizedOptions;

    const updateDropdownPosition = useCallback(() => {
        if (!containerRef.current) return;
        const triggerRect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const margin = 12;
        const offset = 6;
        const desiredWidth = Math.max(triggerRect.width, 160);

        const spaceBelow = viewportHeight - triggerRect.bottom - margin;
        const spaceAbove = triggerRect.top - margin;

        let placement: "bottom" | "top" = "bottom";
        if (spaceBelow < 220 && spaceAbove > spaceBelow) {
            placement = "top";
        }

        const availableSpace = placement === "bottom" ? spaceBelow : spaceAbove;
        const maxHeight = Math.min(320, Math.max(180, availableSpace));

        let left = triggerRect.left;
        if (left < margin) left = margin;
        if (left + desiredWidth > viewportWidth - margin) left = viewportWidth - desiredWidth - margin;

        const top = placement === "bottom"
            ? triggerRect.bottom + offset
            : triggerRect.top - offset;

        setDropdownStyle({
            top,
            left,
            width: desiredWidth,
            placement,
            maxHeight,
        });
    }, []);

    useLayoutEffect(() => {
        if (isOpen) {
            updateDropdownPosition();
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
        }
    }, [isOpen, updateDropdownPosition]);

    // Handle click outside to close dropdown & scroll/resize events
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                panelRef.current &&
                !panelRef.current.contains(target)
            ) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };

        const handleScrollOrResize = () => {
            updateDropdownPosition();
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("resize", handleScrollOrResize);
        window.addEventListener("scroll", handleScrollOrResize, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("resize", handleScrollOrResize);
            window.removeEventListener("scroll", handleScrollOrResize, true);
        };
    }, [isOpen, updateDropdownPosition]);

    // Filter input to accept numeric values only within [min, max] range (1 to 99)
    const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        if (val === "") {
            onInputChange("");
            return;
        }
        if (/^\d+$/.test(val)) {
            const num = parseInt(val, 10);
            if (!isNaN(num)) {
                if (num > max) {
                    onInputChange(String(max));
                } else if (num === 0) {
                    onInputChange("");
                } else {
                    onInputChange(String(num));
                }
            }
        }
    };

    return (
        <div className={`flex flex-col gap-1 ${className}`} style={{ width }}>
            {label && !hideLabel && (
                <label className="text-xs font-semibold text-[#7B8089] mb-0.5 block">
                    {label}
                </label>
            )}

            <div
                ref={containerRef}
                className={`relative flex items-center h-11 w-full rounded-full border transition-all ${
                    error
                        ? "border-[#EF4444] bg-[#FFF5F5]"
                        : disabled
                        ? "border-[#EBECED] cursor-not-allowed"
                        : "border-[#DFE7DF] hover:border-[#0B8C00]/40 focus-within:border-[#0B8C00] focus-within:ring-2 focus-within:ring-[#0B8C00]/20"
                }`}
                style={{
                    backgroundColor: background === "white" ? (disabled ? "#F9FAFB" : "#FFFFFF") : "#0B8C000D"
                }}
            >
                {/* Numeric Input Field (Left) */}
                <input
                    type="text"
                    inputMode="numeric"
                    value={inputValue === 0 || inputValue === "0" ? "" : inputValue}
                    onChange={handleNumberInputChange}
                    placeholder={inputPlaceholder}
                    disabled={disabled}
                    maxLength={String(max).length}
                    className="w-1/2 h-full pl-4 pr-2 text-xs font-medium text-[#262D3B] placeholder-gray-400 bg-transparent outline-none border-none rounded-l-full"
                />

                {/* Vertical Divider */}
                <div className="h-5 w-[1px] bg-[#E5E7EB] shrink-0" />

                {/* Select Dropdown Trigger (Right) */}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className="w-1/2 h-full px-3 flex items-center justify-between text-xs font-medium text-[#262D3B] bg-transparent rounded-r-full outline-none hover:bg-black/5 transition-colors cursor-pointer"
                >
                    <span className="truncate pr-1 text-left">{selectLabel}</span>
                    <svg
                        className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-[#0B8C00]" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Dropdown Options Portal (Matching FormSelectField style) */}
            {isOpen && !disabled && mounted && dropdownStyle &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={{
                            position: "fixed",
                            top: `${dropdownStyle.top}px`,
                            left: `${dropdownStyle.left}px`,
                            width: `${dropdownStyle.width}px`,
                            transform: dropdownStyle.placement === "top" ? "translateY(-100%)" : "none",
                            maxHeight: `${dropdownStyle.maxHeight}px`,
                            zIndex: 99999,
                        }}
                        className="flex flex-col rounded-[16px] border border-[#E6E8EC] bg-white shadow-[0px_28px_60px_rgba(47,72,61,0.16)] text-xs animate-in fade-in-50 duration-100 overflow-hidden"
                    >
                        <div className="flex flex-1 flex-col overflow-hidden px-4 py-4">
                            {/* Search Header */}
                            <div className="mb-3 space-y-2">
                                <span className="text-sm text-[#262D3B]">Search</span>
                                <label className="group mt-[5px] flex items-center gap-3 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 shadow-[0px_1px_2px_rgba(16,24,40,0.05)] transition-all duration-200 focus-within:border-[#0B8C00] focus-within:ring-2 focus-within:ring-[#0B8C00]/10">
                                    <Image
                                        src="/icons/searchdarkIcon.svg"
                                        alt="Search"
                                        width={16}
                                        height={16}
                                        className="h-4 w-4 shrink-0 text-[#98A2B3]"
                                    />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Type and search"
                                        className="w-full border-none bg-transparent text-sm font-medium text-[#262D3B] placeholder:text-[#98A2B3] focus:outline-none"
                                    />
                                </label>
                            </div>

                            {/* Options List */}
                            <div className="scrollbar-hidden flex-1 overflow-y-auto pr-0 max-h-52">
                                <div className="flex flex-col gap-0">
                                    {filteredOptions.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-[#9CA3AF]">
                                            No results found
                                        </div>
                                    ) : (
                                        filteredOptions.map((opt) => {
                                            const isSelected = opt.value === selectValue;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectChange(opt.value);
                                                        setIsOpen(false);
                                                        setSearchTerm("");
                                                    }}
                                                    className={`cursor-pointer flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-sm font-medium transition-colors ${
                                                        isSelected
                                                            ? "bg-[#0B8C00]/10 text-[#434956]"
                                                            : "text-[#434956] hover:bg-[#F7FAF7]"
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-3 min-w-0 flex-1">
                                                        <span
                                                            className={`relative inline-block shrink-0 h-5 w-5 rounded-full border-2 ${
                                                                isSelected ? "border-[#0B8C00]" : "border-[#B8BFC9]"
                                                            } bg-white`}
                                                            style={{ aspectRatio: "1 / 1" }}
                                                        >
                                                            {isSelected && <RadioTick />}
                                                        </span>
                                                        <span className="truncate text-left font-medium">{opt.label}</span>
                                                    </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {error && <span className="text-[11px] text-[#EF4444] font-medium pl-2">{error}</span>}
        </div>
    );
};
