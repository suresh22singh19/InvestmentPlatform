"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { FormInputField, FormSelectField, Checkbox } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import UpdateContactDialog from "./UpdateContactDialog";
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
    };
    errors?: Record<string, string>;
    readOnlyFields?: string[]; // Array of field names that should be read-only
    registrationId?: number | string; // Registration ID for updating contact number
    onContactNumberUpdate?: (newContactNumber: string) => void; // Callback when contact number is updated
    isContactLoading?: boolean; // Show loading spinner on contact number field
    showJsHealthCardNo?: boolean; // When false, hide JS Health Card No. and let Whatsapp No. take its space (e.g. when Patient Type is not Private)
    disableOldContactNumberInDialog?: boolean; // Disable old contact number input inside Update Contact dialog
    /** When true (Address country is not India), email is required — label shows * */
    emailRequiredByAddressCountry?: boolean;
}

export default function RegistrationPersonalDetails({
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
    isContactLoading = false,
    showJsHealthCardNo = true,
    disableOldContactNumberInDialog = false,
    emailRequiredByAddressCountry = false,
}: RegistrationPersonalDetailsProps) {
    const isFieldReadOnly = (fieldName: string) => readOnlyFields.includes(fieldName);
    const [isWhatsappSameAsContact, setIsWhatsappSameAsContact] = useState(false);
    const [isUpdateContactDialogOpen, setIsUpdateContactDialogOpen] = useState(false);

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

                {showJsHealthCardNo && (
                    <div data-field="jsHealthCardNo" className="scroll-mt-4">
                        <FormInputField
                            ref={fieldRefs?.jsHealthCardNo}
                            label="JS Health Card No. *"
                            value={formData.jsHealthCardNo}
                            onChange={(e) => {
                            if (!isFieldReadOnly("jsHealthCardNo")) {
                                // Only allow digits, exactly 12 digits (50503030 + 4 digits)
                                const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                                onChange("jsHealthCardNo", value);
                            }
                        }}
                        onBlur={() => onBlur?.("jsHealthCardNo")}
                        placeholder="JS Health Card No."
                        type="tel"
                        maxLength={12}
                            error={errors?.jsHealthCardNo}
                            disabled={isFieldReadOnly("jsHealthCardNo")}
                            readOnly={isFieldReadOnly("jsHealthCardNo")}
                        />
                    </div>
                )}

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
                                const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                onChange("specificReligion", value);
                            }}
                            onBlur={() => onBlur?.("specificReligion")}
                            placeholder="Specific Religion"
                            required
                            type="text"
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
        </div>
    );
}

