"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { FormikProps } from "formik";
import { BackToPreviousPageButton, MessageDialog, ThreeDotLoader } from "@/components/ui";
import MedicalInformation from "@/components/registration/MedicalInformation";
import type { RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import DiagnosisInformation from "@/components/registration/DiagnosisInformation";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetDiagnosisListQuery } from "@/store/api/registrationApi";
import { useGetDiagnosisCategoriesQuery } from "@/store/api/settingsApi";

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

interface MedicalFormProps {
    formik: FormikProps<RegistrationPersonalDetailsFormValues>;
    getFormErrors: () => Record<string, string>;
    onNext?: () => void;
    onBack: () => void;
    onSubmit?: () => void;
    onSuccessClose?: () => void;
    customSuccessMessage?: string;
    showInternalSuccessDialog?: boolean;
    isSubmitting?: boolean;
}

export default function MedicalForm({
    formik,
    getFormErrors,
    onNext,
    onBack,
    onSubmit,
    onSuccessClose,
    customSuccessMessage,
    showInternalSuccessDialog = true,
    isSubmitting = false,
}: MedicalFormProps) {
    // Load diagnosis categories from API with limit=100 and page=1
    const { data: diagnosisCategoriesData } = useGetDiagnosisCategoriesQuery({
        page: 1,
        limit: 100,
        sort: "createdAt",
        order: "desc",
    });

    // Map diagnosis categories to options (only active ones)
    const diagnosisOptions: SelectOption[] = useMemo(() => {
        if (!diagnosisCategoriesData?.data || !Array.isArray(diagnosisCategoriesData.data)) {
            return [];
        }
        return diagnosisCategoriesData.data
            .filter((item: any) => item.status === "active")
            .map((item: any) => ({
                value: String(item.id),
                label: item.diagnosisCategory,
            }));
    }, [diagnosisCategoriesData]);

    // Filter sub-diagnoses based on selected diagnosis (only active ones)
    const subDiagnosisOptions: SelectOption[] = useMemo(() => {
        if (!formik.values.diagnosis || !diagnosisCategoriesData?.data || !Array.isArray(diagnosisCategoriesData.data)) {
            return [];
        }
        
        const selectedDiagnosisId = parseInt(formik.values.diagnosis);
        const selectedCategory = diagnosisCategoriesData.data.find(
            (item: any) => item.id === selectedDiagnosisId
        );
        
        if (!selectedCategory || !selectedCategory.subDiagnoses || !Array.isArray(selectedCategory.subDiagnoses)) {
            return [];
        }
        
        // Include sub-diagnoses that are active OR have no status set (null/undefined)
        return selectedCategory.subDiagnoses
            .filter((subItem: any) => subItem.status === "active" || subItem.status == null)
            .map((subItem: any) => ({
                value: String(subItem.id),
                label: subItem.name,
            }));
    }, [formik.values.diagnosis, diagnosisCategoriesData]);

    // Clear menstrual fields when gender is male
    useEffect(() => {
        const isMale = formik.values.gender?.toLowerCase() === "male";
        if (isMale) {
            if (formik.values.menstrual) {
                formik.setFieldValue("menstrual", "", false);
            }
            if (formik.values.menstrualRemarks) {
                formik.setFieldValue("menstrualRemarks", "", false);
            }
            // Clear any errors for menstrual fields
            if (formik.errors.menstrual) {
                formik.setFieldError("menstrual", undefined);
            }
            if (formik.errors.menstrualRemarks) {
                formik.setFieldError("menstrualRemarks", undefined);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values.gender]);

    // Dialog states
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState(customSuccessMessage || "Registration completed successfully!");
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);

    // Medical Information field refs
    const diabetesRef = useRef<HTMLDivElement>(null);
    const diabetesRemarksRef = useRef<HTMLInputElement>(null);
    const htnRef = useRef<HTMLDivElement>(null);
    const htnRemarksRef = useRef<HTMLInputElement>(null);
    const coronaryArteryDiseaseRef = useRef<HTMLDivElement>(null);
    const coronaryArteryDiseaseRemarksRef = useRef<HTMLInputElement>(null);
    const thyroidRef = useRef<HTMLDivElement>(null);
    const thyroidRemarksRef = useRef<HTMLInputElement>(null);
    const menstrualRef = useRef<HTMLDivElement>(null);
    const menstrualRemarksRef = useRef<HTMLInputElement>(null);
    const alcoholRef = useRef<HTMLInputElement>(null);
    const smokingRef = useRef<HTMLInputElement>(null);
    const tobaccoRef = useRef<HTMLInputElement>(null);
    const drugsRef = useRef<HTMLInputElement>(null);
    const addictionOtherRef = useRef<HTMLInputElement>(null);
    const addictionSpecifyRef = useRef<HTMLInputElement>(null);
    const diagnosisRef = useRef<HTMLDivElement>(null);
    const subDiagnosisRef = useRef<HTMLDivElement>(null);
    const symptomsRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = async () => {
        // Prevent multiple submissions while a request is already in progress
        if (formik.isSubmitting || isSubmitting) {
            return;
        }
        if (isSubmitting) return;

        // Define fields for Medical Information - all optional but validate if filled
        // Exclude menstrual if gender is male
        const isMale = formik.values.gender?.toLowerCase() === "male";
        const medicalFields = isMale 
            ? ['diabetes', 'htn', 'coronaryArteryDisease', 'thyroid']
            : ['diabetes', 'htn', 'coronaryArteryDisease', 'thyroid', 'menstrual'];
        
        // Define fields for Diagnosis Information - diagnosis and subDiagnosis are required
        const diagnosisFields = ['diagnosis', 'subDiagnosis', 'symptoms'];
        
        // Clear menstrual fields if gender is male
        if (isMale) {
            formik.setFieldValue("menstrual", "", false);
            formik.setFieldValue("menstrualRemarks", "", false);
            formik.setFieldError("menstrual", undefined);
            formik.setFieldError("menstrualRemarks", undefined);
        }
        
        // Mark medical fields as touched
        medicalFields.forEach(field => {
            formik.setFieldTouched(field, true, false);
        });
        
        // Mark diagnosis fields as touched (diagnosis and subDiagnosis are required)
        diagnosisFields.forEach(field => {
            formik.setFieldTouched(field, true, false);
        });
        
        // Explicitly validate required diagnosis fields first
        const diagnosisErrors: Record<string, string> = {};
        if (!formik.values.diagnosis || formik.values.diagnosis.trim() === "") {
            diagnosisErrors.diagnosis = "Please select a primary disease";
        }
        
        if (!formik.values.subDiagnosis || formik.values.subDiagnosis.trim() === "") {
            diagnosisErrors.subDiagnosis = "Please select a secondary disease";
        }
        
        // Validate all fields
        const validationErrors = await formik.validateForm();
        const allErrors: Record<string, string> = { ...diagnosisErrors };
        
        // Collect medical field errors
        medicalFields.forEach(field => {
            const error = validationErrors[field as keyof typeof validationErrors];
            if (error && typeof error === 'string') {
                allErrors[field] = error;
            }
        });
        
        // Collect diagnosis field errors from validation
        diagnosisFields.forEach(field => {
            const error = validationErrors[field as keyof typeof validationErrors];
            if (error && typeof error === 'string') {
                allErrors[field] = error;
            }
        });
        
        // Check conditional field
        if (formik.values.addictionOther && !formik.values.addictionSpecify) {
            allErrors.addictionSpecify = 'Please specify the addiction';
            formik.setFieldTouched('addictionSpecify', true, false);
        }
        
        if (Object.keys(allErrors).length > 0) {
            // Mark all error fields as touched to ensure errors are displayed
            Object.keys(allErrors).forEach(field => {
                formik.setFieldTouched(field as keyof typeof formik.values, true, false);
            });
            
            // Set all errors - merge with existing errors
            formik.setErrors({ ...formik.errors, ...allErrors });
            
            // Force a re-render by updating formik state
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Focus order: Primary Disease * first, then Secondary Disease *, then rest in series
            const MEDICAL_FIELD_ORDER: readonly string[] = [
                'diagnosis',      // 1. Primary Disease *
                'subDiagnosis',  // 2. Secondary Disease *
                'symptoms',
                'diabetes', 'diabetesRemarks', 'htn', 'htnRemarks',
                'coronaryArteryDisease', 'coronaryArteryDiseaseRemarks', 'thyroid', 'thyroidRemarks',
                'menstrual', 'menstrualRemarks',
                'addictionSpecify',
            ];
            const firstErrorKey = MEDICAL_FIELD_ORDER.find((key) => allErrors[key]) ?? Object.keys(allErrors)[0];
            const scrollToAndFocus = (key: string) => {
                if (key === 'diagnosis' && diagnosisRef.current) {
                    diagnosisRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const btn = diagnosisRef.current.querySelector('button[type="button"]');
                    if (btn instanceof HTMLElement) setTimeout(() => btn.focus(), 150);
                    return;
                }
                if (key === 'subDiagnosis' && subDiagnosisRef.current) {
                    subDiagnosisRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const btn = subDiagnosisRef.current.querySelector('button[type="button"]');
                    if (btn instanceof HTMLElement) setTimeout(() => btn.focus(), 150);
                    return;
                }
                const el = document.querySelector(`[data-field="${key}"]`);
                if (el instanceof HTMLElement) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                        setTimeout(() => el.focus(), 150);
                    } else {
                        const input = el.querySelector('input, textarea');
                        const btn = el.querySelector('button[type="button"]');
                        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                            setTimeout(() => input.focus(), 150);
                        } else if (btn instanceof HTMLElement) {
                            setTimeout(() => btn.focus(), 150);
                        }
                    }
                }
            };
            setTimeout(() => scrollToAndFocus(firstErrorKey), 150);
            return;
        }
        
        // If onSubmit is provided, this is the final step
        if (onSubmit) {
            try {
                await formik.submitForm();
                
                // Call the onSubmit callback (which will handle API submission and show success dialog)
                if (onSubmit) {
                    await onSubmit();
                }
                
                // Only show internal dialog if enabled and onSubmit didn't handle it
                if (showInternalSuccessDialog) {
                    if (customSuccessMessage) {
                        setSuccessMessage(customSuccessMessage);
                    } else {
                        setSuccessMessage("Registration completed successfully!");
                    }
                    setShowSuccessDialog(true);
                }
                // If showInternalSuccessDialog is false, the parent component will handle showing the success dialog
            } catch (error: any) {
                // Handle API errors
                const errorMessage = error?.data?.message || error?.message || "An error occurred during registration. Please try again.";
                setApiErrorMessage(errorMessage);
                setShowApiErrorDialog(true);
            }
        } else if (onNext) {
            onNext();
        }
    };

    return (
        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] p-5 mb-4">
            <h3 className="font-inter font-semibold text-[24px] leading-[120%] text-[#262D3B] mb-4">Medical Information</h3>

            <MedicalInformation
                formData={{
                    diabetes: formik.values.diabetes || "",
                    diabetesRemarks: formik.values.diabetesRemarks || "",
                    htn: formik.values.htn || "",
                    htnRemarks: formik.values.htnRemarks || "",
                    coronaryArteryDisease: formik.values.coronaryArteryDisease || "",
                    coronaryArteryDiseaseRemarks: formik.values.coronaryArteryDiseaseRemarks || "",
                    thyroid: formik.values.thyroid || "",
                    thyroidRemarks: formik.values.thyroidRemarks || "",
                    menstrual: formik.values.menstrual || "",
                    menstrualRemarks: formik.values.menstrualRemarks || "",
                    alcohol: formik.values.alcohol || false,
                    smoking: formik.values.smoking || false,
                    tobacco: formik.values.tobacco || false,
                    drugs: formik.values.drugs || false,
                    addictionOther: formik.values.addictionOther || false,
                    addictionSpecify: formik.values.addictionSpecify || "",
                }}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // For button group fields, validate immediately
                    const buttonFields = ["diabetes", "htn", "coronaryArteryDisease", "thyroid", "menstrual"];
                    if (buttonFields.includes(field)) {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }

                    // For checkbox fields, validate immediately
                    const checkboxFields = ["alcohol", "smoking", "tobacco", "drugs", "addictionOther"];
                    if (checkboxFields.includes(field)) {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }

                    // For input fields: if field was previously invalid, validate on change
                    const inputFields = ["diabetesRemarks", "htnRemarks", "coronaryArteryDiseaseRemarks", "thyroidRemarks", "menstrualRemarks", "addictionSpecify"];
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
                    diabetes: diabetesRef,
                    diabetesRemarks: diabetesRemarksRef,
                    htn: htnRef,
                    htnRemarks: htnRemarksRef,
                    coronaryArteryDisease: coronaryArteryDiseaseRef,
                    coronaryArteryDiseaseRemarks: coronaryArteryDiseaseRemarksRef,
                    thyroid: thyroidRef,
                    thyroidRemarks: thyroidRemarksRef,
                    menstrual: menstrualRef,
                    menstrualRemarks: menstrualRemarksRef,
                    alcohol: alcoholRef,
                    smoking: smokingRef,
                    tobacco: tobaccoRef,
                    drugs: drugsRef,
                    addictionOther: addictionOtherRef,
                    addictionSpecify: addictionSpecifyRef,
                }}
                errors={getFormErrors()}
                gender={formik.values.gender}
            />

            <DiagnosisInformation
                formData={{
                    diagnosis: formik.values.diagnosis || "",
                    subDiagnosis: formik.values.subDiagnosis || "",
                    symptoms: formik.values.symptoms || "",
                }}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // Clear sub-diagnosis when diagnosis changes
                    if (field === "diagnosis" && formik.values.subDiagnosis) {
                        formik.setFieldValue("subDiagnosis", "", false);
                    }

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
                diagnosisOptions={diagnosisOptions}
                subDiagnosisOptions={subDiagnosisOptions}
                fieldRefs={{
                    diagnosis: diagnosisRef,
                    subDiagnosis: subDiagnosisRef,
                    symptoms: symptomsRef,
                }}
                errors={getFormErrors()}
            />

           
            <div className="flex justify-end mt-4 gap-2">
                <BackToPreviousPageButton onClick={onBack} disabled={isSubmitting} />
                <button 
                    className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 bg-[#0B8C00] rounded-[32px] font-inter font-medium text-sm leading-[120%] text-center text-white hover:bg-[#0A7A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ThreeDotLoader color="white" size="small" />
                    ) : (
                        <span>{onSubmit ? "Submit" : "Save & Next"}</span>
                    )}
                </button>
            </div>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => {
                    setShowSuccessDialog(false);
                    // Reset form and navigate after dialog closes
                    if (onSuccessClose) {
                        onSuccessClose();
                    }
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowSuccessDialog(false);
                    // Reset form and navigate after dialog closes
                    if (onSuccessClose) {
                        onSuccessClose();
                    }
                }}
            />

            {/* API Error Dialog */}
            <MessageDialog
                open={showApiErrorDialog}
                onClose={() => {
                    setShowApiErrorDialog(false);
                }}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={apiErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowApiErrorDialog(false);
                }}
            />
        </div>
    );
}

