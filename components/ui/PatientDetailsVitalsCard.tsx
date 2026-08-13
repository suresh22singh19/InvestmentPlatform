"use client";

import Image from "next/image";
import { Tooltip } from "./Tooltip";
import type { PatientDetailsBadge, PatientDetailsInfoItem } from "./PatientDetailsCard";
import type { VitalItem } from "./VitalsCard";

export interface PatientDetailsVitalsCardProps {
    title?: string;
    titleIconSrc?: string;
    titleIconAlt?: string;
    name: string;
    subtitle: string;
    badges?: PatientDetailsBadge[];
    infoItems: PatientDetailsInfoItem[];
    vitalsItems: VitalItem[];
    className?: string;
}

export function PatientDetailsVitalsCard({
    title = "Patient Details",
    titleIconSrc = "/icons/patientinfo.svg",
    titleIconAlt = "Patient Details",
    name,
    subtitle,
    badges = [],
    infoItems = [],
    vitalsItems = [],
    className = "",
}: PatientDetailsVitalsCardProps) {
    const isBloodGroup = (label: string) => {
        const clean = label.trim().toUpperCase();
        return [
            "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
            "A-POSITIVE", "B-POSITIVE", "AB-POSITIVE", "O-POSITIVE",
            "A-NEGATIVE", "B-NEGATIVE", "AB-NEGATIVE", "O-NEGATIVE"
        ].includes(clean);
    };

    const filteredBadges = badges.filter((badge) => !isBloodGroup(badge.label));

    return (
        <div className={`w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left Section: Patient Details */}
                <div className="lg:col-span-6 lg:border-r lg:border-[#EAEBEC] lg:pr-5 flex flex-col justify-between h-full">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(11,140,0,0.08)]">
                            <Image src={titleIconSrc} alt={titleIconAlt} width={16} height={16} />
                        </div>
                        <h2 className="font-inter font-medium text-sm leading-[120%] text-[#262D3B]">{title}</h2>
                    </div>

                    {/* Name & Badges */}
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <Tooltip content={<div className="max-w-[400px] whitespace-pre-wrap">{name}</div>} position="top" delay={0}>
                                <h4 className="font-bold text-2xl leading-[120%] text-[#262D3B] max-w-[360px] truncate cursor-pointer hover:text-[#0B8C00] transition-colors">
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
                        <p className="mt-1.5 font-normal text-xs leading-[120%] text-[#7B8089] font-[Inter]">{subtitle}</p>
                    </div>

                    {/* Info Items */}
                    {infoItems.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            {infoItems.map((item) => {
                                const isAddress = item.label.toLowerCase() === "address";
                                const isFatherName = item.label.toLowerCase().includes("father");
                                const isCommunicable = item.label.toLowerCase().includes("communicable");
                                const useTooltip = isAddress || isFatherName || isCommunicable;
                                return (
                                    <div key={item.label} className="flex gap-3 items-center min-w-0">
                                        <div className="flex items-center justify-center w-[38px] h-[38px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full shrink-0">
                                            <Image src={item.iconSrc} alt={item.iconAlt} width={18} height={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="not-italic font-medium text-[11px] leading-[120%] text-[#7B8089]">{item.label}</h4>
                                            {useTooltip ? (
                                                <Tooltip content={<div className="max-w-[280px] whitespace-pre-wrap">{item.value}</div>} position="top">
                                                    <h2 className="not-italic font-semibold text-[13px] leading-[120%] text-[#262D3B] truncate cursor-pointer hover:text-[#0B8C00] transition-colors">
                                                        {item.value}
                                                    </h2>
                                                </Tooltip>
                                            ) : (
                                                <h2 className="not-italic font-semibold text-[13px] leading-[120%] text-[#262D3B] truncate">
                                                    {item.value}
                                                </h2>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Section: Vitals Grid */}
                <div className="lg:col-span-6 lg:pl-1">
                    {vitalsItems.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                            {vitalsItems.map((item) => (
                                <div key={item.label} className="rounded-xl border border-[#EBECED] bg-white px-4 py-3.5 shadow-none flex flex-col justify-between">
                                    <div className="flex items-center gap-2 font-medium text-xs leading-[120%] text-[#434956]">
                                        <span className="w-2 h-2 rotate-45 bg-[#0284C7] inline-block shrink-0"></span>
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                    <div className="mt-2 font-inter text-[18px] sm:text-[20px] leading-[120%] font-semibold text-[#262D3B]">
                                        {item.value} {item.unit ? <span className="font-normal text-xs text-[#434956]">{item.unit}</span> : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
