"use client";

import { useState } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";

interface HistoryItem {
    id: number;
    title: string;
    staff?: string;
    by?: string;
    branch: string;
    description: string;
    status?: {
        text: string;
        borderColor: string;
        textColor: string;
    };
    time: string;
    date: string;
    isLast?: boolean;
}

interface PatientOldHistoryProps {
    historyItems?: HistoryItem[];
    removeBorderAndShadow?: boolean;
    removeHorizontalPadding?: boolean;
    hideHeading?: boolean;
}

export default function PatientOldHistory({
    historyItems = [
        {
            id: 1,
            title: "Payment Verified",
            staff: "Billing Staff",
            branch: "Chandigarh",
            description: "Payment successfully verified",
            status: {
                text: "500",
                borderColor: "border-[rgba(22,163,74,0.2)]",
                textColor: "text-[#16A34A]",
            },
            time: "09:30 AM",
            date: "15-11-2025",
        },
        {
            id: 2,
            title: "Payment",
            staff: "Billing Staff",
            branch: "Chandigarh",
            description: "Payment Pending",
            status: {
                text: "Pending",
                borderColor: "border-[rgba(253,199,15,0.6)]",
                textColor: "text-[#FDC70F]",
            },
            time: "09:30 AM",
            date: "15-11-2025",
        },
        {
            id: 3,
            title: "Visit",
            by: "Dr. Jane Wilson",
            branch: "Chandigarh",
            description: "BP 132/84 · Pulse 88 · Temp 99.1°F",
            time: "09:30 AM",
            date: "15-11-2025",
        },
        {
            id: 4,
            title: "Visit",
            by: "Consultant Doctor: Nurse Thompson",
            branch: "Chandigarh",
            description: "Routine OPD visit completed for mild fever and weakness",
            time: "09:30 AM",
            date: "15-11-2025",
            isLast: true,
        },
    ],
    removeBorderAndShadow = false,
    removeHorizontalPadding = false,
    hideHeading = false,
}: PatientOldHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [itemsToShow, setItemsToShow] = useState(4);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleViewMore = () => {
        setItemsToShow(10); // Show 10 items (total)
    };

    // Get history items to display
    const displayedItems =
        itemsToShow >= 10 && historyItems.length > 10 ? historyItems : historyItems.slice(0, itemsToShow);
    const hasMoreItems = historyItems.length > itemsToShow && itemsToShow < 10;

    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] bg-white pb-6 pt-5 ${removeHorizontalPadding ? 'px-2' : 'px-6'} ${removeBorderAndShadow ? 'px-4' : 'border border-[#E3EEE1] shadow-[0px_20px_40px_rgba(34,56,43,0.08)]'}`}>
            {!hideHeading && (
                <div
                    className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                    onClick={handleToggleExpand}
                >
                    <div className="flex items-center gap-2">
                        <Image src="/icons/patient_history.svg" alt="Patient History Icon" width={22} height={22} />
                        <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">Patient old history</h2>
                    </div>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform duration-300 ${isExpanded ? "" : "rotate-180"}`}
                    >
                        <path
                            d="M3.75 12.6254C3.73365 12.6254 3.71726 12.6218 3.70215 12.6156C3.68694 12.6093 3.67277 12.5999 3.66113 12.5883C3.64961 12.5767 3.64006 12.5633 3.63379 12.5482C3.62753 12.5331 3.62407 12.5167 3.62402 12.5004C3.62402 12.4841 3.6276 12.4676 3.63379 12.4525C3.64009 12.4373 3.64949 12.4231 3.66113 12.4115L9.91113 6.1615C9.92274 6.14988 9.93697 6.14045 9.95215 6.13416C9.96724 6.12794 9.98367 6.12439 10 6.12439C10.0163 6.12443 10.0328 6.12791 10.0479 6.13416L10.0879 6.1615L16.3379 12.4115C16.3614 12.435 16.375 12.4671 16.375 12.5004C16.3749 12.5335 16.3613 12.5648 16.3379 12.5883C16.3145 12.6117 16.2831 12.6253 16.25 12.6254C16.2168 12.6254 16.1846 12.6118 16.1611 12.5883L10.3535 6.77966L10 6.42615L3.83789 12.5883C3.82632 12.5998 3.81295 12.6093 3.79785 12.6156C3.78275 12.6219 3.76634 12.6253 3.75 12.6254Z"
                            stroke="#434956"
                        />
                    </svg>
                </div>
            )}

            {isExpanded ? (
                displayedItems.length > 0 ? (
                    <>
                        {false ? (
                            <>
                                <div className="history_old mt-5">
                                    <ScrollableContainer maxHeight="400px" className="pr-2" showScrollbar={true}>
                                        <div>
                                            {displayedItems.map((item, index) => {
                                                const isLastItem = index === displayedItems.length - 1 || item.isLast;
                                                return (
                                                    <div key={item.id} className="flex">
                                                        <div className="flex flex-col items-center mr-4">
                                                            <span className="w-2 h-2 bg-[#0B8C00] rounded-full shrink-0"></span>
                                                            {!isLastItem && <span className="w-[2px] h-full bg-[#D9D9D9]"></span>}
                                                        </div>

                                                        <div className={`flex-1 ${!isLastItem ? "mb-5" : ""} flex flex-col gap-1`}>
                                                            <h3 className="font-inter font-medium text-[16px] leading-[120%] text-[#262D3B]">
                                                                {item.title}
                                                            </h3>
                                                            {item.staff && (
                                                                <p className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                                                    {item.staff}
                                                                </p>
                                                            )}
                                                            {item.by && (
                                                                <p className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                                                    {item.by}
                                                                </p>
                                                            )}
                                                            <p className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                                                Branch: {item.branch}
                                                            </p>
                                                            <p className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                                                {item.description}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-1">
                                                            {item.status && (
                                                                <div
                                                                    className={`px-5 py-2 flex items-center justify-center shrink-0 h-6 bg-white border ${item.status.borderColor} rounded-[30px] font-inter font-normal text-xs leading-[120%] ${item.status.textColor} w-auto`}
                                                                >
                                                                    {item.status.text}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center text-xs text-[#667085] gap-1">
                                                                ⏰ {item.time}
                                                            </div>
                                                            <div className="flex items-center text-xs text-[#667085] gap-1">
                                                                📅 {item.date}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollableContainer>

                                    {hasMoreItems && (
                                        <div className="flex justify-center mt-4">
                                            <button
                                                onClick={handleViewMore}
                                                className="cursor-pointer flex flex-row justify-center items-center px-3 py-1.5 gap-2 bg-[rgba(11,140,0,0.15)] rounded-[32px] font-inter font-medium text-xs leading-[120%] text-center text-[#0B8C00] hover:bg-[rgba(11,140,0,0.25)] transition-colors"
                                            >
                                                <Image src="/icons/Eye.svg" alt="Eye icon" width={16} height={16} />
                                                View More
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <NoDataBox message="No Data Found" />
                        )}



                    </>) : (
                    <NoDataBox message="No Data Found" />
                )
            ) : null}
        </div>
    );
}

