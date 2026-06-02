import type { DischargeTypeValue } from "./dischargeTypeOptions";

export type HistoricalPatientOutcome = DischargeTypeValue;

export interface HistoricalPatientRegistryItem {
  id: string;
  patientName: string;
  patientUhid: string;
  admissionDate: string;
  dischargeDate: string;
  finalDiagnosis: string;
  attendingConsultant: string;
  consultantSpecialty?: string;
  outcome: HistoricalPatientOutcome;
}

export interface HistoricalPatientsListParams {
  search?: string;
  datePeriod?: string;
  dischargeOutcome?: string;
  consultant?: string;
  page?: number;
  limit?: number;
}
