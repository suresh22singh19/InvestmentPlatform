"use client";

import React, { useState, useMemo } from "react";
import { Button, Dialog, FormSelectField, ConfigurationSummaryPanel } from "@/components/ui";
import { RoomConfiguration } from "./RoomConfiguration";
import { BedManagement } from "./BedManagement";

export type OccupancyStatus = "Vacant" | "Fully Occupied" | "Partially Occupied" | "Reserved" | "Under Maintenance";

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
  /** Stored for View summary */
  hardwareItems?: { name: string; qty: number }[];
  facilityNames?: string[];
};

type RoomInventoryProps = {
  facilityName: string;
  onBack: () => void;
};

const BUILDING_OPTIONS = [
  { value: "all", label: "All Buildings" },
  { value: "Main Building", label: "Main Building" },
  { value: "OPD Building", label: "OPD Building" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Consultation Room", label: "Consultation Room" },
  { value: "IPD - Private Room", label: "IPD - Private Room" },
  { value: "Ward", label: "Ward" },
  { value: "IPD - Deluxe Room", label: "IPD - Deluxe Room" },
  { value: "IPD - Semi-Deluxe Room", label: "IPD - Semi-Deluxe Room" },
  { value: "IPD - Ward", label: "IPD - Ward" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Vacant", label: "Vacant" },
  { value: "Fully Occupied", label: "Fully Occupied" },
  { value: "Partially Occupied", label: "Partially Occupied" },
  { value: "Reserved", label: "Reserved" },
  { value: "Under Maintenance", label: "Under Maintenance" },
];

const OCCUPANCY_COLORS: Record<OccupancyStatus, string> = {
  Vacant: "bg-green-100 text-green-800 border-green-200",
  "Fully Occupied": "bg-red-100 text-red-800 border-red-200",
  "Partially Occupied": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Reserved: "bg-blue-100 text-blue-800 border-blue-200",
  "Under Maintenance": "bg-gray-100 text-gray-800 border-gray-200",
};

const DEFAULT_ROOMS: RoomInventoryItem[] = [
  {
    id: "room-1",
    roomNumber: "G-A-001",
    roomType: "Consultation Room",
    building: "Main Building",
    block: "Block A",
    floor: "Ground Floor",
    status: "configured",
    occupancyStatus: "Vacant",
    capacity: 1,
    genderUsage: "Mixed",
    hasAC: true,
    hardwareCount: 2,
    facilitiesCount: 3,
    bedCount: 1,
    hardwareItems: [{ name: "Examination Bed", qty: 1 }, { name: "BP Monitor", qty: 1 }],
    facilityNames: ["Oxygen Supply", "Attached Washroom", "Air Conditioning"],
  },
  {
    id: "room-2",
    roomNumber: "G-A-002",
    roomType: "IPD - Private Room",
    building: "Main Building",
    block: "Block A",
    floor: "Ground Floor",
    status: "incomplete",
    occupancyStatus: "Partially Occupied",
    capacity: 3,
    genderUsage: "Mixed",
    hasAC: true,
    hardwareCount: 0,
    facilitiesCount: 0,
  },
  {
    id: "room-3",
    roomNumber: "101",
    roomType: "Consultation Room",
    building: "Main Building",
    block: "Block A",
    floor: "Ground Floor",
    status: "incomplete",
    occupancyStatus: "Vacant",
    capacity: 1,
    genderUsage: "Mixed",
    hasAC: false,
    hardwareCount: 0,
    facilitiesCount: 0,
  },
  {
    id: "room-4",
    roomNumber: "102",
    roomType: "Consultation Room",
    building: "Main Building",
    block: "Block A",
    floor: "Ground Floor",
    status: "incomplete",
    occupancyStatus: "Vacant",
    capacity: 1,
    genderUsage: "Mixed",
    hasAC: false,
    hardwareCount: 0,
    facilitiesCount: 0,
  },
  {
    id: "room-5",
    roomNumber: "103",
    roomType: "Consultation Room",
    building: "Main Building",
    block: "Block A",
    floor: "Ground Floor",
    status: "incomplete",
    occupancyStatus: "Vacant",
    capacity: 1,
    genderUsage: "Mixed",
    hasAC: false,
    hardwareCount: 0,
    facilitiesCount: 0,
  },
  {
    id: "room-6",
    roomNumber: "104",
    roomType: "Consultation Room",
    building: "Main Building",
    block: "Block A",
    floor: "Ground Floor",
    status: "incomplete",
    occupancyStatus: "Vacant",
    capacity: 1,
    genderUsage: "Mixed",
    hasAC: false,
    hardwareCount: 0,
    facilitiesCount: 0,
  },
];

export const RoomInventory = ({ facilityName, onBack }: RoomInventoryProps) => {
  const [rooms, setRooms] = useState<RoomInventoryItem[]>(DEFAULT_ROOMS);
  const [search, setSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState<"list" | "config" | "beds">("list");
  const [selectedRoom, setSelectedRoom] = useState<RoomInventoryItem | null>(null);
  const [viewRoom, setViewRoom] = useState<RoomInventoryItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const stats = useMemo(() => {
    const total = rooms.length;
    const configured = rooms.filter((r) => r.status === "configured").length;
    const incomplete = total - configured;
    const vacant = rooms.filter((r) => r.occupancyStatus === "Vacant").length;
    return { total, configured, incomplete, vacant };
  }, [rooms]);

  const getOccupancyBadgeClass = (s: OccupancyStatus) => OCCUPANCY_COLORS[s] ?? "bg-gray-100 text-gray-800";

  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) => {
        const matchSearch =
          !search || room.roomNumber.toLowerCase().includes(search.toLowerCase());
        const matchBuilding =
          filterBuilding === "all" || room.building === filterBuilding;
        const matchType = filterType === "all" || room.roomType === filterType;
        const matchStatus =
          filterStatus === "all" || room.occupancyStatus === filterStatus;
        return matchSearch && matchBuilding && matchType && matchStatus;
      }),
    [rooms, search, filterBuilding, filterType, filterStatus]
  );

  const handleEdit = (room: RoomInventoryItem) => {
    setSelectedRoom(room);
    setView("config");
  };

  const handleBeds = (room: RoomInventoryItem) => {
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

  if (view === "config" && selectedRoom) {
    return (
      <RoomConfiguration
        facilityName={facilityName}
        room={selectedRoom}
        onBack={handleBackFromConfig}
        onSave={(updated) => {
          setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          handleBackFromConfig();
        }}
      />
    );
  }

  if (view === "beds" && selectedRoom) {
    return (
      <BedManagement
        facilityName={facilityName}
        room={selectedRoom}
        onBack={handleBackFromBeds}
      />
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className={`flex flex-col transition-all duration-300 ${isPanelOpen ? 'w-[80%]' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
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
          {/* Toggle Panel Button - Always visible when panel is closed */}
          {!isPanelOpen && (
            <button
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

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-600">Total Rooms</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-semibold text-green-600">{stats.configured}</p>
          <p className="text-sm text-gray-600">Configured</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-semibold text-orange-600">{stats.incomplete}</p>
          <p className="text-sm text-gray-600">Incomplete</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-semibold text-gray-900">{stats.vacant}</p>
          <p className="text-sm text-gray-600">Vacant</p>
        </div>
      </div>

      <div className="flex flex-nowrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by room number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div className="flex flex-nowrap items-center gap-3 flex-shrink-0">
          <div className="w-[180px]">
            <FormSelectField
              label=""
              options={BUILDING_OPTIONS}
              value={filterBuilding}
              onChange={(v) =>
                setFilterBuilding((typeof v === "string" ? v : v[0]) || "all")
              }
              placeholder="All Buildings"
            />
          </div>
          <div className="w-[180px]">
            <FormSelectField
              label=""
              options={TYPE_OPTIONS}
              value={filterType}
              onChange={(v) => setFilterType((typeof v === "string" ? v : v[0]) || "all")}
              placeholder="All Types"
            />
          </div>
          <div className="w-[140px]">
            <FormSelectField
              label=""
              options={STATUS_OPTIONS}
              value={filterStatus}
              onChange={(v) =>
                setFilterStatus((typeof v === "string" ? v : v[0]) || "all")
              }
              placeholder="All Status"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>
                  {room.capacity} {room.genderUsage}
                  {room.hasAC ? " AC" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>
                  {room.building} &gt; {room.block} &gt; {room.floor}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getOccupancyBadgeClass(room.occupancyStatus)}`}>
                {room.occupancyStatus}
              </span>
            </div>

            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setViewRoom(room)}
                className="inline-flex items-center justify-center h-9 px-8 text-xs font-semibold rounded-full border border-[#0B8C00] bg-white text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] active:bg-[#E4F2E4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B8C00]/20 whitespace-nowrap"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => handleBeds(room)}
                className="inline-flex items-center justify-center h-9 px-8 text-xs font-semibold rounded-full border border-[#0B8C00] bg-white text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] active:bg-[#E4F2E4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B8C00]/20 whitespace-nowrap"
              >
                Beds
              </button>
              <button
                type="button"
                onClick={() => handleEdit(room)}
                className="inline-flex items-center justify-center h-9 px-8 text-xs font-semibold rounded-full border border-[#0B8C00] bg-white text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] active:bg-[#E4F2E4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B8C00]/20 whitespace-nowrap"
              >
                Edit
              </button>
            </div>

            {room.status === "configured" && (
              <p className="text-xs text-gray-500 mt-3">
                {room.hardwareCount} hardware · {room.facilitiesCount} facilities
              </p>
            )}
            {room.status === "incomplete" && (
              <p className="text-xs text-orange-600 flex items-center gap-1 mt-3">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Configuration incomplete
              </p>
            )}
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-sm text-gray-500">No rooms match your filters</p>
        </div>
      )}

      {/* View room details dialog - Room Configuration Summary style */}
      <Dialog
        open={!!viewRoom}
        onClose={() => setViewRoom(null)}
        title="Room details"
        width={560}
      >
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
                <p className="font-semibold text-gray-900">{viewRoom.genderUsage}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">AC</p>
                <p className="font-semibold text-gray-900">{viewRoom.hasAC ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getOccupancyBadgeClass(viewRoom.occupancyStatus)}`}>
                  {viewRoom.occupancyStatus}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Hardware ({viewRoom.hardwareItems?.length ? viewRoom.hardwareItems.reduce((s, h) => s + h.qty, 0) : viewRoom.hardwareCount})</h4>
              {viewRoom.hardwareItems && viewRoom.hardwareItems.length > 0 ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  {viewRoom.hardwareItems.map((h) => (
                    <li key={h.name}>{h.name}: Qty: {h.qty}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">{viewRoom.hardwareCount} item(s) configured</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Facilities ({viewRoom.facilityNames?.length ?? viewRoom.facilitiesCount})</h4>
              {viewRoom.facilityNames && viewRoom.facilityNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {viewRoom.facilityNames.map((f) => (
                    <span key={f} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 border border-gray-200">
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
              <Button variant="primary" onClick={() => { handleEdit(viewRoom); setViewRoom(null); }}>
                Edit room
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      </div>

      {/* Configuration Summary Panel */}
      <ConfigurationSummaryPanel
        facilityName={facilityName}
        completionPercentage={35}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        buildings={2}
        blocks={0}
        floors={3}
        departments={1}
        totalRooms={2}
        configuredRooms={1}
        incompleteRooms={1}
      />
    </div>
  );
};

