import type { ReceptionDashboardStats } from "@/lib/ipd-reception/types";
import type { IpdDashboardStatsData } from "@/lib/ipd-reception/ipdDashboardStatsTypes";

function findGeneralWardFreeCount(
  breakdown: IpdDashboardStatsData["availableBeds"]["breakdown"]
): number {
  const general = breakdown.find(
    (item) =>
      item.wardType.toLowerCase().includes("general") &&
      !item.wardType.toLowerCase().includes("semi")
  );
  return general?.freeCount ?? breakdown[0]?.freeCount ?? 0;
}

/** Maps API dashboard stats to the view model used by stat cards. */
export function mapIpdDashboardStatsToView(
  data: IpdDashboardStatsData | undefined
): ReceptionDashboardStats | undefined {
  if (!data) return undefined;

  return {
    totalAwaiting: data.totalAwaiting?.count ?? 0,
    admittedToday: data.admittedToday?.count ?? 0,
    availableBeds: data.availableBeds?.count ?? 0,
    dischargePending: data.dischargePending?.count ?? 0,
    awaitingRecentCount: data.totalAwaiting?.lastHourCount ?? 0,
    admittedRecentCount: data.admittedToday?.lastHourCount ?? 0,
    generalWardFreeBeds: findGeneralWardFreeCount(data.availableBeds?.breakdown ?? []),
  };
}
