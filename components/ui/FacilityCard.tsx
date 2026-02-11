"use client";

import React from "react";
import Image from "next/image";

type FacilityCardProps = {
  name: string;
  type: "Hospital" | "Clinic";
  address: string;
  setupStatus: string;
  setupDate: string;
  completionPercentage: number;
  buildings: number;
  floors: number;
  departments: number;
  roomsConfigured: number;
  totalRooms: number;
  onClick?: () => void;
};

export const FacilityCard = ({
  name,
  type,
  address,
  setupStatus,
  setupDate,
  completionPercentage,
  buildings,
  floors,
  departments,
  roomsConfigured,
  totalRooms,
  onClick,
}: FacilityCardProps) => {
  return (
    <div
      className="relative flex w-full cursor-pointer items-start gap-4 rounded-[12px] border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md p-6 "
      onClick={onClick}
    >


      {/* Content */}
      <div className="flex-1">

        {/* Header */}
        <div className="mb-3 flex items-start gap-2">
          <div className="flex-shrink-0">
            {/* Hospital Icon */}

            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
              <svg
                className="h-6 w-6 text-gray-700"
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
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              <span className="rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                {type}
              </span>
            </div>
            <p className="text-sm text-gray-500">{address}</p>
          </div>
        </div>

        {/* Setup Progress */}
        <div className=" p-4 rounded-[12px] border border-gray-200 bg-[#f7f7f7]">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="font-medium text-gray-900">{setupStatus}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">Updated {setupDate}</span>
            </div>
            <span className="font-medium text-gray-900">
              {completionPercentage}% Complete
            </span>
          </div>
          {/* Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Buildings</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">
              {buildings}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Floors</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">
              {floors}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Departments</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">
              {departments}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rooms</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">
              {roomsConfigured} / {totalRooms} configured
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Arrow Icon */}
      <div className="flex-shrink-0">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
};
