/**
 * Registration API
 * Purpose: Registration module endpoints (e.g. Doctor list) using RTK Query
 */

import { baseApi } from "./baseApi";

export interface Doctor {
  id: number | string;
  userName: string;
  email?: string | null;
  branchId?: number | string;
  group?: {
    id: number | string;
    name: string;
  } | null;
  [key: string]: unknown;
}

export interface DoctorsResponse {
  success: boolean;
  data: Doctor[];
  message: string;
  timestamp: string;
  statusCode: number;
}

// Service interface for GetServicesByBranchAndPaymentModes
export interface Service {
  id: number | string;
  branchId: number | string;
  productId: string | null;
  name: string;
  prodcode: string;
  category: string;
  subCategory: string;
  price: string | number;
  hsnCode: string | null;
  [key: string]: unknown;
}

export interface RazorpayPosMachineUser {
  id: number | string;
  machineId: number | string;
  userId: number | string;
  createdAt: string;
  razarpayPosMachine: {
    id: number | string;
    branchId: number | string;
    status: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ServicesByBranchAndPaymentModesResponse {
  success: boolean;
  data: {
    services: Service[];
    razorpayPosMachineUsers: RazorpayPosMachineUser[];
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

// Diet list (for Vital/Medical information)
export interface DietItem {
  id: number | string;
  diet: string;
  parentId: number;
  remark?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// Response is an array of DietItem
export type DietListResponse = DietItem[];

// Diagnosis list (for Medical information)
export interface DiagnosisItem {
  id: number | string;
  name: string;
  parentId: number;
  status?: string;
  type?: string;
  sort?: number;
  [key: string]: unknown;
}

export interface DiagnosisListResponse {
  success: boolean;
  data: DiagnosisItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientEntry {
  id: number | string;
  registrationId?: number | string; // Registration ID from patient-entries API (different from id)
  title?: string;
  name?: string;
  branchId?: string;
  age?: string;
  contactNo?: string;
  patientState?: string;
  patientAddress?: string;
  opdToken?: string;
  city?: string;
  country?: string;
  registerToken?: string;
  emailAddress?: string;
  pinCode?: string;
  maritalStatus?: string;
  nationality?: string;
  aadharCardNo?: string;
  occupation?: string;
  patientType?: string;
  entryType?: string;
  createdAt?: string;
  uhid?: string | null; // UHID from patient-entries API
  userLeadId?: number; // userLeadId from patient-entries API (when entry was created from userLead)
  [key: string]: unknown;
}

export type PatientEntriesResponse = PatientEntry[] | {
  success?: boolean;
  data?: PatientEntry[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
  total?: number;
  page?: number;
  limit?: number;
};

export interface HospitalPatientRequest {
  branchId: number;
  patientEntryId?: number | string; // ID from patient-entries API
  patientTitle: string;
  patientName: string;
  contactNumber: string;
  whatsappNo: string;
  aadharCardNo?: string;
  guardianTitle: string;
  guardianName: string;
  gender: string;
  age: string;
  religion: string;
  specificReligion?: string;
  occupation: string;
  emailAddress: string;
  jsHealthCardNo?: string;
  ayushCovered?: string;
  benificiaryId?: string;
  insuranceCompany?: string;
  isReferral?: string;
  referralSourceInfo?: string;
  referralUserId?: string;
  referralName?: string;
  referralMobile?: string;
  maritalStatus: string;
  patientType?: string; // Patient Type: PRIVATE, PANEL, TPA
  panelId?: number | string;
  patientSubType?: string | null; // Patient Sub Type (e.g., "in-service")
  doctorUserId: number | string;
  userLeadId?: number; // Optional: ID from userLead when both registrations and preBookings are empty
  address: {
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
    tehsil?: string;
    area?: string;
    areaId?: number | string; // Area ID from areas API
    addressLine1?: string;
    addressLine2?: string;
  };
  payment: {
    doctorFee: number;
    paymentMode: string;
    transactionId?: string;
    serviceId?: number | string;
    razorpayPosPaymentLogId?: number | string;
    gstNumber?: string;
    companyName?: string;
    billingAddress?: string;
    state?: string;
    city?: string;
    pincode?: number | string;
  };
  appointment: {
    token?: string;
    appointmentDate: string;
    timeSlot: string;
    doctorUserId: number | string;
    isPreBooking: boolean;
    preBookingId?: number | string | null;
  };
}

export interface HospitalPatientResponse {
  success: boolean;
  data?: unknown;
  message: string;
  timestamp?: string;
  statusCode: number;
}

// Clinic Patient Request (for clinic/hospital registration with all 4 steps)
export interface ClinicPatientRequest {
  branchId: number;
  patientEntryId?: number | string;
  patientTitle: string;
  patientName: string;
  contactNumber: string;
  whatsappNo: string;
  aadharCardNo?: string;
  guardianTitle: string;
  guardianName: string;
  gender: string;
  age: string;
  religion: string;
  specificRelegion?: string; // Note: API uses "Relegion" (typo in API)
  occupation: string;
  emailAddress?: string;
  jsHealthCardNo?: string;
  ayushCovered?: string;
  benificiaryId?: string; // Note: API uses "benificiaryId" (typo in API)
  insuranceCompany?: string;
  isReferral?: string;
  referralSourceInfo?: string;
  referralUserId?: number | string;
  referralName?: string;
  referralMobile?: string;
  maritalStatus: string;
  doctorUserId: number | string;
  patientType: string;
  panelId?: number | string;
  userLeadId?: number | string | null; // string also From registrations-and-pre-bookings userLead – sent in clinic-patient POST when flow is User Lead Data
  patientSubType?: string | null; // Patient Sub Type (e.g., "in-service")
  addictionType?: string[]; // Array of addiction types: ["alcohol", "smoking", "tobacco", "drugs", "others"]
  addictionSpecify?: string; // Specify addiction details if "others" is selected
  appointment: {
    isPreBooked?: boolean;
    appointmentDate: string;
    timeSlot: string;
    doctorUserId: number | string;
    bloodPressure?: string;
    sugarLevel?: string;
    temperature?: string;
    spo2?: string;
    pulse?: string;
    diagnosisId?: number | string;
    subDiagnosisId?: number | string;
    diagnosisSymptoms?: string;
    doctorFee?: string | number;
    isPreBooking?: boolean;
    isDoctorChecked?: boolean;
    isDiabetes?: boolean;
    diabetesRemarks?: string;
    isHypertension?: boolean;
    hypertensionRemarks?: string;
    isCad?: boolean;
    cadRemarks?: string;
    isThyroid?: boolean;
    thyroidRemarks?: string;
    isMenstrual?: boolean;
    menstrualRemarks?: string;
    preBookingId?: number | string;
    // lastDayFullDiet?: string;
    // dietType?: string;
    // height?: string;
    // weight?: string;
    // bloodGroup?: string;
  };
  payment: {
    doctorFee: number;
    paymentMode: string;
    transactionId?: string;
    serviceId?: number | string;
    razorpayPosPaymentLogId?: number | string;
    gstNumber?: string;
    companyName?: string;
    billingAddress?: string;
    state?: string;
    city?: string;
    pincode?: number | string;
  };
  address: {
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
    tehsil?: string;
    area?: string;
    areaId?: number | string; // Area ID from areas API
    addressLine1?: string;
    addressLine2?: string;
  };
}

export interface ClinicPatientResponse {
  success: boolean;
  data?: unknown;
  message: string;
  timestamp?: string;
  statusCode: number;
}

// Create Appointment And Update Registration Request (for existing patients with UHID)
export interface CreateAppointmentAndUpdateRegistrationRequest {
  branchId: number;
  patientEntryId?: number; // Patient entry ID (e.g., 243) - optional, not sent for "Already Exist Patient" dialog
  registrationId: number; // Registration ID (e.g., 157)
  uhid: string;
  facilityType: "hospital" | "clinic";
  registration: {
    patientTitle: string;
    patientName: string;
    contactNumber: string;
    whatsappNo: string;
    aadharCardNo?: string;
    guardianTitle: string;
    guardianName: string;
    gender: string;
    age: string;
    religion: string;
    specificRelegion?: string;
    occupation: string;
    emailAddress?: string;
    jsHealthCardNo?: string;
    ayushCovered?: string;
    benificiaryId?: string;
    insuranceCompany?: string;
    isReferral?: string;
    referralSourceInfo?: string;
    referralUserId?: number;
    referralName?: string;
    referralMobile?: string;
    maritalStatus: string;
    doctorUserId: number;
    patientType: string;
    addictionSpecify?: string;
    addictionType?: string[];
  };
  address: {
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
    tehsil?: string;
    area?: string;
    areaId?: number | string; // Area ID from areas API
    addressLine1?: string;
    addressLine2?: string;
  };
  appointment: {
    isPreBooking: boolean;
    preBookingId?: number;
    appointmentDate: string;
    timeSlot: string;
    doctorUserId: number;
    bloodPressure?: string;
    sugarLevel?: string;
    temperature?: string;
    spo2?: string;
    pulse?: string;
    diagnosisId?: number;
    diagnosisSymptoms?: string;
    doctorFee?: string;
    subDiagnosisId?: number;
    isDoctorChecked: boolean;
    isDiabetes?: boolean;
    diabetesRemarks?: string;
    isHypertension?: boolean;
    hypertensionRemarks?: string;
    isCad?: boolean;
    cadRemarks?: string;
    isThyroid?: boolean;
    thyroidRemarks?: string;
    isMenstrual?: boolean;
    menstrualRemarks?: string;
    isPreBooked?: boolean;
    token?: string;
  };
  payment: {
    doctorFee: number;
    serviceId?: number;
    paymentMode: string;
    razorpayPosPaymentLogId?: number;
    transactionId?: string;
    companyName?: string;
    billingAddress?: string;
    state?: string;
    city?: string;
    pincode?: number;
  };
}

export interface CreateAppointmentAndUpdateRegistrationResponse {
  success: boolean;
  data?: unknown;
  message: string;
  timestamp?: string;
  statusCode: number;
}

export interface AppointmentRegistration {
  id: number | string;
  uhid?: string;
  branchId?: number | string;
  registrationId?: number | string;
  panelId?: number | string | null;
  doctorUserId?: number | string;
  diagnosisId?: number | string | null;
  doctorFee?: number | string | null;
  appointmentDate?: string;
  timeSlot?: string;
  bloodPressure?: string | number | null;
  sugarLevel?: string | number | null;
  temperature?: string | number | null;
  remark?: string | null;
  status?: string;
  isPreBooking?: boolean;
  patientIpdId?: number | string | null;
  token?: string | null;
  preBookingStatus?: string | null;
  pbConfirmDate?: string | null;
  isDoctorChecked?: boolean;
  isVitalMedicalAdded?: boolean;
  doctorConfirmTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  registration?: {
    id?: number | string;
    uhid?: string;
    patient?: string; // Keep for backward compatibility
    patientName?: string;
    patientTitle?: string | null;
    gender?: string;
    age?: string;
    contactNumber?: string;
    emailAddress?: string;
  };
  diagnosis?: {
    id?: number | string;
    name?: string;
  } | null;
  doctor?: {
    id?: number | string;
    userName?: string;
    name?: string; // Keep for backward compatibility
    email?: string;
    code?: string; // Keep for backward compatibility
    group?: {
      id: number | string;
      name: string;
    } | null;
  } | null;
  [key: string]: unknown;
}

export interface AppointmentsListResponse {
  success: boolean;
  data: AppointmentRegistration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PreBookingItem {
  id: number | string;
  uhid?: string | null;
  branchId?: number | string;
  patientName?: string;
  doctorUserId?: number | string;
  guardianName?: string;
  gender?: string;
  age?: string;
  contactNumber?: string;
  emailAddress?: string;
  pinCode?: string;
  address?: string;
  areaId?: number | string;
  area?: string;
  tehsil?: string;
  city?: string;
  state?: string;
  country?: string;
  maritalStatus?: string;
  addiction?: string; // JSON string array like "[\"Smoking\",\"Alcohol\"]"
  patientType?: string;
  patientSubType?: string;
  benificiaryId?: string;
  insuranceCompany?: string;
  ayushCovered?: string;
  allergies?: string;
  surgeries?: string;
  dietType?: string;
  height?: string;
  weight?: string;
  diagnosis?: string;
  subDiagnosis?: string;
  remark?: string;
  bookingType?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timeSlot?: string; // Keep for backward compatibility
  status?: string;
  whatsappNumber?: string | null;
  alternateNumber?: string | null;
  bloodGroup?: string;
  occupation?: string;
  consultationFee?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PreBookingsListResponse {
  success: boolean;
  data: {
    preBookings: PreBookingItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

// Patient Registration Details (for view page)
export interface PatientRegistrationDetails {
  id: number;
  sUhid?: string | null;
  uhid: string;
  branchId: number;
  patientName: string;
  patientTitle?: string | null;
  doctorUserId?: number | null;
  panelId?: number | null;
  gender?: string;
  age?: string;
  contactNumber?: string;
  whatsappNo?: string;
  emailAddress?: string;
  maritalStatus?: string;
  aadharCardNo?: string;
  occupation?: string;
  height?: string | null;
  weight?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  surgeries?: string | null;
  dietType?: string | null;
  lastDayFullDiet?: string | null;
  guardianName?: string;
  guardianTitle?: string;
  addictionType?: string[] | null;
  addictionSpecify?: string | null;
  patientType?: string;
  patientSubType?: string | null;
  benificiaryId?: string | null;
  schemeType?: string;
  insuranceCompany?: string | null;
  ayushCovered?: string | null;
  remark?: string | null;
  status?: string;
  addedBy?: number | null;
  referralClinic?: string | null;
  isReferral?: boolean;
  referralSourceInfo?: string | null;
  referralUserId?: number | null;
  referralName?: string | null;
  referralMobile?: string | null;
  religion?: string;
  specificReligion?: string | null;
  jsHealthCardNo?: string | null;
  symptoms?: string | null;
  problems?: string | null;
  diagnosis?: string | null;
  subDiagnosis?: string | null;
  gstNumber?: string | null;
  fileCharges?: string | null;
  saleforceRegistrationid?: string | null;
  apiSource?: string | null;
  saleforceCrone?: string;
  sourceUuid?: string | null;
  source?: string | null;
  agentId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  address?: {
    id: number;
    address: string;
    city: string;
    pinCode: string;
    state: string;
    country: string;
    tehsil?: string;
    area?: string;
    addressableType?: string;
    addressableId?: number;
    addressType?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  // Appointment related fields (if available)
  appointment?: {
    id?: number;
    appointmentDate?: string;
    timeSlot?: string;
    doctor?: {
      id?: number;
      userName?: string;
      name?: string;
    };
  };
  // Payment related fields (if available)
  payment?: {
    doctorFee?: number | string;
    paymentMode?: string;
    transactionId?: string;
    gstNumber?: string;
    companyName?: string;
    billingAddress?: string;
    state?: string;
    city?: string;
    pincode?: string;
  };
  // Medical fields (from appointments or registration)
  bloodPressure?: string | null;
  sugarLevel?: string | null;
  temperature?: string | null;
  pulse?: string | null;
  spo2?: string | null;
  isDiabetes?: boolean | null;
  diabetesRemarks?: string | null;
  isHypertension?: boolean | null;
  hypertensionRemarks?: string | null;
  isCad?: boolean | null;
  cadRemarks?: string | null;
  isThyroid?: boolean | null;
  thyroidRemarks?: string | null;
  isMenstrual?: boolean | null;
  menstrualRemarks?: string | null;
  [key: string]: unknown;
}

export interface PatientRegistrationDetailsResponse {
  success: boolean;
  data: PatientRegistrationDetails;
  message: string;
  timestamp: string;
  statusCode: number;
}

// Appointment with Registration Response (for view page using appointmentId)
export interface AppointmentWithRegistration {
  id: number;
  uhid: string;
  branchId: number;
  registrationId: number;
  panelId?: number | null;
  doctorUserId: number;
  diagnosisId?: number | null;
  subDiagnosisId?: number | null;
  doctorFee?: string | number;
  appointmentDate?: string;
  timeSlot?: string;
  bloodPressure?: string | null;
  sugarLevel?: string | number | null;
  temperature?: string | number | null;
  spo2?: string | null;
  pulse?: string | null;
  diagnosisSymptoms?: string | null;
  remark?: string | null;
  status?: string;
  isPreBooking?: boolean;
  patientIpdId?: number | string | null;
  token?: string | null;
  preBookingStatus?: string | null;
  pbConfirmDate?: string | null;
  isDoctorChecked?: boolean;
  doctorConfirmTime?: string | null;
  isDiabetes?: boolean;
  diabetesRemarks?: string;
  isHypertension?: boolean;
  hypertensionRemarks?: string;
  isCad?: boolean;
  cadRemarks?: string;
  isThyroid?: boolean;
  thyroidRemarks?: string;
  isMenstrual?: boolean;
  menstrualRemarks?: string;
  isVitalMedicalAdded?: boolean;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: number | string | null;
  createdBy?: number | string | null;
  registration?: PatientRegistrationDetails;
  diagnosis?: {
    id: number;
    name: string;
    parentId?: number;
    status?: string;
    type?: string;
    sort?: number | null;
  } | null;
  subDiagnosis?: {
    id: number;
    name: string;
  } | null;
  doctor?: {
    id: number;
    userName?: string;
    email?: string;
  } | null;
  [key: string]: unknown;
}

export interface AppointmentWithRegistrationResponse {
  success: boolean;
  data: AppointmentWithRegistration;
  message: string;
  timestamp: string;
  statusCode: number;
}

export const registrationApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Get list of doctors for a branch
     * Uses static branchId = 1 as requested.
     */
    getDoctors: builder.query<DoctorsResponse, void>({
      query: () => ({
        url: "/admin/registration/users-list?branchId=1",
        method: "GET",
      }),
      // If you want cache invalidation later, you can add tags like:
      // providesTags: ["Registration"],
    }),
    /**
     * Get services by branch and payment modes
     */
    getServicesByBranchAndPaymentModes: builder.query<
      ServicesByBranchAndPaymentModesResponse,
      { branchId: number | string; subCategory: string; userId: number | string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams({
          branchId: String(params.branchId),
          subCategory: params.subCategory,
          userId: String(params.userId),
        });
        return {
          url: `/admin/registration/GetServicesByBranchAndPaymentModes?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Get list of diet types for Vitals/Medical information
     * Returns an array of diet items
     */
    getDietList: builder.query<DietListResponse, void>({
      query: () => ({
        url: "/admin/registration/diet-list",
        method: "GET",
      }),
    }),
    /**
     * Get list of patient entries (tokens) for a branch
     */
    getPatientEntries: builder.query<
      PatientEntriesResponse,
      { branchId?: number | string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => {
        const { branchId = 1, search = "", page = 1, limit = 100 } = params;
        const queryParams = new URLSearchParams({
          branchId: String(branchId),
          search: String(search),
          page: String(page),
          limit: String(limit),
        });
        return {
          url: `/admin/registration/patient-entries?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Check for existing patients by phone number or UHID
     * Used in registration forms to check if patient already exists
     */
    checkExistingPatientsByPhone: builder.query<
      {
        success: boolean;
        data: {
          registrations: Array<{
            id: number;
            sUhid?: string | null;
            uhid: string;
            branchId: number;
            patientName: string;
            patientTitle?: string;
            doctorUserId?: number;
            gender?: string;
            age?: string;
            contactNumber: string;
            whatsappNo?: string;
            emailAddress?: string;
            maritalStatus?: string;
            aadharCardNo?: string;
            address?: {
              id: number;
              address: string;
              city: string;
              pinCode: string;
              state: string;
              country: string;
              addressableType?: string;
              addressableId?: number;
              addressType?: string;
              isActive?: boolean;
              createdAt?: string;
              updatedAt?: string;
              [key: string]: unknown;
            };
            [key: string]: unknown;
          }>;
          preBookings: PreBookingItem[];
          userLead?: {
            id: number;
            branchId: number;
            patientName: string;
            parentPrefix?: string;
            parentName?: string;
            gender?: string;
            age?: string;
            contactNumber?: string;
            alternateNumber?: string | null;
            pinCode?: string;
            address?: string | null;
            areaId?: number;
            area?: string;
            tehsil?: string | null;
            city?: string;
            state?: string;
            country?: string;
            appointmentState?: string;
            patientType?: string;
            patientSubType?: string | null;
            benificiaryId?: string | null;
            diagnosis?: string | null;
            appointmentDate?: string | null;
            sourceOfReference?: string | null;
            remark?: string | null;
            status?: string;
            confirmBranchId?: number | null;
            uhid?: string | null;
            confirmDate?: string | null;
            treatmentStart?: string;
            addedBy?: number | null;
            addedByDoctorOrChamp?: string | null;
            managerId?: number | null;
            createdBy?: number | null;
            createdAt?: string;
            updatedAt?: string;
            [key: string]: unknown;
          } | null;
        };
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { branchId: number; phoneNumber?: string; uhid?: string; aadharCardNo?: string }
    >({
      query: (params) => {
        const { branchId, phoneNumber, uhid, aadharCardNo } = params;
        const queryParams = new URLSearchParams({
          branchId: branchId.toString(),
        });
        if (phoneNumber) {
          queryParams.append("phoneNumber", phoneNumber);
        }
        if (uhid) {
          queryParams.append("uhid", uhid);
        }
        if (aadharCardNo) {
          queryParams.append("aadharCardNo", aadharCardNo);
        }
        return {
          url: `/admin/registration/registrations-and-pre-bookings?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Get single patient entry by ID
     */
    getPatientEntryById: builder.query<
      {
        success: boolean;
        data: PatientEntry;
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { entryId: number | string; branchId?: number | string }
    >({
      query: (params) => {
        const { entryId, branchId = 1 } = params;
        const queryParams = new URLSearchParams({
          branchId: String(branchId),
        });
        return {
          url: `/admin/registration/patient-entries/${entryId}?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Create hospital patient registration
     */
    createHospitalPatient: builder.mutation<HospitalPatientResponse, HospitalPatientRequest>({
      query: (data) => ({
        url: "/admin/registration/hospital-patient",
        method: "POST",
        body: data,
      }),
    }),
    /**
     * Get list of appointments for registration list
     */
    getAppointmentsList: builder.query<
      AppointmentsListResponse,
      {
        branchId?: number | string;
        search?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "ASC" | "DESC";
        fromDate?: string;
        toDate?: string;
      }
    >({
      query: (params) => {
        const { branchId = 1, search = "", page = 1, limit = 20, sortBy, sortOrder, fromDate = "", toDate = "" } = params;
        const queryParams = new URLSearchParams({
          branchId: String(branchId),
          search: String(search),
          page: String(page),
          limit: String(limit),
        });
        if (sortBy) {
          queryParams.append("sortBy", sortBy);
        }
        if (sortOrder) {
          queryParams.append("sortOrder", sortOrder);
        }
        if (fromDate) {
          queryParams.append("fromDate", fromDate);
        }
        if (toDate) {
          queryParams.append("toDate", toDate);
        }
        return {
          url: `/admin/registration/appointments-list?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Get Diagnosis list for doctors
     */
    getDiagnosisList: builder.query<DiagnosisListResponse, string | void>({
      query: (type = "doctor") => ({
        url: `/admin/registration/diagnosis-list?type=${type}`,
        method: "GET",
      }),
    }),
    /**
     * Get single appointment by ID
     */
    getAppointmentById: builder.query<
      {
        success: boolean;
        data: AppointmentRegistration;
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { appointmentId: number | string; branchId?: number | string }
    >({
      query: (params) => {
        const { appointmentId, branchId = 1 } = params;
        const queryParams = new URLSearchParams({
          branchId: String(branchId),
        });
        return {
          url: `/admin/registration/appointments/${appointmentId}?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Update doctor for an appointment
     */
    updateAppointmentDoctor: builder.mutation<
      {
        success: boolean;
        data?: unknown;
        message: string;
        timestamp?: string;
        statusCode: number;
      },
      { appointmentId: number | string; doctorUserId: number | string }
    >({
      query: (params) => {
        const { appointmentId, doctorUserId } = params;
        return {
          url: `/admin/registration/appointments/${appointmentId}/doctor`,
          method: "PATCH",
          body: { doctorUserId },
        };
      },
    }),
    /**
     * Update appointment with vitals and medical information
     */
    updateAppointmentVitalsMedical: builder.mutation<
      {
        success: boolean;
        data?: unknown;
        message: string;
        timestamp?: string;
        statusCode: number;
      },
      {
        appointmentId: number | string;
        registrationId: number | string;
        updatedBy: number | string;
        // Medical fields (top level)
        isCad?: boolean;
        cadRemarks?: string;
        isDiabetes?: boolean;
        diabetesRemarks?: string;
        isHypertension?: boolean;
        hypertensionRemarks?: string;
        isMenstrual?: boolean;
        menstrualRemarks?: string;
        isThyroid?: boolean;
        thyroidRemarks?: string;
        // Vitals fields (top level)
        spo2?: string;
        pulse?: string;
        temperature?: string;
        sugarLevel?: string;
        remark?: string;
        diagnosisId?: number | string | null;
        subDiagnosesId?: number | null;
        bloodPressure?: string;
        // Registration object
        registration?: {
          addictionType?: string[];
          addictionSpecify?: string;
          height?: string;
          weight?: string;
          bloodGroup?: string;
          allergies?: string;
          surgeries?: string;
          dietType?: string;
          lastDayFullDiet?: string;
          updatedBy?: number | string;
        };
      }
    >({
      query: (params) => {
        const { appointmentId, ...body } = params;
        return {
          url: `/admin/registration/appointments/${appointmentId}`,
          method: "PATCH",
          body,
        };
      },
    }),
    /**
     * Create clinic patient registration (4-step registration)
     */
    createClinicPatient: builder.mutation<ClinicPatientResponse, ClinicPatientRequest>({
      query: (data) => ({
        url: "/admin/registration/clinic-patient",
        method: "POST",
        body: data,
      }),
    }),
    /**
     * Request duplicate number permission
     */
    requestDuplicateNumberPermission: builder.mutation<
      { success: boolean; message?: string; data?: unknown },
      {
        branchId: number;
        contactNo: string;
        patientName: string;
        relationship: string;
        requestedBy: number;
      }
    >({
      query: (payload) => ({
        url: "/admin/settings/duplicate-number-permission",
        method: "POST",
        body: payload,
      }),
    }),
    /**
     * Get list of pre-bookings
     */
    getPreBookingsList: builder.query<
      PreBookingsListResponse,
      {
        branchId?: number | string;
        page?: number;
        limit?: number;
        search?: string;
        fromDate?: string;
        toDate?: string;
        dateFilter?: "present" | "past" | "future" | "";
      }
    >({
      query: (params) => {
        const {
          branchId = 1,
          page = 1,
          limit = 25,
          search = "",
          fromDate = "",
          toDate = "",
          dateFilter = "present",
        } = params;
        const queryParams = new URLSearchParams({
          branchId: String(branchId),
          page: String(page),
          limit: String(limit),
          search: String(search),
          fromDate: String(fromDate),
          toDate: String(toDate),
        });
        // Only add dateFilter if it's not empty
        if (dateFilter && dateFilter.trim() !== "") {
          queryParams.append("dateFilter", String(dateFilter));
        }
        return {
          url: `/admin/registration/pre-bookings-list?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Get patient registration details by ID
     */
    getPatientRegistrationDetails: builder.query<
      PatientRegistrationDetailsResponse,
      { registrationId: number | string }
    >({
      query: (params) => {
        const { registrationId } = params;
        return {
          url: `/admin/registration/patient-registration-details/${registrationId}`,
          method: "GET",
        };
      },
    }),
    /**
     * Update patient registration details (Personal Information and Address Information only)
     */
    updatePatientRegistrationDetails: builder.mutation<
      {
        success: boolean;
        data?: unknown;
        message: string;
        timestamp?: string;
        statusCode: number;
      },
      {
        registrationId: number | string;
        // Personal Information fields
        patientTitle?: string;
        patientName?: string;
        guardianTitle?: string;
        guardianName?: string;
        gender?: string;
        age?: string;
        maritalStatus?: string;
        religion?: string;
        specificReligion?: string;
        occupation?: string;
        emailAddress?: string;
        whatsappNo?: string;
        aadharCardNo?: string;
        // Address Information (sent as address object with all fields plus addressId)
        address?: {
          address?: string;
          city?: string;
          pinCode?: string;
          state?: string;
          country?: string;
          tehsil?: string;
          area?: string;
          areaId?: number | string; // Area ID from areas API
          addressLine1?: string;
          addressLine2?: string;
          addressId?: number | string;
        };
      }
    >({
      query: (params) => {
        const { registrationId, address, ...personalInfo } = params;
        const payload: any = { ...personalInfo };
        if (address) {
          payload.address = address;
        }
        return {
          url: `/admin/registration/patient-registration-details/${registrationId}`,
          method: "PATCH",
          body: payload,
        };
      },
    }),
    /**
     * Update patient contact number
     */
    updatePatientContactNumber: builder.mutation<
      {
        success: boolean;
        data?: unknown;
        message: string;
        timestamp?: string;
        statusCode: number;
      },
      {
        registrationId: string | number;
        patientName: string;
        oldContactNo: string;
        newContactNo: string;
        requestedBy: number;
        branchId: number;
        remarks?: string;
      }
    >({
      query: (params) => {
        return {
          url: `admin/settings/contact-change-request`,
          method: "POST",
          body: {
            registrationId: params.registrationId,
            patientName: params.patientName,
            oldContactNo: params.oldContactNo,
            newContactNo: params.newContactNo,
            requestedBy: params.requestedBy,
            branchId: params.branchId,
            remarks: params.remarks || undefined,
          },
        };
      },
    }),
    /**
     * Get appointment with registration details by appointmentId
     */
    getAppointmentWithRegistration: builder.query<
      AppointmentWithRegistrationResponse,
      { appointmentId: number | string }
    >({
      query: (params) => {
        const { appointmentId } = params;
        return {
          url: `/admin/registration/appointment-with-registration/${appointmentId}`,
          method: "GET",
        };
      },
    }),
    /**
     * Check if phone number exists in registration
     */
    checkPhoneNumber: builder.query<
      {
        success: boolean;
        data: {
          exists: boolean;
          registration?: {
            id: number;
            patientName: string;
          };
        };
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { phoneNumber: string }
    >({
      query: (params) => {
        const { phoneNumber } = params;
        const queryParams = new URLSearchParams({
          phoneNumber: phoneNumber,
        });
        return {
          url: `/admin/registration/check-phone-number?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Create Razorpay POS payment initiation
     */
    createRazorpayPosPaymentInitiation: builder.mutation<
      {
        success: boolean;
        data: {
          p2pRequestId: string;
          success: boolean;
          amount: number;
          terminalId: string;
          paymentMethod: string;
          mode: string;
          messageCode: string | null;
          message: string | null;
          rawResponse: unknown;
          patientUhid: string;
        };
        message: string;
        timestamp: string;
        statusCode: number;
      },
      {
        razorpayPosMachineId: string;
        amount: number;
        paymentMethod: string;
        customerMobile: string;
        patientUhid: string;
        patientType: string;
        description: string;
      }
    >({
      query: (params) => {
        return {
          url: `/admin/registration/CreateRazorpayPosPaymentInitiation`,
          method: "POST",
          body: params,
        };
      },
    }),
    getRazorpayPosPaymentStatusPolling: builder.query<
      {
        success: boolean;
        data: unknown;
        message: string;
        timestamp: string;
        statusCode: number;
      },
      {
        p2pRequestId: string;
      }
    >({
      query: (params) => {
        const { p2pRequestId } = params;
        return {
          url: `/admin/registration/CheckRazorpayPosPaymentStatusPolling/${p2pRequestId}`,
          method: "POST",
          body: {
            interval: 3000,
            maxAttempts: 50,
          },
        };
      },
    }),
    cancelRazorpayPosPayment: builder.mutation<
      {
        success: boolean;
        data: unknown;
        message: string;
        timestamp: string;
        statusCode: number;
      },
      {
        p2pRequestId: string;
        razorpayPosMachineId: number | string;
      }
    >({
      query: (params) => {
        const { p2pRequestId, razorpayPosMachineId } = params;
        return {
          url: `/admin/registration/CancelRazorpayPosPayment/${p2pRequestId}`,
          method: "POST",
          body: {
            razorpayPosMachineId,
          },
        };
      },
    }),
    /**
     * Create Appointment And Update Registration (for existing patients with UHID)
     */
    createAppointmentAndUpdateRegistration: builder.mutation<
      CreateAppointmentAndUpdateRegistrationResponse,
      CreateAppointmentAndUpdateRegistrationRequest
    >({
      query: (data) => ({
        url: "/admin/registration/CreateAppointmentAndUpdateRegistration",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { 
  useGetDoctorsQuery, 
  useLazyGetDoctorsQuery,
  useGetServicesByBranchAndPaymentModesQuery,
  useLazyGetServicesByBranchAndPaymentModesQuery,
  useGetDietListQuery,
  useGetPatientEntriesQuery,
  useLazyGetPatientEntriesQuery,
  useGetPatientEntryByIdQuery,
  useLazyGetPatientEntryByIdQuery,
  useCreateHospitalPatientMutation,
  useCreateClinicPatientMutation,
  useGetAppointmentsListQuery,
  useLazyGetAppointmentsListQuery,
  useGetAppointmentByIdQuery,
  useLazyGetAppointmentByIdQuery,
  useUpdateAppointmentDoctorMutation,
  useUpdateAppointmentVitalsMedicalMutation,
  useGetDiagnosisListQuery,
  useLazyCheckExistingPatientsByPhoneQuery,
  useRequestDuplicateNumberPermissionMutation,
  useGetPreBookingsListQuery,
  useLazyGetPreBookingsListQuery,
  useGetPatientRegistrationDetailsQuery,
  useLazyGetPatientRegistrationDetailsQuery,
  useUpdatePatientRegistrationDetailsMutation,
  useUpdatePatientContactNumberMutation,
  useGetAppointmentWithRegistrationQuery,
  useLazyGetAppointmentWithRegistrationQuery,
  useLazyCheckPhoneNumberQuery,
  useCreateRazorpayPosPaymentInitiationMutation,
  useLazyGetRazorpayPosPaymentStatusPollingQuery,
  useCancelRazorpayPosPaymentMutation,
  useCreateAppointmentAndUpdateRegistrationMutation
} = registrationApi;


