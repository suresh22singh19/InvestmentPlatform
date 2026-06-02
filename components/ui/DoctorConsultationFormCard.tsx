"use client";

import { useState } from "react";
import Image from "next/image";
import { FormInputField } from "./FormInputField";
import { PatientTypeButtonGroup } from "./PatientTypeButtonGroup";
import { FormSelectField } from "./FormSelectField";
import { Button } from "./Button";

export interface DoctorConsultationFormCardProps {
    className?: string;
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

export function DoctorConsultationFormCard({ className = "" }: DoctorConsultationFormCardProps) {
    // Section 1 State
    const [chiefComplaint, setChiefComplaint] = useState("");
    const [symptoms, setSymptoms] = useState("");
    const [currentMedication, setCurrentMedication] = useState("");
    const [finalDiagnosis, setFinalDiagnosis] = useState("");

    // Section 2 State (Systemic Review)
    const [diabetes, setDiabetes] = useState<"yes" | "no" | "">("");
    const [bloodPressure, setBloodPressure] = useState<"high" | "low" | "no" | "">("");
    const [thyroid, setThyroid] = useState<"hypo" | "hyper" | "no" | "">("");
    const [allergy, setAllergy] = useState<"food" | "drug" | "skin" | "no" | "">("");

    // Section 3 State (Physical Exam)
    const [sitting, setSitting] = useState<"normal" | "abnormal" | "">("");
    const [standing, setStanding] = useState<"normal" | "abnormal" | "">("");
    const [walking, setWalking] = useState<"normal" | "abnormal" | "">("");

    // Section 4 State (Medicines)
    const [medicines, setMedicines] = useState([
        { name: "", dosage: "", frequency: "", timing: "", duration: "" },
        { name: "", dosage: "", frequency: "", timing: "", duration: "" },
    ]);

    const handleAddRow = () => {
        setMedicines([...medicines, { name: "", dosage: "", frequency: "", timing: "", duration: "" }]);
    };

    const handleDeleteRow = (index: number) => {
        setMedicines(medicines.filter((_, idx) => idx !== index));
    };

    const handleRowChange = (index: number, field: string, value: string) => {
        const updated = [...medicines];
        updated[index] = { ...updated[index], [field]: value };
        setMedicines(updated);
    };

    return (
        <div className={`rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 ${className}`}>

            {/* Section 1: Summary */}
            <div className="space-y-4">
                <h3 className="font-inter font-semibold text-[#262D3B] text-base ">Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInputField
                        label="Chief Complaint *"
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                        placeholder="Chief Complaint"
                    />
                    <FormInputField
                        label="Symptoms *"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="Symptoms"
                    />
                    <FormInputField
                        label="Current Medication *"
                        value={currentMedication}
                        onChange={(e) => setCurrentMedication(e.target.value)}
                        placeholder="Remarks"
                    />
                    <FormInputField
                        label="Final Diagnosis *"
                        value={finalDiagnosis}
                        onChange={(e) => setFinalDiagnosis(e.target.value)}
                        placeholder="Confirmed diagnosis after investigations..."
                    />
                </div>
            </div>

            {/* Section 2: Systemic Review & Comorbidities */}
            <div className="space-y-4 mt-2">
                <h3 className="font-inter font-semibold text-[#262D3B] text-base ">Systemic Review & Comorbidities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                    {/* Diabetes */}
                    <PatientTypeButtonGroup
                        options={["Yes", "No"]}
                        value={diabetes}
                        onChange={(val) => setDiabetes(val as "yes" | "no")}
                        label="Diabetes Mellitus"
                        required={true}
                    />

                    {/* Blood Pressure */}
                    <PatientTypeButtonGroup
                        options={["High BP", "Low BP", "No"]}
                        value={bloodPressure}
                        onChange={(val) => setBloodPressure(val as "high" | "low" | "no")}
                        label="Blood Pressure"
                        required={true}
                    />

                    {/* Thyroid */}
                    <PatientTypeButtonGroup
                        options={["Hypothyroid", "Hyperthyroid", "No"]}
                        value={thyroid}
                        onChange={(val) => setThyroid(val as "hypo" | "hyper" | "no")}
                        label="Thyroid Disorder"
                        required={true}
                    />

                    {/* Allergy History */}
                    <PatientTypeButtonGroup
                        options={["Food", "Drug", "Skin", "No"]}
                        value={allergy}
                        onChange={(val) => setAllergy(val as "food" | "drug" | "skin" | "no")}
                        label="Allergy History"
                        required={true}
                    />
                </div>
            </div>

            {/* Section 3: Physical Examination & Disorders */}
            <div className="space-y-4 mt-2">
                <h3 className="font-inter font-semibold text-[#262D3B] text-base ">Physical Examination & Disorders </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                    {/* Sitting */}
                    <PatientTypeButtonGroup
                        options={["Normal", "Abnormal"]}
                        value={sitting}
                        onChange={(val) => setSitting(val as "normal" | "abnormal")}
                        label="Sitting"
                        required={true}
                    />

                    {/* Standing */}
                    <PatientTypeButtonGroup
                        options={["Normal", "Abnormal"]}
                        value={standing}
                        onChange={(val) => setStanding(val as "normal" | "abnormal")}
                        label="Standing"
                        required={true}
                    />

                    {/* Walking */}
                    <PatientTypeButtonGroup
                        options={["Normal", "Abnormal"]}
                        value={walking}
                        onChange={(val) => setWalking(val as "normal" | "abnormal")}
                        label="Walking"
                        required={true}
                    />
                </div>
            </div>

            {/* Section 4: Medicine Prescribed */}
            <div className="space-y-4 mt-2">
                <h3 className="font-inter font-semibold text-[#262D3B] text-base ">Medicine Prescribed</h3>

                {/* Responsive Row Grid Layout */}
                <div className="space-y-3">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 gap-3 pb-1 border-b border-gray-50 text-xs font-semibold text-[#7B8089]">
                        <div className="col-span-3 pl-3">Name</div>
                        <div className="col-span-2">Dosage</div>
                        <div className="col-span-2">Frequency</div>
                        <div className="col-span-2">Timing</div>
                        <div className="col-span-2">Duration</div>
                        <div className="col-span-1 text-center">Action</div>
                    </div>

                    {/* Rows */}
                    {medicines.map((med, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#FAFAFA] md:bg-transparent p-3 md:p-0 rounded-xl border border-gray-100 md:border-none">
                            {/* Name */}
                            <div className="col-span-1 md:col-span-3">
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
}
