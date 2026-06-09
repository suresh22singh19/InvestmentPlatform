// Define required vitals snapshot type locally because ./types does not export it
type OpenFilePatientVitalsSnapshot = {
  bloodPressure: string;
  sugarLevel: string;
  temperature: string;
  pulseRate: string;
  spo2: string;
};

type OpenFilePatientDetails = {
  patientName: string;
  uhid: string;
  admissionType: string;
  wardCategory: string;
  vitalsSnapshot: OpenFilePatientVitalsSnapshot;
  admissionSummary: {
    wardAssigned: string;
    billingType: string;
    consultant: string;
  };
  clinicalNoteForFood: string;
};

type IpdPatientOverviewData = Record<string, any>;
type IpdPatientOverviewAssignedRoom = Record<string, any>;

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

function formatWardCategory(room: IpdPatientOverviewAssignedRoom | null | undefined): string {
  if (!room) return "—";

  const parts = [
    room.roomType?.trim(),
    room.roomNumber?.trim() ? `Room ${room.roomNumber.trim()}` : null,
    room.bedNumber?.trim() ? `Bed ${room.bedNumber.trim()}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function mapVitalsSnapshot(data: IpdPatientOverviewData): OpenFilePatientVitalsSnapshot {
  const vitals = data.vitals;

  return {
    bloodPressure: displayValue(vitals?.blood_pressure, ""),
    sugarLevel: displayValue(vitals?.sugar_level, ""),
    temperature: displayValue(vitals?.temperature, ""),
    pulseRate: displayValue(vitals?.pulse, ""),
    spo2: displayValue(vitals?.spo2, ""),
  };
}

export function mapIpdPatientOverviewToOpenFile(
  data: IpdPatientOverviewData | undefined
): OpenFilePatientDetails | null {
  if (!data) return null;

  console.log("Mapping patient overview data:", data);

  const reg = data.registration;
  const patientName =
    [reg?.patient_title, reg?.patient_name].filter(Boolean).join(" ").trim() || "—";

  const admissionType = data.admissionType
    ? capitalizeWords(String(data.admissionType).replace(/_/g, " "))
    : "—";

  const billingType = reg?.patient_type
    ? capitalizeWords(String(reg.patient_type).replace(/_/g, " "))
    : reg?.patient_sub_type
      ? capitalizeWords(String(reg.patient_sub_type).replace(/_/g, " "))
      : "—";

  const wardAssigned = formatWardCategory(data.roomType);
  const consultant = displayValue(data.doctorName);

  return {
    patientName,
    uhid: displayValue(data.uhid, "—"),
    admissionType,
    wardCategory: wardAssigned,
    vitalsSnapshot: mapVitalsSnapshot(data),
    admissionSummary: {
      wardAssigned,
      billingType,
      consultant,
    },
    clinicalNoteForFood: displayValue(data.vitals?.notes ?? reg?.diet_type, ""),
  };
}
