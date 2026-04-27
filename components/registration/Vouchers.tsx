"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";
import type { RegistrationVoucherPanelItem } from "@/hooks/useRegistrationVoucherPanel";

function getVoucherCategoryStyle(type: string): { label: string; border: string; text: string } {
  switch (type) {
    case "opd_consultation":
    case "virtual_opd_consultation":
      return {
        label: "Consultation",
        border: "border-[rgba(37,99,235,0.2)]",
        text: "text-[#2563EB]",
      };
    case "medicine_discount":
      return {
        label: "Medicine",
        border: "border-[rgba(22,163,74,0.2)]",
        text: "text-[#16A34A]",
      };
    case "gift_voucher":
      return {
        label: "Gift",
        border: "border-[rgba(234,88,12,0.2)]",
        text: "text-[#EA580C]",
      };
    case "panchkarma_therapy":
      return {
        label: "Therapy",
        border: "border-[rgba(147,51,234,0.2)]",
        text: "text-[#9333EA]",
      };
    default: {
      const label =
        type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim() || "Voucher";
      return { label, border: "border-[#DFE0E2]", text: "text-[#434956]" };
    }
  }
}

interface VouchersProps {
  vouchers?: RegistrationVoucherPanelItem[];
  isLoading?: boolean;
  fetchError?: string | null;
  /** When user taps Claim, parent stores selection (e.g. submit with registration). */
  onClaimVoucher?: (item: RegistrationVoucherPanelItem) => void;
  /** Clears locally applied voucher (server-redeemed lines stay read-only). */
  onRemoveAppliedVoucher?: () => void;
  /** Locally claimed line key `${voucherCode}-${id}` — shown as Claimed until contact changes or submit. */
  appliedVoucherSelectionKey?: string | null;
}

const DEFAULT_VOUCHERS: RegistrationVoucherPanelItem[] = [];

export default function Vouchers({
  vouchers = DEFAULT_VOUCHERS,
  isLoading = false,
  fetchError = null,
  onClaimVoucher,
  onRemoveAppliedVoucher,
  appliedVoucherSelectionKey = null,
}: VouchersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [itemsToShow, setItemsToShow] = useState(2);

  useEffect(() => {
    setItemsToShow(2);
  }, [vouchers]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleViewMore = () => {
    setItemsToShow(10);
  };

  const handleCopyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
  };

  const displayedVouchers =
    itemsToShow >= 10 && vouchers.length > 10 ? vouchers : vouchers.slice(0, itemsToShow);
  const hasMoreItems = vouchers.length > itemsToShow && itemsToShow < 10;

  const emptyMessage = isLoading
    ? "Loading vouchers…"
    : fetchError
      ? fetchError
      : "No Data Found";

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
            <div className="vouchers-content mt-5">
              <ScrollableContainer maxHeight="400px" className="pr-2" showScrollbar={true}>
                <div>
                  {displayedVouchers.map((voucher, index) => {
                    const isLastItem = index === displayedVouchers.length - 1;
                    const cat = getVoucherCategoryStyle(voucher.type || "");
                    const lineKey = `${voucher.voucherCode}-${voucher.id}`;
                    const apiClaimed = Number(voucher.isRedeem) === 1;
                    const localHere = appliedVoucherSelectionKey === lineKey;
                    const localElsewhere =
                      !!appliedVoucherSelectionKey && appliedVoucherSelectionKey !== lineKey;
                    const available =
                      voucher.voucherAvailable === true && !apiClaimed && !localHere && !localElsewhere;
                    /** Dim cards that are unusable; keep full opacity for the user's applied selection. */
                    const cardMuted = apiClaimed || localElsewhere;
                    const isOpdConsultation = voucher.type === "opd_consultation";
                    const amountLine =
                      (voucher.benefit && String(voucher.benefit).trim() !== ""
                        ? voucher.benefit
                        : voucher.title) || "—";

                    return (
                      <div
                        key={`${voucher.voucherCode}-${voucher.id}`}
                        className={`rounded-[16px] border border-[#DFE0E2] bg-white ${!isLastItem ? "mb-4" : ""} ${cardMuted ? "opacity-[0.55]" : ""}`}
                      >
                        <div className="flex items-start justify-between px-4 py-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-[32px] h-[32px] bg-[#E8FCD9] rounded-full flex items-center justify-center shrink-0">
                              <Image src="/icons/VoucherIcon.svg" alt="icon" width={20} height={20} />
                            </div>

                            <div className="min-w-0">
                              {isOpdConsultation ? (
                                <p className="font-inter font-bold text-[16px] leading-[22px] text-[#262D3B] break-words">
                                  Free
                                </p>
                              ) : (
                                <>
                                  <p className="font-inter font-semibold text-[14px] leading-[22px] text-[#434956] truncate">
                                    {voucher.title}
                                  </p>
                                  <p className="font-inter font-bold text-[16px] leading-[22px] text-[#262D3B] break-words">
                                    {amountLine}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          <span
                            className={`px-3 py-1 flex items-center justify-center shrink-0 h-6 bg-white border ${cat.border} rounded-[30px] font-inter font-normal text-xs leading-[120%] ${cat.text} max-w-[120px] truncate`}
                          >
                            {cat.label}
                          </span>
                        </div>

                        <div className="mt-3 px-4">
                          <p className="font-inter font-medium text-[12px] leading-[20px] text-[#434956]">
                            {voucher.description}
                          </p>

                          <p className="font-inter font-medium text-[12px] leading-[20px] text-[#434956] flex flex-wrap items-center gap-1 mt-1">
                            <span>Voucher Code:</span>
                            <span className="text-[#0B8C00] font-semibold">{voucher.voucherCode}</span>
                            <button
                              type="button"
                              className="inline-flex p-0.5 rounded hover:bg-[#F3F4F6]"
                              aria-label="Copy voucher code"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCode(voucher.voucherCode);
                              }}
                            >
                              <Image
                                src="/icons/copy.svg"
                                alt="copy"
                                width={14}
                                height={14}
                                className="inline-block cursor-pointer"
                              />
                            </button>
                          </p>
                        </div>

                        <div className="mt-3">
                          {apiClaimed ? (
                            <div
                              className="w-full py-2 font-inter font-semibold text-[12px] leading-[20px] text-center text-[#6B7280] border-t border-[#DFE0E2] bg-[#FAFAFA]"
                              role="status"
                            >
                              Claimed
                            </div>
                          ) : localHere ? (
                            <button
                              type="button"
                              onClick={() => onRemoveAppliedVoucher?.()}
                              className="w-full py-2 font-inter font-semibold text-[12px] leading-[20px] text-center text-[#0C8C00] border-t border-[#DFE0E2] bg-[#FAFAFA] cursor-pointer hover:bg-[rgba(11,140,0,0.08)] transition-colors"
                              aria-label="Remove applied voucher"
                            >
                              Claimed — tap to remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!available}
                              onClick={() => onClaimVoucher?.(voucher)}
                              className={`w-full py-2 font-inter font-semibold text-[12px] leading-[20px] border-t border-[#DFE0E2] transition-colors ${
                                available
                                  ? "text-[#0C8C00] cursor-pointer hover:bg-[rgba(11,140,0,0.05)]"
                                  : "text-[#9CA3AF] cursor-not-allowed bg-[#FAFAFA]"
                              }`}
                            >
                              Claim
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollableContainer>

              {hasMoreItems && (
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
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
          <NoDataBox message={emptyMessage} />
        )
      ) : null}
    </div>
  );
}
