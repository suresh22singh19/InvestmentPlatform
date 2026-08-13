/**
 * IPD Head Nurse API — RTK Query endpoints
 */

import { baseApi } from "./baseApi";

export interface StaffNurseDashboardSummary {
  totalPatients: {
    count: number;
    today: number;
  };
  vitalsPending: number;
  pendingTasks: number;
}

export interface UnitInCharge {
  id: number;
  label: string;
  name: string;
}

export interface StaffNurseDashboardHeader {
  shiftLabel: string;
  shiftName: string;
  shift: string;
  unitInCharge: UnitInCharge | null;
}

export interface StaffNurseUpcomingTherapy {
  sessionId: number;
  therapyName: string;
  patientName: string;
  patientTitle: string;
  bedNumber: string;
  roomNumber: string;
  note: string | null;
  time: string;
  status: string;
}

export interface StaffNurseMedicationAlert {
  id: number;
  patientId: number;
  patientName: string;
  patientTitle: string;
  uhid: string;
  bedNumber: string;
  roomNumber: string;
  medicineName: string;
  dosageAmount: string;
  dosageUnit: string;
  frequency: string;
  frequencyType: string;
  shift: string;
  nurseName: string;
  status: string;
  timeStatus: string;
  completedAt: string | null;
}

export interface StaffNurseVitalsQueueItem {
  id?: number;
  patientId?: number;
  patientName?: string;
  patientTitle?: string;
  uhid?: string;
  bedNumber?: string;
  roomNumber?: string;
  nurseName?: string;
  status?: string;
  timeStatus?: string;
  time?: string;
  note?: string | null;
}

export interface StaffNurseShiftHandover {
  assignmentId: number;
  nurseName: string;
  time: string;
  note: string;
}

export interface StaffNurseDashboardData {
  summary: StaffNurseDashboardSummary;
  date: string;
  header: StaffNurseDashboardHeader;
  upcomingTherapies: StaffNurseUpcomingTherapy[];
  medicationAlerts: StaffNurseMedicationAlert[];
  vitalsQueue: StaffNurseVitalsQueueItem[];
  shiftHandover: StaffNurseShiftHandover | null;
}

export interface StaffNurseDashboardResponse {
  success: boolean;
  data: StaffNurseDashboardData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface StaffNurseDashboardParams {
  branchId: number;
}

/** @deprecated Use StaffNurseDashboard* types instead */
export type HeadNurseDashboardBeds = {
  count: number;
  occupied: number;
  vacant: number;
  reserved: number;
  underCleaning: number;
};
export type HeadNurseDashboardData = StaffNurseDashboardData;
export type HeadNurseDashboardResponse = StaffNurseDashboardResponse;
export type HeadNurseDashboardParams = StaffNurseDashboardParams;

export interface AssignedPatientListItem {
  id: number;
  patientTitle: string;
  patientName: string;
  age: string;
  gender: string;
  uhid: string;
  contactNumber: string;
  diagnosis: string | null;
  subDiagnosisName: string | null;
  admissionType: string;
  type: string;
  admissionDate: string;
  lastVisit: string;
  doctorName: string;
  status: string;
  bedNumber: string;
  roomNumber: string;
  roomType: string;
  lastVitalsDate: string | null;
  taskStatus?: string | null;
  nurseId?: number;
  nurseName?: string;
  allocationStatus?: string;
  allocationDate?: string;
}

export interface GetPatientListParams {
  branchId: number;
  search?: string;
  sortBy?: string;
  order?: "ASC" | "DESC";
  limit?: number;
  page?: number;
}

export interface GetPatientListResponse {
  success: boolean;
  data: AssignedPatientListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

/** @deprecated Use GetPatientListParams / GetPatientListResponse */
export type GetPatientAssignToNurseListParams = GetPatientListParams;
export type GetPatientAssignToNurseListResponse = GetPatientListResponse;

export interface AdmittedPatientListItem {
  id: number;
  patientTitle:string;
  patientName: string;
  age: string;
  gender: string;
  uhid: string;
  contactNumber: string;
  diagnosis: string | null;
  admissionType: string;
  type: string;
  admissionDate: string;
  lastVisit: string;
  doctorName: string;
  status: string;
  bedNumber: string;
  roomNumber: string;
  roomType: string;
  packageEndDate?: string | null;
}

export interface GetAdmittedPatientListParams {
  branchId: number;
  search?: string;
  sortBy?: string;
  order?: "ASC" | "DESC";
  limit?: number;
  page?: number;
}

export interface GetAdmittedPatientListResponse {
  success: boolean;
  data: AdmittedPatientListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface NursePatientCountItem {
  nurseId: number;
  name: string;
  empId: string;
  phone: string;
  branchId: number;
  totalPatients: string;
}

export interface GetNursePatientCountParams {
  branchId: number;
}

export interface GetNursePatientCountResponse {
  success: boolean;
  data: NursePatientCountItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface MedicationAlertItem {
  id: number;
  patientId: number;
  patientName: string;
  patientTitle?: string;
  uhid: string;
  bedNumber: string;
  roomNumber: string;
  medicineName: string;
  dosageAmount: string;
  dosageUnit: string;
  frequency: string;
  frequencyType: string;
  shift: string;
  nurseName: string;
  status: string;
  timeStatus: string;
  completedAt: string | null;
}

export interface GetMedicationAlertsParams {
  branchId: number;
}

export interface GetMedicationAlertsResponse {
  success: boolean;
  data: MedicationAlertItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface MedicationDashboardSummaryData {
  totalPatients: number;
  ipdCount: number;
  dayCareCount: number;
  dosesDue: number;
  overdue: number;
  administered: number;
}

export interface GetMedicationDashboardSummaryParams {
  branchId: number;
  date: string;
}

export interface GetMedicationDashboardSummaryResponse {
  success: boolean;
  data: MedicationDashboardSummaryData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientMedicationTimeSlot {
  shift: string;
  status: string | null;
  administered: boolean;
  remark: string | null;
  completedAt: string | null;
}

export interface PatientMedicationListMedicine {
  id: number;
  medicineName: string;
  dosageAmount: string;
  dosageUnit: string;
  frequency: string;
  medicineStatus: string;
  timeSlots: PatientMedicationTimeSlot[];
  rowStatus: string;
}

export interface PatientMedicationListPatient {
  patientId: number;
  patientTitle:string;
  patientName: string;
  uhid: string;
  age: string;
  gender: string;
  diagnosis: string;
  doctorName: string;
  roomNumber: string;
  bedNumber: string;
  patientType: string;
  medications: PatientMedicationListMedicine[];
}

export type PatientMedicationFilterStatus =
  | "all"
  | "pending"
  | "administered"
  | "overdue"
  | "hold";

export interface GetPatientMedicationListParams {
  branchId: number;
  date: string;
  page?: number;
  limit?: number;
  search?: string;
  filterStatus?: Exclude<PatientMedicationFilterStatus, "all">;
}

export interface GetPatientMedicationListResponse {
  success: boolean;
  data: PatientMedicationListPatient[];
  total: number;
  page: number;
  limit: number | string;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface UnassignedPatientRoomBedNurse {
  shift: string;
  allocationDate: string;
  nurseName: string;
  empId: string;
  nurseId: number;
}

export interface UnassignedPatientRoomBed {
  patientRoomId: number;
  patientId: number;
  uhid: string;
  patientName: string;
  branchId: number;
  bedNumber: string;
  bedStatus: string;
  nurses?: UnassignedPatientRoomBedNurse[];
}

export interface UnassignedPatientRoomData {
  roomId: number;
  roomNumber: string;
  roomType: string;
  buildingId: number;
  buildingName: string;
  floorId: number;
  floorName: string;
  bedCapacity: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  beds: UnassignedPatientRoomBed[];
}

export interface GetUnassignedPatientRoomListParams {
  branchId: number;
  patientId: number;
  date?: string;
}

export interface GetUnassignedPatientRoomListResponse {
  success: boolean;
  data: UnassignedPatientRoomData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface NurseDropdownItem {
  id: number;
  name: string;
  empId: string;
}

export interface GetNurseDropdownParams {
  branchId: number;
  date?: string;
  shift?: "morning" | "evening" | "night";
}

export interface GetNurseDropdownResponse {
  success: boolean;
  data: NurseDropdownItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface RosterDutyItem {
  dutyDate?: string;
  day?: number;
  shift?: string | null;
  shiftHours?: number | null;
}

export interface RosterDutyChartItem {
  id?: number;
  userId: number;
  employeeId?: string | null;
  empId?: string | null;
  userType?: string | null;
  name?: string | null;
  userName?: string | null;
  nurseName?: string | null;
  role?: string | null;
  rosterStatus?: string | null;
  duties?: RosterDutyItem[] | Record<string, RosterDutyItem | string | null> | null;
  days?: RosterDutyItem[] | Record<string, RosterDutyItem | string | null> | null;
  dutyChart?: RosterDutyItem[] | Record<string, RosterDutyItem | string | null> | null;
}

export interface ListRosterData {
  month?: number;
  year?: number;
  rosterStatus?: string | null;
  days?: Array<number | string | RosterDutyItem>;
  dutyChart?: RosterDutyChartItem[];
  roster?: RosterDutyChartItem[];
}

export interface ListRosterParams {
  month: number;
  year: number;
  userType?: string;
  rosterStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
  branchId: number;
}

export interface ListRosterResponse {
  success: boolean;
  data: ListRosterData | RosterDutyChartItem[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message: string;
  timestamp: string;
  statusCode: number;
  rosterStatus?: string | null;
}

export interface BulkUpsertRosterDuty {
  dutyDate: string;
  shift: string;
  shiftHours: number;
}

export interface BulkUpsertRosterItem {
  userId: number;
  employeeId: string;
  userType: string;
  duties: BulkUpsertRosterDuty[];
}

export interface BulkUpsertRosterRequest {
  rosterStatus: string;
  branchId: number;
  roster: BulkUpsertRosterItem[];
}

export interface BulkUpsertRosterResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

export interface RoomAssignmentNurse {
  nurseId: number;
  nurseName: string;
  shift: string;
  allocationDate: string;
}

export interface RoomAssignmentListItem {
  id: number;
  uhid: string;
  diagnosis: string;
  type: string;
  admissionDate: string;
  bedNumber: string;
  roomId: number;
  buildingId: number;
  floorId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  roomNumber: string;
  roomType: string;
  roomUsage: string;
  branchId: number;
  buildingName: string;
  floorName: string;
  packageEndDate?: string | null;
  nurses: RoomAssignmentNurse[];
}

export interface RoomAssignmentStats {
  total: number;
  vacant: number;
  fullyOccupied: number;
  partiallyOccupied: number;
  reserved: number;
  underMaintenance: number;
}

export interface GetRoomAssignmentListParams {
  branchId: number;
  search?: string;
  roomUsage?: string;
  limit?: number;
  page?: number;
}

export interface GetRoomAssignmentListResponse {
  success: boolean;
  data: RoomAssignmentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  roomStats?: RoomAssignmentStats;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface AssignNurseRequest {
  patientId: number;
  nurseId: number;
  shiftDate: string;
  shift: string;
  roomId?: number;
  buildingId?: number;
  branchId?: number;
  floorId?: number;
  bedNumber?: string;
}

export interface AssignNurseResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export type AssignOrChangeNurseRequest = {
  patientId: number;
  nurseId: number;
  shiftDate: string;
  shift: string;
};

export type AssignOrChangeNurseResponse = AssignNurseResponse;

export interface BulkReassignNursesItem {
  patientId: number;
  nurseId: number;
}

export interface BulkReassignNursesRequest {
  shiftDate: string;
  shift: string;
  assign: BulkReassignNursesItem[];
}

export interface BulkReassignNursesResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface UnavailableBedDropdownItem {
  id: number;
  bedNumber: string;
  roomNumber: string;
  roomType: string;
  roomTypeCode: string;
}

export interface GetUnavailableBedsForDropdownParams {
  branchId: number;
  search?: string;
}

export interface GetUnavailableBedsForDropdownResponse {
  success: boolean;
  data: UnavailableBedDropdownItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface NurseAssignmentNurseInfo {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface NurseAssignmentListItem {
  id: number;
  patientTitle:string;
  patientId: number;
  nurseId: number;
  roomId: number;
  floorId: number;
  buildingId: number;
  bedNumber: string;
  shift: string;
  allocationDate: string;
  assignedAt: string;
  allocationStatus: string;
  isHandoverPatient: boolean;
  isHandoverOverdue: boolean;
  handoverAt: string | null;
  handoverNotes: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  cancelReason: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  nurse: NurseAssignmentNurseInfo | null;
  nextShift: string | null;
  nextShiftDate: string | null;
  nextShiftNurse: NurseAssignmentNurseInfo | null;
  roomNumber: string;
  floorName: string;
  buildingName: string;
  patientUhid: string;
  branchId: number;
  patientName: string;
  gender: string;
  age: string;
  contactNumber?: string | null;
  emailAddress?: string | null;
  patientStatus: string;
  pendingTask: string | null;
  handoverStatus: string;
  diagnosis?: string | null;
}

export interface ListNurseAssignmentsParams {
  branchId: number;
  shift?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
  search?: string;
  bedNumber?: string;
  patientStatus?: string;
}

export interface ListNurseAssignmentsResponse {
  success: boolean;
  data: NurseAssignmentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientHandoverItem {
  assignmentId: number;
  patientId: number;
  notes: string;
}

export interface PatientHandoverRequest {
  handovers: PatientHandoverItem[];
}

export interface PatientHandoverResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface HeadNursePatientDetailData {
  appointmentDetail?: Record<string, unknown>;
  patientDetails?: Record<string, unknown>;
  referralDetail?: Record<string, unknown>;
  medicalInfo?: Record<string, unknown>;
  otherInformation?: Record<string, unknown>;
  wallet?: Record<string, unknown>;
  patientHistory?: Array<Record<string, unknown>>;
}

export interface GetOnePatientDetailResponse {
  success: boolean;
  data: HeadNursePatientDetailData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface ReferPatientListItem {
  id: number;
  patientTitle:string;
  patientName: string;
  uhid: string;
  age: string;
  gender: string;
  temperature: string;
  pulse: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  spo2: number;
  referralHospitalName: string;
  referralDepartment: string;
  referralDoctorName: string;
  referralDoctorAge: string;
  referralDoctorGender: string;
  referredToHospital: string;
  reasonForReferral: string;
  diagnosis: string;
  chiefComplaints: string;
  referralDate: string;
  status: string;
  addedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetReferPatientListingParams {
  branchId: number;
  search?: string;
  sortBy?: string;
  order?: "ASC" | "DESC";
  limit?: number;
  page?: number;
}

export interface GetReferPatientListingResponse {
  success: boolean;
  data: ReferPatientListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CreateReferPatientRequest {
  branchId: number;
  patientName: string;
  uhid: string;
  age: string;
  gender: string;
  temperature: number;
  pulse: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  spo2: number;
  referralHospitalName: string;
  referralDepartment: string;
  referralDoctorName: string;
  referralDoctorAge: string;
  referralDoctorGender: string;
  referredToHospital: string;
  reasonForReferral: string;
  diagnosis: string;
  chiefComplaints: string;
  referralDate: string;
  status: "draft" | "active";
}

export interface CreateReferPatientResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface UpdateReferPatientMutationArg {
  referPatientId: number;
  body: CreateReferPatientRequest;
}

export interface UpdateReferPatientResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientMedicineTodayDose {
  id: number;
  status: string;
  remark: string | null;
  completedAt: string | null;
  shift: string | null;
}

export interface PatientMedicineDetailItem {
  id: number;
  medicineId: number;
  medicineName: string;
  dosageAmount: string;
  dosageUnit: string;
  frequencyType: string;
  timingType: string;
  durationAmount: string;
  frequency: string;
  durationUnit: string;
  remark: string | null;
  status: string;
  medicineStatus: string;
  patientTakenMedicine: boolean;
  nurseName: string | null;
  shift: string | null;
  doseStatus: string | null;
  shiftTimeStatus: string | null;
  todayDoses: PatientMedicineTodayDose | null;
}

export interface GetPatientMedicineDetailParams {
  patientId: number;
  date: string;
  page?: number;
  limit?: number;
}

export interface GetPatientMedicineDetailResponse {
  success: boolean;
  data: PatientMedicineDetailItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientMedicineScheduleShift {
  shift: string;
  medicines: PatientMedicineDetailItem[];
}

export interface GetPatientMedicineScheduleParams {
  patientId: number;
  date: string;
  patientMedicinePrescribeId?: number;
}

export interface GetPatientMedicineScheduleResponse {
  success: boolean;
  data: PatientMedicineScheduleShift[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientMedicineListItem {
  id: number;
  patientId: number;
  medicineId: number;
  medicineName: string;
  patientType: string;
  medicineType: string;
  dosageAmount: string;
  dosageUnit: string;
  frequencyType: string;
  frequency: string;
  timingType: string;
  durationAmount: string;
  durationUnit: string;
  remark: string | null;
  status: string;
  medicineStatus: string;
  billedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetPatientMedicineListParams {
  patientId: number;
  page?: number;
  limit?: number;
  medicineStatus?: string;
  search?: string;
  sortBy?: string;
  order?: "ASC" | "DESC";
}

export interface GetPatientMedicineListResponse {
  success: boolean;
  data: PatientMedicineListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientOverviewDetails {
  patientTitle: string | null;
  guardianTitle: string | null;
  name: string;
  jsHealthCardNo: string | null;
  contactNumber: string | null;
  age: string;
  gender: string;
  fatherHusbandName: string | null;
  maritalStatus: string | null;
  aadharCardNumber: string | null;
  bloodGroup: string | null;
  weight: string | null;
  height: string | null;
  dietType: string | null;
  remark: string | null;
  diagnosis: string | null;
  addiction: string[];
  allergies: string | null;
  surgeries: string | null;
}

export interface PatientOverviewVitals {
  id: number;
  patientId: number;
  bloodPressure: string | null;
  sugarLevel: string | null;
  temperature: string | null;
  pulse: string | null;
  spo2: string | null;
  VitalsNote: string | null;
  painScale?: string | null;
  respiratoryRate?: string | null;
  createdAt: string;
}

export interface PatientOverviewNursingNote {
  id: number;
  category: string;
  notes: string;
  userType: string;
  entityId: number;
  addedByName: string | null;
}

export interface PatientOverviewLabResult {
  labTestName: string;
  testStatus: string;
  reportStatus: string;
}

export interface PatientOverviewAttendant {
  id: number;
  patientId: number;
  branchId: number;
  uhid: string;
  name: string;
  age: string | null;
  gender: string | null;
  address: string | null;
  relation: string | null;
  contactNumber: string | null;
  email: string | null;
  addedBy: number;
  createdAt: string;
  updatedAt: string;
  country: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
}

export interface PatientOverviewData {
  patientDetails: PatientOverviewDetails;
  latestVitals: PatientOverviewVitals | null;
  latestNursingNote: PatientOverviewNursingNote[];
  labResults: PatientOverviewLabResult[];
  patientAttendant: PatientOverviewAttendant[];
}

export interface GetPatientOverviewResponse {
  success: boolean;
  data: PatientOverviewData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface NursingNoteListItem {
  id: number;
  patientId: number;
  category: string;
  notes: string;
  createdAt: string;
  userType: string;
  entityId: number;
  addedByName: string | null;
}

export interface GetNursingNoteListParams {
  patientId: number;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  noteAddedBy?: string;
}

export interface GetNursingNoteListResponse {
  success: boolean;
  data: NursingNoteListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CreateNursingNoteRequest {
  patientId: number;
  uhid: string;
  branchId: number;
  category: "routine" | "urgent";
  notes: string;
}

export interface CreateNursingNoteResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetLabTestSummaryParams {
  branchId: number;
  patientId: number;
}

export interface LabTestSummaryData {
  totalTests: number;
  pendingResults: number;
  pendingApprovals:number
}

export interface GetLabTestSummaryResponse {
  success: boolean;
  data: LabTestSummaryData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface LabTestListLabTest {
  id: number;
  testName: string;
  testDescription: string;
  categoryName: string;
}

export interface LabTestListRegistration {
  id: number;
  uhid: string;
  patientName: string;
}

export interface LabTestListBranch {
  id: number;
  name: string;
}

export interface LabTestListItem {
  id: number;
  patientId: number;
  uhid: string;
  result: string | null;
  testStatus: string;
  createdByUserName?: string | null;
  createdAt: string;
  updatedAt: string;
  admissionDate?: string | null;
  labTest: LabTestListLabTest;
  registration: LabTestListRegistration;
  branch: LabTestListBranch;
}

export interface GetLabTestListParams {
  patientId: number;
  page?: number;
  limit?: number;
  status?: string;
  isPending?: boolean;
}

export interface GetLabTestListResponse {
  success: boolean;
  data: LabTestListItem[];
  total: number;
  page: number | string;
  limit: number | string;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface LabTestListingItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: string;
}

export interface GetLabTestListingParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryName?: string;
}

export interface GetLabTestListingResponse {
  success: boolean;
  data: LabTestListingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CreateLabTestRequest {
  patientId: number;
  branchId: number;
  labTestIds: number[];
}

export interface CreateLabTestResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetDistinctLabTestCategoriesResponse {
  success: boolean;
  data: string[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetLabTestListWithRoomDetailsParams {
  page?: number;
  limit?: number;
  branchId: number;
  search?: string;
  status?: string;
  sortBy?: string;
  order?: "ASC" | "DESC";
}

export interface LabTestWithRoomDetailsItem {
  id: number;
  admissionDate:string;
  patientId: number;
  age: string;
  gender: string,
  createdByUserName:string
  uhid: string;
  result: string | null;
  testStatus: string;
  createdAt: string;
  updatedAt: string;
  patientName: string;
  patientTitle?: string | null;
  labTestId: number;
  testName: string;
  categoryName: string;
  testDescription: string;
  branchId: number;
  branchName: string;
  roomId: number | null;
  roomNumber: string | null;
  roomType: string | null;
  buildingId: number | null;
  buildingName: string | null;
  floorId: number | null;
  floorName: string | null;
  bedNumber: string | null;
}

export interface GetLabTestListWithRoomDetailsResponse {
  success: boolean;
  data: LabTestWithRoomDetailsItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetLabTestCountsParams {
  branchId: number;
}

export interface LabTestCountsData {
  activeLabTests: number;
  pendingSampleCollection: number;
  completedResults: number;
}

export interface GetLabTestCountsResponse {
  success: boolean;
  data: LabTestCountsData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetStaffNurseHistoryParams {
  branchId: number;
  date?: string;
}

export interface StaffNurseHistorySummary {
  totalPatients: number;
  completedTasks: number;
  pendingTasks: number;
}

export interface StaffNurseHistoryItem {
  taskType: string;
  taskTitle: string;
  status: string;
  dateTime: string;
  time: string;
  patientId: number;
  uhid: string;
  patientTitle?: string | null;
  patientName: string;
  gender?: string | null;
  age?: string | null;
  roomNumber?: string | null;
  bedNumber?: string | null;
  medicineName?: string | null;
  remark?: string | null;
}

export interface StaffNurseHistoryData {
  date: string;
  summary: StaffNurseHistorySummary;
  history: StaffNurseHistoryItem[];
}

export interface GetStaffNurseHistoryResponse {
  success: boolean;
  data: StaffNurseHistoryData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetDischargeInitiatedPatientsParams {
  branchId: number;
  page?: number;
  limit?: number;
  search?: string;
  PatientDischargeStatus?: "completed" | "pending";
}

export interface DischargeInitiatedPatientItem {
  id: number;
  uhid: string;
  createdAt: string;
  patientName: string;
  patientTitle?: string | null;
  gender?: string | null;
  age?: string | null;
  bedNumber?: string | null;
  roomId?: number | null;
  roomNumber?: string | null;
  roomType?: string | null;
  buildingId?: number | null;
  buildingName?: string | null;
  floorId?: number | null;
  floorName?: string | null;
  vitalsCompleted: boolean | null;
  medicinesExplained: boolean | null;
  patientEducationDone: boolean | null;
  dietExplained: boolean | null;
  followUpScheduled: boolean | null;
  PatientDischargeStatus: "completed" | "pending" | null;
}

export interface GetDischargeInitiatedPatientsResponse {
  success: boolean;
  data: DischargeInitiatedPatientItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CreateDischargePatientVitals {
  heightFeet?: number;
  heightInch?: number;
  weight?: number;
  bloodGroup?: string;
  allergies?: boolean;
  surgeries?: boolean;
  bloodPressure?: string;
  sugarLevel?: number;
  temperature?: number;
  pulse?: number;
  spo2?: number;
}

export interface CreateDischargePatientMedicalInfo {
  medicineId: number;
  dosageAmount: string;
  dosageUnit: string;
  frequencyType: string;
  timingType: string;
  durationAmount: number;
  durationUnit: string;
}

export interface CreateDischargePatientRequest {
  patientId: number;
  vitals?: CreateDischargePatientVitals;
  medicalInformation?: CreateDischargePatientMedicalInfo[];
  dietTypeId?: number;
  dietTypeInstruction?: string;
  educationRemarks?: string;
  followUpDate?: string;
  followUpRemarks?: string;
  vitalsCompleted?: boolean;
  medicinesExplained?: boolean;
  dietExplained?: boolean;
  followUpScheduled?: boolean;
  patientEducationDone?: boolean;
  nurseName?: string;
  finalRemarks?: string;
  signature?: string;
  status?: "completed" | "pending";
}

export interface DietMasterDropdownItem {
  id: number;
  diet: string;
  parentId: number;
}

export interface GetDietMasterDropdownParams {
  branchId: number;
}

export interface GetDietMasterDropdownResponse {
  success: boolean;
  data: DietMasterDropdownItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface DischargePlannerDetailVitals {
  id: number;
  bloodPressure: string | null;
  sugarLevel: string | null;
  temperature: string | null;
  pulse: string | null;
  spo2: string | null;
}

export interface DischargePlannerDetailMedicalInfo {
  id: number;
  medicineId: number;
  medicineName: string;
  dosageAmount: string;
  dosageUnit: string;
  frequencyType: string;
  timingType: string;
  durationAmount: string;
  durationUnit: string;
}

export interface DischargePlannerDetailData {
  id: number;
  patientId: number;
  uhid: string;
  branchId: number;
  status: string;
  vitals: DischargePlannerDetailVitals | null;
  vitalsCompleted: boolean;
  heightFeet: number | null;
  heightInch: number | null;
  weight: number | null;
  bloodGroup: string | null;
  allergies: boolean;
  surgeries: boolean;
  medicalInformation: DischargePlannerDetailMedicalInfo[];
  medicinesExplained: boolean;
  dietTypeId: number | null;
  dietType: string | null;
  dietTypeInstruction: string | null;
  dietExplained: boolean;
  educationRemarks: string | null;
  patientEducationDone: boolean;
  followUpDate: string | null;
  followUpRemarks: string | null;
  followUpScheduled: boolean;
  remark: string | null;
  signature: string | null;
  dischargeBy: number | null;
  dischargeDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ViewOnePatientDischargeDetailResponse {
  success: boolean;
  data: DischargePlannerDetailData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CreateDischargePatientMutationArg {
  branchId: number;
  body: CreateDischargePatientRequest;
}

export interface CreateDischargePatientResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface AddPatientMedicineRequest {
  patientId: number;
  dosageAmount: string;
  dosageUnit: string;
  durationAmount: string;
  durationUnit: string;
  frequencyType: string;
  medicineId: number;
  timingType: string;
  remark: string;
}

export interface AddPatientMedicineResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface EditPatientMedicineRequest {
  dosageAmount: string;
  dosageUnit: string;
  durationAmount: string;
  durationUnit: string;
  frequencyType: string;
  medicineId: number;
  timingType: string;
  remark: string;
}

export interface EditPatientMedicineResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export type EditPatientMedicineMutationArg = {
  patientMedicineId: number;
  body: EditPatientMedicineRequest;
};

export interface ReplacePatientMedicineRequest {
  newMedicineId: number;
}

export interface ReplacePatientMedicineResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface StopPatientMedicineResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface UpdateTodayPatientMedicineDoseRequest {
  patientMedicinePrescribeId: number;
  status: string;
  remark: string;
}

export interface UpdateTodayPatientMedicineDoseResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export type ReplacePatientMedicineMutationArg = {
  patientMedicineId: number;
  body: ReplacePatientMedicineRequest;
};

export interface MedicineBranchListItem {
  id: number;
  jatayuCd: string | null;
  branchId: number;
  name: string;
  category: string;
  quantity: number;
  remainingQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetAllMedicineByBranchListParams {
  branchId: number | string;
  search?: string;
}

export interface GetAllMedicineByBranchListResponse {
  success: boolean;
  data: MedicineBranchListItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientTherapyScheduleItem {
  sessionId: number;
  therapyDate: string;
  patientTitle:string;
  status: string;
  branchId?: number;
  session?: PatientTherapyScheduleSessionInfo | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  patientVitalsId?: number | null;
  therapyId?: number;
  therapyName: string;
  category?: string | null;
  assignmentId?: number;
  patientId?: number;
  registrationId?: number;
  uhid?: string;
  patientName?: string | null;
  therapistId?: number;
  therapistName: string;
  roomId?: number | null;
  roomNumber?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  timeSlot?: string | null;
}

export interface PatientTherapyScheduleSessionInfo {
  sessionId: number;
  therapyDate: string;
  status: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  patientVitalsId?: number | null;
}

export interface PatientTherapyScheduleApiItem
  extends Partial<
    Pick<
      PatientTherapyScheduleItem,
      "sessionId" | "therapyDate" | "status" | "actualStartTime" | "actualEndTime" | "patientVitalsId"
    >
  > {
  assignmentId?: number;
  branchId?: number;
  therapyId?: number;
  therapyName: string;
  category?: string | null;
  patientId?: number;
  registrationId?: number;
  uhid?: string;
  patientName?: string | null;
  patientTitle?: string;
  therapistId?: number;
  therapistName: string;
  roomId?: number | null;
  roomNumber?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  session?: PatientTherapyScheduleSessionInfo | null;
  therapyScheduleDate?: string | null;
}

function flattenPatientTherapyScheduleItem(
  item: PatientTherapyScheduleApiItem
): PatientTherapyScheduleItem {
  const { session, therapyScheduleDate, ...rest } = item;

  return {
    ...rest,
    patientTitle: rest.patientTitle ?? "",
    sessionId: session?.sessionId ?? rest.sessionId ?? rest.assignmentId ?? 0,
    therapyDate: session?.therapyDate ?? rest.therapyDate ?? therapyScheduleDate ?? "",
    status: session?.status ?? rest.status ?? "scheduled",
    actualStartTime: session?.actualStartTime ?? rest.actualStartTime ?? null,
    actualEndTime: session?.actualEndTime ?? rest.actualEndTime ?? null,
    patientVitalsId: session?.patientVitalsId ?? rest.patientVitalsId ?? null,
  };
}

export interface GetPatientTherapyScheduleParams {
  branchId: number;
  patientId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  page?: number;
  therapistId?: number;
  therapyCategory?: string;
  sortBy?: string;
  order?: "ASC" | "DESC";
}

export interface GetPatientTherapyScheduleResponse {
  success: boolean;
  data: PatientTherapyScheduleItem[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface TherapistListItem {
  id: number;
  userName: string;
  email?: string | null;
  phone?: string | null;
  empId?: string | null;
  branchId?: number;
  roleId?: number;
  status?: string;
  speciality?: string | null;
}

export interface GetTherapistsListParams {
  branchId: number;
}

export interface GetTherapistsListResponse {
  success: boolean;
  data: TherapistListItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface TherapyScheduleSummaryData {
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  cancelledSessions: number;
}

export interface GetTherapyScheduleSummaryParams {
  branchId: number;
}

export interface GetTherapyScheduleSummaryResponse {
  success: boolean;
  data: TherapyScheduleSummaryData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface LatestVitalsData {
  id: number;
  patientId: number;
  bloodPressure: string | null;
  sugarLevel: string | null;
  temperature: string | null;
  pulse: string | null;
  spo2: string | null;
  VitalsNote: string | null;
  painScale?: string | null;
  respiratoryRate?: string | null;
  abdominalGirth?: string | null;
  createdAt: string;
  createdByUserName?: string | null;
  createdByUserType?: string | null;
}

export interface GetLatestVitalsResponse {
  success: boolean;
  data: LatestVitalsData | null;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface SessionPatientVitals {
  sessionId: number;
  patientVitalsId: number;
  vitalsId: number;
  bloodPressure: string | null;
  sugarLevel: string | null;
  temperature: string | null;
  pulse: string | null;
  spo2: string | null;
  vitalsNote: string | null;
  painScale: string | null;
  respiratoryRate: string | null;
  abdominalGirth: string | null;
  vitalsCreatedAt: string;
  type: "before" | "after" | string;
}

export interface GetPatientVitalsBySessionResponse {
  success: boolean;
  data: SessionPatientVitals[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetVitalsHistoryParams {
  patientId: number;
  page?: number;
  limit?: number;
}

export interface GetVitalsHistoryResponse {
  success: boolean;
  data: LatestVitalsData[];
  total: number;
  page: number;
  limit: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface CreatePatientVitalsRequest {
  patientId: number;
  bloodPressure: string;
  sugarLevel: string;
  temperature: string;
  pulse: string;
  spo2: string;
  vitalsNote?: string;
  painScale?: string;
  respiratoryRate?: string;
  abdominalGirth?: string;
}

export interface CreatePatientVitalsResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface DownloadVitalCsvFileParams {
  patientId: number;
  fromDate?: string;
  toDate?: string;
}

export interface DownloadVitalCsvFileResponse {
  success: boolean;
  data: {
    url: string;
    filename: string;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface DownloadRosterFileParams {
  month: number;
  year: number;
  branchId: number;
}

export interface DownloadRosterFileResponse {
  success: boolean;
  data: {
    url: string;
    filename?: string;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientTimelineVital {
  id: number;
  patientId: number;
  bloodPressure: string | null;
  sugarLevel: string | null;
  temperature: string | null;
  pulse: string | null;
  spo2: string | null;
  VitalsNote: string | null;
  painScale: string | null;
  respiratoryRate: string | null;
  abdominalGirth: string | null;
  createdAt: string;
  createdByUserName: string | null;
  createdByUserType: string | null;
}

export interface PatientTimelineMedication {
  completedAt: string | null;
  status: string;
  remark: string | null;
  medicineName: string;
  prescribeId: number;
  dosageAmount: string;
  dosageUnit: string;
  durationAmount: string;
  durationUnit: string;
  timingType: string;
  frequency: string;
}

export interface PatientTimelineNote {
  id: number;
  category?: string;
  notes: string;
  createdAt?: string;
  userType?: string;
  entityId?: number;
  addedByName?: string | null;
}

export interface PatientTimelineDay {
  date: string;
  vitals: PatientTimelineVital[];
  notes: PatientTimelineNote[];
  labTests: LabTestListItem[];
  therapies: PatientTherapyScheduleItem[];
  medications: PatientTimelineMedication[];
}

export interface GetPatientTimelineParams {
  patientId: number;
  branchId: number;
}

export interface GetPatientTimelineResponse {
  success: boolean;
  data: PatientTimelineDay[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetPatientHistoryParams {
  patientId: number;
  branchId: number;
  fromDate?: string;
  toDate?: string;
}

export interface PatientHistoryData {
  doctorName: string;
  diagnosisName: string;
  subDiagnosisName: string | null;
  admissionDate: string;
  history: PatientTimelineDay[];
}

export interface GetPatientHistoryResponse {
  success: boolean;
  data: PatientHistoryData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientTherapyScheduleListTherapy {
  roomId: number | null;
  status: string;
  endTime: string | null;
  category: string | null;
  timeSlot: string | null;
  sessionId: number;
  therapyId: number;
  roomNumber: string | null;
  therapistId: number | null;
  therapyDate: string;
  therapyName: string;
  therapistName: string | null;
}

export interface PatientTherapyScheduleListPatient {
  patientId: number;
  uhid: string;
  patientName: string;
  patientTitle: string | null;
  patientType: string;
  age: string;
  gender: string;
  totalCount: string;
  therapies: PatientTherapyScheduleListTherapy[];
}

export interface GetPatientTherapyScheduleListParams {
  branchId: number;
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetPatientTherapyScheduleListResponse {
  success: boolean;
  data: PatientTherapyScheduleListPatient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}


export interface PendingApprovalLabTestItem {
  id: number;
  testName: string;
  categoryName: string;
  testDescription: string;
  createdByUserName: string;
  userType: string;
  approvalStatus: string;
}

export interface GetPendingApprovalLabTestListParams {
  branchId: number;
  patientId: number;
}

export interface GetPendingApprovalLabTestListResponse {
  success: boolean;
  data: PendingApprovalLabTestItem[];
  total: number;
  page: number | string;
  limit: number | string;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface PatientNurseTaskItem {
  id: number;
  uhid: string;
  patientId: number;
  branchId: number;
  taskDescription: string;
  status: string;
  completedAt: string | null;
  completedByName: string | null;
  completedRemark: string | null;
  createdAt: string;
}

export interface GetPatientNurseTasksParams {
  patientId: number;
  page?: number;
  limit?: number;
}

export interface GetPatientNurseTasksResponse {
  success: boolean;
  data: PatientNurseTaskItem[];
  total: number;
  page: number;
  limit: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface UpdatePatientNurseTaskStatusRequest {
  taskId: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  remark?: string;
}

export interface UpdatePatientNurseTaskStatusResponse {
  data: null;
  message: string;
  statusCode: number;
  timestamp: string;
}

function toQueryString(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const ipdStaffNurseApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getStaffNurseDashboard: builder.query<StaffNurseDashboardResponse, StaffNurseDashboardParams>({
      query: ({ branchId }) => ({
        url: `/staffNurse/dashboard${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPatientList: builder.query<GetPatientListResponse, GetPatientListParams>({
      query: (params) => ({
        url: `/staffNurse/getPatientList${toQueryString({
          branchId: params.branchId,
          search: params.search,
          sortBy: params.sortBy,
          order: params.order,
          limit: params.limit,
          page: params.page,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetAdmittedPatientList: builder.query<GetAdmittedPatientListResponse, GetAdmittedPatientListParams>({
      query: (params) => ({
        url: `/staffNurse/getAdmittedPatientList${toQueryString({
          branchId: params.branchId,
          search: params.search,
          sortBy: params.sortBy,
          order: params.order,
          limit: params.limit,
          page: params.page,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetNursePatientCount: builder.query<GetNursePatientCountResponse, GetNursePatientCountParams>({
      query: ({ branchId }) => ({
        url: `/staffNurse/getNursePatientCount${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetMedicationAlerts: builder.query<GetMedicationAlertsResponse, GetMedicationAlertsParams>({
      query: ({ branchId }) => ({
        url: `/staffNurse/getMedicationAlerts${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetMedicationDashboardSummary: builder.query<
      GetMedicationDashboardSummaryResponse,
      GetMedicationDashboardSummaryParams
    >({
      query: ({ branchId, date }) => ({
        url: `/staffNurse/getMedicationDashboardSummary${toQueryString({ branchId, date })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientMedicationList: builder.query<
      GetPatientMedicationListResponse,
      GetPatientMedicationListParams
    >({
      query: (params) => ({
        url: `/staffNurse/patientMedicationList${toQueryString({
          branchId: params.branchId,
          // date: params.date,
          page: params.page,
          limit: params.limit,
          search: params.search,
          filterStatus: params.filterStatus,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetUnassignedPatientRoomList: builder.query<
      GetUnassignedPatientRoomListResponse,
      GetUnassignedPatientRoomListParams
    >({
      query: (params) => ({
        url: `/staffNurse/getUnassignedPatientRoomList${toQueryString({
          branchId: params.branchId,
          patientId: params.patientId,
          date: params.date,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetNurseDropdown: builder.query<GetNurseDropdownResponse, GetNurseDropdownParams>({
      query: ({ branchId, date, shift }) => ({
        url: `/common/getNurseDropdown${toQueryString({ branchId, date, shift })}`,
        //  url: `/common/getNurseDropdownList${toQueryString({ branchId, date, shift })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseListRoster: builder.query<ListRosterResponse, ListRosterParams>({
      query: (params) => ({
        url: `/staffNurse/listRoster${toQueryString({
          month: params.month,
          year: params.year,
          userType: params.userType,
          rosterStatus: params.rosterStatus,
          search: params.search,
          page: params.page,
          limit: params.limit,
          branchId: params.branchId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseBulkUpsertRoster: builder.mutation<BulkUpsertRosterResponse, BulkUpsertRosterRequest>({
      query: (body) => ({
        url: "/staffNurse/bulkUpsertRoster",
        method: "POST",
        body,
      }),
    }),

    staffNurseGetRoomAssignmentList: builder.query<GetRoomAssignmentListResponse, GetRoomAssignmentListParams>({
      query: (params) => ({
        url: `/staffNurse/getRoomAssignmentList${toQueryString({
          branchId: params.branchId,
          search: params.search,
          roomUsage: params.roomUsage,
          limit: params.limit,
          page: params.page,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseAssignNurse: builder.mutation<AssignNurseResponse, AssignNurseRequest>({
      query: (body) => ({
        url: "/staffNurse/assignNurse",
        method: "POST",
        body,
      }),
    }),

    staffNurseAssignOrChangeNurse: builder.mutation<
      AssignOrChangeNurseResponse,
      AssignOrChangeNurseRequest
    >({
      query: (body) => ({
        url: "/staffNurse/assignOrChangeNurse",
        method: "POST",
        body,
      }),
    }),

    bulkReassignNurses: builder.mutation<BulkReassignNursesResponse, BulkReassignNursesRequest>({
      query: (body) => ({
        url: "/headNurse/bulkReassignNurses",
        method: "POST",
        body,
      }),
    }),

    staffNurseGetOnePatientDetail: builder.query<GetOnePatientDetailResponse, number>({
      query: (patientId) => ({
        url: `/staffNurse/getOnePatientDetail/${patientId}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetReferPatientListing: builder.query<GetReferPatientListingResponse, GetReferPatientListingParams>({
      query: (params) => ({
        url: `/staffNurse/getReferPatientListing${toQueryString({
          branchId: params.branchId,
          search: params.search,
          sortBy: params.sortBy,
          order: params.order,
          limit: params.limit,
          page: params.page,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseCreateReferPatient: builder.mutation<CreateReferPatientResponse, CreateReferPatientRequest>({
      query: (body) => ({
        url: "/staffNurse/createReferPatient",
        method: "POST",
        body,
      }),
    }),

    staffNurseUpdateReferPatient: builder.mutation<UpdateReferPatientResponse, UpdateReferPatientMutationArg>({
      query: ({ referPatientId, body }) => ({
        url: `/staffNurse/updateReferPatient/${referPatientId}`,
        method: "PUT",
        body,
      }),
    }),

    staffNurseGetPatientMedicineDetail: builder.query<
      GetPatientMedicineDetailResponse,
      GetPatientMedicineDetailParams
    >({
      query: ({ patientId, date, page, limit }) => ({
        url: `/staffNurse/patientMedicineDetail/${patientId}${toQueryString({
          date,
          page,
          limit,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientMedicineSchedule: builder.query<
      GetPatientMedicineScheduleResponse,
      GetPatientMedicineScheduleParams
    >({
      query: ({ patientId, date, patientMedicinePrescribeId }) => ({
        url: `/staffNurse/patientMedicineSchedule/${patientId}${toQueryString({
          date,
          patientMedicinePrescribeId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientMedicineList: builder.query<GetPatientMedicineListResponse, GetPatientMedicineListParams>({
      query: (params) => ({
        url: `/staffNurse/getPatientMedicineList${toQueryString({
          patientId: params.patientId,
          page: params.page,
          limit: params.limit,
          medicineStatus: params.medicineStatus,
          search: params.search,
          sortBy: params.sortBy,
          order: params.order,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientOverview: builder.query<GetPatientOverviewResponse, number>({
      query: (patientId) => ({
        url: `/staffNurse/patientOverview/${patientId}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetNursingNoteList: builder.query<GetNursingNoteListResponse, GetNursingNoteListParams>({
      query: (params) => ({
        url: `/staffNurse/getNursingNoteList${toQueryString({
          patientId: params.patientId,
          category: params.category,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page,
          limit: params.limit,
          noteAddedBy: params.noteAddedBy,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseCreateNursingNote: builder.mutation<CreateNursingNoteResponse, CreateNursingNoteRequest>({
      query: (body) => ({
        url: "/staffNurse/createNursingNote",
        method: "POST",
        body,
      }),
    }),

    staffNurseGetLabTestSummary: builder.query<GetLabTestSummaryResponse, GetLabTestSummaryParams>({
      query: (params) => ({
        url: `/staffNurse/getLabTestSummary${toQueryString({
          branchId: params.branchId,
          patientId: params.patientId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetLabTestList: builder.query<GetLabTestListResponse, GetLabTestListParams>({
      query: (params) => ({
        url: `/staffNurse/getLabTestList${toQueryString({
          patientId: params.patientId,
          page: params.page,
          limit: params.limit,
          status: params.status,
          isPending: params.isPending,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetLabTestListing: builder.query<GetLabTestListingResponse, GetLabTestListingParams>({
      query: (params) => ({
        url: `/staffNurse/getLabTestListing${toQueryString({
          page: params.page,
          limit: params.limit,
          search: params.search,
          categoryName: params.categoryName,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseCreateLabTest: builder.mutation<CreateLabTestResponse, CreateLabTestRequest>({
      query: (body) => ({
        url: "/staffNurse/createLabTest",
        method: "POST",
        body,
      }),
    }),

    staffNurseGetDistinctLabTestCategories: builder.query<GetDistinctLabTestCategoriesResponse, void>({
      query: () => ({
        url: "/common/getDistinctLabTestCategories",
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getLabTestListWithRoomDetails: builder.query<
      GetLabTestListWithRoomDetailsResponse,
      GetLabTestListWithRoomDetailsParams
    >({
      query: (params) => ({
        url: `/staffNurse/getLabTestListWithRoomDetails${toQueryString({
          page: params.page,
          limit: params.limit,
          branchId: params.branchId,
          search: params.search,
          status: params.status,
          sortBy: params.sortBy,
          order: params.order,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getLabTestCounts: builder.query<GetLabTestCountsResponse, GetLabTestCountsParams>({
      query: ({ branchId }) => ({
        url: `/staffNurse/getLabTestCounts${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getStaffNurseHistory: builder.query<GetStaffNurseHistoryResponse, GetStaffNurseHistoryParams>({
      query: ({ branchId, date }) => ({
        url: `/staffNurse/history${toQueryString({ branchId, date })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getDischargeInitiatedPatients: builder.query<
      GetDischargeInitiatedPatientsResponse,
      GetDischargeInitiatedPatientsParams
    >({
      query: (params) => ({
        url: `/staffNurse/getDischargeInitiatedPatients${toQueryString({
          branchId: params.branchId,
          page: params.page,
          limit: params.limit,
          search: params.search,
          PatientDischargeStatus: params.PatientDischargeStatus,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    createDischargePatient: builder.mutation<
      CreateDischargePatientResponse,
      CreateDischargePatientMutationArg
    >({
      query: ({ branchId, body }) => ({
        url: `/staffNurse/createPatientDischarge${toQueryString({ branchId })}`,
        method: "POST",
        body,
      }),
    }),

    viewOnePatientDischargeDetail: builder.query<ViewOnePatientDischargeDetailResponse, number>({
      query: (patientId) => ({
        url: `/staffNurse/viewOnePatientDischargeDetail/${patientId}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseAddPatientMedicine: builder.mutation<AddPatientMedicineResponse, AddPatientMedicineRequest>({
      query: (body) => ({
        url: "/staffNurse/addPatientMedicine",
        method: "POST",
        body,
      }),
    }),

    staffNurseEditPatientMedicine: builder.mutation<EditPatientMedicineResponse, EditPatientMedicineMutationArg>({
      query: ({ patientMedicineId, body }) => ({
        url: `/staffNurse/editPatientMedicine/${patientMedicineId}`,
        method: "PUT",
        body,
      }),
    }),

    staffNurseReplacePatientMedicine: builder.mutation<
      ReplacePatientMedicineResponse,
      ReplacePatientMedicineMutationArg
    >({
      query: ({ patientMedicineId, body }) => ({
        url: `/staffNurse/replacePatientMedicine/${patientMedicineId}`,
        method: "PATCH",
        body,
      }),
    }),

    staffNurseStopPatientMedicine: builder.mutation<StopPatientMedicineResponse, number>({
      query: (medicineId) => ({
        url: `/staffNurse/stopPatientMedicine/${medicineId}`,
        method: "PATCH",
      }),
    }),

    staffNurseUpdateTodayPatientMedicineDose: builder.mutation<
      UpdateTodayPatientMedicineDoseResponse,
      UpdateTodayPatientMedicineDoseRequest
    >({
      query: (body) => ({
        url: "/staffNurse/updateTodayPatientMedicineDose",
        method: "POST",
        body,
      }),
    }),

    staffNurseGetAllMedicineByBranchList: builder.query<
      GetAllMedicineByBranchListResponse,
      GetAllMedicineByBranchListParams
    >({
      query: (params) => ({
        url: `/common/GetAllMedicineByBranchList${toQueryString({
          branchId: params.branchId,
          search: params.search,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientTherapySchedule: builder.query<
      GetPatientTherapyScheduleResponse,
      GetPatientTherapyScheduleParams
    >({
      query: (params) => ({
        url: `/staffNurse/getPatientTherapySchedule${toQueryString({
          branchId: params.branchId,
          patientId: params.patientId,
          startDate: params.startDate,
          endDate: params.endDate,
          search: params.search,
          limit: params.limit,
          page: params.page,
          therapistId: params.therapistId,
          therapyType: params.therapyCategory,
          sortBy: params.sortBy,
          order: params.order,
        })}`,
        method: "GET",
      }),
      transformResponse: (response: {
        success: boolean;
        data: PatientTherapyScheduleApiItem[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        message: string;
        timestamp: string;
        statusCode: number;
      }): GetPatientTherapyScheduleResponse => ({
        ...response,
        data: (response.data ?? []).map(flattenPatientTherapyScheduleItem),
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetTherapistsList: builder.query<GetTherapistsListResponse, GetTherapistsListParams>({
      query: ({ branchId }) => ({
        url: `/staffNurse/getTherapistsList${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetTherapyScheduleSummary: builder.query<
      GetTherapyScheduleSummaryResponse,
      GetTherapyScheduleSummaryParams
    >({
      query: ({ branchId }) => ({
        url: `/staffNurse/getTherapyScheduleSummary${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientTimeline: builder.query<GetPatientTimelineResponse, GetPatientTimelineParams>({
      query: (params) => ({
        url: `/staffNurse/getPatientTimelineActivities${toQueryString({
          patientId: params.patientId,
          branchId: params.branchId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientHistory: builder.query<GetPatientHistoryResponse, GetPatientHistoryParams>({
      query: (params) => ({
        url: `/staffNurse/getPatientHistory${toQueryString({
          patientId: params.patientId,
          branchId: params.branchId,
          fromDate: params.fromDate,
          toDate: params.toDate,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetLatestVitals: builder.query<GetLatestVitalsResponse, number>({
      query: (patientId) => ({
        url: `/staffNurse/getLatestVitals${toQueryString({ patientId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientVitalsBySession: builder.query<GetPatientVitalsBySessionResponse, number>({
      query: (sessionId) => ({
        url: `/staffNurse/getPatientVitalsBySession/${sessionId}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetVitalsHistory: builder.query<GetVitalsHistoryResponse, GetVitalsHistoryParams>({
      query: (params) => ({
        url: `/staffNurse/getVitalsHistory${toQueryString({
          patientId: params.patientId,
          page: params.page,
          limit: params.limit,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseCreatePatientVitals: builder.mutation<CreatePatientVitalsResponse, CreatePatientVitalsRequest>({
      query: (body) => ({
        url: "/staffNurse/createPatientVitals",
        method: "POST",
        body,
      }),
    }),

    staffNurseDownloadVitalCsvFile: builder.query<DownloadVitalCsvFileResponse, DownloadVitalCsvFileParams>({
      query: (params) => ({
        url: `/staffNurse/dwonloadVitalCSVFile${toQueryString({
          patientId: params.patientId,
          fromDate: params.fromDate,
          toDate: params.toDate,
        })}`,
        method: "GET",
      }),
    }),

    staffNurseDownloadRosterCSVFile: builder.query<DownloadRosterFileResponse, DownloadRosterFileParams>({
      query: (params) => ({
        url: `/staffNurse/downloadRosterCSVFile${toQueryString({
          month: params.month,
          year: params.year,
          branchId: params.branchId,
        })}`,
        method: "GET",
      }),
    }),

    staffNurseDownloadRosterPDFFile: builder.query<DownloadRosterFileResponse, DownloadRosterFileParams>({
      query: (params) => ({
        url: `/staffNurse/downloadRosterPDFFile${toQueryString({
          month: params.month,
          year: params.year,
          branchId: params.branchId,
        })}`,
        method: "GET",
      }),
    }),

    staffNurseGetUnavailableBedsForDropdown: builder.query<
      GetUnavailableBedsForDropdownResponse,
      GetUnavailableBedsForDropdownParams
    >({
      query: (params) => ({
        url: `/common/getUnavailableBedsForDropdown${toQueryString({
          branchId: params.branchId,
          search: params.search,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseListNurseAssignments: builder.query<
      ListNurseAssignmentsResponse,
      ListNurseAssignmentsParams
    >({
      query: (params) => ({
        url: `/staffNurse/listNurseAssignments${toQueryString({
          branchId: params.branchId,
          shift: params.shift,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          order: params.order,
          search: params.search,
          bedNumber: params.bedNumber,
          patientStatus: params.patientStatus,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNursePatientHandover: builder.mutation<PatientHandoverResponse, PatientHandoverRequest>({
      query: (body) => ({
        url: "/staffNurse/patientHandover",
        method: "POST",
        body,
      }),
    }),

    getDietMasterDropdown: builder.query<GetDietMasterDropdownResponse, GetDietMasterDropdownParams>({
      query: ({ branchId }) => ({
        url: `/common/getDietMasterDropdown${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientTherapyScheduleList: builder.query<
      GetPatientTherapyScheduleListResponse,
      GetPatientTherapyScheduleListParams
    >({
      query: (params) => ({
        url: `/staffNurse/getPatientTherapyScheduleList${toQueryString({
          branchId: params.branchId,
          page: params.page,
          limit: params.limit,
          search: params.search,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPendingApprovalLabTestList: builder.query<
      GetPendingApprovalLabTestListResponse,
      GetPendingApprovalLabTestListParams
    >({
      query: (params) => ({
        url: `/staffNurse/getPendingApprovalLabTestList${toQueryString({
          branchId: params.branchId,
          patientId: params.patientId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseGetPatientNurseTasks: builder.query<
      GetPatientNurseTasksResponse,
      GetPatientNurseTasksParams
    >({
      query: ({ patientId, page, limit="100" }) => ({
        url: `/staffNurse/getPatientNurseTasks/${patientId}${toQueryString({ page, limit })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    staffNurseUpdatePatientNurseTaskStatus: builder.mutation<
      UpdatePatientNurseTaskStatusResponse,
      UpdatePatientNurseTaskStatusRequest
    >({
      query: ({ taskId, status, remark }) => ({
        url: `/staffNurse/updatePatientNurseTaskStatus/${taskId}`,
        method: "PATCH",
        body: { status, remark },
      }),
    }),
  }),
});

export const {
  useGetStaffNurseDashboardQuery,
  useGetPatientListQuery,
  useStaffNurseGetAdmittedPatientListQuery,
  useStaffNurseGetNursePatientCountQuery,
  useStaffNurseGetMedicationAlertsQuery,
  useStaffNurseGetMedicationDashboardSummaryQuery,
  useStaffNurseGetPatientMedicationListQuery,
  useStaffNurseGetUnassignedPatientRoomListQuery,
  useStaffNurseGetNurseDropdownQuery,
  useStaffNurseListRosterQuery,
  useStaffNurseBulkUpsertRosterMutation,
  useStaffNurseGetRoomAssignmentListQuery,
  useStaffNurseAssignNurseMutation,
  useStaffNurseAssignOrChangeNurseMutation,
  useStaffNurseGetOnePatientDetailQuery,
  useLazyStaffNurseGetOnePatientDetailQuery,
  useStaffNurseGetReferPatientListingQuery,
  useStaffNurseCreateReferPatientMutation,
  useStaffNurseUpdateReferPatientMutation,
  useStaffNurseGetPatientMedicineDetailQuery,
  useStaffNurseGetPatientMedicineScheduleQuery,
  useStaffNurseGetPatientMedicineListQuery,
  useStaffNurseGetPatientOverviewQuery,
  useStaffNurseGetNursingNoteListQuery,
  useStaffNurseCreateNursingNoteMutation,
  useStaffNurseGetLabTestSummaryQuery,
  useStaffNurseGetLabTestListQuery,
  useStaffNurseGetLabTestListingQuery,
  useStaffNurseCreateLabTestMutation,
  useStaffNurseGetDistinctLabTestCategoriesQuery,
  useGetLabTestListWithRoomDetailsQuery,
  useGetLabTestCountsQuery,
  useGetStaffNurseHistoryQuery,
  useGetDischargeInitiatedPatientsQuery,
  useCreateDischargePatientMutation,
  useViewOnePatientDischargeDetailQuery,
  useStaffNurseAddPatientMedicineMutation,
  useStaffNurseEditPatientMedicineMutation,
  useStaffNurseReplacePatientMedicineMutation,
  useStaffNurseStopPatientMedicineMutation,
  useStaffNurseUpdateTodayPatientMedicineDoseMutation,
  useStaffNurseGetAllMedicineByBranchListQuery,
  useStaffNurseGetPatientTherapyScheduleQuery,
  useStaffNurseGetTherapistsListQuery,
  useStaffNurseGetTherapyScheduleSummaryQuery,
  useStaffNurseGetPatientTimelineQuery,
  useStaffNurseGetPatientHistoryQuery,
  useStaffNurseGetLatestVitalsQuery,
  useStaffNurseGetPatientVitalsBySessionQuery,
  useStaffNurseGetVitalsHistoryQuery,
  useStaffNurseCreatePatientVitalsMutation,
  useLazyStaffNurseDownloadVitalCsvFileQuery,
  useLazyStaffNurseDownloadRosterCSVFileQuery,
  useLazyStaffNurseDownloadRosterPDFFileQuery,
  useStaffNurseGetUnavailableBedsForDropdownQuery,
  useStaffNurseListNurseAssignmentsQuery,
  useStaffNursePatientHandoverMutation,
  useGetDietMasterDropdownQuery,
  useStaffNurseGetPatientTherapyScheduleListQuery,
  useBulkReassignNursesMutation,
  useStaffNurseGetPendingApprovalLabTestListQuery,
  useStaffNurseGetPatientNurseTasksQuery,
  useStaffNurseUpdatePatientNurseTaskStatusMutation,
} = ipdStaffNurseApi;
