import type {
  ActivityLogItem,
  ClinicalRoundItem,
  DailyOperationsStats,
  MedRoundWardSummary,
  ScheduledTherapyItem,
} from "./dailyOperationsTypes";

export const DAILY_OPERATIONS_STATS: DailyOperationsStats = {
  totalAdmissions: 142,
  admissionsTarget: 150,
  therapiesScheduled: 36,
  therapiesCompleted: 28,
  medicationsAdministered: 120,
  medicationsTotal: 130,
  staffOnDuty: 12,
  staffShiftLabel: "Full Shift",
};

export const SCHEDULED_THERAPIES_TODAY: ScheduledTherapyItem[] = [
  {
    id: "1",
    patientName: "Arjun Singh",
    bed: "204",
    therapyType: "Shirodhara",
    therapyDetail: "Oil Flow",
    therapist: "Rahul V.",
    timeSlot: "09:00 AM - 10:00 AM",
    status: "completed",
  },
  {
    id: "2",
    patientName: "Meera Kulkarni",
    bed: "109",
    therapyType: "Abhyanga",
    therapyDetail: "Massage",
    therapist: "Lakshmi S.",
    timeSlot: "11:30 AM - 12:30 PM",
    status: "upcoming",
  },
  {
    id: "3",
    patientName: "Vikram Sethi",
    bed: "109",
    therapyType: "Basti",
    therapyDetail: "Enema",
    therapist: "Amit P.",
    timeSlot: "Rescheduled",
    status: "delayed",
    statusNote: "Rescheduled",
  },
];

export const DAILY_ACTIVITY_LOG: ActivityLogItem[] = [
  {
    id: "1",
    type: "therapy",
    message: "Arjun Singh (Bed 302) started Shirodhara therapy.",
    time: "10:15 AM",
  },
  {
    id: "2",
    type: "medication",
    message: "Nurse Lakshmi completed 08:00 AM Meds for Ward B.",
    time: "09:15 AM",
  },
  {
    id: "3",
    type: "alert",
    message: "ALERT: Patient Vikram Sethi therapy rescheduled due to vitals.",
    time: "08:15 AM",
  },
  {
    id: "4",
    type: "discharge",
    message: "Patient Discharged: Ravi Verma (Ward B, Bed 104).",
    time: "07:15 AM",
  },
  {
    id: "5",
    type: "admission",
    message: "New Admission: Priya Sharma (Ward A, Bed 401).",
    time: "07:15 AM",
  },
];

export const MED_ROUNDS_SUMMARY: MedRoundWardSummary[] = [
  {
    id: "ward-a",
    wardName: "Ward A - Critical Care",
    administered: 22,
    total: 26,
    statusNote: "Status as of 10:00 AM",
  },
  {
    id: "ward-b",
    wardName: "Ward B - General Ward",
    administered: 30,
    total: 30,
    statusNote: "Completed at 08:42 AM",
  },
  {
    id: "ward-c",
    wardName: "Ward C - Therapy Recovery",
    administered: 12,
    total: 28,
    statusNote: "Next Check: 11:00 AM",
  },
];

export const CLINICAL_ROUNDS_STATUS: ClinicalRoundItem[] = [
  {
    id: "dr-1",
    doctorName: "Dr. Rajesh Khanna",
    status: "completed",
    lastRound: "09:15 AM",
    patientsLabel: "8/12 Patients",
  },
  {
    id: "dr-2",
    doctorName: "Dr. Sunita Rao",
    status: "completed",
    lastRound: "08:30 AM",
    patientsLabel: "15/15 Patients",
  },
  {
    id: "dr-3",
    doctorName: "Dr. Manish Jha",
    status: "scheduled",
    startTime: "10:30 AM",
    patientsLabel: "",
  },
];
