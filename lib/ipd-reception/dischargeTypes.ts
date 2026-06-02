export type DischargeFlowStep = 1 | 2 | 3 | 4;

export type DischargePatientProfile = {
  id: string;
  patientName: string;
  uhid: string;
  age: string;
  gender: string;
  contactNumber: string;
  admissionNumber: string;
  dischargeType: string;
  bedCode: string;
};

export type MedicalClearanceForm = {
  bloodPressure: string;
  sugarLevel: string;
  temperature: string;
  pulse: string;
  spo2: string;
  postDischargeInstructions: string;
  dietGuidelines: string;
  followUpDate: string;
  emergencyWarningSigns: string;
};

export type DischargeBillingInfo = {
  totalBillAmount: number;
  amountPaid: number;
  insuranceStatus: string;
  paymentStatus: string;
  admissionDate: string;
  dischargeDate: string;
  ward: string;
  bed: string;
  doctor: string;
  diagnosis: string;
};

export type DischargeDocumentItem = {
  id: string;
  title: string;
};
