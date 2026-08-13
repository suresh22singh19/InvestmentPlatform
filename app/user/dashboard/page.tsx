"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import {
    FiCopy,
    FiShare2,
    FiCheckCircle,
    FiDollarSign,
    FiUsers,
    FiUserCheck,
    FiTrendingUp,
    FiArrowUpRight,
    FiArrowDownRight,
    FiCreditCard,
    FiClock,
    FiPlusCircle,
    FiMinusCircle,
    FiAward,
    FiPackage,
    FiZap,
    FiCheck,
    FiX,
    FiInfo
} from "react-icons/fi";
import { TbQrcode } from "react-icons/tb";
import {
    FaCrown,
    FaWallet,
    FaCoins,
    FaGift,
    FaUserFriends,
    FaChartLine,
    FaBullseye,
    FaPiggyBank,
    FaLevelUpAlt
} from "react-icons/fa";

interface EarningLog {
    id: string;
    type: "Holder Interest" | "Direct Bonus" | "Level Commission" | "Withdrawal";
    amount: number;
    currency: string;
    date: string;
    status: "Completed" | "Pending" | "Processing";
}

const INITIAL_EARNINGS: EarningLog[] = [
    { id: "TX-1092", type: "Holder Interest", amount: 22.00, currency: "USD", date: "2026-08-11 08:00 AM", status: "Completed" },
    { id: "TX-1091", type: "Direct Bonus", amount: 50.00, currency: "USD", date: "2026-08-10 03:20 PM", status: "Completed" },
    { id: "TX-1090", type: "Holder Interest", amount: 22.00, currency: "USD", date: "2026-08-10 08:00 AM", status: "Completed" },
    { id: "TX-1089", type: "Level Commission", amount: 15.50, currency: "USD", date: "2026-08-09 06:10 PM", status: "Completed" },
    { id: "TX-1088", type: "Withdrawal", amount: 100.00, currency: "USD", date: "2026-08-08 01:45 PM", status: "Completed" }
];

import { useEffect } from "react";

export default function UserDashboardPage() {
    const [currency, setCurrency] = useState<"INR" | "USD">("INR");
    const [copied, setCopied] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // User State Synced via LocalStorage
    const [walletBalance, setWalletBalance] = useState<number>(4850.0);
    const [activePlan, setActivePlan] = useState({
        name: "Gold Shareholder Product Plan",
        priceAmount: 1000,
        dailyInterestPercent: 2.2,
        durationDays: 60,
        daysRemaining: 33,
        purchasedDate: "July 15, 2026",
        tierBadge: "SHARE HOLDER TIER",
    });
    const [earningsList, setEarningsList] = useState<EarningLog[]>(INITIAL_EARNINGS);

    // Read localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = localStorage.getItem("dventures_user_state");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.walletBalance != null) setWalletBalance(parsed.walletBalance);
                if (parsed.activePlan) setActivePlan(parsed.activePlan);
                if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
                    const formattedTxs: EarningLog[] = parsed.transactions.map((tx: any) => ({
                        id: tx.id || `TX-${Math.floor(1000 + Math.random() * 9000)}`,
                        type: tx.type || "Holder Interest",
                        amount: tx.amount || 0,
                        currency: "USD",
                        date: tx.date || "Just Now",
                        status: tx.status || "Completed",
                    }));
                    setEarningsList([...formattedTxs, ...INITIAL_EARNINGS]);
                }
            }
        } catch (err) {
            console.error("Failed to read user state from localStorage:", err);
        }
    }, []);

    // Modals state
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    // Form states
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawMethod, setWithdrawMethod] = useState("Bank Wire / UPI");
    const [accountDetails, setAccountDetails] = useState("");

    const referralLink = "https://dventures.me/register?ref=DV892014";

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        showToast("Referral link copied to clipboard successfully!");
        setTimeout(() => setCopied(false), 3000);
    };

    const handleWithdrawSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
            showToast("Error: Please enter a valid withdrawal amount.");
            return;
        }
        showToast(`Success: Withdrawal request of ${withdrawAmount} ${currency} submitted for admin review!`);
        setIsWithdrawModalOpen(false);
        setWithdrawAmount("");
        setAccountDetails("");
    };

    // Strictly format currency in USD ($)
    const formatAmount = (usdValue: number) => {
        return `$${usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <AppShell>
            {/* Toast Alert */}
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-white rounded-xl shadow-2xl border border-amber-400/40 animate-bounce">
                    <FiCheckCircle className="text-amber-400 text-xl shrink-0" />
                    <span className="text-sm font-medium">{toastMessage}</span>
                </div>
            )}

            {/* HEADER SECTION: Welcome & Referral Link */}
            <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-6 pt-2 pb-8 shadow-xl text-slate-900 relative overflow-hidden">
                {/* Background decorative watermark */}
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                                <FaCrown className="text-amber-400" /> SHARE HOLDER TIER
                            </span>
                            <span className="px-2.5 py-1 bg-white/40 text-slate-900 rounded-lg text-xs font-bold backdrop-blur-sm">
                                Level 3 Gold Partner
                            </span>
                            <span className="px-2.5 py-1 bg-emerald-800 text-emerald-100 rounded-lg text-xs font-extrabold backdrop-blur-sm">
                                🎁 Welcome Bonus: $10.00
                            </span>
                            <span className="px-2.5 py-1 bg-amber-900 text-amber-200 rounded-lg text-xs font-extrabold backdrop-blur-sm">
                                💰 Direct Invite: $15.00 / user
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            Welcome to D-Ventures
                        </h1>
                        <p className="text-xs md:text-sm text-slate-800 font-medium mt-1 max-w-xl">
                            Track your daily product interest income, multi-level referral network growth, and available withdrawable balance.
                        </p>
                    </div>

                    {/* Currency Toggle & Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Currency Badge */}
                        <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-amber-400 font-extrabold rounded-xl border border-amber-400/30 text-xs shadow-md">
                            <FiDollarSign className="text-amber-400 text-sm" /> Currency: USD ($)
                        </div>

                        {/* Buy Plan Action */}
                        <button
                            onClick={() => setIsDepositModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg"
                        >
                            <FiPlusCircle className="text-amber-400 text-sm" /> Buy Product Plan
                        </button>

                        {/* Withdraw Action */}
                        <button
                            onClick={() => setIsWithdrawModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-black hover:bg-slate-50 transition-colors shadow-lg"
                        >
                            <FiMinusCircle className="text-amber-600 text-sm" /> Request Withdraw
                        </button>
                    </div>
                </div>

                {/* Referral Link Copy Bar */}
                <div className="mt-6 pt-5 border-t border-slate-900/10 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <span className="text-xs font-extrabold text-slate-900 shrink-0 flex items-center gap-1.5">
                        <FiShare2 className="text-slate-900" /> Your Invitation Link:
                    </span>
                    <div className="flex-1 flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-xl p-1.5 border border-slate-900/10 shadow-inner">
                        <input
                            type="text"
                            readOnly
                            value={referralLink}
                            className="w-full bg-transparent px-3 text-xs font-mono font-bold text-slate-800 focus:outline-none truncate"
                        />
                        <button
                            onClick={handleCopyLink}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${copied
                                ? "bg-emerald-600 text-white shadow-md"
                                : "bg-slate-900 text-amber-400 hover:bg-slate-800 shadow"
                                }`}
                        >
                            {copied ? <FiCheck /> : <FiCopy />}
                            {copied ? "Copied!" : "Copy Link"}
                        </button>
                        <button
                            onClick={() => setIsQrModalOpen(true)}
                            className="p-2 bg-amber-500/20 text-slate-900 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition-colors"
                            title="Show QR Code"
                        >
                            <TbQrcode className="text-base" />
                        </button>
                    </div>
                </div>
            </div>

            {/* SECTION: CURRENT ACTIVE PRODUCT PLAN & LEVEL PROGRESS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Package Card */}
                <div className="lg:col-span-2 bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <FaCrown className="text-9xl text-amber-400" />
                    </div>

                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                                Active Product Investment
                            </span>
                            <h2 className="text-2xl font-black text-white mt-2">{activePlan.name}</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Purchased on {activePlan.purchasedDate} • {activePlan.dailyInterestPercent}% Daily ROI Interest</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-slate-400 block font-medium">Package Value</span>
                            <span className="text-2xl font-black text-amber-400">{formatAmount(activePlan.priceAmount)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 my-4 text-xs">
                        <div>
                            <span className="text-slate-400 block">Daily ROI Return</span>
                            <span className="font-extrabold text-emerald-400 text-sm mt-0.5 block">+{formatAmount((activePlan.priceAmount * activePlan.dailyInterestPercent) / 100)} / day</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Total Days Yielded</span>
                            <span className="font-bold text-white text-sm mt-0.5 block">{60 - activePlan.daysRemaining} / 60 Days</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Total ROI Earned</span>
                            <span className="font-extrabold text-amber-400 text-sm mt-0.5 block">{formatAmount(((activePlan.priceAmount * activePlan.dailyInterestPercent) / 100) * (60 - activePlan.daysRemaining))}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Plan Status</span>
                            <span className="font-bold text-emerald-400 text-sm mt-0.5 block flex items-center gap-1">
                                <FiZap /> Active
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                            <span>Plan Maturity Progress ({Math.round(((60 - activePlan.daysRemaining) / 60) * 100)}%)</span>
                            <span>{activePlan.daysRemaining} Days Remaining</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full w-[45%] shadow-lg shadow-amber-500/50" />
                        </div>
                    </div>
                </div>

                {/* Level Status Card */}
                <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <FaLevelUpAlt className="text-amber-500 text-xl" />
                            <h3 className="text-lg font-bold text-slate-900">Your Level Status</h3>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-700">Current Role Tier:</span>
                                <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-900 font-extrabold text-xs">
                                    Share Holder Level 3
                                </span>
                            </div>
                            <p className="text-[11px] text-amber-800 mt-2 font-medium">
                                Unlocks 3rd generation team level commission payouts and 5% direct referral bonus.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-slate-700">
                            <span>Next Level: Platinum Partner (Level 4)</span>
                            <span className="text-emerald-600 font-black">+ $750 Cash Bonus</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                            <span>Target Quota Progress:</span>
                            <span>18 / 25 Direct Invites</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                            <div className="bg-gradient-to-r from-slate-900 to-amber-500 h-full rounded-full w-[72%]" />
                        </div>
                        <p className="text-[11px] text-slate-500 text-right font-medium">Invite 7 more active direct users to unlock Level 4 & claim <strong>$750 Cash Bonus</strong>!</p>
                    </div>
                </div>
            </div>

            {/* SECTION: 13 STAT GRID CARDS (Matching Reference Design EXACTLY) */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <FaChartLine className="text-amber-500" /> Network & Earnings Metrics Overview
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">Live sync with wallet</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* 1. TOTAL TEAM */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">TOTAL TEAM</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-2">4</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 text-2xl group-hover:scale-110 transition-transform">
                            <FaUserFriends />
                        </div>
                    </div>

                    {/* 2. TOTAL ACTIVE DIRECT */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">TOTAL ACTIVE DIRECT</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-2">0</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 text-2xl group-hover:scale-110 transition-transform">
                            <FiUserCheck />
                        </div>
                    </div>

                    {/* 3. TOTAL ACTIVE TEAM */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">TOTAL ACTIVE TEAM</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-2">0</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 text-2xl group-hover:scale-110 transition-transform">
                            <FiUsers />
                        </div>
                    </div>

                    {/* 4. THIS MONTH JOINING */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">THIS MONTH JOINING</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-2">4</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 text-2xl group-hover:scale-110 transition-transform">
                            <FaGift />
                        </div>
                    </div>

                    {/* 5. INCOME BALANCE */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">INCOME BALANCE</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">{formatAmount(300)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 text-2xl group-hover:scale-110 transition-transform">
                            <FaPiggyBank />
                        </div>
                    </div>

                    {/* 6. TOTAL INCOME */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">TOTAL INCOME</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">{formatAmount(300)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 text-2xl group-hover:scale-110 transition-transform">
                            <FaCoins />
                        </div>
                    </div>

                    {/* 7. HOLDER INCOME */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">HOLDER INCOME</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">{formatAmount(300)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 text-2xl group-hover:scale-110 transition-transform">
                            <FaWallet />
                        </div>
                    </div>

                    {/* 8. LEVEL INCOME */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">LEVEL INCOME</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">{formatAmount(0)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600 text-2xl group-hover:scale-110 transition-transform">
                            <FaCoins />
                        </div>
                    </div>

                    {/* 9. DIRECT INCOME */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">DIRECT INCOME</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">{formatAmount(0)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 text-2xl group-hover:scale-110 transition-transform">
                            <FaWallet />
                        </div>
                    </div>

                    {/* 10. TURNOVER INCOME */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">TURNOVER INCOME</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">{formatAmount(0)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 text-2xl group-hover:scale-110 transition-transform">
                            <FiCreditCard />
                        </div>
                    </div>

                    {/* 11. TOTAL BUSINESS */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">TOTAL BUSINESS</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">{formatAmount(0)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 text-2xl group-hover:scale-110 transition-transform">
                            <FaBullseye />
                        </div>
                    </div>

                    {/* 12. TOTAL DIRECT */}
                    <div className="bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm transition-all flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">TOTAL DIRECT</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-2">4</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 text-2xl group-hover:scale-110 transition-transform">
                            <FiUsers />
                        </div>
                    </div>

                    {/* 13. TOTAL WITHDRAW (Full row highlight) */}
                    <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 bg-gradient-to-r from-amber-100 to-amber-50 rounded-2xl p-5 border border-amber-300 shadow-sm flex justify-between items-center group">
                        <div>
                            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">TOTAL WITHDRAW</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{formatAmount(0)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 text-2xl group-hover:scale-110 transition-transform">
                            <FaCoins />
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION: TRANSACTION LOG & EARNINGS HISTORY TABLE */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Recent Earnings & Transactions</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Automated history of daily ROI credits, referral commissions, and withdrawals.</p>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
                        Last 5 Transactions
                    </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
                            <tr>
                                <th className="py-3.5 px-4">Transaction ID</th>
                                <th className="py-3.5 px-4">Income Category</th>
                                <th className="py-3.5 px-4">Amount ($ USD)</th>
                                <th className="py-3.5 px-4">Date & Time</th>
                                <th className="py-3.5 px-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {earningsList.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{log.id}</td>
                                    <td className="py-3.5 px-4">
                                        <span
                                            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${log.type === "Holder Interest"
                                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                : log.type === "Direct Bonus"
                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                    : log.type === "Level Commission"
                                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                        : "bg-slate-100 text-slate-800 border border-slate-200"
                                                }`}
                                        >
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                                        {formatAmount(log.amount)}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">{log.date}</td>
                                    <td className="py-3.5 px-4 text-right">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                                            <FiCheckCircle className="text-xs" /> {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* WITHDRAWAL MODAL */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
                        <button
                            onClick={() => setIsWithdrawModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                        >
                            <FiX className="text-xl" />
                        </button>

                        <div className="mb-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center mb-3 text-2xl font-bold">
                                <FiMinusCircle />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Request Fund Withdrawal</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Available Income Balance: <strong className="text-slate-900">{formatAmount(300)}</strong>
                            </p>
                        </div>

                        <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Select Payout Method</label>
                                <select
                                    value={withdrawMethod}
                                    onChange={(e) => setWithdrawMethod(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500/40"
                                >
                                    <option value="USDT (TRC20)">USDT Wallet (TRC20)</option>
                                    <option value="USDT (BEP20)">USDT Wallet (BEP20)</option>
                                    <option value="Bank Wire">International Bank Wire</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Withdrawal Amount ($ USD)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 100"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-amber-500/40"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Account Details / Wallet Address</label>
                                <textarea
                                    rows={2}
                                    placeholder="Enter Bank Account No, IFSC, or USDT Wallet Address..."
                                    value={accountDetails}
                                    onChange={(e) => setAccountDetails(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500/40"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsWithdrawModalOpen(false)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl font-black transition-colors shadow-lg"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BUY PLAN MODAL */}
            {isDepositModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
                        <button
                            onClick={() => setIsDepositModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                        >
                            <FiX className="text-xl" />
                        </button>

                        <div className="mb-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center mb-3 text-2xl font-bold">
                                <FiPackage />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Purchase New Product Package</h3>
                            <p className="text-xs text-slate-500 mt-1">Select a product investment plan to activate daily interest returns.</p>
                        </div>

                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {[
                                { title: "Starter Yield Plan", price: 250, roi: "1.5%/day", days: "60 Days" },
                                { title: "Gold Shareholder Plan", price: 1000, roi: "2.2%/day", days: "60 Days" },
                                { title: "Platinum Executive Plan", price: 2500, roi: "3.0%/day", days: "60 Days" },
                                { title: "VIP Diamond Master", price: 5000, roi: "4.0%/day", days: "60 Days" }
                            ].map((p, i) => (
                                <div key={i} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 transition-all">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{p.title}</h4>
                                        <p className="text-xs text-amber-700 font-semibold mt-0.5">Daily ROI: {p.roi} • {p.days}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            showToast(`Selected ${p.title} (${formatAmount(p.price)}). Redirecting to payment portal...`);
                                            setIsDepositModalOpen(false);
                                        }}
                                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-black shadow-md transition-colors"
                                    >
                                        Buy ${p.price}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* QR CODE MODAL */}
            {isQrModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center relative">
                        <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                        >
                            <FiX className="text-xl" />
                        </button>
                        <h3 className="text-lg font-black text-slate-900 mb-1">Invitation QR Code</h3>
                        <p className="text-xs text-slate-500 mb-4">Scan this QR code to register under your referral link.</p>

                        <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 inline-block my-2 shadow-inner">
                            <TbQrcode className="text-9xl text-slate-900 mx-auto" />
                        </div>

                        <p className="text-[11px] font-mono text-slate-600 mt-3 truncate px-4">{referralLink}</p>

                        <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="w-full mt-4 py-2.5 bg-slate-900 text-amber-400 rounded-xl text-xs font-black"
                        >
                            Close Window
                        </button>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
