"use client";

import Image from "next/image";
import type {
  ReceptionDashboardStats,
  ReceptionStatSubtextIcon,
  ReceptionStatSubtextKey,
} from "@/lib/ipd-reception/types";
import { RECEPTION_STAT_CARDS } from "@/lib/ipd-reception/constants";

type ReceptionStatCardProps = {
  title: string;
  value: string | number;
  subtext: string;
  subtextTone?: "green" | "muted";
  subtextIcon?: ReceptionStatSubtextIcon;
  iconSrc: string;
  iconTone: "green" | "red";
};

function formatStatValue(value: string | number, padValue: boolean): string {
  if (typeof value === "number" && padValue) {
    return String(value).padStart(2, "0");
  }
  return String(value);
}

function getStatSubtext(
  key: ReceptionStatSubtextKey,
  stats?: ReceptionDashboardStats
): { text: string; tone: "green" | "muted" } {
  switch (key) {
    case "awaitingSubtext":
      return {
        text: `+ ${stats?.awaitingRecentCount ?? 0} new in last hour`,
        tone: "green",
      };
    case "admittedSubtext":
      return {
        text: `+ ${stats?.admittedRecentCount ?? 0} new in last hour`,
        tone: "green",
      };
    case "bedsSubtext":
      return {
        text: `General Ward: ${stats?.generalWardFreeBeds ?? 0} free`,
        tone: "muted",
      };
    case "dischargeSubtext":
      return {
        text: "Requires immediate file closure",
        tone: "muted",
      };
    default:
      return { text: "", tone: "muted" };
  }
}

function SubtextInlineIcon({
  type,
  tone,
}: {
  type: ReceptionStatSubtextIcon;
  tone: "green" | "muted";
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

export function ReceptionStatCard({
  title,
  value,
  subtext,
  subtextTone = "muted",
  subtextIcon = "info",
  iconSrc,
}: ReceptionStatCardProps) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-sm font-medium text-[#434956]">{title}</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
          <h4 className="text-[32px] font-bold leading-none text-[#262D3B]">{value}</h4>
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

type ReceptionStatsGridProps = {
  stats?: ReceptionDashboardStats;
  isLoading?: boolean;
};

export function ReceptionStatsGrid({ stats, isLoading }: ReceptionStatsGridProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {RECEPTION_STAT_CARDS.map((card) => {
        const rawValue = stats?.[card.dataKey];
        const displayValue = isLoading
          ? "..."
          : rawValue !== undefined && rawValue !== null
            ? formatStatValue(rawValue, card.padValue)
            : "N/A";
        const subtext = getStatSubtext(card.subtextKey, stats);

        return (
          <ReceptionStatCard
            key={card.id}
            title={card.title}
            value={displayValue}
            subtext={subtext.text}
            subtextTone={subtext.tone}
            subtextIcon={card.subtextIcon}
            iconSrc={card.iconSrc}
            iconTone={card.iconTone}
          />
        );
      })}
    </div>
  );
}
