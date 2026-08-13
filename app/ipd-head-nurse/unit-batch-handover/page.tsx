"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  BackToPreviousPageButton,
  Button,
  Checkbox,
  FormInputField,
  FormSelectField,
  MessageDialog,
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
import { StatusPill, type StatusTone } from "@/components/ipd-head-nurse/shared";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { buildViewAppointmentData } from "@/lib/ipd-head-nurse/patientView";
import { useGetPatientFilesQuery, useGetPatientHealthCardByUhidQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";
import {
  useGetUnavailableBedsForDropdownQuery,
  useLazyGetOnePatientDetailQuery,
  useListNurseAssignmentsQuery,
  usePatientHandoverMutation,
  type NurseAssignmentListItem,
} from "@/store/api/ipdHeadNurseAPI";

type SortDirection = "asc" | "desc";
type HandoverStep = 1 | 2;

type HandoverPatientRow = {
  patientTitle:string;
  assignmentId: number;
  patientId: number;
  patientName: string;
  age: string;
  gender: string;
  bedWing: string;
  bedNumber: string;
  roomBed: string;
  roomNumber: string;
  patientUhid: string;
  diagnosis: string;
  status: string;
  pendingTasksLabel: string;
  pendingTasksTone: StatusTone;
  handoverStatus: string;
  handoverTone: StatusTone;
  nextShiftNurseName: string;
};

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Stable", value: "stable" },
  { label: "Improving", value: "improving" },
  { label: "Critical", value: "critical" },
  { label: "Other", value: "other" },
];

const SHIFT_OPTIONS = [
  { label: "Morning", value: "morning" },
  { label: "Evening", value: "evening" },
  { label: "Night", value: "night" },
];

const PAGINATION_OPTIONS = [6, 10, 20, 50];
const COLUMN_COUNT = 7;
const SIGN_OFF_COLUMN_COUNT = 5;

function formatLabel(value: string | null | undefined) {
  if (!value?.trim()) return "N/A";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function capitalizeGender(gender: string | null | undefined) {
  if (!gender?.trim()) return "N/A";
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

function mapPatientStatusTone(status: string): StatusTone {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized === "critical") return "danger";
  if (normalized === "stable" || normalized === "improving") return "success";
  return "warning";
}

function mapPendingTaskTone(task: string | null | undefined): StatusTone {
  const normalized = task?.toLowerCase() ?? "";
  if (!normalized || normalized.includes("complete") || normalized.includes("done")) {
    return "success";
  }
  if (normalized.includes("vital")) return "warning";
  return "danger";
}

function mapHandoverStatusTone(status: string | null | undefined): StatusTone {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("ready") || normalized.includes("complete")) return "success";
  if (normalized.includes("overdue") || normalized.includes("not_initiated")) return "danger";
  return "warning";
}

function mapAssignmentToRow(item: NurseAssignmentListItem): HandoverPatientRow {
  const roomNumber = item.roomNumber || "N/A";
  const bedNumber = item.bedNumber || "N/A";

  return {
    assignmentId: item.id,
    patientTitle : item.patientTitle,
    patientId: item.patientId,
    patientName: item.patientName || "N/A",
    age: item.age || "N/A",
    gender: capitalizeGender(item.gender),
    bedWing: `${roomNumber} - ${bedNumber}`,
    bedNumber,
    roomBed: `${roomNumber} / ${bedNumber}`,
    roomNumber,
    patientUhid: item.patientUhid || "N/A",
    diagnosis: item.diagnosis?.trim() || "N/A",
    status: formatLabel(item.patientStatus),
    pendingTasksLabel: item.pendingTask?.trim() || "N/A",
    pendingTasksTone: mapPendingTaskTone(item.pendingTask),
    handoverStatus: formatLabel(item.handoverStatus),
    handoverTone: mapHandoverStatusTone(item.handoverStatus),
    nextShiftNurseName: item.nextShiftNurse?.name?.trim() || "",
  };
}

function PatientStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const classes =
    normalized === "critical"
      ? "bg-[#DC2626] text-white"
      : normalized === "stable" || normalized === "improving"
        ? "bg-[#0B8C00] text-white"
        : "bg-[#EA580C] text-white";

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${classes}`}>
      {status || "N/A"}
    </span>
  );
}

function HandoverStepper({ currentStep }: { currentStep: HandoverStep }) {
  const steps: Array<{ id: HandoverStep; label: string }> = [
    { id: 1, label: "Step 1" },
    { id: 2, label: "Step 2" },
  ];

  return (
    <div className="inline-flex items-start">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isReached = isActive || isCompleted;
        const showConnector = index < steps.length - 1;

        return (
          <div key={step.id} className="flex items-start">
            <div className="flex w-14 flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-[8px] text-sm font-semibold ${
                  isReached
                    ? "bg-[#0B8C00] text-white"
                    : "bg-[#0B8C004D] text-white"
                }`}
              >
                {step.id}
              </span>
              <span
                className={`mt-2 text-sm font-medium ${
                  isActive ? "text-[#0B8C00]" : isCompleted ? "text-[#0B8C00]" : "text-[#434956]"
                }`}
              >
                {step.label}
              </span>
            </div>

            {showConnector ? (
              <div className="mt-4 h-[2px] w-[200px] shrink-0 bg-[#0B8C00]" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PatientNameTooltip({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const value = name?.trim() || "N/A";

  return (
    <Tooltip
      position="top"
      maxWidth={400}
      content={
        <div className="max-w-[400px] whitespace-normal break-words text-xs text-[#262D3B]">
          {value}
        </div>
      }
    >
      <div className={`min-w-0 ${className}`}>
        <span className="block w-full truncate cursor-default">
          {value}
        </span>
      </div>
    </Tooltip>
  );
}

function BatchHandoverSignOff({
  patients,
  onBack,
  onSuccess,
}: {
  patients: HandoverPatientRow[];
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [notesByPatient, setNotesByPatient] = useState<Record<number, string>>({});
  const [noteErrors, setNoteErrors] = useState<Record<number, string>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [patientHandover, { isLoading: isSubmitting }] = usePatientHandoverMutation();

  const allPatientsHaveNextShiftNurse = patients.every(
    (patient) => Boolean(patient.nextShiftNurseName?.trim())
  );

  const allNotesFilled = patients.every(
    (patient) => Boolean((notesByPatient[patient.assignmentId] ?? "").trim())
  );

  const hasNoteValidationErrors = Object.keys(noteErrors).length > 0;

  const handleNoteChange = (assignmentId: number, value: string) => {
    setNotesByPatient((prev) => ({
      ...prev,
      [assignmentId]: value,
    }));

    if (value.trim()) {
      setNoteErrors((prev) => {
        if (!prev[assignmentId]) return prev;
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
    }
  };

  const handleCompleteHandoverClick = () => {
    if (!isConfirmed || patients.length === 0) return;

    const nextNoteErrors: Record<number, string> = {};
    patients.forEach((patient) => {
      if (!(notesByPatient[patient.assignmentId] ?? "").trim()) {
        nextNoteErrors[patient.assignmentId] = "Note is required";
      }
    });

    if (Object.keys(nextNoteErrors).length > 0) {
      setNoteErrors(nextNoteErrors);
      return;
    }

    setNoteErrors({});

    if (!allPatientsHaveNextShiftNurse) {
      setDialogMessage(
        "Handover cannot be completed because one or more patients do not have a nurse assigned for the next shift. Please assign a nurse to all patients first, then try again."
      );
      setShowErrorDialog(true);
      return;
    }

    setDialogMessage("Are you sure you want to hand over these patients to the next shift?");
    setShowConfirmDialog(true);
  };

  const handleConfirmHandover = async () => {
    if (!isConfirmed || patients.length === 0 || !allNotesFilled) return;

    try {
      const result = await patientHandover({
        handovers: patients.map((patient) => ({
          assignmentId: patient.assignmentId,
          patientId: patient.patientId,
          notes: (notesByPatient[patient.assignmentId] ?? "").trim(),
        })),
      }).unwrap();

      setShowConfirmDialog(false);
      setDialogMessage(result.message || "Patients handed over successfully.");
      setShowSuccessDialog(true);
    } catch (error) {
      setShowConfirmDialog(false);
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : "Failed to complete handover. Please try again.";
      setDialogMessage(message || "Failed to complete handover. Please try again.");
      setShowErrorDialog(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
          Batch Handover Sign-off
        </h1>
        <HandoverStepper currentStep={2} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(380px,380px)_minmax(0,1fr)]">
        <aside className="min-w-[380px] rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          <h2 className="text-base font-medium text-[#262D3B]">Selection Summary</h2>

          <div className="mt-4 space-y-3">
            {patients.map((patient) => (
              <div
                key={patient.assignmentId}
                className="flex items-start gap-3 rounded-[14px] border border-[#EDF3EA] bg-[#FCFDFC] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full  ">
                  <Image src="/icons/ProfileGreenIcon.svg" alt="" width={24} height={24} />
                </div>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <PatientNameTooltip
                      // name={patient.patientName}
                      name={`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                      className="text-sm font-medium w-[200px]"
                    />
                    <p className="mt-1 text-xs text-[#7B8089]">Bed No: {patient.bedNumber}</p>
                  </div>
                  <StatusPill
                    label={patient.status}
                    tone={mapPatientStatusTone(patient.status)}
                  />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-5">
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <h2 className="mb-4 text-base font-medium text-[#262D3B]">Patients</h2>

            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead position="first">Sr no.</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Room number/Bed number</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Next shift nurse</TableHead>
                  <TableHead position="last">Shift Handover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={SIGN_OFF_COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No patients selected.
                    </TableData>
                  </TableRow>
                ) : (
                  patients.map((patient, index) => (
                    <TableRow key={patient.assignmentId} className="bg-white">
                      <TableData variant="primary">{String(index + 1).padStart(2, "0")}</TableData>
                      <TableData>
                        <div className="min-w-[160px] text-left">
                          <p className="font-medium text-[#262D3B]">
                            <TruncatedTableCell
                              key={`patient-list-${patient.assignmentId ?? index}`}
                              // text={patient.patientName || "N/A"}
                              text={`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
                            />
                          </p>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{patient.patientUhid}</p>
                        </div>
                      </TableData>
                      <TableData>{patient.roomBed}</TableData>
                      <TableData className="min-w-[180px]">{patient.diagnosis}</TableData>
                      <TableData className="min-w-[160px]">
                        {patient.nextShiftNurseName || (
                          <span className="text-[#DC2626]">Unassigned</span>
                        )}
                      </TableData>
                      <TableData className="min-w-[220px] !h-auto !overflow-visible">
                        <div className="w-full [&>div]:!gap-0">
                          <FormInputField
                            label=""
                            className="my-1"
                            value={notesByPatient[patient.assignmentId] ?? ""}
                            onChange={(event) =>
                              handleNoteChange(patient.assignmentId, event.target.value)
                            }
                            placeholder="Enter handover notes"
                            width="100%"
                            error={noteErrors[patient.assignmentId]}
                          />
                        </div>
                      </TableData>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-5 flex items-start gap-3 rounded-[14px] border border-[#E3EEE1] bg-[#FCFDFC] px-4 py-3">
              <Checkbox checked={isConfirmed} onChange={setIsConfirmed} className="mt-0.5" />
              <p className="text-sm leading-relaxed text-[#434956]">
                I confirm that the above handover details are complete and accurate to the best of my knowledge.
              </p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-start gap-3">
            <Button
              variant="primary"
              size="medium"
              className="!min-w-0"
              disabled={
                !isConfirmed ||
                patients.length === 0 ||
                isSubmitting ||
                (hasNoteValidationErrors && !allNotesFilled)
              }
              onClick={handleCompleteHandoverClick}
            >
              {isSubmitting ? "Submitting..." : "Complete Handover & Sign Off"}
            </Button>
            <BackToPreviousPageButton onClick={onBack} text="Back to List" />
          </div>
        </div>
      </div>

      <MessageDialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        message={dialogMessage}
        confirmText="Yes"
        cancelText="No"
        showCancel
        isActionLoading={isSubmitting}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={() => void handleConfirmHandover()}
      />

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          onSuccess();
        }}
        message={dialogMessage}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => {
          setShowSuccessDialog(false);
          onSuccess();
        }}
      />

      <MessageDialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={dialogMessage}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => setShowErrorDialog(false)}
      />
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
        className="flex min-w-0 items-center justify-start text-left"
        style={{ width: TRUNCATED_TABLE_CELL_WIDTH, maxWidth: TRUNCATED_TABLE_CELL_WIDTH }}
      >
        <span
          ref={textRef}
          className="min-w-0 flex-1 overflow-hidden text-left whitespace-nowrap"
        >
          {value}
        </span>
        {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
      </div>
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

export default function UnitBatchHandoverPage() {
  const [step, setStep] = useState<HandoverStep>(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [bedFilter, setBedFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("morning");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [signOffPatients, setSignOffPatients] = useState<HandoverPatientRow[]>([]);
  const [viewPatientMode, setViewPatientMode] = useState(false);
  const [fetchedPatientData, setFetchedPatientData] = useState<Record<string, unknown> | null>(null);
  const [loadingPatientId, setLoadingPatientId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isFetchingPresignedImage, setIsFetchingPresignedImage] = useState<boolean>(false);

  const [getOnePatientDetail] = useLazyGetOnePatientDetailQuery();
  const [getPresignedUrl] = useLazyGetPresignedUrlQuery();

  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useIPDNurseResolvedBranchId();

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

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, bedFilter, statusFilter, shiftFilter, selectedBranch, resolvedFilterBranchId, sortDirection]);

  const { data: bedsRes, isLoading: isBedsLoading } = useGetUnavailableBedsForDropdownQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  const bedOptions = useMemo(
    () => [
      { label: "All Beds", value: "all" },
      ...(bedsRes?.data ?? []).map((bed) => ({
        label: `${bed.bedNumber}${bed.roomNumber ? ` (${bed.roomNumber})` : ""}`,
        value: bed.bedNumber,
      })),
    ],
    [bedsRes?.data]
  );

  const assignmentParams =
    resolvedFilterBranchId == null
      ? null
      : {
          branchId: resolvedFilterBranchId,
          // shift: shiftFilter,
          page: currentPage,
          limit: itemsPerPage,
          sortBy: "patientName",
          order: (sortDirection === "asc" ? "ASC" : "DESC") as "ASC" | "DESC",
          search: debouncedSearch.trim() || undefined,
          bedNumber: bedFilter !== "all" ? bedFilter : undefined,
          patientStatus: statusFilter !== "all" ? statusFilter : undefined,
        };

  const {
    data: assignmentsRes,
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments,
  } = useListNurseAssignmentsQuery(assignmentParams!, {
    skip: assignmentParams == null || step !== 1,
    refetchOnMountOrArgChange: true,
  });

  const rows = useMemo(
    () => (assignmentsRes?.data ?? []).map(mapAssignmentToRow),
    [assignmentsRes?.data]
  );
  const totalItems = assignmentsRes?.total ?? 0;
  const isTableLoading = resolvedFilterBranchId == null || isAssignmentsLoading;

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

  if (step === 2) {
    return (
      <AppShell>
        <BatchHandoverSignOff
          patients={signOffPatients}
          onBack={() => setStep(1)}
          onSuccess={() => {
            setSignOffPatients([]);
            setStep(1);
            void refetchAssignments();
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
            Shift Handover
          </h1>
          <HandoverStepper currentStep={1} />
        </div>

        <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-base font-medium text-[#262D3B]">Patients for Handover</h2>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
             <div className="w-full sm:w-[280px] sm:shrink-0">
                <FormSelectField
                  label="Branch"
                  hideLabel
                  options={hookBranchFilterOptions}
                  value={selectedBranch}
                  onChange={(value) => {
                    setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                    setCurrentPage(1);
                  }}
                  placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                  mode="single"
                  // background="white"
                  width="100%"
                  height={44}
                  disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                />
              </div>

              {/* <div className="w-full sm:w-[140px]">
                <FormSelectField
                  label="Shift"
                  hideLabel
                  options={SHIFT_OPTIONS}
                  value={shiftFilter}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setShiftFilter(next || "morning");
                    setCurrentPage(1);
                  }}
                  placeholder="Shift"
                  width="100%"
                  height={44}
                  background="white"
                />
              </div> */}

              <div className="w-full sm:w-[180px]">
                <FormSelectField
                  label="Bed"
                  hideLabel
                  options={bedOptions}
                  value={bedFilter}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setBedFilter(next || "all");
                    setCurrentPage(1);
                  }}
                  placeholder={isBedsLoading ? "Loading beds..." : "Bed"}
                  width="100%"
                  height={44}
                  // background="white"
                  disabled={isBedsLoading || resolvedFilterBranchId == null}
                />
              </div>

              <div className="w-full sm:w-[160px]">
                <FormSelectField
                  label="Status"
                  hideLabel
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setStatusFilter(next || "all");
                    setCurrentPage(1);
                  }}
                  placeholder="Status"
                  width="100%"
                  height={44}
                  // background="white"
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
                <TableHead>Sr no.</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 cursor-pointer"
                    onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  >
                    Patient Name
                    <Image src="/icons/SortByAscDes.svg" alt="Sort" width={12} height={12} />
                  </button>
                </TableHead>
                <TableHead>Age/Gender</TableHead>
                <TableHead>Room Number/ Bed Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pending Tasks</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading...
                    </div>
                  </TableData>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
                    No record found.
                  </TableData>
                </TableRow>
              ) : (
                rows.map((row, index) => {
                  const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");

                  return (
                    <TableRow
                      key={row.assignmentId}
                      className="bg-white transition-colors"
                    >
                      <TableData variant="primary">{srNo}</TableData>
                      <TableData>
                        <div className="min-w-[160px] text-left">
                          <p className="font-medium text-[#262D3B]">
                            <TruncatedTableCell
                              key={`patient-list-${row.assignmentId ?? index}`}
                              // text={row.patientName || "N/A"}
                              text={`${row.patientTitle ? `${row.patientTitle} ` : ""}${row.patientName || "N/A"}`}
                            />
                          </p>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{row.patientUhid}</p>
                        </div>
                      </TableData>
                      <TableData>
                        <div className="min-w-[110px]">
                          <p className="text-[#0B8C00]">
                            Age: <span className="text-[#262D3B]">{row.age}</span>
                          </p>
                          <p className="text-[#0B8C00]">
                            Gender: <span className="text-[#262D3B]">{row.gender}</span>
                          </p>
                        </div>
                      </TableData>
                      <TableData className="min-w-[220px]">{row.bedWing}</TableData>
                      <TableData>
                        <PatientStatusBadge status={row.status} />
                      </TableData>
                      <TableData>
                        <StatusPill label={row.pendingTasksLabel} tone={row.pendingTasksTone} />
                      </TableData>
                      <TableData>
                        <Tooltip content="View" position="top" delay={0}>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`View ${row.patientName}`}
                            disabled={loadingPatientId === row.patientId}
                            onClick={() => void handleViewPatient(row.patientId)}
                          >
                            {loadingPatientId === row.patientId ? (
                              <SpinnerLoader size={16} />
                            ) : (
                              <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
                            )}
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

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="medium"
            className="!min-w-0"
            disabled={rows.length === 0 || isTableLoading}
            onClick={() => {
              setSignOffPatients(rows);
              setStep(2);
            }}
            rightIcon={
              <Image src="/icons/rightArrow.svg" alt="" width={16} height={16} className="brightness-0 invert" />
            }
          >
            Next: Sign-off &amp; Verification
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
