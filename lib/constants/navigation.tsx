import type { ComponentType, ReactNode } from "react";

export type SidebarNavItem = {
  key: string;
  label: string;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  children?: SidebarNavItem[];
};

const iconClasses = "h-5 w-5 shrink-0";

const withIcon =
  (paths: React.ReactNode) =>
  ({ className }: { className?: string }) =>
    (
      <svg
        className={classNames(iconClasses, className)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths}
      </svg>
    );

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const SIDEBAR_NAVIGATION: SidebarNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: withIcon(<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-6v-6h-4v6H4a1 1 0 0 1-1-1z" />),
  },
  // hide some Infrastructure items for temparary purpose
  // {
  //   key: "hospital-infrastructure",
  //   label: "Infrastructure",
  //   icon: withIcon(
  //     <>
  //       <path d="M4 21V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13" />
  //       <path d="M4 21h16" />
  //       <path d="M9 21v-5h6v5" />
  //       <path d="M12 16v-3" />
  //       <path d="M10 10h4" />
  //     </>
  //   ),
  //   children: [
  //     {
  //       key: "hospital-infrastructure-builder",
  //       label: "Builder",
  //       href: "/hospital-infrastructure",
  //     },
  //     {
  //       key: "hospital-infrastructure-structure-preview",
  //       label: "Hierarchy Preview",
  //       href: "/hospital-infrastructure/structure-preview",
  //     },
  //   ],
  // },
  {
    key: "settings",
    label: "Settings",
    icon: withIcon(
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    children: [
      { key: "configuration", label: "Configuration", href: "/settings/configuration" },
      { key: "add-member", label: "Add Member Registration", href: "/settings/add-member" },
      { key: "branch-ip", label: "Branch IP Network", href: "/settings/branch-ip-network" },
      // hide some Settings items for temparary purpose
      // { key: "discount", label: "Discount Approval", href: "/settings/discount-approval" },
      // { key: "refund", label: "Refund Approval", href: "/settings/refund-approval" },
      { key: "users", label: "Users", href: "/settings/users" },
      { key: "groups", label: "Groups", href: "/settings/groups" },
      // { key: "panel", label: "Panel", href: "/settings/panel" },
      // { key: "stock", label: "Stock/Product", href: "/settings/stock-product" },
      // { key: "therapy", label: "Therapy", href: "/settings/therapy" },
      // { key: "tpa", label: "TPA Therapy", href: "/settings/tpa-therapy" },
      // { key: "lab-tests", label: "Lab Tests", href: "/settings/lab-tests" },
      // { key: "package", label: "Package", href: "/settings/package" },
      // { key: "field-users", label: "Field Users", href: "/settings/field-users" },
      // { key: "sms", label: "SMS", href: "/settings/sms" },
      // { key: "medical-report", label: "Medical Report Category", href: "/settings/medical-report-category" },
      // { key: "notifications", label: "Notifications", href: "/settings/notifications" },
      // { key: "diet-category", label: "Diet Category", href: "/settings/diet-category" },
      // { key: "diet", label: "Diet", href: "/settings/diet" },
      // { key: "diagnosis", label: "Diagnosis", href: "/settings/diagnosis" },
      // { key: "sub-diagnosis", label: "Sub Diagnosis", href: "/settings/sub-diagnosis" },
      // { key: "razarpay-pos-machine", label: "Razarpay Pos Machine", href: "/settings/razarpay-pos-machine" },
      // { key: "module-settings", label: "Module Settings", href: "/settings/module-settings" },
    ],
  },
  {
    key: "schedule",
    label: "Schedule",
    icon: withIcon(
      <>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="m16 13-3.5 3.5L11 14" />
      </>
    ),
    children: [
      { key: "appointments", label: "Appointments", href: "/dashboard/schedule/appointments" },
      { key: "availability", label: "Availability", href: "/dashboard/schedule/availability" },
    ],
  },
  {
    key: "doctors",
    label: "Doctors",
    icon: withIcon(
      <>
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </>
    ),
    children: [
      { key: "directory", label: "Directory", href: "/dashboard/doctors/directory" },
      { key: "credentials", label: "Credentials", href: "/dashboard/doctors/credentials" },
    ],
  },
  {
    key: "patients",
    label: "Patients",
    icon: withIcon(
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    children: [
      { key: "records", label: "Patient Records", href: "/dashboard/patients/records" },
      { key: "admissions", label: "Admissions", href: "/dashboard/patients/admissions" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    icon: withIcon(
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 3v4" />
        <path d="M8 3v4" />
        <path d="M2 11h20" />
      </>
    ),
    children: [
      { key: "invoices", label: "Invoices", href: "/dashboard/billing/invoices" },
      { key: "payments", label: "Payments", href: "/dashboard/billing/payments" },
      { key: "insurance", label: "Insurance Claims", href: "/dashboard/billing/insurance" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: withIcon(
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </>
    ),
    children: [
      { key: "medicine", label: "Medicine", href: "/dashboard/inventory/medicine" },
      { key: "supplies", label: "Supplies", href: "/dashboard/inventory/supplies" },
      { key: "vendors", label: "Vendors", href: "/dashboard/inventory/vendors" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: withIcon(<path d="M3 3h6l2 3h10v13H3z" />),
    children: [
      { key: "analytics", label: "Analytics", href: "/dashboard/reports/analytics" },
      { key: "compliance", label: "Compliance", href: "/dashboard/reports/compliance" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: withIcon(
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </>
    ),
    children: [
      { key: "email", label: "Email", href: "/dashboard/communication/email" },
      { key: "notifications-center", label: "Notification Center", href: "/dashboard/communication/notifications" },
    ],
  },
];


