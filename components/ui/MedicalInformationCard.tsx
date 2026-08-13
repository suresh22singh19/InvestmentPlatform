"use client";

import Image from "next/image";
import { Tooltip } from "./Tooltip";

export interface MedicalInformationItem {
    label: string;
    value: string;
    multiline?: boolean;
    remark?: string;
}

interface MedicalInformationCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    items: MedicalInformationItem[];
    className?: string;
}

const truncateText = (text: string, maxLength: number = 45) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
};

export function MedicalInformationCard({
    title = "Medical Information",
    iconSrc = "/icons/medicalIcon.svg",
    iconAlt = "Medical Icon",
    items,
    className = "",
}: MedicalInformationCardProps) {

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 ">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>
            <div className="Room-content mt-5">
                <div className="bg-white mb-4 border border-[#EBECED]">
                    {items.map((item) => {
                        let displayValue = item.value;
                        if (item.label.toLowerCase() === "blood group") {
                            displayValue = item.value.toUpperCase();
                        } else if (item.label.toLowerCase() === "addiction" && item.value && item.value.trim().length > 0) {
                            displayValue = item.value
                                .split(",")
                                .map(part => {
                                    const trimmedPart = part.trim();
                                    if (trimmedPart.length === 0) return "";
                                    return trimmedPart.charAt(0).toUpperCase() + trimmedPart.slice(1);
                                })
                                .filter(Boolean)
                                .join(", ");
                        } else if (item.value && item.value.trim().length > 0) {
                            const trimmed = item.value.trim();
                            displayValue = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                        }
                        return (
                            <div
                                key={item.label}
                                className={`px-[20px] py-[18px] border-b border-[#EBECED] ${item.multiline || item.remark ? "flex justify-between gap-1 flex-col" : "flex justify-between"}`}
                            >
                                {item.remark ? (
                                    <>
                                        <div className="flex justify-between items-center w-full">
                                            <span className="font-inter text-[14px] leading-[120%] font-normal text-[#525763]">
                                                {item.label}
                                            </span>
                                            <span className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] text-right">
                                                {displayValue}
                                            </span>
                                        </div>
                                        {item.remark.length > 45 ? (
                                            <Tooltip content={item.remark} position="top" delay={0}>
                                                <span className="font-inter text-[13px] leading-[130%] font-normal text-[#7B8089] mt-1 text-left cursor-pointer hover:text-[#0B8C00] transition-colors break-all">
                                                    {truncateText(item.remark, 45)}
                                                </span>
                                            </Tooltip>
                                        ) : (
                                            <span className="font-inter text-[13px] leading-[130%] font-normal text-[#7B8089] mt-1 text-left break-words">
                                                {item.remark}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="font-inter text-[14px] leading-[120%] font-normal text-[#525763]">
                                            {item.label}
                                        </span>
                                        {item.multiline && displayValue && displayValue.length > 20 ? (
                                            <Tooltip content={displayValue} position="top" delay={0}>
                                                <span
                                                    className="font-inter text-[14px] leading-[120%] font-medium text-[#434956] text-left cursor-pointer hover:text-[#0B8C00] transition-colors break-all"
                                                >
                                                    {truncateText(displayValue, 40)}
                                                </span>
                                            </Tooltip>
                                        ) : (
                                            <span
                                                className={`font-inter text-[14px] leading-[120%] font-medium text-[#434956] ${item.multiline ? "text-left break-words mt-1" : "text-right"}`}
                                            >
                                                {displayValue}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
