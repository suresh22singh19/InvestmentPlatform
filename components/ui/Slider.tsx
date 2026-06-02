"use client";

import React from "react";

interface SliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
}

export function Slider({ label, value, onChange }: SliderProps) {
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
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-[6px] rounded-full appearance-none cursor-pointer outline-none transition-all duration-150 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0B8C00] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0px_1px_3px_rgba(0,0,0,0.3)] [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0B8C00] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-[0px_1px_3px_rgba(0,0,0,0.3)]"
                style={{
                    background: `linear-gradient(to right, #0B8C00 0%, #0B8C00 ${value}%, #EBECED ${value}%, #EBECED 100%)`
                }}
            />
        </div>
    );
}
