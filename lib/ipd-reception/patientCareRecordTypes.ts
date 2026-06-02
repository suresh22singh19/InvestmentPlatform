export type PatientCareRecordTab = "patient-summary" | "medications" | "therapies" | "history";

export type MedicationTimelineStatus = "given" | "late" | "upcoming" | "current";

export type TherapyTimelineStatus = "completed" | "scheduled" | "upcoming";

export type LabResultStatus = "normal" | "warning";

export type DayBadgeVariant = "success" | "warning";

export interface PatientCareRecordProfile {
  id: string;
  patientName: string;
  uhid: string;
  age: string;
  gender: string;
  bedNumber: string;
  diagnosis: string;
  admissionDate: string;
  status: string;
}

export interface TimelineVitalItem {
  label: string;
  value: string;
  unit: string;
}

export interface TimelineMedicationItem {
  name: string;
  time?: string;
  dosage?: string;
  status: MedicationTimelineStatus;
}

export interface TimelineTherapyItem {
  name: string;
  subtitle?: string;
  timeRange?: string;
  time: string;
  therapist: string;
  status: TherapyTimelineStatus;
}

export interface TimelineClinicalNote {
  initials: string;
  authorName: string;
  role: string;
  time: string;
  text: string;
}

export interface TimelineLabResult {
  name: string;
  department?: string;
  reportedAt?: string;
  status: LabResultStatus;
  statusLabel: string;
}

export interface TimelineDayCollapsedSummary {
  bloodPressure: string;
  pulseRate: string;
  therapies: string;
  notesLabel: string;
}

export interface PatientCareTimelineDay {
  id: string;
  dateLabel: string;
  dayBadge?: string;
  dayBadgeVariant?: DayBadgeVariant;
  isExpanded: boolean;
  vitals?: {
    recordedAt: string;
    items: TimelineVitalItem[];
  };
  medications?: TimelineMedicationItem[];
  therapies?: TimelineTherapyItem[];
  clinicalNotes?: TimelineClinicalNote[];
  labResults?: TimelineLabResult[];
  collapsedSummary?: TimelineDayCollapsedSummary;
}

export type MarDoseStatus = "administered" | "due-now" | "overdue" | "scheduled";

export type MarCategoryTagVariant = "success" | "warning" | "danger";

export interface MarTimeSlot {
  id: string;
  label: string;
  time: string;
}

export interface MarCategoryTag {
  label: string;
  variant: MarCategoryTagVariant;
}

export interface MarDoseCell {
  status: MarDoseStatus;
  displayTime?: string;
  scheduledTime?: string;
  administeredBy?: string;
  overdueLabel?: string;
}

export interface MarMedicationRow {
  id: string;
  name: string;
  dosage: string;
  route: string;
  instructions?: string;
  categoryTag?: MarCategoryTag;
  doses: Record<string, MarDoseCell | null>;
}

export interface TherapyWeekDay {
  id: string;
  dayLabel: string;
  dateLabel: string;
  isToday?: boolean;
  sessions: TherapyWeekSession[];
}

export interface TherapyWeekSession {
  id: string;
  time: string;
  name: string;
  location?: string;
  sessionLabel?: string;
  status: "done" | "scheduled" | "missed";
}

export interface HistoryVisitDay {
  id: string;
  dateLabel: string;
  vitals?: TimelineVitalItem[];
  medications?: { name: string; statusLabel: string }[];
  therapies?: { name: string; statusLabel: string }[];
  clinicalNotes?: TimelineClinicalNote[];
  isAdmission?: boolean;
  admissionDetail?: string;
}

export interface HistoryVisit {
  id: string;
  dateRange: string;
  admissionPeriod: string;
  primaryDiagnosis: string;
  seniorConsultant: string;
  diagnosis: string;
  doctor: string;
  isArchived?: boolean;
  timelineDays?: PatientCareTimelineDay[];
  days?: HistoryVisitDay[];
}
