"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    FormInputField,
    FormSelectField,
    FormTextareaField,
    PatientTypeButtonGroup,
    Slider,
} from "@/components/ui";
import { useGetSpecificAssessmentHistoryDetailOfPatientQuery } from "@/store/api/doctorApi";

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

const DOSAGE_OPTIONS = [
    { label: "1 tablet", value: "1 tablet" },
    { label: "2 tablets", value: "2 tablets" },
    { label: "5 ml", value: "5 ml" },
    { label: "10 ml", value: "10 ml" },
    { label: "1 tsp", value: "1 tsp" },
];

const FREQUENCY_OPTIONS = [
    { label: "Once daily", value: "Once daily" },
    { label: "Twice daily", value: "Twice daily" },
    { label: "Thrice daily", value: "Thrice daily" },
];

const TIMING_OPTIONS = [
    { label: "Before meal", value: "Before meal" },
    { label: "After meal", value: "After meal" },
    { label: "Empty stomach", value: "Empty stomach" },
];

const DURATION_OPTIONS = [
    { label: "5 Days", value: "5 Days" },
    { label: "10 Days", value: "10 Days" },
    { label: "15 Days", value: "15 Days" },
    { label: "30 Days", value: "30 Days" },
];

// Helper to ensure custom/AI-generated values are available as selected options in dropdowns
const getOptionsWithFallback = (value: string | undefined | null, defaultOptions: { label: string; value: string }[]) => {
    if (!value) return defaultOptions;
    const exists = defaultOptions.some(opt => opt.value.toLowerCase() === value.toLowerCase());
    if (exists) return defaultOptions;
    return [...defaultOptions, { label: value, value: value }];
};

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
        const commonFields = [
            sh?.mentalHealth?.stressLevel && String(sh.mentalHealth.stressLevel).trim() !== "",
            sh?.systemicNotes?.gastro?.symptoms && sh.systemicNotes.gastro.symptoms.length > 0,
            sh?.systemicNotes?.respiratory?.symptoms && sh.systemicNotes.respiratory.symptoms.length > 0,
            sh?.systemicNotes?.cardiac?.symptoms && sh.systemicNotes.cardiac.symptoms.length > 0,
            sh?.systemicNotes?.nervous?.symptoms && sh.systemicNotes.nervous.symptoms.length > 0,
            sh?.systemicNotes?.urinary?.symptoms && sh.systemicNotes.urinary.symptoms.length > 0,
        ];
        const genderVal = data.metadata?.gender || "male";
        const isFemale = String(genderVal).toLowerCase() === "female" || !!sh?.gynaecHistory;
        const femaleFields = isFemale && sh?.gynaecHistory ? [
            sh.gynaecHistory.cycle && String(sh.gynaecHistory.cycle).trim() !== "",
            sh.gynaecHistory.flow && String(sh.gynaecHistory.flow).trim() !== "",
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
        const fields = [
            tp?.diet && String(tp.diet).trim() !== "",
            tp?.lifestyle && String(tp.lifestyle).trim() !== "",
            tp?.yogaPranayama && String(tp.yogaPranayama).trim() !== "",
            tp?.patientEducation && String(tp.patientEducation).trim() !== "",
            tp?.prescribedMedicines && tp.prescribedMedicines.length > 0,
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
        return Math.round(
            (getSection1Percent() +
                getSection2Percent() +
                getSection3Percent() +
                getSection4Percent() +
                getSection5Percent() +
                getSection6Percent() +
                getSection7Percent() +
                getSection8Percent()) /
            8
        );
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
    const medRemarksVal = data.medications?.doctorNotes || "";
    const surgeryVal = data.medications?.surgeryHistory || "";

    // Step 3
    const diabetesVal = String(data.systemicReview?.diabetes?.status || "").toLowerCase();
    const diabeticYearsVal = data.systemicReview?.diabetes?.yearsIfDiabetic ? String(data.systemicReview.diabetes.yearsIfDiabetic) : "";
    const diabetesNotesVal = data.systemicReview?.diabetes?.notes || "";
    
    const rawBP = String(data.systemicReview?.bloodPressure?.status || "").toLowerCase();
    const bpVal = rawBP.includes("high") ? "high bp" : rawBP.includes("low") ? "low bp" : rawBP === "no" || rawBP === "false" ? "no" : rawBP;
    const bpRemarksVal = data.systemicReview?.bloodPressure?.remarks || "";

    const rawThyroid = String(data.systemicReview?.thyroid?.status || "").toLowerCase();
    const thyroidVal = rawThyroid.includes("hypo") ? "hypothyroid" : rawThyroid.includes("hyper") ? "hyperthyroid" : rawThyroid === "no" || rawThyroid === "false" ? "no" : rawThyroid;
    const thyroidRemarksVal = data.systemicReview?.thyroid?.remarks || "";

    const allergyHistoryTypes = data.systemicReview?.allergy?.types || [];
    const rawAllergy = allergyHistoryTypes.length > 0 ? String(allergyHistoryTypes[0]?.type || allergyHistoryTypes[0] || "").toLowerCase() : "no";
    const allergyVal = ["food", "drug", "skin"].includes(rawAllergy) ? rawAllergy : "no";
    const allergyDetailsVal = data.systemicReview?.allergy?.details || "";

    // Step 4
    const cycleVal = String(data.specializedHistory?.gynaecHistory?.cycle || "").toLowerCase();
    const flowVal = String(data.specializedHistory?.gynaecHistory?.flow || "").toLowerCase();
    const gynaecPainVal = data.specializedHistory?.gynaecHistory?.pain || "";
    const dischargeVal = data.specializedHistory?.gynaecHistory?.discharge || "";
    const pregnancyVal = data.specializedHistory?.gynaecHistory?.pregnancy || "";
    const miscarriageVal = data.specializedHistory?.gynaecHistory?.miscarriage || "";

    const anxietyVal = data.specializedHistory?.mentalHealth?.anxietyDetails || "None";
    const depressionVal = data.specializedHistory?.mentalHealth?.depressionDetails || "None";
    const sleepVal = data.specializedHistory?.mentalHealth?.sleepDetails || "Good";
    const stressVal = String(data.specializedHistory?.mentalHealth?.stressLevel || "none").toLowerCase();
    const mentalRemarksVal = data.specializedHistory?.mentalHealth?.doctorNotes || "";

    const gastricVal = String(data.specializedHistory?.systemicNotes?.gastro?.symptoms?.[0] || "None").toLowerCase();
    const gastricRemarksVal = data.specializedHistory?.systemicNotes?.gastro?.remarks || "";

    const respiratoryVal = String(data.specializedHistory?.systemicNotes?.respiratory?.symptoms?.[0] || "None").toLowerCase();
    const respiratoryRemarksVal = data.specializedHistory?.systemicNotes?.respiratory?.remarks || "";

    const cardiacVal = String(data.specializedHistory?.systemicNotes?.cardiac?.symptoms?.[0] || "Nil").toLowerCase();
    const cardiacRemarksVal = data.specializedHistory?.systemicNotes?.cardiac?.remarks || "";

    const nervousVal = String(data.specializedHistory?.systemicNotes?.nervous?.symptoms?.[0] || "Nil").toLowerCase();
    const nervousRemarksVal = data.specializedHistory?.systemicNotes?.nervous?.remarks || "";

    const urinaryVal = String(data.specializedHistory?.systemicNotes?.urinary?.symptoms?.[0] || "Others").toLowerCase();
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
    const radiologyVal = String(data.investigations?.radiology?.findings?.[0] || "Nil").toLowerCase();
    const radiologyRemarksVal = data.investigations?.radiology?.remarks || "";
    const pathologyVal = String(data.investigations?.laboratory?.tests?.[0] || "Nil").toLowerCase();
    const prescribedLabTestsVal = data.investigations?.laboratory?.testsPrescribed || "";
    const provisionalVal = data.investigations?.diagnosis?.provisional || "";
    const finalVal = data.investigations?.diagnosis?.final || "";

    // Step 7
    const patientEdVal = data.treatmentPlan?.patientEducation || "";
    const prescribedMeds = data.treatmentPlan?.prescribedMedicines || [];
    const dietVal = data.treatmentPlan?.diet || "";
    const lifestyleVal = data.treatmentPlan?.lifestyle || "";
    const yogaVal = data.treatmentPlan?.yogaPranayama || "";
    const treatmentNotesVal = data.treatmentPlan?.treatmentNotes || "";

    // Step 8
    const progressVal = String(data.progressMonitoring?.comparisonWithPreviousVisit || "").toLowerCase();
    const medicineAdherenceVal = currentMedsVal === "yes" ? "regular" : currentMedsVal === "no" ? "irregular" : "";
    const painRecoveryVal = painScaleVal ? Math.max(0, 100 - (painScaleVal * 10)) : 50;
    const digestionRecoveryVal = 50;
    const energyRecoveryVal = 50;
    const sleepRecoveryVal = data.specializedHistory?.mentalHealth?.symptoms?.includes("Sleep Issues") ? 30 : 70;
    const clinicalRemarksVal = data.progressMonitoring?.progressNotes || "";

    return (
        <Dialog open={true} onClose={onClose} title="IAF Form" width={1200} height="90vh" contentPadding="px-6 pb-6 pt-4">
            {/* Header / Completion Progress Board */}
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-4 mb-6 select-none">
                <div className="flex items-center justify-between">
                    <h3 className="font-inter font-bold text-sm text-[#262D3B]">Form Completion Status</h3>
                    <div className="flex items-center gap-2">
                        <span className="font-inter font-bold text-lg" style={{ color: getProgressColorAndLabel(overallPercent).color }}>
                            {overallPercent}%
                        </span>
                        <span className="text-xs font-semibold text-[#7B8089]">
                            {[
                                getSection1Percent(),
                                getSection2Percent(),
                                getSection3Percent(),
                                getSection4Percent(),
                                getSection5Percent(),
                                getSection6Percent(),
                                getSection7Percent(),
                                getSection8Percent()
                            ].filter(p => p === 100).length} of 8 sections complete
                        </span>
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
                            width: `calc(${(activeTimelineStep - 1) / 7} * 87.5%)`
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
                            { step: 8, label: "Progress", ref: section8Ref },
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
            <div className="flex flex-col gap-6 w-full custom-scroll overflow-y-auto pr-1">

                {/* 1. Patient Presentation */}
                <div ref={section1Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                    <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">1</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Patient Presentation</h3>
                        </div>
                        <ReadOnlySectionProgress percent={getSection1Percent()} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormInputField
                            label="Chief Complaint *"
                            value={chiefComplaintVal}
                            disabled={true}
                            width="100%"
                        />
                        <FormInputField
                            label="Symptoms *"
                            value={symptomsVal}
                            disabled={true}
                            width="100%"
                        />
                        <FormInputField
                            label="History of Present Illness (HPI)"
                            value={hpiVal}
                            disabled={true}
                            width="100%"
                        />
                        <FormSelectField
                            label="Gender *"
                            options={getOptionsWithFallback(genderVal, GENDER_OPTIONS)}
                            value={genderVal}
                            disabled={true}
                            background="white"
                            width="100%"
                        />
                        <FormInputField
                            label="Social History"
                            value={socialVal}
                            disabled={true}
                            width="100%"
                        />
                        <FormInputField
                            label="Past Medical History"
                            value={pastMedVal}
                            disabled={true}
                            width="100%"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <FormInputField
                            label="Family History"
                            value={familyVal}
                            disabled={true}
                            width="100%"
                        />
                    </div>
                </div>

                {/* 2. Medications & Supplements */}
                <div ref={section2Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                    <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">2</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Medications & Supplements</h3>
                        </div>
                        <ReadOnlySectionProgress percent={getSection2Percent()} />
                    </div>

                    <div className="w-full md:w-[350px]">
                        <PatientTypeButtonGroup
                            options={["Yes", "No"]}
                            value={currentMedsVal}
                            onChange={() => {}}
                            label="Current Medications"
                            required={true}
                            disabled={true}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInputField
                            label="Remarks / Doctor Notes"
                            value={medRemarksVal}
                            disabled={true}
                            width="100%"
                        />
                        <FormInputField
                            label="Surgery History"
                            value={surgeryVal}
                            disabled={true}
                            width="100%"
                        />
                    </div>
                </div>

                {/* 3. Systemic Review & Co-morbidities */}
                <div ref={section3Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                    <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">3</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Systemic Review & Co-morbidities</h3>
                        </div>
                        <ReadOnlySectionProgress percent={getSection3Percent()} />
                    </div>

                    <div className="space-y-4">
                        {/* Diabetes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PatientTypeButtonGroup
                                options={["Yes", "No"]}
                                value={diabetesVal}
                                onChange={() => {}}
                                label="Diabetes Mellitus *"
                                required={true}
                                disabled={true}
                            />
                            <FormInputField
                                label="Years (if Diabetic)"
                                value={diabeticYearsVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>
                        <FormInputField
                            label="Diabetes Notes"
                            value={diabetesNotesVal}
                            disabled={true}
                            width="100%"
                        />

                        {/* BP */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-50">
                            <PatientTypeButtonGroup
                                options={["High BP", "Low BP", "No"]}
                                value={bpVal}
                                onChange={() => {}}
                                label="Blood Pressure *"
                                required={true}
                                disabled={true}
                            />
                            <FormInputField
                                label="Remarks"
                                value={bpRemarksVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>

                        {/* Thyroid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-50">
                            <PatientTypeButtonGroup
                                options={["Hypothyroid", "Hyperthyroid", "No"]}
                                value={thyroidVal}
                                onChange={() => {}}
                                label="Thyroid Disorder *"
                                required={true}
                                disabled={true}
                            />
                            <FormInputField
                                label="Remarks"
                                value={thyroidRemarksVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>

                        {/* Allergy */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-50">
                            <PatientTypeButtonGroup
                                options={["Food", "Drug", "Skin", "No"]}
                                value={allergyVal}
                                onChange={() => {}}
                                label="Allergy History *"
                                required={true}
                                disabled={true}
                            />
                            <FormInputField
                                label="Allergy Details"
                                value={allergyDetailsVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Specialized History */}
                <div ref={section4Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                    <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">4</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Specialized History</h3>
                        </div>
                        <ReadOnlySectionProgress percent={getSection4Percent()} />
                    </div>

                    {isFemalePatient && (
                        <div className="space-y-4 pb-4 border-b border-gray-100">
                            <h4 className="font-inter font-semibold text-sm text-[#434956]">Gynaec / Obs History</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <PatientTypeButtonGroup
                                    options={["Regular", "Irregular"]}
                                    value={cycleVal}
                                    onChange={() => {}}
                                    label="Cycle"
                                    disabled={true}
                                />
                                <PatientTypeButtonGroup
                                    options={["Normal", "Heavy", "Scanty"]}
                                    value={flowVal}
                                    onChange={() => {}}
                                    label="Flow"
                                    disabled={true}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInputField
                                    label="Pain"
                                    value={gynaecPainVal}
                                    disabled={true}
                                    width="100%"
                                />
                                <FormInputField
                                    label="Discharge"
                                    value={dischargeVal}
                                    disabled={true}
                                    width="100%"
                                />
                                <FormInputField
                                    label="Pregnancy"
                                    value={pregnancyVal}
                                    disabled={true}
                                    width="100%"
                                />
                                <FormInputField
                                    label="Miscarriage"
                                    value={miscarriageVal}
                                    disabled={true}
                                    width="100%"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h4 className="font-inter font-semibold text-sm text-[#434956]">Mental & Psychological Health</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormSelectField
                                label="Anxiety"
                                options={getOptionsWithFallback(anxietyVal, SELECT_OPTIONS)}
                                value={anxietyVal}
                                disabled={true}
                                background="white"
                                width="100%"
                            />
                            <FormSelectField
                                label="Depression"
                                options={getOptionsWithFallback(depressionVal, SELECT_OPTIONS)}
                                value={depressionVal}
                                disabled={true}
                                background="white"
                                width="100%"
                            />
                            <FormSelectField
                                label="Sleep Quality"
                                options={getOptionsWithFallback(sleepVal, SLEEP_OPTIONS)}
                                value={sleepVal}
                                disabled={true}
                                background="white"
                                width="100%"
                            />
                            <PatientTypeButtonGroup
                                options={["Mild", "Moderate", "Severe", "None"]}
                                value={stressVal}
                                onChange={() => {}}
                                label="Stress Level *"
                                required={true}
                                disabled={true}
                            />
                        </div>
                        <FormInputField
                            label="Remarks / Doctor Notes"
                            value={mentalRemarksVal}
                            disabled={true}
                            width="100%"
                        />
                    </div>

                    <div className="space-y-6 pt-4 border-t border-gray-150">
                        <h4 className="font-inter font-semibold text-sm text-[#434956]">Systemic Notes</h4>
                        
                        {/* Gastro */}
                        <div className="space-y-3">
                            <PatientTypeButtonGroup
                                options={["Acidity", "GERD", "Gas", "Abd Pain", "Constipation", "Loose Stool", "Nausea", "None"]}
                                value={gastricVal}
                                onChange={() => {}}
                                label="Gastric Complaints *"
                                required={true}
                                disabled={true}
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                value={gastricRemarksVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>

                        {/* Respiratory */}
                        <div className="space-y-3 pt-2">
                            <PatientTypeButtonGroup
                                options={["SOB", "Cough", "Fever", "Asthma", "Wheeze", "TB", "Others", "None"]}
                                value={respiratoryVal}
                                onChange={() => {}}
                                label="Respiratory Issues"
                                disabled={true}
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                value={respiratoryRemarksVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>

                        {/* Cardiac */}
                        <div className="space-y-3 pt-2">
                            <PatientTypeButtonGroup
                                options={["Chest Pain", "Palpitation", "Breathing", "Dizziness", "Nil", "Others"]}
                                value={cardiacVal}
                                onChange={() => {}}
                                label="Cardiac"
                                disabled={true}
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                value={cardiacRemarksVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>

                        {/* Nervous */}
                        <div className="space-y-3 pt-2">
                            <PatientTypeButtonGroup
                                options={["Headache", "Sensory Loss", "Weakness", "Nil", "Others"]}
                                value={nervousVal}
                                onChange={() => {}}
                                label="Nervous System"
                                disabled={true}
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                value={nervousRemarksVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>

                        {/* Urinary */}
                        <div className="space-y-3 pt-2">
                            <PatientTypeButtonGroup
                                options={["Burning", "Frequency", "Blood", "Low Output", "Stones", "Others"]}
                                value={urinaryVal}
                                onChange={() => {}}
                                label="Urinary System"
                                disabled={true}
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                value={urinaryRemarksVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>
                    </div>
                </div>

                {/* 5. Physical Examination & Disorders */}
                <div ref={section5Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                    <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">5</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Physical Examination & Disorders</h3>
                        </div>
                        <ReadOnlySectionProgress percent={getSection5Percent()} />
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-inter font-semibold text-sm text-[#434956]">Balance and Mobility</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <PatientTypeButtonGroup
                                options={["Normal", "Abnormal"]}
                                value={sittingVal}
                                onChange={() => {}}
                                label="Sitting *"
                                required={true}
                                disabled={true}
                            />
                            <PatientTypeButtonGroup
                                options={["Normal", "Abnormal"]}
                                value={standingVal}
                                onChange={() => {}}
                                label="Standing *"
                                required={true}
                                disabled={true}
                            />
                            <PatientTypeButtonGroup
                                options={["Normal", "Abnormal"]}
                                value={walkingVal}
                                onChange={() => {}}
                                label="Walking *"
                                required={true}
                                disabled={true}
                            />
                        </div>
                        <FormInputField
                            label="Remarks"
                            value={mobilityRemarksVal}
                            disabled={true}
                            width="100%"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <h4 className="font-inter font-semibold text-sm text-[#434956]">Pain Assessment</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                            <div className="lg:col-span-5">
                                <FormInputField
                                    label="Pain Site"
                                    value={painSiteVal}
                                    disabled={true}
                                    width="100%"
                                />
                            </div>
                            <div className="lg:col-span-7 space-y-2 pb-1">
                                <span className="block text-xs font-medium text-[#7B8089]">Pain Scale (0-10)</span>
                                <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 select-none">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            disabled={true}
                                            className={`w-8 h-8 text-xs rounded-full font-bold flex items-center justify-center shrink-0 transition-all duration-150 cursor-not-allowed ${painScaleVal === num
                                                ? "bg-[#0B8C00] text-white border-transparent"
                                                : "bg-[#F1F1F1] text-[#434956] border-transparent"
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Pain Silhouette Overlay Visualizer */}
                        <div className="bg-[#FAFAFA] rounded-2xl p-5 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                                <div className="lg:col-span-8 flex flex-row flex-wrap sm:flex-nowrap gap-2 items-start select-none">
                                    {/* Front View */}
                                    <div className="rounded-2xl p-1 flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-[#7B8089] mb-1.5">Front</span>
                                        <div className="relative w-[150px] h-[250px] rounded-lg bg-white flex items-center justify-center overflow-hidden">
                                            <Image
                                                src={isFemalePatient ? "/icons/femaleBodyFrontView.svg" : "/icons/maleBodyFrontView.svg"}
                                                alt="Front View"
                                                fill
                                                className="object-contain p-0"
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
                                        <div className="relative w-[150px] h-[250px] rounded-lg bg-white flex items-center justify-center overflow-hidden">
                                            <Image
                                                src={isFemalePatient ? "/icons/femaleBodyBackView.svg" : "/icons/maleBodyBackView.svg"}
                                                alt="Back View"
                                                fill
                                                className="object-contain p-0"
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
                                <div className="lg:col-span-4 flex flex-col justify-stretch h-full self-stretch">
                                    <FormTextareaField
                                        label="Pain Location Notes"
                                        value={painNotesVal}
                                        disabled={true}
                                        width="100%"
                                        height={280}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <h4 className="font-inter font-semibold text-sm text-[#434956]">Ashta Vidha Pariksha</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormInputField
                                label="Tongue (Jihva)"
                                value={tongueVal}
                                disabled={true}
                                width="100%"
                            />
                            <FormInputField
                                label="Pulse (Nadi)"
                                value={pulseVal}
                                disabled={true}
                                width="100%"
                            />
                            <FormInputField
                                label="Eyes (Drink)"
                                value={eyesVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormInputField
                                label="Nails (Nakha)"
                                value={nailsVal}
                                disabled={true}
                                width="100%"
                            />
                            <FormInputField
                                label="Dosha-Vata"
                                value={vataVal}
                                disabled={true}
                                width="100%"
                            />
                            <FormInputField
                                label="Pitta"
                                value={pittaVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInputField
                                label="Kapha"
                                value={kaphaVal}
                                disabled={true}
                                width="100%"
                            />
                            <FormInputField
                                label="Overall Prakriti *"
                                value={prakritiVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>
                        <FormInputField
                            label="Remarks"
                            value={avpRemarksVal}
                            disabled={true}
                            width="100%"
                        />
                    </div>
                </div>

                {/* 6. Investigations & Radiology */}
                <div ref={section6Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                    <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">6</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Investigations & Radiology</h3>
                        </div>
                        <ReadOnlySectionProgress percent={getSection6Percent()} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PatientTypeButtonGroup
                            options={["X-Ray", "MRI", "Ultrasound", "Nil"]}
                            value={radiologyVal}
                            onChange={() => {}}
                            label="Radiology Findings"
                            disabled={true}
                        />
                        <PatientTypeButtonGroup
                            options={["Blood", "Urine", "Culture", "Nil"]}
                            value={pathologyVal}
                            onChange={() => {}}
                            label="Pathology Findings"
                            disabled={true}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-gray-50">
                        <FormInputField
                            label="Radiology Remarks"
                            value={radiologyRemarksVal}
                            disabled={true}
                            width="100%"
                        />
                        <FormInputField
                            label="Lab Tests Prescribed By Doctor"
                            value={prescribedLabTestsVal}
                            disabled={true}
                            width="100%"
                        />
                        <FormInputField
                            label="Provisional Diagnosis"
                            value={provisionalVal}
                            disabled={true}
                            width="100%"
                        />
                    </div>
                    <FormInputField
                        label="Final Diagnosis *"
                        value={finalVal}
                        disabled={true}
                        width="100%"
                    />
                </div>

                {/* 7. Treatment Plan & Education */}
                <div ref={section7Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4">
                    <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">7</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Treatment Plan & Education</h3>
                        </div>
                        <ReadOnlySectionProgress percent={getSection7Percent()} />
                    </div>

                    <div className="space-y-4">
                        <FormInputField
                            label="Patient Education"
                            value={patientEdVal}
                            disabled={true}
                            width="100%"
                        />

                        {/* Prescribed Medicines cards */}
                        <div className="space-y-4 pt-2">
                            <span className="text-sm font-normal text-gray-500">Medicine Prescribed</span>

                            <div className="space-y-2 pt-1 select-none">
                                {/* Header */}
                                <div className="hidden md:grid grid-cols-10 gap-3 py-3 px-2 border border-[#EBECED] rounded-xl text-xs font-semibold text-[#7B8089] items-center">
                                    <div className="col-span-2 pl-3">Name</div>
                                    <div className="col-span-2">Dosage</div>
                                    <div className="col-span-2">Frequency</div>
                                    <div className="col-span-2">Timing</div>
                                    <div className="col-span-2">Duration</div>
                                </div>

                                {/* Rows */}
                                {prescribedMeds.length > 0 ? (
                                    prescribedMeds.map((med: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-1 md:grid-cols-10 gap-2 items-center bg-[#FAFAFA] md:bg-transparent p-0 md:py-0.5 md:px-0 rounded-xl border border-gray-100 md:border-none"
                                        >
                                            <div className="col-span-1 md:col-span-2">
                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Name</span>
                                                <FormSelectField
                                                    label="Name"
                                                    options={getOptionsWithFallback(med.medicineName, MEDICINE_OPTIONS)}
                                                    value={med.medicineName}
                                                    disabled={true}
                                                    hideLabel={true}
                                                    width="100%"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Dosage</span>
                                                <FormSelectField
                                                    label="Dosage"
                                                    options={getOptionsWithFallback(med.medicineDosage, DOSAGE_OPTIONS)}
                                                    value={med.medicineDosage}
                                                    disabled={true}
                                                    hideLabel={true}
                                                    width="100%"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Frequency</span>
                                                <FormSelectField
                                                    label="Frequency"
                                                    options={getOptionsWithFallback(med.medicineFrequency, FREQUENCY_OPTIONS)}
                                                    value={med.medicineFrequency}
                                                    disabled={true}
                                                    hideLabel={true}
                                                    width="100%"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Timing</span>
                                                <FormSelectField
                                                    label="Timing"
                                                    options={getOptionsWithFallback(med.medicineTiming, TIMING_OPTIONS)}
                                                    value={med.medicineTiming}
                                                    disabled={true}
                                                    hideLabel={true}
                                                    width="100%"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Duration</span>
                                                <FormSelectField
                                                    label="Duration"
                                                    options={getOptionsWithFallback(med.medicineDuration, DURATION_OPTIONS)}
                                                    value={med.medicineDuration}
                                                    disabled={true}
                                                    hideLabel={true}
                                                    width="100%"
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center text-xs font-semibold text-[#7B8089]">
                                        No medicines prescribed.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-50">
                            <FormInputField
                                label="Diet Advice *"
                                value={dietVal}
                                disabled={true}
                                width="100%"
                            />
                            <FormInputField
                                label="Lifestyle Changes"
                                value={lifestyleVal}
                                disabled={true}
                                width="100%"
                            />
                            <FormInputField
                                label="Yoga / Pranayama"
                                value={yogaVal}
                                disabled={true}
                                width="100%"
                            />
                        </div>
                        <FormInputField
                            label="Treatment Notes"
                            value={treatmentNotesVal}
                            disabled={true}
                            width="100%"
                        />
                    </div>
                </div>

                {/* 8. Progress Monitoring */}
                <div ref={section8Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-4 mb-2">
                    <div className="flex items-center justify-between border-b border-[#E3EEE1] pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">8</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Progress Monitoring (Visit {data.progressMonitoring?.visitNumber ?? 1})</h3>
                        </div>
                        <ReadOnlySectionProgress percent={getSection8Percent()} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PatientTypeButtonGroup
                            options={["Better", "Same", "Worse", "New Symptoms"]}
                            value={progressVal}
                            onChange={() => {}}
                            label="Progress Status *"
                            required={true}
                            disabled={true}
                        />
                        <PatientTypeButtonGroup
                            options={["Regular", "Irregular", "Side Effects"]}
                            value={medicineAdherenceVal}
                            onChange={() => {}}
                            label="Medicine Adherence *"
                            required={true}
                            disabled={true}
                        />
                    </div>

                    {/* Symptom Recovery Display */}
                    <div className="space-y-4 pt-2">
                        <h4 className="font-inter font-semibold text-sm text-[#434956]">Symptom Recovery %</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 select-none">
                            <Slider label="Pain" value={painRecoveryVal} onChange={() => {}} disabled={true} />
                            <Slider label="Digestion" value={digestionRecoveryVal} onChange={() => {}} disabled={true} />
                            <Slider label="Energy" value={energyRecoveryVal} onChange={() => {}} disabled={true} />
                            <Slider label="Sleep" value={sleepRecoveryVal} onChange={() => {}} disabled={true} />
                        </div>
                    </div>

                    <FormInputField
                        label="Clinical Remarks *"
                        value={clinicalRemarksVal}
                        disabled={true}
                        width="100%"
                    />
                </div>
            </div>
        </Dialog>
    );
}
