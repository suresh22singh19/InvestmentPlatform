"use client";

import { useMemo } from "react";
import Image from "next/image";
import { FormInputField, FormSelectField } from "@/components/ui";
import { useGetStatesQuery, useGetCitiesQuery } from "@/store/api/publicApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface BillingInformationFormData {
    gstNumber: string;
    companyName: string;
    billingAddress: string;
    billingState: string;
    billingCity: string;
    billingPincode: string;
}

interface BillingInformationProps {
    formData: BillingInformationFormData;
    onChange: (field: keyof BillingInformationFormData, value: string) => void;
    onBlur?: (field: keyof BillingInformationFormData) => void;
    /** Country ID from Personal Info (Address). When "6" = India. Used for states list and labels. */
    billingCountryId?: string;
    stateOptions?: SelectOption[];
    cityOptions?: SelectOption[];
    fieldRefs?: {
        gstNumber?: React.RefObject<HTMLInputElement | null>;
        companyName?: React.RefObject<HTMLInputElement | null>;
        billingAddress?: React.RefObject<HTMLInputElement | null>;
        billingState?: React.RefObject<HTMLDivElement | null>;
        billingCity?: React.RefObject<HTMLDivElement | null>;
        billingPincode?: React.RefObject<HTMLInputElement | null>;
    };
    errors?: Record<string, string>;
}

export default function BillingInformation({
    formData,
    onChange,
    onBlur,
    billingCountryId,
    stateOptions = [],
    cityOptions = [],
    fieldRefs,
    errors,
}: BillingInformationProps) {
    // Use country from Personal Info (Address); default to India ("6") when not set
    const countryId = billingCountryId && billingCountryId.trim() !== "" ? billingCountryId : "6";
    const isIndia = countryId === "6";

    const { data: statesData, isLoading: statesLoading } = useGetStatesQuery(
        { countryId },
        {
            skip: !countryId,
        }
    );

    // Fetch cities only when a state is selected
    const { data: citiesData, isLoading: citiesLoading } = useGetCitiesQuery(
        formData.billingState
            ? {
                stateId: formData.billingState,
            }
            : undefined,
        {
            skip: !formData.billingState,
            refetchOnMountOrArgChange: true,
        }
    );

    // Convert API data to SelectOption format for states
    const stateSelectOptions: SelectOption[] = useMemo(() => {
        if (stateOptions && stateOptions.length > 0) {
            return stateOptions;
        }
        if (statesData?.data) {
            return statesData.data.map((state: any) => ({
                value: state.id.toString(),
                label: state.name,
            }));
        }
        return [];
    }, [stateOptions, statesData]);

    // Convert API data to SelectOption format for cities
    const citySelectOptions: SelectOption[] = useMemo(() => {
        if (cityOptions && cityOptions.length > 0) {
            return cityOptions;
        }
        if (citiesData?.data) {
            return citiesData.data.map((city: any) => ({
                value: city.id.toString(),
                label: city.name,
            }));
        }
        return [];
    }, [cityOptions, citiesData]);

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/patientinfo.svg" alt="Billing info" width={20} height={20} /> Billing Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div data-field="gstNumber" className="scroll-mt-4" ref={fieldRefs?.gstNumber}>
                    <FormInputField
                        label="GST Number *"
                        value={formData.gstNumber}
                        onChange={(e) => {
                            // Allow alphanumeric characters, convert to uppercase, limit to 15 characters
                            const value = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 15);
                            onChange("gstNumber", value);
                        }}
                        onBlur={() => onBlur?.("gstNumber")}
                        placeholder="e.g., 29ABCDE1234F1Z5"
                        required
                        type="text"
                        error={errors?.gstNumber}
                    />
                </div>

                <div data-field="companyName" className="scroll-mt-4" ref={fieldRefs?.companyName}>
                    <FormInputField
                        label="Company Name *"
                        value={formData.companyName}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z0-9\s&-]/g, "");
                            onChange("companyName", value);
                        }}
                        onBlur={() => onBlur?.("companyName")}
                        placeholder="Company Name"
                        required
                        type="text"
                        error={errors?.companyName}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
                <div data-field="billingAddress" className="scroll-mt-4" ref={fieldRefs?.billingAddress}>
                    <FormInputField
                        label="Billing Address *"
                        value={formData.billingAddress}
                        onChange={(e) => {
                            // Allow only alphanumeric characters, spaces, and common address characters (comma, period, dash, slash)
                            // Block special characters like $, %, &, *, #, etc.
                            const value = e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/]/g, "");
                            onChange("billingAddress", value);
                        }}
                        onBlur={() => onBlur?.("billingAddress")}
                        placeholder="Billing Address"
                        required
                        type="text"
                        error={errors?.billingAddress}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div data-field="billingState" className="scroll-mt-4" ref={fieldRefs?.billingState}>
                    <FormSelectField
                        label="State *"
                        options={stateSelectOptions}
                        disabled={statesLoading}
                        value={formData.billingState || null}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("billingState", selectedValue || "");
                            // Clear city when state changes
                            if (selectedValue) {
                                onChange("billingCity", "");
                                setTimeout(() => {
                                    onBlur?.("billingState");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("billingState")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.billingState && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.billingState}</p>
                    )}
                </div>

                <div data-field="billingCity" className="scroll-mt-4" ref={fieldRefs?.billingCity}>
                    <FormSelectField
                        label={isIndia ? "District *" : "City *"}
                        options={citySelectOptions}
                        disabled={citiesLoading || !formData.billingState}
                        value={formData.billingCity || null}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("billingCity", selectedValue || "");
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("billingCity");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("billingCity")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.billingCity && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.billingCity}</p>
                    )}
                </div>

                <div data-field="billingPincode" className="scroll-mt-4" ref={fieldRefs?.billingPincode}>
                    <FormInputField
                        label={isIndia ? "Pin Code *" : "ZIP/Postal Code *"}
                        value={formData.billingPincode}
                        onChange={(e) => {
                            const raw = e.target.value;
                            const value = isIndia
                                ? raw.replace(/\D/g, "").slice(0, 6)
                                : raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
                            onChange("billingPincode", value);
                        }}
                        onBlur={() => onBlur?.("billingPincode")}
                        placeholder={isIndia ? "Pincode" : "ZIP/Postal Code (4-10 characters)"}
                        required
                        type="tel"
                        error={errors?.billingPincode}
                    />
                </div>
            </div>
        </div>
    );
}

