"use client";

import Image from "next/image";
import { Badge, Button } from "@/components/ui";
import type { ActivityLogItem, ActivityLogType } from "@/lib/ipd-reception/dailyOperationsTypes";

const LOG_ICONS: Record<ActivityLogType, { src: string; bg: string }> = {
  therapy: { src: "/icons/calendarCheck.svg", bg: "bg-[#F4FAF4]" },
  medication: { src: "/icons/medicons.svg", bg: "bg-[#F4FAF4]" },
  alert: { src: "/icons/Bell.svg", bg: "bg-[#FEF2F2]" },
  discharge: { src: "/icons/exitIcon.svg", bg: "bg-[#F4FAF4]" },
  admission: { src: "/icons/multiuser.svg", bg: "bg-[#F4FAF4]" },
};

type ActivityLogSectionProps = {
  items: ActivityLogItem[];
};

export function ActivityLogSection({ items }: ActivityLogSectionProps) {
  return (
    <div className="flex h-full flex-col rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#262D3B]">Activity Log</h2>
        <Badge variant="success" className="font-semibold uppercase">
          Today
        </Badge>
      </div>

      <ul className="min-h-0 flex-1 space-y-4">
        {items.map((item) => {
          const icon = LOG_ICONS[item.type];
          return (
            <li key={item.id} className="flex gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${icon.bg}`}
              >
                <Image src={icon.src} alt="" width={18} height={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-snug ${
                    item.type === "alert"
                      ? "font-medium text-[#EF4444]"
                      : "text-[#434956]"
                  }`}
                >
                  {item.message}
                </p>
                <p className="mt-0.5 text-xs text-[#9FA2AB]">{item.time}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <Button variant="outline" size="medium" className="mt-5 w-full !min-w-0">
        View All Logs
      </Button>
    </div>
  );
}
