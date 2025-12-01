"use client";

import Image from "next/image";

type ExportButtonProps = {
  onClick?: () => void;
  className?: string;
};

export const ExportButton = ({ onClick, className = "" }: ExportButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FEF9E7] ${className}`}
    >
      <Image src="/icons/DownloadExport.svg" alt="Export" width={20} height={20} className="shrink-0" />
      Export
    </button>
  );
};

