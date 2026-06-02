"use client";

import { Badge } from "@/components/ui";
import type { DailyOperationsStats } from "@/lib/ipd-reception/dailyOperationsTypes";

type DailyOperationsStatsGridProps = {
  stats: DailyOperationsStats;
};

export function DailyOperationsStatsGrid({ stats }: DailyOperationsStatsGridProps) {
  const medPct = Math.round(
    (stats.medicationsAdministered / stats.medicationsTotal) * 100
  );

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#434956]">Total Admissions</p>
            <h4 className="mt-2 text-[32px] font-bold leading-[120%] text-[#262D3B]">
              {stats.totalAdmissions}
            </h4>
          </div>
          <p className="text-xs font-medium text-[#9FA2AB]">
            Target: {stats.admissionsTarget}
          </p>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#434956]">Therapies Scheduled</p>
            <h4 className="mt-2 text-[32px] font-bold leading-[120%] text-[#262D3B]">
              {stats.therapiesScheduled}
            </h4>
          </div>
          <Badge variant="neutral" className="shrink-0 font-semibold uppercase">
            {stats.therapiesCompleted} Completed
          </Badge>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-[#434956]">Medication Administered</p>
        <h4 className="mt-2 text-[32px] font-bold leading-[120%] text-[#262D3B]">
          {stats.medicationsAdministered}/{stats.medicationsTotal}
        </h4>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#E3EEE1]">
          <div
            className="h-full rounded-full bg-[#0B8C00] transition-all"
            style={{ width: `${medPct}%` }}
          />
        </div>
      </div>

      <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#434956]">Staff On Duty</p>
            <h4 className="mt-2 text-[32px] font-bold leading-[120%] text-[#262D3B]">
              {stats.staffOnDuty}
            </h4>
          </div>
          <p className="text-xs font-medium text-[#9FA2AB]">{stats.staffShiftLabel}</p>
        </div>
      </div>
    </div>
  );
}
