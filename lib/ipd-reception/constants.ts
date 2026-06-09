import type { WardCapacityStatusColor } from "./types";
import type { StatCardSubtextIcon } from "@/components/ui/StatCard";

export const RECEPTION_LOGIN_TYPE = "reception";

export const RECEPTION_DASHBOARD_TAB = {
  value: "dashboard" as const,
  label: "Dashboard",
  iconSrc: "/icons/DashboardDarkIcon.svg",
  href: "/ipd-reception/dashboard",
};

/** IPD Reception top-nav dropdown — Dashboard only. */
export const RECEPTION_NAV_MENU_ITEMS = [
  {
    key: "ipdreception-dashboard",
    label: RECEPTION_DASHBOARD_TAB.label,
    href: RECEPTION_DASHBOARD_TAB.href,
    iconSrc: RECEPTION_DASHBOARD_TAB.iconSrc,
  },
];

export const RECEPTION_STAT_CARDS = [
  {
    id: "totalAwaiting",
    title: "Total Awaiting",
    iconSrc: "/icons/scheduledIcon.svg",
    subtextKey: "awaitingSubtext" as const,
    subtextIcon: "trend" as StatCardSubtextIcon,
    dataKey: "totalAwaiting" as const,
    padValue: false,
  },
  {
    id: "admittedToday",
    title: "Admitted Today",
    iconSrc: "/icons/addPatient.svg",
    subtextKey: "admittedSubtext" as const,
    subtextIcon: "clock" as StatCardSubtextIcon,
    dataKey: "admittedToday" as const,
    padValue: false,
  },
  {
    id: "availableBeds",
    title: "Available Beds",
    iconSrc: "/icons/bedDarkIcon.svg",
    subtextKey: "bedsSubtext" as const,
    subtextIcon: "info" as StatCardSubtextIcon,
    dataKey: "availableBeds" as const,
    padValue: false,
  },
  {
    id: "dischargePending",
    title: "Discharge Pending",
    iconSrc: "/icons/exitIcon.svg",
    subtextKey: "dischargeSubtext" as const,
    subtextIcon: "info" as StatCardSubtextIcon,
    dataKey: "dischargePending" as const,
    padValue: true,
  },
] as const;

export const WARD_CAPACITY_LEFT_IDS = ["general-ward", "private-suite", "private-ward"];

export const WARD_STATUS_COLORS: Record<WardCapacityStatusColor, { bar: string; text: string; track: string }> = {
  green: { bar: "#0B8C00", text: "#0B8C00", track: "#E8F5E9" },
  grey: { bar: "#434956", text: "#434956", track: "#F0F1F3" },
  red: { bar: "#EF4444", text: "#EF4444", track: "#FEE2E2" },
};

export const ROOM_TYPES_SECTION_TITLE = "Room Types";
export const WARD_CAPACITY_SECTION_TITLE = "Ward Capacity Overview";
