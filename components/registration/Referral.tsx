"use client";

import Image from "next/image";
import { FormInputField, FormSelectField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface ReferralFormData {
    referral: string;
    source: string;
    tvSpecificField?: string;
    newspaperSpecificField?: string;
    socialMediaSpecificField?: string;
    doctorSpecificField?: string;
    referralName: string;
    referralMobile: string;
}

interface ReferralProps {
    formData: ReferralFormData;
    onChange: (field: keyof ReferralFormData, value: string) => void;
    onBlur?: (field: keyof ReferralFormData) => void;
    sourceOptions?: SelectOption[];
    tvSpecificFieldOptions?: SelectOption[];
    newspaperSpecificFieldOptions?: SelectOption[];
    socialMediaSpecificFieldOptions?: SelectOption[];
    doctorSpecificFieldOptions?: SelectOption[];
    fieldRefs?: {
        referral?: React.RefObject<HTMLDivElement | null>;
        source?: React.RefObject<HTMLDivElement | null>;
    tvSpecificField?: React.RefObject<HTMLDivElement | null>;
    newspaperSpecificField?: React.RefObject<HTMLDivElement | null>;
    socialMediaSpecificField?: React.RefObject<HTMLDivElement | null>;
    doctorSpecificField?: React.RefObject<HTMLDivElement | null>;
    referralName?: React.RefObject<HTMLInputElement | null>;
        referralMobile?: React.RefObject<HTMLInputElement | null>;
    };
    errors?: Record<string, string>;
    readOnlyFields?: string[]; // Array of field names that should be read-only
}

export default function Referral({
    formData,
    onChange,
    onBlur,
    sourceOptions = [],
    tvSpecificFieldOptions = [],
    newspaperSpecificFieldOptions = [],
    socialMediaSpecificFieldOptions = [],
    doctorSpecificFieldOptions = [],
    fieldRefs,
    errors,
    readOnlyFields = [],
}: ReferralProps) {
    const isFieldReadOnly = (fieldName: string) => {
        return readOnlyFields.includes(fieldName);
    };
    const referralOptions = ["Yes", "No"];
    const showSourceFields = formData.referral?.toLowerCase() === "yes";
    const sourceLower = formData.source?.toLowerCase();
    // Show referral name and mobile fields when source is "patient" (Referral) or "other"
    const showReferralNameMobile = showSourceFields && (sourceLower === "patient" || sourceLower === "other");
    const showSpecificField = showSourceFields && 
        (sourceLower === "tv" || sourceLower === "newspaper" || 
         sourceLower === "social-media" || sourceLower === "doctor");

    const getSpecificFieldOptions = () => {
        switch (formData.source) {
            case "tv":
                return tvSpecificFieldOptions;
            case "newspaper":
                return newspaperSpecificFieldOptions;
            case "social-media":
                return socialMediaSpecificFieldOptions;
            case "doctor":
                return doctorSpecificFieldOptions;
            default:
                return [];
        }
    };

    const getSpecificFieldLabel = () => {
        switch (formData.source) {
            case "tv":
                return "TV Specific";
            case "newspaper":
                return "Newspaper Specific";
            case "social-media":
                return "Social Media Specific";
            case "doctor":
                return "Doctor Specific";
            default:
                return "Select";
        }
    };

    const getSpecificFieldRef = () => {
        switch (formData.source) {
            case "tv":
                return fieldRefs?.tvSpecificField;
            case "newspaper":
                return fieldRefs?.newspaperSpecificField;
            case "social-media":
                return fieldRefs?.socialMediaSpecificField;
            case "doctor":
                return fieldRefs?.doctorSpecificField;
            default:
                return undefined;
        }
    };

    const getSpecificFieldValue = () => {
        switch (formData.source) {
            case "tv":
                return formData.tvSpecificField || null;
            case "newspaper":
                return formData.newspaperSpecificField || null;
            case "social-media":
                return formData.socialMediaSpecificField || null;
            case "doctor":
                return formData.doctorSpecificField || null;
            default:
                return null;
        }
    };

    const handleSpecificFieldChange = (
        value: string | string[],
        _selection: SelectOption | SelectOption[] | null
    ) => {
        const selectedValue = Array.isArray(value) ? value[0] : value;
        const sourceLower = formData.source?.toLowerCase();
        switch (sourceLower) {
            case "tv":
                onChange("tvSpecificField" as keyof ReferralFormData, selectedValue || "");
                break;
            case "newspaper":
                onChange("newspaperSpecificField" as keyof ReferralFormData, selectedValue || "");
                break;
            case "social-media":
                onChange("socialMediaSpecificField" as keyof ReferralFormData, selectedValue || "");
                break;
            case "doctor":
                onChange("doctorSpecificField" as keyof ReferralFormData, selectedValue || "");
                break;
        }
        if (selectedValue) {
            setTimeout(() => {
                const fieldName = sourceLower === "tv" ? "tvSpecificField" :
                                 sourceLower === "newspaper" ? "newspaperSpecificField" :
                                 sourceLower === "social-media" ? "socialMediaSpecificField" :
                                 "doctorSpecificField";
                onBlur?.(fieldName as keyof ReferralFormData);
            }, 0);
        }
    };

    const handleSourceChange = (
        value: string | string[],
        _selection: SelectOption | SelectOption[] | null
    ) => {
        const selectedValue = Array.isArray(value) ? value[0] : value;
        onChange("source", selectedValue || "");
        // Clear all specific fields when source changes
        onChange("tvSpecificField" as keyof ReferralFormData, "");
        onChange("newspaperSpecificField" as keyof ReferralFormData, "");
        onChange("socialMediaSpecificField" as keyof ReferralFormData, "");
        onChange("doctorSpecificField" as keyof ReferralFormData, "");
        // Clear referral name and mobile when switching to "other" or "patient" (Referral) (they will be filled fresh)
        if (selectedValue === "other" || selectedValue?.toLowerCase() === "patient") {
            onChange("referralName", "");
            onChange("referralMobile", "");
        }
        if (selectedValue) {
            setTimeout(() => {
                onBlur?.("source");
            }, 0);
        }
    };

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/Referral.svg" alt="Referral" width={20} height={20} /> Referral
            </h2>

            {/* Referral Yes/No */}
            <div className="mb-4 w-1/3">
                <PatientTypeButtonGroup
                    options={referralOptions}
                    value={formData.referral}
                    onChange={(value) => {
                        onChange("referral", value);
                        // Clear all fields when "No" is selected
                        if (value === "no") {
                            onChange("source", "");
                            onChange("tvSpecificField" as keyof ReferralFormData, "");
                            onChange("newspaperSpecificField" as keyof ReferralFormData, "");
                            onChange("socialMediaSpecificField" as keyof ReferralFormData, "");
                            onChange("doctorSpecificField" as keyof ReferralFormData, "");
                            onChange("referralName", "");
                            onChange("referralMobile", "");
                        }
                        setTimeout(() => {
                            onBlur?.("referral");
                        }, 0);
                    }}
                    label="Referral"
                    error={errors?.referral}
                    fieldRef={fieldRefs?.referral}
                    dataField="referral"
                />
            </div>

            {/* Conditional fields when "Yes" is selected */}
            {showSourceFields && (
                <>
                    {/* Source and Specific field in one row when both are visible */}
                    {showSpecificField ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div data-field="source" className="scroll-mt-4" ref={fieldRefs?.source}>
                                <FormSelectField
                                    label="Source"
                                    options={sourceOptions}
                                    value={formData.source || null}
                                    onChange={handleSourceChange}
                                    onBlur={() => onBlur?.("source")}
                                    placeholder="Select"
                                    mode="single"
                                    background="white"
                                />
                                {errors?.source && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.source}</p>
                                )}
                            </div>

                            <div 
                                data-field={`${formData.source}SpecificField`} 
                                className="scroll-mt-4" 
                                ref={getSpecificFieldRef()}
                            >
                                <FormSelectField
                                    label={getSpecificFieldLabel()}
                                    options={getSpecificFieldOptions()}
                                    value={getSpecificFieldValue()}
                                    onChange={handleSpecificFieldChange}
                                    onBlur={() => {
                                        const sourceLower = formData.source?.toLowerCase();
                                        const fieldName = sourceLower === "tv" ? "tvSpecificField" :
                                                         sourceLower === "newspaper" ? "newspaperSpecificField" :
                                                         sourceLower === "social-media" ? "socialMediaSpecificField" :
                                                         "doctorSpecificField";
                                        onBlur?.(fieldName as keyof ReferralFormData);
                                    }}
                                    placeholder="Select"
                                    mode="single"
                                    background="white"
                                />
                                {errors?.[`${formData.source}SpecificField`] && (
                                    <p className="mt-1 text-xs text-[#F6776E]">
                                        {errors[`${formData.source}SpecificField`]}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Source dropdown alone when specific field is not shown */
                        <div className="mb-4">
                            <div data-field="source" className="scroll-mt-4" ref={fieldRefs?.source}>
                                <FormSelectField
                                    label="Source"
                                    options={sourceOptions}
                                    value={formData.source || null}
                                    onChange={handleSourceChange}
                                    onBlur={() => onBlur?.("source")}
                                    placeholder="Select"
                                    mode="single"
                                    background="white"
                                />
                                {errors?.source && (
                                    <p className="mt-1 text-xs text-[#F6776E]">{errors.source}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Referral Mobile and Name when "Other" is selected in Source */}
                    {showReferralNameMobile && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div data-field="referralMobile" className="scroll-mt-4">
                                <FormInputField
                                    ref={fieldRefs?.referralMobile}
                                    label="Referral Mobile"
                                    value={formData.referralMobile}
                                    onChange={(e) => {
                                        if (!isFieldReadOnly("referralMobile")) {
                                            const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                            onChange("referralMobile", value);
                                        }
                                    }}
                                    onBlur={() => onBlur?.("referralMobile")}
                                    placeholder="Referral Mobile"
                                    type="tel"
                                    maxLength={10}
                                    error={errors?.referralMobile}
                                    disabled={isFieldReadOnly("referralMobile")}
                                    readOnly={isFieldReadOnly("referralMobile")}
                                />
                            </div>

                            <div data-field="referralName" className="scroll-mt-4">
                                <FormInputField
                                    ref={fieldRefs?.referralName}
                                    label="Referral Name"
                                    value={formData.referralName}
                                    onChange={(e) => {
                                        if (!isFieldReadOnly("referralName")) {
                                            // Only allow letters and spaces, remove numbers and special characters
                                            const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                            onChange("referralName", value);
                                        }
                                    }}
                                    onBlur={() => onBlur?.("referralName")}
                                    placeholder="Referral Name"
                                    type="text"
                                    error={errors?.referralName}
                                    disabled={isFieldReadOnly("referralName")}
                                    readOnly={isFieldReadOnly("referralName")}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

