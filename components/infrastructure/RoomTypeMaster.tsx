"use client";

import React, { useState } from "react";
import { Button, Dialog, FormInputField } from "@/components/ui";

type RoomType = {
  id: string;
  label: string;
  code: string;
  prefix: string;
};

type RoomTypeMasterProps = {
  facilityName: string;
  onBack: () => void;
};

const DEFAULT_ROOM_TYPES: RoomType[] = [
  {
    id: "1",
    label: "Consultation Room",
    code: "consultation",
    prefix: "CR",
  },
  {
    id: "2",
    label: "Therapy Room",
    code: "therapy",
    prefix: "TR",
  },
  {
    id: "3",
    label: "IPD - Deluxe Room",
    code: "ipd-deluxe",
    prefix: "DLX",
  },
  {
    id: "4",
    label: "IPD - Semi-Deluxe Room",
    code: "ipd-semi-deluxe",
    prefix: "SDL",
  },
  {
    id: "5",
    label: "IPD - Private Room",
    code: "ipd-private",
    prefix: "PVT",
  },
  {
    id: "6",
    label: "IPD - Ward",
    code: "ipd-ward",
    prefix: "WRD",
  },
];

export const RoomTypeMaster = ({ facilityName, onBack }: RoomTypeMasterProps) => {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(DEFAULT_ROOM_TYPES);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [roomTypeLabel, setRoomTypeLabel] = useState("");
  const [roomTypeCode, setRoomTypeCode] = useState("");
  const [roomTypePrefix, setRoomTypePrefix] = useState("");

  const handleAddClick = () => {
    setRoomTypeLabel("");
    setRoomTypeCode("");
    setRoomTypePrefix("");
    setShowAddDialog(true);
  };

  const handleEditClick = (roomType: RoomType) => {
    setEditingRoomType(roomType);
    setRoomTypeLabel(roomType.label);
    setRoomTypeCode(roomType.code);
    setRoomTypePrefix(roomType.prefix);
    setShowEditDialog(true);
  };

  const handleAddRoomType = () => {
    if (!roomTypeLabel.trim() || !roomTypeCode.trim() || !roomTypePrefix.trim()) return;

    const newRoomType: RoomType = {
      id: Date.now().toString(),
      label: roomTypeLabel.trim(),
      code: roomTypeCode.trim().toLowerCase().replace(/\s+/g, "-"),
      prefix: roomTypePrefix.trim().toUpperCase(),
    };

    setRoomTypes([...roomTypes, newRoomType]);
    setShowAddDialog(false);
    setRoomTypeLabel("");
    setRoomTypeCode("");
    setRoomTypePrefix("");
  };

  const handleUpdateRoomType = () => {
    if (!editingRoomType || !roomTypeLabel.trim() || !roomTypeCode.trim() || !roomTypePrefix.trim()) return;

    setRoomTypes((prev) =>
      prev.map((rt) =>
        rt.id === editingRoomType.id
          ? {
              ...rt,
              label: roomTypeLabel.trim(),
              code: roomTypeCode.trim().toLowerCase().replace(/\s+/g, "-"),
              prefix: roomTypePrefix.trim().toUpperCase(),
            }
          : rt
      )
    );
    setShowEditDialog(false);
    setEditingRoomType(null);
    setRoomTypeLabel("");
    setRoomTypeCode("");
    setRoomTypePrefix("");
  };

  const handleDeleteRoomType = (id: string) => {
    setRoomTypes((prev) => prev.filter((rt) => rt.id !== id));
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setRoomTypeLabel("");
    setRoomTypeCode("");
    setRoomTypePrefix("");
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingRoomType(null);
    setRoomTypeLabel("");
    setRoomTypeCode("");
    setRoomTypePrefix("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Room Type Master</h1>
            <p className="text-sm text-gray-500">{facilityName}</p>
          </div>
        </div>
        <Button variant="primary" size="small" onClick={handleAddClick} leftIcon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }>
          Add Room Type
        </Button>
      </div>

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">About Room Types</h3>
        <p className="text-sm text-blue-700">
          Room types help you categorize and organize different kinds of rooms in your hospital. Define custom types like 'OT Theatre', 'ICU Bed', 'Lab Room' etc. Each type includes a prefix used for auto-generating room numbers.
        </p>
      </div>

      {/* Room Types Section */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Room Types</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {roomTypes.length}
          </span>
        </div>

        {/* Room Types Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomTypes.map((roomType) => (
            <div
              key={roomType.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{roomType.label}</h3>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Code:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {roomType.code}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Prefix:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {roomType.prefix}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleEditClick(roomType)}
                  leftIcon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  }
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleDeleteRoomType(roomType.id)}
                  leftIcon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  }
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        {roomTypes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
            <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-sm text-gray-500 mb-4">No room types defined</p>
            <Button variant="primary" onClick={handleAddClick}>
              Add First Room Type
            </Button>
          </div>
        )}
      </div>

      {/* Add Room Type Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={handleCloseAddDialog}
        title="Add Room Type"
        width={500}
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Create a new custom room type for your hospital</p>

          <FormInputField
            label="Room Type Label*"
            placeholder="e.g., OT Theatre, ICU Bed, X-Ray Room"
            value={roomTypeLabel}
            onChange={(e) => setRoomTypeLabel(e.target.value)}
            helperText="The display name shown in the interface"
          />

          <FormInputField
            label="Room Type Code*"
            placeholder="e.g., ot-theatre, icu-bed, xray-room"
            value={roomTypeCode}
            onChange={(e) => setRoomTypeCode(e.target.value)}
            helperText="Unique identifier (lowercase, use hyphens for spaces)"
          />

          <FormInputField
            label="Room Number Prefix*"
            placeholder="e.g., OT, ICU, XRAY"
            value={roomTypePrefix}
            onChange={(e) => setRoomTypePrefix(e.target.value)}
            helperText="Used to auto-generate room numbers (e.g., OT-001, ICU-002)"
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={handleCloseAddDialog}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddRoomType}
              disabled={!roomTypeLabel.trim() || !roomTypeCode.trim() || !roomTypePrefix.trim()}
            >
              Add Room Type
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Room Type Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={handleCloseEditDialog}
        title="Edit Room Type"
        width={500}
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Update the room type details</p>

          <FormInputField
            label="Room Type Label*"
            placeholder="e.g., OT Theatre, ICU Bed, X-Ray Room"
            value={roomTypeLabel}
            onChange={(e) => setRoomTypeLabel(e.target.value)}
            helperText="The display name shown in the interface"
          />

          <FormInputField
            label="Room Type Code*"
            placeholder="e.g., ot-theatre, icu-bed, xray-room"
            value={roomTypeCode}
            onChange={(e) => setRoomTypeCode(e.target.value)}
            helperText="Unique identifier (lowercase, use hyphens for spaces)"
          />

          <FormInputField
            label="Room Number Prefix*"
            placeholder="e.g., OT, ICU, XRAY"
            value={roomTypePrefix}
            onChange={(e) => setRoomTypePrefix(e.target.value)}
            helperText="Used to auto-generate room numbers (e.g., OT-001, ICU-002)"
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateRoomType}
              disabled={!roomTypeLabel.trim() || !roomTypeCode.trim() || !roomTypePrefix.trim()}
            >
              Update Room Type
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
