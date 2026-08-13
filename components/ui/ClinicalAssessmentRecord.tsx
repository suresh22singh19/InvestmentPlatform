"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import Image from "next/image";
import { FormInputField } from "./FormInputField";
import { FormSelectField } from "./FormSelectField";
import { FormTextareaField } from "./FormTextareaField";
import { PatientTypeButtonGroup } from "./PatientTypeButtonGroup";
import { Tooltip } from "./Tooltip";
import { Tabs } from "./Tabs";
import { Button } from "./Button";
import { DatePicker } from "./DatePicker";
import { Slider } from "./Slider";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { MessageDialog } from "./MessageDialog";
import { Dialog } from "./Dialog";
import { useCreateOpdAssessmentMutation, useGetPatientAssessmentHistoryQuery } from "@/store/api/doctorApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserId } from "@/store/slices/authSlice";
import { selectMedicines, selectDosageList, selectFrequencyList, selectDurationList, selectTimingList } from "@/store/slices/medicineSlice";
import { FormInputSelectGroup } from "./FormInputSelectGroup";
import {
    DOSAGE_UNIT_OPTIONS,
    DURATION_UNIT_OPTIONS,
    FREQUENCY_OPTIONS,
    TIME_OPTIONS,
    DOSAGE_OPTIONS,
    DURATION_OPTIONS,
    TIMING_OPTIONS,
    parseDosageComponents,
    parseDurationComponents,
    getTimingLabel,
    getTimingKey,
    normalizeFrequencyValue,
    normalizeTimingValue,
} from "@/lib/medicineUtils";

export function numberToOrdinalWord(n: number): string {
    const ordinals: Record<number, string> = {
        1: "first",
        2: "second",
        3: "third",
        4: "fourth",
        5: "fifth",
        6: "sixth",
        7: "seventh",
        8: "eighth",
        9: "ninth",
        10: "tenth",
        11: "eleventh",
        12: "twelfth",
        13: "thirteenth",
        14: "fourteenth",
        15: "fifteenth",
        16: "sixteenth",
        17: "seventeenth",
        18: "eighteenth",
        19: "nineteenth",
        20: "twentieth",
        30: "thirtieth",
        40: "fortieth",
        50: "fiftieth",
        60: "sixtieth",
        70: "seventieth",
        80: "eightieth",
        90: "ninetieth",
        100: "hundredth"
    };

    if (ordinals[n]) return ordinals[n];

    if (n > 20 && n < 100) {
        const tens = Math.floor(n / 10) * 10;
        const ones = n % 10;
        const tensWords: Record<number, string> = {
            20: "twenty", 30: "thirty", 40: "forty", 50: "fifty",
            60: "sixty", 70: "seventy", 80: "eighty", 90: "ninety"
        };
        if (ones > 0 && ordinals[ones]) {
            return `${tensWords[tens]}-${ordinals[ones]}`;
        }
    }

    return `${n}th`;
}

export interface ClinicalAssessmentRecordProps {
    className?: string;
    onComplete?: () => void;
    initialGender?: string;
    initialVisitCount?: number;
    appData?: any;
    branchId?: number | string;
    branchName?: string;

    // Shared state props
    chiefComplaint: string;
    setChiefComplaint: (val: string) => void;
    symptoms: string;
    setSymptoms: (val: string) => void;
    finalDiagnosis: string;
    setFinalDiagnosis: (val: string) => void;
    diabetes: "yes" | "no" | "";
    setDiabetes: (val: "yes" | "no" | "") => void;
    bloodPressure: "high" | "low" | "no" | "";
    setBloodPressure: (val: "high" | "low" | "no" | "") => void;
    thyroid: "hypo" | "hyper" | "no" | "";
    setThyroid: (val: "hypo" | "hyper" | "no" | "") => void;
    allergy: "food" | "drug" | "skin" | "other" | "no" | "";
    setAllergy: (val: "food" | "drug" | "skin" | "other" | "no" | "") => void;
    sitting: "normal" | "abnormal" | "";
    setSitting: (val: "normal" | "abnormal" | "") => void;
    standing: "normal" | "abnormal" | "";
    setStanding: (val: "normal" | "abnormal" | "") => void;
    walking: "normal" | "abnormal" | "";
    setWalking: (val: "normal" | "abnormal" | "") => void;
    medicines: Array<{ name: string; dosage: string; frequency: string; timing: string; duration: string; remarks?: string; unmatchedName?: string }>;
    setMedicines: React.Dispatch<React.SetStateAction<Array<{ name: string; dosage: string; frequency: string; timing: string; duration: string; remarks?: string; unmatchedName?: string }>>>;

    // Extra fields
    followUpDate?: string;
    followUpRemarks?: string;
    aiResponse?: any;
    therapies?: Array<{
        therapyId: number;
        therapyName: string;
        therapyCategory?: string;
        therapySessions?: number;
        therapyDays?: number;
        jatayuTherapyCode?: string;
    }>;
    doctorNotes?: string;
    communicableDiseases?: string[] | string;
    setCommunicableDiseases?: (val: string[]) => void;
}

interface BodyMarker {
    id: number;
    x: number; // percentage from left
    y: number; // percentage from top
    view: "front" | "back";
    type: "pain" | "swelling" | "numbness";
    /**
     * Dots expanded from the SAME logical pain-mapping item (e.g. bilateral
     * "both shoulders" → 2 dots) share a groupId. They count as ONE mark and
     * are saved back as ONE painMapping entry with bilateralSymmetry: true.
     */
    groupId?: string;
    bilateral?: boolean;
    notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BODY MAPPING — 14-row anatomical grid (matches the 28-zone bodyCode dataset)
//
//   ROW  1 HEAD (11/12)        ROW  8 ABDOMEN (81/82)
//   ROW  2 NECK (21/22)        ROW  9 LOWER BACK (91/92)
//   ROW  3 SHOULDERS (31/32)   ROW 10 HIPS (101/102)
//   ROW  4 UPPER ARMS (41/42)  ROW 11 THIGHS (111/112)
//   ROW  5 FOREARMS (51/52)    ROW 12 KNEES (121/122)
//   ROW  6 HANDS (61/62)       ROW 13 CALVES (131/132)
//   ROW  7 CHEST (71/72)       ROW 14 FEET (141/142)
//
// Each of the 4 silhouette images (male/female × front/back) has DIFFERENT
// proportions, so each has its own chart. Coordinates below were measured
// directly from the silhouette pixels of the actual SVG artwork:
//   - male SVGs embed a 250×416 image filling the whole 125×208 canvas
//   - femaleBodyFrontView embeds a 227×618 image (x offset 19.44%, width 61.12%)
//   - femaleBodyBackView embeds a 242×640 image (x offset 18.54%, width 62.92%)
// All values are % of the rendered diagram (which the markers also use).
//
// `screenLeftX` / `screenRightX` are SCREEN sides of the image. Patient side
// is converted per view: on FRONT view the patient's LEFT arm appears on the
// SCREEN-RIGHT; on BACK view the patient's LEFT arm appears on SCREEN-LEFT.
// ═══════════════════════════════════════════════════════════════════════════

type BodyView = "front" | "back";
type BodySide = "left" | "right" | "center";

interface BodyRowCoord {
    y: number;
    screenLeftX: number;
    screenRightX: number;
    centerX: number;
}

type BodyChart = Record<number, BodyRowCoord>;

const BODY_REGION_NAMES: Record<number, string> = {
    1: "head", 2: "neck", 3: "shoulders", 4: "upper-arms", 5: "forearms",
    6: "hands", 7: "chest", 8: "abdomen", 9: "lower-back", 10: "hips",
    11: "thighs", 12: "knees", 13: "calves", 14: "feet",
};

// Rows that are PAIRED LIMBS — a "center" mark here would float in the empty
// gap between the limbs, so unspecified/bilateral marks go on BOTH limbs.
const PAIRED_LIMB_ROWS = new Set([3, 4, 5, 6, 11, 12, 13, 14]);

const MALE_FRONT_CHART: BodyChart = {
    1: { y: 7.5, screenLeftX: 46.0, screenRightX: 53.5, centerX: 49.6 },
    2: { y: 15.0, screenLeftX: 46.5, screenRightX: 53.0, centerX: 49.6 },
    3: { y: 19.8, screenLeftX: 37.0, screenRightX: 62.5, centerX: 49.6 },
    4: { y: 27.5, screenLeftX: 32.4, screenRightX: 66.8, centerX: 49.6 },
    5: { y: 40.0, screenLeftX: 30.0, screenRightX: 69.2, centerX: 49.6 },
    6: { y: 52.0, screenLeftX: 30.5, screenRightX: 68.8, centerX: 49.6 },
    7: { y: 27.0, screenLeftX: 44.0, screenRightX: 55.2, centerX: 49.6 },
    8: { y: 39.5, screenLeftX: 44.5, screenRightX: 54.8, centerX: 49.6 },
    9: { y: 44.0, screenLeftX: 43.5, screenRightX: 55.8, centerX: 49.6 },
    10: { y: 49.0, screenLeftX: 40.8, screenRightX: 58.4, centerX: 49.6 },
    11: { y: 59.5, screenLeftX: 41.6, screenRightX: 57.6, centerX: 49.6 },
    12: { y: 69.0, screenLeftX: 42.4, screenRightX: 56.8, centerX: 49.6 },
    13: { y: 79.0, screenLeftX: 41.4, screenRightX: 57.8, centerX: 49.6 },
    14: { y: 95.0, screenLeftX: 42.2, screenRightX: 57.0, centerX: 49.6 },
};

const MALE_BACK_CHART: BodyChart = {
    1: { y: 7.5, screenLeftX: 46.5, screenRightX: 54.0, centerX: 50.2 },
    2: { y: 15.0, screenLeftX: 47.0, screenRightX: 53.5, centerX: 50.2 },
    3: { y: 19.8, screenLeftX: 36.4, screenRightX: 63.6, centerX: 50.2 },
    4: { y: 27.5, screenLeftX: 32.6, screenRightX: 67.6, centerX: 50.2 },
    5: { y: 40.0, screenLeftX: 30.6, screenRightX: 69.8, centerX: 50.2 },
    6: { y: 52.0, screenLeftX: 31.0, screenRightX: 69.4, centerX: 50.2 },
    7: { y: 27.0, screenLeftX: 43.2, screenRightX: 56.8, centerX: 50.2 }, // shoulder-blade level
    8: { y: 38.0, screenLeftX: 44.5, screenRightX: 56.0, centerX: 50.2 }, // mid back
    9: { y: 42.5, screenLeftX: 45.0, screenRightX: 55.5, centerX: 50.2 }, // lumbar — clearly ABOVE buttocks
    10: { y: 51.0, screenLeftX: 42.8, screenRightX: 57.2, centerX: 50.2 }, // buttocks
    11: { y: 60.0, screenLeftX: 42.0, screenRightX: 58.0, centerX: 50.2 },
    12: { y: 69.0, screenLeftX: 42.6, screenRightX: 57.6, centerX: 50.2 },
    13: { y: 78.0, screenLeftX: 41.8, screenRightX: 58.6, centerX: 50.2 },
    14: { y: 94.0, screenLeftX: 43.2, screenRightX: 57.2, centerX: 50.2 },
};

const FEMALE_FRONT_CHART: BodyChart = {
    1: { y: 7.5, screenLeftX: 45.5, screenRightX: 53.0, centerX: 49.3 },
    2: { y: 15.0, screenLeftX: 46.5, screenRightX: 52.0, centerX: 49.3 },
    3: { y: 19.5, screenLeftX: 33.5, screenRightX: 65.5, centerX: 49.3 },
    4: { y: 27.0, screenLeftX: 31.8, screenRightX: 67.1, centerX: 49.3 },
    5: { y: 40.0, screenLeftX: 27.3, screenRightX: 71.4, centerX: 49.3 },
    6: { y: 52.0, screenLeftX: 24.3, screenRightX: 75.2, centerX: 49.3 },
    7: { y: 28.0, screenLeftX: 43.4, screenRightX: 55.3, centerX: 49.3 },
    8: { y: 40.0, screenLeftX: 44.5, screenRightX: 54.0, centerX: 49.3 },
    9: { y: 44.5, screenLeftX: 43.5, screenRightX: 55.0, centerX: 49.3 },
    10: { y: 49.0, screenLeftX: 40.3, screenRightX: 58.4, centerX: 49.3 },
    11: { y: 60.0, screenLeftX: 42.1, screenRightX: 56.6, centerX: 49.3 },
    12: { y: 68.0, screenLeftX: 42.6, screenRightX: 56.1, centerX: 49.3 },
    13: { y: 78.0, screenLeftX: 42.2, screenRightX: 56.2, centerX: 49.3 },
    14: { y: 95.5, screenLeftX: 43.1, screenRightX: 55.4, centerX: 49.3 },
};

const FEMALE_BACK_CHART: BodyChart = {
    1: { y: 7.5, screenLeftX: 45.5, screenRightX: 52.5, centerX: 49.1 },
    2: { y: 15.5, screenLeftX: 46.5, screenRightX: 52.0, centerX: 49.1 },
    3: { y: 19.5, screenLeftX: 36.0, screenRightX: 62.6, centerX: 49.1 },
    4: { y: 27.0, screenLeftX: 31.5, screenRightX: 67.0, centerX: 49.1 },
    5: { y: 40.0, screenLeftX: 27.0, screenRightX: 71.8, centerX: 49.1 },
    6: { y: 52.0, screenLeftX: 23.9, screenRightX: 74.8, centerX: 49.1 },
    7: { y: 27.0, screenLeftX: 41.9, screenRightX: 56.2, centerX: 49.1 }, // shoulder-blade level
    8: { y: 37.0, screenLeftX: 44.0, screenRightX: 55.0, centerX: 49.1 }, // mid back
    9: { y: 42.5, screenLeftX: 44.5, screenRightX: 54.5, centerX: 49.1 }, // lumbar — clearly ABOVE buttocks
    10: { y: 51.0, screenLeftX: 40.8, screenRightX: 57.8, centerX: 49.1 }, // buttocks
    11: { y: 60.0, screenLeftX: 41.0, screenRightX: 56.8, centerX: 49.1 },
    12: { y: 68.0, screenLeftX: 41.8, screenRightX: 56.1, centerX: 49.1 },
    13: { y: 78.0, screenLeftX: 41.4, screenRightX: 56.4, centerX: 49.1 },
    14: { y: 94.0, screenLeftX: 43.6, screenRightX: 53.9, centerX: 49.1 },
};

function getBodyChart(gender: string | undefined | null, view: BodyView): BodyChart {
    const isFemale = String(gender || "").toLowerCase() === "female";
    if (isFemale) return view === "back" ? FEMALE_BACK_CHART : FEMALE_FRONT_CHART;
    return view === "back" ? MALE_BACK_CHART : MALE_FRONT_CHART;
}

/** Coordinates for a body row + PATIENT side, converted to screen coordinates. */
function getBodyZonePoint(
    gender: string | undefined | null,
    view: BodyView,
    row: number,
    side: BodySide,
): { x: number; y: number } {
    const chart = getBodyChart(gender, view);
    const zone = chart[row] || chart[8];
    let x: number;
    if (side === "left") {
        // Patient's left: screen-right on front view, screen-left on back view
        x = view === "front" ? zone.screenRightX : zone.screenLeftX;
    } else if (side === "right") {
        x = view === "front" ? zone.screenLeftX : zone.screenRightX;
    } else {
        x = zone.centerX;
    }
    return { x, y: zone.y };
}

// Genital / private-part complaints — belong at the groin on the FRONT view,
// slightly below the row-10 hip line.
const GENITAL_TERMS = /private.?parts?|genital|\bpenis\b|scrotum|scrotal|testic(le|ular|les)?|vagina|vulva|pubic|urethra/i;

/** Detect the 14-grid row from free text (specific terms take priority). */
function detectBodyRow(text: string): number | null {
    if (/shoulder.?blade|scapula/i.test(text)) return 3;
    if (/knee|kneecap|patella|popliteal/i.test(text)) return 12;
    if (/lower.?back|lumbar|sacr(um|al|o)|lumbosacral|tail.?bone|coccyx/i.test(text)) return 9;
    if (/shoulder|deltoid|armpit|axilla|collar.?bone|clavicle/i.test(text)) return 3;
    if (/upper.?arm|bicep|tricep/i.test(text)) return 4;
    if (/forearm|elbow/i.test(text)) return 5;
    if (/\bhands?\b|wrist|palm|finger|thumb/i.test(text)) return 6;
    if (/chest|sternum|\bribs?\b|pectoral|breast/i.test(text)) return 7;
    if (/abdomen|abdominal|stomach|belly|navel|umbilic/i.test(text)) return 8;
    // Perianal / anal / rectal complaints (hemorrhoids etc.) → buttocks region
    if (/peri.?anal|\banal\b|\banus\b|rect(al|um)|h(a?)emorrhoid|\bpiles\b|perine(um|al)|natal.?cleft/i.test(text)) return 10;
    // Genital / private-part complaints → groin (row 10, front view)
    if (GENITAL_TERMS.test(text)) return 10;
    if (/\bhips?\b|buttock|gluteal|glutes?\b|groin|pelvis|pelvic/i.test(text)) return 10;
    if (/thigh|upper.?leg|quadricep|femur|hamstring/i.test(text)) return 11;
    if (/\bcalf\b|calves|\bshins?\b|lower.?leg|tibia|fibula/i.test(text)) return 13;
    if (/\bfoot\b|\bfeet\b|ankle|\bsole\b|\btoes?\b|heel|plantar/i.test(text)) return 14;
    if (/neck|throat|cervical|nape/i.test(text)) return 2;
    if (/\bhead\b|face|skull|temple|jaw|forehead|\beyes?\b|\bears?\b/i.test(text)) return 1;
    if (/upper.?back|thoracic/i.test(text)) return 3;
    // "central/middle back" → MID back (row 8 sits at mid-back height on the
    // back view), NOT lower back — otherwise the mark lands at the hip line.
    if (/central.?(of.?)?(the.?)?back|centre.?(of.?)?(the.?)?back|center.?(of.?)?(the.?)?back|middle.?(of.?)?(the.?)?back|mid.?back|mid.?spine/i.test(text)) return 8;
    if (/\bback\b|spine|spinal|dorsal/i.test(text)) return 9; // generic "back" → lower back
    return null;
}

/**
 * Certain anatomy is only visible on one view; if text clearly indicates it,
 * override the AI-provided view (e.g. "lower back" can never be on the front).
 */
function detectForcedView(text: string): BodyView | null {
    const backTerms = /lower.?back|lumbar|sacr(um|al|o)|spine|spinal|scapula|shoulder.?blade|buttock|gluteal|hamstring|popliteal|posterior|upper.?back|mid.?back|middle.?back|central.?back|dorsal|back.?of|back.?pain|peri.?anal|\banal\b|\banus\b|rect(al|um)|h(a?)emorrhoid|\bpiles\b|perine(um|al)|natal.?cleft|coccyx|tail.?bone/i.test(text);
    const frontTerms = /chest|sternum|pectoral|breast|abdomen|abdominal|stomach|belly|navel|umbilic|kneecap|patella|\bshins?\b|forehead|face|jaw|throat|anterior|front.?of|private.?parts?|genital|\bpenis\b|scrotum|scrotal|testic(le|ular|les)?|vagina|vulva|pubic|urethra/i.test(text);
    if (backTerms && !frontTerms) return "back";
    if (frontTerms && !backTerms) return "front";
    return null;
}

/**
 * Reverse lookup used when SAVING manually placed markers: find the nearest
 * anatomical row + patient side for a screen coordinate.
 */
function nearestBodyZone(
    gender: string | undefined | null,
    view: BodyView,
    x: number,
    y: number,
): { row: number; side: "left" | "right"; code: number; region: string } {
    const chart = getBodyChart(gender, view);
    let best: { row: number; screenSide: "screenLeft" | "screenRight"; dist: number } | null = null;
    for (const rowKey of Object.keys(chart)) {
        const row = Number(rowKey);
        const zone = chart[row];
        const candidates: Array<{ screenSide: "screenLeft" | "screenRight"; cx: number }> = [
            { screenSide: "screenLeft", cx: zone.screenLeftX },
            { screenSide: "screenRight", cx: zone.screenRightX },
        ];
        for (const c of candidates) {
            const dx = x - c.cx;
            const dy = (y - zone.y) * 1.8; // rows are stacked vertically → weight y higher
            const dist = dx * dx + dy * dy;
            if (!best || dist < best.dist) {
                best = { row, screenSide: c.screenSide, dist };
            }
        }
    }
    const row = best?.row ?? 8;
    const screenSide = best?.screenSide ?? "screenLeft";
    // Convert screen side → patient side (front view is mirrored)
    const side: "left" | "right" = view === "front"
        ? (screenSide === "screenRight" ? "left" : "right")
        : (screenSide === "screenLeft" ? "left" : "right");
    return { row, side, code: row * 10 + (side === "left" ? 1 : 2), region: BODY_REGION_NAMES[row] || "" };
}

const SELECT_OPTIONS = [
    { label: "None", value: "None" },
    { label: "Mild", value: "Mild" },
    { label: "Moderate", value: "Moderate" },
    { label: "Severe", value: "Severe" },
];

const SLEEP_OPTIONS = [
    { label: "Good", value: "Good" },
    { label: "Fair", value: "Fair" },
    { label: "Poor", value: "Poor" },
    { label: "Insomnia", value: "Insomnia" },
];

const GENDER_OPTIONS = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Other", value: "Other" },
];

const DOCTOR_OPTIONS = [
    { label: "Dr. Shiv Ram Singh", value: "Dr. Shiv Ram Singh" },
    { label: "Dr. Aakash Dave", value: "Dr. Aakash Dave" },
    { label: "Dr. Heera Singh", value: "Dr. Heera Singh" },
    { label: "Dr. Neha Singh", value: "Dr. Neha Singh" },
    { label: "Dr. Rajesh Kumar", value: "Dr. Rajesh Kumar" },
    { label: "Dr. Kadambaree", value: "Dr. Kadambaree" },
];

// Slider component is loaded from E:\Work\hiims\components\ui\Slider.tsx

// Medicine Options
const MEDICINE_OPTIONS = [
    { label: "Triphala Churna", value: "Triphala Churna" },
    { label: "Ashwagandha", value: "Ashwagandha" },
    { label: "Amla Juice", value: "Amla Juice" },
    { label: "Giloy Ghanvati", value: "Giloy Ghanvati" },
    { label: "Chandraprabha Vati", value: "Chandraprabha Vati" },
];


interface SymptomRecoverySliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
}

function SymptomRecoverySlider({ label, value, onChange }: SymptomRecoverySliderProps) {
    return (
        <div className="space-y-1">
            <span className="block text-[13px] font-semibold text-[#444242]">{label}</span>
            <div className="flex items-center gap-3">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0B8C00] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0B8C00] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white"
                    style={{
                        background: `linear-gradient(to right, #0B8C00 0%, #0B8C00 ${value}%, #EBECED ${value}%, #EBECED 100%)`,
                    }}
                />
                <span className="text-xs font-bold text-[#434956] min-w-[28px] text-right">{value}%</span>
            </div>
        </div>
    );
}

export const ClinicalAssessmentRecord = forwardRef<{ submit: () => void }, ClinicalAssessmentRecordProps>(
    function ClinicalAssessmentRecord({
        className = "",
        onComplete,
        initialGender,
        initialVisitCount,
        appData,
        branchId,
        branchName,
        chiefComplaint,
        setChiefComplaint,
        symptoms,
        setSymptoms,
        finalDiagnosis,
        setFinalDiagnosis,
        diabetes,
        setDiabetes,
        bloodPressure,
        setBloodPressure,
        thyroid,
        setThyroid,
        allergy,
        setAllergy,
        sitting,
        setSitting,
        standing,
        setStanding,
        walking,
        setWalking,
        medicines,
        setMedicines,
        followUpDate,
        followUpRemarks,
        aiResponse: incomingAiResponse,
        therapies,
        doctorNotes = "",
        communicableDiseases,
        setCommunicableDiseases,
    }, ref) {
        const authDoctorId = useAppSelector(selectUserId);
        const aiResponse = incomingAiResponse || {};

        const medicinesList = useAppSelector(selectMedicines);
        const dosageList = useAppSelector(selectDosageList);
        const frequencyList = useAppSelector(selectFrequencyList);
        const durationList = useAppSelector(selectDurationList);
        const timingList = useAppSelector(selectTimingList);

        const getUniqueOptions = (
            list: { value: string }[],
            fallback: { label: string, value: string }[],
            currentValues?: string[]
        ) => {
            const baseList = (list && list.length > 0)
                ? list.map(item => ({ label: item.value, value: item.value }))
                : fallback;

            const unique: { label: string, value: string }[] = [];
            const seen = new Set<string>();

            for (const item of baseList) {
                if (item.value && !seen.has(item.value)) {
                    seen.add(item.value);
                    unique.push(item);
                }
            }

            if (currentValues && Array.isArray(currentValues)) {
                for (const val of currentValues) {
                    if (val && !seen.has(val)) {
                        seen.add(val);
                        unique.push({ label: val, value: val });
                    }
                }
            }
            return unique;
        };

        const medicineOptions = useMemo(() => {
            const baseList = (medicinesList && medicinesList.length > 0)
                ? medicinesList.map(m => ({ label: m.name, value: m.name }))
                : MEDICINE_OPTIONS;

            const unique: { label: string, value: string }[] = [];
            const seen = new Set<string>();

            for (const opt of baseList) {
                if (opt.value && !seen.has(opt.value)) {
                    seen.add(opt.value);
                    unique.push(opt);
                }
            }

            if (medicines && Array.isArray(medicines)) {
                for (const med of medicines) {
                    if (med.name && !seen.has(med.name)) {
                        seen.add(med.name);
                        unique.push({ label: med.name, value: med.name });
                    }
                }
            }
            return unique;
        }, [medicinesList, medicines]);

        const dosageOptions = useMemo(() => {
            const currentValues = medicines ? medicines.map(m => m.dosage) : [];
            return getUniqueOptions(dosageList, DOSAGE_OPTIONS, currentValues);
        }, [dosageList, medicines]);

        const frequencyOptions = useMemo(() => {
            const currentValues = medicines ? medicines.map(m => m.frequency) : [];
            return getUniqueOptions(frequencyList, FREQUENCY_OPTIONS, currentValues);
        }, [frequencyList, medicines]);

        const durationOptions = useMemo(() => {
            const currentValues = medicines ? medicines.map(m => m.duration) : [];
            return getUniqueOptions(durationList, DURATION_OPTIONS, currentValues);
        }, [durationList, medicines]);

        const timingOptions = useMemo(() => {
            const currentValues = medicines ? medicines.map(m => m.timing) : [];
            return getUniqueOptions(timingList, TIMING_OPTIONS, currentValues);
        }, [timingList, medicines]);

        // Fetch patient's assessment history to determine visit count and visit type
        const patientUhid = (appData?.uhid || appData?.patientID || "").trim();
        const { data: assessmentHistoryData } = useGetPatientAssessmentHistoryQuery(
            { uhid: patientUhid, filter: "all" },
            { skip: !patientUhid }
        );

        const pastAssessmentCount = Array.isArray(assessmentHistoryData?.data) ? assessmentHistoryData.data.length : 0;
        const currentVisitNumber = pastAssessmentCount + 1;
        const calculatedVisitType = numberToOrdinalWord(currentVisitNumber);
        const showProgressMonitoring = currentVisitNumber > 1;

        // Dialog & Submission States
        const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
        const [showSuccessDialog, setShowSuccessDialog] = useState(false);
        const [showErrorDialog, setShowErrorDialog] = useState(false);
        const [isSubmitting, setIsSubmitting] = useState(false);

        useImperativeHandle(ref, () => ({
            submit: () => {
                handleSaveAndContinue();
            }
        }));

        const [createOpdAssessment] = useCreateOpdAssessmentMutation();

        const handleConfirmSubmit = async () => {
            setIsSubmitting(true);
            try {
                const getValidISO = (dateStr?: string) => {
                    if (!dateStr) return "";
                    const parsed = Date.parse(dateStr);
                    if (isNaN(parsed)) return "";
                    const iso = new Date(dateStr).toISOString();
                    if (iso === "1976-01-03T00:00:00.000Z" || iso.startsWith("1976-01-03")) {
                        return "";
                    }
                    return iso;
                };

                const buildResponse = (baseObject: any, isUpdated: boolean) => {
                    const getVisitType = () => {
                        return calculatedVisitType;
                    };

                    const metadata = {
                        visitId: baseObject?.metadata?.visitId || aiResponse?.metadata?.visitId || "550e8400-e29b-41d4-a716-446655440000",
                        visitType: getVisitType(),
                        timestamp: baseObject?.metadata?.timestamp || new Date().toISOString(),
                        timezone: baseObject?.metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
                        provider: baseObject?.metadata?.provider || aiResponse?.metadata?.provider || {
                            doctorName: appData?.doctorName || "Dr. Sharma",
                            doctorId: appData?.doctorId?.toString() || "DOC001"
                        },
                        language: baseObject?.metadata?.language || aiResponse?.metadata?.language || "en",
                        source: baseObject?.metadata?.source || aiResponse?.metadata?.source || "VoiceDocAI",
                        version: baseObject?.metadata?.version || aiResponse?.metadata?.version || "1.0",
                        transcriptKey: baseObject?.metadata?.transcriptKey || aiResponse?.metadata?.transcriptKey || ""
                    };

                    const doctorParts = (appData?.doctorName || "").trim().split(/\s+/);
                    const doctorFirstName = doctorParts[0] || baseObject?.doctorInfo?.firstName || aiResponse?.doctorInfo?.firstName || "Dr.";
                    const doctorLastName = doctorParts.slice(1).join(" ") || baseObject?.doctorInfo?.lastName || aiResponse?.doctorInfo?.lastName || "Sharma";

                    const doctorInfo = {
                        emailID: baseObject?.doctorInfo?.emailID || aiResponse?.doctorInfo?.emailID || "doctor@hiims.in",
                        doctorID: appData?.doctorId?.toString() || baseObject?.doctorInfo?.doctorID || aiResponse?.doctorInfo?.doctorID || "DOC001",
                        firstName: doctorFirstName,
                        lastName: doctorLastName,
                        clinicName: baseObject?.doctorInfo?.clinicName || aiResponse?.doctorInfo?.clinicName || "HIIMS",
                        clinicLocation: appData?.branchName || branchName || baseObject?.doctorInfo?.clinicLocation || aiResponse?.doctorInfo?.clinicLocation || "Mohali",
                        doctorSpecialization: baseObject?.doctorInfo?.doctorSpecialization || aiResponse?.doctorInfo?.doctorSpecialization || "Naturopathy",
                        clinicPincode: baseObject?.doctorInfo?.clinicPincode || aiResponse?.doctorInfo?.clinicPincode || "140507",
                        remarks: baseObject?.doctorInfo?.remarks || aiResponse?.doctorInfo?.remarks || ""
                    };

                    const patientParts = (appData?.patientName || "").trim().split(/\s+/);
                    const patientFirstName = patientParts[0] || baseObject?.patientInfo?.firstName || aiResponse?.patientInfo?.firstName || "Patient";
                    const patientLastName = patientParts.slice(1).join(" ") || baseObject?.patientInfo?.lastName || aiResponse?.patientInfo?.lastName || "Name";

                    const getGenderValue = () => {
                        const raw = gender || appData?.gender || baseObject?.patientInfo?.gender || aiResponse?.patientInfo?.gender || "";
                        const g = raw.trim().toLowerCase();
                        if (g === "male") return "Male";
                        if (g === "female") return "Female";
                        if (g === "other") return "Other";
                        if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                        return "Male";
                    };

                    const contactParts = [
                        appData?.contactNumber ? `Contact: ${appData.contactNumber}` : "",
                        appData?.city ? `City: ${appData.city}` : "",
                        appData?.state ? `State: ${appData.state}` : ""
                    ].filter(Boolean).join(" • ");

                    const patientInfo = {
                        patientID: appData?.uhid || appData?.patientID || baseObject?.patientInfo?.patientID || aiResponse?.patientInfo?.patientID || "DRBS012026",
                        firstName: patientFirstName,
                        lastName: patientLastName,
                        gender: getGenderValue() as any,
                        age: Number(appData?.age) || Number(baseObject?.patientInfo?.age) || Number(aiResponse?.patientInfo?.age) || 0,
                        language: baseObject?.patientInfo?.language || aiResponse?.patientInfo?.language || "en",
                        remarks: baseObject?.patientInfo?.remarks || aiResponse?.patientInfo?.remarks || contactParts || ""
                    };

                    const patientPresentation = {
                        chiefComplaint: isUpdated
                            ? [{ complaint: chiefComplaint || baseObject?.patientPresentation?.chiefComplaint?.[0]?.complaint || aiResponse?.patientPresentation?.chiefComplaint?.[0]?.complaint || "", confidence: 1.0 }]
                            : (baseObject?.patientPresentation?.chiefComplaint || aiResponse?.patientPresentation?.chiefComplaint || [{ complaint: chiefComplaint, confidence: 1.0 }]),
                        symptoms: isUpdated
                            ? (symptoms ? symptoms.split(",").map((s: string) => s.trim()).filter(Boolean) : (baseObject?.patientPresentation?.symptoms || aiResponse?.patientPresentation?.symptoms || []))
                            : (baseObject?.patientPresentation?.symptoms || aiResponse?.patientPresentation?.symptoms || []),
                        hpi: isUpdated
                            ? (hpi ? hpi.split("\n").map((h: string) => h.trim()).filter(Boolean) : (baseObject?.patientPresentation?.hpi || aiResponse?.patientPresentation?.hpi || []))
                            : (baseObject?.patientPresentation?.hpi || aiResponse?.patientPresentation?.hpi || []),
                        socialHistory: isUpdated
                            ? (socialHistory ? socialHistory.split("\n").map((s: string) => s.trim()).filter(Boolean) : (baseObject?.patientPresentation?.socialHistory || aiResponse?.patientPresentation?.socialHistory || []))
                            : (baseObject?.patientPresentation?.socialHistory || aiResponse?.patientPresentation?.socialHistory || []),
                        pastMedicalHistory: isUpdated
                            ? (pastMedicalHistory ? pastMedicalHistory.split("\n").map((p: string) => p.trim()).filter(Boolean) : (baseObject?.patientPresentation?.pastMedicalHistory || aiResponse?.patientPresentation?.pastMedicalHistory || []))
                            : (baseObject?.patientPresentation?.pastMedicalHistory || aiResponse?.patientPresentation?.pastMedicalHistory || []),
                        familyHistory: isUpdated
                            ? (familyHistory ? familyHistory.split("\n").map((f: string) => f.trim()).filter(Boolean) : (baseObject?.patientPresentation?.familyHistory || aiResponse?.patientPresentation?.familyHistory || []))
                            : (baseObject?.patientPresentation?.familyHistory || aiResponse?.patientPresentation?.familyHistory || []),
                        remarks: baseObject?.patientPresentation?.remarks || aiResponse?.patientPresentation?.remarks || ""
                    };

                    const medications = {
                        currentMedication: isUpdated
                            ? (currentMedications ? (currentMedications.toUpperCase() === "YES" ? "YES" : "NO") : (baseObject?.medications?.currentMedication || aiResponse?.medications?.currentMedication || "NO"))
                            : (baseObject?.medications?.currentMedication || aiResponse?.medications?.currentMedication || "NO"),
                        doctorNotes: isUpdated
                            ? (medRemarks || baseObject?.medications?.doctorNotes || aiResponse?.medications?.doctorNotes || "")
                            : (baseObject?.medications?.doctorNotes || aiResponse?.medications?.doctorNotes || ""),
                        surgeryHistory: isUpdated
                            ? (surgeryHistory || baseObject?.medications?.surgeryHistory || aiResponse?.medications?.surgeryHistory || "")
                            : (baseObject?.medications?.surgeryHistory || aiResponse?.medications?.surgeryHistory || ""),
                        currentMedicines: baseObject?.medications?.currentMedicines || aiResponse?.medications?.currentMedicines || []
                    };

                    const mapAllergy = (a: string) => {
                        if (a === "food") return "Food";
                        if (a === "drug") return "Drug";
                        if (a === "skin" || a === "other") return "Other";
                        return "Nil";
                    };

                    const systemicReview = {
                        diabetes: isUpdated
                            ? {
                                status: (diabetes ? (diabetes === "yes" ? "YES" : "NO") : (baseObject?.systemicReview?.diabetes?.status || aiResponse?.systemicReview?.diabetes?.status || "NO")) as any,
                                yearsIfDiabetic: Number(diabeticYears) || Number(baseObject?.systemicReview?.diabetes?.yearsIfDiabetic) || Number(aiResponse?.systemicReview?.diabetes?.yearsIfDiabetic) || 0,
                                notes: diabetesNotes || baseObject?.systemicReview?.diabetes?.notes || aiResponse?.systemicReview?.diabetes?.notes || ""
                            }
                            : {
                                status: (baseObject?.systemicReview?.diabetes?.status || aiResponse?.systemicReview?.diabetes?.status || "NO") as any,
                                yearsIfDiabetic: Number(baseObject?.systemicReview?.diabetes?.yearsIfDiabetic) || Number(aiResponse?.systemicReview?.diabetes?.yearsIfDiabetic) || 0,
                                notes: baseObject?.systemicReview?.diabetes?.notes || aiResponse?.systemicReview?.diabetes?.notes || ""
                            },
                        bloodPressure: isUpdated
                            ? {
                                status: (bloodPressure ? (bloodPressure === "high" ? "High BP" : (bloodPressure === "low" ? "Low BP" : "No")) : (baseObject?.systemicReview?.bloodPressure?.status || aiResponse?.systemicReview?.bloodPressure?.status || "No")) as any,
                                remarks: bpRemarks || baseObject?.systemicReview?.bloodPressure?.remarks || aiResponse?.systemicReview?.bloodPressure?.remarks || ""
                            }
                            : {
                                status: (baseObject?.systemicReview?.bloodPressure?.status || aiResponse?.systemicReview?.bloodPressure?.status || "No") as any,
                                remarks: baseObject?.systemicReview?.bloodPressure?.remarks || aiResponse?.systemicReview?.bloodPressure?.remarks || ""
                            },
                        thyroid: isUpdated
                            ? {
                                status: (thyroid ? (thyroid === "hypo" ? "Hypothyroid" : (thyroid === "hyper" ? "Hyperthyroid" : "No")) : (baseObject?.systemicReview?.thyroid?.status || aiResponse?.systemicReview?.thyroid?.status || "No")) as any,
                                remarks: thyroidRemarks || baseObject?.systemicReview?.thyroid?.remarks || aiResponse?.systemicReview?.thyroid?.remarks || ""
                            }
                            : {
                                status: (baseObject?.systemicReview?.thyroid?.status || aiResponse?.systemicReview?.thyroid?.status || "No") as any,
                                remarks: baseObject?.systemicReview?.thyroid?.remarks || aiResponse?.systemicReview?.thyroid?.remarks || ""
                            },
                        allergy: isUpdated
                            ? {
                                types: allergy ? [{ type: mapAllergy(allergyHistory) as any, stamp: { Std_Code: "", Std_Name: "" } }] : (baseObject?.systemicReview?.allergy?.types || aiResponse?.systemicReview?.allergy?.types || [{ type: "Nil", stamp: { Std_Code: "", Std_Name: "" } }]),
                                details: allergyDetails || baseObject?.systemicReview?.allergy?.details || aiResponse?.systemicReview?.allergy?.details || ""
                            }
                            : {
                                types: baseObject?.systemicReview?.allergy?.types || aiResponse?.systemicReview?.allergy?.types || [{ type: "Nil", stamp: { Std_Code: "", Std_Name: "" } }],
                                details: baseObject?.systemicReview?.allergy?.details || aiResponse?.systemicReview?.allergy?.details || ""
                            }
                    };

                    const isMale = (gender || appData?.gender || "").toLowerCase() === "male";
                    const gynaecObj = isMale
                        ? null
                        : (isUpdated
                            ? {
                                cycle: cycle
                                    ? (cycle.charAt(0).toUpperCase() + cycle.slice(1))
                                    : (baseObject?.specializedHistory?.gynaecHistory?.cycle || ""),
                                flow: flow
                                    ? (flow.charAt(0).toUpperCase() + flow.slice(1))
                                    : (baseObject?.specializedHistory?.gynaecHistory?.flow || ""),
                                pain: gynaecPain || baseObject?.specializedHistory?.gynaecHistory?.pain || "",
                                discharge: discharge || baseObject?.specializedHistory?.gynaecHistory?.discharge || "",
                                pregnancy: pregnancy || baseObject?.specializedHistory?.gynaecHistory?.pregnancy || "",
                                miscarriage: miscarriage || baseObject?.specializedHistory?.gynaecHistory?.miscarriage || "",
                                remarks: gynaecRemarks || baseObject?.specializedHistory?.gynaecHistory?.remarks || aiResponse?.specializedHistory?.gynaecHistory?.remarks || ""
                            }
                            : (baseObject?.specializedHistory?.gynaecHistory || aiResponse?.specializedHistory?.gynaecHistory || null));

                    const specializedHistory = {
                        gynaecHistory: gynaecObj,
                        mentalHealth: isUpdated
                            ? {
                                symptoms: (anxiety || depression || sleepQuality)
                                    ? ([anxiety, depression, sleepQuality].filter(Boolean) as any[])
                                    : (baseObject?.specializedHistory?.mentalHealth?.symptoms || aiResponse?.specializedHistory?.mentalHealth?.symptoms || []),
                                anxietyDetails: anxiety
                                    ? (anxiety.charAt(0).toUpperCase() + anxiety.slice(1))
                                    : (baseObject?.specializedHistory?.mentalHealth?.anxietyDetails || aiResponse?.specializedHistory?.mentalHealth?.anxietyDetails || ""),
                                depressionDetails: depression
                                    ? (depression.charAt(0).toUpperCase() + depression.slice(1))
                                    : (baseObject?.specializedHistory?.mentalHealth?.depressionDetails || aiResponse?.specializedHistory?.mentalHealth?.depressionDetails || ""),
                                sleepDetails: sleepQuality
                                    ? (sleepQuality.charAt(0).toUpperCase() + sleepQuality.slice(1))
                                    : (baseObject?.specializedHistory?.mentalHealth?.sleepDetails || aiResponse?.specializedHistory?.mentalHealth?.sleepDetails || ""),
                                stressLevel: stressLevel
                                    ? ((stressLevel ? (stressLevel.charAt(0).toUpperCase() + stressLevel.slice(1)) : "None") as any)
                                    : (baseObject?.specializedHistory?.mentalHealth?.stressLevel || aiResponse?.specializedHistory?.mentalHealth?.stressLevel || "None"),
                                doctorNotes: mentalRemarks || baseObject?.specializedHistory?.mentalHealth?.doctorNotes || aiResponse?.specializedHistory?.mentalHealth?.doctorNotes || ""
                            }
                            : {
                                symptoms: baseObject?.specializedHistory?.mentalHealth?.symptoms || aiResponse?.specializedHistory?.mentalHealth?.symptoms || [],
                                anxietyDetails: baseObject?.specializedHistory?.mentalHealth?.anxietyDetails || aiResponse?.specializedHistory?.mentalHealth?.anxietyDetails || "",
                                depressionDetails: baseObject?.specializedHistory?.mentalHealth?.depressionDetails || aiResponse?.specializedHistory?.mentalHealth?.depressionDetails || "",
                                sleepDetails: baseObject?.specializedHistory?.mentalHealth?.sleepDetails || aiResponse?.specializedHistory?.mentalHealth?.sleepDetails || "",
                                stressLevel: baseObject?.specializedHistory?.mentalHealth?.stressLevel || aiResponse?.specializedHistory?.mentalHealth?.stressLevel || "None",
                                doctorNotes: baseObject?.specializedHistory?.mentalHealth?.doctorNotes || aiResponse?.specializedHistory?.mentalHealth?.doctorNotes || ""
                            },
                        systemicNotes: isUpdated
                            ? {
                                gastro: {
                                    symptoms: gastricValue ? gastricValue.split(",").map(v => v.trim()).filter(Boolean) as any[] : (baseObject?.specializedHistory?.systemicNotes?.gastro?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.gastro?.symptoms || ["Nil"]),
                                    remarks: gastricRemarks || baseObject?.specializedHistory?.systemicNotes?.gastro?.remarks || aiResponse?.specializedHistory?.systemicNotes?.gastro?.remarks || ""
                                },
                                respiratory: {
                                    symptoms: respiratoryValue ? respiratoryValue.split(",").map(v => v.trim()).filter(Boolean) as any[] : (baseObject?.specializedHistory?.systemicNotes?.respiratory?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.respiratory?.symptoms || ["Nil"]),
                                    remarks: respiratoryRemarks || baseObject?.specializedHistory?.systemicNotes?.respiratory?.remarks || aiResponse?.specializedHistory?.systemicNotes?.respiratory?.remarks || ""
                                },
                                cardiac: {
                                    symptoms: cardiacValue ? cardiacValue.split(",").map(v => v.trim()).filter(Boolean) as any[] : (baseObject?.specializedHistory?.systemicNotes?.cardiac?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.cardiac?.symptoms || ["Nil"]),
                                    remarks: cardiacRemarks || baseObject?.specializedHistory?.systemicNotes?.cardiac?.remarks || aiResponse?.specializedHistory?.systemicNotes?.cardiac?.remarks || ""
                                },
                                nervous: {
                                    symptoms: nervousValue ? nervousValue.split(",").map(v => v.trim()).filter(Boolean) as any[] : (baseObject?.specializedHistory?.systemicNotes?.nervous?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.nervous?.symptoms || ["Nil"]),
                                    remarks: nervousRemarks || baseObject?.specializedHistory?.systemicNotes?.nervous?.remarks || aiResponse?.specializedHistory?.systemicNotes?.nervous?.remarks || ""
                                },
                                urinary: {
                                    symptoms: urinaryValue ? urinaryValue.split(",").map(v => v.trim()).filter(Boolean) as any[] : (baseObject?.specializedHistory?.systemicNotes?.urinary?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.urinary?.symptoms || ["Nil"]),
                                    remarks: urinaryRemarks || baseObject?.specializedHistory?.systemicNotes?.urinary?.remarks || aiResponse?.specializedHistory?.systemicNotes?.urinary?.remarks || ""
                                }
                            }
                            : {
                                gastro: {
                                    symptoms: baseObject?.specializedHistory?.systemicNotes?.gastro?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.gastro?.symptoms || ["Nil"],
                                    remarks: baseObject?.specializedHistory?.systemicNotes?.gastro?.remarks || aiResponse?.specializedHistory?.systemicNotes?.gastro?.remarks || ""
                                },
                                respiratory: {
                                    symptoms: baseObject?.specializedHistory?.systemicNotes?.respiratory?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.respiratory?.symptoms || ["Nil"],
                                    remarks: baseObject?.specializedHistory?.systemicNotes?.respiratory?.remarks || aiResponse?.specializedHistory?.systemicNotes?.respiratory?.remarks || ""
                                },
                                cardiac: {
                                    symptoms: baseObject?.specializedHistory?.systemicNotes?.cardiac?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.cardiac?.symptoms || ["Nil"],
                                    remarks: baseObject?.specializedHistory?.systemicNotes?.cardiac?.remarks || aiResponse?.specializedHistory?.systemicNotes?.cardiac?.remarks || ""
                                },
                                nervous: {
                                    symptoms: baseObject?.specializedHistory?.systemicNotes?.nervous?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.nervous?.symptoms || ["Nil"],
                                    remarks: baseObject?.specializedHistory?.systemicNotes?.nervous?.remarks || aiResponse?.specializedHistory?.systemicNotes?.nervous?.remarks || ""
                                },
                                urinary: {
                                    symptoms: baseObject?.specializedHistory?.systemicNotes?.urinary?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.urinary?.symptoms || ["Nil"],
                                    remarks: baseObject?.specializedHistory?.systemicNotes?.urinary?.remarks || aiResponse?.specializedHistory?.systemicNotes?.urinary?.remarks || ""
                                }
                            }
                    };

                    const physicalExamination = {
                        balanceMobility: isUpdated
                            ? {
                                sitting: (sitting || baseObject?.physicalExamination?.balanceMobility?.sitting || aiResponse?.physicalExamination?.balanceMobility?.sitting || "Normal") as any,
                                standing: (standing || baseObject?.physicalExamination?.balanceMobility?.standing || aiResponse?.physicalExamination?.balanceMobility?.standing || "Normal") as any,
                                walking: (walking || baseObject?.physicalExamination?.balanceMobility?.walking || aiResponse?.physicalExamination?.balanceMobility?.walking || "Normal") as any,
                                remarks: mobilityRemarks || baseObject?.physicalExamination?.balanceMobility?.remarks || aiResponse?.physicalExamination?.balanceMobility?.remarks || ""
                            }
                            : {
                                sitting: baseObject?.physicalExamination?.balanceMobility?.sitting || aiResponse?.physicalExamination?.balanceMobility?.sitting || "Normal",
                                standing: baseObject?.physicalExamination?.balanceMobility?.standing || aiResponse?.physicalExamination?.balanceMobility?.standing || "Normal",
                                walking: baseObject?.physicalExamination?.balanceMobility?.walking || aiResponse?.physicalExamination?.balanceMobility?.walking || "Normal",
                                remarks: baseObject?.physicalExamination?.balanceMobility?.remarks || aiResponse?.physicalExamination?.balanceMobility?.remarks || ""
                            },
                        pain: isUpdated
                            ? {
                                site: painSite || baseObject?.physicalExamination?.pain?.site || aiResponse?.physicalExamination?.pain?.site || "",
                                scale: painScale !== null ? Number(painScale) : (Number(baseObject?.physicalExamination?.pain?.scale) || Number(aiResponse?.physicalExamination?.pain?.scale) || 0),
                                characteristics: activeMarkType ? [activeMarkType.charAt(0).toUpperCase() + activeMarkType.slice(1)] as any[] : (baseObject?.physicalExamination?.pain?.characteristics || aiResponse?.physicalExamination?.pain?.characteristics || []),
                                locationNotes: painNotes || baseObject?.physicalExamination?.pain?.locationNotes || aiResponse?.physicalExamination?.pain?.locationNotes || "",
                                remarks: baseObject?.physicalExamination?.pain?.remarks || aiResponse?.physicalExamination?.pain?.remarks || ""
                            }
                            : {
                                site: baseObject?.physicalExamination?.pain?.site || aiResponse?.physicalExamination?.pain?.site || "",
                                scale: Number(baseObject?.physicalExamination?.pain?.scale) || Number(aiResponse?.physicalExamination?.pain?.scale) || 0,
                                characteristics: baseObject?.physicalExamination?.pain?.characteristics || aiResponse?.physicalExamination?.pain?.characteristics || [],
                                locationNotes: baseObject?.physicalExamination?.pain?.locationNotes || aiResponse?.physicalExamination?.pain?.locationNotes || "",
                                remarks: baseObject?.physicalExamination?.pain?.remarks || aiResponse?.physicalExamination?.pain?.remarks || ""
                            },
                        painMapping: isUpdated
                            ? (markers.length > 0
                                // Bilateral dot-pairs share a groupId → serialize each
                                // logical mark ONCE (with bilateralSymmetry: true),
                                // so 2 shoulder dots come back as 1 painMapping entry.
                                ? markers
                                    .filter((m: any, idx: number, arr: any[]) => {
                                        const g = m.groupId ?? String(m.id);
                                        return arr.findIndex((o: any) => (o.groupId ?? String(o.id)) === g) === idx;
                                    })
                                    .map((m: any) => {
                                        const view = (m.view === "back" ? "back" : "front") as BodyView;
                                        const mx = Number(m.x) || 0;
                                        const my = Number(m.y) || 0;
                                        // Resolve the nearest anatomical zone (14 rows × left/right)
                                        // with PATIENT-side left/right (front view is mirrored).
                                        const zoneInfo = nearestBodyZone(gender, view, mx, my);
                                        const isBilateral = !!m.bilateral || !!m.bilateralSymmetry;
                                        const bodyHalf = isBilateral ? "center" : zoneInfo.side;
                                        const bodyVertical = my < 33 ? "upper" : (my > 66 ? "lower" : "middle");
                                        const bodyZone = `${bodyHalf}-${bodyVertical}`;
                                        return {
                                            id: m.groupId || m.id?.toString() || "",
                                            view: view as any,
                                            markerType: (m.type || "pain") as any,
                                            bodyZone: bodyZone as any,
                                            bodyHalf: bodyHalf as any,
                                            bodyVertical: bodyVertical as any,
                                            bodyCode: zoneInfo.code,
                                            bodyRegion: zoneInfo.region,
                                            xPercent: mx,
                                            yPercent: my,
                                            bilateralSymmetry: isBilateral,
                                            notes: m.notes || ""
                                        };
                                    })
                                : (baseObject?.physicalExamination?.painMapping || aiResponse?.physicalExamination?.painMapping || []))
                            : (baseObject?.physicalExamination?.painMapping || aiResponse?.physicalExamination?.painMapping || []),
                        asthaVidhaPariksha: isUpdated
                            ? {
                                tongue: jihva || baseObject?.physicalExamination?.asthaVidhaPariksha?.tongue || aiResponse?.physicalExamination?.asthaVidhaPariksha?.tongue || "",
                                pulse: nadi || baseObject?.physicalExamination?.asthaVidhaPariksha?.pulse || aiResponse?.physicalExamination?.asthaVidhaPariksha?.pulse || "",
                                eyes: druk || baseObject?.physicalExamination?.asthaVidhaPariksha?.eyes || aiResponse?.physicalExamination?.asthaVidhaPariksha?.eyes || "",
                                nails: nakha || baseObject?.physicalExamination?.asthaVidhaPariksha?.nails || aiResponse?.physicalExamination?.asthaVidhaPariksha?.nails || "",
                                vataNotes: vata || baseObject?.physicalExamination?.asthaVidhaPariksha?.vataNotes || aiResponse?.physicalExamination?.asthaVidhaPariksha?.vataNotes || "",
                                pittaNotes: pitta || baseObject?.physicalExamination?.asthaVidhaPariksha?.pittaNotes || aiResponse?.physicalExamination?.asthaVidhaPariksha?.pittaNotes || "",
                                kaphaNotes: kapha || baseObject?.physicalExamination?.asthaVidhaPariksha?.kaphaNotes || aiResponse?.physicalExamination?.asthaVidhaPariksha?.kaphaNotes || "",
                                overallPrakriti: prakriti || baseObject?.physicalExamination?.asthaVidhaPariksha?.overallPrakriti || aiResponse?.physicalExamination?.asthaVidhaPariksha?.overallPrakriti || "",
                                remarks: baseObject?.physicalExamination?.asthaVidhaPariksha?.remarks || aiResponse?.physicalExamination?.asthaVidhaPariksha?.remarks || ""
                            }
                            : {
                                tongue: baseObject?.physicalExamination?.asthaVidhaPariksha?.tongue || aiResponse?.physicalExamination?.asthaVidhaPariksha?.tongue || "",
                                pulse: baseObject?.physicalExamination?.asthaVidhaPariksha?.pulse || aiResponse?.physicalExamination?.asthaVidhaPariksha?.pulse || "",
                                eyes: baseObject?.physicalExamination?.asthaVidhaPariksha?.eyes || aiResponse?.physicalExamination?.asthaVidhaPariksha?.eyes || "",
                                nails: baseObject?.physicalExamination?.asthaVidhaPariksha?.nails || aiResponse?.physicalExamination?.asthaVidhaPariksha?.nails || "",
                                vataNotes: baseObject?.physicalExamination?.asthaVidhaPariksha?.vataNotes || aiResponse?.physicalExamination?.asthaVidhaPariksha?.vataNotes || "",
                                pittaNotes: baseObject?.physicalExamination?.asthaVidhaPariksha?.pittaNotes || aiResponse?.physicalExamination?.asthaVidhaPariksha?.pittaNotes || "",
                                kaphaNotes: baseObject?.physicalExamination?.asthaVidhaPariksha?.kaphaNotes || aiResponse?.physicalExamination?.asthaVidhaPariksha?.kaphaNotes || "",
                                overallPrakriti: baseObject?.physicalExamination?.asthaVidhaPariksha?.overallPrakriti || aiResponse?.physicalExamination?.asthaVidhaPariksha?.overallPrakriti || "",
                                remarks: baseObject?.physicalExamination?.asthaVidhaPariksha?.remarks || aiResponse?.physicalExamination?.asthaVidhaPariksha?.remarks || ""
                            }
                    };

                    const investigations = {
                        radiology: isUpdated
                            ? {
                                findings: radiologySelected ? radiologySelected.split(",").map(s => s.trim()).filter(Boolean) as any[] : (baseObject?.investigations?.radiology?.findings || aiResponse?.investigations?.radiology?.findings || ["Nil"]),
                                remarks: radiologyRemarks || baseObject?.investigations?.radiology?.remarks || aiResponse?.investigations?.radiology?.remarks || ""
                            }
                            : {
                                findings: baseObject?.investigations?.radiology?.findings || aiResponse?.investigations?.radiology?.findings || ["Nil"],
                                remarks: baseObject?.investigations?.radiology?.remarks || aiResponse?.investigations?.radiology?.remarks || ""
                            },
                        laboratory: isUpdated
                            ? {
                                tests: pathologySelected ? pathologySelected.split(",").map(s => s.trim()).filter(Boolean) as any[] : (baseObject?.investigations?.laboratory?.tests || aiResponse?.investigations?.laboratory?.tests || ["Nil"]),
                                testsPrescribed: prescribedLabTests || baseObject?.investigations?.laboratory?.testsPrescribed || aiResponse?.investigations?.laboratory?.testsPrescribed || "",
                                remarks: baseObject?.investigations?.laboratory?.remarks || baseObject?.investigations?.laboratory?.remarks || ""
                            }
                            : {
                                tests: baseObject?.investigations?.laboratory?.tests || aiResponse?.investigations?.laboratory?.tests || ["Nil"],
                                testsPrescribed: baseObject?.investigations?.laboratory?.testsPrescribed || aiResponse?.investigations?.laboratory?.testsPrescribed || "",
                                remarks: baseObject?.investigations?.laboratory?.remarks || aiResponse?.investigations?.laboratory?.remarks || ""
                            },
                        diagnosis: isUpdated
                            ? {
                                provisional: provisionalDiagnosis || baseObject?.investigations?.diagnosis?.provisional || aiResponse?.investigations?.diagnosis?.provisional || "",
                                provisionalConfidence: 1.0,
                                final: finalDiagnosis || baseObject?.investigations?.diagnosis?.final || aiResponse?.investigations?.diagnosis?.final || "",
                                finalConfidence: 1.0,
                                remarks: baseObject?.investigations?.diagnosis?.remarks || aiResponse?.investigations?.diagnosis?.remarks || "",
                                stamp: baseObject?.investigations?.diagnosis?.stamp || aiResponse?.investigations?.diagnosis?.stamp || { Std_Code: "", Std_Name: "" }
                            }
                            : {
                                provisional: baseObject?.investigations?.diagnosis?.provisional || aiResponse?.investigations?.diagnosis?.provisional || "",
                                provisionalConfidence: Number(baseObject?.investigations?.diagnosis?.provisionalConfidence) || Number(aiResponse?.investigations?.diagnosis?.provisionalConfidence) || 0,
                                final: baseObject?.investigations?.diagnosis?.final || aiResponse?.investigations?.diagnosis?.final || "",
                                finalConfidence: Number(baseObject?.investigations?.diagnosis?.finalConfidence) || Number(aiResponse?.investigations?.diagnosis?.finalConfidence) || 0,
                                remarks: baseObject?.investigations?.diagnosis?.remarks || aiResponse?.investigations?.diagnosis?.remarks || "",
                                stamp: baseObject?.investigations?.diagnosis?.stamp || aiResponse?.investigations?.diagnosis?.stamp || { Std_Code: "", Std_Name: "" }
                            }
                    };

                    const treatmentPlan = {
                        patientEducation: isUpdated
                            ? (patientInstruction || baseObject?.treatmentPlan?.patientEducation || aiResponse?.treatmentPlan?.patientEducation || "")
                            : (baseObject?.treatmentPlan?.patientEducation || aiResponse?.treatmentPlan?.patientEducation || ""),
                        prescribedMedicines: isUpdated
                            ? (medicines.some(m => m.name)
                                ? medicines.map((m: any) => {
                                    const dbMed = Array.isArray(medicinesList)
                                        ? medicinesList.find(db => (db.name || "").trim().toLowerCase() === (m.name || "").trim().toLowerCase())
                                        : null;
                                    const { amount: dVal, unit: dUnit } = parseDosageComponents(m.dosage);
                                    const { amount: durVal, unit: durUnit } = parseDurationComponents(m.duration);
                                    return {
                                        medicineName: m.name || "",
                                        medicineDosage: m.dosage || "",
                                        medicineFrequency: m.frequency || "",
                                        medicineTiming: getTimingLabel(m.timing) || m.timing || "",
                                        medicineDuration: m.duration || "",
                                        medicineRemarks: m.remarks || "",
                                        dosageValue: dVal ? Number(dVal) : 1,
                                        dosageUnit: dUnit || "TAB",
                                        durationValue: durVal ? Number(durVal) : 1,
                                        durationUnit: (durUnit || "Days").toUpperCase(),
                                        frequencyKey: normalizeFrequencyValue(m.frequency) || m.frequency || "",
                                        timingKey: getTimingKey(m.timing) || (m.timingKey && m.timingKey.toUpperCase()) || "",
                                        confidence: 1.0,
                                        stamp: {
                                            Std_Code: dbMed?.jatayuCd || "",
                                            Std_Name: dbMed?.name || m.name || ""
                                        }
                                    };
                                })
                                : (baseObject?.treatmentPlan?.prescribedMedicines || aiResponse?.treatmentPlan?.prescribedMedicines || []))
                            : (baseObject?.treatmentPlan?.prescribedMedicines || aiResponse?.treatmentPlan?.prescribedMedicines || []),
                        diet: isUpdated
                            ? (dietAdvice || baseObject?.treatmentPlan?.diet || aiResponse?.treatmentPlan?.diet || "")
                            : (baseObject?.treatmentPlan?.diet || aiResponse?.treatmentPlan?.diet || ""),
                        lifestyle: isUpdated
                            ? (lifestyleChanges || baseObject?.treatmentPlan?.lifestyle || aiResponse?.treatmentPlan?.lifestyle || "")
                            : (baseObject?.treatmentPlan?.lifestyle || aiResponse?.treatmentPlan?.lifestyle || ""),
                        yogaPranayama: isUpdated
                            ? (physicalExercises || baseObject?.treatmentPlan?.yogaPranayama || aiResponse?.treatmentPlan?.yogaPranayama || "")
                            : (baseObject?.treatmentPlan?.yogaPranayama || aiResponse?.treatmentPlan?.yogaPranayama || ""),
                        treatmentNotes: isUpdated
                            ? (clinicalRemarks || baseObject?.treatmentPlan?.treatmentNotes || aiResponse?.treatmentPlan?.treatmentNotes || "")
                            : (baseObject?.treatmentPlan?.treatmentNotes || aiResponse?.treatmentPlan?.treatmentNotes || "")
                    };

                    const getImprovement = () => {
                        if (Number(visitCount) <= 1 || appData?.visitType === "first") return "First Visit";
                        if (progressStatus === "Better") return "Improved";
                        if (progressStatus === "Same") return "Stable";
                        if (progressStatus === "Worse" || progressStatus === "New Symptoms") return "Worsened";
                        return "Stable";
                    };

                    const progressMonitoring = {
                        visitNumber: Number(visitCount) || 1,
                        followUpRequired: isUpdated
                            ? (getValidISO(followUpDate) ? "YES" : "NO")
                            : (baseObject?.progressMonitoring?.followUpRequired || aiResponse?.progressMonitoring?.followUpRequired || "NO"),
                        followUpDate: isUpdated
                            ? getValidISO(followUpDate)
                            : getValidISO(baseObject?.progressMonitoring?.followUpDate || aiResponse?.progressMonitoring?.followUpDate),
                        progressNotes: isUpdated
                            ? (clinicalRemarks || baseObject?.progressMonitoring?.progressNotes || aiResponse?.progressMonitoring?.progressNotes || "")
                            : (baseObject?.progressMonitoring?.progressNotes || aiResponse?.progressMonitoring?.progressNotes || ""),
                        comparisonWithPreviousVisit: isUpdated
                            ? (progressStatus || baseObject?.progressMonitoring?.comparisonWithPreviousVisit || aiResponse?.progressMonitoring?.comparisonWithPreviousVisit || "")
                            : (baseObject?.progressMonitoring?.comparisonWithPreviousVisit || aiResponse?.progressMonitoring?.comparisonWithPreviousVisit || ""),
                        medicineAdherence: isUpdated
                            ? (medicineAdherence || baseObject?.progressMonitoring?.medicineAdherence || aiResponse?.progressMonitoring?.medicineAdherence || "")
                            : (baseObject?.progressMonitoring?.medicineAdherence || aiResponse?.progressMonitoring?.medicineAdherence || ""),
                        symptomRecovery: isUpdated
                            ? {
                                pain: Number(painRecovery) || 0,
                                digestion: Number(digestionRecovery) || 0,
                                energy: Number(energyRecovery) || 0,
                                sleep: Number(sleepRecovery) || 0
                            }
                            : (baseObject?.progressMonitoring?.symptomRecovery || aiResponse?.progressMonitoring?.symptomRecovery || {
                                pain: 0,
                                digestion: 0,
                                energy: 0,
                                sleep: 0
                            }),
                        overallImprovement: isUpdated
                            ? (getImprovement() as any)
                            : (baseObject?.progressMonitoring?.overallImprovement || aiResponse?.progressMonitoring?.overallImprovement || "First Visit")
                    };

                    const p1 = getSection1Percent();
                    const p2 = getSection2Percent();
                    const p3 = getSection3Percent();
                    const p4 = getSection4Percent();
                    const p5 = getSection5Percent();
                    const p6 = getSection6Percent();
                    const p7 = getSection7Percent();
                    const p8 = getSection8Percent();

                    const p8Val = showProgressMonitoring ? p8 : 100;
                    const overallCompletion = showProgressMonitoring
                        ? Math.round((p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8) / 8)
                        : Math.round((p1 + p2 + p3 + p4 + p5 + p6 + p7) / 7);

                    const getStatus = (p: number) => {
                        if (p === 0) return "Not Started";
                        if (p === 100) return "Completed";
                        return "In Progress";
                    };

                    const completedSections = showProgressMonitoring
                        ? [p1, p2, p3, p4, p5, p6, p7, p8].filter(p => p === 100).length
                        : [p1, p2, p3, p4, p5, p6, p7].filter(p => p === 100).length;

                    const progressTracking = {
                        overallCompletion,
                        sectionCompletion: {
                            patientPresentation: p1,
                            medications: p2,
                            systemicReview: p3,
                            specializedHistory: p4,
                            physicalExamination: p5,
                            investigations: p6,
                            treatmentPlan: p7,
                            progressMonitoring: p8Val
                        },
                        completedSections,
                        sectionStatus: {
                            patientPresentation: getStatus(p1) as any,
                            medications: getStatus(p2) as any,
                            systemicReview: getStatus(p3) as any,
                            specializedHistory: getStatus(p4) as any,
                            physicalExamination: getStatus(p5) as any,
                            investigations: getStatus(p6) as any,
                            treatmentPlan: getStatus(p7) as any,
                            progressMonitoring: getStatus(p8Val) as any
                        }
                    };

                    return {
                        metadata,
                        doctorInfo,
                        patientInfo,
                        patientPresentation,
                        medications,
                        systemicReview,
                        specializedHistory,
                        physicalExamination,
                        investigations,
                        treatmentPlan,
                        ...(showProgressMonitoring ? { progressMonitoring } : {}),
                        progressTracking
                    };
                };

                const updatedResponse = buildResponse(aiResponse, true);

                const parseDosage = (dosageStr: string) => {
                    if (!dosageStr) return { amount: null, unit: null };
                    const match = dosageStr.trim().match(/^([0-9\/\.\u00BC-\u00BE\u2150-\u2189]+)\s*(.*)$/);
                    if (match) {
                        let amount = match[1];
                        let unitRaw = match[2].trim().toUpperCase();
                        let unit = null;
                        if (unitRaw.includes("TABLET") || unitRaw.includes("TAB")) unit = "TABLET";
                        else if (unitRaw.includes("CAPSULE") || unitRaw.includes("CAP")) unit = "CAPSULE";
                        else if (unitRaw.includes("ML")) unit = "ML";
                        else if (unitRaw.includes("DROP")) unit = "DROP";
                        else if (unitRaw.includes("SPOON") || unitRaw.includes("TSP")) unit = "SPOON";
                        else if (unitRaw.includes("GM") || unitRaw.includes("GRAM")) unit = "GM";

                        return { amount, unit };
                    }
                    return { amount: dosageStr, unit: null };
                };

                const mapFrequency = (freqStr: string): string | null => {
                    if (!freqStr) return null;
                    const clean = freqStr.trim().toUpperCase();
                    if (clean.includes("ONCE DAILY") || clean === "OD" || clean.includes("ONCE A DAY")) return "OD";
                    if (clean.includes("TWICE DAILY") || clean === "BD" || clean.includes("TWICE A DAY")) return "BD";
                    if (clean.includes("THRICE DAILY") || clean === "TDS") return "TDS";
                    if (clean.includes("FOUR TIMES DAILY") || clean === "QID") return "QID";
                    if (clean.includes("EVERY MORNING")) return "EVERY_MORNING";
                    if (clean.includes("EVERY EVENING")) return "EVERY_EVENING";
                    if (clean.includes("EVERY NIGHT") || clean === "EVERY_NIGHT") return "EVERY_NIGHT";
                    if (clean.includes("EVERY 4 HOURS")) return "EVERY_4_HOURS";
                    if (clean.includes("EVERY 6 HOURS")) return "EVERY_6_HOURS";
                    if (clean.includes("EVERY 8 HOURS")) return "EVERY_8_HOURS";
                    if (clean.includes("EVERY 12 HOURS")) return "EVERY_12_HOURS";
                    if (clean.includes("EVERY 24 HOURS")) return "EVERY_24_HOURS";
                    if (clean.includes("ONCE WEEKLY")) return "ONCE_WEEKLY";
                    if (clean.includes("TWICE WEEKLY")) return "TWICE_WEEKLY";
                    if (clean.includes("ALTERNATE DAYS")) return "ALTERNATE_DAYS";
                    if (clean.includes("ONCE MONTHLY")) return "ONCE_MONTHLY";

                    const enums = [
                        'OD', 'BD', 'TDS', 'QID',
                        'EVERY_MORNING', 'EVERY_EVENING', 'EVERY_NIGHT',
                        'EVERY_4_HOURS', 'EVERY_6_HOURS', 'EVERY_8_HOURS', 'EVERY_12_HOURS', 'EVERY_24_HOURS',
                        'ONCE_WEEKLY', 'TWICE_WEEKLY', 'ALTERNATE_DAYS', 'ONCE_MONTHLY',
                    ];
                    if (enums.includes(clean)) return clean;
                    return null;
                };

                const mapTiming = (timingStr: string): string | null => {
                    if (!timingStr) return null;
                    const clean = timingStr.trim().toUpperCase();

                    if (clean.includes("BEFORE BREAKFAST") || clean === "BEFORE_BREAKFAST") return "BEFORE_BREAKFAST";
                    if (clean.includes("AFTER BREAKFAST") || clean === "AFTER_BREAKFAST") return "AFTER_BREAKFAST";
                    if (clean.includes("BEFORE LUNCH") || clean === "BEFORE_LUNCH") return "BEFORE_LUNCH";
                    if (clean.includes("AFTER LUNCH") || clean === "AFTER_LUNCH") return "AFTER_LUNCH";
                    if (clean.includes("BEFORE DINNER") || clean === "BEFORE_DINNER") return "BEFORE_DINNER";
                    if (clean.includes("AFTER DINNER") || clean === "AFTER_DINNER") return "AFTER_DINNER";
                    if (clean.includes("EMPTY STOMACH") || clean === "EMPTY_STOMACH") return "EMPTY_STOMACH";
                    if (clean.includes("EARLY MORNING EMPTY STOMACH") || clean === "EARLY_MORNING_EMPTY_STOMACH") return "EARLY_MORNING_EMPTY_STOMACH";
                    if (clean.includes("AT BEDTIME") || clean === "AT_BEDTIME") return "AT_BEDTIME";
                    if (clean.includes("BEFORE SLEEP") || clean === "BEFORE_SLEEP") return "BEFORE_SLEEP";
                    if (clean.includes("BEFORE FOOD") || clean === "BEFORE_FOOD") return "BEFORE_FOOD";
                    if (clean.includes("AFTER FOOD") || clean === "AFTER_FOOD") return "AFTER_FOOD";
                    if (clean.includes("WITH FOOD") || clean === "WITH_FOOD") return "WITH_FOOD";
                    if (clean.includes("WITH MILK") || clean === "WITH_MILK") return "WITH_MILK";
                    if (clean.includes("WITH WATER") || clean === "WITH_WATER") return "WITH_WATER";
                    if (clean.includes("MORNING") && !clean.includes("EARLY MORNING")) return "MORNING";
                    if (clean.includes("AFTERNOON")) return "AFTERNOON";
                    if (clean.includes("EVENING")) return "EVENING";
                    if (clean.includes("NIGHT")) return "NIGHT";

                    const enums = [
                        'BEFORE_BREAKFAST', 'AFTER_BREAKFAST', 'BEFORE_LUNCH', 'AFTER_LUNCH',
                        'BEFORE_DINNER', 'AFTER_DINNER', 'EMPTY_STOMACH', 'EARLY_MORNING_EMPTY_STOMACH',
                        'AT_BEDTIME', 'BEFORE_SLEEP', 'BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD',
                        'WITH_MILK', 'WITH_WATER', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'
                    ];
                    if (enums.includes(clean)) {
                        return clean;
                    }

                    return null;
                };

                const parseDuration = (durationStr: string) => {
                    if (!durationStr) return { amount: null, unit: null };
                    const match = durationStr.trim().match(/^([0-9\/\.\u00BC-\u00BE\u2150-\u2189]+)\s*(.*)$/);
                    if (match) {
                        let amount = match[1];
                        let unitRaw = match[2].trim().toUpperCase();
                        let unit = null;
                        if (unitRaw.includes("DAY")) unit = "DAY";
                        else if (unitRaw.includes("WEEK")) unit = "WEEK";
                        else if (unitRaw.includes("MONTH")) unit = "MONTH";
                        else if (unitRaw.includes("YEAR")) unit = "YEAR";

                        return { amount, unit };
                    }
                    return { amount: durationStr, unit: null };
                };

                const updatedPrescribedMedicines = medicines
                    .filter(m => m.name && m.name.trim() !== "")
                    .map((m: any) => {
                        const dbMed = Array.isArray(medicinesList)
                            ? medicinesList.find(db => (db.name || "").trim().toLowerCase() === (m.name || "").trim().toLowerCase())
                            : null;

                        const parsedDosage = parseDosage(m.dosage);
                        const parsedDuration = parseDuration(m.duration);

                        return {
                            medicineId: dbMed ? Number(dbMed.id) : null,
                            medicineName: m.name || "",
                            dosageAmount: parsedDosage.amount,
                            dosageUnit: parsedDosage.unit,
                            medicineFrequency: mapFrequency(m.frequency),
                            medicineTiming: mapTiming(m.timing),
                            durationAmount: parsedDuration.amount,
                            durationUnit: parsedDuration.unit,
                            remark: m.remarks || ""
                        };
                    });

                const dynamicPatientType = (() => {
                    const raw = (
                        appData?.patientType ||
                        appData?.patient_type ||
                        appData?.type ||
                        appData?.registration?.patientType ||
                        (appData?.registration as any)?.patient_type ||
                        ""
                    ).toString().trim().toLowerCase();

                    if (raw === "ipd") return "ipd";
                    if (raw === "daycare" || raw === "day_care") return "daycare";
                    if (raw === "opd") return "opd";
                    return "opd";
                })();

                const resolvedPatientId = (() => {
                    const pId = appData?.patientId ?? (appData as any)?.patient_id;
                    if (pId != null && pId !== "") {
                        const num = Number(pId);
                        return isNaN(num) ? undefined : num;
                    }
                    return undefined;
                })();

                const payload: any = {
                    appointmentId: Number(appData?.appointmentId) || 101,
                    branchId: Number(branchId) || Number(appData?.branchId) || 2,
                    doctorId: Number(appData?.doctorId) || Number(authDoctorId) || 3,
                    visitType: calculatedVisitType,
                    patientType: dynamicPatientType,
                    ...((dynamicPatientType === "ipd" || dynamicPatientType === "daycare") && resolvedPatientId != null
                        ? { patientId: resolvedPatientId }
                        : {}
                    ),
                    isEdited: true,
                    recommendedCareType: patientReferredTo === "IPD Admission"
                        ? "ipd"
                        : patientReferredTo === "Day Care Admission"
                            ? "day_care"
                            : "followup",
                    aiResponse: aiResponse,
                    updatedResponse: updatedResponse,
                    updatedPrescribedMedicines: updatedPrescribedMedicines,
                    therapies: (therapies || []).map(t => ({
                        uhid: appData?.uhid || appData?.patientID || "DRBS012026",
                        appointmentId: Number(appData?.appointmentId) || 2,
                        therapyId: Number(t.therapyId),
                        therapySessions: t.therapySessions !== undefined ? Number(t.therapySessions) : undefined,
                        therapyDays: t.therapyDays !== undefined ? Number(t.therapyDays) : undefined,
                        patientType: dynamicPatientType
                    })),
                    uhid: appData?.uhid || appData?.patientID || "DRBS012026",
                    doctorNotes: doctorNotes || "",
                    ...(() => {
                        const arr = Array.isArray(communicableDiseases)
                            ? communicableDiseases
                            : typeof communicableDiseases === "string" && communicableDiseases.trim()
                                ? communicableDiseases.replace(/[{}]/g, "").split(",").map(s => s.trim()).filter(Boolean)
                                : infectiousAlert && infectiousAlert !== "none" && infectiousAlert !== "normal"
                                    ? [infectiousAlert]
                                    : [];
                        return arr.length > 0 ? { communicableDiseases: arr } : {};
                    })(),
                    // communicableDiseasesRemark: infectiousDetails
                };

                const validISO = getValidISO(followUpDate);
                if (validISO || followUpRemarks) {
                    payload.opdFollowUp = {
                        opdNextFollowupRemark: followUpRemarks || ""
                    };
                    if (validISO) {
                        payload.opdFollowUp.opdNextFollowupDate = validISO;
                    }
                }

                // console.log("Assessment payload before request:", JSON.stringify(payload, null, 2));
                const result = await createOpdAssessment(payload).unwrap();
                // console.log("CreateOpdAssessment success:", result);
                if (typeof window !== "undefined") {
                    const docId = appData?.doctorId || payload?.doctorId || 0;
                    const appId = appData?.appointmentId || payload?.appointmentId || 0;
                    localStorage.removeItem(`draft_consultation_${docId}_${appId}`);
                }
                setIsConfirmDialogOpen(false);
                setShowSuccessDialog(true);
            } catch (error) {
                console.error("CreateOpdAssessment error:", error);
                // console.log("Full error details:", JSON.stringify(error, null, 2));
                setIsConfirmDialogOpen(false);
                setShowErrorDialog(true);
            } finally {
                setIsSubmitting(false);
            }
        };

        // Mapping allergyHistory to allergy prop
        const allergyHistory = allergy;
        const setAllergyHistory = setAllergy;

        // ------------------ 1. Patient Presentation State ------------------
        const [hpi, setHpi] = useState("");
        const [gender, setGender] = useState(initialGender || "");
        const [isNotesOpen, setIsNotesOpen] = useState(false);

        useEffect(() => {
            if (initialGender) {
                setGender(initialGender);
            }
        }, [initialGender]);
        const [socialHistory, setSocialHistory] = useState("");
        const [pastMedicalHistory, setPastMedicalHistory] = useState("");
        const [familyHistory, setFamilyHistory] = useState("");

        // ------------------ 2. Medications & Supplements State ------------------
        const [currentMedications, setCurrentMedications] = useState<"yes" | "no" | "">("");
        const [medRemarks, setMedRemarks] = useState("");
        const [surgeryHistory, setSurgeryHistory] = useState("");

        // ------------------ 3. Systemic Review & Co-morbidities State ------------------
        const [diabeticYears, setDiabeticYears] = useState("");
        const [diabetesNotes, setDiabetesNotes] = useState("");
        const [bpRemarks, setBpRemarks] = useState("");
        const [thyroidRemarks, setThyroidRemarks] = useState("");
        const [allergyDetails, setAllergyDetails] = useState("");
        const [infectiousAlert, setInfectiousAlert] = useState<"hiv" | "hepatitis" | "tb" | "none" | "normal" | "">("");
        const [infectiousDetails, setInfectiousDetails] = useState("");

        // ------------------ Visit Details State ------------------
        const [visitDate, setVisitDate] = useState("2025-05-01");
        const [visitDoctor, setVisitDoctor] = useState("");
        const [visitLocation, setVisitLocation] = useState("");

        // ------------------ 8. Progress Monitoring State ------------------
        const [visitCount, setVisitCount] = useState(initialVisitCount || 1);
        const [progressStatus, setProgressStatus] = useState("");
        const [medicineAdherence, setMedicineAdherence] = useState("");
        const [painRecovery, setPainRecovery] = useState(0);
        const [digestionRecovery, setDigestionRecovery] = useState(0);
        const [energyRecovery, setEnergyRecovery] = useState(0);
        const [sleepRecovery, setSleepRecovery] = useState(0);
        const [clinicalRemarks, setClinicalRemarks] = useState("");

        useEffect(() => {
            if (currentVisitNumber) {
                setVisitCount(currentVisitNumber);
            }
        }, [currentVisitNumber]);

        // ------------------ 4. Specialized History State ------------------
        const [cycle, setCycle] = useState("");
        const [flow, setFlow] = useState("");
        const [gynaecPain, setGynaecPain] = useState("");
        const [discharge, setDischarge] = useState("");
        const [pregnancy, setPregnancy] = useState("");
        const [miscarriage, setMiscarriage] = useState("");
        const [gynaecRemarks, setGynaecRemarks] = useState("");

        const [anxiety, setAnxiety] = useState("");
        const [depression, setDepression] = useState("");
        const [sleepQuality, setSleepQuality] = useState("");
        const [stressLevel, setStressLevel] = useState<"mild" | "moderate" | "severe" | "none" | "">("");
        const [mentalRemarks, setMentalRemarks] = useState("");

        const [gastricValue, setGastricValue] = useState("");
        const [gastricRemarks, setGastricRemarks] = useState("");

        const [so2, setSo2] = useState("");
        const [respiratoryValue, setRespiratoryValue] = useState("");
        const [respiratoryRemarks, setRespiratoryRemarks] = useState("");

        const [cardiacValue, setCardiacValue] = useState("");
        const [cardiacRemarks, setCardiacRemarks] = useState("");

        const [nervousValue, setNervousValue] = useState("");
        const [nervousRemarks, setNervousRemarks] = useState("");

        const [urinaryValue, setUrinaryValue] = useState("");
        const [urinaryRemarks, setUrinaryRemarks] = useState("");

        // ------------------ 5. Physical Examination & Disorders State ------------------
        const [mobilityRemarks, setMobilityRemarks] = useState("");

        const [painSite, setPainSite] = useState("");
        const [painScale, setPainScale] = useState<number | null>(null);
        const [activeMarkType, setActiveMarkType] = useState<"pain" | "swelling" | "numbness">("pain");
        const [markers, setMarkers] = useState<BodyMarker[]>([]);
        const [painNotes, setPainNotes] = useState("");

        const [nadi, setNadi] = useState("");
        const [mala, setMala] = useState("");
        const [mutra, setMutra] = useState("");
        const [jihva, setJihva] = useState("");
        const [shabda, setShabda] = useState("");
        const [sparsha, setSparsha] = useState("");
        const [druk, setDruk] = useState("");
        const [akruti, setAkruti] = useState("");
        const [nakha, setNakha] = useState("");
        const [vata, setVata] = useState("");
        const [pitta, setPitta] = useState("");
        const [kapha, setKapha] = useState("");
        const [prakriti, setPrakriti] = useState("");

        // ------------------ 6. Investigations & Radiology State ------------------
        const [radiologySelected, setRadiologySelected] = useState("");
        const [pathologySelected, setPathologySelected] = useState("");
        const [radiologyRemarks, setRadiologyRemarks] = useState("");
        const [prescribedLabTests, setPrescribedLabTests] = useState("");
        const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");

        // ------------------ 7. Treatment Plan & Education State ------------------
        const [patientInstruction, setPatientInstruction] = useState("");
        const [dietAdvice, setDietAdvice] = useState("");
        const [lifestyleChanges, setLifestyleChanges] = useState("");
        const [physicalExercises, setPhysicalExercises] = useState("");
        const [patientReferredTo, setPatientReferredTo] = useState("");

        // Validation State
        const [errors, setErrors] = useState<Record<string, string>>({});
        const [medicineErrors, setMedicineErrors] = useState<Record<string, string>[]>([{}]);

        // Validation Refs
        const chiefComplaintRef = useRef<HTMLTextAreaElement>(null);
        const symptomsRef = useRef<HTMLTextAreaElement>(null);
        const currentMedicationsRef = useRef<HTMLDivElement>(null);
        const painScaleRef = useRef<HTMLDivElement>(null);

        const diabetesRef = useRef<HTMLDivElement>(null);
        const bloodPressureRef = useRef<HTMLDivElement>(null);
        const thyroidRef = useRef<HTMLDivElement>(null);
        const allergyHistoryRef = useRef<HTMLDivElement>(null);
        const infectiousAlertRef = useRef<HTMLDivElement>(null);

        const gastricValueRef = useRef<HTMLDivElement>(null);
        const stressLevelRef = useRef<HTMLDivElement>(null);

        const sittingRef = useRef<HTMLDivElement>(null);
        const standingRef = useRef<HTMLDivElement>(null);
        const walkingRef = useRef<HTMLDivElement>(null);

        const prakritiRef = useRef<HTMLTextAreaElement>(null);
        const finalDiagnosisRef = useRef<HTMLTextAreaElement>(null);

        const medicineRowRefs = useRef<(HTMLDivElement | null)[]>([]);
        const dietAdviceRef = useRef<HTMLInputElement>(null);
        const patientReferredToRef = useRef<HTMLDivElement>(null);

        const progressStatusRef = useRef<HTMLDivElement>(null);
        const medicineAdherenceRef = useRef<HTMLDivElement>(null);
        const clinicalRemarksRef = useRef<HTMLTextAreaElement>(null);

        const containerRef = useRef<HTMLDivElement>(null);
        useArrowKeyNavigation(containerRef, true);

        // Active Section Scroll Reference
        const section1Ref = useRef<HTMLDivElement>(null);
        const section2Ref = useRef<HTMLDivElement>(null);
        const section3Ref = useRef<HTMLDivElement>(null);
        const section4Ref = useRef<HTMLDivElement>(null);
        const section5Ref = useRef<HTMLDivElement>(null);
        const section6Ref = useRef<HTMLDivElement>(null);
        const section7Ref = useRef<HTMLDivElement>(null);
        const section8Ref = useRef<HTMLDivElement>(null);

        // Auto scroll to top of this card on mount (Step 3)
        useEffect(() => {
            containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, []);

        const [isDraftLoaded, setIsDraftLoaded] = useState(false);

        // Load draft in ClinicalAssessmentRecord
        useEffect(() => {
            if (typeof window === "undefined") {
                setIsDraftLoaded(true);
                return;
            }
            const docId = appData?.doctorId || 0;
            const appId = appData?.appointmentId || 0;
            if (!docId || !appId) {
                setIsDraftLoaded(true);
                return;
            }

            const savedDraft = localStorage.getItem(`draft_consultation_${docId}_${appId}`);
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft);
                    if (draft.diabeticYears !== undefined) setDiabeticYears(draft.diabeticYears);
                    if (draft.diabetesNotes !== undefined) setDiabetesNotes(draft.diabetesNotes);
                    if (draft.bpRemarks !== undefined) setBpRemarks(draft.bpRemarks);
                    if (draft.thyroidRemarks !== undefined) setThyroidRemarks(draft.thyroidRemarks);
                    if (draft.allergyDetails !== undefined) setAllergyDetails(draft.allergyDetails);
                    if (draft.infectiousAlert !== undefined) setInfectiousAlert(draft.infectiousAlert);
                    if (draft.infectiousDetails !== undefined) setInfectiousDetails(draft.infectiousDetails);
                    if (draft.gastricValue !== undefined) setGastricValue(draft.gastricValue);
                    if (draft.gastricRemarks !== undefined) setGastricRemarks(draft.gastricRemarks);
                    if (draft.so2 !== undefined) setSo2(draft.so2);
                    if (draft.respiratoryValue !== undefined) setRespiratoryValue(draft.respiratoryValue);
                    if (draft.respiratoryRemarks !== undefined) setRespiratoryRemarks(draft.respiratoryRemarks);
                    if (draft.cardiacValue !== undefined) setCardiacValue(draft.cardiacValue);
                    if (draft.cardiacRemarks !== undefined) setCardiacRemarks(draft.cardiacRemarks);
                    if (draft.nervousValue !== undefined) setNervousValue(draft.nervousValue);
                    if (draft.nervousRemarks !== undefined) setNervousRemarks(draft.nervousRemarks);
                    if (draft.urinaryValue !== undefined) setUrinaryValue(draft.urinaryValue);
                    if (draft.urinaryRemarks !== undefined) setUrinaryRemarks(draft.urinaryRemarks);
                    if (draft.cycle !== undefined) setCycle(draft.cycle);
                    if (draft.flow !== undefined) setFlow(draft.flow);
                    if (draft.gynaecPain !== undefined) setGynaecPain(draft.gynaecPain);
                    if (draft.discharge !== undefined) setDischarge(draft.discharge);
                    if (draft.pregnancy !== undefined) setPregnancy(draft.pregnancy);
                    if (draft.miscarriage !== undefined) setMiscarriage(draft.miscarriage);
                    if (draft.gynaecRemarks !== undefined) setGynaecRemarks(draft.gynaecRemarks);
                    if (draft.anxiety !== undefined) setAnxiety(draft.anxiety);
                    if (draft.depression !== undefined) setDepression(draft.depression);
                    if (draft.sleepQuality !== undefined) setSleepQuality(draft.sleepQuality);
                    if (draft.stressLevel !== undefined) setStressLevel(draft.stressLevel);
                    if (draft.mentalRemarks !== undefined) setMentalRemarks(draft.mentalRemarks);
                    if (draft.mobilityRemarks !== undefined) setMobilityRemarks(draft.mobilityRemarks);
                    if (draft.painSite !== undefined) setPainSite(draft.painSite);
                    if (draft.painScale !== undefined) setPainScale(draft.painScale);
                    if (draft.painNotes !== undefined) setPainNotes(draft.painNotes);
                    if (draft.markers !== undefined) setMarkers(draft.markers);
                    if (draft.nadi !== undefined) setNadi(draft.nadi);
                    if (draft.mala !== undefined) setMala(draft.mala);
                    if (draft.mutra !== undefined) setMutra(draft.mutra);
                    if (draft.jihva !== undefined) setJihva(draft.jihva);
                    if (draft.shabda !== undefined) setShabda(draft.shabda);
                    if (draft.sparsha !== undefined) setSparsha(draft.sparsha);
                    if (draft.druk !== undefined) setDruk(draft.druk);
                    if (draft.akruti !== undefined) setAkruti(draft.akruti);
                    if (draft.nakha !== undefined) setNakha(draft.nakha);
                    if (draft.vata !== undefined) setVata(draft.vata);
                    if (draft.pitta !== undefined) setPitta(draft.pitta);
                    if (draft.kapha !== undefined) setKapha(draft.kapha);
                    if (draft.prakriti !== undefined) setPrakriti(draft.prakriti);
                    if (draft.radiologySelected !== undefined) setRadiologySelected(draft.radiologySelected);
                    if (draft.pathologySelected !== undefined) setPathologySelected(draft.pathologySelected);
                    if (draft.radiologyRemarks !== undefined) setRadiologyRemarks(draft.radiologyRemarks);
                    if (draft.prescribedLabTests !== undefined) setPrescribedLabTests(draft.prescribedLabTests);
                    if (draft.provisionalDiagnosis !== undefined) setProvisionalDiagnosis(draft.provisionalDiagnosis);
                    if (draft.patientInstruction !== undefined) setPatientInstruction(draft.patientInstruction);
                    if (draft.dietAdvice !== undefined) setDietAdvice(draft.dietAdvice);
                    if (draft.lifestyleChanges !== undefined) setLifestyleChanges(draft.lifestyleChanges);
                    if (draft.physicalExercises !== undefined) setPhysicalExercises(draft.physicalExercises);
                    if (draft.patientReferredTo !== undefined) setPatientReferredTo(draft.patientReferredTo);
                    if (draft.progressStatus !== undefined) setProgressStatus(draft.progressStatus);
                    if (draft.medicineAdherence !== undefined) setMedicineAdherence(draft.medicineAdherence);
                    if (draft.painRecovery !== undefined) setPainRecovery(draft.painRecovery);
                    if (draft.digestionRecovery !== undefined) setDigestionRecovery(draft.digestionRecovery);
                    if (draft.energyRecovery !== undefined) setEnergyRecovery(draft.energyRecovery);
                    if (draft.sleepRecovery !== undefined) setSleepRecovery(draft.sleepRecovery);
                    if (draft.clinicalRemarks !== undefined) setClinicalRemarks(draft.clinicalRemarks);
                    if (draft.hpi !== undefined) setHpi(draft.hpi);
                    if (draft.socialHistory !== undefined) setSocialHistory(draft.socialHistory);
                    if (draft.pastMedicalHistory !== undefined) setPastMedicalHistory(draft.pastMedicalHistory);
                    if (draft.familyHistory !== undefined) setFamilyHistory(draft.familyHistory);
                    if (draft.currentMedications !== undefined) setCurrentMedications(draft.currentMedications);
                    if (draft.medRemarks !== undefined) setMedRemarks(draft.medRemarks);
                    if (draft.surgeryHistory !== undefined) setSurgeryHistory(draft.surgeryHistory);
                } catch (e) {
                    console.error("Error loading draft in ClinicalAssessmentRecord:", e);
                }
            }
            setIsDraftLoaded(true);
        }, [appData?.doctorId, appData?.appointmentId]);

        // Save draft in ClinicalAssessmentRecord
        useEffect(() => {
            if (!isDraftLoaded || typeof window === "undefined") return;
            const docId = appData?.doctorId || 0;
            const appId = appData?.appointmentId || 0;
            if (!docId || !appId) return;

            const draftKey = `draft_consultation_${docId}_${appId}`;
            const existingRaw = localStorage.getItem(draftKey);
            const existing = existingRaw ? JSON.parse(existingRaw) : {};

            try {
                const updated = {
                    ...existing,
                    isClinicalRecordSaved: true,
                    hpi,
                    socialHistory,
                    pastMedicalHistory,
                    familyHistory,
                    currentMedications,
                    medRemarks,
                    surgeryHistory,
                    diabeticYears,
                    diabetesNotes,
                    bpRemarks,
                    thyroidRemarks,
                    allergyDetails,
                    infectiousAlert,
                    infectiousDetails,
                    gastricValue,
                    gastricRemarks,
                    so2,
                    respiratoryValue,
                    respiratoryRemarks,
                    cardiacValue,
                    cardiacRemarks,
                    nervousValue,
                    nervousRemarks,
                    urinaryValue,
                    urinaryRemarks,
                    cycle,
                    flow,
                    gynaecPain,
                    discharge,
                    pregnancy,
                    miscarriage,
                    gynaecRemarks,
                    anxiety,
                    depression,
                    sleepQuality,
                    stressLevel,
                    mentalRemarks,
                    mobilityRemarks,
                    painSite,
                    painScale,
                    painNotes,
                    markers,
                    nadi,
                    mala,
                    mutra,
                    jihva,
                    shabda,
                    sparsha,
                    druk,
                    akruti,
                    nakha,
                    vata,
                    pitta,
                    kapha,
                    prakriti,
                    radiologySelected,
                    pathologySelected,
                    radiologyRemarks,
                    prescribedLabTests,
                    provisionalDiagnosis,
                    patientInstruction,
                    dietAdvice,
                    lifestyleChanges,
                    physicalExercises,
                    patientReferredTo,
                    progressStatus,
                    medicineAdherence,
                    painRecovery,
                    digestionRecovery,
                    energyRecovery,
                    sleepRecovery,
                    clinicalRemarks
                };
                localStorage.setItem(draftKey, JSON.stringify(updated));
            } catch (e) {
                console.error("Error updating draft in ClinicalAssessmentRecord:", e);
            }
        }, [
            diabeticYears,
            diabetesNotes,
            bpRemarks,
            thyroidRemarks,
            allergyDetails,
            infectiousAlert,
            infectiousDetails,
            gastricValue,
            gastricRemarks,
            so2,
            respiratoryValue,
            respiratoryRemarks,
            cardiacValue,
            cardiacRemarks,
            nervousValue,
            nervousRemarks,
            urinaryValue,
            urinaryRemarks,
            cycle,
            flow,
            gynaecPain,
            discharge,
            pregnancy,
            miscarriage,
            gynaecRemarks,
            anxiety,
            depression,
            sleepQuality,
            stressLevel,
            mentalRemarks,
            mobilityRemarks,
            painSite,
            painScale,
            painNotes,
            markers,
            nadi,
            mala,
            mutra,
            jihva,
            shabda,
            sparsha,
            druk,
            akruti,
            nakha,
            vata,
            pitta,
            kapha,
            prakriti,
            radiologySelected,
            pathologySelected,
            radiologyRemarks,
            prescribedLabTests,
            provisionalDiagnosis,
            patientInstruction,
            dietAdvice,
            lifestyleChanges,
            physicalExercises,
            patientReferredTo,
            progressStatus,
            medicineAdherence,
            painRecovery,
            digestionRecovery,
            energyRecovery,
            sleepRecovery,
            clinicalRemarks,
            hpi,
            socialHistory,
            pastMedicalHistory,
            familyHistory,
            currentMedications,
            medRemarks,
            surgeryHistory,
            appData?.doctorId,
            appData?.appointmentId
        ]);

        // Sync and initialize medicine errors for unmatched medicines
        useEffect(() => {
            if (Array.isArray(medicines)) {
                setMedicineErrors(prev => {
                    const nextErrors = medicines.map((med, idx) => {
                        const currentErr = prev[idx] || {};
                        if (med.unmatchedName && !med.name) {
                            return {
                                ...currentErr,
                                name: `Prescribed Medicine  "${med.unmatchedName}" unable to find`
                            };
                        }
                        return currentErr;
                    });
                    return nextErrors;
                });
            }
        }, [medicines]);

        const [activeTimelineStep, setActiveTimelineStep] = useState(1);

        // Auto-populate local states when aiResponse becomes available
        useEffect(() => {
            if (!incomingAiResponse) return;

            if (appData?.resumeDraft) {
                if (typeof window !== "undefined") {
                    const docId = appData?.doctorId || 0;
                    const appId = appData?.appointmentId || 0;
                    if (docId && appId) {
                        const savedDraft = localStorage.getItem(`draft_consultation_${docId}_${appId}`);
                        if (savedDraft) {
                            try {
                                const draft = JSON.parse(savedDraft);
                                if (draft.isClinicalRecordSaved) {
                                    return;
                                }
                            } catch (e) {
                                console.error("Error reading draft key in AI mapping:", e);
                            }
                        }
                    }
                }
            }

            const summaryObj = typeof incomingAiResponse === "string" ? {} : incomingAiResponse;

            // 1. Patient Presentation
            if (summaryObj.patientPresentation) {
                const hpiVal = Array.isArray(summaryObj.patientPresentation.hpi)
                    ? summaryObj.patientPresentation.hpi.join("\n")
                    : summaryObj.patientPresentation.hpi || "";
                if (hpiVal) setHpi(hpiVal);

                const socialVal = Array.isArray(summaryObj.patientPresentation.socialHistory)
                    ? summaryObj.patientPresentation.socialHistory.join("\n")
                    : summaryObj.patientPresentation.socialHistory || "";
                if (socialVal) setSocialHistory(socialVal);

                const pastMedicalVal = Array.isArray(summaryObj.patientPresentation.pastMedicalHistory)
                    ? summaryObj.patientPresentation.pastMedicalHistory.join("\n")
                    : summaryObj.patientPresentation.pastMedicalHistory || "";
                if (pastMedicalVal) setPastMedicalHistory(pastMedicalVal);

                const familyVal = Array.isArray(summaryObj.patientPresentation.familyHistory)
                    ? summaryObj.patientPresentation.familyHistory.join("\n")
                    : summaryObj.patientPresentation.familyHistory || "";
                if (familyVal) setFamilyHistory(familyVal);
            }

            // 2. Medications & Supplements
            if (summaryObj.medications) {
                const rawCurrentMed = summaryObj.medications.currentMedication || summaryObj.medications.currentMedications;
                if (rawCurrentMed) {
                    const low = String(rawCurrentMed).toLowerCase();
                    if (low === "yes" || low === "true") setCurrentMedications("yes");
                    else if (low === "no" || low === "false") setCurrentMedications("no");
                }

                const isCurrentMedYes = rawCurrentMed && (String(rawCurrentMed).toLowerCase() === "yes" || String(rawCurrentMed).toLowerCase() === "true");
                const currentMedStatus = isCurrentMedYes ? "yes" : "no";

                let docNotes = "";
                const rawRemarks = summaryObj.medications.remarks || summaryObj.medications.doctorNotes;
                if (Array.isArray(rawRemarks)) {
                    docNotes = rawRemarks.map((r: any) => String(r).trim()).filter(Boolean).join(", ");
                } else if (typeof rawRemarks === "string") {
                    docNotes = rawRemarks.trim();
                }

                const currentMedsList = summaryObj.medications.currentMedicines || [];
                const medsParagraph = Array.isArray(currentMedsList)
                    ? currentMedsList.map((m: any) => {
                        const parts = [
                            m.medicineName || m.name,
                            m.medicineDosage || m.dosage,
                            m.medicineFrequency || m.frequency,
                            m.medicineTiming || m.timing
                        ].filter(Boolean);
                        const duration = m.medicineDuration || m.duration;
                        const durationStr = duration ? `for ${duration}` : "";
                        const rem = m.remarks || m.medicineRemarks || "";
                        const remStr = rem ? `(${rem})` : "";

                        return `${parts.join(", ")} ${durationStr} ${remStr}`.replace(/\s+/g, " ").trim();
                    }).filter(Boolean).join("; ")
                    : "";

                const currentMedParts: string[] = [currentMedStatus];
                if (docNotes) {
                    currentMedParts.push(docNotes);
                }
                if (medsParagraph) {
                    currentMedParts.push(medsParagraph);
                }
                const formattedMedicationString = currentMedParts.join(", ");
                setMedRemarks(formattedMedicationString);

                if (summaryObj.medications.surgeryHistory) setSurgeryHistory(summaryObj.medications.surgeryHistory);
            }

            // 3. Systemic Review & Co-morbidities
            if (summaryObj.systemicReview) {
                if (summaryObj.systemicReview.diabetes) {
                    const status = summaryObj.systemicReview.diabetes.status;
                    if (status) {
                        const low = String(status).toLowerCase();
                        if (low === "yes" || low === "true") setDiabetes("yes");
                        else if (low === "no" || low === "false") setDiabetes("no");
                    }
                    const years = summaryObj.systemicReview.diabetes.yearsIfDiabetic;
                    if (years !== undefined && years !== null) setDiabeticYears(String(years));
                    if (summaryObj.systemicReview.diabetes.notes) setDiabetesNotes(summaryObj.systemicReview.diabetes.notes);
                }
                if (summaryObj.systemicReview.bloodPressure) {
                    const status = summaryObj.systemicReview.bloodPressure.status;
                    if (status) {
                        const low = String(status).toLowerCase();
                        if (low.includes("high")) setBloodPressure("high");
                        else if (low.includes("low")) setBloodPressure("low");
                        else if (low.includes("no") || low === "normal") setBloodPressure("no");
                    }
                    if (summaryObj.systemicReview.bloodPressure.remarks) setBpRemarks(summaryObj.systemicReview.bloodPressure.remarks);
                }
                if (summaryObj.systemicReview.thyroid) {
                    const status = summaryObj.systemicReview.thyroid.status;
                    if (status) {
                        const low = String(status).toLowerCase();
                        if (low.includes("hypo")) setThyroid("hypo");
                        else if (low.includes("hyper")) setThyroid("hyper");
                        else if (low.includes("no")) setThyroid("no");
                    }
                    if (summaryObj.systemicReview.thyroid.remarks) setThyroidRemarks(summaryObj.systemicReview.thyroid.remarks);
                }
                if (summaryObj.systemicReview.allergy) {
                    const rawAllergyTypes = summaryObj.systemicReview.allergy.types;
                    let allergyStr = "";
                    if (Array.isArray(rawAllergyTypes)) {
                        allergyStr = rawAllergyTypes.map((t: any) => t.type || t).join(", ").toLowerCase();
                    } else if (typeof rawAllergyTypes === "string") {
                        allergyStr = rawAllergyTypes.toLowerCase();
                    }
                    if (allergyStr) {
                        if (allergyStr.includes("food")) setAllergy("food");
                        else if (allergyStr.includes("drug")) setAllergy("drug");
                        else if (allergyStr.includes("skin") || allergyStr.includes("other")) setAllergy("other");
                        else if (allergyStr.includes("nil") || allergyStr.includes("no")) setAllergy("no");
                    }
                    if (summaryObj.systemicReview.allergy.details) setAllergyDetails(summaryObj.systemicReview.allergy.details);
                }
            }

            // 4. Specialized History
            const gh = summaryObj.specializedHistory?.gynaecHistory || summaryObj.gynaecHistory;
            if (gh) {
                if (gh.cycle) setCycle(String(gh.cycle).toLowerCase());
                if (gh.flow) setFlow(String(gh.flow).toLowerCase());
                if (gh.pain) setGynaecPain(gh.pain);
                if (gh.discharge) setDischarge(gh.discharge);
                if (gh.pregnancy) setPregnancy(gh.pregnancy);
                if (gh.miscarriage) setMiscarriage(gh.miscarriage);
                if (gh.remarks) setGynaecRemarks(gh.remarks);
            }

            if (summaryObj.specializedHistory?.mentalHealth) {
                const mh = summaryObj.specializedHistory.mentalHealth;
                if (mh.anxietyDetails) {
                    const low = String(mh.anxietyDetails).toLowerCase();
                    if (low.includes("mild")) setAnxiety("mild");
                    else if (low.includes("moderate")) setAnxiety("moderate");
                    else if (low.includes("severe") || low.includes("serve")) setAnxiety("severe");
                    else if (low.includes("none")) setAnxiety("none");
                }
                if (mh.depressionDetails) {
                    const low = String(mh.depressionDetails).toLowerCase();
                    if (low.includes("mild")) setDepression("mild");
                    else if (low.includes("moderate")) setDepression("moderate");
                    else if (low.includes("severe") || low.includes("serve")) setDepression("severe");
                    else if (low.includes("none")) setDepression("none");
                }
                if (mh.sleepDetails) {
                    const low = String(mh.sleepDetails).toLowerCase();
                    if (low.includes("good")) setSleepQuality("good");
                    else if (low.includes("fair")) setSleepQuality("fair");
                    else if (low.includes("poor")) setSleepQuality("poor");
                    else if (low.includes("insomnia")) setSleepQuality("insomnia");
                }
                if (mh.stressLevel) {
                    const low = String(mh.stressLevel).toLowerCase();
                    if (low.includes("mild")) setStressLevel("mild");
                    else if (low.includes("moderate")) setStressLevel("moderate");
                    else if (low.includes("severe") || low.includes("serve")) setStressLevel("severe");
                    else if (low.includes("none")) setStressLevel("none");
                }
                if (mh.doctorNotes) setMentalRemarks(mh.doctorNotes);
            }

            const sn = summaryObj.specializedHistory?.systemicNotes || summaryObj.systemicNotes;
            if (sn) {
                const normalizeSymptom = (symptoms: string[] | undefined, validValues: string[], hasOthers = false) => {
                    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) return "";
                    const normalized = symptoms
                        .map(s => {
                            const trimmed = s?.toLowerCase().trim();
                            if (!trimmed) return "";
                            if (trimmed === "nil" || trimmed === "none") return "none";
                            const match = validValues.find(v => v.toLowerCase() === trimmed);
                            if (match) return match;
                            return hasOthers ? (validValues.includes("others") ? "others" : "other") : "";
                        })
                        .filter(Boolean);
                    const unique = Array.from(new Set(normalized));
                    return unique.join(",");
                };

                if (sn.gastro) {
                    setGastricValue(normalizeSymptom(sn.gastro.symptoms, ["acidity", "gerd", "gas", "abd pain", "constipation", "loose stool", "nausea", "other", "none"], true));
                    if (sn.gastro.remarks) setGastricRemarks(sn.gastro.remarks);
                }
                if (sn.respiratory) {
                    setRespiratoryValue(normalizeSymptom(sn.respiratory.symptoms, ["sob", "cough", "fever", "asthma", "wheeze", "other", "none"], true));
                    if (sn.respiratory.remarks) setRespiratoryRemarks(sn.respiratory.remarks);
                }
                if (sn.cardiac) {
                    setCardiacValue(normalizeSymptom(sn.cardiac.symptoms, ["chest pain", "palpitation", "sweating", "dizziness", "others", "none"], true));
                    if (sn.cardiac.remarks) setCardiacRemarks(sn.cardiac.remarks);
                }
                if (sn.nervous) {
                    setNervousValue(normalizeSymptom(sn.nervous.symptoms, ["headache", "sensory loss", "weakness", "others", "none"], true));
                    if (sn.nervous.remarks) setNervousRemarks(sn.nervous.remarks);
                }
                if (sn.urinary) {
                    setUrinaryValue(normalizeSymptom(sn.urinary.symptoms, ["burning", "frequency", "blood", "low output", "stones", "others", "none"], true));
                    if (sn.urinary.remarks) setUrinaryRemarks(sn.urinary.remarks);
                }
            }

            // 5. Physical Examination & Disorders
            const physExam = summaryObj.physicalExamination || {};
            const rawPainObj = physExam.pain || summaryObj.pain;
            const rawPainMapping = physExam.painMapping || summaryObj.painMapping;

            if (physExam.balanceMobility?.remarks) {
                setMobilityRemarks(physExam.balanceMobility.remarks);
            }

            if (rawPainObj) {
                const p = rawPainObj;
                if (p.site) setPainSite(p.site);
                if (p.scale !== undefined && p.scale !== null) {
                    const parsedScale = parseInt(String(p.scale), 10);
                    setPainScale(isNaN(parsedScale) ? null : parsedScale);
                }
                if (p.locationNotes) setPainNotes(p.locationNotes);

                // Maps one AI painMapping item → one or MORE screen markers.
                // Uses the per-gender/per-view calibrated body charts, so marks
                // always land ON the silhouette (never in empty margins).
                // Dots expanded from the same item share a groupId, so a bilateral
                // item still counts (and saves) as ONE mark.
                const mapPainItemToMarkers = (item: any, itemIdx: number): Array<{ x: number; y: number; view: BodyView; type: "pain" | "swelling" | "numbness"; groupId: string; bilateral: boolean; notes: string }> => {
                    const zone = String(item.bodyZone || item.site || "").toLowerCase();
                    const half = String(item.bodyHalf || "").toLowerCase();
                    const notes = String(item.notes || "").toLowerCase();
                    const itemId = String(item.id || "").toLowerCase();
                    const allText = `${zone} | ${notes} | ${itemId}`;

                    const type: "pain" | "swelling" | "numbness" = (item.markerType === "swelling" ? "swelling" : (item.markerType === "numbness" ? "numbness" : "pain"));
                    const groupId = String(item.id || `pain_item_${itemIdx}`);
                    const itemNotes = String(item.notes || "");

                    // ── Patient side: bodyHalf field first, then id/notes hints ──
                    let side: BodySide = "center";
                    if (half === "left") side = "left";
                    else if (half === "right") side = "right";
                    else if (half !== "center") {
                        if (/\bleft\b/.test(itemId) || /\bleft\b/.test(notes)) side = "left";
                        else if (/\bright\b/.test(itemId) || /\bright\b/.test(notes)) side = "right";
                    }

                    // ── Row: explicit bodyCode (11..142) wins, else text detection ──
                    let row: number | null = null;
                    if (item.bodyCode !== undefined && item.bodyCode !== null) {
                        const code = Number(item.bodyCode);
                        if (code >= 11 && code <= 142) {
                            row = Math.floor(code / 10);
                            const codeSide = code % 10;
                            if (side === "center") {
                                if (codeSide === 1) side = "left";
                                else if (codeSide === 2) side = "right";
                            }
                        }
                    }
                    if (row === null) row = detectBodyRow(allText);

                    // Generic "back pain" that resolved to lower back (row 9) but the
                    // item explicitly says the MIDDLE of the body → mid back (row 8),
                    // so the mark stays at back center instead of the hip line.
                    if (row === 9 && !/lower.?back|lumbar|sacr|tail.?bone|coccyx/i.test(allText)) {
                        const vertical = String(item.bodyVertical || "").toLowerCase();
                        if (vertical === "middle" || vertical === "mid") row = 8;
                    }

                    // ── View: anatomy-forced view wins over the AI's view field ──
                    // (e.g. "lower back" can never be on the front view)
                    const view: BodyView = detectForcedView(allText) ?? (item.view === "back" ? "back" : "front");

                    if (row !== null) {
                        // Bilateral / unspecified-side pain on paired limbs → mark BOTH
                        // limbs instead of floating a dot in the gap between them.
                        const isBilateral =
                            item.bilateralSymmetry === true ||
                            /bilateral|both\s+(knees|legs|shoulders|arms|hands|feet|ankles|hips|thighs|calves|elbows|wrists)/i.test(allText) ||
                            (side === "center" && PAIRED_LIMB_ROWS.has(row));

                        if (isBilateral && PAIRED_LIMB_ROWS.has(row)) {
                            const l = getBodyZonePoint(gender, view, row, "left");
                            const r = getBodyZonePoint(gender, view, row, "right");
                            return [
                                { x: l.x, y: l.y, view, type, groupId, bilateral: true, notes: itemNotes },
                                { x: r.x, y: r.y, view, type, groupId, bilateral: true, notes: itemNotes },
                            ];
                        }
                        const pt = getBodyZonePoint(gender, view, row, side);
                        // Genital / private-part pain sits at the crotch — slightly
                        // below the row-10 hip line on the front view.
                        const genitalShift = (row === 10 && view === "front" && GENITAL_TERMS.test(allText)) ? 2.5 : 0;
                        return [{ x: pt.x, y: pt.y + genitalShift, view, type, groupId, bilateral: false, notes: itemNotes }];
                    }

                    // ── No zone detected: fall back to AI coordinates + safety clamp ──
                    let x = item.xPercent !== undefined && item.xPercent !== null ? Number(item.xPercent) : 50;
                    let y = item.yPercent !== undefined && item.yPercent !== null ? Number(item.yPercent) : 50;
                    if (y <= 10) { x = Math.max(42, Math.min(58, x)); }
                    else if (y <= 22) { x = Math.max(28, Math.min(72, x)); }
                    else if (y <= 52) { x = Math.max(18, Math.min(82, x)); }
                    else if (y <= 60) { x = Math.max(33, Math.min(67, x)); }
                    else if (y <= 78) { x = Math.max(36, Math.min(64, x)); }
                    else if (y <= 92) { x = Math.max(38, Math.min(62, x)); }
                    else { x = Math.max(40, Math.min(60, x)); }
                    return [{ x, y, view, type, groupId, bilateral: false, notes: itemNotes }];
                };

                if (Array.isArray(rawPainMapping) && rawPainMapping.length > 0) {
                    const baseId = Date.now();
                    const newMarkers: BodyMarker[] = rawPainMapping
                        .flatMap((item: any, itemIdx: number) => mapPainItemToMarkers(item, itemIdx))
                        // De-duplicate points that resolve to the same spot on the same view
                        .filter((pt, idx, arr) => arr.findIndex(o => o.view === pt.view && Math.abs(o.x - pt.x) < 1 && Math.abs(o.y - pt.y) < 1) === idx)
                        .map((pt, idx) => ({
                            id: baseId + idx,
                            x: Math.round(pt.x * 10) / 10,
                            y: Math.round(pt.y * 10) / 10,
                            view: pt.view,
                            type: pt.type,
                            groupId: pt.groupId,
                            bilateral: pt.bilateral,
                            notes: pt.notes,
                        }));
                    setMarkers(newMarkers);
                } else {
                    const siteText = (p.site || "").toLowerCase();
                    const notesText = (p.locationNotes || "").toLowerCase();
                    const remarksText = (p.remarks || "").toLowerCase();
                    const complaints = Array.isArray(summaryObj.patientPresentation?.chiefComplaint)
                        ? summaryObj.patientPresentation.chiefComplaint.map((c: string) => c.toLowerCase())
                        : [];
                    const hpi = Array.isArray(summaryObj.patientPresentation?.hpi)
                        ? summaryObj.patientPresentation.hpi.map((h: string) => h.toLowerCase())
                        : [];

                    const allText = [siteText, notesText, remarksText, ...complaints, ...hpi].join(" ");
                    const newMarkers: BodyMarker[] = [];
                    let nextId = Date.now();

                    const hasPain = allText.includes("pain") || allText.includes("दर्द") || complaints.includes("pain");
                    const hasSwelling = allText.includes("swelling") || allText.includes("सूजन") || allText.includes("स्वेलिंग") || complaints.includes("swelling");
                    const hasNumbness = allText.includes("numb") || allText.includes("नंबनेस") || complaints.includes("numbness");

                    const typesToPlace: ("pain" | "swelling" | "numbness")[] = [];
                    if (hasPain) typesToPlace.push("pain");
                    if (hasSwelling) typesToPlace.push("swelling");
                    if (hasNumbness) typesToPlace.push("numbness");
                    if (typesToPlace.length === 0) typesToPlace.push("pain");

                    // Place markers via the calibrated per-gender charts so they
                    // always land on the silhouette of the active body image.
                    // Both dots of a left/right pair share a groupId → ONE mark.
                    const addZoneMarker = (row: number, sides: BodySide[], view: BodyView, type: "pain" | "swelling" | "numbness", offset: number) => {
                        const groupId = `auto_${row}_${view}_${type}`;
                        const bilateral = sides.length > 1;
                        sides.forEach((s) => {
                            const pt = getBodyZonePoint(gender, view, row, s);
                            newMarkers.push({ id: nextId++, x: pt.x, y: pt.y + offset, view, type, groupId, bilateral });
                        });
                    };

                    const hasKnee = allText.includes("knee") || allText.includes("घुटने") || allText.includes("घुटनों");
                    const hasBack = allText.includes("back") || allText.includes("कमर") || allText.includes("पीठ");
                    const hasNeck = allText.includes("neck") || allText.includes("गर्दन");
                    const hasShoulder = allText.includes("shoulder") || allText.includes("कंधे");
                    const hasHead = allText.includes("head") || allText.includes("सिर");
                    const hasFoot = allText.includes("foot") || allText.includes("feet") || allText.includes("ankle") || allText.includes("पैर");
                    const hasHand = allText.includes("hand") || allText.includes("arm") || allText.includes("elbow") || allText.includes("हाथ");

                    typesToPlace.forEach((type, idx) => {
                        const offset = idx * 2; // small vertical shift so multiple mark types don't overlap
                        if (hasKnee) addZoneMarker(12, ["left", "right"], "front", type, offset);
                        if (hasBack) addZoneMarker(9, ["center"], "back", type, offset);
                        if (hasNeck) addZoneMarker(2, ["center"], "back", type, offset);
                        if (hasShoulder) addZoneMarker(3, ["left", "right"], "front", type, offset);
                        if (hasHead) addZoneMarker(1, ["center"], "front", type, offset);
                        if (hasFoot) addZoneMarker(14, ["left", "right"], "front", type, offset);
                        if (hasHand) addZoneMarker(6, ["left", "right"], "front", type, offset);
                    });

                    if (newMarkers.length > 0) {
                        setMarkers(newMarkers);
                    }
                }
            }
            if (physExam.asthaVidhaPariksha) {
                const avp = physExam.asthaVidhaPariksha;
                if (avp.pulse) setNadi(avp.pulse);
                if (avp.tongue) setJihva(avp.tongue);
                if (avp.eyes) setDruk(avp.eyes);
                if (avp.nails) setNakha(avp.nails);
                if (avp.vataNotes) setVata(avp.vataNotes);
                if (avp.pittaNotes) setPitta(avp.pittaNotes);
                if (avp.kaphaNotes) setKapha(avp.kaphaNotes);
                if (avp.overallPrakriti) setPrakriti(avp.overallPrakriti);
            }

            // 6. Investigations
            if (summaryObj.investigations) {
                if (summaryObj.investigations.radiology) {
                    const r = summaryObj.investigations.radiology;
                    if (Array.isArray(r.findings)) setRadiologySelected(r.findings.join(","));
                    if (r.remarks) setRadiologyRemarks(r.remarks);
                }
                if (summaryObj.investigations.laboratory) {
                    const l = summaryObj.investigations.laboratory;
                    if (Array.isArray(l.tests)) setPathologySelected(l.tests.join(","));
                    if (l.testsPrescribed) setPrescribedLabTests(l.testsPrescribed);
                }
                if (summaryObj.investigations.diagnosis?.provisional) {
                    setProvisionalDiagnosis(summaryObj.investigations.diagnosis.provisional);
                }
            }

            // 7. Treatment Plan & Education
            if (summaryObj.treatmentPlan) {
                const tp = summaryObj.treatmentPlan;
                if (tp.patientEducation) setPatientInstruction(tp.patientEducation);
                if (tp.diet) setDietAdvice(tp.diet);
                if (tp.lifestyle) setLifestyleChanges(tp.lifestyle);
                if (tp.yogaPranayama) setPhysicalExercises(tp.yogaPranayama);
                if (tp.treatmentNotes) setClinicalRemarks(tp.treatmentNotes);
            }

            // 8. Progress Monitoring (Revisit)
            if (summaryObj.progressMonitoring !== undefined && summaryObj.progressMonitoring !== null) {
                const pm = summaryObj.progressMonitoring;
                const progNotes = pm.progressNotes !== undefined ? pm.progressNotes : (pm.notes !== undefined ? pm.notes : (pm.remarks !== undefined ? pm.remarks : pm.clinicalRemarks));
                if (progNotes !== undefined && progNotes !== null && typeof progNotes === "string" && progNotes.trim().toLowerCase() !== "nil" && progNotes.trim().toLowerCase() !== "n/a") {
                    setClinicalRemarks(progNotes.trim());
                }
                if (pm.comparisonWithPreviousVisit !== undefined || pm.progressStatus !== undefined) {
                    const statusStr = String(pm.progressStatus !== undefined ? pm.progressStatus : pm.comparisonWithPreviousVisit).toLowerCase();
                    if (statusStr.includes("better") || statusStr.includes("improv")) setProgressStatus("Better");
                    else if (statusStr.includes("same") || statusStr.includes("stabl")) setProgressStatus("Same");
                    else if (statusStr.includes("worse")) setProgressStatus("Worse");
                    else if (statusStr.includes("new")) setProgressStatus("New Symptoms");
                }
                if (pm.medicineAdherence !== undefined && pm.medicineAdherence !== null) {
                    const adhStr = String(pm.medicineAdherence).toLowerCase();
                    if (adhStr.includes("regular")) setMedicineAdherence("Regular");
                    else if (adhStr.includes("irregular")) setMedicineAdherence("Irregular");
                    else if (adhStr.includes("side")) setMedicineAdherence("Side Effects");
                }
                if (pm.symptomRecovery !== undefined && pm.symptomRecovery !== null) {
                    if (pm.symptomRecovery.pain !== undefined && pm.symptomRecovery.pain !== null) setPainRecovery(Number(pm.symptomRecovery.pain) || 0);
                    if (pm.symptomRecovery.digestion !== undefined && pm.symptomRecovery.digestion !== null) setDigestionRecovery(Number(pm.symptomRecovery.digestion) || 0);
                    if (pm.symptomRecovery.energy !== undefined && pm.symptomRecovery.energy !== null) setEnergyRecovery(Number(pm.symptomRecovery.energy) || 0);
                    if (pm.symptomRecovery.sleep !== undefined && pm.symptomRecovery.sleep !== null) setSleepRecovery(Number(pm.symptomRecovery.sleep) || 0);
                }
            }
        }, [incomingAiResponse]);

        const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
            if (ref.current) {
                ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        };

        // Section Progress Calculations
        const getSection1Percent = () => {
            const fields = [chiefComplaint, symptoms, hpi, socialHistory, pastMedicalHistory, familyHistory];
            const filled = fields.filter(f => typeof f === "string" ? f.trim() !== "" : !!f).length;
            return Math.round((filled / fields.length) * 100);
        };

        const getSection2Percent = () => {
            const fields = [currentMedications, medRemarks, surgeryHistory];
            const filled = fields.filter(f => typeof f === "string" ? f.trim() !== "" : !!f).length;
            return Math.round((filled / fields.length) * 100);
        };

        const getSection3Percent = () => {
            const fields = [
                diabetes,
                diabeticYears,
                diabetesNotes,
                bloodPressure,
                bpRemarks,
                thyroid,
                thyroidRemarks,
                allergyHistory,
                allergyDetails,
                // infectiousAlert,
                // infectiousDetails
            ];
            const filled = fields.filter(f => typeof f === "string" ? f.trim() !== "" : !!f).length;
            return Math.round((filled / fields.length) * 100);
        };

        const getSection4Percent = () => {
            const commonFields = [
                anxiety,
                depression,
                sleepQuality,
                stressLevel,
                mentalRemarks,
                gastricValue,
                gastricRemarks,
                respiratoryValue,
                respiratoryRemarks,
                cardiacValue,
                cardiacRemarks,
                nervousValue,
                nervousRemarks,
                urinaryValue,
                urinaryRemarks
            ];
            const isFemale = gender?.toLowerCase() === "female";
            const femaleFields = isFemale ? [cycle, flow, gynaecPain, discharge, pregnancy, miscarriage] : [];
            const allFields = [...commonFields, ...femaleFields];
            const filled = allFields.filter(f => typeof f === "string" ? f.trim() !== "" : !!f).length;
            return Math.round((filled / allFields.length) * 100);
        };

        const getSection5Percent = () => {
            const fields = [
                sitting,
                standing,
                walking,
                mobilityRemarks,
                painSite,
                painNotes,
                jihva,
                nadi,
                druk,
                nakha,
                vata,
                pitta,
                kapha,
                prakriti
            ];
            let filled = fields.filter(f => typeof f === "string" ? f.trim() !== "" : !!f).length;
            if (painScale !== null) filled++;
            if (markers.length > 0) filled++;
            const totalFields = fields.length + 2;
            return Math.round((filled / totalFields) * 100);
        };

        const getSection6Percent = () => {
            const fields = [
                radiologySelected,
                pathologySelected,
                radiologyRemarks,
                prescribedLabTests,
                provisionalDiagnosis,
                finalDiagnosis
            ];
            const filled = fields.filter(f => typeof f === "string" ? f.trim() !== "" : !!f).length;
            return Math.round((filled / fields.length) * 100);
        };

        const getSection7Percent = () => {
            const fields = [
                patientInstruction,
                dietAdvice,
                lifestyleChanges,
                physicalExercises
            ];
            let filled = fields.filter(f => typeof f === "string" ? f.trim() !== "" : !!f).length;
            if (medicines.some(m => m.name && m.name.trim() !== "")) {
                filled++;
            }
            const totalFields = fields.length + 1;
            return Math.round((filled / totalFields) * 100);
        };

        const getSection8Percent = () => {
            const fields = [progressStatus, medicineAdherence, clinicalRemarks];
            const filled = fields.filter(f => typeof f === "string" ? f.trim() !== "" : !!f).length;
            return Math.round((filled / fields.length) * 100);
        };

        const getSectionPercent = (step: number) => {
            switch (step) {
                case 1: return getSection1Percent();
                case 2: return getSection2Percent();
                case 3: return getSection3Percent();
                case 4: return getSection4Percent();
                case 5: return getSection5Percent();
                case 6: return getSection6Percent();
                case 7: return getSection7Percent();
                case 8: return getSection8Percent();
                default: return 0;
            }
        };

        const getProgressColorAndLabel = (percent: number) => {
            if (percent === 0) {
                return {
                    color: "#EF4444", // Red
                    text: "Not Started"
                };
            } else if (percent < 100) {
                return {
                    color: "#EAB308", // Yellow
                    text: "In Progress"
                };
            } else {
                return {
                    color: "#0B8C00", // Green
                    text: "Completed"
                };
            }
        };

        const SectionProgress = ({ percent }: { percent: number }) => {
            const { color, text } = getProgressColorAndLabel(percent);
            const badgeClasses = percent === 0
                ? "bg-[#FEE2E2] text-[#EF4444]"
                : percent < 100
                    ? "bg-[#FEF9C3] text-[#CA8A04]"
                    : "bg-[#DCFCE7] text-[#16A34A]";
            return (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-300"
                                style={{
                                    width: `${percent}%`,
                                    backgroundColor: color
                                }}
                            />
                        </div>
                        <span
                            className="text-xs font-semibold transition-colors duration-300"
                            style={{ color }}
                        >
                            {percent}%
                        </span>
                    </div>
                    <span className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all duration-300 ${badgeClasses}`}>
                        {text}
                    </span>
                </div>
            );
        };

        // Calculate overall completion percent dynamically
        const getCompletionPercent = () => {
            const p1 = getSection1Percent();
            const p2 = getSection2Percent();
            const p3 = getSection3Percent();
            const p4 = getSection4Percent();
            const p5 = getSection5Percent();
            const p6 = getSection6Percent();
            const p7 = getSection7Percent();
            if (!showProgressMonitoring) {
                return Math.round((p1 + p2 + p3 + p4 + p5 + p6 + p7) / 7);
            }
            const p8 = getSection8Percent();
            return Math.round((p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8) / 8);
        };

        // Row Handlers for medicines
        const handleAddRow = () => {
            setMedicines([...medicines, { name: "", dosage: "", frequency: "", timing: "", duration: "", remarks: "" }]);
            setMedicineErrors([...medicineErrors, {}]);
        };

        const handleDeleteRow = (index: number) => {
            setMedicines(medicines.filter((_, idx) => idx !== index));
            setMedicineErrors(medicineErrors.filter((_, idx) => idx !== index));
        };

        const handleRowChange = (index: number, field: string, value: string) => {
            const updated = [...medicines];
            const updatedRow = { ...updated[index], [field]: value };
            if (field === "name") {
                delete updatedRow.unmatchedName;
            }
            updated[index] = updatedRow;
            setMedicines(updated);

            // Clear medicine error for this field
            if (medicineErrors[index]?.[field]) {
                const updatedErrors = [...medicineErrors];
                if (updatedErrors[index]) {
                    const nextRowErrors = { ...updatedErrors[index] };
                    delete nextRowErrors[field];
                    updatedErrors[index] = nextRowErrors;
                    setMedicineErrors(updatedErrors);
                }
            }
        };

        const handleSaveAndContinue = () => {
            const newErrors: Record<string, string> = {};
            let isValid = true;

            if (!chiefComplaint.trim()) {
                newErrors.chiefComplaint = "Chief Complaint is required";
                isValid = false;
            }
            if (!symptoms.trim()) {
                newErrors.symptoms = "Symptoms are required";
                isValid = false;
            }
            if (!currentMedications) {
                newErrors.currentMedications = "Current Medications status is required";
                isValid = false;
            }
            if (!diabetes) {
                newErrors.diabetes = "Diabetes status is required";
                isValid = false;
            }
            if (!bloodPressure) {
                newErrors.bloodPressure = "Blood Pressure status is required";
                isValid = false;
            }
            if (!thyroid) {
                newErrors.thyroid = "Thyroid status is required";
                isValid = false;
            }
            if (!allergyHistory) {
                newErrors.allergyHistory = "Allergy History status is required";
                isValid = false;
            }
            // Infectious Disease is optional
            if (!gastricValue) {
                newErrors.gastricValue = "Gastric Complaints status is required";
                isValid = false;
            }
            if (!stressLevel) {
                newErrors.stressLevel = "Stress Level is required";
                isValid = false;
            }
            if (!sitting) {
                newErrors.sitting = "Sitting status is required";
                isValid = false;
            }
            if (!standing) {
                newErrors.standing = "Standing status is required";
                isValid = false;
            }
            if (!walking) {
                newErrors.walking = "Walking status is required";
                isValid = false;
            }
            if (painScale === null) {
                newErrors.painScale = "Pain Scale is required";
                isValid = false;
            }
            if (!prakriti) {
                newErrors.prakriti = "Overall Prakriti is required";
                isValid = false;
            }
            if (!finalDiagnosis.trim()) {
                newErrors.finalDiagnosis = "Final Diagnosis is required";
                isValid = false;
            }
            if (!dietAdvice.trim()) {
                newErrors.dietAdvice = "Diet Advice is required";
                isValid = false;
            }
            if (!patientReferredTo) {
                newErrors.patientReferredTo = "Patient Referred To is required";
                isValid = false;
            }
            if (showProgressMonitoring) {
                if (!progressStatus) {
                    newErrors.progressStatus = "Progress Status is required";
                    isValid = false;
                }
                if (!medicineAdherence) {
                    newErrors.medicineAdherence = "Medicine Adherence is required";
                    isValid = false;
                }
                if (!clinicalRemarks.trim()) {
                    newErrors.clinicalRemarks = "Clinical Remarks are required";
                    isValid = false;
                }
            }

            // Medicines validation
            const newMedErrors: Record<string, string>[] = [];
            let isMedValid = true;

            medicines.forEach((med, idx) => {
                newMedErrors[idx] = {};
                const isEmpty = !med.name && !med.dosage && !med.frequency && !med.duration && !med.timing && !med.unmatchedName;

                if (!isEmpty) {
                    if (!med.name) {
                        if (med.unmatchedName) {
                            newMedErrors[idx].name = `Prescribed Medicine "${med.unmatchedName}" unable to find`;
                        } else {
                            newMedErrors[idx].name = "Required";
                        }
                        isMedValid = false;
                    }
                    if (!med.dosage) {
                        newMedErrors[idx].dosage = "Required";
                        isMedValid = false;
                    }
                    if (!med.frequency) {
                        newMedErrors[idx].frequency = "Required";
                        isMedValid = false;
                    }
                    if (!med.duration) {
                        newMedErrors[idx].duration = "Required";
                        isMedValid = false;
                    }
                    if (!med.timing) {
                        newMedErrors[idx].timing = "Required";
                        isMedValid = false;
                    }
                }
            });

            setErrors(newErrors);
            setMedicineErrors(newMedErrors);

            if (!isValid || !isMedValid) {
                // Find first error and scroll & focus
                if (newErrors.chiefComplaint) {
                    chiefComplaintRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => chiefComplaintRef.current?.focus(), 100);
                } else if (newErrors.symptoms) {
                    symptomsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => symptomsRef.current?.focus(), 100);
                } else if (newErrors.currentMedications) {
                    currentMedicationsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => currentMedicationsRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.diabetes) {
                    diabetesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => diabetesRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.bloodPressure) {
                    bloodPressureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => bloodPressureRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.thyroid) {
                    thyroidRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => thyroidRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.allergyHistory) {
                    allergyHistoryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => allergyHistoryRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.infectiousAlert) {
                    infectiousAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => infectiousAlertRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.gastricValue) {
                    gastricValueRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => gastricValueRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.stressLevel) {
                    stressLevelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => stressLevelRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.sitting) {
                    sittingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => sittingRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.standing) {
                    standingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => standingRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.walking) {
                    walkingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => walkingRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.painScale) {
                    painScaleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => painScaleRef.current?.querySelector("button")?.focus(), 100);
                } else if (!isMedValid) {
                    const firstErrIdx = newMedErrors.findIndex(x => Object.keys(x).length > 0);
                    if (firstErrIdx >= 0) {
                        const rowEl = medicineRowRefs.current[firstErrIdx];
                        rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });

                        const err = newMedErrors[firstErrIdx];
                        const fieldsOrder = ["name", "dosage", "frequency", "duration", "timing", "remarks"];
                        const missingFieldIdx = fieldsOrder.findIndex(f => err[f]);
                        if (missingFieldIdx >= 0) {
                            setTimeout(() => {
                                const buttons = rowEl?.querySelectorAll("button");
                                if (buttons && buttons.length > missingFieldIdx) {
                                    buttons[missingFieldIdx]?.focus();
                                }
                            }, 200);
                        }
                    }
                } else if (newErrors.prakriti) {
                    prakritiRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => prakritiRef.current?.focus(), 100);
                } else if (newErrors.finalDiagnosis) {
                    finalDiagnosisRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => finalDiagnosisRef.current?.focus(), 100);
                } else if (newErrors.dietAdvice) {
                    dietAdviceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => dietAdviceRef.current?.focus(), 100);
                } else if (newErrors.patientReferredTo) {
                    patientReferredToRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => patientReferredToRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.progressStatus) {
                    progressStatusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => progressStatusRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.medicineAdherence) {
                    medicineAdherenceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => medicineAdherenceRef.current?.querySelector("button")?.focus(), 100);
                } else if (newErrors.clinicalRemarks) {
                    clinicalRemarksRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => clinicalRemarksRef.current?.focus(), 100);
                }
                return;
            }

            setIsConfirmDialogOpen(true);
        };

        // Handle multiselect buttons toggling
        const handleToggleOption = (
            option: string,
            selectedList: string[],
            setSelectedList: (list: string[]) => void
        ) => {
            const optionLower = option.toLowerCase();
            if (optionLower === "none" || optionLower === "nil") {
                if (selectedList.includes(option)) {
                    setSelectedList([]);
                } else {
                    setSelectedList([option]);
                }
            } else {
                let updated = selectedList.filter(item => item.toLowerCase() !== "none" && item.toLowerCase() !== "nil");
                if (updated.includes(option)) {
                    updated = updated.filter(item => item !== option);
                } else {
                    updated.push(option);
                }
                setSelectedList(updated);
            }
        };

        // Helper to verify if coordinate falls on the body silhouette (ignores margins)
        const isCoordinateOnBody = (x: number, y: number) => {
            if (y < 4 || y > 98) return false;

            // Head range
            if (y >= 4 && y < 14) {
                return x >= 42 && x <= 58;
            }
            // Neck
            if (y >= 14 && y < 18) {
                return x >= 45 && x <= 55;
            }
            // Shoulders / collar bone
            if (y >= 18 && y < 22) {
                return x >= 33 && x <= 67;
            }
            // Upper torso & arms
            if (y >= 22 && y < 45) {
                return x >= 23 && x <= 77;
            }
            // Hips & hands (female arms hang wider than male — allow up to 22/78)
            if (y >= 45 && y < 55) {
                return x >= 22 && x <= 78;
            }
            // Thighs
            if (y >= 55 && y < 78) {
                return x >= 32 && x <= 68;
            }
            // Calves
            if (y >= 78 && y < 94) {
                return x >= 35 && x <= 65;
            }
            // Feet
            if (y >= 94 && y <= 98) {
                return x >= 34 && x <= 66;
            }
            return false;
        };

        // Click on diagram coordinates
        const handleBodyClick = (
            e: React.MouseEvent<HTMLDivElement>,
            view: "front" | "back"
        ) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            // Prevent placing markers on empty margins / outside body silhouette
            if (!isCoordinateOnBody(x, y)) {
                return;
            }

            const newMarker: BodyMarker = {
                id: Date.now(),
                x: Math.round(x * 10) / 10,
                y: Math.round(y * 10) / 10,
                view,
                type: activeMarkType,
            };

            const updatedMarkers = [...markers, newMarker];
            setMarkers(updatedMarkers);
        };

        const handleRemoveMarker = (id: number) => {
            const removed = markers.find(m => m.id === id);
            setMarkers(markers
                .filter(m => m.id !== id)
                .map(m => {
                    // Partner dot of a removed bilateral pair → standalone single mark
                    if (removed?.groupId && m.groupId === removed.groupId) {
                        return { ...m, bilateral: false, groupId: undefined };
                    }
                    return m;
                }));
        };

        const handleClearAllMarkers = () => {
            setMarkers([]);
        };

        return (
            <div ref={containerRef} className={`flex flex-col gap-3 w-full ${className}`}>

                {/* FORM COMPLETION STATUS PROGRESS BOARD */}
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-4">
                    <div className="flex items-center justify-between ">
                        <h3 className="font-inter font-bold text-sm text-[#262D3B]">Form Completion Status</h3>
                        <div className="flex items-center gap-2">
                            <span className="font-inter font-bold text-lg" style={{ color: getProgressColorAndLabel(getCompletionPercent()).color }}>{getCompletionPercent()}%</span>
                            <span className="text-xs font-semibold text-[#7B8089]">
                                {showProgressMonitoring ? (
                                    `${[
                                        getSection1Percent(),
                                        getSection2Percent(),
                                        getSection3Percent(),
                                        getSection4Percent(),
                                        getSection5Percent(),
                                        getSection6Percent(),
                                        getSection7Percent(),
                                        getSection8Percent()
                                    ].filter(p => p === 100).length} of 8 sections complete`
                                ) : (
                                    `${[
                                        getSection1Percent(),
                                        getSection2Percent(),
                                        getSection3Percent(),
                                        getSection4Percent(),
                                        getSection5Percent(),
                                        getSection6Percent(),
                                        getSection7Percent()
                                    ].filter(p => p === 100).length} of 7 sections complete`
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Progress Timeline Buttons */}
                    <div className="relative w-full py-4 select-none">
                        {/* Background horizontal bar */}
                        <div className="absolute left-[6.25%] right-[6.25%] top-[33px] h-[6px] bg-[#D9D9D9] rounded-[10px] -translate-y-1/2" />

                        {/* Active progress horizontal bar */}
                        <div
                            className="absolute left-[6.25%] top-[33px] h-[6px] bg-[#0B8C00] rounded-[10px] -translate-y-1/2 transition-all duration-300"
                            style={{
                                width: `calc(${(activeTimelineStep - 1) / (showProgressMonitoring ? 7 : 6)} * 87.5%)`
                            }}
                        />

                        <div className="relative flex items-start justify-between gap-1 w-full">
                            {[
                                { step: 1, label: "Patient Presentation", ref: section1Ref },
                                { step: 2, label: "Medications", ref: section2Ref },
                                { step: 3, label: "Systemic Review", ref: section3Ref },
                                { step: 4, label: "Specialized History", ref: section4Ref },
                                { step: 5, label: "Physical Exam", ref: section5Ref },
                                { step: 6, label: "Investigations", ref: section6Ref },
                                { step: 7, label: "Treatment Plan", ref: section7Ref },
                                ...(showProgressMonitoring ? [{ step: 8, label: "Progress", ref: section8Ref }] : []),
                            ].map((item, idx) => {
                                const isActive = activeTimelineStep >= item.step;
                                const isCurrent = activeTimelineStep === item.step;
                                const sectionPercent = getSectionPercent(item.step);
                                const { color: sectionColor } = getProgressColorAndLabel(sectionPercent);
                                return (
                                    <button
                                        key={item.step}
                                        type="button"
                                        onClick={() => {
                                            setActiveTimelineStep(item.step);
                                            scrollToSection(item.ref);
                                        }}
                                        className="flex flex-col items-center gap-2 group focus:outline-none flex-1 text-center relative z-10"
                                    >
                                        {/* Circle */}
                                        <div
                                            className={`w-[34px] h-[34px] rounded-full border-[3px] border-white flex items-center justify-center font-inter font-bold text-xs shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-all duration-200 ${isActive
                                                ? "bg-[#0B8C00] text-white"
                                                : "bg-[#D9D9D9] text-[#7B8089]"
                                                } ${isCurrent ? "scale-105" : ""}`}
                                        >
                                            {item.step}
                                        </div>

                                        {/* Labels */}
                                        <div className="flex flex-col items-center gap-0.5 mt-2 w-full min-h-[50px] justify-start">
                                            <span
                                                className={`font-inter font-medium text-[14px] leading-[22px] tracking-tight transition-colors duration-150 text-center block ${isCurrent ? "text-[#262D3B]" : "text-[#7B8089]"
                                                    }`}
                                                style={{
                                                    maxWidth: "115px",
                                                }}
                                            >
                                                {item.label}
                                            </span>
                                            <span
                                                className="font-inter font-medium text-[18px] leading-tight text-center block transition-colors duration-300"
                                                style={{ color: sectionColor }}
                                            >
                                                {sectionPercent}%
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Clinical Assessment Record Title Banner */}
                <div className="flex items-center justify-between ">
                    <div>
                        <h2 className="font-semibold text-lg text-[#262D3B]">Clinical Assessment Record</h2>
                        {/* <p className="text-xs text-[#7B8089] mt-0.5">Complete each section. Details appear only when needed.</p> */}
                    </div>
                    {doctorNotes && (
                        <button
                            type="button"
                            onClick={() => setIsNotesOpen(true)}
                            className="px-4 py-2 cursor-pointer rounded-full bg-[#0B8C00] hover:bg-[#0A7F00] text-white text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 shadow-sm"
                        >
                            <svg
                                className="w-4 h-4 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                            Doctor Notes
                        </button>
                    )}
                </div>

                {/* 1. PATIENT PRESENTATION */}
                <div
                    ref={section1Ref}
                    className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden scroll-mt-6"
                >
                    <div className="px-6 py-4 border-b border-[#E3EEE1] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">1</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Patient Presentation</h3>
                        </div>
                        <SectionProgress percent={getSection1Percent()} />
                    </div>

                    <div className="p-6 flex flex-col gap-6">
                        {/* Subheader: Patient narrative */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/patientinfo.svg"
                                    alt="Patient Info"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Patient narrative
                            </span>
                        </div>

                        {/* Textarea fields grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormTextareaField
                                ref={chiefComplaintRef}
                                label="Chief Complaint *"
                                placeholder="Describe the main complaint..."
                                value={chiefComplaint}
                                onChange={(e) => {
                                    setChiefComplaint(e.target.value);
                                    if (errors.chiefComplaint) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.chiefComplaint;
                                            return next;
                                        });
                                    }
                                }}
                                width="100%"
                                error={errors.chiefComplaint}
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                ref={symptomsRef}
                                label="Symptoms *"
                                placeholder="Symptoms"
                                value={symptoms}
                                onChange={(e) => {
                                    setSymptoms(e.target.value);
                                    if (errors.symptoms) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.symptoms;
                                            return next;
                                        });
                                    }
                                }}
                                width="100%"
                                error={errors.symptoms}
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                label="History of Present Illness (HPI)"
                                placeholder="Onset, duration, progression..."
                                value={hpi}
                                onChange={(e) => setHpi(e.target.value)}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                label="Social History"
                                placeholder="Occupation, lifestyle..."
                                value={socialHistory}
                                onChange={(e) => setSocialHistory(e.target.value)}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                label="Past Medical History"
                                placeholder="Previous conditions..."
                                value={pastMedicalHistory}
                                onChange={(e) => setPastMedicalHistory(e.target.value)}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                label="Family History"
                                placeholder="Hereditary conditions..."
                                value={familyHistory}
                                onChange={(e) => setFamilyHistory(e.target.value)}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. MEDICATIONS & SUPPLEMENTS */}
                <div
                    ref={section2Ref}
                    className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden scroll-mt-6"
                >
                    <div className="px-6 py-4 border-b border-[#E3EEE1] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">2</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Medications & Supplements</h3>
                        </div>
                        <SectionProgress percent={getSection2Percent()} />
                    </div>

                    <div className="p-6 flex flex-col gap-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Left Column: Current Medications (Yes/No) */}
                            <div className="lg:col-span-1 flex flex-col gap-2">
                                <div className="flex items-center gap-[10px] min-h-[32px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <Image
                                            src="/icons/DoctorBagIcon.svg"
                                            alt="Medications"
                                            width={16}
                                            height={16}
                                        />
                                    </div>
                                    <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                        Current Medications <span className="text-[#F6776E]">*</span>
                                    </span>
                                </div>
                                <div className="w-full" ref={currentMedicationsRef}>
                                    <Tabs
                                        options={[
                                            { value: "yes", label: "Yes" },
                                            { value: "no", label: "No" }
                                        ]}
                                        value={currentMedications}
                                        onChange={(val) => {
                                            setCurrentMedications(val as "yes" | "no" | "");
                                            if (errors.currentMedications) {
                                                setErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.currentMedications;
                                                    return next;
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                {errors.currentMedications && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.currentMedications}</p>
                                )}
                            </div>

                            {/* Right Column: Remarks / Doctor Notes */}
                            <div className="lg:col-span-2">
                                <FormTextareaField
                                    label="Current Medications Remarks"
                                    placeholder="Doctor notes on current medications..."
                                    value={medRemarks}
                                    onChange={(e) => setMedRemarks(e.target.value)}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                    highlightBlack={true}
                                />
                            </div>
                        </div>

                        {/* Full Width Row: Surgery History */}
                        <div className="w-full">
                            <FormTextareaField
                                label="Surgery History"
                                placeholder="Surgery History"
                                value={surgeryHistory}
                                onChange={(e) => setSurgeryHistory(e.target.value)}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. SYSTEMIC REVIEW & CO-MORBIDITIES */}
                <div ref={section3Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                    <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">3</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Systemic Review & Co-morbidities</h3>
                        </div>
                        <SectionProgress percent={getSection3Percent()} />
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Diabetes Mellitus Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <Image
                                        src="/icons/DiabetesMellitusIcon.svg"
                                        alt="Diabetes Mellitus"
                                        width={16}
                                        height={16}
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Diabetes Mellitus <span className="text-[#F6776E]">*</span>
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
                                    {/* Left Column: Tabs */}
                                    <div className="lg:col-span-5 flex flex-col gap-2">
                                        <div className="w-[280px]" ref={diabetesRef}>
                                            <Tabs
                                                className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                                options={[
                                                    { value: "yes", label: "Yes" },
                                                    { value: "no", label: "No" }
                                                ]}
                                                value={diabetes}
                                                onChange={(val) => {
                                                    setDiabetes(val as "yes" | "no" | "");
                                                    if (errors.diabetes) {
                                                        setErrors(prev => {
                                                            const next = { ...prev };
                                                            delete next.diabetes;
                                                            return next;
                                                        });
                                                    }
                                                }}
                                            />
                                        </div>
                                        {errors.diabetes && (
                                            <p className="text-xs text-[#F6776E]">{errors.diabetes}</p>
                                        )}
                                    </div>

                                    {/* Right Column: Diabetes Notes */}
                                    <div className="lg:col-span-6">
                                        <FormTextareaField
                                            label="Diabetes Notes"
                                            placeholder="e.g. Type 2, on Metformin, HbA1c 7.2..."
                                            value={diabetesNotes}
                                            onChange={(e) => setDiabetesNotes(e.target.value)}
                                            width="100%"
                                            height={80}
                                            className="!rounded-xl"
                                            highlightBlack={true}
                                        />
                                    </div>
                                </div>

                                {/* Years (if Diabetic) - Render below, full width */}
                                <div className="w-full">
                                    <FormInputField
                                        label="Years (if Diabetic)"
                                        placeholder="e.g. 5"
                                        value={diabeticYears}
                                        onChange={(e) => setDiabeticYears(e.target.value)}
                                        width="100%"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Blood Pressure Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <Image
                                        src="/icons/BloodPressureIcon.svg"
                                        alt="Blood Pressure"
                                        width={16}
                                        height={16}
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Blood Pressure <span className="text-[#F6776E]">*</span>
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
                                {/* Left Column: Tabs */}
                                <div className="lg:col-span-5 flex flex-col gap-2">
                                    <div className="w-full" ref={bloodPressureRef}>
                                        <Tabs
                                            className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                            options={[
                                                { value: "high", label: "High BP" },
                                                { value: "low", label: "Low BP" },
                                                { value: "no", label: "No" }
                                            ]}
                                            value={bloodPressure}
                                            onChange={(val) => {
                                                setBloodPressure(val as "high" | "low" | "no" | "");
                                                if (errors.bloodPressure) {
                                                    setErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.bloodPressure;
                                                        return next;
                                                    });
                                                }
                                            }}


                                        />
                                    </div>
                                    {errors.bloodPressure && (
                                        <p className="text-xs text-[#F6776E]">{errors.bloodPressure}</p>
                                    )}
                                </div>

                                {/* Right Column: Remarks */}
                                <div className="lg:col-span-6">
                                    <FormTextareaField
                                        label="Remarks"
                                        placeholder="Remarks"
                                        value={bpRemarks}
                                        onChange={(e) => setBpRemarks(e.target.value)}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Thyroid Disorder Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <Image
                                        src="/icons/ThyroidDisorderIcon.svg"
                                        alt="Thyroid Disorder"
                                        width={16}
                                        height={16}
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Thyroid Disorder <span className="text-[#F6776E]">*</span>
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
                                {/* Left Column: Tabs */}
                                <div className="lg:col-span-5 flex flex-col gap-2">
                                    <div className="w-full" ref={thyroidRef}>
                                        <Tabs
                                            className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                            options={[
                                                { value: "hypo", label: "Hypothyroid" },
                                                { value: "hyper", label: "Hyperthyroid" },
                                                { value: "no", label: "No" }
                                            ]}
                                            value={thyroid}
                                            onChange={(val) => {
                                                setThyroid(val as "hypo" | "hyper" | "no" | "");
                                                if (errors.thyroid) {
                                                    setErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.thyroid;
                                                        return next;
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                    {errors.thyroid && (
                                        <p className="text-xs text-[#F6776E]">{errors.thyroid}</p>
                                    )}
                                </div>

                                {/* Right Column: Remarks */}
                                <div className="lg:col-span-6">
                                    <FormTextareaField
                                        label="Remarks"
                                        placeholder="Remarks"
                                        value={thyroidRemarks}
                                        onChange={(e) => setThyroidRemarks(e.target.value)}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Allergy History Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <Image
                                        src="/icons/AllergyHistoryIcon.svg"
                                        alt="Allergy History"
                                        width={16}
                                        height={16}
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Allergy History <span className="text-[#F6776E]">*</span>
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
                                {/* Left Column: Tabs */}
                                <div className="lg:col-span-5 flex flex-col gap-2">
                                    <div className="w-full" ref={allergyHistoryRef}>
                                        <Tabs
                                            className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                            options={[
                                                { value: "food", label: "Food" },
                                                { value: "drug", label: "Drug" },
                                                { value: "other", label: "Other" },
                                                { value: "no", label: "No" }
                                            ]}
                                            value={allergyHistory}
                                            onChange={(val) => {
                                                setAllergyHistory(val as "food" | "drug" | "skin" | "other" | "no" | "");
                                                if (errors.allergyHistory) {
                                                    setErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.allergyHistory;
                                                        return next;
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                    {errors.allergyHistory && (
                                        <p className="text-xs text-[#F6776E]">{errors.allergyHistory}</p>
                                    )}
                                </div>

                                {/* Right Column: Allergy Details */}
                                <div className="lg:col-span-6">
                                    <FormTextareaField
                                        label="Allergy Details"
                                        placeholder="Describe allergy reactions..."
                                        value={allergyDetails}
                                        onChange={(e) => setAllergyDetails(e.target.value)}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Infectious Disease Card */}
                        {/* <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">

                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <Image
                                        src="/icons/DoctorBagIcon.svg"
                                        alt="Infectious Disease"
                                        width={16}
                                        height={16}
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Infectious Disease
                                </span>
                            </div>

                           
                            <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
                          
                                <div className="lg:col-span-5 flex flex-col gap-2">
                                    <div className="w-full" ref={infectiousAlertRef}>
                                        <Tabs
                                            className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                            options={[
                                                { value: "hiv", label: "HIV" },
                                                { value: "hepatitis", label: "Hepatitis" },
                                                { value: "tb", label: "TB" },
                                                { value: "normal", label: "Normal" }
                                            ]}
                                            value={communicableDiseases && (Array.isArray(communicableDiseases) ? communicableDiseases.length > 0 : communicableDiseases) ? communicableDiseases : infectiousAlert}
                                            multiSelect={true}
                                            onChange={(val) => {
                                                const arr = val ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
                                                if (setCommunicableDiseases) {
                                                    setCommunicableDiseases(arr);
                                                }
                                                setInfectiousAlert(val as any);
                                                if (errors.infectiousAlert) {
                                                    setErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.infectiousAlert;
                                                        return next;
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                    {errors.infectiousAlert && (
                                        <p className="text-xs text-[#F6776E]">{errors.infectiousAlert}</p>
                                    )}
                                </div>

                          
                                <div className="lg:col-span-6">
                                    <FormTextareaField
                                        label="Infectious Disease Details"
                                        placeholder="Describe Infectious Disease..."
                                        value={infectiousDetails}
                                        onChange={(e) => setInfectiousDetails(e.target.value)}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                        </div> */}
                    </div>
                </div>

                {/* 4. SPECIALIZED HISTORY */}
                <div ref={section4Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                    <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">4</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Specialized History</h3>
                        </div>
                        <SectionProgress percent={getSection4Percent()} />
                    </div>

                    {/* Gynaec / Obs History (Only shown for female patients) */}
                    {gender?.toLowerCase() === "female" && (
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <Image
                                        src="/icons/ObsHistoryIcon.svg"
                                        alt="Gynaec / Obs History"
                                        width={16}
                                        height={16}
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Gynaec / Obs History
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2 w-full">
                                        <span className="text-xs font-semibold text-[#7B8089]">
                                            Cycle
                                        </span>
                                        <div className="w-full">
                                            <Tabs
                                                className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                                options={[
                                                    { value: "regular", label: "Regular" },
                                                    { value: "irregular", label: "Irregular" }
                                                ]}
                                                value={cycle}
                                                onChange={(val) => setCycle(val)}
                                            />
                                        </div>
                                    </div>
                                    <FormInputField
                                        label="Pain"
                                        placeholder="Pain"
                                        value={gynaecPain}
                                        onChange={(e) => setGynaecPain(e.target.value)}
                                        width="100%"
                                        highlightBlack={true}
                                    />
                                    <FormInputField
                                        label="Pregnancy"
                                        placeholder="Pregnancy"
                                        value={pregnancy}
                                        onChange={(e) => setPregnancy(e.target.value)}
                                        width="100%"
                                        highlightBlack={true}
                                    />
                                </div>

                                {/* Right Column */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2 w-full">
                                        <span className="text-xs font-semibold text-[#7B8089]">
                                            Flow
                                        </span>
                                        <div className="w-full">
                                            <Tabs
                                                className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                                options={[
                                                    { value: "normal", label: "Normal" },
                                                    { value: "heavy", label: "Heavy" },
                                                    { value: "scanty", label: "Scanty" }
                                                ]}
                                                value={flow}
                                                onChange={(val) => setFlow(val)}
                                            />
                                        </div>
                                    </div>
                                    <FormInputField
                                        label="Discharge"
                                        placeholder="Discharge"
                                        value={discharge}
                                        onChange={(e) => setDischarge(e.target.value)}
                                        width="100%"
                                        highlightBlack={true}
                                    />
                                    <FormInputField
                                        label="Miscarriage"
                                        placeholder="Miscarriage"
                                        value={miscarriage}
                                        onChange={(e) => setMiscarriage(e.target.value)}
                                        width="100%"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                            <FormTextareaField
                                label="Remarks"
                                placeholder="Remarks..."
                                value={gynaecRemarks}
                                onChange={(e) => setGynaecRemarks(e.target.value)}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                        </div>
                    )}

                    {/* Mental & Psychological Health Card */}
                    <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/MentalHealthIcon.svg"
                                    alt="Mental health"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Mental health
                            </span>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2 w-full">
                                <span className="text-sm font-semibold text-[#444242]">
                                    Anxiety
                                </span>
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "mild", label: "Mild" },
                                            { value: "moderate", label: "Moderate" },
                                            { value: "severe", label: "Severe" },
                                            { value: "none", label: "None" }
                                        ]}
                                        value={anxiety}
                                        onChange={(val) => setAnxiety(val)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-full">
                                <span className="text-sm font-semibold text-[#444242]">
                                    Depression
                                </span>
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "mild", label: "Mild" },
                                            { value: "moderate", label: "Moderate" },
                                            { value: "severe", label: "Severe" },
                                            { value: "none", label: "None" }
                                        ]}
                                        value={depression}
                                        onChange={(val) => setDepression(val)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-full">
                                <span className="text-sm font-semibold text-[#444242]">
                                    Sleep Quality
                                </span>
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "good", label: "Good" },
                                            { value: "fair", label: "Fair" },
                                            { value: "poor", label: "Poor" },
                                            { value: "insomnia", label: "Insomnia" }
                                        ]}
                                        value={sleepQuality}
                                        onChange={(val) => setSleepQuality(val)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-full" ref={stressLevelRef}>
                                <span className="text-sm font-semibold text-[#444242]">
                                    Stress Level <span className="text-[#F6776E]">*</span>
                                </span>
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "mild", label: "Mild" },
                                            { value: "moderate", label: "Moderate" },
                                            { value: "severe", label: "Severe" },
                                            { value: "none", label: "None" }
                                        ]}
                                        value={stressLevel}
                                        onChange={(val) => {
                                            setStressLevel(val as any);
                                            if (errors.stressLevel) {
                                                setErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.stressLevel;
                                                    return next;
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                {errors.stressLevel && (
                                    <p className="text-xs text-[#F6776E]">{errors.stressLevel}</p>
                                )}
                            </div>
                        </div>

                        <FormTextareaField
                            label="Remarks / Doctor Notes"
                            placeholder="Doctor notes on stress and psychological health..."
                            value={mentalRemarks}
                            onChange={(e) => setMentalRemarks(e.target.value)}
                            width="100%"
                            height={80}
                            className="!rounded-xl"
                            highlightBlack={true}
                        />
                    </div>

                    {/* Systemic Notes Header */}
                    <div className="pt-2">
                        <h4 className="font-inter font-semibold text-sm text-[#434956]">Systemic Notes</h4>
                    </div>

                    {/* Gastro Symptoms Health Card */}
                    <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/DiabetesMellitusIcon.svg"
                                    alt="Gastro Symptoms health"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Gastro Symptoms health <span className="text-[#F6776E]">*</span>
                            </span>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                            {/* Left: Tabs */}
                            <div className="lg:col-span-2 flex flex-col gap-2" ref={gastricValueRef}>
                                {/* <span className="text-xs font-semibold text-[#7B8089]">
                                    Gastric Complaints <span className="text-[#F6776E]">*</span>
                                </span> */}
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "acidity", label: "Acidity" },
                                            { value: "gerd", label: "Gerd" },
                                            { value: "gas", label: "Gas" },
                                            { value: "abd pain", label: "Abd Pain" },
                                            { value: "constipation", label: "Constipation" },
                                            { value: "loose stool", label: "Loose Stool" },
                                            { value: "nausea", label: "Nausea" },
                                            { value: "other", label: "Other" },
                                            { value: "none", label: "None" }
                                        ]}
                                        value={gastricValue}
                                        onChange={(val) => {
                                            let finalVal = val;
                                            const items = val.split(",").map(x => x.trim()).filter(Boolean);
                                            if (items.includes("constipation") && items.includes("loose stool")) {
                                                const prevItems = gastricValue.split(",").map(x => x.trim()).filter(Boolean);
                                                if (prevItems.includes("constipation")) {
                                                    finalVal = items.filter(x => x !== "constipation").join(",");
                                                } else if (prevItems.includes("loose stool")) {
                                                    finalVal = items.filter(x => x !== "loose stool").join(",");
                                                } else {
                                                    finalVal = items.filter(x => x !== "constipation").join(",");
                                                }
                                            }
                                            setGastricValue(finalVal);
                                            if (errors.gastricValue) {
                                                setErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.gastricValue;
                                                    return next;
                                                });
                                            }
                                        }}
                                        wrap={true}
                                        multiSelect={true}
                                    />
                                </div>
                                {errors.gastricValue && (
                                    <p className="text-xs text-[#F6776E]">{errors.gastricValue}</p>
                                )}
                            </div>
                            {/* Right: Remarks */}
                            <div className="lg:col-span-3">
                                <FormTextareaField
                                    label="Remarks / Doctor Notes"
                                    placeholder="Doctor notes on gastro symptoms..."
                                    value={gastricRemarks}
                                    onChange={(e) => setGastricRemarks(e.target.value)}
                                    width="100%"
                                    height={94}
                                    className="!rounded-xl"
                                    highlightBlack={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Respiratory Card */}
                    <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/ThyroidDisorderIcon.svg"
                                    alt="Respiratory"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Respiratory
                            </span>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                            {/* Left: Tabs */}
                            <div className="lg:col-span-2 flex flex-col gap-2">
                                {/* <span className="text-xs font-semibold text-[#7B8089]">
                                    Respiratory Issues
                                </span> */}
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "sob", label: "SOB" },
                                            { value: "cough", label: "Cough" },
                                            { value: "fever", label: "Fever" },
                                            { value: "asthma", label: "Asthma" },
                                            { value: "wheeze", label: "Wheeze" },
                                            { value: "other", label: "Other" },
                                            { value: "none", label: "None" }
                                        ]}
                                        value={respiratoryValue}
                                        onChange={(val) => setRespiratoryValue(val)}
                                        wrap={true}
                                        multiSelect={true}
                                    />
                                </div>
                            </div>
                            {/* Right: Remarks */}
                            <div className="lg:col-span-3">
                                <FormTextareaField
                                    label="Remarks / Doctor Notes"
                                    placeholder="Doctor notes on respiratory..."
                                    value={respiratoryRemarks}
                                    onChange={(e) => setRespiratoryRemarks(e.target.value)}
                                    width="100%"
                                    height={94}
                                    className="!rounded-xl"
                                    highlightBlack={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cardiac Card */}
                    <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/BloodPressureIcon.svg"
                                    alt="Cardiac"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Cardiac
                            </span>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                            {/* Left: Tabs */}
                            <div className="lg:col-span-2 flex flex-col gap-2">
                                {/* <span className="text-xs font-semibold text-[#7B8089]">
                                    Cardiac
                                </span> */}
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "chest pain", label: "Chest Pain" },
                                            { value: "palpitation", label: "Palpitation" },
                                            { value: "sweating", label: "Sweating" },
                                            { value: "dizziness", label: "Dizziness" },
                                            { value: "others", label: "Other" },
                                            { value: "none", label: "None" }
                                        ]}
                                        value={cardiacValue}
                                        onChange={(val) => setCardiacValue(val)}
                                        wrap={true}
                                        multiSelect={true}
                                    />
                                </div>
                            </div>
                            {/* Right: Remarks */}
                            <div className="lg:col-span-3">
                                <FormTextareaField
                                    label="Remarks / Doctor Notes"
                                    placeholder="Doctor notes on cardiac..."
                                    value={cardiacRemarks}
                                    onChange={(e) => setCardiacRemarks(e.target.value)}
                                    width="100%"
                                    height={94}
                                    className="!rounded-xl"
                                    highlightBlack={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Nervous System Card */}
                    <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/MentalHealthIcon.svg"
                                    alt="Nervous System"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Nervous System
                            </span>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                            {/* Left: Tabs */}
                            <div className="lg:col-span-2 flex flex-col gap-2">
                                {/* <span className="text-xs font-semibold text-[#7B8089]">
                                    Nervous System
                                </span> */}
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "headache", label: "Headache" },
                                            { value: "sensory loss", label: "Sensory Loss" },
                                            { value: "weakness", label: "Weakness" },
                                            { value: "others", label: "Other" },
                                            { value: "none", label: "None" }
                                        ]}
                                        value={nervousValue}
                                        onChange={(val) => setNervousValue(val)}
                                        wrap={true}
                                        multiSelect={true}
                                    />
                                </div>
                            </div>
                            {/* Right: Remarks */}
                            <div className="lg:col-span-3">
                                <FormTextareaField
                                    label="Remarks / Doctor Notes"
                                    placeholder="Doctor notes on nervous system..."
                                    value={nervousRemarks}
                                    onChange={(e) => setNervousRemarks(e.target.value)}
                                    width="100%"
                                    height={94}
                                    className="!rounded-xl"
                                    highlightBlack={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Urinary System Card */}
                    <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/DiabetesMellitusIcon.svg"
                                    alt="Urinary System"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Urinary System
                            </span>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                            {/* Left: Tabs */}
                            <div className="lg:col-span-2 flex flex-col gap-2">
                                {/* <span className="text-xs font-semibold text-[#7B8089]">
                                    Urinary System
                                </span> */}
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "burning", label: "Burning" },
                                            { value: "frequency", label: "Frequency" },
                                            { value: "blood", label: "Blood" },
                                            { value: "low output", label: "Low Output" },
                                            { value: "stones", label: "Stones" },
                                            { value: "others", label: "Other" },
                                            { value: "none", label: "None" }
                                        ]}
                                        value={urinaryValue}
                                        onChange={(val) => setUrinaryValue(val)}
                                        wrap={true}
                                        multiSelect={true}
                                    />
                                </div>
                            </div>
                            {/* Right: Remarks */}
                            <div className="lg:col-span-3">
                                <FormTextareaField
                                    label="Remarks / Doctor Notes"
                                    placeholder="Doctor notes on urinary..."
                                    value={urinaryRemarks}
                                    onChange={(e) => setUrinaryRemarks(e.target.value)}
                                    width="100%"
                                    height={94}
                                    className="!rounded-xl"
                                    highlightBlack={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. PHYSICAL EXAMINATION & DISORDERS */}
                <div ref={section5Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                    <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">5</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Physical Examination & Disorders</h3>
                        </div>
                        <SectionProgress percent={getSection5Percent()} />
                    </div>

                    {/* Balance & Mobility */}
                    <div className="space-y-4">
                        <h4 className="font-inter font-semibold text-sm text-[#434956] ">Balance and Mobility</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-y-4 gap-x-6">
                            {/* Sitting */}
                            <div ref={sittingRef} className="flex flex-col gap-6 p-4 border border-[#DFE0E2] rounded-[8px] w-full">
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <Image
                                            src="/icons/sittingIcon.svg"
                                            alt="Sitting"
                                            width={16}
                                            height={16}
                                        />
                                    </div>
                                    <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                        Sitting <span className="text-[#F6776E]">*</span>
                                    </span>
                                </div>
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "normal", label: "Normal" },
                                            { value: "abnormal", label: "Abnormal" }
                                        ]}
                                        value={sitting}
                                        onChange={(val) => {
                                            setSitting(val as "normal" | "abnormal" | "");
                                            if (errors.sitting) {
                                                setErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.sitting;
                                                    return next;
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                {errors.sitting && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.sitting}</p>
                                )}
                            </div>

                            {/* Standing */}
                            <div ref={standingRef} className="flex flex-col gap-6 p-4 border border-[#DFE0E2] rounded-[8px] w-full">
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <Image
                                            src="/icons/standingIcon.svg"
                                            alt="Standing"
                                            width={16}
                                            height={16}
                                        />
                                    </div>
                                    <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                        Standing <span className="text-[#F6776E]">*</span>
                                    </span>
                                </div>
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "normal", label: "Normal" },
                                            { value: "abnormal", label: "Abnormal" }
                                        ]}
                                        value={standing}
                                        onChange={(val) => {
                                            setStanding(val as "normal" | "abnormal" | "");
                                            if (errors.standing) {
                                                setErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.standing;
                                                    return next;
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                {errors.standing && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.standing}</p>
                                )}
                            </div>

                            {/* Walking */}
                            <div ref={walkingRef} className="flex flex-col gap-6 p-4 border border-[#DFE0E2] rounded-[8px] w-full">
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <Image
                                            src="/icons/walkingIcon.svg"
                                            alt="Walking"
                                            width={16}
                                            height={16}
                                        />
                                    </div>
                                    <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                        Walking <span className="text-[#F6776E]">*</span>
                                    </span>
                                </div>
                                <div className="w-full">
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                        options={[
                                            { value: "normal", label: "Normal" },
                                            { value: "abnormal", label: "Abnormal" }
                                        ]}
                                        value={walking}
                                        onChange={(val) => {
                                            setWalking(val as "normal" | "abnormal" | "");
                                            if (errors.walking) {
                                                setErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.walking;
                                                    return next;
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                {errors.walking && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.walking}</p>
                                )}
                            </div>
                        </div>
                        <FormTextareaField
                            label="Remarks"
                            placeholder="Remarks"
                            value={mobilityRemarks}
                            onChange={(e) => setMobilityRemarks(e.target.value)}
                            width="100%"
                            height={80}
                            className="!rounded-xl"
                            highlightBlack={true}

                        />
                    </div>

                    {/* Pain Assessment */}
                    <div className="space-y-4">
                        <h4 className="font-inter font-semibold text-sm text-[#434956] ">Pain Assessment</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                            <div className="lg:col-span-5">
                                <FormInputField
                                    label="Pain Site"
                                    placeholder="e.g. Lower back, right knee..."
                                    value={painSite}
                                    onChange={(e) => setPainSite(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />
                            </div>
                            <div ref={painScaleRef} className="lg:col-span-7 space-y-2 pb-1">
                                <span className="block text-[13px] font-semibold text-[#444242]">Pain Scale (0-10) <span className="text-[#F6776E]">*</span></span>
                                <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => {
                                                setPainScale(num);
                                                if (errors.painScale) {
                                                    setErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.painScale;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            className={`w-8 h-8 text-xs rounded-full font-bold flex items-center justify-center shrink-0 transition-all duration-150 ${painScale === num
                                                ? "bg-[#0B8C00] text-white border-transparent"
                                                : "bg-[#F1F1F1] text-[#434956] border-transparent hover:bg-[#E5E7EB]"
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                                {errors.painScale && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.painScale}</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-[#FAFAFA] rounded-2xl p-5 space-y-4">
                            <span className="block text-xs text-[#7B8089] font-medium">Click on the body diagram to mark pain areas. Click on a marker to remove it.</span>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                                {/* Left Side: Body diagrams & Legends */}
                                <div className="lg:col-span-8 flex flex-row flex-wrap sm:flex-nowrap gap-2 items-start">
                                    {/* Front View Card */}
                                    <div className="rounded-2xl p-1 flex flex-col items-center select-none ">
                                        <span className="text-[10px] font-bold text-[#7B8089] mb-1.5">Front</span>
                                        <div
                                            onClick={(e) => handleBodyClick(e, "front")}
                                            className="relative w-[168px] h-[280px] rounded-lg bg-white flex items-center justify-center cursor-crosshair overflow-hidden"
                                        >
                                            <Image src={gender?.toLowerCase() === "female" ? "/icons/femaleBodyFrontView.svg" : "/icons/maleBodyFrontView.svg"} alt="Front View" fill className="object-contain p-0" />
                                            {markers.filter(m => m.view === "front").map((marker) => (
                                                <button
                                                    key={marker.id}
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveMarker(marker.id); }}
                                                    className={`absolute w-3.5 h-3.5 rounded-full border border-white ring-2 ring-black/10 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform ${marker.type === "pain" ? "bg-[#EF4444]" : marker.type === "swelling" ? "bg-[#F59E0B]" : "bg-[#3B82F6]"
                                                        }`}
                                                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Back View Card */}
                                    <div className="rounded-2xl p-1 flex flex-col items-center select-none ">
                                        <span className="text-[10px] font-bold text-[#7B8089] mb-1.5">Back</span>
                                        <div
                                            onClick={(e) => handleBodyClick(e, "back")}
                                            className="relative w-[168px] h-[280px] rounded-lg bg-white flex items-center justify-center cursor-crosshair overflow-hidden"
                                        >
                                            <Image src={gender?.toLowerCase() === "female" ? "/icons/femaleBodyBackView.svg" : "/icons/maleBodyBackView.svg"} alt="Back View" fill className="object-contain p-0" />
                                            {markers.filter(m => m.view === "back").map((marker) => (
                                                <button
                                                    key={marker.id}
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveMarker(marker.id); }}
                                                    className={`absolute w-3.5 h-3.5 rounded-full border border-white ring-2 ring-black/10 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform ${marker.type === "pain" ? "bg-[#EF4444]" : marker.type === "swelling" ? "bg-[#F59E0B]" : "bg-[#3B82F6]"
                                                        }`}
                                                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Legend & Mark Type controls column */}
                                    <div className="flex flex-col gap-4 flex-1 min-w-[150px] justify-between self-stretch py-1 pl-2">
                                        {/* Legend */}
                                        <div className="space-y-1.5">
                                            <span className="block text-xs font-bold text-[#262D3B]">Legend</span>
                                            <div className="flex flex-row flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-[#434956]">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                                                    <span>Pain / Tenderness</span>
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                                                    <span>Swelling</span>
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                                                    <span>Numbness</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mark Type */}
                                        <div className="space-y-1.5">
                                            <span className="block text-xs font-bold text-[#262D3B]">Mark Type</span>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveMarkType("pain")}
                                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${activeMarkType === "pain"
                                                        ? "bg-[#EF4444]/10 border-[#EF4444] text-[#EF4444]"
                                                        : "bg-[#F1F1F1] border-transparent text-[#434956] hover:bg-[#E5E7EB]"
                                                        }`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${activeMarkType === "pain" ? "bg-[#EF4444]" : "bg-[#7B8089]"}`} />
                                                    <span>Pain</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveMarkType("swelling")}
                                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${activeMarkType === "swelling"
                                                        ? "bg-[#F59E0B]/10 border-[#F59E0B] text-[#F59E0B]"
                                                        : "bg-[#F1F1F1] border-transparent text-[#434956] hover:bg-[#E5E7EB]"
                                                        }`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${activeMarkType === "swelling" ? "bg-[#F59E0B]" : "bg-[#7B8089]"}`} />
                                                    <span>Swelling</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveMarkType("numbness")}
                                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${activeMarkType === "numbness"
                                                        ? "bg-[#3B82F6]/10 border-[#3B82F6] text-[#3B82F6]"
                                                        : "bg-[#F1F1F1] border-transparent text-[#434956] hover:bg-[#E5E7EB]"
                                                        }`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${activeMarkType === "numbness" ? "bg-[#3B82F6]" : "bg-[#7B8089]"}`} />
                                                    <span>Numbness</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col gap-2 mt-1">
                                            <button
                                                type="button"
                                                onClick={handleClearAllMarkers}
                                                className="inline-flex w-fit items-center px-4 py-1.5 bg-[#EBECED] hover:bg-gray-200 text-xs font-bold text-[#434956] rounded-full transition-all"
                                            >
                                                X Clear All
                                            </button>
                                            <span className="text-[11px] font-semibold text-[#7B8089] ml-1">
                                                {/* Bilateral dot-pairs share a groupId and count as ONE mark */}
                                                {new Set(markers.map(m => m.groupId ?? String(m.id))).size} marks
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Pain Location Notes */}
                                <div className="lg:col-span-4 flex flex-col justify-stretch h-full self-stretch">
                                    <FormTextareaField
                                        label="Pain Location Notes"
                                        placeholder="e.g. Lower back (L4-L5), right knee lateral..."
                                        value={painNotes}
                                        onChange={(e) => setPainNotes(e.target.value)}
                                        width="100%"
                                        height={280}
                                        className="!rounded-xl"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ashta Vidha Pariksha */}
                    <div className="space-y-4">
                        <h4 className="font-inter font-semibold text-sm text-[#434956] ">
                            Ashta Vidha Pariksha <span className="text-[#F6776E]">*</span>
                        </h4>
                        <div className="space-y-4">
                            {/* Row 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormInputField
                                    label="Tongue (Jihva)"
                                    placeholder="Appearance"
                                    value={jihva}
                                    onChange={(e) => setJihva(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />
                                <FormInputField
                                    label="Pulse (Nadi)"
                                    placeholder="Quality, Rate..."
                                    value={nadi}
                                    onChange={(e) => setNadi(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />
                                <FormInputField
                                    label="Eyes (Drink)"
                                    placeholder="Observations"
                                    value={druk}
                                    onChange={(e) => setDruk(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />
                            </div>

                            {/* Row 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormInputField
                                    label="Nails (Nakha)"
                                    placeholder="Color, Texture..."
                                    value={nakha}
                                    onChange={(e) => setNakha(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />

                                <FormInputField
                                    label="Pitta"
                                    placeholder="Assessment..."
                                    value={pitta}
                                    onChange={(e) => setPitta(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />
                                <FormInputField
                                    label="Kapha"
                                    placeholder="Assessment..."
                                    value={kapha}
                                    onChange={(e) => setKapha(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />
                            </div>

                            {/* Row 3 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormTextareaField
                                    label="Dosha-Vata"
                                    placeholder="Assessment..."
                                    value={vata}
                                    onChange={(e) => setVata(e.target.value)}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                    highlightBlack={true}
                                />
                                <FormTextareaField
                                    ref={prakritiRef}
                                    label="Overall Prakriti *"
                                    placeholder="Constitution"
                                    value={prakriti}
                                    onChange={(e) => {
                                        setPrakriti(e.target.value);
                                        if (errors.prakriti) {
                                            setErrors(prev => {
                                                const next = { ...prev };
                                                delete next.prakriti;
                                                return next;
                                            });
                                        }
                                    }}
                                    width="100%"
                                    height={80}
                                    highlightBlack={true}
                                    error={errors.prakriti}
                                    className="!rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 6. INVESTIGATIONS & RADIOLOGY */}
                <div ref={section6Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                    <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">6</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Investigations & Radiology</h3>
                        </div>
                        <SectionProgress percent={getSection6Percent()} />
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Radiology Findings Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <Image
                                        src="/icons/LabIcon.svg"
                                        alt="Radiology Findings"
                                        width={16}
                                        height={16}
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Radiology Findings
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* Left: Tabs */}
                                <div className="lg:col-span-5 flex flex-col gap-2">
                                    <div className="w-full">
                                        <Tabs
                                            className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                            multiSelect={true}
                                            options={[
                                                { value: "X-Ray", label: "X-Ray" },
                                                { value: "MRI", label: "MRI" },
                                                { value: "Ultrasound", label: "Ultrasound" },
                                                { value: "None", label: "None" }
                                            ]}
                                            value={radiologySelected}
                                            onChange={(val) => setRadiologySelected(val)}
                                        />
                                    </div>
                                </div>
                                {/* Right: Remarks */}
                                <div className="lg:col-span-7">
                                    <FormTextareaField
                                        label="Radiology Remarks"
                                        placeholder="Remarks on radiology findings..."
                                        value={radiologyRemarks}
                                        onChange={(e) => setRadiologyRemarks(e.target.value)}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Lab Tests Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <Image
                                        src="/icons/LabIcon.svg"
                                        alt="Lab Tests"
                                        width={16}
                                        height={16}
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Lab Tests
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* Left: Tabs */}
                                <div className="lg:col-span-5 flex flex-col gap-2">
                                    <div className="w-full">
                                        <Tabs
                                            className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"

                                            options={[
                                                { value: "Blood", label: "Blood" },
                                                { value: "Urine", label: "Urine" },
                                                { value: "Culture", label: "Culture" },
                                                { value: "None", label: "None" }
                                            ]}
                                            multiSelect={true}
                                            value={pathologySelected}
                                            onChange={(val) => setPathologySelected(val)}
                                        />
                                    </div>
                                </div>
                                {/* Right: Remarks */}
                                <div className="lg:col-span-7">
                                    <FormTextareaField
                                        label="Lab Tests Prescribed By Doctor"
                                        placeholder="e.g. CBC, LFT, RFT, HbA1c..."
                                        value={prescribedLabTests}
                                        onChange={(e) => setPrescribedLabTests(e.target.value)}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                        highlightBlack={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row: Provisional & Final Diagnosis */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                            <FormTextareaField
                                label="Provisional Diagnosis"
                                placeholder="Working diagnosis..."
                                value={provisionalDiagnosis}
                                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                ref={finalDiagnosisRef}
                                label="Final Diagnosis *"
                                placeholder="Confirmed diagnosis after investigations..."
                                value={finalDiagnosis}
                                onChange={(e) => {
                                    setFinalDiagnosis(e.target.value);
                                    if (errors.finalDiagnosis) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.finalDiagnosis;
                                            return next;
                                        });
                                    }
                                }}
                                width="100%"
                                error={errors.finalDiagnosis}
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                        </div>
                    </div>
                </div>

                {/* 7. TREATMENT PLAN & EDUCATION */}
                <div ref={section7Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">7</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Treatment Plan & Education</h3>
                        </div>
                        <SectionProgress percent={getSection7Percent()} />
                    </div>

                    <div className="flex flex-col gap-6">
                        <FormTextareaField
                            label="Patient Education"
                            placeholder="What was explained to the patient..."
                            value={patientInstruction}
                            onChange={(e) => setPatientInstruction(e.target.value)}
                            width="100%"
                            height={80}
                            className="!rounded-xl"
                            highlightBlack={true}
                        />

                        {/* Medicine Prescribed Card */}
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-[#E3EEE1] flex items-center justify-between w-full">
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <Image
                                            src="/icons/DoctorBagIcon.svg"
                                            alt="Medicine Prescribed"
                                            width={16}
                                            height={16}
                                        />
                                    </div>
                                    <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                        Medicine Prescribed
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddRow}
                                    className="flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
                                    title="Add Row"
                                >
                                    <Image
                                        src="/icons/AddIcon.svg"
                                        alt="Add"
                                        width={40}
                                        height={40}
                                    />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Responsive Row Grid Layout */}
                                <div className="border border-[#DFE0E2] rounded-[8px] bg-white w-full overflow-hidden divide-y divide-[#DFE0E2]">
                                    {/* Header Row */}
                                    <div className="hidden md:flex gap-4 px-4 py-4 text-[13px] font-semibold text-[#444242] items-center">
                                        <div className="grid grid-cols-12 gap-1 flex-1">
                                            <div className="col-span-4">Medicine</div>
                                            <div className="col-span-2">Dosage</div>
                                            <div className="col-span-2">Frequency</div>
                                            <div className="col-span-2">Duration</div>
                                            <div className="col-span-2">Time</div>
                                        </div>
                                    </div>

                                    {/* Rows */}
                                    {medicines.map((med, idx) => (
                                        <div
                                            key={idx}
                                            ref={(el) => {
                                                medicineRowRefs.current[idx] = el;
                                            }}
                                            className="flex flex-col gap-4 p-4 w-full"
                                        >
                                            {/* Dropdowns row */}
                                            <div className="flex gap-4 items-center w-full">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-1 flex-1">
                                                    {/* Name */}
                                                    <div className="md:col-span-4">
                                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Name</span>
                                                        <Tooltip content={med.name} disabled={!med.name}>
                                                            <div className="w-full">
                                                                <FormSelectField
                                                                    label="Name"
                                                                    placeholder="First Select Medicine"
                                                                    options={medicineOptions.filter(opt => opt.value === med.name || !medicines.some((m, i) => i !== idx && m.name === opt.value))}
                                                                    value={med.name}
                                                                    onChange={(val) => handleRowChange(idx, "name", val as string)}
                                                                    background="white"
                                                                    hideLabel={true}
                                                                    dropdownWidth="500px"
                                                                    width="100%"
                                                                    error={medicineErrors[idx]?.name}
                                                                />
                                                            </div>
                                                        </Tooltip>
                                                    </div>

                                                    {/* Dosage */}
                                                    <div className="md:col-span-2">
                                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Dosage</span>
                                                        <Tooltip content={med.dosage} disabled={!med.dosage}>
                                                            <div className="w-full">
                                                                {(() => {
                                                                    const { amount, unit } = parseDosageComponents(med.dosage);
                                                                    return (
                                                                        <FormInputSelectGroup
                                                                            hideLabel={true}
                                                                            inputValue={amount}
                                                                            inputPlaceholder="e.g. 500"
                                                                            onInputChange={(newAmount) => {
                                                                                const combined = newAmount ? `${newAmount} ${unit}` : "";
                                                                                handleRowChange(idx, "dosage", combined);
                                                                            }}
                                                                            selectValue={unit}
                                                                            selectOptions={DOSAGE_UNIT_OPTIONS}
                                                                            selectPlaceholder="Unit"
                                                                            onSelectChange={(newUnit) => {
                                                                                const combined = amount ? `${amount} ${newUnit}` : newUnit;
                                                                                handleRowChange(idx, "dosage", combined);
                                                                            }}
                                                                            disabled={!med.name}
                                                                            error={medicineErrors[idx]?.dosage}
                                                                        />
                                                                    );
                                                                })()}
                                                            </div>
                                                        </Tooltip>
                                                    </div>

                                                    {/* Frequency */}
                                                    <div className="md:col-span-2">
                                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Frequency</span>
                                                        <Tooltip content={med.frequency} disabled={!med.frequency}>
                                                            <div className="w-full">
                                                                <FormSelectField
                                                                    label="Frequency"
                                                                    placeholder="Select Frequency"
                                                                    options={FREQUENCY_OPTIONS}
                                                                    value={med.frequency}
                                                                    onChange={(val) => handleRowChange(idx, "frequency", val as string)}
                                                                    background="white"
                                                                    hideLabel={true}
                                                                    width="100%"
                                                                    error={medicineErrors[idx]?.frequency}
                                                                    disabled={!med.name}
                                                                />
                                                            </div>
                                                        </Tooltip>
                                                    </div>

                                                    {/* Duration */}
                                                    <div className="md:col-span-2">
                                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Duration</span>
                                                        <Tooltip content={med.duration} disabled={!med.duration}>
                                                            <div className="w-full">
                                                                {(() => {
                                                                    const { amount, unit } = parseDurationComponents(med.duration);
                                                                    return (
                                                                        <FormInputSelectGroup
                                                                            hideLabel={true}
                                                                            inputValue={amount}
                                                                            inputPlaceholder="e.g. 5"
                                                                            onInputChange={(newAmount) => {
                                                                                const combined = newAmount ? `${newAmount} ${unit}` : "";
                                                                                handleRowChange(idx, "duration", combined);
                                                                            }}
                                                                            selectValue={unit}
                                                                            selectOptions={DURATION_UNIT_OPTIONS}
                                                                            selectPlaceholder="Unit"
                                                                            onSelectChange={(newUnit) => {
                                                                                const combined = amount ? `${amount} ${newUnit}` : newUnit;
                                                                                handleRowChange(idx, "duration", combined);
                                                                            }}
                                                                            disabled={!med.name}
                                                                            error={medicineErrors[idx]?.duration}
                                                                        />
                                                                    );
                                                                })()}
                                                            </div>
                                                        </Tooltip>
                                                    </div>

                                                    {/* Timing (Time) */}
                                                    <div className="md:col-span-2">
                                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Time</span>
                                                        <Tooltip content={med.timing} disabled={!med.timing}>
                                                            <div className="w-full">
                                                                <FormSelectField
                                                                    label="Timing"
                                                                    placeholder="Select Timing"
                                                                    options={TIME_OPTIONS}
                                                                    value={med.timing}
                                                                    onChange={(val) => handleRowChange(idx, "timing", val as string)}
                                                                    background="white"
                                                                    hideLabel={true}
                                                                    width="100%"
                                                                    dropdownWidth="350px"
                                                                    error={medicineErrors[idx]?.timing}
                                                                    disabled={!med.name}
                                                                />
                                                            </div>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Remarks & Action row */}
                                            <div className="flex gap-4 items-center w-full">
                                                <div className="flex-1">
                                                    <FormTextareaField
                                                        label="Remarks"
                                                        placeholder="Remarks"
                                                        value={med.remarks || ""}
                                                        onChange={(e) => handleRowChange(idx, "remarks", e.target.value)}
                                                        height={60}
                                                        className="!rounded-xl"
                                                        highlightBlack={true}
                                                        error={medicineErrors[idx]?.remarks}
                                                    />
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteRow(idx)}
                                                        className="flex items-center justify-center w-7 h-7 bg-[#F64C4C] hover:bg-red-600 rounded-full text-white cursor-pointer transition-colors focus:outline-none"
                                                    >
                                                        <svg
                                                            className="w-3.5 h-3.5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={3}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M6 18L18 6M6 6l12 12"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/*Dietary Advice */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/DoctorBagIcon.svg"
                                    alt="Medicine Prescribed"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Dietary Advice                            </span>
                        </div>
                        <div className="space-y-4">
                            <div className="w-full">
                                <FormTextareaField
                                    ref={dietAdviceRef as any}
                                    label="Diet Advice *"
                                    placeholder="Pathya-Apathya..."
                                    value={dietAdvice}
                                    onChange={(e) => {
                                        setDietAdvice(e.target.value);
                                        if (errors.dietAdvice) {
                                            setErrors(prev => {
                                                const next = { ...prev };
                                                delete next.dietAdvice;
                                                return next;
                                            });
                                        }
                                    }}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                    highlightBlack={true}
                                    error={errors.dietAdvice}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormInputField
                                    label="Lifestyle Changes"
                                    placeholder="Sleep, exercise..."
                                    value={lifestyleChanges}
                                    onChange={(e) => setLifestyleChanges(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />
                                <FormInputField
                                    label="Yoga / Pranayama"
                                    placeholder="Specific asanas..."
                                    value={physicalExercises}
                                    onChange={(e) => setPhysicalExercises(e.target.value)}
                                    width="100%"
                                    highlightBlack={true}
                                />
                            </div>
                        </div>

                        {/* Patient Referred To */}
                        <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/DoctorBagIcon.svg"
                                    alt="Medicine Prescribed"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Patient Referred To     <span className="text-[#F6776E]">*</span>                      </span>
                        </div>
                        <div ref={patientReferredToRef} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="w-[480px]">
                                <Tabs
                                    className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                    options={[
                                        { value: "Follow Ups", label: "Follow Ups" },
                                        { value: "IPD Admission", label: "IPD Admission" },
                                        { value: "Day Care Admission", label: "Day Care Admission" },
                                    ]}
                                    value={patientReferredTo}
                                    onChange={(val) => {
                                        setPatientReferredTo(val);
                                        if (errors.patientReferredTo) {
                                            setErrors(prev => {
                                                const next = { ...prev };
                                                delete next.patientReferredTo;
                                                return next;
                                            });
                                        }
                                    }}
                                />
                                {errors.patientReferredTo && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.patientReferredTo}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 8. Section Progress Monitoring (Visit [Count]) for revisit ok */}
                {showProgressMonitoring && (
                    <div ref={section8Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                        <div className="flex items-center justify-between ">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">8</div>
                                {/* <h3 className="font-inter font-semibold text-base text-[#262D3B]">Progress Monitoring (Visit {visitCount})</h3> */}
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Progress Monitoring (Revisit)</h3>

                            </div>
                            <SectionProgress percent={getSection8Percent()} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Progress Status Card */}
                            <div ref={progressStatusRef} className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 bg-white">
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <Image
                                            src="/icons/DoctorBagIcon.svg"
                                            alt="Progress Status"
                                            width={16}
                                            height={16}
                                        />
                                    </div>
                                    <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                        Progress Status <span className="text-[#F6776E]">*</span>
                                    </span>
                                </div>
                                <Tabs
                                    className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                    options={[
                                        { value: "better", label: "Better" },
                                        { value: "same", label: "Same" },
                                        { value: "worse", label: "Worse" },
                                        { value: "new symptoms", label: "New Symptoms" }
                                    ]}
                                    value={progressStatus}
                                    onChange={(val) => {
                                        setProgressStatus(val);
                                        if (errors.progressStatus) {
                                            setErrors(prev => {
                                                const next = { ...prev };
                                                delete next.progressStatus;
                                                return next;
                                            });
                                        }
                                    }}
                                />
                                {errors.progressStatus && (
                                    <p className="text-xs text-[#F6776E] mt-1">{errors.progressStatus}</p>
                                )}
                            </div>

                            {/* Medicine Adherence Card */}
                            <div ref={medicineAdherenceRef} className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 bg-white">
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <Image
                                            src="/icons/DoctorBagIcon.svg"
                                            alt="Medicine Adherence"
                                            width={16}
                                            height={16}
                                        />
                                    </div>
                                    <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                        Medicine Adherence <span className="text-[#F6776E]">*</span>
                                    </span>
                                </div>
                                <Tabs
                                    className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                    options={[
                                        { value: "regular", label: "Regular" },
                                        { value: "irregular", label: "Irregular" },
                                        { value: "side effects", label: "Side Effects" }
                                    ]}
                                    value={medicineAdherence}
                                    onChange={(val) => {
                                        setMedicineAdherence(val);
                                        if (errors.medicineAdherence) {
                                            setErrors(prev => {
                                                const next = { ...prev };
                                                delete next.medicineAdherence;
                                                return next;
                                            });
                                        }
                                    }}
                                />
                                {errors.medicineAdherence && (
                                    <p className="text-xs text-[#F6776E] mt-1">{errors.medicineAdherence}</p>
                                )}
                            </div>
                        </div>

                        {/* Symptom Recovery % */}
                        <div className="space-y-4 pt-2">
                            <h4 className="font-inter font-semibold text-sm text-[#434956]">Symptom Recovery %</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                <SymptomRecoverySlider label="Pain" value={painRecovery} onChange={setPainRecovery} />
                                <SymptomRecoverySlider label="Digestion" value={digestionRecovery} onChange={setDigestionRecovery} />
                                <SymptomRecoverySlider label="Energy" value={energyRecovery} onChange={setEnergyRecovery} />
                                <SymptomRecoverySlider label="Sleep" value={sleepRecovery} onChange={setSleepRecovery} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <FormTextareaField
                                ref={clinicalRemarksRef}
                                label="Clinical Remarks *"
                                placeholder="Detailed clinical observations..."
                                value={clinicalRemarks}
                                onChange={(e) => {
                                    setClinicalRemarks(e.target.value);
                                    if (errors.clinicalRemarks) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.clinicalRemarks;
                                            return next;
                                        });
                                    }
                                }}
                                width="100%"
                                error={errors.clinicalRemarks}
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                        </div>
                    </div>
                )}
                {/* ACTION BUTTON CONTROLS */}

                {/* Confirmation Dialog */}
                <MessageDialog
                    open={isConfirmDialogOpen}
                    onClose={() => !isSubmitting && setIsConfirmDialogOpen(false)}
                    iconSlot={
                        <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[#0B8C00]">
                            <span className="text-[48px] font-bold text-white leading-none font-inter select-none">?</span>
                        </div>
                    }
                    message="Are you sure that the data you have filled in is accurate and correct?"
                    confirmText="Yes"
                    cancelText="No"
                    showCancel={true}
                    onConfirm={handleConfirmSubmit}
                    onCancel={() => setIsConfirmDialogOpen(false)}
                    isActionLoading={isSubmitting}
                />

                {/* Success Dialog */}
                <MessageDialog
                    open={showSuccessDialog}
                    onClose={() => {
                        setShowSuccessDialog(false);
                        onComplete?.();
                    }}
                    icon="/icons/SuccessCheck.svg"
                    iconBgColor="#E8F5E9"
                    message="Consultation and Physical Examination saved successfully!"
                    confirmText="Success"
                    showCancel={false}
                    onConfirm={() => {
                        setShowSuccessDialog(false);
                        onComplete?.();
                    }}
                />

                {/* Error Dialog */}
                <MessageDialog
                    open={showErrorDialog}
                    onClose={() => setShowErrorDialog(false)}
                    icon="/icons/CrossIcon.svg"
                    iconBgColor="#FFEBEE"
                    message="Something went wrong while saving the consultation data. Please try again."
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => setShowErrorDialog(false)}
                />

                {isNotesOpen && (
                    <Dialog
                        open={isNotesOpen}
                        onClose={() => setIsNotesOpen(false)}
                        title="Doctor's Notes (AI Generated)"
                        width={600}
                    >
                        <div className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap p-2">
                            {doctorNotes}
                        </div>
                    </Dialog>
                )}

            </div>
        );
    });
