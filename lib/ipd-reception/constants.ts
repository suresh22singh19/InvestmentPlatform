import type {
  ReceptionStatSubtextIcon,
  WardCapacityStatusColor,
} from "./types";

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
    iconTone: "green" as const,
    subtextKey: "awaitingSubtext" as const,
    subtextIcon: "trend" as ReceptionStatSubtextIcon,
    dataKey: "totalAwaiting" as const,
    padValue: false,
  },
  {
    id: "admittedToday",
    title: "Admitted Today",
    iconSrc: "/icons/addPatient.svg",
    iconTone: "green" as const,
    subtextKey: "admittedSubtext" as const,
    subtextIcon: "clock" as ReceptionStatSubtextIcon,
    dataKey: "admittedToday" as const,
    padValue: false,
  },
  {
    id: "availableBeds",
    title: "Available Beds",
    iconSrc: "/icons/bedDarkIcon.svg",
    iconTone: "green" as const,
    subtextKey: "bedsSubtext" as const,
    subtextIcon: "info" as ReceptionStatSubtextIcon,
    dataKey: "availableBeds" as const,
    padValue: false,
  },
  {
    id: "dischargePending",
    title: "Discharge Pending",
    iconSrc: "/icons/exitIcon.svg",
    iconTone: "red" as const,
    subtextKey: "dischargeSubtext" as const,
    subtextIcon: "info" as ReceptionStatSubtextIcon,
    dataKey: "dischargePending" as const,
    padValue: true,
  },
];

export const AWAITING_TABLE_COLUMNS = [
  "Sr no.",
  "Patient Name",
  "Patient UHID",
  "Admission Type",
  "Counsellor",
  "Waiting Time",
  "Action",
] as const;

export const DEFAULT_ITEMS_PER_PAGE = 6;
export const ITEMS_PER_PAGE_OPTIONS = [6, 10, 20, 50, 100];

export const WARD_CAPACITY_LEFT_IDS = ["general-ward", "private-suite", "private-ward"];

export const WARD_STATUS_COLORS: Record<WardCapacityStatusColor, { bar: string; text: string; track: string }> = {
  green: { bar: "#0B8C00", text: "#0B8C00", track: "#E8F5E9" },
  grey: { bar: "#434956", text: "#434956", track: "#F0F1F3" },
  red: { bar: "#EF4444", text: "#EF4444", track: "#FEE2E2" },
};

export const ROOM_TYPES_SECTION_TITLE = "Room Types";
export const WARD_CAPACITY_SECTION_TITLE = "Ward Capacity Overview";
