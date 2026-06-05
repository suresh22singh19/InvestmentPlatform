"use client";

import Image from "next/image";

export interface IAFItem {
    srNo: number;
    date: string;
}

interface IAFCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    items?: IAFItem[];
    onViewClick?: (item: IAFItem) => void;
    className?: string;
}

export function IAFCard({
    title = "IAF",
    iconSrc = "/icons/Referral.svg",
    iconAlt = "IAF Icon",
    items = [],
    onViewClick,
    className = "",
}: IAFCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter text-base font-semibold leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#EBECED] bg-white">
                {/* Table Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#EBECED]">
                    <span className="w-1/4 font-inter text-xs font-semibold uppercase tracking-wider text-[#7A869A] text-left">
                        Sr no.
                    </span>
                    <span className="flex-1 font-inter text-xs font-semibold uppercase tracking-wider text-[#7A869A] text-left">
                        Date
                    </span>
                    <span className="w-1/4 font-inter text-xs font-semibold uppercase tracking-wider text-[#7A869A] text-right">
                        Action
                    </span>
                </div>

                {/* Table Body */}
                {items.length === 0 ? (
                    <div className="px-5 py-4 text-center text-sm text-[#7A869A] font-inter">
                        No Data Available
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div
                            key={item.srNo}
                            className={`flex items-center justify-between px-5 py-4 ${index < items.length - 1 ? "border-b border-[#EBECED]" : ""
                                }`}
                        >
                            <span className="w-1/4 text-sm font-normal text-[#525763] text-left">
                                {item.srNo}
                            </span>
                            <span className="flex-1 font-inter text-sm font-medium text-[#434956] text-left">
                                {item.date}
                            </span>
                            <span className="w-1/4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => onViewClick?.(item)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity p-1"
                                >
                                    <Image
                                        src="/icons/openEye.svg"
                                        alt="View"
                                        width={18}
                                        height={18}
                                    />
                                </button>
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
