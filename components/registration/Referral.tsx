"use client";

import Image from "next/image";
import { FormInputField, FormSelectField, Tooltip } from "@/components/ui";
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
    readOnlyFields?: string[];
    isReferralMobileLoading?: boolean;
    patientType?: string;
    onClearReferral?: () => void;
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
    isReferralMobileLoading = false,
    patientType,
    onClearReferral,
}: ReferralProps) {
    const isFieldReadOnly = (fieldName: string) => {
        return readOnlyFields.includes(fieldName);
    };

    const isSourceDisabled = !patientType || isFieldReadOnly("source");
    const sourcePlaceholder = !patientType ? "Please Select Patient Type First" : "Select";

    const sourceLower = formData.source?.toLowerCase();
    const sourceSlug = sourceLower?.replace(/\s+/g, "-");

    // Show Doctor Specific for HIIMS Doctor or VOPD Doctors
    const showDoctorSpecific =
        sourceSlug === "hiims-doctor" || sourceSlug === "vopd-doctors";

    // Show TV/Newspaper/Social Media specific sub-dropdown
    const showMediaSpecific =
        sourceSlug === "tv" ||
        sourceSlug === "newspaper" ||
        sourceSlug === "social-media";

    const showSpecificField = showDoctorSpecific || showMediaSpecific;

    // Show Referral Mobile + Name when source is Patient Referral (Health Card)
    const showReferralNameMobile = sourceSlug === "patient-referral";

    // "Direct Patient" has no sub-fields
    const isDirectPatient = sourceSlug === "direct-patient";

    const getSpecificFieldOptions = () => {
        switch (sourceSlug) {
            case "tv":
                return tvSpecificFieldOptions;
            case "newspaper":
                return newspaperSpecificFieldOptions;
            case "social-media":
                return socialMediaSpecificFieldOptions;
            case "hiims-doctor":
            case "vopd-doctors":
                return doctorSpecificFieldOptions;
            default:
                return [];
        }
    };

    const getSpecificFieldLabel = () => {
        switch (sourceSlug) {
            case "tv":
                return "TV Specific";
            case "newspaper":
                return "Newspaper Specific";
            case "social-media":
                return "Social Media Specific";
            case "hiims-doctor":
            case "vopd-doctors":
                return "Doctor Specific Name";
            default:
                return "Select";
        }
    };

    const getSpecificFieldRef = () => {
        switch (sourceSlug) {
            case "tv":
                return fieldRefs?.tvSpecificField;
            case "newspaper":
                return fieldRefs?.newspaperSpecificField;
            case "social-media":
                return fieldRefs?.socialMediaSpecificField;
            case "hiims-doctor":
            case "vopd-doctors":
                return fieldRefs?.doctorSpecificField;
            default:
                return undefined;
        }
    };

    const getSpecificFieldValue = () => {
        switch (sourceSlug) {
            case "tv":
                return formData.tvSpecificField || null;
            case "newspaper":
                return formData.newspaperSpecificField || null;
            case "social-media":
                return formData.socialMediaSpecificField || null;
            case "hiims-doctor":
            case "vopd-doctors":
                return formData.doctorSpecificField || null;
            default:
                return null;
        }
    };

    const getSpecificFieldErrorKey = () => {
        switch (sourceSlug) {
            case "tv":
                return "tvSpecificField";
            case "newspaper":
                return "newspaperSpecificField";
            case "social-media":
                return "socialMediaSpecificField";
            case "hiims-doctor":
            case "vopd-doctors":
                return "doctorSpecificField";
            default:
                return "";
        }
    };

    const handleSpecificFieldChange = (
        value: string | string[],
        _selection: SelectOption | SelectOption[] | null
    ) => {
        const selectedValue = Array.isArray(value) ? value[0] : value;
        switch (sourceSlug) {
            case "tv":
                onChange("tvSpecificField" as keyof ReferralFormData, selectedValue || "");
                break;
            case "newspaper":
                onChange("newspaperSpecificField" as keyof ReferralFormData, selectedValue || "");
                break;
            case "social-media":
                onChange("socialMediaSpecificField" as keyof ReferralFormData, selectedValue || "");
                break;
            case "hiims-doctor":
            case "vopd-doctors":
                onChange("doctorSpecificField" as keyof ReferralFormData, selectedValue || "");
                break;
        }
        if (selectedValue) {
            setTimeout(() => {
                const fieldName =
                    sourceSlug === "tv"
                        ? "tvSpecificField"
                        : sourceSlug === "newspaper"
                            ? "newspaperSpecificField"
                            : sourceSlug === "social-media"
                                ? "socialMediaSpecificField"
                                : "doctorSpecificField";
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
        onChange("referralName", "");
        onChange("referralMobile", "");

        // Auto-set the referral flag based on selected source
        const slug = (selectedValue || "").toLowerCase().replace(/\s+/g, "-");
        onChange("referral", slug === "direct-patient" ? "no" : "yes");

        if (selectedValue) {
            setTimeout(() => {
                onBlur?.("source");
            }, 0);
        }
    };

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4 mt-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/Referral.svg" alt="Lead Source" width={20} height={20} /> Lead Source
            </h2>

            {/* Lead Source dropdown — always visible, always required */}
            <div className="mb-4">
                {showSpecificField ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div data-field="source" className="scroll-mt-4" ref={fieldRefs?.source}>
                            <FormSelectField
                                label="Lead Source *"
                                options={sourceOptions}
                                value={formData.source || null}
                                onChange={handleSourceChange}
                                onBlur={() => onBlur?.("source")}
                                placeholder={sourcePlaceholder}
                                disabled={isSourceDisabled}
                                mode="single"
                                background="white"
                            />
                            {errors?.source && (
                                <p className="mt-1 text-xs text-[#F6776E]">{errors.source}</p>
                            )}
                        </div>

                        <div
                            data-field={getSpecificFieldErrorKey()}
                            className="scroll-mt-4"
                            ref={getSpecificFieldRef()}
                        >
                            <FormSelectField
                                label={`${getSpecificFieldLabel()} *`}
                                options={getSpecificFieldOptions()}
                                value={getSpecificFieldValue()}
                                onChange={handleSpecificFieldChange}
                                onBlur={() => {
                                    const fieldName = getSpecificFieldErrorKey();
                                    if (fieldName) onBlur?.(fieldName as keyof ReferralFormData);
                                }}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                            {errors?.[getSpecificFieldErrorKey()] && (
                                <p className="mt-1 text-xs text-[#F6776E]">
                                    {errors[getSpecificFieldErrorKey()]}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div data-field="source" className="scroll-mt-4 w-full" ref={fieldRefs?.source}>
                        <FormSelectField
                            label="Lead Source *"
                            options={sourceOptions}
                            value={formData.source || null}
                            onChange={handleSourceChange}
                            onBlur={() => onBlur?.("source")}
                            placeholder={sourcePlaceholder}
                            disabled={isSourceDisabled}
                            mode="single"
                            background="white"
                        />
                        {errors?.source && (
                            <p className="mt-1 text-xs text-[#F6776E]">{errors.source}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Referral Mobile and Name when "Patient Referral (Health Card)" is selected */}
            {showReferralNameMobile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div data-field="referralMobile" className="scroll-mt-4 relative">
                        <FormInputField
                            ref={fieldRefs?.referralMobile}
                            label="Referral Mobile *"
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
                        {isReferralMobileLoading ? (
                            <div className="absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
                                <svg
                                    className="h-5 w-5 animate-spin text-[#0B8C00]"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                        ) : (Boolean(formData.referralMobile?.trim()) || Boolean(formData.referralName?.trim())) ? (
                            <div className="absolute right-4 top-[10px] z-10">
                                <Tooltip content="Clear Referral Details" position="top">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onChange("referralMobile", "");
                                            onChange("referralName", "");
                                            if (onClearReferral) {
                                                onClearReferral();
                                            }
                                        }}
                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EAECF0] hover:bg-[#D0D5DD] text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </Tooltip>
                            </div>
                        ) : null}
                    </div>

                    <div data-field="referralName" className="scroll-mt-4">
                        <FormInputField
                            ref={fieldRefs?.referralName}
                            label="Referral Name"
                            value={formData.referralName}
                            onChange={(e) => {
                                if (!isFieldReadOnly("referralName")) {
                                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                    onChange("referralName", value);
                                }
                            }}
                            onBlur={() => onBlur?.("referralName")}
                            placeholder="Referral Name"
                            type="text"
                            error={errors?.referralName}
                            disabled={true}
                            readOnly={true}
                        />
                    </div>
                </div>
            )}

            {/* Direct Patient — no sub-fields, just an info note */}
            {/* {isDirectPatient && (
                <p className="text-sm text-[#6B7280] mt-1">
                    Direct walk-in patient — no referral source required.
                </p>
            )} */}
        </div>
    );
}
