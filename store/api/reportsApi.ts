/**
 * Reports API
 * Purpose: Report generation endpoints (e.g. CSV for old/new patients)
 */

import { baseApi } from "./baseApi";

export interface GenerateCsvForOldAndNewPatientParams {
  branchId: number | string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  uhid: string;
}

export interface GenerateCsvForOldAndNewPatientResponse {
  success: boolean;
  data: {
    url: string;
    filename: string;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export const reportsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Generate CSV for old and new patients report (GET).
     * Returns a temporary URL to download the CSV file (available for ~15 seconds).
     */
    generateCsvForOldAndNewPatient: builder.query<
      GenerateCsvForOldAndNewPatientResponse,
      GenerateCsvForOldAndNewPatientParams
    >({
      query: (params) => ({
        url: "/reports/GenerateCsvForOldAndNewPatient",
        method: "GET",
        params: {
          branchId: params.branchId,
          fromDate: params.fromDate,
          toDate: params.toDate,
          uhid: params.uhid,
        },
      }),
    }),
    /**
     * Generate CSV for JS Health Card Issue report (GET).
     * Same params and response shape as old/new patient report.
     */
    generateCsvForHealthCardIssues: builder.query<
      GenerateCsvForOldAndNewPatientResponse,
      GenerateCsvForOldAndNewPatientParams
    >({
      query: (params) => ({
        url: "/reports/GenerateCsvForHealthCardIssues",
        method: "GET",
        params: {
          branchId: params.branchId,
          fromDate: params.fromDate,
          toDate: params.toDate,
          uhid: params.uhid,
        },
      }),
    }),
    /**
     * Generate CSV for doctor assigning report (GET).
     * Same params and response shape as other CSV reports.
     */
    generateCsvForDoctorAssigning: builder.query<
      GenerateCsvForOldAndNewPatientResponse,
      GenerateCsvForOldAndNewPatientParams
    >({
      query: (params) => ({
        url: "/reports/GenerateCsvForDoctorAssigning",
        method: "GET",
        params: {
          branchId: params.branchId,
          fromDate: params.fromDate,
          toDate: params.toDate,
          uhid: params.uhid,
        },
      }),
    }),
    /**
     * Generate CSV for branch consultancy report (GET).
     * Same params and response shape as other CSV reports.
     */
    generateCsvForBranchConsultancy: builder.query<
      GenerateCsvForOldAndNewPatientResponse,
      GenerateCsvForOldAndNewPatientParams
    >({
      query: (params) => ({
        url: "/reports/GenerateCsvForBranchConsultancy",
        method: "GET",
        params: {
          branchId: params.branchId,
          fromDate: params.fromDate,
          toDate: params.toDate,
          uhid: params.uhid,
        },
      }),
    }),
    /**
     * Generate CSV for patient time stamping report (GET).
     * Same params and response shape as other CSV reports.
     */
    generateCsvForPatientTimeStamping: builder.query<
      GenerateCsvForOldAndNewPatientResponse,
      GenerateCsvForOldAndNewPatientParams
    >({
      query: (params) => ({
        url: "/reports/GenerateCsvForPatientTimeStamping",
        method: "GET",
        params: {
          branchId: params.branchId,
          fromDate: params.fromDate,
          toDate: params.toDate,
          uhid: params.uhid,
        },
      }),
    }),
  }),
});

export const {
  useLazyGenerateCsvForOldAndNewPatientQuery,
  useLazyGenerateCsvForHealthCardIssuesQuery,
  useLazyGenerateCsvForDoctorAssigningQuery,
  useLazyGenerateCsvForBranchConsultancyQuery,
  useLazyGenerateCsvForPatientTimeStampingQuery,
} = reportsApi;
