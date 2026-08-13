"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  FormInputField,
  TableSearchInput,
  Dialog,
  MessageDialog,
  Badge,
  Pagination,
} from "@/components/ui";
import {
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiPlusCircle,
  FiMinusCircle,
  FiShield,
  FiZap,
  FiCreditCard,
  FiSend,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { FaCrown, FaWallet, FaCoins, FaUniversity, FaBitcoin } from "react-icons/fa";

// ─── Data Types for User Transaction Hub ─────────────────────────────────────
export type PayoutMethod = "Bank Transfer" | "UPI Direct" | "USDT (TRC20)" | "USDT (BEP20)";
export type TxCategory = "Withdrawal" | "Daily ROI" | "Referral Bonus" | "Deposit / Plan Purchase";
export type TxStatus = "Completed" | "Pending" | "Rejected";

export type UserTransactionRecord = {
  id: string;
  category: TxCategory;
  amount: number;
  methodDetails: string;
  date: string;
  status: TxStatus;
  notes?: string;
};

export type ReferralPayoutRecord = {
  id: string;
  invitedMemberName: string;
  invitedMemberEmail: string;
  avatarInitials: string;
  levelTier: number; // 1 to 6
  packageName: string;
  packagePrice: number;
  commissionPercent: number;
  earnedAmount: number;
  date: string;
};

const MOCK_REFERRAL_PAYOUTS: ReferralPayoutRecord[] = [
  {
    id: "REF-901",
    invitedMemberName: "Rajesh Kumar",
    invitedMemberEmail: "rajesh.k@gmail.com",
    avatarInitials: "RK",
    levelTier: 1,
    packageName: "Gold Shareholder Plan",
    packagePrice: 1000,
    commissionPercent: 8,
    earnedAmount: 80.00,
    date: "2026-08-10 03:20 PM",
  },
  {
    id: "REF-902",
    invitedMemberName: "Anita Sharma",
    invitedMemberEmail: "anita.s@yahoo.com",
    avatarInitials: "AS",
    levelTier: 2,
    packageName: "Platinum Executive Plan",
    packagePrice: 2500,
    commissionPercent: 4,
    earnedAmount: 100.00,
    date: "2026-08-09 06:10 PM",
  },
  {
    id: "REF-903",
    invitedMemberName: "Vikram Malhotra",
    invitedMemberEmail: "vikram.m@techcorp.in",
    avatarInitials: "VM",
    levelTier: 1,
    packageName: "VIP Diamond Master",
    packagePrice: 5000,
    commissionPercent: 10,
    earnedAmount: 500.00,
    date: "2026-08-07 11:45 AM",
  },
  {
    id: "REF-904",
    invitedMemberName: "Priya Patel",
    invitedMemberEmail: "priya.p@outlook.com",
    avatarInitials: "PP",
    levelTier: 3,
    packageName: "Starter Yield Plan",
    packagePrice: 250,
    commissionPercent: 2,
    earnedAmount: 5.00,
    date: "2026-08-05 02:15 PM",
  },
  {
    id: "REF-905",
    invitedMemberName: "Amit Verma",
    invitedMemberEmail: "verma.amit@gmail.com",
    avatarInitials: "AV",
    levelTier: 1,
    packageName: "Gold Shareholder Plan",
    packagePrice: 1000,
    commissionPercent: 8,
    earnedAmount: 80.00,
    date: "2026-08-02 09:30 AM",
  },
];

// ─── Mock Transaction History ────────────────────────────────────────────────
const MOCK_USER_TRANSACTIONS: UserTransactionRecord[] = [
  {
    id: "WD-8921",
    category: "Withdrawal",
    amount: 1450.00,
    methodDetails: "USDT (TRC20) • TX9z...kP3a9",
    date: "2026-08-11 10:45 AM",
    status: "Pending",
    notes: "Requested payout via USDT TRC20 network",
  },
  {
    id: "TX-1092",
    category: "Daily ROI",
    amount: 22.00,
    methodDetails: "Gold Shareholder Plan (2.2% Daily ROI)",
    date: "2026-08-11 08:00 AM",
    status: "Completed",
    notes: "Automated daily ROI yield credit",
  },
  {
    id: "WD-8918",
    category: "Withdrawal",
    amount: 350.00,
    methodDetails: "UPI Direct • priya@upi",
    date: "2026-08-10 02:00 PM",
    status: "Completed",
    notes: "Approved and transferred via UPI Instant Direct",
  },
  {
    id: "TX-1091",
    category: "Referral Bonus",
    amount: 50.00,
    methodDetails: "Direct Invite Bonus • Level 1 (Rajesh K.)",
    date: "2026-08-10 03:20 PM",
    status: "Completed",
    notes: "Direct referral invite commission",
  },
  {
    id: "TX-1090",
    category: "Daily ROI",
    amount: 22.00,
    methodDetails: "Gold Shareholder Plan (2.2% Daily ROI)",
    date: "2026-08-10 08:00 AM",
    status: "Completed",
    notes: "Automated daily ROI yield credit",
  },
  {
    id: "WD-8916",
    category: "Withdrawal",
    amount: 150.00,
    methodDetails: "Bank Wire • ICICI Bank - 00120194821",
    date: "2026-08-08 05:40 PM",
    status: "Rejected",
    notes: "Rejected due to invalid account number provided",
  },
  {
    id: "TX-1089",
    category: "Deposit / Plan Purchase",
    amount: 1000.00,
    methodDetails: "Gold Shareholder Plan Purchase",
    date: "2026-07-15 11:30 AM",
    status: "Completed",
    notes: "60-Day Fixed Interest Product Package",
  },
];

export default function UserTransactionPage() {
  // Financial Balances State
  const [withdrawableBalance, setWithdrawableBalance] = useState<number>(4850.0);
  const minWithdrawalLimit = 50.0;

  // Withdrawal Form State
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod>("Bank Transfer");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  // Bank Wire Form Fields
  const [accountHolderName, setAccountHolderName] = useState<string>("Sunil Reddy");
  const [bankName, setBankName] = useState<string>("HDFC Bank");
  const [accountNumber, setAccountNumber] = useState<string>("5010023910293");
  const [ifscCode, setIfscCode] = useState<string>("HDFC0001234");

  // Crypto USDT Form Fields
  const [cryptoAddress, setCryptoAddress] = useState<string>("TX9z...kP3a9");

  // History Filter State
  const [transactions, setTransactions] = useState<UserTransactionRecord[]>(MOCK_USER_TRANSACTIONS);
  const [activeCategoryTab, setActiveCategoryTab] = useState<"All" | "Withdrawal" | "Daily ROI" | "Referral Bonus">("All");
  const [activeStatusTab, setActiveStatusTab] = useState<"All" | "Completed" | "Pending" | "Rejected">("All");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Confirmation Modal & Toast State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [toastState, setToastState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const showToast = (message: string) => {
    setToastState({ open: true, message });
  };

  // Read sync state from localStorage if available
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("dventures_user_state");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.walletBalance != null) setWithdrawableBalance(parsed.walletBalance);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Filtered Transactions List
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (activeCategoryTab !== "All" && t.category !== activeCategoryTab) return false;
      if (activeStatusTab !== "All" && t.status !== activeStatusTab) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          t.id.toLowerCase().includes(term) ||
          t.methodDetails.toLowerCase().includes(term) ||
          t.category.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [transactions, activeCategoryTab, activeStatusTab, searchTerm]);

  // Paginated Transactions
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Handle Quick Amount Preset Click
  const handleQuickPreset = (amount: number) => {
    if (amount > withdrawableBalance) {
      setWithdrawAmount(String(withdrawableBalance));
    } else {
      setWithdrawAmount(String(amount));
    }
  };

  // Open Confirmation Modal
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      showToast("Please enter a valid withdrawal amount.");
      return;
    }
    if (amt < minWithdrawalLimit) {
      showToast(`Minimum withdrawal amount is $${minWithdrawalLimit.toFixed(2)} USD.`);
      return;
    }
    if (amt > withdrawableBalance) {
      showToast(`Insufficient balance. Maximum withdrawable: $${withdrawableBalance.toLocaleString()} USD.`);
      return;
    }

    if (selectedMethod === "Bank Transfer" && (!accountHolderName || !accountNumber || !ifscCode)) {
      showToast("Please complete all bank account details.");
      return;
    }

    if ((selectedMethod === "USDT (TRC20)" || selectedMethod === "USDT (BEP20)") && !cryptoAddress) {
      showToast("Please enter a valid USDT wallet address.");
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Submit Withdrawal Request
  const handleExecuteWithdrawal = () => {
    const amt = Number(withdrawAmount);
    const newBalance = withdrawableBalance - amt;
    setWithdrawableBalance(newBalance);

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    let destinationDetails = "";
    if (selectedMethod === "Bank Transfer") {
      destinationDetails = `Bank Wire • ${bankName} (${accountNumber.slice(-4)})`;
    } else if (selectedMethod === "UPI Direct") {
      destinationDetails = `UPI Direct • ${accountHolderName}@upi`;
    } else {
      destinationDetails = `${selectedMethod} • ${cryptoAddress.slice(0, 6)}...${cryptoAddress.slice(-4)}`;
    }

    const newTx: UserTransactionRecord = {
      id: `WD-${Math.floor(8000 + Math.random() * 1000)}`,
      category: "Withdrawal",
      amount: amt,
      methodDetails: destinationDetails,
      date: dateStr,
      status: "Pending",
      notes: "Requested withdrawal pending Super Admin approval",
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Save state to localStorage for User Dashboard & Storefront sync
    try {
      const existingStateRaw = localStorage.getItem("dventures_user_state");
      let activePlan = null;
      if (existingStateRaw) {
        try {
          const parsed = JSON.parse(existingStateRaw);
          if (parsed.activePlan) activePlan = parsed.activePlan;
        } catch (err) {
          console.error(err);
        }
      }

      const updatedState = {
        walletBalance: newBalance,
        activePlan,
        transactions: [newTx, ...transactions],
      };
      localStorage.setItem("dventures_user_state", JSON.stringify(updatedState));
    } catch (err) {
      console.error(err);
    }

    showToast(`Withdrawal request of $${amt.toFixed(2)} USD submitted! Pending admin review.`);
    setIsConfirmModalOpen(false);
    setWithdrawAmount("");
  };

  return (
    <AppShell>
      {/* Toast Notification Alert */}
      <MessageDialog
        open={toastState.open}
        onClose={() => setToastState((p) => ({ ...p, open: false }))}
        showCancel={false}
        confirmText="OK"
        message={toastState.message}
      />

      <div className="space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <FaWallet className="text-amber-600" /> User Financial Hub
              </span>
            </div>
            <PageHeading title="Withdrawals & Transaction History" />
            <p className="text-xs text-slate-500 mt-1">
              Submit payout requests via Bank Transfer or Crypto USDT, track minimum withdrawal limits ($50.00), and inspect transaction logs.
            </p>
          </div>
        </div>

        {/* FINANCIAL OVERVIEW BAR (4 KEY BALANCES) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Withdrawable Balance */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Withdrawable Balance</span>
              <FaWallet className="text-xl text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-amber-400">
              ${withdrawableBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Ready for instant payout</p>
          </div>

          {/* Card 2: Total Claimed Payouts */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Payouts Claimed</span>
              <FiCheckCircle className="text-xl text-emerald-600" />
            </div>
            <h3 className="text-3xl font-black text-slate-900">$29,230.50</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">Successful withdrawals</p>
          </div>

          {/* Card 3: Minimum Withdrawal Limit */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Min. Withdrawal Threshold</span>
              <FiDollarSign className="text-xl text-amber-600" />
            </div>
            <h3 className="text-3xl font-black text-slate-900">${minWithdrawalLimit.toFixed(2)} USD</h3>
            <p className="text-[11px] text-slate-500 font-bold mt-1">Fixed platform limit</p>
          </div>

          {/* Card 4: Processing SLA */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Payout Processing SLA</span>
              <FiClock className="text-xl text-indigo-600" />
            </div>
            <h3 className="text-2xl font-black text-indigo-900">15–30 Mins</h3>
            <p className="text-[11px] text-indigo-600 font-bold mt-1">Instant Crypto & Bank SLA</p>
          </div>
        </div>

        {/* SECTION 1: WITHDRAWAL REQUEST FORM (BANK WIRE & USDT) */}
        <form onSubmit={handleOpenConfirm} className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FiMinusCircle className="text-amber-500" /> Request Payout / Withdrawal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your payout destination, enter account details, and request your available funds.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-950 text-xs font-black border border-amber-300">
              ⚡ Min Withdrawal: ${minWithdrawalLimit.toFixed(2)} USD
            </span>
          </div>

          {/* 1. Select Payout Method */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              1. Choose Payout Method *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { id: "Bank Transfer", name: "Bank Transfer / Wire", icon: FaUniversity },
                { id: "UPI Direct", name: "UPI Direct", icon: FiCreditCard },
                { id: "USDT (TRC20)", name: "Crypto USDT (TRC20)", icon: FaCoins },
                { id: "USDT (BEP20)", name: "Crypto USDT (BEP20)", icon: FaBitcoin },
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id as PayoutMethod)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <Icon className={`text-xl ${isSelected ? "text-amber-600" : "text-slate-500"}`} />
                      {isSelected && <FiCheck className="text-amber-600 text-base font-black" />}
                    </div>
                    <span className="font-extrabold text-slate-900 text-xs">{method.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Destination Account Details */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
            <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              2. Destination Account Information
            </h4>

            {selectedMethod === "Bank Transfer" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormInputField
                    label="Account Holder Name *"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="e.g. Sunil Reddy"
                    height={42}
                  />
                </div>
                <div>
                  <FormInputField
                    label="Bank Name & Branch *"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, Main Branch"
                    height={42}
                  />
                </div>
                <div>
                  <FormInputField
                    label="Account Number / IBAN *"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 5010023910293"
                    height={42}
                  />
                </div>
                <div>
                  <FormInputField
                    label="IFSC Code / SWIFT *"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    placeholder="e.g. HDFC0001234"
                    height={42}
                  />
                </div>
              </div>
            )}

            {selectedMethod === "UPI Direct" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormInputField
                    label="Account Holder Name *"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="e.g. Sunil Reddy"
                    height={42}
                  />
                </div>
                <div>
                  <FormInputField
                    label="UPI ID / VPA *"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    placeholder="e.g. sunil@upi"
                    height={42}
                  />
                </div>
              </div>
            )}

            {(selectedMethod === "USDT (TRC20)" || selectedMethod === "USDT (BEP20)") && (
              <div className="space-y-3">
                <FormInputField
                  label={`USDT (${selectedMethod.includes("TRC20") ? "TRC20" : "BEP20"}) Wallet Address *`}
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value)}
                  placeholder="e.g. TX9zP8x9...kP3a9"
                  height={42}
                />
                <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ Double check your wallet address. Payouts sent to incorrect crypto addresses cannot be reversed.
                </p>
              </div>
            )}
          </div>

          {/* 3. Withdrawal Amount & Quick Presets */}
          <div className="space-y-3 text-xs">
            <label className="block font-black text-slate-900 uppercase tracking-wider">
              3. Withdrawal Amount ($ USD) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2">
                <FormInputField
                  label=""
                  type="number"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 500.00)"
                  height={44}
                />
              </div>

              {/* Quick Amount Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[50, 100, 250, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-lg text-xs transition-colors"
                  >
                    ${preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickPreset(withdrawableBalance)}
                  className="px-3 py-1.5 bg-slate-900 text-amber-400 font-black rounded-lg text-xs shadow hover:bg-slate-800 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl shadow-lg transition-colors flex items-center gap-2"
            >
              <FiSend className="text-amber-400" /> Submit Withdrawal Request
            </button>
          </div>
        </form>

        {/* SECTION 2: INTERACTIVE TRANSACTION HISTORY LOG TABLE */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FaCoins className="text-amber-500" /> Transaction & Payout History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect old transaction logs, pending withdrawal statuses, daily interest yields, and referral bonuses.
              </p>
            </div>

            <TableSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search Tx ID or method..."
              className="!w-[240px] min-w-[240px] shrink-0"
            />
          </div>

          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-slate-600 text-[11px] mr-1">Category:</span>
              {(["All", "Withdrawal", "Daily ROI", "Referral Bonus"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategoryTab(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-extrabold transition-all ${
                    activeCategoryTab === cat
                      ? "bg-slate-900 text-amber-400 shadow"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-slate-600 text-[11px] mr-1">Status:</span>
              {(["All", "Completed", "Pending", "Rejected"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setActiveStatusTab(st);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-extrabold transition-all ${
                    activeStatusTab === st
                      ? "bg-slate-900 text-amber-400 shadow"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions Log Table */}
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              No transactions match your search and filter criteria.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-amber-400 font-black text-[11px] uppercase">
                  <tr>
                    <th className="p-3.5">Transaction ID</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Amount ($ USD)</th>
                    <th className="p-3.5">Destination / Account Details</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-extrabold text-slate-900">{tx.id}</td>
                      <td className="p-3.5 font-bold">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            tx.category === "Withdrawal"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : tx.category === "Daily ROI"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}
                        >
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-slate-900 text-sm">
                        ${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium max-w-[220px] truncate">
                        {tx.methodDetails}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{tx.date}</td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            tx.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : tx.status === "Pending"
                              ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {tx.status === "Pending" ? "⏳ Pending Approval" : tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredTransactions.length > 0 && (
            <div className="pt-3 border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredTransactions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemsPerPageOptions={[10, 20, 50]}
              />
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM WITHDRAWAL DIALOG MODAL */}
      <Dialog
        open={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Payout Withdrawal Request"
        width={580}
        closeOnOutsideClick={false}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase block">Withdrawal Method</span>
              <span className="text-base font-black text-white">{selectedMethod}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block">Requested Payout</span>
              <span className="text-2xl font-black text-amber-400">${Number(withdrawAmount).toFixed(2)} USD</span>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-slate-900 space-y-2">
            <h4 className="font-black text-xs text-amber-950 uppercase tracking-wider">Account Destination Summary</h4>
            {selectedMethod === "Bank Transfer" && (
              <div className="space-y-1 text-slate-800 font-medium">
                <p>Holder Name: <strong>{accountHolderName}</strong></p>
                <p>Bank Name: <strong>{bankName}</strong></p>
                <p>Account / IBAN: <strong>{accountNumber}</strong></p>
                <p>IFSC / SWIFT: <strong>{ifscCode}</strong></p>
              </div>
            )}
            {selectedMethod === "UPI Direct" && (
              <div className="space-y-1 text-slate-800 font-medium">
                <p>Holder Name: <strong>{accountHolderName}</strong></p>
                <p>UPI ID / VPA: <strong>{ifscCode}</strong></p>
              </div>
            )}
            {(selectedMethod === "USDT (TRC20)" || selectedMethod === "USDT (BEP20)") && (
              <div className="space-y-1 text-slate-800 font-medium">
                <p>Wallet Address: <strong className="font-mono text-slate-900">{cryptoAddress}</strong></p>
                <p>Network: <strong>{selectedMethod}</strong></p>
              </div>
            )}
          </div>

          <p className="text-slate-500 font-medium text-[11px]">
            By confirming, your withdrawal request will be submitted to the Super Admin for instant processing.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteWithdrawal}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl shadow-lg transition-colors text-xs flex items-center gap-2"
            >
              <FiCheck className="text-amber-400" /> Confirm Withdrawal Request
            </button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
