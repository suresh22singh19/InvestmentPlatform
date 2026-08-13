"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  FormInputField,
  FormTextareaField,
  TableSearchInput,
  Dialog,
  MessageDialog,
  Badge,
} from "@/components/ui";
import { usePermission } from "@/hooks/usePermission";
import { FiAward, FiGift, FiPlusCircle, FiUsers, FiDollarSign, FiZap, FiEdit3, FiTrash2, FiCheckCircle, FiShare2 } from "react-icons/fi";
import { FaCrown, FaCoins, FaLevelUpAlt } from "react-icons/fa";

export interface LevelMilestoneTier {
  id: number;
  levelNumber: number; // 1 to 6
  tierName: string;
  minReferrals: number;
  maxReferrals: number;
  unlockCashBonus: number; // $ bonus paid on reaching level
  extraRoiBoostPercent: number; // % extra daily yield boost
  perkBadge: string;
  status: "Active" | "Inactive";
}

const DEFAULT_LEVEL_MILESTONES: LevelMilestoneTier[] = [
  {
    id: 1,
    levelNumber: 1,
    tierName: "Bronze Partner",
    minReferrals: 10,
    maxReferrals: 49,
    unlockCashBonus: 50,
    extraRoiBoostPercent: 0.2,
    perkBadge: "🥉 Tier 1 Unlocked: $50 Bonus",
    status: "Active",
  },
  {
    id: 2,
    levelNumber: 2,
    tierName: "Silver Leader",
    minReferrals: 50,
    maxReferrals: 149,
    unlockCashBonus: 150,
    extraRoiBoostPercent: 0.5,
    perkBadge: "🥈 Tier 2 Unlocked: $150 Bonus",
    status: "Active",
  },
  {
    id: 3,
    levelNumber: 3,
    tierName: "Gold Shareholder",
    minReferrals: 150,
    maxReferrals: 399,
    unlockCashBonus: 350,
    extraRoiBoostPercent: 1.0,
    perkBadge: "🥇 Tier 3 Unlocked: $350 Bonus + 5% Direct",
    status: "Active",
  },
  {
    id: 4,
    levelNumber: 4,
    tierName: "Platinum Executive",
    minReferrals: 400,
    maxReferrals: 699,
    unlockCashBonus: 750,
    extraRoiBoostPercent: 1.5,
    perkBadge: "💎 Tier 4 Unlocked: $750 Bonus + Priority Payout",
    status: "Active",
  },
  {
    id: 5,
    levelNumber: 5,
    tierName: "Diamond VIP",
    minReferrals: 700,
    maxReferrals: 999,
    unlockCashBonus: 1500,
    extraRoiBoostPercent: 2.0,
    perkBadge: "👑 Tier 5 Unlocked: $1,500 Bonus + VIP Manager",
    status: "Active",
  },
  {
    id: 6,
    levelNumber: 6,
    tierName: "Master Crown Shareholder",
    minReferrals: 1000,
    maxReferrals: 9999,
    unlockCashBonus: 3000,
    extraRoiBoostPercent: 3.0,
    perkBadge: "🔥 Level 6 Max Crown: $3,000 Bonus + Max Commission",
    status: "Active",
  },
];

export default function PanelPage() {
  const panelPermission = usePermission("settings", { subModule: "panel" });
  const canView = panelPermission.canView;
  const canAdd = panelPermission.canAdd;

  // Global Referral Rules State
  const [welcomeBonus, setWelcomeBonus] = useState<string>("10.00");
  const [directReferralBonus, setDirectReferralBonus] = useState<string>("15.00");
  const [minWithdrawalThreshold, setMinWithdrawalThreshold] = useState<string>("50.00");

  // Milestone Tiers State
  const [milestones, setMilestones] = useState<LevelMilestoneTier[]>(DEFAULT_LEVEL_MILESTONES);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<LevelMilestoneTier | null>(null);

  // Form State
  const [formState, setFormState] = useState({
    levelNumber: "1",
    tierName: "",
    minReferrals: "10",
    maxReferrals: "49",
    unlockCashBonus: "50",
    extraRoiBoostPercent: "0.2",
    perkBadge: "",
  });

  const [toastState, setToastState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const showToast = (message: string) => {
    setToastState({ open: true, message });
  };

  const filteredMilestones = useMemo(() => {
    if (!searchTerm.trim()) return milestones;
    const term = searchTerm.toLowerCase();
    return milestones.filter(
      (m) =>
        m.tierName.toLowerCase().includes(term) ||
        m.perkBadge.toLowerCase().includes(term) ||
        `level ${m.levelNumber}`.includes(term)
    );
  }, [milestones, searchTerm]);

  // Open Create Modal
  const openAddDialog = () => {
    setEditingMilestone(null);
    setFormState({
      levelNumber: "1",
      tierName: "New Level Tier",
      minReferrals: "10",
      maxReferrals: "49",
      unlockCashBonus: "50",
      extraRoiBoostPercent: "0.5",
      perkBadge: "⚡ Level Unlock Reward",
    });
    setIsDialogOpen(true);
  };

  // Open Edit Modal
  const openEditDialog = (m: LevelMilestoneTier) => {
    setEditingMilestone(m);
    setFormState({
      levelNumber: String(m.levelNumber),
      tierName: m.tierName,
      minReferrals: String(m.minReferrals),
      maxReferrals: String(m.maxReferrals),
      unlockCashBonus: String(m.unlockCashBonus),
      extraRoiBoostPercent: String(m.extraRoiBoostPercent),
      perkBadge: m.perkBadge,
    });
    setIsDialogOpen(true);
  };

  // Handle Delete Milestone
  const handleDeleteMilestone = (id: number) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    showToast("Level Milestone Tier removed.");
  };

  // Save Milestone
  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const newTier: LevelMilestoneTier = {
      id: editingMilestone ? editingMilestone.id : Date.now(),
      levelNumber: Number(formState.levelNumber),
      tierName: formState.tierName.trim() || `Level ${formState.levelNumber} Tier`,
      minReferrals: Number(formState.minReferrals),
      maxReferrals: Number(formState.maxReferrals),
      unlockCashBonus: Number(formState.unlockCashBonus),
      extraRoiBoostPercent: Number(formState.extraRoiBoostPercent),
      perkBadge: formState.perkBadge.trim() || "🏆 Level Reward Unlocked",
      status: "Active",
    };

    if (editingMilestone) {
      setMilestones((prev) => prev.map((m) => (m.id === editingMilestone.id ? newTier : m)));
      showToast(`Milestone Level ${newTier.levelNumber} (${newTier.tierName}) updated successfully!`);
    } else {
      setMilestones((prev) => [...prev, newTier].sort((a, b) => a.levelNumber - b.levelNumber));
      showToast(`New Level ${newTier.levelNumber} Milestone (${newTier.tierName}) created successfully!`);
    }

    setIsDialogOpen(false);
  };

  const handleSaveGlobalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Global Referral & Welcome Sign-up Bonus Settings updated successfully!");
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
        {/* Page Heading & Search Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <FaCrown className="text-amber-600" /> Super Admin Referral Settings
              </span>
            </div>
            <PageHeading title="Referral Program & Level Milestones" />
            <p className="text-xs text-slate-500 mt-1">
              Configure global welcome bonuses, direct referral payouts, and Level 1 to Level 6 target milestones and cash unlock rewards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TableSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search level milestones..."
              className="!w-[240px] min-w-[240px] shrink-0"
            />
            {canAdd && (
              <button
                type="button"
                onClick={openAddDialog}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] bg-slate-900 px-6 text-xs font-black text-amber-400 shadow-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <FiPlusCircle className="text-base text-amber-400" />
                <span>Add Level Milestone</span>
              </button>
            )}
          </div>
        </div>

        {/* SECTION 1: GLOBAL REFERRAL PROGRAM SETTINGS CARD */}
        <form onSubmit={handleSaveGlobalSettings} className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-6 shadow-xl text-slate-900 border border-amber-300">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div>
              <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow">
                <FiGift /> GLOBAL PROGRAM CONFIGURATION
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Global Bonuses & Thresholds</h2>
              <p className="text-xs text-slate-800 font-medium mt-0.5">
                Set instantaneous rewards given to users upon sign-up and per direct invite.
              </p>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl shadow-lg transition-colors flex items-center gap-2"
            >
              <FiCheckCircle className="text-amber-400" /> Save Global Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-white/90 backdrop-blur-md rounded-xl border border-slate-900/10 shadow-sm">
              <label className="block font-black text-slate-900 mb-1 flex items-center gap-1.5">
                <FiGift className="text-amber-600" /> Welcome Sign-up Bonus ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={welcomeBonus}
                onChange={(e) => setWelcomeBonus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. 10.00"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Credited to new user upon registration</span>
            </div>

            <div className="p-4 bg-white/90 backdrop-blur-md rounded-xl border border-slate-900/10 shadow-sm">
              <label className="block font-black text-slate-900 mb-1 flex items-center gap-1.5">
                <FiShare2 className="text-amber-600" /> Direct Invite Reward ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={directReferralBonus}
                onChange={(e) => setDirectReferralBonus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. 15.00"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Instant bonus per active direct referral</span>
            </div>

            <div className="p-4 bg-white/90 backdrop-blur-md rounded-xl border border-slate-900/10 shadow-sm">
              <label className="block font-black text-slate-900 mb-1 flex items-center gap-1.5">
                <FaCoins className="text-amber-600" /> Min Withdrawal Threshold ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={minWithdrawalThreshold}
                onChange={(e) => setMinWithdrawalThreshold(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. 50.00"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Minimum balance required for withdrawal</span>
            </div>
          </div>
        </form>

        {/* SECTION 2: LEVELS 1 TO 6 TIER MILESTONES GRID */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FaLevelUpAlt className="text-amber-500" /> Referral Milestone Tiers (Levels 1 to 6)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target referral quotas, level upgrade cash unlock bonuses ($), and extra daily ROI yield boosts.
              </p>
            </div>
            <Badge variant="success" className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-xs px-3 py-1">
              {filteredMilestones.length} Milestone Rules Configured
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMilestones.map((m) => (
              <div
                key={m.id}
                className="w-full rounded-[24px] border border-amber-200/80 bg-white p-6 shadow-[0px_4px_20px_rgba(25,33,61,0.06)] flex flex-col justify-between hover:shadow-xl hover:border-amber-400 transition-all duration-300 relative group"
              >
                <div>
                  {/* Card Top: Level Badge & Actions */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <FaCrown className="text-amber-400 text-xs" /> LEVEL {m.levelNumber} TIER
                    </span>

                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEditDialog(m)}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500 hover:text-white transition-colors"
                        title="Edit Milestone"
                      >
                        <FiEdit3 className="text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(m.id)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                        title="Delete Milestone"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{m.tierName}</h3>
                  <p className="text-xs font-bold text-amber-700 mb-4">
                    🎯 Target Quota: {m.minReferrals} to {m.maxReferrals >= 9999 ? "1000+" : m.maxReferrals} Referrals
                  </p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900 text-white rounded-2xl mb-4 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Level Unlock Cash Bonus</span>
                      <span className="text-lg font-black text-amber-400 mt-0.5 block">
                        +${m.unlockCashBonus.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Extra Daily ROI Yield</span>
                      <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                        +{m.extraRoiBoostPercent}% Boost
                      </span>
                    </div>
                  </div>
                </div>

                {/* Perk Badge Footer */}
                <div className="rounded-xl bg-gradient-to-r from-amber-100 to-amber-50 p-3 border border-amber-200 text-xs font-black text-amber-950 flex items-center justify-between">
                  <span className="truncate">{m.perkBadge}</span>
                  <span className="px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[9px] font-black shrink-0">ACTIVE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MILESTONE DIALOG */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingMilestone ? `Edit Level ${formState.levelNumber} Milestone` : "Add Level Milestone Tier"}
        width={720}
        closeOnOutsideClick={false}
      >
        <form noValidate className="space-y-6 text-xs" onSubmit={handleSaveMilestone}>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
              1. Level Tier & Target Referrals Quota
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Level Number (1 to 6) *</label>
                <select
                  value={formState.levelNumber}
                  onChange={(e) => setFormState((p) => ({ ...p, levelNumber: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                  <option value="6">Level 6</option>
                </select>
              </div>

              <div>
                <FormInputField
                  label="Tier Name *"
                  value={formState.tierName}
                  onChange={(e) => setFormState((p) => ({ ...p, tierName: e.target.value }))}
                  placeholder="e.g. Gold Shareholder"
                  height={42}
                />
              </div>

              <div>
                <FormInputField
                  label="Min Target Referrals *"
                  type="number"
                  value={formState.minReferrals}
                  onChange={(e) => setFormState((p) => ({ ...p, minReferrals: e.target.value }))}
                  placeholder="e.g. 150"
                  height={42}
                />
              </div>

              <div>
                <FormInputField
                  label="Max Target Referrals *"
                  type="number"
                  value={formState.maxReferrals}
                  onChange={(e) => setFormState((p) => ({ ...p, maxReferrals: e.target.value }))}
                  placeholder="e.g. 399"
                  height={42}
                />
              </div>

              <div>
                <FormInputField
                  label="Level Unlock Cash Bonus ($) *"
                  type="number"
                  value={formState.unlockCashBonus}
                  onChange={(e) => setFormState((p) => ({ ...p, unlockCashBonus: e.target.value }))}
                  placeholder="e.g. 350"
                  height={42}
                />
              </div>

              <div>
                <FormInputField
                  label="Extra Daily ROI Boost (%) *"
                  type="number"
                  step="0.1"
                  value={formState.extraRoiBoostPercent}
                  onChange={(e) => setFormState((p) => ({ ...p, extraRoiBoostPercent: e.target.value }))}
                  placeholder="e.g. 1.0"
                  height={42}
                />
              </div>
            </div>

            <div>
              <FormInputField
                label="Perk Badge Text"
                value={formState.perkBadge}
                onChange={(e) => setFormState((p) => ({ ...p, perkBadge: e.target.value }))}
                placeholder="e.g. 🥇 Tier 3 Unlocked: $350 Bonus + 5% Direct"
                height={42}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl shadow-lg transition-colors text-xs"
            >
              {editingMilestone ? "Save Milestone Updates" : "Create Level Milestone"}
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
