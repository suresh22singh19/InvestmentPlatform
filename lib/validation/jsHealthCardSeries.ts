/** Digit count from API series (digits only; uses max of start/end lengths if they differ). */
export function getJsHealthCardDigitCountFromSeries(seriesStart: string, seriesEnd?: string): number {
  const s = String(seriesStart).replace(/\D/g, "");
  const e = seriesEnd != null ? String(seriesEnd).replace(/\D/g, "") : s;
  const n = Math.max(s.length, e.length, 1);
  return n;
}

/** User-facing copy for Health Card series range (shown under the input). */
export function buildJsHealthCardSeriesErrorMessage(seriesStart: string, seriesEnd: string): string {
  return `Please enter the Health Card No. within the series ${seriesStart} - ${seriesEnd}`;
}

export function isJsHealthCardNumberInSeries(
  cardNumber: string,
  seriesStart: string,
  seriesEnd: string,
): boolean {
  const c = cardNumber.trim();
  const s = String(seriesStart).trim();
  const e = String(seriesEnd).trim();
  if (!/^\d+$/.test(c) || !/^\d+$/.test(s) || !/^\d+$/.test(e)) return false;
  try {
    const n = BigInt(c);
    return n >= BigInt(s) && n <= BigInt(e);
  } catch {
    return false;
  }
}

export function isJsHealthCardSeriesRangeError(message: unknown): boolean {
  return typeof message === "string" && (message.includes("within the series") || message.includes("Please match the series under") || message.includes("matching branch series"));
}
