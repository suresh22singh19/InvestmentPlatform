"use client";

import { useState } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";

interface HealthCardInfo {
    label: string;
    value: string;
}

interface Transaction {
    id: number;
    title: string;
    orderId: string;
    coins: number;
    type: "Credit" | "Debit";
    typeColor: string;
    typeTextColor: string;
    date: string;
    time: string;
    transactionId: string;
}

interface JSHealthCardPointsProps {
    coins?: number;
    healthCardInfo?: HealthCardInfo[];
    transactions?: Transaction[];
}

export default function JSHealthCardPoints({
    coins = 1984,
    healthCardInfo = [
        { label: "UHID", value: "JSDB50452025" },
        { label: "Contact Number", value: "******4562" },
        { label: "Card Number", value: "50530301042" },
    ],
    transactions = [
        {
            id: 1,
            title: "Consultant (Reffer)",
            orderId: "3011903",
            coins: 50,
            type: "Credit",
            typeColor: "border-[rgba(22,163,74,0.2)]",
            typeTextColor: "text-[#16A34A]",
            date: "15-11-2025",
            time: "09:30 AM",
            transactionId: "#62249",
        },
        {
            id: 2,
            title: "Product",
            orderId: "3011901",
            coins: 1827,
            type: "Debit",
            typeColor: "border-[rgba(220,38,38,0.2)]",
            typeTextColor: "text-[#DC2626]",
            date: "15-11-2025",
            time: "09:30 AM",
            transactionId: "#62249",
        },
        {
            id: 3,
            title: "Consultant (Reffer)",
            orderId: "3011903",
            coins: 50,
            type: "Credit",
            typeColor: "border-[rgba(22,163,74,0.2)]",
            typeTextColor: "text-[#16A34A]",
            date: "15-11-2025",
            time: "09:30 AM",
            transactionId: "#62249",
        },
        {
            id: 4,
            title: "Product",
            orderId: "3011901",
            coins: 1827,
            type: "Debit",
            typeColor: "border-[rgba(220,38,38,0.2)]",
            typeTextColor: "text-[#DC2626]",
            date: "15-11-2025",
            time: "09:30 AM",
            transactionId: "#62249",
        },
        {
            id: 5,
            title: "Consultant (Reffer)",
            orderId: "3011903",
            coins: 50,
            type: "Credit",
            typeColor: "border-[rgba(22,163,74,0.2)]",
            typeTextColor: "text-[#16A34A]",
            date: "15-11-2025",
            time: "09:30 AM",
            transactionId: "#62249",
        },
        {
            id: 6,
            title: "Product",
            orderId: "3011901",
            coins: 1827,
            type: "Debit",
            typeColor: "border-[rgba(220,38,38,0.2)]",
            typeTextColor: "text-[#DC2626]",
            date: "15-11-2025",
            time: "09:30 AM",
            transactionId: "#62249",
        },
    ],
}: JSHealthCardPointsProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [itemsToShow, setItemsToShow] = useState(4);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) {
            setItemsToShow(4); // Reset to 4 items when expanding
        }
    };

    const handleViewMore = () => {
        setItemsToShow(10); // Show 10 items (total)
    };

    // Get transactions to display
    const displayedTransactions =
        itemsToShow >= 10 && transactions.length > 10 ? transactions : transactions.slice(0, itemsToShow);
    const hasMoreItems = transactions.length > itemsToShow && itemsToShow < 10;

    return (
        <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div
                className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                onClick={handleToggleExpand}
            >
                <div className="flex items-center gap-2">
                    <Image src="/icons/PreBookingCheck.svg" alt="Prebooking Icon" width={18} height={18} />
                    <h2 className="font-[Inter] font-medium text-base leading-[120%] text-[#262D3B]">JS Health Card Points</h2>
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
            {isExpanded ? (
                <>
                    {false ? (
                        <>
                            <div className="content-js">
                                <div className="mb-5">
                                    <h5 className="font-medium text-base leading-[19px] text-center tracking-[0.03em] text-[#9FA2AB] mb-2">Coins</h5>
                                    <h4 className="font-bold text-2xl leading-[28px] text-center text-[#1D1B23]">{coins}</h4>
                                </div>
                                <div className="border border-[#EBECED] rounded-md divide-y divide-gray-200 bg-white">
                                    {healthCardInfo.map((info, index) => (
                                        <div key={index} className="flex justify-between items-center px-5 py-[18px]">
                                            <p className="font-inter font-normal text-sm leading-[120%] text-[#434956]">{info.label}</p>
                                            <p className="font-inter font-medium text-sm leading-[120%] text-right text-[#434956]">{info.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="transaction mt-5">
                                <ScrollableContainer maxHeight="400px" className="pr-2" showScrollbar={true}>
                                    <div>
                                        {displayedTransactions.map((transaction) => (
                                            <div
                                                key={transaction.id}
                                                className="cursor-pointer px-3 py-2 bg-[rgba(223,224,226,0.05)] border border-[#DFE0E2] rounded-[12px] hover:bg-[rgba(11,140,0,0.05)] hover:border-[#0B8C00] focus:bg-[rgba(11,140,0,0.05)] focus:border-[#0B8C00] transition-colors duration-300 ease-in-out mb-3"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="leading-[12px]">
                                                        <h4 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">
                                                            {transaction.title}
                                                        </h4>
                                                        <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">
                                                            Order ID: {transaction.orderId} • Coins: {transaction.coins}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`px-4 py-1.5 bg-white border ${transaction.typeColor} rounded-[30px] font-inter font-normal text-xs leading-[120%] ${transaction.typeTextColor} w-auto ${transaction.type === "Credit" ? "text-nowrap" : ""}`}
                                                    >
                                                        {transaction.type}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">
                                                        📅 {transaction.date} • ⏰ {transaction.time}
                                                    </span>
                                                    <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">
                                                        {transaction.transactionId}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
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


                </>) :
                null
            }

        </div>

    );
}

