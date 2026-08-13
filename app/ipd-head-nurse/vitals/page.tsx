"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
// import { keepPreviousData } from "@reduxjs/toolkit/query";
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
import { StatusPill } from "@/components/ipd-head-nurse/shared";
import {
  PatientVitalsTab,
  type VitalsDetailPatient,
} from "@/components/ipd-head-nurse/vitals";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGetPatientAssignToNurseListQuery,
  type AssignedPatientListItem,
} from "@/store/api/ipdHeadNurseAPI";

const PAGINATION_OPTIONS = [6, 10, 20, 50];
const COLUMN_COUNT = 7;

function mapAssignedPatientToVitalsPatient(patient: AssignedPatientListItem): VitalsDetailPatient {
  // const vitalsStatus = mapVitalsStatus(patient.lastVitalsDate);
    // const vitalsStatus = mapVitalsStatusCritical(patient.lastVitalsDate);

    // console.log("patientbdhdhs", patient?.patientCurrentConditionStatus);
  
  return {
    patientId: patient.id,
    patientTitle: patient.patientTitle,
    patientName: patient.patientName,
    patientUhid: patient.uhid,
    doctorName: patient.doctorName || "N/A",
    nurseName: patient.nurseName || "N/A",
    age: patient.age,
    gender: patient.gender,
    bedNumber: patient.bedNumber,
    diagnosis: patient.diagnosis || undefined,
    admissionDate: patient.admissionDate,
    // statusLabel: vitalsStatus.label,
    statusLabel: patient?.patientCurrentConditionStatus
  };
}

function mapVitalsStatus(lastVitalsDate: string | null) {
  if (!lastVitalsDate) {
    return { label: "Pending" as const, tone: "warning" as const };
  }
   return { label: "Completed" as const, tone: "success" as const };
}

function mapVitalsStatusCritical(lastVitalsDate: string | null) {
  return {
    label: "Critical" as const,
    tone: "warning" as const,
  };
}

function formatLastVitalsDate(lastVitalsDate: string | null) {
  if (!lastVitalsDate) return "N/A";

  return new Date(lastVitalsDate).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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

export default function IPDHeadNurseVitalsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState("patientName");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [selectedPatient, setSelectedPatient] = useState<VitalsDetailPatient | null>(null);
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
  }, [debouncedSearch, sortBy, sortOrder, selectedBranch, resolvedFilterBranchId]);

  const patientsParams = useMemo(() => {
    if (resolvedFilterBranchId == null) return null;

    return {
      branchId: resolvedFilterBranchId,
      search: debouncedSearch.trim() || undefined,
      sortBy,
      order: sortOrder,
      page: currentPage,
      limit: itemsPerPage,
    };
  }, [
    resolvedFilterBranchId,
    debouncedSearch,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
  ]);

  const {
    data: patientsRes,
    isLoading: isPatientsLoading,
  } = useGetPatientAssignToNurseListQuery(patientsParams!, {
    skip: patientsParams == null,
    refetchOnMountOrArgChange: true,
    // placeholderData: keepPreviousData,
  });

  const patients = patientsRes?.data ?? [];
  const totalItems = patientsRes?.total ?? 0;
  const isTableLoading = isPatientsLoading;

  if (selectedPatient) {
    return (
      <AppShell>
        <PatientVitalsTab
          patient={selectedPatient}
          patientId={selectedPatient.patientId}
          onBack={() => setSelectedPatient(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
          Vitals
        </h1>

        <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
            <div className="w-full sm:w-[280px] sm:shrink-0">
              <FormSelectField
                label=""
                hideLabel
                options={hookBranchFilterOptions}
                value={selectedBranch}
                onChange={(value) => {
                  setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                  setCurrentPage(1);
                }}
                placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                mode="single"
                background="normal"
                width="100%"
                disabled={isBranchFilterDisabled || isLoadingBranchFilter}
              />
            </div>
            <div className="w-full sm:w-[300px] sm:shrink-0">
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
                <TableHead>Doctor Name</TableHead>
                <TableHead>Nurse Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Recorded</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading vitals...
                    </div>
                  </TableData>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
                    No vitals found.
                  </TableData>
                </TableRow>
              ) : (
                patients.map((patient, index) => {
                  const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");
                  const vitalsStatus = mapVitalsStatus(patient.patientCurrentConditionStatus);
                   console.log("patient", patient);
                  return (
                    <TableRow key={patient.id} className="bg-white transition-colors">
                      <TableData variant="primary">{srNo}</TableData>
                      <TableData>
                        {/* <div className="min-w-[160px]">
                          <p className="font-medium text-[#262D3B]">{patient.patientName}</p>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{patient.uhid}</p>
                        </div> */}

                          <div className="min-w-[160px]">
                          {/* <p className="font-medium text-[#262D3B]">{patient.patientName}</p> */}
                             <p className="font-medium text-[#262D3B]">
                          <TruncatedTableCell
                          key={`patient-list-${patient.id ?? index}`}
                          // text={patient.patientName || "N/A"}
                          text={`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                           />
                          </p>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{patient.uhid}</p>
                        </div>
                      </TableData>
                      <TableData>
                        <span className="text-[#262D3B]">{patient.doctorName || "N/A"}</span>
                      </TableData>
                      <TableData>
                        <span className="text-[#262D3B]">{patient.nurseName || "N/A"}</span>
                      </TableData>
                      <TableData>
                        {/* <StatusPill label={vitalsStatus.label} tone={vitalsStatus.tone} /> */}

                        <span
                          className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
                            patient?.patientCurrentConditionStatus?.toLowerCase() === "stable"
                              ? "border-[#0B8C0033] text-[#0B8C00] bg-white"
                              : "border-[#93000A3D] text-[#93000A] bg-white"
                          }`}
                        >
                          {patient?.patientCurrentConditionStatus}
                        </span>

                        {/* patient.patientCurrentConditionStatus */}
                      </TableData>
                      <TableData>{formatLastVitalsDate(patient.lastVitalsDate)}</TableData>
                      <TableData>
                        <Tooltip content="View" position="top" delay={0}>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                          aria-label={`View ${patient.patientName}`}
                          onClick={() => setSelectedPatient(mapAssignedPatientToVitalsPatient(patient))}
                        >
                          <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
                        </button>
                        </Tooltip>
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
