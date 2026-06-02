"use client";

import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui";
import { PatientCareTimelineDaySection } from "@/components/ipd-reception/patient-care-record/PatientCareTimelineDay";
import { MOCK_PATIENT_HISTORY_VISITS } from "@/lib/ipd-reception/patientCareRecordHistoryMock";
import type { HistoryVisit } from "@/lib/ipd-reception/patientCareRecordTypes";

function HistoryVisitAccordion({
  visit,
  isExpanded,
  onToggle,
}: {
  visit: HistoryVisit;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() => {
    if (!visit.timelineDays) return {};
    return Object.fromEntries(visit.timelineDays.map((d) => [d.id, d.isExpanded]));
  });

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  return (
    <div className="overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FAFBFA]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#262D3B]">{visit.dateRange}</p>
          {!isExpanded ? (
            <p className="mt-1 text-xs text-[#525763]">
              <span className="font-medium text-[#434956]">Diagnosis:</span> {visit.diagnosis}
              <span className="mx-2 text-[#DFE0E2]">•</span>
              <span className="font-medium text-[#434956]">Consultant:</span> {visit.doctor}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {visit.isArchived ? (
            <Badge variant="neutral" className="font-medium">
              Archived
            </Badge>
          ) : null}
          <Image
            src="/icons/ArrowDown.svg"
            alt=""
            width={18}
            height={18}
            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t border-[#E3EEE1]">
          <div className="grid grid-cols-1 gap-0 border-b border-[#E3EEE1] bg-[#F4FAF4] px-5 py-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9FA2AB]">
                Admission Period
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#262D3B]">{visit.admissionPeriod}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9FA2AB]">
                Primary Diagnosis
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#262D3B]">{visit.primaryDiagnosis}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9FA2AB]">
                Senior Consultant
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#262D3B]">
                {visit.seniorConsultant}
              </p>
            </div>
          </div>

          {visit.timelineDays ? (
            <div className="px-5 py-4">
              {visit.timelineDays.map((day) => (
                <PatientCareTimelineDaySection
                  key={day.id}
                  day={day}
                  isExpanded={expandedDays[day.id] ?? day.isExpanded}
                  onToggleExpand={() => toggleDay(day.id)}
                />
              ))}
            </div>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-[#9FA2AB]">
              No detailed timeline available for this visit.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function HistoryVisitsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(
    MOCK_PATIENT_HISTORY_VISITS[0]?.id ?? null
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#262D3B]">Previous Visit History</h2>
      {MOCK_PATIENT_HISTORY_VISITS.map((visit) => (
        <HistoryVisitAccordion
          key={visit.id}
          visit={visit}
          isExpanded={expandedId === visit.id}
          onToggle={() => setExpandedId((prev) => (prev === visit.id ? null : visit.id))}
        />
      ))}
    </div>
  );
}
