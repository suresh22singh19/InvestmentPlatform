/**
 * IPD Reception API — RTK Query endpoints
 */

import { baseApi } from "./baseApi";
import { normalizeAwaitingPatient } from "@/lib/ipd-reception/mapIpdAwaitingPatients";
import type {
  AwaitingPatientsParams,
  AwaitingPatientsResponse,
  CreateIpdAdmissionPayload,
  CreateIpdAdmissionResponse,
  IpdDashboardStatsParams,
  IpdDashboardStatsResponse,
  IpdPatientOverviewParams,
  IpdPatientOverviewResponse,
  IpdWardCapacityOverviewParams,
  IpdWardCapacityOverviewResponse,
  SubmitPendingDocumentsPayload,
  SubmitPendingDocumentsResponse,
} from "@/lib/ipd-reception/types";

function toQueryString(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const ipdReceptionApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /** GET /patient-admissions/ipdDashboardStats */
    getIpdReceptionDashboardStats: builder.query<
      IpdDashboardStatsResponse,
      IpdDashboardStatsParams | void
    >({
      query: (params) => ({
        url: `/patient-admissions/ipdDashboardStats${toQueryString({
          branchId: params?.branchId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
      providesTags: [{ type: "IpdReception", id: "STATS" }],
    }),

    /** GET /patient-admissions/ipdRoomCapacityOverview — Ward Capacity Overview (left card) */
    getIpdRoomCapacityOverview: builder.query<
      IpdWardCapacityOverviewResponse,
      IpdWardCapacityOverviewParams | void
    >({
      query: (params) => ({
        url: `/patient-admissions/ipdRoomCapacityOverview${toQueryString({
          branchId: params?.branchId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
      providesTags: [{ type: "IpdReception", id: "WARD_CAPACITY" }],
    }),

    /** GET /patient-admissions/ipdRoomTypeCapacityOverview — Room Types (right card) */
    getIpdRoomTypeCapacityOverview: builder.query<
      IpdWardCapacityOverviewResponse,
      IpdWardCapacityOverviewParams | void
    >({
      query: (params) => ({
        url: `/patient-admissions/ipdRoomTypeCapacityOverview${toQueryString({
          branchId: params?.branchId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
      providesTags: [{ type: "IpdReception", id: "ROOM_TYPES" }],
    }),

    /** GET /patient-admissions/ipdPatientOverview */
    getIpdPatientOverview: builder.query<IpdPatientOverviewResponse, IpdPatientOverviewParams>({
      query: (params) => ({
        url: `/patient-admissions/ipdPatientOverview${toQueryString({
          patientId: params.patientId,
          branchId: params.branchId,
        })}`,
        method: "GET",
      }),
    }),

    /** Live backend route: GET /patient-admissions/ipdPatientsListing */
    getIpdAwaitingPatients: builder.query<AwaitingPatientsResponse, AwaitingPatientsParams>({
      query: (params) => ({
        url: `/patient-admissions/ipdPatientsListing${toQueryString({
          patientId: params.patientId,
          page: params.page,
          limit: params.limit,
          sort: params.sort,
          order: params.order,
          search: params.search,
          branchId: params.branchId,
          patientType: params.patientType,
        })}`,
        method: "GET",
      }),
      transformResponse: (response: AwaitingPatientsResponse): AwaitingPatientsResponse => ({
        ...response,
        data: (response.data ?? []).map((row) => normalizeAwaitingPatient(row)),
      }),
      keepUnusedDataFor: 0,
      providesTags: [{ type: "IpdReception", id: "AWAITING_LIST" }],
    }),

    /** POST /patient-admissions/createIpdAdmission */
    createIpdAdmission: builder.mutation<CreateIpdAdmissionResponse, CreateIpdAdmissionPayload>({
      query: (body) => ({
        url: "/patient-admissions/createIpdAdmission",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "IpdReception", id: "AWAITING_LIST" },
        { type: "IpdReception", id: "STATS" },
      ],
    }),

    /** POST /patient-admissions/submitPendingDocuments */
    submitPendingDocuments: builder.mutation<
      SubmitPendingDocumentsResponse,
      SubmitPendingDocumentsPayload
    >({
      query: (body) => ({
        url: "/patient-admissions/submitPendingDocuments",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "IpdReception", id: "AWAITING_LIST" }],
    }),
  }),
});

export const {
  useGetIpdReceptionDashboardStatsQuery,
  useGetIpdRoomCapacityOverviewQuery,
  useGetIpdRoomTypeCapacityOverviewQuery,
  useGetIpdPatientOverviewQuery,
  useGetIpdAwaitingPatientsQuery,
  useCreateIpdAdmissionMutation,
  useSubmitPendingDocumentsMutation,
} = ipdReceptionApi;
