"use client";

import Image from "next/image";
import { FormInputField, FormSelectField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface VitalsInformationFormData {
    heightFeet: string;
    heightInch: string;
    weight: string;
    bloodGroup: string;
    allergies: string;
    surgeries: string;
    dietType: string;
    bloodPressure: string;
    sugarLevel: string;
    temperature: string;
    pulse: string;
    spo2: string;
}

interface VitalsInformationProps {
    formData: VitalsInformationFormData;
    onChange: (field: keyof VitalsInformationFormData, value: string) => void;
    onBlur?: (field: keyof VitalsInformationFormData) => void;
    bloodGroupOptions?: SelectOption[];
    dietTypeOptions?: SelectOption[];
    /** When Diet Type select opens; e.g. refetch diet list if API returned no rows. */
    onDietTypeSelectOpen?: () => void;
    fieldRefs?: {
        heightFeet?: React.RefObject<HTMLInputElement | null>;
        heightInch?: React.RefObject<HTMLInputElement | null>;
        weight?: React.RefObject<HTMLInputElement | null>;
        bloodGroup?: React.RefObject<HTMLDivElement | null>;
        allergies?: React.RefObject<HTMLDivElement | null>;
        surgeries?: React.RefObject<HTMLDivElement | null>;
        dietType?: React.RefObject<HTMLDivElement | null>;
        bloodPressure?: React.RefObject<HTMLInputElement | null>;
        sugarLevel?: React.RefObject<HTMLInputElement | null>;
        temperature?: React.RefObject<HTMLInputElement | null>;
        pulse?: React.RefObject<HTMLInputElement | null>;
        spo2?: React.RefObject<HTMLInputElement | null>;
    };
    errors?: Record<string, string>;
    allFieldsOptional?: boolean; // If true, all fields are optional (no asterisks)
}

export default function VitalsInformation({
    formData,
    onChange,
    onBlur,
    allFieldsOptional = false,
    bloodGroupOptions = [
        { value: "a-positive", label: "A+" },
        { value: "a-negative", label: "A-" },
        { value: "b-positive", label: "B+" },
        { value: "b-negative", label: "B-" },
        { value: "ab-positive", label: "AB+" },
        { value: "ab-negative", label: "AB-" },
        { value: "o-positive", label: "O+" },
        { value: "o-negative", label: "O-" },
    ],
    dietTypeOptions = [
        { value: "Vegetarian", label: "Vegetarian" },
        { value: "Non Vegetarian", label: "Non Vegetarian" },
        { value: "Eggetarian", label: "Eggetarian" },
        { value: "Vegan", label: "Vegan" },
        { value: "Others", label: "Others" },
    ],
    fieldRefs,
    errors,
    onDietTypeSelectOpen,
}: VitalsInformationProps) {
    const yesNoOptions = ["Yes", "No"];

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/VitalsIcon.svg" alt="Vital info" width={20} height={20} /> Vital Details
            </h2>

            {/* Height (Feet & Inch) and Weight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex gap-4">
                    <div data-field="heightFeet" className="scroll-mt-4 flex-1" ref={fieldRefs?.heightFeet}>
                        <FormInputField
                            label={allFieldsOptional ? "Height in Feet" : "Height in Feet *"}
                            value={formData.heightFeet}
                            onChange={(e) => {
                                // Only allow digits, limit to 2 digits
                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 2);

                                // Clamp value between 1 and 10
                                let value = digitsOnly;
                                if (digitsOnly) {
                                    const numValue = parseInt(digitsOnly, 10);
                                    if (numValue < 1) {
                                        value = "1";
                                    } else if (numValue > 10) {
                                        value = "10";
                                    } else {
                                        value = String(numValue);
                                    }
                                }

                                onChange("heightFeet", value);
                            }}
                            onBlur={() => onBlur?.("heightFeet")}
                            placeholder="ft"
                            required={!allFieldsOptional}
                            type="tel"
                            maxLength={2}
                            error={errors?.heightFeet}
                        />
                    </div>

                    <div data-field="heightInch" className="scroll-mt-4 flex-1" ref={fieldRefs?.heightInch}>
                        <FormInputField
                            label={allFieldsOptional ? "Height in Inch" : "Height in Inch *"}
                            value={formData.heightInch}
                            onChange={(e) => {
                                // Only allow digits, limit to 2 digits
                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 2);

                                // Clamp value between 0 and 11
                                let value = digitsOnly;
                                if (digitsOnly) {
                                    const numValue = parseInt(digitsOnly, 10);
                                    if (numValue < 0) {
                                        value = "0";
                                    } else if (numValue > 11) {
                                        value = "11";
                                    } else {
                                        value = String(numValue);
                                    }
                                }

                                onChange("heightInch", value);
                            }}
                            onBlur={() => onBlur?.("heightInch")}
                            placeholder="in"
                            required={!allFieldsOptional}
                            type="tel"
                            maxLength={2}
                            error={errors?.heightInch}
                        />
                    </div>
                </div>

                <div data-field="weight" className="scroll-mt-4">
                    <div className="relative w-full">
                        <FormInputField
                            ref={fieldRefs?.weight}
                            label={allFieldsOptional ? "Weight" : "Weight *"}
                            value={formData.weight}
                            onChange={(e) => {
                                // Only allow digits, limit to 3 digits
                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 3);

                                // Clamp value between 1 and 500
                                let value = digitsOnly;
                                if (digitsOnly) {
                                    const numValue = parseInt(digitsOnly, 10);
                                    if (numValue < 1) {
                                        value = "1";
                                    } else if (numValue > 500) {
                                        value = "500";
                                    } else {
                                        value = String(numValue);
                                    }
                                }

                                onChange("weight", value);
                            }}
                            onBlur={() => onBlur?.("weight")}
                            placeholder="Weight"
                            required={!allFieldsOptional}
                            type="tel"
                            className="pr-10"
                            maxLength={3}
                            error={errors?.weight}
                        />
                        <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '44px' }}>
                            kg
                        </span>
                    </div>
                </div>
            </div>

            {/* Blood Group and Allergies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div data-field="bloodGroup" className="scroll-mt-4" ref={fieldRefs?.bloodGroup}>
                    <FormSelectField
                        label="Blood Group *"
                        options={bloodGroupOptions}
                        value={formData.bloodGroup || null}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("bloodGroup", selectedValue || "");
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("bloodGroup");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("bloodGroup")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.bloodGroup && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.bloodGroup}</p>
                    )}
                </div>

                <div data-field="allergies" className="scroll-mt-4" ref={fieldRefs?.allergies}>
                    <PatientTypeButtonGroup
                        options={yesNoOptions}
                        value={formData.allergies}
                        onChange={(value) => {
                            onChange("allergies", value);
                            setTimeout(() => {
                                onBlur?.("allergies");
                            }, 0);
                        }}
                        label={allFieldsOptional ? "Allergies" : "Allergies"}
                        required={!allFieldsOptional}
                        error={errors?.allergies}
                        fieldRef={fieldRefs?.allergies}
                        dataField="allergies"
                    />
                </div>
            </div>

            {/* Surgeries and Diet Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div data-field="surgeries" className="scroll-mt-4" ref={fieldRefs?.surgeries}>
                    <PatientTypeButtonGroup
                        options={yesNoOptions}
                        value={formData.surgeries}
                        onChange={(value) => {
                            onChange("surgeries", value);
                            setTimeout(() => {
                                onBlur?.("surgeries");
                            }, 0);
                        }}
                        label={allFieldsOptional ? "Surgeries" : "Surgeries"}
                        required={!allFieldsOptional}
                        error={errors?.surgeries}
                        fieldRef={fieldRefs?.surgeries}
                        dataField="surgeries"
                    />
                </div>

                <div data-field="dietType" className="scroll-mt-4" ref={fieldRefs?.dietType}>
                    <FormSelectField
                        label={allFieldsOptional ? "Diet Type" : "Diet Type *"}
                        options={dietTypeOptions}
                        value={formData.dietType || null}
                        onOpen={onDietTypeSelectOpen}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("dietType", selectedValue || "");
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("dietType");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("dietType")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.dietType && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.dietType}</p>
                    )}
                </div>
            </div>

            {/* Blood Pressure and Sugar Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div data-field="bloodPressure" className="scroll-mt-4">
                    <div className="relative w-full">
                        <FormInputField
                            ref={fieldRefs?.bloodPressure}
                            label={allFieldsOptional ? "Blood Pressure" : "Blood Pressure *"}
                            value={formData.bloodPressure}
                            onChange={(e) => {
                                // Remove all non-digit characters
                                const digitsOnly = e.target.value.replace(/\D/g, "");
                                
                                // Limit to 6 digits total (3 before slash + 3 after slash)
                                const limitedDigits = digitsOnly.slice(0, 6);
                                
                                let formattedValue = "";
                                if (limitedDigits.length <= 3) {
                                    // If 3 or fewer digits, just show them
                                    formattedValue = limitedDigits;
                                } else {
                                    // If more than 3 digits, format as XXX/XXX
                                    const systolic = limitedDigits.slice(0, 3);
                                    const diastolic = limitedDigits.slice(3);
                                    formattedValue = `${systolic}/${diastolic}`;
                                }
                                
                                onChange("bloodPressure", formattedValue);
                            }}
                            onBlur={() => onBlur?.("bloodPressure")}
                            placeholder="Systolic/Diastolic(mmHg/mmHg)"
                            required={!allFieldsOptional}
                            type="text"
                            className="pr-10"
                            maxLength={7}
                            error={errors?.bloodPressure}
                        />
                        <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '44px' }}>
                            mmHg
                        </span>
                    </div>
                </div>

                <div data-field="sugarLevel" className="scroll-mt-4">
                    <div className="relative w-full">
                        <FormInputField
                            ref={fieldRefs?.sugarLevel}
                            label={allFieldsOptional ? "Sugar Level" : "Sugar Level *"}
                            value={formData.sugarLevel}
                            onChange={(e) => {
                                // Only allow digits, limit to 3 digits
                                const value = e.target.value.replace(/\D/g, "").slice(0, 3);
                                onChange("sugarLevel", value);
                            }}
                            onBlur={() => onBlur?.("sugarLevel")}
                            placeholder="Sugar Level"
                            required={!allFieldsOptional}
                            type="tel"
                            className="pr-10"
                            maxLength={3}
                            error={errors?.sugarLevel}
                        />
                        <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '44px' }}>
                            mg/dL
                        </span>
                    </div>
                </div>
            </div>

            {/* Temperature, Pulse, and SPO2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 mb-4">
                <div data-field="temperature" className="scroll-mt-4">
                    <div className="relative w-full">
                        <FormInputField
                            ref={fieldRefs?.temperature}
                            label={allFieldsOptional ? "Temperature" : "Temperature *"}
                            value={formData.temperature}
                            onChange={(e) => {
                                // Only allow digits, limit to 3 digits
                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 3);
                                
                                // Prevent typing values greater than 110
                                let value = digitsOnly;
                                if (digitsOnly) {
                                    const numValue = parseInt(digitsOnly, 10);
                                    if (numValue > 110) {
                                        value = "110";
                                    } else {
                                        value = digitsOnly;
                                    }
                                }
                                
                                onChange("temperature", value);
                            }}
                            onBlur={() => onBlur?.("temperature")}
                            placeholder="Temperature (°F)"
                            required={!allFieldsOptional}
                            type="tel"
                            className="pr-10"
                            maxLength={3}
                            error={errors?.temperature}
                        />
                        <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '44px' }}>
                            °F
                        </span>
                    </div>
                </div>

                <div data-field="pulse" className="scroll-mt-4">
                    <div className="relative w-full">
                        <FormInputField
                            ref={fieldRefs?.pulse}
                            label="Pulse"
                            value={formData.pulse}
                            onChange={(e) => {
                                // Only allow digits, limit to 3 digits
                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 3);

                                // Enforce maximum value 200
                                let value = digitsOnly;
                                if (digitsOnly) {
                                    const numValue = parseInt(digitsOnly, 10);
                                    if (numValue > 200) {
                                        value = "200";
                                    }
                                }

                                onChange("pulse", value);
                            }}
                            onBlur={() => onBlur?.("pulse")}
                            placeholder="Pulse"
                            type="tel"
                            className="pr-10"
                            maxLength={3}
                            error={errors?.pulse}
                        />
                        <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '44px' }}>
                            bpm
                        </span>
                    </div>
                </div>

                <div data-field="spo2" className="scroll-mt-4">
                    <div className="relative w-full">
                        <FormInputField
                            ref={fieldRefs?.spo2}
                            label="SPO2"
                            value={formData.spo2}
                            onChange={(e) => {
                                // Only allow digits, limit to 3 digits
                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 3);

                                // Enforce maximum value 100
                                let value = digitsOnly;
                                if (digitsOnly) {
                                    const numValue = parseInt(digitsOnly, 10);
                                    if (numValue > 100) {
                                        value = "100";
                                    }
                                }

                                onChange("spo2", value);
                            }}
                            onBlur={() => onBlur?.("spo2")}
                            placeholder="SPO2"
                            type="tel"
                            className="pr-10"
                            maxLength={3}
                            error={errors?.spo2}
                        />
                        <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '44px' }}>
                            %
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

