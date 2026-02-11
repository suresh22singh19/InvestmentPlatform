"use client";

import React, { useState } from "react";
import { Button, Dialog, FormInputField } from "@/components/ui";

type Hardware = {
  id: string;
  name: string;
};

type HardwareMasterProps = {
  facilityName: string;
  onBack: () => void;
};

const DEFAULT_HARDWARE: Hardware[] = [
  { id: "1", name: "Standard Hospital Bed" },
  { id: "2", name: "ICU Bed" },
  { id: "3", name: "BP Monitor" },
  { id: "4", name: "ECG Machine" },
  { id: "5", name: "Ventilator" },
  { id: "6", name: "Infusion Pump" },
  { id: "7", name: "Nurse Call System" },
  { id: "8", name: "Examination Table" },
  { id: "9", name: "Crash Cart" },
  { id: "10", name: "Defibrillator" },
];

export const HardwareMaster = ({ facilityName, onBack }: HardwareMasterProps) => {
  const [hardwareItems, setHardwareItems] = useState<Hardware[]>(DEFAULT_HARDWARE);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingHardware, setEditingHardware] = useState<Hardware | null>(null);
  const [hardwareName, setHardwareName] = useState("");

  const handleAddClick = () => {
    setHardwareName("");
    setShowAddDialog(true);
  };

  const handleEditClick = (hardware: Hardware) => {
    setEditingHardware(hardware);
    setHardwareName(hardware.name);
    setShowEditDialog(true);
  };

  const handleAddHardware = () => {
    if (!hardwareName.trim()) return;

    const newHardware: Hardware = {
      id: Date.now().toString(),
      name: hardwareName.trim(),
    };

    setHardwareItems([...hardwareItems, newHardware]);
    setShowAddDialog(false);
    setHardwareName("");
  };

  const handleUpdateHardware = () => {
    if (!editingHardware || !hardwareName.trim()) return;

    setHardwareItems((prev) =>
      prev.map((h) =>
        h.id === editingHardware.id
          ? {
              ...h,
              name: hardwareName.trim(),
            }
          : h
      )
    );
    setShowEditDialog(false);
    setEditingHardware(null);
    setHardwareName("");
  };

  const handleDeleteHardware = (id: string) => {
    setHardwareItems((prev) => prev.filter((h) => h.id !== id));
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setHardwareName("");
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingHardware(null);
    setHardwareName("");
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
            <h1 className="text-xl font-semibold text-gray-900">Hardware Master</h1>
            <p className="text-sm text-gray-500">{facilityName}</p>
          </div>
        </div>
        <Button variant="primary" size="small" onClick={handleAddClick} leftIcon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }>
          Add Hardware
        </Button>
      </div>

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">About Hardware Master</h3>
        <p className="text-sm text-blue-700">
          Define all types of hardware equipment available in your hospital. These will appear as options when configuring rooms.
        </p>
      </div>

      {/* Hardware Items Section */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Hardware Items</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {hardwareItems.length}
          </span>
        </div>

        {/* Hardware Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hardwareItems.map((hardware) => (
            <div
              key={hardware.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{hardware.name}</h3>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleEditClick(hardware)}
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
                  onClick={() => handleDeleteHardware(hardware.id)}
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

        {hardwareItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
            <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-500 mb-4">No hardware items defined</p>
            <Button variant="primary" onClick={handleAddClick}>
              Add First Hardware Item
            </Button>
          </div>
        )}
      </div>

      {/* Add Hardware Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={handleCloseAddDialog}
        title="Add Hardware"
        width={500}
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Add a new hardware item that can be assigned to rooms</p>

          <FormInputField
            label="Hardware Name*"
            placeholder="e.g., ICU Bed, Ventilator, ECG Machine"
            value={hardwareName}
            onChange={(e) => setHardwareName(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={handleCloseAddDialog}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddHardware}
              disabled={!hardwareName.trim()}
            >
              Add Hardware
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Hardware Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={handleCloseEditDialog}
        title="Edit Hardware"
        width={500}
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Update the hardware item name</p>

          <FormInputField
            label="Hardware Name*"
            placeholder="e.g., ICU Bed, Ventilator, ECG Machine"
            value={hardwareName}
            onChange={(e) => setHardwareName(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateHardware}
              disabled={!hardwareName.trim()}
            >
              Update Hardware
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
