/**
 * Gate API
 * Purpose: Gate module endpoints for patient entry and management
 */

import { baseApi } from "./baseApi";

// Visitor interface
export interface Visitor {
  visitorName: string;
  visitorAadharCardNo?: string;
  visitorPassportNumber?: string;
  visitorNationalId?: string;
  visitorType?: string; // "OPD" | "IPD" | "OTHER"
  visitorTitle?: string; // Visitor title (Mr, Mrs, etc.)
  visitorNationality?: string; // Visitor nationality (Indian, Nepal, Foreigner)
  visitorContactNumber?: string; // Contact number from "Visitor Already Exists" dialog selection
  // Address fields (populated from "Visitor Already Exists" dialog when available)
  visitorPinCode?: string;
  visitorAddress?: string;
  visitorCity?: string;
  visitorState?: string;
  visitorCountry?: string;
  visitorTehsil?: string;
  visitorArea?: string;
  visitorAddressLine1?: string;
  visitorAddressLine2?: string;
  visitorPurpose?: string;
  visitorCompanyName?: string;
}

// New Patient Entry Request
export interface NewPatientEntryRequest {
  // Personal Details
  title?: string; // Patient title (Mr, Mrs, etc.)
  contactNo: string;
  aadharCardNo?: string; // Required for Indian
  passportNumber?: string; // Required for Foreigner
  nationalId?: string; // Required for Nepal
  name: string;
  age: string;
  nationality: string;
  patientType: string;
  panelId?: number; // Required when patientType is "Panel"
  maritalStatus?: string;
  occupation?: string;
  emailAddress?: string;
  
  // Address Details
  pinCode: string;
  country: string;
  patientState: string;
  city: string;
  tehsil?: string;
  area?: string;
  areaId?: number | string; // Area ID from areas API
  patientAddress?: string; // Required for India; for non-India use addressLine1/addressLine2
  addressLine1?: string; // For non-India: House/Building Number, Street Name (mandatory)
  addressLine2?: string; // For non-India: Apartment/Unit (optional)
  
  // Visitors
  visitors: Visitor[];
  
  // Additional fields
  branchId: number;
  entryType: string;
  registrationId?: number; // Optional: ID from existing patient registration (when revisiting)
  uhid?: string; // Optional: UHID for existing patients (when entryType is "old")
  userLeadId?: number; // Optional: ID from userLead when both registrations and preBookings are empty
  
  // Photos (will be handled as FormData for file uploads)
  vehiclePhoto?: File | null;
  aadharPhoto?: File | null;
}

// New Patient Entry Response
export interface NewPatientEntryResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data?: {
    patientId?: string;
    uhid?: string;
    [key: string]: unknown;
  };
}

// Single Visitor Entry Item
// Visitor Entry Item for API request
export interface VisitorEntryItem {
  // Visitor Details (common)
  patientTitle?: string; // Patient title (Mr, Mrs, etc.)
  visitorTitle?: string; // Visitor title (Mr, Mrs, etc.)
  visitorName: string;
  visitorType: "IPD" | "OPD" | "OTHER" | "MEDICINE";
  visitorContactNumber: string;
  visitorAadharCardNo?: string;
  visitorPassportNumber?: string;
  visitorNationalId?: string;
  visitorNationality?: string; // Visitor nationality (Indian, Nepal, Foreigner)
  visitorAddress?: string; // India; when non-India use visitorAddressLine1/2
  visitorAddressLine1?: string; // Non-India: House/Building Number, Street Name
  visitorAddressLine2?: string; // Non-India: Apartment/Unit (optional)
  visitorCity: string;
  visitorTehsil?: string;
  visitorArea?: string;
  visitorAreaId?: number | string; // Area ID from areas API
  visitorState: string;
  visitorCountry: string;
  visitorPinCode: string;
  
  // OPD/OTHER specific
  visitorPurpose?: string;
  patientName?: string;
  patientPhoneNumber?: string;
  patientUhid?: string;
  patientToken?: string;
  
  // OTHER specific
  typeOfVisit?: "personal" | "official";
  visitorCompanyName?: string;
  
  // IPD specific
  patientId?: string | number;
  patientBuilding?: string;
  patientRoomNo?: string;
  patientBedNo?: string;
  
  // Photos
  vehiclePhoto?: File | null;
  aadharPhoto?: File | null;
}

// Visitor Entry Request (wrapped in visitors key)
export interface VisitorEntryRequest {
  visitors: VisitorEntryItem[];
  isPatientVisitForMedicine?: boolean; // true if patient visited for medicine, false if visitor
}

// Visitor Entry Response
export interface VisitorEntryResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data?: {
    visitorId?: string;
    [key: string]: unknown;
  };
}

// Patient Entries Query Parameters
export interface PatientEntriesQueryParams {
  page?: number;
  limit?: number | ""; // Allow empty string for no limit
  type?: string; // 'new_patient' | 'revisit_patient' | 'patient_visitor' | 'ipd_visitor' | 'other' | 'New Patient' | 'Revisit Patient' | etc.
  entryType?: string; // 'new' | 'old' | etc.
  date?: string; // Format: YYYY-MM-DD (deprecated, use startDate/endDate)
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string; // Format: YYYY-MM-DD
  search?: string;
  branchId?: number;
  sort?: string; // e.g., 'createdAt'
  order?: 'ASC' | 'DESC';
}

// Patient Entry Item (from API response)
export interface PatientEntryItem {
  id: number;
  patientName?: string;
  visitorName?: string;
  type: string;
  registrationNo?: string;
  tokenNo?: string | null;
  createdAt: string;
  contactNo?: string;
  // Additional fields that may be present
  aadharNumber?: string;
  age?: string;
  pinCode?: string;
  address?: string;
  /** India address; when null, use addressLine1/addressLine2 for non-India. */
  patientAddress?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  tehsil?: string;
  area?: string;
  country?: string;
  emailAddress?: string;
  maritalStatus?: string;
  patientType?: string;
  occupation?: string;
  indianForeignerNepal?: string;
  visitorContactNumber?: string;
  visitorPurpose?: string;
  [key: string]: unknown;
}

// Patient Entries Response
export interface PatientEntriesResponse {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  data: PatientEntryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Visitors Query Parameters
export interface VisitorsQueryParams {
  page?: number;
  limit?: number | ""; // Allow empty string for no limit
  type?: string; // 'patient_visitor' | 'only_visitor'
  visitorType?: string; // '' | 'Other'
  date?: string; // Format: YYYY-MM-DD (deprecated, use startDate/endDate)
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string; // Format: YYYY-MM-DD
  search?: string;
  patientId?: number;
  branchId?: number;
  sort?: string; // e.g., 'createdAt'
  order?: 'ASC' | 'DESC';
}

// Visitor Item (from /gate/visitors API response) - kept for reference/backward compat
export interface VisitorItem {
  id: number;
  visitorName: string;
  visitorAadharCardNo?: string;
  visitorPassportNumber?: string;
  visitorNationalId?: string;
  visitorType: "OPD" | "IPD" | "OTHER" | "MEDICINE";
  visitorContactNumber: string;
  visitorPinCode: string;
  visitorAddress?: string | null;
  visitorAddressLine1?: string | null;
  visitorAddressLine2?: string | null;
  visitorCity: string;
  visitorTehsil?: string | null;
  visitorState: string;
  visitorCountry: string;
  visitorPurpose?: string;
  patientToken?: string;
  patientId?: number;
  patientName?: string;
  patientPhoneNumber?: string;
  patientUhid?: string;
  patientBuilding?: string;
  patientRoomNo?: string;
  patientBedNo?: string;
  vehiclePhoto?: string;
  aadharPhoto?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

// Raw visitor detail from new grouped API response (snake_case fields)
export interface RawVisitorDetail {
  id: number;
  patient_entry_id: number | null;
  visitor_type: string;
  type_of_visit: string | null;
  patient_token: string | null;
  visitor_company_name: string | null;
  visitor_title: string | null;
  visitor_name: string;
  visitor_aadhar_card_no: string | null;
  visitor_passport_number: string | null;
  visitor_national_id: string | null;
  visitor_contact_number: string;
  visitor_pin_code: string;
  visitor_address: string | null;
  visitor_city: string;
  visitor_state: string;
  visitor_country: string;
  visitor_purpose: string | null;
  patient_title: string | null;
  patient_name: string | null;
  patient_phone_number: string | null;
  patient_uhid: string | null;
  patient_building: string | null;
  patient_room_no: string | null;
  patient_bed_no: string | null;
  vehicle_photo: string | null;
  aadhar_photo: string | null;
  created_at: string;
  updated_at: string;
  created_by: number;
  is_patient_visit_for_medicine: boolean;
  visitor_nationality: string | null;
  visitor_area: string | null;
  visitor_tehsil: string | null;
  visitor_address_line1: string | null;
  visitor_address_line2: string | null;
  branch_id: number | null;
  [key: string]: unknown;
}

/**
 * `/gate/visitors` may return camelCase fields; UI code expects snake_case RawVisitorDetail.
 * Merge both shapes so tables and dialogs always receive populated fields.
 */
function normalizeGateVisitorDetail(v: Record<string, unknown>): RawVisitorDetail {
  const pick = <T>(camel: keyof typeof v | string, snake: string, def: T): T => {
    const a = v[camel as string];
    const b = v[snake];
    if (a !== undefined && a !== null) return a as T;
    if (b !== undefined && b !== null) return b as T;
    return def;
  };

  return {
    id: Number(pick("id", "id", 0)) || 0,
    patient_entry_id: (v.patientEntryId ?? v.patient_entry_id) as number | null,
    visitor_type: String(pick("visitorType", "visitor_type", "")),
    type_of_visit: (v.typeOfVisit ?? v.type_of_visit) as string | null,
    patient_token: (v.patientToken ?? v.patient_token) as string | null,
    visitor_company_name: (v.visitorCompanyName ?? v.visitor_company_name) as string | null,
    visitor_title: (v.visitorTitle ?? v.visitor_title) as string | null,
    visitor_name: String(pick("visitorName", "visitor_name", "")),
    visitor_aadhar_card_no: (v.visitorAadharCardNo ?? v.visitor_aadhar_card_no) as string | null,
    visitor_passport_number: (v.visitorPassportNumber ?? v.visitor_passport_number) as string | null,
    visitor_national_id: (v.visitorNationalId ?? v.visitor_national_id) as string | null,
    visitor_contact_number: String(pick("visitorContactNumber", "visitor_contact_number", "")),
    visitor_pin_code: String(pick("visitorPinCode", "visitor_pin_code", "")),
    visitor_address: (v.visitorAddress ?? v.visitor_address) as string | null,
    visitor_city: String(pick("visitorCity", "visitor_city", "")),
    visitor_state: String(pick("visitorState", "visitor_state", "")),
    visitor_country: String(pick("visitorCountry", "visitor_country", "")),
    visitor_purpose: (v.visitorPurpose ?? v.visitor_purpose) as string | null,
    patient_title: (v.patientTitle ?? v.patient_title) as string | null,
    patient_name: (v.patientName ?? v.patient_name) as string | null,
    patient_phone_number: (v.patientPhoneNumber ?? v.patient_phone_number) as string | null,
    patient_uhid: (v.patientUhid ?? v.patient_uhid) as string | null,
    patient_building: (v.patientBuilding ?? v.patient_building) as string | null,
    patient_room_no: (v.patientRoomNo ?? v.patient_room_no) as string | null,
    patient_bed_no: (v.patientBedNo ?? v.patient_bed_no) as string | null,
    vehicle_photo: (v.vehiclePhoto ?? v.vehicle_photo) as string | null,
    aadhar_photo: (v.aadharPhoto ?? v.aadhar_photo) as string | null,
    created_at: String(pick("createdAt", "created_at", "")),
    updated_at: String(pick("updatedAt", "updated_at", "")),
    created_by: Number(v.createdBy ?? v.created_by ?? 0) || 0,
    is_patient_visit_for_medicine:
      v.isPatientVisitForMedicine !== undefined
        ? Boolean(v.isPatientVisitForMedicine)
        : Boolean(v.is_patient_visit_for_medicine),
    visitor_nationality: (v.visitorNationality ?? v.visitor_nationality) as string | null,
    visitor_area: (v.visitorArea ?? v.visitor_area) as string | null,
    visitor_tehsil: (v.visitorTehsil ?? v.visitor_tehsil) as string | null,
    visitor_address_line1: (v.visitorAddressLine1 ?? v.visitor_address_line1) as string | null,
    visitor_address_line2: (v.visitorAddressLine2 ?? v.visitor_address_line2) as string | null,
    branch_id: (v.branchId ?? v.branch_id) as number | null,
  };
}

function normalizeGroupedVisitorItem(group: Record<string, unknown>): GroupedVisitorItem {
  const visitorsRaw = (group.visitors as unknown[]) || [];
  const visitors = visitorsRaw.map((row) =>
    normalizeGateVisitorDetail((row && typeof row === "object" ? row : {}) as Record<string, unknown>)
  );
  return {
    createdAt: String(group.createdAt ?? ""),
    patientUhid: (group.patientUhid ?? group.patient_uhid) as string | null,
    visitorCount:
      Number(group.visitorCount ?? group.visitor_count ?? 0) ||
      (visitors.length > 0 ? visitors.length : 0),
    visitors,
  };
}

function normalizeVisitorsResponse(response: VisitorsResponse): VisitorsResponse {
  if (!response?.data || !Array.isArray(response.data)) return response;
  return {
    ...response,
    data: response.data.map((g) =>
      normalizeGroupedVisitorItem((g && typeof g === "object" ? g : {}) as Record<string, unknown>)
    ),
  };
}

// Grouped visitor item from new API response format
export interface GroupedVisitorItem {
  createdAt: string;
  patientUhid: string | null;
  visitorCount: number;
  visitors: RawVisitorDetail[];
}

// Visitors Response
export interface VisitorsResponse {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  data: GroupedVisitorItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Get Visitor by Aadhar Response
export interface VisitorByAadharItem {
  id: number;
  visitorName: string;
  visitorAadharCardNo: string;
  visitorPassportNumber?: string | null;
  visitorNationalId?: string | null;
  visitorContactNumber?: string | null;
  visitorAddress?: string | null;
  visitorCity?: string | null;
  visitorState?: string | null;
  visitorCountry?: string | null;
  visitorTehsil?: string | null;
  visitorArea?: string | null;
  visitorAddressLine1?: string | null;
  visitorAddressLine2?: string | null;
  visitorPurpose?: string | null;
  visitorTitle?: string | null;
  createdAt?: string;
  visitorNationality?: string | null;
  visitorCompanyName?: string | null;
  [key: string]: unknown;
}

export interface VisitorByAadharResponse {
  success: boolean;
  data: VisitorByAadharItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export const gateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    newPatientEntry: builder.mutation<
      NewPatientEntryResponse,
      NewPatientEntryRequest
    >({
      query: (payload) => {
        // Create FormData for file uploads
        const formData = new FormData();
        
        // Personal Details - using exact API field names
        // Add patient title if provided
        if (payload.title) {
          formData.append("title", payload.title);
        }
        formData.append("contactNo", payload.contactNo);
        
        // Add ID fields conditionally based on what's provided
        if (payload.aadharCardNo) {
          formData.append("aadharCardNo", payload.aadharCardNo);
        }
        if (payload.passportNumber) {
          formData.append("passportNumber", payload.passportNumber);
        }
        if (payload.nationalId) {
          formData.append("nationalId", payload.nationalId);
        }
        
        formData.append("name", payload.name);
        formData.append("age", payload.age);
        formData.append("nationality", payload.nationality);
        formData.append("patientType", payload.patientType.toUpperCase());
        if (payload.panelId) {
          formData.append("panelId", payload.panelId.toString());
        }
        if (payload.maritalStatus) {
          formData.append("maritalStatus", payload.maritalStatus);
        }
        if (payload.occupation) {
          formData.append("occupation", payload.occupation);
        }
        if (payload.emailAddress) {
          formData.append("emailAddress", payload.emailAddress);
        }
        
        // Address Details - using exact API field names
        formData.append("pinCode", payload.pinCode);
        formData.append("country", payload.country);
        formData.append("patientState", payload.patientState);
        formData.append("city", payload.city);
        if (payload.tehsil) {
          formData.append("tehsil", payload.tehsil);
        }
        if (payload.area) {
          formData.append("area", payload.area);
        }
        if (payload.areaId) {
          formData.append("areaId", payload.areaId.toString());
        }
        if (payload.patientAddress) {
          formData.append("patientAddress", payload.patientAddress);
        }
        if (payload.addressLine1) {
          formData.append("addressLine1", payload.addressLine1);
        }
        if (payload.addressLine2) {
          formData.append("addressLine2", payload.addressLine2);
        }
        
        // Visitors - format as array with indexed fields
        payload.visitors.forEach((visitor, index) => {
          // Add visitor title if provided
          if (visitor.visitorTitle) {
            formData.append(`visitors[${index}][visitorTitle]`, visitor.visitorTitle);
          }
          formData.append(`visitors[${index}][visitorName]`, visitor.visitorName);
          
          // Add visitor nationality if provided
          if (visitor.visitorNationality) {
            formData.append(`visitors[${index}][visitorNationality]`, visitor.visitorNationality);
          }
          
          // Add the appropriate ID field based on what's provided (only one should be present)
          if (visitor.visitorAadharCardNo) {
            formData.append(`visitors[${index}][visitorAadharCardNo]`, visitor.visitorAadharCardNo);
          }
          if (visitor.visitorPassportNumber) {
            formData.append(`visitors[${index}][visitorPassportNumber]`, visitor.visitorPassportNumber);
          }
          if (visitor.visitorNationalId) {
            formData.append(`visitors[${index}][visitorNationalId]`, visitor.visitorNationalId);
          }
          
          // Add visitorType with default "OPD" if not provided
          formData.append(`visitors[${index}][visitorType]`, visitor.visitorType || "OPD");
          
          // Add contact number if provided (populated from "Visitor Already Exists" dialog)
          if (visitor.visitorContactNumber) {
            formData.append(`visitors[${index}][visitorContactNumber]`, visitor.visitorContactNumber);
          }
          // Address fields (populated from "Visitor Already Exists" dialog when available)
          if (visitor.visitorPinCode) {
            formData.append(`visitors[${index}][visitorPinCode]`, visitor.visitorPinCode);
          }
          if (visitor.visitorAddress) {
            formData.append(`visitors[${index}][visitorAddress]`, visitor.visitorAddress);
          }
          if (visitor.visitorCity) {
            formData.append(`visitors[${index}][visitorCity]`, visitor.visitorCity);
          }
          if (visitor.visitorState) {
            formData.append(`visitors[${index}][visitorState]`, visitor.visitorState);
          }
          if (visitor.visitorCountry) {
            formData.append(`visitors[${index}][visitorCountry]`, visitor.visitorCountry);
          }
          if (visitor.visitorTehsil) {
            formData.append(`visitors[${index}][visitorTehsil]`, visitor.visitorTehsil);
          }
          if (visitor.visitorArea) {
            formData.append(`visitors[${index}][visitorArea]`, visitor.visitorArea);
          }
          if (visitor.visitorAddressLine1) {
            formData.append(`visitors[${index}][visitorAddressLine1]`, visitor.visitorAddressLine1);
          }
          if (visitor.visitorAddressLine2) {
            formData.append(`visitors[${index}][visitorAddressLine2]`, visitor.visitorAddressLine2);
          }
          if (visitor.visitorPurpose) {
            formData.append(`visitors[${index}][visitorPurpose]`, visitor.visitorPurpose);
          }
          if (visitor.visitorCompanyName) {
            formData.append(`visitors[${index}][visitorCompanyName]`, visitor.visitorCompanyName);
          }
        });
        
        // Additional fields
        formData.append("branchId", payload.branchId.toString());
        formData.append("entryType", payload.entryType);
        
        // Add registrationId if provided (for existing patient revisits)
        if (payload.registrationId) {
          formData.append("registrationId", payload.registrationId.toString());
        }
        
        // Add uhid if provided (for existing patients when entryType is "old")
        if (payload.uhid) {
          formData.append("uhid", payload.uhid);
        }
        
        // Add userLeadId if provided (when both registrations and preBookings are empty)
        if (payload.userLeadId) {
          formData.append("userLeadId", payload.userLeadId.toString());
        }
        
        // Add files if they exist
        if (payload.vehiclePhoto) {
          formData.append("vehiclePhoto", payload.vehiclePhoto);
        }
        if (payload.aadharPhoto) {
          formData.append("aadharPhoto", payload.aadharPhoto);
        }
        
        return {
          url: "/gate/patient-entry",
          method: "POST",
          body: formData,
          // RTK Query will automatically detect FormData and skip setting Content-Type
          // allowing the browser to set it with proper multipart/form-data boundary
        };
      },
    }),
    visitorEntry: builder.mutation<
      VisitorEntryResponse,
      VisitorEntryRequest
    >({
      query: (payload) => {
        // Create FormData for file uploads
        const formData = new FormData();
        
        // Add each visitor's data with proper array indexing
        payload.visitors.forEach((visitor, index) => {
          // Always send isPatientVisitForMedicine first (per visitor)
          const isPatientVisitForMedicine = payload.isPatientVisitForMedicine ?? false;
          formData.append(`visitors[${index}][isPatientVisitForMedicine]`, String(isPatientVisitForMedicine));

          // Common visitor fields
          // Patient title (for patient associated with visitor)
          if (visitor.patientTitle) {
            formData.append(`visitors[${index}][patientTitle]`, visitor.patientTitle);
          }
          // Visitor title
          if (visitor.visitorTitle) {
            formData.append(`visitors[${index}][visitorTitle]`, visitor.visitorTitle);
          }
          formData.append(`visitors[${index}][visitorName]`, visitor.visitorName);
          formData.append(`visitors[${index}][visitorType]`, visitor.visitorType);
          formData.append(`visitors[${index}][visitorContactNumber]`, visitor.visitorContactNumber);
          if (visitor.visitorAddress) {
            formData.append(`visitors[${index}][visitorAddress]`, visitor.visitorAddress);
          }
          if (visitor.visitorAddressLine1) {
            formData.append(`visitors[${index}][visitorAddressLine1]`, visitor.visitorAddressLine1);
          }
          if (visitor.visitorAddressLine2) {
            formData.append(`visitors[${index}][visitorAddressLine2]`, visitor.visitorAddressLine2);
          }
          formData.append(`visitors[${index}][visitorCity]`, visitor.visitorCity);
          formData.append(`visitors[${index}][visitorState]`, visitor.visitorState);
          formData.append(`visitors[${index}][visitorCountry]`, visitor.visitorCountry);
          formData.append(`visitors[${index}][visitorPinCode]`, visitor.visitorPinCode);
          
          // Optional visitor fields
          if (visitor.visitorAadharCardNo) {
            formData.append(`visitors[${index}][visitorAadharCardNo]`, visitor.visitorAadharCardNo);
          }
          if (visitor.visitorPassportNumber) {
            formData.append(`visitors[${index}][visitorPassportNumber]`, visitor.visitorPassportNumber);
          }
          if (visitor.visitorNationalId) {
            formData.append(`visitors[${index}][visitorNationalId]`, visitor.visitorNationalId);
          }
          
          // Add visitor nationality only if visitor has name and at least one ID proof
          const hasVisitorName = visitor.visitorName && visitor.visitorName.trim().length > 0;
          const hasIdProof = !!(visitor.visitorAadharCardNo?.trim() || 
                               visitor.visitorPassportNumber?.trim() || 
                               visitor.visitorNationalId?.trim());
          
          if (visitor.visitorNationality && hasVisitorName && hasIdProof) {
            formData.append(`visitors[${index}][visitorNationality]`, visitor.visitorNationality);
          }
          if (visitor.visitorTehsil) {
            formData.append(`visitors[${index}][visitorTehsil]`, visitor.visitorTehsil);
          }
          if (visitor.visitorArea) {
            formData.append(`visitors[${index}][visitorArea]`, visitor.visitorArea);
          }
          if (visitor.visitorAreaId) {
            formData.append(`visitors[${index}][visitorAreaId]`, visitor.visitorAreaId.toString());
          }
          if (visitor.visitorPurpose) {
            formData.append(`visitors[${index}][visitorPurpose]`, visitor.visitorPurpose);
          }
          
          // OPD/OTHER specific fields
          if (visitor.patientName) {
            formData.append(`visitors[${index}][patientName]`, visitor.patientName);
          }
          
          // Always send patientPhoneNumber and patientUhid when visitorType is OPD, IPD, or MEDICINE (optional fields)
          if (visitor.visitorType === "OPD" || visitor.visitorType === "IPD" || visitor.visitorType === "MEDICINE") {
            formData.append(`visitors[${index}][patientPhoneNumber]`, visitor.patientPhoneNumber || "");
            formData.append(`visitors[${index}][patientUhid]`, visitor.patientUhid || "");
          }
          
          if (visitor.patientToken) {
            formData.append(`visitors[${index}][patientToken]`, visitor.patientToken);
          }
          
          // OTHER specific fields - always send typeOfVisit, send visitorCompanyName only when official
          if (visitor.visitorType === "OTHER") {
            formData.append(`visitors[${index}][typeOfVisit]`, visitor.typeOfVisit || "personal");
            if (visitor.visitorCompanyName) {
              formData.append(`visitors[${index}][visitorCompanyName]`, visitor.visitorCompanyName);
            }
          }
          
          // IPD specific fields
          if (visitor.patientId !== undefined) {
            formData.append(`visitors[${index}][patientId]`, visitor.patientId.toString());
          }
          if (visitor.patientBuilding) {
            formData.append(`visitors[${index}][patientBuilding]`, visitor.patientBuilding);
          }
          if (visitor.patientRoomNo) {
            formData.append(`visitors[${index}][patientRoomNo]`, visitor.patientRoomNo);
          }
          if (visitor.patientBedNo) {
            formData.append(`visitors[${index}][patientBedNo]`, visitor.patientBedNo);
          }
        });
        
        // Add files at the top level (not nested in visitors array)
        // Backend FileFieldsInterceptor expects exact field names: vehiclePhoto and aadharPhoto
        // Send files in the same order as visitors (visitor 0's files first, then visitor 1's, etc.)
        payload.visitors.forEach((visitor) => {
          if (visitor.vehiclePhoto) {
            formData.append("vehiclePhoto", visitor.vehiclePhoto);
          }
          if (visitor.aadharPhoto) {
            formData.append("aadharPhoto", visitor.aadharPhoto);
          }
        });
        
        // Log FormData entries for debugging
        console.log("Patient Medicine Type - FormData being sent to API:");
        console.log("FormData entries count:", Array.from(formData.entries()).length);
        const formDataEntries: Record<string, string | File> = {};
        formData.forEach((value, key) => {
          if (value instanceof File) {
            formDataEntries[key] = `[File: ${value.name}, size: ${value.size}]`;
          } else {
            formDataEntries[key] = value;
          }
        });
        console.log("FormData entries:", formDataEntries);
        console.log("FormData (structured):", JSON.stringify(formDataEntries, null, 2));
        
        return {
          url: "/gate/visitor",
          method: "POST",
          body: formData,
          // RTK Query will automatically detect FormData and skip setting Content-Type
          // allowing the browser to set it with proper multipart/form-data boundary
        };
      },
    }),
    getGatePatientEntries: builder.query<
      PatientEntriesResponse,
      PatientEntriesQueryParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append("page", params.page.toString());
        // Send limit even if it's empty string (for export to fetch all data)
        if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
        if (params.type) queryParams.append("type", params.type);
        if (params.entryType) queryParams.append("entryType", params.entryType);
        if (params.startDate) queryParams.append("startDate", params.startDate);
        if (params.endDate) queryParams.append("endDate", params.endDate);
        // Fallback to date for backward compatibility
        if (!params.startDate && !params.endDate && params.date) queryParams.append("date", params.date);
        if (params.search) queryParams.append("search", params.search);
        if (params.branchId) queryParams.append("branchId", params.branchId.toString());
        if (params.sort) queryParams.append("sort", params.sort);
        if (params.order) queryParams.append("order", params.order);

        return {
          url: `/gate/patient-entries?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Gate"],
    }),
    getVisitors: builder.query<
      VisitorsResponse,
      VisitorsQueryParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append("page", params.page.toString());
        // Send limit even if it's empty string (for export to fetch all data)
        if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
        if (params.type) queryParams.append("type", params.type);
        if (params.visitorType !== undefined) queryParams.append("visitorType", params.visitorType);
        if (params.startDate) queryParams.append("startDate", params.startDate);
        if (params.endDate) queryParams.append("endDate", params.endDate);
        // Fallback to date for backward compatibility
        if (!params.startDate && !params.endDate && params.date) queryParams.append("date", params.date);
        if (params.search) queryParams.append("search", params.search);
        if (params.patientId) queryParams.append("patientId", params.patientId.toString());
        if (params.branchId) queryParams.append("branchId", params.branchId.toString());
        if (params.sort) queryParams.append("sort", params.sort);
        if (params.order) queryParams.append("order", params.order);

        return {
          url: `/gate/visitors?${queryParams.toString()}`,
          method: "GET",
        };
      },
      transformResponse: (response: VisitorsResponse) => normalizeVisitorsResponse(response),
      providesTags: ["Gate"],
    }),
    /**
     * Get visitors by Aadhaar card number (for patient-visitor page auto-fill)
     */
    getVisitorByAadhar: builder.query<
      VisitorByAadharResponse,
      { visitorAadharCardNo: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.visitorAadharCardNo) {
          queryParams.append("visitorAadharCardNo", params.visitorAadharCardNo);
        }
        return {
          url: `/gate/GetVisitorByAadhar?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    checkGateExistingPatientsByPhone: builder.query<
      {
        success: boolean;
        data: {
          registrations: ExistingPatient[];
          preBookings: Array<{
            id: number;
            branch_id?: number; branchId?: number;
            uhid?: string | null;
            patient_name?: string; patientName?: string;
            patient_title?: string; patientTitle?: string;
            guardian_name?: string; guardianName?: string;
            guardian_title?: string; guardianTitle?: string;
            doctor_user_id?: number; doctorUserId?: number;
            gender?: string;
            age?: string;
            contact_number?: string; contactNumber?: string;
            email_address?: string; emailAddress?: string;
            pin_code?: string | null; pinCode?: string | null;
            address?: string | null;
            address_line1?: string | null; addressLine1?: string | null;
            address_line2?: string | null; addressLine2?: string | null;
            area_id?: number; areaId?: number;
            city?: string;
            state?: string;
            country?: string;
            area?: string;
            tehsil?: string;
            marital_status?: string | null; maritalStatus?: string | null;
            patient_type?: string | null; patientType?: string | null;
            patient_sub_type?: string | null; patientSubType?: string | null;
            benificiary_id?: string | null; benificiaryId?: string | null;
            insurance_company?: string | null; insuranceCompany?: string | null;
            ayush_covered?: string | null; ayushCovered?: string | null;
            panel_id?: number | null; panelId?: number | null;
            diagnosis_id?: number | null; diagnosisId?: number | null;
            sub_diagnosis_id?: number | null; subDiagnosisId?: number | null;
            symptoms?: string | null;
            addiction?: string | null;
            addiction_specify?: string | null; addictionSpecify?: string | null;
            booking_type?: string; bookingType?: string;
            appointment_date?: string; appointmentDate?: string;
            appointment_time?: string; appointmentTime?: string;
            created_at?: string | null;
            [key: string]: unknown;
          }>;
          userLead?: ExistingPatient | null;
          /** Gate entries when no registrations/preBookings/userLead (show "Already Exist Gate Entries of Patients") */
          patientEntries?: Array<{
            id: number;
            title?: string;
            name?: string;
            branchId?: string | number;
            age?: string;
            gender?: string | null;
            contactNo?: string;
            patientState?: string;
            patientAddress?: string;
            city?: string;
            country?: string;
            emailAddress?: string;
            pinCode?: string;
            maritalStatus?: string;
            aadharCardNo?: string;
            occupation?: string;
            patientType?: string;
            uhid?: string | null;
            [key: string]: unknown;
          }>;
        };
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { branchId: number; phoneNumber: string; uhid?: string; aadharCardNo?: string }
    >({
      query: (params) => {
        const { branchId, phoneNumber, uhid, aadharCardNo } = params;
        const queryParams = new URLSearchParams({
          branchId: branchId.toString(),
          phoneNumber: phoneNumber,
        });
        // Add uhid to query params if provided
        if (uhid) {
          queryParams.append("uhid", uhid);
        }
        // Add aadharCardNo to query params if provided
        if (aadharCardNo) {
          queryParams.append("aadharCardNo", aadharCardNo);
        }
        return {
          url: `/gate/registrations-and-pre-bookings?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Get registrations by phone number (for revisit patient page)
     */
    getRegistrationsByPhone: builder.query<
      {
        success: boolean;
        data: unknown[];
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { branchId: number; phoneNumber: string }
    >({
      query: (params) => {
        const { branchId, phoneNumber } = params;
        const queryParams = new URLSearchParams({
          branchId: branchId.toString(),
          phoneNumber: phoneNumber,
        });
        return {
          url: `/gate/registrations-by-phone?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Get registration data by branch (by UHID or phone number).
     * When uhid is provided: returns single object in data.
     * When phoneNumber is provided: returns array in data.
     */
    getSpecificRegistrationDataByBranchId: builder.query<
      {
        success: boolean;
        data: {
          id: number;
          sUhid: string | null;
          uhid: string;
          branchId: number;
          patientName: string;
          patientTitle: string;
          doctorUserId: number;
          contactNumber: string;
          whatsappNo: string | null;
          emailAddress: string | null;
          aadharCardNo: string | null;
        } | Array<{
          id: number;
          sUhid: string | null;
          uhid: string;
          branchId: number;
          patientName: string;
          patientTitle: string;
          doctorUserId: number;
          contactNumber: string;
          whatsappNo: string | null;
          emailAddress: string | null;
          aadharCardNo: string | null;
        }>;
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { branchId: number; phoneNumber?: string; uhid?: string }
    >({
      query: (params) => {
        const { branchId, phoneNumber = "", uhid = "" } = params;
        const queryParams = new URLSearchParams({
          branchId: branchId.toString(),
          phoneNumber: phoneNumber,
          uhid: uhid,
        });
        return {
          url: `/gate/GetSpecificRegistrationDataByBranchId?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Get specific IPD patient detail by branch (by UHID or phone number).
     * When uhid is provided: returns single object in data.
     * When phoneNumber is provided: returns array in data.
     */
    getSpecificIpdPatientDetailByBranchId: builder.query<
      {
        success: boolean;
        data: {
          patientId: number;
          uhid: string;
          buildingId: number;
          roomId: number;
          patientTitle: string | null;
          patientName: string;
          bedNumber: string | null;
          name: string | null;
          roomNumber: string | null;
          contactNumber: string | null;
        } | Array<{
          patientId: number;
          uhid: string;
          buildingId: number;
          roomId: number;
          patientTitle: string | null;
          patientName: string;
          bedNumber: string | null;
          name: string | null;
          roomNumber: string | null;
          contactNumber: string | null;
        }>;
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { branchId: number; phoneNumber?: string; uhid?: string }
    >({
      query: (params) => {
        const { branchId, phoneNumber = "", uhid = "" } = params;
        const queryParams = new URLSearchParams({
          branchId: branchId.toString(),
          phoneNumber: phoneNumber,
          uhid: uhid,
        });
        return {
          url: `/gate/GetSpecificIpdPatientDetailByBranchId?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
    /**
     * Get pre-booking by ID
     */
    getPreBookingById: builder.query<
      {
        success: boolean;
        data: {
          id: number;
          branchId: number;
          uhid: string | null;
          patientName: string;
          doctorUserId: number;
          guardianName?: string;
          gender: string;
          age: string;
          contactNumber: string;
          emailAddress?: string;
          pinCode?: string;
          address?: string;
          areaId?: number;
          area?: string;
          tehsil?: string;
          city?: string;
          state?: string;
          country?: string;
          maritalStatus?: string;
          addiction?: string;
          patientType?: string;
          patientSubType?: string;
          benificiaryId?: string;
          attachment?: string | null;
          insuranceCompany?: string;
          ayushCovered?: string;
          patientWardType?: string;
          allergies?: string;
          surgeries?: string;
          dietType?: string;
          height?: string;
          weight?: string;
          symptoms?: string | null;
          problems?: string | null;
          landmark?: string | null;
          diagnosis?: string;
          subDiagnosis?: string;
          remark?: string;
          bookingType?: string;
          appointmentDate?: string;
          appointmentTime?: string;
          packageId?: number | null;
          packageStartDate?: string | null;
          packageEndDate?: string | null;
          status?: string;
          addedBy?: number;
          addedByAgentName?: string | null;
          sourceUuid?: string;
          source?: string;
          whatsappNumber?: string | null;
          alternateNumber?: string | null;
          bloodGroup?: string;
          dispositionLevel_1?: string | null;
          dispositionLevel_2?: string | null;
          diseases?: string | null;
          dialysisHistory?: string;
          frequencyDuration?: string;
          allergiesInfo?: string;
          familyHistory?: string;
          surgicalHistory?: string;
          currentTreatmentDetails?: string;
          patientAppetite?: string;
          bowelMovements?: string;
          urination?: string;
          sleep?: string;
          chiefComplaints?: string;
          historyPresentIllness?: string;
          otherMedicalHistory?: string;
          healthInsurance?: string;
          insurancePolicyNumber?: string;
          insuranceValidityEndDate?: string;
          patientTreatmentHistory?: string;
          occupation?: string;
          admissionAmount?: string;
          consultationFee?: string;
          patientStatus?: string;
          requiredInvestigation?: string;
          cardiacHistory?: string;
          historyPleuralPericardialEffusion?: string;
          treatmentGuidedByDoctor?: string;
          treatmentDateTimeDoctor?: string;
          treatmentGuidedByAgent?: string;
          treatmentDateTimeAgent?: string;
          emergencyHospitalization?: string;
          helpEmergencyHospitalization?: string;
          recommendedConsultancyFees?: string;
          createdAt?: string;
          updatedAt?: string;
          registration?: any | null;
        };
        message: string;
        timestamp: string;
        statusCode: number;
      },
      { branchId: number; preBookingId: string | number }
    >({
      query: (params) => {
        const { branchId, preBookingId } = params;
        const queryParams = new URLSearchParams({
          branchId: branchId.toString(),
          preBookingId: preBookingId.toString(),
        });
        return {
          url: `/gate/getPreBookingById?${queryParams.toString()}`,
          method: "GET",
        };
      },
    }),
  }),
});

// Existing Patient interface for API response (matches actual API structure)
export interface ExistingPatient {
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
  occupation?: string;
  height?: string;
  weight?: string;
  bloodGroup?: string;
  allergies?: string;
  surgeries?: string;
  dietType?: string;
  guardianName?: string;
  guardianTitle?: string;
  addiction?: string;
  patientType?: string | null;
  patientSubType?: string | null;
  benificiaryId?: string | null;
  schemeType?: string;
  insuranceCompany?: string | null;
  ayushCovered?: string | null;
  remark?: string | null;
  status?: string;
  addedBy?: number;
  referralClinic?: string | null;
  isReferral?: string | null;
  referralSourceInfo?: string | null;
  referralUserId?: number | null;
  referralName?: string | null;
  referralMobile?: string | null;
  religion?: string;
  specificReligion?: string | null;
  jsHealthCardNo?: string | null;
  panelId?: number | null;
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
  agentId?: string | null;
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
  // Legacy fields for backward compatibility
  name?: string;
  branchName?: string;
  // Pre-booking fields
  isPreBooking?: boolean;
  preBookingId?: number | string | null;
  [key: string]: unknown;
}

export const {
  useNewPatientEntryMutation,
  useVisitorEntryMutation,
  useGetGatePatientEntriesQuery,
  useLazyGetGatePatientEntriesQuery,
  useGetVisitorsQuery,
  useLazyGetVisitorsQuery,
  useGetVisitorByAadharQuery,
  useLazyGetVisitorByAadharQuery,
  useCheckGateExistingPatientsByPhoneQuery,
  useLazyCheckGateExistingPatientsByPhoneQuery,
  useGetRegistrationsByPhoneQuery,
  useLazyGetRegistrationsByPhoneQuery,
  useLazyGetSpecificRegistrationDataByBranchIdQuery,
  useLazyGetSpecificIpdPatientDetailByBranchIdQuery,
  useGetPreBookingByIdQuery,
  useLazyGetPreBookingByIdQuery,
} = gateApi;

