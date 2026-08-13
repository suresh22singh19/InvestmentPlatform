"use client";

import Image from "next/image";
import { FormSelectField, FormTextareaField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface DiagnosisInformationFormData {
    diagnosis: string;
    subDiagnosis: string;
    symptoms: string;
}

interface DiagnosisInformationProps {
    formData: DiagnosisInformationFormData;
    onChange: (field: keyof DiagnosisInformationFormData, value: string) => void;
    onBlur?: (field: keyof DiagnosisInformationFormData) => void;
    diagnosisOptions?: SelectOption[];
    subDiagnosisOptions?: SelectOption[];
    fieldRefs?: {
        diagnosis?: React.RefObject<HTMLDivElement | null>;
        subDiagnosis?: React.RefObject<HTMLDivElement | null>;
        symptoms?: React.RefObject<HTMLTextAreaElement | null>;
    };
    errors?: Record<string, string>;
}

export default function DiagnosisInformation({
    formData,
    onChange,
    onBlur,
    diagnosisOptions = [],
    subDiagnosisOptions = [],
    fieldRefs,
    errors,
}: DiagnosisInformationProps) {
    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/patientinfo.svg" alt="Diagnosis info" width={20} height={20} /> Diagnosis Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div data-field="diagnosis" className="scroll-mt-4" ref={fieldRefs?.diagnosis}>
                    <FormSelectField
                        label="Primary Disease *"
                        options={diagnosisOptions}
                        value={formData.diagnosis || null}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("diagnosis", selectedValue || "");
                            // Clear sub-diagnosis when diagnosis changes
                            if (formData.subDiagnosis) {
                                onChange("subDiagnosis", "");
                            }
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("diagnosis");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("diagnosis")}
                        placeholder="Type to search..."
                        mode="single"
                        background="white"
                        error={errors?.diagnosis}
                    />
                </div>

                <div data-field="subDiagnosis" className="scroll-mt-4" ref={fieldRefs?.subDiagnosis}>
                    <FormSelectField
                        label="Secondary Disease *"
                        options={subDiagnosisOptions}
                        value={formData.subDiagnosis || null}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("subDiagnosis", selectedValue || "");
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("subDiagnosis");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("subDiagnosis")}
                        placeholder={!formData.diagnosis ? "First select primary disease" : "Type to search..."}
                        mode="single"
                        background="white"
                        disabled={!formData.diagnosis}
                        error={errors?.subDiagnosis}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
                <div data-field="symptoms" className="scroll-mt-4">
                    <FormTextareaField
                        ref={fieldRefs?.symptoms}
                        label="Symptoms"
                        value={formData.symptoms || ""}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 1000);
                            onChange("symptoms", value);
                        }}
                        onBlur={() => onBlur?.("symptoms")}
                        placeholder="Please enter the symptoms (maximum 1,000 characters)"
                        className="h-[79px]"
                        maxLength={1000}
                        error={errors?.symptoms}
                    />
                    <div className="flex justify-end mt-1 text-[12px] leading-[120%] text-[#7B8089]">
                        Remaining characters : <span className="font-semibold ml-1 text-[#262D3B]">{1000 - (formData.symptoms || "").length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

