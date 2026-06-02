export type VitalNumericMode = "integer" | "decimal";

/** Strips letters and symbols; keeps digits only, or digits with a single decimal point. */
export function sanitizeVitalNumericInput(
  raw: string,
  mode: VitalNumericMode = "integer"
): string {
  if (mode === "integer") {
    return raw.replace(/\D/g, "");
  }

  let result = raw.replace(/[^\d.]/g, "");
  const dotIndex = result.indexOf(".");
  if (dotIndex !== -1) {
    result =
      result.slice(0, dotIndex + 1) + result.slice(dotIndex + 1).replace(/\./g, "");
  }
  return result;
}

const NAVIGATION_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

export function isVitalNumericKeyAllowed(
  key: string,
  mode: VitalNumericMode,
  currentValue: string
): boolean {
  if (NAVIGATION_KEYS.has(key)) return true;
  if (key.length !== 1) return false;

  if (mode === "integer") {
    return /^\d$/.test(key);
  }

  if (key === ".") {
    return !currentValue.includes(".");
  }

  return /^\d$/.test(key);
}
