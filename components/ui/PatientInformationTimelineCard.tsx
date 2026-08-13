"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
    SegmentedButtonGroup,
    SegmentedToggle,
    Tabs,
    Tooltip,
} from "@/components/ui";
import ScrollableContainer from "./ScrollableContainer";


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
    doctorNotes?: string;
    opdNextFollowupDate?: string;
    opdNextFollowupRemark?: string;
    communicableDiseases?: string[] | string;
    communicableDiseasesRemark?: string;
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
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [hasInteraction, setHasInteraction] = useState(false);
    const [selectedDoctorNotes, setSelectedDoctorNotes] = useState<string | null>(null);

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

    const filteredItemsWithKeys = useMemo(() => {
        return filteredItems.map((item, index) => {
            const key = item.detail?.opdAssessmentId
                ? `id-${item.detail.opdAssessmentId}`
                : `idx-${item.dateLabel || index}`;
            return {
                ...item,
                uniqueKey: key
            };
        });
    }, [filteredItems]);

    const itemsSignature = useMemo(() => {
        if (!Array.isArray(items)) return "";
        return items.map((it, idx) => it.detail?.opdAssessmentId ?? `${it.dateLabel}-${idx}`).join("|");
    }, [items]);

    // Reset interaction only on timeframe change or when the actual items content signature changes
    useEffect(() => {
        setHasInteraction(false);
        setExpandedKeys([]);
    }, [timeframe, itemsSignature]);

    const activeExpandedKeys = useMemo(() => {
        if (hasInteraction) {
            return expandedKeys;
        }
        const firstWithDetail = filteredItemsWithKeys.find(item => item.detail);
        return firstWithDetail ? [firstWithDetail.uniqueKey] : [];
    }, [hasInteraction, expandedKeys, filteredItemsWithKeys]);

    const isItemExpanded = (item: PatientInformationTimelineItem & { uniqueKey: string }) => {
        return activeExpandedKeys.includes(item.uniqueKey);
    };

    const toggleItem = (key: string) => {
        const current = activeExpandedKeys;
        if (current.includes(key)) {
            setExpandedKeys(current.filter(k => k !== key));
        } else {
            setExpandedKeys([...current, key]);
        }
        setHasInteraction(true);
    };

    const handleExpandAll = () => {
        const allKeys = filteredItemsWithKeys.map(item => item.uniqueKey);
        setExpandedKeys(allKeys);
        setHasInteraction(true);
        if (!cardExpanded) {
            setCardExpanded(true);
        }
    };

    const handleCollapseAll = () => {
        setExpandedKeys([]);
        setHasInteraction(true);
    };

    const handleTimeframeChange = (value: "6m" | "1y" | "lifetime") => {
        if (onTimeframeChange) {
            onTimeframeChange(value);
        } else {
            setInternalTimeframe(value);
        }
    };

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${cardExpanded ? "pb-6 pt-5" : "py-4"} ${className}`}>

            {/* Header Area */}
            <div className={`flex flex-wrap items-center justify-between gap-4 select-none ${cardExpanded ? "mb-4" : "mb-0"}`}>
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setCardExpanded(!cardExpanded)}
                >
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-semibold text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {filteredItemsWithKeys.length > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCollapseAll}
                                className="h-9 px-4.5 rounded-full border border-[#0B8C00] text-[#0B8C00] hover:bg-[#0B8C00]/10 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap bg-white shadow-xs flex items-center justify-center"
                            >
                                Collapse All
                            </button>
                            <button
                                type="button"
                                onClick={handleExpandAll}
                                className="h-9 px-4.5 rounded-full border border-[#0B8C00] text-[#0B8C00] hover:bg-[#0B8C00]/10 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap bg-white shadow-xs flex items-center justify-center"
                            >
                                Expand All
                            </button>
                        </div>
                    )}

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
                        className="text-[#787E8C] transition-transform duration-200 cursor-pointer"
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
                <ScrollableContainer
                    maxHeight="500px"
                    overflowX="hidden"
                    className="mt-4 pr-3 relative"
                >
                    {filteredItemsWithKeys.length === 0 ? (
                        <div className="text-center py-8 text-sm font-semibold text-[#787E8C]">
                            No Data Available
                        </div>
                    ) : (
                        <div className="relative pt-2 pb-2">
                            {/* Vertical Green Timeline Line */}
                            <div className="absolute left-4 -translate-x-1/2 top-4 bottom-4 w-[2px] bg-[#0B8C00]"></div>

                            {filteredItemsWithKeys.map((item, index) => {
                                const isExpanded = isItemExpanded(item);
                                const detail = item.detail;
                                return (
                                    <div
                                        key={item.uniqueKey}
                                        className={`relative pl-12 ${index === filteredItemsWithKeys.length - 1 ? "" : "mb-6"}`}
                                    >
                                        {/* Circle Expand/Collapse toggle */}
                                        <button
                                            type="button"
                                            onClick={() => toggleItem(item.uniqueKey)}
                                            className="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer bg-[#0B8C00] text-white transition-colors duration-200 z-10"
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

                                        <div
                                            className={`flex items-center min-h-[32px] cursor-pointer select-none ${detail && isExpanded ? "mb-3" : ""}`}
                                            onClick={() => toggleItem(item.uniqueKey)}
                                        >
                                            <p className="font-semibold text-sm leading-[120%] text-[#262D3B] not-italic">
                                                {item.dateLabel}
                                            </p>
                                        </div>

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
                                                    <div className="flex gap-2">
                                                        {detail.doctorNotes && detail.doctorNotes.trim() !== "" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedDoctorNotes(detail.doctorNotes || null)}
                                                                className="px-4 py-2 cursor-pointer rounded-full bg-[#0B8C00] hover:bg-[#0A7F00] text-white text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 shadow-sm justify-center"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4 shrink-0"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth={2}
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                    />
                                                                </svg>
                                                                <span>Doctor Notes</span>
                                                            </button>
                                                        )}
                                                        {(detail.opdAssessmentId || detail.iafDate) && onViewIaf && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onViewIaf(String(detail.opdAssessmentId || detail.iafDate))}
                                                                className="px-4 py-2 cursor-pointer rounded-full bg-[#0B8C00] hover:bg-[#0A7F00] text-white text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 shadow-sm justify-center"
                                                            >
                                                                <Image
                                                                    src="/icons/Eye.svg"
                                                                    alt="Eye"
                                                                    width={16}
                                                                    height={16}
                                                                    className="w-4 h-4 shrink-0 brightness-0 invert"
                                                                />
                                                                <span>IAF Form</span>
                                                            </button>
                                                        )}


                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 min-w-0">
                                                    <div className="min-w-0 space-y-4">
                                                        {(detail.chiefComplaint || detail.primaryComplaintText) && (
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-1">
                                                                    {detail.primaryComplaintTitle || "Chief Complaint"}
                                                                </p>
                                                                {(() => {
                                                                    const text = detail.chiefComplaint || detail.primaryComplaintText || "";
                                                                    return (
                                                                        <Tooltip content={<div className="max-w-[320px] whitespace-pre-wrap text-xs leading-relaxed ">{text}</div>} position="top">
                                                                            <p className="text-sm font-medium text-[#262D3B] line-clamp-2 break-words max-w-full cursor-pointer hover:text-[#0B8C00] transition-colors">
                                                                                {text}
                                                                            </p>
                                                                        </Tooltip>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}

                                                        {detail.symptoms && (
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-1">Symptoms</p>
                                                                <Tooltip content={<div className="max-w-[320px] whitespace-pre-wrap text-xs leading-relaxed">{detail.symptoms}</div>} position="top">
                                                                    <p className="text-sm font-medium text-[#262D3B] line-clamp-2 break-words max-w-full cursor-pointer hover:text-[#0B8C00] transition-colors">
                                                                        {detail.symptoms}
                                                                    </p>
                                                                </Tooltip>
                                                            </div>
                                                        )}

                                                        {/* <div className="min-w-0">
                                                            <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-1.5">
                                                                Infectious Disease Alerts
                                                            </p>
                                                            <div className="">
                                                                <Tabs
                                                                    className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                                                    options={[
                                                                        { value: "hiv", label: "HIV" },
                                                                        { value: "hepatitis", label: "Hepatitis" },
                                                                        { value: "tb", label: "TB" },
                                                                        { value: "normal", label: "Normal" },
                                                                    ]}
                                                                    value={detail.communicableDiseases ? detail.communicableDiseases : "normal"}
                                                                    multiSelect={true}
                                                                    onChange={() => { }}
                                                                    disabled={true}
                                                                />
                                                            </div>
                                                        </div> */}
                                                    </div>

                                                    {((detail.opdNextFollowupDate &&
                                                        detail.opdNextFollowupDate.trim() !== "" &&
                                                        detail.opdNextFollowupDate.trim().toUpperCase() !== "NA" &&
                                                        detail.opdNextFollowupDate.trim().toUpperCase() !== "N/A") ||
                                                        (detail.opdNextFollowupRemark &&
                                                            detail.opdNextFollowupRemark.trim() !== "" &&
                                                            detail.opdNextFollowupRemark.trim().toUpperCase() !== "NA" &&
                                                            detail.opdNextFollowupRemark.trim().toUpperCase() !== "N/A")) && (
                                                            <div className="min-w-0 space-y-4">
                                                                {detail.opdNextFollowupDate &&
                                                                    detail.opdNextFollowupDate.trim() !== "" &&
                                                                    detail.opdNextFollowupDate.trim().toUpperCase() !== "NA" &&
                                                                    detail.opdNextFollowupDate.trim().toUpperCase() !== "N/A" && (
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-1">Next FollowUp Date</p>
                                                                            <p className="text-sm font-medium text-[#262D3B]">{detail.opdNextFollowupDate}</p>
                                                                        </div>
                                                                    )}
                                                                {detail.opdNextFollowupRemark &&
                                                                    detail.opdNextFollowupRemark.trim() !== "" &&
                                                                    detail.opdNextFollowupRemark.trim().toUpperCase() !== "NA" &&
                                                                    detail.opdNextFollowupRemark.trim().toUpperCase() !== "N/A" && (
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-bold text-[#787E8C] uppercase tracking-wider mb-1">FollowUp Remarks</p>
                                                                            {(() => {
                                                                                const text = detail.opdNextFollowupRemark;
                                                                                return (
                                                                                    <Tooltip content={<div className="max-w-[320px] whitespace-pre-wrap text-xs leading-relaxed">{text}</div>} position="top">
                                                                                        <p className="text-sm font-medium text-[#262D3B] line-clamp-2 break-words max-w-full cursor-pointer hover:text-[#0B8C00] transition-colors">
                                                                                            {text}
                                                                                        </p>
                                                                                    </Tooltip>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        )}
                                                </div>

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
                        </div>
                    )}
                </ScrollableContainer>
            )}
            {selectedDoctorNotes !== null && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 transition-opacity">
                    <div className="bg-white rounded-[16px] shadow-2xl max-w-[620px] w-full p-8 relative flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[20px] font-bold text-[#262D3B] font-[Inter]">
                                Doctor's Notes (AI Generated)
                            </h3>
                            <button
                                onClick={() => setSelectedDoctorNotes(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="text-[15px] leading-[1.6] text-[#4F5E74] font-medium font-[Inter] whitespace-pre-line overflow-y-auto max-h-[50vh]">
                            {selectedDoctorNotes}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
