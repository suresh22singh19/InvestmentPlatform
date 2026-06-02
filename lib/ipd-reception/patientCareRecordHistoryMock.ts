import { MOCK_PATIENT_CARE_TIMELINE } from "./patientCareRecordMock";
import type { HistoryVisit } from "./patientCareRecordTypes";

export const MOCK_PATIENT_HISTORY_VISITS: HistoryVisit[] = [
  {
    id: "visit-1",
    dateRange: "Mar 12, 2024 - Mar 26, 2024",
    admissionPeriod: "Mar 12, 2024 - Mar 26, 2024",
    primaryDiagnosis: "Chronic Digestive Dysregulation",
    seniorConsultant: "Dr. Vikram Mehra",
    diagnosis: "Chronic Digestive Dysregulation",
    doctor: "Dr. Vikram Mehra",
    timelineDays: MOCK_PATIENT_CARE_TIMELINE,
  },
  {
    id: "visit-2",
    dateRange: "Nov 04, 2023 - Nov 11, 2023",
    admissionPeriod: "Nov 04, 2023 - Nov 11, 2023",
    primaryDiagnosis: "Lumbago with Sciatica",
    seniorConsultant: "Dr. Ananya Iyer",
    diagnosis: "Lumbago with Sciatica",
    doctor: "Dr. Ananya Iyer",
  },
  {
    id: "visit-3",
    dateRange: "Jan 18, 2023 - Jan 25, 2023",
    admissionPeriod: "Jan 18, 2023 - Jan 25, 2023",
    primaryDiagnosis: "Post-Viral Respiratory Fatigue",
    seniorConsultant: "Dr. Vikram Mehra",
    diagnosis: "Post-Viral Respiratory Fatigue",
    doctor: "Dr. Vikram Mehra",
    isArchived: true,
  },
];
