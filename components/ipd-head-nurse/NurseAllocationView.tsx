"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackToPreviousPageButton,
  Badge,
  Button,
  FormSelectField,
  MessageDialog,
  SpinnerLoader,
  Tooltip,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useAssignNurseMutation,
  useAssignOrChangeNurseMutation,
  useGetNurseDropdownQuery,
  useGetUnassignedPatientRoomListQuery,
  type UnassignedPatientRoomData,
} from "@/store/api/ipdHeadNurseAPI";

export type NurseAllocationPatient = {
  id: number;
  patientTitle:string;
  patientName: string;
  bed: string;
  packageEndDate?: string | null;
  uhid? : string ,
  age?: string ,
  gender?: string ,
  doctorName? : string,
  packageName? : string,
  packageDate?: string,
  status? : string
};

export type NurseAllocationAssignMode = "assignNurse" | "assignOrChangeNurse";

type ShiftType = "morning" | "evening" | "night";

type BedAssignment = {
  id: string;
  bedNumber: string;
  nurseId: string;
};

type RoomCard = {
  id: string;
  index: number;
  name: string;
  ward: string;
  occupancy: string;
  beds: BedAssignment[];
};

type OnDutyNurse = {
  id: string;
  name: string;
  role: string;
  bedCount: number;
  assignedBeds: string[];
};

type NurseAllocationViewProps = {
  patient: NurseAllocationPatient;
  branchId?: number | null;
  /** dashboard → assignNurse; allocation → assignOrChangeNurse */
  assignMode?: NurseAllocationAssignMode;
  /** allocation manage/urgent flow: pre-select nurses from API by shift/date */
  prefillAssignedNurses?: boolean;
  onBack: () => void;
  onConfirm?: () => void;
};

const INITIAL_ROOMS: RoomCard[] = [
  {
    id: "room-401",
    index: 1,
    name: "Room 401",
    ward: "Ward 4B · General",
    occupancy: "2/2",
    beds: [
      { id: "401-a", bedNumber: "401-A", nurseId: "" },
      { id: "401-b", bedNumber: "401-B", nurseId: "" },
    ],
  },
  {
    id: "room-402",
    index: 2,
    name: "Room 402",
    ward: "Ward 4B · Private",
    occupancy: "1/1",
    beds: [{ id: "402-a", bedNumber: "402-A", nurseId: "prachi" }],
  },
  {
    id: "room-403",
    index: 3,
    name: "Room 403",
    ward: "Ward 4B · General",
    occupancy: "2/2",
    beds: [
      { id: "403-a", bedNumber: "403-A", nurseId: "anjali" },
      { id: "403-b", bedNumber: "403-B", nurseId: "anjali" },
    ],
  },
  {
    id: "room-404",
    index: 4,
    name: "Room 404",
    ward: "Ward 4B · General",
    occupancy: "2/2",
    beds: [
      { id: "404-a", bedNumber: "404-A", nurseId: "meera" },
      { id: "404-b", bedNumber: "404-B", nurseId: "meera" },
    ],
  },
  {
    id: "room-405",
    index: 5,
    name: "Room 405",
    ward: "Ward 4B · Private",
    occupancy: "1/1",
    beds: [{ id: "405-a", bedNumber: "405-A", nurseId: "meera" }],
  },
  {
    id: "room-406",
    index: 6,
    name: "Room 406",
    ward: "Ward 4B · General",
    occupancy: "2/2",
    beds: [
      { id: "406-a", bedNumber: "406-A", nurseId: "" },
      { id: "406-b", bedNumber: "406-B", nurseId: "" },
    ],
  },
];

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function getMonthDays(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return {
      date,
      dayLabel: DAY_LABELS[date.getDay()],
      dateNum: index + 1,
    };
  });
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatSelectedDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function TruncatedPatientName({ name }: { name: string }) {
    const value = name?.trim() ? name.trim() : "N/A";
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
                className="flex min-w-0 w-fit max-w-[600px] items-center"
            >
                <h2 className="m-0 min-w-0 text-xl font-bold text-[#262D3B]">
                    <span ref={textRef} className="block overflow-hidden whitespace-nowrap">
                        {value}
                    </span>
                </h2>
                {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
            </div>
        </Tooltip>
    );
}

function formatSelectedWeekday(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
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

function isDateDisabled(date: Date) {
  return isBeforeToday(date);
}

function formatShiftDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRoomType(roomType: string) {
  if (!roomType) return "N/A";
  return roomType
    .replace(/^ipd-/i, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseShiftType(shift: string | null | undefined): ShiftType | null {
  const normalized = shift?.trim().toLowerCase();
  if (normalized === "morning" || normalized === "evening" || normalized === "night") {
    return normalized;
  }
  return null;
}

function getInitialShiftFromRoomData(
  roomData: UnassignedPatientRoomData,
  patientId: number
): ShiftType | null {
  const bed = roomData.beds.find((item) => item.patientId === patientId) ?? roomData.beds[0];
  return parseShiftType(bed?.nurses?.[0]?.shift);
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
  roomData: UnassignedPatientRoomData,
  shift: ShiftType,
  selectedDate: Date,
  prefillAssignedNurses: boolean
): RoomCard {
  return {
    id: `room-${roomData.roomId}`,
    index: 1,
    name: `${roomData.roomNumber}`,
    // ward: `${roomData.buildingName} · ${roomData.floorName} · ${formatRoomType(roomData.roomType)}`,
    ward: `${roomData.floorName} · ${(roomData.roomType)}`,
    occupancy: `${roomData.occupiedBeds}/${roomData.totalBeds}`,
    beds: roomData.beds.map((bed) => ({
      id: String(bed.patientRoomId),
      bedNumber: bed.bedNumber,
      nurseId: prefillAssignedNurses
        ? getAssignedNurseIdForShift(bed.nurses, shift, selectedDate)
        : "",
    })),
  };
}

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Morning",
  evening: "Evening",
  night: "Night",
};

function buildOnDutyNurses(rooms: RoomCard[]): OnDutyNurse[] {
  const nurseMap = new Map<string, OnDutyNurse>();

  const seedNurses: OnDutyNurse[] = [
    { id: "anjali", name: "Anjali Sharma", role: "Sr. Registered Nurse", bedCount: 0, assignedBeds: [] },
    { id: "meera", name: "Meera Patel", role: "Jr. Staff Nurse", bedCount: 0, assignedBeds: [] },
    { id: "kavita", name: "Kavita Singh", role: "Charge Nurse", bedCount: 0, assignedBeds: [] },
  ];

  seedNurses.forEach((nurse) => nurseMap.set(nurse.id, { ...nurse }));

  rooms.forEach((room) => {
    room.beds.forEach((bed) => {
      if (!bed.nurseId) return;
      const nurse = nurseMap.get(bed.nurseId);
      if (!nurse) return;
      const bedTag = bed.id.split("-")[1]?.toUpperCase() ?? bed.id;
      nurse.assignedBeds.push(bedTag);
      nurse.bedCount = nurse.assignedBeds.length;
    });
  });

  return seedNurses.map((nurse) => nurseMap.get(nurse.id)!);
}


export function NurseAllocationView({
  patient,
  branchId,
  assignMode = "assignNurse",
  prefillAssignedNurses = false,
  onBack,
  onConfirm,
}: NurseAllocationViewProps) {
  const [selectedShift, setSelectedShift] = useState<ShiftType>("evening");
  const [selectedDate, setSelectedDate] = useState(() => getTodayStart());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = getTodayStart();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [rooms, setRooms] = useState<RoomCard[]>([]);
  const [bedErrors, setBedErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    "Nurse assigned successfully to the patient"
  );
  const selectedDayRef = useRef<HTMLButtonElement>(null);
  const hasAutoSelectedShiftRef = useRef(false);

  const [assignNurse, { isLoading: isAssignNurseLoading }] = useAssignNurseMutation();
  const [assignOrChangeNurse, { isLoading: isAssignOrChangeLoading }] =
    useAssignOrChangeNurseMutation();
  const isAssigning = isAssignNurseLoading || isAssignOrChangeLoading;

  const {
    data: unassignedRoomRes,
    isLoading: isUnassignedRoomLoading,
    isFetching: isUnassignedRoomFetching,
    refetch: refetchUnassignedPatientRoomList,
  } = useGetUnassignedPatientRoomListQuery(
    {
      branchId: branchId!,
      patientId: patient.id,
      date: formatShiftDate(selectedDate),
    },
    { skip: branchId == null, refetchOnMountOrArgChange: true }
  );

  const { data: nurseDropdownRes, isLoading: isNurseDropdownLoading } = useGetNurseDropdownQuery(
    { branchId: branchId!, date: formatShiftDate(selectedDate), shift: selectedShift },
    { skip: branchId == null, refetchOnMountOrArgChange: true }
  );

  const nurseOptions = useMemo<SelectOption[]>(() => {
    const nurses = nurseDropdownRes?.data ?? [];
    return [
      { value: "", label: "Select Nurse" },
      ...nurses.map((nurse) => ({
        value: String(nurse.id),
        label: nurse.name,
      })),
    ];
  }, [nurseDropdownRes?.data]);

  const isRoomListLoading = isUnassignedRoomLoading || isUnassignedRoomFetching;
  const roomData = unassignedRoomRes?.data;

  useEffect(() => {
    hasAutoSelectedShiftRef.current = false;
  }, [patient.id]);

  useEffect(() => {
    if (!prefillAssignedNurses || !roomData || hasAutoSelectedShiftRef.current) return;

    const initialShift = getInitialShiftFromRoomData(roomData, patient.id);
    if (initialShift) {
      setSelectedShift(initialShift);
      hasAutoSelectedShiftRef.current = true;
    }
  }, [prefillAssignedNurses, roomData, patient.id]);

  useEffect(() => {
    if (branchId == null) {
      setRooms(INITIAL_ROOMS);
      return;
    }

    if (roomData) {
      setRooms([
        mapApiRoomToRoomCard(roomData, selectedShift, selectedDate, prefillAssignedNurses),
      ]);
    } else {
      setRooms([]);
    }
  }, [branchId, roomData, selectedShift, selectedDate, prefillAssignedNurses]);

  const monthDays = useMemo(
    () => getMonthDays(calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [calendarMonth]
  );

  useEffect(() => {
    const nextSelectedDate = getTodayStart();
    setSelectedDate(nextSelectedDate);
    setCalendarMonth(new Date(nextSelectedDate.getFullYear(), nextSelectedDate.getMonth(), 1));
  }, [patient.id]);

  useEffect(() => {
    selectedDayRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [calendarMonth, selectedDate]);

  const onDutyNurses = useMemo(() => buildOnDutyNurses(rooms), [rooms]);

  const totalBeds = useMemo(() => rooms.reduce((count, room) => count + room.beds.length, 0), [rooms]);

  const updateBedNurse = (roomId: string, bedId: string, nurseId: string) => {
    if (nurseId) {
      setBedErrors((prev) => {
        if (!prev[bedId]) return prev;
        const next = { ...prev };
        delete next[bedId];
        return next;
      });
    }

    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId
          ? {
              ...room,
              beds: room.beds.map((bed) => (bed.id === bedId ? { ...bed, nurseId } : bed)),
            }
          : room
      )
    );
  };

  const handlePreviousMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDate = (date: Date) => {
    if (isDateDisabled(date)) return;
    setSelectedDate(date);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const handleConfirmAllocation = async () => {
    setBedErrors({});

    const bedsWithoutNurse = rooms.flatMap((room) => room.beds.filter((bed) => !bed.nurseId));

    if (bedsWithoutNurse.length > 0) {
      const errors: Record<string, string> = {};
      bedsWithoutNurse.forEach((bed) => {
        errors[bed.id] = "Please select a nurse.";
      });
      setBedErrors(errors);
      return;
    }

    if (assignMode === "assignNurse" && (branchId == null || !roomData)) {
      setErrorMessage("Missing branch or room details.");
      setShowErrorDialog(true);
      return;
    }

    const bedsToAssign = rooms.flatMap((room) => room.beds.map((bed) => ({ bed })));

    try {
      let lastMessage = "Nurse assigned successfully to the patient";

      for (const { bed } of bedsToAssign) {
        const result =
          assignMode === "assignOrChangeNurse"
            ? await assignOrChangeNurse({
                patientId: patient.id,
                nurseId: Number(bed.nurseId),
                shiftDate: formatShiftDate(selectedDate),
                shift: selectedShift,
              }).unwrap()
            : await assignNurse({
                patientId: patient.id,
                nurseId: Number(bed.nurseId),
                shiftDate: formatShiftDate(selectedDate),
                shift: selectedShift,
                roomId: roomData?.roomId,
                buildingId: roomData?.buildingId,
                branchId: branchId ?? undefined,
                floorId: roomData?.floorId,
                bedNumber: bed.bedNumber,
              }).unwrap();

        if (result.message) {
          lastMessage = result.message;
        }
      }

      setSuccessMessage(lastMessage);
      void refetchUnassignedPatientRoomList();
      setShowSuccessDialog(true);
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : "Failed to assign nurse.";

      setErrorMessage(message || "Failed to assign nurse.");
      setShowErrorDialog(true);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessDialog(false);
  };

  const handleBack = () => {
    setShowSuccessDialog(false);
    (onConfirm ?? onBack)();
  };

   const headerMetaItems:any = [
    { label: "UHID", value: patient.uhid },
    { label: "Age", value: patient.age },
    { label: "Gender", value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : "-", },
    { label: "Doctor Name", value: patient.doctorName },
  ];

  const locationMetaItems:any = [
    { label: "Package Name", value: patient.packageName },
    { label: "Package Date", value: patient.packageDate },
  ];

  const renderMetaItems = (items: Array<{ label: string; value: string }>) =>
    items.map((item, index) => (
      <span key={item.label} className="inline">
        {index > 0 ? <span className="mx-1.5 text-[#434956]">•</span> : null}
        <span className="font-normal text-[#525763]">{item.label}: </span>
        <span className="font-semibold text-[#434956]">{item.value}</span>
      </span>
    ));
console.log("patient",patient)
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {/* <button
            type="button"
            onClick={onBack}
            className="mb-3 flex items-center gap-2 text-sm font-medium text-[#0B8C00] transition-colors hover:text-[#097200]"
          >
            <Image src="/icons/LeftArrowIcon.svg" alt="" width={16} height={16} />
            Back to Dashboard
          </button> */}
          {/* <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px]">
            Nurse Allocation
          </h1> */}

          <div className="flex flex-wrap items-center gap-3">
              <TruncatedPatientName 
                name={`${patient.patientTitle ? `${patient.patientTitle} ` : ""}${patient.patientName || "N/A"}`}
              />
              <Badge variant="success" className="font-medium uppercase">
                {patient.status ?? ""}
              </Badge>
            </div>

          <p className="mt-0.5 text-sm text-[#525763] font-medium text-[13px] leading-[18px]">
            {/* Pick a building, floor and room type, then assign rooms to nurses on duty for the selected day and shift. */}
              <p className="mt-0 text-[13px]">{renderMetaItems(headerMetaItems)}</p>
          <p className="mt-0 text-[13px]">{renderMetaItems(locationMetaItems)}</p>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* <Button variant="outline" size="medium" className="!min-w-0 whitespace-nowrap">
            save as draft
          </Button> */}
          <BackToPreviousPageButton className="h-[40px]" text="Back" onClick={handleBack} />
           {/* <button
            type="button"
            className={`flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium transition-colors`}
            >save as draft</button> */}
          <Button
            variant="primary"
            size="medium"
            className="!min-w-0 whitespace-nowrap"
            onClick={handleConfirmAllocation}
            disabled={isAssigning || isRoomListLoading || rooms.length === 0}
          >
            {isAssigning ? "Confirming..." : "Confirm allocation"}
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
            <div className="flex items-center gap-2 rounded-full border border-[#E3EEE1] bg-[#FFFF] p-1 h-40px">
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
          {/* <button
            type="button"
            className="flex items-center gap-2 cursor-pointer font-normal text-[#434956] text-[14px] rounded-full border border-[#E3EEE1] px-4 py-2 text-sm font-medium transition-colors"
          >
            <img
              src="/icons/Copy.svg"
              alt="Copy"
              width={14}
              height={14}
            />
            <span>Copy Yesterday</span>
          </button>
            <Button variant="primary" size="small" className="!min-w-0 whitespace-nowrap">
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
              const isDisabled = isDateDisabled(day.date);

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

      {/* <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"> */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)]">
        <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* <FormSelectField
                label="Wing"
                hideLabel={false}
                options={WING_OPTIONS}
                value={wing}
                onChange={(value) => setWing(Array.isArray(value) ? value[0] : value || "")}
                mode="single"
                background="white"
              />
              <FormSelectField
                label="Floor"
                hideLabel={false}
                options={FLOOR_OPTIONS}
                value={floor}
                onChange={(value) => setFloor(Array.isArray(value) ? value[0] : value || "")}
                mode="single"
                background="white"
              />
              <FormSelectField
                label="Room Type"
                hideLabel={false}
                options={ROOM_TYPE_OPTIONS}
                value={roomType}
                onChange={(value) => setRoomType(Array.isArray(value) ? value[0] : value || "")}
                mode="single"
                background="white"
              /> */}
            </div>

            {/* <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#434956]">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-[#D1D5DB] accent-[#0B8C00]"
                />
                Select All
              </label>
              <span className="rounded-full border border-[#0B8C00]/20 bg-[#0B8C000D] px-3 py-1 text-xs font-medium text-[#0B8C00]">
                {rooms.length} rooms · {totalBeds} beds
              </span>
            </div> */}
          </div>

          <div className={`mt-5 grid grid-cols-1 gap-4 ${rooms.length === 1 ? "max-w-[420px]" : "md:grid-cols-2 2xl:grid-cols-3"}`}>
            {isRoomListLoading ? (
              <div className="col-span-full flex items-center justify-center gap-2 py-12 text-sm text-[#9CA3AF]">
                <SpinnerLoader size={18} />
                Loading room details...
              </div>
            ) : rooms.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm text-[#9CA3AF]">
                No room details found for this patient.
              </div>
            ) : (
            rooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-[16px] border border-[#0B8C00] bg-white p-4 shadow-[0_0_0_1px_#0B8C00]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F6F4] text-xs font-semibold text-[#434956]">
                        {room.index}
                      </span>
                      <div>
                        <p className="text-[12px] font-normal text-[#525763] tracking-wider">Room Number</p>
                        <p className="text-sm font-semibold text-[#262D3B]">{room.name}</p>
                        <p className="text-[12px] font-normal text-[#434956] tracking-wider">{room.ward}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-[#0B8C00]/20 bg-[#0B8C000D] px-2.5 py-0.5 text-xs font-medium text-[#0B8C00]">
                      {room.occupancy}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 border-t border-[#EDF3EA] pt-4">
                    {room.beds.map((bed) => (
                      <div key={bed.id} className="flex items-center gap-3">
                        <div className="shrink-0">
                          <p className="text-xs text-[#434956]">Bed number</p>
                          <p className="mt-1 text-sm font-semibold text-[#262D3B]">{bed.bedNumber}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <FormSelectField
                            label=""
                            hideLabel
                            width="100%"
                            options={nurseOptions}
                            value={bed.nurseId}
                            error={bedErrors[bed.id]}
                            onChange={(value) =>
                              updateBedNurse(room.id, bed.id, Array.isArray(value) ? value[0] : value || "")
                            }
                            mode="single"
                            background="white"
                            placeholder={isNurseDropdownLoading ? "Loading..." : "Select Nurse"}
                            disabled={isNurseDropdownLoading}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* <div className="mt-4 flex items-center justify-between border-t border-[#EDF3EA] pt-3">
                    <span className="text-xs text-[#9FA2AB]">Selected</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded border border-[#0B8C00] bg-[#0B8C00]">
                      <Image src="/icons/check.svg" alt="" width={12} height={12} className="brightness-0 invert" />
                    </span>
                  </div> */}
                </div>
              ))
            )}
          </div>
        </section>

        {/* <aside className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          <div className="border-b border-[#EDF3EA] pb-4">
            <h2 className="text-base font-medium text-[#262D3B]">On duty · {SHIFT_LABELS[selectedShift]}</h2>
            <p className="mt-1 text-xs text-[#9FA2AB]">3 nurses scheduled · 06:00 – 14:00</p>
          </div>

          <div className="mt-4 space-y-4">
            {onDutyNurses.map((nurse) => (
              <div key={nurse.id} className="rounded-[16px] border border-[#E3EEE1] bg-[#FCFDFC] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#262D3B]">{nurse.name}</p>
                    <p className="mt-1 text-xs text-[#9FA2AB]">{nurse.role}</p>
                  </div>
                  <span className="text-xs font-medium text-[#0B8C00]">{nurse.bedCount} Beds</span>
                </div>

                {nurse.assignedBeds.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-[#9FA2AB]">Bed</p>
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
                ) : null}
              </div>
            ))}
          </div>
        </aside> */}
      </div>

      <MessageDialog
        open={showSuccessDialog}
        onClose={handleSuccessConfirm}
        message={successMessage}
        showCancel={false}
        confirmText="OK"
        onConfirm={handleSuccessConfirm}
      />

      <MessageDialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={errorMessage}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => setShowErrorDialog(false)}
      />
    </div>
  );
}
