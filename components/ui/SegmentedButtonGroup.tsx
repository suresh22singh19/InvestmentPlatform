"use client";

import React from "react";

interface SegmentedButtonOption<T extends string> {
    label: string;
    value: T;
}

interface SegmentedButtonGroupProps<T extends string> {
    options: SegmentedButtonOption<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
    buttonClassName?: string;
}

export function SegmentedButtonGroup<T extends string>({
    options,
    value,
    onChange,
    className = "",
    buttonClassName = "",
}: SegmentedButtonGroupProps<T>) {
    return (
        <div
            className={`
        inline-flex w-full items-center justify-between gap-4
        rounded-[16px]
        ${className}
      `}
        >
            {options.map((option) => {
                const isActive = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={`
              flex-1 h-[49px] rounded-[16px] px-5 text-base font-medium
              transition-all duration-200 focus:outline-none border
              ${isActive
                                ? "bg-[#0B8C00] text-white border-[#0B8C00] shadow-[0px_12px_32px_rgba(11,140,0,0.18)]"
                                : "bg-white text-[#434956] border-[#EBECED] hover:bg-[#F5FBF5]"
                            }
              ${buttonClassName}
            `}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}


