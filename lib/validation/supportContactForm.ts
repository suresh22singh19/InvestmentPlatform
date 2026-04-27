/**
 * Support contacts modal — aligned with hospital registration personal rules
 * (contact: 10 digits; name/role: letters + spaces, max 100, no 3+ repeated chars).
 */

import {
  BRANCH_TEXT_INPUT_MAX_LENGTH,
  hasMoreThanTwoConsecutiveSameChars,
  filterLettersAndSpacesOnly,
  filterDigitsOnly,
} from "@/lib/utils/branchFacilityInput";

const MAX = BRANCH_TEXT_INPUT_MAX_LENGTH;
const LETTERS_AND_SPACES_ONLY = /^[a-zA-Z\s]+$/;

export function filterSupportNameInput(raw: string): string {
  return filterLettersAndSpacesOnly(raw, MAX);
}

export function filterSupportRoleInput(raw: string): string {
  return filterLettersAndSpacesOnly(raw, MAX);
}

export function filterSupportPhoneInput(raw: string): string {
  return filterDigitsOnly(raw, 10);
}

export function validateSupportContactName(value: string): string | null {
  const v = value.trim();
  if (!v) return "Name is required";
  if (v.length > MAX) return `Name cannot exceed ${MAX} characters`;
  if (!LETTERS_AND_SPACES_ONLY.test(v)) return "Only letters and spaces are allowed";
  if (hasMoreThanTwoConsecutiveSameChars(v)) {
    return "Name cannot have more than 2 consecutive same characters";
  }
  return null;
}

export function validateSupportContactRole(value: string): string | null {
  const v = value.trim();
  if (!v) return "Role is required";
  if (v.length > MAX) return `Role cannot exceed ${MAX} characters`;
  if (!LETTERS_AND_SPACES_ONLY.test(v)) return "Only letters and spaces are allowed";
  if (hasMoreThanTwoConsecutiveSameChars(v)) {
    return "Role cannot have more than 2 consecutive same characters";
  }
  return null;
}

export function validateSupportContactPhone(value: string): string | null {
  const v = value.trim().replace(/\s+/g, "");
  if (!v) return "Contact is required";
  if (!/^\d+$/.test(v)) return "Contact must contain only digits";
  if (v.length !== 10) return "Contact must be exactly 10 digits";
  return null;
}
