"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "@/components/ui";
import {
  useGetCounsellorStatsQuery,
  useGetReferredPatientsQuery,
  useGetTodayAdmissionsQuery,
  useGetTodayAvailableRoomsQuery,
  useRevertToOpdMutation,
  useLazyCheckFirstDayPaymentQuery,
} from "@/store/api/counsellorApi";
import { useDebounce } from "@/hooks/useDebounce";
import RoomAllocation from "../start-counselling/roomAllowcation";

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
  };
  index: number;
}

function DashboardRoomCard({ room, index }: DashboardRoomCardProps) {
  const isVacant =
    room.status?.toLowerCase() === "vacant" ||
    room.status?.toLowerCase() === "available" ||
    !room.status;

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
            <span className="text-[10px] font-bold text-[#7E8B9A] uppercase tracking-wider">Room Number</span>
            <span className="font-bold text-[#262D3B] text-base mt-0.5">{room.roomNumber || "N/A"}</span>
          </div>
        </div>

        {/* Status Pill Badge */}
        <span
          className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold border ${isVacant
            ? "border-[#0B8C00]/20 bg-[#0B8C00]/5 text-[#0B8C00]"
            : "border-[#F6776E]/20 bg-[#F6776E]/5 text-[#F6776E]"
            }`}
        >
          {isVacant ? "Available" : room.status}
        </span>
      </div>

      {/* 2. Body / Details Section (2-Column block) */}
      <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-[#7E8B9A] font-semibold text-[10px] uppercase tracking-wider">Floor</span>
          <span className="font-semibold text-[#262D3B] text-sm mt-0.5">{room.floorName || "N/A"}</span>
        </div>

        <div className="flex flex-col gap-0.5 relative">
          <span className="text-[#7E8B9A] font-semibold text-[10px] uppercase tracking-wider">Building</span>
          <span
            className="font-semibold text-[#262D3B] text-sm mt-0.5 truncate"
            title={room.buildingName || "N/A"}
          >
            {room.buildingName || "N/A"}
          </span>


        </div>

        <div className="flex flex-col gap-0.5 col-span-2">
          <span className="text-[#7E8B9A] font-semibold text-[10px] uppercase tracking-wider">Room Type</span>
          <span className="font-semibold text-[#262D3B] text-sm mt-0.5">{room.roomType || "N/A"}</span>
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
  const [activeAllocationPatient, setActiveAllocationPatient] = useState<{ patient: any; payment: any } | null>(null);

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

  const [revertToOpd] = useRevertToOpdMutation();
  const [checkFirstDayPayment] = useLazyCheckFirstDayPaymentQuery();

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

  const handleStartAdmission = async (item: any) => {
    setIsSubmitting(true);
    try {
      const res = await checkFirstDayPayment(item.id).unwrap();
      if (res.success) {
        const remaining = parseFloat(res.data.remainingForFirstDay || "0");
        const complete = res.data.firstDayPaymentComplete;

        if (remaining > 0 || !complete) {
          // Case A: Payment not completed
          setSuccessDialogConfig({
            message: (
              <div className="flex flex-col items-center text-center">
                <span className="text-sm text-[#475569]">
                  First day payment is not completed. Please complete the remaining amount{" "}
                  <strong className="text-[#F6776E]">{res.data.remainingForFirstDay || "1500.00"}</strong> first, then proceed with room allocation.
                </span>
              </div>
            ),
            confirmText: "OK",
            showCancel: false,
          });
        } else {
          // Case B: Payment completed
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
              setActiveAllocationPatient({
                patient: item,
                payment: res.data
              });
            },
          });
        }
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

  // Reset page when debounced search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // API Queries
  const { data: statsRes, isLoading: isStatsLoading, refetch: refetchStats } = useGetCounsellorStatsQuery();
  const statsData = statsRes?.data;

  // 1. Referred Patients Query
  const referredParams = {
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy === "patientName" || sortBy === "doctorName" ? sortBy : "patientName",
    order: sortOrder,
    page: currentPage,
    limit: itemsPerPage,
  };
  const {
    data: referredRes,
    isLoading: isReferredLoading,
    refetch: refetchReferred,
    isUninitialized: isReferredUninitialized,
  } = useGetReferredPatientsQuery(referredParams, { skip: activeCard !== "referred" });

  // 2. Today's Admissions Query
  const admissionsParams = {
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy === "patientName" ? "patientName" : undefined,
    order: sortOrder,
    page: currentPage,
    limit: itemsPerPage,
  };
  const {
    data: admissionsRes,
    isLoading: isAdmissionsLoading,
    refetch: refetchAdmissions,
    isUninitialized: isAdmissionsUninitialized,
  } = useGetTodayAdmissionsQuery(admissionsParams, { skip: activeCard !== "admissions" });

  // 3. Available Rooms Query
  const roomsParams = {
    search: debouncedSearch.trim() || undefined,
    sortBy: sortBy === "roomNumber" ? "roomNumber" : undefined,
    order: sortOrder,
    page: currentPage,
    limit: itemsPerPage,
  };
  const { data: roomsRes, isLoading: isRoomsLoading } = useGetTodayAvailableRoomsQuery(
    roomsParams,
    { skip: activeCard !== "rooms" }
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
      {activeAllocationPatient ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <PageHeading title={`Room Allocation - ${activeAllocationPatient.patient.patientName || "Patient"}`} />
            <Button
              variant="outline"
              onClick={() => setActiveAllocationPatient(null)}
            >
              ← Back to Dashboard
            </Button>
          </div>

          <RoomAllocation
            activePackage={{
              id: activeAllocationPatient.payment?.patientPackageId?.toString(),
              packageName: activeAllocationPatient.patient?.packageName || "Selected Package",
              branchRoomType: {
                roomRentPrice: parseFloat(activeAllocationPatient.payment?.perDayCost || "1500")
              }
            }}
            patientId={activeAllocationPatient.patient?.patientId || activeAllocationPatient.patient?.id}
            patientPackageId={activeAllocationPatient.payment?.patientPackageId}
            patientDetails={{
              patientName: activeAllocationPatient.patient?.patientName,
              patientUhid: activeAllocationPatient.patient?.patientUhid,
              contactNumber: activeAllocationPatient.patient?.contactNumber,
              diagnosis: activeAllocationPatient.patient?.diagnosis,
              doctorName: activeAllocationPatient.patient?.doctorName,
            }}
            onSuccess={() => {
              setActiveAllocationPatient(null);
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
            onCancel={() => setActiveAllocationPatient(null)}
          />
        </div>
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
            { label: "Sr no.", position: "first" },
            {
              label: "Patient Name",
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
            { label: "Diagnosis / Symptoms" },
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
            { label: "Sr no.", position: "first" },
            {
              label: "Patient Name",
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
            { label: "Diagnosis" },
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
            const uhid = (
              <span className="text-[#0B8C00] font-medium cursor-pointer">
                  {/* //  <span className="text-[#434956] font-medium"> */}
                {item.patientUhid || "N/A"}
              </span>
            );
            const actions = (
              <Button
                variant="primary"
                size="xsmall"
                className="whitespace-nowrap"
                onClick={() => {
                  const patientId = item.patientId ?? item.id;
                  const appointmentId = item.appointmentId;
                  const query = appointmentId != null && appointmentId !== ""
                    ? `patientID=${patientId}&appointmentID=${appointmentId}`
                    : `patientID=${patientId}`;
                  router.push(`/counsellor/start-counselling?${query}`);
                }}
              >
                Start Counselling
              </Button>
            );
            return [
              sr,
              item.patientName || "N/A",
              uhid,
              item.contactNumber || "N/A",
              item.diagnosisSymptoms || "N/A",
              item.doctorName || "N/A",
              actions,
            ];
          } else if (activeCard === "admissions") {
            const uhid = (
              <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline">
                {item.patientUhid || "N/A"}
              </span>
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
              item.patientName || "N/A",
              uhid,
              item.contactNumber || "N/A",
              item.diagnosis || "N/A",
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
                <div className="flex items-center gap-3">
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
                  <div style={{ width: "300px" }}>
                    <TableSearchInput
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder="Search Here..."
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
                itemsPerPageOptions: activeCard === "rooms" ? [6, 8, 12, 24, 48, 100] : [10, 20, 50, 100],
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
