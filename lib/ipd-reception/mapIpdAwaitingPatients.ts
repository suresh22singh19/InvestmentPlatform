import type {
  AwaitingPatient,
  AwaitingPatientApiRow,
  IpdAwaitingPatientTableRow,
} from "./types";

/** Normalizes listing API rows (`branchid` → `branchId`). */
export function normalizeAwaitingPatient(row: AwaitingPatientApiRow): AwaitingPatient {
  const rawBranch = row.branchId ?? row.branchid;
  const branchId =
    rawBranch != null && Number.isFinite(Number(rawBranch)) ? Number(rawBranch) : undefined;

  return {
    ...row,
    branchId,
  } as AwaitingPatient;
}

export function isPatientCompliant(complianceStatus: string | null | undefined): boolean {
  return complianceStatus?.toLowerCase() === "compliant";
}

export function formatWaitingTimeMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function mapAwaitingPatientToTableRow(patient: AwaitingPatient): IpdAwaitingPatientTableRow {
  const isCompliant = isPatientCompliant(patient.patientComplianceStatus);

  return {
    ...patient,
    waitingTimeLabel: formatWaitingTimeMinutes(patient.waitingTimeMinutes),
    actionType: isCompliant ? "highlight" : "standard",
  };
}

export function mapAwaitingPatientsToTableRows(
  patients: AwaitingPatient[]
): IpdAwaitingPatientTableRow[] {
  return patients.map(mapAwaitingPatientToTableRow);
}

export function getRtkErrorMessage(error: unknown, fallback: string): string {
  const err = error as { data?: { message?: string }; message?: string };
  if (typeof err?.data?.message === "string") return err.data.message;
  if (typeof err?.message === "string") return err.message;
  return fallback;
}
