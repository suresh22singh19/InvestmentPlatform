"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
    Button,
    Dialog,
    FormInputField,
    FormSelectField,
    FormTextareaField,
    Tabs,
    Slider,
    Tooltip,
} from "@/components/ui";
import { useGetSpecificAssessmentHistoryDetailOfPatientQuery } from "@/store/api/doctorApi";
import { FormInputSelectGroup } from "./FormInputSelectGroup";
import {
    DOSAGE_UNIT_OPTIONS,
    DURATION_UNIT_OPTIONS,
    FREQUENCY_OPTIONS,
    TIME_OPTIONS,
    parseDosageComponents,
    parseDurationComponents,
    getTimingLabel,
    getFrequencyLabel,
    normalizeTimingValue,
    normalizeFrequencyValue,
} from "@/lib/medicineUtils";

interface IafDetailsDialogProps {
    opdAssessmentId: number;
    onClose: () => void;
}

interface BodyMarker {
    id: number;
    x: number;
    y: number;
    view: "front" | "back";
    type: "pain" | "swelling" | "numbness";
}

// Default select options matching ClinicalAssessmentRecord.tsx
const GENDER_OPTIONS = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Other", value: "Other" },
];

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

const MEDICINE_OPTIONS = [
    { label: "Triphala Churna", value: "Triphala Churna" },
    { label: "Ashwagandha", value: "Ashwagandha" },
    { label: "Amla Juice", value: "Amla Juice" },
    { label: "Giloy Ghanvati", value: "Giloy Ghanvati" },
    { label: "Chandraprabha Vati", value: "Chandraprabha Vati" },
];

// Helper to ensure custom/AI-generated values are available as selected options in dropdowns
const getOptionsWithFallback = (value: string | undefined | null, defaultOptions: { label: string; value: string }[]) => {
    if (!value) return defaultOptions;
    const exists = defaultOptions.some(opt => opt.value === value);
    if (exists) return defaultOptions;
    return [...defaultOptions, { label: value, value: value }];
};

interface SymptomRecoverySliderProps {
    label: string;
    value: number;
}

function SymptomRecoverySlider({ label, value }: SymptomRecoverySliderProps) {
    return (
        <div className="space-y-1">
            <span className="block text-xs font-medium text-[#7B8089]">{label}</span>
            <div className="flex items-center gap-3">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    disabled={true}
                    className="w-full h-1.5 rounded-full appearance-none outline-none cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0B8C00] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0B8C00] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white"
                    style={{
                        background: `linear-gradient(to right, #0B8C00 0%, #0B8C00 ${value}%, #EBECED ${value}%, #EBECED 100%)`,
                    }}
                />
                <span className="text-xs font-bold text-[#434956] min-w-[28px] text-right">{value}%</span>
            </div>
        </div>
    );
}

export function IafDetailsDialog({ opdAssessmentId, onClose }: IafDetailsDialogProps) {
    const { data: detailRes, isLoading, error } = useGetSpecificAssessmentHistoryDetailOfPatientQuery(opdAssessmentId);
    const [activeTimelineStep, setActiveTimelineStep] = useState(1);

    const section1Ref = useRef<HTMLDivElement>(null);
    const section2Ref = useRef<HTMLDivElement>(null);
    const section3Ref = useRef<HTMLDivElement>(null);
    const section4Ref = useRef<HTMLDivElement>(null);
    const section5Ref = useRef<HTMLDivElement>(null);
    const section6Ref = useRef<HTMLDivElement>(null);
    const section7Ref = useRef<HTMLDivElement>(null);
    const section8Ref = useRef<HTMLDivElement>(null);

    const data = detailRes?.data;

    const hasValidProgressMonitoring = (pm: any): boolean => {
        if (!pm || typeof pm !== "object") return false;
        const keys = Object.keys(pm);
        if (keys.length === 0) return false;
        return !!(
            pm.comparisonWithPreviousVisit ||
            pm.progressNotes ||
            pm.medicineAdherence ||
            pm.symptomRecovery ||
            pm.overallImprovement
        );
    };

    const rawVisitType = (data?.metadata?.visitType || "").trim().toLowerCase();
    const isFirstVisit = rawVisitType === "first" || rawVisitType === "1" || rawVisitType === "first visit";
    const showProgressMonitoring = !isFirstVisit && hasValidProgressMonitoring(data?.progressMonitoring);

    // Scroll to specific section inside scrollable container
    const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>, step: number) => {
        setActiveTimelineStep(step);
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // Helper functions to check filled percentages matching ClinicalAssessmentRecord logic
    const getSection1Percent = () => {
        if (!data) return 0;
        const pp = data.patientPresentation;
        const fields = [
            pp?.chiefComplaint && (Array.isArray(pp.chiefComplaint) ? pp.chiefComplaint.length > 0 : String(pp.chiefComplaint).trim() !== ""),
            pp?.symptoms && (Array.isArray(pp.symptoms) ? pp.symptoms.length > 0 : String(pp.symptoms).trim() !== ""),
            pp?.hpi && (Array.isArray(pp.hpi) ? pp.hpi.length > 0 : String(pp.hpi).trim() !== ""),
            pp?.socialHistory && (Array.isArray(pp.socialHistory) ? pp.socialHistory.length > 0 : String(pp.socialHistory).trim() !== ""),
            pp?.pastMedicalHistory && (Array.isArray(pp.pastMedicalHistory) ? pp.pastMedicalHistory.length > 0 : String(pp.pastMedicalHistory).trim() !== ""),
            pp?.familyHistory && (Array.isArray(pp.familyHistory) ? pp.familyHistory.length > 0 : String(pp.familyHistory).trim() !== ""),
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / 6) * 100);
    };

    const getSection2Percent = () => {
        if (!data) return 0;
        const meds = data.medications;
        const fields = [
            meds?.currentMedication && String(meds.currentMedication).trim() !== "",
            meds?.doctorNotes && String(meds.doctorNotes).trim() !== "",
            meds?.surgeryHistory && String(meds.surgeryHistory).trim() !== "",
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / 3) * 100);
    };

    const getSection3Percent = () => {
        if (!data) return 0;
        const sr = data.systemicReview;
        const fields = [
            sr?.diabetes?.status && String(sr.diabetes.status).trim() !== "",
            sr?.bloodPressure?.status && String(sr.bloodPressure.status).trim() !== "",
            sr?.thyroid?.status && String(sr.thyroid.status).trim() !== "",
            sr?.allergy?.types && (Array.isArray(sr.allergy.types) ? sr.allergy.types.length > 0 : String(sr.allergy.types).trim() !== ""),
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / 4) * 100);
    };

    const getSection4Percent = () => {
        if (!data) return 0;
        const sh = data.specializedHistory;
        const gh = sh?.gynaecHistory || data.gynaecHistory;
        const mh = sh?.mentalHealth || data.mentalHealth;
        const sn = sh?.systemicNotes || data.systemicNotes || data.specializedHistory?.systemicNotes;
        const commonFields = [
            mh?.stressLevel && String(mh.stressLevel).trim() !== "",
            sn?.gastro?.symptoms && sn.gastro.symptoms.length > 0,
            sn?.respiratory?.symptoms && sn.respiratory.symptoms.length > 0,
            sn?.cardiac?.symptoms && sn.cardiac.symptoms.length > 0,
            sn?.nervous?.symptoms && sn.nervous.symptoms.length > 0,
            sn?.urinary?.symptoms && sn.urinary.symptoms.length > 0,
        ];
        const genderVal = data.metadata?.gender || "male";
        const isFemale = String(genderVal).toLowerCase() === "female" || !!gh;
        const femaleFields = isFemale && gh ? [
            gh.cycle && String(gh.cycle).trim() !== "",
            gh.flow && String(gh.flow).trim() !== "",
        ] : [];
        const allFields = [...commonFields, ...femaleFields];
        const filled = allFields.filter(Boolean).length;
        return Math.round((filled / allFields.length) * 100);
    };

    const getSection5Percent = () => {
        if (!data) return 0;
        const pe = data.physicalExamination;
        const fields = [
            pe?.balanceMobility?.sitting && String(pe.balanceMobility.sitting).trim() !== "",
            pe?.balanceMobility?.standing && String(pe.balanceMobility.standing).trim() !== "",
            pe?.balanceMobility?.walking && String(pe.balanceMobility.walking).trim() !== "",
            pe?.pain?.site && String(pe.pain.site).trim() !== "",
            pe?.asthaVidhaPariksha?.tongue && String(pe.asthaVidhaPariksha.tongue).trim() !== "",
            pe?.asthaVidhaPariksha?.pulse && String(pe.asthaVidhaPariksha.pulse).trim() !== "",
            pe?.asthaVidhaPariksha?.eyes && String(pe.asthaVidhaPariksha.eyes).trim() !== "",
            pe?.asthaVidhaPariksha?.nails && String(pe.asthaVidhaPariksha.nails).trim() !== "",
            pe?.asthaVidhaPariksha?.overallPrakriti && String(pe.asthaVidhaPariksha.overallPrakriti).trim() !== "",
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / 9) * 100);
    };

    const getSection6Percent = () => {
        if (!data) return 0;
        const inv = data.investigations;
        const fields = [
            inv?.radiology?.findings && inv.radiology.findings.length > 0,
            inv?.laboratory?.tests && inv.laboratory.tests.length > 0,
            inv?.diagnosis?.provisional && String(inv.diagnosis.provisional).trim() !== "",
            inv?.diagnosis?.final && String(inv.diagnosis.final).trim() !== "",
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / 4) * 100);
    };

    const getSection7Percent = () => {
        if (!data) return 0;
        const tp = data.treatmentPlan;
        const hasMeds = (tp?.prescribedMedicines && tp.prescribedMedicines.length > 0) || (data.patientMedicinesPres && data.patientMedicinesPres.length > 0);
        const fields = [
            tp?.diet && String(tp.diet).trim() !== "",
            tp?.lifestyle && String(tp.lifestyle).trim() !== "",
            tp?.yogaPranayama && String(tp.yogaPranayama).trim() !== "",
            tp?.patientEducation && String(tp.patientEducation).trim() !== "",
            hasMeds,
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / 5) * 100);
    };

    const getSection8Percent = () => {
        if (!data) return 0;
        const pm = data.progressMonitoring;
        const fields = [
            pm?.comparisonWithPreviousVisit && String(pm.comparisonWithPreviousVisit).trim() !== "",
            pm?.progressNotes && String(pm.progressNotes).trim() !== "",
            pm?.overallImprovement && String(pm.overallImprovement).trim() !== "",
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / 3) * 100);
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

    const getCompletionPercent = () => {
        const sum7 = (
            getSection1Percent() +
            getSection2Percent() +
            getSection3Percent() +
            getSection4Percent() +
            getSection5Percent() +
            getSection6Percent() +
            getSection7Percent()
        );
        if (showProgressMonitoring) {
            return Math.round((sum7 + getSection8Percent()) / 8);
        }
        return Math.round(sum7 / 7);
    };

    // Parser for pain markers mapped on standard body silhouette
    const markers: BodyMarker[] = (data?.physicalExamination?.painMapping || []).map((m: any) => ({
        id: Number(m.id) || Math.random(),
        x: m.xPercent || m.x || 0,
        y: m.yPercent || m.y || 0,
        view: m.view || "front",
        type: m.markerType || m.type || "pain",
    }));

    const getProgressColorAndLabel = (percent: number) => {
        if (percent === 0) {
            return { color: "#EF4444", text: "Not Started" };
        } else if (percent < 100) {
            return { color: "#EAB308", text: "In Progress" };
        } else {
            return { color: "#0B8C00", text: "Completed" };
        }
    };

    const ReadOnlySectionProgress = ({ percent }: { percent: number }) => {
        const { color, text } = getProgressColorAndLabel(percent);
        return (
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
                <span className="text-xs font-semibold" style={{ color }}>
                    {percent}% {text}
                </span>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Dialog open={true} onClose={onClose} title="IAF Form" width={1200} height="90vh" contentPadding="px-6 pb-6 pt-4">
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-[#0B8C00] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold text-[#7B8089]">Fetching assessment details...</span>
                </div>
            </Dialog>
        );
    }

    if (error || !data) {
        return (
            <Dialog open={true} onClose={onClose} title="IAF Form" width={1200} height="90vh" contentPadding="px-6 pb-6 pt-4">
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Image src="/icons/CrossIcon.svg" alt="Error" width={48} height={48} className="bg-[#FFEBEE] p-2 rounded-full" />
                    <span className="text-sm font-semibold text-red-500">Failed to load assessment details.</span>
                    <button onClick={onClose} className="px-6 py-2 bg-[#0B8C00] text-white font-bold rounded-full text-xs">
                        Close
                    </button>
                </div>
            </Dialog>
        );
    }

    const overallPercent = getCompletionPercent();
    const isFemalePatient = String(data.metadata?.gender || "").toLowerCase() === "female" || !!data.specializedHistory?.gynaecHistory;

    // Normalizing Step values for form components
    // Step 1
    const chiefComplaintVal = Array.isArray(data.patientPresentation?.chiefComplaint)
        ? (data.patientPresentation.chiefComplaint[0]?.complaint || "")
        : (data.patientPresentation?.chiefComplaint || "");
    const symptomsVal = Array.isArray(data.patientPresentation?.symptoms)
        ? data.patientPresentation.symptoms.join(", ")
        : (data.patientPresentation?.symptoms || "");
    const hpiVal = Array.isArray(data.patientPresentation?.hpi)
        ? data.patientPresentation.hpi.join(", ")
        : (data.patientPresentation?.hpi || "");
    const genderVal = data.metadata?.gender || "";
    const socialVal = Array.isArray(data.patientPresentation?.socialHistory)
        ? data.patientPresentation.socialHistory.join(", ")
        : (data.patientPresentation?.socialHistory || "");
    const pastMedVal = Array.isArray(data.patientPresentation?.pastMedicalHistory)
        ? data.patientPresentation.pastMedicalHistory.join(", ")
        : (data.patientPresentation?.pastMedicalHistory || "");
    const familyVal = Array.isArray(data.patientPresentation?.familyHistory)
        ? data.patientPresentation.familyHistory.join(", ")
        : (data.patientPresentation?.familyHistory || "");

    // Step 2
    const currentMedsVal = String(data.medications?.currentMedication || "").toLowerCase();
    let medRemarksVal = "";
    if (data.medications) {
        const rawRemarks = data.medications.remarks || data.medications.doctorNotes || "";
        let parsedRemarks = "";
        if (Array.isArray(rawRemarks)) {
            parsedRemarks = rawRemarks.map((r: any) => String(r).trim()).filter(Boolean).join(", ");
        } else if (typeof rawRemarks === "string") {
            parsedRemarks = rawRemarks.trim();
        }

        const isCurrentMedYes = String(data.medications.currentMedication).toLowerCase() === "yes" || String(data.medications.currentMedication).toLowerCase() === "true";
        const currentMedStatus = isCurrentMedYes ? "yes" : "no";

        if (parsedRemarks) {
            const lowerRemarks = parsedRemarks.toLowerCase();
            if (lowerRemarks.startsWith("yes") || lowerRemarks.startsWith("no")) {
                medRemarksVal = parsedRemarks;
            } else {
                medRemarksVal = `${currentMedStatus}, ${parsedRemarks}`;
            }
        } else {
            medRemarksVal = currentMedStatus;
        }
    }
    const surgeryVal = data.medications?.surgeryHistory || "";

    // Step 3
    const diabetesVal = String(data.systemicReview?.diabetes?.status || "").toLowerCase();
    const diabeticYearsVal = data.systemicReview?.diabetes?.yearsIfDiabetic ? String(data.systemicReview.diabetes.yearsIfDiabetic) : "";
    const diabetesNotesVal = data.systemicReview?.diabetes?.notes || "";

    const rawBP = String(data.systemicReview?.bloodPressure?.status || "").toLowerCase();
    const bpVal = rawBP.includes("high") ? "high" : rawBP.includes("low") ? "low" : rawBP === "no" || rawBP === "false" ? "no" : "";
    const bpRemarksVal = data.systemicReview?.bloodPressure?.remarks || "";

    const rawThyroid = String(data.systemicReview?.thyroid?.status || "").toLowerCase();
    const thyroidVal = rawThyroid.includes("hypo") ? "hypo" : rawThyroid.includes("hyper") ? "hyper" : rawThyroid === "no" || rawThyroid === "false" ? "no" : "";
    const thyroidRemarksVal = data.systemicReview?.thyroid?.remarks || "";

    const allergyHistoryTypes = data.systemicReview?.allergy?.types || [];
    const rawAllergy = allergyHistoryTypes.length > 0 ? String(allergyHistoryTypes[0]?.type || allergyHistoryTypes[0] || "").toLowerCase() : "no";
    const allergyVal = ["food", "drug", "skin", "other"].includes(rawAllergy) ? (rawAllergy === "skin" ? "other" : rawAllergy) : "no";
    const allergyDetailsVal = data.systemicReview?.allergy?.details || "";

    const infectiousAlertVal = data.communicableDiseases ? data.communicableDiseases : "normal";
    const infectiousDetailsVal = data.communicableDiseasesRemark || "";

    // Step 4
    const gh = data.specializedHistory?.gynaecHistory || data.gynaecHistory;
    const cycleVal = String(gh?.cycle || "").toLowerCase();
    const flowVal = String(gh?.flow || "").toLowerCase();
    const gynaecPainVal = gh?.pain || "";
    const dischargeVal = gh?.discharge || "";
    const pregnancyVal = gh?.pregnancy || "";
    const miscarriageVal = gh?.miscarriage || "";
    const gynaecRemarksVal = gh?.remarks || "";

    const anxietyVal = String(data.specializedHistory?.mentalHealth?.anxietyDetails || "").toLowerCase();
    const normalizedAnxietyVal = anxietyVal.includes("mild") ? "mild" : anxietyVal.includes("moderate") ? "moderate" : (anxietyVal.includes("severe") || anxietyVal.includes("serve")) ? "severe" : "none";

    const depressionVal = String(data.specializedHistory?.mentalHealth?.depressionDetails || "").toLowerCase();
    const normalizedDepressionVal = depressionVal.includes("mild") ? "mild" : depressionVal.includes("moderate") ? "moderate" : (depressionVal.includes("severe") || depressionVal.includes("serve")) ? "severe" : "none";

    const sleepVal = String(data.specializedHistory?.mentalHealth?.sleepDetails || "").toLowerCase();
    const normalizedSleepVal = sleepVal.includes("good") ? "good" : sleepVal.includes("fair") ? "fair" : sleepVal.includes("poor") ? "poor" : sleepVal.includes("insomnia") ? "insomnia" : "good";

    const stressVal = String(data.specializedHistory?.mentalHealth?.stressLevel || "").toLowerCase();
    const normalizedStressVal = stressVal.includes("mild") ? "mild" : stressVal.includes("moderate") ? "moderate" : (stressVal.includes("severe") || stressVal.includes("serve")) ? "severe" : "none";

    const mentalRemarksVal = data.specializedHistory?.mentalHealth?.doctorNotes || "";

    const getMultiSymptomValue = (symptoms: string[] | undefined, validValues: string[], hasOthers = false) => {
        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) return "none";
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
        return unique.length > 0 ? unique.join(",") : "none";
    };

    const normalizedGastricVal = getMultiSymptomValue(data.specializedHistory?.systemicNotes?.gastro?.symptoms, ["acidity", "gerd", "gas", "abd pain", "constipation", "loose stool", "nausea", "other", "none"], true);
    const gastricRemarksVal = data.specializedHistory?.systemicNotes?.gastro?.remarks || "";

    const normalizedRespiratoryVal = getMultiSymptomValue(data.specializedHistory?.systemicNotes?.respiratory?.symptoms, ["sob", "cough", "fever", "asthma", "wheeze", "other", "none"], true);
    const respiratoryRemarksVal = data.specializedHistory?.systemicNotes?.respiratory?.remarks || "";

    const normalizedCardiacVal = getMultiSymptomValue(data.specializedHistory?.systemicNotes?.cardiac?.symptoms, ["chest pain", "palpitation", "sweating", "dizziness", "others", "none"], true);
    const cardiacRemarksVal = data.specializedHistory?.systemicNotes?.cardiac?.remarks || "";

    const normalizedNervousVal = getMultiSymptomValue(data.specializedHistory?.systemicNotes?.nervous?.symptoms, ["headache", "sensory loss", "weakness", "others", "none"], true);
    const nervousRemarksVal = data.specializedHistory?.systemicNotes?.nervous?.remarks || "";

    const normalizedUrinaryVal = getMultiSymptomValue(data.specializedHistory?.systemicNotes?.urinary?.symptoms, ["burning", "frequency", "blood", "low output", "stones", "others", "none"], true);
    const urinaryRemarksVal = data.specializedHistory?.systemicNotes?.urinary?.remarks || "";

    // Step 5
    const sittingVal = String(data.physicalExamination?.balanceMobility?.sitting || "normal").toLowerCase();
    const standingVal = String(data.physicalExamination?.balanceMobility?.standing || "normal").toLowerCase();
    const walkingVal = String(data.physicalExamination?.balanceMobility?.walking || "normal").toLowerCase();
    const mobilityRemarksVal = data.physicalExamination?.balanceMobility?.remarks || "";

    const painSiteVal = data.physicalExamination?.pain?.site || "";
    const painScaleVal = data.physicalExamination?.pain?.scale ?? null;
    const painNotesVal = data.physicalExamination?.pain?.locationNotes || "";

    const tongueVal = data.physicalExamination?.asthaVidhaPariksha?.tongue || "";
    const pulseVal = data.physicalExamination?.asthaVidhaPariksha?.pulse || "";
    const eyesVal = data.physicalExamination?.asthaVidhaPariksha?.eyes || "";
    const nailsVal = data.physicalExamination?.asthaVidhaPariksha?.nails || "";
    const vataVal = data.physicalExamination?.asthaVidhaPariksha?.vataNotes || "";
    const pittaVal = data.physicalExamination?.asthaVidhaPariksha?.pittaNotes || "";
    const kaphaVal = data.physicalExamination?.asthaVidhaPariksha?.kaphaNotes || "";
    const prakritiVal = data.physicalExamination?.asthaVidhaPariksha?.overallPrakriti || "";
    const avpRemarksVal = data.physicalExamination?.asthaVidhaPariksha?.remarks || "";

    // Step 6
    const rawRadiologyArr = data.investigations?.radiology?.findings || [];
    const normalizedRadiologyVal = (Array.isArray(rawRadiologyArr) && rawRadiologyArr.length > 0)
        ? rawRadiologyArr.map((f: any) => {
            const fStr = String(f || "").toLowerCase();
            if (fStr === "nil" || fStr === "none") return "None";
            if (fStr.includes("x-ray")) return "X-Ray";
            if (fStr === "mri") return "MRI";
            if (fStr.includes("ultrasound")) return "Ultrasound";
            return "None";
        }).filter(v => v !== "None").join(",") || "None"
        : "None";
    const radiologyRemarksVal = data.investigations?.radiology?.remarks || "";

    const rawPathologyArr = data.investigations?.laboratory?.tests || [];
    const normalizedPathologyVal = (Array.isArray(rawPathologyArr) && rawPathologyArr.length > 0)
        ? rawPathologyArr.map((t: any) => {
            const tStr = String(t || "").toLowerCase();
            if (tStr === "nil" || tStr === "none") return "None";
            if (tStr === "blood") return "Blood";
            if (tStr === "urine") return "Urine";
            if (tStr === "culture") return "Culture";
            return "None";
        }).filter(v => v !== "None").join(",") || "None"
        : "None";
    const prescribedLabTestsVal = data.investigations?.laboratory?.testsPrescribed || "";
    const provisionalVal = data.investigations?.diagnosis?.provisional || "";
    const finalVal = data.investigations?.diagnosis?.final || "";

    // Step 7
    const patientEdVal = data.treatmentPlan?.patientEducation || "";

    let prescribedMeds: any[] = [];
    const rawMeds = (data && Array.isArray(data.treatmentPlan?.prescribedMedicines) && data.treatmentPlan.prescribedMedicines.length > 0)
        ? data.treatmentPlan.prescribedMedicines
        : (data && Array.isArray(data.patientMedicinesPres) && data.patientMedicinesPres.length > 0)
            ? data.patientMedicinesPres
            : [];

    prescribedMeds = rawMeds.map((m: any) => {
        const { amount: parsedDVal, unit: parsedDUnit } = parseDosageComponents(m.medicineDosage || m.dosage || m.dosageAmount, m.dosageUnit);
        const dAmount = (m.dosageValue !== undefined && m.dosageValue !== null && String(m.dosageValue) !== "0")
            ? String(m.dosageValue)
            : (parsedDVal || "1");

        const dUnitRaw = m.dosageUnit || parsedDUnit;
        const dUnit = DOSAGE_UNIT_OPTIONS.find(u => u.toLowerCase() === String(dUnitRaw).toLowerCase()) || "TAB";

        const { amount: parsedDurVal, unit: parsedDurUnit } = parseDurationComponents(m.medicineDuration || m.duration || m.durationAmount, m.durationUnit);
        const durAmount = (m.durationValue !== undefined && m.durationValue !== null && String(m.durationValue) !== "0")
            ? String(m.durationValue)
            : (parsedDurVal || "1");

        const durUnitRaw = m.durationUnit || parsedDurUnit;
        const durUnit = DURATION_UNIT_OPTIONS.find(u => u.toLowerCase() === String(durUnitRaw).toLowerCase()) || "Days";

        const rawFreq = m.frequencyKey || m.medicineFrequency || m.frequency || m.frequencyType;
        const freqVal = normalizeFrequencyValue(rawFreq) || rawFreq || "";

        const rawTiming = m.timingKey || m.medicineTiming || m.timing || m.timingType;
        const timingVal = normalizeTimingValue(rawTiming) || rawTiming || "";

        return {
            medicineName: m.medicineName || m.name || "N/A",
            dosageAmount: dAmount,
            dosageUnit: dUnit,
            medicineDosage: `${dAmount} ${dUnit}`,
            frequencyValue: freqVal,
            medicineFrequency: getFrequencyLabel(freqVal) || freqVal || "N/A",
            durationAmount: durAmount,
            durationUnit: durUnit,
            medicineDuration: `${durAmount} ${durUnit}`,
            timingValue: timingVal,
            medicineTiming: getTimingLabel(timingVal) || timingVal || "N/A",
            remarks: m.remarks || m.medicineRemarks || "",
        };
    });
    const dietVal = data.treatmentPlan?.diet || "";
    const lifestyleVal = data.treatmentPlan?.lifestyle || "";
    const yogaVal = data.treatmentPlan?.yogaPranayama || "";
    const treatmentNotesVal = data.treatmentPlan?.treatmentNotes || "";

    // Step 8
    const progressVal = String(data.progressMonitoring?.comparisonWithPreviousVisit || "").toLowerCase();
    const normalizedProgressVal = ["better", "same", "worse", "new symptoms"].includes(progressVal) ? progressVal : "better";
    const dbMedicineAdherence = String(data.progressMonitoring?.medicineAdherence || "").toLowerCase();
    const medicineAdherenceVal = ["regular", "irregular", "side effects"].includes(dbMedicineAdherence)
        ? dbMedicineAdherence
        : (currentMedsVal === "yes" ? "regular" : currentMedsVal === "no" ? "irregular" : "regular");
    const symptomRec = data?.progressMonitoring?.symptomRecovery;
    const painRecoveryVal = symptomRec?.pain !== undefined ? Number(symptomRec.pain) : (painScaleVal ? Math.max(0, 100 - (painScaleVal * 10)) : 50);
    const digestionRecoveryVal = symptomRec?.digestion !== undefined ? Number(symptomRec.digestion) : 50;
    const energyRecoveryVal = symptomRec?.energy !== undefined ? Number(symptomRec.energy) : 50;
    const sleepRecoveryVal = symptomRec?.sleep !== undefined ? Number(symptomRec.sleep) : (data?.specializedHistory?.mentalHealth?.symptoms?.includes("Sleep Issues") ? 30 : 70);
    const clinicalRemarksVal = data.progressMonitoring?.progressNotes || "";

    return (
        <Dialog open={true} onClose={onClose} title="IAF Form" width={1200} height="90vh" contentPadding="px-6 pb-6 pt-4">
            <style>{`
                @media print {
                    @page {
                        size: portrait;
                        margin-top: 8mm !important;
                        margin-bottom: 8mm !important;
                        margin-left: 0 !important;
                        margin-right: 0 !important;
                    }
                    html, body {
                        height: auto !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #iaf-printable-content, #iaf-printable-content * {
                        visibility: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    .fixed, [role="dialog"], [data-radix-portal] {
                        position: static !important;
                        overflow: visible !important;
                        height: auto !important;
                        width: 100vw !important;
                        max-width: 100vw !important;
                        min-width: 100vw !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        left: 0 !important;
                        right: 0 !important;
                    }
                    #iaf-printable-content {
                        position: absolute !important;
                        left: 0 !important;
                        right: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 10px !important;
                    }
                    #iaf-printable-content > div, .space-y-6, .space-y-6 > div {
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    /* Force multi-column grid layout during print */
                    .grid {
                        display: grid !important;
                    }
                    .md\\:grid-cols-3, .lg\\:grid-cols-3 {
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    }
                    .md\\:grid-cols-2, .lg\\:grid-cols-2 {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                    .md\\:grid-cols-4, .sm\\:grid-cols-2.md\\:grid-cols-4 {
                        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                    }
                    .lg\\:grid-cols-5 {
                        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
                    }
                    .lg\\:grid-cols-11 {
                        grid-template-columns: repeat(11, minmax(0, 1fr)) !important;
                    }
                    .md\\:grid-cols-12 {
                        display: grid !important;
                        grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
                    }
                    .hidden.md\\:flex, .hidden.md\\:block {
                        display: flex !important;
                    }
                    span.md\\:hidden {
                        display: none !important;
                    }
                    .lg\\:col-span-1 { grid-column: span 1 / span 1 !important; }
                    .lg\\:col-span-2, .md\\:col-span-2 { grid-column: span 2 / span 2 !important; }
                    .lg\\:col-span-3, .md\\:col-span-3 { grid-column: span 3 / span 3 !important; }
                    .lg\\:col-span-4 { grid-column: span 4 / span 4 !important; }
                    .lg\\:col-span-5 { grid-column: span 5 / span 5 !important; }
                    .lg\\:col-span-6 { grid-column: span 6 / span 6 !important; }

                    #iaf-printable-content > div {
                        margin-bottom: 8px !important;
                        padding: 12px !important;
                    }
                    .space-y-6 {
                        margin-top: 0 !important;
                    }
                    .space-y-6 > :not([hidden]) ~ :not([hidden]) {
                        margin-top: 10px !important;
                    }
                    img, svg {
                        visibility: visible !important;
                        opacity: 1 !important;
                        display: inline-block !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .w-8.h-8.rounded-full.bg-\\[\\#EAF7E8\\], .w-8.h-8.bg-\\[\\#EAF7E8\\] {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background-color: #EAF7E8 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .pain-scale-selected {
                        background-color: #0B8C00 !important;
                        color: #ffffff !important;
                        border-color: transparent !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .pain-scale-unselected {
                        background-color: #F1F1F1 !important;
                        color: #434956 !important;
                        border-color: transparent !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Hide all scrollbars during print */
                    ::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    #iaf-printable-content * {
                        scrollbar-width: none !important;
                        -ms-overflow-style: none !important;
                    }
                    .overflow-x-auto, .overflow-auto, .scrollbar-hide {
                        overflow: visible !important;
                        overflow-x: visible !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:break-before-page {
                        page-break-before: always !important;
                        break-before: page !important;
                    }
                    .print\\:break-inside-avoid {
                        display: block !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        break-inside: avoid-page !important;
                    }
                    .scroll-mt-4, .scroll-mt-6, .rounded-\\[20px\\] {
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                        margin-bottom: 12px !important;
                    }
                    .rounded-\\[16px\\], .rounded-\\[8px\\], fieldset, textarea, input {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        margin-bottom: 10px !important;
                    }
                    h1, h2, h3, h4 {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                }
            `}</style>
            <div id="iaf-printable-content" className="flex flex-col gap-6">
                {/* Header / Completion Progress Board */}
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-4 mb-6 select-none shrink-0 print:border-none print:shadow-none">
                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-3">
                                <h3 className="font-inter font-bold text-sm text-[#262D3B]">Form Completion Status</h3>

                            </div>

                        </div>
                        <div className="flex gap-4 items-center justify-between">
                            <span className="font-inter font-bold text-lg" style={{ color: getProgressColorAndLabel(overallPercent).color }}>
                                {overallPercent}%
                            </span>
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
                            <Tooltip content="Print IAF Form">
                                <Button
                                    variant="primary"
                                    size="small"
                                    width={100}
                                    onClick={() => window.print()}
                                    leftIcon={
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                            <rect x="6" y="14" width="12" height="8"></rect>
                                        </svg>
                                    }
                                    className="!rounded-[20px] print:hidden"
                                >
                                    Print
                                </Button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Progress Timeline Buttons */}
                    <div className="relative w-full py-4">
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
                                const isCurrent = activeTimelineStep === item.step;
                                const sectionPercent = getSectionPercent(item.step);
                                const isSectionCompleted = sectionPercent === 100;
                                const { color: sectionColor } = getProgressColorAndLabel(sectionPercent);

                                let circleClass = "";
                                if (isCurrent) {
                                    circleClass = "bg-[#0B8C00] text-white border-[3px] border-white scale-105";
                                } else if (isSectionCompleted) {
                                    circleClass = "bg-[#E8F5E9] text-[#0B8C00] border-[3px] border-[#0B8C00]";
                                } else {
                                    circleClass = "bg-[#F1F1F1] text-[#7B8089] border-[3px] border-transparent";
                                }

                                return (
                                    <button
                                        key={item.step}
                                        type="button"
                                        onClick={() => scrollToSection(item.ref, item.step)}
                                        className="flex flex-col items-center gap-2 group focus:outline-none flex-1 text-center relative z-10"
                                    >
                                        {/* Circle */}
                                        <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center font-inter font-bold text-xs shadow-[0px_2px_4px_rgba(0,0,0,0.15)] transition-all duration-200 ${circleClass}`}>
                                            {item.step}
                                        </div>

                                        {/* Labels */}
                                        <div className="flex flex-col items-center gap-0.5 mt-2 w-full min-h-[50px] justify-start">
                                            <span
                                                className={`font-inter font-medium text-[12px] leading-tight transition-colors duration-150 text-center block ${isCurrent ? "text-[#262D3B] font-semibold" : "text-[#7B8089]"}`}
                                                style={{ maxWidth: "100px" }}
                                            >
                                                {item.label}
                                            </span>
                                            <span className="font-inter font-semibold text-xs text-center block mt-0.5 transition-colors duration-300" style={{ color: sectionColor }}>
                                                {sectionPercent}%
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Scrollable Container with Sections */}
                <div className="space-y-6 w-full pr-1">

                    {/* 1. Patient Presentation */}
                    <div ref={section1Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden scroll-mt-4">
                        <div className="px-6 py-4 border-b border-[#E3EEE1] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">1</div>
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Patient Presentation</h3>
                            </div>
                            <ReadOnlySectionProgress percent={getSection1Percent()} />
                        </div>

                        <div className="p-6 flex flex-col gap-6">
                            {/* Subheader: Patient narrative */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <img
                                        src="/icons/patientinfo.svg"
                                        alt="Patient Info"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Patient narrative
                                </span>
                            </div>

                            {/* Textarea fields grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormTextareaField
                                    label="Chief Complaint *"
                                    value={chiefComplaintVal}
                                    readOnly={true}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                />
                                <FormTextareaField
                                    label="Symptoms *"
                                    value={symptomsVal}
                                    readOnly={true}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                />
                                <FormTextareaField
                                    label="History of Present Illness (HPI)"
                                    value={hpiVal}
                                    readOnly={true}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                />
                                <FormTextareaField
                                    label="Social History"
                                    value={socialVal}
                                    readOnly={true}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                />
                                <FormTextareaField
                                    label="Past Medical History"
                                    value={pastMedVal}
                                    readOnly={true}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                />
                                <FormTextareaField
                                    label="Family History"
                                    value={familyVal}
                                    readOnly={true}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Medications & Supplements */}
                    <div ref={section2Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden scroll-mt-4">
                        <div className="px-6 py-4 border-b border-[#E3EEE1] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">2</div>
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Medications & Supplements</h3>
                            </div>
                            <ReadOnlySectionProgress percent={getSection2Percent()} />
                        </div>

                        <div className="p-6 flex flex-col gap-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                {/* Left Column: Current Medications (Yes/No) */}
                                <div className="lg:col-span-1 flex flex-col gap-2">
                                    <div className="flex items-center gap-[10px] min-h-[32px]">
                                        <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                            <img
                                                src="/icons/DoctorBagIcon.svg"
                                                alt="Medications"
                                                width={16}
                                                height={16}
                                                className="w-4 h-4 object-contain"
                                            />
                                        </div>
                                        <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                            Current Medications <span className="text-[#F6776E]">*</span>
                                        </span>
                                    </div>
                                    <div className="w-full">
                                        <Tabs
                                            options={[
                                                { value: "yes", label: "Yes" },
                                                { value: "no", label: "No" }
                                            ]}
                                            value={currentMedsVal}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Remarks / Doctor Notes */}
                                <div className="lg:col-span-2">
                                    <FormTextareaField
                                        label="Remarks / Doctor Notes"
                                        value={medRemarksVal}
                                        readOnly={true}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Full Width Row: Surgery History */}
                            <div className="w-full">
                                <FormTextareaField
                                    label="Surgery History"
                                    value={surgeryVal}
                                    readOnly={true}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Systemic Review & Co-morbidities */}
                    <div ref={section3Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4 print:break-before-page">
                        <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">3</div>
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Systemic Review & Co-morbidities</h3>
                            </div>
                            <ReadOnlySectionProgress percent={getSection3Percent()} />
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* Diabetes Mellitus Card */}
                            <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 print:break-inside-avoid">
                                {/* Header */}
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <img
                                            src="/icons/DiabetesMellitusIcon.svg"
                                            alt="Diabetes Mellitus"
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
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
                                            <div className="w-[280px]">
                                                <Tabs
                                                    className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                                    options={[
                                                        { value: "yes", label: "Yes" },
                                                        { value: "no", label: "No" }
                                                    ]}
                                                    value={diabetesVal}
                                                    onChange={() => { }}
                                                    disabled={true}
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column: Diabetes Notes */}
                                        <div className="lg:col-span-6">
                                            <FormTextareaField
                                                label="Diabetes Notes"
                                                value={diabetesNotesVal}
                                                readOnly={true}
                                                width="100%"
                                                height={80}
                                                className="!rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    {/* Years (if Diabetic) - Render below, full width */}
                                    <div className="w-full">
                                        <FormInputField
                                            label="Years (if Diabetic)"
                                            value={diabeticYearsVal}
                                            readOnly={true}
                                            width="100%"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Blood Pressure Card */}
                            <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 print:break-inside-avoid">
                                {/* Header */}
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <img
                                            src="/icons/BloodPressureIcon.svg"
                                            alt="Blood Pressure"
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
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
                                        <div className="w-full">
                                            <Tabs
                                                className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                                options={[
                                                    { value: "high", label: "High BP" },
                                                    { value: "low", label: "Low BP" },
                                                    { value: "no", label: "No" }
                                                ]}
                                                value={bpVal}
                                                onChange={() => { }}
                                                disabled={true}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Remarks */}
                                    <div className="lg:col-span-6">
                                        <FormTextareaField
                                            label="Remarks"
                                            value={bpRemarksVal}
                                            readOnly={true}
                                            width="100%"
                                            height={80}
                                            className="!rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Thyroid Disorder Card */}
                            <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 print:break-inside-avoid">
                                {/* Header */}
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <img
                                            src="/icons/ThyroidDisorderIcon.svg"
                                            alt="Thyroid Disorder"
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
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
                                        <div className="w-full">
                                            <Tabs
                                                className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                                options={[
                                                    { value: "hypo", label: "Hypothyroid" },
                                                    { value: "hyper", label: "Hyperthyroid" },
                                                    { value: "no", label: "No" }
                                                ]}
                                                value={thyroidVal}
                                                onChange={() => { }}
                                                disabled={true}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Remarks */}
                                    <div className="lg:col-span-6">
                                        <FormTextareaField
                                            label="Remarks"
                                            value={thyroidRemarksVal}
                                            readOnly={true}
                                            width="100%"
                                            height={80}
                                            className="!rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Allergy History Card */}
                            <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 print:break-inside-avoid">
                                {/* Header */}
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <img
                                            src="/icons/AllergyHistoryIcon.svg"
                                            alt="Allergy History"
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
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
                                        <div className="w-full">
                                            <Tabs
                                                className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                                options={[
                                                    { value: "food", label: "Food" },
                                                    { value: "drug", label: "Drug" },
                                                    { value: "other", label: "Other" },
                                                    { value: "no", label: "No" }
                                                ]}
                                                value={allergyVal}
                                                onChange={() => { }}
                                                disabled={true}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Allergy Details */}
                                    <div className="lg:col-span-6">
                                        <FormTextareaField
                                            label="Allergy Details"
                                            value={allergyDetailsVal}
                                            readOnly={true}
                                            width="100%"
                                            height={80}
                                            className="!rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>

                    {/* 4. Specialized History */}
                    <div ref={section4Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">4</div>
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Specialized History</h3>
                            </div>
                            <ReadOnlySectionProgress percent={getSection4Percent()} />
                        </div>

                        {/* Gynaec / Obs History (Only shown for female patients) */}
                        {isFemalePatient && (
                            <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                                {/* Header */}
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <img
                                            src="/icons/ObsHistoryIcon.svg"
                                            alt="Gynaec / Obs History"
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
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
                                                    value={cycleVal}
                                                    onChange={() => { }}
                                                    disabled={true}
                                                />
                                            </div>
                                        </div>
                                        <FormInputField
                                            label="Pain"
                                            value={gynaecPainVal}
                                            readOnly={true}
                                            width="100%"
                                        />
                                        <FormInputField
                                            label="Pregnancy"
                                            value={pregnancyVal}
                                            readOnly={true}
                                            width="100%"
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
                                                    value={flowVal}
                                                    onChange={() => { }}
                                                    disabled={true}
                                                />
                                            </div>
                                        </div>
                                        <FormInputField
                                            label="Discharge"
                                            value={dischargeVal}
                                            readOnly={true}
                                            width="100%"
                                        />
                                        <FormInputField
                                            label="Miscarriage"
                                            value={miscarriageVal}
                                            readOnly={true}
                                            width="100%"
                                        />
                                    </div>
                                </div>
                                <FormTextareaField
                                    label="Remarks"
                                    value={gynaecRemarksVal}
                                    readOnly={true}
                                    width="100%"
                                    height={80}
                                    className="!rounded-xl"
                                />
                            </div>
                        )}

                        {/* Mental & Psychological Health Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <img
                                        src="/icons/MentalHealthIcon.svg"
                                        alt="Mental health"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Mental health
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2 w-full">
                                    <span className="text-xs font-semibold text-[#7B8089]">
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
                                            value={normalizedAnxietyVal}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-full">
                                    <span className="text-xs font-semibold text-[#7B8089]">
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
                                            value={normalizedDepressionVal}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-full">
                                    <span className="text-xs font-semibold text-[#7B8089]">
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
                                            value={normalizedSleepVal}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-full">
                                    <span className="text-xs font-semibold text-[#7B8089]">
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
                                            value={normalizedStressVal}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            <FormTextareaField
                                label="Remarks / Doctor Notes"
                                value={mentalRemarksVal}
                                readOnly={true}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
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
                                    <img
                                        src="/icons/DiabetesMellitusIcon.svg"
                                        alt="Gastro Symptoms health"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Gastro Symptoms health
                                </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                                {/* Left: Tabs */}
                                <div className="lg:col-span-2 flex flex-col gap-2">
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
                                            value={normalizedGastricVal}
                                            onChange={() => { }}
                                            disabled={true}
                                            wrap={true}
                                            multiSelect={true}
                                        />
                                    </div>
                                </div>
                                {/* Right: Remarks */}
                                <div className="lg:col-span-3">
                                    <FormTextareaField
                                        label="Remarks / Doctor Notes"
                                        value={gastricRemarksVal}
                                        readOnly={true}
                                        width="100%"
                                        height={94}
                                        className="!rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Respiratory Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <img
                                        src="/icons/ThyroidDisorderIcon.svg"
                                        alt="Respiratory"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
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
                                            value={normalizedRespiratoryVal}
                                            onChange={() => { }}
                                            disabled={true}
                                            wrap={true}
                                            multiSelect={true}
                                        />
                                    </div>
                                </div>
                                {/* Right: Remarks */}
                                <div className="lg:col-span-3">
                                    <FormTextareaField
                                        label="Remarks / Doctor Notes"
                                        value={respiratoryRemarksVal}
                                        readOnly={true}
                                        width="100%"
                                        height={94}
                                        className="!rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cardiac Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <img
                                        src="/icons/BloodPressureIcon.svg"
                                        alt="Cardiac"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
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
                                            value={normalizedCardiacVal}
                                            onChange={() => { }}
                                            disabled={true}
                                            wrap={true}
                                            multiSelect={true}
                                        />
                                    </div>
                                </div>
                                {/* Right: Remarks */}
                                <div className="lg:col-span-3">
                                    <FormTextareaField
                                        label="Remarks / Doctor Notes"
                                        value={cardiacRemarksVal}
                                        readOnly={true}
                                        width="100%"
                                        height={94}
                                        className="!rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Nervous System Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <img
                                        src="/icons/MentalHealthIcon.svg"
                                        alt="Nervous System"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
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
                                            value={normalizedNervousVal}
                                            onChange={() => { }}
                                            disabled={true}
                                            wrap={true}
                                            multiSelect={true}
                                        />
                                    </div>
                                </div>
                                {/* Right: Remarks */}
                                <div className="lg:col-span-3">
                                    <FormTextareaField
                                        label="Remarks / Doctor Notes"
                                        value={nervousRemarksVal}
                                        readOnly={true}
                                        width="100%"
                                        height={94}
                                        className="!rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Urinary System Card */}
                        <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <img
                                        src="/icons/DiabetesMellitusIcon.svg"
                                        alt="Urinary System"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
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
                                            value={normalizedUrinaryVal}
                                            onChange={() => { }}
                                            disabled={true}
                                            wrap={true}
                                            multiSelect={true}
                                        />
                                    </div>
                                </div>
                                {/* Right: Remarks */}
                                <div className="lg:col-span-3">
                                    <FormTextareaField
                                        label="Remarks / Doctor Notes"
                                        value={urinaryRemarksVal}
                                        readOnly={true}
                                        width="100%"
                                        height={94}
                                        className="!rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. Physical Examination & Disorders */}
                    <div ref={section5Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">5</div>
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Physical Examination & Disorders</h3>
                            </div>
                            <ReadOnlySectionProgress percent={getSection5Percent()} />
                        </div>

                        {/* Balance & Mobility */}
                        <div className="space-y-4">
                            <h4 className="font-inter font-semibold text-sm text-[#434956]">Balance and Mobility</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-y-4 gap-x-6">
                                {/* Sitting */}
                                <div className="flex flex-col gap-6 p-4 border border-[#DFE0E2] rounded-[8px] w-full">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                            <img
                                                src="/icons/sittingIcon.svg"
                                                alt="Sitting"
                                                width={16}
                                                height={16}
                                                className="w-4 h-4 object-contain"
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
                                            value={sittingVal}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>

                                {/* Standing */}
                                <div className="flex flex-col gap-6 p-4 border border-[#DFE0E2] rounded-[8px] w-full">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                            <img
                                                src="/icons/standingIcon.svg"
                                                alt="Standing"
                                                width={16}
                                                height={16}
                                                className="w-4 h-4 object-contain"
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
                                            value={standingVal}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>

                                {/* Walking */}
                                <div className="flex flex-col gap-6 p-4 border border-[#DFE0E2] rounded-[8px] w-full">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                            <img
                                                src="/icons/walkingIcon.svg"
                                                alt="Walking"
                                                width={16}
                                                height={16}
                                                className="w-4 h-4 object-contain"
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
                                            value={walkingVal}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>
                            </div>
                            <FormTextareaField
                                label="Remarks"
                                value={mobilityRemarksVal}
                                readOnly={true}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                            />
                        </div>

                        {/* Pain Assessment */}
                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <h4 className="font-inter font-semibold text-sm text-[#434956]">Pain Assessment</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                                <div className="lg:col-span-5">
                                    <FormInputField
                                        label="Pain Site"
                                        value={painSiteVal}
                                        readOnly={true}
                                        width="100%"
                                    />
                                </div>
                                <div className="lg:col-span-7 space-y-2 pb-1">
                                    <span className="block text-xs font-medium text-[#7B8089]">Pain Scale (0-10)</span>
                                    <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 select-none">
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                            const isSelected = painScaleVal !== null && painScaleVal !== undefined && Number(painScaleVal) === num;
                                            return (
                                                <button
                                                    key={num}
                                                    type="button"
                                                    disabled={true}
                                                    className={`w-8 h-8 text-xs rounded-full font-bold flex items-center justify-center shrink-0 transition-all duration-150 cursor-not-allowed ${isSelected
                                                        ? "bg-[#0B8C00] text-white pain-scale-selected"
                                                        : "bg-[#F1F1F1] text-[#434956] pain-scale-unselected"
                                                        }`}
                                                >
                                                    {num}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Pain Silhouette Overlay Visualizer */}
                            <div className="bg-[#FAFAFA] rounded-2xl p-5 space-y-4 print:break-inside-avoid">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                                    <div className="lg:col-span-8 flex flex-row flex-wrap sm:flex-nowrap gap-2 items-start select-none">
                                        {/* Front View */}
                                        <div className="rounded-2xl p-1 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-[#7B8089] mb-1.5">Front</span>
                                            <div className="relative w-[168px] h-[280px] rounded-lg bg-white flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={isFemalePatient ? "/icons/femaleBodyFrontView.svg" : "/icons/maleBodyFrontView.svg"}
                                                    alt="Front View"
                                                    className="w-full h-full object-contain p-0 select-none pointer-events-none"
                                                />
                                                {markers.filter(m => m.view === "front").map((marker, idx) => (
                                                    <div
                                                        key={marker.id || idx}
                                                        className={`absolute w-3.5 h-3.5 rounded-full border border-white ring-2 ring-black/10 -translate-x-1/2 -translate-y-1/2 cursor-default ${marker.type === "pain" ? "bg-[#EF4444]" : marker.type === "swelling" ? "bg-[#F59E0B]" : "bg-[#3B82F6]"}`}
                                                        style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Back View */}
                                        <div className="rounded-2xl p-1 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-[#7B8089] mb-1.5">Back</span>
                                            <div className="relative w-[168px] h-[280px] rounded-lg bg-white flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={isFemalePatient ? "/icons/femaleBodyBackView.svg" : "/icons/maleBodyBackView.svg"}
                                                    alt="Back View"
                                                    className="w-full h-full object-contain p-0 select-none pointer-events-none"
                                                />
                                                {markers.filter(m => m.view === "back").map((marker, idx) => (
                                                    <div
                                                        key={marker.id || idx}
                                                        className={`absolute w-3.5 h-3.5 rounded-full border border-white ring-2 ring-black/10 -translate-x-1/2 -translate-y-1/2 cursor-default ${marker.type === "pain" ? "bg-[#EF4444]" : marker.type === "swelling" ? "bg-[#F59E0B]" : "bg-[#3B82F6]"}`}
                                                        style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Legend */}
                                        <div className="flex flex-col gap-4 flex-1 min-w-[150px] justify-between self-stretch py-1 pl-2">
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
                                        </div>
                                    </div>

                                    {/* Location Notes */}
                                    <div className="lg:col-span-4 flex flex-col justify-stretch h-full self-stretch print:break-inside-avoid">
                                        <FormTextareaField
                                            label="Pain Location Notes"
                                            value={painNotesVal}
                                            readOnly={true}
                                            width="100%"
                                            height={280}
                                            className="!rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ashta Vidha Pariksha */}
                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <h4 className="font-inter font-semibold text-sm text-[#434956]">
                                Ashta Vidha Pariksha <span className="text-[#F6776E]">*</span>
                            </h4>
                            <div className="space-y-4">
                                {/* Row 1 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormInputField
                                        label="Tongue (Jihva)"
                                        value={tongueVal}
                                        readOnly={true}
                                        width="100%"
                                    />
                                    <FormInputField
                                        label="Pulse (Nadi)"
                                        value={pulseVal}
                                        readOnly={true}
                                        width="100%"
                                    />
                                    <FormInputField
                                        label="Eyes (Drink)"
                                        value={eyesVal}
                                        readOnly={true}
                                        width="100%"
                                    />
                                </div>
                                {/* Row 2 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormInputField
                                        label="Nails (Nakha)"
                                        value={nailsVal}
                                        readOnly={true}
                                        width="100%"
                                    />

                                    <FormInputField
                                        label="Pitta"
                                        value={pittaVal}
                                        readOnly={true}
                                        width="100%"
                                    />
                                    <FormInputField
                                        label="Kapha"
                                        value={kaphaVal}
                                        readOnly={true}
                                        width="100%"
                                    />
                                </div>
                                {/* Row 3 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <FormTextareaField
                                        label="Dosha-Vata"
                                        value={vataVal}
                                        readOnly={true}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                    />
                                    <FormTextareaField
                                        label="Overall Prakriti *"
                                        value={prakritiVal}
                                        readOnly={true}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                    />
                                </div>
                            </div>
                            {/* <FormTextareaField
                            label="Remarks"
                            value={avpRemarksVal}
                            readOnly={true}
                            width="100%"
                            height={80}
                            className="!rounded-xl"
                        /> */}
                        </div>
                    </div>

                    {/* 6. Investigations & Radiology */}
                    <div ref={section6Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">6</div>
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Investigations & Radiology</h3>
                            </div>
                            <ReadOnlySectionProgress percent={getSection6Percent()} />
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Radiology Findings Card */}
                            <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 print:break-inside-avoid">
                                {/* Header */}
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <img
                                            src="/icons/LabIcon.svg"
                                            alt="Radiology Findings"
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
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
                                                options={[
                                                    { value: "X-Ray", label: "X-Ray" },
                                                    { value: "MRI", label: "MRI" },
                                                    { value: "Ultrasound", label: "Ultrasound" },
                                                    { value: "None", label: "None" }
                                                ]}
                                                multiSelect={true}
                                                value={normalizedRadiologyVal}
                                                onChange={() => { }}
                                                disabled={true}
                                            />
                                        </div>
                                    </div>
                                    {/* Right: Remarks */}
                                    <div className="lg:col-span-7">
                                        <FormTextareaField
                                            label="Radiology Remarks"
                                            value={radiologyRemarksVal}
                                            readOnly={true}
                                            width="100%"
                                            height={80}
                                            className="!rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Lab Tests Card */}
                            <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 print:break-inside-avoid">
                                {/* Header */}
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <img
                                            src="/icons/LabIcon.svg"
                                            alt="Lab Tests"
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
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
                                                value={normalizedPathologyVal}
                                                onChange={() => { }}
                                                disabled={true}
                                            />
                                        </div>
                                    </div>
                                    {/* Right: Remarks */}
                                    <div className="lg:col-span-7">
                                        <FormTextareaField
                                            label="Lab Tests Prescribed By Doctor"
                                            value={prescribedLabTestsVal}
                                            readOnly={true}
                                            width="100%"
                                            height={80}
                                            className="!rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row: Provisional & Final Diagnosis */}
                            <div className="w-full print:break-inside-avoid print:mt-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                                    <FormTextareaField
                                        label="Provisional Diagnosis"
                                        value={provisionalVal}
                                        readOnly={true}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                    />
                                    <FormTextareaField
                                        label="Final Diagnosis *"
                                        value={finalVal}
                                        readOnly={true}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 7. Treatment Plan & Education */}
                    <div ref={section7Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">7</div>
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Treatment Plan & Education</h3>
                            </div>
                            <ReadOnlySectionProgress percent={getSection7Percent()} />
                        </div>

                        <div className="flex flex-col gap-6">
                            <FormTextareaField
                                label="Patient Education"
                                value={patientEdVal}
                                readOnly={true}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                            />

                            {/* Medicine Prescribed Card */}
                            <div className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden flex flex-col print-med-table">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-[#E3EEE1] flex items-center justify-between w-full">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                            <img
                                                src="/icons/DoctorBagIcon.svg"
                                                alt="Medicine Prescribed"
                                                width={16}
                                                height={16}
                                                className="w-4 h-4 object-contain"
                                            />
                                        </div>
                                        <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                            Medicine Prescribed
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    {/* Responsive Row Grid Layout */}
                                    <div className="border border-[#DFE0E2] rounded-[8px] bg-white w-full overflow-hidden divide-y divide-[#DFE0E2]">
                                        {/* Header Row */}
                                        <div className="hidden md:flex print:flex gap-4 px-4 py-3 text-xs font-semibold text-[#7B8089] items-center border-b border-[#DFE0E2]">
                                            <div className="grid grid-cols-12 gap-3 flex-1 w-full">
                                                <div className="col-span-3">Name</div>
                                                <div className="col-span-2">Dosage</div>
                                                <div className="col-span-2">Frequency</div>
                                                <div className="col-span-2">Duration</div>
                                                <div className="col-span-3">Time</div>
                                            </div>
                                        </div>

                                        {/* Rows */}
                                        {prescribedMeds.length > 0 ? (
                                            prescribedMeds.map((med: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="flex flex-col gap-4 p-4 w-full"
                                                >
                                                    {/* Dropdowns row (Screen mode) */}
                                                    <div className="flex gap-4 items-center w-full print:hidden">
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1">
                                                            {/* Name */}
                                                            <div className="md:col-span-3">
                                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Name</span>
                                                                <Tooltip content={med.medicineName} disabled={!med.medicineName}>
                                                                    <div className="w-full">
                                                                        <FormSelectField
                                                                            label="Name"
                                                                            options={getOptionsWithFallback(med.medicineName, MEDICINE_OPTIONS)}
                                                                            value={med.medicineName}
                                                                            disabled={true}
                                                                            hideLabel={true}
                                                                            width="100%"
                                                                        />
                                                                    </div>
                                                                </Tooltip>
                                                            </div>

                                                            {/* Dosage */}
                                                            <div className="md:col-span-2 max-w-[155px] w-full">
                                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Dosage</span>
                                                                <Tooltip content={med.medicineDosage} disabled={!med.medicineDosage}>
                                                                    <div className="w-full">
                                                                        <FormInputSelectGroup
                                                                            hideLabel={true}
                                                                            inputValue={med.dosageAmount}
                                                                            onInputChange={() => { }}
                                                                            selectValue={med.dosageUnit}
                                                                            selectOptions={DOSAGE_UNIT_OPTIONS}
                                                                            onSelectChange={() => { }}
                                                                            disabled={true}
                                                                            background="green"
                                                                        />
                                                                    </div>
                                                                </Tooltip>
                                                            </div>

                                                            {/* Frequency */}
                                                            <div className="md:col-span-2 max-w-[155px] w-full">
                                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Frequency</span>
                                                                <Tooltip content={med.medicineFrequency} disabled={!med.medicineFrequency}>
                                                                    <div className="w-full">
                                                                        <FormSelectField
                                                                            label="Frequency"
                                                                            options={FREQUENCY_OPTIONS}
                                                                            value={med.frequencyValue}
                                                                            disabled={true}
                                                                            hideLabel={true}
                                                                            width="100%"
                                                                        />
                                                                    </div>
                                                                </Tooltip>
                                                            </div>

                                                            {/* Duration */}
                                                            <div className="md:col-span-2 max-w-[155px] w-full">
                                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Duration</span>
                                                                <Tooltip content={med.medicineDuration} disabled={!med.medicineDuration}>
                                                                    <div className="w-full">
                                                                        <FormInputSelectGroup
                                                                            hideLabel={true}
                                                                            inputValue={med.durationAmount}
                                                                            onInputChange={() => { }}
                                                                            selectValue={med.durationUnit}
                                                                            selectOptions={DURATION_UNIT_OPTIONS}
                                                                            onSelectChange={() => { }}
                                                                            disabled={true}
                                                                            background="green"
                                                                        />
                                                                    </div>
                                                                </Tooltip>
                                                            </div>

                                                            {/* Timing */}
                                                            <div className="md:col-span-3">
                                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Time</span>
                                                                <Tooltip content={med.medicineTiming} disabled={!med.medicineTiming}>
                                                                    <div className="w-full">
                                                                        <FormSelectField
                                                                            label="Timing"
                                                                            options={TIME_OPTIONS}
                                                                            value={med.timingValue}
                                                                            disabled={true}
                                                                            hideLabel={true}
                                                                            width="100%"
                                                                        />
                                                                    </div>
                                                                </Tooltip>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Print-only clean plain text row */}
                                                    <div className="hidden print:grid grid-cols-12 gap-3 px-1 py-1 text-xs font-semibold text-[#262D3B] items-center w-full">
                                                        <div className="col-span-3 font-semibold text-[#262D3B] break-words">{med.medicineName || "N/A"}</div>
                                                        <div className="col-span-2 break-words">{med.medicineDosage || "N/A"}</div>
                                                        <div className="col-span-2 break-words">{med.medicineFrequency || "N/A"}</div>
                                                        <div className="col-span-2 break-words">{med.medicineDuration || "N/A"}</div>
                                                        <div className="col-span-3 break-words">{med.medicineTiming || "N/A"}</div>
                                                    </div>

                                                    {/* Remarks row */}
                                                    <div className="flex gap-4 items-center w-full">
                                                        <div className="flex-1">
                                                            <FormTextareaField
                                                                label="Remarks"
                                                                placeholder="Remarks"
                                                                value={med.remarks || ""}
                                                                readOnly={true}
                                                                height={60}
                                                                className="!rounded-xl"
                                                                highlightBlack={true}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-xs font-semibold text-[#7B8089]">
                                                No medicines prescribed.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-[10px]">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <img
                                        src="/icons/DoctorBagIcon.svg"
                                        alt="Medicine Prescribed"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Dietary Advice                            </span>
                            </div>
                            <div className="space-y-4">
                                <div className="w-full">
                                    <FormTextareaField
                                        label="Diet Advice *"
                                        value={dietVal}
                                        readOnly={true}
                                        width="100%"
                                        height={80}
                                        className="!rounded-xl"
                                        highlightBlack={true}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormInputField
                                        label="Lifestyle Changes"
                                        value={lifestyleVal}
                                        readOnly={true}
                                        width="100%"
                                    />
                                    <FormInputField
                                        label="Yoga / Pranayama"
                                        value={yogaVal}
                                        readOnly={true}
                                        width="100%"
                                    />
                                </div>
                            </div>

                            {/* <FormTextareaField
                            label="Treatment Notes"
                            value={treatmentNotesVal}
                            readOnly={true}
                            width="100%"
                            height={80}
                            className="!rounded-xl"
                        /> */}
                            {/* Patient Referred To */}
                            <div className="flex flex-col gap-3 print:break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                        <img
                                            src="/icons/DoctorBagIcon.svg"
                                            alt="Medicine Prescribed"
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
                                        />
                                    </div>
                                    <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                        Patient Referred To <span className="text-[#F6776E]">*</span>
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                    <div className="w-[480px]">
                                        <Tabs
                                            className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                            options={[
                                                { value: "Follow Ups", label: "Follow Ups" },
                                                { value: "IPD Admission", label: "IPD Admission" },
                                                { value: "Day Care Admission", label: "Day Care Admission" },
                                            ]}
                                            value={
                                                data?.recommendedCareType === "ipd"
                                                    ? "IPD Admission"
                                                    : data?.recommendedCareType === "day_care"
                                                        ? "Day Care Admission"
                                                        : "Follow Ups"
                                            }
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Infectious Disease Card */}
                            {/* <div className="flex items-center gap-[10px]">
                            <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/DoctorBagIcon.svg"
                                    alt="Medicine Prescribed"
                                    width={16}
                                    height={16}
                                />
                            </div>
                            <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                Infectious Disease <span className="text-[#F6776E]"></span>                 </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
                            <div className="w-[450px]">
                                <Tabs
                                    className="scrollbar-hide [&_button]:text-xs [&_button]:px-2.5"
                                    options={[
                                        { value: "hiv", label: "HIV" },
                                        { value: "hepatitis", label: "Hepatitis" },
                                        { value: "tb", label: "TB" },
                                        { value: "normal", label: "Normal" }
                                    ]}
                                    value={infectiousAlertVal}
                                    multiSelect={true}
                                    onChange={() => { }}
                                    disabled={true}
                                />
                            </div>
                        </div> */}

                            {/* Therapies Prescribed */}
                            <div className="flex items-center gap-[10px] mt-2">
                                <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                    <img
                                        src="/icons/therapies.svg"
                                        alt="Therapies"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 object-contain"
                                    />
                                </div>
                                <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                    Therapies Prescribed
                                </span>
                            </div>
                            <div className="border border-[#EBECED] rounded-[16px] overflow-hidden bg-[#FAFAFA]">
                                <div className="flex flex-col w-full divide-y divide-[#EBECED]">
                                    {/* Header */}
                                    <div className="hidden md:block bg-[#F2F8F2] px-4 py-3 border-b border-[#EBECED]">
                                        <div className="grid grid-cols-12 gap-3 font-inter font-semibold text-xs text-[#262D3B]">
                                            <div className="col-span-5">Therapy Name</div>
                                            <div className="col-span-3">Category</div>
                                            <div className="col-span-2">Days</div>
                                            <div className="col-span-2">Sessions/Day</div>
                                        </div>
                                    </div>

                                    {/* Rows */}
                                    {data?.patientTherapyPres && data.patientTherapyPres.length > 0 ? (
                                        data.patientTherapyPres.map((therapy: any, idx: number) => {
                                            let cat = therapy.category || "";
                                            if (cat.toLowerCase() === "panchkarma") cat = "Panchakarma";
                                            else if (cat.toLowerCase() === "naturopathy") cat = "Naturopathy";
                                            else if (cat) cat = cat.charAt(0).toUpperCase() + cat.slice(1);

                                            return (
                                                <div key={idx} className="flex flex-col gap-2 md:grid md:grid-cols-12 md:gap-3 px-4 py-3 items-center w-full bg-white text-sm font-medium text-[#262D3B]">
                                                    <div className="col-span-5 w-full flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-[#E9F3E6] flex items-center justify-center shrink-0">
                                                            <Image src="/icons/therapies.svg" alt="Therapy" width={14} height={14} />
                                                        </div>
                                                        <span className="font-semibold text-[#262D3B] truncate">{therapy.therapyName}</span>
                                                    </div>
                                                    <div className="col-span-3 w-full">
                                                        <span className="md:hidden inline-block text-xs font-semibold text-[#7B8089] mr-1">Category:</span>
                                                        <span className="text-[#0B8C00] font-semibold">{cat || "N/A"}</span>
                                                    </div>
                                                    <div className="col-span-2 w-full">
                                                        <span className="md:hidden inline-block text-xs font-semibold text-[#7B8089] mr-1">Days:</span>
                                                        <span>{therapy?.therapyDays ? `${therapy?.therapyDays} Days` : "N/A"}</span>
                                                    </div>
                                                    <div className="col-span-2 w-full">
                                                        <span className="md:hidden inline-block text-xs font-semibold text-[#7B8089] mr-1">Sessions/Day:</span>
                                                        <span>{therapy?.therapySessions ? `${therapy?.therapySessions} Sessions/Day` : "N/A"}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-4 text-center text-xs font-semibold text-[#7B8089]">
                                            No therapies prescribed.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 8. Progress Monitoring */}
                    {showProgressMonitoring && (
                        <div ref={section8Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4 mb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">8</div>
                                    <h3 className="font-inter font-semibold text-base text-[#262D3B]">Progress Monitoring (Revisit)</h3>
                                </div>
                                <ReadOnlySectionProgress percent={getSection8Percent()} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Progress Status Card */}
                                <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 bg-white">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                            <img
                                                src="/icons/DoctorBagIcon.svg"
                                                alt="Progress Status"
                                                width={16}
                                                height={16}
                                                className="w-4 h-4 object-contain"
                                            />
                                        </div>
                                        <span className="font-inter font-semibold text-[#262D3B] text-sm">
                                            Progress Status <span className="text-[#F6776E]">*</span>
                                        </span>
                                    </div>
                                    <Tabs
                                        className="scrollbar-hide [&_button]:text-[11px] [&_button]:px-1.5"
                                        options={[
                                            { value: "better", label: "Better" },
                                            { value: "same", label: "Same" },
                                            { value: "worse", label: "Worse" },
                                            { value: "new symptoms", label: "New Symptoms" }
                                        ]}
                                        value={normalizedProgressVal}
                                        onChange={() => { }}
                                        disabled={true}
                                    />
                                </div>

                                {/* Medicine Adherence Card */}
                                <div className="border border-[#EBECED] rounded-[16px] p-6 flex flex-col gap-4 bg-white">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-8 h-8 rounded-full bg-[#EAF7E8] flex items-center justify-center shrink-0">
                                            <img
                                                src="/icons/DoctorBagIcon.svg"
                                                alt="Medicine Adherence"
                                                width={16}
                                                height={16}
                                                className="w-4 h-4 object-contain"
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
                                        value={medicineAdherenceVal}
                                        onChange={() => { }}
                                        disabled={true}
                                    />
                                </div>
                            </div>

                            {/* Symptom Recovery Display */}
                            <div className="space-y-4 pt-2">
                                <h4 className="font-inter font-semibold text-sm text-[#434956]">Symptom Recovery %</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                    <SymptomRecoverySlider label="Pain" value={painRecoveryVal} />
                                    <SymptomRecoverySlider label="Digestion" value={digestionRecoveryVal} />
                                    <SymptomRecoverySlider label="Energy" value={energyRecoveryVal} />
                                    <SymptomRecoverySlider label="Sleep" value={sleepRecoveryVal} />
                                </div>
                            </div>

                            <FormTextareaField
                                label="Clinical Remarks *"
                                value={clinicalRemarksVal}
                                readOnly={true}
                                width="100%"
                                height={80}
                                className="!rounded-xl"
                            />
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
