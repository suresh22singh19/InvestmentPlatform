"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
import { PatientTherapiesTab } from "@/components/ipd-staff-nurse/therapies";
import type { AssignedPatientDetail } from "@/components/ipd-staff-nurse/AssignedPatientView";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useStaffNurseGetPatientTherapyScheduleListQuery,
  type PatientTherapyScheduleListPatient,
  type PatientTherapyScheduleListTherapy,
} from "@/store/api/ipdStaffNurseAPI";

const PAGINATION_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

function formatGender(gender: string) {
  if (!gender?.trim()) return "N/A";
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

function formatCareType(patientType: string) {
  const normalized = patientType?.trim().toLowerCase();
  if (normalized === "ipd") return "IPD";
  if (normalized?.includes("day")) return "Day Care";
  return patientType || "N/A";
}

function mapTherapyStatusTone(status: string): StatusTone {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "cancelled") return "danger";
  if (normalized === "scheduled") return "neutral";
  if (normalized?.includes("reschedule") || normalized?.includes("progress")) return "warning";
  return "neutral";
}

function formatTherapyStatusLabel(status: string) {
  if (!status?.trim()) return "N/A";
  return status
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTherapyTime(therapy: PatientTherapyScheduleListTherapy) {
  const formatPart = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return value;

    let hours = Number.parseInt(match[1], 10);
    const minutes = match[2];
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours %= 12;
    if (hours === 0) hours = 12;

    return `${hours}:${minutes} ${meridiem}`;
  };

  if (therapy.timeSlot && therapy.endTime) {
    return `${formatPart(therapy.timeSlot)} - ${formatPart(therapy.endTime)}`;
  }
  if (therapy.timeSlot) return formatPart(therapy.timeSlot);
  if (therapy.endTime) return formatPart(therapy.endTime);
  return "N/A";
}

function mapPatientToAssignedPatientDetail(
  patient: PatientTherapyScheduleListPatient
): AssignedPatientDetail {
  const firstTherapy = patient.therapies?.[0];

  return {
    id: patient.patientId,
    patientTitle: patient.patientTitle ?? "",
    patientName: patient.patientName,
    patientUhid: patient.uhid,
    age: patient.age,
    gender: formatGender(patient.gender),
    bedNumber: "N/A",
    roomNumber: firstTherapy?.roomNumber ?? "N/A",
    admissionDate: "N/A",
    treatingDoctor: "N/A",
    diagnosis: "N/A",
    patientType: patient.patientType,
  };
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

export default function IPDStaffNurseTherapiesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [expandedPatients, setExpandedPatients] = useState<Record<number, boolean>>({});
  const [selectedPatient, setSelectedPatient] = useState<AssignedPatientDetail | null>(null);
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
  }, [debouncedSearch, selectedBranch, resolvedFilterBranchId]);

  const listParams =
    resolvedFilterBranchId == null
      ? null
      : {
          branchId: resolvedFilterBranchId,
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch.trim() || undefined,
        };

  const {
    data: listRes,
    isLoading: isListLoading,
    isFetching: isListFetching,
  } = useStaffNurseGetPatientTherapyScheduleListQuery(listParams!, {
    skip: listParams == null,
    refetchOnMountOrArgChange: true,
  });

  const patients = listRes?.data ?? [];
  const totalItems = listRes?.total ?? 0;
  const isTableLoading = resolvedFilterBranchId == null || isListLoading || isListFetching;

  useEffect(() => {
    if (patients.length === 0) return;

    setExpandedPatients((prev) => {
      const next = { ...prev };
      patients.forEach((patient) => {
        if (next[patient.patientId] === undefined) {
          next[patient.patientId] = false;
        }
      });
      return next;
    });
  }, [patients]);

  const togglePatientAccordion = (patientId: number) => {
    setExpandedPatients((prev) => ({
      ...prev,
      [patientId]: !prev[patientId],
    }));
  };

  if (selectedPatient) {
    return (
      <AppShell>
        <PatientTherapiesTab patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
              Therapy
            </h1>
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
                width="100%"
                disabled={isBranchFilterDisabled || isLoadingBranchFilter}
              />
            </div>
          </div>
        </div>

        <section className="space-y-4 rounded-[10px] bg-white p-[18px]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="w-full shrink-0 sm:w-[260px]">
              <TableSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search Here..."
              />
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {isTableLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-[16px] border border-[#E5E9E5] bg-white px-6 py-12 text-sm text-[#9CA3AF]">
                <SpinnerLoader size={18} />
                Loading therapies...
              </div>
            ) : patients.length === 0 ? (
              <div className="rounded-[16px] border border-[#E5E9E5] bg-white px-6 py-12 text-center text-sm text-[#9CA3AF]">
                No therapies found.
              </div>
            ) : (
              patients.map((patient) => {
                const careType = formatCareType(patient.patientType);
                const isExpanded = expandedPatients[patient.patientId] ?? false;
                const therapies = patient.therapies ?? [];

                return (
                  <article
                    key={patient.patientId}
                    className="overflow-hidden rounded-[16px] border border-[#E5E9E5] bg-white"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex w-full flex-col gap-3 px-5 pb-3 pt-4 text-left sm:flex-row sm:items-start sm:justify-between cursor-pointer"
                      onClick={() => togglePatientAccordion(patient.patientId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          togglePatientAccordion(patient.patientId);
                        }
                      }}
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
                            {`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                          </h3>
                        </div>
                        <p className="mt-0 pl-5 text-[13px] leading-5 text-[#6B7280]">
                          {patient.uhid} • {patient.age}/{formatGender(patient.gender).charAt(0)}
                          {/* {patient.totalCount} {Number(patient.totalCount) === 1 ? "Therapy" : "Therapies"} */}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        {/* <MetaPill
                          label={careType}
                          tone={careType === "IPD" ? "ipd" : "day-care"}
                        /> */}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#0B8C00] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#097300] cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedPatient(mapPatientToAssignedPatientDetail(patient));
                          }}
                        >
                          View Therapies
                          {/* <Image
                            src="/icons/rightArrow.svg"
                            alt=""
                            width={12}
                            height={12}
                            className="shrink-0 brightness-0 invert"
                          /> */}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="px-3 pb-3 sm:px-4">
                        <Table className={therapies.length > 5 ? "max-h-[276px]" : ""}>
                          <TableHeader>
                            <TableRow className="bg-white">
                              <TableHead position="first">Sr no.</TableHead>
                              <TableHead>Therapy Name</TableHead>
                              <TableHead>Therapist Name</TableHead>
                              <TableHead>Room</TableHead>
                              <TableHead>Time Slot</TableHead>
                              {/* <TableHead position="last">Status</TableHead> */}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {therapies.length === 0 ? (
                              <TableRow className="bg-white">
                                <TableData colSpan={6} className="text-center text-sm text-[#9CA3AF]">
                                  No therapy found.
                                </TableData>
                              </TableRow>
                            ) : (
                              therapies.map((therapy, index) => (
                                <TableRow key={therapy.sessionId} className="bg-white transition-colors">
                                  <TableData variant="primary">{index + 1}</TableData>
                                  {/* <TableData>{therapy.therapyName || "N/A"}</TableData> */}

                                     <TableData>
                                        <div className="min-w-[160px]">
                                        <p className="font-medium text-[#262D3B]">
                                        <TruncatedTableCell
                                        key={`patient-list-${index+1}`}
                                        text={`${therapy.therapyName || "N/A"}`}
                                        />
                                        </p>
                                        <p className="mt-0.5 text-xs text-[#262D3B]">{patient.uhid}</p>
                                        </div>
                                     </TableData>

                                  <TableData>{therapy.therapistName || "N/A"}</TableData>
                                  <TableData>{therapy.roomNumber || "N/A"}</TableData>
                                  <TableData>{formatTherapyTime(therapy)}</TableData>
                                  {/* <TableData>
                                    <StatusPill
                                      label={formatTherapyStatusLabel(therapy.status)}
                                      tone={mapTherapyStatusTone(therapy.status)}
                                    />
                                  </TableData> */}
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
