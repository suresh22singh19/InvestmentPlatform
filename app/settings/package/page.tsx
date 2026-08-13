"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
import { PackageListCard, type PackageCard, type LevelCommissions } from "@/components/ui/PackageListCard";
import { usePermission } from "@/hooks/usePermission";

// ─── Default High-Converting Product Packages ─────────────────────────────────
const DEFAULT_PRODUCT_PACKAGES: PackageCard[] = [
  {
    id: 101,
    name: "Starter Yield Plan",
    description: "Ideal entry package with steady daily ROI and multi-level rewards.",
    priceAmount: 250,
    durationDays: 60,
    dailyInterestPercent: 1.5,
    tierBadge: "STARTER TIER",
    bonusRewardBadge: "⚡ Instant Activation Unlocked",
    status: "Active",
    statusClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    levelCommissions: {
      level1: 5,
      level2: 3,
      level3: 2,
      level4: 1,
      level5: 0.5,
      level6: 0.5,
    },
  },
  {
    id: 102,
    name: "Gold Shareholder Plan",
    description: "High demand shareholder package yielding daily 2.2% returns & Level 3 bonus.",
    priceAmount: 1000,
    durationDays: 60,
    dailyInterestPercent: 2.2,
    tierBadge: "SHARE HOLDER TIER",
    bonusRewardBadge: "🔥 Daily Streak Bonus: +0.5% Extra Yield",
    status: "Active",
    statusClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    levelCommissions: {
      level1: 8,
      level2: 4,
      level3: 3,
      level4: 2,
      level5: 1,
      level6: 0.5,
    },
  },
  {
    id: 103,
    name: "Platinum Executive Plan",
    description: "Executive tier for top promoters with accelerated 3.0% daily growth.",
    priceAmount: 2500,
    durationDays: 60,
    dailyInterestPercent: 3.0,
    tierBadge: "PLATINUM EXECUTIVE",
    bonusRewardBadge: "🚀 2x Level Commissions Unlocked",
    status: "Active",
    statusClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    levelCommissions: {
      level1: 10,
      level2: 5,
      level3: 4,
      level4: 3,
      level5: 2,
      level6: 1,
    },
  },
  {
    id: 104,
    name: "VIP Diamond Master",
    description: "Exclusive highest-tier product package offering max 4.0% daily ROI & VIP rewards.",
    priceAmount: 5000,
    durationDays: 60,
    dailyInterestPercent: 4.0,
    tierBadge: "VIP DIAMOND MASTER",
    bonusRewardBadge: "👑 Max Tier Yield + Level 6 Override",
    status: "Active",
    statusClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    levelCommissions: {
      level1: 12,
      level2: 6,
      level3: 5,
      level4: 4,
      level5: 3,
      level6: 2,
    },
  },
];

// Form state for creating product packages
type AddProductPackageFormState = {
  name: string;
  description: string;
  priceAmount: string;
  durationDays: string;
  dailyInterestPercent: string;
  tierBadge: string;
  bonusRewardBadge: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
  level6: string;
};

const initialAddFormState: AddProductPackageFormState = {
  name: "",
  description: "",
  priceAmount: "1000",
  durationDays: "60",
  dailyInterestPercent: "2.2",
  tierBadge: "GOLD SHAREHOLDER TIER",
  bonusRewardBadge: "🔥 Daily Streak Bonus: +0.5% Extra Yield",
  level1: "8",
  level2: "4",
  level3: "3",
  level4: "2",
  level5: "1",
  level6: "0.5",
};

export default function PackagePage() {
  const packagePermission = usePermission("settings", { subModule: "package" });
  const canView = packagePermission.canView;
  const canAdd = packagePermission.canAdd;

  const [packages, setPackages] = useState<PackageCard[]>(DEFAULT_PRODUCT_PACKAGES);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageCard | null>(null);

  const [formState, setFormState] = useState<AddProductPackageFormState>(initialAddFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [toastMessage, setToastMessage] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const showToast = (message: string, variant: "success" | "error" = "success") => {
    setToastMessage({ open: true, variant, message });
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    if (!searchTerm.trim()) return packages;
    const term = searchTerm.toLowerCase();
    return packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(term) ||
        pkg.description.toLowerCase().includes(term) ||
        (pkg.tierBadge && pkg.tierBadge.toLowerCase().includes(term))
    );
  }, [packages, searchTerm]);

  // Open Add Modal
  const openAddPackageDialog = () => {
    setEditingPackage(null);
    setFormState(initialAddFormState);
    setFormErrors({});
    setIsAddDialogOpen(true);
  };

  // Open Edit Modal
  const openEditPackageDialog = (pkg: PackageCard) => {
    setEditingPackage(pkg);
    setFormState({
      name: pkg.name,
      description: pkg.description,
      priceAmount: String(pkg.priceAmount),
      durationDays: String(pkg.durationDays),
      dailyInterestPercent: String(pkg.dailyInterestPercent),
      tierBadge: pkg.tierBadge || "SHARE HOLDER TIER",
      bonusRewardBadge: pkg.bonusRewardBadge || "🔥 Daily Streak Bonus",
      level1: String(pkg.levelCommissions.level1),
      level2: String(pkg.levelCommissions.level2),
      level3: String(pkg.levelCommissions.level3),
      level4: String(pkg.levelCommissions.level4),
      level5: String(pkg.levelCommissions.level5),
      level6: String(pkg.levelCommissions.level6),
    });
    setFormErrors({});
    setIsAddDialogOpen(true);
  };

  // Archive / Delete Package
  const handleArchivePackage = (pkg: PackageCard) => {
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    showToast(`Package "${pkg.name}" has been removed from active plans.`);
  };

  // Form Validation & Submission
  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formState.name.trim()) errors.name = "Package Name is required.";
    if (!formState.priceAmount || Number(formState.priceAmount) <= 0) errors.priceAmount = "Valid price is required.";
    if (!formState.durationDays || Number(formState.durationDays) <= 0) errors.durationDays = "Valid duration days required.";
    if (!formState.dailyInterestPercent || Number(formState.dailyInterestPercent) < 0) errors.dailyInterestPercent = "Valid daily interest rate required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const newPackage: PackageCard = {
      id: editingPackage ? editingPackage.id : Date.now(),
      name: formState.name.trim(),
      description: formState.description.trim() || "High yield product package with multi-level rewards.",
      priceAmount: Number(formState.priceAmount),
      durationDays: Number(formState.durationDays),
      dailyInterestPercent: Number(formState.dailyInterestPercent),
      tierBadge: formState.tierBadge.trim() || "VIP TIER",
      bonusRewardBadge: formState.bonusRewardBadge.trim() || "🔥 Daily Streak Perks",
      status: "Active",
      statusClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      levelCommissions: {
        level1: formState.level1 || "5%",
        level2: formState.level2 || "3%",
        level3: formState.level3 || "2%",
        level4: formState.level4 || "1%",
        level5: formState.level5 || "0.5%",
        level6: formState.level6 || "0.5%",
      },
    };

    if (editingPackage) {
      setPackages((prev) => prev.map((p) => (p.id === editingPackage.id ? newPackage : p)));
      showToast(`Product package "${newPackage.name}" updated successfully!`);
    } else {
      setPackages((prev) => [newPackage, ...prev]);
      showToast(`New Product Package "${newPackage.name}" created successfully!`);
    }

    setIsAddDialogOpen(false);
  };

  return (
    <AppShell>
      {/* Toast Notification */}
      <MessageDialog
        open={toastMessage.open}
        onClose={() => setToastMessage((p) => ({ ...p, open: false }))}
        showCancel={false}
        confirmText="OK"
        message={toastMessage.message}
      />

      <div className="space-y-6">
        {/* Page Heading & Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                👑 Product Package & Yield Manager
              </span>
            </div>
            <PageHeading title="Product Investment Packages" />
            <p className="text-xs text-slate-500 mt-1">
              Create and manage product plans, daily ROI interest rates, duration days, and Level 1 to 6 referral rewards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TableSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search product packages..."
              className="!w-[260px] min-w-[260px] max-w-[260px] shrink-0"
            />
            {canAdd && (
              <button
                type="button"
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] bg-slate-900 px-6 text-xs font-black text-amber-400 shadow-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                onClick={openAddPackageDialog}
              >
                <Image src="/icons/AddIcon.svg" alt="Add" width={18} height={18} className="brightness-0 invert shrink-0" />
                <span>Add Product Package</span>
              </button>
            )}
          </div>
        </div>

        {/* Existing Product Packages Grid */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              Active Packages <Badge variant="success" className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold">({filteredPackages.length})</Badge>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Auto-synced with user product storefront</span>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              No product packages match your search criteria. Click &quot;Add Product Package&quot; to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredPackages.map((pkg) => (
                <PackageListCard
                  key={pkg.id}
                  pkg={pkg}
                  onEdit={openEditPackageDialog}
                  onArchive={handleArchivePackage}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT PACKAGE DIALOG */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title={editingPackage ? "Edit Product Package" : "Create New Product Package"}
        width={780}
        closeOnOutsideClick={false}
      >
        <form noValidate className="space-y-6 text-xs" onSubmit={handleSavePackage}>
          {/* Section 1: Package Basic Information */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              1. Package Yield Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormInputField
                  label="Package Product Name *"
                  value={formState.name}
                  onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Gold Shareholder Plan"
                  height={42}
                  disabled={false}
                />
                {formErrors.name && <p className="mt-1 text-xs text-rose-500 font-bold">{formErrors.name}</p>}
              </div>

              <div>
                <FormInputField
                  label="Investment Price ($) *"
                  type="number"
                  value={formState.priceAmount}
                  onChange={(e) => setFormState((p) => ({ ...p, priceAmount: e.target.value }))}
                  placeholder="e.g. 1000"
                  height={42}
                />
                {formErrors.priceAmount && <p className="mt-1 text-xs text-rose-500 font-bold">{formErrors.priceAmount}</p>}
              </div>

              <div>
                <FormInputField
                  label="Package Duration (Days) *"
                  type="number"
                  value={formState.durationDays}
                  onChange={(e) => setFormState((p) => ({ ...p, durationDays: e.target.value }))}
                  placeholder="e.g. 60"
                  height={42}
                />
                {formErrors.durationDays && <p className="mt-1 text-xs text-rose-500 font-bold">{formErrors.durationDays}</p>}
              </div>

              <div>
                <FormInputField
                  label="Daily Interest ROI (% / Day) *"
                  type="number"
                  step="0.1"
                  value={formState.dailyInterestPercent}
                  onChange={(e) => setFormState((p) => ({ ...p, dailyInterestPercent: e.target.value }))}
                  placeholder="e.g. 2.2"
                  height={42}
                />
                {formErrors.dailyInterestPercent && <p className="mt-1 text-xs text-rose-500 font-bold">{formErrors.dailyInterestPercent}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormInputField
                  label="VIP Tier Badge"
                  value={formState.tierBadge}
                  onChange={(e) => setFormState((p) => ({ ...p, tierBadge: e.target.value }))}
                  placeholder="e.g. GOLD SHAREHOLDER TIER"
                  height={42}
                />
              </div>

              <div>
                <FormInputField
                  label="Bonus Retention Perk Badge"
                  value={formState.bonusRewardBadge}
                  onChange={(e) => setFormState((p) => ({ ...p, bonusRewardBadge: e.target.value }))}
                  placeholder="e.g. 🔥 Daily Streak Bonus: +0.5% Extra Yield"
                  height={42}
                />
              </div>
            </div>

            <div>
              <FormTextareaField
                label="Package Description"
                value={formState.description}
                onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief summary of package benefits, daily payouts, and referral perks..."
                rows={2}
              />
            </div>
          </div>

          {/* Section 2: Multi-Level Referral Commissions (Levels 1 to 6) */}
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-sm text-amber-950 flex items-center gap-1.5">
                🏆 Multi-Level Commission Structure (Levels 1 to 6)
              </h4>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                Referral Network Rewards
              </span>
            </div>
            <p className="text-[11px] text-amber-900 font-medium">
              Set referral commission percentages for members who invite users down to Level 6.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
              {([
                { key: "level1", label: "Level 1 (%)" },
                { key: "level2", label: "Level 2 (%)" },
                { key: "level3", label: "Level 3 (%)" },
                { key: "level4", label: "Level 4 (%)" },
                { key: "level5", label: "Level 5 (%)" },
                { key: "level6", label: "Level 6 (%)" },
              ] as const).map((lvl) => (
                <div key={lvl.key} className="bg-white p-2.5 rounded-xl border border-amber-300 shadow-sm">
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">{lvl.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formState[lvl.key]}
                    onChange={(e) => setFormState((p) => ({ ...p, [lvl.key]: e.target.value }))}
                    className="w-full bg-amber-50/50 border border-amber-300 rounded-lg p-1.5 text-xs font-black text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="%"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddDialogOpen(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl shadow-lg transition-colors text-xs"
            >
              {editingPackage ? "Save Package Updates" : "Create Product Package"}
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
