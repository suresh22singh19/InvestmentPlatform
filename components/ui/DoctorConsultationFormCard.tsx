"use client";

import { useState, forwardRef, useImperativeHandle, useRef } from "react";
import Image from "next/image";
import { FormInputField } from "./FormInputField";
import { PatientTypeButtonGroup } from "./PatientTypeButtonGroup";
import { FormSelectField } from "./FormSelectField";
import { Button } from "./Button";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";

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
    allergy: "food" | "drug" | "skin" | "no" | "";
    setAllergy: (val: "food" | "drug" | "skin" | "no" | "") => void;
    sitting: "normal" | "abnormal" | "";
    setSitting: (val: "normal" | "abnormal" | "") => void;
    standing: "normal" | "abnormal" | "";
    setStanding: (val: "normal" | "abnormal" | "") => void;
    walking: "normal" | "abnormal" | "";
    setWalking: (val: "normal" | "abnormal" | "") => void;
    medicines: Array<{ name: string; dosage: string; frequency: string; timing: string; duration: string }>;
    setMedicines: React.Dispatch<React.SetStateAction<Array<{ name: string; dosage: string; frequency: string; timing: string; duration: string }>>>;
}

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
    }, ref) => {

        // Validation State
        const [errors, setErrors] = useState<Record<string, string>>({});
        const [medicineErrors, setMedicineErrors] = useState<Record<string, string>[]>([{}]);

        // Refs for scrolling & focusing
        const chiefComplaintRef = useRef<HTMLInputElement>(null);
        const symptomsRef = useRef<HTMLInputElement>(null);
        const currentMedicationRef = useRef<HTMLInputElement>(null);
        const finalDiagnosisRef = useRef<HTMLInputElement>(null);

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

                return isValid;
            }
        }));

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

        return (
            <div ref={containerRef} className={`rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 ${className}`}>

                {/* Section 1: Summary */}
                <div className="space-y-4">
                    <h3 className="font-inter font-semibold text-[#262D3B] text-base ">Summary <span className="text-[#F6776E]">*</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInputField
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
                            placeholder="Chief Complaint"
                            error={errors.chiefComplaint}
                        />
                        <FormInputField
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
                        />
                        <FormInputField
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
                        />
                        <FormInputField
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
                            placeholder="Confirmed diagnosis after investigations..."
                            error={errors.finalDiagnosis}
                        />
                    </div>
                </div>

                {/* Section 2: Systemic Review & Comorbidities */}
                <div className="space-y-4 mt-2">
                    <h3 className="font-inter font-semibold text-[#262D3B] text-base ">Systemic Review & Comorbidities  <span className="text-[#F6776E]">*</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                        {/* Diabetes */}
                        <PatientTypeButtonGroup
                            options={["Yes", "No"]}
                            value={diabetes}
                            onChange={(val) => {
                                setDiabetes(val as "yes" | "no");
                                if (errors.diabetes) {
                                    setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.diabetes;
                                        return next;
                                    });
                                }
                            }}
                            label="Diabetes Mellitus"
                            required={true}
                            fieldRef={diabetesRef}
                            error={errors.diabetes}
                        />

                        {/* Blood Pressure */}
                        <PatientTypeButtonGroup
                            options={["High BP", "Low BP", "No"]}
                            value={bloodPressure}
                            onChange={(val) => {
                                setBloodPressure(val as "high" | "low" | "no");
                                if (errors.bloodPressure) {
                                    setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.bloodPressure;
                                        return next;
                                    });
                                }
                            }}
                            label="Blood Pressure"
                            required={true}
                            fieldRef={bloodPressureRef}
                            error={errors.bloodPressure}
                        />

                        {/* Thyroid */}
                        <PatientTypeButtonGroup
                            options={["Hypothyroid", "Hyperthyroid", "No"]}
                            value={thyroid}
                            onChange={(val) => {
                                setThyroid(val as "hypo" | "hyper" | "no");
                                if (errors.thyroid) {
                                    setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.thyroid;
                                        return next;
                                    });
                                }
                            }}
                            label="Thyroid Disorder"
                            required={true}
                            fieldRef={thyroidRef}
                            error={errors.thyroid}
                        />

                        {/* Allergy History */}
                        <PatientTypeButtonGroup
                            options={["Food", "Drug", "Skin", "No"]}
                            value={allergy}
                            onChange={(val) => {
                                setAllergy(val as "food" | "drug" | "skin" | "no");
                                if (errors.allergy) {
                                    setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.allergy;
                                        return next;
                                    });
                                }
                            }}
                            label="Allergy History"
                            required={true}
                            fieldRef={allergyRef}
                            error={errors.allergy}
                        />
                    </div>
                </div>

                {/* Section 3: Physical Examination & Disorders */}
                <div className="space-y-4 mt-2">
                    <h3 className="font-inter font-semibold text-[#262D3B] text-base ">Physical Examination & Disorders <span className="text-[#F6776E]">*</span> </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                        {/* Sitting */}
                        <PatientTypeButtonGroup
                            options={["Normal", "Abnormal"]}
                            value={sitting}
                            onChange={(val) => {
                                setSitting(val as "normal" | "abnormal");
                                if (errors.sitting) {
                                    setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.sitting;
                                        return next;
                                    });
                                }
                            }}
                            label="Sitting"
                            required={true}
                            fieldRef={sittingRef}
                            error={errors.sitting}
                        />

                        {/* Standing */}
                        <PatientTypeButtonGroup
                            options={["Normal", "Abnormal"]}
                            value={standing}
                            onChange={(val) => {
                                setStanding(val as "normal" | "abnormal");
                                if (errors.standing) {
                                    setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.standing;
                                        return next;
                                    });
                                }
                            }}
                            label="Standing"
                            required={true}
                            fieldRef={standingRef}
                            error={errors.standing}
                        />

                        {/* Walking */}
                        <PatientTypeButtonGroup
                            options={["Normal", "Abnormal"]}
                            value={walking}
                            onChange={(val) => {
                                setWalking(val as "normal" | "abnormal");
                                if (errors.walking) {
                                    setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.walking;
                                        return next;
                                    });
                                }
                            }}
                            label="Walking"
                            required={true}
                            fieldRef={walkingRef}
                            error={errors.walking}
                        />
                    </div>
                </div>

                {/* Section 4: Medicine Prescribed */}
                <div className="space-y-4 mt-2">
                    <h3 className="font-inter font-semibold text-[#262D3B] text-base ">Medicine Prescribed <span className="text-[#F6776E]">*</span></h3>

                    {/* Responsive Row Grid Layout */}
                    <div className="space-y-3">
                        {/* Header Row */}
                        <div className="hidden md:grid grid-cols-11 gap-3 py-3 px-4 border border-[#EBECED] rounded-xl text-xs font-semibold text-[#7B8089] items-center">
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
                                className="grid grid-cols-1 md:grid-cols-11 gap-2 items-center bg-[#FAFAFA] md:bg-transparent p-3 md:p-0 rounded-xl border border-gray-100 md:border-none"
                            >
                                {/* Name */}
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

                                {/* Dosage */}
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

                                {/* Frequency */}
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

                                {/* Timing */}
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

                                {/* Duration */}
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

                                {/* Action */}
                                <div className="col-span-1 md:col-span-1 flex justify-center pt-2 md:pt-0">
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteRow(idx)}
                                        className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-red-50 transition-colors focus:outline-none"
                                    >
                                        <Image
                                            src="/icons/ErrorIcon.svg"
                                            alt="Delete Row"
                                            width={20}
                                            height={20}
                                        />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2">
                        <Button
                            variant="primary"
                            size="small"
                            onClick={handleAddRow}
                            className="bg-[#0B8C00] hover:bg-[#0A7F00] text-xs h-9 px-6 rounded-full font-bold"
                        >
                            Add Row
                        </Button>
                    </div>
                </div>

            </div>
        );
    });

DoctorConsultationFormCard.displayName = "DoctorConsultationFormCard";
