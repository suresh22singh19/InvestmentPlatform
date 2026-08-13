"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  TableSearchInput,
  Button,
  TableListingCard,
  type TableListingSection,
  MessageDialog,
  FormSelectField,
  Tooltip,
  ViewAppointment,
  BackToPreviousPageButton,
  SpinnerLoader,
  Badge,
} from "@/components/ui";
import {
  useGetCounsellorStatsQuery,
  useGetReferredPatientsQuery,
  useGetTodayAdmissionsQuery,
  useGetTodayAvailableRoomsQuery,
  useRevertToOpdMutation,
  useLazyCheckFirstDayPaymentQuery,
  useLazyGetPatientDetailByAppointmentQuery,
  type CounsellorPatientListItem,
  type CounsellorTodayAdmissionItem,
  type FutureAdmissionItem,
} from "@/store/api/counsellorApi";
import { useGetPatientFilesQuery, useGetPatientHealthCardByUhidQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useCounsellorResolvedBranchId } from "@/hooks/useBranchFilter";
import {
  buildCounsellorViewAppointmentData,
  resolveCounsellorAppointmentId,
} from "@/lib/counsellor/patientView";
import FutureAdmissionProceedFlow, {
  type FutureAdmissionProceedFlowState,
} from "../future-admissions/FutureAdmissionProceedFlow";

// ─── Stat card component ──────────────────────────────────────────────────────
type DashboardStatCardProps = {
  label: string;
  value: string | number;
  iconSrc: string;
  isActive?: boolean;
  onClick?: () => void;
};

function DashboardStatCard({ label, value, iconSrc, isActive, onClick }: DashboardStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[20px] p-5 flex justify-between items-center cursor-pointer transition-all duration-200 select-none ${isActive
        ? "bg-[#0B8C00] shadow-lg scale-[1.02]"
        : "bg-white  hover:shadow-md"
        }`}
    >
      <div>
        <p className={`text-sm font-medium mb-3 ${isActive ? "text-white" : "text-[#434956]"}`}>
          {label}
        </p>
        <h4 className={`font-bold text-[32px] leading-[120%] ${isActive ? "text-white" : "text-[#262D3B]"}`}>
          {value}
        </h4>
      </div>
      <div className={isActive ? "opacity-100" : ""}>
        <Image
          src={iconSrc}
          alt={label}
          width={48}
          height={48}
          style={isActive ? { filter: "brightness(0) invert(1)" } : undefined}
        />
      </div>
    </div>
  );
}

// ─── Room Card component ──────────────────────────────────────────────────────
interface DashboardRoomCardProps {
  room: {
    id: number | string;
    roomNumber: string;
    roomType: string;
    bedCapacity: number;
    status: string;
    branchName: string;
    buildingName: string;
    floorName: string;
    roomUsage?:string;
  };
  index: number;
}

const capitalizeFirstLetter = (str:string) => {
  if (!str) return "N/A";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

function DashboardRoomCard({ room, index }: DashboardRoomCardProps) {
  // const isVacant =
  //   room.status?.toLowerCase() === "vacant" ||
  //   room.status?.toLowerCase() === "available" ||
  //   !room.status;

  // console.log("room",room)

    const statusLower = room.status?.toLowerCase() || "";
    const isAvailable = statusLower === "available" || statusLower === "vacant";
    const isOccupied = statusLower === "occupied" || statusLower === "fully occupied";
    const isNoBed = statusLower === "No Beds Available" || statusLower === "no beds available";
    const isPartiallyOccupied = statusLower === "partially occupied";
    const isReserved = statusLower === "reserved";
    const isUnderCleaning = statusLower === "under cleaning" || statusLower === "under maintenance" || statusLower === "not available";
    const isCheckout = statusLower === "checkout";

  // Render overlapping D S R badges on index 1 matching the user's figma screenshot exactly
  const showDSR = index === 1;

  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white flex flex-col select-none transition-all duration-200 hover:shadow-md hover:border-[#0B8C00]/30">
      {/* 1. Header Row */}
      <div className="p-5 flex justify-between items-center border-b border-[#F0F4EF] gap-2 h-[72px]">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-[#F4F6F4] text-[#7E828A] border border-[#E9EBEA] flex items-center justify-center font-medium text-sm">
            {index}
          </span>
          <div className="flex flex-col">
            <span className="text-[12px] font-normal text-[#525763] tracking-wider">Room Number</span>
            <span className="font-semibold  text-[14px] text-[#434956] text-base mt-0.5">{room.roomNumber || "N/A"}</span>
          </div>
        </div>

        {/* Status Pill Badge */}
        {/* <span
          className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold border ${isVacant
            ? "border-[#0B8C00]/20 bg-[#0B8C00]/5 text-[#0B8C00]"
            : "border-[#F6776E]/20 bg-[#F6776E]/5 text-[#F6776E]"
            }`}
        >
          {isVacant ? "Available" : room.status}
        </span> */}

          {/* Status Badges */}
          {isAvailable && (
              <Badge variant="success" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#0B8C0033] text-[#0B8C00]">Available</Badge>
          )}
            {isNoBed && (
              <Badge variant="success" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#0B8C0033] text-[#787E8C]">No Beds Available</Badge>
          )}
          {isOccupied && (
              <Badge variant="occupied" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#EF444433] text-[#EF4444]">Fully Occupied</Badge>
          )}
          {/* {isPartiallyOccupied && (
              <Badge variant="occupied" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#F59E0B33] text-[#F59E0B]">Partially Occupied</Badge>
          )} */}
          {isPartiallyOccupied && (
            <Badge
              variant="occupied"
              className="text-[10px] font-normal px-3 py-1 bg-transparent !border-[#F59E0B]/20 text-[#F59E0B]"
            >
              Partially Occupied
            </Badge>
          )}
            {isReserved && (
              <Badge variant="checkout" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#6B728033] text-[#6B7280]">Reserved</Badge>
          )}
          {isUnderCleaning && (
              <Badge variant="cleaning" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#3B82F633] text-[#3B82F6]">Maintenance</Badge>
          )}
          {isCheckout && (
              <Badge variant="checkout" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#8B5CF633] text-[#8B5CF6]">Checkout</Badge>
          )}
      </div>

      {/* 2. Body / Details Section (2-Column block) */}
      {/* <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-[#525763] font-normal text-[12px] tracking-wider">Floor</span>
          <span className="font-medium text-[#262D3B] text-sm mt-0.5">{room.floorName || "N/A"}</span>
        </div>

        <div className="flex flex-col gap-0.5 relative">
          <span className="text-[#525763] font-normal text-[12px] tracking-wider">Building</span>
          <span
            className="font-medium text-[#262D3B] text-sm mt-0.5 truncate"
            title={room.buildingName || "N/A"}
          >
            {room.buildingName || "N/A"}
          </span>


        </div>

        <div className="flex flex-col gap-0.5 col-span-2">
          <span className="text-[#525763] font-normal text-[12px] tracking-wider">Room Type</span>
          <span className="font-medium text-[#262D3B] text-sm mt-0.5">{capitalizeFirstLetter(room.roomType || "N/A")}</span>
        </div>
      </div> */}


      <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-[#525763] font-normal text-[12px] tracking-wider">Floor</span>
          <span className="font-medium text-[#262D3B] text-sm mt-0.5">
            {room.floorName || "N/A"}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[#525763] font-normal text-[12px] tracking-wider">Building</span>
          <span
            className="font-medium text-[#262D3B] text-sm mt-0.5 truncate"
            title={room.buildingName || "N/A"}
          >
            {room.buildingName || "N/A"}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[#525763] font-normal text-[12px] tracking-wider">Room Type</span>
          <span className="font-medium text-[#262D3B] text-sm mt-0.5">
            {capitalizeFirstLetter(room.roomType || "N/A")}
          </span>
        </div>
          <div className="flex flex-col gap-0.5">
          <span className="text-[#525763] font-normal text-[12px] tracking-wider">Gender</span>
          <span className="font-medium text-[#262D3B] text-sm mt-0.5">
            {capitalizeFirstLetter(room.roomUsage || "N/A")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat cards config ────────────────────────────────────────────────────────
const STAT_CARDS = [
  { id: "referred", label: "Referred Patients", iconSrc: "/icons/patientBed.svg" },
  { id: "admissions", label: "Today's Admissions", iconSrc: "/icons/addPatient.svg" },
  { id: "rooms", label: "Available Rooms Today", iconSrc: "/icons/bedDarkIcon.svg" },
];

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

// function mapTodayAdmissionToProceedItem(
//   item: CounsellorTodayAdmissionItem & { patientId?: number; patientPackageId?: number; packageName?: string }
// ): FutureAdmissionItem {

//   console.log("itemdfauausduah",item)
//   return {
//     id: typeof item.id === "number" ? item.id : Number(item.id),
//     patientName: item.patientName,
//     admissionType: item.admissionType || "",
//     uhid: item.patientUhid,
//     bookingStatus: "",
//     package: item.packageName || item.diagnosis || "Selected Package",
//     patientPackageId: item.patientPackageId ?? 0,
//     roomType: "",
//     advance: "",
//     admissionDate: "",
//     doctorName: item.doctorName || "",
//     patientId: item.patientId,
//   };
// }

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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CounsellorDashboardPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeCard, setActiveCard] = useState<string>("referred");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [sortBy, setSortBy] = useState<string>("patientName");
  const [proceedFlow, setProceedFlow] = useState<FutureAdmissionProceedFlowState | null>(null);

  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useCounsellorResolvedBranchId();

  // Confirmation dialog and submitting states
  const [pendingAction, setPendingAction] = useState<{ type: "refer" | "startAdmission"; item: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDialogConfig, setSuccessDialogConfig] = useState<{
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
  const [getPatientDetailByAppointment] = useLazyGetPatientDetailByAppointmentQuery();
  const [loadingAppointmentId, setLoadingAppointmentId] = useState<number | null>(null);
  const [fetchedPatientData, setFetchedPatientData] = useState<any>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isFetchingPresignedImage, setIsFetchingPresignedImage] = useState<boolean>(false);

  const [getPresignedUrl] = useLazyGetPresignedUrlQuery();
  const { data: patientFilesResponse } = useGetPatientFilesQuery(
    { uhid: fetchedPatientData?.appointmentDetail?.uhid || "" },
    { skip: !fetchedPatientData?.appointmentDetail?.uhid, refetchOnMountOrArgChange: true }
  );

    // Fetch health card details by UHID
      const { data: healthCardResponse, isLoading: isFetchingHealthCard } = useGetPatientHealthCardByUhidQuery(
          { uhid: fetchedPatientData?.appointmentDetail?.uhid },
          { skip: !fetchedPatientData?.appointmentDetail?.uhid }
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
  // console.log("proceedFlowdfgshgsdh",proceedFlow)

  const handleViewFile = async (filePath: string) => {
    try {
      const result = await getPresignedUrl({ key: filePath }).unwrap();
      const signedUrl = result?.data?.signedUrl;
      if (signedUrl) {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Failed to get presigned URL:", err);
      alert("Failed to open file. Please try again.");
    }
  };

  const patientFilesItems = useMemo(() => {
    const files = patientFilesResponse?.data;
    if (!Array.isArray(files)) return [];
    return files.map((file) => {
      const formattedDate = file.createdAt
        ? new Date(file.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "";
      return {
        name: file.fileName || "File",
        size: `${file.fileType || "Document"} • ${formattedDate}`,
        onClick: () => void handleViewFile(file.path),
        actionIconSrc: "/icons/ViewEyeIcon.svg",
        actionIconAlt: "View File",
      };
    });
  }, [patientFilesResponse]);

  const [revertToOpd] = useRevertToOpdMutation();
  const [checkFirstDayPayment] = useLazyCheckFirstDayPaymentQuery();

  const handleViewPatientByUhid = async (
    item: CounsellorPatientListItem | CounsellorTodayAdmissionItem
  ) => {
    const appointmentLookupId = resolveCounsellorAppointmentId(item);
    if (!appointmentLookupId) {
      setApiErrorMessage("Appointment ID not found for this patient.");
      setShowApiErrorDialog(true);
      return;
    }

    setLoadingAppointmentId(appointmentLookupId);
    try {
      const res = await getPatientDetailByAppointment(appointmentLookupId).unwrap();
      if (res?.success) {
        setFetchedPatientData(res.data);
        setSelectedAppointmentId(appointmentLookupId);
        setViewAppointmentMode(true);
      } else {
        setApiErrorMessage(res?.message || "Failed to load patient details.");
        setShowApiErrorDialog(true);
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string }; message?: string };
      setApiErrorMessage(
        apiErr?.data?.message || apiErr?.message || "An error occurred while fetching patient details."
      );
      setShowApiErrorDialog(true);
    } finally {
      setLoadingAppointmentId(null);
    }
  };

  const handleReferToOPD = async (item: any) => {
    setIsSubmitting(true);
    try {
      const res = await revertToOpd(item.id).unwrap();
      if (res.success) {
        setSuccessDialogConfig({
          message: res.message || `Patient ${item.patientName} referred to OPD successfully!`,
          confirmText: "OK",
          showCancel: false,
        });
        
        // Safely refetch stats
        try {
          refetchStats();
        } catch (e) {
          console.warn("Failed to refetch stats:", e);
        }

        // Safely refetch admissions
        if (!isAdmissionsUninitialized) {
          try {
            refetchAdmissions();
          } catch (e) {
            console.warn("Failed to refetch admissions:", e);
          }
        }

        // Safely refetch referred list
        if (!isReferredUninitialized) {
          try {
            refetchReferred();
          } catch (e) {
            console.warn("Failed to refetch referred:", e);
          }
        }
      } else {
        setApiErrorMessage(res.message || "Failed to revert patient to OPD.");
        setShowApiErrorDialog(true);
      }
    } catch (err: any) {
      console.error("Error reverting patient to OPD:", err);
      setApiErrorMessage(err?.data?.message || err?.message || "An error occurred while reverting patient to OPD.");
      setShowApiErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleStartAdmission = async (item: FutureAdmissionItem) => {
    setIsSubmitting(true);
    try {
      const res = await checkFirstDayPayment(item.id).unwrap();
      if (res.success) {
        const remaining = parseFloat(res.data.remainingForFirstDay || "0");
        const complete = res.data.firstDayPaymentComplete;
        // const proceedItem = mapTodayAdmissionToProceedItem(item);
        // const proceedItem = item;
        if (remaining > 0 || !complete) {
          setProceedFlow({
            // item: proceedItem,
            item,
            paymentData: res.data,
            showPaymentStep: true,
            currentStep: 1,
          });
          return;
        }

        setSuccessDialogConfig({
          message: (
            <div className="flex flex-col items-center text-center">
              <span className="text-sm text-[#475569]">
                Admission started for{" "}
                <strong className="text-[#0B8C00]">{item.patientName || "patient"}</strong>{" "}
                successfully! You can now proceed with room allocation.
              </span>
            </div>
          ),
          confirmText: "Assign Room & Bed",
          cancelText: "Close",
          showCancel: true,
          onConfirm: () => {
            setProceedFlow({
              // item: proceedItem,
              item,
              paymentData: res.data,
              showPaymentStep: false,
              currentStep: 1,
            });
          },
        });
      } else {
        setApiErrorMessage(res.message || "Failed to check payment status.");
        setShowApiErrorDialog(true);
      }
    } catch (err: any) {
      console.error("Error checking first day payment:", err);
      setApiErrorMessage(err?.data?.message || err?.message || "An error occurred while starting admission.");
      setShowApiErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset page when debounced search term or branch changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedBranch]);

  // API Queries
  const { data: statsRes, isLoading: isStatsLoading, refetch: refetchStats } = useGetCounsellorStatsQuery(
    resolvedFilterBranchId != null ? { branchId: resolvedFilterBranchId } : undefined
  );
  const statsData = statsRes?.data;

  // 1. Referred Patients Query
  const referredParams = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy === "patientName" || sortBy === "doctorName" ? sortBy : "patientName",
    order: sortOrder,
    page: currentPage,
    limit: itemsPerPage,
    ...(resolvedFilterBranchId != null ? { branchId: resolvedFilterBranchId } : {}),
  }), [debouncedSearch, sortBy, sortOrder, currentPage, itemsPerPage, resolvedFilterBranchId]);

  const {
    data: referredRes,
    isLoading: isReferredLoading,
    refetch: refetchReferred,
    isUninitialized: isReferredUninitialized,
  } = useGetReferredPatientsQuery(referredParams, {
    skip: activeCard !== "referred" || resolvedFilterBranchId == null,
    refetchOnMountOrArgChange: true,
  });

  // 2. Today's Admissions Query
  const admissionsParams = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy === "patientName" ? "patientName" : undefined,
    order: sortOrder,
    page: currentPage,
    limit: itemsPerPage,
    ...(resolvedFilterBranchId != null ? { branchId: resolvedFilterBranchId } : {}),
  }), [debouncedSearch, sortBy, sortOrder, currentPage, itemsPerPage, resolvedFilterBranchId]);
  const {
    data: admissionsRes,
    isLoading: isAdmissionsLoading,
    refetch: refetchAdmissions,
    isUninitialized: isAdmissionsUninitialized,
  } = useGetTodayAdmissionsQuery(admissionsParams, { skip: activeCard !== "admissions" || resolvedFilterBranchId == null, 
     refetchOnMountOrArgChange: true,
  });

  // 3. Available Rooms Query
  const roomsParams = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy === "roomNumber" ? "roomNumber" : undefined,
    order: sortOrder,
    page: currentPage,
    limit: itemsPerPage,
    ...(resolvedFilterBranchId != null ? { branchId: resolvedFilterBranchId } : {}),
  }), [debouncedSearch, sortBy, sortOrder, currentPage, itemsPerPage, resolvedFilterBranchId]);
  const { data: roomsRes, isLoading: isRoomsLoading } = useGetTodayAvailableRoomsQuery(
    roomsParams,
    { skip: activeCard !== "rooms" || resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  const handleCardClick = (id: string) => {
    setActiveCard(id);
    setSearchTerm("");
    setSelectedRoomType("");
    setCurrentPage(1);
    setSortOrder("ASC");
    if (id === "rooms") {
      setSortBy("roomNumber");
      setItemsPerPage(8); // Display 8 room cards (4 columns x 2 rows)
    } else {
      setSortBy("patientName");
      setItemsPerPage(10);
    }
  };

  // Extract unique room types dynamically from roomsRes?.data
  const uniqueRoomTypes = useMemo(() => {
    if (!roomsRes?.data) return [];
    const typesSet = new Set<string>();
    roomsRes.data.forEach((room) => {
      if (room.roomType) typesSet.add(room.roomType);
    });
    return Array.from(typesSet).sort();
  }, [roomsRes?.data]);

  const roomTypeOptions = useMemo(() => {
    return [
      { label: "All Room Types", value: "" },
      ...uniqueRoomTypes.map((type) => ({ label: type, value: type })),
    ];
  }, [uniqueRoomTypes]);

  // Client-side filtered rooms list
  const filteredRooms = useMemo(() => {
    const rooms = roomsRes?.data || [];
    if (!selectedRoomType) return rooms;
    return rooms.filter((room) => room.roomType === selectedRoomType);
  }, [roomsRes?.data, selectedRoomType]);

  // Derive active lists and loading states
  let currentList: any[] = [];
  let totalItems = 0;
  let isCurrentLoading = false;

  if (activeCard === "referred") {
    currentList = referredRes?.data || [];
    totalItems = referredRes?.total || 0;
    isCurrentLoading = isReferredLoading;
  } else if (activeCard === "admissions") {
    currentList = admissionsRes?.data || [];
    totalItems = admissionsRes?.total || 0;
    isCurrentLoading = isAdmissionsLoading;
  } else if (activeCard === "rooms") {
    currentList = roomsRes?.data || [];
    totalItems = roomsRes?.total || 0;
    isCurrentLoading = isRoomsLoading;
  }

  const tableTitle =
    activeCard === "referred"
      ? "Referred Patients"
      : activeCard === "admissions"
        ? "Today's Admissions"
        : "Available Rooms Today";

  const emptyMessage =
    activeCard === "referred"
      ? "No referred patients found"
      : activeCard === "admissions"
        ? "No admissions found today"
        : "No available rooms found today";

  return (
    <AppShell>
      {viewAppointmentMode ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <PageHeading title="View" />
            <BackToPreviousPageButton
              text="Back"
              onClick={() => {
                setViewAppointmentMode(false);
                setFetchedPatientData(null);
                setSelectedAppointmentId(null);
              }}
            />
          </div>
          {(() => {
            const viewData = buildCounsellorViewAppointmentData(fetchedPatientData);

            return (
              <ViewAppointment
                appointmentId={selectedAppointmentId ?? undefined}
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
                hideBloodGroup={true}
              />
            );
          })()}
        </div>
      ) : proceedFlow ? (
        <FutureAdmissionProceedFlow
          flow={proceedFlow}
          backLabel="Back to Dashboard"
          onClose={() => setProceedFlow(null)}
          onStepChange={(step) =>
            setProceedFlow((prev) => (prev ? { ...prev, currentStep: step } : prev))
          }
          onComplete={() => {
            setProceedFlow(null);
            try {
              refetchAdmissions();
            } catch (e) {
              console.warn("Failed to refetch admissions:", e);
            }
            try {
              refetchStats();
            } catch (e) {
              console.warn("Failed to refetch stats:", e);
            }
          }}
        />
      ) : (
        <>
          {/* Page Heading + Action Buttons */}
          <div className="flex items-center justify-between">
            <PageHeading title="Dashboard" />
            {/* <div className="flex items-center gap-3">
              <Button
                variant="primary"
                leftIcon={<Image src="/icons/bedLightIcon.svg" alt="" width={20} height={20} />}
              >
                Manage Rooms
              </Button>
              <Button
                variant="outline"
                className="!bg-transparent"
                leftIcon={<Image src="/icons/AddIcon.svg" alt="" width={20} height={20} />}
              >
                New Admission
              </Button>
            </div> */}
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {STAT_CARDS.map((card) => {
          let val: string | number | undefined = undefined;
          if (card.id === "referred") val = statsData?.totalOPDPatient;
          else if (card.id === "admissions") val = statsData?.todayAdmissions;
          else if (card.id === "rooms") val = statsData?.availableRooms;

          const displayValue = isStatsLoading
            ? "..."
            : (val !== undefined && val !== null ? val : "N/A");

          return (
            <DashboardStatCard
              key={card.id}
              label={card.label}
              value={displayValue}
              iconSrc={card.iconSrc}
              isActive={activeCard === card.id}
              onClick={() => handleCardClick(card.id)}
            />
          );
        })}
      </div>

      {/* Dynamic Table */}
      {(() => {
        let columns: TableListingSection["columns"] = [];

        if (activeCard === "referred") {
          columns = [
            { label: "Sr no.", position: "first", className:"w-[80px] max-w-[80px]" },
            {
              label: "Patient Name",
              className: "w-[150px] max-w-[150px]",
              sortable: true,
              sortDirection: sortBy === "patientName" ? (sortOrder.toLowerCase() as "asc" | "desc") : null,
              onSort: () => {
                setSortBy("patientName");
                setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                setCurrentPage(1);
              },
            },
            { label: "Patient UHID" },
            { label: "Contact Number" },
            { label: "Diagnosis / Symptoms", className: "w-[170px] max-w-[170px]" },
            {
              label: "Referring Doctor",
              sortable: true,
              sortDirection: sortBy === "doctorName" ? (sortOrder.toLowerCase() as "asc" | "desc") : null,
              onSort: () => {
                setSortBy("doctorName");
                setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                setCurrentPage(1);
              },
            },
            { label: "Action", position: "last", className: "cursor-pointer" },
          ];
        } else if (activeCard === "admissions") {
          columns = [
            { label: "Sr no.", position: "first",className:"w-[80px] max-w-[80px]" },
            {
              label: "Patient Name",
              className: "w-[150px] max-w-[150px]",
              sortable: true,
              sortDirection: sortBy === "patientName" ? (sortOrder.toLowerCase() as "asc" | "desc") : null,
              onSort: () => {
                setSortBy("patientName");
                setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                setCurrentPage(1);
              },
            },
            { label: "Patient UHID" },
            { label: "Contact Number" },
            { label: "Diagnosis", className: "w-[150px] max-w-[150px]" },
            { label: "Admission Type" },
            { label: "Patient Type" },
            { label: "Referring Doctor" },
            { label: "Action", position: "last", className: "cursor-pointer" },
          ];
        } else {
          // activeCard === "rooms"
          columns = [
            { label: "Sr no.", position: "first" },
            {
              label: "Room Number",
              sortable: true,
              sortDirection: sortBy === "roomNumber" ? (sortOrder.toLowerCase() as "asc" | "desc") : null,
              onSort: () => {
                setSortBy("roomNumber");
                setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                setCurrentPage(1);
              },
            },
            { label: "Room Type" },
            { label: "Bed Capacity" },
            { label: "Building Name" },
            { label: "Floor Name" },
            { label: "Branch Name" },
            { label: "Status" },
            { label: "Action", position: "last", className: "cursor-pointer" },
          ];
        }

        const rows: TableListingSection["rows"] = currentList.map((item, index) => {
          const sr = (currentPage - 1) * itemsPerPage + index + 1;

          if (activeCard === "referred") {
            const appointmentLookupId = resolveCounsellorAppointmentId(item);
            const isUhidLoading =
              appointmentLookupId != null && loadingAppointmentId === appointmentLookupId;
            const uhid = (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[#0B8C00] font-medium hover:underline cursor-pointer disabled:opacity-60"
                onClick={() => void handleViewPatientByUhid(item)}
                disabled={isUhidLoading}
              >
                {isUhidLoading ? <SpinnerLoader size={14} /> : null}
                {item.patientUhid || "N/A"}
              </button>
            );

            // console.log("itemygdtsftsdf",item?.branchId)
            const actions = (
              <Button
                variant="primary"
                size="xsmall"
                className="whitespace-nowrap"
                onClick={() => {
                  const patientId = item.patientId ?? item.id;
                  const appointmentId = item.appointmentId;
                  const query = appointmentId != null && appointmentId !== ""
                    ? `patientID=${patientId}&appointmentID=${appointmentId}&branchId=${item?.branchId}`
                    : `patientID=${patientId}`;
                  router.push(`/counsellor/start-counselling?${query}`);
                }}
              >
                Start Counselling
              </Button>
            );
            return [
              sr,
              <TruncatedTableCell key={`referred-name-${item.id ?? index}`} text={`${item.patientTitle} ${item.patientName || "N/A"}`} />,
              uhid,
              item.contactNumber || "N/A",
              <TruncatedTableCell
                key={`referred-diagnosis-${item.id ?? index}`}
                text={item.diagnosisSymptoms || "N/A"}
              />,
              item.doctorName || "N/A",
              actions,
            ];
          } else if (activeCard === "admissions") {
            const appointmentLookupId = resolveCounsellorAppointmentId(item);
            const isUhidLoading =
              appointmentLookupId != null && loadingAppointmentId === appointmentLookupId;
            const uhid = (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[#0B8C00] font-medium hover:underline cursor-pointer disabled:opacity-60"
                onClick={() => void handleViewPatientByUhid(item)}
                disabled={isUhidLoading}
              >
                {isUhidLoading ? <SpinnerLoader size={14} /> : null}
                {item.patientUhid || "N/A"}
              </button>
            );
            const actions = (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xsmall"
                  className="whitespace-nowrap"
                  onClick={() => setPendingAction({ type: "refer", item })}
                >
                  Refer to OPD
                </Button>
                <Button
                  variant="primary"
                  size="xsmall"
                  className="whitespace-nowrap"
                  onClick={() => setPendingAction({ type: "startAdmission", item })}
                >
                  Start Admission
                </Button>
              </div>
            );
            return [
              sr,
              <TruncatedTableCell key={`admission-name-${item.id ?? index}`} text={`${item?.patientTitle} ${item.patientName || "N/A"} `} />,
              uhid,
              item.contactNumber || "N/A",
              <TruncatedTableCell key={`admission-diagnosis-${item.id ?? index}`} text={item.diagnosis || "N/A"} />,
              item.admissionType || "N/A",
              item.patientType || "N/A",
              item.doctorName || "N/A",
              actions,
            ];
          } else {
            // activeCard === "rooms"
            const actions = (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xsmall"
                  className="whitespace-nowrap"
                >
                  View
                </Button>
                <Button
                  variant="primary"
                  size="xsmall"
                  className="whitespace-nowrap"
                  onClick={() => setPendingAction({ type: "startAdmission", item })}
                >
                  Start Admission
                </Button>
              </div>
            );

            const statusBadge = (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${item.status?.toLowerCase() === "vacant"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
                }`}>
                {item.status || "N/A"}
              </span>
            );

            return [
              sr,
              item.roomNumber || "N/A",
              item.roomType || "N/A",
              item.bedCapacity !== undefined && item.bedCapacity !== null ? String(item.bedCapacity) : "N/A",
              item.buildingName || "N/A",
              item.floorName || "N/A",
              item.branchName || "N/A",
              statusBadge,
              actions,
            ];
          }
        });

        return (
          <TableListingCard
            sections={[{
              id: activeCard,
              title: tableTitle,
              titleRightContent: (
                <div className="flex flex-wrap items-center gap-3">
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
                    width={280}
                    disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                  />
                  {activeCard === "rooms" && (
                    <div style={{ width: "300px" }}>
                      <FormSelectField
                        label="Room Type"
                        hideLabel
                        placeholder="Room Type"
                        options={roomTypeOptions}
                        value={selectedRoomType}
                        onChange={(val) => {
                          setSelectedRoomType(val as string);
                          setCurrentPage(1);
                        }}
                        background="normal"
                      />
                    </div>
                  )}
                  <div className="!w-[280px] min-w-[280px] max-w-[280px] shrink-0">
                    <TableSearchInput
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder="Search Here..."
                      className="!w-full"
                    />
                  </div>
                </div>
              ),
              columns,
              rows,
              emptyMessage,
              isLoading: isCurrentLoading,
              customContent: activeCard === "rooms" ? (
                filteredRooms.length === 0 ? (
                  <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                    {emptyMessage}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRooms.map((room, index) => (
                      <DashboardRoomCard
                        key={room.id}
                        room={room}
                        index={(currentPage - 1) * itemsPerPage + index + 1}
                      />
                    ))}
                  </div>
                )
              ) : undefined,
              pagination: {
                currentPage,
                totalItems: activeCard === "rooms" ? (selectedRoomType ? filteredRooms.length : (roomsRes?.total || 0)) : totalItems,
                itemsPerPage,
                onPageChange: setCurrentPage,
                onItemsPerPageChange: (items: number) => { setItemsPerPage(items); setCurrentPage(1); },
                itemsPerPageOptions: activeCard === "rooms" ? [8, 12, 24, 48, 100] : [10, 30, 50, 100],
              },
            }]}
          />
        );
      })()}
        </>
      )}

      {/* Action Confirmation Dialog */}
      <MessageDialog
        open={!!pendingAction}
        onClose={() => { if (!isSubmitting) setPendingAction(null); }}
        icon="/icons/questionMark.svg"
        iconBgColor="transparent"
        message={
          pendingAction ? (
            pendingAction.type === "refer" ? (
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-[#1E293B] mb-1">Refer to OPD</span>
                <span className="text-sm text-[#475569] max-w-[290px]">
                  Are you sure you want to refer{" "}
                  <strong className="text-[#0B8C00]">
                    {pendingAction.item.patientName || "this patient"}
                  </strong>{" "}
                  back to OPD?
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-[#1E293B] mb-1">Confirm Admission</span>
                <span className="text-sm text-[#475569] max-w-[290px]">
                  Are you sure you want to proceed with the admission process for{" "}
                  <strong className="text-[#0B8C00]">
                    {pendingAction.item.patientName || `Room ${pendingAction.item.roomNumber}`}
                  </strong>
                  ?
                </span>
              </div>
            )
          ) : null
        }
        confirmText="Confirm"
        cancelText="Cancel"
        showCancel
        isActionLoading={isSubmitting}
        onConfirm={async () => {
          if (!pendingAction || isSubmitting) return;
          if (pendingAction.type === "refer") {
            await handleReferToOPD(pendingAction.item);
          } else if (pendingAction.type === "startAdmission") {
            await handleStartAdmission(pendingAction.item);
          }
          setPendingAction(null);
        }}
        onCancel={() => { if (!isSubmitting) setPendingAction(null); }}
      />

      {/* Standard Feedback Dialogs */}
      <MessageDialog
        open={!!successDialogConfig}
        onClose={() => setSuccessDialogConfig(null)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successDialogConfig?.message || ""}
        confirmText={successDialogConfig?.confirmText || "OK"}
        cancelText={successDialogConfig?.cancelText || "Close"}
        showCancel={successDialogConfig?.showCancel ?? false}
        onConfirm={() => {
          if (successDialogConfig?.onConfirm) {
            successDialogConfig.onConfirm();
          }
          setSuccessDialogConfig(null);
        }}
        onCancel={() => {
          if (successDialogConfig?.onCancel) {
            successDialogConfig.onCancel();
          }
          setSuccessDialogConfig(null);
        }}
      />

      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => setShowApiErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowApiErrorDialog(false)}
      />
    </AppShell>
  );
}
