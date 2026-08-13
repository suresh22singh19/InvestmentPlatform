"use client";

import { useState } from "react";
import Image from "next/image";
import { Tabs } from "./Tabs";

export interface CommunicableDiseaseOption {
    value: string;
    label: string;
}

export interface CommunicableDiseaseCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    label?: string;
    options?: CommunicableDiseaseOption[];
    value?: string[] | string;
    defaultValue?: string[] | string;
    onChange?: (value: string[]) => void;
    className?: string;
    disabled?: boolean;
}

const DEFAULT_OPTIONS: CommunicableDiseaseOption[] = [
    { value: "hiv", label: "HIV" },
    { value: "hepatitis", label: "Hepatitis" },
    { value: "tb", label: "TB" },
    { value: "normal", label: "Normal" },
];

export function CommunicableDiseaseCard({
    title = "Communicable Disease",
    iconSrc = "/icons/DoctorBagIcon.svg",
    iconAlt = "Communicable Disease Icon",
    label = "Infectious Disease Alerts",
    options = DEFAULT_OPTIONS,
    value,
    defaultValue = [],
    onChange,
    className = "",
    disabled = false,
}: CommunicableDiseaseCardProps) {
    const [internalValue, setInternalValue] = useState<string[] | string>(defaultValue);

    const currentValue = value !== undefined ? value : internalValue;

    const handleChange = (newVal: string) => {
        let arr = newVal ? newVal.split(",").map(s => s.trim()).filter(Boolean) : [];
        const hasNormal = arr.some(v => v.toLowerCase() === "normal");
        const hasOthers = arr.some(v => v.toLowerCase() !== "normal");

        if (hasNormal && hasOthers) {
            const currentArr = (Array.isArray(currentValue)
                ? currentValue
                : typeof currentValue === "string"
                    ? currentValue.split(",")
                    : []
            ).map(v => v.trim().toLowerCase());

            const normalWasSelectedBefore = currentArr.includes("normal");

            if (normalWasSelectedBefore) {
                arr = arr.filter(v => v.toLowerCase() !== "normal");
            } else {
                arr = ["normal"];
            }
        }

        if (value === undefined) {
            setInternalValue(arr);
        }
        onChange?.(arr);
    };

    return (
        <div className={`w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col justify-start ${className}`}>
            <div>
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF7E8] shrink-0">
                        <Image src={iconSrc} alt={iconAlt} width={16} height={16} />
                    </div>
                    <h2 className="font-inter font-semibold text-sm leading-[120%] text-[#262D3B]">{title}</h2>
                </div>

                {/* Subtitle / Label */}
                {label && (
                    <p className="font-normal text-xs leading-[120%] text-[#7B8089] mb-2.5 font-[Inter]">
                        {label}
                    </p>
                )}

                {/* Pill Tabs Selector */}
                <div className="w-full">
                    <Tabs
                        options={options}
                        value={currentValue}
                        multiSelect={true}
                        onChange={handleChange}
                        disabled={disabled}
                        tabBorder={true}
                    />
                </div>
            </div>
        </div>
    );
}
