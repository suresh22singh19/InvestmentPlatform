"use client";

import Image from "next/image";

export interface MedicalInformationItem {
    label: string;
    value: string;
    multiline?: boolean;
}

interface MedicalInformationCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    items: MedicalInformationItem[];
    className?: string;
}

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
                <div>
                    <div className="bg-white mb-4 border border-[#EBECED]">
                        {items.map((item) => (
                            <div
                                key={item.label}
                                className={`px-[20px] py-[18px] border-b border-[#EBECED] ${item.multiline ? "flex justify-between gap-3 flex-col" : "flex justify-between"}`}
                            >
                                <span className="font-inter text-[14px] leading-[120%] font-normal text-[#525763]">
                                    {item.label}
                                </span>
                                <span
                                    className={`font-inter text-[14px] leading-[120%] font-medium text-[#434956] ${item.multiline ? "" : "text-right"}`}
                                >
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
