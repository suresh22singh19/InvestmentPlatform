"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { SIDEBAR_NAVIGATION, type SidebarNavItem } from "@/lib/constants/navigation";
import ScrollableContainer from "@/components/ui/ScrollableContainer";
import { useAppSelector } from "@/store/hooks";
import { selectLoginType } from "@/store/slices/authSlice";

// Central icon mapping for top navbar items (using SVGs from /public/icons)
const NAV_ICON_SRC: Record<string, string> = {
  dashboard: "/icons/DashboardDarkIcon.svg",
  settings: "/icons/SettingsDarkIcon.svg",
  registration: "/icons/RegistrationDarkIcon.svg",
  "hospital-infrastructure": "/icons/SettingsDarkIcon.svg", // Using Settings icon as fallback, can be replaced with specific icon later
  "infrastructure-view": "/icons/BranchRoleMasterIcon.svg", // View option for infrastructure page
  // Use same icon as Registration for Pre Booking
  "pre-booking": "/icons/RegistrationDarkIcon.svg",
  doctors: "/icons/DoctorDarkIcon.svg",
  "roles-master": "/icons/RoleMasterDarkIcon.svg",
  "branch-role-master": "/icons/BranchRoleMasterIcon.svg",
  "roles-permissions": "/icons/Roles&PermissionDarkIcon.svg",
};

type TopNavigationBarProps = {
  onNavigate?: () => void;
};

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

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
    key: "stock",
    label: "Stock/Product",
    href: "/settings/stock-product",
    iconSrc: "/icons/Stock&ProductDarkIcon.svg",
  },
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
    label: "Package",
    href: "/settings/package",
    iconSrc: "/icons/PackageDarkIcon.svg",
  },
  {
    key: "field-users",
    label: "Field Users",
    href: "/settings/field-users",
    iconSrc: "/icons/UsersDarkIcon.svg",
  },
  {
    key: "sms",
    label: "SMS",
    href: "/settings/sms",
    iconSrc: "/icons/SmsDarkIcon.svg",
  },
  {
    key: "medical-report",
    label: "Medical Report Category",
    href: "/settings/medical-report-category",
    iconSrc: "/icons/DoctorDarkIcon.svg",
    fallbackIcon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.19 4.19C2.8 5.58 2 7.55 2 9.77c0 4.71 3.81 8.46 8.56 8.23a9.1 9.1 0 0 0 2.54-.42" />
        <path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M21.42 15.61A9.98 9.98 0 0 0 12 2c-1.3 0-2.52.29-3.62.81" />
        <path d="M22 2 16 8" />
        <path d="M18 2v6h6" />
      </svg>
    ),
  },
  {
    key: "notifications",
    label: "Notifications",
    href: "/settings/notifications",
    iconSrc: "/icons/NotificationDarkIcon.svg",
  },
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
    key: "razarpay-pos-machine",
    label: "Razarpay Pos Machine",
    href: "/settings/razarpay-pos-machine",
    iconSrc: "/icons/RazarpayPosMachineDarkIcon.svg",
  },
  {
    key: "module-settings",
    label: "Module Settings",
    href: "/settings/module-settings",
    iconSrc: "/icons/ModuleSettingsDarkIcon.svg",
  },

  
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

// Registration items with icons matching the Registration icon
type RegistrationItem = {
  key: string;
  label: string;
  href: string;
  iconSrc?: string; // preferred: SVG from /public/icons
  fallbackIcon?: React.ReactNode; // used when we don't yet have an SVG
};

const getAllRegistrationItems = (): RegistrationItem[] => [
  // Temporarily hide registration clinics item 
  {
  key: "registration-clinics",
  label: "Registration Clinics",
  href: "/registration",
  iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
  {
    key: "registration-hospital",
    label: "Registration Hospital",
    href: "/registration/hospital",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
  {
    key: "ipd-registration-hos",
    label: "IPD Registration Hospital",
    href: "/registration/ipd-registration-hos",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
  {
    key: "ipd-registration-cli",
    label: "IPD Registration Clinic",
    href: "/registration/ipd-registration-cli",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
  {
    key: "daycare-registration-cli",
    label: "Daycare Registration Clinic",
    href: "/registration/daycare-registration-cli",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
  {
    key: "daycare-registration-hos",
    label: "Daycare Registration Hospital",
    href: "/registration/daycare-registration-hos",
    iconSrc: "/icons/RegistrationDarkIcon.svg",
  },
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

type SettingsDropdownGridProps = {
  items: SettingsItem[];
  pathname: string | null;
  onNavigate: () => void;
};

type DropdownGridProps = {
  items: (SettingsItem | RegistrationItem | HospitalInfrastructureItem)[];
  pathname: string | null;
  onNavigate: () => void;
  title: string;
};

const DropdownGrid = ({ items, pathname, onNavigate, title }: DropdownGridProps) => {
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
  const columns: (SettingsItem | RegistrationItem | HospitalInfrastructureItem)[][] = [];
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
    viewportWidth <= 1100 ? "1050px" : viewportWidth <= 1300 ? "fit-content" : `${finalWidth}px`;

  return (
    <div
      className="absolute top-full left-0 mt-5 bg-white border border-[#ffffff] rounded-[16px] shadow-lg z-50 pointer-events-auto"
      style={{
        width: dropdownWidth,
        ...(numberOfColumns === 4 && { left: getLeftValue() }),
      }}
    >
      {/* Opened Heading Section */}
      <div className="px-6">
      <div className="w-full py-5 border-b border-[#E9F3E6]">
        <h1 className="text-[32px] font-semibold leading-tight text-[#262D3B]">{title}</h1>
      </div>
      </div>
      
      {/* Grid - Column Layout */}
      <ScrollableContainer 
        maxHeight="calc(100vh - 300px)" 
        className="px-6 py-6"
      >
        <div className="flex gap-2">
          {columns.map((columnItems, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-0 flex-1">
              {columnItems.map((item) => {
                const isRootRegistrationItem = item.href === "/registration";
                const isRootInfrastructureItem = item.href === "/hospital-infrastructure";
                
                // Determine if this item is active
                let isActive = false;
                if (pathname) {
                  if (isRootRegistrationItem) {
                    // For registration root, only match exact path
                    isActive = pathname === item.href;
                  } else if (isRootInfrastructureItem) {
                    // For infrastructure root (Builder), match exact path only (not structure-preview)
                    isActive = pathname === item.href;
                  } else {
                    // For other items (including structure-preview), match exact path or paths that start with it
                    isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  }
                }
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={classNames(
                      "flex items-center gap-[15px] w-full h-[60px] px-0 py-3 pl-4 rounded-[12px] border border-transparent cursor-pointer",
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

// Keep SettingsDropdownGrid for backward compatibility
const SettingsDropdownGrid = ({ items, pathname, onNavigate }: SettingsDropdownGridProps) => {
  return <DropdownGrid items={items} pathname={pathname} onNavigate={onNavigate} title="Settings" />;
};

const shouldItemBeActive = (pathname: string, item: SidebarNavItem): boolean => {
  if (item.href && pathname === item.href) {
    return true;
  }

  if (item.children) {
    return item.children.some((child) => !!child.href && pathname.startsWith(child.href));
  }

  return false;
};

// Define top navigation items based on Figma design
// Note: Registration will be conditionally added based on login_type
const BASE_TOP_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "settings", label: "Settings", hasDropdown: true },
  { key: "hospital-infrastructure", label: "Infrastructure 1", hasDropdown: true },
  { key: "infrastructure-view", label: "Infrastructure 2", href: "/infrastructure" },
  // { key: "registration", label: "Registration", href: "/registration/hospital" },
  // { key: "pre-booking", label: "Pre Booking", href: "/pre-booking" },
  // { key: "doctors", label: "Doctor", href: "/dashboard/doctors" },
  // { key: "roles-master", label: "Roles Master", href: "/roles-master" },
  // { key: "branch-role-master", label: "Branch Role Master", href: "/branch-role-master" },
  // { key: "roles-permissions", label: "Roles & Permissions", href: "/roles-permissions" },
];

export function TopNavigationBar({ onNavigate }: TopNavigationBarProps) {
  const pathname = usePathname();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const loginType = useAppSelector(selectLoginType);
  
  // Check if login_type is "clinic user" or "hospital user"
  const shouldShowRegistration = loginType?.toLowerCase() === "clinic user" || loginType?.toLowerCase() === "hospital user";
  
  // Check if login_type is "nurse" - show only Registration List link
  const isNurse = loginType?.toLowerCase() === "nurse";
  
  // Get the registration href based on login_type
  const getRegistrationHref = () => {
    if (loginType?.toLowerCase() === "clinic user") {
      return "/registration";
    } else if (loginType?.toLowerCase() === "hospital user") {
      return "/registration/hospital";
    }
    return "/registration";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside all dropdown containers
      let isInsideAnyDropdown = false;
      dropdownRefs.current.forEach((ref) => {
        if (ref && ref.contains(target)) {
          isInsideAnyDropdown = true;
        }
      });
      
      if (!isInsideAnyDropdown) {
        setExpandedKeys(new Set());
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const src = NAV_ICON_SRC[key];

  if (src) {
    return ({ className }: { className?: string }) => (
      <Image
        src={src}
        alt={`${key} icon`}
        width={20}
        height={20}
        className={classNames("h-5 w-5 shrink-0", className)}
      />
    );
  }

  // Fallback to sidebar icon definition (used for items without dedicated SVG)
  const sidebarItem = getNavItemFromSidebar(key);
  return sidebarItem?.icon;
};

  // Build navigation items array
  // For nurse users: only show Registration List link
  // For clinic/hospital users: only show Registration as direct link
  // For admin users: show all items including Registration with dropdown
  const TOP_NAV_ITEMS = isNurse
    ? [{ key: "registration-list", label: "Registration List", href: "/registration/registrationList" }]
    : shouldShowRegistration
    ? [{ key: "registration", label: "Registration", href: getRegistrationHref() }]
    : [
        ...BASE_TOP_NAV_ITEMS.slice(0, 1), // Dashboard
        { key: "registration", label: "Registration", hasDropdown: true }, // Registration with dropdown for admin
        ...BASE_TOP_NAV_ITEMS.slice(1), // Settings and Infrastructure
      ];

  return (
    <nav className="w-full bg-white/25">
      <div className="flex items-center gap-2 h-[74px] px-5">
        {TOP_NAV_ITEMS.map((item) => {
          const Icon = getIconForItem(item.key);
          const sidebarItem = getNavItemFromSidebar(item.key);
          // Check if item is active: use sidebar logic or check against registration/settings/hospital-infrastructure routes
          let isActive = false;
          if (item.key === "settings" && pathname) {
            // Check if pathname matches any settings route (all settings pages)
            isActive = pathname.startsWith("/settings");
          } else if (item.key === "registration" && pathname) {
            // Check if pathname matches any registration route
            isActive = pathname === "/registration" || pathname.startsWith("/registration/");
          } else if (item.key === "registration-list" && pathname) {
            // Check if pathname matches registration list route or any of its sub-routes
            // This includes: /registration/registrationList, /registration/registrationList/[patientId]/view, 
            // /registration/registrationList/[patientId]/edit, /registration/registrationList/vitals-medical/[patientId]
            isActive = pathname === "/registration/registrationList" || pathname.startsWith("/registration/registrationList/");
          } else if (item.key === "hospital-infrastructure" && pathname) {
            // Check if pathname matches any hospital-infrastructure route (not /infrastructure - that has its own nav item)
            isActive = pathname === "/hospital-infrastructure" || pathname.startsWith("/hospital-infrastructure/");
          } else if (item.key === "infrastructure-view" && pathname) {
            isActive = pathname === "/infrastructure";
          } else if (sidebarItem && pathname) {
            isActive = shouldItemBeActive(pathname, sidebarItem);
          }
          const isExpanded = expandedKeys.has(item.key);
          // Check if item has dropdown: either has sidebar children OR is settings/registration/hospital-infrastructure with dropdown items
          // Registration should NOT have dropdown for clinic/hospital users - it's a direct link
          const hasDropdown = item.hasDropdown && (sidebarItem?.children || item.key === "settings" || item.key === "registration" || item.key === "hospital-infrastructure");
          
          // For registration, if it should be shown, it's always active (green) and has no dropdown
          const isRegistrationActive = item.key === "registration" && shouldShowRegistration;
          
          // For registration-list (nurse), it's always active (green) when on that page or any sub-route
          const isRegistrationListActive = item.key === "registration-list" && isNurse && (pathname === "/registration/registrationList" || pathname?.startsWith("/registration/registrationList/"));

          return (
            <div 
              key={item.key} 
              className="relative flex items-center" 
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
                    "flex items-center gap-2 h-[44px] px-6 py-3 rounded-[20px] text-sm font-medium transition-all",
                    (isActive || isRegistrationActive || isRegistrationListActive)
                      ? "bg-[#0B8C00] text-white border border-[#0B8C00]"
                      : "bg-white text-[#434956]  hover:bg-[#F2F8F2]"
                  )}
                  onClick={onNavigate}
                >
                  {Icon && (
                    <Icon
                      className={classNames(
                        "h-5 w-5 shrink-0",
                        (isActive || isRegistrationActive || isRegistrationListActive) ? "brightness-0 invert" : ""
                      )}
                    />
                  )}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleDropdown(item.key)}
                  className={classNames(
                    "flex items-center gap-2 h-[44px] px-6 py-3 rounded-[20px] text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#0B8C00] text-white"
                      : "bg-white text-[#434956]  hover:bg-[#F2F8F2]"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={classNames(
                        "h-5 w-5 shrink-0",
                        isActive ? "brightness-0 invert" : ""
                      )}
                    />
                  )}
                  <span>{item.label}</span>
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

              {hasDropdown && isExpanded && (
                <>
                  {/* Tooltip pointer */}
                  <div className="absolute top-[calc(100%+25px-18px)] left-6 z-[51]">
                    {/* White triangle pointer */}
                    <div className="absolute top-0 left-0 w-0 h-0 border-l-[18px] border-r-[18px] border-b-[18px] border-l-transparent border-r-transparent border-b-white"></div>
                  </div>
                  {item.key === "settings" && (
                    <DropdownGrid
                      items={getAllSettingsItems()}
                      pathname={pathname}
                      onNavigate={() => {
                        setExpandedKeys(new Set());
                        onNavigate?.();
                      }}
                      title="Settings"
                    />
                  )}
                  {/* Registration dropdown - shown for admin users only */}
                  {item.key === "registration" && !shouldShowRegistration && (
                    <DropdownGrid
                      items={getAllRegistrationItems()}
                      pathname={pathname}
                      onNavigate={() => {
                        setExpandedKeys(new Set());
                        onNavigate?.();
                      }}
                      title="Registration"
                    />
                  )}
                  {item.key === "hospital-infrastructure" && (
                    <DropdownGrid
                      items={getAllHospitalInfrastructureItems()}
                      pathname={pathname}
                      onNavigate={() => {
                        setExpandedKeys(new Set());
                        onNavigate?.();
                      }}
                      title="Infrastructure"
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

