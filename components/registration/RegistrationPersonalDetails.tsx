"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { FormInputField, FormSelectField, Checkbox, Tabs, Button, FormTextareaField, Tooltip } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import UpdateContactDialog from "./UpdateContactDialog";
import UpdateHealthCardDialog from "./UpdateHealthCardDialog";
import { sanitizeEmailInput } from "@/lib/utils/emailValidation";

export interface RegistrationPersonalDetailsFormData {
    contactNumber: string;
    whatsappNo: string;
    aadharCardNumber: string;
    patientNameSelect: string;
    patientName: string;
    gender: string;
    age: string;
    maritalStatus: string;
    fathersHusbandsNameSelect: string;
    fathersHusbandsName: string;
    religion: string;
    specificReligion: string;
    occupation: string;
    emailAddress: string;
    jsHealthCardNo: string;
}

interface RegistrationPersonalDetailsProps {
    formData: RegistrationPersonalDetailsFormData;
    onChange: (field: keyof RegistrationPersonalDetailsFormData, value: string) => void;
    onBlur?: (field: keyof RegistrationPersonalDetailsFormData) => void;
    onContactNumberChange?: (value: string) => void;
    titleOptions?: SelectOption[];
    genderOptions?: SelectOption[];
    maritalStatusOptions?: SelectOption[];
    religionOptions?: SelectOption[];
    fieldRefs?: {
        contactNumber?: React.RefObject<HTMLInputElement | null>;
        whatsappNo?: React.RefObject<HTMLInputElement | null>;
        aadharCardNumber?: React.RefObject<HTMLInputElement | null>;
        patientNameSelect?: React.RefObject<HTMLDivElement | null>;
        patientName?: React.RefObject<HTMLInputElement | null>;
        gender?: React.RefObject<HTMLDivElement | null>;
        age?: React.RefObject<HTMLInputElement | null>;
        maritalStatus?: React.RefObject<HTMLDivElement | null>;
        fathersHusbandsNameSelect?: React.RefObject<HTMLDivElement | null>;
        fathersHusbandsName?: React.RefObject<HTMLInputElement | null>;
        religion?: React.RefObject<HTMLDivElement | null>;
        specificReligion?: React.RefObject<HTMLInputElement | null>;
        occupation?: React.RefObject<HTMLInputElement | null>;
        emailAddress?: React.RefObject<HTMLInputElement | null>;
        jsHealthCardNo?: React.RefObject<HTMLInputElement | null>;
        goldPackage?: React.RefObject<HTMLDivElement | null>;
    };
    errors?: Record<string, string>;
    readOnlyFields?: string[]; // Array of field names that should be read-only
    registrationId?: number | string; // Registration ID for updating contact number
    onContactNumberUpdate?: (newContactNumber: string) => void; // Callback when contact number is updated
    onHealthCardUpdate?: (newHealthCardNo: string) => void; // Callback when health card number is updated
    uhid?: string;
    branchId?: number | string;
    isContactLoading?: boolean; // Show loading spinner on contact number field
    showJsHealthCardNo?: boolean; // When false, hide Health Card No. and let Whatsapp No. take its space (e.g. when Patient Type is not Private)
    disableOldContactNumberInDialog?: boolean; // Disable old contact number input inside Update Contact dialog
    /** When true (Address country is not India), email is required — label shows * */
    emailRequiredByAddressCountry?: boolean;
    isNewPatient?: boolean;
    goldPackageStatus?: "Accept" | "Decline" | "";
    setGoldPackageStatus?: (status: "Accept" | "Decline" | "") => void;
    couponCode?: string;
    setCouponCode?: (code: string) => void;
    declineDescription?: string;
    setDeclineDescription?: (desc: string) => void;
    isCouponVerified?: boolean;
    setIsCouponVerified?: (verified: boolean) => void;
    couponError?: string;
    setCouponError?: (err: string) => void;
    declineError?: string;
    setDeclineError?: (err: string) => void;
    goldPackageRef?: React.RefObject<HTMLDivElement | null>;
    isCardSeriesNotAssigned?: boolean;
    arogyaCardSeries?: any;
    source?: string;
}

export default function RegistrationPersonalDetails({
    source = "",
    formData,
    onChange,
    onBlur,
    onContactNumberChange,
    titleOptions = [
        { value: "Mr", label: "Mr" },
        { value: "Mrs", label: "Mrs" },
        { value: "Miss", label: "Miss" },
        { value: "Ms", label: "Ms" },
        { value: "Dr", label: "Dr" },
        { value: "TG", label: "TG" },
    ],
    genderOptions = [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
    ],
    maritalStatusOptions = [
        { value: "single", label: "Single" },
        { value: "married", label: "Married" },
        { value: "divorced", label: "Divorced" },
        { value: "widowed", label: "Widowed" },
    ],
    religionOptions = [
        { value: "hindu", label: "Hindu" },
        { value: "muslim", label: "Muslim" },
        { value: "sikh", label: "Sikh" },
        { value: "buddhists", label: "Buddhists" },
        { value: "jain", label: "Jain" },
        { value: "other", label: "Other" },
    ],
    fieldRefs,
    errors,
    readOnlyFields = [],
    registrationId,
    onContactNumberUpdate,
    onHealthCardUpdate,
    uhid,
    branchId,
    isContactLoading = false,
    showJsHealthCardNo = true,
    disableOldContactNumberInDialog = false,
    emailRequiredByAddressCountry = false,
    isNewPatient = true,
    goldPackageStatus = "",
    setGoldPackageStatus,
    couponCode = "",
    setCouponCode,
    declineDescription = "",
    setDeclineDescription,
    isCouponVerified = false,
    setIsCouponVerified,
    couponError = "",
    setCouponError,
    declineError = "",
    setDeclineError,
    goldPackageRef,
    isCardSeriesNotAssigned = false,
    arogyaCardSeries = null,
}: RegistrationPersonalDetailsProps) {
    const isFieldReadOnly = (fieldName: string) => readOnlyFields.includes(fieldName);
    const [isWhatsappSameAsContact, setIsWhatsappSameAsContact] = useState(false);
    const [isUpdateContactDialogOpen, setIsUpdateContactDialogOpen] = useState(false);
    const [isUpdateHealthCardDialogOpen, setIsUpdateHealthCardDialogOpen] = useState(false);

    const matchingCard = useMemo(() => {
        const jsValue = (formData.jsHealthCardNo || "").trim();
        if (!Array.isArray(arogyaCardSeries) || arogyaCardSeries.length === 0) return null;

        if (!jsValue && arogyaCardSeries.length === 1) return arogyaCardSeries[0];
        if (!jsValue) return null;

        let bestMatch = null;
        let maxMatchLen = 0;

        for (const series of arogyaCardSeries) {
            const sStart = String(series.seriesStart || "").replace(/\D/g, "");
            if (!sStart) continue;

            let matchLen = 0;
            for (let i = 0; i < Math.min(jsValue.length, sStart.length); i++) {
                if (jsValue[i] === sStart[i]) matchLen++;
                else break;
            }

            if (matchLen > maxMatchLen) {
                maxMatchLen = matchLen;
                bestMatch = series;
            }
        }
        return bestMatch;
    }, [arogyaCardSeries, formData.jsHealthCardNo]);

    // Maximum digit length across ALL configured series. We cap the input to this
    // (not the prefix-matched series) so a shorter series matched mid-typing can't
    // block the user from typing the full-length card number. Exact length / range
    // is enforced by the validation schema.
    const maxSeriesDigitLength = useMemo(() => {
        if (!Array.isArray(arogyaCardSeries) || arogyaCardSeries.length === 0) return 12;
        let max = 0;
        for (const series of arogyaCardSeries) {
            const startLen = String(series.seriesStart || "").replace(/\D/g, "").length;
            const endLen = String(series.seriesEnd || "").replace(/\D/g, "").length;
            max = Math.max(max, startLen, endLen);
        }
        return max > 0 ? max : 12;
    }, [arogyaCardSeries]);

    const shouldShowGoldPackage = useMemo(() => {
        if (!isNewPatient || !showJsHealthCardNo || !formData.jsHealthCardNo) return false;
        if (formData.jsHealthCardNo.length !== 12 || errors?.jsHealthCardNo) return false;

        // Lead Source must be selected
        if (!source || !source.trim()) return false;

        // Must find matching card series
        if (!matchingCard) return false;

        // Check package flags based on source selection
        if (source === "Direct Patient") {
            return !!matchingCard.loyalPatientConsultantPackage;
        } else {
            return !!matchingCard.refereePatientConsultantPackage;
        }
    }, [isNewPatient, showJsHealthCardNo, formData.jsHealthCardNo, errors?.jsHealthCardNo, source, matchingCard]);

    // Auto-check "Same as contact number" when both numbers match (e.g. after selecting an existing patient)
    useEffect(() => {
        if (
            formData.contactNumber &&
            formData.whatsappNo &&
            formData.contactNumber === formData.whatsappNo
        ) {
            setIsWhatsappSameAsContact(true);
        }
    }, [formData.contactNumber, formData.whatsappNo]);

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/patientinfo.svg" alt="Patient info" width={20} height={20} /> Personal Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 items-start">
                <div data-field="contactNumber" className="scroll-mt-4 relative">
                    <FormInputField
                        ref={fieldRefs?.contactNumber}
                        label="Contact Number *"
                        value={formData.contactNumber}
                        onChange={(e) => {
                            if (!isFieldReadOnly("contactNumber")) {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                onChange("contactNumber", value);
                                if (isWhatsappSameAsContact) {
                                    onChange("whatsappNo", value);
                                }
                                // Call onContactNumberChange if provided (for checking existing patients)
                                onContactNumberChange?.(value);
                            }
                        }}
                        onBlur={() => onBlur?.("contactNumber")}
                        placeholder="Contact Number"
                        required
                        type="tel"
                        maxLength={10}
                        error={errors?.contactNumber}
                        disabled={isFieldReadOnly("contactNumber")}
                        readOnly={isFieldReadOnly("contactNumber")}
                        className="!pr-12"
                    />
                    {isContactLoading ? (
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
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsUpdateContactDialogOpen(true);
                            }}
                            className="cursor-pointer absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center rounded transition-colors pointer-events-auto"
                            aria-label="Update Contact Number"
                        >
                            <Image
                                src="/icons/EditIconBlack.svg"
                                alt="Edit"
                                width={20}
                                height={20}
                                className="shrink-0"
                            />
                        </button>
                    )}
                </div>

                <div data-field="whatsappNo" className={`scroll-mt-4 flex flex-col justify-end ${!showJsHealthCardNo ? "md:col-span-2 lg:col-span-2" : ""}`}>
                    <FormInputField
                        ref={fieldRefs?.whatsappNo}
                        label="Whatsapp No"
                        value={isWhatsappSameAsContact ? formData.contactNumber : formData.whatsappNo}
                        onChange={(e) => {
                            if (isWhatsappSameAsContact) return;
                            const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                            onChange("whatsappNo", value);
                        }}
                        onBlur={() => onBlur?.("whatsappNo")}
                        placeholder="Whatsapp No"
                        type="tel"
                        maxLength={10}
                        error={errors?.whatsappNo}
                        disabled={isWhatsappSameAsContact ? true : false}
                    />
                    <div className="mt-1 flex items-center justify-end gap-2">
                        <Checkbox
                            checked={isWhatsappSameAsContact}
                            onChange={(checked) => {
                                setIsWhatsappSameAsContact(checked);
                                if (checked) {
                                    onChange("whatsappNo", formData.contactNumber);
                                }
                            }}
                            width={14}
                            height={14}
                        />
                        <label
                            htmlFor="whatsappSameAsContact"
                            className="text-[12px] leading-[120%] text-[#525763] cursor-pointer"
                        >
                            Same as contact number
                        </label>
                    </div>
                </div>

                {showJsHealthCardNo && (() => {
                    // For new patients: disable field until Lead Source is selected
                    const isLeadSourceMissing = isNewPatient && (!source || !source.trim());
                    const isHealthCardDisabled =
                        isFieldReadOnly("jsHealthCardNo") ||
                        isCardSeriesNotAssigned ||
                        isLeadSourceMissing;
                    const healthCardPlaceholder = isCardSeriesNotAssigned
                        ? "No card or series number has been assigned to your current branch"
                        : isLeadSourceMissing
                            ? "Please select Lead Source first"
                            : "Health Card No.";

                    // Show edit icon only when patient is old (!isNewPatient) and has a pre-filled locked active healthcard
                    const showEditHealthCardIcon = !isNewPatient && isFieldReadOnly("jsHealthCardNo") && Boolean(formData.jsHealthCardNo && formData.jsHealthCardNo.trim() !== "");

                    const renderInputField = () => (
                        <FormInputField
                            ref={fieldRefs?.jsHealthCardNo}
                            label={isCardSeriesNotAssigned ? "Health Card No." : "Health Card No. *"}
                            value={formData.jsHealthCardNo}
                            onChange={(e) => {
                                if (!isHealthCardDisabled) {
                                    const expectedMax = Math.max(maxSeriesDigitLength, 12);
                                    const value = e.target.value.replace(/\D/g, "").slice(0, expectedMax);
                                    onChange("jsHealthCardNo", value);
                                }
                            }}
                            onBlur={() => onBlur?.("jsHealthCardNo")}
                            placeholder={healthCardPlaceholder}
                            type="tel"
                            maxLength={Math.max(maxSeriesDigitLength, 12)}
                            error={isCardSeriesNotAssigned || isLeadSourceMissing ? undefined : errors?.jsHealthCardNo}
                            disabled={isHealthCardDisabled}
                            readOnly={isHealthCardDisabled}
                            className={showEditHealthCardIcon ? "!pr-12" : ""}
                        />
                    );

                    const hasAssignedCardValue = Boolean(formData.jsHealthCardNo && formData.jsHealthCardNo.trim() !== "");

                    return (
                        <div data-field="jsHealthCardNo" className="scroll-mt-4 relative flex flex-col gap-1.5">
                            {(isCardSeriesNotAssigned || isLeadSourceMissing) && !hasAssignedCardValue ? (
                                <Tooltip content={healthCardPlaceholder} position="top" delay={0}>
                                    <div className="w-full">{renderInputField()}</div>
                                </Tooltip>
                            ) : (
                                renderInputField()
                            )}
                            {/* {showEditHealthCardIcon && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsUpdateHealthCardDialogOpen(true);
                                    }}
                                    className="cursor-pointer absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center rounded transition-colors pointer-events-auto"
                                    aria-label="Update HealthCard"
                                >
                                    <Image
                                        src="/icons/EditIconBlack.svg"
                                        alt="Edit"
                                        width={20}
                                        height={20}
                                        className="shrink-0"
                                    />
                                </button>
                            )} */}
                        </div>
                    );
                })()}

                {/* <div className="col-span-1 sm:col-span-3 flex gap-4"> */}
                <div data-field="aadharCardNumber" className="scroll-mt-4">
                    <FormInputField
                        ref={fieldRefs?.aadharCardNumber}
                        label="Aadhar Card Number"
                        value={formData.aadharCardNumber}
                        onChange={(e) => {
                            if (!isFieldReadOnly("aadharCardNumber")) {
                                let value = e.target.value.replace(/\D/g, "");
                                // Aadhaar: first digit cannot be 0 or 1 – strip leading 0s and 1s
                                value = value.replace(/^[01]+/, "");
                                value = value.slice(0, 12);
                                onChange("aadharCardNumber", value);
                            }
                        }}
                        onBlur={() => onBlur?.("aadharCardNumber")}
                        placeholder="Aadhar Card Number"
                        type="tel"
                        maxLength={12}
                        disabled={isFieldReadOnly("aadharCardNumber")}
                        readOnly={isFieldReadOnly("aadharCardNumber")}
                        error={errors?.aadharCardNumber}
                    />
                </div>

                <div className="flex-1 flex gap-2">
                    <div
                        data-field="patientNameSelect"
                        className="scroll-mt-4"
                    >
                        <FormSelectField
                            ref={fieldRefs?.patientNameSelect}
                            label="Title *"
                            options={titleOptions}
                            placeholder="Select"
                            background="white"
                            width={115}
                            dropdownWidth={160}
                            value={formData.patientNameSelect}
                            onChange={(value) => {
                                const selectedValue = Array.isArray(value) ? value[0] : value;
                                onChange("patientNameSelect", selectedValue || "");
                                // If a value is selected, immediately mark as touched and validate to clear error
                                if (selectedValue) {
                                    setTimeout(() => {
                                        onBlur?.("patientNameSelect");
                                    }, 0);
                                }
                            }}
                            onBlur={() => onBlur?.("patientNameSelect")}
                        />
                        {errors?.patientNameSelect && (
                            <p className="mt-1 text-xs text-[#F6776E]">{errors.patientNameSelect}</p>
                        )}
                    </div>
                    <div className="flex-1" data-field="patientName">
                        <FormInputField
                            ref={fieldRefs?.patientName}
                            label="Patient Name *"
                            value={formData.patientName}
                            onChange={(e) => {
                                if (!isFieldReadOnly("patientName")) {
                                    // Only allow letters and spaces, prevent leading spaces, max 100 characters
                                    let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                    value = value.replace(/^\s+/, "");
                                    value = value.replace(/(.)\1{2,}/g, "$1$1");
                                    // Ensure first character is uppercase (e.g. "test kumar" -> "Test kumar")
                                    if (value.length > 0) {
                                        value = value.charAt(0).toUpperCase() + value.slice(1);
                                    }
                                    value = value.slice(0, 100);
                                    onChange("patientName", value);
                                }
                            }}
                            onBlur={(e) => {
                                const trimmed = e.target.value.trim();
                                if (!isFieldReadOnly("patientName") && trimmed !== e.target.value) {
                                    onChange("patientName", trimmed);
                                }
                                onBlur?.("patientName");
                            }}
                            placeholder="Patient Name"
                            required
                            type="text"
                            maxLength={100}
                            error={errors?.patientName}
                            disabled={isFieldReadOnly("patientName")}
                            readOnly={isFieldReadOnly("patientName")}
                        />
                    </div>
                </div>

                <div className="flex-1 flex gap-2">
                    <div
                        data-field="fathersHusbandsNameSelect"
                        className="scroll-mt-4"
                    >
                        <FormSelectField
                            ref={fieldRefs?.fathersHusbandsNameSelect}
                            label="Title *"
                            options={titleOptions}
                            placeholder="Select"
                            background="white"
                            width={115}
                            dropdownWidth={160}
                            value={formData.fathersHusbandsNameSelect}
                            onChange={(value) => {
                                const selectedValue = Array.isArray(value) ? value[0] : value;
                                onChange("fathersHusbandsNameSelect", selectedValue || "");
                                // If a value is selected, immediately mark as touched and validate to clear error
                                if (selectedValue) {
                                    setTimeout(() => {
                                        onBlur?.("fathersHusbandsNameSelect");
                                    }, 0);
                                }
                            }}
                            onBlur={() => onBlur?.("fathersHusbandsNameSelect")}
                        />
                        {errors?.fathersHusbandsNameSelect && (
                            <p className="mt-1 text-xs text-[#F6776E]">{errors.fathersHusbandsNameSelect}</p>
                        )}
                    </div>
                    <div className="flex-1" data-field="fathersHusbandsName">
                        <FormInputField
                            ref={fieldRefs?.fathersHusbandsName}
                            label="Father's/Husband's Name *"
                            value={formData.fathersHusbandsName}
                            onChange={(e) => {
                                // Only allow letters and spaces, prevent leading spaces, max 100 characters
                                let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                value = value.replace(/^\s+/, "");
                                value = value.replace(/(.)\1{2,}/g, "$1$1");
                                // Ensure first character is uppercase
                                if (value.length > 0) {
                                    value = value.charAt(0).toUpperCase() + value.slice(1);
                                }
                                value = value.slice(0, 100);
                                onChange("fathersHusbandsName", value);
                            }}
                            onBlur={(e) => {
                                const trimmed = e.target.value.trim();
                                if (trimmed !== e.target.value) {
                                    onChange("fathersHusbandsName", trimmed);
                                }
                                onBlur?.("fathersHusbandsName");
                            }}
                            placeholder="Father's/Husband's Name"
                            required
                            type="text"
                            maxLength={100}
                            error={errors?.fathersHusbandsName}
                        />
                    </div>
                </div>
                {/* </div> */}
                <div data-field="age" className="scroll-mt-4">
                    <FormInputField
                        ref={fieldRefs?.age}
                        label="Age *"
                        value={formData.age}
                        onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, ""); // Only allow digits
                            // Remove leading zeros
                            value = value.replace(/^0+/, "") || "";
                            // Limit to 3 digits max
                            value = value.slice(0, 3);
                            // Ensure value is between 1 and 120
                            if (value && parseInt(value, 10) > 120) {
                                value = "120";
                            }
                            onChange("age", value);
                        }}
                        onBlur={() => onBlur?.("age")}
                        placeholder="Age"
                        required
                        type="tel"
                        maxLength={3}
                        error={errors?.age}
                    />
                </div>

                <div data-field="gender" className="scroll-mt-4">
                    <FormSelectField
                        ref={fieldRefs?.gender}
                        label="Gender *"
                        options={genderOptions}
                        value={formData.gender}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("gender", selectedValue || "");
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("gender");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("gender")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.gender && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.gender}</p>
                    )}
                </div>

                <div data-field="maritalStatus" className="scroll-mt-4">
                    <FormSelectField
                        ref={fieldRefs?.maritalStatus}
                        label="Marital Status *"
                        options={maritalStatusOptions}
                        value={formData.maritalStatus}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("maritalStatus", selectedValue || "");
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("maritalStatus");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("maritalStatus")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.maritalStatus && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.maritalStatus}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div data-field="religion" className="scroll-mt-4">
                    <FormSelectField
                        ref={fieldRefs?.religion}
                        label="Religion *"
                        options={religionOptions}
                        value={formData.religion}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("religion", selectedValue || "");
                            // Clear specificReligion when religion changes away from "Other"
                            if (selectedValue?.toLowerCase() !== "other") {
                                onChange("specificReligion", "");
                            }
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("religion");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("religion")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.religion && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.religion}</p>
                    )}
                </div>

                {formData.religion?.toLowerCase() === "other" && (
                    <div data-field="specificReligion" className="scroll-mt-4">
                        <FormInputField
                            ref={fieldRefs?.specificReligion}
                            label="Specific Religion *"
                            value={formData.specificReligion}
                            onChange={(e) => {
                                if (!isFieldReadOnly("specificReligion")) {
                                    // Only allow letters and spaces, prevent leading spaces, max 100 characters
                                    let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                    value = value.replace(/^\s+/, "");
                                    value = value.replace(/(.)\1{2,}/g, "$1$1");
                                    // Ensure first character is uppercase (e.g. "test kumar" -> "Test kumar")
                                    if (value.length > 0) {
                                        value = value.charAt(0).toUpperCase() + value.slice(1);
                                    }
                                    value = value.slice(0, 100);
                                    onChange("specificReligion", value);
                                }
                            }}
                            onBlur={() => onBlur?.("specificReligion")}
                            placeholder="Specific Religion"
                            required
                            type="text"
                            disabled={isFieldReadOnly("specificReligion")}
                            readOnly={isFieldReadOnly("specificReligion")}
                            error={errors?.specificReligion}
                        />
                    </div>
                )}

                <div data-field="occupation" className="scroll-mt-4">
                    <FormInputField
                        ref={fieldRefs?.occupation}
                        label="Occupation *"
                        value={formData.occupation}
                        onChange={(e) => {
                            // Allow only letters and spaces, max 100 characters
                            let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                            // Ensure first character is uppercase
                            if (value.length > 0) {
                                value = value.charAt(0).toUpperCase() + value.slice(1);
                            }
                            value = value.slice(0, 100);
                            onChange("occupation", value);
                        }}
                        onBlur={() => onBlur?.("occupation")}
                        placeholder="Occupation"
                        required
                        type="text"
                        maxLength={100}
                        error={errors?.occupation}
                    />
                </div>

                <div data-field="emailAddress" className="scroll-mt-4">
                    <FormInputField
                        ref={fieldRefs?.emailAddress}
                        label={emailRequiredByAddressCountry ? "Email Address *" : "Email Address"}
                        value={formData.emailAddress}
                        onChange={(e) => {
                            onChange("emailAddress", sanitizeEmailInput(e.target.value));
                        }}
                        onKeyDown={(e) => {
                            if (e.key === " ") {
                                e.preventDefault();
                            }
                        }}
                        onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData("text");
                            const currentValue = formData.emailAddress || "";
                            onChange("emailAddress", sanitizeEmailInput(`${currentValue}${pastedText}`));
                        }}
                        onBlur={() => onBlur?.("emailAddress")}
                        placeholder="Email Address"
                        type="email"
                        maxLength={100}
                        error={errors?.emailAddress}
                    />
                </div>
            </div>

            {/* Complimentary Health Gold Package Panel */}
            {/* {shouldShowGoldPackage && (
                <div
                    ref={goldPackageRef}
                    data-field="goldPackage"
                    className="mt-6 mb-4  rounded-[16px]  flex flex-col gap-4 transition-all duration-300 scroll-mt-4"
                >
                    <div className="flex items-center gap-2.5">
                        <Image src="/icons/PreBookingCheck.svg" alt="Gold Package" width={18} height={18} />
                        <span className="text-base font-medium leading-[100%] text-[#262D3B] flex gap-2 items-center">
                            <span className="">Complimentary Health Gold Package</span>
                        </span>
                    </div>

                    <div className="w-[300px]">
                        <Tabs
                            options={[
                                { value: "Accept", label: "Accept" },
                                { value: "Decline", label: "Decline" },
                            ]}
                            value={goldPackageStatus}
                            onChange={(val) => {
                                setGoldPackageStatus?.(val as any);
                                if (val === "Accept") {
                                    setDeclineError?.("");
                                } else {
                                    setCouponError?.("");
                                }
                            }}
                            className="self-start"
                        />
                    </div>
                    {goldPackageStatus === "Accept" && (
                        <div className="flex gap-2 items-start mt-3">
                            <div className="flex-1">
                                <FormInputField
                                    label="Coupon Code *"
                                    placeholder="Enter Coupon (e.g. SA15E5)"
                                    value={couponCode}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                                        setCouponCode?.(val);
                                        setIsCouponVerified?.(false);
                                        setCouponError?.("");
                                    }}
                                    suffix={
                                        isCouponVerified ? (
                                            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0B8C00] bg-green-100/50 px-2.5 py-0.5 rounded-full">
                                                <span>✓ Verified</span>
                                            </div>
                                        ) : undefined
                                    }
                                    error={couponError}
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={() => {
                                    if (!couponCode.trim()) {
                                        setCouponError?.("Coupon code is required");
                                        setIsCouponVerified?.(false);
                                        return;
                                    }
                                    if (couponCode.trim().length !== 6 || !/^[a-zA-Z0-9]{6}$/.test(couponCode.trim())) {
                                        setCouponError?.('Coupon code must be exactly 6 characters alphanumeric');
                                        setIsCouponVerified?.(false);
                                        return;
                                    }
                                    setCouponError?.("");
                                    setIsCouponVerified?.(true);
                                }}
                                size="medium"
                                className="h-11 rounded-[32px] text-xs font-semibold shrink-0"
                            >
                                Verify
                            </Button>
                        </div>
                    )}

                    {goldPackageStatus === "Decline" && (
                        <div className="mt-2">
                            <FormTextareaField
                                label="Enter Description for Decline *"
                                placeholder="Enter description for decline..."
                                value={declineDescription}
                                onChange={(e) => {
                                    setDeclineDescription?.(e.target.value.slice(0, 250));
                                    if (e.target.value.trim()) {
                                        setDeclineError?.("");
                                    }
                                }}
                                maxLength={250}
                                rows={3}
                                error={declineError}
                                className="!rounded-xl"
                            />
                        </div>
                    )}
                </div>
            )} */}


            {/* Update Contact Dialog */}
            <UpdateContactDialog
                open={isUpdateContactDialogOpen}
                onClose={() => setIsUpdateContactDialogOpen(false)}
                currentContactNumber={formData.contactNumber?.trim() ? formData.contactNumber : undefined}
                registrationId={registrationId || ""}
                disableOldContactNumber={disableOldContactNumberInDialog}
                onSuccess={(newContactNumber) => {
                    // Don't update the form field - just call callback if provided
                    if (onContactNumberUpdate) {
                        onContactNumberUpdate(newContactNumber);
                    }
                }}
            />

            {/* Update HealthCard Dialog */}
            <UpdateHealthCardDialog
                open={isUpdateHealthCardDialogOpen}
                onClose={() => setIsUpdateHealthCardDialogOpen(false)}
                currentHealthCardNo={formData.jsHealthCardNo?.trim() ? formData.jsHealthCardNo : undefined}
                registrationId={registrationId || ""}
                uhid={uhid || (formData as any)?.uhid || ""}
                phone={formData.contactNumber || ""}
                branchId={branchId}
                arogyaCardSeries={arogyaCardSeries}
                onSuccess={(newHealthCardNo) => {
                    // Do not mutate jsHealthCardNo field since this is only a change request awaiting admin approval
                    if (onHealthCardUpdate) {
                        onHealthCardUpdate(newHealthCardNo);
                    }
                }}
            />
        </div>
    );
}

