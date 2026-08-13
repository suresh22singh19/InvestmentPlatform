"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackToPreviousPageButton,
  Button,
  Checkbox,
  FormSelectField,
  MessageDialog,
  SpinnerLoader,
  Tooltip,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useGetNurseDropdownQuery,
  useGetUnassignedRoomListQuery,
  useBulkNurseAssignmentMutation,
  useLazyGetYesterdayNurseAssignmentsQuery,
  type UnassignedPatientRoomData,
} from "@/store/api/ipdHeadNurseAPI";
import { useBulkReassignNursesMutation } from "@/store/api/ipdStaffNurseAPI";
import {
  useGetBuildingDropdownQuery,
  useGetFloorDropdownQuery,
  useGetRoomTypeDropdownQuery,
} from "@/store/api/commonApi";

type ShiftType = "morning" | "evening" | "night";

type BedInfo = {
  id: string;
  patientId: number;
  bedNumber: string;
  patientName: string;
  uhid: string;
  bedStatus: string;
  nurseId: string;
  originalNurseId: string;
  packageEndDate?: Date | null | undefined;
  packageStartDate?: Date | null | undefined;
  packageName?: string;

};

type RoomCard = {
  id: string;
  roomId: number;
  index: number;
  name: string;
  buildingName: string;
  floorName: string;
  roomType: string;
  roomTypeCode: string;
  totalBeds: number;
  occupiedBeds: number;
  beds: BedInfo[];
};

type AllNurseAllocationProps = {
  branchId?: number | null;
  initialShift?: ShiftType;
  onBack: () => void;
  onConfirm?: () => void;
};

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Morning",
  evening: "Evening",
  night: "Night",
};

const ALL_OPTION: SelectOption = { value: "", label: "All" };

function getMonthDays(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return { date, dayLabel: DAY_LABELS[date.getDay()], dateNum: index + 1 };
  });
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isBeforeToday(date: Date) {
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  return compare < getTodayStart();
}

function parsePackageEndDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatSelectedDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatSelectedWeekday(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatShiftDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TRUNCATED_TABLE_CELL_WIDTH = 120;


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

function TruncatedInlineText({ text, className }: { text: string; className?: string }) {
  const value = text?.trim() ? text.trim() : "N/A";
  const textRef = useRef<HTMLParagraphElement>(null);
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
      maxWidth={280}
      disabled={!isTruncated}
      content={
        <span className="whitespace-normal break-words text-xs leading-[1.6] text-[#262D3B]">
          {value}
        </span>
      }
    >
      <p ref={textRef} className={className}>
        {value}
      </p>
    </Tooltip>
  );
}


function formatRoomType(roomType: string) {
  if (!roomType) return "N/A";
  return roomType.replace(/^ipd-/i, "");
}

function getAssignedNurseIdForShift(
  nurses: UnassignedPatientRoomData["beds"][number]["nurses"],
  shift: ShiftType,
  selectedDate: Date
) {
  if (!nurses?.length) return "";

  const selectedDateValue = formatShiftDate(selectedDate);
  const assignedNurse = nurses.find((nurse) => {
    const nurseShift = nurse.shift?.trim().toLowerCase();
    const nurseDate = nurse.allocationDate?.split("T")[0];
    return nurseShift === shift && nurseDate === selectedDateValue;
  });

  return assignedNurse?.nurseId != null ? String(assignedNurse.nurseId) : "";
}

function mapApiRoomToRoomCard(
  room: UnassignedPatientRoomData,
  index: number,
  shift: ShiftType,
  selectedDate: Date
): any {
  return {
    id: `room-${room.roomId}`,
    roomId: room.roomId,
    index,
    name: room.roomNumber,
    buildingName: room.buildingName,
    floorName: room.floorName,
    roomType: room.roomType,
    roomTypeCode: room.roomTypeCode ?? room.roomType,
    totalBeds: room.totalBeds,
    occupiedBeds: room.occupiedBeds,
    beds: room.beds.map((bed) => {
      const assignedNurseId = getAssignedNurseIdForShift(bed.nurses, shift, selectedDate);
      console.log("roomgdyweet",room)
      return {
        id: String(bed.patientRoomId),
        patientId: bed.patientId,
        bedNumber: bed.bedNumber,
        patientName: `${bed.patientTitle ? `${bed.patientTitle} ` : ""}${bed.patientName}`,
        uhid: bed.uhid,
        bedStatus: bed.bedStatus,
        nurseId: assignedNurseId,
        originalNurseId: assignedNurseId,
        packageName:  bed?.packageName,
        packageStartDate: parsePackageEndDate(bed.packageStartDate),
        packageEndDate: parsePackageEndDate(bed.packageEndDate),
      };
    }),
  };
}

const packageformatDate = (date?: string | Date | null) => {
  if (!date) return "";
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toLocaleDateString("en-GB");
};

export function AllNurseAllocation({ branchId, initialShift, onBack }: AllNurseAllocationProps) {
  const [selectedShift, setSelectedShift] = useState<ShiftType>(initialShift ?? "evening");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [buildingFilter, setBuildingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("");
  const [bedNurseOverrides, setBedNurseOverrides] = useState<Record<string, string>>({});
  const [nurseSelectionErrors, setNurseSelectionErrors] = useState<Record<string, boolean>>({});
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [showToast, setShowToast] = useState(false);

  const showMessage = (message: string, variant: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };
  const [isAllocationConfirmed, setIsAllocationConfirmed] = useState(false);
  const selectedDayRef = useRef<HTMLButtonElement>(null);

  const {
    data: unassignedRoomsRes,
    isLoading: isRoomsLoading,
    isFetching: isRoomsFetching,
      refetch,
  } = useGetUnassignedRoomListQuery(
    {
      branchId: branchId!,
      buildingId: buildingFilter || undefined,
      floorId: floorFilter || undefined,
      date: formatShiftDate(selectedDate),
    },

    { skip: branchId == null, refetchOnMountOrArgChange: true }
  );

  const { data: nurseDropdownRes, isLoading: isNurseDropdownLoading } = useGetNurseDropdownQuery(
    { branchId: branchId!, date: formatShiftDate(selectedDate), shift: selectedShift },
    { skip: branchId == null, refetchOnMountOrArgChange: true }
  );

  const { data: buildingDropdownRes } = useGetBuildingDropdownQuery(
    { branchId: branchId! },
    { skip: branchId == null }
  );

  const { data: floorDropdownRes } = useGetFloorDropdownQuery(
    { branchId: branchId! },
    { skip: branchId == null }
  );

  const { data: roomTypeDropdownRes } = useGetRoomTypeDropdownQuery(
    { branchId: branchId! },
    { skip: branchId == null }
  );

  const [bulkNurseAssignment, { isLoading: isConfirmingAllocation }] = useBulkNurseAssignmentMutation();
  const [bulkReassignNurses, { isLoading: isReassigningRoom }] = useBulkReassignNursesMutation();
  const [fetchYesterdayNurseAssignments, { isFetching: isCopyingYesterday }] =
    useLazyGetYesterdayNurseAssignmentsQuery();

  const nurses = useMemo(() => nurseDropdownRes?.data ?? [], [nurseDropdownRes]);

  const nurseOptions = useMemo<SelectOption[]>(
    () => [{ value: "", label: "Select Nurse" }, ...nurses.map((nurse) => ({ value: String(nurse.id), label: nurse.name }))],
    [nurses]
  );

  const isRoomListLoading = isRoomsLoading || isRoomsFetching;
  const apiRooms = useMemo(() => unassignedRoomsRes?.data ?? [], [unassignedRoomsRes]);

  const allRooms = useMemo<RoomCard[]>(
    () => apiRooms.map((room, index) => mapApiRoomToRoomCard(room, index + 1, selectedShift, selectedDate)),
    [apiRooms, selectedShift, selectedDate]
  );

  const shiftDateKey = `${selectedShift}::${formatShiftDate(selectedDate)}`;
  const overrideKey = (bedId: string) => `${bedId}::${shiftDateKey}`;

  const rooms = useMemo(
    () =>
      allRooms.map((room) => ({
        ...room,
        beds: room.beds.map((bed) => ({
          ...bed,
          nurseId: bedNurseOverrides[`${bed.id}::${shiftDateKey}`] ?? bed.nurseId,
        })),
      })),
    [allRooms, bedNurseOverrides, shiftDateKey]
  );

  const buildingOptions = useMemo<SelectOption[]>(() => {
    const items = buildingDropdownRes?.data ?? [];
    return [ALL_OPTION, ...items.map((item) => ({ value: String(item.id), label: item.name }))];
  }, [buildingDropdownRes]);

  const floorOptions = useMemo<any[]>(() => {
    const items = floorDropdownRes?.data ?? [];
    return [ALL_OPTION, ...items.map((item) => ({ value: String(item.id), label: item.floor }))];
  }, [floorDropdownRes]);

  const hasSetDefaultBuildingRef = useRef(false);
  const hasSetDefaultFloorRef = useRef(false);

  useEffect(() => {
    const items = buildingDropdownRes?.data ?? [];
    if (!hasSetDefaultBuildingRef.current && items.length > 0) {
      hasSetDefaultBuildingRef.current = true;
      setBuildingFilter(String(items[0].id));
    }
  }, [buildingDropdownRes]);

  useEffect(() => {
    const items = floorDropdownRes?.data ?? [];
    if (!hasSetDefaultFloorRef.current && items.length > 0) {
      hasSetDefaultFloorRef.current = true;
      setFloorFilter(String(items[0].id));
    }
  }, [floorDropdownRes]);

  const roomTypeOptions = useMemo<SelectOption[]>(() => {
    const items = roomTypeDropdownRes?.data ?? [];
    return [
      ALL_OPTION,
      ...items.map((item) => ({ value: item.key ?? String(item.id), label: item.name })),
    ];
  }, [roomTypeDropdownRes]);

  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) => {
        if (roomTypeFilter && room.roomTypeCode !== roomTypeFilter && room.roomType !== roomTypeFilter) return false;
        return true;
      }),
    [rooms, roomTypeFilter]
  );

  const monthDays = useMemo(
    () => getMonthDays(calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [calendarMonth]
  );

  const onDutyNurses = useMemo(() => {
    return nurses
      .map((nurse) => {
        const nurseId = String(nurse.id);
        const assignedBeds = rooms.flatMap((room) =>
          room.beds.filter((bed) => bed.nurseId === nurseId).map((bed) => bed.bedNumber)
        );
        return { id: nurseId, name: nurse.name, empId: nurse.empId, assignedBeds };
      })
      .filter((nurse) => nurse.assignedBeds.length > 0);
  }, [nurses, rooms]);

  const totalBeds = useMemo(
    () => filteredRooms.reduce((count, room) => count + room.beds.length, 0),
    [filteredRooms]
  );

  const updateBedNurse = (bedId: string, nurseId: string) => {
    setBedNurseOverrides((prev) => ({ ...prev, [overrideKey(bedId)]: nurseId }));
    if (nurseId) {
      setNurseSelectionErrors((prev) => {
        if (!prev[bedId]) return prev;
        const next = { ...prev };
        delete next[bedId];
        return next;
      });
    }
  };

  const removeBedFromNurse = (nurseId: string, bedNumber: string) => {
    setBedNurseOverrides((prev) => {
      const next = { ...prev };
      rooms.forEach((room) => {
        room.beds.forEach((bed) => {
          if (bed.nurseId === nurseId && bed.bedNumber === bedNumber) {
            next[overrideKey(bed.id)] = "";
          }
        });
      });
      return next;
    });
  };

  const handlePreviousMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDate = (date: Date) => {
    if (isBeforeToday(date)) return;
    setSelectedDate(date);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const handleSelectAll = () => {
    setSelectAll((prev) => !prev);
    setSelectedRoomIds([]);
  };

  const handleCopyYesterday = async () => {
    const selectedRooms = selectAll
      ? filteredRooms
      : filteredRooms.filter((room) => selectedRoomIds.includes(room.id));

    if (branchId == null || selectedRooms.length === 0) return;

    const roomIds = selectedRooms.map((room) => room.roomId).join(",");

    try {
      const res = await fetchYesterdayNurseAssignments({
        branchId,
        shift: selectedShift,
        roomIds,
      }).unwrap();

      const assignments = res.data ?? [];
      if (assignments.length === 0) {
        showMessage("No nurse allocation found for yesterday.", "error");
        return;
      }

      setBedNurseOverrides((prev) => {
        const next = { ...prev };
        selectedRooms.forEach((room) => {
          room.beds.forEach((bed) => {
            const match = assignments.find(
              (item) => item.roomId === room.roomId && item.bedNumber === bed.bedNumber
            );
            if (match) {
              next[overrideKey(bed.id)] = String(match.nurseId);
            }
          });
        });
        return next;
      });

      showMessage("Nurse allocation copied from the previous day.");
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to copy yesterday's nurse allocation. Please try again.";
      showMessage(message, "error");
    }
  };

  const handleAutoFill = () => {
    if (nurses.length === 0) return;
    setBedNurseOverrides((prev) => {
      const next = { ...prev };
      let cursor = 0;
      rooms.forEach((room) => {
        room.beds.forEach((bed) => {
          if (bed.nurseId) return;
          const nurse = nurses[cursor % nurses.length];
          cursor += 1;
          next[overrideKey(bed.id)] = String(nurse.id);
        });
      });
      return next;
    });
    showMessage("Unassigned beds were auto-filled with on-duty nurses.");
  };

  const handleSaveRoom = async (roomId: string) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;

    const reassign = room.beds
      .filter((bed) => bed.nurseId)
      .map((bed) => ({ patientId: bed.patientId, nurseId: Number(bed.nurseId) }));

    if (reassign.length === 0) {
      showMessage("Please select a nurse before saving.", "error");
      return;
    }

    try {
      const res = await bulkReassignNurses({
        shiftDate: formatShiftDate(selectedDate),
        shift: selectedShift,
        assign: reassign,
      }).unwrap();
      setSelectedRoomIds((prev) => prev.filter((id) => id !== roomId));
      showMessage(res.message || `${room.name} allocation saved.`, "success");
      void refetch();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to save nurse reassignment. Please try again.";
      showMessage(message, "error");
    }
  };

  const handleConfirmAllocation = async () => {
    const selectedRooms = filteredRooms.filter(
      (room) => selectAll || selectedRoomIds.includes(room.id)
    );

    const missingNurseErrors: Record<string, boolean> = {};
    selectedRooms.forEach((room) => {
      room.beds.forEach((bed) => {
        if (!bed.nurseId) {
          missingNurseErrors[bed.id] = true;
        }
      });
    });

    if (Object.keys(missingNurseErrors).length > 0) {
      setNurseSelectionErrors(missingNurseErrors);
      setIsAllocationConfirmed(false);
      return;
    }

    setNurseSelectionErrors({});

    const assign = filteredRooms.flatMap((room) =>
      room.beds
        .filter((bed) => bed.nurseId)
        .map((bed) => ({ patientId: bed.patientId, nurseId: Number(bed.nurseId) }))
    );

    if (assign.length === 0) {
      setIsAllocationConfirmed(false);
      showMessage("Please assign at least one nurse before confirming allocation.", "error");
      return;
    }

    try {
      const res = await bulkNurseAssignment({
        shiftDate: formatShiftDate(selectedDate),
        shift: selectedShift,
        assign,
      }).unwrap();
      setSelectedRoomIds([]);
      setIsAllocationConfirmed(true);
      showMessage(res.message || "Nurse allocation confirmed for the selected day and shift.", "success");
      void refetch();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to confirm nurse allocation. Please try again.";
      setIsAllocationConfirmed(false);
      showMessage(message, "error");
    }
  };

  const handleToastClose = () => {
    setShowToast(false);
    setIsAllocationConfirmed(false);
  };

 const clearFilters = () => {
  const buildingItems = buildingDropdownRes?.data ?? [];
  const floorItems = floorDropdownRes?.data ?? [];
  setBuildingFilter(buildingItems.length > 0 ? String(buildingItems[0].id) : "");
  setFloorFilter(floorItems.length > 0 ? String(floorItems[0].id) : "");
  setRoomTypeFilter("");

  // Optional: clear selected room
  setSelectedRoomIds([]);

  // Optional: clear local nurse overrides
  setBedNurseOverrides({});

  // Refetch API
  refetch();
};

const shouldShowSaveButton = useMemo(() => {
  if (selectAll || selectedRoomIds.length !== 1) return false;

  const selectedRoom = filteredRooms.find((room) =>
    selectedRoomIds.includes(room.id)
  );

  return selectedRoom
    ? selectedRoom.beds.some((bed) => bed.originalNurseId)
    : false;
}, [filteredRooms, selectedRoomIds, selectAll]);

console.log("selectedDatefhusdhu",selectedDate)
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px]">
            Nurse Allocation
          </h1>
          <p className="mt-0.5 text-sm text-[#525763] font-medium text-[13px] leading-[18px]">
            Pick a building, floor and room type, then assign rooms to nurses on duty for the selected day and shift.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <BackToPreviousPageButton className="h-[40px]" text="Back" onClick={onBack} />
          {/* <Button
            variant="primary"
            size="medium"
            className="!min-w-0 whitespace-nowrap"
            onClick={handleConfirmAllocation}
            disabled={isRoomListLoading || filteredRooms.length === 0 || isConfirmingAllocation}
          >
            {isConfirmingAllocation ? "Confirming..." : "Confirm Allocation"}
          </Button> */}
          <Button
          variant="primary"
          size="medium"
          className="!min-w-0 whitespace-nowrap"
          onClick={handleConfirmAllocation}
          // disabled={
          //   isRoomListLoading ||
          //   filteredRooms.length === 0 ||
          //   isConfirmingAllocation ||
          //   (!selectAll && selectedRoomIds.length === 0)
          // }

          disabled={
          isRoomListLoading ||
          filteredRooms.length === 0 ||
          isConfirmingAllocation ||
          (!selectAll && selectedRoomIds.length === 0) ||
          shouldShowSaveButton
        }


        //   disabled={
        //   isRoomListLoading ||
        //   filteredRooms.length === 0 ||
        //   isConfirmingAllocation ||
        //   (!selectAll && selectedRoomIds.length === 0) ||
        //   (!selectAll && selectedRoomIds.length === 1)
        // }
          >
        {isConfirmingAllocation ? "Confirming..." : "Confirm Allocation"}
         </Button>
        </div>
      </div>

      <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#262D3B]">{formatSelectedDate(selectedDate)}</span>
              <span className="rounded-full border border-[#0B8C00]/20 bg-[#0B8C000D] px-2.5 py-0.5 text-xs font-medium text-[#0B8C00]">
                {formatSelectedWeekday(selectedDate)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[#E3EEE1] bg-white p-1">
              {(["morning", "evening", "night"] as ShiftType[]).map((shift) => {
                const isActive = selectedShift === shift;
                return (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => setSelectedShift(shift)}
                    className={`flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium transition-colors ${
                      isActive ? "bg-[#0B8C00] text-white" : "text-[#434956] hover:bg-white"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        shift === "night" ? "bg-[#7C3AED]" : shift === "evening" ? "bg-[#FE9A00]" : "bg-[#0B8C00]"
                      }`}
                    />
                    {SHIFT_LABELS[shift]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleCopyYesterday}
              disabled={
                (selectAll ? filteredRooms.length === 0 : selectedRoomIds.length === 0) ||
                isCopyingYesterday
              }
              className="flex items-center gap-2 cursor-pointer font-normal text-[#434956] text-[14px] rounded-full border border-[#E3EEE1] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#FAFBFA] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <Image src="/icons/bedBlackIcon.svg.svg" alt="" width={14} height={14} />
              <span>{isCopyingYesterday ? "Copying..." : "Copy Yesterday"}</span>
            </button>
            {/* <Button variant="primary" size="small" className="!min-w-0 whitespace-nowrap" onClick={handleAutoFill}>
              Auto-Fill
            </Button> */}
          </div>
        </div>

        <div className="mt-5 flex items-stretch overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="flex w-10 shrink-0 items-center justify-center border-r border-[#E3EEE1] bg-white transition-colors hover:bg-[#FAFBFA]"
            aria-label="Previous month"
          >
            <Image src="/icons/LeftArrowIcon.svg" alt="" width={14} height={14} />
          </button>

          <div className="flex flex-1 overflow-x-auto">
            {monthDays.map((day) => {
              const isSelected = isSameDay(day.date, selectedDate);
              const isDisabled = isBeforeToday(day.date);

              return (
                <button
                  key={day.date.toISOString()}
                  ref={isSelected ? selectedDayRef : undefined}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(day.date)}
                  className={`flex min-w-[44px] flex-1 flex-col items-center justify-center border-r border-[#E3EEE1] px-2 py-3 transition-colors last:border-r-0 ${
                    isDisabled
                      ? "cursor-not-allowed bg-white text-[#C5C9D1] opacity-60"
                      : isSelected
                        ? "bg-[#0B8C00] text-white"
                        : "bg-white text-[#262D3B] hover:bg-[#FAFBFA]"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase">{day.dayLabel}</span>
                  <span className="mt-1 text-sm font-semibold">{day.dateNum}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex w-10 shrink-0 items-center justify-center border-l border-[#E3EEE1] bg-white transition-colors hover:bg-[#FAFBFA]"
            aria-label="Next month"
          >
            <Image src="/icons/LeftArrowIcon.svg" alt="" width={14} height={14} className="rotate-180" />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-lg font-medium">Filter</div>

              <div className="w-[200px] min-w-[160px] flex-1 sm:flex-none">
                <FormSelectField
                  label=""
                  hideLabel={false}
                  options={buildingOptions}
                  value={buildingFilter}
                  onChange={(value) =>
                    setBuildingFilter(Array.isArray(value) ? value[0] : value || "")
                  }
                  mode="single"
                  width="100%"
                  placeholder="Select Building"
                />
              </div>

              <div className="w-[200px] min-w-[160px] flex-1 sm:flex-none">
                <FormSelectField
                  label=""
                  hideLabel={false}
                  options={floorOptions}
                  value={floorFilter}
                  onChange={(value) =>
                    setFloorFilter(Array.isArray(value) ? value[0] : value || "")
                  }
                  mode="single"
                  width="100%"
                  placeholder="Select Floor"
                />
              </div>

              <div className="w-[200px] min-w-[160px] flex-1 sm:flex-none">
                <FormSelectField
                  label=""
                  hideLabel={false}
                  options={roomTypeOptions}
                  value={roomTypeFilter}
                  onChange={(value) =>
                    setRoomTypeFilter(Array.isArray(value) ? value[0] : value || "")
                  }
                  mode="single"
                  width="100%"
                  placeholder="Select Room Type"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#434956]">
                <Checkbox checked={selectAll} onChange={handleSelectAll} />
                Select All
              </label>

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[#EF4444]/30 bg-white px-4 py-2 text-xs font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {isRoomListLoading ? (
              <div className="col-span-full flex items-center justify-center gap-2 py-12 text-sm text-[#9CA3AF]">
                <SpinnerLoader size={18} />
                Loading room details...
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm text-[#9CA3AF]">
                No unassigned rooms found.
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isSelected = selectAll || selectedRoomIds.includes(room.id);
                const assignedCount = room.beds.filter((bed) => bed.nurseId).length;
                const hasExistingNurse = room.beds.some((bed) => bed.originalNurseId);
                const singleRoomSelected =
                !selectAll &&
                selectedRoomIds.length === 1 &&
                selectedRoomIds.includes(room.id);

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      if (selectAll) return;
                      setSelectedRoomIds((prev) =>
                        prev.includes(room.id)
                          ? prev.filter((id) => id !== room.id)
                          : [...prev, room.id]
                      );
                    }}
                    className={`cursor-pointer rounded-[16px] border bg-white p-4 transition-shadow ${
                      isSelected
                        ? "border-[#0B8C00] shadow-[0_0_0_1px_#0B8C00]"
                        : "border-[#E3EEE1] hover:border-[#0B8C00]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F6F4] text-xs font-semibold text-[#434956]">
                          {room.index}
                        </span>
                        <div>
                          <p className="text-[12px] font-normal text-[#525763] tracking-wider">Room Number</p>
                          <p className="text-sm font-semibold text-[#262D3B]">{room.name}</p>
                          <p className="text-[12px] font-normal text-[#434956] tracking-wider">
                            {room.buildingName} · {room.floorName} · {formatRoomType(room.roomType)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full border border-[#0B8C00]/20 bg-[#0B8C000D] px-2.5 py-0.5 text-xs font-medium text-[#0B8C00]">
                          {assignedCount}/{room.beds.length}
                        </span>
                        {/* {isSelected && hasExistingNurse ? ( */}
                        {/* {singleRoomSelected && hasExistingNurse ? (
                          <button
                            type="button"
                            disabled={isReassigningRoom}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleSaveRoom(room.id);
                            }}
                            className="w-[100px] rounded-full bg-[#0B8C00] px-3 py-1 text-[13px] font-medium text-white transition-colors hover:bg-[#097200] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isReassigningRoom ? "Saving..." : "Save"}
                          </button>
                        ) : null} */}
                        {singleRoomSelected && hasExistingNurse ? (
                        <button
                          type="button"
                          disabled={isReassigningRoom}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleSaveRoom(room.id);
                          }}
                          className="w-[100px] rounded-full bg-[#0B8C00] px-3 py-1 text-[13px] font-medium text-white transition-colors hover:bg-[#097200] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isReassigningRoom ? "Saving..." : "Save"}
                        </button>
                      ) : null}
                      </div>
                    </div>

                    {/* <div className="mt-4 space-y-3 border-t border-[#EDF3EA] pt-4"> */}
                    <div className="mt-4 max-h-[150px] space-y-3 overflow-y-auto border-t border-[#EDF3EA] pt-4">
                      {room.beds.map((bed) => {
                        const nurse = nurses.find((item) => String(item.id) === bed.nurseId);
                        console.log("bedewhywgey",bed)

                        return (
                          <div key={bed.id} className="flex items-center justify-between gap-3 mr-1 p-2 border border-[#E3EEE1] rounded-[10px]">
                            {/* <div className="min-w-0">
                              <p className="text-[11px] font-normal text-[#525763] tracking-wider">Bed number</p>
                              <p className="truncate text-[12px] font-medium text-[#262D3B] mb-0.5">
                                 {bed.bedNumber}
                               </p>

                                 <p className="text-[11px] font-normal text-[#525763] tracking-wider">Patient name</p>
                                 <p className="truncate text-[12px] font-medium text-[#262D3B]">
                                <TruncatedTableCell
                                key={`patient-list-${bed.id}`}
                                text={`${bed.patientName || "N/A"}`}
                                />
                       
                              </p>
                              <p className="truncate text-[11px] text-[#9FA2AB]">{bed.uhid}</p>
                            </div> */}

                     {/* <div className="flex items-start justify-between rounded-xl border border-gray-200 p-3 bg-white"> */}
                      {/* Left Content */}
                      <div className="min-w-0 flex-1">
                        {/* Bed Number + Patient Name */}
                        <div className="flex items-center gap-2">
                          <Image
                            src="/icons/bedBlackIcon.svg"
                            alt=""
                            width={16}
                            height={16}
                          />
                          <TruncatedInlineText
                            text={bed.bedNumber}
                            className="truncate text-[12px] font-medium text-[#262D3B] min-w-[30px] whitespace-nowrap"
                          />

                          <span className="text-[#434956]">•</span>

                          <p className="truncate text-[12px] text-[#4B5563]">
                            <TruncatedTableCell
                              key={`patient-list-${bed.id}`}
                              text={bed.patientName || "N/A"}
                            />
                          </p>
                        </div>
                             <div className="flex items-center gap-2" style={{marginTop:"-4px", marginLeft:"23px"}}>

                          {/* patient UHID */}
                            <TruncatedInlineText
                              text={bed.uhid || ""}
                              className="truncate text-[12px] text-[#4B5563] mt-0"
                            />
                            <span className="text-[#434956]">•</span>
                            {/* Package Name */}
                            <TruncatedInlineText
                              text={bed?.packageName || ""}
                              className="truncate text-[12px] text-[#4B5563] mt-0"
                            />
                            </div>

                            {/* Package Date */}
                            <p className="text-[12px] text-[#6B7280]" style={{marginTop:"-2px", marginLeft:"23px"}}>
                              {/* Package Date: {bed.packageStartDate} - {bed.packageEndDate} */}
                              Package Date: {packageformatDate(bed?.packageStartDate)} - {packageformatDate(bed?.packageEndDate)}
                            </p>
                            
                          </div>
             
                        {/* </div> */}
                            {isSelected ? (
                              <div
                                className="w-[150px] shrink-0"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <FormSelectField
                                  label=""
                                  hideLabel
                                  width="100%"
                                  options={nurseOptions}
                                  value={bed.nurseId}
                                  onChange={(value) =>
                                    updateBedNurse(bed.id, Array.isArray(value) ? value[0] : value || "")
                                  }
                                  mode="single"
                                  background="white"
                                  placeholder={isNurseDropdownLoading ? "Loading..." : "Select Nurse"}
                                  disabled={isNurseDropdownLoading}
                                />
                                {nurseSelectionErrors[bed.id] ? (
                                  <p className="mt-1 text-[11px] font-medium text-red-500">
                                    Please select a nurse
                                  </p>
                                ) : null}
                              </div>
                            ) : nurse ? (
                              <span className="shrink-0 truncate text-xs font-medium text-[#262D3B]">{nurse.name}</span>
                            ) : (
                              <span className="shrink-0 rounded-full border border-[#E3EEE1] bg-[#FAFBFA] px-2.5 py-0.5 text-[11px] font-medium text-[#9FA2AB]">
                                Unassigned
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)] ">
          <div className="border-b border-[#EDF3EA] pb-4">
            <h2 className="text-base font-medium text-[#262D3B]">On duty · {SHIFT_LABELS[selectedShift]}</h2>
            <p className="mt-1 text-xs text-[#9FA2AB]">{onDutyNurses.length} nurses scheduled</p>
          </div>

          <div className="mt-4 space-y-4 h-[700px] overflow-y-auto">
            {onDutyNurses.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#9CA3AF]">No nurses assigned yet.</p>
            ) : (
              onDutyNurses.map((nurse) => (
                <div key={nurse.id} className="rounded-[16px] border border-[#E3EEE1] bg-[#FCFDFC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#262D3B]">{nurse.name}</p>
                      <p className="mt-1 text-xs text-[#9FA2AB]">Emp ID: {nurse.empId}</p>
                    </div>
                    <span className="text-xs font-medium text-[#0B8C00]">
                      {nurse.assignedBeds.length} {nurse.assignedBeds.length === 1 ? "Bed" : "Beds"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="mb-2 text-xs text-[#9FA2AB]">Bed Number</p>
                    <div className="flex flex-wrap gap-2">
                      {nurse.assignedBeds.map((bedTag) => (
                        <span
                          key={`${nurse.id}-${bedTag}`}
                          className="inline-flex items-center gap-1 rounded-full border border-[#0B8C00]/20 bg-[#0B8C000D] px-2.5 py-1 text-xs font-medium text-[#0B8C00]"
                        >
                          {bedTag}
                          <button
                            type="button"
                            onClick={() => removeBedFromNurse(nurse.id, bedTag)}
                            className="text-[#0B8C00] hover:text-[#097200]"
                            aria-label={`Remove bed ${bedTag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <MessageDialog
        open={showToast}
        onClose={handleToastClose}
        icon={toastVariant === "error" ? "/icons/CrossIcon.svg" : "/icons/SuccessCheck.svg"}
        iconBgColor={toastVariant === "error" ? "#FFEBEE" : "#E8F5E9"}
        message={toastMessage}
        showCancel={false}
        confirmText="OK"
        onConfirm={handleToastClose}
      />
    </div>
  );
}
