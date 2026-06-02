export interface RequiredDocumentItem {
  documentMasterId: number;
  documentName: string;
  isMandatory: boolean;
  sortOrder: number;
  isSubmitted: boolean;
}

/** Raw API row may use `branchid` (lowercase) or `branchId`. */
export type AwaitingPatientApiRow = AwaitingPatient & {
  branchid?: number;
};

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
  /** Filter listing by patient category (OPD vs IPD). */
  patientType?: string;
}

export type AwaitingPatientActionType = "highlight" | "standard";

/** Row shape used by the awaiting-admission table UI. */
export type IpdAwaitingPatientTableRow = AwaitingPatient & {
  waitingTimeLabel: string;
  actionType: AwaitingPatientActionType;
};
