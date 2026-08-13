"use client";

import React from "react";

interface SliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    variant?: "default" | "onDark";
}

const SLIDER_VARIANTS = {
    default: {
        fill: "#0B8C00",
        track: "#EBECED",
        thumb:
            "[&::-webkit-slider-thumb]:bg-[#0B8C00] [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:bg-[#0B8C00] [&::-moz-range-thumb]:border-white",
    },
    onDark: {
        fill: "#FFFFFF",
        track: "rgba(255, 255, 255, 0.35)",
        thumb:
            "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[#0B8C00] [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-[#0B8C00]",
    },
} as const;

export function Slider({ label, value, onChange, disabled = false, variant = "default" }: SliderProps) {
    const colors = SLIDER_VARIANTS[variant];

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#7B8089]">
                <span>{label}</span>
                <span className="font-bold text-[#434956]">{value}%</span>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => !disabled && onChange(Number(e.target.value))}
                disabled={disabled}
                className={`w-full h-[6px] rounded-full appearance-none outline-none transition-all duration-150 ${disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:shadow-[0px_1px_3px_rgba(0,0,0,0.3)] [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:shadow-[0px_1px_3px_rgba(0,0,0,0.3)] ${colors.thumb}`}
                style={{
                    background: `linear-gradient(to right, ${colors.fill} 0%, ${colors.fill} ${value}%, ${colors.track} ${value}%, ${colors.track} 100%)`,
                }}
            />
        </div>
    );
}
