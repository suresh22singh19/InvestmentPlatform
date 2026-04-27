"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";
import { useGetJSHealthCardByUhidQuery } from "@/store/api/registrationApi";

interface JSHealthCardPointsProps {
    uhid?: string;
    patientType?: string;
    onCardNumberFetched?: (cardNumber: string) => void;
}

function formatTransactionType(raw: string | null | undefined): string {
    if (raw == null || String(raw).trim() === "") {
        return "—";
    }
    const s = String(raw).trim();
    const key = s.toLowerCase();
    if (key === "consultant_by" || key === "consultant_to") {
        return "Consultancy";
    }
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null | undefined): string {
    if (iso == null || String(iso).trim() === "") return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
}

function formatTime(iso: string | null | undefined): string {
    if (iso == null || String(iso).trim() === "") return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function maskPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 4) return phone;
    return "XXXXXX" + cleaned.slice(-4);
}

const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-transform duration-300 flex-shrink-0 ${open ? "" : "rotate-180"}`}
    >
        <path
            d="M3.75 12.6254C3.73365 12.6254 3.71726 12.6218 3.70215 12.6156C3.68694 12.6093 3.67277 12.5999 3.66113 12.5883C3.64961 12.5767 3.64006 12.5633 3.63379 12.5482C3.62753 12.5331 3.62407 12.5167 3.62402 12.5004C3.62402 12.4841 3.6276 12.4676 3.63379 12.4525C3.64009 12.4373 3.64949 12.4231 3.66113 12.4115L9.91113 6.1615C9.92274 6.14988 9.93697 6.14045 9.95215 6.13416C9.96724 6.12794 9.98367 6.12439 10 6.12439C10.0163 6.12443 10.0328 6.12791 10.0479 6.13416L10.0879 6.1615L16.3379 12.4115C16.3614 12.435 16.375 12.4671 16.375 12.5004C16.3749 12.5335 16.3613 12.5648 16.3379 12.5883C16.3145 12.6117 16.2831 12.6253 16.25 12.6254C16.2168 12.6254 16.1846 12.6118 16.1611 12.5883L10.3535 6.77966L10 6.42615L3.83789 12.5883C3.82632 12.5998 3.81295 12.6093 3.79785 12.6156C3.78275 12.6219 3.76634 12.6253 3.75 12.6254Z"
            stroke="#434956"
        />
    </svg>
);

export default function JSHealthCardPoints({ uhid, patientType, onCardNumberFetched }: JSHealthCardPointsProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isTransactionsExpanded, setIsTransactionsExpanded] = useState(false);

    const isPrivate = patientType?.toLowerCase() === "private";
    const hasUhid = !!uhid && uhid.trim() !== "";

    const { data, isLoading, isError } = useGetJSHealthCardByUhidQuery(
        { uhid: uhid ?? "" },
        { skip: !hasUhid || !isPrivate }
    );

    // Notify parent with card number from API so it can auto-fill the form field
    useEffect(() => {
        if (data?.data?.cardNumber) {
            onCardNumberFetched?.(data.data.cardNumber);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.data?.cardNumber]);

    const cardData = data?.data;
    const hasData = !!cardData;

    const maskedContact = cardData?.contactNumber ? maskPhone(cardData.contactNumber) : "";

    const healthCardInfo = hasData
        ? [
              { label: "UHID", value: cardData.uhid },
              ...(maskedContact ? [{ label: "Contact Number", value: maskedContact }] : []),
              ...(cardData.cardNumber ? [{ label: "Card Number", value: cardData.cardNumber }] : []),
              ...(cardData.assignDate ? [{ label: "Assigned On", value: formatDate(cardData.assignDate) }] : []),
          ]
        : [];

    return (
        <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">

            {/* ── Main header ── */}
            <div
                className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Image src="/icons/PreBookingCheck.svg" alt="Prebooking Icon" width={18} height={18} />
                    <h2 className="font-[Inter] font-medium text-base leading-[120%] text-[#262D3B]">JS Health Card Points</h2>
                </div>
                <ChevronIcon open={isExpanded} />
            </div>

            {isExpanded && (
                <>
                    {!isPrivate ? (
                        <NoDataBox message="Available for Private patients only" />
                    ) : isLoading ? (
                        <div className="flex justify-center items-center py-6">
                            <div className="w-6 h-6 border-2 border-[#0B8C00] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : isError ? (
                        <NoDataBox message="Failed to load JS Health Card data" />
                    ) : hasData ? (
                        <div className="content-js">

                            {/* Total Coins */}
                            <div className="mb-5">
                                <h5 className="font-medium text-base leading-[19px] text-center tracking-[0.03em] text-[#9FA2AB] mb-2">Balance Points</h5>
                                <h4 className="font-bold text-2xl leading-[28px] text-center text-[#1D1B23]">{cardData.totalCoins}</h4>
                            </div>

                            {/* Card info rows */}
                            <div className="border border-[#EBECED] rounded-md divide-y divide-gray-200 bg-white mb-5">
                                {healthCardInfo.map((info, index) => (
                                    <div key={index} className="flex justify-between items-center px-5 py-[14px]">
                                        <p className="font-inter font-normal text-sm leading-[120%] text-[#434956]">{info.label}</p>
                                        <p className="font-inter font-medium text-sm leading-[120%] text-right text-[#434956]">{info.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Transactions section ── */}
                            <div className="rounded-[12px] overflow-hidden">

                                {/* Transaction header — always visible */}
                                <div
                                    className="flex items-center justify-between px-4 py-3 cursor-pointer bg-white hover:bg-[rgba(11,140,0,0.03)] transition-colors"
                                    onClick={() => setIsTransactionsExpanded(!isTransactionsExpanded)}
                                >
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M14 2V8H20" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M16 13H8" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M16 17H8" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M10 9H9H8" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        <h6 className="font-inter font-medium text-sm leading-[120%] text-[#262D3B]">
                                            JS Health Card Transaction
                                        </h6>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Transaction count badge */}
                                        {cardData.transactions.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-[rgba(11,140,0,0.12)] text-[#0B8C00] font-inter font-medium text-xs">
                                                {cardData.transactions.length}
                                            </span>
                                        )}
                                        <ChevronIcon open={isTransactionsExpanded} />
                                    </div>
                                </div>

                                {/* Transaction body */}
                                {isTransactionsExpanded && (
                                    <div className="px-3 pb-3 pt-2">
                                        {cardData.transactions.length === 0 ? (
                                            <NoDataBox message="No transactions found" />
                                        ) : (
                                            <ScrollableContainer maxHeight="320px" className="pr-1" showScrollbar={true}>
                                                <div className="flex flex-col gap-2">
                                                    {cardData.transactions.map((tx) => {
                                                        const isCredit =
                                                            String(tx.entryType ?? "").toLowerCase() === "credit";
                                                        return (
                                                            <div
                                                                key={tx.id}
                                                                className="px-3 py-2 bg-[rgba(223,224,226,0.05)] border border-[#DFE0E2] rounded-[12px] hover:bg-[rgba(11,140,0,0.05)] hover:border-[#0B8C00] transition-colors duration-200"
                                                            >
                                                                <div className="flex justify-between items-start mb-1.5">
                                                                    <div>
                                                                        <p className="font-inter font-medium text-sm leading-[120%] text-[#262D3B]">
                                                                            {formatTransactionType(tx.transactionType)}
                                                                        </p>
                                                                        <p className="font-inter font-normal text-xs leading-[120%] text-[#434956] mt-0.5">
                                                                            Points : {tx.coins}
                                                                        </p>
                                                                    </div>
                                                                    <span
                                                                        className={`px-3 py-1 rounded-[30px] border text-xs font-inter font-normal leading-[120%] ${
                                                                            isCredit
                                                                                ? "border-[rgba(22,163,74,0.2)] text-[#16A34A]"
                                                                                : "border-[rgba(220,38,38,0.2)] text-[#DC2626]"
                                                                        }`}
                                                                    >
                                                                        {isCredit ? "Credit" : "Debit"}
                                                                    </span>
                                                                </div>
                                                                <p className="font-inter font-normal text-xs leading-[120%] text-[#434956]">
                                                                    📅 {formatDate(tx.createdAt)} • ⏰ {formatTime(tx.createdAt)}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </ScrollableContainer>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <NoDataBox message="No Data Found" />
                    )}
                </>
            )}
        </div>
    );
}
