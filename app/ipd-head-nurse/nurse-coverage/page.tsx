"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  DatePicker,
  FormSelectField,
  SpinnerLoader,
  TableSearchInput,
  Tooltip,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import {
  useGetBuildingDropdownQuery,
  useGetFloorDropdownQuery,
  useGetRoomTypeDropdownQuery,
} from "@/store/api/commonApi";
import {
  useGetShiftWiseNurseRosterQuery,
  type ShiftWiseNurseRosterNurse,
} from "@/store/api/ipdHeadNurseAPI";

type ShiftId = "morning" | "evening" | "night";

type CoverageBed = {
  room: string;
  patient: string;
};

type CoverageNurse = {
  id: number;
  name: string;
  rooms: string[];
  patients: string[];
  beds: CoverageBed[];
};

type ShiftColumn = {
  id: ShiftId;
  label: string;
  timeRange: string;
  bedsCovered: number;
  assigned: CoverageNurse[];
  unassigned: CoverageNurse[];
};

const SHIFT_IDS: ShiftId[] = ["morning", "evening", "night"];

const SHIFT_META: Record<ShiftId, { label: string; timeRange: string; dot: string }> = {
  morning: { label: "Morning", timeRange: "06:00 - 14:00", dot: "/icons/morningIcon.svg" },
  evening: { label: "Evening", timeRange: "14:00 - 22:00", dot: "/icons/eveningIcon.svg" },
  night: { label: "Night", timeRange: "22:00 - 06:00", dot: "/icons/PurpleNightIcon.svg" },
};

const ALL_OPTION: SelectOption = { value: "", label: "All" };

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

// function mapRosterNurse(nurse: ShiftWiseNurseRosterNurse): CoverageNurse {
//   const beds = nurse.assignedBeds ?? [];
//   return {
//     id: nurse.nurseId,
//     name: nurse.nurseName,
//     rooms: beds.map((bed) => `${bed.bedNumber} • Room ${bed.roomNumber}`),
//     patients: beds.map((bed) => `${bed.patientTitle ? `${bed.patientTitle} ` : ""}${bed.patientName}`),
//     beds: beds.map((bed) => ({
//       room: `Bed No. <span classname="font-medium"> ${bed.bedNumber}</span> • Room No. <span classname="font-medium">${bed.roomNumber}</span>`,
//       patient: `${bed.patientTitle ? `${bed.patientTitle} ` : ""}${bed.patientName}`,
//     })),
//   };
// }

function mapRosterNurse(nurse: ShiftWiseNurseRosterNurse): any {
  const beds = nurse.assignedBeds ?? [];

  return {
    id: nurse.nurseId,
    name: nurse.nurseName,
    rooms: beds.map((bed) => `${bed.bedNumber} • Room ${bed.roomNumber}`),
    patients: beds.map(
      (bed) => `${bed.patientTitle ? `${bed.patientTitle} ` : ""}${bed.patientName}`
    ),
    beds: beds.map((bed) => ({
      room: (
        <>
          Bed No. <span className="font-medium">{bed.bedNumber}</span>
          {" • "}
          Room No. <span className="font-medium">{bed.roomNumber}</span>
        </>
      ),
      patient: `${bed.patientTitle ? `${bed.patientTitle} ` : ""}${bed.patientName}`,
    })),
  };
}

function SummaryTile({
  label,
  value,
  helper,
  iconSrc,
}: {
  label: string;
  value: string;
  helper: string;
  iconSrc: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-[#E3EEE1] bg-white px-5 py-4 shadow-[0px_12px_24px_rgba(34,56,43,0.05)]">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#434956]">{label}</p>

        <div className="mt-2 flex items-end gap-3">
          <p className="text-[22px] font-semibold leading-none text-[#262D3B]">{value}</p>
          <p className="text-xs text-[#9FA2AB]">{helper}</p>
        </div>
      </div>

      <Image src={iconSrc} alt="" width={22} height={22} />
    </div>
  );
}

function TruncatedRoomCell({ content }: { content: React.ReactNode }) {
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
  }, [content]);

  return (
    <Tooltip
      position="top"
      maxWidth={280}
      disabled={!isTruncated}
      content={
        <span className="whitespace-normal break-words text-xs leading-[1.6] text-[#262D3B]">
          {content}
        </span>
      }
    >
      <p ref={textRef} className="truncate text-xs font-medium text-[#434956]">
        {content}
      </p>
    </Tooltip>
  );
}

function AssignedNurseCard({
  nurse,
  onReassign,
}: {
  nurse: CoverageNurse;
  onReassign: () => void;
}) {

  console.log("sdgsgswqw",nurse)
  return (
    <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#262D3B]">{nurse.name}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[#0B8C0033] bg-[#F3FAF2] px-2.5 py-1 text-[11px] font-medium text-[#0B8C00]">
          {nurse.rooms.length} {nurse.rooms.length === 1 ? "Bed" : "Beds"}
        </span>
      </div>

      {nurse.beds.map((bed, index) => (
        <div
          key={index}
          className="mt-3 flex items-start gap-2 border border-[#E5E7EB] rounded-[10px] bg-[#FFFF] px-3 py-2"
        >
          <div className="min-w-0">
           <div className="flex items-center gap-2">
            <Image src="/icons/bedBlackIcon.svg" alt="" width={14} height={14} />
            <TruncatedRoomCell content={bed.room} />
            </div>
          <div className="flex items-center gap-2"> 
            <Image src="/icons/darkPatientsIcon.svg" alt="" width={14} height={14} />
            {/* <p className="truncate text-[11px] text-[#525763]">{bed.patient}</p> */}
               <Tooltip
                position="top"
                content={
                  <span className="max-w-xs whitespace-normal break-words">
                    {`${bed.patient ? `${bed.patient} ` : ""}${bed.patient || "N/A"}`}
                  </span>
                }
              >
                <span className="truncate text-[11px] text-[#525763]">
                    {`${bed.patient ? `${bed.patient} ` : ""}${bed.patient || "N/A"}`}
                </span>
              </Tooltip>
          </div>
            </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onReassign}
        className="mt-3 w-full rounded-full border border-[#0B8C00] px-4 py-1.5 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F3FAF2]"
      >
        Reassign shift
      </button>
    </div>
  );
}

function ShiftPanel({
  shift,
  onReassign,
  onAssignRooms,
}: {
  shift: ShiftColumn;
  onReassign: () => void;
  onAssignRooms: () => void;
}) {
  const totalNurses = shift.assigned.length + shift.unassigned.length;

  console.log("shift",shift)

  return (
    <div className="flex h-full flex-col rounded-[18px] border border-[#E3EEE1] bg-[#FCFDFC] p-4">
      <div
        className={`flex items-center justify-between gap-2 p-3 rounded-tl-[18px] rounded-tr-[18px] mt-[-16px] mr-[-16px] ml-[-16px] ${
          SHIFT_META[shift.id].dot === "/icons/morningIcon.svg"
            ? "bg-[#0B8C000D]"
            : SHIFT_META[shift.id].dot === "/icons/eveningIcon.svg"
            ? "bg-[#FE9A000D]"
            : "bg-[#8B5CF60D]"
        }`}
      >
        <div className="flex items-center gap-2">
          <Image src={SHIFT_META[shift.id].dot} alt="" width={26} height={26} />
          <div>
            <p className="text-sm font-semibold text-[#262D3B]">{shift.label}</p>
            <p className="text-xs text-[#9FA2AB]">{shift.timeRange}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#434956]">
          {shift.bedsCovered} Beds
        </span>
      </div>

      <p className="mt-3 text-xs">
        <span className="mt-3 text-xs font-medium ">{shift.assigned.length} assigned •</span>{" "}
        <span className="text-[#434956]">{shift.unassigned.length} idle</span>
      </p>

      {/* <div className="mt-3 flex flex-1 flex-col gap-3 h-[400px] overflow-y-auto"> */}
         <div className="mt-3 h-[300px] flex flex-col gap-3 overflow-y-auto">
        {totalNurses === 0 ? (
          <p className="rounded-[12px] border border-dashed border-[#E5E7EB] bg-white px-3 py-6 text-center text-xs text-[#9CA3AF]">
            No nurses rostered for this shift.
          </p>
        ) : (
          <>
            {shift.assigned.map((nurse) => (
              <AssignedNurseCard key={nurse.id} nurse={nurse} onReassign={onReassign} />
            ))}

            {shift.unassigned.length > 0 ? (
              <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-3.5">
                <div className="flex items-center gap-0">
                  <p className="text-xs font-medium text-[#262D3B]">On shift · no rooms yet</p>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-[#0B8C00] bg-[##0B8C00]/5">
                    {shift.unassigned.length}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {shift.unassigned.map((nurse) => (
                    <span
                      key={nurse.id}
                      className="rounded-full border border-[#0B8C00]/50 bg-white px-3 py-1 text-xs font-medium text-[#0B8C00]"
                    >
                      {nurse.name}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onAssignRooms}
                  className="mt-3 w-full rounded-full border border-[#0B8C00] px-4 py-1.5 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F3FAF2]"
                >
                  Assign rooms in Room Allocation
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>



    </div>
  );
}

export default function NurseCoveragePage() {
  const router = useRouter();
  const { resolvedFilterBranchId } = useIPDNurseResolvedBranchId();

  const [selectedDate, setSelectedDate] = useState(todayLabel());
  const [searchTerm, setSearchTerm] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [roomType, setRoomType] = useState("");

  const goToRoomAllocation = (shiftId: ShiftId) =>
    router.push(`/ipd-head-nurse/allocation/assign-rooms?shift=${shiftId}`);

  const { data: buildingDropdownRes } = useGetBuildingDropdownQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null }
  );
  const { data: floorDropdownRes } = useGetFloorDropdownQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null }
  );
  const { data: roomTypeDropdownRes } = useGetRoomTypeDropdownQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null }
  );

  const {
    data: rosterRes,
    isLoading: isRosterLoading,
    isFetching: isRosterFetching,
    isError: isRosterError,
  } = useGetShiftWiseNurseRosterQuery(
    {
      branchId: resolvedFilterBranchId!,
      date: selectedDate,
      buildingId: building || undefined,
      floorId: floor || undefined,
      roomType: roomType || undefined,
      search: searchTerm || undefined,
    },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  const buildingOptions = useMemo<SelectOption[]>(() => {
    const items = buildingDropdownRes?.data ?? [];
    return [ALL_OPTION, ...items.map((item) => ({ value: String(item.id), label: item.name }))];
  }, [buildingDropdownRes]);

  const floorOptions = useMemo<SelectOption[]>(() => {
    const items = floorDropdownRes?.data ?? [];
    return [ALL_OPTION, ...items.map((item) => ({ value: String(item.id), label: item.floor ?? item.name }))];
  }, [floorDropdownRes]);

  const roomTypeOptions = useMemo<SelectOption[]>(() => {
    const items = roomTypeDropdownRes?.data ?? [];
    return [ALL_OPTION, ...items.map((item) => ({ value: item.key ?? String(item.id), label: item.name }))];
  }, [roomTypeDropdownRes]);

  const shifts: ShiftColumn[] = useMemo(() => {
    const rosterShifts = rosterRes?.data?.shifts;

    return SHIFT_IDS.map((id) => {
      const shift = rosterShifts?.[id];
      const nurses = shift?.nurses ?? [];

      return {
        id,
        label: SHIFT_META[id].label,
        timeRange: SHIFT_META[id].timeRange,
        bedsCovered: shift?.totalBedsAssigned ?? 0,
        assigned: nurses.filter((nurse) => nurse.assigned).map(mapRosterNurse),
        unassigned: nurses.filter((nurse) => !nurse.assigned).map(mapRosterNurse),
      };
    });
  }, [rosterRes]);

  const totalNursesOnDuty = shifts.reduce(
    (sum, shift) => sum + shift.assigned.length + shift.unassigned.length,
    0
  );
  const totalBedsCovered = rosterRes?.data?.totalBed ?? shifts.reduce((sum, shift) => sum + shift.bedsCovered, 0);
  const shiftsRunning = shifts.filter((shift) => shift.assigned.length + shift.unassigned.length > 0).length;
  const sickCallAlerts = 0;

  const scopeLabel = useMemo(() => {
    const filtersActive = [building, floor, roomType].filter(Boolean).length;
    if (filtersActive === 0) return `${totalBedsCovered} beds in scope`;
    return "Filtered view applied";
  }, [building, floor, roomType, totalBedsCovered]);

  const clearFilters = () => {
    setBuilding("");
    setFloor("");
    setRoomType("");
    setSearchTerm("");
  };


  console.log("shiftsdye7yegey",shifts)

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
              Nurse Coverage
            </h1>
            <p className="mt-1 text-sm text-[#525763]">
              Who is on which shift, which rooms they hold, and to reassign when someone calls in sick.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="On duty today"
            value={`${totalNursesOnDuty} nurses`}
            helper=""
            iconSrc="/icons/DarkThreePaients.svg"
          />
          <SummaryTile
            label="Beds covered"
            value={`${totalBedsCovered}`}
            helper="across all shifts"
            iconSrc="/icons/bedDarkIcon.svg"
          />
          <SummaryTile
            label="Sick-call alerts"
            value={`${sickCallAlerts}`}
            helper="no reassignment needed"
            iconSrc="/icons/Warning.svg"
          />
          <SummaryTile
            label="Shifts running"
            value={`${shiftsRunning} / 3`}
            helper="Morning • Evening • Night"
            iconSrc="/icons/thickGreenCircleTick.svg"
          />
        </div>

        <section className="rounded-[20px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          {/* <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="pb-3">Filter</div>
            <div className="flex items-center gap-3">
              <div className="w-full sm:w-[250px]">
              <FormSelectField
                label=""
                options={buildingOptions}
                value={building}
                onChange={(value) => setBuilding(Array.isArray(value) ? value[0] : value || "")}
                placeholder="Select Building"
                mode="single"
                width={250}
                height={44}
              />
              </div>

               <div className="w-full sm:w-[250px]">
              <FormSelectField
                label=""
                options={floorOptions}
                value={floor}
                onChange={(value) => setFloor(Array.isArray(value) ? value[0] : value || "")}
                placeholder="Select Floor"
                mode="single"
                width={250}
                height={44}
              />
              </div>

               <div className="w-full sm:w-[250px]">
              <FormSelectField
                label=""
                options={roomTypeOptions}
                value={roomType}
                onChange={(value) => setRoomType(Array.isArray(value) ? value[0] : value || "")}
                placeholder="Select Room Type"
                mode="single"
                width={250}
                height={44}
              />
             </div>

              <div className="w-full sm:w-[200px]">
                <DatePicker value={selectedDate} onChange={setSelectedDate} placeholder="Choose date" width="100%" />
              </div>
              <div className="w-full sm:w-[240px]">
                <TableSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search Here..." />
              </div>

              <div className="w-full sm:w-[130px]">
              <span className="rounded-full border border-[#0B8C0033] bg-[#F3FAF2] px-3 py-1.5 text-xs font-medium text-[#0B8C00]">
                {scopeLabel}
              </span>
              </div>
             <div className="w-full sm:w-[120px]">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[#EF4444]/30 bg-white px-4 py-2 text-xs font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
              >
                Clear filters
              </button>
              </div>
            </div>
          </div> */}

          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="pb-3 text-lg font-medium">Filter</div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-[250px]">
              <FormSelectField
                label=""
                options={buildingOptions}
                value={building}
                onChange={(value) => setBuilding(Array.isArray(value) ? value[0] : value || "")}
                placeholder="Select Building"
                mode="single"
                width={250}
                height={44}
              />
            </div>

            <div className="w-full sm:w-[250px]">
              <FormSelectField
                label=""
                options={floorOptions}
                value={floor}
                onChange={(value) => setFloor(Array.isArray(value) ? value[0] : value || "")}
                placeholder="Select Floor"
                mode="single"
                width={250}
                height={44}
              />
            </div>

            <div className="w-full sm:w-[250px]">
              <FormSelectField
                label=""
                options={roomTypeOptions}
                value={roomType}
                onChange={(value) => setRoomType(Array.isArray(value) ? value[0] : value || "")}
                placeholder="Select Room Type"
                mode="single"
                width={250}
                height={44}
              />
            </div>

            <div className="w-full sm:w-[200px]">
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Choose date"
                width="100%"
              />
            </div>

            <div className="w-full sm:w-[240px]">
              <TableSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search Here..."
              />
            </div>

            <div className="w-full sm:w-auto">
              <span className="inline-flex rounded-full border border-[#0B8C0033] bg-[#F3FAF2] px-3 py-2 text-xs font-medium text-[#0B8C00]">
                {scopeLabel}
              </span>
            </div>

            <div className="w-full sm:w-auto">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full sm:w-auto rounded-full border border-[#EF4444]/30 bg-white px-4 py-2 text-xs font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

          {isRosterLoading || isRosterFetching ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9CA3AF]">
              <SpinnerLoader size={18} />
              Loading nurse coverage...
            </div>
          ) : isRosterError ? (
            <p className="py-16 text-center text-sm text-[#DC2626]">Failed to load nurse roster.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {shifts.map((shift) => (
                <ShiftPanel
                  key={shift.id}
                  shift={shift}
                  onReassign={() => goToRoomAllocation(shift.id)}
                  onAssignRooms={() => goToRoomAllocation(shift.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
