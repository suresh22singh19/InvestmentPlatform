"use client";

import Image from "next/image";
import { FormInputField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";

export interface MedicalInformationFormData {
    diabetes: string;
    diabetesRemarks: string;
    htn: string;
    htnRemarks: string;
    coronaryArteryDisease: string;
    coronaryArteryDiseaseRemarks: string;
    thyroid: string;
    thyroidRemarks: string;
    menstrual: string;
    menstrualRemarks: string;
    alcohol: boolean;
    smoking: boolean;
    tobacco: boolean;
    drugs: boolean;
    addictionOther: boolean;
    addictionSpecify: string;
}

interface MedicalInformationProps {
    formData: MedicalInformationFormData;
    onChange: (field: keyof MedicalInformationFormData, value: string | boolean) => void;
    onBlur?: (field: keyof MedicalInformationFormData) => void;
    fieldRefs?: {
        diabetes?: React.RefObject<HTMLDivElement | null>;
        diabetesRemarks?: React.RefObject<HTMLInputElement | null>;
        htn?: React.RefObject<HTMLDivElement | null>;
        htnRemarks?: React.RefObject<HTMLInputElement | null>;
        coronaryArteryDisease?: React.RefObject<HTMLDivElement | null>;
        coronaryArteryDiseaseRemarks?: React.RefObject<HTMLInputElement | null>;
        thyroid?: React.RefObject<HTMLDivElement | null>;
        thyroidRemarks?: React.RefObject<HTMLInputElement | null>;
        menstrual?: React.RefObject<HTMLDivElement | null>;
        menstrualRemarks?: React.RefObject<HTMLInputElement | null>;
        alcohol?: React.RefObject<HTMLInputElement | null>;
        smoking?: React.RefObject<HTMLInputElement | null>;
        tobacco?: React.RefObject<HTMLInputElement | null>;
        drugs?: React.RefObject<HTMLInputElement | null>;
        addictionOther?: React.RefObject<HTMLInputElement | null>;
        addictionSpecify?: React.RefObject<HTMLInputElement | null>;
    };
    errors?: Record<string, string>;
    gender?: string; // Gender value to conditionally show/hide Menstrual field
}

export default function MedicalInformation({
    formData,
    onChange,
    onBlur,
    fieldRefs,
    errors,
    gender,
}: MedicalInformationProps) {
    const yesNoOptions = ["Yes", "No"];

    const handleCheckboxChange = (field: "alcohol" | "smoking" | "tobacco" | "drugs" | "addictionOther", checked: boolean) => {
        onChange(field, checked);
        
        // If "Other" is unchecked, clear the specify field
        if (field === "addictionOther" && !checked) {
            onChange("addictionSpecify", "");
        }
        
        setTimeout(() => {
            onBlur?.(field);
        }, 10);
    };

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/medicalIcon.svg" alt="Medical info" width={20} height={20} /> Medical Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Diabetes */}
                <div data-field="diabetes" className="scroll-mt-4" ref={fieldRefs?.diabetes}>
                    <PatientTypeButtonGroup
                        options={yesNoOptions}
                        value={formData.diabetes}
                        onChange={(value) => {
                            onChange("diabetes", value);
                            setTimeout(() => {
                                onBlur?.("diabetes");
                            }, 10);
                        }}
                        label="Diabetes"
                        error={errors?.diabetes}
                        fieldRef={fieldRefs?.diabetes}
                        dataField="diabetes"
                    />
                </div>

                <div data-field="diabetesRemarks" className="scroll-mt-4">
                    <FormInputField
                        ref={fieldRefs?.diabetesRemarks}
                        label="Remarks"
                        value={formData.diabetesRemarks || ""}
                        onChange={(e) => {
                            onChange("diabetesRemarks", e.target.value);
                        }}
                        onBlur={() => onBlur?.("diabetesRemarks")}
                        placeholder="Remarks Diabetes"
                        type="text"
                        error={errors?.diabetesRemarks}
                    />
                </div>

                {/* HTN (Hypertension) */}
                <div data-field="htn" className="scroll-mt-4" ref={fieldRefs?.htn}>
                    <PatientTypeButtonGroup
                        options={yesNoOptions}
                        value={formData.htn}
                        onChange={(value) => {
                            onChange("htn", value);
                            setTimeout(() => {
                                onBlur?.("htn");
                            }, 10);
                        }}
                        label="HTN (hypertension)"
                        error={errors?.htn}
                        fieldRef={fieldRefs?.htn}
                        dataField="htn"
                    />
                </div>

                <div data-field="htnRemarks" className="scroll-mt-4">
                    <FormInputField
                        ref={fieldRefs?.htnRemarks}
                        label="Remarks"
                        value={formData.htnRemarks || ""}
                        onChange={(e) => {
                            onChange("htnRemarks", e.target.value);
                        }}
                        onBlur={() => onBlur?.("htnRemarks")}
                        placeholder="Remarks HTN"
                        type="text"
                        error={errors?.htnRemarks}
                    />
                </div>

                {/* Coronary Artery Disease */}
                <div data-field="coronaryArteryDisease" className="scroll-mt-4" ref={fieldRefs?.coronaryArteryDisease}>
                    <PatientTypeButtonGroup
                        options={yesNoOptions}
                        value={formData.coronaryArteryDisease}
                        onChange={(value) => {
                            onChange("coronaryArteryDisease", value);
                            setTimeout(() => {
                                onBlur?.("coronaryArteryDisease");
                            }, 10);
                        }}
                        label="Coronary Artery Disease"
                        error={errors?.coronaryArteryDisease}
                        fieldRef={fieldRefs?.coronaryArteryDisease}
                        dataField="coronaryArteryDisease"
                    />
                </div>

                <div data-field="coronaryArteryDiseaseRemarks" className="scroll-mt-4">
                    <FormInputField
                        ref={fieldRefs?.coronaryArteryDiseaseRemarks}
                        label="Remarks"
                        value={formData.coronaryArteryDiseaseRemarks || ""}
                        onChange={(e) => {
                            onChange("coronaryArteryDiseaseRemarks", e.target.value);
                        }}
                        onBlur={() => onBlur?.("coronaryArteryDiseaseRemarks")}
                        placeholder="Remarks Coronary Artery Disease"
                        type="text"
                        error={errors?.coronaryArteryDiseaseRemarks}
                    />
                </div>

                {/* Thyroid */}
                <div data-field="thyroid" className="scroll-mt-4" ref={fieldRefs?.thyroid}>
                    <PatientTypeButtonGroup
                        options={yesNoOptions}
                        value={formData.thyroid}
                        onChange={(value) => {
                            onChange("thyroid", value);
                            setTimeout(() => {
                                onBlur?.("thyroid");
                            }, 10);
                        }}
                        label="Thyroid"
                        error={errors?.thyroid}
                        fieldRef={fieldRefs?.thyroid}
                        dataField="thyroid"
                    />
                </div>

                <div data-field="thyroidRemarks" className="scroll-mt-4">
                    <FormInputField
                        ref={fieldRefs?.thyroidRemarks}
                        label="Remarks"
                        value={formData.thyroidRemarks || ""}
                        onChange={(e) => {
                            onChange("thyroidRemarks", e.target.value);
                        }}
                        onBlur={() => onBlur?.("thyroidRemarks")}
                        placeholder="Remarks Thyroid"
                        type="text"
                        error={errors?.thyroidRemarks}
                    />
                </div>

                {/* Menstrual - Only show for females */}
                {gender?.toLowerCase() !== "male" && (
                    <>
                        <div data-field="menstrual" className="scroll-mt-4" ref={fieldRefs?.menstrual}>
                            <PatientTypeButtonGroup
                                options={yesNoOptions}
                                value={formData.menstrual}
                                onChange={(value) => {
                                    onChange("menstrual", value);
                                    setTimeout(() => {
                                        onBlur?.("menstrual");
                                    }, 10);
                                }}
                                label="Menstrual"
                                error={errors?.menstrual}
                                fieldRef={fieldRefs?.menstrual}
                                dataField="menstrual"
                            />
                        </div>

                        <div data-field="menstrualRemarks" className="scroll-mt-4">
                            <FormInputField
                                ref={fieldRefs?.menstrualRemarks}
                                label="Remarks"
                                value={formData.menstrualRemarks || ""}
                                onChange={(e) => {
                                    onChange("menstrualRemarks", e.target.value);
                                }}
                                onBlur={() => onBlur?.("menstrualRemarks")}
                                placeholder="Remarks Menstrual"
                                type="text"
                                error={errors?.menstrualRemarks}
                            />
                        </div>
                    </>
                )}

                {/* Addiction */}
                <div data-field="alcohol" className="scroll-mt-4 col-span-1 md:col-span-2">
                    <span className="block rounded-full bg-white text-xs font-medium text-[#7B8089] mb-[2px]">
                        Addiction
                    </span>
                    <div className="flex items-center justify-between mt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none relative">
                            <input
                                ref={fieldRefs?.alcohol}
                                type="checkbox"
                                checked={formData.alcohol || false}
                                onChange={(e) => handleCheckboxChange("alcohol", e.target.checked)}
                                onBlur={() => onBlur?.("alcohol")}
                                className="peer h-[14px] w-[14px] appearance-none rounded border border-[#DFE0E2] shrink-0 checked:border-[#0B8C00] checked:bg-[#0B8C00]/10 transition-all"
                            />
                            <svg
                                className="shrink-0 pointer-events-none absolute w-[14px] h-3 text-[#0B8C00] hidden peer-checked:block left-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                Alcohol
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none relative">
                            <input
                                ref={fieldRefs?.smoking}
                                type="checkbox"
                                checked={formData.smoking || false}
                                onChange={(e) => handleCheckboxChange("smoking", e.target.checked)}
                                onBlur={() => onBlur?.("smoking")}
                                className="peer h-[14px] w-[14px] appearance-none rounded border border-[#DFE0E2] shrink-0 checked:border-[#0B8C00] checked:bg-[#0B8C00]/10 transition-all"
                            />
                            <svg
                                className="shrink-0 pointer-events-none absolute w-[14px] h-3 text-[#0B8C00] hidden peer-checked:block left-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                Smoking
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none relative">
                            <input
                                ref={fieldRefs?.tobacco}
                                type="checkbox"
                                checked={formData.tobacco || false}
                                onChange={(e) => handleCheckboxChange("tobacco", e.target.checked)}
                                onBlur={() => onBlur?.("tobacco")}
                                className="peer h-[14px] w-[14px] appearance-none rounded border border-[#DFE0E2] shrink-0 checked:border-[#0B8C00] checked:bg-[#0B8C00]/10 transition-all"
                            />
                            <svg
                                className="shrink-0 pointer-events-none absolute w-[14px] h-3 text-[#0B8C00] hidden peer-checked:block left-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                Tobacco
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none relative">
                            <input
                                ref={fieldRefs?.drugs}
                                type="checkbox"
                                checked={formData.drugs || false}
                                onChange={(e) => handleCheckboxChange("drugs", e.target.checked)}
                                onBlur={() => onBlur?.("drugs")}
                                className="peer h-[14px] w-[14px] appearance-none rounded border border-[#DFE0E2] shrink-0 checked:border-[#0B8C00] checked:bg-[#0B8C00]/10 transition-all"
                            />
                            <svg
                                className="shrink-0 pointer-events-none absolute w-[14px] h-3 text-[#0B8C00] hidden peer-checked:block left-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                Drugs
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none relative">
                            <input
                                ref={fieldRefs?.addictionOther}
                                type="checkbox"
                                checked={formData.addictionOther || false}
                                onChange={(e) => handleCheckboxChange("addictionOther", e.target.checked)}
                                onBlur={() => onBlur?.("addictionOther")}
                                className="peer h-[14px] w-[14px] appearance-none rounded border border-[#DFE0E2] shrink-0 checked:border-[#0B8C00] checked:bg-[#0B8C00]/10 transition-all"
                            />
                            <svg
                                className="shrink-0 pointer-events-none absolute w-[14px] h-3 text-[#0B8C00] hidden peer-checked:block left-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-inter font-normal text-[12px] leading-[120%] text-[#434956]">
                                Other
                            </span>
                        </label>
                    </div>
                    {(errors?.alcohol || errors?.smoking || errors?.tobacco || errors?.drugs || errors?.addictionOther) && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.alcohol || errors.smoking || errors.tobacco || errors.drugs || errors.addictionOther}</p>
                    )}
                </div>

                {/* Specify field - shown only when "Other" is checked */}
                {formData.addictionOther && (
                    <div data-field="addictionSpecify" className="scroll-mt-4 col-span-1 md:col-span-2">
                        <FormInputField
                            ref={fieldRefs?.addictionSpecify}
                            label="Specify"
                            value={formData.addictionSpecify || ""}
                            onChange={(e) => {
                                onChange("addictionSpecify", e.target.value);
                            }}
                            onBlur={() => onBlur?.("addictionSpecify")}
                            placeholder="Please Specify"
                            required
                            type="text"
                            error={errors?.addictionSpecify}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

