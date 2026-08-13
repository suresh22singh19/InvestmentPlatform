"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { NewLabRequestScreen } from "@/components/ipd-staff-nurse/NewLabRequestScreen";
import {
  BackToPreviousPageButton,
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
import { StatusPill, type StatusTone } from "@/components/ipd-head-nurse/shared";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { buildViewAppointmentData } from "@/lib/ipd-head-nurse/patientView";
import { useGetPatientFilesQuery, useGetPatientHealthCardByUhidQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";
import {
  useGetLabTestCountsQuery,
  useGetLabTestListWithRoomDetailsQuery,
  useLazyStaffNurseGetOnePatientDetailQuery,
  type LabTestWithRoomDetailsItem,
} from "@/store/api/ipdStaffNurseAPI";

type SortDirection = "ASC" | "DESC";

type DashboardStatCardProps = {
  label: string;
  value: string | number;
  iconSrc: string;
};

type LabReportRow = {
  id: number;
  age:string;
  gender:string;
  createdByUserName : string;
  patientId: number;
  patientTitle?: string | null;
  patientName: string;
  uhid: string;
  roomNumber: string;
  bedNumber: string;
  roomType: string;
  testName: string;
  result: string;
  referenceRange: string;
  status: string;
  dateTime: string;
  reportDate: string;
  admissionDate: string;
};

const SUMMARY_CARDS = [
  { id: "active-orders", title: "Active Orders", iconSrc: "/icons/activeOrders.svg" },
  { id: "pending-sample", title: "Pending Sample", iconSrc: "/icons/SuccessCheck.svg" },
  { id: "results-ready", title: "Results Ready", iconSrc: "/icons/pendingSample.svg" },
] as const;

const STATUS_FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Sample Collected", value: "sample_collected" },
  { label: "Completed", value: "completed" },
];

const PAGINATION_OPTIONS = [6, 10, 20, 50];
const COLUMN_COUNT = 7;

function DashboardStatCard({ label, value, iconSrc }: DashboardStatCardProps) {
  return (
    <div className="flex items-center justify-between rounded-[20px] bg-white px-5 py-3 select-none">
      <div>
        <p className="mb-3 text-sm font-medium text-[#434956]">{label}</p>
        <h4 className="text-[32px] font-bold leading-[120%] text-[#262D3B]">{value}</h4>
      </div>
      <Image src={iconSrc} alt={label} width={36} height={36} />
    </div>
  );
}

function formatLabel(value: string | null | undefined) {
  if (!value?.trim()) return "N/A";
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatOrderDateTime(value: string | null | undefined) {
  if (!value) return "N/A";
  const date = new Date(value);
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

function formatLabReportDate(dateValue: string | null | undefined) {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function mapLabStatusTone(status: string | null | undefined): StatusTone {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized === "done" || normalized === "completed" || normalized === "received") {
    return "success";
  }
  if (normalized === "pending" || normalized.includes("sample")) return "warning";
  if (normalized.includes("cancel") || normalized.includes("reject")) return "danger";
  return "neutral";
}

function formatRoomBedLabel(item: LabTestWithRoomDetailsItem) {
  const room = item.roomNumber?.trim() || "N/A";
  const bed = item.bedNumber?.trim() || "N/A";
  const type = formatLabel(item.roomType);

  return { room, bed, type };
}

function mapLabOrderToReportRow(item: LabTestWithRoomDetailsItem): any {
  // console.log("dgsdsgdfd",item)
  return {
    id: item.id,
    patientId: item.patientId,
    patientTitle: item.patientTitle,
    patientName: item.patientName || "N/A",
    uhid: item.uhid || "N/A",
    roomNumber: item.roomNumber?.trim() || "N/A",
    bedNumber: item.bedNumber?.trim() || "N/A",
    roomType: formatLabel(item.roomType),
    testName: item.testName || "N/A",
    result: item.result || "N/A",
    referenceRange: "—",
    age:item.age || "",
    gender:item.gender,
    createdByUserName:item?.createdByUserName,
    status: formatLabel(item.testStatus),
    dateTime: formatOrderDateTime(item.updatedAt || item.createdAt),
    reportDate: formatLabReportDate(item.updatedAt || item.createdAt),
    admissionDate: formatLabReportDate(item.admissionDate),
  };
}

const TRUNCATED_TABLE_CELL_WIDTH = 150;

function TruncatedTableCell({ text, width = TRUNCATED_TABLE_CELL_WIDTH }: { text: string; width?: number }) {
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
      <div  className="flex min-w-0 items-center justify-start text-left" style={{ width, maxWidth: width }} >
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


export default function UnitLabOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("patientName");
  const [sortOrder, setSortOrder] = useState<SortDirection>("ASC");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [viewPatientMode, setViewPatientMode] = useState(false);
  const [fetchedPatientData, setFetchedPatientData] = useState<Record<string, unknown> | null>(null);
  const [loadingPatientId, setLoadingPatientId] = useState<number | null>(null);
  const [isNewLabOrderOpen, setIsNewLabOrderOpen] = useState(false);
  const [isLabReportDownloading, setIsLabReportDownloading] = useState(false);
  const [downloadingLabOrderId, setDownloadingLabOrderId] = useState<number | null>(null);
  const [labtestReportformattedDateTime, setLabtestReportformattedDateTime] = useState("");
  const [nurseName, setNurseName] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isFetchingPresignedImage, setIsFetchingPresignedImage] = useState<boolean>(false);

  const [getOnePatientDetail] = useLazyStaffNurseGetOnePatientDetailQuery();
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
  }, [debouncedSearch, statusFilter, selectedBranch, resolvedFilterBranchId, sortBy, sortOrder]);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const time = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setLabtestReportformattedDateTime(`${date} | ${time}`);
    };

    updateDateTime();

    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData) as { name?: string };
        setNurseName(user?.name || "");
      }
    } catch {
      setNurseName("");
    }

    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: countsRes, isLoading: isCountsLoading, refetch: refetchCounts } =
    useGetLabTestCountsQuery(
      { branchId: resolvedFilterBranchId! },
      { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
    );

  const listParams =
    resolvedFilterBranchId == null
      ? null
      : {
          branchId: resolvedFilterBranchId,
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          sortBy,
          order: sortOrder,
        };

  const {
    data: labTestsRes,
    isLoading: isLabTestsLoading,
    refetch: refetchLabTests,
  } = useGetLabTestListWithRoomDetailsQuery(listParams!, {
    skip: listParams == null,
    refetchOnMountOrArgChange: true,
  });

  const summaryCards = useMemo(() => {
    const data = countsRes?.data;
    const getValue = (count: number | undefined) => {
      if (data) return String(count ?? 0);
      return isCountsLoading ? "..." : "0";
    };

    return SUMMARY_CARDS.map((card) => {
      let value = "0";
      if (card.id === "active-orders") {
        value = getValue(data?.activeLabTests);
      } else if (card.id === "pending-sample") {
        value = getValue(data?.pendingSampleCollection);
      } else if (card.id === "results-ready") {
        value = getValue(data?.completedResults);
      }
      return { ...card, value };
    });
  }, [countsRes?.data, isCountsLoading]);

  const rows = labTestsRes?.data ?? [];

  const totalItems = labTestsRes?.total ?? 0;
  const isTableLoading = resolvedFilterBranchId == null || isLabTestsLoading;

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

  const handleLabReportDownload = async (report: LabReportRow) => {
    if (!report || isLabReportDownloading) return;

    try {
      setIsLabReportDownloading(true);
      setDownloadingLabOrderId(report.id);

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;
      const contentWidth = pageWidth - marginX * 2;
      let y = 16;

      const safeText = (value: string | null | undefined) =>
        (value || "N/A").replace(/\s+/g, " ").trim();

      try {
        const logoResponse = await fetch(`${window.location.origin}/images/logo.png`);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoDataUrl, "PNG", marginX, y - 4, 42, 16);
        }
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(11, 140, 0);
        doc.text("Jeena Sikho", marginX, y + 4);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(67, 73, 86);
      doc.text("Report Date: ", pageWidth - marginX - 55, y, { align: "left" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(38, 45, 59);
      doc.text(safeText(report.reportDate), pageWidth - marginX, y, { align: "right" });

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(67, 73, 86);
      doc.text("Generated By: ", pageWidth - marginX - 55, y, { align: "left" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(38, 45, 59);
      doc.text(report.createdByUserName || "", pageWidth - marginX, y, { align: "right" });

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(67, 73, 86);
      doc.text("Admission Date: ", pageWidth - marginX - 55, y, { align: "left" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(38, 45, 59);
      doc.text(safeText(report.admissionDate), pageWidth - marginX, y, { align: "right" });

      y += 12;

      doc.setFillColor(239, 243, 239);
      doc.rect(marginX, y, contentWidth, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(38, 45, 59);
      doc.text("Patient Information", marginX + 3, y + 5.5);
      y += 8;

      const patientDisplayName = [report.patientTitle, report.patientName]
        .filter(Boolean)
        .join(" ");

      const infoRows: Array<[string, string, string, string]> = [
        ["Patient Name", safeText(patientDisplayName), "Room", safeText(report.roomNumber)],
        ["Patient UHID", safeText(report.uhid), "Bed Number", safeText(report.bedNumber)],
        ["Age", "N/A", "Ward", safeText(report.roomType)],
        ["Gender", "N/A", "Admission Date", safeText(report.admissionDate)],
      ];

      const colWidth = contentWidth / 2;
      const rowHeight = 10;

      infoRows.forEach((row, index) => {
        const rowY = y + index * rowHeight;
        doc.setDrawColor(229, 231, 235);
        doc.rect(marginX, rowY, colWidth, rowHeight);
        doc.rect(marginX + colWidth, rowY, colWidth, rowHeight);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(82, 87, 99);
        doc.text(`${row[0]}:`, marginX + 3, rowY + 6);
        doc.text(`${row[2]}:`, marginX + colWidth + 3, rowY + 6);

        const leftLabelWidth = doc.getTextWidth(`${row[0]}: `);
        const rightLabelWidth = doc.getTextWidth(`${row[2]}: `);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(38, 45, 59);
        const leftValue = doc.splitTextToSize(row[1], colWidth - leftLabelWidth - 8);
        const rightValue = doc.splitTextToSize(row[3], colWidth - rightLabelWidth - 8);
        doc.text(leftValue[0] || "N/A", marginX + 3 + leftLabelWidth, rowY + 6);
        doc.text(rightValue[0] || "N/A", marginX + colWidth + 3 + rightLabelWidth, rowY + 6);
      });

      y += infoRows.length * rowHeight + 10;

      doc.setFillColor(239, 243, 239);
      doc.rect(marginX, y, contentWidth, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(38, 45, 59);
      doc.text("Lab test results", marginX + 3, y + 5.5);
      y += 8;

      const headers = ["Sr no.", "Test Name", "Result", "Reference Range", "Status", "Date & Time"];
      const colWidths = [16, 38, 22, 36, 28, 42];
      const tableRowHeight = 10;

      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(255, 255, 255);
      let x = marginX;
      headers.forEach((header, i) => {
        doc.rect(x, y, colWidths[i], tableRowHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(82, 87, 99);
        doc.text(header, x + 2, y + 6);
        x += colWidths[i];
      });
      y += tableRowHeight;

      const values = [
        "1",
        safeText(report.testName),
        safeText(report.result),
        safeText(report.referenceRange),
        safeText(report.status),
        safeText(report.dateTime),
      ];

      x = marginX;
      values.forEach((value, i) => {
        doc.rect(x, y, colWidths[i], tableRowHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(38, 45, 59);
        const lines = doc.splitTextToSize(value, colWidths[i] - 4);
        doc.text(lines[0] || "-", x + 2, y + 6);
        x += colWidths[i];
      });

      y += tableRowHeight + 14;

      const exportedBy = nurseName?.trim() || "N/A";
      const exportDateTime =
        labtestReportformattedDateTime?.trim() ||
        (() => {
          const now = new Date();
          const date = now.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const time = now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          return `${date} | ${time}`;
        })();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(38, 45, 59);
      doc.text("AUDIT INFORMATION", pageWidth - marginX, y, { align: "right" });
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(67, 73, 86);
      doc.text(`Exported by: ${exportedBy}`, pageWidth - marginX, y, { align: "right" });
      y += 5;
      doc.text(`Date/Time: ${exportDateTime}`, pageWidth - marginX, y, { align: "right" });

      const filename = `lab-test-report_${report.uhid || report.patientId}_${Date.now()}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Failed to download lab report", error);
    } finally {
      setIsLabReportDownloading(false);
      setDownloadingLabOrderId(null);
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

  if (isNewLabOrderOpen) {
    return (
      <AppShell>
        <NewLabRequestScreen
          branchId={resolvedFilterBranchId}
          onClose={() => setIsNewLabOrderOpen(false)}
          onSuccess={() => {
            setIsNewLabOrderOpen(false);
            void refetchLabTests();
            void refetchCounts();
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
            Lab Orders Tracking
          </h1>

          {/* <div className="w-full sm:w-[280px] sm:shrink-0">
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
              width="100%"
              height={44}
              disabled={isBranchFilterDisabled || isLoadingBranchFilter}
            />
          </div> */}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <DashboardStatCard
              key={card.id}
              label={card.title}
              value={card.value}
              iconSrc={card.iconSrc}
            />
          ))}
        </div>

        <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-base font-medium text-[#262D3B]">Patient Queue</h2>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
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
              width="100%"
              height={44}
              disabled={isBranchFilterDisabled || isLoadingBranchFilter}
            />
          </div>
              <div className="w-full sm:w-[180px]">
                <FormSelectField
                  label="Status"
                  hideLabel
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setStatusFilter(next || "all");
                    setCurrentPage(1);
                  }}
                  placeholder="Status"
                  mode="single"
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

              <button
                type="button"
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setIsNewLabOrderOpen(true)}
                disabled={resolvedFilterBranchId == null}
              >
                <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                <span>New Lab Order</span>
              </button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead>Sr no.</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1"
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
                <TableHead>Room Number / Bed Number</TableHead>
                <TableHead>Test Name</TableHead>
                <TableHead>Order Date/Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading lab orders...
                    </div>
                  </TableData>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
                    No lab orders found.
                  </TableData>
                </TableRow>
              ) : (
                rows.map((row, index) => {
                  const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");
                  const patientDisplayName = `${row.patientTitle ? `${row.patientTitle} ` : ""}${row.patientName || "N/A"}`;
                  const roomBed = formatRoomBedLabel(row);
                  const statusLabel = formatLabel(row.testStatus);
                  const isDownloadingRow = downloadingLabOrderId === row.id;
                    console.log("rowdgagt",row?.testStatus)

                  return (
                    <TableRow key={row.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                      <TableData variant="primary">{srNo}</TableData>
                      <TableData>
                        <div className="min-w-[160px] text-left">
                          <div className="font-medium text-[#262D3B]">
                            <TruncatedTableCell
                              key={`patient-list-${row.id}`}
                              text={patientDisplayName}
                            />
                          </div>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{row.uhid || "N/A"}</p>
                        </div>
                      </TableData>
                      <TableData>
                        <div className="min-w-[220px] text-sm text-[#262D3B]">
                          {/* <span className="font-medium text-[#0B8C00]">Room:</span> {roomBed.room}
                          <span className="mx-1.5 text-[#9CA3AF]">|</span>
                          <span className="font-medium text-[#0B8C00]">Bed:</span> {roomBed.bed} */}
                          {/* <span className="mx-1.5 text-[#9CA3AF]">|</span>
                          <span className="font-medium text-[#0B8C00]">Type:</span> {roomBed.type} */}

                         {roomBed.room}
                          <span className="mx-1.5 text-[#9CA3AF]">|</span>
                          {roomBed.bed}
                        </div>
                      </TableData>
                      <TableData>
                        {/* <div className="min-w-[160px]">
                          <TruncatedTableCell text={row.testName || "N/A"} width={180} />
                          {row.categoryName ? (
                            <p className="mt-0.5 text-xs text-[#434956]">{row.categoryName}</p>
                          ) : null}
                        </div> */}

                         {/* <div className="min-w-[220px]">
                          <TruncatedTableCell text={row.testName || "N/A"} width={220} />
                          {row.categoryName ? (
                            <p className="mt-0.5 text-xs text-[#434956]">{row.categoryName}</p>
                          ) : null}
                        </div> */}

                        <div className="min-w-[220px]">
                          <TruncatedTableCell text={row.testName || "N/A"} width={220} />
                          {row.categoryName ? (
                            <p className="mt-0.5 text-xs text-[#434956]">{row.categoryName}</p>
                          ) : null}
                        </div>

                      </TableData>
                      <TableData className="min-w-[140px] whitespace-nowrap">
                        {formatOrderDateTime(row.createdAt)}
                      </TableData>
                      <TableData>
                        <StatusPill label={statusLabel} tone={mapLabStatusTone(row.testStatus)} />
                      </TableData>
                      <TableData>
                        <div className="flex items-center gap-2">
                          <Tooltip content="View" position="top" delay={0}>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`View ${patientDisplayName}`}
                              disabled={loadingPatientId === row.patientId}
                              onClick={() => void handleViewPatient(row.patientId)}
                            >
                              {loadingPatientId === row.patientId ? (
                                <SpinnerLoader size={16} />
                              ) : (
                                <Image
                                  src="/icons/ViewEyeIcon.svg"
                                  alt="View"
                                  width={18}
                                  height={18}
                                />
                              )}
                            </button>
                          </Tooltip>

                        {
                         row?.testStatus.toLowerCase() !== "pending"  && 
                          <>
                          <Tooltip content="Download Lab Report" position="top" delay={0}>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Download lab report for ${patientDisplayName}`}
                              disabled={isDownloadingRow || isLabReportDownloading}
                              onClick={() =>
                                void handleLabReportDownload(mapLabOrderToReportRow(row))
                              }
                            >
                              {isDownloadingRow ? (
                                <SpinnerLoader size={16} />
                              ) : (
                                <Image
                                  src="/icons/Download.svg"
                                  alt="Download"
                                  width={18}
                                  height={18}
                                />
                              )}
                            </button>
                          </Tooltip>
                          </>
                          }
                        </div>
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
