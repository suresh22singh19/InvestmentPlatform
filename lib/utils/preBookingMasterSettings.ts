/** Align with Settings → misc master row where metaKey is `prebooking`. */
export function getPreBookingAdvanceDaysFromMasterList(
  items: { metaKey: string; metaValueOne: string }[] | undefined | null,
  fallbackDays = 45,
): number {
  if (!items?.length) return fallbackDays;
  const row = items.find((item) => item.metaKey === "prebooking");
  if (!row) return fallbackDays;
  const n = Number(String(row.metaValueOne).trim());
  if (!Number.isFinite(n) || n < 0) return fallbackDays;
  return Math.min(Math.floor(n), 3650);
}
