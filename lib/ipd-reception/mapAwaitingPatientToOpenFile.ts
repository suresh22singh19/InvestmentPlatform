import type { AwaitingPatient, OpenFilePatientDetails } from "./types";

function displayValue(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatLabelFromSlug(value: string): string {
  return capitalizeWords(value.replace(/_/g, " ").replace(/-/g, " "));
}

/** Ward line from ipdPatientsListing row (roomType, roomNumber, bedNumber). */
export function formatWardFromListingPatient(patient: AwaitingPatient): string {
  const parts = [
    patient.roomType?.trim() ? formatLabelFromSlug(patient.roomType) : null,
    // patient.roomNumber?.trim() ? `Room ${patient.roomNumber.trim()}` : null,
    // patient.bedNumber?.trim() ? `Bed ${patient.bedNumber.trim()}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "—";
}

/** Maps dashboard listing row → Open File step 1 & 2 view model (no overview API). */
export function mapAwaitingPatientToOpenFile(
  patient: AwaitingPatient | undefined
): OpenFilePatientDetails | null {
  if (!patient) return null;

  const admissionType = patient.admissionType
    ? formatLabelFromSlug(patient.admissionType)
    : "—";

  const wardAssigned = formatWardFromListingPatient(patient);
  const consultant = displayValue(patient.doctorName);
  const billingType = admissionType;

  const clinicalNote =
    patient.remark?.trim() ||
    patient.diagnosis?.trim() ||
    "";

  return {
    patientName: displayValue(patient.patientName),
    uhid: displayValue(patient.patientUhid),
    admissionType,
    wardCategory: wardAssigned,
    vitalsSnapshot: {
      bloodPressure: "",
      sugarLevel: "",
      temperature: "",
      pulseRate: "",
      spo2: "",
    },
    admissionSummary: {
      wardAssigned,
      billingType,
      consultant,
    },
    clinicalNoteForFood: clinicalNote,
    branchId: patient.branchId,
  };
}
