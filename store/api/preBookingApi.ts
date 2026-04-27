/**
 * Pre-Booking API
 * Purpose: Pre-booking module endpoints (GetAllPrebookings, etc.)
 */

import { baseApi } from "./baseApi";

// Single pre-booking item from GetAllPrebookings response (snake_case from API)
export interface PreBookingListItem {
  id: number;
  uhid?: string;
  patient_name?: string;
  patient_title?: string;
  guardian_title?: string;
  guardian_name?: string;
  gender?: string;
  age?: string;
  contact_number?: string;
  email_address?: string | null;
  address?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  pin_code?: string | null;
  area?: string;
  tehsil?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: string;
  price?: string;
  mode?: string;
  payment_method?: string | null;
  transaction_id?: string | null;
  transaction_date?: string | null;
  payment_status?: string;
  doctor_name?: string;
  doctor_user_id?: number | null;
  branch_id?: number | null;
  branch_name?: string | null;
  panel_id?: number | null;
  booking_type?: string;
  marital_status?: string;
  addiction?: string | null;
  patient_type?: string;
  patient_sub_type?: string;
  benificiary_id?: string;
  insurance_company?: string;
  ayush_covered?: string;
  diagnosis_id?: number | null;
  sub_diagnosis_id?: number | null;
  symptoms?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  remark?: string | null;
  landmark?: string | null;
  package_id?: number | null;
  package_start_date?: string | null;
  package_end_date?: string | null;
  problems?: string;
  created_at?: string | null;
  patient_payment_id?: number | null;
}

export interface GetAllPrebookingsParams {
  /** Omit or pass `null` to request all branches (no branch filter). */
  branchId: number | null;
  page?: number;
  limit?: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  dateFilter?: "present" | "past" | "future" | "";
  sortOrder?: "ASC" | "DESC";
  bookingType?: string; // e.g. "opd" | "ipd" | "confirmed"
  /** Optional override; default is "active" for opd/ipd and "confirmed" for confirmed tab */
  status?: string;
}

export interface GetAllPrebookingsResponse {
  success: boolean;
  data: PreBookingListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

// Create pre-booking request payload (align with CreatePrebooking API)
export interface CreatePreBookingRequest {
  /** When user selects existing patient from "Patient Already Exists" dialog (Revisit), send that patient's uhid from registrations-and-pre-bookings response */
  uhid?: string | null;
  branchId: number | string;
  contactNumber: string;
  patientName?: string;
  patientTitle?: string;
  guardianTitle?: string;
  parentName?: string;
  gender?: string;
  age?: string;
  emailAddress?: string;
  maritalStatus?: string;
  doctorUserId?: number | string;
  pinCode?: string;
  country?: string;
  state?: string;
  city?: string;
  tehsil?: string;
  area?: string;
  areaId?: number | string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  addiction?: string[] | string;
  patientType?: string;
  patientSubType?: string;
  panelId?: string | number;
  benificiaryId?: string;
  insuranceCompany?: string;
  ayushCovered?: string;
  // jsHealthCardNo?: string;
  diagnosisId?: number | string;
  subDiagnosisId?: number | string;
  symptoms?: string;
  bookingType?: "opd" | "ipd" | string;
  // dateApp?: string;
  appointmentDate?: string;
  timeSlot?: string;
  remarks?: string;
  packageId?: number | string;
  startDate?: string;
  endDate?: string;
  amount?: string;
  paymentMode?: string;
  paymentMethod?: string;
  transactionId?: string;
  [key: string]: unknown;
}

export interface CreatePreBookingResponse {
  success: boolean;
  data?: { id?: number; uhid?: string; [key: string]: unknown };
  message: string;
  timestamp?: string;
  statusCode?: number;
}

export const preBookingApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Get all pre-bookings with filters and pagination
     */
    getAllPrebookings: builder.query<GetAllPrebookingsResponse, GetAllPrebookingsParams>({
      query: (params) => {
        const {
          branchId: branchIdParam,
          page = 1,
          limit = 10,
          search = "",
          fromDate = "2025-01-01",
          toDate = "2026-12-31",
          dateFilter = "present",
          sortBy = "createdAt",
          sortOrder = "DESC",
          bookingType = "opd",
          status: statusOverride,
        } = params;
        const isConfirmed = String(bookingType || "").toLowerCase() === "confirmed";
        // OPD/IPD + Present/Future/Archived: backend expects active pre-bookings; Confirmed tab uses status=confirmed
        const status =
          statusOverride !== undefined && statusOverride !== null
            ? String(statusOverride)
            : isConfirmed
              ? "confirmed"
              : "active";
        const bookingTypeParam = isConfirmed ? "" : String(bookingType || "opd");
        const queryParams = new URLSearchParams();
        if (branchIdParam != null) {
          const n = typeof branchIdParam === "number" ? branchIdParam : Number(branchIdParam);
          if (Number.isFinite(n)) {
            queryParams.set("branchId", String(n));
          }
        }
        queryParams.set("page", String(page));
        queryParams.set("limit", String(limit));
        queryParams.set("search", String(search));
        queryParams.set("fromDate", String(fromDate));
        queryParams.set("toDate", String(toDate));
        queryParams.set("sortBy", String(sortBy));
        queryParams.set("sortOrder", String(sortOrder));
        queryParams.set("bookingType", bookingTypeParam);
        queryParams.set("status", status);
        const df = String(dateFilter ?? "").trim();
        if (df !== "") {
          queryParams.set("dateFilter", df);
        }
        return {
          url: `/admin/pre-booking/GetAllPrebookings?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Prebookings"],
    }),
    /**
     * Create a new pre-booking (CreatePrebooking)
     */
    createPreBooking: builder.mutation<CreatePreBookingResponse, CreatePreBookingRequest>({
      query: (body) => ({
        url: "/admin/pre-booking/CreatePrebooking",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Prebookings"],
    }),
    sendAddressSms: builder.mutation<
      { success: boolean; data?: { message: string; sentTo: string }; message: string; statusCode: number },
      { patientName: string; contactNumber: string; branchId: number }
    >({
      query: (body) => ({
        url: "/admin/pre-booking/SendAddressSms",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetAllPrebookingsQuery,
  useLazyGetAllPrebookingsQuery,
  useCreatePreBookingMutation,
  useSendAddressSmsMutation,
} = preBookingApi;
