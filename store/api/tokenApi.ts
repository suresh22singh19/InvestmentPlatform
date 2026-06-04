/**
 * Patient token display (OPD monitors / live lists)
 */

import { baseApi } from "./baseApi";

export type TokenAppointment = {
  appointmentId: number;
  registrationId: number;
  patientName: string;
  token: string;
  timeSlot: string;
  appointmentDate: string;
};

/** One doctor column from GET .../GetBranchDoctorPatientsToken */
export type TokenDoctorRow = {
  doctorId: number;
  doctorName: string;
  /** Currently served patient, if any */
  nowServing: TokenAppointment | null;
  /** Waiting queue (excludes nowServing in normal API responses) */
  waiting: TokenAppointment[];
};

export type GetBranchDoctorPatientsTokenData = {
  branchId: number;
  appointmentDate: string;
  doctors: TokenDoctorRow[];
};

export type GetBranchDoctorPatientsTokenResponse = {
  success: boolean;
  data: GetBranchDoctorPatientsTokenData;
  message: string;
  timestamp: string;
  statusCode: number;
};

export type MarkOpdCompleteResponse = {
  success: boolean;
  data: null;
  message: string;
  timestamp: string;
  statusCode: number;
};

export const tokenApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getBranchDoctorPatientsToken: builder.query<
      GetBranchDoctorPatientsTokenResponse,
      { branchId: number; doctorIds: number[]; appointmentDate: string }
    >({
      query: ({ branchId, doctorIds, appointmentDate }) => {
        const params = new URLSearchParams();
        params.set("branchId", String(branchId));
        params.set("appointmentDate", appointmentDate);
        doctorIds.forEach((id) => params.append("doctorIds", String(id)));
        return {
          url: `/patient-token-display/GetBranchDoctorPatientsToken?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (_result, _error, arg) => [
        {
          type: "PatientTokenDisplay" as const,
          id: `b${arg.branchId}-d${[...arg.doctorIds].sort((a, b) => a - b).join(",")}-t${arg.appointmentDate}`,
        },
      ],
    }),
    markOpdComplete: builder.mutation<MarkOpdCompleteResponse, { appointmentId: number; branchId: number }>({
      query: (body) => ({
        url: "/patient-token-display/MarkOpdComplete",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["PatientTokenDisplay"],
    }),
  }),
});

export const {
  useGetBranchDoctorPatientsTokenQuery,
  useLazyGetBranchDoctorPatientsTokenQuery,
  useMarkOpdCompleteMutation,
} = tokenApi;
