"use client";

import Image from "next/image";
import { HealthCardPreview } from "./HealthCardPreview";

export interface IafTonguePulseExamFieldItem {
    id: string;
    label: string;
    value: string;
}

interface IafTonguePulseExamCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    imageSectionLabel?: string;
    /** Passed to `HealthCardPreview` (same as overview sidebar). */
    cardNumber: string;
    /** Optional classes on `HealthCardPreview` (e.g. trim outer margin inside this card). */
    healthCardPreviewClassName?: string;
    items: IafTonguePulseExamFieldItem[];
    className?: string;
}

const IMAGE_BLOCK_ID = "iaf-tongue-pulse-image";

export function IafTonguePulseExamCard({
    title = "Tongue / Pulse / Eyes / Nails",
    iconSrc = "/icons/Bedicon.svg",
    iconAlt = "Appointment",
    imageSectionLabel = "Image",
    cardNumber,
    healthCardPreviewClassName = "!mb-0 border-0 bg-transparent px-0 py-0 shadow-none",
    items,
    className = "",
}: IafTonguePulseExamCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 ${className}`}>
            <div className="mb-4">
                <div className="flex items-center justify-between gap-2 cursor-pointer">
                    <div className="flex items-center gap-2 ">
                        <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                        <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                    </div>
                </div>
                <div className="Room-content mt-5">
                    <div className="mb-4">
                        <label
                            htmlFor={IMAGE_BLOCK_ID}
                            className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]"
                        >
                            {imageSectionLabel}
                        </label>
                        <div id={IMAGE_BLOCK_ID} className="rounded-lg">
                            <HealthCardPreview cardNumber={cardNumber} className={healthCardPreviewClassName} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-5">
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
