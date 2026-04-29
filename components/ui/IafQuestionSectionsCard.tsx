"use client";

import Image from "next/image";
import type { NutritionalAssessmentItem } from "./NutritionalAssessmentCard";

export interface IafExplainAboutItem {
    id: string;
    label: string;
    text: string;
}

/** One row group under “Please Explain About” (e.g. `grid-cols-2` then `grid-cols-3 mt-4`). */
export interface IafExplainAboutGridBlock {
    columns: 2 | 3;
    items: IafExplainAboutItem[];
    /** Extra classes on the grid wrapper, e.g. `mt-4`. */
    className?: string;
}

interface IafQuestionSectionsCardProps {
    generalTitle?: string;
    explainTitle?: string;
    iconSrc?: string;
    iconAlt?: string;
    generalItems: NutritionalAssessmentItem[];
    /**
     * Preferred: one or more explain grids (2-col / 3-col blocks).
     * If omitted or empty, falls back to `explainItems` in a single 2-column grid.
     */
    explainGrids?: IafExplainAboutGridBlock[];
    /** Legacy single 2-column explain section; used when `explainGrids` is empty. */
    explainItems?: IafExplainAboutItem[];
    className?: string;
}

function renderExplainCell(item: IafExplainAboutItem) {
    return (
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
                <h5 className="font-medium text-[14px] leading-[120%] text-[#262D3B]">{item.text}</h5>
            </div>
        </div>
    );
}

export function IafQuestionSectionsCard({
    generalTitle = "General Questions",
    explainTitle = "Please Explain About",
    iconSrc = "/icons/Bedicon.svg",
    iconAlt = "Appointment",
    generalItems,
    explainGrids,
    explainItems,
    className = "",
}: IafQuestionSectionsCardProps) {
    const explainBlocks: IafExplainAboutGridBlock[] =
        explainGrids && explainGrids.length > 0
            ? explainGrids
            : explainItems && explainItems.length > 0
              ? [{ columns: 2, items: explainItems }]
              : [];

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 ${className}`}>
            <div className="mb-4">
                <div className="flex items-center justify-between gap-2 cursor-pointer">
                    <div className="flex items-center gap-2 ">
                        <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                        <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{generalTitle}</h2>
                    </div>
                </div>
                <div className="Room-content mt-5">
                    <div className="grid grid-cols-2 gap-5">
                        {generalItems.map((item) => (
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

            <div>
                <div className="flex items-center justify-between gap-2 cursor-pointer">
                    <div className="flex items-center gap-2 ">
                        <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                        <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{explainTitle}</h2>
                    </div>
                </div>
                <div className="Room-content mt-5">
                    {explainBlocks.map((block, index) => {
                        const gridCols =
                            block.columns === 3 ? "grid grid-cols-3 gap-5" : "grid grid-cols-2 gap-5";
                        const wrapperClass = [gridCols, block.className].filter(Boolean).join(" ");
                        return (
                            <div key={`explain-grid-${index}`} className={wrapperClass}>
                                {block.items.map((item) => renderExplainCell(item))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
