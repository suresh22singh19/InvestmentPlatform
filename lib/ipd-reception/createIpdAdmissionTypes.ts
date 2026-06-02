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
  /** Clinical note for pantry (Step 1 “Clinical Note for Pantry”). */
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
