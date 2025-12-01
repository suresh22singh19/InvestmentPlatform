"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { SIDEBAR_NAVIGATION, type SidebarNavItem } from "@/lib/constants/navigation";

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
  icon: React.ReactNode;
};

const getAllSettingsItems = (): SettingsItem[] => [
  {
    key: "configuration",
    label: "Configuration",
    href: "/settings/configuration",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    key: "branch-ip",
    label: "Branch IP Network",
    href: "/settings/branch-ip-network",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    key: "discount",
    label: "Discount Approval",
    href: "/settings/discount-approval",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "refund",
    label: "Refund Approval",
    href: "/settings/refund-approval",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "users",
    label: "Users",
    href: "/settings/users",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "panel",
    label: "Panel",
    href: "/settings/panel",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    key: "stock",
    label: "Stock/Product",
    href: "/settings/stock-product",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l4 6-10 12L2 9z" />
        <path d="M6 3l-4 6" />
        <path d="M18 3l4 6" />
        <path d="M12 21l-2-3" />
        <path d="M12 21l2-3" />
      </svg>
    ),
  },
  {
    key: "therapy",
    label: "Panel Therapy",
    href: "/settings/therapy",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
        <path d="M9 9l6 6" />
        <path d="M15 9l-6 6" />
      </svg>
    ),
  },
  {
    key: "tpa",
    label: "TPA Therapy",
    href: "/settings/tpa-therapy",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <circle cx="18" cy="12" r="3" />
      </svg>
    ),
  },
  {
    key: "lab-tests",
    label: "Lab Tests",
    href: "/settings/lab-tests",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    key: "package",
    label: "Package",
    href: "/settings/package",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </svg>
    ),
  },
  {
    key: "field-users",
    label: "Field Users",
    href: "/settings/field-users",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M20 8v13" />
        <path d="M12 8v13" />
      </svg>
    ),
  },
  {
    key: "sms",
    label: "SMS",
    href: "/settings/sms",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M13 8H3" />
        <path d="M17 12H3" />
      </svg>
    ),
  },
  {
    key: "medical-report",
    label: "Medical Report Category",
    href: "/settings/medical-report-category",
    icon: (
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
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    key: "diet-category",
    label: "Diet Category",
    href: "/settings/diet-category",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="12" r="3" />
        <circle cx="15" cy="12" r="3" />
        <circle cx="9" cy="12" r="1.5" fill="currentColor" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "diet",
    label: "Diagnosis Diet",
    href: "/settings/diet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "diagnosis",
    label: "Diagnosis",
    href: "/settings/diagnosis",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    key: "sub-diagnosis",
    label: "Sub Diagnosis",
    href: "/settings/sub-diagnosis",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    key: "razarpay-pos-machine",
    label: "Razarpay Pos Machine",
    href: "/settings/razarpay-pos-machine",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h12" />
        <path d="M6 12h8" />
        <path d="M6 16h4" />
        <path d="M18 16h2" />
        <circle cx="16" cy="14" r="1.5" />
      </svg>
    ),
  },
  {
    key: "module-settings",
    label: "Module Settings",
    href: "/settings/module-settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    key: "add-member",
    label: "Add Member Registration",
    href: "/settings/add-member",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    ),
  },
  {
    key: "groups",
    label: "Groups",
    href: "/settings/groups",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

type SettingsDropdownGridProps = {
  items: SettingsItem[];
  pathname: string | null;
  onNavigate: () => void;
};

const SettingsDropdownGrid = ({ items, pathname, onNavigate }: SettingsDropdownGridProps) => {
  return (
    <div className="absolute top-full left-0 mt-5 w-[1300px] bg-white border border-[#ffffff] rounded-[16px] shadow-lg z-50">
      {/* Opened Heading Section */}
      <div className="px-6">
      <div className="w-full py-5 border-b border-[#E9F3E6]">
        <h1 className="text-[32px] font-semibold leading-tight text-[#262D3B]">Settings</h1>
      </div>
      </div>
      
      {/* Settings Grid */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => {
            const isActive = pathname ? pathname === item.href || pathname.startsWith(item.href + "/") : false;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={classNames(
                  "flex items-center gap-[15px] w-[300px] h-[60px] px-5 py-3 rounded-[12px] border border-transparent",
                  isActive
                    ? "shadow-[0_6px_24px_0_rgba(0,0,0,0.15)]"
                    : "hover:bg-[#F2F8F2]"
                )}
                onClick={onNavigate}
              >
                <div className={classNames("w-6 h-6 shrink-0", "text-[#0B8C00]")}>
                  {item.icon}
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
      </div>
    </div>
  );
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
const TOP_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "settings", label: "Settings", hasDropdown: true },
  { key: "registration", label: "Registration", href: "/registration" },
  { key: "pre-booking", label: "Pre Booking", href: "/pre-booking" },
  { key: "doctors", label: "Doctor", href: "/dashboard/doctors" },
  { key: "roles-master", label: "Roles Master", href: "/roles-master" },
  { key: "branch-role-master", label: "Branch Role Master", href: "/branch-role-master" },
  { key: "roles-permissions", label: "Roles & Permissions", href: "/roles-permissions" },
];

export function TopNavigationBar({ onNavigate }: TopNavigationBarProps) {
  const pathname = usePathname();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExpandedKeys(new Set());
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getNavItemFromSidebar = (key: string): SidebarNavItem | undefined => {
    return SIDEBAR_NAVIGATION.find((item) => item.key === key);
  };

  const getIconForItem = (key: string) => {
    // First try to get from sidebar navigation
    const sidebarItem = getNavItemFromSidebar(key);
    if (sidebarItem?.icon) {
      return sidebarItem.icon;
    }

    // Create inline icons for items not in sidebar navigation
    const iconPaths: Record<string, React.ReactNode> = {
      "registration": (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </>
      ),
      "pre-booking": (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
        </>
      ),
      "roles-master": (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
      "branch-role-master": (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2v20" />
          <path d="M2 12h20" />
          <path d="M6 6l12 12" />
          <path d="M6 18l12-12" />
        </>
      ),
      "roles-permissions": (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <path d="M20 8v6" />
          <path d="M23 11h-6" />
        </>
      ),
    };

    if (iconPaths[key]) {
      return ({ className }: { className?: string }) => (
        <svg
          className={classNames("h-5 w-5 shrink-0", className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {iconPaths[key]}
        </svg>
      );
    }

    return undefined;
  };

  return (
    <nav className="w-full bg-white/25">
      <div className="flex items-center gap-2 h-[74px] px-5">
        {TOP_NAV_ITEMS.map((item) => {
          const Icon = getIconForItem(item.key);
          const sidebarItem = getNavItemFromSidebar(item.key);
          const isActive = sidebarItem && pathname ? shouldItemBeActive(pathname, sidebarItem) : false;
          const isExpanded = expandedKeys.has(item.key);
          const hasDropdown = item.hasDropdown && sidebarItem?.children;

          return (
            <div key={item.key} className="relative flex items-center" ref={hasDropdown ? dropdownRef : null}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={classNames(
                    "flex items-center gap-2 h-[44px] px-6 py-3 rounded-[20px] text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#0B8C00] text-white border border-[#0B8C00]"
                      : "bg-white text-[#434956]  hover:bg-[#F2F8F2]"
                  )}
                  onClick={onNavigate}
                >
                  {Icon && (
                    <Icon
                      className={classNames(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-white" : "text-[#0B8C00]"
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
                        isActive ? "text-white" : "text-[#0B8C00]"
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

              {hasDropdown && isExpanded && sidebarItem?.children && (
                <>
                  {/* Tooltip pointer */}
                  <div className="absolute top-[calc(100%+25px-18px)] left-6 z-[51]">
                    {/* White triangle pointer */}
                    <div className="absolute top-0 left-0 w-0 h-0 border-l-[18px] border-r-[18px] border-b-[18px] border-l-transparent border-r-transparent border-b-white"></div>
                  </div>
                  <SettingsDropdownGrid
                    items={getAllSettingsItems()}
                    pathname={pathname}
                    onNavigate={() => {
                      setExpandedKeys(new Set());
                      onNavigate?.();
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

