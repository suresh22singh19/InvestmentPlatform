"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";
import { useGetJSHealthCardByUhidQuery } from "@/store/api/registrationApi";

interface JSHealthCardPointsProps {
    uhid?: string;
    patientType?: string;
    /**
     * Called after the API resolves.
     * - Receives the ACTIVE card number when the patient currently has an active card.
     * - Receives `null` when the patient only has inactive (closed) cards, meaning a
     *   NEW card can be assigned to this patient.
     */
    onCardNumberFetched?: (cardNumber: string | null) => void;
}

type JSTransaction = {
    id: number;
    coins: number;
    entryType?: string;
    transactionType?: string | null;
    createdAt?: string | null;
    isHold?: boolean;
    holdUntil?: string | null;
    expiresAt?: string | null;
    isExpired?: boolean;
};

type JSCard = {
    uhid?: string;
    cardNumber?: string;
    assignDate?: string;
    contactNumber?: string;
    totalCoins?: number;
    availableCoins?: number;
    isCompPackageReceived?: boolean;
    isCompPackageUsed?: boolean;
    compPackageNotUsedReason?: string | null;
    cardName?: string;
    cardId?: number;
    isCardSwitched?: boolean;
    status?: string;
    transactions?: JSTransaction[];
};

function isInactiveCard(card: JSCard | null | undefined): boolean {
    return String(card?.status ?? "").trim().toLowerCase() === "inactive";
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
    const spaced = s
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
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

/** Card info rows (UHID, contact, card no., assign date, comp. package, etc.). */
function CardInfoRows({ card, hideCompPackage = false, showBalancePoints = false, isClosedCard = false }: { card: JSCard; hideCompPackage?: boolean; showBalancePoints?: boolean; isClosedCard?: boolean }) {
    const maskedContact = card.contactNumber ? maskPhone(card.contactNumber) : "";
    const rows = [
        ...(!isClosedCard ? [{ label: "UHID", value: card.uhid }] : []),
        ...(!isClosedCard && maskedContact ? [{ label: "Contact Number", value: maskedContact }] : []),
        ...(card.cardNumber ? [{ label: "Card Number", value: card.cardNumber }] : []),
        ...(card.cardName ? [{ label: "Card Name", value: card.cardName }] : []),
        ...(card.assignDate ? [{ label: "Assigned On", value: formatDate(card.assignDate) }] : []),
        // Remaining balance points — shown only for closed cards.
        ...(showBalancePoints ? [{ label: "Balance Points", value: String(card.totalCoins ?? 0) }] : []),
        // Comp. Package only applies to the patient's first card; hide it once a
        // previous card has been closed (i.e. this is a re-issued card).
        ...(!isClosedCard && !hideCompPackage && card.isCompPackageReceived !== undefined && card.isCompPackageReceived !== null
            ? [{ label: "Comp. Package", value: card.isCompPackageReceived ? "Received" : "Declined" }]
            : []),
        ...(!isClosedCard && !hideCompPackage && card.compPackageNotUsedReason && card.compPackageNotUsedReason.trim() !== ""
            ? [{ label: "Decline Reason", value: card.compPackageNotUsedReason }]
            : []),
    ].filter((r) => r.value != null && String(r.value).trim() !== "");

    return (
        <div className="border border-[#EBECED] rounded-md divide-y divide-gray-200 bg-white mb-5">
            {rows.map((info, index) => (
                <div key={index} className="flex justify-between items-center px-5 py-[14px]">
                    <p className="font-inter font-normal text-sm leading-[120%] text-[#434956]">{info.label}</p>
                    <p className="font-inter font-medium text-sm leading-[120%] text-right text-[#434956]">{info.value}</p>
                </div>
            ))}
        </div>
    );
}

/** Collapsible transactions block for a single card (manages its own open state). */
function CardTransactions({ transactions, defaultOpen = false }: { transactions: JSTransaction[]; defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const count = transactions.length;

    return (
        <div className="rounded-[12px] overflow-hidden">
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer bg-white hover:bg-[rgba(11,140,0,0.03)] transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14 2V8H20" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 13H8" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 17H8" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 9H9H8" stroke="#434956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h6 className="font-inter font-medium text-sm leading-[120%] text-[#262D3B]">
                        Health Card Transaction
                    </h6>
                </div>
                <div className="flex items-center gap-2">
                    {count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[rgba(11,140,0,0.12)] text-[#0B8C00] font-inter font-medium text-xs">
                            {count}
                        </span>
                    )}
                    <ChevronIcon open={isOpen} />
                </div>
            </div>

            {isOpen && (
                <div className="px-3 pb-3 pt-2">
                    {count === 0 ? (
                        <NoDataBox message="No transactions found" />
                    ) : (
                        <ScrollableContainer maxHeight="320px" className="pr-1" showScrollbar={true}>
                            <div className="flex flex-col gap-2">
                                {transactions.map((tx) => {
                                    const isHold = tx.isHold === true || String(tx.isHold).toLowerCase() === "true";
                                    const isExpired = tx.isExpired === true || String(tx.isExpired).toLowerCase() === "true";
                                    const isCredit = String(tx.entryType ?? "").toLowerCase() === "credit";

                                    let statusLabel = "";
                                    let statusClass = "";

                                    if (isHold) {
                                        statusLabel = "Hold";
                                        statusClass = "border-[rgba(249,115,22,0.2)] text-[#EA580C] bg-[rgba(249,115,22,0.05)]";
                                    } else if (isExpired) {
                                        statusLabel = "Expired";
                                        statusClass = "border-[rgba(107,114,128,0.2)] text-[#4B5563] bg-[rgba(107,114,128,0.05)]";
                                    } else if (isCredit) {
                                        statusLabel = "Credit";
                                        statusClass = "border-[rgba(22,163,74,0.2)] text-[#16A34A] bg-[rgba(22,163,74,0.05)]";
                                    } else {
                                        statusLabel = "Debit";
                                        statusClass = "border-[rgba(220,38,38,0.2)] text-[#DC2626] bg-[rgba(220,38,38,0.05)]";
                                    }

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
                                                    className={`px-3 py-1 rounded-[30px] border text-xs font-inter font-normal leading-[120%] ${statusClass}`}
                                                >
                                                    {statusLabel}
                                                </span>
                                            </div>
                                            <p className="font-inter font-normal text-xs leading-[120%] text-[#434956]">
                                                📅 {formatDate(tx.createdAt)} • ⏰ {formatTime(tx.createdAt)}
                                            </p>
                                            {(isHold || tx.expiresAt) && (
                                                <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-col gap-1.5 text-[11px] text-[#434956]">
                                                    {isHold && (
                                                        <div className="flex items-center gap-1.5 text-[#434956] px-0 py-1 rounded-[6px]">
                                                            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-8V7m0 0v2m0-2a9 9 0 110 18 9 9 0 010-18z" />
                                                            </svg>
                                                            <span className="font-semibold shrink-0">On Hold Until:</span>
                                                            <span className="text-[#262D3B]">{formatDate(tx.holdUntil)}</span>
                                                        </div>
                                                    )}
                                                    {tx.expiresAt && (
                                                        <div className="flex items-center gap-1.5 text-[#434956] px-0 py-0.5">
                                                            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="font-semibold shrink-0">Expires:</span>
                                                            <span className="text-[#262D3B]">{formatDate(tx.expiresAt)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollableContainer>
                    )}
                </div>
            )}
        </div>
    );
}

/** Full active-card view: balance points + info rows + transactions. */
function ActiveCardView({ card, hideCompPackage = false }: { card: JSCard; hideCompPackage?: boolean }) {
    return (
        <div className="content-js">
            <div className="mb-5">
                <h5 className="font-medium text-base leading-[19px] text-center tracking-[0.03em] text-[#9FA2AB] mb-2">Balance Points</h5>
                <h4 className="font-bold text-2xl leading-[28px] text-center text-[#1D1B23]">{card.totalCoins ?? 0}</h4>
            </div>
            <CardInfoRows card={card} hideCompPackage={hideCompPackage} />
            <CardTransactions transactions={card.transactions ?? []} />
        </div>
    );
}

/** A single inactive or switched card inside the "Closed and Switched Cards History" section. */
function InactiveCardEntry({ card, index }: { card: JSCard; index: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const title = card.cardNumber || card.cardName || `Card ${index + 1}`;

    const status = String(card.status ?? "").trim().toLowerCase();
    const isSwitched = card.isCardSwitched === true || String(card.isCardSwitched).toLowerCase() === "true";

    let statusLabel = "Closed";
    if (status === "inactive" && isSwitched) {
        statusLabel = "closed(switched)";
    } else if (status === "active" && isSwitched) {
        statusLabel = "Switched";
    } else if (isSwitched) {
        statusLabel = "Switched";
    } else if (status === "inactive") {
        statusLabel = "Closed";
    }

    return (
        <div className="border border-[#EBECED] rounded-[12px] overflow-hidden bg-white">
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(107,114,128,0.03)] transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-col">
                    <span className="font-inter font-medium text-sm leading-[120%] text-[#262D3B]">{title}</span>
                    {card.assignDate && (
                        <span className="font-inter font-normal text-xs leading-[120%] text-[#9FA2AB] mt-0.5">
                            Assigned {formatDate(card.assignDate)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full border border-[rgba(107,114,128,0.2)] text-[#4B5563] bg-[rgba(107,114,128,0.06)] font-inter font-medium text-xs">
                        {statusLabel}
                    </span>
                    <ChevronIcon open={isOpen} />
                </div>
            </div>

            {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-[#EBECED]">
                    <CardInfoRows card={card} showBalancePoints isClosedCard />
                    <CardTransactions transactions={card.transactions ?? []} />
                </div>
            )}
        </div>
    );
}

/** Collapsible section listing all closed and switched cards. */
function InactiveCardsSection({ cards }: { cards: JSCard[] }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mt-5 rounded-[12px] border border-[#EBECED] overflow-hidden">
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer bg-[rgba(107,114,128,0.03)] hover:bg-[rgba(107,114,128,0.06)] transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h6 className="font-inter font-medium text-sm leading-[120%] text-[#262D3B]">
                    Closed and Switched Cards History
                </h6>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[rgba(107,114,128,0.12)] text-[#4B5563] font-inter font-medium text-xs">
                        {cards.length}
                    </span>
                    <ChevronIcon open={isOpen} />
                </div>
            </div>

            {isOpen && (
                <div className="p-3 flex flex-col gap-2">
                    {cards.map((card, i) => (
                        <InactiveCardEntry key={card.cardId ?? card.cardNumber ?? i} card={card} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function JSHealthCardPoints({ uhid, patientType, onCardNumberFetched }: JSHealthCardPointsProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const isPrivate = patientType?.toLowerCase() === "private";
    const hasUhid = !!uhid && uhid.trim() !== "";

    const { data, isLoading, isError } = useGetJSHealthCardByUhidQuery(
        { uhid: uhid ?? "" },
        {
            skip: !hasUhid || !isPrivate,
            refetchOnMountOrArgChange: true
        }
    );

    // Normalize API payload into an array of cards (backend may still return a
    // single object for older records, so we defensively support both shapes).
    const cards: JSCard[] = useMemo(() => {
        const raw = data?.data as JSCard | JSCard[] | undefined;
        if (!raw) return [];
        return Array.isArray(raw) ? raw : [raw];
    }, [data]);

    // Active card: status === "active" && !isCardSwitched (or fallback to first active card)
    const activeCard = useMemo(() => {
        const foundActiveNonSwitched = cards.find((c) => {
            const status = String(c.status ?? "").trim().toLowerCase();
            const isSwitched = c.isCardSwitched === true || String(c.isCardSwitched).toLowerCase() === "true";
            return status === "active" && !isSwitched;
        });
        if (foundActiveNonSwitched) return foundActiveNonSwitched;

        const foundAnyActive = cards.find((c) => String(c.status ?? "").trim().toLowerCase() === "active");
        if (foundAnyActive) return foundAnyActive;

        return null;
    }, [cards]);

    // History cards (Closed & Switched cards): all cards except the activeCard
    const historyCards = useMemo(() => {
        if (!activeCard) return cards;
        return cards.filter((c) => c !== activeCard);
    }, [cards, activeCard]);

    const activeCardNumber = activeCard?.cardNumber ?? null;

    // Notify parent:
    // - active card number → parent auto-fills & locks the Health Card field.
    // - null when cards exist but none active → parent lets user assign a NEW card.
    useEffect(() => {
        if (isLoading) return;
        if (activeCardNumber) {
            onCardNumberFetched?.(activeCardNumber);
        } else if (cards.length > 0) {
            onCardNumberFetched?.(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCardNumber, cards.length, isLoading]);

    const hasAnyCard = cards.length > 0;

    return (
        <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">

            {/* ── Main header ── */}
            <div
                className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Image src="/icons/PreBookingCheck.svg" alt="Prebooking Icon" width={18} height={18} />
                    <h2 className="font-[Inter] font-medium text-base leading-[120%] text-[#262D3B]">Health Card Points</h2>
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
                        <NoDataBox message="Failed to load Health Card data" />
                    ) : !hasAnyCard ? (
                        <NoDataBox message="No Data Found" />
                    ) : (
                        <>
                            {activeCard ? (
                                <ActiveCardView card={activeCard} hideCompPackage={historyCards.length > 0} />
                            ) : (
                                <div className="rounded-[12px] border-2 border-dashed border-[#F1D0A9] bg-[rgba(249,115,22,0.04)] px-4 py-5 text-center mb-1">
                                    <p className="font-inter font-medium text-sm leading-[140%] text-[#B45309]">
                                        This patient has no active Health Card.
                                    </p>
                                    <p className="font-inter font-normal text-xs leading-[140%] text-[#8A5A1F] mt-1">
                                        The previous card is closed. You can assign a new Health Card to this patient.
                                    </p>
                                </div>
                            )}

                            {historyCards.length > 0 && <InactiveCardsSection cards={historyCards} />}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
