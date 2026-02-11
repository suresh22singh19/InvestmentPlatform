"use client";

import { useRef, useState } from "react";
import { FormikProps } from "formik";
import { BackToPreviousPageButton, Dialog, Button, FormTextareaField } from "@/components/ui";
import VitalsInformation from "@/components/registration/VitalsInformation";
import type { RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetDietListQuery } from "@/store/api/registrationApi";

interface VitalFormProps {
    formik: FormikProps<RegistrationPersonalDetailsFormValues>;
    getFormErrors: () => Record<string, string>;
    onNext: () => void;
    onBack: () => void;
    showBackButton?: boolean;
    allFieldsOptional?: boolean; // If true, all vitals fields are optional (no asterisks)
}

export default function VitalForm({
    formik,
    getFormErrors,
    onNext,
    onBack,
    showBackButton = true,
    allFieldsOptional = false,
}: VitalFormProps) {
    const [showDietDialog, setShowDietDialog] = useState(false);
    const [dietDetailText, setDietDetailText] = useState("");
    
    // Load diet types from API
    const { data: dietListData } = useGetDietListQuery();

    // Handle both direct array response and wrapped response
    // Filter to only top-level diets (parentId: 0) and map to options
    const dietArray = Array.isArray(dietListData)
        ? dietListData
        : (dietListData as any)?.data && Array.isArray((dietListData as any).data)
        ? (dietListData as any).data
        : undefined;

    const dietTypeOptions: SelectOption[] | undefined = dietArray
        ? dietArray
              .filter((diet: any) => diet.parentId === 0)
              .map((diet: any) => ({
                  value: diet.diet,
                  label: diet.diet,
              }))
        : undefined;

    // Vitals Information field refs
    const heightFeetRef = useRef<HTMLInputElement>(null);
    const heightInchRef = useRef<HTMLInputElement>(null);
    const weightRef = useRef<HTMLInputElement>(null);
    const bloodGroupRef = useRef<HTMLDivElement>(null);
    const allergiesRef = useRef<HTMLDivElement>(null);
    const surgeriesRef = useRef<HTMLDivElement>(null);
    const dietTypeRef = useRef<HTMLDivElement>(null);
    const bloodPressureRef = useRef<HTMLInputElement>(null);
    const sugarLevelRef = useRef<HTMLInputElement>(null);
    const temperatureRef = useRef<HTMLInputElement>(null);
    const pulseRef = useRef<HTMLInputElement>(null);
    const spo2Ref = useRef<HTMLInputElement>(null);

    const handleSubmit = async () => {
        // Define fields for Step 3 (Vitals)
        const step3Fields = [
            'heightFeet', 'heightInch', 'weight', 'allergies', 'surgeries',
            'dietType', 'bloodPressure', 'sugarLevel', 'temperature'
        ];
        
        // Mark step 3 fields as touched
        step3Fields.forEach(field => {
            formik.setFieldTouched(field, true, false);
        });
        
        // Validate only step 3 fields
        const errors = await formik.validateForm();
        const step3Errors: Record<string, string> = {};
        
        step3Fields.forEach(field => {
            const error = errors[field as keyof typeof errors];
            if (error && typeof error === 'string') {
                step3Errors[field] = error;
            }
        });
        
        if (Object.keys(step3Errors).length > 0) {
            formik.setErrors({ ...formik.errors, ...step3Errors });
            // Scroll to first error
            const firstErrorKey = Object.keys(step3Errors)[0];
            const element = document.querySelector(`[data-field="${firstErrorKey}"]`);
            if (element instanceof HTMLElement) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
            return;
        }
        
        onNext();
    };

    return (
        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] p-5 mb-4">
            <h3 className="font-inter font-semibold text-[24px] leading-[120%] text-[#262D3B] mb-4">Vital Information</h3>
            
            {/* Vitals Information Component */}
            <VitalsInformation
                formData={{
                    heightFeet: formik.values.heightFeet || "",
                    heightInch: formik.values.heightInch || "",
                    weight: formik.values.weight || "",
                    bloodGroup: formik.values.bloodGroup || "",
                    allergies: formik.values.allergies || "",
                    surgeries: formik.values.surgeries || "",
                    dietType: formik.values.dietType || "",
                    bloodPressure: formik.values.bloodPressure || "",
                    sugarLevel: formik.values.sugarLevel || "",
                    temperature: formik.values.temperature || "",
                    pulse: formik.values.pulse || "",
                    spo2: formik.values.spo2 || "",
                }}
                dietTypeOptions={dietTypeOptions}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // For select fields, validate immediately
                    const selectFields = ["bloodGroup", "dietType"];
                    if (selectFields.includes(field) && value && value.trim() !== "") {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }
                    
                    // Show dialog when diet type is selected
                    if (field === "dietType" && value && value.trim() !== "") {
                        // Set the current value if it exists, otherwise empty
                        setDietDetailText(formik.values.lastDayFullDiet || "");
                        setShowDietDialog(true);
                    }

                    // For button group fields, validate immediately
                    const buttonFields = ["allergies", "surgeries"];
                    if (buttonFields.includes(field)) {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }

                    // For input fields: if field was previously invalid, validate on change
                    const inputFields = ["heightFeet", "heightInch", "weight", "bloodPressure", "sugarLevel", "temperature", "pulse", "spo2"];
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
                    heightFeet: heightFeetRef,
                    heightInch: heightInchRef,
                    weight: weightRef,
                    bloodGroup: bloodGroupRef,
                    allergies: allergiesRef,
                    surgeries: surgeriesRef,
                    dietType: dietTypeRef,
                    bloodPressure: bloodPressureRef,
                    sugarLevel: sugarLevelRef,
                    temperature: temperatureRef,
                    pulse: pulseRef,
                    spo2: spo2Ref,
                }}
                errors={getFormErrors()}
                allFieldsOptional={allFieldsOptional}
            />

            <div className="flex justify-end mt-4 gap-2">
                {showBackButton && <BackToPreviousPageButton onClick={onBack} />}
                <button 
                    className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 bg-[#0B8C00] rounded-[32px] font-inter font-medium text-sm leading-[120%] text-center text-white hover:bg-[#0A7A00] transition-colors" 
                    onClick={handleSubmit}
                >
                    Save & Next
                </button>
            </div>
            
            {/* Diet Details Dialog */}
            <Dialog
                open={showDietDialog}
                onClose={() => {
                    setShowDietDialog(false);
                    setDietDetailText("");
                }}
                title="Last Day Full Diet detail."
                width={600}
            >
                <div className="flex flex-col gap-6">
                    <FormTextareaField
                        label="Diet Details"
                        value={dietDetailText}
                        onChange={(e) => setDietDetailText(e.target.value)}
                        placeholder="Enter last day full diet details..."
                        height={200}
                        className="w-full"
                    />
                    
                    <div className="flex items-center justify-start gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="medium"
                            onClick={() => {
                                setShowDietDialog(false);
                                setDietDetailText("");
                            }}
                        >
                            close
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="medium"
                            onClick={() => {
                                formik.setFieldValue("lastDayFullDiet", dietDetailText.trim(), false);
                                setShowDietDialog(false);
                            }}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

