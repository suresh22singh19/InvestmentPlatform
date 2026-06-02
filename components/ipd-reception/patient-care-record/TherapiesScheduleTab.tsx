"use client";

import Image from "next/image";
import { THERAPY_SCHEDULE_WEEK } from "@/lib/ipd-reception/patientCareRecordTherapiesMock";
import type { TherapyWeekSession } from "@/lib/ipd-reception/patientCareRecordTypes";

function TherapySessionCard({ session }: { session: TherapyWeekSession }) {
  const borderClass =
    session.status === "done"
      ? "border-l-4 border-l-[#0B8C00]"
      : session.status === "missed"
        ? "border-l-4 border-l-[#EF4444]"
        : "border-l-4 border-l-[#DFE0E2]";

  return (
    <div
      className={`rounded-[12px] border border-[#E3EEE1] bg-[#FAFBFA] p-3 ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-[#0B8C00]">{session.time}</p>
        {session.status === "done" ? (
          <Image src="/icons/check.svg" alt="" width={14} height={14} />
        ) : session.status === "missed" ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FEF2F2] text-xs font-bold text-[#EF4444]">
            !
          </span>
        ) : (
          <span className="h-2 w-2 rounded-full bg-[#DFE0E2]" />
        )}
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-tight text-[#262D3B]">{session.name}</p>
      {session.sessionLabel ? (
        <p className="text-xs text-[#9FA2AB]">{session.sessionLabel}</p>
      ) : null}
    </div>
  );
}

export function TherapiesScheduleTab() {
  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Image src="/icons/calendarCheck.svg" alt="" width={20} height={20} />
        <h2 className="text-lg font-semibold text-[#262D3B]">Therapy Schedule</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {THERAPY_SCHEDULE_WEEK.map((day) => (
          <div
            key={day.id}
            className={`min-w-0 rounded-[12px] p-2 ${day.isToday ? "bg-[#F4FAF4] ring-1 ring-[#0B8C00]/20" : ""}`}
          >
            <div className="mb-3 text-center">
              <p
                className={`text-sm font-semibold ${day.isToday ? "text-[#0B8C00]" : "text-[#262D3B]"}`}
              >
                {day.dayLabel} {day.dateLabel}
              </p>
              {day.isToday ? (
                <p className="text-[10px] font-semibold uppercase text-[#0B8C00]">Today</p>
              ) : null}
            </div>
            <div className="space-y-2">
              {day.sessions.length > 0 ? (
                day.sessions.map((session) => (
                  <TherapySessionCard key={session.id} session={session} />
                ))
              ) : (
                <p className="py-6 text-center text-xs text-[#9FA2AB]">
                  No therapies scheduled
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
