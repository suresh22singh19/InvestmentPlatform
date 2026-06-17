"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
    Button,
    Badge,
    FormSelectField,
    TableListingCard,
    Tooltip,
    MessageDialog,
    Dialog,
    BackToPreviousPageButton,
} from "@/components/ui";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import { useGetRoomListQuery, useGetRoomBedDetailQuery, useAllocateRoomMutation, type BedLayoutItem } from "@/store/api/counsellorApi";
import { useGetBuildingDropdownQuery, useGetFloorDropdownQuery, useGetRoomTypeDropdownQuery } from "@/store/api/commonApi";

interface CounsellingSummary {
    patientCategory: string;
    diseaseType: string;
    packageAdmissionType: string;
    applyOfferLabel: string;
    numberOfDays: number;
    finalAmountPayable: number;
}

function BedDetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center gap-4 py-3 border-b border-[#DFE0E2] text-sm">
            <span className="text-[#787E8C] font-medium shrink-0">{label}</span>
            <span className="text-[#262D3B] font-semibold text-right">{value}</span>
        </div>
    );
}

function getBedStatusMeta(status: string) {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "available" || statusLower === "free") {
        return { label: "Available", variant: "success" as const };
    }
    if (statusLower === "occupied" || statusLower === "fully occupied") {
        return { label: "Occupied", variant: "occupied" as const };
    }
    if (statusLower === "reserved") {
        return { label: "Reserved", variant: "checkout" as const };
    }
    return { label: status || "N/A", variant: "neutral" as const };
}

interface StatCardProps {
    label: string;
    value: string | number;
    iconSrc: string;
}

function ManageRoomStatCard({ label, value, iconSrc }: StatCardProps) {
    return (
        <div className="rounded-[20px] p-5 bg-white flex justify-between items-center transition-all duration-200 hover:shadow-md border border-[#DFE0E2] select-none">
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[#737A8B]">{label}</span>
                <h4 className="font-semibold text-[32px] leading-[120%] text-[#262D3B]">
                    {value}
                </h4>
            </div>
            <div className="flex items-center justify-center">
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
    status: string;
    floor: string | null;
    building?: string | null;
    branch?: string;
    roomType: string;
    totalBeds: number;
    availableBeds: number;
    occupiedBeds: number;
    reservedBeds: number;
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

    const statusLower = room.status?.toLowerCase() || "";
    const isAvailable = statusLower === "available" || statusLower === "vacant";
    const isOccupied = statusLower === "occupied" || statusLower === "fully occupied";
    const isPartiallyOccupied = statusLower === "partially occupied";
    const isReserved = statusLower === "reserved";
    const isUnderCleaning = statusLower === "under cleaning" || statusLower === "under maintenance" || statusLower === "not available";
    const isCheckout = statusLower === "checkout";

    return (
        <div
            onClick={onClick}
            className={`rounded-[20px] border bg-white flex flex-col select-none cursor-pointer transition-all duration-200 ${borderClass}`}
        >
            {/* Header Row */}
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
                {isAvailable && (
                    <Badge variant="success" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#0B8C0033] text-[#0B8C00]">Available</Badge>
                )}
                {isOccupied && (
                    <Badge variant="occupied" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#EF444433] text-[#EF4444]">Fully Occupied</Badge>
                )}
                {isPartiallyOccupied && (
                    <Badge variant="occupied" className="text-[10px] font-normal px-3 py-1 bg-transparent border border-[#F59E0B33] text-[#F59E0B]">Partially Occupied</Badge>
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

            {/* Body Info */}
            <div className="p-5 border-b border-[#DFE0E2] text-xs leading-normal flex flex-col justify-center h-[90px]">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#787E8C] font-semibold text-[10px] uppercase tracking-wider">Branch</span>
                        <span className="font-semibold text-[#262D3B] text-xs truncate" title={room.branch || "N/A"}>
                            {room.branch || "N/A"}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#787E8C] font-semibold text-[10px] uppercase tracking-wider">Room Type</span>
                        <span className="font-semibold text-[#262D3B] text-xs truncate">
                            {room.roomType || "N/A"}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#787E8C] font-semibold text-[10px] uppercase tracking-wider">Building</span>
                        <span className="font-semibold text-[#262D3B] text-xs truncate" title={room.building || "N/A"}>
                            {room.building || "N/A"}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#787E8C] font-semibold text-[10px] uppercase tracking-wider">Floor</span>
                        <span className="font-semibold text-[#262D3B] text-xs truncate">
                            {room.floor || "N/A"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="p-5 flex items-center justify-between text-xs h-[76px] bg-[#FAFBFD] rounded-b-[20px]">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[#787E8C] font-semibold text-[9px] uppercase tracking-wider">Available Beds</span>
                    <span className="font-bold text-[#0B8C00] text-xs">
                        {room.availableBeds} / {room.totalBeds} Beds
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <span className={`font-semibold text-xs ${isSelected ? "text-[#0B8C00]" : "text-[#787E8C]"}`}>
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
            </div>
        </div>
    );
}

interface BedItem {
    id: string;
    label: string;
    status: string;
    patientName?: string | null;
    patientUhid?: string | null;
}

interface BedCardProps {
    bed: BedItem;
    isBedSelected: boolean;
    onClick: () => void;
}

function BedCard({ bed, isBedSelected, onClick }: BedCardProps) {
    const statusLower = bed.status?.toLowerCase() || "";
    const isAvailable = statusLower === "available" || statusLower === "free";
    const isOccupied = statusLower === "occupied" || statusLower === "fully occupied";
    const isReserved = statusLower === "reserved";

    let styleClass = "";
    if (isAvailable) {
        styleClass = isBedSelected
            ? "border-2 border-[#0B8C00] bg-[#0B8C00]/30 ring-2 ring-[#0B8C00]/25 shadow-sm"
            : "border border-[#0B8C00] bg-[#F7FAF7] hover:bg-[#E3EEE1]";
    } else if (isOccupied) {
        styleClass = isBedSelected
            ? "border-2 border-[#EF4444] bg-[#EF4444]/25 ring-2 ring-[#EF4444]/20 shadow-sm"
            : "border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2]";
    } else if (isReserved) {
        styleClass = isBedSelected
            ? "border-2 border-[#D97706] bg-[#D97706]/30 ring-2 ring-[#D97706]/20 shadow-sm"
            : "border border-[#E8D7CA] bg-[#FFFBEB] hover:bg-[#FEF3C7]";
    } else {
        styleClass = isBedSelected
            ? "border-2 border-[#787E8C] bg-[#787E8C]/15 ring-2 ring-[#787E8C]/15"
            : "border border-[#DFE0E2] bg-gray-50";
    }

    const iconFilter = isOccupied
        ? "invert(31%) sepia(94%) saturate(4633%) hue-rotate(349deg) brightness(97%) contrast(93%)"
        : isReserved
            ? "invert(53%) sepia(87%) saturate(583%) hue-rotate(5deg) brightness(94%) contrast(95%)"
            : "invert(36%) sepia(90%) saturate(1814%) hue-rotate(86deg) brightness(95%) contrast(101%)";

    const labelClass = isOccupied
        ? "text-[#EF4444]"
        : isReserved
            ? "text-[#D97706]"
            : isAvailable
                ? "text-[#0B8C00]"
                : "text-[#262D3B]";

    const statusClass = isOccupied
        ? "text-[#EF4444]"
        : isReserved
            ? "text-[#D97706]"
            : isAvailable
                ? "text-[#0B8C00]"
                : "text-[#434956]";

    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all duration-200 min-h-[96px] justify-center ${styleClass}`}
        >
            <div className="w-5 h-5 flex items-center justify-center">
                <Image
                    src="/icons/bedDarkIcon.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="shrink-0"
                    style={{ filter: iconFilter }}
                />
            </div>

            <span className={`font-semibold text-xs ${labelClass}`}>
                {bed.label}
            </span>

            <span className={`text-[10px] font-medium leading-tight ${statusClass}`}>
                {isReserved ? "Reserved" : isOccupied ? "Occupied" : "Available"}
            </span>

            {bed.patientName && (
                <span className="text-[9px] font-normal text-[#434956] truncate max-w-full leading-tight">
                    {bed.patientName}
                </span>
            )}

            {bed.patientUhid && (
                <span className="text-[9px] font-normal text-[#787E8C] truncate max-w-full leading-tight mt-0.5">
                    {bed.patientUhid}
                </span>
            )}
        </div>
    );
}

interface RoomAllocationProps {
    id?: number;
    roomAllocatedHitAPI?: boolean;
    activePackage: {
        id?: string;
        packageName?: string;
        remark?: string;
        branchRoomType?: {
            roomRentPrice?: number;
        };
    };
    patientId?: number | string;
    patientPackageId?: number | string;
    patientDetails?: {
        patientName?: string;
        patientUhid?: string;
        contactNumber?: string;
        diagnosis?: string;
        doctorName?: string;
    };
    onSuccess?: () => void;
    onConfirmAllocation?: (allocation: {
        buildingId: number;
        floorId: number;
        roomId: number;
        roomNumber: string;
        bedId: number;
        bedNumber: string;
    }) => void;
    onCancel?: () => void;
    onBack?: () => void;
    selectedRoomId?: number | null;
    setSelectedRoomId?: (id: number | null) => void;
    selectedBed?: string | null;
    setSelectedBed?: (bed: string | null) => void;
    setSelectedRoom?: (room: any) => void;
    counsellingSummary?: CounsellingSummary;
}

export default function RoomAllocation({
    id,
    roomAllocatedHitAPI = false,
    activePackage,
    patientId,
    patientPackageId,
    patientDetails,
    onSuccess,
    onConfirmAllocation,
    onCancel,
    onBack,
    selectedRoomId: controlledRoomId,
    setSelectedRoomId: controlledSetRoomId,
    selectedBed: controlledBed,
    setSelectedBed: controlledSetBed,
    setSelectedRoom,
    counsellingSummary,

}: RoomAllocationProps) {
    const selectedBranch = useAppSelector(selectSelectedBranch);
    const userBranchId = useAppSelector(selectUserBranchId);
    const branchId = selectedBranch?.id || userBranchId || 1;

    const [localRoomId, setLocalRoomId] = useState<number | null>(null);
    const [localBed, setLocalBed] = useState<string | null>(null);

    const [remark, setRemark] = useState("");
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [bedDetailsModalBed, setBedDetailsModalBed] = useState<BedLayoutItem | null>(null);
    const [showBedDetailsDialog, setShowBedDetailsDialog] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [allocateRoom] = useAllocateRoomMutation();

    const isControlledRoom = controlledRoomId !== undefined && controlledSetRoomId !== undefined;
    const selectedRoomId = isControlledRoom ? controlledRoomId : localRoomId;
    const setSelectedRoomId = isControlledRoom ? controlledSetRoomId : setLocalRoomId;

    const isControlledBed = controlledBed !== undefined && controlledSetBed !== undefined;
    const selectedBed = isControlledBed ? controlledBed : localBed;
    const setSelectedBed = isControlledBed ? controlledSetBed : setLocalBed;

    // Dynamic dropdown hooks from common API
    const { data: buildingData } = useGetBuildingDropdownQuery({ branchId });
    const { data: floorData } = useGetFloorDropdownQuery({ branchId });
    const { data: roomTypeData } = useGetRoomTypeDropdownQuery();

    // Filter states
    const [selectedBuilding, setSelectedBuilding] = useState("");
    const [selectedFloor, setSelectedFloor] = useState("");
    const [selectedRoomType, setSelectedRoomType] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const getMappedRoomStatus = (status: string) => {
        if (!status) return undefined;
        return status;
    };

    console.log("dsjdfhssdj",counsellingSummary)

    // Compile building and floor options
    const floorOptions = useMemo(() => {
        const opts = [{ label: "All", value: "" }];
        const list = floorData?.data || [];
        list.forEach((f) => {
            const rawName = (f as any).floor || f.name || "";
            const capitalized = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "";
            opts.push({ label: capitalized, value: f.id.toString() });
        });
        return opts;
    }, [floorData]);

    const buildingOptions = useMemo(() => {
        const opts = [{ label: "All", value: "" }];
        const list = buildingData?.data || [];
        list.forEach((b) => {
            opts.push({ label: b.name, value: b.id.toString() });
        });
        return opts;
    }, [buildingData]);

    const roomTypeOptions = useMemo(() => {
        const opts = [{ label: "All", value: "" }];
        const list = roomTypeData?.data || [];
        list.forEach((rt) => {
            opts.push({ label: rt.name, value: rt.name });
        });
        return opts;
    }, [roomTypeData]);

    // Rooms list query
    const roomParams = {
        branchId,
        buildingId: selectedBuilding || undefined,
        floorId: selectedFloor || undefined,
        roomType: selectedRoomType || undefined,
        roomStatus: getMappedRoomStatus(selectedStatus),
        page: currentPage,
        limit: itemsPerPage,
    };

    const { data: roomListRes, isLoading: isRoomsLoading } = useGetRoomListQuery(roomParams);

    const stats = roomListRes?.data?.stats || {
        totalCapacity: 0,
        totalAvailable: 0,
        totalOccupied: 0,
        totalReserved: 0,
    };

    const roomsData = roomListRes?.data?.data || [];
    const totalRooms = roomListRes?.data?.total || 0;

    // Bed layout query for selected room
    const { data: bedDetailRes, isLoading: isBedsLoading } = useGetRoomBedDetailQuery(selectedRoomId || "", {
        skip: !selectedRoomId,
    });

    // Find current room
    const selectedRoom = useMemo(() => {
        if (!selectedRoomId) return null;
        const found = roomsData.find(r => r.id === selectedRoomId);
        if (found) return found;
        if (bedDetailRes?.data?.room) {
            const r = bedDetailRes.data.room;
            return {
                id: r.id,
                roomNumber: r.roomNumber,
                roomType: r.roomType,
                floor: r.floor,
                building: r.building,
                status: "",
                totalBeds: r.totalBeds,
                availableBeds: bedDetailRes.data.stats.available,
                occupiedBeds: bedDetailRes.data.stats.occupied,
                reservedBeds: bedDetailRes.data.stats.reserved,
            };
        }
    }, [selectedRoomId, roomsData, bedDetailRes]);

    useEffect(() => {
        if (setSelectedRoom) {
            setSelectedRoom(selectedRoom);
        }
    }, [selectedRoom, setSelectedRoom]);

    const packagePriceLabel = useMemo(() => {
        const roomRent = activePackage?.branchRoomType?.roomRentPrice
            ? Number(activePackage.branchRoomType.roomRentPrice)
            : 0;
        if (roomRent > 0) {
            return `₹${roomRent.toLocaleString("en-IN")}/days`;
        }
        if (counsellingSummary?.finalAmountPayable) {
            return `₹${counsellingSummary.finalAmountPayable.toLocaleString("en-IN")}`;
        }
        return "N/A";
    }, [activePackage, counsellingSummary?.finalAmountPayable]);

    const bedModalRoomSubtitle = useMemo(() => {
        if (!selectedRoom) return "";
        const bedCount = bedDetailRes?.data?.room?.totalBeds ?? selectedRoom.totalBeds;
        const bedLabel = bedCount === 1 ? "1 bed" : `${bedCount} beds`;
        return `${selectedRoom.floor || "N/A"} • ${selectedRoom.roomType} • ${bedLabel}`;
    }, [selectedRoom, bedDetailRes?.data?.room?.totalBeds]);

    console.log("counsellingSummaryhdgshd", counsellingSummary);

    const handleBedClick = (bed: BedLayoutItem) => {
        const statusLower = bed.status?.toLowerCase() || "";
        const isAvailable = statusLower === "available" || statusLower === "free";
        const bedIdStr = bed.bedId.toString();

        if (isAvailable) {
            if (selectedBed === bedIdStr) {
                setSelectedBed(null);
                setBedDetailsModalBed(null);
                setShowBedDetailsDialog(false);
                return;
            }
            setSelectedBed(bedIdStr);
        }

        setBedDetailsModalBed(bed);
        setShowBedDetailsDialog(true);
    };

    const handleConfirm = async () => {
        if (!selectedRoom || !selectedBed) return;

        const selectedBedObj = bedDetailRes?.data?.bedLayout?.find(b => b.bedId.toString() === selectedBed);
        const bedNumber = selectedBedObj?.bedNumber || selectedBed;

        const roomBuildingName = selectedRoom.building || "";
        const foundBuilding = buildingData?.data?.find(
            (b) => b.name?.toLowerCase() === roomBuildingName.toLowerCase()
        );
        const resolvedBuildingId = foundBuilding
            ? foundBuilding.id
            : selectedBuilding
                ? parseInt(selectedBuilding, 10)
                : 1;

        const roomFloorName = selectedRoom.floor || "";
        const foundFloor = floorData?.data?.find((f) => {
            const rawName = (f as { floor?: string; name?: string }).floor || f.name || "";
            return rawName.toLowerCase() === roomFloorName.toLowerCase();
        });
        const resolvedFloorId = foundFloor
            ? foundFloor.id
            : selectedFloor
                ? parseInt(selectedFloor, 10)
                : 1;

        const allocation = {
            buildingId: Number(resolvedBuildingId),
            floorId: Number(resolvedFloorId),
            roomId: Number(selectedRoom.id),
            roomNumber: selectedRoom.roomNumber,
            bedId: Number(selectedBed),
            bedNumber,
        };

        if (!roomAllocatedHitAPI) {
            onConfirmAllocation?.(allocation);
            onSuccess?.();
            return;
        }

        if (!patientId || !patientPackageId) {
            setErrorMessage("Patient information is missing. Please return and try again.");
            setShowErrorDialog(true);
            return;
        }

        setIsConfirming(true);
        try {
            const res = await allocateRoom({
                patientId,
                // id: patientPackageId,
                id: Number(id),
                buildingId: allocation.buildingId,
                floorId: allocation.floorId,
                roomId: allocation.roomId,
                bedId: allocation.bedId,
                ...(remark.trim() ? { remark: remark.trim() } : {}),
            }).unwrap();

            if (res?.success === false) {
                setErrorMessage(res?.message || "Failed to allocate room.");
                setShowErrorDialog(true);
                return;
            }

            onConfirmAllocation?.(allocation);
            setShowSuccessDialog(true);
        } catch (err: unknown) {
            const apiErr = err as { data?: { message?: string }; message?: string };
            setErrorMessage(
                apiErr?.data?.message || apiErr?.message || "An error occurred while allocating the room."
            );
            setShowErrorDialog(true);
        } finally {
            setIsConfirming(false);
        }
    };

    const bedModalStatusMeta = bedDetailsModalBed
        ? getBedStatusMeta(bedDetailsModalBed.status)
        : null;
    const isAvailableBedModal = bedModalStatusMeta?.label === "Available";
    const bedModalPatientName = bedDetailsModalBed
        ? isAvailableBedModal
            ? patientDetails?.patientName || "N/A"
            : bedDetailsModalBed.patientName || "N/A"
        : "N/A";
    const bedModalPatientUhid = bedDetailsModalBed
        ? isAvailableBedModal
            ? patientDetails?.patientUhid || "N/A"
            : bedDetailsModalBed.patientUhid || "N/A"
        : "N/A";

    // Helper to calculate initials
    const getInitials = (name: string) => {
        if (!name) return "PT";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="flex flex-col gap-6 select-none mt-6">
            {/* Premium Inline Patient Details Header */}
            {/* {patientDetails && (
                <div className="w-full rounded-[20px] border border-[#E3EEE1] bg-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm select-none">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#E3EEE1] text-[#0B8C00] font-extrabold text-xl flex items-center justify-center select-none shadow-inner shrink-0">
                            {getInitials(patientDetails.patientName || "")}
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-lg font-bold text-[#262D3B]">{patientDetails.patientName || "Patient"}</h2>
                                <Badge
                                    variant="success"
                                    className="text-[10px] font-semibold uppercase tracking-wider select-none px-2.5 py-0.5"
                                >
                                    Confirming Admission
                                </Badge>
                            </div>
                            <p className="text-xs font-medium text-[#787E8C] leading-relaxed">
                                UHID: <span className="text-[#262D3B] font-semibold">{patientDetails.patientUhid || "N/A"}</span>
                                {patientDetails.contactNumber && (
                                    <> • Contact: <span className="text-[#262D3B] font-semibold">{patientDetails.contactNumber}</span></>
                                )}
                                {patientDetails.doctorName && (
                                    <> • Doctor: <span className="text-[#262D3B] font-semibold">{patientDetails.doctorName}</span></>
                                )}
                                {patientDetails.diagnosis && (
                                    <> • Complaint: <span className="text-[#262D3B] font-semibold">{patientDetails.diagnosis}</span></>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )} */}

            {/* Selected Package Banner (Green background, white text) */}
            <div className="w-full rounded-[20px] bg-[#0B8C00] text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm select-none">
                <div className="flex items-center gap-4">
                    <div className="w-[80px] h-[80px] rounded-xl bg-white/20 flex items-center justify-center">
                        <Image
                            src="/icons/bedDarkIcon.svg"
                            alt=""
                            width={42}
                            height={42}
                            style={{ filter: "brightness(0) invert(1)" }}
                        />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Package Selected</span>
                        <h3 className="text-xl font-bold">{activePackage.packageName || "Deluxe Single"}</h3>
                        <Tooltip
                            position="top"
                            maxWidth={600}
                            content={
                                <span className="inline-block w-max whitespace-normal break-words text-left text-inherit max-w-[600px]">
                                    {activePackage.remark || "Premium suite with private lounge and high-dependency monitoring equipment."}
                                </span>
                            }
                        >
                            <p className="text-xs text-white/90 font-medium leading-relaxed whitespace-nowrap truncate max-w-[1200px] cursor-pointer" >
                                {activePackage.remark || "Premium suite with private lounge and high-dependency monitoring equipment."}
                            </p>
                        </Tooltip>
                    </div>
                </div>
                <div className="flex flex-col md:items-end gap-0.5">
                    <span className="text-lg font-normal tracking-wider">Daily Rate</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black">₹ {((activePackage.branchRoomType?.roomRentPrice || 1500) * 9).toLocaleString()}</span>
                        <span className="text-lg font-normal">/day</span>
                    </div>
                </div>
            </div>

            {/* 4 Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: "Total Capacity", value: stats.totalCapacity, iconSrc: "/icons/addPatient.svg" },
                    { label: "Total Available", value: stats.totalAvailable, iconSrc: "/icons/bedDarkIcon.svg" },
                    { label: "Total Occupied", value: stats.totalOccupied, iconSrc: "/icons/bedDarkIcon.svg" },
                    { label: "Total Reserved", value: stats.totalReserved, iconSrc: "/icons/bedDarkIcon.svg" },
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
                {/* Left Card: Rooms Grid Card */}
                <TableListingCard
                    className={selectedRoomId ? "xl:col-span-2 !mb-0" : "xl:col-span-3 !mb-0"}
                    sections={[
                        {
                            id: "rooms-list",
                            title: "Rooms",
                            titleRightContent: (
                                <div className="flex items-center gap-3 w-full justify-end flex-wrap md:flex-nowrap">
                                    {/* Dynamic Building Selector */}
                                    <div className="w-[240px] shrink-0">
                                        <FormSelectField
                                            label="Building"
                                            hideLabel
                                            options={buildingOptions}
                                            placeholder="Building"
                                            mode="single"
                                            background="normal"
                                            value={selectedBuilding}
                                            onChange={(val) => {
                                                const v = typeof val === "string" ? val : "";
                                                setSelectedBuilding(v);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    {/* Dynamic Floor Selector */}
                                    <div className="w-[240px] shrink-0">
                                        <FormSelectField
                                            label="Floor"
                                            hideLabel
                                            options={floorOptions}
                                            placeholder="Floor"
                                            mode="single"
                                            background="normal"
                                            value={selectedFloor}
                                            onChange={(val) => {
                                                const v = typeof val === "string" ? val : "";
                                                setSelectedFloor(v);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    {/* Room Type Selector */}
                                    <div className="w-[240px] shrink-0">
                                        <FormSelectField
                                            label="Room Type"
                                            hideLabel
                                            options={roomTypeOptions}
                                            placeholder="Room Type"
                                            mode="single"
                                            background="normal"
                                            value={selectedRoomType}
                                            onChange={(val) => {
                                                const v = typeof val === "string" ? val : "";
                                                setSelectedRoomType(v);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    {/* Room Status Selector */}
                                    <div className="w-[240px] shrink-0">
                                        <FormSelectField
                                            label="Room Status"
                                            hideLabel
                                            options={[
                                                { label: "All", value: "" },
                                                { label: "Vacant / Available", value: "vacant" },
                                                { label: "Fully Occupied", value: "fully occupied" },
                                                { label: "Partially Occupied", value: "partially occupied" },
                                                { label: "Reserved", value: "reserved" },
                                                { label: "Under Maintenance", value: "under maintenance" }
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
                            customContent: isRoomsLoading ? (
                                <div className="flex items-center justify-center p-12 text-sm text-[#787E8C]">
                                    Loading Rooms...
                                </div>
                            ) : roomsData.length === 0 ? (
                                <div className="flex items-center justify-center p-12 text-sm text-[#787E8C]">
                                    No rooms found matching filters.
                                </div>
                            ) : (
                                <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedRoomId ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-6 pb-2`}>
                                    {roomsData.map((room) => (
                                        <RoomCard
                                            key={room.id}
                                            room={room}
                                            isSelected={selectedRoomId === room.id}
                                            onClick={() => {
                                                setSelectedRoomId(room.id === selectedRoomId ? null : room.id);
                                                setSelectedBed(null);
                                            }}
                                        />
                                    ))}
                                </div>
                            ),
                            pagination: {
                                currentPage: currentPage,
                                totalItems: totalRooms,
                                itemsPerPage: itemsPerPage,
                                onPageChange: (page) => setCurrentPage(page),
                                onItemsPerPageChange: (size) => setItemsPerPage(size),
                                itemsPerPageOptions: [10, 20, 50, 100],
                            }
                        }
                    ]}
                />

                {/* Right Card: Bed Allocation Sidebar */}
                {selectedRoom && (
                    <div className="xl:col-span-1 bg-white p-6 rounded-[24px] border border-[#DFE0E2] shadow-sm flex flex-col gap-6 transition-all duration-200">
                        {/* Header details */}
                        <div className="flex justify-between items-start pb-0">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-base font-semibold text-[#262D3B]">
                                    Bed Allocation - {selectedRoom.roomNumber}
                                </h3>
                                <span className="text-xs font-semibold text-[#787E8C]">
                                    {selectedRoom.roomType.toUpperCase()} • {selectedRoom.floor || "N/A"} • Total Beds: {selectedRoom.totalBeds}
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
                                { label: "Total Beds", value: bedDetailRes?.data?.stats?.totalBeds ?? selectedRoom.totalBeds, labelColor: "text-[#787E8C]", valueColor: "text-[#262D3B]" },
                                { label: "Available", value: bedDetailRes?.data?.stats?.available ?? selectedRoom.availableBeds, labelColor: "text-[#0B8C00]", valueColor: "text-[#0B8C00]" },
                                { label: "Occupied", value: bedDetailRes?.data?.stats?.occupied ?? selectedRoom.occupiedBeds, labelColor: "text-[#787E8C]", valueColor: "text-[#EF4444]" },
                                { label: "Reserved", value: bedDetailRes?.data?.stats?.reserved ?? selectedRoom.reservedBeds, labelColor: "text-[#787E8C]", valueColor: "text-[#D97706]" },
                            ].map((stat) => (
                                <div key={stat.label} className="flex flex-col gap-0.5">
                                    <span className={`text-xs font-semibold ${stat.labelColor}`}>{stat.label}</span>
                                    <span className={`text-sm font-semibold ${stat.valueColor}`}>{stat.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Bed Layout Grid */}
                        <div className="flex flex-col gap-5">
                            <h4 className="text-sm font-semibold text-[#262D3B]">All Beds in Room</h4>

                            {isBedsLoading ? (
                                <div className="flex items-center justify-center p-8 text-sm text-[#787E8C]">
                                    Loading Bed Layout...
                                </div>
                            ) : !bedDetailRes?.data?.bedLayout || bedDetailRes.data.bedLayout.length === 0 ? (
                                <div className="flex items-center justify-center p-8 text-sm text-[#787E8C]">
                                    No beds configured for this room.
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-3">
                                    {bedDetailRes.data.bedLayout.map((bed) => (
                                        <BedCard
                                            key={bed.bedId}
                                            bed={{
                                                id: bed.bedId.toString(),
                                                label: bed.bedNumber,
                                                status: bed.status,
                                                patientName: bed.patientName,
                                                patientUhid: bed.patientUhid,
                                            }}
                                            isBedSelected={
                                                selectedBed === bed.bedId.toString() ||
                                                (showBedDetailsDialog &&
                                                    bedDetailsModalBed?.bedId === bed.bedId)
                                            }
                                            onClick={() => handleBedClick(bed)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Allocation Remark (Optional) */}
                            <div className="flex flex-col gap-1.5 mt-2">
                                <span className="text-xs font-semibold text-[#787E8C]">Allocation Remark (Optional)</span>
                                <textarea
                                    className="w-full min-h-[60px] max-h-[120px] rounded-lg border border-[#DFE0E2] p-2.5 text-xs text-[#262D3B] focus:border-[#0B8C00] focus:ring-1 focus:ring-[#0B8C00]/20 outline-none resize-y"
                                    placeholder="Enter any preferences, e.g., Patient prefers window bed..."
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                />
                            </div>


                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Status / Confirmation Bar */}
            <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#0B8C00] flex items-center justify-center">
                        <Image
                            src="/icons/bedDarkIcon.svg"
                            alt=""
                            width={24}
                            height={24}
                            className="shrink-0"
                            style={{ filter: "brightness(0) invert(1)" }}
                        />
                    </div>
                    <div className="flex flex-col select-none">
                        <span className="text-xs font-semibold text-[#787E8C]">Confirming Allocation for</span>
                        <h4 className="font-extrabold text-[#262D3B] text-base">
                            {selectedRoomId ? `Room ${selectedRoom?.roomNumber} (${activePackage.packageName || "Deluxe Single"})` : "Select an Available Room"}
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-3 select-none">
                    {/* <Button
                        type="button"
                        variant="outline"
                        className="!border-[#DFE0E2] !text-[#434956] hover:!bg-gray-50 px-6 h-11 rounded-full font-bold"
                        onClick={onBack}
                    >
                        Back
                    </Button> */}

                     <BackToPreviousPageButton text="Back" onClick={onBack} />
                    <Button
                        type="button"
                        variant="outline"
                        className="!border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#F2FAF2] px-6 h-11 rounded-full font-bold"
                        onClick={() => {
                            setSelectedRoomId(null);
                            setSelectedBed(null);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        className="px-6 h-11 rounded-full font-bold"
                        disabled={!selectedRoomId || !selectedBed || isConfirming}
                        onClick={handleConfirm}
                    >
                        {isConfirming ? "Allocating..." : "Confirm Allocation"}
                    </Button>
                </div>
            </div>

            {/* Success Feedback Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => {
                    setShowSuccessDialog(false);
                    if (onSuccess) onSuccess();
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={
                    <div className="flex flex-col items-center text-center">
                        <span className="text-lg font-bold text-[#1E293B] mb-1">Allocation Successful</span>
                        <span className="text-sm text-[#475569]">
                            Room and Bed have been allocated successfully!
                        </span>
                    </div>
                }
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowSuccessDialog(false);
                    if (onSuccess) onSuccess();
                }}
            />

            {bedDetailsModalBed && bedModalStatusMeta && (
                <Dialog
                    open={showBedDetailsDialog}
                    onClose={() => setShowBedDetailsDialog(false)}
                    title=""
                    width={520}
                    contentPadding="px-6 pb-6 pt-2"
                    customHeader={
                        <div className="flex items-start justify-between px-6 pt-5 pb-2">
                            <div className="flex flex-col gap-1.5 pr-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-lg font-bold text-[#262D3B]">
                                        Bed Allocation - {bedDetailsModalBed.bedNumber}
                                    </h2>
                                    <Badge
                                        variant={bedModalStatusMeta.variant}
                                        className={`text-[10px] font-semibold px-2.5 py-0.5 bg-transparent border ${
                                            bedModalStatusMeta.label === "Occupied"
                                                ? "border-[#EF444433] text-[#EF4444]"
                                                : bedModalStatusMeta.label === "Available"
                                                    ? "border-[#0B8C0033] text-[#0B8C00]"
                                                    : bedModalStatusMeta.label === "Reserved"
                                                        ? "border-[#F59E0B33] text-[#F59E0B]"
                                                        : ""
                                        }`}
                                    >
                                        {bedModalStatusMeta.label}
                                    </Badge>
                                </div>
                                {bedModalRoomSubtitle && (
                                    <p className="text-xs font-semibold text-[#787E8C]">{bedModalRoomSubtitle}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBedDetailsDialog(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[#F2F8F2] shrink-0"
                                aria-label="Close dialog"
                            >
                                <Image src="/icons/CrossIcon.svg" alt="" width={20} height={20} />
                            </button>
                        </div>
                    }
                >
                    <div className="flex flex-col">
                        <BedDetailRow label="Patient Name" value={bedModalPatientName} />
                        <BedDetailRow label="Patient UHID" value={bedModalPatientUhid} />
                        <BedDetailRow label="Package Name" value={activePackage?.packageName || "N/A"} />
                        <BedDetailRow label="Package Price" value={packagePriceLabel || "N/A"} />
                        <BedDetailRow label="Patient Category" value={counsellingSummary?.patientCategory || "N/A"} />
                        <BedDetailRow label="Disease Type" value={counsellingSummary?.diseaseType || "N/A"} />
                        <BedDetailRow label="Admission Type" value={counsellingSummary?.packageAdmissionType || "N/A"} />
                        <BedDetailRow label="Apply Offer" value={counsellingSummary?.applyOfferLabel || "Not Applied"} />
                    </div>

                    <div className="flex justify-center pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            className="!border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#F2FAF2] min-w-[160px] h-11 rounded-full font-bold"
                            onClick={() => setShowBedDetailsDialog(false)}
                        >
                            Close
                        </Button>
                    </div>
                </Dialog>
            )}

            {/* Error Feedback Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={
                    <div className="flex flex-col items-center text-center">
                        <span className="text-lg font-bold text-[#1E293B] mb-1">Allocation Failed</span>
                        <span className="text-sm text-[#475569]">
                            {errorMessage}
                        </span>
                    </div>
                }
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />
        </div>
    );
}
