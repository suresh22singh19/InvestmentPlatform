export interface IpdPatientOverviewAppointment {
  id?: number;
  uhid?: string;
  branch_id?: number;
  doctor_user_id?: number;
  appointment_date?: string | null;
  time_slot?: string | null;
  token?: string | null;
  status?: string | null;
  doctor_fee?: string | null;
  diagnosis_symptoms?: string | null;
  allergies?: string | null;
  surgeries?: string | null;
  created_at?: string | null;
}

export interface IpdPatientOverviewRegistration {
  id?: number;
  uhid?: string;
  patient_name?: string;
  patient_title?: string | null;
  gender?: string | null;
  age?: string | number | null;
  contact_number?: number | string | null;
  whatsapp_no?: string | null;
  email_address?: string | null;
  marital_status?: string | null;
  aadhar_card_no?: string | null;
  occupation?: string | null;
  guardian_name?: string | null;
  guardian_title?: string | null;
  diet_type?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  surgeries?: string | null;
  height?: string | null;
  weight?: string | null;
  patient_type?: string | null;
  patient_sub_type?: string | null;
  benificiary_id?: string | null;
  insurance_company?: string | null;
  ayush_covered?: string | null;
  religion?: string | null;
  js_health_card_no?: string | null;
  is_referral?: boolean | null;
}

export interface IpdPatientOverviewVitals {
  height?: string | null;
  weight?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  surgeries?: string | null;
  diet_type?: string | null;
  blood_pressure?: string | null;
  sugar_level?: string | null;
  temperature?: string | null;
  pulse?: string | null;
  spo2?: string | null;
  respiratory_rate?: string | null;
  pain_scale?: string | null;
  notes?: string | null;
}

export interface IpdPatientOverviewReferral {
  source?: string | null;
  sub_source?: string | null;
  referral_doctor?: string | null;
  referral_name?: string | null;
  mobile?: string | null;
}

export interface IpdPatientOverviewAssignedRoom {
  roomNumber?: string | null;
  roomType?: string | null;
  bedNumber?: string | null;
  attendantBedNumber?: string | null;
  remark?: string | null;
}

export interface IpdPatientOverviewData {
  patientId: number;
  uhid: string;
  admissionType?: string | null;
  admissionScheduleType?: string | null;
  admissionLabel?: string | null;
  counsellorName?: string | null;
  doctorName?: string | null;
  patientAdmitted?: string | null;
  admissionDate?: string | null;
  appointment?: IpdPatientOverviewAppointment | null;
  registration?: IpdPatientOverviewRegistration | null;
  vitals?: IpdPatientOverviewVitals | null;
  patientRefferal?: IpdPatientOverviewReferral | null;
  // assignedRoom?: IpdPatientOverviewAssignedRoom | null;
    roomType?: IpdPatientOverviewAssignedRoom | null;
}

export interface IpdPatientOverviewResponse {
  success: boolean;
  data: IpdPatientOverviewData;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

export interface IpdPatientOverviewParams {
  patientId: number;
  branchId?: number;
}
