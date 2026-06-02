import type { PendingDischargePatient } from "./pendingDischargesTypes";

export const MOCK_PENDING_DISCHARGES_TOTAL = 1000;

const BASE_PENDING_DISCHARGES: PendingDischargePatient[] = [
  {
    id: "1",
    patientName: "Ajay Kumar",
    patientUhid: "JSKL41712025",
    ageGender: "45Y / Male",
    wardBed: "General Ward A - Bed: A-12",
    doctor: "Dr. Meera Singh",
    diagnosis: "Acute Hypertension",
    admissionDate: "12 Oct 2023",
    doctorApproval: "complete",
    finalVitals: "complete",
    billStatus: "pending",
  },
  {
    id: "2",
    patientName: "Rita Devi",
    patientUhid: "JSKL41712026",
    ageGender: "52Y / Female",
    wardBed: "Private Suite B - Bed: B-08",
    doctor: "Dr. Aditi Sharma",
    diagnosis: "Type 2 Diabetes",
    admissionDate: "14 Oct 2023",
    doctorApproval: "complete",
    finalVitals: "pending",
    billStatus: "pending",
  },
  {
    id: "3",
    patientName: "Vikram Singh",
    patientUhid: "JSKL41712027",
    ageGender: "38Y / Male",
    wardBed: "Deluxe Ward - Bed: D-204",
    doctor: "Dr. Rahul Mehta",
    diagnosis: "Post-operative Recovery",
    admissionDate: "15 Oct 2023",
    doctorApproval: "pending",
    finalVitals: "pending",
    billStatus: "pending",
  },
  {
    id: "4",
    patientName: "Priya Sharma",
    patientUhid: "JSKL41712028",
    ageGender: "29Y / Female",
    wardBed: "General Ward C - Bed: C-15",
    doctor: "Dr. Manas Singh",
    diagnosis: "Chronic Asthma",
    admissionDate: "16 Oct 2023",
    doctorApproval: "complete",
    finalVitals: "complete",
    billStatus: "complete",
  },
  {
    id: "5",
    patientName: "Mohammad Asif",
    patientUhid: "JSKL41712029",
    ageGender: "61Y / Male",
    wardBed: "Private Ward A - Bed: P-102",
    doctor: "Dr. Meera Singh",
    diagnosis: "Acute Gastroenteritis",
    admissionDate: "17 Oct 2023",
    doctorApproval: "complete",
    finalVitals: "pending",
    billStatus: "pending",
  },
  {
    id: "6",
    patientName: "Sunita Devi",
    patientUhid: "JSKL41712030",
    ageGender: "48Y / Female",
    wardBed: "General Ward B - Bed: B-22",
    doctor: "Dr. Aditi Sharma",
    diagnosis: "Hypertension Management",
    admissionDate: "18 Oct 2023",
    doctorApproval: "pending",
    finalVitals: "complete",
    billStatus: "pending",
  },
];

export const MOCK_PENDING_DISCHARGES: PendingDischargePatient[] = [
  ...BASE_PENDING_DISCHARGES,
  ...Array.from({ length: 994 }, (_, index) => {
    const base = BASE_PENDING_DISCHARGES[index % BASE_PENDING_DISCHARGES.length];
    return {
      ...base,
      id: `pending-${index + 7}`,
      patientName: `${base.patientName.split(" ")[0]} Patient ${index + 7}`,
      patientUhid: `JSKL4171${String(2031 + index).padStart(4, "0")}`,
    };
  }),
];
