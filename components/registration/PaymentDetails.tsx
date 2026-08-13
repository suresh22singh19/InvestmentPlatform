"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { FormInputField, FormSelectField } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import SelectPosMachineDialog from "./SelectPosMachineDialog";
import type { RazorpayPosMachineUser } from "@/store/api/registrationApi";
import { formatIndianAmount } from "@/store/utils/formatIndianAmount";

export interface PaymentDetailsFormData {
    consultationCharges: string;
    paymentMode: string;
    transactionId: string;
}

interface PaymentDetailsProps {
    formData: PaymentDetailsFormData;
    onChange: (field: keyof PaymentDetailsFormData, value: string) => void;
    onBlur?: (field: keyof PaymentDetailsFormData) => void;
    consultationChargesOptions?: SelectOption[];
    paymentModeOptions?: SelectOption[];
    razorpayPosMachineUsers?: RazorpayPosMachineUser[];
    fieldRefs?: {
        consultationCharges?: React.RefObject<HTMLDivElement | null>;
        paymentMode?: React.RefObject<HTMLDivElement | null>;
        transactionId?: React.RefObject<HTMLInputElement | null>;
    };
    errors?: Record<string, string>;
    onCreditSelected?: (posMachineName: string, posMachineId?: string) => void; // Callback when Credit is selected and POS machine is chosen, passes POS machine name and ID
    paymentData?: {
        amount: number;
        customerMobile: string;
        patientUhid: string;
        patientType: string;
        description: string;
    };
    onPaymentSuccess?: (response: unknown) => void;
    onPaymentError?: (error: unknown) => void;
}

export default function PaymentDetails({
    formData,
    onChange,
    onBlur,
    consultationChargesOptions = [
        { value: "500", label: "500" },
        { value: "1000", label: "1000" },
        { value: "2000", label: "2000" },
    ],
    paymentModeOptions = [
        { value: "cash", label: "Cash" },
        { value: "credit", label: "Online Payment" },
    ],
    razorpayPosMachineUsers = [],
    fieldRefs,
    errors,
    onCreditSelected,
    paymentData,
    onPaymentSuccess,
    onPaymentError,
}: PaymentDetailsProps) {
    const [showPosDialog, setShowPosDialog] = useState(false);
    const [previousPaymentMode, setPreviousPaymentMode] = useState<string>("");
    const isDigitalPayment = formData.paymentMode?.toLowerCase() === "credit";
    const hasPosMachineAccess = razorpayPosMachineUsers && razorpayPosMachineUsers.length > 0;
    const consultationChargesAmount = parseFloat(formData.consultationCharges || "0") || 0;
    const showPaymentMode = consultationChargesAmount > 0;

    const formattedConsultationChargesOptions = useMemo(() => {
        return (consultationChargesOptions || []).map((option) => ({
            ...option,
            label: formatIndianAmount(option.label || option.value),
        }));
    }, [consultationChargesOptions]);

    // Handle payment mode change
    useEffect(() => {
        const currentPaymentMode = formData.paymentMode?.toLowerCase() || "";
        const prevPaymentMode = previousPaymentMode?.toLowerCase() || "";

        // When payment mode changes to Credit, show POS dialog
        // Only show if it's a new Credit selection (not already Credit)
        if (currentPaymentMode === "credit" && prevPaymentMode !== "credit") {
            setShowPosDialog(true);
        }
        // If switching away from Credit, close any open POS dialog
        else if (currentPaymentMode !== "credit" && prevPaymentMode === "credit") {
            setShowPosDialog(false);
        }

        // Update previous payment mode
        setPreviousPaymentMode(formData.paymentMode || "");
    }, [formData.paymentMode, previousPaymentMode]);

    const handlePosMachineSelect = (posMachineId: string, posMachineName: string) => {
        // Store the selected POS machine (can be used later if needed)
        // Close the dialog and trigger the callback with POS machine name and ID
        setShowPosDialog(false);
        if (onCreditSelected) {
            onCreditSelected(posMachineName, posMachineId);
        }
    };

    const handlePosDialogCancel = () => {
        // Empty payment mode field when cancel is clicked
        setShowPosDialog(false);
        onChange("paymentMode", "");
        onChange("transactionId", "");
    };

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mb-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/PaymnetIcon.svg" alt="Payment info" width={20} height={20} /> Payment Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
                <div data-field="consultationCharges" className="scroll-mt-4" ref={fieldRefs?.consultationCharges}>
                    <FormSelectField
                        label="Consultation Charges *"
                        options={formattedConsultationChargesOptions}
                        value={formData.consultationCharges || null}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("consultationCharges", selectedValue || "");
                            if (parseFloat(selectedValue || "0") === 0) {
                                onChange("paymentMode", "");
                                onChange("transactionId", "");
                            }
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("consultationCharges");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("consultationCharges")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.consultationCharges && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.consultationCharges}</p>
                    )}
                </div>
            </div>

            {showPaymentMode && (
                <div className={`grid gap-4 mb-4 ${isDigitalPayment ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <div data-field="paymentMode" className="scroll-mt-4" ref={fieldRefs?.paymentMode}>
                        <FormSelectField
                            label="Payment Mode *"
                            options={hasPosMachineAccess
                                ? paymentModeOptions
                                : paymentModeOptions.filter(option => option.value !== "credit")
                            }
                            value={formData.paymentMode || null}
                            onChange={(value) => {
                                const selectedValue = Array.isArray(value) ? value[0] : value;
                                // Prevent selecting Credit if no POS machine access
                                if (selectedValue?.toLowerCase() === "credit" && !hasPosMachineAccess) {
                                    return;
                                }
                                onChange("paymentMode", selectedValue || "");
                                // Clear transaction ID when payment mode changes to Cash
                                if (selectedValue?.toLowerCase() === "cash") {
                                    onChange("transactionId", "");
                                }
                                if (selectedValue) {
                                    setTimeout(() => {
                                        onBlur?.("paymentMode");
                                    }, 0);
                                }
                            }}
                            onBlur={() => onBlur?.("paymentMode")}
                            placeholder="Select"
                            mode="single"
                            background="white"
                        />
                        {errors?.paymentMode && (
                            <p className="mt-1 text-xs text-[#F6776E]">{errors.paymentMode}</p>
                        )}
                        {!hasPosMachineAccess && (
                            <p className="mt-1 text-xs text-[#F6776E]">
                                Online Payment is not available. You don't have access to any POS machines.
                            </p>
                        )}
                    </div>

                    {isDigitalPayment && (
                        <div data-field="transactionId" className="scroll-mt-4" ref={fieldRefs?.transactionId}>
                            <FormInputField
                                label="Transaction ID (if digital payment) *"
                                value={formData.transactionId}
                                onChange={(e) => {
                                    // Limit to 30 characters (25-30 characters max as per requirement)
                                    const value = e.target.value.slice(0, 30);
                                    onChange("transactionId", value);
                                }}
                                onBlur={() => onBlur?.("transactionId")}
                                placeholder="Transaction ID"
                                required
                                type="text"
                                minLength={10}
                                maxLength={30}
                                error={errors?.transactionId}
                                readOnly
                            />
                        </div>
                    )}
                </div>
            )}

            {/* POS Machine Selection Dialog */}
            <SelectPosMachineDialog
                open={showPosDialog}
                onClose={handlePosDialogCancel}
                onSelect={handlePosMachineSelect}
                razorpayPosMachineUsers={razorpayPosMachineUsers}
                paymentData={paymentData}
                onPaymentSuccess={onPaymentSuccess}
                onPaymentError={onPaymentError}
            />
        </div>
    );
}

