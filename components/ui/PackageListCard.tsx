"use client";

import Image from "next/image";
import { Tooltip } from "@/components/ui";

export type LevelCommissions = {
  level1: number | string;
  level2: number | string;
  level3: number | string;
  level4: number | string;
  level5: number | string;
  level6: number | string;
};

export type PackageCard = {
  id: number;
  name: string;
  description: string;
  priceAmount: number;
  durationDays: number;
  dailyInterestPercent: number;
  levelCommissions: LevelCommissions;
  bonusRewardBadge?: string;
  tierBadge?: string;
  status: "Active" | "Draft" | "Archived";
  statusClassName?: string;
  branchName?: string;
  patientType?: string;
};

type PackageListCardProps = {
  pkg: PackageCard;
  rowNum?: number;
  isExistingPackage?: boolean;
  showEdit?: boolean;
  showArchive?: boolean;
  onEdit?: (pkg: PackageCard) => void;
  onArchive?: (pkg: PackageCard) => void;
  onView?: (pkg: PackageCard) => void;
};

export function PackageListCard({
  pkg,
  showEdit = true,
  showArchive = true,
  onEdit,
  onArchive,
}: PackageListCardProps) {
  const showActionButtons = (showEdit && onEdit) || (showArchive && onArchive);

  // Calculate estimated total return
  const totalReturn = pkg.priceAmount * (1 + (pkg.dailyInterestPercent * pkg.durationDays) / 100);

  return (
    <div className="w-full rounded-[24px] border border-amber-200/80 bg-gradient-to-b from-white via-slate-50/50 to-amber-50/20 p-5 shadow-[0px_4px_20px_rgba(25,33,61,0.06)] flex flex-col justify-between hover:shadow-xl hover:border-amber-400 transition-all duration-300 relative group overflow-hidden">
      {/* Top Decorative Watermark Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* 1. Header: Tier Badge & Package Title & Actions */}
      <div className="relative z-10 mb-4 pb-3 border-b border-slate-200/80">
        <div className="flex justify-between items-start gap-2 mb-2">
          <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
            ✨ {pkg.tierBadge || "SHARE HOLDER TIER"}
          </span>

          {/* Action Buttons */}
          {showActionButtons && (
            <div className="flex items-center gap-1.5 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
              {showEdit && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(pkg)}
                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500 hover:text-white transition-colors"
                  title="Edit Package"
                >
                  <Image src="/icons/EditLightIcon.svg" alt="Edit" width={14} height={14} className="brightness-0 shrink-0" />
                </button>
              )}
              {showArchive && onArchive && (
                <button
                  type="button"
                  onClick={() => onArchive(pkg)}
                  disabled={pkg.status === "Archived"}
                  className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors disabled:opacity-40"
                  title="Archive Package"
                >
                  <Image src="/icons/archivedicon.svg" alt="Archive" width={14} height={14} className="brightness-0 shrink-0" />
                </button>
              )}
            </div>
          )}
        </div>

        <Tooltip content={pkg.name} position="top">
          <h3 className="truncate text-lg font-black leading-[120%] text-slate-900">
            {pkg.name}
          </h3>
        </Tooltip>
        {pkg.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-medium">
            {pkg.description}
          </p>
        )}
      </div>

      {/* 2. Key Investment Highlights Box */}
      <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900 text-white rounded-2xl mb-4 shadow-md text-xs">
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Investment Price</span>
          <span className="text-lg font-black text-amber-400 mt-0.5 block">
            ${pkg.priceAmount.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Daily ROI Yield</span>
          <span className="text-lg font-black text-emerald-400 mt-0.5 block">
            +{pkg.dailyInterestPercent}% / day
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Duration Required</span>
          <span className="font-extrabold text-white text-xs mt-0.5 block">
            ⏳ {pkg.durationDays} Days
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Est. Total Return</span>
          <span className="font-extrabold text-amber-300 text-xs mt-0.5 block">
            ${totalReturn.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* 3. Multi-Level Commission Rewards Grid (Levels 1 to 6) */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
            🏆 Multi-Level Referral Rewards
          </h4>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
            Levels 1–6
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {[
            { lvl: "L1", pct: pkg.levelCommissions?.level1 ?? "5%" },
            { lvl: "L2", pct: pkg.levelCommissions?.level2 ?? "3%" },
            { lvl: "L3", pct: pkg.levelCommissions?.level3 ?? "2%" },
            { lvl: "L4", pct: pkg.levelCommissions?.level4 ?? "1%" },
            { lvl: "L5", pct: pkg.levelCommissions?.level5 ?? "0.5%" },
            { lvl: "L6", pct: pkg.levelCommissions?.level6 ?? "0.5%" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100 transition-colors"
            >
              <span className="text-[10px] font-bold text-slate-500 block">{item.lvl} Reward</span>
              <span className="text-xs font-black text-amber-900">{item.pct}{typeof item.pct === "number" ? "%" : ""}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Attraction Bonus & Perk Banner */}
      <div className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 p-3 flex items-center justify-between text-slate-900 shadow-sm border border-amber-300">
        <div className="flex items-center gap-1.5 text-xs font-black">
          <span>🔥 {pkg.bonusRewardBadge || "Daily Streak Bonus: +0.5% Extra Yield"}</span>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-900 text-amber-400 rounded">
          ACTIVE PERK
        </span>
      </div>
    </div>
  );
}
