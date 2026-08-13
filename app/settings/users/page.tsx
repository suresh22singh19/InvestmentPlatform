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
import { usePermission } from "@/hooks/usePermission";
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiDollarSign,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiToggleLeft,
  FiToggleRight,
  FiPackage,
  FiActivity,
  FiCheck,
  FiX,
  FiClock,
  FiMail,
} from "react-icons/fi";
import { FaCrown, FaWallet, FaCoins, FaUserClock } from "react-icons/fa";

// ─── Data Types for Super Admin User Portal ─────────────────────────────────
export type PurchasedPackage = {
  id: string;
  packageName: string;
  priceAmount: number;
  dailyInterestPercent: number;
  durationDays: number;
  daysRemaining: number;
  purchasedDate: string;
  status: "Active" | "Completed";
};

export type MemberTransaction = {
  id: string;
  type: "Deposit" | "Daily ROI" | "Referral Bonus" | "Level Reward" | "Withdrawal";
  amount: number;
  date: string;
  status: "Completed" | "Pending" | "Rejected";
  details: string;
};

export type SuperAdminUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  joinedDate: string;
  avatarInitials: string;
  status: "Active" | "Inactive" | "Pending";
  roleTier: string; // e.g. "Gold Shareholder (Level 3)"
  levelNumber: number; // 1 to 6
  lifetimeEarnings: number;
  withdrawableBalance: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  directReferralsCount: number;
  purchasedPackages: PurchasedPackage[];
  transactions: MemberTransaction[];
};

// ─── 25+ Comprehensive Realistic User Records (Including Pending Requests) ──
const INITIAL_MOCK_USERS: SuperAdminUser[] = [
  // PENDING REGISTRATION REQUESTS
  {
    id: 1099,
    fullName: "Ramesh Patel",
    email: "ramesh.patel@gmail.com",
    phone: "+91 99887 76655",
    joinedDate: "2026-08-11 (10 mins ago)",
    avatarInitials: "RP",
    status: "Pending",
    roleTier: "Bronze Partner (Level 1)",
    levelNumber: 1,
    lifetimeEarnings: 0.00,
    withdrawableBalance: 0.00,
    totalWithdrawals: 0.00,
    pendingWithdrawals: 0,
    directReferralsCount: 0,
    purchasedPackages: [],
    transactions: [],
  },
  {
    id: 1098,
    fullName: "Deepa Verma",
    email: "deepa.verma@yahoo.com",
    phone: "+91 98776 65544",
    joinedDate: "2026-08-11 (45 mins ago)",
    avatarInitials: "DV",
    status: "Pending",
    roleTier: "Bronze Partner (Level 1)",
    levelNumber: 1,
    lifetimeEarnings: 0.00,
    withdrawableBalance: 0.00,
    totalWithdrawals: 0.00,
    pendingWithdrawals: 0,
    directReferralsCount: 0,
    purchasedPackages: [],
    transactions: [],
  },
  {
    id: 1097,
    fullName: "Karan Malhotra",
    email: "karan.m@outlook.com",
    phone: "+91 97665 54433",
    joinedDate: "2026-08-11 (2 hours ago)",
    avatarInitials: "KM",
    status: "Pending",
    roleTier: "Bronze Partner (Level 1)",
    levelNumber: 1,
    lifetimeEarnings: 0.00,
    withdrawableBalance: 0.00,
    totalWithdrawals: 0.00,
    pendingWithdrawals: 0,
    directReferralsCount: 0,
    purchasedPackages: [],
    transactions: [],
  },
  {
    id: 1096,
    fullName: "Alok Sharma",
    email: "alok.sharma@techin.com",
    phone: "+91 96554 43322",
    joinedDate: "2026-08-10",
    avatarInitials: "AS",
    status: "Pending",
    roleTier: "Bronze Partner (Level 1)",
    levelNumber: 1,
    lifetimeEarnings: 0.00,
    withdrawableBalance: 0.00,
    totalWithdrawals: 0.00,
    pendingWithdrawals: 0,
    directReferralsCount: 0,
    purchasedPackages: [],
    transactions: [],
  },

  // ACTIVE USERS
  {
    id: 1001,
    fullName: "Suresh Menon",
    email: "suresh.menon@dventures.com",
    phone: "+91 98765 43210",
    joinedDate: "2026-01-15",
    avatarInitials: "SM",
    status: "Active",
    roleTier: "Master Crown (Level 6)",
    levelNumber: 6,
    lifetimeEarnings: 34080.50,
    withdrawableBalance: 4850.00,
    totalWithdrawals: 29230.50,
    pendingWithdrawals: 0,
    directReferralsCount: 142,
    purchasedPackages: [
      { id: "PK-901", packageName: "VIP Diamond Master", priceAmount: 5000, dailyInterestPercent: 4.0, durationDays: 60, daysRemaining: 32, purchasedDate: "2026-07-10", status: "Active" },
      { id: "PK-902", packageName: "Platinum Executive Plan", priceAmount: 2500, dailyInterestPercent: 3.0, durationDays: 60, daysRemaining: 15, purchasedDate: "2026-06-20", status: "Active" },
    ],
    transactions: [
      { id: "TX-101", type: "Daily ROI", amount: 200.00, date: "2026-08-11", status: "Completed", details: "Daily 4.0% yield on VIP Diamond Plan" },
      { id: "TX-102", type: "Referral Bonus", amount: 150.00, date: "2026-08-10", status: "Completed", details: "Level 1 invite reward from Rajesh K." },
      { id: "TX-103", type: "Withdrawal", amount: 3000.00, date: "2026-08-05", status: "Completed", details: "Withdrawal to USDT (TRC20)" },
    ],
  },
  {
    id: 1002,
    fullName: "Rajesh Kumar",
    email: "rajesh.k@gmail.com",
    phone: "+91 98123 45678",
    joinedDate: "2026-02-10",
    avatarInitials: "RK",
    status: "Active",
    roleTier: "Gold Shareholder (Level 3)",
    levelNumber: 3,
    lifetimeEarnings: 14250.00,
    withdrawableBalance: 1450.00,
    totalWithdrawals: 12800.00,
    pendingWithdrawals: 1450.00,
    directReferralsCount: 48,
    purchasedPackages: [
      { id: "PK-801", packageName: "Gold Shareholder Plan", priceAmount: 1000, dailyInterestPercent: 2.2, durationDays: 60, daysRemaining: 33, purchasedDate: "2026-07-15", status: "Active" },
    ],
    transactions: [
      { id: "TX-201", type: "Withdrawal", amount: 1450.00, date: "2026-08-11", status: "Pending", details: "Withdrawal request pending admin approval" },
      { id: "TX-202", type: "Daily ROI", amount: 22.00, date: "2026-08-11", status: "Completed", details: "Daily 2.2% yield on Gold Shareholder Plan" },
    ],
  },
  {
    id: 1003,
    fullName: "Kavita Rao",
    email: "kavita.rao@gmail.com",
    phone: "+91 97654 32109",
    joinedDate: "2026-02-18",
    avatarInitials: "KR",
    status: "Active",
    roleTier: "Diamond VIP (Level 5)",
    levelNumber: 5,
    lifetimeEarnings: 23400.00,
    withdrawableBalance: 3200.00,
    totalWithdrawals: 20200.00,
    pendingWithdrawals: 0,
    directReferralsCount: 98,
    purchasedPackages: [
      { id: "PK-701", packageName: "Platinum Executive Plan", priceAmount: 2500, dailyInterestPercent: 3.0, durationDays: 60, daysRemaining: 41, purchasedDate: "2026-07-22", status: "Active" },
    ],
    transactions: [
      { id: "TX-301", type: "Level Reward", amount: 1500.00, date: "2026-08-08", status: "Completed", details: "Level 5 Milestone Cash Unlock Bonus" },
    ],
  },
  {
    id: 1004,
    fullName: "Anita Sharma",
    email: "anita.s@yahoo.com",
    phone: "+91 95432 10987",
    joinedDate: "2026-03-05",
    avatarInitials: "AS",
    status: "Active",
    roleTier: "Silver Leader (Level 2)",
    levelNumber: 2,
    lifetimeEarnings: 4820.00,
    withdrawableBalance: 820.50,
    totalWithdrawals: 4000.00,
    pendingWithdrawals: 820.50,
    directReferralsCount: 24,
    purchasedPackages: [
      { id: "PK-601", packageName: "Starter Yield Plan", priceAmount: 250, dailyInterestPercent: 1.5, durationDays: 60, daysRemaining: 28, purchasedDate: "2026-07-09", status: "Active" },
    ],
    transactions: [
      { id: "TX-401", type: "Withdrawal", amount: 820.50, date: "2026-08-11", status: "Pending", details: "Requested payout via Bank Wire" },
    ],
  },

  // INACTIVE USERS
  {
    id: 1006,
    fullName: "Sunil Reddy",
    email: "sunil.reddy@gmail.com",
    phone: "+91 93210 98765",
    joinedDate: "2026-04-01",
    avatarInitials: "SR",
    status: "Inactive",
    roleTier: "Bronze Partner (Level 1)",
    levelNumber: 1,
    lifetimeEarnings: 350.00,
    withdrawableBalance: 0.00,
    totalWithdrawals: 350.00,
    pendingWithdrawals: 0,
    directReferralsCount: 5,
    purchasedPackages: [],
    transactions: [],
  },
  {
    id: 1011,
    fullName: "Meenakshi Sundaram",
    email: "meena.s@gmail.com",
    phone: "+91 88765 43210",
    joinedDate: "2026-05-20",
    avatarInitials: "MS",
    status: "Inactive",
    roleTier: "Bronze Partner (Level 1)",
    levelNumber: 1,
    lifetimeEarnings: 120.00,
    withdrawableBalance: 120.00,
    totalWithdrawals: 0.00,
    pendingWithdrawals: 0,
    directReferralsCount: 2,
    purchasedPackages: [],
    transactions: [],
  },
];

export default function UsersSettingsPage() {
  const usersPermission = usePermission("settings", { subModule: "user" });

  // Tabs & Search State
  const [activeTab, setActiveTab] = useState<"Active" | "Inactive" | "Pending">("Active");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");

  // Users Master List State
  const [usersList, setUsersList] = useState<SuperAdminUser[]>(INITIAL_MOCK_USERS);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // User Detail Inspection Dialog State
  const [selectedUserModal, setSelectedUserModal] = useState<SuperAdminUser | null>(null);

  // Toast State
  const [toastState, setToastState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const showToast = (message: string) => {
    setToastState({ open: true, message });
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      // Tab filter
      if (u.status !== activeTab) return false;

      // Role filter
      if (selectedRoleFilter !== "All" && !u.roleTier.toLowerCase().includes(selectedRoleFilter.toLowerCase())) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(term);
        const matchesEmail = u.email.toLowerCase().includes(term);
        const matchesPhone = u.phone.toLowerCase().includes(term);
        const matchesRole = u.roleTier.toLowerCase().includes(term);
        return matchesName || matchesEmail || matchesPhone || matchesRole;
      }

      return true;
    });
  }, [usersList, activeTab, selectedRoleFilter, searchTerm]);

  // Paginated Users
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Platform Metrics
  const stats = useMemo(() => {
    const totalCount = usersList.length;
    const activeCount = usersList.filter((u) => u.status === "Active").length;
    const inactiveCount = usersList.filter((u) => u.status === "Inactive").length;
    const pendingCount = usersList.filter((u) => u.status === "Pending").length;
    const totalLifetimePaid = usersList.reduce((sum, u) => sum + u.lifetimeEarnings, 0);

    return { totalCount, activeCount, inactiveCount, pendingCount, totalLifetimePaid };
  }, [usersList]);

  // APPROVE PENDING REGISTRATION
  const handleApproveUser = (user: SuperAdminUser) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: "Active" } : u))
    );

    if (selectedUserModal && selectedUserModal.id === user.id) {
      setSelectedUserModal((prev) => (prev ? { ...prev, status: "Active" } : null));
    }

    showToast(`Registration approved for "${user.fullName}". Account is now ACTIVE.`);
  };

  // REJECT PENDING REGISTRATION / SET INACTIVE
  const handleRejectUser = (user: SuperAdminUser) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: "Inactive" } : u))
    );

    if (selectedUserModal && selectedUserModal.id === user.id) {
      setSelectedUserModal((prev) => (prev ? { ...prev, status: "Inactive" } : null));
    }

    showToast(`Registration request for "${user.fullName}" has been REJECTED.`);
  };

  // Toggle User Active / Inactive Status
  const handleToggleUserStatus = (user: SuperAdminUser) => {
    const newStatus: "Active" | "Inactive" = user.status === "Active" ? "Inactive" : "Active";
    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
    );

    if (selectedUserModal && selectedUserModal.id === user.id) {
      setSelectedUserModal((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    showToast(`Member "${user.fullName}" is now ${newStatus.toUpperCase()}.`);
  };

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
        {/* Page Heading & Metrics Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <FaCrown className="text-amber-600" /> Super Admin Member Control
              </span>
            </div>
            <PageHeading title="Member Management & Registration Approvals" />
            <p className="text-xs text-slate-500 mt-1">
              Approve new member registration requests, inspect earnings & withdrawals, and manage member statuses.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3.5 py-1.5 bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow flex items-center gap-1.5 animate-pulse">
              <FaUserClock /> Pending Approvals: {stats.pendingCount}
            </span>
            <span className="px-3.5 py-1.5 bg-slate-900 text-amber-400 font-black text-xs rounded-xl shadow flex items-center gap-1">
              <FiUsers /> Total: {stats.totalCount}
            </span>
            <span className="px-3.5 py-1.5 bg-emerald-800 text-emerald-100 font-extrabold text-xs rounded-xl shadow flex items-center gap-1">
              <FiUserCheck /> Active: {stats.activeCount}
            </span>
          </div>
        </div>

        {/* TOP STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-900 rounded-2xl p-5 shadow-lg border border-amber-400">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-950">Pending Approvals</span>
              <FaUserClock className="text-2xl text-slate-900" />
            </div>
            <h3 className="text-3xl font-black text-slate-900">{stats.pendingCount} Requests</h3>
            <p className="text-[11px] font-bold text-slate-900 mt-1">Requires Super Admin Approval</p>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">Active Members</span>
              <FiUserCheck className="text-xl text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-white">{stats.activeCount} Users</h3>
            <p className="text-[11px] text-slate-400 mt-1">Full platform access</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Platform Lifetime Paid</span>
              <FiDollarSign className="text-xl text-emerald-600" />
            </div>
            <h3 className="text-3xl font-black text-slate-900">${stats.totalLifetimePaid.toLocaleString("en-US", { maximumFractionDigits: 0 })}</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">Total ROI & referral payouts</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Inactive Accounts</span>
              <FiUserX className="text-xl text-rose-500" />
            </div>
            <h3 className="text-3xl font-black text-rose-600">{stats.inactiveCount} Users</h3>
            <p className="text-[11px] text-rose-500 font-bold mt-1">Suspended or rejected</p>
          </div>
        </div>

        {/* TABS & TOOLBAR SEARCH */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            {/* Active || Inactive || Pending Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("Active");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "Active"
                    ? "bg-slate-900 text-amber-400 shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FiUserCheck className="text-sm" />
                <span>Active ({stats.activeCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("Pending");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "Pending"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FaUserClock className="text-sm text-slate-900" />
                <span>Pending Approvals ({stats.pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("Inactive");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "Inactive"
                    ? "bg-rose-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FiUserX className="text-sm" />
                <span>Inactive ({stats.inactiveCount})</span>
              </button>
            </div>

            {/* Toolbar Filters & Search */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedRoleFilter}
                onChange={(e) => {
                  setSelectedRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="All">All Role Tiers</option>
                <option value="Bronze">Bronze Partner (L1)</option>
                <option value="Silver">Silver Leader (L2)</option>
                <option value="Gold">Gold Shareholder (L3)</option>
                <option value="Platinum">Platinum Executive (L4)</option>
                <option value="Diamond">Diamond VIP (L5)</option>
                <option value="Master">Master Crown (L6)</option>
              </select>

              <TableSearchInput
                value={searchTerm}
                onChange={(val) => {
                  setSearchTerm(val);
                  setCurrentPage(1);
                }}
                placeholder="Search name, email, phone..."
                className="!w-[240px] min-w-[240px] shrink-0"
              />
            </div>
          </div>

          {/* MEMBER CARDS GRID */}
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              No {activeTab.toLowerCase()} members match your search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="w-full rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group hover:border-amber-400"
                >
                  <div>
                    {/* Header: User Avatar & Status Badge */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center border-2 border-amber-400 shrink-0 shadow-md">
                          {user.avatarInitials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-slate-900 text-base leading-tight truncate">
                            {user.fullName}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                            <FiMail className="text-slate-400 shrink-0" /> {user.email}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                          user.status === "Active"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : user.status === "Pending"
                            ? "bg-amber-400 text-slate-950 font-black border border-amber-500 animate-pulse"
                            : "bg-rose-100 text-rose-800 border border-rose-300"
                        }`}
                      >
                        {user.status === "Pending" ? "⏳ Pending Approval" : user.status}
                      </span>
                    </div>

                    {/* Role Tier & Joined Date */}
                    <div className="mb-4 flex items-center justify-between">
                      <span className="px-3 py-1 bg-amber-100 text-amber-950 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 border border-amber-300">
                        <FaCrown className="text-amber-600 text-xs" /> {user.roleTier}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">{user.joinedDate}</span>
                    </div>

                    {/* Financial Metrics Summary Grid */}
                    <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-900 text-white rounded-2xl mb-4 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Lifetime Earnings</span>
                        <span className="text-base font-black text-amber-400 mt-0.5 block">
                          ${user.lifetimeEarnings.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Total Withdrawals</span>
                        <span className="text-base font-black text-emerald-400 mt-0.5 block">
                          ${user.totalWithdrawals.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Withdrawable Balance</span>
                        <span className="font-extrabold text-white text-xs mt-0.5 block">
                          ${user.withdrawableBalance.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Purchased Plans</span>
                        <span className="font-extrabold text-amber-300 text-xs mt-0.5 block flex items-center gap-1">
                          <FiPackage /> {user.purchasedPackages.length} Plans
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Controls (WITH APPROVE / REJECT FOR PENDING USERS) */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {user.status === "Pending" ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleApproveUser(user)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow-md transition-colors"
                        >
                          <FiCheck className="text-base" /> Approve User
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectUser(user)}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow-md transition-colors"
                        >
                          <FiX className="text-base" /> Reject Request
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedUserModal(user)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition-colors flex-1 justify-center"
                        >
                          <FiEye className="text-amber-400" /> Inspect Profile
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(user)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 ${
                            user.status === "Active"
                              ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                          }`}
                          title={user.status === "Active" ? "Deactivate User" : "Activate User"}
                        >
                          {user.status === "Active" ? <FiToggleRight className="text-lg" /> : <FiToggleLeft className="text-lg" />}
                          <span>{user.status === "Active" ? "Deactivate" : "Activate"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredUsers.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemsPerPageOptions={[9, 18, 36, 50]}
              />
            </div>
          )}
        </div>
      </div>

      {/* MEMBER ACTIVITY & REGISTRATION AUDIT MODAL */}
      <Dialog
        open={selectedUserModal !== null}
        onClose={() => setSelectedUserModal(null)}
        title={`Member Inspection: ${selectedUserModal?.fullName || ""}`}
        width={850}
        closeOnOutsideClick={false}
      >
        {selectedUserModal && (
          <div className="space-y-6 text-xs">
            {/* Header Profile Summary */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-900 font-black text-lg flex items-center justify-center border-2 border-white shadow">
                  {selectedUserModal.avatarInitials}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{selectedUserModal.fullName}</h3>
                  <p className="text-xs text-slate-300 font-medium flex items-center gap-2 mt-0.5">
                    <span>✉️ {selectedUserModal.email}</span>
                    <span>📞 {selectedUserModal.phone}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-500 text-slate-900 font-extrabold text-xs rounded-full">
                  {selectedUserModal.roleTier}
                </span>

                {selectedUserModal.status === "Pending" ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApproveUser(selectedUserModal)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectUser(selectedUserModal)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg text-xs transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleUserStatus(selectedUserModal)}
                    className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
                      selectedUserModal.status === "Active" ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                    }`}
                  >
                    {selectedUserModal.status === "Active" ? "Set Inactive" : "Set Active"}
                  </button>
                )}
              </div>
            </div>

            {/* Key Financial Snapshot */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Lifetime Earnings</span>
                <span className="text-lg font-black text-amber-600 mt-0.5 block">${selectedUserModal.lifetimeEarnings.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Withdrawals</span>
                <span className="text-lg font-black text-emerald-600 mt-0.5 block">${selectedUserModal.totalWithdrawals.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Withdrawable Balance</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">${selectedUserModal.withdrawableBalance.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Direct Invites</span>
                <span className="text-lg font-black text-indigo-600 mt-0.5 block">{selectedUserModal.directReferralsCount} Members</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="px-6 py-2.5 bg-slate-900 text-amber-400 font-black rounded-xl hover:bg-slate-800 transition-colors text-xs shadow-md"
              >
                Close Inspection Modal
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </AppShell>
  );
}
