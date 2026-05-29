"use client";

import React, { useState, useRef, useEffect, useCallback, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { SIDEBAR_NAVIGATION, type SidebarNavItem } from "@/lib/constants/navigation";
import ScrollableContainer from "@/components/ui/ScrollableContainer";
import { useAppSelector } from "@/store/hooks";
import {
  selectLoginType,
  selectPermissionsMap,
  selectRoleCategoryType,
  selectSelectedBranch,
  selectUserEmail,
  selectIsAuthenticated,
} from "@/store/slices/authSlice";
import { registrationListPathFromBranchType } from "@/lib/utils/registrationBranchRoutes";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { hasModuleViewAccess, type NormalizedPermissionsMap } from "@/utils/permission";

// Email → registration route mapping for users who must see only one registration page.
const EMAIL_REGISTRATION_ROUTE: Record<string, string> = {
  "superadminhiims@dikonia.in": "/registration",
  "superadminhiims2@dikonia.in": "/registration/hospital",
};

// Central icon mapping for top navbar items (using SVGs from /public/icons)
const NAV_ICON_SRC: Record<string, string> = {
  dashboard: "/icons/DashboardDarkIcon.svg",
  patient: "/icons/RegistrationDarkIcon.svg",
  settings: "/icons/SettingsDarkIcon.svg",
  reports: "/icons/RegistrationDarkIcon.svg",
  registration: "/icons/RegistrationDarkIcon.svg",
  "hospital-infrastructure": "/icons/SettingsDarkIcon.svg", // Using Settings icon as fallback, can be replaced with specific icon later
  "infrastructure-view": "/icons/BranchRoleMasterIcon.svg", // View option for infrastructure page
  // Use same icon as Registration for Pre Booking
  "pre-booking": "/icons/RegistrationDarkIcon.svg",
  "lead-request": "/icons/RegistrationDarkIcon.svg",
  token: "/icons/TokenNav.svg",
  "discharge-pending": "/icons/RegistrationDarkIcon.svg",
  doctors: "/icons/DoctorDarkIcon.svg",
  "roles-master": "/icons/RoleMasterDarkIcon.svg",
  "branch-role-master": "/icons/BranchRoleMasterIcon.svg",
  nurse: "/icons/UsersDarkIcon.svg",
};

type TopNavigationBarProps = {
  onNavigate?: () => void;
  isOpen?: boolean;
};

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

/** Voucher tab: green + slate when idle; all white on the green selected pill (no CSS invert). */
function VoucherNavIcon({
  className,
  active,
}: {
  className?: string;
  active?: boolean;
}) {
  const main = active ? "#ffffff" : "#0B8C00";
  const detail = active ? "#ffffff" : "#434956";
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M15.0059 6.10107C14.7485 6.08731 14.4606 6.19854 14.2972 6.4061C14.2433 6.47605 14.1745 6.53454 14.0868 6.55518C13.7353 6.63373 13.3093 6.32525 13.1189 6.03626C12.9108 5.72148 12.9567 5.41414 13.1809 5.11942L13.2147 5.16013C13.3735 5.04488 13.3775 4.81495 13.323 4.65556C13.1206 4.02484 12.1579 3.06954 11.478 3.00481C11.2727 2.98015 11.0502 3.05068 10.9086 3.20721C10.7985 3.31558 10.5703 3.54494 10.4613 3.65274C8.12996 6.01906 5.70624 8.31611 3.49198 10.7971C3.35609 10.9593 3.21275 11.1268 3.09921 11.3114L3.08373 11.3383C3.08373 11.3383 3.07627 11.3521 3.0757 11.3521C3.06767 11.3699 3.05735 11.3842 3.0499 11.4043C3.02352 11.4633 3.00689 11.5178 3.00116 11.5895C3.00059 11.6216 2.99715 11.6308 3.00575 11.6881C3.01091 11.7311 3.03786 11.7993 3.03384 11.7867L3.04072 11.8022C3.3062 12.3395 3.95413 13.0419 4.49654 13.3107C4.83198 13.4833 5.2534 13.5298 5.58654 13.3004C5.6542 13.2522 5.72071 13.196 5.78608 13.1462L5.83654 13.1135C5.85374 13.1032 5.86922 13.0894 5.887 13.0819L5.9386 13.055L5.96383 13.0412L5.99021 13.0309C6.57161 12.7654 7.18627 13.2849 7.12436 13.8933C7.10601 14.0332 7.05613 14.1714 6.96554 14.2975C6.95407 14.3124 6.92253 14.3531 6.91221 14.368C6.90648 14.3761 6.89845 14.3829 6.89214 14.3904L6.85086 14.4351C6.81761 14.4718 6.78091 14.5097 6.75396 14.5515C6.67541 14.6679 6.6433 14.8101 6.64616 14.9385C6.67024 15.5033 7.23216 16.0819 7.67023 16.3881C8.03547 16.6472 8.58763 16.8571 9.01022 16.5612C9.10769 16.4987 9.2109 16.419 9.30092 16.3479C10.4683 15.372 11.4987 14.2586 12.5531 13.1708C13.9567 11.6903 15.3403 10.1926 16.6826 8.65651C16.7164 8.61809 16.8133 8.50112 16.8443 8.465C16.8982 8.39963 16.9538 8.32968 16.9762 8.24539C17.1924 7.32282 15.8885 6.12273 15.0066 6.10262L15.0059 6.10107ZM3.76656 11.4816C3.76484 11.477 3.76484 11.4776 3.76656 11.4816V11.4816ZM7.41389 15.0228C7.41389 15.0228 7.4179 15.0188 7.4202 15.016C7.41676 15.02 7.41332 15.0246 7.4093 15.028C7.40471 15.0326 7.41274 15.024 7.41389 15.0228ZM11.9831 12.6226C10.9487 13.6793 9.92809 14.7648 8.7974 15.7132C8.71541 15.782 8.60875 15.8536 8.55027 15.8932C8.18905 15.8858 7.591 15.3009 7.47117 14.9603C7.48837 14.9414 7.50672 14.9213 7.50672 14.9213C8.07494 14.2809 8.08985 13.3542 7.5199 12.7046C7.03711 12.1553 6.27797 11.9964 5.62035 12.3089L5.57506 12.3324L5.48504 12.3806C5.42999 12.4104 5.37036 12.4546 5.31647 12.4896C5.25913 12.5314 5.20638 12.5773 5.15076 12.6203C5.1456 12.6237 5.14101 12.6266 5.13643 12.6312C5.13069 12.6358 5.12496 12.6363 5.12037 12.6409C5.10604 12.6467 5.09228 12.6507 5.07622 12.6512C4.68748 12.6375 4.10549 11.9982 3.84976 11.6169C4.04873 11.3411 4.2838 11.0899 4.51029 10.8319C6.13932 9.04185 7.86111 7.31536 9.56808 5.58373C9.76016 5.84519 10.0646 6.09003 10.3513 6.19783C10.4608 6.23682 10.5669 6.17719 10.6093 6.08602C10.814 6.25573 11.0388 6.44152 11.2762 6.63761C11.1804 6.69323 11.1265 6.81651 11.1833 6.93118C11.3226 7.1978 11.6225 7.45124 11.9115 7.5361C12.0319 7.5705 12.1454 7.4885 12.1741 7.38014C12.4 7.56705 12.6288 7.75627 12.857 7.94435C12.7457 7.99194 12.6775 8.1284 12.7412 8.25283C12.8839 8.51659 13.1873 8.76601 13.4774 8.84686C13.6035 8.88069 13.7193 8.78837 13.74 8.6737C13.955 8.85087 14.162 9.02174 14.3575 9.18287C14.2514 9.23562 14.1901 9.37093 14.2543 9.49078C14.3386 9.64043 14.4579 9.75969 14.5955 9.8566C13.7342 10.7883 12.8605 11.7086 11.9849 12.6226L11.9831 12.6226Z"
        fill={main}
      />
      <path
        d="M8.51571 9.46738C8.1843 9.17553 7.67972 9.03677 7.2646 9.26269C7.12986 9.33723 7.01404 9.44159 6.93605 9.57346C6.57597 10.1876 7.08915 11.1113 7.67227 11.3986C7.96698 11.5448 8.2984 11.5144 8.52546 11.2638L8.51399 11.253C8.60573 11.1733 8.69518 11.085 8.76686 10.9737C9.10344 10.4795 8.95551 9.84417 8.51456 9.46741L8.51571 9.46738ZM8.34312 10.5012C8.34083 10.5815 8.30872 10.6766 8.2703 10.7558C8.25654 10.781 8.23877 10.8085 8.22558 10.8343C8.2078 10.8596 8.18888 10.8871 8.17168 10.9129L8.16021 10.902C8.14416 10.9112 8.13212 10.9221 8.11606 10.9272L8.10975 10.9307C8.10001 10.9312 8.09083 10.9352 8.08166 10.9341C7.84199 10.91 7.60747 10.5052 7.54784 10.2856C7.51745 10.1755 7.49165 10.0259 7.5444 9.94387C7.54612 9.94215 7.54612 9.93814 7.54842 9.93756C7.55243 9.93584 7.553 9.9324 7.5553 9.92953C7.6069 9.88424 7.65048 9.86417 7.72846 9.86245C8.03923 9.87277 8.36204 10.1778 8.34312 10.5012Z"
        fill={detail}
      />
      <path
        d="M11.8634 9.46726C11.532 9.1754 11.0274 9.03665 10.6123 9.26257C10.4775 9.33711 10.3617 9.44147 10.2837 9.57334C9.92363 10.1874 10.4368 11.1112 11.0199 11.3985C11.3146 11.5447 11.6461 11.5143 11.8731 11.2637L11.8616 11.2528C11.9534 11.1731 12.0428 11.0848 12.1145 10.9736C12.4511 10.4793 12.3032 9.84404 11.8622 9.46729L11.8634 9.46726ZM11.6908 10.5011C11.6885 10.5813 11.6564 10.6765 11.618 10.7557C11.6042 10.7809 11.5864 10.8084 11.5732 10.8342C11.5555 10.8594 11.5365 10.887 11.5193 10.9128L11.5079 10.9019C11.4918 10.911 11.4798 10.9219 11.4637 10.9271L11.4574 10.9305C11.4477 10.9311 11.4385 10.9351 11.4293 10.934C11.1896 10.9099 10.9551 10.5051 10.8955 10.2855C10.8651 10.1754 10.8393 10.0257 10.8921 9.94375C10.8938 9.94203 10.8938 9.93801 10.8961 9.93744C10.9001 9.93572 10.9007 9.93228 10.903 9.92941C10.9546 9.88412 10.9981 9.86405 11.0761 9.86233C11.3869 9.87265 11.7097 10.1777 11.6908 10.5011Z"
        fill={detail}
      />
      <path
        d="M8.82334 8.49952C8.98274 9.2151 9.14903 9.96394 9.28319 10.6829C9.42597 11.4174 9.53089 12.1565 9.65016 12.8968C9.70463 13.176 10.1043 13.1576 10.1318 12.8738C10.2453 11.4415 9.90932 9.62797 9.30727 8.32407C9.16507 8.04942 8.75625 8.19678 8.8239 8.50067L8.82334 8.49952Z"
        fill={detail}
      />
    </svg>
  );
}

/** Roles & Permissions — artwork from /public/icons/Roles&Permission.svg; green when idle, white on active pill (no CSS invert). */
function RolesPermissionNavIcon({
  className,
  active,
}: {
  className?: string;
  active?: boolean;
}) {
  const clipPathId = useId().replace(/:/g, "");
  const fill = active ? "#ffffff" : "#0B8C00";
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g clipPath={`url(#${clipPathId})`}>
        <path
          d="M13.2577 9.41406C12.4772 9.41406 11.7143 9.6455 11.0653 10.0791C10.4164 10.5127 9.91058 11.129 9.61191 11.8501C9.31323 12.5712 9.23509 13.3646 9.38735 14.1301C9.53961 14.8956 9.91545 15.5987 10.4673 16.1506C11.0192 16.7024 11.7223 17.0783 12.4878 17.2305C13.2533 17.3828 14.0467 17.3047 14.7678 17.006C15.4889 16.7073 16.1052 16.2015 16.5388 15.5526C16.9724 14.9036 17.2038 14.1407 17.2038 13.3602C17.1984 12.3153 16.7809 11.3148 16.042 10.5759C15.3031 9.83703 14.3026 9.41952 13.2577 9.41406ZM13.95 13.7064C13.8426 13.7037 13.7368 13.6802 13.6384 13.6371L12.15 15.1256C12.0665 15.2082 11.9557 15.2575 11.8384 15.2641C11.779 15.2698 11.719 15.2601 11.6645 15.2358C11.6099 15.2116 11.5625 15.1736 11.5269 15.1256C11.4434 15.0364 11.397 14.9189 11.397 14.7968C11.397 14.6746 11.4434 14.5571 11.5269 14.4679L13.0154 12.9794C12.9759 12.8799 12.9526 12.7748 12.9461 12.6679C12.9304 12.5029 12.9489 12.3363 13.0006 12.1788C13.0524 12.0213 13.1361 11.8762 13.2467 11.7526C13.3572 11.629 13.4922 11.5297 13.643 11.4609C13.7938 11.392 13.9573 11.3551 14.1231 11.3525C14.2304 11.3552 14.3362 11.3787 14.4346 11.4218C14.5038 11.4218 14.5038 11.491 14.4692 11.5256L13.7769 12.1833C13.7609 12.1914 13.7474 12.2037 13.738 12.219C13.7286 12.2343 13.7236 12.2519 13.7236 12.2698C13.7236 12.2878 13.7286 12.3054 13.738 12.3206C13.7474 12.3359 13.7609 12.3483 13.7769 12.3564L14.2269 12.8064C14.2392 12.8222 14.255 12.835 14.273 12.8438C14.291 12.8526 14.3107 12.8572 14.3308 12.8572C14.3508 12.8572 14.3706 12.8526 14.3886 12.8438C14.4066 12.835 14.4223 12.8222 14.4346 12.8064L15.0923 12.1487C15.1269 12.1141 15.2308 12.1141 15.2308 12.1833C15.2667 12.2839 15.29 12.3885 15.3 12.4948C15.2974 12.6651 15.2596 12.8331 15.189 12.9881C15.1184 13.1431 15.0165 13.2819 14.8897 13.3956C14.763 13.5094 14.6141 13.5957 14.4523 13.6492C14.2906 13.7027 14.1196 13.7221 13.95 13.7064Z"
          fill={fill}
        />
        <path
          d="M7.51226 9.62218C9.97842 9.62218 11.9776 7.62295 11.9776 5.15679C11.9776 2.69063 9.97842 0.691406 7.51226 0.691406C5.0461 0.691406 3.04688 2.69063 3.04688 5.15679C3.04688 7.62295 5.0461 9.62218 7.51226 9.62218Z"
          fill={fill}
        />
        <path
          d="M8.72336 17.2378C9.4849 17.2378 9.06952 16.7185 9.06952 16.7185C8.30524 15.7666 7.88991 14.5816 7.89259 13.3608C7.88892 12.5957 8.05441 11.8392 8.37721 11.1454C8.39174 11.1058 8.41547 11.0703 8.44644 11.0416C8.68875 10.557 8.20413 10.5224 8.20413 10.5224C7.98615 10.4936 7.76624 10.482 7.54644 10.4878C5.9167 10.4941 4.34319 11.0842 3.11118 12.1511C1.87918 13.218 1.07025 14.691 0.831055 16.3031C0.831055 16.6493 0.934901 17.2724 2.00798 17.2724H8.61952C8.68875 17.2378 8.68875 17.2378 8.72336 17.2378Z"
          fill={fill}
        />
      </g>
      <defs>
        <clipPath id={clipPathId}>
          <rect width="18" height="18" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

// Settings items with icons matching the reference images
type SettingsItem = {
  key: string;
  label: string;
  href: string;
  iconSrc?: string; // preferred: SVG from /public/icons
  fallbackIcon?: React.ReactNode; // used when we don't yet have an SVG
};

const getAllSettingsItems = (): SettingsItem[] => [
  {
    key: "configuration",
    label: "Configuration",
    href: "/settings/configuration",
    iconSrc: "/icons/SettingsDarkIcon.svg",
  },
  {
    key: "branch-ip",
    label: "Branch IP Network",
    href: "/settings/branch-ip-network",
    iconSrc: "/icons/BranchIPNetworkDarkIcon.svg",
  },
  {
    key: "duplicate-no-exp",
    label: "Duplicate Number Exceptions",
    href: "/settings/duplicate-number-exceptions",
    iconSrc: "/icons/DuplicateNoExpDarkIcon.svg",
  },
  {
    key: "manage-contact-updates",
    label: "Manage Contact Updates",
    href: "/settings/manage-contact-updates",
    iconSrc: "/icons/Contact.svg", // Using same icon for now, can be replaced with specific icon later
  },

  // hide some Settings items for temparary purpose not remove the code any condition i will uncomment when its needed

  {
    key: "discount",
    label: "Discount Approval",
    href: "/settings/discount-approval",
    iconSrc: "/icons/DiscountApprovalDarkIcon.svg",
  },
  {
    key: "refund",
    label: "Refund Approval",
    href: "/settings/refund-approval",
    iconSrc: "/icons/DiscountApprovalDarkIcon.svg",
  },
  {
    key: "users",
    label: "Users",
    href: "/settings/users",
    iconSrc: "/icons/UsersDarkIcon.svg",
  },
  {
    key: "panel",
    label: "Panel",
    href: "/settings/panel",
    iconSrc: "/icons/PannelDarkIcon.svg",
  },
  {
    key: "document",
    label: "Document Master",
    href: "/settings/document",
    iconSrc: "/icons/PannelDarkIcon.svg",
  },
  // {
  //   key: "stock",
  //   label: "Stock/Product",
  //   href: "/settings/stock-product",
  //   iconSrc: "/icons/Stock&ProductDarkIcon.svg",
  // },
  {
    key: "therapy",
    label: "Therapy",
    href: "/settings/therapy",
    iconSrc: "/icons/PanelTherapy.svg",
  },
  // {
  //   key: "tpa",
  //   label: "TPA Therapy",
  //   href: "/settings/tpa-therapy",
  //   iconSrc: "/icons/TpaTherapyDarkIcon.svg",
  // },
  {
    key: "lab-tests",
    label: "Lab Tests",
    href: "/settings/lab-tests",
    iconSrc: "/icons/LabTestsDarkIcon.svg",
  },
  {
    key: "package",
    label: "Packages",
    href: "/settings/package",
    iconSrc: "/icons/PackageDarkIcon.svg",
  },
  {
    key: "offer-master",
    label: "Offer Master",
    href: "/settings/offer-master",
    iconSrc: "/icons/DiscountApprovalDarkIcon.svg",
  },
  // {
  //   key: "field-users",
  //   label: "Field Users",
  //   href: "/settings/field-users",
  //   iconSrc: "/icons/UsersDarkIcon.svg",
  // },
  // {
  //   key: "sms",
  //   label: "SMS",
  //   href: "/settings/sms",
  //   iconSrc: "/icons/SmsDarkIcon.svg",
  // },
  // {
  //   key: "medical-report",
  //   label: "Medical Report Category",
  //   href: "/settings/medical-report-category",
  //   iconSrc: "/icons/DoctorDarkIcon.svg",
  //   fallbackIcon: (
  //     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
  //       <path d="M4.19 4.19C2.8 5.58 2 7.55 2 9.77c0 4.71 3.81 8.46 8.56 8.23a9.1 9.1 0 0 0 2.54-.42" />
  //       <path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
  //       <path d="M21.42 15.61A9.98 9.98 0 0 0 12 2c-1.3 0-2.52.29-3.62.81" />
  //       <path d="M22 2 16 8" />
  //       <path d="M18 2v6h6" />
  //     </svg>
  //   ),
  // },
  // {
  //   key: "notifications",
  //   label: "Notifications",
  //   href: "/settings/notifications",
  //   iconSrc: "/icons/NotificationDarkIcon.svg",
  // },
  {
    key: "diet-category",
    label: "Diet Category",
    href: "/settings/diet-category",
    iconSrc: "/icons/DietCategoryDarkIcon.svg",
  },
  {
    key: "diet",
    label: "Diagnosis Diet",
    href: "/settings/diet",
    iconSrc: "/icons/DiagnosisDietDarkIcon.svg",
  },
  {
    key: "diagnosis",
    label: "Diagnosis",
    href: "/settings/diagnosis",
    iconSrc: "/icons/DiagnosisDarkIcon.svg",
  },
  {
    key: "sub-diagnosis",
    label: "Sub Diagnosis",
    href: "/settings/sub-diagnosis",
    iconSrc: "/icons/DiagnosisDarkIcon.svg",
  },
  {
    key: "health-card-management",
    label: "Health Card Management",
    href: "/settings/health-card-management",
    iconSrc: "/icons/SettingsDarkIcon.svg",
  },
  {
    key: "support",
    label: "Support",
    href: "/settings/support",
    iconSrc: "/icons/Contact.svg",
  },
  {
    key: "misc-settings",
    label: "Misc Settings",
    href: "/settings/misc-settings",
    iconSrc: "/icons/SettingsDarkIcon.svg",
  },
  {
    key: "facilities",
    label: "Facilities",
    href: "/settings/facilities",
    iconSrc: "/icons/hospitalicon.svg",
  },
  {
    key: "hardware",
    label: "Hardware",
    href: "/settings/hardware",
    iconSrc: "/icons/Printer.svg",
  },
  {
    key: "room-type",
    label: "Room Type Master",
    href: "/settings/room-type",
    iconSrc: "/icons/roominfo.svg",
  },
  {
    key: "consultancy-service",
    label: "Consultancy Service",
    href: "/settings/consultancy-service",
    iconSrc: "/icons/SettingsDarkIcon.svg",
  },
  // {
  //   key: "razarpay-pos-machine",
  //   label: "Razarpay Pos Machine",
  //   href: "/settings/razarpay-pos-machine",
  //   iconSrc: "/icons/RazarpayPosMachineDarkIcon.svg",
  // },
  // {
  //   key: "module-settings",
  //   label: "Module Settings",
  //   href: "/settings/module-settings",
  //   iconSrc: "/icons/ModuleSettingsDarkIcon.svg",
  // },


  // {
  //   key: "groups",
  //   label: "Groups",
  //   href: "/settings/groups",
  //   fallbackIcon: (
  //     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
  //       <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
  //       <circle cx="9" cy="7" r="4" />
  //       <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
  //       <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  //     </svg>
  //   ),
  // },
];

// Hospital Infrastructure items
type HospitalInfrastructureItem = {
  key: string;
  label: string;
  href: string;
  iconSrc?: string;
  fallbackIcon?: React.ReactNode;
};

const getAllHospitalInfrastructureItems = (): HospitalInfrastructureItem[] => [
  {
    key: "hospital-infrastructure-builder",
    label: "Builder",
    href: "/hospital-infrastructure",
    iconSrc: "/icons/SettingsDarkIcon.svg", // Using Settings icon as fallback, can be replaced with specific icon later
  },
  {
    key: "hospital-infrastructure-structure-preview",
    label: "Hierarchy Preview",
    href: "/hospital-infrastructure/structure-preview",
    iconSrc: "/icons/SettingsDarkIcon.svg", // Using Settings icon as fallback, can be replaced with specific icon later
  },
];

// Patient sub-options (OPD, Old OPD, IPD, DayCare)
type PatientItem = {
  key: string;
  label: string;
  href: string;
  iconSrc?: string;
  fallbackIcon?: React.ReactNode;
  disabled?: boolean;
};

const getPatientItems = (): PatientItem[] => [
  { key: "patient-opd", label: "OPD", href: "/registration/registrationList", iconSrc: "/icons/RegistrationDarkIcon.svg" },
  { key: "patient-old-opd", label: "Old OPD", href: "/patient/opd", iconSrc: "/icons/RegistrationDarkIcon.svg" },
  { key: "patient-ipd", label: "IPD", href: "/patient/ipd", iconSrc: "/icons/RegistrationDarkIcon.svg" },
  { key: "patient-daycare", label: "DayCare", href: "/patient/daycare", iconSrc: "/icons/RegistrationDarkIcon.svg" },
  { key: "patient-discharge", label: "Discharge", href: "/patient/discharge", iconSrc: "/icons/RegistrationDarkIcon.svg" },
];

const getAllDoctorItems = (): SettingsItem[] => [
  {
    key: "doctor-main",
    label: "Doctor",
    href: "/doctor",
    iconSrc: "/icons/DoctorDarkIcon.svg",
  },
  // {
  //   key: "doctor-camp",
  //   label: "Camp Doctor",
  //   href: "/doctor/camp",
  //   iconSrc: "/icons/DoctorDarkIcon.svg",
  // },
  // {
  //   key: "doctor-visit",
  //   label: "Doctor Visit",
  //   href: "/doctor/visit",
  //   iconSrc: "/icons/DoctorDarkIcon.svg",
  // },
];

const getAllNurseItems = (): SettingsItem[] => [
  {
    key: "nurse-main",
    label: "Nurse",
    href: "/nurse",
    iconSrc: "/icons/UsersDarkIcon.svg",
  },
];

const getPreBookingItems = (): SettingsItem[] => [
  {
    key: "pre-booking-new",
    label: "New Pre Booking",
    href: "/pre-booking",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
  {
    key: "pre-booking-old",
    label: "Old Pre Booking",
    href: "/pre-booking/old",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
];

const getLeadRequestItems = (): SettingsItem[] => [
  {
    key: "lead-request-new",
    label: "New Lead Request",
    href: "/lead-request",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
  {
    key: "lead-request-old",
    label: "Old Lead Request",
    href: "/lead-request/old",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
];

type RolesPermissionItem = {
  key: string;
  label: string;
  href: string;
  iconSrc?: string;
  fallbackIcon?: React.ReactNode;
};

const getRolesPermissionItems = (): RolesPermissionItem[] => [
  {
    key: "role-master",
    label: "Role Master",
    href: "/roles&permission/role-master",
    fallbackIcon: <RolesPermissionNavIcon className="h-8 w-8 shrink-0" active={false} />,
  },
  {
    key: "branch-role-master",
    label: "Branch Role Master",
    href: "/roles&permission/banch-role-master",
    fallbackIcon: <RolesPermissionNavIcon className="h-8 w-8 shrink-0" active={false} />,
  },
  {
    key: "approval-level-setup",
    label: "Approval Level Setup",
    href: "/roles&permission/approval-level-setup",
    fallbackIcon: <RolesPermissionNavIcon className="h-8 w-8 shrink-0" active={false} />,
  },
  {
    key: "approval-level-assignment",
    label: "Approval Level Assignment",
    href: "/roles&permission/approval-level-assignment",
    fallbackIcon: <RolesPermissionNavIcon className="h-8 w-8 shrink-0" active={false} />,
  },
];

type DropdownGridProps = {
  items: (SettingsItem | HospitalInfrastructureItem | PatientItem)[];
  pathname: string | null;
  onNavigate: () => void;
  title: string;
  /** When set, menu is portaled with fixed position (avoids clipping inside overflow scroll areas). */
  fixedPlacement?: { top: number; left: number } | null;
};

const DropdownGrid = ({ items, pathname, onNavigate, title, fixedPlacement }: DropdownGridProps) => {
  const ITEMS_PER_COLUMN = 6;
  const totalItems = items.length;
  const numberOfColumns = Math.ceil(totalItems / ITEMS_PER_COLUMN);

  // Track window/viewport size so dropdown recalculates on resize and zoom
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth : 0)
  );

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();

    window.addEventListener("resize", updateWidth);
    // Zoom changes often update visualViewport; listen so dropdown updates without refresh
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", updateWidth);
      vv.addEventListener("scroll", updateWidth);
    }
    return () => {
      window.removeEventListener("resize", updateWidth);
      if (vv) {
        vv.removeEventListener("resize", updateWidth);
        vv.removeEventListener("scroll", updateWidth);
      }
    };
  }, []);

  // Split items into columns
  const columns: (
    | SettingsItem
    | HospitalInfrastructureItem
    | PatientItem
    | RolesPermissionItem
  )[][] = [];
  for (let i = 0; i < numberOfColumns; i++) {
    const start = i * ITEMS_PER_COLUMN;
    const end = start + ITEMS_PER_COLUMN;
    columns.push(items.slice(start, end));
  }

  // Calculate width based on number of columns (1/4, 2/4, 3/4, or 4/4 of 1400px) + extra padding on right
  const baseWidth = 1400;
  const columnWidth = (numberOfColumns / 4) * baseWidth;
  const extraPadding = 24; // Add extra width on right side
  const finalWidth = columnWidth + extraPadding;

  const getLeftValue = () => {
    const width = viewportWidth;
    if (width >= 1720) return "-100px";
    if (width >= 1600) return "-230px";
    if (width >= 1440) return "-345px";
    if (width >= 1280) return "-300px";
    if (width >= 1024) return "-360px";
    return "0px";
  };

  const dropdownWidth =
    viewportWidth <= 991
      ? "100%"
      : viewportWidth <= 1100
        ? "800px"
        : viewportWidth <= 1300
          ? "fit-content"
          : `${finalWidth}px`;

  // For dropdowns with few items (e.g. Patient: OPD, IPD, DayCare), use a minimum width so it looks like Settings
  const minWidth = totalItems <= 4 ? "380px" : undefined;

  const isFixed = !!fixedPlacement;

  return (
    <div
      className={classNames(
        "bg-white border border-[#ffffff] rounded-[16px] lg:shadow-lg pointer-events-auto",
        isFixed ? "fixed z-[200]" : "absolute top-full left-0 mt-5 z-50"
      )}
      style={{
        width: dropdownWidth,
        ...(minWidth && { minWidth }),
        ...(!isFixed && numberOfColumns === 4 && { left: getLeftValue() }),
        ...(isFixed && fixedPlacement
          ? { top: fixedPlacement.top, left: fixedPlacement.left }
          : {}),
      }}
    >
      {/* Opened Heading Section */}
      <div className="px-6 text-hide">
        <div className="w-full py-5 border-b border-[#E9F3E6]">
          <h1 className="text-[32px] font-semibold leading-tight text-[#262D3B]">{title}</h1>
        </div>
      </div>

      {/* Grid - Column Layout */}
      <ScrollableContainer
        maxHeight="calc(100vh - 300px)"
        className="px-6 py-6"
      >
        <div className="flex gap-2 col-cstm">
          {columns.map((columnItems, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-0 flex-1">
              {columnItems.map((item) => {
                const isRootRegistrationItem = item.href === "/registration";
                const isRootInfrastructureItem = item.href === "/hospital-infrastructure";
                const isRootPreBookingItem = item.href === "/pre-booking";
                const isRootLeadRequestItem = item.href === "/lead-request";
                const isDisabled = "disabled" in item && (item as PatientItem).disabled === true;

                // Determine if this item is active
                let isActive = false;
                if (pathname) {
                  if (item.href === "/doctor") {
                    isActive =
                      pathname === "/doctor" ||
                      (pathname.startsWith("/doctor/") &&
                        !pathname.startsWith("/doctor/camp") &&
                        !pathname.startsWith("/doctor/visit"));
                  } else if (isRootRegistrationItem) {
                    // For registration root, only match exact path
                    isActive = pathname === item.href;
                  } else if (isRootInfrastructureItem) {
                    // For infrastructure root (Builder), match exact path only (not structure-preview)
                    isActive = pathname === item.href;
                  } else if (isRootPreBookingItem) {
                    // For Pre Booking root, keep exact match so "Old Pre Booking" can highlight independently.
                    isActive = pathname === item.href;
                  } else if (isRootLeadRequestItem) {
                    // For Lead Request root, keep exact match so "Old Lead Request" can highlight independently.
                    isActive = pathname === item.href;
                  } else {
                    // For other items (including structure-preview), match exact path or paths that start with it
                    isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                  }
                }
                if (isDisabled) {
                  return (
                    <div
                      key={item.key}
                      className={classNames(
                        "cstm-link flex items-center gap-[15px] w-full h-[60px] px-0 py-3 pl-4 rounded-[12px] border border-transparent cursor-not-allowed opacity-60"
                      )}
                      aria-disabled="true"
                    >
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center text-[#9CA3AF]">
                        {item.iconSrc ? (
                          <Image src={item.iconSrc} alt={item.label} width={32} height={32} className="opacity-70" />
                        ) : (
                          item.fallbackIcon
                        )}
                      </div>
                      <span className="text-[18px] leading-[18px] tracking-[-0.01em] whitespace-nowrap flex-1 font-medium text-[#9CA3AF]">
                        {item.label}
                      </span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={classNames(
                      "cstm-link flex items-center gap-[15px] w-full h-[60px] px-0 py-3 pl-4 rounded-[12px] border border-transparent cursor-pointer",
                      isActive
                        ? "shadow-[0_6px_24px_0_rgba(0,0,0,0.15)]"
                        : "hover:bg-[#F2F8F2]"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate();
                    }}
                  >
                    <div className={classNames("w-9 h-9 shrink-0 flex items-center justify-center", "text-[#0B8C00]")}>
                      {item.iconSrc ? (
                        <Image src={item.iconSrc} alt={item.label} width={32} height={32} />
                      ) : (
                        item.fallbackIcon
                      )}
                    </div>
                    <span
                      className={classNames(
                        "text-[18px] leading-[18px] tracking-[-0.01em] whitespace-nowrap flex-1",
                        isActive ? "font-semibold text-[#353535]" : "font-medium text-[#434956]"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollableContainer>
    </div>
  );
};

const shouldItemBeActive = (pathname: string, item: SidebarNavItem): boolean => {
  if (item.href && pathname === item.href) {
    return true;
  }

  if (item.children) {
    return item.children.some((child) => !!child.href && pathname?.startsWith(child.href));
  }

  return false;
};

// Define top navigation items based on Figma design
// Note: Registration will be conditionally added based on login_type
const BASE_TOP_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "settings", label: "Settings", hasDropdown: true },
  { key: "roles-permission", label: "Roles & Permissions", hasDropdown: true },
  { key: "patient", label: "Patient", hasDropdown: true },
  { key: "doctors", label: "Doctor", href: "/doctor" },
  { key: "nurse", label: "Nurse", href: "/nurse" },
  { key: "reports", label: "Reports", href: "/reports" },
  { key: "infrastructure-view", label: "Infrastructure", href: "/infrastructure" },
  { key: "pre-booking", label: "Pre Booking", hasDropdown: true },
  { key: "lead-request", label: "Lead Request", hasDropdown: true },
  { key: "voucher", label: "Voucher", href: "/voucher" },
  { key: "token", label: "Tokens", href: "/token" },
  { key: "discharge-pending", label: "Discharge Pending", href: "/discharge-pending" },
];

const TOP_NAV_PERMISSION_ALIASES: Record<string, string[]> = {
  dashboard: ["dashboard"],
  settings: ["settings"],
  "roles-permission": ["roles-permissions", "roles-and-permissions", "roles-permission"],
  patient: ["patient", "patients", "registration-list"],
  reports: ["reports", "report"],
  "infrastructure-view": ["infrastructure", "infrastructure-view", "hospital-infrastructure"],
  "pre-booking": ["pre-booking", "prebooking", "pre-bookings"],
  "lead-request": ["lead-request", "lead"],
  voucher: ["vouchers", "voucher"],
  token: ["token", "tokens"],
  "discharge-pending": ["discharge-pending"],
  doctors: ["doctor", "doctors"],
  nurse: ["nurse", "nurses"],
  registration: ["registration"],

};

const SETTINGS_SUBMODULE_ALIASES: Record<string, string[]> = {
  configuration: ["configuration"],
  "branch-ip": ["branch-ip-network", "branch-ip", "ip-network"],
  "duplicate-no-exp": ["duplicate-number-exceptions", "duplicate-no-exp"],
  "manage-contact-updates": ["manage-contact-updates"],
  discount: ["discount-approval", "discount"],
  refund: ["refund-approval", "refund"],
  users: ["users", "user"],
  panel: ["panel"],
  document: ["document", "document-master"],
  therapy: ["therapy"],
  "lab-tests": ["lab-tests", "lab-test"],
  package: ["package", "packages", "package-master", "package-settings", "package-management"],
  "diet-category": ["diet-category"],
  diet: ["diagnosis-diet", "diet"],
  diagnosis: ["diagnosis"],
  "sub-diagnosis": ["sub-diagnosis"],
  "health-card-management": ["health-card-management"],
  support: ["support"],
  "misc-settings": ["misc-settings"],
  facilities: ["facilities", "facility"],
  hardware: ["hardware"],
  "room-type": ["room-type-master", "room-type"],
  "consultancy-service": ["consultancy-service"],
  "offer-master": ["offer-master", "offer"],
};

const ROLES_SUBMODULE_ALIASES: Record<string, string[]> = {
  "role-master": ["role-master"],
  "branch-role-master": ["branch-role-master"],
  "approval-level-setup": ["approval-level-setup"],
  "approval-level-assignment": ["approval-level-assignment"],
};

const PATIENT_SUBMODULE_ALIASES: Record<string, string[]> = {
  /** OPD list — submodule name "Opd" → slug `opd` */
  "patient-opd": ["opd", "patient-opd", "registration-list"],
  /** Old OPD — shown only when the user has an "Old Opd" / "Opd" submodule explicitly */
  "patient-old-opd": ["old-opd", "patient-old-opd", "opd", "patient-opd"],
  /** IPD — shown only when the user has the "Ipd" submodule */
  "patient-ipd": ["ipd", "patient-ipd"],
  /** DayCare — shown only when the user has the "DayCare" / "Daycare" submodule */
  "patient-daycare": ["daycare", "day-care", "patient-daycare"],
  /** Discharge — shown only when the user has the "Discharge" submodule */
  "patient-discharge": ["discharge", "patient-discharge"],
};

const DOCTOR_SUBMODULE_ALIASES: Record<string, string[]> = {
  "doctor-main": ["doctor", "doctors"],
  "doctor-camp": ["doctor", "doctors", "camp-doctor", "camp"],
  "doctor-visit": ["doctor", "doctors", "doctor-visit", "visit"],
};

const NURSE_SUBMODULE_ALIASES: Record<string, string[]> = {
  "nurse-main": ["nurse", "nurses"],
};

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const hasAccessByAliases = (
  permissionsMap: NormalizedPermissionsMap | null | undefined,
  aliases: string[]
): boolean => {
  if (!permissionsMap) return true;
  if (Object.keys(permissionsMap).length === 0) return true;
  return aliases.some((alias) => hasModuleViewAccess(permissionsMap, alias));
};

const filterBySubModuleAccess = <T extends { key: string }>(
  items: T[],
  permissionsMap: NormalizedPermissionsMap | null | undefined,
  moduleAliases: string[],
  subModuleAliases: Record<string, string[]>
): T[] => {
  if (!permissionsMap) return items;
  if (Object.keys(permissionsMap).length === 0) return items;
  const matchedModule = Object.values(permissionsMap).find((module) =>
    moduleAliases.some((alias) => normalizeName(alias) === module.key)
  );
  if (!matchedModule) return [];

  return items.filter((item) => {
    const aliases = subModuleAliases[item.key] ?? [item.key];
    return aliases.some((alias) => {
      const normalizedAlias = normalizeName(alias);
      const subModule = matchedModule.subModules[normalizedAlias];
      return Boolean(subModule?.isActive && subModule?.canView);
    });
  });
};
// we will use that when required!!!!!!!!!!!!!!!
// { key: "doctors", label: "Doctor", href: "/dashboard/doctors" },
// { key: "roles-master", label: "Roles Master", href: "/roles-master" },
// { key: "branch-role-master", label: "Branch Role Master", href: "/branch-role-master" },
// { key: "registration", label: "Registration", href: "/registration/hospital" },
// { key: "hospital-infrastructure", label: "Infrastructure 1", hasDropdown: true },
export function TopNavigationBar({ onNavigate, isOpen }: TopNavigationBarProps) {
  const pathname = usePathname();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dropdownPortalRef = useRef<HTMLDivElement | null>(null);
  const [dropdownFixedPlacement, setDropdownFixedPlacement] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const loginType = useAppSelector(selectLoginType);
  const permissionsMap = useAppSelector(selectPermissionsMap);
  const selectedBranch = useAppSelector(selectSelectedBranch);
  const userEmail = useAppSelector(selectUserEmail);
  const roleCategoryType = useAppSelector(selectRoleCategoryType);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isSuperAdminForRegistrationNav = roleCategoryType?.toLowerCase() === "superadmin";
  const { data: superAdminBranchesNav } = useGetBranchesQuery(undefined, {
    skip: !isSuperAdminForRegistrationNav,
  });

  // If the logged-in admin's email maps to a specific registration page, use that route
  // (case-insensitive comparison).
  const emailBasedRegistrationRoute = userEmail
    ? EMAIL_REGISTRATION_ROUTE[userEmail.toLowerCase()] ?? null
    : null;

  // Check if login_type is "clinic user" or "hospital user" (limited nav – only Registration shown)
  const shouldShowRegistration =
    loginType?.toLowerCase() === "clinic user" ||
    loginType?.toLowerCase() === "hospital user";


  // Get the registration href based on login_type (or email override)
  const getRegistrationHref = () => {
    if (emailBasedRegistrationRoute) return emailBasedRegistrationRoute;
    if (isSuperAdminForRegistrationNav) {
      const rows = superAdminBranchesNav?.data;
      if (rows?.length) {
        return registrationListPathFromBranchType((rows[0] as { type?: string }).type);
      }
      return registrationListPathFromBranchType(selectedBranch?.type);
    }
    if (selectedBranch?.type?.toLowerCase() === "hospital") return "/registration/hospital";
    if (selectedBranch?.type?.toLowerCase() === "clinic") return "/registration";
    if (loginType?.toLowerCase() === "clinic user") return "/registration";
    if (loginType?.toLowerCase() === "hospital user") return "/registration/hospital";
    return "/registration";
  };

  // const settingsItems = useMemo(() => {
  //   const all = getAllSettingsItems();
  //   const filtered = filterBySubModuleAccess(
  //     all,
  //     permissionsMap,
  //     ["settings"],
  //     SETTINGS_SUBMODULE_ALIASES
  //   );
  //   const pkg = all.find((i) => i.key === "package");
  //   if (!pkg) return filtered;
  //   if (filtered.some((i) => i.key === "package")) return filtered;
  //   const labIdx = filtered.findIndex((i) => i.key === "lab-tests");
  //   const insertAt = labIdx >= 0 ? labIdx + 1 : filtered.length;
  //   return [...filtered.slice(0, insertAt), pkg, ...filtered.slice(insertAt)];
  // }, [permissionsMap]);

  const settingsItems = useMemo(() => {
    const all = getAllSettingsItems();

    const filtered = filterBySubModuleAccess(
      all,
      permissionsMap,
      ["settings"],
      SETTINGS_SUBMODULE_ALIASES
    );

    const offerMaster = all.find((i) => i.key === "offer-master");
    let result = filtered;
    if (offerMaster && !filtered.some((i) => i.key === "offer-master")) {
      const pkgIdx = filtered.findIndex((i) => i.key === "package");
      const insertAt = pkgIdx >= 0 ? pkgIdx + 1 : filtered.length;
      result = [...filtered.slice(0, insertAt), offerMaster, ...filtered.slice(insertAt)];
    }

    return result;
  }, [permissionsMap]);
  const rolesPermissionItems = filterBySubModuleAccess(
    getRolesPermissionItems(),
    permissionsMap,
    ["roles-permissions", "roles-and-permissions", "roles-permission"],
    ROLES_SUBMODULE_ALIASES
  );
  const patientItems = useMemo(() => {
    const all = getPatientItems();
    return filterBySubModuleAccess(
      all,
      permissionsMap,
      ["patient", "patients", "registration-list"],
      PATIENT_SUBMODULE_ALIASES
    );
  }, [permissionsMap]);
  const doctorItemsFiltered = filterBySubModuleAccess(
    getAllDoctorItems(),
    permissionsMap,
    ["doctor", "doctors"],
    DOCTOR_SUBMODULE_ALIASES
  );
  const doctorItems =
    doctorItemsFiltered.length > 0 ? doctorItemsFiltered : getAllDoctorItems();
  const nurseItemsFiltered = filterBySubModuleAccess(
    getAllNurseItems(),
    permissionsMap,
    ["nurse"],
    NURSE_SUBMODULE_ALIASES
  );
  const nurseItems =
    nurseItemsFiltered.length > 0 ? nurseItemsFiltered : getAllNurseItems();
  const preBookingItems = useMemo(() => getPreBookingItems(), []);
  const leadRequestItems = useMemo(() => getLeadRequestItems(), []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside all dropdown containers (trigger + portaled panel)
      let isInsideAnyDropdown = false;
      dropdownRefs.current.forEach((ref) => {
        if (ref && ref.contains(target)) {
          isInsideAnyDropdown = true;
        }
      });
      if (dropdownPortalRef.current?.contains(target)) {
        isInsideAnyDropdown = true;
      }

      if (!isInsideAnyDropdown) {
        setExpandedKeys(new Set());
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDropdownKey = expandedKeys.size === 1 ? Array.from(expandedKeys)[0] : null;

  const updateDropdownPlacement = useCallback(() => {
    if (!openDropdownKey) {
      setDropdownFixedPlacement(null);
      return;
    }
    const el = dropdownRefs.current.get(openDropdownKey);
    if (!el) {
      setDropdownFixedPlacement(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setDropdownFixedPlacement({ top: rect.bottom + 12, left: rect.left });
  }, [openDropdownKey]);

  useEffect(() => {
    if (!openDropdownKey) return;
    const rafId = window.requestAnimationFrame(() => {
      updateDropdownPlacement();
    });
    const onScrollOrResize = () => updateDropdownPlacement();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onScrollOrResize);
    vv?.addEventListener("scroll", onScrollOrResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      vv?.removeEventListener("resize", onScrollOrResize);
      vv?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [openDropdownKey, updateDropdownPlacement]);

  const toggleDropdown = (key: string) => {
    setExpandedKeys((prev) => {
      // If clicking the same dropdown that's already open, close it
      if (prev.has(key)) {
        return new Set();
      }
      // Otherwise, close all others and open only this one
      return new Set([key]);
    });
  };

  const getNavItemFromSidebar = (key: string): SidebarNavItem | undefined => {
    return SIDEBAR_NAVIGATION.find((item) => item.key === key);
  };

  const getIconForItem = (key: string) => {
    if (key === "voucher") {
      return VoucherNavIcon;
    }
    if (key === "roles-permission") {
      function RolesPermissionIcon({
        className,
        active,
      }: {
        className?: string;
        active?: boolean;
      }) {
        return <RolesPermissionNavIcon className={className} active={active} />;
      }
      return RolesPermissionIcon;
    }

    const src = NAV_ICON_SRC[key];

    if (src) {
      function ItemImageIcon({ className }: { className?: string }) {
        return (
          <Image
            src={src}
            alt={`${key} icon`}
            width={20}
            height={20}
            className={classNames("h-5 w-5 shrink-0", className)}
          />
        );
      }
      return ItemImageIcon;
    }

    // Fallback to sidebar icon definition (used for items without dedicated SVG)
    const sidebarItem = getNavItemFromSidebar(key);
    return sidebarItem?.icon;
  };

  const hasNoPermissions = isAuthenticated && Object.keys(permissionsMap).length === 0;

  // Build navigation items array
  // - clinic/hospital    → only Registration as direct link
  // - all other users    → keep full menu, Registration is direct link
  const TOP_NAV_ITEMS = hasNoPermissions
    ? []
    : shouldShowRegistration
      ? [{ key: "registration", label: "Registration", href: getRegistrationHref() }]
      : [
        ...BASE_TOP_NAV_ITEMS.slice(0, 2), // Dashboard + Voucher (direct links like Dashboard)
        { key: "registration", label: "Registration", href: getRegistrationHref() },
        ...BASE_TOP_NAV_ITEMS.slice(2), // Patient, Settings, Reports, …
      ].filter((item) => {
        const aliases = TOP_NAV_PERMISSION_ALIASES[item.key];
        if (!aliases || aliases.length === 0) return true;
        return hasAccessByAliases(permissionsMap, aliases);
      });

  return (
    <nav className={classNames(
      "main-nav w-full bg-white/25 transition-all duration-300",
      isOpen ? "nav-open" : "nav-close"
    )}>
      <div className="px-5">
        <ScrollableContainer
          maxHeight="74px"
          className="h-[74px] overflow-x-auto overflow-y-hidden"
        >
          <div className="flex items-center gap-2 h-[74px] w-max min-w-full flex-nowrap">

            {TOP_NAV_ITEMS.map((item) => {
              const Icon = getIconForItem(item.key);
              const sidebarItem = getNavItemFromSidebar(item.key);
              // Check if item is active: use sidebar logic or check against registration/settings/hospital-infrastructure routes
              let isActive = false;
              if (item.key === "settings" && pathname) {
                // Check if pathname matches any settings route (all settings pages)
                isActive = pathname?.startsWith("/settings");
              } else if (item.key === "patient" && pathname) {
                // OPD lives under registration list; IPD/DayCare under /patient/* — keep Patient highlighted for all
                isActive =
                  pathname === "/registration/registrationList" ||
                  pathname?.startsWith("/registration/registrationList/") ||
                  pathname === "/patient" ||
                  pathname?.startsWith("/patient/");
              } else if (item.key === "registration" && pathname) {
                // Registration is active on /registration and /registration/* except registrationList (that belongs to Patient)
                isActive =
                  pathname === "/registration" ||
                  (pathname?.startsWith("/registration/") && !pathname?.startsWith("/registration/registrationList"));
              } else if (item.key === "registration-list" && pathname) {
                // Check if pathname matches registration list route or any of its sub-routes
                // This includes: /registration/registrationList, /registration/registrationList/[patientId]/view, 
                // /registration/registrationList/[patientId]/edit, /registration/registrationList/vitals-medical/[patientId]
                isActive = pathname === "/registration/registrationList" || pathname?.startsWith("/registration/registrationList/");
              } else if (item.key === "hospital-infrastructure" && pathname) {
                // Check if pathname matches any hospital-infrastructure route (not /infrastructure - that has its own nav item)
                isActive = pathname === "/hospital-infrastructure" || pathname?.startsWith("/hospital-infrastructure/");
              } else if (item.key === "infrastructure-view" && pathname) {
                isActive = pathname === "/infrastructure";
              } else if (item.key === "pre-booking" && pathname) {
                isActive = pathname === "/pre-booking" || pathname?.startsWith("/pre-booking/");
              } else if (item.key === "token" && pathname) {
                isActive = pathname === "/token" || pathname?.startsWith("/token/");
              } else if (item.key === "discharge-pending" && pathname) {
                isActive = pathname === "/discharge-pending" || pathname?.startsWith("/discharge-pending/");
              } else if (item.key === "lead-request" && pathname) {
                isActive = pathname === "/lead-request" || pathname?.startsWith("/lead-request/");
              } else if (item.key === "roles-permission" && pathname) {
                isActive =
                  pathname === "/roles&permission" ||
                  pathname?.startsWith("/roles&permission/");
              } else if (item.key === "reports" && pathname) {
                isActive = pathname === "/reports" || pathname?.startsWith("/reports/");
              } else if (item.key === "voucher" && pathname) {
                isActive = pathname === "/voucher" || pathname?.startsWith("/voucher/");
              } else if (item.key === "doctors" && pathname) {
                isActive = pathname === "/doctor" || pathname?.startsWith("/doctor/");
              } else if (item.key === "nurse" && pathname) {
                isActive = pathname === "/nurse" || pathname?.startsWith("/nurse/");
              } else if (sidebarItem && pathname) {
                isActive = shouldItemBeActive(pathname, sidebarItem);
              }
              const isExpanded = expandedKeys.has(item.key);
              // Check if item has dropdown: either has sidebar children OR is settings/registration/hospital-infrastructure with dropdown items
              // Registration should NOT have dropdown for clinic/hospital users - it's a direct link
              const hasDropdown =
                item.hasDropdown &&
                (sidebarItem?.children ||
                  (item.key === "settings" && settingsItems.length > 0) ||
                  (item.key === "patient" && patientItems.length > 0) ||
                  (item.key === "doctors" && doctorItems.length > 0) ||
                  (item.key === "pre-booking" && preBookingItems.length > 0) ||
                  (item.key === "lead-request" && leadRequestItems.length > 0) ||
                  item.key === "hospital-infrastructure" ||
                  (item.key === "roles-permission" && rolesPermissionItems.length > 0));

              // For registration, if it should be shown, it's always active (green) and has no dropdown
              const isRegistrationActive = item.key === "registration" && shouldShowRegistration;

              const pillActive =
                isActive || isRegistrationActive;
              const isVoucherItem = item.key === "voucher";
              const isRolesPermissionItem = item.key === "roles-permission";

              return (
                <div
                  key={item.key}
                  className="relative flex items-center cstm-width shrink-0 flex-nowrap"
                  ref={(el) => {
                    if (hasDropdown && el) {
                      dropdownRefs.current.set(item.key, el);
                    } else {
                      dropdownRefs.current.delete(item.key);
                    }
                  }}
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={classNames(
                        "flex items-center justify-between gap-2 h-[44px] px-6 py-3 rounded-[20px] text-[13px] lg:text-sm font-medium transition-all",
                        pillActive
                          ? "bg-[#0B8C00] text-white border border-[#0B8C00]"
                          : "bg-white text-[#434956]  hover:bg-[#F2F8F2]"
                      )}
                      onClick={onNavigate}
                    >
                      <div className="flex gap-2 items-center">
                        {Icon && (
                          <Icon
                            className={classNames(
                              isVoucherItem ? "h-8 w-8 shrink-0" : "h-5 w-5 shrink-0",
                              !isVoucherItem &&
                                !isRolesPermissionItem &&
                                pillActive
                                ? "brightness-0 invert"
                                : ""
                            )}
                            active={
                              isVoucherItem || isRolesPermissionItem ? pillActive : undefined
                            }
                          />
                        )}
                        <span className="whitespace-nowrap">{item.label}</span>
                      </div>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleDropdown(item.key)}
                      className={classNames(
                        "flex items-center justify-between gap-2 h-[44px] px-6 py-3 rounded-[20px] text-[13px] lg:text-sm font-medium transition-all",
                        isActive
                          ? "bg-[#0B8C00] text-white"
                          : "bg-white text-[#434956]  hover:bg-[#F2F8F2]"
                      )}
                    >
                      <div className="flex gap-2 items-center">
                        {Icon && (
                          <Icon
                            className={classNames(
                              isVoucherItem ? "h-8 w-8 shrink-0" : "h-5 w-5 shrink-0",
                              !isVoucherItem &&
                                !isRolesPermissionItem &&
                                isActive
                                ? "brightness-0 invert"
                                : ""
                            )}
                            active={
                              isVoucherItem || isRolesPermissionItem ? isActive : undefined
                            }
                          />
                        )}
                        <span className="whitespace-nowrap">{item.label}</span>
                      </div>
                      {hasDropdown && (
                        <Image
                          src="/icons/ArrowDown.svg"
                          alt="Expand"
                          width={16}
                          height={16}
                          className={classNames(
                            "transition-transform ml-1",
                            isExpanded ? "rotate-180" : "",
                            isActive ? "brightness-0 invert" : ""
                          )}
                        />
                      )}

                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollableContainer>
      </div>

      {typeof document !== "undefined" &&
        openDropdownKey &&
        dropdownFixedPlacement &&
        createPortal(
          <div ref={dropdownPortalRef} className="pointer-events-none">
            <div className="pointer-events-auto">
              <div
                className="fixed z-[199] pointer-events-none"
                style={{
                  top: dropdownFixedPlacement.top - 10,
                  left: dropdownFixedPlacement.left + 20,
                }}
              >
                <div className="h-0 w-0 border-l-[18px] border-r-[18px] border-b-[18px] border-l-transparent border-r-transparent border-b-white drop-shadow-sm" />
              </div>
              {openDropdownKey === "settings" && (
                <DropdownGrid
                  fixedPlacement={dropdownFixedPlacement}
                  items={settingsItems}
                  pathname={pathname}
                  onNavigate={() => {
                    setExpandedKeys(new Set());
                    onNavigate?.();
                  }}
                  title="Settings"
                />
              )}
              {openDropdownKey === "patient" && (
                <DropdownGrid
                  fixedPlacement={dropdownFixedPlacement}
                  items={patientItems}
                  pathname={pathname}
                  onNavigate={() => {
                    setExpandedKeys(new Set());
                    onNavigate?.();
                  }}
                  title="Patient"
                />
              )}
              {openDropdownKey === "hospital-infrastructure" && (
                <DropdownGrid
                  fixedPlacement={dropdownFixedPlacement}
                  items={getAllHospitalInfrastructureItems()}
                  pathname={pathname}
                  onNavigate={() => {
                    setExpandedKeys(new Set());
                    onNavigate?.();
                  }}
                  title="Infrastructure"
                />
              )}
              {openDropdownKey === "roles-permission" && (
                <DropdownGrid
                  fixedPlacement={dropdownFixedPlacement}
                  items={rolesPermissionItems}
                  pathname={pathname}
                  onNavigate={() => {
                    setExpandedKeys(new Set());
                    onNavigate?.();
                  }}
                  title="Roles & Permissions"
                />
              )}
              {openDropdownKey === "pre-booking" && (
                <DropdownGrid
                  fixedPlacement={dropdownFixedPlacement}
                  items={preBookingItems}
                  pathname={pathname}
                  onNavigate={() => {
                    setExpandedKeys(new Set());
                    onNavigate?.();
                  }}
                  title="Pre Booking"
                />
              )}
              {openDropdownKey === "lead-request" && (
                <DropdownGrid
                  fixedPlacement={dropdownFixedPlacement}
                  items={leadRequestItems}
                  pathname={pathname}
                  onNavigate={() => {
                    setExpandedKeys(new Set());
                    onNavigate?.();
                  }}
                  title="Lead Request"
                />
              )}
              {openDropdownKey === "doctors" && (
                <DropdownGrid
                  fixedPlacement={dropdownFixedPlacement}
                  items={doctorItems}
                  pathname={pathname}
                  onNavigate={() => {
                    setExpandedKeys(new Set());
                    onNavigate?.();
                  }}
                  title="Doctor"
                />
              )}

            </div>
          </div>,
          document.body
        )}
    </nav>
  );
}

