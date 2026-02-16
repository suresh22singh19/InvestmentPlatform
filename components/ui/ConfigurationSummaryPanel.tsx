"use client";

import React from "react";

type ConfigurationSummaryPanelProps = {
  facilityName: string;
  facilityType?: "Hospital" | "Clinic";
  completionPercentage: number;
  isOpen: boolean;
  onClose: () => void;
  buildings?: number;
  blocks?: number;
  floors?: number;
  departments?: number;
  totalRooms?: number;
  configuredRooms?: number;
  incompleteRooms?: number;
  lastModified?: string;
};

export const ConfigurationSummaryPanel = ({
  facilityName,
  facilityType = "Hospital",
  completionPercentage,
  isOpen,
  onClose,
  buildings = 2,
  blocks,
  floors = 3,
  departments = 1,
  totalRooms = 2,
  configuredRooms = 1,
  incompleteRooms = 1,
  lastModified = "Feb 5, 2026, 05:30 AM",
}: ConfigurationSummaryPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="w-[20%] flex-shrink-0">
      <div className="sticky top-0 rounded-[12px] border border-gray-200 bg-white shadow-sm p-6">
        {/* Panel Header with Close Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Configuration Summary</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            aria-label="Close panel"
          >
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Facility Name */}
        <p className="text-base font-medium text-gray-700 mb-6">{facilityName}</p>

        {/* Overall Progress */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Overall Progress</h3>
          <div className="mb-2">
            <div className="h-2 bg-green-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">In Progress</span>
          </div>
        </div>

        {/* Structure Overview - same icons and green as Hierarchy Tree */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Structure Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-5 w-5 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 flex-1">Buildings</span>
              <span className="text-sm font-semibold text-gray-900">{buildings}</span>
            </div>
            {facilityType === "Hospital" && blocks !== undefined && blocks > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-100">
                  <svg
                    className="h-5 w-5 text-green-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-600 flex-1">Blocks</span>
                <span className="text-sm font-semibold text-gray-900">{blocks}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-5 w-5 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 flex-1">Floors</span>
              <span className="text-sm font-semibold text-gray-900">{floors}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-5 w-5 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 flex-1">Departments</span>
              <span className="text-sm font-semibold text-gray-900">{departments}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-5 w-5 text-green-700"
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
              </div>
              <span className="text-sm text-gray-600 flex-1">Total Rooms</span>
              <span className="text-sm font-semibold text-gray-900">{totalRooms}</span>
            </div>
          </div>
        </div>

        {/* Room Status */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Room Status</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600 flex-1">Configured</span>
              <span className="text-sm font-semibold text-gray-900">{configuredRooms}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              <span className="text-sm text-gray-600 flex-1">Incomplete</span>
              <span className="text-sm font-semibold text-gray-900">{incompleteRooms}</span>
            </div>
          </div>
        </div>

        {/* Setup Checklist */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Setup Checklist</h3>
          <div className="space-y-2">
            {[
              { label: 'Add Buildings', completed: true },
              { label: 'Define Floors', completed: true },
              { label: 'Create Departments', completed: true },
              { label: 'Add Rooms', completed: true },
              { label: 'Configure All Rooms', completed: false },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {item.completed ? (
                  <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-green-500">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex-shrink-0 h-5 w-5 rounded-full border-2 border-gray-300"></div>
                )}
                <span className={`text-sm ${item.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Last Modified */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Last Modified</p>
          <p className="text-sm text-gray-700">{lastModified}</p>
        </div>
      </div>
    </div>
  );
};
