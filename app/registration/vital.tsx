"use client";

import React, { useRef, useState, useMemo, useCallback } from "react";
import { FormikProps } from "formik";
import { BackToPreviousPageButton, Dialog, Button, FormTextareaField } from "@/components/ui";
import VitalsInformation from "@/components/registration/VitalsInformation";
import type { RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetDietListQuery } from "@/store/api/registrationApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectSelectedBranch } from "@/store/slices/authSlice";

interface VitalFormProps {
    formik: FormikProps<RegistrationPersonalDetailsFormValues>;
    getFormErrors: () => Record<string, string>;
    onNext: () => void;
    onBack: () => void;
    showBackButton?: boolean;
    allFieldsOptional?: boolean; // If true, all vitals fields are optional (no asterisks)
    /** When set (e.g. clinic registration), scopes GET /admin/registration/diet-list?branchId= */
    branchId?: number;
}

export default function VitalForm({
    formik,
    getFormErrors,
    onNext,
    onBack,
    showBackButton = true,
    allFieldsOptional = false,
    branchId: branchIdProp,
}: VitalFormProps) {
    const [showDietDialog, setShowDietDialog] = useState(false);
    const [dietDetailText, setDietDetailText] = useState("");

    // Allergies / Surgeries follow the same "Yes → open dialog for details, Close → revert to No" pattern as Diet Type.
    const [showAllergiesDialog, setShowAllergiesDialog] = useState(false);
    const [allergiesDetailText, setAllergiesDetailText] = useState("");
    const [showSurgeriesDialog, setShowSurgeriesDialog] = useState(false);
    const [surgeriesDetailText, setSurgeriesDetailText] = useState("");

    const headerSelectedBranch = useAppSelector(selectSelectedBranch);
    const authUserBranchId = useAppSelector(selectUserBranchId);
    const resolvedAuthBranchId = useMemo(() => {
        const raw = headerSelectedBranch?.id ?? authUserBranchId;
        if (raw == null) return undefined;
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) && n >= 1 ? n : undefined;
    }, [headerSelectedBranch?.id, authUserBranchId]);

    const effectiveBranchId = branchIdProp ?? resolvedAuthBranchId;

    // Load diet types from API (branch-scoped)
    const dietListSkip =
        effectiveBranchId == null || !Number.isFinite(effectiveBranchId) || effectiveBranchId < 1;
    const { data: dietListData, refetch: refetchDietList, isFetching: isDietListFetching } = useGetDietListQuery(
        { branchId: effectiveBranchId ?? 0 },
        { skip: dietListSkip }
    );

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

    const topLevelDietCount = useMemo(() => {
        if (!dietArray) return null;
        return dietArray.filter((diet: any) => diet.parentId === 0).length;
    }, [dietArray]);

    const handleDietTypeSelectOpen = useCallback(() => {
        if (dietListSkip || isDietListFetching) return;
        if (topLevelDietCount === null) return;
        if (topLevelDietCount === 0) {
            void refetchDietList();
        }
    }, [dietListSkip, isDietListFetching, topLevelDietCount, refetchDietList]);

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

    // Vitals field order in series: Blood Group → Allergies → Surgeries → Diet Type → then rest. First invalid in this order gets focus.
    const VITAL_FIELD_ORDER: readonly string[] = [
        'heightFeet', 'heightInch', 'weight',
        'bloodGroup',   // 1. Blood Group * (select)
        'allergies',    // 2. Allergies *
        'surgeries',    // 3. Surgeries *
        'dietType',     // 4. Diet Type * (select)
        'bloodPressure', 'sugarLevel', 'temperature', 'pulse', 'spo2',
    ];

    // Map field key → ref so we scroll and focus by ref (reliable for selects like Blood Group).
    const vitalFieldRefMap: Record<string, React.RefObject<HTMLElement | null>> = {
        heightFeet: heightFeetRef as React.RefObject<HTMLElement>,
        heightInch: heightInchRef as React.RefObject<HTMLElement>,
        weight: weightRef as React.RefObject<HTMLElement>,
        bloodGroup: bloodGroupRef as React.RefObject<HTMLElement>,
        allergies: allergiesRef as React.RefObject<HTMLElement>,
        surgeries: surgeriesRef as React.RefObject<HTMLElement>,
        dietType: dietTypeRef as React.RefObject<HTMLElement>,
        bloodPressure: bloodPressureRef as React.RefObject<HTMLElement>,
        sugarLevel: sugarLevelRef as React.RefObject<HTMLElement>,
        temperature: temperatureRef as React.RefObject<HTMLElement>,
        pulse: pulseRef as React.RefObject<HTMLElement>,
        spo2: spo2Ref as React.RefObject<HTMLElement>,
    };

    const scrollToAndFocusVitalField = (fieldKey: string) => {
        const ref = vitalFieldRefMap[fieldKey];
        const el = ref?.current;
        if (!el) {
            const fallback = document.querySelector(`[data-field="${fieldKey}"]`);
            if (fallback instanceof HTMLElement) {
                fallback.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (fallback instanceof HTMLInputElement || fallback instanceof HTMLTextAreaElement) {
                    fallback.focus();
                } else {
                    const input = fallback.querySelector('input, textarea');
                    const btn = fallback.querySelector('button[type="button"]');
                    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                        input.focus();
                    } else if (btn instanceof HTMLElement) {
                        btn.focus();
                    }
                }
            }
            return;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.focus();
        } else {
            const input = el.querySelector('input, textarea');
            const btn = el.querySelector('button[type="button"]');
            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                setTimeout(() => input.focus(), 150);
            } else if (btn instanceof HTMLElement) {
                setTimeout(() => btn.focus(), 150);
            }
        }
    };

    const handleSubmit = async () => {
        const step3Fields = [
            'heightFeet', 'heightInch', 'weight', 'bloodGroup', 'allergies', 'surgeries',
            'dietType', 'bloodPressure', 'sugarLevel', 'temperature', 'pulse', 'spo2',
        ];
        
        step3Fields.forEach(field => {
            formik.setFieldTouched(field, true, false);
        });
        
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
            const firstErrorKey = VITAL_FIELD_ORDER.find((key) => step3Errors[key]) ?? Object.keys(step3Errors)[0];
            setTimeout(() => scrollToAndFocusVitalField(firstErrorKey), 150);
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
                onDietTypeSelectOpen={handleDietTypeSelectOpen}
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

                    // Allergies: "Yes" → open details dialog, "No" → clear any previously entered details
                    if (field === "allergies") {
                        if (value?.toLowerCase() === "yes") {
                            setAllergiesDetailText((formik.values as any).allergiesDetails || "");
                            setShowAllergiesDialog(true);
                        } else if (value?.toLowerCase() === "no") {
                            formik.setFieldValue("allergiesDetails", "", false);
                        }
                    }

                    // Surgeries: "Yes" → open details dialog, "No" → clear any previously entered details
                    if (field === "surgeries") {
                        if (value?.toLowerCase() === "yes") {
                            setSurgeriesDetailText((formik.values as any).surgeriesDetails || "");
                            setShowSurgeriesDialog(true);
                        } else if (value?.toLowerCase() === "no") {
                            formik.setFieldValue("surgeriesDetails", "", false);
                        }
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
                title="Last day full diet detail"
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
                            Close
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

            {/* Allergies Details Dialog */}
            <Dialog
                open={showAllergiesDialog}
                onClose={() => {
                    // If user closes without entering details, revert selection to "no".
                    // PatientTypeButtonGroup compares values lowercased, so always store "yes"/"no" lowercase.
                    setShowAllergiesDialog(false);
                    setAllergiesDetailText("");
                    formik.setFieldValue("allergies", "no", false);
                    formik.setFieldValue("allergiesDetails", "", false);
                    setTimeout(() => {
                        formik.setFieldTouched("allergies", true, false);
                        formik.validateField("allergies");
                    }, 0);
                }}
                title="Enter the allergies details"
                width={600}
            >
                <div className="flex flex-col gap-6">
                    <FormTextareaField
                        label="Details"
                        value={allergiesDetailText}
                        onChange={(e) => setAllergiesDetailText(e.target.value)}
                        placeholder="Enter the allergies details"
                        height={200}
                        className="w-full"
                        required
                    />

                    <div className="flex items-center justify-start gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="medium"
                            onClick={() => {
                                setShowAllergiesDialog(false);
                                setAllergiesDetailText("");
                                formik.setFieldValue("allergies", "no", false);
                                formik.setFieldValue("allergiesDetails", "", false);
                                setTimeout(() => {
                                    formik.setFieldTouched("allergies", true, false);
                                    formik.validateField("allergies");
                                }, 0);
                            }}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="medium"
                            onClick={() => {
                                const trimmed = allergiesDetailText.trim();
                                // Empty details → treat as cancel: revert to "no"
                                if (!trimmed) {
                                    setShowAllergiesDialog(false);
                                    setAllergiesDetailText("");
                                    formik.setFieldValue("allergies", "no", false);
                                    formik.setFieldValue("allergiesDetails", "", false);
                                    setTimeout(() => {
                                        formik.setFieldTouched("allergies", true, false);
                                        formik.validateField("allergies");
                                    }, 0);
                                    return;
                                }
                                formik.setFieldValue("allergiesDetails", trimmed, false);
                                formik.setFieldValue("allergies", "yes", false);
                                setShowAllergiesDialog(false);
                                setTimeout(() => {
                                    formik.setFieldTouched("allergies", true, false);
                                    formik.validateField("allergies");
                                }, 0);
                            }}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Surgeries Details Dialog */}
            <Dialog
                open={showSurgeriesDialog}
                onClose={() => {
                    setShowSurgeriesDialog(false);
                    setSurgeriesDetailText("");
                    formik.setFieldValue("surgeries", "no", false);
                    formik.setFieldValue("surgeriesDetails", "", false);
                    setTimeout(() => {
                        formik.setFieldTouched("surgeries", true, false);
                        formik.validateField("surgeries");
                    }, 0);
                }}
                title="Enter the surgeries details"
                width={600}
            >
                <div className="flex flex-col gap-6">
                    <FormTextareaField
                        label="Details"
                        value={surgeriesDetailText}
                        onChange={(e) => setSurgeriesDetailText(e.target.value)}
                        placeholder="Enter the surgeries details"
                        height={200}
                        className="w-full"
                        required
                    />

                    <div className="flex items-center justify-start gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="medium"
                            onClick={() => {
                                setShowSurgeriesDialog(false);
                                setSurgeriesDetailText("");
                                formik.setFieldValue("surgeries", "no", false);
                                formik.setFieldValue("surgeriesDetails", "", false);
                                setTimeout(() => {
                                    formik.setFieldTouched("surgeries", true, false);
                                    formik.validateField("surgeries");
                                }, 0);
                            }}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="medium"
                            onClick={() => {
                                const trimmed = surgeriesDetailText.trim();
                                if (!trimmed) {
                                    setShowSurgeriesDialog(false);
                                    setSurgeriesDetailText("");
                                    formik.setFieldValue("surgeries", "no", false);
                                    formik.setFieldValue("surgeriesDetails", "", false);
                                    setTimeout(() => {
                                        formik.setFieldTouched("surgeries", true, false);
                                        formik.validateField("surgeries");
                                    }, 0);
                                    return;
                                }
                                formik.setFieldValue("surgeriesDetails", trimmed, false);
                                formik.setFieldValue("surgeries", "yes", false);
                                setShowSurgeriesDialog(false);
                                setTimeout(() => {
                                    formik.setFieldTouched("surgeries", true, false);
                                    formik.validateField("surgeries");
                                }, 0);
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

