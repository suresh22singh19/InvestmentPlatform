"use client";

import Image from "next/image";

/** Props for the bordered receipt block (same layout as payment success PDF). */
export interface PaymentReceiptCaptureProps {
    /** DOM id for html2canvas / html2pdf (default payment-receipt-capture) */
    captureId?: string;
    patientName: string;
    address: string;
    countryName?: string;
    addressLine1?: string;
    addressLine2?: string;
    pinCode?: string;
    cityName: string;
    stateName: string;
    jsHealthCardNo: string;
    uhid?: string;
    invoiceNumber?: string;
    consultationCharges: number;
    subtotal: number;
    tax: number;
    totalAmount: number;
    billDate: string;
    transactionId?: string;
    paymentMode?: string;
    gstBilling?: boolean;
    gstNumber?: string;
    companyName?: string;
    billingAddress?: string;
    billingStateName?: string;
    billingCityName?: string;
    billingPincode?: string;
    splitCashAmount?: string;
    splitCashStatus?: string;
    splitUpiAmount?: string;
    splitUpiStatus?: string;
    splitCardAmount?: string;
    splitCardStatus?: string;
    selectedOnlineSplitMethod?: "razorpay" | "payu";
}

export function PaymentReceiptCapture({
    captureId = "payment-receipt-capture",
    patientName,
    address,
    countryName,
    addressLine1,
    addressLine2,
    pinCode: _pinCode,
    cityName,
    stateName,
    jsHealthCardNo,
    uhid,
    invoiceNumber,
    consultationCharges,
    subtotal,
    tax,
    totalAmount,
    billDate,
    transactionId: _transactionId,
    paymentMode: _paymentMode,
    gstBilling = false,
    gstNumber,
    companyName,
    billingAddress,
    billingStateName,
    billingCityName,
    billingPincode,
    splitCashAmount,
    splitCashStatus,
    splitUpiAmount,
    splitUpiStatus,
    splitCardAmount,
    splitCardStatus,
    selectedOnlineSplitMethod,
}: PaymentReceiptCaptureProps) {
    const invoiceDisplay =
        invoiceNumber != null && String(invoiceNumber).trim() !== ""
            ? String(invoiceNumber).trim()
            : "-";

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString("en-IN")}`;
    };

    return (
        <div
            id={captureId}
            className="box-border flex w-full min-w-0 flex-col overflow-visible rounded-[1px] border border-solid border-[#C0C3C8] bg-white"
        >
            <div className="flex items-center py-[11px] pl-[26px] pr-[24px]">
                <div className="relative flex shrink-0 overflow-visible pr-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/logo.png"
                        alt="Jeena Sikho Lifecare Limited Logo"
                        width={120}
                        height={80}
                        decoding="sync"
                        loading="eager"
                        className="block h-[80px] w-auto max-w-[180px] object-contain object-left"
                        draggable={false}
                    />
                </div>
                <div className="flex flex-col items-center flex-1">
                    <h1 className="font-inter not-italic font-semibold text-[20px] leading-[130%] text-center text-[#434956] mb-1">
                        Jeena Sikho Lifecare Limited
                    </h1>
                    <p className="font-inter not-italic font-normal text-[12px] leading-[140%] text-center text-[#434956]">
                        Pind Devinagar, Hadbast No. 18, Chandigarh Delhi Highway,Tehsil Derabassi,
                        <br />
                        Distt Mohali Punjab, DERABASSI, PUNJAB 140507, Devinagar BO, derabassi,
                        <br />
                        Mohali (Ajitgarh), PUNJAB(140507)
                    </p>
                    <h2 className="font-inter not-italic font-semibold text-[20px] leading-[130%] text-center text-[#434956] mt-3">
                        Payment Receipt
                    </h2>
                </div>
            </div>

            <div className="flex flex-col w-full">
                <div className="flex w-full min-h-[55px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#C0C3C8] py-[11px] px-[24px]">
                    <div className="flex min-w-0 items-center gap-[8px]">
                        <span className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956]">
                            Bill Date:
                        </span>
                        <span className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                            {billDate}
                        </span>
                    </div>
                    <div className="flex min-w-0 max-w-full shrink items-center gap-[8px] text-right sm:text-left">
                        <span className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956]">
                            Invoice Number :
                        </span>
                        <span className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956] break-all">
                            {invoiceDisplay}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-[8px] w-full h-[55px] border-t border-[#C0C3C8] py-[11px] px-[24px]">
                    <span className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956]">
                        Patient UHID:
                    </span>
                    <span className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                        {uhid || jsHealthCardNo || "N/A"}
                    </span>
                </div>
            </div>

            <div className="flex flex-col w-full border-t border-[#C0C3C8]">
                <h3 className="font-inter not-italic font-extrabold text-[19px] leading-[130%] text-[#434956] py-[11px] px-[24px] pb-0">
                    Customer Details
                </h3>
                <div className="flex flex-col gap-[8px] py-[11px] px-[24px]">
                    <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                        <span className="font-extrabold">Name:</span> <span className="font-medium">{patientName}</span>
                    </p>
                    {!countryName || countryName === "India" ? (
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">Address:</span>{" "}
                            <span className="font-medium">{address || "N/A"}</span>
                        </p>
                    ) : (
                        <>
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Address Line 1:</span>{" "}
                                <span className="font-medium">{addressLine1?.trim() || "N/A"}</span>
                            </p>
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Address Line 2:</span>{" "}
                                <span className="font-medium">{addressLine2?.trim() || "N/A"}</span>
                            </p>
                        </>
                    )}
                    <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                        <span className="font-extrabold">City:</span> <span className="font-medium">{cityName}</span>
                    </p>
                    <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                        <span className="font-extrabold">State:</span> <span className="font-medium">{stateName}</span>
                    </p>
                </div>
            </div>

            {gstBilling ? (
                <div className="flex flex-col w-full border-t border-[#C0C3C8]">
                    <h3 className="font-inter not-italic font-semibold text-[24px] leading-[130%] text-[#434956] py-[11px] px-[24px]">
                        GST Billing
                    </h3>
                    <div className="flex flex-col gap-[8px] py-[11px] px-[24px]">
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">GST Number:</span>{" "}
                            <span className="font-medium">{gstNumber || "N/A"}</span>
                        </p>
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">Company Name:</span>{" "}
                            <span className="font-medium">{companyName || "N/A"}</span>
                        </p>
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">Billing Address:</span>{" "}
                            <span className="font-medium">{billingAddress || "N/A"}</span>
                        </p>
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">State:</span>{" "}
                            <span className="font-medium">{billingStateName || "N/A"}</span>
                        </p>
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">City:</span>{" "}
                            <span className="font-medium">{billingCityName || "N/A"}</span>
                        </p>
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">Pin Code:</span>{" "}
                            <span className="font-medium">{billingPincode || "N/A"}</span>
                        </p>
                    </div>
                </div>
            ) : null}

            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="text-left font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] border-l-0 py-[14px] px-[24px]">
                            Item Name
                        </th>
                        <th className="w-[160px] border border-[#C0C3C8] border-r-0 py-[14px] px-[24px] text-right font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                            Amount
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="font-inter not-italic font-normal text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] border-l-0 py-[12px] px-[24px]">
                            Consultation Fee
                        </td>
                        <td className="border border-[#C0C3C8] border-r-0 py-[12px] px-[24px] text-right font-inter text-[14px] font-normal not-italic leading-[120%] text-[#434956]">
                            {formatCurrency(consultationCharges)}
                        </td>
                    </tr>
                    <tr>
                        <td className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] border-l-0 py-[12px] px-[24px] text-right">
                            Subtotal
                        </td>
                        <td className="border border-[#C0C3C8] border-r-0 py-[12px] px-[24px] text-right font-inter text-[14px] font-normal not-italic leading-[120%] text-[#434956]">
                            {formatCurrency(subtotal)}
                        </td>
                    </tr>
                    <tr>
                        <td className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] border-l-0 py-[12px] px-[24px] text-right">
                            Tax
                        </td>
                        <td className="border border-[#C0C3C8] border-r-0 py-[12px] px-[24px] text-right font-inter text-[14px] font-normal not-italic leading-[120%] text-[#434956]">
                            {formatCurrency(tax)}
                        </td>
                    </tr>
                    <tr>
                        <td className="font-inter not-italic text-[#434956] border border-[#C0C3C8] border-l-0 py-[10px] px-[24px] text-right">
                            <div className="font-extrabold text-[14px] leading-[120%] mb-1">
                                Total Amount:
                            </div>
                            <div className="font-medium text-[11px] text-[#787E8C]">
                                Amount in Words: <span className="text-[#0B8C00] font-extrabold select-all">{numberToWords(totalAmount)}</span>
                            </div>
                        </td>
                        <td className="border border-[#C0C3C8] border-r-0 py-[10px] px-[24px] text-right font-inter text-[14px] font-semibold not-italic leading-[120%] text-[#434956] align-middle">
                            {formatCurrency(totalAmount)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {_paymentMode === "split" && (
                <div className="flex flex-col w-full  mt-0">
                    <h3 className="font-inter not-italic font-extrabold text-[15px] leading-[130%] text-[#434956] py-[12px] px-[24px] pb-3 bg-gray-50/50">
                        Payment Details (Split Payment)
                    </h3>
                    <table className="w-full border-collapse border-t border-[#C0C3C8]">
                        <thead>
                            <tr className="bg-white">
                                <th className="border border-[#C0C3C8] border-l-0 py-[12px] px-[24px] text-start font-inter text-[13px] font-extrabold text-[#434956]">
                                    Payment Mode
                                </th>
                                <th className="border border-[#C0C3C8] py-[12px] px-[16px] text-center font-inter text-[13px] font-extrabold text-[#434956]">
                                    Transaction/Reference No.
                                </th>
                                <th className="border border-[#C0C3C8] border-r-0 py-[12px] px-[24px] text-end font-inter text-[13px] font-extrabold text-[#434956] w-[160px]">
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {splitCashStatus === "verified" && (
                                <tr className="hover:bg-gray-50/30">
                                    <td className="border border-[#C0C3C8] border-l-0 py-[10px] px-[24px] text-start font-inter text-[13px] font-semibold text-[#434956]">
                                        Cash
                                    </td>
                                    <td className="border border-[#C0C3C8] py-[10px] px-[16px] text-center font-inter text-[13px] font-medium text-[#434956]">
                                        -
                                    </td>
                                    <td className="border border-[#C0C3C8] border-r-0 py-[10px] px-[24px] text-end font-inter text-[13px] font-bold text-[#434956]">
                                        ₹ {Number(splitCashAmount).toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            )}
                            {selectedOnlineSplitMethod === "razorpay" && splitUpiStatus === "success" && (
                                <tr className="hover:bg-gray-50/30">
                                    <td className="border border-[#C0C3C8] border-l-0 py-[10px] px-[24px] text-start font-inter text-[13px] font-semibold text-[#434956]">
                                        Razorpay (UPI)
                                    </td>
                                    <td className="border border-[#C0C3C8] py-[10px] px-[16px] text-center font-inter text-[13px] font-medium text-[#434956]">
                                        UPI/312345678901
                                    </td>
                                    <td className="border border-[#C0C3C8] border-r-0 py-[10px] px-[24px] text-end font-inter text-[13px] font-bold text-[#434956]">
                                        ₹ {Number(splitUpiAmount).toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            )}
                            {selectedOnlineSplitMethod === "payu" && splitCardStatus === "success" && (
                                <tr className="hover:bg-gray-50/30">
                                    <td className="border border-[#C0C3C8] border-l-0 py-[10px] px-[24px] text-start font-inter text-[13px] font-semibold text-[#434956]">
                                        PayU (Credit Card)
                                    </td>
                                    <td className="border border-[#C0C3C8] py-[10px] px-[16px] text-center font-inter text-[13px] font-medium text-[#434956]">
                                        HDFC/1234 **** **** 5678
                                    </td>
                                    <td className="border border-[#C0C3C8] border-r-0 py-[10px] px-[24px] text-end font-inter text-[13px] font-bold text-[#434956]">
                                        ₹ {Number(splitCardAmount).toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function numberToWords(num: number): string {
    if (num === 0) return "Zero Rupees Only";
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

    return words.trim() + " Rupees Only";
}
