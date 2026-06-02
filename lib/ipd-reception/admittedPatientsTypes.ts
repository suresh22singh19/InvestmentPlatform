export interface AdmittedPatientRegistryItem {
  id: string;
  patientName: string;
  patientUhid: string;
  gender: string;
  wardBed: string;
  diagnosis: string;
  admissionDate: string;
  primaryConsultant: string;
  wardType: string;
}

export interface AdmittedPatientsRegistryStats {
  totalAdmitted: number;
  admittedSinceYesterday: number;
  bedOccupancyPercent: number;
  bedsAvailable: number;
  pendingDischarges: number;
}

export interface AdmittedPatientsListParams {
  search?: string;
  wardType?: string;
  consultant?: string;
  page?: number;
  limit?: number;
}

export interface AdmittedPatientsListResponse {
  success: boolean;
  data: AdmittedPatientRegistryItem[];
  total: number;
  limit: number;
  totalPages: number;
}
