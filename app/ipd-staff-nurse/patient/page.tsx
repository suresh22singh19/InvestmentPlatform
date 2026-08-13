"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  BackToPreviousPageButton,
  Badge,
  Button,
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
  ViewAppointment,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import { selectUserName } from "@/store/slices/authSlice";
import {
  NurseAllocationView,
  type NurseAllocationPatient,
} from "@/components/ipd-head-nurse/NurseAllocationView";
import {
  AssignedPatientView,
  type AssignedPatientDetail,
} from "@/components/ipd-staff-nurse/AssignedPatientView";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import {
  useGetPatientListQuery,
  useLazyStaffNurseGetOnePatientDetailQuery,
  type AssignedPatientListItem,
  type AdmittedPatientListItem,
} from "@/store/api/ipdStaffNurseAPI";

// ─── Stat card component ──────────────────────────────────────────────────────
type DashboardStatCardProps = {
  label: string;
  value: string | number;
  iconSrc: string;
  isActive?: boolean;
  onClick?: () => void;
};

type AssignedPatientStatus = "Critical" | "Stable" | "Observation";

type TaskItem = {
  id: number;
  title: string;
  dueLabel: string;
};

type PatientAlertItem = {
  id: number;
  title: string;
  description: string;
  timeAgo: string;
  tone: "danger" | "success";
  actionLabel: string;
  actionVariant: "outline" | "primary";
};

type TableFilters = {
  currentPage: number;
  itemsPerPage: number;
};

const PATIENT_LIST_COLUMN_COUNT = 8;
const ASSIGNED_PATIENT_COLUMN_COUNT = 9;
const PAGINATION_OPTIONS = [6, 10, 20, 50];


function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatAssignedPatientGender(gender: string) {
  if (!gender) return "N/A";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

function formatAssignedPatientAge(age: string) {
  if (!age) return "N/A";
  return age.toUpperCase().endsWith("Y") ? age : `${age}Y`;
}

function formatAssignedPatientAccommodation(patient: AssignedPatientListItem) {
  const parts = [
    patient.roomNumber ? `${patient.roomNumber}` : null,
    patient.bedNumber ? `${patient.bedNumber}` : null,
    // patient.roomType ? `Type: ${patient.roomType}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "N/A";
}

function mapAssignedListItemToDetail(patient: AssignedPatientListItem): AssignedPatientDetail {
  return {
    id: patient.id,
    patientTitle:patient.patientTitle,
    patientName: patient.patientName,
    patientUhid: patient.uhid,
    age: formatAssignedPatientAge(patient.age).replace(/Y$/i, " years"),
    gender: formatAssignedPatientGender(patient.gender),
    bedNumber: patient.bedNumber || "N/A",
    roomNumber: patient.roomNumber || "N/A",
    admissionDate: formatAdmittedPatientDate(patient.admissionDate),
    treatingDoctor: patient.doctorName || "N/A",
    diagnosis: patient.diagnosis || "N/A",
    patientType: patient.type || "Normal Patient",
  };
}

function formatAdmittedPatientDate(dateValue: string) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAdmittedPatientLastVisit(dateValue: string | null | undefined) {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function DashboardSection({
  title,
  searchValue,
  onSearchChange,
  branchFilter,
  children,
  footer,
}: {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  branchFilter?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] mb-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {branchFilter ? <div className="w-full sm:w-[240px] sm:shrink-0">{branchFilter}</div> : null}
          <div className="w-full sm:w-[300px] sm:shrink-0">
            <TableSearchInput value={searchValue} onChange={onSearchChange} placeholder="Search Here..." />
          </div>
        </div>
      </div>
      {children}
      {footer}
    </section>
  );
}

function ChevronRightIcon() {
  return (
 <svg
  width="16"
  height="16"
  viewBox="0 0 16 16"
  fill="none"
  className="shrink-0 text-[#1F1F1F]"
>
  <path
    d="M6 4L10 8L6 12"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
    // <Image src="/icons/rightArrow.svg" alt="rightArrow" width={18} height={18} />
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

export default function IPDHeadNursePage() {
  const userName = useAppSelector(selectUserName) ?? "";
  const [allocationPatient, setAllocationPatient] = useState<NurseAllocationPatient | null>(null);
  const [selectedAssignedPatient, setSelectedAssignedPatient] =
    useState<AssignedPatientDetail | null>(null);


  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useIPDNurseResolvedBranchId();


 const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState("patientName");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortBy, sortOrder, selectedBranch, resolvedFilterBranchId]);

  const PatientsParams = useMemo(() => {
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
    data: assignedPatientsRes,
    isLoading: isAssignedPatientsLoading,
    refetch: refetchAssignedPatients,
  } = useGetPatientListQuery(PatientsParams!, {
    skip: PatientsParams == null,
    refetchOnMountOrArgChange: true,
  });

  const assignedPatients = assignedPatientsRes?.data ?? [];
  const assignedPatientsTotal = assignedPatientsRes?.total ?? 0;
  const isAssignedPatientsTableLoading = isAssignedPatientsLoading;

  console.log("assignedPatients",assignedPatients)


  if (selectedAssignedPatient) {
    return (
      <AppShell>
        <AssignedPatientView
          patient={selectedAssignedPatient}
          onBack={() => {
            setSelectedAssignedPatient(null);
            void refetchAssignedPatients();
          }}
        />
      </AppShell>
    );
  }

// console.log("itemsPerPage",itemsPerPage)
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
              {/* {getGreeting()}, {userName} */}
              Patient Oversight
            </h1>
            <p className="mt-0.5 text-sm text-[#525763] font-medium text-[13px] leading-[18px]">
              {/* Ward 4B • Intensive Care Unit • Shift Remaining: 6h 42m • Handover Due: 16:00 */}
              {assignedPatientsTotal} Active Records
            </p>
          </div>
        </div>

           <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-4">
        </div>

        <DashboardSection
          title="Patient Queue"
          searchValue={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          branchFilter={
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
          }
          footer={
            assignedPatientsTotal > 0 ? (
              <Pagination
                currentPage={currentPage}
                totalItems={assignedPatientsTotal}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={PAGINATION_OPTIONS}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
              />
            ) : null
          }
        >
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
                <TableHead>Age/Gender</TableHead>
                <TableHead>Room Number / Bed Number</TableHead>
                <TableHead>Admission</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Last visit</TableHead>
                <TableHead>Pending Task</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAssignedPatientsTableLoading ? (
                <TableRow>
                  <TableData colSpan={ASSIGNED_PATIENT_COLUMN_COUNT} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading patients...
                    </div>
                  </TableData>
                </TableRow>
              ) : assignedPatients.length === 0 ? (
                <TableRow>
                  <TableData
                    colSpan={ASSIGNED_PATIENT_COLUMN_COUNT}
                    className="py-12 text-center text-sm text-[#9CA3AF]"
                  >
                    No patients found.
                  </TableData>
                </TableRow>
              ) : (
                assignedPatients.map((patient, index) => {
                const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");

                  return (
                    <TableRow key={patient.id} className="bg-white transition-colors">
                      <TableData variant="primary">{srNo}</TableData>
                      <TableData>
                        <div className="min-w-[160px]">
                             <p className="font-medium text-[#262D3B]">
                          <TruncatedTableCell
                          key={`patient-list-${patient.id ?? index}`}
                          text={`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                           />
                          </p>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{patient.uhid}</p>
                        </div>
                      </TableData>
                      <TableData>
                        <div className="min-w-[110px]">
                          <p className="text-[#0B8C00]">
                            Age: <span className="text-[#262D3B]">{formatAssignedPatientAge(patient.age)}</span>
                          </p>
                          <p className="text-[#0B8C00]">
                            Gender:{" "}
                            <span className="text-[#262D3B]">{formatAssignedPatientGender(patient.gender)}</span>
                          </p>
                        </div>
                      </TableData>
                      <TableData className="min-w-[220px]">
                        {formatAssignedPatientAccommodation(patient)}
                      </TableData>
                      <TableData>{formatAdmittedPatientDate(patient.admissionDate)}</TableData>
                      <TableData className="min-w-[180px]">
                      <TruncatedTableCell
                      key={`assigned-patient-list-${patient.id ?? index}`}
                      text={patient.diagnosis || "N/A"}
                      />
                      </TableData>
                      <TableData>{formatAdmittedPatientLastVisit(patient.lastVisit)}</TableData>
                      <TableData>
                        {/* <span className="text-sm text-[#434956]">
                          {patient.taskStatus || "N/A"}
                        </span> */}

                          { patient.taskStatus?.toLocaleLowerCase() === "completed" ?
                            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium border-[#0B8C0033] text-[#0B8C00] bg-white`}>
                                 {patient.taskStatus || "N/A"}
                            </span>
                                                    :

                              <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium border-[#B4530933] text-[#B45309] bg-white`}>
                                              {patient.taskStatus || "N/A"}
                              </span>
                          }
            
                      </TableData>
                      <TableData>
                    <Tooltip content="View" position="top" delay={0}>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                          aria-label={`View ${patient.patientName}`}
                          onClick={() => setSelectedAssignedPatient(mapAssignedListItemToDetail(patient))}
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
        </DashboardSection>


      </div>
    </AppShell>
  );
}

