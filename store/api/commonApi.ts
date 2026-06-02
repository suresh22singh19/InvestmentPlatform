/**
 * Common API Endpoints
 * Purpose: Global lookup drop-downs (Building, Floor, Doctor, etc.)
 */

import { baseApi } from "./baseApi";

export interface DropdownParams {
  branchId?: number | string;
}

export interface BuildingDropdownItem {
  id: number;
  name: string;
}

export interface BuildingDropdownResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: BuildingDropdownItem[];
}

export interface FloorDropdownItem {
  id: number;
  name: string;
}

export interface FloorDropdownResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: FloorDropdownItem[];
}

export interface DoctorDropdownItem {
  id: number;
  name: string;
}

export interface DoctorDropdownResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: DoctorDropdownItem[];
}

export interface RoomTypeDropdownItem {
  id: number;
  name: string;
}

export interface RoomTypeDropdownResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: RoomTypeDropdownItem[];
}

export const commonApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getBuildingDropdown: builder.query<BuildingDropdownResponse, DropdownParams | void>({
      query: (params) => ({
        url: "/common/building-dropdown-list",
        method: "GET",
        params: params || undefined,
      }),
    }),
    getFloorDropdown: builder.query<FloorDropdownResponse, DropdownParams | void>({
      query: (params) => ({
        url: "/common/floor-dropdown-list",
        method: "GET",
        params: params || undefined,
      }),
    }),
    getDoctorDropdown: builder.query<DoctorDropdownResponse, DropdownParams | void>({
      query: (params) => ({
        url: "/common/doctor-dropdown-list",
        method: "GET",
        params: params || undefined,
      }),
    }),
    getRoomTypeDropdown: builder.query<RoomTypeDropdownResponse, DropdownParams | void>({
      query: (params) => ({
        url: "/common/room-type-dropdown-list",
        method: "GET",
        params: params || undefined,
      }),
    }),
  }),
});

export const {
  useGetBuildingDropdownQuery,
  useGetFloorDropdownQuery,
  useGetDoctorDropdownQuery,
  useGetRoomTypeDropdownQuery,
} = commonApi;
