"use client";

import Image from "next/image";

export interface PatientFileItem {
    name: string;
    size: string;
    fileIconSrc?: string;
    fileIconAlt?: string;
    actionIconSrc?: string;
    actionIconAlt?: string;
    /** When set, the download action opens this URL (e.g. legacy file path) */
    downloadUrl?: string;
}

interface PatientFilesCardProps {
    title?: string;
    titleIconSrc?: string;
    titleIconAlt?: string;
    items: PatientFileItem[];
    /** Shown inside the dashed empty-state box when `items` is empty */
    emptyMessage?: string;
    /** When true, show plain text empty state (no dashed box) */
    plainEmptyState?: boolean;
    className?: string;
}

export function PatientFilesCard({
    title = "Patient Files",
    titleIconSrc = "/icons/patient_history.svg",
    titleIconAlt = "Medical Icon",
    items,
    emptyMessage = "No Data Available",
    plainEmptyState = false,
    className = "",
}: PatientFilesCardProps) {
    const isEmpty = items.length === 0;

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 ">
                    <Image src={titleIconSrc} alt={titleIconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>
            <div className="Room-content mt-5">
                <div>
                    {isEmpty ? (
                        plainEmptyState ? (
                            <p className="py-6 text-center font-inter text-sm font-medium leading-[120%] text-[#6E7480]">
                                {emptyMessage}
                            </p>
                        ) : (
                            <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-[#DFE0E2] bg-[#FAFAFA] px-4 py-8">
                                <p className="text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">{emptyMessage}</p>
                            </div>
                        )
                    ) : (
                    <div className="bg-white mb-4 ">
                        {items.map((item, index) => (
                            <div key={`${item.name}-${index}`} className="py-2 mb-3 last:mb-0 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="flex justify-center items-center w-9 h-9 bg-[rgba(11,140,0,0.05)] shadow-[0px_6px_30px_rgba(0,0,0,0.08)] rounded-full">
                                            <Image
                                                src={item.fileIconSrc ?? "/icons/patient_history.svg"}
                                                alt={item.fileIconAlt ?? "Patient File"}
                                                width={20}
                                                height={20}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm leading-[120%] text-[#262D3B]">{item.name}</p>
                                        <p className="font-medium text-[10px] leading-[120%] text-[#434956]">{item.size}</p>
                                    </div>
                                </div>
                                <div>
                                    {item.downloadUrl ? (
                                        <a
                                            href={item.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex"
                                            aria-label={`Download ${item.name}`}
                                        >
                                            <span className="flex justify-center items-center w-9 h-9 bg-[rgba(11,140,0,0.05)] shadow-[0px_6px_30px_rgba(0,0,0,0.08)] rounded-full transition-colors hover:bg-[rgba(11,140,0,0.12)]">
                                                <Image
                                                    src={item.actionIconSrc ?? "/icons/filedownload.svg"}
                                                    alt={item.actionIconAlt ?? "File Download"}
                                                    width={20}
                                                    height={20}
                                                />
                                            </span>
                                        </a>
                                    ) : (
                                        <div className="flex justify-center items-center w-9 h-9 bg-[rgba(11,140,0,0.05)] shadow-[0px_6px_30px_rgba(0,0,0,0.08)] rounded-full">
                                            <Image
                                                src={item.actionIconSrc ?? "/icons/filedownload.svg"}
                                                alt={item.actionIconAlt ?? "File Download"}
                                                width={20}
                                                height={20}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
}
