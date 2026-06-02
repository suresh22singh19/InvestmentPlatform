"use client";

import type { MedRoundWardSummary } from "@/lib/ipd-reception/dailyOperationsTypes";

type MedRoundsSummarySectionProps = {
  wards: MedRoundWardSummary[];
};

export function MedRoundsSummarySection({ wards }: MedRoundsSummarySectionProps) {
  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-[#262D3B]">Daily Med Rounds Summary</h2>
      <div className="space-y-5">
        {wards.map((ward) => {
          const pct = Math.round((ward.administered / ward.total) * 100);
          return (
            <div key={ward.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[#262D3B]">{ward.wardName}</p>
                <p className="text-sm font-semibold text-[#0B8C00]">
                  {ward.administered}/{ward.total} Administered
                </p>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#E3EEE1]">
                <div
                  className="h-full rounded-full bg-[#0B8C00] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-[#9FA2AB]">{ward.statusNote}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
