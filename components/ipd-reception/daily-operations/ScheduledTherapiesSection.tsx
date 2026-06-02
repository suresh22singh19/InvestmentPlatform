"use client";

import Image from "next/image";
import { Button } from "@/components/ui";
import type { ScheduledTherapyItem, TherapyScheduleStatus } from "@/lib/ipd-reception/dailyOperationsTypes";

const STATUS_BAR: Record<
  TherapyScheduleStatus,
  { label: string; barClass: string; textClass: string }
> = {
  completed: {
    label: "COMPLETED",
    barClass: "bg-[#0B8C00]",
    textClass: "text-white",
  },
  upcoming: {
    label: "UPCOMING",
    barClass: "bg-[#0B8C00]/70",
    textClass: "text-white",
  },
  delayed: {
    label: "DELAYED",
    barClass: "bg-[#EF4444]",
    textClass: "text-white",
  },
};

function TherapyCard({ item }: { item: ScheduledTherapyItem }) {
  const statusStyle = STATUS_BAR[item.status];

  return (
    <div className="overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white shadow-sm">
      <div className="p-4">
        <p className="text-sm font-semibold text-[#262D3B]">
          {item.patientName}{" "}
          <span className="font-medium text-[#9FA2AB]">(Bed {item.bed})</span>
        </p>
        <div className="mt-3 space-y-1.5 text-xs text-[#525763]">
          <p>
            <span className="font-medium text-[#434956]">Therapy Type:</span> {item.therapyType}{" "}
            ({item.therapyDetail})
          </p>
          <p>
            <span className="font-medium text-[#434956]">Therapist:</span> {item.therapist}
          </p>
          <p>
            <span className="font-medium text-[#434956]">Time:</span> {item.timeSlot}
          </p>
        </div>
      </div>
      <div
        className={`px-4 py-2 text-center text-xs font-bold tracking-wide ${statusStyle.barClass} ${statusStyle.textClass}`}
      >
        {statusStyle.label}
      </div>
    </div>
  );
}

type ScheduledTherapiesSectionProps = {
  therapies: ScheduledTherapyItem[];
};

export function ScheduledTherapiesSection({ therapies }: ScheduledTherapiesSectionProps) {
  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-[#262D3B]">Scheduled Therapies for Today</h2>
        <Button
          variant="primary"
          size="xsmall"
          className="!min-w-0 shrink-0 whitespace-nowrap"
          leftIcon={<Image src="/icons/DownloadExport.svg" alt="" width={16} height={16} className="brightness-0 invert" />}
        >
          Download Schedule
        </Button>
      </div>
      <div className="space-y-3">
        {therapies.map((item) => (
          <TherapyCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
