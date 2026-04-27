import type { BranchRoomTypeMappingRow } from "@/store/api/branchSetupApi";

export function normalizeRoomTypeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
}

/** Resolve branch mapping row from room `roomType` string returned by room/hierarchy APIs. */
export function findBranchRoomTypeRow(
  apiRoomType: string,
  rows: BranchRoomTypeMappingRow[],
): BranchRoomTypeMappingRow | undefined {
  const a = normalizeRoomTypeKey(apiRoomType);
  for (const r of rows) {
    const code = r.roomType?.roomTypeCode ? normalizeRoomTypeKey(r.roomType.roomTypeCode) : "";
    if (code && a === code) return r;
    const disp = r.roomType?.roomType ? normalizeRoomTypeKey(r.roomType.roomType) : "";
    if (disp && a === disp) return r;
  }
  return undefined;
}

/** Human-readable label for an API room type key (e.g. `tr` → master display name). */
export function displayLabelForApiRoomType(
  apiRoomType: string,
  rows: BranchRoomTypeMappingRow[],
): string {
  const row = findBranchRoomTypeRow(apiRoomType, rows);
  if (row?.roomType?.roomType?.trim()) return String(row.roomType.roomType);
  return apiRoomType
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Options for Room Configuration: `value` is what PATCH expects (prefer `roomTypeCode`, else display name).
 * `label` is always the friendly name when available.
 */
export function branchRoomTypeSelectOptions(
  rows: BranchRoomTypeMappingRow[],
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const r of rows) {
    const code = r.roomType?.roomTypeCode?.trim();
    const name =
      r.roomType?.roomType != null && String(r.roomType.roomType).trim() !== ""
        ? String(r.roomType.roomType).trim()
        : "";
    const value = code || name;
    if (!value) continue;
    const label = name || code || value;
    out.push({ value, label });
  }
  return out;
}

export function roomTypeOptionSelected(current: string, optionValue: string): boolean {
  if (current === optionValue) return true;
  return normalizeRoomTypeKey(current) === normalizeRoomTypeKey(optionValue);
}
