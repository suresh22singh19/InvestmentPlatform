"use client";

import { useRef, useMemo } from "react";
import { FormikProps } from "formik";
import { BackToPreviousPageButton } from "@/components/ui";
import RegistrationPersonalDetails from "@/components/registration/RegistrationPersonalDetails";
import { AddressDetails } from "@/components/forms";
import PatientType from "@/components/registration/PatientType";
import Referral from "@/components/registration/Referral";
import AppointmentInformation from "@/components/registration/AppointmentInformation";
import type { SelectOption } from "@/components/ui/FormSelectField";
import type { RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import { isValidEmailAddress } from "@/lib/utils/emailValidation";
import { useGetDoctorsQuery } from "@/store/api/registrationApi";

interface PersonalFormProps {
    formik: FormikProps<RegistrationPersonalDetailsFormValues>;
    getFormErrors: () => Record<string, string>;
    scrollToFirstError: (errorsOverride?: Record<string, string>) => void;
    onNext: () => void;
    onBack?: () => void;
    sourceOptions: SelectOption[];
    tvSpecificFieldOptions: SelectOption[];
    newspaperSpecificFieldOptions: SelectOption[];
    socialMediaSpecificFieldOptions: SelectOption[];
    onContactNumberChange?: (field: string, value: string) => void;
    onAadharCardNumberChange?: (value: string) => void;
    onJsHealthCardNoChange?: (value: string) => void;
    onReferralMobileChange?: (value: string) => void;
    readOnlyFields?: string[]; // Array of field names that should be read-only
    submitButtonText?: string; // Optional custom text for submit button
    /** When set, called instead of onNext after step 1 validation succeeds (e.g. hospital single-step + voucher). */
    onValidatedContinue?: () => void | Promise<void>;
    isNextDisabled?: boolean; // Disable the Save & Next button (e.g. gate entry required)
    hideReferral?: boolean; // Hide the Referral section (e.g. for existing patients with UHID)
    isContactLoading?: boolean; // Show loading spinner on contact number field
    isReferralMobileLoading?: boolean; // Show loading spinner on referral mobile field
    /** When provided (including `[]`), Doctor options use this list (e.g. `getDoctorsList` for `registrationBranchId`). Omit to use auth-branch `getDoctors`. */
    branchDoctorOptions?: SelectOption[];
    /** Pass through to PatientType — panel list API is scoped by branch. */
    panelsBranchId?: number;
}

export default function PersonalForm({
    formik,
    getFormErrors,
    scrollToFirstError,
    onNext,
    onBack,
    sourceOptions,
    tvSpecificFieldOptions,
    newspaperSpecificFieldOptions,
    socialMediaSpecificFieldOptions,
    onContactNumberChange,
    onAadharCardNumberChange,
    onJsHealthCardNoChange,
    onReferralMobileChange,
    readOnlyFields = [],
    submitButtonText = "Save & Next",
    onValidatedContinue,
    isNextDisabled = false,
    hideReferral = false,
    isContactLoading = false,
    isReferralMobileLoading = false,
    branchDoctorOptions,
    panelsBranchId,
}: PersonalFormProps) {
    const formRef = useRef<HTMLFormElement>(null);

    const useBranchDoctorList = branchDoctorOptions !== undefined;
    const { data: doctorsDataFallback } = useGetDoctorsQuery(undefined, { skip: useBranchDoctorList });

    const doctorOptions: SelectOption[] = useMemo(() => {
        if (useBranchDoctorList) {
            return branchDoctorOptions ?? [];
        }
        const rows = doctorsDataFallback?.data;
        if (!Array.isArray(rows) || rows.length === 0) return [];
        return rows.map((doctor) => {
            const doctorName = doctor.name || doctor.userName || "";
            const id = doctor.id || "";
            return {
                value: String(id),
                label: doctorName,
            };
        });
    }, [useBranchDoctorList, branchDoctorOptions, doctorsDataFallback]);

    // Refs for form fields
    const contactNumberRef = useRef<HTMLInputElement>(null);
    const whatsappNoRef = useRef<HTMLInputElement>(null);
    const aadharCardNumberRef = useRef<HTMLInputElement>(null);
    const patientNameSelectRef = useRef<HTMLDivElement>(null);
    const patientNameRef = useRef<HTMLInputElement>(null);
    const genderRef = useRef<HTMLDivElement>(null);
    const ageRef = useRef<HTMLInputElement>(null);
    const maritalStatusRef = useRef<HTMLDivElement>(null);
    const fathersHusbandsNameSelectRef = useRef<HTMLDivElement>(null);
    const fathersHusbandsNameRef = useRef<HTMLInputElement>(null);
    const religionRef = useRef<HTMLDivElement>(null);
    const occupationRef = useRef<HTMLInputElement>(null);
    const emailAddressRef = useRef<HTMLInputElement>(null);
    const jsHealthCardNoRef = useRef<HTMLInputElement>(null);

    // Address field refs
    const pinCodeRef = useRef<HTMLInputElement>(null);
    const countryRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef<HTMLDivElement>(null);
    const cityRef = useRef<HTMLDivElement>(null);
    const tehsilRef = useRef<HTMLDivElement>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    const addressRef = useRef<HTMLInputElement>(null);
    const addressLine1Ref = useRef<HTMLInputElement>(null);
    const addressLine2Ref = useRef<HTMLInputElement>(null);

    // Patient Type field refs
    const patientTypeRef = useRef<HTMLDivElement>(null);
    const patientSubTypeRef = useRef<HTMLDivElement>(null);
    const panelIdRef = useRef<HTMLDivElement>(null);
    const benificiaryIdRef = useRef<HTMLInputElement>(null);
    const insuranceCompanyRef = useRef<HTMLInputElement>(null);
    const ayushCoveredRef = useRef<HTMLDivElement>(null);

    // Referral field refs
    const referralRef = useRef<HTMLDivElement>(null);
    const sourceRef = useRef<HTMLDivElement>(null);
    const tvSpecificFieldRef = useRef<HTMLDivElement>(null);
    const newspaperSpecificFieldRef = useRef<HTMLDivElement>(null);
    const socialMediaSpecificFieldRef = useRef<HTMLDivElement>(null);
    const doctorSpecificFieldRef = useRef<HTMLDivElement>(null);
    const referralNameRef = useRef<HTMLInputElement>(null);
    const referralMobileRef = useRef<HTMLInputElement>(null);

    // Appointment Information field refs
    const doctorRef = useRef<HTMLDivElement>(null);
    const appointmentDateRef = useRef<HTMLDivElement>(null);
    const timeSlotRef = useRef<HTMLDivElement>(null);

    return (
        <form
            ref={formRef}
            noValidate
            onSubmit={async (e) => {
                e.preventDefault();
                
                // Check for Aadhar Card "already exists" error first - prevent submission
                if (formik.errors.aadharCardNumber === "Aadhar Card No. already exists") {
                    // Mark field as touched to ensure error is visible
                    formik.setFieldTouched("aadharCardNumber", true, false);
                    // Scroll to Aadhar Card field
                    if (aadharCardNumberRef.current) {
                        setTimeout(() => {
                            aadharCardNumberRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            aadharCardNumberRef.current?.focus();
                        }, 100);
                    }
                    return;
                }

                // Check for JS Health Card "already assigned" error - prevent submission
                if (formik.errors.jsHealthCardNo === "JS Health Card No. already assigned to another patient") {
                    formik.setFieldTouched("jsHealthCardNo", true, false);
                    if (jsHealthCardNoRef.current) {
                        setTimeout(() => {
                            jsHealthCardNoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            jsHealthCardNoRef.current?.focus();
                        }, 100);
                    }
                    return;
                }
                
                // Define fields for Step 1 (Personal Info)
                const step1Fields = [
                    'contactNumber', 'patientNameSelect', 'patientName', 'gender', 'age',
                    'maritalStatus', 'fathersHusbandsNameSelect', 'fathersHusbandsName',
                    'religion', 'occupation', 'emailAddress', 'pinCode', 'country', 'state', 'city', 'tehsil', 'area', 'address',
                    'addressLine1', 'addressLine2',
                    'patientType', 'doctor', 'appointmentDate', 'timeSlot', 'aadharCardNumber', 'jsHealthCardNo'
                ];
                
                // Mark step 1 fields as touched
                step1Fields.forEach(field => {
                    formik.setFieldTouched(field, true, false);
                });
                
                // Validate only step 1 fields
                const errors = await formik.validateForm();
                const step1Errors: Record<string, string> = {};
                
                step1Fields.forEach(field => {
                    const error = errors[field as keyof typeof errors];
                    if (error && typeof error === 'string') {
                        step1Errors[field] = error;
                    }
                });
                
                // Check Aadhar Card Number: if entered, must be exactly 12 digits
                if (formik.values.aadharCardNumber && formik.values.aadharCardNumber.trim() !== '') {
                    const aadharValue = formik.values.aadharCardNumber.trim();
                    if (aadharValue.length !== 12 || !/^\d+$/.test(aadharValue)) {
                        step1Errors.aadharCardNumber = 'Aadhar Card Number must be exactly 12 digits';
                        formik.setFieldTouched('aadharCardNumber', true, false);
                    }
                }
                
                // JS Health Card No.: required when Patient Type is Private; format must be 12 digits starting with 50503030
                if (formik.values.patientType?.toLowerCase() === "private") {
                    const jsValue = (formik.values.jsHealthCardNo || "").trim();
                    if (!jsValue) {
                        step1Errors.jsHealthCardNo = "JS Health Card No. is required";
                        formik.setFieldTouched("jsHealthCardNo", true, false);
                    } else if (jsValue.length !== 12 || !/^50503030\d{4}$/.test(jsValue)) {
                        step1Errors.jsHealthCardNo =
                            "JS Health Card No. must be exactly 12 digits starting with 50503030";
                        formik.setFieldTouched("jsHealthCardNo", true, false);
                    }
                }

                // Check Email Address: if entered, must be valid email format
                if (formik.values.emailAddress && formik.values.emailAddress.trim() !== '') {
                    const emailValue = formik.values.emailAddress.trim();
                    if (!isValidEmailAddress(emailValue)) {
                        step1Errors.emailAddress = 'Please enter a valid email address';
                        formik.setFieldTouched('emailAddress', true, false);
                    }
                }
                
                // Check conditional fields based on form values
                if (formik.values.religion === 'other' && !formik.values.specificReligion) {
                    step1Errors.specificReligion = 'Specific Religion is required';
                    formik.setFieldTouched('specificReligion', true, false);
                }
                
                
                if (!hideReferral && formik.values.referral?.toLowerCase() === 'yes') {
                    if (!formik.values.source) {
                        step1Errors.source = 'Source is required';
                        formik.setFieldTouched('source', true, false);
                    }
                    
                    if (formik.values.source === 'tv' && !formik.values.tvSpecificField) {
                        step1Errors.tvSpecificField = 'TV Specific field is required';
                        formik.setFieldTouched('tvSpecificField', true, false);
                    }
                    if (formik.values.source === 'newspaper' && !formik.values.newspaperSpecificField) {
                        step1Errors.newspaperSpecificField = 'Newspaper Specific field is required';
                        formik.setFieldTouched('newspaperSpecificField', true, false);
                    }
                    if (formik.values.source === 'social-media' && !formik.values.socialMediaSpecificField) {
                        step1Errors.socialMediaSpecificField = 'Social Media Specific field is required';
                        formik.setFieldTouched('socialMediaSpecificField', true, false);
                    }
                    if (formik.values.source === 'doctor' && !formik.values.doctorSpecificField) {
                        step1Errors.doctorSpecificField = 'Doctor Specific field is required';
                        formik.setFieldTouched('doctorSpecificField', true, false);
                    }
                    // Require referral name and mobile when source is "patient" (Referral) or "other"
                    if (formik.values.source?.toLowerCase() === 'patient' || formik.values.source === 'other') {
                        if (!formik.values.referralName) {
                            step1Errors.referralName = 'Referral Name is required';
                            formik.setFieldTouched('referralName', true, false);
                        }
                        if (!formik.values.referralMobile) {
                            step1Errors.referralMobile = 'Referral Mobile is required';
                            formik.setFieldTouched('referralMobile', true, false);
                        }
                    }
                }
                
                // Check Panel: if patientType is "panel", panelId is required
                if (formik.values.patientType?.toLowerCase() === 'panel') {
                    if (!formik.values.panelId || formik.values.panelId.trim() === '') {
                        step1Errors.panelId = 'Panel is required';
                        formik.setFieldTouched('panelId', true, false);
                    }
                }
                
                // Check if Aadhar Card error exists in the errors object
                if (step1Errors.aadharCardNumber === "Aadhar Card No. already exists" || formik.errors.aadharCardNumber === "Aadhar Card No. already exists") {
                    // Prioritize Aadhar Card error - scroll to it first
                    if (aadharCardNumberRef.current) {
                        setTimeout(() => {
                            aadharCardNumberRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            aadharCardNumberRef.current?.focus();
                        }, 100);
                    }
                    return;
                }

                // Check if JS Health Card error exists
                if (formik.errors.jsHealthCardNo === "JS Health Card No. already assigned to another patient") {
                    if (jsHealthCardNoRef.current) {
                        setTimeout(() => {
                            jsHealthCardNoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            jsHealthCardNoRef.current?.focus();
                        }, 100);
                    }
                    return;
                }
                
                if (Object.keys(step1Errors).length > 0) {
                    formik.setErrors({ ...formik.errors, ...step1Errors });
                    scrollToFirstError(step1Errors);
                    return;
                }
                
                // Double-check for Aadhar Card error before proceeding (in case it's not in validation errors)
                if (formik.errors.aadharCardNumber === "Aadhar Card No. already exists") {
                    formik.setFieldTouched("aadharCardNumber", true, false);
                    if (aadharCardNumberRef.current) {
                        setTimeout(() => {
                            aadharCardNumberRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            aadharCardNumberRef.current?.focus();
                        }, 100);
                    }
                    return;
                }

                // Second pass: Private patient type must have valid JS Health Card No. before leaving step
                if (formik.values.patientType?.toLowerCase() === "private") {
                    const jsValue = (formik.values.jsHealthCardNo || "").trim();
                    if (!jsValue || jsValue.length !== 12 || !/^50503030\d{4}$/.test(jsValue)) {
                        const msg = !jsValue
                            ? "JS Health Card No. is required"
                            : "JS Health Card No. must be exactly 12 digits starting with 50503030";
                        formik.setFieldError("jsHealthCardNo", msg);
                        formik.setFieldTouched("jsHealthCardNo", true, false);
                        if (jsHealthCardNoRef.current) {
                            setTimeout(() => {
                                jsHealthCardNoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                                jsHealthCardNoRef.current?.focus();
                            }, 100);
                        }
                        return;
                    }
                }

                if (onValidatedContinue) {
                    await Promise.resolve(onValidatedContinue());
                } else {
                    onNext();
                }
            }}
            className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] p-5 mb-4"
        >
            <h3 className="font-inter font-semibold text-[24px] leading-[120%] text-[#262D3B] mb-4">Personal Info</h3>

            {/* Patient Type Component - at top of Personal Info */}
            <PatientType
                panelsBranchId={panelsBranchId}
                formData={{
                    patientType: formik.values.patientType || "",
                    patientSubType: formik.values.patientSubType || "",
                    panelId: formik.values.panelId || "",
                    benificiaryId: formik.values.benificiaryId || "",
                    insuranceCompany: formik.values.insuranceCompany || "",
                    ayushCovered: formik.values.ayushCovered || "",
                }}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // For select fields, if a value is selected, mark as touched and validate immediately
                    const selectFields = ["patientSubType", "panelId"];
                    if (selectFields.includes(field) && value && value.trim() !== "") {
                        setTimeout(() => {
                            const currentValue = formik.values[field as keyof typeof formik.values];
                            if (currentValue === value || String(currentValue) === String(value)) {
                                formik.setFieldTouched(field, true, false);
                                formik.validateField(field);
                            } else {
                                setTimeout(() => {
                                    formik.setFieldTouched(field, true, false);
                                    formik.validateField(field);
                                }, 50);
                            }
                        }, 10);
                    }

                    // For button group fields (patientType, ayushCovered), validate immediately
                    const buttonFields = ["patientType", "ayushCovered"];
                    if (buttonFields.includes(field)) {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }

                    // For input fields: if field was previously invalid, validate on change
                    const inputFields = ["benificiaryId", "insuranceCompany"];
                    if (inputFields.includes(field)) {
                        const isTouched = formik.touched[field as keyof typeof formik.touched];
                        const hasError = formik.errors[field as keyof typeof formik.errors];

                        if (isTouched && hasError) {
                            setTimeout(() => {
                                formik.validateField(field);
                            }, 0);
                        }
                    }
                }}
                onBlur={(field) => {
                    formik.setFieldTouched(field, true, false);
                    formik.validateField(field);
                }}
                fieldRefs={{
                    patientType: patientTypeRef,
                    patientSubType: patientSubTypeRef,
                    panelId: panelIdRef,
                    benificiaryId: benificiaryIdRef,
                    insuranceCompany: insuranceCompanyRef,
                    ayushCovered: ayushCoveredRef,
                }}
                errors={getFormErrors()}
            />

            {/* Personal Details Component */}
            <RegistrationPersonalDetails
                showJsHealthCardNo={formik.values.patientType?.toLowerCase() === "private"}
                emailRequiredByAddressCountry={
                    Boolean(formik.values.country) && formik.values.country !== "6"
                }
                formData={{
                    contactNumber: formik.values.contactNumber || "",
                    whatsappNo: formik.values.whatsappNo || "",
                    aadharCardNumber: formik.values.aadharCardNumber || "",
                    patientNameSelect: formik.values.patientNameSelect || "",
                    patientName: formik.values.patientName || "",
                    gender: formik.values.gender || "",
                    age: formik.values.age || "",
                    maritalStatus: formik.values.maritalStatus || "",
                    fathersHusbandsNameSelect: formik.values.fathersHusbandsNameSelect || "",
                    fathersHusbandsName: formik.values.fathersHusbandsName || "",
                    religion: formik.values.religion || "",
                    specificReligion: formik.values.specificReligion || "",
                    occupation: formik.values.occupation || "",
                    emailAddress: formik.values.emailAddress || "",
                    jsHealthCardNo: formik.values.jsHealthCardNo || "",
                }}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // For select fields, if a value is selected, mark as touched and validate immediately
                    const selectFields = ["gender", "maritalStatus", "religion"];
                    if (selectFields.includes(field) && value && value.trim() !== "") {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 0);
                    }

                    // Special handling for Aadhar Card Number - check if it exists when 12 digits are entered
                    if (field === "aadharCardNumber") {
                        const trimmedValue = value?.trim() || "";
                        
                        // Always check when 12 digits are entered (every time, no matter what)
                        if (trimmedValue.length === 12) {
                            // Always check - don't prevent duplicate calls, check every time
                            if (onAadharCardNumberChange) {
                                onAadharCardNumberChange(trimmedValue);
                            }
                        } else if (trimmedValue.length < 12) {
                            // Clear error if Aadhar Card is not 12 digits yet
                            const currentError = formik.errors.aadharCardNumber;
                            if (currentError === "Aadhar Card No. already exists") {
                                formik.setFieldError("aadharCardNumber", undefined);
                            }
                        }
                        
                        // Skip validation for Aadhar Card if it has API error (to prevent clearing it)
                        // Don't validate Aadhar Card if it has the "Aadhar Card No. already exists" error
                        const isTouched = formik.touched.aadharCardNumber;
                        const hasError = formik.errors.aadharCardNumber;
                        if (isTouched && hasError && formik.errors.aadharCardNumber === "Aadhar Card No. already exists") {
                            // Don't validate - keep the error
                            return;
                        }
                    }

                    // JS Health Card No.: notify parent on every change (series length + assignment checks use full value)
                    if (field === "jsHealthCardNo") {
                        const trimmedValue = value?.trim() || "";
                        if (onJsHealthCardNoChange) {
                            onJsHealthCardNoChange(trimmedValue);
                        } else if (trimmedValue.length < 12) {
                            const currentError = formik.errors.jsHealthCardNo;
                            if (currentError === "JS Health Card No. already assigned to another patient") {
                                formik.setFieldError("jsHealthCardNo", undefined);
                            }
                        }
                        if (
                            formik.touched.jsHealthCardNo &&
                            formik.errors.jsHealthCardNo === "JS Health Card No. already assigned to another patient"
                        ) {
                            return;
                        }
                    }
                    
                    // For input fields: if field was previously invalid (touched and had error), validate on change
                    const inputFields = ["contactNumber", "whatsappNo", "aadharCardNumber", "patientName", "age", "fathersHusbandsName", "occupation", "jsHealthCardNo"];
                    if (inputFields.includes(field)) {
                        const isTouched = formik.touched[field as keyof typeof formik.touched];
                        const hasError = formik.errors[field as keyof typeof formik.errors];

                        if (isTouched && hasError) {
                            setTimeout(() => {
                                formik.validateField(field);
                            }, 0);
                        }
                    }
                    
                    // Email: re-run Yup after value commits (required/format by country); clear errors while typing
                    if (field === "emailAddress") {
                        const touched = formik.touched.emailAddress;
                        const err = formik.errors.emailAddress;
                        if (touched || err) {
                            setTimeout(() => {
                                void formik.validateField("emailAddress");
                            }, 0);
                        }
                    }
                }}
                onContactNumberChange={(value) => {
                    if (!onContactNumberChange) return;

                    // Always notify parent on every change so it can clear gate entry error
                    onContactNumberChange("contactNumber", value || "");
                }}
                onBlur={(field) => {
                    formik.setFieldTouched(field, true, false);
                    
                    // Special handling for Aadhar Card No. - check if it exists on blur
                    if (field === "aadharCardNumber") {
                        const aadharValue = formik.values.aadharCardNumber?.trim() || "";
                        if (aadharValue.length === 12 && onAadharCardNumberChange) {
                            onAadharCardNumberChange(aadharValue);
                        }
                    }
                    
                    // Don't validate Aadhar Card if it has the "Aadhar Card No. already exists" error
                    if (field === "aadharCardNumber" && formik.errors.aadharCardNumber === "Aadhar Card No. already exists") {
                        // Don't validate - keep the error
                        return;
                    }

                    // JS Health Card No.: sync parent on blur (series API / assignment)
                    if (field === "jsHealthCardNo") {
                        const jsValue = formik.values.jsHealthCardNo?.trim() || "";
                        if (onJsHealthCardNoChange) {
                            onJsHealthCardNoChange(jsValue);
                        }
                        if (formik.errors.jsHealthCardNo === "JS Health Card No. already assigned to another patient") {
                            return;
                        }
                    }
                    
                    formik.validateField(field);
                }}
                fieldRefs={{
                    contactNumber: contactNumberRef,
                    whatsappNo: whatsappNoRef,
                    aadharCardNumber: aadharCardNumberRef,
                    patientNameSelect: patientNameSelectRef,
                    patientName: patientNameRef,
                    gender: genderRef,
                    age: ageRef,
                    maritalStatus: maritalStatusRef,
                    fathersHusbandsNameSelect: fathersHusbandsNameSelectRef,
                    fathersHusbandsName: fathersHusbandsNameRef,
                    religion: religionRef,
                    occupation: occupationRef,
                    emailAddress: emailAddressRef,
                    jsHealthCardNo: jsHealthCardNoRef,
                }}
                errors={getFormErrors()}
                readOnlyFields={readOnlyFields}
                isContactLoading={isContactLoading}
            />

            {/* Address Details Component */}
            <AddressDetails
                formData={{
                    pinCode: formik.values.pinCode || "",
                    country: formik.values.country || "",
                    state: formik.values.state || "",
                    city: formik.values.city || "",
                    tehsil: (formik.values as any).tehsil || "",
                    area: (formik.values as any).area || "",
                    address: formik.values.address || "",
                    addressLine1: (formik.values as any).addressLine1 || "",
                    addressLine2: (formik.values as any).addressLine2 || "",
                }}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    if (field === "country") {
                        setTimeout(() => {
                            formik.validateField("emailAddress");
                        }, 10);
                    }

                    // For select fields only (country, state, city, tehsil, area), if a value is selected, mark as touched and validate immediately
                    const selectFields = ["country", "state", "city", "tehsil", "area"] as string[];
                    if (selectFields.includes(field) && value && value.trim() !== "") {
                        setTimeout(() => {
                            const currentValue = formik.values[field as keyof typeof formik.values];
                            if (currentValue === value || String(currentValue) === String(value)) {
                                formik.setFieldTouched(field, true, false);
                                formik.validateField(field);
                            } else {
                                setTimeout(() => {
                                    formik.setFieldTouched(field, true, false);
                                    formik.validateField(field);
                                }, 50);
                            }
                        }, 10);
                    }

                    // For input fields: if field was previously invalid (touched and had error), validate on change
                    const inputFields = ["pinCode", "address", "addressLine1", "addressLine2"];
                    if (inputFields.includes(field)) {
                        const isTouched = formik.touched[field as keyof typeof formik.touched];
                        const hasError = formik.errors[field as keyof typeof formik.errors];

                        if (isTouched && hasError) {
                            setTimeout(() => {
                                formik.validateField(field);
                            }, 0);
                        }
                    }
                }}
                onBlur={(field) => {
                    formik.setFieldTouched(field, true, false);
                    formik.validateField(field);
                }}
                title="Address Information"
                iconSrc="/icons/addressicon.svg"
                iconAlt="Address info"
                fieldRefs={{
                    pinCode: pinCodeRef,
                    country: countryRef,
                    state: stateRef,
                    city: cityRef,
                    tehsil: tehsilRef,
                    area: areaRef,
                    address: addressRef,
                    addressLine1: addressLine1Ref,
                    addressLine2: addressLine2Ref,
                }}
                errors={getFormErrors()}
            />

            {/* Referral Component — hidden for existing patients with UHID */}
            {!hideReferral && <Referral
                formData={{
                    referral: formik.values.referral || "",
                    source: formik.values.source || "",
                    tvSpecificField: formik.values.tvSpecificField || "",
                    newspaperSpecificField: formik.values.newspaperSpecificField || "",
                    socialMediaSpecificField: formik.values.socialMediaSpecificField || "",
                    doctorSpecificField: formik.values.doctorSpecificField || "",
                    referralName: formik.values.referralName || "",
                    referralMobile: formik.values.referralMobile || "",
                }}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // For select fields, if a value is selected, mark as touched and validate immediately
                    const selectFields = ["source", "tvSpecificField", "newspaperSpecificField", "socialMediaSpecificField", "doctorSpecificField"];
                    if (selectFields.includes(field) && value && value.trim() !== "") {
                        setTimeout(() => {
                            const currentValue = formik.values[field as keyof typeof formik.values];
                            if (currentValue === value || String(currentValue) === String(value)) {
                                formik.setFieldTouched(field, true, false);
                                formik.validateField(field);
                            } else {
                                setTimeout(() => {
                                    formik.setFieldTouched(field, true, false);
                                    formik.validateField(field);
                                }, 50);
                            }
                        }, 10);
                    }

                    // When source changes, clear validation errors for referralName and referralMobile if source is not "other" or "patient" (Referral)
                    if (field === "source") {
                        const sourceLower = value?.toLowerCase();
                        if (sourceLower !== "other" && sourceLower !== "patient") {
                            // Clear errors and touched state for referral fields when source is not "other" or "patient" (Referral)
                            setTimeout(() => {
                                if (formik.errors.referralName) {
                                    formik.setFieldError("referralName", undefined);
                                }
                                if (formik.errors.referralMobile) {
                                    formik.setFieldError("referralMobile", undefined);
                                }
                                // Clear touched state so errors don't reappear
                                formik.setFieldTouched("referralName", false, false);
                                formik.setFieldTouched("referralMobile", false, false);
                            }, 0);
                        }
                    }

                    // For button group fields (referral), validate immediately
                    const buttonFields = ["referral"];
                    if (buttonFields.includes(field)) {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }
                    
                    // When referral changes to "no", clear validation errors for referral fields
                    if (field === "referral" && value?.toLowerCase() === "no") {
                        setTimeout(() => {
                            if (formik.errors.referralName) {
                                formik.setFieldError("referralName", undefined);
                            }
                            if (formik.errors.referralMobile) {
                                formik.setFieldError("referralMobile", undefined);
                            }
                            formik.setFieldTouched("referralName", false, false);
                            formik.setFieldTouched("referralMobile", false, false);
                        }, 0);
                    }

                    // For input fields: only validate on change if field was previously touched and had an error
                    const inputFields = ["referralName", "referralMobile"];
                    if (inputFields.includes(field)) {
                        const isTouched = formik.touched[field as keyof typeof formik.touched];
                        const hasError = formik.errors[field as keyof typeof formik.errors];

                        // Only validate if field was already touched and had an error (to clear error when user fixes it)
                        if (isTouched && hasError) {
                            setTimeout(() => {
                                formik.validateField(field);
                            }, 0);
                        }
                    }

                    // Call onReferralMobileChange when referralMobile changes
                    if (field === "referralMobile" && onReferralMobileChange) {
                        onReferralMobileChange(value);
                    }
                }}
                onBlur={(field) => {
                    formik.setFieldTouched(field, true, false);
                    formik.validateField(field);
                }}
                sourceOptions={sourceOptions}
                doctorSpecificFieldOptions={doctorOptions}
                tvSpecificFieldOptions={tvSpecificFieldOptions}
                newspaperSpecificFieldOptions={newspaperSpecificFieldOptions}
                socialMediaSpecificFieldOptions={socialMediaSpecificFieldOptions}
                fieldRefs={{
                    referral: referralRef,
                    source: sourceRef,
                    tvSpecificField: tvSpecificFieldRef,
                    newspaperSpecificField: newspaperSpecificFieldRef,
                    socialMediaSpecificField: socialMediaSpecificFieldRef,
                    doctorSpecificField: doctorSpecificFieldRef,
                    referralName: referralNameRef,
                    referralMobile: referralMobileRef,
                }}
                errors={getFormErrors()}
                readOnlyFields={readOnlyFields}
                isReferralMobileLoading={isReferralMobileLoading}
            />}

            {/* Appointment Information Component */}
            <AppointmentInformation
                formData={{
                    doctor: formik.values.doctor || "",
                    appointmentDate: formik.values.appointmentDate || "",
                    timeSlot: formik.values.timeSlot || "",
                }}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // For select fields, if a value is selected, mark as touched and validate immediately
                    const selectFields = ["doctor", "timeSlot"];
                    if (selectFields.includes(field) && value && value.trim() !== "") {
                        setTimeout(() => {
                            const currentValue = formik.values[field as keyof typeof formik.values];
                            if (currentValue === value || String(currentValue) === String(value)) {
                                formik.setFieldTouched(field, true, false);
                                formik.validateField(field);
                            } else {
                                setTimeout(() => {
                                    formik.setFieldTouched(field, true, false);
                                    formik.validateField(field);
                                }, 50);
                            }
                        }, 10);
                    }

                    // For date picker, validate immediately when date is selected
                    if (field === "appointmentDate" && value) {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }
                }}
                onBlur={(field) => {
                    formik.setFieldTouched(field, true, false);
                    formik.validateField(field);
                }}
                doctorOptions={doctorOptions}
                fieldRefs={{
                    doctor: doctorRef,
                    appointmentDate: appointmentDateRef,
                    timeSlot: timeSlotRef,
                }}
                errors={getFormErrors()}
            />

            <div className="flex justify-end mt-4">
                <button
                    type="submit"
                    disabled={isNextDisabled}
                    className={`flex flex-row justify-center items-center px-6 py-3 gap-2 rounded-[32px] font-inter font-medium text-sm leading-[120%] text-center text-white transition-colors ${
                        isNextDisabled
                            ? "bg-gray-400 cursor-not-allowed opacity-50"
                            : "bg-[#0B8C00] cursor-pointer hover:bg-[#0A7A00]"
                    }`}
                >
                    {submitButtonText}
                </button>
            </div>
        </form>
    );
}

