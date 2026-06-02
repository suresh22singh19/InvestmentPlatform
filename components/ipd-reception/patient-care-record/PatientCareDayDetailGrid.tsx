"use client";

import Image from "next/image";
import { Badge } from "@/components/ui";
import { TimelineSectionCard } from "@/components/ipd-reception/patient-care-record/TimelineSectionCard";
import type { PatientCareTimelineDay } from "@/lib/ipd-reception/patientCareRecordTypes";

function VitalDiamond() {
  return (
    <span className="inline-block h-2 w-2 shrink-0 rotate-45 bg-[#3B82F6]" aria-hidden />
  );
}

type PatientCareDayDetailGridProps = {
  day: PatientCareTimelineDay;
};

export function PatientCareDayDetailGrid({ day }: PatientCareDayDetailGridProps) {
  if (!day.vitals) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TimelineSectionCard title="Vitals Summary" subtitle={day.vitals.recordedAt}>
          <div className="grid grid-cols-2 gap-3">
            {day.vitals.items.map((vital) => (
              <div key={vital.label} className="flex items-start gap-2">
                <VitalDiamond />
                <div>
                  <p className="text-xs text-[#9FA2AB]">{vital.label}</p>
                  <p className="text-sm font-semibold text-[#262D3B]">
                    {vital.value}
                    <span className="ml-0.5 text-xs font-medium text-[#9FA2AB]">{vital.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TimelineSectionCard>

        {day.medications ? (
          <TimelineSectionCard title="Medications">
            <ul className="space-y-3">
              {day.medications.map((med, index) => (
                <li key={`${med.name}-${index}`} className="flex items-start gap-2">
                  <Image
                    src="/icons/medicons.svg"
                    alt=""
                    width={18}
                    height={18}
                    className="mt-0.5 shrink-0 opacity-80"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-medium ${
                          med.status === "current"
                            ? "text-[#EA580C]"
                            : med.status === "given"
                              ? "text-[#0B8C00]"
                              : "text-[#434956]"
                        }`}
                      >
                        {med.name}
                      </span>
                      {med.status === "upcoming" ? (
                        <Badge variant="success" className="shrink-0 text-[10px] font-medium">
                          Upcoming
                        </Badge>
                      ) : med.time ? (
                        <span
                          className={`shrink-0 text-xs font-medium ${
                            med.status === "current" ? "text-[#EA580C]" : "text-[#0B8C00]"
                          }`}
                        >
                          {med.time}
                        </span>
                      ) : null}
                    </div>
                    {med.dosage ? (
                      <p className="text-xs text-[#9FA2AB]">{med.dosage}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </TimelineSectionCard>
        ) : null}

        {day.therapies ? (
          <TimelineSectionCard title="Therapies">
            <ul className="space-y-3">
              {day.therapies.map((therapy) => (
                <li key={`${therapy.name}-${therapy.time}`} className="flex items-start gap-2">
                  <Image
                    src="/icons/calendarCheck.svg"
                    alt=""
                    width={18}
                    height={18}
                    className="mt-0.5 shrink-0 opacity-80"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[#262D3B]">{therapy.name}</p>
                        {therapy.subtitle ? (
                          <p className="text-xs text-[#9FA2AB]">({therapy.subtitle})</p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-[#9FA2AB]">
                          {therapy.timeRange ?? therapy.time} • Therapist: {therapy.therapist}
                        </p>
                      </div>
                      <Badge variant="success" className="shrink-0 font-medium">
                        Completed
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </TimelineSectionCard>
        ) : null}
      </div>

      {day.clinicalNotes ? (
        <TimelineSectionCard title="Clinical Notes">
          <div className="space-y-3">
            {day.clinicalNotes.map((note) => (
              <div key={`${note.authorName}-${note.time}`}>
                <p className="mb-1.5 text-xs font-medium text-[#434956]">
                  {note.authorName} ({note.role}) • {note.time}
                </p>
                <div className="rounded-[12px] border border-[#E3EEE1] bg-[#F4FAF4] p-3">
                  <p className="text-sm leading-relaxed text-[#525763]">{note.text}</p>
                </div>
              </div>
            ))}
          </div>
        </TimelineSectionCard>
      ) : null}

      {day.labResults ? (
        <TimelineSectionCard title="Lab Result" className="max-w-2xl">
          <ul className="space-y-3">
            {day.labResults.map((lab) => (
              <li key={lab.name} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#262D3B]">{lab.name}</p>
                  {lab.department || lab.reportedAt ? (
                    <p className="text-xs text-[#9FA2AB]">
                      {[lab.department, lab.reportedAt].filter(Boolean).join(" • ")}
                    </p>
                  ) : null}
                </div>
                <Badge variant={lab.status === "normal" ? "success" : "warning"}>
                  {lab.statusLabel}
                </Badge>
              </li>
            ))}
          </ul>
        </TimelineSectionCard>
      ) : null}
    </div>
  );
}
