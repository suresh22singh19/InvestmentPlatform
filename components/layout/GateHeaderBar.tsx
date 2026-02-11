"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";

type GateHeaderBarProps = {
  userName?: string | null;
  userRole?: string;
  onLogout?: () => void;
};

export function GateHeaderBar({
  userName,
  userRole = "Admin",
  onLogout,
}: GateHeaderBarProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = useMemo(() => {
    if (userName) return userName;
    return "User";
  }, [userName]);

  return (
    <header className="flex w-full items-center justify-between gap-4 px-5 py-3">
      {/* Logo on left */}
      <div className="flex items-center">
        <Logo width={140} height={53} />
      </div>

      {/* User on right */}
      <div className="flex items-center gap-3">
        <div
          ref={accountMenuRef}
          className="relative flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B8C00] text-base font-semibold text-white">
            {userName?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="text-left text-sm">
            <p className="font-semibold text-[#262D3B]">{`Welcome ${displayName}`}</p>
            <p className="text-xs text-[#8A8F9B]">{userRole}</p>
          </div>
          <button
            type="button"
            className="flex items-center justify-center rounded-full  text-white transition hover:bg-[#0a7a00]"
            aria-label="Logout"
            onClick={onLogout}
          >
            <Image src="/icons/GateLogOutIcon.svg" alt="Logout" width={42} height={42} />
          </button>
        </div>
      </div>
    </header>
  );
}

