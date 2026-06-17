"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
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
} from "@/components/ui";
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
    patientName?: string;
    patientUhid?: string;
    branchId: number;
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
    roomAllocation?: CompletePatientAdmissionRoom | null;
    attendantDetails?: AttendantDetailsFormData | null;
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
    onNext: () => void;
    onBack: () => void;
}

function mapAdmissionTypeToPayload(type: string): string {
    if (type === "immediate") return "Immediate";
    if (type === "scheduled") return "Schedule";
    if (type === "tentative") return "Tentative";
    return type;
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
    patientName = "Patient",
    patientUhid = "",
    branchId,
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
    roomAllocation,
    attendantDetails,
    requireRoomAllocation = true,
    initialAdmissionDate,
    initialSpecialInstructions,
    editPaymentAmounts = null,
    isEditMode = false,
    editPatientId,
    futureAdmissionPayment,
    onNext,
    onBack,
}: AdmissionPaymentProps) {
    const [completePatientAdmission, { isLoading: isCompletingAdmission }] = useCompletePatientAdmissionMutation();
    const [paymentAndAllocateRoom, { isLoading: isPaymentAllocating }] = usePaymentAndAllocateRoomMutation();
    const isSubmitting = isCompletingAdmission || isPaymentAllocating;
    const attendantCountryId = attendantDetails?.address.country;
    const attendantStateId = attendantDetails?.address.state;
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
    const [admissionDate, setAdmissionDate] = useState(
        () => initialAdmissionDate || getTodayDateInputValue()
    );
    const [specialInstructions, setSpecialInstructions] = useState(initialSpecialInstructions || "");
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const [razorpayUpiAmount, setRazorpayUpiAmount] = useState("100");
    const [razorpayUpiId, setRazorpayUpiId] = useState("");
    const [razorpayUpiPaid, setRazorpayUpiPaid] = useState(false);
    const [razorpayCardAmount, setRazorpayCardAmount] = useState("100");
    const [razorpayCardPaid, setRazorpayCardPaid] = useState(false);

    const [payuUpiAmount, setPayuUpiAmount] = useState("100");
    const [payuUpiId, setPayuUpiId] = useState("");
    const [payuUpiPaid, setPayuUpiPaid] = useState(false);

    const [cashAmount, setCashAmount] = useState("100");
    const [cashPaid, setCashPaid] = useState(false);

    const [othersMethod, setOthersMethod] = useState<string | null>(null);
    const [othersAmount, setOthersAmount] = useState("");
    const [othersReferenceId, setOthersReferenceId] = useState("");
    const [othersPaid, setOthersPaid] = useState(false);

    useEffect(() => {
        if (!isEditMode) return;
        if (initialAdmissionDate) {
            setAdmissionDate(initialAdmissionDate);
        }
        if (initialSpecialInstructions) {
            setSpecialInstructions(initialSpecialInstructions);
        }
    }, [isEditMode, initialAdmissionDate, initialSpecialInstructions]);

    useEffect(() => {
        if (!isEditMode || !editPaymentAmounts) return;
        const payableRemaining =
            editPaymentAmounts.remainingAmount != null && editPaymentAmounts.remainingAmount > 0
                ? String(editPaymentAmounts.remainingAmount)
                : finalAmountPayable > 0
                    ? String(finalAmountPayable)
                    : "";
        setRazorpayUpiAmount(payableRemaining);
        setRazorpayCardAmount(payableRemaining);
        setPayuUpiAmount(payableRemaining);
        setCashAmount(payableRemaining);
    }, [isEditMode, editPaymentAmounts, finalAmountPayable]);

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
        if (!isEditMode) {
            setRazorpayUpiAmount("");
            setRazorpayCardAmount("");
            setPayuUpiAmount("");
            setCashAmount("");
        }
    };

    const collectPaidEntries = useCallback(() => {
        const paidEntries: Array<{
            method: string;
            amount: number;
            transactionId: string;
            remarks?: string;
        }> = [];

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
        if (cashPaid) {
            paidEntries.push({
                method: "cash",
                amount: Number(cashAmount) || 0,
                transactionId: "",
                remarks: "Cash payment received",
            });
        }
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
        razorpayUpiPaid, razorpayUpiAmount, razorpayUpiId,
        razorpayCardPaid, razorpayCardAmount,
        payuUpiPaid, payuUpiAmount, payuUpiId,
        cashPaid, cashAmount,
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

    const handleCompleteAdmission = useCallback(async () => {
        if (requireRoomAllocation && !roomAllocation) {
            setErrorMessage("Please allocate a room and bed before completing payment.");
            setShowErrorDialog(true);
            return;
        }
        if (totalReceived <= 0) {
            setErrorMessage("Please confirm at least one payment method before finalizing.");
            setShowErrorDialog(true);
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

        // console.log("dhdsjhdjd",offerId, offerApplied);

        const paymentPayload = buildPaymentPayload();
        const includeOffer = Boolean(offerApplied && offerId);
        const isEditAdmission = editPatientId != null;
        const payload: CompletePatientAdmissionRequest = {
            branchId,
            ...(!isEditAdmission && appointmentId ? { appointmentId } : {}),
            ...(isEditAdmission ? { finalizeAdmission: admissionType !== "scheduled" ? true : false } : {}),
            patientType,
            diseaseType,
            packageId,
            numberOfDays,
            offerApplied: includeOffer,
            ...(includeOffer ? { offerId } : {}),
            admissionType: mapAdmissionTypeToPayload(admissionType),
            admissionDate: admissionType === "scheduled" ? admissionDate : getTodayDateInputValue(),
            ...(admissionType === "scheduled" && specialInstructions.trim()
                ? { specialInstructions: specialInstructions.trim() }
                : {}),
            originalAmount,
            discountAmount,
            netPayable,
            ...paymentPayload,
            ...(roomAllocation ? { room: roomAllocation } : {}),
            ...(attendantDetails
                ? {
                    attendant: mapAttendantToPayload(attendantDetails, {
                        countries: countriesData,
                        states: statesData,
                        cities: citiesData,
                    }),
                }
                : {}),
        };

        try {
            const res = await completePatientAdmission(
                editPatientId != null ? { body: payload, editPatientId } : payload
            ).unwrap();
            if (res.success) {
                if (res.data) {
                    setAdmissionResult(res.data as CompletePatientAdmissionResult);
                }
                if (futureAdmissionPayment) {
                    setShowSuccessDialog(true);
                } else {
                    setIsInvoiceDialogOpen(true);
                }
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
        buildPaymentPayload,
        buildPaymentAndAllocateRoomPayload,
        branchId,
        patientType,
        diseaseType,
        numberOfDays,
        offerApplied,
        offerId,
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
    ]);

    const isScheduledAdmission = admissionType === "scheduled";

    const invoicePatientAddress = admissionResult?.patientDetails?.address;
    const perDayCost = Number(admissionResult?.perDayCost ?? 0);
    const invoiceProps = useMemo(() => {
        const patient = admissionResult?.patientDetails;
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
            consultationCharges: perDayCost,
            subtotal: perDayCost,
            tax: 0,
            totalAmount: perDayCost,
            billDate: formatAdmissionBillDate(admissionResult?.admissionDate),
            transactionId: admissionResult?.paymentId ? String(admissionResult.paymentId) : undefined,
            paymentMode: "completed",
            amountReceived: admissionResult?.totalReceived,
            dueAmount: admissionResult?.dueAmount,
            paymentStatus: admissionResult?.firstDayPaymentStatus,
            paymentRecords: admissionResult?.paymentRecords,
            lineItemLabel: "Per Day Cost",
        };
    }, [admissionResult, invoicePatientAddress, patientName, patientUhid, perDayCost]);

    const handlePrintInvoiceClick = () => {
        if (!admissionResult) {
            setErrorMessage("Please complete payment before printing the invoice.");
            setShowErrorDialog(true);
            return;
        }
        setIsInvoiceDialogOpen(true);
    };

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
                    <PaymentGatewayCard title="Razorpay Gateway">
                        <PaymentMethodRow
                            icon={<Image src="/icons/upi.svg" alt="UPI" width={20} height={20} className="object-contain"/>}
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
                                            ₹ {(editPaymentAmounts.remainingAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="border-t border-white/20 my-1" />
                                </>
                            ) : null}
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
                                onClick={handleCompleteAdmission}
                                disabled={isSubmitting}
                                className="h-12 bg-white text-[#0B8C00] rounded-full font-bold text-sm hover:bg-opacity-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-60"
                            >
                                {isSubmitting ? "Submitting..." : "Confirm & Finalize"}
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
                onClose={() => {
                    setShowSuccessDialog(false);
                    onNext();
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={
                    <div className="flex flex-col items-center text-center">
                        <span className="text-lg font-bold text-[#1E293B] mb-1">Admission Completed</span>
                        <span className="text-sm text-[#475569]">
                            Patient admission and payment have been finalized successfully.
                        </span>
                    </div>
                }
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowSuccessDialog(false);
                    onNext();
                }}
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
