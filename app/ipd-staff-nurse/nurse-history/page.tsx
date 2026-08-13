"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DatePicker, FormSelectField, SpinnerLoader, Tooltip } from "@/components/ui";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import {
  useGetStaffNurseHistoryQuery,
  type StaffNurseHistoryItem,
} from "@/store/api/ipdStaffNurseAPI";

type TaskType = "vitals" | "nursing_note" | "medication";

type SummaryCardProps = {
  label: string;
  value: string | number;
  iconSrc: string;
};

type HourSlotGroup = {
  hour: number;
  slotLabels: string[];
  rangeLabel: string;
  tasks: StaffNurseHistoryItem[];
};

const TASK_TYPE_META: Record<
  TaskType,
  { label: string; borderClass: string; bgClass: string; dotClass: string }
> = {
  vitals: {
    label: "Vitals",
    borderClass: "border-l-[#0B8C00]",
    bgClass: "bg-[#F2F9F2]",
    dotClass: "bg-[#0B8C00]",
  },
  nursing_note: {
    label: "Nursing Note",
    borderClass: "border-l-[#262D3B]",
    bgClass: "bg-[#F5F6F8]",
    dotClass: "bg-[#262D3B]",
  },
  medication: {
    label: "Medication",
    borderClass: "border-l-[#EA580C]",
    bgClass: "bg-[#FFF7ED]",
    dotClass: "bg-[#EA580C]",
  },
};

const SUMMARY_CARD_CONFIG = [
  { id: "total-patients", title: "Total Patients", iconSrc: "/icons/patients.svg" },
  { id: "pending-tasks", title: "Pending Tasks", iconSrc: "/icons/darkBrownadvanceCheck.svg" },
  { id: "completed", title: "Completed", iconSrc: "/icons/SuccessCheck.svg" },
] as const;

function SummaryCard({ label, value, iconSrc }: SummaryCardProps) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-[#E3EEE1] bg-white px-5 py-4 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
      <div>
        <p className="text-sm font-medium text-[#434956]">{label}</p>
        <h4 className="mt-2 text-[32px] font-bold leading-[120%] text-[#262D3B]">{value}</h4>
      </div>
      <Image src={iconSrc} alt={label} width={36} height={36} />
    </div>
  );
}

function formatScheduleDate(dateValue: string | null | undefined) {
  if (!dateValue) return "N/A";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function mapTaskType(taskType: string | null | undefined): TaskType {
  const normalized = taskType?.toLowerCase() ?? "";
  if (normalized === "vitals") return "vitals";
  if (normalized === "nursing_note") return "nursing_note";
  if (normalized === "medicine" || normalized === "medication") return "medication";
  return "nursing_note";
}

/** Parse "2:56 pm" / "14:30" into hour 0-23 */
function parseHourFromTime(time: string | null | undefined): number | null {
  if (!time?.trim()) return null;

  console.log("dsgssd",time)

  const trimmed = time.trim().toLowerCase();
  const match12h = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12h) {
    let hour = Number(match12h[1]);
    const meridiem = match12h[3].toLowerCase();
    if (Number.isNaN(hour) || hour < 1 || hour > 12) return null;
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return hour;
  }

  const match24h = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) {
    const hour = Number(match24h[1]);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
    return hour;
  }

  return null;
}



function formatHourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? "pm" : "am";
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayHour} ${suffix}`;
}

function formatSlotLabel(hour: number) {
  return `${String(((hour % 24) + 24) % 24).padStart(2, "0")}:00`;
}

function formatHourRange(hour: number) {
  return `${formatHourLabel(hour)} to ${formatHourLabel(hour + 1)}`;
}

/** Parse "2:56 pm" / "14:30" into { hour, minute } */
function parseTimeParts(time: string | null | undefined): { hour: number; minute: number } | null {
  if (!time?.trim()) return null;

  const trimmed = time.trim().toLowerCase();
  const match12h = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12h) {
    let hour = Number(match12h[1]);
    const minute = match12h[2] ? Number(match12h[2]) : 0;
    const meridiem = match12h[3].toLowerCase();
    if (Number.isNaN(hour) || hour < 1 || hour > 12) return null;
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return { hour, minute };
  }

  const match24h = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) {
    const hour = Number(match24h[1]);
    const minute = Number(match24h[2]);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
    return { hour, minute };
  }

  return null;
}

function formatTimeLabel(hour: number, minute: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? "pm" : "am";
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatItemTimeRange(item: StaffNurseHistoryItem) {
  const parts = parseTimeParts(item.time);
  if (!parts) return "N/A";
  // return `${formatTimeLabel(parts.hour, parts.minute)} to ${formatTimeLabel(parts.hour + 1, parts.minute)}`;
    return `${formatTimeLabel(parts.hour, parts.minute)}`;
}

function getPatientDisplayName(item: StaffNurseHistoryItem) {
  return [item.patientTitle, item.patientName].filter(Boolean).join(" ") || "N/A";
}

function buildHourSlots(history: StaffNurseHistoryItem[]): HourSlotGroup[] {
  const grouped = new Map<number, StaffNurseHistoryItem[]>();

  history.forEach((item) => {
    const hour = parseHourFromTime(item.time);
    if (hour == null) return;
    const existing = grouped.get(hour) ?? [];
    existing.push(item);
    grouped.set(hour, existing);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, tasks]) => ({
      hour,
      slotLabels: [formatSlotLabel(hour), formatSlotLabel(hour + 1)],
      rangeLabel: formatHourRange(hour),
      tasks: [...tasks].sort((a, b) => {
        const aDate = new Date(a.dateTime).getTime();
        const bDate = new Date(b.dateTime).getTime();
        return aDate - bDate;
      }),
    }));
}

function TaskCard({ item, rangeLabel }: { item: StaffNurseHistoryItem; rangeLabel: string }) {
  const type = mapTaskType(item.taskType);
  const meta = TASK_TYPE_META[type];
  const patientName = getPatientDisplayName(item);
  const bedLabel = item.bedNumber?.trim() || "N/A";
  const roomLabel = item.roomNumber?.trim();

  return (
    <article
      className={`min-w-[260px] max-w-[300px] shrink-0 rounded-[14px] border border-[#EDF3EA] border-l-4 px-4 py-3 ${meta.borderClass} ${meta.bgClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Tooltip
            position="top"
            content={<span className="max-w-xs whitespace-normal break-words">{patientName}</span>}
          >
            <p className="truncate text-sm font-semibold text-[#262D3B]">{patientName}</p>
          </Tooltip>
          <Tooltip
            position="top"
            content={
              <span className="max-w-xs whitespace-normal break-words">
                {`Bed No. ${bedLabel} • ${item.taskTitle || "N/A"}`}
              </span>
            }
          >
            <p className="mt-1 truncate text-xs text-[#7B8089]">
              Bed No. {bedLabel} • {item.taskTitle || "N/A"}
            </p>
          </Tooltip>
        </div>
        <p className="shrink-0 text-xs font-medium whitespace-nowrap text-[#434956]">{rangeLabel}</p>
      </div>

      {roomLabel || item.medicineName || item.remark || item?.taskTitle ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {roomLabel ? (
            <span className="inline-flex rounded-full border border-[#0B8C0033] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B8C00]">
              Room No. {roomLabel}
            </span>
          ) : null}

          

 {item?.taskTitle ? (
            <span className="inline-flex rounded-full border border-[#0B8C0033] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B8C00]">
             {item?.taskTitle}
            </span>
          ) : null}

          {item.medicineName ? (
            <span className="inline-flex rounded-full border border-[#EA580C33] bg-white px-2.5 py-1 text-[11px] font-medium text-[#EA580C]">
              {item.medicineName}
            </span>
          ) : null}
          {item.remark ? (
            <span className="inline-flex max-w-full truncate rounded-full border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#64748B]">
              {item.remark}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function NurseHistoryPage() {
  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useIPDNurseResolvedBranchId();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDatePickerOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!datePickerContainerRef.current?.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDatePickerOpen]);

  const {
    data: historyRes,
    isLoading: isHistoryLoading,
  } = useGetStaffNurseHistoryQuery(
    { branchId: resolvedFilterBranchId!, date: selectedDate },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  const summary = historyRes?.data?.summary;
  const historyItems = historyRes?.data?.history ?? [];
  const scheduleDate = historyRes?.data?.date;

  const summaryCards = useMemo(() => {
    const getValue = (count: number | undefined) => {
      if (summary) return String(count ?? 0);
      return isHistoryLoading ? "..." : "0";
    };

    return SUMMARY_CARD_CONFIG.map((card) => {
      let value = "0";
      if (card.id === "total-patients") value = getValue(summary?.totalPatients);
      else if (card.id === "pending-tasks") value = getValue(summary?.pendingTasks);
      else if (card.id === "completed") value = getValue(summary?.completedTasks);
      return { ...card, value };
    });
  }, [summary, isHistoryLoading]);

  const hourSlots = useMemo(() => buildHourSlots(historyItems), [historyItems]);
  const isPageLoading = resolvedFilterBranchId == null || isHistoryLoading;

  // console.log("historyItems",historyItems)
  console.log("hourSlotsdgyfte",hourSlots)

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#262D3B]">Schedule Overview</p>
            <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#262D3B] md:text-[26px]">
              {formatScheduleDate(scheduleDate ?? selectedDate)}
            </h1>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            <div className="w-full sm:w-[220px]">
              <FormSelectField
                label="Branch"
                hideLabel
                options={hookBranchFilterOptions}
                value={selectedBranch}
                onChange={(value) => {
                  setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                }}
                placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                mode="single"
                width="100%"
                height={44}
                disabled={isBranchFilterDisabled || isLoadingBranchFilter}
              />
            </div>

                  <DatePicker
                    value={selectedDate}
                    onChange={(value) => {
                      setSelectedDate(value);
                      setIsDatePickerOpen(false);
                    }}
                    // background="white"
                    width={220}
                  />

            <div className="relative" ref={datePickerContainerRef}>
              {/* <button
                type="button"
                onClick={() => setIsDatePickerOpen((prev) => !prev)}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] px-5 text-sm font-medium text-[#9A7909] transition-colors"
              >
                <Image src="/icons/darkBrowncalander.svg" alt="" width={18} height={18} />
                View Month
              </button> */}

              {/* {isDatePickerOpen ? ( */}
                {/* <div className="absolute right-0 z-20 mt-2 rounded-[16px] border border-[#E3EEE1] bg-white p-3 shadow-[0px_20px_40px_rgba(34,56,43,0.12)]"> */}
                  {/* <DatePicker
                    value={selectedDate}
                    onChange={(value) => {
                      setSelectedDate(value);
                      setIsDatePickerOpen(false);
                    }}
                    background="white"
                    width={220}
                  /> */}

                    {/* <DatePicker
                                  value={selectedDate}
                                 onChange={(value) => {
                      setSelectedDate(value);
                      setIsDatePickerOpen(false);
                    }}
                                  placeholder="Choose date"
                                  width="100%"
                                /> */}
                {/* </div> */}
              {/* ) : null} */}
            </div>

            {/* <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] px-5 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
            >
              <Image src="/icons/AddIcon.svg" alt="" width={18} height={18} />
              New Task
            </button> */}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <SummaryCard
              key={card.id}
              label={card.title}
              value={card.value}
              iconSrc={card.iconSrc}
            />
          ))}
        </div>

        <section className="rounded-[20px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)] sm:px-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-[#262D3B]">Hourly Roster</h2>

            <div className="flex flex-wrap items-center gap-4">
              {(Object.keys(TASK_TYPE_META) as TaskType[]).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${TASK_TYPE_META[type].dotClass}`} />
                  <span className="text-xs font-medium text-[#434956]">
                    {TASK_TYPE_META[type].label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isPageLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9CA3AF]">
              <SpinnerLoader size={18} />
              Loading nurse history...
            </div>
          ) : hourSlots.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#9CA3AF]">No history found.</p>
          ) : (
            // <div className="space-y-0">
            //   {hourSlots.map((slot, index) => (
            //     <div
            //       key={slot.hour}
            //       className={`grid grid-cols-[64px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[80px_minmax(0,1fr)] sm:gap-6 ${
            //         index < hourSlots.length - 1 ? "border-b border-[#EDF3EA]" : ""
            //       }`}
            //     >
            //       <div className="flex flex-col gap-3">
            //         {slot.slotLabels.map((label) => (
            //           <div key={label} className="h-fit rounded-[12px] bg-[#F2F9F2] px-3 py-2">
            //             <p className="text-sm font-semibold text-[#262D3B]">{label}</p>
            //           </div>
            //         ))}
            //       </div>


            //       <div className="min-w-0 overflow-x-auto pb-1">
            //         <div className="flex w-max min-w-full gap-3">
            //           {slot.tasks.map((task, taskIndex) => (
            //             <TaskCard
            //               key={`${task.patientId}-${task.dateTime}-${taskIndex}`}
            //               item={task}
            //               rangeLabel={formatItemTimeRange(task)}
            //             />
            //           ))}
            //         </div>
            //       </div>
            //     </div>
            //   ))}
            // </div>
            <div className="space-y-0">
              {hourSlots.map((slot, index) => (
                <div
                  key={slot.hour}
                  className={`grid grid-cols-[80px_minmax(0,1fr)] ${
                    index < hourSlots.length - 1 ? "border-b border-[#EDF3EA]" : ""
                  }`}
                >
                  {/* Left Sidebar */}
                  <div className="border-r border-[#E3EEE1] bg-[#F2F9F2]">
                    {slot.slotLabels.map((label) => (
                      <div
                        key={label}
                        className="flex h-16 items-center justify-center border-b border-[#E3EEE1] last:border-b-0"
                      >
                        <span className="text-sm font-medium text-[#4B5563]">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Right Content */}
                  <div className="overflow-x-auto py-4 pl-4 border-b border-[#EDF3EA] ">
                    <div className="flex min-w-max gap-3">
                      {slot.tasks.map((task, taskIndex) => (
                        <TaskCard
                          key={`${task.patientId}-${task.dateTime}-${taskIndex}`}
                          item={task}
                          rangeLabel={formatItemTimeRange(task)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
