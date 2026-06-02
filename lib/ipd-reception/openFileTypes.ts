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

/** Patient context for Open File flow (from ipdPatientsListing row). */
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
