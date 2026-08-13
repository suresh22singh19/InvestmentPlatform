"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { formatIndianAmount } from "@/store/utils/formatIndianAmount";
import AdmissionInvoiceDialog from "./AdmissionInvoiceDialog";
import {
    FormInputField,
    FormSelectField,
    FormTextareaField,
    Badge,
    Button,
    BackToPreviousPageButton,
    Slider,
    MessageDialog,
    Checkbox,
    Tooltip,
} from "@/components/ui";
import { useGetPatientWalletBalanceQuery } from "@/store/api/doctorApi";
import {
    useCompletePatientAdmissionMutation,
    usePaymentAndAllocateRoomMutation,
    type CompletePatientAdmissionAttendant,
    type CompletePatientAdmissionRequest,
    type CompletePatientAdmissionRoom,
    type PaymentAndAllocateRoomRequest,
} from "@/store/api/counsellorApi";
import {
    useGetCountriesQuery,
    useGetStatesQuery,
    useGetCitiesQuery,
} from "@/store/api/publicApi";
import type { AttendantDetailsFormData } from "./createPackage";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId } from "@/store/slices/authSlice";
import { useSearchParams, useRouter } from "next/navigation";

interface CompletePatientAdmissionAddress {
    address?: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
}

interface CompletePatientAdmissionPaymentRecord {
    id?: number;
    amount: string | number;
    method: string;
    status: string;
}

interface CompletePatientAdmissionResult {
    discountAmount?: number
    freeDays?:number; 
    patientId?: number;
    patientPackageId?: number;
    invoiceId?: number;
    totalReceived?: number;
    invoiceNumber?: string;
    dueAmount?: number;
    perDayCost?: number;
    paymentId?: number;
    admissionType?: string;
    admissionDate?: string;
    firstDayPaymentStatus?: string;
    paymentRecords?: CompletePatientAdmissionPaymentRecord[];
    patientDetails?: {
        patientName?: string;
        uhid?: string;
        contactNumber?: string;
        address?: CompletePatientAdmissionAddress;
    };
}

interface AdmissionPaymentProps {
    // discountAmount?:number|string;
    activePackage: {
        packageName?: string;
        packageType?: string;
        remark?: string;
    };
    nurseFee?:number,
    attendantFee?:number,
    roomtype?:string,
    therapyFee?:number,
    packagetotalPrice?:number,
    finalAmountPayable: number;
    roomRentPerDay: number;
    medicinePerDay: number;
    mealsPerDay: number;
    doctorFee: number;
    patientName?: string;
    patientUhid?: string;
    branchId: number | string;
    appointmentId: number;
    packageId: number;
    numberOfDays: number;
    offerApplied: boolean;
    offerId?: number;
    admissionType: string;
    patientType: string;
    diseaseType: string;
    originalAmount: number;
    discountAmount: number;
    netPayable: number;
    panelId?: number;
    roomAllocation?: CompletePatientAdmissionRoom | null;
    attendantDetails?: AttendantDetailsFormData[] | null;
    requireRoomAllocation?: boolean;
    initialAdmissionDate?: string;
    initialSpecialInstructions?: string;
    editPaymentAmounts?: {
        advanceAmount?: number;
        receivedAmount?: number;
        remainingAmount?: number;
    } | null;
    isEditMode?: boolean;
    editPatientId?: number | string;
    futureAdmissionPayment?: {
        patientId: number | string;
        id: number | string;
    };
    onAdmissionComplete?: (patientId: number) => void;
    onNext: () => void;
    onBack: () => void;
    onExit?: () => void;
}

function mapAdmissionTypeToPayload(type: string): string {
    if (type === "immediate") return "Immediate";
    if (type === "scheduled") return "Schedule";
    if (type === "tentative") return "Tentative";
    return type;
}

function isDayCarePatientType(patientType: string): boolean {
    const normalized = patientType.trim().toLowerCase().replace(/-/g, "_");
    return normalized === "day_care" || normalized === "daycare";
}

type GeoLookupData = { data?: { id: number | string; name: string }[] };

function resolveGeoName(
    id: string | undefined,
    geoData: GeoLookupData | undefined,
    nameOverride?: string
): string {
    if (nameOverride?.trim()) return nameOverride.trim();
    if (!id?.trim()) return "";
    if (id === "6") return "India";
    const match = geoData?.data?.find((item) => String(item.id) === String(id));
    if (match?.name) return match.name;
    if (!/^\d+$/.test(id)) return id;
    return "";
}

// function mapAttendantToPayload(
//     details: AttendantDetailsFormData,
//     geo: {
//         countries?: GeoLookupData;
//         states?: GeoLookupData;
//         cities?: GeoLookupData;
//     }
// ): CompletePatientAdmissionAttendant {
//     const addr = details.address;
//     return {
//         name: details.attendantName,
//         email: details.emailId,
//         phoneNumber: details.phoneNumber,
//         relation: details.relationWithPatient.toLowerCase(),
//         gender: details.gender.toLowerCase(),
//         address: addr.address.trim(),
//         country: resolveGeoName(addr.country, geo.countries, addr.countryName),
//         state: resolveGeoName(addr.state, geo.states, addr.stateName),
//         city: resolveGeoName(addr.city, geo.cities, addr.cityName),
//         pincode: addr.pinCode.trim(),
//     };
// }

function mapAttendantToPayload(
    details: AttendantDetailsFormData,
    geo: {
        countries?: GeoLookupData;
        states?: GeoLookupData;
        cities?: GeoLookupData;
    }
): CompletePatientAdmissionAttendant {
    const addr = details.address;
    const attendant: CompletePatientAdmissionAttendant = {
        name: details.attendantName,
        phoneNumber: details.phoneNumber,
        gender: details.gender.toLowerCase(),
        address: addr.address.trim(),
        country: resolveGeoName(addr.country, geo.countries, addr.countryName),
        state: resolveGeoName(addr.state, geo.states, addr.stateName),
        city: resolveGeoName(addr.city, geo.cities, addr.cityName),
        pincode: addr.pinCode.trim(),
    };

    const email = details.emailId?.trim();
    if (email) {
        attendant.email = email;
    }

    const relation = details.relationWithPatient?.trim();
    if (relation) {
        attendant.relation = relation.toLowerCase();
    }

    return attendant;
}

function getTodayDateInputValue(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatAdmissionStreetAddress(address?: CompletePatientAdmissionAddress): string {
    if (!address) return "";
    return [address.address, address.area].filter(Boolean).join(", ");
}

function formatAdmissionBillDate(date?: string): string {
    if (!date) {
        return new Date().toLocaleString("en-IN");
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }
    return parsed.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatAdmissionDisplayDate(date?: string): string {
    if (!date) return "N/A";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }
    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

const othersPaymentMethodOptions = [
    { value: "cheque", label: "Cheque" },
    { value: "net_banking", label: "Net Banking" },
    { value: "wallet", label: "Wallet" },
];

function formatPaymentMethodForApi(method: string): string {
    switch (method.trim().toLowerCase()) {
        case "upi":
            return "UPI";
        case "card":
            return "card";
        case "cash":
            return "Cash";
        case "cheque":
            return "cheque";
        case "net_banking":
        case "neft_rtgs":
            return "net_banking";
        case "wallet":
            return "wallet";
        default:
            return method;
    }
}

function formatPaymentMethodForAllocateRoomApi(method: string, singlePayment: boolean): string {
    const normalized = method.trim().toLowerCase();
    if (singlePayment) {
        switch (normalized) {
            case "upi":
                return "UPI";
            case "card":
                return "Credit Card";
            case "cash":
                return "Cash";
            case "cheque":
                return "Cheque";
            case "net_banking":
            case "neft_rtgs":
                return "Net Banking";
            case "wallet":
                return "Wallet";
            default:
                return method;
        }
    }

    switch (normalized) {
        case "upi":
            return "upi";
        case "card":
            return "credit_card";
        case "cash":
            return "cash";
        case "cheque":
            return "cheque";
        case "net_banking":
        case "neft_rtgs":
            return "net_banking";
        case "wallet":
            return "wallet";
        default:
            return normalized;
    }
}

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
    amountError,
    disabled = false,
    showAddMore = false,
    onAddMore,
    showRemove = false,
    onRemove,
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
    amountError?: string;
    disabled?: boolean;
    showAddMore?: boolean;
    onAddMore?: () => void;
    showRemove?: boolean;
    onRemove?: () => void;
}) {
    const isInteractionDisabled = disabled && !paid;

    return (
        <div
            className={`flex flex-col gap-3 p-2 border border-[#DFE0E2] rounded-[14px] bg-white ${
                isInteractionDisabled ? "opacity-50" : ""
            }`}
        >
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
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-[110px]">
                                <FormInputField
                                    label=""
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => {
                                        if (isInteractionDisabled) return;
                                        const value = e.target.value;
                                        if (value === "" || /^\d{0,15}(\.\d{0,2})?$/.test(value)) {
                                            onAmountChange(value);
                                        }
                                    }}
                                    placeholder="Amount"
                                    height={38}
                                    width={110}
                                    className="font-bold text-xs"
                                    suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                    disabled={isInteractionDisabled}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="primary"
                                size="medium"
                                className="h-[38px] shrink-0"
                                onClick={onConfirm}
                                disabled={isInteractionDisabled}
                            >
                                {confirmLabel}
                            </Button>
                            {showRemove && onRemove ? (
                                <button
                                    type="button"
                                    onClick={onRemove}
                                    disabled={isInteractionDisabled}
                                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-[#EF4444]/30 bg-white text-[#EF4444] shadow-sm transition-colors hover:bg-[#FEF2F2] disabled:opacity-50"
                                    aria-label="Remove"
                                    title="Remove"
                                >
                                    <Image src="/icons/TrashRedIcon.svg" alt="Remove" width={16} height={16} />
                                </button>
                            ) : null}
                        </div>
                        {amountError ? (
                            <p className="text-xs text-[#F6776E]">{amountError}</p>
                        ) : null}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                        <span>₹ {Number(amount || 0).toLocaleString()}</span>
                        <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                            ✓ {paidLabel}
                        </Badge>
                        {showRemove && onRemove ? (
                            <button
                                type="button"
                                onClick={onRemove}
                                className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#EF4444]/30 bg-white text-[#EF4444] shadow-sm transition-colors hover:bg-[#FEF2F2]"
                                aria-label="Remove"
                                title="Remove"
                            >
                                <Image src="/icons/TrashRedIcon.svg" alt="Remove" width={16} height={16} />
                            </button>
                        ) : null}
                        {showAddMore && onAddMore ? (
                            <button
                                type="button"
                                onClick={onAddMore}
                                className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#0B8C00]/30 bg-white text-[#0B8C00] shadow-sm transition-colors hover:bg-[#F2FAF2]"
                                aria-label="Add more"
                                title="Add more"
                            >
                                <Image src="/icons/AddIcon.svg" alt="Add more" width={16} height={16} />
                            </button>
                        ) : null}
                    </div>
                )}
            </div>

            {onUpiIdChange && !paid && (
                <FormInputField
                    label="Patient UPI ID / Number"
                    type="text"
                    value={upiId || ""}
                    onChange={(e) => {
                        if (!isInteractionDisabled) onUpiIdChange(e.target.value);
                    }}
                    placeholder="Enter Patient UPI ID / Number"
                    height={44}
                    disabled={isInteractionDisabled}
                />
            )}
        </div>
    );
}

function validatePaymentAmount(amount: string): string {
    if (!amount.trim()) return "Please enter payment amount.";
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return "Please enter a valid payment amount.";
    return "";
}

interface CashPaymentEntry {
    id: string;
    amount: string;
    paid: boolean;
    amountError: string;
}

function createCashPaymentEntry(): CashPaymentEntry {
    return {
        id: `cash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount: "",
        paid: false,
        amountError: "",
    };
}

export default function AdmissionPayment({
    activePackage,
    finalAmountPayable,
    roomRentPerDay,
    medicinePerDay,
    mealsPerDay,
    doctorFee,
    nurseFee,
    attendantFee,
    roomtype,
    therapyFee,
    packagetotalPrice,
    patientName = "Patient",
    patientUhid = "",
    appointmentId,
    packageId,
    numberOfDays,
    offerApplied,
    offerId,
    admissionType,
    patientType,
    diseaseType,
    originalAmount,
    discountAmount,
    netPayable,
    panelId,
    roomAllocation,
    attendantDetails,
    requireRoomAllocation = true,
    initialAdmissionDate,
    initialSpecialInstructions,
    editPaymentAmounts = null,
    isEditMode = false,
    editPatientId,
    futureAdmissionPayment,
    onAdmissionComplete,
    onNext,
    onBack,
    onExit,
}: AdmissionPaymentProps) {
    const router = useRouter();
    const [completePatientAdmission, { isLoading: isCompletingAdmission }] = useCompletePatientAdmissionMutation();
    const [paymentAndAllocateRoom, { isLoading: isPaymentAllocating }] = usePaymentAndAllocateRoomMutation();
    const isSubmitting = isCompletingAdmission || isPaymentAllocating;
    // const authUserBranchId = useAppSelector(selectUserBranchId);
    const searchParams = useSearchParams();
    const branchhid = Number(searchParams?.get("branchId")) || null;
    const authUserBranchId = branchhid;

    console.log("editPaymentAmounts",editPaymentAmounts)

    const apiBranchId = useMemo(() => {
        const n = Number(authUserBranchId);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }, [authUserBranchId]);
    const attendantCountryId = attendantDetails?.[0]?.address.country;
    const attendantStateId = attendantDetails?.[0]?.address.state;
    const { data: countriesData } = useGetCountriesQuery();
    const { data: statesData } = useGetStatesQuery(
        attendantCountryId ? { countryId: attendantCountryId } : undefined,
        { skip: !attendantCountryId }
    );
    const { data: citiesData } = useGetCitiesQuery(
        attendantStateId ? { stateId: attendantStateId } : undefined,
        { skip: !attendantStateId }
    );
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [admissionResult, setAdmissionResult] = useState<CompletePatientAdmissionResult | null>(null);
    const [isAdmissionCompleted, setIsAdmissionCompleted] = useState(false);
    const [admissionDate, setAdmissionDate] = useState(
        () => initialAdmissionDate || getTodayDateInputValue()
    );
    const [specialInstructions, setSpecialInstructions] = useState(initialSpecialInstructions || "");
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [paymentFinalizeError, setPaymentFinalizeError] = useState("");
    const paymentFinalizeErrorRef = useRef<HTMLDivElement>(null);

    const [razorpayUpiAmount, setRazorpayUpiAmount] = useState("");
    const [razorpayUpiId, setRazorpayUpiId] = useState("");
    const [razorpayUpiPaid, setRazorpayUpiPaid] = useState(false);
    const [razorpayUpiAmountError, setRazorpayUpiAmountError] = useState("");
    const [razorpayCardAmount, setRazorpayCardAmount] = useState("");
    const [razorpayCardPaid, setRazorpayCardPaid] = useState(false);
    const [razorpayCardAmountError, setRazorpayCardAmountError] = useState("");

    const [payuUpiAmount, setPayuUpiAmount] = useState("");
    const [payuUpiId, setPayuUpiId] = useState("");
    const [payuUpiPaid, setPayuUpiPaid] = useState(false);
    const [payuUpiAmountError, setPayuUpiAmountError] = useState("");

    const [cashEntries, setCashEntries] = useState<CashPaymentEntry[]>([createCashPaymentEntry()]);

    const [othersMethod, setOthersMethod] = useState<string | null>(null);
    const [othersAmount, setOthersAmount] = useState("");
    const [othersReferenceId, setOthersReferenceId] = useState("");
    const [othersPaid, setOthersPaid] = useState(false);

    const [useWalletBalance, setUseWalletBalance] = useState(false);
    const [walletAmount, setWalletAmount] = useState("");
    const [walletOtp, setWalletOtp] = useState("");
    const [walletOtpPending, setWalletOtpPending] = useState(false);
    const [walletPaid, setWalletPaid] = useState(false);
    const [walletAmountError, setWalletAmountError] = useState("");
    const [walletOtpError, setWalletOtpError] = useState("");

    // const { data: walletResponse } = useGetPatientWalletBalanceQuery(patientUhid || "", {
    //     skip: !patientUhid?.trim(),
    // });
    // const walletInfo = walletResponse?.data;
    // const walletAvailableBalance = useMemo(() => {
    //     if (!walletInfo?.walletExists) return 0;
    //     const balance = Number(walletInfo.availableBalance ?? walletInfo.currentBalance ?? 0);
    //     return Number.isFinite(balance) && balance > 0 ? balance : 0;
    // }, [walletInfo]);
    // const formattedWalletBalance = walletAvailableBalance.toLocaleString("en-IN", {
    //     minimumFractionDigits: 2,
    //     maximumFractionDigits: 2,
    // });

    const resetWalletPaymentState = useCallback(() => {
        setUseWalletBalance(false);
        setWalletAmount("");
        setWalletOtp("");
        setWalletOtpPending(false);
        setWalletPaid(false);
        setWalletAmountError("");
        setWalletOtpError("");
    }, []);

    // const handleWalletUse = () => {
    //     const amount = Number(walletAmount);
    //     if (!walletAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
    //         setWalletAmountError("Please enter a valid amount.");
    //         return;
    //     }
    //     if (amount > walletAvailableBalance) {
    //         setWalletAmountError(`Amount cannot exceed available balance (₹ ${formattedWalletBalance}).`);
    //         return;
    //     }
    //     setWalletAmountError("");
    //     setWalletOtpError("");
    //     setWalletOtp("");
    //     setWalletOtpPending(true);
    //     setWalletPaid(false);
    // };

    // const handleWalletVerifyOtp = () => {
    //     if (!walletOtp.trim()) {
    //         setWalletOtpError("Please enter OTP.");
    //         return;
    //     }
    //     setWalletOtpError("");
    //     setWalletPaid(true);
    //     setWalletOtpPending(false);
    // };

    // const handleWalletResendOtp = () => {
    //     setWalletOtp("");
    //     setWalletOtpError("");
    //     setWalletPaid(false);
    //     setWalletOtpPending(true);
    // };

    useEffect(() => {
        if (!isEditMode) return;
        if (initialAdmissionDate) {
            setAdmissionDate(initialAdmissionDate);
        }
        if (initialSpecialInstructions) {
            setSpecialInstructions(initialSpecialInstructions);
        }
    }, [isEditMode, initialAdmissionDate, initialSpecialInstructions]);

    const totalReceived = useMemo(() => {
        const cashTotal = cashEntries.reduce(
            (sum, entry) => sum + (entry.paid ? Number(entry.amount) || 0 : 0),
            0
        );

        return (
            (walletPaid ? Number(walletAmount) || 0 : 0) +
            (razorpayUpiPaid ? Number(razorpayUpiAmount) || 0 : 0) +
            (razorpayCardPaid ? Number(razorpayCardAmount) || 0 : 0) +
            (payuUpiPaid ? Number(payuUpiAmount) || 0 : 0) +
            cashTotal +
            (othersPaid ? Number(othersAmount) || 0 : 0)
        );
    }, [
        walletPaid, walletAmount,
        razorpayUpiPaid, razorpayUpiAmount,
        razorpayCardPaid, razorpayCardAmount,
        payuUpiPaid, payuUpiAmount,
        cashEntries,
        othersPaid, othersAmount,
    ]);

    const balanceOutstanding = useMemo(() => {
        return Math.max(0, finalAmountPayable - totalReceived);
    }, [finalAmountPayable, totalReceived]);

    const hasPendingCashEntries = useMemo(
        () => cashEntries.some((entry) => !entry.paid),
        [cashEntries]
    );

    useEffect(() => {
        if (totalReceived > 0 && !hasPendingCashEntries && paymentFinalizeError) {
            setPaymentFinalizeError("");
        }
    }, [totalReceived, hasPendingCashEntries, paymentFinalizeError]);

    useEffect(() => {
        if (!paymentFinalizeError) return;

        const timer = window.setTimeout(() => {
            paymentFinalizeErrorRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 100);

        return () => window.clearTimeout(timer);
    }, [paymentFinalizeError]);

    const paymentSources = useMemo(() => {
        const sources: Array<{ label: string; amount: number }> = [];

        if (walletPaid) {
            sources.push({ label: "Wallet", amount: Number(walletAmount) || 0 });
        }
        if (razorpayUpiPaid) {
            sources.push({ label: "UPI (Razorpay)", amount: Number(razorpayUpiAmount) || 0 });
        }
        if (razorpayCardPaid) {
            sources.push({ label: "Credit Card", amount: Number(razorpayCardAmount) || 0 });
        }
        if (payuUpiPaid) {
            sources.push({ label: "UPI (PayU)", amount: Number(payuUpiAmount) || 0 });
        }
        cashEntries.forEach((entry, index) => {
            if (!entry.paid) return;
            sources.push({
                label: cashEntries.length > 1 ? `Cash ${index + 1}` : "Cash",
                amount: Number(entry.amount) || 0,
            });
        });
        if (othersPaid && othersMethod) {
            sources.push({
                label: othersPaymentMethodOptions.find((option) => option.value === othersMethod)?.label || "Others",
                amount: Number(othersAmount) || 0,
            });
        }

        return sources;
    }, [
        walletPaid,
        walletAmount,
        razorpayUpiPaid,
        razorpayUpiAmount,
        razorpayCardPaid,
        razorpayCardAmount,
        payuUpiPaid,
        payuUpiAmount,
        cashEntries,
        othersPaid,
        othersMethod,
        othersAmount,
    ]);

    const progressPercent = useMemo(() => {
        if (finalAmountPayable <= 0) return 0;
        return Math.min(100, Math.round((totalReceived / finalAmountPayable) * 100));
    }, [finalAmountPayable, totalReceived]);

    console.log("editPatientId",editPatientId)

    const handleExit = useCallback(() => {
        if (onExit) {
            onExit();
            return;
        }

        if(editPatientId != null && editPatientId != undefined ){
          router.push("/counsellor/future-admissions");
        }
        router.push("/counsellor/dashboard");
    }, [onExit, router]);

    const handleCancelSession = () => {
        setRazorpayUpiPaid(false);
        setRazorpayCardPaid(false);
        setPayuUpiPaid(false);
        setOthersPaid(false);
        setOthersMethod(null);
        setOthersAmount("");
        setOthersReferenceId("");
        setRazorpayUpiId("");
        setPayuUpiId("");
        setRazorpayUpiAmountError("");
        setRazorpayCardAmountError("");
        setPayuUpiAmountError("");
        setRazorpayUpiAmount("");
        setRazorpayCardAmount("");
        setPayuUpiAmount("");
        setCashEntries([createCashPaymentEntry()]);
        resetWalletPaymentState();
        setPaymentFinalizeError("");
    };

    const collectPaidEntries = useCallback(() => {
        const paidEntries: Array<{
            method: string;
            amount: number;
            transactionId: string;
            remarks?: string;
        }> = [];

        if (walletPaid) {
            paidEntries.push({
                method: "wallet",
                amount: Number(walletAmount) || 0,
                transactionId: walletOtp || `WALLET${Date.now()}`,
                remarks: "Wallet payment",
            });
        }
        if (razorpayUpiPaid) {
            paidEntries.push({
                method: "upi",
                amount: Number(razorpayUpiAmount) || 0,
                transactionId: razorpayUpiId || `TXN${Date.now()}`,
                remarks: "Razorpay UPI payment",
            });
        }
        if (razorpayCardPaid) {
            paidEntries.push({
                method: "card",
                amount: Number(razorpayCardAmount) || 0,
                transactionId: `TXN${Date.now()}`,
                remarks: "Razorpay card payment",
            });
        }
        if (payuUpiPaid) {
            paidEntries.push({
                method: "upi",
                amount: Number(payuUpiAmount) || 0,
                transactionId: payuUpiId || `TXN${Date.now()}`,
                remarks: "PayU UPI payment",
            });
        }
        cashEntries.forEach((entry) => {
            if (!entry.paid) return;
            paidEntries.push({
                method: "cash",
                amount: Number(entry.amount) || 0,
                transactionId: "",
                remarks: "Cash payment received",
            });
        });
        if (othersPaid && othersMethod) {
            paidEntries.push({
                method: othersMethod,
                amount: Number(othersAmount) || 0,
                transactionId: othersReferenceId,
                remarks: "Other payment method",
            });
        }

        return paidEntries;
    }, [
        walletPaid, walletAmount, walletOtp,
        razorpayUpiPaid, razorpayUpiAmount, razorpayUpiId,
        razorpayCardPaid, razorpayCardAmount,
        payuUpiPaid, payuUpiAmount, payuUpiId,
        cashEntries,
        othersPaid, othersMethod, othersAmount, othersReferenceId,
    ]);

    const buildPaymentPayload = useCallback((): Pick<
        CompletePatientAdmissionRequest,
        "paymentMode" | "paymentMethod" | "transactionId" | "paymentStatus" | "receivedAmount" | "splits"
    > => {
        const paidEntries = collectPaidEntries();

        if (paidEntries.length === 0) {
            return {
                paymentMode: "completed",
                paymentMethod: formatPaymentMethodForApi("cash"),
                transactionId: "",
                paymentStatus: "Pending",
                receivedAmount: 0,
            };
        }

        if (paidEntries.length === 1) {
            const entry = paidEntries[0];
            return {
                paymentMode: "completed",
                paymentMethod: formatPaymentMethodForApi(entry.method),
                transactionId: entry.transactionId,
                paymentStatus: "Success",
                receivedAmount: entry.amount,
            };
        }

        return {
            paymentMode: "split",
            receivedAmount: totalReceived,
            splits: paidEntries.map((entry) => ({
                method: formatPaymentMethodForApi(entry.method),
                amount: entry.amount,
                transactionId: entry.transactionId,
                status: "Success",
                remarks: entry.remarks,
            })),
        };
    }, [collectPaidEntries, totalReceived]);

    const buildPaymentAndAllocateRoomPayload = useCallback((
        patientId: number | string,
        id: number | string,
        room: CompletePatientAdmissionRoom
    ): PaymentAndAllocateRoomRequest => {
        const paidEntries = collectPaidEntries();

        if (paidEntries.length === 1) {
            const entry = paidEntries[0];
            return {
                patientId,
                id,
                paymentMode: "completed",
                paymentMethod: formatPaymentMethodForAllocateRoomApi(entry.method, true),
                amount: entry.amount,
                transactionId: entry.transactionId || undefined,
                paymentStatus: "Success",
                room,
            };
        }

        return {
            patientId,
            id,
            paymentMode: "split",
            splits: paidEntries.map((entry) => ({
                method: formatPaymentMethodForAllocateRoomApi(entry.method, false),
                amount: entry.amount,
                transactionId: entry.transactionId || null,
                status: "Success",
                remarks: entry.remarks,
            })),
            room,
        };
    }, [collectPaidEntries]);

    const handleRazorpayUpiVerify = () => {
        const amountError = validatePaymentAmount(razorpayUpiAmount);
        setRazorpayUpiAmountError(amountError);
        if (amountError) return;
        setRazorpayUpiPaid(true);
    };

    const handleRazorpayCardPay = () => {
        const amountError = validatePaymentAmount(razorpayCardAmount);
        setRazorpayCardAmountError(amountError);
        if (amountError) return;
        setRazorpayCardPaid(true);
    };

    const handlePayuUpiVerify = () => {
        const amountError = validatePaymentAmount(payuUpiAmount);
        setPayuUpiAmountError(amountError);
        if (amountError) return;
        setPayuUpiPaid(true);
    };

    const handleCashConfirm = (entryId: string) => {
        const entry = cashEntries.find((item) => item.id === entryId);
        if (!entry) return;

        const amountError = validatePaymentAmount(entry.amount);
        if (amountError) {
            setCashEntries((prev) =>
                prev.map((item) =>
                    item.id === entryId ? { ...item, amountError } : item
                )
            );
            return;
        }

        setCashEntries((prev) =>
            prev.map((item) =>
                item.id === entryId ? { ...item, paid: true, amountError: "" } : item
            )
        );
    };

    const handleAddCashEntry = () => {
        const hasUnpaidEntry = cashEntries.some((entry) => !entry.paid);
        if (hasUnpaidEntry) return;
        setCashEntries((prev) => [...prev, createCashPaymentEntry()]);
    };

    const handleCancelCashEntry = (entryId: string) => {
        const entry = cashEntries.find((item) => item.id === entryId);
        if (!entry) return;

        if (entry.paid && cashEntries.some((item) => !item.paid)) {
            setCashEntries((prev) => prev.filter((item) => item.paid));
            return;
        }

        if (!entry.paid) {
            setCashEntries((prev) => {
                if (prev.length === 1) {
                    return [createCashPaymentEntry()];
                }
                return prev.filter((item) => item.id !== entryId);
            });
            return;
        }

        setCashEntries((prev) => {
            if (prev.length === 1) {
                return prev.map((item) =>
                    item.id === entryId
                        ? { ...item, paid: false, amountError: "" }
                        : item
                );
            }
            return prev.filter((item) => item.id !== entryId);
        });
    };

    const handleCashAmountChange = (entryId: string, value: string) => {
        setCashEntries((prev) =>
            prev.map((item) =>
                item.id === entryId
                    ? { ...item, amount: value, amountError: "" }
                    : item
            )
        );
    };

    const notifyAdmissionPatientId = useCallback(
        (id?: number | string | null) => {
            const numericId = Number(id);
            if (Number.isFinite(numericId) && numericId > 0) {
                onAdmissionComplete?.(numericId);
            }
        },
        [onAdmissionComplete]
    );

    const handleCompleteAdmission = useCallback(async () => {
        if (isAdmissionCompleted) return;

        const isDayCare = isDayCarePatientType(patientType);

        if (requireRoomAllocation && !isDayCare && !roomAllocation) {
            setErrorMessage("Please allocate a room and bed before completing payment.");
            setShowErrorDialog(true);
            return;
        }
        if (totalReceived <= 0 || hasPendingCashEntries) {
            setPaymentFinalizeError("Please confirm payment before finalizing.");
            return;
        }

        if (futureAdmissionPayment) {
            try {
                const payload = buildPaymentAndAllocateRoomPayload(
                    futureAdmissionPayment.patientId,
                    futureAdmissionPayment.id,
                    roomAllocation!
                );
                const res = await paymentAndAllocateRoom(payload).unwrap();
                if (res.success) {
                    setIsAdmissionCompleted(true);
                    notifyAdmissionPatientId(futureAdmissionPayment.patientId);
                    setShowSuccessDialog(true);
                } else {
                    setErrorMessage(res.message || "Failed to complete payment and room allocation.");
                    setShowErrorDialog(true);
                }
            } catch (err: unknown) {
                const apiErr = err as { data?: { message?: string }; message?: string };
                setErrorMessage(
                    apiErr?.data?.message ||
                        apiErr?.message ||
                        "An error occurred while completing payment and room allocation."
                );
                setShowErrorDialog(true);
            }
            return;
        }

        if (editPatientId == null && !appointmentId) {
            setErrorMessage("Appointment ID is missing. Please return to the dashboard and select a patient.");
            setShowErrorDialog(true);
            return;
        }
        if (!packageId) {
            setErrorMessage("Please select a package before completing admission.");
            setShowErrorDialog(true);
            return;
        }
        if (!admissionType) {
            setErrorMessage("Please select an admission type in the Details step.");
            setShowErrorDialog(true);
            return;
        }
        if (admissionType === "scheduled" && !admissionDate) {
            setErrorMessage("Please select a proposed admission date.");
            setShowErrorDialog(true);
            return;
        }

        console.log("apiBranchIdhfywyegyeg",admissionType)

        const paymentPayload = buildPaymentPayload();
        const includeOffer = Boolean(offerApplied && offerId);
        const isEditAdmission = editPatientId != null;
        const payload: CompletePatientAdmissionRequest = {
            branchId: apiBranchId,
            ...(!isEditAdmission && appointmentId ? { appointmentId } : {}),
            ...(isEditAdmission ? { finalizeAdmission: admissionType !== "scheduled" ? true : false } : {}),
            patientType,
            diseaseType,
            packageId,
            numberOfDays,
            offerApplied: includeOffer,
            ...(includeOffer ? { offerId } : {}),
            ...(panelId != null && Number.isFinite(panelId) ? { panelId } : {}),
            admissionType: mapAdmissionTypeToPayload(admissionType),
            admissionDate: admissionType === "scheduled" ? admissionDate : getTodayDateInputValue(),
            ...(admissionType === "scheduled" && specialInstructions.trim()
                ? { specialInstructions: specialInstructions.trim() }
                : {}),
            originalAmount,
            discountAmount,
            netPayable,
            ...paymentPayload,
            ...(roomAllocation && !isDayCare ? { room: roomAllocation } : {}),
            ...(attendantDetails && attendantDetails.length > 0
                ? {
                    attendant: attendantDetails.map((details) =>
                        mapAttendantToPayload(details, {
                            countries: countriesData,
                            states: statesData,
                            cities: citiesData,
                        })
                    ),
                }
                : {}),
        };

        try {
            const res = await completePatientAdmission(
                editPatientId != null ? { body: payload, editPatientId } : payload
            ).unwrap();
            if (res.success) {
                setIsAdmissionCompleted(true);
                if (res.data) {
                    setAdmissionResult(res.data as CompletePatientAdmissionResult);
                    notifyAdmissionPatientId(
                        res.data.patientId ?? (editPatientId != null ? editPatientId : undefined)
                    );
                }
                setShowSuccessDialog(true);
            } else {
                setErrorMessage(res.message || "Failed to complete patient admission.");
                setShowErrorDialog(true);
            }
        } catch (err: unknown) {
            const apiErr = err as { data?: { message?: string }; message?: string };
            setErrorMessage(
                apiErr?.data?.message || apiErr?.message || "An error occurred while completing admission."
            );
            setShowErrorDialog(true);
        }
    }, [
        futureAdmissionPayment,
        appointmentId,
        packageId,
        admissionType,
        admissionDate,
        requireRoomAllocation,
        roomAllocation,
        totalReceived,
        hasPendingCashEntries,
        buildPaymentPayload,
        buildPaymentAndAllocateRoomPayload,
        apiBranchId,
        notifyAdmissionPatientId,
        patientType,
        diseaseType,
        numberOfDays,
        offerApplied,
        offerId,
        panelId,
        specialInstructions,
        originalAmount,
        discountAmount,
        netPayable,
        attendantDetails,
        countriesData,
        statesData,
        citiesData,
        completePatientAdmission,
        paymentAndAllocateRoom,
        editPatientId,
        notifyAdmissionPatientId,
        isAdmissionCompleted,
    ]);

    const isScheduledAdmission = admissionType === "scheduled";

    const handleSuccessDialogDismiss = () => {
        setShowSuccessDialog(false);
        if (futureAdmissionPayment) {
            onNext();
            return;
        }
        setIsInvoiceDialogOpen(true);
    };

    const invoicePatientAddress = admissionResult?.patientDetails?.address;
    const perDayCost = Number(admissionResult?.perDayCost ?? 0);
    const checkfreedays =  admissionResult?.freeDays || 0;
    const discountAmountt = Number(checkfreedays <= 0) ? admissionResult?.discountAmount : 0;
    const freeDays = admissionResult?.freeDays || 0

    // console.log("admissionResult",discountAmount, freeDays)
    const invoiceProps = useMemo(() => {
        const patient = admissionResult?.patientDetails;
        const packageInvoiceTotal =
            originalAmount > 0
                ? originalAmount
                : perDayCost > 0 && numberOfDays > 0
                  ? perDayCost * numberOfDays
                  : netPayable > 0
                    ? netPayable
                    : perDayCost;
        const lineItemLabel =
            numberOfDays > 0
                ? perDayCost > 0
                    ? `Package Cost (${numberOfDays} Days @ ₹${perDayCost.toLocaleString("en-IN")}/day)`
                    : `Package Cost (${numberOfDays} Days)`
                : "Package Cost";

                // console.log("patient",patient)
        return {
            patientName: patient?.patientName || patientName,
            address: formatAdmissionStreetAddress(invoicePatientAddress),
            countryName: invoicePatientAddress?.country || "India",
            pinCode: invoicePatientAddress?.pinCode || "",
            cityName: invoicePatientAddress?.city || "N/A",
            stateName: invoicePatientAddress?.state || "N/A",
            uhid: patient?.uhid || patientUhid,
            invoiceNumber: admissionResult?.invoiceNumber,
            invoiceId: admissionResult?.invoiceId,
            contactNumber: patient?.contactNumber,
            admissionType: admissionResult?.admissionType,
            admissionDate: formatAdmissionDisplayDate(admissionResult?.admissionDate),
            consultationCharges: packageInvoiceTotal,
            subtotal: packageInvoiceTotal,
            tax: 0,
            totalAmount: packageInvoiceTotal,
            billDate: formatAdmissionBillDate(admissionResult?.admissionDate),
            transactionId: admissionResult?.paymentId ? String(admissionResult.paymentId) : undefined,
            paymentMode: "completed",
            amountReceived: admissionResult?.totalReceived,
            dueAmount: admissionResult?.dueAmount,
            paymentStatus: admissionResult?.firstDayPaymentStatus,
            paymentRecords: admissionResult?.paymentRecords,
            lineItemLabel,
        };
    }, [
        admissionResult,
        invoicePatientAddress,
        patientName,
        patientUhid,
        perDayCost,
        numberOfDays,
        originalAmount,
        netPayable,
    ]);

    const handlePrintInvoiceClick = () => {
        if (!admissionResult) {
            setErrorMessage("Please complete payment before printing the invoice.");
            setShowErrorDialog(true);
            return;
        }
        setIsInvoiceDialogOpen(true);
    };

    console.log("admissionType",admissionType)

    // console.log("activePackagefhsjfhsh",activePackage)
    // const roomRent = item.branchRoomType?.roomRentPrice ? Number(item.branchRoomType.roomRentPrice) : 0;
    // const medicine = item.medicineEnabled ? Number(item.medicinePrice) : 0;
    // const meals = item.mealsEnabled ? Number(item.mealsPrice) : 0;
    // const doctor = item.doctorFeeEnabled ? Number(item.doctorFeePrice) : 0;
    // const nurse = item.nurseFeeEnabled ? Number(item.nurseFeePrice) : 0;
    // const attendant = item.attendantFeeEnabled ? Number(item.attendantFeePrice) : 0;
    // const therapy = item.therapyEnabled ? Number(item.therapyPrice) : 0;
    // const totalPrice = roomRent + medicine + meals + doctor + nurse + attendant + therapy;

    console.log("activePackage",invoiceProps)

    return (
        <div className="w-full flex flex-col gap-6 mt-6">
            {isScheduledAdmission && !futureAdmissionPayment && (
                <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <FormInputField
                            label="Proposed Admission Date"
                            type="date"
                            value={admissionDate}
                            onChange={(e) => setAdmissionDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                            height={44}
                        />
                        <FormTextareaField
                            label="Special Instructions"
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            placeholder="Any specific requirements or notes for the ward nurses..."
                            height={96}
                            className="font-semibold text-xs"
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Column 1: Payment Gateways */}
                <div className="flex flex-col gap-4">
                          <PaymentGatewayCard title="Cash">
                        {cashEntries.map((entry, index) => (
                            <PaymentMethodRow
                                key={entry.id}
                                icon={<Image src="/icons/cash.svg" alt="Cash" width={20} height={20} className="object-contain" />}
                                title={cashEntries.length > 1 ? ` Payment ${index + 1}` : "Payment"}
                                //  title={""}
                                paidLabel=""
                                pendingLabel=""
                                confirmLabel="Confirm"
                                amount={entry.amount}
                                onAmountChange={(value) => handleCashAmountChange(entry.id, value)}
                                paid={entry.paid}
                                onConfirm={() => handleCashConfirm(entry.id)}
                                amountError={entry.amountError}
                                showAddMore={entry.paid && index === cashEntries.length - 1}
                                onAddMore={handleAddCashEntry}
                                showRemove={
                                    (!entry.paid && cashEntries.length > 1) ||
                                    (entry.paid && index === cashEntries.length - 1)
                                }
                                onRemove={() => handleCancelCashEntry(entry.id)}
                            />
                        ))}
                            {paymentFinalizeError ? (
                        <div
                            ref={paymentFinalizeErrorRef}
                            data-field="payment-finalize-error"
                            className="scroll-mt-6 px-1"
                        >
                            <p className="text-sm text-[#F6776E]">{paymentFinalizeError}</p>
                        </div>
                    ) : null}
                    </PaymentGatewayCard>
                
                    <PaymentGatewayCard title="Razorpay Gateway">
                        <PaymentMethodRow
                            icon={<Image src="/icons/upi.svg" alt="UPI" width={20} height={20} className="object-contain"/>}
                            title="UPI Payment"
                            paidLabel="Verified"
                            pendingLabel="Ready to Pay"
                            confirmLabel="Verify"
                            amount={razorpayUpiAmount}
                            onAmountChange={(value) => {
                                setRazorpayUpiAmount(value);
                                if (razorpayUpiAmountError) setRazorpayUpiAmountError("");
                            }}
                            paid={razorpayUpiPaid}
                            onConfirm={handleRazorpayUpiVerify}
                            upiId={razorpayUpiId}
                            onUpiIdChange={setRazorpayUpiId}
                            amountError={razorpayUpiAmountError}
                            disabled
                        />
                        <PaymentMethodRow
                            icon={<Image src="/icons/card.svg" alt="Credit Card" width={20} height={20} className="object-contain" />}
                            title="Credit Card"
                            paidLabel="Success"
                            pendingLabel="Ready to Pay"
                            confirmLabel="Pay Now"
                            amount={razorpayCardAmount}
                            onAmountChange={(value) => {
                                setRazorpayCardAmount(value);
                                if (razorpayCardAmountError) setRazorpayCardAmountError("");
                            }}
                            paid={razorpayCardPaid}
                            onConfirm={handleRazorpayCardPay}
                            amountError={razorpayCardAmountError}
                            disabled
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
                            onAmountChange={(value) => {
                                setPayuUpiAmount(value);
                                if (payuUpiAmountError) setPayuUpiAmountError("");
                            }}
                            paid={payuUpiPaid}
                            onConfirm={handlePayuUpiVerify}
                            upiId={payuUpiId}
                            onUpiIdChange={setPayuUpiId}
                            amountError={payuUpiAmountError}
                            disabled
                        />
                    </PaymentGatewayCard>

              

                    <PaymentGatewayCard title="Others">
                        <div className="grid grid-cols-1 gap-4 opacity-50">
                            <FormSelectField
                                label="Payment Method"
                                options={othersPaymentMethodOptions}
                                value={othersMethod}
                                onChange={(value) => setOthersMethod(value as string)}
                                placeholder="Select"
                                height={44}
                                disabled
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
                                disabled
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
                            disabled
                            className="opacity-50"
                        />

                        {!othersPaid ? (
                            <Button
                                type="button"
                                variant="primary"
                                className="w-full h-12 rounded-full font-bold opacity-50"
                                disabled
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

                {/* Column 2: Wallet + Payment Summary */}
                <div className="w-full flex flex-col gap-4">
              
                    {/* Wallet info */}

                    {/* <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-9 h-9 rounded-xl bg-[#F2F8F2] flex items-center justify-center">
                                <Image src="/icons/walletbenifit.svg" alt="Wallet" width={20} height={20} className="object-contain" />
                            </span>
                            <h4 className="text-base font-bold text-[#262D3B]">Wallet Information</h4>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-[#434956]">Available Wallet Balance</span>
                            <span className="text-lg font-extrabold text-[#0B8C00]">
                                ₹ {formattedWalletBalance}
                            </span>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <Checkbox
                                checked={useWalletBalance}
                                onChange={(checked) => {
                                    setUseWalletBalance(checked);
                                    if (!checked) {
                                        resetWalletPaymentState();
                                    }
                                }}
                                disabled={walletAvailableBalance <= 0 || walletPaid}
                            />
                            <span className="text-sm font-semibold text-[#262D3B]">
                                Use Wallet Balance (₹{formattedWalletBalance} Available)
                            </span>
                        </label>

                        {useWalletBalance ? (
                            <div className="flex flex-col gap-4">
                                {!walletPaid ? (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-end gap-3">
                                                <div className="flex-1">
                                                    <FormInputField
                                                        label="Amount"
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={walletAmount}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (value === "" || /^\d{0,15}(\.\d{0,2})?$/.test(value)) {
                                                                setWalletAmount(value);
                                                                if (walletAmountError) setWalletAmountError("");
                                                            }
                                                        }}
                                                        placeholder="Enter amount"
                                                        height={44}
                                                        disabled={walletOtpPending}
                                                        suffix={<span className="text-sm font-bold text-[#787E8C]">₹</span>}
                                                    />
                                                </div>
                                                {!walletOtpPending ? (
                                                    <Button
                                                        type="button"
                                                        variant="primary"
                                                        className="h-11 shrink-0 px-6"
                                                        onClick={handleWalletUse}
                                                    >
                                                        Use
                                                    </Button>
                                                ) : null}
                                            </div>
                                            {walletAmountError ? (
                                                <p className="text-xs text-[#F6776E]">{walletAmountError}</p>
                                            ) : null}
                                        </div>

                                        {walletOtpPending ? (
                                            <div className="flex flex-col gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-end gap-3">
                                                        <div className="flex-1">
                                                            <FormInputField
                                                                label="Enter OTP"
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={walletOtp}
                                                                onChange={(e) => {
                                                                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                                                                    setWalletOtp(value);
                                                                    if (walletOtpError) setWalletOtpError("");
                                                                }}
                                                                placeholder="Enter OTP"
                                                                height={44}
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="primary"
                                                            className="h-11 shrink-0 px-6"
                                                            onClick={handleWalletVerifyOtp}
                                                        >
                                                            Verify OTP
                                                        </Button>
                                                    </div>
                                                    {walletOtpError ? (
                                                        <p className="text-xs text-[#F6776E]">{walletOtpError}</p>
                                                    ) : null}
                                                </div>
                                                <p className="text-xs text-[#787E8C]">
                                                    Didn&apos;t receive the OTP?{" "}
                                                    <button
                                                        type="button"
                                                        onClick={handleWalletResendOtp}
                                                        className="font-semibold text-[#0B8C00] hover:underline"
                                                    >
                                                        Resend OTP
                                                    </button>
                                                </p>
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between rounded-[14px] border border-[#0B8C00]/20 bg-[#F2FAF2] px-4 py-3">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-extrabold text-[#262D3B]">Wallet Applied</span>
                                            <span className="text-xs font-semibold text-[#787E8C]">Verified successfully</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm">
                                            <span>₹ {Number(walletAmount || 0).toLocaleString("en-IN")}</span>
                                            <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                                                ✓ Verified
                                            </Badge>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div> */}

                    <div className="w-full rounded-[24px] bg-[#0B8C00] text-white p-6 flex flex-col gap-5 shadow-md select-none min-h-[420px]">
                        <h4 className="text-xl font-bold border-b border-white/20 pb-3">Payment Summary</h4>

                        <div className="flex flex-col gap-4 text-sm flex-1">
                            {isEditMode && editPaymentAmounts ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/90">Advance Collected</span>
                                        <span className="font-extrabold text-base">
                                            ₹ {(editPaymentAmounts.advanceAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/90">Previously Received</span>
                                        <span className="font-extrabold text-base">
                                            ₹ {(editPaymentAmounts.receivedAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/90">Remaining Amount</span>
                                        <span className="font-extrabold text-base">
                                            {/* ₹ {(editPaymentAmounts.remainingAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} */}
                                            {/* ₹ {(finalAmountPayable - (editPaymentAmounts?.advanceAmount ?? 0)).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                                })} */}
                                                {/* ₹ {(
                                                    finalAmountPayable -
                                                    totalReceived -
                                                    (editPaymentAmounts?.advanceAmount ?? 0)
                                                    ).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                    })} */}
                                                    ₹ {Math.max(
                                                    finalAmountPayable -
                                                        totalReceived -
                                                        (editPaymentAmounts?.advanceAmount ?? 0),
                                                    0
                                                    ).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                    })}
                                        </span>
                                    </div>
                                    <div className="border-t border-white/20 my-1" />
                                </>
                            ) : null}
                            <div className="flex justify-between items-center">
                                <span className="text-white/90">Total Amount</span>
                                <span className="font-extrabold text-base">
                                    ₹ {finalAmountPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {paymentSources.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-bold text-white/95">Payment Sources</span>
                                    {paymentSources.map((source) => (
                                        <div key={source.label} className="flex justify-between items-center text-sm">
                                            <span className="text-white/90">• {source.label}</span>
                                            <span className="font-extrabold">
                                                ₹ {source.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <div className="border-t border-white/20 my-1" />

                            {/* <div className="flex justify-between items-center">
                                <span className="text-white/90">Total Advance</span>
                                <span className="font-extrabold text-base">₹ {finalAmountPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div> */}
                            <div className="flex justify-between items-center">
                                <span className="text-white/90">Total Received</span>
                                <span className="font-extrabold text-base">₹ {totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/90">Allocated Not Paid</span>
                                {/* <span className="font-extrabold text-base">₹ {balanceOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> */}
                                
                                   <span className="font-extrabold text-lg">
                                {/* {isEditMode && editPaymentAmounts ? (
                                       <>
                                        ₹{" "}
                                        {(
                                        (totalReceived ?? 0) -
                                        (editPaymentAmounts?.remainingAmount ?? 0)
                                        ).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                        })}
                                    </>
                                ) : (
                                    <>₹ {balanceOutstanding.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                    })}</>
                                )} */}

                                {isEditMode && editPaymentAmounts ? (
                                <>
                                    {/* ₹{" "}
                                    {Math.abs(
                                    (totalReceived ?? 0) -
                                    (editPaymentAmounts?.remainingAmount ?? 0)
                                    ).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                    })} */}

                                    {/* ₹ {(finalAmountPayable - (editPaymentAmounts?.advanceAmount ?? 0)).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                        })} */}
                                        ₹ {Math.max(
                                        finalAmountPayable - totalReceived- (editPaymentAmounts?.advanceAmount ?? 0),
                                        0
                                        ).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                        })}
                                </>
                                ) : (
                                <>
                                    ₹{" "}
                                    {(balanceOutstanding ?? 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                    })}
                                </>
                                )}
                                </span>
                            </div>

                            <div className="border-t border-white/20 my-1" />

                            <div className="flex justify-between items-center">
                                <span className="font-bold">Balance Outstanding</span>
                                {/* <span className="font-extrabold text-lg">   ₹ {balanceOutstanding.toLocaleString()}</span> */}
                                <span className="font-extrabold text-lg">
                                    {isEditMode && editPaymentAmounts ? (
                                    <>
                                        {/* ₹{" "}
                                        {Math.abs(
                                        (totalReceived ?? 0) -
                                        (editPaymentAmounts?.remainingAmount ?? 0)
                                        ).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                        })} */}
                                         {/* ₹ {(finalAmountPayable - (editPaymentAmounts?.advanceAmount ?? 0)).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                                })} */}

                                                ₹ {Math.max(
                                                finalAmountPayable - totalReceived - (editPaymentAmounts?.advanceAmount ?? 0),
                                                0
                                                ).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                                })}
                                    </>
                                    ) : (
                                    <>
                                        ₹{" "}
                                        {(balanceOutstanding ?? 0).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                        })}
                                    </>
                                    )}
                                </span>
                            </div>

                            <div className="flex justify-between items-start gap-4 text-xs font-bold">
                                <span className="text-white/90 shrink-0">Amount in Words</span>
                                <span className="text-right text-white leading-relaxed">{numberToWords(finalAmountPayable)}</span>
                            </div>

                            <div className="[&_span]:!text-white pt-2">
                                <Slider label="Success Progress" value={progressPercent} onChange={() => { }} disabled variant="onDark" />
                            </div>
                        </div>

                        <div
                            className={`grid gap-3 mt-auto ${
                                isAdmissionCompleted ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
                            }`}
                        >
                            <button
                                type="button"
                                onClick={handleCompleteAdmission}
                                disabled={isSubmitting || isAdmissionCompleted}
                                className="h-12 bg-white text-[#0B8C00] rounded-full font-bold text-sm hover:bg-opacity-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting
                                    ? "Submitting..."
                                    : isAdmissionCompleted
                                      ? "Finalized"
                                      : "Confirm & Finalize"}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelSession}
                                disabled={isAdmissionCompleted}
                                className="h-12 border border-white text-white rounded-full font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Cancel Session
                            </button>
                            {isAdmissionCompleted ? (
                                <BackToPreviousPageButton
                                    text="Exit"
                                    onClick={handleExit}
                                    className="h-12 w-full !border-white !text-white hover:!bg-white/10 focus:ring-white/20"
                                    icon={
                                        <Image
                                            src="/icons/LeftArrowIcon.svg"
                                            alt=""
                                            width={20}
                                            height={20}
                                            className="shrink-0 brightness-0 invert"
                                        />
                                    }
                                />
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Column 3: Package Details */}
                <div className="w-full flex flex-col gap-6">
                    <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-6 shadow-sm flex flex-col gap-6 select-none">
                        <div className="border-b border-[#DFE0E2] pb-4 flex flex-col gap-1">
                            <h3 className="text-xl font-bold text-[#262D3B]">
                                {activePackage.packageName || ""}
                            </h3>
                            <span className="text-sm font-semibold text-[#787E8C]">
                                {packagetotalPrice  ? `${packagetotalPrice.toLocaleString()} /day` : "N/A"}
                            </span>
                        </div>
                   {/* Scrollable content */}
                        <div className="max-h-[260px] custom-scroll overflow-y-auto">
                        <div className="flex flex-col border border-[#DFE0E2] rounded-lg overflow-hidden">
                            <div>
                             <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Room Type Selection</span>
                                <Tooltip
                                    position="top"
                                    content={
                                        <span className="inline-block w-max whitespace-normal break-words text-left text-inherit">
                                            {roomtype || "N/A"}
                                        </span>
                                    }
                                >
                                    <span className="text-[#262D3B] font-bold uppercase truncate max-w-[60%]">{roomtype || "N/A"}</span>
                                </Tooltip>
                                </div>
                                         {/* {medicinePerDay > 0 && ( */}
                                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Medicine</span>
                                    <span className="text-[#262D3B] font-bold">{medicinePerDay ? `₹ ${formatIndianAmount(medicinePerDay)}` : "N/A"}</span>
                                </div>
                            {/* )} */}
                            {/* {doctorFee > 0 && ( */}
                                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Doctor Fees</span>
                                    <span className="text-[#262D3B] font-bold">{doctorFee ? `₹ ${formatIndianAmount(doctorFee)}` : "N/A"}</span>
                                </div>

                                 <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Nurse Fees</span>
                                    <span className="text-[#262D3B] font-bold">{nurseFee ? `₹ ${formatIndianAmount(nurseFee)}` : "N/A"}</span>
                                </div>

                            {/* // )} */}
                            {/* {mealsPerDay > 0 && ( */}
                                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Meals</span>
                                    <span className="text-[#262D3B] font-bold">{mealsPerDay ? `₹ ${formatIndianAmount(mealsPerDay)}` : "N/A"}</span>
                                </div>
                            {/* )} */}


                                  <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Therapy Charges</span>
                                    <span className="text-[#262D3B] font-bold">{therapyFee ? `₹ ${formatIndianAmount(therapyFee)}` : "N/A"}</span>
                                </div>

                              

                                   <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Attendant Charges</span>
                                    <span className="text-[#262D3B] font-bold">{attendantFee ? `₹ ${formatIndianAmount(attendantFee)}` : "N/A"}</span>
                                </div>


                                 <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Room Rent</span>
                                    <span className="text-[#262D3B] font-bold">{roomRentPerDay ? `₹ ${formatIndianAmount(roomRentPerDay)}` : "N/A"}</span>
                                </div>

                        </div>
                        </div>
                        </div>

                        <div className="flex flex-col gap-1 items-start">
                            <span className="text-sm font-bold text-[#262D3B]">Description</span>
                            <p className="text-xs font-semibold text-[#787E8C] leading-relaxed">
                                {activePackage.remark || "Comprehensive care package including room, nursing, meals, and therapy support."}
                            </p>
                        </div>

                        <div className="h-14 px-4 bg-[#E3EEE1] flex justify-between items-center rounded-lg font-semibold text-sm">
                            <span className="text-[20px] text-[#262D3B] font-bold">Total Price</span>
                            <span className="text-[18px] text-[#434956] font-bold">
                                {packagetotalPrice ? `₹ ${formatIndianAmount(packagetotalPrice)}` : ""}
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
                <BackToPreviousPageButton text="Back" disabled={isAdmissionCompleted} onClick={onBack} />

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="!border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#F2FAF2] min-w-[180px] h-11 rounded-full font-bold"
                        leftIcon={
                            <Image src="/icons/Printer.svg" alt="" width={18} height={18} className="object-contain" />
                        }
                        onClick={handlePrintInvoiceClick}
                    >
                        Print Invoice
                    </Button>
                    {/* <Button
                        type="button"
                        variant="primary"
                        className="min-w-[240px] h-11 rounded-full font-bold"
                        rightIcon={<span>→</span>}
                        disabled={isSubmitting}
                        onClick={handleCompleteAdmission}
                    >
                        {isSubmitting ? "Submitting..." : "Complete Payment"}
                    </Button> */}
                </div>
            </div>

            <AdmissionInvoiceDialog
                open={isInvoiceDialogOpen}
                onClose={() => setIsInvoiceDialogOpen(false)}
                onSaveAndNext={
                    futureAdmissionPayment
                        ? undefined
                        : () => {
                              setIsInvoiceDialogOpen(false);
                              onNext();
                          }
                }
                patientName={invoiceProps.patientName}
                address={invoiceProps.address || "N/A"}
                countryName={invoiceProps.countryName}
                pinCode={invoiceProps.pinCode}
                cityName={invoiceProps.cityName}
                stateName={invoiceProps.stateName}
                uhid={invoiceProps.uhid}
                invoiceNumber={invoiceProps.invoiceNumber}
                invoiceId={invoiceProps.invoiceId}
                contactNumber={invoiceProps.contactNumber}
                admissionType={invoiceProps.admissionType}
                admissionDate={invoiceProps.admissionDate}
                consultationCharges={invoiceProps.consultationCharges}
                subtotal={invoiceProps.subtotal}
                discountAmount ={discountAmountt}
                feeDays={freeDays}
                tax={invoiceProps.tax}
                totalAmount={invoiceProps.totalAmount}
                billDate={invoiceProps.billDate}
                transactionId={invoiceProps.transactionId}
                amountReceived={invoiceProps.amountReceived}
                dueAmount={invoiceProps.dueAmount}
                paymentStatus={invoiceProps.paymentStatus}
                paymentRecords={invoiceProps.paymentRecords}
                lineItemLabel={invoiceProps.lineItemLabel}
            />

            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />

            <MessageDialog
                open={showSuccessDialog}
                onClose={handleSuccessDialogDismiss}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={
                    <div className="flex flex-col items-center text-center">
                        <span className="text-lg font-bold text-[#1E293B] mb-1">

                         {admissionType === "scheduled"
                            ? "Scheduled Admission Submitted"
                            : admissionType === "immediate"
                            ? "Admission Completed"
                            : ""}
                            
                        
                            
                        </span>
                        <span className="text-sm text-[#475569]">
                     {admissionType === "scheduled"
                            ? "The patient scheduled admission and payment have been finalized successfully."
                            : admissionType === "immediate"
                            ? "The patient admission and payment have been finalized successfully."
                            : ""}   

                        </span>
                    </div>
                }
                confirmText="OK"
                showCancel={false}
                onConfirm={handleSuccessDialogDismiss}
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
