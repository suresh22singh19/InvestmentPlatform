"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { ListBorder } from "@/components/ui/ListBorder";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import {
  BackToPreviousPageButton,
  MessageDialog,
  Pagination,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
} from "@/components/ui";
import {
  getRedeemedVoucherHistory,
  getVoucherByCodeOrNumber,
  type RedeemedVoucherHistoryItem,
  type VoucherLookupData,
  type VoucherServiceItem,
} from "@/lib/api/voucherApi";
import { usePermission } from "@/hooks/usePermission";

const DEBOUNCE_MS = 500;
const MIN_QUERY_LEN = 3;

function formatVoucherTypeLabel(voucherType: string): string {
  return voucherType
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Display like `10-01-2026 09:52 AM` (DD-MM-YYYY, 12h). */
function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hh = String(h).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mins} ${ampm}`;
}

function formatOrderLabel(orderId: number): string {
  return `ORD-${orderId}`;
}

function formatInvoiceLabel(invoiceId: number): string {
  return `INV-${invoiceId}`;
}

function rowInAppliedDateRange(iso: string, fromYmd: string, toYmd: string): boolean {
  if (!fromYmd && !toYmd) return true;
  const t = new Date(iso).getTime();
  if (fromYmd) {
    const [y, m, day] = fromYmd.split("-").map(Number);
    const start = new Date(y, m - 1, day, 0, 0, 0, 0).getTime();
    if (t < start) return false;
  }
  if (toYmd) {
    const [y, m, day] = toYmd.split("-").map(Number);
    const end = new Date(y, m - 1, day, 23, 59, 59, 999).getTime();
    if (t > end) return false;
  }
  return true;
}

function ClaimedCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M4.07573 10.2985L0.175729 6.39855C-0.0585762 6.16424 -0.0585762 5.78434 0.175729 5.55002L1.02424 4.70148C1.25854 4.46716 1.63846 4.46716 1.87277 4.70148L4.49999 7.32869L10.1272 1.70149C10.3615 1.46718 10.7414 1.46718 10.9758 1.70149L11.8243 2.55002C12.0586 2.78432 12.0586 3.16422 11.8243 3.39855L4.92426 10.2986C4.68993 10.5329 4.31003 10.5329 4.07573 10.2985Z"
        fill="#0C8C00"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke="#434956"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyCodeIcon() {
  return (
    <svg className="cursor-pointer shrink-0" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M6.875 2.5625H16.875C17.0242 2.5625 17.167 2.62205 17.2725 2.72754C17.378 2.83303 17.4375 2.97582 17.4375 3.125V13.125C17.4375 13.2742 17.378 13.417 17.2725 13.5225C17.167 13.628 17.0242 13.6875 16.875 13.6875H13.6875V16.875C13.6875 17.0242 13.628 17.167 13.5225 17.2725C13.417 17.378 13.2742 17.4375 13.125 17.4375H3.125C2.97582 17.4375 2.83303 17.378 2.72754 17.2725C2.62205 17.167 2.5625 17.0242 2.5625 16.875V6.875C2.5625 6.72582 2.62205 6.58303 2.72754 6.47754C2.83303 6.37205 2.97582 6.3125 3.125 6.3125H6.3125V3.125C6.3125 2.97582 6.37205 2.83303 6.47754 2.72754C6.58303 2.62205 6.72582 2.5625 6.875 2.5625ZM3.6875 16.3125H12.5625V7.4375H3.6875V16.3125ZM7.4375 6.3125H13.125C13.2742 6.3125 13.417 6.37205 13.5225 6.47754C13.628 6.58303 13.6875 6.72582 13.6875 6.875V12.5625H16.3125V3.6875H7.4375V6.3125Z"
        fill="#0B8C00"
        stroke="#0B8C00"
        strokeWidth="0.125"
      />
    </svg>
  );
}

function serviceCardBenefitText(item: VoucherServiceItem): string {
  const b = item.benefit?.trim();
  if (b) return b;
  return item.title;
}

export default function VoucherPage() {
  const voucherPerm = usePermission("Vouchers", { subModule: "Vouchers" });
  const [searchInput, setSearchInput] = useState("");
  const [result, setResult] = useState<VoucherLookupData | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copyFeedbackOpen, setCopyFeedbackOpen] = useState(false);
  const fetchSeq = useRef(0);

  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyRows, setHistoryRows] = useState<RedeemedVoucherHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [isHistoryFilterOpen, setIsHistoryFilterOpen] = useState(false);
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(6);
  const historyFetchSeq = useRef(0);

  useEffect(() => {
    const q = searchInput.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResult(null);
      setSearchError(null);
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);
    setSearchError(null);

    const id = window.setTimeout(async () => {
      const seq = ++fetchSeq.current;
      try {
        const res = await getVoucherByCodeOrNumber(q);
        if (seq !== fetchSeq.current) return;

        if (res.success && res.data) {
          setResult(res.data);
          setSearchError(null);
        } else {
          setResult(null);
          setSearchError(res.message || "No voucher found for this search.");
        }
      } catch (err: unknown) {
        if (seq !== fetchSeq.current) return;
        setResult(null);
        const ax = err as { response?: { data?: { message?: string } }; message?: string };
        const msg =
          ax?.response?.data?.message ||
          ax?.message ||
          "Unable to fetch voucher. Please try again.";
        setSearchError(msg);
      } finally {
        if (seq === fetchSeq.current) setIsSearchLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(id);
  }, [searchInput]);

  const ud = result?.userdetail;
  const patientKey = ud?.phone ?? "";

  useEffect(() => {
    setHistoryVisible(false);
    setHistoryRows([]);
    setHistoryError(null);
    setHistorySearch("");
    setHistoryDateFrom("");
    setHistoryDateTo("");
    setHistoryPage(1);
    setIsHistoryFilterOpen(false);
  }, [patientKey]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyDateFrom, historyDateTo]);

  const loadRedeemedHistory = useCallback(async () => {
    const raw = ud?.phone?.trim() || "";
    const contactNumber = raw.replace(/\D/g, "").slice(-10);
    if (contactNumber.length !== 10) {
      setHistoryError("Contact number (10 digits) is required to load redeemed history.");
      setHistoryRows([]);
      return;
    }
    const seq = ++historyFetchSeq.current;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await getRedeemedVoucherHistory({ contactNumber });
      if (seq !== historyFetchSeq.current) return;
      if (res.success && Array.isArray(res.data)) {
        setHistoryRows(res.data);
        setHistoryError(null);
      } else {
        setHistoryRows([]);
        setHistoryError(res.message || "Could not load voucher history.");
      }
    } catch (err: unknown) {
      if (seq !== historyFetchSeq.current) return;
      setHistoryRows([]);
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setHistoryError(
        ax?.response?.data?.message || ax?.message || "Unable to load voucher history."
      );
    } finally {
      if (seq === historyFetchSeq.current) setHistoryLoading(false);
    }
  }, [ud?.phone]);

  useEffect(() => {
    if (!historyVisible || !result) return;
    void loadRedeemedHistory();
  }, [historyVisible, result, loadRedeemedHistory]);

  const filteredHistoryRows = useMemo(() => {
    let rows = historyRows;
    const q = historySearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const hay = [
          row.patientName,
          row.uhid,
          row.voucher,
          row.benefitMessage,
          ud?.jsHealthCardNumber,
        ]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        return hay.some((s) => s.includes(q));
      });
    }
    if (historyDateFrom || historyDateTo) {
      rows = rows.filter((row) => rowInAppliedDateRange(row.createdAt, historyDateFrom, historyDateTo));
    }
    return rows;
  }, [historyRows, historySearch, historyDateFrom, historyDateTo, ud?.jsHealthCardNumber]);

  const paginatedHistoryRows = useMemo(() => {
    const start = (historyPage - 1) * historyItemsPerPage;
    return filteredHistoryRows.slice(start, start + historyItemsPerPage);
  }, [filteredHistoryRows, historyPage, historyItemsPerPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredHistoryRows.length / historyItemsPerPage) || 1);
    if (historyPage > totalPages) {
      setHistoryPage(totalPages);
    }
  }, [filteredHistoryRows.length, historyItemsPerPage, historyPage]);

  const showResults = result !== null;

  const serviceEntries = result ? Object.entries(result.services || {}) : [];

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedbackOpen(true);
    } catch {
      setCopyFeedbackOpen(true);
    }
  };

  if (!voucherPerm.canView) {
    return (
      <AppShell>
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
          You don&apos;t have permission to view vouchers.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {!showResults ? (
        <div className="space-y-8">
          <div className="flex items-start justify-between">
            <PageHeading title="Vouchers" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="w-full overflow-hidden rounded-[20px] border border-[#DFE0E2] bg-white">
              <div className="flex flex-col items-center gap-6 p-10">
                <Image src="/icons/SearchIcon.svg" alt="" width={250} height={100} />
                <h3 className="text-center text-2xl font-medium leading-[120%] text-[#262D3B]">
                  Enter patient phone number or voucher to verify <br /> if the voucher is valid or exists.
                </h3>
                {searchError && (
                  <p className="max-w-xl text-center text-sm text-red-600" role="alert">
                    {searchError}
                  </p>
                )}
                <div className="w-[400px] max-w-full">
                  <TableSearchInput
                    value={searchInput}
                    onChange={setSearchInput}
                    placeholder="Enter patient phone number or Voucher Code"
                    isLoading={isSearchLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (

        <div className="space-y-8">
          {
            !historyVisible && (<div className="flex items-start justify-between gap-4">
              <PageHeading title="Vouchers" />
              <div className="w-[400px] max-w-full shrink-0">
                <TableSearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Enter patient phone number or Voucher Code"
                  className="!bg-white"
                  isLoading={isSearchLoading}
                />
              </div>
            </div>)}

          {
            !historyVisible && (
              <div className="grid grid-cols-1 gap-4">
                <div className="w-full overflow-hidden rounded-[20px] border border-[#DFE0E2] bg-white p-6">
                  <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row">
                    <div className="flex flex-col gap-4">
                      <h1 className="font-inter text-[32px] font-semibold leading-[120%] text-[#262D3B]">
                        {ud?.name ?? "—"}
                      </h1>

                      <div className="flex flex-wrap gap-8">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DFE0E2]">
                            <PhoneIcon />
                          </div>
                          <div>
                            <p className="mb-1 font-inter text-[12px] font-medium leading-[120%] text-[#434956]">Phone</p>
                            <p className="font-inter text-[16px] font-medium leading-[120%] text-[#262D3B]">
                              {ud?.phone ?? "—"}
                            </p>
                          </div>
                        </div>

                        {ud?.uhid ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DFE0E2]">
                              <span className="text-sm font-semibold text-[#434956]">ID</span>
                            </div>
                            <div>
                              <p className="mb-1 font-inter text-[12px] font-medium leading-[120%] text-[#434956]">UHID</p>
                              <p className="font-inter text-[16px] font-medium leading-[120%] text-[#262D3B]">{ud.uhid}</p>
                            </div>
                          </div>
                        ) : null}

                        {ud?.jsHealthCardNumber ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DFE0E2]">
                              <span className="text-xs font-semibold text-[#434956]">HC</span>
                            </div>
                            <div>
                              <p className="mb-1 font-inter text-[12px] font-medium leading-[120%] text-[#434956]">
                                Health Card Number
                              </p>
                              <p className="font-inter text-[16px] font-medium leading-[120%] text-[#262D3B]">
                                {ud.jsHealthCardNumber}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryVisible((v) => !v)}
                      className={`flex h-[41px] cursor-pointer flex-row items-center justify-center gap-1 rounded-[32px] border px-6 py-3 transition-colors md:h-[36px] lg:h-[41px] ${historyVisible
                        ? "border-[#0B8C00] bg-[#0B8C00]/10"
                        : "border-[#0B8C00] hover:bg-[#0B8C00]/10"
                        }`}
                      aria-expanded={historyVisible}
                    >
                      <span className="text-center font-[Inter] text-sm font-medium leading-[120%] text-[#0B8C00]">
                        {historyVisible ? "Hide Vouchers History" : "View Vouchers History"}
                      </span>
                    </button>
                  </div>

                  {searchError && (
                    <p className="mb-4 text-sm text-red-600" role="alert">
                      {searchError}
                    </p>
                  )}

                  {serviceEntries.length === 0 ? (
                    <p className="text-sm text-[#434956]">No voucher bundles found for this search.</p>
                  ) : (
                    serviceEntries.map(([code, items]) => (
                      <div
                        key={code}
                        className="mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] p-5 last:mb-0"
                      >
                        <h2 className="mb-6 flex flex-wrap items-center gap-2 text-base font-medium leading-[120%] text-[#262D3B]">
                          <Image src="/icons/VoucherIcon.svg" alt="" width={24} height={24} />
                          <span>Vouchers Code:</span>
                          <span className="flex items-center gap-1 font-semibold">
                            {code}
                            <button
                              type="button"
                              onClick={() => copyCode(code)}
                              className="inline-flex rounded p-0.5 hover:bg-[#0B8C00]/10"
                              aria-label={`Copy voucher code ${code}`}
                            >
                              <CopyCodeIcon />
                            </button>
                          </span>
                        </h2>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {items.map((item) => {
                            const redeemed = Number(item.isRedeem) === 1;
                            return (
                              <div
                                key={`${code}-${item.id}-${item.type}`}
                                className="rounded-[16px] border border-[#DFE0E2] bg-white"
                              >
                                <div className="flex items-start justify-between px-4 py-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#0C8C00]/15">
                                      <Image src="/icons/VoucherIcon.svg" alt="" width={18} height={18} />
                                    </div>
                                    <div>
                                      <p className="mb-[4px] font-inter text-[14px] font-semibold leading-[22px] text-[#434956]">
                                        {item.title}
                                      </p>
                                      <p className="font-inter text-[16px] font-bold leading-[12px] text-[#262D3B]">
                                        {serviceCardBenefitText(item)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3 px-4">
                                  <p className="font-inter text-[12px] font-medium leading-[20px] text-[#434956]">
                                    {item.description}
                                  </p>
                                </div>

                                <div className="mt-3">
                                  {redeemed ? (
                                    <div className="flex w-full items-center justify-center gap-1 rounded-b-[16px] border-t border-[#DFE0E2] py-2 font-inter text-[12px] font-semibold leading-[20px] text-[#0C8C00]">
                                      Claimed <ClaimedCheckIcon />
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="w-full cursor-pointer rounded-b-[16px] border-t border-[#DFE0E2] py-2 font-inter text-[12px] font-semibold leading-[20px] text-[#0C8C00] transition-colors hover:bg-[rgba(11,140,0,0.05)]"
                                    >
                                      Claim
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          }




          {historyVisible ? (
            <div className="space-y-8">
              <div className="flex items-start justify-between">
                <PageHeading title="Voucher Claimed History" />
                <div className="px-5">
                  <BackToPreviousPageButton iconOnly={true} onClick={() => setHistoryVisible(false)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <ListBorder as="section" className="px-4 py-4" style={{ overflow: "visible" }}>
                  <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                    <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsHistoryFilterOpen((o) => !o)}
                            className="flex h-10 w-[108px] cursor-pointer items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white transition-colors hover:bg-[#F7FAF7]"
                          >
                            <div className="flex items-center gap-2">
                              <Image src="/icons/FilterIcon.svg" alt="" width={24} height={24} />
                              <span className="font-inter text-sm font-medium leading-[120%] text-[#0B8C00]">
                                Filter
                              </span>
                            </div>
                          </button>
                          {isHistoryFilterOpen ? (
                            <div className="absolute right-0 top-full z-50 mt-2">
                              <DateFilterDropdown
                                initialFromDate={historyDateFrom}
                                initialToDate={historyDateTo}
                                onFilter={(from, to) => {
                                  setHistoryDateFrom(from);
                                  setHistoryDateTo(to);
                                  setIsHistoryFilterOpen(false);
                                }}
                                onClear={() => {
                                  setHistoryDateFrom("");
                                  setHistoryDateTo("");
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="w-full min-w-0 sm:w-[400px] sm:flex-shrink-0">
                          <TableSearchInput
                            value={historySearch}
                            onChange={setHistorySearch}
                            placeholder="Search by Name, UHID, or Health Card No."
                            isLoading={historyLoading}
                          />
                        </div>
                      </div>
                    </div>

                    {historyError ? (
                      <p className="mb-4 text-sm text-red-600" role="alert">
                        {historyError}
                      </p>
                    ) : null}

                    <Table>
                      <TableHeader>
                        <TableRow className="bg-white">
                          <TableHead position="first">Sr no.</TableHead>
                          <TableHead>Voucher</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Benefit</TableHead>
                          <TableHead>#Order</TableHead>
                          <TableHead>#Invoice</TableHead>
                          <TableHead position="last">Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyLoading && historyRows.length === 0 ? (
                          <TableRow>
                            <TableData colSpan={7} className="text-center text-sm text-[#434956]">
                              Loading…
                            </TableData>
                          </TableRow>
                        ) : !historyLoading && filteredHistoryRows.length === 0 ? (
                          <TableRow>
                            <TableData colSpan={7} className="text-center text-sm text-[#434956]">
                              No redeemed vouchers found.
                            </TableData>
                          </TableRow>
                        ) : (
                          paginatedHistoryRows.map((row, index) => (
                            <TableRow key={row.id}>
                              <TableData>
                                {(historyPage - 1) * historyItemsPerPage + index + 1}
                              </TableData>
                              <TableData>{row.voucher}</TableData>
                              <TableData>{formatVoucherTypeLabel(row.voucherType)}</TableData>
                              <TableData>{row.benefitMessage}</TableData>
                              <TableData>{formatOrderLabel(row.orderId)}</TableData>
                              <TableData>{formatInvoiceLabel(row.invoiceId)}</TableData>
                              <TableData>{formatHistoryDate(row.createdAt)}</TableData>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {!historyLoading && filteredHistoryRows.length > 0 ? (
                      <Pagination
                        currentPage={historyPage}
                        totalItems={filteredHistoryRows.length}
                        itemsPerPage={historyItemsPerPage}
                        onPageChange={setHistoryPage}
                        onItemsPerPageChange={setHistoryItemsPerPage}
                        itemsPerPageOptions={[6, 10, 20, 50]}
                      />
                    ) : null}
                  </div>
                </ListBorder>
              </div>
            </div>
          ) : null}
        </div>
      )}
      <MessageDialog
        open={copyFeedbackOpen}
        onClose={() => setCopyFeedbackOpen(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message="Voucher code copied"
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setCopyFeedbackOpen(false)}
      />
    </AppShell>
  );
}
