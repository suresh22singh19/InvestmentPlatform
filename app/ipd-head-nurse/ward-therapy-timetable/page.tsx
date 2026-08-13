"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  FormSelectField,
  Pagination,
  SpinnerLoader,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
  Tooltip,
} from "@/components/ui";
import { StatusPill, type StatusTone } from "@/components/ipd-head-nurse/shared";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGetPatientTherapyScheduleQuery,
  useGetTherapistsListQuery,
  useGetTherapyScheduleSummaryQuery,
  type PatientTherapyScheduleItem,
} from "@/store/api/ipdHeadNurseAPI";

const PAGINATION_OPTIONS = [6, 10, 20, 50];
const COLUMN_COUNT = 7;

const THERAPY_CATEGORY_OPTIONS = [
  { label: "All Therapy Type", value: "all" },
  { label: "Panchkarma", value: "panchkarma" },
  { label: "Naturopathy", value: "naturopathy" },
];

function formatTherapyDate(dateValue: string | null | undefined) {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseTimeToMinutes(timeValue: string | null | undefined): number | null {
  if (!timeValue?.trim()) return null;

  const trimmed = timeValue.trim();

  if (trimmed.includes("T")) {
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date.getHours() * 60 + date.getMinutes();
    }
  }

  const [hoursPart, minutesPart] = trimmed.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

function formatDurationFromMinutes(totalMinutes: number) {
  if (totalMinutes <= 0) return "N/A";
  if (totalMinutes < 60) return `${totalMinutes} mins`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;

  return `${hours} hr${hours > 1 ? "s" : ""} ${minutes} mins`;
}

function calculateTherapyDuration(
  startTime: string | null | undefined,
  endTime: string | null | undefined
) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes == null || endMinutes == null) return "N/A";

  const diffMinutes = endMinutes - startMinutes;
  if (diffMinutes <= 0) return "N/A";

  return formatDurationFromMinutes(diffMinutes);
}

function getTherapySessionDuration(session: PatientTherapyScheduleItem) {
  const isCompleted = session.status?.trim().toLowerCase() === "completed";

  if (isCompleted) {
    return calculateTherapyDuration(session.actualStartTime, session.actualEndTime);
  }

  return calculateTherapyDuration(session.scheduledStartTime, session.scheduledEndTime);
}

function formatTherapyStatusLabel(status: string | null | undefined) {
  if (!status?.trim()) return "N/A";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function mapTherapyStatusTone(status: string | null | undefined): StatusTone {
  const normalized = status?.toLowerCase() ?? "";
  if (["completed", "complete", "done"].includes(normalized)) return "success";
  if (["pending", "scheduled", "upcoming"].includes(normalized)) return "warning";
  if (["missed", "refused", "overdue", "cancelled", "canceled"].includes(normalized)) {
    return "danger";
  }
  return "neutral";
}

function TherapyStatCard({
  label,
  value,
  iconSrc,
  subtext,
  showProgress,
  progressValue,
}: {
  label: string;
  value: string | number;
  iconSrc: string;
  subtext?: string;
  showProgress?: boolean;
  progressValue?: number;
}) {
  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-5 py-4 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#434956]">{label}</p>
          <h4 className="mt-2 text-[32px] font-bold leading-none text-[#262D3B]">{value}</h4>

          {/* {showProgress ? (
            <div className="mt-3 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-[#E8F3E6]">
              <div
                className="h-full rounded-full bg-[#0B8C00]"
                style={{ width: `${Math.min(Math.max(progressValue ?? 0, 0), 100)}%` }}
              />
            </div>
          ) : null} */}

          {subtext ? <p className="mt-2 text-xs text-[#9FA2AB]">{subtext}</p> : null}
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
          <Image src={iconSrc} alt="" width={28} height={28} />
        </div>
      </div>
    </div>
  );
}

const TRUNCATED_TABLE_CELL_WIDTH = 150;
function TruncatedTableCell({ text }: { text: string }) {
  const value = text?.trim() ? text.trim() : "N/A";
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return (
    <Tooltip
      position="top"
      maxWidth={360}
      disabled={!isTruncated}
      className="!overflow-visible !py-2.5"
      content={
        <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
          {value}
        </p>
      }
    >
      <div
        className="flex min-w-0 items-center"
        style={{ width: TRUNCATED_TABLE_CELL_WIDTH, maxWidth: TRUNCATED_TABLE_CELL_WIDTH }}
      >
        <span
          ref={textRef}
          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
        >
          {value}
        </span>
        {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
      </div>
    </Tooltip>
  );
}


export default function WardTherapyTimetablePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [therapyCategoryFilter, setTherapyCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [sortBy, setSortBy] = useState("patientName");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useIPDNurseResolvedBranchId();

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    selectedBranch,
    resolvedFilterBranchId,
    therapistFilter,
    therapyCategoryFilter,
  ]);

  const { data: therapistsRes, isLoading: isTherapistsLoading } = useGetTherapistsListQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  const therapistOptions = useMemo(
    () => [
      { label: "All Therapist", value: "all" },
      ...(therapistsRes?.data ?? []).map((therapist) => ({
        label: therapist.userName,
        value: String(therapist.id),
      })),
    ],
    [therapistsRes?.data]
  );

  const therapyScheduleParams =
    resolvedFilterBranchId == null
      ? null
      : {
          branchId: resolvedFilterBranchId,
          search: debouncedSearch.trim() || undefined,
          page: currentPage,
          limit: itemsPerPage,
          therapistId: therapistFilter !== "all" ? Number(therapistFilter) : undefined,
          therapyCategory:
            therapyCategoryFilter !== "all" ? therapyCategoryFilter : undefined,
          sortBy,
          order: sortOrder,
        };

  const {
    data: therapyScheduleRes,
    isLoading: isTherapyScheduleLoading,
  } = useGetPatientTherapyScheduleQuery(therapyScheduleParams!, {
    skip: therapyScheduleParams == null,
    refetchOnMountOrArgChange: true,
  });

  const { data: therapySummaryRes } = useGetTherapyScheduleSummaryQuery(
    { branchId: resolvedFilterBranchId! },
    {
      skip: resolvedFilterBranchId == null,
      refetchOnMountOrArgChange: true,
    }
  );

  const therapySessions = therapyScheduleRes?.data ?? [];
  const totalItems = therapyScheduleRes?.total ?? 0;
  const summary = therapySummaryRes?.data;
  const totalSessions = summary?.totalSessions ?? 0;
  const completedSessions = summary?.completedSessions ?? 0;
  const pendingSessions = summary?.pendingSessions ?? 0;
  const completedProgress =
    totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
            Ward Therapy Schedule
          </h1>
          <p className="mt-1 text-sm font-medium text-[#525763]">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TherapyStatCard
            label="Total Sessions"
            value={totalSessions}
            iconSrc="/icons/advanceCheck.svg"
          />
          <TherapyStatCard
            label="Completed"
            value={completedSessions}
            iconSrc="/icons/thickGreenCircleTick.svg"
            showProgress
            progressValue={completedProgress}
          />
          <TherapyStatCard
            label="Pending"
            value={pendingSessions}
            iconSrc="/icons/Hourglass.svg"
          />
        </div>

        <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* <h2 className="text-base font-medium text-[#262D3B]">Therapy Sessions</h2> */}
            <h2 className="text-base font-medium text-[#262D3B]">Filter</h2>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
             <div className="w-full sm:w-[280px] sm:shrink-0">
                <FormSelectField
                  label="Branch"
                  hideLabel
                  options={hookBranchFilterOptions}
                  value={selectedBranch}
                  onChange={(value) => {
                    setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                    setTherapistFilter("all");
                    setCurrentPage(1);
                  }}
                  placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                  mode="single"
                  background="normal"
                  width="100%"
                  height={44}
                  disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                />
              </div>

              <div className="w-full sm:w-[200px]">
                <FormSelectField
                  label="Therapist"
                  hideLabel
                  options={therapistOptions}
                  value={therapistFilter}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setTherapistFilter(next || "all");
                    setCurrentPage(1);
                  }}
                  placeholder={isTherapistsLoading ? "Loading therapists..." : "All Therapist"}
                  mode="single"
                  // background="white"
                  width="100%"
                  height={44}
                  disabled={isTherapistsLoading || resolvedFilterBranchId == null}
                />
              </div>

              <div className="w-full sm:w-[200px]">
                <FormSelectField
                  label="Therapy Type"
                  hideLabel
                  options={THERAPY_CATEGORY_OPTIONS}
                  value={therapyCategoryFilter}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setTherapyCategoryFilter(next || "all");
                    setCurrentPage(1);
                  }}
                  placeholder="All Therapy Type"
                  mode="single"
                  // background="white"
                  width="100%"
                  height={44}
                />
              </div>

              <div className="w-full sm:w-[240px]">
                <TableSearchInput
                  value={searchTerm}
                  onChange={(value) => {
                    setSearchTerm(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search Here..."
                />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead position="first">Sr no.</TableHead>
                <TableHead>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          setSortBy("patientName");
                          setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                          setCurrentPage(1);
                        }}
                      >
                        Patient Name
                        <Image src="/icons/SortByAscDes.svg" alt="Sort" width={12} height={12} />
                    </button>
                </TableHead>
                <TableHead>Therapy Name</TableHead>
                <TableHead>Assigned Therapist</TableHead>
                <TableHead>Therapy Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead position="last">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTherapyScheduleLoading ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading therapy sessions...
                    </div>
                  </TableData>
                </TableRow>
              ) : therapySessions.length === 0 ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
                    No therapy sessions found.
                  </TableData>
                </TableRow>
              ) : (
                therapySessions.map((session: PatientTherapyScheduleItem, index) => {
                  const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");

                  return (
                    <TableRow
                      key={session.sessionId}
                      className="bg-white transition-colors"
                    >
                      <TableData variant="primary">{srNo}</TableData>
                      <TableData>
                        {/* <div className="min-w-[160px]">
                          <p className="font-medium text-[#262D3B]">
                            {session.patientName || "N/A"}
                          </p>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{session.uhid || "N/A"}</p>
                        </div> */}


                          <div className="min-w-[160px]">
                          <div className="font-medium text-[#262D3B]">
                          <TruncatedTableCell
                          key={`patient-list-${session.sessionId ?? index}`}
                          text={`${session.patientTitle ? `${session.patientTitle} ` : ""}${session.patientName || "N/A"}`}
                           />
                          </div>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{session.uhid}</p>
                        </div>
                      </TableData>
                      {/* <TableData>{session.therapyName || "N/A"}</TableData> */}
                      <TableData>{
                          <TruncatedTableCell
                          key={`patient-list-${session.sessionId ?? index}`}
                          text={session.therapyName || "N/A"}
                           />
                        }</TableData>

                      <TableData>{session.therapistName || "N/A"}</TableData>
                      <TableData>{formatTherapyDate(session.therapyDate)}</TableData>
                      <TableData>{getTherapySessionDuration(session)}</TableData>
                      <TableData>
                        <StatusPill
                          label={formatTherapyStatusLabel(session.status)}
                          tone={mapTherapyStatusTone(session.status)}
                        />
                      </TableData>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {totalItems > 0 ? (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={PAGINATION_OPTIONS}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
              />
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
