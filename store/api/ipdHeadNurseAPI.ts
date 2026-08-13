/**
 * IPD Head Nurse API — RTK Query endpoints
 */

import { baseApi } from "./baseApi";

export interface HeadNurseDashboardBeds {
  count: number;
  occupied: number;
  vacant: number;
  reserved: number;
  underCleaning: number;
}

export interface HeadNurseDashboardData {
  beds: HeadNurseDashboardBeds;
  admissionsToday: {
    count: number;
    lastAdmission: string | null;
  };
  overdueMedicineCount: number;
  readyForDischargeCount: number;
  pendingMedicineCount: number;
  pendingVitalCount: number;
  pendingTaskCount: number;
}

export interface HeadNurseDashboardResponse {
  success: boolean;
  data: HeadNurseDashboardData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface HeadNurseDashboardParams {
  branchId: number;
}

export interface AssignedPatientListItem {
  id: number;
  patientCurrentConditionStatus:string;
  patientTitle:string;
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
  nurseId: number;
  nurseName: string;
  allocationStatus: string;
  allocationDate: string;
}

export interface GetPatientAssignToNurseListParams {
  branchId: number;
  search?: string;
  sortBy?: string;
  order?: "ASC" | "DESC";
  limit?: number;
  page?: number;
}

export interface GetPatientAssignToNurseListResponse {
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

export interface AdmittedPatientListItem {
  id: number;
  floorNumber:string;
  packageStartDate?:string,
  patientTitle:string;
  patientName: string;
  age: string;
  packageName?:string,
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

export interface PendingOverdueTaskItem {
  id: number;
  taskName: string;
  patientId: number;
  patientName: string;
  patientTitle: string;
  nurseName: string;
  bedNumber: string;
  roomNumber: string;
  status: string;
  createdAt: string;
  time: string;
}

export interface GetPendingOverdueTasksParams {
  branchId: number;
}

export interface GetPendingOverdueTasksResponse {
  success: boolean;
  data: PendingOverdueTaskItem[];
  total: number;
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
  patientTitle?: string;
  branchId: number;
  bedNumber: string;
  bedStatus: string;
  packageEndDate?: string | null;
  nurses?: UnassignedPatientRoomBedNurse[];
  packageName?: string;
  packageStartDate?: string;
}

export interface UnassignedPatientRoomData {
  roomId: number;
  roomNumber: string;
  roomType: string;
  roomTypeCode?: string;
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

export interface GetUnassignedRoomListParams {
  branchId: number;
  buildingId?: number | string;
  floorId?: number | string;
  roomId?: number | string;
  date?: string;
}

export interface GetUnassignedRoomListResponse {
  success: boolean;
  data: UnassignedPatientRoomData[];
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

export interface GetNursesWithoutRosterParams {
  branchId: number;
  month?: number;
  year?: number;
}

export interface GetNursesWithoutRosterResponse {
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
  employmentStatus?: string | null;
  lastWorkingDate?: string | null;
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
  patientTitle:string;
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
  packageStartDate?:  string | null;
  packageEndDate?: string | null;
  nurses: RoomAssignmentNurse[];
  age?: string | null,
  gender?: string | null,
  packageName?:string ,
  packageDate?: string,
 
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
  floorId?: number | string;
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
  pendingApprovals:number;
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
  assignmentId?: number;
  therapyDate: string;
  patientTitle:string;
  status: string;
  session?: PatientTherapyScheduleSessionInfo | null;
  branchId?: number;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  patientVitalsId?: number | null;
  therapyId?: number;
  therapyName: string;
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

export interface AssignedPatientTherapySessionInfo {
  sessionId: number;
  therapyDate: string;
  status: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  patientVitalsId: number | null;
}

export interface AssignedPatientTherapyScheduleItem {
  assignmentId: number;
  branchId: number;
  therapyId: number;
  therapyName: string;
  category: string | null;
  patientId: number;
  registrationId: number;
  uhid: string;
  patientName: string | null;
  patientTitle?: string | null;
  therapistId: number | null;
  therapistName: string | null;
  roomId: number | null;
  roomNumber: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  session: AssignedPatientTherapySessionInfo;
}

export interface AssignedPatientTherapyScheduleApiItem
  extends Omit<AssignedPatientTherapyScheduleItem, "session"> {
  therapyScheduleDate?: string | null;
  session: AssignedPatientTherapySessionInfo | null;
}

function flattenAssignedPatientTherapyScheduleItem(
  item: AssignedPatientTherapyScheduleApiItem
): AssignedPatientTherapyScheduleItem {
  const { session, therapyScheduleDate, ...rest } = item;

  return {
    ...rest,
    session: {
      sessionId: session?.sessionId ?? item.assignmentId,
      therapyDate: session?.therapyDate ?? therapyScheduleDate ?? "",
      status: session?.status ?? "scheduled",
      actualStartTime: session?.actualStartTime ?? null,
      actualEndTime: session?.actualEndTime ?? null,
      patientVitalsId: session?.patientVitalsId ?? null,
    },
  };
}

export interface GetAssignedPatientTherapyScheduleParams {
  branchId: number;
  patientId: number;
  startDate?: string;
  endDate?: string;
}

export interface GetAssignedPatientTherapyScheduleResponse {
  success: boolean;
  data: AssignedPatientTherapyScheduleItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface GetAssignedPatientTherapyScheduleApiResponse {
  success: boolean;
  data: AssignedPatientTherapyScheduleApiItem[];
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


export interface BulkNurseAssignmentItem {
  patientId: number;
  nurseId: number;
}

export interface BulkNurseAssignmentRequest {
  shiftDate: string;
  shift: string;
  assign: BulkNurseAssignmentItem[];
}

export interface BulkNurseAssignmentResponse {
  success: boolean;
  data: Record<string, never>;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface ShiftWiseNurseRosterBed {
  buildingName: string;
  floorName: string;
  roomNumber: string;
  roomType: string;
  bedNumber: string;
  shift: string;
  patientId: number;
  patientName: string;
  patientTitle: string;
  uhid: string;
  age: string;
  gender: string;
  roomId: number;
  floorId: number;
  buildingId: number;
}

export interface ShiftWiseNurseRosterNurse {
  nurseId: number;
  nurseName: string;
  assigned: boolean;
  assignedBeds: ShiftWiseNurseRosterBed[];
}

export interface ShiftWiseNurseRosterShift {
  label: string;
  assignedCount: number;
  idleCount: number;
  totalBedsAssigned: number;
  nurses: ShiftWiseNurseRosterNurse[];
}

export interface ShiftWiseNurseRosterData {
  date: string;
  shifts: {
    morning: ShiftWiseNurseRosterShift;
    evening: ShiftWiseNurseRosterShift;
    night: ShiftWiseNurseRosterShift;
  };
  totalBed: number;
}

export interface GetShiftWiseNurseRosterParams {
  branchId: number;
  date: string;
  buildingId?: number | string;
  floorId?: number | string;
  roomType?: string;
  search?: string;
}

export interface GetShiftWiseNurseRosterResponse {
  success: boolean;
  data: ShiftWiseNurseRosterData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface YesterdayNurseAssignmentItem {
  id: number;
  allocationDate: string;
  shift: string;
  bedNumber: string;
  nurseId: number;
  nurseName: string;
  nurseEmpId: string;
  roomId: number;
  roomNumber: string;
  roomType: string;
  floorId: number;
  floor: string;
  buildingId: number;
  buildingName: string;
}

export interface GetYesterdayNurseAssignmentsParams {
  branchId: number;
  shift: string;
  roomIds: string;
}

export interface GetYesterdayNurseAssignmentsResponse {
  success: boolean;
  data: YesterdayNurseAssignmentItem[];
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

export interface UpdateDutyRosterForNurseExitRequest {
  branchId: number;
  nurseId: number;
  lastWorkingDate: string;
}

export interface UpdateDutyRosterForNurseExitResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
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

export const ipdHeadNurseApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getHeadNurseDashboard: builder.query<HeadNurseDashboardResponse, HeadNurseDashboardParams>({
      query: ({ branchId }) => ({
        url: `/headNurse/dashboard${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPatientAssignToNurseList: builder.query<
      GetPatientAssignToNurseListResponse,
      GetPatientAssignToNurseListParams
    >({
      query: (params) => ({
        url: `/headNurse/getPatientAssignToNurseList${toQueryString({
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

    getAdmittedPatientList: builder.query<GetAdmittedPatientListResponse, GetAdmittedPatientListParams>({
      query: (params) => ({
        url: `/headNurse/getAdmittedPatientList${toQueryString({
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

    getNursePatientCount: builder.query<GetNursePatientCountResponse, GetNursePatientCountParams>({
      query: ({ branchId }) => ({
        url: `/headNurse/getNursePatientCount${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getMedicationAlerts: builder.query<GetMedicationAlertsResponse, GetMedicationAlertsParams>({
      query: ({ branchId }) => ({
        url: `/headNurse/getMedicationAlerts${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPendingOverdueTasks: builder.query<
      GetPendingOverdueTasksResponse,
      GetPendingOverdueTasksParams
    >({
      query: ({ branchId }) => ({
        url: `/headNurse/getPendingOverdueTasks${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getMedicationDashboardSummary: builder.query<
      GetMedicationDashboardSummaryResponse,
      GetMedicationDashboardSummaryParams
    >({
      query: ({ branchId, date }) => ({
        url: `/headNurse/getMedicationDashboardSummary${toQueryString({ branchId, date })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPatientMedicationList: builder.query<
      GetPatientMedicationListResponse,
      GetPatientMedicationListParams
    >({
      query: (params) => ({
        url: `/headNurse/patientMedicationList${toQueryString({
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

    getUnassignedPatientRoomList: builder.query<
      GetUnassignedPatientRoomListResponse,
      GetUnassignedPatientRoomListParams
    >({
      query: (params) => ({
        url: `/headNurse/getUnassignedPatientRoomList${toQueryString({
          branchId: params.branchId,
          patientId: params.patientId,
          date: params.date,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getUnassignedRoomList: builder.query<GetUnassignedRoomListResponse, GetUnassignedRoomListParams>({
      query: (params) => ({
        url: `/headNurse/getUnassignedPatientRoomList${toQueryString({
          branchId: params.branchId,
          buildingId: params.buildingId,
          floorId: params.floorId,
          roomId: params.roomId,
          date: params.date,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getNurseDropdown: builder.query<GetNurseDropdownResponse, GetNurseDropdownParams>({
      query: ({ branchId, date, shift }) => ({
        url: `/common/getNurseDropdownList${toQueryString({ branchId, date, shift })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getstaffNurseDropdown: builder.query<GetNurseDropdownResponse, GetNurseDropdownParams>({
      query: ({ branchId, date, shift }) => ({
        url: `/common/getNurseDropdown${toQueryString({ branchId, date, shift })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getNursesWithoutRoster: builder.query<
      GetNursesWithoutRosterResponse,
      GetNursesWithoutRosterParams
    >({
      query: ({ branchId, month, year }) => ({
        url: `/headNurse/getNursesWithoutRoster${toQueryString({ branchId, month, year })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    listRoster: builder.query<ListRosterResponse, ListRosterParams>({
      query: (params) => ({
        url: `/headNurse/listRoster${toQueryString({
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

    bulkUpsertRoster: builder.mutation<BulkUpsertRosterResponse, BulkUpsertRosterRequest>({
      query: (body) => ({
        url: "/headNurse/bulkUpsertRoster",
        method: "POST",
        body,
      }),
    }),

    getRoomAssignmentList: builder.query<GetRoomAssignmentListResponse, GetRoomAssignmentListParams>({
      query: (params) => ({
        url: `/headNurse/getRoomAssignmentList${toQueryString({
          branchId: params.branchId,
          search: params.search,
          roomUsage: params.roomUsage,
          floorId: params.floorId,
          limit: params.limit,
          page: params.page,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    assignNurse: builder.mutation<AssignNurseResponse, AssignNurseRequest>({
      query: (body) => ({
        url: "/headNurse/assignNurse",
        method: "POST",
        body,
      }),
    }),

    assignOrChangeNurse: builder.mutation<
      AssignOrChangeNurseResponse,
      AssignOrChangeNurseRequest
    >({
      query: (body) => ({
        url: "/headNurse/assignOrChangeNurse",
        method: "POST",
        body,
      }),
    }),

    getOnePatientDetail: builder.query<GetOnePatientDetailResponse, number>({
      query: (patientId) => ({
        url: `/headNurse/getOnePatientDetail/${patientId}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getReferPatientListing: builder.query<GetReferPatientListingResponse, GetReferPatientListingParams>({
      query: (params) => ({
        url: `/headNurse/getReferPatientListing${toQueryString({
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

    createReferPatient: builder.mutation<CreateReferPatientResponse, CreateReferPatientRequest>({
      query: (body) => ({
        url: "/headNurse/createReferPatient",
        method: "POST",
        body,
      }),
    }),

    updateReferPatient: builder.mutation<UpdateReferPatientResponse, UpdateReferPatientMutationArg>({
      query: ({ referPatientId, body }) => ({
        url: `/headNurse/updateReferPatient/${referPatientId}`,
        method: "PUT",
        body,
      }),
    }),

    getPatientMedicineDetail: builder.query<
      GetPatientMedicineDetailResponse,
      GetPatientMedicineDetailParams
    >({
      query: ({ patientId, date, page, limit }) => ({
        url: `/headNurse/patientMedicineDetail/${patientId}${toQueryString({
          date,
          page,
          limit,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPatientMedicineSchedule: builder.query<
      GetPatientMedicineScheduleResponse,
      GetPatientMedicineScheduleParams
    >({
      query: ({ patientId, date, patientMedicinePrescribeId }) => ({
        url: `/headNurse/patientMedicineSchedule/${patientId}${toQueryString({
          date,
          patientMedicinePrescribeId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPatientMedicineList: builder.query<GetPatientMedicineListResponse, GetPatientMedicineListParams>({
      query: (params) => ({
        url: `/headNurse/getPatientMedicineList${toQueryString({
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

    getPatientOverview: builder.query<GetPatientOverviewResponse, number>({
      query: (patientId) => ({
        url: `/headNurse/patientOverview/${patientId}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getNursingNoteList: builder.query<GetNursingNoteListResponse, GetNursingNoteListParams>({
      query: (params) => ({
        url: `/headNurse/getNursingNoteList${toQueryString({
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

    createNursingNote: builder.mutation<CreateNursingNoteResponse, CreateNursingNoteRequest>({
      query: (body) => ({
        url: "/headNurse/createNursingNote",
        method: "POST",
        body,
      }),
    }),

    getLabTestSummary: builder.query<GetLabTestSummaryResponse, GetLabTestSummaryParams>({
      query: (params) => ({
        url: `/headNurse/getLabTestSummary${toQueryString({
          branchId: params.branchId,
          patientId: params.patientId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getLabTestList: builder.query<GetLabTestListResponse, GetLabTestListParams>({
      query: (params) => ({
        url: `/headNurse/getLabTestList${toQueryString({
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

    getLabTestListing: builder.query<GetLabTestListingResponse, GetLabTestListingParams>({
      query: (params) => ({
        url: `/headNurse/getLabTestListing${toQueryString({
          page: params.page,
          limit: params.limit,
          search: params.search,
          categoryName: params.categoryName,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    createLabTest: builder.mutation<CreateLabTestResponse, CreateLabTestRequest>({
      query: (body) => ({
        url: "/headNurse/createLabTest",
        method: "POST",
        body,
      }),
    }),

    getDistinctLabTestCategories: builder.query<GetDistinctLabTestCategoriesResponse, void>({
      query: () => ({
        url: "/common/getDistinctLabTestCategories",
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPendingApprovalLabTestList: builder.query<
      GetPendingApprovalLabTestListResponse,
      GetPendingApprovalLabTestListParams
    >({
      query: (params) => ({
        url: `/headNurse/getPendingApprovalLabTestList${toQueryString({
          branchId: params.branchId,
          patientId: params.patientId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    addPatientMedicine: builder.mutation<AddPatientMedicineResponse, AddPatientMedicineRequest>({
      query: (body) => ({
        url: "/headNurse/addPatientMedicine",
        method: "POST",
        body,
      }),
    }),

    editPatientMedicine: builder.mutation<EditPatientMedicineResponse, EditPatientMedicineMutationArg>({
      query: ({ patientMedicineId, body }) => ({
        url: `/headNurse/editPatientMedicine/${patientMedicineId}`,
        method: "PUT",
        body,
      }),
    }),

    replacePatientMedicine: builder.mutation<
      ReplacePatientMedicineResponse,
      ReplacePatientMedicineMutationArg
    >({
      query: ({ patientMedicineId, body }) => ({
        url: `/headNurse/replacePatientMedicine/${patientMedicineId}`,
        method: "PATCH",
        body,
      }),
    }),

    stopPatientMedicine: builder.mutation<StopPatientMedicineResponse, number>({
      query: (medicineId) => ({
        url: `/headNurse/stopPatientMedicine/${medicineId}`,
        method: "PATCH",
      }),
    }),

    updateTodayPatientMedicineDose: builder.mutation<
      UpdateTodayPatientMedicineDoseResponse,
      UpdateTodayPatientMedicineDoseRequest
    >({
      query: (body) => ({
        url: "/headNurse/updateTodayPatientMedicineDose",
        method: "POST",
        body,
      }),
    }),

    getAllMedicineByBranchList: builder.query<
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

    getPatientTherapySchedule: builder.query<
      GetPatientTherapyScheduleResponse,
      GetPatientTherapyScheduleParams
    >({
      query: (params) => ({
        url: `/headNurse/getTherapyScheduleList${toQueryString({
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

    getAssignedPatientTherapySchedule: builder.query<
      GetAssignedPatientTherapyScheduleResponse,
      GetAssignedPatientTherapyScheduleParams
    >({
      query: (params) => ({
        url: `/headNurse/getPatientTherapySchedule${toQueryString({
          branchId: params.branchId,
          patientId: params.patientId,
          startDate: params.startDate,
          endDate: params.endDate,
        })}`,
        method: "GET",
      }),
      transformResponse: (response: GetAssignedPatientTherapyScheduleApiResponse) => ({
        ...response,
        data: (response.data ?? []).map(flattenAssignedPatientTherapyScheduleItem),
      }),
      keepUnusedDataFor: 0,
    }),

    getTherapistsList: builder.query<GetTherapistsListResponse, GetTherapistsListParams>({
      query: ({ branchId }) => ({
        url: `/headNurse/getTherapistsList${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getTherapyScheduleSummary: builder.query<
      GetTherapyScheduleSummaryResponse,
      GetTherapyScheduleSummaryParams
    >({
      query: ({ branchId }) => ({
        url: `/headNurse/getTherapyScheduleSummary${toQueryString({ branchId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPatientTimeline: builder.query<GetPatientTimelineResponse, GetPatientTimelineParams>({
      query: (params) => ({
        url: `/headNurse/getPatientTimeline${toQueryString({
          patientId: params.patientId,
          branchId: params.branchId,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPatientHistory: builder.query<GetPatientHistoryResponse, GetPatientHistoryParams>({
      query: (params) => ({
        url: `/headNurse/getPatientHistory${toQueryString({
          patientId: params.patientId,
          branchId: params.branchId,
          fromDate: params.fromDate,
          toDate: params.toDate,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getLatestVitals: builder.query<GetLatestVitalsResponse, number>({
      query: (patientId) => ({
        url: `/headNurse/getLatestVitals${toQueryString({ patientId })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getPatientVitalsBySession: builder.query<GetPatientVitalsBySessionResponse, number>({
      query: (sessionId) => ({
        url: `/headNurse/getPatientVitalsBySession/${sessionId}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getVitalsHistory: builder.query<GetVitalsHistoryResponse, GetVitalsHistoryParams>({
      query: (params) => ({
        url: `/headNurse/getVitalsHistory${toQueryString({
          patientId: params.patientId,
          page: params.page,
          limit: params.limit,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    createPatientVitals: builder.mutation<CreatePatientVitalsResponse, CreatePatientVitalsRequest>({
      query: (body) => ({
        url: "/headNurse/createPatientVitals",
        method: "POST",
        body,
      }),
    }),

    downloadVitalCsvFile: builder.query<DownloadVitalCsvFileResponse, DownloadVitalCsvFileParams>({
      query: (params) => ({
        url: `/headNurse/dwonloadVitalCSVFile${toQueryString({
          patientId: params.patientId,
          fromDate: params.fromDate,
          toDate: params.toDate,
        })}`,
        method: "GET",
      }),
    }),

    downloadRosterCSVFile: builder.query<DownloadRosterFileResponse, DownloadRosterFileParams>({
      query: (params) => ({
        url: `/headNurse/downloadRosterCSVFile${toQueryString({
          month: params.month,
          year: params.year,
          branchId: params.branchId,
        })}`,
        method: "GET",
      }),
    }),

    downloadRosterPDFFile: builder.query<DownloadRosterFileResponse, DownloadRosterFileParams>({
      query: (params) => ({
        url: `/headNurse/downloadRosterPDFFile${toQueryString({
          month: params.month,
          year: params.year,
          branchId: params.branchId,
        })}`,
        method: "GET",
      }),
    }),

    getUnavailableBedsForDropdown: builder.query<
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

    listNurseAssignments: builder.query<
      ListNurseAssignmentsResponse,
      ListNurseAssignmentsParams
    >({
      query: (params) => ({
        url: `/headNurse/listNurseAssignments${toQueryString({
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

    patientHandover: builder.mutation<PatientHandoverResponse, PatientHandoverRequest>({
      query: (body) => ({
        url: "/headNurse/patientHandover",
        method: "POST",
        body,
      }),
    }),

    bulkNurseAssignment: builder.mutation<BulkNurseAssignmentResponse, BulkNurseAssignmentRequest>({
      query: (body) => ({
        // url: "/headNurse/bulkNurseAssignment",
        url: "/headNurse/bulkReassignNurses",
        method: "POST",
        body,
      }),
    }),
        getPatientTherapyScheduleList: builder.query<
          GetPatientTherapyScheduleListResponse,
          GetPatientTherapyScheduleListParams
        >({
          query: (params) => ({
            url: `/headNurse/getPatientTherapyScheduleList${toQueryString({
              branchId: params.branchId,
              page: params.page,
              limit: params.limit,
              search: params.search,
            })}`,
            method: "GET",
          }),
          keepUnusedDataFor: 0,
        }),

    getYesterdayNurseAssignments: builder.query<
      GetYesterdayNurseAssignmentsResponse,
      GetYesterdayNurseAssignmentsParams
    >({
      query: (params) => ({
        url: `/headNurse/getYesterdayNurseAssignments${toQueryString({
          branchId: params.branchId,
          shift: params.shift,
          roomIds: params.roomIds,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    getShiftWiseNurseRoster: builder.query<GetShiftWiseNurseRosterResponse, GetShiftWiseNurseRosterParams>({
      query: (params) => ({
        url: `/headNurse/getShiftWiseNurseRoster${toQueryString({
          branchId: params.branchId,
          date: params.date,
          buildingId: params.buildingId,
          floorId: params.floorId,
          roomType: params.roomType,
          search: params.search,
        })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    updateDutyRosterForNurseExit: builder.mutation<
      UpdateDutyRosterForNurseExitResponse,
      UpdateDutyRosterForNurseExitRequest
    >({
      query: (body) => ({
        url: "/headNurse/updateDutyRosterForNurseExit",
        method: "PUT",
        body,
      }),
    }),

    getPatientNurseTasks: builder.query<GetPatientNurseTasksResponse, GetPatientNurseTasksParams>({
      query: ({ patientId, page, limit="100" }) => ({
        url: `/headNurse/getPatientNurseTasks/${patientId}${toQueryString({ page, limit })}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
    }),

    updatePatientNurseTaskStatus: builder.mutation<
      UpdatePatientNurseTaskStatusResponse,
      UpdatePatientNurseTaskStatusRequest
    >({
      query: ({ taskId, status, remark }) => ({
        url: `/headNurse/updatePatientNurseTaskStatus/${taskId}`,
        method: "PATCH",
        body: { status, remark },
      }),
    }),
  }),
});

export const {
  useGetHeadNurseDashboardQuery,
  useGetPatientAssignToNurseListQuery,
  useGetAdmittedPatientListQuery,
  useGetNursePatientCountQuery,
  useGetMedicationAlertsQuery,
  useGetPendingOverdueTasksQuery,
  useGetMedicationDashboardSummaryQuery,
  useGetPatientMedicationListQuery,
  useGetUnassignedPatientRoomListQuery,
  useGetUnassignedRoomListQuery,
  useGetNurseDropdownQuery,
  useListRosterQuery,
  useBulkUpsertRosterMutation,
  useGetRoomAssignmentListQuery,
  useAssignNurseMutation,
  useAssignOrChangeNurseMutation,
  useGetOnePatientDetailQuery,
  useLazyGetOnePatientDetailQuery,
  useGetReferPatientListingQuery,
  useCreateReferPatientMutation,
  useUpdateReferPatientMutation,
  useGetPatientMedicineDetailQuery,
  useGetPatientMedicineScheduleQuery,
  useGetPatientMedicineListQuery,
  useGetPatientOverviewQuery,
  useGetNursingNoteListQuery,
  useCreateNursingNoteMutation,
  useGetLabTestSummaryQuery,
  useGetLabTestListQuery,
  useGetLabTestListingQuery,
  useCreateLabTestMutation,
  useGetDistinctLabTestCategoriesQuery,
  useGetPendingApprovalLabTestListQuery,
  useAddPatientMedicineMutation,
  useEditPatientMedicineMutation,
  useReplacePatientMedicineMutation,
  useStopPatientMedicineMutation,
  useUpdateTodayPatientMedicineDoseMutation,
  useGetAllMedicineByBranchListQuery,
  useGetPatientTherapyScheduleQuery,
  useGetAssignedPatientTherapyScheduleQuery,
  useGetTherapistsListQuery,
  useGetTherapyScheduleSummaryQuery,
  useGetPatientTimelineQuery,
  useGetPatientHistoryQuery,
  useGetLatestVitalsQuery,
  useGetPatientVitalsBySessionQuery,
  useGetVitalsHistoryQuery,
  useCreatePatientVitalsMutation,
  useLazyDownloadVitalCsvFileQuery,
  useLazyDownloadRosterCSVFileQuery,
  useLazyDownloadRosterPDFFileQuery,
  useGetUnavailableBedsForDropdownQuery,
  useListNurseAssignmentsQuery,
  usePatientHandoverMutation,
  useGetPatientTherapyScheduleListQuery,
  useBulkNurseAssignmentMutation,
  useGetShiftWiseNurseRosterQuery,
  useLazyGetYesterdayNurseAssignmentsQuery,
  useGetstaffNurseDropdownQuery,
  useGetNursesWithoutRosterQuery,
  useUpdateDutyRosterForNurseExitMutation,
  useGetPatientNurseTasksQuery,
  useUpdatePatientNurseTaskStatusMutation,
} = ipdHeadNurseApi;
