"use client";

import React, { useState } from "react";
import { Button, Dialog, FormInputField } from "@/components/ui";

type Facility = {
  id: string;
  name: string;
};

type FacilitiesMasterProps = {
  facilityName: string;
  onBack: () => void;
};

const DEFAULT_FACILITIES: Facility[] = [
  { id: "1", name: "Oxygen Supply" },
  { id: "2", name: "Suction Facility" },
  { id: "3", name: "Attached Washroom" },
  { id: "4", name: "Television" },
  { id: "5", name: "Attendant Couch" },
  { id: "6", name: "Refrigerator" },
  { id: "7", name: "Cupboard/Storage" },
  { id: "8", name: "Intercom" },
  { id: "9", name: "WiFi" },
  { id: "10", name: "Hand Wash Station" },
];

export const FacilitiesMaster = ({ facilityName, onBack }: FacilitiesMasterProps) => {
  const [facilities, setFacilities] = useState<Facility[]>(DEFAULT_FACILITIES);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [facilityNameInput, setFacilityNameInput] = useState("");

  const handleAddClick = () => {
    setFacilityNameInput("");
    setShowAddDialog(true);
  };

  const handleEditClick = (facility: Facility) => {
    setEditingFacility(facility);
    setFacilityNameInput(facility.name);
    setShowEditDialog(true);
  };

  const handleAddFacility = () => {
    if (!facilityNameInput.trim()) return;

    const newFacility: Facility = {
      id: Date.now().toString(),
      name: facilityNameInput.trim(),
    };

    setFacilities([...facilities, newFacility]);
    setShowAddDialog(false);
    setFacilityNameInput("");
  };

  const handleUpdateFacility = () => {
    if (!editingFacility || !facilityNameInput.trim()) return;

    setFacilities((prev) =>
      prev.map((f) =>
        f.id === editingFacility.id
          ? {
              ...f,
              name: facilityNameInput.trim(),
            }
          : f
      )
    );
    setShowEditDialog(false);
    setEditingFacility(null);
    setFacilityNameInput("");
  };

  const handleDeleteFacility = (id: string) => {
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setFacilityNameInput("");
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingFacility(null);
    setFacilityNameInput("");
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
            <h1 className="text-xl font-semibold text-gray-900">Facilities Master</h1>
            <p className="text-sm text-gray-500">{facilityName}</p>
          </div>
        </div>
        <Button variant="primary" size="small" onClick={handleAddClick} leftIcon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }>
          Add Facility
        </Button>
      </div>

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">About Facilities Master</h3>
        <p className="text-sm text-blue-700">
          Define all types of facilities and amenities available in your hospital. These will appear as options when configuring rooms.
        </p>
      </div>

      {/* Facility Items Section */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Facility Items</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {facilities.length}
          </span>
        </div>

        {/* Facility Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((facility) => (
            <div
              key={facility.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{facility.name}</h3>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleEditClick(facility)}
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
                  onClick={() => handleDeleteFacility(facility.id)}
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

        {facilities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
            <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p className="text-sm text-gray-500 mb-4">No facility items defined</p>
            <Button variant="primary" onClick={handleAddClick}>
              Add First Facility Item
            </Button>
          </div>
        )}
      </div>

      {/* Add Facility Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={handleCloseAddDialog}
        title="Add Facility"
        width={500}
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Add a new facility item that can be assigned to rooms</p>

          <FormInputField
            label="Facility Name*"
            placeholder="e.g., Oxygen Supply, Attached Washroom, WiFi"
            value={facilityNameInput}
            onChange={(e) => setFacilityNameInput(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={handleCloseAddDialog}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddFacility}
              disabled={!facilityNameInput.trim()}
            >
              Add Facility
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Facility Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={handleCloseEditDialog}
        title="Edit Facility"
        width={500}
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Update the facility item name</p>

          <FormInputField
            label="Facility Name*"
            placeholder="e.g., Oxygen Supply, Attached Washroom, WiFi"
            value={facilityNameInput}
            onChange={(e) => setFacilityNameInput(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateFacility}
              disabled={!facilityNameInput.trim()}
            >
              Update Facility
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
