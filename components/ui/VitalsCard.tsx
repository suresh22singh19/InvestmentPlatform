"use client";

import Image from "next/image";

export interface VitalItem {
    label: string;
    value: string;
    unit?: string;
}

interface VitalsCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    items: VitalItem[];
    className?: string;
}

export function VitalsCard({
    title = "Vitals",
    iconSrc = "/icons/VitalsIcon.svg",
    iconAlt = "Vitals Info Icon",
    items,
    className = "",
}: VitalsCardProps) {
    const firstRow = items.slice(0, 2);
    const secondRow = items.slice(2, 4);

    const renderCard = (item: VitalItem) => (
        <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 font-medium text-sm leading-[120%] text-[#434956]">
                <span className="w-2 h-2 rotate-45 bg-blue-600 inline-block"></span>
                {item.label}
            </div>
            <div className="mt-1 font-inter text-[20px] leading-[130%] font-semibold text-[#434956]">
                {item.value} {item.unit ? <span className="font-medium">{item.unit}</span> : null}
            </div>
        </div>
    );

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>

            <div className="space-y-3 mt-5">
                <div className="grid grid-cols-2 gap-3">{firstRow.map(renderCard)}</div>
                <div className="grid grid-cols-2 gap-3">{secondRow.map(renderCard)}</div>
            </div>
        </div>
    );
}
