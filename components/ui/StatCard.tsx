"use client";

import Image from "next/image";

export type StatCardSubtextIcon = "trend" | "clock" | "info";
export type StatCardSubtextTone = "green" | "muted";

type StatCardProps = {
  title: string;
  value: string | number;
  className?: string;
  iconSrc?: string;
  subtext?: string;
  subtextTone?: StatCardSubtextTone;
  subtextIcon?: StatCardSubtextIcon;
  isLoading?: boolean;
};

function SubtextInlineIcon({
  type,
  tone,
}: {
  type: StatCardSubtextIcon;
  tone: StatCardSubtextTone;
}) {
  const stroke = tone === "green" ? "#0B8C00" : "#9FA2AB";

  if (type === "trend") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0">
        <path
          d="M1 10L5 6L8 9L13 3"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 3H13V7"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "clock") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0">
        <circle cx="7" cy="7" r="5.25" stroke={stroke} strokeWidth="1.25" />
        <path
          d="M7 4V7L9 8.5"
          stroke={stroke}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0">
      <circle cx="7" cy="7" r="5.25" stroke={stroke} strokeWidth="1.25" />
      <path
        d="M7 6.25V7.75"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="7" cy="4.75" r="0.75" fill={stroke} />
    </svg>
  );
}

export const StatCard = ({
  title,
  value,
  className = "",
  iconSrc,
  subtext,
  subtextTone = "muted",
  subtextIcon = "info",
  isLoading = false,
}: StatCardProps) => {
  const displayValue = isLoading ? "..." : value;

  if (iconSrc) {
    return (
      <div
        className={`flex items-center justify-between rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm ${className}`}
      >
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-sm font-medium text-[#434956]">{title}</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
            <h4 className="text-[32px] font-bold leading-none text-[#262D3B]">{displayValue}</h4>
            {subtext ? (
              <span
                className={`mb-1 inline-flex max-w-full items-center gap-1 text-xs leading-[140%] ${
                  subtextTone === "green" ? "font-medium text-[#0B8C00]" : "text-[#9FA2AB]"
                }`}
              >
                <SubtextInlineIcon type={subtextIcon} tone={subtextTone} />
                <span className="whitespace-normal">{subtext}</span>
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
          <Image src={iconSrc} alt="" width={28} height={28} />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[12px] border border-gray-200 bg-white p-4 ${className}`}>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-black">{displayValue}</p>
    </div>
  );
};
