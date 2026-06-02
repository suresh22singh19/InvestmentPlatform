"use client";

import Image from "next/image";
import { Badge, Button } from "@/components/ui";
import { PatientCareDayDetailGrid } from "@/components/ipd-reception/patient-care-record/PatientCareDayDetailGrid";
import type { PatientCareTimelineDay } from "@/lib/ipd-reception/patientCareRecordTypes";

type PatientCareTimelineDayProps = {
  day: PatientCareTimelineDay;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

function TimelineNode({ expanded, isToday }: { expanded: boolean; isToday?: boolean }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B8C00] text-white shadow-sm">
      {isToday && expanded ? (
        <Image src="/icons/check.svg" alt="" width={14} height={14} className="brightness-0 invert" />
      ) : (
        <Image
          src="/icons/ArrowDown.svg"
          alt=""
          width={14}
          height={14}
          className={`brightness-0 invert transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      )}
    </div>
  );
}

export function PatientCareTimelineDaySection({
  day,
  isExpanded,
  onToggleExpand,
}: PatientCareTimelineDayProps) {
  const isToday = day.id === "today";

  return (
    <div className="relative flex gap-4 pb-8 last:pb-2">
      <div className="flex flex-col items-center">
        <TimelineNode expanded={isExpanded} isToday={isToday} />
        <div className="mt-2 w-px flex-1 bg-[#E3EEE1]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-[#262D3B]">{day.dateLabel}</h2>
          {day.dayBadge ? (
            <Badge
              variant={day.dayBadgeVariant === "warning" ? "warning" : "success"}
              className="font-medium"
            >
              {day.dayBadge}
            </Badge>
          ) : null}
        </div>

        {isExpanded && day.vitals ? <PatientCareDayDetailGrid day={day} /> : null}

        {!isExpanded && day.collapsedSummary ? (
          <div className="rounded-[16px] border border-[#E3EEE1] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid flex-1 grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <div>
                  <p className="text-xs text-[#9FA2AB]">Blood Pressure</p>
                  <p className="font-semibold text-[#262D3B]">
                    {day.collapsedSummary.bloodPressure}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9FA2AB]">Pulse Rate</p>
                  <p className="font-semibold text-[#262D3B]">{day.collapsedSummary.pulseRate}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9FA2AB]">Therapies</p>
                  <p className="font-semibold text-[#262D3B]">{day.collapsedSummary.therapies}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9FA2AB]">Notes</p>
                  <p className="font-semibold text-[#262D3B]">{day.collapsedSummary.notesLabel}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="xsmall"
                className="!min-w-0 shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-wide"
                onClick={onToggleExpand}
              >
                Expand Day
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
