/**
 * Shared rules for Add Facility / branch form (aligned with registration name rules).
 */

export const BRANCH_TEXT_INPUT_MAX_LENGTH = 100;

/** Reject more than 2 consecutive same characters (e.g. "ddddd"), same as pre-booking patient name. */
export function hasMoreThanTwoConsecutiveSameChars(value: string): boolean {
  if (!value || value.length < 3) return false;
  return /(.)\1{2,}/.test(value);
}

/** While typing: cap runs at 2 same chars (e.g. "aaaa" → "aa"), same as hospital `PatientDetails`. */
export function collapseConsecutiveSameCharsToMaxTwo(value: string): string {
  return value.replace(/(.)\1{2,}/g, "$1$1");
}

export function clampBranchTextInput(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  return raw.slice(0, max);
}

/** Letters and spaces only (facility / person-style names). */
export function filterLettersAndSpacesOnly(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  let s = raw.replace(/[^a-zA-Z\s]/g, "");
  s = collapseConsecutiveSameCharsToMaxTwo(s);
  return s.slice(0, max);
}

/** Firm / org style: letters, digits, spaces, common punctuation. */
export function filterFirmNameChars(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  let s = raw.replace(/[^a-zA-Z0-9\s.&'()-]/g, "");
  s = collapseConsecutiveSameCharsToMaxTwo(s);
  return s.slice(0, max);
}

/** Description-style text. */
export function filterDescriptionChars(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  return raw.replace(/[^a-zA-Z0-9\s.,;:'"/&!%()\-]/g, "").slice(0, max);
}

/** Uppercase A–Z and 0–9 only (codes / IDs). */
export function filterAlphanumericUpper(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max);
}

/** Letters (a–z, A–Z) and digits (0–9) only; case preserved (e.g. Shuddhi ID). */
export function filterAlphanumericLettersAndDigits(raw: string, maxLen = 12): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, maxLen);
}

/** Uppercase alphanumeric plus space and hyphen (e.g. TAT). */
export function filterAlphanumericUpperSpaceHyphen(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .slice(0, max);
}

/** Digits only. */
export function filterDigitsOnly(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/** Non-negative decimal: digits and at most one dot. */
export function filterDecimalInput(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  let s = raw.replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s.slice(0, max);
}

/** Percentage 0–while typing: decimal allowed, value capped at 100, `maxLen` caps string length. */
export function filterPercentageMax100(raw: string, maxLen = 7): string {
  let s = filterDecimalInput(raw, maxLen);
  if (s === "" || s === ".") return s;
  if (s.endsWith(".")) {
    const base = s.slice(0, -1);
    if (base === "") return s;
    const nb = parseFloat(base);
    if (Number.isFinite(nb) && nb > 100) return "100.";
    return s;
  }
  const n = parseFloat(s);
  if (Number.isFinite(n) && n > 100) return "100";
  return s;
}

/** GST: 15 chars A–Z0–9 uppercase. */
export function filterGstInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
}

/** Map URL: no slice filter except length; allow common URL characters. */
export function filterMapLinkInput(raw: string, max = BRANCH_TEXT_INPUT_MAX_LENGTH): string {
  return raw.slice(0, max);
}
