"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Dialog, Button, MessageDialog } from "@/components/ui";
import { useCancelRazorpayPosPaymentMutation } from "@/store/api/registrationApi";

interface ProcessingPaymentDialogProps {
    open: boolean;
    onClose: () => void;
    onTimeout: () => void;
    onSuccess?: () => void;
    onError?: () => void;
    onCancelSuccess?: () => void; // Callback when cancel API succeeds - stops polling
    duration: number; // Duration in seconds (default 120 for 2 minutes)
    paymentStatus?: "processing" | "success" | "error" | null; // External payment status override
    posMachineName?: string; // Selected POS machine name to display in header
    p2pRequestId?: string | null; // P2P request ID for cancel API
    razorpayPosMachineId?: number | string | null; // POS machine ID for cancel API
}

export default function ProcessingPaymentDialog({
    open,
    onClose,
    onTimeout,
    onSuccess,
    onError,
    onCancelSuccess,
    duration = 120,
    paymentStatus: externalPaymentStatus,
    posMachineName = "",
    p2pRequestId = null,
    razorpayPosMachineId = null,
}: ProcessingPaymentDialogProps) {
    const [timeRemaining, setTimeRemaining] = useState(duration - 1); // Start at 1:59 instead of 2:00
    const [internalPaymentStatus, setInternalPaymentStatus] = useState<"processing" | "success" | "error" | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showCancelSuccessDialog, setShowCancelSuccessDialog] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const onTimeoutRef = useRef(onTimeout);
    const isRunningRef = useRef(false);
    const wasManuallyClosedRef = useRef(false);
    
    // Mutation hook for canceling payment
    const [cancelRazorpayPosPayment] = useCancelRazorpayPosPaymentMutation();

    // Keep onTimeout ref updated
    useEffect(() => {
        onTimeoutRef.current = onTimeout;
    }, [onTimeout]);

    // Use external status if provided, otherwise use internal status
    const paymentStatus = externalPaymentStatus !== undefined ? externalPaymentStatus : internalPaymentStatus;

    // Start countdown timer when dialog opens (no timeout - just for display)
    useEffect(() => {
        // Only start timer if dialog is open, no external status, and timer is not already running
        if (!open || externalPaymentStatus !== undefined || isRunningRef.current) {
            return;
        }

        // Clear any existing interval first
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Start timer at duration - 1 to show 1:59 initially instead of 2:00
        setTimeRemaining(duration - 1);
        setInternalPaymentStatus("processing");
        isRunningRef.current = true;

        // Reset manual close flag when timer starts
        wasManuallyClosedRef.current = false;

        // Start countdown - update every second (for display only, no timeout action)
        intervalRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    // Reset to duration - 1 to continue countdown (no timeout)
                    return duration - 1;
                }
                return newTime;
            });
        }, 1000);

        // Cleanup function
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            isRunningRef.current = false;
            // Don't reset wasManuallyClosedRef here - it should persist if user manually closed
        };
    }, [open, duration, externalPaymentStatus]);

    // Handle external payment status changes
    useEffect(() => {
        if (externalPaymentStatus === "success") {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (onSuccess) {
                onSuccess();
            }
        } else if (externalPaymentStatus === "error") {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (onError) {
                onError();
            }
        }
    }, [externalPaymentStatus, onSuccess, onError]);

    // Clean up and reset when dialog closes
    useEffect(() => {
        if (!open) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            isRunningRef.current = false;
            setTimeRemaining(duration - 1); // Reset to 1:59
            setInternalPaymentStatus(null);
            // Reset manual close flag when dialog closes
            wasManuallyClosedRef.current = false;
        }
    }, [open, duration]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Handle cancel request click - show confirmation dialog
    const handleCancelRequest = () => {
        setShowConfirmDialog(true);
    };

    // Handle confirmation dialog cancel - just close confirmation
    const handleConfirmCancel = () => {
        setShowConfirmDialog(false);
    };

    // Handle confirmation dialog confirm - proceed with cancellation
    const handleConfirmConfirm = async () => {
        setShowConfirmDialog(false);
        setIsCanceling(true);
        
        try {
            // Call cancel API if we have the required IDs
            if (p2pRequestId && razorpayPosMachineId) {
                await cancelRazorpayPosPayment({
                    p2pRequestId,
                    razorpayPosMachineId,
                }).unwrap();
                console.log("Payment cancellation API call successful");
                
                // Stop polling immediately when cancel succeeds
                if (onCancelSuccess) {
                    onCancelSuccess();
                }
            } else {
                console.warn("Missing p2pRequestId or razorpayPosMachineId for cancel API");
            }
        } catch (error) {
            console.error("Error canceling payment:", error);
            // Continue with cancellation flow even if API call fails
        } finally {
            setIsCanceling(false);
            setShowCancelSuccessDialog(true);
        }
    };

    // Handle cancel success dialog close - actually close the processing dialog
    const handleCancelSuccessClose = () => {
        setShowCancelSuccessDialog(false);
        
        // Mark as manually closed to prevent timeout callback
        wasManuallyClosedRef.current = true;
        
        // Clear the interval and stop the timer
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        isRunningRef.current = false;
        setInternalPaymentStatus(null);
        setTimeRemaining(duration - 1); // Reset to 1:59
        
        // Close the processing dialog without showing error dialog
        // Both "Cancel Successfully" and processing dialog close at the same time
        onClose();
        // Don't call onError() here - we don't want to show "Payment failed" dialog when cancel succeeds
    };

    const customHeader = (
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <h2 className="text-xl font-semibold text-[#262D3B]">
                {posMachineName || "Processing Payment"}
            </h2>
            <button
                type="button"
                onClick={handleCancelRequest}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#F2F8F2]"
                aria-label="Close dialog"
            >
                <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={24} height={24} />
            </button>
        </div>
    );

    return (
        <Dialog 
            open={open} 
            onClose={handleCancelRequest} 
            title="" 
            width={480} 
            customHeader={customHeader} 
            contentPadding="px-6 py-4"
            closeOnOutsideClick={false}
            closeOnEscape={false}
        >
            <div className="flex flex-col items-center gap-4">
                {/* Processing Icon */}
                <div className="flex h-[61px] w-[61px] items-center justify-center">
                    <Image
                        src="/icons/ProcessingIcon.svg"
                        width={61}
                        height={61}
                        alt="Processing"
                    />
                </div>

                {/* Title and Message */}
                <div className="flex flex-col items-center gap-1">
                    <h3 className="text-center text-base font-medium leading-[150%] text-[#000000]">
                        Processing Payment
                    </h3>
                    <p className="text-center text-sm font-normal leading-[150%] text-[#666666]">
                    Please wait, this may take up to {" "}
                        {paymentStatus === "processing" && (
                            <span className="text-[#0B8C00] font-medium">
                                {timeRemaining > 0 ? formatTime(timeRemaining) : "0:00"}
                            </span>
                        )}
                        {" "}seconds remaining.
                    </p>
                </div>

                {/* Circular Loading Spinner - 70x70 */}
                {paymentStatus === "processing" && (
                    <div className="flex items-center justify-center">
                        <div 
                            className="relative mx-auto"
                            style={{ 
                                width: '70px', 
                                height: '70px',
                            }}
                        >
                            {[...Array(8)].map((_, i) => {
                                // Calculate position for each dot in a circle
                                // 8 dots evenly spaced around a circle
                                const angle = (i * 360) / 8 - 90; // Start from top (-90 degrees)
                                const radius = 26; // Distance from center (70/2 - 9 to leave space for dots)
                                const centerX = 35; // Center of 70px container
                                const centerY = 35; // Center of 70px container
                                
                                // Convert angle to radians and calculate position
                                const angleRad = (angle * Math.PI) / 180;
                                const x = centerX + radius * Math.cos(angleRad);
                                const y = centerY + radius * Math.sin(angleRad);
                                
                                return (
                                    <div
                                        key={i}
                                        className="absolute rounded-full bg-[#0B8C00]"
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            left: `${x}px`,
                                            top: `${y}px`,
                                            transform: 'translate(-50%, -50%)',
                                            animation: 'circularProcessingPulse 1.2s ease-in-out infinite',
                                            animationDelay: `${i * 0.15}s`,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Cancel Request Button */}
                {paymentStatus === "processing" && (
                    <div className="pt-2">
                        <Button
                            variant="primary"
                            size="large"
                            fullWidth
                            onClick={handleCancelRequest}
                            className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors"
                        >
                            Cancel Request
                        </Button>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            <MessageDialog
                open={showConfirmDialog}
                onClose={handleConfirmCancel}
                icon="/icons/ErrorIcon.svg"
                iconBgColor="#FFEBEE"
                message="Are you sure, you want to cancel"
                confirmText="Confirm"
                cancelText="Cancel"
                showCancel={true}
                onConfirm={handleConfirmConfirm}
                onCancel={handleConfirmCancel}
            />

            {/* Cancel Success Dialog */}
            <MessageDialog
                open={showCancelSuccessDialog}
                onClose={handleCancelSuccessClose}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message="Cancel Successfully"
                confirmText="OK"
                showCancel={false}
                onConfirm={handleCancelSuccessClose}
            />
        </Dialog>
    );
}
