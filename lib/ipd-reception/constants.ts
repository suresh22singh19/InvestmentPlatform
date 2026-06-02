import type {
  ReceptionDashboardTab,
  ReceptionStatSubtextIcon,
  WardCapacityStatusColor,
} from "./types";

export const RECEPTION_LOGIN_TYPE = "reception";

export const RECEPTION_DASHBOARD_TABS: {
  value: ReceptionDashboardTab;
  label: string;
  iconSrc: string;
  href: string;
}[] = [
  {
    value: "dashboard",
    label: "Dashboard",
    iconSrc: "/icons/DashboardDarkIcon.svg",
    href: "/ipd-reception/dashboard",
  },
  {
    value: "admitted-patients",
    label: "Admitted Patients Registry",
    iconSrc: "/icons/patients.svg",
    href: "/ipd-reception/admitted-patients",
  },
  {
    value: "daily-operations",
    label: "Daily Operations",
    iconSrc: "/icons/calendarCheck.svg",
    href: "/ipd-reception/daily-operations",
  },
  {
    value: "historical-patients",
    label: "Historical Patient Registry",
    iconSrc: "/icons/patient_history.svg",
    href: "/ipd-reception/historical-patients",
  },
];

/**
 * Reception top-nav dropdown — only Dashboard is shown for now.
 * Other items remain in RECEPTION_DASHBOARD_TABS (routes and pages are not removed).
 */
export const RECEPTION_TOP_NAV_TABS = RECEPTION_DASHBOARD_TABS.filter(
  (tab) => tab.value === "dashboard"
);

/** Shared top-nav dropdown items for Reception menu. */
export const RECEPTION_NAV_MENU_ITEMS = RECEPTION_TOP_NAV_TABS.map((tab) => ({

// ALL TOPBAR NAV ITEMS ARE COMMENTED OUT EXCEPT DASHBOARD FOR NOW, AS PER PRODUCT DECISION.
// export const RECEPTION_NAV_MENU_ITEMS = RECEPTION_DASHBOARD_TABS.map((tab) => ({
  key: `ipdreception-${tab.value}`,
  label: tab.label,
  href: tab.href,
  iconSrc: tab.iconSrc,
}));

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
