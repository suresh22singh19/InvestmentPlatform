"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Image from "next/image";
import { FormInputField } from "./FormInputField";
import { FormSelectField } from "./FormSelectField";
import { FormTextareaField } from "./FormTextareaField";
import { PatientTypeButtonGroup } from "./PatientTypeButtonGroup";
import { Button } from "./Button";
import { DatePicker } from "./DatePicker";
import { Slider } from "./Slider";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { MessageDialog } from "./MessageDialog";
import { Dialog } from "./Dialog";
import { useCreateOpdAssessmentMutation } from "@/store/api/doctorApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserId } from "@/store/slices/authSlice";

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
    allergy: "food" | "drug" | "skin" | "no" | "";
    setAllergy: (val: "food" | "drug" | "skin" | "no" | "") => void;
    sitting: "normal" | "abnormal" | "";
    setSitting: (val: "normal" | "abnormal" | "") => void;
    standing: "normal" | "abnormal" | "";
    setStanding: (val: "normal" | "abnormal" | "") => void;
    walking: "normal" | "abnormal" | "";
    setWalking: (val: "normal" | "abnormal" | "") => void;
    medicines: Array<{ name: string; dosage: string; frequency: string; timing: string; duration: string; remarks?: string }>;
    setMedicines: React.Dispatch<React.SetStateAction<Array<{ name: string; dosage: string; frequency: string; timing: string; duration: string; remarks?: string }>>>;

    // Extra fields
    followUpDate?: string;
    followUpRemarks?: string;
    aiResponse?: any;
    therapies?: Array<{ therapyId: number; therapyName: string }>;
    doctorNotes?: string;
}

interface BodyMarker {
    id: number;
    x: number; // percentage from left
    y: number; // percentage from top
    view: "front" | "back";
    type: "pain" | "swelling" | "numbness";
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
    }, ref) {
        const authDoctorId = useAppSelector(selectUserId);
        const aiResponse = incomingAiResponse || {};

        // Check if patient is old (appointmentCreatedAt - registrationCreatedAt > 1 hour)
        const isPatientOld = (appData: any): boolean => {
            if (!appData) return false;
            const appTimeStr = appData.appointmentCreatedAt || appData.createdAt;
            const regTimeStr = appData.registrationCreatedAt;
            if (!appTimeStr || !regTimeStr) return false;

            const appTime = new Date(appTimeStr).getTime();
            const regTime = new Date(regTimeStr).getTime();
            if (isNaN(appTime) || isNaN(regTime)) return false;

            const oneHourInMs = 60 * 60 * 1000;
            return (appTime - regTime) > oneHourInMs;
        };

        const showProgressMonitoring = isPatientOld(appData);

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
                    return new Date(dateStr).toISOString();
                };

                const buildResponse = (baseObject: any, isUpdated: boolean) => {
                    const getVisitType = () => {
                        const vt = (appData?.visitType || baseObject?.metadata?.visitType || aiResponse?.metadata?.visitType || "first").trim().toLowerCase();
                        if (vt === "first") return "first";
                        if (vt === "follow-up" || vt === "followup") return "follow-up";
                        return "other";
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
                        if (a === "skin") return "Skin";
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
                                cycle: (cycle || baseObject?.specializedHistory?.gynaecHistory?.cycle || "Regular") as any,
                                flow: (flow || baseObject?.specializedHistory?.gynaecHistory?.flow || "Normal") as any,
                                pain: gynaecPain || baseObject?.specializedHistory?.gynaecHistory?.pain || "",
                                discharge: discharge || baseObject?.specializedHistory?.gynaecHistory?.discharge || "",
                                pregnancy: pregnancy || baseObject?.specializedHistory?.gynaecHistory?.pregnancy || "",
                                miscarriage: miscarriage || baseObject?.specializedHistory?.gynaecHistory?.miscarriage || "",
                                remarks: baseObject?.specializedHistory?.gynaecHistory?.remarks || ""
                            }
                            : (baseObject?.specializedHistory?.gynaecHistory || aiResponse?.specializedHistory?.gynaecHistory || null));

                    const specializedHistory = {
                        gynaecHistory: gynaecObj,
                        mentalHealth: isUpdated
                            ? {
                                symptoms: (anxiety || depression || sleepQuality)
                                    ? ([anxiety, depression, sleepQuality].filter(Boolean) as any[])
                                    : (baseObject?.specializedHistory?.mentalHealth?.symptoms || aiResponse?.specializedHistory?.mentalHealth?.symptoms || []),
                                anxietyDetails: baseObject?.specializedHistory?.mentalHealth?.anxietyDetails || aiResponse?.specializedHistory?.mentalHealth?.anxietyDetails || "",
                                depressionDetails: baseObject?.specializedHistory?.mentalHealth?.depressionDetails || aiResponse?.specializedHistory?.mentalHealth?.depressionDetails || "",
                                sleepDetails: baseObject?.specializedHistory?.mentalHealth?.sleepDetails || aiResponse?.specializedHistory?.mentalHealth?.sleepDetails || "",
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
                                    symptoms: gastricValue ? [gastricValue] as any[] : (baseObject?.specializedHistory?.systemicNotes?.gastro?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.gastro?.symptoms || ["Nil"]),
                                    remarks: gastricRemarks || baseObject?.specializedHistory?.systemicNotes?.gastro?.remarks || aiResponse?.specializedHistory?.systemicNotes?.gastro?.remarks || ""
                                },
                                respiratory: {
                                    symptoms: respiratoryValue ? [respiratoryValue] as any[] : (baseObject?.specializedHistory?.systemicNotes?.respiratory?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.respiratory?.symptoms || ["Nil"]),
                                    remarks: respiratoryRemarks || baseObject?.specializedHistory?.systemicNotes?.respiratory?.remarks || aiResponse?.specializedHistory?.systemicNotes?.respiratory?.remarks || ""
                                },
                                cardiac: {
                                    symptoms: cardiacValue ? [cardiacValue] as any[] : (baseObject?.specializedHistory?.systemicNotes?.cardiac?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.cardiac?.symptoms || ["Nil"]),
                                    remarks: cardiacRemarks || baseObject?.specializedHistory?.systemicNotes?.cardiac?.remarks || aiResponse?.specializedHistory?.systemicNotes?.cardiac?.remarks || ""
                                },
                                nervous: {
                                    symptoms: nervousValue ? [nervousValue] as any[] : (baseObject?.specializedHistory?.systemicNotes?.nervous?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.nervous?.symptoms || ["Nil"]),
                                    remarks: nervousRemarks || baseObject?.specializedHistory?.systemicNotes?.nervous?.remarks || aiResponse?.specializedHistory?.systemicNotes?.nervous?.remarks || ""
                                },
                                urinary: {
                                    symptoms: urinaryValue ? [urinaryValue] as any[] : (baseObject?.specializedHistory?.systemicNotes?.urinary?.symptoms || aiResponse?.specializedHistory?.systemicNotes?.urinary?.symptoms || ["Nil"]),
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
                                ? markers.map((m: any) => {
                                    const bodyHalf = m.x < 33 ? "left" : (m.x > 66 ? "right" : "center");
                                    const bodyVertical = m.y < 33 ? "upper" : (m.y > 66 ? "lower" : "middle");
                                    const bodyZone = bodyHalf === "center"
                                        ? (bodyVertical === "lower" ? "center-lower" : "center-upper")
                                        : `${bodyHalf}-${bodyVertical}`;
                                    return {
                                        id: m.id?.toString() || "",
                                        view: (m.view || "front") as any,
                                        markerType: (m.type || "pain") as any,
                                        bodyZone: bodyZone as any,
                                        bodyHalf: bodyHalf as any,
                                        bodyVertical: bodyVertical as any,
                                        xPercent: Number(m.x) || 0,
                                        yPercent: Number(m.y) || 0,
                                        bilateralSymmetry: !!m.bilateralSymmetry,
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
                                findings: radiologySelected ? [radiologySelected] as any[] : (baseObject?.investigations?.radiology?.findings || aiResponse?.investigations?.radiology?.findings || ["Nil"]),
                                remarks: radiologyRemarks || baseObject?.investigations?.radiology?.remarks || aiResponse?.investigations?.radiology?.remarks || ""
                            }
                            : {
                                findings: baseObject?.investigations?.radiology?.findings || aiResponse?.investigations?.radiology?.findings || ["Nil"],
                                remarks: baseObject?.investigations?.radiology?.remarks || aiResponse?.investigations?.radiology?.remarks || ""
                            },
                        laboratory: isUpdated
                            ? {
                                tests: pathologySelected ? [pathologySelected] as any[] : (baseObject?.investigations?.laboratory?.tests || aiResponse?.investigations?.laboratory?.tests || ["Nil"]),
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
                                ? medicines.map((m: any) => ({
                                    medicineName: m.name || "",
                                    medicineDosage: m.dosage || "",
                                    medicineFrequency: m.frequency || "",
                                    medicineTiming: m.timing || "",
                                    medicineDuration: m.duration || "",
                                    medicineRemarks: m.remarks || "",
                                    confidence: 1.0,
                                    stamp: { Std_Code: "", Std_Name: "" }
                                }))
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
                        progressMonitoring,
                        progressTracking
                    };
                };

                const updatedResponse = buildResponse(aiResponse, true);

                const payload: any = {
                    appointmentId: Number(appData?.appointmentId) || 101,
                    branchId: Number(branchId) || Number(appData?.branchId) || 2,
                    doctorId: Number(appData?.doctorId) || Number(authDoctorId) || 3,
                    visitType: appData?.visitType || "first",
                    isEdited: true,
                    aiResponse: aiResponse,
                    updatedResponse: updatedResponse,
                    therapies: (therapies || []).map(t => ({
                        uhid: appData?.uhid || appData?.patientID || "DRBS012026",
                        appointmentId: Number(appData?.appointmentId) || 2,
                        therapyId: Number(t.therapyId),
                        patientType: "opd"
                    })),
                    uhid: appData?.uhid || appData?.patientID || "DRBS012026",
                    doctorNotes: doctorNotes || ""
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

                const result = await createOpdAssessment(payload).unwrap();
                console.log("CreateOpdAssessment success:", result);
                setIsConfirmDialogOpen(false);
                setShowSuccessDialog(true);
            } catch (error) {
                console.error("CreateOpdAssessment error:", error);
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

        // ------------------ Visit Details State ------------------
        const [visitDate, setVisitDate] = useState("2025-05-01");
        const [visitDoctor, setVisitDoctor] = useState("");
        const [visitLocation, setVisitLocation] = useState("");

        // ------------------ 8. Progress Monitoring State ------------------
        const [visitCount, setVisitCount] = useState(initialVisitCount || 1);
        const [progressStatus, setProgressStatus] = useState("");
        const [medicineAdherence, setMedicineAdherence] = useState("");
        const [painRecovery, setPainRecovery] = useState(50);
        const [digestionRecovery, setDigestionRecovery] = useState(50);
        const [energyRecovery, setEnergyRecovery] = useState(50);
        const [sleepRecovery, setSleepRecovery] = useState(50);
        const [clinicalRemarks, setClinicalRemarks] = useState("");

        useEffect(() => {
            if (initialVisitCount !== undefined) {
                setVisitCount(initialVisitCount);
            }
        }, [initialVisitCount]);

        // ------------------ 4. Specialized History State ------------------
        const [cycle, setCycle] = useState("");
        const [flow, setFlow] = useState("");
        const [gynaecPain, setGynaecPain] = useState("");
        const [discharge, setDischarge] = useState("");
        const [pregnancy, setPregnancy] = useState("");
        const [miscarriage, setMiscarriage] = useState("");

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

        // Validation State
        const [errors, setErrors] = useState<Record<string, string>>({});
        const [medicineErrors, setMedicineErrors] = useState<Record<string, string>[]>([{}]);

        // Validation Refs
        const chiefComplaintRef = useRef<HTMLInputElement>(null);
        const symptomsRef = useRef<HTMLInputElement>(null);

        const diabetesRef = useRef<HTMLDivElement>(null);
        const bloodPressureRef = useRef<HTMLDivElement>(null);
        const thyroidRef = useRef<HTMLDivElement>(null);
        const allergyHistoryRef = useRef<HTMLDivElement>(null);

        const gastricValueRef = useRef<HTMLDivElement>(null);
        const stressLevelRef = useRef<HTMLDivElement>(null);

        const sittingRef = useRef<HTMLDivElement>(null);
        const standingRef = useRef<HTMLDivElement>(null);
        const walkingRef = useRef<HTMLDivElement>(null);

        const prakritiRef = useRef<HTMLInputElement>(null);
        const finalDiagnosisRef = useRef<HTMLInputElement>(null);

        const medicineRowRefs = useRef<(HTMLDivElement | null)[]>([]);
        const dietAdviceRef = useRef<HTMLInputElement>(null);

        const progressStatusRef = useRef<HTMLDivElement>(null);
        const medicineAdherenceRef = useRef<HTMLDivElement>(null);
        const clinicalRemarksRef = useRef<HTMLInputElement>(null);

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

        // Auto scroll to patient presentation section on mount (Step 3)
        useEffect(() => {
            section1Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, []);

        const [activeTimelineStep, setActiveTimelineStep] = useState(1);

        // Auto-populate local states when aiResponse becomes available
        useEffect(() => {
            if (!incomingAiResponse) return;
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
                if (summaryObj.medications.doctorNotes) setMedRemarks(summaryObj.medications.doctorNotes);
                if (summaryObj.medications.surgeryHistory) setSurgeryHistory(summaryObj.medications.surgeryHistory);
            }

            // 3. Systemic Review & Co-morbidities
            if (summaryObj.systemicReview) {
                if (summaryObj.systemicReview.diabetes) {
                    const years = summaryObj.systemicReview.diabetes.yearsIfDiabetic;
                    if (years !== undefined && years !== null) setDiabeticYears(String(years));
                    if (summaryObj.systemicReview.diabetes.notes) setDiabetesNotes(summaryObj.systemicReview.diabetes.notes);
                }
                if (summaryObj.systemicReview.bloodPressure?.remarks) setBpRemarks(summaryObj.systemicReview.bloodPressure.remarks);
                if (summaryObj.systemicReview.thyroid?.remarks) setThyroidRemarks(summaryObj.systemicReview.thyroid.remarks);
                if (summaryObj.systemicReview.allergy?.details) setAllergyDetails(summaryObj.systemicReview.allergy.details);
            }

            // 4. Specialized History
            if (summaryObj.specializedHistory?.gynaecHistory) {
                const gh = summaryObj.specializedHistory.gynaecHistory;
                if (gh.cycle) setCycle(gh.cycle);
                if (gh.flow) setFlow(gh.flow);
                if (gh.pain) setGynaecPain(gh.pain);
                if (gh.discharge) setDischarge(gh.discharge);
                if (gh.pregnancy) setPregnancy(gh.pregnancy);
                if (gh.miscarriage) setMiscarriage(gh.miscarriage);
            }

            if (summaryObj.specializedHistory?.mentalHealth) {
                const mh = summaryObj.specializedHistory.mentalHealth;
                const symptomsArr = mh.symptoms || [];
                if (Array.isArray(symptomsArr)) {
                    if (symptomsArr.includes("Anxiety")) setAnxiety("Anxiety");
                    if (symptomsArr.includes("Depression")) setDepression("Depression");
                    if (symptomsArr.includes("Sleep Issues")) setSleepQuality("Sleep Issues");
                }
                if (mh.stressLevel) setStressLevel(mh.stressLevel.toLowerCase() as any);
                if (mh.doctorNotes) setMentalRemarks(mh.doctorNotes);
            }

            if (summaryObj.specializedHistory?.systemicNotes) {
                const sn = summaryObj.specializedHistory.systemicNotes;
                if (sn.gastro) {
                    if (Array.isArray(sn.gastro.symptoms) && sn.gastro.symptoms[0]) setGastricValue(sn.gastro.symptoms[0]);
                    if (sn.gastro.remarks) setGastricRemarks(sn.gastro.remarks);
                }
                if (sn.respiratory) {
                    if (Array.isArray(sn.respiratory.symptoms) && sn.respiratory.symptoms[0]) setRespiratoryValue(sn.respiratory.symptoms[0]);
                    if (sn.respiratory.remarks) setRespiratoryRemarks(sn.respiratory.remarks);
                }
                if (sn.cardiac) {
                    if (Array.isArray(sn.cardiac.symptoms) && sn.cardiac.symptoms[0]) setCardiacValue(sn.cardiac.symptoms[0]);
                    if (sn.cardiac.remarks) setCardiacRemarks(sn.cardiac.remarks);
                }
                if (sn.nervous) {
                    if (Array.isArray(sn.nervous.symptoms) && sn.nervous.symptoms[0]) setNervousValue(sn.nervous.symptoms[0]);
                    if (sn.nervous.remarks) setNervousRemarks(sn.nervous.remarks);
                }
                if (sn.urinary) {
                    if (Array.isArray(sn.urinary.symptoms) && sn.urinary.symptoms[0]) setUrinaryValue(sn.urinary.symptoms[0]);
                    if (sn.urinary.remarks) setUrinaryRemarks(sn.urinary.remarks);
                }
            }

            // 5. Physical Examination & Disorders
            if (summaryObj.physicalExamination) {
                if (summaryObj.physicalExamination.balanceMobility?.remarks) setMobilityRemarks(summaryObj.physicalExamination.balanceMobility.remarks);
                if (summaryObj.physicalExamination.pain) {
                    const p = summaryObj.physicalExamination.pain;
                    if (p.site) setPainSite(p.site);
                    if (p.scale !== undefined && p.scale !== null) setPainScale(p.scale);
                    if (p.locationNotes) setPainNotes(p.locationNotes);
                }
                if (summaryObj.physicalExamination.asthaVidhaPariksha) {
                    const avp = summaryObj.physicalExamination.asthaVidhaPariksha;
                    if (avp.pulse) setNadi(avp.pulse);
                    if (avp.tongue) setJihva(avp.tongue);
                    if (avp.eyes) setDruk(avp.eyes);
                    if (avp.nails) setNakha(avp.nails);
                    if (avp.vataNotes) setVata(avp.vataNotes);
                    if (avp.pittaNotes) setPitta(avp.pittaNotes);
                    if (avp.kaphaNotes) setKapha(avp.kaphaNotes);
                    if (avp.overallPrakriti) setPrakriti(avp.overallPrakriti);
                }
            }

            // 6. Investigations
            if (summaryObj.investigations) {
                if (summaryObj.investigations.radiology) {
                    const r = summaryObj.investigations.radiology;
                    if (Array.isArray(r.findings) && r.findings[0]) setRadiologySelected(r.findings[0]);
                    if (r.remarks) setRadiologyRemarks(r.remarks);
                }
                if (summaryObj.investigations.laboratory) {
                    const l = summaryObj.investigations.laboratory;
                    if (Array.isArray(l.tests) && l.tests[0]) setPathologySelected(l.tests[0]);
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
        }, [incomingAiResponse]);

        const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
            if (ref.current) {
                ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        };

        // Section Progress Calculations
        const getSection1Percent = () => {
            const fields = [chiefComplaint, symptoms, hpi, gender, socialHistory, pastMedicalHistory, familyHistory];
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
                allergyDetails
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
                    <span
                        className="text-xs font-semibold transition-colors duration-300"
                        style={{ color }}
                    >
                        {percent}% {text}
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
            updated[index] = { ...updated[index], [field]: value };
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
            });

            setErrors(newErrors);
            setMedicineErrors(newMedErrors);

            if (!isValid) {
                // Find first error and scroll & focus
                if (newErrors.chiefComplaint) {
                    chiefComplaintRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => chiefComplaintRef.current?.focus(), 100);
                } else if (newErrors.symptoms) {
                    symptomsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => symptomsRef.current?.focus(), 100);
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
                } else if (!isMedValid) {
                    const firstErrIdx = newMedErrors.findIndex(x => Object.keys(x).length > 0);
                    if (firstErrIdx >= 0) {
                        const rowEl = medicineRowRefs.current[firstErrIdx];
                        rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });

                        const err = newMedErrors[firstErrIdx];
                        const fieldsOrder = ["name", "dosage", "frequency", "duration", "remarks"];
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
            // Hips & hands
            if (y >= 45 && y < 55) {
                return x >= 25 && x <= 75;
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

            const typeLabel = activeMarkType.charAt(0).toUpperCase() + activeMarkType.slice(1);
            const markerDesc = `${typeLabel} marked on ${view} body diagram at location x:${newMarker.x}%, y:${newMarker.y}%`;
            setPainNotes(prev => prev ? `${prev}\n- ${markerDesc}` : `- ${markerDesc}`);
        };

        const handleRemoveMarker = (id: number) => {
            setMarkers(markers.filter(m => m.id !== id));
        };

        const handleClearAllMarkers = () => {
            setMarkers([]);
            setPainNotes("");
        };

        return (
            <div ref={containerRef} className={`flex flex-col gap-6 w-full ${className}`}>

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

                {/* 1. PATIENT PRESENTATION */}
                <div ref={section1Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg text-[#262D3B]">Clinical Assessment Record</h2>
                        {doctorNotes && (
                            <button
                                type="button"
                                onClick={() => setIsNotesOpen(true)}
                                className="px-4 py-1.5 cursor-pointer rounded-[32px] border border-[#0B8C00] text-[#0B8C00] text-xs font-medium hover:bg-[#F2F8F2] transition-colors whitespace-nowrap flex items-center gap-2"
                            >
                                <Image
                                    src="/icons/Eye.svg"
                                    alt="View Notes"
                                    width={14}
                                    height={14}
                                />
                                Doctor Note
                            </button>
                        )}
                    </div>
                    <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">1</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Patient Presentation</h3>
                        </div>
                        <SectionProgress percent={getSection1Percent()} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormInputField
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
                        />
                        <FormInputField
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
                        />
                        <FormInputField
                            label="History of Present Illness (HPI)"
                            placeholder="Onset, duration, progression..."
                            value={hpi}
                            onChange={(e) => setHpi(e.target.value)}
                            width="100%"
                        />

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInputField
                            label="Social History"
                            placeholder="Occupation, lifestyle..."
                            value={socialHistory}
                            onChange={(e) => setSocialHistory(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Past Medical History"
                            placeholder="Previous conditions..."
                            value={pastMedicalHistory}
                            onChange={(e) => setPastMedicalHistory(e.target.value)}
                            width="100%"
                        />
                    </div>
                    <FormInputField
                        label="Family History"
                        placeholder="Hereditary conditions..."
                        value={familyHistory}
                        onChange={(e) => setFamilyHistory(e.target.value)}
                        width="100%"
                    />
                </div>

                {/* 2. MEDICATIONS & SUPPLEMENTS */}
                <div ref={section2Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                    <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">2</div>
                            <h3 className="font-inter font-semibold text-base text-[#262D3B]">Medications & Supplements</h3>
                        </div>
                        <SectionProgress percent={getSection2Percent()} />
                    </div>

                    <div className="w-full md:w-[350px]">
                        <PatientTypeButtonGroup
                            options={["Yes", "No"]}
                            value={currentMedications}
                            onChange={(val) => setCurrentMedications(val as any)}
                            label="Current Medications"
                            required={true}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInputField
                            label="Remarks / Doctor Notes"
                            placeholder="Doctor notes on current medications..."
                            value={medRemarks}
                            onChange={(e) => setMedRemarks(e.target.value)}
                            width="100%"
                        />
                        <FormInputField
                            label="Surgery History"
                            placeholder="Surgery History"
                            value={surgeryHistory}
                            onChange={(e) => setSurgeryHistory(e.target.value)}
                            width="100%"
                        />
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

                    <div className="space-y-4">
                        {/* Diabetes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PatientTypeButtonGroup
                                options={["Yes", "No"]}
                                value={diabetes}
                                onChange={(val) => {
                                    setDiabetes(val as any);
                                    if (errors.diabetes) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.diabetes;
                                            return next;
                                        });
                                    }
                                }}
                                label="Diabetes Mellitus *"
                                required={true}
                                fieldRef={diabetesRef}
                                error={errors.diabetes}
                            />
                            <FormInputField
                                label="Years (if Diabetic)"
                                placeholder="e.g. 5"
                                value={diabeticYears}
                                onChange={(e) => setDiabeticYears(e.target.value)}
                                width="100%"
                            />
                        </div>

                        <FormInputField
                            label="Diabetes Notes"
                            placeholder="e.g. Type 2, on Metformin, HbA1c 7.2..."
                            value={diabetesNotes}
                            onChange={(e) => setDiabetesNotes(e.target.value)}
                            width="100%"
                        />

                        {/* Blood Pressure */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PatientTypeButtonGroup
                                options={["High BP", "Low BP", "No"]}
                                value={bloodPressure}
                                onChange={(val) => {
                                    setBloodPressure(val as any);
                                    if (errors.bloodPressure) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.bloodPressure;
                                            return next;
                                        });
                                    }
                                }}
                                label="Blood Pressure *"
                                required={true}
                                fieldRef={bloodPressureRef}
                                error={errors.bloodPressure}
                            />
                            <FormInputField
                                label="Remarks"
                                placeholder="Remarks"
                                value={bpRemarks}
                                onChange={(e) => setBpRemarks(e.target.value)}
                                width="100%"
                            />
                        </div>

                        {/* Thyroid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PatientTypeButtonGroup
                                options={["Hypothyroid", "Hyperthyroid", "No"]}
                                value={thyroid}
                                onChange={(val) => {
                                    setThyroid(val as any);
                                    if (errors.thyroid) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.thyroid;
                                            return next;
                                        });
                                    }
                                }}
                                label="Thyroid Disorder *"
                                required={true}
                                fieldRef={thyroidRef}
                                error={errors.thyroid}
                            />
                            <FormInputField
                                label="Remarks"
                                placeholder="Remarks"
                                value={thyroidRemarks}
                                onChange={(e) => setThyroidRemarks(e.target.value)}
                                width="100%"
                            />
                        </div>

                        {/* Allergy History */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PatientTypeButtonGroup
                                options={["Food", "Drug", "Skin", "No"]}
                                value={allergyHistory}
                                onChange={(val) => {
                                    setAllergyHistory(val as any);
                                    if (errors.allergyHistory) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.allergyHistory;
                                            return next;
                                        });
                                    }
                                }}
                                label="Allergy History *"
                                required={true}
                                fieldRef={allergyHistoryRef}
                                error={errors.allergyHistory}
                            />
                            <FormInputField
                                label="Allergy Details"
                                placeholder="Describe allergy reactions..."
                                value={allergyDetails}
                                onChange={(e) => setAllergyDetails(e.target.value)}
                                width="100%"
                            />


                        </div>
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
                        <div className="space-y-4 pb-4 border-b border-[#EBECED]">
                            <h4 className="font-inter font-semibold text-sm text-[#434956]">Gynaec / Obs History</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <PatientTypeButtonGroup
                                    options={["Regular", "Irregular"]}
                                    value={cycle}
                                    onChange={(val) => setCycle(val)}
                                    label="Cycle"
                                />
                                <PatientTypeButtonGroup
                                    options={["Normal", "Heavy", "Scanty"]}
                                    value={flow}
                                    onChange={(val) => setFlow(val)}
                                    label="Flow"
                                />
                                <FormInputField
                                    label="Pain"
                                    placeholder="Details"
                                    value={gynaecPain}
                                    onChange={(e) => setGynaecPain(e.target.value)}
                                    width="100%"
                                />
                                <FormInputField
                                    label="Discharge"
                                    placeholder="Details"
                                    value={discharge}
                                    onChange={(e) => setDischarge(e.target.value)}
                                    width="100%"
                                />
                                <FormInputField
                                    label="Pregnancy"
                                    placeholder="G_ P_ A_ L_..."
                                    value={pregnancy}
                                    onChange={(e) => setPregnancy(e.target.value)}
                                    width="100%"
                                />
                                <FormInputField
                                    label="Miscarriage"
                                    placeholder="Details"
                                    value={miscarriage}
                                    onChange={(e) => setMiscarriage(e.target.value)}
                                    width="100%"
                                />
                            </div>
                        </div>
                    )}

                    {/* Mental Health */}
                    <div className="space-y-4">
                        <h4 className="font-inter font-semibold text-sm text-[#434956] ">Mental & Psychological Health</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormSelectField
                                label="Anxiety"
                                placeholder="Select"
                                options={SELECT_OPTIONS}
                                value={anxiety}
                                onChange={(val) => setAnxiety(val as string)}
                                background="white"
                                width="100%"
                            />
                            <FormSelectField
                                label="Depression"
                                placeholder="Select"
                                options={SELECT_OPTIONS}
                                value={depression}
                                onChange={(val) => setDepression(val as string)}
                                background="white"
                                width="100%"
                            />
                            <FormSelectField
                                label="Sleep Quality"
                                placeholder="Select"
                                options={SLEEP_OPTIONS}
                                value={sleepQuality}
                                onChange={(val) => setSleepQuality(val as string)}
                                background="white"
                                width="100%"
                            />
                            <PatientTypeButtonGroup
                                options={["Mild", "Moderate", "Severe", "None"]}
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
                                label="Stress Level *"
                                required={true}
                                fieldRef={stressLevelRef}
                                error={errors.stressLevel}
                            />
                        </div>
                        <FormInputField
                            label="Remarks / Doctor Notes"
                            placeholder="Doctor notes on mental and psychological health..."
                            value={mentalRemarks}
                            onChange={(e) => setMentalRemarks(e.target.value)}
                            width="100%"
                        />
                    </div>

                    {/* Systemic Notes */}
                    <div className="space-y-6 pt-2 ">
                        <h4 className="font-inter font-semibold text-sm text-[#434956]  mb-2">Systemic Notes</h4>

                        {/* Gastric */}
                        <div className="space-y-3">
                            <PatientTypeButtonGroup
                                options={["Acidity", "GERD", "Gas", "Abd Pain", "Constipation", "Loose Stool", "Nausea", "None"]}
                                value={gastricValue}
                                onChange={(val) => {
                                    setGastricValue(val);
                                    if (errors.gastricValue) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.gastricValue;
                                            return next;
                                        });
                                    }
                                }}
                                label="Gastric Complaints *"
                                required={true}
                                fieldRef={gastricValueRef}
                                error={errors.gastricValue}
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                placeholder="Doctor notes on gastric symptoms..."
                                value={gastricRemarks}
                                onChange={(e) => setGastricRemarks(e.target.value)}
                                width="100%"
                            />
                        </div>

                        {/* Respiratory */}
                        <div className="space-y-3 ">
                            <div className="">

                                <div className="md:col-span-3">
                                    <PatientTypeButtonGroup
                                        options={["SOB", "Cough", "Fever", "Asthma", "Wheeze", "TB", "Others", "None"]}
                                        value={respiratoryValue}
                                        onChange={(val) => setRespiratoryValue(val)}
                                        label="Respiratory Issues"
                                    />
                                </div>
                            </div>
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                placeholder="Remarks / Doctor Notes..."
                                value={respiratoryRemarks}
                                onChange={(e) => setRespiratoryRemarks(e.target.value)}
                                width="100%"
                            />
                        </div>

                        {/* Cardiac */}
                        <div className="space-y-3 ">
                            <PatientTypeButtonGroup
                                options={["Chest Pain", "Palpitation", "Breathing", "Dizziness", "Nil", "Others"]}
                                value={cardiacValue}
                                onChange={(val) => setCardiacValue(val)}
                                label="Cardiac"
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                placeholder="Remarks / Doctor Notes..."
                                value={cardiacRemarks}
                                onChange={(e) => setCardiacRemarks(e.target.value)}
                                width="100%"
                            />
                        </div>

                        {/* Nervous System */}
                        <div className="space-y-3 ">
                            <PatientTypeButtonGroup
                                options={["Headache", "Sensory Loss", "Weakness", "Nil", "Others"]}
                                value={nervousValue}
                                onChange={(val) => setNervousValue(val)}
                                label="Nervous System"
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                placeholder="Remarks / Doctor Notes..."
                                value={nervousRemarks}
                                onChange={(e) => setNervousRemarks(e.target.value)}
                                width="100%"
                            />
                        </div>

                        {/* Urinary System */}
                        <div className="space-y-3 ">
                            <PatientTypeButtonGroup
                                options={["Burning", "Frequency", "Blood", "Low Output", "Stones", "Others"]}
                                value={urinaryValue}
                                onChange={(val) => setUrinaryValue(val)}
                                label="Urinary System"
                            />
                            <FormInputField
                                label="Remarks / Doctor Notes"
                                placeholder="Remarks / Doctor Notes..."
                                value={urinaryRemarks}
                                onChange={(e) => setUrinaryRemarks(e.target.value)}
                                width="100%"
                            />
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <PatientTypeButtonGroup
                                options={["Normal", "Abnormal"]}
                                value={sitting}
                                onChange={(val) => {
                                    setSitting(val as any);
                                    if (errors.sitting) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.sitting;
                                            return next;
                                        });
                                    }
                                }}
                                label="Sitting *"
                                required={true}
                                fieldRef={sittingRef}
                                error={errors.sitting}
                            />
                            <PatientTypeButtonGroup
                                options={["Normal", "Abnormal"]}
                                value={standing}
                                onChange={(val) => {
                                    setStanding(val as any);
                                    if (errors.standing) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.standing;
                                            return next;
                                        });
                                    }
                                }}
                                label="Standing *"
                                required={true}
                                fieldRef={standingRef}
                                error={errors.standing}
                            />
                            <PatientTypeButtonGroup
                                options={["Normal", "Abnormal"]}
                                value={walking}
                                onChange={(val) => {
                                    setWalking(val as any);
                                    if (errors.walking) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.walking;
                                            return next;
                                        });
                                    }
                                }}
                                label="Walking *"
                                required={true}
                                fieldRef={walkingRef}
                                error={errors.walking}
                            />
                        </div>
                        <FormInputField
                            label="Remarks"
                            placeholder="Remarks"
                            value={mobilityRemarks}
                            onChange={(e) => setMobilityRemarks(e.target.value)}
                            width="100%"
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
                                />
                            </div>
                            <div className="lg:col-span-7 space-y-2 pb-1">
                                <span className="block text-xs font-medium text-[#7B8089]">Pain Scale (0-10) <span className="text-[#F6776E]">*</span></span>
                                <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setPainScale(num)}
                                            className={`w-8 h-8 text-xs rounded-full font-bold flex items-center justify-center shrink-0 transition-all duration-150 ${painScale === num
                                                ? "bg-[#0B8C00] text-white border-transparent"
                                                : "bg-[#F1F1F1] text-[#434956] border-transparent hover:bg-[#E5E7EB]"
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
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
                                            className="relative w-[150px] h-[250px] rounded-lg bg-white flex items-center justify-center cursor-crosshair overflow-hidden"
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
                                            className="relative w-[150px] h-[250px] rounded-lg bg-white flex items-center justify-center cursor-crosshair overflow-hidden"
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
                                                {markers.length} marks
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
                                />
                                <FormInputField
                                    label="Pulse (Nadi)"
                                    placeholder="Quality, Rate..."
                                    value={nadi}
                                    onChange={(e) => setNadi(e.target.value)}
                                    width="100%"
                                />
                                <FormInputField
                                    label="Eyes (Drink)"
                                    placeholder="Observations"
                                    value={druk}
                                    onChange={(e) => setDruk(e.target.value)}
                                    width="100%"
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
                                />
                                <FormInputField
                                    label="Dosha-Vata"
                                    placeholder="Assessment..."
                                    value={vata}
                                    onChange={(e) => setVata(e.target.value)}
                                    width="100%"
                                />
                                <FormInputField
                                    label="Pitta"
                                    placeholder="Assessment..."
                                    value={pitta}
                                    onChange={(e) => setPitta(e.target.value)}
                                    width="100%"
                                />
                            </div>

                            {/* Row 3 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInputField
                                    label="Kapha"
                                    placeholder="Assessment..."
                                    value={kapha}
                                    onChange={(e) => setKapha(e.target.value)}
                                    width="100%"
                                />
                                <FormInputField
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
                                    error={errors.prakriti}
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

                    <div className="space-y-4">
                        {/* Row 1: Button Groups */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PatientTypeButtonGroup
                                options={["X-Ray", "MRI", "Ultrasound", "Nil"]}
                                value={radiologySelected}
                                onChange={(val) => setRadiologySelected(val)}
                                label="Radiology Findings"
                            />
                            <PatientTypeButtonGroup
                                options={["Blood", "Urine", "Culture", "Nil"]}
                                value={pathologySelected}
                                onChange={(val) => setPathologySelected(val)}
                                label="Pathology Findings"
                            />
                        </div>

                        {/* Row 2: Remarks, Lab Tests, and Provisional Diagnosis */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormInputField
                                label="Radiology Remarks"
                                placeholder="Remarks on radiology findings..."
                                value={radiologyRemarks}
                                onChange={(e) => setRadiologyRemarks(e.target.value)}
                                width="100%"
                            />
                            <FormInputField
                                label="Lab Tests Prescribed By Doctor"
                                placeholder="e.g. CBC, LFT, RFT, HbA1c..."
                                value={prescribedLabTests}
                                onChange={(e) => setPrescribedLabTests(e.target.value)}
                                width="100%"
                            />
                            <FormInputField
                                label="Provisional Diagnosis"
                                placeholder="Working diagnosis..."
                                value={provisionalDiagnosis}
                                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                                width="100%"
                            />
                        </div>

                        {/* Row 3: Final Diagnosis */}
                        <FormInputField
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
                        />
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
                        <FormInputField
                            label="Patient Education"
                            placeholder="What was explained to the patient..."
                            value={patientInstruction}
                            onChange={(e) => setPatientInstruction(e.target.value)}
                            width="100%"
                        />

                        <div className="rounded-[12px] border border-[#EBECED] bg-white p-4 md:p-5">
                            <p className="mb-4 text-sm font-medium text-[#434956]">
                                Medicine Prescribed <span className="text-[#EF4444]">*</span>
                            </p>

                            <div className="hidden md:grid md:grid-cols-4 md:gap-3 md:px-1 md:pb-3 text-xs font-semibold text-[#7B8089]">
                                <span>Name</span>
                                <span>Dosage</span>
                                <span>Frequency</span>
                                <span>Duration</span>
                            </div>

                            <div className="flex flex-col gap-4">
                                {medicines.map((med, idx) => (
                                    <div
                                        key={idx}
                                        ref={(el) => {
                                            medicineRowRefs.current[idx] = el;
                                        }}
                                        className="flex flex-col gap-3 border-b border-[#EBECED] pb-4 last:border-b-0 last:pb-0"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div>
                                                <span className="mb-1 block text-xs font-semibold text-[#7B8089] md:hidden">Name</span>
                                                <FormSelectField
                                                    label="Name"
                                                    placeholder="Select"
                                                    options={MEDICINE_OPTIONS}
                                                    value={med.name}
                                                    onChange={(val) => handleRowChange(idx, "name", val as string)}
                                                    background="white"
                                                    hideLabel={true}
                                                    width="100%"
                                                    error={medicineErrors[idx]?.name}
                                                />
                                            </div>
                                            <div>
                                                <span className="mb-1 block text-xs font-semibold text-[#7B8089] md:hidden">Dosage</span>
                                                <FormSelectField
                                                    label="Dosage"
                                                    placeholder="Select"
                                                    options={DOSAGE_OPTIONS}
                                                    value={med.dosage}
                                                    onChange={(val) => handleRowChange(idx, "dosage", val as string)}
                                                    background="white"
                                                    hideLabel={true}
                                                    width="100%"
                                                    error={medicineErrors[idx]?.dosage}
                                                />
                                            </div>
                                            <div>
                                                <span className="mb-1 block text-xs font-semibold text-[#7B8089] md:hidden">Frequency</span>
                                                <FormSelectField
                                                    label="Frequency"
                                                    placeholder="Select"
                                                    options={FREQUENCY_OPTIONS}
                                                    value={med.frequency}
                                                    onChange={(val) => handleRowChange(idx, "frequency", val as string)}
                                                    background="white"
                                                    hideLabel={true}
                                                    width="100%"
                                                    error={medicineErrors[idx]?.frequency}
                                                />
                                            </div>
                                            <div>
                                                <span className="mb-1 block text-xs font-semibold text-[#7B8089] md:hidden">Duration</span>
                                                <FormSelectField
                                                    label="Duration"
                                                    placeholder="Select"
                                                    options={DURATION_OPTIONS}
                                                    value={med.duration}
                                                    onChange={(val) => handleRowChange(idx, "duration", val as string)}
                                                    background="white"
                                                    hideLabel={true}
                                                    width="100%"
                                                    error={medicineErrors[idx]?.duration}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                <FormInputField
                                                    label="Remarks"
                                                    placeholder="Remarks"
                                                    value={med.remarks || ""}
                                                    onChange={(e) => handleRowChange(idx, "remarks", e.target.value)}
                                                    width="100%"
                                                    error={medicineErrors[idx]?.remarks}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(idx)}
                                                className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EF4444] text-sm font-bold text-white transition-colors hover:bg-red-600 focus:outline-none"
                                                aria-label="Remove medicine row"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4">
                                <Button variant="primary" size="small" onClick={handleAddRow}>
                                    Add Row
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <FormInputField
                                ref={dietAdviceRef}
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
                                error={errors.dietAdvice}
                            />
                            <FormInputField
                                label="Lifestyle Changes"
                                placeholder="Sleep, exercise..."
                                value={lifestyleChanges}
                                onChange={(e) => setLifestyleChanges(e.target.value)}
                                width="100%"
                            />
                            <FormInputField
                                label="Yoga / Pranayama"
                                placeholder="Specific asanas..."
                                value={physicalExercises}
                                onChange={(e) => setPhysicalExercises(e.target.value)}
                                width="100%"
                            />
                        </div>
                    </div>
                </div>

                {/* 8. Section Progress Monitoring (Visit [Count]) for revisit ok */}
                {showProgressMonitoring && (
                    <div ref={section8Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                        <div className="flex items-center justify-between ">
                            <div className="flex items-center gap-3">
                                <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">8</div>
                                <h3 className="font-inter font-semibold text-base text-[#262D3B]">Progress Monitoring (Visit {visitCount})</h3>
                            </div>
                            <SectionProgress percent={getSection8Percent()} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PatientTypeButtonGroup
                                options={["Better", "Same", "Worse", "New Symptoms"]}
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
                                label="Progress Status *"
                                required
                                fieldRef={progressStatusRef}
                                error={errors.progressStatus}
                            />
                            <PatientTypeButtonGroup
                                options={["Regular", "Irregular", "Side Effects"]}
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
                                label="Medicine Adherence *"
                                required
                                fieldRef={medicineAdherenceRef}
                                error={errors.medicineAdherence}
                            />
                        </div>

                        {/* Symptom Recovery % */}
                        <div className="space-y-4 pt-2">
                            <h4 className="font-inter font-semibold text-sm text-[#434956]">Symptom Recovery %</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                <Slider label="Pain" value={painRecovery} onChange={setPainRecovery} />
                                <Slider label="Digestion" value={digestionRecovery} onChange={setDigestionRecovery} />
                                <Slider label="Energy" value={energyRecovery} onChange={setEnergyRecovery} />
                                <Slider label="Sleep" value={sleepRecovery} onChange={setSleepRecovery} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <FormInputField
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
