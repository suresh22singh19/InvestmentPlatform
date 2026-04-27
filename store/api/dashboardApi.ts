/**
 * Dashboard API
 * Purpose: Dashboard endpoints (e.g. today appointment count)
 */

import { baseApi } from "./baseApi";

export interface GetAllAppointmentsCountResponse {
  success: boolean;
  data: { count: number };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetOpdPatientTypeWiseCountResponse {
  success: boolean;
  data: {
    branchId: number;
    date: string;
    prebooking: number;
    revisit: number;
    panel: number;
    tpa: number;
    normal: number;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetTodayTotalConsultancyResponse {
  success: boolean;
  data: {
    total: number;
    PaidConsultancyCount: number;
    branchId: number;
    date: string;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface DashboardSupportContact {
  id: number;
  name: string;
  phone: string;
  role: string;
  categoryId: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface DashboardSupportCategory {
  id: number;
  title: string;
  description: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  contacts: DashboardSupportContact[];
}

export interface GetSupportContactsResponse {
  success: boolean;
  data: DashboardSupportCategory[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export const dashboardApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Get today's appointment count for a branch
     */
    getAppointmentsCount: builder.query<GetAllAppointmentsCountResponse, { branchId: number | string }>({
      query: (params) => ({
        url: "/dashboard/GetAllAppointmentsCount",
        method: "GET",
        params: { branchId: params.branchId },
      }),
    }),
    /**
     * Get yesterday's appointment count for a branch
     */
    getYesterdayAppointmentsCount: builder.query<GetAllAppointmentsCountResponse, { branchId: number | string }>({
      query: (params) => ({
        url: "/dashboard/GetYesterdayAppointmentsCount",
        method: "GET",
        params: { branchId: params.branchId },
      }),
    }),
    /**
     * Get today's registration count for a branch
     */
    getTodayRegistrationCount: builder.query<GetAllAppointmentsCountResponse, { branchId: number | string }>({
      query: (params) => ({
        url: "/dashboard/GetAllTodayRegistrationCount",
        method: "GET",
        params: { branchId: params.branchId },
      }),
    }),
    /**
     * Get OPD patient count by type for a branch
     */
    getOpdPatientTypeWiseCount: builder.query<GetOpdPatientTypeWiseCountResponse, { branchId: number | string }>({
      query: (params) => ({
        url: "/dashboard/GetOpdPatientTypeWiseCount",
        method: "GET",
        params: { branchId: params.branchId },
      }),
    }),
    /**
     * Today's total consultancy amount and paid count for a branch
     */
    getTodayTotalConsultancy: builder.query<GetTodayTotalConsultancyResponse, { branchId: number | string }>({
      query: (params) => ({
        url: "/dashboard/GetTodayTotalConsultancyCount",
        method: "GET",
        params: { branchId: params.branchId },
      }),
    }),
    /** Support categories with contacts (dashboard widget) */
    getSupportContacts: builder.query<GetSupportContactsResponse, void>({
      query: () => ({
        url: "/dashboard/getSupportContacts",
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetAppointmentsCountQuery,
  useGetYesterdayAppointmentsCountQuery,
  useGetTodayRegistrationCountQuery,
  useGetOpdPatientTypeWiseCountQuery,
  useGetTodayTotalConsultancyQuery,
  useGetSupportContactsQuery,
} = dashboardApi;
