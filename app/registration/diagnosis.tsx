"use client";

import { useRef, useState } from "react";
import { FormikProps } from "formik";
import { BackToPreviousPageButton, ThreeDotLoader } from "@/components/ui";
import DiagnosisInformation from "@/components/registration/DiagnosisInformation";
import type { RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import type { SelectOption } from "@/components/ui/FormSelectField";

// Default Diagnosis options
const defaultDiagnosisOptions: SelectOption[] = [
    { value: "addiction", label: "Addiction" },
    { value: "allergy", label: "Allergy" },
    { value: "alopecia", label: "Alopecia" },
];

// Default Sub Diagnosis options
const defaultSubDiagnosisOptions: SelectOption[] = [
    { value: "alcohol-addiction", label: "Alcohol Addiction" },
    { value: "drug-addiction", label: "Drug Addiction" },
    { value: "food-allergy", label: "Food Allergy" },
];

interface DiagnosisFormProps {
    formik: FormikProps<RegistrationPersonalDetailsFormValues>;
    getFormErrors: () => Record<string, string>;
    onNext?: () => void;
    onBack: () => void;
    onSubmit?: () => void;
    isSubmitting?: boolean;
}

export default function DiagnosisForm({
    formik,
    getFormErrors,
    onNext,
    onBack,
    onSubmit,
    isSubmitting = false,
}: DiagnosisFormProps) {
    // Diagnosis Information field refs
    const diagnosisRef = useRef<HTMLDivElement>(null);
    const subDiagnosisRef = useRef<HTMLDivElement>(null);
    const symptomsRef = useRef<HTMLTextAreaElement>(null);

    const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

    const handleSubmit = async () => {
        if (isSubmitting || isSubmittingLocal) return;

        // Step 5 (Diagnosis) - diagnosis and subDiagnosis are required
        const step5Fields = ['diagnosis', 'subDiagnosis', 'symptoms'];
        
        // Explicitly validate required diagnosis fields first
        const diagnosisErrors: Record<string, string> = {};
        if (!formik.values.diagnosis || formik.values.diagnosis.trim() === "") {
            diagnosisErrors.diagnosis = "Please select a primary disease";
            formik.setFieldTouched('diagnosis', true, false);
        }
        
        if (!formik.values.subDiagnosis || formik.values.subDiagnosis.trim() === "") {
            diagnosisErrors.subDiagnosis = "Please select a secondary disease";
            formik.setFieldTouched('subDiagnosis', true, false);
        }
        
        // Mark step 5 fields as touched (diagnosis and subDiagnosis are required)
        step5Fields.forEach(field => {
            formik.setFieldTouched(field, true, false);
        });
        
        // Validate all fields
        const validationErrors = await formik.validateForm();
        const step5Errors: Record<string, string> = { ...diagnosisErrors };
        
        step5Fields.forEach(field => {
            const error = validationErrors[field as keyof typeof validationErrors];
            if (error && typeof error === 'string') {
                step5Errors[field] = error;
            }
        });
        
        if (Object.keys(step5Errors).length > 0) {
            formik.setErrors({ ...formik.errors, ...step5Errors });
            // Scroll to first error
            const firstErrorKey = Object.keys(step5Errors)[0];
            const element = document.querySelector(`[data-field="${firstErrorKey}"]`);
            if (element instanceof HTMLElement) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
            return;
        }
        
        if (onSubmit) {
            setIsSubmittingLocal(true);
            try {
                await formik.submitForm();
                await onSubmit();
            } finally {
                setIsSubmittingLocal(false);
            }
        } else if (onNext) {
            onNext();
        }
    };

    const isSubmittingFinal = isSubmitting || isSubmittingLocal;

    return (
        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] p-5 mb-4">
            <h3 className="font-inter font-semibold text-[24px] leading-[120%] text-[#262D3B] mb-4">Diagnosis Information</h3>

            <DiagnosisInformation
                formData={{
                    diagnosis: formik.values.diagnosis || "",
                    subDiagnosis: formik.values.subDiagnosis || "",
                    symptoms: formik.values.symptoms || "",
                }}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // For select fields, validate immediately
                    const selectFields = ["diagnosis", "subDiagnosis"];
                    if (selectFields.includes(field) && value && value.trim() !== "") {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }

                    // For textarea field: if field was previously invalid, validate on change
                    if (field === "symptoms") {
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
                diagnosisOptions={defaultDiagnosisOptions}
                subDiagnosisOptions={defaultSubDiagnosisOptions}
                fieldRefs={{
                    diagnosis: diagnosisRef,
                    subDiagnosis: subDiagnosisRef,
                    symptoms: symptomsRef,
                }}
                errors={getFormErrors()}
            />

            <div className="flex justify-end mt-4 gap-2">
                <BackToPreviousPageButton onClick={onBack} disabled={isSubmittingFinal} />
                <button 
                    className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 bg-[#0B8C00] rounded-[32px] font-inter font-medium text-sm leading-[120%] text-center text-white hover:bg-[#0A7A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    onClick={handleSubmit}
                    disabled={isSubmittingFinal}
                >
                    {isSubmittingFinal ? (
                        <ThreeDotLoader color="white" size="small" />
                    ) : (
                        <span>{onSubmit ? "Save & Submit" : "Save & Next"}</span>
                    )}
                </button>
            </div>
        </div>
    );
}

