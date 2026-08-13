"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  FormSelectField,
  Pagination,
  SpinnerLoader,
  TableSearchInput,
  Tabs,
  Tooltip,
} from "@/components/ui";
import {
  NurseAllocationView,
  type NurseAllocationPatient,
} from "@/components/ipd-head-nurse/NurseAllocationView";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGetRoomAssignmentListQuery,
  type RoomAssignmentListItem,
  type RoomAssignmentNurse,
} from "@/store/api/ipdHeadNurseAPI";
import { useGetFloorDropdownQuery } from "@/store/api/commonApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

type RoomUsageTab = "male" | "female" | "mixed";

const ROOM_USAGE_TABS: Array<{ id: RoomUsageTab; label: string }> = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "mixed", label: "General" },
];

const PAGINATION_OPTIONS = [8, 12, 16, 24];
const DEFAULT_PAGE_SIZE = 8;

function formatShiftLabel(shift: string) {
  if (!shift) return "N/A";
  return shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase();
}

function formatRoomTypeLabel(roomType: string) {
  if (!roomType) return "In-patient";
  return roomType
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getNurseByShift(nurses: RoomAssignmentNurse[], shift: string) {
  return (
    nurses.find((nurse) => nurse.shift?.trim().toLowerCase() === shift) ?? null
  );
}

const packageformatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-GB");
};

function SummaryStat({
  label,
  value,
  iconSrc,
  iconTone,
}: {
  label: string;
  value: string;
  iconSrc: string;
  iconTone: "success" | "warning" | "danger" | "neutral";
}) {
  const toneClass =
    iconTone === "success"
      ? "bg-[#0B8C00]/10"
      : iconTone === "warning"
        ? "bg-[#CA8A04]/15"
        : iconTone === "danger"
          ? "bg-[#DC2626]/10"
          : "bg-[#0B8C00]/10";

  return (
    <div className="flex items-center justify-between rounded-[20px] border border-[#E3EEE1] bg-white px-5 py-4 shadow-[0px_12px_24px_rgba(34,56,43,0.05)]">
      <div>
        <p className="text-[13px] font-medium text-[#434956] ">{label}</p>
        <p className="mt-2 text-[22px] font-semibold leading-none text-[#434956]">
          {value}
        </p>
      </div>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full`}
      >
        <Image src={iconSrc} alt="" width={36} height={36} />
      </div>
    </div>
  );
}

function formatRoomBedLabel(roomNumber?: string, bedNumber?: string) {
  const room = roomNumber?.trim() || "";
  const bed = bedNumber?.trim() || "";

  if (!room && !bed) return "N/A";
  if (room && bed) return `${room} / ${bed}`;
  return room || bed;
}

function mapRoomToAllocationPatient(
  room: RoomAssignmentListItem,
): any {
  return {
    id: room.id,
    patientTitle: room.patientTitle,
    patientName: room.patientName,
    bed: room.bedNumber,
    packageEndDate: room.packageEndDate,
    uhid : room?.uhid,
    age: room?.age,
    gender: room?.gender || "",
    doctorName : room?.doctorName,
    packageName : room?.packageName,
    packageDate: `${packageformatDate(room?.packageStartDate || "")} - ${packageformatDate(room?.packageEndDate || "")}`,
    status : room?.type

  };
}

function RoomAssignmentCard({
  room,
  index,
  onManage,
}: {
  room: RoomAssignmentListItem;
  index: number;
  onManage: (room: RoomAssignmentListItem) => void;
}) {
  const nurses = room.nurses ?? [];
  const isUrgent = nurses.length === 0;
  const morningNurse = getNurseByShift(nurses, "morning");
  const eveningNurse = getNurseByShift(nurses, "evening");
  const nightNurse = getNurseByShift(nurses, "night");
  const roomBedLabel = formatRoomBedLabel(room.roomNumber, room.bedNumber);

  return (
    <div className="flex h-full flex-col rounded-[18px] border border-[#E3EEE1] bg-white p-4 shadow-[0px_12px_24px_rgba(34,56,43,0.05)]">
      <div className="-mx-4 mb-4 flex items-start justify-between gap-3 border-b border-[#E5E7EB] px-4 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E9EBEA] bg-[#F4F6F4] text-sm font-medium text-[#7E828A]">
            {index}
          </span>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12px] font-normal tracking-wider text-[#525763]">
              Room No./Bed No.
            </span>
            <Tooltip
              position="top"
              maxWidth={420}
              content={
                <span className="whitespace-normal break-words">{roomBedLabel}</span>
              }
            >
              <span className="mt-0.5 block cursor-default break-words text-[14px] font-semibold leading-snug text-[#434956]">
                {roomBedLabel}
              </span>
            </Tooltip>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#0B8C0033] px-2.5 py-1 text-xs font-medium text-[#0B8C00]">
          {formatRoomTypeLabel(room.roomType)}
        </span>
      </div>


      {/* <div className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm"> */}
      <div className="grid w-full flex-1 grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-sm">
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Patient Name</p>
          <Tooltip
            position="top"
            content={
              <span className="max-w-xs whitespace-normal break-words">
               {`${room.patientTitle ? `${room.patientTitle} ` : ""}${room.patientName || "N/A"}`}
              </span>
            }
          >
            <span className="mt-0.5 block w-full cursor-default truncate text-[13px] font-medium text-[#262D3B]">
               {`${room.patientTitle ? `${room.patientTitle} ` : ""}${room.patientName || "N/A"}`}
            </span>
          </Tooltip>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-light text-[12px] text-[#434956]">Patient UHID</p>
          <p className="mt-0.5 truncate text-[13px] font-medium text-[#262D3B]">
            {room.uhid || "N/A"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Diagnosis</p>
          <p className="mt-0.5 truncate text-[13px] font-medium text-[#262D3B]">
            {room.diagnosis || "N/A"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Doctor Name</p>
          <p className="mt-0.5 truncate text-[13px] font-medium text-[#262D3B]">
            {room.doctorName || "N/A"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Assigned Staff</p>
          <p
            className={`mt-0.5 truncate font-medium ${morningNurse ? "text-[#262D3B]" : "text-[#DC2626]"}`}
          >
            {morningNurse?.nurseName ?? "Unassigned"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Shift</p>
          <p
            className={`mt-0.5 truncate font-medium ${morningNurse ? "text-[#262D3B]" : "text-[#DC2626]"}`}
          >
            {morningNurse ? formatShiftLabel(morningNurse.shift) : "Morning"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Assigned Staff</p>
          <p
            className={`mt-0.5 truncate font-medium ${eveningNurse ? "text-[#262D3B]" : "text-[#DC2626]"}`}
          >
            {eveningNurse?.nurseName ?? "Unassigned"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Shift</p>
          <p
            className={`mt-0.5 truncate font-medium ${eveningNurse ? "text-[#262D3B]" : "text-[#DC2626]"}`}
          >
            {eveningNurse ? formatShiftLabel(eveningNurse.shift) : "Evening"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Assigned Staff</p>
          <p
            className={`mt-0.5 truncate font-medium ${nightNurse ? "text-[#262D3B]" : "text-[#DC2626]"}`}
          >
            {nightNurse?.nurseName ?? "Unassigned"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-light text-[#434956]">Shift</p>
          <p
            className={`mt-0.5 truncate font-medium ${nightNurse ? "text-[#262D3B]" : "text-[#DC2626]"}`}
          >
            {nightNurse ? formatShiftLabel(nightNurse.shift) : "Night"}
          </p>
        </div>
      </div>

      <div className="-mx-4 mt-5 border-t border-[#E5E7EB] px-4 pt-4">
        <button
          type="button"
          onClick={() => onManage(room)}
          className={`w-full rounded-full border px-4 py-1.5 text-sm font-medium transition-colors  ${
            isUrgent
              ? "border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2]"
              : "border-[#0B8C00] text-[#0B8C00] hover:bg-[#F3FAF2]"
          }`}
        >
          {isUrgent ? "Urgent Assign" : "Manage"}
        </button>
      </div>
    </div>
  );
}

export default function RoomAssignmentsPage() {
  const [activeRoomUsage, setActiveRoomUsage] = useState<RoomUsageTab>("male");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [allocationPatient, setAllocationPatient] =
    useState<NurseAllocationPatient | null>(null);
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
  }, [
    debouncedSearch,
    selectedBranch,
    resolvedFilterBranchId,
    activeRoomUsage,
    selectedFloor,
  ]);

  const { data: floorDropdownRes, isLoading: isLoadingFloors } =
    useGetFloorDropdownQuery(
      resolvedFilterBranchId == null
        ? undefined
        : { branchId: resolvedFilterBranchId },
      { skip: resolvedFilterBranchId == null },
    );

  const floorOptions = useMemo<SelectOption[]>(() => {
    const items = floorDropdownRes?.data ?? [];
    return items.map((item) => ({
      value: String(item.id),
      label: item.floor ?? item.name ?? "",
    }));
  }, [floorDropdownRes]);

  const roomAssignmentParams =
    resolvedFilterBranchId == null
      ? null
      : {
          branchId: resolvedFilterBranchId,
          search: debouncedSearch.trim() || undefined,
          roomUsage: activeRoomUsage,
          floorId: selectedFloor || undefined,
          page: currentPage,
          limit: itemsPerPage,
        };

  const {
    data: roomAssignmentRes,
    isLoading: isRoomAssignmentLoading,
    isFetching: isRoomAssignmentFetching,
    refetch: refetchRoomAssignment,
  } = useGetRoomAssignmentListQuery(roomAssignmentParams!, {
    skip: roomAssignmentParams == null,
    refetchOnMountOrArgChange: true,
  });

  const rooms = roomAssignmentRes?.data ?? [];
  const totalItems = roomAssignmentRes?.total ?? 0;
  const roomStats = roomAssignmentRes?.roomStats;
  const isTableLoading =
    resolvedFilterBranchId == null ||
    isRoomAssignmentLoading ||
    isRoomAssignmentFetching;

  const currentDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  const handleManageRoom = (room: RoomAssignmentListItem) => {
    setAllocationPatient(mapRoomToAllocationPatient(room));
  };

  if (allocationPatient) {
    return (
      <AppShell>
        <NurseAllocationView
          patient={allocationPatient}
          branchId={resolvedFilterBranchId}
          assignMode="assignOrChangeNurse"
          prefillAssignedNurses
          onBack={() => setAllocationPatient(null)}
          onConfirm={() => {
            setAllocationPatient(null);
            void refetchRoomAssignment();
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
            Room Assignments
          </h1>
          <p className="mt-1 text-sm text-[#525763]">
            Allocate staff to rooms. Please select staff for each room.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat
            label="Fully Assigned"
            value={`${roomStats?.fullyOccupied ?? 0} Rooms`}
            iconSrc="/icons/thickGreenCircleTick.svg"
            iconTone="success"
          />
          <SummaryStat
            label="Partial"
            value={`${roomStats?.partiallyOccupied ?? 0} Rooms`}
            iconSrc="/icons/yellowInvalidIcon.svg"
            iconTone="warning"
          />
          <SummaryStat
            label="Unassigned"
            value={`${roomStats?.vacant ?? 0} Rooms`}
            iconSrc="/icons/darkmehroolCrossicon.svg"
            iconTone="danger"
          />
          <SummaryStat
            label="Current Date"
            value={currentDateLabel}
            iconSrc="/icons/tentativeIcon.svg"
            iconTone="neutral"
          />
        </div>

        <section className="rounded-[20px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          {/* Filter */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-5">
            <div className="w-full xl:max-w-[520px]">
              <Tabs
                options={ROOM_USAGE_TABS.map((tab) => ({
                  label: tab.label,
                  value: tab.id,
                }))}
                value={activeRoomUsage}
                onChange={(value) => setActiveRoomUsage(value as RoomUsageTab)}
              />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
              <div className="w-full sm:w-[280px]">
                <FormSelectField
                  label="Branch"
                  hideLabel
                  options={hookBranchFilterOptions}
                  value={selectedBranch}
                  onChange={(value) => {
                    setSelectedBranch(
                      Array.isArray(value) ? value[0] : value || "",
                    );
                    setCurrentPage(1);
                  }}
                  placeholder={
                    isLoadingBranchFilter
                      ? "Loading branches..."
                      : "Select Branch"
                  }
                  mode="single"
                  background="normal"
                  width="100%"
                  height={44}
                  disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                />
              </div>

              <div className="w-full sm:w-[280px]">
                <FormSelectField
                  label="Floor"
                  hideLabel
                  options={floorOptions}
                  value={selectedFloor}
                  onChange={(value) => {
                    setSelectedFloor(Array.isArray(value) ? value[0] : value || "");
                    setCurrentPage(1);
                  }}
                  placeholder={isLoadingFloors ? "Loading floors..." : "Select Floor"}
                  mode="single"
                  background="normal"
                  width="100%"
                  height={44}
                  disabled={isLoadingFloors}
                />
              </div>

              <div className="w-full sm:w-[280px]">
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

          {isTableLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9CA3AF]">
              <SpinnerLoader size={18} />
              Loading room assignments...
            </div>
          ) : rooms.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#9CA3AF]">
              No room assignments found.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {rooms.map((room, roomIndex) => (
                <RoomAssignmentCard
                  key={`${room.id}-${room.roomId}`}
                  room={room}
                  index={(currentPage - 1) * itemsPerPage + roomIndex + 1}
                  onManage={handleManageRoom}
                />
              ))}
            </div>
          )}

          {totalItems > 0 ? (
            <div className="mt-5">
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
