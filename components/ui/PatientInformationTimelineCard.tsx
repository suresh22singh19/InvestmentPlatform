"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
    SegmentedButtonGroup,
    SegmentedToggle,
} from "@/components/ui";


export interface PrescribedMedicine {
    medicineName: string;
    medicineDosage: string;
    medicineFrequency: string;
    medicineTiming: string;
    medicineDuration: string;
}

export interface PatientInformationTimelineDetail {
    // Legacy support
    primaryComplaintTitle?: string;
    primaryComplaintText?: string;
    detailsTitle?: string;
    detailsItems?: string[];
    actionsTitle?: string;
    actionItems?: string[];
    
    // Structured support
    branch?: string;
    doctorName?: string;
    iafDate?: string;
    chiefComplaint?: string;
    symptoms?: string;
    prescribedMedicines?: PrescribedMedicine[];
    opdAssessmentId?: number;
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
    onViewIaf?: (date: string) => void;
    timeframe?: "6m" | "1y" | "lifetime";
    onTimeframeChange?: (value: "6m" | "1y" | "lifetime") => void;
    disableClientSideFilter?: boolean;
}

const parseMedicineString = (itemStr: string) => {
    // 1. Try to match the original parenthesized format:
    // "Paracetamol 500 mg - 5 Days (Dosage: 1 Tablet, Frequency: Twice Daily, Timing: After Food)"
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

    // 2. Try to match the API space-separated format:
    // e.g. "Ashwagandha 1 tablet Once daily Before meal"
    const units = ["tablet", "tablets", "capsule", "capsules", "ml", "tsp", "drop", "drops", "pill", "pills", "gm", "mg"];
    const frequencies = ["once daily", "twice daily", "thrice daily", "once a day", "twice a day", "thrice a day", "once daily.", "twice daily.", "thrice daily.", "daily", "daily.", "weekly"];
    const timings = ["before meal", "after meal", "before food", "after food", "empty stomach", "bedtime", "morning", "night", "before meals", "after meals"];

    const lowerStr = itemStr.toLowerCase();

    // Find if any unit is in the string
    let foundUnitIdx = -1;
    let foundUnit = "";
    for (const unit of units) {
        const idx = lowerStr.indexOf(" " + unit);
        if (idx !== -1) {
            foundUnitIdx = idx;
            foundUnit = unit;
            break;
        }
    }

    if (foundUnitIdx !== -1) {
        // Find the number right before the unit
        const beforeUnit = itemStr.substring(0, foundUnitIdx).trim();
        const beforeUnitWords = beforeUnit.split(" ");
        const lastWordBeforeUnit = beforeUnitWords[beforeUnitWords.length - 1];

        const isNum = /^\d+$/.test(lastWordBeforeUnit) || lastWordBeforeUnit === "one" || lastWordBeforeUnit === "two";
        let dosage = "";
        let name = "";

        if (isNum) {
            dosage = `${lastWordBeforeUnit} ${foundUnit}`;
            name = beforeUnitWords.slice(0, -1).join(" ").trim();
        } else {
            dosage = foundUnit;
            name = beforeUnit;
        }

        const remainingStr = itemStr.substring(foundUnitIdx + foundUnit.length + 1).trim();
        const lowerRemaining = remainingStr.toLowerCase();

        let timing = "N/A";
        for (const t of timings) {
            if (lowerRemaining.includes(t)) {
                timing = t.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                break;
            }
        }

        let frequency = "N/A";
        for (const f of frequencies) {
            if (lowerRemaining.includes(f)) {
                frequency = f.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                break;
            }
        }

        if (dosage !== "N/A" || frequency !== "N/A" || timing !== "N/A") {
            return {
                name: name || itemStr,
                duration: "N/A",
                dosage: dosage || "N/A",
                frequency: frequency || "N/A",
                timing: timing || "N/A"
            };
        }
    }

    // 3. Fallback if formatting is slightly different
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

const isWithinPeriod = (dateLabel: string, period: "6m" | "1y" | "lifetime") => {
    if (period === "lifetime") return true;

    // Parse the date part before any dash or space
    const datePart = dateLabel.split(" - ")[0].trim();

    // 1. Try parsing DD/MM/YYYY or DD-MM-YYYY
    const matchDmy = datePart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    let dateObj: Date | null = null;

    if (matchDmy) {
        const day = parseInt(matchDmy[1], 10);
        const month = parseInt(matchDmy[2], 10) - 1; // 0-indexed
        const year = parseInt(matchDmy[3], 10);
        dateObj = new Date(year, month, day);
    } else {
        // 2. Try parsing standard Date formats or word-based months like "21 Oct 2024"
        const parsed = Date.parse(datePart);
        if (!isNaN(parsed)) {
            dateObj = new Date(parsed);
        }
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
        // Fallback: If cannot parse, keep the item
        return true;
    }

    const now = new Date();
    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (period === "6m") {
        return diffDays <= 180; // ~6 months
    } else if (period === "1y") {
        return diffDays <= 365; // 1 year
    }
    return true;
};

export function PatientInformationTimelineCard({
    title = "Patient History",
    iconSrc = "/icons/medicalIcon.svg",
    iconAlt = "Medical Icon",
    items,
    className = "",
    onViewIaf,
    timeframe: propTimeframe,
    onTimeframeChange,
    disableClientSideFilter = false,
}: PatientInformationTimelineCardProps) {
    const [cardExpanded, setCardExpanded] = useState(true);
    const [internalTimeframe, setInternalTimeframe] = useState<"6m" | "1y" | "lifetime">("6m");
    const [expandedDateLabel, setExpandedDateLabel] = useState<string | null>(null);
    const [hasInteraction, setHasInteraction] = useState(false);

    const timeframe = propTimeframe !== undefined ? propTimeframe : internalTimeframe;

    const timeframeOptions = [
        { label: "6 Months", value: "6m" as const },
        { label: "1 Year", value: "1y" as const },
        { label: "Lifetime", value: "lifetime" as const }
    ];

    const filteredItems = useMemo(() => {
        if (disableClientSideFilter) {
            return items;
        }
        return items.filter(item => isWithinPeriod(item.dateLabel, timeframe));
    }, [items, timeframe, disableClientSideFilter]);

    // Reset interaction on timeframe or items change so the first item expands by default
    useEffect(() => {
        setHasInteraction(false);
        setExpandedDateLabel(null);
    }, [timeframe, items]);

    const activeExpandedLabel = useMemo(() => {
        if (hasInteraction) {
            return expandedDateLabel;
        }
        const firstWithDetail = filteredItems.find(item => item.detail);
        return firstWithDetail ? firstWithDetail.dateLabel : null;
    }, [hasInteraction, expandedDateLabel, filteredItems]);

    const isItemExpanded = (item: PatientInformationTimelineItem) => {
        return activeExpandedLabel === item.dateLabel;
    };

    const toggleItem = (dateLabel: string) => {
        setHasInteraction(true);
        setExpandedDateLabel(prev => (prev === dateLabel ? null : dateLabel));
    };

    const handleTimeframeChange = (value: "6m" | "1y" | "lifetime") => {
        if (onTimeframeChange) {
            onTimeframeChange(value);
        } else {
            setInternalTimeframe(value);
        }
    };

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>

            {/* Header Area */}
            <div className="flex items-center justify-between gap-4 mb-4 select-none">
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setCardExpanded(!cardExpanded)}
                >
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-semibold text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex">
                        <SegmentedToggle
                            options={timeframeOptions}
                            value={timeframe}
                            onChange={handleTimeframeChange}
                            width="440px"
                        />

                    </div>
                    <button
                        type="button"
                        onClick={() => setCardExpanded(!cardExpanded)}
                        className="text-[#787E8C] transition-transform duration-200"
                    >
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
            </div>

            {cardExpanded && (
                <div className="mt-6 relative">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-8 text-sm font-semibold text-[#787E8C]">
                            No Data Available
                        </div>
                    ) : (
                        <>
                            {/* Vertical Green Timeline Line */}
                            <div className="absolute left-[15px] top-0 h-[calc(100%-16px)] w-[2px] bg-[#0B8C00]"></div>

                            {filteredItems.map((item, index) => {
                                const isExpanded = isItemExpanded(item);
                                const detail = item.detail;
                                return (
                                    <div
                                        key={`${item.dateLabel}-${index}`}
                                        className={`relative pl-12 ${index === filteredItems.length - 1 ? "" : "mb-6"}`}
                                    >
                                        {/* Circle Expand/Collapse toggle */}
                                        <button
                                            type="button"
                                            onClick={() => toggleItem(item.dateLabel)}
                                            className="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer bg-[#0B8C00] text-white transition-colors duration-200"
                                            aria-label={isExpanded ? "Collapse item" : "Expand item"}
                                            aria-expanded={isExpanded}
                                        >
                                            {isExpanded ? (
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
                                            className={`font-semibold text-sm leading-[120%] text-[#262D3B] not-italic cursor-pointer select-none ${detail && isExpanded ? "mb-3" : ""}`}
                                            onClick={() => toggleItem(item.dateLabel)}
                                        >
                                            {item.dateLabel}
                                        </p>

                                        {detail && isExpanded ? (
                                            <div className="rounded-[16px] bg-[#F5FAF5] border border-[#E3EEE1] p-5">

                                                {/* Metadata Row: Branch, Doctor Name, View IAF Form */}
                                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E3EEE1] pb-4 mb-4">
                                                    <div className="flex gap-10">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Branch</span>
                                                            <span className="text-sm font-semibold text-[#434956]">{detail.branch || "N/A"}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Doctor Name</span>
                                                            <span className="text-sm font-semibold text-[#434956]">{detail.doctorName || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                    {(detail.opdAssessmentId || detail.iafDate) && onViewIaf && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onViewIaf(String(detail.opdAssessmentId || detail.iafDate))}
                                                            className="flex items-center gap-1 px-4 py-1 rounded-full bg-[#E8F5E9] text-[#0B8C00] hover:bg-[#C8E6C9]  text-xs transition-colors"
                                                        >
                                                            <Image src="/icons/Eye.svg" alt="Eye" width={14} height={14} className="mr-1" />
                                                            <span>View IAF Form</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {(detail.chiefComplaint || detail.primaryComplaintText) && (
                                                    <div className="mb-4">
                                                        <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-1">
                                                            {detail.primaryComplaintTitle || "Chief Complaint"}
                                                        </p>
                                                        <p className="text-sm font-medium text-[#262D3B]">
                                                            {detail.chiefComplaint || detail.primaryComplaintText}
                                                        </p>
                                                    </div>
                                                )}

                                                {detail.symptoms && (
                                                    <div className="mb-4">
                                                        <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-1">Symptoms</p>
                                                        <p className="text-sm font-medium text-[#262D3B]">{detail.symptoms}</p>
                                                    </div>
                                                )}

                                                {detail.detailsItems && detail.detailsItems.length > 0 && (
                                                    <div className="mb-4">
                                                        <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-2">
                                                            {detail.detailsTitle || "Clinical & Assessment Details"}
                                                        </p>
                                                        <ul className="text-sm text-[#434956] list-disc pl-5 space-y-1.5">
                                                            {detail.detailsItems.map((detailItem, dIdx) => (
                                                                <li key={dIdx} className="leading-relaxed">{detailItem}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <div>
                                                    <p className="text-xs font-bold text-[#787E8C] tracking-wider mb-3 uppercase">
                                                        {detail.actionsTitle || "Medicines Prescribed"}
                                                    </p>
                                                    
                                                    {detail.prescribedMedicines && detail.prescribedMedicines.length > 0 ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {detail.prescribedMedicines.map((medicine, medIdx) => (
                                                                <div key={medIdx} className="flex flex-col p-4 border border-[#E2E8F0] bg-[#F5FAF5] rounded-[12px] shadow-sm hover:shadow-md transition-shadow duration-200">
                                                                    <div className="flex justify-between items-center mb-3">
                                                                        <span className="font-bold text-sm text-[#262D3B]">{medicine.medicineName}</span>
                                                                        {medicine.medicineDuration && (
                                                                            <span className="inline-flex items-center justify-center rounded-full bg-[#FDF2E9] px-3 py-1 text-[10px] font-bold text-[#E07A5F]">
                                                                                {medicine.medicineDuration}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-2 border-t border-[#F1F5F9] pt-3">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Dosage</span>
                                                                            <span className="text-xs font-bold text-[#262D3B]">{medicine.medicineDosage || "N/A"}</span>
                                                                        </div>
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Frequency</span>
                                                                            <span className="text-xs font-bold text-[#262D3B]">{medicine.medicineFrequency || "N/A"}</span>
                                                                        </div>
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Timing</span>
                                                                            <span className="text-xs font-bold text-[#262D3B]">{medicine.medicineTiming || "N/A"}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : detail.actionItems && detail.actionItems.length > 0 ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {detail.actionItems.map((actionItem, actIdx) => {
                                                                const parsed = parseMedicineString(actionItem);
                                                                const isParsed = parsed.dosage !== "N/A" || parsed.frequency !== "N/A" || parsed.timing !== "N/A";

                                                                if (!isParsed) {
                                                                    return (
                                                                        <div key={actIdx} className="p-3 border border-[#E2E8F0] bg-white rounded-xl text-sm font-medium text-[#262D3B]">
                                                                            {actionItem}
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div key={actIdx} className="flex flex-col p-4 border border-[#E2E8F0] bg-[#F5FAF5] rounded-[12px] shadow-sm hover:shadow-md transition-shadow duration-200">
                                                                        <div className="flex justify-between items-center mb-3">
                                                                            <span className="font-bold text-sm text-[#262D3B]">{parsed.name}</span>
                                                                            <span className="inline-flex items-center justify-center rounded-full bg-[#FDF2E9] px-3 py-1 text-[10px] font-bold text-[#E07A5F]">
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
                                                    ) : (
                                                        <div className="p-3 border border-[#E2E8F0] bg-white rounded-xl text-sm font-medium text-[#787E8C]">
                                                            No Medicines Prescribed
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
