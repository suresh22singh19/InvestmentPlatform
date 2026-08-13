/**
 * Common utility functions for the application
 * This file contains reusable functions that can be used across the entire project
 */

/**
 * Parse API height string into feet and inches for form fields.
 * - If height contains ".", treats as "feet.inches" (e.g. "10.9" → 10 ft, 9 in).
 * - Otherwise treats as total inches (e.g. "129" → 10 ft, 9 in) for backward compatibility.
 */
export const parseHeightToFeetAndInches = (
    height: string | null | undefined
): { feet: string; inch: string } => {
    if (!height || typeof height !== "string" || !height.trim()) {
        return { feet: "", inch: "" };
    }
    const trimmed = height.trim();
    if (trimmed.includes(".")) {
        const [feetPart, inchPart] = trimmed.split(".");
        const feetNum = feetPart != null && feetPart.trim() !== "" ? parseInt(feetPart, 10) : NaN;
        const inchNum = inchPart != null && inchPart.trim() !== "" ? parseInt(inchPart, 10) : NaN;
        return {
            feet: !isNaN(feetNum) ? String(feetNum) : "",
            inch: !isNaN(inchNum) ? String(inchNum) : "",
        };
    }
    const totalInches = parseInt(trimmed, 10);
    if (isNaN(totalInches)) return { feet: "", inch: "" };
    const feet = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    return { feet: String(feet), inch: String(inch) };
};

/**
 * Validate IP address or IP network (CIDR notation)
 * @param value - The IP address or IP network string to validate
 * @returns Empty string if valid, error message if invalid
 * 
 * @example
 * validateIPNetwork("192.168.1.1") // returns ""
 * validateIPNetwork("192.168.1.0/24") // returns ""
 * validateIPNetwork("invalid") // returns error message
 */
export const validateIPNetwork = (value: string): string => {
    if (!value || value.trim() === "") {
        return "IP Network is required";
    }

    const trimmedValue = value.trim();

    // Check for CIDR notation (e.g., 192.168.1.0/24)
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    // Check for simple IP address (e.g., 192.168.1.1)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (cidrPattern.test(trimmedValue)) {
        // Validate CIDR notation
        const [ip, cidr] = trimmedValue.split('/');
        const cidrNum = parseInt(cidr, 10);
        if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 32) {
            return "CIDR notation must be between 0 and 32";
        }
        // Validate IP part
        const ipParts = ip.split('.');
        if (ipParts.length !== 4) {
            return "IP address must have 4 octets";
        }
        for (const part of ipParts) {
            const num = parseInt(part, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return "Each IP octet must be between 0 and 255";
            }
        }
        return "";
    } else if (ipPattern.test(trimmedValue)) {
        // Validate simple IP address
        const ipParts = trimmedValue.split('.');
        if (ipParts.length !== 4) {
            return "IP address must have 4 octets";
        }
        for (const part of ipParts) {
            const num = parseInt(part, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return "Each IP octet must be between 0 and 255";
            }
        }
        return "";
    } else {
        return "Please enter a valid IP address (e.g., 192.168.1.1) or IP network (e.g., 192.168.1.0/24)";
    }
};

/**
 * Same rules as registration Patient Name (hospital flow): letters and spaces only,
 * max 100 characters, leading spaces stripped, first character uppercased,
 * consecutive same character limited to two repeats.
 */
export function sanitizePatientNameInput(raw: string): string {
    let value = raw.replace(/[^a-zA-Z\s]/g, "");
    value = value.replace(/^\s+/, "");
    value = value.replace(/(.)\1{2,}/g, "$1$1");
    if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value.slice(0, 100);
}

/**
 * Room number prefix: letters and digits only (no spaces/symbols), max 100 characters,
 * leading noise stripped, first character uppercased, consecutive same character limited to two (same pattern as patient name).
 */
export function sanitizeRoomNumberPrefixInput(raw: string): string {
    let value = raw.replace(/[^a-zA-Z0-9]/g, "");
    value = value.replace(/^\s+/, "");
    value = value.replace(/(.)\1{2,}/g, "$1$1");
    if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value.slice(0, 100);
}

/**
 * Bed number / identifier: letters, digits, hyphen, underscore, and spaces; max 100 characters.
 * Same consecutive-character rule as patient name: no more than two identical characters in a row.
 */
export function sanitizeBedNumberIdentifierInput(raw: string): string {
    let value = raw.replace(/[^a-zA-Z0-9_\- ]/g, "");
    value = value.replace(/(.)\1{2,}/g, "$1$1");
    return value.slice(0, 100);
}

/**
 * Notes / free text: letters and whitespace only (no digits or symbols), same repeat rule as patient name,
 * leading spaces trimmed, first character uppercased. Default max 500 for textarea use.
 */
export function sanitizeLettersOnlyNotesInput(raw: string, maxLen = 500): string {
    let value = raw.replace(/[^a-zA-Z\s]/g, "");
    value = value.replace(/^\s+/, "");
    value = value.replace(/(.)\1{2,}/g, "$1$1");
    if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value.slice(0, maxLen);
}

/** Digits only for numeric form fields (e.g. series start / count). */
export function sanitizeDigitsOnlyInput(raw: string, maxLen = 8): string {
    return raw.replace(/\D/g, "").slice(0, maxLen);
}

/**
 * Level / reference codes: letters and digits only (no spaces or symbols), max 100 characters.
 */
export function sanitizeLevelCodeInput(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 100);
}

/**
 * Max % variance: digits only, max 3 characters, numeric range 0–100 (empty = caller treats as unset / unlimited).
 */
export function sanitizeMaxVariancePercentInput(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    if (digits === "") return "";
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n)) return "";
    if (n > 100) return "100";
    return String(n);
}

/** Max amount field: digits only, at most 10 digits (empty = unset / unlimited in forms). */
export function sanitizeMaxAmountDigitsInput(raw: string): string {
    return raw.replace(/\D/g, "").slice(0, 10);
}

/**
 * Building / block / floor-style path: trims each segment and joins with " / ", omitting empties
 * so a missing block does not render as "A / / Ground Floor".
 */
export function formatRoomHierarchyPath(
    ...segments: Array<string | null | undefined>
): string {
    return segments
        .map((s) => (s == null ? "" : String(s).trim()))
        .filter((s) => s.length > 0)
        .join(" / ");
}

/** UI label for room gender usage; API still uses `mixed` / `Mixed` internally. */
export function genderUsageDisplayLabel(g: "Male" | "Female" | "Mixed" | "" | null | undefined): string {
    if (!g) return "N/A";
    return g === "Mixed" ? "General" : g;
}

/**
 * Split an API allergies/surgeries string into the Yes/No UI state + free-text details.
 *
 * API contract (both directions):
 *  - "no" (case-insensitive) / empty → button "No" (no details).
 *  - "yes" (case-insensitive) → button "Yes" with empty details.
 *  - Any other non-empty text → button "Yes" and the text is treated as the detail.
 *
 * The `yesNo` result is lowercase ("yes" / "no") to match `PatientTypeButtonGroup`'s
 * active-state comparison (`value === option.toLowerCase()`).
 */
export function parseYesNoDetailsValue(
    raw: string | null | undefined
): { yesNo: "" | "yes" | "no"; details: string } {
    if (raw == null) return { yesNo: "", details: "" };
    const trimmed = String(raw).trim();
    if (trimmed === "") return { yesNo: "", details: "" };
    const lower = trimmed.toLowerCase();
    if (lower === "no") return { yesNo: "no", details: "" };
    if (lower === "yes") return { yesNo: "yes", details: "" };
    return { yesNo: "yes", details: trimmed };
}

/**
 * Build the payload string for allergies / surgeries from the form's Yes/No button + details field.
 * - "Yes" + details → details text (trimmed)
 * - "Yes" + no details → "yes" (fallback; UI dialog prevents this but keep safe)
 * - "No" → "no"
 * - empty → undefined (field omitted)
 */
export function buildYesNoDetailsPayload(
    yesNo: string | null | undefined,
    details: string | null | undefined
): string | undefined {
    const v = (yesNo || "").trim().toLowerCase();
    if (v === "yes") {
        const d = (details || "").trim();
        return d || "yes";
    }
    if (v === "no") return "no";
    return undefined;
}

