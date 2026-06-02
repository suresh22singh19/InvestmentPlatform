"use client";

import { WARD_STATUS_COLORS } from "@/lib/ipd-reception/constants";
import type { WardCapacityItem } from "@/lib/ipd-reception/types";

type WardProgressProps = {
  ward: WardCapacityItem;
};

function formatFreeLabel(free: number, total: number): string {
  const freeLabel = free < 10 ? String(free).padStart(2, "0") : String(free);
  return `${freeLabel} / ${total} Free`;
}

export function WardProgress({ ward }: WardProgressProps) {
  const colors = WARD_STATUS_COLORS[ward.statusColor];
  const occupiedPct = ward.occupancyPercentage;

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <span className="w-[120px] shrink-0 text-sm font-medium text-[#262D3B] sm:w-[140px]">
        {ward.name}
      </span>

      <div className="min-w-0 flex-1">
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: colors.track }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${occupiedPct}%`, backgroundColor: colors.bar }}
          />
        </div>
      </div>

      <span
        className="w-[100px] shrink-0 text-right text-sm font-semibold sm:w-[110px]"
        style={{ color: colors.text }}
      >
        {formatFreeLabel(ward.freeBeds, ward.totalBeds)}
      </span>
    </div>
  );
}
