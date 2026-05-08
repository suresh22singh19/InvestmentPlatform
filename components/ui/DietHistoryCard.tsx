"use client";

import Image from "next/image";

export interface DietHistoryVisit {
    id: string;
    /** `YYYY-MM-DD` or display string */
    date: string;
    dietDetail: string;
}

interface DietHistoryCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    visits: DietHistoryVisit[];
    className?: string;
}

/** Plain display date `DD-MM-YYYY` when input is `YYYY-MM-DD` */
function formatDisplayDate(isoDate: string): string {
    const [y, m, d] = isoDate.trim().split("-");
    if (y && m && d) return `${d}-${m}-${y}`;
    const t = isoDate.trim();
    return t || "-";
}

/** Matches label + value shell in `NutritionalAssessmentCard` */
const labelClassName =
    "block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]";
const valueBoxClassName =
    "flex min-h-[40px] w-full flex-1 flex-col justify-start px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg";
const valueTextClassName = "font-medium text-[14px] leading-[120%] text-[#262D3B]";

export function DietHistoryCard({
    title = "Diet History (आहार इतिहास)",
    iconSrc = "/icons/dietplan.svg",
    iconAlt = "Diet History",
    visits,
    className = "",
}: DietHistoryCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 ">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>

            <div className="Room-content mt-5">
                {visits.length === 0 ? (
                    <p className="py-8 text-center font-inter text-sm font-medium leading-[120%] text-[#6E7480]">
                        No diet history visits yet.
                    </p>
                ) : (
                    <div className="flex flex-col gap-5">
                        {visits.map((visit) => {
                            const dietText = visit.dietDetail.trim() || "-";
                            const dateFieldId = `${visit.id}-date`;
                            const detailFieldId = `${visit.id}-diet-detail`;
                            return (
                                <div key={visit.id} className="overflow-hidden  bg-white">
                                    <div className="">
                                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-stretch md:gap-5">
                                            <div className="flex min-h-0 min-w-0 flex-col md:h-full">
                                                <label htmlFor={dateFieldId} className={labelClassName}>
                                                    Date
                                                </label>
                                                <div id={dateFieldId} className={valueBoxClassName}>
                                                    <h5 className={valueTextClassName}>{formatDisplayDate(visit.date)}</h5>
                                                </div>
                                            </div>
                                            <div className="flex min-h-0 min-w-0 flex-col md:h-full">
                                                <label htmlFor={detailFieldId} className={labelClassName}>
                                                    Diet Detail
                                                </label>
                                                <div id={detailFieldId} className={valueBoxClassName}>
                                                    <h5 className={`${valueTextClassName} whitespace-pre-wrap`}>{dietText}</h5>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
