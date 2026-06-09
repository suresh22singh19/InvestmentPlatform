"use client";

import { WardProgress } from "./WardProgress";
import {
  ROOM_TYPES_SECTION_TITLE,
  WARD_CAPACITY_SECTION_TITLE,
} from "@/lib/ipd-reception/constants";
import type { WardCapacityItem } from "@/lib/ipd-reception/types";

type WardCapacityOverviewProps = {
  wardCapacity: WardCapacityItem[];
  roomTypes: WardCapacityItem[];
  isWardCapacityLoading?: boolean;
  isRoomTypesLoading?: boolean;
  isWardCapacityError?: boolean;
  wardCapacityErrorMessage?: string;
  isRoomTypesError?: boolean;
  roomTypesErrorMessage?: string;
};

type CapacityCardProps = {
  title: string;
  items: WardCapacityItem[];
  isLoading?: boolean;
  emptyMessage?: string;
};

function CapacityCard({ title, items, isLoading, emptyMessage }: CapacityCardProps) {
  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-5 text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2>
      {isLoading ? (
        <p className="text-sm text-[#9FA2AB]">Loading {title.toLowerCase()}...</p>
      ) : items.length > 0 ? (
        <div className="flex flex-col gap-5">
          {items.map((ward) => (
            <WardProgress key={ward.id} ward={ward} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#9FA2AB]">{emptyMessage ?? "No data available."}</p>
      )}
    </div>
  );
}

export function WardCapacityOverview({
  wardCapacity,
  roomTypes,
  isWardCapacityLoading,
  isRoomTypesLoading,
  isWardCapacityError,
  wardCapacityErrorMessage,
  isRoomTypesError,
  roomTypesErrorMessage,
}: WardCapacityOverviewProps) {
  const wardCapacityEmptyMessage = isWardCapacityError
    ? wardCapacityErrorMessage ?? "Failed to load ward capacity overview."
    : "No ward capacity data available.";

  const roomTypesEmptyMessage = isRoomTypesError
    ? roomTypesErrorMessage ?? "Failed to load room types."
    : "No room types available.";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CapacityCard
        title={WARD_CAPACITY_SECTION_TITLE}
        items={wardCapacity}
        isLoading={isWardCapacityLoading}
        emptyMessage={wardCapacityEmptyMessage}
      />
      <CapacityCard
        title={ROOM_TYPES_SECTION_TITLE}
        items={roomTypes}
        isLoading={isRoomTypesLoading}
        emptyMessage={roomTypesEmptyMessage}
      />
    </div>
  );
}
