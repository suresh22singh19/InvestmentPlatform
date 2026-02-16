"use client";

import React, { useState } from "react";
import { Button, FormInputField, FormSelectField, ConfigurationSummaryPanel } from "@/components/ui";
import type { RoomInventoryItem, OccupancyStatus } from "./RoomInventory";

const STEPS = [
  { id: "basic", label: "Basic Info" },
  { id: "roomType", label: "Room Type" },
  { id: "attributes", label: "Attributes" },
  { id: "hardware", label: "Hardware" },
  { id: "facilities", label: "Facilities" },
  { id: "review", label: "Review" },
] as const;

const ROOM_TYPES = [
  { value: "Consultation Room", label: "Consultation Room", category: "Out-Patient" },
  { value: "Therapy Room", label: "Therapy Room", category: "Out-Patient" },
  { value: "IPD - Deluxe Room", label: "IPD - Deluxe Room", category: "In-Patient Department" },
  { value: "IPD - Semi-Deluxe Room", label: "IPD - Semi-Deluxe Room", category: "In-Patient Department" },
  { value: "IPD - Private Room", label: "IPD - Private Room", category: "In-Patient Department" },
  { value: "IPD - Ward", label: "IPD - Ward", category: "In-Patient Department" },
];

const STATUS_OPTIONS = [
  { value: "Vacant", label: "Vacant" },
  { value: "Fully Occupied", label: "Fully Occupied" },
  { value: "Partially Occupied", label: "Partially Occupied" },
  { value: "Reserved", label: "Reserved" },
  { value: "Under Maintenance", label: "Under Maintenance" },
];

const HARDWARE_OPTIONS = [
  "Examination Bed",
  "BP Monitor",
  "ECG Machine",
  "Standard Hospital Bed",
  "ICU Bed",
  "Ventilator",
  "Infusion Pump",
  "Nurse Call System",
  "Examination Table",
  "Crash Cart",
  "Defibrillator",
];

const FACILITIES_OPTIONS = [
  "Air Conditioning",
  "Oxygen Supply",
  "Attached Washroom",
  "Attendant Couch",
  "Cupboard/Storage",
  "WiFi",
  "Suction Facility",
  "Television",
  "Refrigerator",
  "Intercom",
  "Hand Wash Station",
];

type RoomConfigurationProps = {
  facilityName: string;
  room: RoomInventoryItem;
  onBack: () => void;
  onSave: (room: RoomInventoryItem) => void;
};

export const RoomConfiguration = ({
  facilityName,
  room: initialRoom,
  onBack,
  onSave,
}: RoomConfigurationProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [roomNumber, setRoomNumber] = useState(initialRoom.roomNumber);
  const [capacity, setCapacity] = useState(String(initialRoom.capacity));
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<OccupancyStatus>(() => {
    const s = initialRoom.occupancyStatus;
    if ((s as string) === "Occupied") return "Fully Occupied";
    return s as OccupancyStatus;
  });
  const [roomType, setRoomType] = useState(initialRoom.roomType);
  const [genderUsage, setGenderUsage] = useState<"Male" | "Female" | "Mixed">(initialRoom.genderUsage);
  const [hardware, setHardware] = useState<{ name: string; qty: number }[]>(
    initialRoom.hardwareItems?.length
      ? initialRoom.hardwareItems
      : initialRoom.hardwareCount > 0
        ? [{ name: "Examination Bed", qty: 1 }, { name: "BP Monitor", qty: 1 }]
        : []
  );
  const [facilities, setFacilities] = useState<string[]>(() => {
    if (initialRoom.facilityNames?.length) return initialRoom.facilityNames;
    const base = initialRoom.facilitiesCount >= 2 ? ["Oxygen Supply", "Attached Washroom"] : [];
    if (initialRoom.hasAC && !base.includes("Air Conditioning")) base.push("Air Conditioning");
    return base;
  });
  const [newHardwareSelect, setNewHardwareSelect] = useState("");

  const locationPath = `${initialRoom.building} / ${initialRoom.block} / ${initialRoom.floor}`;
  const currentStepId = STEPS[stepIndex].id;

  const handleAddHardware = (hardwareName: string) => {
    if (!hardwareName) return;
    const existing = hardware.find((h) => h.name === hardwareName);
    if (existing) {
      setHardware((prev) =>
        prev.map((h) => (h.name === hardwareName ? { ...h, qty: h.qty + 1 } : h))
      );
    } else {
      setHardware((prev) => [...prev, { name: hardwareName, qty: 1 }]);
    }
    setNewHardwareSelect("");
  };

  const handleRemoveHardware = (name: string) => {
    setHardware((prev) => prev.filter((h) => h.name !== name));
  };

  const handleHardwareQty = (name: string, delta: number) => {
    setHardware((prev) =>
      prev.map((h) => {
        if (h.name !== name) return h;
        const newQty = Math.max(0, h.qty + delta);
        return newQty === 0 ? null : { ...h, qty: newQty };
      }).filter(Boolean) as { name: string; qty: number }[]
    );
  };

  const toggleFacility = (facility: string) => {
    setFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  };

  const handleSave = () => {
    const hasACFromFacilities = facilities.includes("Air Conditioning");
    const updated: RoomInventoryItem = {
      ...initialRoom,
      roomNumber,
      capacity: parseInt(capacity, 10) || 1,
      occupancyStatus: currentStatus,
      roomType,
      genderUsage,
      hasAC: hasACFromFacilities,
      hardwareCount: hardware.reduce((s, h) => s + h.qty, 0),
      facilitiesCount: facilities.length,
      status: "configured",
      hardwareItems: hardware.length ? hardware : undefined,
      facilityNames: facilities.length ? [...facilities] : undefined,
    };
    onSave(updated);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className={`flex flex-col transition-all duration-300 ${isPanelOpen ? 'w-[80%]' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-100"
            >
              <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Room Configuration</h1>
              <p className="text-sm text-gray-500">Editing {initialRoom.roomNumber}</p>
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

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 px-1">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        <span>{locationPath}</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const isActive = i === stepIndex;
          const isPast = i < stepIndex;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => setStepIndex(i)}
                className={`flex items-center gap-2 flex-shrink-0 ${isActive ? "font-semibold text-gray-900" : "text-gray-500"}`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isActive ? "bg-gray-900 text-white" : isPast ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isPast ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span className="flex-shrink-0 w-4 h-0.5 bg-gray-200 rounded" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex-1">
        {currentStepId === "basic" && (
          <div className="space-y-6 max-w-lg">
            <FormInputField
              label="Room Number / Identifier"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g., G-A-001"
              helperText="Use a clear naming convention (e.g., Building-Floor-Room)"
            />
            <FormInputField
              label="Room Capacity (Beds/Patients)"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={1}
            />
            <FormSelectField
              label="Current Status"
              options={STATUS_OPTIONS}
              value={currentStatus}
              onChange={(v) => setCurrentStatus((typeof v === "string" ? v : v[0]) as OccupancyStatus)}
            />
          </div>
        )}

        {currentStepId === "roomType" && (
          <div className="max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Select Room Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROOM_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRoomType(opt.value)}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                    roomType === opt.value ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                      roomType === opt.value ? "border-gray-900 bg-gray-900" : "border-gray-300"
                    }`}
                  >
                    {roomType === opt.value && (
                      <svg className="h-full w-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStepId === "attributes" && (
          <div className="space-y-8 max-w-lg">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Gender Usage</h3>
              <div className="flex gap-3">
                {(["Male", "Female", "Mixed"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenderUsage(g)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 ${
                      genderUsage === g ? "border-gray-900 bg-gray-50" : "border-gray-200"
                    }`}
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>{g}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500">Air Conditioning is configured in the Facilities step.</p>
          </div>
        )}

        {currentStepId === "hardware" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <FormSelectField
                label="Add Hardware Equipment"
                options={HARDWARE_OPTIONS.filter((name) => !hardware.some((h) => h.name === name)).map((name) => ({
                  label: name,
                  value: name,
                }))}
                value={newHardwareSelect || null}
                onChange={(value) => {
                  const selectedValue = typeof value === "string" ? value : value[0];
                  if (selectedValue) {
                    handleAddHardware(selectedValue);
                  }
                }}
                placeholder="Select equipment to add..."
                mode="single"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Installed Hardware</h3>
              {hardware.length === 0 ? (
                <p className="text-sm text-gray-500">No hardware added yet.</p>
              ) : (
                <div className="space-y-2">
                  {hardware.map((h) => (
                    <div
                      key={h.name}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm font-medium">{h.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleHardwareQty(h.name, -1)}
                          className="h-8 w-8 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm">{h.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleHardwareQty(h.name, 1)}
                          className="h-8 w-8 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveHardware(h.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStepId === "facilities" && (
          <div className="max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Select Available Facilities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FACILITIES_OPTIONS.map((fac) => (
                <button
                  key={fac}
                  type="button"
                  onClick={() => toggleFacility(fac)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left ${
                    facilities.includes(fac) ? "border-gray-900 bg-gray-50" : "border-gray-200"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 rounded border-2 flex-shrink-0 ${
                      facilities.includes(fac) ? "border-gray-900 bg-gray-900" : "border-gray-300"
                    }`}
                  >
                    {facilities.includes(fac) && (
                      <svg className="h-full w-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{fac}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStepId === "review" && (
          <div className="max-w-2xl space-y-6">
            <h3 className="text-sm font-semibold text-gray-900">Room Configuration Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Room Number</p>
                <p className="font-semibold text-gray-900">{roomNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Room Type</p>
                <p className="font-semibold text-gray-900">{roomType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Capacity</p>
                <p className="font-semibold text-gray-900">{capacity} bed(s)</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gender</p>
                <p className="font-semibold text-gray-900">{genderUsage}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">AC</p>
                <p className="font-semibold text-gray-900">{facilities.includes("Air Conditioning") ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  {currentStatus}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Hardware ({hardware.reduce((s, h) => s + h.qty, 0)})</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {hardware.map((h) => (
                  <li key={h.name}>{h.name}: Qty: {h.qty}</li>
                ))}
                {hardware.length === 0 && <li className="text-gray-500">None</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Facilities ({facilities.length})</h4>
              <div className="flex flex-wrap gap-2">
                {facilities.map((f) => (
                  <span key={f} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                    {f}
                  </span>
                ))}
                {facilities.length === 0 && <span className="text-sm text-gray-500">None</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}>
          Previous
        </Button>
        {stepIndex < STEPS.length - 1 ? (
          <Button variant="primary" onClick={() => setStepIndex((i) => i + 1)}>
            Next Step
          </Button>
        ) : (
          <Button variant="primary" onClick={handleSave} leftIcon={<span className="text-white">✓</span>}>
            Save Room Configuration
          </Button>
        )}
      </div>
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
