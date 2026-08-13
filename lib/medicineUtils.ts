export const DOSAGE_UNIT_OPTIONS = [
    "MG",
    "G",
    "ML",
    "TAB",
    "CAP",
    "DROP",
    "PUFF",
    "TSP",
    "PACK",
];

export const DURATION_UNIT_OPTIONS = [
    "Days",
    "Weeks",
    "Months",
];

export const FREQUENCY_OPTIONS = [
    { label: "1 - 1 - 1", value: "1-1-1" },
    { label: "1 - 0 - 1", value: "1-0-1" },
    { label: "1 - 1 - 0", value: "1-1-0" },
    { label: "0 - 1 - 1", value: "0-1-1" },
    { label: "0 - 0 - 1", value: "0-0-1" },
    { label: "0 - 1 - 0", value: "0-1-0" },
    { label: "1 - 0 - 0", value: "1-0-0" },
    { label: "2 - 2 - 2", value: "2-2-2" },
    { label: "2 - 0 - 2", value: "2-0-2" },
    { label: "2 - 2 - 0", value: "2-2-0" },
    { label: "0 - 2 - 2", value: "0-2-2" },
    { label: "0 - 2 - 0", value: "0-2-0" },
    { label: "2 - 0 - 0", value: "2-0-0" },
];

export const TIME_OPTIONS = [
    { label: "After Meals with Lukewarm Water", value: "after_meals_lukewarm_water" },
    { label: "Before Meals with Lukewarm Water", value: "before_meals_lukewarm_water" },
    { label: "Empty Stomach with Lukewarm Water", value: "empty_stomach_lukewarm_water" },
    { label: "After Meals with Normal Water", value: "after_meals_normal_water" },
    { label: "Before Meals with Normal Water", value: "before_meals_normal_water" },
    { label: "Empty Stomach with Normal Water", value: "empty_stomach_normal_water" },
    { label: "After Meals with Honey", value: "after_meals_honey" },
    { label: "Before Meals with Honey", value: "before_meals_honey" },
    { label: "Empty Stomach with Honey", value: "empty_stomach_honey" },
    { label: "After Meals with Ghrit", value: "after_meals_ghrit" },
    { label: "Before Meals with Ghrit", value: "before_meals_ghrit" },
    { label: "Empty Stomach with Ghrit", value: "empty_stomach_ghrit" },
];

export const DOSAGE_OPTIONS = DOSAGE_UNIT_OPTIONS.map(u => ({ label: u, value: u }));
export const DURATION_OPTIONS = DURATION_UNIT_OPTIONS.map(u => ({ label: u, value: u }));
export const TIMING_OPTIONS = TIME_OPTIONS;

export const TIMING_CODE_MAP: Record<string, string> = {
    "AFM_LW": "after_meals_lukewarm_water",
    "AFM_NW": "after_meals_normal_water",
    "AFM_HN": "after_meals_honey",
    "AFM_GH": "after_meals_ghrit",
    "BFM_LW": "before_meals_lukewarm_water",
    "BFM_NW": "before_meals_normal_water",
    "BFM_HN": "before_meals_honey",
    "BFM_GH": "before_meals_ghrit",
    "EMS_LW": "empty_stomach_lukewarm_water",
    "EMS_NW": "empty_stomach_normal_water",
    "EMS_HN": "empty_stomach_honey",
    "EMS_GH": "empty_stomach_ghrit",
};

/**
 * Returns backend timing code (e.g. "AFM_NW") for standard timing value or label.
 */
export function getTimingKey(timingVal?: string): string {
    if (!timingVal) return "";
    const normalized = normalizeTimingValue(timingVal);
    for (const [key, val] of Object.entries(TIMING_CODE_MAP)) {
        if (val === normalized) return key;
    }
    return "";
}

/**
 * Normalizes raw timing string or code into a standard TIME_OPTIONS value.
 */
export function normalizeTimingValue(rawTiming?: string): string {
    if (!rawTiming) return "";
    const clean = rawTiming.trim();
    const upper = clean.toUpperCase();
    if (TIMING_CODE_MAP[upper]) {
        return TIMING_CODE_MAP[upper];
    }
    const lower = clean.toLowerCase().replace(/food/g, "meals");
    const foundByValue = TIME_OPTIONS.find(opt => 
        opt.value === clean || 
        opt.value === lower.replace(/\s+/g, "_") ||
        opt.label.toLowerCase() === lower ||
        opt.label.toLowerCase().replace(/\s+/g, "_") === lower.replace(/\s+/g, "_")
    );
    if (foundByValue) {
        return foundByValue.value;
    }

    if (lower.includes("after") && lower.includes("normal")) return "after_meals_normal_water";
    if (lower.includes("after") && lower.includes("lukewarm")) return "after_meals_lukewarm_water";
    if (lower.includes("after") && lower.includes("honey")) return "after_meals_honey";
    if (lower.includes("after") && lower.includes("ghrit")) return "after_meals_ghrit";

    if (lower.includes("before") && lower.includes("normal")) return "before_meals_normal_water";
    if (lower.includes("before") && lower.includes("lukewarm")) return "before_meals_lukewarm_water";
    if (lower.includes("before") && lower.includes("honey")) return "before_meals_honey";
    if (lower.includes("before") && lower.includes("ghrit")) return "before_meals_ghrit";

    if (lower.includes("empty") && lower.includes("normal")) return "empty_stomach_normal_water";
    if (lower.includes("empty") && lower.includes("lukewarm")) return "empty_stomach_lukewarm_water";
    if (lower.includes("empty") && lower.includes("honey")) return "empty_stomach_honey";
    if (lower.includes("empty") && lower.includes("ghrit")) return "empty_stomach_ghrit";

    return clean;
}

/**
 * Returns human-readable label for a timing value or code.
 */
export function getTimingLabel(timingVal?: string): string {
    if (!timingVal) return "";
    const normalized = normalizeTimingValue(timingVal);
    const found = TIME_OPTIONS.find(opt => opt.value === normalized);
    if (found) return found.label;
    return timingVal;
}

/**
 * Normalizes raw frequency string into standard FREQUENCY_OPTIONS value.
 */
export function normalizeFrequencyValue(rawFreq?: string): string {
    if (!rawFreq) return "";
    const clean = rawFreq.trim();
    const found = FREQUENCY_OPTIONS.find(opt => 
        opt.value === clean || 
        opt.label === clean || 
        opt.label.replace(/\s/g, "") === clean.replace(/\s/g, "") ||
        opt.value.replace(/-/g, "") === clean.replace(/[^0-9]/g, "")
    );
    if (found) return found.value;

    const lower = clean.toLowerCase();
    if (lower.includes("morning") && lower.includes("night") && (lower.includes("once") || lower.includes("one"))) {
        return "1-0-1";
    }
    if (lower.includes("morning") && lower.includes("afternoon") && lower.includes("night")) {
        return "1-1-1";
    }
    if (lower.includes("thrice") || lower.includes("three times")) {
        return "1-1-1";
    }
    if (lower.includes("twice")) {
        return "1-0-1";
    }
    if (lower.includes("once daily") || lower.includes("once a day")) {
        return "1-0-0";
    }

    return clean;
}

/**
 * Returns human-readable label for frequency (e.g. "1 - 0 - 1").
 */
export function getFrequencyLabel(freqVal?: string): string {
    if (!freqVal) return "";
    const found = FREQUENCY_OPTIONS.find(opt => opt.value === freqVal || opt.label === freqVal);
    if (found) return found.label;
    return freqVal;
}

/**
 * Helper to parse a combined dosage string like "500 MG" or "1 TAB" or raw dosageValue/dosageUnit from AI response.
 */
export function parseDosageComponents(rawDosage?: string | number, rawUnit?: string): { amount: string; unit: string } {
    let amount = "";
    let unit = "TAB";

    if (typeof rawDosage === "number") {
        amount = String(rawDosage);
    } else if (typeof rawDosage === "string" && rawDosage.trim()) {
        const str = rawDosage.trim();
        const match = str.match(/^(\d+(?:\.\d+)?)/);
        if (match) {
            amount = match[1];
        }
        const words = str.toUpperCase().split(/\s+/);
        for (const w of words) {
            if (DOSAGE_UNIT_OPTIONS.includes(w)) {
                unit = w;
                break;
            }
        }
    }

    if (rawUnit && typeof rawUnit === "string" && rawUnit.trim()) {
        const u = rawUnit.trim().toUpperCase();
        if (DOSAGE_UNIT_OPTIONS.includes(u)) {
            unit = u;
        }
    }

    return { amount, unit };
}

/**
 * Helper to parse a combined duration string like "3 Days" or raw durationValue/durationUnit from AI response.
 */
export function parseDurationComponents(rawDuration?: string | number, rawUnit?: string): { amount: string; unit: string } {
    let amount = "";
    let unit = "Days";

    if (typeof rawDuration === "number") {
        amount = String(rawDuration);
    } else if (typeof rawDuration === "string" && rawDuration.trim()) {
        const str = rawDuration.trim();
        const match = str.match(/^(\d+(?:\.\d+)?)/);
        if (match) {
            amount = match[1];
        }
        const strUpper = str.toUpperCase();
        if (strUpper.includes("MONTH")) unit = "Months";
        else if (strUpper.includes("WEEK")) unit = "Weeks";
        else if (strUpper.includes("DAY")) unit = "Days";
    }

    if (rawUnit && typeof rawUnit === "string" && rawUnit.trim()) {
        const uUpper = rawUnit.trim().toUpperCase();
        if (uUpper.includes("MONTH")) unit = "Months";
        else if (uUpper.includes("WEEK")) unit = "Weeks";
        else if (uUpper.includes("DAY")) unit = "Days";
    }

    return { amount, unit };
}
