"use client";

import { useState } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";

interface Voucher {
    id: number;
    valueLabel: string;
    amount: string;
    category: string;
    categoryBorderColor: string;
    categoryTextColor: string;
    description: string;
    voucherCode: string;
    isLast?: boolean;
}

interface VouchersProps {
    vouchers?: Voucher[];
}

export default function Vouchers({
    vouchers = [
        {
            id: 1,
            valueLabel: "Value: ₹500",
            amount: "₹500",
            category: "Medicine",
            categoryBorderColor: "border-[rgba(22,163,74,0.2)]",
            categoryTextColor: "text-[#16A34A]",
            description: "10% Discount on Medicine Purchase",
            voucherCode: "JS6142467983",
        },
        {
            id: 2,
            valueLabel: "Value: ₹500",
            amount: "₹500",
            category: "Consultation",
            categoryBorderColor: "border-[rgba(37,99,235,0.2)]",
            categoryTextColor: "text-[#2563EB]",
            description: "Free OPD Consultation",
            voucherCode: "JS6142467983",
            isLast: true,
        },
    ],
}: VouchersProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [itemsToShow, setItemsToShow] = useState(2);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleViewMore = () => {
        setItemsToShow(10); // Show 10 items (total)
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        // You can add a toast notification here if needed
    };

    // Get vouchers to display
    const displayedVouchers =
        itemsToShow >= 10 && vouchers.length > 10 ? vouchers : vouchers.slice(0, itemsToShow);
    const hasMoreItems = vouchers.length > itemsToShow && itemsToShow < 10;

    return (
        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div
                className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                onClick={handleToggleExpand}
            >
                <div className="flex items-center gap-2">
                    <Image src="/icons/VoucherIcon.svg" alt="Voucher Icon" width={24} height={24} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">Vouchers</h2>
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
                displayedVouchers.length > 0 ? (
                <>
                {false ? (
                            <>
                    <div className="vouchers-content mt-5">
                        <ScrollableContainer maxHeight="400px" className="pr-2" showScrollbar={true}>
                            <div>
                                {displayedVouchers.map((voucher, index) => {
                                const isLastItem = index === displayedVouchers.length - 1 || voucher.isLast;
                                return (
                                    <div
                                        key={voucher.id}
                                        className={`rounded-[16px] border border-[#DFE0E2] bg-white ${!isLastItem ? "mb-4" : ""}`}
                                    >
                                        <div className="flex items-start justify-between px-4 py-2">
                                            <div className="flex items-start gap-3">
                                                <div className="w-[32px] h-[32px] bg-[#E8FCD9] rounded-full flex items-center justify-center">
                                                    <Image src="/icons/VoucherIcon.svg" alt="icon" width={20} height={20} />
                                                </div>

                                                <div>
                                                    <p className="font-inter font-semibold text-[14px] leading-[22px] text-[#434956]">
                                                        {voucher.valueLabel}
                                                    </p>
                                                    <p className="font-inter font-bold text-[16px] leading-[12px] text-[#262D3B]">
                                                        {voucher.amount}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`px-5 py-2 flex items-center justify-center shrink-0 h-6 bg-white border ${voucher.categoryBorderColor} rounded-[30px] font-inter font-normal text-xs leading-[120%] ${voucher.categoryTextColor} w-auto`}
                                            >
                                                {voucher.category}
                                            </span>
                                        </div>

                                        <div className="mt-3 px-4">
                                            <p className="font-inter font-medium text-[12px] leading-[20px] text-[#434956]">
                                                {voucher.description}
                                            </p>

                                            <p className="font-inter font-medium text-[12px] leading-[20px] text-[#434956] flex items-center">
                                                Voucher Code:
                                                <span className="text-[#0B8C00]">{voucher.voucherCode}</span>
                                                <Image
                                                    src="/icons/copy.svg"
                                                    alt="copy"
                                                    width={14}
                                                    height={14}
                                                    className="inline-block ml-1 cursor-pointer"
                                                    onClick={() => handleCopyCode(voucher.voucherCode)}
                                                />
                                            </p>
                                        </div>

                                        <div className="mt-3">
                                            <button className="w-full py-2 font-inter font-semibold text-[12px] leading-[20px] text-[#0C8C00] border-t border-[#DFE0E2] cursor-pointer hover:bg-[rgba(11,140,0,0.05)] transition-colors">
                                                Claim
                                            </button>
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

