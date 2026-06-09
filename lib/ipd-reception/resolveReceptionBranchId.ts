/**
 * Resolves branch ID for IPD Reception APIs.
 * Header branch dropdown may be unset ("Select"); fall back to the logged-in user's branch.
 */
export function resolveReceptionBranchId(options: {
  selectedBranchId?: number | string | null;
  userBranchId?: number | string | null;
  appointmentBranchId?: number | string | null;
  /** From ipdPatientsListing row (`branchid` / `branchId`). */
  patientListingBranchId?: number | string | null;
}): number | undefined {
  const candidates = [
    options.patientListingBranchId,
    options.selectedBranchId,
    options.userBranchId,
    options.appointmentBranchId,
  ];

  for (const raw of candidates) {
    if (raw == null || raw === "") continue;
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) return id;
  }

  return undefined;
}
