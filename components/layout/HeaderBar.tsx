"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";
import { SearchBar } from "@/components/ui/SearchBar";
import { NotificationDropdown } from "./Notification";

type HeaderAction = {
  key: string;
  iconSrc: string;
  alt: string;
  badge?: number;
  onClick?: () => void;
};

type HeaderBarProps = {
  userEmail?: string | null;
  userRole?: string;
  onLogout?: () => void;
  actions?: HeaderAction[];
};

export function HeaderBar({
  userEmail,
  userRole = "",
  onLogout,
  actions,
}: HeaderBarProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
      
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = useMemo(() => {
    if (!userEmail) return "User";
    const namePart = userEmail.split("@")[0];
    return namePart
      .split(/[._-]/)
      .filter(Boolean)
      .map((chunk: string) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  }, [userEmail]);

  const headerActions = actions?.length
    ? actions.map((action) => {
        // Override badge for bell icon with dynamic count
        if (action.key === "bell") {
          return { ...action, badge: notificationCount > 0 ? notificationCount : undefined };
        }
        return action;
      })
    : [
        {
          key: "chat",
          iconSrc: "/icons/Message.svg",
          alt: "Messages",
        },
        // {
        //   key: "night",
        //   iconSrc: "/icons/NightIcon.svg",
        //   alt: "Night mode",
        // },
        {
          key: "bell",
          iconSrc: "/icons/Bell.svg",
          alt: "Notifications",
          badge: notificationCount > 0 ? notificationCount : undefined,
        },
        // {
        //   key: "settings",
        //   iconSrc: "/icons/Settings.svg",
        //   alt: "Settings",
        // },
      ];

  return (
    <header className="flex w-full items-center justify-between gap-4 px-5 py-3 border-b border-[#E6E6E6]">
      {/* Logo on left */}
      <div className="flex items-center">
        <Logo width={140} height={53} />
      </div>

      {/* Search in center */}
      <div className="flex-1 justify-center md:hidden lg:flex">
        <SearchBar className="w-full max-w-[347px]" />
      </div>

      {/* Icons and User on right */}
      <div className="flex items-center gap-3">
        {headerActions.map((action) => {
          // Special handling for notification bell icon
          if (action.key === "bell") {
            return (
              <div
                key={action.key}
                ref={notificationRef}
                className="relative"
              >
                <button
                  type="button"
                  className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#262D3B] shadow-[0px_15px_30px_rgba(34,56,43,0.08)] transition hover:bg-[#E8F0EA]"
                  aria-label={action.alt}
                  onClick={() => {
                    setIsNotificationOpen((prev) => !prev);
                    action.onClick?.();
                  }}
                >
                  <Image src={action.iconSrc} alt={action.alt} width={20} height={20} />
                  {action.badge ? (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F3696F] px-1 text-xs font-semibold text-white">
                      {action.badge}
                    </span>
                  ) : null}
                </button>
                <NotificationDropdown
                  isOpen={isNotificationOpen}
                  onClose={() => setIsNotificationOpen(false)}
                  notificationCount={notificationCount}
                  onNotificationCountChange={setNotificationCount}
                  onMarkAllAsRead={() => {
                    // Handle mark all as read
                    console.log("Mark all as read");
                  }}
                />
              </div>
            );
          }
          
          return (
            <button
              key={action.key}
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#262D3B] shadow-[0px_15px_30px_rgba(34,56,43,0.08)] transition hover:bg-[#E8F0EA]"
              aria-label={action.alt}
              onClick={action.onClick}
            >
              <Image src={action.iconSrc} alt={action.alt} width={20} height={20} />
              {action.badge ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F3696F] px-1 text-xs font-semibold text-white">
                  {action.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        <div
          ref={accountMenuRef}
          className="relative flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B8C00] text-base font-semibold text-white">
            {userEmail?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="text-left text-sm" aria-expanded={isAccountMenuOpen}
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}>
            <p className="font-semibold text-[#262D3B]">{displayName}</p>
            {userRole && <p className="text-xs text-[#8A8F9B]">{userRole}</p>}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center text-[#262D3B] transition "
            aria-label="Account menu"
            aria-expanded={isAccountMenuOpen}
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
          >
            <Image
              src="/icons/ArrowDown.svg"
              alt="Expand menu"
              width={16}
              height={16}
              className={`transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isAccountMenuOpen ? (
            <div className="absolute right-0 top-full mt-3 w-[200px] overflow-hidden rounded-2xl border border-[#ECF0ED] bg-white shadow-[0px_24px_48px_rgba(34,56,43,0.12)] z-50">
              {/* <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#262D3B] transition hover:bg-[#F2F8F2] cursor-pointer"
                onClick={() => setIsAccountMenuOpen(false)}
              >
                <Image src="/icons/ProfileIcon.svg" alt="My profile" width={20} height={20} />
                My Profile
              </button> */}
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#D14D4F] transition hover:bg-[#FFF2F2] cursor-pointer"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onLogout?.();
                }}
              >
                <Image src="/icons/LogOutIcon.svg" alt="Logout" width={20} height={20} />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

