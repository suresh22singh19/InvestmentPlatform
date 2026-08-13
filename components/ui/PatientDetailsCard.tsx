"use client";

import Image from "next/image";
import { Tooltip } from "./Tooltip";

export interface PatientDetailsBadge {
    label: string;
    className: string;
}

export interface PatientDetailsInfoItem {
    iconSrc: string;
    iconAlt: string;
    label: string;
    value: string;
}

interface PatientDetailsCardProps {
    title?: string;
    titleIconSrc?: string;
    titleIconAlt?: string;
    name: string;
    subtitle: string;
    badges?: PatientDetailsBadge[];
    infoItems: PatientDetailsInfoItem[];
    className?: string;
}

export function PatientDetailsCard({
    title = "Patient Details",
    titleIconSrc = "/icons/patientinfo.svg",
    titleIconAlt = "Patient Details",
    name,
    subtitle,
    badges = [],
    infoItems,
    className = "",
}: PatientDetailsCardProps) {
    const isBloodGroup = (label: string) => {
        const clean = label.trim().toUpperCase();
        return ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "A-POSITIVE", "B-POSITIVE", "AB-POSITIVE", "O-POSITIVE", "A-NEGATIVE", "B-NEGATIVE", "AB-NEGATIVE", "O-NEGATIVE"].includes(clean);
    };

    const filteredBadges = badges.filter((badge) => !isBloodGroup(badge.label));

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-1 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2">
                    <Image src={titleIconSrc} alt={titleIconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>

            <div className="data mt-2">
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                        <Tooltip content={<div className="max-w-[400px] whitespace-pre-wrap">{name}</div>} position="top" delay={0}>
                            <h4 className="font-semibold text-2xl leading-[120%] text-[#262D3B] max-w-[400px] truncate cursor-pointer hover:text-[#0B8C00] transition-colors">
                                {name}
                            </h4>
                        </Tooltip>
                        {filteredBadges.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {filteredBadges.map((badge) => (
                                    <span key={badge.label} className={badge.className}>
                                        {badge.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="mt-2 font-normal text-sm leading-[120%] text-[#434956] font-[Inter]">{subtitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                    {infoItems.map((item) => {
                        const isAddress = item.label.toLowerCase() === "address";
                        const isFatherName = item.label.toLowerCase().includes("father");
                        const isCommunicable = item.label.toLowerCase().includes("communicable");
                        const useTooltip = isAddress || isFatherName || isCommunicable;
                        return (
                            <div key={item.label} className="flex gap-3 items-center min-w-0">
                                <div className="flex items-center justify-center w-[40px] h-[40px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full shrink-0">
                                    <Image src={item.iconSrc} alt={item.iconAlt} width={20} height={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="not-italic font-medium text-[12px] leading-[120%] text-[#434956]">{item.label}</h4>
                                    {useTooltip ? (
                                        <Tooltip content={<div className="max-w-[280px] whitespace-pre-wrap">{item.value}</div>} position="top">
                                            <h2 className="not-italic font-medium text-[14px] leading-[120%] text-[#262D3B] truncate cursor-pointer hover:text-[#0B8C00] transition-colors">
                                                {item.value}
                                            </h2>
                                        </Tooltip>
                                    ) : (
                                        <h2 className="not-italic font-medium text-[14px] leading-[120%] text-[#262D3B] truncate" >
                                            {item.value}
                                        </h2>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
