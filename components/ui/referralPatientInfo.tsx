"use client";

import Image from "next/image";

export interface ReferralPatientInfoItem {
    label: string;
    value: string;
}

interface ReferralPatientInfoCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    items: ReferralPatientInfoItem[];
    className?: string;
}

export function ReferralPatientInfoCard({
    title = "Referral Detail",
    iconSrc = "/icons/Referral.svg",
    iconAlt = "Referral Detail",
    items,
    className = "",
}: ReferralPatientInfoCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter text-base font-semibold leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>
            <div className="Room-content mt-5">
                <div className="overflow-hidden rounded-lg border border-[#EBECED] bg-white">
                    {items.map((item, index) => (
                        <div
                            key={item.label}
                            className={`flex items-center justify-between gap-3 px-5 py-[14px] ${
                                index < items.length - 1 ? "border-b border-[#EBECED]" : ""
                            }`}
                        >
                            <span className="font-inter text-sm font-normal leading-[120%] text-[#525763]">
                                {item.label}
                            </span>
                            <span className="font-inter text-right text-sm font-semibold leading-[120%] text-[#434956]">
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
