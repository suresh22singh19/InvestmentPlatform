import type {
  AdmittedPatientRegistryItem,
  AdmittedPatientsRegistryStats,
} from "./admittedPatientsTypes";

export const ADMITTED_PATIENTS_REGISTRY_STATS: AdmittedPatientsRegistryStats = {
  totalAdmitted: 142,
  admittedSinceYesterday: 5,
  bedOccupancyPercent: 84,
  bedsAvailable: 24,
  pendingDischarges: 15,
};

export const ADMITTED_PATIENTS_WARD_OPTIONS = [
  { value: "", label: "Ward Type" },
  { value: "general", label: "General Ward" },
  { value: "private-suite", label: "Private Suite" },
  { value: "private-ward", label: "Private Ward" },
  { value: "deluxe", label: "Deluxe" },
];

export const ADMITTED_PATIENTS_CONSULTANT_OPTIONS = [
  { value: "", label: "Primary Consultant" },
  { value: "dr-aditi", label: "Dr. Aditi Sharma" },
  { value: "dr-rahul", label: "Dr. Rahul Mehta" },
  { value: "dr-manas", label: "Dr. Manas Singh" },
];

export const MOCK_ADMITTED_PATIENTS_TOTAL = 1000;

const BASE_ADMITTED_PATIENTS: AdmittedPatientRegistryItem[] = [
  {
    id: "1",
    patientName: "Ajay Kumar",
    patientUhid: "JSKL41712023",
    gender: "Male",
    wardBed: "Private Suite A - Bed #102",
    diagnosis: "Acute Hypertension",
    admissionDate: "12 Oct 2023, 09:45 AM",
    primaryConsultant: "Dr. Aditi Sharma",
    wardType: "private-suite",
  },
  {
    id: "2",
    patientName: "Rita Devi",
    patientUhid: "JSKL41712024",
    gender: "Female",
    wardBed: "General Ward B - Bed #205",
    diagnosis: "Type 2 Diabetes",
    admissionDate: "14 Oct 2023, 11:20 AM",
    primaryConsultant: "Dr. Rahul Mehta",
    wardType: "general",
  },
  {
    id: "3",
    patientName: "Vikram Singh",
    patientUhid: "JSKL41712025",
    gender: "Male",
    wardBed: "Deluxe-A / 204",
    diagnosis: "Post-operative Recovery",
    admissionDate: "15 Oct 2023, 08:15 AM",
    primaryConsultant: "Dr. Rahul Mehta",
    wardType: "deluxe",
  },
  {
    id: "4",
    patientName: "Priya Sharma",
    patientUhid: "JSKL41712025",
    gender: "Female",
    wardBed: "ICU - ICU-3",
    diagnosis: "Acute Hypertension",
    admissionDate: "16 Oct 2023, 02:30 PM",
    primaryConsultant: "Dr. Aditi Sharma",
    wardType: "private-ward",
  },
  {
    id: "5",
    patientName: "Mohammad Asif",
    patientUhid: "JSKL41712027",
    gender: "Male",
    wardBed: "General Ward A - Bed #108",
    diagnosis: "Acute Gastroenteritis",
    admissionDate: "17 Oct 2023, 06:00 AM",
    primaryConsultant: "Dr. Manas Singh",
    wardType: "general",
  },
  {
    id: "6",
    patientName: "Sunita Devi",
    patientUhid: "JSKL41712028",
    gender: "Female",
    wardBed: "Private Suite B - Bed #115",
    diagnosis: "Hypertension Management",
    admissionDate: "18 Oct 2023, 10:10 AM",
    primaryConsultant: "Dr. Aditi Sharma",
    wardType: "private-suite",
  },
];

export const MOCK_ADMITTED_PATIENTS: AdmittedPatientRegistryItem[] = [
  ...BASE_ADMITTED_PATIENTS,
  ...Array.from({ length: 994 }, (_, index) => {
    const base = BASE_ADMITTED_PATIENTS[index % BASE_ADMITTED_PATIENTS.length];
    return {
      ...base,
      id: `admitted-${index + 7}`,
      patientName: `${base.patientName.split(" ")[0]} Patient ${index + 7}`,
      patientUhid: `JSKL4171${String(2029 + index).padStart(4, "0")}`,
    };
  }),
];
