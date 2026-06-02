"use client";

import Image from "next/image";

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
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2">
                    <Image src={titleIconSrc} alt={titleIconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>

            <div className="data mt-5">
                <div>
                    <h4 className="font-semibold text-2xl leading-[120%] text-[#262D3B]">{name}</h4>
                    <p className="mt-1 font-normal text-sm leading-[120%] text-[#434956] font-[Inter]">{subtitle}</p>
                    {badges.length > 0 && (
                        <div className="mt-3">
                            {badges.map((badge) => (
                                <span key={badge.label} className={badge.className}>
                                    {badge.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                    {infoItems.map((item) => (
                        <div key={item.label} className="flex gap-3 items-center ">
                            <div className="flex items-center justify-center w-[40px] h-[40px] bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-full shrink-0">
                                <Image src={item.iconSrc} alt={item.iconAlt} width={20} height={20} />
                            </div>
                            <div>
                                <h4 className="not-italic font-medium text-[12px] leading-[120%] text-[#434956]">{item.label}</h4>
                                <h2 className="not-italic font-medium text-[14px] leading-[120%] text-[#262D3B]">{item.value}</h2>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
