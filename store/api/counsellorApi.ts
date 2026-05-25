/**
 * Counsellor API
 * Purpose: Counsellor dashboard and related endpoints
 */

import { baseApi } from "./baseApi";
import type { GetAllPackagesParams, GetAllPackagesResponse } from "./settingsApi";

export interface CounsellorDashboardStatsResponse {
  success: boolean;
  data: {
    totalOPDPatient: number;
    todayAdmissions: number;
    availableRooms: number;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CounsellorPatientListParams {
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CounsellorPatientListItem {
  id: number | string;
  patientName: string;
  patientUhid: string;
  contactNumber: string;
  diagnosisSymptoms?: string | null;
  doctorName?: string | null;
}

export interface CounsellorPatientListResponse {
  success: boolean;
  data: CounsellorPatientListItem[];
  total: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CounsellorTentativeOrArchivedParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
  search?: string;
  type: "tentative" | "archived";
}

export interface CounsellorTentativeOrArchivedItem {
  id: string | number;
  patientName: string;
  patientUhid: string;
  contactNumber: string;
  diagnosis?: string | null;
  doctorName?: string | null;
  admissionDate?: string | null;
}

export interface CounsellorTentativeOrArchivedResponse {
  success: boolean;
  data: CounsellorTentativeOrArchivedItem[];
  total: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CounsellorTodayAdmissionItem {
  id: number | string;
  patientName: string;
  patientUhid: string;
  contactNumber: string;
  diagnosis?: string | null;
  admissionType?: string | null;
  patientType?: string | null;
  doctorName?: string | null;
}

export interface CounsellorTodayAdmissionResponse {
  success: boolean;
  data: CounsellorTodayAdmissionItem[];
  total: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CounsellorAvailableRoomItem {
  id: number | string;
  roomNumber: string;
  roomType: string;
  bedCapacity: number;
  status: string;
  branchName: string;
  buildingName: string;
  floorName: string;
}

export interface CounsellorAvailableRoomResponse {
  success: boolean;
  data: CounsellorAvailableRoomItem[];
  total: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export const counsellorApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Get counsellor dashboard stats (widgets)
     */
    getCounsellorStats: builder.query<CounsellorDashboardStatsResponse, void>({
      query: () => ({
        url: "/counsellor/dashboard/stats",
        method: "GET",
      }),
    }),

    /**
     * Get referred completed patients list
     */
    getReferredPatients: builder.query<CounsellorPatientListResponse, CounsellorPatientListParams>({
      query: (params) => ({
        url: "/counsellor/opd-completed-patient-list",
        method: "GET",
        params,
      }),
    }),

    /**
     * Get today's admission list
     */
    getTodayAdmissions: builder.query<CounsellorTodayAdmissionResponse, CounsellorPatientListParams>({
      query: (params) => ({
        url: "/counsellor/today-admission-list",
        method: "GET",
        params,
      }),
    }),

    /**
     * Get available rooms list
     */
    getTodayAvailableRooms: builder.query<CounsellorAvailableRoomResponse, CounsellorPatientListParams>({
      query: (params) => ({
        url: "/counsellor/today-available-room-list",
        method: "GET",
        params,
      }),
    }),

    /**
     * Get counsellor packages list
     */
    getCounsellorAllPackages: builder.query<GetAllPackagesResponse, GetAllPackagesParams | void>({
      query: (params) => ({
        url: "/counsellor/getAllPackages",
        method: "GET",
        params: params ? (params as any) : undefined,
      }),
    }),

    /**
     * Get counsellor tentative or archived patients list
     */
    getTentativeOrArchivedList: builder.query<CounsellorTentativeOrArchivedResponse, CounsellorTentativeOrArchivedParams>({
      query: (params) => ({
        url: "/counsellor/tentative-or-archived-list",
        method: "GET",
        params,
      }),
    }),
  }),
});

export const {
  useGetCounsellorStatsQuery,
  useGetReferredPatientsQuery,
  useGetTodayAdmissionsQuery,
  useGetTodayAvailableRoomsQuery,
  useGetCounsellorAllPackagesQuery,
  useGetTentativeOrArchivedListQuery,
} = counsellorApi;

