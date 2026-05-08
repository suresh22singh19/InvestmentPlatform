"use client";

import Image from "next/image";

export interface DietPlanHeaderAction {
    href?: string;
    iconSrc: string;
    iconAlt: string;
}

export interface DietPlanEntry {
    label: string;
    value: string;
    hidden?: boolean;
}

interface DietPlanCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    decoctionLabel?: string;
    decoctionValue: string;
    headerActions?: DietPlanHeaderAction[];
    rows: DietPlanEntry[][];
    className?: string;
}

export function DietPlanCard({
    title = "Diet Plan",
    iconSrc = "/icons/dietplan.svg",
    iconAlt = "Diet Plan",
    decoctionLabel = "Decoction:-",
    decoctionValue,
    headerActions = [],
    rows,
    className = "",
}: DietPlanCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 ">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
                {/* <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-2">
                        <span className="not-italic font-medium text-[12px] leading-[120%] text-[#434956]">{decoctionLabel}</span>
                        <span className="not-italic font-medium text-[14px] leading-[120%] text-[#262D3B]">{decoctionValue}</span>
                    </div>
                    {headerActions.map((action) => (
                        <a key={action.iconSrc} href={action.href ?? "#"}>
                            <Image src={action.iconSrc} alt={action.iconAlt} width={24} height={24} />
                        </a>
                    ))}
                </div> */}
            </div>

            <div className="data mt-5">
                {rows.length === 0 ? (
                    <p className="py-6 text-center font-inter text-sm font-medium leading-[120%] text-[#6E7480]">
                        No Data Available
                    </p>
                ) : (
                    rows.map((row, rowIndex) => (
                        <div
                            key={`diet-row-${rowIndex}`}
                            className={`flex justify-between items-center gap-3 ${rowIndex === rows.length - 1 ? "" : "mb-3"}`}
                        >
                            {row.map((entry, entryIndex) => (
                                <div key={`${entry.label}-${entryIndex}`} className="contents">
                                    <div className="flex flex-col w-[150px]">
                                        <span
                                            className={`not-italic font-medium text-[14px] leading-[120%] ${entry.hidden ? "text-[#fff]" : "text-[#434956]"}`}
                                        >
                                            {entry.label}
                                        </span>
                                        <span
                                            className={`not-italic font-medium text-[16px] leading-[120%] ${entry.hidden ? "text-[#fff]" : "text-[#262D3B]"}`}
                                        >
                                            {entry.value}
                                        </span>
                                    </div>
                                    {entryIndex < row.length - 1 ? <div className="h-[20px] w-[1px] bg-[#DFE0E2]"></div> : null}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
