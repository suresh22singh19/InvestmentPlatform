// ---------------------------------------------------------------------------
// Dashboard & shared UI
// ---------------------------------------------------------------------------

export type ReceptionDashboardTab = "dashboard";

export type AdmissionType = "TPA (HealthIns)" | "Private" | "Panel (Govt Emp)";

export type WardCapacityStatusColor = "green" | "grey" | "red";

export interface ReceptionDashboardStats {
  totalAwaiting: number;
  admittedToday: number;
  availableBeds: number;
  dischargePending: number;
  awaitingRecentCount: number;
  admittedRecentCount: number;
  generalWardFreeBeds: number;
}

export interface WardCapacityItem {
  id: string;
  name: string;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  occupancyPercentage: number;
  statusColor: WardCapacityStatusColor;
}

export interface ReceptionDashboardStatsResponse {
  success: boolean;
  data: ReceptionDashboardStats;
  message: string;
}

export interface WardCapacityResponse {
  success: boolean;
  data: WardCapacityItem[];
  message: string;
}

export interface ReceptionDashboardData {
  stats: ReceptionDashboardStats;
  wards: WardCapacityItem[];
}

export type ReceptionStatSubtextKey =
  | "awaitingSubtext"
  | "admittedSubtext"
  | "bedsSubtext"
  | "dischargeSubtext";

export type ReceptionStatSubtextIcon = "trend" | "clock" | "info";

// ---------------------------------------------------------------------------
// Dashboard stats API
// ---------------------------------------------------------------------------

export interface IpdDashboardStatCount {
  count: number;
  lastHourCount?: number;
}

export interface IpdDashboardBedBreakdownItem {
  wardType: string;
  freeCount: number;
}

export interface IpdDashboardAvailableBeds {
  count: number;
  breakdown: IpdDashboardBedBreakdownItem[];
}

export interface IpdDashboardStatsData {
  totalAwaiting: IpdDashboardStatCount;
  admittedToday: IpdDashboardStatCount;
  availableBeds: IpdDashboardAvailableBeds;
  dischargePending?: IpdDashboardStatCount;
}

export interface IpdDashboardStatsResponse {
  success: boolean;
  data: IpdDashboardStatsData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface IpdDashboardStatsParams {
  branchId?: number;
}

// ---------------------------------------------------------------------------
// Ward capacity overview API
// ---------------------------------------------------------------------------

export interface IpdWardCapacityOverviewApiItem {
  id?: string | number;
  roomCategory?: string;
  wardCategory?: string;
  wardType?: string;
  roomType?: string;
  roomTyp?: string;
  name?: string;
  label?: string;
  totalBeds?: number;
  totalCapacity?: number;
  total?: number;
  bedCount?: number;
  occupiedBeds?: number;
  occupied?: number;
  freeBeds?: number;
  free?: number;
  availableBeds?: number;
  occupancyPercentage?: number;
  statusColor?: WardCapacityStatusColor;
  status?: string;
  color?: string;
}

export interface IpdWardCapacityOverviewData {
  categories?: IpdWardCapacityOverviewApiItem[];
  wardCapacity?: IpdWardCapacityOverviewApiItem[];
  wardCapacityOverview?: IpdWardCapacityOverviewApiItem[];
  wards?: IpdWardCapacityOverviewApiItem[];
  roomTypes?: IpdWardCapacityOverviewApiItem[];
}

export type IpdRoomTypeCapacityOverviewPayload =
  | IpdWardCapacityOverviewData
  | IpdWardCapacityOverviewApiItem[];

export interface IpdWardCapacityOverviewResponse {
  success?: boolean;
  data?: IpdRoomTypeCapacityOverviewPayload;
  categories?: IpdWardCapacityOverviewApiItem[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

export interface IpdWardCapacityOverviewParams {
  branchId?: number;
}

export interface IpdWardCapacityOverviewView {
  wardCapacity: WardCapacityItem[];
  roomTypes: WardCapacityItem[];
}

// ---------------------------------------------------------------------------
// Awaiting patients listing API
// ---------------------------------------------------------------------------

export interface RequiredDocumentItem {
  documentMasterId: number;
  documentName: string;
  isMandatory: boolean;
  sortOrder: number;
  isSubmitted: boolean;
}

export interface AwaitingPatient {
  patientId: number;
  branchId?: number;
  patientName: string;
  patientUhid: string;
  admissionType: string;
  counsellorName: string;
  doctorName: string;
  lastActivity: string | null;
  patientRoomId: number | null;
  bedNumber: string | null;
  remark: string | null;
  roomNumber: string | null;
  roomType: string | null;
  diagnosis: string;
  admissionDate: string;
  createdAt: string;
  status: string;
  waitingTimeMinutes: number;
  patientComplianceStatus: string;
  requiredDocuments: RequiredDocumentItem[];
}

/** Raw API row may use `branchid` (lowercase) or `branchId`. */
export type AwaitingPatientApiRow = AwaitingPatient & {
  branchid?: number;
};

export interface AwaitingPatientsResponse {
  success: boolean;
  data: AwaitingPatient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface AwaitingPatientsParams {
  patientId?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  search?: string;
  branchId?: number;
  patientType?: string;
}

export type AwaitingPatientActionType = "highlight" | "standard";

export type IpdAwaitingPatientTableRow = AwaitingPatient & {
  waitingTimeLabel: string;
  actionType: AwaitingPatientActionType;
};

// ---------------------------------------------------------------------------
// Patient overview API
// ---------------------------------------------------------------------------

export interface IpdPatientOverviewAppointment {
  id?: number;
  uhid?: string;
  branch_id?: number;
  doctor_user_id?: number;
  appointment_date?: string | null;
  time_slot?: string | null;
  token?: string | null;
  status?: string | null;
  doctor_fee?: string | null;
  diagnosis_symptoms?: string | null;
  allergies?: string | null;
  surgeries?: string | null;
  created_at?: string | null;
}

export interface IpdPatientOverviewRegistration {
  id?: number;
  uhid?: string;
  patient_name?: string;
  patient_title?: string | null;
  gender?: string | null;
  age?: string | number | null;
  contact_number?: string | null;
  whatsapp_no?: string | null;
  email_address?: string | null;
  marital_status?: string | null;
  aadhar_card_no?: string | null;
  occupation?: string | null;
  guardian_name?: string | null;
  guardian_title?: string | null;
  diet_type?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  surgeries?: string | null;
  height?: string | null;
  weight?: string | null;
  patient_type?: string | null;
  patient_sub_type?: string | null;
  benificiary_id?: string | null;
  insurance_company?: string | null;
  ayush_covered?: string | null;
  religion?: string | null;
  js_health_card_no?: string | null;
  is_referral?: boolean | null;
}

export interface IpdPatientOverviewVitals {
  height?: string | null;
  weight?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  surgeries?: string | null;
  diet_type?: string | null;
  blood_pressure?: string | null;
  sugar_level?: string | null;
  temperature?: string | null;
  pulse?: string | null;
  spo2?: string | null;
  respiratory_rate?: string | null;
  pain_scale?: string | null;
  notes?: string | null;
}

export interface IpdPatientOverviewReferral {
  source?: string | null;
  sub_source?: string | null;
  referral_doctor?: string | null;
  referral_name?: string | null;
  mobile?: string | null;
}

export interface IpdPatientOverviewAssignedRoom {
  roomNumber?: string | null;
  roomType?: string | null;
  bedNumber?: string | null;
  attendantBedNumber?: string | null;
  remark?: string | null;
}

export interface IpdPatientOverviewData {
  patientId: number;
  uhid: string;
  admissionType?: string | null;
  admissionScheduleType?: string | null;
  admissionLabel?: string | null;
  counsellorName?: string | null;
  doctorName?: string | null;
  patientAdmitted?: string | null;
  admissionDate?: string | null;
  appointment?: IpdPatientOverviewAppointment | null;
  registration?: IpdPatientOverviewRegistration | null;
  vitals?: IpdPatientOverviewVitals | null;
  patientRefferal?: IpdPatientOverviewReferral | null;
  roomType?: IpdPatientOverviewAssignedRoom | null;
}

export interface IpdPatientOverviewResponse {
  success: boolean;
  data: IpdPatientOverviewData;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

export interface IpdPatientOverviewParams {
  patientId: number;
  branchId?: number;
}

// ---------------------------------------------------------------------------
// Open file flow
// ---------------------------------------------------------------------------

export type OpenFileStep = 1 | 2;

export type VitalsCaptureForm = {
  bloodPressure: string;
  sugarLevel: string;
  temperature: string;
  pulseRate: string;
  spo2: string;
};

export type DietaryForm = {
  dietPlanRequest: string;
  clinicalNote: string;
};

export type OpenFileStep1Form = {
  vitals: VitalsCaptureForm;
  dietary: DietaryForm;
};

export type OpenFilePatientVitalsSnapshot = {
  bloodPressure: string;
  sugarLevel: string;
  temperature: string;
  pulseRate: string;
  spo2: string;
};

export type OpenFileAdmissionSummary = {
  wardAssigned: string;
  billingType: string;
  consultant: string;
};

export type OpenFilePatientDetails = {
  patientName: string;
  uhid: string;
  admissionType: string;
  wardCategory: string;
  vitalsSnapshot: OpenFilePatientVitalsSnapshot;
  admissionSummary: OpenFileAdmissionSummary;
  clinicalNoteForFood: string;
  branchId?: number;
};

// ---------------------------------------------------------------------------
// Create IPD admission API
// ---------------------------------------------------------------------------

export interface CreateIpdAdmissionDocumentPayload {
  documentMasterId: number;
  isSubmitted: boolean;
}

export interface CreateIpdAdmissionVitalsPayload {
  bloodPressure: string;
  sugarLevel: string;
  temperature: string;
  pulse: string;
  spo2: string;
  vitalsNote: string;
  source: string;
}

export interface CreateIpdAdmissionPayload {
  patientId: number;
  branchId: number;
  patientName: string;
  documents: CreateIpdAdmissionDocumentPayload[];
  vitals: CreateIpdAdmissionVitalsPayload;
}

export interface CreateIpdAdmissionResponse {
  success: boolean;
  message: string;
  data?: unknown;
  timestamp?: string;
  statusCode?: number;
}

// ---------------------------------------------------------------------------
// Submit pending documents API (non-compliant mode)
// ---------------------------------------------------------------------------

export interface SubmitPendingDocumentsPayload {
  patientId: number;
  documents: CreateIpdAdmissionDocumentPayload[];
}

export interface SubmitPendingDocumentsResponse {
  success: boolean;
  message: string;
  data?: unknown;
  timestamp?: string;
  statusCode?: number;
}
