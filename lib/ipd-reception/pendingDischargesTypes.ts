export type DischargeStepStatus = "complete" | "pending";

export type PendingDischargePatient = {
  id: string;
  patientName: string;
  patientUhid: string;
  ageGender: string;
  wardBed: string;
  doctor: string;
  diagnosis: string;
  admissionDate: string;
  doctorApproval: DischargeStepStatus;
  finalVitals: DischargeStepStatus;
  billStatus: DischargeStepStatus;
};
