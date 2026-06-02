"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export interface PatientInformationTimelineMedicine {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    timing: string;
    duration: string;
}

export interface PatientInformationTimelineDetail {
    primaryComplaintTitle: string;
    primaryComplaintText: string;
    detailsTitle: string;
    detailsItems: string[];
    actionsTitle?: string;
    actionItems?: string[];
    medicinesTitle?: string;
    medicines?: PatientInformationTimelineMedicine[];
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

export function PatientInformationTimelineCard({
    title = "Patient  Information",
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

    const toggleItem = (index: number) => {
        setExpandedItems((prev) => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>

            <div className="mt-6 relative">
                <div className="absolute left-[15px] top-0 h-full w-[2px] bg-[#0B8C00]"></div>

                {items.map((item, index) => (
                    <div
                        key={`${item.dateLabel}-${index}`}
                        className={`relative pl-12 ${index === items.length - 1 ? "" : "mb-6"}`}
                    >
                        <button
                            type="button"
                            onClick={() => toggleItem(index)}
                            className="absolute left-0 top-0 w-8 h-8 bg-[#0B8C00] rounded-full flex items-center justify-center cursor-pointer"
                            aria-label={expandedItems[index] ? "Collapse item" : "Expand item"}
                            aria-expanded={expandedItems[index]}
                        >
                            {expandedItems[index] ? (
                                <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.63525 0.344238L15.2759 6.98486C15.7349 7.44385 15.7349 8.18604 15.2759 8.64014L14.1724 9.74365C13.7134 10.2026 12.9712 10.2026 12.5171 9.74365L7.81006 5.03662L3.10303 9.74365C2.64404 10.2026 1.90186 10.2026 1.44775 9.74365L0.344239 8.64014C-0.114745 8.18115 -0.114745 7.43896 0.344239 6.98486L6.98486 0.344238C7.43408 -0.114746 8.17627 -0.114746 8.63525 0.344238Z" fill="white" />
                                </svg>
                            ) : (
                                <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.63525 10.6558L1.99463 4.01514C1.53564 3.55615 1.53564 2.81396 1.99463 2.35986L3.09814 1.25635C3.55713 0.797363 4.29932 0.797363 4.75342 1.25635L9.46045 5.96338L14.1675 1.25635C14.6265 0.797363 15.3687 0.797363 15.8228 1.25635L16.9263 2.35986C17.3853 2.81885 17.3853 3.56104 16.9263 4.01514L10.2856 10.6558C9.83643 11.1147 9.09424 11.1147 8.63525 10.6558Z" fill="white" />
                                </svg>
                            )}
                        </button>

                        <p
                            className={`font-medium text-base leading-[120%] text-[#434956] not-italic ${item.detail && expandedItems[index] ? "mb-2" : ""}`}
                            onClick={() => toggleItem(index)}
                        >
                            {item.dateLabel}
                        </p>

                        {item.detail && expandedItems[index] ? (
                            <div className="rounded-xl bg-[#F3F7F2] border border-[#E3EEE1] p-4">
                                <p className="text-sm font-medium text-[#262D3B] mb-2">{item.detail.primaryComplaintTitle}</p>
                                <p className="text-sm text-[#434956] mb-3">{item.detail.primaryComplaintText}</p>

                                <p className="text-sm font-medium text-[#262D3B] mb-1">{item.detail.detailsTitle}</p>
                                <ul className="text-sm text-[#434956] list-disc pl-5 space-y-1 mb-3">
                                    {item.detail.detailsItems.map((detailItem) => (
                                        <li key={detailItem}>{detailItem}</li>
                                    ))}
                                </ul>

                                {item.detail.actionsTitle && item.detail.actionItems ? (
                                  <>
                                    <p className="text-sm font-medium text-[#262D3B] mb-1">
                                      {item.detail.actionsTitle}
                                    </p>
                                    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-[#434956]">
                                      {item.detail.actionItems.map((actionItem) => (
                                        <li key={actionItem}>{actionItem}</li>
                                      ))}
                                    </ul>
                                  </>
                                ) : null}

                                {item.detail.medicines && item.detail.medicines.length > 0 ? (
                                  <>
                                    <p className="mb-2 text-sm font-medium text-[#262D3B]">
                                      {item.detail.medicinesTitle ?? "Medicines Prescribed"}
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                      {item.detail.medicines.map((medicine) => (
                                        <div
                                          key={medicine.id}
                                          className="rounded-xl border border-[#EBECED] bg-white p-3"
                                        >
                                          <div className="mb-2 flex items-start gap-2">
                                            <Image
                                              src="/icons/medicons.svg"
                                              alt=""
                                              width={18}
                                              height={18}
                                            />
                                            <p className="text-sm font-semibold text-[#262D3B]">
                                              {medicine.name}
                                            </p>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            <span className="rounded-full border border-[#E3EEE1] bg-[#FAFBFA] px-2.5 py-0.5 text-xs font-medium text-[#434956]">
                                              {medicine.duration}
                                            </span>
                                            <span className="rounded-full border border-[#E3EEE1] bg-[#FAFBFA] px-2.5 py-0.5 text-xs font-medium text-[#434956]">
                                              {medicine.dosage}
                                            </span>
                                            <span className="rounded-full border border-[#E3EEE1] bg-[#FAFBFA] px-2.5 py-0.5 text-xs font-medium text-[#434956]">
                                              {medicine.frequency}
                                            </span>
                                            <span className="rounded-full border border-[#E3EEE1] bg-[#FAFBFA] px-2.5 py-0.5 text-xs font-medium text-[#434956]">
                                              {medicine.timing}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
