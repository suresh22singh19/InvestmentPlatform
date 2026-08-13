"use client";

import { useState } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";
import { formatIndianAmount } from "@/store/utils/formatIndianAmount";

export interface WalletData {
    currentBalance?: string | number | null;
    remainingAmount?: string | number | null;
    availableBalance?: string | number | null;
    packageName?: string | null;
    amount?: string | number | null;
    packageAmount?: string | number | null;
    discount?: string | number | null;
    expireDate?: string | null;
    walletExists?: boolean;
}

interface PatientWalletInformationProps {
    walletData?: WalletData | null;
    onViewDetails?: () => void;
}

export default function PatientWalletInformation({
    walletData,
    onViewDetails,
}: PatientWalletInformationProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const formatAmount = (val: string | number | undefined | null) => {
        if (val === undefined || val === null || val === "") return "NA";
        const str = String(val).replace(/[Rs.\s,]/gi, "").trim();
        if (!str || isNaN(parseFloat(str))) return "NA";
        return `Rs. ${formatIndianAmount(str)}`;
    };

    const formatDiscount = (val: string | number | undefined | null) => {
        if (val === undefined || val === null || val === "") return "NA";
        if (typeof val === "number") return `${val}%`;
        const str = String(val).trim();
        if (!str) return "NA";
        return str.includes("%") ? str : `${str}%`;
    };

    const remainingVal = walletData?.currentBalance ?? walletData?.availableBalance ?? walletData?.remainingAmount;
    const amountVal = walletData?.packageAmount ?? walletData?.amount;

    const hasWalletData = Boolean(
        walletData &&
        walletData.walletExists !== false &&
        (
            (walletData.currentBalance !== undefined && walletData.currentBalance !== null && walletData.currentBalance !== "") ||
            (walletData.availableBalance !== undefined && walletData.availableBalance !== null && walletData.availableBalance !== "") ||
            (walletData.remainingAmount !== undefined && walletData.remainingAmount !== null && walletData.remainingAmount !== "") ||
            Boolean(walletData.packageName) ||
            (walletData.amount !== undefined && walletData.amount !== null && walletData.amount !== "") ||
            (walletData.packageAmount !== undefined && walletData.packageAmount !== null && walletData.packageAmount !== "") ||
            (walletData.discount !== undefined && walletData.discount !== null && walletData.discount !== "") ||
            Boolean(walletData.expireDate)
        )
    );

    return (
        <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div
                className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                onClick={handleToggleExpand}
            >
                <div className="flex items-center gap-2 ">
                    <Image src="/icons/patient_history.svg" alt="Wallet Icon" width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">Patient Wallet Information</h2>
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
                    {hasWalletData ? (
                        <div className="Room-content mt-5">
                            <ScrollableContainer maxHeight="400px" className="pr-2" showScrollbar={true}>
                                <div className="content-js">
                                    <div className="mb-5">
                                        <h5 className="font-medium text-base leading-[19px] text-center tracking-[0.03em] text-[#9FA2AB] mb-2">
                                            Remaining Amount
                                        </h5>
                                        <h4 className="font-bold text-2xl leading-[28px] text-center text-[#1D1B23]">
                                            {formatAmount(remainingVal)}
                                        </h4>
                                    </div>
                                    <div className="border border-[#EBECED] rounded-md divide-y divide-gray-200 bg-white">
                                        <div className="flex justify-between items-center px-5 py-[18px]">
                                            <p className="font-inter font-normal text-sm leading-[120%] text-[#434956]">Package</p>
                                            <p className="font-inter font-medium text-sm leading-[120%] text-right text-[#434956]">
                                                {walletData?.packageName || "NA"}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center px-5 py-[18px]">
                                            <p className="font-inter font-normal text-sm leading-[120%] text-[#434956]">Amount</p>
                                            <p className="font-inter font-medium text-sm leading-[120%] text-right text-[#434956]">
                                                {formatAmount(amountVal)}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center px-5 py-[18px]">
                                            <p className="font-inter font-normal text-sm leading-[120%] text-[#434956]">Discount</p>
                                            <p className="font-inter font-medium text-sm leading-[120%] text-right text-[#434956]">
                                                {formatDiscount(walletData?.discount)}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center px-5 py-[18px]">
                                            <p className="font-inter font-normal text-sm leading-[120%] text-[#434956]">Expire</p>
                                            <p className="font-inter font-medium text-sm leading-[120%] text-right text-[#434956]">
                                                {walletData?.expireDate || "NA"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {/* <div className="flex justify-center mt-4">
                                    <button
                                        type="button"
                                        onClick={onViewDetails}
                                        className="cursor-pointer flex flex-row justify-center items-center px-3 py-1.5 gap-2 bg-[rgba(11,140,0,0.15)] rounded-[32px] font-inter font-medium text-xs leading-[120%] text-center text-[#0B8C00] hover:bg-[rgba(11,140,0,0.25)] transition-colors"
                                    >
                                        <Image src="/icons/Eye.svg" alt="Eye icon" width={16} height={16} />
                                        View Details
                                    </button>
                                </div> */}
                            </ScrollableContainer>
                        </div>
                    ) : (
                        <NoDataBox message="No Data Found" />
                    )}
                </>
            ) : null}
        </div>
    );
}
