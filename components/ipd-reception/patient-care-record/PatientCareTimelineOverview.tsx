"use client";

import { useState } from "react";
import { TableSearchInput } from "@/components/ui";
import { PatientCareTimelineDaySection } from "@/components/ipd-reception/patient-care-record/PatientCareTimelineDay";
import type { PatientCareTimelineDay } from "@/lib/ipd-reception/patientCareRecordTypes";

type PatientCareTimelineOverviewProps = {
  days: PatientCareTimelineDay[];
};

export function PatientCareTimelineOverview({ days }: PatientCareTimelineOverviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(days.map((d) => [d.id, d.isExpanded]))
  );

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const filteredDays = days.filter((day) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      day.dateLabel.toLowerCase().includes(term) ||
      day.medications?.some((m) => m.name.toLowerCase().includes(term)) ||
      day.therapies?.some((t) => t.name.toLowerCase().includes(term)) ||
      day.clinicalNotes?.some((n) => n.text.toLowerCase().includes(term))
    );
  });

  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-[#262D3B]">Overview</h2>
        <div className="w-full sm:w-[280px]">
          <TableSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search Here..."
          />
        </div>
      </div>

      <div className="space-y-0">
        {filteredDays.map((day) => (
          <PatientCareTimelineDaySection
            key={day.id}
            day={day}
            isExpanded={expandedDays[day.id] ?? day.isExpanded}
            onToggleExpand={() => toggleDay(day.id)}
          />
        ))}
      </div>
    </div>
  );
}
