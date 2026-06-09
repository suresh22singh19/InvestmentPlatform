import type {
  ReceptionDashboardStats,
  ReceptionStatSubtextKey,
} from "@/lib/ipd-reception/types";
import type { StatCardSubtextTone } from "@/components/ui/StatCard";

type IpdDashboardStatsBreakdown = Array<{ wardType: string; freeCount?: number }>;

type IpdDashboardStatsData = {
  totalAwaiting?: { count?: number; lastHourCount?: number };
  admittedToday?: { count?: number; lastHourCount?: number };
  availableBeds?: { count?: number; breakdown?: IpdDashboardStatsBreakdown };
  dischargePending?: { count?: number };
};

function findGeneralWardFreeCount(
  breakdown: IpdDashboardStatsBreakdown
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

export function formatIpdDashboardStatValue(
  value: number | undefined | null,
  padValue: boolean
): string | number {
  if (value === undefined || value === null) return "N/A";
  if (padValue) return String(value).padStart(2, "0");
  return value;
}

export function getIpdDashboardStatSubtext(
  key: ReceptionStatSubtextKey,
  stats?: ReceptionDashboardStats
): { text: string; tone: StatCardSubtextTone } {
  switch (key) {
    case "awaitingSubtext":
      return {
        text: `+ ${stats?.awaitingRecentCount ?? 0} new in last hour`,
        tone: "green",
      };
    case "admittedSubtext":
      return {
        text: `+ ${stats?.admittedRecentCount ?? 0} new in last hour`,
        tone: "green",
      };
    case "bedsSubtext":
      return {
        text: `General Ward: ${stats?.generalWardFreeBeds ?? 0} free`,
        tone: "muted",
      };
    case "dischargeSubtext":
      return {
        text: "Requires immediate file closure",
        tone: "muted",
      };
    default:
      return { text: "", tone: "muted" };
  }
}
