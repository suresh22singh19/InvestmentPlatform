import type {
  DischargeBillingInfo,
  DischargeDocumentItem,
  DischargePatientProfile,
  MedicalClearanceForm,
} from "./dischargeTypes";
import { MOCK_ADMITTED_PATIENTS } from "./admittedPatientsMock";
import { MOCK_PENDING_DISCHARGES } from "./pendingDischargesMock";

export const DISCHARGE_STEP_LABELS = [
  "Medical Clearance",
  "Billing & Payment",
  "Document Generation",
  "Final Sign-off",
] as const;

export const DEFAULT_DISCHARGE_PATIENT: DischargePatientProfile = {
  id: "default",
  patientName: "Arjun Singh",
  uhid: "AS-0921-0812",
  age: "42 years",
  gender: "Male",
  contactNumber: "9876543210",
  admissionNumber: "IPD-230127-1845",
  dischargeType: "Normal Discharge",
  bedCode: "PR-3",
};

export const INITIAL_MEDICAL_CLEARANCE_FORM: MedicalClearanceForm = {
  bloodPressure: "120/80",
  sugarLevel: "88",
  temperature: "98.6",
  pulse: "72",
  spo2: "95",
  postDischargeInstructions:
    "Tab Paracetamol 500mg - 1 tab tid for 3 days, Tab Amoxicillin 500mg - 1 tab tid for 5 days",
  dietGuidelines: "Light diet for 2 days, then normal diet. Avoid spicy food.",
  followUpDate: "",
  emergencyWarningSigns:
    "Watch for fever, severe pain, or discharge from surgical site.",
};

export const DISCHARGE_BILLING_INFO: DischargeBillingInfo = {
  totalBillAmount: 105000,
  amountPaid: 35000,
  insuranceStatus: "None",
  paymentStatus: "Pending",
  admissionDate: "19/5/2026",
  dischargeDate: "25/5/2026",
  ward: "Private Room",
  bed: "PR-5",
  doctor: "Dr. Neha Kapoor",
  diagnosis: "Fracture - Right Femur",
};

export const DISCHARGE_DOCUMENT_SECTIONS: {
  title: string;
  items: DischargeDocumentItem[];
  variant?: "print" | "invoice";
}[] = [
  {
    title: "Discharge Documents",
    items: [
      { id: "discharge-summary", title: "Discharge Summary" },
      { id: "prescription", title: "Prescription" },
    ],
  },
  {
    title: "Laboratory Reports",
    items: [
      { id: "cbc", title: "CBC Report" },
      { id: "hba1c", title: "HbA1c Report" },
      { id: "lft", title: "LFT Report" },
      { id: "kft", title: "KFT Report" },
      { id: "lipid", title: "Lipid Profile Report" },
    ],
  },
  {
    title: "Radiology Reports",
    items: [
      { id: "xray", title: "X-Ray Chest" },
      { id: "ct-kidney", title: "CT Scan Kidney" },
      { id: "mri-brain", title: "MRI Brain" },
      { id: "ultrasound", title: "Ultrasound Abdomen" },
    ],
  },
  {
    title: "Billing",
    variant: "invoice",
    items: [
      { id: "medicines-invoice", title: "Medicines Invoice" },
      { id: "lab-invoice", title: "Lab Test Invoice" },
    ],
  },
];

export function getDischargePatientProfile(patientId: string): DischargePatientProfile {
  const admitted = MOCK_ADMITTED_PATIENTS.find((p) => p.id === patientId);

  if (admitted) {
    const bedMatch = admitted.wardBed.match(/Bed[:\s#-]*([A-Za-z0-9-]+)/i);
    return {
      id: admitted.id,
      patientName: admitted.patientName,
      uhid: admitted.patientUhid,
      age: "42 years",
      gender: admitted.gender,
      contactNumber: "9876543210",
      admissionNumber: DEFAULT_DISCHARGE_PATIENT.admissionNumber,
      dischargeType: "Normal Discharge",
      bedCode: bedMatch?.[1] ?? admitted.wardBed,
    };
  }

  const pending = MOCK_PENDING_DISCHARGES.find((p) => p.id === patientId);

  if (pending) {
    const [age, gender] = pending.ageGender.split(" / ");
    const bedMatch = pending.wardBed.match(/Bed[:\s#-]*([A-Za-z0-9-]+)/i);
    return {
      id: pending.id,
      patientName: pending.patientName,
      uhid: pending.patientUhid,
      age: age ?? "42 years",
      gender: gender ?? "Male",
      contactNumber: "9876543210",
      admissionNumber: DEFAULT_DISCHARGE_PATIENT.admissionNumber,
      dischargeType: "Normal Discharge",
      bedCode: bedMatch?.[1] ?? "PR-3",
    };
  }

  return {
    ...DEFAULT_DISCHARGE_PATIENT,
    id: patientId,
  };
}

export function formatIndianCurrency(amount: number): string {
  return `₹ ${amount.toLocaleString("en-IN")}`;
}
