import type { AppointmentDetailItem } from "@/components/ui/AppointmentDetailCard";
import type { DietPlanEntry } from "@/components/ui/DietPlanCard";
import type { MedicalInformationItem } from "@/components/ui/MedicalInformationCard";
import type { OtherInformationItem } from "@/components/ui/OtherInformationCard";
import type { PatientDetailsBadge, PatientDetailsInfoItem } from "@/components/ui/PatientDetailsCard";
import type { PatientInformationTimelineItem } from "@/components/ui/PatientInformationTimelineCard";
import type { ReferralPatientInfoItem } from "@/components/ui/referralPatientInfo";
import type { VitalItem } from "@/components/ui/VitalsCard";

type IpdPatientOverviewData = {
  registration?: {
    patient_title?: string | null;
    patient_name?: string | null;
    contact_number?: string | null;
    whatsapp_no?: string | null;
    age?: number | string | null;
    gender?: string | null;
    blood_group?: string | null;
    patient_type?: string | null;
    guardian_title?: string | null;
    guardian_name?: string | null;
    marital_status?: string | null;
    email_address?: string | null;
    aadhar_card_no?: string | null;
    height?: string | number | null;
    weight?: string | number | null;
    diet_type?: string | null;
    occupation?: string | null;
    religion?: string | null;
    patient_sub_type?: string | null;
    benificiary_id?: string | null;
    insurance_company?: string | null;
    ayush_covered?: string | null;
    js_health_card_no?: string | null;
    allergies?: string | null;
    surgeries?: string | null;
  } | null;
  appointment?: {
    appointment_date?: string | null;
    time_slot?: string | null;
    token?: string | null;
    doctor_fee?: string | null;
    diagnosis_symptoms?: string | null;
    created_at?: string | null;
    allergies?: string | null;
    surgeries?: string | null;
  } | null;
  vitals?: {
    blood_group?: string | null;
    blood_pressure?: string | null;
    sugar_level?: string | null;
    temperature?: string | null;
    pulse?: string | null;
    spo2?: string | null;
    height?: string | number | null;
    weight?: string | number | null;
    diet_type?: string | null;
    notes?: string | null;
    allergies?: string | null;
    surgeries?: string | null;
  } | null;
  assignedRoom?: {
    roomNumber?: string | number | null;
    roomType?: string | null;
    bedNumber?: string | number | null;
    attendantBedNumber?: string | number | null;
    remark?: string | null;
  } | null;
  patientRefferal?: {
    source?: string | null;
    sub_source?: string | null;
    referral_doctor?: string | null;
    referral_name?: string | null;
    mobile?: string | null;
  } | null;
  uhid?: string | null;
  patientId?: number | null;
  admissionType?: string | null;
  admissionScheduleType?: string | null;
  admissionLabel?: string | null;
  counsellorName?: string | null;
  doctorName?: string | null;
  patientAdmitted?: string | boolean | null;
  admissionDate?: string | null;
};

function na(value: unknown): string {
  if (value == null || value === "") return "N/A";
  return String(value);
}

function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBloodGroup(value: string | null | undefined): string {
  if (!value) return "N/A";

  const normalized = value.trim().toLowerCase();
  if (!normalized) return "N/A";

  const match = normalized.match(/^(a|b|ab|o)[\s-_]*(positive|negative|\+|-)$/i);
  if (match) {
    const group = match[1].toUpperCase();
    const sign = match[2] === "negative" || match[2] === "-" ? "-" : "+";
    return `${group}${sign}`;
  }

  const compact = normalized.replace(/\s+/g, "");
  if (/^(a|b|ab|o)[+-]$/i.test(compact)) {
    return compact.toUpperCase();
  }

  return value;
}

const BLOOD_GROUP_BADGE_CLASS =
  "inline-flex h-[30px] min-w-[86px] me-2 items-center justify-center rounded-[30px] border px-5 text-xs font-medium border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";

const PATIENT_TYPE_BADGE_CLASS =
  "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]";

export type ReceptionViewPatientViewModel = {
  name: string;
  subtitle: string;
  uhid: string;
  healthCardNumber: string;
  badges: PatientDetailsBadge[];
  infoItems: PatientDetailsInfoItem[];
  appointmentItems: AppointmentDetailItem[];
  vitals: VitalItem[];
  medicalItems: MedicalInformationItem[];
  otherItems: OtherInformationItem[];
  referralItems: ReferralPatientInfoItem[];
  dietDecoction: string;
  dietRows: DietPlanEntry[][];
  timelineItems: PatientInformationTimelineItem[];
};

export function mapIpdPatientOverviewToView(
  data: IpdPatientOverviewData | undefined
): ReceptionViewPatientViewModel | null {
  if (!data) return null;

  const reg = data.registration;
  const appt = data.appointment;
  const vitals = data.vitals;
  const room = data.assignedRoom;
  const referral = data.patientRefferal;

  const patientName = [reg?.patient_title, reg?.patient_name].filter(Boolean).join(" ").trim() || "N/A";
  const contact = reg?.contact_number ?? reg?.whatsapp_no;
  const age = reg?.age != null ? `${reg.age} Years` : "N/A";
  const gender = reg?.gender ? capitalizeWords(reg.gender) : "N/A";

  const bloodGroup = formatBloodGroup(vitals?.blood_group ?? reg?.blood_group);
  const patientType = reg?.patient_type;

  const badges: PatientDetailsBadge[] = [];
  if (bloodGroup !== "N/A") {
    badges.push({ label: bloodGroup, className: BLOOD_GROUP_BADGE_CLASS });
  }
  if (patientType) {
    badges.push({
      label: capitalizeWords(patientType.replace(/_/g, " ")),
      className: PATIENT_TYPE_BADGE_CLASS,
    });
  }

  const guardianName = [reg?.guardian_title, reg?.guardian_name].filter(Boolean).join(" ").trim();

  const infoItems: PatientDetailsInfoItem[] = [
    {
      iconSrc: "/icons/UserGear.svg",
      iconAlt: "Guardian",
      label: "Father's/Husband's Name",
      value: guardianName || "N/A",
    },
    {
      iconSrc: "/icons/gendericon.svg",
      iconAlt: "Marital Status",
      label: "Marital Status",
      value: reg?.marital_status ? capitalizeWords(reg.marital_status) : "N/A",
    },
    {
      iconSrc: "/icons/mapicon.svg",
      iconAlt: "Email",
      label: "Email",
      value: na(reg?.email_address),
    },
    {
      iconSrc: "/icons/adharcardicon.svg",
      iconAlt: "Aadhar",
      label: "Aadhar Card Number",
      value: na(reg?.aadhar_card_no),
    },
  ];

  const appointmentItems: AppointmentDetailItem[] = [
    { label: "UHID", value: na(data.uhid) },
    { label: "Patient ID", value: na(data.patientId) },
    { label: "Admission Type", value: na(data.admissionType) },
    { label: "Admission Schedule", value: na(data.admissionScheduleType) },
    { label: "Admission Label", value: na(data.admissionLabel) },
    { label: "Counsellor", value: na(data.counsellorName) },
    { label: "Doctor", value: na(data.doctorName) },
    { label: "Patient Admitted", value: na(data.patientAdmitted) },
    { label: "Admission Date", value: formatDate(data.admissionDate) },
    { label: "Appointment Date", value: formatDate(appt?.appointment_date) },
    { label: "Time Slot", value: na(appt?.time_slot) },
    { label: "Token", value: na(appt?.token) },
    { label: "Doctor OPD Fee", value: na(appt?.doctor_fee) },
    { label: "Room Number", value: na(room?.roomNumber) },
    { label: "Room Type", value: na(room?.roomType) },
    { label: "Bed Number", value: na(room?.bedNumber) },
    { label: "Attendant Bed", value: na(room?.attendantBedNumber) },
    {
      label: "Remark",
      value: na(room?.remark ?? vitals?.notes ?? appt?.diagnosis_symptoms),
      multiline: true,
    },
    { label: "Created Date", value: formatDateTime(appt?.created_at) },
  ];

  const vitalsItems: VitalItem[] = [
    { label: "Blood Pressure", value: na(vitals?.blood_pressure), unit: "bp" },
    { label: "Sugar Level", value: na(vitals?.sugar_level), unit: "mg/dL" },
    { label: "Temperature", value: na(vitals?.temperature), unit: "" },
    { label: "Heart Rate", value: na(vitals?.pulse), unit: "bpm" },
    { label: "SpO2", value: na(vitals?.spo2), unit: "%" },
    { label: "Height", value: na(vitals?.height ?? reg?.height), unit: "cm" },
    { label: "Weight", value: na(vitals?.weight ?? reg?.weight), unit: "kg" },
  ].filter((item) => item.value !== "N/A");

  const medicalItems: MedicalInformationItem[] = [
    { label: "Blood Group", value: na(bloodGroup) },
    { label: "Allergies", value: na(vitals?.allergies ?? reg?.allergies ?? appt?.allergies) },
    { label: "Surgeries", value: na(vitals?.surgeries ?? reg?.surgeries ?? appt?.surgeries) },
    { label: "Height", value: na(vitals?.height ?? reg?.height) },
    { label: "Weight", value: na(vitals?.weight ?? reg?.weight) },
    {
      label: "Diet Type",
      value: na(vitals?.diet_type ?? reg?.diet_type),
    },
    { label: "Occupation", value: na(reg?.occupation) },
    { label: "Religion", value: reg?.religion ? capitalizeWords(reg.religion) : "N/A" },
    {
      label: "Remark",
      value: na(vitals?.notes),
      multiline: true,
    },
  ];

  const otherItems: OtherInformationItem[] = [
    { label: "Patient Type", value: na(reg?.patient_type) },
    { label: "Patient Sub Type", value: na(reg?.patient_sub_type) },
    { label: "Beneficiary ID", value: na(reg?.benificiary_id) },
    { label: "Insurance Company", value: na(reg?.insurance_company) },
    { label: "Ayush Covered", value: na(reg?.ayush_covered) },
  ];

  const referralItems: ReferralPatientInfoItem[] = [
    { label: "Source", value: na(referral?.source) },
    { label: "Sub Source", value: na(referral?.sub_source) },
    { label: "Referral Doctor", value: na(referral?.referral_doctor) },
    { label: "Referral Name", value: na(referral?.referral_name) },
    { label: "Mobile", value: na(referral?.mobile) },
  ];

  const dietType = vitals?.diet_type ?? reg?.diet_type ?? "N/A";

  return {
    name: patientName,
    subtitle: `Contact Number: ${na(contact)} • Age : ${age} • Gender : ${gender}`,
    uhid: na(data.uhid),
    healthCardNumber: na(reg?.js_health_card_no),
    badges,
    infoItems,
    appointmentItems,
    vitals: vitalsItems.length > 0 ? vitalsItems : [{ label: "Blood Pressure", value: "N/A", unit: "bp" }],
    medicalItems,
    otherItems,
    referralItems,
    dietDecoction: dietType !== "N/A" ? dietType : "—",
    dietRows: [],
    timelineItems: [],
  };
}
