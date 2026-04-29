"use client";

import Image from "next/image";

export interface NutritionalAssessmentItem {
    id: string;
    label: string;
    status: string;
    remarks: string;
}

interface NutritionalAssessmentCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    items: NutritionalAssessmentItem[];
    className?: string;
}

export function NutritionalAssessmentCard({
    title = "Nutritional Assessment",
    iconSrc = "/icons/Bedicon.svg",
    iconAlt = "Appointment",
    items,
    className = "",
}: NutritionalAssessmentCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 ">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>
            <div className="Room-content mt-5">
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
                                <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">
                                    Status: <span className="text-[#262D3B]">{item.status}</span>
                                </h5>
                                <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">
                                    Remarks: <span className="text-[#262D3B]">{item.remarks}</span>
                                </h5>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
