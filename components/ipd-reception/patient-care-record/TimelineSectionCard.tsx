"use client";

import type { ReactNode } from "react";

type TimelineSectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function TimelineSectionCard({
  title,
  subtitle,
  children,
  className = "",
}: TimelineSectionCardProps) {
  return (
    <div
      className={`rounded-[16px] border border-[#E3EEE1] bg-white p-4 shadow-sm ${className}`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#262D3B]">{title}</h3>
        {subtitle ? <span className="text-xs text-[#9FA2AB]">{subtitle}</span> : null}
      </div>
      {children}
    </div>
  );
}
