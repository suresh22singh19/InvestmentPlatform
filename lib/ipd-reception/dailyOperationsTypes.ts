export type TherapyScheduleStatus = "completed" | "upcoming" | "delayed";

export type ActivityLogType = "therapy" | "medication" | "alert" | "discharge" | "admission";

export interface DailyOperationsStats {
  totalAdmissions: number;
  admissionsTarget: number;
  therapiesScheduled: number;
  therapiesCompleted: number;
  medicationsAdministered: number;
  medicationsTotal: number;
  staffOnDuty: number;
  staffShiftLabel: string;
}

export interface ScheduledTherapyItem {
  id: string;
  patientName: string;
  bed: string;
  therapyType: string;
  therapyDetail: string;
  therapist: string;
  timeSlot: string;
  status: TherapyScheduleStatus;
  statusNote?: string;
}

export interface ActivityLogItem {
  id: string;
  type: ActivityLogType;
  message: string;
  time: string;
}

export interface MedRoundWardSummary {
  id: string;
  wardName: string;
  administered: number;
  total: number;
  statusNote: string;
}

export interface ClinicalRoundItem {
  id: string;
  doctorName: string;
  status: "completed" | "scheduled";
  lastRound?: string;
  startTime?: string;
  patientsLabel: string;
}
