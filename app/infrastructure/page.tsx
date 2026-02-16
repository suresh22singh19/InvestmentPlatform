"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { ListBorder } from "@/components/ui/ListBorder";
import { FacilityCard, StatCard, Table, TableBody, TableData, TableHead, TableHeader, TableRow, TableSearchInput, Tabs, Dialog, FormInputField, Button } from "@/components/ui";
import Link from "next/link";



type Facility = {
  name: string;
  type: "Hospital" | "Clinic";
  address: string;
  setupStatus: string;
  setupDate: string;
  completionPercentage: number;
  buildings: number;
  blocks?: number;
  floors: number;
  departments: number;
  roomsConfigured: number;
  totalRooms: number;
};``

const initialFacilities: Facility[] = [
  {
    name: "City General Hospital",
    type: "Hospital" as const,
    address: "123 Healthcare Blvd, Medical District",
    setupStatus: "Initial Setup",
    setupDate: "Feb 5, 2026",
    completionPercentage: 35,
    buildings: 2,
    blocks: 2,
    floors: 3,
    departments: 6,
    roomsConfigured: 1,
    totalRooms: 2,
  },
  {
    name: "Apollo Clinic",
    type: "Clinic" as const,
    address: "123 Apollo Clinic, Medical District",
    setupStatus: "Active Setup",
    setupDate: "Feb 10, 2026",
    completionPercentage: 100,
    buildings: 1,
    blocks: 0,
    floors: 2,
    departments: 2,
    roomsConfigured: 5,
    totalRooms: 6,
  },
];

const page = () => {
  const router = useRouter();
  const [facilities, setFacilities] = useState<Facility[]>(initialFacilities);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [facilityType, setFacilityType] = useState<"Hospital" | "Clinic">("Hospital");
  const [facilityName, setFacilityName] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ facilityName?: string; address?: string }>({});

  const handleAddNew = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFacilityName("");
    setAddress("");
    setFacilityType("Hospital");
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { facilityName?: string; address?: string } = {};
    
    if (!facilityName.trim()) {
      newErrors.facilityName = "Facility name is required";
    }
    
    if (!address.trim()) {
      newErrors.address = "Address is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateFacility = () => {
    if (validateForm()) {
      // Get current date for setupDate
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Create new facility object
      const newFacility: Facility = {
        name: facilityName.trim(),
        type: facilityType,
        address: address.trim(),
        setupStatus: "Initial Setup",
        setupDate: formattedDate,
        completionPercentage: 0,
        buildings: 0,
        blocks: 0,
        floors: 0,
        departments: 0,
        roomsConfigured: 0,
        totalRooms: 0,
      };

      // Add new facility to the list
      setFacilities((prevFacilities) => [...prevFacilities, newFacility]);
      
      // TODO: Implement API call to create facility
      console.log("Creating facility:", newFacility);
      
      handleCloseDialog();
    }
  };

  // Calculate stats from facilities
  const infrastructureStats = useMemo(() => [
    { title: "Total Facilities", value: facilities.length },
    { 
      title: "Active Setup", 
      value: facilities.filter(f => f.setupStatus === "Active Setup").length 
    },
    { 
      title: "Total Buildings", 
      value: facilities.reduce((sum, f) => sum + f.buildings, 0) 
    },
    { 
      title: "Configured Rooms", 
      value: facilities.reduce((sum, f) => sum + f.roomsConfigured, 0) 
    },
  ], [facilities]);

  const handleFacilityClick = (facility: Facility) => {
    const params = new URLSearchParams({
      facility: facility.name,
      type: facility.type,
      address: facility.address,
      completion: facility.completionPercentage.toString(),
      buildings: facility.buildings.toString(),
      blocks: (facility.blocks || 0).toString(),
      floors: facility.floors.toString(),
      departments: facility.departments.toString(),
      totalRooms: facility.totalRooms.toString(),
      configuredRooms: facility.roomsConfigured.toString(),
      incompleteRooms: (facility.totalRooms - facility.roomsConfigured).toString(),
    });
    router.push(`/infrastructure/config-structure?${params.toString()}`);
  };

  return (
    <AppShell>
      <div className="flex flex-col min-h-[calc(100vh-12rem)]">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4"> 

          <div>
            <PageHeading title="Hospital Management System" />
            <p className="text-gray-400 mt-0">Configure and manage hospitals, clinics, and their infrastructure</p>
          </div>
          <Button
            variant="primary"
            size="medium"
            onClick={handleAddNew}
            leftIcon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Hospital/Clinic
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {infrastructureStats.map((stat) => (
            <StatCard key={stat.title} title={stat.title} value={stat.value} />
          ))}
        </div>
        <div className="mt-6 mb-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">All Hospitals & Clinics</h2>
          <div className="space-y-4">
            {facilities.map((facility, index) => (
              <FacilityCard
                key={index}
                name={facility.name}
                type={facility.type}
                address={facility.address}
                setupStatus={facility.setupStatus}
                setupDate={facility.setupDate}
                completionPercentage={facility.completionPercentage}
                buildings={facility.buildings}
                blocks={facility.blocks}
                floors={facility.floors}
                departments={facility.departments}
                roomsConfigured={facility.roomsConfigured}
                totalRooms={facility.totalRooms}
                onClick={() => handleFacilityClick(facility)}
              />
            ))}
          </div>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        title="Add New Facility"
        width={600}
        contentPadding="px-6 py-6"
      >
        <div className="flex flex-col gap-6">
          {/* Subtitle */}
          <p className="text-sm text-gray-500 -mt-2">
            Create a new hospital or clinic to start configuration
          </p>

          {/* Facility Type Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-700">Facility Type</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Hospital Option */}
              <button
                type="button"
                onClick={() => setFacilityType("Hospital")}
                className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all ${
                  facilityType === "Hospital"
                    ? "border-green-600 bg-white"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    facilityType === "Hospital" ? "bg-green-600" : "bg-gray-300"
                  }`} />
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={facilityType === "Hospital" ? "text-green-700" : "text-gray-400"}
                  >
                    <path
                      d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v0M9 13v0M9 17v0M15 13v0M15 17v0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col items-start w-full">
                  <span className="text-sm font-medium text-gray-900">Hospital</span>
                  <span className="text-xs text-gray-500">Multi-specialty facility</span>
                </div>
              </button>

              {/* Clinic Option */}
              <button
                type="button"
                onClick={() => setFacilityType("Clinic")}
                className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all ${
                  facilityType === "Clinic"
                    ? "border-green-600 bg-white"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    facilityType === "Clinic" ? "bg-green-600" : "bg-gray-300"
                  }`} />
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={facilityType === "Clinic" ? "text-green-700" : "text-gray-400"}
                  >
                    <path
                      d="M9 5h6M9 5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M9 5v14M15 5v14M12 11v2M8 19h8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="7" cy="19" r="2" fill="currentColor" />
                    <circle cx="17" cy="19" r="2" fill="currentColor" />
                  </svg>
                </div>
                <div className="flex flex-col items-start w-full">
                  <span className="text-sm font-medium text-gray-900">Clinic</span>
                  <span className="text-xs text-gray-500">Smaller practice</span>
                </div>
              </button>
            </div>
          </div>

          {/* Facility Name Input */}
          <div className="flex flex-col gap-2">
            <FormInputField
              label="Facility Name *"
              placeholder="e.g., City General Hospital"
              value={facilityName}
              onChange={(e) => {
                setFacilityName(e.target.value);
                if (errors.facilityName) {
                  setErrors({ ...errors, facilityName: undefined });
                }
              }}
              error={errors.facilityName}
            />
          </div>

          {/* Address Input */}
          <div className="flex flex-col gap-2">
            <FormInputField
              label="Address *"
              placeholder="e.g., 123 Healthcare Blvd, Medical District"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) {
                  setErrors({ ...errors, address: undefined });
                }
              }}
              error={errors.address}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateFacility}
              className="min-w-[140px]"
            >
              Create Facility
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
};

export default page;