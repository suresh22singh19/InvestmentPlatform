"use client";

import Image from "next/image";
import { useMemo, useEffect } from "react";
import { FormInputField, FormSelectField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetPanelsQuery } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectSelectedBranch } from "@/store/slices/authSlice";
import {
    isPanelNameHiddenFromPanelTypeDropdown,
    DEFAULT_PANEL_NAME_FOR_PRIVATE,
    DEFAULT_PANEL_NAME_FOR_TPA_TYPE,
    findActivePanelIdStringByName,
} from "@/lib/registration/panelDropdownFilter";

export interface PatientTypeFormData {
    patientType: string;
    patientSubType: string;
    panelId: string;
    benificiaryId: string;
    insuranceCompany: string;
    ayushCovered: string;
}

interface PatientTypeProps {
    /**
     * Scope panel options to this branch (`GET /admin/settings/panel?branchId=`).
     * Pass from the page when it knows the active branch (e.g. registration `registrationBranchId`, pre-booking `effectivePreBookingBranchId`).
     * If omitted, falls back to header selected branch / user branch from auth.
     */
    panelsBranchId?: number;
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
    panelsBranchId,
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

    const authUserBranchId = useAppSelector(selectUserBranchId);
    const headerSelectedBranch = useAppSelector(selectSelectedBranch);
    const fallbackPanelsBranchId = useMemo(() => {
        const raw = headerSelectedBranch?.id ?? authUserBranchId;
        if (raw == null) return undefined;
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) && n >= 1 ? n : undefined;
    }, [headerSelectedBranch?.id, authUserBranchId]);

    const effectivePanelsBranchId = panelsBranchId ?? fallbackPanelsBranchId;

    const isPrivate = formData.patientType.toLowerCase() === "private";
    const isPanel = formData.patientType.toLowerCase() === "panel";
    const isTPA = formData.patientType.toLowerCase() === "tpa";

    // Fetch panels for the active branch (required by API)
    const { data: panelsData } = useGetPanelsQuery(
        effectivePanelsBranchId != null
            ? { page: 1, limit: 100, branchId: effectivePanelsBranchId }
            : undefined,
        {
            skip:
                effectivePanelsBranchId == null ||
                !Number.isFinite(effectivePanelsBranchId) ||
                effectivePanelsBranchId < 1,
        }
    );

    // Transform panels to SelectOption format
    // When "Panel" patient type is selected, omit default rows named "Normal" and "TPA" (IDs vary by env)
    const panelOptions: SelectOption[] = useMemo(() => {
        if (!panelsData?.data) return [];
        return panelsData.data
            .filter((panel) => {
                const isActive = panel.status === "active" || panel.status === "Active";
                if (!isActive) return false;
                if (isPanel && isPanelNameHiddenFromPanelTypeDropdown(panel.name)) return false;
                return true;
            })
            .map((panel) => ({
                value: panel.id.toString(),
                label: panel.name,
            }));
    }, [panelsData, isPanel]);

    const privateDefaultPanelId = useMemo(
        () => findActivePanelIdStringByName(panelsData?.data, DEFAULT_PANEL_NAME_FOR_PRIVATE),
        [panelsData?.data]
    );
    const tpaDefaultPanelId = useMemo(
        () => findActivePanelIdStringByName(panelsData?.data, DEFAULT_PANEL_NAME_FOR_TPA_TYPE),
        [panelsData?.data]
    );

    // Auto-set panelId when patientType is Private/TPA — ids come from GET /admin/settings/panel (Normal + TPA rows)
    useEffect(() => {
        const patientTypeLower = formData.patientType.toLowerCase();
        const currentPanelId = formData.panelId?.trim() || "";

        if (patientTypeLower === "private" && privateDefaultPanelId && currentPanelId !== privateDefaultPanelId) {
            onChange("panelId", privateDefaultPanelId);
        } else if (patientTypeLower === "tpa" && tpaDefaultPanelId && currentPanelId !== tpaDefaultPanelId) {
            onChange("panelId", tpaDefaultPanelId);
        }
    }, [formData.patientType, formData.panelId, onChange, privateDefaultPanelId, tpaDefaultPanelId]);

    const handlePatientTypeChange = (value: string) => {
        onChange("patientType", value);
        // Set panelId based on patient type and clear fields that shouldn't be visible
        if (value.toLowerCase() === "private") {
            onChange("panelId", privateDefaultPanelId ?? "");
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
            onChange("panelId", tpaDefaultPanelId ?? "");
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
            <div className="mb-4 lg:w-1/3 md:w-1/2 w-full">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
                                // Only allow digits, max 15 characters
                                const value = e.target.value.replace(/\D/g, "").slice(0, 15);
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
                                if (formData.benificiaryId.length >= 15 && e.key.match(/^\d$/)) {
                                    e.preventDefault();
                                    return;
                                }
                                
                                // Block non-digits (only allow 0-9)
                                if (!e.key.match(/^\d$/)) {
                                    e.preventDefault();
                                }
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const pastedText = e.clipboardData.getData("text");
                                // Only allow digits, max 15
                                const cleanedText = pastedText.replace(/\D/g, "").slice(0, 15);
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
                            onChange={(e) => {
                                // Allow only alphabet characters and spaces, max 100 characters
                                let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                // Ensure first character is uppercase
                                if (value.length > 0) {
                                    value = value.charAt(0).toUpperCase() + value.slice(1);
                                }
                                value = value.slice(0, 100);
                                onChange("insuranceCompany", value);
                            }}
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

