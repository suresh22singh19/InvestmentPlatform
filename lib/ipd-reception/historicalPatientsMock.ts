import type { HistoricalPatientRegistryItem } from "./historicalPatientsTypes";

export const HISTORICAL_DATE_PERIOD_OPTIONS = [
  { value: "", label: "Date Period" },
  { value: "last-7", label: "Last 7 Days" },
  { value: "last-30", label: "Last 30 Days" },
  { value: "last-90", label: "Last 3 Months" },
  { value: "last-year", label: "Last Year" },
];

export const HISTORICAL_DISCHARGE_OUTCOME_OPTIONS = [
  { value: "", label: "Discharge Outcome" },
  { value: "normal", label: "Normal Discharge" },
  { value: "lama", label: "LAMA" },
  { value: "dopr", label: "DOPR" },
  { value: "dama", label: "DAMA" },
];

export const HISTORICAL_CONSULTANT_OPTIONS = [
  { value: "", label: "Primary Consultant" },
  { value: "dr-aditi", label: "Dr. Aditi Sharma" },
  { value: "dr-rahul", label: "Dr. Rahul Mehta" },
  { value: "dr-manas", label: "Dr. Manas Singh" },
  { value: "dr-meera", label: "Dr. Meera Singh" },
];

export const MOCK_HISTORICAL_PATIENTS_TOTAL = 1000;

const BASE_HISTORICAL_PATIENTS: HistoricalPatientRegistryItem[] = [
  {
    id: "h1",
    patientName: "Ajay Kumar",
    patientUhid: "JSKL41712025",
    admissionDate: "12 Oct 2023",
    dischargeDate: "18 Oct 2023",
    finalDiagnosis: "Acute Hypertension",
    attendingConsultant: "Dr. Aditi Sharma",
    consultantSpecialty: "Cardiology",
    outcome: "normal",
  },
  {
    id: "h2",
    patientName: "Rohit Singh",
    patientUhid: "JSKL41712025",
    admissionDate: "12 Oct 2023",
    dischargeDate: "18 Oct 2023",
    finalDiagnosis: "Type 2 Diabetes",
    attendingConsultant: "Dr. Rahul Mehta",
    consultantSpecialty: "Endocrinology",
    outcome: "lama",
  },
  {
    id: "h3",
    patientName: "Ajeet Kumar",
    patientUhid: "JSKL41712025",
    admissionDate: "12 Oct 2023",
    dischargeDate: "18 Oct 2023",
    finalDiagnosis: "Chronic Asthma",
    attendingConsultant: "Dr. Manas Singh",
    consultantSpecialty: "Pulmonology",
    outcome: "dopr",
  },
  {
    id: "h4",
    patientName: "Priya Sharma",
    patientUhid: "JSKL41712026",
    admissionDate: "05 Sep 2023",
    dischargeDate: "14 Sep 2023",
    finalDiagnosis: "Vata Imbalance",
    attendingConsultant: "Dr. Aditi Sharma",
    consultantSpecialty: "Ayurveda",
    outcome: "normal",
  },
  {
    id: "h5",
    patientName: "Vikram Sethi",
    patientUhid: "JSKL41712027",
    admissionDate: "20 Aug 2023",
    dischargeDate: "28 Aug 2023",
    finalDiagnosis: "Post-operative Recovery",
    attendingConsultant: "Dr. Meera Singh",
    consultantSpecialty: "General Surgery",
    outcome: "normal",
  },
  {
    id: "h6",
    patientName: "Meera Kulkarni",
    patientUhid: "JSKL41712028",
    admissionDate: "01 Jul 2023",
    dischargeDate: "10 Jul 2023",
    finalDiagnosis: "Acute Gastroenteritis",
    attendingConsultant: "Dr. Rahul Mehta",
    consultantSpecialty: "Gastroenterology",
    outcome: "lama",
  },
];

export const MOCK_HISTORICAL_PATIENTS: HistoricalPatientRegistryItem[] = [
  ...BASE_HISTORICAL_PATIENTS,
  ...Array.from({ length: 994 }, (_, index) => {
    const base = BASE_HISTORICAL_PATIENTS[index % BASE_HISTORICAL_PATIENTS.length];
    return {
      ...base,
      id: `historical-${index + 7}`,
      patientName: `${base.patientName.split(" ")[0]} Patient ${index + 7}`,
      patientUhid: `JSKL4171${String(2030 + index).padStart(4, "0")}`,
    };
  }),
];
