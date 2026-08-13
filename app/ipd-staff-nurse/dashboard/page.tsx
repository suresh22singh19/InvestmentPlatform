"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
// import { keepPreviousData } from "@reduxjs/toolkit/query";
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
} from "@/components/ipd-head-nurse/AssignedPatientView";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import {
  useGetStaffNurseDashboardQuery,
  useStaffNurseGetAdmittedPatientListQuery,
  useStaffNurseGetNursePatientCountQuery,
  // useGetPatientAssignToNurseListQuery,
  useLazyStaffNurseGetOnePatientDetailQuery,
  type AssignedPatientListItem,
  type AdmittedPatientListItem,
  type StaffNurseMedicationAlert,
  type StaffNurseUpcomingTherapy,
  type StaffNurseVitalsQueueItem,
} from "@/store/api/ipdStaffNurseAPI";
import { useGetPatientFilesQuery, useGetPatientHealthCardByUhidQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";
import { buildViewAppointmentData } from "@/lib/ipd-head-nurse/patientView";

// ─── Stat card component ──────────────────────────────────────────────────────
type DashboardStatCardProps = {
  label: string;
  value: string | number;
  iconSrc: string;
  trendLabel?: string;
  isActive?: boolean;
  onClick?: () => void;
};


function DashboardStatCard({ label, value, iconSrc, trendLabel, isActive, onClick }: DashboardStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[20px] py-3 px-5 flex justify-between items-center transition-all duration-200 select-none bg-white`}
    >
      <div>
        <p className={`text-sm font-medium mb-3 ${isActive ? "text-white" : "text-[#434956]"}`}>
          {label}
        </p>
        <div className="flex items-end gap-2">
          <h4 className={`font-bold text-[32px] leading-[120%] ${isActive ? "text-white" : "text-[#262D3B]"}`}>
            {value}
          </h4>
          {trendLabel ? (
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-[#0B8C00]">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M5 1.5L8.5 6.5H1.5L5 1.5Z" fill="currentColor" />
              </svg>
              {trendLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className={isActive ? "opacity-100" : ""}>
        <Image
          src={iconSrc}
          alt={label}
          width={36}
          height={36}
          style={isActive ? { filter: "brightness(0) invert(1)" } : undefined}
        />
      </div>
    </div>
  );
}

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

const WARD_BED_STAT_LABELS = [
  { label: "Total Bed", key: "count" as const },
  { label: "Occupied", key: "occupied" as const },
  { label: "Available", key: "vacant" as const },
  { label: "Reserved", key: "reserved" as const },
  { label: "Under Cleaning", key: "underCleaning" as const },
];

const SUMMARY_CARDS = [
  { id: "total-patients", title: "Total Patients", iconSrc: "/icons/patients.svg" },
  { id: "vitals-pending", title: "Vitals Pending", iconSrc: "/icons/darkBrownadvanceCheck.svg" },
  { id: "medicines-pending", title: "Medicines Pending", iconSrc: "/icons/advanceCheck.svg" },
  { id: "pending-tasks", title: "Pending Tasks", iconSrc: "/icons/advanceCheck.svg" },
] as const;

const TASK_ITEMS: TaskItem[] = [
  { id: 1, title: "Vital Signs for Bed 102", dueLabel: "Due: Immediate" },
  { id: 2, title: "Wound Dressing for Bed 205", dueLabel: "Due: 30 min" },
  { id: 3, title: "Medication Round - Ward B", dueLabel: "Due: 10 min" },
  { id: 4, title: "Patient Hygiene - Bed 108", dueLabel: "Due: 25 min" },
];

const PATIENT_ALERTS: PatientAlertItem[] = [
  // {
  //   id: 1,
  //   title: "Bed 205: Pain Level Spike",
  //   description: "Patient reports increased discomfort. Pain score moved from 4 to 8.",
  //   timeAgo: "4m ago",
  //   tone: "danger",
  //   actionLabel: "Acknowledged",
  //   actionVariant: "outline",
  // },
  {
    id: 2,
    title: "Bed 102: Lab Results Ready",
    description: "Full Blood Count and Electrolyte panel results are now available.",
    timeAgo: "4m ago",
    tone: "success",
    actionLabel: "View Lab",
    actionVariant: "primary",
  },
];

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
    patient.roomNumber ? `Room: ${patient.roomNumber}` : null,
    patient.bedNumber ? `Bed: ${patient.bedNumber}` : null,
    patient.roomType ? `Type: ${patient.roomType}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "N/A";
}

function mapAssignedPatientStatus(status: string): AssignedPatientStatus {
  const normalized = status?.toLowerCase();
  if (normalized === "critical") return "Critical";
  if (normalized === "observation") return "Observation";
  return "Stable";
}

function mapAssignedListItemToDetail(patient: AssignedPatientListItem): AssignedPatientDetail {
  return {
    id: patient.id,
    patientTitle: patient.patientTitle,
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

function formatAdmittedPatientLastVisit(dateValue: string) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatAdmittedPatientBed(patient: AdmittedPatientListItem) {
  // if (patient.bedNumber) return `Bed ${patient.bedNumber}`;
  // if (patient.roomNumber) return `Room ${patient.roomNumber}`;

  if (patient.bedNumber) return `${patient.bedNumber}`;
  if (patient.roomNumber) return `${patient.roomNumber}`;
  return "N/A";
}

function isUrgentAdmission(patient: AdmittedPatientListItem) {
  return patient.admissionType?.toLowerCase() === "immediate";
}

function mapMedicationStatusTone(status: string): "danger" | "warning" | "neutral" {
  const normalized = status?.toLowerCase();
  if (normalized === "overdue") return "danger";
  if (normalized === "due" || normalized === "due_now") return "warning";
  return "neutral";
}

function medicationActionLabel(status: string): "ADMINISTER" | "WAIT" {
  return status?.toLowerCase() === "overdue" ? "ADMINISTER" : "WAIT";
}

function DashboardSection({
  title,
  searchValue,
  onSearchChange,
  children,
  footer,
}: {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] mb-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2>
        <div className="w-full sm:w-[300px] sm:shrink-0">
          <TableSearchInput value={searchValue} onChange={onSearchChange} placeholder="Search Here..." />
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

function TruncatedText({
  text,
  className,
  width,
}: {
  text: string;
  className?: string;
  width?: number | string;
}) {
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
      <span
        ref={textRef}
        className={`block truncate ${className ?? ""}`}
        style={width !== undefined ? { width, maxWidth: width } : undefined}
      >
        {value}
      </span>
    </Tooltip>
  );
}

// Helper function to extract S3 key from image URL or key string
const extractS3Key = (imageStr: string | null | undefined): string | null => {
    if (!imageStr || !imageStr.trim()) return null;
    let raw = imageStr.trim().split('?')[0];
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        try {
            const urlObj = new URL(raw);
            return urlObj.pathname.replace(/^\//, "");
        } catch {
            const match = raw.match(/amazonaws\.com\/(.+)/);
            if (match && match[1]) return match[1];
        }
    }
    return raw;
};


export default function IPDHeadNursePage() {
  const userName = useAppSelector(selectUserName) ?? "";
  const [currentPage, setCurrentPage] = useState(1);
  const [allocationPatient, setAllocationPatient] = useState<NurseAllocationPatient | null>(null);
  const [selectedAssignedPatient, setSelectedAssignedPatient] =
    useState<AssignedPatientDetail | null>(null);
  const [viewPatientMode, setViewPatientMode] = useState(false);
  const [fetchedPatientData, setFetchedPatientData] = useState<Record<string, unknown> | null>(null);
  const [loadingPatientId, setLoadingPatientId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showAllUpcomingTherapies, setShowAllUpcomingTherapies] = useState(false);
  const [showAllMedicationAlerts, setShowAllMedicationAlerts] = useState(false);
  const [showAllVitalsQueue, setShowAllVitalsQueue] = useState(false);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isFetchingPresignedImage, setIsFetchingPresignedImage] = useState<boolean>(false);

  const [getOnePatientDetail] = useLazyStaffNurseGetOnePatientDetailQuery();
  const [getPresignedUrl] = useLazyGetPresignedUrlQuery();

  const patientUhid =
    (fetchedPatientData?.appointmentDetail as { uhid?: string } | undefined)?.uhid ||
    (fetchedPatientData?.patientDetails as { uhid?: string } | undefined)?.uhid ||
    "";

  const { data: patientFilesResponse } = useGetPatientFilesQuery(
    { uhid: patientUhid },
    { skip: !viewPatientMode || !patientUhid, refetchOnMountOrArgChange: true }
  );

  // Fetch health card details by UHID
          const { data: healthCardResponse, isLoading: isFetchingHealthCard } = useGetPatientHealthCardByUhidQuery(
              { uhid: patientUhid },
              { skip: !patientUhid }
          );
          const healthCardData = healthCardResponse?.data;
    
            useEffect(() => {
                  const rawImage = healthCardData?.image;
                  if (!rawImage) {
                      setCardImageUrl(null);
                      return;
                  }
          
                  const key = extractS3Key(rawImage);
                  if (!key) {
                      setCardImageUrl(null);
                      return;
                  }
          
                  let isMounted = true;
                  setIsFetchingPresignedImage(true);
          
                  getPresignedUrl({ key })
                      .unwrap()
                      .then((res) => {
                          if (isMounted) {
                              if (res?.data?.signedUrl) {
                                  setCardImageUrl(res.data.signedUrl);
                              } else {
                                  setCardImageUrl(null);
                              }
                          }
                      })
                      .catch((err) => {
                          console.error("Failed to fetch presigned URL for health card image:", err);
                          if (isMounted) setCardImageUrl(null);
                      })
                      .finally(() => {
                          if (isMounted) setIsFetchingPresignedImage(false);
                      });
          
                  return () => {
                      isMounted = false;
                  };
              }, [healthCardData?.image, getPresignedUrl]);
    
           const isHealthCardLoading = isFetchingHealthCard || isFetchingPresignedImage;

  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useIPDNurseResolvedBranchId();

  const {
    data: dashboardRes,
    isLoading: isDashboardLoading,
    isFetching: isDashboardFetching,
    refetch: refetchDashboard,
  } = useGetStaffNurseDashboardQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  // const {
  //   data: nursePatientCountRes,
  //   isLoading: isNursePatientCountLoading,
  //   isFetching: isNursePatientCountFetching,
  //   refetch: refetchNursePatientCount,
  // } = useStaffNurseGetNursePatientCountQuery(
  //   { branchId: resolvedFilterBranchId! },
  //   { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  // );

  // const colleagues = useMemo(
  //   () =>
  //     (nursePatientCountRes?.data ?? []).map((nurse) => ({
  //       id: nurse.nurseId,
  //       name: nurse.name,
  //       patientCount: Number(nurse.totalPatients) || 0,
  //     })),
  //   [nursePatientCountRes?.data]
  // );

  // const visibleColleagues = showAll ? colleagues : colleagues.slice(0, 4);
  // const isColleaguesLoading = isNursePatientCountLoading || isNursePatientCountFetching;
  const isDashboardDataLoading = isDashboardLoading || isDashboardFetching;

  const upcomingTherapies = useMemo(
    () => dashboardRes?.data?.upcomingTherapies ?? [],
    [dashboardRes?.data?.upcomingTherapies]
  );
  const visibleUpcomingTherapies = showAllUpcomingTherapies
    ? upcomingTherapies
    : upcomingTherapies.slice(0, 4);

  const medicationAlerts = useMemo(
    () => dashboardRes?.data?.medicationAlerts ?? [],
    [dashboardRes?.data?.medicationAlerts]
  );
  const visibleMedicationAlerts = showAllMedicationAlerts
    ? medicationAlerts
    : medicationAlerts.slice(0, 4);

  const vitalsQueue = useMemo(
    () => dashboardRes?.data?.vitalsQueue ?? [],
    [dashboardRes?.data?.vitalsQueue]
  );
  const visibleVitalsQueue = showAllVitalsQueue ? vitalsQueue : vitalsQueue.slice(0, 4);

  const shiftHandover = dashboardRes?.data?.shiftHandover ?? null;

  const summaryCards = useMemo(() => {
    const data = dashboardRes?.data;
    const summary = data?.summary;
    const isLoading = isDashboardDataLoading;

    const getValue = (count: number | undefined) => {
      if (data) return String(count ?? 0);
      return isLoading ? "..." : "0";
    };

    return SUMMARY_CARDS.map((card) => {
      let value = "0";
      let trendLabel: string | undefined;

      if (card.id === "total-patients") {
        value = getValue(summary?.totalPatients?.count);
        const todayCount = summary?.totalPatients?.today;
        if (data && todayCount != null && todayCount > 0) {
          trendLabel = `+${todayCount} today`;
        }
      } else if (card.id === "vitals-pending") {
        value = getValue(summary?.vitalsPending);
      } else if (card.id === "medicines-pending") {
        value = getValue(data?.medicationAlerts?.length);
      } else if (card.id === "pending-tasks") {
        value = getValue(summary?.pendingTasks);
      }

      return { ...card, value };
    });
  }, [dashboardRes?.data, isDashboardDataLoading]);


  const [patientListFilters, setPatientListFilters] = useState<TableFilters>({
    currentPage: 1,
    itemsPerPage: 6,
  });
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [patientSortBy, setPatientSortBy] = useState("patientName");
  const [patientSortOrder, setPatientSortOrder] = useState<"ASC" | "DESC">("ASC");
  const debouncedPatientSearch = useDebounce(patientSearchTerm, 500);

  useEffect(() => {
    setPatientListFilters((prev) => ({ ...prev, currentPage: 1 }));
  }, [debouncedPatientSearch, selectedBranch, patientSortBy, patientSortOrder]);

  const admittedPatientsParams = useMemo(() => {
    if (resolvedFilterBranchId == null) return null;

    return {
      branchId: resolvedFilterBranchId,
      search: debouncedPatientSearch.trim() || undefined,
      sortBy: patientSortBy,
      order: patientSortOrder,
      page: patientListFilters.currentPage,
      limit: patientListFilters.itemsPerPage,
    };
  }, [
    resolvedFilterBranchId,
    debouncedPatientSearch,
    patientSortBy,
    patientSortOrder,
    patientListFilters.currentPage,
    patientListFilters.itemsPerPage,
  ]);

  // const {
  //   data: admittedPatientsRes,
  //   isLoading: isAdmittedPatientsLoading,
  //   refetch: refetchAdmittedPatients,
  // } = useStaffNurseGetAdmittedPatientListQuery(admittedPatientsParams!, {
  //   skip: admittedPatientsParams == null,
  //   refetchOnMountOrArgChange: true,
  // });

  // const admittedPatients = admittedPatientsRes?.data ?? [];
  // const admittedPatientsTotal = admittedPatientsRes?.total ?? 0;
  // const isAdmittedPatientsTableLoading = isAdmittedPatientsLoading;

  const [assignedFilters, setAssignedFilters] = useState({
    currentPage: 1,
    itemsPerPage: 6,
  });
  const [assignedSearchTerm, setAssignedSearchTerm] = useState("");
  const [assignedSortBy, setAssignedSortBy] = useState("patientName");
  const [assignedSortOrder, setAssignedSortOrder] = useState<"ASC" | "DESC">("ASC");
  const debouncedAssignedSearch = useDebounce(assignedSearchTerm, 500);

  useEffect(() => {
    setAssignedFilters((prev) => ({ ...prev, currentPage: 1 }));
  }, [debouncedAssignedSearch, selectedBranch, assignedSortBy, assignedSortOrder]);

  const assignedPatientsParams = useMemo(() => {
    if (resolvedFilterBranchId == null) return null;

    return {
      branchId: resolvedFilterBranchId,
      search: debouncedAssignedSearch.trim() || undefined,
      sortBy: assignedSortBy,
      order: assignedSortOrder,
      page: assignedFilters.currentPage,
      limit: assignedFilters.itemsPerPage,
    };
  }, [
    resolvedFilterBranchId,
    debouncedAssignedSearch,
    assignedSortBy,
    assignedSortOrder,
    assignedFilters.currentPage,
    assignedFilters.itemsPerPage,
  ]);

  // const {
  //   data: assignedPatientsRes,
  //   isLoading: isAssignedPatientsLoading,
  //   refetch: refetchAssignedPatients,
  // } = useGetPatientAssignToNurseListQuery(assignedPatientsParams!, {
  //   skip: assignedPatientsParams == null,
  //   refetchOnMountOrArgChange: true,
  //   // placeholderData: keepPreviousData,
  // });

  // const assignedPatients = assignedPatientsRes?.data ?? [];
  // const assignedPatientsTotal = assignedPatientsRes?.total ?? 0;
  // const isAssignedPatientsTableLoading = isAssignedPatientsLoading;

  const patientFilesItems = useMemo(() => {
    const files = patientFilesResponse?.data;
    if (!Array.isArray(files)) return [];

    return files.map((file) => {
      const formattedDate = file.createdAt
        ? new Date(file.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";

      return {
        name: file.fileName || "File",
        size: `${file.fileType || "Document"} • ${formattedDate}`,
        onClick: async () => {
          try {
            const result = await getPresignedUrl({ key: file.path }).unwrap();
            const signedUrl = result?.data?.signedUrl;
            if (signedUrl) {
              window.open(signedUrl, "_blank", "noopener,noreferrer");
            }
          } catch {
            // ignore file open errors
          }
        },
        actionIconSrc: "/icons/ViewEyeIcon.svg",
        actionIconAlt: "View File",
      };
    });
  }, [patientFilesResponse, getPresignedUrl]);

  const handleViewPatient = async (patientId: number) => {
    setLoadingPatientId(patientId);
    try {
      const res = await getOnePatientDetail(patientId).unwrap();
      if (res?.success) {
        setFetchedPatientData(res.data as Record<string, unknown>);
        setViewPatientMode(true);
      }
    } finally {
      setLoadingPatientId(null);
    }
  };

  if (viewPatientMode && fetchedPatientData) {
    const viewData = buildViewAppointmentData(fetchedPatientData);

    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <PageHeading title="View" />
            <BackToPreviousPageButton
              text="Back"
              onClick={() => {
                setViewPatientMode(false);
                setFetchedPatientData(null);
              }}
            />
          </div>

          <ViewAppointment
            uhid={patientUhid || undefined}
            appointmentItems={viewData.appointmentItems}
            walletRemainingAmount={viewData.remainingAmount}
            walletDetails={viewData.walletDetails}
            referralItems={viewData.referralItems}
            patientName={viewData.patientName}
            patientSubtitle={viewData.patientSubtitle}
            patientBadges={viewData.patientBadges}
            patientInfoItems={viewData.patientInfoItems}
            showVitals={true}
            vitalsItems={viewData.vitalsItems}
            timelineItems={viewData.timelineItems.length > 0 ? viewData.timelineItems : undefined}
            healthCardNo={viewData.healthCardNo}
            healthCardImageUrl={cardImageUrl || undefined}
            isHealthCardLoading={isHealthCardLoading}
            medicalItems={viewData.medicalItems}
            fileItems={patientFilesItems}
            otherInfoItems={viewData.otherInfoItems}
          />
        </div>
      </AppShell>
    );
  }

  if (selectedAssignedPatient) {
    return (
      <AppShell>
        <AssignedPatientView
          patient={selectedAssignedPatient}
          onBack={() => setSelectedAssignedPatient(null)}
        />
      </AppShell>
    );
  }

  

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
              {/* {getGreeting()}, {userName} */}
              Unit Overview
            </h1>
            <p className="mt-0.5 text-sm text-[#525763] font-medium text-[13px] leading-[18px]">
              {dashboardRes?.data?.header && Object.keys(dashboardRes?.data?.header).length !== 0 
                ? `${dashboardRes.data.header.shiftLabel} (${dashboardRes.data.header.shiftName})${
                    dashboardRes.data.header.unitInCharge
                      ? ` • A Unit in Charge: ${dashboardRes.data.header.unitInCharge.name}`
                      : ""
                  }`
                : isDashboardDataLoading
                  ? "Loading shift details..."
                  : ""}
            </p>
          </div>

          <div className="w-full shrink-0 sm:w-[280px]">
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
        </div>

        {/* <section className="rounded-[20px] border border-[#EBECED] bg-white px-6 py-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] mb-4">
        <div className="border-b border-[#EBECED] pb-4">
          <h2 className="text-base font-medium text-[#262D3B]">
            Bed Summary
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {wardBedStats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <p className="text-sm text-[#434956]">{stat.label}</p>
              <p className="mt-2 text-[14px] font-bold leading-none text-[#262D3B]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
        </section> */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-4">
             {summaryCards.map((card) => (
            <DashboardStatCard
              key={card.id}
              label={card.title}
              value={card.value}
              iconSrc={card.iconSrc}
              // trendLabel={card.trendLabel}
            />
          ))}
        </div>

       
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-4">

          {/* Upcoming Therapies */}
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <h2 className="text-base font-medium text-[#262D3B]">Upcoming Therapies</h2>
            <div
              className={`mt-5 space-y-4 ${
                showAllUpcomingTherapies ? "max-h-[320px] overflow-y-auto pr-2" : ""
              }`}
            >
              {isDashboardDataLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading upcoming therapies...
                </div>
              ) : visibleUpcomingTherapies.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No Upcoming Therapies found.</p>
              ) : (
                visibleUpcomingTherapies.map((therapy: StaffNurseUpcomingTherapy) => (
                  <div
                    key={therapy.sessionId}
                    className="rounded-[16px] bg-[#FCFDFC] px-0 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9]/50">
                        <Image
                          src="/icons/TherapyIcon.svg"
                          alt=""
                          width={18}
                          height={18}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#262D3B]">
                          <TruncatedText
                            text={
                              therapy.therapyName
                                ? therapy.therapyName
                                    .toLowerCase()
                                    .split(" ")
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(" ")
                                : "N/A"
                            }
                          />
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#434956]">
                          <TruncatedText
                            text={[therapy.patientTitle, therapy.patientName]
                              .filter(Boolean)
                              .join(" ")}
                            width={110}
                          />
                          <span className="shrink-0">•</span>
                          <TruncatedText
                            text={`Room no. ${therapy.roomNumber || "N/A"}`}
                            width={90}
                          />
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {therapy.time ? (
                          <span className="text-xs font-medium text-[#434956]">
                            {therapy.time}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {upcomingTherapies.length > 4 && (
              <Button
                variant="outline"
                size="small"
                className="mt-5 w-full"
                onClick={() => setShowAllUpcomingTherapies(!showAllUpcomingTherapies)}
              >
                {showAllUpcomingTherapies ? "See Less" : "See More"}
              </Button>
            )}
          </section>

          {/* Medication Alerts */}
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <h2 className="text-base font-medium text-[#262D3B]">Medication Alerts</h2>
            <div
              className={`mt-5 space-y-4 ${
                showAllMedicationAlerts ? "max-h-[320px] overflow-y-auto pr-2" : ""
              }`}
            >
              {isDashboardDataLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading medication alerts...
                </div>
              ) : visibleMedicationAlerts.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No medication alerts found.</p>
              ) : (
                visibleMedicationAlerts.map((alert: StaffNurseMedicationAlert) => {
                  const statusColor = mapMedicationStatusTone(alert.status);

                  return (
                    <div
                      key={alert.id}
                      className="rounded-[16px] bg-[#FCFDFC] px-0 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9]/50">
                          <Image
                            src="/icons/DoctorBagIcon.svg"
                            alt=""
                            width={18}
                            height={18}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#262D3B]">
                            {alert.medicineName}
                          </p>

                          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[#434956]">
                            <span>
                              Bed {alert.bedNumber}
                              {alert.nurseName ? ` • ${alert.nurseName}` : ""}
                            </span>

                            <span
                              className={`text-xs font-normal ${
                                statusColor === "danger"
                                  ? "text-[#93000A]"
                                  : statusColor === "warning"
                                    ? "text-[#EA580C]"
                                    : "text-[#434956]"
                              }`}
                            >
                              • {alert.timeStatus}
                            </span>
                          </p>
                        </div>

                        {statusColor === "danger" ? (
                          <button className="inline-block rounded-[30px] border border-[#93000A3D] bg-white px-3 py-1 text-xs font-normal text-[#93000A]">
                            {medicationActionLabel(alert.status)}
                          </button>
                        ) : statusColor === "warning" ? (
                          <button className="inline-block rounded-[30px] border border-[#EA580C3D] bg-white px-3 py-1 text-xs font-normal text-[#EA580C]">
                            {medicationActionLabel(alert.status)}
                          </button>
                        ) : (
                          <button className="inline-block rounded-[30px] border border-[#EBECED] bg-[#EBECED80] px-3 py-1 text-xs font-normal text-[#9FA2AB]">
                            {medicationActionLabel(alert.status)}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {medicationAlerts.length > 4 && (
              <Button
                variant="outline"
                size="small"
                className="mt-5 w-full"
                onClick={() => setShowAllMedicationAlerts(!showAllMedicationAlerts)}
              >
                {showAllMedicationAlerts ? "See Less" : "See More"}
              </Button>
            )}
          </section>

          {/* Vitals Queue */}
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <h2 className="text-base font-medium text-[#262D3B]">Vitals Queue</h2>
            <div
              className={`mt-5 space-y-4 ${
                showAllVitalsQueue ? "max-h-[320px] overflow-y-auto pr-2" : ""
              }`}
            >
              {isDashboardDataLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading vitals queue...
                </div>
              ) : visibleVitalsQueue.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No vitals queue found.</p>
              ) : (
                visibleVitalsQueue.map((item: StaffNurseVitalsQueueItem, index) => {
                  const statusColor = mapMedicationStatusTone(item.status ?? "");
                  const title =
                    [item.patientTitle, item.patientName].filter(Boolean).join(" ") ||
                    "Patient";

                  return (
                    <div
                      key={item.id ?? `vitals-${index}`}
                      className="rounded-[16px] bg-[#FCFDFC] px-0 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9]/50">
                          <Image
                            src="/icons/VitalsIcon.svg"
                            alt=""
                            width={18}
                            height={18}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#262D3B]">{title}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[#434956]">
                            <span>
                              {item.bedNumber ? `Bed ${item.bedNumber}` : "Bed N/A"}
                              {item.nurseName ? ` • ${item.nurseName}` : ""}
                            </span>
                            {item.timeStatus ? (
                              <span
                                className={`text-xs font-normal ${
                                  statusColor === "danger"
                                    ? "text-[#93000A]"
                                    : statusColor === "warning"
                                      ? "text-[#EA580C]"
                                      : "text-[#434956]"
                                }`}
                              >
                                • {item.timeStatus}
                              </span>
                            ) : null}
                          </p>
                        </div>

                        {item.time ? (
                          <span className="shrink-0 text-xs font-medium text-[#434956]">
                            {item.time}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {vitalsQueue.length > 4 && (
              <Button
                variant="outline"
                size="small"
                className="mt-5 w-full"
                onClick={() => setShowAllVitalsQueue(!showAllVitalsQueue)}
              >
                {showAllVitalsQueue ? "See Less" : "See More"}
              </Button>
            )}
          </section>
        </div>

        {/* Shift Handover */}
        {/* <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <h2 className="text-base font-medium text-[#262D3B]">Shift Handover</h2>

            {isDashboardDataLoading ? (
              <div className="mt-5 flex items-center justify-center gap-2 py-6 text-sm text-[#9CA3AF]">
                <SpinnerLoader size={18} />
                Loading shift handover...
              </div>
            ) : !shiftHandover ? (
              <p className="mt-5 py-6 text-center text-sm text-[#9CA3AF]">
                No shift handover notes found.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-[12px] border border-[#EBECED] bg-[#FCFDFC] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-[#262D3B]">
                      {shiftHandover.nurseName || "N/A"}
                    </p>
                    <p className="shrink-0 text-xs italic text-[#9FA2AB]">
                      {shiftHandover.time || ""}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-[150%] text-[#434956]">
                    {shiftHandover.note || "No notes available."}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div> */}
      </div>
    </AppShell>
  );
}
