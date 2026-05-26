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

    /**
     * Get future admissions & bookings tracker list
     */
    getFutureAdmissions: builder.query<FutureAdmissionResponse, FutureAdmissionParams>({
      query: (params) => ({
        url: "/counsellor/future-admission-list",
        method: "GET",
        params,
      }),
    }),

    /**
     * Get treatment packages list
     */
    getTreatmentPackages: builder.query<TreatmentPackageResponse, TreatmentPackageParams>({
      query: (params) => ({
        url: "/counsellor/treatment-package-list",
        method: "GET",
        params,
      }),
    }),

    /**
     * Get patient admission listing
     */
    getPatientAdmissions: builder.query<PatientAdmissionListingResponse, PatientAdmissionListingParams>({
      query: (params) => ({
        url: "/counsellor/patient-admission-listing",
        method: "GET",
        params,
      }),
    }),
  }),
});

export interface TreatmentPackageParams {
  sortBy?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string | number;
}

export interface TreatmentPackageItem {
  id: number;
  packageName: string;
  totalPerDayCost: string;
  activePatients: number;
  totalAdmissions: number;
}

export interface TreatmentPackageResponse {
  success: boolean;
  data: {
    metrics: {
      totalPackages: number;
      activeEnrollments: number;
    };
    listing: {
      data: TreatmentPackageItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface FutureAdmissionParams {
  sortBy?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string | number;
}

export interface FutureAdmissionItem {
  id: number;
  patientName: string;
  admissionType: string;
  uhid: string;
  bookingStatus: string;
  package: string;
  patientPackageId: number;
  roomType: string;
  advance: string;
  admissionDate: string;
  doctorName: string;
}

export interface FutureAdmissionMetrics {
  totalBookingsNext7Days: number;
  confirmedAdmissions: number;
  tentativeBookings: number;
  advancesCollected: string | number;
}

export interface FutureAdmissionData {
  metrics: FutureAdmissionMetrics;
  listing: {
    data: FutureAdmissionItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FutureAdmissionResponse {
  success: boolean;
  data: FutureAdmissionData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientAdmissionListingParams {
  sortBy?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string | number;
  type?: "ipd" | "day_care";
}

export interface PatientAdmissionItem {
  id: number;
  patientId: number;
  patientName: string;
  uhid: string;
  contactNumber: string;
  diagnosis: string | null;
  admissionType: string;
  type: string;
  patientAdmitted: string;
  admissionDate: string;
  createdAt: string;
  doctorName: string;
  status: string;
  bedNumber: string;
  roomNumber: string;
  roomType: string;
}

export interface PatientAdmissionListingResponse {
  success: boolean;
  data: PatientAdmissionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export const {
  useGetCounsellorStatsQuery,
  useGetReferredPatientsQuery,
  useGetTodayAdmissionsQuery,
  useGetTodayAvailableRoomsQuery,
  useGetCounsellorAllPackagesQuery,
  useGetTentativeOrArchivedListQuery,
  useGetFutureAdmissionsQuery,
  useGetTreatmentPackagesQuery,
  useGetPatientAdmissionsQuery,
} = counsellorApi;

