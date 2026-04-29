"use client";

import Image from "next/image";

export interface PatientFullHistoryFieldItem {
    id: string;
    label: string;
    value: string;
}

interface PatientFullHistoryCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    sectionTitle?: string;
    items: PatientFullHistoryFieldItem[];
    className?: string;
}

export function PatientFullHistoryCard({
    title = "Patient Full History",
    iconSrc = "/icons/Bedicon.svg",
    iconAlt = "Appointment",
    sectionTitle = "Chief Complaints",
    items,
    className = "",
}: PatientFullHistoryCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 ">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>
            <div className="Room-content mt-5">
                <div className="mb-4">
                    <h5 className="font-inter font-medium text-[16px] leading-[120%] text-[#262D3B] mb-3">{sectionTitle}</h5>
                    <div className="grid grid-cols-2 gap-5">
                        {items.map((item) => (
                            <div key={item.id}>
                                <label
                                    htmlFor={item.id}
                                    className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]"
                                >
                                    {item.label}
                                </label>
                                <div
                                    id={item.id}
                                    className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg"
                                >
                                    <h5 className="font-medium text-[14px] leading-[120%] text-[#262D3B]">{item.value}</h5>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
