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
    getPresignedUrl: builder.query<
      {
        success: boolean;
        data: { signedUrl: string };
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { key: string }
    >({
      query: (params) => ({
        url: `/common/getPresignedUrl?key=${encodeURIComponent(params.key)}`,
        method: "GET",
      }),
      // Presigned URLs expire in ~1 hour; don't cache beyond 55 minutes
      keepUnusedDataFor: 55 * 60,
    }),
    getPatientFiles: builder.query<
      {
        success: boolean;
        data: Array<{
          id: number;
          uhid: string;
          fileName: string;
          description: string | null;
          path: string;
          uploadedBy: string | null;
          branchId: number;
          masterSettingId: number;
          createdBy: number;
          createdAt: string;
          updatedAt: string;
          fileType: string | null;
          createdByName: string | null;
        }>;
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { uhid: string }
    >({
      query: (params) => ({
        url: `/common/getPatientFiles?uhid=${encodeURIComponent(params.uhid)}`,
        method: "GET",
      }),
      // Provide a per-UHID tag so createPatientFile can invalidate only this patient's files
      providesTags: (_result, _error, { uhid }) => [
        { type: "PatientFiles" as const, id: uhid },
      ],
      // Cache data for 5 minutes after component unmounts
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useGetBuildingDropdownQuery,
  useGetFloorDropdownQuery,
  useGetDoctorDropdownQuery,
  useGetRoomTypeDropdownQuery,
  useGetPresignedUrlQuery,
  useLazyGetPresignedUrlQuery,
  useGetPatientFilesQuery,
  useLazyGetPatientFilesQuery,
} = commonApi;
