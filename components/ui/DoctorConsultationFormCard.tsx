"use client";

import { useState, forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { FormTextareaField } from "./FormTextareaField";
import { PatientTypeButtonGroup } from "./PatientTypeButtonGroup";
import { Tabs } from "./Tabs";
import { FormSelectField } from "./FormSelectField";
import { Button } from "./Button";
import { Tooltip } from "./Tooltip";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { Dialog } from "./Dialog";
import { useAppSelector } from "@/store/hooks";
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
} from "@/lib/medicineUtils";

export interface DoctorConsultationFormCardProps {
    className?: string;
    chiefComplaint: string;
    setChiefComplaint: (val: string) => void;
    symptoms: string;
    setSymptoms: (val: string) => void;
    currentMedication: string;
    setCurrentMedication: (val: string) => void;
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
    doctorNotes?: string;
}

const MEDICINE_OPTIONS = [
    { label: "Triphala Churna", value: "Triphala Churna" },
    { label: "Ashwagandha", value: "Ashwagandha" },
    { label: "Amla Juice", value: "Amla Juice" },
    { label: "Giloy Ghanvati", value: "Giloy Ghanvati" },
    { label: "Chandraprabha Vati", value: "Chandraprabha Vati" },
];

export const DoctorConsultationFormCard = forwardRef<{ validate: () => boolean }, DoctorConsultationFormCardProps>(
    ({
        className = "",
        chiefComplaint,
        setChiefComplaint,
        symptoms,
        setSymptoms,
        currentMedication,
        setCurrentMedication,
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
        doctorNotes = "",
    }, ref) => {
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

        // Validation State
        const [errors, setErrors] = useState<Record<string, string>>({});
        const [medicineErrors, setMedicineErrors] = useState<Record<string, string>[]>([{}]);
        const [isNotesOpen, setIsNotesOpen] = useState(false);

        // Refs for scrolling & focusing
        const chiefComplaintRef = useRef<HTMLTextAreaElement>(null);
        const symptomsRef = useRef<HTMLTextAreaElement>(null);
        const currentMedicationRef = useRef<HTMLTextAreaElement>(null);
        const finalDiagnosisRef = useRef<HTMLTextAreaElement>(null);

        const diabetesRef = useRef<HTMLDivElement>(null);
        const bloodPressureRef = useRef<HTMLDivElement>(null);
        const thyroidRef = useRef<HTMLDivElement>(null);
        const allergyRef = useRef<HTMLDivElement>(null);

        const sittingRef = useRef<HTMLDivElement>(null);
        const standingRef = useRef<HTMLDivElement>(null);
        const walkingRef = useRef<HTMLDivElement>(null);

        const medicineRowRefs = useRef<(HTMLDivElement | null)[]>([]);

        const containerRef = useRef<HTMLDivElement>(null);
        useArrowKeyNavigation(containerRef, true);

        // Auto scroll to top of this card on mount (when Step 2 is active)
        useEffect(() => {
            containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, []);

        // Sync and initialize medicine errors for unmatched medicines
        useEffect(() => {
            if (Array.isArray(medicines)) {
                setMedicineErrors(prev => {
                    const nextErrors = medicines.map((med, idx) => {
                        const currentErr = prev[idx] || {};
                        if (med.unmatchedName && !med.name) {
                            return {
                                ...currentErr,
                                name: `Prescribed Medicine "${med.unmatchedName}" unable to find`
                            };
                        }
                        return currentErr;
                    });
                    return nextErrors;
                });
            }
        }, [medicines]);

        // Expose validation function to parent
        useImperativeHandle(ref, () => ({
            validate: () => {
                const newErrors: Record<string, string> = {};
                let isValid = true;

                // 1. Summary validation
                if (!chiefComplaint.trim()) {
                    newErrors.chiefComplaint = "Chief Complaint is required";
                    isValid = false;
                }
                if (!symptoms.trim()) {
                    newErrors.symptoms = "Symptoms are required";
                    isValid = false;
                }
                if (!currentMedication.trim()) {
                    newErrors.currentMedication = "Current Medication is required";
                    isValid = false;
                }
                if (!finalDiagnosis.trim()) {
                    newErrors.finalDiagnosis = "Final Diagnosis is required";
                    isValid = false;
                }

                // 2. Systemic Review validation
                if (!diabetes) {
                    newErrors.diabetes = "Diabetes Mellitus status is required";
                    isValid = false;
                }
                if (!bloodPressure) {
                    newErrors.bloodPressure = "Blood Pressure status is required";
                    isValid = false;
                }
                if (!thyroid) {
                    newErrors.thyroid = "Thyroid Disorder status is required";
                    isValid = false;
                }
                if (!allergy) {
                    newErrors.allergy = "Allergy History is required";
                    isValid = false;
                }

                // 3. Physical Exam validation
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

                // 4. Medicine rows validation
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
                    // Focus and scroll to first error
                    if (newErrors.chiefComplaint) {
                        chiefComplaintRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => chiefComplaintRef.current?.focus(), 100);
                    } else if (newErrors.symptoms) {
                        symptomsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => symptomsRef.current?.focus(), 100);
                    } else if (newErrors.currentMedication) {
                        currentMedicationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => currentMedicationRef.current?.focus(), 100);
                    } else if (newErrors.finalDiagnosis) {
                        finalDiagnosisRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => finalDiagnosisRef.current?.focus(), 100);
                    } else if (newErrors.diabetes) {
                        diabetesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => diabetesRef.current?.querySelector("button")?.focus(), 100);
                    } else if (newErrors.bloodPressure) {
                        bloodPressureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => bloodPressureRef.current?.querySelector("button")?.focus(), 100);
                    } else if (newErrors.thyroid) {
                        thyroidRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => thyroidRef.current?.querySelector("button")?.focus(), 100);
                    } else if (newErrors.allergy) {
                        allergyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => allergyRef.current?.querySelector("button")?.focus(), 100);
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
                        // Find first row with errors
                        const firstErrIdx = newMedErrors.findIndex(x => Object.keys(x).length > 0);
                        if (firstErrIdx >= 0) {
                            const rowEl = medicineRowRefs.current[firstErrIdx];
                            rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });

                            // Find first missing field in that row and focus its button
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
                    }
                }

                return isValid && isMedValid;
            }
        }));

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

        return (
            <div
                ref={containerRef}
                className={`flex flex-col gap-3 w-full ${className}`}
            >
                {/* Section 1: Summary */}
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#E3EEE1] flex items-center justify-between">
                        <h3 className="font-inter font-semibold text-[#262D3B] text-base">Summary</h3>
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
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormTextareaField
                                ref={chiefComplaintRef}
                                label="Chief Complaint *"
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
                                placeholder="Describe the main complaint..."
                                error={errors.chiefComplaint}
                                height={80}
                                className="!rounded-xl "
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                ref={symptomsRef}
                                label="Symptoms *"
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
                                placeholder="Symptoms"
                                error={errors.symptoms}
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                ref={currentMedicationRef}
                                label="Current Medication *"
                                value={currentMedication}
                                onChange={(e) => {
                                    setCurrentMedication(e.target.value);
                                    if (errors.currentMedication) {
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.currentMedication;
                                            return next;
                                        });
                                    }
                                }}
                                placeholder="Remarks"
                                error={errors.currentMedication}
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                            <FormTextareaField
                                ref={finalDiagnosisRef}
                                label="Final Diagnosis *"
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
                                placeholder="Confirmed diagnosis after investigations ..."
                                error={errors.finalDiagnosis}
                                height={80}
                                className="!rounded-xl"
                                highlightBlack={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Systemic Review & Comorbidities */}
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#E3EEE1]">
                        <h3 className="font-inter font-semibold text-[#262D3B] text-base">Systemic Review & Comorbidities <span className="text-[#F6776E]">*</span></h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                            {/* Diabetes */}
                            <div ref={diabetesRef} className="space-y-1">
                                <span className="block text-[13px] font-semibold text-[#444242]">
                                    Diabetes Mellitus <span className="text-[#F6776E]">*</span>
                                </span>
                                <div className="w-[280px]">
                                    <Tabs
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
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.diabetes}</p>
                                )}
                            </div>

                            {/* Blood Pressure */}
                            <div ref={bloodPressureRef} className="space-y-1">
                                <span className=" text-[13px] font-semibold text-[#444242]">
                                    Blood Pressure <span className="text-[#F6776E]">*</span>
                                </span>
                                <div className="w-full">
                                    <Tabs
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
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.bloodPressure}</p>
                                )}
                            </div>

                            {/* Thyroid */}
                            <div ref={thyroidRef} className="space-y-1">
                                <span className=" text-[13px] font-semibold text-[#444242]">
                                    Thyroid Disorder <span className="text-[#F6776E]">*</span>
                                </span>
                                <div className="w-full">
                                    <Tabs
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
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.thyroid}</p>
                                )}
                            </div>

                            {/* Allergy History */}
                            <div ref={allergyRef} className="space-y-1">
                                <span className=" text-[13px] font-semibold text-[#444242]">
                                    Allergy History <span className="text-[#F6776E]">*</span>
                                </span>
                                <div className="w-full">
                                    <Tabs
                                        options={[
                                            { value: "food", label: "Food" },
                                            { value: "drug", label: "Drug" },
                                            { value: "other", label: "Other" },
                                            { value: "no", label: "No" }
                                        ]}
                                        value={allergy}
                                        onChange={(val) => {
                                            setAllergy(val as "food" | "drug" | "other" | "no" | "");
                                            if (errors.allergy) {
                                                setErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.allergy;
                                                    return next;
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                {errors.allergy && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.allergy}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Physical Examination & Disorders */}
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#E3EEE1]">
                        <h3 className="font-inter font-semibold text-[#262D3B] text-base">Physical Examination & Disorders <span className="text-[#F6776E]">*</span></h3>
                    </div>
                    <div className="p-6">
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
                    </div>
                </div>

                {/* Section 4: Medicine Prescribed */}
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white shadow-[0px_6px_30px_rgba(34,56,43,0.04)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#E3EEE1] flex items-center justify-between">
                        <h3 className="font-inter font-semibold text-[#262D3B] text-base">Medicine Prescribed</h3>
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
                                                            width="100%"
                                                            dropdownWidth="500px"
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
                                    <div className="flex gap-4 items-center w-full ">
                                        <div className="flex-1">
                                            <FormTextareaField
                                                label="Remarks"
                                                placeholder="Remarks"
                                                value={med.remarks || ""}
                                                onChange={(e) => handleRowChange(idx, "remarks", e.target.value)}
                                                height={60}
                                                className="!rounded-xl"
                                                highlightBlack={true}
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

DoctorConsultationFormCard.displayName = "DoctorConsultationFormCard";
