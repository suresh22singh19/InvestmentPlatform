import type { WardCapacityStatusColor } from "./types";

/** Category row from ipdRoomCapacityOverview / ipdRoomTypeCapacityOverview */
export interface IpdWardCapacityOverviewApiItem {
  id?: string | number;
  roomCategory?: string;
  wardCategory?: string;
  wardType?: string;
  roomType?: string;
  roomTyp?: string;
  name?: string;
  label?: string;
  totalBeds?: number;
  totalCapacity?: number;
  total?: number;
  bedCount?: number;
  occupiedBeds?: number;
  occupied?: number;
  freeBeds?: number;
  free?: number;
  availableBeds?: number;
  occupancyPercentage?: number;
  statusColor?: WardCapacityStatusColor;
  status?: string;
  color?: string;
}

export interface IpdWardCapacityOverviewData {
  categories?: IpdWardCapacityOverviewApiItem[];
  wardCapacity?: IpdWardCapacityOverviewApiItem[];
  wardCapacityOverview?: IpdWardCapacityOverviewApiItem[];
  wards?: IpdWardCapacityOverviewApiItem[];
  roomTypes?: IpdWardCapacityOverviewApiItem[];
}

/** API may return `{ categories }` directly or wrapped in `{ success, data }`. */
export type IpdRoomTypeCapacityOverviewPayload =
  | IpdWardCapacityOverviewData
  | IpdWardCapacityOverviewApiItem[];

export interface IpdWardCapacityOverviewResponse {
  success?: boolean;
  data?: IpdRoomTypeCapacityOverviewPayload;
  categories?: IpdWardCapacityOverviewApiItem[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

export interface IpdWardCapacityOverviewParams {
  branchId?: number;
}

import type { WardCapacityItem } from "./types";

export interface IpdWardCapacityOverviewView {
  wardCapacity: WardCapacityItem[];
  roomTypes: WardCapacityItem[];
}
