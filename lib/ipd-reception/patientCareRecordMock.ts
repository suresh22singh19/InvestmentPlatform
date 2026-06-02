import { MOCK_ADMITTED_PATIENTS } from "./admittedPatientsMock";
import type {
  PatientCareRecordProfile,
  PatientCareTimelineDay,
} from "./patientCareRecordTypes";

export const PATIENT_CARE_RECORD_TABS = [
  { value: "patient-summary" as const, label: "Patient Summary" },
  { value: "medications" as const, label: "Medications" },
  { value: "therapies" as const, label: "Therapies" },
  { value: "history" as const, label: "History" },
];

export const DEFAULT_CARE_RECORD_PATIENT: PatientCareRecordProfile = {
  id: "default",
  patientName: "Arjun Singh",
  uhid: "AS-9921-0812",
  age: "42 years",
  gender: "Male",
  bedNumber: "302",
  diagnosis: "Vata Imbalance",
  admissionDate: "Oct 18, 2024",
  status: "STABLE",
};

export const MOCK_PATIENT_CARE_TIMELINE: PatientCareTimelineDay[] = [
  {
    id: "today",
    dateLabel: "Today, Oct 24",
    dayBadge: "Active Day 7",
    dayBadgeVariant: "warning",
    isExpanded: true,
    vitals: {
      recordedAt: "Last: 09:15 AM",
      items: [
        { label: "Blood Pressure", value: "124/82", unit: "mmHg" },
        { label: "Pulse Rate", value: "72", unit: "bpm" },
        { label: "Temperature", value: "98.4", unit: "°F" },
        { label: "SpO2", value: "98", unit: "%" },
      ],
    },
    medications: [
      { name: "Ashwagandha Churna", time: "06:00 AM", dosage: "1 tsp", status: "given" },
      { name: "Brahmi Vati", time: "10:30 AM", dosage: "2 tabs", status: "current" },
      { name: "Dashmularishta", status: "upcoming" },
      { name: "Dashmularishta", status: "upcoming" },
    ],
    therapies: [
      {
        name: "Shirodhara",
        subtitle: "Medicated Oil",
        timeRange: "07:00 AM - 07:45 AM",
        time: "07:00 AM",
        therapist: "Ramesh K.",
        status: "completed",
      },
      {
        name: "Abhyanga",
        subtitle: "Full Body",
        timeRange: "02:00 PM - 03:00 PM",
        time: "02:00 PM",
        therapist: "Ramesh K.",
        status: "completed",
      },
    ],
    clinicalNotes: [
      {
        initials: "KS",
        authorName: "Dr. Kavita Sharma",
        role: "Senior Consultant",
        time: "10:15 AM",
        text: "Patient responding well to therapy. Continue current medication schedule.",
      },
      {
        initials: "NS",
        authorName: "Nurse Samuel Peters",
        role: "Duty Nurse",
        time: "08:45 AM",
        text: "Vitals stable. Patient ambulated with assistance. Appetite improved.",
      },
    ],
    labResults: [
      {
        name: "CBC + Serum Ferritin",
        department: "Hematology",
        reportedAt: "08:30 AM",
        status: "normal",
        statusLabel: "Normal",
      },
      {
        name: "S. Creatinine",
        department: "Biochemistry",
        reportedAt: "09:00 AM",
        status: "warning",
        statusLabel: "Slight Elevation",
      },
    ],
  },
  {
    id: "oct-23",
    dateLabel: "Wednesday, Oct 23",
    isExpanded: false,
    collapsedSummary: {
      bloodPressure: "124/82mmHg",
      pulseRate: "72bpm",
      therapies: "Abhyanga, Elakizhi",
      notesLabel: "3 Entries Recorded",
    },
  },
];

export function getPatientCareRecordProfile(patientId: string): PatientCareRecordProfile {
  const admitted = MOCK_ADMITTED_PATIENTS.find((p) => p.id === patientId);

  if (admitted) {
    const bedMatch = admitted.wardBed.match(/#(\d+)|Bed[:\s-]*([A-Za-z0-9-]+)/i);
    return {
      id: admitted.id,
      patientName: admitted.patientName,
      uhid: admitted.patientUhid,
      age: "42 years",
      gender: admitted.gender,
      bedNumber: bedMatch?.[1] ?? bedMatch?.[2] ?? "302",
      diagnosis: admitted.diagnosis,
      admissionDate: "Oct 18, 2024",
      status: "STABLE",
    };
  }

  return { ...DEFAULT_CARE_RECORD_PATIENT, id: patientId };
}
