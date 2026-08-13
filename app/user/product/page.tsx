"use client";

import Image from "next/image";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Dialog, MessageDialog, Badge } from "@/components/ui";
import {
  FiZap,
  FiClock,
  FiDollarSign,
  FiCheckCircle,
  FiPlusCircle,
  FiShoppingBag,
  FiArrowUpRight,
  FiShield,
  FiPercent,
  FiCheck,
} from "react-icons/fi";
import { FaCrown, FaWallet, FaCoins, FaGem } from "react-icons/fa";

export type StorefrontProductPlan = {
  id: string;
  name: string;
  description: string;
  priceAmount: number;
  dailyInterestPercent: number;
  durationDays: number;
  tierBadge: string;
  bonusRewardBadge: string;
  badgeTag: string;
  levelCommissions: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    level5: string;
    level6: string;
  };
};

const STOREFRONT_PRODUCTS: StorefrontProductPlan[] = [
  {
    id: "p1",
    name: "Starter Yield Plan",
    description: "Ideal entry package with steady daily ROI interest and multi-level rewards.",
    priceAmount: 250,
    dailyInterestPercent: 1.5,
    durationDays: 60,
    tierBadge: "STARTER TIER",
    badgeTag: "Popular for Beginners",
    bonusRewardBadge: "⚡ Instant Activation Unlocked",
    levelCommissions: { level1: "5%", level2: "3%", level3: "2%", level4: "1%", level5: "0.5%", level6: "0.5%" },
  },
  {
    id: "p2",
    name: "Gold Shareholder Plan",
    description: "High demand shareholder package yielding daily 2.2% returns & Level 3 bonus.",
    priceAmount: 1000,
    dailyInterestPercent: 2.2,
    durationDays: 60,
    tierBadge: "SHARE HOLDER TIER",
    badgeTag: "Highest Demand",
    bonusRewardBadge: "🔥 Daily Streak Bonus: +0.5% Extra Yield",
    levelCommissions: { level1: "8%", level2: "4%", level3: "3%", level4: "2%", level5: "1%", level6: "0.5%" },
  },
  {
    id: "p3",
    name: "Platinum Executive Plan",
    description: "Executive tier for top promoters with accelerated 3.0% daily growth.",
    priceAmount: 2500,
    dailyInterestPercent: 3.0,
    durationDays: 60,
    tierBadge: "PLATINUM EXECUTIVE",
    badgeTag: "Best Value",
    bonusRewardBadge: "🚀 2x Level Commissions Unlocked",
    levelCommissions: { level1: "10%", level2: "5%", level3: "4%", level4: "3%", level5: "2%", level6: "1%" },
  },
  {
    id: "p4",
    name: "VIP Diamond Master",
    description: "Exclusive highest-tier product package offering max 4.0% daily ROI & VIP rewards.",
    priceAmount: 5000,
    dailyInterestPercent: 4.0,
    durationDays: 60,
    tierBadge: "VIP DIAMOND MASTER",
    badgeTag: "Exclusive VIP Tier",
    bonusRewardBadge: "👑 Max Tier Yield + Level 6 Override",
    levelCommissions: { level1: "12%", level2: "6%", level3: "5%", level4: "4%", level5: "3%", level6: "2%" },
  },
];

export default function UserProductStorefrontPage() {
  // User Balance & Purchased State
  const [walletBalance, setWalletBalance] = useState<number>(4850.0);
  const [activePlansCount, setActivePlansCount] = useState<number>(2);

  // Selected Plan for Purchase
  const [selectedPlan, setSelectedPlan] = useState<StorefrontProductPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"Wallet" | "USDT_TRC20" | "USDT_BEP20" | "Bank">("Wallet");
  const [isPurchaseSuccessModalOpen, setIsPurchaseSuccessModalOpen] = useState(false);
  const [purchasedPlanName, setPurchasedPlanName] = useState("");

  // Toast State
  const [toastState, setToastState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const showToast = (message: string) => {
    setToastState({ open: true, message });
  };

  // Open Purchase Dialog
  const handleOpenPurchase = (plan: StorefrontProductPlan) => {
    setSelectedPlan(plan);
    setPaymentMethod("Wallet");
  };

  // Confirm Plan Purchase
  const handleConfirmPurchase = () => {
    if (!selectedPlan) return;

    let newBalance = walletBalance;
    if (paymentMethod === "Wallet") {
      if (walletBalance < selectedPlan.priceAmount) {
        showToast(`Insufficient wallet balance. You need $${selectedPlan.priceAmount.toLocaleString()} USD.`);
        return;
      }
      newBalance = walletBalance - selectedPlan.priceAmount;
      setWalletBalance(newBalance);
    }

    const newPlansCount = activePlansCount + 1;
    setActivePlansCount(newPlansCount);

    // Save to localStorage for Dashboard sync
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const timeStr = now.toLocaleDateString("en-US") + " " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      const newTx = {
        id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
        type: "Product Plan Purchase",
        amount: selectedPlan.priceAmount,
        date: timeStr,
        status: "Completed",
        txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      };

      const existingStateRaw = localStorage.getItem("dventures_user_state");
      let existingTxs = [];
      if (existingStateRaw) {
        try {
          const parsed = JSON.parse(existingStateRaw);
          if (Array.isArray(parsed.transactions)) existingTxs = parsed.transactions;
        } catch (err) {
          console.error(err);
        }
      }

      const userState = {
        walletBalance: newBalance,
        activePlan: {
          name: selectedPlan.name,
          priceAmount: selectedPlan.priceAmount,
          dailyInterestPercent: selectedPlan.dailyInterestPercent,
          durationDays: selectedPlan.durationDays,
          daysRemaining: 60,
          purchasedDate: dateStr,
          tierBadge: selectedPlan.tierBadge,
        },
        transactions: [newTx, ...existingTxs],
      };

      localStorage.setItem("dventures_user_state", JSON.stringify(userState));
    } catch (error) {
      console.error("Failed to save user state to localStorage:", error);
    }

    setPurchasedPlanName(selectedPlan.name);
    setSelectedPlan(null);
    setIsPurchaseSuccessModalOpen(true);
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
        {/* Page Heading & Header Balance Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <FaCrown className="text-amber-600" /> High-Yield Product Storefront
              </span>
            </div>
            <PageHeading title="Product Investment Packages" />
            <p className="text-xs text-slate-500 mt-1">
              Choose a product investment package to start earning daily ROI interest income and unlock Levels 1–6 referral rewards.
            </p>
          </div>

          {/* User Wallet Balance Widget */}
          <div className="flex items-center gap-3 bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FaWallet className="text-lg" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Wallet Balance</span>
              <span className="text-xl font-black text-amber-400 block">${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD</span>
            </div>
          </div>
        </div>

        {/* HERO ANNOUNCEMENT BANNER */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-6 shadow-xl text-slate-900 border border-amber-300 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div>
              <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider shadow">
                ⚡ INSTANT DAILY ROI INTEREST ACTIVATION
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">60-Day Fixed Interest Product Packages</h2>
              <p className="text-xs text-slate-800 font-medium mt-0.5 max-w-2xl">
                Purchasing any product plan instantly starts daily ROI yields credited to your withdrawable balance every 24 hours for 60 Days.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-2 bg-slate-900 text-amber-400 font-black rounded-xl text-xs shadow flex items-center gap-1.5">
                <FiZap /> Active Plans: {activePlansCount}
              </span>
            </div>
          </div>
        </div>

        {/* PRODUCT CARDS GRID (WITH LEVELS 1 TO 6 REWARDS) */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              Available Investment Packages <Badge variant="success" className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold">(4 Plans)</Badge>
            </h3>
            <span className="text-xs text-slate-500 font-medium">All plans run for 60 Days duration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STOREFRONT_PRODUCTS.map((plan) => {
              const dailyRoiDollar = (plan.priceAmount * plan.dailyInterestPercent) / 100;
              const totalEstReturn = plan.priceAmount * (1 + (plan.dailyInterestPercent * plan.durationDays) / 100);

              return (
                <div
                  key={plan.id}
                  className="w-full rounded-[24px] border border-amber-200/80 bg-gradient-to-b from-white via-slate-50/50 to-amber-50/20 p-5 shadow-[0px_4px_20px_rgba(25,33,61,0.06)] flex flex-col justify-between hover:shadow-xl hover:border-amber-400 transition-all duration-300 relative group overflow-hidden"
                >
                  <div>
                    {/* Header: Tier Badge & Package Name */}
                    <div className="mb-3 pb-3 border-b border-slate-200/80">
                      <div className="flex justify-between items-center mb-2">
                        <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                          ✨ {plan.tierBadge}
                        </span>
                        <span className="text-xs font-bold text-slate-500">⏳ {plan.durationDays} Days</span>
                      </div>

                      <h3 className="truncate text-lg font-black text-slate-900">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-medium">
                        {plan.description}
                      </p>
                    </div>

                    {/* Key Investment Highlights Box */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900 text-white rounded-2xl mb-4 shadow-md text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Investment Price</span>
                        <span className="text-lg font-black text-amber-400 mt-0.5 block">
                          ${plan.priceAmount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Daily ROI Yield</span>
                        <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                          +{plan.dailyInterestPercent}% / day
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Daily Payout</span>
                        <span className="font-extrabold text-white text-xs mt-0.5 block">
                          +${dailyRoiDollar.toFixed(2)} / day
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Est. Total Yield</span>
                        <span className="font-extrabold text-amber-300 text-xs mt-0.5 block">
                          ${totalEstReturn.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>

                    {/* Multi-Level Commission Rewards Grid (Levels 1 to 6) */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                          🏆 Levels 1–6 Referral Rewards
                        </h4>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                        {[
                          { lvl: "L1", pct: plan.levelCommissions.level1 },
                          { lvl: "L2", pct: plan.levelCommissions.level2 },
                          { lvl: "L3", pct: plan.levelCommissions.level3 },
                          { lvl: "L4", pct: plan.levelCommissions.level4 },
                          { lvl: "L5", pct: plan.levelCommissions.level5 },
                          { lvl: "L6", pct: plan.levelCommissions.level6 },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100 transition-colors"
                          >
                            <span className="text-[9px] font-bold text-slate-500 block">{item.lvl} Reward</span>
                            <span className="text-xs font-black text-amber-950">{item.pct}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Attraction Perk Banner */}
                    <div className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 p-2.5 flex items-center justify-between text-slate-900 shadow-sm border border-amber-300 mb-4">
                      <span className="text-[11px] font-black truncate">{plan.bonusRewardBadge}</span>
                    </div>
                  </div>

                  {/* Purchase Action Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenPurchase(plan)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                  >
                    <FiShoppingBag className="text-amber-400 text-sm" />
                    <span>Purchase & Start Earnings</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PLAN PURCHASE CONFIRMATION DIALOG MODAL */}
      <Dialog
        open={selectedPlan !== null}
        onClose={() => setSelectedPlan(null)}
        title={`Confirm Product Investment: ${selectedPlan?.name || ""}`}
        width={680}
        closeOnOutsideClick={false}
      >
        {selectedPlan && (
          <div className="space-y-6 text-xs">
            {/* Package Summary Header */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-400 text-slate-900 rounded font-black text-[10px] uppercase">
                  {selectedPlan.tierBadge}
                </span>
                <h3 className="text-lg font-black text-white mt-1">{selectedPlan.name}</h3>
                <p className="text-xs text-slate-300 font-medium">60-Day Fixed Yield Package</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-bold">Package Price</span>
                <span className="text-2xl font-black text-amber-400">${selectedPlan.priceAmount.toLocaleString()} USD</span>
              </div>
            </div>

            {/* Financial ROI Highlights */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-slate-900">
              <div>
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Daily Interest Yield</span>
                <span className="text-base font-black text-emerald-600 mt-0.5 block">+{selectedPlan.dailyInterestPercent}% / Day</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Daily Return ($)</span>
                <span className="text-base font-black text-slate-900 mt-0.5 block">+${((selectedPlan.priceAmount * selectedPlan.dailyInterestPercent) / 100).toFixed(2)} / Day</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Total Est. Yield (60 Days)</span>
                <span className="text-base font-black text-amber-700 mt-0.5 block">${(selectedPlan.priceAmount * (1 + (selectedPlan.dailyInterestPercent * selectedPlan.durationDays) / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FaWallet className="text-amber-500" /> Select Payment Method
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setPaymentMethod("Wallet")}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === "Wallet"
                      ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-slate-900 block">Account Wallet Balance</span>
                    <span className="text-[11px] text-slate-500 font-medium">Available: ${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {paymentMethod === "Wallet" && <FiCheck className="text-amber-600 text-lg font-black" />}
                </label>

                <label
                  onClick={() => setPaymentMethod("USDT_TRC20")}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === "USDT_TRC20"
                      ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-slate-900 block">Crypto USDT (TRC20)</span>
                    <span className="text-[11px] text-slate-500 font-medium">Instant TRON Deposit</span>
                  </div>
                  {paymentMethod === "USDT_TRC20" && <FiCheck className="text-amber-600 text-lg font-black" />}
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl shadow-lg transition-colors text-xs flex items-center gap-2"
              >
                <FiZap className="text-amber-400" /> Confirm & Activate Plan
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* SUCCESS CELEBRATION MODAL */}
      <Dialog
        open={isPurchaseSuccessModalOpen}
        onClose={() => setIsPurchaseSuccessModalOpen(false)}
        title="🎉 Product Plan Activated Successfully!"
        width={550}
        closeOnOutsideClick={false}
      >
        <div className="text-center space-y-4 py-3 text-xs">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <FiCheckCircle className="text-4xl" />
          </div>

          <h3 className="text-xl font-black text-slate-900">Congratulations!</h3>

          <p className="text-slate-600 font-medium max-w-sm mx-auto">
            Your <strong className="text-slate-900">{purchasedPlanName}</strong> is now <span className="text-emerald-600 font-bold">ACTIVE</span>. Daily ROI interest yields are officially being credited to your account!
          </p>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 font-bold text-amber-900 text-[11px]">
            ⚡ Track your daily earnings and Level 1–6 referral rewards on your User Dashboard.
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsPurchaseSuccessModalOpen(false)}
              className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl shadow-lg transition-colors text-xs"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
