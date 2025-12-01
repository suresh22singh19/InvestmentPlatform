"use client";

import Image from "next/image";

type RefreshButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export const RefreshButton = ({ onClick, disabled = false, className = "" }: RefreshButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Image src="/icons/RefreshIcon.svg" alt="Refresh" width={20} height={20} className="shrink-0" />
      Refresh
    </button>
  );
};

