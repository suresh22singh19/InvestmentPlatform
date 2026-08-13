"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "./Tooltip";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Initial state
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center">
      {isOnline ? (
        <Tooltip content="Internet Connection Available" position="top">
          <div className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EAF7E8] text-[#0B8C00] border border-[#CDE8CA] shadow-sm select-none transition-all duration-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0B8C00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0B8C00]"></span>
            </span>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856a9 9 0 0113.788 0M1.924 8.674a12.75 12.75 0 0120.152 0M12.53 18v.008H12v-.008h.53z" />
            </svg>
            {/* <span className="font-medium hidden sm:inline">Online</span> */}
          </div>
        </Tooltip>
      ) : (
        <Tooltip content="Internet Connection Lost" position="top">
          <div className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FDE8E8] text-[#E02424] border border-[#F8B4B4] shadow-sm select-none animate-pulse transition-all duration-300">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E02424]"></span>
            </span>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0012 10a10.94 10.94 0 00-4.72 1.06M20.66 7.12a14.94 14.94 0 00-17.32 0M12 20h.01" />
            </svg>
            <span className="font-medium">Offline</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
}
