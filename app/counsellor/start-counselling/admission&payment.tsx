"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import PaymentDialogDetails from "@/components/registration/PaymentDialogDetails";
import {
    FormInputField,
    SegmentedToggle,
    Badge,
    Button,
    BackToPreviousPageButton,
    FormTextareaField
} from "@/components/ui";

interface AdmissionPaymentProps {
    activePackage: {
        packageName?: string;
        packageType?: string;
        remark?: string;
    };
    finalAmountPayable: number;
    roomRentPerDay: number;
    medicinePerDay: number;
    mealsPerDay: number;
    doctorFee: number;
    onNext: () => void;
    onBack: () => void;
}

export default function AdmissionPayment({
    activePackage,
    finalAmountPayable,
    roomRentPerDay,
    medicinePerDay,
    mealsPerDay,
    doctorFee,
    onNext,
    onBack
}: AdmissionPaymentProps) {
    // Step 2 states
    const [admissionDate, setAdmissionDate] = useState("");
    const [advancePaymentInput, setAdvancePaymentInput] = useState("2500");
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [paymentMode, setPaymentMode] = useState("complete"); // "complete" | "split"
    const [selectedMethod, setSelectedMethod] = useState("cash"); // "cash" | "credit_card" | "upi"

    // Complete mode payment states
    const [cashPaymentStatus, setCashPaymentStatus] = useState<"pending" | "verified">("pending");
    const [creditCardPaymentStatus, setCreditCardPaymentStatus] = useState<"ready" | "success">("ready");
    const [upiPaymentStatus, setUpiPaymentStatus] = useState<"ready" | "success">("ready");

    // Split mode payment amounts and statuses
    const [splitCashAmount, setSplitCashAmount] = useState("15000");
    const [splitCashStatus, setSplitCashStatus] = useState<"pending" | "verified">("pending");
    const [splitUpiAmount, setSplitUpiAmount] = useState("15000");
    const [splitUpiStatus, setSplitUpiStatus] = useState<"ready" | "success">("ready");
    const [splitCardAmount, setSplitCardAmount] = useState("2500");
    const [splitCardStatus, setSplitCardStatus] = useState<"ready" | "success">("ready");
    const [selectedOnlineSplitMethod, setSelectedOnlineSplitMethod] = useState<"razorpay" | "payu">("razorpay");

    const [specialInstructions, setSpecialInstructions] = useState("");

    const handleAmountChange = (value: string, setter: (val: string) => void) => {
        if (value === "") {
            setter("");
            return;
        }
        const regex = /^\d{0,15}(\.\d{0,2})?$/;
        if (regex.test(value)) {
            setter(value);
        }
    };

    // Dynamic calculations for split mode
    const totalReceivedSplit = useMemo(() => {
        return (
            (splitCashStatus === "verified" ? Number(splitCashAmount) : 0) +
            (selectedOnlineSplitMethod === "razorpay" && splitUpiStatus === "success" ? Number(splitUpiAmount) : 0) +
            (selectedOnlineSplitMethod === "payu" && splitCardStatus === "success" ? Number(splitCardAmount) : 0)
        );
    }, [splitCashStatus, splitCashAmount, selectedOnlineSplitMethod, splitUpiStatus, splitUpiAmount, splitCardStatus, splitCardAmount]);

    const balanceOutstandingSplit = useMemo(() => {
        return Math.max(0, finalAmountPayable - totalReceivedSplit);
    }, [finalAmountPayable, totalReceivedSplit]);

    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
            {/* Left Column: Financial Processing (takes 2 columns) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-6 shadow-sm flex flex-col gap-6">
                    <h3 className="text-xl font-semibold text-[#262D3B]">Financial Processing</h3>

                    {/* Top row: admission date & advance amount */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <FormInputField
                                label="Proposed Admission Date"
                                type="date"
                                value={admissionDate}
                                onChange={(e) => setAdmissionDate(e.target.value)}
                                height={52}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="relative">
                                <FormInputField
                                    label="Advance Payment Amount"
                                    type="number"
                                    value={advancePaymentInput}
                                    onChange={(e) => setAdvancePaymentInput(e.target.value)}
                                    height={52}
                                    className="pr-10 font-bold text-[#262D3B]"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#787E8C] font-extrabold text-base">₹</span>
                            </div>
                        </div>
                    </div>

                    {/* Mode tab selection */}
                    <div className="flex flex-col gap-2.5">
                        <span className="text-sm font-semibold text-[#787E8C] tracking-wider px-1">Mode</span>
                        <SegmentedToggle
                            options={[
                                { label: "Complete Payment", value: "complete" },
                                { label: "Split Payment", value: "split" }
                            ]}
                            value={paymentMode as "complete" | "split"}
                            onChange={(val) => setPaymentMode(val)}
                            width="440px"
                        />
                    </div>

                    {/* Mode Specific Payment Methods list */}
                    {paymentMode === "complete" ? (
                        <div className="flex flex-col gap-4 border border-[#E3EEE1] rounded-[20px] p-5 bg-[#F2FAF2]/10 select-none">
                            <span className="text-xs font-bold text-[#787E8C] uppercase tracking-wider px-1">Payment Method</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Cash */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedMethod("cash")}
                                    className={`flex items-center justify-center gap-2 h-[35px] px-[10px] rounded-[12px] border text-sm font-medium transition-all duration-200 ${selectedMethod === "cash"
                                        ? "border-[#0B8C00] bg-[#0B8C00] text-white shadow-sm"
                                        : "border-[#DFE0E2] bg-white text-[#262D3B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                                        }`}
                                >
                                    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.6364 7.3125C9.95455 7.3125 9.375 7.07552 8.89773 6.60156C8.42045 6.1276 8.18182 5.55208 8.18182 4.875C8.18182 4.19792 8.42045 3.6224 8.89773 3.14844C9.375 2.67448 9.95455 2.4375 10.6364 2.4375C11.3182 2.4375 11.8977 2.67448 12.375 3.14844C12.8523 3.6224 13.0909 4.19792 13.0909 4.875C13.0909 5.55208 12.8523 6.1276 12.375 6.60156C11.8977 7.07552 11.3182 7.3125 10.6364 7.3125ZM4.90909 9.75C4.45909 9.75 4.07386 9.59089 3.75341 9.27266C3.43295 8.95443 3.27273 8.57187 3.27273 8.125V1.625C3.27273 1.17812 3.43295 0.795573 3.75341 0.477344C4.07386 0.159115 4.45909 0 4.90909 0H16.3636C16.8136 0 17.1989 0.159115 17.5193 0.477344C17.8398 0.795573 18 1.17812 18 1.625V8.125C18 8.57187 17.8398 8.95443 17.5193 9.27266C17.1989 9.59089 16.8136 9.75 16.3636 9.75H4.90909ZM6.54545 8.125H14.7273C14.7273 7.67812 14.8875 7.29557 15.208 6.97734C15.5284 6.65911 15.9136 6.5 16.3636 6.5V3.25C15.9136 3.25 15.5284 3.09089 15.208 2.77266C14.8875 2.45443 14.7273 2.07187 14.7273 1.625H6.54545C6.54545 2.07187 6.38523 2.45443 6.06477 2.77266C5.74432 3.09089 5.35909 3.25 4.90909 3.25V6.5C5.35909 6.5 5.74432 6.65911 6.06477 6.97734C6.38523 7.29557 6.54545 7.67812 6.54545 8.125ZM15.5455 13H1.63636C1.18636 13 0.801136 12.8409 0.480682 12.5227C0.160227 12.2044 0 11.8219 0 11.375V2.4375H1.63636V11.375H15.5455V13Z" fill="currentColor" />
                                    </svg>
                                    Cash
                                </button>

                                {/* PayU */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedMethod("credit_card")}
                                    className={`flex items-center justify-center gap-2 h-[35px] px-[10px] rounded-[12px] border text-sm font-medium transition-all duration-200 ${selectedMethod === "credit_card"
                                        ? "border-[#0B8C00] bg-[#0B8C00] text-white shadow-sm"
                                        : "border-[#DFE0E2] bg-white text-[#262D3B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                                        }`}
                                >
                                    <Image src="/icons/payU.svg" alt="PayU" width={16} height={16} className="object-contain" />
                                    PayU
                                </button>

                                {/* Razor Pay */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedMethod("upi")}
                                    className={`flex items-center justify-center gap-2 h-[35px] px-[10px] rounded-[12px] border text-sm font-medium transition-all duration-200 ${selectedMethod === "upi"
                                        ? "border-[#0B8C00] bg-[#0B8C00] text-white shadow-sm"
                                        : "border-[#DFE0E2] bg-white text-[#262D3B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                                        }`}
                                >
                                    <Image src="/icons/razorpay.svg" alt="Razor Pay" width={16} height={16} className="object-contain font-medium" />
                                    Razor Pay
                                </button>
                            </div>

                            {/* Selected Method Details Card */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white py-[8px] px-[12px] rounded-[15px] border border-[#DFE0E2] mt-2">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-[#E3EEE1] text-[#0B8C00] flex items-center justify-center">
                                        {selectedMethod === "cash" && (
                                            <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10.6364 7.3125C9.95455 7.3125 9.375 7.07552 8.89773 6.60156C8.42045 6.1276 8.18182 5.55208 8.18182 4.875C8.18182 4.19792 8.42045 3.6224 8.89773 3.14844C9.375 2.67448 9.95455 2.4375 10.6364 2.4375C11.3182 2.4375 11.8977 2.67448 12.375 3.14844C12.8523 3.6224 13.0909 4.19792 13.0909 4.875C13.0909 5.55208 12.8523 6.1276 12.375 6.60156C11.8977 7.07552 11.3182 7.3125 10.6364 7.3125ZM4.90909 9.75C4.45909 9.75 4.07386 9.59089 3.75341 9.27266C3.43295 8.95443 3.27273 8.57187 3.27273 8.125V1.625C3.27273 1.17812 3.43295 0.795573 3.75341 0.477344C4.07386 0.159115 4.45909 0 4.90909 0H16.3636C16.8136 0 17.1989 0.159115 17.5193 0.477344C17.8398 0.795573 18 1.17812 18 1.625V8.125C18 8.57187 17.8398 8.95443 17.5193 9.27266C17.1989 9.59089 16.8136 9.75 16.3636 9.75H4.90909ZM6.54545 8.125H14.7273C14.7273 7.67812 14.8875 7.29557 15.208 6.97734C15.5284 6.65911 15.9136 6.5 16.3636 6.5V3.25C15.9136 3.25 15.5284 3.09089 15.208 2.77266C14.8875 2.45443 14.7273 2.07187 14.7273 1.625H6.54545C6.54545 2.07187 6.38523 2.45443 6.06477 2.77266C5.74432 3.09089 5.35909 3.25 4.90909 3.25V6.5C5.35909 6.5 5.74432 6.65911 6.06477 6.97734C6.38523 7.29557 6.54545 7.67812 6.54545 8.125ZM15.5455 13H1.63636C1.18636 13 0.801136 12.8409 0.480682 12.5227C0.160227 12.2044 0 11.8219 0 11.375V2.4375H1.63636V11.375H15.5455V13Z" fill="currentColor" />
                                            </svg>
                                        )}
                                        {selectedMethod === "credit_card" && (
                                            <Image src="/icons/payU.svg" alt="PayU" width={24} height={24} className="object-contain" />
                                        )}
                                        {selectedMethod === "upi" && (
                                            <Image src="/icons/razorpay.svg" alt="Razor Pay" width={24} height={24} className="object-contain font-medium" />
                                        )}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="font-extrabold text-[#262D3B] text-sm">
                                            {selectedMethod === "cash" && "Cash Payment"}
                                            {selectedMethod === "credit_card" && "PayU"}
                                            {selectedMethod === "upi" && "Razor Pay"}
                                        </span>
                                        <span className="text-xs font-semibold text-[#787E8C]">
                                            {selectedMethod === "cash" && (cashPaymentStatus === "verified" ? "Physical Cash Received" : "Pending Confirmation")}
                                            {selectedMethod === "credit_card" && (creditCardPaymentStatus === "success" ? "Transaction Successful" : "Ready to Pay")}
                                            {selectedMethod === "upi" && (upiPaymentStatus === "success" ? "Transaction Successful" : "Ready to Pay")}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Interactivity of Complete Payment */}
                                    {((selectedMethod === "cash" && cashPaymentStatus !== "verified") ||
                                        (selectedMethod === "credit_card" && creditCardPaymentStatus !== "success") ||
                                        (selectedMethod === "upi" && upiPaymentStatus !== "success")) ? (
                                        <>
                                            <div className="relative w-[250px]">
                                                <FormInputField
                                                    label=""
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={advancePaymentInput}
                                                    onChange={(e) => handleAmountChange(e.target.value, setAdvancePaymentInput)}
                                                    height={38}
                                                    width={250}
                                                    className="font-bold text-xs"
                                                    suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="primary"
                                                className="h-[38px]"
                                                size="medium"
                                                onClick={() => {
                                                    if (selectedMethod === "cash") setCashPaymentStatus("verified");
                                                    if (selectedMethod === "credit_card") setCreditCardPaymentStatus("success");
                                                    if (selectedMethod === "upi") setUpiPaymentStatus("success");
                                                }}
                                            >
                                                {selectedMethod === "cash" ? "Confirm" : "Pay Now"}
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                                            <span>₹ {Number(advancePaymentInput).toLocaleString()}</span>
                                            <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                                                ✓ {selectedMethod === "cash" ? "Verified" : "Success"}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SPLIT PAYMENT MODE */
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-2 select-none items-stretch">
                            {/* Left side: three split rows */}
                            <div className="flex flex-col gap-4">
                                {/* Cash Split Row */}
                                <div className="flex items-center justify-between gap-4 p-4 border border-[#DFE0E2] rounded-[15px] bg-white">
                                    <div className="flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-xl bg-[#E3EEE1] text-[#0B8C00] flex items-center justify-center">
                                            <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10.6364 7.3125C9.95455 7.3125 9.375 7.07552 8.89773 6.60156C8.42045 6.1276 8.18182 5.55208 8.18182 4.875C8.18182 4.19792 8.42045 3.6224 8.89773 3.14844C9.375 2.67448 9.95455 2.4375 10.6364 2.4375C11.3182 2.4375 11.8977 2.67448 12.375 3.14844C12.8523 3.6224 13.0909 4.19792 13.0909 4.875C13.0909 5.55208 12.8523 6.1276 12.375 6.60156C11.8977 7.07552 11.3182 7.3125 10.6364 7.3125ZM4.90909 9.75C4.45909 9.75 4.07386 9.59089 3.75341 9.27266C3.43295 8.95443 3.27273 8.57187 3.27273 8.125V1.625C3.27273 1.17812 3.43295 0.795573 3.75341 0.477344C4.07386 0.159115 4.45909 0 4.90909 0H16.3636C16.8136 0 17.1989 0.159115 17.5193 0.477344C17.8398 0.795573 18 1.17812 18 1.625V8.125C18 8.57187 17.8398 8.95443 17.5193 9.27266C17.1989 9.59089 16.8136 9.75 16.3636 9.75H4.90909ZM6.54545 8.125H14.7273C14.7273 7.67812 14.8875 7.29557 15.208 6.97734C15.5284 6.65911 15.9136 6.5 16.3636 6.5V3.25C15.9136 3.25 15.5284 3.09089 15.208 2.77266C14.8875 2.45443 14.7273 2.07187 14.7273 1.625H6.54545C6.54545 2.07187 6.38523 2.45443 6.06477 2.77266C5.74432 3.09089 5.35909 3.25 4.90909 3.25V6.5C5.35909 6.5 5.74432 6.65911 6.06477 6.97734C6.38523 7.29557 6.54545 7.67812 6.54545 8.125ZM15.5455 13H1.63636C1.18636 13 0.801136 12.8409 0.480682 12.5227C0.160227 12.2044 0 11.8219 0 11.375V2.4375H1.63636V11.375H15.5455V13Z" fill="currentColor" />
                                            </svg>
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-[#262D3B] text-sm">Cash Payment</span>
                                            <span className="text-xs font-semibold text-[#787E8C]">
                                                {splitCashStatus === "verified" ? "Physical Cash Received" : "Pending Confirmation"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {splitCashStatus !== "verified" ? (
                                            <>
                                                <div className="relative w-[120px]">
                                                    <FormInputField
                                                        label=""
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={splitCashAmount}
                                                        onChange={(e) => handleAmountChange(e.target.value, setSplitCashAmount)}
                                                        height={38}
                                                        width={120}
                                                        className="font-bold text-xs"
                                                        suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    className="h-[38px]"
                                                    size="medium"
                                                    onClick={() => setSplitCashStatus("verified")}
                                                >
                                                    Confirm
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                                                <span>₹ {Number(splitCashAmount).toLocaleString()}</span>
                                                <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                                                    ✓ Verified
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Razor Pay Split Row */}
                                <div
                                    onClick={() => {
                                        if (splitUpiStatus !== "success" && splitCardStatus !== "success") {
                                            setSelectedOnlineSplitMethod("razorpay");
                                        }
                                    }}
                                    className={`flex items-center justify-between gap-4 p-4 border rounded-[15px] transition-all duration-200 ${selectedOnlineSplitMethod === "razorpay"
                                        ? "border-[#0B8C00] bg-[#F2FAF2]/10"
                                        : "border-[#DFE0E2] bg-white opacity-55 cursor-pointer hover:border-[#CBD5E1]"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Custom Radio Circle */}
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${selectedOnlineSplitMethod === "razorpay" ? "border-[#0B8C00] bg-white" : "border-[#DFE0E2] bg-white"
                                            }`}>
                                            {selectedOnlineSplitMethod === "razorpay" && <div className="w-2.5 h-2.5 rounded-full bg-[#0B8C00]" />}
                                        </div>

                                        <span className="w-10 h-10 rounded-xl bg-[#E3EEE1] text-[#0B8C00] flex items-center justify-center p-1">
                                            <Image src="/icons/razorpay.svg" alt="Razor Pay" width={24} height={24} className="object-contain font-medium" />
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-[#262D3B] text-sm">Razor Pay</span>
                                            <span className="text-xs font-semibold text-[#787E8C]">
                                                {splitUpiStatus === "success" ? "Transaction Successfull" : "Ready to Pay"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3" onClick={(e) => selectedOnlineSplitMethod !== "razorpay" && e.stopPropagation()}>
                                        {splitUpiStatus !== "success" ? (
                                            <>
                                                <div className="relative w-[120px]">
                                                    <FormInputField
                                                        label=""
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={selectedOnlineSplitMethod === "razorpay" ? splitUpiAmount : "0"}
                                                        onChange={(e) => handleAmountChange(e.target.value, setSplitUpiAmount)}
                                                        height={38}
                                                        width={120}
                                                        className="font-bold text-xs"
                                                        suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                                        disabled={selectedOnlineSplitMethod !== "razorpay"}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    className="h-[38px]"
                                                    size="medium"
                                                    onClick={() => setSplitUpiStatus("success")}
                                                    disabled={selectedOnlineSplitMethod !== "razorpay"}
                                                >
                                                    Pay Now
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                                                <span>₹ {Number(splitUpiAmount).toLocaleString()}</span>
                                                <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                                                    ✓ Success
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* PayU Split Row */}
                                <div
                                    onClick={() => {
                                        if (splitUpiStatus !== "success" && splitCardStatus !== "success") {
                                            setSelectedOnlineSplitMethod("payu");
                                        }
                                    }}
                                    className={`flex items-center justify-between gap-4 p-4 border rounded-[15px] transition-all duration-200 ${selectedOnlineSplitMethod === "payu"
                                        ? "border-[#0B8C00] bg-[#F2FAF2]/10"
                                        : "border-[#DFE0E2] bg-white opacity-55 cursor-pointer hover:border-[#CBD5E1]"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Custom Radio Circle */}
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${selectedOnlineSplitMethod === "payu" ? "border-[#0B8C00] bg-white" : "border-[#DFE0E2] bg-white"
                                            }`}>
                                            {selectedOnlineSplitMethod === "payu" && <div className="w-2.5 h-2.5 rounded-full bg-[#0B8C00]" />}
                                        </div>

                                        <span className="w-10 h-10 rounded-xl bg-[#F2F8F2] flex items-center justify-center p-1">
                                            <Image src="/icons/payU.svg" alt="PayU" width={24} height={24} className="object-contain" />
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-[#262D3B] text-sm">PayU</span>
                                            <span className="text-xs font-semibold text-[#787E8C]">
                                                {splitCardStatus === "success" ? "Transaction Successful" : "Ready to Pay"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3" onClick={(e) => selectedOnlineSplitMethod !== "payu" && e.stopPropagation()}>
                                        {splitCardStatus !== "success" ? (
                                            <>
                                                <div className="relative w-[120px]">
                                                    <FormInputField
                                                        label=""
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={selectedOnlineSplitMethod === "payu" ? splitCardAmount : "0"}
                                                        onChange={(e) => handleAmountChange(e.target.value, setSplitCardAmount)}
                                                        height={38}
                                                        width={120}
                                                        className="font-bold text-xs"
                                                        suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                                        disabled={selectedOnlineSplitMethod !== "payu"}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    className="h-[38px]"
                                                    size="medium"
                                                    onClick={() => setSplitCardStatus("success")}
                                                    disabled={selectedOnlineSplitMethod !== "payu"}
                                                >
                                                    Pay Now
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                                                <span>₹ {Number(splitCardAmount).toLocaleString()}</span>
                                                <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                                                    ✓ Success
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right side: Payment Summary Green Card */}
                            <div className="w-full rounded-[24px] bg-[#0B8C00] text-white p-6 flex flex-col justify-between shadow-md self-stretch">
                                <div className="flex flex-col gap-5">
                                    <h4 className="text-xl font-bold border-b border-white/20 pb-3">Payment Summary</h4>

                                    <div className="flex flex-col gap-4 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-white/90">Total Advance</span>
                                            <span className="font-extrabold text-base">₹ {finalAmountPayable.toLocaleString()}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-white/90">Total Received</span>
                                            <span className="font-extrabold text-base">₹ {totalReceivedSplit.toLocaleString()}</span>
                                        </div>

                                        {/* Payment Breakdown Box */}
                                        <div className="border border-white/25 rounded-[12px] p-4 flex flex-col gap-3">
                                            <span className="font-extrabold text-sm">Payment Breakdown</span>
                                            <div className="flex flex-col gap-2 text-xs text-white/90">
                                                <div className="flex justify-between items-center">
                                                    <span>Cash</span>
                                                    <span className="font-bold">₹ {(splitCashStatus === "verified" ? Number(splitCashAmount) : 0).toLocaleString()}</span>
                                                </div>
                                                {selectedOnlineSplitMethod === "razorpay" && (
                                                    <div className="flex justify-between items-center">
                                                        <span>Razor Pay</span>
                                                        <span className="font-bold">₹ {(splitUpiStatus === "success" ? Number(splitUpiAmount) : 0).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {selectedOnlineSplitMethod === "payu" && (
                                                    <div className="flex justify-between items-center">
                                                        <span>PayU</span>
                                                        <span className="font-bold">₹ {(splitCardStatus === "success" ? Number(splitCardAmount) : 0).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-white/90">Allocated Not Paid</span>
                                            <span className="font-extrabold text-base">₹ {balanceOutstandingSplit.toLocaleString()}</span>
                                        </div>

                                        <div className="border-t border-white/20 my-1"></div>

                                        <div className="flex justify-between items-center text-sm font-bold">
                                            <span>Balance Outstanding</span>
                                            <span className="font-extrabold text-base">₹ {balanceOutstandingSplit.toLocaleString()}</span>
                                        </div>

                                        <div className="flex justify-between items-start gap-4 text-xs font-bold mt-1">
                                            <span className="text-white/90 shrink-0">Amount in Words</span>
                                            <span className="text-right text-white select-all">{numberToWords(finalAmountPayable)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSplitCashStatus("verified");
                                            if (selectedOnlineSplitMethod === "razorpay") {
                                                setSplitUpiStatus("success");
                                                setSplitCardStatus("ready");
                                            } else {
                                                setSplitCardStatus("success");
                                                setSplitUpiStatus("ready");
                                            }
                                        }}
                                        className="h-12 bg-white text-[#0B8C00] rounded-full font-bold text-sm hover:bg-opacity-95 hover:scale-[1.01] transition-all flex items-center justify-center shadow-sm"
                                    >
                                        Confirm & Finalize
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSplitCashStatus("pending");
                                            setSplitUpiStatus("ready");
                                            setSplitCardStatus("ready");
                                        }}
                                        className="h-12 border border-white text-white rounded-full font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center"
                                    >
                                        Cancel Session
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Special instructions field */}
                    <div className="mt-6 select-none">
                        <FormTextareaField
                            label="Special Admission Instructions (Internal Only)"
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            placeholder="Any specific requirements or notes for the ward nurses..."
                            height={96}
                            className="font-semibold text-xs"
                        />
                    </div>
                </div>

                {/* Bottom Actions footer */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 select-none">
                    <BackToPreviousPageButton
                        text="Back"
                        onClick={onBack}
                    />

                    <div className="flex items-center gap-4">
                        <Button
                            type="button"
                            variant="primary"
                            rightIcon={<span>➔</span>}
                            onClick={() => setIsInvoiceDialogOpen(true)}
                        >
                            Proceed to Room Allocation
                        </Button>
                    </div>
                </div>
            </div>

            {/* Right Column: Premium Sticky Package Summary Card */}
            <div className="w-full flex flex-col gap-6 sticky top-6">
                <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-6 shadow-sm flex flex-col gap-6 select-none">
                    {/* Header */}
                    <div className="border-b border-[#DFE0E2] pb-4 flex flex-col gap-1">
                        <h3 className="text-xl font-bold text-[#262D3B]">
                            {activePackage.packageName || "Cardiac Premium Care"}
                        </h3>
                        <span className="text-sm font-semibold text-[#787E8C]">
                            {roomRentPerDay > 0 ? `${roomRentPerDay}rs /day` : "N/A"}
                        </span>
                    </div>

                    {/* Details Table */}
                    <div className="flex flex-col border border-[#DFE0E2] rounded-lg overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                            <span className="text-[#787E8C] font-medium">Package Name</span>
                            <span className="text-[#262D3B] font-bold truncate max-w-[60%]">
                                {activePackage.packageName || "N/A"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                            <span className="text-[#787E8C] font-medium">Room Type Selection</span>
                            <span className="text-[#262D3B] font-bold uppercase truncate max-w-[60%]">
                                {activePackage.packageType || "N/A"}
                            </span>
                        </div>
                        {medicinePerDay > 0 && (
                            <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                <span className="text-[#787E8C] font-medium">Medicine</span>
                                <span className="text-[#262D3B] font-bold">₹ {medicinePerDay.toLocaleString()}</span>
                            </div>
                        )}
                        {doctorFee > 0 && (
                            <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                <span className="text-[#787E8C] font-medium">Doctor Fees</span>
                                <span className="text-[#262D3B] font-bold">₹ {doctorFee.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center px-4 py-3 text-sm bg-white">
                            <span className="text-[#787E8C] font-medium">Price</span>
                            <span className="text-[#262D3B] font-bold">₹ {roomRentPerDay.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1 items-start">
                        <span className="text-sm font-bold text-[#262D3B]">Description</span>
                        <p className="text-xs font-semibold text-[#787E8C] leading-relaxed">
                            {activePackage.remark || "No description provided."}
                        </p>
                    </div>

                    {/* Total Price Section */}
                    <div className="h-14 px-4 bg-[#E3EEE1] flex justify-between items-center rounded-lg font-semibold text-sm">
                        <span className="text-[#262D3B] font-bold">Total Price</span>
                        <span className="text-[#262D3B] font-extrabold text-lg">
                            ₹ {finalAmountPayable.toLocaleString()}
                        </span>
                    </div>

                    {/* Selected Button */}
                    <button
                        type="button"
                        className="w-full h-11 bg-[#0B8C00] text-white hover:bg-[#097300] transition-colors rounded-[100px] font-bold text-sm flex items-center justify-center gap-2"
                    >
                        Selected Package
                    </button>
                </div>

                {/* Next Steps Info Alert */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl flex gap-3 text-xs font-semibold text-[#64748B]">
                    <span className="text-lg leading-none select-none">ℹ️</span>
                    <div className="flex flex-col gap-1">
                        <span className="font-bold text-[#334155]">Next Steps</span>
                        <p className="leading-normal">
                            After clicking next, you will be redirected to the room allocation grid to allocate a specific ward and bed number based on this selection.
                        </p>
                    </div>
                </div>
            </div>

            {/* Payment Details Dialog */}
            <PaymentDialogDetails
                open={isInvoiceDialogOpen}
                onClose={() => setIsInvoiceDialogOpen(false)}
                patientName="John Doe"
                address="House No. 123, Sector 62"
                cityName="S.A.S Nagar (Mohali)"
                stateName="Punjab"
                jsHealthCardNo=""
                uhid="JSKL41712025"
                consultationCharges={finalAmountPayable}
                subtotal={finalAmountPayable}
                tax={0}
                totalAmount={finalAmountPayable}
                billDate={new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN")}
                transactionId={paymentMode === "split" ? "Split Payment" : (selectedMethod === "cash" ? "" : "TXN" + Date.now())}
                paymentMode={paymentMode}
                gstBilling={false}
                onPrint={() => window.print()}
                onSaveAndNext={() => {
                    setIsInvoiceDialogOpen(false);
                    onNext();
                }}
                onDownload={() => alert("Downloading invoice...")}
                canDownload={true}
                submitLabel="Save & Next"
                splitCashAmount={splitCashAmount}
                splitCashStatus={splitCashStatus}
                splitUpiAmount={splitUpiAmount}
                splitUpiStatus={splitUpiStatus}
                splitCardAmount={splitCardAmount}
                splitCardStatus={splitCardStatus}
                selectedOnlineSplitMethod={selectedOnlineSplitMethod}
            />
        </div>
    );
}

// Helper to convert number to words
function numberToWords(num: number): string {
    if (num === 0) return "Zero Only";
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const format = (n: number): string => {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit !== 0 ? " " + a[digit] : "");
    };

    let words = "";

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    if (crore > 0) {
        words += format(crore) + " Crore ";
    }

    const lakh = Math.floor(num / 100000);
    num %= 100000;
    if (lakh > 0) {
        words += format(lakh) + " Lakh ";
    }

    const thousand = Math.floor(num / 1000);
    num %= 1000;
    if (thousand > 0) {
        words += format(thousand) + " Thousand ";
    }

    const hundred = Math.floor(num / 100);
    num %= 100;
    if (hundred > 0) {
        words += format(hundred) + " Hundred ";
    }

    if (num > 0) {
        if (words !== "") words += "and ";
        words += format(num) + " ";
    }

    return words.trim() + " Only";
}
