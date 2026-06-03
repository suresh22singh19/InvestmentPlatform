"use client";

import { useState, useRef, useEffect } from "react";
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

export interface ClinicalAssessmentRecordProps {
    className?: string;
    onComplete?: () => void;
    initialGender?: string;
    initialVisitCount?: number;
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

export function ClinicalAssessmentRecord({ className = "", onComplete, initialGender, initialVisitCount }: ClinicalAssessmentRecordProps) {
    // Dialog & Submission States
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setIsConfirmDialogOpen(false);
            setShowSuccessDialog(true);
        }, 800);
    };

    // ------------------ 1. Patient Presentation State ------------------
    const [chiefComplaint, setChiefComplaint] = useState("");
    const [symptoms, setSymptoms] = useState("");
    const [hpi, setHpi] = useState("");
    const [gender, setGender] = useState(initialGender || "");

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
    const [diabetes, setDiabetes] = useState<"yes" | "no" | "">("");
    const [diabeticYears, setDiabeticYears] = useState("");
    const [diabetesNotes, setDiabetesNotes] = useState("");
    const [bloodPressure, setBloodPressure] = useState<"high" | "low" | "no" | "">("");
    const [bpRemarks, setBpRemarks] = useState("");
    const [thyroid, setThyroid] = useState<"hypo" | "hyper" | "no" | "">("");
    const [thyroidRemarks, setThyroidRemarks] = useState("");
    const [allergyHistory, setAllergyHistory] = useState<"food" | "drug" | "skin" | "no" | "">("");
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
    const [sitting, setSitting] = useState<"normal" | "abnormal" | "">("");
    const [standing, setStanding] = useState<"normal" | "abnormal" | "">("");
    const [walking, setWalking] = useState<"normal" | "abnormal" | "">("");
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
    const [finalDiagnosis, setFinalDiagnosis] = useState("");

    // ------------------ 7. Treatment Plan & Education State ------------------
    const [patientInstruction, setPatientInstruction] = useState("");
    const [medicines, setMedicines] = useState([
        { name: "", dosage: "", frequency: "", timing: "", duration: "" },
    ]);
    const [dietAdvice, setDietAdvice] = useState("");
    const [lifestyleChanges, setLifestyleChanges] = useState("");
    const [physicalExercises, setPhysicalExercises] = useState("");

    // Validation State
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [medicineErrors, setMedicineErrors] = useState<Record<string, string>[]>([{}]);

    // Validation Refs
    const visitDateRef = useRef<HTMLDivElement>(null);
    const visitDoctorRef = useRef<HTMLDivElement>(null);
    const visitLocationRef = useRef<HTMLInputElement>(null);

    const chiefComplaintRef = useRef<HTMLInputElement>(null);
    const symptomsRef = useRef<HTMLInputElement>(null);
    const genderRef = useRef<HTMLDivElement>(null);

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

    const [activeTimelineStep, setActiveTimelineStep] = useState(1);

    const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // Calculate overall completion percent dynamically
    const getCompletionPercent = () => {
        let filledCount = 0;
        const totalFields = 9;

        if (chiefComplaint || symptoms) filledCount++;
        if (currentMedications) filledCount++;
        if (diabetes || bloodPressure) filledCount++;
        if (anxiety || stressLevel || gastricValue) filledCount++;
        if (sitting || standing || painScale !== null || markers.length > 0) filledCount++;
        if (radiologySelected || pathologySelected) filledCount++;
        if (medicines.some(m => m.name)) filledCount++;

        return Math.round((filledCount / totalFields) * 100);
    };

    // Row Handlers for medicines
    const handleAddRow = () => {
        setMedicines([...medicines, { name: "", dosage: "", frequency: "", timing: "", duration: "" }]);
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

        if (!visitDate) {
            newErrors.visitDate = "Visit Date is required";
            isValid = false;
        }
        if (!visitDoctor) {
            newErrors.visitDoctor = "Doctor is required";
            isValid = false;
        }
        if (!visitLocation) {
            newErrors.visitLocation = "Location is required";
            isValid = false;
        }
        if (!chiefComplaint.trim()) {
            newErrors.chiefComplaint = "Chief Complaint is required";
            isValid = false;
        }
        if (!symptoms.trim()) {
            newErrors.symptoms = "Symptoms are required";
            isValid = false;
        }
        if (!gender) {
            newErrors.gender = "Gender is required";
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

        // Medicines validation
        const newMedErrors: Record<string, string>[] = [];
        let isMedValid = true;

        medicines.forEach((med, idx) => {
            const rowErrors: Record<string, string> = {};
            if (!med.name) {
                rowErrors.name = "Medicine Name is required";
                isValid = false;
                isMedValid = false;
            }
            if (!med.dosage) {
                rowErrors.dosage = "Dosage is required";
                isValid = false;
                isMedValid = false;
            }
            if (!med.frequency) {
                rowErrors.frequency = "Frequency is required";
                isValid = false;
                isMedValid = false;
            }
            if (!med.timing) {
                rowErrors.timing = "Timing is required";
                isValid = false;
                isMedValid = false;
            }
            if (!med.duration) {
                rowErrors.duration = "Duration is required";
                isValid = false;
                isMedValid = false;
            }
            newMedErrors[idx] = rowErrors;
        });

        setErrors(newErrors);
        setMedicineErrors(newMedErrors);

        if (!isValid) {
            // Find first error and scroll & focus
            if (newErrors.visitDate) {
                visitDateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                    const input = visitDateRef.current?.querySelector("input");
                    input?.focus();
                }, 100);
            } else if (newErrors.visitDoctor) {
                visitDoctorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                    const button = visitDoctorRef.current?.querySelector("button");
                    button?.focus();
                }, 100);
            } else if (newErrors.visitLocation) {
                visitLocationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => visitLocationRef.current?.focus(), 100);
            } else if (newErrors.chiefComplaint) {
                chiefComplaintRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => chiefComplaintRef.current?.focus(), 100);
            } else if (newErrors.symptoms) {
                symptomsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => symptomsRef.current?.focus(), 100);
            } else if (newErrors.gender) {
                genderRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                    const button = genderRef.current?.querySelector("button");
                    button?.focus();
                }, 100);
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
                    const fieldsOrder = ["name", "dosage", "frequency", "timing", "duration"];
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
                        <span className="font-inter font-bold text-lg text-[#EAB308]">{getCompletionPercent()}%</span>
                        <span className="text-xs font-semibold text-[#7B8089]">0 of 8 sections complete</span>
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
                            const isActive = activeTimelineStep >= item.step;
                            const isCurrent = activeTimelineStep === item.step;
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
                                        <span className="font-inter font-medium text-[18px] leading-tight text-[#EAB308] text-center block">
                                            0%
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* MASTER FORM TITLE */}

            {/* here section for Visit Details */}
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-4">
                <h3 className="font-inter font-bold text-sm text-[#262D3B]">Visit Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div ref={visitDateRef} className="w-full">
                        <DatePicker
                            label="Visit Date *"
                            placeholder="Choose date"
                            value={visitDate}
                            onChange={(val) => {
                                setVisitDate(val);
                                if (errors.visitDate) {
                                    setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.visitDate;
                                        return next;
                                    });
                                }
                            }}
                            background="white"
                            width="100%"
                            required
                            error={errors.visitDate}
                        />
                    </div>
                    <FormSelectField
                        ref={visitDoctorRef}
                        label="Doctor *"
                        placeholder="Select"
                        options={DOCTOR_OPTIONS}
                        value={visitDoctor}
                        onChange={(val) => {
                            setVisitDoctor(val as string);
                            if (errors.visitDoctor) {
                                setErrors(prev => {
                                    const next = { ...prev };
                                    delete next.visitDoctor;
                                    return next;
                                });
                            }
                        }}
                        background="white"
                        width="100%"
                        error={errors.visitDoctor}
                    />
                    <FormInputField
                        ref={visitLocationRef}
                        label="Location *"
                        placeholder="Clinic / branch..."
                        value={visitLocation}
                        onChange={(e) => {
                            setVisitLocation(e.target.value);
                            if (errors.visitLocation) {
                                setErrors(prev => {
                                    const next = { ...prev };
                                    delete next.visitLocation;
                                    return next;
                                });
                            }
                        }}
                        width="100%"
                        error={errors.visitLocation}
                    />
                </div>
            </div>

            {/* 1. PATIENT PRESENTATION */}
            <div ref={section1Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg text-[#262D3B]">Clinical Assessment Record</h2>
                </div>
                <div className="flex items-center justify-between ">
                    <div className="flex items-center gap-3">
                        <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">1</div>
                        <h3 className="font-inter font-semibold text-base text-[#262D3B]">Patient Presentation</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EF4444] h-full" style={{ width: '16%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EF4444]">16% Not Started</span>
                    </div>
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
                    <FormSelectField
                        ref={genderRef}
                        label="Gender *"
                        placeholder="Select"
                        options={GENDER_OPTIONS}
                        value={gender}
                        onChange={(val) => {
                            setGender(val as string);
                            if (errors.gender) {
                                setErrors(prev => {
                                    const next = { ...prev };
                                    delete next.gender;
                                    return next;
                                });
                            }
                        }}
                        background="white"
                        width="100%"
                        error={errors.gender}
                    />
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
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
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
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
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
                            options={["High BP", "High BP", "No"]}
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
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
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
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
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
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
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
                <div className="flex items-center justify-between ">
                    <div className="flex items-center gap-3">
                        <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">7</div>
                        <h3 className="font-inter font-semibold text-base text-[#262D3B]">Treatment Plan & Education</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <FormInputField
                        label="Patient Education"
                        placeholder="What was explained to the patient..."
                        value={patientInstruction}
                        onChange={(e) => setPatientInstruction(e.target.value)}
                        width="100%"
                    />

                    {/* Medicine Prescribed Table */}
                    <div className="space-y-4 pt-2">
                        <span className="text-sm font-normal text-gray-500 ">Medicine Prescribed <span className="text-[#F6776E]">*</span></span>

                        <div className="space-y-2 pt-1">
                            {/* Header */}
                            <div className="hidden md:grid grid-cols-11 gap-3 py-3 px-2 border border-[#EBECED] rounded-xl text-xs font-semibold text-[#7B8089] items-center">
                                <div className="col-span-2 pl-3">Name</div>
                                <div className="col-span-2">Dosage</div>
                                <div className="col-span-2">Frequency</div>
                                <div className="col-span-2">Timing</div>
                                <div className="col-span-2">Duration</div>
                                <div className="col-span-1 text-center">Action</div>
                            </div>

                            {/* Rows */}
                            {medicines.map((med, idx) => (
                                <div
                                    key={idx}
                                    ref={(el) => {
                                        medicineRowRefs.current[idx] = el;
                                    }}
                                    className="grid grid-cols-1 md:grid-cols-11 gap-2 items-center bg-[#FAFAFA] md:bg-transparent p-0 md:py-0.5 md:px-0 rounded-xl border border-gray-100 md:border-none"
                                >
                                    <div className="col-span-1 md:col-span-2">
                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Name</span>
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
                                    <div className="col-span-1 md:col-span-2">
                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Dosage</span>
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
                                    <div className="col-span-1 md:col-span-2">
                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Frequency</span>
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
                                    <div className="col-span-1 md:col-span-2">
                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Timing</span>
                                        <FormSelectField
                                            label="Timing"
                                            placeholder="Select"
                                            options={TIMING_OPTIONS}
                                            value={med.timing}
                                            onChange={(val) => handleRowChange(idx, "timing", val as string)}
                                            background="white"
                                            hideLabel={true}
                                            width="100%"
                                            error={medicineErrors[idx]?.timing}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <span className="md:hidden block text-xs font-semibold text-[#7B8089] mb-1">Duration</span>
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
                                    <div className="col-span-1 md:col-span-1 flex justify-center pt-2 md:pt-0">
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteRow(idx)}
                                            className="flex items-center justify-center w-6 h-6 rounded-full bg-[#EF4444] text-white hover:bg-red-600 transition-colors font-bold text-[10px] focus:outline-none"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-0 pb-4">
                            <Button
                                variant="primary"
                                size="small"
                                onClick={handleAddRow}
                            // className="bg-[#0B8C00] hover:bg-[#0A7F00] text-xs h-9 px-6 rounded-full font-bold"
                            >
                                Add Row
                            </Button>
                        </div>
                    </div>

                    {/* Footer Advices */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
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
            <div ref={section8Ref} className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 scroll-mt-6">
                <div className="flex items-center justify-between ">
                    <div className="flex items-center gap-3">
                        <div className="w-[30px] h-[30px] rounded-full bg-[#0B8C00] text-white flex items-center justify-center font-inter font-bold text-sm">8</div>
                        <h3 className="font-inter font-semibold text-base text-[#262D3B]">Progress Monitoring (Visit {visitCount})</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#EBECED] rounded-full overflow-hidden">
                            <div className="bg-[#EAB308] h-full" style={{ width: '28%' }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#EAB308]">28% Not Started</span>
                    </div>
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
            {/* ACTION BUTTON CONTROLS */}
            <div className="flex justify-end gap-3 pt-4">
                <Button
                    variant="outline"
                    size="large"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11 px-8 rounded-full font-semibold"
                    onClick={() => alert("Draft saved successfully!")}
                >
                    Save Draft
                </Button>
                <Button
                    variant="primary"
                    size="large"
                    className="bg-[#0B8C00] hover:bg-[#0A7F00] h-11 px-8 rounded-full font-semibold"
                    onClick={handleSaveAndContinue}
                >
                    Submit
                </Button>
            </div>

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

        </div>
    );
}
