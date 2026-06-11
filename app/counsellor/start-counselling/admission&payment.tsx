"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import PaymentDialogDetails from "@/components/registration/PaymentDialogDetails";
import {
    FormInputField,
    FormSelectField,
    Badge,
    Button,
    BackToPreviousPageButton,
    Slider,
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

const othersPaymentMethodOptions = [
    { value: "cheque", label: "Cheque" },
    { value: "neft_rtgs", label: "NEFT / RTGS" },
    { value: "dd", label: "Demand Draft" },
    { value: "other", label: "Other" },
];

function PaymentGatewayCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-sm flex flex-col gap-4">
            <h4 className="text-base font-bold text-[#262D3B]">{title}</h4>
            <div className="flex flex-col gap-3">{children}</div>
        </div>
    );
}

function PaymentMethodRow({
    icon,
    title,
    paidLabel,
    pendingLabel,
    confirmLabel,
    amount,
    onAmountChange,
    paid,
    onConfirm,
    upiId,
    onUpiIdChange,
}: {
    icon: React.ReactNode;
    title: string;
    paidLabel: string;
    pendingLabel: string;
    confirmLabel: string;
    amount: string;
    onAmountChange: (value: string) => void;
    paid: boolean;
    onConfirm: () => void;
    upiId?: string;
    onUpiIdChange?: (value: string) => void;
}) {
    return (
        <div className="flex flex-col gap-3 p-4 border border-[#DFE0E2] rounded-[14px] bg-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-[#F2F8F2] flex items-center justify-center p-2">
                        {icon}
                    </span>
                    <div className="flex flex-col">
                        <span className="font-extrabold text-[#262D3B] text-sm">{title}</span>
                        <span className="text-xs font-semibold text-[#787E8C]">
                            {paid ? paidLabel : pendingLabel}
                        </span>
                    </div>
                </div>

                {!paid ? (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-[110px]">
                            <FormInputField
                                label=""
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || /^\d{0,15}(\.\d{0,2})?$/.test(value)) {
                                        onAmountChange(value);
                                    }
                                }}
                                height={38}
                                width={110}
                                className="font-bold text-xs"
                                suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="primary"
                            size="medium"
                            className="h-[38px] shrink-0"
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                        <span>₹ {Number(amount || 0).toLocaleString()}</span>
                        <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                            ✓ {paidLabel}
                        </Badge>
                    </div>
                )}
            </div>

            {onUpiIdChange && !paid && (
                <FormInputField
                    label="Patient UPI ID / Number"
                    type="text"
                    value={upiId || ""}
                    onChange={(e) => onUpiIdChange(e.target.value)}
                    placeholder="Enter Patient UPI ID / Number"
                    height={44}
                />
            )}
        </div>
    );
}

export default function AdmissionPayment({
    activePackage,
    finalAmountPayable,
    roomRentPerDay,
    medicinePerDay,
    mealsPerDay,
    doctorFee,
    onNext,
    onBack,
}: AdmissionPaymentProps) {
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const defaultAmount = finalAmountPayable > 0 ? String(finalAmountPayable) : "2500";

    const [razorpayUpiAmount, setRazorpayUpiAmount] = useState(defaultAmount);
    const [razorpayUpiId, setRazorpayUpiId] = useState("");
    const [razorpayUpiPaid, setRazorpayUpiPaid] = useState(false);
    const [razorpayCardAmount, setRazorpayCardAmount] = useState(defaultAmount);
    const [razorpayCardPaid, setRazorpayCardPaid] = useState(false);

    const [payuUpiAmount, setPayuUpiAmount] = useState(defaultAmount);
    const [payuUpiId, setPayuUpiId] = useState("");
    const [payuUpiPaid, setPayuUpiPaid] = useState(false);

    const [cashAmount, setCashAmount] = useState(defaultAmount);
    const [cashPaid, setCashPaid] = useState(false);

    const [othersMethod, setOthersMethod] = useState<string | null>(null);
    const [othersAmount, setOthersAmount] = useState("");
    const [othersReferenceId, setOthersReferenceId] = useState("");
    const [othersPaid, setOthersPaid] = useState(false);

    useEffect(() => {
        const next = finalAmountPayable > 0 ? String(finalAmountPayable) : "2500";
        setRazorpayUpiAmount(next);
        setRazorpayCardAmount(next);
        setPayuUpiAmount(next);
        setCashAmount(next);
    }, [finalAmountPayable]);

    const totalReceived = useMemo(() => {
        return (
            (razorpayUpiPaid ? Number(razorpayUpiAmount) || 0 : 0) +
            (razorpayCardPaid ? Number(razorpayCardAmount) || 0 : 0) +
            (payuUpiPaid ? Number(payuUpiAmount) || 0 : 0) +
            (cashPaid ? Number(cashAmount) || 0 : 0) +
            (othersPaid ? Number(othersAmount) || 0 : 0)
        );
    }, [
        razorpayUpiPaid, razorpayUpiAmount,
        razorpayCardPaid, razorpayCardAmount,
        payuUpiPaid, payuUpiAmount,
        cashPaid, cashAmount,
        othersPaid, othersAmount,
    ]);

    const balanceOutstanding = useMemo(() => {
        return Math.max(0, finalAmountPayable - totalReceived);
    }, [finalAmountPayable, totalReceived]);

    const progressPercent = useMemo(() => {
        if (finalAmountPayable <= 0) return 0;
        return Math.min(100, Math.round((totalReceived / finalAmountPayable) * 100));
    }, [finalAmountPayable, totalReceived]);

    const handleCancelSession = () => {
        setRazorpayUpiPaid(false);
        setRazorpayCardPaid(false);
        setPayuUpiPaid(false);
        setCashPaid(false);
        setOthersPaid(false);
        setOthersMethod(null);
        setOthersAmount("");
        setOthersReferenceId("");
        setRazorpayUpiId("");
        setPayuUpiId("");
    };

    return (
        <div className="w-full flex flex-col gap-6 mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Column 1: Payment Gateways */}
                <div className="flex flex-col gap-4">
                    <PaymentGatewayCard title="Razorpay Gateway">
                        <PaymentMethodRow
                            icon={<Image src="/icons/upi.svg" alt="UPI" width={20} height={20} className="object-contain" />}
                            title="UPI Payment"
                            paidLabel="Verified"
                            pendingLabel="Ready to Pay"
                            confirmLabel="Verify"
                            amount={razorpayUpiAmount}
                            onAmountChange={setRazorpayUpiAmount}
                            paid={razorpayUpiPaid}
                            onConfirm={() => setRazorpayUpiPaid(true)}
                            upiId={razorpayUpiId}
                            onUpiIdChange={setRazorpayUpiId}
                        />
                        <PaymentMethodRow
                            icon={<Image src="/icons/card.svg" alt="Credit Card" width={20} height={20} className="object-contain" />}
                            title="Credit Card"
                            paidLabel="Success"
                            pendingLabel="Ready to Pay"
                            confirmLabel="Pay Now"
                            amount={razorpayCardAmount}
                            onAmountChange={setRazorpayCardAmount}
                            paid={razorpayCardPaid}
                            onConfirm={() => setRazorpayCardPaid(true)}
                        />
                    </PaymentGatewayCard>

                    <PaymentGatewayCard title="PayU Gateway">
                        <PaymentMethodRow
                            icon={<Image src="/icons/upi.svg" alt="UPI" width={20} height={20} className="object-contain" />}
                            title="UPI Payment"
                            paidLabel="Verified"
                            pendingLabel="Ready to Pay"
                            confirmLabel="Verify"
                            amount={payuUpiAmount}
                            onAmountChange={setPayuUpiAmount}
                            paid={payuUpiPaid}
                            onConfirm={() => setPayuUpiPaid(true)}
                            upiId={payuUpiId}
                            onUpiIdChange={setPayuUpiId}
                        />
                    </PaymentGatewayCard>

                    <PaymentGatewayCard title="Cash">
                        <PaymentMethodRow
                            icon={<Image src="/icons/cash.svg" alt="Cash" width={20} height={20} className="object-contain" />}
                            title="Cash Payment"
                            paidLabel="Verified"
                            pendingLabel="Pending Confirmation"
                            confirmLabel="Confirm"
                            amount={cashAmount}
                            onAmountChange={setCashAmount}
                            paid={cashPaid}
                            onConfirm={() => setCashPaid(true)}
                        />
                    </PaymentGatewayCard>

                    <PaymentGatewayCard title="Others">
                        <div className="grid grid-cols-1 gap-4">
                            <FormSelectField
                                label="Payment Method"
                                options={othersPaymentMethodOptions}
                                value={othersMethod}
                                onChange={(value) => setOthersMethod(value as string)}
                                placeholder="Select"
                                height={44}
                                disabled={othersPaid}
                            />
                            <FormInputField
                                label="Amount"
                                type="text"
                                inputMode="decimal"
                                value={othersAmount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || /^\d{0,15}(\.\d{0,2})?$/.test(value)) {
                                        setOthersAmount(value);
                                    }
                                }}
                                height={44}
                                disabled={othersPaid}
                                suffix={<span className="text-sm font-bold text-[#787E8C]">₹</span>}
                            />
                        </div>

                        <FormInputField
                            label="Transaction Reference ID (Required)"
                            type="text"
                            value={othersReferenceId}
                            onChange={(e) => setOthersReferenceId(e.target.value)}
                            placeholder="Enter Reference ID"
                            height={44}
                            disabled={othersPaid}
                        />

                        {!othersPaid ? (
                            <Button
                                type="button"
                                variant="primary"
                                className="w-full h-12 rounded-full font-bold"
                                disabled={!othersMethod || !othersAmount || !othersReferenceId}
                                onClick={() => setOthersPaid(true)}
                            >
                                Confirm & Verify
                            </Button>
                        ) : (
                            <div className="w-full h-12 rounded-full bg-[#E3EEE1] flex items-center justify-center gap-2 text-[#0B8C00] font-extrabold text-sm">
                                <span>₹ {Number(othersAmount || 0).toLocaleString()}</span>
                                <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                                    ✓ Verified
                                </Badge>
                            </div>
                        )}
                    </PaymentGatewayCard>
                </div>

                {/* Column 2: Payment Summary */}
                <div className="w-full xl:sticky xl:top-6">
                    <div className="w-full rounded-[24px] bg-[#0B8C00] text-white p-6 flex flex-col gap-5 shadow-md select-none min-h-[420px]">
                        <h4 className="text-xl font-bold border-b border-white/20 pb-3">Payment Summary</h4>

                        <div className="flex flex-col gap-4 text-sm flex-1">
                            <div className="flex justify-between items-center">
                                <span className="text-white/90">Total Advance</span>
                                <span className="font-extrabold text-base">₹ {finalAmountPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/90">Total Received</span>
                                <span className="font-extrabold text-base">₹ {totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/90">Allocated Not Paid</span>
                                <span className="font-extrabold text-base">₹ {balanceOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>

                            <div className="border-t border-white/20 my-1" />

                            <div className="flex justify-between items-center">
                                <span className="font-bold">Balance Outstanding</span>
                                <span className="font-extrabold text-lg">₹ {balanceOutstanding.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-start gap-4 text-xs font-bold">
                                <span className="text-white/90 shrink-0">Amount in Words</span>
                                <span className="text-right text-white leading-relaxed">{numberToWords(finalAmountPayable)}</span>
                            </div>

                            <div className="[&_input]:accent-white [&_span]:!text-white pt-2">
                                <Slider label="Success Progress" value={progressPercent} onChange={() => { }} disabled />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                            <button
                                type="button"
                                onClick={() => setIsInvoiceDialogOpen(true)}
                                className="h-12 bg-white text-[#0B8C00] rounded-full font-bold text-sm hover:bg-opacity-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                Confirm & Finalize
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelSession}
                                className="h-12 border border-white text-white rounded-full font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center"
                            >
                                Cancel Session
                            </button>
                        </div>
                    </div>
                </div>

                {/* Column 3: Package Details */}
                <div className="w-full flex flex-col gap-6 xl:sticky xl:top-6">
                    <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-6 shadow-sm flex flex-col gap-6 select-none">
                        <div className="border-b border-[#DFE0E2] pb-4 flex flex-col gap-1">
                            <h3 className="text-xl font-bold text-[#262D3B]">
                                {activePackage.packageName || "Cardiac Premium Care"}
                            </h3>
                            <span className="text-sm font-semibold text-[#787E8C]">
                                {roomRentPerDay > 0 ? `${roomRentPerDay.toLocaleString()}rs /day` : "N/A"}
                            </span>
                        </div>

                        <div className="flex flex-col border border-[#DFE0E2] rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                <span className="text-[#787E8C] font-medium">Package Name</span>
                                <span className="text-[#262D3B] font-bold truncate max-w-[55%] text-right">
                                    {activePackage.packageName || "Advanced Recovery Package"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                <span className="text-[#787E8C] font-medium">Room Type Selection</span>
                                <span className="text-[#262D3B] font-bold uppercase truncate max-w-[55%] text-right">
                                    {activePackage.packageType || "Private Suite"}
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
                            {mealsPerDay > 0 && (
                                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[#787E8C] font-medium">Meals</span>
                                    <span className="text-[#262D3B] font-bold">₹ {mealsPerDay.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center px-4 py-3 text-sm bg-white">
                                <span className="text-[#787E8C] font-medium">Price</span>
                                <span className="text-[#262D3B] font-bold">₹ {roomRentPerDay.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 items-start">
                            <span className="text-sm font-bold text-[#262D3B]">Description</span>
                            <p className="text-xs font-semibold text-[#787E8C] leading-relaxed">
                                {activePackage.remark || "Comprehensive care package including room, nursing, meals, and therapy support."}
                            </p>
                        </div>

                        <div className="h-14 px-4 bg-[#E3EEE1] flex justify-between items-center rounded-lg font-semibold text-sm">
                            <span className="text-[#262D3B] font-bold">Total Price</span>
                            <span className="text-[#262D3B] font-extrabold text-lg">
                                ₹ {finalAmountPayable.toLocaleString()}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="w-full h-11 bg-[#0B8C00] text-white hover:bg-[#097300] transition-colors rounded-[100px] font-bold text-sm flex items-center justify-center"
                        >
                            Selected Package
                        </button>
                    </div>

                    <div className="bg-[#F2FAF2] border border-[#E3EEE1] p-4 rounded-xl flex gap-3 text-xs font-semibold text-[#64748B]">
                        <span className="text-base leading-none select-none text-[#0B8C00]">ℹ️</span>
                        <div className="flex flex-col gap-1">
                            <span className="font-bold text-[#334155]">Next Steps</span>
                            <p className="leading-normal text-[#475569]">
                                Complete the payment to finalize the counselling and admission process.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#DFE0E2] select-none">
                <BackToPreviousPageButton text="Back" onClick={onBack} />

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="!border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#F2FAF2] min-w-[180px] h-11 rounded-full font-bold"
                        leftIcon={
                            <Image src="/icons/Printer.svg" alt="" width={18} height={18} className="object-contain" />
                        }
                        onClick={() => setIsInvoiceDialogOpen(true)}
                    >
                        Print Invoice
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        className="min-w-[240px] h-11 rounded-full font-bold"
                        rightIcon={<span>→</span>}
                        onClick={() => setIsInvoiceDialogOpen(true)}
                    >
                        Complete Payment
                    </Button>
                </div>
            </div>

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
                transactionId={"TXN" + Date.now()}
                paymentMode={totalReceived > 0 ? "split" : "complete"}
                gstBilling={false}
                onPrint={() => window.print()}
                onSaveAndNext={() => {
                    setIsInvoiceDialogOpen(false);
                    onNext();
                }}
                onDownload={() => window.print()}
                canDownload={true}
                submitLabel="Save & Next"
                splitCashAmount={cashAmount}
                splitCashStatus={cashPaid ? "verified" : "pending"}
                splitUpiAmount={razorpayUpiAmount}
                splitUpiStatus={razorpayUpiPaid ? "success" : "ready"}
                splitCardAmount={payuUpiAmount}
                splitCardStatus={payuUpiPaid ? "success" : "ready"}
                selectedOnlineSplitMethod={razorpayUpiPaid ? "razorpay" : "payu"}
            />
        </div>
    );
}

function numberToWords(num: number): string {
    if (num === 0) return "Zero Only";
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const format = (n: number): string => {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit !== 0 ? " " + a[digit] : "");
    };

    let words = "";
    let remaining = Math.floor(num);

    const crore = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    if (crore > 0) words += format(crore) + " Crore ";

    const lakh = Math.floor(remaining / 100000);
    remaining %= 100000;
    if (lakh > 0) words += format(lakh) + " Lakh ";

    const thousand = Math.floor(remaining / 1000);
    remaining %= 1000;
    if (thousand > 0) words += format(thousand) + " Thousand ";

    const hundred = Math.floor(remaining / 100);
    remaining %= 100;
    if (hundred > 0) words += format(hundred) + " Hundred ";

    if (remaining > 0) {
        if (words !== "") words += "and ";
        words += format(remaining) + " ";
    }

    return words.trim() + " Only";
}
