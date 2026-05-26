"use client";

import React from "react";

interface SegmentedToggleOption<T extends string> {
    label: string;
    value: T;
}

interface SegmentedToggleProps<T extends string> {
    options: SegmentedToggleOption<T>[];
    value: T;
    onChange: (value: T) => void;
    width?: string | number; // e.g., "340px", 340, "w-[340px]", "w-full"
}

export function SegmentedToggle<T extends string>({
    options,
    value,
    onChange,
    width = "w-fit",
}: SegmentedToggleProps<T>) {
    const isTailwindWidth = typeof width === "string" && (width.startsWith("w-") || width.startsWith("max-w-"));
    const inlineStyle = !isTailwindWidth
        ? { width: typeof width === "number" ? `${width}px` : width }
        : undefined;
    const widthClass = isTailwindWidth ? width : "";

    return (
        <div
            className={`flex p-1 rounded-full ${widthClass} border border-[#DFE0E2] select-none`}
            style={inlineStyle}
        >
            {options.map((option) => {
                const isActive = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={`flex-1 px-6 py-2 rounded-full text-xs font-extrabold transition-all duration-200 ${isActive
                                ? "bg-[#0B8C00] text-white shadow-sm"
                                : "text-[#434956] hover:bg-gray-100"
                            }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
