"use client";

import Image from "next/image";
import { useMemo, useEffect } from "react";
import { FormInputField, FormSelectField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetPanelsQuery } from "@/store/api/settingsApi";

export interface PatientTypeFormData {
    patientType: string;
    patientSubType: string;
    panelId: string;
    benificiaryId: string;
    insuranceCompany: string;
    ayushCovered: string;
}

interface PatientTypeProps {
    formData: PatientTypeFormData;
    onChange: (field: keyof PatientTypeFormData, value: string) => void;
    onBlur?: (field: keyof PatientTypeFormData) => void;
    patientSubTypeOptions?: SelectOption[];
    insuranceCompanyOptions?: SelectOption[];
    fieldRefs?: {
        patientType?: React.RefObject<HTMLDivElement | null>;
        patientSubType?: React.RefObject<HTMLDivElement | null>;
        panelId?: React.RefObject<HTMLDivElement | null>;
        benificiaryId?: React.RefObject<HTMLInputElement | null>;
        insuranceCompany?: React.RefObject<HTMLInputElement | null>;
        ayushCovered?: React.RefObject<HTMLDivElement | null>;
    };
    errors?: Record<string, string>;
}

export default function PatientType({
    formData,
    onChange,
    onBlur,
    patientSubTypeOptions = [
        { value: "in-service", label: "IN Service" },
        { value: "pensioner", label: "Pensioner" },
        { value: "autonomous", label: "Autonomous" },
    ],
    insuranceCompanyOptions = [],
    fieldRefs,
    errors,
}: PatientTypeProps) {
    const patientTypeOptions = ["Private", "Panel", "TPA"];
    const ayushCoveredOptions = ["Yes", "No"];

    const isPrivate = formData.patientType.toLowerCase() === "private";
    const isPanel = formData.patientType.toLowerCase() === "panel";
    const isTPA = formData.patientType.toLowerCase() === "tpa";

    // Fetch panels by default to have them available for all patient types
    const { data: panelsData } = useGetPanelsQuery({ page: 1, limit: 100 });

    // Transform panels to SelectOption format
    // When Panel is selected, exclude "Normal" (id: 1) and "TPA (Private Insurance)" (id: 2)
    const panelOptions: SelectOption[] = useMemo(() => {
        if (!panelsData?.data) return [];
        return panelsData.data
            .filter((panel) => {
                // Filter by status
                const isActive = panel.status === "active" || panel.status === "Active";
                if (!isActive) return false;
                
                // When Panel patient type is selected, exclude id 1 (Normal) and id 2 (TPA Private Insurance)
                if (isPanel) {
                    return panel.id !== 1 && panel.id !== 2;
                }
                
                return true;
            })
            .map((panel) => ({
                value: panel.id.toString(),
                label: panel.name,
            }));
    }, [panelsData, isPanel]);

    // Auto-set panelId when patientType is set to Private or TPA
    // Always ensure Private has panelId=1 and TPA has panelId=2
    useEffect(() => {
        const patientTypeLower = formData.patientType.toLowerCase();
        const currentPanelId = formData.panelId?.trim() || "";
        
        // For Private, always set panelId to 1 (unless it's already 1)
        if (patientTypeLower === "private" && currentPanelId !== "1") {
            onChange("panelId", "1");
        }
        // For TPA, always set panelId to 2 (unless it's already 2)
        else if (patientTypeLower === "tpa" && currentPanelId !== "2") {
            onChange("panelId", "2");
        }
        // If patientType is Panel, don't auto-set (user will select from dropdown)
        // If patientType is empty, don't set anything
    }, [formData.patientType, formData.panelId, onChange]);

    const handlePatientTypeChange = (value: string) => {
        onChange("patientType", value);
        // Set panelId based on patient type and clear fields that shouldn't be visible
        if (value.toLowerCase() === "private") {
            // Set panelId to 1 (Normal) for Private
            onChange("panelId", "1");
            onChange("patientSubType", "");
            onChange("benificiaryId", "");
            onChange("insuranceCompany", "");
            onChange("ayushCovered", "");
        } else if (value.toLowerCase() === "panel") {
            // Clear panelId when Panel is selected - user will choose from dropdown
            onChange("panelId", "");
            onChange("insuranceCompany", "");
            onChange("ayushCovered", "");
        } else if (value.toLowerCase() === "tpa") {
            // Set panelId to 2 (TPA Private Insurance) for TPA
            onChange("panelId", "2");
            onChange("patientSubType", "");
            onChange("benificiaryId", "");
        }
        setTimeout(() => {
            onBlur?.("patientType");
        }, 0);
    };

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4 mt-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/patientinfo.svg" alt="Patient info" width={20} height={20} /> Patient Type
            </h2>

            {/* Patient Type selection */}
            <div className="mb-4 w-1/3">
                <PatientTypeButtonGroup
                    options={patientTypeOptions}
                    value={formData.patientType}
                    onChange={handlePatientTypeChange}
                    label="Patient Type"
                    required
                    error={errors?.patientType}
                    fieldRef={fieldRefs?.patientType}
                    dataField="patientType"
                />
            </div>

            {/* Panel fields: Panel + Patient Sub Type + Beneficiary ID */}
            {isPanel && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div data-field="panelId" className="scroll-mt-4" ref={fieldRefs?.panelId}>
                        <FormSelectField
                            label="Panel *"
                            options={panelOptions}
                            value={formData.panelId || null}
                            onChange={(value) => {
                                const selectedValue = Array.isArray(value) ? value[0] : value;
                                onChange("panelId", selectedValue || "");
                                if (selectedValue) {
                                    setTimeout(() => {
                                        onBlur?.("panelId");
                                    }, 0);
                                }
                            }}
                            onBlur={() => onBlur?.("panelId")}
                            placeholder="Select"
                            mode="single"
                            background="white"
                        />
                        {errors?.panelId && (
                            <p className="mt-1 text-xs text-[#F6776E]">{errors.panelId}</p>
                        )}
                    </div>

                    <div data-field="patientSubType" className="scroll-mt-4" ref={fieldRefs?.patientSubType}>
                        <FormSelectField
                            label="Patient Sub Type"
                            options={patientSubTypeOptions}
                            value={formData.patientSubType || null}
                            onChange={(value) => {
                                const selectedValue = Array.isArray(value) ? value[0] : value;
                                onChange("patientSubType", selectedValue || "");
                                if (selectedValue) {
                                    setTimeout(() => {
                                        onBlur?.("patientSubType");
                                    }, 0);
                                }
                            }}
                            onBlur={() => onBlur?.("patientSubType")}
                            placeholder="Select"
                            mode="single"
                            background="white"
                        />
                        {errors?.patientSubType && (
                            <p className="mt-1 text-xs text-[#F6776E]">{errors.patientSubType}</p>
                        )}
                    </div>

                    <div data-field="benificiaryId" className="scroll-mt-4">
                        <FormInputField
                            ref={fieldRefs?.benificiaryId}
                            label="Beneficiary ID"
                            value={formData.benificiaryId}
                            onChange={(e) => {
                                // Only allow alphanumeric characters, no spaces, max 15 characters
                                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
                                onChange("benificiaryId", value);
                            }}
                            onKeyDown={(e) => {
                                // Allow navigation and editing keys
                                const allowedKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Backspace", "Delete", "Tab", "Enter", "Escape"];
                                const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
                                
                                // Allow modifier key combinations (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X)
                                if (isModifierKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) {
                                    return;
                                }
                                
                                // Allow navigation and editing keys
                                if (allowedKeys.includes(e.key)) {
                                    return;
                                }
                                
                                // If at max length, prevent typing new characters
                                if (formData.benificiaryId.length >= 15 && e.key.match(/^[a-zA-Z0-9]$/)) {
                                    e.preventDefault();
                                    return;
                                }
                                
                                // Block spaces and special characters (only allow alphanumeric)
                                if (!e.key.match(/^[a-zA-Z0-9]$/)) {
                                    e.preventDefault();
                                }
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const pastedText = e.clipboardData.getData("text");
                                // Only allow alphanumeric characters, max 15
                                const cleanedText = pastedText.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
                                onChange("benificiaryId", cleanedText);
                            }}
                            onBlur={() => onBlur?.("benificiaryId")}
                            placeholder="Beneficiary ID"
                            type="text"
                            maxLength={15}
                            error={errors?.benificiaryId}
                        />
                    </div>
                </div>
            )}

            {/* TPA fields: Insurance Company + Ayush Covered */}
            {isTPA && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div data-field="insuranceCompany" className="scroll-mt-4 sm:col-span-2">
                        <FormInputField
                            ref={fieldRefs?.insuranceCompany as React.RefObject<HTMLInputElement>}
                            label="Insurance Company"
                            value={formData.insuranceCompany}
                            onChange={(e) => onChange("insuranceCompany", e.target.value)}
                            onBlur={() => onBlur?.("insuranceCompany")}
                            placeholder="Insurance Company"
                            type="text"
                            error={errors?.insuranceCompany}
                        />
                    </div>

                    <div className="sm:col-span-1">
                        <PatientTypeButtonGroup
                            options={ayushCoveredOptions}
                            value={formData.ayushCovered}
                            onChange={(value) => {
                                onChange("ayushCovered", value);
                                setTimeout(() => {
                                    onBlur?.("ayushCovered");
                                }, 0);
                            }}
                            label="Ayush Covered"
                            error={errors?.ayushCovered}
                            fieldRef={fieldRefs?.ayushCovered}
                            dataField="ayushCovered"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

