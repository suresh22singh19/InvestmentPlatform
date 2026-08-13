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
  floor?:string
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
  key?:string;
}

export interface RoomTypeDropdownResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: RoomTypeDropdownItem[];
}

export interface UserDropdownItem {
  id: number;
  name: string;
  empId: string;
  roleCategoryType: string;
  branchId: number;
}

export interface UserDropdownResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
  data: UserDropdownItem[];
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
    getUserDropdownList: builder.query<UserDropdownResponse, DropdownParams | void>({
      query: (params) => ({
        url: "/common/getUserDropdownList",
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
    getPatientHealthCardByUhid: builder.query<
      PatientHealthCardResponse,
      { uhid: string }
    >({
      query: (params) => ({
        url: `/common/getPatientHealthCardByUhid?uhid=${encodeURIComponent(params.uhid)}`,
        method: "GET",
      }),
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
    getAllMedicineByBranchList: builder.query<GetAllMedicineResponse, GetAllMedicineParams>({
      query: (params) => ({
        url: "/common/GetAllMedicineByBranchList",
        method: "GET",
        params: {
          branchId: params.branchId,
          search: params.search || "",
        },
      }),
    }),
    getPatientWalletData: builder.query<getPatientWalletDataResponse, getPatientWalletParams | void>({
      query: (params) => ({
        url: "/common/GetPatientWalletData",
        method: "GET",
        params: params
          ? {
              uhid: params.uhid,
            }
          : undefined,
      }),
    }),
    getAdmittedPatientMedicalDetailsByPatientId: builder.query<GetAdmittedPatientMedicalDetailsResponse, { patientId: number | string }>({
      query: (params) => ({
        url: "/common/getAdmittedPatientMedicalDetailsByPatientId",
        method: "GET",
        params: {
          patientId: params.patientId,
        },
      }),
    }),
    getIpdPatienRoomAndDoctorDetails: builder.query<GetIpdPatienRoomAndDoctorDetailsResponse, { patientId: number | string }>({
      query: (params) => ({
        url: "/common/getIpdPatienRoomAndDoctorDetails",
        method: "GET",
        params: {
          patientId: params.patientId,
        },
      }),
    }),
    getAdmittedPatientTherapiesByPatientId: builder.query<GetAdmittedPatientTherapiesResponse, { patientId: number | string }>({
      query: (params) => ({
        url: "/common/GetAdmittedPatientTherapiesByPatientId",
        method: "GET",
        params: {
          patientId: params.patientId,
        },
      }),
    }),
  }),
});

export interface MedicalDetailsData {
  patientId?: number;
  isDiabetes?: boolean;
  diabetesRemarks?: string;
  isHypertension?: boolean;
  hypertensionRemarks?: string;
  isCad?: boolean;
  cadRemarks?: string;
  isThyroid?: boolean;
  thyroidRemarks?: string;
  addictionType?: string[];
  addictionSpecify?: string;
  diagnosisId?: number;
  diagnosis?: {
    id: number;
    name: string;
  } | string;
  subDiagnosisId?: number;
  subDiagnosis?: {
    id: number;
    name: string;
  } | string;
  diagnosisSymptoms?: string;
}

export interface GetAdmittedPatientMedicalDetailsResponse {
  success: boolean;
  message?: string;
  data?: MedicalDetailsData;
}

export interface RoomAndDoctorDetailsData {
  patientId?: number;
  opdDoctorId?: number;
  opdDoctorName?: string;
  ipdDoctorId?: number;
  ipdDoctorName?: string;
  buildingName?: string;
  floorName?: string;
  roomType?: string;
  roomNumber?: string;
  bedNumber?: string;
}

export interface GetIpdPatienRoomAndDoctorDetailsResponse {
  success?: boolean;
  message?: string;
  data?: RoomAndDoctorDetailsData;
  patientId?: number;
  opdDoctorId?: number;
  opdDoctorName?: string;
  ipdDoctorId?: number;
  ipdDoctorName?: string;
  buildingName?: string;
  floorName?: string;
  roomType?: string;
  roomNumber?: string;
  bedNumber?: string;
}

export interface MedicineItem {
  id: number;
  jatayuCd: string;
  branchId: number;
  name: string;
  category: string;
  quantity: number;
  remainingQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetAllMedicineResponse {
  success: boolean;
  data: MedicineItem[];
}

export interface getPatientWalletParams {
  uhid: string;
}

export interface getPatientWalletDataResponse {
  success: boolean;
  message?: string;
  statusCode?: number;
  data: {
    id?: string | number;
    uhid: string;
    branchId: number;
    walletExists?: boolean;
    currentBalance?: string | number;
    availableBalance?: string | number;
    holdAmount?: string | number;
    totalCredit?: string | number;
    totalDebit?: string | number;
    totalDeposits?: number;
    totalWithdrawals?: number;
    packageName?: string | null;
    packageAmount?: number | null;
    discount?: number | string | null;
    expireDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface PatientHealthCardDetails {
  cardNumber: string;
  arogyaCardId: number;
  cardName: string;
  image: string;
}

export interface PatientHealthCardResponse {
  success: boolean;
  data: PatientHealthCardDetails | null;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetAllMedicineParams {
  branchId: number | string;
  search?: string;
}

export interface AdmittedPatientTherapyItem {
  sessionId?: number;
  therapyId?: number;
  therapyName?: string;
  therapyDate?: string;
  therapistRemark?: string | null;
  therapistId?: number;
  therapistName?: string;
  status?: string;
  doctorId?: number;
  doctorName?: string;
}

export interface GetAdmittedPatientTherapiesResponse {
  success?: boolean;
  status?: number;
  message?: string;
  data?: AdmittedPatientTherapyItem[];
}

export const {
  useGetBuildingDropdownQuery,
  useGetFloorDropdownQuery,
  useGetDoctorDropdownQuery,
  useGetRoomTypeDropdownQuery,
  useGetUserDropdownListQuery,
  useGetPresignedUrlQuery,
  useLazyGetPresignedUrlQuery,
  useGetPatientFilesQuery,
  useLazyGetPatientFilesQuery,
  useGetAllMedicineByBranchListQuery,
  useLazyGetAllMedicineByBranchListQuery,
  useGetPatientWalletDataQuery,
  useLazyGetPatientWalletDataQuery,
  useGetAdmittedPatientMedicalDetailsByPatientIdQuery,
  useLazyGetAdmittedPatientMedicalDetailsByPatientIdQuery,
  useGetIpdPatienRoomAndDoctorDetailsQuery,
  useLazyGetIpdPatienRoomAndDoctorDetailsQuery,
  useGetPatientHealthCardByUhidQuery,
  useLazyGetPatientHealthCardByUhidQuery,
  useGetAdmittedPatientTherapiesByPatientIdQuery,
  useLazyGetAdmittedPatientTherapiesByPatientIdQuery,
} = commonApi;
