"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SpinnerLoader, TableSearchInput, Tooltip } from "@/components/ui";
import {
  useStaffNurseGetPatientTimelineQuery,
  type PatientTimelineDay as ApiPatientTimelineDay,
  type PatientTimelineVital,
} from "@/store/api/ipdStaffNurseAPI";
import { StatusPill } from "./shared";

export type TimelineTone = "success" | "warning" | "danger" | "neutral";

type TimelineVitalItem = {
  label: string;
  value: string;
  status: string;
  tone: TimelineTone;
};

type TimelineListItem = {
  id: string;
  title: string;
  meta: string;
  status: string;
  tone: TimelineTone;
  solid?: boolean;
};

type TimelineNoteItem = {
  id: string;
  initials: string;
  name: string;
  role: string;
  time: string;
  note: string;
};

export type TimelineDay = {
  id: string;
  label: string;
  badge?: string;
  summary: {
    bloodPressure: string;
    pulseRate: string;
    therapies: string;
    notes: string;
  };
  vitals: {
    lastUpdated: string;
    items: TimelineVitalItem[];
  };
  medications: TimelineListItem[];
  therapies: TimelineListItem[];
  clinicalNotes: TimelineNoteItem[];
  activityLog: TimelineListItem[];
  labResults: TimelineListItem[];
};

export const TIMELINE_DAYS: TimelineDay[] = [
  {
    id: "today",
    label: "Today, Oct 24",
    badge: "Active Day 7",
    summary: {
      bloodPressure: "124/82mmHg",
      pulseRate: "72bpm",
      therapies: "Abhyanga, Elakizhi",
      notes: "3 Entries Recorded",
    },
    vitals: {
      lastUpdated: "09:15 AM",
      items: [
        { label: "Blood Pressure", value: "124/82mmHg", status: "High", tone: "danger" },
        { label: "Pulse Rate", value: "72bpm", status: "Normal", tone: "success" },
        { label: "Temperature", value: "98.6°F", status: "Normal", tone: "success" },
        { label: "SpO2", value: "98%", status: "Watch", tone: "warning" },
        { label: "Resp Rate", value: "18", status: "Normal", tone: "success" },
        { label: "Pain", value: "7/10", status: "Severe", tone: "danger" },
      ],
    },
    medications: [
      {
        id: "med-1",
        title: "Ashwagandha Churna 500mg • Post Meal",
        meta: "08:00 AM",
        status: "Administered",
        tone: "success",
        solid: true,
      },
      {
        id: "med-2",
        title: "Dashmularishta 15ml • After Dinner",
        meta: "10:30 AM",
        status: "Pending",
        tone: "warning",
      },
      {
        id: "med-3",
        title: "Brahmi Vati 1 Tab • Bedtime",
        meta: "12:00 PM",
        status: "Refused",
        tone: "danger",
      },
      {
        id: "med-4",
        title: "Amla Juice 20ml • Morning",
        meta: "02:00 PM",
        status: "Wasted",
        tone: "warning",
      },
      {
        id: "med-5",
        title: "Triphala Churna 1 tsp • Night",
        meta: "04:00 PM",
        status: "Changed",
        tone: "warning",
      },
      {
        id: "med-6",
        title: "Giloy Kwath 30ml • Evening",
        meta: "06:00 PM",
        status: "Wasted",
        tone: "warning",
      },
    ],
    therapies: [
      {
        id: "th-1",
        title: "Shirodhara (Medicated Oil)",
        meta: "07:00 AM - 07:45 AM • Therapist: Ramesh K.",
        status: "Completed",
        tone: "success",
      },
      {
        id: "th-2",
        title: "Abhyanga (Full Body Massage)",
        meta: "09:00 AM - 09:45 AM • Therapist: Meena P.",
        status: "Completed",
        tone: "success",
      },
      {
        id: "th-3",
        title: "Nasya (Nasal Therapy)",
        meta: "11:00 AM - 11:20 AM • Therapist: Ramesh K.",
        status: "Completed",
        tone: "success",
      },
      {
        id: "th-4",
        title: "Elakizhi (Herbal Poultice)",
        meta: "01:00 PM - 01:40 PM • Therapist: Meena P.",
        status: "Completed",
        tone: "success",
      },
      {
        id: "th-5",
        title: "Pizhichil",
        meta: "03:30 PM - 04:15 PM • Therapist: Ramesh K.",
        status: "Completed",
        tone: "success",
      },
    ],
    clinicalNotes: [
      {
        id: "note-1",
        initials: "KS",
        name: "Dr. Kavita Sharma",
        role: "Senior Consultant",
        time: "10:15 AM",
        note: "Patient responding well to current medication plan. Continue Shirodhara therapy for next 3 days. Monitor BP closely.",
      },
      {
        id: "note-2",
        initials: "SP",
        name: "Nurse Samuel Peters",
        role: "Duty Nurse",
        time: "10:15 AM",
        note: "Patient complained of mild headache after therapy. Rest advised. Hydration encouraged. No fever recorded.",
      },
    ],
    activityLog: [
      {
        id: "act-1",
        title: "Paracetamol 500mg added",
        meta: "By Dr. Kavita Sharma • 09:40 AM",
        status: "Added",
        tone: "success",
        solid: true,
      },
      {
        id: "act-2",
        title: "Vitamin D3 discontinued",
        meta: "By Dr. Kavita Sharma • 09:20 AM",
        status: "Discontinued",
        tone: "danger",
      },
      {
        id: "act-3",
        title: "Ashwagandha dose updated",
        meta: "By Nurse Samuel Peters • 08:55 AM",
        status: "Dose Changed",
        tone: "warning",
      },
    ],
    labResults: [
      {
        id: "lab-1",
        title: "CBC + Serum Ferritin",
        meta: "Pathology • Report: 08:40 AM",
        status: "Received",
        tone: "success",
      },
      {
        id: "lab-2",
        title: "S. Creatinine",
        meta: "Biochemistry • Report Pending",
        status: "Pending",
        tone: "warning",
      },
    ],
  },
  {
    id: "oct-23",
    label: "Wednesday, Oct 23",
    summary: {
      bloodPressure: "124/82mmHg",
      pulseRate: "72bpm",
      therapies: "Abhyanga, Elakizhi",
      notes: "3 Entries Recorded",
    },
    vitals: {
      lastUpdated: "08:40 AM",
      items: [
        { label: "Blood Pressure", value: "124/82mmHg", status: "Normal", tone: "success" },
        { label: "Pulse Rate", value: "72bpm", status: "Normal", tone: "success" },
        { label: "Temperature", value: "98.4°F", status: "Normal", tone: "success" },
        { label: "SpO2", value: "97%", status: "Normal", tone: "success" },
        { label: "Resp Rate", value: "16", status: "Normal", tone: "success" },
        { label: "Pain", value: "4/10", status: "Mild", tone: "warning" },
      ],
    },
    medications: [
      {
        id: "med-6",
        title: "Ashwagandha Churna 500mg • Post Meal",
        meta: "08:00 AM",
        status: "Administered",
        tone: "success",
        solid: true,
      },
      {
        id: "med-7",
        title: "Dashmularishta 15ml • After Dinner",
        meta: "08:00 PM",
        status: "Administered",
        tone: "success",
        solid: true,
      },
    ],
    therapies: [
      {
        id: "th-prev-1",
        title: "Abhyanga (Full Body Massage)",
        meta: "09:00 AM - 09:45 AM • Therapist: Meena P.",
        status: "Completed",
        tone: "success",
      },
      {
        id: "th-prev-2",
        title: "Elakizhi",
        meta: "11:00 AM - 11:40 AM • Therapist: Ramesh K.",
        status: "Completed",
        tone: "success",
      },
    ],
    clinicalNotes: [
      {
        id: "note-3",
        initials: "KS",
        name: "Dr. Kavita Sharma",
        role: "Senior Consultant",
        time: "11:30 AM",
        note: "Patient stable. Continue existing therapy plan and monitor vitals every 4 hours.",
      },
    ],
    activityLog: [
      {
        id: "act-4",
        title: "Brahmi Vati added",
        meta: "By Dr. Kavita Sharma • 10:10 AM",
        status: "Added",
        tone: "success",
        solid: true,
      },
    ],
    labResults: [
      {
        id: "lab-3",
        title: "LFT",
        meta: "Pathology • Report: 07:50 AM",
        status: "Received",
        tone: "success",
      },
    ],
  },
];

export function TimelineStatusBadge({
  label,
  tone,
  solid = false,
}: {
  label: string;
  tone: TimelineTone;
  solid?: boolean;
}) {
  if (solid) {
    const solidClasses =
      tone === "danger"
        ? "bg-[#DC2626] text-white"
        : tone === "warning"
          ? "bg-[#EA580C] text-white"
          : tone === "success"
            ? "bg-[#0B8C00] text-white"
            : "bg-[#64748B] text-white";
    return (
      <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap ${solidClasses}`}>
        {label}
      </span>
    );
  }

  return <StatusPill label={label} tone={tone} />;
}

export function TimelinePanel({
  title,
  iconSrc,
  rightSlot,
  children,
}: {
  title: string;
  iconSrc: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-[#EDF3EA] bg-white p-4 shadow-[0px_8px_20px_rgba(34,56,43,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image src={iconSrc} alt="" width={16} height={16} />
          <h4 className="text-sm font-semibold text-[#262D3B]">{title}</h4>
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

export function TimelineDayContent({
  day,
  query,
  layout = "timeline",
}: {
  day: TimelineDay;
  query: string;
  layout?: "timeline" | "history";
}) {
  const q = query.trim().toLowerCase();
  const matches = (value: string) => (q ? value.toLowerCase().includes(q) : true);

  const vitals = day.vitals.items.filter(
    (item) => matches(item.label) || matches(item.value) || matches(item.status)
  );
  const medications = day.medications.filter(
    (item) => matches(item.title) || matches(item.meta) || matches(item.status)
  );
  const therapies = day.therapies.filter(
    (item) => matches(item.title) || matches(item.meta) || matches(item.status)
  );
  const notes = day.clinicalNotes.filter(
    (item) => matches(item.name) || matches(item.role) || matches(item.note)
  );
  const activityLog = day.activityLog.filter(
    (item) => matches(item.title) || matches(item.meta) || matches(item.status)
  );
  const labResults = day.labResults.filter(
    (item) => matches(item.title) || matches(item.meta) || matches(item.status)
  );

  const showActivityLog = layout === "timeline";
  const hasContent =
    vitals.length > 0 ||
    medications.length > 0 ||
    therapies.length > 0 ||
    notes.length > 0 ||
    (showActivityLog && activityLog.length > 0) ||
    labResults.length > 0;

  if (!hasContent) {
    return <p className="text-sm text-[#9FA2AB]">No matching timeline entries for this day.</p>;
  }

  return (
    <div className="space-y-4">
      {(vitals.length > 0 || medications.length > 0 || therapies.length > 0) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {vitals.length > 0 ? (
            <TimelinePanel
              title="Vitals Summary"
              iconSrc="/icons/VitalsIcon.svg"
              rightSlot={<span className="text-xs text-[#9FA2AB]">Last: {day.vitals.lastUpdated}</span>}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* {vitals.map((item) => (
                  <div key={item.label} className="rounded-[12px] border border-[#EDF3EA] bg-[#FCFDFC] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-[#7B8089]">{item.label}</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#262D3B]">{item.value}</p>
                  </div>
                ))} */}
                 {vitals.map((vital,index) => (
                    <div
                      key={index+1}
                      className={`rounded-2xl border border-[#EDF3EA] bg-white p-4 ${
                        vital.label === "Pain" ? "sm:col-span-2" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-[#2563EB]" />

                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-[120%] text-[#434956]">
                            {vital.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#262D3B]">
                            {vital.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </TimelinePanel>
          ) : null}

          {medications.length > 0 ? (
            <TimelinePanel title="Medications" iconSrc="/icons/clinicalMedicine.svg">
              {/* <div className="space-y-3"> */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {medications.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-[12px] border border-[#EDF3EA] bg-[#FCFDFC] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#262D3B]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#9FA2AB]">{item.meta}</p>
                    </div>
                    <TimelineStatusBadge label={item.status} tone={item.tone} solid={item.solid} />
                  </div>
                ))}
              </div>
            </TimelinePanel>
          ) : null}

          {therapies.length > 0 ? (
            <TimelinePanel title="Therapies" iconSrc="/icons/therapiesGreenIcon.svg">
              {/* <div className="space-y-3"> */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {therapies.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-[12px] border border-[#EDF3EA] bg-[#FCFDFC] px-3 py-2.5"
                  >
                    {/* <div className="min-w-0">
                      <p className="text-sm font-medium text-[#262D3B]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#9FA2AB]">{item.meta}</p>
                    </div> */}
                    <div className="min-w-0">
                      <Tooltip
                        position="top"
                        content={
                          <span className="max-w-xs whitespace-normal break-words">
                            {item.title
                              ?.split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                              )
                              .join(" ") || "N/A"}
                          </span>
                        }
                      >
                        <p className="truncate text-sm font-medium leading-tight text-[#262D3B]">
                          {item.title
                            ?.split(" ")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                            )
                            .join(" ") || "N/A"}
                        </p>
                      </Tooltip>
                        <p className="mt-1 text-xs text-[#9FA2AB]">{item.meta}</p>
                    </div>
                    <TimelineStatusBadge label={item.status} tone={item.tone} />
                  </div>
                ))}
              </div>
            </TimelinePanel>
          ) : null}
        </div>
      )}

      {(notes.length > 0 || (showActivityLog && activityLog.length > 0) || labResults.length > 0) && (
        <div
          className={`grid grid-cols-1 gap-4 ${
            layout === "history" ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "xl:grid-cols-3"
          }`}
        >
          {notes.length > 0 ? (
            <TimelinePanel title="Notes" iconSrc="/icons/documents.svg">
              {/* <div className="space-y-3"> */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {notes.map((item) => (
                  <div key={item.id} className="rounded-[12px] border border-[#EDF3EA] bg-[#FCFDFC] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E8F5E9] text-xs font-semibold text-[#0B8C00]">
                          {item.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#262D3B]">{item.name}</p>
                          <p className="text-xs text-[#9FA2AB]">{item.role}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#9FA2AB]">{item.time}</span>
                    </div>
                    <div className="mt-3 rounded-[10px] border-l-4 border-[#0B8C00] bg-[#E8F5E9] px-3 py-2">
                      <p className="text-sm leading-[150%] text-[#434956]">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TimelinePanel>
          ) : null}

          {showActivityLog && activityLog.length > 0 ? (
            <TimelinePanel title="Medication Activity Log" iconSrc="/icons/medicons.svg">
              {/* <div className="space-y-3"> */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {activityLog.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-[12px] border border-[#EDF3EA] bg-[#FCFDFC] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#262D3B]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#9FA2AB]">{item.meta}</p>
                    </div>
                    <TimelineStatusBadge label={item.status} tone={item.tone} solid={item.solid} />
                  </div>
                ))}
              </div>
            </TimelinePanel>
          ) : null}

          {labResults.length > 0 ? (
            <TimelinePanel title="Lab Result" iconSrc="/icons/labresult.svg">
              {/* <div className="space-y-3"> */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {labResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-[12px] border border-[#EDF3EA] bg-[#FCFDFC] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#262D3B]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#9FA2AB]">{item.meta}</p>
                    </div>
                    <TimelineStatusBadge label={item.status} tone={item.tone} />
                  </div>
                ))}
              </div>
            </TimelinePanel>
          ) : null}
        </div>
      )}
    </div>
  );
}


function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTodayDate(dateValue: string) {
  return dateValue === formatLocalDate(new Date());
}

function formatTimelineDayLabel(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (isTodayDate(dateValue)) {
    return `Today, ${formattedDate}`;
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeFromIso(value: string | null | undefined) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimingType(timingType: string | null | undefined) {
  if (!timingType?.trim()) return "N/A";
  return timingType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatusLabel(status: string | null | undefined) {
  if (!status?.trim()) return "N/A";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function mapStatusTone(status: string | null | undefined): TimelineTone {
  const normalized = status?.toLowerCase() ?? "";
  if (["completed", "administered", "taken", "given", "received", "normal"].includes(normalized)) {
    return "success";
  }
  if (["pending", "scheduled", "upcoming", "wasted", "cancelled"].includes(normalized)) {
    return "warning";
  }
  if (["missed", "refused", "overdue", "discontinued", "high"].includes(normalized)) {
    return "danger";
  }
  return "neutral";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getLatestVital(vitals: PatientTimelineVital[]) {
  if (!vitals.length) return null;

  return [...vitals].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0];
}

function buildVitalItems(vital: PatientTimelineVital): TimelineVitalItem[] {
  const items: TimelineVitalItem[] = [];

  const addItem = (label: string, value: string | null | undefined, suffix = "") => {
    if (!value?.trim()) return;
    items.push({
      label,
      value: `${value}${suffix}`,
      status: "Recorded",
      tone: "success",
    });
  };

  addItem("Blood Pressure", vital.bloodPressure, " mmHg");
  addItem("Pulse Rate", vital.pulse, " bpm");
  addItem("Temperature", vital.temperature, "°F");
  addItem("SpO2", vital.spo2, "%");
  addItem("Sugar Level", vital.sugarLevel, " mg/dL");
  addItem("Resp Rate", vital.respiratoryRate);
  if (vital.painScale) addItem("Pain", vital.painScale, "/10");
  // if (vital.abdominalGirth) addItem("Abdominal Girth", vital.abdominalGirth, " cm");

  return items;
}

function formatTherapyMeta(therapy: ApiPatientTimelineDay["therapies"][number]) {
  const timeParts = [
    therapy.scheduledStartTime || therapy.startTime || therapy.sessionStartTime,
    therapy.scheduledEndTime || therapy.endTime || therapy.sessionEndTime,
  ].filter(Boolean);

  const timeLabel = timeParts.length
    ? timeParts.join(" - ")
    : therapy.timeSlot || "N/A";

  return `${timeLabel} • Therapist: ${therapy.therapistName || "N/A"}`;
}

export function mapApiTimelineDayToUi(day: ApiPatientTimelineDay): TimelineDay {
  const latestVital = getLatestVital(day.vitals);
  const therapyNames = day.therapies
    .map((therapy) => therapy.therapyName)
    .filter((name): name is string => Boolean(name));

  return {
    id: day.date,
    label: formatTimelineDayLabel(day.date),
    summary: {
      bloodPressure: latestVital?.bloodPressure ? `${latestVital.bloodPressure} mmHg` : "N/A",
      pulseRate: latestVital?.pulse ? `${latestVital.pulse} bpm` : "N/A",
      therapies: therapyNames.length ? therapyNames.join(", ") : "N/A",
      notes:
        day.notes.length > 0
          ? `${day.notes.length} Entries Recorded`
          : "No entries recorded",
    },
    vitals: {
      lastUpdated: latestVital ? formatTimeFromIso(latestVital.createdAt) : "N/A",
      items: latestVital ? buildVitalItems(latestVital) : [],
    },
    medications: day.medications.map((medication, index) => ({
      id: `med-${day.date}-${medication.prescribeId}-${index}`,
      title: `${medication.medicineName} ${medication.dosageAmount} ${medication.dosageUnit} • ${formatTimingType(medication.timingType)}`,
      meta: formatTimeFromIso(medication.completedAt),
      status: formatStatusLabel(medication.status),
      tone: mapStatusTone(medication.status),
      solid: medication.status?.toLowerCase() === "completed",
    })),
    therapies: day.therapies.map((therapy, index) => ({
      id: `therapy-${day.date}-${therapy.sessionId ?? index}`,
      title: therapy.therapyName,
      meta: formatTherapyMeta(therapy),
      // status: formatStatusLabel(therapy.status),
      // tone: mapStatusTone(therapy.status),
        status: therapy.session == null ? "Scheduled" : formatStatusLabel(therapy.session.status),
      tone: therapy.session == null ? "danger" : mapStatusTone(therapy.session.status),
    })),
    clinicalNotes: day.notes.map((note) => ({
      id: `note-${note.id}`,
      initials: getInitials(note.addedByName ?? "N/A"),
      name: note.addedByName ?? "N/A",
      role: note.category ? formatStatusLabel(note.category) : "Clinical Note",
      time: formatTimeFromIso(note.createdAt),
      note: note.notes,
    })),
    activityLog: [],
    labResults: day.labTests.map((labTest) => ({
      id: `lab-${labTest.id}`,
      title: labTest.labTest?.testName ?? "Lab Test",
      meta: `${labTest.labTest?.categoryName ?? "Lab"} • ${formatTimeFromIso(labTest.createdAt)}`,
      status: formatStatusLabel(labTest.testStatus),
      tone: mapStatusTone(labTest.testStatus),
    })),
  };
}


export function PatientTimelineTab({
  patientId,
  branchId,
}: {
  patientId?: number;
  branchId?: number | null;
}) {
  const [timelineSearch, setTimelineSearch] = useState("");
  const [expandedTimelineDayIds, setExpandedTimelineDayIds] = useState<string[]>([]);

  const {
    data: patientTimelineRes,
    isLoading: isPatientTimelineLoading,
    isFetching: isPatientTimelineFetching,
  } = useStaffNurseGetPatientTimelineQuery(
    {
      patientId: patientId ?? 0,
      branchId: branchId ?? 0,
    },
    {
      skip: !patientId || branchId == null,
      refetchOnMountOrArgChange: true,
    }
  );

  const timelineDays = useMemo(
    () => (patientTimelineRes?.data ?? []).map(mapApiTimelineDayToUi),
    [patientTimelineRes?.data]
  );

  useEffect(() => {
    if (timelineDays.length === 0) {
      setExpandedTimelineDayIds([]);
      return;
    }

    const todayDay = timelineDays.find((day) => isTodayDate(day.id));
    setExpandedTimelineDayIds([todayDay?.id ?? timelineDays[0].id]);
  }, [timelineDays]);

  const toggleTimelineDay = (dayId: string) => {
    setExpandedTimelineDayIds((prev) =>
      prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-medium text-[#262D3B]">Overview</h3>
          <div className="w-full sm:w-[320px]">
            <TableSearchInput
              value={timelineSearch}
              onChange={setTimelineSearch}
              placeholder="Search Here..."
            />
          </div>
        </div>

        <div className="relative space-y-5 pl-8">
          <div className="absolute bottom-3 left-[11px] top-3 w-px bg-[#C8DFC5]" />

          {isPatientTimelineLoading || isPatientTimelineFetching ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9CA3AF]">
              <SpinnerLoader size={18} />
              Loading patient timeline...
            </div>
          ) : timelineDays.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#9CA3AF]">No timeline data found.</p>
          ) : (
            timelineDays.map((day) => {
            const isExpanded = expandedTimelineDayIds.includes(day.id);

            return (
              <div key={day.id} className="relative">
                <button
                  type="button"
                  onClick={() => toggleTimelineDay(day.id)}
                  className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#0B8C00] bg-white text-[#0B8C00]"
                  aria-label={isExpanded ? `Collapse ${day.label}` : `Expand ${day.label}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d={isExpanded ? "M6 15L12 9L18 15" : "M6 9L12 15L18 9"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h4 className="text-sm font-semibold text-[#262D3B]">{day.label}</h4>
                  {day.badge ? (
                    <span className="rounded-full border border-[#0B8C0033] bg-[#E8F5E9] px-2.5 py-1 text-[11px] font-medium text-[#0B8C00]">
                      {day.badge}
                    </span>
                  ) : null}
                </div>

                {isExpanded ? (
                  <TimelineDayContent day={day} query={timelineSearch} />
                ) : (
                  <div className="flex flex-col gap-3 rounded-[14px] border border-[#EDF3EA] bg-[#FCFDFC] p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-[11px] text-[#9FA2AB]">Blood Pressure</p>
                        <p className="mt-1 text-sm font-medium text-[#262D3B]">{day.summary.bloodPressure}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#9FA2AB]">Pulse Rate</p>
                        <p className="mt-1 text-sm font-medium text-[#262D3B]">{day.summary.pulseRate}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#9FA2AB]">Therapies</p>
                        <p className="mt-1 text-sm font-medium text-[#262D3B]">{day.summary.therapies}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#9FA2AB]">Notes</p>
                        <p className="mt-1 text-sm font-medium text-[#262D3B]">{day.summary.notes}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleTimelineDay(day.id)}
                      className="text-xs font-semibold tracking-wide text-[#0B8C00] hover:underline"
                    >
                      EXPAND DAY
                    </button>
                  </div>
                )}
              </div>
            );
          })
          )}
        </div>
      </section>
    </div>
  );
}
