"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Button,
  Dialog,
  FormInputField,
  FormSelectField,
  FormTextareaField,
  ConfigurationSummaryPanel,
  MessageDialog,
  Pagination,
  Tooltip,
} from "@/components/ui";
import type { RoomInventoryItem } from "./RoomInventory";
import QRCode from "qrcode";
import type { BedApiRow, CreateBedItemPayload } from "@/store/api/branchSetupApi";
import {
  useGetAllBedsQuery,
  useGetSingleRoomQuery,
  useGetBranchHierarchyTreeQuery,
  useCreateBedsMutation,
  useDeleteBedMutation,
  useUpdateBedMutation,
} from "@/store/api/branchSetupApi";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import {
  sanitizeBedNumberIdentifierInput,
  sanitizeDigitsOnlyInput,
  sanitizeLettersOnlyNotesInput,
  formatRoomHierarchyPath,
} from "@/lib/utils/common";
import { useFacilityConfigurationSummaryFromHierarchy } from "@/hooks/useFacilityConfigurationSummaryFromHierarchy";

/** API-aligned bed occupancy codes (sent as `available` / `status` on create/update). */
export type BedCoreStatus = "yes" | "no" | "cleaning";

export type BedItem = {
  id: string;
  bedNumber: string;
  /** `yes` = vacant, `no` = occupied; under maintenance is sent as `available`: `"cleaning"` and `status`: `"active"` on the API. */
  status: BedCoreStatus;
  notes?: string;
  qrCode?: string;
  /** When set from API, image URL for scannable code */
  barcodeUrl?: string;
  /** API `reserved`: "yes" | "no" */
  reserved?: "yes" | "no";
};

const STATUS_OPTIONS = [
  { value: "yes", label: "Vacant" },
  { value: "no", label: "Occupied" },
  { value: "cleaning", label: "Under Maintenance" },
];

const RESERVED_YES_NO_OPTIONS = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

/** Occupancy for the Status pill — always follows bed API state (available / cleaning mapping). */
function bedStatusPillLabel(s: BedCoreStatus): string {
  if (s === "yes") return "Vacant";
  if (s === "no") return "Occupied";
  if (s === "cleaning") return "Under Maintenance";
  return s;
}

function reservedPillLabel(bed: BedItem): "Yes" | "No" {
  return bed.reserved === "yes" ? "Yes" : "No";
}

function apiBedToCoreStatus(row: BedApiRow): BedCoreStatus {
  const av = String(row.available ?? "").toLowerCase();
  if (av === "cleaning") return "cleaning";
  const st = String(row.status ?? "").toLowerCase();
  if (st === "cleaning" || st === "inactive") return "cleaning";
  if (av === "no") return "no";
  return "yes";
}

function uiStatusToApiFields(status: BedCoreStatus): Pick<
  CreateBedItemPayload,
  "available" | "reserved" | "status"
> {
  switch (status) {
    case "no":
      return { available: "no", reserved: "no", status: "active" };
    case "cleaning":
      return { available: "cleaning", reserved: "no", status: "active" };
    case "yes":
    default:
      return { available: "yes", reserved: "no", status: "active" };
  }
}

function mapApiBedToItem(row: BedApiRow): BedItem {
  const url = row.barcodeUrl?.trim();
  const reserved: "yes" | "no" =
    String(row.reserved ?? "").toLowerCase() === "yes" ? "yes" : "no";
  return {
    id: String(row.id),
    bedNumber: row.bedNumber,
    status: apiBedToCoreStatus(row),
    notes: row.bedNote ?? undefined,
    barcodeUrl: url || undefined,
    qrCode: row.bedNumber,
    reserved,
  };
}

function parseMutationError(error: unknown): string {
  const e = error as {
    data?: { message?: string; error?: string };
    error?: string;
    message?: string;
  };
  if (e?.data?.message) return e.data.message;
  if (e?.data?.error) return e.data.error;
  if (e?.error) return e.error;
  if (e?.message) return e.message;
  return "Something went wrong. Please try again.";
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Renders a scannable QR code for the given value (e.g. bed identifier). */
function BedQrCode({ value, size = 80 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(setDataUrl)
      .catch(() => setError(true));
  }, [value, size]);
  if (error) return <span className="text-xs text-gray-400">QR unavailable</span>;
  if (!dataUrl)
    return <div className="bg-gray-100 animate-pulse rounded" style={{ width: size, height: size }} />;
  return (
    <img
      src={dataUrl}
      alt={`QR ${value}`}
      width={size}
      height={size}
      className="rounded border border-gray-200"
    />
  );
}

function BedQrOrImage({ scanValue, barcodeUrl }: { scanValue: string; barcodeUrl?: string }) {
  const url = barcodeUrl?.trim();
  if (url && isHttpUrl(url)) {
    return (
      <img
        src={url}
        alt=""
        width={72}
        height={72}
        className="rounded border border-gray-200 object-contain bg-white"
      />
    );
  }
  return <BedQrCode value={scanValue || "bed"} size={72} />;
}

type BedManagementProps = {
  facilityName: string;
  room: RoomInventoryItem;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  /** When set with API room/building/floor ids, beds are loaded and saved via the bed APIs */
  branchId?: number | null;
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
  onBack: () => void;
};

export const BedManagement = ({
  facilityName,
  room,
  canView = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  branchId = null,
  configurationSummary = null,
  onBack,
}: BedManagementProps) => {
  const branchIdNum = branchId ?? 0;
  const { data: hierarchyTreeRes } = useGetBranchHierarchyTreeQuery(branchIdNum, {
    skip: branchId == null || !canView,
  });
  const configurationSummaryForPanel = useFacilityConfigurationSummaryFromHierarchy(
    hierarchyTreeRes?.success && Array.isArray(hierarchyTreeRes.data) ? hierarchyTreeRes.data : undefined,
    configurationSummary,
  );

  const [localBeds, setLocalBeds] = useState<BedItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBedNumber, setNewBedNumber] = useState("");
  const [editingBed, setEditingBed] = useState<BedItem | null>(null);
  const [editBedNumber, setEditBedNumber] = useState("");
  const [editStatus, setEditStatus] = useState<BedCoreStatus>("yes");
  const [editReserved, setEditReserved] = useState<"yes" | "no">("no");
  const [editNotes, setEditNotes] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [seriesPrefix, setSeriesPrefix] = useState("Bed");
  const [seriesStart, setSeriesStart] = useState("1");
  const [seriesCount, setSeriesCount] = useState("5");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [bedsPage, setBedsPage] = useState(1);
  const [bedsItemsPerPage, setBedsItemsPerPage] = useState(10);

  const roomIdNum = useMemo(() => Number.parseInt(room.id, 10), [room.id]);
  const apiMode =
    branchId != null &&
    room.buildingId != null &&
    room.floorId != null &&
    Number.isFinite(roomIdNum) &&
    !Number.isNaN(roomIdNum);

  useEffect(() => {
    setBedsPage(1);
  }, [branchId, roomIdNum, room.floorId]);

  const { data: bedsResponse, isFetching: isFetchingBeds } = useGetAllBedsQuery(
    {
      branchId: branchId ?? 0,
      floorId: room.floorId ?? 0,
      roomId: roomIdNum,
      page: bedsPage,
      limit: bedsItemsPerPage,
    },
    { skip: !apiMode || !canView },
  );

  const { data: singleRoomRes, isFetching: isFetchingSingleRoom } = useGetSingleRoomQuery(roomIdNum, {
    skip: !apiMode || !canView,
  });

  const [createBeds, { isLoading: isCreatingBeds }] = useCreateBedsMutation();
  const [deleteBedMut, { isLoading: isDeletingBed }] = useDeleteBedMutation();
  const [updateBedMut, { isLoading: isUpdatingBed }] = useUpdateBedMutation();

  const mappedBeds = useMemo(() => {
    if (!bedsResponse?.success || !Array.isArray(bedsResponse.data)) return [];
    return bedsResponse.data.map(mapApiBedToItem);
  }, [bedsResponse]);

  /** Total beds in this room (all pages). */
  const apiBedsTotal =
    apiMode &&
    typeof bedsResponse?.total === "number" &&
    Number.isFinite(bedsResponse.total)
      ? bedsResponse.total
      : apiMode
        ? mappedBeds.length
        : 0;
  const bedsTotalInRoom = apiMode ? apiBedsTotal : localBeds.length;

  const gridBeds = useMemo(() => {
    if (apiMode) return mappedBeds;
    const start = (bedsPage - 1) * bedsItemsPerPage;
    return localBeds.slice(start, start + bedsItemsPerPage);
  }, [apiMode, mappedBeds, localBeds, bedsPage, bedsItemsPerPage]);

  const pendingDeleteBed = deleteConfirmId
    ? gridBeds.find((b) => b.id === deleteConfirmId)
    : undefined;

  /** When API paginates, occupancy totals need all rows — not available from one page alone. */
  const occupancyStatsPartial =
    apiMode &&
    typeof bedsResponse?.total === "number" &&
    bedsResponse.total > mappedBeds.length;

  /** Read-only label for bed numbering (matches Room Configuration header). */
  const displayRoomNumber = useMemo(() => {
    if (apiMode && singleRoomRes?.success && singleRoomRes.data?.roomNumber != null) {
      const n = String(singleRoomRes.data.roomNumber).trim();
      if (n !== "") return n;
    }
    const fromProp = String(room.roomNumber ?? "").trim();
    return fromProp !== "" ? fromProp : "Room";
  }, [apiMode, singleRoomRes, room.roomNumber]);

  const locationPath = formatRoomHierarchyPath(room.building, room.block, room.floor);

  const roomConfigIncomplete = useMemo(() => {
    if (apiMode && singleRoomRes?.success && singleRoomRes.data) {
      return singleRoomRes.data.roomConfigStatus === "incomplete";
    }
    return room.status === "incomplete";
  }, [apiMode, singleRoomRes, room.status]);

  /** Prefer GET single room `bedCapacity` (matches Room Configuration); props may be stale (e.g. Structure Builder default). */
  const totalCapacity = useMemo(() => {
    const propCap = room.capacity >= 1 ? room.capacity : 1;
    if (singleRoomRes?.success && singleRoomRes.data) {
      const c = singleRoomRes.data.bedCapacity;
      if (typeof c === "number" && Number.isFinite(c) && c >= 1) return c;
    }
    if (apiMode && bedsTotalInRoom > propCap) return bedsTotalInRoom;
    return propCap;
  }, [singleRoomRes, room.capacity, apiMode, bedsTotalInRoom]);

  /** Remaining bed slots; series "Count" cannot exceed this. */
  const slotsRemaining = Math.max(0, totalCapacity - bedsTotalInRoom);
  const vacant = occupancyStatsPartial
    ? null
    : (apiMode ? mappedBeds : localBeds).filter((b) => b.status === "yes").length;
  const occupied = occupancyStatsPartial
    ? null
    : (apiMode ? mappedBeds : localBeds).filter((b) => b.status === "no").length;

  const getStatusBadgeColor = (status: BedCoreStatus) => {
    switch (status) {
      case "yes":
        return "bg-green-100 text-green-800";
      case "no":
        return "bg-blue-100 text-blue-800";
      case "cleaning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getReservedBadgeColor = (bed: BedItem) =>
    bed.reserved === "yes"
      ? "bg-purple-100 text-purple-800"
      : "bg-gray-100 text-gray-700 border border-gray-200";

  const baseRoomName = displayRoomNumber;

  const buildDefaultBedPayload = useCallback(
    (bedNumber: string): CreateBedItemPayload => ({
      branchId: branchId!,
      buildingId: room.buildingId!,
      floorId: room.floorId!,
      roomId: roomIdNum,
      bedNumber,
      available: "yes",
      reserved: "no",
      barcodeUrl: "",
      status: "active",
    }),
    [branchId, room.buildingId, room.floorId, roomIdNum],
  );

  const submitCreateBeds = useCallback(
    async (items: CreateBedItemPayload[], fallbackSuccess: string) => {
      try {
        const result = await createBeds({ beds: items }).unwrap();
        const saved = result?.data?.savedBeds?.length ?? 0;
        const dups = result?.data?.duplicateBeds?.length ?? 0;
        let msg = result?.message || fallbackSuccess;
        if (dups > 0) {
          msg += ` ${dups} duplicate request(s) were not saved.`;
        }
        if (saved === 0 && dups > 0) {
          msg = "No new beds were added. Duplicate bed entries were skipped.";
        }
        setSuccessMessage(msg);
        setShowSuccessDialog(true);
      } catch (e) {
        setApiErrorMessage(parseMutationError(e));
        setShowApiErrorDialog(true);
      }
    },
    [createBeds],
  );

  const handleAutoGenerate = useCallback(async () => {
    if (!canAdd) return;
    if (apiMode && branchId != null && room.buildingId != null && room.floorId != null) {
      const slotsLeft = Math.max(0, totalCapacity - bedsTotalInRoom);
      if (slotsLeft <= 0) return;
      const payloads: CreateBedItemPayload[] = [];
      const startIndex = bedsTotalInRoom + 1;
      for (let i = 0; i < slotsLeft; i++) {
        const idx = startIndex + i;
        const num =
          totalCapacity === 1
            ? baseRoomName
            : `${baseRoomName}-${String(idx).padStart(2, "0")}`;
        payloads.push(buildDefaultBedPayload(num));
      }
      await submitCreateBeds(payloads, "Beds created successfully");
      setShowAddForm(false);
      return;
    }

    const newBeds: BedItem[] = [];
    for (let i = 1; i <= totalCapacity; i++) {
      const num = String(
        totalCapacity === 1 ? baseRoomName : `${baseRoomName}-${String(i).padStart(2, "0")}`,
      );
      newBeds.push({
        id: `bed-${Date.now()}-${i}`,
        bedNumber: num,
        status: "yes",
        qrCode: `QR-${baseRoomName}-${num}-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    }
    setLocalBeds((prev) => [...prev, ...newBeds].slice(0, totalCapacity));
    setShowAddForm(false);
  }, [
    apiMode,
    branchId,
    room.buildingId,
    room.floorId,
    totalCapacity,
    baseRoomName,
    bedsTotalInRoom,
    buildDefaultBedPayload,
    submitCreateBeds,
  ]);

  const handleAddManually = async () => {
    if (!canAdd) return;
    if (!newBedNumber.trim()) return;
    const trimmed = newBedNumber.trim();
    if (apiMode && branchId != null && room.buildingId != null && room.floorId != null) {
      await submitCreateBeds([buildDefaultBedPayload(trimmed)], "Bed created successfully");
      setNewBedNumber("");
      setShowAddForm(false);
      return;
    }
    setLocalBeds((prev) => [
      ...prev,
      {
        id: `bed-${Date.now()}`,
        bedNumber: trimmed,
        status: "yes",
        qrCode: `QR-${baseRoomName}-${trimmed}-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    ]);
    setNewBedNumber("");
    setShowAddForm(false);
  };

  const parsedSeriesCount = Math.max(0, parseInt(seriesCount, 10) || 0);

  const handleAddSeries = async () => {
    if (!canAdd) return;
    const startParsed = parseInt(sanitizeDigitsOnlyInput(seriesStart, 8), 10);
    const start = Number.isFinite(startParsed) && startParsed >= 1 ? startParsed : 1;
    const roomLeft = slotsRemaining;
    const count = Math.min(parsedSeriesCount, roomLeft);
    if (count < 1 || roomLeft < 1) return;

    const prefixBase =
      sanitizeBedNumberIdentifierInput(seriesPrefix).trim() || "Bed";

    if (apiMode && branchId != null && room.buildingId != null && room.floorId != null) {
      const maxAdd = count;
      if (maxAdd <= 0) return;
      const payloads: CreateBedItemPayload[] = [];
      for (let i = 0; i < maxAdd; i++) {
        const num = `${prefixBase}-${start + i}`;
        payloads.push(buildDefaultBedPayload(num));
      }
      await submitCreateBeds(payloads, "Beds created successfully");
      setShowSeriesForm(false);
      setSeriesPrefix("Bed");
      setSeriesStart("1");
      const leftAfterAdd = slotsRemaining - maxAdd;
      setSeriesCount(leftAfterAdd > 0 ? String(Math.min(5, leftAfterAdd)) : "0");
      return;
    }

    const newBeds: BedItem[] = [];
    for (let i = 0; i < count; i++) {
      const num = `${seriesPrefix.trim() || "Bed"}-${start + i}`;
      newBeds.push({
        id: `bed-${Date.now()}-${i}`,
        bedNumber: num,
        status: "yes",
        qrCode: `QR-${baseRoomName}-${num}-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    }
    setLocalBeds((prev) => [...prev, ...newBeds]);
    setShowSeriesForm(false);
    setSeriesPrefix("Bed");
    setSeriesStart("1");
    const leftAfter = Math.max(0, totalCapacity - localBeds.length - count);
    setSeriesCount(leftAfter > 0 ? String(Math.min(5, leftAfter)) : "0");
  };

  const handleDeleteBed = (id: string) => {
    if (!canDelete) return;
    setDeleteConfirmId(id);
  };

  const confirmDeleteBed = async () => {
    if (!canDelete) return;
    if (!deleteConfirmId) return;
    if (apiMode && branchId != null && room.floorId != null) {
      try {
        const result = await deleteBedMut({
          bedId: Number.parseInt(deleteConfirmId, 10),
          branchId,
          floorId: room.floorId,
          roomId: roomIdNum,
        }).unwrap();
        setDeleteConfirmId(null);
        setSuccessMessage(result?.message || "Bed deleted successfully");
        setShowSuccessDialog(true);
      } catch (e) {
        setApiErrorMessage(parseMutationError(e));
        setShowApiErrorDialog(true);
        setDeleteConfirmId(null);
      }
      return;
    }
    setLocalBeds((prev) => prev.filter((b) => b.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  };

  const handleEditBed = (bed: BedItem) => {
    if (!canEdit) return;
    setEditingBed(bed);
    setEditBedNumber(sanitizeBedNumberIdentifierInput(bed.bedNumber));
    setEditStatus(bed.status);
    setEditReserved(bed.reserved === "yes" ? "yes" : "no");
    setEditNotes(sanitizeLettersOnlyNotesInput(bed.notes || ""));
  };

  const handleSaveEdit = async () => {
    if (!canEdit) return;
    if (!editingBed) return;
    const newName = (editBedNumber || editingBed.bedNumber).trim();
    if (apiMode && branchId != null && room.floorId != null) {
      const fields = uiStatusToApiFields(editStatus);
      try {
        const result = await updateBedMut({
          bedId: Number.parseInt(editingBed.id, 10),
          branchId,
          floorId: room.floorId,
          roomId: roomIdNum,
          body: {
            bedNumber: newName || editingBed.bedNumber,
            bedNote: editNotes,
            available: fields.available,
            reserved: editReserved,
            barcodeUrl: editingBed.barcodeUrl ?? "",
            status: fields.status,
          },
        }).unwrap();
        setEditingBed(null);
        setEditBedNumber("");
        setEditStatus("yes");
        setEditReserved("no");
        setEditNotes("");
        setSuccessMessage(result?.message || "Bed updated successfully");
        setShowSuccessDialog(true);
      } catch (e) {
        setApiErrorMessage(parseMutationError(e));
        setShowApiErrorDialog(true);
      }
      return;
    }

    setLocalBeds((prev) =>
      prev.map((b) =>
        b.id === editingBed.id
          ? {
              ...b,
              bedNumber: newName || b.bedNumber,
              status: editStatus,
              reserved: editReserved,
              notes: sanitizeLettersOnlyNotesInput(editNotes).trim(),
              qrCode: newName
                ? `QR-${baseRoomName}-${newName}-${b.qrCode?.split("-").pop() || Math.floor(100000 + Math.random() * 900000)}`
                : b.qrCode,
            }
          : b,
      ),
    );
    setEditingBed(null);
    setEditBedNumber("");
    setEditStatus("yes");
    setEditReserved("no");
    setEditNotes("");
  };

  const handleCancelEdit = () => {
    setEditingBed(null);
    setEditBedNumber("");
    setEditStatus("yes");
    setEditReserved("no");
    setEditNotes("");
  };

  const busy = isCreatingBeds || isDeletingBed || isUpdatingBed;

  if (!canView) {
    return (
      <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        You do not have permission to view bed management.
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      <div
        className={`flex flex-col transition-all duration-300 ${isPanelOpen ? "w-[80%]" : "w-full"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Tooltip content="Back to Previous Page">
              <button
                type="button"
                onClick={onBack}
                className="cursor-pointer flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-100"
                aria-label="Back to Previous Page"
              >
                <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Tooltip>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-gray-900">Bed Management</h1>
                {apiMode && (isFetchingBeds || isFetchingSingleRoom) && (
                  <span className="text-xs text-gray-400">Refreshing…</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">Editing {displayRoomNumber}</p>
            </div>
          </div>
          {!isPanelOpen && (
            <Tooltip content="Open Configuration Summary">
              <button
                type="button"
                onClick={() => setIsPanelOpen(true)}
                className="cursor-pointer flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg transition-all hover:bg-green-700"
                aria-label="Open Configuration Summary"
              >
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 px-1">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
          </svg>
          <span>{locationPath}</span>
        </div>

        {!apiMode && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Beds are stored locally until this room is linked to branch, building, and floor ids from the server.
          </p>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-gray-900">{totalCapacity}</p>
            <p className="text-sm text-gray-600">Total Capacity</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-gray-900">{bedsTotalInRoom}</p>
            <p className="text-sm text-gray-600">Beds Created</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-green-600">{vacant == null ? "—" : vacant}</p>
            <p className="text-sm text-gray-600">Vacant</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-blue-600">{occupied == null ? "—" : occupied}</p>
            <p className="text-sm text-gray-600">Occupied</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Beds ({bedsTotalInRoom} / {totalCapacity} capacity)
          </h2>
          <div className="flex gap-2 flex-wrap">
            {canAdd ? (
              <>
                <Tooltip content="Auto-Generate Beds">
                  <Button
                    variant="outline"
                    size="small"
                    className="cursor-pointer"
                    onClick={() => void handleAutoGenerate()}
                    disabled={busy || bedsTotalInRoom >= totalCapacity}
                    leftIcon={<span>+</span>}
                  >
                    Auto-Generate Beds ({Math.max(0, totalCapacity - bedsTotalInRoom)})
                  </Button>
                </Tooltip>
                <Tooltip content="Add Series of Beds">
                  <Button
                    variant="outline"
                    size="small"
                    className="cursor-pointer"
                    onClick={() => {
                      setShowAddForm(false);
                      setShowSeriesForm(true);
                      const left = Math.max(0, totalCapacity - bedsTotalInRoom);
                      setSeriesCount(left > 0 ? String(Math.min(5, left)) : "0");
                    }}
                    disabled={busy || bedsTotalInRoom >= totalCapacity}
                    leftIcon={<span>+</span>}
                  >
                    Add Series (e.g. Bed-1 to Bed-10)
                  </Button>
                </Tooltip>
                <Tooltip content="Add Bed Manually">
                  <Button
                    variant="primary"
                    size="small"
                    className="cursor-pointer"
                    onClick={() => {
                      setShowAddForm(true);
                      setShowSeriesForm(false);
                    }}
                    disabled={busy}
                    leftIcon={<span>+</span>}
                  >
                    Add Bed Manually
                  </Button>
                </Tooltip>
              </>
            ) : null}
          </div>
        </div>

        {showSeriesForm && canAdd && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Beds in Series</h3>
            <p className="text-xs text-gray-500 mb-3">e.g. Bed-1, Bed-2, ... Bed-10</p>
            {slotsRemaining > 0 && (
              <p className="text-xs text-gray-600 mb-2">
                Count cannot exceed remaining capacity ({slotsRemaining} bed{slotsRemaining === 1 ? "" : "s"} left of {totalCapacity}).
              </p>
            )}
            <div className="flex flex-wrap gap-3 items-start">
              <div className="w-full min-w-[200px] max-w-[320px]">
                <FormInputField
                  label="Prefix"
                  placeholder="Bed"
                  value={seriesPrefix}
                  maxLength={100}
                  autoComplete="off"
                  onChange={(e) => setSeriesPrefix(sanitizeBedNumberIdentifierInput(e.target.value))}
                  onBlur={(e) => {
                    const t = e.target.value.trim();
                    if (t !== e.target.value) setSeriesPrefix(t);
                  }}
                  // helperText="Letters, digits, spaces, -, and _. Max 100; max two same chars in a row. Empty saves as Bed."
                />
              </div>
              <div className="w-[140px] shrink-0">
                <FormInputField
                  label="Start #"
                  placeholder="1"
                  value={seriesStart}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={8}
                  width={140}
                  onChange={(e) => setSeriesStart(sanitizeDigitsOnlyInput(e.target.value, 8))}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v === "") {
                      setSeriesStart("1");
                      return;
                    }
                    const n = parseInt(v, 10);
                    if (!Number.isFinite(n) || n < 1) setSeriesStart("1");
                    else setSeriesStart(String(n));
                  }}
                  helperText="Digits only. Min 1."
                />
              </div>
              <div className="w-[140px] shrink-0">
                <FormInputField
                  label="Count"
                  placeholder="5"
                  value={seriesCount}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  width={140}
                  disabled={slotsRemaining <= 0}
                  onChange={(e) => {
                    const v = sanitizeDigitsOnlyInput(e.target.value, 4);
                    if (v === "") {
                      setSeriesCount("");
                      return;
                    }
                    const n = parseInt(v, 10);
                    if (Number.isNaN(n)) {
                      setSeriesCount(v);
                      return;
                    }
                    if (slotsRemaining <= 0) {
                      setSeriesCount("0");
                      return;
                    }
                    const capped = Math.max(1, Math.min(n, slotsRemaining));
                    setSeriesCount(String(capped));
                  }}
                  helperText={
                    slotsRemaining > 0
                      ? `Digits only. Max ${slotsRemaining} for this room.`
                      : "No beds remaining."
                  }
                />
              </div>
              <Button
                variant="primary"
                size="small"
                onClick={() => void handleAddSeries()}
                disabled={busy || slotsRemaining < 1 || parsedSeriesCount < 1}
              >
                Add {slotsRemaining > 0 ? Math.min(parsedSeriesCount || 0, slotsRemaining) : 0} Beds
              </Button>
              <Button variant="outline" size="small" onClick={() => setShowSeriesForm(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showAddForm && canAdd && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Bed</h3>
            <div className="flex gap-3 items-end items-start">
              <div className="flex-1 min-w-0">
                <FormInputField
                  label="Bed Number / Identifier"
                  placeholder="e.g., B1, Bed-01, Bed_02"
                  value={newBedNumber}
                  maxLength={100}
                  autoComplete="off"
                  onChange={(e) => setNewBedNumber(sanitizeBedNumberIdentifierInput(e.target.value))}
                  onBlur={(e) => {
                    const t = e.target.value.trim();
                    if (t !== e.target.value) setNewBedNumber(t);
                  }}
                  helperText="Letters, digits, spaces, -, and _. Max 100 characters; no more than two of the same character in a row."
                />
              </div>
              <Button variant="primary" size="small" onClick={() => void handleAddManually()} disabled={busy}>
                Add
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  setShowAddForm(false);
                  setNewBedNumber("");
                }}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {gridBeds.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gridBeds.map((bed) => (
                <div key={bed.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                      <span className="font-semibold text-gray-900">{bed.bedNumber}</span>
                    </div>
                    <div className="flex gap-1">
                      {canEdit ? (
                        <Tooltip content="Edit Bed">
                          <button
                            type="button"
                            className="cursor-pointer p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleEditBed(bed)}
                            aria-label="Edit Bed"
                            disabled={busy}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                        </Tooltip>
                      ) : null}
                      {canDelete ? (
                        <Tooltip content="Delete Bed">
                          <button
                            type="button"
                            className="cursor-pointer p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteBed(bed.id)}
                            aria-label="Delete Bed"
                            disabled={busy}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <span className="text-gray-500 shrink-0">Status</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(bed.status)}`}
                      >
                        {bed.status === "yes" && (
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {bedStatusPillLabel(bed.status)}
                      </span>
                      <span className="hidden sm:block w-px h-4 bg-gray-200 shrink-0" aria-hidden />
                      <span className="text-gray-500 shrink-0">Reserved</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getReservedBadgeColor(bed)}`}
                      >
                        {reservedPillLabel(bed)}
                      </span>
                    </div>
                    {bed.notes && (
                      <div>
                        <span className="text-gray-500">Notes: </span>
                        <span className="text-gray-700">{bed.notes}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">QR Code (scannable)</p>
                      <BedQrOrImage scanValue={bed.qrCode ?? bed.bedNumber} barcodeUrl={bed.barcodeUrl} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : bedsTotalInRoom > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500">
            No beds on this page.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-16 flex flex-col items-center justify-center text-center">
            <svg
              className="h-20 w-20 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Beds Configured</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Add beds to this room to start tracking bed-level occupancy
            </p>
            {canAdd ? (
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => void handleAutoGenerate()}
                  disabled={busy}
                  leftIcon={<span>+</span>}
                >
                  Auto-Generate {totalCapacity} Bed{totalCapacity > 1 ? "s" : ""}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(true)} disabled={busy}>
                  Add Manually
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {bedsTotalInRoom > 0 && (
          <div className="mt-8">
            <Pagination
              currentPage={bedsPage}
              totalItems={bedsTotalInRoom}
              itemsPerPage={bedsItemsPerPage}
              onPageChange={setBedsPage}
              onItemsPerPageChange={(n) => {
                setBedsItemsPerPage(n);
                setBedsPage(1);
              }}
              itemsPerPageOptions={[10, 20, 50, 100]}
            />
          </div>
        )}

        <MessageDialog
          open={!!deleteConfirmId && canDelete}
          onClose={() => setDeleteConfirmId(null)}
          icon="/icons/CrossIcon.svg"
          iconBgColor="#FFEBEE"
          message={`Remove bed "${pendingDeleteBed?.bedNumber ?? ""}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          showCancel
          onConfirm={() => void confirmDeleteBed()}
          onCancel={() => setDeleteConfirmId(null)}
        />

        <MessageDialog
          open={showSuccessDialog}
          onClose={() => setShowSuccessDialog(false)}
          icon="/icons/SuccessCheck.svg"
          iconBgColor="#E8F5E9"
          message={successMessage}
          confirmText="Success"
          showCancel={false}
          onConfirm={() => setShowSuccessDialog(false)}
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

        <Dialog open={!!editingBed && canEdit} onClose={handleCancelEdit} title="Edit bed" width={500}>
          <div className="space-y-5">
            <FormInputField
              label="Bed name / number"
              placeholder="e.g. Bed-1, B-01, Bed_02"
              value={editBedNumber}
              maxLength={100}
              autoComplete="off"
              onChange={(e) => setEditBedNumber(sanitizeBedNumberIdentifierInput(e.target.value))}
              onBlur={(e) => {
                const t = e.target.value.trim();
                if (t !== e.target.value) setEditBedNumber(t);
              }}
              // helperText="Identifier on the card and QR. Letters, digits, spaces, -, and _. Max 100; max two same chars in a row."
            />
            <FormSelectField
              label="Status"
              options={STATUS_OPTIONS}
              value={editStatus}
              onChange={(v) =>
                setEditStatus((typeof v === "string" ? v : v[0]) as BedCoreStatus)
              }
              placeholder="Select status"
              background="white"
            />
            <FormSelectField
              label="Reserved"
              options={RESERVED_YES_NO_OPTIONS}
              value={editReserved}
              onChange={(v) =>
                setEditReserved((typeof v === "string" ? v : v[0]) as "yes" | "no")
              }
              placeholder="Select"
              background="white"
            />
            <FormTextareaField
              label="Notes"
              placeholder="Add notes..."
              value={editNotes}
              maxLength={500}
              rows={4}
              onChange={(e) => setEditNotes(sanitizeLettersOnlyNotesInput(e.target.value))}
              onBlur={(e) => {
                const t = e.target.value.trim();
                if (t !== e.target.value) setEditNotes(t);
              }}
              // helperText="Letters and spaces only (no numbers or symbols). Max 500 characters; max two identical characters in a row."
            />
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleCancelEdit} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void handleSaveEdit()} disabled={busy}>
                Save Changes
              </Button>
            </div>
          </div>
        </Dialog>
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
