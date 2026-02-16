"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button, Dialog, FormInputField, FormSelectField, FormTextareaField, ConfigurationSummaryPanel } from "@/components/ui";
import type { RoomInventoryItem } from "./RoomInventory";
import QRCode from "qrcode";

export type BedItem = {
  id: string;
  bedNumber: string;
  status: "Vacant" | "Occupied" | "Under Maintenance" | "Reserved";
  notes?: string;
  qrCode?: string;
};

const STATUS_OPTIONS = [
  { value: "Vacant", label: "Vacant" },
  { value: "Occupied", label: "Occupied" },
  { value: "Under Maintenance", label: "Under Maintenance" },
  { value: "Reserved", label: "Reserved" },
];

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
  if (!dataUrl) return <div className="bg-gray-100 animate-pulse rounded" style={{ width: size, height: size }} />;
  return <img src={dataUrl} alt={`QR ${value}`} width={size} height={size} className="rounded border border-gray-200" />;
}

type BedManagementProps = {
  facilityName: string;
  room: RoomInventoryItem;
  onBack: () => void;
};

export const BedManagement = ({ facilityName, room, onBack }: BedManagementProps) => {
  const [beds, setBeds] = useState<BedItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBedNumber, setNewBedNumber] = useState("");
  const [editingBed, setEditingBed] = useState<BedItem | null>(null);
  const [editBedNumber, setEditBedNumber] = useState("");
  const [editStatus, setEditStatus] = useState<BedItem["status"]>("Vacant");
  const [editNotes, setEditNotes] = useState("");
  // Editable room name for bed numbering (used in auto-generate and series)
  const [roomNameForBeds, setRoomNameForBeds] = useState(room.roomNumber);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  // Series option: add multiple beds at once (e.g. Bed-1 to Bed-10)
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [seriesPrefix, setSeriesPrefix] = useState("Bed");
  const [seriesStart, setSeriesStart] = useState("1");
  const [seriesCount, setSeriesCount] = useState("5");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const totalCapacity = room.capacity || 1;
  const bedsCreated = beds.length;
  const vacant = beds.filter((b) => b.status === "Vacant").length;
  const occupied = beds.filter((b) => b.status === "Occupied").length;

  const getStatusBadgeColor = (status: BedItem["status"]) => {
    switch (status) {
      case "Vacant":
        return "bg-green-100 text-green-800";
      case "Occupied":
        return "bg-blue-100 text-blue-800";
      case "Under Maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "Reserved":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const baseRoomName = roomNameForBeds.trim() || room.roomNumber;

  const handleAutoGenerate = useCallback(() => {
    const newBeds: BedItem[] = [];
    for (let i = 1; i <= totalCapacity; i++) {
      const num = String(totalCapacity === 1 ? baseRoomName : `${baseRoomName}-${String(i).padStart(2, "0")}`);
      newBeds.push({
        id: `bed-${Date.now()}-${i}`,
        bedNumber: num,
        status: "Vacant",
        qrCode: `QR-${baseRoomName}-${num}-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    }
    setBeds((prev) => [...prev, ...newBeds].slice(0, totalCapacity));
    setShowAddForm(false);
  }, [totalCapacity, baseRoomName]);

  const handleAddManually = () => {
    if (!newBedNumber.trim()) return;
    setBeds((prev) => [
      ...prev,
      {
        id: `bed-${Date.now()}`,
        bedNumber: newBedNumber.trim(),
        status: "Vacant",
        qrCode: `QR-${baseRoomName}-${newBedNumber.trim()}-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    ]);
    setNewBedNumber("");
    setShowAddForm(false);
  };

  const handleAddSeries = () => {
    const start = parseInt(seriesStart, 10);
    const count = parseInt(seriesCount, 10);
    if (isNaN(start) || isNaN(count) || count < 1 || count > 100) return;
    const newBeds: BedItem[] = [];
    for (let i = 0; i < count; i++) {
      const num = `${seriesPrefix.trim() || "Bed"}-${start + i}`;
      newBeds.push({
        id: `bed-${Date.now()}-${i}`,
        bedNumber: num,
        status: "Vacant",
        qrCode: `QR-${baseRoomName}-${num}-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    }
    setBeds((prev) => [...prev, ...newBeds]);
    setShowSeriesForm(false);
    setSeriesPrefix("Bed");
    setSeriesStart("1");
    setSeriesCount("5");
  };

  const handleDeleteBed = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteBed = () => {
    if (deleteConfirmId) {
      setBeds((prev) => prev.filter((b) => b.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleEditBed = (bed: BedItem) => {
    setEditingBed(bed);
    setEditBedNumber(bed.bedNumber);
    setEditStatus(bed.status);
    setEditNotes(bed.notes || "");
  };

  const handleSaveEdit = () => {
    if (!editingBed) return;
    const newName = (editBedNumber || editingBed.bedNumber).trim();
    setBeds((prev) =>
      prev.map((b) =>
        b.id === editingBed.id
          ? {
              ...b,
              bedNumber: newName || b.bedNumber,
              status: editStatus,
              notes: editNotes,
              qrCode: newName ? `QR-${baseRoomName}-${newName}-${b.qrCode?.split("-").pop() || Math.floor(100000 + Math.random() * 900000)}` : b.qrCode,
            }
          : b
      )
    );
    setEditingBed(null);
    setEditBedNumber("");
    setEditStatus("Vacant");
    setEditNotes("");
  };

  const handleCancelEdit = () => {
    setEditingBed(null);
    setEditBedNumber("");
    setEditStatus("Vacant");
    setEditNotes("");
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className={`flex flex-col transition-all duration-300 ${isPanelOpen ? 'w-[80%]' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-100"
            >
              <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900">Bed Management</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">Room name (for bed numbering):</span>
                <input
                  type="text"
                  value={roomNameForBeds}
                  onChange={(e) => setRoomNameForBeds(e.target.value)}
                  className="text-sm font-medium text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1 max-w-[180px] focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900"
                  placeholder={room.roomNumber}
                />
              </div>
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

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-semibold text-gray-900">{totalCapacity}</p>
          <p className="text-sm text-gray-600">Total Capacity</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-semibold text-gray-900">{bedsCreated}</p>
          <p className="text-sm text-gray-600">Beds Created</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-semibold text-green-600">{vacant}</p>
          <p className="text-sm text-gray-600">Vacant</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-2xl font-semibold text-blue-600">{occupied}</p>
          <p className="text-sm text-gray-600">Occupied</p>
        </div>
      </div>

      {/* Beds section header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Beds ({bedsCreated} / {totalCapacity} capacity)</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="small" onClick={handleAutoGenerate} disabled={bedsCreated >= totalCapacity} leftIcon={<span>+</span>}>
            Auto-Generate Beds ({Math.max(0, totalCapacity - bedsCreated)})
          </Button>
          <Button variant="outline" size="small" onClick={() => { setShowSeriesForm(true); setShowAddForm(false); }} leftIcon={<span>+</span>}>
            Add Series (e.g. Bed-1 to Bed-10)
          </Button>
          <Button variant="primary" size="small" onClick={() => { setShowAddForm(true); setShowSeriesForm(false); }} leftIcon={<span>+</span>}>
            Add Bed Manually
          </Button>
        </div>
      </div>

      {/* Add Beds in Series form */}
      {showSeriesForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Beds in Series</h3>
          <p className="text-xs text-gray-500 mb-3">e.g. Bed-1, Bed-2, ... Bed-10</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-[120px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Prefix</label>
              <input
                type="text"
                placeholder="Bed"
                value={seriesPrefix}
                onChange={(e) => setSeriesPrefix(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="w-[100px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Start #</label>
              <input
                type="number"
                min={1}
                placeholder="1"
                value={seriesStart}
                onChange={(e) => setSeriesStart(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="w-[100px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Count</label>
              <input
                type="number"
                min={1}
                max={100}
                placeholder="5"
                value={seriesCount}
                onChange={(e) => setSeriesCount(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <Button variant="primary" size="small" onClick={handleAddSeries}>
              Add {seriesCount || "0"} Beds
            </Button>
            <Button variant="outline" size="small" onClick={() => setShowSeriesForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add New Bed form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Bed</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Bed Number / Identifier</label>
              <input
                type="text"
                placeholder="e.g., B1, Bed-01"
                value={newBedNumber}
                onChange={(e) => setNewBedNumber(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm"
              />
            </div>
            <Button variant="primary" size="small" onClick={handleAddManually}>Add</Button>
            <Button variant="outline" size="small" onClick={() => { setShowAddForm(false); setNewBedNumber(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Bed list or empty state */}
      {beds.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {beds.map((bed) => (
              <div key={bed.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="font-semibold text-gray-900">{bed.bedNumber}</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded" onClick={() => handleEditBed(bed)} aria-label="Edit">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button type="button" className="p-2 text-red-500 hover:bg-red-50 rounded" onClick={() => handleDeleteBed(bed.id)} aria-label="Delete" title="Delete bed (stays on this screen)">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Status </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${getStatusBadgeColor(bed.status)}`}>
                      {bed.status === "Vacant" && (
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {bed.status}
                    </span>
                  </div>
                  {bed.notes && (
                    <div>
                      <span className="text-gray-500">Notes: </span>
                      <span className="text-gray-700">{bed.notes}</span>
                    </div>
                  )}
                  {bed.qrCode && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">QR Code (scannable)</p>
                      <BedQrCode value={bed.qrCode} size={72} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 flex flex-col items-center justify-center text-center">
          <svg className="h-20 w-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Beds Configured</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">Add beds to this room to start tracking bed-level occupancy</p>
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleAutoGenerate} leftIcon={<span>+</span>}>
              Auto-Generate {totalCapacity} Bed{totalCapacity > 1 ? "s" : ""}
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(true)}>Add Manually</Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog - stay on same screen after delete */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete bed?"
        width={400}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This bed will be removed. You can add or delete more beds without leaving this screen.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmDeleteBed} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Bed Dialog - edit bed name, status, notes */}
      <Dialog
        open={!!editingBed}
        onClose={handleCancelEdit}
        title="Edit bed"
        width={500}
      >
        <div className="space-y-5">
          <FormInputField
            label="Bed name / number"
            placeholder="e.g. Bed-1, B-01"
            value={editBedNumber}
            onChange={(e) => setEditBedNumber(e.target.value)}
            helperText="Identifier shown on the card and in QR"
          />
          <FormSelectField
            label="Status"
            options={STATUS_OPTIONS}
            value={editStatus}
            onChange={(v) => setEditStatus((typeof v === "string" ? v : v[0]) as BedItem["status"])}
            placeholder="Select status"
          />
          <FormTextareaField
            label="Notes"
            placeholder="Add notes..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={4}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
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
