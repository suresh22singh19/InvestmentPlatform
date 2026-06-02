import { RECEPTION_DASHBOARD_TABS } from "./constants";
import type { ReceptionDashboardTab, WardCapacityItem } from "./types";
import type { WardCapacityStatusColor } from "./types";

export function calculateOccupancyPercentage(occupied: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((occupied / total) * 100);
}

export function buildWardCapacityItem(
  id: string,
  name: string,
  totalBeds: number,
  occupiedBeds: number,
  statusColor: WardCapacityStatusColor
): WardCapacityItem {
  const safeOccupied = Math.min(Math.max(occupiedBeds, 0), totalBeds);
  const freeBeds = totalBeds - safeOccupied;

  return {
    id,
    name,
    totalBeds,
    occupiedBeds: safeOccupied,
    freeBeds,
    occupancyPercentage: calculateOccupancyPercentage(safeOccupied, totalBeds),
    statusColor,
  };
}

/**
 * @deprecated Reception login-type routing was removed. Kept only for module graph compatibility.
 */
export function isReceptionLoginType(_loginType?: string | null): boolean {
  return false;
}

export function getReceptionTabFromPathname(pathname: string | null): ReceptionDashboardTab {
  if (!pathname) return "dashboard";

  const matched = RECEPTION_DASHBOARD_TABS.find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  );

  return matched?.value ?? "dashboard";
}

