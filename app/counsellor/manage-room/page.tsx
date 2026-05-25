"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    Badge,
    FormSelectField,
    TableListingCard,
} from "@/components/ui";


// Static mock data representing rooms matching Figma mockups
const MOCK_ROOMS = [
    {
        id: 1,
        roomNumber: "R-210",
        status: "Under Cleaning" as const,
        floor: "Floor 2",
        cleaningStatus: "In Progress",
        readyIn: "20m",
    },
    {
        id: 2,
        roomNumber: "R-208",
        status: "Not Available" as const,
        floor: "Floor 2",
        cleaningStatus: "Maintenance",
    },
    {
        id: 3,
        roomNumber: "R-206",
        status: "Occupied" as const,
        floor: "Floor 2",
        patientName: "Ajay Kumar",
        estCheckout: "Tomorrow",
    },
    {
        id: 4,
        roomNumber: "R-204",
        status: "Available" as const,
        floor: "Floor 2",
        building: "East Wing (Cardiac Care)",
    },
    {
        id: 5,
        roomNumber: "R-212",
        status: "Checkout" as const,
        floor: "Floor 2",
        checkInTime: "04:00 PM",
    },
    {
        id: 6,
        roomNumber: "R-209",
        status: "Available" as const,
        floor: "Floor 2",
        building: "East Wing (Cardiac Care)",
    },
    {
        id: 7,
        roomNumber: "R-210",
        status: "Under Cleaning" as const,
        floor: "Floor 2",
        cleaningStatus: "In Progress",
        readyIn: "20m",
    },
    {
        id: 8,
        roomNumber: "R-211",
        status: "Occupied" as const,
        floor: "Floor 2",
        patientName: "Ajay Kumar",
        estCheckout: "Tomorrow",
    },
];

// Static mock data for Bed Allocation layout
const MOCK_BEDS = [
    // Row A
    { id: "A1", label: "A1", status: "Available" as const, row: "Row A" },
    { id: "A2", label: "A2", status: "Occupied" as const, patientName: "Rahul Sharma", row: "Row A" },
    { id: "A3", label: "A3", status: "Available" as const, row: "Row A" },
    { id: "A4", label: "A4", status: "Reserved" as const, patientName: "Reserved on Hold", row: "Row A" },
    // Row B
    { id: "B1", label: "B1", status: "Available" as const, row: "Row B" },
    { id: "B2", label: "B2", status: "Occupied" as const, patientName: "Amit Kumar", row: "Row B" },
    { id: "B3", label: "B3", status: "Available" as const, row: "Row B" },
    { id: "B4", label: "B4", status: "Available" as const, row: "Row B" },
    // Row C
    { id: "C1", label: "C1", status: "Occupied" as const, patientName: "Vikram Singh", row: "Row C" },
    { id: "C2", label: "C2", status: "Occupied" as const, patientName: "Neeraj Pandey", row: "Row C" },
    { id: "C3", label: "C3", status: "Available" as const, row: "Row C" },
    { id: "C4", label: "C4", status: "Available" as const, row: "Row C" },
];

interface StatCardProps {
    label: string;
    value: string | number;
    iconSrc: string;
}

function ManageRoomStatCard({ label, value, iconSrc }: StatCardProps) {
    return (
        <div className="rounded-[20px] p-5 bg-white flex justify-between items-center transition-all duration-200 hover:shadow-md select-none">
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[#737A8B]">{label}</span>
                <h4 className="font-semibold text-[32px] leading-[120%] text-[#262D3B]">
                    {value}
                </h4>
            </div>
            <div className=" flex items-center justify-center">
                <Image
                    src={iconSrc}
                    alt={label}
                    width={42}
                    height={42}
                    className="shrink-0"
                />
            </div>
        </div>
    );
}

interface RoomItem {
    id: number;
    roomNumber: string;
    status: "Available" | "Occupied" | "Under Cleaning" | "Not Available" | "Checkout";
    floor: string;
    building?: string;
    patientName?: string;
    estCheckout?: string;
    cleaningStatus?: string;
    readyIn?: string;
    checkInTime?: string;
}

interface RoomCardProps {
    room: RoomItem;
    isSelected: boolean;
    onClick: () => void;
}

function RoomCard({ room, isSelected, onClick }: RoomCardProps) {
    const borderClass = isSelected
        ? "border-[#0B8C00] ring-2 ring-[#0B8C00]/10"
        : "border-[#DFE0E2] hover:border-[#CBD5E1]";

    return (
        <div
            onClick={onClick}
            className={`rounded-[20px] border bg-white flex flex-col select-none cursor-pointer transition-all duration-200 ${borderClass}`}
        >
            {/* 1. Header Row */}
            <div className="p-5 flex justify-between items-center border-b border-[#DFE0E2] gap-2 h-[72px]">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#F5F6F8] text-[#787E8C] font-semibold text-sm flex items-center justify-center">
                        {room.id}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Room Number</span>
                        <span className="font-semibold text-sm text-[#262D3B]">{room.roomNumber}</span>
                    </div>
                </div>

                {/* Status Badges */}
                {room.status === "Available" && (
                    <Badge variant="success" className="text-[10px] font-normal px-3 py-1 bg-transparent">Available</Badge>
                )}
                {room.status === "Occupied" && (
                    <Badge variant="occupied" className="text-[10px] font-normal px-3 py-1">Occupied</Badge>
                )}
                {room.status === "Under Cleaning" && (
                    <Badge variant="cleaning" className="text-[10px] font-normal px-3 py-1">Under Cleaning</Badge>
                )}
                {room.status === "Not Available" && (
                    <Badge variant="not_available" className="text-[10px] font-normal px-3 py-1">Not Available</Badge>
                )}
                {room.status === "Checkout" && (
                    <Badge variant="checkout" className="text-[10px] font-normal px-3 py-1">Checkout</Badge>
                )}
            </div>

            {/* 2. Middle Row (Body info) */}
            <div className="p-5 border-b border-[#DFE0E2] text-xs leading-normal flex flex-col justify-center h-[90px]">
                {room.status === "Available" && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[#787E8C] font-semibold text-[10px]">Floor</span>
                            <span className="font-semibold text-[#262D3B] text-sm">{room.floor}</span>
                        </div>
                        {room.building && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[#787E8C] font-semibold text-[10px]">Building</span>
                                <span className="font-semibold text-[#262D3B] text-sm truncate" title={room.building}>{room.building}</span>
                            </div>
                        )}
                    </div>
                )}

                {room.status === "Occupied" && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[#787E8C] font-semibold text-[10px]">Floor</span>
                            <span className="font-semibold text-[#262D3B] text-sm">{room.floor}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[#787E8C] font-semibold text-[10px]">Patient</span>
                            <span className="font-semibold text-[#262D3B] text-sm">{room.patientName}</span>
                        </div>
                    </div>
                )}

                {room.status === "Under Cleaning" && (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[#787E8C] font-semibold text-[10px]">Cleaning</span>
                            <span className="font-semibold text-[#262D3B] text-sm">{room.cleaningStatus}</span>
                        </div>
                    </div>
                )}

                {room.status === "Not Available" && (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[#787E8C] font-semibold text-[10px]">Status</span>
                            <span className="font-semibold text-[#262D3B] text-sm">{room.cleaningStatus || "Maintenance"}</span>
                        </div>
                    </div>
                )}

                {room.status === "Checkout" && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[#787E8C] font-semibold text-[10px]">Floor</span>
                            <span className="font-semibold text-[#262D3B] text-sm">{room.floor}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[#787E8C] font-semibold text-[10px]">Check In</span>
                            <span className="font-semibold text-[#262D3B] text-sm">{room.checkInTime}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Bottom Row (Footer / Action) */}
            <div className="p-5 flex items-center justify-between text-xs h-[76px]">

                {room.status === "Under Cleaning" && room.id === 7 ? (
                    <div className="w-full flex items-center justify-between">
                        <span className="text-[#787E8C] font-semibold text-[10px]">Ready in {room.readyIn}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#787E8C]">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-full flex items-center justify-between">
                        <span className={`font-semibold text-sm ${isSelected ? "text-[#0B8C00]" : "text-[#262D3B]"}`}>
                            {isSelected ? "Selected" : "Select"}
                        </span>
                        {isSelected ? (
                            <span className="w-5 h-5 rounded-full border border-[#0B8C00] text-[#0B8C00] font-semibold text-[10px] flex items-center justify-center bg-[#E3EEE1]">
                                ✓
                            </span>
                        ) : (
                            <span className="w-5 h-5 rounded-full border border-[#DFE0E2] bg-white flex items-center justify-center" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface BedItem {
    id: string;
    label: string;
    status: "Available" | "Occupied" | "Reserved";
    patientName?: string;
    row: string;
}

interface BedCardProps {
    bed: BedItem;
    isBedSelected: boolean;
    onClick: () => void;
}

function BedCard({ bed, isBedSelected, onClick }: BedCardProps) {
    // Determine styling classes matching the mockup image precisely
    let styleClass = "";
    if (bed.status === "Available") {
        styleClass = isBedSelected
            ? "border-[#0B8C00] bg-[#E3EEE1]/40 ring-2 ring-[#0B8C00]/10"
            : "border-[#0B8C00] bg-[#F7FAF7] hover:bg-[#F2FAF2]";
    } else if (bed.status === "Occupied") {
        styleClass = "border-[#FCA5A5] bg-[#FEF2F2]";
    } else if (bed.status === "Reserved") {
        styleClass = "border-[#E8D7CA] bg-[#FFFBEB]";
    }

    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all duration-200 min-h-[96px] justify-center ${styleClass}`}
        >
            {/* Green or Red themed Bed Icon with no inner background circle */}
            <div className="w-5 h-5 flex items-center justify-center">
                <Image
                    src="/icons/bedDarkIcon.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="shrink-0"
                    style={{
                        filter: bed.status === "Occupied"
                            ? "invert(31%) sepia(94%) saturate(4633%) hue-rotate(349deg) brightness(97%) contrast(93%)"
                            : "invert(36%) sepia(90%) saturate(1814%) hue-rotate(86deg) brightness(95%) contrast(101%)"
                    }}
                />
            </div>

            {/* Bed ID */}
            <span className={`font-semibold text-xs ${bed.status === "Occupied" ? "text-[#EF4444]" : "text-[#262D3B]"}`}>
                {bed.id}
            </span>

            {/* Bed Status (Normal casing, not uppercase) */}
            <span className={`text-[10px] font-medium leading-tight ${bed.status === "Occupied"
                ? "text-[#EF4444]"
                : bed.status === "Reserved"
                    ? "text-[#D97706]"
                    : "text-[#434956]"
                }`}>
                {bed.status === "Reserved" ? "Reserved on Hold" : bed.status}
            </span>

            {/* Patient Name for Occupied beds */}
            {bed.status === "Occupied" && bed.patientName && (
                <span className="text-[9px] font-normal text-[#787E8C] truncate max-w-full leading-tight">
                    {bed.patientName}
                </span>
            )}
        </div>
    );
}

export default function ManageRoomPage() {
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(); // Default select Room 4 to show side panel allocation as requested
    const [selectedBed, setSelectedBed] = useState<string | null>("A1");

    // Filter states
    const [selectedWing, setSelectedWing] = useState("");
    const [selectedFloor, setSelectedFloor] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);

    // Find the currently selected room
    const selectedRoom = useMemo(() => {
        return MOCK_ROOMS.find(r => r.id === selectedRoomId);
    }, [selectedRoomId]);

    // Group beds for current room
    const bedsByRow = useMemo(() => {
        const rows = ["Row A", "Row B", "Row C"];
        return rows.map(r => ({
            rowName: r,
            beds: MOCK_BEDS.filter(b => b.row === r),
        }));
    }, []);

    // Filter rooms dynamically
    const filteredRooms = useMemo(() => {
        return MOCK_ROOMS.filter(room => {
            if (selectedFloor && room.floor !== selectedFloor) return false;
            if (selectedStatus && room.status !== selectedStatus) return false;
            return true;
        });
    }, [selectedFloor, selectedStatus]);

    // Paginate filtered rooms dynamically
    const paginatedRooms = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        if (startIndex >= filteredRooms.length && filteredRooms.length > 0) {
            return filteredRooms.slice(0, itemsPerPage);
        }
        return filteredRooms.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRooms, currentPage, itemsPerPage]);

    return (
        <AppShell>
            <div className="flex flex-col gap-6 select-none">
                {/* Header */}
                <PageHeading title="Manage Room" />

                {/* 4 Top Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                        { label: "Total Capacity", value: "150", iconSrc: "/icons/addPatient.svg" },
                        { label: "Total Available", value: "45", iconSrc: "/icons/bedDarkIcon.svg" },
                        { label: "Total Occupied", value: "88", iconSrc: "/icons/bedDarkIcon.svg" },
                        { label: "Total Reserved", value: "17", iconSrc: "/icons/bedDarkIcon.svg" },
                    ].map((card) => (
                        <ManageRoomStatCard
                            key={card.label}
                            label={card.label}
                            value={card.value}
                            iconSrc={card.iconSrc}
                        />
                    ))}
                </div>

                {/* Main Split Grid Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                    {/* Left Card: Rooms Grid Card (col-span-2 when room selected, col-span-3 otherwise) */}
                    <TableListingCard
                        className={selectedRoomId ? "xl:col-span-2 !mb-0" : "xl:col-span-3 !mb-0"}
                        sections={[
                            {
                                id: "rooms-list",
                                title: "Rooms",
                                titleRightContent: (
                                    <div className="flex items-center gap-3 w-full justify-end flex-wrap md:flex-nowrap">
                                        <div className="w-[250px] shrink-0">
                                            <FormSelectField
                                                label="Wing / Department"
                                                hideLabel
                                                options={[
                                                    { label: "Wing / Department", value: "" },
                                                    { label: "General Ward", value: "general" },
                                                    { label: "Cardiology", value: "cardiology" },
                                                    { label: "ICU", value: "icu" }
                                                ]}
                                                placeholder="Wing / Department"
                                                mode="single"
                                                background="normal"
                                                value={selectedWing}
                                                onChange={(val) => {
                                                    setSelectedWing(String(val));
                                                    setCurrentPage(1);
                                                }}
                                            />
                                        </div>
                                        <div className="w-[250px] shrink-0">
                                            <FormSelectField
                                                label="Floor"
                                                hideLabel
                                                options={[
                                                    { label: "Floor", value: "" },
                                                    { label: "Floor 1", value: "Floor 1" },
                                                    { label: "Floor 2", value: "Floor 2" },
                                                    { label: "Floor 3", value: "Floor 3" }
                                                ]}
                                                placeholder="Floor"
                                                mode="single"
                                                background="normal"
                                                value={selectedFloor}
                                                onChange={(val) => {
                                                    setSelectedFloor(String(val));
                                                    setCurrentPage(1);
                                                }}
                                            />
                                        </div>
                                        <div className="w-[250px] shrink-0">
                                            <FormSelectField
                                                label="Room Status"
                                                hideLabel
                                                options={[
                                                    { label: "Room Status", value: "" },
                                                    { label: "Available", value: "Available" },
                                                    { label: "Occupied", value: "Occupied" },
                                                    { label: "Under Cleaning", value: "Under Cleaning" },
                                                    { label: "Checkout", value: "Checkout" },
                                                    { label: "Not Available", value: "Not Available" }
                                                ]}
                                                placeholder="Room Status"
                                                mode="single"
                                                background="normal"
                                                value={selectedStatus}
                                                onChange={(val) => {
                                                    setSelectedStatus(String(val));
                                                    setCurrentPage(1);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ),
                                customContent: (
                                    <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedRoomId ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-6 pb-2`}>
                                        {paginatedRooms.map((room) => (
                                            <RoomCard
                                                key={room.id}
                                                room={room}
                                                isSelected={selectedRoomId === room.id}
                                                onClick={() => {
                                                    setSelectedRoomId(room.id === selectedRoomId ? null : room.id);
                                                }}
                                            />
                                        ))}
                                    </div>
                                ),
                                pagination: {
                                    currentPage: currentPage,
                                    totalItems: filteredRooms.length,
                                    itemsPerPage: itemsPerPage,
                                    onPageChange: (page) => setCurrentPage(page),
                                    onItemsPerPageChange: (size) => setItemsPerPage(size),
                                    itemsPerPageOptions: [6, 12, 24],
                                }
                            }
                        ]}
                    />


                    {/* Right Card: Bed Allocation Sidebar (only rendered when a Room is selected) */}
                    {selectedRoom && (
                        <div className="xl:col-span-1 bg-white p-6 rounded-[24px] border border-[#DFE0E2] shadow-sm flex flex-col gap-6 transition-all duration-200">
                            {/* Header details */}
                            <div className="flex justify-between items-start  pb-0">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-base font-semibold text-[#262D3B]">
                                        Bed Allocation - {selectedRoom.roomNumber}
                                    </h3>
                                    <span className="text-xs font-semibold text-[#787E8C]">
                                        General Ward • {selectedRoom.floor} • Total Beds: 10
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRoomId(null)}
                                    className="w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center text-[#787E8C] transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Bed Stat Widgets */}
                            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl border border-[#E3EEE1] bg-white shadow-sm">
                                {[
                                    { label: "Total Beds", value: "10", labelColor: "text-[#787E8C]", valueColor: "text-[#262D3B]" },
                                    { label: "Available", value: "4", labelColor: "text-[#0B8C00]", valueColor: "text-[#0B8C00]" },
                                    { label: "Occupied", value: "5", labelColor: "text-[#787E8C]", valueColor: "text-[#EF4444]" },
                                    { label: "Reserved", value: "1", labelColor: "text-[#787E8C]", valueColor: "text-[#D97706]" },
                                ].map((stat) => (
                                    <div key={stat.label} className="flex flex-col gap-0.5">
                                        <span className={`text-xs font-semibold ${stat.labelColor}`}>{stat.label}</span>
                                        <span className={`text-sm font-semibold ${stat.valueColor}`}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Bed Layout Grid */}
                            <div className="flex flex-col gap-5">
                                <h4 className="text-sm font-semibold text-[#262D3B]">Bed Layout</h4>

                                {bedsByRow.map((row) => (
                                    <div key={row.rowName} className="flex flex-col gap-2">
                                        <span className="text-sm font-semibold text-[#434956]">{row.rowName}</span>
                                        <div className="grid grid-cols-4 gap-3">
                                            {row.beds.map((bed) => (
                                                <BedCard
                                                    key={bed.id}
                                                    bed={bed}
                                                    isBedSelected={selectedBed === bed.id}
                                                    onClick={() => {
                                                        if (bed.status === "Available") {
                                                            setSelectedBed(bed.id);
                                                        } else {
                                                            alert(`Bed ${bed.id} is currently ${bed.status === "Occupied" ? "Occupied by " + bed.patientName : "Reserved on Hold"}.`);
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
