"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, SpinnerLoader } from "@/components/ui";
import {
    useLazyGetAdmissionDetailsQuery,
    type FutureAdmissionItem,
    type CheckFirstDayPaymentResponse,
    type CompletePatientAdmissionRoom,
    type AdmissionDetailsData,
} from "@/store/api/counsellorApi";
import RoomAllocation from "../start-counselling/roomAllowcation";
import AdmissionPayment from "../start-counselling/admission&payment";

function mapAdmissionTypeToUi(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === "immediate") return "immediate";
    if (normalized === "schedule" || normalized === "scheduled") return "scheduled";
    if (normalized === "tentative") return "tentative";
    return "scheduled";
}

export interface FutureAdmissionProceedFlowState {
    item: FutureAdmissionItem;
    paymentData: CheckFirstDayPaymentResponse["data"];
    showPaymentStep: boolean;
    currentStep: number;
}

interface FutureAdmissionProceedFlowProps {
    flow: FutureAdmissionProceedFlowState;
    onClose: () => void;
    onComplete: () => void;
    onStepChange: (step: number) => void;
}

export default function FutureAdmissionProceedFlow({
    flow,
    onClose,
    onComplete,
    onStepChange,
}: FutureAdmissionProceedFlowProps) {
    const { item, paymentData, showPaymentStep, currentStep } = flow;
    const patientIdForRoom = item.patientId ?? item.id;
    const remainingAmount = parseFloat(paymentData.remainingForFirstDay || "0");
    const perDayCost = parseFloat(paymentData.perDayCost || "0");
    const [roomAllocation, setRoomAllocation] = useState<CompletePatientAdmissionRoom | null>(null);
    const [admissionDetails, setAdmissionDetails] = useState<AdmissionDetailsData | null>(null);
    const [admissionLoadError, setAdmissionLoadError] = useState("");

    const [fetchAdmissionDetails, { isFetching: isAdmissionLoading }] = useLazyGetAdmissionDetailsQuery();

    const loadAdmissionDetails = useCallback(async () => {
        setAdmissionLoadError("");
        // const candidateIds = [
        //     item.id,
        //     paymentData.patientPackageId,
        //     item.patientPackageId,
        //     item.patientId,
        // ].filter((id, index, arr) => id != null && arr.indexOf(id) === index);

        const candidateIds = [
            item.id,
            paymentData.patientPackageId,
            item.patientPackageId,
            item.patientId,
        ].filter(
            (id, index, arr): id is number =>
                id != null && arr.indexOf(id) === index
        );

        for (const candidateId of candidateIds) {
            
            try {
                const res = await fetchAdmissionDetails(candidateId, false).unwrap();
                if (res.success && res.data) {
                    setAdmissionDetails(res.data);
                    return;
                }
            } catch {
                // Try next candidate id
            }
        }

        setAdmissionDetails(null);
        setAdmissionLoadError("Unable to load admission details for payment. Please try again.");
    }, [
        item.id,
        item.patientPackageId,
        item.patientId,
        paymentData.patientPackageId,
        fetchAdmissionDetails,
    ]);

    useEffect(() => {
        if (!showPaymentStep) return;
        void loadAdmissionDetails();
    }, [showPaymentStep, loadAdmissionDetails]);

    const totalSteps = showPaymentStep ? 2 : 1;
    const isOnRoomStep = currentStep === 1;
    const isOnPaymentStep = showPaymentStep && currentStep === 2;

    const handleRoomAllocationSuccess = () => {
        if (showPaymentStep) {
            onStepChange(2);
            return;
        }
        onComplete();
    };

    if (showPaymentStep && isOnPaymentStep && isAdmissionLoading && !admissionDetails) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-xl font-bold text-[#262D3B]">
                            Admission Payment — {item.patientName}
                        </h2>
                        <p className="text-xs font-semibold text-[#787E8C]">
                            UHID: <span className="text-[#262D3B]">{item.uhid || "N/A"}</span>
                            {" "}• Remaining first-day payment:{" "}
                            <span className="text-[#262D3B]">
                                ₹ {remainingAmount.toLocaleString("en-IN")}
                            </span>
                        </p>
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        ← Back to Future Admissions
                    </Button>
                </div>
                <div className="flex min-h-[320px] items-center justify-center">
                    <SpinnerLoader size={40} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-[#262D3B]">
                        {isOnPaymentStep ? "Admission Payment" : "Room Allocation"} — {item.patientName}
                    </h2>
                    <p className="text-xs font-semibold text-[#787E8C]">
                        UHID: <span className="text-[#262D3B]">{item.uhid || "N/A"}</span>
                        {showPaymentStep && isOnPaymentStep ? (
                            <>
                                {" "}
                                • Remaining first-day payment:{" "}
                                <span className="text-[#262D3B]">
                                    ₹ {remainingAmount.toLocaleString("en-IN")}
                                </span>
                            </>
                        ) : null}
                    </p>
                </div>
                <Button variant="outline" onClick={onClose}>
                    ← Back to Future Admissions
                </Button>
            </div>

            <div className="flex items-center gap-2 self-end pr-2 select-none">
                <div className="flex flex-col items-center gap-1">
                    <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            currentStep >= 1 ? "bg-[#0B8C00] text-white" : "border border-[#DFE0E2] bg-white text-[#787E8C]"
                        }`}
                    >
                        1
                    </div>
                    <span className={`text-xs font-semibold ${currentStep >= 1 ? "text-[#0B8C00]" : "text-[#787E8C]"}`}>
                        Room
                    </span>
                </div>

                {showPaymentStep && (
                    <>
                        <div
                            className={`mx-1 mt-[13px] w-20 rounded-full ${
                                currentStep > 1 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                            }`}
                        />
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                    currentStep >= 2
                                        ? "bg-[#0B8C00] text-white"
                                        : "border border-[#DFE0E2] bg-white text-[#787E8C] opacity-50"
                                }`}
                            >
                                2
                            </div>
                            <span
                                className={`text-xs font-semibold ${
                                    currentStep >= 2 ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"
                                }`}
                            >
                                Payment
                            </span>
                        </div>
                    </>
                )}
            </div>

            {isOnRoomStep ? (
                <RoomAllocation
                    roomAllocatedHitAPI={!showPaymentStep}
                    activePackage={{
                        id: paymentData.patientPackageId?.toString(),
                        packageName: item.package || "Selected Package",
                        branchRoomType: {
                            roomRentPrice: perDayCost || 1500,
                        },
                    }}
                    id={item.id}
                    patientId={patientIdForRoom}
                    patientPackageId={paymentData.patientPackageId}
                    patientDetails={{
                        patientName: item.patientName,
                        patientUhid: item.uhid,
                        diagnosis: item.package,
                        doctorName: item.doctorName,
                    }}
                    onConfirmAllocation={(allocation) => {
                        setRoomAllocation({
                            buildingId: allocation.buildingId,
                            floorId: allocation.floorId,
                            roomId: allocation.roomId,
                            bedId: allocation.bedId,
                        });
                    }}
                    onSuccess={handleRoomAllocationSuccess}
                    onCancel={onClose}
                    onBack={onClose}
                />
            ) : null}

            {isOnPaymentStep && admissionDetails ? (
                <AdmissionPayment
                    activePackage={{
                        packageName: item.package || admissionDetails.packageId?.toString(),
                        remark: "",
                    }}
                    finalAmountPayable={remainingAmount > 0 ? remainingAmount : perDayCost}
                    roomRentPerDay={perDayCost}
                    medicinePerDay={0}
                    mealsPerDay={0}
                    doctorFee={0}
                    patientName={item.patientName}
                    patientUhid={item.uhid}
                    branchId={admissionDetails.branchId}
                    appointmentId={admissionDetails.appointmentId}
                    packageId={admissionDetails.packageId}
                    numberOfDays={admissionDetails.numberOfDays}
                    offerApplied={admissionDetails.offerApplied}
                    offerId={admissionDetails.offerId}
                    admissionType={mapAdmissionTypeToUi(admissionDetails.admissionType)}
                    patientType={admissionDetails.patientType}
                    diseaseType={admissionDetails.diseaseType}
                    originalAmount={admissionDetails.originalAmount}
                    discountAmount={admissionDetails.discountAmount}
                    netPayable={remainingAmount > 0 ? remainingAmount : admissionDetails.netPayable}
                    roomAllocation={roomAllocation}
                    requireRoomAllocation={showPaymentStep}
                    editPaymentAmounts={{
                        advanceAmount: admissionDetails.advanceAmount,
                        receivedAmount: paymentData.totalReceived,
                        remainingAmount,
                    }}
                    isEditMode
                    futureAdmissionPayment={{
                        patientId: patientIdForRoom,
                        id: item.id,
                    }}
                    onNext={onComplete}
                    onBack={() => onStepChange(1)}
                />
            ) : null}

            {isOnPaymentStep && !admissionDetails && !isAdmissionLoading ? (
                <div className="rounded-[20px] border border-[#DFE0E2] bg-white p-8 text-center">
                    <p className="text-sm text-[#787E8C]">
                        {admissionLoadError || "Unable to load admission details for payment. Please try again."}
                    </p>
                    <Button
                        variant="primary"
                        className="mt-4"
                        onClick={() => void loadAdmissionDetails()}
                    >
                        Retry
                    </Button>
                </div>
            ) : null}

            {showPaymentStep && isOnRoomStep && totalSteps === 2 ? (
                <div className="rounded-[20px] border border-[#E3EEE1] bg-[#F2FAF2] p-4 text-xs font-semibold text-[#475569]">
                    Complete room allocation first. The payment step will open next to collect the
                    remaining first-day amount of ₹ {remainingAmount.toLocaleString("en-IN")}.
                </div>
            ) : null}
        </div>
    );
}
