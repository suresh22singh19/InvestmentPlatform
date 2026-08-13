"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  TableSearchInput,
  Dialog,
  MessageDialog,
  Badge,
  Pagination,
} from "@/components/ui";
import {
  FiCopy,
  FiShare2,
  FiCheckCircle,
  FiDollarSign,
  FiUsers,
  FiUserCheck,
  FiTrendingUp,
  FiArrowUpRight,
  FiAward,
  FiZap,
  FiCheck,
  FiClock,
  FiLock,
  FiUnlock,
} from "react-icons/fi";
import { TbQrcode } from "react-icons/tb";
import {
  FaCrown,
  FaWallet,
  FaCoins,
  FaGift,
  FaUserFriends,
  FaLevelUpAlt,
  FaAward,
} from "react-icons/fa";

// ─── Data Types for User Downline Team Members ──────────────────────────────
export type DownlineMember = {
  id: string;
  fullName: string;
  email: string;
  avatarInitials: string;
  levelTier: number; // 1 to 6
  purchasedPackage: string;
  packagePrice: number;
  commissionPercent: number;
  earnedBonus: number;
  joinedDate: string;
  status: "Active" | "Pending";
};

const MOCK_DOWNLINE_TEAM: DownlineMember[] = [
  {
    id: "MEM-101",
    fullName: "Rajesh Kumar",
    email: "rajesh.k@gmail.com",
    avatarInitials: "RK",
    levelTier: 1,
    purchasedPackage: "Gold Shareholder Plan",
    packagePrice: 1000,
    commissionPercent: 8,
    earnedBonus: 80.00,
    joinedDate: "2026-08-10",
    status: "Active",
  },
  {
    id: "MEM-102",
    fullName: "Anita Sharma",
    email: "anita.s@yahoo.com",
    avatarInitials: "AS",
    levelTier: 2,
    purchasedPackage: "Platinum Executive Plan",
    packagePrice: 2500,
    commissionPercent: 4,
    earnedBonus: 100.00,
    joinedDate: "2026-08-09",
    status: "Active",
  },
  {
    id: "MEM-103",
    fullName: "Vikram Malhotra",
    email: "vikram.m@techcorp.in",
    avatarInitials: "VM",
    levelTier: 1,
    purchasedPackage: "VIP Diamond Master",
    packagePrice: 5000,
    commissionPercent: 10,
    earnedBonus: 500.00,
    joinedDate: "2026-08-07",
    status: "Active",
  },
  {
    id: "MEM-104",
    fullName: "Priya Patel",
    email: "priya.p@outlook.com",
    avatarInitials: "PP",
    levelTier: 3,
    purchasedPackage: "Starter Yield Plan",
    packagePrice: 250,
    commissionPercent: 2,
    earnedBonus: 5.00,
    joinedDate: "2026-08-05",
    status: "Active",
  },
  {
    id: "MEM-105",
    fullName: "Amit Verma",
    email: "verma.amit@gmail.com",
    avatarInitials: "AV",
    levelTier: 1,
    purchasedPackage: "Gold Shareholder Plan",
    packagePrice: 1000,
    commissionPercent: 8,
    earnedBonus: 80.00,
    joinedDate: "2026-08-02",
    status: "Active",
  },
  {
    id: "MEM-106",
    fullName: "Deepak Mehta",
    email: "deepak.m@yahoo.com",
    avatarInitials: "DM",
    levelTier: 2,
    purchasedPackage: "Starter Yield Plan",
    packagePrice: 250,
    commissionPercent: 4,
    earnedBonus: 10.00,
    joinedDate: "2026-07-28",
    status: "Active",
  },
  {
    id: "MEM-107",
    fullName: "Gaurav Joshi",
    email: "gaurav.j@outlook.com",
    avatarInitials: "GJ",
    levelTier: 1,
    purchasedPackage: "Starter Yield Plan",
    packagePrice: 250,
    commissionPercent: 8,
    earnedBonus: 20.00,
    joinedDate: "2026-07-25",
    status: "Active",
  },
];

export default function UserReferralPage() {
  const referralLink = "https://dventures.me/register?ref=DV892014";
  const referralCode = "DV892014";

  // State
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 0>(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Toast Alert State
  const [toastState, setToastState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const showToast = (message: string) => {
    setToastState({ open: true, message });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    showToast("Referral link copied to clipboard successfully!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showToast("Referral code DV892014 copied successfully!");
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Filtered Downline Team
  const filteredTeam = useMemo(() => {
    return MOCK_DOWNLINE_TEAM.filter((m) => {
      if (selectedLevelFilter > 0 && m.levelTier !== selectedLevelFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          m.fullName.toLowerCase().includes(term) ||
          m.email.toLowerCase().includes(term) ||
          m.purchasedPackage.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [selectedLevelFilter, searchTerm]);

  // Paginated Team
  const paginatedTeam = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTeam.slice(start, start + itemsPerPage);
  }, [filteredTeam, currentPage, itemsPerPage]);

  return (
    <AppShell>
      {/* Toast Alert */}
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
                <FaCrown className="text-amber-600" /> Multi-Level Referral Network
              </span>
            </div>
            <PageHeading title="Referral Program & Level Milestone Rewards" />
            <p className="text-xs text-slate-500 mt-1">
              Invite friends to earn up to 12% Level 1–6 commissions, $15.00 direct referral rewards, and unlock up to $3,000.00 level cash bonuses!
            </p>
          </div>
        </div>

        {/* HERO REFERRAL SHARING BANNER */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-6 shadow-xl text-slate-900 border border-amber-300 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow">
                  <FaCrown className="text-amber-400" /> SHARE HOLDER TIER
                </span>
                <span className="px-2.5 py-1 bg-white/50 text-slate-900 rounded-lg text-xs font-black backdrop-blur-sm">
                  Level 3 Gold Partner
                </span>
                <span className="px-2.5 py-1 bg-emerald-800 text-emerald-100 rounded-lg text-xs font-extrabold backdrop-blur-sm">
                  🎁 Welcome Bonus: $10.00
                </span>
                <span className="px-2.5 py-1 bg-amber-900 text-amber-100 rounded-lg text-xs font-extrabold backdrop-blur-sm">
                  💰 Direct Invite: $15.00 / user
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Share Your Link & Build Your Network
              </h2>
              <p className="text-xs md:text-sm text-slate-800 font-medium mt-1 max-w-xl">
                Earn instant direct commissions when your invitees purchase product plans + unlock team override commissions down to Level 6.
              </p>
            </div>
          </div>

          {/* Referral Link & Code Copy Bar */}
          <div className="mt-6 pt-5 border-t border-slate-900/10 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <span className="text-xs font-extrabold text-slate-900 shrink-0 flex items-center gap-1.5">
              <FiShare2 className="text-slate-900" /> Your Invitation Link:
            </span>

            <div className="flex-1 flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl p-1.5 border border-slate-900/10 shadow-inner">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="w-full bg-transparent px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-slate-900 text-amber-400 hover:bg-slate-800 shadow"
                }`}
              >
                {copied ? <FiCheck /> : <FiCopy />}
                {copied ? "Copied Link!" : "Copy Link"}
              </button>

              <button
                type="button"
                onClick={handleCopyCode}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  copiedCode ? "bg-emerald-600 text-white" : "bg-amber-100 text-slate-900 hover:bg-amber-200"
                }`}
                title="Copy Code"
              >
                {copiedCode ? "Code Copied!" : `Code: ${referralCode}`}
              </button>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="p-2 bg-amber-500/20 text-slate-900 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition-colors"
                title="Show QR Code"
              >
                <TbQrcode className="text-base" />
              </button>
            </div>
          </div>
        </div>

        {/* NETWORK SUMMARY STATS (4 CARDS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Total Referral Income</span>
              <FaCoins className="text-xl text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-amber-400">$2,450.00 USD</h3>
            <p className="text-[11px] text-slate-400 mt-1">Direct & level commissions earned</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Direct Invites</span>
              <FaUserFriends className="text-xl text-emerald-600" />
            </div>
            <h3 className="text-3xl font-black text-slate-900">18 / 25 Members</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">7 more invites to Level 4</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Downline Network</span>
              <FiUsers className="text-xl text-indigo-600" />
            </div>
            <h3 className="text-3xl font-black text-indigo-950">142 Members</h3>
            <p className="text-[11px] text-indigo-600 font-bold mt-1">Across Levels 1 to 6</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Current Role Tier</span>
              <FaCrown className="text-xl text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Level 3 Gold</h3>
            <p className="text-[11px] text-amber-700 font-bold mt-1">5% Direct + 3rd Tier Override</p>
          </div>
        </div>

        {/* SECTION: LEVEL MILESTONES UNLOCK PROGRESS & CARDS (LEVELS 1 TO 6) */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FaLevelUpAlt className="text-amber-500" /> Level Milestone Unlock Rewards (Levels 1 to 6)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Reach direct invite targets to level up your role tier and claim cash unlock bonuses up to $3,000.00!
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-300">
              ⚡ Next Reward: +$750.00 Cash Bonus at Level 4
            </span>
          </div>

          {/* Level 4 Progress Bar */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Next Level: Platinum Executive (Level 4)</span>
              <span className="text-amber-400 font-black">18 / 25 Direct Invites (72%)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
              <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full w-[72%] shadow-lg shadow-amber-500/50" />
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Invite 7 more active direct users to unlock Level 4 and instantly claim your <strong>$750.00 Cash Unlock Bonus</strong>!
            </p>
          </div>

          {/* Levels 1 to 6 Milestone Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { level: 1, name: "Bronze Partner", min: 10, bonus: 50, roi: 0.2, status: "UNLOCKED", badge: "🥉 Tier 1 Unlocked: $50 Bonus" },
              { level: 2, name: "Silver Leader", min: 50, bonus: 150, roi: 0.5, status: "UNLOCKED", badge: "🥈 Tier 2 Unlocked: $150 Bonus" },
              { level: 3, name: "Gold Shareholder", min: 150, bonus: 350, roi: 1.0, status: "ACTIVE", badge: "🥇 Tier 3 Unlocked: $350 Bonus + 5% Direct" },
              { level: 4, name: "Platinum Executive", min: 400, bonus: 750, roi: 1.5, status: "IN PROGRESS", badge: "💎 Tier 4 Unlocked: $750 Bonus + Priority Payout" },
              { level: 5, name: "Diamond VIP", min: 700, bonus: 1500, roi: 2.0, status: "LOCKED", badge: "👑 Tier 5 Unlocked: $1,500 Bonus + VIP Manager" },
              { level: 6, name: "Master Crown Shareholder", min: 1000, bonus: 3000, roi: 3.0, status: "LOCKED", badge: "🔥 Level 6 Max Crown: $3,000 Bonus + Max Override" },
            ].map((m) => (
              <div
                key={m.level}
                className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                  m.status === "ACTIVE"
                    ? "border-amber-400 bg-amber-50/70 shadow-lg ring-2 ring-amber-500/20"
                    : m.status === "UNLOCKED"
                    ? "border-emerald-200 bg-emerald-50/40"
                    : m.status === "IN PROGRESS"
                    ? "border-blue-300 bg-blue-50/40"
                    : "border-slate-200 bg-slate-50/60 opacity-80"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-400 font-black text-[10px] uppercase">
                      Level {m.level}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        m.status === "ACTIVE"
                          ? "bg-amber-500 text-slate-900 font-black"
                          : m.status === "UNLOCKED"
                          ? "bg-emerald-600 text-white"
                          : m.status === "IN PROGRESS"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900 mb-1">{m.name}</h4>
                  <p className="text-xs font-bold text-slate-600 mb-3">Target Quota: {m.min}+ Direct Referrals</p>

                  <div className="p-3 bg-slate-900 text-white rounded-xl mb-3 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-bold uppercase">Cash Unlock Bonus</span>
                      <span className="text-base font-black text-amber-400">+${m.bonus.toLocaleString()} USD</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block font-bold uppercase">ROI Boost</span>
                      <span className="text-base font-black text-emerald-400">+{m.roi}% / Day</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] font-black text-slate-900 truncate">
                  {m.badge}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION: LEVELS 1 TO 6 COMMISSION STRUCTURE GRID */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FaAward className="text-amber-500" /> Levels 1 to 6 Network Commission Structure
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Override commission percentages earned from downline product purchases.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center text-xs">
            {[
              { level: "Level 1", rate: "8% to 12%", desc: "Direct Invites" },
              { level: "Level 2", rate: "4% to 6%", desc: "2nd Tier Team" },
              { level: "Level 3", rate: "3% to 5%", desc: "3rd Tier Team" },
              { level: "Level 4", rate: "2% to 4%", desc: "4th Tier Team" },
              { level: "Level 5", rate: "1% to 3%", desc: "5th Tier Team" },
              { level: "Level 6", rate: "0.5% to 2%", desc: "6th Tier Team" },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-slate-900 space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-900 block">{item.level}</span>
                <span className="text-base font-black text-slate-900 block">{item.rate}</span>
                <span className="text-[10px] font-bold text-slate-500 block">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION: INVITED DOWNLINE TEAM LOG TABLE */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FiUsers className="text-amber-500" /> Downline Invited Team Members ({MOCK_DOWNLINE_TEAM.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect your invited members down to Level 6, package purchases, and earned referral commissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedLevelFilter}
                onChange={(e) => {
                  setSelectedLevelFilter(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value={0}>All Downline Levels</option>
                <option value={1}>Level 1 (Direct)</option>
                <option value={2}>Level 2 Team</option>
                <option value={3}>Level 3 Team</option>
                <option value={4}>Level 4 Team</option>
                <option value={5}>Level 5 Team</option>
                <option value={6}>Level 6 Team</option>
              </select>

              <TableSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search member name..."
                className="!w-[220px] min-w-[220px] shrink-0"
              />
            </div>
          </div>

          {/* Table */}
          {filteredTeam.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              No team members match your search or filter.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-amber-400 font-black text-[11px] uppercase">
                  <tr>
                    <th className="p-3.5">Member Name</th>
                    <th className="p-3.5">Downline Level</th>
                    <th className="p-3.5">Purchased Package</th>
                    <th className="p-3.5">Commission Rate</th>
                    <th className="p-3.5">Bonus Earned ($)</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                  {paginatedTeam.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-400 shrink-0">
                            {m.avatarInitials}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block">{m.fullName}</span>
                            <span className="text-[10px] text-slate-400">{m.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-400 font-black text-[10px] uppercase">
                          Level {m.levelTier}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {m.purchasedPackage} <span className="text-slate-400 font-medium">(${m.packagePrice})</span>
                      </td>
                      <td className="p-3.5 font-black text-amber-800">{m.commissionPercent}%</td>
                      <td className="p-3.5 font-black text-emerald-600 text-sm">
                        +${m.earnedBonus.toFixed(2)} USD
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{m.joinedDate}</td>
                      <td className="p-3.5 text-right">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredTeam.length > 0 && (
            <div className="pt-3 border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredTeam.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemsPerPageOptions={[10, 20, 50]}
              />
            </div>
          )}
        </div>
      </div>

      {/* QR CODE MODAL */}
      <Dialog
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Your Referral QR Code"
        width={420}
        closeOnOutsideClick={true}
      >
        <div className="text-center space-y-4 py-2 text-xs">
          <div className="p-4 bg-amber-100/60 rounded-2xl border border-amber-300 inline-block">
            <TbQrcode className="text-9xl text-slate-900 mx-auto" />
          </div>
          <div>
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Scan to Register</span>
            <span className="text-xs font-mono font-bold text-amber-700 block mt-0.5">{referralCode}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl text-xs transition-colors shadow"
          >
            Copy Invitation Link
          </button>
        </div>
      </Dialog>
    </AppShell>
  );
}
