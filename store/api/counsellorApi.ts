/**
 * Counsellor API
 * Purpose: Counsellor dashboard and related endpoints
 */

import { baseApi } from "./baseApi";
import type { GetAllPackagesParams, GetAllPackagesResponse, OfferPromotionType } from "./settingsApi";

export interface GetActiveOfferListParams {
  branchId?: string | number;
  promotionType?: OfferPromotionType;
  panelName?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  order?: "ASC" | "DESC" | "asc" | "desc" | "";
}

export interface ActiveOfferItem {
  id: number;
  branchId: number;
  panelId: number | null;
  offerName: string;
  promotionType: OfferPromotionType;
  bundledStayDuration: number | null;
  bundledFreeDays: number | null;
  flatDiscountPercentage: number | null;
  condMinBillingAmount: number | null;
  condDiscountValue: number | null;
  condMaxDiscountCap: number | null;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  branchName: string;
  panelName: string | null;
}

export interface GetActiveOfferListResponse {
  success: boolean;
  data: ActiveOfferItem[];
  total: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

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
  patientId?: number | string;
  appointmentId?: number | string;
  contactNumber: string;
  diagnosisSymptoms?: string | null;
  doctorName?: string | null;
  branchId?: number | string;
  status?: string | null;
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
  fromDate?: string;
  toDate?: string;
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

export interface CounsellorAdvanceBookingParams {
  sortBy?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number | string;
  fromDate?: string;
  toDate?: string;
}

export interface CounsellorAdvanceBookingItem {
  id: number;
  patientName: string;
  patientUhid: string;
  packageName: string;
  referringDoctor: string;
  chiefComplaint: string;
  admissionDate: string;
  createdAt: string;
  branchId: number;
}

export interface CounsellorAdvanceBookingResponse {
  success: boolean;
  data: CounsellorAdvanceBookingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CompletePatientAdmissionRoom {
  buildingId: number;
  floorId: number;
  roomId: number;
  bedId: number;
}

export interface CompletePatientAdmissionAttendant {
  name: string;
  email?: string;
  phoneNumber: string;
  relation?: string;
  gender: string;
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  age?: string;
}

export interface CompletePatientAdmissionSplit {
  method: string;
  amount: number;
  transactionId: string;
  status: string;
  remarks?: string;
}

export interface CompletePatientAdmissionRequest {
  branchId: number | string;
  appointmentId?: number;
  patientType: string;
  diseaseType: string;
  packageId: number;
  numberOfDays: number;
  offerApplied: boolean;
  offerId?: number;
  admissionType: string;
  admissionDate: string;
  specialInstructions?: string;
  originalAmount: number;
  discountAmount: number;
  netPayable: number;
  paymentMode: "completed" | "split";
  paymentMethod?: string;
  transactionId?: string;
  paymentStatus?: string;
  receivedAmount: number;
  splits?: CompletePatientAdmissionSplit[];
  room?: CompletePatientAdmissionRoom;
  attendant?: CompletePatientAdmissionAttendant;
  finalizeAdmission?: boolean;
}

export interface CompletePatientAdmissionAddress {
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
}

export interface CompletePatientAdmissionPaymentRecord {
  id?: number;
  amount: string | number;
  method: string;
  status: string;
}

export interface CompletePatientAdmissionResult {
  patientId?: number;
  patientPackageId?: number;
  invoiceId?: number;
  totalReceived?: number;
  invoiceNumber?: string;
  dueAmount?: number;
  perDayCost?: number;
  paymentId?: number;
  admissionType?: string;
  admissionDate?: string;
  firstDayPaymentStatus?: string;
  paymentRecords?: CompletePatientAdmissionPaymentRecord[];
  patientDetails?: {
    patientName?: string;
    uhid?: string;
    contactNumber?: string;
    address?: CompletePatientAdmissionAddress;
  };
}

export interface CompletePatientAdmissionResponse {
  success: boolean;
  message: string;
  data?: CompletePatientAdmissionResult;
  timestamp?: string;
  statusCode?: number;
}

export type CompletePatientAdmissionMutationArg =
  | CompletePatientAdmissionRequest
  | {
      body: CompletePatientAdmissionRequest;
      editPatientId?: number | string;
    };

export interface AdmissionDetailsPatient {
  id: number;
  uhid: string;
  name: string;
  age?: string;
  gender?: string;
  contactNumber?: string;
}

export interface AdmissionDetailsData {
  branchId: number;
  appointmentId: number;
  patientType: string;
  diseaseType: string;
  packageId: number;
  numberOfDays: number;
  offerApplied: boolean;
  offerId?: number;
  admissionType: string;
  admissionDate?: string;
  specialInstructions?: string;
  originalAmount: number;
  discountAmount: number;
  netPayable: number;
  freeDays?: number;
  totalDays?: number;
  advanceAmount?: number;
  receivedAmount?: number;
  remainingAmount?: number;
  patient: AdmissionDetailsPatient;
  room?: CompletePatientAdmissionRoom;
  attendant?: CompletePatientAdmissionAttendant;
}

export interface AdmissionDetailsResponse {
  success: boolean;
  message: string;
  data?: AdmissionDetailsData;
  timestamp?: string;
  statusCode?: number;
}

export interface RevertToOpdResponse {
  success: boolean;
  data: {
    patientId: number;
    previousType: string;
    roomFreed: string | null;
    packagesInactivated: number;
    paymentsDischarged: number;
    dueRecordsCompleted: number;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CheckFirstDayPaymentResponse {
  success: boolean;
  data: {
    patientPackageId: number;
    perDayCost: string;
    totalReceived: number;
    firstDayPaymentComplete: boolean;
    remainingForFirstDay: string;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PaymentAndAllocateRoomSplit {
  method: string;
  amount: number;
  transactionId?: string | null;
  status: string;
  remarks?: string;
}

export interface PaymentAndAllocateRoomRequest {
  patientId: number | string;
  id: number | string;
  paymentMode: "completed" | "split";
  paymentMethod?: string;
  amount?: number;
  transactionId?: string;
  paymentStatus?: string;
  splits?: PaymentAndAllocateRoomSplit[];
  room: CompletePatientAdmissionRoom;
}

export interface PaymentAndAllocateRoomResponse {
  success: boolean;
  message: string;
  data?: unknown;
  timestamp?: string;
  statusCode?: number;
}

export interface RoomListParams {
  sortBy?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
  page?: number;
  limit?: number | string;
  search?: string;
  branchId?: number | string;
  buildingId?: number | string;
  roomStatus?: string;
  floorId?: number | string;
  roomType?: string;
}

export interface RoomListItem {
  id: number;
  roomNumber: string;
  roomType: string;
  building: string | null;
  floor: string | null;
  branch: string;
  status: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  reservedBeds: number;
}

export interface RoomListResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    stats: {
      totalCapacity: number;
      totalAvailable: number;
      totalOccupied: number;
      totalReserved: number;
    };
    data: RoomListItem[];
    total: number;
    skip: number;
    limit: number;
    totalPages: number;
  };
}

export interface BedLayoutItem {
  bedId: number;
  bedNumber: string;
  status: string;
  reserved: boolean;
  available: string;
  note: string | null;
  patientName: string | null;
  patientUhid: string | null;
}

export interface RoomBedDetailResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    room: {
      id: number;
      roomNumber: string;
      roomType: string;
      floor: string | null;
      building: string | null;
      totalBeds: number;
    };
    stats: {
      totalBeds: number;
      available: number;
      occupied: number;
      reserved: number;
    };
    bedLayout: BedLayoutItem[];
  };
}

export interface GetSchedulePatientParams {
  fromDate: string;
  toDate: string;
  branchId?: number | string | null;
  search?: string;
}

export interface AppointmentItem {
  id: number;
  date: string;
  patientName: string;
  branchName: string;
  age: string;
  contactNumber: string;
  email: string;
  patientUhid: string;
  type: string;
  status: "pending" | "done" | "cancel";
  notes?: string | null;
  diagnosisSymptoms?: string | null;
}

export interface GetSchedulePatientResponse {
  success: boolean;
  data: {
    fromDate: string;
    toDate: string;
    branchId: number | string | null;
    search: string;
    appointments: AppointmentItem[];
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface UpdateSchedulePatientParams {
  patientScheduleId: number | string;
  scheduleDate?: string;
  status?: "pending" | "done" | "cancel";
  notes?: string;
}

export interface UpdateSchedulePatientResponse {
  success: boolean;
  data: string;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CounsellorDocumentItem {
  id: number;
  documentName: string;
  description?: string;
  documentType?: string;
  isMandatory?: boolean;
  isActive?: boolean | "active" | "inactive" | "Active" | "Inactive";
}

export interface CounsellorGetAllDocumentsResponse {
  success: boolean;
  data: CounsellorDocumentItem[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
}

export interface UpdateDocumentsRequest {
  patientId: number | string;
  documentIds: number[];
}

export interface UpdateDocumentsResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
  data?: unknown;
}

export interface PatientAdmissionDetailsData {
  patientId: number;
  registrationId: number;
  uhid: string;
  admissionType: string;
  admissionStatus: string;
  admissionDate: string;
  appointmentId: number;
  appointmentDate: string;
  doctorId: number;
  doctorName: string;
  patientRoomId?: number;
  bedNumber?: string;
  roomId?: number;
  roomNumber?: string;
  roomType?: string;
  buildingId?: number;
  buildingName?: string;
  floorId?: number;
  floorName?: string;
}

export interface PatientAdmissionDetailsResponse {
  success: boolean;
  data: PatientAdmissionDetailsData;
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
     * Get active offer list for start counselling
     */
    getActiveOfferList: builder.query<GetActiveOfferListResponse, GetActiveOfferListParams | void>({
      query: (params) => ({
        url: "/counsellor/get-active-offer-list",
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
     * Get counsellor advance bookings list
     */
    getAdvanceBookingList: builder.query<CounsellorAdvanceBookingResponse, CounsellorAdvanceBookingParams>({
      query: (params) => ({
        url: "/counsellor/getAdvanceBookingList",
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

    /**
     * Revert patient to OPD
     */
    revertToOpd: builder.mutation<RevertToOpdResponse, number | string>({
      query: (patientId) => ({
        url: `/counsellor/revert-to-opd/${patientId}`,
        method: "PUT",
      }),
    }),

    /**
     * Check first day payment status
     */
    checkFirstDayPayment: builder.query<CheckFirstDayPaymentResponse, number | string>({
      query: (id) => ({
        url: `/counsellor/check-first-day-payment/${id}`,
        method: "GET",
      }),
    }),

    /**
     * Get rooms list
     */
    getRoomList: builder.query<RoomListResponse, RoomListParams>({
      query: (params) => ({
        url: "/counsellor/get-room-list",
        method: "GET",
        params,
      }),
    }),

    /**
     * Get room bed details
     */
    getRoomBedDetail: builder.query<RoomBedDetailResponse, number | string>({
      query: (roomId) => ({
        url: `/counsellor/get-room-bed-detail/${roomId}`,
        method: "GET",
      }),
    }),

    /**
     * Allocate room and bed to a patient
     */
    allocateRoom: builder.mutation<any, {
      patientId: number | string;
      id: number | string; // patientPackageId
      buildingId: number | string;
      floorId: number | string;
      roomId: number | string;
      bedId: number | string;
      remark?: string;
    }>({
      query: (body) => ({
        url: "/counsellor/allocate-room",
        method: "PATCH",
        body,
      }),
    }),

    /**
     * Collect payment and allocate room (future admissions flow)
     */
    paymentAndAllocateRoom: builder.mutation<
      PaymentAndAllocateRoomResponse,
      PaymentAndAllocateRoomRequest
    >({
      query: (body) => ({
        url: "/counsellor/payment-and-allocate-room",
        method: "PATCH",
        body,
      }),
    }),

    /**
     * Get patient schedule appointments for calendar
     */
    getSchedulePatient: builder.query<GetSchedulePatientResponse, GetSchedulePatientParams>({
      query: (params) => ({
        url: "/counsellor/get-schedule-patient",
        method: "GET",
        params,
      }),
    }),

    /**
     * Update schedule appointment (Mark as complete, Reschedule, Add notes)
     */
    updateSchedulePatient: builder.mutation<UpdateSchedulePatientResponse, UpdateSchedulePatientParams>({
      query: ({ patientScheduleId, ...body }) => ({
        url: `/counsellor/update-schedule-patient/${patientScheduleId}`,
        method: "PUT",
        body,
      }),
    }),

    /**
     * Get patient details for view
     */
    getPatientDetail: builder.query<any, number | string>({
      query: (patientId) => ({
        url: `/counsellor/view-patient-detail/${patientId}`,
        method: "GET",
      }),
    }),

    /**
     * Get patient details by appointment id (start counselling referred flow)
     */
    getPatientDetailByAppointment: builder.query<any, number | string>({
      query: (appointmentId) => ({
        url: `/counsellor/view-patient-detail-by-appointment/${appointmentId}`,
        method: "GET",
      }),
    }),

    /**
     * Get advance booking detail for view
     */
    getAdvanceBookingDetail: builder.query<any, number | string>({
      query: (id) => ({
        url: `/counsellor/getAdvanceBookingDetail/${id}`,
        method: "GET",
      }),
    }),

    /**
     * Get treatment package detail
     */
    getPackageDetail: builder.query<any, number | string>({
      query: (id) => ({
        url: `/counsellor/getPackageDetail/${id}`,
        method: "GET",
      }),
    }),

    /**
     * Send admission reminder
     */
    sendReminder: builder.mutation<any, number | string>({
      query: (patientPackageId) => ({
        url: `/counsellor/send-reminder/${patientPackageId}`,
        method: "POST",
      }),
    }),

    /**
     * Get existing admission details for edit flow
     */
    getAdmissionDetails: builder.query<AdmissionDetailsResponse, number | string>({
      query: (patientId) => ({
        url: `/counsellor/get-admission-details/${patientId}`,
        method: "GET",
      }),
    }),

    /**
     * Get all documents for counsellor IPD admission step
     */
    getAllDocuments: builder.query<CounsellorGetAllDocumentsResponse, void>({
      query: () => ({
        url: "/counsellor/getAllDocuments",
        method: "GET",
      }),
      providesTags: ["Document"],
    }),

    /**
     * Get patient admission details for counsellor IPD admission step
     */
    getPatientAdmissionDetails: builder.query<
      PatientAdmissionDetailsResponse,
      number | string
    >({
      query: (patientId) => ({
        url: `/counsellor/getPatientAdmissionDetails/${patientId}`,
        method: "GET",
      }),
      providesTags: ["Document"],
    }),

    /**
     * Update patient documents (counsellor IPD admission step)
     */
    updateDocuments: builder.mutation<UpdateDocumentsResponse, UpdateDocumentsRequest>({
      query: ({ patientId, documentIds }) => ({
        url: `/counsellor/updateDocuments/${patientId}`,
        method: "PATCH",
        body: { documentIds },
      }),
      invalidatesTags: ["Document"],
    }),

      /**
     * Get all documents for counsellor IPD admission step
     */
    getAllDocumentsDetails: builder.query<CounsellorGetAllDocumentsResponse, void>({
      query: () => ({
        url: "/counsellor/getAllDocuments",
        method: "GET",
      }),
      providesTags: ["Document"],
    }),

    /**
     * Complete patient admission (counselling final step)
     */
    completePatientAdmission: builder.mutation<
      CompletePatientAdmissionResponse,
      CompletePatientAdmissionMutationArg
    >({
      query: (arg) => {
        const body = "body" in arg ? arg.body : arg;
        const editPatientId = "body" in arg ? arg.editPatientId : undefined;
        return {
          url:
            editPatientId != null
              ? `/counsellor/complete-patient-admission/${editPatientId}`
              : "/counsellor/complete-patient-admission",
          method: editPatientId != null ? "PUT" : "POST",
          body,
        };
      },
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
  patientId?: number;
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
  useGetActiveOfferListQuery,
  useGetTentativeOrArchivedListQuery,
  useGetAdvanceBookingListQuery,
  useGetFutureAdmissionsQuery,
  useGetTreatmentPackagesQuery,
  useGetPatientAdmissionsQuery,
  useRevertToOpdMutation,
  useLazyCheckFirstDayPaymentQuery,
  useGetRoomListQuery,
  useGetRoomBedDetailQuery,
  useAllocateRoomMutation,
  useGetSchedulePatientQuery,
  useLazyGetSchedulePatientQuery,
  useUpdateSchedulePatientMutation,
  useGetPatientDetailQuery,
  useLazyGetPatientDetailQuery,
  useGetPatientDetailByAppointmentQuery,
  useLazyGetPatientDetailByAppointmentQuery,
  useGetAdvanceBookingDetailQuery,
  useLazyGetAdvanceBookingDetailQuery,
  useGetPackageDetailQuery,
  useLazyGetPackageDetailQuery,
  useGetAdmissionDetailsQuery,
  useLazyGetAdmissionDetailsQuery,
  useGetAllDocumentsQuery,
  useGetPatientAdmissionDetailsQuery,
  useUpdateDocumentsMutation,
  useSendReminderMutation,
  useCompletePatientAdmissionMutation,
  usePaymentAndAllocateRoomMutation,
} = counsellorApi;

