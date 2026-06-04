"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export interface PatientInformationTimelineDetail {
    primaryComplaintTitle: string;
    primaryComplaintText: string;
    detailsTitle: string;
    detailsItems: string[];
    actionsTitle: string;
    actionItems: string[];
}

export interface PatientInformationTimelineItem {
    dateLabel: string;
    detail?: PatientInformationTimelineDetail;
}

interface PatientInformationTimelineCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    items: PatientInformationTimelineItem[];
    className?: string;
}

const parseMedicineString = (itemStr: string) => {
    // Example: "Paracetamol 500 mg - 5 Days (Dosage: 1 Tablet, Frequency: Twice Daily, Timing: After Food)"
    const detailsMatch = itemStr.match(/^(.*?)\s*-\s*(.*?)\s*\((Dosage|dosage):\s*(.*?),\s*(Frequency|frequency):\s*(.*?),\s*(Timing|timing):\s*(.*?)\)$/i);
    if (detailsMatch) {
        return {
            name: detailsMatch[1].trim(),
            duration: detailsMatch[2].trim(),
            dosage: detailsMatch[4].trim(),
            frequency: detailsMatch[6].trim(),
            timing: detailsMatch[8].trim()
        };
    }

    // Fallback if formatting is slightly different
    const nameMatch = itemStr.split(" - ");
    const name = nameMatch[0]?.trim() || itemStr;
    let duration = "N/A";
    let dosage = "N/A";
    let frequency = "N/A";
    let timing = "N/A";

    const durationMatch = itemStr.match(/-\s*([^(]+)/);
    if (durationMatch) {
        duration = durationMatch[1].trim();
    }
    const dosageMatch = itemStr.match(/Dosage:\s*([^,)]+)/i);
    if (dosageMatch) {
        dosage = dosageMatch[1].trim();
    }
    const freqMatch = itemStr.match(/Frequency:\s*([^,)]+)/i);
    if (freqMatch) {
        frequency = freqMatch[1].trim();
    }
    const timingMatch = itemStr.match(/Timing:\s*([^,)]+)/i);
    if (timingMatch) {
        timing = timingMatch[1].trim();
    }

    return { name, duration, dosage, frequency, timing };
};

export function PatientInformationTimelineCard({
    title = "Patient History",
    iconSrc = "/icons/medicalIcon.svg",
    iconAlt = "Medical Icon",
    items,
    className = "",
}: PatientInformationTimelineCardProps) {
    const defaultExpanded = useMemo(
        () => items.map((item, index) => Boolean(item.detail && index === 0)),
        [items]
    );
    const [expandedItems, setExpandedItems] = useState<boolean[]>(defaultExpanded);
    const [cardExpanded, setCardExpanded] = useState(true);

    const toggleItem = (index: number) => {
        setExpandedItems((prev) => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div
                className="flex items-center justify-between gap-2 cursor-pointer select-none"
                onClick={() => setCardExpanded(!cardExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-semibold text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
                <button type="button" className="text-[#787E8C] transition-transform duration-200">
                    <svg
                        className={`w-5 h-5 transform transition-transform duration-200 ${cardExpanded ? "" : "rotate-180"}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="18 15 12 9 6 15" />
                    </svg>
                </button>
            </div>

            {cardExpanded && (
                <div className="mt-6 relative">
                    <div className="absolute left-[15px] top-0 h-[calc(100%-16px)] w-[2px] bg-[#E2E8F0]"></div>

                    {items.map((item, index) => (
                        <div
                            key={`${item.dateLabel}-${index}`}
                            className={`relative pl-12 ${index === items.length - 1 ? "" : "mb-6"}`}
                        >
                            <button
                                type="button"
                                onClick={() => toggleItem(index)}
                                className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 ${expandedItems[index] ? "bg-[#0B8C00] text-white" : "bg-[#0B8C00] text-white"
                                    }`}
                                aria-label={expandedItems[index] ? "Collapse item" : "Expand item"}
                                aria-expanded={expandedItems[index]}
                            >
                                {expandedItems[index] ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="18 15 12 9 6 15" />
                                    </svg>
                                ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                )}
                            </button>

                            <p
                                className={`font-semibold text-sm leading-[120%] text-[#262D3B] not-italic cursor-pointer select-none ${item.detail && expandedItems[index] ? "mb-3" : ""}`}
                                onClick={() => toggleItem(index)}
                            >
                                {item.dateLabel}
                            </p>

                            {item.detail && expandedItems[index] ? (
                                <div className="rounded-[16px] bg-[#F8FAF8] border border-[#E2E8F0] p-5">
                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-1">{item.detail.primaryComplaintTitle}</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{item.detail.primaryComplaintText}</p>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-2">{item.detail.detailsTitle}</p>
                                        <ul className="text-sm text-[#434956] list-disc pl-5 space-y-1.5">
                                            {item.detail.detailsItems.map((detailItem, dIdx) => (
                                                <li key={dIdx} className="leading-relaxed">{detailItem}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-[#787E8C] tracking-wider mb-3">{item.detail.actionsTitle}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {item.detail.actionItems.map((actionItem, actIdx) => {
                                                const parsed = parseMedicineString(actionItem);
                                                const isParsed = parsed.dosage !== "N/A" || parsed.frequency !== "N/A" || parsed.timing !== "N/A";

                                                if (!isParsed) {
                                                    return (
                                                        <div key={actIdx} className="p-3 border border-[#E2E8F0] bg-white rounded-xl text-sm font-medium text-[#262D3B]">
                                                            {/* {actionItem} */}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={actIdx} className="flex flex-col p-4 border border-[#E2E8F0] bg-white rounded-[12px] shadow-sm hover:shadow-md transition-shadow duration-200">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="font-bold text-sm text-[#262D3B]">{parsed.name}</span>
                                                            <span className="inline-flex items-center justify-center rounded-full bg-[#FDF8E8] px-3 py-1 text-[10px] font-bold text-[#9A7909]">
                                                                {parsed.duration}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 border-t border-[#F1F5F9] pt-3">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Dosage</span>
                                                                <span className="text-xs font-bold text-[#262D3B]">{parsed.dosage}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Frequency</span>
                                                                <span className="text-xs font-bold text-[#262D3B]">{parsed.frequency}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Timing</span>
                                                                <span className="text-xs font-bold text-[#262D3B]">{parsed.timing}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
