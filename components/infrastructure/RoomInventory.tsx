"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Button,
  Dialog,
  MessageDialog,
  FormSelectField,
  ConfigurationSummaryPanel,
  TableSearchInput,
  Pagination,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { branchRoomTypeSelectOptions } from "@/lib/utils/branchRoomTypeOptions";
import { RoomConfiguration } from "./RoomConfiguration";
import { BedManagement } from "./BedManagement";
import {
  useGetBuildingsByBranchQuery,
  useGetBranchRoomTypesByBranchQuery,
  useGetBranchHierarchyTreeQuery,
  useGetAllRoomsByBranchQuery,
  useDeleteRoomMutation,
  parseGetAllRoomsResponse,
  type BranchRoomTypeMappingRow,
  type BranchRoomListRow,
  type GetAllRoomsByBranchInsight,
} from "@/store/api/branchSetupApi";
import type { HierarchyBranch } from "@/lib/utils/branchHierarchyStats";
import { normalizeHierarchyFloors } from "@/lib/utils/branchHierarchyStats";
import { genderUsageDisplayLabel } from "@/lib/utils/common";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import { useFacilityConfigurationSummaryFromHierarchy } from "@/hooks/useFacilityConfigurationSummaryFromHierarchy";

export type OccupancyStatus =
  | "Pending"
  | "Vacant"
  | "Fully Occupied"
  | "Partially Occupied"
  | "Reserved"
  | "Under Maintenance";

export type RoomInventoryItem = {
  id: string;
  roomNumber: string;
  roomType: string;
  building: string;
  block: string;
  floor: string;
  status: "configured" | "incomplete";
  occupancyStatus: OccupancyStatus;
  capacity: number;
  genderUsage: "Male" | "Female" | "Mixed";
  hasAC: boolean;
  hardwareCount: number;
  facilitiesCount: number;
  bedCount?: number;
  hardwareItems?: { name: string; qty: number }[];
  facilityNames?: string[];
  /** API ids for filtering */
  buildingId?: number;
  floorId?: number;
  /** Raw roomType string from GET /room/getAllRooms */
  roomTypeKey?: string;
  /** Matched branch-room-type mapping id when resolvable */
  roomtypeId?: number;
};

type RoomInventoryProps = {
  facilityName: string;
  branchId: number | null;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onBack: () => void;
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Vacant", label: "Vacant" },
  { value: "Fully Occupied", label: "Fully Occupied" },
  { value: "Partially Occupied", label: "Partially Occupied" },
  // { value: "Reserved", label: "Reserved" },
  { value: "Under Maintenance", label: "Under Maintenance" },
];

const OCCUPANCY_COLORS: Record<OccupancyStatus, string> = {
  Pending: "bg-orange-100 text-orange-800 border-orange-200",
  Vacant: "bg-green-100 text-green-800 border-green-200",
  "Fully Occupied": "bg-red-100 text-red-800 border-red-200",
  "Partially Occupied": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Reserved: "bg-blue-100 text-blue-800 border-blue-200",
  "Under Maintenance": "bg-gray-100 text-gray-800 border-gray-200",
};

function mapRoomCurrentStatus(s: string | null | undefined): OccupancyStatus {
  if (s == null || String(s).trim() === "") return "Vacant";
  const t = String(s).trim().toLowerCase();
  if (t.includes("partial")) return "Partially Occupied";
  if (t.includes("fully") && t.includes("occup")) return "Fully Occupied";
  if (t.includes("vacant")) return "Vacant";
  if (t.includes("reserved")) return "Reserved";
  if (t.includes("maintenance")) return "Under Maintenance";
  return "Vacant";
}

function normalizeRoomTypeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
}

function resolveRoomtypeId(apiRoomType: string, rows: BranchRoomTypeMappingRow[]): number | undefined {
  const a = normalizeRoomTypeKey(apiRoomType);
  for (const r of rows) {
    const code = r.roomType?.roomTypeCode ? normalizeRoomTypeKey(r.roomType.roomTypeCode) : "";
    if (code && a === code) return r.roomtypeId;
    const disp = r.roomType?.roomType ? normalizeRoomTypeKey(r.roomType.roomType) : "";
    if (disp && a === disp) return r.roomtypeId;
  }
  return undefined;
}

function typeDisplayLabel(apiRoomType: string, rows: BranchRoomTypeMappingRow[]): string {
  const id = resolveRoomtypeId(apiRoomType, rows);
  if (id != null) {
    const row = rows.find((x) => x.roomtypeId === id);
    if (row?.roomType?.roomType) return row.roomType.roomType;
  }
  return apiRoomType
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function buildFloorIdToLabel(branch: HierarchyBranch | undefined): Map<number, string> {
  const m = new Map<number, string>();
  for (const b of branch?.building ?? []) {
    for (const floor of normalizeHierarchyFloors(b)) {
      if (floor.id == null) continue;
      const label =
        (floor.floor != null && String(floor.floor).trim() !== "" && String(floor.floor)) ||
        (floor.description != null && String(floor.description).trim() !== "" && String(floor.description)) ||
        `Floor ${floor.id}`;
      m.set(floor.id, label);
    }
  }
  return m;
}

function mapApiRoomToInventoryItem(
  api: BranchRoomListRow,
  buildingName: string,
  floorLabel: string,
  branchTypeRows: BranchRoomTypeMappingRow[]
): RoomInventoryItem {
  const hf = api.hardwareFacilities ?? [];
  const hardwareParts = hf.filter((x) => x.hardwareFacilitiesType === "hardware");
  const facilityParts = hf.filter((x) => x.hardwareFacilitiesType === "facility");
  const hardwareItems = hardwareParts.map((x) => ({
    name: x.hardwareFacility?.name ?? `Hardware #${x.hardwareFacilityId}`,
    qty: x.quantity ?? 1,
  }));
  const facilityNames = facilityParts
    .map((x) => x.hardwareFacility?.name)
    .filter((n): n is string => n != null && String(n).trim() !== "");

  const incomplete = api.roomConfigStatus === "incomplete";
  const rtid = resolveRoomtypeId(api.roomType, branchTypeRows);

  return {
    id: String(api.id),
    roomNumber: api.roomNumber,
    roomType: typeDisplayLabel(api.roomType, branchTypeRows),
    building: buildingName,
    block: "",
    floor: floorLabel,
    status: incomplete ? "incomplete" : "configured",
    occupancyStatus: incomplete ? "Pending" : mapRoomCurrentStatus(api.roomCurrentStatus),
    capacity: api.bedCapacity ?? 1,
    genderUsage: "Mixed",
    hasAC: false,
    hardwareCount: hardwareParts.reduce((s, x) => s + (x.quantity ?? 1), 0),
    facilitiesCount: facilityParts.length,
    hardwareItems: hardwareItems.length ? hardwareItems : undefined,
    facilityNames: facilityNames.length ? facilityNames : undefined,
    buildingId: api.buildingId,
    floorId: api.floorId,
    roomTypeKey: api.roomType,
    roomtypeId: rtid,
  };
}

export const RoomInventory = ({
  facilityName,
  branchId,
  canView = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onBack,
  configurationSummary = null,
}: RoomInventoryProps) => {
  const skip = branchId == null || !canView;
  const { data: buildingsRes, isFetching: buildingsLoading } = useGetBuildingsByBranchQuery(branchId!, {
    skip,
  });
  const { data: branchTypesRes, isFetching: typesLoading } = useGetBranchRoomTypesByBranchQuery(branchId!, {
    skip,
  });
  const { data: hierarchyRes } = useGetBranchHierarchyTreeQuery(branchId ?? 0, { skip });

  const configurationSummaryForPanel = useFacilityConfigurationSummaryFromHierarchy(
    hierarchyRes?.success && Array.isArray(hierarchyRes.data) ? hierarchyRes.data : undefined,
    configurationSummary,
  );

  const [search, setSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [view, setView] = useState<"list" | "config" | "beds">("list");
  const [selectedRoom, setSelectedRoom] = useState<RoomInventoryItem | null>(null);
  const [viewRoom, setViewRoom] = useState<RoomInventoryItem | null>(null);
  const [deleteRoom, setDeleteRoom] = useState<RoomInventoryItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteError, setShowDeleteError] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleteRoomMutation, { isLoading: deletingRoom }] = useDeleteRoomMutation();

  const debouncedSearch = useDebounce(search.trim(), 400);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterBuilding, filterType, filterStatus, branchId]);

  const {
    data: roomsRes,
    isFetching: roomsLoading,
    refetch: refetchRooms,
  } = useGetAllRoomsByBranchQuery(
    {
      branchId: branchId!,
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearch || undefined,
      buildingId: filterBuilding !== "all" ? filterBuilding : undefined,
      roomtypeId: filterType !== "all" ? filterType : undefined,
      roomCurrentStatus: filterStatus !== "all" ? filterStatus : undefined,
    },
    { skip },
  );

  const buildingRows =
    buildingsRes?.success && Array.isArray(buildingsRes.data) ? buildingsRes.data : [];
  const branchTypeRows =
    branchTypesRes?.success && Array.isArray(branchTypesRes.data) ? branchTypesRes.data : [];

  const buildingOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Buildings" }];
    for (const b of buildingRows) {
      const name = b.name != null && String(b.name).trim() !== "" ? String(b.name) : `Building ${b.id}`;
      opts.push({ value: String(b.id), label: name });
    }
    return opts;
  }, [buildingRows]);

  const typeOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Types" }];
    for (const r of branchTypeRows) {
      const label =
        r.roomType?.roomType != null && String(r.roomType.roomType).trim() !== ""
          ? String(r.roomType.roomType)
          : `Type #${r.roomtypeId}`;
      opts.push({ value: String(r.roomtypeId), label });
    }
    return opts;
  }, [branchTypeRows]);

  /** API `roomType` codes for Room Configuration (PATCH). */
  const roomTypeOptionsForConfig = useMemo(
    () => branchRoomTypeSelectOptions(branchTypeRows),
    [branchTypeRows],
  );

  const hierarchyBranch = hierarchyRes?.success && hierarchyRes.data?.[0] ? hierarchyRes.data[0] : undefined;
  const floorIdToLabel = useMemo(() => buildFloorIdToLabel(hierarchyBranch), [hierarchyBranch]);

  const buildingIdToName = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of buildingRows) {
      m.set(b.id, b.name != null && String(b.name).trim() !== "" ? String(b.name) : `Building ${b.id}`);
    }
    return m;
  }, [buildingRows]);

  const { roomRows, insight: roomsInsight } = useMemo((): {
    roomRows: BranchRoomListRow[];
    insight: GetAllRoomsByBranchInsight | null;
  } => {
    if (skip || !roomsRes?.success) return { roomRows: [], insight: null };
    const parsed = parseGetAllRoomsResponse(roomsRes.data);
    return { roomRows: parsed.rooms, insight: parsed.insight };
  }, [skip, roomsRes]);

  const rooms = useMemo(() => {
    return roomRows.map((r) => {
      const bname =
        (r.building?.name != null && String(r.building.name).trim() !== "" && String(r.building.name)) ||
        buildingIdToName.get(r.buildingId) ||
        `Building ${r.buildingId}`;
      const fl = floorIdToLabel.get(r.floorId) ?? `Floor ${r.floorId}`;
      return mapApiRoomToInventoryItem(r, bname, fl, branchTypeRows);
    });
  }, [roomRows, buildingIdToName, floorIdToLabel, branchTypeRows]);

  const stats = useMemo(() => {
    if (roomsInsight) {
      return {
        total: roomsInsight.totalRooms ?? rooms.length,
        configured: roomsInsight.configured ?? 0,
        incomplete: roomsInsight.incomplete ?? 0,
        vacant: roomsInsight.vacant ?? 0,
      };
    }
    const total = roomsRes?.total ?? rooms.length;
    const configured = rooms.filter((r) => r.status === "configured").length;
    const incomplete = rooms.filter((r) => r.status === "incomplete").length;
    const vacant = rooms.filter((r) => r.occupancyStatus === "Vacant").length;
    return { total, configured, incomplete, vacant };
  }, [roomsInsight, rooms, roomsRes?.total]);

  const totalItemsForPagination =
    roomsRes?.total ?? roomsInsight?.totalRooms ?? (rooms.length > 0 ? rooms.length : 0);

  const getOccupancyBadgeClass = (s: OccupancyStatus) => OCCUPANCY_COLORS[s] ?? "bg-gray-100 text-gray-800";

  const occupancyPillLabel = (s: OccupancyStatus) => (s === "Pending" ? "Setup pending" : s);

  const listLoading = !skip && (buildingsLoading || typesLoading || roomsLoading);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleEdit = (room: RoomInventoryItem) => {
    if (room.status === "configured" && !canEdit) return;
    if (room.status !== "configured" && !(canAdd || canEdit)) return;
    setSelectedRoom(room);
    setView("config");
  };

  const handleBeds = (room: RoomInventoryItem) => {
    if (!canEdit) return;
    setSelectedRoom(room);
    setView("beds");
  };

  const handleBackFromConfig = () => {
    setView("list");
    setSelectedRoom(null);
  };

  const handleBackFromBeds = () => {
    setView("list");
    setSelectedRoom(null);
  };

  const handleDelete = async () => {
    if (!canDelete || !deleteRoom || branchId == null) return;
    try {
      const roomIdNum = parseInt(deleteRoom.id, 10);
      if (!Number.isFinite(roomIdNum)) {
        setDeleteError("Invalid room id.");
        setShowDeleteError(true);
        return;
      }
      const res = await deleteRoomMutation({ roomId: roomIdNum, branchId }).unwrap();
      if (res?.success === false) {
        setDeleteError(res.message ?? "Unable to delete room.");
        setShowDeleteError(true);
        return;
      }
      setDeleteRoom(null);
      setDeleteSuccess(res?.message ?? "Room deleted successfully.");
      setShowDeleteSuccess(true);
      void refetchRooms();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      setDeleteError(msg);
      setShowDeleteError(true);
    }
  };

  if (view === "config" && selectedRoom) {
    return (
      <RoomConfiguration
        facilityName={facilityName}
        branchId={branchId}
        roomTypeOptions={roomTypeOptionsForConfig}
        branchRoomTypeRows={branchTypeRows}
        room={selectedRoom}
        configurationSummary={configurationSummary}
        onBack={handleBackFromConfig}
        onSave={() => {
          void refetchRooms();
          handleBackFromConfig();
        }}
      />
    );
  }

  if (view === "beds" && selectedRoom && canEdit) {
    return (
      <BedManagement
        facilityName={facilityName}
        branchId={branchId}
        canView={canView}
        canAdd={canAdd}
        canEdit={canEdit}
        canDelete={canDelete}
        room={selectedRoom}
        configurationSummary={configurationSummary}
        onBack={handleBackFromBeds}
      />
    );
  }

  return (
    <div className="flex gap-6 h-full">
      <div className={`flex flex-col transition-all duration-300 ${isPanelOpen ? "w-[80%]" : "w-full"}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-100 transition-colors"
            >
              <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Room Inventory</h1>
              <p className="text-sm text-gray-500">{facilityName}</p>
            </div>
          </div>
          {!isPanelOpen && (
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg transition-all hover:bg-green-700"
              aria-label="Open Configuration Summary"
            >
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {skip ? (
          <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-6">
            Open Room Inventory from a facility with a branch id to load buildings and rooms.
          </div>
        ) : null}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-gray-900">{listLoading ? "…" : stats.total}</p>
            <p className="text-sm text-gray-600">Total Rooms</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-green-600">{listLoading ? "…" : stats.configured}</p>
            <p className="text-sm text-gray-600">Configured</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-orange-600">{listLoading ? "…" : stats.incomplete}</p>
            <p className="text-sm text-gray-600">Incomplete</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-gray-900">{listLoading ? "…" : stats.vacant}</p>
            <p className="text-sm text-gray-600">Vacant</p>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-[200px] max-w-md">
            <TableSearchInput
              value={search}
              onChange={(value) => setSearch(value)}
              placeholder="Search by room number..."
              sanitize={false}
              isLoading={listLoading}
            />
          </div>
          <div className="flex flex-nowrap items-center gap-3 flex-shrink-0">
            <div className="w-[180px]">
              <FormSelectField
                label=""
                options={buildingOptions}
                value={filterBuilding}
                onChange={(v) => setFilterBuilding((typeof v === "string" ? v : v[0]) || "all")}
                placeholder="All Buildings"
                disabled={buildingsLoading}
                emptyMessage={buildingsLoading ? "Loading…" : "No buildings"}
              />
            </div>
            <div className="w-[180px]">
              <FormSelectField
                label=""
                options={typeOptions}
                value={filterType}
                onChange={(v) => setFilterType((typeof v === "string" ? v : v[0]) || "all")}
                placeholder="All Types"
                disabled={typesLoading}
                emptyMessage={
                  typesLoading ? "Loading…" : typeOptions.length <= 1 ? "Add room types for this branch" : "All Types"
                }
              />
            </div>
            <div className="w-[140px]">
              <FormSelectField
                label=""
                options={STATUS_OPTIONS}
                value={filterStatus}
                onChange={(v) => setFilterStatus((typeof v === "string" ? v : v[0]) || "all")}
                placeholder="All Status"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                {room.status === "configured" ? (
                  <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{room.roomNumber}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                    {room.roomType}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span>
                    {room.capacity} {genderUsageDisplayLabel(room.genderUsage)}
                    {room.hasAC ? " AC" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {room.building}
                    {room.block ? ` > ${room.block}` : ""} &gt; {room.floor}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getOccupancyBadgeClass(room.occupancyStatus)}`}
                >
                  {room.occupancyStatus}
                </span>
              </div>

              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setViewRoom(room)}
                  disabled={!canView}
                  className="inline-flex items-center justify-center h-9 px-8 text-xs font-semibold rounded-full border border-[#0B8C00] bg-white text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] active:bg-[#E4F2E4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B8C00]/20 whitespace-nowrap"
                >
                  View
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => handleBeds(room)}
                    className="inline-flex items-center justify-center h-9 px-8 text-xs font-semibold rounded-full border border-[#0B8C00] bg-white text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] active:bg-[#E4F2E4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B8C00]/20 whitespace-nowrap"
                  >
                    Beds
                  </button>
                ) : null}
                {canAdd || canEdit ? (
                  <button
                    type="button"
                    onClick={() => handleEdit(room)}
                    disabled={room.status === "configured" ? !canEdit : !(canAdd || canEdit)}
                    className="inline-flex items-center justify-center h-9 px-8 text-xs font-semibold rounded-full border border-[#0B8C00] bg-white text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] active:bg-[#E4F2E4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B8C00]/20 whitespace-nowrap"
                  >
                    Configure
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setDeleteRoom(room)}
                    className="inline-flex items-center justify-center h-9 px-6 text-xs font-semibold rounded-full border border-red-500 bg-white text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20 whitespace-nowrap"
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              {room.status === "configured" && (
                <p className="text-xs text-gray-500 mt-3">
                  {room.hardwareCount} hardware · {room.facilitiesCount} facilities
                </p>
              )}
              {room.status === "incomplete" && (
                <p className="text-xs text-orange-600 flex items-center gap-1 mt-3">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Configuration incomplete
                </p>
              )}
            </div>
          ))}
        </div>

        {!skip && !listLoading && rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <p className="text-sm text-gray-500">
              {totalItemsForPagination === 0 ? "No rooms for this branch yet" : "No rooms on this page"}
            </p>
          </div>
        )}

        {!skip && !listLoading && totalItemsForPagination > 0 && (
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItemsForPagination}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              itemsPerPageOptions={[10, 20, 50, 100]}
            />
          </div>
        )}

        <Dialog open={!!viewRoom} onClose={() => setViewRoom(null)} title="Room details" width={560}>
          {viewRoom && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-gray-900">Room Configuration Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Room Number</p>
                  <p className="font-semibold text-gray-900">{viewRoom.roomNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Room Type</p>
                  <p className="font-semibold text-gray-900">{viewRoom.roomType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="font-semibold text-gray-900">{viewRoom.capacity} bed(s)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="font-semibold text-gray-900">{genderUsageDisplayLabel(viewRoom.genderUsage)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">AC</p>
                  <p className="font-semibold text-gray-900">{viewRoom.hasAC ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getOccupancyBadgeClass(viewRoom.occupancyStatus)}`}
                  >
                    {occupancyPillLabel(viewRoom.occupancyStatus)}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Hardware (
                  {viewRoom.hardwareItems?.length
                    ? viewRoom.hardwareItems.reduce((s, h) => s + h.qty, 0)
                    : viewRoom.hardwareCount}
                  )
                </h4>
                {viewRoom.hardwareItems && viewRoom.hardwareItems.length > 0 ? (
                  <ul className="text-sm text-gray-700 space-y-1">
                    {viewRoom.hardwareItems.map((h) => (
                      <li key={h.name}>
                        {h.name}: Qty: {h.qty}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">{viewRoom.hardwareCount} item(s) configured</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Facilities ({viewRoom.facilityNames?.length ?? viewRoom.facilitiesCount})
                </h4>
                {viewRoom.facilityNames && viewRoom.facilityNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewRoom.facilityNames.map((f) => (
                      <span
                        key={f}
                        className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 border border-gray-200"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{viewRoom.facilitiesCount} facility(ies) configured</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewRoom(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (viewRoom.status === "configured" ? !canEdit : !(canAdd || canEdit)) return;
                    handleEdit(viewRoom);
                    setViewRoom(null);
                  }}
                  disabled={viewRoom.status === "configured" ? !canEdit : !(canAdd || canEdit)}
                >
                  Configure room
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        <MessageDialog
          open={deleteRoom != null}
          onClose={() => setDeleteRoom(null)}
          icon="/icons/TrashRedIcon.svg"
          iconBgColor="#FFEBEE"
          message={deleteRoom ? `Delete room "${deleteRoom.roomNumber}"?` : "Delete this room?"}
          showCancel
          cancelText="Cancel"
          confirmText={deletingRoom ? "Deleting..." : "Delete"}
          onCancel={() => setDeleteRoom(null)}
          onConfirm={() => void handleDelete()}
        />

        <MessageDialog
          open={showDeleteError}
          onClose={() => setShowDeleteError(false)}
          icon="/icons/CrossIcon.svg"
          iconBgColor="#FFEBEE"
          message={deleteError}
          confirmText="OK"
          showCancel={false}
          onConfirm={() => setShowDeleteError(false)}
        />

        <MessageDialog
          open={showDeleteSuccess}
          onClose={() => setShowDeleteSuccess(false)}
          icon="/icons/SuccessCheck.svg"
          iconBgColor="#E8F5E9"
          message={deleteSuccess}
          confirmText="OK"
          showCancel={false}
          onConfirm={() => setShowDeleteSuccess(false)}
        />
      </div>

      <ConfigurationSummaryPanel
        facilityName={facilityName}
        completionPercentage={configurationSummaryForPanel.completionPercentage}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        buildings={configurationSummaryForPanel.buildings}
        floors={configurationSummaryForPanel.floors}
        totalRooms={configurationSummaryForPanel.totalRooms}
        configuredRooms={configurationSummaryForPanel.configuredRooms}
        incompleteRooms={configurationSummaryForPanel.incompleteRooms}
        lastModified={configurationSummaryForPanel.lastModified}
      />
    </div>
  );
};
