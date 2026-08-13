"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useState, useMemo } from "react";
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiClock,
  FiCheckCircle,
  FiDollarSign,
  FiTrendingUp,
  FiArrowUpRight,
  FiArrowDownRight,
  FiFilter,
  FiSearch,
  FiCheck,
  FiX,
  FiEye,
  FiPackage,
  FiShare2,
  FiPercent,
  FiCalendar,
  FiShield,
  FiRefreshCw
} from "react-icons/fi";
import { FaCrown, FaWallet, FaExchangeAlt, FaUserTie } from "react-icons/fa";

// Types for Withdrawal Requests
interface WithdrawalRequest {
  id: string;
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  amount: number;
  method: string;
  accountDetails: string;
  date: string;
  status: "pending" | "approved" | "rejected";
}

// Types for Product Earning Plans
interface ProductPlan {
  id: string;
  name: string;
  price: number;
  dailyInterest: number; // percentage
  durationDays: number;
  activeUsers: number;
  totalPayouts: number;
  color: string;
  badge: string;
  tierBadge: string;
  bonusRewardBadge: string;
  levelCommissions: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    level5: string;
    level6: string;
  };
}

// Types for Top Referral Users
interface TopReferrer {
  rank: number;
  name: string;
  email: string;
  avatar: string;
  directInvites: number;
  teamSize: number;
  totalTurnover: number;
  referralEarnings: number;
  level: string;
}

// Initial Mock Data for Admin Portal
const INITIAL_WITHDRAWAL_REQUESTS: WithdrawalRequest[] = [
  {
    id: "WD-8921",
    user: { name: "Rajesh Kumar", email: "rajesh.k@gmail.com", avatar: "RK", role: "Share Holder" },
    amount: 1450.00,
    method: "USDT (TRC20)",
    accountDetails: "TX9z...kP3a9",
    date: "2026-08-11 10:45 AM",
    status: "pending"
  },
  {
    id: "WD-8920",
    user: { name: "Anita Sharma", email: "anita.s@yahoo.com", avatar: "AS", role: "Gold Investor" },
    amount: 820.50,
    method: "Bank Wire",
    accountDetails: "HDFC Bank - 50100239102",
    date: "2026-08-11 09:30 AM",
    status: "pending"
  },
  {
    id: "WD-8919",
    user: { name: "Vikram Malhotra", email: "vikram.m@techcorp.in", avatar: "VM", role: "VIP Platinum" },
    amount: 3200.00,
    method: "USDT (BEP20)",
    accountDetails: "0x8f2...b41c",
    date: "2026-08-10 04:15 PM",
    status: "pending"
  },
  {
    id: "WD-8918",
    user: { name: "Priya Patel", email: "priya.p@outlook.com", avatar: "PP", role: "Silver Investor" },
    amount: 350.00,
    method: "UPI Direct",
    accountDetails: "priya@upi",
    date: "2026-08-10 02:00 PM",
    status: "approved"
  },
  {
    id: "WD-8917",
    user: { name: "Amit Verma", email: "verma.amit@gmail.com", avatar: "AV", role: "Share Holder" },
    amount: 5000.00,
    method: "USDT (TRC20)",
    accountDetails: "TY3x...mQ9z1",
    date: "2026-08-09 11:20 AM",
    status: "approved"
  },
  {
    id: "WD-8916",
    user: { name: "Sunil Reddy", email: "sunil.reddy@gmail.com", avatar: "SR", role: "Bronze Member" },
    amount: 150.00,
    method: "Bank Wire",
    accountDetails: "ICICI Bank - 00120194821",
    date: "2026-08-08 05:40 PM",
    status: "rejected"
  }
];

const PRODUCT_PLANS: ProductPlan[] = [
  {
    id: "p1",
    name: "Starter Yield Plan",
    price: 250,
    dailyInterest: 1.5,
    durationDays: 60,
    activeUsers: 3420,
    totalPayouts: 185400,
    color: "from-blue-600 to-indigo-700",
    badge: "Popular for Beginners",
    tierBadge: "STARTER TIER",
    bonusRewardBadge: "⚡ Instant Activation Unlocked",
    levelCommissions: { level1: "5%", level2: "3%", level3: "2%", level4: "1%", level5: "0.5%", level6: "0.5%" }
  },
  {
    id: "p2",
    name: "Gold Shareholder Plan",
    price: 1000,
    dailyInterest: 2.2,
    durationDays: 60,
    activeUsers: 4890,
    totalPayouts: 642000,
    color: "from-amber-500 to-yellow-600",
    badge: "Highest Demand",
    tierBadge: "SHARE HOLDER TIER",
    bonusRewardBadge: "🔥 Daily Streak Bonus: +0.5% Extra Yield",
    levelCommissions: { level1: "8%", level2: "4%", level3: "3%", level4: "2%", level5: "1%", level6: "0.5%" }
  },
  {
    id: "p3",
    name: "Platinum Executive Plan",
    price: 2500,
    dailyInterest: 3.0,
    durationDays: 60,
    activeUsers: 2150,
    totalPayouts: 980500,
    color: "from-emerald-600 to-teal-700",
    badge: "Best Value",
    tierBadge: "PLATINUM EXECUTIVE",
    bonusRewardBadge: "🚀 2x Level Commissions Unlocked",
    levelCommissions: { level1: "10%", level2: "5%", level3: "4%", level4: "3%", level5: "2%", level6: "1%" }
  },
  {
    id: "p4",
    name: "VIP Diamond Master",
    price: 5000,
    dailyInterest: 4.0,
    durationDays: 60,
    activeUsers: 840,
    totalPayouts: 1240000,
    color: "from-purple-600 to-pink-700",
    badge: "Exclusive VIP Tier",
    tierBadge: "VIP DIAMOND MASTER",
    bonusRewardBadge: "👑 Max Tier Yield + Level 6 Override",
    levelCommissions: { level1: "12%", level2: "6%", level3: "5%", level4: "4%", level5: "3%", level6: "2%" }
  }
];

const TOP_REFERRERS: TopReferrer[] = [
  {
    rank: 1,
    name: "Suresh Menon",
    email: "suresh.menon@dventures.com",
    avatar: "SM",
    directInvites: 142,
    teamSize: 1850,
    totalTurnover: 284000,
    referralEarnings: 34080,
    level: "Diamond Partner"
  },
  {
    rank: 2,
    name: "Kavita Rao",
    email: "kavita.rao@gmail.com",
    avatar: "KR",
    directInvites: 98,
    teamSize: 1240,
    totalTurnover: 195000,
    referralEarnings: 23400,
    level: "Gold Shareholder"
  },
  {
    rank: 3,
    name: "Rohan Kapoor",
    email: "rohan.kapoor@techin.com",
    avatar: "RK",
    directInvites: 84,
    teamSize: 960,
    totalTurnover: 142000,
    referralEarnings: 17040,
    level: "Gold Shareholder"
  },
  {
    rank: 4,
    name: "Deepak Mehta",
    email: "deepak.mehta@yahoo.com",
    avatar: "DM",
    directInvites: 67,
    teamSize: 720,
    totalTurnover: 110000,
    referralEarnings: 13200,
    level: "Silver Leader"
  },
  {
    rank: 5,
    name: "Meera Nair",
    email: "meera.nair@hotmail.com",
    avatar: "MN",
    directInvites: 59,
    teamSize: 580,
    totalTurnover: 89000,
    referralEarnings: 10680,
    level: "Silver Leader"
  }
];

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "year">("month");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(INITIAL_WITHDRAWAL_REQUESTS);
  const [withdrawalFilter, setWithdrawalFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | "view" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalUsers = 14850;
    const activeUsers = 12420;
    const inactiveUsers = 2430;

    const pendingRequests = withdrawals.filter((w) => w.status === "pending");
    const approvedRequests = withdrawals.filter((w) => w.status === "approved");

    const pendingAmount = pendingRequests.reduce((acc, curr) => acc + curr.amount, 0);
    const approvedAmount = approvedRequests.reduce((acc, curr) => acc + curr.amount, 0) + 684200; // adding historical baseline

    const totalReferralRevenue = 1284500; // $
    const monthlyRevenue = 148900; // $
    const dailyInterestPayoutToday = 28450; // $

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      pendingCount: pendingRequests.length,
      pendingAmount,
      completedCount: 3590 + approvedRequests.length,
      completedAmount: approvedAmount,
      totalReferralRevenue,
      monthlyRevenue,
      dailyInterestPayoutToday
    };
  }, [withdrawals]);

  // Filtered withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((item) => {
      const matchesStatus = withdrawalFilter === "all" || item.status === withdrawalFilter;
      const matchesSearch =
        item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.method.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [withdrawals, withdrawalFilter, searchTerm]);

  // Handle Approve / Reject
  const handleUpdateStatus = (id: string, newStatus: "approved" | "rejected") => {
    setWithdrawals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    const item = withdrawals.find((w) => w.id === id);
    if (newStatus === "approved") {
      showToast(`Success: Withdrawal request ${id} for $${item?.amount.toFixed(2)} has been APPROVED.`);
    } else {
      showToast(`Notice: Withdrawal request ${id} has been REJECTED.`);
    }
    setModalAction(null);
    setSelectedWithdrawal(null);
  };

  return (
    <AppShell>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-[#1A2130] text-white rounded-xl shadow-2xl border border-amber-500/30 animate-bounce">
          <FiCheckCircle className="text-amber-400 text-xl shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner & Title */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-2 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-xs uppercase tracking-wider flex items-center gap-1 border border-amber-300">
              <FaCrown className="text-amber-600" /> Admin Control Portal
            </span>
            <span className="text-xs text-gray-500 font-medium">• Product Sales & Earning Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Platform Master Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time analytics for active members, product plan revenue, referral commissions, and withdrawal payouts.
          </p>
        </div>

        {/* Action Controls & Range Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            {(["today", "week", "month", "year"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                  timeRange === range
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={() => showToast("Dashboard data refreshed successfully.")}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <FiRefreshCw className="text-sm" /> Refresh Data
          </button>
        </div>
      </div>

      {/* TOP STAT CARDS (7 Primary Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Users */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Members</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">
                {stats.totalUsers.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FiUsers className="text-2xl" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-700/80 text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <FiArrowUpRight /> +12.4% this month
            </span>
            <span className="text-slate-400">Platform Total</span>
          </div>
        </div>

        {/* Card 2: Active Users */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80 relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Users</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {stats.activeUsers.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <FiUserCheck className="text-2xl" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              83.6% Active Ratio
            </span>
            <span className="text-slate-400">With purchased plans</span>
          </div>
        </div>

        {/* Card 3: Inactive Users */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80 relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive Users</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {stats.inactiveUsers.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <FiUserX className="text-2xl" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-rose-500 font-semibold flex items-center gap-1">
              16.4% Inactive
            </span>
            <span className="text-slate-400">No active plan</span>
          </div>
        </div>

        {/* Card 4: Monthly Revenue */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-amber-100 uppercase tracking-wider">Monthly Sales Revenue</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">
                ${stats.monthlyRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <FiTrendingUp className="text-2xl" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-white/20 text-xs">
            <span className="text-amber-100 font-semibold flex items-center gap-1">
              <FiArrowUpRight /> +18.2% vs last month
            </span>
            <span className="text-white/80">Product Plans</span>
          </div>
        </div>

        {/* Card 5: Pending Withdrawal Requests */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80 relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Withdrawals</p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1">
                ${stats.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <FiClock className="text-2xl" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-amber-600 font-bold px-2 py-0.5 rounded bg-amber-50">
              {stats.pendingCount} Requests Pending
            </span>
            <span className="text-slate-400">Needs Review</span>
          </div>
        </div>

        {/* Card 6: Completed Withdrawals */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80 relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Withdrawals</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                ${stats.completedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <FiCheckCircle className="text-2xl" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-emerald-600 font-semibold">
              {stats.completedCount.toLocaleString()} Processed
            </span>
            <span className="text-slate-400">Paid out</span>
          </div>
        </div>

        {/* Card 7: Total Referral Revenue Generated */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80 relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Referral Revenue Gen.</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                ${stats.totalReferralRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <FiShare2 className="text-2xl" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-indigo-600 font-semibold">Multi-Level Earning</span>
            <span className="text-slate-400">All Tiers</span>
          </div>
        </div>

        {/* Card 8: Today's Daily Interest Payouts */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80 relative overflow-hidden group hover:border-cyan-300 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Daily Interest Issued</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                ${stats.dailyInterestPayoutToday.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center">
              <FiPercent className="text-2xl" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-cyan-600 font-semibold">Automated Engine</span>
            <span className="text-slate-400">Today Payout</span>
          </div>
        </div>
      </div>

      {/* SECTION: SUPER ADMIN REFERRAL PROGRAM & LEVEL MILESTONES BANNER */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-6 shadow-xl border border-amber-300 text-slate-900">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-slate-900 text-amber-400 text-xs font-black uppercase tracking-wider">
                👑 Super Admin Program Settings
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">Referral Milestones & Sign-up Bonus Rules</h2>
            <p className="text-xs text-slate-800 font-medium mt-0.5">
              Active configuration for welcome bonuses, direct referral payouts, and Levels 1–6 cash unlock milestone tiers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-slate-900 text-amber-400 font-black rounded-xl text-xs shadow">
              🎁 Welcome Bonus: $10.00
            </span>
            <span className="px-3.5 py-1.5 bg-slate-900 text-amber-400 font-black rounded-xl text-xs shadow">
              💰 Direct Invite: $15.00
            </span>
          </div>
        </div>

        {/* Milestone Levels 1-6 Grid Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          {[
            { lvl: "Level 1", name: "Bronze Partner", target: "10-49", bonus: "$50", roi: "+0.2%" },
            { lvl: "Level 2", name: "Silver Leader", target: "50-149", bonus: "$150", roi: "+0.5%" },
            { lvl: "Level 3", name: "Gold Shareholder", target: "150-399", bonus: "$350", roi: "+1.0%" },
            { lvl: "Level 4", name: "Platinum Executive", target: "400-699", bonus: "$750", roi: "+1.5%" },
            { lvl: "Level 5", name: "Diamond VIP", target: "700-999", bonus: "$1,500", roi: "+2.0%" },
            { lvl: "Level 6", name: "Master Crown", target: "1000+", bonus: "$3,000", roi: "+3.0%" },
          ].map((m, idx) => (
            <div key={idx} className="p-3 bg-white/90 backdrop-blur-md rounded-xl border border-slate-900/10 shadow-sm text-center">
              <span className="text-[10px] font-black text-amber-900 uppercase block">{m.lvl}</span>
              <span className="font-extrabold text-slate-900 text-xs truncate block">{m.name}</span>
              <span className="text-[10px] font-bold text-slate-500 block mt-1">Quota: {m.target}</span>
              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-[10px]">
                <span className="font-black text-emerald-700">{m.bonus} Cash</span>
                <span className="font-bold text-amber-800">{m.roi} ROI</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: PRODUCT SELLING & DAILY INTEREST PLANS OVERVIEW */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <FiPackage className="text-amber-500 text-xl" />
              <h2 className="text-xl font-bold text-slate-900">Product Investment Plans & Daily Returns</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Product packages available for users to purchase. Each plan yields daily interest returns for specified duration.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            4 Active Product Packages
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRODUCT_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-amber-200/80 p-5 bg-gradient-to-b from-slate-50 via-white to-amber-50/20 relative flex flex-col justify-between hover:shadow-xl hover:border-amber-400 transition-all duration-300"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-amber-900 bg-amber-200/80 border border-amber-300">
                    ✨ {plan.tierBadge}
                  </span>
                  <span className="text-xs font-bold text-slate-500">⏳ {plan.durationDays} Days</span>
                </div>
                
                <h3 className="font-extrabold text-slate-900 text-base">{plan.name}</h3>
                
                <div className="my-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">${plan.price.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 font-medium">/ package</span>
                </div>

                {/* Yield Box */}
                <div className="p-3 bg-slate-900 text-white rounded-xl mb-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Daily ROI:</span>
                    <span className="font-extrabold text-emerald-400 text-sm">+{plan.dailyInterest}% / Day</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-amber-300 mt-1">
                    <span>Est. Total Return:</span>
                    <span className="font-bold">${(plan.price * (1 + (plan.dailyInterest * plan.durationDays) / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Level 1-6 Referral Rewards Grid */}
                <div className="mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                    🏆 Levels 1–6 Commission Rewards
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {[
                      { l: "L1", pct: plan.levelCommissions.level1 },
                      { l: "L2", pct: plan.levelCommissions.level2 },
                      { l: "L3", pct: plan.levelCommissions.level3 },
                      { l: "L4", pct: plan.levelCommissions.level4 },
                      { l: "L5", pct: plan.levelCommissions.level5 },
                      { l: "L6", pct: plan.levelCommissions.level6 },
                    ].map((item, idx) => (
                      <div key={idx} className="p-1 rounded-lg bg-amber-50 border border-amber-200/80">
                        <span className="text-[9px] font-bold text-slate-500 block">{item.l}</span>
                        <span className="text-xs font-black text-amber-900">{item.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Perk Badge */}
                <div className="p-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-900 rounded-lg text-[10px] font-black text-center mb-3">
                  {plan.bonusRewardBadge}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 text-xs flex justify-between items-center text-slate-600">
                <span>Subscribers: <strong className="text-slate-900">{plan.activeUsers.toLocaleString()}</strong></span>
                <span>Payouts: <strong className="text-slate-900">${(plan.totalPayouts / 1000).toFixed(0)}k</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: PENDING & COMPLETED WITHDRAWAL REQUESTS TABLE */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <FaWallet className="text-amber-500 text-lg" />
              <h2 className="text-xl font-bold text-slate-900">Withdrawal Request Management</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, approve, or reject user earnings withdrawal requests in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              {(["all", "pending", "approved", "rejected"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setWithdrawalFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                    withdrawalFilter === st
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Member User</th>
                <th className="py-3.5 px-4">Role Tier</th>
                <th className="py-3.5 px-4">Amount ($)</th>
                <th className="py-3.5 px-4">Payout Method</th>
                <th className="py-3.5 px-4">Account / Wallet</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No withdrawal requests matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{req.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold flex items-center justify-center text-xs">
                          {req.user.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{req.user.name}</p>
                          <p className="text-[11px] text-slate-400">{req.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                        {req.user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                      ${req.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{req.method}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{req.accountDetails}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">{req.date}</td>
                    <td className="py-3.5 px-4">
                      {req.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          <FiClock className="text-xs" /> Pending
                        </span>
                      )}
                      {req.status === "approved" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          <FiCheckCircle className="text-xs" /> Approved
                        </span>
                      )}
                      {req.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                          <FiX className="text-xs" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedWithdrawal(req);
                              setModalAction("approve");
                            }}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                            title="Approve Request"
                          >
                            <FiCheck className="text-sm" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWithdrawal(req);
                              setModalAction("reject");
                            }}
                            className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                            title="Reject Request"
                          >
                            <FiX className="text-sm" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: TOP REFERRAL PERFORMERS LEADERBOARD */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2">
              <FaCrown className="text-amber-500 text-lg" />
              <h2 className="text-xl font-bold text-slate-900">Top Referral Leaderboard</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Highest performing users by direct network invitations and generated business turnover.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
            Top 5 Promoters
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Promoter User</th>
                <th className="py-3.5 px-4">Level Role</th>
                <th className="py-3.5 px-4">Direct Invites</th>
                <th className="py-3.5 px-4">Total Team Size</th>
                <th className="py-3.5 px-4">Turnover ($)</th>
                <th className="py-3.5 px-4 text-right">Referral Earnings ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {TOP_REFERRERS.map((ref) => (
                <tr key={ref.rank} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                        ref.rank === 1
                          ? "bg-amber-400 text-slate-900 shadow"
                          : ref.rank === 2
                          ? "bg-slate-300 text-slate-800"
                          : ref.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ref.rank}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                        {ref.avatar}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{ref.name}</p>
                        <p className="text-[11px] text-slate-400">{ref.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                      {ref.level}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{ref.directInvites} Directs</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">{ref.teamSize.toLocaleString()} Members</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">${ref.totalTurnover.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 text-sm">
                    +${ref.referralEarnings.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION / ACTION MODAL */}
      {modalAction && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => {
                setModalAction(null);
                setSelectedWithdrawal(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <FiX className="text-xl" />
            </button>

            <div className="mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-2xl ${
                  modalAction === "approve" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                }`}
              >
                {modalAction === "approve" ? <FiCheckCircle /> : <FiX />}
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {modalAction === "approve" ? "Approve Withdrawal Request" : "Reject Withdrawal Request"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to {modalAction} request <strong className="text-slate-900">{selectedWithdrawal.id}</strong>?
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-slate-900">{selectedWithdrawal.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Withdrawal Amount:</span>
                <span className="font-extrabold text-amber-600 text-sm">${selectedWithdrawal.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold text-slate-800">{selectedWithdrawal.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-mono text-slate-800">{selectedWithdrawal.accountDetails}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalAction(null);
                  setSelectedWithdrawal(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedWithdrawal.id, modalAction === "approve" ? "approved" : "rejected")}
                className={`flex-1 py-2.5 text-white rounded-xl font-bold text-xs transition-colors shadow-md ${
                  modalAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Confirm {modalAction === "approve" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
