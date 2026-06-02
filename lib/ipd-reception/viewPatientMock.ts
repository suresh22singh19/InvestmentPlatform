import type { AppointmentDetailItem } from "@/components/ui/AppointmentDetailCard";
import type { DietPlanEntry } from "@/components/ui/DietPlanCard";
import type { MedicalInformationItem } from "@/components/ui/MedicalInformationCard";
import type { OtherInformationItem } from "@/components/ui/OtherInformationCard";
import type { PatientDetailsBadge, PatientDetailsInfoItem } from "@/components/ui/PatientDetailsCard";
import type { PatientFileItem } from "@/components/ui/PatientFilesCard";
import type { PatientInformationTimelineItem } from "@/components/ui/PatientInformationTimelineCard";
import type { PatientWalletDetailItem } from "@/components/ui/PatientWalletInformationCard";
import type { ReferralPatientInfoItem } from "@/components/ui/referralPatientInfo";
import type { VitalItem } from "@/components/ui/VitalsCard";
import { MOCK_HISTORICAL_PATIENTS } from "./historicalPatientsMock";

export type PrescribedMedicineItem = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
};

export const RECEPTION_VIEW_PATIENT_APPOINTMENT: AppointmentDetailItem[] = [
  { label: "UHID", value: "UH20259786" },
  { label: "IPD ID", value: "696735" },
  { label: "Branch", value: "HIIMS Dera Bassi" },
  { label: "Doctor", value: "Dr. Satyam Pratap Singh" },
  { label: "Doctor OPD Fee", value: "500" },
  { label: "Entry Fee", value: "100" },
  { label: "Appointment Date", value: "26-11-2023" },
  { label: "Time Slot", value: "10:11:53" },
  { label: "Created Date", value: "26-11-2023 10:34 AM" },
  {
    label: "Remark",
    value: "Mild abdominal discomfort and reduced appetite for the past 24 hours.",
    multiline: true,
  },
];

export const RECEPTION_VIEW_PATIENT_WALLET_DETAILS: PatientWalletDetailItem[] = [
  { label: "Package", value: "Madhumeh Mukti" },
  { label: "Amount", value: "Rs. 32000" },
  { label: "Discount", value: "0%" },
  { label: "Expiry", value: "01 May 2025" },
];

export const RECEPTION_VIEW_PATIENT_REFERRAL: ReferralPatientInfoItem[] = [
  { label: "Source", value: "N/A" },
  { label: "Sub Source", value: "N/A" },
  { label: "Referral Doctor", value: "N/A" },
  { label: "Referral Name", value: "N/A" },
  { label: "Mobile", value: "N/A" },
];

export const RECEPTION_VIEW_PATIENT_BADGES: PatientDetailsBadge[] = [
  {
    label: "AB+",
    className:
      "inline-flex h-[30px] min-w-[86px] me-2 items-center justify-center rounded-[30px] border px-5 text-xs font-medium border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]",
  },
  {
    label: "Private",
    className:
      "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]",
  },
];

export const RECEPTION_VIEW_PATIENT_INFO: PatientDetailsInfoItem[] = [
  {
    iconSrc: "/icons/UserGear.svg",
    iconAlt: "User",
    label: "Father's/Husband's Name",
    value: "Edward Jones",
  },
  {
    iconSrc: "/icons/gendericon.svg",
    iconAlt: "Marital Status",
    label: "Marital Status",
    value: "Married",
  },
  {
    iconSrc: "/icons/mapicon.svg",
    iconAlt: "Address",
    label: "Address",
    value: "123 Main Street, City, State, ZIP",
  },
  {
    iconSrc: "/icons/adharcardicon.svg",
    iconAlt: "Aadhar",
    label: "Aadhar Card Number",
    value: "135331313131",
  },
];

export const RECEPTION_VIEW_PATIENT_VITALS: VitalItem[] = [
  { label: "Blood Pressure", value: "125/85", unit: "bp" },
  { label: "Sugar Level", value: "115", unit: "mg/dL" },
  { label: "Temperature", value: "98", unit: "" },
  { label: "Heart Rate", value: "92", unit: "bpm" },
];

export const RECEPTION_VIEW_PATIENT_DIET_ROWS: DietPlanEntry[][] = [
  [
    { label: "Dinner Time", value: "07:00" },
    { label: "Sleeping Time", value: "22:00" },
    { label: "Wake up Time", value: "05:00" },
  ],
  [
    { label: "Lunch/Meal", value: "9 days" },
    { label: "Evening Meal", value: "9 days" },
    { label: "Morning Meal", value: "9 days" },
  ],
  [
    { label: "Herbal Water", value: "9 days" },
    { label: "Beverage Water", value: "9 days" },
    { label: "Room Service", value: "Yes", hidden: true },
  ],
];

export const RECEPTION_VIEW_PATIENT_MEDICINES: PrescribedMedicineItem[] = [
  {
    id: "1",
    name: "Paracetamol 500 mg",
    dosage: "1 Tablet",
    frequency: "Thrice Daily",
    timing: "After Food",
    duration: "5 Days",
  },
  {
    id: "2",
    name: "Pantoprazole 40 mg",
    dosage: "1 Tablet",
    frequency: "Once Daily",
    timing: "Before Breakfast",
    duration: "7 Days",
  },
];

export const RECEPTION_VIEW_PATIENT_TIMELINE: PatientInformationTimelineItem[] = [
  {
    dateLabel: "21/10/2024 – Follow-up Visit",
    detail: {
      primaryComplaintTitle: "Chief Complaint",
      primaryComplaintText:
        "Mild abdominal discomfort and reduced appetite for the past 24 hours.",
      detailsTitle: "Symptoms",
      detailsItems: [
        "Intermittent abdominal cramps",
        "Mild nausea, no vomiting",
        "Feeling weak and less active",
      ],
      medicinesTitle: "Medicines Prescribed",
      medicines: RECEPTION_VIEW_PATIENT_MEDICINES,
    },
  },
  { dateLabel: "22/10/2024" },
  { dateLabel: "23/10/2024" },
];

export const RECEPTION_VIEW_PATIENT_MEDICAL: MedicalInformationItem[] = [
  { label: "Diagnosis", value: "Alopecia" },
  { label: "Disease", value: "Alopecia Areata" },
  { label: "Blood Group", value: "A+" },
  { label: "Allergies", value: "No" },
  { label: "Surgeries", value: "No" },
  { label: "Addiction", value: "No" },
  { label: "Height", value: "5.5" },
  { label: "Weight", value: "55kg" },
  { label: "Diet Type", value: "Vegetarian" },
  {
    label: "Remark",
    value: "Mild abdominal discomfort and reduced appetite for the past 24 hours.",
    multiline: true,
  },
];

export const RECEPTION_VIEW_PATIENT_FILES: PatientFileItem[] = [
  { name: "Checkup Result.pdf", size: "230kb" },
  { name: "Dental x-ray result.pdf", size: "230kb" },
  { name: "Medical Prescription.pdf", size: "180kb" },
];

export const RECEPTION_VIEW_PATIENT_OTHER: OtherInformationItem[] = [
  { label: "Patient Type", value: "Private" },
  { label: "Patient Sub Type", value: "N/A" },
  { label: "Beneficiary ID", value: "N/A" },
  { label: "Insurance Company", value: "N/A" },
  { label: "Ayush Covered", value: "N/A" },
];

export const RECEPTION_VIEW_PATIENT_DEFAULT = {
  name: "Jacob Jones",
  subtitle: "Contact Number: 9876543210 • Age : 42 Years • Gender : Male",
  healthCardNumber: "505030333879",
  walletRemaining: "Rs. 7000.00",
};

export function getReceptionViewPatientDisplay(patientId: string) {
  const historical = MOCK_HISTORICAL_PATIENTS.find((p) => p.id === patientId);
  if (historical) {
    return {
      name: historical.patientName,
      subtitle: `Contact Number: 9876543210 • Age : 42 Years • Gender : Male`,
      uhid: historical.patientUhid,
    };
  }

  return {
    name: RECEPTION_VIEW_PATIENT_DEFAULT.name,
    subtitle: RECEPTION_VIEW_PATIENT_DEFAULT.subtitle,
    uhid: "UH20259786",
  };
}
