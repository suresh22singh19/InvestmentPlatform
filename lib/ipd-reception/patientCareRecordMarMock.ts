import type { MarMedicationRow, MarTimeSlot } from "./patientCareRecordTypes";

export const MAR_DATE_LABEL = "MAR - Today, 24 May 2024";

export const MAR_TIME_SLOTS: MarTimeSlot[] = [
  { id: "morning", label: "Morning", time: "08:00" },
  { id: "late-morning", label: "Late Morning", time: "10:00" },
  { id: "noon", label: "Noon", time: "12:00" },
  { id: "afternoon", label: "Afternoon", time: "14:00" },
  { id: "evening", label: "Evening", time: "18:00" },
  { id: "dinner", label: "Dinner", time: "20:00" },
  { id: "night", label: "Night", time: "22:00" },
];

export const MAR_MEDICATION_ROWS: MarMedicationRow[] = [
  {
    id: "med-1",
    name: "Pancha Tikta Ghruta Guggulu",
    dosage: "2 Tablets",
    route: "Oral",
    instructions: "After Food",
    categoryTag: { label: "Anti-Inflammatory", variant: "success" },
    doses: {
      morning: {
        status: "administered",
        displayTime: "08:05",
        administeredBy: "AL",
      },
      "late-morning": null,
      noon: null,
      afternoon: {
        status: "administered",
        displayTime: "02:10",
        administeredBy: "AL",
      },
      evening: null,
      dinner: null,
      night: { status: "scheduled", scheduledTime: "10:00 PM" },
    },
  },
  {
    id: "med-2",
    name: "Pancha Tikta Ghruta Guggulu",
    dosage: "2 Tablets",
    route: "Oral",
    instructions: "After Food",
    categoryTag: { label: "Rejuvenator", variant: "warning" },
    doses: {
      morning: null,
      "late-morning": { status: "due-now", scheduledTime: "10:00 AM" },
      noon: null,
      afternoon: null,
      evening: { status: "scheduled", scheduledTime: "06:00 PM" },
      dinner: null,
      night: null,
    },
  },
  {
    id: "med-3",
    name: "Brahmi Vati",
    dosage: "1 Tablet",
    route: "Oral",
    instructions: "Empty Stomach",
    categoryTag: { label: "Cognitive Support", variant: "danger" },
    doses: {
      morning: null,
      "late-morning": {
        status: "overdue",
        scheduledTime: "10:00 AM",
        overdueLabel: "-45 mins",
      },
      noon: null,
      afternoon: null,
      evening: { status: "scheduled", scheduledTime: "06:00 PM" },
      dinner: null,
      night: null,
    },
  },
];
