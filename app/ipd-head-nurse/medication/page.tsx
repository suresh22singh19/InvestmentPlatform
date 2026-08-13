"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  DatePicker,
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
  Tabs,
  Tooltip,
} from "@/components/ui";
import {
  PatientMedicationScheduleTab,
  type MedicationSchedulePatient,
} from "@/components/ipd-head-nurse/medicationSchedule";
import { StatusPill, type StatusTone } from "@/components/ipd-head-nurse/shared";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGetMedicationDashboardSummaryQuery,
  useGetPatientMedicationListQuery,
  type PatientMedicationListPatient,
} from "@/store/api/ipdHeadNurseAPI";

type DoseStatusFilter = "all" | "pending" | "administered" | "overdue" | "held";
type WardFilter = "all" | "ipd" | "day-care";

type ShiftSlotCode = "M" | "A" | "E" | "N";

const PAGINATION_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

const STATUS_FILTERS: Array<{ id: DoseStatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "administered", label: "Administered" },
  { id: "overdue", label: "Overdue" },
  { id: "held", label: "Hold" },
];

const WARD_FILTERS: Array<{ id: WardFilter; label: string }> = [
  { id: "all", label: "All Wards" },
  { id: "ipd", label: "IPD" },
  { id: "day-care", label: "Day Care" },
];

const SHIFT_SLOT_META: Record<
  ShiftSlotCode,
  { label: string; color: string; border: string; bg: string }
> = {
  M: { label: "M", color: "#0B8C00", border: "#0B8C0033", bg: "#F3FAF2" },
  A: { label: "A", color: "#2563EB", border: "#2563EB33", bg: "#EFF6FF" },
  E: { label: "E", color: "#CA8A04", border: "#CA8A0433", bg: "#FFFBEB" },
  N: { label: "N", color: "#7C3AED", border: "#7C3AED33", bg: "#F5F3FF" },
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShiftOverviewDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Today";

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function mapShiftToCode(shift: string): ShiftSlotCode | null {
  const normalized = shift.trim().toLowerCase();
  if (normalized === "morning") return "M";
  if (normalized === "afternoon") return "A";
  if (normalized === "evening") return "E";
  if (normalized === "night") return "N";
  return null;
}

function mapRowStatusTone(status: string): StatusTone {
  const normalized = status.trim().toLowerCase();
  if (normalized === "overdue") return "danger";
  if (normalized === "administered" || normalized === "completed") return "success";
  if (normalized === "hold" || normalized === "held") return "warning";
  return "neutral";
}

function formatGender(gender: string) {
  if (!gender?.trim()) return "N/A";
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

function formatCareType(patientType: string) {
  const normalized = patientType.trim().toLowerCase();
  if (normalized === "ipd") return "IPD";
  if (normalized.includes("day")) return "Day Care";
  return patientType || "N/A";
}

function mapPatientToSchedulePatient(
  patient: PatientMedicationListPatient
): MedicationSchedulePatient {
  return {
    patientId: patient.patientId,
    patientName: patient.patientName,
    patientUhid: patient.uhid,
    age: `${patient.age} years`,
    gender: formatGender(patient.gender),
    bedNumber: patient.bedNumber,
    diagnosis: patient.diagnosis || "N/A",
    admissionDate: "N/A",
    statusLabel: "STABLE",
  };
}

function mapFilterStatusToApi(
  filter: DoseStatusFilter
): "pending" | "administered" | "overdue" | "hold" | undefined {
  if (filter === "all") return undefined;
  if (filter === "held") return "hold";
  return filter;
}

function MedicationStatCard({
  label,
  value,
  iconSrc,
}: {
  label: string;
  value: number;
  iconSrc: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[16px] border border-[#E8EEE8] bg-white px-4 py-3 shadow-[0px_8px_20px_rgba(34,56,43,0.04)]">
      <div>
        <p className="text-sm font-medium text-[#525763]">{label}</p>
        <p className="mt-1 text-[28px] font-bold leading-none text-[#262D3B]">{value}</p>
      </div>
      <Image src={iconSrc} alt="" width={36} height={36} />
    </div>
  );
}

function TimeSlotBadge({ slot, administered }: { slot: ShiftSlotCode; administered: boolean }) {
  const meta = SHIFT_SLOT_META[slot];
  const tooltipLabel =
    slot === "M" ? "Morning" : slot === "A" ? "Afternoon" : slot === "E" ? "Evening" : "Night";

  return (
    <Tooltip content={tooltipLabel} position="top" delay={0}>
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] border text-[11px] font-semibold"
        style={
          administered
            ? { color: meta.color, borderColor: meta.border, backgroundColor: meta.bg }
            : { color: "#9CA3AF", borderColor: "#E5E7EB", backgroundColor: "#F8FAFC" }
        }
      >
        {meta.label}
      </span>
    </Tooltip>
  );
}

function MetaPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "ipd" | "day-care";
}) {
  const toneClass =
    tone === "ipd"
      ? "border-[#0B8C0033] bg-[#F2F9F2] text-[#0B8C00]"
      : tone === "day-care"
        ? "border-[#14B8A633] bg-[#F0FDFA] text-[#0F766E]"
        : "border-[#D5DED5] bg-white text-[#525763]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${toneClass}`}
    >
      {label}
    </span>
  );
}

export default function IPDHeadNurseMedicationPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DoseStatusFilter>("all");
  const [wardFilter, setWardFilter] = useState<WardFilter>("all");
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [expandedPatients, setExpandedPatients] = useState<Record<number, boolean>>({});
  const [selectedPatient, setSelectedPatient] = useState<MedicationSchedulePatient | null>(null);
  const [selectedMedicinePrescribeId, setSelectedMedicinePrescribeId] = useState<number | null>(
    null
  );
  const debouncedSearch = useDebounce(searchTerm, 500);

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
  }, [debouncedSearch, statusFilter, wardFilter, selectedDate, selectedBranch, resolvedFilterBranchId]);

  const summaryParams =
    resolvedFilterBranchId == null
      ? null
      : { branchId: resolvedFilterBranchId, date: selectedDate };

  const listParams =
    resolvedFilterBranchId == null
      ? null
      : {
          branchId: resolvedFilterBranchId,
          date: selectedDate,
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch.trim() || undefined,
          filterStatus: mapFilterStatusToApi(statusFilter),
        };

  const {
    data: summaryRes,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
  } = useGetMedicationDashboardSummaryQuery(summaryParams!, {
    skip: summaryParams == null,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: listRes,
    isLoading: isListLoading,
    isFetching: isListFetching,
  } = useGetPatientMedicationListQuery(listParams!, {
    skip: listParams == null,
    refetchOnMountOrArgChange: true,
  });

  const summary = summaryRes?.data;
  const patients = listRes?.data ?? [];
  const totalItems = listRes?.total ?? 0;
  const isTableLoading = resolvedFilterBranchId == null || isListLoading || isListFetching;

  const statCards = useMemo(
    () => [
      {
        id: "total",
        label: "Total Patients",
        value: summary?.totalPatients ?? 0,
        iconSrc: "/icons/DarkThreePaients.svg",
      },
      {
        id: "ipd",
        label: "IPD",
        value: summary?.ipdCount ?? 0,
        iconSrc: "/icons/bedDarkIcon.svg",
      },
      {
        id: "doses-due",
        label: "Doses Due",
        value: summary?.dosesDue ?? 0,
        iconSrc: "/icons/time.svg",
      },
      {
        id: "overdue",
        label: "Overdue",
        value: summary?.overdue ?? 0,
        iconSrc: "/icons/Overdue.svg",
      },
      {
        id: "administered",
        label: "Administered",
        value: summary?.administered ?? 0,
        iconSrc: "/icons/Administered.svg",
      },
    ],
    [summary]
  );

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const careType = formatCareType(patient.patientType);
      if (wardFilter === "ipd" && careType !== "IPD") return false;
      if (wardFilter === "day-care" && careType !== "Day Care") return false;
      return true;
    });
  }, [patients, wardFilter]);

  useEffect(() => {
    if (filteredPatients.length === 0) return;

    setExpandedPatients((prev) => {
      const next = { ...prev };
      filteredPatients.forEach((patient, index) => {
        if (next[patient.patientId] === undefined) {
          next[patient.patientId] = false;
        }
      });
      return next;
    });
  }, [filteredPatients]);

  const togglePatientAccordion = (patientId: number) => {
    setExpandedPatients((prev) => ({
      ...prev,
      [patientId]: !prev[patientId],
    }));
  };

  if (selectedPatient) {
    return (
      <AppShell>
        <PatientMedicationScheduleTab
          patient={selectedPatient}
          patientId={selectedPatient.patientId}
          patientMedicinePrescribeId={selectedMedicinePrescribeId ?? undefined}
          initialDate={selectedDate}
          onBack={() => {
            setSelectedPatient(null);
            setSelectedMedicinePrescribeId(null);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
              Medication Dashboard
            </h1>
            <p className="mt-1 text-sm font-medium text-[#525763]">
              IPD Head Nurse • Shift overview • {formatShiftOverviewDate(selectedDate)}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
            <div className="w-full sm:w-[220px]">
              <FormSelectField
                label=""
                hideLabel
                options={hookBranchFilterOptions}
                value={selectedBranch}
                onChange={(value) => {
                  setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                }}
                placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                mode="single"
                // background="white"
                width="100%"
                disabled={isBranchFilterDisabled || isLoadingBranchFilter}
              />
            </div>
            {/* <div className="w-full sm:w-[180px]"> */}
              {/* <DatePicker
                label=""
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Select date"
                // background="white"
                width="100%"
                disablePastDates={false}
              /> */}
            {/* </div> */}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((card) => (
            <MedicationStatCard
              key={card.id}
              label={card.label}
              value={
                isSummaryLoading || isSummaryFetching ? 0 : card.value
              }
              iconSrc={card.iconSrc}
            />
          ))}
        </div>

        <section className="space-y-4 rounded-[10px] bg-white p-[18px]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            {/* <div className="w-full max-w-[380px]">
              <Tabs
                options={WARD_FILTERS.map((tab) => ({
                  label: tab.label,
                  value: tab.id,
                }))}
                value={wardFilter}
                onChange={(value) => setWardFilter(value as WardFilter)}
              />
            </div> */}

                <div className="w-full max-w-[380px]">
              {/* <Tabs
                options={WARD_FILTERS.map((tab) => ({
                  label: tab.label,
                  value: tab.id,
                }))}
                value={wardFilter}
                onChange={(value) => setWardFilter(value as WardFilter)}
              /> */}
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-[860px] lg:flex-1">
              <div className="w-full min-w-0 sm:flex-1">
                <Tabs
                  options={STATUS_FILTERS.map((tab) => ({
                    label: tab.label,
                    value: tab.id,
                  }))}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as DoseStatusFilter)}
                />
              </div>
              <div className="w-full shrink-0 sm:w-[220px] lg:w-[240px]">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {isTableLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-[16px] border border-[#E5E9E5] bg-white px-6 py-12 text-sm text-[#9CA3AF]">
                <SpinnerLoader size={18} />
                Loading medication...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="rounded-[16px] border border-[#E5E9E5] bg-white px-6 py-12 text-center text-sm text-[#9CA3AF]">
                No medication found.
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const careType = formatCareType(patient.patientType);
                const wardBed = `${patient.roomNumber} / ${patient.bedNumber}`;
                const isExpanded = expandedPatients[patient.patientId] ?? false;

                return (
                  <article
                    key={patient.patientId}
                    className="overflow-hidden rounded-[16px] border border-[#E5E9E5] bg-white"
                  >
                    <button
                      type="button"
                      className="flex w-full flex-col gap-3 px-5 pb-3 pt-4 text-left sm:flex-row sm:items-start sm:justify-between cursor-pointer"
                      onClick={() => togglePatientAccordion(patient.patientId)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Image
                            src="/icons/ArrowDown.svg"
                            alt=""
                            width={14}
                            height={14}
                            className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                          <h3 className="text-[15px] font-semibold text-[#262D3B]">
                            {/* {patient.patientName} */}
                            {`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                          </h3>
                        </div>
                        <p className="mt-1 pl-5 text-[13px] leading-5 text-[#6B7280]">
                          {patient.uhid} • {patient.age}/{formatGender(patient.gender).charAt(0)} •{" "}
                          {patient.diagnosis || "N/A"} • {patient.doctorName || "N/A"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <MetaPill label={wardBed} />
                        <MetaPill
                          label={careType}
                          tone={careType === "IPD" ? "ipd" : "day-care"}
                        />
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="px-3 pb-3 sm:px-4">
                        <Table
                          className={
                            (patient.medications ?? []).length > 5
                              ? "max-h-[276px]"
                              : ""
                          }
                        >
                          <TableHeader>
                            <TableRow className="bg-white">
                              <TableHead position="first">Sr no.</TableHead>
                              {/* <TableHead sortable>Medication</TableHead> */}
                              <TableHead>Medication Name</TableHead>
                              <TableHead>Dosage</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead>Time</TableHead>
                              {/* <TableHead>Status</TableHead> */}
                              <TableHead position="last">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(patient.medications ?? []).length === 0 ? (
                              <TableRow className="bg-white">
                                <TableData
                                  colSpan={7}
                                  className="text-center text-sm text-[#9CA3AF]"
                                >
                                  No medicine found.
                                </TableData>
                              </TableRow>
                            ) : (
                              patient.medications.map((med, index) => (
                                <TableRow
                                  key={med.id}
                                  className="bg-white transition-colors"
                                >
                                  <TableData variant="primary">{index + 1}</TableData>
                                  <TableData>{med.medicineName}</TableData>
                                  <TableData>
                                    {med.dosageAmount} {med.dosageUnit}
                                  </TableData>
                                  <TableData>{med.frequency}</TableData>
                                  <TableData>
                                    <div className="flex items-center gap-1.5">
                                      {med.timeSlots.map((slot) => {
                                        const code = mapShiftToCode(slot.shift);
                                        if (!code) return null;

                                        return (
                                          <TimeSlotBadge
                                            key={`${med.id}-${slot.shift}`}
                                            slot={code}
                                            administered={slot.administered === true}
                                          />
                                        );
                                      })}
                                    </div>
                                  </TableData>
                                  {/* <TableData>
                                    <StatusPill
                                      label={med.rowStatus}
                                      tone={mapRowStatusTone(med.rowStatus)}
                                    />
                                  </TableData> */}
                                  <TableData>
                                    <Tooltip content="View" position="top" delay={0}>
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                        aria-label={`View ${patient.patientName} medication schedule`}
                                        onClick={() => {
                                          setSelectedPatient(mapPatientToSchedulePatient(patient));
                                          setSelectedMedicinePrescribeId(med.id);
                                        }}
                                      >
                                        <Image
                                          src="/icons/ViewEyeIcon.svg"
                                          alt="View"
                                          width={18}
                                          height={18}
                                        />
                                      </button>
                                    </Tooltip>
                                  </TableData>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>

          {totalItems > 0 ? (
            <div className="pt-2">
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
