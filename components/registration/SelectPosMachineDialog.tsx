"use client";

import { useState, useMemo } from "react";
import { Dialog, Button } from "@/components/ui";
import { useCreateRazorpayPosPaymentInitiationMutation } from "@/store/api/registrationApi";
import type { RazorpayPosMachineUser } from "@/store/api/registrationApi";

interface PosMachineOption {
    id: string;
    name: string;
    machineId: number | string;
    enabled: boolean;
}

interface PaymentData {
    amount: number;
    customerMobile: string;
    patientUhid: string;
    patientType: string;
    description: string;
}

interface SelectPosMachineDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (posMachineId: string, posMachineName: string) => void;
    razorpayPosMachineUsers?: RazorpayPosMachineUser[];
    paymentData?: PaymentData;
    onPaymentSuccess?: (response: unknown) => void;
    onPaymentError?: (error: unknown) => void;
}

// All available POS machine types
const ALL_POS_MACHINES = [
    { id: "razorpay", name: "Razorpay POS Machine", type: "razorpay" },
    { id: "payu", name: "PayU POS Machine", type: "payu" },
    { id: "pinelabs", name: "PineLabs POS Machine", type: "pinelabs" },
] as const;

export default function SelectPosMachineDialog({
    open,
    onClose,
    onSelect,
    razorpayPosMachineUsers = [],
    paymentData,
    onPaymentSuccess,
    onPaymentError,
}: SelectPosMachineDialogProps) {
    const [selectedPosMachine, setSelectedPosMachine] = useState<string | null>(null);
    const [createRazorpayPosPaymentInitiation, { isLoading: isSubmitting }] = useCreateRazorpayPosPaymentInitiationMutation();

    // Get list of machine IDs the user has access to
    const accessibleMachineIds = useMemo(() => {
        if (!razorpayPosMachineUsers || razorpayPosMachineUsers.length === 0) {
            return new Set<string>();
        }
        return new Set(
            razorpayPosMachineUsers.map((user) => String(user.razarpayPosMachine.id))
        );
    }, [razorpayPosMachineUsers]);

    // Create all POS machine options with enabled/disabled status
    const posMachines: PosMachineOption[] = useMemo(() => {
        return ALL_POS_MACHINES.map((machine) => {
            // For Razorpay, check if user has access to any Razorpay machine
            // For other types (PayU, PineLabs), they are disabled for now
            const isEnabled = machine.type === "razorpay" && accessibleMachineIds.size > 0;
            
            // Get the first accessible Razorpay machine ID if available
            const machineId = machine.type === "razorpay" && accessibleMachineIds.size > 0
                ? Array.from(accessibleMachineIds)[0]
                : machine.id;

            return {
                id: machine.id,
                name: machine.type === "razorpay" && accessibleMachineIds.size > 0
                    ? `Razorpay POS Machine ${Array.from(accessibleMachineIds)[0]}`
                    : machine.name,
                machineId: machineId,
                enabled: isEnabled,
            };
        });
    }, [accessibleMachineIds]);

    // Check if user has access to any POS machines
    const hasPosMachineAccess = accessibleMachineIds.size > 0;

    const handleSelect = (posMachine: PosMachineOption) => {
        if (!posMachine.enabled) {
            return; // Don't allow selection of disabled machines
        }
        setSelectedPosMachine(posMachine.id);
    };

    const handleSendPaymentRequest = async () => {
        if (selectedPosMachine) {
            const selectedMachine = posMachines.find(m => m.id === selectedPosMachine && m.enabled);
            if (selectedMachine && paymentData) {
                try {
                    // Call the API to create Razorpay POS payment initiation
                    const response = await createRazorpayPosPaymentInitiation({
                        razorpayPosMachineId: selectedMachine.machineId.toString(),
                        amount: paymentData.amount,
                        paymentMethod: "all",
                        customerMobile: paymentData.customerMobile,
                        patientUhid: paymentData.patientUhid,
                        patientType: "opd", // Static value for this API
                        description: "Consultancy payment", // Static value for this API
                    }).unwrap();

                    // Call success callback if provided
                    if (onPaymentSuccess) {
                        onPaymentSuccess(response);
                    }

                    // Also call the original onSelect callback
                    onSelect(selectedMachine.machineId.toString(), selectedMachine.name);
                    setSelectedPosMachine(null);
                } catch (error) {
                    // Close the dialog first
                    setSelectedPosMachine(null);
                    
                    // Call error callback if provided
                    if (onPaymentError) {
                        onPaymentError(error);
                    } else {
                        console.error("Error creating Razorpay POS payment initiation:", error);
                    }
                }
            } else if (selectedMachine) {
                // If no payment data, just call onSelect (backward compatibility)
                onSelect(selectedMachine.machineId.toString(), selectedMachine.name);
                setSelectedPosMachine(null);
            }
        }
    };

    const handleCancel = () => {
        setSelectedPosMachine(null);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            title="Select POS Machine"
            width={529}
        >
            <div className="flex flex-col gap-8">
                {/* POS Machine Options */}
                <div className="flex flex-col gap-[12px]">
                    {posMachines.map((posMachine) => {
                        const isSelected = selectedPosMachine === posMachine.id;
                        const isDisabled = !posMachine.enabled;
                        return (
                            <button
                                key={posMachine.id}
                                onClick={() => handleSelect(posMachine)}
                                disabled={isDisabled}
                                className={`
                                    w-full px-8 py-4 rounded-[32px] border transition-all duration-200
                                    flex items-center justify-center
                                    ${isDisabled
                                        ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                                        : isSelected
                                        ? "bg-[#0B8C00] border-[#0B8C00] text-white cursor-pointer"
                                        : "bg-white border-[#0B8C00] text-[#0B8C00] hover:bg-[#F2F8F2] cursor-pointer"
                                    }
                                `}
                            >
                                <span className="font-inter font-medium text-base leading-[120%]">
                                    {posMachine.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="large"
                        fullWidth
                        onClick={handleCancel}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="large"
                        fullWidth
                        onClick={handleSendPaymentRequest}
                        disabled={!selectedPosMachine || !hasPosMachineAccess || isSubmitting}
                        className="flex-1"
                    >
                        {isSubmitting ? "Sending..." : "Send Payment Request"}
                    </Button>

                </div>
            </div>
        </Dialog>
    );
}
