"use client";

import Image from "next/image";
import Link from "next/link";
import type { AdmittedPatientsRegistryStats } from "@/lib/ipd-reception/admittedPatientsTypes";

const PENDING_DISCHARGES_HREF = "/ipd-reception/admitted-patients/pending-discharges";

const ADMITTED_REGISTRY_STAT_CARDS = [
  {
    id: "totalAdmitted",
    title: "Total Admitted",
    iconSrc: "/icons/multiuser.svg",
    getValue: (s: AdmittedPatientsRegistryStats) => String(s.totalAdmitted),
    getSubtext: (s: AdmittedPatientsRegistryStats) => `+${s.admittedSinceYesterday} since yesterday`,
    subtextTone: "green" as const,
  },
  {
    id: "bedOccupancy",
    title: "Bed Occupancy",
    iconSrc: "/icons/bedDarkIcon.svg",
    getValue: (s: AdmittedPatientsRegistryStats) => `${s.bedOccupancyPercent}%`,
    getSubtext: (s: AdmittedPatientsRegistryStats) => `${s.bedsAvailable} beds available`,
    subtextTone: "muted" as const,
  },
  {
    id: "pendingDischarges",
    title: "Pending Discharges",
    iconSrc: "/icons/exitIcon.svg",
    getValue: (s: AdmittedPatientsRegistryStats) => String(s.pendingDischarges).padStart(2, "0"),
    getSubtext: () => "Processing papers",
    subtextTone: "muted" as const,
    href: PENDING_DISCHARGES_HREF,
  },
];

type AdmittedPatientsStatsGridProps = {
  stats: AdmittedPatientsRegistryStats;
};

export function AdmittedPatientsStatsGrid({ stats }: AdmittedPatientsStatsGridProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {ADMITTED_REGISTRY_STAT_CARDS.map((card) => {
        const cardBody = (
          <>
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-sm font-medium text-[#434956]">{card.title}</p>
              <h4 className="mt-2 text-[32px] font-bold leading-[120%] text-[#262D3B]">
                {card.getValue(stats)}
              </h4>
              <p
                className={`mt-2 text-xs leading-[140%] ${
                  card.subtextTone === "green"
                    ? "font-medium text-[#0B8C00]"
                    : "text-[#9FA2AB]"
                }`}
              >
                {card.getSubtext(stats)}
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F4F8F4]">
              <Image src={card.iconSrc} alt="" width={28} height={28} />
            </div>
          </>
        );

        const className =
          "flex items-start justify-between rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm";

        if ("href" in card && card.href) {
          return (
            <Link
              key={card.id}
              href={card.href}
              className={`${className} cursor-pointer transition-shadow hover:shadow-md`}
            >
              {cardBody}
            </Link>
          );
        }

        return (
          <div key={card.id} className={className}>
            {cardBody}
          </div>
        );
      })}
    </div>
  );
}
